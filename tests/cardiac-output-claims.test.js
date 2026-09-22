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
 * (L-95).
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
  assert.match(cautions, /「改善」ではありません/, 'a larger output is not an improvement');
  assert.match(cautions, /駆出率の変化は収縮力の変化ではなく/, 'EF is not contractility and not a diagnosis');

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
  assert.match(scope, /薬剤の性質ではありません/, 'the held rate is the scene’s condition, not the drug’s property');
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
