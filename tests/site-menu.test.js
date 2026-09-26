import test from 'node:test';
import assert from 'node:assert/strict';

import { createSiteHeaderMenu, createSiteMenu, dockUtilities, menuSettingRow } from '../src/components/SiteMenu.js';
import { createShellHeader } from '../src/components/ShellHeader.js';
import { createSceneSwitcher } from '../src/components/SceneSwitcher.js';
import { headerDockIn } from '../src/app/headerDock.js';
import { PUBLIC_MANIFEST } from '../src/catalog/publicManifest.js';
import { focusBack } from '../src/utils/dom.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

globalThis.requestAnimationFrame ??= (fn) => { fn(0); return 0; };

/**
 * The site menu: one on every screen, in layers, and never a second door.
 *
 * What the reader relies on, held here:
 *
 * - a section with nothing in it is not printed;
 * - language and account are in the row when it is wide and in the menu when
 *   it is not — the same nodes, moved, never copied;
 * - the menu does not offer what the row already does;
 * - a dialog opened from inside the menu gives focus back to the menu button,
 *   not to `<body>`.
 */

function withDocument(run, { lang = 'ja' } = {}) {
  const ui = new FakeElement('div');
  ui.dataset.lang = lang;
  const restore = installFakeDocument({ elements: { ui } });
  try {
    return run({ ui, doc: globalThis.document });
  } finally {
    restore();
  }
}

/** A `matchMedia` whose answer the test flips. */
function fakeMedia(matches) {
  const listeners = new Set();
  const media = {
    matches,
    addEventListener: (_type, fn) => listeners.add(fn),
    removeEventListener: (_type, fn) => listeners.delete(fn),
    set(next) {
      media.matches = next;
      for (const fn of listeners) fn();
    },
    listeners,
  };
  return { media, windowRef: { matchMedia: () => media } };
}

const button = (className) => {
  const node = new FakeElement('button');
  node.className = className;
  return node;
};

test('a section with nothing to show is not printed', () => {
  withDocument(() => {
    const filled = new FakeElement('a');
    filled.setAttribute('href', '#/trust');
    const hiddenRow = new FakeElement('div');
    hiddenRow.hidden = true;
    const menu = createSiteMenu({
      id: 'm',
      sections: [
        { id: 'pages', title: { en: 'Pages', ja: 'ページ' }, children: [filled] },
        { id: 'settings', title: { en: 'Settings', ja: '設定' }, children: [hiddenRow] },
      ],
    });
    const sections = findByClass(menu.panel, 'site-menu-section');
    assert.equal(sections[0].hidden, false, 'a section with a link is shown');
    assert.equal(sections[1].hidden, true, 'a section whose only row is hidden is not');

    hiddenRow.hidden = false;
    menu.refresh();
    assert.equal(sections[1].hidden, false, 'and it comes back when its row does');
  });
});

test('language and account sit in the row when it is wide, in the menu when it is not', () => {
  withDocument(() => {
    const { media, windowRef } = fakeMedia(true);
    const menu = createSiteMenu({ id: 'm' });
    const bar = new FakeElement('div');
    const account = menuSettingRow({ en: 'Account', ja: 'アカウント' }, 'account');
    const language = menuSettingRow({ en: 'Language', ja: '表示言語' }, 'language');
    const accountButton = button('account-trigger');
    const languageButton = button('ui-toggle');
    const stop = dockUtilities({
      bar,
      menu,
      windowRef,
      items: {
        account: { node: accountButton, row: account.row, slot: account.slot },
        language: { node: languageButton, row: language.row, slot: language.slot },
      },
    });

    assert.equal(accountButton.parentElement, bar, 'wide: the account button is in the row');
    assert.equal(languageButton.parentElement, bar);
    assert.equal(bar.hidden, false);
    assert.equal(account.row.hidden, true, 'and its menu row is not printed');

    media.set(false);
    assert.equal(accountButton.parentElement, account.slot, 'narrow: the same node, moved into the menu');
    assert.equal(languageButton.parentElement, language.slot);
    assert.equal(bar.hidden, true, 'the row slot goes with them');
    assert.equal(account.row.hidden, false);

    media.set(true);
    assert.equal(accountButton.parentElement, bar, 'and back');
    stop();
    assert.equal(media.listeners.size, 0, 'stopping stops following the width');
  });
});

test('a header a page swap took down never takes the account button back', () => {
  // The account button is one node handed from surface to surface. The first
  // version of this guard retired a detached header only once it had seen a
  // width change while mounted — so a page that was never resized, then
  // swapped out, still took the button back from the page on screen on the
  // next resize.
  withDocument(() => {
    const { media, windowRef } = fakeMedia(true);
    const accountButton = button('account-trigger');
    const dockIn = () => {
      const menu = createSiteMenu({ id: 'm' });
      const bar = new FakeElement('div');
      const account = menuSettingRow({ en: 'Account', ja: 'アカウント' }, 'account');
      dockUtilities({
        bar,
        menu,
        windowRef,
        items: { account: { node: accountButton, row: account.row, slot: account.slot } },
      });
      return { bar, account };
    };

    const previous = dockIn();
    assert.equal(accountButton.parentElement, previous.bar);
    // The next surface's header is built and takes the button.
    const next = dockIn();
    assert.equal(accountButton.parentElement, next.bar, 'the new header claims it');

    media.set(false);
    assert.equal(accountButton.parentElement, next.account.slot, 'the header on screen moves it into its menu');
    assert.equal(previous.account.row.hidden, true, 'the old header does not print a row for a button it lost');
    media.set(true);
    assert.equal(accountButton.parentElement, next.bar, 'and back into its row');
    assert.equal(media.listeners.size, 1, 'the old header stopped listening; only the one on screen follows the width');
  });
});

test('feedback docks in the support section, not floating over the page', () => {
  withDocument(() => {
    const site = createSiteHeaderMenu({ id: 'm', windowRef: fakeMedia(true).windowRef });
    const feedback = button('feedback-trigger is-floating');
    assert.equal(site.dock('feedback', feedback), true);
    const [support] = findByClass(site.menu.panel, 'is-support');
    assert.ok(support.contains(feedback), 'it is in the support section');
    assert.equal(feedback.classList.contains('is-floating'), false, 'and no longer styled to float');
    assert.equal(site.dock('elsewhere', button('x')), false, 'an unknown control is refused, not dropped somewhere');
  });
});

test('Escape and an item both close the menu; the language switch does not', () => {
  withDocument(({ doc }) => {
    const site = createSiteHeaderMenu({
      id: 'm',
      pages: [{ href: '#/trust', en: 'Publication & review', ja: '公開とレビュー' }],
      windowRef: fakeMedia(false).windowRef,
    });
    const languageButton = button('ui-toggle');
    site.dock('language', languageButton);
    const { menu } = site;

    menu.trigger.click();
    assert.equal(menu.isOpen, true);
    for (const listener of doc.listeners.get('keydown') ?? []) {
      listener({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
    }
    assert.equal(menu.isOpen, false, 'Escape closes it');

    menu.trigger.click();
    const [trust] = findByClass(menu.panel, 'site-menu-link');
    menu.panel.dispatchEvent({ type: 'click', target: trust });
    assert.equal(menu.isOpen, false, 'following a link closes it');

    menu.trigger.click();
    menu.panel.dispatchEvent({ type: 'click', target: languageButton });
    assert.equal(menu.isOpen, true, 'switching language keeps it open, so the change is visible');
  });
});

test('focus comes back to the menu button when the control that opened a dialog is in a closed menu', () => {
  withDocument(({ doc }) => {
    const opener = new FakeElement('button');
    const panel = new FakeElement('div');
    panel.id = 'site-menu';
    panel.setAttribute('role', 'dialog');
    const inside = new FakeElement('button');
    panel.append(inside);
    doc.querySelector = (selector) => (selector === '[aria-controls="site-menu"]' ? opener : null);

    panel.hidden = true;
    focusBack(inside);
    assert.equal(doc.activeElement, opener, 'a hidden control cannot take focus; the menu button can');

    panel.hidden = false;
    focusBack(inside);
    assert.equal(doc.activeElement, inside, 'with the menu open, the control itself');
  });
});

/** Every href in `root`, outside the menu panel and inside it. */
function hrefsOf(root) {
  const [panel] = findByClass(root, 'site-menu-panel');
  const links = [];
  const visit = (node, inMenu) => {
    if (!(node instanceof FakeElement)) return;
    const here = inMenu || node === panel;
    const href = node.getAttribute('href');
    if (node.tagName === 'A' && href) links.push({ href, inMenu: here });
    for (const child of node.children) visit(child, here);
  };
  visit(root, false);
  return {
    row: links.filter((link) => !link.inMenu).map((link) => link.href),
    menu: links.filter((link) => link.inMenu).map((link) => link.href),
  };
}

test('the reading header: the menu lists the models, and nothing the row already offers', () => {
  withDocument(() => {
    const header = createShellHeader({ current: 'home', showLab: false });
    const { row, menu } = hrefsOf(header);
    assert.deepEqual(row.filter((href) => menu.includes(href)), [], 'no destination is both in the row and the menu');
    for (const model of PUBLIC_MANIFEST.models) {
      assert.ok(menu.includes(model.route), `${model.sceneId} is reachable from the menu`);
    }
    assert.ok(headerDockIn({ querySelector: () => header }), 'the header registers where site controls go');
  });
});

test('the 3D header in the beta: the menu offers none of the models the row already does', () => {
  withDocument(() => {
    const groups = PUBLIC_MANIFEST.models.map((model) => ({
      id: model.organId,
      label: model.organLabel,
      labelJa: model.organLabelJa,
      scenes: [{ id: model.sceneId, slug: model.sceneId, organ: model.organId, status: 'alpha', uses: [], label: model.titleEn, labelJa: model.titleJa, tags: [] }],
    }));
    const switcher = createSceneSwitcher({ groups, currentId: PUBLIC_MANIFEST.models[0].sceneId, showLab: false });
    const { row, menu } = hrefsOf(switcher.element);
    assert.deepEqual(row.filter((href) => menu.includes(href)), [], 'no destination is both in the row and the menu');
    assert.ok(menu.includes('#/trust'), 'the menu carries the page the row does not');
  });
});
