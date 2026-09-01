/**
 * Paid guides temporarily drive the same progression axis as the free model.
 * They must hand that axis back exactly where the viewer left it.
 *
 * This intentionally snapshots only Playback. Patient/Education guides do not
 * edit model controls, comparison, camera, or physiology; broader modes use the
 * app's full sessionState helper instead.
 */

export function captureGuideSession(playback) {
  return Object.freeze({
    progress: Number.isFinite(playback?.value) ? playback.value : 0,
    playing: Boolean(playback?.playing),
  });
}

export function restoreGuideSession(snapshot, playback) {
  if (!snapshot || !playback) return;

  // Settle into a paused state first so changing the value cannot advance while
  // it is being restored. Resume only if the viewer had actually been playing.
  playback.pause();
  playback.set(snapshot.progress);
  if (snapshot.playing) playback.play();
}
