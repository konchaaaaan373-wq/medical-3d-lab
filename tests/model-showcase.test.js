import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { MODEL_SHOWCASE, SHOWCASE_SYSTEM_LABELS, showcaseFor } from '../src/data/modelShowcase.js';
import { SCENES, sceneById } from '../src/catalog/index.js';
import { PUBLIC_MANIFEST } from '../src/catalog/publicManifest.js';
import { isPathologyModelScene } from '../src/catalog/pathologyModels.js';
import { CONTROL_DOMAIN, referenceInput, solveCardiacOutput } from '../src/models/cardiacOutput.js';

const publicPath = (path) => fileURLToPath(new URL(`../public/${path}`, import.meta.url));

test('showcase: every entry is a disease model the catalogue has', () => {
  for (const id of Object.keys(MODEL_SHOWCASE)) {
    const scene = sceneById(id);
    assert.ok(scene, `${id} is not in the catalogue`);
    assert.ok(isPathologyModelScene(scene), `${id} is not a disease model — cards are for those`);
  }
});

test('showcase: every published disease model has a picture of itself and a question', () => {
  // The released product's cards are photographs of the model, never the
  // quiet fallback: a published model with no poster is `npm run posters`
  // not having been run.
  const published = PUBLIC_MANIFEST.models.map((model) => sceneById(model.sceneId)).filter(isPathologyModelScene);
  assert.ok(published.length >= 1);
  for (const scene of published) {
    const card = showcaseFor(scene);
    assert.ok(card.question?.ja && card.question?.en, `${scene.id}: no question`);
    assert.ok(card.poster, `${scene.id}: no poster named in modelShowcase.js`);
    assert.ok(existsSync(publicPath(card.poster)), `${scene.id}: ${card.poster} missing — run \`npm run posters\``);
    assert.ok(card.system, `${scene.id}: no system label for "${scene.system}"`);
  }
});

test('showcase: a poster named for any model exists', () => {
  for (const [id, entry] of Object.entries(MODEL_SHOWCASE)) {
    if (!entry.poster) continue;
    assert.ok(existsSync(publicPath(entry.poster)), `${id}: ${entry.poster} missing — run \`npm run posters\``);
  }
});

test('showcase: cardiac output — a higher pressure is not always more flow, in this model', () => {
  // The card asks "when the pressure rises, does the heart pump more?", and
  // the model has to be the thing that answers "not necessarily". Solved here
  // rather than asserted in prose: if a calibration change ever made resistance
  // raise the output, the card would be making a claim the model contradicts.
  const reference = referenceInput();
  const base = solveCardiacOutput(reference).metrics;
  const tighter = solveCardiacOutput({
    ...reference,
    systemicResistanceMmHgSPerMl: CONTROL_DOMAIN.systemicResistanceMmHgSPerMl.max,
  }).metrics;
  assert.ok(tighter.meanArterialPressureMmHg > base.meanArterialPressureMmHg, 'resistance up raises MAP');
  assert.ok(tighter.cardiacOutputLMin < base.cardiacOutputLMin, 'and lowers the output');

  // And the other half of "not necessarily": filling raises both.
  const fuller = solveCardiacOutput({ ...reference, fillingVolumeMl: CONTROL_DOMAIN.fillingVolumeMl.max }).metrics;
  assert.ok(fuller.meanArterialPressureMmHg > base.meanArterialPressureMmHg);
  assert.ok(fuller.cardiacOutputLMin > base.cardiacOutputLMin);
});

test('showcase: a model without a curated question falls back to its own story title, never an invented one', () => {
  const withStory = SCENES.find((scene) => isPathologyModelScene(scene) && scene.storyTitleJa && !MODEL_SHOWCASE[scene.id]);
  assert.ok(withStory);
  assert.equal(showcaseFor(withStory).question.ja, withStory.storyTitleJa);
  const withoutStory = SCENES.find((scene) => isPathologyModelScene(scene) && !scene.storyTitleJa && !MODEL_SHOWCASE[scene.id]);
  assert.ok(withoutStory);
  assert.equal(showcaseFor(withoutStory).question, null);
  assert.equal(showcaseFor(withoutStory).poster, null);
});

test('showcase: every system a disease model sits in has a card label', () => {
  const systems = new Set(SCENES.filter(isPathologyModelScene).map((scene) => scene.system));
  for (const system of systems) assert.ok(SHOWCASE_SYSTEM_LABELS[system], `no card label for ${system}`);
});
