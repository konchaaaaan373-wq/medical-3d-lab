import { el } from '../utils/dom.js';
import { createAnatomyPartsFinder } from './AnatomyPartsFinder.js';
// The stylesheet is imported by `src/main.js`, with the rest of the app's CSS.
// Importing it from a component is how a component stops being testable under
// `node --test`, which is where this panel's behaviour is checked.

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
export function createAnatomyPanel({
  scene, tree, display, legend = null, detail, onLayout, onFocusStructure, onLayerChange,
}) {
  /**
   * The Parts tab is the tree with a way into it.
   *
   * The finder is given the tree element rather than a copy of its data: a
   * search covers the tree and clearing uncovers it, with the branches the
   * reader opened still open. It reads and writes the body's scroll through
   * this panel, because the body is the one region that scrolls and this panel
   * is what owns it.
   */
  const finder = scene.getAnatomyInventory
    ? createAnatomyPartsFinder({
        treeElement: tree.element,
        inventory: () => scene.getAnatomyInventory(),
        onSelect: (id) => scene.selectStructure(id),
        readScroll: () => body.scrollTop ?? 0,
        writeScroll: (top) => { body.scrollTop = top; },
      })
    : null;

  const TABS = [
    { id: 'parts', en: 'Parts', ja: '部位', content: finder ? finder.element : tree.element },
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
    dataset: { action: 'isolate' },
    on: { click: toggleIsolation },
  });
  const showAllButton = el('button', {
    class: 'anatomy-panel-action is-restore',
    type: 'button',
    hidden: true,
    // Named, because three different buttons on this row restore three
    // different things and a shared class cannot tell them apart.
    dataset: { action: 'show-all' },
    on: { click: () => scene.clearIsolation() },
  }, [
    el('span', { class: 'lang-en', text: 'Show all' }),
    el('span', { class: 'lang-ja', text: '全体に戻す' }),
  ]);
  /**
   * The three things a reader can ask about the structure they have picked, and
   * they are three because they are not the same request.
   *
   * **Go to it** moves the camera and changes no display state. **Show it**
   * changes the display — the layer, the view, a hide the reader had set — and
   * moves no anatomy. **Hide it** takes it off screen and leaves it selected.
   * Collapsing any two of these into one button is how "take me there" starts
   * silently rearranging the model, or how "show me" quietly means "and throw
   * away the view you set up".
   *
   * They appear when they apply, rather than sitting greyed out: a disabled
   * control that is painted, named and skipped by Tab is the worst of both.
   */
  const focusButton = el('button', {
    class: 'anatomy-panel-action',
    type: 'button',
    hidden: true,
    dataset: { action: 'focus' },
    on: { click: focusSelection },
  }, [
    el('span', { class: 'lang-en', text: 'Go to it' }),
    el('span', { class: 'lang-ja', text: '寄る' }),
  ]);
  const revealButton = el('button', {
    class: 'anatomy-panel-action',
    type: 'button',
    hidden: true,
    dataset: { action: 'reveal' },
    on: { click: revealSelection },
  }, [
    el('span', { class: 'lang-en', text: 'Show it' }),
    el('span', { class: 'lang-ja', text: '見える位置に表示' }),
  ]);
  const restoreDisplayButton = el('button', {
    class: 'anatomy-panel-action is-restore',
    type: 'button',
    hidden: true,
    dataset: { action: 'restore-display' },
    on: { click: restorePreviousDisplay },
  }, [
    el('span', { class: 'lang-en', text: 'Back to how it was' }),
    el('span', { class: 'lang-ja', text: '元の表示へ' }),
  ]);
  const hideButton = el('button', {
    class: 'anatomy-panel-action',
    type: 'button',
    hidden: true,
    dataset: { action: 'hide' },
    on: { click: toggleHidden },
  });
  const showHiddenButton = el('button', {
    class: 'anatomy-panel-action is-restore',
    type: 'button',
    hidden: true,
    dataset: { action: 'unhide-all' },
    on: { click: () => { scene.showAllHiddenStructures?.(); paint(); } },
  }, [
    el('span', { class: 'lang-en', text: 'Unhide all' }),
    el('span', { class: 'lang-ja', text: '非表示を解除' }),
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
    el('div', { class: 'anatomy-panel-actions' }, [
      focusButton, revealButton, isolateButton, hideButton,
      showAllButton, restoreDisplayButton, showHiddenButton, partsButton,
    ]),
  ]);

  // --- body: the tabs, and the one region that scrolls ----------------------

  const body = el('div', { class: 'anatomy-panel-body' });
  /** Where each tab was left, so coming back is coming back. */
  const scrollByTab = new Map(TABS.map((tab) => [tab.id, 0]));
  const tabButtons = new Map();
  /** The tab the Tab key lands on. Follows focus; the open tab is the default. */
  let ringTab = TABS[0].id;

  const tabList = el('div', {
    class: 'anatomy-panel-tabs',
    role: 'tablist',
    'aria-label': 'Panel section / パネルの内容',
    on: { keydown: onTabKeydown },
  },
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

  /** Exactly one tab is in the tab ring, so Tab enters the list once. */
  function setRingTab(id) {
    ringTab = id;
    for (const [tabId, button] of tabButtons) button.setAttribute('tabindex', tabId === id ? '0' : '-1');
  }

  function focusTab(id) {
    setRingTab(id);
    tabButtons.get(id)?.focus?.();
  }

  /**
   * The tab list's own keyboard, which it did not have.
   *
   * Every tab but the open one had `tabindex="-1"` and nothing moved between
   * them, so a keyboard reader could reach the list and then go no further: the
   * two tabs they had not chosen were unreachable without a mouse.
   *
   * Arrows move focus and open nothing. That is the manual-activation pattern,
   * and it is the right one here: the Display tab rebuilds a panel of controls
   * and Detail swaps the whole body, so arrowing past them to reach the third
   * would flash two surfaces the reader never asked for. Enter or Space opens.
   */
  function onTabKeydown(event) {
    const ids = TABS.map((tab) => tab.id);
    const current = [...tabButtons].find(([, button]) => button === event.target)?.[0] ?? ringTab;
    const at = ids.indexOf(current);
    let handled = true;

    switch (event.key) {
      case 'ArrowRight':
        focusTab(ids[(at + 1) % ids.length]);
        break;
      case 'ArrowLeft':
        focusTab(ids[(at - 1 + ids.length) % ids.length]);
        break;
      case 'Home':
        focusTab(ids[0]);
        break;
      case 'End':
        focusTab(ids[ids.length - 1]);
        break;
      case 'Enter':
      case ' ':
        setTab(current);
        focusTab(current);
        break;
      default:
        handled = false;
    }

    if (!handled) return;
    event.preventDefault();
    // The scene binds arrows to seeking and Space to play/pause on `window`.
    // Without this, choosing a tab scrubs the model behind the panel.
    event.stopPropagation();
  }
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
  const sheetHead = el('div', { class: 'anatomy-panel-sheet-head' }, [tabList, closeButton]);
  const sheet = el('div', { class: 'anatomy-panel-sheet' }, [sheetHead, body]);

  /**
   * Where the summary lives when the sheet is shut.
   *
   * It moves — the same element, never a copy — into the dialog when the sheet
   * opens, because the selected structure and what you can do to it are part of
   * the modal, not something behind it. Copying it instead would mean two
   * summaries holding one selection, which is the duplicate state this panel
   * exists to avoid.
   */
  const dock = el('div', { class: 'anatomy-panel-dock' }, [summary]);

  const element = el('section', {
    class: 'panel anatomy-panel',
    'aria-label': 'Anatomy / 解剖',
    dataset: { sheet: 'closed', layout: 'docked' },
  }, [dock, sheet]);

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

  /**
   * Show a tab.
   *
   * Two things this deliberately does not do. It does not rebuild when the tab
   * asked for is the one already showing — `openSheet('parts')` calls this every
   * time the Parts button is pressed, and rebuilding threw away the list
   * position on every open. And it does not scroll to the top: each tab
   * remembers where it was left, so leaving Parts for Display and coming back
   * comes back, rather than starting the reader over at the top of four hundred
   * structures.
   */
  function setTab(id) {
    if (!TABS.some((tab) => tab.id === id)) return false;
    if (id === activeTab && body.children?.length) {
      setRingTab(id);
      return true;
    }

    // Remember where the tab being left was, before its content goes away.
    if (body.children?.length) scrollByTab.set(activeTab, body.scrollTop ?? 0);

    activeTab = id;
    for (const [tabId, button] of tabButtons) {
      const on = tabId === id;
      button.setAttribute('aria-selected', String(on));
      button.classList.toggle('is-active', on);
    }
    setRingTab(id);
    const tab = TABS.find((entry) => entry.id === id);
    body.setAttribute('aria-labelledby', `anatomy-tab-${id}`);
    body.dataset.tab = id;
    body.replaceChildren(tab.content);
    body.scrollTop = scrollByTab.get(id) ?? 0;
    return true;
  }

  // --- the sheet, on a phone or a short window -------------------------------

  const onKeydown = (event) => {
    if (event.key === 'Tab') {
      trapTab(event);
      return;
    }
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    closeSheet();
  };

  function openSheet(tab) {
    if (tab) setTab(tab);
    // Docked, the body is already on screen; there is nothing to open.
    if (sheetOpen || element.dataset.layout !== 'sheet') return;
    sheetOpen = true;
    opener = partsButton;
    element.dataset.sheet = 'open';
    partsButton.setAttribute('aria-expanded', 'true');
    // Inside the dialog it is redundant with the close control, and it would be
    // a second way to do what the close button does.
    partsButton.hidden = true;
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Parts / 部位');
    // The summary joins the dialog. Non-scrolling, above the body, so the
    // structure a reader picked stays named while the list moves under it.
    sheet.replaceChildren(summary, sheetHead, body);
    makeBackgroundInert();
    document.addEventListener('keydown', onKeydown, true);
    focusTab(activeTab);
    // Last, and only now that the sheet is on screen. A hidden element has no
    // scroll position, so the browser reset this to 0 the moment the sheet was
    // closed — which no headless test could see, because a fake element's
    // `scrollTop` is just a number that stays where it is put.
    body.scrollTop = scrollByTab.get(activeTab) ?? 0;
  }

  function closeSheet() {
    if (!sheetOpen) return;
    // First, while the sheet is still on screen. Setting `data-sheet` below
    // hides it, and a hidden element's scroll position is already 0 by the time
    // anything else runs — which is exactly how this was got wrong the first
    // time, in code that looked like it was saving the value.
    scrollByTab.set(activeTab, body.scrollTop ?? 0);
    sheetOpen = false;
    element.dataset.sheet = 'closed';
    partsButton.hidden = false;
    partsButton.setAttribute('aria-expanded', 'false');
    sheet.removeAttribute('role');
    sheet.removeAttribute('aria-modal');
    sheet.removeAttribute('aria-label');
    sheet.replaceChildren(sheetHead, body);
    dock.replaceChildren(summary);
    restoreBackground();
    document.removeEventListener('keydown', onKeydown, true);
    // Back to the control that opened it, so the reader is where they were and
    // not at the top of the document.
    (opener ?? partsButton).focus?.();
    opener = null;
  }

  /**
   * Everything the dialog is not.
   *
   * Walking up from the panel and marking every *sibling* at each level — not
   * just the children of `#ui`. The first attempt excused the whole branch that
   * contained the panel, which meant the rail holding it was left live: the
   * language toggle and the feedback button sat behind an open modal, reachable
   * by Tab and by pointer.
   *
   * What each node's `inert` was is remembered, because a region that was
   * already inert for its own reasons must not be turned back on by closing
   * this.
   */
  const inertBefore = new Map();

  function makeBackgroundInert() {
    const root = element.closest?.('#ui') ?? element.parentElement;
    for (let node = element; node && node !== root; node = node.parentElement) {
      for (const sibling of node.parentElement?.children ?? []) {
        if (sibling === node || !sibling || typeof sibling !== 'object') continue;
        if (!inertBefore.has(sibling)) inertBefore.set(sibling, Boolean(sibling.inert));
        sibling.inert = true;
      }
    }
  }

  function restoreBackground() {
    for (const [node, was] of inertBefore) node.inert = was;
    inertBefore.clear();
  }

  /**
   * Keep Tab inside the dialog.
   *
   * `inert` stops the background taking focus, but the ring still runs off the
   * end of the document and back to the browser chrome, which on a phone is how
   * a reader loses the sheet without closing it. Wrapping at both ends is the
   * whole of a focus trap when everything else is already inert.
   */
  const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
    'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function trapTab(event) {
    const stops = [...(sheet.querySelectorAll?.(FOCUSABLE) ?? [])].filter(
      (node) => !node.hidden && node.offsetParent !== null
    );
    if (!stops.length) return;
    const first = stops[0];
    const last = stops[stops.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !sheet.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
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
      // One sentence, and it assumes neither a mouse nor a finger. It used to
      // be two — a name slot saying "Select a structure" and a line under it
      // saying "Point to preview", which is an instruction a touch device
      // cannot follow and a second copy of the same request.
      nameEn.textContent = 'Select a structure on the model or in the list.';
      nameJa.textContent = 'モデルまたは一覧から部位を選択してください。';
      whereEn.textContent = '';
      whereJa.textContent = '';
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

    const hidden = scene.getAnatomyVisibility?.().hidden ?? [];
    const selectionHidden = Boolean(selection) && hidden.includes(selection.id);
    const canSee = selection ? scene.isStructureVisible?.(selection.id) ?? true : false;

    focusButton.hidden = !selection || !onFocusStructure;
    // Offered when the structure is not on screen — which is the only time the
    // question "where is it?" cannot be answered by looking.
    revealButton.hidden = !selection || canSee;
    hideButton.hidden = !selection;
    hideButton.replaceChildren(
      el('span', { class: 'lang-en', text: selectionHidden ? 'Unhide' : 'Hide' }),
      el('span', { class: 'lang-ja', text: selectionHidden ? '再表示' : '非表示' })
    );
    showHiddenButton.hidden = hidden.length === 0;
    restoreDisplayButton.hidden = !(scene.canRestoreDisplay?.() ?? false);

    // A pinned structure that is off screen still has a card; it says so rather
    // than looking like a structure the reader is failing to find.
    element.dataset.selectionHidden = selectionHidden ? 'yes' : 'no';
    element.dataset.selectionOffscreen = selection && !canSee ? 'yes' : 'no';
  }

  function focusSelection() {
    const selection = scene.getAnatomySelection();
    if (selection) onFocusStructure?.(selection.id);
  }

  function revealSelection() {
    const selection = scene.getAnatomySelection();
    if (!selection) return;
    const result = scene.revealStructure?.(selection.id);
    // A scene that cannot bring this structure into view says so, and the offer
    // becomes the one that always works rather than a button that lies.
    if (result && result.ok === false) scene.isolateStructure(selection.id);
    // The anatomical layer belongs to the console's slider. The scene reports
    // what the structure needs; the control that owns the value sets it, so the
    // model and the slider never disagree about how deep the reader is.
    else if (result?.layer != null) onLayerChange?.(result.layer);
    paint();
  }

  function restorePreviousDisplay() {
    const result = scene.restoreDisplay?.();
    if (result?.layer != null) onLayerChange?.(result.layer);
    paint();
  }

  function toggleHidden() {
    const selection = scene.getAnatomySelection();
    if (!selection) return;
    const hidden = scene.getAnatomyVisibility?.().hidden ?? [];
    scene.setStructureHidden?.(selection.id, !hidden.includes(selection.id));
    paint();
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
  const unsubscribeVisibility = scene.onAnatomyVisibility?.(paint);

  setTab('parts');
  applyLayout();
  paint();

  return {
    element,
    /**
     * Repaint the actions.
     *
     * Which of them apply depends on the anatomical layer, and that value is
     * owned by the console rather than by the scene — so when the reader moves
     * the slider themselves, nothing here hears about it unless the app says so.
     */
    refresh: paint,
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
      // Belt and braces: a panel torn down mid-open must not leave the rest of
      // the app frozen behind a dialog that no longer exists.
      restoreBackground();
      document.removeEventListener('keydown', onKeydown, true);
      sheetMedia?.removeEventListener?.('change', applyLayout);
      unsubscribeSelection?.();
      unsubscribeHover?.();
      unsubscribeIsolation?.();
      unsubscribeVisibility?.();
      element.remove();
    },
  };
}
