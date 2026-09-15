import { el } from '../utils/dom.js';
import { treeLeaves } from '../app/anatomyContract.js';
import { inLanguage, onLanguageChange } from '../utils/language.js';
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
  /** Each group's visibility control, by node id, so repainting is a lookup. */
  const groupVisibility = new Map();
  /**
   * Whether this scene can hide a group at all.
   *
   * Asked of the scene once rather than assumed: hiding a group is hiding its
   * leaves as a single change, and a scene that has no batched setter would
   * have to be hidden one structure at a time — which is the thing this is for.
   * A scene without it simply does not get the control.
   */
  const groupsCanHide = typeof scene.setStructuresHidden === 'function';

  /**
   * Hide everything under a group, or show it again.
   *
   * "Anything still visible" decides the direction, so a group a reader has
   * partly hidden by hand folds the rest of the way rather than springing back
   * — the press means "get this out of the way", and it should do that whatever
   * state the group was left in.
   */
  function toggleGroupHidden(node) {
    const ids = treeLeaves(node.children).map((leaf) => leaf.structureId);
    if (!ids.length) return;
    const hidden = new Set(scene.getAnatomyVisibility?.().hidden ?? []);
    const anyVisible = ids.some((id) => !hidden.has(id));
    scene.setStructuresHidden(ids, anyVisible);
  }

  /** Which groups are wholly hidden, so their controls say so. */
  function paintGroupVisibility() {
    if (!groupVisibility.size) return;
    const hidden = new Set(scene.getAnatomyVisibility?.().hidden ?? []);
    for (const { button, node } of groupVisibility.values()) {
      const ids = treeLeaves(node.children).map((leaf) => leaf.structureId);
      const allHidden = ids.length > 0 && ids.every((id) => hidden.has(id));
      const someHidden = ids.some((id) => hidden.has(id));
      button.setAttribute('aria-pressed', String(allHidden));
      button.classList.toggle('is-hidden', allHidden);
      // Partly hidden is its own state: without it a group with one structure
      // hidden looks identical to one with none, and the next press would be a
      // surprise in either direction.
      button.classList.toggle('is-partial', someHidden && !allHidden);
      const label = allHidden
        ? inLanguage(`Show ${node.label}`, `${node.labelJa}を表示（V）`)
        : inLanguage(`Hide ${node.label}`, `${node.labelJa}を非表示（V）`);
      button.setAttribute('aria-label', label);
      button.title = label;
    }
  }
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

    /**
     * Hide or show everything under this group, in one press.
     *
     * The reason this exists: the heart's interior is behind four chamber
     * surfaces, and reaching it meant selecting and hiding four structures one
     * at a time. A group is exactly the unit a reader means by "take the
     * chambers off" — and the brain has the same shape, where "hide the frontal
     * lobe" was forty-one presses.
     *
     * A sibling of the toggle, not a child: the toggle is a `<button>` and a
     * button may not contain one. `tabindex="-1"` keeps the tree's roving
     * order one stop per row, which is what `role="tree"` promises; `V` on the
     * focused group is the keyboard path, and the label says so.
     */
    const visibility = groupsCanHide
      ? el('button', {
          class: 'anatomy-tree-visibility',
          type: 'button',
          tabindex: '-1',
          'aria-pressed': 'false',
          dataset: { groupVisibility: node.nodeId },
          on: {
            click: (event) => {
              // The control is a sibling of the toggle rather than a child of
              // it, so this press does not reach the toggle on its own — but
              // the tree sits inside a panel that may yet delegate, and "hide
              // the group" must never also mean "fold the group". Optional
              // because `node --test` builds this component against a document
              // stand-in whose events carry only what the tests need.
              event?.stopPropagation?.();
              toggleGroupHidden(node);
              focus(toggle);
            },
          },
        }, [el('span', { class: 'anatomy-tree-visibility-mark', 'aria-hidden': 'true' })])
      : null;
    if (visibility) groupVisibility.set(node.nodeId, { button: visibility, node });

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
    }, visibility ? [toggle, visibility, children] : [toggle, children]);
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

  /**
   * The branches to open so that the first thing a reader sees is a part name.
   *
   * Opening only the top level left a list of arrows: someone who came to see
   * what is there had to guess twice before any structure appeared. Opening
   * everything is the other failure — four hundred rows, and the shape of the
   * atlas lost.
   *
   * So: every branch at the top level, plus the chain down the first of them
   * until a structure shows. One path, and it stops as soon as it has done its
   * job. It also chooses nothing — an expanded branch is an invitation, and
   * selecting a structure on the reader's behalf would be an answer to a
   * question they have not asked.
   *
   * @param {Array<object>} nodes the tree's root nodes
   */
  function firstPathToAStructure(nodes) {
    const open = nodes.filter((node) => node.structureId === undefined).map((node) => node.nodeId);
    let level = nodes;
    // Walk down the first branch until one of its children is a structure.
    while (level.length && !level.some((node) => node.structureId !== undefined)) {
      const next = level.find((node) => node.structureId === undefined);
      if (!next) break;
      open.push(next.nodeId);
      level = next.children;
    }
    return open;
  }

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
    // the first render opens enough of the first branch to show a part name.
    if (openGroups === null) openGroups = new Set(firstPathToAStructure(tree));
    rows.clear();
    branches.clear();
    parentOf.clear();
    groupVisibility.clear();
    ordered.length = 0;
    element.replaceChildren(...tree.map((node) => row(node)));
    for (const nodeId of branches.keys()) setExpanded(nodeId, openGroups.has(nodeId));
    structureCount = treeLeaves(tree).length;
    focusRow = null;
    paintSelection(scene.getAnatomySelection());
    paintIsolation(scene.getAnatomyIsolation());
    paintGroupVisibility();
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
      // The keyboard's way to the group visibility control, which is not in the
      // roving order because `role="tree"` gives a row one stop. Free: the scene
      // binds space, R, H, C, the arrows, +/- and Escape on `window`, and this
      // handler stops propagation before any of them see it.
      case 'v':
      case 'V':
        if (groupsCanHide && isBranchToggle(current)) {
          toggleGroupHidden(branches.get(nodeIdOf(current)).node);
          focus(current);
        } else {
          handled = false;
        }
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
  // Hiding happens in more places than this panel — the card's own control, a
  // fixed view, `revealStructure` taking a blocker out of the way — so the
  // group controls follow the scene rather than only their own presses.
  const unsubscribeVisibility = scene.onAnatomyVisibility?.(paintGroupVisibility);
  // The labels are one language and the interface can change it under them.
  const stopLanguageWatch = onLanguageChange(paintGroupVisibility);
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
      unsubscribeVisibility?.();
      stopLanguageWatch?.();
      rows.clear();
      branches.clear();
      parentOf.clear();
      groupVisibility.clear();
      ordered.length = 0;
      element.remove?.();
    },
  };
}
