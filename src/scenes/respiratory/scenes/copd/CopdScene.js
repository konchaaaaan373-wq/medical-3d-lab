import * as THREE from 'three';
import { createStudioLights } from '../../../shared/lighting.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { buildLungs } from '../../organs/lungs.js';
import { buildAirway } from '../../organs/airway.js';
import { buildDiaphragm } from '../../organs/diaphragm.js';
import {
  DEFAULT_CONTROLS,
  UNIT_COUNT,
  createRespiratoryModel,
  lungMechanics,
  maximalFlowVolume,
} from '../../../../models/copd.js';
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
} from '../../../../data/copd.js';
import { CAUSAL_STORY, LEARNING_MODULES } from '../../../../data/copdTeaching.js';

/**
 * Scene: COPD — expiratory flow limitation and dynamic hyperinflation.
 *
 * Everything on screen is a reading of [`src/models/copd.js`](../../../../models/copd.js).
 * The lungs' size, the diaphragm's height and curvature, the airways' calibre,
 * the direction and rate of the air, the numbers in the read-out and both
 * plots all come from one solved breath. There is no second equation anywhere
 * in this file, and no motion that is not the model moving.
 *
 * ### What is presentation and what is not
 *
 * The **shapes are exaggerated**. A tidal breath moves a chest by a few
 * millimetres; drawn to scale, this scene would be a still photograph of two
 * lungs. The excursion between residual volume and total lung capacity is
 * therefore drawn much larger than life, and so is the diaphragm's travel.
 * What is *not* exaggerated is any volume, flow, time or pressure — those are
 * the model's, unaltered, and every number the interface shows is one of them.
 *
 * Colour, glow and opacity are presentation throughout and are named so
 * (`emphasis`, `tint`). The one place a colour carries information is the
 * regional tint, which is a direct reading of how much gas each unit failed to
 * give back — and it says so in the legend.
 *
 * ### The one axis
 *
 * `setProgress` is **ventilatory demand**, from rest to hard work. It is not a
 * severity slider: how bad the lung is lives on the model controls, where it
 * can be changed one property at a time. Demand is on the main axis because it
 * is the axis along which dynamic hyperinflation actually develops.
 */
export class CopdScene {
  static meta = {
    id: 'copd-hyperinflation',
    title: 'COPD: flow limitation and hyperinflation',
    titleJa: 'COPD：呼気流量制限と動的過膨張',
    subtitle: 'Twelve lung units, one time constant each · one model drives every number here',
    subtitleJa: '12 単位の肺モデル ｜ 画面上のすべての数値が 1 つのモデルから導かれています',
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
    // Close to level with the chest: from higher up the diaphragm reads as a
    // floor the lungs are standing on rather than as the dome they sit in.
    position: new THREE.Vector3(2.1, 1.0, 10.6),
    target: new THREE.Vector3(0, -0.35, 0),
  };

  constructor({ viewer } = {}) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = CopdScene.meta.id;
    this.progress = 0;
    this.model = createRespiratoryModel({ controls: { ...DEFAULT_CONTROLS } });
    /**
     * A rolling window of lung volume against time, for the volume-time plot.
     * Long enough to hold several breaths, so the climb after a change is
     * something the reader watches happen rather than a number that jumps.
     */
    this.history = [];
    this.elapsedS = 0;
  }

  build() {
    const object = new THREE.Group();

    // Excursion well above the default: the default is sized for a tidal
    // breath, and this scene's axis runs from residual volume to total lung
    // capacity. Named here so that it is visibly a decision about drawing.
    this.lungs = buildLungs({ color: PALETTE.lung, opacity: 0.86, excursion: DRAWN_EXCURSION });
    this.airway = buildAirway({
      color: PALETTE.airway,
      cartilage: PALETTE.cartilage,
      branches: true,
    });
    this.diaphragm = buildDiaphragm({ color: PALETTE.diaphragm, opacity: 0.8, radius: 1.9 });

    // One marker per lung unit, mounted inside the lungs so they ride the
    // breath. Their brightness is the model's per-unit trapped volume — the
    // only place in this scene where a colour carries a number.
    this.unitMarkers = this.lungs.regions.slice(0, UNIT_COUNT).map((region) => {
      const material = tissueMaterial({
        color: PALETTE.trapped,
        roughness: 0.4,
        emissiveIntensity: 0,
        opacity: 0.5,
      });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), material);
      region.object.add(mesh);
      return { mesh, material };
    });

    this.air = createFlowStream({
      curves: this.airway.airPaths,
      count: 150,
      color: PALETTE.air,
      size: 4.2,
      speed: 0.5,
      spread: 0.07,
      seed: 41,
      opacity: 0.5,
    });

    object.add(this.lungs.object, this.airway.object, this.diaphragm.object, this.air.object);
    this.root.add(createStudioLights(), object);
    this.body = object;

    this.applyModelToScene();
    return this.root;
  }

  // --- the one axis ---------------------------------------------------------

  /** @param {number} value 0 = rest, 1 = hard work */
  setProgress(value) {
    this.progress = clamp(value);
    this.model.setControl('demand', this.progress);
  }

  update(dt) {
    this.model.advance(dt);
    this.elapsedS += dt;
    this.recordHistory();
    this.applyModelToScene();
    this.air.update(dt);
  }

  // --- reading the model into the scene -------------------------------------

  /**
   * Every drawn property, in one place.
   *
   * Single ownership on purpose: nothing else in this file writes a scale, a
   * position, an opacity or an emissive. If two things could set the lung's
   * size, one of them would eventually be wrong and nothing would say so.
   */
  applyModelToScene() {
    const state = this.model.state;
    const mechanics = this.model.mechanics;
    const phase = this.model.phase;

    // How full the lung is, measured against a *normal* lung's resting volume
    // and capacity rather than against its own. This is the model's volume;
    // the size it is drawn at is exaggerated, and that exaggeration lives in
    // `DRAWN_EXCURSION`, not here.
    const referenceSpan = REFERENCE_LUNG.totalLungCapacityL - REFERENCE_LUNG.relaxedVolumeL;
    const filling = (state.volumeL - REFERENCE_LUNG.relaxedVolumeL) / referenceSpan;
    this.lungs.setInflation(filling);

    // The diaphragm sits under the lungs and arrives where they arrive. Its
    // *curvature* is a second, slower thing: it follows the volume the lung
    // rests at, because what flattens a diaphragm is a chest that never
    // empties, not the breath happening inside it.
    const restingFilling = (state.endExpiratoryVolumeL - REFERENCE_LUNG.relaxedVolumeL) / referenceSpan;
    this.diaphragm.set({
      // Overlapping the lung bases rather than clearing them: the lung sits in
      // the dome, and a diaphragm drawn as a separate sheet underneath reads as
      // a floor the lungs are standing on. The lungs are translucent, so the
      // dome shows through where the two meet.
      apexY: this.lungs.baseY() + 0.34,
      // A normal lung resting at its relaxation volume leaves the diaphragm
      // fully domed; every litre above that flattens it. The coefficient is a
      // drawing decision — how much flattening reads as flattening — and the
      // volume driving it is the model's.
      curvature: clamp(1 - restingFilling * 1.15),
    });

    // Airway compression: the airways are squeezed when the pleural pressure
    // around them is positive and expiratory, which is exactly when the model
    // says the flow is against its ceiling.
    this.airway.setCompression(phase.inspiring ? 0 : state.flowLimitedFraction);

    // Per-unit trapped gas, drawn as brightness. Scaled against the tidal
    // volume so the scale means something a reader can hold: a unit at full
    // brightness is holding about a breath's worth it did not give back.
    const unitVolumes = this.model.unitVolumesL;
    const reference = Math.max(0.05, state.tidalVolumeL) / UNIT_COUNT;
    unitVolumes.forEach((volume, index) => {
      const marker = this.unitMarkers[index];
      if (!marker) return;
      // Above the *relaxed* volume, which is where the unit would sit if it
      // were given all the time it wanted. That difference is the trapping.
      const trapped = clamp(volume / (reference * 2));
      marker.material.emissiveIntensity = 0.05 + 1.5 * trapped;
      marker.material.opacity = 0.16 + 0.5 * trapped;
      const size = 0.6 + 0.55 * trapped;
      marker.mesh.scale.setScalar(size);
    });

    // Air follows the model's flow: in while the lung fills, out while it
    // empties, and the stream thins when the flow does.
    const flow = this.model.flowLPerS;
    this.air.setRate(clamp(flow * 1.5, -3.2, 3.2));
    this.air.setOpacity(0.1 + 0.34 * Math.min(1, Math.abs(flow) * 0.9));
  }

  /**
   * A rolling window of volume against time.
   *
   * Sampled sparsely and capped, because this is a plot and not a recording;
   * twenty seconds is enough to hold the several breaths it takes a lung to
   * climb to a new resting volume, which is the thing worth watching.
   */
  recordHistory() {
    const last = this.history[this.history.length - 1];
    if (last && this.elapsedS - last.t < 0.04) return;
    this.history.push({ t: this.elapsedS, volumeL: this.model.state.volumeL });
    const cutoff = this.elapsedS - 20;
    while (this.history.length && this.history[0].t < cutoff) this.history.shift();
  }

  // --- what the interface reads --------------------------------------------

  getAnnotations() {
    // Laid out so that nothing lands under the scene switcher at the top left
    // or behind the console: the labels are the first thing a reader looks for
    // and a label they have to move the camera to read is a label that failed.
    const anchors = {
      lungs: new THREE.Vector3(-2.95, -0.55, 1.0),
      airway: new THREE.Vector3(0.6, 2.55, 0.5),
      diaphragm: new THREE.Vector3(-2.3, -1.85, 1.5),
      trapped: new THREE.Vector3(2.9, 0.35, 0.9),
    };
    return ANNOTATIONS.flatMap((annotation) => {
      const anchor = anchors[annotation.anchor];
      if (!anchor) return [];
      return [{ ...annotation, position: anchor.clone() }];
    });
  }

  /**
   * The read-out.
   *
   * Every row is a field of the model's solved state. The rounding is chosen
   * per row and deliberately shallow: this model has not earned three decimal
   * places anywhere, and printing them would be a claim it cannot support.
   */
  getMetrics() {
    const state = this.model.state;
    const value = {
      ic: state.inspiratoryCapacityL.toFixed(2),
      eelv: state.endExpiratoryVolumeL.toFixed(2),
      vt: state.tidalVolumeL.toFixed(2),
      ve: state.minuteVentilationLPerMin.toFixed(1),
      demand: state.targetVentilationLPerMin.toFixed(1),
      te: state.expiratoryTimeS.toFixed(2),
      tau: state.timeConstantS.toFixed(2),
      tauCount: state.timeConstantsAvailable.toFixed(1),
      limited: Math.round(state.flowLimitedFraction * 100),
      pmus: state.inspiratoryPressureCmH2O.toFixed(0),
      pexp: state.expiratoryPressureCmH2O.toFixed(1),
      tlc: state.totalLungCapacityL.toFixed(2),
      rv: state.residualVolumeL.toFixed(2),
    };
    return METRICS.map((metric) => ({ ...metric, value: value[metric.id] }));
  }

  /**
   * Both plots, from one read of the model.
   *
   * Nothing here smooths, interpolates or invents a point. The flow-volume
   * loop is the samples the solver actually produced during the last complete
   * breath; the envelope is the model's own ceiling function.
   */
  getCharts() {
    const state = this.model.state;
    const mechanics = this.model.mechanics;

    const envelope = maximalFlowVolume(mechanics, 40).map((point) => ({
      x: point.volumeL,
      y: point.flowLPerS,
    }));
    // Expiration is drawn below the line, as a flow-volume loop always is.
    const loop = this.model.trace.map((sample) => ({ x: sample.volumeL, y: sample.flowLPerS }));
    const ceilingBelow = envelope.map((point) => ({ x: point.x, y: -point.y }));

    // The plot has to hold both halves of the breath and the ceiling, so its
    // range comes from all three. Rounded up in steps, so it does not creep
    // every frame and make a steady breath look like a changing one.
    const extent = Math.max(
      ...envelope.map((point) => point.y),
      ...loop.map((point) => Math.abs(point.y)),
      0.5
    );
    const volumeCeiling = Math.ceil(extent * 2) / 2;

    return {
      'flow-volume': {
        x: { min: mechanics.residualVolumeL - 0.2, max: mechanics.totalLungCapacityL + 0.2 },
        // Asymmetric on purpose: expiration is the half this scene is about,
        // and giving inspiration equal room would waste most of the plot.
        y: { min: -volumeCeiling, max: volumeCeiling },
        series: [
          { id: 'ceiling', color: PALETTE.ceiling, points: ceilingBelow, dash: [4, 3], width: 1.3 },
          { id: 'tidal', color: PALETTE.tidal, points: loop, width: 1.8 },
        ],
        rules: [
          {
            axis: 'x',
            at: state.endExpiratoryVolumeL,
            color: 'rgba(224, 160, 74, 0.7)',
            label: 'EELV',
            labelJa: '呼気終末',
          },
        ],
        note: state.flowLimitedFraction > 0.25 ? { text: 'at the ceiling', textJa: '上限に到達' } : null,
      },
      'volume-time': {
        x: {
          min: Math.max(0, this.elapsedS - 20),
          max: Math.max(20, this.elapsedS),
        },
        y: { min: mechanics.residualVolumeL - 0.2, max: mechanics.totalLungCapacityL + 0.2 },
        series: [
          {
            id: 'tidal',
            color: PALETTE.tidal,
            points: this.history.map((sample) => ({ x: sample.t, y: sample.volumeL })),
            width: 1.6,
          },
        ],
        rules: [
          { axis: 'y', at: mechanics.totalLungCapacityL, color: 'rgba(159, 176, 200, 0.55)', label: 'TLC', labelJa: 'TLC' },
          {
            axis: 'y',
            at: mechanics.relaxedVolumeL,
            color: 'rgba(126, 224, 168, 0.55)',
            label: 'relaxed',
            labelJa: '弛緩位',
          },
        ],
      },
    };
  }

  getModelControls() {
    const controls = this.model.controls;
    return MODEL_CONTROLS.map((control) => ({ ...control, value: controls[control.id] }));
  }

  /** @param {string} id @param {number} value */
  setModelControl(id, value) {
    this.model.setControl(id, value);
  }

  resetModelControls() {
    for (const control of MODEL_CONTROLS) {
      this.model.setControl(control.id, DEFAULT_CONTROLS[control.id]);
    }
  }

  /**
   * Runs the breaths forward until the lung stops moving between them.
   *
   * Dynamic hyperinflation takes a dozen breaths to arrive, which is the point
   * when the reader is dragging the slider and watching it happen — and a
   * problem when a lesson or a walk-through has just stated where the lung ends
   * up. Those call this; the slider does not.
   */
  settleModel() {
    this.model.settle({ maxBreaths: 400 });
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
              // Resolved here rather than written into the data, so a lesson
              // stays pointed at the right state if the stages ever move. A
              // transfer that varies the lung rather than the workload names no
              // stage and stays at the one the lesson set up.
              ...(module.transfer.atStage
                ? { progress: stageAt(module.transfer.atStage) }
                : { progress: module.setup.progress }),
            },
          }
        : module
    );
  }

  dispose() {
    this.air.dispose();
    this.airway.dispose();
    this.diaphragm.dispose();
    for (const marker of this.unitMarkers ?? []) {
      marker.mesh.geometry.dispose();
      marker.material.dispose();
    }
    disposeObject(this.root);
  }
}

/**
 * How much larger than life the drawn breath is.
 *
 * Exported rather than buried in `build()` so that the exaggeration is
 * something the repository can point at, and so a test can assert that the
 * scene's *numbers* are unaffected by it.
 */
export const DRAWN_EXCURSION = 1.55;

/**
 * The lung the drawn shape is drawn *relative to*.
 *
 * The organ's geometry is a lung at an ordinary resting volume, so that is
 * where the drawn excursion is zero. Measuring against the reference lung
 * rather than against the one on screen is what makes hyperinflation visible:
 * a lung resting two litres above a normal FRC is drawn bigger than a normal
 * one at the same point in its breath, which is the whole visual claim.
 */
const REFERENCE_LUNG = lungMechanics({ airwayResistance: 1, elasticRecoil: 1 });

/** A stage's position on the axis, by id. Throws rather than silently drifting. */
function stageAt(id) {
  const stage = STAGES.find((entry) => entry.id === id);
  if (!stage) throw new Error(`copd scene: no stage "${id}"`);
  return stage.at;
}
