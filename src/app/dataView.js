/**
 * Whether a scene has anything that only Data view shows.
 *
 * A pure predicate rather than an expression inside `App.js`, because getting
 * it wrong is silent: the Data button is simply absent, and with it every plot
 * the scene draws. Nothing throws and nothing looks broken — there is just no
 * pressure-volume loop, and no way to ask for one.
 *
 * The rule used to be "the scene has metrics, and its model controls are not
 * primary". The second half is there for a real reason: a scene whose tactile
 * controls carry three read-outs on screen has no second layer to reveal, and a
 * Data button would switch between two views holding the same information —
 * `circulation` is that scene. But it took "the controls are primary" to mean
 * "there is nothing else", and a scene can have both: `cardiac-output` keeps
 * four controls and three figures in front of the reader **and** plots a
 * pressure-volume loop and a pressure waveform, which live only in Data view.
 * With the old rule those two panels were built, mounted, updated every frame,
 * and unreachable.
 *
 * So the question is asked of the panels rather than of the controls: is there
 * a surface that Data view is the only way to see?
 *
 * @param {{ getMetrics?: Function, getPressureVolume?: Function, getBullseye?: Function }} scene
 * @param {{ modelControls?: { primary?: boolean }, charts?: unknown[], bullseye?: unknown }} meta
 * @returns {boolean}
 */
export function hasDataOnlySurface(scene, meta = {}) {
  if (!scene) return false;
  // Plots are hidden in learning view whatever the controls are doing.
  if (scene.getPressureVolume) return true;
  if (meta.charts?.length) return true;
  if (meta.bullseye && scene.getBullseye) return true;
  // The read-out, unless it is already on screen as part of a primary control
  // surface — in which case Data view would reveal nothing.
  return Boolean(scene.getMetrics) && !meta.modelControls?.primary;
}
