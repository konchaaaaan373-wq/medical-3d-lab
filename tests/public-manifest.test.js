import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

import {
  MODEL_INFO_ROUTE,
  PUBLIC_MANIFEST,
  PUBLIC_MANIFEST_SCHEMA_VERSION,
  PUBLIC_MODELS,
  PUBLIC_ORGANS,
  organIsPublished,
  publicManifestProblems,
  publicModelById,
  publicModelsForOrgan,
} from '../src/catalog/publicManifest.js';
import { RELEASED_SCENES, isSceneReleased } from '../src/catalog/release.js';
import { SCENES, sceneById } from '../src/catalog/index.js';
import { resolveRoute, trustFocusOf } from '../src/app/router.js';
import { organById } from '../src/catalog/taxonomy.js';
import { WIDE_MANIFEST } from './helpers/wide-release.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const fileExists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

/** Every `.js`/`.mjs` file under a repository directory, repository-relative. */
function filesIn(dir) {
  const out = [];
  const walk = (at) => {
    for (const entry of readdirSync(new URL(`../${at}`, import.meta.url), { withFileTypes: true })) {
      if (entry.isDirectory()) walk(`${at}/${entry.name}`);
      else if (/\.m?js$/.test(entry.name)) out.push(`${at}/${entry.name}`);
    }
  };
  walk(dir);
  return out;
}

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
      'layer',
      'modelCard',
      'modelInfoRoute',
      'organId',
      'organLabel',
      'organLabelJa',
      'posterKind',
      'posterPath',
      'route',
      'sceneId',
      'titleEn',
      'titleJa',
    ]);
    // `organLabel` is in this list, not only in the key set above. A bilingual
    // control reads both names and renders an empty span for a missing one —
    // which is how the scene header's model strip shipped with no English
    // labels at all while every structural check stayed green.
    for (const key of [
      'sceneId',
      'organId',
      'organLabel',
      'organLabelJa',
      'titleJa',
      'titleEn',
      'route',
    ]) {
      assert.equal(typeof model[key], 'string', `${model.sceneId}.${key}`);
      assert.ok(model[key].trim(), `${model.sceneId}.${key} is empty`);
    }
    // The record route names its own model. It was the bare `MODEL_INFO_ROUTE`
    // for every row, which is how a link labelled "model information",
    // followed from one model, arrived at the top of a page listing seventy.
    assert.equal(model.modelInfoRoute, `${MODEL_INFO_ROUTE}?model=${model.sceneId}`);
    assert.equal(trustFocusOf(model.modelInfoRoute), model.sceneId, 'and the router reads it back');
    assert.equal(resolveRoute(model.modelInfoRoute).kind, 'trust', 'and it is still the trust route');
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
  // nothing published is absent, and `organIsPublished` is the honest test for
  // "may I offer this organ" — the question the landing hero asks.
  //
  // The heart has been on both sides of this. Absent until 2026-09-15; present
  // once its model was finished; absent again since 2026-11-24, when the launch
  // scope narrowed to the brain with the heart's record intact. The rule that
  // produced all three answers is the same one: is a model of it released.
  assert.equal(organIsPublished('brain'), true);
  // `organIsPublished` answers about the organ; this answers about its models,
  // and the two are different questions as soon as an organ has more than one.
  assert.deepEqual(
    publicModelsForOrgan('brain').map((model) => model.sceneId),
    ['brain-anatomy', 'mri-atlas']
  );
  // Organs with nothing published are absent, and answer no — by their real
  // ids. (This asked about `'lung'`, which is not an organ id; the organ is
  // `'lungs'`, so the assertion was true of a name nothing uses.)
  for (const organId of ['heart', 'lungs', 'liver', 'kidney']) {
    assert.ok(organById(organId), `"${organId}" is not an organ in the taxonomy`);
    assert.equal(organIsPublished(organId), false, `${organId} is offered`);
    assert.deepEqual(publicModelsForOrgan(organId), [], `${organId} has a published model`);
  }
  // The same projection over the wider set the gate clears: an organ with two
  // models lists both, anatomy first — what the heart looked like while it was
  // published, held on real rows so it is true again the day the scope widens.
  assert.deepEqual(
    WIDE_MANIFEST.models.filter((model) => model.organId === 'heart').map((model) => model.sceneId),
    ['heart-anatomy', 'cardiac-output']
  );
  assert.deepEqual([...WIDE_MANIFEST.organs], ['brain', 'heart', 'lungs', 'liver']);

  const source = read('src/catalog/publicManifest.js');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /ready:\s*(true|false)|comingSoon|placeholder:/);
  // The rows are derived from the gate, not listed: the one manifest a surface
  // reads is the projection applied to `RELEASED_SCENES`, and to nothing else.
  assert.match(code, /export const PUBLIC_MANIFEST = publicManifestOf\(RELEASED_SCENES\);/);
  assert.equal((code.match(/publicManifestOf\(/g) ?? []).length, 2, 'the projection is applied somewhere other than to the released scenes');
  assert.match(code, /const models = Object\.freeze\(scenes\.map\(rowFor\)\);/);
  assert.equal(PUBLIC_MODELS, PUBLIC_MANIFEST.models);
  assert.equal(PUBLIC_ORGANS, PUBLIC_MANIFEST.organs);
  // And no application code applies it: a surface that built its own manifest
  // would be publishing by itself.
  for (const dir of ['src/app', 'src/components', 'src/data', 'src/scenes', 'scripts']) {
    for (const path of filesIn(dir)) {
      assert.doesNotMatch(read(path), /publicManifestOf/, `${path} builds a manifest of its own`);
    }
  }
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
