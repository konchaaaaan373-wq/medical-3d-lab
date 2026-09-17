/**
 * How the inspection panel's buttons are named on a command line.
 *
 * `capture-anatomy-views.mjs --view` and `measure-anatomy-points.mjs --view`
 * name the *button's label*, slugified — not the `id` in the scene's
 * `static views`. The two agree often enough to be mistaken for one thing (the
 * kidney's `coronal-section` is both; `kidneys` is only the id, and its label
 * slugifies to `both-kidneys`), which is how a comparison came back as two
 * empty directories and an exit code of 0 (`docs/verification-lessons.md`
 * L-39).
 *
 * It lives here, in one place, because two tools that disagree about what
 * `--view coronal-section` means would measure two different states and say
 * nothing. A copy in each script is the same defect waiting for the next edit.
 *
 * The button carries an English and a Japanese span with no separator between
 * them, so the Japanese collapses into the trailing hyphen that is then
 * trimmed: "Both kidneys左右の腎" -> "both-kidneys".
 *
 * @param {string} text the button's `textContent`
 * @returns {string}
 */
export const slugifyChoice = (text) =>
  text.trim().split('\n')[0].toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
