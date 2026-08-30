import * as THREE from 'three';
import { createStudioLights } from '../../../shared/lighting.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { buildAirwayTree } from '../../organs/airwayTree.js';
import {
  DEFAULT_CONTROLS,
  DEFECT_THRESHOLD,
  GENERATIONS,
  TERMINAL_COUNT,
  doseResponse,
  solveAsthma,
} from '../../../../models/asthma.js';
import {
  ANNOTATIONS,
  CHARTS,
  DISCLAIMER,
  DISCLAIMER_JA,
  DISCLAIMER_SHORT,
  DISCLAIMER_SHORT_JA,
  LEARNING_LABEL,
  LEGEND,
  METRICS,
  MODEL_CONTROLS,
  MODEL_SCOPE,
  PALETTE,
  PROGRESS_LABEL,
  RANGE,
  STAGES,
  STORY_LABEL,
} from '../../../../data/asthma.js';
import { CAUSAL_STORY, LEARNING_MODULES } from '../../../../data/asthmaTeaching.js';

/**
 * Scene: asthma — where the patchiness comes from.
 *
 * The subject is a *distribution*, so the scene is built around showing one:
 * a hundred and twenty-eight regions of lung, each lit by exactly how much air
 * the model says is reaching it, hanging off an airway tree whose branches are
 * drawn at exactly the calibre the model says they are.
 *
 * Every one of those numbers comes from [`src/models/asthma.js`](../../../../models/asthma.js).
 * The scene contains no physiology at all: it maps a solved state onto
 * geometry and colour, and that is the whole of what it does.
 *
 * ### What is presentation
 *
 * Colour and brightness. The tree's calibre is the model's, unscaled — an
 * airway drawn at half its radius is one the model narrowed by half — but how
 * *dark* an under-ventilated region looks is a choice, made so that the split
 * into two populations is visible at a glance rather than requiring the plot
 * to be read. The plot is there for anyone who wants the actual numbers.
 *
 * ### Why the model is not stepped
 *
 * Nothing here is a time course. Every state this scene shows is an
 * equilibrium the model iterated to, and moving a control asks for a different
 * equilibrium rather than starting a transient. The animation in the scene is
 * the reader's own hand on the sliders.
 */
export class AsthmaScene {
  static meta = {
    id: 'asthma-heterogeneity',
    title: 'Asthma: why the lung goes patchy',
    titleJa: '喘息：なぜ肺は不均一になるのか',
    subtitle: '128 regions of one airway tree · an even stimulus, an uneven result',
    subtitleJa: '1 本の気道樹の 128 領域 ｜ 均一な刺激が生む不均一な結果',
    stages: STAGES,
    legend: LEGEND,
    range: RANGE,
    progressLabel: PROGRESS_LABEL,
    palette: PALETTE,
    charts: CHARTS,
    modelScope: MODEL_SCOPE,
    story: STORY_LABEL,
    learning: LEARNING_LABEL,
    disclaimer: DISCLAIMER,
    disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: DISCLAIMER_SHORT,
    disclaimerShortJa: DISCLAIMER_SHORT_JA,
  };

  static cameraPose = {
    // Far enough back to hold the whole crown of the tree: it is about six
    // units across and four and a half tall, and the leaves are the subject.
    position: new THREE.Vector3(2.0, 1.7, 16.2),
    target: new THREE.Vector3(0, 0.2, 0),
  };

  constructor({ viewer } = {}) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = AsthmaScene.meta.id;
    this.progress = 0;
    this.controls = { ...DEFAULT_CONTROLS };
    /**
     * The solved lung. Replaced wholesale whenever a control moves; never
     * edited in place, so there is exactly one object that can be the current
     * answer and no way for half the scene to be reading a previous one.
     */
    this.solved = solveAsthma(this.controls);
    /**
     * The dose-response curve for the *current* lung, which is expensive
     * enough to be worth not recomputing on every frame. Invalidated by any
     * control except the stimulus, because the stimulus is the curve's x-axis.
     */
    this.curve = doseResponse(this.controls);
    /** Set when a control moved and the full-accuracy solve is still owed. */
    this.refineIn = 0;
  }

  build() {
    const object = new THREE.Group();

    this.tree = buildAirwayTree({
      generations: GENERATIONS,
      drawnGenerations: 5,
      color: PALETTE.airway,
    });

    /**
     * One instance per ventilation unit.
     *
     * `InstancedMesh` because a hundred and twenty-eight separate meshes is a
     * hundred and twenty-eight draw calls for what is conceptually one object,
     * and because the thing that varies between them — colour — is exactly
     * what instancing carries cheaply.
     */
    const geometry = new THREE.SphereGeometry(0.115, 10, 8);
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.4,
      metalness: 0.02,
      transparent: true,
      opacity: 0.95,
      vertexColors: false,
    });
    this.units = new THREE.InstancedMesh(geometry, material, TERMINAL_COUNT);
    this.units.name = 'ventilation-units';
    this.units.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.units.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(TERMINAL_COUNT * 3), 3);

    const matrix = new THREE.Matrix4();
    this.tree.leafPositions.forEach((position, unit) => {
      matrix.makeTranslation(position.x, position.y, position.z);
      this.units.setMatrixAt(unit, matrix);
    });
    this.units.instanceMatrix.needsUpdate = true;

    object.add(this.tree.object, this.units);
    this.root.add(createStudioLights(), object);
    this.body = object;

    this.applyModelToScene();
    return this.root;
  }

  // --- the one axis ---------------------------------------------------------

  /** @param {number} value 0 = no stimulus, 1 = a strong one */
  setProgress(value) {
    this.progress = clamp(value);
    this.setControl('stimulus', this.progress, { curveStale: false });
  }

  /**
   * Re-solves the lung.
   *
   * Solved cheaply first and refined a moment later. A full solve near the
   * tipping point takes a quarter of a second — the iteration has to be
   * heavily damped to settle at all there — and paying that on every pixel of
   * a slider drag would make the sliders unusable. The cheap answer agrees
   * with the exact one in every digit this scene reports; the refinement is
   * for the ones it does not.
   */
  setControl(id, value, { curveStale = true } = {}) {
    this.controls[id] = value;
    this.solved = solveAsthma(this.controls, { maxIterations: 320, tolerance: 1e-3 });
    if (curveStale) this.curve = null;
    this.refineIn = 0.35;
    this.applyModelToScene();
  }

  update(dt) {
    if (this.refineIn <= 0) return;
    this.refineIn -= dt;
    if (this.refineIn > 0) return;
    // The hand has come off the slider. Take the exact answer, and rebuild the
    // dose-response curve if the lung itself changed.
    this.solved = solveAsthma(this.controls);
    if (!this.curve) this.curve = doseResponse(this.controls);
    this.applyModelToScene();
  }

  // --- reading the model into the scene -------------------------------------

  /**
   * Every drawn property, in one place. Nothing else in this file writes a
   * colour, a radius or a scale.
   */
  applyModelToScene() {
    // Airway calibre, straight through: an airway drawn at half its radius is
    // one the model narrowed by half.
    this.tree.setCalibres((index) => this.solved.calibres[index].openFraction);

    // How narrowed the tree is overall, tinted into the airway material so the
    // tree reads as constricted even where individual branches are too small
    // to see. Presentation.
    // Kept light: enough to read as constriction, not so much that the tree
    // stops looking like an airway.
    this.tree.material.color
      .copy(OPEN_AIRWAY)
      .lerp(NARROW_AIRWAY, clamp(1 - this.solved.medianCalibre) * 0.45);

    // The units. Colour is ventilation — the one place in this scene where a
    // colour carries a number — and the ramp has two segments with the defect
    // threshold as the join, because the distinction that matters is between
    // "getting something" and "getting almost nothing" and a single linear
    // ramp puts almost none of its range there.
    //
    // The low end is warm rather than dark. A dark sphere on this background
    // is not a dark region, it is an absent one, and "half the lung has
    // disappeared" is not the reading wanted.
    for (const unit of this.solved.units) {
      if (unit.share < DEFECT_THRESHOLD) {
        UNIT_COLOUR.copy(DEEP_DEFECT).lerp(THRESHOLD_UNIT, unit.share / DEFECT_THRESHOLD);
      } else {
        const lit = Math.min(1, (unit.share - DEFECT_THRESHOLD) / (1.6 - DEFECT_THRESHOLD)) ** 0.7;
        UNIT_COLOUR.copy(THRESHOLD_UNIT).lerp(LIT_UNIT, lit);
      }
      this.units.setColorAt(unit.unit, UNIT_COLOUR);
    }
    this.units.instanceColor.needsUpdate = true;
  }

  // --- what the interface reads --------------------------------------------

  getAnnotations() {
    const anchors = {
      trachea: new THREE.Vector3(0.55, 2.2, 0.4),
      tree: new THREE.Vector3(-2.6, 1.2, 0.6),
      units: new THREE.Vector3(3.4, -1.6, 0.6),
      defect: this.darkestRegionAnchor(),
    };
    return ANNOTATIONS.flatMap((annotation) => {
      const anchor = anchors[annotation.anchor];
      return anchor ? [{ ...annotation, position: anchor.clone() }] : [];
    });
  }

  /**
   * Where the worst-ventilated region is, so the label that names one points
   * at the one the model actually produced rather than at a fixed spot that
   * happens to be dark today.
   */
  darkestRegionAnchor() {
    const worst = this.solved.units.reduce((best, unit) => (unit.share < best.share ? unit : best));
    return this.tree.leafPositions[worst.unit].clone().add(new THREE.Vector3(0.35, -0.2, 0.35));
  }

  getMetrics() {
    const solved = this.solved;
    const value = {
      resistance: solved.resistanceRatio.toFixed(2),
      heterogeneity: solved.heterogeneity.toFixed(2),
      defects: Math.round(solved.defectFraction * 100),
      cluster: Math.round(solved.largestDefectFraction * 100),
      ventilation: Math.round(solved.totalVentilation * 100),
      calibre: Math.round(solved.medianCalibre * 100),
      stimulus: Math.round(this.controls.stimulus * 100),
      settled: solved.converged ? 'yes' : 'not yet',
    };
    const valueJa = { settled: solved.converged ? '収束' : '未収束' };
    return METRICS.map((metric) => ({
      ...metric,
      value: value[metric.id],
      ...(valueJa[metric.id] != null ? { valueJa: valueJa[metric.id] } : {}),
    }));
  }

  getCharts() {
    const solved = this.solved;

    // A histogram of where the air went. Bins are fixed rather than fitted to
    // the data, so the two peaks separating is something the reader watches
    // happen instead of something the axis hides by rescaling under them.
    const BINS = 18;
    const TOP = 3;
    const counts = new Array(BINS).fill(0);
    for (const unit of solved.units) {
      counts[Math.min(BINS - 1, Math.floor((unit.share / TOP) * BINS))] += 1;
    }
    const bars = counts.map((count, index) => ({
      x0: (index / BINS) * TOP,
      x1: ((index + 1) / BINS) * TOP,
      y: count,
      // Bins below the defect threshold are drawn in the colour the dark
      // regions are drawn in, so the plot and the 3D agree without a caption.
      color: ((index + 0.5) / BINS) * TOP < DEFECT_THRESHOLD ? PALETTE.narrowed : PALETTE.ventilated,
    }));

    const curve = this.curve ?? [];

    return {
      'ventilation-distribution': {
        x: { min: 0, max: TOP },
        y: { min: 0, max: Math.max(16, ...counts) },
        bars,
        rules: [
          {
            axis: 'x',
            at: DEFECT_THRESHOLD,
            color: 'rgba(255, 142, 107, 0.8)',
            label: 'defect',
            labelJa: '欠損',
          },
          { axis: 'x', at: 1, color: 'rgba(255, 255, 255, 0.28)', label: 'fair share', labelJa: '取り分' },
        ],
        note: solved.heterogeneity > 0.6 ? { text: 'two populations', textJa: '2 つの集団' } : null,
      },
      'dose-response': {
        x: { min: 0, max: 1 },
        y: { min: 0, max: Math.max(4, ...curve.map((point) => point.resistanceRatio)) * 1.05 },
        series: [
          {
            id: 'curve',
            color: PALETTE.curve,
            width: 1.8,
            points: curve.map((point) => ({ x: point.stimulus, y: point.resistanceRatio })),
          },
        ],
        markers: [
          {
            x: this.controls.stimulus,
            y: solved.resistanceRatio,
            color: PALETTE.marker,
            radius: 3.4,
          },
        ],
      },
    };
  }

  getModelControls() {
    return MODEL_CONTROLS.map((control) => ({ ...control, value: this.controls[control.id] }));
  }

  /** @param {string} id @param {number} value */
  setModelControl(id, value) {
    this.setControl(id, value);
  }

  resetModelControls() {
    for (const control of MODEL_CONTROLS) this.controls[control.id] = DEFAULT_CONTROLS[control.id];
    this.setControl('stimulus', this.controls.stimulus);
  }

  /**
   * The full-accuracy solve, on demand.
   *
   * A walk-through step or a lesson states what the model does; it must be
   * shown the exact answer, not the fast one taken while a slider was moving.
   */
  settleModel() {
    this.solved = solveAsthma(this.controls);
    if (!this.curve) this.curve = doseResponse(this.controls);
    this.refineIn = 0;
    this.applyModelToScene();
  }

  getCausalStory() {
    return CAUSAL_STORY;
  }

  getLearningModules() {
    return LEARNING_MODULES.map((module) =>
      module.transfer
        ? {
            ...module,
            transfer: {
              ...module.transfer,
              progress: module.transfer.atStage ? stageAt(module.transfer.atStage) : module.setup.progress,
            },
          }
        : module
    );
  }

  dispose() {
    this.tree.dispose();
    this.units.geometry.dispose();
    this.units.material.dispose();
    disposeObject(this.root);
  }
}

/** Scratch, so the per-frame colour write allocates nothing. */
const UNIT_COLOUR = new THREE.Color();
/** A region receiving nothing at all. */
const DEEP_DEFECT = new THREE.Color(PALETTE.defect);
/** The join of the two segments: neutral, at exactly the defect threshold. */
const THRESHOLD_UNIT = new THREE.Color('#7c7182');
/** A region receiving well over its share. */
const LIT_UNIT = new THREE.Color(PALETTE.ventilated);
const OPEN_AIRWAY = new THREE.Color(PALETTE.airway);
const NARROW_AIRWAY = new THREE.Color(PALETTE.narrowed);

/** A stage's position on the axis, by id. Throws rather than silently drifting. */
function stageAt(id) {
  const stage = STAGES.find((entry) => entry.id === id);
  if (!stage) throw new Error(`asthma scene: no stage "${id}"`);
  return stage.at;
}
