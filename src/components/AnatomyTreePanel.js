import { el } from '../utils/dom.js';
import { GROUP_ID_PREFIX, treeLeaves } from '../app/anatomyContract.js';
import '../styles/anatomy-tree.css';

/**
 * The part tree: the same structures the model holds, as a list you can read.
 *
 * A 3D model answers "what is this?" and answers nothing at all to "what is
 * there?". A reader who does not already know the name of the thing they are
 * looking for cannot find it by clicking around a brain, and a reader who wants
 * to compare two structures cannot hold both in view. That is what this is for.
 *
 * It is deliberately **not** a second source of truth. Every row is built from
 * `scene.getAnatomyTree()`, every row's id is a structure id from the scene, and
 * selecting a row calls `scene.selectStructure(id)` rather than setting any
 * state of its own. What is highlighted comes back from `onAnatomySelection` —
 * including selections the reader made by clicking the model, which is what
 * keeps the two in agreement instead of merely in sync.
 *
 * The isolate control lives here because isolating is a thing you do *to* a
 * structure you have found, and "show everything again" has to be one obvious
 * button rather than a slider a reader has to guess the position of.
 *
 * @param {object} scene an anatomy scene satisfying `app/anatomyContract.js`
 */
export function createAnatomyTreePanel(scene) {
  /** Every row that stands for a structure, by id, so updates are a lookup. */
  const rows = new Map();
  let openGroups = null;

  const title = el('h2', { class: 'anatomy-tree-title', id: 'anatomy-tree-title' }, [
    el('span', { class: 'lang-en', text: 'Parts' }),
    el('span', { class: 'lang-ja', text: '部位' }),
  ]);
  const count = el('span', { class: 'anatomy-tree-count' });
  const list = el('div', { class: 'anatomy-tree-list', role: 'tree', 'aria-labelledby': 'anatomy-tree-title' });

  const isolateButton = el('button', {
    class: 'anatomy-tree-isolate',
    type: 'button',
    'aria-pressed': 'false',
    hidden: true,
    on: { click: () => toggleIsolation() },
  });
  const showAll = el('button', {
    class: 'anatomy-tree-showall',
    type: 'button',
    on: { click: () => scene.clearIsolation() },
  }, [
    el('span', { class: 'lang-en', text: 'Show all' }),
    el('span', { class: 'lang-ja', text: '全体を表示' }),
  ]);

  const element = el('section', { class: 'panel anatomy-tree' }, [
    el('header', { class: 'anatomy-tree-header' }, [title, count]),
    list,
    el('div', { class: 'anatomy-tree-actions' }, [isolateButton, showAll]),
  ]);

  /** A group: a disclosure whose open state is the reader's, not the data's. */
  const groupRow = (node) => {
    const label = el('span', { class: 'anatomy-tree-label' }, [
      el('span', { class: 'lang-en', text: node.label }),
      el('span', { class: 'lang-ja', text: node.labelJa }),
    ]);
    const children = el('div', { class: 'anatomy-tree-children', role: 'group' }, node.children.map(row));
    const toggle = el('button', {
      class: 'anatomy-tree-group',
      type: 'button',
      'aria-expanded': 'false',
      style: `--depth:${node.depth}`,
      on: {
        click: () => {
          const open = toggle.getAttribute('aria-expanded') !== 'true';
          toggle.setAttribute('aria-expanded', String(open));
          children.hidden = !open;
          if (open) openGroups.add(node.nodeId);
          else openGroups.delete(node.nodeId);
        },
      },
    }, [el('span', { class: 'anatomy-tree-chevron', 'aria-hidden': 'true', text: '›' }), label]);

    children.hidden = !openGroups.has(node.nodeId);
    toggle.setAttribute('aria-expanded', String(openGroups.has(node.nodeId)));
    return el('div', { class: 'anatomy-tree-branch', role: 'treeitem', 'aria-expanded': 'false' }, [toggle, children]);
  };

  /** A structure: selecting it is the scene's decision, not this row's. */
  const leafRow = (node) => {
    const button = el('button', {
      class: 'anatomy-tree-leaf',
      type: 'button',
      role: 'treeitem',
      'aria-selected': 'false',
      style: `--depth:${node.depth}`,
      dataset: { structure: String(node.structureId) },
      on: { click: () => scene.selectStructure(node.structureId) },
    }, [
      el('span', { class: 'anatomy-tree-label' }, [
        el('span', { class: 'lang-en', text: node.label }),
        el('span', { class: 'lang-ja', text: node.labelJa }),
      ]),
    ]);
    rows.set(node.structureId, button);
    return button;
  };

  const row = (node) => (node.structureId !== undefined ? leafRow(node) : groupRow(node));

  function render() {
    const tree = scene.getAnatomyTree();
    // Which branches the reader had open is theirs to keep across a rebuild;
    // the first render opens the top level so the panel is not a row of arrows.
    if (openGroups === null) {
      openGroups = new Set(tree.filter((node) => node.structureId === undefined).map((node) => node.nodeId));
    }
    rows.clear();
    list.replaceChildren(...tree.map(row));
    const total = treeLeaves(tree).length;
    count.replaceChildren(
      el('span', { class: 'lang-en', text: `${total} structures` }),
      el('span', { class: 'lang-ja', text: `${total}部位` })
    );
    paintSelection(scene.getAnatomySelection());
    paintIsolation(scene.getAnatomyIsolation());
  }

  function paintSelection(selection) {
    for (const [id, button] of rows) {
      const isSelected = selection?.id === id;
      button.setAttribute('aria-selected', String(isSelected));
      button.classList.toggle('is-selected', isSelected);
    }
    // Reveal the branch holding a structure selected from the 3D model, or the
    // panel silently disagrees with the thing the reader just clicked.
    const selected = selection ? rows.get(selection.id) : null;
    if (selected) {
      for (let node = selected.parentElement; node && node !== list; node = node.parentElement) {
        if (!node.classList.contains('anatomy-tree-children')) continue;
        node.hidden = false;
        node.previousElementSibling?.setAttribute('aria-expanded', 'true');
      }
      selected.scrollIntoView?.({ block: 'nearest' });
    }
    updateIsolateButton();
  }

  function paintIsolation(isolatedId) {
    element.dataset.isolated = isolatedId == null ? 'off' : 'on';
    showAll.hidden = isolatedId == null;
    for (const [id, button] of rows) button.classList.toggle('is-isolated', isolatedId === id);
    updateIsolateButton();
  }

  function updateIsolateButton() {
    const selection = scene.getAnatomySelection();
    const isolated = scene.getAnatomyIsolation();
    const on = selection != null && isolated === selection.id;
    // Hidden rather than disabled when there is nothing to isolate. A disabled
    // button is still painted and still says "Isolate", but the Tab key skips
    // it — a control a reader can see and cannot reach, which is what the
    // viewport check calls out. There is nothing to isolate until something is
    // selected, so there is nothing to show.
    isolateButton.hidden = !selection;
    isolateButton.setAttribute('aria-pressed', String(on));
    isolateButton.replaceChildren(
      el('span', { class: 'lang-en', text: on ? 'Show in place' : 'Isolate' }),
      el('span', { class: 'lang-ja', text: on ? '元の位置で表示' : 'この部位だけ' })
    );
  }

  function toggleIsolation() {
    const selection = scene.getAnatomySelection();
    if (!selection) return;
    if (scene.getAnatomyIsolation() === selection.id) scene.clearIsolation();
    else scene.isolateStructure(selection.id);
  }

  const unsubscribeSelection = scene.onAnatomySelection(paintSelection);
  const unsubscribeIsolation = scene.onAnatomyIsolation(paintIsolation);
  // The atlas may still be loading; rebuild when it says it is ready, so the
  // panel is never a permanently empty list.
  const unsubscribeStatus = scene.onAnatomyStatus?.((status) => {
    if (status.state === 'ready') render();
  });

  render();

  return {
    element,
    /** Exposed for the app shell and the tests; never called from inside. */
    refresh: render,
    dispose() {
      unsubscribeSelection?.();
      unsubscribeIsolation?.();
      unsubscribeStatus?.();
      rows.clear();
      element.remove();
    },
  };
}
