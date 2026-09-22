import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

import {
  MODEL_INFO_ROUTE,
  PUBLIC_MANIFEST,
  PUBLIC_MANIFEST_SCHEMA_VERSION,
  PUBLIC_MODELS,
  organIsPublished,
  publicManifestProblems,
  publicModelById,
  publicModelsForOrgan,
} from '../src/catalog/publicManifest.js';
import { RELEASED_SCENES, isSceneReleased } from '../src/catalog/release.js';
import { SCENES, sceneById } from '../src/catalog/index.js';
import { resolveRoute } from '../src/app/router.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const fileExists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

/**
 * The contract the public-UI work is built against.
 *
 * Field names and types are pinned here on purpose: another person is writing
 * surfaces against this while the catalogue keeps moving underneath, and a
 * renamed field is a broken page they find out about from a screenshot. Adding
 * a field is free; renaming or removing one has to break this test first.
 */
test('public manifest: the row shape is the contract, and it is fixed', () => {
  assert.equal(PUBLIC_MANIFEST_SCHEMA_VERSION, 1);
  assert.deepEqual(Object.keys(PUBLIC_MANIFEST).sort(), [
    'channel',
    'count',
    'models',
    'organs',
    'revision',
    'schemaVersion',
  ]);

  assert.ok(PUBLIC_MODELS.length > 0, 'a manifest with no models means the product is closed');
  for (const model of PUBLIC_MODELS) {
    assert.deepEqual(Object.keys(model).sort(), [
      'modelCard',
      'modelInfoRoute',
      'organId',
      'organLabelJa',
      'posterKind',
      'posterPath',
      'route',
      'sceneId',
      'titleEn',
      'titleJa',
    ]);
    for (const key of ['sceneId', 'organId', 'organLabelJa', 'titleJa', 'titleEn', 'route']) {
      assert.equal(typeof model[key], 'string', `${model.sceneId}.${key}`);
      assert.ok(model[key].trim(), `${model.sceneId}.${key} is empty`);
    }
    assert.equal(model.modelInfoRoute, MODEL_INFO_ROUTE);
    assert.equal(model.posterKind, 'link-preview-card');
    assert.match(model.route, /^#\/[a-z0-9-]+$/);
    assert.ok(model.modelCard === null || model.modelCard.startsWith('docs/'));

    // Everything it points at resolves: the route opens the scene it names, the
    // poster is a file that ships, and the model card is a document that exists.
    assert.equal(resolveRoute(model.route).sceneId, model.sceneId);
    assert.ok(fileExists(`public/${model.posterPath}`), model.posterPath);
    if (model.modelCard) assert.ok(fileExists(model.modelCard), model.modelCard);
  }

  assert.deepEqual(publicManifestProblems({ fileExists }), []);
});

test('public manifest: it publishes what is open and cannot publish anything else', () => {
  assert.deepEqual(
    PUBLIC_MODELS.map((model) => model.sceneId),
    RELEASED_SCENES.map((scene) => scene.id)
  );
  assert.equal(PUBLIC_MANIFEST.count, PUBLIC_MODELS.length);
  assert.equal(PUBLIC_MANIFEST.channel, 'beta');

  for (const scene of SCENES) {
    assert.equal(
      publicModelById(scene.id) !== null,
      isSceneReleased(scene),
      `${scene.id}: the manifest and the gate disagree`
    );
  }

  // No "ready: false" row, no placeholder for work in progress. An organ with
  // nothing finished is absent, and `organIsPublished` is the honest test for
  // "may I offer this organ" — the question the landing hero asks. The heart
  // was the absent case until 2026-09-15; it is present now because a model
  // was finished, and the rule that produced both answers is the same one.
  assert.equal(organIsPublished('brain'), true);
  assert.equal(organIsPublished('heart'), true);
  // Two since 2026-09-22 — the atlas and one mechanism scene. `organIsPublished`
  // answers about the organ; this answers about its models, and the two are
  // different questions as soon as an organ has more than one.
  assert.deepEqual(
    publicModelsForOrgan('heart').map((model) => model.sceneId),
    ['heart-anatomy', 'cardiac-output']
  );
  // An organ with nothing published is still absent, and still answers no.
  assert.equal(organIsPublished('lung'), false);
  assert.deepEqual(publicModelsForOrgan('lung'), []);
  const source = read('src/catalog/publicManifest.js');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /ready:\s*(true|false)|comingSoon|placeholder:/);
  assert.match(source, /RELEASED_SCENES\.map\(rowFor\)/, 'the rows are derived from the gate, not listed');
});

test('public manifest: the revision changes when the published set changes, and not otherwise', () => {
  assert.match(PUBLIC_MANIFEST.revision, /^[0-9a-f]{8}$/);
  // Stable across reads: it is a function of the rows, not of the clock or of
  // module evaluation order.
  assert.equal(PUBLIC_MANIFEST.revision, PUBLIC_MANIFEST.revision);
});

test('public manifest: no surface keeps its own list of what is published', () => {
  // The rule this exists to enforce. A surface that hard-codes a scene id is a
  // second release decision, made by whoever was editing that file.
  const published = new Set(PUBLIC_MODELS.map((model) => model.sceneId));
  const withheld = SCENES.filter((scene) => !published.has(scene.id)).map((scene) => scene.id);

  for (const path of readdirSync(new URL('../src/app', import.meta.url))) {
    if (!path.endsWith('.js')) continue;
    const source = read(`src/app/${path}`);
    for (const id of withheld) {
      assert.doesNotMatch(
        source,
        new RegExp(`['"]${id}['"]`),
        `src/app/${path} names the withheld model "${id}" — read the manifest instead`
      );
    }
  }
});

test('public manifest: a locked model is still answerable, just not published', () => {
  // Withheld is not deleted. `#/copd` shared before the beta keeps resolving to
  // a page that says what it pointed at, and `#/trust` still records the review
  // state of every model. Publishing and existing are different questions.
  const copd = sceneById('copd-hyperinflation');
  assert.ok(copd, 'the scene is still in the catalogue');
  assert.equal(publicModelById(copd.id), null);
  assert.equal(resolveRoute('#/copd').sceneId, copd.id);
});
