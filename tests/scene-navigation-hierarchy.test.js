import test from 'node:test';
import assert from 'node:assert/strict';
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
    /class:\s*'global-nav-system-heading'[\s\S]*?role:\s*'heading'[\s\S]*?'aria-level':\s*'2'/,
    'the interactive summary keeps system-level heading semantics above h3 organs and h4 kinds'
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

  assert.doesNotMatch(
    `${typography}\n${releasePolish}`,
    /font-size:\s*(?:[0-9](?:\.\d+)?|1[01](?:\.\d+)?)px/,
    'model navigation and persistent medical caveats must remain readable on compact screens'
  );

  // And neither sheet may quietly acquire an entry in the product-wide baseline.
  const baseline = JSON.parse(readFileSync(new URL('./type-floor-baseline.json', import.meta.url), 'utf8'));
  for (const sheet of ['ui-hierarchy-typography.css', 'browser-first-release-polish.css']) {
    assert.equal(sheet in baseline.below, false, `${sheet} is meant to be entirely above the floor`);
  }
});
