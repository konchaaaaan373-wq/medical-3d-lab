import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * What the documents and the screen *say*, as distinct from what the model does.
 *
 * `cardiac-output-physiology.test.js` measures the model. Nothing there can
 * notice a sentence in the model card that the model does not support — and
 * that is the failure this file exists for: §14 asserted, for four days and
 * through a publication decision, that somewhere inside the declared range
 * raising the heart rate lowered cardiac output. It was reasoned from the
 * shape of the physics, never measured, and measuring it found no such point
 * (L-105).
 *
 * So the two kinds of check are kept apart on purpose. A numeric test that
 * goes red tells you the model changed. A test in this file that goes red
 * tells you a **claim** changed — or came back — and that somebody has to
 * decide whether the model still supports it.
 *
 * These are deliberately string-level. A claim is made of words, and the words
 * are what a reader is given.
 */

import { CONTROLS, MODEL_SCOPE } from '../src/data/cardiacOutput.js';
import { INTERVENTION_OPTIONS, INTERVENTION_SCOPE } from '../src/data/cardiacOutputInterventions.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const CARD = 'docs/model-cards/cardiac-output.md';
const MEASUREMENTS = JSON.parse(read('docs/model-evidence/cardiac-output-measurements.json'));

/** Numbers as the documents write them, so a comparison is about the value. */
const rounded = (value, digits) => Number(value).toFixed(digits);

test('claims: the retracted rate assertion cannot come back unnoticed', () => {
  const card = read(CARD);

  // The sentence itself, and the shapes it would most plausibly return in.
  // Written as patterns rather than one literal because the failure is the
  // *claim*, not the punctuation it arrives with.
  const retracted = [
    /there is a\s+condition inside the declared range where raising the rate lowers the output/is,
    /condition (?:inside|within) the (?:declared )?range where raising the rate lowers/is,
    /monotonically increasing in rate at (?:all of them|every condition)/is,
  ];
  for (const pattern of retracted) {
    assert.doesNotMatch(
      card,
      pattern,
      `${CARD} has gone back to a claim about the rate axis that no measurement supports. ` +
        'Either measure it (npm run sweep:cardiac-output -- --rate) or do not write it.'
    );
  }

  // Retraction is only half of it. The section has to still carry the measured
  // result, or a future editor deletes the awkward paragraph and the card goes
  // back to saying nothing at all about a control a reader will play with.
  assert.match(card, /2600 states solved/, `${CARD} no longer records how many states were swept`);
  assert.match(card, /2400 adjacent pairs in rate/, `${CARD} no longer records how many comparisons were made`);
  assert.match(card, /\+0\.023 L\/min/, `${CARD} no longer records the smallest change measured`);
  assert.match(card, /1×10⁻⁶ L\/min/, `${CARD} no longer records the tolerance a fall had to exceed`);
  assert.match(
    card,
    /finite grid/i,
    `${CARD} quotes a sweep without saying that a sweep is finite — which is the error being corrected`
  );
});

test('claims: the cause of the rate behaviour is offered as a hypothesis, not a finding', () => {
  const card = read(CARD);

  // The second thing the first correction got wrong. Fixed-fraction systole is
  // a plausible explanation and an untested one: establishing it needs the
  // time model changed and the two compared, which has not been done.
  assert.match(
    card,
    /hypothesis this repository\s+has not tested/is,
    `${CARD} should mark the fixed-fraction explanation as untested, because it is`
  );
  assert.match(
    card,
    /Whether a turn-over exists outside the declared\s+range is likewise \*\*unmeasured\*\*/is,
    `${CARD} should not assert a turn-over outside the range either — that is the same unmeasured shape`
  );
  assert.doesNotMatch(
    card,
    /the turn-over sits outside the range/i,
    `${CARD} asserts the location of a turn-over nobody has measured`
  );
});

test('claims: the numeric guard says it is a characterization test', () => {
  const physiology = read('tests/cardiac-output-physiology.test.js');

  // A guard that pins current behaviour has to say so, or the next person
  // reads a red run as "the model is now wrong about hearts" and reverts a
  // genuine improvement to the time model.
  assert.match(
    physiology,
    /characterization test/i,
    'the rate guard pins what this build does; it must not read as a rule of physiology'
  );
  assert.match(
    physiology,
    /sweep:cardiac-output/,
    'the guard should point at the tool that produced the numbers the card quotes'
  );
});


test('claims: the controls name model quantities, not clinical ones', () => {
  // A-1 and A-2 of the external review. The conserved quantity is the passive
  // compartments' stressed volumes plus the *whole* volume of three chambers —
  // a sum over two zero-pressure references — so calling the control "stressed
  // volume" invites a comparison with a measured stressed blood volume that
  // the quantity does not support. Likewise the resistance is this model's
  // lumped one, measured against this model's venous pressure, which is not a
  // central venous pressure.
  const filling = CONTROLS.find((control) => control.id === 'fillingVolumeMl');
  assert.match(filling.labelJa, /モデル内/, 'the filling control says the quantity is internal');
  assert.doesNotMatch(filling.label, /stressed volume/i, 'and does not present itself as stressed volume');

  const resistance = CONTROLS.find((control) => control.id === 'systemicResistanceMmHgSPerMl');
  assert.match(resistance.labelJa, /集中抵抗/, 'the resistance says it is the model’s lumped one');

  // The rate clause is on the control itself, not only in the model card: the
  // grid that has been swept contains no condition where output falls as the
  // rate rises, so this scene will not contradict a reader who concludes
  // "faster is more".
  const rate = CONTROLS.find((control) => control.id === 'heartRatePerMin');
  assert.match(rate.labelJa, /頻脈の評価ではありません/);

  const cautions = MODEL_SCOPE.cautions.map((entry) => entry.textJa).join('\n');
  assert.match(cautions, /基準の異なる 2 種類の容積/, 'the scope panel defines the conserved quantity');
  assert.match(cautions, /中心静脈圧ではありません/, 'and says what the venous pressure is not');
  assert.match(cautions, /出力まで固定することではありません/, 'holding an input does not hold the outputs');
  assert.match(
    cautions,
    /拍出の増加だけでは、循環状態の改善とは判断できません/,
    'a rise in output alone does not establish improvement — stated as a limit on inference, ' +
      'not as the reverse claim that it never is one'
  );
  assert.match(
    cautions,
    /駆出率の変化だけから、収縮力の変化は判断できません/,
    'a change in EF alone does not establish a change in contractility'
  );

  const excludes = MODEL_SCOPE.excludes.map((entry) => entry.textJa).join('\n');
  assert.match(excludes, /肺動脈楔入圧/, 'the pulmonary venous pressure is not a wedge pressure');
});

test('claims: the drug carries its assumption in its own name', () => {
  // C-8. One study in one population reporting no change in rate is not a
  // property of the drug, and the labelling describes both cases. The rate is
  // held so the two actions can be read apart — that is this scene's
  // condition, and the name says so rather than leaving it to a panel.
  const dobutamine = INTERVENTION_OPTIONS.find((option) => /dobutamine/i.test(option.label));
  assert.match(dobutamine.labelJa, /模式例/);
  assert.match(dobutamine.labelJa, /心拍数は固定/);

  const scope = INTERVENTION_SCOPE.map((entry) => entry.textJa).join('\n');
  assert.match(
    scope,
    /複合変化の模式例であって、2 つの作用を分離したものではありません/,
    'the drug is a compound change, not two actions read apart — nothing varies one and holds the other'
  );
  assert.match(scope, /このシーンの条件です/, 'the held rate is the scene’s condition, not the drug’s property');
  assert.match(scope, /両方/, 'the labelling describes both a marked rate rise and none');
  assert.match(scope, /1 つの集団の 1 つの研究は一般則ではありません/);
  assert.match(scope, /用量反応から導いたものではなく/, 'the effect sizes say where they came from');

  // C-10. The reason noradrenaline is absent is not "there is no venous
  // compartment" — there is one, with a compliance. What is missing is a way
  // for a drug to act on it.
  const card = read(CARD);
  assert.match(card, /the reason is not that there is no\s+venous compartment/is);
  assert.doesNotMatch(card, /a model\s+with no venous capacitance/is);
});


test('claims: the documents quote the measurements that are on file', () => {
  // A guard that only pins a document's own strings cannot notice that the
  // strings stopped being true. The card carried "85 mL/s" and "1.4 mmHg" long
  // after neither was reproducible; both passed every string check, because
  // both were exactly what the card said.
  //
  // So the figures are measured into
  // `docs/model-evidence/cardiac-output-measurements.json` by the scripts that
  // produce them, and this asks the documents to agree with that file.
  const { rateWalk, sweep, fixtureImpact } = MEASUREMENTS;
  const documents = {
    [CARD]: read(CARD),
    'docs/beta-publication/cardiac-output.md': read('docs/beta-publication/cardiac-output.md'),
    'docs/model-cards/heart-failure.md': read('docs/model-cards/heart-failure.md'),
    // The publication decision states the same change, in a comment, and is
    // where the retracted figure survived longest: the three documents were
    // corrected and `release.js` still said "up to 1.4 mmHg ... nothing else
    // moved" (L-108). A claim in a comment is a claim.
    'src/catalog/release.js': read('src/catalog/release.js'),
  };

  // The rate walk, in the card that quotes it.
  assert.ok(documents[CARD].includes(`${rateWalk.states} states solved`), 'the state count');
  assert.ok(documents[CARD].includes(`${rateWalk.comparisons} adjacent pairs in rate`), 'the comparison count');
  assert.ok(
    documents[CARD].includes(`+${rounded(rateWalk.smallestChange.deltaLMin, 3)} L/min`),
    `the smallest change, ${rounded(rateWalk.smallestChange.deltaLMin, 3)}`
  );
  assert.equal(rateWalk.fallsFound, 0, 'the record behind "no fall was found"');
  assert.equal(rateWalk.nonValid, 0, 'a record with refused states is not a record');

  // The balances.
  assert.ok(
    documents[CARD].includes(`**${rounded(sweep.largestWindowBalanceMl, 4)} mL**`),
    `the worst window residual, ${rounded(sweep.largestWindowBalanceMl, 4)}`
  );

  // The fixture impact, in all three documents that state it.
  //
  // First: what it was compared *against*. The first recording wrote the argv
  // path, which was a scratch directory outside the repository — a provenance
  // field naming a file no reader can open records nothing, and reads as
  // though it does (L-107). A baseline is either the committed fixture or a
  // repository path with the revision it was taken at.
  assert.ok(
    fixtureImpact.baseline === 'the committed fixture' ||
      /^tests\/fixtures\/[\w.-]+\.json .*\b[0-9a-f]{7,40}\b/.test(fixtureImpact.baseline),
    `the baseline names something a reader can open, not ${JSON.stringify(fixtureImpact.baseline)}`
  );

  const moved = fixtureImpact.fields['state.endDiastolicPressureMmHg'];
  assert.ok(moved, 'the fixture impact is on file');
  assert.equal(Object.keys(fixtureImpact.fields).length, 1, 'exactly one field moved');
  const largest = rounded(moved.largestAbsoluteDelta, 3);
  for (const [path, text] of Object.entries(documents)) {
    assert.ok(text.includes(`${largest} mmHg`), `${path} quotes the largest change (${largest} mmHg)`);
    assert.ok(
      text.includes(`${moved.changed} of 30`) || text.includes(`all ${moved.changed}`),
      `${path} says how many cases moved (${moved.changed})`
    );
    assert.ok(
      /one higher|1 higher|one rises|one case rises/i.test(text),
      `${path} says that not every case fell — ${moved.up} rose`
    );
  }

  // And the retracted figures are gone as **claims**. Quoting one inside a
  // retraction is how the correction stays legible, so text between quotation
  // marks — straight or curly — is removed before asking. A document may say a
  // figure was wrong; it may not state it.
  for (const [path, text] of Object.entries(documents)) {
    const withoutQuotations = text.replace(/[\u201c"][^\u201d"]*[\u201d"]/g, '');
    assert.doesNotMatch(withoutQuotations, /up to 1\.4 mmHg/, `${path} still states 1.4 mmHg as a figure`);
    assert.doesNotMatch(withoutQuotations, /85 mL\/s/, `${path} still states 85 mL\/s as a figure`);
  }
});


test('claims: the superseded review request says so at the top', () => {
  // It was written as "paste this into a review" and half of it is now known
  // to be wrong — the LVEDP definition, the 1,820-condition figure, the
  // causal assertions, the control names. Keeping it is right; leaving it
  // readable as current is not (R152-05B).
  const history = read('docs/reviews/cardiac-output-external-review-request.md');
  const header = history.slice(0, 2000);
  assert.match(header, /現行ではありません/, 'the title says it is not current');
  assert.match(header, /監査履歴/, 'and what it is instead');
  assert.match(header, /be1d6e15/, 'the commit it describes');
  assert.match(header, /2026-09-22/, 'when it was written');
  assert.match(header, /後継/, 'and what replaced it');
  // The specific retractions, so trimming the header to a one-liner fails.
  for (const retraction of [/1,820 条件/, /固定比率の収縮期が原因/, /拡張期だけが大きく上がる/]) {
    assert.match(header, retraction, `the header names what in it is wrong: ${retraction}`);
  }
});
