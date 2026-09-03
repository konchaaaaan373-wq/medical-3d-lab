import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  ASSERTABLE,
  ASTHMA_EVIDENCE,
  CIRCULATION_EVIDENCE,
  CONFIDENCE,
  COPD_EVIDENCE,
  EVIDENCE_REGISTRIES,
  HEPATORENAL_EVIDENCE,
  PULMONARY_EDEMA_EVIDENCE,
  LAYER,
  PORTAL_EVIDENCE,
  defineEvidence,
} from '../src/models/evidence.js';

/**
 * The confidence registry has to stay honest, and honest is checkable.
 *
 * Four things are being defended. That every claim declares how much weight it
 * carries. That the dossiers and the code do not drift apart. That a number the
 * model invented is never described anywhere as something that was measured.
 *
 * And, added after the final clinical review and the most important of the
 * four: **that a claim about the world is checked in the external or integrity
 * layer, and a claim about this model's own parameterisation is checked in the
 * calibration layer — never the other way round.**
 *
 * That last one is enforced twice over. `defineEvidence` refuses a mismatched
 * pairing at import. The tests below go further and check the *file* each named
 * test actually lives in, because a registry entry can claim a layer and the
 * test can sit somewhere else entirely, and then the separation is a comment
 * rather than a fact.
 */

/**
 * Which layer each test file belongs to.
 *
 * The external files are the short list on purpose: they are the only tests
 * whose failure licenses the sentence "the model has broken a constraint the
 * physiology imposes". Everything else is either implementation integrity or a
 * calibration this repository chose, and a file that is not named here is
 * treated as integrity.
 */
const FILE_LAYERS = {
  'circulation-physiology.test.js': LAYER.EXTERNAL,
  'respiratory-physiology.test.js': LAYER.EXTERNAL,
  'portal-haemodynamics.test.js': LAYER.EXTERNAL,
  'hepatorenal-physiology.test.js': LAYER.EXTERNAL,
  'calibration.test.js': LAYER.CALIBRATION,
};
const layerOf = (file) => FILE_LAYERS[file] ?? LAYER.INTEGRITY;

const DOSSIERS = {
  circulation: 'docs/model-evidence/circulation.md',
  copd: 'docs/model-evidence/copd.md',
  asthma: 'docs/model-evidence/asthma.md',
  'portal-hypertension': 'docs/model-evidence/cirrhosis-portal-hypertension.md',
  'hepatorenal-syndrome': 'docs/model-evidence/hepatorenal-syndrome.md',
  'pulmonary-edema': 'docs/model-evidence/pulmonary-edema.md',
};

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/** Every test title in the suite, and the file it lives in. */
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
        TEST_FILES.has(entry.validation),
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

test('the registries cover every model-backed scene and nothing is duplicated across them', () => {
  assert.deepEqual(
    EVIDENCE_REGISTRIES.map((registry) => registry[0].scene),
    ['circulation', 'copd', 'asthma', 'portal-hypertension', 'hepatorenal-syndrome', 'pulmonary-edema']
  );
  assert.ok(CIRCULATION_EVIDENCE.length >= 8);
  assert.ok(COPD_EVIDENCE.length >= 8);
  assert.ok(ASTHMA_EVIDENCE.length >= 8);
  assert.ok(PORTAL_EVIDENCE.length >= 8);
  assert.ok(HEPATORENAL_EVIDENCE.length >= 8);
  assert.ok(PULMONARY_EDEMA_EVIDENCE.length >= 8);
});

test('every named test lives in a file whose layer matches the entry', () => {
  // The separation enforced against the filesystem rather than against a
  // declaration. `defineEvidence` refuses a mismatched pairing at import, but
  // an entry can name the external layer and the test can sit in
  // `calibration.test.js` all the same, and then the taxonomy is a comment.
  //
  // This is the test that makes "a Layer 1 failure means the physiology was
  // violated" a fact about the repository rather than a convention.
  for (const registry of EVIDENCE_REGISTRIES) {
    for (const entry of registry) {
      if (!entry.validation) continue;
      const file = TEST_FILES.get(entry.validation);
      assert.ok(file, `${entry.scene}/${entry.id}: no test called "${entry.validation}"`);
      assert.equal(
        layerOf(file),
        entry.layer,
        `${entry.scene}/${entry.id} declares the ${entry.layer} layer but its test lives in ${file}, which is the ${layerOf(file)} layer`
      );
    }
  }
});

test('no claim about the world is defended by a test in the calibration layer', () => {
  // The same rule from the other direction, and the one the final review asked
  // for in so many words: a model's own parameterisation may not be the thing
  // that establishes a physiological claim.
  for (const registry of EVIDENCE_REGISTRIES) {
    for (const entry of registry) {
      if (!ASSERTABLE.has(entry.confidence) || !entry.validation) continue;
      assert.notEqual(
        layerOf(TEST_FILES.get(entry.validation)),
        LAYER.CALIBRATION,
        `${entry.scene}/${entry.id} is ${entry.confidence} and is checked in the calibration layer`
      );
    }
  }
});

test('a malformed entry is refused at definition rather than at read time', () => {
  const ok = { claim: 'a claim long enough to pass', source: 'somewhere in particular' };
  const external = { validation: 'physiology: raising airway resistance lengthens the expiratory time constant', layer: LAYER.EXTERNAL };

  assert.throws(
    () => defineEvidence('x', [{ id: 'a', ...ok, ...external, confidence: 'quite-sure' }]),
    /not one of the six/
  );
  assert.throws(
    () => defineEvidence('x', [{ id: 'a', ...ok, confidence: CONFIDENCE.ILLUSTRATIVE }]),
    /must say what it is not/
  );
  assert.throws(
    () => defineEvidence('x', [
      { id: 'a', ...ok, ...external, confidence: CONFIDENCE.ESTABLISHED },
      { id: 'a', ...ok, ...external, confidence: CONFIDENCE.ESTABLISHED },
    ]),
    /duplicate/
  );
  assert.throws(
    () => defineEvidence('x', [{ id: 'a', ...ok, confidence: CONFIDENCE.ESTABLISHED }]),
    /names no test/
  );
  assert.throws(
    () => defineEvidence('x', [{ id: 'a', ...ok, confidence: CONFIDENCE.ESTABLISHED, validation: 'something' }]),
    /not which layer/
  );

  // The two the final review asked for, and the reason this file exists.
  assert.throws(
    () => defineEvidence('x', [
      { id: 'a', ...ok, confidence: CONFIDENCE.ESTABLISHED, validation: 'something', layer: LAYER.CALIBRATION },
    ]),
    /cannot be established by a constant this repository chose/
  );
  assert.throws(
    () => defineEvidence('x', [
      {
        id: 'a',
        ...ok,
        confidence: CONFIDENCE.ILLUSTRATIVE,
        note: 'invented, and not a measurement',
        validation: 'something',
        layer: LAYER.EXTERNAL,
      },
    ]),
    /cannot be asserted as a physiological invariant/
  );
});
