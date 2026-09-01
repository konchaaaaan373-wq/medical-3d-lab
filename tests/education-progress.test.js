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
