import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EDUCATION_PROGRESS_STORAGE_KEY,
  educationResumeIndex,
  markEducationComplete,
  readEducationProgress,
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
