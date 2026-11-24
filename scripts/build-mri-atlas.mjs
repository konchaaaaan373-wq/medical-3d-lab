#!/usr/bin/env node
// Builds the standard-brain MRI assets under public/assets/mri/.
//
//   node scripts/build-mri-atlas.mjs --src <dir>   build from files already on disk
//   node scripts/build-mri-atlas.mjs --fetch       download the pinned inputs into .cache/mri-atlas/, then build
//   node scripts/build-mri-atlas.mjs --src <dir> --check   rebuild in memory, fail if the committed outputs differ
//   (--out <dir> writes to, or checks, somewhere other than public/assets/mri/)
//
// A build takes under ten seconds. Behind a proxy, --fetch needs
// NODE_USE_ENV_PROXY=1 (Node >= 22.21): Node's fetch does not read HTTPS_PROXY
// by itself. .cache/ is in .gitignore: the inputs are third-party binaries and
// never belong in this repository — only what this script derives from them.
//
// What it is: an offline, zero-dependency conversion of two published things —
// the MNI ICBM152 2009c Nonlinear Symmetric T1w/T2w template (1 mm) and the
// CerebrA label atlas drawn on that template — into bytes a browser can load
// without a NIfTI reader, a Draco decoder or a marching-cubes pass:
//
//   t1.u8.gz, t2.u8.gz   8-bit intensity volumes, RAS+, x fastest
//   labels.u8.gz         the CerebrA label of every voxel, same grid
//   cerebra.glb          one closed surface per label, vertices in MNI millimetres
//   atlas.json           the grid, the hashes, and per-label measurements
//   ATTRIBUTION.md       the notice that has to travel with the bytes
//
// What it is not:
// - Not a runtime dependency. Nothing in src/ imports this file; the app only
//   reads what it wrote.
// - Not a resampler. Inputs must be axis-aligned at 1 mm. They are flipped and
//   permuted into RAS+ if needed, never interpolated — an oblique input stops
//   the build rather than getting a silently blurred copy.
// - Not a segmentation. Every label boundary is CerebrA's. The only geometry
//   this script invents is the smoothing between voxel corners and the
//   simplification of the resulting triangles, and it measures what those did
//   to each structure (volume, centroid, bounding box) and fails past a limit.
// - Not a place where left and right are decided. The side of each label is
//   MEASURED (centroid x in RAS+, where x > 0 is the subject's right) and
//   compared with the table shipped with the atlas. A disagreement stops the
//   build; it is not "fixed" here.
// - Not an individual. The template is the average of 152 young adults.
//
// Determinism: the same inputs give the same bytes. No timestamps, labels in
// numeric order, and no transcendental maths anywhere on the path to an output
// (smoothing uses binomial weights, not Math.exp), so a different V8 cannot move
// a float. zlib output can differ between zlib versions, which is why --check
// compares the DEcompressed bytes of the .gz files and atlas.json records the
// sha256 of the decompressed bytes.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT = path.join(REPO_ROOT, 'public', 'assets', 'mri');
const CACHE_DIR = path.join(REPO_ROOT, '.cache', 'mri-atlas');
const BASE_URL = 'https://templateflow.s3.amazonaws.com/tpl-MNI152NLin2009cSym/';

// The inputs, pinned. A file whose hash differs is not "a newer version", it is
// a different input, and every number in atlas.json would have to be re-read.
// The TSV's own filename says "CerebA" upstream; that spelling is not ours to fix.
const SOURCES = {
  t1: {
    file: 'tpl-MNI152NLin2009cSym_res-1_T1w.nii.gz',
    sha256: '317e112c49d086b971e4a26cba853b041ee210faf750a6fe02e04f15909b6b6b',
  },
  t2: {
    file: 'tpl-MNI152NLin2009cSym_res-1_T2w.nii.gz',
    sha256: '1c8750fabbbe132aa582eec9f923ed7493da66be6d5ec3902caf6eefe6a2bb5a',
  },
  labels: {
    file: 'tpl-MNI152NLin2009cSym_res-1_atlas-CerebrA_dseg.nii.gz',
    sha256: 'c05df93e85b8f1c1446e56f45f0b6a28fdf6e5c8263ea8f365617254bf79ecbf',
  },
  brainMask: {
    file: 'tpl-MNI152NLin2009cSym_res-1_desc-brain_mask.nii.gz',
    sha256: '6fdb662663d5c0a32ae88c51ef126a99de82200f29030a84333c5fcf944d7459',
  },
  labelTable: {
    file: 'tpl-MNI152NLin2009cSym_atlas-CerebA_dseg.tsv',
    sha256: 'cf0332a1c2601b5dd97b2f70423b064c762630d02052629f7112789f2fb6d2f7',
  },
  license: {
    file: 'LICENSE',
    sha256: '5915d16f84d99c3cedc8290b09da72f6f92e5dde1ba1c9859ee186aa952b66a4',
  },
};

const EXPECTED_GRID = { dims: [193, 229, 193], originMm: [-96, -132, -78], spacingMm: [1, 1, 1] };
const LABEL_COUNT = 102;
// CerebrA numbers the right hemisphere 1..51 and the left 52..102, with
// left = right + 51 (Manera et al. 2020). The build checks this, it does not assume it.
const HEMI_OFFSET = 51;

// Structures that keep the 1 mm grid in the mesh. These are the small, deep
// ones a learner zooms into, where a 2 mm surface would erase the shape that
// makes them recognisable (the hippocampal head, the caudate tail, the horns of
// the ventricles). Everything else — the cortical parcels and the cerebellar
// grey matter — is a large sheet whose surface is extracted at 2 mm, because at
// 1 mm those sheets alone are several times the whole triangle budget.
const FINE_MESH_NAMES = new Set([
  'Accumbens Area',
  'Amygdala',
  'Basal Forebrain',
  'Brainstem',
  'Caudate',
  'Cerebellum White Matter',
  'Fourth Ventricle',
  'Hippocampus',
  'Inferior Lateral Ventricle',
  'Lateral Ventricle',
  'Optic Chiasm',
  'Pallidum',
  'Putamen',
  'Thalamus',
  'Third Ventricle',
  'Ventral Diencephalon',
  'Vermal lobules I-V',
  'Vermal lobules VI-VII',
  'Vermal lobules VIII-X',
]);

// Failing limits for a mesh, in millimetres beyond the label's own bounding box
// of voxel centres. A voxel reaches 0.5 mm past its centre, so an honest 1 mm
// surface sits at about 0.5 and a 2 mm one can reach about 1.5.
const BBOX_WARN_MM = 2;
const BBOX_FAIL_MM = 3;
// Share of the extracted vertices that survives decimation. The 1 mm meshes can
// give up more than half because most of a deep nucleus is gently curved; the
// 2 mm cortical meshes are already coarse for a 2–3 mm ribbon and give up less
// per unit of shape. Small meshes are left whole below MIN_VERTICES — there is
// nothing to save and everything to lose.
const KEEP_FINE = 0.45;
const KEEP_COARSE = 0.35;
const MIN_VERTICES = 400;
const GLB_BUDGET_BYTES = 3.0 * 1024 * 1024;
const TRIANGLE_BUDGET = 350_000;

const GZIP_LEVEL = 9;

// ---------------------------------------------------------------------------
// small helpers

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const round = (value, digits) => {
  const scale = 10 ** digits;
  const rounded = Math.round(value * scale) / scale;
  return rounded === 0 ? 0 : rounded; // no "-0" in the JSON
};
const log = (...args) => console.log(...args);

class BuildError extends Error {}
function fail(message) {
  throw new BuildError(message);
}

function parseArgs(argv) {
  const args = { src: null, out: DEFAULT_OUT, fetch: false, check: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--src') args.src = path.resolve(argv[(i += 1)] ?? fail('--src needs a directory'));
    else if (arg === '--out') args.out = path.resolve(argv[(i += 1)] ?? fail('--out needs a directory'));
    else if (arg === '--fetch') args.fetch = true;
    else if (arg === '--check') args.check = true;
    else fail(`unknown argument ${arg}`);
  }
  if (!args.src && !args.fetch) fail('give --src <dir> or --fetch');
  return args;
}

// ---------------------------------------------------------------------------
// inputs

// Downloads only what is missing or wrong in the cache. Node's fetch ignores
// HTTPS_PROXY unless NODE_USE_ENV_PROXY=1 is set (Node >= 22.21); behind a
// proxy, set it on the command line rather than here.
async function fetchSources(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const source of Object.values(SOURCES)) {
    const target = path.join(dir, source.file);
    if (fs.existsSync(target) && sha256(fs.readFileSync(target)) === source.sha256) {
      log(`  cached   ${source.file}`);
      continue;
    }
    const url = BASE_URL + source.file;
    const response = await fetch(url);
    if (!response.ok) fail(`GET ${url} answered ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const actual = sha256(bytes);
    // Checked before the file is written: a wrong download never lands in the cache.
    if (actual !== source.sha256) fail(`${url}\n  sha256 ${actual}\n  pinned ${source.sha256}`);
    fs.writeFileSync(target, bytes);
    log(`  fetched  ${source.file} (${bytes.length} bytes)`);
  }
}

// However the files arrived — --src or --fetch — they are hashed here, at the
// one place the build reads them.
function readSources(dir) {
  const loaded = {};
  for (const [key, source] of Object.entries(SOURCES)) {
    const target = path.join(dir, source.file);
    if (!fs.existsSync(target)) fail(`missing input ${target}`);
    const bytes = fs.readFileSync(target);
    const actual = sha256(bytes);
    if (actual !== source.sha256) {
      fail(`${source.file} is not the pinned input\n  sha256 ${actual}\n  pinned ${source.sha256}`);
    }
    loaded[key] = bytes;
  }
  return loaded;
}

// ---------------------------------------------------------------------------
// NIfTI-1

const NIFTI_TYPES = {
  2: { name: 'uint8', bytes: 1, read: (view, offset) => view.getUint8(offset) },
  4: { name: 'int16', bytes: 2, read: (view, offset, le) => view.getInt16(offset, le) },
  8: { name: 'int32', bytes: 4, read: (view, offset, le) => view.getInt32(offset, le) },
  16: { name: 'float32', bytes: 4, read: (view, offset, le) => view.getFloat32(offset, le) },
  64: { name: 'float64', bytes: 8, read: (view, offset, le) => view.getFloat64(offset, le) },
  512: { name: 'uint16', bytes: 2, read: (view, offset, le) => view.getUint16(offset, le) },
};

/**
 * Reads a single-volume NIfTI-1 (.nii.gz) into a Float32Array in FILE order,
 * with the voxel-to-world matrix the header declares. The sform wins when both
 * are present, as the standard says; if the qform is also set and points
 * somewhere else, the file is ambiguous about where left is and the read fails.
 *
 * @param {Buffer} gz
 * @param {string} name used in error messages only
 */
function readNifti(gz, name) {
  const bytes = zlib.gunzipSync(gz);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let le = true;
  if (view.getInt32(0, true) !== 348) {
    if (view.getInt32(0, false) !== 348) fail(`${name}: not a NIfTI-1 header (sizeof_hdr is not 348)`);
    le = false;
  }
  const magic = bytes.toString('latin1', 344, 347);
  if (magic !== 'n+1') fail(`${name}: magic is "${magic}", expected single-file NIfTI-1 "n+1"`);

  const i16 = (offset) => view.getInt16(offset, le);
  const f32 = (offset) => view.getFloat32(offset, le);
  const ndim = i16(40);
  const dims = [i16(42), i16(44), i16(46)];
  for (let d = 4; d <= ndim; d += 1) {
    if (i16(40 + 2 * d) > 1) fail(`${name}: has more than one volume (dim[${d}] = ${i16(40 + 2 * d)})`);
  }
  if (ndim < 3) fail(`${name}: dim[0] = ${ndim}, expected a 3-D volume`);
  const type = NIFTI_TYPES[i16(70)];
  if (!type) fail(`${name}: datatype ${i16(70)} is not handled`);
  const voxOffset = f32(108);
  let slope = f32(112);
  let inter = f32(116);
  if (slope === 0 || !Number.isFinite(slope)) {
    // NIfTI: a zero slope means "no scaling", not "multiply by zero".
    slope = 1;
    inter = 0;
  }

  const qformCode = i16(252);
  const sformCode = i16(254);
  const sform = [0, 1, 2].map((row) => [0, 1, 2, 3].map((col) => f32(280 + 16 * row + 4 * col)));
  const qform = qformMatrix(
    [f32(256), f32(260), f32(264)],
    [f32(268), f32(272), f32(276)],
    [f32(80), f32(84), f32(88)],
    f32(76),
  );
  let affine;
  if (sformCode > 0) {
    affine = sform;
    if (qformCode > 0) {
      const worst = Math.max(...sform.flatMap((row, r) => row.map((value, c) => Math.abs(value - qform[r][c]))));
      if (worst > 1e-3) fail(`${name}: sform and qform disagree by ${worst}; refusing to guess which is right`);
    }
  } else if (qformCode > 0) {
    affine = qform;
  } else {
    fail(`${name}: neither sform nor qform is set, so the orientation is unknown`);
  }

  const count = dims[0] * dims[1] * dims[2];
  const start = Math.round(voxOffset);
  if (start + count * type.bytes > bytes.length) fail(`${name}: file is shorter than its header says`);
  const data = new Float32Array(count);
  for (let n = 0; n < count; n += 1) data[n] = type.read(view, start + n * type.bytes, le) * slope + inter;

  return { name, dims, affine, data, datatype: type.name, endian: le ? 'little' : 'big', sformCode, qformCode };
}

function qformMatrix([b, c, d], offset, pixdim, qfacRaw) {
  const a = Math.sqrt(Math.max(0, 1 - (b * b + c * c + d * d)));
  const qfac = qfacRaw < 0 ? -1 : 1;
  const rotation = [
    [a * a + b * b - c * c - d * d, 2 * (b * c - a * d), 2 * (b * d + a * c)],
    [2 * (b * c + a * d), a * a + c * c - b * b - d * d, 2 * (c * d - a * b)],
    [2 * (b * d - a * c), 2 * (c * d + a * b), a * a + d * d - b * b - c * c],
  ];
  const scale = [pixdim[0], pixdim[1], pixdim[2] * qfac];
  return rotation.map((row, r) => [row[0] * scale[0], row[1] * scale[1], row[2] * scale[2], offset[r]]);
}

/**
 * Flips and permutes a volume into canonical RAS+: voxel i runs to the
 * subject's Right, j to Anterior, k to Superior, i fastest.
 *
 * Returns the code of the orientation the file ARRIVED in (e.g. "LAS" means
 * its first voxel axis ran toward the subject's left), because "it was already
 * RAS" is a finding about the input and should be visible in the build log.
 */
function reorientToRas(volume) {
  const { dims, affine, data, name } = volume;
  const letters = [['L', 'R'], ['P', 'A'], ['I', 'S']];
  // For each voxel axis: which world axis it runs along, and in which direction.
  const worldOf = [];
  const signOf = [];
  let code = '';
  for (let axis = 0; axis < 3; axis += 1) {
    const column = [affine[0][axis], affine[1][axis], affine[2][axis]];
    const magnitudes = column.map(Math.abs);
    const world = magnitudes.indexOf(Math.max(...magnitudes));
    const offAxis = magnitudes.reduce((sum, value, r) => (r === world ? sum : sum + value), 0);
    if (offAxis > 1e-4 * magnitudes[world]) {
      fail(`${name}: voxel axis ${axis} is oblique (${column.join(', ')}); this build does not resample`);
    }
    worldOf.push(world);
    signOf.push(column[world] > 0 ? 1 : -1);
    code += letters[world][column[world] > 0 ? 1 : 0];
  }
  if (new Set(worldOf).size !== 3) fail(`${name}: voxel axes do not span three world axes (${code})`);

  const outDims = [0, 0, 0];
  const spacing = [0, 0, 0];
  const origin = [0, 0, 0];
  for (let axis = 0; axis < 3; axis += 1) {
    const world = worldOf[axis];
    outDims[world] = dims[axis];
    spacing[world] = Math.abs(affine[world][axis]);
    // World position of the voxel that becomes index 0 along this world axis.
    origin[world] = affine[world][3] + (signOf[axis] > 0 ? 0 : affine[world][axis] * (dims[axis] - 1));
  }

  let out = data;
  if (code !== 'RAS') {
    out = new Float32Array(data.length);
    const [nx, ny] = dims;
    const index = [0, 0, 0];
    const target = [0, 0, 0];
    for (index[2] = 0; index[2] < dims[2]; index[2] += 1) {
      for (index[1] = 0; index[1] < dims[1]; index[1] += 1) {
        for (index[0] = 0; index[0] < dims[0]; index[0] += 1) {
          for (let axis = 0; axis < 3; axis += 1) {
            target[worldOf[axis]] = signOf[axis] > 0 ? index[axis] : dims[axis] - 1 - index[axis];
          }
          out[target[0] + outDims[0] * (target[1] + outDims[1] * target[2])] =
            data[index[0] + nx * (index[1] + ny * index[2])];
        }
      }
    }
  }
  return { name, dims: outDims, spacingMm: spacing, originMm: origin, data: out, originalOrientation: code };
}

// "Fail loudly": every later step indexes all four volumes with one index and
// converts voxel to millimetre with one constant. If either stops being true
// the outputs are wrong everywhere at once, so nothing is tolerated here.
function assertGrid(volume) {
  const same = (a, b) => a.every((value, n) => Math.abs(value - b[n]) < 1e-4);
  if (!same(volume.dims, EXPECTED_GRID.dims)) fail(`${volume.name}: dims ${volume.dims} ≠ ${EXPECTED_GRID.dims}`);
  if (!same(volume.spacingMm, EXPECTED_GRID.spacingMm)) fail(`${volume.name}: spacing ${volume.spacingMm} is not 1 mm`);
  if (!same(volume.originMm, EXPECTED_GRID.originMm)) {
    fail(`${volume.name}: origin ${volume.originMm} ≠ ${EXPECTED_GRID.originMm}`);
  }
}

// ---------------------------------------------------------------------------
// label table

function parseLabelTable(bytes) {
  const lines = bytes.toString('utf8').split('\n').filter((line) => line.trim() !== '');
  const header = lines[0].split('\t').map((cell) => cell.trim());
  const column = (title) => {
    const at = header.indexOf(title);
    if (at < 0) fail(`label table has no "${title}" column (found ${header.join(', ')})`);
    return at;
  };
  const [labelAt, nameAt, hemiAt] = [column('label'), column('name'), column('hemi')];
  const rows = new Map();
  for (const line of lines.slice(1)) {
    const cells = line.split('\t');
    const label = Number(cells[labelAt]);
    const name = cells[nameAt].trim();
    const hemi = cells[hemiAt].trim();
    if (!Number.isInteger(label) || label < 1 || label > LABEL_COUNT) fail(`label table: bad label "${cells[labelAt]}"`);
    if (hemi !== 'L' && hemi !== 'R') fail(`label table: label ${label} has hemi "${hemi}"`);
    if (rows.has(label)) fail(`label table: label ${label} appears twice`);
    rows.set(label, { label, name, hemi });
  }
  for (let label = 1; label <= LABEL_COUNT; label += 1) {
    if (!rows.has(label)) fail(`label table: label ${label} is missing`);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// intensity volumes

/**
 * 16-bit template intensities → 8-bit display values.
 *
 * Two decisions, both recorded in atlas.json:
 *
 * 1. Scale. [0, p99.9 of in-head voxels] maps linearly to 0..255. The top 0.1%
 *    (a few bright vessels and fat voxels) clips, so that grey and white matter
 *    are not squeezed into the bottom of the range by them.
 *
 * 2. Background. The air around the head is not zero in the template; it holds
 *    low noise that renders as a grey haze around the scalp. It is set to zero
 *    ONLY where three things hold: the voxel is at or below the noise ceiling
 *    read off this volume's own histogram, it is connected to the edge of the
 *    volume through voxels that are also below that ceiling, and the region
 *    reached that way never enters the brain mask. So nothing brighter than
 *    the noise changes, the scalp and skull stay exactly as they are, and if
 *    the flood ever reached the brain the step is skipped altogether rather
 *    than trusted. This is not skull-stripping.
 */
function quantiseIntensity(volume, brainMask) {
  const { data, dims } = volume;
  const [nx, ny, nz] = dims;
  const count = data.length;
  let max = 0;
  for (let n = 0; n < count; n += 1) {
    const value = data[n];
    if (value < 0 || value !== Math.round(value)) fail(`${volume.name}: expected non-negative integer intensities`);
    if (value > max) max = value;
  }
  const histogram = new Float64Array(max + 1);
  for (let n = 0; n < count; n += 1) histogram[data[n]] += 1;

  // Noise ceiling: walk up from the background peak until the histogram has
  // fallen below a tenth of it. Below that the counts are the plateau of real
  // tissue, not the tail of the noise.
  let mode = 1;
  for (let value = 1; value <= max; value += 1) if (histogram[value] > histogram[mode]) mode = value;
  let ceiling = mode;
  while (ceiling + 1 <= max && histogram[ceiling + 1] >= 0.1 * histogram[mode]) ceiling += 1;

  // Flood from the six faces through voxels at or below the ceiling.
  const outside = new Uint8Array(count);
  const stack = new Int32Array(count);
  let top = 0;
  const visit = (n) => {
    if (outside[n] === 0 && data[n] <= ceiling) {
      outside[n] = 1;
      stack[top] = n;
      top += 1;
    }
  };
  for (let k = 0; k < nz; k += 1) {
    for (let j = 0; j < ny; j += 1) {
      for (let i = 0; i < nx; i += 1) {
        if (i === 0 || j === 0 || k === 0 || i === nx - 1 || j === ny - 1 || k === nz - 1) visit(i + nx * (j + ny * k));
      }
    }
  }
  const slab = nx * ny;
  while (top > 0) {
    top -= 1;
    const n = stack[top];
    const i = n % nx;
    const j = Math.floor(n / nx) % ny;
    const k = Math.floor(n / slab);
    if (i > 0) visit(n - 1);
    if (i < nx - 1) visit(n + 1);
    if (j > 0) visit(n - nx);
    if (j < ny - 1) visit(n + nx);
    if (k > 0) visit(n - slab);
    if (k < nz - 1) visit(n + slab);
  }
  let outsideCount = 0;
  let outsideInBrain = 0;
  for (let n = 0; n < count; n += 1) {
    if (outside[n]) {
      outsideCount += 1;
      if (brainMask[n]) outsideInBrain += 1;
    }
  }
  const zeroBackground = outsideInBrain === 0;

  // p99.9 over the head = everything the flood did not reach.
  const headHistogram = new Float64Array(max + 1);
  for (let n = 0; n < count; n += 1) if (!outside[n]) headHistogram[data[n]] += 1;
  const headCount = count - outsideCount;
  let white = 0;
  for (let seen = 0; white <= max; white += 1) {
    seen += headHistogram[white];
    if (seen >= 0.999 * headCount) break;
  }
  if (white <= 0) fail(`${volume.name}: p99.9 of the head is ${white}`);

  const out = new Uint8Array(count);
  let zeroed = 0;
  for (let n = 0; n < count; n += 1) {
    if (zeroBackground && outside[n]) {
      if (data[n] !== 0) zeroed += 1;
      continue;
    }
    out[n] = Math.round((255 * Math.min(data[n], white)) / white);
  }
  return {
    bytes: out,
    intensityScale: {
      sourceMin: 0,
      sourceMax: white,
      sourceMaxIs: 'p99.9 of in-head voxels',
      formula: 'u8 = round(255 * min(source, sourceMax) / sourceMax)',
      sourceRange: [0, max],
      sourceLevelsUsed: histogram.reduce((levels, n) => levels + (n > 0 ? 1 : 0), 0),
    },
    background: {
      zeroed: zeroBackground,
      rule: 'source <= noiseCeiling AND connected to the volume edge through such voxels; skipped if that region touches the brain mask',
      noiseCeiling: ceiling,
      noiseMode: mode,
      voxelsOutsideHead: outsideCount,
      voxelsChanged: zeroed,
      outsideVoxelsInBrainMask: outsideInBrain,
    },
  };
}

// ---------------------------------------------------------------------------
// per-label measurements

function measureLabels(labels, dims, origin) {
  const [nx, ny, nz] = dims;
  const stats = [];
  for (let label = 0; label <= LABEL_COUNT; label += 1) {
    stats.push({ label, voxels: 0, sum: [0, 0, 0], min: [nx, ny, nz], max: [-1, -1, -1], onMidline: 0 });
  }
  const midlineI = -origin[0]; // the voxel column whose centre is x = 0 mm
  let n = 0;
  for (let k = 0; k < nz; k += 1) {
    for (let j = 0; j < ny; j += 1) {
      for (let i = 0; i < nx; i += 1, n += 1) {
        const label = labels[n];
        if (label === 0) continue;
        const s = stats[label];
        s.voxels += 1;
        s.sum[0] += i;
        s.sum[1] += j;
        s.sum[2] += k;
        if (i < s.min[0]) s.min[0] = i;
        if (j < s.min[1]) s.min[1] = j;
        if (k < s.min[2]) s.min[2] = k;
        if (i > s.max[0]) s.max[0] = i;
        if (j > s.max[1]) s.max[1] = j;
        if (k > s.max[2]) s.max[2] = k;
        if (i === midlineI) s.onMidline += 1;
      }
    }
  }
  return stats;
}

// Felzenszwalb & Huttenlocher's exact 1-D squared distance transform, the
// lower envelope of parabolas. f is overwritten with the result.
function distance1d(f, n, v, z, d) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q += 1) {
    let s;
    for (;;) {
      const p = v[k];
      s = (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p);
      if (s > z[k]) break;
      k -= 1;
    }
    k += 1;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q += 1) {
    while (z[k + 1] < q) k += 1;
    const p = v[k];
    d[q] = (q - p) * (q - p) + f[p];
  }
  for (let q = 0; q < n; q += 1) f[q] = d[q];
}

/**
 * The voxel of a label that is farthest from the label's own boundary.
 *
 * The centroid is not used for this because it does not have to be inside:
 * the caudate and the lateral ventricle are C-shaped and their centroids sit in
 * the thalamus and the white matter. This point is where the MRI crosshair
 * jumps when a structure is picked, so "inside, and as deep as possible" is the
 * whole requirement. Ties go to the voxel nearest the centroid, then to the
 * lowest index, so the answer does not depend on scan order.
 */
function interiorPoint(labels, dims, stat, centroid) {
  const [nx, ny] = dims;
  // One voxel of padding so the bounding box edge counts as boundary, which is
  // also what makes a label touching the volume edge behave.
  const size = [0, 1, 2].map((a) => stat.max[a] - stat.min[a] + 3);
  const [sx, sy, sz] = size;
  const INF = 1e12;
  const field = new Float64Array(sx * sy * sz);
  for (let k = 1; k < sz - 1; k += 1) {
    for (let j = 1; j < sy - 1; j += 1) {
      const row = stat.min[0] - 1 + nx * (stat.min[1] - 1 + j + ny * (stat.min[2] - 1 + k));
      for (let i = 1; i < sx - 1; i += 1) {
        if (labels[row + i] === stat.label) field[i + sx * (j + sy * k)] = INF;
      }
    }
  }
  const longest = Math.max(sx, sy, sz);
  const line = new Float64Array(longest);
  const v = new Int32Array(longest);
  const z = new Float64Array(longest + 1);
  const d = new Float64Array(longest);
  const sweep = (length, stride, starts) => {
    for (const start of starts) {
      for (let q = 0; q < length; q += 1) line[q] = field[start + q * stride];
      distance1d(line, length, v, z, d);
      for (let q = 0; q < length; q += 1) field[start + q * stride] = line[q];
    }
  };
  const startsX = [];
  for (let k = 0; k < sz; k += 1) for (let j = 0; j < sy; j += 1) startsX.push(sx * (j + sy * k));
  const startsY = [];
  for (let k = 0; k < sz; k += 1) for (let i = 0; i < sx; i += 1) startsY.push(i + sx * sy * k);
  const startsZ = [];
  for (let j = 0; j < sy; j += 1) for (let i = 0; i < sx; i += 1) startsZ.push(i + sx * j);
  sweep(sx, 1, startsX);
  sweep(sy, sx, startsY);
  sweep(sz, sx * sy, startsZ);

  let best = null;
  for (let k = 1; k < sz - 1; k += 1) {
    for (let j = 1; j < sy - 1; j += 1) {
      for (let i = 1; i < sx - 1; i += 1) {
        const depth2 = field[i + sx * (j + sy * k)];
        if (depth2 === 0) continue;
        const voxel = [stat.min[0] - 1 + i, stat.min[1] - 1 + j, stat.min[2] - 1 + k];
        const off2 =
          (voxel[0] - centroid[0]) ** 2 + (voxel[1] - centroid[1]) ** 2 + (voxel[2] - centroid[2]) ** 2;
        // Scan order is ascending index, so "strictly better" keeps the lowest index on a full tie.
        if (!best || depth2 > best.depth2 || (depth2 === best.depth2 && off2 < best.off2)) {
          best = { voxel, depth2, off2 };
        }
      }
    }
  }
  return { voxel: best.voxel, depthMm: Math.sqrt(best.depth2) };
}

// ---------------------------------------------------------------------------
// surface extraction

// One pass of the binomial kernel [1 2 1]/4 along each axis (σ ≈ 0.71 voxel).
// Binomial rather than a sampled Gaussian so that the weights are exact binary
// fractions: the field, and therefore every vertex, is bit-identical on any
// machine.
function binomialBlur(field, [sx, sy, sz]) {
  const out = new Float32Array(field.length);
  const pass = (src, dst, stride, length, lines) => {
    for (const start of lines) {
      for (let q = 0; q < length; q += 1) {
        const at = start + q * stride;
        const before = q > 0 ? src[at - stride] : 0;
        const after = q < length - 1 ? src[at + stride] : 0;
        dst[at] = 0.25 * before + 0.5 * src[at] + 0.25 * after;
      }
    }
  };
  const linesX = [];
  for (let k = 0; k < sz; k += 1) for (let j = 0; j < sy; j += 1) linesX.push(sx * (j + sy * k));
  const linesY = [];
  for (let k = 0; k < sz; k += 1) for (let i = 0; i < sx; i += 1) linesY.push(i + sx * sy * k);
  const linesZ = [];
  for (let j = 0; j < sy; j += 1) for (let i = 0; i < sx; i += 1) linesZ.push(i + sx * j);
  pass(field, out, 1, sx, linesX);
  pass(out, field, sx, sy, linesY);
  pass(field, out, sx * sy, sz, linesZ);
  return out;
}

/**
 * The scalar field a label's surface is cut from: the label's binary mask,
 * blurred, on a grid of `step` millimetres.
 *
 * step 1: the mask blurred once. step 2: blurred twice, then averaged over
 * 2×2×2 blocks. The blocks are aligned to even voxel indices of the WHOLE
 * volume, not of this label's crop, so two neighbouring labels are sampled on
 * the same coarse lattice and their surfaces meet instead of interleaving.
 *
 * Returns the field, its size, and the millimetre position of sample (0,0,0).
 */
function labelField(labels, dims, origin, stat, step) {
  const [nx, ny, nz] = dims;
  const blurPasses = step === 1 ? 1 : 2;
  // Room for the blur to fall to zero, plus one clear sample so that no surface
  // can reach the edge of the crop.
  const pad = blurPasses + 2 * step;
  const lo = [0, 1, 2].map((a) => {
    const start = stat.min[a] - pad;
    return start - (((start % step) + step) % step);
  });
  const size = [0, 1, 2].map((a) => {
    const span = stat.max[a] + pad - lo[a] + 1;
    return span + ((step - (span % step)) % step);
  });
  const [sx, sy, sz] = size;
  let field = new Float32Array(sx * sy * sz);
  for (let k = 0; k < sz; k += 1) {
    const gk = lo[2] + k;
    if (gk < 0 || gk >= nz) continue;
    for (let j = 0; j < sy; j += 1) {
      const gj = lo[1] + j;
      if (gj < 0 || gj >= ny) continue;
      for (let i = 0; i < sx; i += 1) {
        const gi = lo[0] + i;
        if (gi < 0 || gi >= nx) continue;
        if (labels[gi + nx * (gj + ny * gk)] === stat.label) field[i + sx * (j + sy * k)] = 1;
      }
    }
  }
  for (let pass = 0; pass < blurPasses; pass += 1) field = binomialBlur(field, size);
  if (step === 1) {
    return { field, size, baseMm: lo.map((value, a) => origin[a] + value), step };
  }
  const coarse = size.map((value) => value / step);
  const [cx, cy, cz] = coarse;
  const pooled = new Float32Array(cx * cy * cz);
  const weight = 1 / (step * step * step);
  for (let k = 0; k < sz; k += 1) {
    for (let j = 0; j < sy; j += 1) {
      const target = cx * (Math.floor(j / step) + cy * Math.floor(k / step));
      const row = sx * (j + sy * k);
      for (let i = 0; i < sx; i += 1) pooled[target + Math.floor(i / step)] += field[row + i] * weight;
    }
  }
  // A pooled sample stands at the centre of its block.
  return { field: pooled, size: coarse, baseMm: lo.map((value, a) => origin[a] + value + (step - 1) / 2), step };
}

// Each of a cube's 12 edges as [corner a, corner b]; corner c has offsets (c&1, c>>1&1, c>>2&1).
const CUBE_EDGES = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [0, 2], [1, 3], [4, 6], [5, 7],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

/**
 * Naive surface nets: one vertex per grid cell the surface passes through,
 * placed at the mean of the crossings on that cell's edges; one quad per grid
 * edge the surface crosses, joining the four cells around it.
 *
 * Chosen over marching cubes because it needs no case table, gives each label
 * a closed surface by construction (every crossed cell face is shared by
 * exactly the quads on either side of it), and its vertices are already an
 * average, which removes the voxel staircase without a separate relaxation.
 *
 * Winding is counter-clockwise seen from outside in a right-handed frame — the
 * frame of MNI millimetres. The build proves it afterwards with the signed
 * volume instead of trusting this comment.
 */
function surfaceNets({ field, size, baseMm, step }, iso) {
  const [sx, sy, sz] = size;
  const slab = sx * sy;
  const cellOfSample = new Int32Array(field.length).fill(-1);
  const positions = [];
  const corner = new Float32Array(8);
  for (let k = 0; k < sz - 1; k += 1) {
    for (let j = 0; j < sy - 1; j += 1) {
      for (let i = 0; i < sx - 1; i += 1) {
        const at = i + sx * j + slab * k;
        let inside = 0;
        for (let c = 0; c < 8; c += 1) {
          corner[c] = field[at + (c & 1) + sx * ((c >> 1) & 1) + slab * ((c >> 2) & 1)];
          if (corner[c] > iso) inside |= 1 << c;
        }
        if (inside === 0 || inside === 255) continue;
        if (i === 0 || j === 0 || k === 0 || i === sx - 2 || j === sy - 2 || k === sz - 2) {
          fail('surface reached the edge of its crop; the padding in labelField is too small');
        }
        let x = 0;
        let y = 0;
        let z = 0;
        let crossings = 0;
        for (const [a, b] of CUBE_EDGES) {
          if (((inside >> a) & 1) === ((inside >> b) & 1)) continue;
          const t = (iso - corner[a]) / (corner[b] - corner[a]);
          x += (a & 1) + t * ((b & 1) - (a & 1));
          y += ((a >> 1) & 1) + t * (((b >> 1) & 1) - ((a >> 1) & 1));
          z += ((a >> 2) & 1) + t * (((b >> 2) & 1) - ((a >> 2) & 1));
          crossings += 1;
        }
        cellOfSample[at] = positions.length / 3;
        positions.push(
          baseMm[0] + step * (i + x / crossings),
          baseMm[1] + step * (j + y / crossings),
          baseMm[2] + step * (k + z / crossings),
        );
      }
    }
  }

  const indices = [];
  const quad = (a, b, c, d, flip) => {
    // Split along the shorter diagonal; on a tie the first, so the choice is stable.
    const p = (v, n) => positions[3 * v + n];
    const ac = (p(a, 0) - p(c, 0)) ** 2 + (p(a, 1) - p(c, 1)) ** 2 + (p(a, 2) - p(c, 2)) ** 2;
    const bd = (p(b, 0) - p(d, 0)) ** 2 + (p(b, 1) - p(d, 1)) ** 2 + (p(b, 2) - p(d, 2)) ** 2;
    const tris = ac <= bd ? [a, b, c, a, c, d] : [a, b, d, b, c, d];
    if (flip) {
      indices.push(tris[0], tris[2], tris[1], tris[3], tris[5], tris[4]);
    } else {
      indices.push(...tris);
    }
  };
  for (let k = 1; k < sz - 1; k += 1) {
    for (let j = 1; j < sy - 1; j += 1) {
      for (let i = 1; i < sx - 1; i += 1) {
        const at = i + sx * j + slab * k;
        const here = field[at] > iso;
        // For the edge leaving this sample along +x, the four cells around it
        // are listed counter-clockwise seen from +x (y → z). If this end is the
        // inside one, +x is outward and that order is already right.
        if (here !== field[at + 1] > iso) {
          quad(
            cellOfSample[at - sx - slab], cellOfSample[at - slab], cellOfSample[at], cellOfSample[at - sx],
            !here,
          );
        }
        // +y: counter-clockwise seen from +y is z → x.
        if (here !== field[at + sx] > iso) {
          quad(
            cellOfSample[at - slab - 1], cellOfSample[at - 1], cellOfSample[at], cellOfSample[at - slab],
            !here,
          );
        }
        // +z: x → y.
        if (here !== field[at + slab] > iso) {
          quad(
            cellOfSample[at - 1 - sx], cellOfSample[at - sx], cellOfSample[at], cellOfSample[at - 1],
            !here,
          );
        }
      }
    }
  }
  return { positions: Float32Array.from(positions), indices: Uint32Array.from(indices) };
}

// Signed volume and centroid of the solid a closed mesh encloses (divergence
// theorem: a sum of tetrahedra from one point to every triangle). Positive
// means the triangles wind counter-clockwise seen from outside.
function enclosedSolid({ positions, indices }) {
  // Taken relative to the first vertex: the theorem does not care, and the sum
  // loses fewer digits than it would 100 mm from zero.
  const [ox, oy, oz] = positions;
  let six = 0;
  let mx = 0;
  let my = 0;
  let mz = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const a = 3 * indices[t];
    const b = 3 * indices[t + 1];
    const c = 3 * indices[t + 2];
    const ax = positions[a] - ox;
    const ay = positions[a + 1] - oy;
    const az = positions[a + 2] - oz;
    const bx = positions[b] - ox;
    const by = positions[b + 1] - oy;
    const bz = positions[b + 2] - oz;
    const cx = positions[c] - ox;
    const cy = positions[c + 1] - oy;
    const cz = positions[c + 2] - oz;
    const tet = ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
    six += tet;
    mx += tet * (ax + bx + cx);
    my += tet * (ay + by + cy);
    mz += tet * (az + bz + cz);
  }
  const centroid = six !== 0 ? [ox + mx / (4 * six), oy + my / (4 * six), oz + mz / (4 * six)] : [ox, oy, oz];
  return { volume: six / 6, centroid };
}

/**
 * Cuts the surface at the level that gives back the label's own volume.
 *
 * Blurring a mask and cutting at 0.5 keeps a flat boundary where it was, but
 * pulls convex parts inward — and on a thin sheet or a narrow horn, "convex
 * part" is the whole structure, so 0.5 shrinks exactly the structures that
 * have least to spare. Rather than pick one level and accept the shrinkage,
 * the level is bisected until the mesh encloses the voxel volume to within 3%.
 * The level used is reported, and a level that had to go far from 0.5 is the
 * sign of a structure too thin for its grid.
 */
function extractCalibrated(sampled, voxelVolume) {
  const ratioAt = (iso) => {
    const mesh = surfaceNets(sampled, iso);
    const volume = mesh.indices.length ? enclosedSolid(mesh).volume : 0;
    return { iso, mesh, volume, ratio: volume / voxelVolume };
  };
  let best = ratioAt(0.5);
  const good = (trial) => Math.abs(trial.ratio - 1) <= 0.03;
  if (good(best)) return best;
  // Volume falls as the level rises, so this is a plain bisection.
  let low = 0.2;
  let high = 0.8;
  if (best.ratio < 1) high = 0.5;
  else low = 0.5;
  for (let step = 0; step < 7; step += 1) {
    const trial = ratioAt((low + high) / 2);
    if (Math.abs(trial.ratio - 1) < Math.abs(best.ratio - 1)) best = trial;
    if (good(trial)) break;
    if (trial.ratio < 1) high = trial.iso;
    else low = trial.iso;
  }
  return best;
}

/**
 * Quadric-error edge collapse (Garland & Heckbert 1997), written for one job:
 * a surface-nets mesh spends one vertex per square millimetre everywhere, flat
 * or curved, and the triangle budget cannot pay for that. This removes the
 * vertices that carry least shape — the flat flank of the thalamus goes first,
 * the hippocampal head and the horn of a ventricle go last — which is why the
 * small structures can be extracted at 1 mm and still fit.
 *
 * What it guarantees, and how:
 * - Closed stays closed. A collapse only ever merges two vertices, so every
 *   edge that had two faces still has two; `unmatchedEdges` re-checks it.
 * - No fold-overs. A collapse that would turn any surrounding triangle by more
 *   than about 78° is refused, as is one that fails the link condition (the
 *   two ends must share exactly the two vertices opposite the edge).
 * - Deterministic. Costs use only + − × ÷, ties in the queue are broken by
 *   vertex index, and the survivors keep their original order.
 *
 * @param {{positions: Float32Array, indices: Uint32Array}} mesh
 * @param {number} targetVertices stop when this many vertices are left
 */
function decimate(mesh, targetVertices) {
  const vertexCount = mesh.positions.length / 3;
  if (targetVertices >= vertexCount) return { ...mesh, collapsed: 0 };
  const faceCount = mesh.indices.length / 3;
  // Work near the origin: the quadrics hold squared and fourth-power
  // coordinates and are much better conditioned a few centimetres from zero
  // than at MNI coordinates.
  const base = [mesh.positions[0], mesh.positions[1], mesh.positions[2]];
  const pos = new Float64Array(mesh.positions.length);
  for (let n = 0; n < pos.length; n += 1) pos[n] = mesh.positions[n] - base[n % 3];
  const faces = Int32Array.from(mesh.indices);
  const faceAlive = new Uint8Array(faceCount).fill(1);
  const vertexAlive = new Uint8Array(vertexCount).fill(1);
  const version = new Int32Array(vertexCount);
  const facesOf = Array.from({ length: vertexCount }, () => []);
  // Symmetric 4×4 per vertex, upper triangle: xx xy xz xw yy yz yw zz zw ww.
  const quadric = new Float64Array(vertexCount * 10);

  for (let f = 0; f < faceCount; f += 1) {
    const a = faces[3 * f];
    const b = faces[3 * f + 1];
    const c = faces[3 * f + 2];
    facesOf[a].push(f);
    facesOf[b].push(f);
    facesOf[c].push(f);
    const ux = pos[3 * b] - pos[3 * a];
    const uy = pos[3 * b + 1] - pos[3 * a + 1];
    const uz = pos[3 * b + 2] - pos[3 * a + 2];
    const vx = pos[3 * c] - pos[3 * a];
    const vy = pos[3 * c + 1] - pos[3 * a + 1];
    const vz = pos[3 * c + 2] - pos[3 * a + 2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const twiceArea = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (twiceArea === 0) continue;
    nx /= twiceArea;
    ny /= twiceArea;
    nz /= twiceArea;
    const w = -(nx * pos[3 * a] + ny * pos[3 * a + 1] + nz * pos[3 * a + 2]);
    const area = twiceArea / 2;
    const plane = [nx * nx, nx * ny, nx * nz, nx * w, ny * ny, ny * nz, ny * w, nz * nz, nz * w, w * w];
    for (const v of [a, b, c]) for (let q = 0; q < 10; q += 1) quadric[10 * v + q] += area * plane[q];
  }

  // --- priority queue of candidate collapses, smallest cost first
  const heap = []; // entries: [cost, a, b, version a, version b, x, y, z]
  const before = (p, q) => p[0] < q[0] || (p[0] === q[0] && (p[1] < q[1] || (p[1] === q[1] && p[2] < q[2])));
  const push = (entry) => {
    let at = heap.length;
    heap.push(entry);
    while (at > 0) {
      const parent = (at - 1) >> 1;
      if (!before(entry, heap[parent])) break;
      heap[at] = heap[parent];
      at = parent;
    }
    heap[at] = entry;
  };
  const pop = () => {
    const first = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      let at = 0;
      for (;;) {
        let child = 2 * at + 1;
        if (child >= heap.length) break;
        if (child + 1 < heap.length && before(heap[child + 1], heap[child])) child += 1;
        if (!before(heap[child], last)) break;
        heap[at] = heap[child];
        at = child;
      }
      heap[at] = last;
    }
    return first;
  };

  const q = new Float64Array(10);
  const errorAt = (x, y, z) =>
    q[0] * x * x + 2 * q[1] * x * y + 2 * q[2] * x * z + 2 * q[3] * x +
    q[4] * y * y + 2 * q[5] * y * z + 2 * q[6] * y +
    q[7] * z * z + 2 * q[8] * z + q[9];
  const consider = (a, b) => {
    for (let n = 0; n < 10; n += 1) q[n] = quadric[10 * a + n] + quadric[10 * b + n];
    const ax = pos[3 * a];
    const ay = pos[3 * a + 1];
    const az = pos[3 * a + 2];
    const bx = pos[3 * b];
    const by = pos[3 * b + 1];
    const bz = pos[3 * b + 2];
    const length2 = (ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2;
    // Candidates: either end, the midpoint, and the point that minimises the
    // error outright when the 3×3 system is well enough conditioned to trust
    // and the answer has not run off along a flat direction.
    let best = [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2];
    let bestError = errorAt(...best);
    for (const candidate of [[ax, ay, az], [bx, by, bz]]) {
      const error = errorAt(...candidate);
      if (error < bestError) {
        best = candidate;
        bestError = error;
      }
    }
    const det =
      q[0] * (q[4] * q[7] - q[5] * q[5]) - q[1] * (q[1] * q[7] - q[5] * q[2]) + q[2] * (q[1] * q[5] - q[4] * q[2]);
    const scale = (q[0] + q[4] + q[7]) / 3;
    if (det > 1e-4 * scale * scale * scale) {
      const x = -(q[3] * (q[4] * q[7] - q[5] * q[5]) - q[1] * (q[6] * q[7] - q[5] * q[8]) + q[2] * (q[6] * q[5] - q[4] * q[8])) / det;
      const y = -(q[0] * (q[6] * q[7] - q[5] * q[8]) - q[3] * (q[1] * q[7] - q[5] * q[2]) + q[2] * (q[1] * q[8] - q[6] * q[2])) / det;
      const z = -(q[0] * (q[4] * q[8] - q[6] * q[5]) - q[1] * (q[1] * q[8] - q[6] * q[2]) + q[3] * (q[1] * q[5] - q[4] * q[2])) / det;
      const mid2 = (x - (ax + bx) / 2) ** 2 + (y - (ay + by) / 2) ** 2 + (z - (az + bz) / 2) ** 2;
      if (mid2 <= length2) {
        const error = errorAt(x, y, z);
        if (error < bestError) {
          best = [x, y, z];
          bestError = error;
        }
      }
    }
    // The second term only matters where the first is ~0 (flat patches): there
    // it makes short edges go first, which keeps the triangles from becoming
    // long slivers that shade badly.
    const cost = Math.max(0, bestError) + 1e-3 * length2 * length2;
    const [low, high] = a < b ? [a, b] : [b, a];
    push([cost, low, high, version[low], version[high], best[0], best[1], best[2]]);
  };

  for (let f = 0; f < faceCount; f += 1) {
    for (let e = 0; e < 3; e += 1) {
      const a = faces[3 * f + e];
      const b = faces[3 * f + ((e + 1) % 3)];
      // In a closed mesh every edge is seen from both sides; queue it once.
      if (a < b) consider(a, b);
    }
  }

  const neighbours = (v) => {
    const set = new Set();
    for (const f of facesOf[v]) for (let e = 0; e < 3; e += 1) if (faces[3 * f + e] !== v) set.add(faces[3 * f + e]);
    return set;
  };
  // Would moving `moved` to (x, y, z) fold or flatten face f?
  const breaksFace = (f, moved, x, y, z) => {
    const p = [];
    const r = [];
    for (let e = 0; e < 3; e += 1) {
      const v = faces[3 * f + e];
      p.push(pos[3 * v], pos[3 * v + 1], pos[3 * v + 2]);
      if (v === moved) r.push(x, y, z);
      else r.push(pos[3 * v], pos[3 * v + 1], pos[3 * v + 2]);
    }
    const normal = (t) => {
      const ux = t[3] - t[0];
      const uy = t[4] - t[1];
      const uz = t[5] - t[2];
      const vx = t[6] - t[0];
      const vy = t[7] - t[1];
      const vz = t[8] - t[2];
      return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    };
    const n0 = normal(p);
    const n1 = normal(r);
    const dot = n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2];
    const l0 = n0[0] * n0[0] + n0[1] * n0[1] + n0[2] * n0[2];
    const l1 = n1[0] * n1[0] + n1[1] * n1[1] + n1[2] * n1[2];
    // cos > 0.2, and the new triangle must still have some area.
    return !(dot > 0 && dot * dot > 0.04 * l0 * l1 && l1 > 1e-10);
  };

  let remaining = vertexCount;
  let collapsed = 0;
  while (remaining > targetVertices && heap.length > 0) {
    const [, a, b, va, vb, x, y, z] = pop();
    if (!vertexAlive[a] || !vertexAlive[b] || version[a] !== va || version[b] !== vb) continue;
    const shared = facesOf[a].filter((f) => faces[3 * f] === b || faces[3 * f + 1] === b || faces[3 * f + 2] === b);
    if (shared.length !== 2) continue;
    const aroundA = neighbours(a);
    const aroundB = neighbours(b);
    let common = 0;
    for (const v of aroundA) if (aroundB.has(v)) common += 1;
    if (common !== 2) continue;
    // Fewer than three other vertices around the pair means a tetrahedron is
    // about to be folded flat; leave the smallest islands alone.
    if (aroundA.size + aroundB.size - common - 2 < 3) continue;
    let broken = false;
    for (const f of facesOf[a]) if (!shared.includes(f) && breaksFace(f, a, x, y, z)) broken = true;
    for (const f of facesOf[b]) if (!shared.includes(f) && breaksFace(f, b, x, y, z)) broken = true;
    if (broken) continue;

    // Collapse b into a.
    for (const f of shared) {
      faceAlive[f] = 0;
      for (let e = 0; e < 3; e += 1) {
        const v = faces[3 * f + e];
        if (v !== b) facesOf[v] = facesOf[v].filter((other) => other !== f);
      }
    }
    for (const f of facesOf[b]) {
      if (!faceAlive[f]) continue;
      for (let e = 0; e < 3; e += 1) if (faces[3 * f + e] === b) faces[3 * f + e] = a;
      facesOf[a].push(f);
    }
    facesOf[b] = [];
    vertexAlive[b] = 0;
    for (let n = 0; n < 10; n += 1) quadric[10 * a + n] += quadric[10 * b + n];
    pos[3 * a] = x;
    pos[3 * a + 1] = y;
    pos[3 * a + 2] = z;
    version[a] += 1;
    remaining -= 1;
    collapsed += 1;
    // Sorted, so that the queue receives the new candidates in an order that
    // does not depend on how the face lists happened to be built.
    for (const v of [...neighbours(a)].sort((m, n) => m - n)) consider(a, v);
  }

  const remap = new Int32Array(vertexCount).fill(-1);
  const positions = new Float32Array(remaining * 3);
  let next = 0;
  for (let v = 0; v < vertexCount; v += 1) {
    if (!vertexAlive[v]) continue;
    remap[v] = next;
    for (let n = 0; n < 3; n += 1) positions[3 * next + n] = pos[3 * v + n] + base[n];
    next += 1;
  }
  const indices = [];
  for (let f = 0; f < faceCount; f += 1) {
    if (faceAlive[f]) indices.push(remap[faces[3 * f]], remap[faces[3 * f + 1]], remap[faces[3 * f + 2]]);
  }
  return { positions, indices: Uint32Array.from(indices), collapsed };
}

// Area-weighted vertex normals: the cross product of a triangle's edges is
// already twice its area times its normal, so summing them unnormalised does
// the weighting.
function vertexNormals({ positions, indices }) {
  const sums = new Float64Array(positions.length);
  for (let t = 0; t < indices.length; t += 3) {
    const a = 3 * indices[t];
    const b = 3 * indices[t + 1];
    const c = 3 * indices[t + 2];
    const ux = positions[b] - positions[a];
    const uy = positions[b + 1] - positions[a + 1];
    const uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a];
    const vy = positions[c + 1] - positions[a + 1];
    const vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      sums[v] += nx;
      sums[v + 1] += ny;
      sums[v + 2] += nz;
    }
  }
  // Stored as normalised int8, four bytes per vertex (glTF wants vertex data
  // on 4-byte boundaries; the fourth byte is padding).
  const packed = new Int8Array((positions.length / 3) * 4);
  for (let v = 0; v < positions.length / 3; v += 1) {
    const x = sums[3 * v];
    const y = sums[3 * v + 1];
    const z = sums[3 * v + 2];
    const length = Math.sqrt(x * x + y * y + z * z);
    // A vertex whose faces cancel exactly has no normal to give; +z keeps the
    // attribute valid (unit length) rather than leaving a zero vector.
    packed[4 * v] = length > 0 ? Math.round((127 * x) / length) : 0;
    packed[4 * v + 1] = length > 0 ? Math.round((127 * y) / length) : 0;
    packed[4 * v + 2] = length > 0 ? Math.round((127 * z) / length) : 127;
  }
  return packed;
}

// Watertight, stated the way that survives the non-manifold contacts surface
// nets can produce: every directed edge a→b is matched by exactly as many b→a.
// A hole, a flipped triangle or a dangling fin each break that count.
function unmatchedEdges({ positions, indices }) {
  const vertexCount = positions.length / 3;
  const balance = new Map();
  for (let t = 0; t < indices.length; t += 3) {
    for (let e = 0; e < 3; e += 1) {
      const a = indices[t + e];
      const b = indices[t + ((e + 1) % 3)];
      const key = a < b ? a * vertexCount + b : b * vertexCount + a;
      balance.set(key, (balance.get(key) ?? 0) + (a < b ? 1 : -1));
    }
  }
  let unmatched = 0;
  for (const value of balance.values()) if (value !== 0) unmatched += 1;
  return unmatched;
}

function buildMesh(labels, dims, origin, stat, fine) {
  const sampled = labelField(labels, dims, origin, stat, fine ? 1 : 2);
  const extracted = extractCalibrated(sampled, stat.voxels);
  const extractedVertices = extracted.mesh.positions.length / 3;
  const keep = fine ? KEEP_FINE : KEEP_COARSE;
  const target = Math.max(Math.round(keep * extractedVertices), Math.min(extractedVertices, MIN_VERTICES));
  const mesh = decimate(extracted.mesh, target);
  const vertexCount = mesh.positions.length / 3;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const sum = [0, 0, 0];
  for (let v = 0; v < vertexCount; v += 1) {
    for (let a = 0; a < 3; a += 1) {
      const value = mesh.positions[3 * v + a];
      sum[a] += value;
      if (value < min[a]) min[a] = value;
      if (value > max[a]) max[a] = value;
    }
  }
  // Measured on what is actually written, after decimation and after the
  // positions have been rounded to float32 — not on the mesh before it.
  const solid = mesh.indices.length ? enclosedSolid(mesh) : { volume: 0, centroid: [0, 0, 0] };
  return {
    positions: mesh.positions,
    indices: mesh.indices,
    normals: vertexNormals(mesh),
    vertexCount,
    triangleCount: mesh.indices.length / 3,
    extractedVertices,
    gridMm: fine ? 1 : 2,
    iso: extracted.iso,
    volume: solid.volume,
    volumeRatio: solid.volume / stat.voxels,
    solidCentroid: solid.centroid,
    min,
    max,
    centroid: sum.map((value) => value / Math.max(1, vertexCount)),
    unmatchedEdges: unmatchedEdges(mesh),
  };
}

// ---------------------------------------------------------------------------
// GLB

/**
 * A minimal binary glTF 2.0 writer for exactly this file: N nodes, each with
 * one indexed triangle mesh, POSITION as float32 and NORMAL as normalised int8.
 *
 * Positions stay float32, in millimetres, with no node transform. Quantising
 * them to int16 would save about 4 of 28 bytes per vertex but would put the
 * millimetres into a node scale/offset, and anything that reads
 * geometry.attributes.position directly — a raycast hit, a bounding box, the
 * crosshair sync — would then be reading normalised integers. The normals are
 * where the bytes are saved; that is what KHR_mesh_quantization is required
 * for, and three.js r169 reads it with no decoder.
 *
 * No material is written: colour is the app's teaching layer, not the atlas's.
 */
function writeGlb(entries) {
  const chunks = [];
  let length = 0;
  const append = (typed) => {
    const bytes = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    const offset = length;
    chunks.push(bytes);
    length += bytes.length;
    const padding = (4 - (length % 4)) % 4;
    if (padding) {
      chunks.push(Buffer.alloc(padding));
      length += padding;
    }
    return { byteOffset: offset, byteLength: bytes.length };
  };

  const FLOAT = 5126;
  const BYTE = 5120;
  const UNSIGNED_SHORT = 5123;
  const UNSIGNED_INT = 5125;
  const gltf = {
    asset: { version: '2.0', generator: 'scripts/build-mri-atlas.mjs' },
    extensionsUsed: ['KHR_mesh_quantization'],
    extensionsRequired: ['KHR_mesh_quantization'],
    scene: 0,
    scenes: [{ name: 'cerebra', nodes: entries.map((_, n) => n) }],
    nodes: [],
    meshes: [],
    accessors: [],
    bufferViews: [],
    buffers: [],
  };
  const accessor = (view, definition) => {
    gltf.bufferViews.push({ buffer: 0, ...view });
    gltf.accessors.push({ bufferView: gltf.bufferViews.length - 1, ...definition });
    return gltf.accessors.length - 1;
  };

  for (const entry of entries) {
    const { mesh } = entry;
    const position = accessor(
      { ...append(mesh.positions), target: 34962 },
      { componentType: FLOAT, count: mesh.vertexCount, type: 'VEC3', min: mesh.min, max: mesh.max },
    );
    const normal = accessor(
      { ...append(mesh.normals), byteStride: 4, target: 34962 },
      { componentType: BYTE, normalized: true, count: mesh.vertexCount, type: 'VEC3' },
    );
    const small = mesh.vertexCount <= 65535;
    const indexData = small ? Uint16Array.from(mesh.indices) : mesh.indices;
    const index = accessor(
      { ...append(indexData), target: 34963 },
      { componentType: small ? UNSIGNED_SHORT : UNSIGNED_INT, count: mesh.indices.length, type: 'SCALAR' },
    );
    gltf.meshes.push({
      name: entry.node,
      primitives: [{ attributes: { POSITION: position, NORMAL: normal }, indices: index, mode: 4 }],
    });
    gltf.nodes.push({ name: entry.node, mesh: gltf.meshes.length - 1, extras: entry.extras });
  }
  gltf.buffers.push({ byteLength: length });

  let json = Buffer.from(JSON.stringify(gltf), 'utf8');
  if (json.length % 4) json = Buffer.concat([json, Buffer.alloc(4 - (json.length % 4), 0x20)]);
  const bin = Buffer.concat(chunks, length);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // "glTF"
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(json.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // "JSON"
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // "BIN\0"
  return Buffer.concat([header, jsonHeader, json, binHeader, bin]);
}

// ---------------------------------------------------------------------------
// ATTRIBUTION.md

function attributionMarkdown({ licenseText, hashes, orientations, quantised, meshSummary }) {
  const notice = licenseText.replace(/\s+$/, '').split('\n').map((line) => `> ${line}`.trimEnd()).join('\n');
  const sourceRows = Object.values(SOURCES)
    .map((source) => `| \`${source.file}\` | \`${hashes[source.file]}\` |`)
    .join('\n');
  return `# Standard-brain MRI and CerebrA atlas: attribution and licence notice

The files in this directory are **derived** from two published works. Nothing
here is an individual person's scan.

| File | What it is | Derived from |
| --- | --- | --- |
| \`t1.u8.gz\`, \`t2.u8.gz\` | T1-weighted and T2-weighted template volumes, 8-bit | MNI ICBM152 2009c Nonlinear Symmetric template, 1 mm |
| \`labels.u8.gz\` | Label of every voxel, 0 (unlabelled) to 102 | CerebrA atlas |
| \`cerebra.glb\` | One closed surface per CerebrA label | CerebrA atlas |
| \`atlas.json\` | Grid, hashes, and per-label names and measurements | CerebrA atlas and its label table |

## MNI ICBM152 2009c Nonlinear Symmetric template

Copyright notice, verbatim from the \`LICENSE\` file distributed with the
template. It must stay with every copy of these files, and this file is that
notice:

${notice}

Please cite:

- Fonov VS, Evans AC, Botteron K, Almli CR, McKinstry RC, Collins DL, and the
  Brain Development Cooperative Group. Unbiased average age-appropriate atlases
  for pediatric studies. *NeuroImage* 54(1):313–327 (2011).
  doi:10.1016/j.neuroimage.2010.07.033
- Fonov VS, Evans AC, McKinstry RC, Almli CR, Collins DL. Unbiased nonlinear
  average age-appropriate brain templates from birth to adulthood. *NeuroImage*
  47, Supplement 1:S102 (2009). doi:10.1016/S1053-8119(09)70884-5

## CerebrA atlas

- Manera AL, Dadar M, Fonov V, Collins DL. CerebrA, registration and manual
  label correction of Mindboggle-101 atlas for MNI-ICBM152 template.
  *Sci Data* 7, 237 (2020). doi:10.1038/s41597-020-0557-9
- Data: doi:10.12751/g-node.be5e62
- Licence: CC0 1.0 (public domain dedication), per the publisher's record; not
  re-verified from this environment because gin.g-node.org was unreachable.

CC0 does not require attribution. The citation is kept because the label
boundaries and the structure names are that work, not this repository's.

## Where the bytes came from

The input files were retrieved from the TemplateFlow distribution of the
template (\`${BASE_URL}\`):

- Ciric R, Thompson WH, Lorenz R, et al. TemplateFlow: FAIR-sharing of
  multi-scale, multi-species brain models. *Nat Methods* 19:1568–1571 (2022).
  doi:10.1038/s41592-022-01681-2

The official download pages —
https://www.mcgill.ca/bic/icbm152-152-nonlinear-atlases-version-2009 and
https://doi.gin.g-node.org/10.12751/g-node.be5e62/ — could not be reached from
the build environment, so the inputs have **not** been compared byte for byte
with the publishers' own copies. What is pinned is the TemplateFlow copy:

| Input | SHA-256 |
| --- | --- |
${sourceRows}

\`scripts/build-mri-atlas.mjs\` refuses to build from a file whose hash differs.

## Modifications

The distributed files are not the originals. \`scripts/build-mri-atlas.mjs\`
made these changes and no others:

- **Reorientation.** Every volume is put in RAS+ voxel order (i to the
  subject's right, j anterior, k superior; i fastest) by flipping and permuting
  axes only. No interpolation or resampling. The inputs arrived as
  ${orientations}, so for these files the step changed nothing.
- **8-bit quantisation.** T1w and T2w intensities are mapped linearly from
  [0, the 99.9th percentile of in-head voxels] to 0–255; brighter voxels clip.
  The intensities are relative display values, not a physical quantity.
  ${quantised}
- **Label volume.** CerebrA labels are stored as one unsigned byte per voxel,
  values unchanged.
- **Mesh extraction.** Each label's voxel mask is lightly smoothed and turned
  into a closed triangle surface (surface nets), ${meshSummary} The level the
  surface is cut at is chosen per label so that the mesh encloses the same
  volume as the label's voxels, and the triangles are then simplified
  (quadric-error edge collapse). The surfaces are a rendering of the label
  volume, smoother than it and not more accurate than it; neighbouring
  surfaces do not share vertices and can overlap or gap by a fraction of a
  millimetre.
- **Measurements.** \`atlas.json\` adds, per label, the voxel count, centroid,
  bounding box, an interior point, and the side of the head the label was
  measured on. These are computed from the label volume; they are not part of
  CerebrA.

Skull and scalp are **not** removed.

## What this is not

The template is a **population average of 152 young adults**, not an
individual. No real person has this brain, and structures that vary between
people are blurred in it. The atlas labels are one group's parcellation of that
average. These files are for education — showing where structures are and how
they look on MRI — and are **not for diagnosis**, measurement, comparison with
a patient's scan, or operative planning.

## How this notice was prepared

The copyright notice is copied by the build script from the \`LICENSE\` input
file, not retyped. The citations are as given by the publishers; the CerebrA
licence is as described above. The decision to redistribute is an
**engineering assessment** of these terms, conditional on this notice staying
with the files. It is not legal advice and has not been reviewed by a lawyer.
`;
}

// ---------------------------------------------------------------------------
// build

function build(sourceDir) {
  const inputs = readSources(sourceDir);
  log('inputs: all six match their pinned sha256');

  // --- read, reorient, and insist on one grid
  const volumes = {};
  for (const key of ['t1', 't2', 'labels', 'brainMask']) {
    const raw = readNifti(inputs[key], SOURCES[key].file);
    const ras = reorientToRas(raw);
    assertGrid(ras);
    volumes[key] = ras;
    log(
      `  ${SOURCES[key].file}: ${raw.datatype}, ${raw.endian}-endian, sform ${raw.sformCode} / qform ${raw.qformCode},` +
        ` arrived ${ras.originalOrientation}${ras.originalOrientation === 'RAS' ? ' (already canonical)' : ' → reoriented to RAS'}`,
    );
  }
  const { dims, originMm: origin } = volumes.t1;
  const [nx, ny, nz] = dims;
  const voxelCount = nx * ny * nz;
  log(`grid: ${dims.join('×')} at 1 mm, origin (${origin.join(', ')}) mm, RAS+, identical for all four volumes`);

  // --- labels as bytes
  const labels = new Uint8Array(voxelCount);
  for (let n = 0; n < voxelCount; n += 1) {
    const value = volumes.labels.data[n];
    if (value !== Math.round(value) || value < 0 || value > LABEL_COUNT) fail(`label volume holds ${value}`);
    labels[n] = value;
  }
  const brainMask = new Uint8Array(voxelCount);
  for (let n = 0; n < voxelCount; n += 1) brainMask[n] = volumes.brainMask.data[n] > 0 ? 1 : 0;
  let labelledOutsideMask = 0;
  for (let n = 0; n < voxelCount; n += 1) if (labels[n] && !brainMask[n]) labelledOutsideMask += 1;

  // --- left and right, measured
  const table = parseLabelTable(inputs.labelTable);
  const stats = measureLabels(labels, dims, origin);
  const mm = (voxel) => voxel.map((value, a) => origin[a] + value);
  const structures = [];
  const disagreements = [];
  for (let label = 1; label <= LABEL_COUNT; label += 1) {
    const stat = stats[label];
    if (stat.voxels === 0) fail(`label ${label} (${table.get(label).name}) has no voxels`);
    const centroidVoxel = stat.sum.map((value) => value / stat.voxels);
    const centroidMm = mm(centroidVoxel);
    const measuredSide = centroidMm[0] > 0 ? 'R' : centroidMm[0] < 0 ? 'L' : 'midline';
    const row = table.get(label);
    if (measuredSide !== row.hemi) disagreements.push({ label, name: row.name, hemi: row.hemi, x: centroidMm[0] });
    structures.push({ ...row, stat, centroidVoxel, centroidMm, measuredSide });
  }
  const side = (wanted) => structures.filter((s) => s.measuredSide === wanted).map((s) => s.label);
  log('\nleft/right (RAS+: world x > 0 is the subject\'s RIGHT), by label centroid:');
  log(`  x > 0: ${compactRanges(side('R'))}`);
  log(`  x < 0: ${compactRanges(side('L'))}`);
  if (side('midline').length) log(`  x = 0: ${side('midline').join(', ')}`);
  const pairingProblems = [];
  for (let label = 1; label <= HEMI_OFFSET; label += 1) {
    const right = table.get(label);
    const left = table.get(label + HEMI_OFFSET);
    if (right.hemi !== 'R' || left.hemi !== 'L' || right.name !== left.name) {
      pairingProblems.push(`${label} (${right.name}, ${right.hemi}) / ${label + HEMI_OFFSET} (${left.name}, ${left.hemi})`);
    }
  }
  if (disagreements.length || pairingProblems.length) {
    for (const d of disagreements) {
      log(`  DISAGREE label ${d.label} ${d.name}: table says ${d.hemi}, centroid x = ${d.x.toFixed(2)} mm`);
    }
    for (const p of pairingProblems) log(`  PAIRING ${p}: not the same structure as R = n, L = n + ${HEMI_OFFSET}`);
    // Deliberately not repaired. Which of the two is wrong — the table, the
    // volume, or the orientation this script derived — is a question for a
    // person, and every downstream "left" would inherit a silent guess.
    fail('measured side and the label table DISAGREE; stopping without writing anything');
  }
  log(`  AGREE: all ${LABEL_COUNT} measured sides match the table's hemi column,`);
  log(`         and R = 1..${HEMI_OFFSET}, L = R + ${HEMI_OFFSET} with the same name, as the CerebrA paper states`);
  const onMidline = structures.filter((s) => s.stat.onMidline > 0);
  log(
    `  midline plane (x = 0, voxel column i = ${-origin[0]}): ${onMidline.reduce((n, s) => n + s.stat.onMidline, 0)} labelled voxels,` +
      ` all carrying ${[...new Set(onMidline.map((s) => s.hemi))].join('/')} labels`,
  );

  // --- intensity volumes
  const quantised = {};
  for (const key of ['t1', 't2']) {
    quantised[key] = quantiseIntensity(volumes[key], brainMask);
    const { intensityScale: scale, background } = quantised[key];
    log(
      `\n${key}: source ${scale.sourceRange.join('..')} (${scale.sourceLevelsUsed} levels used), p99.9 in head = ${scale.sourceMax} → 255;` +
        ` background ${background.zeroed ? `zeroed where ≤ ${background.noiseCeiling} and connected to the volume edge (${background.voxelsChanged} voxels changed)` : `LEFT AS IS (flood reached ${background.outsideVoxelsInBrainMask} brain-mask voxels)`}`,
    );
  }

  // --- interior points and meshes
  log('\nmeshes (grid mm | iso | verts extracted → kept | tris | volume ratio | Δ vertex centroid mm | Δ solid centroid mm | bbox escape mm):');
  const entries = [];
  const problems = [];
  let worstCentroid = { value: 0 };
  let worstEscape = { value: -Infinity };
  let worstSolid = { value: 0 };
  let ratioRange = [Infinity, -Infinity];
  for (const structure of structures) {
    const { stat, label, name } = structure;
    const interior = interiorPoint(labels, dims, stat, structure.centroidVoxel);
    const [ii, ij, ik] = interior.voxel;
    if (labels[ii + nx * (ij + ny * ik)] !== label) fail(`label ${label}: interior point is not inside the label`);
    structure.interior = interior;
    const centroidRounded = structure.centroidVoxel.map(Math.round);
    structure.centroidInside = labels[centroidRounded[0] + nx * (centroidRounded[1] + ny * centroidRounded[2])] === label;

    const mesh = buildMesh(labels, dims, origin, stat, FINE_MESH_NAMES.has(name));
    structure.mesh = mesh;
    const bboxMin = mm(stat.min);
    const bboxMax = mm(stat.max);
    const escape = Math.max(...[0, 1, 2].flatMap((a) => [bboxMin[a] - mesh.min[a], mesh.max[a] - bboxMax[a]]));
    const centroidDelta = Math.hypot(...mesh.centroid.map((value, a) => value - structure.centroidMm[a]));
    // The vertex centroid is what was asked for, but it is a weak instrument:
    // vertices crowd where the surface curves, so a sheet-like parcel reads
    // several millimetres off with nothing wrong. The centroid of the enclosed
    // solid is the quantity that should equal the voxel centroid.
    const solidDelta = Math.hypot(...mesh.solidCentroid.map((value, a) => value - structure.centroidMm[a]));
    structure.meshCheck = { escape, centroidDelta, solidDelta };
    const node = `cerebra-${label}`;
    log(
      `  ${node.padEnd(11)} ${name.padEnd(27)} ${structure.hemi} ${mesh.gridMm} | ${mesh.iso.toFixed(3)} | ${String(mesh.extractedVertices).padStart(5)} → ${String(mesh.vertexCount).padStart(4)} |` +
        ` ${String(mesh.triangleCount).padStart(5)} | ${mesh.volumeRatio.toFixed(3)} | ${centroidDelta.toFixed(2)} | ${solidDelta.toFixed(2)} |` +
        ` ${escape.toFixed(2)}${escape > BBOX_WARN_MM ? '  ← outside bbox ± 2 mm' : ''}`,
    );
    if (mesh.triangleCount === 0) problems.push(`${node}: empty mesh`);
    else if (!(mesh.volume > 0)) problems.push(`${node}: signed volume ${mesh.volume} (winding is inward)`);
    if (escape > BBOX_FAIL_MM) problems.push(`${node}: mesh leaves the label bbox by ${escape.toFixed(2)} mm`);
    if (mesh.unmatchedEdges) problems.push(`${node}: ${mesh.unmatchedEdges} unmatched edges (not watertight)`);
    if (mesh.volumeRatio < 0.8 || mesh.volumeRatio > 1.15) {
      problems.push(`${node}: mesh volume is ${mesh.volumeRatio.toFixed(3)} × the voxel volume (expected 0.8–1.15)`);
    }
    if (solidDelta > 1) problems.push(`${node}: centroid of the enclosed solid is ${solidDelta.toFixed(2)} mm from the voxel centroid`);
    if (centroidDelta > worstCentroid.value) worstCentroid = { value: centroidDelta, node, name };
    if (solidDelta > worstSolid.value) worstSolid = { value: solidDelta, node, name };
    if (escape > worstEscape.value) worstEscape = { value: escape, node, name };
    ratioRange = [Math.min(ratioRange[0], mesh.volumeRatio), Math.max(ratioRange[1], mesh.volumeRatio)];
    entries.push({ node, mesh, extras: { cerebraLabel: label, name, hemi: structure.hemi } });
  }
  const totalTriangles = entries.reduce((n, e) => n + e.mesh.triangleCount, 0);
  const totalVertices = entries.reduce((n, e) => n + e.mesh.vertexCount, 0);
  const glb = writeGlb(entries);
  log(`\nGLB: ${entries.length} meshes, ${totalVertices} vertices, ${totalTriangles} triangles, ${glb.length} bytes`);
  log(`  volume ratio mesh/voxels: ${ratioRange[0].toFixed(3)} .. ${ratioRange[1].toFixed(3)}`);
  log(`  worst vertex-centroid vs voxel-centroid: ${worstCentroid.value.toFixed(2)} mm (${worstCentroid.node} ${worstCentroid.name})`);
  log(`  worst solid-centroid vs voxel-centroid: ${worstSolid.value.toFixed(2)} mm (${worstSolid.node} ${worstSolid.name})`);
  log(`  worst bbox escape: ${worstEscape.value.toFixed(2)} mm (${worstEscape.node} ${worstEscape.name})`);
  const centroidOutside = structures.filter((s) => !s.centroidInside);
  log(`  centroid falls outside its own label for ${centroidOutside.length} labels (why interiorPointMm exists): ${centroidOutside.map((s) => s.label).join(', ')}`);
  if (totalTriangles > TRIANGLE_BUDGET) problems.push(`${totalTriangles} triangles exceeds the budget of ${TRIANGLE_BUDGET}`);
  if (glb.length > GLB_BUDGET_BYTES) problems.push(`cerebra.glb is ${glb.length} bytes, over the ${GLB_BUDGET_BYTES} budget`);
  if (problems.length) fail(`mesh validation failed:\n  ${problems.join('\n  ')}`);

  // --- atlas.json
  const volumeEntry = (file, bytes, extra) => ({ file, sha256: sha256(bytes), bytes: bytes.length, encoding: 'gzip', dtype: 'uint8', ...extra });
  const atlas = {
    schema: 1,
    grid: {
      dims,
      originMm: origin,
      spacingMm: [1, 1, 1],
      orientation: 'RAS+',
      order: 'x-fastest',
    },
    volumes: {
      t1: volumeEntry('t1.u8.gz', quantised.t1.bytes, {
        intensityScale: quantised.t1.intensityScale,
        background: quantised.t1.background,
      }),
      t2: volumeEntry('t2.u8.gz', quantised.t2.bytes, {
        intensityScale: quantised.t2.intensityScale,
        background: quantised.t2.background,
      }),
      labels: volumeEntry('labels.u8.gz', labels, {
        labelRange: [0, LABEL_COUNT],
        labelledVoxels: structures.reduce((n, s) => n + s.stat.voxels, 0),
        labelledVoxelsOutsideBrainMask: labelledOutsideMask,
      }),
    },
    surface: {
      file: 'cerebra.glb',
      sha256: sha256(glb),
      bytes: glb.length,
      meshes: entries.length,
      vertices: totalVertices,
      triangles: totalTriangles,
      units: 'mm',
      frame: 'MNI RAS+ (x right, y anterior, z superior); not rotated into a y-up viewer frame',
      winding: 'counter-clockwise seen from outside',
    },
    // The sides are measured, not copied: `hemi` is the atlas's own table,
    // `measuredSide` is the sign of the centroid's x. The build stops if they differ.
    sides: {
      convention: 'RAS+: x > 0 mm is the subject\'s right',
      rightLabels: [1, HEMI_OFFSET],
      leftLabels: [HEMI_OFFSET + 1, LABEL_COUNT],
      leftIsRightPlus: HEMI_OFFSET,
      midlinePlaneVoxelsBelongTo: [...new Set(onMidline.map((s) => s.hemi))].join('/'),
      note: 'Midline structures (third and fourth ventricle, brainstem, vermal lobules, optic chiasm) are also split into an R and an L label at x = 0; the x = 0 voxel plane itself carries the R label.',
    },
    sources: Object.values(SOURCES).map((source) => ({ file: source.file, url: BASE_URL + source.file, sha256: source.sha256 })),
    structures: structures.map((s) => ({
      label: s.label,
      name: s.name,
      hemi: s.hemi,
      measuredSide: s.measuredSide,
      voxels: s.stat.voxels,
      volumeMm3: s.stat.voxels,
      centroidMm: s.centroidMm.map((value) => round(value, 2)),
      centroidInsideLabel: s.centroidInside,
      interiorPointMm: mm(s.interior.voxel),
      interiorDepthMm: round(s.interior.depthMm, 2),
      // Voxel CENTRES; the voxels themselves reach 0.5 mm further each way.
      bboxMm: { min: mm(s.stat.min), max: mm(s.stat.max) },
      mesh: {
        node: `cerebra-${s.label}`,
        vertices: s.mesh.vertexCount,
        triangles: s.mesh.triangleCount,
        gridMm: s.mesh.gridMm,
        isoLevel: round(s.mesh.iso, 4),
        volumeRatio: round(s.mesh.volumeRatio, 3),
        solidCentroidOffsetMm: round(s.meshCheck.solidDelta, 2),
      },
    })),
  };

  // --- ATTRIBUTION.md
  const fineLabels = entries.filter((e) => e.mesh.gridMm === 1).length;
  const arrived = [...new Set(Object.values(volumes).map((v) => v.originalOrientation))];
  const backgroundSentence = ['t1', 't2'].every((key) => quantised[key].background.zeroed)
    ? 'Low-level noise in the air around the head is set to zero where it is at or\n  below the noise ceiling of that volume and connected to the edge of the\n  volume; no voxel inside the brain mask is touched by this.'
    : 'Background noise outside the head is left as distributed.';
  const attribution = attributionMarkdown({
    licenseText: inputs.license.toString('utf8'),
    hashes: Object.fromEntries(Object.values(SOURCES).map((source) => [source.file, source.sha256])),
    orientations: arrived.length === 1 ? `${arrived[0]}+` : arrived.join(', '),
    quantised: backgroundSentence,
    meshSummary: `on the 1 mm grid for the\n  ${fineLabels} deep labels (nuclei, ventricles, brainstem, vermis, cerebellar white\n  matter) and on a 2 mm grid for the other ${entries.length - fineLabels}.`,
  });

  return new Map([
    ['t1.u8.gz', { raw: Buffer.from(quantised.t1.bytes), gzip: true }],
    ['t2.u8.gz', { raw: Buffer.from(quantised.t2.bytes), gzip: true }],
    ['labels.u8.gz', { raw: Buffer.from(labels), gzip: true }],
    ['cerebra.glb', { raw: glb, gzip: false }],
    ['atlas.json', { raw: Buffer.from(`${JSON.stringify(atlas, null, 1)}\n`, 'utf8'), gzip: false }],
    ['ATTRIBUTION.md', { raw: Buffer.from(attribution, 'utf8'), gzip: false }],
  ]);
}

function compactRanges(numbers) {
  const parts = [];
  for (let n = 0; n < numbers.length; n += 1) {
    let end = n;
    while (end + 1 < numbers.length && numbers[end + 1] === numbers[end] + 1) end += 1;
    parts.push(end > n ? `${numbers[n]}–${numbers[end]}` : `${numbers[n]}`);
    n = end;
  }
  return `${parts.join(', ')} (${numbers.length} labels)`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const started = Date.now();
  let sourceDir = args.src;
  if (args.fetch) {
    log(`fetching into ${path.relative(REPO_ROOT, CACHE_DIR) || CACHE_DIR}`);
    await fetchSources(CACHE_DIR);
    sourceDir = CACHE_DIR;
  }
  const outputs = build(sourceDir);

  if (args.check) {
    const differing = [];
    for (const [file, { raw, gzip }] of outputs) {
      const target = path.join(args.out, file);
      if (!fs.existsSync(target)) {
        differing.push(`${file}: missing`);
        continue;
      }
      const onDisk = fs.readFileSync(target);
      // Decompressed, so that a different zlib is not reported as different data.
      const committed = gzip ? zlib.gunzipSync(onDisk) : onDisk;
      if (!committed.equals(raw)) differing.push(`${file}: differs (sha256 ${sha256(committed)} on disk, ${sha256(raw)} rebuilt)`);
    }
    if (differing.length) fail(`committed outputs in ${args.out} are not what this script builds:\n  ${differing.join('\n  ')}`);
    log(`\ncheck: all ${outputs.size} outputs in ${path.relative(REPO_ROOT, args.out)} match a fresh build`);
  } else {
    fs.mkdirSync(args.out, { recursive: true });
    log(`\nwrote to ${path.relative(REPO_ROOT, args.out) || args.out}:`);
    for (const [file, { raw, gzip }] of outputs) {
      const bytes = gzip ? zlib.gzipSync(raw, { level: GZIP_LEVEL }) : raw;
      fs.writeFileSync(path.join(args.out, file), bytes);
      log(`  ${file.padEnd(15)} ${String(bytes.length).padStart(9)} bytes${gzip ? ` (${raw.length} decompressed)` : ''}`);
    }
  }
  log(`done in ${((Date.now() - started) / 1000).toFixed(1)} s`);
}

main().catch((error) => {
  if (error instanceof BuildError) {
    console.error(`\nbuild-mri-atlas: ${error.message}`);
  } else {
    console.error(error);
  }
  process.exit(1);
});
