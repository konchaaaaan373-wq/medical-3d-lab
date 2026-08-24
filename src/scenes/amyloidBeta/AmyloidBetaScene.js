import * as THREE from 'three';
import { AggregationField } from './AggregationField.js';
import { FibrilRibbons } from './FibrilRibbons.js';
import { PlaqueCores } from './PlaqueCores.js';
import { Neuron } from './Neuron.js';
import { buildAggregationLayout } from './aggregationLayout.js';
import { ANNOTATIONS, STAGES, LEGEND, PALETTE, DISCLAIMER, DISCLAIMER_JA } from '../../data/amyloidBeta.js';
import { disposeObject } from '../../utils/dispose.js';

/**
 * Scene module: "Amyloid-β accumulation".
 *
 * Every scene in this project implements the same small interface so that
 * `App` can host any of them without knowing what they contain:
 *
 *   static meta          — title, stages, legend and copy for the UI
 *   static cameraPose    — the framing used on load and on "reset view"
 *   build()              — create objects, return the root Object3D
 *   setProgress(value)   — 0..1, the only state the UI drives
 *   update(dt, elapsed)  — per-frame animation
 *   getAnnotations()     — floating labels, projected to screen by the UI layer
 *   dispose()            — release GPU resources
 */
export class AmyloidBetaScene {
  static meta = {
    id: 'amyloid-beta',
    title: 'Amyloid-β Accumulation',
    titleJa: 'アミロイドβの蓄積',
    subtitle: "Alzheimer's disease · simplified 3D model",
    subtitleJa: 'アルツハイマー病 ｜ 教育用3Dモデル',
    stages: STAGES,
    legend: LEGEND,
    palette: PALETTE,
    disclaimer: DISCLAIMER,
    disclaimerJa: DISCLAIMER_JA,
  };

  /** Framing chosen to look good as a still: subject slightly left, plaques catching the light. */
  static cameraPose = {
    position: new THREE.Vector3(12.8, 5.6, 17.2),
    target: new THREE.Vector3(0.4, -0.3, 0.1),
  };

  /** @param {{ viewer: import('../../app/Viewer.js').Viewer }} context */
  constructor({ viewer }) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = AmyloidBetaScene.meta.id;
    this.progress = 0;
  }

  build() {
    // Fewer particles on phones: the field is fill-rate bound, not CPU bound.
    const compact = window.innerWidth < 720 || (navigator.hardwareConcurrency ?? 8) <= 4;
    this.layout = buildAggregationLayout(compact ? 1500 : 2800);

    this.field = new AggregationField(this.layout);
    this.fibrils = new FibrilRibbons(this.layout);
    this.plaques = new PlaqueCores(this.layout);
    this.neuron = new Neuron();

    this.root.add(this._createLights(), this.neuron, this.fibrils, this.plaques, this.field);
    this.setProgress(0);
    return this.root;
  }

  _createLights() {
    const group = new THREE.Group();
    group.name = 'lights';
    group.add(new THREE.HemisphereLight(0x8fb0e8, 0x0a1020, 0.65));

    const key = new THREE.PointLight(0xbcd8ff, 55, 40, 2);
    key.position.set(-6, 6, 8);
    const rim = new THREE.PointLight(0x4de1ff, 32, 40, 2);
    rim.position.set(7, -3, -7);
    group.add(key, rim);
    return group;
  }

  /** @param {number} value 0..1 */
  setProgress(value) {
    this.progress = value;
    this.field.setProgress(value);
    this.fibrils.setProgress(value);
    this.plaques.setProgress(value);
    this.neuron.setProgress(value);
  }

  update(dt, elapsed) {
    this.field.update(elapsed);
    this.field.syncViewport(this.viewer.camera, this.viewer.renderer);
    this.plaques.update(dt);
  }

  /** Floating labels; the UI decides where they land on screen. */
  getAnnotations() {
    return ANNOTATIONS.map((annotation) => ({
      ...annotation,
      position: this.layout.anchors[annotation.anchor].clone(),
    })).concat({
      id: 'synapse',
      text: 'Synapse',
      sub: 'シナプス',
      range: [0.0, 0.36],
      position: this.layout.anchors.synapse.clone(),
    });
  }

  dispose() {
    disposeObject(this.root);
  }
}
