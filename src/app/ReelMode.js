import * as THREE from 'three';
import { Timeline } from '../utils/Timeline.js';
import { createReelOverlay } from '../components/ReelOverlay.js';
import { createReelChrome } from '../components/ReelChrome.js';
import { paintReelFrame } from './reelFramePainter.js';
import { createCanvasRecorder } from './videoRecorder.js';
import { distanceToFit } from './framing.js';
import { fovForAspect } from './Viewer.js';

/** Social formats the sequence can be framed for. 9:16 is the primary design. */
export const REEL_FORMATS = [
  { id: 'reel', label: '9:16', width: 1080, height: 1920 },
  { id: 'portrait', label: '4:5', width: 1080, height: 1350 },
  { id: 'square', label: '1:1', width: 1080, height: 1080 },
  { id: 'wide', label: '16:9', width: 1920, height: 1080 },
];

/** Frames per second asked of the recorder. Social video is 30; the sequence is authored for it. */
const RECORDING_FPS = 30;

/**
 * How long the final frame is held in the file after the sequence ends.
 *
 * The last second is the take-home, and a cut on the instant it appears reads
 * as a file that stopped early.
 */
const RECORDING_TAIL_MS = 600;

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
  onDownload,
  getProvenance,
}) {
  const overlay = createReelOverlay();
  let formatId = 'reel';
  let active = false;
  let metrics = null;
  /** The most recent overlay description, for the exported frame. */
  let lastFrame = null;
  /** Everything the interactive session looked like before the reel took over. */
  let sessionSnapshot = null;

  const chrome = createReelChrome({
    formats: REEL_FORMATS,
    currentFormatId: formatId,
    onFormat: (id) => setFormat(id),
    onRestart: () => restart(),
    onExit: () => exit(),
    // The app owns the offer: whether this scene may produce a file at all is
    // a release question (`videoExport.js`), and what has to be agreed to
    // first is a consent question. The sequence only knows how to play.
    onDownload,
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

    // Kept, not only rendered: the video export paints this same description
    // into the recorded frame, so the file carries the captions the reader
    // sees rather than a bare picture of the model.
    lastFrame = reel.overlayAt(t, { language: resolveLanguage(), metrics });
    overlay.render(lastFrame);
  }

  /** The video shows one language: bilingual captions are too much for social. */
  function resolveLanguage() {
    return getLanguage() === 'en' ? 'en' : 'ja';
  }

  /**
   * The numbers the copy interpolates, re-read every frame from `renderAt` —
   * after the scene has been driven, so the caption quotes the state that is
   * on screen. Whatever a sequence does here runs per rendered frame, so it
   * has to stay cheap.
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

  /**
   * Records the sequence into a file, without an application in it.
   *
   * Two things are composited every frame, in this order: the rendered canvas,
   * then the caption layer (`paintReelFrame`). The second is not decoration.
   * `captureStream` sees the canvas and nothing else, so recording the bare
   * canvas would produce exactly the artefact this product must not hand out —
   * a disease model with its caveats stripped off. The provenance footer is
   * painted on every frame for the same reason.
   *
   * The frames are copied in `onAfterFrame`, in the same task as the render:
   * the renderer keeps `preserveDrawingBuffer: false`, so a copy taken any
   * later reads an empty buffer.
   *
   * Resolves with `complete: false` rather than throwing when the reader
   * leaves mid-recording; a partial file is not offered as a finished one.
   *
   * @param {{ onProgress?: (fraction: number) => void, MediaRecorderCtor?: Function }} [options]
   * @returns {Promise<{ blob: Blob, mimeType: string, formatId: string, complete: boolean }>}
   */
  async function recordVideo({ onProgress = () => {}, MediaRecorderCtor } = {}) {
    if (!active) enter();
    const source = viewer.renderer.domElement;
    // Even dimensions: the H.264 encoders behind `video/mp4` reject odd ones,
    // and a canvas sized by CSS is odd about half the time.
    const width = Math.max(2, Math.floor(source.width / 2) * 2);
    const height = Math.max(2, Math.floor(source.height / 2) * 2);

    const target = document.createElement('canvas');
    target.width = width;
    target.height = height;
    const ctx = target.getContext('2d');

    const provenance = getProvenance?.(resolveLanguage()) ?? null;
    const paint = () => {
      ctx.drawImage(source, 0, 0, width, height);
      paintReelFrame(ctx, { frame: lastFrame ?? {}, width, height, provenance });
    };

    const detach = viewer.onAfterFrame(paint);
    const recorder = createCanvasRecorder({
      canvas: target,
      fps: RECORDING_FPS,
      ...(MediaRecorderCtor ? { MediaRecorderCtor } : {}),
    });

    // From the top, so the file is the whole sequence however long the reader
    // had been watching when they pressed the button.
    restart();
    paint();
    recorder.start();
    const complete = await sequenceEnd(onProgress);
    const blob = await recorder.stop();
    detach();
    return { blob, mimeType: recorder.mimeType, formatId, complete };
  }

  /**
   * Resolves when the sequence has played out, `false` if it was abandoned.
   *
   * Watches the timeline rather than sleeping for its duration: the sequence
   * advances on the wall clock and the renderer keeps up as best it can, so
   * the moment the last frame has actually been drawn is the only honest
   * signal that the file is finished. The tail keeps the take-home frame in
   * the file rather than cutting on the instant it appears.
   */
  function sequenceEnd(onProgress) {
    const duration = reel.durationSeconds;
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      // A backgrounded tab stops calling `requestAnimationFrame` altogether.
      // Without this the promise would never settle and the recorder would run
      // until the page was closed.
      const guard = setTimeout(() => finish(timeline.elapsed >= duration), (duration + 20) * 1000);
      const step = () => {
        if (settled) return;
        if (!active) {
          clearTimeout(guard);
          finish(false);
          return;
        }
        onProgress(Math.min(1, timeline.elapsed / duration));
        if (timeline.elapsed >= duration) {
          setTimeout(() => {
            clearTimeout(guard);
            finish(true);
          }, RECORDING_TAIL_MS);
          return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
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
    recordVideo,
    /** The download button's own label, while a recording runs. */
    setDownloadLabel: (label, state) => chrome.setDownloadLabel(label, state),
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
