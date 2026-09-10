#!/usr/bin/env node
/** Static B5 contract audit for a restored Medical 3D Lab tree. */
import fs from 'node:fs/promises';
import path from 'node:path';

const repo = path.resolve(process.argv[2] || '.');
const checks = [];
const read = async (p) => {
  try { return await fs.readFile(path.join(repo, p), 'utf8'); }
  catch { return null; }
};
const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });

const viewport = await read('src/app/landingOrganViewport.js');
if (viewport) {
  check('hero has generation guard', /generation/.test(viewport) && /gen !== generation/.test(viewport), 'late async results are rejected');
  check('hero disposes in-flight detail', /loadingDetail/.test(viewport) && /releaseLoadingDetail/.test(viewport), 'in-flight scene gets an explicit disposal path');
  check('bfcache-aware pagehide', /pagehide/.test(viewport) && /persisted/.test(viewport), 'persisted pages are not destroyed on bfcache entry');
} else check('hero source available', false, 'src/app/landingOrganViewport.js missing');

const neco = await read('src/data/necoLinks.js');
check('Neco link SSOT exists', Boolean(neco), neco ? 'reuse this file; do not hardcode duplicate URLs' : 'missing in inspected tree; do not guess URLs');

const diag = await read('src/app/publicDiagnostics.js');
if (diag) {
  const forbiddenReads = [/\blocalStorage\b/, /document\.cookie/, /location\.(?:href|hash|search)/, /\.stack\b/, /\.(?:request|response)?headers\b/i];
  check('diagnostics avoid forbidden implicit reads', forbiddenReads.every((r) => !r.test(diag)), 'no URL/storage/cookie/stack/header collection');
  check('diagnostic field allowlist exported', /PUBLIC_DIAGNOSTIC_ALLOWED_FIELDS/.test(diag), 'explicit field contract present');
} else check('diagnostic helper integrated', false, 'overlay exists in handoff but not in inspected tree');

const release = await read('src/catalog/release.js');
if (release) {
  const anatomyCandidates = /BETA_ANATOMY_CANDIDATES/.test(release);
  const problemGate = /betaPublicationProblems/.test(release);
  check(
    'anatomy beta remains fail-closed',
    anatomyCandidates && problemGate,
    anatomyCandidates && problemGate
      ? 'candidate names alone do not publish; publication problems remain authoritative'
      : 'expected PR #49 anatomy-only candidate/problem gate was not found — do not substitute the older broad brain/heart rule'
  );
} else check('release gate available', false, 'src/catalog/release.js missing');

const result = { repo, at: new Date().toISOString(), checks, pass: checks.every((c) => c.pass || c.name === 'diagnostic helper integrated') };
console.log(JSON.stringify(result, null, 2));
if (checks.some((c) => !c.pass && !['diagnostic helper integrated'].includes(c.name))) process.exitCode = 1;
