import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp, damp, smoothstep } from '../../../../utils/math.js';
import {
  BRAIN_ANATOMY_META,
  BRAIN_COLOR_MODES,
  BRAIN_REGIONS,
  brainColor,
  brainStructureInfo,
} from '../../../../data/brainAnatomy.js';

const BASE_URL = import.meta.env?.BASE_URL ?? './';
const ATLAS_URL = `${BASE_URL}assets/brain/brain.glb`;
const DRACO_URL = `${BASE_URL}assets/brain/draco/`;
const TARGET_RADIUS = 2.08;

const ANATOMY_CATEGORIES = new Set([
  'cortex',
  'deep_grey',
  'diencephalon',
  'white_matter',
  'ventricles',
  'cerebellum',
  'brainstem',
]);

const DEEP_CATEGORIES = new Set(['deep_grey', 'diencephalon', 'white_matter', 'ventricles']);

/** Cortex that covers the left insula in the default lateral view. */
const LEFT_OPERCULUM = new Set([
  'Opercular part of inferior frontal gyrus',
  'Triangular part of inferior frontal gyrus',
  'Precentral gyrus',
  'Precentral sulcus (inferior part)',
  'Postcentral gyrus',
  'Postcentral sulcus',
  'Supramarginal gyrus',
  'Superior temporal gyrus (Lateral part)',
  'Transverse temporal gyri',
  'Temporal plane',
  'Lat Fis-post',
]);

const VIEW_SPECS = [
  {
    id: 'left-lateral', label: 'Left lateral', labelJa: '左外側',
    position: new THREE.Vector3(-5.25, 0.23, 0.25), target: new THREE.Vector3(0, -0.35, 0),
  },
  {
    id: 'left-medial', label: 'Left medial', labelJa: '左内側', medialSide: 'left',
    position: new THREE.Vector3(5.25, 0.23, 0.25), target: new THREE.Vector3(0, -0.35, 0),
  },
  {
    id: 'right-lateral', label: 'Right lateral', labelJa: '右外側',
    position: new THREE.Vector3(5.25, 0.23, 0.25), target: new THREE.Vector3(0, -0.35, 0),
  },
  {
    id: 'right-medial', label: 'Right medial', labelJa: '右内側', medialSide: 'right',
    position: new THREE.Vector3(-5.25, 0.23, 0.25), target: new THREE.Vector3(0, -0.35, 0),
  },
  {
    id: 'anterior', label: 'Anterior', labelJa: '前面',
    position: new THREE.Vector3(0.25, 0.23, -5.35), target: new THREE.Vector3(0, -0.35, 0),
  },
  {
    id: 'superior', label: 'Superior', labelJa: '上面',
    position: new THREE.Vector3(2.8, 5.45, 1.2), target: new THREE.Vector3(0, 0.08, 0),
  },
];

const ANCHOR_SPECS = {
  temporal: { label: 'Middle temporal gyrus', side: 'left' },
  centralSulcus: { label: 'Central sulcus', side: 'left' },
  insula: { label: 'Insula (Subcentral gyrus and ant. and post. sulci)', side: 'left' },
  putamen: { label: 'Putamen', side: 'left' },
};

export class BrainAnatomyScene {
  static meta = BRAIN_ANATOMY_META;

  static cameraPose = clonePose(VIEW_SPECS[0]);
  // Anatomical orientation is information. Keep the authored left-lateral view
  // still until the learner deliberately rotates it.
  static allowAutoRotate = false;

  constructor({ viewer, atlas, atlasLoader } = {}) {
    this.viewer = viewer;
    this.atlasSource = atlas;
    this.atlasLoader = atlasLoader ?? loadAtlas;
    this.root = new THREE.Group();
    this.root.name = 'brain-anatomy';
    this.atlasRoot = new THREE.Group();
    this.atlasRoot.name = 'brain-atlas';
    this.root.add(this.atlasRoot);

    this.selectables = [];
    this.cortical = [];
    this.deep = [];
    this.hemispheres = { left: [], right: [] };
    this.meshByAtlasId = new Map();
    this.listeners = new Set();
    this.hoverListeners = new Set();
    this.statusListeners = new Set();
    this.colorMode = 'detail';
    this.activeView = VIEW_SPECS[0].id;
    this.medialSide = null;
    this.progress = 0;
    this.displayProgress = 0;
    this.selection = null;
    this.selectedMesh = null;
    this.hoveredMesh = null;
    this.built = false;
    this.disposed = false;
    this.ready = Promise.resolve();
    this.status = { state: 'idle', selectableCount: 0, atlasCount: 0 };
    this.annotationAnchors = {
      temporal: new THREE.Vector3(1.1, -0.35, 0.35),
      centralSulcus: new THREE.Vector3(1.25, 0.75, 0),
      insula: new THREE.Vector3(1.1, -0.03, 0.08),
      putamen: new THREE.Vector3(0.45, 0, 0),
    };
  }

  build() {
    if (this.built) return this.root;
    this.built = true;
    this.root.add(createStudioLights({ key: 34, fill: 0.92, rim: 14 }));
    this._bindPicking();

    if (this.atlasSource) {
      this.attachAtlas(this.atlasSource);
      this.ready = Promise.resolve(this.root);
    } else if (this.viewer?.renderer?.domElement) {
      this.ready = this._loadAtlas();
    }
    return this.root;
  }

  async _loadAtlas() {
    this._setStatus({ state: 'loading', selectableCount: 0, atlasCount: 0 });
    try {
      const atlas = await this.atlasLoader();
      if (this.disposed) {
        disposeObject(atlas.scene ?? atlas);
        return this.root;
      }
      this.attachAtlas(atlas);
    } catch (error) {
      console.error('[brain-anatomy] atlas load failed', error);
      this._setStatus({ state: 'error', selectableCount: 0, atlasCount: 0, error });
    }
    return this.root;
  }

  /**
   * Adopts a loaded GLTF scene. Public so headless tests can use a tiny fixture
   * while production uses the same metadata and material path with the GLB.
   */
  attachAtlas(atlas) {
    if (this.disposed) return;
    const model = atlas.scene ?? atlas;
    if (!model?.isObject3D) throw new TypeError('brain atlas must contain a THREE.Object3D scene');

    this.atlasRoot.clear();
    this.selectables.length = 0;
    this.cortical.length = 0;
    this.deep.length = 0;
    this.hemispheres.left.length = 0;
    this.hemispheres.right.length = 0;
    this.meshByAtlasId.clear();

    model.updateMatrixWorld(true);
    const coreBox = new THREE.Box3();
    const wholeBox = new THREE.Box3();
    let atlasCount = 0;
    model.traverse((object) => {
      if (!object.isMesh) return;
      atlasCount += 1;
      const metadata = atlasMetadata(object, model);
      wholeBox.expandByObject(object);
      if (metadata.bx_core === 1 || metadata.bx_core === true) coreBox.expandByObject(object);
    });
    const framingBox = coreBox.isEmpty() ? wholeBox : coreBox;
    const center = framingBox.getCenter(new THREE.Vector3());
    const radius = framingBox.getBoundingSphere(new THREE.Sphere()).radius || 1;

    model.position.sub(center);
    this.atlasRoot.add(model);
    this.atlasRoot.rotation.set(0, Math.PI, 0);
    this.atlasRoot.scale.setScalar(TARGET_RADIUS / radius);
    this.atlasRoot.position.set(0, 0.08, 0);
    this.root.updateMatrixWorld(true);

    model.traverse((object) => {
      if (!object.isMesh) return;
      const metadata = atlasMetadata(object, model);
      if (!ANATOMY_CATEGORIES.has(metadata.bx_cat)) {
        object.visible = false;
        return;
      }
      this._registerAtlasMesh(object, metadata);
    });

    this._updateAnnotationAnchors();
    this.displayProgress = this.progress;
    this._applyProgress(1 / 60, true);
    this._setStatus({
      state: 'ready',
      selectableCount: this.selectables.length,
      atlasCount,
    });
  }

  _registerAtlasMesh(mesh, metadata) {
    const id = Number(metadata.bx_id);
    const color = new THREE.Color(brainColor(metadata, this.colorMode));
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: metadata.bx_cat === 'ventricles' ? 0.38 : 0.72,
      metalness: 0,
      emissive: color,
      emissiveIntensity: 0.025,
      transparent: true,
      opacity: 1,
      depthWrite: true,
      side: THREE.FrontSide,
    });

    mesh.material = material;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData = {
      ...mesh.userData,
      ...metadata,
      atlasMetadata: { ...metadata },
      atlasId: id,
      baseColor: color.clone(),
      currentOpacity: 1,
      selected: false,
      hovered: false,
    };
    this.selectables.push(mesh);
    this.meshByAtlasId.set(id, mesh);
    if (metadata.bx_cat === 'cortex') this.cortical.push(mesh);
    if (DEEP_CATEGORIES.has(metadata.bx_cat)) this.deep.push(mesh);
    if (metadata.bx_side === 'left') this.hemispheres.left.push(mesh);
    if (metadata.bx_side === 'right') this.hemispheres.right.push(mesh);
  }

  _bindPicking() {
    const canvas = this.viewer?.renderer?.domElement;
    if (!canvas) return;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    let down = null;

    this._pointerDown = (event) => {
      down = [event.clientX, event.clientY];
      this._setHovered(null);
    };
    this._pointerMove = (event) => {
      if (event.buttons) return;
      const hit = this._pick(event);
      this._setHovered(hit?.object ?? null);
      canvas.style.cursor = hit ? 'pointer' : 'grab';
    };
    this._pointerUp = (event) => {
      if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 7) {
        down = null;
        return;
      }
      down = null;
      const hit = this._pick(event);
      if (hit) this.selectStructure(hit.object.userData.atlasId);
      else this.clearSelection();
    };
    this._pointerLeave = () => this._setHovered(null);
    canvas.addEventListener('pointerdown', this._pointerDown);
    canvas.addEventListener('pointermove', this._pointerMove);
    canvas.addEventListener('pointerup', this._pointerUp);
    canvas.addEventListener('pointerleave', this._pointerLeave);
    canvas.style.cursor = 'grab';
  }

  _pick(event) {
    const canvas = this.viewer?.renderer?.domElement;
    if (!canvas || !this.selectables.length) return null;
    const rect = canvas.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointer, this.viewer.camera);
    const candidates = this.selectables.filter(
      (mesh) => mesh.visible && mesh.userData.currentOpacity > 0.14
    );
    return this.raycaster.intersectObjects(candidates, false)[0] ?? null;
  }

  _setHovered(mesh) {
    if (mesh === this.hoveredMesh) return;
    if (this.hoveredMesh) {
      this.hoveredMesh.userData.hovered = false;
      this._refreshHighlight(this.hoveredMesh);
    }
    this.hoveredMesh = mesh;
    if (mesh) {
      mesh.userData.hovered = true;
      this._refreshHighlight(mesh);
    }
    const hovered = mesh ? this._structureInfo(mesh) : null;
    for (const listener of this.hoverListeners) listener(hovered);
  }

  _refreshHighlight(mesh) {
    const selected = mesh.userData.selected;
    const hovered = mesh.userData.hovered;
    mesh.material.emissive.copy(selected || hovered ? new THREE.Color('#ffffff') : mesh.userData.baseColor);
    mesh.material.emissiveIntensity = selected ? 0.32 : hovered ? 0.16 : 0.025;
  }

  selectStructure(id) {
    const mesh = this.meshByAtlasId.get(Number(id));
    if (!mesh) return false;
    if (this.selectedMesh && this.selectedMesh !== mesh) {
      this.selectedMesh.userData.selected = false;
      this._refreshHighlight(this.selectedMesh);
    }
    this.selectedMesh = mesh;
    mesh.userData.selected = true;
    this._refreshHighlight(mesh);
    this.selection = this._structureInfo(mesh);
    for (const listener of this.listeners) listener(this.selection);
    return true;
  }

  _structureInfo(mesh) {
    return {
      ...brainStructureInfo(mesh.userData.atlasMetadata),
      color: `#${mesh.material.color.getHexString()}`,
      colorMode: this.colorMode,
    };
  }

  /** Resolve old coarse ids to a real, named mesh rather than a proxy shape. */
  selectRegion(id) {
    const alias = BRAIN_REGIONS[id];
    if (!alias) return this.selectStructure(id);
    const mesh = this.selectables.find((candidate) => {
      const metadata = candidate.userData.atlasMetadata;
      return (!alias.label || metadata.bx_label === alias.label) &&
        (!alias.side || metadata.bx_side === alias.side) &&
        (!alias.category || metadata.bx_cat === alias.category);
    });
    return mesh ? this.selectStructure(mesh.userData.atlasId) : false;
  }

  clearSelection() {
    if (!this.selectedMesh && !this.selection) return;
    if (this.selectedMesh) {
      this.selectedMesh.userData.selected = false;
      this._refreshHighlight(this.selectedMesh);
    }
    this.selectedMesh = null;
    this.selection = null;
    for (const listener of this.listeners) listener(null);
  }

  getAnatomySelection() { return this.selection; }

  getAnatomyHover() {
    return this.hoveredMesh ? this._structureInfo(this.hoveredMesh) : null;
  }

  onAnatomySelection(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onAnatomyHover(listener) {
    this.hoverListeners.add(listener);
    return () => this.hoverListeners.delete(listener);
  }

  getAnatomyStatus() { return { ...this.status }; }

  onAnatomyStatus(listener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  _setStatus(status) {
    this.status = status;
    for (const listener of this.statusListeners) listener({ ...status });
  }

  getAnatomyViews() {
    return VIEW_SPECS.map(({ id, label, labelJa }) => ({ id, label, labelJa }));
  }

  getAnatomyView(id) {
    const view = VIEW_SPECS.find((candidate) => candidate.id === id);
    return view ? clonePose(view) : null;
  }

  setAnatomyView(id) {
    const view = VIEW_SPECS.find((candidate) => candidate.id === id);
    if (!view) return false;
    this.activeView = id;
    this.medialSide = view.medialSide ?? null;
    this._applyProgress(1 / 60, true);
    return true;
  }

  getAnatomyColorModes() {
    return BRAIN_COLOR_MODES.map((mode) => ({ ...mode }));
  }

  getAnatomyColorMode() { return this.colorMode; }

  setAnatomyColorMode(id) {
    if (!BRAIN_COLOR_MODES.some((mode) => mode.id === id) || id === this.colorMode) return false;
    this.colorMode = id;
    for (const mesh of this.selectables) {
      const color = new THREE.Color(brainColor(mesh.userData.atlasMetadata, id));
      mesh.userData.baseColor.copy(color);
      mesh.material.color.copy(color);
      this._refreshHighlight(mesh);
    }
    if (this.selectedMesh) {
      this.selection = this._structureInfo(this.selectedMesh);
      for (const listener of this.listeners) listener(this.selection);
    }
    if (this.hoveredMesh) {
      const hovered = this._structureInfo(this.hoveredMesh);
      for (const listener of this.hoverListeners) listener(hovered);
    }
    return true;
  }

  setProgress(value) { this.progress = clamp(value); }

  update(dt) {
    if (!this.selectables.length) return;
    this.displayProgress = damp(this.displayProgress, this.progress, 8, dt);
    this._applyProgress(dt, false);
  }

  _applyProgress(dt, snap) {
    const oneHemisphere = smoothstep(0.18, 0.42, this.displayProgress);
    const deepReveal = smoothstep(0.55, 0.78, this.displayProgress);
    for (const mesh of this.selectables) {
      const target = targetOpacity(
        mesh.userData.atlasMetadata,
        oneHemisphere,
        deepReveal,
        this.medialSide
      );
      const opacity = snap ? target : damp(mesh.userData.currentOpacity, target, 10, dt);
      mesh.userData.currentOpacity = opacity;
      mesh.material.opacity = opacity;
      mesh.material.depthWrite = opacity > 0.94;
      mesh.visible = opacity > 0.012;
    }
  }

  _updateAnnotationAnchors() {
    this.root.updateMatrixWorld(true);
    for (const [anchor, spec] of Object.entries(ANCHOR_SPECS)) {
      const mesh = this.selectables.find((candidate) => {
        const metadata = candidate.userData.atlasMetadata;
        return metadata.bx_label === spec.label && metadata.bx_side === spec.side;
      });
      if (!mesh) continue;
      const box = new THREE.Box3().setFromObject(mesh);
      if (!box.isEmpty()) box.getCenter(this.annotationAnchors[anchor]);
    }
  }

  getAnnotations() {
    return BRAIN_ANATOMY_META.annotations.map((item) => ({
      ...item,
      position: this.annotationAnchors[item.anchor],
    }));
  }

  dispose() {
    this.disposed = true;
    const canvas = this.viewer?.renderer?.domElement;
    canvas?.removeEventListener('pointerdown', this._pointerDown);
    canvas?.removeEventListener('pointermove', this._pointerMove);
    canvas?.removeEventListener('pointerup', this._pointerUp);
    canvas?.removeEventListener('pointerleave', this._pointerLeave);
    this.listeners.clear();
    this.hoverListeners.clear();
    this.statusListeners.clear();
    disposeObject(this.root);
  }
}

function targetOpacity(metadata, oneHemisphere, deepReveal, medialSide = null) {
  const category = metadata.bx_cat;
  const label = metadata.bx_label;
  if (
    medialSide &&
    (metadata.bx_side === 'left' || metadata.bx_side === 'right') &&
    metadata.bx_side !== medialSide
  ) return 0;
  if (category === 'cerebellum' || category === 'brainstem') return 1;
  if (category === 'cortex') {
    if (label === 'Hippocampus') return 0.03 + 0.97 * deepReveal;
    if (metadata.bx_region === 'Insula') return 0.04 + 0.96 * Math.max(oneHemisphere, deepReveal);

    let surfaceOpacity = 1;
    if (!medialSide && metadata.bx_side === 'right') surfaceOpacity = 1 - 0.985 * oneHemisphere;
    else if (!medialSide && metadata.bx_side === 'left' && LEFT_OPERCULUM.has(label)) {
      surfaceOpacity = 1 - 0.93 * oneHemisphere;
    }
    const deepGhost = metadata.bx_side === 'right' ? 0.015 : 0.075;
    return surfaceOpacity + (deepGhost - surfaceOpacity) * deepReveal;
  }
  // The hemispheric white-matter meshes are enclosing masses. Leaving either
  // opaque would simply replace the cortical shell with another shell and hide
  // the basal ganglia again; named commissures and bundles can remain solid.
  if (category === 'white_matter') {
    return (label === 'White matter of telencephalon' ? 0.035 : 0.92) * deepReveal;
  }
  if (category === 'ventricles') return 0.78 * deepReveal;
  if (category === 'deep_grey' || category === 'diencephalon') return deepReveal;
  return 0;
}

function atlasMetadata(mesh, stopAt) {
  let object = mesh;
  while (object) {
    if (object.userData?.bx_cat != null) return object.userData;
    if (object === stopAt) break;
    object = object.parent;
  }
  return mesh.userData ?? {};
}

function clonePose(view) {
  return { position: view.position.clone(), target: view.target.clone() };
}

async function loadAtlas() {
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_URL);
  draco.setDecoderConfig({ type: 'wasm' });
  draco.preload();
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  try {
    return await loader.loadAsync(ATLAS_URL);
  } finally {
    draco.dispose();
  }
}
