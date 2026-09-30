import test from 'node:test';
import assert from 'node:assert/strict';

import { AUDIENCES, changeRuleProblems, explainChange } from '../src/app/changeExplanation.js';
import { currentAudience, onAudienceChange, setAudience } from '../src/app/audience.js';
import { CARDIAC_OUTPUT_EXPLANATIONS } from '../src/data/cardiacOutputExplanations.js';
import { CONTROL_EDITOR } from '../src/data/cardiacOutput.js';
import { CONTROL_DOMAIN, CONTROL_IDS, referenceInput, solveCardiacOutput } from '../src/models/cardiacOutput.js';
import { changeSignature, describeEffect } from '../src/scenes/cardiovascular/scenes/cardiacOutput/changeSummary.js';

/**
 * 「今、何が起きた？」 is a claim about the model, so it is tested against the
 * model: every input, both directions, from one press to the edge of its
 * range, solved, and the sentence (if any) checked against the figures the
 * reader is shown beside it.
 */

const RESULT_KEYS = ['edv', 'esv', 'sv', 'co', 'map'];
const reference = referenceInput();
const start = solveCardiacOutput(reference).metrics;

/** The signature after `presses` of one input in one direction — as the scene builds it. */
function afterPresses(id, direction, presses) {
  const { min, max } = CONTROL_DOMAIN[id];
  const nudge = CONTROL_EDITOR[id].nudge;
  const raw = reference[id] + (direction === 'up' ? 1 : -1) * nudge * presses;
  const value = Number(Math.min(max, Math.max(min, raw)).toFixed(4));
  const shown = { ...reference, [id]: value };
  const solved = solveCardiacOutput(shown);
  if (!solved.metrics) return null;
  return { value, now: solved.metrics, signature: changeSignature({ baseline: reference, shown, before: start, now: solved.metrics }) };
}

test('explanations: the rule set is well formed, and every rule speaks to both readers', () => {
  assert.deepEqual(changeRuleProblems(CARDIAC_OUTPUT_EXPLANATIONS, { inputs: CONTROL_IDS, results: RESULT_KEYS }), []);
  for (const rule of CARDIAC_OUTPUT_EXPLANATIONS) {
    for (const audience of AUDIENCES) assert.ok(rule[audience], `${rule.id}: no ${audience} copy`);
  }
});

test('explanations: every input, each way, is explained once the change shows', () => {
  // From three presses on, every single-input change reaches the read-out and
  // must have its sentence. (One press can be too small for the figures the
  // rule talks about; then saying nothing is right, and is checked below.)
  for (const id of CONTROL_IDS) {
    for (const direction of ['up', 'down']) {
      for (const presses of [3, 6, 12]) {
        const step = afterPresses(id, direction, presses);
        if (!step) continue;
        const found = explainChange(step.signature, CARDIAC_OUTPUT_EXPLANATIONS);
        assert.ok(found, `${id} ${direction} ×${presses}: no explanation for ${JSON.stringify(step.signature.results)}`);
        assert.ok(found.id.startsWith(
          { systemicResistanceMmHgSPerMl: 'resistance', contractilityEesMmHgPerMl: 'contractility', fillingVolumeMl: 'filling', heartRatePerMin: 'rate' }[id]
        ), `${id} ${direction}: explained by "${found.id}"`);
      }
    }
  }
});

test('explanations: no sentence ever contradicts the figures shown beside it', () => {
  // The words each rule uses about a result, and the displayed direction(s)
  // those words are true of. A rule that names a result must hold it in `when`.
  const SAYS = {
    'resistance-up': { map: ['up'], sv: ['down'], co: ['down', 'same'] },
    'resistance-down': { map: ['down'], co: ['up', 'same'] },
    'contractility-down': { esv: ['up'], sv: ['down'], map: ['down'] },
    'contractility-up': { esv: ['down'], map: ['up'], co: ['up', 'same'] },
    'filling-up': { edv: ['up'], sv: ['up'], map: ['up'] },
    'filling-down': { edv: ['down'], sv: ['down'], map: ['down'] },
    'rate-up': { sv: ['down'], co: ['up'], map: ['up'] },
    'rate-down': { sv: ['up'], co: ['down'], map: ['down'] },
  };
  assert.deepEqual(Object.keys(SAYS).sort(), CARDIAC_OUTPUT_EXPLANATIONS.map((rule) => rule.id).sort());
  // Structurally first: each rule holds, in \`when\`, every result its words
  // name, and allows no direction the words are not true of. The state sweep
  // below cannot see a missing condition on a model this monotone — a rule
  // with \`results: {}\` passed it (found by mutation, 2026-09-30).
  for (const rule of CARDIAC_OUTPUT_EXPLANATIONS) {
    for (const [key, allowed] of Object.entries(SAYS[rule.id])) {
      const declared = rule.when.results?.[key];
      assert.ok(declared, `${rule.id}: its words name ${key}, but \`when\` does not hold it`);
      for (const direction of [declared].flat()) {
        assert.ok(allowed.includes(direction), `${rule.id}: \`when\` allows ${key} ${direction}, which its words are not true of`);
      }
    }
  }
  let checked = 0;
  for (const id of CONTROL_IDS) {
    for (const direction of ['up', 'down']) {
      for (let presses = 1; presses <= 30; presses += 1) {
        const step = afterPresses(id, direction, presses);
        if (!step) continue;
        const found = explainChange(step.signature, CARDIAC_OUTPUT_EXPLANATIONS);
        if (!found) continue;
        for (const [key, allowed] of Object.entries(SAYS[found.id])) {
          assert.ok(
            allowed.includes(step.signature.results[key]),
            `${id} ${direction} ×${presses} (${step.value}): "${found.id}" says ${key} ${allowed.join('/')}, the read-out shows ${step.signature.results[key]}`
          );
        }
        checked += 1;
      }
    }
  }
  assert.ok(checked > 100, `only ${checked} states were checked`);
});

test('explanations: the signature rounds exactly as the chain beside it does', () => {
  // The rules are only as honest as the directions they are matched on. A
  // result is \`same\` exactly when the chain (\`describeEffect\`, what the reader
  // sees) has no line for it — so a sentence cannot see a change the figures
  // do not show, or miss one they do.
  const LINE = { edv: 'edv', esv: 'esv', sv: 'sv', co: 'co', map: 'map' };
  for (const id of CONTROL_IDS) {
    for (const direction of ['up', 'down']) {
      for (let presses = 1; presses <= 30; presses += 1) {
        const step = afterPresses(id, direction, presses);
        if (!step) continue;
        const shown = { ...reference, [id]: step.value };
        const chain = describeEffect({ baseline: reference, shown, before: start, now: step.now });
        const lines = new Set([...chain.heart, ...chain.results].map((line) => line.id));
        for (const [key, lineId] of Object.entries(LINE)) {
          assert.equal(
            step.signature.results[key] !== 'same',
            lines.has(lineId),
            `${id} ${direction} ×${presses}: signature says ${key} ${step.signature.results[key]}, the chain ${lines.has(lineId) ? 'shows' : 'does not show'} it`
          );
        }
      }
    }
  }
});

test('explanations: two inputs at once, or none, get no sentence rather than a wrong one', () => {
  assert.equal(explainChange(null, CARDIAC_OUTPUT_EXPLANATIONS), null);
  const shown = { ...reference, contractilityEesMmHgPerMl: 3.4, systemicResistanceMmHgSPerMl: 0.9 };
  const now = solveCardiacOutput(shown).metrics;
  const signature = changeSignature({ baseline: reference, shown, before: start, now });
  assert.equal(Object.keys(signature.moved).length, 2);
  assert.equal(explainChange(signature, CARDIAC_OUTPUT_EXPLANATIONS), null);
});

test('explanations: Medical and Patient are one matched rule, two voices', () => {
  const step = afterPresses('systemicResistanceMmHgSPerMl', 'up', 8);
  const medical = explainChange(step.signature, CARDIAC_OUTPUT_EXPLANATIONS, 'medical');
  const patient = explainChange(step.signature, CARDIAC_OUTPUT_EXPLANATIONS, 'patient');
  assert.equal(medical.id, patient.id);
  assert.equal(patient.audience, 'patient');
  assert.notEqual(medical.ja, patient.ja);
  assert.match(medical.ja, /後負荷/);
  assert.doesNotMatch(patient.ja, /後負荷|SVR|拍出量/, 'the patient voice does not use the clinical terms');

  // A rule with no patient copy falls back to the medical words, and says so.
  const [first] = CARDIAC_OUTPUT_EXPLANATIONS;
  const medicalOnly = [{ ...first, patient: undefined }];
  const fallback = explainChange(step.signature, medicalOnly, 'patient');
  assert.equal(fallback.audience, 'medical');
});

test('audience: follows the purpose, tells its listeners once, and defaults to medical', () => {
  assert.equal(currentAudience(), 'medical');
  const heard = [];
  const stop = onAudienceChange((audience) => heard.push(audience));
  setAudience('patient');
  setAudience('patient');
  setAudience('anything else');
  stop();
  setAudience('patient');
  assert.deepEqual(heard, ['patient', 'medical']);
  setAudience('medical');
});
