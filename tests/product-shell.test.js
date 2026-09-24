import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPLORER_ROUTE,
  LAB_ROUTE,
  LAB_SCENES,
  LANDING_ROUTE,
  PUBLIC_SCENES,
  SCENES,
  systemsWithOrgans,
} from '../src/catalog/index.js';
import { resolveRoute, sameRoute, slugOf, structureOf } from '../src/app/router.js';
import { resolveSceneId } from '../src/catalog/index.js';

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

test('product shell: a Trust record and the model picker are distinct document states', () => {
  assert.equal(sameRoute('#/trust', '#/trust?model=heart-anatomy'), false);
  assert.equal(sameRoute('#/trust?model=heart-anatomy', '#/trust?model=brain-anatomy'), false);
  assert.equal(sameRoute('#/trust?model=heart-anatomy', '#/trust?model=heart-anatomy'), true);
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

/* A route can carry the structure it opens on: the landing hero names a part on
   a small model and hands the reader to the full one already looking at it. It
   is a query rather than another path segment because the address is the same
   model — `sameRoute` has to agree, or changing structures would reload the
   page and throw away the model the reader is looking at. */
test('product shell: a scene route can name the structure it opens on', () => {
  assert.deepEqual(resolveRoute('#/brain-anatomy'), {
    kind: 'scene',
    sceneId: 'brain-anatomy',
    structureId: null,
  });
  assert.deepEqual(resolveRoute('#/brain-anatomy?structure=17'), {
    kind: 'scene',
    sceneId: 'brain-anatomy',
    structureId: '17',
  });

  // The id is carried as written. Only the scene knows what its ids look like,
  // and an atlas keyed on strings is the next one along.
  assert.equal(structureOf('#/brain-anatomy?structure=left-upper-lobe'), 'left-upper-lobe');
  assert.equal(structureOf('#/brain-anatomy?structure=%E6%B5%B7%E9%A6%AC'), '海馬');
  assert.equal(structureOf('#/brain-anatomy'), null);
  assert.equal(structureOf('#/brain-anatomy?structure='), null, 'an empty value names nothing');
  assert.equal(structureOf('#/brain-anatomy?other=17'), null);

  // The slug is what it always was, or the query would fall through to the
  // default scene and a deep link would open the wrong model entirely.
  assert.equal(slugOf('#/brain-anatomy?structure=17'), 'brain-anatomy');
  assert.equal(resolveSceneId('#/brain-anatomy?structure=17'), 'brain-anatomy');

  // Same place, different state: no reload.
  assert.equal(sameRoute('#/brain-anatomy', '#/brain-anatomy?structure=17'), true);
  assert.equal(sameRoute('#/brain-anatomy?structure=17', '#/brain-anatomy?structure=9'), true);
  assert.equal(sameRoute('#/brain-anatomy?structure=17', '#/heart-failure'), false);
});
