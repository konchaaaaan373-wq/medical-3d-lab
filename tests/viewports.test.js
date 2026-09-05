import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  INLINE_LINK_EXEMPTION,
  MEASURED_TARGET,
  OVERFLOW_TOLERANCE_PX,
  PROMISED_PHONE_WIDTHS,
  SURFACES,
  TARGET_EXEMPTIONS,
  TRANSIENT_OVERLAYS,
  VIEWPORTS,
  deviceClassOf,
  isPhoneWidth,
  validateViewportMatrix,
} from '../src/app/viewports.js';
import { DEVICE_CLASS_IDS, PHONE_MAX_WIDTH } from '../src/app/performanceBudget.js';
import { TOUCH_TARGET } from '../src/styles/palette.js';
import { namesScene, resolveRoute } from '../src/app/router.js';
import { RESERVED_ROUTE_SLUGS } from '../src/catalog/index.js';

// --- the matrix itself -----------------------------------------------------

test('matrix: the declared viewports and surfaces are internally consistent', () => {
  const problems = validateViewportMatrix();
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('matrix: it covers the widths the roadmap actually promised', () => {
  const widths = VIEWPORTS.map((viewport) => viewport.width);
  for (const width of PROMISED_PHONE_WIDTHS) {
    assert.ok(widths.includes(width), `no viewport is ${width}px wide`);
  }
  // Both ends of the promised band must lay out as phones, or the band means
  // something different from what the roadmap says it means.
  for (const width of PROMISED_PHONE_WIDTHS) {
    assert.ok(isPhoneWidth(width), `${width}px is not a phone width`);
  }
  assert.equal(isPhoneWidth(PHONE_MAX_WIDTH), true);
  assert.equal(isPhoneWidth(PHONE_MAX_WIDTH + 1), false);
});

test('matrix: landscape is a real landscape, not a second portrait phone', () => {
  const landscape = VIEWPORTS.filter((viewport) => viewport.short);
  assert.ok(landscape.length > 0);
  for (const viewport of landscape) {
    assert.ok(
      viewport.height < viewport.width,
      `"${viewport.id}" is marked short but is taller than it is wide`,
    );
    // A phone on its side is short, and 430px is the tallest such phone. A
    // "short" viewport taller than that is a small desktop window, which is a
    // different bug family.
    assert.ok(viewport.height <= 430, `"${viewport.id}" is not as short as a phone in landscape`);
  }
});

test('matrix: every device class the renderer budgets for is exercised', () => {
  const covered = new Set(VIEWPORTS.map(deviceClassOf));
  for (const id of DEVICE_CLASS_IDS) {
    assert.ok(covered.has(id), `no viewport lands in the "${id}" class`);
  }
  // And the classification is the renderer's, not a second opinion.
  assert.equal(deviceClassOf({ width: 320 }), 'phone');
  assert.equal(deviceClassOf({ width: PHONE_MAX_WIDTH + 1 }), 'tablet');
  assert.equal(deviceClassOf({ width: 1280 }), 'desktop');
});

test('matrix: reflow is judged at the narrowest width, where it fails', () => {
  const reflow = VIEWPORTS.filter((viewport) => viewport.reflow);
  assert.ok(reflow.length > 0);
  const narrowest = Math.min(...VIEWPORTS.map((viewport) => viewport.width));
  for (const viewport of reflow) {
    assert.equal(viewport.width, narrowest, `reflow is checked at ${viewport.width}px, not ${narrowest}px`);
  }
  // WCAG 1.4.10 is stated at 320 CSS pixels; a matrix that drifted off it
  // would still "pass" while checking something the standard does not ask for.
  assert.equal(narrowest, 320);
});

// --- the surfaces ----------------------------------------------------------

test('surfaces: every checked route is a route this product actually has', () => {
  for (const surface of SURFACES) {
    const route = resolveRoute(surface.route);
    if (surface.needsRenderer) {
      // A scene route must name a scene. `resolveRoute` falls back to the
      // historic default scene for anything unknown, so `kind` alone would
      // pass for a typo.
      assert.equal(route.kind, 'scene', `"${surface.route}" is not a scene route`);
      assert.ok(namesScene(surface.route), `"${surface.route}" names no scene in the catalogue`);
    } else {
      assert.notEqual(route.kind, 'scene', `"${surface.route}" fell through to a scene`);
    }
  }
});

test('surfaces: the shell routes checked here are the shell routes the catalogue reserves', () => {
  const checked = SURFACES.filter((surface) => !surface.needsRenderer).map((surface) =>
    surface.route.replace(/^#\/?/, ''),
  );
  for (const slug of checked) {
    if (slug === '') continue; // the landing page has no slug to reserve
    assert.ok(
      RESERVED_ROUTE_SLUGS.includes(slug),
      `"${slug}" is checked as a shell route but is not reserved, so a scene could claim it`,
    );
  }
  // Landing, Explorer and Trust are the three the roadmap names by name.
  for (const route of ['#/', '#/organs', '#/trust']) {
    assert.ok(SURFACES.some((surface) => surface.route === route), `${route} is not checked`);
  }
});

// --- the thresholds --------------------------------------------------------

test('thresholds: the enforced floor is the standard, not a preference', () => {
  // The number that fails a build is WCAG 2.5.8 at level AA, and it is the
  // same number `palette.js` already calls the absolute minimum. If those two
  // ever disagree, one of them is lying about what the product promises.
  assert.equal(MEASURED_TARGET.floor, 24);
  assert.equal(MEASURED_TARGET.floor, TOUCH_TARGET.absoluteMinimum);
});

test('thresholds: the reported intent is the product\'s own, and is stricter', () => {
  // `palette.js` declares what the stylesheet must ask for; this is what the
  // browser is measured against. Measuring above the declaration would fail
  // correct CSS, and there would be no way to satisfy both.
  assert.equal(MEASURED_TARGET.intent.reading, TOUCH_TARGET.primary);
  assert.equal(MEASURED_TARGET.intent.scene, TOUCH_TARGET.dense);
  // In-scene chrome is denser than a reading surface, and both sit above the
  // floor — an "intent" at or below the obligation would report nothing.
  assert.ok(MEASURED_TARGET.intent.scene < MEASURED_TARGET.intent.reading);
  assert.ok(MEASURED_TARGET.intent.scene > MEASURED_TARGET.floor);
});

test('thresholds: overflow tolerance is sub-pixel rounding, not a budget for overflow', () => {
  assert.ok(OVERFLOW_TOLERANCE_PX > 0, 'zero tolerance fails on correct layouts');
  assert.ok(OVERFLOW_TOLERANCE_PX <= 1, 'anything above a pixel hides real horizontal scroll');
});

test('thresholds: every target-size exemption is justified in writing', () => {
  assert.ok(TARGET_EXEMPTIONS.length > 0);
  for (const exemption of [...TARGET_EXEMPTIONS, INLINE_LINK_EXEMPTION]) {
    assert.ok(
      exemption.selector || exemption.id,
      'an exemption that names nothing exempts everything',
    );
    assert.ok(
      typeof exemption.why === 'string' && exemption.why.length > 20,
      `"${exemption.selector ?? exemption.id}" is exempt without saying why`,
    );
  }
  // The one exemption the standard itself grants must cite it, because it is
  // the one a reader is most entitled to challenge.
  assert.match(INLINE_LINK_EXEMPTION.why, /2\.5\.8/);
});

test('overlays: an ancestor is not something painted over a control', () => {
  // Not a data assertion — a note about the rule the browser-side check
  // applies, kept here because it is the one part of it a reader is most
  // likely to get wrong. `elementFromPoint` returns an *ancestor* when a
  // control has been clipped out of view by that ancestor's own `overflow`,
  // which several panels in this product have. Treating that as occlusion
  // fails a scrolling region behaving exactly as designed.
  const source = readFileSync(new URL('../scripts/check-viewports.mjs', import.meta.url), 'utf8');
  assert.match(source, /hit\.contains\(element\)/, 'the ancestor case is no longer excluded');
});

test('overlays: the two things allowed to cover the page say why, and where they stop', () => {
  assert.equal(TRANSIENT_OVERLAYS.length, 2, 'a third overlay needs a reason of its own');
  for (const overlay of TRANSIENT_OVERLAYS) {
    assert.ok(overlay.selector.startsWith('.'), `"${overlay.selector}" is not a class`);
    assert.ok(
      typeof overlay.why === 'string' && overlay.why.length > 30,
      `"${overlay.selector}" may cover controls without saying why`,
    );
    assert.ok(Array.isArray(overlay.mustNotCover));
  }
  // The rule that matters: whatever else a one-time notice covers, it may not
  // cover the console. That is the defect this list was written for.
  const consent = TRANSIENT_OVERLAYS.find((overlay) => overlay.selector === '.consent-banner');
  assert.ok(consent, 'the consent banner is no longer declared as a transient');
  assert.ok(consent.mustNotCover.includes('.console'));
});

// --- the validator ---------------------------------------------------------

const only = (viewport) => [viewport];

test('validator: it catches a matrix that has stopped keeping the promise', () => {
  const complain = (viewports, surfaces = SURFACES) =>
    validateViewportMatrix(viewports, surfaces).join('\n');

  // Drop 320 and the reflow width goes with it.
  const without320 = VIEWPORTS.filter((viewport) => viewport.width !== 320);
  assert.match(complain(without320), /320px/);

  // Drop landscape and short-viewport bugs stop being checked.
  const noLandscape = VIEWPORTS.filter((viewport) => !viewport.short);
  assert.match(complain(noLandscape), /landscape/);

  // Phones only: the renderer still budgets three classes.
  const phonesOnly = VIEWPORTS.filter((viewport) => deviceClassOf(viewport) === 'phone');
  assert.match(complain(phonesOnly), /desktop/);

  assert.match(complain([...VIEWPORTS, VIEWPORTS[0]]), /duplicate id/);
  assert.match(complain(only({ id: 'x', label: 'x', width: 280, height: 600 })), /narrower than/);
  assert.match(complain(only({ id: 'x', label: 'x', width: 0, height: 0 })), /not a size/);
  assert.match(complain(only({ id: 'x', width: 320, height: 600, reflow: true })), /no label/);
});

test('validator: it catches a surface list that has stopped checking a surface', () => {
  const complain = (surfaces) => validateViewportMatrix(VIEWPORTS, surfaces).join('\n');

  assert.match(complain([{ id: 'a', route: '/organs', label: 'A', needsRenderer: true }]), /not a route/);
  assert.match(complain([{ id: 'a', route: '#/organs', needsRenderer: true }]), /no label/);
  assert.match(
    complain([
      { id: 'a', route: '#/organs', label: 'A', needsRenderer: true },
      { id: 'b', route: '#/organs', label: 'B' },
    ]),
    /duplicate route/,
  );
  // Documents only: a scene's overlay chrome has the same obligations, and
  // dropping it is how in-scene layout regressions get through.
  const documentsOnly = SURFACES.filter((surface) => !surface.needsRenderer);
  assert.match(complain(documentsOnly), /no surface exercises a scene/);
});

test('validator: an overlay list that forbids nothing is caught', () => {
  const complain = (overlays) => validateViewportMatrix(VIEWPORTS, SURFACES, overlays).join('\n');

  // The failure mode here is not a missing rule but a rule emptied out: an
  // exemption list that grew until nothing is forbidden still reads as a check
  // and measures nothing.
  const permissive = TRANSIENT_OVERLAYS.map((overlay) => ({ ...overlay, mustNotCover: [] }));
  assert.match(complain(permissive), /allowed to cover everything/);

  assert.match(complain([{ selector: 'div', why: 'x'.repeat(40), mustNotCover: ['.console'] }]), /not a class/);
  assert.match(complain([{ selector: '.x', why: 'too short', mustNotCover: ['.console'] }]), /does not say why/);
  assert.match(complain([{ selector: '.x', why: 'y'.repeat(40) }]), /declares no limit/);
});

test('the viewport check can drive more than one engine, and CI drives them all', () => {
  const check = readFileSync(new URL('../scripts/check-viewports.mjs', import.meta.url), 'utf8');

  // Chromium switches are Chromium's. Firefox rejects unknown arguments and
  // WebKit ignores them, so they must not be passed to either.
  assert.match(check, /const ENGINES = \['chromium', 'firefox', 'webkit'\]/);
  assert.match(check, /engineName === 'chromium'\s*\?\s*\{ executablePath/);

  // The network seal has to hold on every engine: `--host-resolver-rules` is a
  // Chromium flag, so the route is what isolates Firefox and WebKit.
  const route = check.slice(check.indexOf('await page.route('), check.indexOf('for (const surface of surfaces)'));
  assert.match(route, /url\.hostname !== '127\.0\.0\.1'/, 'anything off the local server is aborted');

  // An engine whose binary was never downloaded must say so, not throw
  // Playwright's stack at the reader.
  assert.match(check, /npx playwright install --with-deps \$\{engineName\}/);

  const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  for (const engine of ['chromium', 'firefox', 'webkit']) {
    assert.ok(ci.includes(engine), `CI installs and runs ${engine}`);
  }
  // One engine failing is a finding about that engine, not a reason to stop
  // measuring the others.
  assert.match(ci, /fail-fast: false/);
  // Each engine's report is its own artifact, or they overwrite each other.
  assert.match(ci, /name: viewport-report-\$\{\{ matrix\.engine \}\}/);
});
