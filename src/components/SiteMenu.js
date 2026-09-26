import { el } from '../utils/dom.js';
import { inLanguage, onLanguageChange } from '../utils/language.js';

/**
 * The one menu every screen opens from the same corner.
 *
 * ## Why one
 *
 * Before this, a 3D model had a model drawer that the beta took away (its
 * contents duplicated the organ row), the reading surfaces had no menu at all,
 * and the controls that belong to the whole site were wherever each surface
 * happened to put them: the language switch and the feedback button in a row
 * under a scene's parts list, beside "hide the panels"; the account button in a
 * document header on one screen and nowhere on the next. Moving between a
 * model and a page moved the controls, which is how a reader learns that the
 * header is not a landmark.
 *
 * So the header has three zones on every screen — who (the wordmark, which is
 * the way home), where (the navigation that screen needs), and you (language
 * and account) — and this menu, last in the row, holds whatever of those the
 * row cannot show at the current width, plus what no row should carry
 * (legal pages, feedback). Sections are layers, in this order:
 *
 *   models    → organ, then layer within the organ
 *   pages     → the site's other destinations
 *   settings  → language, account
 *   support   → feedback, legal
 *
 * **Nothing appears twice.** A section whose content is already on screen in
 * the row is not rendered, and a section left empty by the width hides itself.
 * `tests/site-menu.test.js` holds that.
 *
 * ## What it is, mechanically
 *
 * A modal panel: focus moves in and is trapped, the rest of the page is inert,
 * Escape and an outside press close it, and focus goes back to the trigger.
 * Shown in the browser's top layer (`popover="manual"`) where there is one, so
 * no page's stacking can paint over it — see `showInTopLayer`. Not `<dialog>`:
 * the scene header is built and tested in `node --test`, where there is no
 * `showModal`, and this is the behaviour the scene drawer already had and
 * `verify:ui` already walks (`checkSiteMenu`).
 */

const FOCUSABLE =
  'summary,a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
  'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * The nearest node from `start` up to (and including) `stop` that passes.
 *
 * Walked by hand rather than with `closest(selector)`: attribute selectors are
 * what this needs, and the test DOM answers `closest` for `#id`, `.class` and
 * tag names only. A guard that silently never matched there would be a menu
 * that is untestable exactly where it makes its decisions.
 */
function ancestor(start, stop, test) {
  for (let node = start; node; node = node.parentElement) {
    if (test(node)) return node;
    if (node === stop) break;
  }
  return null;
}

const hasAttribute = (name) => (node) => node.getAttribute?.(name) != null;

const dual = (en, ja, className = '') =>
  el('span', { class: className }, [
    el('span', { class: 'lang-en', text: en }),
    el('span', { class: 'lang-ja', text: ja ?? en }),
  ]);

/**
 * @typedef {object} MenuSection
 * @property {string} id
 * @property {{en:string, ja:string}} title
 * @property {Array<Node|null|undefined>} [children]
 */

/**
 * @param {object} options
 * @param {string} [options.id] the panel's id, which the trigger points at
 * @param {MenuSection[]} [options.sections]
 * @param {Document} [options.doc]
 */
export function createSiteMenu({ id = 'site-menu', sections = [], doc = globalThis.document } = {}) {
  let open = false;
  /** Every node made inert on open, and what it was before. */
  const inertBefore = new Map();

  const trigger = el(
    'button',
    {
      class: 'site-menu-trigger',
      type: 'button',
      'aria-expanded': 'false',
      'aria-controls': id,
      'aria-haspopup': 'dialog',
    },
    [
      el('span', { class: 'site-menu-icon', 'aria-hidden': 'true' }, [el('span'), el('span'), el('span')]),
      dual('Menu', 'メニュー', 'site-menu-trigger-label'),
    ]
  );

  const closeButton = el('button', {
    class: 'site-menu-close',
    type: 'button',
    text: '×',
  });

  const backdrop = el('div', { class: 'site-menu-backdrop', hidden: '', 'aria-hidden': 'true' });

  /** @type {Map<string, {section:HTMLElement, body:HTMLElement}>} */
  const sectionById = new Map();
  const sectionNodes = sections.map((spec) => {
    const headingId = `${id}-${spec.id}`;
    const body = el('div', { class: 'site-menu-section-body' }, spec.children ?? []);
    const section = el(
      'section',
      { class: `site-menu-section is-${spec.id}`, 'aria-labelledby': headingId, 'data-menu-section': spec.id },
      [el('h2', { class: 'site-menu-section-title', id: headingId }, [dual(spec.title.en, spec.title.ja)]), body]
    );
    sectionById.set(spec.id, { section, body });
    return section;
  });

  const panel = el(
    'div',
    {
      id,
      class: 'site-menu-panel',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': inLanguage('Menu', 'メニュー'),
      hidden: '',
    },
    [
      el('div', { class: 'site-menu-head' }, [
        el('p', { class: 'site-menu-title' }, [dual('Menu', 'メニュー')]),
        closeButton,
      ]),
      el('div', { class: 'site-menu-body' }, sectionNodes),
    ]
  );

  // One language, the one on screen: an attribute cannot hold both.
  onLanguageChange(() => {
    trigger.setAttribute('aria-label', inLanguage('Menu', 'メニュー'));
    closeButton.setAttribute('aria-label', inLanguage('Close the menu', 'メニューを閉じる'));
    panel.setAttribute('aria-label', inLanguage('Menu', 'メニュー'));
  });

  /**
   * Hide a section that has nothing to show.
   *
   * The settings section is empty on a wide screen, where language and account
   * sit in the row; printing its heading over nothing is the "second door"
   * this menu promises not to be, in reverse — a door onto no room. A child
   * counts when it is not itself hidden, so a row whose control moved out
   * empties its section too.
   */
  function refresh() {
    for (const { section, body } of sectionById.values()) {
      const visible = [...(body.children ?? [])].some((child) => !child.hidden);
      section.hidden = !visible;
    }
  }
  refresh();

  /**
   * Everything outside the menu's own ancestry, made inert.
   *
   * Walked from the panel up to `<body>`, making each ancestor's siblings
   * inert, because the two headers sit at different depths — the scene's is a
   * child of `#ui`, a document's is inside the surface's `<main>` — and a rule
   * written for one of them leaves the other's page reachable behind a modal.
   */
  function setBackgroundInert(enabled) {
    if (!enabled) {
      for (const [node, was] of inertBefore) node.inert = was;
      inertBefore.clear();
      return;
    }
    const body = doc?.body ?? null;
    for (let node = panel; node && node !== body; node = node.parentElement) {
      const parent = node.parentElement;
      if (!parent) break;
      for (const sibling of parent.children ?? []) {
        if (sibling === node || !sibling || typeof sibling !== 'object') continue;
        // The trigger stays live: it is how the menu is closed again.
        if (sibling === trigger || sibling.contains?.(trigger)) continue;
        if (!inertBefore.has(sibling)) inertBefore.set(sibling, Boolean(sibling.inert));
        sibling.inert = true;
      }
    }
  }

  function focusable() {
    return [...(panel.querySelectorAll?.(FOCUSABLE) ?? [])].filter(
      (node) => !node.hidden && !node.disabled && node.offsetParent !== null
    );
  }

  function trapTab(event) {
    if (event.key !== 'Tab' || !open) return;
    const stops = focusable();
    if (!stops.length) return;
    const first = stops[0];
    const last = stops[stops.length - 1];
    const active = doc?.activeElement;
    if (event.shiftKey && (active === first || !panel.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  const listeners = new Set();

  /**
   * The open menu lives in the browser's top layer.
   *
   * Above every stacking context on every screen, by construction. Before
   * this it was an ordinary fixed box inside the header, so whether it was on
   * top depended on the header's own `z-index` against whatever each page put
   * beside it: the landing hero's caption (z-index 4) painted across it, and a
   * rule raising the open header to 60 fixed that on some runs of `verify:ui`
   * and not others. A modal is exactly what the top layer is for.
   *
   * `popover="manual"`: no light dismiss of its own — Escape, the close button
   * and an outside press are already handled here, and the menu has to
   * control its own focus and inert background either way. Where popovers are
   * unsupported (and under `node --test`) the calls are absent, and the panel
   * is the fixed box it was, with the header raised while it is open.
   */
  const topLayer = typeof panel.showPopover === 'function';
  if (topLayer) panel.setAttribute('popover', 'manual');
  function showInTopLayer(visible) {
    if (!topLayer) return;
    try {
      if (visible && !panel.matches(':popover-open')) panel.showPopover();
      if (!visible && panel.matches(':popover-open')) panel.hidePopover();
    } catch {
      // Not connected yet, or already in the state asked for. The panel's
      // `hidden` attribute has already said what the reader should see.
    }
  }

  /**
   * Put the panel under the button, inside the window.
   *
   * Measured from the trigger rather than laid out against the header,
   * because the headers are not where one rule would put them: the landing
   * page's sits inside a 1400 px column with 24 px margins, the documents' runs
   * edge to edge, the 3D model's floats. Anchored to the header, the landing
   * page's panel opened 30 px off the left edge of a 390 px phone.
   *
   * Written as custom properties so the stylesheet keeps the say over
   * everything else about the panel.
   */
  function position() {
    const view = doc?.defaultView ?? globalThis.window;
    const box = trigger.getBoundingClientRect?.();
    if (!view || !box || !panel.style?.setProperty) return;
    // Below the whole header, not below the button: on a phone the 3D header
    // has a second row (the organ's layers) under the button, and a panel
    // hung from the button covered exactly the row it belongs beside.
    const host = ancestor(trigger, null, (node) => node.classList?.contains?.('has-site-menu'));
    const bottom = Math.max(box.bottom, host?.getBoundingClientRect?.().bottom ?? 0);
    const margin = 8;
    const viewport = view.innerWidth || doc.documentElement?.clientWidth || 0;
    const width = Math.min(380, viewport - margin * 2);
    const right = Math.min(Math.max(margin, viewport - box.right), viewport - margin - width);
    panel.style.setProperty('--site-menu-top', `${Math.round(bottom + margin)}px`);
    panel.style.setProperty('--site-menu-right', `${Math.round(Math.max(margin, right))}px`);
    panel.style.setProperty('--site-menu-width', `${Math.round(width)}px`);
  }
  const onResize = () => {
    if (open) position();
  };

  function setOpen(next, { restoreFocus = false } = {}) {
    if (open === next) return;
    open = next;
    refresh();
    if (open) position();
    panel.hidden = !open;
    backdrop.hidden = !open;
    showInTopLayer(open);
    trigger.setAttribute('aria-expanded', String(open));
    ancestor(trigger, null, (node) => node.classList?.contains?.('has-site-menu'))
      ?.classList.toggle('is-menu-open', open);
    setBackgroundInert(open);
    if (open) closeButton.focus?.();
    else if (restoreFocus && trigger.isConnected !== false) trigger.focus?.();
    for (const listener of listeners) listener(open);
  }

  trigger.addEventListener('click', () => setOpen(!open, { restoreFocus: !open }));
  closeButton.addEventListener('click', () => setOpen(false, { restoreFocus: true }));
  backdrop.addEventListener('click', () => setOpen(false, { restoreFocus: true }));
  panel.addEventListener('keydown', trapTab);

  /**
   * An item that takes the reader somewhere closes the menu **before** it acts.
   *
   * Captured, not bubbled. A link is indifferent to the order, but the account
   * and feedback buttons open dialogs of their own — and a dialog opened while
   * this menu still has the page inert is opened inside an inert subtree, where
   * its first `focus()` silently does nothing. Closing first restores the page
   * and then lets the button's own handler run.
   *
   * Controls that change something *in* the menu (the language switch, a
   * favourite) say `data-menu-keep-open`, because closing on them would hide
   * the one confirmation the reader gets that it worked.
   */
  panel.addEventListener(
    'click',
    (event) => {
      const item = ancestor(event.target, panel, (node) =>
        node.tagName === 'BUTTON' || (node.tagName === 'A' && node.getAttribute?.('href') != null)
      );
      if (!item || item === panel || item === closeButton || !panel.contains(item)) return;
      if (ancestor(item, panel, hasAttribute('data-menu-keep-open'))) return;
      setOpen(false);
    },
    true
  );

  /**
   * Listeners on `document` outlive a header a page swap removed, and each
   * surface builds a new header. One that finds its trigger gone retires.
   */
  let mounted = false;
  const retiredIfGone = () => {
    if (trigger.isConnected) {
      mounted = true;
      return false;
    }
    // Never retire a header that was never on screen: `node --test` builds
    // headers that are not in any document, and they have to keep working.
    if (!mounted) return false;
    doc?.removeEventListener?.('keydown', onDocumentKeydown);
    doc?.removeEventListener?.('pointerdown', onDocumentPointerdown);
    globalThis.window?.removeEventListener?.('resize', onResize);
    return true;
  };
  const onDocumentKeydown = (event) => {
    if (retiredIfGone()) return;
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation?.();
      setOpen(false, { restoreFocus: true });
    }
  };
  const onDocumentPointerdown = (event) => {
    if (retiredIfGone() || !open) return;
    const target = event.target;
    if (trigger.contains(target)) return;
    // A press on the top layer's `::backdrop` is reported against the panel
    // itself, so "inside the panel" is asked of the coordinates too.
    const box = panel.getBoundingClientRect?.();
    const outsideBox = Boolean(box) && Number.isFinite(event.clientX) && (
      event.clientX < box.left || event.clientX > box.right ||
      event.clientY < box.top || event.clientY > box.bottom
    );
    if (panel.contains(target) && !outsideBox) return;
    setOpen(false, { restoreFocus: true });
  };
  doc?.addEventListener?.('keydown', onDocumentKeydown);
  doc?.addEventListener?.('pointerdown', onDocumentPointerdown);
  globalThis.window?.addEventListener?.('resize', onResize);

  return {
    trigger,
    backdrop,
    panel,
    /** The body of a section, to put nodes into after construction. */
    section: (sectionId) => sectionById.get(sectionId)?.body ?? null,
    refresh,
    get isOpen() {
      return open;
    },
    open: () => setOpen(true),
    close: (options) => setOpen(false, options),
    onToggle(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      setOpen(false);
      doc?.removeEventListener?.('keydown', onDocumentKeydown);
      doc?.removeEventListener?.('pointerdown', onDocumentPointerdown);
      globalThis.window?.removeEventListener?.('resize', onResize);
      listeners.clear();
    },
  };
}

/**
 * A labelled row in the settings section, with a slot its control moves into.
 *
 * @param {{en:string, ja:string}} label
 * @param {string} name which utility this row holds
 */
export function menuSettingRow(label, name) {
  const slot = el('div', { class: 'site-menu-setting-control', 'data-utility-slot': name });
  const row = el('div', { class: 'site-menu-setting', 'data-utility-row': name, hidden: '' }, [
    dual(label.en, label.ja, 'site-menu-setting-label'),
    slot,
  ]);
  return { row, slot };
}

/**
 * Where the reader's own controls stand: in the row when it is wide enough,
 * in the menu when it is not.
 *
 * The same nodes, moved — not a copy in each place. The account button is made
 * once by the access layer and its listeners live on it; two copies of a
 * language switch is how one of them comes to show the other language.
 *
 * `matchMedia` is absent under `node --test`, where the row is the answer:
 * a test that builds a header should find the controls where a desktop reader
 * would.
 *
 * @param {object} options
 * @param {HTMLElement} options.bar   the row's slot
 * @param {Record<string, {node:HTMLElement|null, row:HTMLElement, slot:HTMLElement}>} options.items
 * @param {ReturnType<typeof createSiteMenu>} options.menu
 * @param {string} [options.query] when the row holds them
 * @param {Window} [options.windowRef]
 * @returns {() => void} stop following the width
 */
export function dockUtilities({ bar, items, menu, query = UTILITIES_IN_ROW, windowRef = globalThis.window }) {
  const media = typeof windowRef?.matchMedia === 'function' ? windowRef.matchMedia(query) : null;
  const stop = () => media?.removeEventListener?.('change', follow);

  /**
   * @param {{claim: boolean}} options `claim` on the first placement only: that
   *   is this header taking the controls. After it, a width change moves only
   *   the controls this header still holds.
   */
  function place({ claim }) {
    const inRow = media ? media.matches : true;
    let holding = 0;
    for (const { node, row, slot } of Object.values(items)) {
      if (!node) {
        row.hidden = true;
        continue;
      }
      // The account button is one node handed from surface to surface. The
      // header of a page that has been swapped out no longer holds it, and
      // must not take it back from the header on screen: asked by ownership,
      // not by `isConnected`, because a header can be removed without ever
      // having seen a width change.
      const held = node.parentElement === bar || node.parentElement === slot;
      if (!claim && !held) {
        row.hidden = true;
        continue;
      }
      holding += 1;
      if (inRow) {
        if (node.parentElement !== bar) bar.append(node);
        row.hidden = true;
      } else {
        if (node.parentElement !== slot) slot.append(node);
        row.hidden = false;
      }
    }
    bar.hidden = !inRow || holding === 0;
    menu.refresh();
    return holding;
  }

  function follow() {
    // Holding nothing any more: another header has every control this one
    // had. It has no reason to go on listening.
    if (place({ claim: false }) === 0) stop();
  }

  place({ claim: true });
  media?.addEventListener?.('change', follow);
  return stop;
}

/**
 * The width from which the header row carries language and account itself.
 *
 * One number for every screen, so the controls never sit in the row on one
 * page and in the menu on the next at the same window size. Chosen for the
 * scene header, which is the fullest: wordmark, four organs, a layer switch,
 * both controls and the menu fit in one row at 981 px and not much below it.
 */
export const UTILITIES_IN_ROW = '(min-width: 981px)';

/**
 * The pages every screen can reach and no header row carries.
 *
 * The same four, in the same order and words, as the landing page's footer —
 * which was the only way to them, so a reader on a 3D model or on the
 * publication record had no route to the terms at all.
 */
export const SUPPORT_LINKS = Object.freeze([
  Object.freeze({ href: '#/terms', en: 'Terms', ja: '利用規約' }),
  Object.freeze({ href: '#/privacy', en: 'Privacy', ja: 'プライバシー' }),
  Object.freeze({ href: '#/commerce', en: 'Commercial disclosure', ja: '特定商取引法に基づく表記' }),
  Object.freeze({ href: '#/support', en: 'Support', ja: 'サポート' }),
]);

/**
 * Published models as the menu lists them: one row per organ, one link per
 * layer inside it.
 *
 * @param {ReturnType<typeof import('../app/modelNavigation.js').organLayerNavigation>} navigation
 */
export function organLayerList(navigation) {
  return el(
    'ul',
    { class: 'site-menu-organs' },
    navigation.organs.map((organ) =>
      el('li', { class: `site-menu-organ${organ.current ? ' is-current' : ''}` }, [
        dual(organ.name.en, organ.name.ja, 'site-menu-organ-name'),
        el(
          'span',
          { class: 'site-menu-organ-models' },
          organ.models.map((model) =>
            el(
              'a',
              {
                class: `site-menu-model${model.current ? ' is-current' : ''}`,
                href: model.route,
                ...(model.current ? { 'aria-current': 'page' } : {}),
              },
              [
                model.showKind ? dual(model.kind.en, model.kind.ja, 'site-menu-model-kind') : null,
                dual(model.name.en, model.name.ja, 'site-menu-model-name'),
              ]
            )
          )
        ),
      ])
    )
  );
}

/**
 * @typedef {object} MenuPage
 * @property {string} href
 * @property {string} en
 * @property {string} ja
 * @property {boolean} [current]
 */

/**
 * The site menu with its four layers, and the row slot for language and account.
 *
 * @param {object} options
 * @param {string} options.id
 * @param {Array<Node>|null} [options.models] the model section, when the row
 *   does not already reach every model this screen can open
 * @param {MenuPage[]} [options.pages] destinations the row does not carry
 * @param {Document} [options.doc]
 * @param {Window} [options.windowRef]
 */
export function createSiteHeaderMenu({
  id,
  models = null,
  pages = [],
  doc = globalThis.document,
  windowRef = globalThis.window,
}) {
  const language = menuSettingRow({ en: 'Language', ja: '表示言語' }, 'language');
  const account = menuSettingRow({ en: 'Account', ja: 'アカウント' }, 'account');
  const feedbackSlot = el('div', { class: 'site-menu-feedback', hidden: '' });

  const pageLinks = pages.map((page) =>
    el(
      'a',
      {
        class: 'site-menu-link',
        href: page.href,
        ...(page.current ? { 'aria-current': 'page' } : {}),
      },
      [dual(page.en, page.ja)]
    )
  );

  const menu = createSiteMenu({
    id,
    doc,
    sections: [
      models ? { id: 'models', title: { en: 'Models', ja: 'モデル' }, children: models } : null,
      pageLinks.length ? { id: 'pages', title: { en: 'Pages', ja: 'ページ' }, children: pageLinks } : null,
      { id: 'settings', title: { en: 'Settings', ja: '設定' }, children: [language.row, account.row] },
      {
        id: 'support',
        title: { en: 'Support & legal', ja: 'サポート・規約' },
        children: [
          feedbackSlot,
          el(
            'nav',
            { class: 'site-menu-legal', 'aria-label': inLanguage('Legal and support', '規約・サポート') },
            SUPPORT_LINKS.map((link) => el('a', { class: 'site-menu-link', href: link.href }, [dual(link.en, link.ja)]))
          ),
        ],
      },
    ].filter(Boolean),
  });

  const utilities = el('div', { class: 'site-utilities', hidden: '' });
  const items = {
    account: { node: null, row: account.row, slot: account.slot },
    language: { node: null, row: language.row, slot: language.slot },
  };
  // The language switch changes what the menu says; closing on it would hide
  // the only confirmation that it worked.
  language.row.setAttribute('data-menu-keep-open', '');

  let stopDock = null;
  const redock = () => {
    stopDock?.();
    stopDock = dockUtilities({ bar: utilities, items, menu, windowRef });
  };
  redock();

  return {
    menu,
    utilities,
    /** @type {import('../app/headerDock.js').HeaderDock['dock']} */
    dock(name, node) {
      if (!node) return false;
      if (name === 'feedback') {
        node.classList?.remove?.('is-floating');
        feedbackSlot.replaceChildren(node);
        feedbackSlot.hidden = false;
        menu.refresh();
        return true;
      }
      if (!items[name]) return false;
      items[name].node = node;
      redock();
      return true;
    },
    destroy() {
      stopDock?.();
      menu.destroy();
    },
  };
}
