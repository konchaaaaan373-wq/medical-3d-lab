import test from 'node:test';
import assert from 'node:assert/strict';

import { organLayerNavigation } from '../src/app/modelNavigation.js';
import { PUBLIC_MANIFEST, layerOfScene } from '../src/catalog/publicManifest.js';
import { SCENES } from '../src/catalog/index.js';
import { modelProfileForScene } from '../src/catalog/modelProfiles.js';

/**
 * Organ, then layer.
 *
 * The scene header and the site menu both read published models through
 * `organLayerNavigation`, so the shape the reader sees — four organs, and the
 * heart's anatomy beside its cardiac output — is decided here, once.
 */

const row = (sceneId, organId, layer, extra = {}) => ({
  sceneId,
  organId,
  organLabel: organId,
  organLabelJa: `${organId}-ja`,
  titleEn: `${sceneId} title`,
  titleJa: `${sceneId}の題`,
  route: `#/${sceneId}`,
  layer,
  ...extra,
});

test('one entry per organ, in the order the manifest first names it', () => {
  const nav = organLayerNavigation([
    row('brain-anatomy', 'brain', 'anatomy'),
    row('heart-anatomy', 'heart', 'anatomy'),
    row('cardiac-output', 'heart', 'mechanism'),
    row('lung-anatomy', 'lungs', 'anatomy'),
  ]);
  assert.deepEqual(nav.organs.map((organ) => organ.organId), ['brain', 'heart', 'lungs']);
  assert.deepEqual(nav.organs[1].models.map((model) => model.sceneId), ['heart-anatomy', 'cardiac-output']);
});

test('anatomy leads inside an organ even when the catalogue lists it later', () => {
  // The organ chip goes to the organ's first entry. Anatomy is the layer the
  // others sit on, so it is where "the heart" should open.
  const nav = organLayerNavigation([
    row('cardiac-output', 'heart', 'mechanism'),
    row('heart-failure', 'heart', 'pathology'),
    row('heart-anatomy', 'heart', 'anatomy'),
  ]);
  const [heart] = nav.organs;
  assert.deepEqual(heart.models.map((model) => model.layer), ['anatomy', 'mechanism', 'pathology']);
  assert.equal(heart.route, '#/heart-anatomy');
});

test('a lone anatomy model is called by its layer; everything else by its own title, with the layer beside it', () => {
  const nav = organLayerNavigation([
    row('heart-anatomy', 'heart', 'anatomy'),
    row('cardiac-output', 'heart', 'mechanism'),
  ]);
  const [anatomy, mechanism] = nav.organs[0].models;
  assert.deepEqual(anatomy.name, { en: 'Anatomy', ja: '解剖' });
  assert.equal(anatomy.showKind, false, 'it is the layer, so it does not say it twice');
  assert.deepEqual(mechanism.name, { en: 'cardiac-output title', ja: 'cardiac-outputの題' });
  assert.deepEqual(mechanism.kind, { en: 'Mechanism', ja: '機序' });
  assert.equal(mechanism.showKind, true);

  // Two anatomy models of one organ cannot both be called 解剖.
  const twice = organLayerNavigation([
    row('heart-anatomy', 'heart', 'anatomy'),
    row('heart-conduction', 'heart', 'anatomy'),
  ]);
  const names = twice.organs[0].models.map((model) => model.name.ja);
  assert.equal(new Set(names).size, 2, `two anatomy models, told apart: ${names.join(' / ')}`);
  assert.ok(twice.organs[0].models.every((model) => model.showKind));
});

test('the current scene marks its model and its organ, and nothing else', () => {
  const models = [
    row('brain-anatomy', 'brain', 'anatomy'),
    row('heart-anatomy', 'heart', 'anatomy'),
    row('cardiac-output', 'heart', 'mechanism'),
  ];
  const nav = organLayerNavigation(models, 'cardiac-output');
  assert.equal(nav.currentOrgan?.organId, 'heart');
  assert.equal(nav.currentModel?.sceneId, 'cardiac-output');
  assert.deepEqual(nav.organs.filter((organ) => organ.current).map((organ) => organ.organId), ['heart']);
  const marked = nav.organs.flatMap((organ) => organ.models).filter((model) => model.current);
  assert.deepEqual(marked.map((model) => model.sceneId), ['cardiac-output']);

  const elsewhere = organLayerNavigation(models, 'copd');
  assert.equal(elsewhere.currentOrgan, null, 'a scene not on the list marks no organ');
  assert.equal(elsewhere.currentModel, null);
});

test('the layer comes from what the scene claims, not from its name', () => {
  // Anatomy is the claim `mechanismLevel: none`; anything above it is a
  // mechanism; a disease is pathology. The navigation must not call a scene
  // 病態 that the model profile does not, or 解剖 one that explains a mechanism.
  for (const scene of SCENES) {
    const layer = layerOfScene(scene);
    const level = modelProfileForScene(scene)?.mechanismLevel ?? 'none';
    if (scene.disease) assert.equal(layer, 'pathology', scene.id);
    else if (level === 'none') assert.equal(layer, 'anatomy', scene.id);
    else assert.equal(layer, 'mechanism', scene.id);
  }
});

test('the published set, as the header shows it today', () => {
  // Not a copy of the release (CLAUDE.md: do not write the published list
  // down) — a check that whatever it is, it has the shape the header was built
  // for: every row has a layer, and every organ opens somewhere.
  const nav = organLayerNavigation(PUBLIC_MANIFEST.models);
  assert.ok(PUBLIC_MANIFEST.models.every((model) => ['anatomy', 'mechanism', 'pathology'].includes(model.layer)));
  assert.equal(nav.organs.length, PUBLIC_MANIFEST.organs.length, 'one entry per published organ');
  for (const organ of nav.organs) {
    assert.ok(organ.route.startsWith('#/'), `${organ.organId} opens somewhere`);
    assert.ok(organ.name.ja && organ.name.en, `${organ.organId} is named in both languages`);
  }
});
