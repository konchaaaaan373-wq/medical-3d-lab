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
 * Scene-agnostic, and enforced rather than intended: this file names no organ,
 * no metric and no scene method. Everything specific to the content — the cues,
 * the copy, the camera tracks, what the scene is driven to at each instant —
 * comes from the object the scene returns from `getReel()`. Any scene can
 * supply one and reuse all of the machinery here: frame masking, clean mode,
 * safe area, timeline, aspect presets, overlay slots.
 *
 * The reel object may supply, all optional except the first four:
 *
 *   durationSeconds, cues, viewDirection, framing, cameraAt, overlayAt
 *   progress          where on the scene's own axis the sequence sits
 *   comparison        false to leave the comparison off; default is on
 *   comparisonAt(t)   whether both bodies are on screen at time `t`, for a
 *                     sequence that shows one thing and then compares two;
 *                     overrides `comparison` while it is running
 *   driveAt(t, scene) anything the scene has to be told at time `t`
 *   readMetrics(scene) numbers the copy interpolates, read every frame
 *   onEnter(scene) / onExit(scene)  set-up and tear-down the sequence owns
 *
 * Two properties matter most, because the output is meant to be screen-recorded:
 *   - the whole sequence is a pure function of elapsed seconds, so the same
 *     15 seconds come out the same on any machine and at any frame rate;
 *   - the canvas is resized to the target aspect and centred, so recording the
 *     frame gives a correctly composed 9:16 video with no application chrome.
 */
export function createReelMode({
  viewer,
  scene,
  ui,
  stage,
  reel,
  setComparison,
  setProgress,
  getLanguage,
  captureState,
  restoreState,
}) {
  const overlay = createReelOverlay();
  let formatId = 'reel';
  let active = false;
  let metrics = null;
  /** Everything the interactive session looked like before the reel took over. */
  let sessionSnapshot = null;

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
  /** Whether both bodies are currently on screen, so the toggle only fires on a change. */
  let comparing = false;

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

    // A sequence may show one body and then two — the argument it is making
    // can need both. Routed through the app's own toggle rather than the
    // scene's, so the labels change with the picture, and only on a change,
    // because the toggle is not free.
    if (reel.comparisonAt) {
      const wanted = Boolean(reel.comparisonAt(t));
      if (wanted !== comparing) {
        comparing = wanted;
        setComparison(wanted);
      }
    }

    // Everything the scene has to be told at this instant. What that is — a
    // cardiac phase, a settled lung, a solved liver — is the sequence's
    // business, not this file's.
    reel.driveAt?.(t, scene);

    // Read after driving, and every frame rather than once on entry. A
    // sequence whose state moves — a stimulus climbing, a lung filling — has
    // to be able to quote the number that is on screen now, and reading it
    // afterwards is what guarantees the caption and the picture agree.
    metrics = readMetrics();

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

  /**
   * The numbers the copy interpolates, read once on entry.
   *
   * Read from the scene rather than carried by the sequence, so a video can
   * never quote a figure the interactive scene would not. Which figures those
   * are is the sequence's business.
   */
  function readMetrics() {
    return reel.readMetrics?.(scene) ?? null;
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
    // Taken before anything is touched, so leaving is exact no matter how many
    // times the viewer comes and goes.
    sessionSnapshot = captureState?.() ?? null;

    ui.classList.add('is-reel');
    stage.classList.add('is-reel');
    if (!overlay.element.isConnected) ui.append(overlay.element, chrome.element);

    // Park the model on the state the video is about.
    setProgress(reel.progress);
    // The video is about the modelled state, so any loading conditions the
    // viewer was exploring are set aside for its duration and restored on exit.
    scene.resetModelControls?.();
    // Most sequences want both bodies on screen; one that is about a single
    // organ can say so.
    comparing = reel.comparisonAt ? Boolean(reel.comparisonAt(0)) : reel.comparison !== false;
    setComparison(comparing);
    reel.onEnter?.(scene);

    viewer.controls.enabled = false;
    viewer.controls.autoRotate = false;

    setFormat(formatId);
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

    // Undo the sequence's own scene changes first, then hand the rest of the
    // session back to the app.
    reel.onExit?.(scene);
    viewer.controls.enabled = true;

    if (sessionSnapshot) restoreState?.(sessionSnapshot);
    sessionSnapshot = null;

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
    /** The session state the reel will hand back, for tests and debugging. */
    get snapshot() {
      return sessionSnapshot;
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
