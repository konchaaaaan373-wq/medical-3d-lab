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
 * `tolerance` world units for `frames` consecutive animation frames — 30 by
 * default, which outlasts the second refit's 320 ms even at 60 fps.
 *
 * @param {import('playwright').Page} page
 * @param {{ frames?: number, tolerance?: number, timeout?: number }} [options]
 */
export async function waitForCameraToSettle(page, { frames = 30, tolerance = 1e-4, timeout = 10000 } = {}) {
  await page.waitForFunction(
    ({ frames, tolerance }) => {
      const viewer = window.__app?.viewer;
      if (!viewer) return true;
      const now = [...viewer.camera.position.toArray(), ...viewer.controls.target.toArray()];
      const state = (window.__cameraSettle ??= { last: null, still: 0 });
      const moved = !state.last || now.some((value, i) => Math.abs(value - state.last[i]) > tolerance);
      state.still = moved ? 0 : state.still + 1;
      state.last = now;
      if (state.still >= frames) {
        window.__cameraSettle = null;
        return true;
      }
      return false;
    },
    { frames, tolerance },
    { polling: 'raf', timeout }
  );
}
