import * as THREE from 'three';
import { ANATOMY } from './anatomy.js';
import { cavitySurfacePoint } from './geometry/ventricleGeometry.js';
import { createApparatusMaterials } from './materials/heartMaterials.js';
import { createRandom, lerp, smoothstep } from '../../utils/math.js';

/**
 * The mitral and aortic valve apparatus, and the muscle that anchors it.
 *
 * This is what stops the cavity reading as an empty balloon: two papillary
 * muscle groups (anterolateral and posteromedial) rise from the trabeculated
 * wall, chordae tendineae run from their tips to the mitral leaflet edges,
 * the two leaflets swing open in diastole and coapt in systole, and three
 * aortic cusps open during ejection.
 *
 * Everything is schematic anatomy, not a valve simulation: leaflet timing is
 * read from the solved beat (the same valve times the whole scene uses), the
 * papillary muscles ride on the same analytic endocardial surface the chamber
 * mesh draws, and no pressures or forces are computed here.
 *
 * Geometry is built once; per-frame work is transform updates only.
 */
export class ValveApparatus extends THREE.Group {
  /** @param {{ variant?: 'disease'|'reference' }} options */
  constructor({ variant = 'disease' } = {}) {
    super();
    this.name = 'valve-apparatus';
    this.materials = createApparatusMaterials(variant);

    // --- papillary muscles -----------------------------------------------
    // Anchored on the posterior wall (visible through the front wedge), each
    // tilted toward its own commissure of the mitral valve.
    this.papillaries = [
      { t: 0.4, phi: 2.5, side: 1, mesh: null, tip: new THREE.Vector3() },
      { t: 0.45, phi: 3.95, side: -1, mesh: null, tip: new THREE.Vector3() },
    ];
    for (const pap of this.papillaries) {
      pap.mesh = new THREE.Mesh(papillaryGeometry(pap.side), this.materials.papillary);
      this.add(pap.mesh);
    }

    // --- mitral leaflets --------------------------------------------------
    // The anterior leaflet hangs from the aortic side of the annulus, the
    // posterior from the opposite side; both are hinged at the ring.
    const towardAorta = ANATOMY.aorticValve.clone().sub(ANATOMY.mitralValve);
    towardAorta.y = 0;
    towardAorta.normalize();
    this.mitralRadius = 0.62;
    this.leaflets = [
      makeLeaflet({
        hingeDir: towardAorta,
        ringRadius: this.mitralRadius,
        length: this.mitralRadius * 1.5,
        halfWidth: this.mitralRadius * 0.82,
        closedAngle: -0.5,
        openAngle: -1.32,
        material: this.materials.leaflet,
      }),
      makeLeaflet({
        hingeDir: towardAorta.clone().negate(),
        ringRadius: this.mitralRadius,
        length: this.mitralRadius * 1.05,
        halfWidth: this.mitralRadius * 0.9,
        closedAngle: -0.78,
        openAngle: -1.45,
        material: this.materials.leaflet,
      }),
    ];
    // The posterior leaflet is yawed 180 degrees, so its local +X points the
    // opposite way in world space; edgeSign folds that back out so chord
    // attachment sides are stated in world terms.
    this.leaflets[0].edgeSign = 1;
    this.leaflets[1].edgeSign = -1;
    for (const leaflet of this.leaflets) this.add(leaflet.group);

    // --- chordae tendineae ------------------------------------------------
    // A representative few: each papillary tip sends one chord to the edge
    // of each leaflet on its own side.
    this.chordae = [];
    for (let p = 0; p < 2; p++) {
      for (let l = 0; l < 2; l++) {
        for (const widthFrac of [0.35, 0.65]) {
          const mesh = new THREE.Mesh(chordGeometry(), this.materials.chordae);
          this.add(mesh);
          this.chordae.push({ pap: p, leaflet: l, widthFrac, mesh });
        }
      }
    }

    // --- aortic cusps -----------------------------------------------------
    this.aorticRadius = 0.5;
    this.cusps = [];
    for (let c = 0; c < 3; c++) {
      const angle = (c / 3) * Math.PI * 2 + 0.5;
      const hingeDir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
      const cusp = makeLeaflet({
        hingeDir,
        ringRadius: this.aorticRadius,
        length: this.aorticRadius * 1.12,
        halfWidth: this.aorticRadius * 0.66,
        closedAngle: -0.32,
        // Open cusps fold back toward the sinus wall, i.e. rotate upward.
        openAngle: 0.95,
        material: this.materials.leaflet,
      });
      this.add(cusp.group);
      this.cusps.push(cusp);
    }

    this._v = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3() };
  }

  /**
   * @param {{ cavityRadius: number, cavitySemiLength: number,
   *   outerSemiLength: number, baseY: number }} shape solved geometry
   * @param {number} phase 0..1 through the cycle
   * @param {{ ejectionStartPhase: number, ejectionEndPhase: number }} state
   * @param {number} descent annular descent, scene units (<= 0 in systole)
   */
  update(shape, phase, state, descent) {
    const { a, b } = this._v;
    const mitralCentre = a.copy(ANATOMY.mitralValve);
    mitralCentre.y += descent;

    // --- valve openness from the solved beat ------------------------------
    const { ejectionStartPhase: ejStart, ejectionEndPhase: ejEnd } = state;
    // Mitral: open through filling, snapping shut as contraction begins.
    const mitralOpen =
      phase < ejEnd
        ? 1 - smoothstep(0, Math.max(0.02, ejStart * 0.6), phase)
        : smoothstep(ejEnd + 0.06, ejEnd + 0.18, phase);
    // Aortic: open exactly while the model says blood is leaving.
    const aorticOpen =
      smoothstep(ejStart - 0.015, ejStart + 0.03, phase) *
      (1 - smoothstep(ejEnd - 0.025, ejEnd + 0.015, phase));

    for (const leaflet of this.leaflets) poseLeaflet(leaflet, mitralCentre, mitralOpen);

    const aorticCentre = b.copy(ANATOMY.aorticValve);
    aorticCentre.y += descent;
    for (const cusp of this.cusps) poseLeaflet(cusp, aorticCentre, aorticOpen);

    // --- papillary muscles ------------------------------------------------
    for (let p = 0; p < 2; p++) {
      const pap = this.papillaries[p];
      const base = cavitySurfacePoint(shape, pap.t, pap.phi, this._v.c);
      base.y += descent;
      // Aim at the annulus, offset toward this muscle's own commissure.
      const target = this._v.a
        .copy(ANATOMY.mitralValve)
        .add({ x: 0, y: descent - 0.15, z: pap.side * this.mitralRadius * 0.7 });
      const dir = this._v.b.copy(target).sub(base);
      const span = dir.length();
      dir.normalize();

      const length = span * 0.44;
      const girth = 0.115 * shape.cavityRadius + 0.1;
      pap.mesh.position.copy(base);
      pap.mesh.quaternion.setFromUnitVectors(UP, dir);
      pap.mesh.scale.set(girth, length, girth);
      pap.tip.copy(base).addScaledVector(dir, length);
    }

    // --- chordae ----------------------------------------------------------
    for (const chord of this.chordae) {
      const from = this.papillaries[chord.pap].tip;
      const leaflet = this.leaflets[chord.leaflet];
      const to = leafletEdgePoint(
        leaflet,
        chord.widthFrac * this.papillaries[chord.pap].side * leaflet.edgeSign,
        this._v.a
      );
      const mesh = chord.mesh;
      const dir = this._v.b.copy(to).sub(from);
      const length = dir.length();
      mesh.position.copy(from);
      mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
      mesh.scale.set(1, length, 1);
    }
  }

  dispose() {
    for (const pap of this.papillaries) pap.mesh.geometry.dispose();
    for (const leaflet of this.leaflets) leaflet.mesh.geometry.dispose();
    for (const cusp of this.cusps) cusp.mesh.geometry.dispose();
    for (const chord of this.chordae) chord.mesh.geometry.dispose();
    for (const material of Object.values(this.materials)) material.dispose();
  }
}

const UP = new THREE.Vector3(0, 1, 0);

/**
 * A tapering, slightly bent muscle column: unit height along +Y with a
 * flared, root-like base so it reads as continuous with the trabeculated
 * wall rather than a cone stuck onto it.
 */
function papillaryGeometry(side) {
  const rnd = createRandom(6060 + side * 7);
  const radial = 14;
  const rings = 12;
  const positions = [];
  const indices = [];
  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    // Flared base -> shaft -> rounded tip.
    let radius = lerp(1.9, 1.0, smoothstep(0, 0.35, t)) * lerp(1, 0.32, smoothstep(0.45, 1, t));
    const bend = 0.18 * Math.sin(t * Math.PI * 0.7) * side;
    for (let s = 0; s <= radial; s++) {
      const angle = (s / radial) * Math.PI * 2;
      // Lobed, irregular cross-section — muscle, not a lathe.
      const lobes = 1 + 0.09 * Math.sin(3 * angle + t * 2.4) + 0.05 * Math.sin(5 * angle - t * 3.1) + 0.03 * (rnd() - 0.5);
      positions.push(Math.cos(angle) * radius * lobes, t, Math.sin(angle) * radius * lobes + bend);
    }
  }
  // Tip cap vertex.
  positions.push(0, 1.04, 0.18 * Math.sin(Math.PI * 0.7) * side);
  const tipIndex = positions.length / 3 - 1;
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < radial; s++) {
      const va = r * (radial + 1) + s;
      const vb = (r + 1) * (radial + 1) + s;
      indices.push(va, vb, va + 1, va + 1, vb, vb + 1);
    }
  }
  for (let s = 0; s < radial; s++) indices.push(rings * (radial + 1) + s, tipIndex, rings * (radial + 1) + s + 1);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A thin unit chord along +Y. */
function chordGeometry() {
  const geometry = new THREE.CylinderGeometry(0.028, 0.038, 1, 6, 1, true);
  geometry.translate(0, 0.5, 0);
  return geometry;
}

/**
 * One hinged leaflet: a soft, cupped tongue of membrane. Local frame: the
 * hinge runs along X at the origin, the leaflet extends along -Z, and
 * rotation.x swings the free edge down (positive) or up (negative).
 */
function makeLeaflet({ hingeDir, ringRadius, length, halfWidth, closedAngle, openAngle, material }) {
  const widthSegs = 10;
  const lengthSegs = 8;
  const positions = [];
  const indices = [];
  for (let j = 0; j <= lengthSegs; j++) {
    const v = j / lengthSegs;
    for (let i = 0; i <= widthSegs; i++) {
      const u = i / widthSegs - 0.5;
      // Rounded free edge, slight cupping toward the centreline, and a
      // scalloped hint so the edge is not ruler-straight.
      const edge = Math.sqrt(Math.max(0, 1 - (u * 2) ** 2));
      const z = -v * length * (0.35 + 0.65 * edge);
      const x = u * 2 * halfWidth;
      const y = -0.16 * length * v * (1 - (u * 2) ** 2) - 0.03 * Math.sin(u * 9) * v;
      positions.push(x, y, z);
    }
  }
  for (let j = 0; j < lengthSegs; j++) {
    for (let i = 0; i < widthSegs; i++) {
      const va = j * (widthSegs + 1) + i;
      const vb = (j + 1) * (widthSegs + 1) + i;
      indices.push(va, vb, va + 1, vb, vb + 1, va + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);
  const group = new THREE.Group();
  group.add(mesh);

  // Orient the group so local -Z points from the hinge across the ring.
  const yaw = Math.atan2(-hingeDir.x, -hingeDir.z);
  group.rotation.y = yaw;

  return { group, mesh, hingeDir: hingeDir.clone(), ringRadius, length, halfWidth, closedAngle, openAngle };
}

/** Positions a leaflet's hinge on its ring and applies the open fraction. */
function poseLeaflet(leaflet, ringCentre, openFraction) {
  leaflet.group.position
    .copy(ringCentre)
    .addScaledVector(leaflet.hingeDir, leaflet.ringRadius * 0.92);
  leaflet.mesh.rotation.x = lerp(leaflet.closedAngle, leaflet.openAngle, openFraction);
  leaflet.openFraction = openFraction;
}

/**
 * A point on a leaflet's free edge in apparatus space, for chord endpoints.
 *
 * @param {ReturnType<typeof makeLeaflet>} leaflet
 * @param {number} widthFrac -1..1 across the leaflet
 * @param {THREE.Vector3} out
 */
function leafletEdgePoint(leaflet, widthFrac, out) {
  const u = THREE.MathUtils.clamp(widthFrac, -1, 1) * 0.5;
  const edge = Math.sqrt(Math.max(0, 1 - (u * 2) ** 2));
  out.set(u * 2 * leaflet.halfWidth, -0.16 * leaflet.length * (1 - (u * 2) ** 2), -leaflet.length * (0.35 + 0.65 * edge));
  out.applyAxisAngle(X_AXIS, leaflet.mesh.rotation.x);
  out.applyAxisAngle(UP, leaflet.group.rotation.y);
  out.add(leaflet.group.position);
  return out;
}

const X_AXIS = new THREE.Vector3(1, 0, 0);
