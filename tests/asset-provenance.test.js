import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

import { ASSET_MANIFEST } from '../src/catalog/assetManifest.js';

/**
 * `introducedIn` has to be a commit somebody can actually resolve.
 *
 * The bug this exists for: all three entries named the commit on the *branch*
 * the work was done on. This repository squash-merges, so a branch commit is
 * never an ancestor of the default branch — the file's arrival is recorded by a
 * different commit with a different hash, and `git log` from `main` never
 * reaches the one that was written down. Every entry pointed at nothing, and
 * the schema check (forty hex characters) was happy with all of them, because a
 * hash that is well-formed and a hash that resolves are different claims.
 *
 * What makes it worth a test rather than a one-time correction is that the
 * reachable commits existed the whole time. Nobody had looked: the fix was
 * `git log --diff-filter=A -- <the asset's path>` on `main`, which is exactly
 * what this test does. So the check is cheap, and the mistake is the kind that
 * comes back every time an asset is added.
 *
 * It asserts the strong form, not ancestry alone. "Somewhere in the history"
 * would pass for any commit on the default branch, including one that has
 * nothing to do with the file; what is claimed is that this commit is where the
 * file arrived, so that is what is measured.
 */

const DEFAULT_BRANCH_REFS = ['origin/main', 'refs/remotes/origin/main', 'main'];

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

/** The default branch as this checkout has it, or null if it has no history of one. */
function defaultBranchRef() {
  for (const ref of DEFAULT_BRANCH_REFS) {
    try {
      git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`);
      return ref;
    } catch {
      // Try the next spelling.
    }
  }
  return null;
}

/**
 * Whether the history is deep enough to answer at all.
 *
 * A shallow clone — `actions/checkout` without `fetch-depth: 0` — cannot see
 * where a file was added, and would make every assertion below vacuous. That is
 * reported as a failure rather than skipped: a provenance check that quietly
 * stops running in CI is worse than no provenance check, because the green tick
 * says it ran.
 */
const isShallow = () => {
  try {
    return git('rev-parse', '--is-shallow-repository') === 'true';
  } catch {
    return false;
  }
};

test('asset provenance: introducedIn names the commit that put the file on the default branch', () => {
  const ref = defaultBranchRef();
  assert.ok(
    ref,
    `no default branch in this checkout (looked for ${DEFAULT_BRANCH_REFS.join(', ')}) — ` +
      'this test cannot verify provenance without one'
  );
  assert.equal(
    isShallow(),
    false,
    'this is a shallow clone, so where a file was added cannot be read — ' +
      'CI needs actions/checkout with fetch-depth: 0 for this test to mean anything'
  );

  for (const asset of ASSET_MANIFEST) {
    const where = `asset "${asset.assetId}"`;
    const commit = asset.source.introducedIn;

    if (commit === null) {
      // The legal pending state, and the only one: the entry was filed before
      // the merge that creates the commit it will name.
      assert.match(
        asset.source.introducedInNote ?? '',
        /\S/,
        `${where}: introducedIn is null without saying why`
      );
      continue;
    }

    // It exists.
    assert.doesNotThrow(
      () => git('cat-file', '-e', `${commit}^{commit}`),
      `${where}: introducedIn ${commit} is not a commit in this repository`
    );

    // It is on the default branch. This is the half that was wrong: every
    // recorded commit existed, and none of them was reachable from main.
    let reachable = true;
    try {
      git('merge-base', '--is-ancestor', commit, ref);
    } catch {
      reachable = false;
    }
    assert.ok(
      reachable,
      `${where}: introducedIn ${commit} is not an ancestor of ${ref} — ` +
        'a branch commit, which squash merge never puts on the default branch. ' +
        `Find the right one with: git log --diff-filter=A --oneline ${ref} -- ${asset.output.path}`
    );

    // And it is the commit where this file arrived, not merely one of the many
    // commits that are also ancestors of the default branch.
    const added = git(
      'show',
      '--diff-filter=A',
      '--name-only',
      '--format=',
      commit,
      '--',
      asset.output.path
    );
    assert.equal(
      added,
      asset.output.path,
      `${where}: ${commit} does not add ${asset.output.path}, so it is not where the file was introduced`
    );
  }
});

test('asset provenance: introducedAt is the date of that commit', () => {
  if (isShallow() || !defaultBranchRef()) return; // The test above fails for this; no need to fail twice.

  for (const asset of ASSET_MANIFEST) {
    const commit = asset.source.introducedIn;
    if (commit === null) continue;
    // In UTC, which is the convention every other date in these records uses —
    // the heart's squash commit is +0900 and reads as the next day in its own
    // zone, which would have put a future date in a provenance record.
    const utcDate = new Date(Number(git('show', '-s', '--format=%ct', commit)) * 1000)
      .toISOString()
      .slice(0, 10);
    assert.equal(
      asset.source.introducedAt,
      utcDate,
      `${asset.assetId}: introducedAt says ${asset.source.introducedAt}, but ${commit.slice(0, 8)} is dated ${utcDate} (UTC)`
    );
  }
});
