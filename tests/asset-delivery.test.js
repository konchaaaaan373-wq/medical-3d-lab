import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import {
  SHARED_RUNTIME_PATHS,
  assetDeliveryProblems,
  deliveryPathOf,
  requiredAssetIdsFor,
} from '../scripts/asset-delivery.js';
import { ASSET_MANIFEST, assetById } from '../src/catalog/assetManifest.js';
import { modelProfileForScene } from '../src/catalog/modelProfiles.js';
import { RELEASED_SCENES } from '../src/catalog/release.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/** The asset ids the beta actually needs, derived the way the build derives them. */
const required = requiredAssetIdsFor(RELEASED_SCENES, modelProfileForScene);

/** A build that ships exactly what it should: the brain mesh, its notice, the decoder. */
const CORRECT_BUILD = [
  'index.html',
  'robots.txt',
  '_headers',
  'assets/index-abc123.js',
  'assets/brainAnatomy-def456.js',
  'assets/brain/brain.glb',
  'assets/brain/ATTRIBUTION.md',
  'assets/brain/draco/draco_decoder.wasm',
  'assets/brain/draco/draco_wasm_wrapper.js',
  'social/brain-anatomy.png',
  'social/site.png',
  's/brain-anatomy/index.html',
];

const problemsFor = (emitted, options = {}) =>
  assetDeliveryProblems({ emitted, assets: ASSET_MANIFEST, requiredAssetIds: required, ...options });

test('asset delivery: the control — a correct build passes, shared files included', () => {
  assert.deepEqual(problemsFor(CORRECT_BUILD), []);

  // Each of these is a legitimate file that must not be flagged, and each is
  // legitimate for a different reason. Asserting them one at a time is what
  // stops the check being tightened into something that fails on the decoder.
  for (const file of [
    'assets/brain/ATTRIBUTION.md', // the licence notice the manifest points at
    'assets/brain/draco/draco_decoder.wasm', // a declared shared runtime dependency
    'social/site.png', // a site image, outside every asset directory
    '_headers', // deploy configuration
    'assets/index-abc123.js', // the build's own chunks live in assets/ too
  ]) {
    assert.ok(CORRECT_BUILD.includes(file));
    assert.deepEqual(problemsFor(CORRECT_BUILD).filter((line) => line.includes(file)), [], file);
  }
});

test('asset delivery: an unregistered mesh or texture that shipped is caught', () => {
  // The case the manifest cannot see on its own: a file nobody registered,
  // shipping under a licence nobody recorded, beside assets that are fine.
  for (const intruder of [
    'assets/brain/heart.glb',
    'assets/brain/cortex-diffuse.ktx2',
    'assets/brain/notes.txt',
    'assets/brain/textures/skin.png',
  ]) {
    const problems = problemsFor([...CORRECT_BUILD, intruder]);
    assert.equal(problems.length, 1, `${intruder}: ${JSON.stringify(problems)}`);
    assert.match(problems[0], new RegExp(`^${intruder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: `));
    assert.match(problems[0], /is in no manifest entry/);
  }
});

test('asset delivery: a registered asset no published model uses must not ship', () => {
  // Simulated on the manifest rather than on a name: the same file, the same
  // path, and the only thing that changed is whether a published model needs it.
  const brain = assetById('brain-atlas-glb');
  assert.ok(brain, 'the brain mesh is the asset this case is built on');

  const withheld = problemsFor(CORRECT_BUILD, { requiredAssetIds: new Set() });
  assert.ok(
    withheld.some((line) => /brain-atlas-glb: no published model uses it, but assets\/brain\/brain\.glb shipped/.test(line)),
    JSON.stringify(withheld)
  );

  // And the mirror: a published model whose file did not reach the build.
  const missing = problemsFor(CORRECT_BUILD.filter((file) => file !== 'assets/brain/brain.glb'));
  assert.ok(
    missing.some((line) => /brain-atlas-glb: a published model needs assets\/brain\/brain\.glb/.test(line)),
    JSON.stringify(missing)
  );
});

test('asset delivery: a declared shared dependency that stopped shipping is caught', () => {
  const problems = problemsFor(CORRECT_BUILD.filter((file) => !file.startsWith('assets/brain/draco/')));
  assert.ok(problems.some((line) => /shared runtime "assets\/brain\/draco\/" is declared but did not ship/.test(line)));

  // And every declared shared path says why it is allowed, because the next
  // person to read the list has to be able to decide whether it still applies.
  for (const entry of SHARED_RUNTIME_PATHS) {
    assert.ok(entry.reason?.trim().length > 20, `${entry.path} is declared without a reason`);
  }
});

test('asset delivery: nothing is judged by what it is called', () => {
  // A rule keyed on disease names would pass this file and fail the real one.
  const source = read('scripts/asset-delivery.js');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const name of ['copd', 'asthma', 'heart-failure', 'ischemia', 'pneumonia', 'embolism', 'disease']) {
    assert.doesNotMatch(code, new RegExp(name, 'i'), `the check must not key on the name "${name}"`);
  }
  // Its inputs are the manifest and a file list, and nothing else.
  assert.doesNotMatch(code, /require\(|from 'node:fs'|from "node:fs"/);

  assert.equal(deliveryPathOf('public/assets/brain/brain.glb'), 'assets/brain/brain.glb');
  assert.equal(deliveryPathOf('docs/asset-qa/brain-atlas-glb.md'), null, 'only public/ is delivered');
});

test('asset delivery: the real build agrees, when there is one', (t) => {
  const dist = new URL('../dist', import.meta.url);
  if (!existsSync(dist)) {
    t.skip('no build present — `npm run build` then `npm run verify:site` covers this');
    return;
  }
  const root = dist.pathname;
  const walk = (dir) =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : [relative(root, full).split(sep).join('/')];
    });
  assert.deepEqual(problemsFor(walk(root)), []);
});
