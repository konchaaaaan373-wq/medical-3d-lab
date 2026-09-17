import * as THREE from 'three';
import { buildAnatomyTree } from '../../../app/anatomyContract.js';
import { createStudioLights } from '../lighting.js';
import { disposeObject } from '../../../utils/dispose.js';
import { clamp, damp, lerp, smoothstep } from '../../../utils/math.js';
import { sectionFaceGeometry } from '../geometry/sectionFace.js';
import { createTapTracker } from './tapGesture.js';

/**
 * The machinery every procedurally built organ anatomy scene shares.
 *
 * `BrainAnatomyScene` answers the anatomy contract for one atlas loaded from a
 * GLB. Every other organ in this repository is built in code instead, and the
 * parts are already there — five lobes carved out of a lung, Couinaud's eight
 * segments carved out of a liver as nine parts, seven pyramids and the cortex around them
 * carved out of a kidney. What was missing was not geometry: it was the surface
 * that lets a reader point at one of those meshes and be told its name.
 *
 * Writing that surface once per organ would have produced three copies of the
 * same picking, highlighting, isolation and layer code, and three chances for
 * them to drift. So it is written once, here, and an organ scene supplies two
 * things: the meshes, and what each one is called.
 *
 * ## What a subclass provides
 *
 * `buildOrgan()` returns `{ object, structures, dispose }`. A **structure** is
 * one named part of the anatomy and one row in the part tree:
 *
 * ```
 * {
 *   id,               // stable and opaque outside the scene
 *   name, nameJa,
 *   hierarchy, hierarchyJa,   // where it sits; the last element is its family
 *   description, descriptionJa,
 *   meshes,           // one or more; a structure drawn from three meshes is
 *                     // still one structure and one row
 *   colors,           // { [colorModeId]: '#rrggbb' }
 *   revealAt,         // layer slider value it appears at (0 = always there)
 *   ghostAt,          // layer slider value it fades back to a hint at
 *   tags,             // free labels a viewpoint can hide by
 * }
 * ```
 *
 * Everything else — picking, hover, selection, isolation, the anatomical-layer
 * slider, colour modes, viewpoints and disposal — happens here.
 *
 * ## The three ways a structure can stop being on screen
 *
 * They are deliberately different things, and the reader is meant to be able to
 * tell them apart:
 *
 * - **Fading** (the layer slider). The organ becomes translucent so what is
 *   inside it can be seen *through* it. Nothing moves and nothing is removed.
 * - **Hiding** (a viewpoint that drops a side). The structure is gone, not
 *   see-through — the way one lung is taken away to look at the mediastinal
 *   surface of the other.
 * - **Isolating** (one structure alone). Everything else is gone; this is the
 *   reader asking "show me just this".
 *
 * All three go through one opacity path, so clearing any of them restores
 * exactly the model the reader had rather than a snapshot taken earlier. And
 * all three take the meshes they hide out of the pick candidates: a ray does
 * not know a mesh is invisible, and selecting something the reader cannot see
 * is the one failure they have no way to make sense of.
 */
export class OrganAnatomyScene {
  /** Anatomical orientation is information; a spinning organ is not. */
  static allowAutoRotate = false;

  constructor({ viewer } = {}) {
    this.viewer = viewer;
    this.root = new THREE.Group();
    this.root.name = this.constructor.meta?.id ?? 'organ-anatomy';

    /** Every pickable mesh, flattened out of the structures. */
    this.selectables = [];
    /** Structure id → its descriptor. The one index everything resolves through. */
    this.byId = new Map();
    this.structures = [];

    this.listeners = new Set();
    this.hoverListeners = new Set();
    this.statusListeners = new Set();
    this.isolationListeners = new Set();
    this.visibilityListeners = new Set();

    this.colorMode = this.constructor.colorModes?.[0]?.id ?? 'regions';
    this.activeView = this.constructor.views?.[0]?.id ?? null;
    this.hiddenTags = new Set();
    this.section = null;
    this.sectionPlane = null;
    /** Structures this cut deliberately leaves whole — see `_setSection`. */
    this.sectionKeeps = new Set();
    /** The faces drawn where the section plane passes through a solid. */
    this.caps = [];

    this.progress = 0;
    this.displayProgress = 0;
    this.selection = null;
    this.selected = null;
    this.hovered = null;
    this.isolatedId = null;
    /** Structures the reader took off screen, by id. Their own choice, kept. */
    this.manualHidden = new Set();

    this.built = false;
    this.disposed = false;
    this.ready = Promise.resolve(this.root);
    this.status = { state: 'idle', selectableCount: 0, meshCount: 0 };
  }

  // --- construction ---------------------------------------------------------

  /**
   * Build the organ. Subclasses implement it.
   *
   * @returns {{object: THREE.Object3D, structures: object[], dispose?: () => void}}
   */
  buildOrgan() {
    throw new Error(`${this.constructor.name} does not implement buildOrgan()`);
  }

  build() {
    if (this.built) return this.root;
    this.built = true;
    this.root.add(createStudioLights(this.constructor.lightRig ?? { key: 32, fill: 0.9, rim: 15 }));

    const organ = this.buildOrgan();
    this.organ = organ;
    this.root.add(organ.object);
    this._register(organ.structures ?? []);

    const initialView = this.constructor.views?.[0];
    if (initialView) this._applyViewState(initialView);

    this._bindPicking();
    this._applyLayers(1 / 60, true);
    this._setStatus({
      state: 'ready',
      // Structures, not meshes. A part drawn from three tubes is one thing a
      // reader can point at, and counting meshes overstates the model by
      // however many parts happen to be drawn in pieces.
      selectableCount: this.byId.size,
      meshCount: this.selectables.length,
    });
    return this.root;
  }

  /**
   * Take ownership of the meshes a builder returned.
   *
   * Every material is cloned. Organ builders legitimately share one material
   * across parts — it is cheaper, and until now nothing needed them apart — but
   * a shared material means highlighting one lobe highlights all five. Cloning
   * here is what makes "this structure, not that one" expressible at all.
   */
  _register(structures) {
    for (const structure of structures) {
      const meshes = (structure.meshes ?? []).filter((mesh) => mesh?.isMesh);
      if (!meshes.length) continue;
      if (this.byId.has(structure.id)) {
        throw new Error(`${this.constructor.name}: duplicate structure id "${structure.id}"`);
      }

      const entry = {
        note: null,
        noteJa: null,
        revealAt: 0,
        ghostAt: null,
        ghostOpacity: 0.07,
        baseOpacity: 1,
        preferredView: null,
        tags: [],
        /**
         * Draw the far wall as well as the near one.
         *
         * For a shape with a concavity deep enough to fold — a kidney's hilum
         * is one — front-face culling opens a hole straight through the organ
         * to the background, and the reader is looking at a bean with a window
         * in it. Off by default, because a closed solid does not need it and
         * pays for it.
         */
        doubleSided: false,
        /**
         * A shell that stands for a hollow organ, not the boundary of a solid.
         *
         * It decides what a cut leaves. `sectionFace` computes the outline of
         * the solid a closed mesh bounds, which is what a cut liver or kidney
         * shows; run over a stomach it draws the whole silhouette in gastric
         * pink and says the stomach is a lump of tissue. A cut bag shows a
         * lumen, and the honest way to draw one with a wall that has no
         * thickness is not to draw a face at all — the cut simply opens the
         * bag, and what is behind it is the inside of the far wall.
         *
         * Per structure, because an organ is rarely all one or the other: the
         * biliary scene is ducts around a solid pancreatic head, and the
         * stomach's sphincter is a ring of muscle in a wall that is a surface.
         * A scene whose parts are mostly hollow says so once with
         * `static hollowByDefault = true` and overrides the exceptions.
         */
        hollow: this.constructor.hollowByDefault ?? false,
        ...structure,
        meshes,
        currentOpacity: 1,
        currentTransparent: true,
        selected: false,
        hovered: false,
        hidden: false,
      };

      for (const mesh of meshes) {
        mesh.material = mesh.material.clone();
        mesh.material.transparent = true;
        if (entry.doubleSided) mesh.material.side = THREE.DoubleSide;
        mesh.material.depthWrite = true;
        const baseColor = new THREE.Color(entry.colors?.[this.colorMode] ?? mesh.material.color.getHex());
        mesh.material.color.copy(baseColor);
        if (mesh.material.emissive) mesh.material.emissive.copy(baseColor);
        mesh.userData = {
          ...mesh.userData,
          structureId: entry.id,
          baseColor,
          idleEmissiveIntensity: mesh.material.emissiveIntensity ?? 0.05,
        };
        this.selectables.push(mesh);
      }

      this.byId.set(entry.id, entry);
      this.structures.push(entry);
    }
  }

  // --- picking --------------------------------------------------------------

  _bindPicking() {
    const canvas = this.viewer?.renderer?.domElement;
    if (!canvas) return;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    // A drag is how the reader turns the organ, and it must not also select
    // whatever the pointer came to rest on. `tapGesture` measures both how far
    // the release is from the press and how far the pointer went in between —
    // the second is what a finger needs, because turning the model and turning
    // it back is one press that ends exactly where it started.
    const tap = createTapTracker();

    this._pointerDown = (event) => {
      tap.begin(event.clientX, event.clientY);
      this._setHovered(null);
    };
    this._pointerMove = (event) => {
      tap.move(event.clientX, event.clientY);
      if (event.buttons) return;
      const hit = this._pick(event);
      this._setHovered(hit?.object.userData.structureId ?? null);
      canvas.style.cursor = hit ? 'pointer' : 'grab';
    };
    this._pointerUp = (event) => {
      if (!tap.end(event.clientX, event.clientY)) return;
      const hit = this._pick(event);
      if (hit) this.selectStructure(hit.object.userData.structureId);
      else this.clearSelection();
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
    const candidates = this.selectables.filter((mesh) => mesh.visible && this._isPickable(mesh));
    const hits = this.raycaster.intersectObjects(candidates, false);
    if (!hits.length) return null;
    // A section plane is a real cut, so what is on the discarded side of it is
    // not there to be clicked either — the renderer stopped drawing it and the
    // ray has to agree.
    if (this.sectionPlane) {
      // ...unless the cut was declared not to be about it, in which case the
      // renderer never removed it and the ray must not either.
      return (
        hits.find(
          (hit) =>
            this.sectionKeeps.has(hit.object.userData.structureId) ||
            this.sectionPlane.distanceToPoint(hit.point) >= 0
        ) ?? null
      );
    }
    return hits[0];
  }

  _isPickable(mesh) {
    const structure = this.byId.get(mesh.userData.structureId);
    return Boolean(structure) && !structure.hidden && structure.currentOpacity > 0.14;
  }

  // --- selection and hover --------------------------------------------------

  /** @param {string} id */
  selectStructure(id) {
    const structure = this.byId.get(id);
    if (!structure) return false;
    if (this.selected && this.selected !== structure) {
      this.selected.selected = false;
      this._refreshHighlight(this.selected);
    }
    this.selected = structure;
    structure.selected = true;
    this._refreshHighlight(structure);
    this.selection = this._info(structure);
    for (const listener of this.listeners) listener(this.selection);
    return true;
  }

  clearSelection() {
    if (!this.selected && !this.selection) return;
    if (this.selected) {
      this.selected.selected = false;
      this._refreshHighlight(this.selected);
    }
    this.selected = null;
    this.selection = null;
    for (const listener of this.listeners) listener(null);
  }

  _setHovered(id) {
    const next = id == null ? null : this.byId.get(id) ?? null;
    if (next === this.hovered) return;
    if (this.hovered) {
      this.hovered.hovered = false;
      this._refreshHighlight(this.hovered);
    }
    this.hovered = next;
    if (next) {
      next.hovered = true;
      this._refreshHighlight(next);
    }
    const info = next ? this._info(next) : null;
    for (const listener of this.hoverListeners) listener(info);
  }

  _refreshHighlight(structure) {
    for (const mesh of structure.meshes) {
      const material = mesh.material;
      if (!material.emissive) continue;
      material.emissive.copy(
        structure.selected || structure.hovered ? HIGHLIGHT_COLOR : mesh.userData.baseColor
      );
      material.emissiveIntensity = structure.selected
        ? 0.3
        : structure.hovered
          ? 0.15
          : mesh.userData.idleEmissiveIntensity;
    }
  }

  /**
   * Everything a detail card needs about a structure, in both languages.
   *
   * Assembled from the descriptor rather than derived from the mesh, so the
   * name on the card and the label in the tree are one string and cannot come
   * to disagree.
   */
  _info(structure) {
    const hierarchy = structure.hierarchy ?? [];
    const hierarchyJa = structure.hierarchyJa ?? hierarchy;
    return {
      id: structure.id,
      name: structure.name,
      nameJa: structure.nameJa,
      side: structure.side ?? hierarchy[0] ?? '',
      sideJa: structure.sideJa ?? hierarchyJa[0] ?? '',
      region: structure.region ?? hierarchy[1] ?? hierarchy[0] ?? '',
      regionJa: structure.regionJa ?? hierarchyJa[1] ?? hierarchyJa[0] ?? '',
      category: structure.category ?? 'structure',
      categoryName: structure.categoryName ?? hierarchy.at(-1) ?? '',
      categoryNameJa: structure.categoryNameJa ?? hierarchyJa.at(-1) ?? '',
      hierarchy,
      hierarchyJa,
      breadcrumb: hierarchy.join(' › '),
      breadcrumbJa: hierarchyJa.join(' › '),
      description: structure.description,
      descriptionJa: structure.descriptionJa,
      note: structure.note ?? null,
      noteJa: structure.noteJa ?? null,
      preferredView: structure.preferredView ?? null,
      color: `#${structure.meshes[0].material.color.getHexString()}`,
      colorMode: this.colorMode,
    };
  }

  getAnatomySelection() { return this.selection; }

  getAnatomyHover() { return this.hovered ? this._info(this.hovered) : null; }

  onAnatomySelection(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onAnatomyHover(listener) {
    this.hoverListeners.add(listener);
    return () => this.hoverListeners.delete(listener);
  }

  // --- the part tree --------------------------------------------------------

  getAnatomyTree() {
    return buildAnatomyTree(
      this.structures.map((structure) => ({
        id: structure.id,
        name: structure.name,
        nameJa: structure.nameJa,
        hierarchy: structure.hierarchy,
        hierarchyJa: structure.hierarchyJa,
      }))
    );
  }

  // --- isolation ------------------------------------------------------------

  /** @param {string} id */
  isolateStructure(id) {
    if (!this.byId.has(id)) return false;
    this.isolatedId = id;
    this._applyLayers(1 / 60, true);
    this._emitIsolation();
    return true;
  }

  clearIsolation() {
    if (this.isolatedId == null) return false;
    this.isolatedId = null;
    this._applyLayers(1 / 60, true);
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

  // --- hiding ---------------------------------------------------------------

  /**
   * Taking a structure out of the way, which is not the same as isolating one.
   *
   * These scenes had isolation, viewpoint tags, cuts and the layer slider, and
   * no hiding at all — so a reader could say "show me only this" and never
   * "take this out of the way and let me see behind it". The panel drew a Hide
   * button anyway and its press reached an optional call that was simply
   * skipped, so on thirty-nine organs the control did nothing.
   *
   * A cut and the layer slider are the organ's own authored ways in; this is
   * the reader's. It asserts nothing anatomical: a hidden structure is still
   * there, still in the tree, still selectable by name, and `Unhide all` brings
   * every one of them back.
   */
  _visibilityChanged(droppedIsolation) {
    this._applyLayers(1 / 60, true);
    this._emitVisibility();
    // A hide that ends an isolation has to say so: the tree learns about
    // isolation from `onAnatomyIsolation` and nowhere else, so without this it
    // would go on marking a row isolated after the scene had stopped.
    if (droppedIsolation) this._emitIsolation();
  }

  /**
   * @param {string} id
   * @param {boolean} hidden
   * @returns {boolean} whether anything changed
   */
  setStructureHidden(id, hidden) {
    if (!this.byId.has(id)) return false;
    if (this.manualHidden.has(id) === Boolean(hidden)) return false;
    let droppedIsolation = false;
    if (hidden) {
      // "Only this one" and "not this one" cannot both be true.
      if (this.isolatedId === id) {
        this.isolatedId = null;
        droppedIsolation = true;
      }
      this.manualHidden.add(id);
    } else {
      this.manualHidden.delete(id);
    }
    this._visibilityChanged(droppedIsolation);
    return true;
  }

  /**
   * Hide or show many structures as one change.
   *
   * What a group row in the part tree presses. The single setter applies the
   * whole opacity pass and announces it on every call, which is right for one
   * structure and wrong for a branch: a lung's lobes would be one pass and one
   * repaint each, for one thing the reader asked for once.
   *
   * @param {Iterable<string>} ids
   * @param {boolean} hidden
   * @returns {boolean} whether anything changed
   */
  setStructuresHidden(ids, hidden) {
    let changed = false;
    let droppedIsolation = false;
    for (const id of ids) {
      if (!this.byId.has(id)) continue;
      if (this.manualHidden.has(id) === Boolean(hidden)) continue;
      if (hidden) {
        if (this.isolatedId === id) {
          this.isolatedId = null;
          droppedIsolation = true;
        }
        this.manualHidden.add(id);
      } else {
        this.manualHidden.delete(id);
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
   * The camera is not touched, and neither is the layer or the cut: "show the
   * ones I hid" and "put the organ back the way it opened" are two requests.
   */
  showAllHiddenStructures() {
    if (!this.manualHidden.size) return false;
    this.manualHidden.clear();
    // Showing never ends an isolation.
    this._visibilityChanged(false);
    return true;
  }

  /** The structures currently hidden by hand, as ids. */
  getAnatomyVisibility() { return { hidden: [...this.manualHidden] }; }

  onAnatomyVisibility(listener) {
    this.visibilityListeners.add(listener);
    return () => this.visibilityListeners.delete(listener);
  }

  _emitVisibility() {
    const hidden = [...this.manualHidden];
    for (const listener of this.visibilityListeners) listener({ hidden: [...hidden] });
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

  // --- viewpoints -----------------------------------------------------------

  /**
   * The bounds of what this scene is actually about, in world coordinates.
   *
   * Framing needs the subject, and the subject is not the same thing as
   * everything the scene draws: the kidney scene reaches from the upper poles
   * to the bladder, and a frame that fits all of it makes the organ it is
   * named after too small to point at. A scene can narrow this by tagging what
   * is context; by default it is everything drawn.
   *
   * **It is also not the same thing at every viewpoint.** A viewpoint can take
   * a side away and it can cut the organ open, and both change what there is to
   * frame: the coronal view of the kidney is a cut through both organs, and a
   * box around the *uncut* pair describes a subject half of which is no longer
   * drawn. Measured against it, the camera stood far enough back for the whole
   * pair and centred on a point between them — so the remaining halves sat at
   * the two edges of the frame with the middle of the picture empty. So a
   * hidden structure is left out here, and what a cut has taken away is taken
   * away here too.
   *
   * Isolation deliberately does not narrow it. The reader asking to see one
   * structure alone has not asked the camera to move, and a frame that dived at
   * every isolate and pulled back at every "show all" would be answering a
   * question about the part tree with a camera move.
   *
   * @param {{ excludeTags?: string[] }} [options]
   * @returns {THREE.Box3} never empty while anything is drawn
   */
  getSubjectBox({ excludeTags = this.constructor.contextTags ?? [] } = {}) {
    // `Box3.expandByObject` refreshes a mesh's own world matrix and not its
    // parents', so a scene that has not rendered yet reports every organ at the
    // origin: the kidney came back the right size in the wrong place, which is
    // the kind of wrong that looks right in a number.
    this.root.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const structure of this.structures) {
      if (structure.tags.some((tag) => excludeTags.includes(tag))) continue;
      if (structure.tags.some((tag) => this.hiddenTags.has(tag))) continue;
      for (const mesh of structure.meshes) box.expandByObject(mesh);
    }
    if (box.isEmpty()) return new THREE.Box3().setFromObject(this.root);
    return this.sectionPlane ? clipBoxToHalfSpace(box, this.sectionPlane) : box;
  }

  /**
   * The subject in the shape the framing asks for: a centre and eight corners.
   *
   * `src/app/framing.js` projects those corners onto the camera's own axes,
   * which is how a subject that is not a sphere gets a frame that is not built
   * around one. It reads `bounds.centre` and `bounds.corners` and **leaves the
   * pose untouched for anything else it is handed** — which is what this used
   * to hand it. Every procedural organ scene therefore opted out, silently, of
   * both the safe-area fit and the orbit limits that the brain and the heart
   * get: the authored pose was used as-is, so the model sat where the pose put
   * it rather than in the band the header, the console and the docked parts
   * panel leave for it.
   *
   * `null` when nothing is drawn, which the caller reads as "do not move the
   * camera" rather than as a subject at the origin.
   *
   * @param {{ excludeTags?: string[] }} [options]
   * @returns {{centre: THREE.Vector3, corners: THREE.Vector3[]}|null}
   */
  getSubjectBounds(options) {
    const box = this.getSubjectBox(options);
    if (box.isEmpty()) return null;
    const corners = [];
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
      }
    }
    return { centre: box.getCenter(new THREE.Vector3()), corners };
  }

  getAnatomyViews() {
    return (this.constructor.views ?? []).map(({ id, label, labelJa }) => ({ id, label, labelJa }));
  }

  getInspectionViews() { return this.getAnatomyViews(); }

  getAnatomyView(id) {
    const view = (this.constructor.views ?? []).find((candidate) => candidate.id === id);
    return view ? clonePose(view) : null;
  }

  getInspectionView(id) { return this.getAnatomyView(id); }

  setAnatomyView(id) {
    const view = (this.constructor.views ?? []).find((candidate) => candidate.id === id);
    if (!view) return false;
    this.activeView = id;
    this._applyViewState(view);
    this._applyLayers(1 / 60, true);
    return true;
  }

  setInspectionView(id) { return this.setAnatomyView(id); }

  /**
   * A viewpoint carries more than a camera pose: it can take a side away and it
   * can cut the organ open. Both are display, and neither changes what is
   * selected — a reader who has pinned a structure and then turns the model has
   * not asked to select something else.
   */
  _applyViewState(view) {
    this.hiddenTags = new Set(view.hideTags ?? []);
    this._setSection(view.section ?? null);
  }

  /**
   * Cut the organ on a plane.
   *
   * A cut is not a fade: the tissue in front of the plane is *gone*, and the
   * inside of what is left is on show.
   *
   * Only the clipping plane, and the renderer flag that makes it work. Drawing
   * the far wall as well — which is the obvious way to stop a cut solid looking
   * hollow — is what this did first, and it was wrong twice over: the cortex
   * shell's inner surface is *the same surface* the pyramids were carved
   * against, so drawing it put two coincident surfaces in the depth buffer and
   * the cut kidney showed its pyramids as a dotted stipple. Culled, the shell's
   * inner face is not drawn, and what is behind it — the pyramids, the columns,
   * the calyces — is what the reader sees through the cut. Which is the point
   * of cutting it.
   */
  _setSection(section) {
    const renderer = this.viewer?.renderer;
    if (!section) {
      this.section = null;
      this.sectionPlane = null;
      this.sectionKeeps = new Set();
      this._disposeSectionCaps();
      for (const mesh of this.selectables) mesh.material.clippingPlanes = null;
      if (renderer && this._clippingWas !== undefined) {
        renderer.localClippingEnabled = this._clippingWas;
        this._clippingWas = undefined;
      }
      return;
    }
    if (renderer) {
      if (this._clippingWas === undefined) this._clippingWas = renderer.localClippingEnabled;
      renderer.localClippingEnabled = true;
    }
    this.section = section;
    this.sectionPlane = new THREE.Plane(new THREE.Vector3(...section.normal).normalize(), section.constant ?? 0);
    /**
     * What the cut is *of*, and what merely passes through it.
     *
     * A section plane is declared to open one organ, and it removes fragments
     * from everything in the scene. On the kidney's coronal section that took
     * the ureters with it: they leave the hilum and curve forward as they
     * descend, so the further down the tube the more of it lies on the
     * discarded side, and what survives is a crescent of wall that narrows to
     * nothing — a tube drawn as a flat blade (F-144). Capping does not help,
     * because the tube is not being opened, it is being deleted.
     *
     * So a view may name the tags its cut is not about. They keep their whole
     * geometry, get no cut face, and stay clickable on both sides of the
     * plane. It is deliberately **not** `contextTags`: that says what the
     * frame is fitted to, and the two questions have no reason to agree.
     */
    const keepTags = section.keepTags ?? [];
    this.sectionKeeps = new Set(
      keepTags.length
        ? this.structures.filter((structure) => structure.tags.some((tag) => keepTags.includes(tag))).map((s) => s.id)
        : []
    );
    for (const mesh of this.selectables) {
      mesh.material.clippingPlanes = this.sectionKeeps.has(mesh.userData.structureId) ? null : [this.sectionPlane];
    }
    this._buildSectionCaps();
  }

  /**
   * Draw the face the cut leaves.
   *
   * A clipping plane removes fragments; it does not close what it opens. On
   * the kidney that reads correctly, because the cortex shell has pyramids,
   * columns and calyces behind it and the cut is a way of seeing them. On an
   * organ whose parts are hollow shells it does not: the transverse liver was
   * eight open segments seen from the inside, with the portal branches as
   * stubs floating in mid-air, and the coronal lung was a pair of translucent
   * domes. Neither reads as a cut organ, which is what the viewpoint calls it.
   *
   * So the cross-section is computed from the triangles, once, when the cut is
   * applied, and drawn as an ordinary mesh in the structure's own colour —
   * `geometry/sectionFace.js` says how, and why it is not the stencil count
   * the first version of this used.
   *
   * **Only structures the plane crosses.** Everything wholly on one side has
   * no face, and looking for one costs a pass over its triangles for nothing.
   * A structure whose mesh is not closed gets no face either: `sectionFace`
   * returns `null` rather than closing a loop over a boundary that is part of
   * the model.
   */
  _buildSectionCaps() {
    this._disposeSectionCaps();
    const plane = this.sectionPlane;
    if (!plane) return;

    this.root.updateMatrixWorld(true);
    // Just inside the solid. On the plane exactly, the clip test that keeps
    // the half is deciding on zero, and a face flickers along the edge of its
    // own cut as the model turns.
    const bias = (this.getSubjectBox({ excludeTags: [] }).getSize(new THREE.Vector3()).length() || 1) * 1e-4;

    // Two structures can be cut in the same place: the portal branches run
    // *through* the segments, so a vein's face and its segment's face are the
    // same plane at the same depth, and the depth buffer flickered between
    // them a hundred and thirty pixels at a time. Rank by size and let the
    // smaller one win — inside a liver, the thing inside the other thing is
    // the smaller one — using a polygon offset, which is the tie-break the
    // depth buffer has for exactly this.
    const ranked = new Map();
    const crossings = [];
    for (const structure of this.structures) {
      // A hollow viscus is opened by a cut, not faced by one.
      if (structure.hollow) continue;
      // Neither is one the cut was declared not to be about: it is not cut.
      if (this.sectionKeeps.has(structure.id)) continue;
      for (const mesh of structure.meshes) {
        if (!meshCrossesPlane(mesh, plane)) continue;
        mesh.geometry.computeBoundingSphere();
        crossings.push({ mesh, radius: mesh.geometry.boundingSphere?.radius ?? 0 });
      }
    }
    crossings.sort((a, b) => b.radius - a.radius);
    crossings.forEach((entry, rank) => ranked.set(entry.mesh, rank));

    for (const structure of this.structures) {
      if (structure.hollow || this.sectionKeeps.has(structure.id)) continue;
      const faces = [];
      for (const mesh of structure.meshes) {
        if (!ranked.has(mesh)) continue;
        // The cut is computed in the mesh's own coordinates, so the face can
        // ride the mesh: whatever the organ does to it above — position,
        // scale, a parent group — the face goes with it.
        const local = plane.clone().applyMatrix4(new THREE.Matrix4().copy(mesh.matrixWorld).invert());
        const geometry = sectionFaceGeometry(mesh.geometry, local);
        if (!geometry) continue;
        const material = new THREE.MeshStandardMaterial({
          color: mesh.userData.baseColor.clone(),
          roughness: 0.78,
          metalness: 0,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: structure.currentOpacity,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1 - ranked.get(mesh),
        });
        const face = new THREE.Mesh(geometry, material);
        face.position.copy(local.normal).multiplyScalar(bias);
        face.renderOrder = mesh.renderOrder;
        face.userData.sectionCap = true;
        mesh.add(face);
        faces.push(face);
      }
      if (faces.length) this.caps.push({ structureId: structure.id, faces });
    }
    this._syncSectionCaps();
  }

  /** Faces follow what the structures are doing: the colour, and how visible. */
  _syncSectionCaps() {
    for (const cap of this.caps) {
      const structure = this.byId.get(cap.structureId);
      if (!structure) continue;
      const colour = structure.meshes[0].userData.baseColor;
      for (const face of cap.faces) {
        face.visible = !structure.hidden && structure.currentOpacity > 0.012;
        face.material.opacity = structure.currentOpacity;
        face.material.depthWrite = structure.currentOpacity > 0.9;
        if (!face.material.color.equals(colour)) face.material.color.copy(colour);
      }
    }
  }

  _disposeSectionCaps() {
    for (const cap of this.caps) {
      for (const face of cap.faces) {
        face.removeFromParent();
        face.geometry.dispose();
        face.material.dispose();
      }
    }
    this.caps = [];
  }

  // --- colour ---------------------------------------------------------------

  getAnatomyColorModes() {
    return (this.constructor.colorModes ?? []).map((mode) => ({ ...mode }));
  }

  getInspectionModes() {
    return (this.constructor.colorModes ?? []).map((mode) => ({ ...mode }));
  }

  getAnatomyColorMode() { return this.colorMode; }

  getInspectionMode() { return this.getAnatomyColorMode(); }

  getAnatomyLegendPalette(id = this.colorMode) {
    const palette = {};
    for (const structure of this.structures) {
      const key = structure.legendKey;
      if (key && !palette[key]) palette[key] = structure.colors?.[id] ?? '#888888';
    }
    return { ...(this.constructor.legendPalettes?.[id] ?? palette) };
  }

  getInspectionLegendPalette(id = this.colorMode) { return this.getAnatomyLegendPalette(id); }

  setAnatomyColorMode(id) {
    const modes = this.constructor.colorModes ?? [];
    if (!modes.some((mode) => mode.id === id) || id === this.colorMode) return false;
    this.colorMode = id;
    for (const structure of this.structures) {
      const hex = structure.colors?.[id];
      if (hex == null) continue;
      const color = new THREE.Color(hex);
      for (const mesh of structure.meshes) {
        mesh.userData.baseColor.copy(color);
        mesh.material.color.copy(color);
      }
      this._refreshHighlight(structure);
    }
    if (this.caps.length) this._syncSectionCaps();
    if (this.selected) {
      this.selection = this._info(this.selected);
      for (const listener of this.listeners) listener(this.selection);
    }
    if (this.hovered) {
      const info = this._info(this.hovered);
      for (const listener of this.hoverListeners) listener(info);
    }
    return true;
  }

  setInspectionMode(id) { return this.setAnatomyColorMode(id); }

  // --- the anatomical-layer slider -----------------------------------------

  setProgress(value) { this.progress = clamp(value); }

  update(dt) {
    if (!this.selectables.length) return;
    this.displayProgress = damp(this.displayProgress, this.progress, 8, dt);
    this._applyLayers(dt, false);
    this.updateOrgan?.(dt);
  }

  /**
   * One place decides every structure's opacity, every frame.
   *
   * Architecture rule 3: the layer slider, the viewpoint's hidden side and
   * isolation all want a say in whether a mesh is on screen, and if each wrote
   * `material.opacity` from where it happens to be handled they would take
   * turns overwriting one another. They are inputs here, and the answer is
   * computed once.
   */
  _applyLayers(dt, snap) {
    const p = this.displayProgress;
    for (const structure of this.structures) {
      // Three things want a say in whether this structure is on screen, and
      // they are resolved in an order rather than OR'd together — architecture
      // rule 3: one place decides. `_isPickable` reads the same flag, so a
      // structure that is not drawn stops being clickable without a second rule
      // saying so.
      //
      // **Isolation wins outright**, which is the order the brain atlas already
      // resolves and its model card already states: "only this one" means only
      // this one, whatever the viewpoint or the reader's own hide had to say.
      // OR'ing them instead blanks the model — isolate a structure the active
      // viewpoint hides and every structure is hidden, the isolated one by the
      // viewpoint and the rest by the isolation. That was reachable before
      // hiding existed here, through `right-mediastinal` on the lung: 0 of 83
      // structures drawn. Isolation writes nothing down, so clearing it hands
      // the viewpoint and the reader's hidden set back exactly as they were.
      if (this.isolatedId != null) structure.hidden = structure.id !== this.isolatedId;
      else {
        const hiddenByView = structure.tags.some((tag) => this.hiddenTags.has(tag));
        structure.hidden = hiddenByView || this.manualHidden.has(structure.id);
      }

      let target;
      if (structure.hidden) target = 0;
      // **Isolating shows the structure, whatever it looks like in situ.**
      // This left it at `baseOpacity`, which is right for the parts that are
      // opaque and useless for the ones that are not: "show me only this"
      // answered with a cornea at eight per cent is a blank frame — and a
      // structure you cannot see in place is exactly the one a reader isolates.
      // Nothing else is drawn, so there is nothing left for it to be
      // see-through against.
      else if (this.isolatedId === structure.id) target = 1;
      else {
        // A cut has already taken the tissue in front away, so what is inside
        // is *there* — gating it on the slider as well would leave the reader
        // looking into an empty shell, which is what the coronal view of the
        // kidney showed before this line existed. Fading still works on top: a
        // cut organ whose cortex is also faded is a legitimate thing to ask
        // for, and it is the slider that asks for it.
        const reveal =
          this.section || structure.revealAt <= 0
            ? 1
            : smoothstep(structure.revealAt - 0.14, structure.revealAt + 0.14, p);
        const ghost = structure.ghostAt == null ? 0 : smoothstep(structure.ghostAt - 0.14, structure.ghostAt + 0.14, p);
        target = lerp(structure.baseOpacity, structure.ghostOpacity, ghost) * reveal;
      }

      // An ease that halves the distance every frame never arrives, so a scene
      // at rest is still changing in the fifth decimal — and a model that never
      // stops changing cannot be photographed. Two frames of a settled cut
      // liver differed by one pixel for that reason, which is invisible to a
      // reader and fatal to a check that waits for the picture to stop moving.
      // Close enough is arrival; the same reason `createRandom` is seeded.
      const eased = snap ? target : damp(structure.currentOpacity, target, 10, dt);
      const opacity = Math.abs(target - eased) < 0.0005 ? target : eased;
      structure.currentOpacity = opacity;
      // Solid tissue leaves the transparent pass entirely.
      //
      // A material with `transparent: true` is sorted back-to-front by its
      // centroid whatever its opacity, and a cortex shell and the pyramids
      // inside it share a centroid: the sort had no way to order them and the
      // cut kidney showed its pyramids in dashes, through a shell that is not
      // see-through. At opacity 1 there is nothing to blend, so it belongs in
      // the opaque pass where the depth buffer decides.
      const transparent = opacity < 0.999;
      const changed = structure.currentTransparent !== transparent;
      structure.currentTransparent = transparent;
      for (const mesh of structure.meshes) {
        mesh.material.opacity = opacity;
        mesh.material.depthWrite = opacity > 0.9;
        if (changed) {
          mesh.material.transparent = transparent;
          // Only on a change: the flag is compiled into the material, and
          // rewriting it every frame recompiles every material every frame.
          mesh.material.needsUpdate = true;
        }
        mesh.visible = opacity > 0.012;
      }
    }
    if (this.caps.length) this._syncSectionCaps();
  }

  /** Nothing to point at by default; a subclass with landmarks overrides it. */
  getAnnotations() { return []; }

  // --- teardown -------------------------------------------------------------

  dispose() {
    this.disposed = true;
    const canvas = this.viewer?.renderer?.domElement;
    canvas?.removeEventListener('pointerdown', this._pointerDown);
    canvas?.removeEventListener('pointermove', this._pointerMove);
    canvas?.removeEventListener('pointerup', this._pointerUp);
    canvas?.removeEventListener('pointerleave', this._pointerLeave);
    canvas?.removeEventListener('pointercancel', this._pointerCancel);
    // The renderer outlives this scene. A cut left switched on would follow the
    // reader to whatever they open next.
    if (this.viewer?.renderer && this._clippingWas !== undefined) {
      this.viewer.renderer.localClippingEnabled = this._clippingWas;
      this._clippingWas = undefined;
    }
    this._disposeSectionCaps();
    this.listeners.clear();
    this.hoverListeners.clear();
    this.statusListeners.clear();
    this.isolationListeners.clear();
    this.visibilityListeners.clear();
    this.selected = null;
    this.hovered = null;
    this.selection = null;
    this.isolatedId = null;
    this.manualHidden.clear();
    this.organ?.dispose?.();
    disposeObject(this.root);
  }
}

const HIGHLIGHT_COLOR = new THREE.Color('#ffffff');

function clonePose(view) {
  return {
    position: new THREE.Vector3(...view.position),
    target: new THREE.Vector3(...(view.target ?? [0, 0, 0])),
  };
}

/**
 * The box around what is left of `box` on the kept side of `plane`.
 *
 * A clipping plane keeps the half-space the plane's normal points into — the
 * same side `_getStructureAt` accepts a hit from — and the region that leaves
 * is a convex solid whose corners are the box corners that survived plus the
 * points where the plane crosses the box's edges. Taking the box of exactly
 * those points is the cut's own extent rather than an estimate of it, for any
 * plane: the section planes in use are axis-aligned today, and a diagonal one
 * would be framed just as correctly without anybody remembering this.
 *
 * The result is an outer bound of the cut *geometry*, not of the box: it can be
 * larger than what the cut actually leaves. That is the right way round for
 * framing, which must not crop the subject.
 *
 * A cut that removes the whole subject returns the box unchanged. There is
 * nothing to frame in that case and the pose the viewpoint authored is a better
 * answer than an empty box at the origin.
 */
/**
 * Does the plane pass through this mesh, rather than past it?
 *
 * Measured on the world bounding box, which can say yes for a mesh the plane
 * misses — a box is not its contents. That is the right way to be wrong here:
 * a face the stencil finds empty costs a draw, and a face skipped for a solid
 * the plane really does cross is a hole in the cut.
 */
function meshCrossesPlane(mesh, plane) {
  const box = new THREE.Box3().setFromObject(mesh);
  if (box.isEmpty()) return false;
  let inside = false;
  let outside = false;
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        if (plane.distanceToPoint(corner.set(x, y, z)) >= 0) inside = true;
        else outside = true;
        if (inside && outside) return true;
      }
    }
  }
  return false;
}
const corner = new THREE.Vector3();

function clipBoxToHalfSpace(box, plane) {
  const corners = [];
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
    }
  }
  const kept = corners.filter((corner) => plane.distanceToPoint(corner) >= 0);
  // The twelve edges, as index pairs into the corner order built above.
  const EDGES = [
    [0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3],
    [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7],
  ];
  for (const [a, b] of EDGES) {
    const from = corners[a];
    const to = corners[b];
    const dFrom = plane.distanceToPoint(from);
    const dTo = plane.distanceToPoint(to);
    if ((dFrom >= 0) === (dTo >= 0)) continue;
    kept.push(from.clone().lerp(to, dFrom / (dFrom - dTo)));
  }
  return kept.length ? new THREE.Box3().setFromPoints(kept) : box;
}
