import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { PREVIEW_ENTITLEMENTS, previewGrants, withPreviewGrants } from '../src/access/previewGrants.js';
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
  assert.deepEqual(previewGrants(() => true), ['patient', 'education']);
  assert.deepEqual(previewGrants(() => false), []);

  // And the unlock throwing is the same answer as the unlock saying no. Under
  // `node --test` there is no `window`, and storage can be denied outright.
  assert.deepEqual(previewGrants(() => { throw new Error('no window'); }), []);
});

test('the grants are added to what the account layer computed, never replacing it', () => {
  // A reviewer who signs in to read the account surfaces keeps the panels they
  // were reading; a real entitlement is not dropped on the way through.
  const signedIn = withPreviewGrants(new Set(['free', 'patient']), () => true);
  assert.deepEqual([...signedIn].sort(), ['education', 'free', 'patient']);

  const plain = withPreviewGrants(new Set(['free']), () => false);
  assert.deepEqual([...plain], ['free'], 'and nothing is added when the build is not reviewable');
});

test('the grants are the ones the surfaces actually check', () => {
  // Named rather than guessed: `installAccess` asks for these two, and a third
  // entitlement invented here would open nothing while looking like it did.
  for (const entitlement of [ENTITLEMENT.PATIENT, ENTITLEMENT.EDUCATION]) {
    assert.ok(PREVIEW_ENTITLEMENTS.includes(entitlement), entitlement);
    assert.equal(canAccess(withPreviewGrants(new Set(), () => true), entitlement), true);
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
  assert.doesNotMatch(source, /location|hostname|localhost/, 'and it does not sniff where it is running');
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
