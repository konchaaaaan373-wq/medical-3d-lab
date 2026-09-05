import * as THREE from 'three';

import {
  DISCLAIMER,
  DISCLAIMER_JA,
  DISCLAIMER_SHORT,
  DISCLAIMER_SHORT_JA,
  LEGEND,
  MODEL_SCOPE,
  PALETTE,
  PROGRESS_LABEL,
  RANGE,
  STAGES,
} from '../../../../data/pneumonia.js';
import { solvePneumonia } from '../../../../models/pneumonia.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { buildLungs } from '../../organs/lungs.js';

/**
 * Pneumonia as the textbook V/Q problem created by alveolar consolidation.
 *
 * The spatial unit is deliberately larger than an acinus. Each of twelve
 * regions shows three readings of one solve: cyan expansion is ventilation,
 * the amber body is consolidation, and the red orbit is perfusion. A red orbit
 * that remains around a non-expanding amber unit is the shunt mechanism.
 */
export class PneumoniaScene {
  static meta = {
    id: 'pneumonia-consolidation',
    status: 'alpha',
    title: 'Pneumonia: consolidation and shunt',
    titleJa: '肺炎：コンソリデーションとシャント',
    subtitle: 'Twelve regional units · perfusion persists where alveolar ventilation is lost',
    subtitleJa: '12領域の肺モデル ｜ 肺胞換気を失った領域にも灌流が残る',
    stages: STAGES,
    legend: LEGEND,
    range: RANGE,
    progressLabel: PROGRESS_LABEL,
    palette: PALETTE,
    disclaimer: DISCLAIMER,
    disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: DISCLAIMER_SHORT,
    disclaimerShortJa: DISCLAIMER_SHORT_JA,
    modelScope: MODEL_SCOPE,
  };

  static cameraPose = {
    position: new THREE.Vector3(0.6, 0.8, 9.4),
    target: new THREE.Vector3(0, 0.25, 0),
  };

  constructor({ viewer } = {}) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = PneumoniaScene.meta.id;
    this.progress = 0;
    this.state = solvePneumonia();
    this.phase = 0;
  }

  build() {
    this.lungs = buildLungs({
      color: PALETTE.lung,
      opacity: 0.34,
      detail: 10,
      referenceSamples: 14000,
    });

    this.airGeometry = new THREE.SphereGeometry(0.2, 18, 12);
    this.consolidationGeometry = new THREE.SphereGeometry(0.24, 18, 12);
    this.perfusionGeometry = new THREE.TorusGeometry(0.3, 0.024, 8, 30);
    this.beadGeometry = new THREE.SphereGeometry(0.045, 10, 8);
    this.units = this.lungs.regions.map((region, id) => {
      const group = new THREE.Group();
      group.name = `regional-unit-${id}`;

      const airMaterial = tissueMaterial({
        color: PALETTE.air,
        roughness: 0.25,
        emissive: PALETTE.air,
        emissiveIntensity: 0.22,
        opacity: 0.52,
      });
      const consolidationMaterial = tissueMaterial({
        color: PALETTE.consolidation,
        roughness: 0.68,
        emissive: PALETTE.consolidation,
        emissiveIntensity: 0.08,
        opacity: 0,
      });
      const perfusionMaterial = tissueMaterial({
        color: PALETTE.perfusion,
        roughness: 0.35,
        emissive: PALETTE.perfusion,
        emissiveIntensity: 0.16,
        opacity: 0.65,
      });
      const air = new THREE.Mesh(this.airGeometry, airMaterial);
      const consolidation = new THREE.Mesh(this.consolidationGeometry, consolidationMaterial);
      const perfusion = new THREE.Mesh(this.perfusionGeometry, perfusionMaterial);
      const bead = new THREE.Mesh(this.beadGeometry, perfusionMaterial);
      air.name = `ventilation-${id}`;
      consolidation.name = `consolidation-${id}`;
      perfusion.name = `perfusion-${id}`;
      bead.name = `perfusion-marker-${id}`;
      perfusion.rotation.x = Math.PI * 0.5;
      group.add(air, consolidation, perfusion, bead);
      region.object.add(group);
      return {
        id,
        group,
        air,
        consolidation,
        perfusion,
        bead,
        airMaterial,
        consolidationMaterial,
        perfusionMaterial,
      };
    });

    this.body = new THREE.Group();
    this.body.add(this.lungs.object);
    this.root.add(createStudioLights(), this.body);
    this.applyState();
    return this.root;
  }

  setProgress(value) {
    this.progress = clamp(value);
    this.state = solvePneumonia({ consolidatedFraction: this.progress });
    this.applyState();
  }

  applyState() {
    if (!this.units) return;
    for (const unit of this.units) {
      const solved = this.state.units[unit.id];
      unit.consolidation.visible = solved.consolidation > 0.005;
      unit.consolidationMaterial.opacity = 0.05 + 0.88 * solved.consolidation;
      unit.consolidation.scale.setScalar(0.7 + 0.45 * solved.consolidation);
      unit.airMaterial.opacity = 0.02 + 0.58 * solved.ventilation;
      const relativePerfusion = solved.perfusion * this.state.units.length;
      unit.perfusionMaterial.opacity = clamp(0.25 + 0.38 * relativePerfusion, 0.18, 0.78);
      unit.perfusionMaterial.emissiveIntensity = 0.08 + 0.13 * relativePerfusion;
    }
  }

  update(dt) {
    this.phase = (this.phase + dt / 4.2) % 1;
    const breath = 0.5 - 0.5 * Math.cos(this.phase * Math.PI * 2);
    for (const unit of this.units ?? []) {
      const solved = this.state.units[unit.id];
      unit.air.scale.setScalar(0.35 + (0.43 + breath * 0.42) * solved.ventilation);
      const relativePerfusion = solved.perfusion * this.state.units.length;
      const angle = this.phase * Math.PI * 2 * (0.75 + 0.25 * relativePerfusion) + unit.id * 0.7;
      unit.bead.position.set(Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3);
    }
  }

  getMetrics() {
    return [
      {
        id: 'consolidation',
        label: 'Consolidated regional fraction',
        labelJa: 'コンソリデーション領域',
        value: Math.round(this.state.consolidatedFraction * 100),
        unit: '%',
        emphasis: true,
      },
      {
        id: 'ventilation',
        label: 'Ventilated fraction index',
        labelJa: '換気される割合（モデル指標）',
        value: Math.round(this.state.ventilationFraction * 100),
        unit: '%',
      },
      {
        id: 'shunt',
        label: 'Perfusion reaching consolidated units',
        labelJa: 'コンソリデーション領域への灌流',
        value: Math.round(this.state.shuntFraction * 100),
        unit: '%',
        emphasis: true,
      },
    ];
  }

  getAnnotations() {
    return [
      {
        id: 'regional-ventilation',
        text: 'Regional ventilation',
        sub: '局所換気',
        position: this.lungs?.anchors.leftLung.clone() ?? new THREE.Vector3(1.8, 0.8, 0.6),
        range: [0, 1],
      },
      {
        id: 'consolidated-unit',
        text: 'Alveolar consolidation',
        sub: '肺胞性コンソリデーション',
        position: this.lungs?.anchors.base.clone().add(new THREE.Vector3(-0.8, 0.2, 0.1)) ?? new THREE.Vector3(-0.8, -1.2, 0.8),
        range: [0.12, 1],
      },
      {
        id: 'persistent-perfusion',
        text: 'Perfusion persists',
        sub: '灌流が残る',
        position: this.lungs?.anchors.rightLung.clone().add(new THREE.Vector3(0, -0.7, 0.1)) ?? new THREE.Vector3(-1.8, 0.1, 0.7),
        range: [0.28, 1],
      },
    ];
  }

  dispose() {
    this.lungs?.dispose?.();
    disposeObject(this.root);
  }
}
