import test from 'node:test';
import assert from 'node:assert/strict';

import { declaration, rulesOf } from '../scripts/lib/css.mjs';
import { readFileSync } from 'node:fs';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';
import { activeUsesForScene } from '../src/access/features.js';
import { activeUsesForSceneEntry } from '../src/access/sceneUses.js';
import {
  navigationKindGroups,
  navigationUseLabel,
} from '../src/app/sceneNavigationModel.js';

const scene = (id) => {
  const found = SCENE_MANIFEST.find((entry) => entry.id === id);
  assert.ok(found, `${id}: scene exists`);
  return found;
};

test('navigation uses the same fail-closed patient-use gate as product features', () => {
  for (const entry of SCENE_MANIFEST) {
    assert.deepEqual(
      activeUsesForSceneEntry(entry),
      activeUsesForScene(entry),
      entry.id
    );
  }
});

test('navigation never labels education-only circulation as patient explanation', () => {
  const circulation = scene('circulation');
  const uses = activeUsesForSceneEntry(circulation);
  assert.deepEqual(uses, ['education', 'clinical-learning']);
  assert.deepEqual(
    navigationUseLabel(circulation, uses),
    { en: 'Medical education', ja: '医学教育' }
  );
});

test('navigation hides patient explanation while a production scene lacks current review', () => {
  const heartFailure = scene('heart-failure');
  const uses = activeUsesForSceneEntry(heartFailure);
  assert.equal(heartFailure.uses.includes('patient'), true, 'patient is an authored intended use');
  assert.equal(uses.includes('patient'), false, 'patient use stays hidden until current review exists');
  assert.deepEqual(
    navigationUseLabel(heartFailure, uses),
    { en: 'Medical education', ja: '医学教育' }
  );
});

test('a mechanism scene is labelled with the word the header uses for its layer', () => {
  // The organ row calls cardiac output 機序; the catalogue in the menu used to
  // call the same model 解剖・生理, and one model under two names reads as two.
  const cardiacOutput = scene('cardiac-output');
  assert.deepEqual(navigationUseLabel(cardiacOutput, activeUsesForSceneEntry(cardiacOutput)), {
    en: 'Mechanism model',
    ja: '機序モデル',
  });
  assert.deepEqual(navigationUseLabel(scene('brain-anatomy'), []), { en: 'Anatomy model', ja: '解剖モデル' });
});

test('patient explanation remains the first visible product use when it is enabled', () => {
  const label = navigationUseLabel(
    { disease: 'example' },
    ['education', 'patient', 'clinical-learning']
  );
  assert.deepEqual(
    label,
    { en: 'Patient explanation · Medical education', ja: '患者説明・医学教育' }
  );
});

test('a pathology-only organ keeps the disease/pathophysiology hierarchy level', () => {
  const circulation = scene('circulation');
  const kinds = navigationKindGroups({
    foundation: [],
    pathophysiology: [circulation],
  });
  assert.equal(kinds.length, 1);
  assert.equal(kinds[0].id, 'pathophysiology');
  assert.equal(kinds[0].labelJa, '病態');
  assert.equal(kinds[0].scenes[0].id, 'circulation');
});


test('system accordions expose the missing top level to heading navigation', () => {
  const source = readFileSync(
    new URL('../src/components/SceneSwitcher.js', import.meta.url),
    'utf8'
  );
  assert.match(
    source,
    /class:\s*'global-nav-system-heading'[\s\S]*?role:\s*'heading'[\s\S]*?'aria-level':\s*'3'/,
    // One level down from where it was: the catalogue is now a section of the
    // site menu, whose section headings are the h2s. Menu section (h2) →
    // body system (3) → organ (h4) → kind (h5), with no level skipped.
    'the interactive summary keeps system-level heading semantics under the menu section and above h4 organs and h5 kinds'
  );
});

test('compact navigation and safety copy do not regress below twelve pixels', () => {
  // This used to read these two sheets directly. It still does — they must stay
  // *entirely* clear of the floor, which is stricter than the product-wide
  // ratchet and is the state they are already in. What changed is that the
  // floor is no longer only theirs: `tests/type-floor.test.js` walks all 33
  // sheets and refuses anything new below 12px, which is where a new sheet's
  // small type is now caught. These two were the only ones covered for as long
  // as this was the only guard.
  const typography = readFileSync(
    new URL('../src/styles/ui-hierarchy-typography.css', import.meta.url),
    'utf8'
  );
  const releasePolish = readFileSync(
    new URL('../src/styles/browser-first-release-polish.css', import.meta.url),
    'utf8'
  );

  // Through the shared reader, so a `font-size` written inside a comment is not
  // a failure and the message names the rule rather than the sheet. Searching
  // the raw text for a small size reports "somewhere in here" and makes a
  // comment explaining a past 10px into a red build (L-06).
  const small = [];
  for (const [sheet, css] of [['ui-hierarchy-typography.css', typography], ['browser-first-release-polish.css', releasePolish]]) {
    for (const rule of rulesOf(css)) {
      const size = declaration(rule.body, 'font-size');
      if (size === null || !/^[0-9.]+px$/.test(size)) continue;
      const px = Number.parseFloat(size);
      if (px < 12) small.push(`${sheet}: ${rule.selectors} is ${px}px`);
    }
  }
  assert.deepEqual(
    small,
    [],
    'model navigation and persistent medical caveats must remain readable on compact screens'
  );

  // And neither sheet may quietly acquire an entry in the product-wide baseline.
  const baseline = JSON.parse(readFileSync(new URL('./type-floor-baseline.json', import.meta.url), 'utf8'));
  for (const sheet of ['ui-hierarchy-typography.css', 'browser-first-release-polish.css']) {
    assert.equal(sheet in baseline.below, false, `${sheet} is meant to be entirely above the floor`);
  }
});
