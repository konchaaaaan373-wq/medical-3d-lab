import * as THREE from 'three';
import { buildHeart } from '../../organs/heart.js';
import { TubeSurface, smoothCurve } from '../../../shared/geometry/tube.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { CONTROL_DOMAIN } from '../../../../models/cardiacOutput.js';
import { bedCalibreFor } from './drawingScales.js';
import { clamp, createRandom, lerp } from '../../../../utils/math.js';

/**
 * One circulation of the introductory lesson, in 3D, standing upright: the
 * heart at the bottom, the artery rising on its right, the small vessels of
 * the whole body across the top, the vein coming down on the left — and inside
 * the loop two instruments, a measuring jug for what the heart sends out in a
 * minute and a dial for the pressure.
 *
 * Upright because two of them stand side by side (`LessonStage3D`), and two
 * tall units fill a phone's figure box — about as wide as it is high — at
 * twice the size two wide ones stacked would (owner's review, 2026-10-02: on a
 * phone the first 3D version's hearts were 35 px).
 *
 * ## What a reader is meant to see without reading
 *
 * - **The heart pumps**: it squeezes once a beat, and red cells leave it into
 *   the artery in a surge on each squeeze. How deep the squeeze is, is the
 *   stroke volume the model solved (`squeezeFor`).
 * - **The small vessels of the whole body** are a bundle of many thin vessels
 *   between two collecting vessels — never one tube, never a fan — and
 *   narrowing them narrows every one, along its whole length, at once
 *   (`calibreFor`, the full model's own drawing scale). Their width before is
 *   a pale sleeve round each while B is compared with A.
 * - **The pressure** is a dial on the artery: higher pressure, further round.
 * - **What is sent out in a minute** is the level in a graduated jug, 0–6 L on
 *   one scale for every circulation, and how fast the cells move. The level
 *   moves from where it is to where it goes; it is never emptied and refilled
 *   (owner's review, 2026-10-02: a length growing again from zero reads as the
 *   blood having stopped).
 *
 * "Before" — A, while B is compared with it — is drawn inside this unit: a
 * cream needle, a cream line on the jug, the sleeves. A different circulation
 * (C) is never drawn that way: it is a second unit of its own.
 *
 * ## The model's and the drawing's
 *
 * The model's: the stroke volume (the squeeze, in proportion), the mean
 * pressure (the needle), which way and how far the resistance moved (the
 * vessels' width, in order) and the output (the level; the cells' speed). The
 * drawing's: every path, the number of vessels and cells, every scale factor,
 * the dial's and the jug's ranges. None of those is a measurement.
 *
 * Pure three.js, no DOM. The unit's own frame: x right, y up, z towards the
 * reader.
 */

/** The dial's range, mmHg: the same for every circulation. */
export const DIAL_MAX_MMHG = 150;
/** The jug's range, L per minute: the same for every circulation. */
export const JUG_MAX_LITRES = 6;
/** The stroke volume drawn as the deepest squeeze, mL (a drawing scale). */
const SQUEEZE_FULL_ML = 70;
/** How fast cells are drawn moving at 1 L/min: path lengths per second (a drawing scale). */
const CELL_SPEED_PER_LITRE = 0.055;

const COLORS = Object.freeze({
  heart: '#a8303c',
  atrium: '#8e2a37',
  artery: '#b8343f',
  vessel: '#c8404a',
  vein: '#5e3458',
  cell: '#ff3b47',
  venousCell: '#a8457a',
  dialFace: '#f2efe8',
  dialRim: '#8d96a6',
  ink: '#1c2230',
  before: '#f4f1c8',
  glass: '#cfe3ff',
  jugBlood: '#cf2f3d',
});

/**
 * Where the parts stand in the unit, by name (architecture rule 1). As short as
 * it can be and still read: the box a phone gives the figure is about as high
 * as two units are wide, so every unit of height here is heart size lost on a
 * phone (design review, 2026-10-02: 60 px hearts at 375×667 before this).
 */
export const UNIT_LAYOUT = Object.freeze({
  heart: new THREE.Vector3(0, -2.55, 0.15),
  heartScale: 1.25,
  /** Out of the top of the heart, up its right side, into the bundle's right-hand collecting vessel. */
  artery: Object.freeze([
    [0.18, -1.35, 0.05],
    [0.55, -0.75, 0],
    [1.7, -0.4, 0],
    [2.0, 0.5, 0],
    [1.92, 1.5, 0],
    [1.75, 2.1, 0],
  ]),
  /** The two collecting vessels the small ones run between: arterial on the right, venous on the left. */
  inletColumn: Object.freeze([new THREE.Vector3(1.75, 1.6, 0), new THREE.Vector3(1.75, 3.05, 0)]),
  outletColumn: Object.freeze([new THREE.Vector3(-1.75, 1.6, 0), new THREE.Vector3(-1.75, 3.05, 0)]),
  /** Out of the left-hand collecting vessel, down the heart's left, into its top. */
  vein: Object.freeze([
    [-1.75, 2.1, 0],
    [-1.92, 1.5, 0],
    [-2.0, 0.5, 0],
    [-1.65, -0.45, 0],
    [-0.55, -1.1, 0.05],
  ]),
  /** The dial, inside the loop on the artery's side, on a stem from the artery. */
  gaugeOnArtery: new THREE.Vector3(1.98, 0.72, 0),
  gauge: new THREE.Vector3(0.7, 0.72, 0.3),
  gaugeRadius: 0.66,
  /** The jug, inside the loop on the vein's side. */
  jug: new THREE.Vector3(-0.78, -0.82, 0.25),
  jugRadius: 0.4,
  jugHeight: 1.95,
});

/** The bundle: rows up the collecting vessels, three deep. Twelve vessels, always — narrowing changes their width, never their number. */
const BED_ROWS = [1.82, 2.17, 2.52, 2.87];
const BED_DEPTHS = [-0.42, 0, 0.42];
/** One small vessel's resting radius, before the calibre scale. */
const BED_RADIUS = 0.1;

/** The vessels' drawn calibre for a resistance — the full model's own drawing scale. */
export function calibreFor(resistanceMmHgSPerMl) {
  return bedCalibreFor(resistanceMmHgSPerMl, CONTROL_DOMAIN.systemicResistanceMmHgSPerMl);
}

/** How deep the heart squeezes at end of ejection for a stroke volume: 0–1, a drawing scale. */
export function squeezeFor(strokeVolumeMl) {
  return clamp(strokeVolumeMl / SQUEEZE_FULL_ML, 0, 1);
}

/** The needle's angle for a mean pressure: π at 0 mmHg (left), 0 at the top of the range (right). */
export function dialAngleFor(mmHg) {
  return Math.PI * (1 - clamp(mmHg / DIAL_MAX_MMHG, 0, 1));
}

/** The jug's level for an output, in the unit's units above the jug's floor. */
export function jugLevelFor(litresPerMin) {
  return UNIT_LAYOUT.jugHeight * clamp(litresPerMin / JUG_MAX_LITRES, 0, 1);
}

function bedCurves() {
  const [inLow] = UNIT_LAYOUT.inletColumn;
  const [outLow] = UNIT_LAYOUT.outletColumn;
  const curves = [];
  for (const y of BED_ROWS) {
    for (const z of BED_DEPTHS) {
      const a = new THREE.Vector3(inLow.x, y, 0);
      const b = new THREE.Vector3(outLow.x, y, 0);
      // A gentle wave, so they read as vessels rather than rods.
      curves.push(
        new THREE.CubicBezierCurve3(
          a,
          new THREE.Vector3(0.6, y + 0.1, z),
          new THREE.Vector3(-0.6, y - 0.1, z),
          b
        )
      );
    }
  }
  return curves;
}

/**
 * Red cells moving along paths, as small 3D discs — sized in the unit's own
 * units, so they scale with the model and read the same on a phone and a wide
 * screen. Presentation only: their speed is drawn from the output, their
 * number is fixed (a change of output is shown once, as speed, never twice).
 */
function cellStream({ curves, count, radius, color, seed }) {
  const random = createRandom(seed);
  const paths = curves.map((curve) => curve.getSpacedPoints(120));
  const geometry = new THREE.SphereGeometry(radius, 10, 8);
  geometry.scale(1, 0.62, 1);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.35, emissive: color, emissiveIntensity: 0.25 });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  const cells = Array.from({ length: count }, (_, i) => ({
    path: i % paths.length,
    u: random(),
    pace: 0.85 + random() * 0.3,
    spin: random() * Math.PI,
  }));
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  const axis = new THREE.Vector3(0.3, 1, 0.2).normalize();
  function write() {
    cells.forEach((cell, i) => {
      const path = paths[cell.path];
      const t = cell.u * (path.length - 1);
      const k = Math.min(path.length - 2, Math.floor(t));
      position.copy(path[k]).lerp(path[k + 1], t - k);
      quaternion.setFromAxisAngle(axis, cell.spin);
      // In and out of sight at the ends of a path, so a cell never pops.
      scale.setScalar(Math.min(1, Math.min(cell.u, 1 - cell.u) * 12));
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  write();
  return {
    object: mesh,
    /** @param {number} distance path lengths to move this frame */
    advance(distance) {
      for (const cell of cells) {
        cell.u = (cell.u + distance * cell.pace) % 1;
        cell.spin += distance * 6;
      }
      write();
    },
    setOpacity(value) {
      material.transparent = value < 1;
      material.opacity = value;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

function needleMesh(color, length) {
  const geometry = new THREE.BoxGeometry(length, 0.07, 0.03);
  geometry.translate(length / 2, 0, 0);
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
}

/**
 * @param {{ facing?: THREE.Vector3 }} [options] `facing` is the direction the
 *   reader looks from, in the unit's frame: the dial and the jug's markings
 *   turn to it.
 */
export function buildLessonUnit({ facing = new THREE.Vector3(0, 0, 1) } = {}) {
  const object = new THREE.Group();
  object.name = 'lesson-circulation';
  const disposables = [];
  const keep = (thing) => {
    disposables.push(thing);
    return thing;
  };

  // --- the heart -----------------------------------------------------------------
  const heart = buildHeart({ color: COLORS.heart, atriumColor: COLORS.atrium, vesselColor: COLORS.artery });
  heart.object.scale.setScalar(UNIT_LAYOUT.heartScale);
  heart.object.position.copy(UNIT_LAYOUT.heart);
  // The lesson's own artery leaves the top of the heart; the builder's arch would be a second.
  const ownArch = heart.object.getObjectByName('aortic-arch');
  if (ownArch) ownArch.visible = false;
  object.add(heart.object);

  // --- the vessels ----------------------------------------------------------------------
  const wall = (color, opacity) => tissueMaterial({ color, roughness: 0.4, opacity, emissiveIntensity: 0.04 });
  const arteryCurve = smoothCurve(UNIT_LAYOUT.artery);
  const artery = keep(new TubeSurface(arteryCurve, { radius: () => 0.2, steps: 80, radial: 18 }));
  const veinCurve = smoothCurve(UNIT_LAYOUT.vein);
  const vein = keep(new TubeSurface(veinCurve, { radius: () => 0.2, steps: 70, radial: 16 }));
  const arteryMesh = new THREE.Mesh(artery.geometry, wall(COLORS.artery, 0.5));
  arteryMesh.name = 'artery';
  const veinMesh = new THREE.Mesh(vein.geometry, wall(COLORS.vein, 0.55));
  veinMesh.name = 'vein';

  const column = (ends, color) => {
    const tube = keep(new TubeSurface(new THREE.LineCurve3(ends[0], ends[1]), { radius: () => 0.17, steps: 12, radial: 14 }));
    return new THREE.Mesh(tube.geometry, wall(color, 0.6));
  };
  const curves = bedCurves();
  const bedTubes = curves.map((curve) => keep(new TubeSurface(curve, { radius: () => BED_RADIUS, steps: 36, radial: 10 })));
  const bedMaterial = wall(COLORS.vessel, 0.72);
  const bed = new THREE.Group();
  bed.name = 'small-vessels';
  for (const tube of bedTubes) bed.add(new THREE.Mesh(tube.geometry, bedMaterial));
  bed.add(column(UNIT_LAYOUT.inletColumn, COLORS.artery), column(UNIT_LAYOUT.outletColumn, COLORS.vein));
  // The width before (A), as a pale sleeve round each vessel while B is compared with it.
  // Strong enough to see at a glance on a phone; the first prototype's 0.2 was not (design review).
  const sleeveMaterial = new THREE.MeshBasicMaterial({ color: COLORS.before, transparent: true, opacity: 0.38, depthWrite: false });
  const sleeves = new THREE.Group();
  sleeves.name = 'small-vessels-before';
  const sleeveTubes = curves.map((curve) => keep(new TubeSurface(curve, { radius: () => BED_RADIUS, steps: 36, radial: 10 })));
  for (const tube of sleeveTubes) sleeves.add(new THREE.Mesh(tube.geometry, sleeveMaterial));
  sleeves.visible = false;
  object.add(arteryMesh, veinMesh, bed, sleeves);

  // --- the blood -----------------------------------------------------------------------------
  const arterialCells = keep(cellStream({ curves: [arteryCurve], count: 30, radius: 0.09, color: COLORS.cell, seed: 3 }));
  const bedCells = keep(cellStream({ curves, count: 72, radius: 0.05, color: COLORS.cell, seed: 5 }));
  const venousCells = keep(cellStream({ curves: [veinCurve], count: 26, radius: 0.09, color: COLORS.venousCell, seed: 7 }));
  object.add(arterialCells.object, bedCells.object, venousCells.object);

  // --- the dial ---------------------------------------------------------------------------------
  const gauge = new THREE.Group();
  gauge.name = 'pressure-gauge';
  gauge.position.copy(UNIT_LAYOUT.gauge);
  gauge.lookAt(UNIT_LAYOUT.gauge.clone().add(facing));
  const r = UNIT_LAYOUT.gaugeRadius;
  const faceMaterial = new THREE.MeshStandardMaterial({ color: COLORS.dialFace, roughness: 0.75, side: THREE.DoubleSide });
  const face = new THREE.Mesh(new THREE.CircleGeometry(r, 48, 0, Math.PI), faceMaterial);
  const base = new THREE.Mesh(new THREE.PlaneGeometry(2 * r, 0.14), faceMaterial);
  base.position.y = -0.07;
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(r, 0.05, 10, 48, Math.PI),
    new THREE.MeshStandardMaterial({ color: COLORS.dialRim, roughness: 0.35, metalness: 0.4 })
  );
  gauge.add(face, base, rim);
  for (let mmHg = 0; mmHg <= DIAL_MAX_MMHG; mmHg += 30) {
    const angle = dialAngleFor(mmHg);
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: COLORS.ink }));
    tick.position.set(Math.cos(angle) * (r - 0.12), Math.sin(angle) * (r - 0.12), 0.01);
    tick.rotation.z = angle;
    gauge.add(tick);
  }
  const ghostLength = r * 0.82;
  const needleLength = r * 0.86;
  const ghostNeedle = needleMesh('#e2d77a', ghostLength);
  ghostNeedle.position.z = 0.02;
  ghostNeedle.visible = false;
  const needle = needleMesh(COLORS.ink, needleLength);
  needle.position.z = 0.035;
  const hub = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), new THREE.MeshBasicMaterial({ color: COLORS.ink }));
  hub.position.z = 0.04;
  gauge.add(ghostNeedle, needle, hub);
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1, 10),
    new THREE.MeshStandardMaterial({ color: COLORS.dialRim, roughness: 0.4, metalness: 0.3 })
  );
  const stemFrom = UNIT_LAYOUT.gaugeOnArtery;
  const stemTo = UNIT_LAYOUT.gauge.clone().add(new THREE.Vector3(r, 0, 0));
  stem.scale.y = stemFrom.distanceTo(stemTo);
  stem.position.copy(stemFrom).lerp(stemTo, 0.5);
  stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), stemTo.clone().sub(stemFrom).normalize());
  object.add(stem, gauge);

  // --- the jug ---------------------------------------------------------------------------------------
  const jug = new THREE.Group();
  jug.name = 'output-jug';
  jug.position.copy(UNIT_LAYOUT.jug);
  const H = UNIT_LAYOUT.jugHeight;
  const R = UNIT_LAYOUT.jugRadius;
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.glass,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 40, 1, true), glassMaterial);
  glass.position.y = H / 2;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 40), glassMaterial);
  floor.rotation.x = -Math.PI / 2;
  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(R, 0.03, 8, 40),
    new THREE.MeshStandardMaterial({ color: COLORS.glass, roughness: 0.2, transparent: true, opacity: 0.7 })
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.y = H;
  const fill = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.93, R * 0.93, 1, 40),
    new THREE.MeshStandardMaterial({ color: COLORS.jugBlood, roughness: 0.35, emissive: COLORS.jugBlood, emissiveIntensity: 0.18 })
  );
  fill.name = 'output-level';
  const beforeLine = new THREE.Mesh(new THREE.TorusGeometry(R * 1.06, 0.045, 8, 40), new THREE.MeshBasicMaterial({ color: COLORS.before }));
  beforeLine.rotation.x = Math.PI / 2;
  beforeLine.visible = false;
  // A mark at every litre, on the side the reader sees.
  const toward = new THREE.Vector3(facing.x, 0, facing.z).normalize();
  for (let litre = 1; litre <= JUG_MAX_LITRES; litre++) {
    const mark = new THREE.Mesh(
      new THREE.BoxGeometry(litre % 2 ? 0.14 : 0.24, 0.03, 0.02),
      new THREE.MeshBasicMaterial({ color: '#e8eef8' })
    );
    mark.position.copy(toward.clone().multiplyScalar(R + 0.012)).setY((H * litre) / JUG_MAX_LITRES);
    mark.lookAt(mark.position.clone().add(toward));
    jug.add(mark);
  }
  jug.add(fill, glass, floor, lip, beforeLine);
  object.add(jug);

  // --- what a check measures ---------------------------------------------------------------------------
  // The parts that never change, boxed in the unit's own frame at rest — the
  // heart filled, the vessels at the width they are drawn at A. A check projects
  // them through the camera: if any moves or changes size on screen, the camera
  // or the page did, which is what "the same size all the way through" forbids.
  // Only what is drawn: `Box3.setFromObject` counts hidden meshes too, and the
  // heart builder's own aortic arch, hidden here, made the heart's box half as
  // tall again as the heart (first run of the check, 2026-10-02).
  const drawnBox = (...parts) => {
    const box = new THREE.Box3();
    for (const part of parts) {
      part.traverseVisible((node) => {
        if (node.isMesh) box.union(new THREE.Box3().setFromObject(node));
      });
    }
    return box;
  };
  heart.setBeat(0);
  object.updateMatrixWorld(true);
  const restBoxes = Object.freeze({
    heart: drawnBox(heart.object),
    gauge: drawnBox(face, rim),
    jug: drawnBox(glass),
    bed: drawnBox(bed),
  });

  // --- state ------------------------------------------------------------------------------------------
  let drawn = null;
  const shown = { calibre: null, level: null, angle: null };
  /** Close enough to where it is going to be drawn there: the ease would otherwise approach for ever. */
  const ARRIVED = 1e-3;
  const moving = { squeeze: 0, travelled: 0 };

  /**
   * What the circulation is now. The drawing eases towards it (`update`), so a
   * change is seen happening, from where it was — never from zero.
   *
   * @param {{ mapMmHg: number, outputLMin: number, strokeVolumeMl: number, resistance: number }} state
   */
  function setState(state) {
    drawn = state;
  }

  /** A, drawn inside this unit as cream marks while B is compared with it; null hides them. */
  function setBefore(before) {
    ghostNeedle.visible = Boolean(before);
    beforeLine.visible = Boolean(before);
    sleeves.visible = Boolean(before);
    if (!before) return;
    ghostNeedle.rotation.z = dialAngleFor(before.mapMmHg);
    beforeLine.position.y = jugLevelFor(before.outputLMin);
    const calibre = calibreFor(before.resistance);
    if (sleeves.userData.calibre !== calibre) {
      for (const tube of sleeveTubes) tube.refresh((u, base) => base * calibre * 1.0);
      sleeves.userData.calibre = calibre;
    }
  }

  /**
   * One frame: the vessels' width, the needle and the level ease towards the
   * state; the heart squeezes on the shared beat; the cells move.
   *
   * @param {number} dt seconds
   * @param {{ squeeze: number, ejecting: number, instant?: boolean }} beat
   */
  function update(dt, { squeeze, ejecting, instant = false, still = false }) {
    if (!drawn) return;
    const k = instant ? 1 : 1 - Math.exp(-dt * 5);
    const ease = (from, to) => (from == null || instant || Math.abs(to - from) < ARRIVED ? to : lerp(from, to, k));
    shown.calibre = ease(shown.calibre, calibreFor(drawn.resistance));
    if (Math.abs(shown.calibre - (bed.userData.calibre ?? 0)) > 1e-3) {
      for (const tube of bedTubes) tube.refresh((u, base) => base * shown.calibre);
      bed.userData.calibre = shown.calibre;
    }
    shown.level = ease(shown.level, jugLevelFor(drawn.outputLMin));
    fill.scale.y = Math.max(0.001, shown.level);
    fill.position.y = shown.level / 2;
    shown.angle = ease(shown.angle, dialAngleFor(drawn.mapMmHg));
    needle.rotation.z = shown.angle;

    // With motion reduced, the heart rests and the cells stand: the needle, the
    // level and the vessels' width still say everything the lesson says.
    moving.squeeze = still ? 0 : squeeze * squeezeFor(drawn.strokeVolumeMl);
    heart.setBeat(moving.squeeze);
    const speed = still ? 0 : CELL_SPEED_PER_LITRE * drawn.outputLMin * dt;
    moving.travelled += speed;
    // Out of the heart in a surge each beat; steadily through the small vessels and back.
    arterialCells.advance(speed * (0.3 + 2.1 * ejecting));
    bedCells.advance(speed * 1.2);
    venousCells.advance(speed);
  }

  /** Where the words go, in the unit's frame. */
  const anchors = Object.freeze({
    bed: new THREE.Vector3(0, 3.38, 0),
    // Beside the heart, on the side away from the jug: under it, the name stood
    // in the legend's row on a phone (first run of the check, 2026-10-02).
    heart: UNIT_LAYOUT.heart.clone().add(new THREE.Vector3(1.12, -0.4, 0.3)),
    gauge: UNIT_LAYOUT.gauge.clone().add(new THREE.Vector3(0, -0.3, 0)),
    jug: UNIT_LAYOUT.jug.clone().add(new THREE.Vector3(0, -0.25, 0)),
  });

  /**
   * What the scene is about, lit in the model as well as in the words: the
   * vessels glow while they narrow, the dial's face and the jug's level while
   * they are the point. Presentation only.
   *
   * @param {Set<string>} lit any of 'heart', 'bed', 'gauge', 'jug'
   */
  const heartMaterials = [];
  heart.object.traverse((node) => {
    if (node.isMesh && node.visible) heartMaterials.push({ material: node.material, rest: node.material.emissiveIntensity });
  });
  function setLit(lit) {
    for (const { material, rest } of heartMaterials) material.emissiveIntensity = lit.has('heart') ? 0.4 : rest;
    bedMaterial.emissiveIntensity = lit.has('bed') ? 0.45 : 0.04;
    faceMaterial.emissive.set(lit.has('gauge') ? '#ffcf70' : '#000000');
    faceMaterial.emissiveIntensity = lit.has('gauge') ? 0.35 : 0;
    fill.material.emissiveIntensity = lit.has('jug') ? 0.55 : 0.18;
  }

  return {
    object,
    anchors,
    setState,
    setBefore,
    setLit,
    update,
    /** The values as drawn this frame, and whether they have arrived where they are going — for a check. */
    drawnNow: () => ({
      ...shown,
      calm:
        Boolean(drawn) &&
        shown.calibre === calibreFor(drawn.resistance) &&
        shown.level === jugLevelFor(drawn.outputLMin) &&
        shown.angle === dialAngleFor(drawn.mapMmHg),
    }),
    restBoxes,
    /** How deep the heart is squeezed this frame (0–1), and how far the cells have moved in all: whether it is alive, for a check. */
    motion: () => ({ ...moving }),
    /**
     * Points on the drawing, in world space, read off the meshes as they are
     * drawn — not off the values they were set from — so a check reads the
     * level and the needle the way a reader does: on screen.
     */
    marks() {
      const at = (node, x, y) => node.localToWorld(new THREE.Vector3(x, y, 0));
      return {
        jugFloor: at(jug, 0, 0),
        jugTop: at(jug, 0, H),
        level: fill.localToWorld(new THREE.Vector3(0, 0.5, 0)),
        before: beforeLine.visible ? at(beforeLine, 0, 0) : null,
        hub: at(needle, 0, 0),
        tip: at(needle, needleLength, 0),
        beforeTip: ghostNeedle.visible ? at(ghostNeedle, ghostLength, 0) : null,
        calibre: bed.userData.calibre ?? null,
        beforeCalibre: sleeves.visible ? sleeves.userData.calibre : null,
      };
    },
    dispose() {
      heart.dispose();
      for (const thing of disposables) thing.dispose?.();
      object.traverse((node) => node.geometry?.dispose?.());
    },
  };
}
