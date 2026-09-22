import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createTrust } from '../src/app/Trust.js';
import { PUBLIC_SCENES } from '../src/catalog/index.js';
import { isSceneReleased } from '../src/catalog/release.js';
import { isInPageAnchor, resolveRoute } from '../src/app/router.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * `betaUnlocked()` reads `window` directly (see `src/app/releaseGate.js`), so
 * anything that renders a Trust card needs one, same as `beta-release.test.js`.
 */
function withFakeBrowser(run) {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = {
    location: { search: '' },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  };
  try {
    return run();
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
}

const mountTrust = (options = {}) => {
  const ui = new FakeElement('div');
  const { element } = createTrust({ ui, ...options });
  return element;
};

/**
 * What replaced the table of contents.
 *
 * Trust listed seventy models twice: a jump list of seventy chips, each with a
 * name and a review badge, above seventy cards with the same name and the same
 * badge. Two structures for one set, and neither of them an index — seventy
 * names in review order is the data with a heading on it.
 *
 * The tests below are the old TOC tests' replacements, not their deletion: the
 * thing they were protecting (a reader can find one model among seventy, and
 * doing so never turns into a hash navigation that throws them out of the page)
 * still has to hold. It now has to hold for one control instead of two lists.
 */

test('Trust: the filter narrows the records themselves — there is no second list', () => {
  withFakeBrowser(() => {
    const element = mountTrust();
    const cards = findByClass(element, 'trust-card');
    assert.equal(cards.length, PUBLIC_SCENES.length, 'one record per model');

    // The duplication itself, asserted gone. A second structure listing the
    // same models is what this change removed, and re-adding one beside the
    // filter would make three.
    assert.equal(findByClass(element, 'trust-toc').length, 0);
    assert.equal(findByClass(element, 'trust-toc-link').length, 0);

    assert.equal(findByClass(element, 'trust-filter').length, 1, 'exactly one control');
    assert.equal(findByClass(element, 'trust-filter-field').length, 1);
  });
});

test('Trust: the filter starts showing everything, and says how many that is', () => {
  withFakeBrowser(() => {
    const element = mountTrust();
    for (const card of findByClass(element, 'trust-card')) {
      assert.equal(card.hidden, false, `${card.getAttribute('id')} must start visible`);
    }
    const count = findByClass(element, 'trust-filter-count')[0];
    assert.ok(count, 'the count is how a reader knows the filter did anything');
    // A live region: narrowing a list without saying so leaves a screen-reader
    // user with no signal that anything happened.
    assert.equal(count.getAttribute('role'), 'status');
    assert.equal(count.getAttribute('aria-live'), 'polite');
  });
});

test('Trust: typing a model name hides every record but the matches', () => {
  withFakeBrowser(() => {
    const element = mountTrust();
    const field = findByClass(element, 'trust-filter-field')[0];
    const cards = findByClass(element, 'trust-card');
    const target = PUBLIC_SCENES[0];

    field.value = target.titleJa;
    field.dispatchEvent({ type: 'input' });

    const shown = cards.filter((card) => !card.hidden).map((card) => card.getAttribute('id'));
    assert.deepEqual(shown, [`trust-${target.slug}`]);

    // And clearing it brings them all back — a filter a reader cannot undo is
    // a page that has lost most of itself.
    field.value = '';
    field.dispatchEvent({ type: 'input' });
    assert.equal(cards.filter((card) => !card.hidden).length, PUBLIC_SCENES.length);
  });
});

test('Trust: the availability split is the one distinction a visitor can act on', () => {
  withFakeBrowser(() => {
    const element = mountTrust();
    const cards = findByClass(element, 'trust-card');
    const scopes = findByClass(element, 'trust-filter-scope');
    assert.equal(scopes.length, 3, 'all / published / in development');

    const published = new Set(PUBLIC_SCENES.filter(isSceneReleased).map((scene) => `trust-${scene.slug}`));
    assert.ok(published.size > 0, 'the beta publishes something');
    assert.ok(published.size < PUBLIC_SCENES.length, 'and holds something back');

    scopes[1].dispatchEvent({ type: 'click' });
    const open = cards.filter((card) => !card.hidden).map((card) => card.getAttribute('id'));
    assert.deepEqual(new Set(open), published, 'published shows exactly what the release opened');
    assert.equal(scopes[1].getAttribute('aria-pressed'), 'true');
    assert.equal(scopes[0].getAttribute('aria-pressed'), 'false');

    scopes[2].dispatchEvent({ type: 'click' });
    const building = cards.filter((card) => !card.hidden).map((card) => card.getAttribute('id'));
    assert.equal(building.length, PUBLIC_SCENES.length - published.size);
    assert.equal(
      building.some((id) => published.has(id)),
      false,
      'the two halves must not overlap'
    );
  });
});

test('Trust: a record the route named is never left hidden by a filter', () => {
  // The failure this exists for: a deep link from a model's "sources & limits"
  // arrives at a page that has narrowed itself, and the one record the reader
  // asked for is the one that is hidden. It cannot happen today — the filter
  // starts wide — and `createTrust` asks for a reset anyway, because the cost
  // of being wrong here is a link that silently shows nothing.
  withFakeBrowser(() => {
    const focused = PUBLIC_SCENES[PUBLIC_SCENES.length - 1];
    const element = mountTrust({ focusId: focused.id });
    const card = findByClass(element, 'trust-card')
      .find((node) => node.getAttribute('id') === `trust-${focused.slug}`);
    assert.ok(card);
    assert.equal(card.hidden, false, 'the record the route named must be on screen');
    assert.equal(card.getAttribute('open'), '', 'and open');
  });
});

test('Trust: every model section is a closed <details> by default', () => {
  withFakeBrowser(() => {
    const element = mountTrust();
    const cards = findByClass(element, 'trust-card');
    assert.equal(cards.length, PUBLIC_SCENES.length);
    for (const card of cards) {
      assert.equal(card.tagName, 'DETAILS');
      assert.equal(card.getAttribute('open'), null, `${card.getAttribute('id')} should start collapsed`);
    }
  });
});

test('Trust: a route naming a model opens only that model\'s section', () => {
  withFakeBrowser(() => {
    const focused = PUBLIC_SCENES[PUBLIC_SCENES.length - 1];
    const element = mountTrust({ focusId: focused.id });
    const cards = findByClass(element, 'trust-card');
    const focusedId = `trust-${focused.slug}`;

    for (const card of cards) {
      const shouldBeOpen = card.getAttribute('id') === focusedId;
      assert.equal(
        card.getAttribute('open'),
        shouldBeOpen ? '' : null,
        `${card.getAttribute('id')}: expected open=${shouldBeOpen}`
      );
    }
  });
});

test('Trust: a route naming a model also moves focus to that model\'s summary', () => {
  // The TOC click handler already moves focus to the summary it opens
  // (`trustTocItem`'s click handler, above); landing on `#/trust?model=<slug>`
  // directly must do the same, or a keyboard/screen-reader visitor who follows
  // a shared link lands on an opened card with focus left on `<body>`.
  withFakeBrowser(() => {
    const focused = PUBLIC_SCENES[PUBLIC_SCENES.length - 1];
    const element = mountTrust({ focusId: focused.id });
    const focusedId = `trust-${focused.slug}`;
    const focusedCard = findByClass(element, 'trust-card').find((card) => card.getAttribute('id') === focusedId);

    // `assert.equal`/`assert.deepEqual` would try to diff two whole
    // `FakeElement` subtrees on failure (and time out doing it — see the
    // cycles `parentElement`/`classList` create), so compare identity as a
    // plain expression instead, the same way `target.open === true` above
    // stays a primitive comparison.
    assert.ok(document.activeElement === focusedCard.querySelector('summary'), 'focus must land on the opened card\'s summary');
  });
});

test('Trust: a focus id also matches by slug, and an unknown focus id opens nothing', () => {
  withFakeBrowser(() => {
    const focused = PUBLIC_SCENES[0];
    const bySlug = mountTrust({ focusId: focused.slug });
    const openBySlug = findByClass(bySlug, 'trust-card').filter((card) => card.getAttribute('open') === '');
    assert.deepEqual(openBySlug.map((card) => card.getAttribute('id')), [`trust-${focused.slug}`]);

    const unknown = mountTrust({ focusId: 'not-a-real-scene' });
    const openUnknown = findByClass(unknown, 'trust-card').filter((card) => card.getAttribute('open') === '');
    assert.deepEqual(openUnknown, []);
  });
});

test('Trust: no scene id or slug is hard-coded — the TOC and cards come from PUBLIC_SCENES', () => {
  const source = read('src/app/Trust.js');
  for (const scene of PUBLIC_SCENES) {
    assert.ok(!source.includes(`'${scene.id}'`), `Trust.js hard-codes scene id "${scene.id}"`);
    assert.ok(!source.includes(`"${scene.id}"`), `Trust.js hard-codes scene id "${scene.id}"`);
    if (scene.slug !== scene.id) {
      assert.ok(!source.includes(`'${scene.slug}'`), `Trust.js hard-codes scene slug "${scene.slug}"`);
    }
  }
  // The generator, not a list: one call that maps over the catalogue.
  assert.match(source, /PUBLIC_SCENES\.map\(trustEntry\)/);
});

/**
 * The wiring on the other end: a scene's own title card links to *its own*
 * Trust record via `?model=<id>`, not the generic `#/trust` the landing page
 * and header use. `TitleCard.js` imports `styles/clinical-review.css`
 * directly, which `node --test` cannot load (no bundler here — see
 * `src/components/TitleCard.js`'s neighbours for the same constraint), so
 * this pins the exact template it renders and then drives the real router +
 * Trust code with what that template produces, rather than only reading text.
 */
test('TitleCard links a scene to its own Trust record, gated the same way the review badge is', () => {
  const source = read('src/components/TitleCard.js');
  assert.match(
    source,
    /href: `#\/trust\?model=\$\{encodeURIComponent\(meta\.id\)\}`/,
    'TitleCard.js must build the model-scoped Trust link from meta.id, not a literal'
  );
  // Trust only ever has a card for a non-prototype scene (`review` is null
  // for a prototype one, a few lines above) — the link must share that gate,
  // or it would offer to land on a page with nothing open.
  assert.match(source, /const modelInfoLink =\s*\n\s*review &&/);
});

test("a scene's Trust link actually opens that scene's card, for any published scene", () => {
  withFakeBrowser(() => {
    for (const scene of [PUBLIC_SCENES[0], PUBLIC_SCENES[PUBLIC_SCENES.length - 1]]) {
      // What TitleCard.js's pinned template literally produces for this scene.
      const href = `#/trust?model=${encodeURIComponent(scene.id)}`;
      const route = resolveRoute(href);
      assert.equal(route.kind, 'trust');
      assert.equal(route.focusId, scene.id);

      const element = mountTrust({ focusId: route.focusId });
      const openIds = findByClass(element, 'trust-card')
        .filter((card) => card.getAttribute('open') === '')
        .map((card) => card.getAttribute('id'));
      assert.deepEqual(openIds, [`trust-${scene.slug}`], `${scene.id}: its own link must open its own card`);
    }
  });
});

test('the landing page and header keep the generic Trust route, not a model-scoped one', () => {
  const landing = read('src/app/Landing.js');
  // `shellLink(MODEL_INFO_ROUTE, …)` (nav, footer, explorer shell) never gets
  // a query string appended — only the scene's own title card does that.
  assert.ok(!landing.includes('MODEL_INFO_ROUTE}?model='), 'Landing.js must not scope the generic link');
  assert.ok(!landing.includes('#/trust?model='));
});

/**
 * `.trust-card` is a `<details>`; its own padding belongs to whichever of
 * `.trust-card-summary` / `.trust-card-body` is actually visible (closed vs.
 * open — see L-31 above trustCard's docblock). `surface-polish.css` loads
 * after `trust.css` (see `src/main.js`), so a `.trust-card { padding: … }`
 * rule there does not override trust.css's card padding — it stacks a second
 * padding on top of the summary/body padding trust.css already applies,
 * inflating every card (that was the actual bug: `surface-polish.css` had
 * *two* such rules, a base one and a phone-width one, on top of trust.css's
 * summary/body padding). At most one rule, in either file, may declare
 * padding for the outer `.trust-card` element.
 */
test('CSS: no rule declares padding on .trust-card itself', () => {
  const surfacePolish = read('src/styles/surface-polish.css');
  const trust = read('src/styles/trust.css');

  // Match the exact selector `.trust-card` (not `.trust-card-summary` /
  // `.trust-card-body` / `.trust-card-title`, etc. — the lookahead requires
  // the selector to end right there), as it appears in a selector list,
  // followed by its declaration block, and count the blocks that declare
  // `padding` (or a `padding-*` longhand). This also catches the padding
  // being declared twice *within one file* (once at the base breakpoint,
  // once inside a phone-width media query) — the actual shape the original
  // bug took: both `.trust-card` rules lived in surface-polish.css alone, so
  // a same-file duplicate must trip this guard exactly as a two-file one
  // would.
  const cardPaddingRuleCount = (css) => {
    const blockRe = /(^|[,{}])\s*\.trust-card\s*(?=[,{])[^{}]*\{([^}]*)\}/gms;
    let match;
    let count = 0;
    while ((match = blockRe.exec(css))) {
      const body = match[2];
      if (/(^|;|\s)padding(-top|-right|-bottom|-left)?\s*:/.test(body)) count += 1;
    }
    return count;
  };

  const total = cardPaddingRuleCount(surfacePolish) + cardPaddingRuleCount(trust);

  // Zero: `.trust-card` (the `<details>`) is unpadded, and
  // `.trust-card-summary` / `.trust-card-body` (the parts that are actually
  // visible, open or closed) own the inset. Any padding on the outer element
  // stacks on top of theirs, so there is no "one owner" version of this rule
  // that keeps the summary/body padding — a future design that pads the
  // outer element instead has to move the inset off the children and change
  // this guard in the same change.
  assert.ok(
    total === 0,
    `.trust-card padding is declared ${total} times across surface-polish.css and trust.css combined — ` +
      'it stacks on top of .trust-card-summary/.trust-card-body\'s own padding instead of overriding it, ' +
      'because .trust-card is their parent, not a competing rule for the same element'
  );
});
