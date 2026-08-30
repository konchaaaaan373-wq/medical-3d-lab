import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  ASSERTABLE,
  ASTHMA_EVIDENCE,
  CONFIDENCE,
  COPD_EVIDENCE,
  EVIDENCE_REGISTRIES,
  PORTAL_EVIDENCE,
  defineEvidence,
} from '../src/models/evidence.js';

/**
 * The confidence registry has to stay honest, and honest is checkable.
 *
 * Three things are being defended here. That every claim declares how much
 * weight it carries. That the dossiers and the code do not drift apart. And,
 * the one that matters most, that a number the model invented is never
 * described anywhere as something that was measured.
 */

const DOSSIERS = {
  copd: 'docs/model-evidence/copd.md',
  asthma: 'docs/model-evidence/asthma.md',
  'portal-hypertension': 'docs/model-evidence/cirrhosis-portal-hypertension.md',
};

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const TEST_TITLES = (() => {
  const dir = new URL('.', import.meta.url);
  const titles = new Set();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.test.js')) continue;
    const source = readFileSync(new URL(file, dir), 'utf8');
    for (const match of source.matchAll(/^test\(\s*(['"`])([\s\S]*?)\1\s*,/gm)) titles.add(match[2]);
  }
  return titles;
})();

test('every claim declares one of the five confidence levels', () => {
  const levels = new Set(Object.values(CONFIDENCE));
  for (const registry of EVIDENCE_REGISTRIES) {
    for (const entry of registry) {
      assert.ok(levels.has(entry.confidence), `${entry.scene}/${entry.id}: "${entry.confidence}"`);
      assert.ok(entry.claim.length > 20, `${entry.scene}/${entry.id}: the claim has to say something`);
      assert.ok(entry.source.length > 10, `${entry.scene}/${entry.id}: a source, even if the source is "none"`);
    }
  }
});

test('anything that is not asserted has to say what it is not', () => {
  // The rule this file exists for. A calibration constant, an illustrative
  // one, or a known-uncertain claim has to carry a note explaining what it is
  // not — because on screen it renders as digits like everything else.
  for (const registry of EVIDENCE_REGISTRIES) {
    for (const entry of registry) {
      if (ASSERTABLE.has(entry.confidence)) continue;
      assert.ok(entry.note, `${entry.scene}/${entry.id} is ${entry.confidence} and carries no note`);
      assert.ok(
        !/\bmeasured\b|\bmeasurement of\b/i.test(entry.claim),
        `${entry.scene}/${entry.id} is ${entry.confidence} and its claim uses the language of measurement`
      );
    }
  }
});

test('every calibration and illustrative entry says so in the words the model card uses', () => {
  // Not a style check: "calibration" and "illustrative" are the two words the
  // model cards and scope panels use, and a note that avoids them is a note a
  // reader will not connect to the caveat they were given elsewhere.
  for (const registry of EVIDENCE_REGISTRIES) {
    for (const entry of registry) {
      if (entry.confidence === CONFIDENCE.CALIBRATION) {
        assert.ok(
          /calibrat|chosen so|hit a target|numbers that hit/i.test(`${entry.source} ${entry.note}`),
          `${entry.scene}/${entry.id}: a calibration has to say what it was calibrated to`
        );
      }
      if (entry.confidence === CONFIDENCE.ILLUSTRATIVE) {
        assert.ok(
          /invented|no source|illustrative|chosen/i.test(`${entry.source} ${entry.note}`),
          `${entry.scene}/${entry.id}: an illustrative value has to admit it`
        );
      }
    }
  }
});

test('every claim the model asserts names a test that exists', () => {
  // An `established` or `supported` entry is a statement about the world. If
  // nothing checks it, the registry is describing an intention rather than a
  // property of the code.
  for (const registry of EVIDENCE_REGISTRIES) {
    for (const entry of registry) {
      if (!ASSERTABLE.has(entry.confidence)) continue;
      assert.ok(entry.validation, `${entry.scene}/${entry.id} is ${entry.confidence} and names no test`);
      assert.ok(
        TEST_TITLES.has(entry.validation),
        `${entry.scene}/${entry.id} names a test that does not exist: "${entry.validation}"`
      );
    }
  }
});

test('every registry entry is named in its scene’s evidence dossier', () => {
  // Keeps the prose and the data from drifting. A claim that exists in one and
  // not the other is a claim nobody is maintaining.
  for (const registry of EVIDENCE_REGISTRIES) {
    const dossier = read(DOSSIERS[registry[0].scene]);
    for (const entry of registry) {
      assert.ok(
        dossier.includes(`\`${entry.id}\``),
        `${entry.scene}: the dossier does not mention \`${entry.id}\``
      );
    }
  }
});

test('each registry is honest about how much of it is invented', () => {
  // A registry in which everything is `established` would be a registry that
  // had stopped doing its job. Each of these models rests on numbers nobody
  // measured, and each has to say so about at least a few of them.
  for (const registry of EVIDENCE_REGISTRIES) {
    const weak = registry.filter((entry) => !ASSERTABLE.has(entry.confidence));
    assert.ok(
      weak.length >= 3,
      `${registry[0].scene}: only ${weak.length} entries admit to being calibration, illustrative or uncertain`
    );
    const invented = registry.filter((entry) => entry.confidence === CONFIDENCE.ILLUSTRATIVE);
    assert.ok(invented.length >= 1, `${registry[0].scene}: nothing is marked illustrative, which cannot be right`);
  }
});

test('each scene records the direction it is known to get wrong', () => {
  // Every one of these models has at least one. Recording it is the difference
  // between a limitation and a trap.
  for (const registry of EVIDENCE_REGISTRIES) {
    assert.ok(
      registry.some((entry) => entry.confidence === CONFIDENCE.UNCERTAIN),
      `${registry[0].scene}: no known weakness is recorded, which is not credible`
    );
  }
});

test('the registries cover the three scenes and nothing is duplicated across them', () => {
  assert.deepEqual(
    EVIDENCE_REGISTRIES.map((registry) => registry[0].scene),
    ['copd', 'asthma', 'portal-hypertension']
  );
  assert.ok(COPD_EVIDENCE.length >= 8);
  assert.ok(ASTHMA_EVIDENCE.length >= 8);
  assert.ok(PORTAL_EVIDENCE.length >= 8);
});

test('a malformed entry is refused at definition rather than at read time', () => {
  assert.throws(() => defineEvidence('x', [{ id: 'a', claim: 'a claim long enough', confidence: 'quite-sure', source: 'somewhere' }]));
  assert.throws(() => defineEvidence('x', [{ id: 'a', claim: 'a claim long enough', confidence: CONFIDENCE.ILLUSTRATIVE, source: 'none' }]),
    /must say what it is not/);
  assert.throws(() => defineEvidence('x', [
    { id: 'a', claim: 'a claim long enough', confidence: CONFIDENCE.ESTABLISHED, source: 'somewhere' },
    { id: 'a', claim: 'another claim, also long', confidence: CONFIDENCE.ESTABLISHED, source: 'somewhere' },
  ]), /duplicate/);
});
