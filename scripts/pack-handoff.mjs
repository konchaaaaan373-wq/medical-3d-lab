#!/usr/bin/env node
/**
 * Build a hand-off directory that the recipient can verify and restore without
 * doing anything by hand.
 *
 *   node scripts/pack-handoff.mjs --out <dir> [--limit-mib 30]
 *
 * ## What this exists to get right
 *
 * The previous hand-off's checksum manifest listed **itself**, so one of its 67
 * lines could never match, and it carried a line whose filename column read
 * `full.bundle (parts 00+01 を結合したもの)` — prose where a path belongs, which
 * no checker can use. It also asked the recipient to join two parts by hand and
 * compare hashes by eye.
 *
 * So, in order:
 *
 *  - `SHA256SUMS.txt` lists **every file except itself**, as relative paths in
 *    the plain `sha256sum -c` format. Nothing else goes in the filename column.
 *  - a bundle over the size limit is split, and the parts are ordinary files in
 *    that same manifest.
 *  - `restore.sh` verifies the manifest, joins the parts, checks the joined
 *    bundle against its own recorded hash, runs `git bundle verify`, clones,
 *    checks out the branch and compares the restored HEAD with the recorded
 *    one. One command, no manual step, non-zero exit on any mismatch.
 *  - `MANIFEST.json` says the same things in a form a program can read: the
 *    HEAD, the branch, the parts in order and the joined hash.
 *
 * Nothing here publishes, pushes or touches a remote.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};

const out = flag('--out');
if (!out) {
  console.error('usage: node scripts/pack-handoff.mjs --out <dir> [--limit-mib 30] [--since <ref>]');
  process.exit(2);
}
const limitBytes = Number(flag('--limit-mib', '30')) * 1024 * 1024;

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const head = git('rev-parse', 'HEAD');
const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

/**
 * `--since <ref>` builds an **incremental** bundle: only the commits after that
 * ref. It is dramatically smaller — a full bundle of this repository is 47 MB
 * because of the screenshot history, while the 36 commits of one branch are
 * 25 MB — which matters when the transport has a size limit and splitting the
 * archive would put a manual join back in front of the recipient.
 *
 * The cost is a **prerequisite**: the recipient's clone must already contain
 * that commit. So the ref is resolved here and recorded, and `restore.sh`
 * checks for it before touching anything and stops with a plain message if it
 * is missing. Pass a commit that is an ancestor of the published default
 * branch, so any ordinary clone has it; `git merge-base HEAD origin/main` is
 * the safe answer.
 *
 * Without `--since` the bundle is `--all` and needs no prerequisite.
 */
const since = flag('--since');
const base = since ? git('rev-parse', `${since}^{commit}`) : null;
const commits = base ? Number(git('rev-list', '--count', `${base}..HEAD`)) : null;
if (base && commits === 0) {
  console.error(`--since ${since} resolves to ${base}, which is HEAD: there is nothing to bundle`);
  process.exit(2);
}

/**
 * The output directory has to be new, or at least empty.
 *
 * Reusing a non-empty one silently mixes an older hand-off into this one: the
 * stale files are not overwritten, but `SHA256SUMS.txt` lists whatever is in
 * the directory, so they are checksummed, shipped and vouched for. That is how
 * something that was never meant to leave — an old bundle, a scratch file, a
 * key someone happened to drop there — gets delivered under a manifest saying
 * it belongs. Stopping is enough; nothing here deletes the directory.
 */
if (existsSync(out) && readdirSync(out).length > 0) {
  console.error(`${out} already exists and is not empty.`);
  console.error('This would ship whatever is already in it under this hand-off\'s checksums.');
  console.error('Pass a new directory, or empty this one yourself first.');
  process.exit(2);
}
mkdirSync(out, { recursive: true });

// --- the bundle ------------------------------------------------------------
const bundlePath = join(out, 'full.bundle');
execFileSync(
  'git',
  base
    ? ['bundle', 'create', bundlePath, `${base}..${branch}`]
    : ['bundle', 'create', bundlePath, '--all'],
  { stdio: 'ignore' }
);
const bundleHash = sha256(bundlePath);
const bundleBytes = statSync(bundlePath).size;

/** Split only when it has to be, and record enough to put it back. */
const parts = [];
if (bundleBytes > limitBytes) {
  const data = readFileSync(bundlePath);
  for (let i = 0, n = 0; i < data.length; i += limitBytes, n += 1) {
    const name = `full.bundle.${String(n).padStart(2, '0')}.part`;
    writeFileSync(join(out, name), data.subarray(i, Math.min(i + limitBytes, data.length)));
    parts.push(name);
  }
  rmSync(bundlePath);
}

// --- restore.sh ------------------------------------------------------------
const joinLine = parts.length
  ? `cat ${parts.join(' ')} > "$WORK/full.bundle"`
  : 'cp full.bundle "$WORK/full.bundle"';

/**
 * A whole-history bundle: verify it in a throwaway repository, then clone.
 *
 * `git bundle verify` refuses to run outside a repository — "need a repository
 * to verify a bundle" — and the recipient will not be in one, which is how this
 * failed for every recipient until it was actually executed. An empty scratch
 * repository under $WORK satisfies it and is thrown away with $WORK.
 *
 * **The target must not already exist.** This step used to open with
 * `rm -rf "$TARGET"`, which is how a restore came to delete whatever was at the
 * path it was pointed at — including, on a second run, the notes someone had
 * made in the tree the first run produced. A hand-off is not entitled to delete
 * anything. It now stops instead, and there is deliberately no flag to make it
 * overwrite: the reader can remove a directory themselves if that is what they
 * mean, and then it is their deletion rather than a side effect of a restore.
 */
const cloneSteps = () => [
  'echo "3/5  git bundle verify"',
  'git init --quiet "$WORK/scratch"',
  'git -C "$WORK/scratch" bundle verify "$WORK/full.bundle"',
  '',
  'echo "4/5  clone into $TARGET"',
  'if [ -e "$TARGET" ]; then',
  '  echo "there is already something at $TARGET, and this restore never overwrites." >&2',
  '  echo "it only ever creates a new directory - it does not delete, merge or update in place." >&2',
  '  echo "give it a path that does not exist yet:  sh restore.sh /path/that/does/not/exist" >&2',
  '  exit 1',
  'fi',
  'git clone --quiet "$WORK/full.bundle" "$TARGET"',
  `git -C "$TARGET" checkout --quiet ${branch}`,
  '',
  'echo "5/5  HEAD"',
  'ACTUAL_HEAD=$(git -C "$TARGET" rev-parse HEAD)',
  'if [ "$ACTUAL_HEAD" != "$EXPECTED_HEAD" ]; then',
  '  echo "restored HEAD mismatch: $ACTUAL_HEAD != $EXPECTED_HEAD" >&2',
  '  exit 1',
  'fi',
  '',
  'echo',
  `echo "OK  $TARGET is at $ACTUAL_HEAD on ${branch}"`,
  'echo "    the third-party GLBs are not in the bundle - see ASSETS.md"',
];

/**
 * An incremental bundle: fetch it into a clone that already has the base commit.
 *
 * Here the target is an existing repository rather than a directory to create,
 * and `git bundle verify` runs inside it, because the bundle's prerequisite is
 * exactly what that check is for.
 *
 * **Nothing here touches a working tree.** The commits arrive on
 * `refs/handoff/<branch>` first; the local branch is created only if it does
 * not exist, and moved only if the move is a fast-forward and the branch is not
 * the one checked out. Anything else is left alone and printed as a command the
 * reader can run when they choose. A hand-off has no business resetting
 * somebody's work in progress.
 */
const incrementalSteps = () => [
  'echo "3/5  git bundle verify (in your clone: this bundle has a prerequisite)"',
  'if ! git -C "$TARGET" rev-parse --git-dir >/dev/null 2>&1; then',
  '  echo "not a git repository: $TARGET" >&2',
  '  echo "run this from inside your clone, or pass its path: sh restore.sh /path/to/clone" >&2',
  '  exit 1',
  'fi',
  'if ! git -C "$TARGET" cat-file -e "$BASE^{commit}" 2>/dev/null; then',
  '  echo "your clone does not have the base commit $BASE" >&2',
  '  echo "it is an ancestor of the published default branch, so: git -C \\"$TARGET\\" fetch origin" >&2',
  '  exit 1',
  'fi',
  'git -C "$TARGET" bundle verify "$WORK/full.bundle"',
  '',
  'echo "4/5  fetch into $TARGET"',
  `git -C "$TARGET" fetch --quiet "$WORK/full.bundle" "refs/heads/${branch}:refs/handoff/${branch}"`,
  '',
  'echo "5/5  HEAD"',
  `ACTUAL_HEAD=$(git -C "$TARGET" rev-parse refs/handoff/${branch})`,
  'if [ "$ACTUAL_HEAD" != "$EXPECTED_HEAD" ]; then',
  '  echo "fetched HEAD mismatch: $ACTUAL_HEAD != $EXPECTED_HEAD" >&2',
  '  exit 1',
  'fi',
  '',
  // Why the branch was or was not moved. The two reasons for leaving it are
  // different and are reported differently: "you have it checked out" and "it
  // has diverged" call for different next steps, and saying "not a
  // fast-forward" about a branch that is simply checked out is untrue.
  `CHECKED_OUT=$(git -C "$TARGET" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")`,
  'ADVICE=""',
  `if ! git -C "$TARGET" rev-parse --verify --quiet "refs/heads/${branch}" >/dev/null; then`,
  `  git -C "$TARGET" branch ${branch} "$ACTUAL_HEAD"`,
  '  PLACED="created"',
  `elif [ "$(git -C "$TARGET" rev-parse "refs/heads/${branch}")" = "$ACTUAL_HEAD" ]; then`,
  '  PLACED="already there"',
  `elif [ "${branch}" = "$CHECKED_OUT" ]; then`,
  '  PLACED="left alone - you have it checked out"',
  `  ADVICE="git -C \\"$TARGET\\" merge --ff-only refs/handoff/${branch}"`,
  `elif git -C "$TARGET" merge-base --is-ancestor "refs/heads/${branch}" "$ACTUAL_HEAD"; then`,
  `  git -C "$TARGET" branch --force ${branch} "$ACTUAL_HEAD"`,
  '  PLACED="fast-forwarded"',
  'else',
  '  PLACED="left alone - it has diverged from this work"',
  `  ADVICE="git -C \\"$TARGET\\" log refs/handoff/${branch}"`,
  'fi',
  '',
  'echo',
  `echo "OK  $ACTUAL_HEAD is in $TARGET"`,
  `echo "    refs/handoff/${branch} points at it; branch ${branch}: $PLACED"`,
  'if [ -n "$ADVICE" ]; then',
  '  echo "    nothing was moved. when you want it:"',
  '  echo "      $ADVICE"',
  'fi',
  'echo "    the third-party GLBs are not in the bundle - see ASSETS.md"',
];

const restore = [
  '#!/bin/sh',
  '# Verify and restore this hand-off. One command, no manual step.',
  '#',
  base
    ? '#   sh restore.sh [path-to-your-clone]     (defaults to the current directory)'
    : '#   sh restore.sh [target-directory]       (defaults to ./restored beside this script)',
  '#',
  ...(base
    ? [
      '# This is an INCREMENTAL bundle: it carries only the commits after the base',
      '# commit below, which your clone already has because it is an ancestor of the',
      '# published default branch. That is what keeps it small enough to arrive in one',
      '# piece. Nothing here touches your working tree, and nothing is force-moved.',
    ]
    : ['# This bundle carries the whole history and needs nothing beforehand.']),
  '#',
  '# Exits non-zero on any mismatch: a checksum that does not match, a bundle git',
  '# will not accept, or a restored HEAD that is not the one recorded.',
  'set -eu',
  '',
  'HERE=$(cd "$(dirname "$0")" && pwd)',
  'WAS=$(pwd)',
  base ? 'TARGET=${1:-"$WAS"}' : 'TARGET=${1:-"$HERE/restored"}',
  '# A relative target means relative to where the reader ran this, not to where',
  '# the script happens to live. Resolved before the `cd` below, and without',
  '# requiring the path to exist yet.',
  'case "$TARGET" in',
  '  /*) ;;',
  '  *) TARGET="$WAS/$TARGET" ;;',
  'esac',
  '# $WORK is the only thing this script creates that it also removes. Nothing',
  '# outside it is ever deleted.',
  'WORK=$(mktemp -d)',
  "trap 'rm -rf \"$WORK\"' EXIT",
  'cd "$HERE"',
  '',
  `EXPECTED_HEAD=${head}`,
  `EXPECTED_BUNDLE=${bundleHash}`,
  ...(base ? [`BASE=${base}`] : []),
  '',
  'sum() {',
  '  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$@";',
  '  elif command -v shasum >/dev/null 2>&1; then shasum -a 256 "$@";',
  '  else echo "no sha256sum or shasum on PATH" >&2; exit 2; fi',
  '}',
  'check() {',
  '  if command -v sha256sum >/dev/null 2>&1; then sha256sum -c "$1";',
  '  elif command -v shasum >/dev/null 2>&1; then shasum -a 256 -c "$1";',
  '  else echo "no sha256sum or shasum on PATH" >&2; exit 2; fi',
  '}',
  '',
  'echo "1/5  checksums"',
  'check SHA256SUMS.txt',
  '',
  `echo "2/5  ${parts.length ? `joining ${parts.length} parts` : 'bundle'}"`,
  joinLine,
  'ACTUAL_BUNDLE=$(sum "$WORK/full.bundle" | cut -d" " -f1)',
  'if [ "$ACTUAL_BUNDLE" != "$EXPECTED_BUNDLE" ]; then',
  '  echo "joined bundle hash mismatch: $ACTUAL_BUNDLE != $EXPECTED_BUNDLE" >&2',
  '  exit 1',
  'fi',
  '',
  ...(base ? incrementalSteps() : cloneSteps()),
  '',
].join('\n');
writeFileSync(join(out, 'restore.sh'), restore);
chmodSync(join(out, 'restore.sh'), 0o755);

// --- ASSETS.md -------------------------------------------------------------
// `restore.sh` points at this, so it has to exist. The third-party GLBs are
// deliberately not in the bundle: they are git-ignored, they are not ours to
// redistribute, and `src/catalog/devAssets.js` pins each one by URL, byte count
// and hash so the fetch is verifiable rather than trusting.
writeFileSync(join(out, 'ASSETS.md'), [
  '# The candidate 3D assets are not in this bundle',
  '',
  'The third-party GLBs this branch measures are **not** included, on purpose:',
  'they are git-ignored, they are not ours to redistribute, and they are large.',
  '',
  'After restoring, fetch them in the restored checkout:',
  '',
  '    npm install',
  '    npm run assets:dev',
  '',
  'That reads `src/catalog/devAssets.js`, which pins every file by URL at a fixed',
  'commit, byte count, git blob SHA-1 and SHA-256, and refuses anything that does',
  'not match. Nothing it fetches is written into `public/`, and no production',
  'build reads any of it.',
  '',
  'Without them the scenes that use them report `state: "error"` with a hint, and',
  '`npm run assets:measure` and `npm run assets:validate` have nothing to read.',
  'Every other test runs.',
  '',
].join('\n'));

// --- MANIFEST.json ---------------------------------------------------------
writeFileSync(join(out, 'MANIFEST.json'), `${JSON.stringify({
  head,
  branch,
  bundle: {
    name: 'full.bundle',
    sha256: bundleHash,
    bytes: bundleBytes,
    split: parts.length > 0,
    parts,
    // An incremental bundle applies only to a clone that already has `base`.
    incremental: Boolean(base),
    ...(base ? { base, commits } : {}),
  },
  restore: base ? 'sh restore.sh [path-to-your-clone]' : 'sh restore.sh [target-directory]',
  checksums: 'SHA256SUMS.txt — every file in this directory except SHA256SUMS.txt itself',
  assets: 'ASSETS.md — the third-party GLBs are not in the bundle; how to fetch them',
}, null, 2)}\n`);

// --- SHA256SUMS.txt --------------------------------------------------------
// Written last, and **excluding itself**: a manifest that lists its own hash can
// never be right, because writing the hash changes the file.
const MANIFEST_NAME = 'SHA256SUMS.txt';
const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(relative(out, full).split(sep).join('/'));
  }
};
walk(out);
const listed = files.filter((path) => path !== MANIFEST_NAME);
writeFileSync(
  join(out, MANIFEST_NAME),
  `${listed.map((path) => `${sha256(join(out, path))}  ${path}`).join('\n')}\n`
);

console.log(`packed ${out}`);
console.log(`  HEAD    ${head} on ${branch}`);
console.log(`  bundle  ${bundleBytes} bytes, sha256 ${bundleHash}${parts.length ? `, split into ${parts.length}` : ''}`);
if (base) console.log(`  scope   incremental: ${commits} commits after ${base}, which the recipient's clone must already have`);
else console.log('  scope   whole history, no prerequisite');
console.log(`  listed  ${listed.length} files in ${MANIFEST_NAME} (itself excluded)`);
