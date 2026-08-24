import { Viewer } from './Viewer.js';
import { loadScene, resolveSceneId } from './sceneRegistry.js';
import { Playback } from '../utils/Playback.js';
import { damp } from '../utils/math.js';
import { el } from '../utils/dom.js';
import { createTitleCard } from '../components/TitleCard.js';
import { createLegend } from '../components/Legend.js';
import { createStageReadout } from '../components/StageReadout.js';
import { createControlPanel } from '../components/ControlPanel.js';
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

  const pose = SceneClass.cameraPose;
  const hero = heroPose(pose, viewer.camera.aspect);
  viewer.camera.position.copy(hero.position);
  viewer.controls.target.copy(hero.target);
  viewer.controls.update();

  // Re-frame on rotate/resize: a portrait phone needs a lot more distance than a laptop.
  window.addEventListener('resize', () => {
    const next = heroPose(pose, viewer.camera.aspect);
    hero.position.copy(next.position);
    hero.target.copy(next.target);
  });

  // Only tweens while a "reset view" is in flight, so it never fights a drag.
  const view = { active: false };
  viewer.controls.addEventListener('start', () => {
    view.active = false;
  });

  // --- UI -------------------------------------------------------------------
  const playback = new Playback({ duration: 26 });

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
    onCapture: () => capture(viewer, meta, stageReadout.stage, playback.value),
  });

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
      createTitleCard(meta),
      el('div', { class: 'rail' }, [legend.element, uiToggle]),
    ]),
    el('div', { class: 'panel console' }, [stageReadout.element, controlPanel.element]),
    labels.element
  );

  // --- state flow -----------------------------------------------------------
  playback.onChange = (value, playing) => {
    scene.setProgress(value);
    stageReadout.update(value);
    legend.update(value);
    labels.update(value);
    controlPanel.update(value, playing);
  };

  function seek(value) {
    playback.pause();
    playback.set(value);
  }

  function resetView() {
    view.active = true;
    // Auto-rotate would pull against the tween and stall it half-way;
    // it is switched back on once the camera has actually landed.
    viewer.controls.autoRotate = false;
  }

  // --- loop -----------------------------------------------------------------
  viewer.onFrame((dt, elapsed) => {
    playback.update(dt);
    scene.update(dt, elapsed);
    if (view.active) {
      view.active = tweenPose(viewer, hero, dt);
      if (!view.active) viewer.controls.autoRotate = true;
    }
    labels.render();
  });

  bindKeyboard({ playback, seek, resetView, ui, uiToggle });

  playback.set(0);
  viewer.start();

  // Switching themes via the URL hash is rare enough that a reload is fine —
  // and it guarantees a clean GPU state.
  let currentSceneId = resolveSceneId();
  window.addEventListener('hashchange', () => {
    if (resolveSceneId() !== currentSceneId) window.location.reload();
  });

  // Exposed for debugging and for automated screenshots.
  window.__app = { viewer, scene, playback };
  return window.__app;
}

/**
 * Scales the scene's authored framing to the current aspect ratio, so the whole
 * subject stays inside the frame on a phone as well as on a wide screen.
 */
function heroPose(pose, aspect) {
  const scale = aspect < 0.85 ? 1.28 : aspect < 1.25 ? 1.12 : 1;
  return {
    position: pose.target.clone().add(pose.position.clone().sub(pose.target).multiplyScalar(scale)),
    target: pose.target.clone(),
  };
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

/** Keyboard shortcuts: space = play/pause, R = reset, H = hide UI, arrows = step. */
function bindKeyboard({ playback, seek, resetView, ui, uiToggle }) {
  window.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement && event.key !== 'Escape') return;
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
function capture(viewer, meta, stage, progress) {
  const url = viewer.snapshot();
  const name = `${meta.id}_${stage?.id ?? 'stage'}_${Math.round(progress * 100)}.png`;
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
}
