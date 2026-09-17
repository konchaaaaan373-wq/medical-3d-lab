import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { buildAnatomyTree } from '../../../../app/anatomyContract.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { createTapTracker } from '../../../shared/anatomy/tapGesture.js';
import { clamp, damp, smoothstep } from '../../../../utils/math.js';
import {
  BRAIN_ANATOMICAL_PALETTE,
  BRAIN_ANATOMY_META,
  BRAIN_COLOR_MODES,
  BRAIN_PALETTE,
  BRAIN_REGIONS,
  brainColor,
  brainStructureInfo,
} from '../../../../data/brainAnatomy.js';

const BASE_URL = import.meta.env?.BASE_URL ?? './';
const ATLAS_URL = `${BASE_URL}assets/brain/brain.glb`;
const DRACO_URL = `${BASE_URL}assets/brain/draco/`;
const TARGET_RADIUS = 2.08;
/** Below this a mesh is a ghost the reader is looking *through*, not at. */
const DRAWN_OPACITY = 0.14;
const HIGHLIGHT_COLOR = new THREE.Color('#ffffff');

const COLOUR_MATERIAL = {
  default: { roughness: 0.72, emissiveIntensity: 0.025 },
  ventricles: { roughness: 0.38, emissiveIntensity: 0.025 },
};

const ANATOMICAL_MATERIAL = {
  cortex: { roughness: 0.82, emissiveIntensity: 0.004 },
  deep_grey: { roughness: 0.78, emissiveIntensity: 0.004 },
  diencephalon: { roughness: 0.78, emissiveIntensity: 0.004 },
  white_matter: { roughness: 0.86, emissiveIntensity: 0.003 },
  ventricles: { roughness: 0.42, emissiveIntensity: 0.01 },
  cerebellum: { roughness: 0.8, emissiveIntensity: 0.004 },
  brainstem: { roughness: 0.76, emissiveIntensity: 0.004 },
};

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
    id: 'posterior', label: 'Posterior', labelJa: '後面',
    position: new THREE.Vector3(-0.25, 0.23, 5.35), target: new THREE.Vector3(0, -0.35, 0),
  },
  {
    id: 'superior', label: 'Superior', labelJa: '上面',
    position: new THREE.Vector3(2.8, 5.45, 1.2), target: new THREE.Vector3(0, 0.08, 0),
  },
  // Looking up at the base. Straight below would put the view direction along
  // the camera's own up vector, where there is no roll to derive and the model
  // lands at whatever angle the arithmetic falls out at; tilted forward instead,
  // in the midline plane, the up vector still resolves and the midline stays
  // vertical on screen — which is what makes left and right readable here.
  {
    id: 'inferior', label: 'Inferior', labelJa: '下面',
    position: new THREE.Vector3(0, -5.05, -2.05), target: new THREE.Vector3(0, -0.45, 0),
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
    /**
     * Structure id → the meshes that make it up.
     *
     * A list, not a mesh, because the atlas splits several named structures
     * across more than one mesh — the middle temporal gyrus arrives as two —
     * while giving every piece the same `bx_id`. Keyed one-to-one, the second
     * piece overwrote the first, and clicking the piece that lost highlighted
     * the piece that won: the reader clicked one part of a gyrus and a
     * different part lit up. The id is the *structure*; the meshes are how it
     * is drawn.
     */
    this.meshesByAtlasId = new Map();
    this.listeners = new Set();
    this.hoverListeners = new Set();
    this.statusListeners = new Set();
    this.isolationListeners = new Set();

    // A page can stop mattering in two ways, and only one of them is a
    // disposal. `pagehide` is the other: the reader followed a link, the
    // document is being torn down, and the atlas fetch it started dies with
    // it. Nothing here is left to consume the model — the same fact `disposed`
    // records for a scene the application closed itself.
    this.pageLeaving = false;
    this._pageHide = () => {
      this.pageLeaving = true;
    };
    if (typeof window !== 'undefined') window.addEventListener('pagehide', this._pageHide);
    this.colorMode = 'detail';
    this.activeView = VIEW_SPECS[0].id;
    this.medialSide = null;
    this.progress = 0;
    this.displayProgress = 0;
    this.selection = null;
    this.selectedMeshes = [];
    this.hoveredMeshes = [];
    /** The one structure on screen, or null for the whole model. */
    this.isolatedId = null;
    /**
     * Structures the reader has hidden by hand.
     *
     * A different thing from the anatomical layer and from isolation, and kept
     * separately for that reason: the layer says what this depth of the model
     * shows, isolation is a temporary "only this", and this is the reader
     * saying "not that one" and expecting it to stay said through a colour
     * change, a resize and a trip to another tab.
     */
    this.manualHidden = new Set();
    /**
     * Bumped whenever the hidden set changes.
     *
     * The label-occlusion answer is cached against everything that can change
     * it — where the camera is, the layer, the medial side, what is isolated.
     * Hiding a structure changes what is drawn without touching any of those,
     * so without this a label stayed hidden behind something that was no longer
     * on screen.
     */
    this.hiddenVersion = 0;
    this.visibilityListeners = new Set();
    /** The display state a reveal moved away from, so it can be moved back. */
    this.displayBeforeReveal = null;
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
    /** anchor → the structure it names and the meshes that draw it. */
    this.annotationTargets = {};
    this._annotationRay = new THREE.Raycaster();
    this._annotationDirection = new THREE.Vector3();
    /** Last answer per anchor, and the state it was computed for. */
    this._annotationSight = new Map();
    /** Anchor points for structures that are not authored landmarks. */
    this.structureAnchors = new Map();
    /**
     * The point a tap actually hit, for the structure it selected.
     *
     * That point is on the visible surface by construction — the ray that
     * produced it stopped there — which a structure's precomputed outward
     * vertex is not always: a sulcus's outermost point can sit behind the
     * gyri folded over it (F-40). Selecting the same structure any other way
     * (keyboard, a tour, a test calling `selectStructure` directly) leaves
     * this unset, and `_visibleAnchorFor` falls back to searching the
     * structure's own candidates for one the current camera can see.
     */
    this._lastPick = null;
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
      // A scene disposed while its atlas was still in flight cancelled this
      // fetch itself. The success path above already knows that and drops the
      // model on the floor; reporting the failure is the same case in the
      // other branch, and the abort is not a defect but the disposal arriving
      // first. Left in, it is worse than noise: leaving the landing page while
      // the hero is fetching printed a console error onto the *next* page,
      // because the rejection is delivered as the old document goes away.
      //
      // Disposal was only half of it. A hash route change disposes the scene
      // and this guard held; following a link to a different document does
      // not, and the cancelled fetch was reported as a failure of the atlas —
      // `TypeError: Failed to fetch` in Chromium, `Load failed` in WebKit,
      // which is also why it read as a WebKit defect when it is neither
      // WebKit's nor a defect. `pageLeaving` closes that half.
      if (this.disposed || this.pageLeaving) return this.root;
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

    // A second atlas replaces the first, and everything that pointed into the
    // old one is now pointing at meshes that have been thrown away. Left alone,
    // `getAnatomySelection()` keeps answering with a structure nobody can see
    // and `setAnatomyColorMode` reaches into a disposed material. Clearing here
    // — before the new meshes exist — is what makes "attach again" a
    // transition rather than an accumulation.
    //
    // And it has to be announced. Clearing silently fixed the getters and left
    // the panels showing what they had last been told: the card kept naming a
    // structure from the discarded atlas, and a row in the tree stayed marked
    // selected. A surface that only repaints on an event is not wrong to do so
    // — the event is what was missing.
    this._resetInteractionState({ notify: true });

    this.atlasRoot.clear();
    this.selectables.length = 0;
    this.cortical.length = 0;
    this.deep.length = 0;
    this.hemispheres.left.length = 0;
    this.hemispheres.right.length = 0;
    this.meshesByAtlasId.clear();

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
      // What a reader can select is a structure, and several of them are drawn
      // from more than one mesh. Counting meshes overstated the atlas by the
      // number of structures that happen to be split.
      selectableCount: this.meshesByAtlasId.size,
      meshCount: this.selectables.length,
      atlasCount,
    });
  }

  _registerAtlasMesh(mesh, metadata) {
    const id = Number(metadata.bx_id);
    const color = new THREE.Color(brainColor(metadata, this.colorMode));
    const materialStyle = anatomyMaterialStyle(metadata, this.colorMode);
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: materialStyle.roughness,
      metalness: 0,
      emissive: color,
      emissiveIntensity: materialStyle.emissiveIntensity,
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
      idleEmissiveIntensity: materialStyle.emissiveIntensity,
      currentOpacity: 1,
      selected: false,
      hovered: false,
    };
    this.selectables.push(mesh);
    const pieces = this.meshesByAtlasId.get(id);
    if (pieces) pieces.push(mesh);
    else this.meshesByAtlasId.set(id, [mesh]);
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
    // See `tapGesture.js`: a tap is a release near the press *and* a pointer
    // that did not travel in between. Displacement alone read the out-and-back
    // drag that turns the model as standing still, which on a touch screen is
    // how the model is turned.
    const tap = createTapTracker();

    this._pointerDown = (event) => {
      tap.begin(event.clientX, event.clientY);
      this._setHovered(null);
    };
    this._pointerMove = (event) => {
      tap.move(event.clientX, event.clientY);
      if (event.buttons) return;
      const hit = this._pick(event);
      this._setHovered(hit?.object ?? null);
      canvas.style.cursor = hit ? 'pointer' : 'grab';
    };
    this._pointerUp = (event) => {
      if (!tap.end(event.clientX, event.clientY)) return;
      const hit = this._pick(event);
      if (hit) {
        // Recorded before `selectStructure` so the label it asks for is
        // already answerable from the point the reader actually touched.
        this._lastPick = { structureId: hit.object.userData.atlasId, point: hit.point.clone() };
        this.selectStructure(hit.object.userData.atlasId);
      } else {
        this.clearSelection();
      }
    };
    // The press ends here too. A drag that wanders off the canvas is released
    // where the canvas never hears it, so without this the press stays open and
    // the next release it does hear — from a press that began somewhere else
    // entirely — is measured against a point the reader left long ago. Nothing
    // is lost by closing it: a tap does not leave the canvas.
    this._pointerLeave = () => {
      tap.cancel();
      this._setHovered(null);
    };
    // The browser can take a gesture away mid-press — a pinch, or a swipe the
    // page claims under `touch-action` — and then there is no `pointerup` at
    // all. Without this the press stays open, and the next release the canvas
    // sees without a press of its own is measured against a point the reader
    // touched some time ago.
    this._pointerCancel = () => {
      tap.cancel();
      this._setHovered(null);
    };
    canvas.addEventListener('pointerdown', this._pointerDown);
    canvas.addEventListener('pointermove', this._pointerMove);
    canvas.addEventListener('pointerup', this._pointerUp);
    canvas.addEventListener('pointerleave', this._pointerLeave);
    canvas.addEventListener('pointercancel', this._pointerCancel);
    canvas.style.cursor = 'grab';
  }

  /**
   * Select whatever is drawn at one point of the canvas.
   *
   * The pointer path is not the only way a reader arrives at a structure. A
   * keyboard has no pointer at all, so the surface that asks "what is at the
   * middle of the frame?" has to exist as a method rather than only as a
   * response to a click — otherwise naming a structure is something only a
   * mouse or a finger can do, and the model names nothing for anybody else.
   *
   * Coordinates are CSS pixels from the canvas's top-left corner, which is what
   * a caller measuring its own viewport already has. A point with nothing drawn
   * under it clears the selection, exactly as clicking the background does.
   *
   * @param {number} x
   * @param {number} y
   * @returns {boolean} whether a structure was selected
   */
  selectAtCanvasPoint(x, y) {
    const canvas = this.viewer?.renderer?.domElement;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const hit = this._pick({ clientX: rect.left + x, clientY: rect.top + y });
    if (!hit) {
      this.clearSelection();
      return false;
    }
    this._lastPick = { structureId: hit.object.userData.atlasId, point: hit.point.clone() };
    return this.selectStructure(hit.object.userData.atlasId);
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
    return this.raycaster.intersectObjects(this._drawnMeshes(), false)[0] ?? null;
  }

  /**
   * The meshes a ray is allowed to see.
   *
   * Visibility is not a hint here, it is the rule: a ray does not know a mesh
   * is hidden, so a structure faded out by the anatomical layer — or by
   * isolation, or by being the far hemisphere of a medial view — must be taken
   * out of the candidates rather than merely being hard to hit. Picking
   * something the reader cannot see is the one selection failure they have no
   * way to understand, and pointing a *label* at it is the same mistake with
   * the answer written on it.
   */
  _drawnMeshes() {
    return this.selectables.filter((mesh) => mesh.visible && mesh.userData.currentOpacity > DRAWN_OPACITY);
  }

  /**
   * Preview a structure. Every mesh it is drawn from lights up, so hovering one
   * piece of a split gyrus shows the reader the gyrus rather than the piece.
   *
   * @param {import('three').Mesh|null} mesh the mesh under the pointer
   */
  _setHovered(mesh) {
    const meshes = mesh ? this._meshesFor(mesh.userData.atlasId) : [];
    if (meshes[0] === this.hoveredMeshes[0] && meshes.length === this.hoveredMeshes.length) return;
    for (const previous of this.hoveredMeshes) {
      if (meshes.includes(previous)) continue;
      previous.userData.hovered = false;
      this._refreshHighlight(previous);
    }
    this.hoveredMeshes = meshes;
    for (const next of meshes) {
      next.userData.hovered = true;
      this._refreshHighlight(next);
    }
    const hovered = meshes.length ? this._structureInfo(meshes[0]) : null;
    for (const listener of this.hoverListeners) listener(hovered);
  }

  _refreshHighlight(mesh) {
    const selected = mesh.userData.selected;
    const hovered = mesh.userData.hovered;
    mesh.material.emissive.copy(selected || hovered ? HIGHLIGHT_COLOR : mesh.userData.baseColor);
    mesh.material.emissiveIntensity = selected
      ? 0.32
      : hovered
        ? 0.16
        : mesh.userData.idleEmissiveIntensity;
  }

  /**
   * Select a structure by its atlas id — every mesh it is drawn from.
   *
   * @param {number|string} id
   */
  selectStructure(id) {
    const meshes = this._meshesFor(id);
    if (!meshes.length) return false;
    for (const mesh of this.selectedMeshes) {
      if (meshes.includes(mesh)) continue;
      mesh.userData.selected = false;
      this._refreshHighlight(mesh);
    }
    this.selectedMeshes = meshes;
    for (const mesh of meshes) {
      mesh.userData.selected = true;
      this._refreshHighlight(mesh);
    }
    this.selection = this._structureInfo(meshes[0]);
    for (const listener of this.listeners) listener(this.selection);
    return true;
  }

  /**
   * The meshes for an id, or an empty list.
   *
   * `Number(id)` is what makes a group node fail rather than resolve to
   * something approximate: `Number('group:Left cerebral hemisphere')` is `NaN`,
   * which is a key nothing is stored under.
   *
   * @param {number|string} id
   */
  _meshesFor(id) {
    return this.meshesByAtlasId.get(Number(id)) ?? [];
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
    this._lastPick = null;
    if (!this.selectedMeshes.length && !this.selection) return;
    for (const mesh of this.selectedMeshes) {
      mesh.userData.selected = false;
      this._refreshHighlight(mesh);
    }
    this.selectedMeshes = [];
    this.selection = null;
    for (const listener of this.listeners) listener(null);
  }

  /**
   * Drop every pointer into the current meshes.
   *
   * `notify` tells the surfaces. It is off in `dispose()`, where the listeners
   * have already been let go and there is nobody left to tell, and on for a
   * re-attach, where there very much is.
   *
   * @param {{notify?: boolean}} [options]
   */
  _resetInteractionState({ notify = false } = {}) {
    const had = Boolean(this.selection) || this.hoveredMeshes.length > 0 || this.isolatedId != null;
    for (const mesh of this.selectedMeshes) mesh.userData.selected = false;
    for (const mesh of this.hoveredMeshes) mesh.userData.hovered = false;
    this.selectedMeshes = [];
    this.hoveredMeshes = [];
    this.selection = null;
    this.isolatedId = null;
    this._lastPick = null;
    const hadHidden = this.manualHidden.size > 0;
    this.manualHidden.clear();
    this.hiddenVersion += 1;
    this.displayBeforeReveal = null;
    if (!notify || !(had || hadHidden)) return;
    if (hadHidden) this._emitVisibility();
    for (const listener of this.listeners) listener(null);
    for (const listener of this.hoverListeners) listener(null);
    this._emitIsolation();
  }

  getAnatomySelection() { return this.selection; }

  /**
   * The atlas as a tree of named parts, leaves carrying the same structure ids
   * `selectStructure()` takes and `getAnatomySelection()` reports.
   *
   * Built from each structure's own hierarchy rather than from a hand-written
   * outline, so the tree cannot come to disagree with the model about where a
   * part sits. Rebuilt on demand, which is cheap next to the atlas itself and
   * means a re-attached model never leaves a stale tree behind.
   */
  getAnatomyTree() {
    // One leaf per *structure*, in the order the atlas declares it. A structure
    // drawn from several meshes is one part of the anatomy and one row here;
    // mapping over `selectables` would list it once per piece, with the same id
    // on each — a tree that says there are two middle temporal gyri.
    return buildAnatomyTree(this.getAnatomyInventory());
  }

  /**
   * Every structure the atlas offers, as the adapter reads it.
   *
   * The same records the part tree is built from, handed over flat: one entry
   * per *structure*, carrying its id, both names, its side and the hierarchy
   * above it. It is what a search index is built over, and it exists so that
   * nothing outside this scene has to re-derive a structure's identity from a
   * label it read off a row — a name is how a reader finds a structure, and an
   * id is what the model is asked about.
   */
  getAnatomyInventory() {
    return [...this.meshesByAtlasId.values()].map((meshes) =>
      brainStructureInfo(meshes[0].userData.atlasMetadata)
    );
  }

  /**
   * Show one structure alone.
   *
   * Isolation is a display state, not a selection: it does not change what is
   * selected, and what is selected does not have to be what is isolated. The
   * opacity it forces goes through the same path as the anatomical-layer
   * slider, so `clearIsolation()` restores exactly the model the reader had —
   * the current layer, the current view's medial side, all of it — rather than
   * a remembered snapshot that can drift out of date.
   *
   * @param {number|string} id a structure id from the tree or a selection
   */
  isolateStructure(id) {
    const meshes = this._meshesFor(id);
    if (!meshes.length) return false;
    this.isolatedId = meshes[0].userData.atlasId;
    this._applyProgress(1 / 60, true);
    this._emitIsolation();
    return true;
  }

  /** Back to the whole model, at whatever layer and view it was already on. */
  clearIsolation() {
    if (this.isolatedId == null) return false;
    this.isolatedId = null;
    this._applyProgress(1 / 60, true);
    this._emitIsolation();
    return true;
  }

  getAnatomyIsolation() { return this.isolatedId; }

  /**
   * A visibility change the reader made themselves, applied and announced.
   *
   * Two things every hide and show has to do, and none of them did:
   *
   * 1. **Announce an isolation it ended.** Hiding the isolated structure drops
   *    the isolation — "only this one" and "not this one" cannot both be true —
   *    but only the visibility event was sent, so `AnatomyTreePanel`, which
   *    learns about isolation from `onAnatomyIsolation` and nowhere else, went
   *    on drawing the row as isolated while the scene reported none.
   * 2. **Throw away the reveal snapshot.** `displayBeforeReveal` is "the
   *    display the reveal moved away from", and "Back to how it was" restores
   *    `hidden` wholesale from it. Once the reader has hidden or shown
   *    something themselves, going back would take *their* change away rather
   *    than the reveal's — silently, since nothing says a snapshot is stale.
   *
   * @param {boolean} droppedIsolation
   */
  _visibilityChanged(droppedIsolation) {
    this.hiddenVersion += 1;
    this.displayBeforeReveal = null;
    this._applyProgress(1 / 60, true);
    this._emitVisibility();
    if (droppedIsolation) this._emitIsolation();
  }

  /**
   * Hide, or bring back, one structure — every mesh it is drawn from.
   *
   * Structure-wide because a structure is what a reader means: hiding the piece
   * they happened to click and leaving the other half of the same gyrus on
   * screen is the split-structure bug wearing a different hat.
   *
   * Hiding the structure that is currently isolated ends the isolation first.
   * "Only this one" and "not this one" cannot both be true, and leaving the
   * isolation on would show an empty model with no way to read why.
   *
   * @param {number|string} id
   * @param {boolean} hidden
   */
  setStructureHidden(id, hidden) {
    const meshes = this._meshesFor(id);
    if (!meshes.length) return false;
    const key = meshes[0].userData.atlasId;
    const had = this.manualHidden.has(key);
    if (had === Boolean(hidden)) return false;
    let droppedIsolation = false;
    if (hidden) {
      if (this.isolatedId === key) {
        this.isolatedId = null;
        droppedIsolation = true;
      }
      this.manualHidden.add(key);
    } else {
      this.manualHidden.delete(key);
    }
    this._visibilityChanged(droppedIsolation);
    return true;
  }

  /**
   * Hide or show many structures as one change.
   *
   * `setStructureHidden` applies the whole visibility pass and announces the
   * change on every call, which is right for one structure and wrong for a
   * group: hiding the brain's frontal lobe is forty-one of those, so forty-one passes over
   * every mesh in the atlas and forty-one repaints of the panel, for one thing the
   * reader asked for once.
   *
   * Same rules as the single setter, applied to each id — an isolation on a
   * structure being hidden is dropped, an id the model does not have is
   * skipped — and then one pass and one announcement at the end.
   *
   * @param {Iterable<string|number>} ids
   * @param {boolean} hidden
   * @returns {boolean} whether anything actually changed
   */
  setStructuresHidden(ids, hidden) {
    let changed = false;
    let droppedIsolation = false;
    for (const id of ids) {
      const meshes = this._meshesFor(id);
      if (!meshes.length) continue;
      const key = meshes[0].userData.atlasId;
      if (this.manualHidden.has(key) === Boolean(hidden)) continue;
      if (hidden) {
        if (this.isolatedId === key) {
          this.isolatedId = null;
          droppedIsolation = true;
        }
        this.manualHidden.add(key);
      } else {
        this.manualHidden.delete(key);
      }
      changed = true;
    }
    if (!changed) return false;
    this._visibilityChanged(droppedIsolation);
    return true;
  }

  /**
   * Bring back everything hidden by hand.
   *
   * The camera is not touched. "Show the ones I hid" and "look at the whole
   * model again" are two requests, and answering both when one was asked is how
   * a reader loses the view they had set up.
   */
  showAllHiddenStructures() {
    if (!this.manualHidden.size) return false;
    this.manualHidden.clear();
    // No isolation to drop: showing never ends one.
    this._visibilityChanged(false);
    return true;
  }

  /** The structures currently hidden by hand, as ids. */
  getAnatomyVisibility() {
    return { hidden: [...this.manualHidden] };
  }

  onAnatomyVisibility(listener) {
    this.visibilityListeners.add(listener);
    return () => this.visibilityListeners.delete(listener);
  }

  _emitVisibility() {
    const state = this.getAnatomyVisibility();
    for (const listener of this.visibilityListeners) listener({ hidden: [...state.hidden] });
  }

  /**
   * Whether the display, as it is currently *set*, shows this structure.
   *
   * Deliberately about the settings and not about the frame. Opacities ease
   * over about half a second, so a check on what is painted right now answers
   * "has the fade finished" — and a panel that asked that offered to reveal a
   * structure it had just revealed, then stopped offering it a moment later
   * with nothing to repaint it. What a reader is asking when they look at that
   * button is whether this structure is part of what the display is showing,
   * which is a question about the layer, the medial side, isolation and what
   * they hid, all of which are settled the instant they change.
   *
   * Hit-testing and label occlusion ask the other question — what is on screen
   * *now* — and use `_drawnMeshes()` for it. Both read the same threshold and
   * the same priority order.
   *
   * @param {number|string} id
   */
  isStructureVisible(id) {
    return this._meshesFor(id).some(
      (mesh) => this._targetOpacityFor(mesh, this.progress) > DRAWN_OPACITY
    );
  }

  /**
   * The box around one structure, for a camera that has been asked to go to it.
   *
   * Its own meshes only, drawn or not: "take me to it" is asked about
   * structures the reader cannot currently see at least as often as about ones
   * they can, and a camera that refuses to move because the subject is behind
   * something is not helping.
   *
   * @param {number|string} id
   */
  getStructureBounds(id) {
    const meshes = this._meshesFor(id);
    if (!meshes.length) return null;
    const box = new THREE.Box3();
    for (const mesh of meshes) box.expandByObject(mesh);
    if (box.isEmpty()) return null;
    const corners = [];
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
      }
    }
    return { centre: box.getCenter(new THREE.Vector3()), corners };
  }

  /**
   * Put the display into the state this structure can be seen in.
   *
   * Moving the camera to a structure buried under the cortex shows the reader
   * the cortex. What has to change is the *display*: the anatomical layer that
   * fades the shell, the medial view that turns the midline towards them, the
   * hand-hidden flag they set earlier and forgot. So this changes those, and
   * moves no anatomy whatsoever.
   *
   * The recipe is read off the structure's own metadata — the category the
   * atlas gave it, the region, the side, the preferred view the adapter already
   * publishes — not invented per structure and not guessed from a name. Where
   * the metadata says nothing, this says so: `{ok: false, reason}` rather than a
   * camera move that pretends to have worked, so a caller can offer isolation
   * instead of implying the reader is looking at something they are not.
   *
   * The display state from just before is kept, once, so `restoreDisplay()` can
   * put it back. Anything the reader changes afterwards drops it, because
   * "return to what you had" must not undo what they did next.
   *
   * **The anatomical layer is reported, not set.** The console's slider owns
   * that value and pushes it here; writing it from this side as well left the
   * model deep and the slider still reading 0 %, which is two answers to one
   * question. The `layer` in the result is what the caller must apply through
   * the control that owns it — `null` when the current layer already suffices.
   *
   * @param {number|string} id
   * @returns {{ok: boolean, reason?: string, changed?: string[], view?: string|null, layer?: number|null}}
   */
  revealStructure(id) {
    const meshes = this._meshesFor(id);
    if (!meshes.length) return { ok: false, reason: 'unknown-structure' };
    const metadata = meshes[0].userData.atlasMetadata ?? {};
    const key = meshes[0].userData.atlasId;
    const recipe = revealRecipe(metadata);
    if (!recipe && !this.manualHidden.has(key)) {
      return this.isStructureVisible(key)
        ? { ok: true, changed: [], view: this.activeView, layer: null }
        : { ok: false, reason: 'no-recipe' };
    }

    const before = this._displaySnapshot();
    const changed = [];
    if (this.manualHidden.delete(key)) {
      this.hiddenVersion += 1;
      changed.push('hidden');
    }
    let layer = null;
    if (recipe?.progress != null && this.progress < recipe.progress) {
      layer = recipe.progress;
      changed.push('layer');
    }
    const view = recipe?.view ?? (metadata.bx_side === 'right' ? 'right-lateral' : 'left-lateral');
    if (view && view !== this.activeView && this.setAnatomyView(view)) changed.push('view');
    // Isolation would hide the very context this is trying to show it in.
    if (this.isolatedId != null && this.isolatedId !== key) {
      this.isolatedId = null;
      changed.push('isolation');
    }
    this._applyProgress(1 / 60, true);
    if (changed.length) {
      this.displayBeforeReveal = before;
      if (changed.includes('hidden')) this._emitVisibility();
      this._emitIsolation();
    }
    return { ok: true, changed, view: this.activeView, layer };
  }

  /** Whether there is a display state to go back to. */
  canRestoreDisplay() { return this.displayBeforeReveal != null; }

  /**
   * Back to the display the last reveal moved away from.
   *
   * The layer comes back the same way it went: reported, for the control that
   * owns it to apply.
   *
   * @returns {{ok: boolean, layer?: number}}
   */
  restoreDisplay() {
    const before = this.displayBeforeReveal;
    if (!before) return { ok: false };
    this.displayBeforeReveal = null;
    this.isolatedId = before.isolatedId;
    this.manualHidden = new Set(before.hidden);
    this.hiddenVersion += 1;
    this.setAnatomyView(before.view);
    this._applyProgress(1 / 60, true);
    this._emitVisibility();
    this._emitIsolation();
    return { ok: true, layer: before.progress };
  }

  _displaySnapshot() {
    return {
      progress: this.progress,
      view: this.activeView,
      isolatedId: this.isolatedId,
      hidden: [...this.manualHidden],
    };
  }

  onAnatomyIsolation(listener) {
    this.isolationListeners.add(listener);
    return () => this.isolationListeners.delete(listener);
  }

  _emitIsolation() {
    for (const listener of this.isolationListeners) listener(this.isolatedId);
  }

  getAnatomyHover() {
    return this.hoveredMeshes.length ? this._structureInfo(this.hoveredMeshes[0]) : null;
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

  /** Shared inspection contract; the anatomy names are authored, not inferred. */
  getInspectionViews() { return this.getAnatomyViews(); }

  getAnatomyView(id) {
    const view = VIEW_SPECS.find((candidate) => candidate.id === id);
    return view ? clonePose(view) : null;
  }

  getInspectionView(id) { return this.getAnatomyView(id); }

  setAnatomyView(id) {
    const view = VIEW_SPECS.find((candidate) => candidate.id === id);
    if (!view) return false;
    this.activeView = id;
    this.medialSide = view.medialSide ?? null;
    this._applyProgress(1 / 60, true);
    return true;
  }

  setInspectionView(id) { return this.setAnatomyView(id); }

  getAnatomyColorModes() {
    return BRAIN_COLOR_MODES.map((mode) => ({ ...mode }));
  }

  getInspectionModes() {
    const previews = {
      detail: 'conic-gradient(from 30deg, #d9826b, #d8b35f, #54b6a4, #5f93c8, #9b78c8, #d9826b)',
      anatomical: 'radial-gradient(circle at 32% 27%, #ead7cf 0 13%, #c6aaa3 38%, #a4847e 72%, #705b58 100%)',
    };
    return BRAIN_COLOR_MODES.map((mode) => ({ ...mode, preview: previews[mode.id] }));
  }

  getAnatomyColorMode() { return this.colorMode; }

  getInspectionMode() { return this.getAnatomyColorMode(); }

  getAnatomyLegendPalette(id = this.colorMode) {
    return { ...(id === 'anatomical' ? BRAIN_ANATOMICAL_PALETTE : BRAIN_PALETTE) };
  }

  getInspectionLegendPalette(id = this.colorMode) { return this.getAnatomyLegendPalette(id); }

  setAnatomyColorMode(id) {
    if (!BRAIN_COLOR_MODES.some((mode) => mode.id === id) || id === this.colorMode) return false;
    this.colorMode = id;
    for (const mesh of this.selectables) {
      const color = new THREE.Color(brainColor(mesh.userData.atlasMetadata, id));
      const materialStyle = anatomyMaterialStyle(mesh.userData.atlasMetadata, id);
      mesh.userData.baseColor.copy(color);
      mesh.userData.idleEmissiveIntensity = materialStyle.emissiveIntensity;
      mesh.material.color.copy(color);
      mesh.material.roughness = materialStyle.roughness;
      this._refreshHighlight(mesh);
    }
    if (this.selectedMeshes.length) {
      this.selection = this._structureInfo(this.selectedMeshes[0]);
      for (const listener of this.listeners) listener(this.selection);
    }
    if (this.hoveredMeshes.length) {
      const hovered = this._structureInfo(this.hoveredMeshes[0]);
      for (const listener of this.hoverListeners) listener(hovered);
    }
    return true;
  }

  setInspectionMode(id) { return this.setAnatomyColorMode(id); }

  setProgress(value) { this.progress = clamp(value); }

  update(dt) {
    if (!this.selectables.length) return;
    this.displayProgress = damp(this.displayProgress, this.progress, 8, dt);
    this._applyProgress(dt, false);
  }

  /**
   * How opaque each mesh should be, in one place and in one order.
   *
   * The order is the whole of it, and it is why these three ideas can coexist:
   *
   *  1. **Isolation wins**, and is a temporary override — it shows the target's
   *     every mesh and hides the rest *without writing anything down*. Clearing
   *     it returns the model the reader had, hidden structures and layer
   *     included, rather than a model it remembered separately and could get
   *     wrong.
   *  2. **A structure the reader hid stays hidden**, over whatever the layer
   *     would otherwise show. They said not that one.
   *  3. **Otherwise the layer, the medial side and the rest decide**, exactly
   *     as they did before any of this existed.
   *
   * Selection and hover only ever add emphasis to a mesh that is being drawn,
   * which falls out of this rather than being another rule: `_refreshHighlight`
   * changes emissive, never opacity.
   */
  _applyProgress(dt, snap) {
    for (const mesh of this.selectables) {
      const target = this._targetOpacityFor(mesh, this.displayProgress);
      const opacity = snap ? target : damp(mesh.userData.currentOpacity, target, 10, dt);
      mesh.userData.currentOpacity = opacity;
      mesh.material.opacity = opacity;
      mesh.material.depthWrite = opacity > 0.94;
      mesh.visible = opacity > 0.012;
    }
  }

  /**
   * What one mesh's opacity should be at a given layer — the priority order
   * above, in one function, so nothing has to restate it.
   *
   * @param {import('three').Mesh} mesh
   * @param {number} progress the anatomical layer to answer for
   */
  _targetOpacityFor(mesh, progress) {
    const id = mesh.userData.atlasId;
    if (this.isolatedId != null) return id === this.isolatedId ? 1 : 0;
    if (this.manualHidden.has(id)) return 0;
    return targetOpacity(
      mesh.userData.atlasMetadata,
      smoothstep(0.18, 0.42, progress),
      smoothstep(0.55, 0.78, progress),
      this.medialSide
    );
  }

  _updateAnnotationAnchors() {
    this.root.updateMatrixWorld(true);
    this.annotationTargets = {};
    this._annotationSight.clear();
    this.structureAnchors.clear();
    for (const [anchor, spec] of Object.entries(ANCHOR_SPECS)) {
      const mesh = this.selectables.find((candidate) => {
        const metadata = candidate.userData.atlasMetadata;
        return metadata.bx_label === spec.label && metadata.bx_side === spec.side;
      });
      if (!mesh) continue;
      // The label names a structure, so it is tied to that structure's id and
      // to every mesh the structure is drawn from — not to a coordinate that
      // happens to be near it.
      const id = mesh.userData.atlasId;
      const meshes = this._meshesFor(id);
      this.annotationTargets[anchor] = { id, meshes };
      const point = outwardSurfacePoint(meshes, this.atlasRoot);
      if (point) this.annotationAnchors[anchor].copy(point);
    }
  }

  /**
   * Can the reader actually see the thing this label is pointing at?
   *
   * The labels are HTML over the canvas, so nothing about them is depth-tested:
   * a label for a left-hemisphere structure was drawn on the right hemisphere's
   * surface in the right lateral view, which reads as "this is where the
   * central sulcus is" and is a left/right error the product cannot afford.
   *
   * The question is answered the way a click is answered — cast the ray and see
   * what is in front — so a label agrees with the picker by construction, and
   * with everything that decides what is drawn: the anatomical layer, a medial
   * view's far hemisphere, isolation, any of it. It is deliberately **not** a
   * rule about which side the structure's name says it is on; a left structure
   * seen through a hemisphere that has been faded out is visible, and a left
   * structure behind an opaque one is not.
   *
   * A label that cannot be seen is hidden where it is, never moved somewhere
   * emptier: a leader line to a place the structure is not is the same lie.
   *
   * @param {string} anchor
   * @param {import('three').Camera} camera
   */
  isAnnotationVisible(anchor, camera) {
    const target = this.annotationTargets[anchor];
    if (!target) return false;
    return this._pointVisible(anchor, this.annotationAnchors[anchor], target.meshes, camera);
  }

  /**
   * Everything that can change whether a point is visible, as one string:
   * the camera pose and the display state that decides what is drawn.
   *
   * @param {import('three').Camera} camera
   */
  _sightPoseKey(camera) {
    camera.updateMatrixWorld();
    return `${camera.matrixWorld.elements.map((n) => n.toFixed(4)).join(',')}|` +
      `${this.isolatedId}|${this.medialSide}|${this.displayProgress.toFixed(3)}|${this.hiddenVersion}`;
  }

  /**
   * Is this point on this structure the first thing along the ray to it?
   *
   * @param {string} cacheKey anything stable that identifies the point
   * @param {import('three').Vector3} point
   * @param {import('three').Mesh[]} meshes the structure the point belongs to
   * @param {import('three').Camera} camera
   */
  _pointVisible(cacheKey, point, meshes, camera) {
    if (!point || !camera || !meshes?.length) return false;

    // Recomputing a raycast per label per frame is wasted while nothing moves,
    // and everything that can change the answer is in this key.
    const key = this._sightPoseKey(camera);
    const cached = this._annotationSight.get(cacheKey);
    if (cached?.key === key) return cached.visible;

    this._annotationDirection.copy(point).sub(camera.position);
    const distance = this._annotationDirection.length();
    let visible = false;
    if (distance > 0) {
      this._annotationRay.set(camera.position, this._annotationDirection.divideScalar(distance));
      const first = this._annotationRay.intersectObjects(this._drawnMeshes(), false)[0];
      // Its own structure has to be the first thing on the ray. Nothing there
      // at all means the structure is not being drawn — behind a medial view's
      // midline, under the cortex at layer 0, isolated away — which is also a
      // label with nothing to point at.
      visible = Boolean(first) && meshes.includes(first.object);
    }
    this._annotationSight.set(cacheKey, { key, visible });
    return visible;
  }

  /**
   * A label for any structure, on demand.
   *
   * The authored annotations name four landmarks. What a reader has actually
   * chosen is not one of them, and until now the only place the model said so
   * was a highlight — the name lived in the panel, off to one side of the thing
   * it names. This gives the selection and the hover a label of their own, on
   * the same terms as the landmarks: the structure's own names, an anchor on
   * its own outside, and the same occlusion test, so it disappears when the
   * structure does rather than floating over whatever is in front.
   *
   * The candidate list (every outward vertex, ranked and spread apart) is
   * computed once per structure and kept, because it is a property of the
   * geometry. Which candidate to anchor *this* label to is not: see
   * `_visibleAnchorFor`.
   *
   * @param {number|string} id
   */
  getStructureAnnotation(id) {
    const meshes = this._meshesFor(id);
    if (!meshes.length) return null;
    const structureId = meshes[0].userData.atlasId;
    const key = `structure:${structureId}`;
    let candidates = this.structureAnchors.get(key);
    if (!candidates) {
      candidates = rankedSurfacePoints(meshes, this.atlasRoot);
      if (!candidates.length) return null;
      this.structureAnchors.set(key, candidates);
    }
    // A clone: the candidates stay the structure's for the life of the scene
    // and `_lastPick` stays the reader's, while `reanchor` below moves *this*
    // label's point in place. The first version handed out the cache entry
    // itself, and one reanchor overwrote the best-ranked candidate for every
    // later selection of the structure.
    const point = this._visibleAnchorFor(structureId, candidates, meshes).clone();
    const sightKey = `${key}:${point.x.toFixed(3)},${point.y.toFixed(3)},${point.z.toFixed(3)}`;
    const info = brainStructureInfo(meshes[0].userData.atlasMetadata);
    /** The last camera pose `reanchor` searched from, so it searches once per pose. */
    let triedPose = null;
    return {
      id: key,
      structureId,
      text: info.name,
      sub: info.nameJa,
      position: point,
      isVisible: (camera) => this._pointVisible(sightKey, point, meshes, camera),
      /**
       * Whether the settings draw this structure at all.
       *
       * A different question from `isVisible`, and the label layer needs both.
       * "Behind something" flickers along an edge as the model turns and is
       * worth waiting out; "hidden" and "isolated away" do not flicker, and a
       * label that waits after one of those is a name left over a structure the
       * reader has just taken off the screen.
       */
      isDrawn: () => this.isStructureVisible(structureId),
      /**
       * Try a fresh candidate against the live camera, called by the label
       * layer only once this anchor has already failed `isVisible` — never
       * a per-frame search while the point still holds.
       *
       * A tap's own point is preferred for as long as the camera can see it
       * (`_visibleAnchorFor`), so a reader's own touch is left where it
       * landed until the model turns it out of view; then, like a selection
       * made from the parts tree, the keyboard or a tour, the structure's
       * ranked candidates are tried, and the tap point is taken back the
       * moment it can be seen again.
       *
       * Asked once per camera pose: a structure with nothing visible on it
       * at all — the far hemisphere on a medial view — stays occluded for
       * as many frames as the reader leaves it, and each of those frames
       * would otherwise pay for the whole candidate search again.
       *
       * Mutates `point` in place, which is the same object `position` above
       * was set to, so the label layer's own reference picks up the move
       * without anything here replacing the annotation. That keeps the scene
       * the one place that decides where the label is.
       *
       * @param {import('three').Camera} camera
       */
      reanchor: (camera) => {
        if (!camera) return false;
        const pose = this._sightPoseKey(camera);
        if (pose === triedPose) return false;
        triedPose = pose;
        const next = this._visibleAnchorFor(structureId, candidates, meshes);
        if (next.equals(point)) return false;
        point.copy(next);
        this._annotationSight.delete(sightKey);
        return true;
      },
    };
  }

  /**
   * The anchor a selection or hover label should sit on — a point that is
   * actually visible from here, when one exists (F-40).
   *
   * A tap already answers "is this point on the surface I can see?": the ray
   * that selected the structure stopped at this exact point, so it is used
   * verbatim for as long as the camera can still see it. Once the model has
   * turned it behind a neighbour — or for a selection that never had a tap
   * (the keyboard, a guided tour, a test calling `selectStructure` directly)
   * — the structure's own ranked candidates are tried in the order the
   * geometry favours them, and the first one the current camera can
   * actually see is used. A structure that is genuinely turned away (the far
   * side of a medial view, mid-fold on every candidate) has none; then the
   * tap point if there is one, else the best-ranked candidate, is returned
   * anyway — `isVisible` will correctly say "no", which is the case a label
   * should disappear for.
   *
   * With no camera to ask (a route opened on a structure before the viewer
   * exists) the same fallback applies unconditionally.
   *
   * Returns one of the objects it was given — callers that keep the point
   * clone it (`getStructureAnnotation`).
   *
   * @param {number} structureId
   * @param {import('three').Vector3[]} candidates ranked, furthest reach first
   * @param {import('three').Mesh[]} meshes
   */
  _visibleAnchorFor(structureId, candidates, meshes) {
    const tap = this._lastPick?.structureId === structureId ? this._lastPick.point : null;
    const camera = this.viewer?.camera;
    if (!camera) return tap ?? candidates[0];
    if (tap && this._rayVisible(tap, meshes, camera)) return tap;
    for (const candidate of candidates) {
      if (this._rayVisible(candidate, meshes, camera)) return candidate;
    }
    return tap ?? candidates[0];
  }

  /** Is this exact point, right now, the first thing a ray from the camera hits? */
  _rayVisible(point, meshes, camera) {
    camera.updateMatrixWorld();
    this._annotationDirection.copy(point).sub(camera.position);
    const distance = this._annotationDirection.length();
    if (!(distance > 0)) return false;
    this._annotationRay.set(camera.position, this._annotationDirection.divideScalar(distance));
    const first = this._annotationRay.intersectObjects(this._drawnMeshes(), false)[0];
    return Boolean(first) && meshes.includes(first.object);
  }

  /**
   * The box around what is actually on screen, for whatever is framing it.
   *
   * The subject is not the model: at layer 0 the deep structures are not drawn,
   * on a medial view half the cortex is not, and while one structure is
   * isolated the subject is that structure. Framing to the whole atlas would
   * pull the camera back for meshes nobody can see — and framing to a bounding
   * sphere would waste a fifth of the frame on the corners of a shape that is
   * not a sphere, which is why this is a box and its corners.
   *
   * Returns `null` when nothing is drawn yet, which a caller must treat as "do
   * not move the camera" rather than as an empty box at the origin.
   */
  getSubjectBounds() {
    const drawn = this._drawnMeshes();
    if (!drawn.length) return null;
    const box = new THREE.Box3();
    for (const mesh of drawn) box.expandByObject(mesh);
    if (box.isEmpty()) return null;
    const corners = [];
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
      }
    }
    return { centre: box.getCenter(new THREE.Vector3()), corners };
  }

  getAnnotations() {
    return BRAIN_ANATOMY_META.annotations.map((item) => ({
      ...item,
      position: this.annotationAnchors[item.anchor],
      /** The structure this label names, for anything that has to agree with it. */
      structureId: this.annotationTargets[item.anchor]?.id ?? null,
      isVisible: (camera) => this.isAnnotationVisible(item.anchor, camera),
    }));
  }

  dispose() {
    this.disposed = true;
    if (typeof window !== 'undefined') window.removeEventListener('pagehide', this._pageHide);
    const canvas = this.viewer?.renderer?.domElement;
    canvas?.removeEventListener('pointerdown', this._pointerDown);
    canvas?.removeEventListener('pointermove', this._pointerMove);
    canvas?.removeEventListener('pointerup', this._pointerUp);
    canvas?.removeEventListener('pointerleave', this._pointerLeave);
    canvas?.removeEventListener('pointercancel', this._pointerCancel);
    this.listeners.clear();
    this.hoverListeners.clear();
    this.statusListeners.clear();
    this.isolationListeners.clear();
    this.visibilityListeners.clear();
    this._resetInteractionState();
    disposeObject(this.root);
  }
}

/**
 * What the display has to be for a structure of this kind to be visible.
 *
 * Read off the metadata the atlas already carries and the rules
 * `targetOpacity` already applies — the layer thresholds are the same numbers,
 * not a second set that can drift from them. `null` means "nothing here knows",
 * which the caller reports rather than papers over.
 *
 * @param {object} metadata
 * @returns {{progress?: number, view?: string|null}|null}
 */
function revealRecipe(metadata) {
  const category = metadata.bx_cat;
  const side = metadata.bx_side;
  // The adapter already decides that a cingulate structure is a medial-surface
  // one; this uses that answer rather than making a second one.
  const preferred = brainStructureInfo(metadata).preferredView;
  if (preferred) return { progress: 0, view: preferred };
  if (DEEP_CATEGORIES.has(category)) {
    // Past the deep-reveal threshold `targetOpacity` uses, with room to spare.
    return { progress: 1, view: side === 'right' ? 'right-lateral' : 'left-lateral' };
  }
  if (category === 'cortex') {
    if (metadata.bx_label === 'Hippocampus' || metadata.bx_region === 'Insula') {
      return { progress: 1, view: side === 'right' ? 'right-lateral' : 'left-lateral' };
    }
    // A surface gyrus is visible at rest; it only needs the side turned to it.
    return { progress: 0, view: side === 'right' ? 'right-lateral' : 'left-lateral' };
  }
  if (category === 'cerebellum' || category === 'brainstem') {
    return { progress: 0, view: side === 'right' ? 'right-lateral' : 'left-lateral' };
  }
  return null;
}

function anatomyMaterialStyle(metadata, mode) {
  if (mode === 'anatomical') {
    return ANATOMICAL_MATERIAL[metadata.bx_cat] ?? ANATOMICAL_MATERIAL.deep_grey;
  }
  return metadata.bx_cat === 'ventricles' ? COLOUR_MATERIAL.ventricles : COLOUR_MATERIAL.default;
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
  // On a medial view the midline block is not depth the reader asked for: it is
  // the surface they are looking at. The corpus callosum, the fornix, the
  // thalamus and hypothalamus and the white matter behind them are what a
  // medial view of a hemisphere shows, and the layer slider was holding all of
  // it at zero — so at rest the medial view was a hollow cortical shell with a
  // hole where the callosum belongs, and, the material being front-side only,
  // the background showing through the far wall. Nothing here moves or
  // recolours anything; it decides which of the meshes already in the atlas are
  // present for the view being asked for.
  const midlineSolid = Boolean(medialSide);

  // The hemispheric white-matter meshes are enclosing masses. Leaving either
  // opaque *while the reader is asking for depth* would simply replace the
  // cortical shell with another shell and hide the basal ganglia again, so the
  // enclosing mass is solid at the medial surface and ghosts back out as the
  // layer is dragged in. Named commissures and bundles can remain solid.
  if (category === 'white_matter') {
    if (label === 'White matter of telencephalon') {
      return midlineSolid ? 1 - 0.965 * deepReveal : 0.035 * deepReveal;
    }
    return midlineSolid ? 1 : 0.92 * deepReveal;
  }
  // A ventricle is a cavity, not a surface: filling the medial view with one
  // would be inventing a wall. It stays on the slider in every view.
  if (category === 'ventricles') return 0.78 * deepReveal;
  if (category === 'deep_grey' || category === 'diencephalon') return midlineSolid ? 1 : deepReveal;
  return 0;
}

/**
 * Points on the outside of a structure, in world space, ranked best first.
 *
 * The bounding-box centre is the obvious anchor and is wrong for anything
 * folded. A sulcus is a thin sheet running down into the brain, and the centre
 * of the box around it is at the bottom of the sulcus — inside the gyri on
 * either side. A label pinned there is pinned to a point the reader cannot see,
 * and before the occlusion test existed it was simply drawn on top of the gyrus
 * in front, which is a label naming the wrong structure.
 *
 * So the top candidate is the structure's own outermost vertex: of every
 * vertex in every mesh the structure is drawn from, the one furthest along the
 * direction from the model's centre out to the structure. That is a point *on*
 * the structure, chosen from its geometry — not a position moved to suit the
 * screen, and not a landmark the source provides. It carries no anatomical
 * claim beyond "this is on the outside of this mesh".
 *
 * One such point is not always enough (F-40): for a sulcus, even the
 * outermost vertex can sit behind the gyri folded over it from a given
 * camera. So this returns several, ranked by the same reach and spread apart
 * by a fraction of the structure's own size — not the top few vertices
 * bunched at one corner of the mesh, which a single fold could hide all of at
 * once. `_visibleAnchorFor` tries them in order against the live camera.
 *
 * @param {import('three').Mesh[]} meshes every mesh the structure is drawn from
 * @param {import('three').Object3D} root the model, for its centre
 * @param {number} [max] how many candidates to keep
 */
function rankedSurfacePoints(meshes, root, max = 12) {
  if (!meshes?.length) return [];
  const box = new THREE.Box3();
  for (const mesh of meshes) box.expandByObject(mesh);
  if (box.isEmpty()) return [];
  const centre = box.getCenter(new THREE.Vector3());
  const modelCentre = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
  const outward = centre.clone().sub(modelCentre);
  // A structure sitting on the midline has no outward direction of its own;
  // its own box centre is as good an anchor as exists, and the only one.
  if (outward.lengthSq() < 1e-8) return [centre];
  outward.normalize();

  const vertex = new THREE.Vector3();
  const ranked = [];
  for (const mesh of meshes) {
    const position = mesh.geometry?.getAttribute?.('position');
    if (!position) continue;
    mesh.updateWorldMatrix(true, false);
    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      ranked.push({ point: vertex.clone(), reach: vertex.dot(outward) });
    }
  }
  if (!ranked.length) return [centre];
  ranked.sort((a, b) => b.reach - a.reach);

  const diagonal = box.min.distanceTo(box.max) || 1;
  const minSeparation = (diagonal * 0.06) ** 2;
  const points = [];
  for (const { point } of ranked) {
    if (points.some((kept) => kept.distanceToSquared(point) < minSeparation)) continue;
    points.push(point);
    if (points.length >= max) break;
  }
  return points;
}

/** The single best candidate — for callers that do not track a live camera. */
function outwardSurfacePoint(meshes, root) {
  return rankedSurfacePoints(meshes, root, 1)[0] ?? null;
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
