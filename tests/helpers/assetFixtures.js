/**
 * Complete, well-formed asset-manifest records for tests to break one field at
 * a time. Everything in them is obviously a fixture; none of it describes a
 * real file.
 */
import {
  ASSET_KIND,
  ASSET_MANIFEST_SCHEMA_VERSION,
  ASSET_SOURCE_TYPE,
  ASSESSMENT_BASIS,
  DEIDENTIFICATION_STATUS,
  LICENSE_DECISION,
  OBLIGATION_KIND,
  OBLIGATION_STATUS,
  QA_STATUS,
  RELEASE_STATUS,
} from '../../src/catalog/assetManifest.js';

export const FIXTURE_HASH = 'a'.repeat(64);
export const FIXTURE_COMMIT = '0'.repeat(40);

const passedFormat = () => ({
  status: QA_STATUS.PASSED,
  tool: 'fixture-validator',
  toolVersion: '0.0.0',
  assetSha256: FIXTURE_HASH,
  checkedAt: '2026-01-01T00:00:00Z',
  errors: 0,
  warnings: 0,
  infos: 0,
  scope: 'fixture',
  reference: 'docs/fixture-qa.md',
});

/** The full QA block of a mesh that passed everything. */
export const passedMeshQa = () => ({
  formatValidation: passedFormat(),
  semanticIntegrity: { status: QA_STATUS.PASSED, assetSha256: FIXTURE_HASH, reference: 'tests/fixture.test.js', scope: 'fixture' },
  anatomyExpertReview: { status: QA_STATUS.PASSED, reference: 'docs/fixture-qa.md', scope: 'fixture' },
  visualReview: {
    status: QA_STATUS.PASSED,
    assetSha256: FIXTURE_HASH,
    reference: 'docs/fixture-qa.md',
    browser: 'fixture 1.0',
    viewport: '1x1',
    scene: 'fixture-scene',
    commit: FIXTURE_COMMIT,
    reviewedAt: '2026-01-01',
    scope: 'fixture',
  },
  clinicianReview: { status: QA_STATUS.PASSED, reference: 'docs/fixture-qa.md', scope: 'fixture' },
});

/** A complete reference-atlas mesh record. */
export const meshFixture = (overrides = {}) => ({
  assetId: 'fixture-atlas',
  schemaVersion: ASSET_MANIFEST_SCHEMA_VERSION,
  kind: ASSET_KIND.MESH,
  sourceType: ASSET_SOURCE_TYPE.REFERENCE_ATLAS,
  format: 'glb',
  organs: ['heart'],
  structureScope: 'Fixture: a heart for tests.',
  source: {
    name: 'Fixture atlas',
    url: 'https://example.invalid/fixture',
    fileUrl: 'https://example.invalid/fixture.glb',
    revision: 'v0',
    retrievedAt: '2026-01-01',
    introducedAt: '2026-01-01',
    introducedIn: FIXTURE_COMMIT,
  },
  license: {
    spdx: 'CC-BY-4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Fixture contributors',
    redistribution: LICENSE_DECISION.ALLOWED,
    commercialUse: LICENSE_DECISION.ALLOWED,
    assessment: ASSESSMENT_BASIS.ENGINEERING,
    assessedAt: '2026-01-01',
    decisionRecord: 'docs/fixture-decision.md',
    decisionNote: 'Fixture decision.',
    obligations: [
      {
        id: 'attribution',
        kind: OBLIGATION_KIND.ATTRIBUTION,
        components: ['fixture-source'],
        requirement: 'Credit the fixture.',
        status: OBLIGATION_STATUS.SATISFIED,
        satisfiedBy: 'docs/fixture-decision.md',
        displayedVia: 'fixture',
      },
    ],
  },
  components: [
    {
      id: 'fixture-source',
      name: 'Fixture source',
      url: 'https://example.invalid/source',
      license: 'CC-BY-4.0',
      role: 'everything',
      additionalTerms: null,
    },
  ],
  sources: [{ path: 'https://example.invalid/fixture.glb', sha256: FIXTURE_HASH }],
  output: { path: 'public/assets/fixture/fixture.glb', sha256: FIXTURE_HASH, bytes: 1 },
  geometry: { coordinateSystem: 'glTF', units: 'metres', extent: 'fixture', scaleNote: 'fixture' },
  pipeline: { tools: ['fixture-tool 1.0'], generator: null, steps: ['fixture step'] },
  semanticParts: { partIdSource: 'fixture extras', mappingModule: null, partCount: 0 },
  acceptedSimplifications: [],
  knownDefects: [],
  budget: { triangles: 1, materials: 1, textures: 0, bytes: 1, targetDevices: 'fixture' },
  qa: passedMeshQa(),
  replacement: { replaces: null, rollback: 'fixture' },
  release: { status: RELEASE_STATUS.RELEASED, note: 'fixture' },
  atlas: { sourceObjectId: 'fixture-object', derivativeTerms: 'fixture' },
  ...overrides,
});

/** The conditional block each source type needs, complete. */
export const CONDITIONAL_BLOCKS = {
  [ASSET_SOURCE_TYPE.REFERENCE_ATLAS]: { atlas: { sourceObjectId: 'x', derivativeTerms: 'x' } },
  [ASSET_SOURCE_TYPE.IMAGING_DERIVED]: {
    imaging: {
      dataset: 'fixture dataset',
      subjectProvenance: 'fixture',
      deidentification: { status: DEIDENTIFICATION_STATUS.CONFIRMED, method: 'fixture', reference: 'docs/fixture-deid.md' },
      segmentationMethod: 'fixture',
      registrationMethod: 'fixture',
      manualEdits: 'none',
    },
  },
  [ASSET_SOURCE_TYPE.PROCEDURAL]: {
    procedural: { generatorVersion: 'x', seedOrConfig: 'x', inputParameters: 'x', regenerate: 'x' },
  },
  [ASSET_SOURCE_TYPE.MOLECULAR]: { molecular: { accession: '1ABC', assembly: '1', structureVersion: 'x' } },
  [ASSET_SOURCE_TYPE.THIRD_PARTY]: { thirdParty: { upstreamItem: 'fixture texture', termsUrl: 'https://example.invalid/terms' } },
};

/** A mesh fixture of another source type: swap the conditional block. */
export const meshOfType = (sourceType, overrides = {}) => {
  const { atlas: _atlas, ...base } = meshFixture({ sourceType });
  return { ...base, ...CONDITIONAL_BLOCKS[sourceType], ...overrides };
};

/** A complete third-party material record: no geometry, only the two gates that apply. */
export const materialFixture = (overrides = {}) => {
  const { atlas: _atlas, geometry: _geometry, semanticParts: _parts, ...base } = meshFixture();
  return {
    ...base,
    assetId: 'fixture-material',
    kind: ASSET_KIND.MATERIAL,
    sourceType: ASSET_SOURCE_TYPE.THIRD_PARTY,
    format: 'png',
    output: { path: 'public/assets/fixture/fixture.png', sha256: FIXTURE_HASH, bytes: 1 },
    budget: { triangles: null, materials: null, textures: 1, bytes: 1, targetDevices: 'fixture' },
    qa: {
      formatValidation: passedFormat(),
      semanticIntegrity: { status: QA_STATUS.NOT_APPLICABLE },
      anatomyExpertReview: { status: QA_STATUS.NOT_APPLICABLE },
      visualReview: passedMeshQa().visualReview,
      clinicianReview: { status: QA_STATUS.NOT_APPLICABLE },
    },
    ...CONDITIONAL_BLOCKS[ASSET_SOURCE_TYPE.THIRD_PARTY],
    ...overrides,
  };
};

/** Replace one QA gate on a fixture. */
export const withQa = (asset, gate, entry) => ({ ...asset, qa: { ...asset.qa, [gate]: entry } });
/** Replace one licence field on a fixture. */
export const withLicense = (asset, fields) => ({ ...asset, license: { ...asset.license, ...fields } });
