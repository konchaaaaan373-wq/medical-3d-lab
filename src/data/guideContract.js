/**
 * What a guided explanation step is, checked in one place.
 *
 * The heart-failure guide worked out this shape; the ischaemia guide needs the
 * same one. Rather than a second copy of the same six assertions in a second
 * test file, the rules live here and both scenes' tests call them.
 *
 * **This is a data contract, not a framework.** There is no engine, no state
 * machine and no registry: a guide is still a plain array in `src/data/`, and
 * the reference implementation is `PATIENT_GUIDES['heart-failure']`. What this
 * adds is the ability to say "and the ischaemia one keeps the same promises",
 * in a way that fails when it stops being true.
 *
 * ### A step
 *
 * ```
 * {
 *   stage: 'burden',          // a stage id the scene has
 *   progress: 0.45,           // === that stage's own position on the axis
 *   frame: 'wall',            // optional: a framing the scene declares
 *   focus: ['anterior-wall'], // optional: annotation ids to point at
 *   educationalOnly: true,    // optional: not something the model produces
 *   title, titleJa,           // what changes
 *   body, bodyJa,             // what follows from it
 *   look, lookJa,             // where to look for it on screen
 * }
 * ```
 *
 * `stage` and `progress` together are what stop the patient words and the
 * clinician words describing different solved states. `frame` and `focus` are
 * presentation: a step may move the camera, the model, both or neither, and
 * keeping them apart is what lets two steps be different pictures of one state.
 */

/** Copy every step carries, in the order a reader meets it. */
export const GUIDE_STEP_COPY = Object.freeze(['title', 'body', 'look']);

/**
 * How long each piece may be.
 *
 * A limit, not a style note: this copy is read aloud in a room and has to fit
 * on a phone without scrolling. Japanese is denser, so it gets less room.
 */
export const GUIDE_STEP_LIMITS = Object.freeze({
  title: 60, titleJa: 30,
  body: 190, bodyJa: 110,
  look: 150, lookJa: 90,
});

/**
 * What a patient-facing step may never say.
 *
 * No dose, no drug, no diagnosis, no prognosis, and nothing addressed to the
 * person in front of the screen as a fact about them. Short copy is exactly
 * where those are easiest to smuggle in.
 */
export const FORBIDDEN_IN_PATIENT_COPY = Object.freeze([
  /\b\d+\s*(mg|ml|mmHg|%)/i,
  /\bdiagnos/i, /\bprognos/i, /\btreat(ment|ed)?\b/i, /\bdrug\b/i, /\bmedicat/i,
  /\byou (have|will|are likely)/i,
  /診断/, /予後/, /治療/, /薬/, /投与/, /余命/,
  /あなたの(心臓|病気|状態)/,
]);

/**
 * Everything wrong with one step, as sentences.
 *
 * @param {object} step
 * @param {object} options
 * @param {{id: string, at: number}[]} options.stages the scene's own stages
 * @param {string[]} [options.framings] framing ids the scene declares
 * @returns {string[]}
 */
export function guideStepProblems(step, { stages, framings = [] }) {
  const problems = [];
  const where = step?.stage ?? step?.title ?? 'a step';

  const stage = stages.find((candidate) => candidate.id === step?.stage);
  if (!step?.stage) problems.push(`${where}: names no stage`);
  else if (!stage) problems.push(`${where}: names a stage the scene does not have`);
  else if (step.progress !== stage.at) {
    problems.push(`${where}: sits at ${step.progress}, but stage "${stage.id}" is at ${stage.at}`);
  }

  for (const key of GUIDE_STEP_COPY) {
    for (const field of [key, `${key}Ja`]) {
      const text = step?.[field];
      if (!text?.trim()) {
        problems.push(`${where}: carries no ${field}`);
        continue;
      }
      const limit = GUIDE_STEP_LIMITS[field];
      if (limit && text.length > limit) problems.push(`${where}: ${field} is ${text.length} long, over ${limit}`);
      for (const pattern of FORBIDDEN_IN_PATIENT_COPY) {
        if (pattern.test(text)) problems.push(`${where}: ${field} matches ${pattern}`);
      }
    }
  }

  if (step?.frame && !framings.includes(step.frame)) {
    problems.push(`${where}: asks for framing "${step.frame}", which the scene does not declare`);
  }
  if (step?.focus && !Array.isArray(step.focus)) problems.push(`${where}: focus is not a list of annotation ids`);

  return problems;
}

/**
 * Everything wrong with a whole guide.
 *
 * Beyond the per-step rules: every stage of the model is spoken for, the reader
 * is walked forward rather than back, and the steps the model does not produce
 * are marked. Steps may share a position — a chain that turns from one organ to
 * the next without the model moving — so the order is non-decreasing.
 *
 * @param {{steps: object[]}} guide
 * @param {{stages: {id: string, at: number}[], framings?: string[]}} options
 * @returns {string[]}
 */
export function guideProblems(guide, { stages, framings = [] }) {
  const problems = [];
  const steps = guide?.steps ?? [];
  if (!steps.length) return ['the guide has no steps'];

  for (const step of steps) problems.push(...guideStepProblems(step, { stages, framings }));

  const covered = new Set(steps.map((step) => step.stage));
  for (const stage of stages) {
    if (!covered.has(stage.id)) problems.push(`no step covers stage "${stage.id}"`);
  }

  const positions = steps.map((step) => step.progress);
  for (let at = 1; at < positions.length; at += 1) {
    if (positions[at] < positions[at - 1]) problems.push(`step ${at + 1} goes backwards along the axis`);
  }

  return problems;
}
