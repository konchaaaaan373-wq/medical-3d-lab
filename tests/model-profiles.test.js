import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';
import { SCENES, ORGANS } from '../src/catalog/index.js';
import { modelCardForScene } from '../src/catalog/clinicalReview.js';
import { assetById, ASSET_MANIFEST } from '../src/catalog/assetManifest.js';
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
  modelProfileById,
  modelProfileForScene,
  modelProfileProblems,
  validateModelProfiles,
} from '../src/catalog/modelProfiles.js';

/**
 * The model-profile contract: what kind of claim each scene makes, in a
 * closed vocabulary, and what the current public product may not claim.
 *
 * Test names are the policy. A failure here is not a physiology failure — it
 * is a scene claiming more than the product has a release surface for, or a
 * registry that no longer describes the catalogue.
 */

const NON_PROTOTYPE = SCENES.filter((scene) => scene.status !== 'prototype');

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
  modelCard: 'docs/model-cards/fixture.md',
  modelProfile: 'fixture-profile',
  ...overrides,
});

const problemsOf = (profile, scene, extra = {}) =>
  modelProfileProblems({ scenes: [scene], profiles: [profile], ...extra });

// ---------------------------------------------------------------------------
// The registry as it stands

test('the model-profile registry is well formed and every scene reference resolves', () => {
  assert.deepEqual(validateModelProfiles(), []);
  assert.deepEqual(
    modelProfileProblems({ scenes: SCENE_MANIFEST, assetById, modelCardFor: (scene) => scene.modelCard ?? modelCardForScene(scene) }),
    []
  );
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
    assert.ok(
      !PATIENT_SPECIFIC_PERSONALIZATION.includes(profile.personalization),
      `${scene.id} represents nobody in particular`
    );
  }
});

test('no scene in the public app claims external validation, and every current scene is representative', () => {
  for (const scene of NON_PROTOTYPE) {
    const profile = modelProfileForScene(scene);
    assert.notEqual(profile.mechanismLevel, MECHANISM_LEVEL.EXTERNALLY_VALIDATED, scene.id);
    assert.equal(profile.personalization, PERSONALIZATION.REPRESENTATIVE, scene.id);
  }
});

test('every current-product profile prohibits diagnosis, treatment selection and dose selection', () => {
  for (const scene of NON_PROTOTYPE) {
    const profile = modelProfileForScene(scene);
    for (const use of CORE_PROHIBITED_USES) {
      assert.ok(profile.prohibitedUses.includes(use), `${scene.id} prohibits ${use}`);
    }
  }
});

test('a scene with a patient capability declares patient-explanation, and only such a scene does', () => {
  for (const scene of NON_PROTOTYPE) {
    const profile = modelProfileForScene(scene);
    const declares = profile.intendedUses.includes(INTENDED_USE.PATIENT_EXPLANATION);
    assert.equal(declares, scene.access?.patient === true, `${scene.id}: patient surface and intended use agree`);
  }
});

test('production is engineering maturity: the two production scenes still claim no more than mechanistic', () => {
  for (const scene of SCENES.filter((entry) => entry.status === 'production')) {
    const profile = modelProfileForScene(scene);
    assert.ok(
      [MECHANISM_LEVEL.ILLUSTRATIVE, MECHANISM_LEVEL.MECHANISTIC].includes(profile.mechanismLevel),
      `${scene.id}: ${profile.mechanismLevel}`
    );
  }
});

test('no current scene is literature-calibrated: the evidence registry files calibrations as chosen targets', () => {
  // This is a statement about today's evidence, not a ceiling. It flips when a
  // dossier cites a dataset range and a test holds the model inside it.
  for (const scene of NON_PROTOTYPE) {
    assert.notEqual(modelProfileForScene(scene).mechanismLevel, MECHANISM_LEVEL.LITERATURE_CALIBRATED, scene.id);
  }
});

test('the brain atlas is the only asset-backed geometry, and its asset is in the manifest', () => {
  const backed = NON_PROTOTYPE.filter((scene) => modelProfileForScene(scene).geometryBasis !== GEOMETRY_BASIS.PROCEDURAL);
  assert.deepEqual(backed.map((scene) => scene.id), ['brain-anatomy']);
  const profile = modelProfileForScene(backed[0]);
  assert.equal(profile.geometryBasis, GEOMETRY_BASIS.REFERENCE_ATLAS);
  assert.equal(profile.mechanismLevel, MECHANISM_LEVEL.NONE, 'an atlas makes no mechanism claim');
  for (const id of profile.assets) assert.ok(assetById(id), `${id} is in the asset manifest`);
  assert.ok(profile.prohibitedUses.includes(PROHIBITED_USE.PROCEDURE_PLANNING), 'the review registry forbids operative planning');
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
// The validator rejects what it must

test('an unknown value on any axis is rejected', () => {
  for (const [field, value] of [
    ['geometryBasis', 'scanned'],
    ['mechanismLevel', 'accurate'],
    ['personalization', 'personal'],
  ]) {
    const problems = validateModelProfiles([wellFormed({ [field]: value })]);
    assert.ok(problems.some((line) => line.includes(field) && line.includes(value)), `${field}=${value}: ${problems}`);
  }
  const uses = validateModelProfiles([wellFormed({ intendedUses: ['general-education', 'marketing'] })]);
  assert.ok(uses.some((line) => line.includes('"marketing"')), uses);
  const prohibited = validateModelProfiles([wellFormed({ prohibitedUses: [...CORE_PROHIBITED_USES, 'fun'] })]);
  assert.ok(prohibited.some((line) => line.includes('"fun"')), prohibited);
});

test('duplicate ids, duplicate list entries and empty lists are rejected', () => {
  const twice = validateModelProfiles([wellFormed(), wellFormed()]);
  assert.ok(twice.some((line) => /duplicate profileId/.test(line)), twice);

  const doubled = validateModelProfiles([wellFormed({ intendedUses: ['general-education', 'general-education'] })]);
  assert.ok(doubled.some((line) => /intendedUses has duplicates/.test(line)), doubled);

  const empty = validateModelProfiles([wellFormed({ intendedUses: [] })]);
  assert.ok(empty.some((line) => /intendedUses is empty/.test(line)), empty);

  const blank = validateModelProfiles([wellFormed({ prohibitedUses: ['diagnosis', ''] })]);
  assert.ok(blank.some((line) => /prohibitedUses must be an array of non-empty strings/.test(line)), blank);
});

test('a wrong schema version, a bad id and a missing basis are rejected', () => {
  const problems = validateModelProfiles([
    wellFormed({ profileId: 'Not Kebab', schemaVersion: 2, basis: '' }),
  ]);
  assert.ok(problems.some((line) => /kebab-case/.test(line)), problems);
  assert.ok(problems.some((line) => /schemaVersion must be 1/.test(line)), problems);
  assert.ok(problems.some((line) => /basis must say why/.test(line)), problems);
});

test('a non-clinical profile that fails to prohibit diagnosis, treatment selection or dose selection is rejected', () => {
  for (const missing of CORE_PROHIBITED_USES) {
    const problems = validateModelProfiles([
      wellFormed({ prohibitedUses: CORE_PROHIBITED_USES.filter((use) => use !== missing) }),
    ]);
    assert.ok(problems.some((line) => line.includes(`must prohibit "${missing}"`)), `${missing}: ${problems}`);
  }
});

test('procedural geometry may not list assets, and atlas or imaging geometry must', () => {
  const procedural = validateModelProfiles([wellFormed({ assets: ['brain-atlas-glb'] })]);
  assert.ok(procedural.some((line) => /procedural geometry lists assets/.test(line)), procedural);
  for (const basis of [GEOMETRY_BASIS.REFERENCE_ATLAS, GEOMETRY_BASIS.IMAGING_DERIVED, GEOMETRY_BASIS.HYBRID, GEOMETRY_BASIS.MOLECULAR]) {
    const problems = validateModelProfiles([wellFormed({ geometryBasis: basis })]);
    assert.ok(problems.some((line) => line.includes(`${basis} geometry must name at least one asset`)), `${basis}: ${problems}`);
  }
});

test('a high claim without a validation record is rejected structurally, before any product rule applies', () => {
  const cases = [
    { mechanismLevel: MECHANISM_LEVEL.EXTERNALLY_VALIDATED },
    { personalization: PERSONALIZATION.PATIENT_PREDICTIVE },
    { personalization: PERSONALIZATION.PATIENT_DERIVED_GEOMETRY },
    { intendedUses: [INTENDED_USE.CLINICAL_RESEARCH], prohibitedUses: [PROHIBITED_USE.DOSE_SELECTION] },
    { intendedUses: [INTENDED_USE.CLINICAL_CARE], prohibitedUses: [PROHIBITED_USE.DOSE_SELECTION] },
  ];
  for (const overrides of cases) {
    const problems = validateModelProfiles([wellFormed(overrides)]);
    assert.ok(problems.some((line) => /require validationRecords/.test(line)), `${JSON.stringify(overrides)}: ${problems}`);
    // With a record the structure passes — the product rule below still refuses it.
    assert.deepEqual(validateModelProfiles([wellFormed({ ...overrides, validationRecords: ['docs/validation/fixture.md'] })]), []);
  }
});

test('the public app refuses a clinical intended use even when a validation record is present', () => {
  for (const use of CLINICAL_INTENDED_USES) {
    const profile = wellFormed({
      intendedUses: [use],
      prohibitedUses: [PROHIBITED_USE.DOSE_SELECTION],
      validationRecords: ['docs/validation/fixture.md'],
    });
    const problems = problemsOf(profile, fixtureScene());
    assert.ok(problems.some((line) => line.includes(`no release surface for intended use "${use}"`)), `${use}: ${problems}`);
  }
});

test('the public app refuses patient-derived geometry and patient-predictive models, on Lab scenes too', () => {
  for (const personalization of PATIENT_SPECIFIC_PERSONALIZATION) {
    const profile = wellFormed({ personalization, validationRecords: ['docs/validation/fixture.md'] });
    for (const status of ['alpha', 'production', 'prototype']) {
      const scene = fixtureScene({ status });
      const problems = problemsOf(profile, scene);
      assert.ok(problems.some((line) => line.includes(`cannot be "${personalization}"`)), `${status}/${personalization}: ${problems}`);
    }
  }
});

test('the public app refuses an externally-validated claim because no such record exists here', () => {
  const profile = wellFormed({ mechanismLevel: MECHANISM_LEVEL.EXTERNALLY_VALIDATED, validationRecords: ['docs/validation/fixture.md'] });
  const problems = problemsOf(profile, fixtureScene());
  assert.ok(problems.some((line) => /no external-validation record exists/.test(line)), problems);
});

test('a non-prototype scene without a profile, or with a dangling one, is reported', () => {
  const missing = modelProfileProblems({ scenes: [fixtureScene({ modelProfile: undefined })], profiles: [wellFormed()] });
  assert.ok(missing.some((line) => /must reference a modelProfile/.test(line)), missing);

  const dangling = modelProfileProblems({ scenes: [fixtureScene({ modelProfile: 'no-such-profile' })], profiles: [wellFormed()] });
  assert.ok(dangling.some((line) => /"no-such-profile" is not a registered profile/.test(line)), dangling);

  const sketch = modelProfileProblems({ scenes: [fixtureScene({ status: 'prototype', modelProfile: undefined })], profiles: [] });
  assert.deepEqual(sketch, [], 'a prototype may go without one');
});

test('a prototype may reference a profile only if it claims no mechanism', () => {
  const illustrative = wellFormed({ mechanismLevel: MECHANISM_LEVEL.ILLUSTRATIVE });
  assert.deepEqual(problemsOf(illustrative, fixtureScene({ status: 'prototype' })), []);
  const mechanistic = wellFormed();
  const problems = problemsOf(mechanistic, fixtureScene({ status: 'prototype' }));
  assert.ok(problems.some((line) => /a prototype publishes no numbers/.test(line)), problems);
});

test('a profiled alpha, reviewed or production scene must have a model card', () => {
  const problems = problemsOf(wellFormed(), fixtureScene({ modelCard: undefined }));
  assert.ok(problems.some((line) => /must have a model card/.test(line)), problems);
  // The production scenes find theirs through the clinical-review registry.
  for (const id of ['heart-failure', 'amyloid-beta']) {
    const scene = SCENE_MANIFEST.find((entry) => entry.id === id);
    assert.equal(scene.modelCard, undefined, `${id} does not duplicate the path into the manifest`);
    assert.ok(modelCardForScene(scene), `${id} resolves its card from the registry`);
  }
});

test('patient capability and patient-explanation must agree in both directions', () => {
  const withoutUse = problemsOf(wellFormed(), fixtureScene({ access: { patient: true } }));
  assert.ok(withoutUse.some((line) => /does not declare "patient-explanation"/.test(line)), withoutUse);

  const withoutSurface = problemsOf(
    wellFormed({ intendedUses: [INTENDED_USE.GENERAL_EDUCATION, INTENDED_USE.PATIENT_EXPLANATION] }),
    fixtureScene()
  );
  assert.ok(withoutSurface.some((line) => /offers no patient capability/.test(line)), withoutSurface);
});

test('a profile asset that is not in the asset manifest is reported', () => {
  const profile = wellFormed({ geometryBasis: GEOMETRY_BASIS.REFERENCE_ATLAS, assets: ['no-such-asset'] });
  const problems = problemsOf(profile, fixtureScene(), { assetById });
  assert.ok(problems.some((line) => /"no-such-asset" is not in the asset manifest/.test(line)), problems);
  const real = wellFormed({ geometryBasis: GEOMETRY_BASIS.REFERENCE_ATLAS, assets: [ASSET_MANIFEST[0].assetId] });
  assert.deepEqual(problemsOf(real, fixtureScene(), { assetById }), []);
});

test('the vocabulary is closed: every organ named by an asset-backed profile is a real organ', () => {
  // A sanity check that the two registries are talking about the same body.
  const organIds = new Set(ORGANS.map((organ) => organ.id));
  for (const asset of ASSET_MANIFEST) assert.ok(organIds.has(asset.organ), asset.assetId);
});
