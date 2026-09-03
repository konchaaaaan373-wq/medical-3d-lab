const STORAGE_KEY = 'medical3dlab.education-progress.v1';

/**
 * What this page has saved, per storage, for when the storage will not keep it.
 *
 * Held against the storage object rather than in one module-level variable,
 * because the storage is a parameter and a shared shadow is not a shadow of
 * anything: with one variable, saving into one storage showed up in reads of
 * another, which is how two of this file's own tests found it. `defaultStorage`
 * returns the one `localStorage` every time, so the app still gets exactly one.
 */
const shadows = new WeakMap();
/** For calls made with no storage at all. */
let detachedShadow = {};

const shadowOf = (storage) => (storage ? shadows.get(storage) ?? {} : detachedShadow);
const rememberShadow = (storage, next) => {
  if (storage) shadows.set(storage, next);
  else detachedShadow = next;
};

const emptyProgress = () => ({ step: 0, completed: false });

/**
 * A small deterministic fingerprint of the authored teaching guide.
 *
 * Progress is not medical state, but a "completed" mark still has to refer to
 * the exact lesson the learner saw. Step count alone is insufficient: copy or
 * reasoning can change while a four-step guide remains four steps long.
 *
 * This is intentionally not a security hash. It is only a compact content
 * revision key stored beside navigation progress.
 */
export function educationGuideRevision(guide) {
  const source = JSON.stringify({
    title: guide?.title ?? '',
    titleJa: guide?.titleJa ?? '',
    steps: (guide?.steps ?? []).map((step) => ({
      kind: step.kind ?? '',
      progress: Number(step.progress ?? 0),
      title: step.title ?? '',
      titleJa: step.titleJa ?? '',
      prompt: step.prompt ?? '',
      promptJa: step.promptJa ?? '',
      answer: step.answer ?? '',
      answerJa: step.answerJa ?? '',
    })),
  });

  // FNV-1a 32-bit: fast, deterministic in every supported browser, and plenty
  // for invalidating local navigation progress when authored copy changes.
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `guide-${(guide?.steps?.length ?? 0)}-${(hash >>> 0).toString(36)}`;
}

function normaliseRecord(value, stepCount, revision = null) {
  const count = Math.max(1, Math.floor(Number(stepCount) || 1));
  if (!value || typeof value !== 'object') return emptyProgress();

  // If the caller supplied an authored-content revision, any previous record
  // without that exact revision belongs to a different guide and restarts.
  if (revision && value.revision !== revision) return emptyProgress();

  const sameGuideShape = Number(value.stepCount) === count;
  const rawStep = Number.isFinite(Number(value.step)) ? Math.floor(Number(value.step)) : 0;
  return {
    step: Math.max(0, Math.min(count - 1, rawStep)),
    completed: sameGuideShape && value.completed === true,
  };
}

/**
 * What this page knows about progress: what is on disk, over what is only here.
 *
 * The in-memory copy is not a fallback for when reading fails — it is the whole
 * record in a context that lets a page *read* storage and refuses to let it
 * *write*, which is what a private or embedded browser does. There `getItem`
 * returns null perfectly happily and `setItem` throws, so returning `{}` for an
 * empty read threw away every step the learner had taken this session: the
 * fallback `writeStore` keeps was written on every save and read back on none
 * of them, and the promise in its comment — that progress "remains useful for
 * this page lifetime" — was not true.
 *
 * Disk wins where the two disagree, because disk is the durable record.
 */
function readStore(storage) {
  const shadow = shadowOf(storage);
  if (!storage?.getItem) return shadow;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { ...shadow };
    const parsed = JSON.parse(raw);
    const persisted =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    return { ...shadow, ...persisted };
  } catch {
    return shadow;
  }
}

function writeStore(next, storage) {
  rememberShadow(storage, next);
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

export function readEducationProgress(sceneId, stepCount, storage = defaultStorage(), revision = null) {
  if (!sceneId) return emptyProgress();
  return normaliseRecord(readStore(storage)[sceneId], stepCount, revision);
}

export function saveEducationStep(
  sceneId,
  step,
  stepCount,
  storage = defaultStorage(),
  revision = null
) {
  if (!sceneId) return emptyProgress();
  const count = Math.max(1, Math.floor(Number(stepCount) || 1));
  const store = { ...readStore(storage) };
  const previous = normaliseRecord(store[sceneId], count, revision);
  const next = {
    step: Math.max(0, Math.min(count - 1, Math.floor(Number(step) || 0))),
    stepCount: count,
    ...(revision ? { revision } : {}),
    // Once completed, revisiting earlier steps should not erase completion for
    // this exact authored revision.
    completed: previous.completed,
  };
  store[sceneId] = next;
  writeStore(store, storage);
  return { step: next.step, completed: next.completed };
}

export function markEducationComplete(
  sceneId,
  stepCount,
  storage = defaultStorage(),
  revision = null
) {
  if (!sceneId) return emptyProgress();
  const count = Math.max(1, Math.floor(Number(stepCount) || 1));
  const store = { ...readStore(storage) };
  store[sceneId] = {
    step: count - 1,
    stepCount: count,
    ...(revision ? { revision } : {}),
    completed: true,
  };
  writeStore(store, storage);
  return { step: count - 1, completed: true };
}

/** Completed guides restart from the beginning; incomplete guides resume. */
export function educationResumeIndex(progress) {
  return progress?.completed ? 0 : Math.max(0, Math.floor(Number(progress?.step) || 0));
}

/** Guide-aware wrappers used by the product UI. */
export function readEducationGuideProgress(sceneId, guide, storage = defaultStorage()) {
  const revision = educationGuideRevision(guide);
  return readEducationProgress(sceneId, guide?.steps?.length ?? 0, storage, revision);
}

export function saveEducationGuideStep(sceneId, guide, step, storage = defaultStorage()) {
  const revision = educationGuideRevision(guide);
  return saveEducationStep(sceneId, step, guide?.steps?.length ?? 0, storage, revision);
}

export function markEducationGuideComplete(sceneId, guide, storage = defaultStorage()) {
  const revision = educationGuideRevision(guide);
  return markEducationComplete(sceneId, guide?.steps?.length ?? 0, storage, revision);
}

export const EDUCATION_PROGRESS_STORAGE_KEY = STORAGE_KEY;
