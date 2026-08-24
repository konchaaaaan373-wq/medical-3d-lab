import * as THREE from 'three';
import { Timeline } from '../utils/Timeline.js';
import { createReelOverlay } from '../components/ReelOverlay.js';
import { createReelChrome } from '../components/ReelChrome.js';
import { distanceToFit } from './framing.js';
import { fovForAspect } from './Viewer.js';

/** Social formats the sequence can be framed for. 9:16 is the primary design. */
export const REEL_FORMATS = [
  { id: 'reel', label: '9:16', width: 1080, height: 1920 },
  { id: 'portrait', label: '4:5', width: 1080, height: 1350 },
  { id: 'square', label: '1:1', width: 1080, height: 1080 },
  { id: 'wide', label: '16:9', width: 1920, height: 1080 },
];

/**
 * Runs a scene's 15-second social sequence.
 *
 * Deliberately scene-agnostic: everything specific to the content — the cues,
 * the copy, the camera tracks, the cardiac phase — comes from the object the
 * scene returns from `getReel()`. A second scene can supply its own and reuse
 * all of the machinery here (frame masking, clean mode, safe area, timeline,
 * aspect presets, overlay slots).
 *
 * Two properties matter most, because the output is meant to be screen-recorded:
 *   - the whole sequence is a pure function of elapsed seconds, so the same
 *     15 seconds come out the same on any machine and at any frame rate;
 *   - the canvas is resized to the target aspect and centred, so recording the
 *     frame gives a correctly composed 9:16 video with no application chrome.
 */
export function createReelMode({ viewer, scene, ui, stage, reel, setComparison, setProgress, getLanguage }) {
  const overlay = createReelOverlay();
  let formatId = 'reel';
  let active = false;
  let metrics = null;
  let restoreProgress = 0;

  const chrome = createReelChrome({
    formats: REEL_FORMATS,
    currentFormatId: formatId,
    onFormat: (id) => setFormat(id),
    onRestart: () => restart(),
    onExit: () => exit(),
  });

  // Wall-clock, not the render loop's delta.
  //
  // The viewer clamps dt so a backgrounded tab cannot fast-forward the
  // animation, which is right for interactive use but wrong here: on a slow
  // machine the clamp would stretch a 15-second sequence into 18. A recording
  // has to be 15 seconds of real time, dropping frames if it must, so the
  // sequence advances on the clock and the renderer keeps up as best it can.
  let lastTimestamp = null;

  const timeline = new Timeline({
    duration: reel.durationSeconds,
    cues: reel.cues,
    onFrame: (t) => renderAt(t),
    onEnd: () => {
      // Hold the final frame rather than snapping back — the last second is the
      // take-home, and a recording should be able to run past the end cleanly.
      renderAt(reel.durationSeconds);
    },
  });

  const direction = reel.viewDirection.clone().normalize();
  const alternateDirection = (reel.alternateViewDirection ?? reel.viewDirection).clone().normalize();
  const activeDirection = new THREE.Vector3();
  const target = new THREE.Vector3();

  function baseFraming() {
    const aspect = viewer.camera.aspect;
    return {
      distance: distanceToFit({
        halfWidth: reel.framing.halfWidth,
        halfHeight: reel.framing.halfHeight,
        aspect,
        fovDegrees: fovForAspect(aspect),
        minimum: reel.framing.minimumDistance ?? 12,
      }),
      targetX: reel.framing.target.x,
      targetY: reel.framing.target.y,
      targetZ: reel.framing.target.z,
    };
  }

  function renderAt(t) {
    if (!active) return;

    scene.setCardiacPhase(reel.cardiacPhaseAt(t));
    scene.setCongestionVisibleInComparison(reel.congestionVisibleAt(t));

    const shot = reel.cameraAt(t, baseFraming());
    target.set(shot.targetX, shot.targetY, shot.targetZ);
    activeDirection.copy(direction).lerp(alternateDirection, shot.directionBlend ?? 0).normalize();
    viewer.camera.position.copy(target).addScaledVector(activeDirection, shot.distance);
    viewer.camera.lookAt(target);
    // Keep the controls' target in step so exiting hands back a sane camera.
    viewer.controls.target.copy(target);

    overlay.render(reel.overlayAt(t, { language: resolveLanguage(), metrics }));
  }

  /** The video shows one language: bilingual captions are too much for social. */
  function resolveLanguage() {
    return getLanguage() === 'en' ? 'en' : 'ja';
  }

  function readMetrics() {
    const rows = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row]));
    const pair = (id) => ({ normal: Number(rows[id].reference), hfref: Number(rows[id].value) });
    return { ef: pair('ef'), edv: pair('edv'), esv: pair('esv') };
  }

  function setFormat(id) {
    formatId = id;
    const format = REEL_FORMATS.find((entry) => entry.id === id) ?? REEL_FORMATS[0];
    const ratio = format.width / format.height;
    stage.style.setProperty('--reel-aspect', String(ratio));
    overlay.element.style.setProperty('--reel-aspect', String(ratio));
    overlay.element.dataset.format = id;
    chrome.setFormat(id);
    // The canvas is sized by CSS, so resize after the browser has laid it out.
    requestAnimationFrame(() => {
      viewer.resize();
      syncOverlayScale();
      if (active) renderAt(timeline.elapsed);
    });
  }

  /** One CSS unit = 1% of the frame width, so type scales with the format. */
  function syncOverlayScale() {
    const width = overlay.element.clientWidth || 1;
    overlay.element.style.setProperty('--reel-unit', `${width / 100}px`);
  }

  function restart() {
    lastTimestamp = null;
    timeline.start();
  }

  function enter() {
    if (active) return;
    active = true;
    restoreProgress = reel.progress;

    ui.classList.add('is-reel');
    stage.classList.add('is-reel');
    if (!overlay.element.isConnected) ui.append(overlay.element, chrome.element);

    // Park the model on the state the video is about, then turn on the existing
    // comparison so both hearts are present and already phase-locked.
    setProgress(reel.progress);
    setComparison(true);
    scene.setCardiacPhaseDriven(true);

    viewer.controls.enabled = false;
    viewer.controls.autoRotate = false;

    setFormat(formatId);
    metrics = readMetrics();
    lastTimestamp = null;
    timeline.start();
  }

  function exit() {
    if (!active) return;
    active = false;
    timeline.stop();

    ui.classList.remove('is-reel');
    stage.classList.remove('is-reel');
    stage.style.removeProperty('--reel-aspect');

    scene.setCardiacPhaseDriven(false);
    scene.setCongestionVisibleInComparison(true);
    viewer.controls.enabled = true;
    requestAnimationFrame(() => viewer.resize());
  }

  window.addEventListener('resize', () => {
    if (!active) return;
    syncOverlayScale();
  });

  return {
    get active() {
      return active;
    },
    get elapsed() {
      return timeline.elapsed;
    },
    get formatId() {
      return formatId;
    },
    get progress() {
      return restoreProgress;
    },
    enter,
    exit,
    restart,
    setFormat,
    toggle: () => (active ? exit() : enter()),
    /**
     * Advance the sequence.
     *
     * With no argument it advances on the wall clock, which is what playback
     * needs. An explicit `dt` steps by exactly that much instead, so a frame at
     * a given second can be reproduced without waiting for it.
     *
     * @param {number} [dt] seconds to advance by
     */
    tick: (dt) => {
      const now = performance.now();
      const wall = lastTimestamp === null ? 0 : (now - lastTimestamp) / 1000;
      lastTimestamp = now;
      timeline.tick(Math.min(dt ?? wall, 0.5));
    },
  };
}
