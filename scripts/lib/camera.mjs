/**
 * Wait for the camera to stop moving — a state, not a time.
 *
 * Closing or opening a console card refits the camera with a tween (and a
 * second refit ~320 ms later, once the published heights catch up). A check
 * that waits a fixed time and then measures the model measures whatever pose
 * the tween had reached, which on software GL is anywhere (CLAUDE.md: "待つ
 * ときは、時間ではなく状態を待つ" — the 124 px vs 0 px example).
 *
 * Settled means the camera position and target have not moved by more than
 * `tolerance` world units between frames for at least `stillMs` (and at
 * least two frames) — 700 ms by default, which outlasts the second refit's
 * 320 ms. Time, not a frame count: headless software GL draws a frame every
 * ~450 ms, so "30 still frames" took 13 s and timed out.
 *
 * Not zero: damping leaves a tail. Measured on cardiac-output at rest, the
 * camera still creeps about 0.0007 world units per half second (at a distance
 * of ~27) long after any tween — invisible, and above 1e-4 per frame, so a
 * tolerance of 1e-4 waited forever. A refit moves ~0.1 per frame; 1e-3
 * separates the two.
 *
 * @param {import('playwright').Page} page
 * @param {{ stillMs?: number, tolerance?: number, timeout?: number }} [options]
 */
export async function waitForCameraToSettle(page, { stillMs = 700, tolerance = 1e-3, timeout = 20000 } = {}) {
  await page.evaluate(() => {
    window.__cameraSettle = null;
  });
  await page.waitForFunction(
    ({ stillMs, tolerance }) => {
      const viewer = window.__app?.viewer;
      if (!viewer) return true;
      const now = [...viewer.camera.position.toArray(), ...viewer.controls.target.toArray()];
      const time = performance.now();
      const state = (window.__cameraSettle ??= { last: null, since: time, frames: 0 });
      const moved = !state.last || now.some((value, i) => Math.abs(value - state.last[i]) > tolerance);
      if (moved) {
        state.since = time;
        state.frames = 0;
      } else {
        state.frames += 1;
      }
      state.last = now;
      return state.frames >= 2 && time - state.since >= stillMs;
    },
    { stillMs, tolerance },
    { polling: 'raf', timeout }
  );
}
