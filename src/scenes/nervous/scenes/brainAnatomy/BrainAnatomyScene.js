import * as THREE from 'three';
import { shapedSphere, ripple, smoothstep } from '../../../shared/geometry/shapes.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp, damp } from '../../../../utils/math.js';
import { BRAIN_ANATOMY_META, BRAIN_REGIONS } from '../../../../data/brainAnatomy.js';
import { prototypeMeta } from '../../../shared/prototypeMeta.js';

const LOBES = [
  { key: 'frontal', color: '#d98c72', position: [0, 0.25, 0.55], scale: [0.8, 0.82, 0.82], crop: (v) => 1 - 0.12 * smoothstep(-0.2, 1, -v.z) },
  { key: 'parietal', color: '#d9b66f', position: [0, 0.62, -0.28], scale: [0.82, 0.68, 0.72], crop: (v) => 1 - 0.08 * smoothstep(-0.1, 1, v.z) },
  { key: 'temporal', color: '#a97fbd', position: [0, -0.34, 0.0], scale: [0.76, 0.48, 0.82], crop: () => 1 },
  { key: 'occipital', color: '#6f9fc5', position: [0, 0.15, -0.88], scale: [0.72, 0.72, 0.55], crop: () => 1 },
];

export class BrainAnatomyScene {
  static meta = prototypeMeta({
    ...BRAIN_ANATOMY_META,
    disclaimer: undefined,
    disclaimerJa: undefined,
    disclaimerShort: undefined,
    disclaimerShortJa: undefined,
  });
  static cameraPose = { position: new THREE.Vector3(4.9, 2.8, 8.2), target: new THREE.Vector3(0, 0.05, -0.05) };

  constructor({ viewer } = {}) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = 'brain-anatomy';
    this.selectables = [];
    this.hemispheres = [];
    this.cortical = [];
    this.deep = [];
    this.listeners = new Set();
    this.progress = 0;
    this.displayProgress = 0;
    this.selection = null;
  }

  build() {
    this.root.add(createStudioLights({ key: 31, fill: 0.8, rim: 15 }));
    for (const side of [-1, 1]) this.root.add(this._buildHemisphere(side));
    this.root.add(this._buildDeepStructures(), this._buildCerebellum(), this._buildBrainstem());
    this._bindPicking();
    this.setProgress(0);
    return this.root;
  }

  _buildHemisphere(side) {
    const group = new THREE.Group();
    group.name = side < 0 ? 'left-hemisphere' : 'right-hemisphere';
    group.userData.side = side;
    this.hemispheres.push(group);

    for (const spec of LOBES) {
      const mesh = new THREE.Mesh(
        shapedSphere({ detail: 5, scale: spec.scale, warp: (v) => {
          const fold = 1 + 0.038 * ripple(v.x, v.y, v.z, 10.5, spec.key.length * 0.31);
          v.multiplyScalar(fold * spec.crop(v));
          // A flatter medial face makes the longitudinal fissure legible.
          if (v.x * side < -0.34) v.x = -0.34 * side + (v.x + 0.34 * side) * 0.28;
        } }),
        tissueMaterial({ color: spec.color, roughness: 0.68, emissiveIntensity: 0.035 })
      );
      mesh.position.set(side * 0.66, ...spec.position.slice(1));
      mesh.position.z = spec.position[2];
      mesh.name = `${side < 0 ? 'left' : 'right'}-${spec.key}`;
      this._register(mesh, mesh.name, true);
      group.add(mesh);
    }

    const insula = new THREE.Mesh(
      shapedSphere({ detail: 4, scale: [0.19, 0.38, 0.48], warp: (v) => v.multiplyScalar(1 + 0.025 * ripple(v.x, v.y, v.z, 8, 1.4)) }),
      tissueMaterial({ color: '#65b8a6', roughness: 0.6 })
    );
    insula.position.set(side * 0.43, -0.05, 0.02);
    insula.name = `${side < 0 ? 'left' : 'right'}-insula`;
    this._register(insula, insula.name, false);
    this.deep.push(insula);
    group.add(insula);
    return group;
  }

  _buildDeepStructures() {
    const group = new THREE.Group();
    group.name = 'deep-structures';
    for (const side of [-1, 1]) {
      const hippocampus = capsule([0.16, 0.16, 0.48], '#6dc8b2', 0.18);
      hippocampus.rotation.x = Math.PI / 2.8;
      hippocampus.rotation.z = side * 0.35;
      hippocampus.position.set(side * 0.27, -0.23, -0.1);
      hippocampus.name = `${side < 0 ? 'left' : 'right'}-hippocampus`;
      this._register(hippocampus, hippocampus.name, false);

      const amygdala = capsule([0.18, 0.2, 0.18], '#d36d82', 0.18);
      amygdala.position.set(side * 0.3, -0.28, 0.32);
      amygdala.name = `${side < 0 ? 'left' : 'right'}-amygdala`;
      this._register(amygdala, amygdala.name, false);
      this.deep.push(hippocampus, amygdala);
      group.add(hippocampus, amygdala);
    }
    const thalamus = capsule([0.36, 0.28, 0.42], '#78aeb8', 0.18);
    thalamus.name = 'thalamus';
    thalamus.position.set(0, 0.02, -0.12);
    this._register(thalamus, 'thalamus', false);
    this.deep.push(thalamus);
    group.add(thalamus);
    return group;
  }

  _buildCerebellum() {
    const mesh = new THREE.Mesh(
      shapedSphere({ detail: 5, scale: [0.72, 0.4, 0.5], warp: (v) => v.multiplyScalar(1 + 0.055 * Math.sin(v.y * 32 + v.z * 8)) }),
      tissueMaterial({ color: '#bd7f91', roughness: 0.72 })
    );
    mesh.position.set(0, -0.63, -0.83);
    mesh.name = 'cerebellum';
    this._register(mesh, 'cerebellum', false);
    return mesh;
  }

  _buildBrainstem() {
    const mesh = capsule([0.24, 0.58, 0.25], '#9a806d');
    mesh.position.set(0, -0.75, -0.18);
    mesh.rotation.x = -0.14;
    mesh.name = 'brainstem';
    this._register(mesh, 'brainstem', false);
    return mesh;
  }

  _register(mesh, regionId, cortical) {
    mesh.userData.regionId = regionId;
    mesh.userData.baseColor = mesh.material.color.clone();
    mesh.userData.baseScale = mesh.scale.clone();
    this.selectables.push(mesh);
    if (cortical) this.cortical.push(mesh);
  }

  _bindPicking() {
    const canvas = this.viewer?.renderer?.domElement;
    if (!canvas) return;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let down = null;
    this._pointerDown = (event) => { down = [event.clientX, event.clientY]; };
    this._pointerUp = (event) => {
      if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 7) return;
      const rect = canvas.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, this.viewer.camera);
      const hit = raycaster.intersectObjects(this.selectables, false)[0];
      if (hit) this.selectRegion(hit.object.userData.regionId);
    };
    canvas.addEventListener('pointerdown', this._pointerDown);
    canvas.addEventListener('pointerup', this._pointerUp);
    canvas.style.cursor = 'grab';
  }

  selectRegion(id) {
    const info = BRAIN_REGIONS[id];
    if (!info) return;
    this.selection = { id, ...info };
    for (const mesh of this.selectables) {
      const selected = mesh.userData.regionId === id;
      mesh.material.emissive.copy(selected ? new THREE.Color('#ffffff') : mesh.userData.baseColor);
      mesh.material.emissiveIntensity = selected ? 0.22 : 0.035;
      mesh.userData.selected = selected;
    }
    for (const listener of this.listeners) listener(this.selection);
  }

  getAnatomySelection() { return this.selection; }
  onAnatomySelection(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }

  setProgress(value) { this.progress = clamp(value); }

  update(dt) {
    this.displayProgress = damp(this.displayProgress, this.progress, 7, dt);
    const open = smoothstep(0.22, 0.7, this.displayProgress);
    const deepReveal = smoothstep(0.55, 0.92, this.displayProgress);
    for (const group of this.hemispheres) group.position.x = group.userData.side * 0.48 * open;
    for (const mesh of this.cortical) {
      mesh.material.opacity = 1 - 0.68 * deepReveal;
      mesh.material.transparent = deepReveal > 0.001;
      mesh.material.depthWrite = deepReveal < 0.22;
      const target = mesh.userData.selected ? 1.055 : 1;
      const scale = damp(mesh.scale.x, target, 9, dt);
      mesh.scale.setScalar(scale);
    }
    for (const mesh of this.deep) mesh.material.opacity = 0.18 + 0.82 * smoothstep(0.3, 0.76, this.displayProgress);
  }

  getAnnotations() {
    const anchors = {
      frontal: new THREE.Vector3(-1.15, 0.65, 0.75), temporal: new THREE.Vector3(1.15, -0.3, 0.25),
      insula: new THREE.Vector3(0.63, -0.05, 0.05), thalamus: new THREE.Vector3(0.05, 0.05, -0.1),
    };
    return BRAIN_ANATOMY_META.annotations.map((item) => ({ ...item, position: anchors[item.anchor].clone() }));
  }

  dispose() {
    const canvas = this.viewer?.renderer?.domElement;
    canvas?.removeEventListener('pointerdown', this._pointerDown);
    canvas?.removeEventListener('pointerup', this._pointerUp);
    this.listeners.clear();
    disposeObject(this.root);
  }
}

function capsule(scale, color, opacity = 1) {
  return new THREE.Mesh(shapedSphere({ detail: 4, scale }), tissueMaterial({ color, roughness: 0.55, opacity }));
}
