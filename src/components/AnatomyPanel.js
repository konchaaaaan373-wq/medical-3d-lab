import { el } from '../utils/dom.js';
import '../styles/anatomy-panel.css';

/**
 * The anatomy side panel: one selection, three ways of working with it.
 *
 * ## The problem this exists to fix
 *
 * The parts, the display controls and the selected structure's description used
 * to be three panels stacked in one scrolling rail. Scrolling to a structure
 * near the bottom of four hundred pushed the card naming it off the top, so a
 * reader ended up looking at a highlighted row with the answer out of sight.
 *
 * Two obvious repairs were tried and both are worse. Pinning the card with
 * `position: sticky` makes it float over the rows underneath it — the occlusion
 * `npm run verify:ui` exists to catch. Giving the list its own scroll box puts a
 * scroller inside a scroller, which leaves rows straddling a clip edge:
 * readable, not clickable. Neither is used here, and both are recorded in
 * `docs/follow-ups.md` so the next person does not re-derive them.
 *
 * What works is a layout rather than a stacking trick. The summary is a flex
 * sibling of the body, not an overlay: it holds its own row and cannot be
 * scrolled away because it is not in anything that scrolls. **Exactly one
 * region scrolls — the body of the tab that is showing.**
 *
 * ## The three tabs
 *
 * - **Parts** — the tree. What is there.
 * - **Display** — the shared inspection controls and the colour key. How it
 *   looks. Both are the app's existing components, passed in rather than
 *   rebuilt, so there is one of each on the page.
 * - **Detail** — the selected structure's description, the model's limits and
 *   where it came from.
 *
 * ## On a phone, and on a short window
 *
 * The model is what a reader came for, so it keeps the screen. The summary and
 * a **Parts** button stay; the tabbed body becomes a sheet that button opens.
 * It is a modal, so it behaves like one: the background goes inert, Escape
 * closes it, focus moves in and comes back to the button that opened it. The
 * close control sits in the sheet's own header rather than at the end of the
 * list, so a reader four hundred rows down does not have to scroll back to
 * leave. Opening and closing changes nothing about the selection, the expanded
 * branches or where the list was scrolled to — the sheet is shown and hidden,
 * never rebuilt.
 *
 * @param {object} options
 * @param {object} options.scene an anatomy scene satisfying `app/anatomyContract.js`
 * @param {{element: HTMLElement, structureCount: number}} options.tree the part tree
 * @param {HTMLElement} options.display the shared inspection panel's element
 * @param {HTMLElement} [options.legend] the colour key, which belongs with the colours
 * @param {HTMLElement} options.detail the selection's description
 * @param {(layout: 'docked'|'sheet') => void} [options.onLayout] told which
 *   layout the panel is in, so the app shell can lay the rail out around it.
 */
export function createAnatomyPanel({ scene, tree, display, legend = null, detail, onLayout }) {
  const TABS = [
    { id: 'parts', en: 'Parts', ja: '部位', content: tree.element },
    { id: 'display', en: 'Display', ja: '表示', content: el('div', { class: 'anatomy-panel-display' }, [display, legend]) },
    { id: 'detail', en: 'Detail', ja: '詳細', content: detail },
  ];
  let activeTab = 'parts';
  let sheetOpen = false;
  let opener = null;

  // --- summary: the pinned structure, and what you can do to it --------------

  const swatch = el('span', { class: 'anatomy-panel-swatch', 'aria-hidden': 'true' });
  const nameEn = el('strong', { class: 'anatomy-panel-name lang-en' });
  const nameJa = el('strong', { class: 'anatomy-panel-name lang-ja' });
  const whereEn = el('span', { class: 'anatomy-panel-where lang-en' });
  const whereJa = el('span', { class: 'anatomy-panel-where lang-ja' });

  const isolateButton = el('button', {
    class: 'anatomy-panel-action',
    type: 'button',
    'aria-pressed': 'false',
    hidden: true,
    on: { click: toggleIsolation },
  });
  const showAllButton = el('button', {
    class: 'anatomy-panel-action is-restore',
    type: 'button',
    hidden: true,
    on: { click: () => scene.clearIsolation() },
  }, [
    el('span', { class: 'lang-en', text: 'Show all' }),
    el('span', { class: 'lang-ja', text: '全体に戻す' }),
  ]);
  const partsButton = el('button', {
    class: 'anatomy-panel-open',
    type: 'button',
    'aria-expanded': 'false',
    on: { click: () => openSheet('parts') },
  }, [
    el('span', { class: 'lang-en', text: 'Parts' }),
    el('span', { class: 'lang-ja', text: '部位' }),
  ]);

  const summary = el('div', { class: 'anatomy-panel-summary' }, [
    el('div', { class: 'anatomy-panel-heading' }, [
      swatch,
      el('div', { class: 'anatomy-panel-names' }, [nameEn, nameJa, whereEn, whereJa]),
    ]),
    el('div', { class: 'anatomy-panel-actions' }, [isolateButton, showAllButton, partsButton]),
  ]);

  // --- body: the tabs, and the one region that scrolls ----------------------

  const body = el('div', { class: 'anatomy-panel-body' });
  const tabButtons = new Map();
  const tabList = el('div', { class: 'anatomy-panel-tabs', role: 'tablist', 'aria-label': 'Panel section / パネルの内容' },
    TABS.map((tab) => {
      const button = el('button', {
        class: 'anatomy-panel-tab',
        type: 'button',
        role: 'tab',
        id: `anatomy-tab-${tab.id}`,
        'aria-selected': 'false',
        'aria-controls': 'anatomy-panel-body',
        tabindex: '-1',
        on: { click: () => setTab(tab.id) },
      }, [
        el('span', { class: 'lang-en', text: tab.en }),
        el('span', { class: 'lang-ja', text: tab.ja }),
      ]);
      tabButtons.set(tab.id, button);
      return button;
    })
  );
  body.id = 'anatomy-panel-body';
  body.setAttribute('role', 'tabpanel');

  const closeButton = el('button', {
    class: 'anatomy-panel-close',
    type: 'button',
    'aria-label': 'Close parts / 部位パネルを閉じる',
    on: { click: () => closeSheet() },
  }, [el('span', { 'aria-hidden': 'true', text: '×' })]);

  // The close control lives in the sheet's header, above the scrolling body, so
  // it is reachable from anywhere in a four-hundred-row list.
  const sheet = el('div', { class: 'anatomy-panel-sheet' }, [
    el('div', { class: 'anatomy-panel-sheet-head' }, [tabList, closeButton]),
    body,
  ]);

  const element = el('section', {
    class: 'panel anatomy-panel',
    'aria-label': 'Anatomy / 解剖',
    dataset: { sheet: 'closed', layout: 'docked' },
  }, [summary, sheet]);

  /**
   * Where the body lives: beside the model, or over it.
   *
   * A height query as well as a width one, because a landscape phone is wide and
   * has 390 px to give — the case the first attempt at this answered by hiding
   * the tree outright, which is not an answer.
   *
   * The query drives a data attribute rather than the CSS driving itself,
   * because the panel has to *know* which layout it is in: opening the sheet is
   * meaningless when the body is already docked, and Escape should not be
   * listened for when there is nothing to close.
   */
  const SHEET_QUERY = '(max-width: 820px), (max-height: 560px)';
  const sheetMedia = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia(SHEET_QUERY)
    : null;

  function applyLayout() {
    const asSheet = Boolean(sheetMedia?.matches);
    element.dataset.layout = asSheet ? 'sheet' : 'docked';
    onLayout?.(asSheet ? 'sheet' : 'docked');
    // Rotating a phone into landscape must not leave a modal open over a layout
    // that has no way to close it — and must not disturb the selection, the
    // expanded branches or where the list was scrolled to, which is why the
    // sheet is shown and hidden rather than built and thrown away.
    if (!asSheet && sheetOpen) closeSheet();
  }
  sheetMedia?.addEventListener?.('change', applyLayout);

  function setTab(id) {
    if (!TABS.some((tab) => tab.id === id)) return false;
    activeTab = id;
    for (const [tabId, button] of tabButtons) {
      const on = tabId === id;
      button.setAttribute('aria-selected', String(on));
      button.tabIndex = on ? 0 : -1;
      button.classList.toggle('is-active', on);
    }
    const tab = TABS.find((entry) => entry.id === id);
    body.setAttribute('aria-labelledby', `anatomy-tab-${id}`);
    body.dataset.tab = id;
    body.replaceChildren(tab.content);
    // Each tab keeps its own scroll position; switching to a tab should show
    // its top rather than wherever the previous one happened to be.
    body.scrollTop = 0;
    return true;
  }

  // --- the sheet, on a phone or a short window -------------------------------

  const onKeydown = (event) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    closeSheet();
  };

  function openSheet(tab) {
    if (tab) setTab(tab);
    // Docked, the body is already on screen; there is nothing to open.
    if (sheetOpen || element.dataset.layout !== 'sheet') return;
    sheetOpen = true;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : partsButton;
    element.dataset.sheet = 'open';
    partsButton.setAttribute('aria-expanded', 'true');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Parts / 部位');
    // Everything behind the sheet stops being reachable — by pointer, by Tab
    // and to a screen reader — which is what makes this a modal rather than a
    // panel that happens to be on top.
    for (const sibling of backdropTargets()) sibling.inert = true;
    document.addEventListener('keydown', onKeydown, true);
    tabButtons.get(activeTab)?.focus();
  }

  function closeSheet() {
    if (!sheetOpen) return;
    sheetOpen = false;
    element.dataset.sheet = 'closed';
    partsButton.setAttribute('aria-expanded', 'false');
    sheet.removeAttribute('role');
    sheet.removeAttribute('aria-modal');
    sheet.removeAttribute('aria-label');
    for (const sibling of backdropTargets()) sibling.inert = false;
    document.removeEventListener('keydown', onKeydown, true);
    // Back to the control that opened it, so the reader is where they were and
    // not at the top of the document.
    (opener?.isConnected ? opener : partsButton).focus?.();
    opener = null;
  }

  /** Everything the sheet covers: the whole UI except this panel. */
  function backdropTargets() {
    const root = element.closest('#ui') ?? element.parentElement;
    if (!root) return [];
    return [...root.children].filter((child) => !child.contains(element));
  }

  // --- selection, isolation, and the rule about hover ------------------------

  /**
   * What the summary is about.
   *
   * A pinned selection wins over a hover. Reading `hovered ?? selected` — which
   * this did — meant moving the pointer across the model rewrote the name and
   * the controls beside it, so "Isolate" could act on a structure the reader had
   * never chosen. Hover previews only while nothing is pinned.
   */
  const subject = () => scene.getAnatomySelection() ?? scene.getAnatomyHover?.() ?? null;

  function paint() {
    const value = subject();
    const selection = scene.getAnatomySelection();
    const isolated = scene.getAnatomyIsolation();

    if (value) {
      nameEn.textContent = value.name;
      nameJa.textContent = value.nameJa;
      whereEn.textContent = value.breadcrumb ?? '';
      whereJa.textContent = value.breadcrumbJa ?? '';
      if (value.color) swatch.style.setProperty('--anatomy-color', value.color);
    } else {
      nameEn.textContent = 'Select a structure';
      nameJa.textContent = '部位を選択してください';
      whereEn.textContent = 'Point to preview · click or tap to select';
      whereJa.textContent = '触れて確認・クリック／タップで選択';
      swatch.style.removeProperty('--anatomy-color');
    }
    element.dataset.pinned = selection ? 'yes' : 'no';

    // The actions act on the pinned structure, never on the one under the
    // pointer, so they are absent until there is one.
    isolateButton.hidden = !selection;
    const isolatingSelection = Boolean(selection) && isolated === selection.id;
    isolateButton.setAttribute('aria-pressed', String(isolatingSelection));
    isolateButton.replaceChildren(
      el('span', { class: 'lang-en', text: isolatingSelection ? 'Show in place' : 'Isolate' }),
      el('span', { class: 'lang-ja', text: isolatingSelection ? '元の位置で表示' : 'この部位だけ' })
    );
    showAllButton.hidden = isolated == null;
  }

  function toggleIsolation() {
    const selection = scene.getAnatomySelection();
    if (!selection) return;
    if (scene.getAnatomyIsolation() === selection.id) scene.clearIsolation();
    else scene.isolateStructure(selection.id);
  }

  const unsubscribeSelection = scene.onAnatomySelection(paint);
  const unsubscribeHover = scene.onAnatomyHover?.(paint);
  const unsubscribeIsolation = scene.onAnatomyIsolation(paint);

  setTab('parts');
  applyLayout();
  paint();

  return {
    element,
    get activeTab() {
      return activeTab;
    },
    get sheetOpen() {
      return sheetOpen;
    },
    setTab,
    openSheet,
    closeSheet,
    /** Exposed so the console's display control can bring its tab forward. */
    showDisplay() {
      setTab('display');
      if (element.dataset.layout === 'sheet') openSheet('display');
    },
    dispose() {
      closeSheet();
      sheetMedia?.removeEventListener?.('change', applyLayout);
      unsubscribeSelection?.();
      unsubscribeHover?.();
      unsubscribeIsolation?.();
      element.remove();
    },
  };
}
