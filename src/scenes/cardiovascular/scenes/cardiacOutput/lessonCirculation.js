import * as THREE from 'three';
import { Chamber } from '../heartFailure/Chamber.js';
import { ValveApparatus } from '../heartFailure/ValveApparatus.js';
import { BloodField } from '../heartFailure/BloodField.js';
import { ANATOMY, buildCavityBlood } from '../heartFailure/anatomy.js';
import {
  APEX_PINNING,
  TORSION_ILLUSTRATIVE_MAX,
  VENTRICLE_SHAPING,
} from '../heartFailure/geometry/ventricleGeometry.js';
import { TubeSurface, smoothCurve } from '../../../shared/geometry/tube.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { bedCalibreFor, flowRateFor } from './circuit.js';
import { CONTROL_DOMAIN, REFERENCE_GEOMETRY } from '../../../../models/cardiacOutput.js';
import { cavityVolumeAt, ventricleShape } from '../../../../models/cardiacMechanics.js';
import { PALETTE } from '../../../../data/cardiacOutput.js';
import { clamp, smoothstep } from '../../../../utils/math.js';

/**
 * One circulation of the introductory lesson, drawn so that three things can
 * be told apart at first sight and compared across two circulations:
 *
 * - **the heart** — the same cut-open left ventricle as the full model, its
 *   size at every moment the solved volume;
 * - **the small vessels of the whole body** — the systemic resistance, drawn
 *   as a fan of many thin vessels that narrow **together and along their whole
 *   length**. Never a ring on one tube: a ring reads as a stenosis, a local
 *   lesion, which is the opposite of what a vasoconstrictor does to
 *   resistance (owner's review of the full model, 2026-09-27, kept here);
 * - **the blood one beat sends out** — a bright length growing out of the
 *   aortic valve as the ventricle empties, as long as the volume that has
 *   crossed the valve so far (`EDV − V(phase)`), whole at the end of ejection.
 *   Blood in a tube of fixed calibre occupies a length in proportion to its
 *   volume, so the ratio of two lengths is the ratio of two stroke volumes.
 *
 * and one instrument: **a dial reading the mean arterial pressure**, the
 * solved time-average, on a fixed scale.
 *
 * ## What is the model's and what is the drawing's
 *
 * The model's: the chamber's volume at each phase, the stroke volume (the
 * blood's length, in proportion), the mean pressure (the needle), which way
 * and how far the resistance moved (the vessels' calibre, in order), and the
 * output (how fast the blood in the vessels moves). The drawing's: every
 * scale factor, the path lengths, the number of vessels, the dial's range,
 * and how long the blood stays at the valve after ejection before it moves on
 * — that pause exists so two circulations can be compared at one moment. None
 * of those scale factors is a measurement, and the model card says so.
 *
 * ## "Before" is drawn as marks, never as a second heart
 *
 * While the lesson compares B with the A it came from, A is drawn **inside
 * this circulation** as cream marks — a needle, a sleeve round the blood, a
 * sleeve round each vessel — the same colour the full model uses for "before".
 * A different circulation (C) is never drawn this way: it is its own unit,
 * beside this one.
 *
 * Coordinates are the heart's (`ANATOMY`): the valve plane at y 1.6, the
 * ventricle hanging below it, the cut wedge facing +z.
 */

/** The direction the lesson looks from, in the unit's own frame — the full model's hero angle. */
export const LESSON_VIEW_DIRECTION = new THREE.Vector3(0.34, 0.2, 0.92).normalize();

/** Screen-right in the unit's frame, seen along `LESSON_VIEW_DIRECTION`. */
const SCREEN_RIGHT = new THREE.Vector3(0.92, 0, -0.34).normalize();

/** Out of the aortic valve, up over the heart and down to the small vessels on its right. */
const ARTERY = smoothCurve([
  [ANATOMY.aorticValve.x, ANATOMY.aorticValve.y + 0.3, ANATOMY.aorticValve.z],
  [-1.4, 3.1, 0.3],
  [-0.7, 4.3, 0.15],
  [1.2, 4.85, -0.05],
  [3.25, 4.5, -0.25],
  [4.55, 3.3, -0.4],
]);

/** Where the artery ends and the bed begins, and where the bed ends. */
const BED_INLET = ARTERY.getPointAt(1);
const BED_OUTLET = new THREE.Vector3(4.75, -4.1, -0.45);
const BED_VESSELS = 8;
/** Resting radius of one small vessel, before the calibre scale. */
const BED_RADIUS = 0.15;

function bedCurves() {
  return Array.from({ length: BED_VESSELS }, (_, i) => {
    const k = i / (BED_VESSELS - 1);
    const bow = 0.45 + 2.7 * k;
    return new THREE.CubicBezierCurve3(
      BED_INLET.clone(),
      BED_INLET.clone().add(new THREE.Vector3(0.05, -2.0, 0)).addScaledVector(SCREEN_RIGHT, bow),
      BED_OUTLET.clone().add(new THREE.Vector3(0, 2.0, 0)).addScaledVector(SCREEN_RIGHT, bow),
      BED_OUTLET.clone()
    );
  });
}

/** Where the dial stands: left of the ascending artery, clear of the heart. */
const GAUGE_CENTRE = new THREE.Vector3(-4.7, 3.45, 0.6);
const GAUGE_RADIUS = 1.35;
/** The dial's range and sweep: 0 at lower left, the top of the range at lower right. */
export const GAUGE_RANGE_MMHG = 150;
const GAUGE_START = (210 * Math.PI) / 180;
const GAUGE_SWEEP = (240 * Math.PI) / 180;

/** The needle's angle for a pressure, radians in the dial's plane (0 = +x, counter-clockwise). */
export function gaugeAngle(pressureMmHg) {
  return GAUGE_START - GAUGE_SWEEP * clamp(pressureMmHg / GAUGE_RANGE_MMHG);
}

/**
 * Length of blood per millilitre along the artery — a drawing scale, chosen so
 * the difference between two strokes is a difference a reader sees: the artery
 * is about 9 units long, and the largest stroke in the lesson (C, about 68 mL)
 * fills about three quarters of it.
 */
export const BLOOD_UNITS_PER_ML = 0.1;

/**
 * After ejection the stroke stays at the valve for this fraction of the beat
 * before moving on, then travels for `TRAVEL`. Presentation timing only — it
 * is what makes "stop at the same moment and compare" possible.
 */
export const DWELL = 0.12;
const TRAVEL = 0.3;


/**
 * Points on the outside of what the unit draws, in its own frame — what the
 * camera is fitted to.
 *
 * A box is not: the camera looks down on the unit, so the near-bottom corner
 * of a box round it projects well below the apex, and a fit to the box left a
 * fifth of the band empty under the heart. These follow the drawing — the
 * chamber at its fullest as rings, the arch, the outermost vessels, the dial —
 * plus room above the arch for the chip that names the circulation.
 */
export const UNIT_HULL = Object.freeze(
  (() => {
    const points = [];
    const ring = (y, radius, count = 10) => {
      for (let k = 0; k < count; k++) {
        const angle = (k / count) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius));
      }
    };
    ring(2.0, 3.8);
    ring(-1.5, 3.9);
    ring(-5.2, 2.9);
    points.push(new THREE.Vector3(0.2, -7.8, 0.3));
    for (let i = 0; i <= 10; i++) {
      const at = ARTERY.getPointAt(i / 10);
      points.push(at.clone().add(new THREE.Vector3(0, 0.4, 0)), at.clone().add(new THREE.Vector3(0, -0.4, 0)));
    }
    for (const curve of [bedCurves()[0], bedCurves().at(-1)]) {
      for (let i = 0; i <= 8; i++) points.push(curve.getPoint(i / 8).addScaledVector(SCREEN_RIGHT, 0.25));
    }
    for (let k = 0; k < 12; k++) {
      const angle = (k / 12) * Math.PI * 2;
      points.push(GAUGE_CENTRE.clone().add(new THREE.Vector3(Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, 0)));
    }
    // The chip over the arch.
    points.push(new THREE.Vector3(1.2, 6.6, 0));
    return points.map((point) => Object.freeze(point));
  })()
);

/**
 * Where the unit's drawing reaches, in its own frame: the box round the hull.
 * Its centre is what a unit is placed by and turned about, so a camera on the
 * view axis through the middle of two units is the same distance from both.
 */
export const UNIT_BOX = Object.freeze(
  (() => {
    const box = new THREE.Box3().setFromPoints(UNIT_HULL);
    return { min: box.min, max: box.max };
  })()
);

/** Anchors a tag or a chip hangs from, in the unit's frame. */
const ANCHORS = {
  heart: new THREE.Vector3(-3.1, -2.4, 1.2),
  bed: BED_INLET.clone().lerp(BED_OUTLET, 0.45).addScaledVector(SCREEN_RIGHT, 2.9),
  gauge: GAUGE_CENTRE.clone().add(new THREE.Vector3(0, GAUGE_RADIUS + 0.25, 0)),
  chip: new THREE.Vector3(1.2, 5.6, 0),
};

/**
 * A stroke's place on the artery at `phase`, from its own solved timing.
 *
 * @returns {{ tail: number, head: number, fade: number } | null} arc-length
 *   fractions along the artery, or null when no stroke is on screen
 */
export function strokeOnArtery(phase, metrics, cycle, arteryLength) {
  const start = metrics.ejectionStartPhase;
  const end = metrics.ejectionEndPhase;
  const since = (((phase - start) % 1) + 1) % 1;
  const ejection = (((end - start) % 1) + 1) % 1;
  const origin = 0.03;
  const toLength = (volumeMl) => (BLOOD_UNITS_PER_ML * volumeMl) / arteryLength;
  if (since <= ejection) {
    const ejected = Math.max(0, metrics.edvMl - cavityVolumeAt(phase, { cycle }));
    return { tail: origin, head: origin + toLength(ejected), fade: 1 };
  }
  const full = toLength(metrics.strokeVolumeMl);
  const after = since - ejection;
  if (after <= DWELL) return { tail: origin, head: origin + full, fade: 1 };
  const moving = (after - DWELL) / TRAVEL;
  if (moving >= 1) return null;
  const shift = moving * (1 - origin);
  return { tail: origin + shift, head: origin + full + shift, fade: 1 - smoothstep(0.45, 1, moving) };
}

export class LessonCirculation extends THREE.Group {
  /**
   * @param {{ name: string, compact?: boolean, myocardialVolumeMl: number }} options
   */
  constructor({ name, compact = false, myocardialVolumeMl }) {
    super();
    this.name = name;
    this.myocardialVolumeMl = myocardialVolumeMl;
    this._highlight = new Set();
    this._level = {};
    this._opacity = 1;

    // The heart: the full model's chamber, valves and cavity blood.
    this.ventricle = new Chamber({
      cutAngle: ANATOMY.cutAngle,
      segments: compact ? 36 : 52,
      profilePoints: compact ? 20 : 28,
      variant: 'disease',
    });
    this.apparatus = new ValveApparatus({ variant: 'disease' });
    this._bloodBuffers = buildCavityBlood(compact ? 320 : 480, 90210, {
      exitCurve: ARTERY,
      exitRange: [0.02, 0.28],
      entryCurve: smoothCurve([
        [ANATOMY.mitralValve.x + 0.1, ANATOMY.mitralValve.y + 1.1, ANATOMY.mitralValve.z - 0.2],
        [ANATOMY.mitralValve.x, ANATOMY.mitralValve.y + 0.2, ANATOMY.mitralValve.z],
      ]),
      entryRange: [0.3, 0.95],
    });
    this.blood = new BloodField(this._bloodBuffers, { flowColor: PALETTE.flow, staticColor: PALETTE.residual });
    this.blood.material.uniforms.uOpacity.value = 0.34;
    this.heart = new THREE.Group();
    this.heart.name = 'heart';
    this.heart.add(this.ventricle, this.apparatus, this.blood);

    // The artery: a see-through wall, so the blood in it is what is read.
    this.arteryLength = ARTERY.getLength();
    const arteryTube = new TubeSurface(ARTERY, { radius: () => 0.32, steps: compact ? 56 : 80, radial: compact ? 12 : 16 });
    this.arteryMaterial = tissueMaterial({ color: '#7a2c3c', roughness: 0.4, emissive: '#7a2c3c', emissiveIntensity: 0.04, opacity: 0.38 });
    this.artery = new THREE.Mesh(arteryTube.geometry, this.arteryMaterial);
    this.artery.name = 'artery';

    // The small vessels: one material, so all of them narrow and brighten together.
    this.bedPaths = bedCurves();
    this.bedMaterial = tissueMaterial({ color: PALETTE.resistance, roughness: 0.45, emissive: PALETTE.resistance, emissiveIntensity: 0.14, opacity: 0.85 });
    this.bedTubes = this.bedPaths.map((curve) => new TubeSurface(curve, { radius: () => BED_RADIUS, steps: compact ? 20 : 30, radial: compact ? 7 : 9 }));
    this.bed = new THREE.Group();
    this.bed.name = 'small-vessels';
    for (const tube of this.bedTubes) this.bed.add(new THREE.Mesh(tube.geometry, this.bedMaterial));
    // "Before": each vessel's calibre in A, as a faint cream sleeve.
    this.bedBeforeMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.before, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    this.bedBeforeTubes = this.bedPaths.map((curve) => new TubeSurface(curve, { radius: () => BED_RADIUS, steps: compact ? 16 : 24, radial: compact ? 7 : 9 }));
    this.bedBefore = new THREE.Group();
    this.bedBefore.name = 'small-vessels-before';
    for (const tube of this.bedBeforeTubes) this.bedBefore.add(new THREE.Mesh(tube.geometry, this.bedBeforeMaterial));
    this.bedBefore.visible = false;

    // The blood one beat sends out, and A's, as a sleeve round it.
    this.stroke = createStroke({ radius: 0.28, steps: compact ? 90 : 140, radial: compact ? 10 : 14, color: PALETTE.flow, opacity: 0.95, name: 'stroke' });
    this.strokeBefore = createStroke({ radius: 0.44, steps: compact ? 90 : 140, radial: 12, color: PALETTE.before, opacity: 0.3, name: 'stroke-before', doubleSide: true });

    // Blood moving through the artery and the small vessels, at a rate set by the output.
    this.arterialFlow = createFlowStream({ curves: [ARTERY], count: compact ? 50 : 80, color: PALETTE.flow, size: 5, speed: 0.22, spread: 0.07, seed: 4021, opacity: 0.45 });
    this.bedFlow = createFlowStream({ curves: this.bedPaths, count: compact ? 60 : 100, color: PALETTE.flow, size: 3.8, speed: 0.3, spread: 0.015, seed: 7717, opacity: 0.55 });

    // The dial, and the line that carries the artery's pressure to it.
    this.gauge = createGauge();
    this.gauge.object.position.copy(GAUGE_CENTRE);
    this.gauge.object.lookAt(GAUGE_CENTRE.clone().add(LESSON_VIEW_DIRECTION));
    const lineCurve = smoothCurve([
      [-1.4, 3.1, 0.3],
      [-2.6, 2.7, 0.45],
      [GAUGE_CENTRE.x + 0.1, GAUGE_CENTRE.y - GAUGE_RADIUS - 0.05, GAUGE_CENTRE.z],
    ]);
    this.lineMaterial = new THREE.MeshStandardMaterial({ color: '#8e9bb0', roughness: 0.6, transparent: true, opacity: 0.8 });
    this.line = new THREE.Mesh(new TubeSurface(lineCurve, { radius: () => 0.06, steps: 20, radial: 6 }).geometry, this.lineMaterial);
    this.line.name = 'pressure-line';

    this.add(
      this.heart,
      this.artery,
      this.bed,
      this.bedBefore,
      this.stroke.mesh,
      this.strokeBefore.mesh,
      this.arterialFlow.object,
      this.bedFlow.object,
      this.gauge.object,
      this.line
    );

    this.solved = null;
    this.reference = null;
    this._drawnCalibre = null;
    this._drawnBeforeCalibre = null;
  }

  /**
   * The solved beat this circulation is drawn from, and the one it is
   * compared with ("before", A), or null.
   *
   * @param {{ metrics: object, cycle: object, input: object }} solved
   * @param {{ metrics: object, cycle: object, input: object } | null} reference
   */
  setSolved(solved, reference = null) {
    this.solved = solved;
    this.reference = reference;
    const m = solved.metrics;
    this.edShape = ventricleShape({
      cavityVolumeMl: m.edvMl,
      myocardialVolumeMl: this.myocardialVolumeMl,
      longToShortAxisRatio: REFERENCE_GEOMETRY.longToShortAxisRatio,
    });
    this.blood.setEjectionWindow(m.ejectionStartPhase, m.ejectionEndPhase);

    const calibre = bedCalibreFor(m.systemicResistanceMmHgSPerMl, CONTROL_DOMAIN.systemicResistanceMmHgSPerMl);
    if (calibre !== this._drawnCalibre) {
      for (const tube of this.bedTubes) tube.refresh((u, base) => base * calibre);
      this._drawnCalibre = calibre;
    }
    this.calibre = calibre;
    this._flowRate = flowRateFor(m.cardiacOutputLMin);

    this.gauge.setPressure(m.meanArterialPressureMmHg);
    const before = reference?.metrics ?? null;
    this.gauge.setBefore(before ? before.meanArterialPressureMmHg : null);
    this.bedBefore.visible = Boolean(before);
    if (before) {
      const beforeCalibre = bedCalibreFor(before.systemicResistanceMmHgSPerMl, CONTROL_DOMAIN.systemicResistanceMmHgSPerMl);
      if (beforeCalibre !== this._drawnBeforeCalibre) {
        // A hair wider than the vessel it sleeves, so an unchanged calibre still shows as a sleeve.
        for (const tube of this.bedBeforeTubes) tube.refresh((u, base) => base * beforeCalibre * 1.04);
        this._drawnBeforeCalibre = beforeCalibre;
      }
    }
  }

  /**
   * One frame.
   *
   * @param {{ phase: number, dt: number, clock: number, frozen: boolean }} frame
   */
  update({ phase, dt, clock, frozen }) {
    if (!this.solved) return;
    const m = this.solved.metrics;
    const cycle = this.solved.cycle;

    // The chamber at this phase, apex pinned (the full model's rule).
    const shape = ventricleShape({
      cavityVolumeMl: cavityVolumeAt(phase, { cycle }),
      myocardialVolumeMl: this.myocardialVolumeMl,
      longToShortAxisRatio: REFERENCE_GEOMETRY.longToShortAxisRatio,
    });
    const descent = (shape.outerSemiLength - this.edShape.outerSemiLength) * APEX_PINNING;
    this.ventricle.position.y = descent;
    this.blood.setDescent(descent);
    const emptied = clamp((m.edvMl - cavityVolumeAt(phase, { cycle })) / Math.max(1, m.edvMl - m.esvMl));
    this.ventricle.setTorsion(TORSION_ILLUSTRATIVE_MAX * emptied * Math.min(1, m.ejectionFraction / 0.58));
    this.ventricle.setShape({ ...shape, baseY: ANATOMY.baseY });
    this.apparatus.update({ ...shape, baseY: ANATOMY.baseY }, phase, m, descent);
    this.blood.setCavity(shape.cavityRadius, shape.cavitySemiLength);
    this.blood.setApexDrift(VENTRICLE_SHAPING.apexDriftX * shape.outerSemiLength, VENTRICLE_SHAPING.apexDriftZ * shape.outerSemiLength);
    this.blood.setCycle(phase, m.ejectionFraction);
    if (!frozen) this.blood.update(clock);

    // The stroke, and A's beside it at the same moment of the beat.
    const level = (id) => this._level[id] ?? 0;
    this.stroke.set(strokeOnArtery(phase, m, cycle, this.arteryLength), 1 + level('ejected') * 0.25);
    const before = this.reference;
    this.strokeBefore.set(before ? strokeOnArtery(phase, before.metrics, before.cycle, this.arteryLength) : null, 1);

    // Blood in the vessels: stopped with the beat, otherwise at the output's rate.
    const rate = frozen ? 0 : this._flowRate;
    this.arterialFlow.setRate(rate);
    this.bedFlow.setRate(rate);
    this.arterialFlow.update(dt);
    this.bedFlow.update(dt);

    this._applyHighlight(dt, clock);
  }

  /** Parts to point at: any of `heart`, `ejected`, `bed`, `gauge`. Presentation only. */
  setHighlight(parts = []) {
    this._highlight = new Set(parts);
  }

  _applyHighlight(dt, clock) {
    const pulse = 0.72 + 0.28 * Math.sin(clock * 5);
    for (const id of ['heart', 'ejected', 'bed', 'gauge']) {
      const target = this._highlight.has(id) ? 1 : 0;
      const current = this._level[id] ?? 0;
      this._level[id] = current + (target - current) * Math.min(1, dt * 6);
    }
    const at = (id) => this._level[id] * pulse;
    this.bedMaterial.emissiveIntensity = 0.14 + at('bed') * 0.75;
    this.gauge.setHighlight(at('gauge'));
    for (const material of this.ventricle.material) {
      if (!material.emissive) continue;
      material.userData.baseEmissive ??= material.emissive.clone().multiplyScalar(material.emissiveIntensity);
      material.emissive.copy(material.userData.baseEmissive).lerp(HEART_HIGHLIGHT, at('heart') * 0.3);
      material.emissiveIntensity = 1;
    }
  }

  /**
   * A named point of this circulation, in world space.
   *
   * @param {'heart'|'ejected'|'bed'|'gauge'|'chip'} part
   * @returns {THREE.Vector3 | null}
   */
  anchor(part) {
    this.updateWorldMatrix(true, false);
    if (part === 'ejected') {
      // A fixed point on the arch the stroke runs along — not the moving
      // stroke itself, whose tag would chase it round the arch every beat and,
      // on a phone, settle on the dial beside the rising artery.
      return this.localToWorld(ARTERY.getPointAt(0.42).clone());
    }
    const local = ANCHORS[part];
    return local ? this.localToWorld(local.clone()) : null;
  }

  /** The eight corners of the unit's drawing, in world space. */
  worldCorners() {
    this.updateWorldMatrix(true, false);
    const corners = [];
    for (const x of [UNIT_BOX.min.x, UNIT_BOX.max.x]) {
      for (const y of [UNIT_BOX.min.y, UNIT_BOX.max.y]) {
        for (const z of [UNIT_BOX.min.z, UNIT_BOX.max.z]) corners.push(this.localToWorld(new THREE.Vector3(x, y, z)));
      }
    }
    return corners;
  }

  /** What a test reads: the drawing quantities, never presented as medical outputs. */
  presentationState() {
    return {
      calibre: this.calibre,
      bedVessels: this.bedTubes.length,
      strokeLength: this.stroke.length,
      beforeStrokeLength: this.strokeBefore.mesh.visible ? this.strokeBefore.length : null,
      needleAngle: this.gauge.angle,
      beforeNeedleAngle: this.gauge.beforeAngle,
      flowRate: this._flowRate,
    };
  }

  syncViewport(camera, renderer) {
    this.blood.syncViewport(camera, renderer);
  }

  dispose() {
    this.apparatus.dispose();
    this.arterialFlow.dispose();
    this.bedFlow.dispose();
    this.gauge.dispose();
  }
}

const HEART_HIGHLIGHT = new THREE.Color('#ff9a7a');

/**
 * A length of the artery, from `tail` to `head` (arc-length fractions). Rebuilt
 * only when an end has moved by a visible step.
 */
function createStroke({ radius, steps, radial, color, opacity, name, doubleSide = false }) {
  const tube = new TubeSurface(ARTERY, { radius: () => 0, steps, radial });
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(tube.geometry, material);
  mesh.name = name;
  mesh.visible = false;
  mesh.renderOrder = 2;
  let drawn = null;
  const state = {
    mesh,
    length: 0,
    span: null,
    set(span, gain = 1) {
      state.span = span;
      if (!span || !(span.head > span.tail)) {
        mesh.visible = false;
        state.length = 0;
        return;
      }
      state.length = span.head - span.tail;
      const tail = Math.round(span.tail * 500) / 500;
      const head = Math.round(Math.min(1, span.head) * 500) / 500;
      const key = `${tail}|${head}`;
      if (key !== drawn) {
        drawn = key;
        const edge = 0.01;
        tube.refresh((u) => {
          if (u < tail - edge || u > head + edge) return 0;
          return radius * smoothstep(tail - edge, tail + edge, u) * (1 - smoothstep(head - edge, head + edge, u));
        });
      }
      material.opacity = Math.min(1, opacity * gain) * span.fade;
      mesh.visible = material.opacity > 0.01;
    },
  };
  return state;
}

/**
 * The dial: a face, the range as a grey arc, the value as a red arc and a
 * needle, and — while there is one — the "before" needle in cream.
 */
function createGauge() {
  const object = new THREE.Group();
  object.name = 'pressure-gauge';
  const faceMaterial = new THREE.MeshBasicMaterial({ color: '#141b28', transparent: true, opacity: 0.92 });
  const face = new THREE.Mesh(new THREE.CircleGeometry(GAUGE_RADIUS, 48), faceMaterial);
  const rimMaterial = new THREE.MeshStandardMaterial({ color: '#c9d3e3', roughness: 0.35, metalness: 0.3, emissive: '#c9d3e3', emissiveIntensity: 0.05 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(GAUGE_RADIUS, 0.07, 10, 64), rimMaterial);
  const track = new THREE.Mesh(
    new THREE.RingGeometry(GAUGE_RADIUS * 0.72, GAUGE_RADIUS * 0.86, 64, 1, GAUGE_START - GAUGE_SWEEP, GAUGE_SWEEP),
    new THREE.MeshBasicMaterial({ color: '#39445a' })
  );
  track.position.z = 0.01;
  const valueMaterial = new THREE.MeshBasicMaterial({ color: '#ff6f86' });
  const value = new THREE.Mesh(new THREE.BufferGeometry(), valueMaterial);
  value.position.z = 0.02;
  const tickMaterial = new THREE.MeshBasicMaterial({ color: '#9aa7bd' });
  for (let p = 0; p <= GAUGE_RANGE_MMHG; p += 50) {
    const angle = gaugeAngle(p);
    const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.045), tickMaterial);
    tick.position.set(Math.cos(angle) * GAUGE_RADIUS * 0.94, Math.sin(angle) * GAUGE_RADIUS * 0.94, 0.02);
    tick.rotation.z = angle;
    object.add(tick);
  }
  const needleMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const needle = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.PlaneGeometry(GAUGE_RADIUS * 0.8, 0.075), needleMaterial);
  blade.position.x = GAUGE_RADIUS * 0.4;
  needle.add(blade);
  needle.position.z = 0.04;
  const beforeMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.before, transparent: true, opacity: 0.9 });
  const beforeNeedle = new THREE.Group();
  const beforeBlade = new THREE.Mesh(new THREE.PlaneGeometry(GAUGE_RADIUS * 0.84, 0.05), beforeMaterial);
  beforeBlade.position.x = GAUGE_RADIUS * 0.42;
  beforeNeedle.add(beforeBlade);
  beforeNeedle.position.z = 0.035;
  beforeNeedle.visible = false;
  const hub = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), needleMaterial);
  hub.position.z = 0.05;
  object.add(face, rim, track, value, beforeNeedle, needle, hub);

  let drawnPressure = null;
  const state = {
    object,
    angle: null,
    beforeAngle: null,
    setPressure(pressure) {
      const angle = gaugeAngle(pressure);
      state.angle = angle;
      needle.rotation.z = angle;
      const rounded = Math.round(pressure * 4) / 4;
      if (rounded !== drawnPressure) {
        drawnPressure = rounded;
        value.geometry.dispose();
        value.geometry = new THREE.RingGeometry(GAUGE_RADIUS * 0.72, GAUGE_RADIUS * 0.86, 64, 1, angle, GAUGE_START - angle);
      }
    },
    setBefore(pressure) {
      beforeNeedle.visible = pressure != null;
      state.beforeAngle = pressure != null ? gaugeAngle(pressure) : null;
      if (pressure != null) beforeNeedle.rotation.z = state.beforeAngle;
    },
    setHighlight(amount) {
      rimMaterial.emissiveIntensity = 0.05 + amount * 0.9;
      rimMaterial.emissive.set(amount > 0.02 ? '#ffe08a' : '#c9d3e3');
    },
    dispose() {
      value.geometry.dispose();
    },
  };
  return state;
}
