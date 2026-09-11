import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';
import { SCENES, ORGANS, sceneById } from '../src/catalog/index.js';
import { modelCardForScene } from '../src/catalog/clinicalReview.js';
import { ASSET_MANIFEST, ASSET_SOURCE_TYPE, QA_GATE, QA_STATUS, assetById } from '../src/catalog/assetManifest.js';
import {
  MODEL_PROFILES,
  MODEL_PROFILE_SCHEMA_VERSION,
  GEOMETRY_BASIS,
  MECHANISM_LEVEL,
  PERSONALIZATION,
  INTENDED_USE,
  PROHIBITED_USE,
  CORE_PROHIBITED_USES,
  CLINICAL_INTENDED_USES,
  PATIENT_SPECIFIC_PERSONALIZATION,
  assetOrganProblems,
  geometryBasisProblems,
  modelProfileById,
  modelProfileForScene,
  modelProfileProblems,
  profileCandidateAssets,
  validateModelProfiles,
} from '../src/catalog/modelProfiles.js';
import { devAssetById } from '../src/catalog/devAssets.js';
import { materialFixture, meshFixture, meshOfType, withQa } from './helpers/assetFixtures.js';

/**
 * The model-profile contract: what kind of claim each scene makes, in a
 * closed vocabulary, and what the current public product may not claim.
 *
 * Test names are the policy. A failure here is not a physiology failure — it
 * is a scene claiming more than the product has a release surface for, or a
 * registry that no longer describes the catalogue.
 */

const NON_PROTOTYPE = SCENES.filter((scene) => scene.status !== 'prototype');
const fileExists = (path) => existsSync(new URL(`../${path}`, import.meta.url));
const modelCardFor = (scene) => scene.modelCard ?? modelCardForScene(scene);
const has = (problems, pattern) => problems.some((line) => pattern.test(line));

/** A profile that passes on its own, to be broken one field at a time. */
const wellFormed = (overrides = {}) => ({
  profileId: 'fixture-profile',
  schemaVersion: MODEL_PROFILE_SCHEMA_VERSION,
  geometryBasis: GEOMETRY_BASIS.PROCEDURAL,
  mechanismLevel: MECHANISM_LEVEL.MECHANISTIC,
  personalization: PERSONALIZATION.REPRESENTATIVE,
  intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.MEDICAL_EDUCATION],
  prohibitedUses: [...CORE_PROHIBITED_USES],
  assets: [],
  validationRecords: [],
  basis: 'A fixture.',
  ...overrides,
});

/** A scene manifest entry shaped like the real ones, without a loader. */
const fixtureScene = (overrides = {}) => ({
  id: 'fixture-scene',
  status: 'alpha',
  organ: 'heart',
  organs: ['heart'],
  modelCard: 'docs/model-cards/fixture.md',
  modelProfile: 'fixture-profile',
  ...overrides,
});

/** A resolver over a list of fixture assets. */
const assetsById = (assets) => (id) => assets.find((asset) => asset.assetId === id) ?? null;

const problemsOf = (profile, scene, extra = {}) =>
  modelProfileProblems({ scenes: [scene], profiles: [profile], ...extra });

// ---------------------------------------------------------------------------
// The registry as it stands

test('the model-profile registry is well formed and every scene reference resolves', () => {
  // The real registry, with the candidate lookup wired in — the one caller that
  // has any business knowing the development-only registry exists.
  assert.deepEqual(validateModelProfiles(MODEL_PROFILES, { candidateAssetById: devAssetById }), []);
  assert.deepEqual(modelProfileProblems({ scenes: SCENE_MANIFEST, assetById, modelCardFor, fileExists }), []);
});

test('profile ids are unique', () => {
  const ids = MODEL_PROFILES.map((profile) => profile.profileId);
  assert.equal(new Set(ids).size, ids.length);
});

test('every non-prototype scene references a profile, and every profile is referenced by a scene', () => {
  for (const scene of NON_PROTOTYPE) {
    assert.ok(modelProfileForScene(scene), `${scene.id} (${scene.status}) has a resolvable model profile`);
  }
  const referenced = new Set(SCENES.map((scene) => scene.modelProfile).filter(Boolean));
  for (const profile of MODEL_PROFILES) {
    assert.ok(referenced.has(profile.profileId), `${profile.profileId} is used by a scene rather than orphaned`);
  }
});

test('prototype scenes carry no profile today, so none of them claims a mechanism', () => {
  for (const scene of SCENES.filter((entry) => entry.status === 'prototype')) {
    assert.equal(scene.modelProfile, undefined, `${scene.id} is a sketch and does not classify itself`);
  }
});

// ---------------------------------------------------------------------------
// What the public product may claim

test('no scene in the public app declares clinical research or clinical care as an intended use', () => {
  for (const scene of SCENES) {
    const profile = modelProfileForScene(scene);
    if (!profile) continue;
    for (const use of CLINICAL_INTENDED_USES) {
      assert.ok(!profile.intendedUses.includes(use), `${scene.id} does not claim "${use}"`);
    }
  }
});

test('no scene in the public app is patient-derived or patient-predictive', () => {
  for (const scene of SCENES) {
    const profile = modelProfileForScene(scene);
    if (!profile) continue;
    assert.ok(!PATIENT_SPECIFIC_PERSONALIZATION.includes(profile.personalization), `${scene.id} represents nobody in particular`);
  }
});

test('no scene in the public app claims external validation, and every current scene is representative', () => {
  for (const scene of NON_PROTOTYPE) {
    const profile = modelProfileForScene(scene);
    assert.notEqual(profile.mechanismLevel, MECHANISM_LEVEL.EXTERNALLY_VALIDATED, scene.id);
    assert.equal(profile.personalization, PERSONALIZATION.REPRESENTATIVE, scene.id);
  }
});

test('every profile prohibits diagnosis, treatment selection and dose selection', () => {
  for (const profile of MODEL_PROFILES) {
    for (const use of CORE_PROHIBITED_USES) {
      assert.ok(profile.prohibitedUses.includes(use), `${profile.profileId} prohibits ${use}`);
    }
  }
});

test('every solver scene is mechanistic, amyloid is illustrative and the brain atlas claims no mechanism', () => {
  // Listed exhaustively rather than counted: a new scene has to be classified
  // deliberately here, which is the point of the registry.
  const levels = Object.fromEntries(NON_PROTOTYPE.map((scene) => [scene.id, modelProfileForScene(scene).mechanismLevel]));
  assert.deepEqual(levels, {
    'brain-anatomy': MECHANISM_LEVEL.NONE,
    'heart-anatomy': MECHANISM_LEVEL.NONE,
    // Organs whose anatomy is built in code rather than loaded from an
    // atlas. Same claim shape as the brain's — structure, no state — and the
    // geometry basis below is where the difference is recorded.
    'lung-anatomy': MECHANISM_LEVEL.NONE,
    'liver-anatomy': MECHANISM_LEVEL.NONE,
    'kidney-anatomy': MECHANISM_LEVEL.NONE,
    'stomach-anatomy': MECHANISM_LEVEL.NONE,
    'intestine-anatomy': MECHANISM_LEVEL.NONE,
    'pancreas-anatomy': MECHANISM_LEVEL.NONE,
    'thyroid-anatomy': MECHANISM_LEVEL.NONE,
    'spleen-anatomy': MECHANISM_LEVEL.NONE,
    'bladder-anatomy': MECHANISM_LEVEL.NONE,
    'biliary-anatomy': MECHANISM_LEVEL.NONE,
    'esophagus-anatomy': MECHANISM_LEVEL.NONE,
    'adrenal-anatomy': MECHANISM_LEVEL.NONE,
    'uterus-anatomy': MECHANISM_LEVEL.NONE,
    'prostate-anatomy': MECHANISM_LEVEL.NONE,
    'male-tract-anatomy': MECHANISM_LEVEL.NONE,
    'knee-anatomy': MECHANISM_LEVEL.NONE,
    'shoulder-anatomy': MECHANISM_LEVEL.NONE,
    'hip-anatomy': MECHANISM_LEVEL.NONE,
    'hand-anatomy': MECHANISM_LEVEL.NONE,
    'pelvic-floor-anatomy': MECHANISM_LEVEL.NONE,
    'oral-anatomy': MECHANISM_LEVEL.NONE,
    'larynx-anatomy': MECHANISM_LEVEL.NONE,
    'nose-anatomy': MECHANISM_LEVEL.NONE,
    'spine-anatomy': MECHANISM_LEVEL.NONE,
    'breast-anatomy': MECHANISM_LEVEL.NONE,
    'lymphatic-drainage': MECHANISM_LEVEL.NONE,
    'lymph-node-anatomy': MECHANISM_LEVEL.NONE,
    'skin-anatomy': MECHANISM_LEVEL.NONE,
    'ear-anatomy': MECHANISM_LEVEL.NONE,
    'eye-anatomy': MECHANISM_LEVEL.NONE,
    'amyloid-beta': MECHANISM_LEVEL.ILLUSTRATIVE,
    'heart-failure': MECHANISM_LEVEL.MECHANISTIC,
    circulation: MECHANISM_LEVEL.MECHANISTIC,
    'myocardial-ischemia': MECHANISM_LEVEL.MECHANISTIC,
    'copd-hyperinflation': MECHANISM_LEVEL.MECHANISTIC,
    'asthma-heterogeneity': MECHANISM_LEVEL.MECHANISTIC,
    'pulmonary-edema': MECHANISM_LEVEL.MECHANISTIC,
    'pneumonia-consolidation': MECHANISM_LEVEL.MECHANISTIC,
    'pulmonary-embolism': MECHANISM_LEVEL.MECHANISTIC,
    'portal-hypertension': MECHANISM_LEVEL.MECHANISTIC,
    'hepatorenal-syndrome': MECHANISM_LEVEL.MECHANISTIC,
    'renal-filtration': MECHANISM_LEVEL.MECHANISTIC,
    'biliary-obstruction': MECHANISM_LEVEL.MECHANISTIC,
    'benign-prostatic-enlargement': MECHANISM_LEVEL.ILLUSTRATIVE,
    achalasia: MECHANISM_LEVEL.MECHANISTIC,
  });
});

test('the ischemia scene forbids planning a procedure as well as choosing a treatment', () => {
  // Its subject is which artery feeds which wall, which is exactly the reading
  // somebody could mistake for a revascularisation decision. The card says it
  // is not a stenosis-to-flow calculation and not anyone's coronary anatomy.
  const profile = modelProfileById('myocardial-ischemia-supply-demand');
  assert.ok(profile.prohibitedUses.includes(PROHIBITED_USE.PROCEDURE_PLANNING));
  assert.ok(profile.prohibitedUses.includes(PROHIBITED_USE.PROGNOSIS));
});

test('every scene with a paid patient capability declares patient-explanation', () => {
  for (const scene of NON_PROTOTYPE.filter((entry) => entry.access?.patient === true)) {
    assert.ok(modelProfileForScene(scene).intendedUses.includes(INTENDED_USE.PATIENT_EXPLANATION), scene.id);
  }
});

test('the two atlas scenes are the only asset-backed geometry, and each names a real file', () => {
  const backed = NON_PROTOTYPE.filter((scene) => modelProfileForScene(scene).geometryBasis !== GEOMETRY_BASIS.PROCEDURAL);
  assert.deepEqual(backed.map((scene) => scene.id), ['brain-anatomy', 'heart-anatomy']);
  for (const scene of backed) {
    const profile = modelProfileForScene(scene);
    assert.equal(profile.geometryBasis, GEOMETRY_BASIS.REFERENCE_ATLAS);
    assert.ok(
      profile.prohibitedUses.includes(PROHIBITED_USE.PROCEDURE_PLANNING),
      'the review registry forbids operative planning'
    );
  }

  // The brain draws a shipped asset; the heart draws a candidate under
  // examination. Those are different records in different files, and the
  // difference is the whole reason the heart cannot be published.
  const brain = modelProfileForScene(sceneById('brain-anatomy'));
  for (const id of brain.assets) assert.ok(assetById(id), `${id} is in the asset manifest`);
  assert.deepEqual(profileCandidateAssets(brain), [], 'nothing shipped rests on a candidate');

  const heart = modelProfileForScene(sceneById('heart-anatomy'));
  assert.deepEqual(heart.assets, [], 'the heart file is not in the asset manifest, and is not claimed to be');
  // Both files the scene loads. It draws the heart and the great-vessel
  // geometry, and a profile that lists one of them leaves the other on screen
  // with nobody credited for it — `tests/attribution.test.js` holds that end.
  assert.deepEqual(profileCandidateAssets(heart), ['hubmap-vh-m-heart', 'hubmap-vh-m-blood-vasculature']);
  for (const id of profileCandidateAssets(heart)) {
    assert.ok(devAssetById(id), `${id} is a pinned candidate in devAssets.js`);
    assert.equal(assetById(id), null, `${id} must not be in the asset manifest until it is adopted`);
  }
});

test('a candidate asset satisfies the geometry basis and never the release gate', () => {
  // Two separate questions the registry used to be able to answer only one of:
  // "does this profile say where its geometry comes from" and "may it ship".
  const profile = {
    profileId: 'fixture-candidate-atlas',
    schemaVersion: 1,
    geometryBasis: GEOMETRY_BASIS.REFERENCE_ATLAS,
    mechanismLevel: MECHANISM_LEVEL.NONE,
    personalization: 'representative',
    intendedUses: [INTENDED_USE.GENERAL_EDUCATION],
    prohibitedUses: [...CORE_PROHIBITED_USES],
    assets: [],
    candidateAssets: ['hubmap-vh-m-heart'],
    validationRecords: [],
    basis: 'fixture',
  };
  const resolve = { candidateAssetById: devAssetById };
  assert.deepEqual(validateModelProfiles([profile], resolve), [], 'a candidate answers "where does the geometry come from"');

  const unknown = { ...profile, profileId: 'fixture-unknown-candidate', candidateAssets: ['no-such-candidate'] };
  assert.ok(
    validateModelProfiles([unknown], resolve).some((line) => /is not registered in devAssets/.test(line)),
    'and it has to be a candidate that actually exists'
  );

  const nothing = { ...profile, profileId: 'fixture-no-geometry', candidateAssets: [] };
  assert.ok(
    validateModelProfiles([nothing], resolve).some((line) => /must name at least one asset/.test(line)),
    'naming neither still fails'
  );

  // Production is the line: a scene may be built on a candidate and may not be
  // called finished on one.
  const production = modelProfileProblems({
    scenes: [{ id: 'fixture-scene', status: 'production', organ: 'heart', modelProfile: profile.profileId, modelCard: 'x.md' }],
    profiles: [profile],
    modelCardFor: () => 'x.md',
  });
  assert.ok(production.some((line) => /production scene cannot rest on candidate assets/.test(line)));
});

test('the amyloid scene is illustrative and procedural rather than molecular', () => {
  const profile = modelProfileById('amyloid-beta-aggregation-illustration');
  assert.equal(profile.mechanismLevel, MECHANISM_LEVEL.ILLUSTRATIVE);
  assert.equal(profile.geometryBasis, GEOMETRY_BASIS.PROCEDURAL, 'no PDB structure is behind the particles');
});

test('no profile carries a validation record, because none exists in this repository', () => {
  for (const profile of MODEL_PROFILES) assert.deepEqual(profile.validationRecords, [], profile.profileId);
});

// ---------------------------------------------------------------------------
// The validator rejects what it must, and never throws

test('an unknown value on any axis is rejected', () => {
  for (const [field, value] of [
    ['geometryBasis', 'scanned'],
    ['mechanismLevel', 'accurate'],
    ['personalization', 'personal'],
  ]) {
    const problems = validateModelProfiles([wellFormed({ [field]: value })]);
    assert.ok(problems.some((line) => line.includes(field) && line.includes(value)), `${field}=${value}: ${problems}`);
  }
  assert.ok(has(validateModelProfiles([wellFormed({ intendedUses: ['general-education', 'marketing'] })]), /"marketing"/));
  assert.ok(has(validateModelProfiles([wellFormed({ prohibitedUses: [...CORE_PROHIBITED_USES, 'fun'] })]), /"fun"/));
});

test('a profile whose intendedUses is not an array gets a problem line, not a TypeError, from both validators', () => {
  for (const value of ['general-education', null, 42, { use: 'x' }]) {
    let problems;
    assert.doesNotThrow(() => { problems = validateModelProfiles([wellFormed({ intendedUses: value })]); });
    assert.ok(has(problems, /intendedUses must be an array of non-empty strings/), `${JSON.stringify(value)}: ${problems}`);
    assert.doesNotThrow(() => {
      problems = problemsOf(wellFormed({ intendedUses: value }), fixtureScene({ access: { patient: true } }), { assetById });
    });
    assert.ok(has(problems, /does not declare "patient-explanation"/), 'the cross-check still runs on the rest of the record');
  }
});

test('malformed profiles, scenes and registries of every shape produce problem lines, not exceptions', () => {
  assert.doesNotThrow(() => validateModelProfiles([null, 42, 'profile', [], {}, { profileId: 'x', prohibitedUses: 'none', assets: 7 }]));
  assert.deepEqual(validateModelProfiles('nope'), ['the profile registry is not an array']);
  assert.doesNotThrow(() => modelProfileProblems({ scenes: [null, 'scene', {}, { id: 'a', status: 'alpha', modelProfile: 7 }], profiles: [] }));
  assert.deepEqual(modelProfileProblems({ scenes: 'nope' }), ['scenes is not an array']);
});

test('duplicate ids, duplicate list entries and empty lists are rejected', () => {
  assert.ok(has(validateModelProfiles([wellFormed(), wellFormed()]), /duplicate profileId/));
  assert.ok(has(validateModelProfiles([wellFormed({ intendedUses: ['general-education', 'general-education'] })]), /intendedUses has duplicates/));
  assert.ok(has(validateModelProfiles([wellFormed({ intendedUses: [] })]), /intendedUses is empty/));
  assert.ok(has(validateModelProfiles([wellFormed({ prohibitedUses: ['diagnosis', ''] })]), /prohibitedUses must be an array of non-empty strings/));
});

test('a wrong schema version, a bad id and a missing basis are rejected', () => {
  const problems = validateModelProfiles([wellFormed({ profileId: 'Not Kebab', schemaVersion: 2, basis: '' })]);
  assert.ok(has(problems, /kebab-case/), problems);
  assert.ok(has(problems, /schemaVersion must be 1/), problems);
  assert.ok(has(problems, /basis must say why/), problems);
});

test('schema 1 requires diagnosis, treatment selection and dose selection to be prohibited by every profile, clinical ones included', () => {
  for (const missing of CORE_PROHIBITED_USES) {
    const educational = validateModelProfiles([wellFormed({ prohibitedUses: CORE_PROHIBITED_USES.filter((use) => use !== missing) })]);
    assert.ok(has(educational, new RegExp(`requires every profile to prohibit "${missing}"`)), `${missing}: ${educational}`);
    const clinical = validateModelProfiles([
      wellFormed({
        intendedUses: [INTENDED_USE.CLINICAL_RESEARCH],
        prohibitedUses: CORE_PROHIBITED_USES.filter((use) => use !== missing),
        validationRecords: ['docs/asset-qa/brain-atlas-glb.md'],
      }),
    ]);
    assert.ok(has(clinical, new RegExp(`requires every profile to prohibit "${missing}"`)), `clinical, ${missing}: ${clinical}`);
  }
});

test('claims that need evidence are rejected without a validation record: calibrated, validated, cohort, patient-specific, clinical', () => {
  const cases = [
    { mechanismLevel: MECHANISM_LEVEL.LITERATURE_CALIBRATED },
    { mechanismLevel: MECHANISM_LEVEL.EXTERNALLY_VALIDATED },
    { personalization: PERSONALIZATION.COHORT_DERIVED },
    { personalization: PERSONALIZATION.PATIENT_DERIVED_GEOMETRY },
    { personalization: PERSONALIZATION.PATIENT_PREDICTIVE },
    { intendedUses: [INTENDED_USE.CLINICAL_RESEARCH] },
    { intendedUses: [INTENDED_USE.CLINICAL_CARE] },
  ];
  for (const overrides of cases) {
    const problems = validateModelProfiles([wellFormed(overrides)]);
    assert.ok(has(problems, /require validationRecords/), `${JSON.stringify(overrides)}: ${problems}`);
    assert.deepEqual(validateModelProfiles([wellFormed({ ...overrides, validationRecords: ['docs/asset-qa/brain-atlas-glb.md'] })]), []);
  }
});

test('a validation record must be a repository-relative path that exists', () => {
  for (const bad of ['https://example.invalid/paper', '/etc/passwd', '../outside.md', 'docs//x.md']) {
    const problems = validateModelProfiles([wellFormed({ mechanismLevel: MECHANISM_LEVEL.LITERATURE_CALIBRATED, validationRecords: [bad] })]);
    assert.ok(has(problems, /is not a repository-relative path/), `${bad}: ${problems}`);
  }
  const phantom = wellFormed({ mechanismLevel: MECHANISM_LEVEL.LITERATURE_CALIBRATED, validationRecords: ['docs/validation/does-not-exist.md'] });
  assert.deepEqual(validateModelProfiles([phantom]), [], 'structurally fine');
  const problems = problemsOf(phantom, fixtureScene(), { fileExists });
  assert.ok(has(problems, /"docs\/validation\/does-not-exist.md" does not exist in the repository/), problems);
  const real = wellFormed({ mechanismLevel: MECHANISM_LEVEL.LITERATURE_CALIBRATED, validationRecords: ['docs/asset-qa/brain-atlas-glb.md'] });
  assert.deepEqual(problemsOf(real, fixtureScene(), { fileExists }), [], 'a calibrated claim with a real record is allowed in the public app');
});

test('the public app refuses clinical uses, patient-specific models and external validation even with a record on file', () => {
  const record = ['docs/asset-qa/brain-atlas-glb.md'];
  for (const use of CLINICAL_INTENDED_USES) {
    const problems = problemsOf(wellFormed({ intendedUses: [use], validationRecords: record }), fixtureScene(), { fileExists });
    assert.ok(has(problems, new RegExp(`no release surface for intended use "${use}"`)), `${use}: ${problems}`);
  }
  for (const personalization of PATIENT_SPECIFIC_PERSONALIZATION) {
    for (const status of ['alpha', 'production', 'prototype']) {
      const problems = problemsOf(wellFormed({ personalization, validationRecords: record }), fixtureScene({ status }), { fileExists });
      assert.ok(has(problems, new RegExp(`cannot be "${personalization}"`)), `${status}/${personalization}: ${problems}`);
    }
  }
  const validated = problemsOf(wellFormed({ mechanismLevel: MECHANISM_LEVEL.EXTERNALLY_VALIDATED, validationRecords: record }), fixtureScene(), { fileExists });
  assert.ok(has(validated, /no external-validation record exists/), validated);
});

test('a non-prototype scene without a profile, or with a dangling one, is reported', () => {
  assert.ok(has(modelProfileProblems({ scenes: [fixtureScene({ modelProfile: undefined })], profiles: [wellFormed()] }), /must reference a modelProfile/));
  assert.ok(has(modelProfileProblems({ scenes: [fixtureScene({ modelProfile: 'no-such-profile' })], profiles: [wellFormed()] }), /"no-such-profile" is not a registered profile/));
  assert.deepEqual(modelProfileProblems({ scenes: [fixtureScene({ status: 'prototype', modelProfile: undefined })], profiles: [] }), [], 'a prototype may go without one');
});

test('a prototype may reference a profile only if it claims no mechanism', () => {
  assert.deepEqual(problemsOf(wellFormed({ mechanismLevel: MECHANISM_LEVEL.ILLUSTRATIVE }), fixtureScene({ status: 'prototype' })), []);
  assert.ok(has(problemsOf(wellFormed(), fixtureScene({ status: 'prototype' })), /a prototype publishes no numbers/));
});

test('a profiled alpha, reviewed or production scene must have a model card', () => {
  assert.ok(has(problemsOf(wellFormed(), fixtureScene({ modelCard: undefined })), /must have a model card/));
  for (const id of ['heart-failure', 'amyloid-beta']) {
    const scene = SCENE_MANIFEST.find((entry) => entry.id === id);
    assert.equal(scene.modelCard, undefined, `${id} does not duplicate the path into the manifest`);
    assert.ok(modelCardForScene(scene), `${id} resolves its card from the registry`);
  }
});

test('a paid patient capability requires patient-explanation, but a free scene may declare it too', () => {
  const withoutUse = problemsOf(wellFormed(), fixtureScene({ access: { patient: true } }));
  assert.ok(has(withoutUse, /does not declare "patient-explanation"/), withoutUse);
  const freePatientScene = problemsOf(
    wellFormed({ intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.PATIENT_EXPLANATION] }),
    fixtureScene()
  );
  assert.deepEqual(freePatientScene, [], 'intended use and billing are separate axes');
});

// ---------------------------------------------------------------------------
// Assets: existence, organ scope, provenance agreement, release gate

test('a profile asset that is not in the asset manifest is reported', () => {
  const profile = wellFormed({ geometryBasis: GEOMETRY_BASIS.REFERENCE_ATLAS, assets: ['no-such-asset'] });
  assert.ok(has(problemsOf(profile, fixtureScene(), { assetById }), /"no-such-asset" is not in the asset manifest/));
});

test('an asset must cover only organs the scene draws, unless it is whole-body context', () => {
  const liver = meshFixture({ assetId: 'fixture-liver', organs: ['liver'] });
  const heartScene = fixtureScene();
  assert.ok(has(assetOrganProblems(heartScene, liver), /covers "liver", which scene "fixture-scene" does not draw/));
  const profile = wellFormed({ geometryBasis: GEOMETRY_BASIS.REFERENCE_ATLAS, assets: ['fixture-liver'] });
  assert.ok(has(problemsOf(profile, heartScene, { assetById: assetsById([liver]) }), /covers "liver"/));

  const twoOrgans = fixtureScene({ organs: ['heart', 'liver'] });
  assert.deepEqual(assetOrganProblems(twoOrgans, liver), [], 'a multi-organ scene may draw each of its organs');
  const context = meshFixture({ assetId: 'fixture-body', organs: ['whole-body', 'heart', 'lungs'] });
  assert.deepEqual(assetOrganProblems(heartScene, context), [], 'a whole-body context asset is the structured exception');
});

test('geometry basis and asset provenance must agree: format is not provenance', () => {
  const proceduralGlb = meshOfType(ASSET_SOURCE_TYPE.PROCEDURAL, { assetId: 'fixture-procedural' });
  const atlas = meshFixture({ assetId: 'fixture-atlas' });
  const texture = materialFixture({ assetId: 'fixture-material' });
  const resolver = assetsById([proceduralGlb, atlas, texture]);
  const scene = fixtureScene();

  const proceduralWithGlb = wellFormed({ geometryBasis: GEOMETRY_BASIS.PROCEDURAL, assets: ['fixture-procedural', 'fixture-material'] });
  assert.deepEqual(problemsOf(proceduralWithGlb, scene, { assetById: resolver }), [], 'a procedural organ stored as a GLB is still procedural');

  const proceduralWithAtlas = wellFormed({ geometryBasis: GEOMETRY_BASIS.PROCEDURAL, assets: ['fixture-atlas'] });
  assert.ok(has(problemsOf(proceduralWithAtlas, scene, { assetById: resolver }), /procedural geometry cannot use mesh asset "fixture-atlas" of source type "reference-atlas" — reclassify as hybrid/));

  const atlasWithProcedural = wellFormed({ geometryBasis: GEOMETRY_BASIS.REFERENCE_ATLAS, assets: ['fixture-procedural'] });
  assert.ok(has(problemsOf(atlasWithProcedural, scene, { assetById: resolver }), /only reference-atlas meshes fit this basis/));

  const atlasWithOnlyTexture = wellFormed({ geometryBasis: GEOMETRY_BASIS.REFERENCE_ATLAS, assets: ['fixture-material'] });
  assert.ok(has(problemsOf(atlasWithOnlyTexture, scene, { assetById: resolver }), /names only material assets and no mesh/));

  const hybridAllProcedural = wellFormed({ geometryBasis: GEOMETRY_BASIS.HYBRID, assets: ['fixture-procedural'] });
  assert.ok(has(problemsOf(hybridAllProcedural, scene, { assetById: resolver }), /hybrid geometry must name at least one atlas-, imaging- or structure-derived mesh asset/));

  const hybrid = wellFormed({ geometryBasis: GEOMETRY_BASIS.HYBRID, assets: ['fixture-procedural', 'fixture-atlas'] });
  assert.deepEqual(problemsOf(hybrid, scene, { assetById: resolver }), []);
  assert.deepEqual(geometryBasisProblems(wellFormed({ geometryBasis: GEOMETRY_BASIS.PROCEDURAL }), []), [], 'a procedural scene drawn in code names no asset at all');
});

test('a public scene\'s asset must pass the release gate for that scene\'s maturity', () => {
  const pendingReview = withQa(meshFixture(), QA_GATE.CLINICIAN_REVIEW, { status: QA_STATUS.PENDING, reference: 'docs/fixture-qa.md' });
  const profile = wellFormed({ geometryBasis: GEOMETRY_BASIS.REFERENCE_ATLAS, assets: ['fixture-atlas'] });
  const resolver = assetsById([pendingReview]);
  assert.deepEqual(problemsOf(profile, fixtureScene({ status: 'alpha' }), { assetById: resolver }), [], 'alpha may wait for review');
  for (const status of ['reviewed', 'production']) {
    assert.ok(has(problemsOf(profile, fixtureScene({ status }), { assetById: resolver }), /clinicianReview is pending, not passed/), status);
  }
  const failedValidator = withQa(meshFixture(), QA_GATE.FORMAT_VALIDATION, { ...meshFixture().qa.formatValidation, status: QA_STATUS.FAILED });
  assert.ok(has(problemsOf(profile, fixtureScene({ status: 'alpha' }), { assetById: assetsById([failedValidator]) }), /formatValidation failed/));
  const unknownLicence = { ...meshFixture(), license: { ...meshFixture().license, commercialUse: 'unknown' } };
  assert.ok(has(problemsOf(profile, fixtureScene({ status: 'alpha' }), { assetById: assetsById([unknownLicence]) }), /commercial use is "unknown"/));
});

test('the two registries talk about the same body', () => {
  const organIds = new Set(ORGANS.map((organ) => organ.id));
  for (const asset of ASSET_MANIFEST) for (const organ of asset.organs) assert.ok(organIds.has(organ), `${asset.assetId}: ${organ}`);
});
