import * as THREE from 'three';
import { definePrototypeScene } from '../../../shared/PrototypeScene.js';
import {
  HFPEF_LIMITS,
  hfpefPressureVolume,
  solveHfpef,
} from '../../../../models/hfpef.js';
import {
  ANNOTATIONS,
  DISCLAIMER,
  DISCLAIMER_JA,
  DISCLAIMER_SHORT,
  DISCLAIMER_SHORT_JA,
  LEGEND,
  MODEL_CONTROLS,
  MODEL_SCOPE,
  PALETTE,
  PRESSURE_VOLUME,
  PROGRESS_LABEL,
  RANGE,
  STAGES,
} from '../../../../data/hfpef.js';

const COPY = {
  id: 'hfpef',
  status: 'alpha',
  title: 'HFpEF',
  titleJa: 'HFpEF',
  subtitle: 'Preserved EF, high filling pressure',
  subtitleJa: 'EFが保たれていても、充満圧は上がる',
  stages: STAGES,
  legend: LEGEND,
  palette: PALETTE,
  range: RANGE,
  progressLabel: PROGRESS_LABEL,
  annotations: ANNOTATIONS,
  disclaimer: DISCLAIMER,
  disclaimerJa: DISCLAIMER_JA,
  disclaimerShort: DISCLAIMER_SHORT,
  disclaimerShortJa: DISCLAIMER_SHORT_JA,
};

const BaseScene = definePrototypeScene({
  copy: COPY,
  cameraPose: { position: [0, 1.1, 10], target: [0, 0.55, 0] },
  createModel: createHfpefVisualModel,
  framing: { headroom: 1.05, lift: 0.05 },
});

export default class HfpefScene extends BaseScene {
  static meta = {
    ...BaseScene.meta,
    modelControls: MODEL_CONTROLS,
    modelScope: MODEL_SCOPE,
    pressureVolume: PRESSURE_VOLUME,
  };

  getMetrics() {
    return this.model.getMetrics();
  }

  getPressureVolume() {
    return this.model.getPressureVolume();
  }

  getModelControls() {
    return this.model.getModelControls();
  }

  setModelControl(id, value) {
    this.model.setModelControl(id, value);
  }

  resetModelControls() {
    this.model.resetModelControls();
  }
}

function createHfpefVisualModel() {
  const object = new THREE.Group();
  object.name = 'hfpef-pressure-volume-comparison';

  const referenceVisual = createVentricleVisual({ x: -2.05, color: PALETTE.reference, name: 'compliant-reference' });
  const currentVisual = createVentricleVisual({ x: 2.05, color: PALETTE.current, name: 'current-lv' });
  object.add(referenceVisual.group, currentVisual.group);

  const divider = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -1.35, 0),
      new THREE.Vector3(0, 2.7, 0),
    ]),
    new THREE.LineBasicMaterial({ color: 0x607184, transparent: true, opacity: 0.22 })
  );
  object.add(divider);

  const anchors = {
    reference: new THREE.Vector3(-2.05, 0.45, 0.55),
    current: new THREE.Vector3(2.05, 0.45, 0.55),
    pulmonary: new THREE.Vector3(2.05, 1.7, -0.25),
  };

  let stiffness = 0;
  let filling = 1;
  let state = solveHfpef({ stiffness, filling });
  let reference = solveHfpef({ stiffness: 0, filling });
  let elapsedSeconds = 0;
  let beatPhase = 0;

  function solveAndApply() {
    state = solveHfpef({ stiffness, filling });
    reference = solveHfpef({ stiffness: 0, filling });
    referenceVisual.setState(reference, { pressureCue: pressureCue(reference.endDiastolicPressureMmHg) });
    currentVisual.setState(state, { pressureCue: pressureCue(state.endDiastolicPressureMmHg) });
  }

  solveAndApply();

  return {
    object,
    anchors,
    focus: object,

    setProgress(value) {
      stiffness = Math.min(1, Math.max(0, Number(value)));
      solveAndApply();
    },

    update(dt) {
      elapsedSeconds += Math.max(0, Number(dt) || 0);
      beatPhase = (elapsedSeconds * state.heartRatePerMin / 60) % 1;
      const fillingFraction = beatFillingFraction(beatPhase);
      referenceVisual.setBeat(reference, fillingFraction);
      currentVisual.setBeat(state, fillingFraction);
    },

    getMetrics() {
      const direction = (value, ref, tolerance = 0.05) =>
        value > ref + tolerance ? 'up' : value < ref - tolerance ? 'down' : 'flat';
      const percent = (value) => Math.round(value * 100);
      const one = (value) => Math.round(value * 10) / 10;
      const integer = (value) => Math.round(value);

      return [
        {
          id: 'lvedp',
          label: 'LV end-diastolic pressure',
          labelJa: '左室拡張末期圧',
          value: one(state.endDiastolicPressureMmHg),
          reference: one(reference.endDiastolicPressureMmHg),
          change: direction(state.endDiastolicPressureMmHg, reference.endDiastolicPressureMmHg, 0.2),
          changeLabel: 'higher filling pressure',
          changeLabelJa: '充満圧が上昇',
          unit: 'mmHg',
          emphasis: true,
        },
        {
          id: 'ef',
          label: 'Ejection fraction',
          labelJa: '駆出率',
          value: percent(state.ejectionFraction),
          reference: percent(reference.ejectionFraction),
          change: direction(percent(state.ejectionFraction), percent(reference.ejectionFraction), 1),
          changeLabel: 'fractional ejection preserved',
          changeLabelJa: '駆出割合は保持',
          unit: '%',
          emphasis: true,
        },
        {
          id: 'edv',
          label: 'End-diastolic volume',
          labelJa: '拡張末期容積',
          value: integer(state.endDiastolicVolumeMl),
          reference: integer(reference.endDiastolicVolumeMl),
          change: 'flat',
          changeLabel: 'same filling condition',
          changeLabelJa: '同じ充満条件',
          unit: 'mL',
        },
        {
          id: 'sv',
          label: 'Stroke volume',
          labelJa: '1回拍出量',
          value: integer(state.strokeVolumeMl),
          reference: integer(reference.strokeVolumeMl),
          change: 'flat',
          changeLabel: 'same systolic model',
          changeLabelJa: '収縮モデルは同じ',
          unit: 'mL',
        },
        {
          id: 'wall',
          label: 'Illustrative wall thickness',
          labelJa: '模式的な壁厚',
          value: one(state.wallThicknessMm),
          reference: one(reference.wallThicknessMm),
          change: direction(state.wallThicknessMm, reference.wallThicknessMm, 0.2),
          changeLabel: 'structural cue only',
          changeLabelJa: '構造の視覚表現',
          unit: 'mm',
        },
      ];
    },

    getPressureVolume() {
      return {
        current: hfpefPressureVolume(stiffness, filling),
        reference: hfpefPressureVolume(0, filling),
        phase: beatPhase,
        beat: null,
      };
    },

    getModelControls() {
      return [
        {
          id: 'filling',
          label: 'End-diastolic filling volume',
          labelJa: '拡張末期の充満量',
          min: HFPEF_LIMITS.filling.min,
          max: HFPEF_LIMITS.filling.max,
          step: 0.01,
          value: filling,
          format: (value) => `${Math.round(Number(value) * 100)}%`,
        },
      ];
    },

    setModelControl(id, value) {
      if (id !== 'filling') return;
      filling = Math.min(HFPEF_LIMITS.filling.max, Math.max(HFPEF_LIMITS.filling.min, Number(value)));
      solveAndApply();
    },

    resetModelControls() {
      filling = 1;
      solveAndApply();
    },
  };
}

function createVentricleVisual({ x, color, name }) {
  const group = new THREE.Group();
  group.name = name;
  group.position.x = x;

  const shellMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.58,
    metalness: 0.02,
    transparent: true,
    opacity: 0.58,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const cavityMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.cavity,
    roughness: 0.34,
    transparent: true,
    opacity: 0.82,
  });
  const pressureMaterial = new THREE.MeshBasicMaterial({
    color: PALETTE.pressure,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
  });

  const geometry = new THREE.SphereGeometry(1, 44, 30);
  const shell = new THREE.Mesh(geometry, shellMaterial);
  const cavity = new THREE.Mesh(geometry, cavityMaterial);
  shell.name = `${name}-myocardium`;
  cavity.name = `${name}-cavity`;
  shell.scale.set(0.95, 1.28, 0.82);
  cavity.scale.set(0.72, 0.98, 0.62);
  group.add(shell, cavity);

  // A schematic pulmonary vascular bed: it is a pressure cue, not lung anatomy.
  const pulmonary = new THREE.Group();
  pulmonary.position.set(0, 1.35, -0.72);
  for (const side of [-1, 1]) {
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.48, 22, 16), pressureMaterial);
    lobe.position.set(side * 0.42, 0, 0);
    lobe.scale.set(0.72, 1.22, 0.5);
    pulmonary.add(lobe);
  }
  const pressureRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.025, 10, 64),
    new THREE.MeshBasicMaterial({ color: PALETTE.pressure, transparent: true, opacity: 0.12, depthWrite: false })
  );
  pressureRing.rotation.x = Math.PI / 2;
  pressureRing.position.copy(pulmonary.position);
  group.add(pulmonary, pressureRing);

  let state = solveHfpef();
  let myocardialVisualVolume = 0;

  function setState(next, { pressureCue = 0 } = {}) {
    state = next;
    const cavityEd = cavityRadiusForVolume(state.endDiastolicVolumeMl);
    const wall = 0.13 * (state.wallThicknessMm / 9);
    const outerEd = cavityEd + wall;
    myocardialVisualVolume = outerEd ** 3 - cavityEd ** 3;
    pressureMaterial.opacity = 0.035 + 0.34 * pressureCue;
    pressureRing.material.opacity = 0.08 + 0.55 * pressureCue;
    pressureRing.scale.setScalar(0.92 + 0.16 * pressureCue);
    setBeat(state, 1);
  }

  function setBeat(next, fillingFraction) {
    const volume = next.endSystolicVolumeMl + next.strokeVolumeMl * fillingFraction;
    const cavityRadius = cavityRadiusForVolume(volume);
    const outerRadius = Math.cbrt(cavityRadius ** 3 + myocardialVisualVolume);
    cavity.scale.set(cavityRadius, cavityRadius * 1.34, cavityRadius * 0.86);
    shell.scale.set(outerRadius, outerRadius * 1.34, outerRadius * 0.86);
  }

  return { group, setState, setBeat };
}

function cavityRadiusForVolume(volumeMl) {
  return 0.72 * Math.cbrt(Math.max(1, volumeMl) / 120);
}

function pressureCue(lvedpMmHg) {
  return Math.min(1, Math.max(0, (lvedpMmHg - 8) / 16));
}

function beatFillingFraction(phase) {
  if (phase < 0.35) {
    const t = phase / 0.35;
    return 1 - smooth01(t);
  }
  const t = (phase - 0.35) / 0.65;
  return smooth01(t);
}

function smooth01(value) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}
