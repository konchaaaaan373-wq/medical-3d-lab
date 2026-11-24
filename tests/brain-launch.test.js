import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { LAUNCH_AREAS, launchAreaById, launchAreaForScene } from '../src/catalog/launch.js';
import { FUNCTIONS_ROUTE, SCENES, sceneById } from '../src/catalog/index.js';
import {
  BETA_ANATOMY_CANDIDATES,
  BETA_MECHANISM_CANDIDATES,
  LAUNCH_SCOPE,
  RELEASED_SCENES,
  betaPublicationProblems,
  isRouteReleased,
  isSceneReleased,
  launchPublicationProblems,
  launchScopeProblems,
  sceneReleaseProblems,
} from '../src/catalog/release.js';
import { MECHANISM_LEVEL, modelProfileForScene } from '../src/catalog/modelProfiles.js';
import { ANATOMY_ATLAS_LINKS, mriStructureIdForAnatomyId } from '../src/catalog/brainAtlasLinks.js';
import { resolveRoute } from '../src/app/router.js';
import { createFunctionsIndex } from '../src/app/FunctionsIndex.js';
import { FUNCTION_THEMES } from '../src/data/brainFunctionThemes.js';
import { installFakeDocument, FakeElement } from './helpers/fake-dom.js';

/**
 * The brain launch (ADR 2026-11-24): what the scope does, what it does not,
 * and that the function model's closed door is said in words.
 */

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

function textOf(node, out = []) {
  if (node.textContent) out.push(node.textContent);
  for (const child of node.children ?? []) textOf(child, out);
  return out.join(' ');
}
function linksOf(node, out = []) {
  if (node.tagName === 'A') out.push(node);
  for (const child of node.children ?? []) linksOf(child, out);
  return out;
}
function withDom(run) {
  const restore = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = {};
  try {
    return run();
  } finally {
    globalThis.window = previousWindow;
    restore();
  }
}

test('launch scope: the brain and nothing else is published', () => {
  assert.deepEqual(LAUNCH_SCOPE.organs, ['brain']);
  assert.ok(RELEASED_SCENES.length > 0);
  for (const scene of RELEASED_SCENES) assert.equal(scene.organ, 'brain', `${scene.id} is published and is not the brain`);
  for (const scene of SCENES.filter((entry) => entry.organ !== 'brain')) {
    assert.equal(isSceneReleased(scene), false, `${scene.id} (${scene.organ}) is outside the launch and open`);
  }
  assert.ok(read(LAUNCH_SCOPE.record).includes('LAUNCH_SCOPE'), 'the scope names a record that explains it');
});

test('launch scope: it withholds without erasing — the heart\'s record is intact and the heart is closed', () => {
  // The whole point of a scope laid over the gate: nothing about the withheld
  // scenes was deleted or demoted, so widening the launch is one edit.
  for (const id of ['heart-anatomy', 'lung-anatomy', 'liver-anatomy', 'cardiac-output']) {
    assert.ok(sceneById(id), `${id} is still in the catalogue`);
    assert.ok([...BETA_ANATOMY_CANDIDATES, ...BETA_MECHANISM_CANDIDATES].includes(id), `${id} is still a named candidate`);
    assert.deepEqual(betaPublicationProblems(id), [], `${id}: its own beta record must stay complete`);
    const problems = sceneReleaseProblems(sceneById(id));
    assert.equal(problems.length, 1, `${id}: the scope is the only thing keeping it closed`);
    assert.match(problems[0], /outside the launch scope/);
    assert.equal(isRouteReleased(resolveRoute(`#/${id}`)), false, `#/${id} must not open from a direct link`);
  }
  // And widening it is exactly that one edit.
  const wider = { ...LAUNCH_SCOPE, organs: ['brain', 'heart'] };
  assert.deepEqual(launchPublicationProblems('heart-anatomy', { scope: wider }), []);
  assert.notDeepEqual(launchPublicationProblems('lung-anatomy', { scope: wider }), []);
});

test('launch scope: being in scope opens nothing — a brain scene still needs the gate', () => {
  const closedBrainScenes = SCENES.filter((scene) => scene.organ === 'brain' && !isSceneReleased(scene));
  assert.ok(closedBrainScenes.length > 0, 'this test needs a brain scene the gate holds closed');
  for (const scene of closedBrainScenes) {
    assert.deepEqual(launchScopeProblems(scene), [], `${scene.id} is in scope`);
    assert.notDeepEqual(betaPublicationProblems(scene.id), [], `${scene.id} is closed by the gate, not by the scope`);
  }
});

test('the function model is closed, and stays the centre: an entrance that is open, a model that is not', () => {
  const area = launchAreaById('functions');
  const model = sceneById(area.sceneId);
  assert.equal(modelProfileForScene(model).mechanismLevel, MECHANISM_LEVEL.MECHANISTIC, 'it makes a mechanism claim');
  assert.equal(isSceneReleased(model), false, 'opening it is the owner\'s decision, with a record — not a side effect of a redesign');
  assert.ok(!BETA_MECHANISM_CANDIDATES.includes(model.id));
  assert.equal(area.route, FUNCTIONS_ROUTE);
  assert.deepEqual(resolveRoute(FUNCTIONS_ROUTE).kind, 'functions');
  assert.equal(isRouteReleased(resolveRoute(FUNCTIONS_ROUTE)), true, 'the entrance is a document and is open');
  assert.equal(resolveRoute('#/functions?theme=memory').focusId, 'memory');
});

test('launch areas: three, in the product\'s order, each naming a real scene', () => {
  assert.deepEqual(LAUNCH_AREAS.map((area) => area.id), ['functions', 'anatomy', 'mri']);
  assert.deepEqual(LAUNCH_AREAS.map((area) => area.ja), ['高次脳機能', '脳解剖', 'MRIアトラス']);
  for (const area of LAUNCH_AREAS) {
    const scene = sceneById(area.sceneId);
    assert.ok(scene, `${area.id} names no scene`);
    assert.equal(scene.organ, 'brain');
    assert.ok(area.route?.startsWith('#/'));
    assert.equal(launchAreaForScene(area.sceneId), area);
  }
  // The two anatomy areas are open and make no mechanism claim.
  for (const id of ['anatomy', 'mri']) {
    const scene = sceneById(launchAreaById(id).sceneId);
    assert.equal(isSceneReleased(scene), true, `${id} is offered by the header and closed`);
    assert.equal(modelProfileForScene(scene).mechanismLevel, MECHANISM_LEVEL.NONE);
  }
});

test('#/functions: with the model closed it says so in words and offers what is open — never a link to the closed model', () => {
  withDom(() => {
    const open = ['brain-anatomy', 'mri-atlas'];
    const manifest = { models: open.map((sceneId) => ({ sceneId })) };
    const mounted = createFunctionsIndex({ ui: new FakeElement('div'), manifest, unlocked: false });
    const text = textOf(mounted.element);
    assert.match(text, /機能モデルは、まだ公開していません/);
    assert.match(text, /医師によるレビューがまだ済んでいません/);
    assert.doesNotMatch(text, /レビュー中/, 'no review is under way; do not say one is');
    const hrefs = linksOf(mounted.element).map((link) => link.getAttribute('href'));
    assert.ok(!hrefs.includes('#/higher-brain-function'), 'a link to a closed door');
    assert.ok(hrefs.includes('#/brain-anatomy') && hrefs.includes('#/mri-atlas'), 'what is open is offered instead');
    for (const theme of FUNCTION_THEMES) assert.ok(text.includes(theme.questionJa), `${theme.id} is not on the page`);
    // A theme the model does not cover is "planned", not implied.
    assert.match(text, /今後追加します（モデルには未収載）/);
    mounted.destroy();
  });
});

test('#/functions: when the model is published the page offers it — with its review state, without an edit here', () => {
  withDom(() => {
    const manifest = { models: [{ sceneId: 'higher-brain-function' }, { sceneId: 'brain-anatomy' }] };
    const mounted = createFunctionsIndex({ ui: new FakeElement('div'), manifest, unlocked: false });
    const text = textOf(mounted.element);
    assert.ok(linksOf(mounted.element).some((link) => link.getAttribute('href') === '#/higher-brain-function'));
    assert.match(text, /医学レビューは未完了/);
    assert.doesNotMatch(text, /まだ公開していません/);
    mounted.destroy();
  });
});

test('the open surfaces do not import the function model, and do not state its claims', () => {
  // The shell must not pull an unpublished model into the production bundle,
  // and the pages that are open must not say what only that model may say.
  for (const path of ['src/app/FunctionsIndex.js', 'src/app/Landing.js', 'src/app/AtlasShell.js', 'src/data/brainFunctionThemes.js', 'src/catalog/launch.js']) {
    const source = read(path);
    assert.doesNotMatch(source, /from '\.\.\/models\/higherBrainFunction\.js'|scenes\/nervous\/scenes\/higherBrainFunction/, `${path} imports the function model`);
  }
  const prose = [read('src/app/FunctionsIndex.js'), read('src/app/Landing.js'), read('src/catalog/launch.js')]
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(prose, /Broca|Wernicke|ブローカ|ウェルニッケ|弓状束|arcuate/i, 'an open page names a structure-function pairing');
});

test('atlas links: an anatomy structure id maps to one MRI structure, and only for the nine both atlases name', () => {
  assert.equal(Object.keys(ANATOMY_ATLAS_LINKS).length, 9);
  assert.equal(mriStructureIdForAnatomyId(122), 'hippocampus-l');
  assert.equal(mriStructureIdForAnatomyId('123'), 'hippocampus-r');
  assert.equal(mriStructureIdForAnatomyId(50), 'caudate-r');
  assert.equal(mriStructureIdForAnatomyId(196), null, 'the medulla has no counterpart and gets no link');
  const ids = Object.values(ANATOMY_ATLAS_LINKS).flatMap((link) => [link.L, link.R]);
  assert.equal(new Set(ids).size, ids.length, 'no anatomy structure is claimed twice');
  // The shell reads the table from the catalogue, not from the scene's data.
  assert.match(read('src/app/App.js'), /from '\.\.\/catalog\/brainAtlasLinks\.js'/);
  assert.doesNotMatch(read('src/app/App.js'), /data\/mriAtlas\.js/);
});
