/**
 * What a first-time visitor downloads before anything renders.
 *
 * `main.js` and everything it *statically* imports become the eager entry
 * chunk. A dynamic `import()` does not — that is how this app keeps scenes,
 * the access layer and the paid guides out of the first paint.
 *
 * The failure this guards against is silent and easy: a module already in the
 * eager graph adds a static import for one small thing from a large data
 * module, and the whole payload joins the entry. That is exactly what happened
 * — `release.js` imported `PATIENT_GUIDES` to answer a boolean, which dragged
 * the patient guides and, through them, the COPD and asthma teaching data into
 * the entry: 220 kB of authored prose in front of every first paint, and
 * `npm run budget` failing at 134.7 kB against a 90 kB budget (F-99).
 *
 * The budget check catches the weight, but only after a build, and only once it
 * crosses the line — and the entry currently sits under budget with very little
 * room. This names the specific modules that must stay out, so the answer
 * arrives as "you imported the guides" rather than "the bundle is 3 kB too big".
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const ENTRY = resolve(SRC, 'main.js');

/**
 * Modules that must never be reachable from `main.js` by static import, and
 * why. These are large authored payloads that belong to one reader's one
 * action, not to everybody's first paint.
 */
const MUST_STAY_LAZY = {
  'data/patientGuides.js': 'the paid patient explanations — 174 kB of prose',
  'data/educationGuides.js': 'the paid lesson content',
  'data/copdTeaching.js': "COPD's causal story and lesson modules",
  'data/asthmaTeaching.js': "asthma's causal story and lesson modules",
  // F-109, and the same mistake in a new place: the release gate imported
  // `catalog/clinicalReview.js` to read one enum, and brought every scope,
  // source and unresolved limitation any reviewer has written with it — 22.8 kB
  // gzipped, a quarter of the entry budget, in front of a first paint that
  // shows none of it. The states are now derived into
  // `catalog/clinicalReviewStates.js`; the notes must stay lazy.
  'catalog/clinicalReview.js': "the reviewers' notes — 84 kB of the 98.5 kB registry",
  '../docs/clinical-reviews/registry.json': 'the clinical review registry itself',
};

/** Static `import ... from '...'` / `export ... from '...'`, never `import(...)`. */
function staticImports(file) {
  const source = readFileSync(file, 'utf8');
  // Strip block comments so a path quoted in prose is not read as an import.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const specifiers = [];
  const pattern = /(?:^|[\s;}])(?:import|export)\s(?:[^'"();]*?\sfrom\s)?['"]([^'"]+)['"]/g;
  for (const match of code.matchAll(pattern)) specifiers.push(match[1]);
  return specifiers;
}

/** Everything `main.js` pulls in eagerly, as paths relative to `src/`. */
function eagerGraph() {
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    // Data has no imports, and reading it as source finds quoted paths in it.
    if (file.endsWith('.json')) return;
    for (const specifier of staticImports(file)) {
      if (!specifier.startsWith('.')) continue;      // bare: three, and CSS is not JS
      const target = resolve(dirname(file), specifier);
      // `.json` as well as `.js`, because a JSON import is a payload like any
      // other and was the one this walk could not see: the clinical review
      // registry rode into the entry chunk through a module the walk did
      // follow, and the registry itself was invisible to it.
      if (!/\.(js|json)$/.test(target) || !existsSync(target)) continue;
      walk(target);
    }
  };
  walk(ENTRY);
  return new Set([...seen].map((file) => relative(SRC, file).split(/[\\/]/).join('/')));
}

test('eager entry: the authored guide payloads are not in the first paint', () => {
  const graph = eagerGraph();
  const leaked = Object.entries(MUST_STAY_LAZY)
    .filter(([module]) => graph.has(module))
    .map(([module, why]) => `${module} — ${why}`);

  assert.deepEqual(
    leaked,
    [],
    'these are statically reachable from src/main.js, so they ship in the entry chunk ' +
      'that every first-time visitor downloads before anything renders:\n' +
      `${leaked.join('\n')}\n\n` +
      'Import only what is needed (an id list rather than the payload), or reach the ' +
      'module through a dynamic import() so it becomes its own chunk.'
  );
});

test('eager entry: the walker actually reaches the modules it is policing', () => {
  // A graph walk that silently found nothing would pass the test above forever.
  // These are known to be eager, and if they stop being so this test is the one
  // that should be updated — deliberately — rather than the guard above rotting.
  const graph = eagerGraph();
  assert.ok(graph.has('main.js'), 'the entry itself');
  assert.ok(graph.has('app/releaseGate.js'), 'main.js imports the release gate eagerly');
  assert.ok(graph.has('catalog/release.js'), 'and the gate reaches the release rules');
  assert.ok(graph.has('data/patientGuideIndex.js'), 'which reads the guide index');
  assert.ok(graph.size > 10, `the walk found only ${graph.size} modules, which cannot be right`);
});
