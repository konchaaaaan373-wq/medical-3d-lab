import * as THREE from 'three';
import { createStudioLights } from '../../../shared/lighting.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { buildLiver } from '../../organs/liver.js';
import { buildPortalVasculature } from '../../organs/portalVasculature.js';
import { buildSpleen } from '../../../hematologic/organs/spleen.js';
import {
  DEFAULT_CONTROLS,
  clinicalThresholdReading,
  progressionCurve,
  solvePortalCirculation,
} from '../../../../models/portalHypertension.js';
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
} from '../../../../data/portalHypertension.js';
import { CAUSAL_STORY, LEARNING_MODULES } from '../../../../data/portalHypertensionTeaching.js';

/**
 * Scene: cirrhosis and portal hypertension.
 *
 * Every number, every vessel calibre and the rate of every particle stream is
 * a reading of [`src/models/portalHypertension.js`](../../../../models/portalHypertension.js).
 * The scene draws a network; the model solves it.
 *
 * ### The distinction the scene exists to make
 *
 * The read-out shows **two** gradients side by side and always has: the portal
 * pressure gradient this model computes, and what a wedged-minus-free
 * measurement would read on the same liver. In sinusoidal disease they agree.
 * Move the resistance upstream of the sinusoids and the second collapses while
 * the first does not move at all — and the scene withdraws the clinical
 * thresholds, because those are defined on HVPG and were established in
 * sinusoidal disease. Showing one number and calling it either name would be
 * teaching the confusion.
 *
 * ### What is presentation
 *
 * The **calibre of every vessel** follows the flow it is carrying — a vein
 * carrying more blood is a wider vein, and dilated collaterals are a real
 * finding — but the mapping from flow to drawn radius is a presentation curve
 * and is named as one. Particle rate follows flow, particle colour is the
 * pathway. Nothing about the *pressure* is drawn as a shape; pressure is a
 * number and a plot, because there is no honest way to draw it.
 */
export class PortalHypertensionScene {
  static meta = {
    id: 'portal-hypertension',
    title: 'Cirrhosis: portal pressure and where the blood goes',
    titleJa: '肝硬変：門脈圧と、血液の行き先',
    subtitle: 'One network, flow conserved · a portal pressure gradient, which is not an HVPG',
    subtitleJa: '流量保存が成り立つ 1 つのネットワーク ｜ 表示しているのは門脈圧較差であり、HVPG ではありません',
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
    // Far enough back to hold the liver, the spleen and every route out of
    // the portal vein at once — the whole point is that they are one network.
    position: new THREE.Vector3(1.6, 0.6, 12.6),
    target: new THREE.Vector3(0.05, -0.55, 0),
  };

  /**
   * The structural resistance the main slider reaches at its top, as a
   * multiple of a healthy liver's.
   */
  static MAX_STRUCTURAL_RESISTANCE = 12;

  constructor({ viewer } = {}) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = PortalHypertensionScene.meta.id;
    this.progress = 0;
    this.controls = { ...DEFAULT_CONTROLS };
    this.solved = solvePortalCirculation(this.controls);
    this.curve = progressionCurve(this.controls, PortalHypertensionScene.MAX_STRUCTURAL_RESISTANCE);
  }

  build() {
    const object = new THREE.Group();

    this.liver = buildLiver({ color: PALETTE.liver, opacity: 0.62 });
    this.liver.object.position.set(-1.1, 0.15, 0);
    this.liver.object.scale.setScalar(0.92);

    this.spleen = buildSpleen({ color: '#8f4a5a', opacity: 0.72 });
    this.spleen.object.position.set(2.5, -1.62, 0);
    this.spleen.object.scale.setScalar(0.42);

    this.vessels = buildPortalVasculature({
      portal: PALETTE.portal,
      splanchnic: PALETTE.splanchnic,
      hepaticVein: PALETTE.hepaticVein,
      collateral: PALETTE.collateral,
      tips: PALETTE.tips,
    });

    // One stream per destination, so that "where the blood goes" is something
    // the reader watches rather than reads. Each one's rate is a flow.
    this.streams = {
      inflow: createFlowStream({
        curves: this.vessels.paths.inflow,
        count: 90,
        color: PALETTE.splanchnic,
        size: 4,
        speed: 0.4,
        spread: 0.04,
        seed: 51,
        opacity: 0.5,
      }),
      throughLiver: createFlowStream({
        curves: this.vessels.paths.throughLiver,
        count: 110,
        color: PALETTE.blood,
        size: 4,
        speed: 0.36,
        spread: 0.05,
        seed: 52,
        opacity: 0.5,
      }),
      collateral: createFlowStream({
        curves: this.vessels.paths.collateral,
        count: 80,
        color: PALETTE.collateral,
        size: 4,
        speed: 0.36,
        spread: 0.04,
        seed: 53,
        opacity: 0.05,
      }),
      shunt: createFlowStream({
        curves: this.vessels.paths.shunt,
        count: 70,
        color: PALETTE.tips,
        size: 4,
        speed: 0.5,
        spread: 0.035,
        seed: 54,
        opacity: 0.05,
      }),
    };

    object.add(
      this.liver.object,
      this.spleen.object,
      this.vessels.object,
      ...Object.values(this.streams).map((stream) => stream.object)
    );
    this.root.add(createStudioLights(), object);
    this.body = object;

    this.applyModelToScene();
    return this.root;
  }

  // --- the one axis ---------------------------------------------------------

  /** @param {number} value 0 = a healthy liver, 1 = a heavily scarred one */
  setProgress(value) {
    this.progress = clamp(value);
    this.setControl(
      'structuralResistance',
      1 + (PortalHypertensionScene.MAX_STRUCTURAL_RESISTANCE - 1) * this.progress,
      { curveStale: false }
    );
  }

  setControl(id, value, { curveStale = true } = {}) {
    this.controls[id] = value;
    this.solved = solvePortalCirculation(this.controls);
    if (curveStale) {
      this.curve = progressionCurve(this.controls, PortalHypertensionScene.MAX_STRUCTURAL_RESISTANCE);
    }
    this.applyModelToScene();
  }

  update(dt) {
    for (const stream of Object.values(this.streams)) stream.update(dt);
  }

  // --- reading the model into the scene -------------------------------------

  /** Every drawn property, in one place. */
  applyModelToScene() {
    const state = this.solved;

    // A vein carrying more blood is a wider vein. Presentation curve: the
    // fourth root of the flow ratio, so a fourfold flow is a 1.4× calibre —
    // which is roughly what a vessel that has actually dilated to carry it
    // looks like, and keeps the drawing legible at both ends.
    const calibreFor = (flow, reference) => (flow / Math.max(1, reference)) ** 0.25;
    this.vessels.setCalibre('portal', calibreFor(state.splanchnicInflowMlPerMin, 1000));
    this.vessels.setCalibre('splenic', calibreFor(state.splanchnicInflowMlPerMin, 1000));
    this.vessels.setCalibre('superiorMesenteric', calibreFor(state.splanchnicInflowMlPerMin, 1000));
    this.vessels.setCalibre('portalBranches', calibreFor(state.portalLiverFlowMlPerMin, 1000));
    this.vessels.setCalibre('hepaticVein', calibreFor(state.portalLiverFlowMlPerMin, 1000));

    // Collaterals are drawn from nothing when they are shut: a vessel that has
    // not opened is not a thin vessel, it is not there. The test is on the
    // *flow* rather than on the model's opening term, because that term is a
    // sigmoid and never quite reaches zero — a healthy portal system does have
    // anastomoses, and what it does not have is blood going through them.
    const collateralCalibre =
      state.collateralFlowMlPerMin < NEGLIGIBLE_FLOW_ML_PER_MIN
        ? 0
        : calibreFor(state.collateralFlowMlPerMin, 700);
    for (const name of ['collateralOesophageal', 'collateralUmbilical']) {
      this.vessels.setVisible(name, collateralCalibre > 0);
      if (collateralCalibre > 0) this.vessels.setCalibre(name, collateralCalibre);
    }

    this.vessels.setVisible('tips', this.controls.tips > 0.01);
    if (this.controls.tips > 0.01) this.vessels.setCalibre('tips', 0.4 + 0.6 * this.controls.tips);

    // The liver's colour follows how scarred it is. Presentation.
    const scarring = clamp((state.resistances.intrahepaticMultiple - 1) / 9);
    this.liver.object.material.color.copy(HEALTHY_LIVER).lerp(SCARRED_LIVER, scarring);

    // Streams: rate and brightness follow the flows, so the picture and the
    // read-out cannot disagree about where the blood is going.
    const rate = (flow) => 0.15 + (2.6 * flow) / 1000;
    const shown = (flow) => Math.min(1, flow / 500);
    this.streams.inflow.setRate(rate(state.splanchnicInflowMlPerMin));
    this.streams.inflow.setOpacity(0.12 + 0.4 * shown(state.splanchnicInflowMlPerMin));
    this.streams.throughLiver.setRate(rate(state.portalLiverFlowMlPerMin));
    this.streams.throughLiver.setOpacity(0.1 + 0.45 * shown(state.portalLiverFlowMlPerMin));
    this.streams.collateral.setRate(rate(state.collateralFlowMlPerMin));
    this.streams.collateral.setOpacity(0.02 + 0.5 * shown(state.collateralFlowMlPerMin));
    this.streams.shunt.setRate(rate(state.tipsFlowMlPerMin));
    this.streams.shunt.setOpacity(0.02 + 0.5 * shown(state.tipsFlowMlPerMin));
  }

  // --- what the interface reads --------------------------------------------

  getAnnotations() {
    const anchors = this.vessels.anchors;
    return ANNOTATIONS.flatMap((annotation) => {
      const anchor = anchors[annotation.anchor];
      return anchor ? [{ ...annotation, position: anchor.clone() }] : [];
    });
  }

  getMetrics() {
    const state = this.solved;
    const reading = clinicalThresholdReading(state);
    const value = {
      ppg: state.portalPressureGradientMmHg.toFixed(1),
      hvpg: state.hepaticVenousPressureGradientMmHg.toFixed(1),
      missed: state.gradientMissedByHvpgMmHg.toFixed(1),
      band: reading.band ? BAND_LABELS[reading.band].en : 'not applicable here',
      portalPressure: state.portalPressureMmHg.toFixed(1),
      inflow: Math.round(state.splanchnicInflowMlPerMin),
      liverFlow: Math.round(state.portalLiverFlowMlPerMin),
      collateralFlow: Math.round(state.collateralFlowMlPerMin),
      tipsFlow: Math.round(state.tipsFlowMlPerMin),
      shunt: Math.round(state.shuntFraction * 100),
      resistance: state.resistances.intrahepaticMultiple.toFixed(1),
    };
    const valueJa = {
      band: reading.band ? BAND_LABELS[reading.band].ja : 'ここでは適用しません',
    };
    return METRICS.map((metric) => ({
      ...metric,
      value: value[metric.id],
      ...(valueJa[metric.id] != null ? { valueJa: valueJa[metric.id] } : {}),
    }));
  }

  getCharts() {
    const state = this.solved;
    const profile = state.pressureProfile;

    // Where the pressure is lost, drawn along the pathway. The two spans that
    // matter — the whole gradient and the part HVPG can see — are drawn as two
    // series over the same profile, which is the clearest statement of the
    // difference this scene can make.
    const points = profile.map((point, index) => ({ x: index, y: point.pressureMmHg }));
    const measured = [
      { x: 1, y: state.sinusoidalPressureMmHg },
      { x: 2, y: state.hepaticVeinPressureMmHg },
    ];

    const flows = [
      { id: 'liver', flow: state.portalLiverFlowMlPerMin, color: PALETTE.liver },
      { id: 'collateral', flow: state.collateralFlowMlPerMin, color: PALETTE.collateral },
      { id: 'tips', flow: state.tipsFlowMlPerMin, color: PALETTE.tips },
    ];

    return {
      'pressure-profile': {
        x: { min: -0.25, max: 2.25 },
        y: { min: 0, max: Math.max(24, state.portalPressureMmHg * 1.15) },
        series: [
          { id: 'profile', color: PALETTE.blood, width: 2, points },
          { id: 'measured', color: PALETTE.measured, width: 3, dash: [5, 3], points: measured },
        ],
        markers: profile.map((point, index) => ({
          x: index,
          y: point.pressureMmHg,
          color: PALETTE.blood,
          radius: 3,
        })),
        rules: [
          {
            axis: 'y',
            at: state.hepaticVeinPressureMmHg,
            color: 'rgba(255, 255, 255, 0.25)',
            label: 'hepatic vein',
            labelJa: '肝静脈',
          },
        ],
        note:
          state.gradientMissedByHvpgMmHg > 1
            ? { text: `HVPG misses ${state.gradientMissedByHvpgMmHg.toFixed(1)}`, textJa: `HVPG は ${state.gradientMissedByHvpgMmHg.toFixed(1)} を捉えません` }
            : null,
      },
      'flow-destinations': {
        x: { min: -0.5, max: 2.5 },
        y: { min: 0, max: Math.max(1200, state.splanchnicInflowMlPerMin * 1.05) },
        bars: flows.map((entry, index) => ({
          id: entry.id,
          x0: index - 0.32,
          x1: index + 0.32,
          y: entry.flow,
          color: entry.color,
        })),
        rules: [
          {
            axis: 'y',
            at: state.splanchnicInflowMlPerMin,
            color: 'rgba(201, 106, 90, 0.7)',
            label: 'total inflow',
            labelJa: '総流入量',
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
    this.setControl('structuralResistance', this.controls.structuralResistance);
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
    for (const stream of Object.values(this.streams ?? {})) stream.dispose();
    this.vessels?.dispose();
    disposeObject(this.root);
  }
}

/**
 * Below this, a pathway is drawn as absent rather than as very thin.
 *
 * A fortieth of the portal flow: enough to be a rounding error in every number
 * the scene reports, and small enough that drawing a vessel for it would be
 * claiming a route that is not carrying anything.
 */
const NEGLIGIBLE_FLOW_ML_PER_MIN = 25;

const HEALTHY_LIVER = new THREE.Color(PALETTE.liver);
const SCARRED_LIVER = new THREE.Color(PALETTE.scarred);

/**
 * The HVPG bands, in words.
 *
 * Three, following Baveno VII: normal, portal hypertension, and clinically
 * significant portal hypertension. There is deliberately no fourth band above
 * 12 mmHg — 12 mmHg is a variceal-bleeding association and a post-TIPS target,
 * not a further stage, and putting a boundary there would turn it into a
 * general staging threshold it is not.
 *
 * Only ever reached through `clinicalThresholdReading`, which refuses to
 * produce a band outside the sinusoidal haemodynamic pattern — so there is no
 * way for one of these labels to appear beside a presinusoidal liver.
 */
const BAND_LABELS = {
  normal: { en: 'normal', ja: '正常' },
  'portal-hypertension': { en: 'portal hypertension', ja: '門脈圧亢進' },
  'clinically-significant': { en: 'clinically significant', ja: '臨床的に有意 (CSPH)' },
};

/** A stage's position on the axis, by id. Throws rather than silently drifting. */
function stageAt(id) {
  const stage = STAGES.find((entry) => entry.id === id);
  if (!stage) throw new Error(`portal hypertension scene: no stage "${id}"`);
  return stage.at;
}
