import * as THREE from 'three';
import { createStudioLights } from '../../../shared/lighting.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { buildAirwayTree } from '../../organs/airwayTree.js';
import {
  DEFAULT_CONTROLS,
  DEFECT_THRESHOLD,
  GENERATIONS,
  REFERENCE_CONTROLS,
  TERMINAL_COUNT,
  doseResponse,
  solveAsthma,
} from '../../../../models/asthma.js';
import {
  ANNOTATIONS,
  CHARTS,
  COMPARISON_ANNOTATIONS,
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
import { REEL_CUES, REEL_DURATION, cameraAt, overlayAt, stimulusAt } from './reelStoryboard.js';

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
     * The healthy tree the comparison draws, memoised. Cleared wherever the
     * controls move; see `referenceSolve`.
     */
    this.referenceSolved = null;
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
    this.primary = this.buildTree();
    object.add(this.primary.object);
    this.root.add(createStudioLights(), object);
    this.body = object;

    this.applyModelToScene();
    return this.root;
  }

  /**
   * One drawable airway tree: the branches, and one instance per ventilation
   * unit.
   *
   * Factored out so the comparison's healthy tree is built by the same code as
   * the asthmatic one. Two trees drawn by two builders would eventually differ
   * in something nobody chose, and the whole point of putting them side by side
   * is that the *only* difference is the lung.
   */
  buildTree() {
    const object = new THREE.Group();

    const tree = buildAirwayTree({
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
    const units = new THREE.InstancedMesh(geometry, material, TERMINAL_COUNT);
    units.name = 'ventilation-units';
    units.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    units.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(TERMINAL_COUNT * 3), 3);

    const matrix = new THREE.Matrix4();
    tree.leafPositions.forEach((position, unit) => {
      matrix.makeTranslation(position.x, position.y, position.z);
      units.setMatrixAt(unit, matrix);
    });
    units.instanceMatrix.needsUpdate = true;

    object.add(tree.object, units);
    return { object, tree, units, geometry, material };
  }

  // --- normal beside disease -----------------------------------------------

  /**
   * Puts a healthy tree beside the asthmatic one, under the same stimulus.
   *
   * This is the comparison the scene is really about. The stimulus reaching
   * both trees is identical, and so is every piece of geometry; what differs is
   * `hyperresponsiveness` and `wallThickening` — the asthmatic trait and the
   * remodelling. A reader watching one tree go patchy while the other stays
   * even is watching the trait do the work, which no single-lung view can show.
   *
   * The reference is solved from the same `solveAsthma` as the primary, not
   * drawn from a stored picture: if the model changed, both would change.
   *
   * @param {boolean} enabled
   */
  setComparison(enabled) {
    this.comparing = enabled;

    if (enabled && !this.reference) {
      this.reference = this.buildTree();
      this.body.add(this.reference.object);
    }
    if (this.reference) {
      this.reference.object.visible = enabled;
      this.reference.object.position.x = enabled ? -COMPARISON_OFFSET : 0;
    }
    this.primary.object.position.x = enabled ? COMPARISON_OFFSET : 0;
    this.applyModelToScene();
  }

  /**
   * Where the camera goes when both trees are on screen.
   *
   * Wider and a little further back, because the subject is now the pair. The
   * target stays on the midline so neither tree is favoured.
   */
  getComparisonView() {
    return {
      position: new THREE.Vector3(1.4, 1.9, 25.5),
      target: new THREE.Vector3(0, 0.2, 0),
    };
  }

  /**
   * The healthy lung the comparison draws: no hyperresponsiveness, no
   * remodelling, and the same stimulus as the primary.
   *
   * Memoised on the controls rather than re-solved per call. It used to be
   * solved afresh every time, and there are two callers per frame — the
   * drawing and the reel's read-out — so a reel frame paid for this solve
   * twice on top of the primary's. Near the tipping point the iteration is
   * heavily damped and a solve is not cheap; three of them per frame is what
   * makes a fifteen-second recording drop frames.
   *
   * The cache is cleared wherever the controls change, which is the only thing
   * this depends on: the solve is an equilibrium with no state in it.
   */
  referenceSolve() {
    if (!this.referenceSolved) {
      this.referenceSolved = solveAsthma(
        { ...this.controls, ...REFERENCE_CONTROLS, stimulus: this.controls.stimulus },
        { maxIterations: 320, tolerance: 1e-3 }
      );
    }
    return this.referenceSolved;
  }

  // --- the one axis ---------------------------------------------------------

  /** @param {number} value 0 = no stimulus, 1 = a strong one */
  setProgress(value) {
    const next = clamp(value);
    // A repeated value is not a change, and re-solving for one is pure waste.
    // The reel holds at a constant stimulus for most of its fifteen seconds
    // and drives this every rendered frame; without this guard each of those
    // frames re-solved two airway trees to arrive at the picture already on
    // screen.
    if (next === this.progress && this.solved) return;
    this.progress = next;
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
    this.referenceSolved = null;
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
    // dose-response curve if the lung itself changed. The healthy tree is
    // refined with it, or the comparison would hold a cheap answer beside an
    // exact one.
    this.solved = solveAsthma(this.controls);
    this.referenceSolved = null;
    if (!this.curve) this.curve = doseResponse(this.controls);
    this.applyModelToScene();
  }

  // --- reading the model into the scene -------------------------------------

  /**
   * Every drawn property, in one place. Nothing else in this file writes a
   * colour, a radius or a scale.
   */
  applyModelToScene() {
    this.drawTree(this.primary, this.solved);
    if (this.comparing && this.reference) this.drawTree(this.reference, this.referenceSolve());
  }

  /**
   * Every drawn property of one tree, in one place. Nothing else in this file
   * writes a colour, a radius or a scale — and because the comparison calls
   * this too, the healthy tree cannot drift away from the asthmatic one in any
   * property nobody chose.
   *
   * @param {ReturnType<AsthmaScene['buildTree']>} parts
   * @param {ReturnType<typeof solveAsthma>} solved
   */
  drawTree(parts, solved) {
    // Airway calibre, straight through: an airway drawn at half its radius is
    // one the model narrowed by half.
    parts.tree.setCalibres((index) => solved.calibres[index].openFraction);

    // How narrowed the tree is overall, tinted into the airway material so the
    // tree reads as constricted even where individual branches are too small
    // to see. Presentation.
    // Kept light: enough to read as constriction, not so much that the tree
    // stops looking like an airway.
    parts.tree.material.color
      .copy(OPEN_AIRWAY)
      .lerp(NARROW_AIRWAY, clamp(1 - solved.medianCalibre) * 0.45);

    // The units. Colour is ventilation — the one place in this scene where a
    // colour carries a number — and the ramp has two segments with the defect
    // threshold as the join, because the distinction that matters is between
    // "getting something" and "getting almost nothing" and a single linear
    // ramp puts almost none of its range there.
    //
    // The low end is warm rather than dark. A dark sphere on this background
    // is not a dark region, it is an absent one, and "half the lung has
    // disappeared" is not the reading wanted.
    for (const unit of solved.units) {
      if (unit.share < DEFECT_THRESHOLD) {
        UNIT_COLOUR.copy(DEEP_DEFECT).lerp(THRESHOLD_UNIT, unit.share / DEFECT_THRESHOLD);
      } else {
        const lit = Math.min(1, (unit.share - DEFECT_THRESHOLD) / (1.6 - DEFECT_THRESHOLD)) ** 0.7;
        UNIT_COLOUR.copy(THRESHOLD_UNIT).lerp(LIT_UNIT, lit);
      }
      parts.units.setColorAt(unit.unit, UNIT_COLOUR);
    }
    parts.units.instanceColor.needsUpdate = true;
  }

  // --- what the interface reads --------------------------------------------

  getAnnotations() {
    const anchors = {
      trachea: new THREE.Vector3(0.55, 2.2, 0.4),
      tree: new THREE.Vector3(-2.6, 1.2, 0.6),
      units: new THREE.Vector3(3.4, -1.6, 0.6),
      defect: this.darkestRegionAnchor(),
      // Comparison mode slides each tree aside by COMPARISON_OFFSET; these sit
      // above the two crowns, one over each, and are the only labels shown.
      comparisonReference: new THREE.Vector3(-COMPARISON_OFFSET, 3.1, 0.6),
      comparisonDisease: new THREE.Vector3(COMPARISON_OFFSET, 3.1, 0.6),
    };
    return [...ANNOTATIONS, ...COMPARISON_ANNOTATIONS].flatMap((annotation) => {
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
    return this.primary.tree.leafPositions[worst.unit]
      .clone()
      .add(this.primary.object.position)
      .add(new THREE.Vector3(0.35, -0.2, 0.35));
  }

  getMetrics() {
    const rows = (solved) => ({
      resistance: solved.resistanceRatio.toFixed(2),
      heterogeneity: solved.heterogeneity.toFixed(2),
      defects: Math.round(solved.defectFraction * 100),
      cluster: Math.round(solved.largestDefectFraction * 100),
      ventilation: Math.round(solved.totalVentilation * 100),
      calibre: Math.round(solved.medianCalibre * 100),
      // The same value for both trees, on purpose: showing the dose in both
      // columns is what says the comparison is fair.
      stimulus: Math.round(this.controls.stimulus * 100),
      settled: solved.converged ? 'yes' : 'not yet',
    });
    const value = rows(this.solved);
    // While comparing, each row also carries the healthy tree's figure — the
    // same solve the reference tree is drawn from. Convergence stays a fact
    // about this solver run, not a difference between the lungs.
    const reference = this.comparing ? rows(this.referenceSolve()) : null;
    const valueJa = { settled: this.solved.converged ? '収束' : '未収束' };
    return METRICS.map((metric) => ({
      ...metric,
      value: value[metric.id],
      ...(reference && metric.id !== 'settled' ? { reference: reference[metric.id] } : {}),
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

  /**
   * The fifteen-second social sequence.
   *
   * Everything specific to it lives in `reelStoryboard.js`; this only hands
   * over what `ReelMode` needs and the three hooks that let a sequence drive
   * this particular scene.
   *
   * `progress: 0` because the sequence sets the dose itself, second by second,
   * and starting anywhere else would make the first frame a jump.
   */
  getReel() {
    return {
      durationSeconds: REEL_DURATION,
      cues: REEL_CUES,
      progress: 0,
      viewDirection: new THREE.Vector3(0.09, 0.1, 1).normalize(),
      framing: {
        // World half-extents the base framing must hold: two crowns about three
        // units across sitting either side of the midline, plus room for the
        // dolly-in to have somewhere to go.
        halfWidth: 9.6,
        halfHeight: 5.4,
        minimumDistance: 17,
        target: new THREE.Vector3(0, 0.2, 0),
      },
      cameraAt,
      overlayAt,

      /**
       * The dose at this instant, and nothing else.
       *
       * The model behind this scene is a stateless equilibrium solve, so
       * setting the stimulus is the whole of driving it: the same second always
       * gives the same lung, which is what makes the sequence reproducible.
       */
      driveAt(t, scene) {
        scene.setProgress(stimulusAt(t));
      },

      /**
       * Both trees' numbers, read from the same places the interactive read-out
       * reads them so a caption can never quote a figure the panel would not.
       */
      readMetrics(scene) {
        const rows = (solved) => ({
          defects: Math.round(solved.defectFraction * 100),
          resistance: solved.resistanceRatio.toFixed(1),
          ventilation: Math.round(solved.totalVentilation * 100),
        });
        return { asthma: rows(scene.solved), normal: rows(scene.referenceSolve()) };
      },
    };
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
    for (const parts of [this.primary, this.reference]) {
      if (!parts) continue;
      parts.tree.dispose();
      parts.geometry.dispose();
      parts.material.dispose();
    }
    disposeObject(this.root);
  }
}

/**
 * How far each tree slides from the midline when both are on screen.
 *
 * The crown of one tree is about three units across, so this clears them with
 * a gap wide enough to read as two lungs rather than one wide one. Presentation.
 */
const COMPARISON_OFFSET = 4.4;

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
