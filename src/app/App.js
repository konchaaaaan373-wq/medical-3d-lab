import * as THREE from 'three';
import { Viewer } from './Viewer.js';
import { loadScene, sceneById, systemsWithScenes, resolveSceneId } from './sceneRegistry.js';
import { SCENES } from '../catalog/index.js';
import { RELEASED_SCENES } from '../catalog/release.js';
import { betaUnlocked, sceneOpen } from './releaseGate.js';
import { isInPageAnchor, sameRoute } from './router.js';
import { Playback } from '../utils/Playback.js';
import { damp } from '../utils/math.js';
import { ZOOM_RANGE, clampZoom, steppedZoom, zoomedDistance as zoomed } from './zoom.js';
import { framePose, distanceScaleForAspect, fitPoseToSafeArea, orbitLimitsForSubject } from './framing.js';
import {
  BACKGROUND_PRESETS,
  DEFAULT_BACKGROUND_ID,
  backgroundPresetById,
  standardInspectionViews,
} from './inspection.js';
import { captureSessionState, restoreSessionState } from './sessionState.js';
import { el } from '../utils/dom.js';
import { prefersReducedMotion } from '../utils/motion.js';
import { markScrollable, publishHeight } from '../utils/scrollHint.js';
import { createTitleCard } from '../components/TitleCard.js';
import { createLegend } from '../components/Legend.js';
import { createStageReadout, stageIndexFor } from '../components/StageReadout.js';
import { createControlPanel } from '../components/ControlPanel.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { createMetricsPanel } from '../components/MetricsPanel.js';
import { createPressureVolumePanel } from '../components/PressureVolumePanel.js';
import { createPressureWavePanel } from '../components/PressureWavePanel.js';
import { createBullseyePanel } from '../components/BullseyePanel.js';
import { createChartPanel } from '../components/ChartPanel.js';
import { createModelScopePanel } from '../components/ModelScopePanel.js';
import { createRelatedScenesPanel } from '../components/RelatedScenesPanel.js';
import { createCausalStoryPanel } from '../components/CausalStoryPanel.js';
import { createModelControls } from '../components/ModelControls.js';
import { createLearningPanel } from '../components/LearningPanel.js';
import { createSceneSwitcher } from '../components/SceneSwitcher.js';
import { createReelMode } from './ReelMode.js';
import { createStoryMode } from './StoryMode.js';
import { createLabelLayer } from '../components/LabelLayer.js';
import { createAnatomyInfoPanel } from '../components/AnatomyInfoPanel.js';
import { attributionForScene } from '../catalog/attribution.js';
import { createAnatomyTreePanel } from '../components/AnatomyTreePanel.js';
import { createAnatomyPanel } from '../components/AnatomyPanel.js';
import { createInspectionPanel } from '../components/InspectionPanel.js';
import { emitAppEvent } from './appEvents.js';

/**
 * Wires a scene module to the viewer and the overlay UI.
 *
 * The app owns exactly one piece of state — the progression value in `Playback` —
 * and pushes it to the scene and to every UI component. Adding a new theme does
 * not require touching this file.
 *
 * @param {{ stage: HTMLElement, ui: HTMLElement }} mounts
 */
/**
 * @param {object} options
 * @param {HTMLElement} options.stage where the renderer draws
 * @param {HTMLElement} options.ui the shell the panels are appended to
 * @param {() => void} [options.onRetryModel] how a reader recovers from a model
 *   that failed to load. Passed through to the anatomy panel, which renders the
 *   button only if this is here. The shell owns what recovery means — today
 *   `src/main.js` reloads the page, the same thing the WebGL fallback's own
 *   retry does — so this file neither reloads nor reconstructs anything.
 */
export async function createApp({ stage, ui, onRetryModel = null }) {
  const viewer = new Viewer(stage);

  const SceneClass = await loadScene(resolveSceneId());
  const scene = new SceneClass({ viewer });
  viewer.scene.add(scene.build());
  // Most scenes build synchronously. Asset-backed atlases expose `ready` so
  // their first visible frame, labels and information panel all describe the
  // loaded specimen rather than briefly pointing at an empty stage.
  if (scene.ready) await scene.ready;
  const allowAutoRotate = SceneClass.allowAutoRotate !== false;
  if (!allowAutoRotate) viewer.controls.autoRotate = false;

  // Visual-QA hook: `?qa` exposes the viewer and scene so a screenshot
  // harness can set exact camera poses and cardiac phases. Dev-only surface —
  // it renders nothing and changes nothing unless explicitly driven.
  if (new URLSearchParams(window.location.search).has('qa')) {
    window.__lab = { viewer, scene };
  }

  // The catalogue owns how far a scene has been taken, so the badge on screen
  // cannot drift from the entry the explorer draws. A scene that does not know
  // its own status is not a special case — it simply reads it from here.
  //
  // The same is true of the name. The catalogue's textbook title is what the
  // explorer, the search, the landing page and the crawlable metadata all show,
  // so the header over the 3D reads it too; a scene's own `meta.title` is only
  // the fallback for a scene the catalogue does not know.
  const entry = sceneById(resolveSceneId());
  const meta = {
    ...SceneClass.meta,
    status: entry?.status ?? SceneClass.meta.status ?? 'production',
    title: entry?.titleEn ?? SceneClass.meta.title,
    titleJa: entry?.titleJa ?? SceneClass.meta.titleJa,
  };
  document.title = `${meta.title} — medical-3d-lab`;
  ui.dataset.scene = meta.id;
  const defaultBackground = backgroundPresetById(meta.inspection?.background ?? DEFAULT_BACKGROUND_ID);

  /**
   * The page behind the canvas is part of the background, not a separate one.
   *
   * The renderer needs a few frames after the loading veil lifts before the
   * backdrop is on screen. Measured on a pale scene: the veil was gone at
   * ~300ms and the first light frame arrived at ~700ms, so every load of the
   * brain atlas opened with 400ms of near-black under a light-themed panel.
   * Painting the page with the preset's own bottom colour closes that window,
   * and keeps the ground right wherever else the canvas does not reach.
   */
  const paintPageGround = (preset) => {
    document.documentElement.style.setProperty('--page-ground', preset.backdrop.bottom);
  };

  const initialBackground = viewer.setBackgroundPreset(defaultBackground.id);
  ui.dataset.background = initialBackground.id;
  paintPageGround(initialBackground);

  /**
   * Learning view is the default: the 3D subject, the stage it is in, and the
   * way in. Data view brings back the plots, the read-out and the loading
   * sliders — without taking the 3D away, which is the whole point of the
   * scene. Everything stays mounted; what changes is what competes for
   * attention, and how close the camera sits.
   */
  /**
   * Learning view hides everything marked `.data-only` and offers a Data button
   * to bring it back. A scene with nothing to put in Data view gets no button —
   * and then hiding its `.data-only` controls would be a one-way door, so it
   * starts in Data view and the split simply does not apply to it.
   */
  const hasDataView = Boolean(scene.getMetrics);
  let dataView = !hasDataView;
  /** Set while the guided sequence is running; null the rest of the time. */
  let storyFocus = null;

  // `shot` is wherever the camera should currently be resting: the scene's
  // establishing framing, or a stage close-up while story mode is running.
  /**
   * How much of the frame the bottom console is covering, measured rather than
   * assumed — it changes with the window, the view and whether a lesson panel
   * is open, and the camera has to keep the subject clear of it in all of them.
   */
  const bottomInset = () => {
    const height = viewer.container.clientHeight;
    const panel = ui.querySelector('.console');
    if (!panel || !height) return 0;
    const rect = panel.getBoundingClientRect();
    return Math.min(0.45, Math.max(0, (height - rect.top) / height));
  };

  // The shared orbit floor is the last word on where the camera ends up — it is
  // re-applied on every `controls.update()`, after the framing has run — and it
  // was set for a scene an atlas is not the size of. A scene that can say what
  // it is drawing gets limits measured from that instead. See
  // `orbitLimitsForSubject`.
  Object.assign(viewer.controls, orbitLimitsForSubject(scene.getSubjectBounds?.(), viewer.controls));

  const shot = framePose(
    SceneClass.cameraPose,
    viewer.camera.aspect,
    dataView ? 'data' : 'learning',
    viewer.camera.fov,
    0.26,
    SceneClass.framing
  );
  let shotSource = SceneClass.cameraPose;
  viewer.camera.position.copy(shot.position);
  viewer.controls.target.copy(shot.target);
  viewer.controls.update();

  /**
   * The viewer's own zoom, as a multiplier on whatever distance the framing
   * works out.
   *
   * It is kept here rather than left in the camera because the framing is
   * recomputed on every stage change, view toggle and resize: without this,
   * someone who pulled back to see the aortic arch would be snapped to the
   * ventricle again the moment they clicked the next stage. It survives all of
   * those, and only `resetView()` clears it.
   *
   * The scene frames itself for the ventricle and lets the top of the arch
   * crop — that is the right default for a scene about the ventricle, but the
   * choice belongs to whoever is looking. Zooming out gets the surrounding
   * vessels back; zooming in pushes everything but the chamber out of frame,
   * which is what explaining a single point to one person wants.
   */
  let userZoom = 1;

  /**
   * What each edge of the frame is covered by, as a fraction of it.
   *
   * Measured from the elements themselves, because they move: the console grows
   * with its copy, the anatomy panel is docked on a wide window and a sheet on a
   * narrow one, and the header is there throughout. Only the bands that run the
   * whole way across an edge are counted — the scene card sits in the top-left
   * corner and taking it as a full-height inset would shove the model right for
   * something it clears anyway.
   */
  const safeAreaInsets = () => {
    const width = viewer.container.clientWidth;
    const height = viewer.container.clientHeight;
    if (!width || !height) return null;
    /**
     * An element only counts as an edge band when it crosses the middle of the
     * frame, because that is where the subject is. The anatomy panel docked
     * down a wide window does cross it and genuinely takes the right-hand third;
     * the same panel on a phone is a summary in the top corner, and counting it
     * as a right-hand band shoved the model into the left edge and shrank it to
     * a third of the height for something it was never behind.
     */
    const band = (selector, crosses, read) => {
      const element = ui.querySelector(selector);
      if (!element) return 0;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height || !crosses(rect)) return 0;
      return Math.min(0.5, Math.max(0, read(rect)));
    };
    const spansWidth = (rect) => rect.left < width / 2 && rect.right > width / 2;
    const spansHeight = (rect) => rect.top < height / 2 && rect.bottom > height / 2;
    // The same panel is a different band on a different window. Docked down a
    // wide window it takes the right; collapsed to a summary on a phone it sits
    // across the top, so there it is part of the top band instead — which is
    // why this asks where the element actually is rather than which one it is.
    const railAcrossTop = (rect) =>
      spansWidth(rect) && rect.top < height / 2 && rect.bottom < height * 0.6;
    return {
      top: Math.max(
        band('.global-scene-nav', spansWidth, (rect) => rect.bottom / height),
        band('.rail', railAcrossTop, (rect) => rect.bottom / height)
      ),
      bottom: band('.console', spansWidth, (rect) => (height - rect.top) / height),
      right: band('.rail', spansHeight, (rect) => (width - rect.left) / width),
      left: 0,
    };
  };

  /** The scene's authored framing for the current view and window, before zoom. */
  const framedPose = (pose) => {
    const framed = framePose(
      pose,
      viewer.camera.aspect,
      dataView ? 'data' : 'learning',
      viewer.camera.fov,
      bottomInset(),
      SceneClass.framing
    );
    // An anatomy scene knows what it is currently drawing, so its viewpoints can
    // be fitted to the band the panels leave rather than to the whole canvas.
    // Every other scene keeps the framing it has: this is opt-in on a capability
    // the scene either offers or does not.
    const bounds = scene.getSubjectBounds?.();
    const insets = bounds ? safeAreaInsets() : null;
    return insets ? fitPoseToSafeArea(framed, {
      bounds,
      aspect: viewer.camera.aspect,
      fovDegrees: viewer.camera.fov,
      insets,
      // A scene may also say how much of that band its subject should take. The
      // brain is the whole of what is drawn and fills it; the heart is an organ
      // with vessels leaving it in every direction, and filling the band cut
      // every one of them off flush with an edge. It is a composition, so the
      // scene that knows what it is drawing owns it.
      ...(bounds.coverage > 0 ? { coverage: bounds.coverage } : {}),
    }) : framed;
  };

  const setShot = (pose) => {
    shotSource = pose;
    const next = framedPose(pose);
    shot.target.copy(next.target);
    applyZoomedPosition(shot.position, next.target, next.position);
  };

  /** Writes `from`'s direction at the zoomed distance into `out`. */
  const zoomScratch = new THREE.Vector3();
  function applyZoomedPosition(out, target, from) {
    zoomScratch.copy(from).sub(target);
    const distance = zoomedDistance(zoomScratch.length());
    out.copy(target).addScaledVector(zoomScratch.normalize(), distance);
  }

  /** A framed distance with the viewer's zoom applied, inside the orbit limits. */
  const zoomedDistance = (distance) => zoomed(distance, userZoom, viewer.controls);

  /**
   * Step the zoom. Moves along the direction the viewer is currently looking
   * from, not along the framing's — they may have orbited, and a zoom that also
   * put the camera back where the framing wants it would be a reset, not a zoom.
   *
   * @param {number} direction +1 to move in, -1 to move out
   */
  function zoomBy(direction) {
    const next = steppedZoom(userZoom, direction);
    if (next === userZoom) return;
    const applied = next / userZoom;
    userZoom = next;

    const offset = viewer.camera.position.clone().sub(viewer.controls.target);
    const distance = zoomed(offset.length() * applied, 1, viewer.controls);
    viewer.camera.position.copy(viewer.controls.target).add(offset.setLength(distance));
    viewer.controls.update();

    // Keep the pending framing in step, so the next stage change or view toggle
    // arrives at the distance the viewer chose rather than undoing it.
    setShot(shotSource);
    syncZoomLimits();
    // The reader changed what they are looking at. `start` on the controls
    // catches a drag, a pinch and a wheel; it does not catch this, because the
    // camera is moved here directly — and both zoom buttons and the +/- keys
    // arrive through this one function.
    anatomyPanel?.noteDisplayChanged?.();
  }

  function syncZoomLimits() {
    controlPanel?.setZoomLimits({
      canZoomIn: userZoom > ZOOM_RANGE[0],
      canZoomOut: userZoom < ZOOM_RANGE[1],
    });
  }

  // Re-frame on rotate/resize: a portrait phone needs a lot more distance than a laptop.
  window.addEventListener('resize', () => {
    // Before the shot, because the shot is fitted to the bands the panels leave
    // and those bands are what this changes.
    syncCompactLayout();
    setShot(shotSource);
    pvPanel?.resize();
    wavePanel?.resize();
    anatomyPanel?.noteDisplayChanged?.();
  });

  // Orbiting and zooming change what the reader is looking at, and the anatomy
  // panel has no way to know: it has no camera and no canvas. Telling it is the
  // owner's job, and all it does with it is drop a report about a viewpoint the
  // reader has left.
  //
  // `start`, not `change`. `change` fires for every camera move including the
  // ones this app makes — applying a viewpoint tweens the camera, which fired
  // `change`, which cleared the very report the viewpoint had just been applied
  // to produce. `start` fires when the **reader** begins a drag, a pinch or a
  // wheel, which is the event this is actually about.
  viewer.controls?.addEventListener?.('start', () => anatomyPanel?.noteDisplayChanged?.());

  // Only tweens while a "reset view" is in flight, so it never fights a drag.
  const view = { active: false, resumeAutoRotate: true };
  // Story and Reel are built much further down, but a viewpoint can be applied
  // from a scene's selection callback, which is wired up before that. Reading
  // those bindings directly here would throw before they initialise, so the
  // question is asked through one that exists from the start.
  let sequenceOwnsCamera = () => false;
  let inspectionPanel = null;
  let inspectionOpen = false;
  /** Set below, once the panel exists. */
  let anatomyPanel = null;
  /** Set below, when the rail is assembled; the panel toggles a class on it. */
  let railElement = null;
  const isAnatomyScene = Boolean(scene.getAnatomyTree && scene.getAnatomySelection);
  // The dense-console treatment is about what an anatomy scene's controls are,
  // not about which organ it is. It began keyed on `data-scene='brain-anatomy'`
  // and stayed there while the brain was the only one; the heart wants exactly
  // the same frame, and a second scene id in twenty-four selectors is how a
  // rule stops being a rule.
  if (isAnatomyScene) ui.dataset.anatomy = 'yes';


  /**
   * A short, wide frame is a different problem from a small one.
   *
   * A phone on its side gives 390 px of height and 844 of width. The header,
   * the title card, the console and the consent card are each a sensible height
   * on their own and together they leave the model a strip. The answer is not a
   * smaller model — it is a smaller *control area*: the title card's heading
   * duplicates the one already in the header, and the console's stage heading
   * duplicates the one in the panel. In this frame both go, and nothing that
   * does something goes with them.
   *
   * **Anatomy scenes only.** A disease scene's console carries the progression
   * it exists for, and compressing that would be removing the scene. The flag
   * is an attribute so the whole rule lives in one CSS block that cannot reach
   * any other scene.
   */
  const COMPACT_MAX_HEIGHT = 460;
  const COMPACT_MIN_ASPECT = 1.6;
  const syncCompactLayout = () => {
    const short = window.innerHeight <= COMPACT_MAX_HEIGHT;
    const wide = window.innerWidth / Math.max(1, window.innerHeight) >= COMPACT_MIN_ASPECT;
    const compact = isAnatomyScene && short && wide;
    if (compact) ui.dataset.anatomyCompact = 'landscape';
    else delete ui.dataset.anatomyCompact;
    return compact;
  };
  syncCompactLayout();


  /**
   * The viewer's own vantage during the guided sequence.
   *
   * The sequence authors where to look and from how far, but which side the
   * viewer looks from is theirs — a guided explanation someone cannot turn to
   * see the septum from is a video, not a model. `orbit` is the rotation from
   * the step's authored view direction to the one they dragged to; it is
   * re-applied to every later step, so the sequence keeps re-framing while
   * their angle survives. `dragging` suspends the camera tween outright, so
   * nothing fights the drag itself.
   */
  const storyView = { dragging: false, orbit: new THREE.Quaternion() };
  const storyOffset = new THREE.Vector3();
  const storyCurrent = new THREE.Vector3();

  viewer.controls.addEventListener('start', () => {
    view.active = false;
    storyView.dragging = true;
    // A named viewpoint describes an exact reproducible pose. Once the learner
    // takes the camera, the UI must stop claiming that exact view is active.
    inspectionPanel?.clearView();
  });

  // A wheel or a pinch is the same intent as the buttons, so it is read back
  // into the same number. Without this the two would disagree: scrolling out
  // and then clicking a stage would snap back, while the buttons would not.
  viewer.controls.addEventListener('end', () => {
    storyView.dragging = false;
    if (storyMode?.active) {
      // Same read-back as below, against the step's authored pose rather than
      // the stage framing: the angle becomes an offset the sequence carries,
      // and the distance becomes the same zoom the buttons drive.
      storyOffset.copy(storyMode.pose.position).sub(storyMode.pose.target);
      storyCurrent.copy(viewer.camera.position).sub(viewer.controls.target);
      const authored = storyOffset.length();
      const actual = storyCurrent.length();
      if (!authored || !actual) return;
      storyView.orbit.setFromUnitVectors(storyOffset.normalize(), storyCurrent.normalize());
      userZoom = clampZoom(actual / authored);
      syncZoomLimits();
      return;
    }
    if (view.active || reelMode?.active) return;
    const framed = framedPose(shotSource);
    const base = framed.position.distanceTo(framed.target);
    if (!base) return;
    const actual = viewer.camera.position.distanceTo(viewer.controls.target);
    userZoom = clampZoom(actual / base);
    setShot(shotSource);
    syncZoomLimits();
  });

  // --- UI -------------------------------------------------------------------
  const playback = new Playback({ duration: 26 });

  const legend = createLegend(meta);
  const stageReadout = createStageReadout({ meta, onSeek: (value) => seek(value) });
  const labels = createLabelLayer({ viewer, annotations: scene.getAnnotations() });
  const sceneInspectionViews = scene.getInspectionViews?.() ?? scene.getAnatomyViews?.();
  const hasAuthoredInspectionViews = Boolean(sceneInspectionViews?.length);
  const generatedInspectionViews = standardInspectionViews(SceneClass.cameraPose);
  const inspectionViews = hasAuthoredInspectionViews ? sceneInspectionViews : generatedInspectionViews;
  const initialInspectionView = inspectionViews[0]?.id;
  const inspectionModes = scene.getInspectionModes?.() ?? [];
  const initialInspectionMode = scene.getInspectionMode?.() ?? inspectionModes[0]?.id;
  let inspectionLabelsVisible = true;

  /**
   * Open or close the shared display controls.
   *
   * On an anatomy scene they are not a sheet of their own — they are the panel's
   * Display tab — so the console's control brings that tab forward instead of
   * hiding a panel the reader can already see. Same button, same place in the
   * console: nothing about the pathology scenes' layout changes.
   */
  function setInspectionOpen(enabled) {
    if (anatomyPanel) {
      if (enabled) anatomyPanel.showDisplay();
      else anatomyPanel.closeSheet();
      controlPanel?.setInspection(Boolean(enabled));
      inspectionOpen = Boolean(enabled);
      return;
    }
    inspectionOpen = Boolean(enabled);
    inspectionPanel?.setOpen(inspectionOpen);
    controlPanel?.setInspection(inspectionOpen);
  }

  function inspectionPoseFor(id) {
    if (hasAuthoredInspectionViews) {
      return scene.getInspectionView?.(id) ?? scene.getAnatomyView?.(id) ?? null;
    }
    // A comparison can widen the target after this list was first built. Build
    // its generated poses from the live establishing shot so every angle keeps
    // both subjects in frame.
    return standardInspectionViews(comparisonOrStageShot()).find((candidate) => candidate.id === id) ?? null;
  }

  /**
   * @param {string} id
   * @param {{byReader?: boolean}} [options] `byReader: false` when the app is
   *   applying a viewpoint on the reader's behalf — a display recipe turning to
   *   the view it is defined at. Such a move must not invalidate the report the
   *   recipe is about to write; a viewpoint the reader presses must.
   */
  function applyInspectionView(id, { byReader = true } = {}) {
    if (!inspectionViews.some((candidate) => candidate.id === id)) return false;
    // A guided sequence and a recording own the camera outright and rewrite the
    // shot every frame. Accepting a viewpoint here would leave the panel
    // claiming a pose the next frame discards, so it is refused instead.
    if (sequenceOwnsCamera()) return false;
    const accepted = scene.setInspectionView?.(id) ?? scene.setAnatomyView?.(id);
    if (accepted === false) return false;
    const pose = inspectionPoseFor(id);
    if (!pose) return false;
    userZoom = 1;
    storyView.orbit.identity();
    setShot(pose);
    view.active = true;
    view.resumeAutoRotate = false;
    viewer.controls.autoRotate = false;
    syncZoomLimits();
    inspectionPanel?.setView(id);
    if (byReader) anatomyPanel?.noteDisplayChanged?.();
    return true;
  }

  function applyInspectionMode(id) {
    if (!inspectionModes.some((candidate) => candidate.id === id)) return false;
    scene.setInspectionMode?.(id);
    const active = scene.getInspectionMode?.() ?? id;
    if (active !== id) return false;
    ui.dataset.inspectionMode = active;
    legend.setPalette(scene.getInspectionLegendPalette?.(active));
    inspectionPanel?.setMode(active);
    return true;
  }

  function applyInspectionBackground(id) {
    const accepted = viewer.setBackgroundPreset(id);
    ui.dataset.background = accepted.id;
    paintPageGround(accepted);
    inspectionPanel?.setBackground(accepted.id);
    return accepted.id === id;
  }

  function setInspectionLabels(enabled) {
    inspectionLabelsVisible = Boolean(enabled);
    labels.element.hidden = !inspectionLabelsVisible;
    inspectionPanel?.setLabels(inspectionLabelsVisible);
  }

  function resetInspectionDisplay() {
    applyInspectionBackground(defaultBackground.id);
    setInspectionLabels(true);
    if (initialInspectionMode) applyInspectionMode(initialInspectionMode);
    resetView();
  }

  function resetMedicalState() {
    playback.reset();
    if (!scene.resetModelControls) return;
    scene.resetModelControls();
    modelControls?.sync(scene.getModelControls?.() ?? []);
    refreshModelReadouts();
  }

  const controlPanel = createControlPanel({
    meta,
    onSeek: (value) => seek(value),
    onToggle: () => playback.toggle(),
    onReset: resetMedicalState,
    onResetView: resetView,
    onCapture: (preset) => {
      capture(viewer, meta, stageReadout.stage, playback.value, preset);
      // The SNS layer's only measurable outcome: a file the user chose to keep.
      emitAppEvent('reel:export', { format: 'png', preset: preset?.id ?? 'view' });
    },
    onCompareToggle: scene.setComparison ? (enabled) => setComparison(enabled) : undefined,
    onReel: scene.getReel ? () => toggleReel() : undefined,
    onLearn: scene.getLearningModules ? () => toggleLearning() : undefined,
    // A primary tactile interaction keeps its three read-outs on screen. It
    // has no second layer of plots or parameters to reveal, so a Data button
    // would be a switch between two views that contain the same information.
    onDataToggle:
      scene.getMetrics && !meta.modelControls?.primary ? (enabled) => setDataView(enabled) : undefined,
    onZoom: (direction) => zoomBy(direction),
    // An anatomy scene owns its display controls: they are a tab of its panel,
    // reached by the panel's own Parts button and its tabs. A second control in
    // the console would be a second way in to the same surface — and on a phone
    // it would be a second way to open a modal, which is one too many. The
    // pathology scenes keep the button exactly as they had it.
    onInspectionToggle: isAnatomyScene ? undefined : (enabled) => setInspectionOpen(enabled),
    // Only scenes that ship a guided sequence get the button; without this it
    // latched on and did nothing on a scene with no storyboard.
    //
    // Two kinds of sequence share the button because they are the same offer to
    // the reader — "walk me through it". A beat has a clock and plays itself;
    // a chain of causes does not, and waits for Next. Which one a scene ships
    // decides which one this opens.
    onStoryToggle:
      scene.getStory || scene.getCausalStory
        ? (enabled) => {
            if (scene.getCausalStory) {
              setCausalStory(enabled);
              return;
            }
            storyView.orbit.identity();
            if (enabled) storyMode.enter();
            else storyMode.exit();
          }
        : undefined,
  });

  // One switch, one place. Every string in the interface exists in both
  // languages in the DOM and is chosen by a single CSS rule on this attribute,
  // so nothing can be left holding the previous language.
  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });

  // Optional: scenes that expose a model can show a live read-out beside the view.
  const metricsPanel = scene.getMetrics ? createMetricsPanel() : null;
  if (meta.modelControls?.primary) metricsPanel?.element.classList.add('is-primary');
  // Optional: a scene whose model produces pressures can plot its own loop.
  const pvPanel = scene.getPressureVolume
    ? createPressureVolumePanel({
        title: meta.pressureVolume?.label ?? 'Pressure-volume loop',
        titleJa: meta.pressureVolume?.labelJa ?? '圧-容積ループ',
      })
    : null;
  // The same solved beat, plotted against time instead of volume.
  const wavePanel = scene.getPressureVolume
    ? createPressureWavePanel({
        title: meta.pressureWave?.label ?? 'Pressure over one beat',
        titleJa: meta.pressureWave?.labelJa ?? '1 拍の圧波形',
      })
    : null;
  /**
   * Optional: plots a scene declares in its copy and fills from its model.
   *
   * The static half — title, axes, key — is `meta.charts`; the numbers arrive
   * per frame from `scene.getCharts()`, keyed by the same ids. Splitting them
   * is what keeps the wording of a plot beside the rest of the scene's wording
   * and out of the render loop.
   */
  const chartPanels = (meta.charts ?? []).map((spec) => createChartPanel(spec));

  // A scene may also declare a segment map — a subject flattened so that all of
  // it is visible at once, where a 3D view can only show the half facing the
  // camera. Split the same way as a chart: the wedges, their names and their
  // colours are declared beside the scene's other wording, and only what fills
  // them arrives per frame. Same panel interface, so everything below that
  // updates, resizes or focuses a chart handles this without knowing what it is.
  // First in the rail, not last. It answers the scene's own question — which
  // muscle a narrowed artery starves — and pushed to the bottom of four panels
  // it fell below the rail's fold, which is where a reader never finds it.
  if (meta.bullseye) chartPanels.unshift(createBullseyePanel(meta.bullseye));
  const chartById = new Map(chartPanels.map((panel) => [panel.id, panel]));

  // Optional: what the model answers, what it does not, and where it came from.
  // A scene that has lost the Prototype badge needs this on the same screen as
  // the numbers it is now asking to be believed about.
  /**
   * Where this model says the rest is shown, filtered to what this build opens.
   *
   * One list, decided once. The scope panel renders it at the bottom of "what
   * this model does not represent", which is the right place for the detail and
   * the wrong place to *find* it — so the same list is handed out on the app's
   * API for a shallower entry point elsewhere in the shell. Whoever adds that
   * entry point reads this rather than writing the routes out again: two copies
   * of a link list is how one of them comes to offer a scene the gate closed.
   */
  // A scene the release is holding back is not in this build, so a link to it
  // would be a link to "TO BE UPDATED". They are dropped here, once, and the
  // gate — not the panel and not the shell — decides which.
  const isSceneSlugOpen = (slug) => sceneOpen(SCENES.find((entry) => entry.slug === slug) ?? { id: slug });
  /**
   * Declared on the scene's own meta, or — for a scene whose model sources are
   * pinned to a recorded publication decision — on its catalogue entry.
   *
   * The brain atlas is the second kind. Adding a route to `src/data/
   * brainAnatomy.js` moves that file's digest, which moves the card revision,
   * which makes the beta's publication decision stale and closes the one scene
   * the beta publishes. Which route a scene offers is catalogue information
   * anyway, so for that case it is declared where the catalogue is and nothing
   * about the model changes.
   */
  const relatedSource = meta.related ?? entry?.related ?? null;
  const related = Object.freeze({
    scenes: Object.freeze(
      (relatedSource?.scenes ?? []).filter((item) => item?.slug && isSceneSlugOpen(item.slug)).map(Object.freeze)
    ),
    note: relatedSource?.note ?? null,
    noteJa: relatedSource?.noteJa ?? null,
  });
  const scopePanel = meta.modelScope ? createModelScopePanel(meta.modelScope) : null;
  // One place, on every scene. The scope panel says what the model does not
  // represent; this says where the rest is shown.
  const relatedPanel = createRelatedScenesPanel(related);
  if (meta.modelScope?.primary) scopePanel?.element.classList.add('is-primary');

  inspectionPanel = createInspectionPanel({
    views: inspectionViews,
    activeView: initialInspectionView,
    authoredViews: hasAuthoredInspectionViews,
    backgrounds: BACKGROUND_PRESETS,
    activeBackground: initialBackground.id,
    modes: inspectionModes,
    activeMode: initialInspectionMode,
    labelsVisible: inspectionLabelsVisible,
    onView: applyInspectionView,
    onBackground: applyInspectionBackground,
    onMode: applyInspectionMode,
    onLabels: setInspectionLabels,
    onReset: resetInspectionDisplay,
    onClose: () => {
      setInspectionOpen(false);
      controlPanel.focusInspection();
    },
    // An anatomy scene shows these inside its Display tab, where a close button
    // would close nothing the reader can see.
    embedded: isAnatomyScene,
  });
  if (initialInspectionMode) applyInspectionMode(initialInspectionMode);

  // An anatomy scene gets one panel instead of three stacked in the rail. It is
  // the same components — the tree, the shared inspection controls, the colour
  // key and the selection card — composed into a layout where the summary
  // cannot be scrolled away and exactly one region scrolls. Nothing is built
  // twice: each element is created once here and handed over.
  const anatomyInfo = scene.getAnatomySelection
    ? createAnatomyInfoPanel(scene, {
        onPreferredView: applyInspectionView,
        // The panel's summary already carries the name and the breadcrumb, and
        // a second copy inside the scrolling body is the copy that scrolls away.
        heading: !isAnatomyScene,
        // Who to credit, read from the asset records rather than written into
        // the panel: this panel serves every anatomy scene, and a literal was
        // only ever right for one of them.
        attribution: attributionForScene(entry?.id ?? entry?.slug ?? meta.id),
      })
    : null;

  // The part tree and the card are two readings of one selection, not two
  // states: both bind to `onAnatomySelection`, and neither holds an opinion the
  // scene has not been told about. `src/app/anatomyContract.js` is the rule they
  // share, and `tests/anatomy-contract.test.js` is what holds the scene to it.
  const anatomyTree = scene.getAnatomyTree ? createAnatomyTreePanel(scene) : null;

  /**
   * Take the camera to one structure, at the angle it is already being seen from.
   *
   * The same fit the whole model gets, given a smaller subject: the band the
   * panels leave, the distance that fills it, the pan that centres it. The
   * direction is left alone — a reader who asked to go *closer* to something did
   * not ask to be turned around, and a viewpoint they chose is not undone by it.
   *
   * A structure the scene cannot bound is not a failure to report loudly: the
   * caller offers this only for structures it got from the scene, so `false`
   * here means the model is not loaded yet.
   */
  const focusOnStructure = (id) => {
    const bounds = scene.getStructureBounds?.(id);
    if (!bounds) return false;
    const pose = { position: viewer.camera.position.clone(), target: viewer.controls.target.clone() };
    const insets = safeAreaInsets();
    const fitted = insets
      ? fitPoseToSafeArea(pose, {
          bounds,
          aspect: viewer.camera.aspect,
          fovDegrees: viewer.camera.fov,
          insets,
          // Closer than the whole model sits, because the subject is one part
          // of it and the point of asking was to see it larger.
          coverage: 0.5,
        })
      : pose;
    userZoom = 1;
    shot.target.copy(fitted.target);
    shot.position.copy(fitted.position);
    view.active = true;
    viewer.controls.autoRotate = false;
    // "Go to it" moves the camera without touching the controls, so nothing
    // else would notice.
    anatomyPanel?.noteDisplayChanged?.();
    return true;
  };

  anatomyPanel = isAnatomyScene
    ? createAnatomyPanel({
        scene,
        tree: anatomyTree,
        display: inspectionPanel.element,
        legend: legend.element,
        detail: anatomyInfo.element,
        // Handed straight through. The panel decides when to offer it — only on
        // a failed load — and the shell decides what it does.
        onRetryModel,
        onFocusStructure: focusOnStructure,
        // Through the control that owns the value, so the slider, the stage
        // readout and the model all move together.
        onLayerChange: (value) => seek(value),
        // Same rule for the viewpoint: the inspection panel owns which one is
        // current, so a scene that reports a new one is applied through it
        // rather than moving the camera behind the control's back.
        onViewChange: (id, options) => applyInspectionView(id, options),
        // Docked, the panel's body is the one scroller and the rail must not be
        // a second one around it. As a sheet the body is `position: fixed` and
        // out of the rail entirely, so the rail goes back to scrolling like it
        // does on every other scene — which it has to: with the consent
        // question on screen a 320 px phone leaves the rail 92 px, and a rail
        // that clips instead of scrolling puts the Parts button out of reach.
        onLayout: (layout) => railElement?.classList.toggle('is-anatomy-docked', layout === 'docked'),
      })
    : null;


  // Optional: sliders for the conditions the scene's model is solved under.
  const modelControls = scene.getModelControls
    ? createModelControls({
        controls: scene.getModelControls(),
        onChange: (id, value) => {
          scene.setModelControl(id, value);
          // A model may canonicalise an input or make options mutually
          // exclusive. Read the accepted state back immediately so the
          // controls can never display a combination the model does not have.
          modelControls.sync(scene.getModelControls());
          refreshModelReadouts();
        },
        onReset: () => {
          scene.resetModelControls();
          modelControls.sync(scene.getModelControls());
          refreshModelReadouts();
        },
        copy: meta.modelControls,
      })
    : null;
  const controlsInConsole = meta.modelControls?.placement === 'console';

  // Optional: a scene that ships guided lessons gets a Learn button. The lesson
  // drives the model through the same setters the sliders use — it has no
  // private path into the medical model, by design.
  const learningPanel = scene.getLearningModules
    ? createLearningPanel({
        modules: scene.getLearningModules(),
        setProgress: (value) => seek(value),
        setControl: (id, value) => {
          scene.setModelControl(id, value);
          modelControls?.sync(scene.getModelControls());
          refreshModelReadouts();
        },
        readMetrics: () => scene.getMetrics(),
        readControls: () => scene.getModelControls(),
        settleModel: scene.settleModel ? () => scene.settleModel() : undefined,
        onExit: () => setLearning(false),
      })
    : null;

  /**
   * Optional: a scene whose subject is a chain of causes rather than a cycle
   * gets a stepped walk-through instead of a timed one. Like the lesson, it
   * drives the model through the public setters and has no private path in.
   */
  const causalStory = scene.getCausalStory
    ? createCausalStoryPanel({
        story: scene.getCausalStory(),
        setProgress: (value) => seek(value),
        setControl: (id, value) => {
          scene.setModelControl(id, value);
          modelControls?.sync(scene.getModelControls());
        },
        settleModel: scene.settleModel ? () => scene.settleModel() : undefined,
        onStep: (step) => {
          // Presentation only: which numbers and which plot the step is about.
          metricsPanel?.highlight(step.watch ?? []);
          for (const panel of chartPanels) panel.setFocused(step.chart === panel.id);
          refreshModelReadouts();
        },
        onExit: () => setCausalStory(false),
      })
    : null;

  /** Everything that reads back off the model after it is re-solved. */
  function refreshModelReadouts() {
    if (metricsPanel) metricsPanel.update(scene.getMetrics());
    if (chartPanels.length && scene.getCharts) {
      // One read of the model for every plot, so two charts cannot end up
      // showing two different solutions of the same state.
      const charts = scene.getCharts();
      for (const [id, chart] of Object.entries(charts)) chartById.get(id)?.update(chart);
    }
    if (meta.bullseye && scene.getBullseye) {
      for (const [id, map] of Object.entries(scene.getBullseye())) chartById.get(id)?.update(map);
    }
    if (!pvPanel) return;
    // One read of the model, shared by both plots, so they cannot disagree.
    const pressureVolume = scene.getPressureVolume();
    pvPanel.update(pressureVolume);
    wavePanel?.update(pressureVolume);
  }
  // Scoped to what the release opens. The switcher is reached *from* a model,
  // so every row in it is an invitation; one that lands on "to be updated" is
  // the worst place to put that page, because the reader was already inside the
  // product. Lab is a locked route in the beta, so its shelf link comes off too.
  const sceneSwitcher = createSceneSwitcher({
    groups: systemsWithScenes(betaUnlocked() ? SCENES : RELEASED_SCENES),
    currentId: resolveSceneId(),
    showLab: betaUnlocked(),
  });

  const uiToggle = el('button', {
    class: 'ui-toggle',
    type: 'button',
    title: 'Hide interface for capture (H)',
    text: 'UIを隠す',
    on: {
      click: () => {
        const hidden = ui.classList.toggle('is-hidden');
        uiToggle.textContent = hidden ? 'UIを表示' : 'UIを隠す';
      },
    },
  });

  // The rail is a shared scroll box: on a short or narrow window its contents
  // genuinely run past its edge, and a clipped panel reads as one that simply
  // ends. Both it and the display panel say when there is more below.
  const rail = el('div', { class: 'rail' }, anatomyPanel
    ? [
        // One panel, and it owns its own height: the rail must not scroll
        // around a panel whose body already does, or the body's rows end up
        // straddling the rail's clip edge.
        anatomyPanel.element,
        el('div', { class: 'rail-buttons' }, [languageToggle.element, uiToggle]),
      ]
    : [
        inspectionPanel.element,
        anatomyInfo?.element,
        legend.element,
        metricsPanel?.element,
        el('div', { class: 'rail-buttons' }, [languageToggle.element, uiToggle]),
      ]);
  if (anatomyPanel) {
    rail.classList.add('is-anatomy');
    railElement = rail;
    rail.classList.toggle('is-anatomy-docked', anatomyPanel.element.dataset.layout === 'docked');
  } else {
    markScrollable(rail);
    markScrollable(inspectionPanel.element);
  }

  const consoleElement = el('div', { class: 'panel console' }, [
    stageReadout.element,
    causalStory?.element,
    learningPanel?.element,
    controlsInConsole ? modelControls?.element : null,
    controlPanel.element,
  ]);
  // On a phone the display panel docks just above the console. Only the console
  // knows how tall it is, and it differs by scene.
  publishHeight(consoleElement, ui, '--console-height');
  // And on a narrow portrait phone the read-out is what gives, so that the
  // controls under it stay in reach and the model keeps a band (see the
  // responsive visibility policy in ui.css). A stage summary cut flat there
  // reads as a sentence that ends mid-word, which is the same failure the rail
  // and the left stack already answer with this cue.
  markScrollable(stageReadout.element);

  // The model panels go on the left, where there is room for them: the rail
  // already carries the legend and the read-out, and stacking four panels
  // there pushes the console off a laptop screen.
  const topLeft = el('div', { class: 'top-left' }, [
    createTitleCard(meta),
    pvPanel?.element,
    wavePanel?.element,
    ...chartPanels.map((panel) => panel.element),
    controlsInConsole ? null : modelControls?.element,
    scopePanel?.element,
    // Last, under the model's own limits: "what this does not represent" is the
    // question the way on answers.
    relatedPanel?.element,
  ]);
  // And it scrolls for the same reason the rail does — but it was the one
  // scroll box in the frame that never said so. Measured on the ischemia scene,
  // which carries four panels here: at 1440×900 it shows 433 px of 520 and at
  // 1280×720 it shows 253, so the panel at the bottom of the stack is cut with
  // nothing on screen to say it is there. Same cue as the rail, no layout cost.
  markScrollable(topLeft);

  const topBar = el('div', { class: 'top-bar' }, [topLeft, rail]);
  // The phone sheet stops where the title and selection cards end, rather than
  // at a reserved constant that is only right on the scene it was measured on.
  publishHeight(topBar, ui, '--chrome-bottom', (box) => box.bottom);

  ui.append(
    // The global navigation is `position: fixed` and anchored to the viewport,
    // so its parent is a paint-order decision, not a layout one — and it used
    // to sit inside `.top-left`. That mattered the moment `.top-left` got the
    // scroll cue: `mask-image` makes the masked element a stacking context and
    // paints its *fixed* descendants inside it, and on a phone the four header
    // controls — brand, favourite, sign in, the catalogue trigger — measured
    // as covered by the canvas at 320×568 and 375×812. `verify:ui` caught it;
    // the nav lives beside the top bar now, where nothing masks it.
    sceneSwitcher?.element,
    topBar,
    consoleElement,
    labels.element
  );

  /**
   * The structure a reader picked gets a label on the model, not only a card.
   *
   * Both of these go through the same layer the authored landmarks do, so they
   * take the same occlusion test and the same cap: a selection outranks a hover,
   * a hover outranks a landmark, and when there is not room the landmarks are
   * the ones that step back. A structure the display is not drawing has no
   * label — and none of this touches the panel, which goes on naming what is
   * pinned whether or not the model can show it.
   */
  if (isAnatomyScene && scene.getStructureAnnotation) {
    const label = (kind) => (structure) => {
      labels.setStructureLabel(kind, structure ? scene.getStructureAnnotation(structure.id) : null);
    };
    scene.onAnatomySelection(label('selection'));
    scene.onAnatomyHover?.(label('hover'));
  }

  // --- state flow -----------------------------------------------------------
  playback.onChange = (value, playing) => {
    scene.setProgress(value);
    stageReadout.update(value);
    legend.update(value);
    labels.update(value);
    controlPanel.update(value, playing);
    refreshModelReadouts();
    applyLabelFocus();
    // Which actions the anatomy panel offers depends on this value — a deep
    // structure the layer has just brought into view no longer needs a way to
    // be brought into view.
    anatomyPanel?.refresh?.();

  };

  let comparing = false;
  /** When the current comparison was entered, so "how long was it read for" is answerable. */
  let comparingSince = 0;

  /**
   * Side-by-side with a healthy reference. The camera widens to hold both, and
   * the annotation layer swaps to the comparison labels.
   */
  function setComparison(enabled) {
    if (!scene.setComparison) return;
    // Leaving a comparison that was actually looked at is the completion; the
    // interesting question is whether side-by-side gets used, not offered.
    if (comparing && !enabled) {
      emitAppEvent('compare:complete', { elapsedMs: Math.round(performance.now() - comparingSince) });
    }
    if (!comparing && enabled) comparingSince = performance.now();
    comparing = enabled;
    scene.setComparison(enabled);
    labels.setComparison(enabled);
    applyLabelFocus();
    controlPanel.setComparison(enabled);
    refreshModelReadouts();
    setShot(comparisonOrStageShot());
    view.active = true;
    view.resumeAutoRotate = true;
    viewer.controls.autoRotate = false;
  }

  /**
   * Where the camera rests.
   *
   * The comparison has its own framing because both hearts have to stay in the
   * frame. Everything else uses the scene's own establishing shot: the redesign
   * settled on one camera for the interactive view, and the guided sequence is
   * where a moving camera belongs.
   */
  function comparisonOrStageShot() {
    if (comparing) return scene.getComparisonView?.() ?? SceneClass.cameraPose;
    return SceneClass.cameraPose;
  }

  /**
   * Take the camera somewhere a guided explanation names, and point the labels
   * at what that step is about.
   *
   * **Presentation only.** It moves the camera and narrows the label layer; it
   * sets no progression, runs no solve and changes nothing the model is in. A
   * step that turns the reader's attention from the ventricle to the vessels
   * behind it is a different picture of the same solved state, and this is what
   * makes that possible without the step also being a state change.
   *
   * It is an *explicit* operation — the reader pressed Next — so it is allowed
   * to move a camera the reader had orbited, exactly as choosing a named
   * viewpoint is. That is a different thing from the automatic re-framing that
   * follows a panel resize, which stops as soon as anyone touches the camera.
   *
   * The framings themselves belong to the scene (`getGuideFramings`), because
   * where the pulmonary veins lie is a fact about the anatomy on screen.
   *
   * @param {string|null} id a framing the scene declares, or null for its own
   * @param {{focus?: string[]|null}} [options] annotation ids to point at
   * @returns {boolean} whether the id was one the scene offers
   */
  function applyGuideFraming(id, { focus = null } = {}) {
    if (sequenceOwnsCamera()) return false;
    storyFocus = focus ?? null;
    const framing = id ? scene.getGuideFramings?.()[id] : null;
    if (id && !framing) {
      applyLabelFocus();
      return false;
    }
    userZoom = 1;
    storyView.orbit.identity();
    if (framing) {
      const target = framing.target.clone();
      setShot({
        target,
        position: target.clone().addScaledVector(framing.direction.clone().normalize(), framing.distance),
      });
    } else {
      setShot(comparisonOrStageShot());
    }
    applyLabelFocus();
    view.active = true;
    view.resumeAutoRotate = false;
    viewer.controls.autoRotate = false;
    inspectionPanel?.clearView();
    syncZoomLimits();
    return true;
  }

  /**
   * Put the model into the state a guided explanation's step is about.
   *
   * **This one does change the model**, which is exactly why it is not part of
   * `applyGuideFraming`. A respiratory guide's opening step is an ordinary lung
   * and its second step is the same lung with narrowed airways; the difference
   * between them is a model control, not a camera. So the two live apart and a
   * reader of a step can tell which kind of change it asks for.
   *
   * It goes through the scene's public setters — the same ones the stepped
   * walk-through and the model-control panel use — so there is no private path
   * into the physiology and every read-out re-derives from the solved state.
   *
   * @param {{controls?: Record<string, number>|null, compare?: boolean|null}} step
   * @returns {boolean} whether anything moved
   */
  function applyGuideState({ controls = null, compare = null } = {}) {
    let moved = false;
    if (controls && scene.setModelControl) {
      for (const [id, value] of Object.entries(controls)) {
        scene.setModelControl(id, value);
        moved = true;
      }
      scene.settleModel?.();
      modelControls?.sync(scene.getModelControls?.() ?? []);
      refreshModelReadouts();
    }
    if (compare !== null && scene.setComparison && Boolean(compare) !== comparing) {
      setComparison(Boolean(compare));
      moved = true;
    }
    return moved;
  }

  function seek(value) {
    playback.pause();
    playback.set(value);
  }

  function resetView() {
    // "View" means the framing the scene authored, so it puts the zoom back
    // too — and, inside the guided sequence, the vantage it authored as well.
    userZoom = 1;
    storyView.orbit.identity();
    syncZoomLimits();
    if (hasAuthoredInspectionViews && initialInspectionView) {
      scene.setInspectionView?.(initialInspectionView) ?? scene.setAnatomyView?.(initialInspectionView);
    }
    setShot(comparisonOrStageShot());
    view.active = true;
    view.resumeAutoRotate = true;
    if (initialInspectionView) inspectionPanel?.setView(initialInspectionView);
    // "View" is the reader asking for the authored framing back.
    anatomyPanel?.noteDisplayChanged?.();
    // Auto-rotate would pull against the tween and stall it half-way;
    // it is switched back on once the camera has actually landed.
    viewer.controls.autoRotate = false;
  }

  // --- loop -----------------------------------------------------------------
  viewer.onFrame((dt, elapsed) => {
    playback.update(dt);
    scene.update(dt, elapsed);
    if (learning) {
      learningPanel.tick();
      metricsPanel?.highlight(learningPanel.watched);
    }
    // Both plots carry a cursor that tracks the beating heart, so they are
    // redrawn every frame — from a single read of the model.
    if (pvPanel && !reelMode?.active) {
      const pressureVolume = scene.getPressureVolume();
      pvPanel.update(pressureVolume);
      wavePanel?.update(pressureVolume);
    }
    // Charts whose model is still running — a lung filling and emptying, a
    // cursor walking a loop — are redrawn with it, from one read per frame.
    if (chartPanels.length && scene.getCharts && !reelMode?.active) {
      const charts = scene.getCharts();
      for (const [id, chart] of Object.entries(charts)) chartById.get(id)?.update(chart);
      if (meta.bullseye && scene.getBullseye) {
        for (const [id, map] of Object.entries(scene.getBullseye())) chartById.get(id)?.update(map);
      }
      // And so is the read-out. A scene whose model keeps working after the
      // control that changed it — a lung climbing to a new resting volume, a
      // network being re-solved to full accuracy once the slider is let go —
      // leaves the panel quoting a number that has since moved on if the
      // read-out is only refreshed when something is set.
      metricsPanel?.update(scene.getMetrics());
    }
    if (storyMode?.active) {
      storyMode.tick();
      // The sequence names where the camera should be; the same damped tween
      // the rest of the app uses carries it there, so the motion matches.
      // The sequence authors each step's distance, but how much of the scene the
      // viewer wants in frame is still theirs.
      shot.target.copy(storyMode.pose.target);
      // The step's own direction, turned by however far the viewer has orbited
      // and pulled to whatever distance they zoomed to.
      storyOffset.copy(storyMode.pose.position).sub(storyMode.pose.target).applyQuaternion(storyView.orbit);
      const storyDistance = zoomedDistance(storyOffset.length());
      shot.position.copy(shot.target).addScaledVector(storyOffset.normalize(), storyDistance);
      // While the pointer is down the controls own the camera outright;
      // damping toward the authored pose here is what used to drag it back.
      if (!storyView.dragging) tweenPose(viewer, shot, dt);
      labels.render();
      if (pvPanel) {
        const pressureVolume = scene.getPressureVolume();
        pvPanel.update(pressureVolume);
        wavePanel?.update(pressureVolume);
      }
      return;
    }
    if (reelMode?.active) {
      // The sequence owns the camera while it runs, so the interactive tween
      // must stay out of the way. It advances on the wall clock rather than on
      // the render delta, so a recording is 15 real seconds even if frames drop.
      reelMode.tick();
      return;
    }
    if (view.active) {
      view.active = tweenPose(viewer, shot, dt);
      if (!view.active) {
        viewer.controls.autoRotate = view.resumeAutoRotate && allowAutoRotate && !prefersReducedMotion();
      }
    }
    labels.render();
  });

  // --- social sequence ------------------------------------------------------
  const reelMode = scene.getReel
    ? createReelMode({
        viewer,
        scene,
        ui,
        stage,
        reel: scene.getReel(),
        setComparison,
        setProgress: (value) => {
          playback.pause();
          playback.set(value);
        },
        getLanguage: () => ui.dataset.lang ?? 'both',
        captureState: () => captureSessionState({ playback, viewer, scene, comparing }),
        restoreState: (state) => {
          restoreSessionState(state, { playback, viewer, scene, setComparison });
          if (modelControls) modelControls.sync(scene.getModelControls());
          refreshModelReadouts();
          // setComparison queues a camera tween; the restored camera must win.
          view.active = false;
        },
      })
    : null;

  function setDataView(enabled) {
    if (dataView === enabled) return;
    dataView = enabled;
    ui.dataset.view = enabled ? 'data' : 'learning';
    controlPanel.setDataView(enabled);
    applyLabelFocus();
    // The camera can sit closer when the panels are not crowding the frame.
    setShot(comparisonOrStageShot());
    view.active = true;
    view.resumeAutoRotate = true;
    viewer.controls.autoRotate = false;
    // The canvases are laid out only when they become visible.
    requestAnimationFrame(() => {
      pvPanel?.resize();
      wavePanel?.resize();
      for (const panel of chartPanels) panel.resize();
      refreshModelReadouts();
    });
  }

  /**
   * What the labels should point at right now.
   *
   * The guided sequence wins when it is running; otherwise learning view shows
   * the one label the current stage is about, and Data view shows everything
   * whose window is open — someone reading the plots has already asked for
   * detail.
   */
  function applyLabelFocus() {
    // The comparison has its own two labels and no stage focus list mentions
    // them, so narrowing there would leave both hearts unnamed.
    if (comparing) labels.setFocus(null);
    else if (storyFocus) labels.setFocus(storyFocus);
    else if (dataView) labels.setFocus(null);
    else labels.setFocus(meta.stages[stageIndexFor(playback.value, meta.stages)]?.focus ?? ['lv']);
    labels.update(playback.value);
  }

  let learning = false;
  /** The interactive session as it was before the lesson took over. */
  let learningSnapshot = null;
  /** Which view the lesson interrupted, so it can be handed back. */
  let learningPreviousView = false;

  /**
   * A lesson parks the model on the state it starts from, so it takes the same
   * snapshot the reel does and hands everything back on the way out.
   *
   * It also switches to Data view for its duration. The lesson asks the viewer
   * to move a loading slider and then to read what ESV and SV did — both of
   * which live in the panels learning view puts away, so running one in
   * learning view pointed at controls and numbers that were not on screen.
   */
  function setLearning(enabled) {
    if (!learningPanel || enabled === learning) return;
    learning = enabled;
    ui.classList.toggle('is-learning', enabled);
    if (enabled) {
      learningSnapshot = captureSessionState({ playback, viewer, scene, comparing });
      learningPreviousView = dataView;
      setDataView(true);
      learningPanel.start();
    } else {
      setDataView(learningPreviousView);
      if (learningSnapshot) {
        restoreSessionState(learningSnapshot, { playback, viewer, scene, setComparison });
        modelControls?.sync(scene.getModelControls());
        refreshModelReadouts();
        view.active = false;
      }
      learningSnapshot = null;
      metricsPanel?.highlight([]);
    }
  }

  function toggleLearning() {
    setLearning(!learning);
  }

  let storyStepping = false;
  /** The interactive session as it was before the walk-through took over. */
  let causalSnapshot = null;
  let causalPreviousView = false;

  /**
   * The stepped walk-through. Like the lesson it parks the session and hands it
   * back, and it moves to Data view for its duration — every step names a
   * number or a plot to watch, and both live in the panels learning view puts
   * away.
   */
  function setCausalStory(enabled) {
    if (!causalStory || enabled === storyStepping) return;
    storyStepping = enabled;
    ui.classList.toggle('is-story-stepping', enabled);
    controlPanel.setStory(enabled);
    if (enabled) {
      causalSnapshot = captureSessionState({ playback, viewer, scene, comparing });
      causalPreviousView = dataView;
      setDataView(true);
      causalStory.start();
    } else {
      setDataView(causalPreviousView);
      if (causalSnapshot) {
        restoreSessionState(causalSnapshot, { playback, viewer, scene, setComparison });
        modelControls?.sync(scene.getModelControls?.() ?? []);
        refreshModelReadouts();
        view.active = false;
      }
      causalSnapshot = null;
      metricsPanel?.highlight([]);
      for (const panel of chartPanels) panel.setFocused(false);
    }
  }

  // The guided sequence. Owns the camera, the caption and the label focus while
  // it runs, and hands the session back on the way out.
  const storyMode = scene.getStory
    ? createStoryMode({
        viewer,
        scene,
        ui,
        story: scene.getStory(),
        setProgress: (value) => {
          playback.pause();
          playback.set(value);
        },
        setLabelFocus: (ids) => {
          storyFocus = ids;
          applyLabelFocus();
        },
        captureState: () => captureSessionState({ playback, viewer, scene, comparing }),
        restoreState: (state) => {
          restoreSessionState(state, { playback, viewer, scene, setComparison });
          modelControls?.sync(scene.getModelControls?.() ?? []);
          refreshModelReadouts();
          controlPanel.setStory(false);
          setShot(comparisonOrStageShot());
          view.active = true;
          view.resumeAutoRotate = true;
        },
      })
    : null;

  sequenceOwnsCamera = () => Boolean(storyMode?.active || reelMode?.active);

  function toggleReel() {
    if (!reelMode) return;
    if (reelMode.active) {
      // Everything the viewer had before the reel is restored by the snapshot
      // the mode took on entry — including the camera.
      reelMode.exit();
    } else {
      reelMode.enter();
    }
  }

  bindKeyboard({
    playback,
    seek,
    resetModel: resetMedicalState,
    ui,
    uiToggle,
    toggleComparison: scene.setComparison ? () => setComparison(!comparing) : null,
    zoomBy,
    exitReel: () => {
      if (reelMode?.active) toggleReel();
      else if (storyMode?.active) storyMode.exit();
      else if (storyStepping) setCausalStory(false);
      else if (learning) setLearning(false);
    },
  });

  languageToggle.init();
  ui.dataset.view = dataView ? 'data' : 'learning';
  playback.set(0);

  // The opening framing used an assumed console height; now that the UI is in
  // the document, re-frame from the measured one and snap the camera there
  // rather than tweening from a guess.
  setShot(SceneClass.cameraPose);
  viewer.camera.position.copy(shot.position);
  viewer.controls.target.copy(shot.target);
  viewer.controls.update();
  view.active = false;

  /**
   * Re-frame when the bands move, not only when the window does.
   *
   * The camera is fitted to the part of the frame no panel is covering, and
   * those panels are measured from the elements. The elements are not finished
   * when the app is: the shell marks `#ui` after `createApp` returns, and the
   * stylesheet keyed on that mark releases the lower console from a full-width
   * card to a small one in the corner. The band the console had been taking —
   * a fifth of the frame height, measured — disappears, and nothing told the
   * camera. It stayed framed for a band that no longer existed: the heart
   * opened at 4.37 world units where the settled layout asks for 3.44, and it
   * stayed there until the reader pressed a fixed view, which re-framed and
   * jumped. A reader who never pressed one never saw the framing the scene
   * meant.
   *
   * So the bands are watched rather than assumed, and — this is the part that
   * makes it safe — a re-frame happens only when they have actually changed.
   * The panels' contents change constantly, and re-framing on any of that would
   * pull the camera back from wherever the reader had orbited to. Same call the
   * resize listener makes, for the same reason.
   */
  if (typeof ResizeObserver === 'function' && typeof MutationObserver === 'function') {
    const measure = () => JSON.stringify(safeAreaInsets());
    let applied = measure();
    let pending = false;
    const bandsMayHaveMoved = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        const now = measure();
        if (now === applied) return;
        applied = now;
        // Whether the reader has taken the camera since the last framing. If
        // they have not, the camera is exactly where the framing left it and
        // should follow the framing to the new band. If they have, it is theirs:
        // the new framing still applies to the next viewpoint they choose, but
        // nothing pulls them out of the view they are in.
        const untouched =
          viewer.camera.position.distanceToSquared(shot.position) < 1e-6 &&
          viewer.controls.target.distanceToSquared(shot.target) < 1e-6;
        setShot(shotSource);
        if (!untouched) return;
        viewer.camera.position.copy(shot.position);
        viewer.controls.target.copy(shot.target);
        viewer.controls.update();
      });
    };

    const sizes = new ResizeObserver(bandsMayHaveMoved);
    for (const element of [railElement, consoleElement]) {
      if (element) sizes.observe(element);
    }
    // The console does not resize itself: it is restyled by an attribute the
    // shell writes on `#ui`, which no `ResizeObserver` sees as a cause.
    const marks = new MutationObserver(bandsMayHaveMoved);
    marks.observe(ui, { attributes: true, childList: true });

    const stopWatching = () => {
      sizes.disconnect();
      marks.disconnect();
    };
    // Only until the reader arrives. This exists to correct a framing computed
    // before the shell had finished marking itself; once someone has taken the
    // camera, the window's own resize listener is what the framing follows, as
    // it always was. Watching past that point would be one more thing moving
    // the camera while a reader is using it.
    viewer.controls.addEventListener('start', stopWatching, { once: true });
    window.addEventListener('pagehide', stopWatching, { once: true });
  }

  // The canvases have no size until they are in the document.
  pvPanel?.resize();
  wavePanel?.resize();
  for (const panel of chartPanels) panel.resize();
  refreshModelReadouts();
  viewer.start();

  // Switching scenes via the URL hash is rare enough that a reload is fine —
  // and it guarantees a clean GPU state. Compared as *routes* rather than as
  // scene ids: leaving for the organ explorer is a navigation too, and
  // resolving it to a scene id would have made that link do nothing.
  let currentHash = window.location.hash;
  window.addEventListener('hashchange', () => {
    // An in-page anchor is not navigation. Reloading a 3D scene because
    // somebody used a skip link would throw away the camera, the progression
    // and any model controls they had set.
    if (isInPageAnchor(window.location.hash)) return;
    if (!sameRoute(window.location.hash, currentHash)) window.location.reload();
  });

  // Exposed for debugging and for automated screenshots.
  window.__app = {
    viewer,
    scene,
    playback,
    setComparison,
    isComparing: () => comparing,
    reel: reelMode,
    story: storyMode,
    setDataView,
    isDataView: () => dataView,
    learning: learningPanel ? { panel: learningPanel, set: setLearning, isActive: () => learning } : null,
    causalStory: causalStory
      ? { panel: causalStory, set: setCausalStory, isActive: () => storyStepping }
      : null,
    /**
     * The onward scenes this build opens, and the sentence that has to travel
     * with them. Empty when the model declares none or the gate closed them
     * all; never a route to a placeholder page.
     */
    /**
     * A guided explanation's camera. `apply(null)` returns the scene's own
     * framing. Nothing here changes what the model is set to.
     */
    guideView: {
      apply: applyGuideFraming,
      framings: () => Object.keys(scene.getGuideFramings?.() ?? {}),
    },
    related,
    /**
     * A guided explanation's *model* state, kept apart from its camera so that
     * the two kinds of step are distinguishable from outside as well as in.
     * `capture()` / `restore()` are the same session helpers every other mode
     * that drives the model uses.
     */
    guideState: {
      apply: applyGuideState,
      capture: () => captureSessionState({ playback, viewer, scene, comparing }),
      restore: (state) => {
        if (!state) return;
        restoreSessionState(state, { playback, viewer, scene, setComparison });
        modelControls?.sync(scene.getModelControls?.() ?? []);
        refreshModelReadouts();
      },
    },
    inspection: {
      panel: inspectionPanel,
      setOpen: setInspectionOpen,
      applyView: applyInspectionView,
      applyBackground: applyInspectionBackground,
      reset: resetInspectionDisplay,
    },
    charts: chartById,
  };
  return window.__app;
}

/**
 * Smoothly returns the camera to the scene's hero framing after "View".
 * @returns {boolean} whether the tween is still running
 */
function tweenPose(viewer, pose, dt) {
  const camera = viewer.camera;
  const target = viewer.controls.target;
  // A camera move carries no information the destination does not: for a viewer
  // who has asked for reduced motion it becomes a cut.
  const arrived =
    prefersReducedMotion() ||
    (camera.position.distanceToSquared(pose.position) < 1e-4 && target.distanceToSquared(pose.target) < 1e-4);
  if (arrived) {
    camera.position.copy(pose.position);
    target.copy(pose.target);
    return false;
  }
  camera.position.set(
    damp(camera.position.x, pose.position.x, 5, dt),
    damp(camera.position.y, pose.position.y, 5, dt),
    damp(camera.position.z, pose.position.z, 5, dt)
  );
  target.set(
    damp(target.x, pose.target.x, 5, dt),
    damp(target.y, pose.target.y, 5, dt),
    damp(target.z, pose.target.z, 5, dt)
  );
  return true;
}

/**
 * Keyboard shortcuts: space = play/pause, R = reset model, H = hide UI, C = compare,
 * arrows = step, +/- = zoom, Escape = leave the social sequence.
 */
function bindKeyboard({ playback, seek, resetModel, ui, uiToggle, toggleComparison, exitReel, zoomBy }) {
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      exitReel?.();
      return;
    }
    if (event.target instanceof HTMLInputElement) return;
    switch (event.key) {
      case ' ':
        event.preventDefault();
        playback.toggle();
        break;
      // Zoom from the keyboard, matching the two buttons. '=' and '_' are the
      // unshifted keys the '+' and '-' sit on.
      case '+':
      case '=':
        zoomBy?.(1);
        break;
      case '-':
      case '_':
        zoomBy?.(-1);
        break;
      case 'r':
      case 'R':
        resetModel();
        break;
      case 'h':
      case 'H': {
        const hidden = ui.classList.toggle('is-hidden');
        uiToggle.textContent = hidden ? 'UIを表示' : 'UIを隠す';
        break;
      }
      case 'c':
      case 'C':
        toggleComparison?.();
        break;
      case 'ArrowRight':
        seek(playback.value + (event.shiftKey ? 0.1 : 0.02));
        break;
      case 'ArrowLeft':
        seek(playback.value - (event.shiftKey ? 0.1 : 0.02));
        break;
      default:
        break;
    }
  });
}

/** Saves the current frame as a PNG — the fastest path from browser to social post. */
function capture(viewer, meta, stage, progress, preset) {
  const url = preset?.size ? captureAtSize(viewer, preset.size) : viewer.snapshot();
  const suffix = preset && preset.id !== 'view' ? `_${preset.id}` : '';
  const name = `${meta.id}_${stage?.id ?? 'stage'}_${Math.round(progress * 100)}${suffix}.png`;
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
}

/**
 * Renders a fixed-size frame while keeping the viewer's current angle.
 * Only the distance is adjusted, so a 4:5 export frames the subject properly
 * instead of cropping whatever happened to fit the browser window.
 */
function captureAtSize(viewer, size) {
  const target = viewer.controls.target;
  const saved = viewer.camera.position.clone();
  const scale = distanceScaleForAspect(size.width / size.height);
  viewer.camera.position.copy(target).addScaledVector(saved.clone().sub(target), scale / distanceScaleForAspect(viewer.camera.aspect));
  const url = viewer.snapshot(size);
  viewer.camera.position.copy(saved);
  return url;
}
