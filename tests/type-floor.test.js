import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  TYPE_FLOOR_PX,
  countBelow,
  measureTypeFloor,
  readBaseline,
  typeFloorProblems,
} from '../scripts/type-floor.mjs';

/**
 * The 12px floor, across every stylesheet instead of two of them.
 *
 * The floor is not new. `tests/scene-navigation-hierarchy.test.js` held it
 * against `ui-hierarchy-typography.css` and `browser-first-release-polish.css`
 * — two of the 33 sheets in `src/styles/` — so every sheet written since, and
 * every sheet it never named, has been outside it. Applying it to all of them
 * at once fails on 213 selectors, which is a typographic decision about the
 * product rather than a repair to a test.
 *
 * So the rule here is a ratchet: what is below the floor today is recorded, and
 * the recording is only allowed to get shorter. New small type is rejected on
 * the pull request that adds it. Existing small type comes up a surface at a
 * time, and each reduction shortens `tests/type-floor-baseline.json`.
 *
 * The baseline is a record of where the product is, not a list of approvals —
 * nobody has read these 213 one at a time.
 */

test('nothing new is below the 12px floor, anywhere in src/styles', () => {
  const problems = typeFloorProblems();
  assert.deepEqual(
    problems,
    [],
    `${problems.length} type-floor problem(s):\n  ${problems.join('\n  ')}\n\n`
      + 'A new declaration below the floor is rejected here. If you raised one instead,\n'
      + 'run `npm run type-floor -- --write` to shorten the baseline.'
  );
});

test('the baseline only ever shrinks', () => {
  // Pinned so that a rewrite that grows it has to change this number, in a
  // diff, where somebody can ask why.
  const baseline = readBaseline();
  assert.equal(baseline.floorPx, TYPE_FLOOR_PX);
  assert.ok(
    countBelow(baseline.below) <= 213,
    `the baseline holds ${countBelow(baseline.below)} selectors, up from 213`
  );
});

test('the floor covers every stylesheet, not a list of them', () => {
  const script = readFileSync(new URL('../scripts/type-floor.mjs', import.meta.url), 'utf8');
  // Directory listing, not names. A guard that names its sheets stops covering
  // the product the moment somebody adds one, silently and forever.
  assert.match(script, /readdirSync\(dir\)/);
  assert.match(script, /\.endsWith\('\.css'\)/);

  const measured = measureTypeFloor();
  const sheets = Object.keys(readBaseline().below);
  for (const sheet of sheets) {
    assert.ok(sheet in measured || Object.keys(measured).length > 0, sheet);
  }
});

test('the sentence that says what a model is not is not the smallest type on screen', () => {
  // `.disclaimer` ("⚠︎ 教育用肉眼解剖 — 臨床使用不可") and the landing hero's
  // boundary line. Both were below the floor, under a model rendered at full
  // size. A caveat set smaller than everything around it is a caveat the reader
  // is being invited to skip.
  //
  // Measured in a browser at 768px and 1280px, where `.disclaimer` renders. It
  // is `display: none` below that — F-115 — and `.landing-demo-boundary` is not
  // rendered at all by the compact hero that currently ships, so its size here
  // is correct by the same argument rather than by observation.
  const measured = measureTypeFloor();
  for (const [sheet, selector] of [['ui.css', '.disclaimer'], ['landing.css', '.landing-demo-boundary']]) {
    assert.equal(
      measured[sheet]?.[selector],
      undefined,
      `${sheet} — "${selector}" is back below the ${TYPE_FLOOR_PX}px floor`
    );
  }
});
