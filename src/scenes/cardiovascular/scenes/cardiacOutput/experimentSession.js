import {
  CONTROL_IDS,
  PRESET_IDS,
  RESULT_STATUS,
  inputKey,
  presetInput,
  pressureVolumeCurves,
  solveCardiacOutput,
} from '../../../../models/cardiacOutput.js';
import {
  INTERVENTION_IDS,
  applyIntervention,
  interventionPreset,
} from '../../../../models/cardiacInterventions.js';

/**
 * One reader's experiment: which condition they are on, what it was before
 * they started moving things, and the solved beat everything on screen is
 * drawn from.
 *
 * Holding this apart from the scene is what makes the awkward parts testable
 * without a renderer — that switching preset leaves nothing of the old one
 * behind, that reset goes back to a snapshot which did not follow the reader
 * around, that a condition with no solution does not quietly show the previous
 * one's numbers as if they were current.
 *
 * ## Everything the screen shows carries a revision
 *
 * The 3D, the read-out, the loop, the waveform and any caption all read
 * `session.view`, which is one object produced by one solve. A frame in which
 * the numbers are new and the ventricle is old cannot be assembled from it,
 * because there is nothing to assemble it from: they are fields of the same
 * value, replaced together.
 *
 * ## A condition with no solution is not answered with the last one
 *
 * If a solve is refused or does not settle, the previous valid view is kept —
 * a blank screen teaches nothing — but `applied` goes false and `problems`
 * says why. The scene surfaces that as a row of its own, so what a reader sees
 * is "this is the previous condition" rather than a number that silently
 * stopped moving. Every reachable slider position is inside the verified
 * domain, so this should not happen; it is here because "should not happen" is
 * not a guarantee and a silent fallback is the failure that would follow.
 *
 * ## Caching
 *
 * Per session, never module-wide. The key is every medical input plus the
 * solver settings (`inputKey`), and the values are frozen results. The
 * heart-failure scene's cache is shared across the module and keyed on three
 * of its inputs; that is right for one progression axis and wrong here, where
 * four independent controls and two presets would collide in it.
 */

const CACHE_LIMIT = 256;

/** A frozen copy, so nothing downstream can edit a stored condition. */
const freezeInput = (input) => Object.freeze({ ...input });

export class ExperimentSession {
  /**
   * @param {{ presetId?: string, solverOptions?: object }} [options]
   */
  constructor({ presetId = PRESET_IDS.REFERENCE, solverOptions = {} } = {}) {
    this.solverOptions = solverOptions;
    this._cache = new Map();
    this._warmStart = null;
    this._revision = 0;
    /** The last view that came from a solution which actually settled. */
    this._view = null;
    /** Whether the most recently requested condition is the one on screen. */
    this._applied = true;
    this._problems = [];
    /**
     * Which intervention is selected. There is no second condition stored
     * beside it, and that is deliberate — see `selectIntervention`.
     */
    this._intervention = INTERVENTION_IDS.NONE;
    /**
     * The intervention whose effect the reader has since adjusted by hand, or
     * `none`. Only a label: the condition itself is entirely in `_input`. It is
     * recoverable from the control snapshot because a restore replays the
     * intervention (see `origin`) and then the four values, and `setControl`
     * lands on exactly those values from there.
     */
    this._adjustedAfter = INTERVENTION_IDS.NONE;
    this.selectPreset(presetId);
  }

  /**
   * Where the condition on screen came from: the intervention applied, or the
   * one the reader has adjusted since, or `none`. What the intervention row
   * reports, so a restore that replays it and then the four values arrives at
   * the same condition with the same label.
   */
  get origin() {
    return this._intervention !== INTERVENTION_IDS.NONE ? this._intervention : this._adjustedAfter;
  }

  /** The intervention the reader has adjusted since applying it, or `none`. */
  get adjustedAfter() {
    return this._adjustedAfter;
  }

  /** The intervention currently applied, or `none`. */
  get interventionId() {
    return this._intervention;
  }

  /** The preset the reader is on. */
  get presetId() {
    return this._presetId;
  }

  /** The condition the controls are currently set to. Frozen. */
  get input() {
    return this._input;
  }

  /**
   * The condition this preset started at, and what "before" means in a
   * comparison. It is captured when a preset is selected and never touched
   * again, so a comparison cannot drift along behind the reader.
   */
  get baseline() {
    return this._baseline;
  }

  /** The solved view on screen: `{ revision, input, metrics, cycle, curves }`. */
  get view() {
    return this._view;
  }

  /** False when the requested condition could not be solved and the screen is showing the one before it. */
  get applied() {
    return this._applied;
  }

  /** Why the requested condition was refused, when it was. */
  get problems() {
    return this._problems;
  }

  /** Whether any control has been moved away from this preset's starting point. */
  get moved() {
    return CONTROL_IDS.some((id) => this._input[id] !== this._baseline.input[id]);
  }

  /**
   * Starts a preset.
   *
   * Every control goes back to that preset's value, a fresh "before" snapshot
   * is taken, and nothing of the previous preset survives — which is the part
   * worth stating, because a control left where the reader had dragged it under
   * the *other* preset is an invisible input, and an invisible input is the one
   * thing an experiment cannot have.
   *
   * @param {string} presetId
   */
  selectPreset(presetId) {
    this._presetId = presetId;
    this._intervention = INTERVENTION_IDS.NONE;
    this._adjustedAfter = INTERVENTION_IDS.NONE;
    this._input = freezeInput(presetInput(presetId));
    // Solve the starting condition first: it is both what is on screen and the
    // snapshot everything is compared against, and they must be one solve.
    const view = this._solve(this._input);
    this._baseline = view;
    this._view = view;
    this._applied = true;
    this._problems = [];
    return view;
  }

  /**
   * Moves one control.
   *
   * @param {string} id one of `CONTROL_IDS`
   * @param {number} value
   */
  setControl(id, value) {
    if (!CONTROL_IDS.includes(id)) throw new RangeError(`unknown control: ${id}`);
    // Setting a control to the value it already has is not moving it, and must
    // not do anything. `restoreSessionState` puts a reader back by replaying
    // every control at its captured value, and with an intervention selected
    // those values *are* the intervention's; a replay that counted as four
    // manual moves handed back the right numbers with the chip silently reading
    // "none".
    if (this._input[id] === value) return this._view;

    // Moving one input changes that input and nothing else. With an
    // intervention applied, the others stay at the values the intervention
    // gave them: a reader who has pressed dobutamine and then raises the
    // filling is asking "this, with more filling", and the rule used to answer
    // with the preset's own contractility and resistance — a second change
    // nobody asked for (owner's review of the phone recordings, 2026-09-25).
    //
    // The intervention stops being "applied" — the condition is now the
    // reader's — and is remembered as where it came from, for the label only.
    if (this._intervention !== INTERVENTION_IDS.NONE) this._adjustedAfter = this._intervention;
    this._intervention = INTERVENTION_IDS.NONE;
    this._input = freezeInput({ ...this._input, [id]: value });
    return this._apply(this._input);
  }

  /**
   * Puts one input back to where this experiment started, and leaves the
   * others where they are.
   *
   * @param {string} id one of `CONTROL_IDS`
   */
  resetControl(id) {
    return this.setControl(id, this._baseline.input[id]);
  }

  /**
   * Applies one intervention, or clears it.
   *
   * Always computed from this preset's starting condition, so choosing the same
   * one twice produces the same condition twice: there is no accumulator to add
   * to. An intervention whose evidence belongs to one preset switches to that
   * preset first rather than being offered on a circulation it was never
   * observed in.
   *
   * ## Clearing one lands on the preset's starting condition, always
   *
   * It used to land on whatever the reader had set by hand before choosing the
   * intervention, which is nicer — and it was a piece of state nothing on screen
   * showed and nothing could restore. `captureSessionState` carries the control
   * values and nothing else, so after a sequence or a lesson that hidden
   * condition was gone and "clear" quietly meant something different from what
   * it had meant a minute earlier. State that cannot survive a round trip and
   * that a reader cannot see is worse than a simpler rule.
   *
   * So the rule is one sentence, it is the same before and after a round trip,
   * and the preset chip on screen says where "clear" goes. What it still cannot
   * do is add a drug's effect on top of a hand-set condition: there is nothing
   * to add it to, because every intervention is computed from the baseline.
   *
   * @param {string} interventionId
   */
  selectIntervention(interventionId) {
    if (interventionId === INTERVENTION_IDS.NONE) {
      if (this._intervention === INTERVENTION_IDS.NONE && this._adjustedAfter === INTERVENTION_IDS.NONE) return this._view;
      this._intervention = INTERVENTION_IDS.NONE;
      this._adjustedAfter = INTERVENTION_IDS.NONE;
      this._input = this._baseline.input;
      return this._apply(this._input);
    }

    const required = interventionPreset(interventionId);
    if (required && required !== this._presetId) this.selectPreset(required);
    this._intervention = interventionId;
    this._adjustedAfter = INTERVENTION_IDS.NONE;

    const applied = applyIntervention(this._baseline.input, interventionId);
    if (!applied.input) {
      this._applied = false;
      this._problems = applied.problems;
      return this._view;
    }
    this._input = freezeInput(applied.input);
    return this._apply(this._input);
  }

  /**
   * Replaces the whole condition at once.
   *
   * Used by an intervention, a lesson or the sequence. It is the same path the
   * sliders take, so the same validation and the same diagnostics run — there
   * is no second route into the model with a different standard.
   *
   * @param {object} input
   */
  setInput(input) {
    this._input = freezeInput({ ...this._input, ...input });
    return this._apply(this._input);
  }

  /**
   * Back to this preset's starting condition.
   *
   * The snapshot is reused rather than re-solved: it is the same condition, so
   * re-solving it could only introduce a difference.
   */
  reset() {
    this._intervention = INTERVENTION_IDS.NONE;
    this._adjustedAfter = INTERVENTION_IDS.NONE;
    this._input = this._baseline.input;
    this._view = this._baseline;
    this._applied = true;
    this._problems = [];
    return this._view;
  }

  /** Solve, and adopt the result only if it settled. */
  _apply(input) {
    const result = this._solve(input);
    if (!result) {
      this._applied = false;
      return this._view;
    }
    this._view = result;
    this._applied = true;
    this._problems = [];
    return this._view;
  }

  /**
   * Solves a condition, through the cache. Returns null when it did not settle
   * — and records why, so the caller does not have to ask twice.
   */
  _solve(input) {
    const key = inputKey(input, this.solverOptions);
    const cached = this._cache.get(key);
    if (cached) return cached;

    const result = solveCardiacOutput(input, {
      ...this.solverOptions,
      warmStart: this._warmStart,
      revision: this._revision + 1,
    });
    if (result.status !== RESULT_STATUS.VALID) {
      this._problems = result.problems;
      return null;
    }

    this._revision += 1;
    this._warmStart = result.volumes;
    const view = Object.freeze({
      revision: this._revision,
      input: result.input,
      metrics: result.metrics,
      cycle: result.cycle,
      curves: Object.freeze(pressureVolumeCurves(result)),
      diagnostics: result.diagnostics,
    });
    // Bounded, and cleared rather than evicted one at a time: which entry is
    // oldest does not matter here, and an LRU would be machinery for a map that
    // holds a few hundred beats.
    if (this._cache.size >= CACHE_LIMIT) this._cache.clear();
    this._cache.set(key, view);
    return view;
  }

}
