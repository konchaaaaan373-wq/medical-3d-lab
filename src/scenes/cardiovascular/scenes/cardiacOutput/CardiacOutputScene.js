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
import { CONTROL_DOMAIN, CONTROL_IDS, PRESET_IDS, REFERENCE_GEOMETRY } from '../../../../models/cardiacOutput.js';
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
  CUSTOM_SCENARIO,
  SCENARIOS,
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

    // Where the cavity wall stood at end-diastole *before* the reader changed
    // anything — the starting condition's solved shape, not a copy of this
    // one scaled. Drawn over the beating heart whenever the condition has
    // moved, so a change in filling reads as the cavity outgrowing its old
    // outline, in the heart itself, rather than only as a number. Off while
    // the two hearts stand side by side, where the second heart says it.
    this.beforeOutline = new CavityOutline({ cutAngle: ANATOMY.cutAngle, color: PALETTE.before });
    this.beforeOutline.visible = false;

    this.primary = new THREE.Group();
    this.primary.name = 'current-condition';
    this.primary.add(this.ventricle, this.apparatus, this.blood, this.outline, this.beforeOutline);

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
      this.reference.setPhase(this.phase);
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
    if (this.beforeOutline) {
      const before = ventricleShape({
        cavityVolumeMl: this.session.baseline.metrics.edvMl,
        myocardialVolumeMl: this.myocardialVolumeMl,
        longToShortAxisRatio: REFERENCE_GEOMETRY.longToShortAxisRatio,
      });
      this.beforeOutline.setShape({ ...before, baseY: ANATOMY.baseY });
    }
  }

  /** Whether the condition on screen differs from the one it is read against. */
  _changedFromStart() {
    const shown = this.session.view.input;
    const start = this.session.baseline.input;
    return CONTROL_IDS.some((id) => shown[id] !== start[id]);
  }

  _applyOutlineVisibility() {
    // Presentation only: the mark itself is the solved end-diastolic cavity and
    // this decides whether it is drawn. It earns its place while comparing,
    // where the stroke is what the two hearts are being read for.
    this.outline?.setOpacity((this.comparing ? 1 : 0) * this._emptiedFraction());
    // Presentation only, like the mark above: the shape is the solved one.
    const showBefore = !this.comparing && this._changedFromStart();
    if (this.beforeOutline) {
      this.beforeOutline.visible = showBefore;
      this.beforeOutline.setOpacity(showBefore ? 0.85 : 0);
    }
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
  /**
   * Which scenario the condition on screen is, or "custom".
   *
   * Read off the session every time rather than remembered: a scenario is a
   * preset, an intervention and at most a control moved, so it is a property
   * of the solved condition, and a remembered one could outlive the slider
   * that moved the condition away from it.
   */
  scenarioId() {
    return scenarioOf(this.session);
  }

  getModelControls() {
    const input = this.session.input;
    return [
      {
        id: 'preset',
        kind: 'choice',
        // Not drawn: the scenario row below is the control a reader meets.
        // Kept in the list, first, because a restore replays the list in order
        // and the preset resets everything — see the scenario's own comment.
        hidden: true,
        // The circulation being experimented on, and — below it — what is done
        // to it. Two different kinds of choice, so they are two rows with two
        // captions rather than five cards in one grid.
        label: 'Condition',
        labelJa: '状態',
        caption: 'Heart',
        captionJa: '心臓の状態',
        value: this.session.presetId,
        options: PRESET_OPTIONS,
      },
      {
        // After the preset and before the sliders, which is also the order a
        // restore replays them in: the preset resets everything, the
        // intervention is computed from the preset's own starting condition,
        // and the sliders land last and win — which is right, because a slider
        // position is a manual condition and clears any intervention anyway.
        id: 'intervention',
        kind: 'choice',
        hidden: true,
        label: 'Intervention',
        labelJa: '介入',
        caption: 'Intervention',
        captionJa: '介入',
        // A hand-set condition is not "no intervention", and the row must not
        // say it is: moving a slider clears the intervention in the session,
        // which left 「なし」 lit while the figures beside it had moved. So the
        // row reports what is on screen — a status, not a choice, and not a
        // model state: the session has no "manual" intervention, and
        // `setModelControl` ignores this value when a restore replays it.
        value: this.session.moved && this.session.interventionId === INTERVENTION_IDS.NONE
          ? MANUAL_CONDITION
          : this.session.interventionId,
        options: [...INTERVENTION_OPTIONS, MANUAL_OPTION],
      },
      {
        // The one row a reader meets first: named situations, each exactly a
        // preset, optionally an intervention, optionally one control moved
        // (see SCENARIOS). Its value is *derived* from the session, not stored,
        // so it cannot disagree with what is solved: a slider that moves the
        // condition off every scenario turns it into "Custom", a status chip
        // that is not pressable. After the preset and the intervention in the
        // list, so a restore that replays them lands on the same scenario, and
        // before the sliders, which land last and win.
        id: 'scenario',
        kind: 'choice',
        label: 'Scenario',
        labelJa: 'シナリオ',
        caption: 'Choose one — the heart and the figures change',
        captionJa: '選ぶと、心臓と数値が変わります',
        value: scenarioOf(this.session),
        options: [
          ...SCENARIOS.map((scenario) => ({
            value: scenario.id,
            label: scenario.title,
            labelJa: scenario.titleJa,
            short: scenario.label,
            shortJa: scenario.labelJa,
            tag: scenario.tag,
            tagJa: scenario.tagJa,
          })),
          { value: CUSTOM_SCENARIO.id, label: CUSTOM_SCENARIO.label, labelJa: CUSTOM_SCENARIO.labelJa, status: true },
        ],
      },
      ...CONTROLS.map((control) => {
        const domain = CONTROL_DOMAIN[control.id];
        return {
          id: control.id,
          label: control.label,
          labelJa: control.labelJa,
          min: domain.min,
          max: domain.max,
          step: domain.step,
          value: input[control.id],
          // Secondary: the four inputs are how the model is parameterised, and
          // the scene is about choosing a condition and one thing to do to it.
          // They are still here, one press away, moving the same model.
          advanced: true,
          format: (value) => `${formatControl(control.id, value)}${control.unit}`,
        };
      }),
    ];
  }

  /**
   * @param {string} id `preset` or one of the four
   * @param {number|string} value
   */
  setModelControl(id, value) {
    if (id === 'scenario') {
      // "Custom" is a report, not something to select.
      const scenario = SCENARIOS.find((entry) => entry.id === value);
      if (!scenario) return;
      // Always from the scenario's own starting condition: selecting a preset
      // resets everything, so a scenario never inherits a previous one's
      // sliders.
      this.session.selectPreset(scenario.preset);
      if (scenario.intervention) this.session.selectIntervention(scenario.intervention);
      for (const [control, target] of Object.entries(scenario.controls ?? {})) {
        this.session.setControl(control, target);
      }
    } else if (id === 'preset') {
      this.session.selectPreset(String(value));
    } else if (id === 'intervention') {
      // "Manual" is a report, not something to select — see getModelControls.
      if (value === MANUAL_CONDITION) return;
      // 「なし」 means this condition's starting point. From a hand-set
      // condition the session already holds no intervention, so asking it to
      // clear one did nothing — the button a reader presses to undo their
      // sliders has to actually undo them.
      if (value === INTERVENTION_IDS.NONE && this.session.moved) this.session.reset();
      else this.session.selectIntervention(String(value));
    } else {
      this.session.setControl(id, Number(value));
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
    // "Before" is shown whenever there is a before to show: while the second
    // heart is drawn, and whenever the condition on screen is not the one this
    // state started at. It used to be the first case only, so a reader who
    // pressed dobutamine saw 4.5 and had to remember that it had been 3.7.
    // With nothing changed and nothing compared there is no column, because a
    // row reading "3.7 → 3.7 ±0" is noise, not a comparison.
    const changed = CONTROL_IDS.some((id) => this.session.view.input[id] !== this.session.baseline.input[id]);
    const ref = this.comparing || changed ? this.session.baseline.metrics : null;
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
    const fromOption = PRESET_OPTIONS.find((option) => option.value === this.session.presetId);
    const scenarioId = scenarioOf(this.session);
    const scenario = SCENARIOS.find((entry) => entry.id === scenarioId) ?? CUSTOM_SCENARIO;
    const atStart = change.moved.length === 0;
    rows.push({
      id: 'changed',
      label: atStart ? (fromOption?.short ?? fromOption?.label) : `${fromOption?.short ?? fromOption?.label} → ${scenario.label}`,
      labelJa: atStart ? (fromOption?.shortJa ?? fromOption?.labelJa) : `${fromOption?.shortJa ?? fromOption?.labelJa} → ${scenario.labelJa}`,
      value: atStart ? 'the starting point — choose a scenario to compare' : change.value,
      valueJa: atStart ? 'ここを起点に比べます' : change.valueJa,
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
   * turn it on. Both hearts are drawn from the same model and run on one phase,
   * so they reach end-diastole together even when the rates differ — which is a
   * synchronised *display* of two states and not a claim that they beat at the
   * same rate. Neither heart's rate is changed to achieve it.
   *
   * @param {boolean} enabled
   */
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
      this.reference.position.x = enabled ? -COMPARISON_OFFSET : 0;
      if (enabled) this.reference.setPhase(this.phase);
    }
    this.primary.position.x = enabled ? COMPARISON_OFFSET : 0;
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
    const spread = this.comparing ? COMPARISON_OFFSET : 0;
    const min = new THREE.Vector3(-7.8 - spread, -7.1, -3.8);
    const max = new THREE.Vector3(7.1 + spread, 4.4, 3.8);
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
      comparisonBefore: new THREE.Vector3(-COMPARISON_OFFSET, ANATOMY.baseY + 1.6, 0),
      comparisonNow: new THREE.Vector3(COMPARISON_OFFSET, ANATOMY.baseY + 1.6, 0),
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

/**
 * Which scenario a session's condition is, or "custom" — see `scenarioId`.
 * A function of the session alone, so the read-out can name it without a
 * built scene.
 */
export function scenarioOf(session) {
  const shown = session.view.input;
  for (const scenario of SCENARIOS) {
    if (session.presetId !== scenario.preset) continue;
    const intervention = scenario.intervention ?? INTERVENTION_IDS.NONE;
    if (session.interventionId !== intervention) continue;
    // Any slider move clears the intervention, so a matching intervention is
    // the scenario unmodified.
    if (scenario.intervention) return scenario.id;
    const expected = { ...session.baseline.input, ...(scenario.controls ?? {}) };
    if (CONTROL_IDS.every((key) => shown[key] === expected[key])) return scenario.id;
  }
  return CUSTOM_SCENARIO.id;
}

/** The intervention row's value while the condition has been set by hand. */
const MANUAL_CONDITION = 'manual';

/** Shown only while it is true; never pressable. */
const MANUAL_OPTION = Object.freeze({
  value: MANUAL_CONDITION,
  label: 'Adjusted by hand',
  labelJa: '手動調整',
  status: true,
});

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
