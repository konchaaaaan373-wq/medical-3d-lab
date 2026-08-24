/**
 * Snapshot and restore of the interactive session.
 *
 * The reel takes the app somewhere specific — a fixed progression, comparison
 * on, its own camera — and a viewer who leaves it should find exactly the view
 * they had before, however many times they come and go. Keeping this in one
 * pure-ish pair of functions makes that testable without a browser.
 */

/**
 * @param {{
 *   playback: { value: number, playing: boolean, holdsEnabled: boolean },
 *   viewer: { camera: any, controls: any },
 *   scene: { getCardiacPhase?: () => number },
 *   comparing: boolean,
 * }} context
 */
export function captureSessionState({ playback, viewer, scene, comparing }) {
  return {
    comparing,
    progress: playback.value,
    playing: playback.playing,
    storyHolds: playback.holdsEnabled,
    autoRotate: viewer.controls.autoRotate,
    controlsEnabled: viewer.controls.enabled,
    cameraPosition: viewer.camera.position.toArray(),
    controlsTarget: viewer.controls.target.toArray(),
    cardiacPhase: scene.getCardiacPhase?.() ?? 0,
  };
}

/**
 * Puts everything back exactly as `captureSessionState` found it.
 *
 * Order matters: comparison first, because turning it on or off re-frames the
 * camera, and the camera has to be restored after that or the re-framing would
 * win. Playback state is set before the value so a paused session does not
 * resume and a session parked at the end does not rewind.
 *
 * @param {ReturnType<captureSessionState>} state
 */
export function restoreSessionState(state, { playback, viewer, scene, setComparison }) {
  setComparison(state.comparing);

  playback.holdsEnabled = state.storyHolds;
  if (state.playing) playback.play();
  else playback.pause();
  playback.set(state.progress);

  scene.setCardiacPhase?.(state.cardiacPhase);

  viewer.camera.position.fromArray(state.cameraPosition);
  viewer.controls.target.fromArray(state.controlsTarget);
  viewer.controls.autoRotate = state.autoRotate;
  viewer.controls.enabled = state.controlsEnabled;
  viewer.controls.update?.();
}
