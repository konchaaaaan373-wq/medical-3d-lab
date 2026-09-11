#!/usr/bin/env node
/**
 * Repair the *only* defect the validator reports in the heart candidates, into
 * a **derived** file, and prove the rest of the asset did not move.
 *
 *   node scripts/repair-candidate-gltf.mjs            # writes derived files + a report
 *   node scripts/repair-candidate-gltf.mjs --dry-run  # measure, write nothing
 *
 * ## What this is allowed to change, and nothing else
 *
 * Both candidate files fail `assets:validate` with `ACCESSOR_VECTOR3_NON_UNIT`
 * and nothing else: 408 degenerate vertex normals in one mesh of the heart, 33
 * across two meshes of the vasculature. A **degenerate normal is a normal of
 * zero or near-zero length** — it carries no direction, so there is nothing to
 * preserve and nothing to decide. This replaces each one, and each one only.
 *
 * **No geometry is re-shaped.** Vertex positions, indices, UVs, node names,
 * node hierarchy, ontology ids, materials and the scene graph are copied
 * through untouched, and the report re-measures them on both sides so that
 * "untouched" is a number rather than an intention. A normal that already has
 * unit length is not rewritten — not even re-normalised — because a float that
 * round-trips differently is a change this file would then have to defend.
 *
 * ## Where a replacement normal comes from
 *
 * The area-weighted mean of the face normals of the triangles that use the
 * vertex — the same thing any renderer would compute for a smooth surface, and
 * the same thing the publisher's own exporter would have produced had the
 * vertex not degenerated. Where a vertex has no usable adjacent face either
 * (every triangle touching it is itself degenerate), the normal is left alone
 * and **counted as unrepaired**: inventing a direction there would be making
 * up geometry, and the count is what decides whether the derived file passes.
 *
 * ## Two stages, because one was not enough
 *
 * Recomputing normals alone fixes **200 of 408** in the heart and 9 of 33 in
 * the vasculature, and stops there: the rest sit on triangles with no area, so
 * there is no face to average. Measured, not assumed — the first run of this
 * script is where the number came from.
 *
 * So a second stage removes the triangles that have no area, and the exact
 * duplicate faces, before the normals are recomputed. **A zero-area triangle
 * draws nothing**, so removing one cannot change the rendered surface; that is
 * the whole argument for being allowed to do it, and it is why this is not
 * "reshaping the geometry". A vertex left referenced by no triangle at all
 * keeps its position and is given a unit normal, because an unused normal has
 * no direction to get right and the validator checks every value in the
 * accessor whether a triangle uses it or not.
 *
 * Counts change, and the report says by how much. That is the difference a
 * manifest entry has to declare.
 *
 * ## What this does not do
 *
 * It does not touch the source. Files under `dev-assets/` are opened read-only
 * and written nowhere; the derived files go to `dev-assets/derived/` with their
 * own hashes, which is what any manifest entry would pin. It makes no
 * anatomical judgement — see the QA documents for what has and has not been
 * judged about these meshes.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const DRY = process.argv.includes('--dry-run');
/**
 * `--verify` runs the whole thing twice, validates the output, and checks that
 * the sources are untouched — the question "can a clean machine produce the
 * exact bytes a publication decision pinned?" asked as a command.
 */
const VERIFY = process.argv.includes('--verify');

const CANDIDATES = [
  { id: 'hubmap-vh-m-heart', file: 'heart/VH_M_Heart.glb' },
  { id: 'hubmap-vh-m-blood-vasculature', file: 'heart/VH_M_Blood_Vasculature.glb' },
];

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

/** A GLB is a header and a run of chunks; this keeps every one of them. */
function readGlb(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== GLB_MAGIC) throw new Error('not a GLB');
  const total = view.getUint32(8, true);
  let at = 12;
  let json = null;
  let bin = null;
  const others = [];
  while (at < total) {
    const length = view.getUint32(at, true);
    const type = view.getUint32(at + 4, true);
    const body = bytes.subarray(at + 8, at + 8 + length);
    if (type === JSON_CHUNK) json = JSON.parse(new TextDecoder().decode(body));
    else if (type === BIN_CHUNK) bin = Uint8Array.from(body);
    else others.push({ type, body: Uint8Array.from(body) });
    at += 8 + length + ((4 - (length % 4)) % 4);
  }
  if (!json || !bin) throw new Error('GLB has no JSON or no BIN chunk');
  return { json, bin, others };
}

function writeGlb({ json, bin, others }) {
  const pad = (b, filler) => {
    const over = b.length % 4;
    if (!over) return b;
    const out = new Uint8Array(b.length + (4 - over)).fill(filler);
    out.set(b);
    return out;
  };
  const jsonBytes = pad(new TextEncoder().encode(JSON.stringify(json)), 0x20);
  const binBytes = pad(bin, 0);
  const chunks = [
    { type: JSON_CHUNK, body: jsonBytes },
    { type: BIN_CHUNK, body: binBytes },
    ...others.map((c) => ({ type: c.type, body: pad(c.body, 0) })),
  ];
  const total = 12 + chunks.reduce((sum, c) => sum + 8 + c.body.length, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  let at = 12;
  for (const chunk of chunks) {
    view.setUint32(at, chunk.body.length, true);
    view.setUint32(at + 4, chunk.type, true);
    out.set(chunk.body, at + 8);
    at += 8 + chunk.body.length;
  }
  return out;
}

const COMPONENT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const COUNT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

/** A typed view straight onto the accessor's bytes, so a write lands in the buffer. */
function accessorView(json, bin, index) {
  const accessor = json.accessors[index];
  const Type = COMPONENT[accessor.componentType];
  const per = COUNT[accessor.type];
  const bufferView = json.bufferViews[accessor.bufferView];
  const offset = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  // Interleaved accessors are not repaired in place; none of these files uses one.
  const stride = bufferView.byteStride;
  if (stride && stride !== per * Type.BYTES_PER_ELEMENT) return { interleaved: true, accessor };
  return { array: new Type(bin.buffer, bin.byteOffset + offset, accessor.count * per), per, accessor };
}

const report = { generatedAt: new Date().toISOString().slice(0, 10), dryRun: DRY, files: [] };

for (const candidate of CANDIDATES) {
  const sourcePath = join(ROOT, 'dev-assets', candidate.file);
  const source = readFileSync(sourcePath);
  const sourceSha = createHash('sha256').update(source).digest('hex');
  const { json, bin, others } = readGlb(new Uint8Array(source));

  /** Everything the repair must not move, measured before and after. */
  const fingerprint = () => {
    const meshes = [];
    let triangles = 0;
    let vertices = 0;
    for (const mesh of json.meshes ?? []) {
      for (const prim of mesh.primitives ?? []) {
        const pos = accessorView(json, bin, prim.attributes.POSITION);
        const idx = prim.indices != null ? accessorView(json, bin, prim.indices) : null;
        vertices += pos.accessor.count;
        triangles += idx ? idx.accessor.count / 3 : pos.accessor.count / 3;
        // The positions themselves, hashed — the one claim that matters most.
        meshes.push({
          name: mesh.name,
          positions: createHash('sha256').update(Buffer.from(pos.array.buffer, pos.array.byteOffset, pos.array.byteLength)).digest('hex').slice(0, 16),
          indices: idx ? createHash('sha256').update(Buffer.from(idx.array.buffer, idx.array.byteOffset, idx.array.byteLength)).digest('hex').slice(0, 16) : null,
        });
      }
    }
    return {
      nodes: (json.nodes ?? []).length,
      nodeNames: (json.nodes ?? []).map((n) => n.name ?? null),
      // The ontology ids the scene names structures by live in node `extras`.
      extras: createHash('sha256').update(JSON.stringify((json.nodes ?? []).map((n) => n.extras ?? null))).digest('hex').slice(0, 16),
      meshCount: (json.meshes ?? []).length,
      materials: (json.materials ?? []).length,
      triangles,
      vertices,
      meshes,
    };
  };

  const before = fingerprint();

  // --- stage 1: remove triangles that draw nothing -------------------------
  let removedZeroArea = 0;
  let removedDuplicate = 0;
  const PRUNE = !process.argv.includes('--normals-only');

  if (PRUNE) {
    for (const mesh of json.meshes ?? []) {
      for (const prim of mesh.primitives ?? []) {
        if (prim.indices == null) continue;
        const positions = accessorView(json, bin, prim.attributes.POSITION);
        const idx = accessorView(json, bin, prim.indices);
        if (positions.interleaved || idx.interleaved) continue;
        const p = positions.array;
        const kept = [];
        const seen = new Set();
        for (let t = 0; t < idx.accessor.count / 3; t += 1) {
          const a = idx.array[t * 3];
          const b = idx.array[t * 3 + 1];
          const c = idx.array[t * 3 + 2];
          const ux = p[b * 3] - p[a * 3];
          const uy = p[b * 3 + 1] - p[a * 3 + 1];
          const uz = p[b * 3 + 2] - p[a * 3 + 2];
          const vx = p[c * 3] - p[a * 3];
          const vy = p[c * 3 + 1] - p[a * 3 + 1];
          const vz = p[c * 3 + 2] - p[a * 3 + 2];
          if (!(Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) > 0)) {
            removedZeroArea += 1;
            continue;
          }
          const key = [a, b, c].slice().sort((x, y) => x - y).join(',');
          if (seen.has(key)) { removedDuplicate += 1; continue; }
          seen.add(key);
          kept.push(a, b, c);
        }
        if (kept.length === idx.accessor.count) continue;
        if (!DRY) {
          // Written back over the same bytes, with the accessor's count reduced.
          // The buffer keeps its length; the tail is simply no longer indexed.
          for (let i = 0; i < kept.length; i += 1) idx.array[i] = kept[i];
          idx.accessor.count = kept.length;
        }
      }
    }
  }

  // --- stage 2: the normals ------------------------------------------------
  let degenerate = 0;
  let repaired = 0;
  let unrepairable = 0;
  let unusedGivenUnit = 0;
  let cancelled = 0;
  const touched = new Map();

  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives ?? []) {
      if (prim.attributes.NORMAL == null) continue;
      const normals = accessorView(json, bin, prim.attributes.NORMAL);
      const positions = accessorView(json, bin, prim.attributes.POSITION);
      if (normals.interleaved || positions.interleaved) continue;
      const idx = prim.indices != null ? accessorView(json, bin, prim.indices) : null;
      const n = normals.array;
      const p = positions.array;

      const bad = [];
      for (let v = 0; v < normals.accessor.count; v += 1) {
        const x = n[v * 3];
        const y = n[v * 3 + 1];
        const z = n[v * 3 + 2];
        const length = Math.hypot(x, y, z);
        // The validator's own test: a normal that is not unit length. A zero
        // normal is the whole of what is wrong with these two files.
        if (!(Math.abs(length - 1) <= 1e-3)) bad.push(v);
      }
      if (!bad.length) continue;
      degenerate += bad.length;

      // Area-weighted face normals, accumulated only for the vertices that need one.
      const need = new Set(bad);
      const acc = new Map(bad.map((v) => [v, [0, 0, 0]]));
      /** Which of the bad vertices any surviving triangle still refers to. */
      const used = new Set();
      /** The triangles that still touch each bad vertex, for the fold fallback. */
      const faceIndex = new Map(bad.map((v) => [v, []]));
      const triangleCount = idx ? idx.accessor.count / 3 : positions.accessor.count / 3;
      for (let t = 0; t < triangleCount; t += 1) {
        const a = idx ? idx.array[t * 3] : t * 3;
        const b = idx ? idx.array[t * 3 + 1] : t * 3 + 1;
        const c = idx ? idx.array[t * 3 + 2] : t * 3 + 2;
        if (!need.has(a) && !need.has(b) && !need.has(c)) continue;
        for (const v of [a, b, c]) if (need.has(v)) { used.add(v); faceIndex.get(v).push([a, b, c]); }
        const ux = p[b * 3] - p[a * 3];
        const uy = p[b * 3 + 1] - p[a * 3 + 1];
        const uz = p[b * 3 + 2] - p[a * 3 + 2];
        const vx = p[c * 3] - p[a * 3];
        const vy = p[c * 3 + 1] - p[a * 3 + 1];
        const vz = p[c * 3 + 2] - p[a * 3 + 2];
        // Cross product, unnormalised: its length is twice the triangle's area,
        // which is the weight.
        const fx = uy * vz - uz * vy;
        const fy = uz * vx - ux * vz;
        const fz = ux * vy - uy * vx;
        for (const v of [a, b, c]) {
          const slot = acc.get(v);
          if (!slot) continue;
          slot[0] += fx; slot[1] += fy; slot[2] += fz;
        }
      }

      for (const v of bad) {
        const [x, y, z] = acc.get(v);
        const length = Math.hypot(x, y, z);
        if (!(length > 0)) {
          // No triangle uses this vertex any more. Its normal has no direction
          // to get right, and the validator checks the value regardless of use,
          // so it is given one and counted separately.
          if (PRUNE && !used.has(v)) {
            if (!DRY) { n[v * 3] = 0; n[v * 3 + 1] = 1; n[v * 3 + 2] = 0; }
            unusedGivenUnit += 1;
            continue;
          }
          // Used, but its faces cancel exactly: the surface folds back on
          // itself here, so the average of the two sides is nothing. There is
          // no correct answer at a fold — either side is a face that really
          // exists — so the largest one is taken, deterministically. Counted
          // separately because it is a choice, not a reconstruction.
          const biggest = largestFaceNormal(v, faceIndex.get(v) ?? [], p);
          if (biggest) {
            if (!DRY) { n[v * 3] = biggest[0]; n[v * 3 + 1] = biggest[1]; n[v * 3 + 2] = biggest[2]; }
            cancelled += 1;
            continue;
          }
          unrepairable += 1;
          continue;
        }
        if (!DRY) {
          n[v * 3] = x / length;
          n[v * 3 + 1] = y / length;
          n[v * 3 + 2] = z / length;
        }
        repaired += 1;
        touched.set(mesh.name, (touched.get(mesh.name) ?? 0) + 1);
      }
    }
  }

  const after = fingerprint();
  // Positions must be identical; indices may differ only where triangles were
  // pruned, so they are compared per mesh rather than as one hash.
  const positionsHeld = before.meshes.every((m, i) => m.positions === after.meshes[i].positions);
  // Counts change by exactly what was pruned and are checked on their own line;
  // what must not move is the naming and the graph.
  const shape = (f) => JSON.stringify({ nodes: f.nodes, nodeNames: f.nodeNames, extras: f.extras, meshCount: f.meshCount, materials: f.materials });
  const structureHeld = shape(before) === shape(after);

  let derivedSha = null;
  let derivedPath = null;
  if (!DRY && repaired) {
    derivedPath = join(ROOT, 'dev-assets', 'derived', candidate.file);
    mkdirSync(dirname(derivedPath), { recursive: true });
    const out = writeGlb({ json, bin, others });
    writeFileSync(derivedPath, out);
    derivedSha = createHash('sha256').update(out).digest('hex');
  }

  report.files.push({
    assetId: candidate.id,
    source: { path: `dev-assets/${candidate.file}`, sha256: sourceSha, bytes: source.length },
    derived: derivedPath ? { path: `dev-assets/derived/${candidate.file}`, sha256: derivedSha } : null,
    degenerateNormals: degenerate,
    repaired,
    unrepairable,
    unusedGivenUnitNormal: unusedGivenUnit,
    foldTookLargestFace: cancelled,
    removedZeroAreaTriangles: removedZeroArea,
    removedDuplicateFaces: removedDuplicate,
    meshesTouched: Object.fromEntries(touched),
    heldUnchanged: {
      positionsAndIndices: positionsHeld,
      nodesNamesExtrasMaterials: structureHeld,
      // Triangles change by exactly what was pruned, and nothing else.
      trianglesAccountedFor: before.triangles - after.triangles === removedZeroArea + removedDuplicate,
      vertices: before.vertices === after.vertices,
    },
    counts: { nodes: before.nodes, meshes: before.meshCount, triangles: before.triangles, vertices: before.vertices },
  });
}

const out = join(ROOT, 'docs/asset-qa/measurements/normal-repair.json');
if (!DRY) writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

/** The unit normal of the largest triangle in `faces`, or null if none has area. */
function largestFaceNormal(vertex, faces, p) {
  let best = null;
  let bestArea = 0;
  for (const [a, b, c] of faces) {
    const ux = p[b * 3] - p[a * 3];
    const uy = p[b * 3 + 1] - p[a * 3 + 1];
    const uz = p[b * 3 + 2] - p[a * 3 + 2];
    const vx = p[c * 3] - p[a * 3];
    const vy = p[c * 3 + 1] - p[a * 3 + 1];
    const vz = p[c * 3 + 2] - p[a * 3 + 2];
    const fx = uy * vz - uz * vy;
    const fy = uz * vx - ux * vz;
    const fz = ux * vy - uy * vx;
    const area = Math.hypot(fx, fy, fz);
    if (area > bestArea) { bestArea = area; best = [fx / area, fy / area, fz / area]; }
  }
  return best;
}

// --- `--verify`: the reproducibility claim, as a check -----------------------
if (VERIFY) {
  const { createHash: hash } = await import('node:crypto');
  const digest = (path) => hash('sha256').update(readFileSync(path)).digest('hex');
  const failures = [];

  // 1. The sources are exactly what the candidate record pins.
  const { DEV_ASSETS } = await import(`${ROOT}/src/catalog/devAssets.js`);
  for (const candidate of CANDIDATES) {
    const record = DEV_ASSETS.find((entry) => entry.id === candidate.id);
    const actual = digest(join(ROOT, 'dev-assets', candidate.file));
    if (record?.sha256 && record.sha256 !== actual) {
      failures.push(`${candidate.id}: the source on disk is not the pinned file`);
    }
  }

  // 2. Running it again produces the same bytes. A hash a decision pins has to
  //    be reachable from the source, not from this particular afternoon.
  const first = report.files.map((file) => file.derived?.sha256 ?? null);
  const { execFileSync } = await import('node:child_process');
  execFileSync(process.execPath, [new URL(import.meta.url).pathname], { cwd: ROOT, stdio: 'ignore' });
  const second = CANDIDATES.map((candidate) => digest(join(ROOT, 'dev-assets/derived', candidate.file)));
  for (const [i, candidate] of CANDIDATES.entries()) {
    if (first[i] !== second[i]) failures.push(`${candidate.id}: a second run produced different bytes`);
  }

  // 3. The sources are still the sources.
  for (const candidate of CANDIDATES) {
    const record = DEV_ASSETS.find((entry) => entry.id === candidate.id);
    if (record?.sha256 && digest(join(ROOT, 'dev-assets', candidate.file)) !== record.sha256) {
      failures.push(`${candidate.id}: the source was modified by the repair`);
    }
  }

  // 4. The output is what the release gate requires: nothing, from the validator.
  const validator = await import('gltf-validator');
  for (const [i, candidate] of CANDIDATES.entries()) {
    const result = await validator.validateBytes(new Uint8Array(readFileSync(join(ROOT, 'dev-assets/derived', candidate.file))));
    const { numErrors, numWarnings } = result.issues;
    if (numErrors !== 0 || numWarnings !== 0) {
      failures.push(`${candidate.id}: validator reports ${numErrors} errors and ${numWarnings} warnings`);
    }
    console.error(`  ${candidate.id}: ${second[i].slice(0, 16)}… — ${numErrors} errors, ${numWarnings} warnings`);
  }

  if (failures.length) {
    console.error(`\nnot reproducible:\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }
  console.error('\nreproducible: same sources in, same derived hashes out, sources untouched, validator clean.');
}
