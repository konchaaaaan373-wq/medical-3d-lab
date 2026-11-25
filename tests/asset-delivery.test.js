import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import {
  MODEL_ASSET_EXTENSIONS,
  SHARED_RUNTIME_FILES,
  ASSET_COMPANION_FILES,
  SITE_SURFACE_PATHS,
  assetDeliveryProblems,
  deliveryPathOf,
  requiredAssetIdsFor,
  withheldDeliveryPaths,
  withheldPosterFiles,
} from '../scripts/asset-delivery.js';
import { MODEL_SHOWCASE } from '../src/data/modelShowcase.js';
import { ASSET_MANIFEST, assetById } from '../src/catalog/assetManifest.js';
import { modelProfileForScene } from '../src/catalog/modelProfiles.js';
import { RELEASED_SCENES, betaPublicationProblems } from '../src/catalog/release.js';
import { sceneById } from '../src/catalog/index.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/** The asset ids the beta actually needs, derived the way the build derives them. */
const required = requiredAssetIdsFor(RELEASED_SCENES, modelProfileForScene);

/**
 * What `public/` holds in a correct tree, as the build delivers it.
 *
 * This is the set the check is really about: everything here is copied into
 * `dist/` verbatim, so it is the set that has to be accounted for. Vite's own
 * output is the *other* set, and the two are kept apart on purpose — a hashed
 * chunk in `assets/` is not a medical asset that somebody forgot to register.
 */
const CORRECT_PUBLIC = [
  '.gitkeep',
  '_headers',
  'assets/brain/brain.glb',
  'assets/brain/ATTRIBUTION.md',
  'assets/brain/draco/draco_decoder.wasm',
  'assets/brain/draco/draco_wasm_wrapper.js',
  // The MRI atlas: three volumes, the label surfaces, one notice for all four,
  // and the index — which is no manifest entry of its own and ships because
  // the assets it indexes do (`ASSET_COMPANION_FILES`).
  'assets/mri/t1.u8.gz',
  'assets/mri/t2.u8.gz',
  'assets/mri/labels.u8.gz',
  'assets/mri/cerebra.glb',
  'assets/mri/ATTRIBUTION.md',
  'assets/mri/atlas.json',
  // The heart's two files and their notice. The notice is accounted for by the
  // obligation it discharges rather than by a `decisionRecord` in `public/` —
  // the heart records its licence decision under `docs/` — which is the case
  // the brain could not show, because the brain names one file in both places.
  //
  // Since the brain launch (2026-11-24) no published model uses them: they are
  // in `public/` and must **not** be in the build (`WITHHELD` below).
  'assets/heart/VH_M_Heart.glb',
  'assets/heart/VH_M_Blood_Vasculature.glb',
  'assets/heart/ATTRIBUTION.md',
  'social/brain-anatomy.png',
  'social/site.png',
  'social/cards.json',
];

/** What a production build drops from `public/`, derived the way the build derives it. */
const WITHHELD = withheldDeliveryPaths({ assets: ASSET_MANIFEST, requiredAssetIds: required });

/** A build that ships exactly what it should: `public/` less the withheld files, plus Vite's own output. */
const CORRECT_BUILD = [
  ...CORRECT_PUBLIC.filter((file) => !WITHHELD.includes(file)),
  'index.html',
  'robots.txt',
  'assets/index-abc123.js',
  'assets/brainAnatomy-def456.js',
  'assets/index-apGb.css',
  's/brain-anatomy/index.html',
];

/**
 * The same tree as the release stood before the launch scope: the heart
 * published beside the brain. Built explicitly so the "a second organ's assets
 * ship with it" path stays tested while the real release has one organ.
 */
const HEART_IDS = ['hubmap-vh-m-heart', 'hubmap-vh-m-blood-vasculature'];
const requiredWithHeart = new Set([...required, ...HEART_IDS]);
const BUILD_WITH_HEART = [...CORRECT_BUILD, ...CORRECT_PUBLIC.filter((file) => file.startsWith('assets/heart/'))];

const problemsFor = (emitted, options = {}) =>
  assetDeliveryProblems({
    emitted,
    publicFiles: CORRECT_PUBLIC,
    assets: ASSET_MANIFEST,
    requiredAssetIds: required,
    ...options,
  });

test('asset delivery: the control — a correct build passes, shared files included', () => {
  assert.deepEqual(problemsFor(CORRECT_BUILD), []);

  // Each of these is a legitimate file that must not be flagged, and each is
  // legitimate for a different reason. Asserting them one at a time is what
  // stops the check being tightened into something that fails on the decoder.
  for (const file of [
    'assets/brain/ATTRIBUTION.md', // the licence notice the manifest points at
    'assets/mri/ATTRIBUTION.md', // one notice shared by four assets
    'assets/mri/atlas.json', // the index of those four, declared as their companion
    'assets/brain/draco/draco_decoder.wasm', // a declared shared runtime file
    'assets/brain/draco/draco_wasm_wrapper.js', // and its wrapper, declared too
    'social/site.png', // a link-preview card, owned by check-social-cards.js
    'social/cards.json', // the record those cards are checked against
    '_headers', // deploy configuration
    '.gitkeep', // the placeholder that keeps public/ in git — declared, with a reason
    'assets/index-abc123.js', // the build's own chunks live in assets/ too
    'assets/index-apGb.css', // and so do its stylesheets
  ]) {
    assert.ok(CORRECT_BUILD.includes(file));
    assert.deepEqual(problemsFor(CORRECT_BUILD).filter((line) => line.includes(file)), [], file);
  }

  // A second organ published beside the brain: its meshes ship, and so does a
  // notice named by an obligation rather than by `decisionRecord`.
  assert.deepEqual(problemsFor(BUILD_WITH_HEART, { requiredAssetIds: requiredWithHeart }), []);
  assert.ok(BUILD_WITH_HEART.includes('assets/heart/ATTRIBUTION.md'));
});

test('asset delivery: a withheld model\'s assets are in public/ and not in the build', () => {
  // The brain launch closed the heart with its record complete — the beta gate
  // still answers [] for it — and its two meshes went on shipping to everyone,
  // because `public/` is copied whole. What is withheld is derived, not listed.
  assert.deepEqual(betaPublicationProblems(sceneById('heart-anatomy')), [], 'the heart is withheld by scope, not by a defect');
  assert.ok(!RELEASED_SCENES.some((scene) => scene.id === 'heart-anatomy'));
  assert.deepEqual(WITHHELD, [
    'assets/heart/ATTRIBUTION.md',
    'assets/heart/VH_M_Blood_Vasculature.glb',
    'assets/heart/VH_M_Heart.glb',
  ]);
  for (const file of WITHHELD) assert.ok(CORRECT_PUBLIC.includes(file), `${file} is still in public/ for dev and preview`);

  // Absent from the build is correct, and is not "did not reach the build".
  assert.deepEqual(problemsFor(CORRECT_BUILD), []);

  // Each one that ships is named — the mesh as the asset it is…
  for (const [file, id] of [
    ['assets/heart/VH_M_Heart.glb', 'hubmap-vh-m-heart'],
    ['assets/heart/VH_M_Blood_Vasculature.glb', 'hubmap-vh-m-blood-vasculature'],
  ]) {
    const problems = problemsFor([...CORRECT_BUILD, file]);
    assert.deepEqual(problems, [`${id}: no published model uses it, but ${file} shipped`]);
  }
  // …and the notice as a file with nothing left to describe.
  const notice = problemsFor([...CORRECT_BUILD, 'assets/heart/ATTRIBUTION.md']);
  assert.equal(notice.length, 1, JSON.stringify(notice));
  assert.match(notice[0], /^assets\/heart\/ATTRIBUTION\.md: belongs only to assets no published model uses \(hubmap-vh-m-heart, hubmap-vh-m-blood-vasculature\), but it shipped/);

  // A notice shared with a published asset is not withheld by the withheld one.
  const onlyT1 = withheldDeliveryPaths({ assets: ASSET_MANIFEST, requiredAssetIds: new Set(['mri-icbm152-t1']) });
  assert.ok(onlyT1.includes('assets/mri/t2.u8.gz'));
  assert.ok(!onlyT1.includes('assets/mri/ATTRIBUTION.md'), 'the notice still has a published asset to speak for');
  assert.ok(!onlyT1.includes('assets/mri/atlas.json'), 'and so does the index');

  // Publishing nothing withholds every delivered file an asset accounts for.
  const none = withheldDeliveryPaths({ assets: ASSET_MANIFEST, requiredAssetIds: new Set() });
  for (const file of CORRECT_PUBLIC.filter((entry) => /^assets\/(brain|mri|heart)\/[^/]+$/.test(entry))) {
    assert.ok(none.includes(file), `${file} would ship with nothing published`);
  }
  // The decoder is shared runtime code, not an asset, and is never in the set.
  assert.ok(!none.some((file) => file.includes('/draco/')));
});

test('asset delivery: the picture of a withheld model is in public/ and not in the build', () => {
  // `posters/` is excused as a folder, so the photograph of `cardiac-output`
  // went on shipping after the launch scope closed the model it is a picture of.
  const posters = withheldPosterFiles(MODEL_SHOWCASE, RELEASED_SCENES);
  assert.deepEqual(posters.map((entry) => entry.path), ['posters/cardiac-output.jpg']);
  assert.match(posters[0].why, /"cardiac-output", which the release does not open/);
  // Published, it is not withheld — and a model with no picture names no file.
  assert.deepEqual(withheldPosterFiles(MODEL_SHOWCASE, [...RELEASED_SCENES, sceneById('cardiac-output')]), []);
  assert.deepEqual(withheldPosterFiles({ a: { poster: null }, b: {} }, []), []);

  const withPoster = [...CORRECT_PUBLIC, 'posters/cardiac-output.jpg'];
  // Absent from the build: correct, and not "did not reach the build".
  assert.deepEqual(problemsFor(CORRECT_BUILD, { publicFiles: withPoster, withheldFiles: posters }), []);
  // Shipped: named, with whose picture it is.
  const shipped = problemsFor([...CORRECT_BUILD, 'posters/cardiac-output.jpg'], { publicFiles: withPoster, withheldFiles: posters });
  assert.deepEqual(shipped, [
    'posters/cardiac-output.jpg: is the model-card picture of "cardiac-output", which the release does not open, but it shipped',
  ]);
  // And without being told it is withheld, the folder's excuse lets it through
  // — which is the hole, kept visible here so nobody mistakes the folder for a rule.
  assert.deepEqual(problemsFor([...CORRECT_BUILD, 'posters/cardiac-output.jpg'], { publicFiles: withPoster }), []);
});

test('asset delivery: an index travels with the assets it indexes, both ways', () => {
  for (const entry of ASSET_COMPANION_FILES) {
    assert.ok(entry.reason?.trim().length > 20, `${entry.path} is declared without a reason`);
    assert.doesNotMatch(entry.path, /\/$/, `${entry.path} is a directory`);
    assert.ok(entry.assets.length > 0, `${entry.path} names no asset`);
    for (const id of entry.assets) assert.ok(assetById(id), `${entry.path}: "${id}" is not in the manifest`);
    assert.ok(CORRECT_PUBLIC.includes(entry.path));
  }

  // Published, and missing from the build.
  const without = CORRECT_BUILD.filter((file) => file !== 'assets/mri/atlas.json');
  assert.ok(
    problemsFor(without).some((line) => /assets\/mri\/atlas\.json: is in public\/ and did not reach the build/.test(line)),
    JSON.stringify(problemsFor(without))
  );
  const gone = problemsFor(without, { publicFiles: CORRECT_PUBLIC.filter((file) => file !== 'assets/mri/atlas.json') });
  assert.ok(
    gone.some((line) => /assets\/mri\/atlas\.json: a published model needs it/.test(line)),
    JSON.stringify(gone)
  );

  // Withheld with everything it indexes, and shipped anyway.
  const brainOnly = new Set(['brain-atlas-glb']);
  const shippedIndex = problemsFor(
    CORRECT_BUILD.filter((file) => !file.startsWith('assets/mri/') || file === 'assets/mri/atlas.json'),
    { requiredAssetIds: brainOnly }
  );
  assert.equal(shippedIndex.length, 1, JSON.stringify(shippedIndex));
  assert.match(shippedIndex[0], /^assets\/mri\/atlas\.json: belongs only to assets no published model uses/);

  // And undeclared, it is one more file nobody accounted for.
  const undeclared = problemsFor(CORRECT_BUILD, { companionFiles: [] });
  assert.ok(
    undeclared.some((line) => /^assets\/mri\/atlas\.json: is in no manifest entry/.test(line)),
    JSON.stringify(undeclared)
  );
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
    const problems = problemsFor([...CORRECT_BUILD, intruder], {
      publicFiles: [...CORRECT_PUBLIC, intruder],
    });
    assert.ok(problems.length >= 1, `${intruder}: nothing reported`);
    assert.ok(problems.every((line) => line.startsWith(`${intruder}: `)), JSON.stringify(problems));
    assert.ok(problems.some((line) => /is in no manifest entry|is a model file/.test(line)), JSON.stringify(problems));
  }
});

test('asset delivery: an unregistered model in a folder of its own is caught', () => {
  // The hole the first version had. It only looked inside directories a
  // *registered* asset already delivered into, so the way past it was not to
  // hide a mesh among the accounted files — it was to put it anywhere else.
  // `public/models/heart.glb` was invisible to the check and shipped.
  for (const intruder of [
    'models/heart.glb',
    'meshes/liver/liver.glb',
    'assets/heart/heart.gltf',
    'downloads/atlas.usdz',
    'social/lung.glb',
  ]) {
    const problems = problemsFor([...CORRECT_BUILD, intruder], {
      publicFiles: [...CORRECT_PUBLIC, intruder],
    });
    assert.ok(problems.length >= 1, `${intruder}: nothing reported`);
    assert.ok(problems.every((line) => line.startsWith(`${intruder}: `)), JSON.stringify(problems));
    assert.ok(
      problems.some((line) => /is a model file/.test(line)),
      `${intruder}: ${JSON.stringify(problems)}`
    );
  }
});

test('asset delivery: the shared decoder folder is a list of files, not a licence to ship', () => {
  // The second hole: the decoder was allowed by directory prefix, so anything
  // put beside it inherited that permission. A mesh is not a decoder.
  for (const intruder of [
    'assets/brain/draco/heart.glb',
    'assets/brain/draco/extra.bin',
    'assets/brain/draco/draco_decoder_next.wasm',
  ]) {
    const problems = problemsFor([...CORRECT_BUILD, intruder], {
      publicFiles: [...CORRECT_PUBLIC, intruder],
    });
    assert.ok(problems.length >= 1, `${intruder}: nothing reported`);
    assert.ok(problems.every((line) => line.startsWith(`${intruder}: `)), JSON.stringify(problems));
  }

  // And the decoder itself is declared file by file, so a version bump has to
  // be an edit somebody makes rather than a folder that keeps letting things in.
  for (const entry of SHARED_RUNTIME_FILES) {
    assert.doesNotMatch(entry.path, /\/$/, `${entry.path} is a directory, and a directory is not a list`);
    assert.ok(CORRECT_PUBLIC.includes(entry.path), `${entry.path} is not in public/`);
  }
});

test('asset delivery: Vite output is not judged as a forgotten medical asset', () => {
  // Hashed chunks live in `assets/` too. Reading them as unregistered assets
  // would make the check fail on every build, which is how a check gets muted.
  const problems = problemsFor(CORRECT_BUILD);
  assert.deepEqual(problems, []);

  // A build output that *is* a model file is still worth saying, because a mesh
  // imported through the bundler has the same provenance question as one in
  // `public/` — and no manifest entry.
  const bundled = problemsFor([...CORRECT_BUILD, 'assets/atlas-9f8e7d.glb']);
  assert.ok(bundled.some((line) => /^assets\/atlas-9f8e7d\.glb: .*is a model file/.test(line)), JSON.stringify(bundled));
});

test('asset delivery: a registered asset no published model uses must not ship', () => {
  // Simulated on the manifest rather than on a name: the same file, the same
  // path, and the only thing that changed is whether a published model needs it.
  const brain = assetById('brain-atlas-glb');
  assert.ok(brain, 'the brain mesh is the asset this case is built on');

  const withheld = problemsFor(BUILD_WITH_HEART, { requiredAssetIds: new Set() });
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
  const without = CORRECT_BUILD.filter((file) => !file.startsWith('assets/brain/draco/'));
  const problems = problemsFor(without, {
    publicFiles: CORRECT_PUBLIC.filter((file) => !file.startsWith('assets/brain/draco/')),
  });
  assert.ok(
    problems.some((line) => /shared runtime "assets\/brain\/draco\/draco_decoder\.wasm" is declared but did not ship/.test(line)),
    JSON.stringify(problems)
  );

  // Every declared exception says why it is allowed, because the next person to
  // read the list has to be able to decide whether it still applies.
  for (const entry of [...SHARED_RUNTIME_FILES, ...SITE_SURFACE_PATHS]) {
    assert.ok(entry.reason?.trim().length > 20, `${entry.path} is declared without a reason`);
  }
});

test('asset delivery: a public file nobody accounted for is caught wherever it is', () => {
  // Not a model file, not a card, not a notice, not a decoder: just a file that
  // ships to everyone and that no part of the repository explains.
  for (const stray of ['secrets.env', 'notes/todo.md', 'assets/readme.txt']) {
    const problems = problemsFor([...CORRECT_BUILD, stray], { publicFiles: [...CORRECT_PUBLIC, stray] });
    assert.ok(
      problems.some((line) => line.startsWith(`${stray}: `) && /is in no manifest entry/.test(line)),
      `${stray}: ${JSON.stringify(problems)}`
    );
  }

  // And a public file that did not reach the build is a build problem, not a
  // silent one.
  const missing = problemsFor(CORRECT_BUILD.filter((file) => file !== 'social/site.png'));
  assert.ok(missing.some((line) => /social\/site\.png: is in public\/ and did not reach the build/.test(line)), JSON.stringify(missing));
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
  const walkFrom = (root) => {
    const walk = (dir) =>
      readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry);
        return statSync(full).isDirectory() ? walk(full) : [relative(root, full).split(sep).join('/')];
      });
    return walk(root);
  };
  const publicRoot = new URL('../public', import.meta.url).pathname;
  assert.deepEqual(
    problemsFor(walkFrom(dist.pathname), {
      publicFiles: walkFrom(publicRoot),
      withheldFiles: withheldPosterFiles(MODEL_SHOWCASE, RELEASED_SCENES),
    }),
    []
  );
});
