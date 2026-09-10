import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { SCENE_MANIFEST } from '../src/catalog/scenes.js';
import { clinicalReviewForScene } from '../src/catalog/clinicalReview.js';
import {
  activeUsesForScene,
  authoredFeaturesForScene,
  featuresForScene,
  patientUseEnabled,
  productBadgesForScene,
} from '../src/access/features.js';
import { resolveDevUnlock } from '../src/catalog/release.js';

/**
 * The patient explanation can be looked at before anybody signs it off, and the
 * public product still cannot reach it.
 *
 * A mode nobody can open is a mode nobody can improve — no scene in the
 * registry is `reviewed`, so the authored patient guides had never been on
 * screen. `authoredFeaturesForScene` answers "what would this scene offer if
 * the review existed", and only a preview build ever asks it.
 *
 * These are the negative cases. `tests/professional-access-review.test.js`
 * keeps holding the gated question itself; this file holds the boundary around
 * the preview answer.
 */

const withPatientDeclared = SCENE_MANIFEST.filter((scene) => scene.access?.patient === true);

test('preview modes: no scene is reviewed today, so the gated answer is no everywhere', () => {
  // If this ever fails it is good news and this file needs re-reading: a scene
  // has been signed off, and the gated and preview answers now agree for it.
  for (const scene of SCENE_MANIFEST) {
    if (clinicalReviewForScene(scene)?.reviewStatus !== 'reviewed') continue;
    assert.equal(
      featuresForScene(scene).patient,
      authoredFeaturesForScene(scene).patient,
      `${scene.id} is reviewed: the preview answer must not differ from the real one`
    );
  }
  assert.ok(withPatientDeclared.length > 0, 'some scenes declare patient explanation');
  for (const scene of withPatientDeclared) {
    assert.equal(featuresForScene(scene).patient, false, `${scene.id} must fail closed today`);
  }
});

test('preview modes: the catalogue keeps telling the truth about the public product', () => {
  // Cards, badges and the use filter all read the gated question. A preview
  // build is for looking at the content, not for advertising it as available.
  for (const scene of withPatientDeclared) {
    assert.equal(patientUseEnabled(scene), false, `${scene.id}: not an offered use`);
    assert.ok(!activeUsesForScene(scene).includes('patient'), `${scene.id}: not in the use list`);
    const badges = productBadgesForScene(scene).map((badge) => badge.id);
    assert.ok(!badges.includes('patient'), `${scene.id}: no Patient badge`);
  }
});

test('preview modes: a production build has no unlock, so it never asks the ungated question', () => {
  // The preview answer is reachable only behind `betaUnlocked()`, and that is a
  // build-time capability. Nothing a visitor types or has stored opens it.
  for (const search of ['', '?preview=1', '?preview=yes', '?preview=on', '?PREVIEW=1', '?preview=1&patient=1']) {
    assert.deepEqual(resolveDevUnlock({ search }), { unlocked: false, persist: null }, search);
  }
  assert.deepEqual(resolveDevUnlock({ stored: 'on' }), { unlocked: false, persist: false });
  assert.deepEqual(
    resolveDevUnlock({ search: '?preview=1', stored: 'on' }),
    { unlocked: false, persist: false },
    'a stored unlock from a preview deploy on the same origin is forgotten'
  );
});

test('preview modes: only the mode installer asks the ungated question', () => {
  // One caller. If a catalogue surface ever imports this, the public product
  // starts describing a mode it does not offer.
  const callers = ['src/access/installAccess.js'];
  const forbidden = [
    'src/app/Explorer.js',
    'src/app/Landing.js',
    'src/access/AccessManager.js',
    'src/access/subscriptionView.js',
    'src/catalog/scenes.js',
  ];
  for (const path of callers) {
    assert.match(readFileSync(path, 'utf8'), /authoredFeaturesForScene/, `${path} is the caller`);
  }
  for (const path of forbidden) {
    assert.doesNotMatch(
      readFileSync(path, 'utf8'),
      /authoredFeaturesForScene/,
      `${path} must ask the gated question, not the preview one`
    );
  }
  // And it is guarded by the build-time unlock rather than by a parameter of
  // its own.
  const installer = readFileSync('src/access/installAccess.js', 'utf8');
  assert.match(installer, /betaUnlocked\(\)\s*\?\s*authoredFeaturesForScene/);
});

test('preview modes: the entitlement is still required, in preview as in production', () => {
  // Opening the button is not opening the guide. The guide is fetched with an
  // authenticated request and re-checked against the grant after it arrives, so
  // a preview build with no session gets a button that asks for an account.
  const installer = readFileSync('src/access/installAccess.js', 'utf8');
  assert.match(installer, /authenticatedFetch\(`\/\.netlify\/functions\/paid-content/);
  assert.match(installer, /if \(!access\.has\(ENTITLEMENT\.PATIENT\)\) return null;/);
  assert.match(installer, /if \(!access\.has\(ENTITLEMENT\.PATIENT\)\) \{\s*\n\s*access\.open\(ENTITLEMENT\.PATIENT\);/);
});
