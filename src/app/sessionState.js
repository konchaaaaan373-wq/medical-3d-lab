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
 *   playback: { value: number, playing: boolean },
 *   viewer: { camera: any, controls: any },
 *   scene: { getCardiacPhase?: () => number, getModelControls?: () => any[] },
 *   comparing: boolean,
 * }} context
 */
export function captureSessionState({ playback, viewer, scene, comparing }) {
  return {
    comparing,
    progress: playback.value,
    playing: playback.playing,
    autoRotate: viewer.controls.autoRotate,
    controlsEnabled: viewer.controls.enabled,
    cameraPosition: viewer.camera.position.toArray(),
    controlsTarget: viewer.controls.target.toArray(),
    cardiacPhase: scene.getCardiacPhase?.() ?? 0,
    // Any loading conditions the viewer had set. The reel returns them to the
    // modelled state so the video is always about the state itself; this is
    // what puts the viewer's own settings back afterwards.
    modelControls: scene.getModelControls?.().map(({ id, value }) => ({ id, value })) ?? [],
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

  if (state.playing) playback.play();
  else playback.pause();
  playback.set(state.progress);

  scene.setCardiacPhase?.(state.cardiacPhase);
  for (const control of state.modelControls ?? []) scene.setModelControl?.(control.id, control.value);

  viewer.camera.position.fromArray(state.cameraPosition);
  viewer.controls.target.fromArray(state.controlsTarget);
  viewer.controls.autoRotate = state.autoRotate;
  viewer.controls.enabled = state.controlsEnabled;
  viewer.controls.update?.();
}
