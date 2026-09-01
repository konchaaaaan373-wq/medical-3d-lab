import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_RECENT_SCENES,
  normaliseSceneLibrary,
  readSceneLibrary,
  recordSceneVisit,
  toggleSceneFavorite,
  withFavoriteToggled,
  withRecentScene,
} from '../src/app/sceneLibrary.js';

const ids = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']);

function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
    value: () => value,
  };
}

test('scene library: unknown and duplicate scene ids are pruned', () => {
  assert.deepEqual(
    normaliseSceneLibrary(
      { favorites: ['a', 'missing', 'a', 'b'], recent: ['missing', 'c', 'c', 'a'] },
      ids
    ),
    { favorites: ['a', 'b'], recent: ['c', 'a'] }
  );
});

test('scene library: recent visits move to the front and stay bounded', () => {
  let library = { favorites: [], recent: [] };
  for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']) {
    library = withRecentScene(library, id, ids);
  }
  assert.equal(library.recent.length, MAX_RECENT_SCENES);
  assert.deepEqual(library.recent, ['i', 'h', 'g', 'f', 'e', 'd', 'c', 'b']);

  library = withRecentScene(library, 'e', ids);
  assert.deepEqual(library.recent.slice(0, 3), ['e', 'i', 'h']);
  assert.equal(library.recent.filter((id) => id === 'e').length, 1);
});

test('scene library: favorites toggle without changing recent history', () => {
  const first = withFavoriteToggled({ favorites: [], recent: ['b'] }, 'a', ids);
  assert.deepEqual(first, { favorites: ['a'], recent: ['b'] });
  assert.deepEqual(withFavoriteToggled(first, 'a', ids), { favorites: [], recent: ['b'] });
});

test('scene library: corrupt storage fails closed and storage wrappers persist only ids', () => {
  const broken = memoryStorage('{not-json');
  assert.deepEqual(readSceneLibrary(broken, ids), { favorites: [], recent: [] });

  const storage = memoryStorage();
  recordSceneVisit('a', storage, ids);
  toggleSceneFavorite('b', storage, ids);
  const parsed = JSON.parse(storage.value());
  assert.deepEqual(parsed, { favorites: ['b'], recent: ['a'] });
  assert.deepEqual(Object.keys(parsed).sort(), ['favorites', 'recent']);
});
