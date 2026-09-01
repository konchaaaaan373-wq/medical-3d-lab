const STORAGE_KEY = 'medical3dlab.education-progress.v1';
let volatileStore = {};

const emptyProgress = () => ({ step: 0, completed: false });

function normaliseRecord(value, stepCount) {
  const count = Math.max(1, Math.floor(Number(stepCount) || 1));
  if (!value || typeof value !== 'object') return emptyProgress();

  // Completion belongs to the exact authored guide shape. If the number of
  // steps changes after a content revision, force the learner to revisit the
  // guide rather than carrying a stale completion badge across new material.
  const sameGuideShape = Number(value.stepCount) === count;
  const rawStep = Number.isFinite(Number(value.step)) ? Math.floor(Number(value.step)) : 0;
  return {
    step: Math.max(0, Math.min(count - 1, rawStep)),
    completed: sameGuideShape && value.completed === true,
  };
}

function readStore(storage) {
  try {
    const raw = storage?.getItem?.(STORAGE_KEY);
    if (!raw) return volatileStore;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : volatileStore;
  } catch {
    return volatileStore;
  }
}

function writeStore(next, storage) {
  volatileStore = next;
  try {
    storage?.setItem?.(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private/embedded contexts may deny persistent storage. Progress then
    // remains useful for this page lifetime without affecting free content.
  }
}

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readEducationProgress(sceneId, stepCount, storage = defaultStorage()) {
  if (!sceneId) return emptyProgress();
  return normaliseRecord(readStore(storage)[sceneId], stepCount);
}

export function saveEducationStep(sceneId, step, stepCount, storage = defaultStorage()) {
  if (!sceneId) return emptyProgress();
  const count = Math.max(1, Math.floor(Number(stepCount) || 1));
  const store = { ...readStore(storage) };
  const previous = normaliseRecord(store[sceneId], count);
  const next = {
    step: Math.max(0, Math.min(count - 1, Math.floor(Number(step) || 0))),
    stepCount: count,
    // Once completed, revisiting earlier steps should not erase completion.
    completed: previous.completed,
  };
  store[sceneId] = next;
  writeStore(store, storage);
  return { step: next.step, completed: next.completed };
}

export function markEducationComplete(sceneId, stepCount, storage = defaultStorage()) {
  if (!sceneId) return emptyProgress();
  const count = Math.max(1, Math.floor(Number(stepCount) || 1));
  const store = { ...readStore(storage) };
  store[sceneId] = { step: count - 1, stepCount: count, completed: true };
  writeStore(store, storage);
  return { step: count - 1, completed: true };
}

/** Completed guides restart from the beginning; incomplete guides resume. */
export function educationResumeIndex(progress) {
  return progress?.completed ? 0 : Math.max(0, Math.floor(Number(progress?.step) || 0));
}

export const EDUCATION_PROGRESS_STORAGE_KEY = STORAGE_KEY;
