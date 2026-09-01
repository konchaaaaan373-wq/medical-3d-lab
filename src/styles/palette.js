/**
 * The design tokens, and every foreground/background pairing the product
 * actually uses, as data.
 *
 * `base.css` remains where the tokens are *applied*; this is where they are
 * *declared*, so that a contrast ratio can be computed without a browser and
 * `tests/accessibility.test.js` can fail on a colour that stopped being
 * readable. A test suite that cannot see the palette can only check that the
 * CSS parses.
 *
 * The two files are kept in agreement by a test rather than by discipline: it
 * reads `base.css` and compares the `:root` values with these.
 *
 * Pure JavaScript — no DOM, no `three`.
 */

/** The `:root` custom properties in `base.css`, by name without the `--`. */
export const TOKENS = {
  bg: '#04060c',
  ink: '#eaf2ff',
  'ink-dim': '#a7b6ce',
  'ink-faint': '#6b7c95',
  accent: '#38e1ef',
};

/**
 * Colours that are not tokens but are painted directly, and the surface they
 * sit on. Panels are translucent, so what a reader actually sees is the panel
 * colour composited over the page background — the effective colour is what
 * is checked, not the declared one.
 */
export const SURFACES = {
  /** The page itself. */
  page: '#04060c',
  /** `--panel`: rgba(10, 16, 28, 0.62) over the page. */
  panel: composite('#0a101c', 0.62, '#04060c'),
  /** `--panel-strong`: rgba(8, 13, 24, 0.86) over the page. */
  panelStrong: composite('#080d18', 0.86, '#04060c'),
  /**
   * The Trust page is a light editorial surface rather than an overlay on a
   * dark canvas, so it has its own palette and its own obligations. It is
   * declared here for the same reason the dark one is: a colour nobody
   * measured is a colour that can quietly stop being readable.
   */
  trust: '#f5f3ee',
};

/** Ink used only on the light Trust surface. */
export const TRUST_INK = {
  body: '#1c2528',
  muted: '#425054',
  faint: '#657176',
  /** A review whose model has since changed. */
  drift: '#7a4a12',
  driftBody: '#45524f',
};

/**
 * Every pairing the product relies on, with the size class it is used at.
 *
 * `body` must reach 4.5:1 and `large` 3:1 (WCAG 2.1 AA). `ui` is the 3:1
 * requirement for a control's own boundary or icon. Anything not listed here
 * is not a pairing the product promises to keep readable — adding a new one
 * means adding a line here, which is the point.
 */
export const CONTRAST_PAIRS = [
  { name: 'body text on the page', fg: TOKENS.ink, bg: SURFACES.page, size: 'body' },
  { name: 'body text on a panel', fg: TOKENS.ink, bg: SURFACES.panel, size: 'body' },
  { name: 'body text on a strong panel', fg: TOKENS.ink, bg: SURFACES.panelStrong, size: 'body' },
  { name: 'secondary text on the page', fg: TOKENS['ink-dim'], bg: SURFACES.page, size: 'body' },
  { name: 'secondary text on a panel', fg: TOKENS['ink-dim'], bg: SURFACES.panel, size: 'body' },
  { name: 'secondary text on a strong panel', fg: TOKENS['ink-dim'], bg: SURFACES.panelStrong, size: 'body' },
  // Faint ink carries timestamps, hints and the small print beside a control.
  // It is small text, so it is held to the body threshold, not the large one.
  { name: 'faint text on the page', fg: TOKENS['ink-faint'], bg: SURFACES.page, size: 'body' },
  { name: 'faint text on a panel', fg: TOKENS['ink-faint'], bg: SURFACES.panel, size: 'body' },
  { name: 'accent link on the page', fg: TOKENS.accent, bg: SURFACES.page, size: 'body' },
  { name: 'accent link on a panel', fg: TOKENS.accent, bg: SURFACES.panel, size: 'body' },
  { name: 'accent focus ring on the page', fg: TOKENS.accent, bg: SURFACES.page, size: 'ui' },
  { name: 'accent focus ring on a panel', fg: TOKENS.accent, bg: SURFACES.panel, size: 'ui' },
  { name: 'error text on a panel', fg: '#ffb4b4', bg: SURFACES.panel, size: 'body' },
  { name: 'Trust body text', fg: TRUST_INK.body, bg: SURFACES.trust, size: 'body' },
  { name: 'Trust secondary text', fg: TRUST_INK.muted, bg: SURFACES.trust, size: 'body' },
  { name: 'Trust faint text', fg: TRUST_INK.faint, bg: SURFACES.trust, size: 'body' },
  { name: 'Trust review-drift heading', fg: TRUST_INK.drift, bg: SURFACES.trust, size: 'body' },
  { name: 'Trust review-drift body', fg: TRUST_INK.driftBody, bg: SURFACES.trust, size: 'body' },
];

/** WCAG 2.1 AA minimum ratios. */
export const CONTRAST_MINIMUM = { body: 4.5, large: 3, ui: 3 };

/**
 * The smallest a control may be, in CSS pixels.
 *
 * WCAG 2.5.8 (AA) asks for 24×24; 2.5.5 (AAA) and every platform guideline ask
 * for 44. This product is used one-handed on a phone beside a patient, so the
 * primary controls are held to 44 and the dense in-scene chrome to 32 with
 * spacing, which is the compromise the layout can actually keep.
 */
export const TOUCH_TARGET = { primary: 44, dense: 32, absoluteMinimum: 24 };

/** `#rrggbb` (or `#rgb`) to `{r,g,b}` in 0–255. */
export function parseHex(value) {
  const hex = String(value).trim().replace(/^#/, '');
  const full = hex.length === 3 ? [...hex].map((char) => char + char).join('') : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`not a hex colour: ${value}`);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** A function declaration, not a const: `SURFACES` composites at module load. */
function toHex({ r, g, b }) {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * What a translucent colour actually looks like over a backdrop.
 *
 * Checking the declared colour of a 62%-opaque panel would measure a surface
 * nobody ever sees.
 *
 * @param {string} colour
 * @param {number} alpha 0–1
 * @param {string} backdrop
 */
export function composite(colour, alpha, backdrop) {
  const top = parseHex(colour);
  const under = parseHex(backdrop);
  return toHex({
    r: top.r * alpha + under.r * (1 - alpha),
    g: top.g * alpha + under.g * (1 - alpha),
    b: top.b * alpha + under.b * (1 - alpha),
  });
}

/** WCAG relative luminance. */
export function relativeLuminance(colour) {
  const { r, g, b } = parseHex(colour);
  const channel = (value) => {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * WCAG contrast ratio, 1–21. Order-independent, as the definition is.
 *
 * @param {string} a
 * @param {string} b
 */
export function contrastRatio(a, b) {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Every declared pairing that fails its threshold, as readable lines.
 *
 * Returned rather than thrown, in the same shape as `validateCatalog` and
 * `validateLegal`.
 *
 * @param {typeof CONTRAST_PAIRS} [pairs]
 */
export function contrastFailures(pairs = CONTRAST_PAIRS) {
  return pairs
    .map((pair) => ({ ...pair, ratio: contrastRatio(pair.fg, pair.bg), needs: CONTRAST_MINIMUM[pair.size] }))
    .filter((pair) => pair.ratio < pair.needs)
    .map(
      (pair) =>
        `${pair.name}: ${pair.ratio.toFixed(2)}:1 against ${pair.fg} on ${pair.bg}, needs ${pair.needs}:1`
    );
}

/** The measured ratio for every pairing, for reporting rather than asserting. */
export const contrastReport = (pairs = CONTRAST_PAIRS) =>
  pairs.map((pair) => ({
    name: pair.name,
    ratio: Number(contrastRatio(pair.fg, pair.bg).toFixed(2)),
    needs: CONTRAST_MINIMUM[pair.size],
  }));
