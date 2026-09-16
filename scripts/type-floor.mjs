#!/usr/bin/env node
/**
 * Every declared `font-size` below the product's 12px floor, as a list that is
 * only allowed to get shorter.
 *
 * ## Why a baseline and not a rule
 *
 * The floor already existed. It was held by `tests/scene-navigation-hierarchy.js`
 * against two named stylesheets, and `src/styles/` has 33 — so every sheet
 * written after that test, and every sheet it never named, has been outside it.
 * Turning it into "walk them all" fails on 213 selectors across 21 sheets,
 * which is not a test repair but a typographic decision about the whole
 * product, taken one surface at a time.
 *
 * So this records what is below the floor today and refuses to let the list
 * grow. New small type is rejected at the pull request that adds it; existing
 * small type is worked down deliberately, and each reduction shortens
 * `tests/type-floor-baseline.json`.
 *
 * The list is a record of where the product is, not a list of things that have
 * been approved: nobody has reviewed these 213 one at a time, so a name like
 * "exceptions" would claim a review that has not happened. It is a baseline in
 * the ordinary sense — the line you measure the next change against.
 *
 * ## What it measures
 *
 * The last `font-size` in a rule body, per selector, with comments stripped —
 * the cascade at equal specificity, and a comment above a rule is not part of
 * its selector. `clamp()`, `em` and `rem` are not read: this is about the
 * literal pixel values somebody typed.
 *
 *   npm run type-floor            print what changed against the baseline
 *   npm run type-floor -- --write rewrite the baseline (only to shrink it)
 *   npm run type-floor -- --write --seed   create it for the first time
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { declaration, rulesOf } from './lib/css.mjs';

/** Below this, in px, a declaration is counted. */
export const TYPE_FLOOR_PX = 12;

const STYLES_DIR = fileURLToPath(new URL('../src/styles/', import.meta.url));
const BASELINE = fileURLToPath(new URL('../tests/type-floor-baseline.json', import.meta.url));

/** @returns {Record<string, Record<string, number>>} sheet -> selector -> px */
export function measureTypeFloor(dir = STYLES_DIR) {
  const found = {};
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.css')).sort()) {
    const css = readFileSync(`${dir}${name}`, 'utf8');
    for (const { selectors, body } of rulesOf(css)) {
      // The last declaration wins inside one body too — reading the first
      // reports a size the browser never uses.
      const size = declaration(body, 'font-size');
      if (size === null || !/^[0-9.]+px$/.test(size)) continue;
      const px = Number.parseFloat(size);
      if (px >= TYPE_FLOOR_PX) continue;
      found[name] ??= {};
      // A selector declared twice in one sheet keeps the smallest it reaches,
      // so shrinking one of its rules cannot hide behind the other.
      found[name][selectors] = Math.min(found[name][selectors] ?? px, px);
    }
  }
  return found;
}

export const readBaseline = () => JSON.parse(readFileSync(BASELINE, 'utf8'));

/**
 * What is wrong, as readable lines. Empty means the baseline is exact.
 *
 * Three ways to be wrong, and the third is the one that makes this a ratchet:
 * a selector that has climbed back above the floor must be *removed* from the
 * baseline, or the list would never get shorter on its own.
 */
export function typeFloorProblems(found = measureTypeFloor(), baseline = readBaseline()) {
  const problems = [];
  const sheets = new Set([...Object.keys(found), ...Object.keys(baseline.below)]);

  for (const sheet of [...sheets].sort()) {
    const now = found[sheet] ?? {};
    const then = baseline.below[sheet] ?? {};
    for (const selector of new Set([...Object.keys(now), ...Object.keys(then)])) {
      const nowPx = now[selector];
      const thenPx = then[selector];
      if (nowPx !== undefined && thenPx === undefined) {
        problems.push(`${sheet} — "${selector}" is ${nowPx}px, below the ${TYPE_FLOOR_PX}px floor, and is not in the baseline`);
      } else if (nowPx !== undefined && nowPx < thenPx) {
        problems.push(`${sheet} — "${selector}" went from ${thenPx}px down to ${nowPx}px`);
      } else if (nowPx === undefined) {
        problems.push(`${sheet} — "${selector}" is at or above the floor now; delete its baseline entry (npm run type-floor -- --write)`);
      }
    }
  }
  return problems;
}

/** Total declarations below the floor, for a number worth watching. */
export const countBelow = (below) =>
  Object.values(below).reduce((sum, rules) => sum + Object.keys(rules).length, 0);

if (import.meta.url === `file://${process.argv[1]}`) {
  const found = measureTypeFloor();
  if (process.argv.includes('--write')) {
    const baseline = readBaseline();
    const was = countBelow(baseline.below);
    const now = countBelow(found);
    // `--seed` exists for exactly one commit: the one that creates the file.
    // Without it the ratchet refuses its own first write, which is correct —
    // growing this list is the thing it is for.
    if (now > was && !process.argv.includes('--seed')) {
      console.error(`Refusing to write: that would take the baseline from ${was} to ${now}.`);
      console.error('This list only shrinks. Raise the new declaration to 12px instead,');
      console.error('or pass --seed if you are creating the baseline for the first time.');
      process.exit(1);
    }
    writeFileSync(BASELINE, `${JSON.stringify({ floorPx: TYPE_FLOOR_PX, below: found }, null, 2)}\n`);
    console.log(`Baseline rewritten: ${was} -> ${now} declarations below ${TYPE_FLOOR_PX}px.`);
    process.exit(0);
  }
  const problems = typeFloorProblems(found);
  console.log(`Type floor — ${countBelow(found)} declaration(s) below ${TYPE_FLOOR_PX}px in src/styles/`);
  if (problems.length === 0) {
    console.log('  ok    the baseline is exact; nothing new is below the floor');
    process.exit(0);
  }
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
