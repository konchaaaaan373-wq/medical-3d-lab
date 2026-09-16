import * as THREE from 'three';

import {
  ANNOTATIONS, DISCLAIMER, DISCLAIMER_JA, DISCLAIMER_SHORT, DISCLAIMER_SHORT_JA,
  LEGEND, METRICS, MODEL_CONTROLS, MODEL_CONTROLS_COPY, MODEL_SCOPE, PALETTE,
  PROGRESS_LABEL, RANGE, RELATED, STAGES, VISUAL_MAPPING,
} from '../../../../data/retinalDetachment.js';
import { DEFAULT_CONTROLS, GLOBE, solveRetinalDetachment } from '../../../../models/retinalDetachment.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { NASAL, SITES, buildEyeball } from '../../organs/eyeball.js';

/**
 * A separated retina, drawn as a cap on a sphere.
 *
 * ### The separation is a second surface, not a recolouring
 *
 * The atlas's retina is one closed shell. A detachment drawn by tinting part of
 * it would be a claim about colour; what the model computes is that a surface
 * has *left* another one, so the scene builds **a second surface** — the same
 * sphere, over the cap the model solved, standing off by the model's lift — and
 * leaves the atlas's own retina where it is underneath. The gap between them is
 * the claim, and it is a gap a reader can see round the edge of the patch.
 *
 * ### The macula is the only thing that changes colour
 *
 * Because it is the only two-valued thing in the model. Everything else that
 * changes is a shape.
 */
/** Whether a read-out value is a number, and so whether its unit belongs beside it. */
const reads = (value) => String(value).trim() !== '' && Number.isFinite(Number(value));

export class RetinalDetachmentScene {
  static meta = {
    id: 'retinal-detachment',
    status: 'alpha',
    title: 'Retinal detachment: where, not how much',
    titleJa: '網膜剥離：広さではなく位置',
    subtitle: 'A small separation can have the macula in it and a large one can miss it entirely',
    subtitleJa: '小さな剥離が黄斑を含むこともあれば、大きな剥離が黄斑を全く含まないこともあります',
    stages: STAGES, related: RELATED, visualMapping: VISUAL_MAPPING, legend: LEGEND,
    range: RANGE, progressLabel: PROGRESS_LABEL, palette: PALETTE,
    modelScope: MODEL_SCOPE, modelControls: MODEL_CONTROLS_COPY,
    disclaimer: DISCLAIMER, disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: DISCLAIMER_SHORT, disclaimerShortJa: DISCLAIMER_SHORT_JA,
  };

  static cameraPose = {
    position: new THREE.Vector3(2.1, 1.1, 2.6),
    target: new THREE.Vector3(0, 0, -0.25),
  };

  /**
   * Which way each named origin lies on the globe, as a direction from its
   * centre.
   *
   * **Semantic geometry.** The model names an origin and says how many degrees
   * it is from the macula; only this table says which way that is, and the
   * angles it produces are what `tests/calibration.test.js` checks against the
   * model's own figures.
   */
  static ORIGIN_DIRECTION = Object.freeze({
    superior: new THREE.Vector3(0, 1, -0.15).normalize(),
    temporal: new THREE.Vector3(-NASAL, 0, -0.15).normalize(),
    inferior: new THREE.Vector3(0, -1, -0.15).normalize(),
    posterior: new THREE.Vector3(NASAL * 0.14, 0.16, -1).normalize(),
  });

  /** How solid the front of the eye is drawn, so the back of it can be seen. */
  static FRONT_OPACITY = 0.16;

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = RetinalDetachmentScene.meta.id;
    this.progress = 1;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solveRetinalDetachment(this.progress, this.controls);
    this.anchorVectors = {
      retina: new THREE.Vector3(), macula: new THREE.Vector3(),
      separated: new THREE.Vector3(), origin: new THREE.Vector3(), lens: new THREE.Vector3(),
    };
  }

  build() {
    this.root.add(createStudioLights());
    this.eye = buildEyeball({
      colors: { retina: PALETTE.retina, choroid: PALETTE.choroid, sclera: PALETTE.sclera, macula: PALETTE.macula },
    });
    this.root.add(this.eye.object);

    // Everything in front of the retina is context: an opaque cornea, iris and
    // lens put the whole subject behind three surfaces.
    for (const id of ['cornea', 'iris', 'lens', 'sclera', 'vitreous-body', 'anterior-chamber', 'ciliary-body', 'pupil']) {
      const mesh = this.eye.mesh(id);
      if (!mesh?.material) continue;
      mesh.material.transparent = true;
      mesh.material.opacity = id === 'lens' ? 0.3 : RetinalDetachmentScene.FRONT_OPACITY;
      mesh.material.depthWrite = false;
    }
    this.macula = this.eye.mesh('macula');

    // The separated retina: a second surface over the cap the model solved. A
    // sphere with its polar cap kept, rotated to the origin and scaled out by
    // the model's lift, so the gap round its edge is the separation itself.
    this.sheetMaterial = new THREE.MeshStandardMaterial({
      color: PALETTE.separated, roughness: 0.55, side: THREE.DoubleSide,
      transparent: true, opacity: 0.92, emissive: new THREE.Color(PALETTE.separated), emissiveIntensity: 0.16,
    });
    this.sheet = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, 0.1), this.sheetMaterial);
    this.sheet.name = 'separated-retina';
    this.root.add(this.sheet);

    this.applyModelToScene();
    return this.root;
  }

  setProgress(value) { this.progress = clamp(value); this.solve(); }
  setModelControl(id, value) { this.controls[id] = value; this.solve(); }
  getModelControls() { return MODEL_CONTROLS.map((c) => ({ ...c, value: this.controls[c.id] })); }
  resetModelControls() { this.controls = { ...DEFAULT_CONTROLS }; this.solve(); }
  solve() { this.solved = solveRetinalDetachment(this.progress, this.controls); this.applyModelToScene(); }
  update() {}

  // --- the model on screen --------------------------------------------------

  /** Which way the separation's origin lies, or null when there is none. */
  originDirection() {
    return RetinalDetachmentScene.ORIGIN_DIRECTION[this.solved.controls.origin] ?? null;
  }

  applyModelToScene() {
    const solved = this.solved;
    const direction = this.originDirection();

    if (this.sheet) {
      this.sheet.visible = solved.separated && solved.halfAngle > 0.5;
      if (this.sheet.visible && direction) {
        // The cap is rebuilt at the model's half-angle rather than scaled, so
        // the drawn edge is the solved edge rather than a stretched likeness.
        const half = (solved.halfAngle * Math.PI) / 180;
        this.sheet.geometry.dispose();
        this.sheet.geometry = new THREE.SphereGeometry(1, 48, 28, 0, Math.PI * 2, 0, half);
        this.sheet.scale.setScalar(GLOBE.retina[0] + solved.lift);
        // A sphere's cap is built about +y, so the sheet is turned to face the
        // named origin rather than the origin being turned into a coordinate.
        this.sheet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
      }
    }

    // The one two-valued thing in the model is the one thing that recolours.
    if (this.macula) this.macula.material.color.set(solved.macula === 'off' ? PALETTE.maculaOff : PALETTE.macula);

    this.updateAnchors();
  }

  updateAnchors() {
    const { anchorVectors, solved } = this;
    // Above the globe's equator rather than below it: the explanation panel
    // takes the lower third of the screen, so a label hung under the eye lands
    // behind it.
    anchorVectors.retina.set(NASAL * 1.3, 0.72, -0.55);
    anchorVectors.macula.set(...SITES.fovea).multiplyScalar(1.4).add(new THREE.Vector3(0, -0.42, 0));
    anchorVectors.lens.set(...SITES.lens).add(new THREE.Vector3(NASAL * 0.9, 0.55, 0.2));

    const direction = this.originDirection();
    if (direction) {
      anchorVectors.origin.copy(direction).multiplyScalar(1.45);
      // Halfway between where it started and the macula, so the label for the
      // separated region sits on the region rather than off one of its edges.
      const macula = new THREE.Vector3(...SITES.fovea).normalize();
      anchorVectors.separated
        .copy(direction)
        .lerp(macula, Math.min(0.5, solved.extent * 0.55))
        .normalize()
        .multiplyScalar(1.5);
    }
  }

  // --- what the interface reads --------------------------------------------

  static guideFramings = Object.freeze({
    eye: Object.freeze({ target: new THREE.Vector3(0, 0, -0.25), distance: 3.6, direction: new THREE.Vector3(2.1, 0.9, 2.6).normalize() }),
    back: Object.freeze({ target: new THREE.Vector3(0, -0.05, -0.5), distance: 3.0, direction: new THREE.Vector3(1.8, 0.7, 1.6).normalize() }),
    macula: Object.freeze({ target: new THREE.Vector3(0, -0.15, -0.6), distance: 2.6, direction: new THREE.Vector3(1.1, 0.55, 1.2).normalize() }),
  });

  getGuideFramings() { return RetinalDetachmentScene.guideFramings; }
  getVisualMapping() { return VISUAL_MAPPING; }

  getAnnotations() {
    const drawn = { separated: () => this.solved.separated, origin: () => this.solved.separated };
    return ANNOTATIONS.map((a) => ({ ...a, position: this.anchorVectors[a.anchor], isDrawn: drawn[a.id] }));
  }

  getMetrics() {
    const solved = this.solved;
    const value = {
      macula: !solved.separated ? 'nothing has separated' : solved.macula === 'off' ? 'yes — it is inside it' : 'no — it is outside it',
      area: Math.round(solved.areaFraction * 100),
      reach: Math.round(solved.halfAngle),
      short: solved.degreesShort === null ? '—' : Math.round(solved.degreesShort),
      // Printed rather than omitted: the absence is the claim.
      vision: 'not in this model',
    };
    // A unit belongs to a number. Where a row falls back to a word — "—" when
    // there is nothing to be short of — the degree sign beside it reads as a
    // measurement of the dash.
    return METRICS.map((m) => ({ ...m, value: value[m.id], unit: reads(value[m.id]) ? m.unit : '' }));
  }

  dispose() {
    this.sheet?.geometry.dispose();
    this.sheetMaterial?.dispose();
    this.eye?.dispose?.();
    disposeObject(this.root);
  }
}
