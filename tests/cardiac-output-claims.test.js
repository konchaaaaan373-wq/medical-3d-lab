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
