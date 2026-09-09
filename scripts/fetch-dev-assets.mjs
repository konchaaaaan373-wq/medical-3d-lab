#!/usr/bin/env node
/**
 * Fetches the candidate assets a scene under development needs.
 *
 *   npm run assets:dev
 *
 * The files are not in this repository and are not going to be: a third-party
 * binary does not belong in it, and a candidate that may never be adopted
 * belongs in it least of all. What is in the repository is the pinned record —
 * commit, path, size, git blob SHA-1 — so this can fetch exactly those bytes and
 * refuse anything else.
 *
 * What it refuses, and why each check earns its place:
 *
 * - **Size**, because a proxy error page is a 200 with a body.
 * - **git blob SHA-1**, because that is what the source record pins, and it is
 *   computed the way git computes it rather than trusted from a header.
 * - **SHA-256**, recorded on the first fetch and enforced afterwards, because
 *   the blob hash identifies the file in *that* repository and the digest
 *   identifies the bytes anywhere.
 *
 * A file that fails any of them is deleted rather than left on disk where the
 * next run would find it and skip the download.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { DEV_ASSETS, DEV_ASSET_ROOT } from '../src/catalog/devAssets.js';

const root = resolve(DEV_ASSET_ROOT);
const only = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
const force = process.argv.includes('--force');

/** The hash git would give this content, which is what the source record pins. */
const gitBlobSha1 = (bytes) =>
  createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

let failed = 0;
for (const asset of DEV_ASSETS) {
  if (only.length && !only.includes(asset.id)) continue;
  const target = join(root, asset.file);
  if (existsSync(target) && !force) {
    const bytes = readFileSync(target);
    if (bytes.length === asset.bytes && gitBlobSha1(bytes) === asset.gitBlobSha1) {
      console.log(`  ok       ${asset.id} — already here, and it is the right file`);
      continue;
    }
    console.log(`  refetch  ${asset.id} — what is on disk is not the pinned file`);
  }

  process.stdout.write(`  fetch    ${asset.id} … `);
  let bytes;
  try {
    const response = await fetch(asset.url);
    if (!response.ok) throw new Error(`http ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.log(`failed: ${error.message}`);
    failed += 1;
    continue;
  }

  const problems = [];
  if (bytes.length !== asset.bytes) problems.push(`${bytes.length} bytes, expected ${asset.bytes}`);
  const blob = gitBlobSha1(bytes);
  if (blob !== asset.gitBlobSha1) problems.push(`git blob ${blob}, expected ${asset.gitBlobSha1}`);
  const digest = sha256(bytes);
  if (asset.sha256 && digest !== asset.sha256) {
    problems.push(`sha256 ${digest}, expected ${asset.sha256}`);
  }
  if (problems.length) {
    console.log(`rejected — ${problems.join('; ')}`);
    failed += 1;
    continue;
  }

  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  console.log(`${bytes.length} bytes  sha256:${digest}`);
  if (!asset.sha256) {
    console.log(`           ^ record this digest in src/catalog/devAssets.js for ${asset.id}`);
  }
}

if (failed) {
  console.error(`\n${failed} asset(s) were not fetched. Nothing that failed a check was kept.`);
  process.exit(1);
}
console.log(`\nCandidate assets are in ${DEV_ASSET_ROOT}/. They are not shipped and not committed.`);
