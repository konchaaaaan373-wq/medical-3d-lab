import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { ORGANS, SCENES } from '../src/catalog/index.js';
import { modelProfileForScene } from '../src/catalog/modelProfiles.js';
import {
  ASSET_MANIFEST,
  ASSET_MANIFEST_SCHEMA_VERSION,
  ASSET_SOURCE_TYPE,
  CONDITIONAL_FIELDS,
  LICENSE_DECISION,
  QA_STATUS,
  RELEASE_STATUS,
  assetById,
  assetIsReleasable,
  assetReleaseProblems,
  validateAssetManifest,
} from '../src/catalog/assetManifest.js';

/**
 * The asset-manifest contract: an external 3D asset does not enter the
 * product without its source, licence, hash, coordinates, conversion and QA
 * on record — and a record is not the same thing as a licence gate passed.
 *
 * Nothing below fetches anything. The one real entry is checked against the
 * file already in the repository; everything else is a fixture, and says so.
 */

const repoPath = (path) => new URL(`../${path}`, import.meta.url);
const sha256 = (path) => createHash('sha256').update(readFileSync(repoPath(path))).digest('hex');
const ORGAN_IDS = new Set(ORGANS.map((organ) => organ.id));
const FIXTURE_HASH = 'a'.repeat(64);

/** A complete reference-atlas record, to be broken one field at a time. */
const fixture = (overrides = {}) => ({
  assetId: 'fixture-atlas',
  schemaVersion: ASSET_MANIFEST_SCHEMA_VERSION,
  sourceType: ASSET_SOURCE_TYPE.REFERENCE_ATLAS,
  format: 'glb',
  organ: 'heart',
  structureScope: 'Fixture: a heart for tests.',
  source: { name: 'Fixture atlas', url: 'https://example.invalid/fixture', version: 'v0', retrievedAt: '2026-01-01' },
  license: {
    spdx: 'CC-BY-4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Fixture contributors',
    redistribution: LICENSE_DECISION.ALLOWED,
    commercialUse: LICENSE_DECISION.ALLOWED,
    decisionRecord: 'docs/fixture-decision.md',
    decisionNote: 'Fixture decision.',
  },
  sources: [{ path: 'https://example.invalid/fixture.glb', sha256: FIXTURE_HASH }],
  output: { path: 'public/assets/fixture/fixture.glb', sha256: FIXTURE_HASH, bytes: 1 },
  geometry: { coordinateSystem: 'glTF', units: 'metres', extent: 'fixture', scaleNote: 'fixture' },
  pipeline: { tools: ['fixture-tool 1.0'], generator: null, steps: ['fixture step'] },
  semanticParts: { partIdSource: 'fixture extras', mappingModule: null, partCount: 0 },
  acceptedSimplifications: [],
  knownDefects: [],
  budget: { triangles: 1, materials: 1, textures: 0, bytes: 1, targetDevices: 'fixture' },
  qa: {
    validator: { status: QA_STATUS.PASSED, reference: 'fixture' },
    anatomyTests: { status: QA_STATUS.PASSED, reference: 'fixture' },
    visualReview: { status: QA_STATUS.PASSED, reference: 'fixture' },
    clinicianReview: { status: QA_STATUS.PASSED, reference: 'fixture' },
  },
  replacement: { replaces: null, rollback: 'fixture' },
  release: { status: RELEASE_STATUS.RELEASED, note: 'fixture' },
  atlas: { sourceObjectId: 'fixture-object', derivativeTerms: 'fixture' },
  ...overrides,
});

const CONDITIONAL_BLOCKS = {
  [ASSET_SOURCE_TYPE.REFERENCE_ATLAS]: { atlas: { sourceObjectId: 'x', derivativeTerms: 'x' } },
  [ASSET_SOURCE_TYPE.IMAGING_DERIVED]: {
    imaging: {
      dataset: 'x',
      subjectProvenance: 'x',
      deidentification: 'confirmed by fixture',
      segmentationMethod: 'x',
      registrationMethod: 'x',
      manualEdits: 'none',
    },
  },
  [ASSET_SOURCE_TYPE.PROCEDURAL]: {
    procedural: { generatorVersion: 'x', seedOrConfig: 'x', inputParameters: 'x', regenerate: 'x' },
  },
  [ASSET_SOURCE_TYPE.MOLECULAR]: { molecular: { accession: '1ABC', assembly: '1', structureVersion: 'x' } },
  [ASSET_SOURCE_TYPE.THIRD_PARTY_MATERIAL]: {
    material: { items: [{ name: 'x', source: 'x', license: 'x', sha256: FIXTURE_HASH }] },
  },
};

/** A fixture of another source type: drop the atlas block, add the right one. */
const fixtureOfType = (sourceType, overrides = {}) => {
  const { atlas: _atlas, ...base } = fixture({ sourceType });
  return { ...base, ...CONDITIONAL_BLOCKS[sourceType], ...overrides };
};

// ---------------------------------------------------------------------------
// The manifest as it stands

test('the asset manifest is well formed against the taxonomy', () => {
  assert.deepEqual(validateAssetManifest(ASSET_MANIFEST, { organIds: ORGAN_IDS }), []);
});

test('asset ids are unique', () => {
  const ids = ASSET_MANIFEST.map((asset) => asset.assetId);
  assert.equal(new Set(ids).size, ids.length);
});

test('every recorded output file exists and its hash and size are what the manifest says', () => {
  for (const asset of ASSET_MANIFEST) {
    assert.equal(sha256(asset.output.path), asset.output.sha256, `${asset.assetId}: ${asset.output.path} hash`);
    if (asset.output.bytes != null) {
      assert.equal(statSync(repoPath(asset.output.path)).size, asset.output.bytes, `${asset.assetId}: size`);
    }
  }
});

test('every path a record points at exists in the repository', () => {
  for (const asset of ASSET_MANIFEST) {
    const paths = [
      asset.license.decisionRecord,
      asset.semanticParts.mappingModule,
      ...Object.values(asset.qa).map((gate) => gate.reference),
    ].filter((path) => path && !/^[a-z]+:\/\//.test(path));
    for (const path of paths) assert.doesNotThrow(() => statSync(repoPath(path)), `${asset.assetId}: ${path}`);
  }
});

test('the manifest contains only the brain atlas, and no binary was added for this contract', () => {
  assert.deepEqual(ASSET_MANIFEST.map((asset) => asset.assetId), ['brain-atlas-glb']);
});

test('the brain atlas record is honest about what was not verified', () => {
  const brain = assetById('brain-atlas-glb');
  assert.equal(brain.sourceType, ASSET_SOURCE_TYPE.REFERENCE_ATLAS);
  assert.equal(brain.license.spdx, 'CC-BY-SA-4.0');
  assert.equal(brain.sources[0].sha256, null, 'the upstream hash was not fetched, and is not guessed');
  assert.match(brain.sources[0].note, /not independently verified/);
  assert.equal(brain.qa.clinicianReview.status, QA_STATUS.PENDING, 'matches the review registry');
  assert.equal(brain.qa.validator.status, QA_STATUS.NOT_REQUIRED, 'the glTF validator has not been run here');
  assert.match(brain.license.decisionNote, /not a legal review/);
});

test('an asset referenced by a public scene has passed the release gate for that scene\'s maturity', () => {
  for (const scene of SCENES.filter((entry) => entry.status !== 'prototype')) {
    const profile = modelProfileForScene(scene);
    for (const id of profile?.assets ?? []) {
      const asset = assetById(id);
      assert.ok(asset, `${scene.id}: ${id} exists`);
      const requireClinicianReview = ['reviewed', 'production'].includes(scene.status);
      assert.deepEqual(assetReleaseProblems(asset, { requireClinicianReview }), [], `${scene.id} → ${id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// Completeness for each source type

test('a complete record of every source type passes, and each needs only its own conditional block', () => {
  for (const sourceType of Object.values(ASSET_SOURCE_TYPE)) {
    assert.deepEqual(validateAssetManifest([fixtureOfType(sourceType)], { organIds: ORGAN_IDS }), [], sourceType);
  }
});

test('a record missing its source type\'s conditional block, or any field in it, is rejected', () => {
  for (const [sourceType, { block, fields }] of Object.entries(CONDITIONAL_FIELDS)) {
    const complete = fixtureOfType(sourceType);
    const { [block]: _dropped, ...withoutBlock } = complete;
    const missing = validateAssetManifest([withoutBlock]);
    assert.ok(missing.some((line) => line.includes(`requires a "${block}" block`)), `${sourceType}: ${missing}`);

    for (const field of fields) {
      const broken = { ...complete, [block]: { ...complete[block], [field]: Array.isArray(complete[block][field]) ? [] : '' } };
      const problems = validateAssetManifest([broken]);
      assert.ok(problems.some((line) => line.includes(`${block}.${field} is required`)), `${sourceType}.${field}: ${problems}`);
    }
  }
});

test('a record carrying another source type\'s block is rejected rather than silently accepted', () => {
  const mixed = fixture({ imaging: CONDITIONAL_BLOCKS[ASSET_SOURCE_TYPE.IMAGING_DERIVED].imaging });
  const problems = validateAssetManifest([mixed]);
  assert.ok(problems.some((line) => /"imaging" block that belongs to imaging-derived/.test(line)), problems);
});

test('third-party materials are recorded item by item, each with its own licence and hash', () => {
  const material = fixtureOfType(ASSET_SOURCE_TYPE.THIRD_PARTY_MATERIAL, {
    material: { items: [{ name: 'tex', source: 'x', license: '', sha256: 'nothex' }] },
  });
  const problems = validateAssetManifest([material]);
  assert.ok(problems.some((line) => /material.items\[0\].license is missing/.test(line)), problems);
  assert.ok(problems.some((line) => /material.items\[0\].sha256 must be 64 hex/.test(line)), problems);
});

// ---------------------------------------------------------------------------
// The common core rejects what it must

test('an unknown source type, licence decision, QA status or release status is rejected', () => {
  const cases = [
    [fixture({ sourceType: 'scan' }), /unknown sourceType "scan"/],
    [fixture({ license: { ...fixture().license, commercialUse: 'yes' } }), /license.commercialUse must be one of/],
    [fixture({ qa: { ...fixture().qa, validator: { status: 'ok', reference: null } } }), /qa.validator.status must be one of/],
    [fixture({ release: { status: 'live', note: 'x' } }), /release.status must be one of/],
  ];
  for (const [entry, expected] of cases) {
    const problems = validateAssetManifest([entry]);
    assert.ok(problems.some((line) => expected.test(line)), `${expected}: ${problems}`);
  }
});

test('hashes are 64 hex characters, and a missing source hash needs a note', () => {
  const bad = validateAssetManifest([fixture({ output: { path: 'public/x.glb', sha256: 'abc' } })]);
  assert.ok(bad.some((line) => /output.sha256 must be 64 lowercase hex/.test(line)), bad);

  const nullOutput = validateAssetManifest([fixture({ output: { path: 'public/x.glb', sha256: null, note: 'x' } })]);
  assert.ok(nullOutput.some((line) => /output.sha256 is required/.test(line)), nullOutput);

  const silentNull = validateAssetManifest([fixture({ sources: [{ path: 'https://example.invalid/a', sha256: null }] })]);
  assert.ok(silentNull.some((line) => /sources\[0\].sha256 is null without a note/.test(line)), silentNull);

  const withNote = validateAssetManifest([fixture({ sources: [{ path: 'https://example.invalid/a', sha256: null, note: 'not fetched' }] })]);
  assert.deepEqual(withNote, []);
});

test('duplicate ids, an output path that is a URL, and a bad date are rejected', () => {
  const twice = validateAssetManifest([fixture(), fixture()]);
  assert.ok(twice.some((line) => /duplicate assetId/.test(line)), twice);

  const url = validateAssetManifest([fixture({ output: { path: 'https://cdn.invalid/x.glb', sha256: FIXTURE_HASH } })]);
  assert.ok(url.some((line) => /output.path must be repository-relative/.test(line)), url);

  const date = validateAssetManifest([fixture({ source: { ...fixture().source, retrievedAt: 'September' } })]);
  assert.ok(date.some((line) => /retrievedAt must be an ISO date/.test(line)), date);
});

test('a QA gate cannot pass without a reference, nor be waived without a reason', () => {
  const passedBlind = validateAssetManifest([fixture({ qa: { ...fixture().qa, anatomyTests: { status: QA_STATUS.PASSED, reference: null } } })]);
  assert.ok(passedBlind.some((line) => /qa.anatomyTests passed without a reference/.test(line)), passedBlind);

  const waived = validateAssetManifest([fixture({ qa: { ...fixture().qa, validator: { status: QA_STATUS.NOT_REQUIRED, reference: null } } })]);
  assert.ok(waived.some((line) => /qa.validator is not-required without a note/.test(line)), waived);
});

test('an organ outside the taxonomy and a replacement target outside the manifest are reported', () => {
  const organ = validateAssetManifest([fixture({ organ: 'gizzard' })], { organIds: ORGAN_IDS });
  assert.ok(organ.some((line) => /organ "gizzard" is not in the taxonomy/.test(line)), organ);

  const replaces = validateAssetManifest([fixture({ replacement: { replaces: 'ghost', rollback: 'x' } })]);
  assert.ok(replaces.some((line) => /replaces "ghost", which is not in the manifest/.test(line)), replaces);
});

// ---------------------------------------------------------------------------
// Releasability is a different question from validity

test('a structurally valid record with an unknown licence is valid and not releasable', () => {
  const unknown = fixture({ license: { ...fixture().license, commercialUse: LICENSE_DECISION.UNKNOWN } });
  assert.deepEqual(validateAssetManifest([unknown]), [], 'the record is complete');
  const problems = assetReleaseProblems(unknown);
  assert.ok(problems.some((line) => /commercial use has not been decided/.test(line)), problems);
  assert.equal(assetIsReleasable(unknown), false);
});

test('restricted redistribution, a missing decision record, or a non-released status blocks release', () => {
  const restricted = fixture({ license: { ...fixture().license, redistribution: LICENSE_DECISION.RESTRICTED } });
  assert.ok(assetReleaseProblems(restricted).some((line) => /redistribution is "restricted"/.test(line)));

  const undecided = fixture({ license: { ...fixture().license, decisionRecord: null } });
  assert.ok(assetReleaseProblems(undecided).some((line) => /decision has no record/.test(line)));

  for (const status of [RELEASE_STATUS.CANDIDATE, RELEASE_STATUS.LAB, RELEASE_STATUS.RETIRED]) {
    const staged = fixture({ release: { status, note: 'x' } });
    assert.ok(assetReleaseProblems(staged).some((line) => line.includes(`release status is "${status}"`)), status);
  }
});

test('an imaging-derived asset cannot be released without confirmed de-identification', () => {
  for (const value of ['pending', 'unknown', 'no']) {
    const imaging = fixtureOfType(ASSET_SOURCE_TYPE.IMAGING_DERIVED);
    imaging.imaging = { ...imaging.imaging, deidentification: value };
    assert.deepEqual(validateAssetManifest([imaging]), [], `"${value}" is a complete record`);
    const problems = assetReleaseProblems(imaging);
    assert.ok(problems.some((line) => /de-identification .* not confirmed/.test(line)), `${value}: ${problems}`);
  }
  assert.equal(assetIsReleasable(fixtureOfType(ASSET_SOURCE_TYPE.IMAGING_DERIVED)), true);
});

test('clinician review is demanded only when the referencing scene claims review', () => {
  const pending = fixture({ qa: { ...fixture().qa, clinicianReview: { status: QA_STATUS.PENDING, reference: 'x' } } });
  assert.equal(assetIsReleasable(pending), true, 'an alpha scene may show it');
  assert.equal(assetIsReleasable(pending, { requireClinicianReview: true }), false, 'a reviewed scene may not');

  const failed = fixture({ qa: { ...fixture().qa, clinicianReview: { status: QA_STATUS.FAILED, reference: 'x' } } });
  assert.equal(assetIsReleasable(failed), false, 'a failed review blocks release regardless');
});
