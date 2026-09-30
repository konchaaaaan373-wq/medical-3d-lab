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
  captionFor,
  guideFor,
  lessonValues,
  outputDirection,
  presentationAt,
  readoutFor,
  stepIndexAt,
  tagWords,
} from '../src/scenes/cardiovascular/scenes/cardiacOutput/lessonStoryboard.js';
import {
  LESSON_ACTIONS,
  LESSON_CONDITION_COPY,
  LESSON_GUIDE,
  LESSON_SCOPE,
  LESSON_STEPS,
  LESSON_TAGS,
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

test('the detailed experiment’s menu does not gain the vasopressor', () => {
  // A decision about that screen, not made here (F-237).
  assert.ok(!INTERVENTION_LIST.includes(INTERVENTION_IDS.VASOCONSTRICTION));
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
  assert.equal(session.reference, null);
  assert.deepEqual(session.primary.input, lessonInput('A'));
});

test('session: the reader’s press walks every rung to B, and "before" is A', () => {
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
    }
  }
  assert.equal(session.primaryId, 'B');
  assert.ok(elapsed <= MANUAL_WALK_SECONDS + 0.1, `the walk took ${elapsed.toFixed(2)} s`);
  assert.equal(seen.size, session.lastRung + 1, 'no rung is skipped at 60 frames a second');
  assert.equal(session.reference, session.ladder[0], 'B alone is compared with A');
  assert.deepEqual(session.primary.input, lessonInput('B'));
});

test('session: with C beside it the comparison is B ↔ C, and A’s marks go', () => {
  const session = new LessonSession();
  session.setPrimary('B', { immediate: true });
  session.setShowOther(true);
  assert.equal(session.reference, null, 'three things are never compared at once');
  const readout = readoutFor(session);
  assert.equal(readout.primary.id, 'B');
  assert.equal(readout.primary.reference, null);
  assert.equal(readout.other.id, 'C');
  assert.equal(readout.other.map, lessonValues(solved).mapC);
  assert.equal(readout.other.co, lessonValues(solved).coC);

  session.reset();
  assert.equal(session.primaryId, 'A');
  assert.equal(session.showOther, false);
});

test('session: the read-out for B alone carries A as "before", with the solved directions', () => {
  const session = new LessonSession();
  session.setPrimary('B', { immediate: true });
  const { primary } = readoutFor(session);
  const values = lessonValues(solved);
  assert.equal(primary.map, values.mapB);
  assert.equal(primary.co, values.coB);
  assert.equal(primary.reference.id, 'A');
  assert.equal(primary.reference.map, values.mapA);
  assert.equal(primary.reference.co, values.coA);
  assert.equal(primary.reference.mapDirection, 'up');
  assert.equal(primary.reference.coDirection, outputDirection(solved));
});

// ---------------------------------------------------------------------------
// The explanation
// ---------------------------------------------------------------------------

test('explanation: five scenes in the order the lesson is told, contiguous', () => {
  assert.deepEqual(
    LESSON_TIMELINE.map((scene) => scene.id),
    ['start', 'constrict', 'result', 'other', 'conclusion']
  );
  let at = 0;
  for (const scene of LESSON_TIMELINE) {
    assert.equal(scene.at, at);
    assert.ok(scene.duration >= 7, `${scene.id} leaves time to read (${scene.duration} s)`);
    at = scene.until;
  }
  assert.equal(LESSON_DURATION, at);
  assert.ok(LESSON_DURATION <= 60, 'a short explanation');
});

test('explanation: A first, the change inside scene 2, B after; C only in the last two; tags two at most', () => {
  const session = new LessonSession();
  const last = session.lastRung;
  for (let t = 0; t < LESSON_DURATION; t += 0.25) {
    const shown = presentationAt(t, last);
    assert.ok(shown.tags.length <= 2, `${shown.step.id}: ${shown.tags.length} tags at once`);
    if (shown.step.id === 'start') assert.equal(shown.rung, 0);
    if (['result', 'other', 'conclusion'].includes(shown.step.id)) assert.equal(shown.rung, last);
    assert.equal(shown.showOther, ['other', 'conclusion'].includes(shown.step.id), `C at ${t}`);
    // Point first: the change never starts the moment its scene does.
    if (shown.step.id === 'constrict' && shown.into < 1) assert.equal(shown.rung, 0);
  }
  // Seeking lands on the same condition every time.
  const constrict = LESSON_TIMELINE[1];
  assert.equal(presentationAt(constrict.until - 0.01, last).rung, last);
  assert.equal(stepIndexAt(LESSON_DURATION + 5), LESSON_TIMELINE.length - 1);
});

/**
 * Counting words are not figures: 「1回」「1分間」「1本」「1か所」「2つ」 say "one
 * beat", "a minute", "one vessel", "one place", "both". Everything else with a
 * digit in it has to be a solved figure.
 */
const COUNTING_WORDS = /[12](?:回|分間|本|か所|つ)/g;

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
});

test('explanation: the words keep the two comparisons apart', () => {
  // C is said to be a different circulation, and not B treated.
  assert.match(LESSON_CONDITION_COPY.C.name.ja, /治療後ではない/);
  assert.match(LESSON_STEPS.other.text.ja, /治療後でも、薬の別の作用でもありません/);
  // B is said to be A with the intervention.
  assert.match(LESSON_CONDITION_COPY.B.name.ja, /^A＋/);
  // "Before" is A's word only; C's words never use it.
  assert.doesNotMatch(JSON.stringify(LESSON_CONDITION_COPY.C), /介入前|before/i);
  // The intervention is named as the vasoconstrictor action, not as a drug's whole effect.
  assert.match(LESSON_ACTIONS.constrict.ja, /血管収縮作用/);
  assert.doesNotMatch(LESSON_ACTIONS.constrict.ja, /ノルアドレナリン/);
});

test('explanation: nothing it does not compute is said to have changed', () => {
  // Tissue perfusion, oxygen delivery, lactate and capillary refill are out of
  // the model. They may be named only where the lesson says it does not
  // compute them — the scope panel and the closing note.
  const unmodelled = /灌流|酸素供給|乳酸|CRT|perfusion|oxygen delivery|lactate|capillary refill/i;
  const said = JSON.stringify({ LESSON_STEPS, LESSON_TAGS, LESSON_GUIDE, LESSON_ACTIONS });
  const stripped = said.replace(JSON.stringify(LESSON_STEPS.conclusion.note).slice(1, -1), '');
  assert.doesNotMatch(stripped, unmodelled);
  assert.match(JSON.stringify(LESSON_SCOPE.excludes), unmodelled, 'and the scope says it is not computed');
  // No dose on any word.
  assert.doesNotMatch(said, /\d\s*(µg|mcg|mg|γ|mL\/h)/);
});

test('guide: one line for each state, and an interrupted explanation says what the reader now has', () => {
  const base = { solved, targetId: 'A', showOther: false };
  assert.equal(guideFor({ ...base, mode: 'idle', primaryId: 'A' }), LESSON_GUIDE.idle);
  assert.equal(guideFor({ ...base, mode: 'manual', primaryId: 'A' }), LESSON_GUIDE.manualStart);
  assert.equal(guideFor({ ...base, mode: 'manual', primaryId: null, targetId: 'B' }), LESSON_GUIDE.changing);
  assert.equal(guideFor({ ...base, mode: 'manual', primaryId: 'B', showOther: true }), LESSON_GUIDE.pairBC);
  assert.equal(guideFor({ ...base, mode: 'manual', primaryId: 'A', showOther: true }), LESSON_GUIDE.pairAC);

  const stoppedAlone = guideFor({ ...base, mode: 'manual', primaryId: 'B', stopped: true });
  assert.match(stoppedAlone.ja, /いま：B（A＋血管収縮作用）/);
  assert.match(stoppedAlone.ja, /比較元：介入前の A/);
  // Beside C, the words are "side by side", never "compared with" — C is not
  // a before.
  const stoppedPair = guideFor({ ...base, mode: 'manual', primaryId: 'B', showOther: true, stopped: true });
  assert.match(stoppedPair.ja, /別の循環 C を並べています/);
  assert.doesNotMatch(stoppedPair.ja, /比較元/);
  // Half way through the walk, the reader is handed B (the walk finishes there).
  const stoppedWalking = guideFor({ ...base, mode: 'manual', primaryId: null, targetId: 'B', stopped: true });
  assert.match(stoppedWalking.ja, /いま：B/);
});

test('tags: the change in one beat’s output is said as the solver has it, and as the caption says it', () => {
  const direction = directionOf(metrics('A').strokeVolumeMl, metrics('B').strokeVolumeMl, 1);
  const expected = { down: LESSON_TAGS.ejectedLess, up: LESSON_TAGS.ejectedMore, same: LESSON_TAGS.ejectedSame }[direction];
  assert.equal(tagWords('ejectedChange', solved), expected);
  // One direction on one screen: the tag beside the arch and the caption under
  // the model are read from the same comparison at the same precision.
  const caption = { down: 'ejectedLess', up: 'ejectedMore', same: 'ejectedSame' }[outputDirection(solved)];
  assert.equal(tagWords('ejectedChange', solved), LESSON_TAGS[caption]);
  // And where a beat's volume and a minute's output would round differently —
  // one mL less per beat, the same 3.5 L/min — the tag follows the caption.
  const near = {
    A: { metrics: { strokeVolumeMl: 50, cardiacOutputLMin: 3.5 } },
    B: { metrics: { strokeVolumeMl: 49, cardiacOutputLMin: 3.45 } },
  };
  assert.equal(outputDirection(near), 'same');
  assert.equal(tagWords('ejectedChange', near), LESSON_TAGS.ejectedSame);
});
