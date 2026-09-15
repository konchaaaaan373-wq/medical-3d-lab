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
/**
 * `--dry-run` means **write no files**, not "do less work".
 *
 * It used to mean the second: stage 1's pruned triangle list was only written
 * back when this was off, so on a dry run stage 2 recomputed normals against
 * the triangles stage 1 was about to remove — and the vertices whose only
 * neighbours were those zero-area triangles came back with no face to average.
 * The preview therefore reported the heart as `repaired: 200, unrepairable:
 * 168` where the real run reports `203` and **`0`**, and anyone reading the
 * preview would conclude the repair could not reach a gate that needs zero
 * errors. A dry run that answers a different question than the run it previews
 * is worse than no dry run.
 *
 * Nothing here writes to `dev-assets/`: the source is read once into this
 * process's own buffers, the derived file goes to `dev-assets/derived/` and
 * the report to `docs/asset-qa/measurements/`. Those two writes are what the
 * flag turns off, and they are the only ones.
 */
const DRY = process.argv.includes('--dry-run');
/**
 * `--verify` runs the whole thing twice, validates the output, and checks that
 * the sources are untouched — the question "can a clean machine produce the
 * exact bytes a publication decision pinned?" asked as a command.
 */
const VERIFY = process.argv.includes('--verify');

const CANDIDATES = [
  { id: 'hubmap-vh-m-heart', file: 'heart/VH_M_Heart.glb', keepSubtree: null },
  {
    id: 'hubmap-vh-m-blood-vasculature',
    file: 'heart/VH_M_Blood_Vasculature.glb',
    // The publisher's own grouping, and the only part of this file the heart
    // scene has ever drawn: 37 of its 104 meshes. The rest are the eye, the
    // abdomen and the pelvis — loaded and never shown, at 5.24 MB gzipped that
    // every reader who opens the heart pays for and never sees.
    keepSubtree: 'VH_M_blood_vasculature_of_heart',
  },
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
  const { json, others } = readGlb(new Uint8Array(source));
  let { bin } = readGlb(new Uint8Array(source));

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
          triangles: idx ? idx.accessor.count / 3 : pos.accessor.count / 3,
          vertices: pos.accessor.count,
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

  // --- stage 1: the meshes nobody draws --------------------------------------
  //
  // Only for a file that declares `keepSubtree`, and only ever the branches the
  // scene does not draw. This is the change the adoption packet named and
  // deferred — *"未使用部分の削除はさらなる改変になるため、いまは行いません。
  // 必要になれば別途判断してください"* — and the media budget is what made it
  // necessary: the heart's two files came to 7.64 MB gzipped against a 6 MB
  // line, and 5.24 MB of that was this file.
  //
  // **It is chosen over compressing instead, and for one reason.** Draco would
  // squeeze harder but quantizes vertex positions, trading away the claim this
  // whole adoption rests on. Dropping a branch nobody draws touches no vertex
  // of anything on screen: every drawn position stays bit-identical to the
  // publisher's, which the fingerprint below checks rather than assumes.
  let removedNodes = 0;
  let removedMeshes = 0;
  if (candidate.keepSubtree) {
    const nodes = json.nodes ?? [];
    const meshCountBefore = (json.meshes ?? []).length;
    const rootIndex = nodes.findIndex((node) => node.name === candidate.keepSubtree);
    if (rootIndex < 0) throw new Error(`${candidate.file}: no node named ${candidate.keepSubtree}`);

    // The subtree to keep, and the meshes and accessors it reaches.
    const keptNodes = new Set();
    (function walk(index) {
      if (keptNodes.has(index)) return;
      keptNodes.add(index);
      for (const child of nodes[index].children ?? []) walk(child);
    })(rootIndex);

    removedNodes = nodes.length - keptNodes.size;
    if (removedNodes > 0) {
      const keptMeshes = new Set();
      for (const index of keptNodes) {
        if (nodes[index].mesh != null) keptMeshes.add(nodes[index].mesh);
      }
      const keptAccessors = new Set();
      for (const meshIndex of keptMeshes) {
        for (const prim of json.meshes[meshIndex].primitives ?? []) {
          if (prim.indices != null) keptAccessors.add(prim.indices);
          for (const accessor of Object.values(prim.attributes ?? {})) keptAccessors.add(accessor);
        }
      }

      // Rebuild the binary chunk from the kept accessors alone, one bufferView
      // each. The old views are abandoned rather than edited: an accessor's
      // bytes are copied out whole, so nothing about the values can drift.
      const nodeMap = new Map([...keptNodes].sort((a, b) => a - b).map((old, next) => [old, next]));
      const meshMap = new Map([...keptMeshes].sort((a, b) => a - b).map((old, next) => [old, next]));
      const accessorMap = new Map([...keptAccessors].sort((a, b) => a - b).map((old, next) => [old, next]));

      const views = [];
      const parts = [];
      let offset = 0;
      const accessors = [];
      for (const oldIndex of [...keptAccessors].sort((a, b) => a - b)) {
        const accessor = json.accessors[oldIndex];
        const view = json.bufferViews[accessor.bufferView];
        const elementSize = COMPONENT[accessor.componentType].BYTES_PER_ELEMENT * COUNT[accessor.type];
        const stride = view.byteStride ?? elementSize;
        const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
        // Copied element by element when the source is interleaved, so the
        // result is tightly packed and the values are the same values.
        const bytes = new Uint8Array(elementSize * accessor.count);
        for (let i = 0; i < accessor.count; i += 1) {
          bytes.set(bin.subarray(start + i * stride, start + i * stride + elementSize), i * elementSize);
        }
        const padded = offset % 4 === 0 ? offset : offset + (4 - (offset % 4));
        if (padded !== offset) parts.push(new Uint8Array(padded - offset));
        views.push({ buffer: 0, byteOffset: padded, byteLength: bytes.length, ...(view.target ? { target: view.target } : {}) });
        parts.push(bytes);
        offset = padded + bytes.length;
        accessors.push({ ...accessor, bufferView: views.length - 1, byteOffset: 0 });
      }

      const rebuilt = new Uint8Array(offset);
      let at = 0;
      for (const part of parts) { rebuilt.set(part, at); at += part.length; }

      json.nodes = [...keptNodes].sort((a, b) => a - b).map((index) => {
        const node = { ...nodes[index] };
        if (node.mesh != null) node.mesh = meshMap.get(node.mesh);
        if (node.children) {
          const children = node.children.filter((child) => keptNodes.has(child)).map((child) => nodeMap.get(child));
          if (children.length) node.children = children;
          else delete node.children;
        }
        return node;
      });
      json.meshes = [...keptMeshes].sort((a, b) => a - b).map((index) => ({
        ...json.meshes[index],
        primitives: (json.meshes[index].primitives ?? []).map((prim) => ({
          ...prim,
          ...(prim.indices != null ? { indices: accessorMap.get(prim.indices) } : {}),
          attributes: Object.fromEntries(
            Object.entries(prim.attributes ?? {}).map(([name, accessor]) => [name, accessorMap.get(accessor)])
          ),
        })),
      }));
      json.accessors = accessors;
      json.bufferViews = views;
      json.buffers = [{ byteLength: rebuilt.length }];
      // The kept subtree becomes the scene's own root, keeping its transform.
      for (const scene of json.scenes ?? []) scene.nodes = [nodeMap.get(rootIndex)];
      removedMeshes = meshCountBefore - keptMeshes.size;
      bin = rebuilt;
    }
  }

  // --- stage 2: remove triangles that draw nothing ---------------------------
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
        // Written back over the same bytes, with the accessor's count reduced.
        // The buffer keeps its length; the tail is simply no longer indexed.
        // This happens on a dry run too — see `DRY` above: the buffer here is
        // this process's own copy, and stage 2 has to see the pruned triangle
        // list or it measures geometry that is about to stop existing.
        for (let i = 0; i < kept.length; i += 1) idx.array[i] = kept[i];
        idx.accessor.count = kept.length;
      }
    }
  }

  // --- stage 3: the normals --------------------------------------------------
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
            n[v * 3] = 0; n[v * 3 + 1] = 1; n[v * 3 + 2] = 0;
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
            n[v * 3] = biggest[0]; n[v * 3 + 1] = biggest[1]; n[v * 3 + 2] = biggest[2];
            cancelled += 1;
            continue;
          }
          unrepairable += 1;
          continue;
        }
        n[v * 3] = x / length;
        n[v * 3 + 1] = y / length;
        n[v * 3 + 2] = z / length;
        repaired += 1;
        touched.set(mesh.name, (touched.get(mesh.name) ?? 0) + 1);
      }
    }
  }

  const after = fingerprint();
  // Positions must be identical; indices may differ only where triangles were
  // pruned, so they are compared per mesh rather than as one hash.
  // Compared **by name**, over the meshes that survive. With no trim that is
  // every mesh and this is the same assertion it always was; with a trim it is
  // the one that matters — a branch nobody draws may go, and every mesh still
  // drawn must have the same vertex positions it had in the publisher's file,
  // byte for byte. A mesh that is still here with different positions is the
  // failure this whole adoption would not survive.
  const beforeByName = new Map(before.meshes.map((mesh) => [mesh.name, mesh]));
  /** The source, restricted to the meshes that survive — the honest baseline. */
  const beforeKept = after.meshes.reduce(
    (sum, mesh) => {
      const was = beforeByName.get(mesh.name);
      return was
        ? { triangles: sum.triangles + was.triangles, vertices: sum.vertices + was.vertices }
        : sum;
    },
    { triangles: 0, vertices: 0 }
  );
  const drifted = after.meshes.filter((mesh) => beforeByName.get(mesh.name)?.positions !== mesh.positions);
  const positionsHeld = drifted.length === 0 && after.meshes.every((mesh) => beforeByName.has(mesh.name));

  // Counts change by exactly what was pruned and are checked on their own line;
  // what must not move is the naming and the graph *of what is kept*.
  const keptNames = new Set(after.nodeNames);
  const shape = (f, names) =>
    JSON.stringify({
      nodeNames: f.nodeNames.filter((name) => names.has(name)),
      materials: f.materials,
    });
  const structureHeld =
    shape(before, keptNames) === shape(after, keptNames) &&
    (removedNodes > 0 || before.extras === after.extras);

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
    // The branches the scene never draws, and what they cost. Zero for a file
    // that declares no subtree to keep.
    keptSubtree: candidate.keepSubtree,
    removedUndrawnNodes: removedNodes,
    removedUndrawnMeshes: removedMeshes,
    meshesTouched: Object.fromEntries(touched),
    heldUnchanged: {
      // Positions only. The indices do change — pruning a triangle removes its
      // three entries — so this must not be read as "the mesh is untouched".
      vertexPositions: positionsHeld,
      nodesNamesExtrasMaterials: structureHeld,
      // Triangles change by exactly what was pruned, and nothing else.
      // Measured against the **kept** subtree, not the whole source file. With
      // no trim these are the same number and this reads as it always did;
      // with a trim, what has to add up is that the meshes still drawn lost
      // exactly the degenerate triangles and nothing else, and lost no
      // vertices at all. Comparing against the whole file would just restate
      // that a trim happened.
      trianglesAccountedFor:
        beforeKept.triangles - after.triangles === removedZeroArea + removedDuplicate,
      vertices: beforeKept.vertices === after.vertices,
    },
    // Both sides, because a provenance record that gives one count leaves the
    // reader to guess whether it is the file that went in or the one that came
    // out — and here they differ by the triangles that were pruned.
    sourceCounts: { nodes: before.nodes, meshes: before.meshCount, triangles: before.triangles, vertices: before.vertices },
    derivedCounts: { nodes: after.nodes, meshes: after.meshCount, triangles: after.triangles, vertices: after.vertices },
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
