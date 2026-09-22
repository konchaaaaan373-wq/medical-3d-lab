import { el, emphasised } from '../utils/dom.js';

/**
 * Reference reading a scene offers beside its model, opened one entry at a time.
 *
 * ### Why this is a panel and not a verdict
 *
 * The higher-function scene carries the classical aphasia syndromes as a data
 * file that the model cannot import. That was the right place for them and it
 * was not, by itself, a reader-facing thing: the file existed, the test that
 * keeps the solver away from it existed, and nothing on screen ever showed a
 * reader what any of the names meant. A reference layer nobody can open is a
 * comment.
 *
 * So: a list of entries, one open at a time, each one saying what is typically
 * described and — the part that matters here — **what this model does not
 * evaluate about it**. The reader picks. There is no match score, no ranking
 * against the current result, and no probability, because computing one would
 * be the classifier this scene removed, wearing a different hat.
 *
 * ### Shape
 * ```
 * { title, titleJa, intro, introJa,
 *   groups: [{ id, title, titleJa, note, noteJa,
 *              entries: [{ id, name, nameJa, gist, gistJa,
 *                          lines:        [{ label, labelJa, text, textJa, tone }],
 *                          notEvaluated: [{ text, textJa }] }] }] }
 * ```
 *
 * `tone` is a class suffix and nothing else: the entries say in words how
 * firmly a feature is described, and the colour is there to group them, not to
 * carry the claim.
 *
 * ### Keyboard and focus
 *
 * Every entry is a real `<button>` in the tab order, and the detail it opens is
 * a sibling region labelled by it. Closing an entry returns focus to the button
 * that opened it, so a keyboard reader who opens the fourth syndrome and closes
 * it is back on the fourth syndrome rather than at the top of the page.
 *
 * @param {object} library
 */
export function createReferenceLibraryPanel(library) {
  const detail = el('div', { class: 'reference-detail', role: 'region', tabindex: '-1' });
  detail.hidden = true;

  /** @type {Map<string, HTMLButtonElement>} */
  const buttons = new Map();
  let openId = null;

  const entriesOf = () => library.groups.flatMap((group) => group.entries);

  const close = ({ restoreFocus = true } = {}) => {
    const previous = openId;
    openId = null;
    detail.hidden = true;
    detail.replaceChildren();
    for (const button of buttons.values()) button.setAttribute('aria-expanded', 'false');
    for (const button of buttons.values()) button.classList.remove('is-open');
    if (restoreFocus && previous) buttons.get(previous)?.focus();
  };

  const open = (id) => {
    const entry = entriesOf().find((candidate) => candidate.id === id);
    if (!entry) return;
    openId = id;
    for (const [key, button] of buttons) {
      button.setAttribute('aria-expanded', String(key === id));
      button.classList.toggle('is-open', key === id);
    }
    detail.replaceChildren(...renderEntry(entry, close));
    detail.setAttribute('aria-label', `${entry.name} / ${entry.nameJa}`);
    detail.hidden = false;
  };

  const groups = library.groups.map((group) => el('section', { class: 'reference-group' }, [
    el('h4', { class: 'reference-group-title' }, [
      el('span', { class: 'lang-en', text: group.title }),
      el('span', { class: 'lang-ja', text: group.titleJa }),
    ]),
    group.note
      ? el('p', { class: 'reference-group-note' }, [
        el('span', { class: 'lang-en' }, emphasised(group.note)),
        el('span', { class: 'lang-ja' }, emphasised(group.noteJa)),
      ])
      : null,
    el('ul', { class: 'reference-list' }, group.entries.map((entry) => {
      const button = el('button', {
        class: 'reference-entry',
        type: 'button',
        'aria-expanded': 'false',
        'data-entry': entry.id,
      }, [
        el('span', { class: 'lang-en', text: entry.name }),
        el('span', { class: 'lang-ja', text: entry.nameJa }),
      ]);
      button.addEventListener('click', () => (openId === entry.id ? close() : open(entry.id)));
      buttons.set(entry.id, button);
      return el('li', {}, [button]);
    })),
  ].filter(Boolean)));

  const body = el('div', { class: 'reference-body' }, [
    el('p', { class: 'reference-intro' }, [
      el('span', { class: 'lang-en' }, emphasised(library.intro)),
      el('span', { class: 'lang-ja' }, emphasised(library.introJa)),
    ]),
    ...groups,
    detail,
  ]);
  body.hidden = true;

  const toggle = el('button', { class: 'reference-toggle', type: 'button', 'aria-expanded': 'false' }, [
    el('span', { class: 'lang-en', text: library.title }),
    el('span', { class: 'lang-ja', text: library.titleJa }),
  ]);

  const element = el('div', { class: 'panel reference-library' }, [toggle, body]);

  toggle.addEventListener('click', () => {
    const opening = body.hidden;
    body.hidden = !opening;
    toggle.setAttribute('aria-expanded', String(opening));
    element.classList.toggle('is-open', opening);
    // Collapsing the panel collapses what is inside it: reopening onto the
    // fourth syndrome's detail, with the list scrolled away above it, is not
    // where a reader left off.
    if (!opening) close({ restoreFocus: false });
  });

  // Escape closes the entry, then the panel — the order a reader expects, and
  // the only way out for somebody who never touches a pointer.
  element.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (openId) close();
    else if (!body.hidden) toggle.click();
    else return;
    event.stopPropagation();
  });

  return {
    element,
    /** @returns {string|null} the entry currently open, for a test or a story step */
    openEntry: () => openId,
    open(id) {
      if (body.hidden) toggle.click();
      open(id);
    },
    close,
  };
}

function renderEntry(entry, close) {
  const dismiss = el('button', { class: 'reference-close', type: 'button' }, [
    el('span', { class: 'lang-en', text: 'Close' }),
    el('span', { class: 'lang-ja', text: '閉じる' }),
  ]);
  dismiss.addEventListener('click', () => close());
  return [
    el('div', { class: 'reference-detail-head' }, [
      el('h5', { class: 'reference-detail-title' }, [
        el('span', { class: 'lang-en', text: entry.name }),
        el('span', { class: 'lang-ja', text: entry.nameJa }),
      ]),
      dismiss,
    ]),
    el('p', { class: 'reference-gist' }, [
      el('span', { class: 'lang-en' }, emphasised(entry.gist)),
      el('span', { class: 'lang-ja' }, emphasised(entry.gistJa)),
    ]),
    entry.lines?.length
      ? el('dl', { class: 'reference-lines' }, entry.lines.flatMap((line) => [
        el('dt', { class: `reference-line-label is-${line.tone ?? 'plain'}` }, [
          el('span', { class: 'lang-en', text: line.label }),
          el('span', { class: 'lang-ja', text: line.labelJa }),
        ]),
        el('dd', { class: 'reference-line-text' }, [
          el('span', { class: 'lang-en' }, emphasised(line.text)),
          el('span', { class: 'lang-ja' }, emphasised(line.textJa)),
        ]),
      ]))
      : null,
    entry.notEvaluated?.length
      ? el('section', { class: 'reference-not-evaluated' }, [
        el('h6', {}, [
          el('span', { class: 'lang-en', text: 'What this model does not evaluate about it' }),
          el('span', { class: 'lang-ja', text: 'このモデルがこれについて評価していないこと' }),
        ]),
        el('ul', {}, entry.notEvaluated.map((item) => el('li', {}, [
          el('span', { class: 'lang-en' }, emphasised(item.text)),
          el('span', { class: 'lang-ja' }, emphasised(item.textJa)),
        ]))),
      ])
      : null,
  ].filter(Boolean);
}
