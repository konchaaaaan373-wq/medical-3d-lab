/**
 * Reading a stylesheet as rules, instead of searching it as text.
 *
 * Four separate guards in this repository have gone green while reading the
 * wrong thing out of a `.css` file, and all four were the same mistake wearing
 * different clothes: a regex anchored on one spelling of a selector, matching
 * somewhere the author did not mean.
 *
 * - A rule with an explanation above it carries that comment into its selector
 *   chunk, so an exact-name match skips precisely the rules somebody bothered
 *   to document.
 * - `\n\.locked-copy \{` matches the *second line* of the group
 *   `.locked-summary,\n.locked-copy {` and reads that rule's body.
 * - A class declared twice is answered by whichever rule the regex found
 *   first, when the browser uses the last.
 * - Two `font-size` lines in one body is the same question one level down, and
 *   reading the first reports a size nothing ever renders at.
 *
 * Two copies of this tokenizer already existed — `rulesOf()` in
 * `scripts/type-floor.mjs` and `sizeOf()` in `tests/locked-surface.test.js` —
 * each carrying its own comment explaining the same two bugs. That is the
 * third-copy signal from CLAUDE.md 「同じ車輪を二度作らない」.
 *
 * Recorded as L-02, L-03 and L-04 in `docs/verification-lessons.md`.
 */

/** Comments off first; see the note above about glued selector chunks. */
const withoutComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Every rule in a stylesheet, in source order.
 *
 * `[^{}]*` for the body rather than `[^}]*`: an at-rule's opening brace would
 * otherwise swallow the first rule nested inside it, so `@media` bodies would
 * be read as one enormous declaration list. The trade is that this yields the
 * rules *inside* an at-rule and not the at-rule itself, which is what every
 * caller here wants — a media query's override is a real size a class reaches.
 *
 * @param {string} css
 * @returns {Generator<{selectors: string, names: string[], body: string}>}
 */
export function* rulesOf(css) {
  for (const [, selectors, body] of withoutComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const text = selectors.trim().replace(/\s+/g, ' ');
    if (text.startsWith('@')) continue;
    yield { selectors: text, names: text.split(',').map((one) => one.trim()), body };
  }
}

/**
 * Whether a selector applies to exactly this class.
 *
 * `.locked-copy` is named by `.locked-copy`, `.locked-copy:hover` and
 * `.locked-copy.is-open`, and *not* by `.locked-copy-inner` — which a
 * `includes()` test would have wrong in both directions.
 */
const namesClass = (selector, className) =>
  selector === className
  || selector.startsWith(`${className}.`)
  || selector.startsWith(`${className}:`)
  || selector.startsWith(`${className} `)
  || selector.endsWith(` ${className}`);

/**
 * Every rule whose selector list names the class, in source order.
 *
 * All of them, not the first that looks right: the cascade at equal
 * specificity is decided by the last one.
 *
 * @param {string} css
 * @param {string} className including the leading dot
 */
export function rulesNaming(css, className) {
  return [...rulesOf(css)].filter((rule) => rule.names.some((name) => namesClass(name, className)));
}

/**
 * The value a property ends up with in one rule body, or null.
 *
 * The last occurrence, because that is the one the browser uses.
 *
 * @param {string} body
 * @param {string} property
 */
export function declaration(body, property) {
  const found = [...body.matchAll(new RegExp(`${property}:\\s*([^;}]+)`, 'g'))].at(-1);
  return found ? found[1].trim() : null;
}

/**
 * The px `font-size` a class ends up with across the whole sheet, or null.
 *
 * Null rather than a throw or a zero: "this class sets no size" is a real
 * answer, and a caller that needs it to be set should say so itself. Returning
 * 0 would quietly pass a floor check the wrong way round.
 *
 * @param {string} css
 * @param {string} className including the leading dot
 * @returns {number | null}
 */
export function fontSizePx(css, className) {
  const sizes = rulesNaming(css, className)
    .map((rule) => declaration(rule.body, 'font-size'))
    .filter((value) => value !== null && /^[0-9.]+px$/.test(value))
    .map((value) => Number.parseFloat(value));
  return sizes.length > 0 ? sizes.at(-1) : null;
}

/**
 * Custom properties declared in the rules matching a selector predicate.
 *
 * @param {string} css
 * @param {(selectors: string) => boolean} matches
 * @returns {Record<string, string>}
 */
export function customProperties(css, matches) {
  const tokens = {};
  for (const rule of rulesOf(css)) {
    if (!matches(rule.selectors)) continue;
    for (const [, name, value] of rule.body.matchAll(/--([a-z0-9-]+):\s*([^;}]+)/gi)) {
      tokens[name] = value.trim();
    }
  }
  return tokens;
}
