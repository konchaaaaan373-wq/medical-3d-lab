import { Viewer } from './Viewer.js';
import { SCENES, loadScene, resolveSceneId } from './sceneRegistry.js';
import { Playback } from '../utils/Playback.js';
import { damp } from '../utils/math.js';
import { framePose, distanceScaleForAspect } from './framing.js';
import { el } from '../utils/dom.js';
import { createTitleCard } from '../components/TitleCard.js';
import { createLegend } from '../components/Legend.js';
import { createStageReadout, stageIndexFor } from '../components/StageReadout.js';
import { createControlPanel } from '../components/ControlPanel.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { createMetricsPanel } from '../components/MetricsPanel.js';
import { createSceneSwitcher } from '../components/SceneSwitcher.js';
import { createReelMode } from './ReelMode.js';
import { createLabelLayer } from '../components/LabelLayer.js';

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

  const meta = SceneClass.meta;
  document.title = `${meta.title} — medical-3d-lab`;

  // `shot` is wherever the camera should currently be resting: the scene's
  // establishing framing, or a stage close-up while story mode is running.
  const shot = framePose(SceneClass.cameraPose, viewer.camera.aspect);
  let shotSource = SceneClass.cameraPose;
  viewer.camera.position.copy(shot.position);
  viewer.controls.target.copy(shot.target);
  viewer.controls.update();

  const setShot = (pose) => {
    shotSource = pose;
    const next = framePose(pose, viewer.camera.aspect);
    shot.position.copy(next.position);
    shot.target.copy(next.target);
  };

  // Re-frame on rotate/resize: a portrait phone needs a lot more distance than a laptop.
  window.addEventListener('resize', () => setShot(shotSource));

  // Only tweens while a "reset view" is in flight, so it never fights a drag.
  const view = { active: false };
  viewer.controls.addEventListener('start', () => {
    view.active = false;
  });

  // --- UI -------------------------------------------------------------------
  const playback = new Playback({ duration: 26 });
  // Story mode pauses on each stage boundary; skip 0, which is where it starts.
  playback.setHoldPoints(meta.stages.map((stage) => stage.at).filter((at) => at > 0));

  const legend = createLegend(meta);
  const stageReadout = createStageReadout({ meta, onSeek: (value) => seek(value) });
  const labels = createLabelLayer({ viewer, annotations: scene.getAnnotations() });
  const controlPanel = createControlPanel({
    meta,
    onSeek: (value) => seek(value),
    onToggle: () => playback.toggle(),
    onReset: () => {
      playback.reset();
      resetView();
    },
    onResetView: resetView,
    onCapture: (preset) => capture(viewer, meta, stageReadout.stage, playback.value, preset),
    onCompareToggle: scene.setComparison ? (enabled) => setComparison(enabled) : undefined,
    onReel: scene.getReel ? () => toggleReel() : undefined,
    onStoryToggle: (enabled) => {
      playback.holdsEnabled = enabled;
      // Turning story mode on should immediately frame the current stage.
      if (enabled) focusStage(stageIndexFor(playback.value, meta.stages), true);
      else {
        setShot(comparisonOrStageShot());
        view.active = true;
        viewer.controls.autoRotate = false;
      }
    },
  });

  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });

  // Optional: scenes that expose a model can show a live read-out beside the view.
  const metricsPanel = scene.getMetrics ? createMetricsPanel() : null;
  const sceneSwitcher = createSceneSwitcher({ scenes: SCENES, currentId: resolveSceneId() });

  const uiToggle = el('button', {
    class: 'ui-toggle',
    type: 'button',
    title: 'Hide interface for capture (H)',
    text: 'Hide UI',
    on: {
      click: () => {
        const hidden = ui.classList.toggle('is-hidden');
        uiToggle.textContent = hidden ? 'Show UI' : 'Hide UI';
      },
    },
  });

  ui.append(
    el('div', { class: 'top-bar' }, [
      el('div', { class: 'top-left' }, [createTitleCard(meta), sceneSwitcher?.element]),
      el('div', { class: 'rail' }, [
        legend.element,
        metricsPanel?.element,
        el('div', { class: 'rail-buttons' }, [languageToggle.element, uiToggle]),
      ]),
    ]),
    el('div', { class: 'panel console' }, [stageReadout.element, controlPanel.element]),
    labels.element
  );

  // --- state flow -----------------------------------------------------------
  let lastStageIndex = -1;

  playback.onChange = (value, playing) => {
    scene.setProgress(value);
    stageReadout.update(value);
    legend.update(value);
    labels.update(value);
    controlPanel.update(value, playing);
    if (metricsPanel) metricsPanel.update(scene.getMetrics());

    const index = stageIndexFor(value, meta.stages);
    if (index !== lastStageIndex) {
      lastStageIndex = index;
      if (playback.holdsEnabled) focusStage(index);
    }
  };

  let comparing = false;

  /**
   * Side-by-side with a healthy reference. The camera widens to hold both, and
   * the annotation layer swaps to the comparison labels.
   */
  function setComparison(enabled) {
    if (!scene.setComparison) return;
    comparing = enabled;
    scene.setComparison(enabled);
    labels.setComparison(enabled);
    labels.update(playback.value);
    controlPanel.setComparison(enabled);
    if (metricsPanel) metricsPanel.update(scene.getMetrics());
    // Leaving comparison during story mode should return to the stage close-up
    // the viewer was on, not all the way out to the establishing shot.
    const stageId = playback.holdsEnabled ? meta.stages[lastStageIndex]?.id : undefined;
    setShot(comparisonOrStageShot(stageId));
    view.active = true;
    viewer.controls.autoRotate = false;
  }

  /** Comparison framing wins over a stage close-up: both hearts must stay in frame. */
  function comparisonOrStageShot(stageId) {
    if (comparing) return scene.getComparisonView?.() ?? SceneClass.cameraPose;
    if (stageId) return scene.getStageView?.(stageId) ?? SceneClass.cameraPose;
    return SceneClass.cameraPose;
  }

  /** Moves the camera to the stage's own framing (story mode only). */
  function focusStage(index, immediate = false) {
    const stage = meta.stages[index];
    setShot(comparisonOrStageShot(stage.id));
    view.active = true;
    viewer.controls.autoRotate = false;
    if (immediate) {
      viewer.camera.position.copy(shot.position);
      viewer.controls.target.copy(shot.target);
      view.active = false;
      viewer.controls.autoRotate = true;
    }
  }

  function seek(value) {
    playback.pause();
    playback.set(value);
  }

  function resetView() {
    setShot(comparisonOrStageShot());
    view.active = true;
    // Auto-rotate would pull against the tween and stall it half-way;
    // it is switched back on once the camera has actually landed.
    viewer.controls.autoRotate = false;
  }

  // --- loop -----------------------------------------------------------------
  viewer.onFrame((dt, elapsed) => {
    playback.update(dt);
    scene.update(dt, elapsed);
    if (reelMode?.active) {
      // The sequence owns the camera while it runs, so the interactive tween
      // must stay out of the way. It advances on the wall clock rather than on
      // the render delta, so a recording is 15 real seconds even if frames drop.
      reelMode.tick();
      return;
    }
    if (view.active) {
      view.active = tweenPose(viewer, shot, dt);
      if (!view.active) viewer.controls.autoRotate = true;
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
      })
    : null;

  function toggleReel() {
    if (!reelMode) return;
    if (reelMode.active) {
      reelMode.exit();
      // Hand the camera back to the interactive framing the viewer was using.
      setShot(comparisonOrStageShot());
      view.active = true;
    } else {
      reelMode.enter();
    }
  }

  bindKeyboard({
    playback,
    seek,
    resetView,
    ui,
    uiToggle,
    toggleComparison: scene.setComparison ? () => setComparison(!comparing) : null,
    exitReel: () => {
      if (reelMode?.active) toggleReel();
    },
  });

  languageToggle.init();
  playback.set(0);
  viewer.start();

  // Switching themes via the URL hash is rare enough that a reload is fine —
  // and it guarantees a clean GPU state.
  let currentSceneId = resolveSceneId();
  window.addEventListener('hashchange', () => {
    if (resolveSceneId() !== currentSceneId) window.location.reload();
  });

  // Exposed for debugging and for automated screenshots.
  window.__app = { viewer, scene, playback, setComparison, isComparing: () => comparing, reel: reelMode };
  return window.__app;
}

/**
 * Smoothly returns the camera to the scene's hero framing after "View".
 * @returns {boolean} whether the tween is still running
 */
function tweenPose(viewer, pose, dt) {
  const camera = viewer.camera;
  const target = viewer.controls.target;
  if (camera.position.distanceToSquared(pose.position) < 1e-4 && target.distanceToSquared(pose.target) < 1e-4) {
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
 * Keyboard shortcuts: space = play/pause, R = reset, H = hide UI, C = compare,
 * arrows = step, Escape = leave the social sequence.
 */
function bindKeyboard({ playback, seek, resetView, ui, uiToggle, toggleComparison, exitReel }) {
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
      case 'r':
      case 'R':
        playback.reset();
        resetView();
        break;
      case 'h':
      case 'H': {
        const hidden = ui.classList.toggle('is-hidden');
        uiToggle.textContent = hidden ? 'Show UI' : 'Hide UI';
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
