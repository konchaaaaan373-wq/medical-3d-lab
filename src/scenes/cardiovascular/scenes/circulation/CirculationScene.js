import * as THREE from 'three';
import {
  ANNOTATIONS,
  DISCLAIMER,
  DISCLAIMER_JA,
  DISCLAIMER_SHORT,
  DISCLAIMER_SHORT_JA,
  INTERVENTION_OPTIONS,
  LEGEND,
  MODEL_CONTROLS,
  MODEL_SCOPE,
  PALETTE,
  STAGES,
} from '../../../../data/circulation.js';
import { CIRCULATION_INTERVENTIONS, solveCirculation } from '../../../../models/circulation.js';
import { clamp, lerp, smoothstep } from '../../../../utils/math.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { buildHeart } from '../../organs/heart.js';
import { TubeSurface, smoothCurve } from '../../../shared/geometry/tube.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { oscillate } from '../../../shared/motion/rhythm.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { tissueMaterial } from '../../../shared/materials.js';

const ARTERIAL_PATH = smoothCurve([
  [-2.25, 0.62, 0],
  [-1.15, 1.2, 0.04],
  [0.25, 1.28, 0.02],
  [1.55, 1.04, 0],
  [2.58, 0.45, 0],
]);

const VENOUS_PATH = smoothCurve([
  [2.58, -0.42, -0.12],
  [1.55, -1.02, -0.14],
  [0.15, -1.2, -0.12],
  [-1.25, -0.93, -0.08],
  [-2.28, -0.38, -0.04],
]);

const RESISTANCE_BAND_POSITIONS = [0.64, 0.74, 0.84];

const TISSUE_CELLS = [
  [0, 0, 0, 0.48],
  [0.58, 0.42, -0.08, 0.36],
  [0.62, -0.4, 0.03, 0.34],
  [-0.55, 0.45, 0.06, 0.35],
  [-0.58, -0.42, -0.05, 0.37],
  [0.05, 0.78, -0.12, 0.3],
  [0.03, -0.77, 0.1, 0.31],
];

/**
 * One constructed low-flow case, shown as a causal loop:
 *
 *   pump/CO -> arterial pressure <- distributed resistance
 *       |                                  |
 *       +---------- calculated global DO2 +
 *
 * The tissue is deliberately neutral. Yellow particles show oxygen carried in
 * arterial blood per minute; they do not colour the cells and therefore cannot
 * be read as tissue PO2, extraction or oxygen use.
 */
export class CirculationScene {
  static meta = {
    id: 'circulation',
    status: 'alpha',
    title: 'Is circulation maintained?',
    titleJa: '循環、保たれてる？',
    subtitle: 'MAP is pressure, not flow · one constructed low-output case',
    subtitleJa: 'MAPは圧であって血流ではない ｜ 1つの低拍出概念症例',
    progression: { enabled: false },
    stages: STAGES,
    legend: LEGEND,
    palette: PALETTE,
    modelControls: MODEL_CONTROLS,
    modelScope: MODEL_SCOPE,
    disclaimer: DISCLAIMER,
    disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: DISCLAIMER_SHORT,
    disclaimerShortJa: DISCLAIMER_SHORT_JA,
  };

  static cameraPose = {
    position: new THREE.Vector3(0.25, 1.0, 11.4),
    target: new THREE.Vector3(0.1, 0.1, 0),
  };

  // The causal chain is roughly eight world units wide. Preserve that width
  // on portrait screens instead of cropping the heart or the tissue endpoint;
  // landscape and desktop framing stay at the closer authored distance.
  static framing = { minHorizontalAspect: 1 };

  static allowAutoRotate = false;

  constructor({ viewer } = {}) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = CirculationScene.meta.id;
    this.progress = 0;
    this.phase = 0;
    this.intervention = CIRCULATION_INTERVENTIONS.BASELINE;
    this.baseline = solveCirculation();
    this.state = this.baseline;
    this.presentationState = null;
  }

  build() {
    this.heart = buildHeart({ color: '#a94755', vesselColor: '#de7885', atriumColor: '#813642' });
    this.heart.object.position.set(-3.05, -0.05, 0);
    this.heart.object.scale.setScalar(1.12);

    this.arteryTube = new TubeSurface(ARTERIAL_PATH, { radius: () => 0.15, steps: 64, radial: 16 });
    this.veinTube = new TubeSurface(VENOUS_PATH, { radius: () => 0.13, steps: 60, radial: 14 });
    this.arteryMaterial = tissueMaterial({
      color: '#a95061',
      roughness: 0.38,
      emissive: PALETTE.pressure,
      emissiveIntensity: 0.08,
    });
    this.veinMaterial = tissueMaterial({ color: '#526a92', roughness: 0.5, emissiveIntensity: 0.04 });
    this.artery = new THREE.Mesh(this.arteryTube.geometry, this.arteryMaterial);
    this.artery.name = 'arterial-path';
    this.vein = new THREE.Mesh(this.veinTube.geometry, this.veinMaterial);
    this.vein.name = 'venous-return';

    // Pink particles answer "how much blood is moving?". Yellow particles are
    // oxygen cargo on the same path. Since CaO2 is fixed in this scene, their
    // rate follows CO; they end at the tissue boundary without changing it.
    this.arterialFlow = createFlowStream({
      curves: [ARTERIAL_PATH],
      count: 132,
      color: PALETTE.output,
      size: 6.6,
      speed: 0.27,
      spread: 0.06,
      seed: 121,
      opacity: 0.88,
    });
    this.oxygenCargo = createFlowStream({
      curves: [ARTERIAL_PATH],
      count: 72,
      color: PALETTE.delivery,
      size: 4.8,
      speed: 0.27,
      spread: 0.035,
      seed: 128,
      opacity: 0.92,
    });
    this.venousFlow = createFlowStream({
      curves: [VENOUS_PATH],
      count: 82,
      color: '#7795c3',
      size: 5.3,
      speed: 0.23,
      spread: 0.055,
      seed: 122,
      opacity: 0.52,
    });

    // Three bands mark a *distributed resistance zone*. The previous single
    // ring looked like a stenosis or valve and incorrectly localised MAP.
    this.resistanceBandMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(PALETTE.resistance),
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    this.resistanceBands = new THREE.Group();
    this.resistanceBands.name = 'distributed-systemic-resistance';
    const ringNormal = new THREE.Vector3(0, 0, 1);
    for (const u of RESISTANCE_BAND_POSITIONS) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 10, 40), this.resistanceBandMaterial);
      band.position.copy(ARTERIAL_PATH.getPointAt(u));
      band.quaternion.setFromUnitVectors(ringNormal, ARTERIAL_PATH.getTangentAt(u).normalize());
      this.resistanceBands.add(band);
    }

    this.tissue = new THREE.Group();
    this.tissue.name = 'neutral-peripheral-tissue';
    this.tissue.position.set(3.05, 0, 0);
    this.tissueMaterial = tissueMaterial({
      color: '#696b72',
      roughness: 0.78,
      emissive: '#24262d',
      emissiveIntensity: 0.04,
    });
    for (const [x, y, z, radius] of TISSUE_CELLS) {
      const cell = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 2), this.tissueMaterial);
      cell.position.set(x, y, z);
      this.tissue.add(cell);
    }

    this.root.add(
      createStudioLights({ key: 34, rim: 19, fill: 0.55 }),
      this.heart.object,
      this.artery,
      this.vein,
      this.arterialFlow.object,
      this.oxygenCargo.object,
      this.venousFlow.object,
      this.resistanceBands,
      this.tissue
    );
    this._applyState();
    return this.root;
  }

  /** This interaction has one state, not a progression axis. */
  setProgress(value) {
    this.progress = clamp(value);
  }

  update(dt) {
    this.phase = (this.phase + (dt * this.state.heartRatePerMin) / 60) % 1;
    const beat = oscillate(this.phase, 1);
    const strokeStrength = clamp((this.state.strokeVolumeMl - 24) / 42, 0.28, 1);
    this.heart?.setBeat(beat * strokeStrength);
    this.arterialFlow?.update(dt);
    this.oxygenCargo?.update(dt);
    this.venousFlow?.update(dt);
  }

  _applyState() {
    if (!this.arterialFlow) return;
    const flow = clamp((this.state.cardiacOutputLMin - 3.4) / 2);
    const pressure = clamp((this.state.meanArterialPressureMmHg - 60) / 30);
    const resistance = clamp((this.state.systemicVascularResistanceDynSCm5 - 900) / 520);
    const delivery = clamp((this.state.oxygenDeliveryMlMin - 470) / 280);

    const arterialFlowRate = 0.82 + flow * 0.78;
    const oxygenDeliveryRate = 0.78 + delivery * 0.9;
    const resistanceCalibre = lerp(1.04, 0.72, resistance);

    this.arterialFlow.setRate(arterialFlowRate);
    this.venousFlow.setRate(0.75 + flow * 0.67);
    this.oxygenCargo.setRate(oxygenDeliveryRate);
    this.arteryMaterial.emissiveIntensity = 0.08 + pressure * 0.27;

    // Narrow only the distal "resistance zone", not the large artery leaving
    // the heart. This is a qualitative arteriolar-tone cue, never a calibre
    // measurement or Poiseuille calculation.
    this.arteryTube.refresh((u, base) => {
      const distal = smoothstep(0.52, 0.68, u);
      return base * lerp(1, resistanceCalibre, distal);
    });
    for (const band of this.resistanceBands.children) band.scale.setScalar(resistanceCalibre);
    this.resistanceBandMaterial.opacity = 0.28 + resistance * 0.58;

    // Stored so the presentation mapping can be verified without pretending
    // these unitless display values are medical outputs.
    this.presentationState = {
      arterialFlowRate,
      oxygenDeliveryRate,
      resistanceCalibre,
      tissueEmissiveIntensity: this.tissueMaterial.emissiveIntensity,
    };
  }

  getModelControls() {
    return [
      {
        id: 'intervention',
        kind: 'choice',
        label: 'Teaching state',
        labelJa: '比較する状態',
        value: this.intervention,
        options: INTERVENTION_OPTIONS,
      },
    ];
  }

  setModelControl(id, value) {
    if (id !== 'intervention') return;
    this.state = solveCirculation({ intervention: value });
    this.intervention = this.state.intervention;
    this._applyState();
  }

  resetModelControls() {
    this.setModelControl('intervention', CIRCULATION_INTERVENTIONS.BASELINE);
  }

  getMetrics() {
    const comparing = this.intervention !== CIRCULATION_INTERVENTIONS.BASELINE;
    const map = Math.round(this.state.meanArterialPressureMmHg);
    const baselineMap = Math.round(this.baseline.meanArterialPressureMmHg);
    const co = this.state.cardiacOutputLMin.toFixed(1);
    const baselineCo = this.baseline.cardiacOutputLMin.toFixed(1);
    const do2 = Math.round(this.state.oxygenDeliveryMlMin / 10) * 10;
    const baselineDo2 = Math.round(this.baseline.oxygenDeliveryMlMin / 10) * 10;

    return [
      {
        id: 'map',
        label: 'Mean arterial pressure',
        labelJa: '平均血圧 MAP',
        value: map,
        reference: comparing ? baselineMap : null,
        change: comparing ? (Math.abs(map - baselineMap) < 3 ? 'flat' : map > baselineMap ? 'up' : 'down') : null,
        changeLabel: 'little change',
        changeLabelJa: 'ほぼ不変',
        unit: 'mmHg',
      },
      {
        id: 'co',
        label: 'Cardiac output',
        labelJa: '心拍出量 CO',
        value: co,
        reference: comparing ? baselineCo : null,
        change: comparing ? 'up' : null,
        changeLabel: 'increased',
        changeLabelJa: '上昇',
        unit: 'L/min',
      },
      {
        id: 'do2',
        label: 'Calculated global DO2',
        labelJa: '計算上の全身DO₂',
        value: do2,
        reference: comparing ? baselineDo2 : null,
        change: comparing ? 'up' : null,
        changeLabel: 'increased',
        changeLabelJa: '上昇',
        unit: 'mL O₂/min',
        emphasis: true,
      },
    ];
  }

  getAnnotations() {
    const anchors = {
      co: new THREE.Vector3(-2.92, 0.48, 0.48),
      map: ARTERIAL_PATH.getPointAt(0.38),
      svr: ARTERIAL_PATH.getPointAt(0.74),
      do2: ARTERIAL_PATH.getPointAt(0.94),
    };
    return ANNOTATIONS.map((annotation) => ({
      ...annotation,
      position: anchors[annotation.anchor].clone(),
    }));
  }

  dispose() {
    this.heart?.dispose?.();
    this.arterialFlow?.dispose();
    this.oxygenCargo?.dispose();
    this.venousFlow?.dispose();
    disposeObject(this.root);
  }
}
