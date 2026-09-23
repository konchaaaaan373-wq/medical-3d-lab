#!/usr/bin/env node
/**
 * Re-records `tests/fixtures/cardiac-mechanics.json`.
 *
 *   node scripts/record-cardiac-fixture.mjs --check   # what would change
 *   node scripts/record-cardiac-fixture.mjs --write   # write it
 *
 * `--baseline <path>` compares against a fixture other than the committed one
 * (main's, for "what does this branch move"), `--baseline-name <text>` says in
 * the record what that file was, and `--record [path]` writes the aggregate.
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
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

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

/**
 * Every stored number, not a chosen subset.
 *
 * The first version compared `state`'s numeric fields and `beats`, and left
 * `cavityVolume` out — so a change to the five sampled cavity volumes would
 * have been written while the report said nothing moved. An external reviewer
 * asked for the whole record, including fields that **stopped** being numbers
 * and fields that appeared or vanished, because those are the changes a
 * summary is most likely to lose.
 *
 * @param {object} row
 * @returns {Map<string, number|null>} `null` marks present-but-not-a-number
 */
function flatten(row) {
  const out = new Map();
  for (const [field, value] of Object.entries(row.state ?? {})) {
    out.set(`state.${field}`, typeof value === 'number' && Number.isFinite(value) ? value : null);
  }
  out.set('beats', typeof row.beats === 'number' && Number.isFinite(row.beats) ? row.beats : null);
  (row.cavityVolume ?? []).forEach((value, i) => {
    out.set(`cavityVolume[${i}]`, typeof value === 'number' && Number.isFinite(value) ? value : null);
  });
  return out;
}

const moved = (was, now) =>
  Math.abs(now - was) > 1e-9 && Math.abs(now - was) > 1e-8 * Math.abs(was);

/**
 * @param {object[]} previous
 * @param {object[]} recorded
 */
function compare(previous, recorded) {
  const before = new Map(previous.map((row) => [key(row), row]));
  const after = new Map(recorded.map((row) => [key(row), row]));
  const notes = [];
  /** @type {Map<string, {changed:number, unchanged:number, up:number, down:number, worst:number, at:string|null, from:number, to:number}>} */
  const byField = new Map();

  for (const [id, row] of after) {
    const old = before.get(id);
    if (!old) {
      notes.push(`${id}: new case`);
      continue;
    }
    const oldValues = flatten(old);
    const newValues = flatten(row);
    for (const field of new Set([...oldValues.keys(), ...newValues.keys()])) {
      const was = oldValues.get(field);
      const now = newValues.get(field);
      if (!newValues.has(field)) {
        notes.push(`${id}: ${field} is no longer recorded`);
        continue;
      }
      if (!oldValues.has(field)) {
        notes.push(`${id}: ${field} was not recorded before`);
        continue;
      }
      if (was === null || now === null) {
        if (was !== now) notes.push(`${id}: ${field} ${was === null ? 'was not a finite number' : 'is no longer a finite number'}`);
        continue;
      }
      const stat =
        byField.get(field) ??
        { changed: 0, unchanged: 0, up: 0, down: 0, worst: 0, at: null, from: 0, to: 0 };
      if (moved(was, now)) {
        stat.changed += 1;
        if (now > was) stat.up += 1;
        else stat.down += 1;
        if (Math.abs(now - was) > stat.worst) {
          stat.worst = Math.abs(now - was);
          stat.at = id;
          stat.from = was;
          stat.to = now;
        }
      } else {
        stat.unchanged += 1;
      }
      byField.set(field, stat);
    }
  }
  for (const id of before.keys()) if (!after.has(id)) notes.push(`${id}: no longer recorded`);
  return { byField, notes, cases: after.size };
}

const baselineAt = process.argv.indexOf('--baseline');
const baseline = baselineAt >= 0
  ? JSON.parse(readFileSync(process.argv[baselineAt + 1], 'utf8'))
  : previous;
const write = process.argv.includes('--write');

const { byField, notes, cases } = compare(baseline, recorded);
const changedFields = [...byField.entries()].filter(([, stat]) => stat.changed > 0);

console.log(`${recorded.length} case(s) recorded from the current solver`);
console.log(`compared against ${baseline.length} case(s)${baselineAt >= 0 ? ` from ${process.argv[baselineAt + 1]}` : ' in the committed fixture'}`);
for (const note of notes) console.log(`  ${note}`);

if (changedFields.length === 0 && notes.length === 0) {
  console.log('nothing moved: every stored number is unchanged');
} else {
  console.log(`\n${changedFields.length} field(s) moved, out of ${byField.size} compared across ${cases} case(s):`);
  for (const [field, stat] of changedFields.sort((a, b) => b[1].worst - a[1].worst)) {
    console.log(
      `  ${field}\n` +
        `      changed in ${stat.changed} case(s), unchanged in ${stat.unchanged}; ` +
        `${stat.up} up, ${stat.down} down\n` +
        `      largest |Δ| ${stat.worst.toFixed(6)} at ${stat.at}: ${stat.from} → ${stat.to}`
    );
  }
}

// The aggregate, where a test can read it. The baseline a report should quote
// is a comparison with main, not with whatever the fixture happened to hold
// mid-review — so `--baseline` takes a file, and `--baseline-name` says what
// that file *was*. The first recording wrote the argv path, which was a
// scratch directory outside the repository: a provenance field naming a path
// that does not exist for the reader records nothing.
const recordAt = process.argv.indexOf('--record');
const baselineNameAt = process.argv.indexOf('--baseline-name');
if (recordAt >= 0) {
  const path = process.argv[recordAt + 1] ?? 'docs/model-evidence/cardiac-output-measurements.json';
  const existing = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        ...existing,
        recordedAt: new Date().toISOString().slice(0, 10),
        fixtureImpact: {
          baseline:
            baselineNameAt >= 0
              ? process.argv[baselineNameAt + 1]
              : baselineAt >= 0
                ? process.argv[baselineAt + 1]
                : 'the committed fixture',
          cases,
          fieldsCompared: byField.size,
          fields: Object.fromEntries(
            changedFields.map(([field, stat]) => [
              field,
              {
                changed: stat.changed,
                unchanged: stat.unchanged,
                up: stat.up,
                down: stat.down,
                largestAbsoluteDelta: stat.worst,
                at: stat.at,
                from: stat.from,
                to: stat.to,
              },
            ])
          ),
          notes,
        },
      },
      null,
      2
    )}\n`
  );
  console.log(`\nrecorded to ${path}`);
}

if (write) {
  writeFileSync(FIXTURE_PATH, `${JSON.stringify(recorded, null, 2)}\n`);
  console.log('\nwritten.');
} else if (changedFields.length > 0 || notes.length > 0) {
  console.log('\nNot written. Re-run with --write once the moves above are the ones you meant.');
  process.exitCode = 1;
}
