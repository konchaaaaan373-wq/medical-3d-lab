#!/usr/bin/env node
/**
 * Draco-compress the repaired heart files, and prove what moved.
 *
 *   npm i --no-save @gltf-transform/core@4.5.0 @gltf-transform/extensions@4.5.0 \
 *     @gltf-transform/functions@4.5.0 draco3dgltf@1.5.7 gltf-validator@2.0.0-dev.3.10
 *   npm run assets:repair            # dev-assets/derived/heart/*.glb
 *   npm run assets:compress          # dev-assets/compressed/heart/*.glb + the measurement
 *   npm run assets:compress:verify   # the same, twice, and fails unless it reproduces
 *
 * ## Why
 *
 * The two heart files shipped as plain float geometry: 4.07 MB + 2.84 MB, the
 * largest thing any published page downloads. On a 9 Mbps link that is six
 * seconds of the reader watching a progress bar (F-210). Draco brings them to
 * about 0.42 + 0.43 MB.
 *
 * ## What it is allowed to change
 *
 * Draco stores positions and normals **quantized**, so vertices move. That is
 * the whole cost, and it is measured here rather than argued: every decoded
 * vertex is matched to the nearest vertex of the repaired file and the
 * distance is reported. At 14 bits across a 12 cm organ a step is about 7 µm;
 * a pixel of the heart filling a 800 px viewport is about 150 µm. The gate
 * below is 50 µm — a third of a pixel at that size — and a run over it fails.
 *
 * Nothing else may move: node names (which carry the ontology ids the scene
 * names parts by), hierarchy, extras, materials, and the set of meshes. Those
 * are compared as data, and any difference fails.
 *
 * Unused vertices are dropped by the encoder and vertex order changes; neither
 * is drawn, and the scene addresses structures by node name, never by vertex
 * index.
 *
 * ## Reproducible, like the repair before it
 *
 * The settings are fixed here, the tool versions are pinned above and in the
 * asset manifest, and `--verify` runs the compression twice and requires the
 * same bytes. The input is the repair's output, whose own `--verify` pins it
 * to the upstream sources — so the shipped hash is reachable from HuBMAP's
 * files by two commands.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { edgeClasses, isClosedManifold, signedVolume } from './lib/mesh-metrics.mjs';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const VERIFY = process.argv.includes('--verify');
const FILES = ['heart/VH_M_Heart.glb', 'heart/VH_M_Blood_Vasculature.glb'];
const INPUT = join(ROOT, 'dev-assets/derived');
const OUTPUT = join(ROOT, 'dev-assets/compressed');
const REPORT = join(ROOT, 'docs/asset-qa/measurements/draco-compression.json');

/** The encoder settings. Changing any of them changes the shipped hash. */
export const DRACO_SETTINGS = Object.freeze({
  method: 'edgebreaker',
  encodeSpeed: 5,
  decodeSpeed: 5,
  quantizePosition: 14,
  quantizeNormal: 10,
  quantizeColor: 8,
  quantizeTexcoord: 12,
  quantizeGeneric: 12,
  quantizationVolume: 'mesh',
});

/** The largest distance a decoded vertex may sit from the repaired surface. */
export const MAX_POSITION_ERROR_M = 50e-6;

/** The p99 angle a decoded normal may differ from its original by. */
export const MAX_NORMAL_P99_DEG = 1;

/** How far to look for a decoded vertex's original, for comparing normals. */
const NORMAL_MATCH_RADIUS_M = 30e-6;

const TOOLS = '@gltf-transform/core@4.5.0 @gltf-transform/extensions@4.5.0 @gltf-transform/functions@4.5.0 draco3dgltf@1.5.7 gltf-validator@2.0.0-dev.3.10';

let core, extensions, functions, draco3d, validator;
try {
  core = await import('@gltf-transform/core');
  extensions = await import('@gltf-transform/extensions');
  functions = await import('@gltf-transform/functions');
  draco3d = (await import('draco3dgltf')).default;
  validator = await import('gltf-validator');
} catch {
  console.error(`The compression tools are not installed (deliberately not dependencies):\n\n  npm i --no-save ${TOOLS}\n`);
  process.exit(1);
}

const io = new core.NodeIO()
  .registerExtensions(extensions.ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  });

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function compress(file) {
  const doc = await io.readBinary(new Uint8Array(readFileSync(join(INPUT, file))));
  await doc.transform(functions.draco(DRACO_SETTINGS));
  return io.writeBinary(doc);
}

/** Everything the scene reads besides geometry, as comparable data. */
function structureOf(doc) {
  const root = doc.getRoot();
  const parentOf = new Map();
  for (const node of root.listNodes()) for (const child of node.listChildren()) parentOf.set(child, node.getName());
  return root.listNodes().map((node) => ({
    name: node.getName(),
    parent: parentOf.get(node) ?? null,
    extras: node.getExtras(),
    translation: node.getTranslation(),
    rotation: node.getRotation(),
    scale: node.getScale(),
    mesh: node.getMesh()
      ? node.getMesh().listPrimitives().map((prim) => ({
          material: prim.getMaterial()?.getName() ?? null,
          attributes: prim.listSemantics().sort(),
        }))
      : null,
  }));
}

/** World-space positions and normals of every mesh node, by node name. */
function geometryOf(doc) {
  const out = new Map();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    const positions = [];
    const normals = [];
    const tris = [];
    let triangles = 0;
    for (const prim of mesh.listPrimitives()) {
      const position = prim.getAttribute('POSITION');
      const normal = prim.getAttribute('NORMAL');
      const index = prim.getIndices();
      triangles += (index ? index.getCount() : position.getCount()) / 3;
      const v = [0, 0, 0];
      const n = [0, 0, 0];
      const base = positions.length / 3;
      for (let i = 0; i < position.getCount(); i += 1) {
        position.getElement(i, v);
        positions.push(
          m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
          m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
          m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]
        );
        if (normal) {
          normal.getElement(i, n);
          const x = m[0] * n[0] + m[4] * n[1] + m[8] * n[2];
          const y = m[1] * n[0] + m[5] * n[1] + m[9] * n[2];
          const z = m[2] * n[0] + m[6] * n[1] + m[10] * n[2];
          const l = Math.hypot(x, y, z) || 1;
          normals.push(x / l, y / l, z / l);
        }
      }
      const vertex = (k) => positions.slice((base + k) * 3, (base + k) * 3 + 3);
      const count = index ? index.getCount() : position.getCount();
      for (let t = 0; t < count; t += 3) {
        const at = (k) => (index ? index.getScalar(t + k) : t + k);
        tris.push([vertex(at(0)), vertex(at(1)), vertex(at(2))]);
      }
    }
    out.set(node.getName(), { positions, normals, triangles, volumeMl: signedVolume(tris) * 1e6, closed: isClosedManifold(edgeClasses(tris)) });
  }
  return out;
}

/**
 * For every decoded vertex, the distance to the nearest repaired vertex, and
 * the smallest angle between its normal and the normals of every repaired
 * vertex within `NORMAL_MATCH_RADIUS_M`.
 *
 * Not "the normal of the nearest vertex": the valves and the atrial walls are
 * thin sheets whose two faces lie microns apart, so once quantization has
 * moved a vertex its nearest neighbour is as likely to be the back face as its
 * own original — which measured the heart's normals as 87° off at p99 when
 * the winding test showed them agreeing with their faces on both sides. The
 * radius is two quantization steps of the largest mesh, so the vertex's own
 * original is always among the candidates.
 */
function deviation(before, after) {
  const cell = 0.0005;
  let worst = 0;
  let sum = 0;
  let count = 0;
  let worstAngle = 0;
  const angles = [];
  for (const [name, b] of after) {
    const a = before.get(name);
    const grid = new Map();
    const key = (x, y, z) => `${x},${y},${z}`;
    const p = a.positions;
    for (let i = 0; i < p.length; i += 3) {
      const k = key(Math.floor(p[i] / cell), Math.floor(p[i + 1] / cell), Math.floor(p[i + 2] / cell));
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(i);
    }
    const q = b.positions;
    for (let i = 0; i < q.length; i += 3) {
      const cx = Math.floor(q[i] / cell);
      const cy = Math.floor(q[i + 1] / cell);
      const cz = Math.floor(q[i + 2] / cell);
      let best = Infinity;
      const near = [];
      for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
        for (const j of grid.get(key(cx + dx, cy + dy, cz + dz)) ?? []) {
          const d = Math.hypot(p[j] - q[i], p[j + 1] - q[i + 1], p[j + 2] - q[i + 2]);
          if (d < best) best = d;
          if (d <= NORMAL_MATCH_RADIUS_M) near.push(j);
        }
      }
      worst = Math.max(worst, best);
      sum += best;
      count += 1;
      if (b.normals.length && a.normals.length) {
        let angle = Infinity;
        for (const j of near) {
          const dot = a.normals[j] * b.normals[i] + a.normals[j + 1] * b.normals[i + 1] + a.normals[j + 2] * b.normals[i + 2];
          angle = Math.min(angle, (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI);
        }
        if (Number.isFinite(angle)) { angles.push(angle); worstAngle = Math.max(worstAngle, angle); }
      }
    }
  }
  angles.sort((x, y) => x - y);
  return {
    vertices: count,
    maxPositionErrorUm: Number((worst * 1e6).toFixed(2)),
    meanPositionErrorUm: Number(((sum / count) * 1e6).toFixed(3)),
    normalAngleP99Deg: Number(angles[Math.floor(angles.length * 0.99)].toFixed(3)),
    normalAngleMaxDeg: Number(worstAngle.toFixed(3)),
  };
}

const failures = [];
const report = {
  generatedBy: 'scripts/compress-heart-assets.mjs',
  tools: TOOLS,
  settings: DRACO_SETTINGS,
  gate: { maxPositionErrorUm: MAX_POSITION_ERROR_M * 1e6, maxNormalP99Deg: MAX_NORMAL_P99_DEG },
  files: [],
};

for (const file of FILES) {
  const inputBytes = readFileSync(join(INPUT, file));
  const output = await compress(file);
  if (VERIFY) {
    const again = await compress(file);
    if (sha256(again) !== sha256(output)) failures.push(`${file}: a second run produced different bytes`);
  }
  mkdirSync(dirname(join(OUTPUT, file)), { recursive: true });
  writeFileSync(join(OUTPUT, file), output);

  const before = await io.readBinary(new Uint8Array(inputBytes));
  const after = await io.readBinary(output);
  if (JSON.stringify(structureOf(before)) !== JSON.stringify(structureOf(after))) {
    failures.push(`${file}: node names, hierarchy, extras, transforms or materials changed`);
  }
  const geometryBefore = geometryOf(before);
  const geometryAfter = geometryOf(after);
  const triangles = (g) => [...g.values()].reduce((sum, entry) => sum + entry.triangles, 0);
  const measured = deviation(geometryBefore, geometryAfter);
  if (measured.maxPositionErrorUm > MAX_POSITION_ERROR_M * 1e6) {
    failures.push(`${file}: a vertex moved ${measured.maxPositionErrorUm} µm, over the ${MAX_POSITION_ERROR_M * 1e6} µm gate`);
  }
  // The chamber volumes the reader is shown (`src/data/heartAnatomy.js`,
  // `enclosedMl`) are measured from these surfaces and printed to 0.1 mL.
  // Quantization must not move one of them by a printed digit.
  const volumes = [...geometryBefore].map(([name, before]) => ({
    name,
    closed: before.closed,
    beforeMl: Number(before.volumeMl.toFixed(3)),
    afterMl: Number(geometryAfter.get(name).volumeMl.toFixed(3)),
  }));
  // Whether a surface is closed is shown to the reader too (`closed` in the
  // adapter), so a vertex merged or split by quantization must not flip it.
  for (const [name, before] of geometryBefore) {
    if (before.closed !== geometryAfter.get(name).closed) {
      failures.push(`${file}: ${name} was ${before.closed ? '' : 'not '}closed and manifold before and is ${geometryAfter.get(name).closed ? '' : 'not '}after`);
    }
  }
  for (const v of volumes) {
    if (v.beforeMl.toFixed(1) !== v.afterMl.toFixed(1)) {
      failures.push(`${file}: ${v.name} encloses ${v.beforeMl.toFixed(1)} mL before and ${v.afterMl.toFixed(1)} mL after`);
    }
  }
  if (measured.normalAngleP99Deg > MAX_NORMAL_P99_DEG) {
    failures.push(`${file}: normals differ by ${measured.normalAngleP99Deg}° at p99, over the ${MAX_NORMAL_P99_DEG}° gate`);
  }
  const validation = await validator.validateBytes(new Uint8Array(output));
  const { numErrors, numWarnings, numInfos } = validation.issues;
  if (numErrors || numWarnings) failures.push(`${file}: validator reports ${numErrors} errors and ${numWarnings} warnings`);

  report.files.push({
    file,
    input: { sha256: sha256(inputBytes), bytes: inputBytes.length },
    output: { sha256: sha256(output), bytes: output.length },
    meshNodes: geometryAfter.size,
    trianglesBefore: triangles(geometryBefore),
    trianglesAfter: triangles(geometryAfter),
    structureUnchanged: !failures.some((f) => f.startsWith(`${file}: node names`)),
    ...measured,
    maxVolumeChangeMl: Number(Math.max(...volumes.map((v) => Math.abs(v.afterMl - v.beforeMl))).toFixed(3)),
    volumes,
    validator: { version: validation.validatorVersion, errors: numErrors, warnings: numWarnings, infos: numInfos },
  });
  const row = report.files.at(-1);
  console.log(
    `${file}: ${(row.input.bytes / 1e6).toFixed(2)} → ${(row.output.bytes / 1e6).toFixed(2)} MB, ` +
      `max ${row.maxPositionErrorUm} µm, normals p99 ${row.normalAngleP99Deg}°, ` +
      `triangles ${row.trianglesBefore} → ${row.trianglesAfter}, validator ${numErrors}/${numWarnings}, ${row.output.sha256.slice(0, 16)}…`
  );
}

writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
if (failures.length) {
  console.error(`\nnot accepted:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(VERIFY ? '\nreproducible, structure unchanged, within the position gate, validator clean.' : `\nwritten to ${OUTPUT}`);
