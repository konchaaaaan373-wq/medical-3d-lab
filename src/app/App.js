import * as THREE from 'three';
import { Viewer } from './Viewer.js';
import { loadScene, sceneById, systemsWithScenes, resolveSceneId } from './sceneRegistry.js';
import { isInPageAnchor, sameRoute } from './router.js';
import { Playback } from '../utils/Playback.js';
import { damp } from '../utils/math.js';
import { ZOOM_RANGE, clampZoom, steppedZoom, zoomedDistance as zoomed } from './zoom.js';
import { framePose, distanceScaleForAspect } from './framing.js';
import {
  BACKGROUND_PRESETS,
  DEFAULT_BACKGROUND_ID,
  backgroundPresetById,
  standardInspectionViews,
} from './inspection.js';
import { captureSessionState, restoreSessionState } from './sessionState.js';
import { el } from '../utils/dom.js';
import { prefersReducedMotion } from '../utils/motion.js';
import { createTitleCard } from '../components/TitleCard.js';
import { createLegend } from '../components/Legend.js';
import { createStageReadout, stageIndexFor } from '../components/StageReadout.js';
import { createControlPanel } from '../components/ControlPanel.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { createMetricsPanel } from '../components/MetricsPanel.js';
import { createPressureVolumePanel } from '../components/PressureVolumePanel.js';
import { createPressureWavePanel } from '../components/PressureWavePanel.js';
import { createChartPanel } from '../components/ChartPanel.js';
import { createModelScopePanel } from '../components/ModelScopePanel.js';
import { createCausalStoryPanel } from '../components/CausalStoryPanel.js';
import { createModelControls } from '../components/ModelControls.js';
import { createLearningPanel } from '../components/LearningPanel.js';
import { createSceneSwitcher } from '../components/SceneSwitcher.js';
import { createReelMode } from './ReelMode.js';
import { createStoryMode } from './StoryMode.js';
import { createLabelLayer } from '../components/LabelLayer.js';
import { createAnatomyInfoPanel } from '../components/AnatomyInfoPanel.js';
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
export async function createApp({ stage, ui }) {
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
  const entry = sceneById(resolveSceneId());
  const meta = { ...SceneClass.meta, status: entry?.status ?? SceneClass.meta.status ?? 'production' };
  document.title = `${meta.title} — medical-3d-lab`;
  ui.dataset.scene = meta.id;
  const defaultBackground = backgroundPresetById(meta.inspection?.background ?? DEFAULT_BACKGROUND_ID);
  const initialBackground = viewer.setBackgroundPreset(defaultBackground.id);
  ui.dataset.background = initialBackground.id;

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

  /** The scene's authored framing for the current view and window, before zoom. */
  const framedPose = (pose) =>
    framePose(
      pose,
      viewer.camera.aspect,
      dataView ? 'data' : 'learning',
      viewer.camera.fov,
      bottomInset(),
      SceneClass.framing
    );

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
  }

  function syncZoomLimits() {
    controlPanel?.setZoomLimits({
      canZoomIn: userZoom > ZOOM_RANGE[0],
      canZoomOut: userZoom < ZOOM_RANGE[1],
    });
  }

  // Re-frame on rotate/resize: a portrait phone needs a lot more distance than a laptop.
  window.addEventListener('resize', () => {
    setShot(shotSource);
    pvPanel?.resize();
    wavePanel?.resize();
  });

  // Only tweens while a "reset view" is in flight, so it never fights a drag.
  const view = { active: false, resumeAutoRotate: true };
  let inspectionPanel = null;
  let inspectionOpen = false;

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

  function setInspectionOpen(enabled) {
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

  function applyInspectionView(id) {
    if (!inspectionViews.some((candidate) => candidate.id === id)) return false;
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
    onInspectionToggle: (enabled) => setInspectionOpen(enabled),
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
  const chartById = new Map(chartPanels.map((panel) => [panel.id, panel]));

  // Optional: what the model answers, what it does not, and where it came from.
  // A scene that has lost the Prototype badge needs this on the same screen as
  // the numbers it is now asking to be believed about.
  const scopePanel = meta.modelScope ? createModelScopePanel(meta.modelScope) : null;
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
  });
  if (initialInspectionMode) applyInspectionMode(initialInspectionMode);

  const anatomyInfo = scene.getAnatomySelection
    ? createAnatomyInfoPanel(scene, {
        onPreferredView: applyInspectionView,
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
    if (!pvPanel) return;
    // One read of the model, shared by both plots, so they cannot disagree.
    const pressureVolume = scene.getPressureVolume();
    pvPanel.update(pressureVolume);
    wavePanel?.update(pressureVolume);
  }
  const sceneSwitcher = createSceneSwitcher({ groups: systemsWithScenes(), currentId: resolveSceneId() });

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

  ui.append(
    el('div', { class: 'top-bar' }, [
      // The model panels go on the left, where there is room for them: the rail
      // already carries the legend and the read-out, and stacking four panels
      // there pushes the console off a laptop screen.
      el('div', { class: 'top-left' }, [
        createTitleCard(meta),
        sceneSwitcher?.element,
        pvPanel?.element,
        wavePanel?.element,
        ...chartPanels.map((panel) => panel.element),
        controlsInConsole ? null : modelControls?.element,
        scopePanel?.element,
      ]),
      el('div', { class: 'rail' }, [
        inspectionPanel.element,
        anatomyInfo?.element,
        legend.element,
        metricsPanel?.element,
        el('div', { class: 'rail-buttons' }, [languageToggle.element, uiToggle]),
      ]),
    ]),
    el('div', { class: 'panel console' }, [
      stageReadout.element,
      causalStory?.element,
      learningPanel?.element,
      controlsInConsole ? modelControls?.element : null,
      controlPanel.element,
    ]),
    labels.element
  );

  // --- state flow -----------------------------------------------------------
  playback.onChange = (value, playing) => {
    scene.setProgress(value);
    stageReadout.update(value);
    legend.update(value);
    labels.update(value);
    controlPanel.update(value, playing);
    refreshModelReadouts();
    applyLabelFocus();

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
