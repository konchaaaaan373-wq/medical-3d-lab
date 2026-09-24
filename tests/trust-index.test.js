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

const RELEASED_SCENES = PUBLIC_SCENES.filter(isSceneReleased);

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
    assert.equal(cards.length, RELEASED_SCENES.length, 'one record per published model');

    // The duplication itself, asserted gone. A second structure listing the
    // same models is what this change removed, and re-adding one beside the
    // filter would make three.
    assert.equal(findByClass(element, 'trust-toc').length, 0);
    assert.equal(findByClass(element, 'trust-toc-link').length, 0);

    assert.equal(findByClass(element, 'trust-filter').length, 1, 'exactly one control');
    assert.equal(findByClass(element, 'trust-filter-field').length, 1);
  });
});

test('Trust: the public ledger starts with only published models visible', () => {
  withFakeBrowser(() => {
    const element = mountTrust();
    const cards = findByClass(element, 'trust-card');
    assert.equal(cards.length, RELEASED_SCENES.length);
    for (const card of cards) {
      assert.equal(card.hidden, false, `${card.getAttribute('id')} must start visible`);
    }
    assert.deepEqual(
      new Set(cards.map((card) => card.getAttribute('id'))),
      new Set(RELEASED_SCENES.map((scene) => `trust-${scene.slug}`))
    );
    const count = findByClass(element, 'trust-filter-count')[0];
    assert.ok(count, 'the count is how a reader knows the filter did anything');
    assert.equal(count.getAttribute('role'), 'status');
    assert.equal(count.getAttribute('aria-live'), 'polite');
  });
});

test('Trust: typing a model name hides every record but the matches', () => {
  withFakeBrowser(() => {
    const element = mountTrust();
    const field = findByClass(element, 'trust-filter-field')[0];
    const cards = findByClass(element, 'trust-card');
    const target = RELEASED_SCENES[0];

    field.value = target.titleJa;
    field.dispatchEvent({ type: 'input' });

    const shown = cards.filter((card) => !card.hidden).map((card) => card.getAttribute('id'));
    assert.deepEqual(shown, [`trust-${target.slug}`]);

    // And clearing it brings them all back — a filter a reader cannot undo is
    // a page that has lost most of itself.
    field.value = '';
    field.dispatchEvent({ type: 'input' });
    assert.equal(cards.filter((card) => !card.hidden).length, RELEASED_SCENES.length);
  });
});

test('Trust: publication status is not exposed as a second UI axis', () => {
  withFakeBrowser(() => {
    const element = mountTrust();
    assert.deepEqual(findByClass(element, 'trust-filter-scope'), []);
    assert.deepEqual(findByClass(element, 'trust-maturity'), []);
    assert.ok(findByClass(element, 'trust-review-badge').length > 0, 'medical review remains visible');
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
    // Not a `<details open>` any more: the record the page is about is not a
    // disclosure, because there is nothing to disclose and nothing anybody
    // came here to collapse. "On screen and not collapsible" is the stronger
    // form of what this was asserting.
    assert.equal(card.tagName, 'SECTION', 'and it is a plain section, not a collapsible one');
    assert.equal(card.classList.contains('is-lead'), true);
  });
});

test('Trust: every model section is a closed <details> by default', () => {
  withFakeBrowser(() => {
    // No focus id, so nothing is promoted and every record is a disclosure.
    const element = mountTrust();
    const cards = findByClass(element, 'trust-card');
    assert.equal(cards.length, RELEASED_SCENES.length);
    for (const card of cards) {
      assert.equal(card.tagName, 'DETAILS');
      assert.equal(card.getAttribute('open'), null, `${card.getAttribute('id')} should start collapsed`);
    }
  });
});

test('Trust: a route naming a model leaves every other record collapsed', () => {
  withFakeBrowser(() => {
    const focused = PUBLIC_SCENES[PUBLIC_SCENES.length - 1];
    const element = mountTrust({ focusId: focused.id });
    const focusedId = `trust-${focused.slug}`;

    for (const card of findByClass(element, 'trust-card')) {
      if (card.getAttribute('id') === focusedId) {
        assert.equal(card.tagName, 'SECTION', 'the named record is not collapsible');
        continue;
      }
      assert.equal(card.tagName, 'DETAILS');
      assert.equal(
        card.getAttribute('open'),
        null,
        `${card.getAttribute('id')}: every other record stays collapsed`
      );
    }
  });
});

test('Trust: the promoted record does not offer a second way to the same model', () => {
  // The hero above it carries "← 3Dモデルに戻る". The card's own "モデルを開く →"
  // goes to the same route, and on a 390px phone both were on screen at once
  // — two links to one place, 200px apart, in the first screenful.
  withFakeBrowser(() => {
    const focused = PUBLIC_SCENES[0];
    const element = mountTrust({ focusId: focused.id });
    const lead = findByClass(element, 'trust-lead-record')[0];
    assert.ok(lead);
    assert.deepEqual(findByClass(lead, 'trust-open-model'), []);
    // And the model's name is not printed twice: the page heading has it.
    assert.deepEqual(findByClass(lead, 'trust-card-title'), []);
    // The badges survive the summary being removed — they are what the plain
    // sentence in the hero is explaining.
    assert.ok(findByClass(lead, 'trust-card-badges')[0], 'the badges are still on the record');
  });
});

test("Trust: a route naming a model puts that model's record first, as the skip target", () => {
  // This used to move focus to the opened card's `<summary>`, because the card
  // was the seventy-first thing on the page and a keyboard or screen-reader
  // visitor who followed a shared link would otherwise land on `<body>` above
  // seven thousand pixels of other people's records.
  //
  // The record is now the top of the page, so there is nowhere to carry
  // anybody to — and that is the stronger guarantee, so it is what is asserted
  // here: the heading names *this* model, the skip target is the record rather
  // than the ledger, and the ledger that follows is introduced as the other
  // models. Focus on arrival is then the shell's ordinary
  // `focusSurfaceStart`, which finds `[data-skip-target]` — this element.
  withFakeBrowser(() => {
    const focused = PUBLIC_SCENES[PUBLIC_SCENES.length - 1];
    const element = mountTrust({ focusId: focused.id });

    const hero = findByClass(element, 'trust-hero')[0];
    assert.ok(hero, 'the page still opens with a hero');
    assert.equal(hero.classList.contains('is-model'), true, 'and it is this model\'s, not the ledger\'s');
    assert.equal(hero.getAttribute('data-skip-target'), '', 'skipping to content must reach the record');
    assert.equal(hero.getAttribute('tabindex'), '-1', 'so the shell can put focus on it');

    const heading = hero.querySelector('h1');
    const names = findByClass(heading, 'lang-ja').map((node) => node.textContent);
    assert.deepEqual(names, [focused.titleJa], 'the heading is the model, not "model status and medical review"');

    // And the record itself is above the ledger, not inside it.
    const lead = findByClass(element, 'trust-lead-record')[0];
    assert.ok(lead, 'the focused record has its own section');
    const inLead = findByClass(lead, 'trust-card');
    assert.equal(inLead.length, 1);
    assert.equal(inLead[0].getAttribute('id'), `trust-${focused.slug}`);
    assert.equal(inLead[0].tagName, 'SECTION', 'shown outright, with nothing to expand');

    // Not also left in the list below it: one record, one place.
    const grid = findByClass(element, 'trust-grid')[0];
    assert.equal(
      findByClass(grid, 'trust-card').some((card) => card.getAttribute('id') === `trust-${focused.slug}`),
      false,
      'the focused record must be moved out of the ledger, not copied above it'
    );
    assert.ok(findByClass(element, 'trust-others-heading')[0], 'and the ledger says what it now is');
  });
});

test('Trust: a focused record shows review state without publication jargon', () => {
  withFakeBrowser(() => {
    const element = mountTrust({ focusId: RELEASED_SCENES[0].id });
    assert.deepEqual(findByClass(element, 'trust-standing'), []);
    assert.deepEqual(findByClass(element, 'trust-maturity'), []);
    assert.ok(findByClass(element, 'trust-review-badge')[0], 'medical review remains visible');
  });
});

test('Trust with no model named is unchanged: the ledger, and nothing promoted', () => {
  withFakeBrowser(() => {
    const element = mountTrust();
    assert.deepEqual(findByClass(element, 'trust-lead-record'), []);
    assert.deepEqual(findByClass(element, 'trust-others-heading'), []);
    assert.deepEqual(findByClass(element, 'trust-standing'), []);
    const hero = findByClass(element, 'trust-hero')[0];
    assert.equal(hero.classList.contains('is-model'), false);
    assert.equal(findByClass(findByClass(element, 'trust-grid')[0], 'trust-card').length, RELEASED_SCENES.length);
  });
});

test('Trust: a focus id also matches by slug, and an unknown focus id promotes nothing', () => {
  withFakeBrowser(() => {
    const focused = PUBLIC_SCENES[0];
    const bySlug = mountTrust({ focusId: focused.slug });
    // Promoted, not opened: the record the route names is lifted out of the
    // ledger into its own section, so "which one did the route pick" is asked
    // of that section rather than of an `open` attribute.
    const promoted = findByClass(bySlug, 'trust-lead-record')[0];
    assert.ok(promoted, 'a slug must resolve the same as an id');
    assert.deepEqual(
      findByClass(promoted, 'trust-card').map((card) => card.getAttribute('id')),
      [`trust-${focused.slug}`]
    );

    const unknown = mountTrust({ focusId: 'not-a-real-scene' });
    assert.deepEqual(findByClass(unknown, 'trust-lead-record'), []);
    const openUnknown = findByClass(unknown, 'trust-card').filter((card) => card.getAttribute('open') === '');
    assert.deepEqual(openUnknown, [], 'and it opens nothing in the ledger either');
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
      const promoted = findByClass(element, 'trust-lead-record')[0];
      assert.ok(promoted, `${scene.id}: its own link must promote its own record`);
      assert.deepEqual(
        findByClass(promoted, 'trust-card').map((card) => card.getAttribute('id')),
        [`trust-${scene.slug}`],
        `${scene.id}: and it must be that scene's record, not another's`
      );
      // The page is headed by that model, so a reader arriving from inside it
      // is not asked to find it.
      const heading = findByClass(element, 'trust-hero')[0].querySelector('h1');
      assert.deepEqual(
        findByClass(heading, 'lang-ja').map((node) => node.textContent),
        [scene.titleJa]
      );
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

test('Trust says so when nothing matches, and offers the way back', () => {
  // Narrowing to zero used to leave a heading, a search box and seven thousand
  // pixels of nothing, explained only by a grey line reading `71件中 0件` —
  // above the fold, while the emptiness was below it. A reader who mistypes a
  // model name gets a page that looks broken.
  withFakeBrowser(() => {
    const element = mountTrust();
    const field = findByClass(element, 'trust-filter-field')[0];
    const empty = findByClass(element, 'trust-empty')[0];
    assert.ok(empty, 'there is an empty state to show');
    assert.equal(empty.hidden, true, 'and it is hidden while there is anything to see');

    field.value = 'zzzz-no-such-model';
    field.dispatchEvent({ type: 'input' });
    assert.equal(
      findByClass(element, 'trust-card').filter((card) => !card.hidden).length,
      0,
      'nothing matches'
    );
    assert.equal(empty.hidden, false, 'so the page says so');

    // And the way out is a control, not a sentence telling the reader to undo
    // it themselves.
    const clear = findByClass(element, 'trust-empty-clear')[0];
    assert.ok(clear, 'the empty state offers a way back');
    clear.dispatchEvent({ type: 'click' });
    assert.equal(field.value, '', 'which clears what was typed');
    assert.equal(
      findByClass(element, 'trust-card').filter((card) => !card.hidden).length,
      RELEASED_SCENES.length,
      'and brings every published record back'
    );
    assert.equal(empty.hidden, true);
  });
});
