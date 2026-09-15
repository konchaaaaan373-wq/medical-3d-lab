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

test('attribution: an adopted asset carries the decision a candidate could not', () => {
  // This used to assert the opposite, and the assertion was right for what the
  // heart then was: a candidate prints no SPDX id, no credit and no record,
  // because the release gate had assessed nothing and showing a licence name
  // would display a decision nobody had made. The heart was adopted on
  // 2026-09-15, so the same rule now requires the other answer — and what must
  // not happen is an adopted asset quietly keeping a candidate's blanks.
  const heart = attributionForScene('heart-anatomy');
  assert.ok(heart.length >= 2, 'both files the scene draws are credited');
  for (const entry of heart) {
    assert.equal(entry.released, true, `${entry.assetId} is still a candidate`);
    assert.ok(entry.licenseName, `${entry.assetId} has no licence name`);
    assert.ok(entry.credit, `${entry.assetId} has no credit line`);
    assert.ok(entry.record, `${entry.assetId} names no record`);
    assert.ok(entry.recordUrl, `${entry.assetId}: the record cannot be followed`);
    // CC BY 4.0 asks a derivative to say it is one. The scene draws repaired
    // files, and the credit a reader sees has to carry that.
    assert.match(entry.credit, /Modified/, `${entry.assetId} does not say it was modified`);
  }
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
  // Read off the served paths rather than off `devAssetUrl`, which is how the
  // scene loaded these files while they were candidates. The question is the
  // same one — is anything drawn that nobody is credited for — and it has to
  // survive the files being adopted.
  const loaded = [...source.matchAll(/assets\/heart\/([A-Za-z0-9_]+)\.glb/g)].map((match) => match[1]);
  assert.ok(loaded.length >= 2, 'the heart atlas loads more than one file');
  const byFile = new Map(
    ASSET_MANIFEST.filter((asset) => asset.output?.path?.includes('/heart/')).map((asset) => [
      asset.output.path.split('/').pop().replace('.glb', ''),
      asset.assetId,
    ])
  );

  const credited = new Set(attributionForScene('heart-anatomy').map((entry) => entry.assetId));
  for (const file of loaded) {
    const assetId = byFile.get(file);
    assert.ok(assetId, `${file}.glb is loaded but is in no manifest entry`);
    assert.ok(credited.has(assetId), `${assetId} is drawn but not credited`);
  }
});
