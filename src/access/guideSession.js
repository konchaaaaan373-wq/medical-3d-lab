/**
 * Paid guides temporarily drive the same progression axis as the free model.
 *
 * Two different things can move that axis while a guide is open, and only one
 * of them should be undone when the guide closes.
 *
 * **Opening and closing a mode is not a change to the model.** A clinician who
 * opens the patient explanation, decides against it and closes it again must
 * find the model exactly where they left it — that is what the snapshot is for.
 *
 * **Walking the guide is.** Stepping a patient through "the wall thickens, then
 * the chamber widens, then less leaves with each beat" moves the model on
 * purpose, in front of the person it is being explained to. Rolling that back
 * on close threw away the state the conversation had arrived at: the clinician
 * who then wanted the pressure-volume loop *for that state* got the loop for
 * wherever they had been standing ten minutes earlier. So a position the guide
 * moved to is kept, and the mode switch alone changes nothing.
 *
 * This intentionally snapshots only Playback. The patient guide may also ask
 * the scene to change controls, comparison, and framing; those changes are
 * tracked by the guide installer. Broader modes use the app's full sessionState
 * helper instead.
 */

export function captureGuideSession(playback) {
  return Object.freeze({
    progress: Number.isFinite(playback?.value) ? playback.value : 0,
    playing: Boolean(playback?.playing),
  });
}

/**
 * Start a guide without letting its fixed caption drift away from a playing
 * model. Capture first so a guide closed without taking a step can restore the
 * clinician's original play state as well as the exact progression value.
 */
export function beginGuideSession(playback) {
  const snapshot = captureGuideSession(playback);
  playback?.pause?.();
  return snapshot;
}

/**
 * Hand the axis back.
 *
 * @param {{progress:number,playing:boolean}|null} snapshot where the model was
 *   when the guide opened
 * @param {{value:number,playing:boolean,pause:Function,set:Function,play:Function}} playback
 * @param {{movedByGuide?: boolean}} [options] whether the guide itself moved the
 *   model while it was open. When it did, where it moved to is the current
 *   state of the explanation and is left alone.
 */
export function restoreGuideSession(snapshot, playback, { movedByGuide = false } = {}) {
  if (!snapshot || !playback) return;
  if (movedByGuide) return;

  // Settle into a paused state first so changing the value cannot advance while
  // it is being restored. Resume only if the viewer had actually been playing.
  playback.pause();
  playback.set(snapshot.progress);
  if (snapshot.playing) playback.play();
}
