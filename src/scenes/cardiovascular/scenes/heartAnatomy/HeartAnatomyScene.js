import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildAnatomyTree } from '../../../../app/anatomyContract.js';
import { createStudioLights } from '../../../shared/lighting.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { damp } from '../../../../utils/math.js';
import {
  HEART_ANATOMY_META,
  HEART_AXES,
  HEART_COLOR_MODES,
  HEART_DEFAULT_HIDDEN,
  HEART_MISSING,
  HEART_PALETTE,
  HEART_PARTS,
  HEART_RECIPES,
  heartColor,
  heartMeshOwner,
  heartPartById,
  heartStructureInfo,
} from '../../../../data/heartAnatomy.js';

/**
 * How much of the usable band the organ itself should take.
 *
 * Lower than the shared default, and the reason is the vessels. The subject is
 * the organ — see `getSubjectBounds` — but the vessels are drawn, they leave it
 * in every direction, and at the shared 0.78 they were cut off flush with the
 * frame: the ascending aorta ran into the header and the venae cavae into the
 * bottom edge, so the first thing on screen was an organ pressed against four
 * edges rather than an organ in a chest.
 *
 * Measured from the pictures at 1280x720 with the panel docked: the organ still
 * carries the frame, and the roots of the great vessels have room to read as
 * roots before they leave. Re-measure it if the organ or the vessel subtree
 * changes — it is a composition, not a constant of the anatomy, and nothing
 * medical is derived from it.
 *
 * Went 0.62 -> 0.70 with the shared default, and for the same reason: the fit
 * stopped summing half-extents as if the camera were orthographic, which had
 * been over-filling the band by about an eighth on a subject this deep. The
 * number is scaled to hold the composition the pictures were measured at, not
 * re-measured — **so it is the first thing to check against pictures the next
 * time this scene is rendered**, which will be when its candidate assets pass
 * the asset release gate.
 */
const HEART_SUBJECT_COVERAGE = 0.7;

/**
 * The same share on a frame that is taller than it is wide.
 *
 * A phone has no panel down the side — the panel is a sheet, and it is not on
 * screen while the reader is looking — so nothing is taking the width. What is
 * taking it is the shape of the subject: this heart is wider than it is tall,
 * so on a portrait frame the width runs out first and the organ was left a
 * third of the frame high with empty bands above and below it. Measured at
 * 375x667: 0.62 put the organ across 74% of the width and 35% of the height;
 * this puts it across about 88% and 42%, which is as large as it can be without
 * the organ itself reaching an edge.
 *
 * It is the same kind of value as the one above and carries the same warning:
 * a composition measured from pictures, not a fact about the anatomy — and the
 * same note: 0.74 -> 0.83 is the shared framing's correction carried through,
 * not a second measurement.
 */
const HEART_SUBJECT_COVERAGE_PORTRAIT = 0.83;

/**
 * Where "portrait" starts. The same threshold the shared framing already uses
 * for the aspect it gives back (`distanceScaleForAspect`), so a scene and the
 * framing around it do not disagree about what shape the window is.
 */
const PORTRAIT_ASPECT = 0.85;

/** The organ itself: what "show me the heart" frames. Vessels arrive at it and run out of shot. */
const HEART_PART_IDS = new Set(HEART_PARTS.map((part) => part.id));

const BASE_URL = import.meta.env?.BASE_URL ?? './';
/**
 * The adopted files, served from `public/` like the brain atlas.
 *
 * These are **derivatives**, not the publisher's bytes: the sources fail glTF
 * validation on degenerate vertex normals, and that gate takes zero errors at
 * every scene status, so shipping them was never possible however carefully the
 * failure was written down. `scripts/repair-candidate-gltf.mjs` replaced those
 * normals and nothing else; `src/catalog/assetManifest.js` pins the hashes of
 * what is here and `public/assets/heart/ATTRIBUTION.md` states the change.
 *
 * The sources stay pinned in `src/catalog/devAssets.js` — the record of what
 * was examined is not deleted by adopting a file derived from it, and the
 * repair rebuilds these exact bytes from them.
 */
const HEART_URL = `${BASE_URL}assets/heart/VH_M_Heart.glb`;
const VESSEL_URL = `${BASE_URL}assets/heart/VH_M_Blood_Vasculature.glb`;

/**
 * The subtree of the vasculature file this scene takes.
 *
 * The source's own grouping, not a box drawn round the heart: everything under
 * `VH_M_blood_vasculature_of_heart` and nothing else. The rest of the file is
 * the head, the abdomen and the pelvis, and it is left in the file.
 */
const VESSEL_SUBTREE = 'VH_M_blood_vasculature_of_heart';
/**
 * The radius the model is scaled to.
 *
 * Chosen against the camera rather than picked: the viewer's vertical FOV is
 * 42°, so a sphere of radius r needs r/sin(21°) ≈ 2.8r of distance to fit, and
 * the viewpoints below stand at 5.4. That leaves room for the side panel to
 * take part of the frame — which is what the safe-area fit uses once the model
 * has loaded and there are bounds to fit.
 */
const TARGET_RADIUS = 1.35;
const HIGHLIGHT_COLOR = new THREE.Color('#ffffff');
/** Below this a mesh is not being drawn — the one rule picking and labels share. */
const DRAWN_OPACITY = 0.14;

/**
 * Where to look from, in this model's own axes.
 *
 * `heartAnatomy.js` records those axes and how they were measured — +x is the
 * patient's left, +y superior, +z anterior — so these are derived rather than
 * guessed, which is the difference between a viewpoint called "anterior" and a
 * viewpoint that *is* anterior. The base and apex views look along the long
 * axis, tilted enough that the up vector still resolves.
 */
const VIEW_SPECS = [
  view('anterior', 'Anterior', '前面', [0, 0.1, 5.4]),
  view('posterior', 'Posterior', '後面', [0, 0.1, -5.4]),
  view('left-lateral', 'Left lateral', '左側面', [5.4, 0.1, 0]),
  view('right-lateral', 'Right lateral', '右側面', [-5.4, 0.1, 0]),
  view('base', 'From the base', '心基部側', [0, 5.1, 1.9]),
  view('apex', 'From the apex', '心尖側', [0, -5.1, 1.9]),
];

function view(id, label, labelJa, position) {
  return { id, label, labelJa, position: new THREE.Vector3(...position), target: new THREE.Vector3(0, 0, 0) };
}

/**
 * A still, normal heart from a sourced reference model.
 *
 * Fourteen parts, each one a mesh the source named and gave an ontology id, and
 * nothing else: no beat, no pressure, no flow, no ejection fraction. This is the
 * anatomy layer, and the disease layer is a different thing that would sit on
 * top of it.
 *
 * ## What it does not offer, and why
 *
 * **There is no interior view.** The chambers in this file are closed surfaces
 * around the chambers' own spaces — measured, 122 mL for the left ventricle —
 * and there is no myocardial free wall between them. A "cut through the heart"
 * would therefore be a cut through nothing, and the inside of a chamber's
 * surface is not an interior: it is the back of a shell. What the scene offers
 * instead is honest and is what the file supports — hide the chambers and the
 * valves and papillary muscles that sit inside them are there to be seen.
 *
 * **It cannot be published.** The great vessels the beta requires are not in
 * this file at all (`HEART_MISSING`), and no note in a corner is a substitute
 * for them. The scene exists so the code is real and testable while the vessels
 * are sourced; the release gate stays shut.
 *
 * ## The transform is one transform
 *
 * The model arrives in whole-body coordinates, sitting where a heart sits in a
 * body rather than about its own origin. It is centred and scaled here by a
 * single transform on one root — so that when the vasculature from the same
 * release is added, the two can be placed under that same root and keep the
 * relative positions the source gave them. Centring each of them separately
 * would destroy exactly the thing that makes them combinable.
 */
export class HeartAnatomyScene {
  static meta = HEART_ANATOMY_META;

  static cameraPose = { position: VIEW_SPECS[0].position.clone(), target: VIEW_SPECS[0].target.clone() };

  static allowAutoRotate = false;

  constructor({ viewer, model, vessels, modelLoader, vesselLoader } = {}) {
    this.viewer = viewer;
    this.modelSource = model;
    this.vesselSource = vessels ?? null;
    this.modelLoader = modelLoader ?? loadHeart;
    this.vesselLoader = vesselLoader === undefined ? loadVessels : vesselLoader;
    this.vesselError = null;
    this.root = new THREE.Group();
    this.root.name = 'heart-anatomy';
    /**
     * The one transform every sourced model goes under.
     *
     * Whatever is added later — the great vessels from the same release — goes
     * in here beside the heart, unmoved relative to it.
     */
    this.modelRoot = new THREE.Group();
    this.modelRoot.name = 'heart-model';
    this.root.add(this.modelRoot);

    this.selectables = [];
    /** Structure id → the meshes it is drawn from. One each here, but the shape is the contract's. */
    this.meshesById = new Map();
    this.listeners = new Set();
    this.hoverListeners = new Set();
    this.statusListeners = new Set();
    this.isolationListeners = new Set();
    this.visibilityListeners = new Set();

    this.pageLeaving = false;
    this._pageHide = () => { this.pageLeaving = true; };
    if (typeof window !== 'undefined') window.addEventListener('pagehide', this._pageHide);

    // Natural, for the reason `OrganAnatomyScene` gives: `parts` puts the
    // chambers in a teal band (deliberately, so it is never read as an
    // oxygenation map) and that is not what a heart looks like. It is still one
    // press away, and it is what the parts legend is drawn from.
    this.colorMode = 'natural';
    this.activeView = VIEW_SPECS[0].id;
    this.selection = null;
    this.selectedMeshes = [];
    this.hoveredMeshes = [];
    this.isolatedId = null;
    this.manualHidden = new Set();
    this.hiddenVersion = 0;
    this.displayBeforeReveal = null;
    this.built = false;
    this.disposed = false;
    this.ready = Promise.resolve();
    this.status = { state: 'idle', selectableCount: 0 };
    this.structureAnchors = new Map();
    this._annotationRay = new THREE.Raycaster();
    this._annotationDirection = new THREE.Vector3();
    this._annotationSight = new Map();
  }

  build() {
    if (this.built) return this.root;
    this.built = true;
    this.root.add(createStudioLights({ key: 30, fill: 0.85, rim: 12 }));
    this._bindPicking();
    if (this.modelSource) {
      this.attachModel(this.modelSource, this.vesselSource);
      this.ready = Promise.resolve(this.root);
    } else if (this.viewer?.renderer?.domElement) {
      this.ready = this._loadModel();
    }
    return this.root;
  }

  async _loadModel() {
    this._setStatus({ state: 'loading', selectableCount: 0 });
    try {
      const model = await this.modelLoader();
      if (this.disposed) {
        disposeObject(model.scene ?? model);
        return this.root;
      }
      // The vessels are a second file and a second question. The heart is shown
      // either way: a checkout that fetched one candidate and not the other gets
      // a heart with its vessels missing and a status that says so, rather than
      // an error page.
      let vessels = null;
      try {
        vessels = await this.vesselLoader?.();
      } catch (error) {
        if (!this.disposed && !this.pageLeaving) this.vesselError = error;
      }
      if (this.disposed) {
        disposeObject(model.scene ?? model);
        if (vessels) disposeObject(vessels.scene ?? vessels);
        return this.root;
      }
      this.attachModel(model, vessels);
    } catch (error) {
      // A fetch the browser abandoned is not a failure of the model — the same
      // distinction the brain scene had to learn. What is different here is that
      // a *missing* candidate is an ordinary state: this asset is not committed,
      // so a checkout that has not run `npm run assets:dev` simply does not have
      // it, and saying so beats reporting a broken scene.
      if (this.disposed || this.pageLeaving) return this.root;
      this._setStatus({
        state: 'error',
        selectableCount: 0,
        error,
        hint: 'This model is a candidate asset that is not committed. Run `npm run assets:dev`.',
      });
    }
    return this.root;
  }

  /**
   * Adopt a loaded model. Public so a test can hand in a small fixture and
   * exercise the same metadata and material path the real file takes.
   */
  attachModel(model, vessels = null) {
    if (this.disposed) return;
    const scene = model.scene ?? model;
    if (!scene?.isObject3D) throw new TypeError('the heart model must contain a THREE.Object3D scene');

    this._resetInteractionState({ notify: true });
    this.modelRoot.clear();
    this.selectables.length = 0;
    this.meshesById.clear();
    this.structureAnchors.clear();
    this._annotationSight.clear();

    /**
     * **Neither file is moved relative to the other.**
     *
     * Both arrive in the same whole-body frame — the heart sits where a heart
     * sits in a body, and the vessels reach it from where they reach it. Both
     * are added to `modelRoot` untouched, and the one display transform (an
     * offset and a uniform scale) is applied to `modelRoot` itself, so it
     * cannot separate them. Centring or normalising either one on its own is
     * the move that destroys exactly the thing that makes them combinable, and
     * it is not made here.
     *
     * The scale is taken from the **heart**, not from the pair. The vessel
     * subtree is half a metre tall against the heart's ten centimetres, so
     * fitting the pair would put the heart in a fifth of the frame; the
     * far-reaching vessels start hidden instead, and are one click away.
     */
    this.modelRoot.add(scene);
    const vesselScene = vessels ? (vessels.scene ?? vessels) : null;
    const vesselRoot = vesselScene ? findByName(vesselScene, VESSEL_SUBTREE) : null;
    // How much of that file is deliberately not taken. Counted rather than left
    // implicit: "we take the subtree the source calls the vessels of the heart"
    // is a claim about a number, and this is the number.
    const vesselsInFile = vesselScene ? countMeshes(vesselScene) : 0;
    const vesselsTaken = vesselRoot ? countMeshes(vesselRoot) : 0;
    if (vesselRoot) {
      // Detached from its own file's root and reparented **with its world
      // matrix applied**, so its position in the body is what survives rather
      // than its position under a node we are not keeping.
      vesselRoot.updateMatrixWorld(true);
      const matrix = vesselRoot.matrixWorld.clone();
      this.modelRoot.add(vesselRoot);
      matrix.decompose(vesselRoot.position, vesselRoot.quaternion, vesselRoot.scale);
    }
    this.modelRoot.updateMatrixWorld(true);

    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const centre = box.getCenter(new THREE.Vector3());
    const radius = box.getBoundingSphere(new THREE.Sphere()).radius || 1;
    const scale = TARGET_RADIUS / radius;
    this.modelRoot.position.copy(centre).multiplyScalar(-scale);
    this.modelRoot.scale.setScalar(scale);
    this.root.updateMatrixWorld(true);

    let unknown = 0;
    let vesselMeshes = 0;
    this.modelRoot.traverse((object) => {
      if (!object.isMesh) return;
      const id = heartMeshOwner(object.name);
      const entry = id ? heartPartById(id) : null;
      if (!entry) {
        // A mesh the table does not know is not given a made-up identity: it is
        // left out of the selectable set and counted, so the count is a check on
        // the table rather than a silent difference. Most of these are the rest
        // of the body in the vasculature file, which is why it is not an error.
        object.visible = false;
        unknown += 1;
        return;
      }
      if (entry.meshNames) vesselMeshes += 1;
      this._registerMesh(object, entry);
    });

    // The far-reaching vessels start out of the way. Seeded through the same
    // hidden set a reader's own "hide" writes to, so "Unhide all" brings them
    // back and nothing needs a second mechanism to explain.
    for (const id of HEART_DEFAULT_HIDDEN) {
      if (this.meshesById.has(id)) this.manualHidden.add(id);
    }

    this._applyVisibility(1 / 60, true);
    this._setStatus({
      state: 'ready',
      selectableCount: this.meshesById.size,
      meshCount: this.selectables.length,
      unknownMeshes: unknown,
      vesselMeshes,
      vesselsInFile,
      vesselsNotTaken: vesselsInFile - vesselsTaken,
      vessels: vesselRoot ? 'loaded' : (this.vesselError ? 'failed' : 'absent'),
      missing: HEART_MISSING.length,
    });
    this._emitVisibility();
  }

  _registerMesh(mesh, entry) {
    const color = new THREE.Color(heartColor(entry.id, this.colorMode));
    mesh.material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.62,
      metalness: 0,
      emissive: color,
      emissiveIntensity: 0.02,
      transparent: true,
      opacity: 1,
      depthWrite: true,
      // Several of these parts are open surfaces in the source, and a
      // front-side-only material makes an open surface vanish from one side.
      // Drawing both sides is how an open surface reads as a surface; it is not
      // a claim that it is closed, and `heartStructureInfo` says which are which.
      side: THREE.DoubleSide,
    });
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData = {
      ...mesh.userData,
      structureId: entry.id,
      ontologyId: entry.ontologyId,
      group: entry.group,
      baseColor: color.clone(),
      idleEmissiveIntensity: 0.02,
      currentOpacity: 1,
      selected: false,
      hovered: false,
    };
    this.selectables.push(mesh);
    const existing = this.meshesById.get(entry.id);
    if (existing) existing.push(mesh);
    else this.meshesById.set(entry.id, [mesh]);
  }

  // --- picking -------------------------------------------------------------

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
      if (hit) this.selectStructure(hit.object.userData.structureId);
      else this.clearSelection();
    };
    this._pointerLeave = () => this._setHovered(null);
    canvas.addEventListener('pointerdown', this._pointerDown);
    canvas.addEventListener('pointermove', this._pointerMove);
    canvas.addEventListener('pointerup', this._pointerUp);
    canvas.addEventListener('pointerleave', this._pointerLeave);
    canvas.style.cursor = 'grab';
  }

  /**
   * Name whatever is drawn at one point of the canvas — **the way in that needs
   * no pointer**.
   *
   * The landing hero binds Enter to this, and every other anatomy scene had it:
   * the brain since its keyboard path was built, and all thirty-nine organ
   * scenes from `OrganAnatomyScene`. The heart did not, and the call site is
   * `scene.selectAtCanvasPoint?.(…)` — optional, so it was skipped in silence.
   * That did not matter while the heart was withheld. It published on
   * 2026-09-15 and joined the hero rotation the same day, so from then on a
   * reader pressing Enter on the day the hero showed the heart got nothing, and
   * nothing said why.
   *
   * It answers with the same structure a click at that point would give,
   * through the same ray and the same visibility rules, so the two ways in
   * cannot come to disagree about what is there. `x` and `y` are relative to
   * the canvas, which is what the callers have.
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
    return this.selectStructure(hit.object.userData.structureId);
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

  /** The meshes a ray may see: what is drawn, by the one rule everything reads. */
  _drawnMeshes() {
    return this.selectables.filter((mesh) => mesh.visible && mesh.userData.currentOpacity > DRAWN_OPACITY);
  }

  // --- selection and hover -------------------------------------------------

  _meshesFor(id) {
    return this.meshesById.get(id) ?? [];
  }

  _setHovered(mesh) {
    const meshes = mesh ? this._meshesFor(mesh.userData.structureId) : [];
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
    const { selected, hovered, baseColor, idleEmissiveIntensity } = mesh.userData;
    mesh.material.emissive.copy(selected || hovered ? HIGHLIGHT_COLOR : baseColor);
    mesh.material.emissiveIntensity = selected ? 0.3 : hovered ? 0.15 : idleEmissiveIntensity;
  }

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

  _structureInfo(mesh) {
    return {
      ...heartStructureInfo(mesh.userData.structureId),
      color: `#${mesh.material.color.getHexString()}`,
      colorMode: this.colorMode,
    };
  }

  clearSelection() {
    if (!this.selectedMeshes.length && !this.selection) return;
    for (const mesh of this.selectedMeshes) {
      mesh.userData.selected = false;
      this._refreshHighlight(mesh);
    }
    this.selectedMeshes = [];
    this.selection = null;
    for (const listener of this.listeners) listener(null);
  }

  _resetInteractionState({ notify = false } = {}) {
    const had = Boolean(this.selection) || this.hoveredMeshes.length > 0 || this.isolatedId != null;
    const hadHidden = this.manualHidden.size > 0;
    for (const mesh of this.selectedMeshes) mesh.userData.selected = false;
    for (const mesh of this.hoveredMeshes) mesh.userData.hovered = false;
    this.selectedMeshes = [];
    this.hoveredMeshes = [];
    this.selection = null;
    this.isolatedId = null;
    this.manualHidden.clear();
    this.hiddenVersion += 1;
    this.displayBeforeReveal = null;
    if (!notify || !(had || hadHidden)) return;
    for (const listener of this.listeners) listener(null);
    for (const listener of this.hoverListeners) listener(null);
    this._emitIsolation();
    this._emitVisibility();
  }

  getAnatomySelection() { return this.selection; }
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

  // --- the parts, as a list and as an inventory ----------------------------

  getAnatomyInventory() {
    return [...this.meshesById.keys()].map((id) => heartStructureInfo(id));
  }

  getAnatomyTree() {
    return buildAnatomyTree(this.getAnatomyInventory());
  }

  /** What the beta requires and this model does not contain. */
  getMissingStructures() {
    return HEART_MISSING.map((entry) => ({ ...entry }));
  }

  // --- display state -------------------------------------------------------

  isolateStructure(id) {
    const meshes = this._meshesFor(id);
    if (!meshes.length) return false;
    this.isolatedId = meshes[0].userData.structureId;
    this._applyVisibility(1 / 60, true);
    this._emitIsolation();
    return true;
  }

  clearIsolation() {
    if (this.isolatedId == null) return false;
    this.isolatedId = null;
    this._applyVisibility(1 / 60, true);
    this._emitIsolation();
    return true;
  }

  getAnatomyIsolation() { return this.isolatedId; }

  onAnatomyIsolation(listener) {
    this.isolationListeners.add(listener);
    return () => this.isolationListeners.delete(listener);
  }

  _emitIsolation() {
    for (const listener of this.isolationListeners) listener(this.isolatedId);
  }

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
    this._applyVisibility(1 / 60, true);
    this._emitVisibility();
    if (droppedIsolation) this._emitIsolation();
  }

  setStructureHidden(id, hidden) {
    const meshes = this._meshesFor(id);
    if (!meshes.length) return false;
    const key = meshes[0].userData.structureId;
    if (this.manualHidden.has(key) === Boolean(hidden)) return false;
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
   * group: hiding the brain's frontal lobe is four of those, so four passes over
   * every mesh in the atlas and four repaints of the panel, for one thing the
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
      const key = meshes[0].userData.structureId;
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

  showAllHiddenStructures() {
    if (!this.manualHidden.size) return false;
    this.manualHidden.clear();
    // No isolation to drop: showing never ends one.
    this._visibilityChanged(false);
    return true;
  }

  getAnatomyVisibility() { return { hidden: [...this.manualHidden] }; }

  onAnatomyVisibility(listener) {
    this.visibilityListeners.add(listener);
    return () => this.visibilityListeners.delete(listener);
  }

  _emitVisibility() {
    const state = this.getAnatomyVisibility();
    for (const listener of this.visibilityListeners) listener({ hidden: [...state.hidden] });
  }

  isStructureVisible(id) {
    return this._meshesFor(id).some((mesh) => this._targetOpacityFor(mesh) > DRAWN_OPACITY);
  }

  /**
   * Bring a structure into view.
   *
   * Everything here is on the surface of the model or just inside it, so the
   * recipe is short: un-hide it if it was hidden, drop an isolation that is
   * hiding it, and turn to the side it is on. A part that is inside a chamber is
   * reported as needing that chamber out of the way rather than being revealed
   * by a cut the file cannot support.
   */
  revealStructure(id) {
    const meshes = this._meshesFor(id);
    if (!meshes.length) return { ok: false, reason: 'unknown-structure' };
    const key = meshes[0].userData.structureId;
    const before = this._displaySnapshot();
    const changed = [];
    if (this.manualHidden.delete(key)) {
      this.hiddenVersion += 1;
      changed.push('hidden');
    }
    if (this.isolatedId != null && this.isolatedId !== key) {
      this.isolatedId = null;
      changed.push('isolation');
    }
    const centre = this.getStructureBounds(key)?.centre;
    if (centre) {
      // Which face of the heart it is nearest, in this model's own axes.
      const nearest = Math.abs(centre.z) >= Math.abs(centre.x)
        ? (centre.z >= 0 ? 'anterior' : 'posterior')
        : (centre.x >= 0 ? 'left-lateral' : 'right-lateral');
      if (nearest !== this.activeView && this.setAnatomyView(nearest)) changed.push('view');
    }
    this._applyVisibility(1 / 60, true);

    // Turning is not always enough. A papillary muscle is inside a ventricle,
    // and no viewpoint sees through a surface — so what is in the way is taken
    // out of the way, one blocker at a time, measured by the ray rather than
    // assumed from a table of what is usually inside what.
    //
    // This is the one move the file actually supports. It is not a cut: the
    // chambers are closed surfaces around their own spaces, so hiding one shows
    // what was inside it and invents nothing. `restoreDisplay` puts every
    // blocker back, which is why the snapshot above is taken first.
    const hid = this._clearTheWayTo(key, this.activeView);
    if (hid.length) changed.push('hidden');

    if (changed.length) {
      this.displayBeforeReveal = before;
      if (changed.includes('hidden')) this._emitVisibility();
      this._emitIsolation();
    }
    // Asked of the viewpoint this reveal is *going to*, not of wherever the
    // camera happens to be standing: the caller applies the view after this
    // returns, so an answer about the old camera would describe a frame nobody
    // is about to see.
    const anchorClear = this._anchorClearFromView(key, this.activeView);
    return {
      ok: true,
      changed,
      view: this.activeView,
      layer: null,
      /** Tri-state: true clear, false blocked, null not measurable. */
      anchorClear,
      /** Blocked, as observed. A non-answer is not reported as an obstruction. */
      occluded: anchorClear === false,
      hid,
    };
  }

  /**
   * Is this structure's **anchor point** unobstructed along the ray from a
   * given eye position? `true`, `false`, or `null` when it cannot be measured.
   *
   * ## Three things this is not
   *
   * It is not "the structure is visible". One anchor decides for a whole
   * structure, and a mesh can have its anchor clear while most of it is behind
   * something — the brain scene has the same limit recorded as F-40.
   *
   * It is not "the structure is on screen". Nothing here knows the frustum, the
   * zoom, or which part of the canvas a panel is sitting over.
   *
   * And **it is not the settings**. `isStructureVisible` answers whether the
   * display draws this part at all; both are needed and they disagree exactly
   * where it matters — a papillary muscle is drawn, and the ventricle around it
   * is drawn in front of it.
   *
   * ## Why `null` rather than `true`
   *
   * It used to return `true` when there was no viewpoint or no anchor to aim
   * at, which quietly counted "could not measure" as "yes". A caller that adds
   * these up was then reporting successes it had not observed. Unmeasurable is
   * its own answer and every caller decides what to do with it.
   */
  _anchorClearFrom(id, eye) {
    const meshes = this._meshesFor(id);
    if (!meshes.length) return false;
    if (!meshes.some((mesh) => this._targetOpacityFor(mesh) > DRAWN_OPACITY)) return false;
    const point = this._anchorFor(`structure:${id}`, id, meshes)?.sight;
    if (!eye || !point) return null;
    const direction = point.clone().sub(eye);
    const distance = direction.length();
    if (!distance) return null;
    this._annotationRay.set(eye, direction.divideScalar(distance));
    const first = this._annotationRay.intersectObjects(this._drawnMeshes(), false)[0];
    return Boolean(first) && meshes.includes(first.object);
  }

  /** From one of the named viewpoints — a **prediction** about where the camera is going. */
  _anchorClearFromView(id, viewId) {
    const spec = VIEW_SPECS.find((candidate) => candidate.id === viewId);
    return this._anchorClearFrom(id, spec?.position ?? null);
  }

  /**
   * From where the camera is standing **now** — a statement about this frame.
   *
   * Kept apart from the viewpoint prediction on purpose: the reader may have
   * orbited, zoomed or turned since, and an answer about a viewpoint they have
   * left is not an answer about what is in front of them.
   */
  isAnchorClearNow(id) {
    const camera = this.viewer?.camera;
    if (!camera) return null;
    camera.updateMatrixWorld();
    return this._anchorClearFrom(id, camera.position);
  }

  /**
   * Hide whatever stands between a viewpoint and a structure, and say what was
   * hidden.
   *
   * Bounded: at most one blocker per surrounding structure, and the structure
   * being revealed is never hidden. An empty list means nothing was in the way.
   */
  _clearTheWayTo(id, viewId, limit = 6) {
    const hid = [];
    for (let step = 0; step < limit; step += 1) {
      // `true` means clear. `null` means it cannot be measured, and there is
      // nothing to move out of the way on the strength of a non-answer.
      if (this._anchorClearFromView(id, viewId) !== false) break;
      const blocker = this._firstBlocker(id, viewId);
      if (!blocker || blocker === id) break;
      this.manualHidden.add(blocker);
      this.hiddenVersion += 1;
      hid.push(blocker);
      this._applyVisibility(1 / 60, true);
    }
    return hid;
  }

  /** The structure the ray meets first on its way to `id`, or null. */
  _firstBlocker(id, viewId) {
    const meshes = this._meshesFor(id);
    const spec = VIEW_SPECS.find((candidate) => candidate.id === viewId);
    const point = this._anchorFor(`structure:${id}`, id, meshes)?.sight;
    if (!spec || !point) return null;
    const direction = point.clone().sub(spec.position);
    const distance = direction.length();
    if (!distance) return null;
    this._annotationRay.set(spec.position, direction.divideScalar(distance));
    const first = this._annotationRay.intersectObjects(this._drawnMeshes(), false)[0];
    if (!first || meshes.includes(first.object)) return null;
    return first.object.userData.structureId;
  }

  /**
   * Drawn, and still not visible — because something else is in front of it.
   *
   * The panel needs this to decide whether to offer "show it": asking only
   * whether the settings draw a structure would answer "you can already see it"
   * about a muscle inside a ventricle. Optional in the contract, because a scene
   * whose structures are all on the surface has nothing to answer.
   */
  isStructureObscured(id) {
    if (!this.isStructureVisible(id)) return false;
    // The reader is looking at the current frame, so ask about the current
    // frame; the named viewpoint is the fallback for a scene with no camera
    // yet (a test, a headless build). An unmeasurable answer is **not** an
    // obstruction: offering "show it" on a non-answer is a button that may do
    // nothing.
    const now = this.isAnchorClearNow(id);
    const answer = now === null ? this._anchorClearFromView(id, this.activeView) : now;
    return answer === false;
  }

  /** The fixed ways of looking this scene offers. Data, so the panel can list them. */
  getDisplayRecipes() {
    // `hide` and `shows` are both reported, because "what will this do to my
    // model" is a fair question to be able to answer before pressing it.
    return HEART_RECIPES.map(({ id, label, labelJa, summary, summaryJa, note, noteJa, shows, hide, view }) => ({
      id, label, labelJa, summary, summaryJa, note, noteJa, view, shows: [...shows], hide: [...hide],
    }));
  }

  /**
   * Apply one, and report exactly what it did.
   *
   * Hides and a viewpoint. Nothing else is available to it — there is no cut in
   * this scene for a recipe to reach for — and what it hid goes into the same
   * snapshot "Back to how it was" reads, so a reader is never stuck inside a
   * view they did not choose to keep.
   */
  applyDisplayRecipe(id) {
    const recipe = HEART_RECIPES.find((candidate) => candidate.id === id);
    if (!recipe) return { ok: false, reason: 'unknown-recipe' };
    const before = this._displaySnapshot();

    /**
     * A named way of looking is a destination, not a further step.
     *
     * `resets` puts the display back to how the scene opens — every hand-hidden
     * structure shown again, the far-reaching vessels back out of the way —
     * before this recipe's own hides go on. Without it the recipes compose:
     * pressing "coronary vessels" after "inside the chambers" would leave the
     * chambers hidden too, and the reader would be looking at the union of two
     * requests rather than the one they made.
     *
     * "Back to the whole heart" is this step and nothing else.
     */
    const wasHidden = new Set(this.manualHidden);
    if (recipe.resets) {
      this.manualHidden = new Set(HEART_DEFAULT_HIDDEN.filter((known) => this.meshesById.has(known)));
    }

    for (const structureId of recipe.hide) {
      if (this.meshesById.has(structureId)) this.manualHidden.add(structureId);
    }

    // Dropping an isolation **is** a change to the display, and forgetting that
    // is how "Back to how it was" became unavailable on a real path: everything
    // this recipe hides was already hidden by hand, the viewpoint is already the
    // one it wants, and the only thing it does is end an isolation — which is
    // exactly the state a reader would want back.
    const released = this.isolatedId != null;
    if (released) this.isolatedId = null;
    const turned = recipe.view && recipe.view !== this.activeView && this.setAnatomyView(recipe.view);

    /**
     * What the reader ends up with, against what they had — not what this
     * function did on the way there.
     *
     * With `resets` the work is "show everything, then hide these", so a naive
     * count reports hiding four chambers every single time the interior view is
     * pressed, and reports a change when the display in fact ended where it
     * started. Both matter: `hid` is what the panel tells the reader it took
     * away, and `changed` decides whether "Back to how it was" is rewritten.
     * Pressing the same view twice must not overwrite the way back.
     */
    const hid = [...this.manualHidden].filter((structureId) => !wasHidden.has(structureId));
    const shown = [...wasHidden].filter((structureId) => !this.manualHidden.has(structureId));
    if (hid.length || shown.length) this.hiddenVersion += 1;
    this._applyVisibility(1 / 60, true);
    const changed = hid.length > 0 || shown.length > 0 || turned || released;
    if (changed) this.displayBeforeReveal = before;
    this._emitVisibility();
    this._emitIsolation();

    // What was observed, split three ways rather than two.
    //
    // This is a **prediction about the viewpoint the recipe turned to**, made
    // by casting one ray per structure at one anchor point each. It is not a
    // count of what is on screen: the camera has not moved yet when this
    // returns, one anchor does not speak for a whole structure, and nothing
    // here knows the frustum or which part of the canvas a panel covers. The
    // caller has to describe it in those terms — see `AnatomyPanel`.
    const clear = [];
    const blocked = [];
    const unmeasured = [];
    for (const structureId of recipe.shows) {
      const answer = this._anchorClearFromView(structureId, this.activeView);
      if (answer === true) clear.push(structureId);
      else if (answer === false) blocked.push(structureId);
      else unmeasured.push(structureId);
    }
    return {
      ok: true,
      hid,
      view: this.activeView,
      /** Anchors observed unobstructed from `view`. Not "seen on screen". */
      anchorsClear: clear,
      anchorsBlocked: blocked,
      /** Neither — no anchor, or no such viewpoint. Never counted as a success. */
      anchorsUnmeasured: unmeasured,
    };
  }

  canRestoreDisplay() { return this.displayBeforeReveal != null; }

  restoreDisplay() {
    const before = this.displayBeforeReveal;
    if (!before) return { ok: false };
    this.displayBeforeReveal = null;
    this.isolatedId = before.isolatedId;
    this.manualHidden = new Set(before.hidden);
    this.hiddenVersion += 1;
    this.setAnatomyView(before.view);
    this._applyVisibility(1 / 60, true);
    this._emitVisibility();
    this._emitIsolation();
    return { ok: true, layer: null, view: this.activeView };
  }

  _displaySnapshot() {
    return { view: this.activeView, isolatedId: this.isolatedId, hidden: [...this.manualHidden] };
  }

  /**
   * The same order the brain scene uses, for the same reasons: isolation is a
   * temporary override that writes nothing down, a hand-hidden structure stays
   * hidden, and everything else is drawn.
   */
  _targetOpacityFor(mesh) {
    const id = mesh.userData.structureId;
    if (this.isolatedId != null) return id === this.isolatedId ? 1 : 0;
    if (this.manualHidden.has(id)) return 0;
    return 1;
  }

  _applyVisibility(dt, snap) {
    for (const mesh of this.selectables) {
      const target = this._targetOpacityFor(mesh);
      const opacity = snap ? target : damp(mesh.userData.currentOpacity, target, 10, dt);
      mesh.userData.currentOpacity = opacity;
      mesh.material.opacity = opacity;
      mesh.material.depthWrite = opacity > 0.94;
      mesh.visible = opacity > 0.012;
    }
  }

  setProgress() { /* No progression: this is a still model. */ }

  update(dt) {
    if (!this.selectables.length) return;
    this._applyVisibility(dt, false);
  }

  // --- viewpoints and colour ------------------------------------------------

  getAnatomyViews() {
    return VIEW_SPECS.map(({ id, label, labelJa }) => ({ id, label, labelJa }));
  }

  getInspectionViews() { return this.getAnatomyViews(); }

  getAnatomyView(id) {
    const found = VIEW_SPECS.find((candidate) => candidate.id === id);
    return found ? { position: found.position.clone(), target: found.target.clone() } : null;
  }

  getInspectionView(id) { return this.getAnatomyView(id); }

  setAnatomyView(id) {
    if (!VIEW_SPECS.some((candidate) => candidate.id === id)) return false;
    this.activeView = id;
    return true;
  }

  setInspectionView(id) { return this.setAnatomyView(id); }

  getAnatomyColorModes() { return HEART_COLOR_MODES.map((mode) => ({ ...mode })); }
  getInspectionModes() { return this.getAnatomyColorModes(); }
  getAnatomyColorMode() { return this.colorMode; }
  getInspectionMode() { return this.getAnatomyColorMode(); }
  getAnatomyLegendPalette() { return { ...HEART_PALETTE }; }
  getInspectionLegendPalette() { return this.getAnatomyLegendPalette(); }

  setAnatomyColorMode(id) {
    if (!HEART_COLOR_MODES.some((mode) => mode.id === id) || id === this.colorMode) return false;
    this.colorMode = id;
    for (const mesh of this.selectables) {
      const color = new THREE.Color(heartColor(mesh.userData.structureId, id));
      mesh.userData.baseColor.copy(color);
      mesh.material.color.copy(color);
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

  // --- bounds and labels ----------------------------------------------------

  /**
   * What the camera frames: **the heart**, not everything drawn.
   *
   * The vessels reach far past the chest — the inferior vena cava alone runs to
   * the renal level — so framing every drawn mesh would answer "show me the
   * heart" with a heart a fifth of the frame high and a long tube beside it.
   * The subject of this scene is the organ; the vessels arrive at it and run out
   * of shot, which is what they do in a body. A reader who wants one of them
   * framed asks for it by name, and `getStructureBounds` answers that.
   */
  getSubjectBounds() {
    // **The fourteen parts of the heart file, and nothing else.**
    //
    // This used to ask whether a structure had `meshNames`, which marks only
    // the five vessels the source splits in two — so thirty-two vessels
    // counted as "the heart", and the camera framed a 51 cm subtree to show a
    // 10 cm organ. The heart came out small with the inferior vena cava
    // running off the bottom of the frame, which is exactly what this method
    // exists to prevent.
    const heart = this._drawnMeshes().filter((mesh) => HEART_PART_IDS.has(mesh.userData.structureId));
    const bounds = boundsOf(heart.length ? heart : this._drawnMeshes());
    const aspect = this.viewer?.camera?.aspect;
    const coverage = Number.isFinite(aspect) && aspect < PORTRAIT_ASPECT
      ? HEART_SUBJECT_COVERAGE_PORTRAIT
      : HEART_SUBJECT_COVERAGE;
    return bounds && { ...bounds, coverage };
  }

  getStructureBounds(id) { return boundsOf(this._meshesFor(id)); }

  /**
   * A label for a part, anchored on its outside and hidden when it cannot be
   * seen — the same rule the brain uses, for the same reason: a name drawn over
   * whatever is in front of it is a name attached to the wrong thing.
   */
  getStructureAnnotation(id) {
    const meshes = this._meshesFor(id);
    if (!meshes.length) return null;
    const key = `structure:${id}`;
    const anchor = this._anchorFor(key, id, meshes);
    if (!anchor) return null;
    const info = heartStructureInfo(id);
    return {
      id: key,
      structureId: id,
      text: info.name,
      sub: info.nameJa,
      /**
       * A short mark when the source's own records for this structure name
       * different things — never the paragraph, which is in the detail tab.
       * A label is two words on a 3D view; a warning that fills it would push
       * out the thing it is warning about.
       */
      flag: info.identityNote,
      flagJa: info.identityNoteJa,
      position: anchor.point,
      isVisible: (camera) => this._pointVisible(key, anchor.sight, meshes, camera),
      /** Whether the settings draw it at all — see the brain scene for why both. */
      isDrawn: () => this.isStructureVisible(id),
    };
  }

  /**
   * Where a structure's label sits, and where a sight test aims.
   *
   * They are deliberately two points. The label sits on the outermost vertex,
   * which is what puts a name on the outside of the thing it names. A ray aimed
   * at that exact vertex is a ray aimed at the shared corner of two triangles,
   * and it misses as often as it hits — so the sight test aims a little way
   * inside the same surface, where the answer is about geometry rather than
   * about floating point.
   */
  _anchorFor(key, id, meshes) {
    const cached = this.structureAnchors.get(key);
    if (cached) return cached;
    const point = outwardSurfacePoint(meshes, this.modelRoot);
    if (!point) return null;
    const centre = boundsOf(meshes)?.centre ?? point;
    const anchor = { point, sight: point.clone().lerp(centre, 0.04) };
    this.structureAnchors.set(key, anchor);
    return anchor;
  }

  _pointVisible(cacheKey, point, meshes, camera) {
    if (!point || !camera || !meshes?.length) return false;
    camera.updateMatrixWorld();
    const key = `${camera.matrixWorld.elements.map((n) => n.toFixed(4)).join(',')}|` +
      `${this.isolatedId}|${this.hiddenVersion}`;
    const cached = this._annotationSight.get(cacheKey);
    if (cached?.key === key) return cached.visible;
    this._annotationDirection.copy(point).sub(camera.position);
    const distance = this._annotationDirection.length();
    let visible = false;
    if (distance > 0) {
      this._annotationRay.set(camera.position, this._annotationDirection.divideScalar(distance));
      const first = this._annotationRay.intersectObjects(this._drawnMeshes(), false)[0];
      visible = Boolean(first) && meshes.includes(first.object);
    }
    this._annotationSight.set(cacheKey, { key, visible });
    return visible;
  }

  getAnnotations() { return []; }

  /** This model's own anatomical axes — declared, not inferred. */
  getAnatomyAxes() {
    return {
      left: new THREE.Vector3(...HEART_AXES.left),
      superior: new THREE.Vector3(...HEART_AXES.superior),
      anterior: new THREE.Vector3(...HEART_AXES.anterior),
    };
  }

  // --- status ---------------------------------------------------------------

  getAnatomyStatus() { return { ...this.status }; }

  onAnatomyStatus(listener) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  _setStatus(status) {
    this.status = status;
    for (const listener of this.statusListeners) listener({ ...status });
  }

  dispose() {
    this.disposed = true;
    if (typeof window !== 'undefined') window.removeEventListener('pagehide', this._pageHide);
    const canvas = this.viewer?.renderer?.domElement;
    canvas?.removeEventListener('pointerdown', this._pointerDown);
    canvas?.removeEventListener('pointermove', this._pointerMove);
    canvas?.removeEventListener('pointerup', this._pointerUp);
    canvas?.removeEventListener('pointerleave', this._pointerLeave);
    this.listeners.clear();
    this.hoverListeners.clear();
    this.statusListeners.clear();
    this.isolationListeners.clear();
    this.visibilityListeners.clear();
    this._resetInteractionState();
    disposeObject(this.root);
  }
}

function boundsOf(meshes) {
  if (!meshes?.length) return null;
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

/** The outermost vertex of a structure, so a label sits on it rather than in it. */
function outwardSurfacePoint(meshes, root) {
  const box = new THREE.Box3();
  for (const mesh of meshes) box.expandByObject(mesh);
  if (box.isEmpty()) return null;
  const centre = box.getCenter(new THREE.Vector3());
  const modelCentre = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
  const outward = centre.clone().sub(modelCentre);
  if (outward.lengthSq() < 1e-8) return centre;
  outward.normalize();
  const vertex = new THREE.Vector3();
  let best = null;
  let bestReach = -Infinity;
  for (const mesh of meshes) {
    const position = mesh.geometry?.getAttribute?.('position');
    if (!position) continue;
    mesh.updateWorldMatrix(true, false);
    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      const reach = vertex.dot(outward);
      if (reach > bestReach) {
        bestReach = reach;
        best = vertex.clone();
      }
    }
  }
  return best ?? centre;
}

async function loadHeart() {
  if (!HEART_URL) throw new Error('no candidate heart asset is registered');
  const loader = new GLTFLoader();
  return loader.loadAsync(HEART_URL);
}

async function loadVessels() {
  if (!VESSEL_URL) throw new Error('no candidate vasculature asset is registered');
  const loader = new GLTFLoader();
  return loader.loadAsync(VESSEL_URL);
}

/** How many meshes are under an object, itself included. */
function countMeshes(root) {
  let count = 0;
  root.traverse((object) => { if (object.isMesh) count += 1; });
  return count;
}

/** The first descendant with this name, or null. */
function findByName(root, name) {
  let found = null;
  root.traverse((object) => {
    if (!found && object.name === name) found = object;
  });
  return found;
}

export default HeartAnatomyScene;
