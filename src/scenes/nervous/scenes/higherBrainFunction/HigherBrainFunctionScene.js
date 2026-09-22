import * as THREE from 'three';

import {
  DISCLAIMER, DISCLAIMER_JA, DISCLAIMER_SHORT, DISCLAIMER_SHORT_JA,
  LEGEND, LESION_NOTES, MODEL_CONTROLS_COPY, MODEL_SCOPE, PALETTE,
  BAND_ONLY_TEXT, COMPUTATION_NOTE, COMPUTATION_TEXT, CONCEPTUAL_INTERVENTIONS, MODE_COPY,
  NOT_MODELLED_TEXT, ROUTE_DISPLAY_TEXT,
  PROGRESS_LABEL, RANGE, RELATED, STAGES, STATE_TEXT, STRUCTURE_NAMES_JA, TASK_PROBES,
  TASK_READOUT_LABELS, TRACEABLE_TASKS, VISUAL_MAPPING,
} from '../../../../data/higherBrainFunction.js';
import {
  AVAILABILITY_HIGH, BULK_WHITE_MATTER, COMPUTATION, FUNCTION_TASKS, LESION_SITES, MAPPING, MODE, PATHWAY_STATE,
  isBelowDisplayFloor, lesionSiteById, solveHigherBrainFunction,
} from '../../../../models/higherBrainFunction.js';
import {
  ATLAS_CATEGORIES, brainAtlasMetadata, loadBrainAtlas, placeBrainAtlas,
} from '../../organs/brainAtlasSource.js';
import {
  REEL_CUES, REEL_DURATION, REEL_ROWS, REEL_TASK, cameraAt, extentAt, overlayAt, runTimeAt, segmentAt,
} from './reelStoryboard.js';
import { APHASIA_LIBRARY } from '../../../../data/aphasiaReference.js';
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
    // The subtitle used to end "...and the syndrome is what the surviving
    // routes spell", which promised the verdict this scene no longer gives.
    subtitle: 'A right-handed brain. Each task is a route through named structures, and what is computed is '
      + 'how far each one still reaches — not a diagnosis.',
    subtitleJa: '右利きの脳。1 つの課題は名前の付いた構造を通る 1 本の経路で、計算するのは'
      + '**それぞれがどこまで届くか**です——診断ではありません。',
    stages: STAGES,
    legend: LEGEND,
    palette: PALETTE,
    range: RANGE,
    progressLabel: PROGRESS_LABEL,
    related: RELATED,
    visualMapping: VISUAL_MAPPING,
    modelScope: MODEL_SCOPE,
    // Reference reading, opened by the reader. Declared on the scene rather
    // than reached from the model: the solver cannot import this file, and the
    // panel does not compute anything from it.
    referenceLibrary: APHASIA_LIBRARY,
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

  static DEFAULT_CONTROLS = Object.freeze({
    mode: MODE.ATLAS_LESION,
    lesion: 'dominant-inferior-frontal',
    /** Conceptual mode only, and never read in atlas mode. */
    intervention: CONCEPTUAL_INTERVENTIONS[0].id,
    task: 'repetition-word',
  });

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
    // Switching modes takes the other mode's intervention off the model as well
    // as off the screen. Leaving a lesion set while a conceptual knockout is
    // shown is how a thought experiment gets read as the consequence of a
    // lesion — so the solver refuses to be given both, and this is what keeps
    // it from being asked.
    this.solve();
  }

  resetModelControls() {
    this.controls = { ...HigherBrainFunctionScene.DEFAULT_CONTROLS };
    this.solve();
  }

  getModelControls() {
    const conceptual = this.controls.mode === MODE.CONCEPTUAL;
    return [
      {
        id: 'mode',
        kind: 'choice',
        label: MODE_COPY.label,
        labelJa: MODE_COPY.labelJa,
        value: this.controls.mode,
        options: [
          {
            value: MODE.ATLAS_LESION,
            label: MODE_COPY.atlas.label,
            labelJa: MODE_COPY.atlas.labelJa,
            effect: MODE_COPY.atlasNote.text,
            effectJa: MODE_COPY.atlasNote.textJa,
          },
          {
            value: MODE.CONCEPTUAL,
            label: MODE_COPY.conceptual.label,
            labelJa: MODE_COPY.conceptual.labelJa,
            effect: MODE_COPY.conceptualNote.text,
            effectJa: MODE_COPY.conceptualNote.textJa,
          },
        ],
      },
      // Only the control the current mode actually reads is offered. Both at
      // once would show a lesion selected while a knockout is on screen, which
      // is the confusion the two modes exist to prevent.
      conceptual
        ? {
          id: 'intervention',
          kind: 'choice',
          label: 'Which process is switched off',
          labelJa: '遮断する処理',
          value: this.controls.intervention,
          options: CONCEPTUAL_INTERVENTIONS.map((entry) => ({
            value: entry.id,
            label: entry.label,
            labelJa: entry.labelJa,
            effect: entry.shows,
            effectJa: entry.showsJa,
          })),
        }
        : {
          id: 'lesion',
          kind: 'choice',
          label: 'Where the lesion is',
          labelJa: '病変の場所',
          value: this.controls.lesion,
          // No "none" option: the progress slider already starts at an intact
          // brain, and offering the same state twice makes a pair of controls
          // that can disagree about which one is in charge of it.
          options: LESION_SITES.map((site) => ({
            value: site.id,
            label: site.label,
            labelJa: site.labelJa,
            effect: [LESION_NOTES[site.id]?.text, `Usually: ${site.usualCause}.`, site.granularityLimit]
              .filter(Boolean).join(' '),
            effectJa: [LESION_NOTES[site.id]?.textJa, `原因：${site.usualCauseJa}。`, site.granularityLimitJa]
              .filter(Boolean).join(''),
          })),
        },
      {
        id: 'task',
        kind: 'choice',
        label: 'Which task is traced',
        labelJa: '辿る課題',
        value: this.controls.task,
        // Label only. The probe — what a clinician would actually ask — is on
        // the read-out for whichever task is traced, so the buttons here do not
        // each carry a sentence of prose over the brain they are about.
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
    if (this.controls.mode === MODE.CONCEPTUAL) {
      return solveHigherBrainFunction({
        handedness: 'right',
        mode: MODE.CONCEPTUAL,
        interventions: this.controls.intervention ? [this.controls.intervention] : [],
        // A knockout is a knockout. There is no "40% of a process" here, and
        // the extent slider says so by not applying.
        extent: 1,
      });
    }
    const site = lesionSiteById(this.controls.lesion);
    return solveHigherBrainFunction({
      handedness: 'right',
      mode: MODE.ATLAS_LESION,
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

  /**
   * Every structure the traced route passes through or runs inside.
   *
   * A task with no value has no route either — `not_modeled` and
   * `indeterminate` both report `route: null` — so there is nothing to draw and
   * nothing to light. This used to iterate it regardless and throw, which is
   * how a scene reachable only through the task control would have crashed the
   * moment a task without routes was traced.
   */
  _routeStructureKeys(task) {
    if (!task?.route) return [];
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

  /**
   * Where each step of the traced route sits in the scene.
   *
   * A step with no atlas structure has no centroid, and the audited version
   * simply dropped it: the two conceptual steps of the writing routes were not
   * on the line at all, so a reader saw a route two steps shorter than the one
   * the model solved, with no sign that anything was missing. They are placed
   * **schematically** now — between their neighbours and pushed outward, away
   * from the brain, so the detour is visible as a detour — and drawn as a
   * dotted line.
   *
   * The position is never read back: `displayAnchor` and this offset exist for
   * the renderer, and {@link solveHigherBrainFunction} has no idea either
   * happened. A conceptual step sitting over the parietal lobe is not a claim
   * that the process is in the parietal lobe, which is why it is put where no
   * structure is rather than on the nearest one.
   */
  routePoints(task = this.tracedTask()) {
    if (!task?.route) return [];
    const placed = task.route.map((step) => {
      const keys = step.kind === 'node'
        ? (this.solved.nodes.find((node) => node.id === step.id)?.structures ?? [])
          .map((structure) => `${structure.label}|${structure.side}`)
        : (this.solved.edges.find((edge) => edge.id === step.id)?.within ?? [])
          .map((structure) => `${structure.label}|${structure.side}`);
      return { step, position: this._centroidOf(keys) };
    });
    const anchored = placed.filter((point) => point.position);
    if (anchored.length === 0) return [];
    return placed
      .map((point, index) => {
        if (point.position) return { ...point, schematic: false };
        const before = placed.slice(0, index).reverse().find((candidate) => candidate.position);
        const after = placed.slice(index + 1).find((candidate) => candidate.position);
        const position = HigherBrainFunctionScene._schematicPosition(before, after, index, anchored);
        return position ? { ...point, position, schematic: true } : null;
      })
      .filter(Boolean);
  }

  /** A legible place for a step with no structure. Drawing only — see `routePoints`. */
  static _schematicPosition(before, after, index, anchored) {
    const outward = (point, step) => point.clone().add(
      point.clone().setY(point.y + 0.35).normalize().multiplyScalar(0.55 + step * 0.22)
    );
    if (before && after) {
      return outward(before.position.clone().lerp(after.position, 0.5), 1);
    }
    const neighbour = before ?? after;
    if (!neighbour) return null;
    // Off one end of the route: step away from the last placed point, in the
    // direction the route was already going, so the line reads as continuing.
    const direction = anchored.length > 1
      ? anchored.at(-1).position.clone().sub(anchored[0].position).normalize()
      : null;
    const base = neighbour.position.clone();
    if (direction) base.add(direction.multiplyScalar(before ? 0.5 : -0.5));
    return outward(base, index % 3);
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
    for (const segment of this.routeSegments ?? []) {
      this.routeGroup?.remove(segment.mesh);
      segment.mesh.geometry.dispose();
      segment.mesh.material.dispose();
    }
    this.routeSegments = [];
    this.routeLine = null;
  }

  /**
   * How a step of the route is drawn, by what the model depends on for it.
   *
   * Three line types, and the difference is the line itself rather than its
   * colour: a reader who cannot tell the three colours apart still sees a solid
   * line, a long-dashed one and a dotted one. Drawing all three the same way —
   * which is what this scene used to do — told a reader that a conceptual
   * connection between two processes and the arcuate fasciculus were the same
   * kind of claim about a brain.
   *
   * `dash` is in ring units along the segment: `on` rings drawn, `off` rings
   * left out. A gap is alpha zero rather than missing geometry, so the whole
   * segment stays one mesh and the reach painting below can walk it in order.
   */
  static LINE_TYPES = Object.freeze({
    [MAPPING.ATLAS]: Object.freeze({ id: 'tract', dash: null, radius: 0.026 }),
    [MAPPING.COARSE]: Object.freeze({ id: 'coarse', dash: Object.freeze({ on: 3, off: 3 }), radius: 0.018 }),
    [MAPPING.CONCEPTUAL]: Object.freeze({ id: 'conceptual', dash: Object.freeze({ on: 1, off: 4 }), radius: 0.012 }),
  });

  /**
   * How long one ring of a dashed segment is, in the scene's own units.
   *
   * Fixed in **world** space rather than as a fraction of the segment, because
   * a fraction gives a short connection short dashes and a long one long
   * dashes: the same line type then looks like two. At this value a coarse
   * dash is about 0.1 units on and 0.1 off, which is roughly fifteen pixels at
   * the scene's default framing — the size at which a dashed line reads as
   * dashed rather than as a slightly noisy solid one.
   */
  static DASH_RING = 0.035;

  /** The line type of a step, falling back to the most cautious one. */
  static lineTypeFor(mapping) {
    return HigherBrainFunctionScene.LINE_TYPES[mapping]
      ?? HigherBrainFunctionScene.LINE_TYPES[MAPPING.CONCEPTUAL];
  }

  /**
   * The traced route as one line through the atlas, in as many pieces as it
   * has connections.
   *
   * Drawn in front of the brain rather than inside it: most of a route runs
   * through white matter a reader cannot see from outside, and a line that
   * disappears behind a gyrus teaches nothing about where it went.
   *
   * One mesh per connection, because the line type belongs to the connection.
   * The pulse still follows one curve through the whole thing, so nothing about
   * the travel changes.
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
      this._clearRunMarkers();
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
    const last = points.length - 1;
    // A span runs from one process to the next. The connection between them is
    // what decides the line type; where the route passes through a connection
    // with a mesh of its own, that mesh is a point on the way and the span
    // covers both halves.
    const spans = [];
    for (let index = 0; index < last; index += 1) {
      const from = points[index];
      const step = points[index + 1].step;
      if (step.kind === 'connection') {
        const to = points[index + 2];
        if (!to) break;
        spans.push({ step, fromAt: index / last, toAt: (index + 2) / last });
        index += 1;
      } else {
        // No point of its own — a conceptual connection, or one whose mesh the
        // scene could not place. The step is still in the route, so the type
        // comes from the route rather than from the points.
        const between = this._connectionBetween(task, from.step, step);
        spans.push({ step: between ?? step, fromAt: index / last, toAt: (index + 1) / last });
      }
    }
    this.routeSegments = spans.map((span) => this._buildRouteSegment(curve, span));
    for (const segment of this.routeSegments) this.routeGroup.add(segment.mesh);
    // Kept as the handle the rest of the scene and its tests reach for: the
    // first piece of the line, with every piece on `routeSegments`.
    this.routeLine = this.routeSegments[0]?.mesh ?? null;
    this.routeCurve = curve;
    this.pulse.visible = true;
  }

  /** The connection step of the traced route between two consecutive nodes. */
  _connectionBetween(task, fromStep, toStep) {
    const route = task?.route ?? [];
    const at = route.indexOf(fromStep);
    if (at < 0) return null;
    const next = route[at + 1];
    return next && next.kind === 'connection' && route[at + 2] === toStep ? next : null;
  }

  /** One piece of the line, cut out of the whole curve so the path is unchanged. */
  _buildRouteSegment(curve, span) {
    const type = HigherBrainFunctionScene.lineTypeFor(span.step.mapping);
    const radial = 8;
    // Enough rings that a dash is a fixed length on screen, and bounded so a
    // long span does not become a thousand-ring tube.
    const length = curve.getPoint(span.toAt).distanceTo(curve.getPoint(span.fromAt));
    const rings = Math.min(96, Math.max(24, Math.round(length / HigherBrainFunctionScene.DASH_RING)));
    const sub = new THREE.CatmullRomCurve3(
      Array.from({ length: rings + 1 }, (unused, index) => curve
        .getPoint(span.fromAt + ((span.toAt - span.fromAt) * index) / rings))
    );
    const geometry = new THREE.TubeGeometry(sub, rings, type.radius, radial, false);
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 4), 4)
    );
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.55, depthTest: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 28;
    mesh.name = `route:${span.step.id}`;
    return {
      mesh,
      id: span.step.id,
      mapping: span.step.mapping,
      lineType: type.id,
      dash: type.dash,
      fromAt: span.fromAt,
      toAt: span.toAt,
      rings: rings + 1,
      ringWidth: radial + 1,
    };
  }

  /** What line type each piece of the drawn route is, for a legend or a test. */
  routeLineKinds() {
    return (this.routeSegments ?? []).map((segment) => ({
      id: segment.id, mapping: segment.mapping, lineType: segment.lineType, dashed: segment.dash !== null,
    }));
  }

  /**
   * What the picture is saying about the traced route, in one place.
   *
   * Five states, and they are not degrees of one thing. The audited version had
   * two — "gets through" and "stops" — and everything else fell into the second
   * one: a route carrying 0.2 was animated as a full stop with no answer, and
   * so was a task this model has no route for. A reader could not tell a weak
   * route from a severed one, or either from a question the model does not
   * answer, and the read-out saying so underneath did not undo what the picture
   * showed.
   *
   * - `carrying` — computed, top band.
   * - `weak` — computed and positive below the top band. **Reaches the far
   *   end**, with a faint answer. A positive number is not a stop.
   * - `blocked` — an element of the traced route is at a true zero. That, and
   *   only that, halts the pulse where it happens.
   * - `indeterminate` — the model could not settle this route or this task. The
   *   line is drawn in the unknown colour and nothing is animated as stopping.
   * - `not-modelled` — there is no route. Nothing is asked and nothing travels.
   *
   * `answerStrength` carries a floor so that a very small positive value is
   * still visible on screen. The floor is a property of the display and is
   * never read back into the model: `availability` is what the model says, and
   * `strength` is how bright a dot is.
   */
  static DISPLAY = Object.freeze({
    CARRYING: 'carrying',
    WEAK: 'weak',
    BLOCKED: 'blocked',
    INDETERMINATE: 'indeterminate',
    NOT_MODELLED: 'not-modelled',
  });

  /** The dimmest a positive answer is drawn. A display floor, not a quantity. */
  static ANSWER_VISIBILITY_FLOOR = 0.22;

  routeDisplay(task = this.tracedTask()) {
    const { DISPLAY } = HigherBrainFunctionScene;
    const points = this.routePositions ?? [];
    const span = Math.max(1, points.length - 1);
    const base = {
      taskId: task?.id ?? null,
      routeId: task?.routeId ?? null,
      reach: 1,
      strength: 0,
      stop: null,
      assumed: Boolean(task?.route?.some((step) => step.assumed)),
      /** The traced route's own conclusion, which is not the task's. */
      routeBlocked: Boolean(task?.routeDeclaredBlock),
      /** The task's, which may be unsettled while this route is not. */
      taskBlocked: Boolean(task?.declaredBlock),
      otherRoutes: (task?.evaluatedRouteIds ?? []).filter((id) => id !== task?.routeId).length,
      unknownRoutes: (task?.unevaluatedRouteIds ?? []).length,
    };
    if (!task || task.computationStatus === COMPUTATION.NOT_MODELLED) {
      return { ...base, kind: DISPLAY.NOT_MODELLED, reach: 0, strength: 0 };
    }
    // A true zero on the traced route halts it there — whatever the task as a
    // whole turns out to be, because this is a statement about this route.
    const stopIndex = points.findIndex((point) => point.step.blocked === true);
    if (stopIndex > 0) {
      return {
        ...base,
        kind: DISPLAY.BLOCKED,
        reach: stopIndex / span,
        strength: 0,
        stop: points[stopIndex].step,
      };
    }
    if (stopIndex === 0) {
      return { ...base, kind: DISPLAY.BLOCKED, reach: 0, strength: 0, stop: points[0].step };
    }
    if (task.computationStatus === COMPUTATION.INDETERMINATE) {
      return { ...base, kind: DISPLAY.INDETERMINATE, reach: 1, strength: 0 };
    }
    // Computed, positive, nothing at zero: it gets to the end. How bright the
    // answer is says how much of it did.
    const floor = HigherBrainFunctionScene.ANSWER_VISIBILITY_FLOOR;
    // Every branch that could leave `availability` null has returned by here —
    // not modelled, indeterminate, and a route stopped at a true zero. A `?? 0`
    // in its place would turn a future fourth state into a silent zero, which
    // is the class of bug this whole function exists to stop.
    if (typeof task.availability !== 'number') {
      throw new Error(`higherBrainFunction: ${task.id} is computed and carries no availability`);
    }
    const strength = Math.max(floor, Math.min(1, task.availability));
    return {
      ...base,
      kind: task.state === PATHWAY_STATE.HIGH ? DISPLAY.CARRYING : DISPLAY.WEAK,
      reach: 1,
      strength,
    };
  }

  /**
   * The step where the traced route stops, or null when it does not.
   *
   * "Stops" means an element of the reported route is at a **true zero** — a
   * structure the input destroyed outright, or a process switched off by hand.
   * It used to mean "in the bottom band", which made a route carrying 0.2 look
   * severed. A task with no value at all has no stopping place either, which is
   * why this returns null for one rather than picking a step.
   */
  blockingStep(task = this.tracedTask()) {
    return this.routeDisplay(task).stop;
  }

  /**
   * How far along the route the signal gets, as a fraction of its length.
   *
   * With nothing at zero on it, the signal runs the whole way — however dim.
   */
  blockedFraction(task = this.tracedTask()) {
    return this.routeDisplay(task).reach;
  }

  /**
   * Light the route as far as the signal gets, and leave the rest dim.
   *
   * The claim this scene's sequence makes is that the aphasias differ by
   * *where the word stopped*. That was drawn as a small marker halted at the
   * failing step — and a rendered frame showed it does not read: the marker is
   * the same colour as the line it sits on and a few pixels across, so a front
   * lesion and a back lesion produced two pictures a viewer cannot tell apart
   * (`docs/follow-ups.md` F-197). The stopping place is a property of the whole
   * route, so the whole route says it.
   *
   * The dim part is **neutral, not the lesion colour**. Those steps are intact;
   * they were never reached. Painting them as damaged would be a different
   * claim, and a false one — the same mistake the marker's own colour rule
   * already guards against.
   *
   * The fourth component of each vertex colour is the dash: a piece of a
   * long-dashed or dotted line is transparent where the line type says the
   * line is not there.
   *
   * @param {number} reach 0–1 along the route
   * @param {string} [lit] the colour of the part that has been reached
   */
  _paintRouteReach(reach, lit = PALETTE.carrying) {
    const segments = this.routeSegments ?? [];
    if (segments.length === 0) return;
    const key = `${reach.toFixed(4)}|${lit}`;
    if (this.routePaintedReach === key) return;
    this.routePaintedReach = key;
    const front = new THREE.Color(lit);
    const dim = new THREE.Color(PALETTE.unreached);
    for (const segment of segments) {
      const colours = segment.mesh.geometry.attributes.color;
      for (let ring = 0; ring < segment.rings; ring += 1) {
        // The tube's vertices run ring by ring along the curve, so a ring's
        // index is its position along this segment — and the segment knows
        // where it sits on the whole route.
        const withinSegment = segment.rings > 1 ? ring / (segment.rings - 1) : 0;
        const along = segment.fromAt + (segment.toAt - segment.fromAt) * withinSegment;
        const colour = along <= reach ? front : dim;
        const alpha = HigherBrainFunctionScene._dashAlpha(segment, ring);
        for (let around = 0; around < segment.ringWidth; around += 1) {
          colours.setXYZW(ring * segment.ringWidth + around, colour.r, colour.g, colour.b, alpha);
        }
      }
      colours.needsUpdate = true;
    }
  }

  /** 1 where the line is drawn, 0 in a gap of a dashed or dotted one. */
  static _dashAlpha(segment, ring) {
    if (!segment.dash) return 1;
    const period = segment.dash.on + segment.dash.off;
    return ring % period < segment.dash.on ? 1 : 0;
  }

  /**
   * Nothing of the last run left on screen.
   *
   * The three markers are separate objects from the route line, so disposing
   * the line and hiding the pulse left the other two exactly as the previous
   * frame had them: switch away from a task while the word is being said, or
   * while the answer is coming back, and that flash stayed lit over a task that
   * has no route at all. `_applyCycle` returned early in the same state and
   * cleared nothing, so the next frame did not fix it either.
   *
   * Opacity as well as visibility, because a material carries its own value and
   * a mesh made visible again a moment later would come back mid-fade.
   */
  _clearRunMarkers() {
    for (const flash of [this.stimulus, this.answer]) {
      if (!flash) continue;
      flash.mesh.visible = false;
      flash.material.opacity = 0;
      flash.mesh.scale.setScalar(1);
    }
    if (this.pulse) this.pulse.visible = false;
  }

  _applyCycle() {
    const points = this.routePositions ?? [];
    if (!this.pulse || points.length === 0) {
      // Not just a return: there is nothing to draw, and "nothing to draw" has
      // to be drawn too.
      this._clearRunMarkers();
      return;
    }
    const { DISPLAY } = HigherBrainFunctionScene;
    const phase = this.cyclePhase();
    const display = this.routeDisplay();
    const swell = (through) => Math.sin(clamp(through) * Math.PI);
    const unresolved = display.kind === DISPLAY.INDETERMINATE || display.kind === DISPLAY.NOT_MODELLED;

    // The word being said, at the end of the route it enters by. A task this
    // model has no route for is not asked at all: nothing enters, which is a
    // different picture from a question that goes in and gets no answer.
    const asking = phase.id === 'asked' && display.kind !== DISPLAY.NOT_MODELLED;
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

    const lit = unresolved ? PALETTE.unknown : PALETTE.carrying;
    if (!this.routeCurve) {
      // A one-structure task: nothing travels, so the marker only says whether
      // the structure is carrying, stopped, or not evaluated at all.
      this.pulse.visible = points.length === 1 && display.kind !== DISPLAY.NOT_MODELLED;
      this.pulseMaterial.color.set(
        display.kind === DISPLAY.BLOCKED ? PALETTE.blocked : lit
      );
      return;
    }
    // Travelling: from where it was asked to as far as it gets. It waits at the
    // start while the word is being said, and stays where it stopped while the
    // answer is, or is not, given. A route with nothing at zero on it runs the
    // whole way however dim it is — 0.2 is not a stop.
    // No floor. It used to be `Math.max(reach, 0.02)`, so a signal stopped at
    // the very first step — the entry process destroyed — was still drawn two
    // per cent of the way along the route. That is a small distance and a large
    // claim: the whole point of the blocked state is that the word did not get
    // past the step that stopped it. A floor on how *bright* a faint answer is
    // drawn is a display convenience; a floor on how far a stopped signal
    // travels is a different picture from the one the model computed.
    const travelled = asking
      ? 0
      : display.reach * (phase.id === 'travelling' ? phase.through : 1);
    this.pulse.visible = display.kind !== DISPLAY.NOT_MODELLED;
    this.pulse.position.copy(this.routeCurve.getPoint(clamp(travelled)));
    this._paintRouteReach(display.kind === DISPLAY.NOT_MODELLED ? 0 : display.reach, lit);
    // Dark only where it stops, and only for a true zero. Colouring the whole
    // traverse said the signal was already failing at steps the model has
    // carrying perfectly well.
    this.pulseMaterial.color.set(
      display.kind === DISPLAY.BLOCKED && phase.id === 'answered' ? PALETTE.blocked : lit
    );
  }

  update(dt) {
    if (!this.pulse) return;
    this.renderAtSeconds(this.cycleTime + dt);
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
   * What comes back at the end of a run: how much of the answer arrived.
   *
   * A task with no value has nothing to answer with, and that is drawn as
   * nothing coming back rather than as a failure — the difference is in the
   * read-out, which says whether the reason is "not modelled" or "cannot be
   * determined". A *positive* route always answers, however faintly: the floor
   * in {@link routeDisplay} exists so that 0.05 is dim rather than absent, and
   * it is a floor on the brightness of a dot and not on anything the model
   * computes.
   */
  answerStrength() {
    return this.routeDisplay().strength;
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

  /** One row's value: the band when there is one, and what is established when there is not. */
  static readingOf(task) {
    if (task.computationStatus === COMPUTATION.COMPUTED) return STATE_TEXT[task.state];
    // Indeterminate, with a band the arithmetic does settle anyway. A band is
    // not a number and this says which of the two it is.
    if (task.computationStatus === COMPUTATION.INDETERMINATE && task.establishedBand) {
      return BAND_ONLY_TEXT[task.establishedBand] ?? COMPUTATION_TEXT[task.computationStatus];
    }
    return COMPUTATION_TEXT[task.computationStatus];
  }

  /**
   * The read-out, in sections.
   *
   * Order: what is being changed, then the task being traced, then the rest of
   * the tasks for comparison, then what none of it settles. Twenty-six rows in
   * one flat column is a list a reader scrolls past; the sections that carry
   * the caveats stay open, and the comparison rows fold.
   *
   * The tasks this model has no route for are **not** folded away. "There is no
   * value here" is a finding, and hiding it is how a reader comes to believe
   * the model answered a question it never had.
   */
  getMetrics() {
    const traced = this.tracedTask();
    const conceptual = this.solved.mode === MODE.CONCEPTUAL;
    const display = this.routeDisplay();

    const rows = [];
    // What is being changed, first: a result from a switched-off process and a
    // result from a lesion are different kinds of statement, and a reader must
    // be able to tell which one they are looking at from the read-out alone.
    rows.push({
      id: 'mode',
      label: 'What is being changed',
      labelJa: '操作しているもの',
      value: conceptual ? MODE_COPY.conceptual.label : MODE_COPY.atlas.label,
      valueJa: conceptual ? MODE_COPY.conceptual.labelJa : MODE_COPY.atlas.labelJa,
      unit: '',
      emphasis: true,
    });
    if (conceptual) {
      const entry = CONCEPTUAL_INTERVENTIONS.find((candidate) => candidate.id === this.controls.intervention);
      rows.push({
        id: 'conceptual-note',
        label: 'What this is not',
        labelJa: 'これが何ではないか',
        value: `A thought experiment on ${entry?.label ?? 'a declared process'}. Not a prediction about any lesion.`,
        valueJa: `${entry?.labelJa ?? '宣言した処理'}についての思考実験です。実在の病変の予測ではありません。`,
        unit: '',
      });
    }

    // --- the traced task ----------------------------------------------------
    const traceGroup = {
      group: 'traced',
      groupLabel: 'The task being traced',
      groupLabelJa: '辿っている課題',
      groupOpen: true,
      essential: true,
    };
    const probe = TASK_PROBES[traced?.id] ?? { text: '', textJa: '' };
    rows.push({
      ...traceGroup,
      id: 'probe',
      label: 'Asked as',
      labelJa: '試し方',
      value: probe.text,
      valueJa: probe.textJa,
      unit: '',
    });
    if (traced) {
      const reading = HigherBrainFunctionScene.readingOf(traced);
      rows.push({
        ...traceGroup,
        // Keyed by the task, not by "the traced one": every task in the model
        // is a row under its own id, wherever the sections put it.
        id: traced.id,
        label: TASK_READOUT_LABELS[traced.id]?.label ?? traced.label,
        labelJa: TASK_READOUT_LABELS[traced.id]?.labelJa ?? traced.labelJa,
        value: reading.label,
        valueJa: reading.labelJa,
        unit: '',
        emphasis: true,
      });
      if (traced.computationStatus === COMPUTATION.NOT_MODELLED) {
        const why = NOT_MODELLED_TEXT[traced.notModelledReason];
        rows.push({
          ...traceGroup,
          id: 'traced-absent',
          label: 'Why there is no value',
          labelJa: '値が無い理由',
          value: `${why?.text ?? ''} ${COMPUTATION_NOTE.not_modeled.text}`.trim(),
          valueJa: `${why?.textJa ?? ''}${COMPUTATION_NOTE.not_modeled.textJa}`,
          unit: '',
        });
      }
      // What the picture is saying, in words, so that a reader who cannot tell
      // a dim line from a stopped one has it written down.
      // A value that is positive and rounds to zero at the read-out's own
      // precision says so in words. "0" and "below 0.0001" are the same four
      // decimal places and opposite claims, and this is the one place a reader
      // could otherwise take the second for the first.
      const tiny = isBelowDisplayFloor(traced.availability);
      rows.push({
        ...traceGroup,
        id: 'route-state',
        label: 'What the drawn route shows',
        labelJa: '描かれている経路が示していること',
        value: ROUTE_DISPLAY_TEXT[display.kind].label
          + (tiny ? ' The value is positive and below 0.0001 — not zero.' : ''),
        valueJa: ROUTE_DISPLAY_TEXT[display.kind].labelJa
          + (tiny ? '値は正で、0.0001 未満です——**0 ではありません**。' : ''),
        unit: '',
      });
      if (display.stop) {
        rows.push({
          ...traceGroup,
          id: 'route-stop',
          label: 'Where it stops, and why',
          labelJa: '止まる場所と、その理由',
          value: `${display.stop.label}${display.stop.kind === 'connection' ? ' (connection)' : ''}: `
            + 'nothing of it is left. This is about this route, not about a person.',
          valueJa: `${display.stop.labelJa}${display.stop.kind === 'connection' ? '（連絡）' : ''}：`
            + 'ここが残っていません。この経路についての記述で、人についてではありません。',
          unit: '',
        });
      }
      // A route is not the task. The audited version drew one route and let a
      // reader take its stopping place for the task's answer.
      if (display.otherRoutes > 0 || display.unknownRoutes > 0) {
        rows.push({
          ...traceGroup,
          id: 'other-routes',
          label: 'Other routes this task declares',
          labelJa: 'この課題が宣言している他の経路',
          value: `${display.otherRoutes} evaluated, ${display.unknownRoutes} this mode cannot evaluate. `
            + 'The drawn route is one of them.',
          valueJa: `評価済み ${display.otherRoutes} 本、このモードでは評価できないもの ${display.unknownRoutes} 本。`
            + '描いているのはそのうちの 1 本です。',
          unit: '',
        });
      }
      // Where the traced route is held down — and only ever as a statement
      // about the route that was reported, never as "the responsible lesion".
      const limiting = traced.route?.filter((step) => step.integrity < AVAILABILITY_HIGH) ?? [];
      rows.push({
        ...traceGroup,
        id: 'limiting',
        label: 'What holds the traced route down',
        labelJa: '辿った経路を抑えているもの',
        // A connection's label names both ends, so listing a connection next to
        // the process it leads into read as the same name twice — "音韻の分析 →
        // 音韻—文字変換 → 音韻—文字変換". Each step says which kind it is instead.
        value: traced.route
          ? (limiting.length
            ? limiting.map((step) => (step.kind === 'connection' ? `${step.label} (connection)` : step.label)).join('; ')
            : 'Nothing on it')
          : (COMPUTATION_NOTE[traced.computationStatus]?.text ?? ''),
        valueJa: traced.route
          ? (limiting.length
            ? limiting.map((step) => (step.kind === 'connection' ? `${step.labelJa}（連絡）` : step.labelJa)).join('／')
            : 'この経路上には何もありません')
          : (COMPUTATION_NOTE[traced.computationStatus]?.textJa ?? ''),
        unit: '',
      });
    }

    // --- the limits of this result -----------------------------------------
    const limitGroup = {
      group: 'limits',
      groupLabel: 'What this result does not settle',
      groupLabelJa: 'この結果が決めていないこと',
      groupOpen: true,
      // Kept on a phone. The narrow-screen rule hides every row that is not a
      // headline figure, and these are the rows a reader most needs: a value
      // whose limits are only visible on a laptop is a value without limits on
      // the screen most people are holding.
      essential: true,
    };
    // Not a footnote: a high value on a route that passes through a shared
    // mesh, or through a process no lesion can reach, is a narrower statement
    // than it looks. One line in the rail, and **all of them** behind the
    // control the panel draws from `details`.
    if (traced?.coverageLimitations?.length) {
      const all = traced.coverageLimitations;
      const allJa = traced.coverageLimitationsJa;
      rows.push({
        ...limitGroup,
        id: 'coverage',
        label: 'What this value does not settle',
        labelJa: 'この値が決めていないこと',
        value: `${all[0]}${all.length > 1 ? ` (1 of ${all.length})` : ''}`,
        valueJa: `${allJa.length > 1 ? `（${allJa.length} 件のうち 1 件）` : ''}${allJa[0]}`,
        unit: '',
        details: [...all],
        detailsJa: [...allJa],
      });
    }
    if (display.assumed) {
      rows.push({
        ...limitGroup,
        id: 'assumed',
        label: 'Taken as available, not found to be',
        labelJa: '「利用可能」としているだけで、確かめてはいないもの',
        value: 'A step of this route has no atlas structure. It is fixed at available, no lesion can '
          + 'reach it, and its anatomical sparing has not been evaluated.',
        valueJa: 'この経路には、アトラス上の構造を持たない段階があります。利用可能に固定してあり、'
          + 'どの病変も届かず、その解剖学的な温存は評価していません。',
        unit: '',
        emphasis: true,
      });
    }
    if (traced?.unmodelledInfluences?.length) {
      rows.push({
        ...limitGroup,
        id: 'unmodelled',
        label: 'Influences this model does not compute',
        labelJa: 'このモデルが計算していない影響',
        value: traced.unmodelledInfluences.map((influence) => influence.what).join(' / '),
        valueJa: traced.unmodelledInfluences.map((influence) => influence.whatJa).join('／'),
        unit: '',
        emphasis: true,
        details: traced.unmodelledInfluences.map((influence) => influence.whatIsNotComputed),
        detailsJa: traced.unmodelledInfluences.map((influence) => influence.whatIsNotComputedJa),
      });
    }
    // There is no row here for `outOfScopeStructures`. The model reports them —
    // a structure the input named and this model computes nothing from, which
    // is a limit of the model and not "no effect" — and **nothing in this
    // scene can produce one**: every lesion is a declared preset, and every
    // preset names structures the model carries. A row no reader can reach is
    // the read-out's version of a route no task can take, and this file has
    // already deleted one of those. The field and its guard stay in the model,
    // where a caller with a real atlas list (a test, a future tool that lets a
    // reader lesion an arbitrary mesh) meets the case.
    // What the task itself is not about. The rows a reader over-reads are the
    // ones whose names are shorter than their meaning.
    if (traced?.excludesJa?.length) {
      rows.push({
        ...limitGroup,
        id: 'excludes',
        label: 'Not evaluated by this task',
        labelJa: 'この課題が評価していないもの',
        value: traced.excludes.join(' / '),
        valueJa: traced.excludesJa.join('／'),
        unit: '',
        details: [...traced.excludes],
        detailsJa: [...traced.excludesJa],
      });
    }

    // --- the other tasks ----------------------------------------------------
    const compare = {
      group: 'compare',
      groupLabel: 'The other tasks, for comparison',
      groupLabelJa: '比較のための他の課題',
      groupOpen: false,
    };
    // Open, always: "this model has no route for that" is a finding, and a
    // reader who never unfolds it is a reader who thinks the model answered.
    const absent = {
      group: 'absent',
      groupLabel: 'Tasks this model has no route for',
      groupLabelJa: 'このモデルが経路を持たない課題',
      groupOpen: true,
      essential: true,
    };
    for (const task of this.solved.tasks) {
      if (task.id === traced?.id) continue;
      const reading = HigherBrainFunctionScene.readingOf(task);
      rows.push({
        ...(task.computationStatus === COMPUTATION.NOT_MODELLED ? absent : compare),
        id: task.id,
        label: TASK_READOUT_LABELS[task.id]?.label ?? task.label,
        labelJa: TASK_READOUT_LABELS[task.id]?.labelJa ?? task.labelJa,
        value: reading.label + (task.unmodelledInfluences.length ? ' (＋)' : ''),
        valueJa: reading.labelJa + (task.unmodelledInfluences.length ? '（＋未計算）' : ''),
        unit: '',
        emphasis: false,
      });
    }
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
        if (target.controls.mode !== MODE.ATLAS_LESION) target.setModelControl('mode', MODE.ATLAS_LESION);
        if (lesion && target.controls.lesion !== lesion) target.setModelControl('lesion', lesion);
        if (target.controls.task !== REEL_TASK) target.setModelControl('task', REEL_TASK);
        target.setProgress(extentAt(t));
        target.renderAtSeconds(runTimeAt(t, HigherBrainFunctionScene.CYCLE_SECONDS));
      },

      /**
       * The rows this sequence is about, from the solved state.
       *
       * Through the same reading the read-out uses, so that a band the panel
       * reports as established-but-not-exact cannot come out of the video as a
       * value. `(＋)` marks a task the model declares an influence for and does
       * not compute — the same mark, for the same reason, in both places.
       */
      readMetrics(target = scene) {
        const rows = {};
        for (const id of REEL_ROWS) {
          const task = target.solved.tasks.find((candidate) => candidate.id === id);
          const text = HigherBrainFunctionScene.readingOf(task);
          const flagged = task.unmodelledInfluences.length > 0;
          rows[id] = {
            en: text.label + (flagged ? ' (＋)' : ''),
            ja: text.labelJa + (flagged ? '（＋未計算）' : ''),
          };
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
        // A step with no mesh is labelled where it is *drawn*, which is beside
        // the brain rather than in it. The label says so, because a name
        // floating over the parietal lobe is read as a name *of* the parietal
        // lobe — which is the claim the dotted line exists to avoid making.
        text: point.schematic ? `${point.step.label} (no atlas structure)` : point.step.label,
        sub: point.schematic ? `${point.step.labelJa}（アトラス上の構造なし）` : point.step.labelJa,
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


