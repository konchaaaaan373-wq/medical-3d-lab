import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PACKER = new URL('../scripts/pack-handoff.mjs', import.meta.url).pathname;

/**
 * The hand-off packer, exercised against synthetic repositories.
 *
 * This file exists because of what running the packer found that reading it did
 * not, twice over:
 *
 *  1. the generated `restore.sh` ran `git bundle verify` outside any repository,
 *     which git refuses — so step 3 of 5 failed for every recipient;
 *  2. the whole-history `restore.sh` opened its clone step with
 *     `rm -rf "$TARGET"`. An independent review reproduced the consequence on a
 *     synthetic repository: restoring onto an existing directory destroyed a
 *     sentinel file in it, and a second run destroyed the notes made in the tree
 *     the first run produced.
 *
 * The second one is the reason for most of what is below. **A hand-off is not
 * entitled to delete anything.** The tests are therefore written as "the file
 * that was there is still there", not merely as "it exited non-zero" — an exit
 * code says nothing about what was lost on the way to it.
 *
 * Everything runs in `mkdtemp` directories that these tests create and remove.
 * No network, no remote, no directory belonging to anybody.
 */

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

/** A tiny repository with two commits, so a bundle of it has something to carry. */
function fixtureRepo(root) {
  const repo = join(root, 'fixture');
  mkdirSync(repo);
  git(repo, 'init', '-q', '-b', 'work');
  git(repo, 'config', 'user.name', 'Pack Handoff Fixture');
  git(repo, 'config', 'user.email', 'fixture@invalid.example');
  git(repo, 'config', 'commit.gpgsign', 'false');
  writeFileSync(join(repo, 'base.txt'), 'base\n');
  git(repo, 'add', 'base.txt');
  git(repo, 'commit', '-qm', 'base');
  const base = git(repo, 'rev-parse', 'HEAD');
  writeFileSync(join(repo, 'later.txt'), 'later\n');
  git(repo, 'add', 'later.txt');
  git(repo, 'commit', '-qm', 'later');
  return { repo, base, head: git(repo, 'rev-parse', 'HEAD') };
}

const pack = (repo, out, extra = []) =>
  spawnSync('node', [PACKER, '--out', out, ...extra], { cwd: repo, encoding: 'utf8' });

const restore = (packDir, args = [], cwd = undefined) =>
  spawnSync('sh', [join(packDir, 'restore.sh'), ...args], { cwd, encoding: 'utf8' });

/** Each test gets its own temporary root and removes it, whatever happens. */
function withTemp(run) {
  const root = mkdtempSync(join(tmpdir(), 'pack-handoff-test-'));
  try {
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// whole-history mode: it may create, and it may never destroy

test('packer: a whole-history restore builds a new target', () => {
  withTemp((root) => {
    const { repo, head } = fixtureRepo(root);
    const out = join(root, 'pack');
    assert.equal(pack(repo, out).status, 0);

    const target = join(root, 'fresh');
    const done = restore(out, [target]);
    assert.equal(done.status, 0, done.stderr);
    assert.equal(git(target, 'rev-parse', 'HEAD'), head);
    assert.equal(readFileSync(join(target, 'later.txt'), 'utf8'), 'later\n');
  });
});

test('packer: a whole-history restore refuses an existing target and deletes nothing', () => {
  withTemp((root) => {
    const { repo } = fixtureRepo(root);
    const out = join(root, 'pack');
    assert.equal(pack(repo, out).status, 0);

    // The review's scenario: a directory that already holds something.
    const target = join(root, 'occupied');
    mkdirSync(target);
    const sentinel = join(target, 'do-not-delete.txt');
    writeFileSync(sentinel, 'a file that was here first\n');

    const done = restore(out, [target]);
    assert.notEqual(done.status, 0, 'it must not proceed');
    assert.equal(
      readFileSync(sentinel, 'utf8'),
      'a file that was here first\n',
      'the file that was there is still there, unchanged'
    );
    assert.match(done.stderr, /already something at/);
    assert.doesNotMatch(done.stderr, /--force|--overwrite/, 'and there is no flag offered to override it');
  });
});

test('packer: running a whole-history restore twice keeps the work done in between', () => {
  withTemp((root) => {
    const { repo } = fixtureRepo(root);
    const out = join(root, 'pack');
    assert.equal(pack(repo, out).status, 0);

    const target = join(root, 'restored');
    assert.equal(restore(out, [target]).status, 0);

    // Somebody works in the restored tree, then the restore is run again —
    // by habit, by a script, by not remembering. Their work must survive.
    const notes = join(target, 'my-notes.md');
    writeFileSync(notes, '# what I found\n');

    const second = restore(out, [target]);
    assert.notEqual(second.status, 0);
    assert.equal(readFileSync(notes, 'utf8'), '# what I found\n', 'the notes are still there');
  });
});

test('packer: a relative target resolves against the caller, not the pack directory', () => {
  withTemp((root) => {
    const { repo, head } = fixtureRepo(root);
    const out = join(root, 'pack');
    assert.equal(pack(repo, out).status, 0);

    const from = join(root, 'somewhere-else');
    mkdirSync(from);
    const done = restore(out, ['./here'], from);
    assert.equal(done.status, 0, done.stderr);
    assert.equal(git(join(from, 'here'), 'rev-parse', 'HEAD'), head, 'created where it was run');
    assert.equal(existsSync(join(out, 'here')), false, 'and not beside the script');
  });
});

test('packer: a corrupted part fails the checksum before anything is written', () => {
  withTemp((root) => {
    const { repo } = fixtureRepo(root);
    const out = join(root, 'pack');
    assert.equal(pack(repo, out).status, 0);

    const bundle = join(out, 'full.bundle');
    const bytes = readFileSync(bundle);
    bytes[Math.floor(bytes.length / 2)] ^= 0xff;
    writeFileSync(bundle, bytes);

    const target = join(root, 'never');
    const done = restore(out, [target]);
    assert.notEqual(done.status, 0);
    assert.equal(existsSync(target), false, 'it stops at the checksum, before creating anything');
  });
});

// ---------------------------------------------------------------------------
// incremental mode: it may add refs, and it may never move somebody's work

test('packer: an incremental restore fetches into a clone that has the base', () => {
  withTemp((root) => {
    const { repo, base, head } = fixtureRepo(root);
    const out = join(root, 'pack');
    assert.equal(pack(repo, out, ['--since', base]).status, 0);

    const manifest = JSON.parse(readFileSync(join(out, 'MANIFEST.json'), 'utf8'));
    assert.equal(manifest.bundle.incremental, true);
    assert.equal(manifest.bundle.base, base, 'the base is recorded as a full SHA');
    assert.equal(manifest.head, head);

    // A clone that has the base commit but not the later one.
    const clone = join(root, 'clone');
    git(root, 'clone', '-q', repo, clone);
    git(clone, 'checkout', '-q', base);
    git(clone, 'checkout', '-q', '-B', 'main');

    const done = restore(out, [clone]);
    assert.equal(done.status, 0, done.stderr);
    assert.equal(git(clone, 'rev-parse', 'refs/handoff/work'), head);
  });
});

test('packer: an incremental restore stops when the base is missing, and changes nothing', () => {
  withTemp((root) => {
    const { repo, base } = fixtureRepo(root);
    const out = join(root, 'pack');
    assert.equal(pack(repo, out, ['--since', base]).status, 0);

    const stranger = join(root, 'stranger');
    mkdirSync(stranger);
    git(stranger, 'init', '-q', '-b', 'main');
    git(stranger, 'config', 'user.name', 'Stranger');
    git(stranger, 'config', 'user.email', 'stranger@invalid.example');
    writeFileSync(join(stranger, 'mine.txt'), 'mine\n');
    git(stranger, 'add', 'mine.txt');
    git(stranger, 'commit', '-qm', 'mine');
    const before = git(stranger, 'rev-parse', 'HEAD');

    const done = restore(out, [stranger]);
    assert.notEqual(done.status, 0);
    assert.match(done.stderr, /does not have the base commit/);
    // `--since` takes any commit, and the bases this series actually uses are
    // local hand-off HEADs that no remote has. Telling the recipient to fetch a
    // remote was advice that could not work, so the message says what is really
    // needed: a repository that already contains the base.
    // The message wraps, so it is matched with whitespace normalised.
    const said = done.stderr.replace(/\s+/g, ' ');
    assert.doesNotMatch(said, /fetch origin/);
    assert.doesNotMatch(said, /ancestor of the published default branch/);
    assert.match(said, /repository that already contains that commit/);
    assert.match(said, /does not fetch anything/);
    assert.equal(git(stranger, 'rev-parse', 'HEAD'), before, 'their HEAD did not move');
    assert.equal(readFileSync(join(stranger, 'mine.txt'), 'utf8'), 'mine\n');
  });
});

test('packer: an incremental restore leaves a dirty working tree and a checked-out branch alone', () => {
  withTemp((root) => {
    const { repo, base, head } = fixtureRepo(root);
    const out = join(root, 'pack');
    assert.equal(pack(repo, out, ['--since', base]).status, 0);

    const clone = join(root, 'clone');
    git(root, 'clone', '-q', repo, clone);
    // They are sitting on the same branch name, at an older commit, with
    // uncommitted work in the tree. This is the case where a restore that
    // "helpfully" updates the branch would take their checkout with it.
    git(clone, 'checkout', '-q', '-B', 'work', base);
    writeFileSync(join(clone, 'base.txt'), 'edited, not committed\n');

    const done = restore(out, [clone]);
    assert.equal(done.status, 0, done.stderr);
    assert.equal(git(clone, 'rev-parse', 'refs/handoff/work'), head, 'the new work arrived');
    assert.equal(git(clone, 'rev-parse', 'HEAD'), base, 'and their HEAD did not move');
    assert.equal(
      readFileSync(join(clone, 'base.txt'), 'utf8'),
      'edited, not committed\n',
      'and their uncommitted edit is untouched'
    );
  });
});

// ---------------------------------------------------------------------------
// the packer's own output directory

test('packer: it will not write into a directory that already has something in it', () => {
  withTemp((root) => {
    const { repo } = fixtureRepo(root);
    const out = join(root, 'pack');
    mkdirSync(out);
    // An older hand-off, or anything else that happened to be there. It would
    // not be overwritten — it would be checksummed into SHA256SUMS.txt and
    // shipped as though it belonged to this hand-off.
    writeFileSync(join(out, 'left-over.bundle'), 'from last time\n');

    const done = pack(repo, out);
    assert.notEqual(done.status, 0);
    assert.match(done.stderr, /already exists and is not empty/);
    assert.equal(readFileSync(join(out, 'left-over.bundle'), 'utf8'), 'from last time\n');
    assert.equal(existsSync(join(out, 'SHA256SUMS.txt')), false, 'and nothing was written beside it');
  });
});

test('packer: the checksum list covers every file and excludes itself', () => {
  withTemp((root) => {
    const { repo } = fixtureRepo(root);
    const out = join(root, 'pack');
    assert.equal(pack(repo, out).status, 0);

    const sums = readFileSync(join(out, 'SHA256SUMS.txt'), 'utf8').trim().split('\n');
    const listed = sums.map((line) => line.split(/\s+/)[1]);
    assert.ok(!listed.includes('SHA256SUMS.txt'), 'a manifest that lists itself can never verify');
    assert.deepEqual(listed.sort(), ['ASSETS.md', 'MANIFEST.json', 'full.bundle', 'restore.sh']);

    // And it is a real check, not a decorative one.
    const checked = spawnSync('sha256sum', ['-c', 'SHA256SUMS.txt'], { cwd: out, encoding: 'utf8' });
    assert.equal(checked.status, 0, checked.stdout + checked.stderr);
  });
});
