import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPLORER_ROUTE, LAB_ROUTE, LANDING_ROUTE } from '../src/catalog/index.js';
import { MODEL_INFO_ROUTE } from '../src/catalog/publicManifest.js';
import { resolveRoute } from '../src/app/router.js';
import {
  SHELL_DESTINATIONS,
  shellDestination,
  shellDestinationProblems,
  shellNavLinks,
} from '../src/app/shellDestinations.js';

/**
 * The way out of a page is a product promise, not styling.
 *
 * Every one of these held false at some point on a surface that shipped: the
 * legal documents had no route home except the wordmark, the model drawer
 * renamed the Explorer depending on which scene it was opened from, and the
 * fixed header on a 3D model dropped its only navigation control whenever the
 * release opened exactly one model — which is the state the public beta is in.
 */

test('shell navigation: one route, one name, in both languages', () => {
  assert.deepEqual(shellDestinationProblems(), []);
});

test('shell navigation: every destination is a route the router resolves', () => {
  const expected = {
    home: 'landing',
    models: 'explorer',
    'model-info': 'trust',
    lab: 'lab',
  };
  for (const destination of SHELL_DESTINATIONS) {
    assert.equal(
      resolveRoute(destination.route).kind,
      expected[destination.id],
      `${destination.id} points at ${expected[destination.id]}`
    );
  }
});

test('shell navigation: the routes are the catalogue\'s, not a second copy', () => {
  assert.equal(shellDestination('home')?.route, LANDING_ROUTE);
  assert.equal(shellDestination('models')?.route, EXPLORER_ROUTE);
  assert.equal(shellDestination('model-info')?.route, MODEL_INFO_ROUTE);
  assert.equal(shellDestination('lab')?.route, LAB_ROUTE);
  assert.equal(shellDestination('nowhere'), null);
});

test('shell navigation: home is offered first from everywhere that is not home', () => {
  for (const current of [null, 'models', 'model-info', 'lab']) {
    const links = shellNavLinks({ current, labUnlocked: true });
    assert.equal(links[0]?.id, 'home', `${current ?? 'a 3D model'} offers home first`);
  }
  assert.equal(
    shellNavLinks({ current: 'home' }).some((link) => link.id === 'home'),
    false,
    'the landing page does not link to itself'
  );
});

test('shell navigation: a surface never links to itself', () => {
  for (const destination of SHELL_DESTINATIONS) {
    const links = shellNavLinks({ current: destination.id, labUnlocked: true });
    assert.equal(
      links.some((link) => link.id === destination.id),
      false,
      `${destination.id} is not in its own navigation`
    );
    assert.equal(links.length, SHELL_DESTINATIONS.length - 1);
  }
});

test('shell navigation: the beta never offers the locked Lab route', () => {
  const locked = shellNavLinks({ current: null, labUnlocked: false });
  assert.equal(locked.some((link) => link.id === 'lab'), false);
  assert.deepEqual(locked.map((link) => link.id), ['home', 'models', 'model-info']);

  const unlocked = shellNavLinks({ current: null, labUnlocked: true });
  assert.deepEqual(unlocked.map((link) => link.id), ['home', 'models', 'model-info', 'lab']);
});

test('shell navigation: the default is the locked answer', () => {
  assert.deepEqual(shellNavLinks(), shellNavLinks({ current: null, labUnlocked: false }));
});
