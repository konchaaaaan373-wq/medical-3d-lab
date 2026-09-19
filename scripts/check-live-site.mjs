#!/usr/bin/env node
/**
 * Checks the *deployed* site, not the build output.
 *
 *   npm run verify:live -- https://med-3d-lab.necofindjob.com
 *   npm run verify:live -- https://new.example --redirects-from https://old.example
 *
 * `verify:site` reads `dist/` and can prove the build named the right host.
 * It cannot prove that build is the one being served: a domain that moved
 * while an older deploy stayed published looks perfect locally, and every page
 * the public gets still names the host the site has left. Only a request to
 * the live origin settles that, which is what this does.
 *
 * What it asserts, in the order a crawler meets it:
 *
 *   /robots.txt      reachable, and points at this origin's sitemap
 *   /sitemap.xml     reachable, every public scene present, no Prototype work,
 *                    and every address on this origin
 *   /                reachable, canonical is this origin's root
 *   /s/<slug>/       reachable, each page's canonical is its own address
 *   /social/site.png reachable and an image — a link preview that 404s is
 *                    invisible until somebody shares a link
 *   the build stamp  which build answered: production, and optionally the
 *                    exact commit with `--expect-commit <sha>`
 *
 * With `--redirects-from`, the old origin must still lead here: links shared
 * before the move outlive the domain they were shared from.
 *
 * Exits non-zero on any of it. Needs network access to the deployed site, so
 * it is not part of CI — it is a step in the domain-change checklist in
 * `docs/release-runbook.md` and a check after any deploy that moved the site.
 */
import { SCENES } from '../src/catalog/index.js';
import { CRAWLABLE_SCENES } from '../src/catalog/release.js';
import { canonicalOf, originOf, selfDeclaredUrls } from './read-page-metadata.js';
import { scenePageUrl } from './site-metadata.js';

const args = process.argv.slice(2);
const positional = [];
let redirectsFrom = '';
let expectCommit = '';
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--redirects-from') redirectsFrom = args[(i += 1)] ?? '';
  else if (args[i].startsWith('--redirects-from=')) redirectsFrom = args[i].slice('--redirects-from='.length);
  else if (args[i] === '--expect-commit') expectCommit = args[(i += 1)] ?? '';
  else if (args[i].startsWith('--expect-commit=')) expectCommit = args[i].slice('--expect-commit='.length);
  else positional.push(args[i]);
}

const supplied = positional[0] || process.env.VITE_SITE_URL || '';
const origin = originOf(supplied);
if (!origin) {
  console.error('Usage: npm run verify:live -- https://med-3d-lab.necofindjob.com');
  if (supplied) console.error(`"${supplied}" is not a URL. It needs a scheme.`);
  process.exit(2);
}
if (redirectsFrom && !originOf(redirectsFrom)) {
  console.error(`--redirects-from "${redirectsFrom}" is not a URL. It needs a scheme.`);
  process.exit(2);
}

const problems = [];
const checked = [];

/** One request, with everything that can go wrong reported rather than thrown. */
async function get(path, { redirect = 'follow' } = {}) {
  const url = new URL(path, `${origin}/`).href;
  try {
    const response = await fetch(url, { redirect, signal: AbortSignal.timeout(20_000) });
    const body = response.body && redirect === 'follow' ? await response.text() : '';
    return { url, ok: response.ok, status: response.status, headers: response.headers, body };
  } catch (error) {
    return { url, ok: false, status: `unreachable (${error?.cause?.code ?? error?.name ?? 'error'})`, body: '' };
  }
}

/** A page must be served, and must name itself here and nowhere else. */
async function checkPage(label, path, expectedCanonical) {
  const page = await get(path);
  checked.push([label, page.status]);
  if (!page.ok) {
    problems.push(`${label}: ${page.url} returned ${page.status}`);
    return;
  }
  const canonical = canonicalOf(page.body);
  // A host already named in the canonical complaint is not said twice: on a
  // build made for another origin every tag on the page carries it, and one
  // page is worth one line.
  const said = new Set();
  if (!canonical) {
    problems.push(`${label}: no canonical — the deployed build was made without VITE_SITE_URL`);
  } else if (canonical !== expectedCanonical) {
    problems.push(`${label}: canonical is ${canonical}, expected ${expectedCanonical}`);
    said.add(originOf(canonical));
  }
  const foreign = [...new Set(selfDeclaredUrls(page.body).map(originOf))].filter(
    (declared) => declared !== origin && !said.has(declared)
  );
  if (foreign.length) problems.push(`${label}: also names ${foreign.join(', ')}`);
}

const robots = await get('/robots.txt');
checked.push(['/robots.txt', robots.status]);
if (!robots.ok) problems.push(`/robots.txt returned ${robots.status}`);
else if (!robots.body.includes(`Sitemap: ${origin}/sitemap.xml`)) {
  problems.push(`/robots.txt does not point at ${origin}/sitemap.xml`);
}

const sitemap = await get('/sitemap.xml');
checked.push(['/sitemap.xml', sitemap.status]);
if (!sitemap.ok) {
  problems.push(`/sitemap.xml returned ${sitemap.status} — the deployed build has no sitemap`);
} else {
  const locations = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc);
  const elsewhere = [...new Set(locations.map(originOf))].filter((loc) => loc !== origin);
  if (elsewhere.length) {
    problems.push(
      `/sitemap.xml lists ${elsewhere.join(', ')} — the published build was made for another origin`
    );
  }
  // No addresses at all is one fact about the deploy, not ten about scenes:
  // either the published build had no VITE_SITE_URL and emitted no sitemap, or
  // something other than a sitemap is being served at that path.
  if (locations.length === 0) {
    problems.push('/sitemap.xml carries no addresses — the published build emitted no sitemap');
  }
  // The crawlable set, not the public one: a scene has to be both open and
  // public to have a page at all (`catalog/release.js`), so asking the live
  // site for a page the build deliberately did not emit would fail this job
  // every morning for a reason that is not a defect.
  for (const entry of locations.length ? CRAWLABLE_SCENES : []) {
    if (!locations.includes(`${origin}/${scenePageUrl(entry)}`)) {
      problems.push(`${entry.id}: missing from the published sitemap`);
    }
  }
  for (const entry of SCENES) {
    if (CRAWLABLE_SCENES.includes(entry)) continue;
    if (locations.some((loc) => loc.includes(`/s/${entry.slug}/`))) {
      problems.push(`${entry.id}: not crawlable, but in the published sitemap`);
    }
  }
}

await checkPage('the home page', '/', `${origin}/`);
for (const entry of CRAWLABLE_SCENES) {
  const path = `/${scenePageUrl(entry)}`;
  await checkPage(entry.id, path, `${origin}${path}`);
}

const card = await get('/social/site.png');
checked.push(['/social/site.png', card.status]);
if (!card.ok) problems.push(`/social/site.png returned ${card.status} — link previews will render broken`);
else if (!(card.headers?.get('content-type') ?? '').startsWith('image/')) {
  problems.push(`/social/site.png is served as ${card.headers?.get('content-type') ?? 'nothing'}, not an image`);
}

if (redirectsFrom) {
  const old = originOf(redirectsFrom);
  try {
    const response = await fetch(`${old}/`, { redirect: 'manual', signal: AbortSignal.timeout(20_000) });
    const location = response.headers.get('location') ?? '';
    checked.push([`${old}/`, response.status]);
    if (response.status < 300 || response.status >= 400) {
      problems.push(`${old}/ returned ${response.status} instead of redirecting — old links do not lead here`);
    } else if (originOf(new URL(location, `${old}/`).href) !== origin) {
      problems.push(`${old}/ redirects to ${location || 'nowhere'}, not ${origin}`);
    }
  } catch (error) {
    problems.push(`${old}/ is unreachable (${error?.cause?.code ?? error?.name ?? 'error'})`);
  }
}

/**
 * Which build is actually being served.
 *
 * Everything above proves the deployed pages name the right host. None of it
 * says *which build* answered, and that is the question that cost two rounds
 * of "this is broken" / "that is fixed" about the same screen: the reporter
 * was on a deploy preview of a pull request merged before the fix, and no
 * request anybody made could have told them so (L-51). The build stamps its
 * own identity into every page (`vite.config.js`), so one request settles it.
 *
 * Reported always, asserted only when a commit is named — `--expect-commit
 * <sha>` after a deploy answers "did the thing I merged actually go out?"
 * without a browser and without guessing from timestamps.
 */
const stamp = (html, name) => html.match(new RegExp(`name="${name}" content="([^"]*)"`))?.[1] ?? '';
const home = await get('/');
const served = {
  context: stamp(home.body ?? '', 'build-context'),
  commit: stamp(home.body ?? '', 'build-commit'),
  review: stamp(home.body ?? '', 'build-review'),
};
if (!served.context) {
  problems.push(
    'the served page carries no build-context meta tag — either this origin is running a build ' +
      'from before the build stamped itself, or it is not this site at all',
  );
} else if (served.context !== 'production') {
  problems.push(
    `the served build says it is "${served.context}"` +
      (served.review ? ` (PR #${served.review})` : '') +
      ` — a published origin must serve a production build`,
  );
}
if (expectCommit && served.commit && !served.commit.startsWith(expectCommit.slice(0, 7))) {
  problems.push(
    `the served build is ${served.commit.slice(0, 7)}, not the expected ${expectCommit.slice(0, 7)} — ` +
      'the deploy has not landed yet, or it failed',
  );
}

console.log(`Deployed site — ${origin}`);
console.log(
  `  build   ${served.context || 'unstamped'}` +
    (served.commit ? ` · ${served.commit.slice(0, 7)}` : '') +
    (served.review ? ` · PR #${served.review}` : ''),
);
for (const [label, status] of checked) console.log(`  ${String(status).padEnd(14)} ${label}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('\nSee the domain-change checklist in docs/release-runbook.md.');
  process.exit(1);
}
console.log(`  ok    the deployed build is the one built for ${origin}`);
