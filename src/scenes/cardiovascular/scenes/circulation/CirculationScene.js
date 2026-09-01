import * as THREE from 'three';
import { CIRCULATION } from '../../../../data/prototypes/circulation.js';
import { MAX_INTERVENTION_STEPS, solveCirculation } from '../../../../models/circulation.js';
import { clamp, lerp } from '../../../../utils/math.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { buildHeart } from '../../organs/heart.js';
import { TubeSurface, smoothCurve } from '../../../shared/geometry/tube.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { oscillate } from '../../../shared/motion/rhythm.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { prototypeMeta } from '../../../shared/prototypeMeta.js';

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
 * A single low-output case drawn as three readable zones: pump, pressure and
 * tissue delivery. Geometry is symbolic; all three animations read the same
 * solved state that supplies the three figures in the rail.
 */
export class CirculationScene {
  static meta = {
    ...prototypeMeta(CIRCULATION),
    progression: CIRCULATION.progression,
    modelControls: CIRCULATION.modelControls,
  };

  static cameraPose = {
    position: new THREE.Vector3(0.4, 1.2, 13.8),
    target: new THREE.Vector3(0.1, 0.05, 0),
  };

  constructor({ viewer } = {}) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = CIRCULATION.id;
    this.progress = 0;
    this.phase = 0;
    this.interventions = { fluidSteps: 0, dobutamineSteps: 0 };
    this.state = solveCirculation(this.interventions);
  }

  build() {
    this.heart = buildHeart({ color: '#a94755', vesselColor: '#de7885', atriumColor: '#813642' });
    this.heart.object.position.set(-3.05, -0.05, 0);
    this.heart.object.scale.setScalar(1.05);

    this.arteryTube = new TubeSurface(ARTERIAL_PATH, { radius: () => 0.13, steps: 56, radial: 14 });
    this.veinTube = new TubeSurface(VENOUS_PATH, { radius: () => 0.12, steps: 56, radial: 14 });
    this.arteryMaterial = tissueMaterial({
      color: '#a95061',
      roughness: 0.42,
      emissive: CIRCULATION.palette.pressure,
      emissiveIntensity: 0.08,
    });
    this.veinMaterial = tissueMaterial({ color: '#526a92', roughness: 0.5, emissiveIntensity: 0.04 });
    const artery = new THREE.Mesh(this.arteryTube.geometry, this.arteryMaterial);
    artery.name = 'arterial-path';
    const vein = new THREE.Mesh(this.veinTube.geometry, this.veinMaterial);
    vein.name = 'venous-return';

    this.arterialFlow = createFlowStream({
      curves: [ARTERIAL_PATH],
      count: 120,
      color: CIRCULATION.palette.output,
      size: 6.2,
      speed: 0.27,
      spread: 0.065,
      seed: 121,
      opacity: 0.86,
    });
    this.venousFlow = createFlowStream({
      curves: [VENOUS_PATH],
      count: 78,
      color: '#7795c3',
      size: 5.1,
      speed: 0.23,
      spread: 0.055,
      seed: 122,
      opacity: 0.5,
    });

    this.pressureRingMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(CIRCULATION.palette.pressure),
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });
    this.pressureRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.035, 12, 48),
      this.pressureRingMaterial
    );
    this.pressureRing.name = 'map-pulse';
    this.pressureRing.position.copy(ARTERIAL_PATH.getPointAt(0.48));
    this.pressureRing.rotation.y = Math.PI / 2;

    this.tissue = new THREE.Group();
    this.tissue.name = 'peripheral-tissue';
    this.tissue.position.set(3.05, 0, 0);
    this.tissueMaterial = tissueMaterial({
      color: '#736d62',
      roughness: 0.72,
      emissive: CIRCULATION.palette.delivery,
      emissiveIntensity: 0.08,
    });
    for (const [x, y, z, radius] of TISSUE_CELLS) {
      const cell = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 2), this.tissueMaterial);
      cell.position.set(x, y, z);
      this.tissue.add(cell);
    }
    this.deliveryLight = new THREE.PointLight(CIRCULATION.palette.delivery, 1.2, 5.5, 2);
    this.deliveryLight.position.set(3.05, 0.15, 1.1);

    this.root.add(
      createStudioLights({ key: 32, rim: 18, fill: 0.5 }),
      this.heart.object,
      artery,
      vein,
      this.arterialFlow.object,
      this.venousFlow.object,
      this.pressureRing,
      this.tissue,
      this.deliveryLight
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
    this.venousFlow?.update(dt);

    if (!this.pressureRing) return;
    const pressureScale = lerp(0.9, 1.12, clamp((this.state.meanArterialPressureMmHg - 55) / 40));
    const pulse = 0.95 + beat * 0.09;
    this.pressureRing.scale.setScalar(pressureScale * pulse);
    this.pressureRingMaterial.opacity = 0.42 + beat * 0.28;

    const delivery = clamp((this.state.oxygenDeliveryMlMin - 420) / 520);
    this.tissue.scale.setScalar(0.98 + oscillate(this.phase * 0.45, 1) * 0.025 * delivery);
  }

  _applyState() {
    if (!this.arterialFlow) return;
    const flow = clamp((this.state.cardiacOutputLMin - 3) / 4);
    const pressure = clamp((this.state.meanArterialPressureMmHg - 55) / 40);
    const delivery = clamp((this.state.oxygenDeliveryMlMin - 420) / 520);
    this.arterialFlow.setRate(0.72 + flow * 1.08);
    this.venousFlow.setRate(0.65 + flow * 0.92);
    this.arteryMaterial.emissiveIntensity = 0.06 + pressure * 0.23;
    this.tissueMaterial.emissiveIntensity = 0.05 + delivery * 0.48;
    this.deliveryLight.intensity = 0.35 + delivery * 2.25;
  }

  getModelControls() {
    const level = (value) => `${Math.round(value)} / ${MAX_INTERVENTION_STEPS}`;
    return [
      {
        id: 'fluid',
        kind: 'action',
        label: 'Fluid',
        labelJa: '輸液',
        actionLabel: 'Add fluid',
        actionLabelJa: '輸液を追加',
        effect: 'preload ↑ · responsive case',
        effectJa: '前負荷 ↑ ・反応性ありの設定',
        min: 0,
        max: MAX_INTERVENTION_STEPS,
        step: 1,
        value: this.interventions.fluidSteps,
        format: level,
      },
      {
        id: 'dobutamine',
        kind: 'action',
        label: 'Dobutamine',
        labelJa: 'DOB',
        actionLabel: 'Increase DOB',
        actionLabelJa: 'DOBを上げる',
        effect: 'contractility ↑ · SVR ↓ in this case',
        effectJa: '収縮力 ↑ ・この症例ではSVR ↓',
        min: 0,
        max: MAX_INTERVENTION_STEPS,
        step: 1,
        value: this.interventions.dobutamineSteps,
        format: level,
      },
    ];
  }

  setModelControl(id, value) {
    if (id === 'fluid') this.interventions.fluidSteps = clamp(value, 0, MAX_INTERVENTION_STEPS);
    else if (id === 'dobutamine') this.interventions.dobutamineSteps = clamp(value, 0, MAX_INTERVENTION_STEPS);
    else return;
    this.state = solveCirculation(this.interventions);
    this._applyState();
  }

  resetModelControls() {
    this.interventions = { fluidSteps: 0, dobutamineSteps: 0 };
    this.state = solveCirculation(this.interventions);
    this._applyState();
  }

  getMetrics() {
    return [
      {
        id: 'map',
        label: 'Mean arterial pressure',
        labelJa: '平均血圧 MAP',
        value: Math.round(this.state.meanArterialPressureMmHg),
        unit: 'mmHg',
      },
      {
        id: 'co',
        label: 'Cardiac output',
        labelJa: '心拍出量 CO',
        value: this.state.cardiacOutputLMin.toFixed(1),
        unit: 'L/min',
      },
      {
        id: 'do2',
        label: 'Oxygen delivery',
        labelJa: '酸素供給 DO₂',
        value: Math.round(this.state.oxygenDeliveryMlMin / 10) * 10,
        unit: 'mL O₂/min',
        emphasis: true,
      },
    ];
  }

  getAnnotations() {
    const anchors = {
      co: new THREE.Vector3(-2.95, 0.45, 0.45),
      map: ARTERIAL_PATH.getPointAt(0.48),
      do2: new THREE.Vector3(3.05, 0.5, 0.4),
    };
    return CIRCULATION.annotations.map((annotation) => ({
      ...annotation,
      position: anchors[annotation.anchor].clone(),
    }));
  }

  dispose() {
    this.heart?.dispose?.();
    this.arterialFlow?.dispose();
    this.venousFlow?.dispose();
    disposeObject(this.root);
  }
}

