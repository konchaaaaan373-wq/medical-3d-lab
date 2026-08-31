import { el } from '../utils/dom.js';

/**
 * What this model answers, what it does not, and where its numbers came from.
 *
 * A scene that has lost its **Prototype** badge is saying "the numbers on this
 * screen can be relied on". That claim is only safe if the boundary of the
 * claim is on the same screen — which question the model answers, which
 * questions it will happily produce a plausible number for and should not be
 * believed about, and what the constants were taken from.
 *
 * Collapsed by default, because it is a reference rather than a thing to read
 * first; one click away, because a reader who wants to know whether to trust a
 * figure wants to know *now*, not after finding the repository.
 *
 * ### Shape (declared beside the scene's copy in `src/data/`)
 * ```
 * { question, questionJa,
 *   answers:  [{ text, textJa }],   // what the model is built to get right
 *   excludes: [{ text, textJa }],   // what it does not represent at all
 *   cautions: [{ text, textJa }],   // where it will mislead if pushed
 *   sources:  [{ text, textJa, kind }],
 *   evidence: 'docs/model-evidence/<id>.md' }
 * ```
 *
 * @param {object} scope
 */
export function createModelScopePanel(scope) {
  const body = el('div', { class: 'scope-body' }, [
    section('What this model is for', 'このモデルが答えること', [
      el('p', { class: 'scope-question' }, [
        el('span', { class: 'lang-en', text: scope.question }),
        el('span', { class: 'lang-ja', text: scope.questionJa }),
      ]),
      list(scope.answers, 'scope-answers'),
    ]),
    section('What it does not represent', '表現していないこと', [list(scope.excludes, 'scope-excludes')]),
    scope.cautions?.length
      ? section('Where it will mislead', '誤解しやすいところ', [list(scope.cautions, 'scope-cautions')])
      : null,
    section('Where the numbers came from', '数値の出どころ', [
      list(scope.sources, 'scope-sources'),
      scope.evidence
        ? el('p', { class: 'scope-evidence' }, [
            el('span', { class: 'lang-en', text: `Full working: ${scope.evidence}` }),
            el('span', { class: 'lang-ja', text: `詳細: ${scope.evidence}` }),
          ])
        : null,
    ]),
  ]);
  body.hidden = true;

  const toggle = el('button', { class: 'scope-toggle', type: 'button', 'aria-expanded': 'false' }, [
    el('span', { class: 'lang-en', text: 'Model scope & sources' }),
    el('span', { class: 'lang-ja', text: 'モデルの範囲と出典' }),
  ]);

  const element = el('div', { class: 'panel model-scope' }, [toggle, body]);

  toggle.addEventListener('click', () => {
    const open = body.hidden;
    body.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    element.classList.toggle('is-open', open);
  });

  return {
    element,
    /** Opened by a lesson or a story step that has just made a claim. */
    open() {
      if (!body.hidden) return;
      toggle.click();
    },
  };
}

function section(title, titleJa, children) {
  return el('section', { class: 'scope-section' }, [
    el('h4', { class: 'scope-section-title' }, [
      el('span', { class: 'lang-en', text: title }),
      el('span', { class: 'lang-ja', text: titleJa }),
    ]),
    ...children.filter(Boolean),
  ]);
}

function list(entries, className) {
  if (!entries?.length) return null;
  return el(
    'ul',
    { class: `scope-list ${className}` },
    entries.map((entry) =>
      el('li', { class: entry.kind ? `scope-item is-${entry.kind}` : 'scope-item' }, [
        el('span', { class: 'lang-en' }, emphasised(entry.text)),
        el('span', { class: 'lang-ja' }, emphasised(entry.textJa)),
      ])
    )
  );
}

/**
 * `**like this**` as real emphasis rather than as four asterisks.
 *
 * The scope copy has always been written with Markdown emphasis on the phrase
 * that carries the caveat — "**not** a required diagnostic step", "**a chosen
 * path through parameter space**" — and this panel used to render the asterisks
 * literally. It looked like a typo on the one sentence that most needed to be
 * read, and it did so in all four model-backed scenes.
 *
 * Built as text nodes and `<strong>` rather than assigned as HTML: this copy is
 * repository content, but a panel that interprets markup is one bad string away
 * from interpreting a tag.
 *
 * @param {string} text
 * @returns {(Node|string)[]}
 */
function emphasised(text) {
  const parts = String(text ?? '').split(/\*\*(.+?)\*\*/gs);
  return parts.map((part, index) =>
    index % 2 === 1 ? el('strong', { text: part }) : document.createTextNode(part)
  );
}
