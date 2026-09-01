import { SCENES } from '../catalog/index.js';

const STORAGE_KEY = 'medical3dlab.scene-library.v1';
export const MAX_RECENT_SCENES = 8;

const DEFAULT_VALID_IDS = new Set(SCENES.map((scene) => scene.id));

const emptyLibrary = () => ({ favorites: [], recent: [] });

function validSet(validIds) {
  if (validIds instanceof Set) return validIds;
  return new Set(validIds ?? []);
}

function cleanIds(ids, validIds, limit = Infinity) {
  if (!Array.isArray(ids)) return [];
  const valid = validSet(validIds);
  const seen = new Set();
  const result = [];
  for (const id of ids) {
    if (typeof id !== 'string' || !valid.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    if (result.length >= limit) break;
  }
  return result;
}

/**
 * Keeps only published scene ids and a bounded, de-duplicated recent history.
 *
 * The library intentionally stores navigation identity only. It never stores
 * model controls, progression, patient information, account information or
 * billing state.
 */
export function normaliseSceneLibrary(value, validIds = DEFAULT_VALID_IDS) {
  const source = value && typeof value === 'object' ? value : emptyLibrary();
  return {
    favorites: cleanIds(source.favorites, validIds),
    recent: cleanIds(source.recent, validIds, MAX_RECENT_SCENES),
  };
}

export function withRecentScene(library, sceneId, validIds = DEFAULT_VALID_IDS) {
  const current = normaliseSceneLibrary(library, validIds);
  const valid = validSet(validIds);
  if (!valid.has(sceneId)) return current;
  return {
    favorites: current.favorites,
    recent: [sceneId, ...current.recent.filter((id) => id !== sceneId)].slice(0, MAX_RECENT_SCENES),
  };
}

export function withFavoriteToggled(library, sceneId, validIds = DEFAULT_VALID_IDS) {
  const current = normaliseSceneLibrary(library, validIds);
  const valid = validSet(validIds);
  if (!valid.has(sceneId)) return current;
  const saved = current.favorites.includes(sceneId);
  return {
    favorites: saved
      ? current.favorites.filter((id) => id !== sceneId)
      : [...current.favorites, sceneId],
    recent: current.recent,
  };
}

export function readSceneLibrary(storage = globalThis.localStorage, validIds = DEFAULT_VALID_IDS) {
  try {
    return normaliseSceneLibrary(JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null'), validIds);
  } catch {
    return emptyLibrary();
  }
}

export function writeSceneLibrary(library, storage = globalThis.localStorage, validIds = DEFAULT_VALID_IDS) {
  const next = normaliseSceneLibrary(library, validIds);
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing/storage denial must never interfere with free navigation.
  }
  return next;
}

export function recordSceneVisit(sceneId, storage = globalThis.localStorage, validIds = DEFAULT_VALID_IDS) {
  return writeSceneLibrary(withRecentScene(readSceneLibrary(storage, validIds), sceneId, validIds), storage, validIds);
}

export function toggleSceneFavorite(sceneId, storage = globalThis.localStorage, validIds = DEFAULT_VALID_IDS) {
  return writeSceneLibrary(
    withFavoriteToggled(readSceneLibrary(storage, validIds), sceneId, validIds),
    storage,
    validIds
  );
}

export function isSceneFavorite(sceneId, library = readSceneLibrary()) {
  return library.favorites.includes(sceneId);
}
