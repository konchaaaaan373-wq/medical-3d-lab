import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPLORER_ROUTE,
  LAB_ROUTE,
  LAB_SCENES,
  LANDING_ROUTE,
  PUBLIC_SCENES,
  SCENES,
  labCatalogueSections,
  systemsWithOrgans,
} from '../src/catalog/index.js';
import { resolveRoute, sameRoute } from '../src/app/router.js';

test('product shell: the empty URL opens Landing rather than a medical scene', () => {
  assert.deepEqual(resolveRoute(''), { kind: 'landing' });
  assert.deepEqual(resolveRoute(LANDING_ROUTE), { kind: 'landing' });
  assert.deepEqual(resolveRoute('#/home'), { kind: 'landing' });
  assert.equal(sameRoute('', '#/home'), true);
});

test('product shell: public explorer and experimental lab have distinct routes', () => {
  assert.deepEqual(resolveRoute(EXPLORER_ROUTE), { kind: 'explorer' });
  assert.deepEqual(resolveRoute('#/explore'), { kind: 'explorer' });
  assert.deepEqual(resolveRoute(LAB_ROUTE), { kind: 'lab' });
  assert.deepEqual(resolveRoute('#/experimental'), { kind: 'lab' });
  assert.equal(sameRoute(EXPLORER_ROUTE, LAB_ROUTE), false);
});

test('product shell: every scene is on exactly one of the public or Lab shelves', () => {
  const publicIds = new Set(PUBLIC_SCENES.map((scene) => scene.id));
  const labIds = new Set(LAB_SCENES.map((scene) => scene.id));

  assert.equal([...publicIds].some((id) => labIds.has(id)), false, 'no scene is on both shelves');
  assert.deepEqual(
    [...new Set([...publicIds, ...labIds])].sort(),
    SCENES.map((scene) => scene.id).sort()
  );
});

test('product shell: Prototype never appears in the public catalogue projection', () => {
  assert.ok(LAB_SCENES.length > 0, 'there is experimental work to separate');
  assert.equal(PUBLIC_SCENES.some((scene) => scene.status === 'prototype'), false);
  assert.equal(LAB_SCENES.every((scene) => scene.status === 'prototype'), true);

  const publicSystems = systemsWithOrgans(PUBLIC_SCENES, {
    includePlanned: false,
    includeEmptyOrgans: false,
  });
  const rendered = new Set(
    publicSystems.flatMap((system) =>
      system.organs.flatMap((organ) => organ.scenes.map((scene) => scene.id))
    )
  );
  for (const scene of PUBLIC_SCENES) assert.ok(rendered.has(scene.id), `${scene.id} stays reachable publicly`);
  for (const scene of LAB_SCENES) assert.equal(rendered.has(scene.id), false, `${scene.id} stays in Lab`);
});

test('product shell: Lab projection can include planned questions without pretending they are scenes', () => {
  const labSystems = systemsWithOrgans(LAB_SCENES, {
    includePlanned: true,
    includeEmptyOrgans: false,
  });
  assert.ok(labSystems.length > 0);
  assert.ok(labSystems.some((system) => system.organs.some((organ) => organ.planned.length > 0)));
  for (const system of labSystems) {
    for (const organ of system.organs) {
      assert.ok(
        organ.scenes.length > 0 || organ.planned.length > 0,
        `${system.id}/${organ.id} is not an empty Lab row`
      );
    }
  }
});

test('product shell: Lab catalogue lists every model once and keeps covered organs as metadata', () => {
  const sections = labCatalogueSections();
  const models = sections.flatMap((system) => system.models);
  const ids = models.map(({ scene }) => scene.id);

  assert.equal(new Set(ids).size, ids.length, 'a multi-organ model is not duplicated');
  assert.deepEqual(ids.sort(), LAB_SCENES.map((scene) => scene.id).sort());

  const upperGi = models.find(({ scene }) => scene.id === 'upper-gi-peristalsis');
  assert.deepEqual(
    upperGi.organs.map((organ) => organ.id),
    ['esophagus', 'stomach'],
    'covered anatomy remains visible without repeating the card'
  );

  const firstBacklogOnly = sections.findIndex((system) => system.models.length === 0);
  assert.ok(firstBacklogOnly > 0, 'working models lead the Lab catalogue');
  assert.equal(
    sections.slice(firstBacklogOnly).every((system) => system.models.length === 0),
    true,
    'backlog-only systems stay after every runnable experiment'
  );
});
