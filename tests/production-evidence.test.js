import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  ALL_EVIDENCE_REGISTRIES,
  AMYLOID_BETA_EVIDENCE,
  ASSERTABLE,
  CONFIDENCE,
  HEART_FAILURE_EVIDENCE,
  LAYER,
} from '../src/models/evidenceRegistry.js';

const NEW_REGISTRIES = [HEART_FAILURE_EVIDENCE, AMYLOID_BETA_EVIDENCE];
const DOSSIERS = {
  'heart-failure': 'docs/model-evidence/heart-failure.md',
  'amyloid-beta': 'docs/model-evidence/amyloid-beta.md',
};
const EXTERNAL_TEST_FILES = new Set(['heart-failure-physiology.test.js', 'amyloid-physiology.test.js']);

const TEST_FILES = (() => {
  const dir = new URL('.', import.meta.url);
  const found = new Map();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.test.js')) continue;
    const source = readFileSync(new URL(file, dir), 'utf8');
    for (const match of source.matchAll(/^test\(\s*(['"`])([\s\S]*?)\1\s*,/gm)) found.set(match[2], file);
  }
  return found;
})();

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('migrated production evidence and the complete model registry stay in one discoverable list', () => {
  assert.deepEqual(
    ALL_EVIDENCE_REGISTRIES.map((registry) => registry[0].scene),
    ['heart-failure', 'amyloid-beta', 'hfpef', 'circulation', 'copd', 'asthma', 'portal-hypertension', 'hepatorenal-syndrome']
  );
});

test('each migrated production registry carries enough explicit weakness to stay honest', () => {
  for (const registry of NEW_REGISTRIES) {
    assert.ok(registry.length >= 8, `${registry[0].scene} has too few evidence entries`);
    assert.ok(
      registry.filter((entry) => ASSERTABLE.has(entry.confidence)).length >= 3,
      `${registry[0].scene} needs at least three externally supportable claims`
    );
    assert.ok(
      registry.filter((entry) => !ASSERTABLE.has(entry.confidence)).length >= 3,
      `${registry[0].scene} needs explicit calibration/approximation/uncertainty entries`
    );
    assert.ok(
      registry.some((entry) => entry.confidence === CONFIDENCE.ILLUSTRATIVE),
      `${registry[0].scene} must name an illustrative choice`
    );
    assert.ok(
      registry.some((entry) => entry.confidence === CONFIDENCE.UNCERTAIN),
      `${registry[0].scene} must name a known weakness`
    );
  }
});

test('every migrated world claim is checked by a dedicated external-physiology test', () => {
  for (const registry of NEW_REGISTRIES) {
    for (const entry of registry) {
      if (!ASSERTABLE.has(entry.confidence)) continue;
      assert.ok(entry.validation, `${entry.scene}/${entry.id} has no validating test`);
      const file = TEST_FILES.get(entry.validation);
      assert.ok(file, `${entry.scene}/${entry.id} names missing test: ${entry.validation}`);
      if (entry.layer === LAYER.EXTERNAL) {
        assert.ok(EXTERNAL_TEST_FILES.has(file), `${entry.scene}/${entry.id} external claim lives in ${file}`);
      }
    }
  }
});

test('every migrated evidence id is documented in its dossier', () => {
  for (const registry of NEW_REGISTRIES) {
    const dossier = read(DOSSIERS[registry[0].scene]);
    for (const entry of registry) {
      assert.ok(dossier.includes(`\`${entry.id}\``), `${entry.scene} dossier omits ${entry.id}`);
    }
  }
});

test('the two old production scenes remain unversioned until a current clinical sign-off exists', () => {
  const registry = JSON.parse(read('docs/clinical-reviews/registry.json'));
  for (const sceneId of ['heart-failure', 'amyloid-beta']) {
    const record = registry.find((entry) => entry.sceneId === sceneId);
    assert.equal(record?.reviewStatus, 'legacy-unversioned');
    assert.equal(record?.reviewedAt, null);
    assert.equal(record?.reviewedCommit, null);
    assert.ok(record.sources.some((source) => source.includes('model-evidence')), `${sceneId} should point at its new dossier`);
    assert.ok(record.sources.some((source) => source.includes('model-cards')), `${sceneId} should point at its new model card`);
  }
});
