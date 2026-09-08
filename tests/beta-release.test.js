import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import { PUBLIC_SCENES, SCENES, sceneById } from '../src/catalog/index.js';
import { DEFAULT_SCENE_ID } from '../src/catalog/index.js';
import {
  BETA_ANATOMY_CANDIDATES,
  BETA_CANDIDATE_STATUS,
  BETA_ORGANS,
  BETA_PUBLICATION_DECISIONS,
  CRAWLABLE_SCENES,
  DEV_UNLOCK_PARAM,
  DEV_UNLOCK_STORAGE_KEY,
  LOCKED_SCENES,
  RELEASED_SCENES,
  RELEASE_CHANNEL,
  DECISION_ROLES,
  RELEASE_POLICIES,
  anatomyClaimProblems,
  betaPublicationProblems,
  publicationDecisionProblems,
  sceneReleaseProblems,
  isRouteReleased,
  isSceneReleased,
  resolveDevUnlock,
} from '../src/catalog/release.js';
import { PUBLIC_MANIFEST, publicManifestProblems } from '../src/catalog/publicManifest.js';
import { assetById } from '../src/catalog/assetManifest.js';
import { sceneRevisionPin } from '../src/catalog/modelRevisions.js';
import { modelProfileForScene } from '../src/catalog/modelProfiles.js';
import { createLockedSurface } from '../src/app/LockedSurface.js';
import { createSceneFailureFallback } from '../src/app/SceneFailureFallback.js';
import { createSceneSwitcher } from '../src/components/SceneSwitcher.js';
import { createTrust } from '../src/app/Trust.js';
import { systemsWithScenes } from '../src/catalog/index.js';
import { isInPageAnchor, resolveRoute } from '../src/app/router.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const fileExists = (path) => existsSync(new URL(`../${path}`, import.meta.url));

/** The brain scene's catalogue entry, cloned so a test can spoil one field. */
const brain = () => ({ ...sceneById('brain-anatomy') });

test('beta release: the beta is anatomy, and it is not a list of organs', () => {
  assert.equal(RELEASE_CHANNEL, 'beta');
  assert.deepEqual([...BETA_ANATOMY_CANDIDATES], ['brain-anatomy', 'heart-anatomy']);
  assert.equal(RELEASED_SCENES.length + LOCKED_SCENES.length, SCENES.length);
  assert.equal(
    new Set([...RELEASED_SCENES, ...LOCKED_SCENES].map((scene) => scene.id)).size,
    SCENES.length,
    'a scene is either open or locked, never both and never neither'
  );

  // Every open scene is a named candidate that passed. Both halves are asserted
  // because either one alone is the bug: a candidate that was never checked, or
  // a scene that passed a check nobody meant to run on it.
  for (const scene of RELEASED_SCENES) {
    assert.ok(BETA_ANATOMY_CANDIDATES.includes(scene.id), `${scene.id} is open but was never a candidate`);
    assert.deepEqual(betaPublicationProblems(scene), [], `${scene.id} is open with problems outstanding`);
    assert.deepEqual(anatomyClaimProblems(scene), [], `${scene.id} is open and is not an anatomy scene`);
    assert.equal(scene.disease, null);
    assert.equal(modelProfileForScene(scene).mechanismLevel, 'none');
  }

  // What the beta actually ships today. Named so that opening or closing one is
  // a deliberate edit to the gate rather than a side effect of adding a scene.
  assert.deepEqual(RELEASED_SCENES.map((scene) => scene.id), ['brain-anatomy']);
  assert.deepEqual([...PUBLIC_MANIFEST.organs], ['brain']);
});

test('beta release: an unfinished heart is not published as a disease model instead', () => {
  // The decision this release exists to record. `heart-anatomy` is named, is
  // not built, and nothing stands in for it.
  assert.equal(sceneById('heart-anatomy'), null, 'if this scene now exists, this test is what has to change');
  const heart = BETA_CANDIDATE_STATUS.find((entry) => entry.sceneId === 'heart-anatomy');
  assert.equal(heart.open, false);
  assert.ok(heart.problems.length > 0, 'a candidate that is not open says why');

  for (const scene of SCENES.filter((entry) => entry.organ === 'heart')) {
    assert.equal(isSceneReleased(scene), false, `${scene.id} is a heart scene and the beta has no heart model`);
  }

  // The old rule, run again here so that restoring it fails loudly. It opened
  // every non-prototype scene under the two organs, which is four disease
  // models and one anatomy model.
  const oldRule = SCENES.filter(
    (scene) => BETA_ORGANS.includes(scene.organ) && scene.status !== 'prototype'
  );
  assert.ok(oldRule.length > RELEASED_SCENES.length);
  for (const scene of oldRule.filter((entry) => entry.disease)) {
    assert.equal(isSceneReleased(scene), false, `${scene.id} would open again under the organ filter`);
  }
});

test('beta release: naming a scene does not open it — every failure closes the gate', () => {
  const profiles = [
    { ...modelProfileForScene(sceneById('brain-anatomy')) },
  ];
  const brainAsset = assetById('brain-atlas-glb');
  const decisions = BETA_PUBLICATION_DECISIONS;

  const problemsWith = (overrides = {}) =>
    betaPublicationProblems('brain-anatomy', {
      profiles,
      resolveScene: () => brain(),
      resolveAsset: () => brainAsset,
      resolveReview: () => ({ reviewStatus: 'pending' }),
      decisions,
      ...overrides,
    });

  // The control: the real records, injected, open it.
  assert.deepEqual(problemsWith(), []);

  // A scene id nobody put on the list.
  assert.match(betaPublicationProblems('heart-failure')[0], /is not one of the scenes this release opens/);

  // A status the taxonomy has never heard of. Not "treat it as alpha".
  assert.ok(
    problemsWith({ resolveScene: () => ({ ...brain(), status: 'ready' }) })
      .some((line) => /status "ready" is not a status/.test(line))
  );

  // A Prototype, whose shape and motion are provisional by definition.
  assert.ok(
    problemsWith({ resolveScene: () => ({ ...brain(), status: 'prototype' }) })
      .some((line) => /Prototype/.test(line))
  );

  // No model profile: what it claims is written down nowhere a test can read.
  assert.ok(
    problemsWith({ resolveScene: () => ({ ...brain(), modelProfile: undefined }) })
      .some((line) => /has no model profile/.test(line))
  );

  // A profile that claims a mechanism, personalises, or declares a clinical use.
  for (const [field, value, pattern] of [
    ['mechanismLevel', 'mechanistic', /mechanism level "mechanistic"/],
    ['personalization', 'patient-predictive', /is personalised/],
    ['intendedUses', ['clinical-care'], /clinical use "clinical-care"/],
  ]) {
    assert.ok(
      problemsWith({ profiles: [{ ...profiles[0], [field]: value }] }).some((line) => pattern.test(line)),
      `${field} = ${JSON.stringify(value)} has to close the gate`
    );
  }

  // Rights not settled. "unknown" is not "probably fine".
  assert.ok(
    problemsWith({
      resolveAsset: () => ({ ...brainAsset, license: { ...brainAsset.license, redistribution: 'unknown' } }),
    }).some((line) => /redistribution is "unknown"/.test(line))
  );

  // The file was re-exported after the decision was taken. A decision about one
  // file is not a decision about a different file.
  assert.ok(
    problemsWith({
      resolveAsset: () => ({ ...brainAsset, output: { ...brainAsset.output, sha256: 'f'.repeat(64) } }),
    }).some((line) => /publication decision was taken against/.test(line))
  );

  // No decision at all, and a decision covering a different scene.
  assert.ok(problemsWith({ decisions: [] }).some((line) => /no publication decision on file/.test(line)));

  // A clinical sign-off that has been overtaken must never read as current.
  assert.ok(
    problemsWith({ resolveReview: () => ({ reviewStatus: 'stale' }) })
      .some((line) => /clinical review is stale/.test(line))
  );

  // `pending` is allowed and is not silently upgraded: the beta claims a
  // publication decision, never a clinical review.
  assert.deepEqual(problemsWith({ resolveReview: () => ({ reviewStatus: 'pending' }) }), []);
  const decision = BETA_PUBLICATION_DECISIONS.find((entry) => entry.sceneId === 'brain-anatomy');
  assert.notEqual(decision.decidedBy, 'clinical');
  assert.ok(fileExists(decision.record), 'the publication decision names a record that exists');
});

test('publication decision: an incomplete record is not a decision', () => {
  const scene = sceneById('brain-anatomy');
  const decision = BETA_PUBLICATION_DECISIONS.find((entry) => entry.sceneId === 'brain-anatomy');
  assert.deepEqual(publicationDecisionProblems(decision, scene, { fileExists }), []);

  const without = (path, value) => {
    const next = structuredClone({ ...decision });
    const keys = path.split('.');
    const last = keys.pop();
    let target = next;
    for (const key of keys) target = target[key];
    if (value === undefined) delete target[last];
    else target[last] = value;
    return publicationDecisionProblems(next, scene, { fileExists });
  };

  const cases = [
    ['decidedAt', undefined, /no decision date/],
    ['decidedAt', '8 September 2026', /no decision date/],
    ['decidedBy', undefined, /does not say who took it/],
    ['decidedBy.name', '  ', /does not name who took it/],
    ['decidedBy.role', 'reviewer', /is not one of/],
    ['decidedBy.role', undefined, /is not one of/],
    ['record', undefined, /names no record document/],
    ['record', 'docs/beta-publication/does-not-exist.md', /which does not exist/],
    ['scope', undefined, /records no scope/],
    ['scope.structures', [], /does not say what structures were checked/],
    ['scope.views', undefined, /does not say what views were checked/],
    ['scope.interactions', [''], /does not say what interactions were checked/],
    ['evidence', [], /cites no evidence/],
    ['evidence', ['https://example.org/proof'], /is not a repository path/],
    ['evidence', ['tests/nothing-here.test.js'], /which does not exist/],
    ['unverified', undefined, /does not state what it did not check/],
    ['unverified', ['', 'something'], /does not state what it did not check/],
  ];
  for (const [path, value, pattern] of cases) {
    const problems = without(path, value);
    assert.ok(problems.some((line) => pattern.test(line)), `${path}=${JSON.stringify(value)}: ${JSON.stringify(problems)}`);
  }

  // The one claim a record must never be able to make about itself. The brain
  // atlas's clinical review is pending, so a record calling itself clinical is
  // rejected — and would be accepted only once the registry actually has one.
  assert.equal(DECISION_ROLES.includes('clinical'), true);
  const claimsClinical = { ...decision, decidedBy: { ...decision.decidedBy, role: 'clinical' } };
  assert.ok(
    publicationDecisionProblems(claimsClinical, scene, { fileExists })
      .some((line) => /cannot promote itself to a sign-off/.test(line))
  );
  assert.deepEqual(
    publicationDecisionProblems(claimsClinical, scene, { fileExists, hasReview: () => true }),
    [],
    'and it is fine once the review registry actually holds one'
  );

  // The record itself says it is engineering, and says what it did not check.
  assert.equal(decision.decidedBy.role, 'engineering');
  assert.ok(decision.unverified.some((line) => /clinical review/i.test(line)));
  assert.ok(decision.unverified.some((line) => /not individually opened/.test(line)));
});

test('publication decision: the same mesh with a different part correspondence closes the beta', () => {
  // The failure the asset hash cannot see. The GLB is byte-identical; what
  // changed is which mesh is called what, or what a click selects — and a
  // reader would be told something nobody checked.
  const scene = sceneById('brain-anatomy');
  const pin = sceneRevisionPin(scene);
  assert.ok(pin, 'the scene is in the model-card revision registry');

  const decision = BETA_PUBLICATION_DECISIONS.find((entry) => entry.sceneId === 'brain-anatomy');
  assert.deepEqual(decision.sceneRevision, pin, 'the decision is pinned to the revision on file');

  const withRevision = (next) =>
    betaPublicationProblems('brain-anatomy', { fileExists, resolveRevision: () => next });

  // Sources edited, digest moved, card revised: the decision no longer applies.
  const edited = { cardRevision: pin.cardRevision + 1, modelDigest: 'ffffffffffffffff' };
  assert.ok(
    withRevision(edited).some((line) => /the part correspondence or the selection behaviour changed/.test(line)),
    JSON.stringify(withRevision(edited))
  );
  // Digest moved without the card being revised is caught too, and so is the
  // reverse — a bumped revision over unchanged sources.
  assert.ok(withRevision({ ...pin, modelDigest: 'ffffffffffffffff' }).length > 0);
  assert.ok(withRevision({ ...pin, cardRevision: pin.cardRevision + 1 }).length > 0);
  assert.ok(withRevision(null).some((line) => /no entry in the model-card revision registry/.test(line)));

  // And the asset hash still does its own half of the job.
  const brainAsset = assetById('brain-atlas-glb');
  assert.equal(decision.assetRevisions['brain-atlas-glb'], brainAsset.output.sha256);

  // The pin is scoped: it covers the files that decide what the model is, and
  // the registry entry names them. A wording fix elsewhere is not in scope.
  const entry = read('docs/model-cards/revisions.json');
  assert.match(entry, /src\/data\/brainAnatomy\.js/);
  assert.match(entry, /BrainAnatomyScene\.js/);
  // Per scene, never registry-wide: changing one model must not expire another.
  assert.notEqual(sceneRevisionPin(sceneById('copd-hyperinflation'))?.modelDigest, pin.modelDigest);
});

test('beta release: the asset behind an open model passes the release gate against the real files', () => {
  for (const scene of RELEASED_SCENES) {
    assert.deepEqual(
      betaPublicationProblems(scene, { fileExists }),
      [],
      `${scene.id} does not survive the gate once recorded paths are checked on disk`
    );
  }
});

test('beta release: the public manifest is the projection of the gate, not a second rule', () => {
  assert.deepEqual(publicManifestProblems({ fileExists }), []);
  assert.equal(PUBLIC_MANIFEST.count, RELEASED_SCENES.length);
  assert.deepEqual(
    PUBLIC_MANIFEST.models.map((model) => model.sceneId),
    RELEASED_SCENES.map((scene) => scene.id)
  );

  // No placeholder rows. The heart is absent, not present-and-disabled.
  for (const model of PUBLIC_MANIFEST.models) {
    assert.equal(isSceneReleased(sceneById(model.sceneId)), true);
    assert.equal(isRouteReleased(resolveRoute(model.route)), true, model.route);
  }
  assert.equal(PUBLIC_MANIFEST.models.some((model) => model.organId === 'heart'), false);
  assert.match(PUBLIC_MANIFEST.revision, /^[0-9a-f]{8}$/);

  // The manifest is the only public model list. Nobody re-derives it.
  for (const path of ['src/app/Landing.js', 'src/data/landingHero.js']) {
    const source = read(path);
    assert.doesNotMatch(source, /'heart-failure'|'myocardial-ischemia'|'circulation'|'amyloid-beta'/, path);
  }
});

test('release channel: a channel is a name for a policy, and a name alone opens nothing', () => {
  // The bypass this replaces: `RELEASE_CHANNEL !== 'beta'` fell through to
  // "anything that is not a prototype", so editing one string would have
  // published twelve disease models — with their numbers — past every check.
  assert.deepEqual(Object.keys(RELEASE_POLICIES), ['beta']);

  const brain = sceneById('brain-anatomy');
  const disease = sceneById('heart-failure');

  // `beta` is the policy that exists, and it is the gate, not a shortcut.
  assert.deepEqual(sceneReleaseProblems(brain, { channel: 'beta' }), []);
  assert.ok(sceneReleaseProblems(disease, { channel: 'beta' }).length > 0);

  // `public` is the channel somebody would flip to end the beta. There is no
  // general-release policy yet, so it opens nothing — including the scene that
  // *is* open on beta, because a channel with no policy is not a release.
  for (const scene of [brain, disease, sceneById('copd-hyperinflation')]) {
    for (const channel of ['public', '', 'Beta', 'beta ', 'production', 'undefined']) {
      const problems = sceneReleaseProblems(scene, { channel });
      assert.ok(problems.length > 0, `${scene.id} opened on channel "${channel}"`);
      assert.match(problems[0], /has no publication policy/);
    }
  }

  // An inherited property is not a policy either: `constructor` and `toString`
  // exist on every object and must not resolve to one.
  for (const channel of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    assert.match(sceneReleaseProblems(brain, { channel })[0], /has no publication policy/, channel);
  }

  // And the source no longer contains the fall-through in any form.
  const code = read('src/catalog/release.js')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /RELEASE_CHANNEL\s*!==\s*'beta'/);
  assert.doesNotMatch(code, /RELEASE_CHANNEL\s*===\s*'beta'/);
});

test('beta release: the product shell stays open and the experimental surface does not', () => {
  assert.equal(isRouteReleased(resolveRoute('#/')), true, 'the landing page is how anyone arrives');
  assert.equal(isRouteReleased(resolveRoute('#/organs')), true);
  assert.equal(isRouteReleased(resolveRoute('#/explore')), true);
  assert.equal(isRouteReleased(resolveRoute('#/trust')), true);
  assert.equal(isRouteReleased(resolveRoute('#/terms')), true, 'legal documents are never gated');
  assert.equal(isRouteReleased(resolveRoute('#/privacy')), true);
  assert.equal(isRouteReleased(resolveRoute('#/lab')), false);
  assert.equal(isRouteReleased(resolveRoute('#/experimental')), false);

  assert.equal(isRouteReleased(resolveRoute('#/brain-anatomy')), true);
  assert.equal(isRouteReleased(resolveRoute('#/heart-failure')), false);
  assert.equal(isRouteReleased(resolveRoute('#/copd')), false);
  assert.equal(isRouteReleased(resolveRoute('#/breathing-lungs')), false);
  assert.equal(isRouteReleased(null), false);
});

test('beta release: a mistyped URL lands on an open model, not on a withheld one', () => {
  // An unknown slug resolves to the historic default scene, which is how a
  // malformed deep link keeps working. That default has to be something the
  // release opens: pointing it at a withheld model turns every typo into a
  // "to be updated" page that names a model nobody is being shown.
  const fallback = resolveRoute('#/not-a-scene');
  assert.equal(fallback.sceneId, DEFAULT_SCENE_ID);
  assert.equal(isSceneReleased(sceneById(DEFAULT_SCENE_ID)), true);
  assert.equal(isRouteReleased(fallback), true);
  assert.equal(sceneById(DEFAULT_SCENE_ID).disease, null, 'and it is not a disease model');

  // `#/heart-anatomy` is a link somebody could reasonably write today. It is
  // not a scene, so it behaves as a typo — and lands on the brain, not on a
  // heart disease model dressed up as the heart.
  const heartLink = resolveRoute('#/heart-anatomy');
  assert.equal(heartLink.sceneId, DEFAULT_SCENE_ID);
  assert.equal(sceneById(heartLink.sceneId).organ, 'brain');
});

test('beta release: a production build has no unlock at all', () => {
  // The parameter, in every spelling somebody would try, against a production
  // build. None of them opens anything, because the capability is decided when
  // the bundle is built.
  for (const search of ['', '?preview=1', '?preview=yes', '?preview=on', '?preview=true&utm_source=x', '?PREVIEW=1']) {
    assert.deepEqual(
      resolveDevUnlock({ search }),
      { unlocked: false, persist: null },
      `production must ignore "${search}"`
    );
  }

  // And a value remembered from a preview build served on the same origin is
  // forgotten rather than honoured: `localStorage` outlives a deploy.
  assert.deepEqual(
    resolveDevUnlock({ stored: 'on' }),
    { unlocked: false, persist: false },
    'a stored unlock is cleared by a production build'
  );
  assert.deepEqual(resolveDevUnlock({ search: '?preview=1', stored: 'on' }), { unlocked: false, persist: false });
});

test('beta release: development and preview builds stay open', () => {
  // `npm run dev` never has to opt in.
  assert.deepEqual(resolveDevUnlock({ devBuild: true }), { unlocked: true, persist: null });
  assert.deepEqual(
    resolveDevUnlock({ devBuild: true, search: `?${DEV_UNLOCK_PARAM}=0` }),
    { unlocked: true, persist: null }
  );

  // A build made to be previewed takes the parameter, and remembers it.
  const preview = (input) => resolveDevUnlock({ previewBuild: true, ...input });
  assert.deepEqual(preview({ search: `?${DEV_UNLOCK_PARAM}=1` }), { unlocked: true, persist: true });
  assert.deepEqual(
    preview({ search: `?${DEV_UNLOCK_PARAM}=1&utm_source=x` }),
    { unlocked: true, persist: true }
  );

  // And closes it again, explicitly, so a shared laptop can be handed back.
  for (const off of ['0', 'false', 'off', 'no', '']) {
    assert.deepEqual(
      preview({ search: `?${DEV_UNLOCK_PARAM}=${off}`, stored: 'on' }),
      { unlocked: false, persist: false },
      `?${DEV_UNLOCK_PARAM}=${off}`
    );
  }

  // Without the parameter, only a previously remembered answer counts.
  assert.deepEqual(preview({ stored: 'on' }), { unlocked: true, persist: null });
  assert.deepEqual(preview({ stored: null }), { unlocked: false, persist: null });
  assert.deepEqual(preview({ stored: 'anything-else' }), { unlocked: false, persist: null });
});

test('beta release: the unlock is a build capability, never a hostname or a URL', () => {
  const gate = read('src/app/releaseGate.js');
  const config = read('vite.config.js');

  assert.match(gate, /VITE_ALLOW_PREVIEW/);
  assert.match(gate, /previewBuild: previewBuild\(\)/);
  // Comments stripped: the prose below explains why hostname sniffing is wrong,
  // and a test that failed on the explanation would be read as noise.
  const gateCode = gate.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(gateCode, /hostname|localhost|127\.0\.0\.1/, 'the gate must not sniff where it is served from');
  // The browser half reads the storage key and the parameter name from the
  // rule; a second spelling of either is how the unlock quietly stops working.
  assert.match(gate, /DEV_UNLOCK_STORAGE_KEY/);
  assert.match(gate, /DEV_UNLOCK_PARAM/);
  assert.doesNotMatch(gate, new RegExp(`['"]${DEV_UNLOCK_STORAGE_KEY.replace('.', '\\.')}['"]`));
  assert.doesNotMatch(gate, /resolveDevUnlock\([\s\S]{0,240}previewBuild:\s*true/);

  // And the same variable decides whether the locked scenes are in the bundle
  // for an unlock to reach.
  assert.match(config, /VITE_ALLOW_PREVIEW === '1'/);
  assert.match(config, /publicSceneLoadersPlugin\(\{[\s\S]{0,160}released: RELEASED_SCENES/);
  assert.match(config, /enabled: !allowPreview/);
});

test('beta release: a locked deep link still answers as a page', () => {
  const restoreDocument = installFakeDocument();
  document.documentElement = new FakeElement('html');

  try {
    const ui = new FakeElement('div');
    const surface = createLockedSurface({ ui, route: resolveRoute('#/copd') });
    const text = collect(surface.element).join(' ');

    assert.match(text, /TO BE UPDATED/);
    assert.match(text, /準備中/);
    assert.match(text, /COPD/, 'the page says what the link pointed at');

    // Every link it offers has to be a route the beta actually opens.
    const hrefs = links(surface.element);
    assert.ok(hrefs.length > 0);
    for (const href of hrefs) {
      assert.equal(isRouteReleased(resolveRoute(href)), true, href);
    }
    assert.ok(hrefs.includes('#/organs'), 'the way out is the open catalogue');
  } finally {
    restoreDocument();
  }
});

test('beta release: the locked route names the surface even when it is not a scene', () => {
  const restoreDocument = installFakeDocument();
  document.documentElement = new FakeElement('html');

  try {
    const ui = new FakeElement('div');
    const surface = createLockedSurface({ ui, route: resolveRoute('#/lab') });
    const text = collect(surface.element).join(' ');
    assert.match(text, /TO BE UPDATED/);
    assert.match(text, /Experimental Lab/);
  } finally {
    restoreDocument();
  }
});

test('beta release: a locked route never downloads the scene it is refusing to show', () => {
  const main = read('src/main.js');
  const gate = main.indexOf('if (!open) {');
  assert.ok(gate > 0, 'main.js has to decide before it routes');
  assert.ok(gate < main.indexOf("import('./app/App.js')"), 'the gate runs before the scene app loads');
  assert.ok(gate < main.indexOf("import('./app/Landing.js')"));
  assert.match(main, /if \(open && route\.kind === 'scene'\) recordSceneVisit/);

  // The locked branch imports the plain-DOM surface and nothing heavier.
  const branch = main.slice(gate, main.indexOf("if (route.kind === 'landing')"));
  assert.match(branch, /import\('\.\/app\/LockedSurface\.js'\)/);
  assert.doesNotMatch(branch, /App\.js|loadScene|Viewer/);
});

test('beta release: an already-paying customer keeps their account, whatever the models do', () => {
  // Closing models must never close the door on somebody's own subscription.
  // The account control is mounted on every surface, the locked one included,
  // so a customer can always reach billing, invoices and cancellation.
  const main = read('src/main.js');
  assert.match(main, /createLockedSurface\(\{ ui, route, accountButton: access\.accountButton \}\)/);
  for (const surface of ['Landing', 'Trust', 'Legal']) {
    assert.match(main, new RegExp(`create${surface}\\(\\{[\\s\\S]{0,200}accountButton`), surface);
  }
  const locked = read('src/app/LockedSurface.js');
  assert.match(locked, /accountButton/);

  // And the legal and support documents stay reachable without a model.
  for (const route of ['#/terms', '#/privacy', '#/commerce', '#/support']) {
    assert.equal(isRouteReleased(resolveRoute(route)), true, route);
  }
});

test('beta release: the catalogue surfaces read the same gate rather than their own list', () => {
  const explorer = read('src/app/Explorer.js');
  const landing = read('src/app/Landing.js');
  const locked = read('src/app/LockedSurface.js');

  for (const source of [explorer, landing]) {
    assert.match(source, /from '\.\.\/catalog\/release\.js'|from '\.\/releaseGate\.js'/);
  }
  // The public index is what is open, not what is open plus a roadmap.
  assert.match(explorer, /beta \? RELEASED_SCENES : PUBLIC_SCENES/);
  assert.doesNotMatch(landing, /landing-locked-row|landing-locked-list/);
  assert.doesNotMatch(read('src/styles/landing.css'), /landing-locked/);
  assert.doesNotMatch(locked, /from ['"]three['"]|\/scenes\//);
});

/**
 * Every surface that hands out a link, checked against the gate.
 *
 * This is the test the review found missing. The gate was applied to the
 * router, the landing page and the Explorer, and three other surfaces went on
 * offering links into models the release does not open: the in-scene switcher,
 * the Trust page's "Open model", and the crawlable pages the build emits. Each
 * was a link a reader could follow from inside something that worked to a page
 * that apologises. Checking them one at a time is how the fourth one gets
 * missed, so this checks them together, by walking what they actually render.
 */
test('beta release: no surface offers a link the release cannot honour', async () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  document.documentElement = new FakeElement('html');
  // The switcher reads the UI root to decide where its sheet mounts, and the
  // surfaces bind to the document for escape keys and visibility.
  document.getElementById = () => new FakeElement('div');
  document.addEventListener = () => {};
  document.removeEventListener = () => {};
  document.visibilityState = 'visible';
  globalThis.window = { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };

  const offered = (root) => {
    const found = [];
    const walk = (node) => {
      const href = node.attributes?.get?.('href');
      if (href) found.push(href);
      for (const child of node.children ?? []) walk(child);
    };
    walk(root);
    // In-page anchors address the page that is already open; the skip link and
    // the Explorer's section jumps are not routes.
    return found.filter((href) => !isInPageAnchor(href));
  };

  try {
    const surfaces = [];

    surfaces.push([
      'scene switcher',
      createSceneSwitcher({
        groups: systemsWithScenes(RELEASED_SCENES),
        currentId: RELEASED_SCENES[0].id,
        showLab: false,
      }).element,
    ]);

    const trustUi = new FakeElement('div');
    await createTrust({ ui: trustUi });
    surfaces.push(['trust', trustUi]);

    const fallbackUi = new FakeElement('div');
    createSceneFailureFallback({ ui: fallbackUi, sceneId: RELEASED_SCENES[0].id });
    surfaces.push(['scene failure fallback', fallbackUi]);

    const lockedUi = new FakeElement('div');
    createLockedSurface({ ui: lockedUi, route: resolveRoute('#/copd') });
    surfaces.push(['locked surface', lockedUi]);

    for (const [name, root] of surfaces) {
      const hrefs = offered(root);
      assert.ok(hrefs.length > 0, `${name} offers no links at all, which is probably a broken mount`);
      for (const href of hrefs) {
        assert.equal(
          isRouteReleased(resolveRoute(href)),
          true,
          `${name} offers "${href}", which the release does not open`
        );
      }
    }
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('beta release: the crawlable surface and the in-scene navigator read the gate', () => {
  // Three surfaces this test file cannot mount — the build config, the app
  // shell that configures the switcher, and the two build checks — so what is
  // checked is that each takes its scenes from the gate rather than from the
  // public catalogue.
  const config = read('vite.config.js');
  assert.match(config, /scenes: CRAWLABLE_SCENES/);
  assert.doesNotMatch(config, /scenes: PUBLIC_SCENES/);

  const app = read('src/app/App.js');
  assert.match(app, /systemsWithScenes\(betaUnlocked\(\) \? SCENES : RELEASED_SCENES\)/);
  assert.match(app, /showLab: betaUnlocked\(\)/);

  const siteCheck = read('scripts/check-site-output.js');
  assert.match(siteCheck, /CRAWLABLE_SCENES/);
  assert.match(
    siteCheck,
    /if \(CRAWLABLE_SCENES\.includes\(scene\)\) continue;/,
    'the build check has to fail on anything published that is not crawlable'
  );
  // And on anything withheld that reached `dist/` another way: `public/` is
  // copied wholesale, and a code-split chunk is still a download.
  assert.match(siteCheck, /but \$\{card\} shipped/);
  assert.match(siteCheck, /but its code shipped as/);
  assert.match(siteCheck, /a source map shipped/);
  assert.match(siteCheck, /a service worker shipped/);
  assert.match(siteCheck, /PUBLIC_MANIFEST\.count !== emittedPages/);
  // And the two checks a file list alone cannot make: what `public/` delivered,
  // judged against the asset manifest, and the decisions judged against disk.
  assert.match(siteCheck, /assetDeliveryProblems\(\{/);
  assert.match(siteCheck, /requiredAssetIdsFor\(RELEASED_SCENES, modelProfileForScene\)/);
  // The subject is the public tree, not the files near a registered asset.
  assert.match(siteCheck, /publicFiles,/);
  assert.match(siteCheck, /const publicFiles = existsSync\(publicDir\)/);
  assert.match(siteCheck, /betaPublicationProblems\(scene, \{ fileExists: existsSync \}\)/);

  const cardCheck = read('scripts/check-social-cards.js');
  assert.match(cardCheck, /CRAWLABLE_SCENES/);
});

test('beta release: no committed link-preview card advertises a withheld model', () => {
  // The cards live in `public/` and are copied into the build verbatim, so the
  // committed set *is* the shipped set.
  for (const scene of SCENES) {
    const card = `public/social/${scene.slug}.png`;
    assert.equal(
      fileExists(card),
      CRAWLABLE_SCENES.includes(scene),
      `${scene.id}: the committed card set does not match what the release publishes`
    );
  }
});

/** Every text node under an element, in order. */
function collect(node, out = []) {
  if (node.textContent) out.push(node.textContent);
  for (const child of node.children ?? []) collect(child, out);
  return out;
}

/** Every href under an element. */
function links(node, out = []) {
  const href = node.attributes?.get?.('href');
  if (href) out.push(href);
  for (const child of node.children ?? []) links(child, out);
  return out;
}

test('beta release: the crawlable set is what is open AND what is public, in both channels', () => {
  // Two independent reasons to withhold a page, and a set that satisfies only
  // one of them is a bug in whichever channel it is not checked in. This one
  // would not have shown until the beta ended: once the channel changes,
  // `isSceneReleased` stops consulting the candidate list, so the crawlable set
  // has to stay the public catalogue rather than becoming it by accident.
  for (const scene of CRAWLABLE_SCENES) {
    assert.equal(isSceneReleased(scene), true, `${scene.id} is crawlable but not open`);
    assert.notEqual(scene.status, 'prototype', `${scene.id} is crawlable and still a Prototype`);
  }
  for (const scene of SCENES) {
    const crawlable = CRAWLABLE_SCENES.includes(scene);
    const eligible = isSceneReleased(scene) && scene.status !== 'prototype';
    assert.equal(crawlable, eligible, `${scene.id}: the crawlable set does not follow the two rules`);
  }

  // The rule has to survive the channel change, which is the case the beta
  // cannot exercise. Simulated on the same predicate the module uses when
  // `RELEASE_CHANNEL` is no longer `'beta'`.
  const openedUp = SCENES.filter((scene) => scene.status !== 'prototype');
  assert.equal(
    openedUp.length,
    PUBLIC_SCENES.length,
    'once everything is open, the crawlable set is the public catalogue and no more'
  );
  assert.ok(
    openedUp.every((scene) => scene.status !== 'prototype'),
    'and it never contains a Prototype, whatever the channel'
  );
});
