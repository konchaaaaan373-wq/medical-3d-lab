import * as THREE from 'three';

import {
  CONTROLS,
  DISCLAIMER,
  DISCLAIMER_JA,
  DISCLAIMER_SHORT,
  DISCLAIMER_SHORT_JA,
  LEARNING,
  LEARNING_LABEL,
  LEGEND,
  METRICS,
  MODEL_CONTROLS_COPY,
  MODEL_SCOPE,
  PALETTE,
  PROGRESS_LABEL,
  RANGE,
  STAGES,
  STORY_LABEL,
  situation,
} from '../../../../data/renalFiltration.js';
import {
  DEFAULT_CONTROLS,
  PRESET_CONTROLS,
  getState,
} from '../../../../models/renalFiltration.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { buildNephron } from '../../organs/nephron.js';
import { clamp, lerp } from '../../../../utils/math.js';

/**
 * Where filtration fails.
 *
 * One nephron, drawn once, solved by `src/models/renalFiltration.js`. The
 * progression slider says **how far into the selected situation** the kidney
 * is; the model controls say **which mechanism** is failing. Those are two
 * different questions and they are two different inputs, which is the point of
 * the scene: a single severity slider would give the same picture for a
 * dehydrated kidney and a poisoned one.
 *
 * Interpolation is on the **controls**, never on the answers. At progress 0.4
 * the scene builds the control set 40 % of the way from a normal kidney to the
 * situation's own, and solves it. Every intermediate frame is therefore a real
 * solution rather than a blend of two, which matters because several of the
 * relationships here are markedly non-linear — a blend of a normal FENa and a
 * pre-renal one is not the FENa of anything.
 *
 * Nothing drawn feeds back into the model. Calibre, glow and opacity are
 * presentation, they are named as such in the geometry builder, and the model
 * never reads them.
 */
export class RenalFiltrationScene {
  static meta = {
    id: 'renal-filtration',
    status: 'alpha',
    title: 'Where filtration fails',
    titleJa: '濾過は、どこで落ちるのか',
    subtitle: 'One nephron, one Starling balance, one mass balance · every number here is a reading of the same solve',
    subtitleJa:
      '1 個のネフロン、1 つの Starling 平衡、1 つの物質収支 ｜ 画面上のすべての数値が同じ解から導かれています',
    stages: STAGES,
    legend: LEGEND,
    range: RANGE,
    progressLabel: PROGRESS_LABEL,
    palette: PALETTE,
    modelScope: MODEL_SCOPE,
    modelControls: MODEL_CONTROLS_COPY,
    story: STORY_LABEL,
    learning: LEARNING_LABEL,
    disclaimer: DISCLAIMER,
    disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: DISCLAIMER_SHORT,
    disclaimerShortJa: DISCLAIMER_SHORT_JA,
  };

  static cameraPose = {
    // Slightly above and to the side: the corpuscle is at the top and the loop
    // runs down, so a level camera flattens the one relationship — cortex above,
    // medulla below — that the shape exists to carry.
    position: new THREE.Vector3(4.4, 2.6, 9.4),
    target: new THREE.Vector3(-0.15, 0.05, 0),
  };

  /** Auto-rotation would spin the cortex under the medulla. */
  static allowAutoRotate = false;

  constructor({ viewer } = {}) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = RenalFiltrationScene.meta.id;

    this.progress = 0;
    this.situationId = 'prerenal';
    /** Controls the reader has moved by hand, which override the situation. */
    this.overrides = {};
    this.state = getState();
  }

  build() {
    const object = new THREE.Group();

    this.nephron = buildNephron(PALETTE);
    object.add(this.nephron.object);

    // Filtrate along the tubule, in the order it actually travels. The stream's
    // speed is a reading of tubular flow; it is presentation, and it is driven
    // from the model rather than being a constant that happens to look busy.
    this.filtrate = createFlowStream({
      curves: this.nephron.paths.filtrate,
      count: 220,
      color: PALETTE.filtrate,
      size: 4.6,
      speed: 0.16,
      spread: 0.05,
      seed: 29,
    });
    object.add(this.filtrate.object);

    this.blood = createFlowStream({
      curves: this.nephron.paths.blood,
      count: 90,
      color: PALETTE.afferent,
      size: 5.4,
      speed: 0.3,
      spread: 0.06,
      seed: 31,
    });
    object.add(this.blood.object);

    this.root.add(createStudioLights(), object);
    this.setProgress(0);
    return this.root;
  }

  // --- the one medical state ------------------------------------------------

  /**
   * The controls this scene is currently solved at.
   *
   * Normal, interpolated `progress` of the way towards the selected
   * situation's own settings, with anything the reader has moved by hand
   * applied on top. A control the situation does not mention keeps its
   * reference value — a pre-renal kidney is not also nephrotic.
   */
  controlsNow() {
    const target = PRESET_CONTROLS[this.situationId] ?? {};
    const blended = { ...DEFAULT_CONTROLS };
    for (const [key, value] of Object.entries(target)) {
      blended[key] = lerp(DEFAULT_CONTROLS[key], value, this.progress);
    }
    return { ...blended, ...this.overrides };
  }

  /** @param {number} value 0..1 */
  setProgress(value) {
    this.progress = clamp(value, 0, 1);
    this.solve();
  }

  solve() {
    this.state = getState(this.controlsNow());
    this.applyState();
  }

  /**
   * Push the solved state out to the geometry.
   *
   * Every line here is a **presentation** mapping, and each one is a reading of
   * a named clinical quantity rather than of a number invented for the picture.
   * Nothing in this method is allowed to change the model.
   */
  applyState() {
    if (!this.nephron) return;
    const state = this.state;
    const controls = state.controls;

    // Arteriolar calibre from arteriolar resistance. The geometry converts a
    // resistance to a radius; the scene does not do it here, because the
    // fourth-power relation and the flattening applied to it are drawing
    // decisions and belong with the drawing.
    this.nephron.glomerulus.setResistance('afferent', controls.afferentToneMultiplier);
    this.nephron.glomerulus.setResistance('efferent', controls.efferentToneMultiplier);

    // How much is being filtered, against the reference kidney.
    const filtrationRatio = state.gfrMlPerMin / REFERENCE_GFR;
    this.nephron.setFiltrateVolume(filtrationRatio);

    // Each segment's own activity. Proximal reabsorption is the model's
    // computed fraction; the loop and the distal segments are shown by the
    // epithelium's condition, since that is what the model actually resolves
    // about them.
    this.nephron.setSegmentActivity(
      'proximalConvoluted',
      state.proximalSodiumFraction / REFERENCE_PROXIMAL_FRACTION
    );
    const health = controls.tubularHealth;
    this.nephron.setSegmentActivity('descendingLimb', health);
    this.nephron.setSegmentActivity('ascendingLimb', health);
    this.nephron.setSegmentActivity('distalConvoluted', health);
    // The collecting duct's visible job is concentrating, so it is read from
    // the osmolality actually reached rather than from the epithelium alone.
    this.nephron.setSegmentActivity('collectingDuct', state.urineOsmolalityMosmKg / 1200);

    // Stream rate as a reading of flow. Floored rather than allowed to reach
    // zero: a completely frozen stream reads as a broken render rather than as
    // a kidney that has stopped, and the numbers beside it already say which.
    this.filtrate?.setRate(0.12 + 0.9 * clamp(filtrationRatio, 0, 1.4));
    this.blood?.setRate(0.2 + 0.9 * clamp(state.renalBloodFlowMlPerMin / REFERENCE_BLOOD_FLOW, 0, 1.4));
  }

  update(dt) {
    this.filtrate?.update(dt);
    this.blood?.update(dt);
  }

  // --- what the UI reads ----------------------------------------------------

  getState() {
    return this.state;
  }

  getMetrics() {
    return METRICS.map((metric) => {
      const raw = this.state[metric.key];
      const shown = (metric.scale ?? 1) * raw;
      return { ...metric, value: shown.toFixed(metric.digits) };
    });
  }

  getStageView(value) {
    const at = clamp(value ?? this.progress, 0, 1);
    // The nearest authored stage, which is what the read-out names. Stages are
    // points on the progression, not separate states.
    return STAGES.reduce((closest, stage) =>
      Math.abs(stage.at - at) < Math.abs(closest.at - at) ? stage : closest
    );
  }

  getAnnotations() {
    const anchors = this.nephron?.anchors ?? {};
    const label = (key, text, textJa) =>
      anchors[key] ? { id: key, position: anchors[key], text, textJa } : null;

    return [
      label('glomerulus', 'Glomerulus', '糸球体'),
      label('proximalConvoluted', 'Proximal tubule', '近位尿細管'),
      label('loopTip', 'Loop of Henle', 'ヘンレのループ'),
      label('maculaDensa', 'Macula densa', '緻密斑'),
      label('collectingDuct', 'Collecting duct', '集合管'),
    ].filter(Boolean);
  }

  getModelControls() {
    const controls = this.controlsNow();
    return CONTROLS.map((control) =>
      control.kind === 'choice'
        ? { ...control, value: this.situationId }
        : { ...control, value: controls[control.id] }
    );
  }

  /**
   * @param {string} id
   * @param {number|string} value
   */
  setModelControl(id, value) {
    if (id === 'situation') {
      this.situationId = String(value);
      // A new situation replaces the reader's hand-set controls rather than
      // layering on top of them: keeping an afferent tone from a previous
      // question would silently make the new one a different question.
      this.overrides = {};
      this.solve();
      return;
    }
    this.overrides[id] = Number(value);
    this.solve();
  }

  resetModelControls() {
    this.overrides = {};
    this.solve();
  }

  /** The situation's own words, for the causal-story panel. */
  getCausalStory() {
    const entry = situation(this.situationId);
    return {
      id: entry.id,
      title: entry.labelEn,
      titleJa: entry.labelJa,
      question: entry.questionEn,
      questionJa: entry.questionJa,
      body: entry.noteEn,
      bodyJa: entry.noteJa,
    };
  }

  getLearningModules() {
    return [
      {
        id: LEARNING.id,
        title: LEARNING.titleEn,
        titleJa: LEARNING.titleJa,
        question: LEARNING.questionEn,
        questionJa: LEARNING.questionJa,
        options: LEARNING.options.map((option) => ({
          id: option.id,
          label: option.labelEn,
          labelJa: option.labelJa,
        })),
        answer: LEARNING.answer,
        explanation: LEARNING.explanationEn,
        explanationJa: LEARNING.explanationJa,
        // What the learner is asked to do, so the answer is watched rather
        // than read: put the kidney in the pre-renal state, then withdraw the
        // efferent support and see which way each number goes.
        setup: { situation: LEARNING.assertion.from, progress: 1 },
        manipulation: { situation: LEARNING.assertion.to, progress: 1 },
        watch: ['rbf', 'gfr'],
      },
    ];
  }

  dispose() {
    this.filtrate?.dispose?.();
    this.blood?.dispose?.();
    this.nephron?.dispose();
  }
}

/** The reference kidney's GFR, for the presentation ratios above. */
const REFERENCE_GFR = getState().gfrMlPerMin;
/** Likewise the reference proximal fraction and blood flow. */
const REFERENCE_PROXIMAL_FRACTION = getState().proximalSodiumFraction;
const REFERENCE_BLOOD_FLOW = getState().renalBloodFlowMlPerMin;

export default RenalFiltrationScene;
