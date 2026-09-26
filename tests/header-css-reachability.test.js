import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every header class the stylesheets style is one the code actually renders.
 *
 * ## Why this exists (L-122)
 *
 * `anatomy-shell-presentation.css` hid `.global-nav-current-scene` so the 3D
 * header would not print a model's title twice, and
 * `tests/anatomy-shell-presentation.test.js` held the rule in place by
 * asserting the sheet *contained* that class name. Nothing had rendered the
 * class since the breadcrumb was rebuilt around `.global-nav-current-part`:
 * the rule hid nothing, the assertion measured the rule's text, and both were
 * green. Removing the drawer in the header restructure found twenty-two of
 * these across four sheets — rules for a mega menu, an explorer link and a
 * chevron that no longer existed, still being tuned by later sheets.
 *
 * A rule for a class nobody renders is worse than no rule: it is where the next
 * person goes to change the header, and nothing happens. So for the header's
 * own namespaces, a class in a stylesheet must appear in the source.
 */

const HEADER_PREFIXES = ['global-nav-', 'site-menu-', 'site-utilities', 'shell-', 'brand-mark'];

function filesUnder(dir, suffix) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...filesUnder(path, suffix));
    else if (name.endsWith(suffix)) found.push(path);
  }
  return found;
}

const root = new URL('../src/', import.meta.url).pathname;
const source = filesUnder(root, '.js').map((file) => readFileSync(file, 'utf8')).join('\n');

/** Class names in a stylesheet, comments removed so prose cannot count. */
function classesIn(css) {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return new Set([...code.matchAll(/\.([a-z][a-z0-9-]*)/g)].map((match) => match[1]));
}

test('every header class a stylesheet styles is rendered by some code', () => {
  const unreachable = [];
  for (const file of filesUnder(join(root, 'styles'), '.css')) {
    for (const name of classesIn(readFileSync(file, 'utf8'))) {
      if (!HEADER_PREFIXES.some((prefix) => name.startsWith(prefix))) continue;
      // A whole-word match: `global-nav-panel` must not be found inside
      // `global-nav-panel-intro`.
      const used = new RegExp(`(^|[^a-z0-9-])${name}([^a-z0-9-]|$)`).test(source);
      if (!used) unreachable.push(`${file.slice(root.length)}: .${name}`);
    }
  }
  assert.deepEqual(
    unreachable,
    [],
    'these rules style a class no code renders — delete them, or render the class:\n  ' +
      unreachable.join('\n  ')
  );
});
