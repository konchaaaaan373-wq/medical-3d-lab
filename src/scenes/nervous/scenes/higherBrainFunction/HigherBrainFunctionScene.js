import * as THREE from 'three';

import {
  DISCLAIMER, DISCLAIMER_JA, DISCLAIMER_SHORT, DISCLAIMER_SHORT_JA,
  LEGEND, LESION_NOTES, MODEL_CONTROLS_COPY, MODEL_SCOPE, PALETTE,
  PROGRESS_LABEL, RANGE, RELATED, STAGES, STRUCTURE_NAMES_JA, TASK_PROBES, TASK_READOUT_LABELS, TRACEABLE_TASKS, VISUAL_MAPPING,
} from '../../../../data/higherBrainFunction.js';
import {
  BULK_WHITE_MATTER, FUNCTION_STATUS, FUNCTION_TASKS, LESION_SITES,
  lesionSiteById, solveHigherBrainFunction,
} from '../../../../models/higherBrainFunction.js';
import {
  ATLAS_CATEGORIES, brainAtlasMetadata, loadBrainAtlas, placeBrainAtlas,
} from '../../organs/brainAtlasSource.js';
import {
  REEL_CUES, REEL_DURATION, REEL_TASK, cameraAt, extentAt, overlayAt, runTimeAt, segmentAt,
} from './reelStoryboard.js';
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
   * One run of the examination, in seconds.
   *
   * **The order is the model's claim; the length is not.** Nothing in the model
   * is a conduction time, a latency or a reaction time, and a reader must not
   * take these seconds for any of those. What the rhythm carries is that a task
   * is asked, travels, and either arrives or does not — and that it is the same
   * rhythm whichever task is asked, so two lesions can be told apart by where
   * the run stops rather than by how long it took.
   */
  static CYCLE_SECONDS = 4.4;

  /** Where the run is asked, where it travels, and where it answers. */
  static CYCLE_PHASES = Object.freeze({ askedUntil: 0.14, travelUntil: 0.82 });

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

    // The examination has two moments besides the travelling: the word being
    // said, and the answer coming back. Both are drawn as a brief swelling at
    // the end of the route they belong to, so a reader watching the model alone
    // can see that something was asked and whether anything came of it.
    this.stimulus = this._makeFlash('stimulus', PALETTE.carrying);
    this.answer = this._makeFlash('answer', PALETTE.carrying);
    this.cycleTime = 0;

    this.pulseMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.carrying, depthTest: false });
    this.pulseGeometry = new THREE.SphereGeometry(0.075, 16, 12);
    this.pulse = new THREE.Mesh(this.pulseGeometry, this.pulseMaterial);
    this.pulse.renderOrder = 30;
    this.pulse.name = 'task-signal';
    this.pulse.visible = false;
    this.routeGroup.add(this.pulse);
    this.routeGroup.add(this.stimulus.mesh);
    this.routeGroup.add(this.answer.mesh);

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
    // their materials stay on the GPU with nothing pointing at them — and the
    // route line has to be rebuilt rather than kept, because the shape cache
    // keys on which steps the route takes and those are the same steps in a
    // different place.
    for (const child of [...this.atlasRoot.children]) disposeObject(child);
    this._disposeRouteLine();
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
    for (const flash of [this.stimulus, this.answer]) {
      flash?.geometry.dispose();
      flash?.material.dispose();
    }
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
        //
        // Everything else the route runs through and the cortex hides is
        // lifted, whether or not the route goes deep — the same treatment the
        // route line itself gets. Keying this on the atlas category `tracts`
        // covered the arcuate fasciculus and missed the two commissural
        // structures the model leans on hardest: the corpus callosum and the
        // fornix are filed as `white_matter`, so cutting the callosum still
        // stopped the marker at something nobody could see.
        //
        // The bulk white matter is the one exception, and it is not a
        // borderline case: it is the whole hemisphere's white matter, most
        // connections are anchored in it for want of a named bundle, and
        // drawing it in front would put an opaque block over the brain.
        const liftedToFront = onRoute && !isCortex
          && mesh.userData.bx_label !== BULK_WHITE_MATTER
          && (routeRunsDeep || !HigherBrainFunctionScene.DEEP_CATEGORIES.has(mesh.userData.bx_cat));
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
    this.routeShape = null;
    this.routePaintedReach = null;
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
    const points = this.routePoints(task);
    // The line depends on *which* steps the route takes, not on how damaged
    // they are — and the lesion slider re-solves on every frame it moves, and
    // the fifteen-second sequence re-solves on every frame full stop. Rebuilding
    // an identical tube sixty times a second is geometry churn nobody can see.
    const shape = `${task?.id ?? ''}:${points.map((point) => point.step.id).join('>')}`;
    if (this.routeLine && shape === this.routeShape) {
      this.routePositions = points;
      return;
    }
    this._disposeRouteLine();
    this.routeShape = shape;
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
    const tubularSegments = Math.max(24, points.length * 12);
    const radialSegments = 8;
    const geometry = new THREE.TubeGeometry(curve, tubularSegments, 0.022, radialSegments, false);
    // The line carries its own colour, so *how far the word got* can be read
    // off the route itself rather than from where one small marker happens to
    // be at the instant a reader looks. See `_paintRouteReach`.
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 3), 3)
    );
    this.routeRings = tubularSegments + 1;
    this.routeRingWidth = radialSegments + 1;
    this.routePaintedReach = null;
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.55, depthTest: false,
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

  /** A marker that swells and fades where something happened. */
  _makeFlash(name, colour) {
    const geometry = new THREE.SphereGeometry(0.13, 18, 12);
    const material = new THREE.MeshBasicMaterial({
      color: colour, transparent: true, opacity: 0, depthTest: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.renderOrder = 29;
    mesh.visible = false;
    return { mesh, geometry, material };
  }

  /**
   * Draw the examination at a given moment of its run.
   *
   * Separated from `update` and driven by an absolute time, so the same second
   * renders identically on any machine and at any frame rate — which is what a
   * fifteen-second sequence needs in order to be a recording rather than a
   * performance.
   *
   * @param {number} seconds since the run started; it repeats
   */
  renderAtSeconds(seconds) {
    const cycle = HigherBrainFunctionScene.CYCLE_SECONDS;
    this.cycleTime = ((seconds % cycle) + cycle) % cycle;
    this._applyCycle();
  }

  /** Which part of the run this instant is in, and how far through that part. */
  cyclePhase() {
    const { askedUntil, travelUntil } = HigherBrainFunctionScene.CYCLE_PHASES;
    const at = this.cycleTime / HigherBrainFunctionScene.CYCLE_SECONDS;
    if (at < askedUntil) return { id: 'asked', through: at / askedUntil };
    if (at < travelUntil) return { id: 'travelling', through: (at - askedUntil) / (travelUntil - askedUntil) };
    return { id: 'answered', through: (at - travelUntil) / (1 - travelUntil) };
  }

  /**
   * What comes back at the end of a run: the traced task's own status, and
   * nothing else. A route that carries answers; a blocked one does not.
   */
  answerStrength() {
    const status = this.tracedTask()?.status;
    if (status === FUNCTION_STATUS.INTACT) return 1;
    if (status === FUNCTION_STATUS.IMPAIRED) return 0.45;
    return 0;
  }

  /**
   * Light the route as far as the signal gets, and leave the rest dim.
   *
   * The claim this scene's sequence makes is that the aphasias differ by
   * *where the word stopped*. That was drawn as a small marker halted at the
   * failing step — and a rendered frame showed it does not read: the marker is
   * the same colour as the line it sits on and a few pixels across, so a front
   * lesion and a back lesion produced two pictures a viewer cannot tell apart
   * (`docs/follow-ups.md` F-167). The stopping place is a property of the whole
   * route, so the whole route says it.
   *
   * The dim part is **neutral, not the lesion colour**. Those steps are intact;
   * they were never reached. Painting them as damaged would be a different
   * claim, and a false one — the same mistake the marker's own colour rule
   * already guards against.
   *
   * @param {number} reach 0–1 along the route
   */
  _paintRouteReach(reach) {
    if (!this.routeLine || !this.routeRings) return;
    if (this.routePaintedReach !== null && Math.abs(this.routePaintedReach - reach) < 1e-4) return;
    this.routePaintedReach = reach;
    const colours = this.routeLine.geometry.attributes.color;
    const lit = new THREE.Color(PALETTE.carrying);
    const dim = new THREE.Color(PALETTE.unreached);
    for (let ring = 0; ring < this.routeRings; ring += 1) {
      // The tube's vertices run ring by ring along the curve, so a ring's
      // index is its position along the route.
      const along = this.routeRings > 1 ? ring / (this.routeRings - 1) : 0;
      const colour = along <= reach ? lit : dim;
      for (let around = 0; around < this.routeRingWidth; around += 1) {
        colours.setXYZ(ring * this.routeRingWidth + around, colour.r, colour.g, colour.b);
      }
    }
    colours.needsUpdate = true;
  }

  _applyCycle() {
    const points = this.routePositions ?? [];
    if (!this.pulse || points.length === 0) return;
    const phase = this.cyclePhase();
    const reach = this.blockedFraction();
    const swell = (through) => Math.sin(clamp(through) * Math.PI);

    // The word being said, at the end of the route it enters by.
    const asking = phase.id === 'asked';
    this.stimulus.mesh.position.copy(points[0].position);
    this.stimulus.mesh.visible = asking;
    this.stimulus.material.opacity = asking ? 0.75 * swell(phase.through) : 0;
    this.stimulus.mesh.scale.setScalar(1 + (asking ? swell(phase.through) * 0.6 : 0));

    // The answer, at the far end, as strong as the route that reached it.
    const strength = this.answerStrength();
    const answering = phase.id === 'answered' && strength > 0;
    this.answer.mesh.position.copy(points[points.length - 1].position);
    this.answer.mesh.visible = answering;
    this.answer.material.opacity = answering ? 0.8 * strength * swell(phase.through) : 0;
    this.answer.mesh.scale.setScalar(1 + (answering ? swell(phase.through) * 0.9 * strength : 0));

    if (!this.routeCurve) {
      // A one-structure task: nothing travels, so the marker only says whether
      // the structure is carrying.
      this.pulse.visible = points.length === 1;
      this.pulseMaterial.color.set(reach < 1 ? PALETTE.blocked : PALETTE.carrying);
      return;
    }
    // Travelling: from where it was asked to as far as it gets. It waits at the
    // start while the word is being said, and stays where it stopped while the
    // answer is, or is not, given.
    const travelled = asking
      ? 0
      : Math.max(reach, 0.02) * (phase.id === 'travelling' ? phase.through : 1);
    this.pulse.visible = true;
    this.pulse.position.copy(this.routeCurve.getPoint(clamp(travelled)));
    this._paintRouteReach(reach);
    // Dark only where it stops. Colouring the whole traverse said the signal
    // was already failing at steps the model has carrying perfectly well.
    this.pulseMaterial.color.set(
      reach < 1 && phase.id === 'answered' ? PALETTE.blocked : PALETTE.carrying
    );
  }

  update(dt) {
    if (!this.pulse) return;
    this.renderAtSeconds(this.cycleTime + dt);
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

  /**
   * The fifteen-second sequence: one word asked of the same brain four times,
   * with the lesion moved between them.
   *
   * The scene is driven by **absolute sequence time** rather than played, so a
   * recording is reproducible — see `renderAtSeconds`. The rows the overlay
   * prints are read out of this scene's own read-out every frame, so the video
   * and the panel cannot come to say different things.
   */
  getReel() {
    const scene = this;
    return {
      durationSeconds: REEL_DURATION,
      cues: REEL_CUES,
      progress: 1,
      viewDirection: HigherBrainFunctionScene.cameraPose.position.clone().normalize(),
      framing: {
        halfWidth: 2.6,
        halfHeight: 2.4,
        minimumDistance: 4.6,
        target: HigherBrainFunctionScene.cameraPose.target.clone(),
      },
      cameraAt,
      overlayAt,

      /**
       * Put the scene where the sequence is at `t`.
       *
       * The controls are set rather than assumed: a sequence starts after
       * `resetModelControls()`, and it must show what it is about whatever the
       * reader had been looking at.
       */
      driveAt(t, target = scene) {
        const lesion = segmentAt(t).lesion;
        // An intact beat leaves whichever lesion is selected in place and takes
        // its extent to zero: one state, and the slider is the one that owns it.
        if (lesion && target.controls.lesion !== lesion) target.setModelControl('lesion', lesion);
        if (target.controls.task !== REEL_TASK) target.setModelControl('task', REEL_TASK);
        target.setProgress(extentAt(t));
        target.renderAtSeconds(runTimeAt(t, HigherBrainFunctionScene.CYCLE_SECONDS));
      },

      /** The three rows this sequence is about, from the solved state. */
      readMetrics(target = scene) {
        const rows = {};
        for (const id of ['repetition', 'auditory-comprehension', 'speech-fluency']) {
          const task = target.solved.tasks.find((candidate) => candidate.id === id);
          rows[id] = { en: STATUS_TEXT[task.status].en, ja: STATUS_TEXT[task.status].ja };
        }
        return rows;
      },
    };
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
