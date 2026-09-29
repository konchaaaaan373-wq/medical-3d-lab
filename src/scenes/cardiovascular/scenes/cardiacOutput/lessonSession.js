import { RESULT_STATUS, solveCardiacOutput } from '../../../../models/cardiacOutput.js';
import { interventionLadder, lessonClaimProblems, lessonInput } from '../../../../models/cardiacOutputLesson.js';

/**
 * The introductory lesson's state: which of A and B the main circulation is
 * in, and whether C stands beside it.
 *
 * ## One state for the explanation and for the reader
 *
 * The explanation (`lessonStoryboard.js`) and the reader's two buttons drive
 * this same object, and everything drawn and every figure shown is read from
 * it — so the animation cannot show a condition the buttons would not, and the
 * buttons cannot show a number the animation would not.
 *
 * ## Every frame is a solved condition
 *
 * Between A and B the main circulation walks a ladder of resistances
 * (`interventionLadder`), each one solved by the same solver. Nothing drawn is
 * interpolated between two answers: while the vessels narrow, what is on
 * screen at each moment is a condition the model settled into. The walk is a
 * way of showing the change and **not** a time course — the model has no clock.
 *
 * ## Two comparisons, kept apart
 *
 * `reference` is A, and only while the main circulation is past A **and C is
 * not shown**: "before the intervention" is the comparison for B on its own.
 * Once C stands beside B the comparison is B ↔ C — two separate circulations —
 * and A's marks go, so three things are never compared at once.
 *
 * Pure: no `three`, no DOM.
 */

/** How long the walk from A to B (or back) takes when the reader presses the button. */
export const MANUAL_WALK_SECONDS = 1.4;

export class LessonSession {
  /**
   * @param {{ solve?: (input: object) => object }} [options] the solver, for a test
   */
  constructor({ solve = solveCardiacOutput } = {}) {
    this.ladder = interventionLadder().map((input) => solve(input));
    this.other = solve(lessonInput('C'));
    /** Problems with the lesson's claims, from the solved beats. Empty when it may be shown. */
    this.problems = [
      ...this.ladder
        .filter((result) => result.status !== RESULT_STATUS.VALID)
        .map((result) => `a step between A and B did not solve (${result.status})`),
      ...lessonClaimProblems({ A: this.ladder[0], B: this.ladder.at(-1), C: this.other }),
    ];
    this.rung = 0;
    this.target = 0;
    this._clock = 0;
    this._rungSeconds = MANUAL_WALK_SECONDS / Math.max(1, this.lastRung);
    this.showOther = false;
  }

  get lastRung() {
    return this.ladder.length - 1;
  }

  /** A, B and C as solved, by letter. */
  get solved() {
    return { A: this.ladder[0], B: this.ladder.at(-1), C: this.other };
  }

  /** The solved beat the main circulation is drawn from now. */
  get primary() {
    return this.ladder[this.rung];
  }

  /** 'A' or 'B' when the main circulation is at one; null while it is between them. */
  get primaryId() {
    if (this.rung === 0) return 'A';
    if (this.rung === this.lastRung) return 'B';
    return null;
  }

  /** Where the main circulation is going: 'A' or 'B'. */
  get targetId() {
    return this.target === 0 ? 'A' : 'B';
  }

  get walking() {
    return this.rung !== this.target;
  }

  /** How far through the vasoconstrictor action the main circulation is, 0 at A and 1 at B. */
  get progress() {
    return this.lastRung ? this.rung / this.lastRung : 0;
  }

  /** What the main circulation is compared with: A, while it is past A and C is not shown. */
  get reference() {
    return this.rung > 0 && !this.showOther ? this.ladder[0] : null;
  }

  /**
   * Send the main circulation to A or B. The reader's press walks there over
   * `MANUAL_WALK_SECONDS`; `immediate` puts it there now.
   *
   * @param {'A'|'B'} id
   * @param {{ immediate?: boolean }} [options]
   */
  setPrimary(id, { immediate = false } = {}) {
    this.target = id === 'B' ? this.lastRung : 0;
    this._clock = 0;
    if (immediate) this.rung = this.target;
  }

  /**
   * Put the main circulation on one rung at once — the explanation's drive,
   * which reads its position from its own clock so that a seek lands on the
   * same condition every time.
   *
   * @param {number} index 0 (A) … `lastRung` (B)
   */
  setRung(index) {
    const rung = Math.min(this.lastRung, Math.max(0, Math.round(index)));
    this.rung = rung;
    this.target = rung;
    this._clock = 0;
  }

  /** @param {boolean} shown */
  setShowOther(shown) {
    this.showOther = Boolean(shown);
  }

  /** Back to A, alone. */
  reset() {
    this.setRung(0);
    this.showOther = false;
  }

  /**
   * Advance a walk the reader started. Returns whether the condition on
   * screen changed.
   *
   * @param {number} dt seconds
   */
  tick(dt) {
    if (!this.walking) return false;
    this._clock += dt;
    let changed = false;
    while (this.walking && this._clock >= this._rungSeconds) {
      this._clock -= this._rungSeconds;
      this.rung += Math.sign(this.target - this.rung);
      changed = true;
    }
    return changed;
  }

  /** Everything that decides what is on screen, as one string. */
  key() {
    return `${this.rung}|${this.showOther ? 1 : 0}`;
  }
}
