import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  ASSERTABLE,
  CONFIDENCE,
  HFPEF_EVIDENCE,
  LAYER,
} from '../src/models/evidenceRegistry.js';

const DOSSIER = readFileSync(new URL('../docs/model-evidence/hfpef.md', import.meta.url), 'utf8');
const MODEL_CARD = readFileSync(new URL('../docs/model-cards/hfpef.md', import.meta.url), 'utf8');
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

test('HFpEF evidence: registry has external claims plus explicit approximation/calibration/uncertainty', () => {
  assert.ok(HFPEF_EVIDENCE.length >= 10);
  assert.ok(HFPEF_EVIDENCE.filter((entry) => ASSERTABLE.has(entry.confidence)).length >= 3);
  assert.ok(HFPEF_EVIDENCE.some((entry) => entry.confidence === CONFIDENCE.CALIBRATION));
  assert.ok(HFPEF_EVIDENCE.some((entry) => entry.confidence === CONFIDENCE.ILLUSTRATIVE));
  assert.ok(HFPEF_EVIDENCE.some((entry) => entry.confidence === CONFIDENCE.APPROXIMATION));
  assert.ok(HFPEF_EVIDENCE.some((entry) => entry.confidence === CONFIDENCE.UNCERTAIN));
});

test('HFpEF evidence: every external claim names a real dedicated physiology test', () => {
  for (const entry of HFPEF_EVIDENCE) {
    if (!ASSERTABLE.has(entry.confidence)) continue;
    assert.equal(entry.layer, LAYER.EXTERNAL, `${entry.id}: HFpEF world claim should be external`);
    assert.ok(entry.validation, `${entry.id}: missing validation`);
    assert.equal(
      TEST_FILES.get(entry.validation),
      'hfpef-physiology.test.js',
      `${entry.id}: external claim is not checked in the dedicated HFpEF physiology layer`
    );
  }
});

test('HFpEF evidence: every claim ID is visible in the evidence dossier', () => {
  for (const entry of HFPEF_EVIDENCE) {
    assert.ok(DOSSIER.includes(`\`${entry.id}\``), `dossier omits ${entry.id}`);
  }
});

test('HFpEF evidence: the model card preserves the intended-use and diagnostic boundary', () => {
  assert.match(MODEL_CARD, /\*\*Catalog status:\*\*\s*`alpha`/);
  assert.match(MODEL_CARD, /Clinical Review registry:\*\*\s*`pending`/);
  assert.match(MODEL_CARD, /must not be used to diagnose HFpEF/i);
  assert.match(MODEL_CARD, /filling.*not a fluid dose/is);
});

test('HFpEF evidence: non-asserted model choices never call themselves patient measurements', () => {
  for (const entry of HFPEF_EVIDENCE) {
    if (ASSERTABLE.has(entry.confidence)) continue;
    assert.ok(entry.note, `${entry.id}: weak claim has no boundary note`);
    assert.doesNotMatch(entry.claim, /\bpatient measurement\b|\bmeasured patient\b/i, entry.id);
  }
});
