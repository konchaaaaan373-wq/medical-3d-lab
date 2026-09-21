import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  INLINE_LINK_EXEMPTION,
  MEASURED_TARGET,
  OVERFLOW_TOLERANCE_PX,
  PHONE_TARGET,
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
import { RESERVED_ROUTE_SLUGS, sceneById } from '../src/catalog/index.js';
import { isRouteReleased, isSceneReleased } from '../src/catalog/release.js';

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
    } else if (!surface.locked) {
      assert.notEqual(route.kind, 'scene', `"${surface.route}" fell through to a scene`);
    }
  }
});

test('surfaces: the locked flag is the release, not a flag somebody remembered', () => {
  // The run reports what each surface is. A route the release holds back
  // renders the "to be updated" page whatever its name says, so a surface
  // marked Lab that is really that page measures one thing and reports
  // another — which is the defect this matrix already fixed once, for the
  // surface that was supposed to build a renderer.
  for (const surface of SURFACES) {
    const open = isRouteReleased(resolveRoute(surface.route));
    assert.equal(
      Boolean(surface.locked),
      !open,
      `"${surface.route}" is ${open ? 'open' : 'locked'} and is marked ${surface.locked ? 'locked' : 'open'}`
    );
    if (surface.locked) {
      assert.ok(!surface.needsRenderer, `"${surface.route}" is locked, so nothing builds a renderer on it`);
    }
  }
  assert.ok(SURFACES.some((surface) => surface.locked), 'the beta has locked routes; one of them is checked');
});

test('surfaces: the scene measured with a renderer is one the release actually opens', () => {
  const scene = SURFACES.find((surface) => surface.needsRenderer);
  assert.ok(scene, 'one surface has to build a real scene');
  assert.equal(
    isSceneReleased(sceneById(resolveRoute(scene.route).sceneId)),
    true,
    'a locked route renders a reading page, so this run would measure the wrong thing'
  );
});

test('surfaces: the shell routes checked here are the shell routes the catalogue reserves', () => {
  const checked = SURFACES.filter((surface) => !surface.needsRenderer && !surface.locked).map(
    (surface) => surface.route.replace(/^#\/?/, ''),
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

test('thresholds: the phone floor is the palette\'s primary target, not a second 44', () => {
  // Two copies of a number are two chances to disagree about it. The device
  // pass asked for 44 on a phone; `TOUCH_TARGET.primary` is where this product
  // already says what 44 means.
  assert.equal(PHONE_TARGET.floor, TOUCH_TARGET.primary);
  // Above the floor every width has to clear, or it would say nothing.
  assert.ok(PHONE_TARGET.floor > MEASURED_TARGET.floor);
  assert.ok(PHONE_TARGET.floor > MEASURED_TARGET.intent.scene);
});

test('thresholds: what a phone is agrees with the stylesheet that lays one out', () => {
  // `product-shell-b6.css` writes the one-column phone layout at this width and
  // `App.js` widens the camera framing at it. A check that measured a different
  // width would be measuring a layout that is not the phone's.
  const css = readFileSync(new URL('../src/styles/product-shell-b6.css', import.meta.url), 'utf8');
  assert.ok(
    css.includes(`max-width: ${PHONE_TARGET.maxWidth}px`),
    'the phone block in product-shell-b6.css no longer starts at PHONE_TARGET.maxWidth',
  );
  const floor = readFileSync(new URL('../src/styles/phone-touch-targets.css', import.meta.url), 'utf8');
  assert.ok(
    floor.includes(`max-width: ${PHONE_TARGET.maxWidth}px`),
    'the touch-target floor applies at a different width from the phone layout',
  );
  assert.ok(
    floor.includes(`min-height: ${PHONE_TARGET.floor}px`),
    'the touch-target floor stylesheet no longer writes PHONE_TARGET.floor',
  );
});

test('thresholds: every phone-target exemption is justified in writing', () => {
  for (const exemption of PHONE_TARGET.exemptions) {
    assert.ok(exemption.selector, 'an exemption that names nothing exempts everything');
    assert.ok(
      typeof exemption.why === 'string' && exemption.why.length > 20,
      `"${exemption.selector}" is exempt from the phone floor without saying why`,
    );
  }
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

test('the viewport check supports every engine and the explicit final workflow drives them all', () => {
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
  const final = readFileSync(
    new URL('../.github/workflows/final-browser-validation.yml', import.meta.url),
    'utf8',
  );
  // What the workflow *runs*, with its comments off: a comment naming an engine
  // is not a step starting one, and the comment above this job names the two
  // that stay out.
  const ciSteps = ci.replace(/#.*$/gm, '');

  // Until 2026-09-15 this read "ordinary PR pushes do not start full browsers"
  // and was held by `assert.doesNotMatch(ci, /playwright install/)`. The reason
  // was Actions minutes on a private repository (F-100), not a view about
  // browsers, and the repository is public now. The line moved rather than
  // disappearing: **one engine, one check, on every pull request.**
  assert.match(ciSteps, /playwright install --with-deps chromium/, 'PR CI drives Chromium');

  // Named anywhere in those steps, not just straight after `--with-deps`: the
  // first version anchored on that and let `--with-deps chromium firefox
  // webkit` through untouched.
  assert.doesNotMatch(
    ciSteps,
    /firefox|webkit/i,
    'the other two engines stay at candidate time — three engines per push is a different decision'
  );
  assert.match(ciSteps, /npm run verify:ui/, 'and it is the viewport matrix that runs');
  for (const other of ['verify:auth', 'verify:anatomy', 'verify:patient']) {
    assert.doesNotMatch(
      ciSteps,
      new RegExp(`npm run ${other}`),
      `${other} stays at candidate time; F-112 holds what would move it`
    );
  }

  // F-173 is one narrow export regression on the browser/preview build already
  // installed above. The full disease matrix still belongs to candidate time.
  const diseaseSteps = ciSteps.split('\n').filter((line) => /run: npm run verify:disease/.test(line));
  assert.equal(diseaseSteps.length, 1);
  assert.match(diseaseSteps[0], /--dist dist-preview --dpr 2 disease-video-dpr2 copd$/);

  // The fast job stays fast. A failing unit test has to be reportable without
  // waiting for a browser to download, which is why this is a second job and
  // not four more minutes appended to the first.
  const fastJob = ciSteps.slice(ciSteps.indexOf('  test-and-build:'), ciSteps.indexOf('  verify-ui:'));
  assert.doesNotMatch(fastJob, /playwright/, 'test-and-build does not install a browser');
  assert.match(ci, /\n  verify-ui:/, 'the browser check is its own job');

  assert.match(final, /workflow_dispatch:/, 'the full matrix requires an explicit candidate run');
  for (const engine of ['chromium', 'firefox', 'webkit']) {
    assert.ok(final.includes(engine), `the final workflow installs and runs ${engine}`);
  }
  // One engine failing is a finding about that engine, not a reason to stop
  // measuring the others.
  assert.match(final, /fail-fast: false/);
  // Each engine's report is its own artifact, or they overwrite each other.
  assert.match(final, /name: viewport-report-\$\{\{ matrix\.engine \}\}/);
});

test('an engine that does not tab to links is told apart from a page that lost one', () => {
  const check = readFileSync(new URL('../scripts/check-viewports.mjs', import.meta.url), 'utf8');

  // Safari does not move focus to a link on Tab unless full keyboard access is
  // on. Counted together with the buttons, that convention would bury every
  // real finding on a WebKit run under a list of every link on the surface.
  assert.match(check, /const unreachableLinks = \[\]/);
  assert.match(check, /engineSkipsLinks: linksPresent > 0 && linksReached === 0 && controlsReached > 0/);

  // The distinction has to be earned: Tab must have reached other controls, or
  // "no link was focused" is just as likely to be a broken focus ring.
  assert.match(check, /if \(measured\.engineSkipsLinks\)/);
  assert.match(check, /link focus not measured/);

  // And it is a note, not a silence — the run says which coverage it lacked.
  assert.match(check, /Tabbing to links: \$\{engine\} does not, so this run could not measure it\./);

  // Where the engine does tab to links, an unreachable one still fails.
  const at = check.indexOf('if (tabWalkTrustworthy && measured.unreachableLinks.length)');
  assert.ok(at > 0, 'the unreachable-links branch was renamed; this test no longer reads it');
  assert.match(check.slice(at, at + 900), /visible link\(s\) the Tab key never reached/);
});

test('the Tab walk: running out of budget is not a focus trap', () => {
  const check = readFileSync(new URL('../scripts/check-viewports.mjs', import.meta.url), 'utf8');

  // The bug this pins: the budget was `controls + 8` clamped to 240, and
  // hitting the clamp set `stuck`, which was reported as "focus is trapped or
  // looping". Any page with more than 232 focusable controls therefore failed
  // for being large. The Trust page has 295 — one link per citation — so it
  // failed on two viewports, and took 46 links and the feedback button with it
  // as "never reached", which they were not: the walk stopped 63 steps early.
  assert.doesNotMatch(check, /stuck = true/, 'reaching the step cap is not a diagnosis');
  assert.doesNotMatch(
    check,
    /Math\.min\(controls \+ 8, MAX_TAB_STEPS\)/,
    'the budget is no longer one Tab press per control',
  );

  // Three endings, told apart, because two of them are normal and the third is
  // not about the page at all.
  assert.match(check, /ending = 'cut'/);
  assert.match(check, /ending = 'left'/);
  assert.match(check, /ending = 'closed'/);
  assert.match(check, /complete: ending !== 'cut'/);

  // The budget is generous relative to the page: a ring that closes does so on
  // the second visit to its first stop.
  assert.match(check, /const tabBudget = \(controls\) => Math\.min\(controls \* 2 \+ 8, MAX_TAB_STEPS\)/);
  const cap = check.match(/const MAX_TAB_STEPS = (\d+);/);
  assert.ok(cap, 'the walk has no ceiling at all');
  // Above twice the largest surface this product has, so the ceiling is the
  // infinite-loop guard it claims to be rather than a threshold in disguise.
  assert.ok(Number(cap[1]) > 295 * 2 + 8, `${cap[1]} is below what the Trust page alone needs`);

  // And a walk that was cut short leaves marks that mean nothing, so the
  // findings built on those marks must not be read.
  assert.match(check, /const tabWalkTrustworthy = fullTabWalk && tab\?\.complete/);
  for (const finding of [
    'if (tabWalkTrustworthy && measured.unreachable.length)',
    'if (tabWalkTrustworthy && measured.unreachableLinks.length)',
  ]) {
    assert.ok(check.includes(finding), `"${finding}" no longer waits for a complete walk`);
  }
});

test('an engine with no WebGL2 is told apart from a renderer that failed', () => {
  const check = readFileSync(new URL('../scripts/check-viewports.mjs', import.meta.url), 'utf8');

  // On a runner with no GPU, Firefox declines the context outright
  // (`AllowWebgl2:false restricts context creation on this system`) and three.js
  // has required WebGL2 since r163 — so every 3D surface drops to the fallback
  // and logs the refusal. Counted as page defects, that is twelve failures per
  // run: two surfaces on every viewport, and a job painted red by the machine
  // it runs on rather than by the product.
  assert.match(check, /const engineHasWebgl2 = await/);
  assert.match(check, /canvas\.getContext\('webgl2'\)/);

  // Asked once, of a blank page, before any surface is measured — or the answer
  // is about a surface rather than about the engine.
  const probe = check.slice(check.indexOf('const engineHasWebgl2'));
  assert.ok(
    check.indexOf('const engineHasWebgl2') < check.indexOf('for (const surface of surfaces)'),
    'the probe runs before the first surface',
  );
  assert.match(probe.slice(0, 900), /browser\.newPage\(\)/);

  // The distinction is earned: only an engine that has already said it has no
  // WebGL2 gets its renderer errors excused.
  assert.match(check, /if \(!engineHasWebgl2 && RENDERER_CONSOLE\.some/);

  // And it is a note, not a silence — the errors are shown, and the run says
  // which coverage it lacked.
  assert.match(check, /error\(s\) not counted/);
  assert.match(
    check,
    /Anything drawn by the renderer: \$\{engine\} makes no WebGL2 context on this machine\./,
  );

  // The surface is the question, not the wording. The product's own handlers
  // log the failure too — `landingCirculationDemo`'s catch and the scene
  // bootstrap's — and Chromium renders those as the message three.js gave them
  // while Firefox renders the same Error object as the bare word `Error`. A
  // pattern loose enough to catch `Error` catches everything, so what is asked
  // is whether *this surface* hit the refusal.
  assert.match(check, /const rendererDown = \(\) =>/);
  assert.match(check, /!engineHasWebgl2 && rendererConsole\.length > 0/);
  assert.match(check, /const downstream = \[\.\.\.rendererConsole, \.\.\.console_\]/);

  // Where the engine does have WebGL2, a renderer error is still the page's.
  const branch = check.slice(check.indexOf('} else if (console_.length)'));
  assert.match(branch.slice(0, 400), /console error\(s\)/);
  assert.ok(
    check.includes('} else if (console_.length)'),
    'the failure branch is the else of the excuse, so one cannot swallow the other',
  );
});

test('Firefox is asked for a software context before it is excused', () => {
  const check = readFileSync(new URL('../scripts/check-viewports.mjs', import.meta.url), 'utf8');

  // Excusing the engine is the fallback, not the first move: a runner that will
  // give Firefox a software WebGL2 context should be measuring the 3D surfaces,
  // not noting that it could not.
  assert.match(check, /const FIREFOX_PREFS = \{/);
  for (const pref of ['webgl.force-enabled', 'webgl.forbid-software']) {
    assert.ok(check.includes(pref), `it asks for ${pref}`);
  }
  // Firefox prefs are Firefox's, the same way the Chromium switches are.
  assert.match(check, /engineName === 'firefox' \? \{ firefoxUserPrefs: FIREFOX_PREFS \} : \{\}/);
});
