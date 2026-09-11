import * as THREE from 'three';

import {
  ANNOTATIONS,
  DISCLAIMER,
  DISCLAIMER_JA,
  DISCLAIMER_SHORT,
  DISCLAIMER_SHORT_JA,
  LEGEND,
  METRICS,
  MODEL_CONTROLS,
  MODEL_CONTROLS_COPY,
  MODEL_SCOPE,
  PALETTE,
  PROGRESS_LABEL,
  RANGE,
  RELATED,
  STAGES,
  VISUAL_MAPPING,
} from '../../../../data/multinodularGoitre.js';
import {
  BURDEN_RANGE,
  DEFAULT_CONTROLS,
  THYROID,
  solveMultinodularGoitre,
} from '../../../../models/multinodularGoitre.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp, lerp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { TubeSurface, smoothCurve } from '../../../shared/geometry/tube.js';
import { mineralMaterial, wallMaterial } from '../../../shared/materials.js';
import { buildThyroidParts } from '../../organs/thyroidAnatomy.js';

/**
 * A nodular thyroid, told as a statement about which way it had room to go.
 *
 * ### The gland is the atlas's; the airway and the boundary are not
 *
 * `buildThyroidParts` is used as it stands, and it is what makes the scene
 * possible: the parathyroids on the posterior surface and the recurrent
 * laryngeal nerves in the groove are already there, already separate meshes,
 * and already in the right relation to the lobes.
 *
 * Two things this scene draws itself, and both are declared:
 *
 * - **The airway.** The atlas's trachea is a straight tube of fixed calibre,
 *   and the subject here is whether it is bent or narrowed, so this file draws
 *   its own on its own curve and hides the fixed one — the same arrangement
 *   the achalasia and prostate scenes use, for the same reason.
 * - **The thoracic inlet.** The atlas has no skeleton. The ring is the boundary
 *   the entire claim rests on — it is the only place in this anatomy where
 *   something refuses to move — so a scene that did not draw it would be
 *   asserting the distinction without showing it.
 *
 * ### Three layers
 *
 * - **The disease state** is a direction and an amount.
 * - **The model output** is a distance: how far the gland's face advances, and
 *   how that distance divides into moving the airway and narrowing it.
 * - **The drawing** grows the lobes along the direction and applies that
 *   distance to the airway. The shape the gland grows *into* is drawn rather
 *   than solved, and `src/data/multinodularGoitre.js` says so.
 */
export class MultinodularGoitreScene {
  static meta = {
    id: 'multinodular-goitre',
    status: 'alpha',
    title: 'Multinodular goitre: moved, or made narrower',
    titleJa: '多結節性甲状腺腫：動かされるのか、狭くされるのか',
    subtitle: 'The neck is soft in every direction but one — and that one is the whole difference',
    subtitleJa: '頸部は 1 方向を除いて軟らかく、その 1 方向がすべての違いを生みます',
    stages: STAGES,
    related: RELATED,
    visualMapping: VISUAL_MAPPING,
    legend: LEGEND,
    range: RANGE,
    progressLabel: PROGRESS_LABEL,
    palette: PALETTE,
    modelScope: MODEL_SCOPE,
    modelControls: MODEL_CONTROLS_COPY,
    disclaimer: DISCLAIMER,
    disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: DISCLAIMER_SHORT,
    disclaimerShortJa: DISCLAIMER_SHORT_JA,
  };

  static cameraPose = {
    position: new THREE.Vector3(0.9, 0.15, 4.7),
    target: new THREE.Vector3(0, -0.2, 0),
  };

  /** Where the ring of bone is, and how wide it is. Drawn, not in the atlas. */
  static INLET = Object.freeze({ y: -0.95, radius: 0.66, tube: 0.085 });

  /** Which way the patient's left is (`docs/architecture-rules.md` rule 5). */
  static LEFT = 1;

  /**
   * How each direction reshapes a lobe, per unit of the model's advance.
   *
   * Presentation: the model has one distance in it, and this says what a lobe
   * looks like when it has gone that far in each direction. `toward` is signed
   * towards the midline, so it is applied with the lobe's own side.
   */
  static GROWTH = Object.freeze({
    anterior: { scale: [0.35, 0.25, 1.0], offset: [0.2, 0, 0.45] },
    medial: { scale: [1.4, 0.3, 0.35], offset: [-0.5, 0, 0] },
    posterior: { scale: [0.25, 0.2, 0.9], offset: [0, 0, -0.6] },
    retrosternal: { scale: [0.3, 0.9, 0.3], offset: [0, -0.75, 0] },
  });

  /** In the medial picture one lobe leads; the airway goes the other way. */
  static LEADING_SIDE = -1;

  constructor({ viewer } = {}) {
    this.viewer = viewer ?? null;
    this.root = new THREE.Group();
    this.root.name = MultinodularGoitreScene.meta.id;
    this.progress = 1;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solveMultinodularGoitre(this.controls);
    this.anchorVectors = {
      gland: new THREE.Vector3(),
      trachea: new THREE.Vector3(),
      nerve: new THREE.Vector3(),
      parathyroid: new THREE.Vector3(),
      inlet: new THREE.Vector3(),
    };
  }

  build() {
    this.thyroid = buildThyroidParts({
      colors: {
        'right-lobe': PALETTE.gland,
        'left-lobe': PALETTE.gland,
        isthmus: PALETTE.gland,
        'pyramidal-lobe': PALETTE.gland,
        parathyroid: PALETTE.parathyroid,
        nerve: PALETTE.nerve,
        oesophagus: PALETTE.oesophagus,
      },
      // Translucent, unlike the atlas's own default. The airway and the ring
      // of bone are both *behind* the gland from in front, and the whole claim
      // is about what happens to them — an opaque gland is a scene about a
      // neck getting fuller.
      opacity: 0.62,
    });

    // The atlas's airway is a straight tube of fixed calibre, and this scene is
    // about whether it is bent or narrowed. So it draws its own on its own
    // curve, and the atlas's is taken out of the way rather than edited.
    const fixed = this.thyroid.mesh('trachea');
    if (fixed) fixed.visible = false;
    this.airway = new TubeSurface(this.airwayCurve(0), {
      radius: (u) => this.airwayRadiusAt(u),
      steps: 90,
      radial: 20,
    });
    // The colour varies along the airway, so the material carries none of its
    // own: `paintAirway` writes it per vertex and this multiplies through. One
    // colour for the whole tube said the airway had changed everywhere, over a
    // step whose whole content is that it has changed in one place.
    this.airwayMaterial = wallMaterial({ color: '#ffffff', opacity: 0.88 });
    this.airwayMaterial.vertexColors = true;
    this.airwayMesh = new THREE.Mesh(this.airway.geometry, this.airwayMaterial);
    this.airwayMesh.name = 'airway';

    // The thoracic inlet. Not in the atlas, and the boundary the claim rests on.
    const { y, radius, tube } = MultinodularGoitreScene.INLET;
    this.inletGeometry = new THREE.TorusGeometry(radius, tube, 10, 40);
    this.inletMaterial = mineralMaterial({ color: PALETTE.bone, roughness: 0.66 });
    this.inlet = new THREE.Mesh(this.inletGeometry, this.inletMaterial);
    this.inlet.position.set(0, y, -0.12);
    this.inlet.rotation.x = Math.PI / 2;
    this.inlet.scale.set(1, 1, 0.62);
    this.inlet.name = 'thoracic-inlet';

    this.restScale = new Map();
    this.restPosition = new Map();
    for (const [id, mesh] of this.thyroid.index) {
      this.restScale.set(id, mesh.scale.clone());
      this.restPosition.set(id, mesh.position.clone());
    }

    this.root.add(createStudioLights(), this.thyroid.object, this.airwayMesh, this.inlet);
    this.applyModelToScene();
    return this.root;
  }

  // --- the one axis ---------------------------------------------------------

  /** @param {number} value 0 = a gland with nodules in it, 1 = the largest here */
  setProgress(value) {
    this.progress = clamp(value);
    this.controls.burden = lerp(BURDEN_RANGE.min, BURDEN_RANGE.max, this.progress);
    this.solve();
  }

  setModelControl(id, value) {
    this.controls[id] = value;
    this.solve();
  }

  getModelControls() {
    return MODEL_CONTROLS.map((control) => ({ ...control, value: this.controls[control.id] }));
  }

  resetModelControls() {
    this.controls = { ...DEFAULT_CONTROLS };
    this.setProgress(this.progress);
  }

  solve() {
    this.solved = solveMultinodularGoitre(this.controls);
    this.applyModelToScene();
  }

  update() {}

  // --- the airway this scene draws -----------------------------------------

  /**
   * The airway's path, bent across at the level of the gland.
   *
   * The bend is centred where the lobes are and falls away above and below,
   * because a trachea deviated by a goitre is displaced where the goitre is and
   * straight where it is not.
   */
  airwayCurve(deviation) {
    const bend = (y) => deviation * Math.exp(-Math.pow((y - 0.05) / 0.7, 2));
    const points = [];
    for (let step = 0; step <= 10; step += 1) {
      const y = lerp(-1.55, 1.15, step / 10);
      points.push([bend(y), y, 0.01]);
    }
    return smoothCurve(points);
  }

  /**
   * The airway's calibre along its own path.
   *
   * Full width everywhere except at the inlet, where the model's fraction is
   * applied — because the inlet is the only place the gland has nothing to push
   * into. The fraction is the model's; the width of the dip is drawn.
   */
  airwayRadiusAt(u) {
    const solved = this.solved ?? solveMultinodularGoitre(this.controls);
    const y = lerp(-1.55, 1.15, u);
    const atInlet = Math.exp(-Math.pow((y - MultinodularGoitreScene.INLET.y) / 0.3, 2));
    return THYROID.tracheaRadius * lerp(1, solved.tracheaWidthFraction, atInlet);
  }

  /**
   * Paint the airway along its own length.
   *
   * The mark follows the same radius profile the narrowing is drawn from, so
   * the marked stretch is the narrowed stretch by construction. Wall vertices
   * carry `u` in their first UV coordinate; the two end caps take the ends'.
   */
  paintAirway() {
    const geometry = this.airway.geometry;
    const uv = geometry.attributes.uv;
    let colours = geometry.attributes.color;
    if (!colours) {
      colours = new THREE.BufferAttribute(new Float32Array(uv.count * 3), 3);
      geometry.setAttribute('color', colours);
    }
    const open = new THREE.Color(PALETTE.trachea);
    const tight = new THREE.Color(PALETTE.narrowed);
    const capStart = this.airway.capStart ?? uv.count;
    const capRing = (uv.count - capStart) / 2;
    const shade = new THREE.Color();
    for (let index = 0; index < uv.count; index += 1) {
      const u = index < capStart ? uv.getX(index) : index < capStart + capRing ? 0 : 1;
      const narrowed = 1 - this.airwayRadiusAt(u) / THYROID.tracheaRadius;
      shade.copy(open).lerp(tight, clamp(narrowed * 1.9));
      colours.setXYZ(index, shade.r, shade.g, shade.b);
    }
    colours.needsUpdate = true;
  }

  applyModelToScene() {
    if (!this.thyroid) return;
    const solved = this.solved;
    const growth = MultinodularGoitreScene.GROWTH[solved.direction];
    const advance = solved.advance;

    for (const [id, side] of [
      ['right-lobe', -MultinodularGoitreScene.LEFT],
      ['left-lobe', MultinodularGoitreScene.LEFT],
    ]) {
      const mesh = this.thyroid.mesh(id);
      const rest = this.restScale.get(id);
      const restAt = this.restPosition.get(id);
      if (!mesh || !rest || !restAt) continue;
      // In the medial picture one lobe leads, because a trachea pushed equally
      // from both sides is a trachea that does not move.
      const share =
        solved.direction === 'medial'
          ? side === MultinodularGoitreScene.LEADING_SIDE
            ? 1
            : 0.25
          : 1;
      const grown = advance * share;
      if (!growth) {
        mesh.scale.copy(rest);
        mesh.position.copy(restAt);
        continue;
      }
      mesh.scale.set(
        rest.x * (1 + growth.scale[0] * grown),
        rest.y * (1 + growth.scale[1] * grown),
        rest.z * (1 + growth.scale[2] * grown)
      );
      mesh.position.set(
        restAt.x + growth.offset[0] * grown * side,
        restAt.y + growth.offset[1] * grown,
        restAt.z + growth.offset[2] * grown
      );
    }

    // Nodular tissue reads as a coarser, paler gland than a smooth one.
    const nodular = clamp(solved.burden / 2);
    for (const id of ['right-lobe', 'left-lobe', 'isthmus', 'pyramidal-lobe']) {
      const mesh = this.thyroid.mesh(id);
      if (mesh) mesh.material.color.set(PALETTE.gland).lerp(new THREE.Color(PALETTE.nodular), nodular);
    }

    // The airway: bent where the model says it was pushed, narrowed where it
    // says the gland had nowhere to push.
    // `resample()` re-reads the surface's own curve, so the new path is put
    // there rather than passed in.
    this.airway.curve = this.airwayCurve(solved.deviation * -MultinodularGoitreScene.LEADING_SIDE);
    this.airway.resample();
    this.airway.refresh((u) => this.airwayRadiusAt(u));
    this.paintAirway();

    // The nerve and the parathyroids are lit where the model says the gland now
    // reaches back past them. **Lit is where they are, not what happened.**
    const lit = solved.envelopsPosterior;
    for (const id of [
      'right-recurrent-laryngeal-nerve',
      'left-recurrent-laryngeal-nerve',
      'right-superior-parathyroid',
      'left-superior-parathyroid',
      'right-inferior-parathyroid',
      'left-inferior-parathyroid',
    ]) {
      const mesh = this.thyroid.mesh(id);
      if (!mesh) continue;
      mesh.material.emissiveIntensity = lit ? 0.75 : 0.18;
    }

    this.updateAnchors();
  }

  updateAnchors() {
    const { anchorVectors, solved } = this;
    anchorVectors.gland.set(-1.35, 0.55, 0.4);
    // Below the gland rather than above it. The airway runs the height of the
    // frame, and a label at the top of it lands behind the header in the neck
    // framing and off the top of the screen in the inlet one — the step then
    // points at something the reader cannot see. It is also barely deviated
    // this low down, so it does not have to chase the bend.
    anchorVectors.trachea.set(0.62, -0.4, 0.3);
    anchorVectors.nerve.set(1.25, -0.05, -0.5);
    anchorVectors.parathyroid.set(1.3, 0.55, -0.45);
    anchorVectors.inlet.set(-1.15, MultinodularGoitreScene.INLET.y + 0.12, 0.2);
  }

  // --- what the interface reads --------------------------------------------

  static guideFramings = Object.freeze({
    neck: Object.freeze({
      target: new THREE.Vector3(0, -0.2, 0),
      distance: 4.9,
      direction: new THREE.Vector3(0.9, 0.15, 4.7).normalize(),
    }),
    airway: Object.freeze({
      target: new THREE.Vector3(0, 0.05, 0),
      distance: 4.1,
      direction: new THREE.Vector3(0.5, 0.1, 3.9).normalize(),
    }),
    behind: Object.freeze({
      target: new THREE.Vector3(0, 0, -0.2),
      distance: 4.3,
      direction: new THREE.Vector3(1.9, 0.6, -3.2).normalize(),
    }),
    inlet: Object.freeze({
      target: new THREE.Vector3(0, -0.85, 0),
      distance: 4.2,
      direction: new THREE.Vector3(0.6, 0.55, 3.7).normalize(),
    }),
  });

  getGuideFramings() {
    return MultinodularGoitreScene.guideFramings;
  }

  getVisualMapping() {
    return VISUAL_MAPPING;
  }

  getAnnotations() {
    return ANNOTATIONS.map((annotation) => ({
      ...annotation,
      position: this.anchorVectors[annotation.anchor],
    }));
  }

  getMetrics() {
    const solved = this.solved;
    const airway =
      solved.airwayEffect === 'neither'
        ? 'nothing — it is not being touched'
        : solved.airwayEffect === 'narrowed'
          ? 'narrowed, because the gland is boxed in'
          : 'pushed aside, and still open';
    const value = {
      glandVolume: solved.glandVolumeRatio.toFixed(2),
      airway,
      width: Math.round(solved.tracheaWidthFraction * 100),
      deviation: solved.deviationRadii.toFixed(2),
      behind: Math.round(solved.behindFraction * 100),
    };
    return METRICS.map((metric) => ({ ...metric, value: value[metric.id] }));
  }

  dispose() {
    this.airway?.dispose();
    this.airwayMaterial?.dispose();
    this.inletGeometry?.dispose();
    this.inletMaterial?.dispose();
    this.thyroid?.dispose();
    disposeObject(this.root);
  }
}
