import test from 'node:test';
import assert from 'node:assert/strict';

import { attributionForScene } from '../src/catalog/attribution.js';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';
import { ASSET_MANIFEST } from '../src/catalog/assetManifest.js';

/**
 * Crediting the right work.
 *
 * The selection card ended with one literal link to one repository, and the
 * panel that draws it is built for **every** scene that answers
 * `getAnatomySelection()`. So the heart atlas — geometry from a HuBMAP CCF
 * release — credited the Brain Project. An attribution obligation discharged
 * against the wrong work is not discharged, and the failure is silent: the link
 * is there, it resolves, and it is wrong.
 *
 * These read the same records the licence assessment was made from, so the
 * credit on screen cannot drift away from it.
 */

test('attribution: the brain credits the work its licence names, not a link in a component', () => {
  const [brain, ...rest] = attributionForScene('brain-anatomy');
  assert.equal(rest.length, 0, 'the brain rests on one asset');
  assert.equal(brain.assetId, 'brain-atlas-glb');
  assert.equal(brain.released, true);
  assert.equal(brain.licenseName, 'CC-BY-SA-4.0');

  // The licence asks us to carry the credit, so the link goes to the file that
  // carries it rather than to the upstream page.
  assert.equal(brain.record, 'public/assets/brain/ATTRIBUTION.md');
  // And the link is the URL, not the repository path: `public/` is served from
  // the root, so the recorded path as an href asks for `/public/...` and 404s.
  assert.equal(brain.recordUrl, './assets/brain/ATTRIBUTION.md');
  assert.ok(!brain.recordUrl.includes('public/'), 'the served URL drops the public/ prefix');
  assert.match(brain.credit, /Itay Inbar/);
  assert.match(brain.credit, /BodyParts3D/, 'every component is named, not just the top one');
});

test('attribution: the heart does not credit the brain', () => {
  const heart = attributionForScene('heart-anatomy');
  assert.ok(heart.length >= 1, 'the heart atlas rests on a recorded asset');
  for (const entry of heart) {
    assert.ok(!/brainproject/i.test(entry.sourceUrl ?? ''), `${entry.assetId} links to the brain project`);
    assert.ok(!/Itay Inbar/i.test(entry.credit ?? ''), `${entry.assetId} credits the brain project`);
  }
  assert.ok(heart.some((entry) => /hubmap/i.test(entry.assetId)), 'it names the HuBMAP file it draws');
});

test('attribution: a candidate asset claims no licence decision', () => {
  // The record has read a licence. The release gate has not assessed one, and
  // printing an SPDX id would show a decision nobody has made.
  const heart = attributionForScene('heart-anatomy');
  const candidate = heart.find((entry) => !entry.released);
  assert.ok(candidate, 'the heart asset is still a candidate');
  assert.equal(candidate.licenseName, null);
  assert.equal(candidate.credit, null);
  assert.equal(candidate.record, null);
  assert.match(candidate.note, /[Nn]ot adopted/, 'and it says so');
});

test('attribution: every released asset a scene draws can be credited', () => {
  // A released asset with no attribution line is an obligation with nothing to
  // discharge it, which is the state this whole file exists to make loud.
  const missing = [];
  for (const entry of SCENE_MANIFEST) {
    for (const credit of attributionForScene(entry.slug)) {
      if (!credit.released) continue;
      if (!credit.credit || !credit.record) missing.push(`${entry.slug}: ${credit.assetId}`);
      // A link that cannot be followed is not a credit.
      else if (!credit.recordUrl) missing.push(`${entry.slug}: ${credit.assetId} (record is not servable)`);
    }
  }
  assert.deepEqual(missing, []);
});

test('attribution: a scene with no recorded asset asks for no credit', () => {
  // Procedural geometry has nobody to credit, and inventing a line for it would
  // make the credit meaningless where it is real.
  assert.deepEqual(attributionForScene('heart-failure'), []);
  assert.deepEqual(attributionForScene('no-such-scene'), []);
});

test('attribution: it reads the manifest rather than a copy of it', () => {
  // If this ever stops matching, the panel is showing something the licence
  // assessment does not say.
  const asset = ASSET_MANIFEST.find((entry) => entry.assetId === 'brain-atlas-glb');
  const [brain] = attributionForScene('brain-anatomy');
  assert.equal(brain.sourceName, asset.source.name);
  assert.equal(brain.licenseUrl, asset.license.url);
  assert.equal(brain.credit, asset.license.attribution);
});

test('attribution: a scene credits every asset it actually loads', async () => {
  // The profile is what the credit is resolved from, so a file the scene loads
  // and the profile does not list is geometry on screen with nobody credited
  // for it. The heart atlas drew two HuBMAP files and declared one.
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(
    new URL('../src/scenes/cardiovascular/scenes/heartAnatomy/HeartAnatomyScene.js', import.meta.url),
    'utf8'
  );
  const loaded = [...source.matchAll(/devAssetUrl\(\s*'([^']+)'/g)].map((match) => match[1]);
  assert.ok(loaded.length >= 2, 'the heart atlas loads more than one file');

  const credited = new Set(attributionForScene('heart-anatomy').map((entry) => entry.assetId));
  for (const assetId of loaded) {
    assert.ok(credited.has(assetId), `${assetId} is drawn but not credited`);
  }
});
