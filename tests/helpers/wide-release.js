/**
 * A release wider than the one that is published — for tests only.
 *
 * The brain launch (2026-11-24, `LAUNCH_SCOPE`) narrowed what the product
 * publishes to one organ. The code that lays out several organs, an organ with
 * two models, and a mechanism scene beside its anatomy is all still there,
 * because widening the launch is meant to be an edit to one list. Tests that
 * used the real manifest as their multi-organ fixture would have gone on
 * passing with nothing in them — `for (const model of [])` asserts nothing —
 * so they read this instead.
 *
 * It is **derived, not typed**: every scene the beta gate clears, in catalogue
 * order, whatever the launch scope says about its organ. That is exactly "what
 * the product would publish with the scope lifted", built from real catalogue
 * rows by the same projection the real manifest uses
 * (`publicManifestOf`). If the gate stops clearing the heart, this shrinks and
 * the assertions below say so, instead of a hand-written fixture drifting away
 * from the catalogue.
 *
 * Nothing here opens anything. `tests/beta-release.test.js` holds the other
 * half: each of these scenes outside the launch scope is closed in the real
 * release.
 */
import assert from 'node:assert/strict';

import { SCENES } from '../../src/catalog/index.js';
import { publicManifestOf } from '../../src/catalog/publicManifest.js';
import { betaPublicationProblems, isSceneReleased } from '../../src/catalog/release.js';

/** Every scene the beta gate clears, launch scope set aside. Catalogue order. */
export const BETA_CLEAR_SCENES = Object.freeze(SCENES.filter((scene) => betaPublicationProblems(scene).length === 0));

/** The manifest those scenes would make. */
export const WIDE_MANIFEST = publicManifestOf(BETA_CLEAR_SCENES);

/** The scenes in it that the real release holds closed. */
export const SCOPED_OUT_SCENES = Object.freeze(BETA_CLEAR_SCENES.filter((scene) => !isSceneReleased(scene)));

// A fixture that quietly became the real release would test nothing new. These
// run when any test file imports the fixture, so the shape every consumer
// relies on is stated once: several organs, one organ with two models, and a
// mechanism scene whose organ's anatomy is published beside it.
{
  const { models, organs } = WIDE_MANIFEST;
  assert.ok(organs.length >= 3, `the wide fixture has ${organs.length} organ(s); it needs several`);
  assert.ok(SCOPED_OUT_SCENES.length >= 1, 'the wide fixture is no wider than the real release');
  const mechanism = models.find((model) => model.layer === 'mechanism');
  assert.ok(mechanism, 'the wide fixture has no mechanism scene');
  assert.ok(
    models.some((model) => model.layer === 'anatomy' && model.organId === mechanism.organId),
    'the mechanism scene in the wide fixture has no anatomy beside it'
  );
}
