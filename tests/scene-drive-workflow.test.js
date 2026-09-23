import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

import { PUBLIC_MODELS } from '../src/catalog/publicManifest.js';
import { anatomyClaimProblems } from '../src/catalog/release.js';
import { sceneById } from '../src/catalog/index.js';

/**
 * `scene-drive-validation.yml` is the shelf for the three checks that had never
 * run in CI at all: the anatomy drive, the disease drive and the patient walk.
 *
 * What this file holds is the shape of that shelf, because every property it
 * pins has already been got wrong somewhere in this repository:
 *
 * - a published scene list copied into a second place and left to rot
 * - a candidate-time check quietly becoming a per-push one
 * - an argument list that looked right and covered one scene fewer
 *
 * None of these fail loudly at runtime. A workflow with a stale scene list
 * passes; it just never drives the scene that broke.
 */

const workflow = readFileSync(
  new URL('../.github/workflows/scene-drive-validation.yml', import.meta.url),
  'utf8'
);

test('the scene drives stay at candidate time, where F-112 put them', () => {
  assert.match(workflow, /workflow_dispatch:/, 'the drives are dispatched explicitly');

  // The point of the assertion: adding `push:` or `pull_request:` here is the
  // decision F-112 owns, and it costs minutes per scene rather than per run.
  // Whoever makes it should have to change this line and say why.
  assert.doesNotMatch(
    workflow,
    /^\s{2}(push|pull_request):/m,
    'a scene drive per push is a different decision — F-112 holds it'
  );
});

test('every check that had no workflow is driven by this one', () => {
  for (const script of ['verify:anatomy', 'verify:disease', 'verify:patient']) {
    assert.ok(
      workflow.includes(`npm run ${script}`),
      `${script} is the reason this workflow exists`
    );
  }
});

test('the published scene list is read from the catalogue, never copied here', () => {
  // The rule this enforces is CLAUDE.md's: the published set lives in
  // `publicManifest.js` and is not written down anywhere else. A workflow is
  // the worst place for a copy, because nothing renders it and no reader ever
  // sees it disagree with the site.
  assert.match(
    workflow,
    /from '\.\/src\/catalog\/publicManifest\.js'/,
    'the matrix derives the scene list at run time'
  );

  for (const model of PUBLIC_MODELS) {
    assert.ok(
      !workflow.includes(model.sceneId),
      `"${model.sceneId}" is written into the workflow — derive it instead of copying it`
    );
  }

  // Derived from nothing is not derived. A manifest that publishes nothing
  // would otherwise produce an empty matrix and a green run that drove no
  // scene at all, which is the failure mode this whole file is about.
  assert.match(workflow, /publishes nothing/, 'an empty manifest fails the run rather than skipping it');
});

test('the drives that need the paid and account surfaces are built with them', () => {
  // `check-patient-explanation.mjs` writes a session into `localStorage`. With
  // no Supabase configured there is no account layer to read it, so the walk
  // would drive a signed-out page and report the guide as withheld — green
  // where it should be red, or red for the wrong reason.
  const needsGrants = workflow.split('  disease:')[1] ?? '';
  assert.ok(needsGrants.length > 0, 'the disease job exists');

  for (const job of ['disease', 'patient']) {
    const section = workflow.split(`\n  ${job}:`)[1] ?? '';
    assert.match(section, /VITE_ALLOW_PREVIEW: '1'/, `${job} is built with preview grants`);
    assert.match(section, /VITE_SUPABASE_URL: https:\/\/stub\.invalid/, `${job} has an account layer`);
  }
});

test('every job that drives a browser installs one first', () => {
  // Found by running the patient drive locally with no Playwright: it prints
  // "Playwright is not installed, so nothing was driven" and **exits 0**. That
  // is a kindness at a developer's prompt and a trap in CI — a job that lost
  // its install step would go green having driven nothing at all, which is the
  // exact shape of failure this whole workflow exists to stop.
  //
  // The drives are deliberately not depending on Playwright (`npm test` stays a
  // plain `node --test` run), so the check has to live here: every job that
  // calls a drive must also install the browser it needs.
  const jobs = workflow.split(/\n  (?=[a-z-]+:\n)/);
  const drivers = jobs.filter((job) => /npm run verify:(anatomy|disease|patient)/.test(job));
  assert.equal(drivers.length, 3, 'three jobs drive a browser');

  for (const job of drivers) {
    const name = job.slice(0, job.indexOf(':'));
    assert.match(job, /npm i --no-save playwright@/, `${name} installs the playwright package`);
    assert.match(job, /npx playwright install --with-deps chromium/, `${name} installs the browser`);
  }
});

test('the disease drive is given its output directory before the scenes', () => {
  // `check-disease-interaction.mjs` reads argv[2] as the screenshot directory
  // and argv.slice(3) as the slugs. `-- copd asthma pulmonary-edema` therefore
  // writes into a directory called `copd` and drives two scenes, silently. The
  // script's own usage note said exactly that for as long as it existed.
  const invocation = workflow.match(/npm run verify:disease -- (\S+)/);
  assert.ok(invocation, 'the disease drive is invoked');
  assert.ok(
    !invocation[1].startsWith('$'),
    'the first argument is the output directory, not the scene list'
  );
});

test('a disease drive that drove nothing fails instead of printing ok', () => {
  // Found by running the check against an ordinary `npm run build`: disease
  // scenes are withheld from a production build, so every slug resolved to a
  // locked page, no scene was driven — and the closing line printed
  // `ok    0 scene(s) … 0 export(s)` and exited 0. It also blamed the engine's
  // encoder for the missing exports, on a run where nothing had been asked of
  // the encoder at all.
  const check = readFileSync(new URL('../scripts/check-disease-interaction.mjs', import.meta.url), 'utf8');
  const zero = check.indexOf('if (report.length === 0) {');
  assert.ok(zero >= 0, 'the check must notice that it drove no scene');
  const closing = check.indexOf('scene(s) drove baseline → disease → reset');
  assert.ok(zero < closing, 'and notice it before the line that would call it ok');
  assert.match(check.slice(zero, closing), /process\.exit\(1\)/, 'a run that measured nothing is not a pass');
  assert.match(check.slice(zero, closing), /VITE_ALLOW_PREVIEW=1/, 'and says how to get a build that has the scenes');
});

test('the anatomy drive is given the scenes that claim anatomy, not every published one', () => {
  // **This is run, not read.** The snippet below is lifted out of the workflow
  // and executed, because the property that matters is what it decides, not
  // which words it contains — a string match would have passed on the version
  // that sent the whole published set to the anatomy drive, since that version
  // also read the manifest and also mentioned the catalogue.
  //
  // What it was: the beta published anatomy only, so "published" and "claims
  // anatomy" named the same set and the matrix used the first. They stopped
  // being the same set the day a mechanism scene opened, and the anatomy drive
  // then waited thirty seconds for a part tree `cardiac-output` does not have
  // and reported it as the scene failing to open (F-198). Nobody saw it for a
  // day because this workflow only runs when someone dispatches it.
  const lifted = workflow.match(/split=\$\(node --input-type=module -e "\n([\s\S]*?)\n\s*"\)/);
  assert.ok(lifted, 'the split is still a node snippet this test can lift out and run');
  // One un-escaping, because the snippet is inside a double-quoted shell string.
  const script = lifted[1].replace(/\\\\/g, '\\');

  const split = JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, NAMED_DISEASE_SCENES: '' },
      encoding: 'utf8',
    })
  );

  const expected = PUBLIC_MODELS.map((model) => model.sceneId)
    .filter((id) => anatomyClaimProblems(sceneById(id)).length === 0);
  assert.deepEqual(
    split.anatomy.slice().sort(),
    expected.slice().sort(),
    'the anatomy matrix is exactly the published scenes that claim anatomy'
  );

  // And nothing published falls between the two drives. A scene that no drive
  // covers is the failure this split exists to stop, and it is silent by
  // nature: the run is green, one scene shorter.
  const published = PUBLIC_MODELS.map((model) => model.sceneId).sort();
  assert.deepEqual(
    [...split.anatomy, ...split.mechanism].sort(),
    published,
    'every published scene reaches one drive or the other'
  );
  for (const id of split.mechanism) {
    assert.ok(
      anatomyClaimProblems(sceneById(id)).length > 0,
      `"${id}" claims anatomy and should be driven by the anatomy drive, not the disease one`
    );
  }
});

test('the disease drive is handed the published scenes the anatomy drive cannot take', () => {
  // The split above is only worth having if the second half is wired to
  // something. Without this, a published mechanism scene would be correctly
  // kept out of the anatomy matrix and then driven by nothing at all — which
  // reads, from the outside, exactly like a run where everything passed.
  const section = workflow.split('\n  disease:')[1] ?? '';
  assert.ok(section.length > 0, 'the disease job exists');
  assert.match(section, /needs: published-scenes/, 'the disease job waits for the split');
  assert.match(
    section,
    /npm run verify:disease -- \S+ \$\{DISEASE_SCENES\} \$\{PUBLISHED_MECHANISM_SCENES\}/,
    'it drives the named scenes and the published ones the anatomy drive cannot take'
  );
  assert.match(
    section,
    /PUBLISHED_MECHANISM_SCENES: \$\{\{ needs\.published-scenes\.outputs\.mechanism \}\}/,
    'that second list comes from the catalogue split, not from a copy'
  );
});
