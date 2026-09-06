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
} from '../../../../data/pulmonaryEmbolism.js';
import { solvePulmonaryEmbolism } from '../../../../models/pulmonaryEmbolism.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { buildLungs } from '../../organs/lungs.js';
import { buildVascularTerritory } from '../../organs/vascularTerritory.js';

/**
 * Pulmonary embolism as a ventilation-without-perfusion problem.
 *
 * The twelve vessels are parallel model territories. Cyan units keep moving
 * throughout; flow markers slow and branches desaturate as orange emboli
 * remove conductance. This makes the contrast with pneumonia explicit: the
 * failed side of V/Q is perfusion here, not ventilation.
 */
export class PulmonaryEmbolismScene {
  static meta = {
    id: 'pulmonary-embolism',
    status: 'alpha',
    title: 'Pulmonary embolism: dead space and vascular load',
    titleJa: '肺塞栓症：死腔と肺血管負荷',
    subtitle: 'Twelve parallel vascular territories · ventilation continues beyond obstructed flow',
    subtitleJa: '12本の並列肺血管領域 ｜ 血流が遮断された先でも換気は続く',
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
    position: new THREE.Vector3(0.7, 0.65, 9.8),
    target: new THREE.Vector3(0, 0.35, 0),
  };

  constructor({ viewer } = {}) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = PulmonaryEmbolismScene.meta.id;
    this.progress = 0;
    this.state = solvePulmonaryEmbolism();
    this.phase = 0;
  }

  build() {
    this.lungs = buildLungs({
      color: PALETTE.lung,
      opacity: 0.25,
      detail: 10,
      referenceSamples: 14000,
    });
    this.lungs.object.updateMatrixWorld(true);

    this.airGeometry = new THREE.SphereGeometry(0.18, 16, 11);
    this.flowGeometry = new THREE.SphereGeometry(0.05, 10, 8);
    this.embolusGeometry = new THREE.SphereGeometry(0.12, 14, 10);
    this.territories = [];
    this.units = [];

    const basePerfusion = new THREE.Color(PALETTE.perfusion);
    const lowPerfusion = new THREE.Color(PALETTE.underperfused);
    const hilum = new THREE.Vector3();

    for (const side of ['right', 'left']) {
      const lung = this.lungs.object.getObjectByName(`${side}-lung`);
      hilum.copy(this.lungs.anchors.hilum);
      if (side === 'left') hilum.x = -hilum.x;
      const regions = this.lungs.regions.filter((region) => region.side === side);

      for (const region of regions) {
        const id = this.units.length;
        const target = region.object.position.clone().applyMatrix4(lung.matrix);
        const territory = buildVascularTerritory({
          hilum,
          target,
          bow: { z: 0.12, y: id % 2 === 0 ? 0.08 : -0.04 },
        });
        this.territories.push(territory);

        const vesselMaterial = tissueMaterial({
          color: PALETTE.perfusion,
          roughness: 0.42,
          emissive: PALETTE.perfusion,
          emissiveIntensity: 0.09,
          opacity: 0.78,
        });
        const vessel = new THREE.Mesh(territory.geometry, vesselMaterial);
        vessel.name = `pulmonary-territory-${id}`;

        const embolusMaterial = tissueMaterial({
          color: PALETTE.embolus,
          roughness: 0.58,
          emissive: PALETTE.embolus,
          emissiveIntensity: 0.13,
          opacity: 0.92,
        });
        const embolus = new THREE.Mesh(this.embolusGeometry, embolusMaterial);
        embolus.name = `embolus-${id}`;
        embolus.position.copy(territory.anchors.proximalOcclusionSite);
        embolus.visible = false;

        const flow = new THREE.Mesh(this.flowGeometry, vesselMaterial);
        flow.name = `perfusion-marker-${id}`;

        const airMaterial = tissueMaterial({
          color: PALETTE.air,
          roughness: 0.25,
          emissive: PALETTE.air,
          emissiveIntensity: 0.2,
          opacity: 0.52,
        });
        const air = new THREE.Mesh(this.airGeometry, airMaterial);
        air.name = `ventilation-${id}`;
        region.object.add(air);
        this.lungs.object.add(vessel, embolus, flow);

        this.units.push({
          id,
          territory,
          vessel,
          vesselMaterial,
          embolus,
          flow,
          air,
          basePerfusion: basePerfusion.clone(),
          lowPerfusion: lowPerfusion.clone(),
        });
      }
    }

    this.body = new THREE.Group();
    this.body.add(this.lungs.object);
    this.root.add(createStudioLights(), this.body);
    this.applyState();
    return this.root;
  }

  setProgress(value) {
    this.progress = clamp(value);
    this.state = solvePulmonaryEmbolism({ obstruction: this.progress });
    this.applyState();
  }

  applyState() {
    if (!this.units) return;
    for (const unit of this.units) {
      const solved = this.state.units[unit.id];
      unit.vesselMaterial.color.copy(unit.basePerfusion).lerp(unit.lowPerfusion, solved.occlusion);
      unit.vesselMaterial.opacity = 0.2 + 0.58 * solved.perfusionAtFixedPressure;
      unit.vesselMaterial.emissiveIntensity = 0.03 + 0.1 * solved.perfusionAtFixedPressure;
      unit.embolus.visible = solved.occlusion > 0.015;
      unit.embolus.scale.set(0.75 + solved.occlusion * 0.75, 0.75, 0.75 + solved.occlusion * 0.75);
      unit.flow.visible = solved.perfusionAtFixedPressure > 0.09;
    }
  }

  update(dt) {
    this.phase = (this.phase + dt / 4.1) % 1;
    const breath = 0.5 - 0.5 * Math.cos(this.phase * Math.PI * 2);
    for (const unit of this.units ?? []) {
      const solved = this.state.units[unit.id];
      // Ventilation remains present even when this unit loses perfusion.
      unit.air.scale.setScalar(0.78 + 0.42 * breath);
      const t = (this.phase * (0.35 + 0.65 * solved.perfusionAtFixedPressure) + unit.id * 0.083) % 1;
      unit.flow.position.copy(unit.territory.pointAt(t));
      unit.flow.scale.setScalar(0.6 + 0.55 * solved.perfusionAtFixedPressure);
    }
  }

  getMetrics() {
    return [
      {
        id: 'territory',
        label: 'Modelled obstructed territory',
        labelJa: '閉塞血管領域（モデル）',
        value: Math.round(this.state.obstructedTerritory * 100),
        unit: '%',
        emphasis: true,
      },
      {
        id: 'dead-space',
        label: 'Underperfused ventilation index',
        labelJa: '低灌流換気指数',
        value: Math.round(this.state.underperfusedVentilationFraction * 100),
        unit: '%',
        emphasis: true,
      },
      {
        id: 'pvr',
        label: 'Relative pulmonary vascular resistance',
        labelJa: '相対肺血管抵抗',
        // One decimal: this is an inverse conductance of twelve equal paths,
        // and a second digit would claim a precision the network does not have.
        value: this.state.relativePulmonaryVascularResistance.toFixed(1),
        unit: '× baseline',
      },
    ];
  }

  getAnnotations() {
    const clot = this.units?.[0]?.territory.anchors.proximalOcclusionSite ?? new THREE.Vector3(-0.7, 0.5, 0.3);
    return [
      {
        id: 'continued-ventilation',
        text: 'Ventilation continues',
        sub: '換気は続く',
        position: this.lungs?.anchors.leftLung.clone() ?? new THREE.Vector3(1.8, 0.8, 0.6),
        range: [0, 1],
      },
      {
        id: 'vascular-obstruction',
        text: 'Vascular obstruction',
        sub: '肺血管の閉塞',
        position: clot.clone().add(new THREE.Vector3(-0.25, 0.35, 0.2)),
        range: [0.08, 1],
      },
      {
        id: 'underperfused-region',
        text: 'Underperfused ventilation',
        sub: '灌流の乏しい換気領域',
        position: this.lungs?.anchors.rightLung.clone().add(new THREE.Vector3(0, -0.75, 0.1)) ?? new THREE.Vector3(-1.8, 0.1, 0.7),
        range: [0.3, 1],
      },
    ];
  }

  dispose() {
    for (const territory of this.territories ?? []) territory.dispose();
    this.lungs?.dispose?.();
    disposeObject(this.root);
  }
}
