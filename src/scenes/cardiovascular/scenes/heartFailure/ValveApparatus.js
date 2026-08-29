import * as THREE from 'three';
import { ANATOMY } from './anatomy.js';
import { wallSitePoint } from './geometry/ventricleGeometry.js';
import { createApparatusMaterials } from './materials/heartMaterials.js';
import { createRandom, lerp, smoothstep } from '../../../../utils/math.js';

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
      { site: 'anterolateralPapillary', side: 1, mesh: null, tip: new THREE.Vector3() },
      { site: 'posteromedialPapillary', side: -1, mesh: null, tip: new THREE.Vector3() },
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
        length: this.mitralRadius * 1.25,
        halfWidth: this.mitralRadius * 0.82,
        closedAngle: -0.5,
        openAngle: -1.32,
        material: this.materials.leaflet,
      }),
      makeLeaflet({
        hingeDir: towardAorta.clone().negate(),
        ringRadius: this.mitralRadius,
        length: this.mitralRadius * 0.95,
        halfWidth: this.mitralRadius * 0.9,
        closedAngle: -0.78,
        openAngle: -1.45,
        material: this.materials.leaflet,
      }),
    ];
    for (const leaflet of this.leaflets) this.add(leaflet.group);

    // --- chordae tendineae ------------------------------------------------
    // A representative few: each papillary tip sends one chord toward two
    // stations on each leaflet's free edge. Which side of the edge is
    // resolved at update time — always the side nearest the muscle, so a
    // chord never crosses the cavity like a rigging line.
    //
    // Each logical chord is drawn as a small bundle — a sagging proximal
    // segment, a thinner distal segment, and a short branchlet to a second
    // insertion point — so it reads as fibrous cord, not a straight rod.
    this.chordae = [];
    for (let p = 0; p < 2; p++) {
      for (let l = 0; l < 2; l++) {
        for (const widthFrac of [0.35, 0.65]) {
          // Four short pieces along a bowed curve rather than one span: three
          // straight cylinders end to end still read as a wire, and a wire is
          // the thing a chorda must not look like.
          const links = [];
          for (let k = 0; k < CHORD_LINKS; k++) {
            const t = k / CHORD_LINKS;
            // Tapers from the muscle toward the leaflet, as the real cord does.
            const r = 0.016 * (1 - t) + 0.008 * t;
            const link = new THREE.Mesh(chordGeometry(r, r * 1.2), this.materials.chordae);
            links.push(link);
            this.add(link);
          }
          const branch = new THREE.Mesh(chordGeometry(0.0075, 0.009), this.materials.chordae);
          this.add(branch);
          this.chordae.push({ pap: p, leaflet: l, widthFrac, links, branch });
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
        // Open cusps swing up nearly parallel to the root wall, leaving the
        // central orifice clear.
        openAngle: 1.35,
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
      const base = wallSitePoint(shape, pap.site, this._v.c);
      base.y += descent;
      // Seat the root *inside* the wall, not on it. The muscle leans away from
      // the surface it grows out of, so a root sitting exactly on the surface
      // lifts off it on the far flank and shows the rim as a flat terminal
      // edge. Pushing the whole muscle out along the wall normal buries that
      // rim from every angle, at the cost of a fraction of its visible length.
      PAP_OUT.set(base.x, 0, base.z);
      if (PAP_OUT.lengthSq() > 1e-6) base.addScaledVector(PAP_OUT.normalize(), PAPILLARY_SEATING);
      // Aim at the annulus, leaning each muscle toward its own side of the
      // ring so the pair diverges instead of converging on the centre.
      const target = this._v.a
        .copy(ANATOMY.mitralValve)
        .add({ x: pap.side * this.mitralRadius * 0.7, y: descent - 0.15, z: -0.25 });
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
      // Of the two symmetric edge stations, take the side nearer the muscle.
      const near = leafletEdgePoint(leaflet, chord.widthFrac, CH_A);
      const far = leafletEdgePoint(leaflet, -chord.widthFrac, CH_B);
      const nearSide = near.distanceToSquared(from) <= far.distanceToSquared(from);
      const to = nearSide ? near : far;
      const sideFrac = nearSide ? chord.widthFrac : -chord.widthFrac;

      // The cord bows away from the straight line — slack tissue under partial
      // tension, not a rigging line. The bow eases off as the leaflet closes
      // and the chord tautens, but never all the way to a straight span.
      const taut = 1 - (leaflet.openFraction ?? 0) * 0.65;
      const span = CH_MID.copy(to).sub(from).length();
      const bow = span * (0.09 + 0.15 * (1 - taut));
      CH_MID.copy(from).lerp(to, 0.5);
      CH_MID.y -= bow;
      // A little lateral bow too, alternating per chord, so a bundle of cords
      // curves apart instead of collapsing onto one plane.
      CH_MID.x += bow * 0.55 * (chord.widthFrac > 0.5 ? 1 : -1);
      CH_MID.z += bow * 0.3 * (chord.pap === 0 ? 1 : -1);

      // Quadratic Bezier from muscle tip to leaflet edge, drawn as short links.
      for (let k = 0; k < chord.links.length; k++) {
        bezier(from, CH_MID, to, k / chord.links.length, CH_P0);
        bezier(from, CH_MID, to, (k + 1) / chord.links.length, CH_P1);
        placeSegment(chord.links[k], CH_P0, CH_P1);
      }

      // Branchlet: forks off the distal segment to a second insertion point
      // a little further along the free edge. The fork point is fixed before
      // CH_B is reused for the second insertion.
      bezier(from, CH_MID, to, 0.72, CH_FORK);
      const second = leafletEdgePoint(leaflet, THREE.MathUtils.clamp(sideFrac + (sideFrac > 0 ? 0.22 : -0.22), -1, 1), CH_B);
      placeSegment(chord.branch, CH_FORK, second);
    }
  }

  dispose() {
    for (const pap of this.papillaries) pap.mesh.geometry.dispose();
    for (const leaflet of this.leaflets) leaflet.mesh.geometry.dispose();
    for (const cusp of this.cusps) cusp.mesh.geometry.dispose();
    for (const chord of this.chordae) {
      for (const link of chord.links) link.geometry.dispose();
      chord.branch.geometry.dispose();
    }
    for (const material of Object.values(this.materials)) material.dispose();
  }
}

const UP = new THREE.Vector3(0, 1, 0);
const CH_A = new THREE.Vector3();
const CH_B = new THREE.Vector3();
const CH_MID = new THREE.Vector3();
const CH_FORK = new THREE.Vector3();
const CH_P0 = new THREE.Vector3();
const CH_P1 = new THREE.Vector3();

/** How many short links each chord is drawn with. */
const CHORD_LINKS = 4;

/** Quadratic Bezier sample, written into `out`. */
function bezier(a, b, c, t, out) {
  const u = 1 - t;
  return out
    .copy(a)
    .multiplyScalar(u * u)
    .addScaledVector(b, 2 * u * t)
    .addScaledVector(c, t * t);
}
const SEG_DIR = new THREE.Vector3();
const PAP_OUT = new THREE.Vector3();

/** How far into the wall a papillary muscle's root is seated, in scene units. */
const PAPILLARY_SEATING = 0.16;

/** Stretches a unit chord segment between two points. */
function placeSegment(mesh, from, to) {
  SEG_DIR.copy(to).sub(from);
  const length = SEG_DIR.length();
  mesh.position.copy(from);
  mesh.quaternion.setFromUnitVectors(UP, SEG_DIR.normalize());
  mesh.scale.set(1, length, 1);
}

/**
 * A tapering, slightly bent muscle column: unit height along +Y with a
 * flared, root-like base so it reads as continuous with the trabeculated
 * wall rather than a cone stuck onto it.
 */
function papillaryGeometry(side) {
  const rnd = createRandom(6060 + side * 7);
  const radial = 22;
  const rings = 18;
  const footPhase = rnd() * Math.PI * 2;
  const positions = [];
  const indices = [];

  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    // Flared base -> shaft -> blunt tip.
    let radius = lerp(1.55, 1.0, smoothstep(0, 0.4, t)) * lerp(1, 0.32, smoothstep(0.5, 1, t));
    const bend = 0.18 * Math.sin(t * Math.PI * 0.7) * side;
    // How much of the root splay and the shaft grooving apply at this height.
    const inRoot = Math.pow(Math.max(0, 1 - t / ROOT_HEIGHT), 1.25);
    const onShaft = smoothstep(0.12, 0.45, t) * (1 - smoothstep(0.72, 1, t));

    for (let s = 0; s <= radial; s++) {
      const angle = (s / radial) * Math.PI * 2;
      // A few muscular bands rather than a smooth skirt. Between them the base
      // dips below the mounting plane, so the muscle appears to grow out from
      // between the trabeculae instead of resting on top of them: a cone with
      // a clean elliptical foot is the single clearest "this was assembled
      // from primitives" cue in the cavity.
      const foot = Math.pow(Math.max(0, Math.cos(ROOT_FEET * angle + footPhase)), 2);
      const splay = 1 + ROOT_SPLAY * foot * inRoot;
      // Longitudinal grooves: the fibre bundles that run up a real papillary
      // muscle, shallow enough to read as form rather than as corrugation.
      const grooves = 1 - GROOVE_DEPTH * Math.pow(Math.max(0, Math.cos(6 * angle + t * 1.1 + footPhase)), 2) * onShaft;
      // Lobed, irregular cross-section — muscle, not a lathe.
      const lobes =
        1 + 0.08 * Math.sin(3 * angle + t * 2.4) + 0.05 * Math.sin(5 * angle - t * 3.1) + 0.03 * (rnd() - 0.5);
      const rr = radius * splay * grooves * lobes;
      // The feet reach further down than the hollows between them, burying the
      // rim in the wall from every angle.
      const y = t - ROOT_SINK * foot * inRoot;
      positions.push(Math.cos(angle) * rr, y, Math.sin(angle) * rr + bend);
    }
  }

  // Two heads rather than one dome: chordae leave a real papillary muscle from
  // several summits, and a single smooth cap reads as the end of a cone.
  const tipY = 1.045;
  const tipBend = 0.18 * Math.sin(Math.PI * 0.7) * side;
  const heads = [];
  for (let h = 0; h < 2; h++) {
    const a = footPhase + h * Math.PI;
    heads.push(positions.length / 3);
    positions.push(Math.cos(a) * HEAD_SPREAD, tipY, Math.sin(a) * HEAD_SPREAD + tipBend);
  }

  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < radial; s++) {
      const va = r * (radial + 1) + s;
      const vb = (r + 1) * (radial + 1) + s;
      indices.push(va, vb, va + 1, va + 1, vb, vb + 1);
    }
  }
  // Cap to whichever head is nearer, which leaves a shallow cleft between them.
  for (let s = 0; s < radial; s++) {
    const angle = (s / radial) * Math.PI * 2;
    const head = heads[Math.cos(angle - footPhase) >= 0 ? 0 : 1];
    indices.push(rings * (radial + 1) + s, head, rings * (radial + 1) + s + 1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** How far up the muscle the splayed root reaches, as a fraction of its height. */
const ROOT_HEIGHT = 0.44;
/** How many muscular bands the root splays into. */
const ROOT_FEET = 4;
/**
 * How far those bands reach out past the shaft, as a fraction of its radius.
 * Restrained: pushed further they stop reading as roots and start reading as
 * fins, which is a different wrong answer from the cone they replaced.
 */
const ROOT_SPLAY = 0.46;
/**
 * How far they dive below the mounting plane, in units of the muscle's height.
 * Deep enough that the rim stays buried on the far side too — the muscle is
 * tilted relative to the wall, so a shallow root lifts off it on one flank.
 */
const ROOT_SINK = 0.34;
/** Depth of the longitudinal grooves on the shaft. */
const GROOVE_DEPTH = 0.075;
/** How far apart the two heads sit at the tip. */
const HEAD_SPREAD = 0.16;

/** A thin unit chord segment along +Y, tapering from bottom to top radius. */
function chordGeometry(topRadius, bottomRadius) {
  const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, 1, 6, 1, true);
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
      const y = -0.3 * length * v * (1 - (u * 2) ** 2) - 0.035 * Math.sin(u * 9) * v;
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

  // Orient the group so local -Z (the direction the leaflet extends) points
  // from the hinge back across the ring, i.e. along -hingeDir. R_y(yaw)
  // maps (0,0,-1) to (-sin(yaw), 0, -cos(yaw)), so yaw must satisfy
  // (sin(yaw), cos(yaw)) = (hingeDir.x, hingeDir.z).
  const yaw = Math.atan2(hingeDir.x, hingeDir.z);
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
