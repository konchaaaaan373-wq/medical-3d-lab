#!/usr/bin/env node
/**
 * Re-records `tests/fixtures/cardiac-mechanics.json`.
 *
 *   node scripts/record-cardiac-fixture.mjs --check   # what would change
 *   node scripts/record-cardiac-fixture.mjs --write   # write it
 *
 * The fixture pins every figure the heart-failure circulation produces, at
 * each authored stage under each loading. It exists so that a change to the
 * shared solver cannot move a number quietly — and it had no generator, which
 * meant the only way to accept a deliberate change was to edit 30 rows of JSON
 * by hand. That is how a fixture stops being a record and becomes a wish.
 *
 * `--check` prints the moves and exits 1 if there are any, so the intent of a
 * change can be read before it is accepted. Accepting is a separate command,
 * on purpose.
 *
 * The cases here are the ones `tests/cardiac-mechanics.test.js` asserts the
 * coverage of; that test fails if this file starts recording fewer.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { STAGES } from '../src/data/heartFailure.js';
import {
  sampleHemodynamics,
  circulationParameters,
  resetCirculationCache,
} from '../src/scenes/cardiovascular/scenes/heartFailure/hemodynamics.js';
import { cavityVolumeAt, solveSteadyState } from '../src/models/cardiacMechanics.js';

const FIXTURE_PATH = new URL('../tests/fixtures/cardiac-mechanics.json', import.meta.url);

/** The same five, in the same order as the test. Changing one changes both. */
const LOADINGS = {
  default: { preload: 1, afterload: 1 },
  preloadMin: { preload: 0.85, afterload: 1 },
  preloadMax: { preload: 1.15, afterload: 1 },
  afterloadMin: { preload: 1, afterload: 0.7 },
  afterloadMax: { preload: 1, afterload: 1.4 },
};
const PHASES = [0, 0.25, 0.5, 0.75, 0.999];

const previous = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));

/**
 * Every progress the fixture already covers, plus every authored stage, plus
 * both ends.
 *
 * The union, not the stages alone: the committed fixture carries 0.5, which is
 * not a stage boundary and is there because somebody wanted a point between
 * two of them. Deriving the list from the stages dropped it, and a recorder
 * that silently narrows its own coverage is worse than no recorder.
 */
const progressions = [
  ...new Set([0, 1, ...STAGES.map((stage) => stage.at), ...previous.map((row) => row.progress)]),
].sort((a, b) => a - b);

const recorded = [];
for (const loading of Object.keys(LOADINGS)) {
  for (const progress of progressions) {
    resetCirculationCache();
    const state = sampleHemodynamics(progress, LOADINGS[loading]);
    const solution = solveSteadyState(circulationParameters(progress, LOADINGS[loading]));
    recorded.push({
      loading,
      progress,
      state: Object.fromEntries(
        Object.entries(state).filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
      ),
      beats: solution.beats,
      cavityVolume: PHASES.map((phase) => cavityVolumeAt(phase, state)),
    });
  }
}

const key = (row) => `${row.loading}@${row.progress}`;
const before = new Map(previous.map((row) => [key(row), row]));
const moves = [];
for (const row of recorded) {
  const old = before.get(key(row));
  if (!old) {
    moves.push(`${key(row)}: new case`);
    continue;
  }
  for (const [field, value] of Object.entries(row.state)) {
    const was = old.state?.[field];
    if (typeof was !== 'number') {
      moves.push(`${key(row)}: ${field} was not pinned before`);
      continue;
    }
    if (Math.abs(value - was) > 1e-9 && Math.abs(value - was) > 1e-8 * Math.abs(was)) {
      moves.push(`${key(row)}: ${field} ${was} -> ${value}`);
    }
  }
  if (old.beats !== row.beats) moves.push(`${key(row)}: beats ${old.beats} -> ${row.beats}`);
}
for (const row of previous) {
  if (!recorded.some((entry) => key(entry) === key(row))) moves.push(`${key(row)}: no longer recorded`);
}

const write = process.argv.includes('--write');
console.log(`${recorded.length} case(s) recorded from the current solver`);
if (moves.length === 0) {
  console.log('nothing moved: the committed fixture already matches');
} else {
  console.log(`\n${moves.length} move(s):`);
  for (const move of moves.slice(0, 40)) console.log(`  ${move}`);
  if (moves.length > 40) console.log(`  ... and ${moves.length - 40} more`);
  const fields = new Set(moves.map((move) => move.split(': ')[1]?.split(' ')[0]).filter(Boolean));
  console.log(`\nfields affected: ${[...fields].sort().join(', ')}`);
}

if (write) {
  writeFileSync(FIXTURE_PATH, `${JSON.stringify(recorded, null, 2)}\n`);
  console.log('\nwritten.');
} else if (moves.length > 0) {
  console.log('\nNot written. Re-run with --write once the moves above are the ones you meant.');
  process.exitCode = 1;
}
