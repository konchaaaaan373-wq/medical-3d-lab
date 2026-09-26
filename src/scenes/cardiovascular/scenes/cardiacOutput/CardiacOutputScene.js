import * as THREE from 'three';
import { Chamber } from '../heartFailure/Chamber.js';
import { ValveApparatus } from '../heartFailure/ValveApparatus.js';
import { CavityOutline } from '../heartFailure/CavityOutline.js';
import { BloodField } from '../heartFailure/BloodField.js';
import { ANATOMY, ANCHORS, buildCavityBlood } from '../heartFailure/anatomy.js';
import { APEX_PINNING, TORSION_ILLUSTRATIVE_MAX, VENTRICLE_SHAPING } from '../heartFailure/geometry/ventricleGeometry.js';
import { ARTERIAL_PATH, RETURN_PATH, buildCircuit } from './circuit.js';
import {
  REEL_CUES,
  REEL_DURATION,
  cameraAt,
  cardiacPhaseAt,
  overlayAt,
  residualEmphasisAt,
  resistanceAt,
} from './reelStoryboard.js';
import { ExperimentSession } from './experimentSession.js';
import { changeOf, describeChange, signedDelta } from './changeSummary.js';
import { CONTROL_DOMAIN, PRESET_IDS, REFERENCE_GEOMETRY } from '../../../../models/cardiacOutput.js';
import {
  advanceCardiacPhase,
  beatPhaseAt,
  cavityVolumeAt,
  myocardialVolumeFor,
  ventricleShape,
} from '../../../../models/cardiacMechanics.js';
import { INTERVENTION_IDS } from '../../../../models/cardiacInterventions.js';
import { INTERVENTION_OPTIONS } from '../../../../data/cardiacOutputInterventions.js';
import {
  ANNOTATIONS,
  COMPARISON_ANNOTATIONS,
  COMPARISON_LABEL,
  CONSOLE_LAYOUT,
  CONTROLS,
  CONTROL_EDITOR,
  CONTROL_PADS,
  LEARNING_LABEL,
  LEARNING_MODULES,
  REEL_LABEL,
  DISCLAIMER,
  DISCLAIMER_JA,
  DISCLAIMER_SHORT,
  DISCLAIMER_SHORT_JA,
  LEGEND,
  MODEL_CONTROLS,
  MODEL_SCOPE,
  PALETTE,
  PRESET_OPTIONS,
  PRESSURE_VOLUME_LABEL,
  PRESSURE_WAVE_LABEL,
  STAGES,
  UNSOLVED_NOTICE,
} from '../../../../data/cardiacOutput.js';
import { disposeObject } from '../../../../utils/dispose.js';

/** Where the hero shot looks from — into the cut wedge. */
const VIEW_DIRECTION = new THREE.Vector3(0.34, 0.2, 0.92).normalize();

/**
 * The direction the two hearts are spread along while comparing: the screen's
 * horizontal, as seen from `VIEW_DIRECTION` — not world x.
 *
 * They used to be spread along world x. The camera looks at the scene from
 * the side and above, so along x one heart sat nearer the camera than the
 * other and was drawn larger and lower: at the start of an experiment, with
 * every figure ±0, "before" and "now" looked like two different hearts
 * (owner's recording, 24 s). Spread across the line of sight instead, both
 * are at the same depth, and what differs between them is the condition.
 */
const COMPARISON_AXIS = new THREE.Vector3(VIEW_DIRECTION.z, 0, -VIEW_DIRECTION.x).normalize();

/** How far apart the two hearts sit while comparing. */
const COMPARISON_OFFSET = 7.4;

const framing = (target, distance) => ({
  position: target.clone().addScaledVector(VIEW_DIRECTION, distance),
  target: target.clone(),
});

/**
 * Cardiac output — one circulation, four things a reader may change.
 *
 * ## The one state everything reads
 *
 * `this.session.view` is a solved beat: its input, its metrics, its recorded
 * cycle and its curves, produced together and replaced together. The chamber's
 * size, the valve timings, the blood, the read-out, the pressure-volume loop,
 * the waveform and the phase caption all read that object. There is no second
 * calculation anywhere in this file, and no output is scaled after the fact.
 *
 * ## Myocardial volume is fixed at the reference condition
 *
 * `myocardialVolumeFor()` derives a muscle volume from a state's end-diastolic
 * cavity and wall thickness. The heart-failure scene recomputes it whenever its
 * *disease* state moves, which is right: hypertrophy is real growth of muscle.
 *
 * Here it must not move at all. Every manipulation in this scene is acute — a
 * reader raising the filling for a moment, or lowering the elastance of the
 * same ventricle — and recomputing muscle from the new end-diastolic volume
 * would grow myocardium out of a fluid shift. So it is computed once, from the
 * reference condition, and held for all four controls and both presets; the
 * long-to-short axis ratio is held for the same reason. What still changes
 * within a beat is wall thickness, which emerges geometrically from
 * incompressibility as the cavity empties — that is a real consequence and it
 * stays.
 *
 * ## No progression axis
 *
 * The subject is four independent conditions, not a trajectory through one, so
 * `meta.progression.enabled` is false and there is a single stage.
 */
export class CardiacOutputScene {
  static meta = {
    id: 'cardiac-output',
    title: 'Cardiac output',
    titleJa: '心拍出量',
    // What the screen is for, in one line under the title. The earlier line —
    // 「1 つの循環がすべてを解く」 — described the model, not what a reader can
    // do with it, and a first-time reader was left to work that out from the
    // controls.
    subtitle: 'Change the heart’s condition or add a drug, and see how cardiac output and blood pressure change.',
    subtitleJa: '心臓の状態や薬を変えると、心拍出量と血圧がどう変わるかを確かめられます。',
    progression: { enabled: false },
    // The shell's arrangement for a one-factor experiment: the subject in the
    // middle, what was done and what came of it beside it, the choices under
    // it. Declared, not detected — see `src/styles/experiment-layout.css`.
    layout: 'experiment',
    console: CONSOLE_LAYOUT,
    // "All figures" is the vocabulary of a dashboard; these are the model's
    // other outputs, one press away.
    metricsMore: { show: 'Other measures', showJa: '他の指標', hide: 'Fewer', hideJa: '閉じる' },
    titleCard: { foldTrust: true },
    stages: STAGES,
    legend: LEGEND,
    palette: PALETTE,
    modelControls: MODEL_CONTROLS,
    modelScope: MODEL_SCOPE,
    comparison: COMPARISON_LABEL,
    learning: LEARNING_LABEL,
    reel: REEL_LABEL,
    pressureVolume: PRESSURE_VOLUME_LABEL,
    pressureWave: PRESSURE_WAVE_LABEL,
    disclaimer: DISCLAIMER,
    disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: DISCLAIMER_SHORT,
    disclaimerShortJa: DISCLAIMER_SHORT_JA,
  };

  /**
   * The camera holds still. This scene is read as *before and after*: press
   * dobutamine, look at the ventricle, press "none", look again. With the
   * shell's slow turn on, the second look was from a different side than the
   * first, and a change in the ventricle could not be told from a change in the
   * angle. The reader can still orbit and zoom; nothing turns on its own.
   */
  static allowAutoRotate = false;

  static cameraPose = {
    position: new THREE.Vector3(-0.4, -1.6, 0.2).addScaledVector(VIEW_DIRECTION, 30),
    target: new THREE.Vector3(-0.4, -1.6, 0.2),
  };

  constructor({ viewer } = {}) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = CardiacOutputScene.meta.id;
    this.phase = 0;
    this.cardiacPhaseDriven = false;
    this.comparing = false;

    this.session = new ExperimentSession({ presetId: PRESET_IDS.REFERENCE });

    /**
     * Muscle volume, computed once from the reference condition and never again.
     *
     * Deliberately not `myocardialVolumeFor(this.state)` on every solve, which
     * is what the heart-failure scene does and what this scene must not: there,
     * the state moving means the disease progressed; here it means the reader
     * moved a slider, and a slider must not grow myocardium.
     */
    this.myocardialVolumeMl = myocardialVolumeFor({
      edvMl: this.session.baseline.metrics.edvMl,
      wallMm: REFERENCE_GEOMETRY.wallMm,
      longToShortAxisRatio: REFERENCE_GEOMETRY.longToShortAxisRatio,
    });
    this._refreshEndDiastolicShape();
  }

  /** The solved beat on screen. */
  get state() {
    return this.session.view.metrics;
  }

  build() {
    const compact = window.innerWidth < 720 || (navigator.hardwareConcurrency ?? 8) <= 4;
    this._quality = { segments: compact ? 40 : 56, profilePoints: compact ? 22 : 30 };

    this.ventricle = new Chamber({
      cutAngle: ANATOMY.cutAngle,
      segments: this._quality.segments,
      profilePoints: this._quality.profilePoints,
      variant: 'disease',
    });
    this.apparatus = new ValveApparatus({ variant: 'disease' });
    // Blood leaves along the circuit it is actually connected to, and arrives
    // from the oxygenated run out of the lungs. With the default paths — this
    // scene borrows the chamber from heart failure, which has a drawn aorta —
    // the ejected blood streamed up into empty space above the ventricle.
    this._bloodPaths = {
      exitCurve: ARTERIAL_PATH,
      exitRange: [0.02, 0.32],
      entryCurve: RETURN_PATH,
      entryRange: [0.6, 0.97],
    };
    // Kept, not discarded: the before-condition heart builds its own field from
    // the same slots, and `BloodField` takes the *buffers* rather than a
    // geometry. Handing it `this.blood.geometry` builds a points cloud whose
    // position attribute wraps `undefined` — which throws nothing in Node, so a
    // unit test that constructs it passes, and draws nothing in a browser.
    this._bloodBuffers = buildCavityBlood(compact ? 420 : 620, 90210, this._bloodPaths);
    this.blood = new BloodField(this._bloodBuffers, {
      flowColor: PALETTE.flow,
      staticColor: PALETTE.residual,
    });
    this.blood.material.uniforms.uOpacity.value = 0.38;

    this.circuit = buildCircuit({ compact });

    // The mark of where the cavity wall stood at end-diastole. Off until there
    // is a stroke to see it against — at end-diastole it lies on the lining.
    this.outline = new CavityOutline({ cutAngle: ANATOMY.cutAngle, color: PALETTE.outline });
    this.outline.visible = false;

    this.primary = new THREE.Group();
    this.primary.name = 'current-condition';
    this.primary.add(this.ventricle, this.apparatus, this.blood, this.outline);

    this.root.add(this._createLights(), this.primary, this.circuit.object);

    this._offResize = this.viewer.onResize((camera, renderer) => {
      this.blood.syncViewport(camera, renderer);
      this.reference?.syncViewport(camera, renderer);
    });

    this._applyState();
    this._applyShape();
    return this.root;
  }

  /**
   * Three-point studio setup: a warm key from the upper front-right, a faint
   * warm fill from the lower left so the shadow side keeps its colour, and a
   * cool rim from behind-left to cut the silhouette off the backdrop. The same
   * arrangement as the heart-failure scene, because it is the same muscle under
   * the same camera and a second answer to a solved problem is not an answer.
   */
  _createLights() {
    const group = new THREE.Group();
    group.name = 'lights';
    group.add(new THREE.HemisphereLight(0xffe3de, 0x18202e, 0.45));
    const key = new THREE.DirectionalLight(0xfff1e4, 2.3);
    key.position.set(7, 10, 12);
    const rim = new THREE.DirectionalLight(0x9bc2ff, 0.28);
    rim.position.set(-10, 4, -9);
    const fill = new THREE.PointLight(0xffc5c0, 60, 60, 2);
    fill.position.set(-5, -5, 9);
    group.add(key, rim, fill);
    return group;
  }

  /** This scene has one state, not a progression axis. */
  setProgress() {}

  /** End-diastolic geometry of the condition on screen: the anchor for apex pinning. */
  _refreshEndDiastolicShape() {
    this.edShape = ventricleShape({
      cavityVolumeMl: this.state.edvMl,
      myocardialVolumeMl: this.myocardialVolumeMl,
      longToShortAxisRatio: REFERENCE_GEOMETRY.longToShortAxisRatio,
    });
  }

  /**
   * Pushes the solved beat into everything drawn. Called on every accepted change.
   *
   * The comparison heart is refreshed from here rather than from
   * `setComparison`, which is the mistake this replaces: `setComparison` runs
   * when the *button* is pressed, and the baseline moves when a *control* is
   * pressed — selecting a preset takes a new "before" snapshot, and so does
   * choosing an intervention that belongs to the other preset. Switching preset
   * while comparing left the read-out's "before" column on the new baseline and
   * the heart drawn beside it on the old one, disagreeing about the same
   * condition. Nothing threw.
   */
  _applyState() {
    // The sequence drives a control every frame and the cache answers most of
    // those with the beat already on screen. Rebuilding the circuit's tube
    // geometry for a solution nothing changed is work nobody asked for.
    // The heart being compared against follows the *baseline*, so it is
    // refreshed here with everything else rather than when the Compare button
    // is pressed.
    this.reference?.setState(this.session.baseline.metrics, this.session.baseline.cycle);
    this._refreshEndDiastolicShape();
    if (!this.blood) return;
    this.blood.setEjectionWindow(this.state.ejectionStartPhase, this.state.ejectionEndPhase);
    this.circuit.setState(this.state, CONTROL_DOMAIN.systemicResistanceMmHgSPerMl);
    this._applyOutlineShape();
  }

  update(dt, elapsed) {
    if (!this.cardiacPhaseDriven) {
      this.phase = advanceCardiacPhase(this.phase, dt, this.state.heartRatePerMin);
    }
    this._applyShape();
    this._applyOutlineVisibility();
    this.blood.setCycle(this.phase, this.state.ejectionFraction);
    this.blood.update(elapsed);
    this.circuit.update(dt);
    if (this.comparing && this.reference) {
      // Its own rate — see `setComparison`. A phase driven from outside (the
      // reel) is one clock for both, because the sequence is a presentation of
      // one beat, not a comparison of two rates.
      this._referencePhase = this.cardiacPhaseDriven
        ? this.phase
        : advanceCardiacPhase(this._referencePhase ?? this.phase, dt, this.session.baseline.metrics.heartRatePerMin);
      this.reference.setPhase(this._referencePhase);
      this.reference.update(elapsed);
    }
  }

  _applyShape() {
    const cavityVolumeMl = cavityVolumeAt(this.phase, { cycle: this.session.view.cycle });
    const shape = ventricleShape({
      cavityVolumeMl,
      myocardialVolumeMl: this.myocardialVolumeMl,
      longToShortAxisRatio: REFERENCE_GEOMETRY.longToShortAxisRatio,
    });

    // Contraction runs base-toward-apex: the apex stays put while the annulus
    // descends. How much the long axis shortens is the model's; only the anchor
    // point is chosen here.
    const descent = (shape.outerSemiLength - this.edShape.outerSemiLength) * APEX_PINNING;
    this.ventricle.position.y = descent;
    this.blood.setDescent(descent);

    this.ventricle.setTorsion(
      TORSION_ILLUSTRATIVE_MAX * this._emptiedFraction() * Math.min(1, this.state.ejectionFraction / 0.58)
    );
    this.ventricle.setShape({ ...shape, baseY: ANATOMY.baseY });
    this.apparatus.update({ ...shape, baseY: ANATOMY.baseY }, this.phase, this.state, descent);
    this.blood.setCavity(shape.cavityRadius, shape.cavitySemiLength);
    this.blood.setApexDrift(
      VENTRICLE_SHAPING.apexDriftX * shape.outerSemiLength,
      VENTRICLE_SHAPING.apexDriftZ * shape.outerSemiLength
    );
    this.shape = shape;
  }

  /** How far through its stroke the cavity is right now, 0 at ED, 1 at ES. */
  _emptiedFraction() {
    const { edvMl, esvMl } = this.state;
    const volume = cavityVolumeAt(this.phase, { cycle: this.session.view.cycle });
    return Math.min(1, Math.max(0, (edvMl - volume) / Math.max(1, edvMl - esvMl)));
  }

  _applyOutlineShape() {
    this.outline?.setShape({ ...this.edShape, baseY: ANATOMY.baseY });
  }

  _applyOutlineVisibility() {
    // Presentation only: the mark itself is the solved end-diastolic cavity and
    // this decides whether it is drawn. It earns its place while comparing,
    // where the stroke is what the two hearts are being read for.
    this.outline?.setOpacity((this.comparing ? 1 : 0) * this._emptiedFraction());
    this.reference?.setOutline(this.comparing ? this.reference.emptiedFraction() : 0);
  }

  // -------------------------------------------------------------------------
  // Model inputs
  // -------------------------------------------------------------------------

  /**
   * The preset and the four conditions.
   *
   * The preset is first on purpose. `sessionState.js` replays these in the
   * order they are returned when a reader comes back from the sequence, and
   * selecting a preset resets the four sliders — restored last, it would wipe
   * exactly the values being restored. `tests/cardiac-output-scene.test.js`
   * holds that ordering.
   */
  getModelControls() {
    const input = this.session.input;
    const start = this.session.baseline.input;
    return [
      {
        // Secondary, behind 「開始状態・介入」: choosing one starts a new
        // experiment. First in the list because a restore replays the list in
        // order and the preset resets everything.
        id: 'preset',
        kind: 'choice',
        advanced: true,
        label: 'Start state',
        labelJa: '開始状態',
        caption: 'Start state — choosing one starts a new experiment',
        captionJa: '開始状態（選ぶと新しい実験）',
        value: this.session.presetId,
        options: PRESET_OPTIONS,
      },
      {
        // After the preset and before the four inputs, which is also the order
        // a restore replays them in: the intervention is computed from the
        // preset's starting condition, and the four values land last. A manual
        // move keeps the intervention's values, so that replay arrives at the
        // same condition, and the row reports where it came from.
        id: 'intervention',
        kind: 'choice',
        advanced: true,
        label: 'Intervention',
        labelJa: '介入',
        caption: 'Try an intervention',
        captionJa: '介入を試す',
        value: this.session.origin,
        options: INTERVENTION_OPTIONS,
      },
      // The four inputs, each its own entry — a restore and a lesson move them
      // one at a time, as before — drawn as two pads of two axes each
      // (`CONTROL_PADS`). A pad moves its two inputs as one change; each axis
      // also has its own control that moves that input alone.
      ...CONTROLS.map((control) => {
        const domain = CONTROL_DOMAIN[control.id];
        const words = CONTROL_EDITOR[control.id];
        const pad = CONTROL_PADS.find((entry) => entry.x === control.id || entry.y === control.id);
        return {
          id: control.id,
          label: control.label,
          labelJa: control.labelJa,
          short: control.short,
          shortJa: control.shortJa,
          tinyJa: control.tinyJa,
          unit: control.unitShort,
          min: domain.min,
          max: domain.max,
          step: domain.step,
          value: input[control.id],
          // Where this experiment started: the hollow mark on the pad. Not a
          // normal value — the start state is a teaching condition.
          start: start[control.id],
          pad: pad ? { id: pad.id, axis: pad.x === control.id ? 'x' : 'y', label: pad.label, labelJa: pad.labelJa } : undefined,
          ...words,
          format: (value) => formatControl(control.id, value),
        };
      }),
      {
        // Undo: one of the reader's operations — a drag, a press — back. Not
        // replayed by a restore (its value is nothing).
        id: 'history',
        kind: 'history',
        label: 'Undo last change',
        labelJa: '直前の操作を戻す',
        shortJa: '1つ戻す',
        value: null,
        canUndo: this.session.canUndo,
      },
    ];
  }

  /**
   * @param {string} id `preset`, `intervention`, `history`, one of the four,
   *   or a pad's id with an object of its two inputs
   * @param {number|string|Record<string, number>|null} value
   * @param {{ op?: unknown }} [detail] the reader's operation, for undo
   */
  setModelControl(id, value, detail = {}) {
    if (id === 'history') {
      if (value === 'undo') this.session.undo();
      else return;
    } else if (id === 'preset') {
      this.session.selectPreset(String(value));
    } else if (id === 'intervention') {
      // 「なし」 means this experiment's starting condition, from anywhere —
      // including a condition adjusted after an intervention.
      if (value === INTERVENTION_IDS.NONE) this.session.selectIntervention(INTERVENTION_IDS.NONE);
      // The row already reads this intervention: either it is applied, or it
      // is what the reader has adjusted since. A replay of it during a restore
      // has to re-apply it (the four values that follow then land on top), so
      // it is re-applied here rather than ignored.
      else this.session.selectIntervention(String(value));
    } else if (value && typeof value === 'object') {
      // A pad: its two inputs, one change.
      this.session.setControls(
        Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, Number(entry)])),
        { op: detail.op }
      );
    } else {
      this.session.setControl(id, Number(value), { op: detail.op });
    }
    this._applyState();
  }

  /**
   * Back to the starting condition of the preset the reader is on.
   *
   * Both saved states go: the hand-set condition and any intervention. A reset
   * that put the sliders back and left a drug selected would be a reset in name
   * only.
   */
  resetModelControls() {
    this.session.reset();
    this._applyState();
  }

  /**
   * Guided lessons.
   *
   * Pure data. The lesson has no private path into the model: it moves the same
   * controls the sliders move, through `setModelControl`, and reads its figures
   * out of `getMetrics()`. So it cannot show a number the rest of the screen
   * disagrees with, and cannot teach a relationship the model does not have —
   * `tests/cardiac-output-learning.test.js` re-derives every stored answer.
   */
  getLearningModules() {
    return LEARNING_MODULES;
  }

  /**
   * The fifteen-second sequence.
   *
   * Everything specific to the content is in `reelStoryboard.js`; `ReelMode`
   * supplies the machinery — framing, formats, the overlay, the consent screen
   * and the recorder — and knows nothing about circulations.
   *
   * The sequence drives the model through `setModelControl`, the same path the
   * sliders take, so the condition it records is one a reader can reproduce by
   * dragging the resistance themselves. Its figures come out of `getMetrics()`,
   * so a file cannot quote a number the page would not.
   */
  getReel() {
    return {
      durationSeconds: REEL_DURATION,
      cues: REEL_CUES,
      viewDirection: VIEW_DIRECTION.clone(),
      // The comparison is the sequence: the right-hand heart is the condition
      // being driven and the left-hand one is where it started.
      comparison: true,
      framing: {
        // Wider than the pair actually is, so the opening dolly has somewhere
        // to come in from.
        halfWidth: 12.6,
        halfHeight: 7.2,
        minimumDistance: 20,
        target: new THREE.Vector3(0, -1.8, 0.2),
      },
      cameraAt,
      overlayAt,

      /** What the scene is told at each instant. */
      driveAt: (t, scene) => {
        scene.setCardiacPhase(cardiacPhaseAt(t));
        scene.setModelControl('systemicResistanceMmHgSPerMl', resistanceAt(t));
        scene.setBeatEmphasis({ residual: residualEmphasisAt(t) });
      },

      /**
       * The figures the copy interpolates, read out of the scene's own panel so
       * a video can never quote something the interactive page would not.
       */
      readMetrics: (scene) => {
        const rows = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row]));
        const pair = (id) => ({ before: rows[id].reference, now: rows[id].value });
        return { map: pair('map'), co: pair('co'), sv: pair('sv') };
      },

      /** Hand the beat to the sequence, and hand it back on the way out. */
      onEnter: (scene) => {
        scene.setCardiacPhaseDriven(true);
      },
      onExit: (scene) => {
        scene.setCardiacPhaseDriven(false);
        scene.setBeatEmphasis({ residual: 0 });
      },
    };
  }

  /**
   * Presentation emphasis on the blood that did not leave.
   *
   * Visualization only: no model value changes, and both hearts get the same
   * treatment so a comparison stays a comparison.
   *
   * @param {{ ejection?: number, residual?: number }} emphasis
   */
  setBeatEmphasis(emphasis) {
    this.blood?.setEmphasis(emphasis);
    this.reference?.blood.setEmphasis(emphasis);
  }

  // -------------------------------------------------------------------------
  // Read-outs
  // -------------------------------------------------------------------------

  /**
   * The live read-out.
   *
   * Every figure is an output of the circulation. Precision is deliberately
   * coarse — volumes to the millilitre, pressures to the mmHg, output to a
   * tenth of a litre — because the chamber is a truncated-ellipsoid
   * approximation driven by a lumped circulation and anything finer would imply
   * accuracy the model has not got.
   *
   * While comparing, each row carries the value it is measured against: this
   * preset's condition before the reader moved anything, from the same model.
   */
  getMetrics() {
    const m = this.state;
    // Every row is read against where this experiment started, always —
    // including before anything has moved, when the difference is ±0. The
    // column used to appear with the first change, and that appearance pushed
    // the console, and the slider under the reader's finger, down (owner's
    // phone recordings, 2026-09-25). A column that is always there cannot
    // move anything when it fills in.
    const ref = this.session.baseline.metrics;
    const mmHg = (value) => Math.round(value);
    const rows = [];
    /** The signed change on a headline row, at the precision it is shown with. */
    const delta = (now, before, digits = 0) => (ref ? { ...signedDelta(now, before, digits), ...changeOf(now, before) } : {});

    // A condition that could not be solved is not answered with the previous
    // one's numbers pretending to be current. Every reachable slider position
    // is inside the verified domain, so this row should never appear; it exists
    // because "should never" is not "cannot", and a silent fallback is the
    // failure that would otherwise follow.
    if (!this.session.applied) {
      rows.push({
        id: 'unsolved',
        label: UNSOLVED_NOTICE.label,
        labelJa: UNSOLVED_NOTICE.labelJa,
        value: UNSOLVED_NOTICE.value,
        valueJa: UNSOLVED_NOTICE.valueJa,
        unit: '',
        emphasis: true,
      });
    }

    // Say **what was done** before saying what came of it. An external review
    // asked for this (D-12): "I only changed one thing" is the claim the whole
    // scene rests on, and nothing on screen said which one.
    //
    // It used to say it in the model's vocabulary — 「2 つ: 抵抗・収縮力（他 2
    // 固定）」 — which counted inputs instead of saying what happened to them.
    // `describeChange` names each moved input with its direction and the held
    // ones while they are few, so dobutamine reads as "contractility ↑ ·
    // resistance ↓ (rate, filling held)". See `changeSummary.js`.
    //
    // `view.input`, not `session.input`: the row describes the condition the
    // numbers beside it came from. When a condition is refused the two differ,
    // and a row that described the request would name a change the figures do
    // not contain.
    //
    // Emitted on every update, first, and whether or not the second heart is
    // drawn: `MetricsPanel` shows rows in the order they are handed over, and
    // this is the line the figures under it are read against.
    const change = describeChange({
      baseline: this.session.baseline.input,
      shown: this.session.view.input,
      interventionId: this.session.interventionId,
    });
    // Named as *from → to* — the starting condition the figures are read
    // against, then where the reader is now — so the before value on every
    // row below says what it is the value of. A starting condition on its own
    // is the start of an experiment and is named alone.
    // One fixed line: what the figures are read against, and where the
    // condition came from. It names the state, not a history, so it does not
    // grow as the reader keeps moving things.
    const fromOption = PRESET_OPTIONS.find((option) => option.value === this.session.presetId);
    const applied = INTERVENTION_OPTIONS.find((option) => option.value === this.session.interventionId && option.value !== INTERVENTION_IDS.NONE);
    const adjusted = INTERVENTION_OPTIONS.find((option) => option.value === this.session.adjustedAfter && option.value !== INTERVENTION_IDS.NONE);
    const atStart = change.moved.length === 0;
    const origin = (ja) => {
      const pick = (option) => (ja ? option.shortJa ?? option.labelJa : option.short ?? option.label);
      if (applied) return `${pick(applied)}${ja ? '：' : ': '}`;
      if (adjusted) return ja ? `${pick(adjusted)}適用後を調整：` : `Adjusted after ${pick(adjusted)}: `;
      return '';
    };
    const fromEn = fromOption?.short ?? fromOption?.label;
    const fromJa = fromOption?.shortJa ?? fromOption?.labelJa;
    rows.push({
      id: 'changed',
      // What the reader changed — inputs, not results. The figures under it
      // are what the model computed from them.
      label: atStart ? `At the start (${fromEn}) — nothing changed` : `You changed (from ${fromEn})`,
      labelJa: atStart ? `開始時（${fromJa}）のまま` : `変えた入力（${fromJa}から）`,
      value: atStart ? '' : `${origin(false)}${change.value}`,
      valueJa: atStart ? '' : `${origin(true)}${change.valueJa}`,
      // On a phone this row is only the strip's heading: which inputs moved
      // and which way is on the pad switcher (an arrow on each moved value,
      // none on a held one), and the values are on the axes. What the strip
      // says is what its two lines are.
      labelShortJa: '計算結果（下段は開始時との差）',
      valueShortJa: '',
      unit: '',
      emphasis: true,
      compact: true,
    });

    rows.push(
      {
        id: 'co',
        label: 'Cardiac output',
        labelJa: '心拍出量 CO',
        value: m.cardiacOutputLMin.toFixed(1),
        reference: ref ? ref.cardiacOutputLMin.toFixed(1) : undefined,
        unit: 'L/min',
        ...delta(m.cardiacOutputLMin.toFixed(1), ref?.cardiacOutputLMin.toFixed(1), 1),
        emphasis: true,
        compact: true,
      },
      {
        id: 'sv',
        label: 'Stroke volume',
        labelJa: '1回拍出量 SV',
        value: Math.round(m.strokeVolumeMl),
        reference: ref ? Math.round(ref.strokeVolumeMl) : undefined,
        unit: 'mL',
        ...delta(Math.round(m.strokeVolumeMl), Math.round(ref?.strokeVolumeMl), 0),
        emphasis: true,
      },
      {
        id: 'map',
        label: 'Mean arterial pressure',
        labelJa: '平均動脈圧 MAP',
        value: mmHg(m.meanArterialPressureMmHg),
        reference: ref ? mmHg(ref.meanArterialPressureMmHg) : undefined,
        unit: 'mmHg',
        ...delta(mmHg(m.meanArterialPressureMmHg), mmHg(ref?.meanArterialPressureMmHg), 0),
        emphasis: true,
        compact: true,
      },
      {
        id: 'lvedp',
        // Out of the detail and onto the face of the panel, because the cost of
        // filling is the thing this scene most needs a reader to see at the
        // same moment as the benefit.
        // Named as what it is to a reader — the pressure it took to fill the
        // ventricle — with the measured quantity in brackets.
        label: 'LV filling pressure (LVEDP)',
        labelJa: '左室充満圧（LVEDP）',
        value: mmHg(m.endDiastolicPressureMmHg),
        reference: ref ? mmHg(ref.endDiastolicPressureMmHg) : undefined,
        unit: 'mmHg',
        ...delta(mmHg(m.endDiastolicPressureMmHg), mmHg(ref?.endDiastolicPressureMmHg), 0),
        emphasis: true,
        compact: true,
      },
      {
        id: 'pvp',
        // Promoted alongside the filling pressure after the external review of
        // 2026-09-22, and moved back under "all figures" on 2026-09-25 at the
        // owner's direction: the read-out carried five headline figures and
        // read as a dashboard. The cost of filling is still on the face of
        // the panel — the LV end-diastolic pressure above says it — and this
        // row is one press away, with its before value and change.
        //
        // It is this model's pulmonary venous compartment and nothing more —
        // not a wedge pressure, not a capillary pressure, and no threshold in
        // it is read as oedema. The scope panel says so on the same screen.
        label: 'Mean pulmonary venous pressure',
        labelJa: '平均肺静脈圧',
        value: mmHg(m.meanPulmonaryVenousPressureMmHg),
        reference: ref ? mmHg(ref.meanPulmonaryVenousPressureMmHg) : undefined,
        unit: 'mmHg',
        ...delta(mmHg(m.meanPulmonaryVenousPressureMmHg), mmHg(ref?.meanPulmonaryVenousPressureMmHg), 0),
      },
      {
        id: 'bp',
        label: 'Arterial pressure',
        labelJa: '動脈圧',
        value: `${mmHg(m.systolicPressureMmHg)}/${mmHg(m.diastolicPressureMmHg)}`,
        reference: ref ? `${mmHg(ref.systolicPressureMmHg)}/${mmHg(ref.diastolicPressureMmHg)}` : undefined,
        unit: 'mmHg',
      },
      {
        id: 'edv',
        label: 'End-diastolic volume',
        labelJa: '拡張末期容積 EDV',
        value: Math.round(m.edvMl),
        reference: ref ? Math.round(ref.edvMl) : undefined,
        unit: 'mL',
      },
      {
        id: 'esv',
        label: 'End-systolic volume',
        labelJa: '収縮末期容積 ESV',
        value: Math.round(m.esvMl),
        reference: ref ? Math.round(ref.esvMl) : undefined,
        unit: 'mL',
      },
      {
        id: 'ef',
        label: 'Ejection fraction',
        labelJa: '駆出率 EF',
        value: Math.round(m.ejectionFraction * 100),
        reference: ref ? Math.round(ref.ejectionFraction * 100) : undefined,
        unit: '%',
      },
      {
        id: 'hr',
        label: 'Heart rate',
        labelJa: '心拍数',
        value: Math.round(m.heartRatePerMin),
        reference: ref ? Math.round(ref.heartRatePerMin) : undefined,
        unit: '/min',
      },
      {
        id: 'lvp',
        // What the ventricle has to generate, as opposed to what the artery
        // sees. The two track each other while the valve is open and separate
        // as resistance rises, which is the afterload lesson.
        label: 'LV peak systolic pressure',
        labelJa: '左室収縮期最高圧',
        value: mmHg(m.peakVentricularPressureMmHg),
        reference: ref ? mmHg(ref.peakVentricularPressureMmHg) : undefined,
        unit: 'mmHg',
      },
      {
        id: 'svr',
        label: 'Systemic vascular resistance',
        labelJa: '体血管抵抗 SVR',
        value: Math.round(m.systemicResistanceDynSCm5),
        reference: ref ? Math.round(ref.systemicResistanceDynSCm5) : undefined,
        unit: 'dyn·s·cm⁻⁵',
      }
    );
    // The computed results on the face of the panel, always the same four in
    // the same order — output, stroke volume, arterial pressure and the
    // filling pressure that often moves the other way — so nothing is
    // reshuffled while the reader is moving an input. The rest are one press
    // away under 「他の指標」.
    //
    // Before anything has moved, the rows carry their start value and ±0 but
    // say they are quiet: the panel keeps the room for them — so nothing moves
    // when they fill in — without repeating "start → now ±0" on every figure.
    const headline = ['co', 'sv', 'map', 'lvedp'];
    // Short names for a phone's four narrow columns, where the full ones were
    // cut and ran into the next column.
    const short = { co: '心拍出量', sv: '1回拍出量', map: '平均動脈圧', lvedp: '左室充満圧' };
    for (const row of rows) {
      if (row.id === 'changed' || row.id === 'unsolved') continue;
      row.emphasis = headline.includes(row.id);
      row.compact = headline.includes(row.id);
      if (short[row.id]) row.labelShortJa = short[row.id];
      // The signed figure is a difference from the start of this experiment,
      // and says so; it is never drawn as "start → change".
      if (row.delta != null) {
        row.deltaLabel = 'vs start';
        row.deltaLabelJa = '開始時比';
      }
      if (atStart && !this.comparing) row.quiet = true;
    }
    const rank = (row) => (row.id === 'unsolved' ? -2 : row.id === 'changed' ? -1 : headline.includes(row.id) ? headline.indexOf(row.id) : headline.length);
    rows.sort((a, b) => rank(a) - rank(b));
    return rows;
  }

  /**
   * The loop and the waveform, from one read of one solved beat, so the two
   * plots cannot draw different beats.
   */
  getPressureVolume() {
    return {
      current: this.session.view.curves,
      reference: this.comparing ? this.session.baseline.curves : null,
      phase: this.phase,
      beat: this.getBeatPhase(),
    };
  }

  /** Where the beat is, named from the same phase and the same solved valve times. */
  getBeatPhase() {
    return beatPhaseAt(this.phase, this.state);
  }

  /** @returns {number} 0..1 */
  getCardiacPhase() {
    return this.phase;
  }

  /** @param {boolean} driven */
  setCardiacPhaseDriven(driven) {
    this.cardiacPhaseDriven = driven;
  }

  /** @param {number} phase 0..1 */
  setCardiacPhase(phase) {
    this.phase = phase;
  }

  /**
   * Side by side with the condition before the reader started moving things.
   *
   * Built on first use: it doubles the chamber geometry and most readers never
   * turn it on. Both hearts are drawn from the same model. They start the
   * comparison in step, and each then beats at **its own** rate: the "before"
   * heart at the starting condition's rate, the current one at the current
   * rate. They used to share one phase, which forced two different rates into
   * step and hid exactly the difference a rate change makes (owner's brief,
   * 2026-09-25). At equal rates they stay in step, as they should.
   *
   * @param {boolean} enabled
   */
  /**
   * Whether "before" and "now" differ. Two identical conditions side by side
   * teach nothing and invite reading a difference into the picture that the
   * figures do not have, so the shell offers the comparison only when this is
   * true.
   */
  canCompare() {
    return this.session.moved;
  }

  setComparison(enabled) {
    this.comparing = enabled;
    if (enabled && !this.reference) {
      this.reference = new BeforeHeart(this._bloodBuffers, this._quality, this.myocardialVolumeMl);
      this.reference.syncViewport(this.viewer.camera, this.viewer.renderer);
      this.root.add(this.reference);
    }
    if (this.reference) {
      this.reference.setState(this.session.baseline.metrics, this.session.baseline.cycle);
      this.reference.visible = enabled;
      this.reference.position.copy(COMPARISON_AXIS).multiplyScalar(enabled ? -COMPARISON_OFFSET : 0);
      if (enabled) {
        this._referencePhase = this.phase;
        this.reference.setPhase(this.phase);
      }
    }
    this.primary.position.copy(COMPARISON_AXIS).multiplyScalar(enabled ? COMPARISON_OFFSET : 0);
    // The circuit is about one condition, and two conditions cannot share it
    // without implying they are connected to each other.
    this.circuit.object.visible = !enabled;
    this.blood.setExitFalloff(enabled ? 3.5 : 1.2);
    this._applyOutlineVisibility();
  }

  /**
   * The box the shell frames into the band the panels leave.
   *
   * Declared rather than measured, and that is the point: a box taken from the
   * live meshes would shrink and grow with the beat, and the camera would
   * breathe with the ventricle. These are the extents of the assembly at its
   * largest — the chamber at the top of its filling range, plus the whole
   * circuit — so the framing is stable while everything inside it moves.
   *
   * Without this the lower run of the circuit sat behind the console and the
   * loop read as two unconnected arcs, which is the one thing a circuit diagram
   * cannot afford. Implementing the capability is how a scene asks to be framed
   * into the safe band; it is not a branch in the shell.
   */
  getSubjectBounds() {
    // The two hearts lie along COMPARISON_AXIS, which has x and z parts.
    const spreadX = this.comparing ? COMPARISON_OFFSET * Math.abs(COMPARISON_AXIS.x) : 0;
    const spreadZ = this.comparing ? COMPARISON_OFFSET * Math.abs(COMPARISON_AXIS.z) : 0;
    const min = new THREE.Vector3(-7.8 - spreadX, -7.1, -3.8 - spreadZ);
    const max = new THREE.Vector3(7.1 + spreadX, 4.4, 3.8 + spreadZ);
    const corners = [];
    for (const x of [min.x, max.x]) {
      for (const y of [min.y, max.y]) {
        for (const z of [min.z, max.z]) corners.push(new THREE.Vector3(x, y, z));
      }
    }
    return {
      centre: min.clone().add(max).multiplyScalar(0.5),
      corners,
      // The whole box, not more. At 1.1 — chosen when the loop sat in a wide
      // band and measured as filling only 62% of it — the lower run of the
      // loop slid under the read-out on a phone, where the band is tight and
      // the box is the silhouette. Nothing may cover the model (the owner's
      // rule), so the box is fitted with a little to spare for the tubes'
      // own thickness, and the heart is a little smaller.
      coverage: 0.95,
    };
  }

  /** Wider framing that holds both hearts clear of the console. */
  getComparisonView() {
    const portrait = this.viewer.camera.aspect < 0.85;
    return framing(new THREE.Vector3(0, portrait ? -2.4 : -3.4, 0.3), portrait ? 34 : 30);
  }

  getAnnotations() {
    const anchors = {
      cavity: ANCHORS.cavity ?? new THREE.Vector3(0, -2.4, 1.4),
      aorta: ANATOMY.aorticValve.clone().add(new THREE.Vector3(-0.6, 1.4, 0)),
      resistance: this.circuit?.anchors.resistance.clone() ?? new THREE.Vector3(-8.6, -0.4, -3.4),
      return: this.circuit?.anchors.return.clone() ?? new THREE.Vector3(-1, -5.3, -3),
      node: this.circuit?.anchors.node.clone() ?? new THREE.Vector3(6.4, -0.2, -2.95),
      // Above each heart's base, where the two sit while comparing.
      comparisonBefore: COMPARISON_AXIS.clone().multiplyScalar(-COMPARISON_OFFSET).setY(ANATOMY.baseY + 1.6),
      comparisonNow: COMPARISON_AXIS.clone().multiplyScalar(COMPARISON_OFFSET).setY(ANATOMY.baseY + 1.6),
    };
    return [...ANNOTATIONS, ...COMPARISON_ANNOTATIONS].map((annotation) => ({
      ...annotation,
      position: anchors[annotation.anchor].clone(),
    }));
  }

  dispose() {
    this._offResize?.();
    this.reference?.dispose();
    this.apparatus?.dispose();
    this.circuit?.dispose();
    disposeObject(this.root);
  }
}

/** Rounding a control's value for display, at the precision the model has. */
function formatControl(id, value) {
  if (id === 'systemicResistanceMmHgSPerMl') return value.toFixed(2);
  if (id === 'contractilityEesMmHgPerMl') return value.toFixed(2);
  return String(Math.round(value));
}

/**
 * The condition before the reader moved anything, drawn beside the current one.
 *
 * Its cavity comes from the same model, solved for that condition, and its
 * myocardial volume is the same fixed value the current heart uses — the two
 * differ in what the circulation did, not in how much muscle they were given.
 */
class BeforeHeart extends THREE.Group {
  /**
   * @param {object} bloodBuffers the same particle slots the current heart uses
   * @param {{segments:number, profilePoints:number}} quality
   * @param {number} myocardialVolumeMl the one fixed muscle volume, shared
   */
  constructor(bloodBuffers, quality, myocardialVolumeMl) {
    super();
    this.name = 'before-condition';
    this.myocardialVolumeMl = myocardialVolumeMl;
    this.phase = 0;
    this.chamber = new Chamber({
      cutAngle: ANATOMY.cutAngle,
      segments: quality.segments,
      profilePoints: quality.profilePoints,
      variant: 'reference',
    });
    this.apparatus = new ValveApparatus({ variant: 'reference' });
    this.blood = new BloodField(bloodBuffers, {
      flowColor: PALETTE.flow,
      staticColor: PALETTE.residual,
    });
    this.blood.material.uniforms.uOpacity.value = 0.3;
    this.outline = new CavityOutline({ cutAngle: ANATOMY.cutAngle, color: PALETTE.outline });
    this.outline.visible = true;
    this.add(this.chamber, this.apparatus, this.blood, this.outline);
  }

  setState(metrics, cycle) {
    this.metrics = metrics;
    this.cycle = cycle;
    this.edShape = ventricleShape({
      cavityVolumeMl: metrics.edvMl,
      myocardialVolumeMl: this.myocardialVolumeMl,
      longToShortAxisRatio: REFERENCE_GEOMETRY.longToShortAxisRatio,
    });
    this.blood.setEjectionWindow(metrics.ejectionStartPhase, metrics.ejectionEndPhase);
    this.outline.setShape({ ...this.edShape, baseY: ANATOMY.baseY });
  }

  emptiedFraction() {
    const volume = cavityVolumeAt(this.phase, { cycle: this.cycle });
    const { edvMl, esvMl } = this.metrics;
    return Math.min(1, Math.max(0, (edvMl - volume) / Math.max(1, edvMl - esvMl)));
  }

  setOutline(value) {
    this.outline.setOpacity(value);
  }

  setPhase(phase) {
    this.phase = phase;
    const cavityVolumeMl = cavityVolumeAt(phase, { cycle: this.cycle });
    const shape = ventricleShape({
      cavityVolumeMl,
      myocardialVolumeMl: this.myocardialVolumeMl,
      longToShortAxisRatio: REFERENCE_GEOMETRY.longToShortAxisRatio,
    });
    const descent = (shape.outerSemiLength - this.edShape.outerSemiLength) * APEX_PINNING;
    this.chamber.position.y = descent;
    this.blood.setDescent(descent);
    this.chamber.setTorsion(
      TORSION_ILLUSTRATIVE_MAX * this.emptiedFraction() * Math.min(1, this.metrics.ejectionFraction / 0.58)
    );
    this.chamber.setShape({ ...shape, baseY: ANATOMY.baseY });
    this.apparatus.update({ ...shape, baseY: ANATOMY.baseY }, phase, this.metrics, descent);
    this.blood.setCavity(shape.cavityRadius, shape.cavitySemiLength);
    this.blood.setApexDrift(
      VENTRICLE_SHAPING.apexDriftX * shape.outerSemiLength,
      VENTRICLE_SHAPING.apexDriftZ * shape.outerSemiLength
    );
  }

  update(elapsed) {
    this.blood.setCycle(this.phase, this.metrics.ejectionFraction);
    this.blood.update(elapsed);
  }

  syncViewport(camera, renderer) {
    this.blood.syncViewport(camera, renderer);
  }

  dispose() {
    this.apparatus.dispose();
    this.outline.dispose();
  }
}
