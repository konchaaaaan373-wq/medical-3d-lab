import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { ORGANS, SCENES } from '../src/catalog/index.js';
import { modelProfileForScene } from '../src/catalog/modelProfiles.js';
import {
  ASSET_KIND,
  ASSET_MANIFEST,
  ASSET_SOURCE_TYPE,
  ASSESSMENT_BASIS,
  CONDITIONAL_FIELDS,
  DEIDENTIFICATION_STATUS,
  LICENSE_DECISION,
  OBLIGATION_STATUS,
  QA_APPLIES,
  QA_GATE,
  QA_GATE_IDS,
  QA_STATUS,
  RELEASE_STATUS,
  assetById,
  assetIsReleasable,
  assetReleaseProblems,
  isRepositoryPath,
  validateAssetManifest,
} from '../src/catalog/assetManifest.js';
import {
  CONDITIONAL_BLOCKS,
  FIXTURE_HASH,
  materialFixture,
  meshFixture,
  meshOfType,
  withLicense,
  withQa,
} from './helpers/assetFixtures.js';

/**
 * The asset-manifest contract: an external 3D asset does not enter the
 * product without its source, licence obligations, hashes, coordinates,
 * conversion and QA on record — and a record is not the same thing as a
 * release gate passed.
 *
 * Nothing below fetches anything. The one real entry is checked against the
 * file already in the repository; everything else is a fixture, and says so.
 */

const repoPath = (path) => new URL(`../${path}`, import.meta.url);
const sha256 = (path) => createHash('sha256').update(readFileSync(repoPath(path))).digest('hex');
const fileExists = (path) => existsSync(repoPath(path));
const ORGAN_IDS = new Set(ORGANS.map((organ) => organ.id));
const has = (problems, pattern) => problems.some((line) => pattern.test(line));

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

test('every repository path a record points at exists', () => {
  for (const asset of ASSET_MANIFEST) {
    const paths = [
      asset.license.decisionRecord,
      ...asset.license.obligations.map((o) => o.satisfiedBy),
      asset.semanticParts?.mappingModule,
      ...Object.values(asset.qa).map((gate) => gate.reference),
    ].filter((path) => path != null);
    for (const path of paths) assert.ok(fileExists(path), `${asset.assetId}: ${path}`);
  }
});

test('the manifest contains only the brain atlas, and no binary was added for this contract', () => {
  assert.deepEqual(ASSET_MANIFEST.map((asset) => asset.assetId), ['brain-atlas-glb']);
});

test('the brain atlas record states what was measured and what was not', () => {
  const brain = assetById('brain-atlas-glb');
  assert.equal(brain.kind, ASSET_KIND.MESH);
  assert.equal(brain.sourceType, ASSET_SOURCE_TYPE.REFERENCE_ATLAS);
  assert.equal(brain.license.spdx, 'CC-BY-SA-4.0');
  assert.equal(brain.license.assessment, ASSESSMENT_BASIS.ENGINEERING, 'a licence reading by an engineer says so');
  assert.equal(brain.source.retrievedAt, null, 'the original download date is not invented');
  assert.match(brain.source.retrievedAtNote, /not recorded/);
  assert.equal(brain.sources[0].sha256, brain.output.sha256, 'the upstream file was re-downloaded and matched');
  assert.equal(brain.sources[0].gitBlobSha, 'c80dd62202b5cf8a2a43c7a019311781bd95457c');
  assert.equal(brain.sources[0].bytes, 4650816);
  assert.equal(brain.qa.formatValidation.toolVersion, '2.0.0-dev.3.10');
  assert.equal(brain.qa.formatValidation.errors, 0);
  assert.equal(brain.qa.formatValidation.warnings, 0);
  assert.match(brain.qa.formatValidation.scope, /Draco/, 'the validator cannot see through Draco, and the record says so');
  assert.equal(brain.qa.anatomyExpertReview.status, QA_STATUS.PENDING, 'no anatomist has reviewed it');
  assert.equal(brain.qa.clinicianReview.status, QA_STATUS.PENDING, 'matches the review registry');
  assert.equal(brain.qa.visualReview.status, QA_STATUS.PASSED);
  assert.match(brain.qa.visualReview.browser, /Chromium/);
  assert.match(brain.qa.visualReview.scope, /Not an anatomical judgement/);
  assert.equal(brain.components.length, 7, 'the composite is recorded component by component');
  assert.ok(brain.components.some((c) => c.id === 'hcp1065-tracts' && /WU-Minn/.test(c.additionalTerms)));
  assert.ok(brain.license.obligations.some((o) => o.id === 'hcp-acknowledgment' && o.status === OBLIGATION_STATUS.SATISFIED));
});

test('the attribution notice discharges every obligation the manifest records', () => {
  const brain = assetById('brain-atlas-glb');
  const notice = readFileSync(repoPath('public/assets/brain/ATTRIBUTION.md'), 'utf8');
  assert.match(notice, /Human Connectome Project, WU-Minn/, 'the HCP acknowledgment is present');
  assert.match(notice, /1U54MH091657/);
  assert.match(notice, /CC BY-SA 4\.0/);
  assert.match(notice, /engineering assessment/i);
  for (const component of brain.components) {
    if (component.id === 'brainproject') continue;
    assert.ok(notice.includes(component.url), `${component.id} is credited with its URL`);
  }
});

test('the brain atlas passes the release gate for an alpha scene only: expert and clinician review are pending', () => {
  const brain = assetById('brain-atlas-glb');
  assert.deepEqual(assetReleaseProblems(brain, { sceneStatus: 'alpha', fileExists }), []);
  for (const sceneStatus of ['reviewed', 'production', undefined]) {
    const problems = assetReleaseProblems(brain, { sceneStatus, fileExists });
    assert.ok(has(problems, /anatomyExpertReview is pending/), `${sceneStatus}: ${problems}`);
    assert.ok(has(problems, /clinicianReview is pending/), `${sceneStatus}: ${problems}`);
    assert.equal(problems.length, 2, `${sceneStatus}: nothing else blocks it`);
  }
});

test('an asset referenced by a public scene has passed the release gate for that scene\'s maturity', () => {
  for (const scene of SCENES.filter((entry) => entry.status !== 'prototype')) {
    const profile = modelProfileForScene(scene);
    for (const id of profile?.assets ?? []) {
      const asset = assetById(id);
      assert.ok(asset, `${scene.id}: ${id} exists`);
      assert.deepEqual(assetReleaseProblems(asset, { sceneStatus: scene.status, fileExists }), [], `${scene.id} → ${id}`);
    }
  }
});

// ---------------------------------------------------------------------------
// Completeness for each kind and source type

test('a complete mesh record of every mesh source type passes, with only its own conditional block', () => {
  for (const sourceType of [ASSET_SOURCE_TYPE.REFERENCE_ATLAS, ASSET_SOURCE_TYPE.IMAGING_DERIVED, ASSET_SOURCE_TYPE.PROCEDURAL, ASSET_SOURCE_TYPE.MOLECULAR]) {
    assert.deepEqual(validateAssetManifest([meshOfType(sourceType)], { organIds: ORGAN_IDS }), [], sourceType);
  }
});

test('a complete third-party material record passes without any geometry, and a mesh cannot be third-party', () => {
  assert.deepEqual(validateAssetManifest([materialFixture()], { organIds: ORGAN_IDS }), []);
  const mesh = validateAssetManifest([meshOfType(ASSET_SOURCE_TYPE.THIRD_PARTY)]);
  assert.ok(has(mesh, /a mesh asset cannot have sourceType "third-party"/), mesh);
});

test('a material carrying a geometry block, or a mesh without one, is rejected rather than padded', () => {
  const padded = validateAssetManifest([materialFixture({ geometry: meshFixture().geometry })]);
  assert.ok(has(padded, /has no geometry of its own/), padded);
  const { geometry: _g, semanticParts: _s, ...bare } = meshFixture();
  const missing = validateAssetManifest([bare]);
  assert.ok(has(missing, /needs a geometry block/), missing);
  assert.ok(has(missing, /needs a semanticParts block/), missing);
});

test('a record missing its source type\'s conditional block, or any field in it, is rejected', () => {
  for (const [sourceType, { block, fields }] of Object.entries(CONDITIONAL_FIELDS)) {
    const complete = sourceType === ASSET_SOURCE_TYPE.THIRD_PARTY ? materialFixture() : meshOfType(sourceType);
    const { [block]: _dropped, ...withoutBlock } = complete;
    const missing = validateAssetManifest([withoutBlock]);
    assert.ok(has(missing, new RegExp(`requires a "${block}" block`)), `${sourceType}: ${missing}`);

    for (const field of fields) {
      const broken = { ...complete, [block]: { ...complete[block], [field]: Array.isArray(complete[block][field]) ? [] : '' } };
      const problems = validateAssetManifest([broken]);
      assert.ok(has(problems, new RegExp(`${block}\\.${field} is required|${block}\\.${field} must be`)), `${sourceType}.${field}: ${problems}`);
    }
  }
});

test('a record carrying another source type\'s block is rejected rather than silently accepted', () => {
  const mixed = meshFixture({ imaging: CONDITIONAL_BLOCKS[ASSET_SOURCE_TYPE.IMAGING_DERIVED].imaging });
  const problems = validateAssetManifest([mixed]);
  assert.ok(has(problems, /"imaging" block that belongs to imaging-derived/), problems);
});

test('de-identification is a structured status, never a sentence the gate would have to parse', () => {
  for (const vague of ['confirmed', 'yes, mostly', 'pending', 'probably fine', '']) {
    const imaging = meshOfType(ASSET_SOURCE_TYPE.IMAGING_DERIVED);
    imaging.imaging = { ...imaging.imaging, deidentification: vague };
    const problems = validateAssetManifest([imaging]);
    assert.ok(has(problems, /deidentification must be an object with status/), `"${vague}": ${problems}`);
    assert.ok(has(assetReleaseProblems(imaging), /de-identification .* not confirmed/), `"${vague}" is also blocked at release`);
  }
  const unrecorded = meshOfType(ASSET_SOURCE_TYPE.IMAGING_DERIVED);
  unrecorded.imaging = { ...unrecorded.imaging, deidentification: { status: DEIDENTIFICATION_STATUS.CONFIRMED, method: 'x', reference: null } };
  assert.ok(has(validateAssetManifest([unrecorded]), /confirmed without a repository record/));
});

test('an imaging-derived asset is blocked at release unless de-identification is confirmed', () => {
  for (const status of [DEIDENTIFICATION_STATUS.PENDING, DEIDENTIFICATION_STATUS.NOT_CONFIRMED]) {
    const imaging = meshOfType(ASSET_SOURCE_TYPE.IMAGING_DERIVED);
    imaging.imaging = { ...imaging.imaging, deidentification: { status, method: 'x', reference: 'docs/fixture-deid.md' } };
    assert.deepEqual(validateAssetManifest([imaging]), [], `${status} is a complete record`);
    assert.ok(has(assetReleaseProblems(imaging), /de-identification .* not confirmed/), status);
  }
  assert.equal(assetIsReleasable(meshOfType(ASSET_SOURCE_TYPE.IMAGING_DERIVED)), true);
});

// ---------------------------------------------------------------------------
// The common core rejects what it must, and never throws

test('an unknown kind, source type, licence decision, assessment, QA status, obligation kind or release status is rejected', () => {
  const cases = [
    [meshFixture({ kind: 'blob' }), /unknown kind "blob"/],
    [meshFixture({ sourceType: 'scan' }), /unknown sourceType "scan"/],
    [withLicense(meshFixture(), { commercialUse: 'yes' }), /license\.commercialUse must be one of/],
    [withLicense(meshFixture(), { assessment: 'vibes' }), /license\.assessment must be one of/],
    [withQa(meshFixture(), QA_GATE.FORMAT_VALIDATION, { status: 'ok', reference: null }), /qa\.formatValidation\.status must be one of/],
    [withLicense(meshFixture(), { obligations: [{ ...meshFixture().license.obligations[0], kind: 'vibes' }] }), /obligations\[0\]\.kind must be one of/],
    [meshFixture({ release: { status: 'live', note: 'x' } }), /release\.status must be one of/],
  ];
  for (const [entry, expected] of cases) {
    const problems = validateAssetManifest([entry]);
    assert.ok(has(problems, expected), `${expected}: ${problems}`);
  }
});

test('malformed input of every shape produces problem lines, not exceptions', () => {
  const garbage = [null, 42, 'asset', [], {}, { assetId: 'a' }, { assetId: 'b', qa: 'no', license: 'no', sources: 'no', components: 'no', output: 'no' }];
  let problems;
  assert.doesNotThrow(() => { problems = validateAssetManifest(garbage); });
  assert.ok(problems.length > 10);
  assert.ok(problems.every((line) => typeof line === 'string' && line.length > 0));
  assert.doesNotThrow(() => assetReleaseProblems(null));
  assert.deepEqual(assetReleaseProblems(null), ['asset "(no id)": not an asset record']);
  assert.doesNotThrow(() => assetReleaseProblems({ assetId: 'b', qa: 'no', license: 'no', sources: 'no' }));
  assert.deepEqual(validateAssetManifest('nope'), ['the asset manifest is not an array']);
});

test('hashes are 64 hex characters, a missing source hash needs a note, and a released asset needs every hash', () => {
  const bad = validateAssetManifest([meshFixture({ output: { path: 'public/x.glb', sha256: 'abc' } })]);
  assert.ok(has(bad, /output\.sha256 must be 64 lowercase hex/), bad);

  const nullOutput = validateAssetManifest([meshFixture({ output: { path: 'public/x.glb', sha256: null, note: 'x' } })]);
  assert.ok(has(nullOutput, /output\.sha256 is required/), nullOutput);

  const silentNull = validateAssetManifest([meshFixture({ sources: [{ path: 'https://example.invalid/a', sha256: null }] })]);
  assert.ok(has(silentNull, /sources\[0\]\.sha256 is null without a note/), silentNull);

  const withNote = meshFixture({ sources: [{ path: 'https://example.invalid/a', sha256: null, note: 'not fetched' }] });
  assert.deepEqual(validateAssetManifest([withNote]), [], 'a noted gap is a valid record');
  assert.ok(has(assetReleaseProblems(withNote), /sources\[0\] has no recorded hash/), 'and a blocked release');
});

test('duplicate ids, an output path that is a URL, bad dates and a bad commit are rejected', () => {
  assert.ok(has(validateAssetManifest([meshFixture(), meshFixture()]), /duplicate assetId/));
  assert.ok(has(validateAssetManifest([meshFixture({ output: { path: 'https://cdn.invalid/x.glb', sha256: FIXTURE_HASH } })]), /output\.path must be repository-relative/));
  assert.ok(has(validateAssetManifest([meshFixture({ source: { ...meshFixture().source, retrievedAt: 'September' } })]), /retrievedAt must be an ISO date or null/));
  assert.ok(has(validateAssetManifest([meshFixture({ source: { ...meshFixture().source, retrievedAt: null } })]), /retrievedAt is null without a retrievedAtNote/));
  assert.ok(has(validateAssetManifest([meshFixture({ source: { ...meshFixture().source, introducedIn: 'abc' } })]), /introducedIn must be a 40-character commit/));
});

test('repository paths are relative, inside the repository, and never URLs', () => {
  assert.equal(isRepositoryPath('docs/x.md'), true);
  for (const bad of ['/docs/x.md', '../secrets', 'docs/../../x', 'https://example.invalid/x', '', 'docs//x']) {
    assert.equal(isRepositoryPath(bad), false, bad);
  }
});

// ---------------------------------------------------------------------------
// QA gates: applicability is data, not a note

test('not-applicable is accepted only where the kind says the gate does not apply', () => {
  for (const gate of QA_GATE_IDS) {
    const problems = validateAssetManifest([withQa(meshFixture(), gate, { status: QA_STATUS.NOT_APPLICABLE })]);
    assert.ok(has(problems, new RegExp(`qa\\.${gate} applies to a mesh asset and cannot be not-applicable`)), `${gate}: ${problems}`);
  }
  const material = materialFixture();
  for (const gate of QA_GATE_IDS.filter((g) => !QA_APPLIES.material.includes(g))) {
    const problems = validateAssetManifest([withQa(material, gate, { status: QA_STATUS.PASSED, reference: 'docs/fixture-qa.md' })]);
    assert.ok(has(problems, new RegExp(`qa\\.${gate} does not apply to a material asset`)), `${gate}: ${problems}`);
  }
});

test('a gate cannot pass without a reference, and a hash-bound gate cannot pass without naming the file', () => {
  const blind = validateAssetManifest([withQa(meshFixture(), QA_GATE.ANATOMY_EXPERT_REVIEW, { status: QA_STATUS.PASSED, reference: null })]);
  assert.ok(has(blind, /qa\.anatomyExpertReview passed without a reference/), blind);
  const { assetSha256: _h, ...noHash } = meshFixture().qa.visualReview;
  const unbound = validateAssetManifest([withQa(meshFixture(), QA_GATE.VISUAL_REVIEW, noHash)]);
  assert.ok(has(unbound, /qa\.visualReview passed without naming the asset hash/), unbound);
  const { commit: _c, browser: _b, ...thin } = meshFixture().qa.visualReview;
  const thinProblems = validateAssetManifest([withQa(meshFixture(), QA_GATE.VISUAL_REVIEW, thin)]);
  assert.ok(has(thinProblems, /visualReview\.browser is missing/) && has(thinProblems, /visualReview\.commit must be/), thinProblems);
});

test('the release gate blocks every applicable gate that is failed, pending or unrecorded', () => {
  for (const gate of QA_GATE_IDS) {
    const failed = withQa(meshFixture(), gate, { ...meshFixture().qa[gate], status: QA_STATUS.FAILED });
    for (const sceneStatus of ['alpha', 'reviewed', 'production', undefined]) {
      assert.ok(has(assetReleaseProblems(failed, { sceneStatus }), new RegExp(`${gate} failed`)), `${gate} failed blocks at ${sceneStatus}`);
    }
    const pending = withQa(meshFixture(), gate, { status: QA_STATUS.PENDING, reference: 'docs/fixture-qa.md' });
    assert.ok(has(assetReleaseProblems(pending), new RegExp(`${gate} is pending, not passed`)), `${gate} pending blocks by default`);
    const { [gate]: _dropped, ...rest } = meshFixture().qa;
    assert.ok(has(assetReleaseProblems({ ...meshFixture(), qa: rest }), new RegExp(`${gate} is not recorded, not passed`)), `${gate} unrecorded blocks`);
  }
});

test('only the expert and clinician reviews may be pending, and only for an alpha scene', () => {
  for (const gate of [QA_GATE.ANATOMY_EXPERT_REVIEW, QA_GATE.CLINICIAN_REVIEW]) {
    const pending = withQa(meshFixture(), gate, { status: QA_STATUS.PENDING, reference: 'docs/fixture-qa.md' });
    assert.equal(assetIsReleasable(pending, { sceneStatus: 'alpha' }), true, `${gate} may wait at alpha`);
    for (const sceneStatus of ['reviewed', 'production', 'prototype', undefined]) {
      assert.equal(assetIsReleasable(pending, { sceneStatus }), false, `${gate} pending blocks at ${sceneStatus}`);
    }
  }
  for (const gate of [QA_GATE.FORMAT_VALIDATION, QA_GATE.SEMANTIC_INTEGRITY, QA_GATE.VISUAL_REVIEW]) {
    const pending = withQa(meshFixture(), gate, { status: QA_STATUS.PENDING, reference: 'docs/fixture-qa.md' });
    assert.equal(assetIsReleasable(pending, { sceneStatus: 'alpha' }), false, `${gate} pending blocks even at alpha`);
  }
});

test('a validator run with errors or warnings, or against another version of the file, does not count', () => {
  const errors = withQa(meshFixture(), QA_GATE.FORMAT_VALIDATION, { ...meshFixture().qa.formatValidation, errors: 2 });
  assert.ok(has(assetReleaseProblems(errors), /formatValidation has 2 errors/));
  const warnings = withQa(meshFixture(), QA_GATE.FORMAT_VALIDATION, { ...meshFixture().qa.formatValidation, warnings: 1 });
  assert.ok(has(assetReleaseProblems(warnings), /0 errors and 1 warnings/));
  for (const gate of [QA_GATE.FORMAT_VALIDATION, QA_GATE.SEMANTIC_INTEGRITY, QA_GATE.VISUAL_REVIEW]) {
    const stale = withQa(meshFixture(), gate, { ...meshFixture().qa[gate], assetSha256: 'b'.repeat(64) });
    assert.ok(has(assetReleaseProblems(stale), new RegExp(`${gate} was run against a different file`)), gate);
  }
});

test('a QA reference or a licence record that does not exist blocks release when a resolver is supplied', () => {
  const asset = meshFixture();
  const missing = (path) => path !== 'docs/fixture-qa.md';
  const problems = assetReleaseProblems(asset, { fileExists: missing });
  assert.ok(has(problems, /formatValidation reference "docs\/fixture-qa.md" does not exist/), problems);
  const noDecision = assetReleaseProblems(asset, { fileExists: (path) => path !== 'docs/fixture-decision.md' });
  assert.ok(has(noDecision, /licence decision record "docs\/fixture-decision.md" does not exist/), noDecision);
  assert.ok(has(noDecision, /obligation "attribution" points at "docs\/fixture-decision.md", which does not exist/), noDecision);
});

// ---------------------------------------------------------------------------
// Licence: the decision, the obligations, the components

test('restricted or unknown commercial use or redistribution is a valid record and a blocked release', () => {
  for (const field of ['commercialUse', 'redistribution']) {
    for (const decision of [LICENSE_DECISION.RESTRICTED, LICENSE_DECISION.UNKNOWN]) {
      const asset = withLicense(meshFixture(), { [field]: decision });
      assert.deepEqual(validateAssetManifest([asset]), [], `${field}=${decision} is a complete record`);
      const problems = assetReleaseProblems(asset);
      assert.ok(has(problems, new RegExp(`${field === 'commercialUse' ? 'commercial use' : 'redistribution'} is "${decision}", not allowed`)), `${field}=${decision}: ${problems}`);
      assert.equal(assetIsReleasable(asset), false);
    }
  }
});

test('a pending obligation, an obligation without a record, or a missing decision record blocks release', () => {
  const base = meshFixture();
  const pending = withLicense(base, { obligations: [{ ...base.license.obligations[0], status: OBLIGATION_STATUS.PENDING }] });
  assert.ok(has(assetReleaseProblems(pending), /obligation "attribution" is not satisfied/));
  const unrecorded = withLicense(base, { obligations: [{ ...base.license.obligations[0], satisfiedBy: null }] });
  assert.ok(has(validateAssetManifest([unrecorded]), /is satisfied by nothing/));
  assert.ok(has(assetReleaseProblems(unrecorded), /obligation "attribution" names no record/));
  const undecided = withLicense(base, { decisionRecord: null });
  assert.ok(has(assetReleaseProblems(undecided), /decision has no record/));
});

test('ShareAlike components must have a share-alike obligation, and components must be attributed', () => {
  const base = meshFixture();
  const sa = { ...base, components: [{ ...base.components[0], license: 'CC-BY-SA-4.0' }] };
  assert.ok(has(validateAssetManifest([sa]), /ShareAlike components but no share-alike obligation/));
  const unattributed = withLicense(base, { obligations: [] });
  assert.ok(has(validateAssetManifest([unattributed]), /has components but no attribution obligation/));
  const orphan = withLicense(base, { obligations: [{ ...base.license.obligations[0], components: ['ghost'] }] });
  assert.ok(has(validateAssetManifest([orphan]), /names component "ghost", which is not listed/));
  const uncomposed = { ...base, components: [] };
  assert.ok(has(validateAssetManifest([uncomposed]), /must list the components it is composed of/));
});

test('a non-released status, an organ outside the taxonomy, and a replacement target outside the manifest are reported', () => {
  for (const status of [RELEASE_STATUS.CANDIDATE, RELEASE_STATUS.LAB, RELEASE_STATUS.RETIRED]) {
    assert.ok(has(assetReleaseProblems(meshFixture({ release: { status, note: 'x' } })), new RegExp(`release status is "${status}"`)), status);
  }
  assert.ok(has(validateAssetManifest([meshFixture({ organs: ['gizzard'] })], { organIds: ORGAN_IDS }), /organ "gizzard" is not in the taxonomy/));
  assert.ok(has(validateAssetManifest([meshFixture({ organs: [] })]), /organs must be a non-empty list/));
  assert.ok(has(validateAssetManifest([meshFixture({ replacement: { replaces: 'ghost', rollback: 'x' } })]), /replaces "ghost", which is not in the manifest/));
});
