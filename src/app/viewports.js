/**
 * The viewports the product promises to work at, and the rules it must keep
 * at each of them.
 *
 * Gate 1 asks for "current Safari, Chrome and Firefox plus real iPhone and
 * Android devices, including 320–430 px widths and landscape". A person has to
 * do the browser half — a rendering engine is not something a script can stand
 * in for. What a script *can* do is stop the same layout defect reaching those
 * devices in the first place, and that is what this declares.
 *
 * Declared here rather than inside the checking script for the same reason the
 * frame budget is declared in `performanceBudget.js`: a promise the test
 * suite cannot see is a promise nobody can review. `tests/viewports.test.js`
 * asserts the matrix is internally consistent and agrees with the device
 * classes the renderer already uses; `scripts/check-viewports.mjs` measures a
 * real browser against it.
 *
 * Pure JavaScript — no DOM, no `three`.
 */
import { PHONE_MAX_WIDTH, deviceClassForViewport } from './performanceBudget.js';

/**
 * The sizes that are checked.
 *
 * The three phone widths are the ones the roadmap names, and they are not
 * interchangeable: 320 is the narrowest viewport still in use and the width
 * WCAG 1.4.10 reflow is judged at, 375 is the most common iPhone, and 430 is
 * the largest phone that still lays out as a phone. A layout that works at 375
 * and breaks at 320 is the normal failure, so the narrowest is not optional.
 *
 * Landscape is listed separately rather than derived: a phone in landscape is
 * 932 px wide and 430 px *tall*, and short-viewport bugs — a fixed header and
 * a fixed console leaving no room for the content between them — are a
 * different family from narrow-viewport bugs.
 */
export const VIEWPORTS = [
  { id: 'phone-320', label: 'Narrowest phone', width: 320, height: 568, reflow: true },
  { id: 'phone-375', label: 'Common phone', width: 375, height: 812 },
  { id: 'phone-430', label: 'Large phone', width: 430, height: 932 },
  { id: 'phone-landscape', label: 'Phone, landscape', width: 932, height: 430, short: true },
  { id: 'tablet-768', label: 'Tablet', width: 768, height: 1024 },
  { id: 'desktop-1280', label: 'Desktop', width: 1280, height: 800 },
];

/**
 * The routes checked at every viewport.
 *
 * `needsRenderer` marks the one that builds a WebGL scene. It is checked too —
 * a scene's overlay chrome has the same obligations as a document — but a
 * failure there has to be told apart from the renderer simply being
 * unavailable in a headless browser.
 */
export const SURFACES = [
  { id: 'landing', route: '#/', label: 'Landing' },
  { id: 'explorer', route: '#/organs', label: 'Explorer' },
  { id: 'lab', route: '#/lab', label: 'Lab' },
  { id: 'trust', route: '#/trust', label: 'Trust' },
  { id: 'terms', route: '#/terms', label: 'Terms' },
  { id: 'privacy', route: '#/privacy', label: 'Privacy' },
  { id: 'commerce', route: '#/commerce', label: 'Commercial disclosure' },
  { id: 'support', route: '#/support', label: 'Support' },
  { id: 'scene', route: '#/renal-filtration', label: 'Scene', needsRenderer: true },
];

/**
 * How much horizontal overflow is tolerated, in CSS pixels.
 *
 * One, not zero: sub-pixel layout rounding produces a `scrollWidth` a fraction
 * above `clientWidth` on perfectly correct layouts, and a check that fails on
 * that teaches everyone to ignore it.
 */
export const OVERFLOW_TOLERANCE_PX = 1;

/**
 * The smallest an interactive element may be, measured in the real layout.
 *
 * Two numbers, and the difference between them is the difference between an
 * obligation and an ambition.
 *
 * `floor` is WCAG 2.5.8 at level AA: 24 by 24 CSS pixels. It is enforced, on
 * every surface, and a failure is a failure. The standard offers a spacing
 * exception — a smaller target passes if 24 px circles centred on it do not
 * touch a neighbour's — which this deliberately does not implement. Meeting
 * the size unconditionally is stricter than the standard, and it is something
 * a reader of this code can check by looking at one number.
 *
 * `intent` is the product's own preference, and the honest word for it is
 * preference: 44 px for a reading surface's controls (WCAG 2.5.5, level AAA)
 * and 32 px for the denser in-scene chrome. Elements between the floor and the
 * intent are counted and published in the report rather than failing the
 * build, because a header's wordmark is a link that will never be 44 px tall
 * and a rule that fails on it is a rule somebody switches off within a week.
 *
 * This is the *measured* counterpart to `TOUCH_TARGET` in `palette.js`, which
 * declares what the stylesheet must ask for. The stylesheet is checked there;
 * this is checked in the browser, where a flex container can still crush a
 * button the CSS said was 44 px tall.
 */
export const MEASURED_TARGET = {
  floor: 24,
  intent: { reading: 44, scene: 32 },
};

/**
 * Elements exempt from the target-size rule, by selector.
 *
 * Each one is exempt for a reason that is written down, because "it was
 * failing" is not a reason and an exemption list nobody justifies grows until
 * the rule means nothing.
 */
export const TARGET_EXEMPTIONS = [
  {
    selector: '.skip-link',
    why: 'Visible only while focused, and reached by keyboard rather than by touch.',
  },
  {
    selector: '.legend-item',
    why: 'A legend swatch is a label, not a control; it is not clickable.',
  },
  {
    selector: '[aria-hidden="true"]',
    why: 'Hidden from assistive technology and from the pointer alike.',
  },
];

/**
 * Inline links are not target-size failures, and treating them as ones is how
 * the rule gets switched off.
 *
 * WCAG 2.5.8 exempts a target "in a sentence or its size is otherwise
 * constrained by the line-height of non-target text". Every citation inside an
 * evidence paragraph is such a target. The selector list above cannot express
 * this — whether a link is inline is a fact about the layout it ended up in,
 * not about a class — so the browser-side check decides it, and this records
 * what it is deciding and why.
 */
export const INLINE_LINK_EXEMPTION = {
  id: 'inline-link',
  why: 'WCAG 2.5.8 exempts a link inside a sentence, whose height the line box already fixes.',
};

/** @param {{width:number}} viewport */
export const deviceClassOf = (viewport) => deviceClassForViewport(viewport.width);

/**
 * Everything structurally wrong with the matrix, as readable lines.
 *
 * The same shape as `validateCatalog` and `validateLegal`: returned rather
 * than thrown, so the test suite and a script share one function.
 */
export function validateViewportMatrix(viewports = VIEWPORTS, surfaces = SURFACES) {
  const problems = [];
  const seen = new Set();

  for (const viewport of viewports) {
    const where = `viewport "${viewport.id}"`;
    if (seen.has(viewport.id)) problems.push(`${where}: duplicate id`);
    seen.add(viewport.id);
    if (!viewport.label) problems.push(`${where}: no label`);
    if (!(viewport.width > 0) || !(viewport.height > 0)) problems.push(`${where}: not a size`);
    if (viewport.width < 320) problems.push(`${where}: narrower than any viewport in use`);
  }

  const widths = viewports.map((viewport) => viewport.width);
  if (!widths.includes(320)) problems.push('the matrix must include 320px — reflow is judged there');
  if (!viewports.some((viewport) => viewport.short)) {
    problems.push('the matrix must include a landscape phone: short viewports fail differently');
  }
  if (!viewports.some((viewport) => viewport.reflow)) {
    problems.push('no viewport is marked for the reflow check');
  }
  for (const id of ['phone', 'tablet', 'desktop']) {
    if (!viewports.some((viewport) => deviceClassOf(viewport) === id)) {
      problems.push(`no viewport exercises the "${id}" device class the renderer budgets for`);
    }
  }

  const routes = new Set();
  for (const surface of surfaces) {
    const where = `surface "${surface.id}"`;
    if (routes.has(surface.route)) problems.push(`${where}: duplicate route`);
    routes.add(surface.route);
    if (!surface.route.startsWith('#/')) problems.push(`${where}: not a route`);
    if (!surface.label) problems.push(`${where}: no label`);
  }
  if (!surfaces.some((surface) => surface.needsRenderer)) {
    problems.push('no surface exercises a scene: overlay chrome has the same obligations');
  }

  return problems;
}

/**
 * The widths the roadmap names, so the test can check the promise rather than
 * the implementation.
 */
export const PROMISED_PHONE_WIDTHS = Object.freeze([320, 430]);

/** True when this viewport lays out as a phone by the renderer's own rule. */
export const isPhoneWidth = (width) => width <= PHONE_MAX_WIDTH;
