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
import { chmodSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
};

const out = flag('--out');
if (!out) {
  console.error('usage: node scripts/pack-handoff.mjs --out <dir> [--limit-mib 30]');
  process.exit(2);
}
const limitBytes = Number(flag('--limit-mib', '30')) * 1024 * 1024;

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const head = git('rev-parse', 'HEAD');
const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

mkdirSync(out, { recursive: true });

// --- the bundle ------------------------------------------------------------
// `--all`, so it restores with no prerequisite commit.
const bundlePath = join(out, 'full.bundle');
execFileSync('git', ['bundle', 'create', bundlePath, '--all'], { stdio: 'ignore' });
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

const restore = [
  '#!/bin/sh',
  '# Verify and restore this hand-off. One command, no manual step.',
  '#',
  '#   sh restore.sh [target-directory]',
  '#',
  '# Exits non-zero on any mismatch: a checksum that does not match, a bundle git',
  '# will not accept, or a restored HEAD that is not the one recorded.',
  'set -eu',
  '',
  'HERE=$(cd "$(dirname "$0")" && pwd)',
  'TARGET=${1:-"$HERE/restored"}',
  'WORK=$(mktemp -d)',
  "trap 'rm -rf \"$WORK\"' EXIT",
  'cd "$HERE"',
  '',
  `EXPECTED_HEAD=${head}`,
  `EXPECTED_BUNDLE=${bundleHash}`,
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
  'echo "3/5  git bundle verify"',
  '# `git bundle verify` refuses to run outside a repository ("need a repository',
  '# to verify a bundle"), and the recipient will not be in one. An empty scratch',
  '# repository is enough for it, and it is thrown away with $WORK.',
  'git init --quiet "$WORK/scratch"',
  'git -C "$WORK/scratch" bundle verify "$WORK/full.bundle"',
  '',
  'echo "4/5  clone into $TARGET"',
  'rm -rf "$TARGET"',
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
  bundle: { name: 'full.bundle', sha256: bundleHash, bytes: bundleBytes, split: parts.length > 0, parts },
  restore: 'sh restore.sh [target-directory]',
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
console.log(`  listed  ${listed.length} files in ${MANIFEST_NAME} (itself excluded)`);
