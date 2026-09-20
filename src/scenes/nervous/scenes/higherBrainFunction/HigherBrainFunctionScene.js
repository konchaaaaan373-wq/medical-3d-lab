import * as THREE from 'three';

import {
  DISCLAIMER, DISCLAIMER_JA, DISCLAIMER_SHORT, DISCLAIMER_SHORT_JA,
  LEGEND, LESION_NOTES, MODEL_CONTROLS_COPY, MODEL_SCOPE, PALETTE,
  PROGRESS_LABEL, RANGE, RELATED, STAGES, STRUCTURE_NAMES_JA, TASK_PROBES, TASK_READOUT_LABELS, TRACEABLE_TASKS, VISUAL_MAPPING,
} from '../../../../data/higherBrainFunction.js';
import {
  FUNCTION_STATUS, FUNCTION_TASKS, LESION_SITES,
  lesionSiteById, solveHigherBrainFunction,
} from '../../../../models/higherBrainFunction.js';
import {
  ATLAS_CATEGORIES, brainAtlasMetadata, loadBrainAtlas, placeBrainAtlas,
} from '../../organs/brainAtlasSource.js';
import { brainStructureInfo } from '../../../../data/brainAnatomy.js';
import { disposeObject } from '../../../../utils/dispose.js';
import { clamp } from '../../../../utils/math.js';
import { createStudioLights } from '../../../shared/lighting.js';

/**
 * A higher cortical function, drawn as the route it takes through the brain.
 *
 * ### What is on screen and what is doing the deciding
 *
 * The brain is the atlas, unmoved: the same meshes the anatomy scene lets a
 * reader select, in the same places. Everything this scene adds is a *reading*
 * of one solved state from `src/models/higherBrainFunction.js` — which
 * structures the lesion has taken, which network each lit structure belongs to,
 * and where along the traced task the signal stops. **The scene solves
 * nothing.** If the picture and the read-out ever disagree, one of them has
 * stopped reading the model.
 *
 * ### The route is drawn through the tract, not over it
 *
 * A step between two nodes is placed at the mesh the model says that connection
 * runs inside — the arcuate fasciculus for the dorsal language route, the
 * corpus callosum for a crossing. So the line a reader follows bends through
 * the white matter the way the fibres do, and a disconnection lesion lights up
 * the bundle it cuts rather than a gap between two gyri.
 *
 * ### Colour encodes damage and network, never emphasis
 *
 * A structure's colour says which network it belongs to and how much of it the
 * lesion has taken. Nothing here brightens a structure because it is the
 * subject of the current stage: the physiology and the presentation are kept
 * apart (architecture rule 4), so the only thing that moves a colour is the
 * solved state.
 */
export class HigherBrainFunctionScene {
  static meta = {
    id: 'higher-brain-function',
    status: 'alpha',
    title: 'Higher cortical function: which route the lesion took away',
    titleJa: '高次脳機能：その病変が奪ったのはどの経路か',
    subtitle: 'A right-handed brain. Each task is a route through named structures, and the syndrome is what the surviving routes spell.',
    subtitleJa: '右利きの脳。1 つの課題は名前の付いた構造を通る 1 本の経路で、症候名は残った経路が綴る言葉です。',
    stages: STAGES,
    legend: LEGEND,
    palette: PALETTE,
    range: RANGE,
    progressLabel: PROGRESS_LABEL,
    related: RELATED,
    visualMapping: VISUAL_MAPPING,
    modelScope: MODEL_SCOPE,
    modelControls: MODEL_CONTROLS_COPY,
    disclaimer: DISCLAIMER,
    disclaimerJa: DISCLAIMER_JA,
    disclaimerShort: DISCLAIMER_SHORT,
    disclaimerShortJa: DISCLAIMER_SHORT_JA,
  };

  /** The left lateral view: the face of the brain this subject lives on. */
  static cameraPose = {
    position: new THREE.Vector3(-5.25, 0.23, 0.25),
    target: new THREE.Vector3(0, -0.35, 0),
  };

  /** Which network each node belongs to, for colour only. */
  static NETWORK_OF_NODE = Object.freeze({
    'auditory-input': 'language',
    'phonological-analysis': 'language',
    'lexical-semantic': 'language',
    'cross-modal-integration': 'language',
    'speech-initiation': 'language',
    'phonological-output': 'language',
    'speech-motor': 'language',
    'visual-input-dominant': 'visual',
    'visual-input-nondominant': 'visual',
    'ventral-visual-form': 'visual',
    'praxis-formula': 'praxis',
    'premotor-dominant': 'praxis',
    'premotor-nondominant': 'praxis',
    'hand-motor-dominant': 'praxis',
    'hand-motor-nondominant': 'praxis',
    'spatial-attention-dominant': 'attention',
    'spatial-attention-nondominant': 'attention',
    'medial-temporal-memory': 'memory',
    'limbic-memory-relay': 'memory',
    'dorsolateral-prefrontal': 'executive',
    orbitofrontal: 'executive',
    'medial-frontal-drive': 'executive',
    'dorsal-striatum': 'executive',
    'ventral-striatum': 'executive',
    'pallidal-outflow': 'executive',
    'mediodorsal-thalamus': 'executive',
  });

  /**
   * The grey structures inside the brain, which a reader cannot see at all
   * unless the cortex in front of them is faded.
   *
   * White matter is deliberately not here. Almost every connection in the
   * model is anchored in it, so counting it would make every route "deep" and
   * fade the cortex on a route that never leaves the surface.
   */
  static DEEP_CATEGORIES = new Set([ATLAS_CATEGORIES.DEEP_GREY, ATLAS_CATEGORIES.DIENCEPHALON]);

  /**
   * How far the cortex is faded to show a route that runs underneath it.
   *
   * Low, because a reader looks through **two** layers of it — the near wall
   * and the far one — and at 0.26 each the caudate behind them came out at
   * about half strength and read as a smudge. Measured from the picture, not
   * chosen: `docs/organ-3d-playbook.md` on two-sided shells compositing twice.
   */
  static CORTEX_GHOST_OPACITY = 0.14;

  /** Categories drawn as the brain a reader is looking at. */
  static CONTEXT_CATEGORIES = new Set([
    ATLAS_CATEGORIES.CORTEX, ATLAS_CATEGORIES.DEEP_GREY, ATLAS_CATEGORIES.DIENCEPHALON,
    ATLAS_CATEGORIES.WHITE_MATTER, ATLAS_CATEGORIES.CEREBELLUM, ATLAS_CATEGORIES.BRAINSTEM,
  ]);

  static DEFAULT_CONTROLS = Object.freeze({ lesion: 'dominant-inferior-frontal', task: 'repetition' });

  constructor({ viewer, atlas, atlasLoader } = {}) {
    this.viewer = viewer ?? null;
    this.atlasSource = atlas ?? null;
    this.atlasLoader = atlasLoader ?? loadBrainAtlas;
    this.root = new THREE.Group();
    this.root.name = HigherBrainFunctionScene.meta.id;
    this.atlasRoot = new THREE.Group();
    this.atlasRoot.name = 'brain-atlas';
    this.root.add(this.atlasRoot);

    this.progress = 0;
    this.controls = { ...HigherBrainFunctionScene.DEFAULT_CONTROLS };
    this.solved = this.solveModel();

    /** `label|side` → the meshes that draw that structure. */
    this.meshesByStructure = new Map();
    /** `label|side` → its centre in the scene's coordinates. */
    this.centroids = new Map();
    this.built = false;
    this.disposed = false;
    this.pageLeaving = false;
    this.ready = Promise.resolve(this.root);
    this.pulseTime = 0;

    this._pageHide = () => { this.pageLeaving = true; };
    if (typeof window !== 'undefined') window.addEventListener('pagehide', this._pageHide);
  }

  // --- lifecycle ------------------------------------------------------------

  build() {
    if (this.built) return this.root;
    this.built = true;
    this.root.add(createStudioLights({ key: 34, fill: 0.92, rim: 14 }));

    this.routeGroup = new THREE.Group();
    this.routeGroup.name = 'traced-route';
    this.root.add(this.routeGroup);

    this.pulseMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.carrying, depthTest: false });
    this.pulseGeometry = new THREE.SphereGeometry(0.075, 16, 12);
    this.pulse = new THREE.Mesh(this.pulseGeometry, this.pulseMaterial);
    this.pulse.renderOrder = 30;
    this.pulse.name = 'task-signal';
    this.pulse.visible = false;
    this.routeGroup.add(this.pulse);

    if (this.atlasSource) {
      this.attachAtlas(this.atlasSource);
    } else if (this.viewer?.renderer?.domElement) {
      this.ready = this._loadAtlas();
    }
    return this.root;
  }

  async _loadAtlas() {
    try {
      const atlas = await this.atlasLoader();
      if (this.disposed) {
        disposeObject(atlas.scene ?? atlas);
        return this.root;
      }
      this.attachAtlas(atlas);
    } catch (error) {
      // A scene disposed, or a document left, while the atlas was still in
      // flight cancelled the fetch itself. That is not a failure of the atlas,
      // and reporting it prints an error onto whatever page the reader went to.
      if (this.disposed || this.pageLeaving) return this.root;
      console.error('[higher-brain-function] atlas load failed', error);
    }
    return this.root;
  }

  /**
   * Adopt a loaded atlas. Public so a headless test can hand over a fixture and
   * exercise the same indexing, materials and route building as the browser.
   */
  attachAtlas(atlas) {
    if (this.disposed) return;
    const model = atlas.scene ?? atlas;
    if (!model?.isObject3D) throw new TypeError('the brain atlas must contain a THREE.Object3D scene');

    // Adopting a second atlas has to let go of the first, or its meshes and
    // their materials stay on the GPU with nothing pointing at them.
    for (const child of [...this.atlasRoot.children]) disposeObject(child);
    this.atlasRoot.clear();
    this.meshesByStructure.clear();
    this.centroids.clear();

    placeBrainAtlas(model, this.atlasRoot);
    this.root.updateMatrixWorld(true);

    model.traverse((object) => {
      if (!object.isMesh) return;
      const metadata = brainAtlasMetadata(object, model);
      const label = metadata.bx_label;
      const side = metadata.bx_side;
      if (!label || !side) { object.visible = false; return; }
      const category = metadata.bx_cat;
      const isContext = HigherBrainFunctionScene.CONTEXT_CATEGORIES.has(category);
      const isTract = category === ATLAS_CATEGORIES.TRACTS;
      if (!isContext && !isTract) { object.visible = false; return; }

      const colour = new THREE.Color(PALETTE.tissue);
      object.material = new THREE.MeshStandardMaterial({
        color: colour,
        emissive: colour.clone(),
        emissiveIntensity: 0.02,
        roughness: 0.78,
        metalness: 0,
        transparent: true,
        opacity: 1,
        side: THREE.FrontSide,
      });
      object.userData = { ...object.userData, ...metadata, structureKey: `${label}|${side}`, isTract };
      const key = `${label}|${side}`;
      const pieces = this.meshesByStructure.get(key);
      if (pieces) pieces.push(object);
      else this.meshesByStructure.set(key, [object]);
    });

    this._measureCentroids();
    this.applyModelToScene();
  }

  dispose() {
    this.disposed = true;
    if (typeof window !== 'undefined') window.removeEventListener('pagehide', this._pageHide);
    this.pulseGeometry?.dispose();
    this.pulseMaterial?.dispose();
    this._disposeRouteLine();
    disposeObject(this.root);
    this.root.clear();
    this.meshesByStructure.clear();
    this.centroids.clear();
  }

  // --- the one state the UI moves ------------------------------------------

  setProgress(value) {
    this.progress = clamp(value);
    this.solve();
  }

  setModelControl(id, value) {
    if (!(id in this.controls)) return;
    this.controls[id] = value;
    this.solve();
  }

  resetModelControls() {
    this.controls = { ...HigherBrainFunctionScene.DEFAULT_CONTROLS };
    this.solve();
  }

  getModelControls() {
    return [
      {
        id: 'lesion',
        kind: 'choice',
        label: 'Where the lesion is',
        labelJa: '病変の場所',
        value: this.controls.lesion,
        // No "none" option: the progress slider already starts at an intact
        // brain, and offering the same state twice makes a pair of controls
        // that can disagree about which one is in charge of it.
        options: [
          ...LESION_SITES.map((site) => ({
            value: site.id,
            label: site.label,
            labelJa: site.labelJa,
            effect: `${LESION_NOTES[site.id]?.text ?? ''} Usually: ${site.usualCause}.`.trim(),
            effectJa: `${LESION_NOTES[site.id]?.textJa ?? ''}原因：${site.usualCauseJa}。`.trim(),
          })),
        ],
      },
      {
        id: 'task',
        kind: 'choice',
        label: 'Which task is traced',
        labelJa: '辿る課題',
        value: this.controls.task,
        // Label only. The probe — what a clinician would actually ask — is on
        // the read-out for whichever task is traced, so thirteen cards here do
        // not each carry a sentence of prose over the brain they are about.
        // In the order the copy layer lists them: the buttons are a reading
        // order, and the model's own order is the order the network was
        // written in.
        options: TRACEABLE_TASKS.map((id) => {
          const task = FUNCTION_TASKS.find((candidate) => candidate.id === id);
          return {
            value: id,
            label: TASK_READOUT_LABELS[id]?.label ?? task.label,
            labelJa: TASK_READOUT_LABELS[id]?.labelJa ?? task.labelJa,
          };
        }),
      },
    ];
  }

  solveModel() {
    const site = lesionSiteById(this.controls.lesion);
    return solveHigherBrainFunction({
      handedness: 'right',
      lesions: site ? [site] : [],
      extent: this.progress,
    });
  }

  solve() {
    this.solved = this.solveModel();
    this.applyModelToScene();
  }

  /** The solved task the controls are tracing. */
  tracedTask() {
    return this.solved.tasks.find((task) => task.id === this.controls.task) ?? this.solved.tasks[0];
  }

  // --- reading the model onto the atlas ------------------------------------

  /**
   * Colour, brightness and visibility for every atlas mesh, from the solved
   * state and from nothing else. This is the only place they are written.
   */
  applyModelToScene() {
    if (this.meshesByStructure.size === 0) return;
    const damage = new Map(
      this.solved.affectedStructures.map((structure) => [`${structure.label}|${structure.side}`, structure.damage])
    );
    // A structure can belong to two nodes — the dominant supramarginal gyrus
    // holds the praxis formulas and is part of the parietal attention system —
    // and it has one colour. The first node to claim it keeps it, so the colour
    // is a property of the network rather than of the order this loop runs in.
    const network = new Map();
    for (const node of this.solved.nodes) {
      const family = HigherBrainFunctionScene.NETWORK_OF_NODE[node.id];
      for (const structure of node.structures) {
        const key = `${structure.label}|${structure.side}`;
        if (!network.has(key)) network.set(key, family);
      }
    }
    const traced = this.tracedTask();
    const routeAnchors = new Set(this._routeStructureKeys(traced));
    const lesionColour = new THREE.Color(PALETTE.lesion);
    // The frontal–subcortical circuits are almost entirely inside the brain:
    // the caudate, the pallidum and the thalamus are behind an opaque cortex,
    // so tracing one drew a line diving into a solid object. When the route
    // goes under the surface the cortex is faded to show what it is running
    // through. Presentation only — nothing moves, nothing resizes, and no
    // colour that encodes damage is touched (architecture rule 4).
    const routeRunsDeep = [...routeAnchors].some((key) => {
      const meshes = this.meshesByStructure.get(key) ?? [];
      return meshes.some((mesh) => HigherBrainFunctionScene.DEEP_CATEGORIES.has(mesh.userData.bx_cat));
    });

    for (const [key, meshes] of this.meshesByStructure) {
      const hurt = damage.get(key) ?? 0;
      const family = network.get(key);
      const onRoute = routeAnchors.has(key);
      const base = new THREE.Color(family ? PALETTE[family] : PALETTE.tissue);
      // Linear, with no step at the bottom: the colour says *how much* of the
      // structure the lesion took, and a floor made a structure the lesion had
      // barely touched read as a third destroyed.
      const colour = hurt > 0 ? base.clone().lerp(lesionColour, hurt) : base;
      for (const mesh of meshes) {
        const isTract = mesh.userData.isTract === true;
        const isCortex = mesh.userData.bx_cat === ATLAS_CATEGORIES.CORTEX;
        const ghosted = routeRunsDeep && isCortex && !onRoute && hurt === 0;
        // Fading the cortex was not enough on its own: a caudate seen through
        // two translucent walls of gyri, at the size it really is, reads as a
        // smudge and a reader cannot tell it is there at all. When the traced
        // route goes under the surface, the structures **that route runs
        // through** are drawn in front of the brain instead — in their own
        // places, at their own size, with nothing moved. It is the same
        // decision the route line itself makes, and the visual mapping says so.
        // Only what is actually hidden. Lifting the route's cortical node as
        // well put a whole lateral gyrus in front of the caudate sitting
        // behind it — the two overlap completely in a lateral projection, and
        // with depth testing off the gyrus simply painted over the structure
        // this was meant to reveal.
        const liftedToFront = routeRunsDeep && onRoute
          && HigherBrainFunctionScene.DEEP_CATEGORIES.has(mesh.userData.bx_cat);
        // A tract is drawn when this task runs through it or when the lesion
        // has taken it. The other fifty are anatomy this scene is not about.
        mesh.visible = !isTract || onRoute || hurt > 0;
        mesh.material.color.copy(colour);
        mesh.material.emissive.copy(colour);
        mesh.material.emissiveIntensity = (family ? 0.1 : 0.02) + hurt * 0.08;
        mesh.material.opacity = ghosted
          ? HigherBrainFunctionScene.CORTEX_GHOST_OPACITY
          : (isTract ? 0.92 : 1);
        // A ghost is something the reader is looking *through*; writing depth
        // for it would hide the deep structures it was faded to reveal.
        mesh.material.depthWrite = !ghosted && !liftedToFront;
        mesh.material.depthTest = !liftedToFront;
        mesh.renderOrder = liftedToFront ? 24 : 0;
      }
    }

    this._buildRouteLine(traced);
  }

  /** Every structure the traced route passes through or runs inside. */
  _routeStructureKeys(task) {
    if (!task) return [];
    const keys = [];
    for (const step of task.route) {
      if (step.kind === 'node') {
        const node = this.solved.nodes.find((candidate) => candidate.id === step.id);
        for (const structure of node?.structures ?? []) keys.push(`${structure.label}|${structure.side}`);
      } else {
        const edge = this.solved.edges.find((candidate) => candidate.id === step.id);
        for (const structure of edge?.within ?? []) keys.push(`${structure.label}|${structure.side}`);
      }
    }
    return keys;
  }

  /** Where each step of the traced route sits in the scene. */
  routePoints(task = this.tracedTask()) {
    if (!task) return [];
    const points = [];
    for (const step of task.route) {
      const keys = step.kind === 'node'
        ? (this.solved.nodes.find((node) => node.id === step.id)?.structures ?? [])
          .map((structure) => `${structure.label}|${structure.side}`)
        : (this.solved.edges.find((edge) => edge.id === step.id)?.within ?? [])
          .map((structure) => `${structure.label}|${structure.side}`);
      const centre = this._centroidOf(keys);
      if (centre) points.push({ step, position: centre });
    }
    return points;
  }

  _centroidOf(keys) {
    const found = keys.map((key) => this.centroids.get(key)).filter(Boolean);
    if (found.length === 0) return null;
    const centre = new THREE.Vector3();
    for (const point of found) centre.add(point);
    return centre.multiplyScalar(1 / found.length);
  }

  _measureCentroids() {
    for (const [key, meshes] of this.meshesByStructure) {
      const centre = new THREE.Vector3();
      let counted = 0;
      for (const mesh of meshes) {
        if (!mesh.geometry) continue;
        mesh.geometry.computeBoundingSphere();
        const sphere = mesh.geometry.boundingSphere;
        if (!sphere) continue;
        centre.add(mesh.localToWorld(sphere.center.clone()));
        counted += 1;
      }
      if (counted > 0) this.centroids.set(key, this.root.worldToLocal(centre.multiplyScalar(1 / counted)));
    }
  }

  _disposeRouteLine() {
    if (!this.routeLine) return;
    this.routeGroup?.remove(this.routeLine);
    this.routeLine.geometry.dispose();
    this.routeLine.material.dispose();
    this.routeLine = null;
  }

  /**
   * The traced route as one line through the atlas.
   *
   * Drawn in front of the brain rather than inside it: most of a route runs
   * through white matter a reader cannot see from outside, and a line that
   * disappears behind a gyrus teaches nothing about where it went.
   */
  _buildRouteLine(task) {
    this._disposeRouteLine();
    const points = this.routePoints(task);
    this.routePositions = points;
    this.routeCurve = null;
    if (points.length === 0) {
      this.pulse.visible = false;
      return;
    }
    // Attending to one side of space is one structure doing one job: there is
    // no route to draw, and drawing a line from a place to itself would invent
    // a journey the model does not claim. The marker sits on the structure
    // instead, and says the same thing about whether the task gets through.
    if (points.length === 1) {
      this.pulse.visible = true;
      this.pulse.position.copy(points[0].position);
      return;
    }
    const curve = new THREE.CatmullRomCurve3(points.map((point) => point.position));
    const geometry = new THREE.TubeGeometry(curve, Math.max(24, points.length * 12), 0.022, 8, false);
    const material = new THREE.MeshBasicMaterial({
      color: PALETTE.carrying, transparent: true, opacity: 0.55, depthTest: false,
    });
    this.routeLine = new THREE.Mesh(geometry, material);
    this.routeLine.renderOrder = 28;
    this.routeLine.name = 'route';
    this.routeGroup.add(this.routeLine);
    this.routeCurve = curve;
    this.pulse.visible = true;
  }

  /**
   * How far along the route the signal gets, as a fraction of its length.
   *
   * The first step that stops it is where it stops. With nothing blocking, the
   * signal runs the whole way.
   */
  blockedFraction(task = this.tracedTask()) {
    if (!task || !task.blockedAt) return 1;
    const index = task.route.findIndex((step) => step === task.blockedAt);
    if (index <= 0) return 0;
    if (task.route.length < 2) return 0;
    return index / (task.route.length - 1);
  }

  update(dt) {
    if (!this.pulse?.visible) return;
    const reach = this.blockedFraction();
    if (!this.routeCurve) {
      // A one-structure task: nothing travels, so the marker only says whether
      // the structure is carrying.
      this.pulseMaterial.color.set(reach < 1 ? PALETTE.blocked : PALETTE.carrying);
      return;
    }
    this.pulseTime = (this.pulseTime + dt * 0.45) % 1;
    const travelled = this.pulseTime * Math.max(reach, 0.02);
    // `getPoint`, not `getPointAt`: the second is parameterised by arc length,
    // and a route's points are nothing like evenly spaced — a node and the
    // tract beside it are close together, then the next step is across the
    // hemisphere. Asking for arc-length 1/3 of a four-point route put the
    // marker two steps past the one that stopped it, so the scene showed the
    // signal getting through a connection the model had cut. `getPoint(t)`
    // maps t = i/(n-1) to control point i, which is what `blockedFraction()`
    // computes.
    this.pulse.position.copy(this.routeCurve.getPoint(clamp(travelled)));
    // At a block the signal arrives and stops; the marker dims as it piles up
    // against the step rather than sailing through it.
    const arriving = reach < 1 && this.pulseTime > 0.88;
    this.pulseMaterial.color.set(arriving ? PALETTE.blocked : PALETTE.carrying);
  }

  // --- what the panels read -------------------------------------------------

  /**
   * What is on screen, so the application can frame it.
   *
   * Measured from the meshes that are actually visible — the hidden arteries
   * and cranial nerves of the atlas reach well past the brain, and framing on
   * them would push the subject into the middle distance. Offering this is what
   * lets `fitPoseToSafeArea` put the brain in the band the panels leave rather
   * than in the middle of the canvas, half of which is covered.
   */
  getSubjectBounds() {
    const box = new THREE.Box3();
    for (const meshes of this.meshesByStructure.values()) {
      for (const mesh of meshes) if (mesh.visible) box.expandByObject(mesh);
    }
    if (box.isEmpty()) return null;
    const corners = [];
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
      }
    }
    // Under one, because the route line and its labels sit outside the brain's
    // own box and a brain filling the band crops them at the edge.
    return { centre: box.getCenter(new THREE.Vector3()), corners, coverage: 0.8 };
  }

  getMetrics() {
    const traced = this.tracedTask();
    const rows = this.solved.tasks.map((task) => ({
      id: task.id,
      label: TASK_READOUT_LABELS[task.id]?.label ?? task.label,
      labelJa: TASK_READOUT_LABELS[task.id]?.labelJa ?? task.labelJa,
      value: STATUS_TEXT[task.status].en,
      valueJa: STATUS_TEXT[task.status].ja,
      unit: '',
      // Not emphasised: on a phone every emphasised row is kept at 21px, and
      // three of them plus the syndrome left the panel wider than the screen.
      // The pattern is read on a wider window; the phone gets the headline.
      emphasis: false,
    }));
    const probe = TASK_PROBES[traced?.id] ?? { text: '', textJa: '' };
    // A task can be impaired without being blocked outright, and reporting
    // "it gets through" beside a row reading 低下 is two answers to one
    // question. When nothing blocks it, the weakest step is the answer.
    const blockingStep = traced?.blockedAt
      ?? (traced && traced.status !== FUNCTION_STATUS.INTACT ? traced.weakestLink : null);
    rows.push({
      id: 'probe',
      label: `Tested by: “${probe.text}”`,
      labelJa: `試し方：${probe.textJa}`,
      value: TASK_READOUT_LABELS[traced?.id]?.label ?? '',
      valueJa: TASK_READOUT_LABELS[traced?.id]?.labelJa ?? '',
      unit: '',
    });
    rows.push({
      id: 'blocked-at',
      label: 'Where the traced task stops',
      labelJa: '辿った課題が止まるところ',
      value: blockingStep?.label ?? 'It gets through',
      valueJa: blockingStep?.labelJa ?? '通っています',
      unit: '',
    });
    const syndromes = this.solved.syndromes;
    rows.push({
      id: 'syndrome',
      label: 'What this pattern is called',
      labelJa: 'この組み合わせの呼び名',
      value: syndromes.length ? syndromes.map((syndrome) => syndrome.label).join(' + ') : 'No named pattern',
      valueJa: syndromes.length ? syndromes.map((syndrome) => syndrome.labelJa).join('＋') : '該当なし',
      unit: '',
      // The one row a phone keeps: the finding, in one line.
      emphasis: true,
    });
    return rows;
  }

  getAnnotations() {
    const points = this.routePositions ?? [];
    const annotations = points
      .filter((point) => point.step.kind === 'node')
      .map((point) => ({
        id: point.step.id,
        text: point.step.label,
        sub: point.step.labelJa,
        position: point.position.clone(),
        range: [0, 1],
        compact: true,
      }));
    const lesion = lesionSiteById(this.controls.lesion);
    if (lesion && this.progress > 0) {
      // The worst-hit structure, not the average of them all: averaging an
      // occipital lobe with the corpus callosum puts the label in the
      // ventricle between them, naming a lesion that is in neither place.
      const worst = this.solved.affectedStructures[0];
      const centre = worst ? this._centroidOf([`${worst.label}|${worst.side}`]) : null;
      if (centre) {
        annotations.push({
          id: 'lesion',
          text: lesion.label,
          sub: lesion.labelJa,
          position: centre,
          range: [0.01, 1],
          compact: false,
        });
      }
    }
    return annotations;
  }

  /** The Japanese name for a structure, from the atlas adapter or this scene's own list. */
  static structureNameJa(label, side) {
    if (STRUCTURE_NAMES_JA[label]) return STRUCTURE_NAMES_JA[label];
    const info = brainStructureInfo({ bx_label: label, bx_side: side, bx_cat: 'cortex', bx_id: 0 });
    return info?.nameJa ?? label;
  }
}

const STATUS_TEXT = {
  [FUNCTION_STATUS.INTACT]: { en: 'Intact', ja: '保たれる' },
  [FUNCTION_STATUS.IMPAIRED]: { en: 'Impaired', ja: '低下' },
  [FUNCTION_STATUS.LOST]: { en: 'Lost', ja: '消失' },
};
