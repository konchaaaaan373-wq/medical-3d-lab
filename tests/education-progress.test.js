import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EDUCATION_PROGRESS_STORAGE_KEY,
  educationGuideRevision,
  educationResumeIndex,
  markEducationComplete,
  markEducationGuideComplete,
  readEducationGuideProgress,
  readEducationProgress,
  saveEducationGuideStep,
  saveEducationStep,
} from '../src/access/educationProgress.js';

function memoryStorage(initial = null) {
  let raw = initial;
  return {
    getItem(key) {
      assert.equal(key, EDUCATION_PROGRESS_STORAGE_KEY);
      return raw;
    },
    setItem(key, value) {
      assert.equal(key, EDUCATION_PROGRESS_STORAGE_KEY);
      raw = value;
    },
    value() {
      return raw ? JSON.parse(raw) : null;
    },
  };
}

function guide(answer = 'Reason A') {
  return {
    title: 'Guide',
    titleJa: 'ガイド',
    steps: [
      {
        kind: 'predict',
        progress: 0.2,
        title: 'One',
        titleJa: '1',
        prompt: 'Question one?',
        promptJa: '質問1',
        answer,
        answerJa: '回答1',
      },
      {
        kind: 'scope',
        progress: 1,
        title: 'Two',
        titleJa: '2',
        prompt: 'Question two?',
        promptJa: '質問2',
        answer: 'Boundary',
        answerJa: '境界',
      },
    ],
  };
}

test('education progress: an untouched guide starts at the first step', () => {
  const storage = memoryStorage();
  assert.deepEqual(readEducationProgress('heart-failure', 4, storage), {
    step: 0,
    completed: false,
  });
});

test('education progress: an incomplete guide resumes from its saved step', () => {
  const storage = memoryStorage();
  saveEducationStep('heart-failure', 2, 4, storage);
  const progress = readEducationProgress('heart-failure', 4, storage);
  assert.deepEqual(progress, { step: 2, completed: false });
  assert.equal(educationResumeIndex(progress), 2);
});

test('education progress: completion persists but a completed guide restarts at step one', () => {
  const storage = memoryStorage();
  markEducationComplete('copd-hyperinflation', 4, storage);
  let progress = readEducationProgress('copd-hyperinflation', 4, storage);
  assert.deepEqual(progress, { step: 3, completed: true });
  assert.equal(educationResumeIndex(progress), 0);

  // Reviewing an earlier step does not erase a completion the learner already
  // earned for this exact authored guide.
  saveEducationStep('copd-hyperinflation', 1, 4, storage);
  progress = readEducationProgress('copd-hyperinflation', 4, storage);
  assert.deepEqual(progress, { step: 1, completed: true });
});

test('education progress: changing the authored guide shape invalidates stale completion', () => {
  const storage = memoryStorage();
  markEducationComplete('asthma-heterogeneity', 4, storage);
  assert.deepEqual(readEducationProgress('asthma-heterogeneity', 5, storage), {
    step: 3,
    completed: false,
  });
});

test('education progress: same step count but revised teaching copy restarts safely', () => {
  const storage = memoryStorage();
  const original = guide('Original reasoning');
  const revised = guide('Corrected reasoning');

  assert.notEqual(educationGuideRevision(original), educationGuideRevision(revised));
  saveEducationGuideStep('heart-failure', original, 1, storage);
  markEducationGuideComplete('heart-failure', original, storage);
  assert.deepEqual(readEducationGuideProgress('heart-failure', original, storage), {
    step: 1,
    completed: true,
  });

  assert.deepEqual(readEducationGuideProgress('heart-failure', revised, storage), {
    step: 0,
    completed: false,
  });
});

test('education progress: guide-aware storage keeps only navigation state plus a content revision', () => {
  const storage = memoryStorage();
  const authored = guide();
  saveEducationGuideStep('portal-hypertension', authored, 1, storage);
  const stored = storage.value();
  const record = stored['portal-hypertension'];

  assert.deepEqual(Object.keys(stored), ['portal-hypertension']);
  assert.deepEqual(Object.keys(record).sort(), ['completed', 'revision', 'step', 'stepCount']);
  assert.match(record.revision, /^guide-2-/);
  const raw = JSON.stringify(stored);
  assert.equal(raw.includes('Question one'), false);
  assert.equal(raw.includes('Reason A'), false);
  assert.equal(raw.includes('patient'), false);
  assert.equal(raw.includes('metric'), false);
});

test('education progress: storage contains navigation state only', () => {
  const storage = memoryStorage();
  saveEducationStep('portal-hypertension', 1, 4, storage);
  const stored = storage.value();
  assert.deepEqual(Object.keys(stored), ['portal-hypertension']);
  assert.deepEqual(Object.keys(stored['portal-hypertension']).sort(), ['completed', 'step', 'stepCount']);
  assert.equal(JSON.stringify(stored).includes('patient'), false);
  assert.equal(JSON.stringify(stored).includes('metric'), false);
});

test('education progress: malformed persistent storage fails back to a safe default', () => {
  const storage = memoryStorage('{ definitely-not-json');
  assert.doesNotThrow(() => readEducationProgress('amyloid-beta', 4, storage));
  assert.deepEqual(readEducationProgress('amyloid-beta', 4, storage), {
    step: 0,
    completed: false,
  });
});

test('education progress: a browser that reads but refuses to write still remembers this session', () => {
  // Private and embedded browsers let a page read storage and refuse to let it
  // write: `getItem` returns null quite happily, and `setItem` throws. The
  // in-memory copy exists exactly for that case — and was written on every save
  // and read back on none of them, because an empty read returned `{}` and
  // threw it away. A learner three steps into a guide went back to step one on
  // the next read, in the one context the fallback was built for.
  const readOnly = {
    getItem: () => null,
    setItem: () => {
      throw new Error('storage denied');
    },
  };

  assert.deepEqual(readEducationProgress('write-denied', 4, readOnly), { step: 0, completed: false });
  saveEducationStep('write-denied', 2, 4, readOnly);
  assert.deepEqual(
    readEducationProgress('write-denied', 4, readOnly),
    { step: 2, completed: false },
    'the step taken this session was forgotten immediately'
  );

  markEducationComplete('write-denied', 4, readOnly);
  assert.equal(readEducationProgress('write-denied', 4, readOnly).completed, true);
});

test('education progress: what is on disk wins when the write reached disk', () => {
  // The merge has a direction, and the direction depends on whether the last
  // write landed. When it did, disk is the record and the in-memory copy is a
  // stale copy of it, so disk wins — otherwise the shadow would resurrect
  // progress another tab had moved on from. The other case is below.
  const storage = memoryStorage();
  saveEducationStep('disk-wins', 1, 4, storage);
  assert.deepEqual(readEducationProgress('disk-wins', 4, storage), { step: 1, completed: false });

  // Another tab moved on, and this page's in-memory copy still says step 1.
  storage.setItem(EDUCATION_PROGRESS_STORAGE_KEY, JSON.stringify({
    'disk-wins': { step: 3, stepCount: 4, completed: false },
  }));
  assert.deepEqual(
    readEducationProgress('disk-wins', 4, storage),
    { step: 3, completed: false },
    'the stale in-memory copy shadowed the durable record'
  );
});

test('education progress: one storage does not see what was saved into another', () => {
  // The in-memory copy is a shadow of a particular storage. Held as one
  // module-level variable it was a shadow of nothing: a save into one storage
  // appeared in reads of every other, and in what the next save wrote to disk.
  const first = memoryStorage();
  const second = memoryStorage();
  saveEducationStep('only-in-first', 2, 4, first);

  assert.deepEqual(readEducationProgress('only-in-first', 4, second), { step: 0, completed: false });
  saveEducationStep('only-in-second', 1, 4, second);
  assert.deepEqual(Object.keys(second.value()), ['only-in-second']);
  assert.deepEqual(Object.keys(first.value()), ['only-in-first']);
});

test('education progress: a refused write keeps its progress against a stale disk record', () => {
  // The case the merge got backwards. A full quota refuses a write to a key
  // that already holds an older value, so `getItem` returns real — but stale —
  // JSON while `setItem` throws. Merging disk over memory there hands the
  // learner back the step they were on before this session, which is the exact
  // failure the in-memory copy exists to prevent.
  let raw = JSON.stringify({ quota: { step: 0, stepCount: 4, completed: false } });
  const full = {
    getItem: () => raw,
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };

  assert.deepEqual(readEducationProgress('quota', 4, full), { step: 0, completed: false });
  saveEducationStep('quota', 3, 4, full);
  assert.deepEqual(
    readEducationProgress('quota', 4, full),
    { step: 3, completed: false },
    'a stale disk record overrode progress the write could not persist'
  );

  // And once a write does land, disk is authoritative again.
  const recovered = {
    getItem: () => raw,
    setItem: (key, value) => {
      raw = value;
    },
  };
  saveEducationStep('quota', 1, 4, recovered);
  raw = JSON.stringify({ quota: { step: 2, stepCount: 4, completed: false } });
  assert.deepEqual(
    readEducationProgress('quota', 4, recovered),
    { step: 2, completed: false },
    'a landed write left the shadow outranking disk'
  );
});
