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
  COMPARISON_LABEL,
  CONTROLS,
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
    subtitle: 'Filling, resistance, contractility, rate — one circulation solving for all of them',
    subtitleJa: '充満・血管抵抗・収縮力・心拍数 ｜ 1 つの循環がすべてを解く',
    progression: { enabled: false },
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
    return [
      {
        id: 'preset',
        kind: 'choice',
        label: 'Starting condition',
        labelJa: '開始条件',
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
        label: 'Intervention',
        labelJa: '介入',
        value: this.session.interventionId,
        options: INTERVENTION_OPTIONS,
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
    if (id === 'preset') {
      this.session.selectPreset(String(value));
    } else if (id === 'intervention') {
      this.session.selectIntervention(String(value));
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
    const ref = this.comparing ? this.session.baseline.metrics : null;
    const mmHg = (value) => Math.round(value);
    const rows = [];

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

    // Say **what is being compared** before saying what came of it. An
    // external review asked for this: "I only changed one thing" is the claim
    // the whole scene rests on, and nothing on screen said which one.
    //
    // Emitted on every update, not only while comparing, for two reasons. It
    // is the answer to "what have I done" whether or not the second heart is
    // drawn — and `MetricsPanel` appends a row the first time it sees its id,
    // so a row that appears later lands at the bottom of the panel, below the
    // fold, which is where the first version of this went.
    {
      // `view.input`, not `session.input`: the row describes the condition the
      // numbers beside it came from. When a condition is refused the two
      // differ — the controls hold what was asked for, the screen holds what
      // was solved — and a row that described the request would name a change
      // the figures do not contain.
      const shown = this.session.view.input;
      const baseline = this.session.baseline.input;
      const moved = CONTROL_IDS.filter((id) => shown[id] !== baseline[id]);
      const held = CONTROL_IDS.length - moved.length;
      const format = (value) => (Number.isInteger(value) ? value : Number(value.toFixed(2)));
      const name = (id, ja) => {
        const control = CONTROLS.find((entry) => entry.id === id);
        return (ja ? control?.shortJa : control?.short) ?? id;
      };
      // Short on purpose. The first version spelled out every moved control
      // with both its values, and a four-control condition rendered as two
      // lines of large type that widened the read-out across the model. One
      // moved control is the case worth spelling out — it is the one-factor
      // comparison this scene is for — and beyond that the count and the
      // names are what a reader needs.
      // The held count rides in the value rather than in `unit`, which
      // `MetricsPanel` renders in one language only — a bilingual string in a
      // single-language slot shows both to everybody.
      const describe = (ja) => {
        if (moved.length === 0) return ja ? 'なし' : 'none';
        const rest = held === 0 ? '' : ja ? `（他 ${held} 固定）` : ` (${held} held)`;
        if (moved.length === 1) {
          const id = moved[0];
          return `${name(id, ja)} ${format(baseline[id])} → ${format(shown[id])}${rest}`;
        }
        const list = moved.map((id) => name(id, ja)).join(ja ? '・' : ', ');
        return ja ? `${moved.length} つ: ${list}${rest}` : `${moved.length}: ${list}${rest}`;
      };
      rows.push({
        id: 'changed',
        label: 'Changed',
        labelJa: '変えたもの',
        value: describe(false),
        valueJa: describe(true),
        unit: '',
        emphasis: true,
      });
    }

    rows.push(
      {
        id: 'co',
        label: 'Cardiac output',
        labelJa: '心拍出量 CO',
        value: m.cardiacOutputLMin.toFixed(1),
        reference: ref ? ref.cardiacOutputLMin.toFixed(1) : undefined,
        unit: 'L/min',
        emphasis: true,
      },
      {
        id: 'sv',
        label: 'Stroke volume',
        labelJa: '1回拍出量 SV',
        value: Math.round(m.strokeVolumeMl),
        reference: ref ? Math.round(ref.strokeVolumeMl) : undefined,
        unit: 'mL',
        emphasis: true,
      },
      {
        id: 'map',
        label: 'Mean arterial pressure',
        labelJa: '平均動脈圧 MAP',
        value: mmHg(m.meanArterialPressureMmHg),
        reference: ref ? mmHg(ref.meanArterialPressureMmHg) : undefined,
        unit: 'mmHg',
        emphasis: true,
      },
      {
        id: 'lvedp',
        // Out of the detail and onto the face of the panel, because the cost of
        // filling is the thing this scene most needs a reader to see at the
        // same moment as the benefit.
        label: 'LV end-diastolic pressure',
        labelJa: '左室拡張末期圧',
        value: mmHg(m.endDiastolicPressureMmHg),
        reference: ref ? mmHg(ref.endDiastolicPressureMmHg) : undefined,
        unit: 'mmHg',
        emphasis: true,
      },
      {
        id: 'pvp',
        // Promoted alongside the filling pressure for the same reason: raising
        // the filling raises output *and* the pressure behind the left heart,
        // and a reader who sees only the first has been shown half of it.
        // Reviewed externally 2026-09-22 and asked for explicitly.
        //
        // It is this model's pulmonary venous compartment and nothing more —
        // not a wedge pressure, not a capillary pressure, and no threshold in
        // it is read as oedema. The scope panel says so on the same screen.
        label: 'Mean pulmonary venous pressure',
        labelJa: '平均肺静脈圧',
        value: mmHg(m.meanPulmonaryVenousPressureMmHg),
        reference: ref ? mmHg(ref.meanPulmonaryVenousPressureMmHg) : undefined,
        unit: 'mmHg',
        emphasis: true,
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
      // A little short of filling the band: the loop has tubes leaving the
      // ventricle in three directions and flush edges cut all of them.
      coverage: 0.9,
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
    };
    return ANNOTATIONS.map((annotation) => ({
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
