#!/usr/bin/env node
/**
 * Measure what the candidate surfaces actually are.
 *
 *   npm run assets:dev
 *   node scripts/measure-candidate-surfaces.mjs vessels
 *   node scripts/measure-candidate-surfaces.mjs heart
 *
 * The open question the model card records is lumen versus wall. It is settled
 * by counting how many times a ray crosses the surface on its way through the
 * middle of a vessel: a single-surface tube gives two crossings, a wall with a
 * modelled thickness gives four (outer, inner, inner, outer). Enclosed volume
 * and boundary-edge counts are recorded beside it, because a wall shell encloses
 * only its own material and a lumen cast encloses the channel.
 *
 * Reads the GLB directly. No three, no DOM, no loader.
 */
import { readFileSync } from 'node:fs';

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

/** Boundary edges over vertices welded at a stated tolerance (metres). */
function boundaryEdges(tris, weld = 1e-6) {
  const q = 1 / weld;
  const key = (p) => `${Math.round(p[0]*q)},${Math.round(p[1]*q)},${Math.round(p[2]*q)}`;
  const edges = new Map();
  for (const t of tris) {
    const k = t.map(key);
    for (const [a, b] of [[k[0],k[1]],[k[1],k[2]],[k[2],k[0]]]) {
      const e = a < b ? `${a}|${b}` : `${b}|${a}`;
      edges.set(e, (edges.get(e) ?? 0) + 1);
    }
  }
  let open = 0;
  for (const n of edges.values()) if (n !== 2) open += 1;
  return open;
}

/** Signed volume by the divergence theorem, in millilitres (source metres). */
function enclosedMl(tris) {
  let v = 0;
  for (const [a, b, c] of tris) {
    v += (a[0]*(b[1]*c[2]-b[2]*c[1]) - a[1]*(b[0]*c[2]-b[2]*c[0]) + a[2]*(b[0]*c[1]-b[1]*c[0])) / 6;
  }
  return Math.abs(v) * 1e6;
}

const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const dot = (a, b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

/** Möller–Trumbore, counting every crossing (no culling, no early exit). */
function crossings(tris, origin, dir) {
  let n = 0;
  for (const [a, b, c] of tris) {
    const e1 = sub(b, a), e2 = sub(c, a);
    const h = cross(dir, e2), det = dot(e1, h);
    if (Math.abs(det) < 1e-14) continue;
    const f = 1 / det, s = sub(origin, a);
    const u = f * dot(s, h);
    if (u < 0 || u > 1) continue;
    const q = cross(s, e1);
    const v = f * dot(dir, q);
    if (v < 0 || u + v > 1) continue;
    const t = f * dot(e2, q);
    if (t > 1e-9) n += 1;
  }
  return n;
}

/** A deterministic spread of directions on the sphere. */
function directions(count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (2 * i + 1) / count;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const a = i * Math.PI * (3 - Math.sqrt(5));
    out.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  return out;
}

const centroid = (tris) => {
  const c = [0, 0, 0];
  for (const t of tris) for (const p of t) { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
  const n = tris.length * 3;
  return [c[0]/n, c[1]/n, c[2]/n];
};

const RAYS = 128;
const dirs = directions(RAYS);

const [, , which] = process.argv;

/**
 * How far each vessel's nearest point is from the heart part it should meet.
 *
 * **A diagnostic, not an accuracy claim.** Both files are in the same
 * whole-body frame and neither is moved, so this is a property of the source
 * segmentation and of nothing done here. A gap of a few millimetres between two
 * independently segmented surfaces is ordinary; it is recorded so that nobody
 * has to guess at it, and no millimetre-level correctness is asserted anywhere
 * on the strength of it.
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
  const points = (m) => {
    const seen = new Set();
    const out = [];
    for (const t of m.tris) for (const p of t) {
      const k = `${Math.round(p[0] * 1e5)},${Math.round(p[1] * 1e5)},${Math.round(p[2] * 1e5)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(p);
    }
    return out;
  };
  console.log('# nearest-point gap between a vessel and the heart part it meets, in the source\'s own frame');
  console.log('# diagnostic only: no accuracy is claimed from these numbers');
  console.log('vessel\tpart\tgapMm');
  for (const [a, b] of JUNCTIONS) {
    const va = vessels.get(a);
    const vb = parts.get(b);
    if (!va || !vb) { console.log(`${a}\t${b}\t(absent)`); continue; }
    const pa = points(va);
    const pb = points(vb);
    let best = Infinity;
    for (const p of pa) for (const q of pb) {
      const d = (p[0]-q[0])**2 + (p[1]-q[1])**2 + (p[2]-q[2])**2;
      if (d < best) best = d;
    }
    console.log(`${a}\t${b}\t${(Math.sqrt(best) * 1000).toFixed(2)}`);
  }
  process.exit(0);
}

const targets = which === 'heart'
  ? [['dev-assets/heart/VH_M_Heart.glb', null]]
  : [['dev-assets/heart/VH_M_Blood_Vasculature.glb', 'VH_M_blood_vasculature_of_heart']];

for (const [path, subtree] of targets) {
  console.log(`# ${path}${subtree ? ` (${subtree})` : ''}`);
  console.log('name\ttriangles\topenEdges@1µm/10µm/100µm\tenclosedMl\tcrossings(mode)\thistogram');
  for (const m of meshes(glb(path), subtree)) {
    const c = centroid(m.tris);
    const hist = new Map();
    for (const d of dirs) {
      const n = crossings(m.tris, c, d);
      hist.set(n, (hist.get(n) ?? 0) + 1);
    }
    const sorted = [...hist.entries()].sort((a, b) => b[1] - a[1]);
    const summary = sorted.slice(0, 4).map(([n, k]) => `${n}x${k}`).join(' ');
    console.log([
      m.name,
      m.tris.length,
      [1e-6, 1e-5, 1e-4].map((w) => boundaryEdges(m.tris, w)).join('/'),
      enclosedMl(m.tris).toFixed(2),
      sorted[0][0],
      summary,
    ].join('\t'));
  }
}
