import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  PREVIEW_ENTITLEMENTS,
  previewGrants,
  reviewerIsEntitled,
  withPreviewGrants,
} from '../src/access/previewGrants.js';
import { ENTITLEMENT, canAccess } from '../src/access/policy.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * Opening the paid surfaces for a reviewer, and for nobody else.
 *
 * The patient and education guides are behind billing entitlements, which meant
 * nobody could look at them without a subscription — and that is how a 9.5px
 * medical boundary statement came to ship on the education guide. It says what
 * the guide may be used for and it was the smallest prose on the surface.
 * Nobody chose that; nobody could see it.
 *
 * So a reviewable build hands out the grants. Which makes the question "can a
 * visitor get them", and the answer has to be structural rather than careful:
 * the same unlock the beta gate already uses, compiled out of a production
 * bundle, with no second switch to get wrong.
 */

test('a reviewer gets the paid entitlements; everybody else gets none', () => {
  assert.deepEqual(previewGrants(() => true, () => ''), ['patient', 'education']);
  assert.deepEqual(previewGrants(() => false, () => ''), []);

  // And the unlock throwing is the same answer as the unlock saying no. Under
  // `node --test` there is no `window`, and storage can be denied outright.
  assert.deepEqual(previewGrants(() => { throw new Error('no window'); }, () => ''), []);
});

test('a reviewer can ask to be shown what an unentitled reader meets', () => {
  // The surfaces before paying — the lock on the control, the offer, the copy
  // that says what is behind it — are the ones a reviewer holding the grants
  // never sees, which made them the unmeasured half the moment this file
  // existed (F-119). `?entitled=0` withholds the grants and changes nothing
  // else about the build.
  assert.equal(reviewerIsEntitled(''), true, 'entitled unless asked otherwise');
  assert.equal(reviewerIsEntitled('?preview=1'), true);
  for (const off of ['?entitled=0', '?entitled=off', '?entitled=no', '?entitled=FALSE', '?preview=1&entitled=0']) {
    assert.equal(reviewerIsEntitled(off), false, off);
  }
  for (const on of ['?entitled=1', '?entitled=yes', '?entitled=true']) {
    assert.equal(reviewerIsEntitled(on), true, on);
  }

  assert.deepEqual(previewGrants(() => true, () => '?entitled=0'), [], 'withheld on request');
  assert.deepEqual(previewGrants(() => true, () => '?entitled=1'), ['patient', 'education']);

  // And it only ever narrows. A build with no unlock has nothing to hand out,
  // so the parameter is a query string on a page that was never going to grant
  // anything — which is why this is not a second build-time capability.
  assert.deepEqual(previewGrants(() => false, () => '?entitled=1'), []);
});

test('the grants are added to what the account layer computed, never replacing it', () => {
  // A reviewer who signs in to read the account surfaces keeps the panels they
  // were reading; a real entitlement is not dropped on the way through.
  const signedIn = withPreviewGrants(new Set(['free', 'patient']), () => true, () => '');
  assert.deepEqual([...signedIn].sort(), ['education', 'free', 'patient']);

  const plain = withPreviewGrants(new Set(['free']), () => false, () => '');
  assert.deepEqual([...plain], ['free'], 'and nothing is added when the build is not reviewable');
});

test('the grants are the ones the surfaces actually check', () => {
  // Named rather than guessed: `installAccess` asks for these two, and a third
  // entitlement invented here would open nothing while looking like it did.
  for (const entitlement of [ENTITLEMENT.PATIENT, ENTITLEMENT.EDUCATION]) {
    assert.ok(PREVIEW_ENTITLEMENTS.includes(entitlement), entitlement);
    assert.equal(canAccess(withPreviewGrants(new Set(), () => true, () => ''), entitlement), true);
  }
  const install = read('src/access/installAccess.js');
  for (const entitlement of PREVIEW_ENTITLEMENTS) {
    assert.match(
      install,
      new RegExp(`ENTITLEMENT\\.${entitlement.toUpperCase()}`),
      `${entitlement} is granted but no surface asks for it`
    );
  }
});

test('the unlock is the beta gate, not a second switch', () => {
  // One capability, decided at build time, already compiled out of production
  // and already tested by `tests/beta-release.test.js`. A separate env var or a
  // hostname check would be a second thing to get wrong, and the second one is
  // the one nobody remembers.
  const source = read('src/access/previewGrants.js');
  assert.match(source, /import \{ betaUnlocked \} from '\.\.\/app\/releaseGate\.js'/);
  assert.doesNotMatch(source, /import\.meta\.env/, 'it does not read the environment itself');
  // `hostname` and not `location`: `?entitled=` reads `location.search`, which
  // is a different thing — it can only narrow what an already-unlocked build
  // hands out, and the line above proves a locked build hands out nothing
  // whatever the query string says. "Is this localhost" is the sniff worth
  // refusing, because it is a string the visitor has several ways to control.
  assert.doesNotMatch(source, /hostname|localhost/, 'and it does not sniff where it is running');
  assert.match(source, /PREVIEW_ENTITLED_PARAM = 'entitled'/);
});

test('the check drives both sides of the gate from the same build', () => {
  const check = read('scripts/check-gated-surfaces.mjs');
  assert.match(check, /--locked/, 'the unentitled view has a way to be asked for');
  assert.match(check, /lockedView \? '&entitled=0' : ''/);

  // The product's own signal for the lock, not "an element whose class
  // contains lock": the padlock is always in the DOM and merely `hidden` when
  // entitled, so asking whether it exists reported every entitled control as
  // locked.
  assert.match(check, /classList\.contains\('is-locked'\)/);
  assert.match(check, /feature-lock:not\(\[hidden\]\)/);
});

test('the unentitled view is measured against a deploy that can actually sell', () => {
  // Otherwise it measures a configuration rather than the product: without
  // `billing-status` the surface says "purchasing is not enabled on this
  // deploy" with a full price list loaded behind it, which is what happened.
  const stub = read('scripts/lib/stub-paid-surfaces.mjs');
  assert.match(stub, /billing-status\*/);
  assert.match(stub, /plan-catalog\*/);
  const check = read('scripts/check-gated-surfaces.mjs');
  assert.match(check, /the account surface opened with no offer on it/);
});

test('every path that rebuilds the grant set goes through one function', () => {
  // Five places rebuild `state.grants` from scratch — startup, sign-in,
  // sign-out, a successful lookup and two failures — and a sixth is one commit
  // away. The initial state literal was missed on the first attempt, and the
  // surfaces stayed locked in a preview build because `init()` does not rebuild
  // them when billing is not configured.
  const manager = read('src/access/AccessManager.js');
  const bare = [...manager.matchAll(/grants[:=]\s*new Set\(/g)];
  assert.deepEqual(
    bare.map((match) => match[0]),
    [],
    'a grant set built without `grantSet()` does not carry the reviewer\'s grants'
  );
  assert.ok(
    manager.split('grantSet(').length - 1 >= 6,
    'every assignment, and the initial value, come from the one helper'
  );
});

test('the check that opens the paid surfaces reads the session key the product writes', () => {
  // The stub signs the reviewer in by writing the session `auth.js` reads.
  // Duplicated rather than exported, so this keeps the two in step.
  const auth = read('src/access/auth.js');
  const stub = read('scripts/lib/stub-paid-surfaces.mjs');
  const productKey = auth.match(/const STORAGE_KEY = '([^']+)'/)?.[1];
  const stubKey = stub.match(/const SESSION_KEY = '([^']+)'/)?.[1];
  assert.ok(productKey, 'auth.js still names its storage key');
  assert.equal(stubKey, productKey, 'the stub would sign nobody in');
});

test('the stub answers with the product\'s own entitlement decision', () => {
  // A hand-written `{ guide: ... }` would pass while the real contract drifted.
  const stub = read('scripts/lib/stub-paid-surfaces.mjs');
  assert.match(stub, /import \{ entitledGuide \} from '\.\.\/\.\.\/netlify\/functions\/paid-content\.js'/);
  // With the authored feature set, which is what the preview build itself uses
  // to decide whether to draw the button. The released set is fail-closed and
  // refuses every scene, which made the first version report "the panel did not
  // open" for reasons that had nothing to do with the panel.
  assert.match(stub, /features: authoredFeaturesForScene\(sceneId\)/);
});
