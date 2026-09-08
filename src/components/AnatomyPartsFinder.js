import { el } from '../utils/dom.js';
import { buildSearchIndex, searchStructures } from '../app/anatomySearch.js';

/**
 * A search box over the part tree, and the results it shows instead of it.
 *
 * Four hundred structures in a tree is a list you can read only if you already
 * know which branch to open. A reader who arrives with a name — 「海馬」,
 * "hippocampus", something they heard in a lecture — has no way in. This is
 * that way in, and it is deliberately thin: it owns an input, a list of rows,
 * and the decision of which of the two surfaces is showing. It owns no
 * selection, no highlight and no structure identity.
 *
 * ## The tree is not rebuilt, only covered
 *
 * Searching hides the tree; clearing shows it again, with the branches the
 * reader had opened still open and the body scrolled back to where they left
 * it. That is the whole reason the tree element is passed in rather than
 * re-rendered: a tree that is rebuilt on clear has forgotten everything the
 * reader did to it, and "come back" turns into "start again".
 *
 * ## What a row is, and what it is not
 *
 * A row stands for a **structure** — one id, however many meshes the model
 * draws it from — and selecting one calls the same `onSelect` a tree row does,
 * with the same id. Left and right are two structures and stay two rows. A name
 * from higher up the hierarchy (a lobe, a hemisphere) is not a selectable
 * structure and never becomes a row of its own; it finds the structures under
 * it, and the row says that is why it matched.
 *
 * @param {object} options
 * @param {HTMLElement} options.treeElement the part tree this sits above
 * @param {() => Array<object>} options.inventory the scene's structures
 * @param {(id: any) => void} options.onSelect
 * @param {() => number} [options.readScroll] current scroll of the body
 * @param {(top: number) => void} [options.writeScroll]
 */
export function createAnatomyPartsFinder({
  treeElement,
  inventory,
  onSelect,
  readScroll = () => 0,
  writeScroll = () => {},
}) {
  let index = null;
  /** The result buttons currently shown, in order — Enter commits the first. */
  let hits = [];
  /** Where the tree was left, so clearing the search is coming back. */
  let treeScroll = 0;
  let searching = false;

  const results = el('ul', {
    class: 'anatomy-search-results',
    role: 'listbox',
    'aria-label': 'Search results / 検索結果',
    hidden: 'hidden',
  });
  const empty = el('p', { class: 'anatomy-search-empty', hidden: 'hidden' }, [
    el('span', { class: 'lang-en', text: 'No structure matches that name.' }),
    el('span', { class: 'lang-ja', text: '該当する部位がありません。' }),
  ]);
  // Bilingual like everything else on this surface: one mixed string would be
  // read out in the wrong language by half the screen readers that meet it.
  const countEn = el('span', { class: 'lang-en' });
  const countJa = el('span', { class: 'lang-ja' });
  const count = el('p', { class: 'anatomy-search-count', role: 'status', hidden: 'hidden' }, [countEn, countJa]);

  const input = el('input', {
    class: 'anatomy-search-input',
    type: 'search',
    // `search` inputs get a browser clear button; the Escape key below is the
    // keyboard equivalent and both end in the same place.
    placeholder: '部位を検索 / Search structures',
    'aria-label': 'Search structures / 部位を検索',
    autocomplete: 'off',
    on: {
      input: () => run(input.value),
      keydown: onKeydown,
    },
  });
  // A fresh input has no value until something is typed into it; starting it at
  // the empty string means every read is a string.
  input.value = '';
  const element = el('div', { class: 'anatomy-finder' }, [
    el('div', { class: 'anatomy-search-row' }, [input]),
    count,
    empty,
    results,
    treeElement,
  ]);

  /**
   * Enter commits; the IME's Enter does not.
   *
   * A Japanese reader types 「かいば」 and presses Enter to accept 「海馬」. That
   * keystroke belongs to the input method, not to this list, and acting on it
   * would select whatever happened to be first while the reader was still
   * typing the word. `isComposing` is the browser saying so; keyCode 229 is the
   * same fact from browsers that do not set it.
   *
   * Escape clears the search and **stops there**. The same key closes the parts
   * sheet on a phone, and one press doing both would throw away the search and
   * the panel together.
   */
  function onKeydown(event) {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Escape') {
      if (!input.value) return;
      event.preventDefault();
      event.stopPropagation();
      clear();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (hits.length) onSelect(String(hits[0].structure.id));
    }
  }

  /** Build the index the first time it is needed, from the scene's inventory. */
  function ensureIndex() {
    if (!index) index = buildSearchIndex(inventory() ?? []);
    return index;
  }

  function run(query) {
    const text = typeof query === 'string' ? query : '';
    hits = text.trim() ? searchStructures(ensureIndex(), text) : [];
    const wasSearching = searching;
    searching = Boolean(text.trim());

    // Remember where the tree was, once, on the way into a search — not on
    // every keystroke, which would record the search's own scroll position.
    if (searching && !wasSearching) treeScroll = readScroll();

    results.replaceChildren(...hits.map(row));
    results.hidden = !searching || hits.length === 0;
    empty.hidden = !searching || hits.length > 0;
    count.hidden = !searching;
    if (searching) {
      // Structures, not meshes and not rows: the number a reader can act on.
      countEn.textContent = `${hits.length} structure${hits.length === 1 ? '' : 's'}`;
      countJa.textContent = `${hits.length} 件`;
    }
    treeElement.hidden = searching;
    if (!searching && wasSearching) writeScroll(treeScroll);
  }

  /** One structure. The id is the scene's; nothing here parses it. */
  function row(hit) {
    const structure = hit.structure;
    const where = [structure.sideJa, (structure.hierarchyJa ?? []).slice(-2, -1)[0]]
      .filter(Boolean)
      .join(' · ');
    const whereEn = [structure.side, (structure.hierarchy ?? []).slice(-2, -1)[0]]
      .filter(Boolean)
      .join(' · ');
    return el('li', { class: 'anatomy-search-row-item', role: 'presentation' }, [
      el(
        'button',
        {
          class: 'anatomy-search-hit',
          type: 'button',
          role: 'option',
          'aria-selected': 'false',
          dataset: { structureId: String(structure.id) },
          on: { click: () => onSelect(String(structure.id)) },
        },
        [
          el('span', { class: 'anatomy-search-name' }, [
            el('span', { class: 'lang-en', text: structure.name ?? '' }),
            el('span', { class: 'lang-ja', text: structure.nameJa ?? '' }),
          ]),
          el('span', { class: 'anatomy-search-where' }, [
            el('span', { class: 'lang-en', text: whereEn }),
            el('span', { class: 'lang-ja', text: where }),
          ]),
        ]
      ),
    ]);
  }

  function clear() {
    input.value = '';
    run('');
    input.focus?.();
  }

  return {
    element,
    input,
    /** True while results are covering the tree. */
    isSearching: () => searching,
    clear,
    /** The inventory changed — a new atlas — so the index has to be rebuilt. */
    reset() {
      index = null;
      clear();
    },
  };
}
