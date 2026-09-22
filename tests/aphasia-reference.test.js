import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { APHASIA_MIMICS, APHASIA_REFERENCE, FEATURE_TENDENCY } from '../src/data/aphasiaReference.js';

/**
 * The reference layer, and the wall between it and the model.
 *
 * This file exists because the thing it guards is a regression that already
 * happened once: the classical syndromes were computed, printed as the read-out's
 * most emphasised row, and accompanied by a verdict of "not aphasia". They are
 * reference reading now, and the only way to keep them that way is to make it
 * fail loudly if anything starts computing them again.
 */

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('reference: nothing in the model layer can reach the reference layer', () => {
  for (const name of readdirSync(new URL('../src/models/', import.meta.url))) {
    if (!name.endsWith('.js')) continue;
    const source = read(`src/models/${name}`);
    assert.ok(
      !/import[\s\S]{0,200}from\s+'[^']*aphasiaReference/.test(source),
      `src/models/${name} does not import the reference layer`
    );
  }
});

test('reference: the reference layer imports nothing and computes nothing', () => {
  const source = read('src/data/aphasiaReference.js');
  assert.ok(!/^import /m.test(source), 'it imports nothing at all');
  // One local helper builds the rows; nothing else in the file is a function,
  // so there is no classifier here to be called by mistake.
  const exported = [...source.matchAll(/^export (const|function|class)\s+(\w+)/gm)].map((match) => [match[1], match[2]]);
  for (const [kind, name] of exported) {
    assert.equal(kind, 'const', `${name} is data, not a function`);
  }
  assert.deepEqual(
    exported.map(([, name]) => name).sort(),
    ['APHASIA_MIMICS', 'APHASIA_REFERENCE', 'FEATURE_TENDENCY']
  );
});

test('reference: every syndrome says what this model cannot evaluate about it', () => {
  assert.ok(APHASIA_REFERENCE.length >= 8, 'the classical set is here');
  for (const entry of [...APHASIA_REFERENCE, ...APHASIA_MIMICS]) {
    assert.ok(entry.id && entry.name && entry.nameJa, `${entry.id} is named in both languages`);
    assert.ok(entry.gistJa, `${entry.id} has a one-line gist`);
    assert.ok(entry.notEvaluatedHere.length > 0, `${entry.id} says what is not evaluated here`);
    assert.equal(
      entry.notEvaluatedHere.length,
      entry.notEvaluatedHereJa.length,
      `${entry.id} says the same things in both languages`
    );
  }
});

test('reference: the cells describe tendencies, not a table of necessary conditions', () => {
  // A fixed symbol per feature would make this a checklist, and these
  // syndromes are not that: what is described is relative sparing, features
  // that vary with lesion and time, and findings that depend on the stimulus.
  const tendencies = new Set(Object.values(FEATURE_TENDENCY));
  let variable = 0;
  let spared = 0;
  for (const entry of APHASIA_REFERENCE) {
    assert.ok(entry.features.length >= 3, `${entry.id} describes more than a single feature`);
    for (const feature of entry.features) {
      assert.ok(tendencies.has(feature.tendency), `${entry.id}/${feature.id} has a declared tendency`);
      if (feature.tendency === FEATURE_TENDENCY.VARIABLE) variable += 1;
      if (feature.tendency === FEATURE_TENDENCY.RELATIVELY_SPARED) spared += 1;
    }
  }
  // Both of the non-binary tendencies are actually used. A reference table
  // where everything is "characteristically affected" or absent would be the
  // checklist this is not supposed to be.
  assert.ok(variable >= 5, `variability is recorded where it exists (${variable})`);
  assert.ok(spared >= 5, `relative sparing is recorded as such (${spared})`);

  // And not everything is hedged into uselessness either.
  const characteristic = APHASIA_REFERENCE
    .flatMap((entry) => entry.features)
    .filter((feature) => feature.tendency === FEATURE_TENDENCY.CHARACTERISTIC);
  assert.ok(characteristic.length >= 10, 'the defining features are still stated as defining');
});

test('reference: the three that are not aphasia say why, and say what is untestable here', () => {
  assert.deepEqual(
    APHASIA_MIMICS.map((entry) => entry.id).sort(),
    ['alexia-without-agraphia', 'apraxia-of-speech', 'pure-word-deafness']
  );
  for (const entry of APHASIA_MIMICS) {
    assert.ok(entry.whyNotAphasiaJa, `${entry.id} says why it is not one`);
  }
  // Each of the three names the specific thing this model lacks, because each
  // was a verdict the old classifier produced from routes alone.
  const deafness = APHASIA_MIMICS.find((entry) => entry.id === 'pure-word-deafness');
  assert.ok(deafness.notEvaluatedHereJa.some((item) => /皮質聾/.test(item)));
  const apraxia = APHASIA_MIMICS.find((entry) => entry.id === 'apraxia-of-speech');
  assert.ok(apraxia.notEvaluatedHereJa.some((item) => /構音の質/.test(item)));
  const alexia = APHASIA_MIMICS.find((entry) => entry.id === 'alexia-without-agraphia');
  assert.ok(alexia.notEvaluatedHereJa.some((item) => /膨大部/.test(item)));
});

test('reference: no scene or app file imports it as a source of answers', () => {
  // It may be displayed. What it may not do is feed a computation, so nothing
  // outside a component or a test may import it at all until a panel is built
  // for it — and when one is, this test is where that decision gets recorded.
  const roots = ['src/models', 'src/scenes/nervous/scenes/higherBrainFunction', 'src/app'];
  for (const root of roots) {
    for (const name of readdirSync(new URL(`../${root}/`, import.meta.url))) {
      if (!name.endsWith('.js')) continue;
      // A prose reference is fine and useful — the evidence registry points at
      // it to say where the names went. What is forbidden is an import.
      assert.ok(
        !/from\s+'[^']*aphasiaReference/.test(read(`${root}/${name}`)),
        `${root}/${name} does not import the reference layer yet (see docs/follow-ups.md F-189)`
      );
    }
  }
});
