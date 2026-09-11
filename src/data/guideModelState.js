/**
 * The third kind of change a guided step can ask for, checked on its own.
 *
 * `src/data/guideContract.js` holds what a step *says* and where it looks:
 * the stage it stands beside, its position on the scene's axis, the framing and
 * the labels, the copy, and how sure the field is. Those are all either words
 * or camera. This file holds the one that is neither — a step that puts the
 * model into a different state before describing it.
 *
 * **It is deliberately a separate file, and separate rules.** A respiratory
 * explanation opens on an ordinary lung and then narrows its airways, and the
 * difference between those two steps is physiology, not presentation. Keeping
 * the two contracts apart is the machine-readable form of the distinction the
 * whole product rests on: what the model solved, how the picture says it, and
 * what a person is told are three things, and only the first of them is allowed
 * to move when a step carries `controls`.
 *
 * ### A model-state step
 *
 * ```
 * {
 *   controls: { airwayResistance: 2, elasticRecoil: 1 },  // model controls, by id
 *   compare: true,                                        // a reference model beside it
 * }
 * ```
 *
 * Every id has to be one the scene offers and every value inside the range that
 * control declares — a guide that sets `airwayResistance` to 9 on a control
 * that stops at 4 is silently clamped by the scene, and the explanation then
 * describes a lung nobody can reach with the slider it is sitting next to.
 */

/**
 * Everything wrong with one step's model-state request, as sentences.
 *
 * A step that asks for nothing is fine and returns nothing: most steps move
 * only the axis and the camera.
 *
 * @param {{controls?: Record<string, number>, compare?: boolean}} step
 * @param {{controls: {id: string, min?: number, max?: number}[]}} options the
 *   scene's own model controls, as the control panel receives them
 * @returns {string[]}
 */
export function guideModelStateProblems(step, { controls = [] }) {
  const problems = [];
  const where = step?.stage ?? step?.title ?? 'a step';

  if (step?.compare !== undefined && typeof step.compare !== 'boolean') {
    problems.push(`${where}: compare is not a boolean`);
  }
  if (step?.controls === undefined) return problems;
  if (!step.controls || typeof step.controls !== 'object' || Array.isArray(step.controls)) {
    problems.push(`${where}: controls is not an object of control ids to values`);
    return problems;
  }

  const byId = new Map(controls.map((control) => [control.id, control]));
  for (const [id, value] of Object.entries(step.controls)) {
    const control = byId.get(id);
    if (!control) {
      problems.push(`${where}: sets "${id}", which this scene has no control for`);
      continue;
    }
    if (!Number.isFinite(value)) {
      problems.push(`${where}: sets "${id}" to something that is not a number`);
      continue;
    }
    if (Number.isFinite(control.min) && value < control.min) {
      problems.push(`${where}: sets "${id}" to ${value}, below its minimum of ${control.min}`);
    }
    if (Number.isFinite(control.max) && value > control.max) {
      problems.push(`${where}: sets "${id}" to ${value}, above its maximum of ${control.max}`);
    }
  }
  return problems;
}

/**
 * Everything wrong with a whole guide's model-state requests.
 *
 * Beyond the per-step rules, one whole-guide rule: **a step that changes the
 * model may not also be the one that says the model is not producing this.** An
 * `educationalOnly` step is telling the reader that what it says is not drawn
 * from the screen; re-solving the physiology underneath that sentence is how a
 * general explanation comes to look like a result.
 *
 * @param {{steps: object[]}} guide
 * @param {{controls: {id: string, min?: number, max?: number}[]}} options
 * @returns {string[]}
 */
export function guideModelStateSetProblems(guide, options) {
  const problems = [];
  const steps = guide?.steps ?? [];
  for (const [index, step] of steps.entries()) {
    problems.push(...guideModelStateProblems(step, options));
    if (!step?.educationalOnly || !step?.controls) continue;
    const previous = steps[index - 1];
    // Carrying the *same* controls forward is not a change — it is how a step
    // stays on the state the step before it arrived at, which is exactly what
    // a general-explanation step should do.
    const unchanged =
      previous &&
      JSON.stringify(previous.controls ?? null) === JSON.stringify(step.controls ?? null);
    if (!unchanged) {
      problems.push(`${step.stage ?? step.title}: is a general explanation and moves the model as well`);
    }
  }
  return problems;
}
