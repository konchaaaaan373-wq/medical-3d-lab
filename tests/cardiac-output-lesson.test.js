import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONTROL_DOMAIN,
  CONTROL_IDS,
  PRESET_IDS,
  RESULT_STATUS,
  presetInput,
  solveCardiacOutput,
} from '../src/models/cardiacOutput.js';
import {
  INTERVENTION_IDS,
  INTERVENTION_LIST,
  INTERVENTION_PROFILES,
  applyIntervention,
} from '../src/models/cardiacInterventions.js';
import { INTERVENTION_OPTIONS, INTERVENTION_SCOPE } from '../src/data/cardiacOutputInterventions.js';
import {
  LESSON_CLAIM_TOLERANCES,
  LESSON_CONDITIONS,
  directionOf,
  interventionLadder,
  lessonClaimProblems,
  lessonInput,
  solveLessonConditions,
} from '../src/models/cardiacOutputLesson.js';
import { LessonSession, MANUAL_WALK_SECONDS } from '../src/scenes/cardiovascular/scenes/cardiacOutput/lessonSession.js';
import {
  LESSON_DURATION,
  LESSON_TIMELINE,
  allGuides,
  captionFor,
  figureSummary,
  guideFor,
  lessonValues,
  outputDirection,
  presentationAt,
  stepIndexAt,
  stripsFor,
} from '../src/scenes/cardiovascular/scenes/cardiacOutput/lessonStoryboard.js';
import {
  LESSON_ACTIONS,
  LESSON_CONDITION_COPY,
  LESSON_GUIDE,
  LESSON_NOTE,
  LESSON_SCOPE,
  LESSON_STEPS,
  LESSON_TERMS,
} from '../src/data/cardiacOutputLesson.js';

/**
 * The introductory lesson: "blood pressure went up — did the output?"
 *
 * What is held here is that the lesson is **the model's**, not a script with
 * numbers in it. Its three conditions are built from the presets and one
 * intervention, solved by the one solver, and every claim it makes about them
 * is re-derived from the solutions below — so a change anywhere in the model
 * that stopped supporting the lesson turns this red instead of leaving the
 * screen saying something the model no longer says.
 */

const solved = solveLessonConditions();
const metrics = (id) => solved[id].metrics;

// ---------------------------------------------------------------------------
// The intervention
// ---------------------------------------------------------------------------

test('the vasoconstrictor action changes the systemic resistance and holds the other three exactly', () => {
  const profile = INTERVENTION_PROFILES[INTERVENTION_IDS.VASOCONSTRICTION];
  assert.deepEqual(Object.keys(profile.effects), ['systemicResistanceMmHgSPerMl']);
  const named = new Set([...Object.keys(profile.effects), ...profile.unchanged]);
  assert.deepEqual([...named].sort(), [...CONTROL_IDS].sort(), 'every input is either changed or declared held');

  const base = presetInput(PRESET_IDS.REDUCED_CONTRACTILITY);
  const applied = applyIntervention(base, INTERVENTION_IDS.VASOCONSTRICTION);
  assert.deepEqual(applied.changed, ['systemicResistanceMmHgSPerMl']);
  for (const id of profile.unchanged) assert.equal(applied.input[id], base[id], `${id} is held`);
  assert.ok(applied.input.systemicResistanceMmHgSPerMl > base.systemicResistanceMmHgSPerMl, 'resistance goes up');
});

test('the vasoconstrictor action is refused, not clamped, where it would leave the verified range', () => {
  const high = { ...presetInput(PRESET_IDS.REFERENCE), systemicResistanceMmHgSPerMl: 1.4 };
  const applied = applyIntervention(high, INTERVENTION_IDS.VASOCONSTRICTION);
  assert.equal(applied.input, null);
  assert.ok(applied.problems.some((problem) => /systemicResistance/.test(problem)));
});

test('the detailed experiment offers the vasoconstrictor action — as the action, on both presets, never refused', () => {
  // The owner's decision of 2026-09-30 (F-237): the full model's menu gains it,
  // under the lesson's name — the action, schematic, resistance only — and
  // never as noradrenaline (F-182).
  assert.ok(INTERVENTION_LIST.includes(INTERVENTION_IDS.VASOCONSTRICTION));
  const option = INTERVENTION_OPTIONS.find((entry) => entry.value === INTERVENTION_IDS.VASOCONSTRICTION);
  assert.match(option.labelJa, /血管収縮作用/);
  assert.match(option.labelJa, /模式/);
  assert.match(option.labelJa, /抵抗のみ/);
  for (const words of [option.label, option.labelJa, option.short, option.shortJa]) {
    assert.doesNotMatch(words, /noradrenaline|norepinephrine|ノルアドレナリン/i, `"${words}" names a drug`);
  }
  assert.match(INTERVENTION_SCOPE.map((entry) => entry.textJa).join('\n'), /ノルアドレナリンではなく/);

  // The full model applies an intervention to a preset's starting condition,
  // and on both it stays inside the verified range: offered, never refused.
  for (const presetId of Object.values(PRESET_IDS)) {
    const base = presetInput(presetId);
    const applied = applyIntervention(base, INTERVENTION_IDS.VASOCONSTRICTION);
    assert.ok(applied.input, `${presetId}: ${applied.problems.join('; ')}`);
    const before = solveCardiacOutput(base).metrics;
    const after = solveCardiacOutput(applied.input).metrics;
    assert.ok(after.meanArterialPressureMmHg > before.meanArterialPressureMmHg, `${presetId}: the pressure rises`);
    assert.equal(after.heartRatePerMin, before.heartRatePerMin, `${presetId}: the rate is held`);
  }
});

// ---------------------------------------------------------------------------
// The three conditions
// ---------------------------------------------------------------------------

test('A is the reduced-contractility preset, B is A with the vasoconstrictor action, C is the reference', () => {
  assert.deepEqual(lessonInput('A'), presetInput(PRESET_IDS.REDUCED_CONTRACTILITY));
  assert.deepEqual(
    lessonInput('B'),
    applyIntervention(presetInput(PRESET_IDS.REDUCED_CONTRACTILITY), INTERVENTION_IDS.VASOCONSTRICTION).input
  );
  assert.deepEqual(lessonInput('C'), presetInput(PRESET_IDS.REFERENCE));

  // B differs from A in the resistance only.
  const moved = CONTROL_IDS.filter((id) => lessonInput('A')[id] !== lessonInput('B')[id]);
  assert.deepEqual(moved, ['systemicResistanceMmHgSPerMl']);

  // What each is to the others is declared, not inferred.
  assert.equal(LESSON_CONDITIONS.B.relation, 'after');
  assert.equal(LESSON_CONDITIONS.B.of, 'A');
  assert.equal(LESSON_CONDITIONS.C.relation, 'separate');
  assert.equal(LESSON_CONDITIONS.C.of, null, 'C is not derived from B or from A');
});

test('all three solve to settled beats inside the verified domain', () => {
  for (const id of ['A', 'B', 'C']) {
    assert.equal(solved[id].status, RESULT_STATUS.VALID, `${id}: ${solved[id].problems.join('; ')}`);
    for (const control of CONTROL_IDS) {
      const { min, max } = CONTROL_DOMAIN[control];
      const value = solved[id].input[control];
      assert.ok(value >= min && value <= max, `${id}.${control} = ${value} is outside ${min}..${max}`);
    }
  }
});

test('what the lesson claims is what the solver says', () => {
  assert.deepEqual(lessonClaimProblems(solved), []);

  // Said as the solver has it, with the margins that make the words true.
  const t = LESSON_CLAIM_TOLERANCES;
  assert.ok(Math.abs(metrics('B').meanArterialPressureMmHg - metrics('C').meanArterialPressureMmHg) <= t.similarPressureMmHg);
  assert.ok(metrics('C').cardiacOutputLMin - metrics('B').cardiacOutputLMin >= t.distinctOutputLMin);
  assert.ok(metrics('B').meanArterialPressureMmHg - metrics('A').meanArterialPressureMmHg >= t.pressureRiseMmHg);
  // One beat stands for a minute only because the rates are equal.
  assert.equal(metrics('A').heartRatePerMin, metrics('B').heartRatePerMin);
  assert.equal(metrics('B').heartRatePerMin, metrics('C').heartRatePerMin);
});

test('the claim check catches each way the lesson could stop being true', () => {
  // A guard that cannot go red is not a guard. Each case moves one figure of
  // a real solution past its tolerance and asks for the matching problem.
  const withMetrics = (id, patch) => ({
    ...solved,
    [id]: { ...solved[id], metrics: { ...solved[id].metrics, ...patch } },
  });
  const cMap = metrics('C').meanArterialPressureMmHg;
  assert.match(
    lessonClaimProblems(withMetrics('B', { meanArterialPressureMmHg: cMap - 6 })).join(' '),
    /about the same/
  );
  assert.match(
    lessonClaimProblems(withMetrics('C', { cardiacOutputLMin: metrics('B').cardiacOutputLMin + 0.4 })).join(' '),
    /clearly different/
  );
  assert.match(
    lessonClaimProblems(withMetrics('B', { meanArterialPressureMmHg: metrics('A').meanArterialPressureMmHg + 2 })).join(' '),
    /not visibly/
  );
  assert.match(lessonClaimProblems(withMetrics('C', { heartRatePerMin: 90 })).join(' '), /heart rate/);
  assert.match(lessonClaimProblems({ ...solved, B: { status: RESULT_STATUS.NONCONVERGED } }).join(' '), /did not solve/);
});

test('which way the output moved from A to B is read from the solution', () => {
  // Not a claim the lesson makes about vasopressors: the sentence is chosen
  // from this, and the copy has one for every direction.
  const expected = directionOf(metrics('A').cardiacOutputLMin, metrics('B').cardiacOutputLMin, 0.1);
  assert.equal(outputDirection(solved), expected);
  for (const direction of ['up', 'down', 'same']) {
    assert.ok(LESSON_STEPS.result.text[direction]?.ja, `a sentence for "${direction}"`);
    assert.ok(LESSON_STEPS.result.text[direction]?.en);
  }
  assert.equal(directionOf(3.14, 3.16, 0.1), 'up');
  assert.equal(directionOf(3.16, 3.14, 0.1), 'down');
  assert.equal(directionOf(3.12, 3.14, 0.1), 'same');
});

// ---------------------------------------------------------------------------
// Between A and B
// ---------------------------------------------------------------------------

test('the walk from A to B is a ladder of solved conditions, the resistance the only thing moving', () => {
  const ladder = interventionLadder();
  assert.deepEqual(ladder[0], lessonInput('A'));
  assert.deepEqual(ladder.at(-1), lessonInput('B'));
  assert.ok(ladder.length >= 6, 'enough steps that the narrowing is seen, not jumped');
  let previous = null;
  for (const input of ladder) {
    for (const id of CONTROL_IDS) {
      if (id !== 'systemicResistanceMmHgSPerMl') assert.equal(input[id], ladder[0][id], `${id} is held on every rung`);
    }
    const result = solveCardiacOutput(input);
    assert.equal(result.status, RESULT_STATUS.VALID);
    if (previous) {
      assert.ok(input.systemicResistanceMmHgSPerMl > previous.input.systemicResistanceMmHgSPerMl);
      assert.ok(
        result.metrics.meanArterialPressureMmHg > previous.metrics.meanArterialPressureMmHg,
        'the pressure climbs rung by rung'
      );
    }
    previous = result;
  }
});

// ---------------------------------------------------------------------------
// The session
// ---------------------------------------------------------------------------

test('session: opens at A alone, with nothing to compare against', () => {
  const session = new LessonSession();
  assert.deepEqual(session.problems, []);
  assert.equal(session.primaryId, 'A');
  assert.equal(session.showOther, false);
  assert.equal(session.canShowOther, false);
  assert.equal(session.reference, null);
  assert.deepEqual(session.primary.input, lessonInput('A'));
});

test('session: the reader’s press walks every rung to B, and "start" is A', () => {
  const session = new LessonSession();
  session.setPrimary('B');
  assert.equal(session.walking, true);
  const seen = new Set();
  let elapsed = 0;
  while (session.walking && elapsed < 5) {
    session.tick(1 / 60);
    elapsed += 1 / 60;
    seen.add(session.rung);
    if (session.rung > 0 && session.rung < session.lastRung) {
      assert.equal(session.primaryId, null, 'between A and B it is neither');
      assert.equal(session.canShowOther, false, 'C cannot be brought in on the way');
    }
  }
  assert.equal(session.primaryId, 'B');
  assert.ok(elapsed <= MANUAL_WALK_SECONDS + 0.1, `the walk took ${elapsed.toFixed(2)} s`);
  assert.equal(seen.size, session.lastRung + 1, 'no rung is skipped at 60 frames a second');
  assert.equal(session.reference, session.ladder[0], 'B alone is compared with A');
  assert.equal(session.canShowOther, true, 'at B, C may come in');
  assert.deepEqual(session.primary.input, lessonInput('B'));
});

test('session: C stands beside B and nothing else — refused at A and on the way, closed when B is left', () => {
  // Owner's review, 2026-10-01: the buttons let a reader put C beside A, a
  // comparison the lesson has nothing to say about.
  const session = new LessonSession();
  assert.equal(session.setShowOther(true), false, 'refused at A');
  assert.equal(session.showOther, false);

  session.setPrimary('B');
  session.tick(MANUAL_WALK_SECONDS / 3);
  assert.equal(session.primaryId, null);
  assert.equal(session.setShowOther(true), false, 'refused while the vessels are still narrowing');

  session.setPrimary('B', { immediate: true });
  assert.equal(session.setShowOther(true), true, 'allowed at B');
  assert.equal(session.reference, null, 'beside C, A’s marks go: three things are never compared at once');

  // Taking the action away closes C at once — before the walk back starts.
  session.setPrimary('A');
  assert.equal(session.showOther, false, 'C closed the moment the action is taken away');
  while (session.walking) session.tick(1 / 60);
  assert.equal(session.primaryId, 'A');
  assert.equal(session.showOther, false);

  // The explanation's drive obeys the same rule: a rung off B closes C.
  session.setRung(session.lastRung);
  session.setShowOther(true);
  session.setRung(session.lastRung - 1);
  assert.equal(session.showOther, false);
});

test('session: no sequence of the reader’s presses ever shows C beside anything but B', () => {
  // Every order of the two buttons, pressed at every moment of a walk: the
  // invariant is checked after each step rather than at the ends.
  let seed = 7;
  const next = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  for (let run = 0; run < 200; run++) {
    const session = new LessonSession();
    for (let step = 0; step < 40; step++) {
      const roll = next();
      if (roll < 0.35) session.setPrimary(session.targetId === 'B' ? 'A' : 'B');
      else if (roll < 0.7) session.setShowOther(!session.showOther);
      else session.tick(next() * 0.6);
      if (session.showOther) {
        assert.equal(session.rung, session.lastRung, `run ${run}, step ${step}: C shown at rung ${session.rung}`);
        assert.equal(session.targetId, 'B', `run ${run}, step ${step}: C shown while heading back to A`);
      }
    }
  }
});

test('figure data: B alone carries A as cream "start" marks, with the solved directions', () => {
  const session = new LessonSession();
  session.setPrimary('B', { immediate: true });
  const [strip, ...rest] = stripsFor(session);
  const values = lessonValues(solved);
  assert.equal(rest.length, 0);
  assert.equal(strip.id, 'B');
  assert.equal(strip.values.map, values.mapB);
  assert.equal(strip.values.co, values.coB);
  assert.equal(strip.values.mapDirection, 'up');
  assert.equal(strip.values.coDirection, outputDirection(solved));
  assert.ok(strip.drawing.before, 'A is drawn as the start marks');
  assert.equal(strip.narrowed, true);

  session.setShowOther(true);
  const [b, c] = stripsFor(session);
  assert.equal(b.drawing.before, null, 'beside C, no start marks');
  assert.equal(b.values.mapDirection, null);
  assert.equal(c.id, 'C');
  assert.equal(c.values.map, values.mapC);
  assert.equal(c.values.co, values.coC);
  assert.equal(c.narrowed, false, 'C’s vessels are not narrowed');
  assert.equal(c.copy.note.ja, 'B の治療後ではない');
});

test('figure data: said in words for a screen reader, the plain name first and the term after', () => {
  const session = new LessonSession();
  session.setPrimary('B', { immediate: true });
  session.setShowOther(true);
  const said = figureSummary(stripsFor(session));
  const values = lessonValues(solved);
  assert.match(said.ja, /血管を縮めた後（B）/);
  assert.match(said.ja, /別の循環（C）/);
  assert.ok(said.ja.includes(`血圧の平均（平均血圧） ${values.mapB} mmHg`));
  assert.ok(said.ja.includes(`心臓が1分間に送り出す量（心拍出量） ${values.coC} L`));
});

// ---------------------------------------------------------------------------
// The words
// ---------------------------------------------------------------------------

test('words: the change from A to B is said as a direction in this model, never as a size', () => {
  // "少し減りました" put a clinical judgement on 3.75 → 3.13 L/min (−16 %)
  // that the lesson does not make (owner's review, 2026-09-30).
  const sizes = /少し|わずか|やや|大きく|大幅|かなり|著しく|a little|slightly|somewhat|greatly|markedly|significantly|substantially/i;
  const said = [
    ...Object.values(LESSON_STEPS.result.text),
    LESSON_GUIDE.afterDown,
    LESSON_GUIDE.afterSame,
    LESSON_GUIDE.afterUp,
  ];
  for (const words of said) {
    for (const text of [words.en, words.ja]) {
      assert.doesNotMatch(text, sizes, `"${text}" says how big the change is`);
    }
    assert.match(words.ja, /このモデルでは/, `"${words.ja}" does not say it is this model's result`);
    assert.match(words.en, /in this model/i, `"${words.en}" does not say it is this model's result`);
  }
});

test('words: a plain phrase first and the term after it; A, B and C never only a letter', () => {
  // Owner's review, 2026-10-01.
  assert.equal(LESSON_TERMS.output.full.ja, '心臓が1分間に送り出す量（心拍出量）');
  assert.equal(LESSON_TERMS.resistance.full.ja, '血液の通りにくさ（血管抵抗）');
  assert.equal(LESSON_TERMS.pressure.full.ja, '血圧の平均（平均血圧）');
  assert.deepEqual(
    ['A', 'B', 'C'].map((id) => LESSON_CONDITION_COPY[id].role.ja),
    ['開始時', '血管を縮めた後', '別の循環']
  );
  // Where a sentence names a circulation by its letter, its name stands beside it.
  for (const step of Object.values(LESSON_STEPS)) {
    const heading = step.heading.ja;
    for (const [id, name] of [['A', '開始時'], ['B', '血管を縮めた後'], ['C', '別の循環']]) {
      if (heading.includes(`（${id}）`)) assert.ok(heading.includes(`${name}（${id}）`), `"${heading}" names ${id} by its letter alone`);
    }
  }
  // The technical terms are never on screen without the plain words in front of
  // them. A legend row is one reading across its two lines.
  const { legend, ...terms } = LESSON_TERMS;
  const rows = Object.values(legend)
    .filter((row) => row.main)
    .map((row) => ({ en: `${row.main.en}${row.sub?.en ?? ''}`, ja: `${row.main.ja}${row.sub?.ja ?? ''}` }));
  const everything = JSON.stringify({ LESSON_STEPS, LESSON_GUIDE, LESSON_ACTIONS, terms, rows, LESSON_NOTE });
  for (const [term, plain] of [['心拍出量', '送り出す量（心拍出量）'], ['血管抵抗', '通りにくさ（血管抵抗）'], ['平均血圧', '（平均血圧）']]) {
    const bare = everything.split(term).length - 1;
    const paired = everything.split(plain).length - 1;
    assert.equal(bare, paired, `"${term}" appears ${bare - paired} time(s) without the plain words before it`);
  }
});

test('words: the action is a schematic part of a vasopressor, never a drug given, and never said to always lower output', () => {
  assert.equal(LESSON_ACTIONS.constrict.ja, '血管を縮める作用を加える');
  assert.match(LESSON_NOTE.ja, /昇圧薬の働きの一部.*だけを取り出した模式実験/);
  assert.match(LESSON_NOTE.ja, /実際の薬の全作用は再現しません/);
  const everything = JSON.stringify({ LESSON_STEPS, LESSON_GUIDE, LESSON_ACTIONS, LESSON_TERMS, LESSON_NOTE });
  assert.doesNotMatch(everything, /投与|ノルアドレナリンを|必ず(拍出|心拍出|送り出す量)が?(下が|減)る|always lower/);
  // The one sentence that answers "would a real drug always do this?" says no.
  assert.match(LESSON_STEPS.result.note.ja, /必ずこうなるとは限りません/);
});

// ---------------------------------------------------------------------------
// The explanation
// ---------------------------------------------------------------------------

test('explanation: five scenes in the order the lesson is told, contiguous, about half a minute', () => {
  assert.deepEqual(
    LESSON_TIMELINE.map((scene) => scene.id),
    ['start', 'constrict', 'result', 'other', 'conclusion']
  );
  let at = 0;
  for (const scene of LESSON_TIMELINE) {
    assert.equal(scene.at, at);
    assert.ok(scene.duration >= 5, `${scene.id} leaves time to read (${scene.duration} s)`);
    at = scene.until;
  }
  assert.equal(LESSON_DURATION, at);
  // The owner asked for about 20–30 s, and not at the cost of reading time.
  assert.ok(LESSON_DURATION >= 20 && LESSON_DURATION <= 35, `${LESSON_DURATION} s`);
});

test('explanation: A first, the change inside scene 2, B after; C only in the last two, and only at B', () => {
  const session = new LessonSession();
  const last = session.lastRung;
  for (let t = 0; t < LESSON_DURATION; t += 0.25) {
    const shown = presentationAt(t, last);
    if (shown.step.id === 'start') assert.equal(shown.rung, 0);
    if (['result', 'other', 'conclusion'].includes(shown.step.id)) assert.equal(shown.rung, last);
    assert.equal(shown.showOther, ['other', 'conclusion'].includes(shown.step.id), `C at ${t}`);
    if (shown.showOther) assert.equal(shown.rung, last, 'C beside B only');
    // Point first: the change never starts the moment its scene does.
    if (shown.step.id === 'constrict' && shown.into < 1) assert.equal(shown.rung, 0);
    // Both tubes fill together when C arrives, and are full by the end of the scene.
    if (shown.step.id === 'other' && shown.into < 0.5) assert.equal(shown.refill, 0);
    if (shown.step.id === 'conclusion') assert.equal(shown.refill, 1);
    // The session takes what the explanation sets, by the same rule as the buttons.
    session.setRung(shown.rung);
    assert.equal(session.setShowOther(shown.showOther), shown.showOther, `the session refused the explanation at ${t}`);
  }
  // Seeking lands on the same condition every time.
  const constrict = LESSON_TIMELINE[1];
  assert.equal(presentationAt(constrict.until - 0.01, last).rung, last);
  assert.equal(stepIndexAt(LESSON_DURATION + 5), LESSON_TIMELINE.length - 1);
});

/**
 * Counting words are not figures: 「1分間」「1回」「4つ」 say "a minute", "one
 * beat", "four". Everything else with a digit in it has to be a solved figure
 * or a scale the figure is drawn on.
 */
const COUNTING_WORDS = /[1-4](?:回|分間|本|か所|つ)|per minute|0–6 L|0〜6 L/g;

test('explanation: every figure in a sentence is a solved figure', () => {
  const values = lessonValues(solved);
  const allowed = new Set(Object.values(values));
  for (const scene of LESSON_TIMELINE) {
    const caption = captionFor(scene.id, solved);
    for (const part of [caption.heading, caption.text, caption.note].filter(Boolean)) {
      for (const text of [part.en, part.ja]) {
        assert.ok(!/\{\w+\}/.test(text), `${scene.id}: a placeholder was left in "${text}"`);
        for (const number of text.replace(COUNTING_WORDS, '').match(/\d+(?:\.\d+)?/g) ?? []) {
          assert.ok(allowed.has(number), `${scene.id}: "${number}" is not a solved figure (${text})`);
        }
      }
    }
  }
  // The copy itself writes no figure down. (A letter like "A" or a unit is not a figure.)
  const copyNumbers = JSON.stringify(LESSON_STEPS).replace(COUNTING_WORDS, '').match(/(?<![{\w])\d+(?:\.\d+)?/g) ?? [];
  assert.deepEqual(copyNumbers, [], 'LESSON_STEPS carries no number of its own');
  // The factor in scene 2 is the model's own.
  const factor = INTERVENTION_PROFILES[INTERVENTION_IDS.VASOCONSTRICTION].effects.systemicResistanceMmHgSPerMl.multiply;
  assert.ok(captionFor('constrict', solved).text.ja.includes(`${factor} 倍`));
});

test('explanation: the words keep the two comparisons apart', () => {
  // C is said to be a different circulation, and not B treated, wherever it is introduced.
  assert.match(LESSON_CONDITION_COPY.C.note.ja, /治療後ではない/);
  assert.match(LESSON_STEPS.other.heading.ja, /治療後ではない/);
  assert.match(LESSON_STEPS.other.text.ja, /はじめから別の循環/);
  // "Start" is A's word only; C's words never use it.
  assert.doesNotMatch(JSON.stringify(LESSON_CONDITION_COPY.C), /開始|start/i);
  // The conclusion compares at one heart rate, as the claims check holds.
  assert.match(LESSON_STEPS.conclusion.text.ja, /同じ心拍数/);
});

test('explanation: nothing it does not compute is said to have changed', () => {
  // Tissue perfusion, oxygen delivery, lactate and capillary refill are out of
  // the model. They may be named only where the lesson says it does not
  // compute them — the scope panel.
  const unmodelled = /灌流|酸素供給|乳酸|CRT|perfusion|oxygen delivery|lactate|capillary refill|臓器の血流|organ blood flow/i;
  const said = JSON.stringify({ LESSON_STEPS, LESSON_TERMS, LESSON_GUIDE, LESSON_ACTIONS, LESSON_NOTE });
  assert.doesNotMatch(said, unmodelled);
  assert.match(JSON.stringify(LESSON_SCOPE.excludes), unmodelled, 'and the scope says it is not computed');
  // No dose on any word.
  assert.doesNotMatch(said, /\d\s*(µg|mcg|mg|γ|mL\/h)/);
});

test('guide: one line for each state, and an interrupted explanation says what the reader now has', () => {
  const base = { solved, targetId: 'A', showOther: false };
  assert.equal(guideFor({ ...base, primaryId: 'A' }), LESSON_GUIDE.start);
  assert.match(LESSON_GUIDE.start.ja, /「血管を縮める作用を加える」を押して/, 'the first screen says what can be pressed');
  assert.equal(guideFor({ ...base, primaryId: null, targetId: 'B' }), LESSON_GUIDE.changing);
  assert.equal(guideFor({ ...base, primaryId: null, targetId: 'A' }), LESSON_GUIDE.releasing);
  assert.equal(guideFor({ ...base, primaryId: 'B', targetId: 'B', showOther: true }), LESSON_GUIDE.pair);

  const stoppedAlone = guideFor({ ...base, primaryId: 'B', targetId: 'B', stopped: true });
  assert.match(stoppedAlone.ja, /いま：血管を縮めた後（B）/);
  assert.match(stoppedAlone.ja, /開始時（A）/);
  // Beside C, the words are "side by side" — C is not a before.
  const stoppedPair = guideFor({ ...base, primaryId: 'B', targetId: 'B', showOther: true, stopped: true });
  assert.match(stoppedPair.ja, /別の循環（C）を並べています/);
  assert.doesNotMatch(stoppedPair.ja, /開始時/);
  // Half way through the walk, the reader is handed B (the walk finishes there).
  const stoppedWalking = guideFor({ ...base, primaryId: null, targetId: 'B', stopped: true });
  assert.match(stoppedWalking.ja, /いま：血管を縮めた後（B）/);
  // Every line the guide can say is among those the page sizes its place by.
  const sized = allGuides(solved).map((line) => line.ja);
  for (const line of [LESSON_GUIDE.start, LESSON_GUIDE.changing, LESSON_GUIDE.releasing, LESSON_GUIDE.pair, stoppedAlone, stoppedPair]) {
    assert.ok(sized.includes(line.ja), `"${line.ja}" is not among the lines the panel is sized for`);
  }
});
