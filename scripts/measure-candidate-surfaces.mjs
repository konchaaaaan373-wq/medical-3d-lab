#!/usr/bin/env node
/**
 * Measure the candidate meshes, with metrics that were checked first.
 *
 *   npm run assets:dev
 *   npm run assets:measure            # the vessels of the heart
 *   npm run assets:measure heart      # the heart file
 *   npm run assets:measure junctions  # where the two files meet
 *
 * This script reads GLBs and prints numbers. **Every number comes from
 * `scripts/lib/mesh-metrics.mjs`**, which is pure and is exercised against
 * shapes with known answers in `tests/mesh-metrics.test.js` — a cube, a hollow
 * shell, a solid rod, a walled pipe, an open sheet and a few deliberate
 * defects. That separation exists because the previous version of this file
 * concluded, from a rule it had never checked, that no candidate vessel has a
 * modelled wall thickness: the rule belonged to a ray crossing a shape from
 * outside, and the code cast its ray from inside, where a solid gives one
 * crossing and a shell gives two. The conclusion was withdrawn.
 *
 * The columns are named for what they are:
 *
 *   boundary / nonManifold  edges used once / three or more times. Different
 *                           defects, never summed into "open edges".
 *   signedVolume            the divergence-theorem sum. It is an enclosed
 *                           volume only where the mesh is closed, manifold, one
 *                           piece, **consistently oriented and not
 *                           self-intersecting**. `volumePrecondition` reports
 *                           the first three, which are the ones this script
 *                           tests; the last two are not checked anywhere here,
 *                           so the column never says the preconditions are met.
 *   genus                   handles in the surface, from V − E + F, and only
 *                           for a closed, manifold, single-component surface.
 *                           It says how complicated the surface is. **It does
 *                           not say whether there is a wall** — a cup has a
 *                           wall and genus 0, a loop of solid rod has none and
 *                           genus 1. Both are measured in the test file.
 *   transversal             crossings along a complete line through the shape,
 *                           from outside. Four can be a wall, a bend, or two
 *                           separate pieces, so it settles nothing alone.
 *
 * **Nothing here measures wall thickness.** Two attempts to infer it — from the
 * ray count, then from the genus — were both withdrawn, and the question is
 * left open rather than answered from whichever column is nearest.
 *
 * Reads the GLB directly. No three, no DOM, no loader.
 */
import { readFileSync } from 'node:fs';
import {
  directions,
  eulerCharacteristic,
  isClosedManifold,
  nearestSampledVertexDistance,
  signedVolume,
  surfaceCentroid,
  transversalCrossings,
} from './lib/mesh-metrics.mjs';

const COMPONENT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const COUNT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function glb(path) {
  const buf = readFileSync(path);
  let at = 12, json = null, bin = null;
  while (at < buf.length) {
    const len = buf.readUInt32LE(at), type = buf.readUInt32LE(at + 4);
    const body = buf.subarray(at + 8, at + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(body.toString('utf8'));
    else if (!bin) bin = body;
    at += 8 + len + ((4 - (len % 4)) % 4);
  }
  return { json, bin };
}

function accessor(file, index) {
  const acc = file.json.accessors[index];
  const view = file.json.bufferViews[acc.bufferView];
  const Type = COMPONENT[acc.componentType];
  const items = COUNT[acc.type];
  const start = (view.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const stride = view.byteStride ?? 0;
  const out = new Float64Array(acc.count * items);
  if (!stride || stride === items * Type.BYTES_PER_ELEMENT) {
    const src = new Type(file.bin.buffer, file.bin.byteOffset + start, acc.count * items);
    out.set(src);
  } else {
    for (let i = 0; i < acc.count; i += 1) {
      const src = new Type(file.bin.buffer, file.bin.byteOffset + start + i * stride, items);
      out.set(src, i * items);
    }
  }
  return out;
}

const mul = (a, b) => { const o = new Array(16).fill(0); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
const ident = () => [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
function local(node) {
  if (node.matrix) return node.matrix.slice();
  const t = node.translation ?? [0,0,0], r = node.rotation ?? [0,0,0,1], s = node.scale ?? [1,1,1];
  const [x,y,z,w] = r;
  return [
    (1-2*(y*y+z*z))*s[0], (2*(x*y+z*w))*s[0], (2*(x*z-y*w))*s[0], 0,
    (2*(x*y-z*w))*s[1], (1-2*(x*x+z*z))*s[1], (2*(y*z+x*w))*s[1], 0,
    (2*(x*z+y*w))*s[2], (2*(y*z-x*w))*s[2], (1-2*(x*x+y*y))*s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}
const apply = (m, p) => [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12], m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13], m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];

/** Every mesh node under a named subtree, with world-space triangles. */
function meshes(file, subtreeName = null) {
  const out = [];
  let taking = subtreeName === null;
  const walk = (index, parent, inside) => {
    const node = file.json.nodes[index];
    const world = mul(parent, local(node));
    const here = inside || node.name === subtreeName;
    if (node.mesh != null && (taking || here)) {
      const mesh = file.json.meshes[node.mesh];
      const tris = [];
      for (const prim of mesh.primitives) {
        const pos = accessor(file, prim.attributes.POSITION);
        const idx = prim.indices != null ? accessor(file, prim.indices) : null;
        const n = idx ? idx.length : pos.length / 3;
        for (let i = 0; i < n; i += 3) {
          const a = idx ? idx[i] : i, b = idx ? idx[i+1] : i+1, c = idx ? idx[i+2] : i+2;
          tris.push([
            apply(world, [pos[a*3], pos[a*3+1], pos[a*3+2]]),
            apply(world, [pos[b*3], pos[b*3+1], pos[b*3+2]]),
            apply(world, [pos[c*3], pos[c*3+1], pos[c*3+2]]),
          ]);
        }
      }
      out.push({ name: node.name ?? mesh.name, tris });
    }
    for (const child of node.children ?? []) walk(child, world, here);
  };
  for (const scene of file.json.scenes ?? []) for (const root of scene.nodes ?? []) walk(root, ident(), false);
  return out;
}

const [, , which] = process.argv;
const dirs = directions(128);

/**
 * Pairs whose nearest **sampled vertices** are compared.
 *
 * **A diagnostic, not an accuracy claim, and not a surface distance.** What is
 * computed is the smallest distance between a de-duplicated vertex of one mesh
 * and one of the other — see `nearestSampledVertexDistance`. Two meshes can
 * interpenetrate without sharing a vertex, and two surfaces that meet along a
 * face can have their nearest vertices far apart, so a 0 mm reading means two
 * sampled vertices coincide and **not** that the surfaces are joined,
 * continuous or watertight.
 *
 * Both files are in the same whole-body frame and neither is moved, so these
 * are properties of the source segmentation and of nothing done here.
 */
const JUNCTIONS = [
  ['VH_M_ascending_aorta', 'VH_M_aortic_valve'],
  ['VH_M_ascending_aorta', 'VH_M_heart_left_ventricle'],
  ['VH_M_pulmonary_trunk', 'VH_M_pulmonary_valve'],
  ['VH_M_pulmonary_trunk', 'VH_M_heart_right_ventricle'],
  ['VH_M_superior_vena_cava', 'VH_M_right_cardiac_atrium'],
  ['VH_M_inferior_vena_cava_a', 'VH_M_right_cardiac_atrium'],
  ['VH_M_pulmonary_vein_L_sup', 'VH_M_left_cardiac_atrium'],
  ['VH_M_pulmonary_vein_L_inf', 'VH_M_left_cardiac_atrium'],
  ['VH_M_pulmonary_vein_R_sup', 'VH_M_left_cardiac_atrium'],
  ['VH_M_pulmonary_vein_R_inf', 'VH_M_left_cardiac_atrium'],
  ['VH_M_left_coronary_artery', 'VH_M_aortic_valve'],
  ['VH_M_right_coronary_artery', 'VH_M_aortic_valve'],
  ['VH_M_coronary_sinus', 'VH_M_right_cardiac_atrium'],
];

if (which === 'junctions') {
  const vessels = new Map(
    meshes(glb('dev-assets/heart/VH_M_Blood_Vasculature.glb'), 'VH_M_blood_vasculature_of_heart').map((m) => [m.name, m])
  );
  const parts = new Map(meshes(glb('dev-assets/heart/VH_M_Heart.glb'), null).map((m) => [m.name, m]));
  console.log("# smallest distance between a SAMPLED VERTEX of a vessel and one of a heart part");
  console.log('# in the source\'s own frame, neither file moved. Vertices de-duplicated at 10 µm.');
  console.log('# NOT a surface distance and NOT a proof of connection: 0.00 means two sampled');
  console.log('# vertices coincide to that tolerance, nothing more.');
  console.log(['vessel', 'part', 'nearestSampledVertexMm', 'weldMm', 'sampledVessel', 'sampledPart'].join('\t'));
  for (const [a, b] of JUNCTIONS) {
    const va = vessels.get(a);
    const vb = parts.get(b);
    if (!va || !vb) { console.log(`${a}\t${b}\t(absent)`); continue; }
    const r = nearestSampledVertexDistance(va.tris, vb.tris, 1e-5);
    console.log([a, b, (r.distance * 1000).toFixed(2), (r.weld * 1000).toFixed(3), r.sampledA, r.sampledB].join('\t'));
  }
  process.exit(0);
}

const targets = which === 'heart'
  ? [['dev-assets/heart/VH_M_Heart.glb', null]]
  : [['dev-assets/heart/VH_M_Blood_Vasculature.glb', 'VH_M_blood_vasculature_of_heart']];

for (const [path, subtree] of targets) {
  console.log(`# ${path}${subtree ? ` (${subtree})` : ''}`);
  console.log('# every number below comes from scripts/lib/mesh-metrics.mjs, checked in tests/mesh-metrics.test.js');
  console.log([
    'name', 'triangles', 'components',
    'boundary@1µm', 'boundary@10µm', 'nonManifold@1µm', 'degenerateTris',
    'closedManifold', 'genus', 'signedVolumeMl', 'volumePrecondition',
    'transversalMode', 'transversalHistogram',
  ].join('\t'));
  for (const m of meshes(glb(path), subtree)) {
    const fine = eulerCharacteristic(m.tris, 1e-6);
    const coarse = eulerCharacteristic(m.tris, 1e-5);
    const closed = isClosedManifold(fine) && fine.components === 1;

    // A complete transversal through the area-weighted surface centroid. A
    // description of the crossings, not a verdict: four can be a wall, a bend,
    // or two pieces, and the genus does not disambiguate it either.
    const through = surfaceCentroid(m.tris);
    const hist = new Map();
    for (const d of dirs) {
      const n = transversalCrossings(m.tris, through, d);
      hist.set(n, (hist.get(n) ?? 0) + 1);
    }
    const sorted = [...hist.entries()].sort((a, b) => b[1] - a[1]);

    console.log([
      m.name,
      fine.triangles,
      fine.components,
      fine.boundary,
      coarse.boundary,
      fine.nonManifold,
      fine.degenerateTriangles,
      closed ? 'yes' : 'no',
      // Withheld rather than guessed wherever the surface cannot carry it.
      fine.genus === null ? '-' : fine.genus,
      (signedVolume(m.tris) * 1e6).toFixed(2),
      // Deliberately not "yes". Closed, manifold and one piece is the part of
      // the precondition this script tests; consistent orientation and the
      // absence of self-intersection are also required for the sum to be an
      // enclosed volume, and neither is checked anywhere here.
      closed
        ? 'partly met — closed, manifold, 1 piece; orientation and self-intersection NOT checked'
        : 'not met — open, non-manifold or several pieces',
      sorted[0][0],
      sorted.slice(0, 4).map(([n, k]) => `${n}x${k}`).join(' '),
    ].join('\t'));
  }
}
