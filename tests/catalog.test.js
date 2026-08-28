import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SCENE_ID,
  EXPLORER_ROUTE,
  ORGANS,
  PLANNED_SCENES,
  SCENES,
  STATUS_IDS,
  SYSTEMS,
  organById,
  plannedForOrgan,
  sceneById,
  sceneRoute,
  scenesForOrgan,
  scenesListedForOrgan,
  systemById,
  systemsWithOrgans,
  systemsWithScenes,
  validateCatalog,
  resolveSceneId,
} from '../src/catalog/index.js';
import { namesScene, resolveRoute, sameRoute, slugOf } from '../src/app/router.js';

test('the catalogue is internally consistent', () => {
  // One assertion covering ids, slugs, organs, systems, statuses and loaders —
  // the message names whatever is actually wrong.
  assert.deepEqual(validateCatalog(), []);
});

test('scene ids and slugs are unique', () => {
  const ids = SCENES.map((scene) => scene.id);
  const slugs = SCENES.map((scene) => scene.slug);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate scene id');
  assert.equal(new Set(slugs).size, slugs.length, 'no duplicate slug');
});

test('every scene has a route, and every route resolves back to it', () => {
  for (const scene of SCENES) {
    const route = sceneRoute(scene);
    assert.equal(route, `#/${scene.slug}`);
    assert.equal(resolveSceneId(route), scene.id, `${route} resolves to ${scene.id}`);
    const resolved = resolveRoute(route);
    assert.equal(resolved.kind, 'scene');
    assert.equal(resolved.sceneId, scene.id);
  }
});

test('the explorer has a route of its own and no scene can take it', () => {
  assert.equal(resolveRoute(EXPLORER_ROUTE).kind, 'explorer');
  assert.equal(resolveRoute('#/explore').kind, 'explorer');
  assert.ok(!SCENES.some((scene) => sceneRoute(scene) === EXPLORER_ROUTE));
});

test('an unknown route falls back to the default scene rather than to nothing', () => {
  const route = resolveRoute('#/no-such-thing');
  assert.equal(route.kind, 'scene');
  assert.equal(route.sceneId, DEFAULT_SCENE_ID);
  assert.ok(sceneById(DEFAULT_SCENE_ID), 'and the default is a real scene');
});

test('sameRoute tells a reload apart from a no-op', () => {
  assert.ok(sameRoute('#/heart-failure', '#heart-failure'), 'the slash is optional');
  assert.ok(!sameRoute('#/heart-failure', EXPLORER_ROUTE));
  assert.ok(sameRoute(EXPLORER_ROUTE, '#/explore'));
});

test('only a real scene link counts as a navigation', () => {
  // The explorer scrolls to its sections; if one of those anchors ever reached
  // the router, reloading on it would drop the reader into a 3D scene.
  assert.ok(namesScene('#/heart-failure'));
  assert.ok(namesScene('#heart-failure'));
  assert.ok(!namesScene('#system-renal'), 'an in-page anchor is not a scene');
  assert.ok(!namesScene(EXPLORER_ROUTE), 'nor is the explorer itself');
  assert.ok(!namesScene(''));
  assert.equal(slugOf('#/body-overview'), 'body-overview');
  assert.equal(slugOf('#system-renal'), 'system-renal');
});

test('every organ belongs to a registered system, and is named in both languages', () => {
  for (const organ of ORGANS) {
    assert.ok(systemById(organ.system), `${organ.id} belongs to a real system`);
    assert.ok(organ.label?.length && organ.labelJa?.length, `${organ.id} is named in both languages`);
  }
  for (const system of SYSTEMS) {
    assert.ok(system.label?.length && system.labelJa?.length, `${system.id} is named in both languages`);
  }
});

test('a scene naming a system that does not exist is reported, not swallowed', () => {
  const warnings = [];
  const original = console.warn;
  console.warn = (message) => warnings.push(message);
  try {
    const orphan = { id: 'orphan', slug: 'orphan', system: 'aetheric', organ: 'heart', scenes: [] };
    const grouped = systemsWithScenes([...SCENES, orphan], SYSTEMS);
    assert.ok(!grouped.some((system) => system.scenes.some((scene) => scene.id === 'orphan')));
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /orphan/);
    assert.match(warnings[0], /aetheric/);
  } finally {
    console.warn = original;
  }
});

test('the catalogue as it stands warns about nothing', () => {
  const warnings = [];
  const original = console.warn;
  console.warn = (message) => warnings.push(message);
  try {
    systemsWithScenes();
    systemsWithOrgans();
    assert.deepEqual(warnings, []);
  } finally {
    console.warn = original;
  }
});

test('grouping by system covers every scene exactly once', () => {
  const grouped = systemsWithScenes().flatMap((system) => system.scenes.map((scene) => scene.id));
  assert.deepEqual([...grouped].sort(), SCENES.map((scene) => scene.id).sort());
});

test('a multi-organ scene is reachable from every organ it draws', () => {
  for (const scene of SCENES) {
    for (const organ of scene.organs) {
      assert.ok(
        scenesForOrgan(organ).some((found) => found.id === scene.id),
        `${scene.id} is listed under ${organ}`
      );
    }
  }
});

test('the explorer can be drawn from the catalogue alone', () => {
  const systems = systemsWithOrgans();
  assert.ok(systems.length > 0);
  for (const system of systems) {
    assert.ok(system.scenes.length > 0, `${system.id} would not be drawn empty`);
    for (const organ of system.organs) {
      assert.equal(organ.system, system.id, 'organs are filed under their own system');
    }
  }
  // Every scene is reachable from the page: the explorer lists it under one of
  // the organs it draws.
  const reachable = new Set(
    systems.flatMap((system) => system.organs.flatMap((organ) => organ.scenes.map((scene) => scene.id)))
  );
  for (const scene of SCENES) assert.ok(reachable.has(scene.id), `${scene.id} appears on the explorer`);
});

test('a scene from another system is not repeated under every organ it draws', () => {
  // The whole-body view draws nine organs; listing it under all of them would
  // bury the scenes those organs are actually about.
  const overview = sceneById('body-overview');
  assert.ok(overview.organs.length > 3, 'the overview really does draw several organs');
  assert.ok(scenesForOrgan('stomach').includes(overview), 'it is still an answer to "what shows the stomach?"');
  assert.ok(!scenesListedForOrgan('stomach').includes(overview), 'but it is not listed under the stomach');
  assert.ok(scenesListedForOrgan('whole-body').includes(overview), 'it is listed under its own organ');
  // A scene that spans organs inside its own system stays listed under each.
  const upperGi = sceneById('upper-gi-peristalsis');
  assert.ok(scenesListedForOrgan('esophagus').includes(upperGi), 'the oesophagus is not left blank');
});

test('planned disease scenes point at real organs and are not loadable', () => {
  for (const planned of PLANNED_SCENES) {
    assert.ok(organById(planned.organ), `${planned.disease} names a real organ`);
    assert.ok(planned.titleEn && planned.titleJa, `${planned.disease} is named in both languages`);
    assert.equal(planned.load, undefined, 'a planned scene has nothing to load');
    assert.ok(
      plannedForOrgan(planned.organ).includes(planned),
      'and is listed under its organ'
    );
  }
});

test('statuses come from the fixed set, and the two production scenes are the two that existed', () => {
  for (const scene of SCENES) assert.ok(STATUS_IDS.includes(scene.status));
  const production = SCENES.filter((scene) => scene.status === 'production').map((scene) => scene.id).sort();
  assert.deepEqual(production, ['amyloid-beta', 'heart-failure']);
});

test('organ scenes and disease scenes are distinguishable without reading the code', () => {
  // The split the architecture exists for: a scene is either about normal
  // physiology of an organ or about a disease of it, and says which.
  for (const scene of SCENES) {
    assert.ok(scene.disease === null || typeof scene.disease === 'string', `${scene.id} declares its disease field`);
  }
  assert.ok(SCENES.some((scene) => scene.disease !== null), 'at least one disease scene');
  assert.ok(SCENES.some((scene) => scene.disease === null), 'at least one organ scene');
});
