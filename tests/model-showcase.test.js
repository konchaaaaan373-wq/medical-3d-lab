import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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

test('the quiet motif stays inside its frame for every model that could be shown without a photograph', async () => {
  // The hash is unsigned; read with `>>` its top bit made every remainder
  // negative and amyloid-beta's three points were drawn off the left edge.
  const { motifLanes } = await import('../src/components/ModelCard.js');
  const { SCENES } = await import('../src/catalog/index.js');
  const seeds = SCENES.map((scene) => scene.id);
  assert.ok(seeds.includes('amyloid-beta'), 'the case this was found on is still a scene');
  for (const seed of seeds) {
    for (const lane of motifLanes(seed)) {
      assert.ok(lane.cx >= 40 && lane.cx < 190, `${seed}: point at ${lane.cx}`);
      assert.ok(lane.bend >= -6 && lane.bend <= 6, `${seed}: bend ${lane.bend}`);
    }
  }
});

test('a model card says, in words, when the model is not production — no pill, but never silent', async () => {
  // The rebrand took the badges off the cards; it also took the maturity, so
  // an alpha model was listed exactly like a finished one.
  const { createModelCard } = await import('../src/components/ModelCard.js');
  const { sceneById } = await import('../src/catalog/index.js');
  const { installFakeDocument, findByClass } = await import('./helpers/fake-dom.js');
  const restore = installFakeDocument();
  try {
    const alpha = sceneById('cardiac-output');
    assert.notEqual(alpha.status, 'production', 'the case this guards: a published model that is not production');
    const card = createModelCard(alpha);
    const said = findByClass(card, 'model-card-maturity').map((node) => node.textContent);
    assert.deepEqual(said, ['Alpha', 'アルファ']);
    assert.equal(findByClass(card, 'badge').length, 0, 'and it is words, not a badge');

    const finished = createModelCard({ ...alpha, status: 'production' });
    assert.equal(findByClass(finished, 'model-card-maturity').length, 0, 'a production model says nothing extra');
  } finally {
    restore();
  }
});

test('posters are photographed at the scene\'s own route, not at its showcase key', async () => {
  // `MODEL_SHOWCASE` is keyed by scene id; the route is the slug. They differ
  // for some scenes, and the capture script used to open `#/<id>` — the
  // router's default scene, photographed under the wrong model's name.
  const { posterTargets } = await import('../scripts/lib/posters.mjs');
  const [copd] = posterTargets({ showcase: { 'copd-hyperinflation': { poster: 'posters/x.jpg' } } });
  assert.equal(copd.route, '#/copd');
  for (const target of posterTargets()) {
    const { sceneById, sceneRoute } = await import('../src/catalog/index.js');
    assert.equal(target.route, sceneRoute(sceneById(target.id)), target.id);
  }
  assert.throws(() => posterTargets({ showcase: { 'no-such-scene': { poster: 'p.jpg' } } }), /not a scene/);
  assert.deepEqual(posterTargets({ only: ['copd'], showcase: { 'copd-hyperinflation': { poster: 'p.jpg' } } }).map((t) => t.id), ['copd-hyperinflation'], '--only takes the slug too');
  // And the script asks this, and waits for the app before the camera — a
  // model's viewer, or a lesson, which makes no renderer and is photographed
  // as its own figure once that has stopped moving.
  const script = readFileSync(new URL('../scripts/capture-model-posters.mjs', import.meta.url), 'utf8');
  assert.match(script, /posterTargets\(/);
  assert.match(script, /waitForFunction\(\(\) => Boolean\(window\.__app\?\.viewer \|\| window\.__app\?\.lesson\)/);
  assert.match(script, /lesson-figure-svg'\)\?\.dataset\.calm === 'true'/);
});
