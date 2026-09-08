import { el } from '../utils/dom.js';
import { treeLeaves } from '../app/anatomyContract.js';
// The stylesheet is imported by `AnatomyPanel.js`, which owns this surface.
// Importing it here as well would be harmless in the browser and fatal under
// `node --test`, which is where these rows are checked.

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
 * ## Three states, kept apart
 *
 * **Focus** is where the keyboard is. **Selection** is the structure the reader
 * has pinned. **Expansion** is which branches are open. Moving focus does not
 * select — arrowing down a list of four hundred structures while each one
 * repaints the model and the card would make the keyboard unusable — so Enter
 * or Space is what commits. That is what `role="tree"` promises, and the three
 * places a promise like this is usually broken are all here: the `aria-expanded`
 * on the branch, the roving `tabindex` that gives the tree one entry point, and
 * the arrow keys that move through what is *visible* rather than through the
 * data.
 *
 * ## It renders a list, not a panel
 *
 * The surrounding chrome — the selected structure, the isolate control, the
 * tabs — belongs to `AnatomyPanel`, which owns the layout. This owns rows.
 *
 * @param {object} scene an anatomy scene satisfying `app/anatomyContract.js`
 */
export function createAnatomyTreePanel(scene) {
  /** Every row that stands for a structure, by id, so updates are a lookup. */
  const rows = new Map();
  /** Every branch's treeitem wrapper, by node id, so state stays in one place. */
  const branches = new Map();
  /**
   * The branch toggle each row sits under, or null at the top level.
   *
   * Held rather than walked. `closest()` and `previousElementSibling` would say
   * the same thing, but the tree already knows its own shape while it is being
   * built, and rediscovering it from the DOM afterwards is how a component ends
   * up with two ideas about where a row is.
   */
  const parentOf = new Map();
  /** Rows in reading order, so "what is visible" is a filter and not a walk. */
  const ordered = [];
  let openGroups = null;
  /** The row the Tab key lands on. Exactly one row carries tabindex="0". */
  let focusRow = null;
  let structureCount = 0;

  const element = el('div', {
    class: 'anatomy-tree-list',
    role: 'tree',
    'aria-label': 'Parts of the model / モデルの部位',
    'aria-multiselectable': 'false',
    on: { keydown: onKeydown },
  });

  /** A group: a disclosure whose open state is the reader's, not the data's. */
  const groupRow = (node, parent) => {
    const toggle = el('button', {
      class: 'anatomy-tree-group',
      type: 'button',
      tabindex: '-1',
      style: `--depth:${node.depth}`,
      dataset: { node: node.nodeId },
      on: { click: () => { setExpanded(node.nodeId, !openGroups.has(node.nodeId)); focus(toggle); } },
    }, [
      el('span', { class: 'anatomy-tree-chevron', 'aria-hidden': 'true', text: '›' }),
      el('span', { class: 'anatomy-tree-label' }, [
        el('span', { class: 'lang-en', text: node.label }),
        el('span', { class: 'lang-ja', text: node.labelJa }),
      ]),
    ]);

    parentOf.set(toggle, parent);
    ordered.push(toggle);
    // Built after the toggle is registered, so the rows inside land after it in
    // reading order and know which branch they are in.
    const children = el(
      'div',
      { class: 'anatomy-tree-children', role: 'group' },
      node.children.map((child) => row(child, toggle))
    );

    // The treeitem is the branch, and `aria-expanded` belongs on it. Putting it
    // only on the button left assistive technology reading every branch as
    // collapsed however the model looked — the state a reader could see, the
    // state the component held, and the state it announced were three answers.
    // One writer, `setExpanded`, keeps them one answer.
    const branch = el('div', {
      class: 'anatomy-tree-branch',
      role: 'treeitem',
      'aria-expanded': 'false',
      'aria-label': `${node.label} / ${node.labelJa}`,
    }, [toggle, children]);
    branches.set(node.nodeId, { branch, toggle, children, node });
    return branch;
  };

  /** A structure: selecting it is the scene's decision, not this row's. */
  const leafRow = (node, parent) => {
    const button = el('button', {
      class: 'anatomy-tree-leaf',
      type: 'button',
      role: 'treeitem',
      tabindex: '-1',
      'aria-selected': 'false',
      style: `--depth:${node.depth}`,
      dataset: { structure: String(node.structureId) },
      on: { click: () => { scene.selectStructure(node.structureId); focus(button); } },
    }, [
      el('span', { class: 'anatomy-tree-label' }, [
        el('span', { class: 'lang-en', text: node.label }),
        el('span', { class: 'lang-ja', text: node.labelJa }),
      ]),
    ]);
    rows.set(node.structureId, button);
    parentOf.set(button, parent);
    ordered.push(button);
    return button;
  };

  const row = (node, parent = null) =>
    node.structureId !== undefined ? leafRow(node, parent) : groupRow(node, parent);

  /** The one writer of expansion: the set, the DOM, and what is announced. */
  function setExpanded(nodeId, open) {
    const entry = branches.get(nodeId);
    if (!entry) return;
    if (open) openGroups.add(nodeId);
    else openGroups.delete(nodeId);
    entry.children.hidden = !open;
    entry.toggle.setAttribute('aria-expanded', String(open));
    entry.branch.setAttribute('aria-expanded', String(open));
  }

  function render() {
    const tree = scene.getAnatomyTree();
    // Which branches the reader had open is theirs to keep across a rebuild;
    // the first render opens the top level so the panel is not a row of arrows.
    if (openGroups === null) {
      openGroups = new Set(tree.filter((node) => node.structureId === undefined).map((node) => node.nodeId));
    }
    rows.clear();
    branches.clear();
    parentOf.clear();
    ordered.length = 0;
    element.replaceChildren(...tree.map((node) => row(node)));
    for (const nodeId of branches.keys()) setExpanded(nodeId, openGroups.has(nodeId));
    structureCount = treeLeaves(tree).length;
    focusRow = null;
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
      for (let toggle = parentOf.get(selected); toggle; toggle = parentOf.get(toggle)) {
        setExpanded(toggle.dataset.node, true);
      }
      setFocusRow(selected);
      selected.scrollIntoView?.({ block: 'nearest' });
    } else if (!focusRow) {
      setFocusRow(visibleRows()[0] ?? null);
    }
  }

  function paintIsolation(isolatedId) {
    for (const [id, button] of rows) button.classList.toggle('is-isolated', isolatedId === id);
  }

  // --- keyboard -------------------------------------------------------------

  /** Whether every branch above a row is open, so the reader can see it. */
  const isReachable = (row) => {
    for (let toggle = parentOf.get(row); toggle; toggle = parentOf.get(toggle)) {
      if (!openGroups.has(toggle.dataset.node)) return false;
    }
    return true;
  };

  /** Rows a reader can actually see, in reading order. */
  const visibleRows = () => ordered.filter(isReachable);

  /** Exactly one row is in the tab ring, so Tab enters the tree once. */
  function setFocusRow(next) {
    if (focusRow === next) return;
    if (focusRow) focusRow.setAttribute('tabindex', '-1');
    focusRow = next;
    if (focusRow) focusRow.setAttribute('tabindex', '0');
  }

  function focus(row) {
    setFocusRow(row);
    row?.focus?.();
  }

  const isBranchToggle = (row) => row?.classList.contains('anatomy-tree-group');
  const nodeIdOf = (row) => row?.dataset?.node;
  const isOpen = (row) => isBranchToggle(row) && openGroups.has(nodeIdOf(row));

  function onKeydown(event) {
    const list = visibleRows();
    if (!list.length) return;
    const current = list.includes(event.target) ? event.target : focusRow ?? list[0];
    const at = list.indexOf(current);
    let handled = true;

    switch (event.key) {
      case 'ArrowDown':
        focus(list[Math.min(at + 1, list.length - 1)]);
        break;
      case 'ArrowUp':
        focus(list[Math.max(at - 1, 0)]);
        break;
      case 'Home':
        focus(list[0]);
        break;
      case 'End':
        focus(list[list.length - 1]);
        break;
      case 'ArrowRight': {
        // Open a closed branch; step into an open one; do nothing on a leaf.
        if (isBranchToggle(current) && !isOpen(current)) {
          setExpanded(nodeIdOf(current), true);
        } else if (isOpen(current)) {
          const next = visibleRows();
          focus(next[next.indexOf(current) + 1] ?? current);
        }
        break;
      }
      case 'ArrowLeft':
        // Close an open branch; otherwise go to the branch this row is inside.
        if (isOpen(current)) setExpanded(nodeIdOf(current), false);
        else focus(parentOf.get(current) ?? current);
        break;
      case 'Enter':
      case ' ':
        if (isBranchToggle(current)) setExpanded(nodeIdOf(current), !isOpen(current));
        else scene.selectStructure(Number(current.dataset.structure));
        focus(current);
        break;
      default:
        handled = false;
    }

    if (!handled) return;
    event.preventDefault();
    // The scene binds arrows to seeking and Space to play/pause on `window`.
    // Without this, arrowing through the tree scrubs the model underneath it.
    event.stopPropagation();
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
    /** How many structures the tree is showing. The panel prints it. */
    get structureCount() {
      return structureCount;
    },
    /** Exposed for the app shell and the tests; never called from inside. */
    refresh: render,
    dispose() {
      unsubscribeSelection?.();
      unsubscribeIsolation?.();
      unsubscribeStatus?.();
      rows.clear();
      branches.clear();
      parentOf.clear();
      ordered.length = 0;
      element.remove?.();
    },
  };
}
