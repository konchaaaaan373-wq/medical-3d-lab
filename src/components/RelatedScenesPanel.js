import { el } from '../utils/dom.js';
import { TRANSITION_COPY } from '../data/relatedContract.js';

/**
 * Where else this subject is shown, and what those other scenes are not.
 *
 * Every scene has one of these or none; it is the **only** place the app draws
 * onward routes, so a reader meets them in the same position whatever they are
 * looking at, and there is no second copy to drift. The list arrives already
 * filtered by the release gate — a scene the release is holding back is absent
 * rather than linked to a placeholder — and an empty list means no panel.
 *
 * ### The note is not decoration
 *
 * These links cross between models that were built separately: a fixed
 * cadaveric specimen, a solved ventricle, a territory-mapped myocardium, a
 * schematic of molecules. Two scenes reached from one panel read as two states
 * of one thing unless something says otherwise, and for the brain link it has a
 * second job — the amyloid scene has no anatomical scale, so moving to it is a
 * change of subject and **not a zoom**. `note` carries that, and each entry's
 * own line repeats the essential half, because a reader scanning a list may
 * never reach the paragraph.
 *
 * @param {{scenes: {slug:string,label:string,labelJa:string,why:string,whyJa:string}[],
 *          note?: string, noteJa?: string}} related
 */
export function createRelatedScenesPanel(related) {
  const scenes = related?.scenes ?? [];
  if (!scenes.length) return null;

  const list = el('ul', { class: 'related-list' }, scenes.map((entry) => {
    // A crossing to another scale is marked before the reader follows it, and
    // the two kinds are marked differently — a magnified real part is a
    // promise the model can keep, a schematic is not. `relatedContract.js`.
    const scale = entry.transitionType === 'scale-change'
      ? TRANSITION_COPY[entry.scaleRelationship] ?? null
      : null;
    const item = el('li', { class: 'related-item' }, [
      el('a', { class: 'related-link', href: `#/${entry.slug}` }, [
        el('span', { class: 'lang-en', text: entry.label }),
        el('span', { class: 'lang-ja', text: entry.labelJa }),
      ]),
      scale
        ? el('span', { class: 'related-scale', 'data-scale': entry.scaleRelationship }, [
            el('span', { class: 'lang-en', text: scale.en }),
            el('span', { class: 'lang-ja', text: scale.ja }),
          ])
        : null,
      el('span', { class: 'related-why' }, [
        el('span', { class: 'lang-en' }, emphasised(entry.why)),
        el('span', { class: 'lang-ja' }, emphasised(entry.whyJa)),
      ]),
    ].filter(Boolean));
    if (entry.transitionType) item.setAttribute('data-transition', entry.transitionType);
    return item;
  }));

  const note = related.note
    ? el('p', { class: 'related-note' }, [
        el('span', { class: 'lang-en' }, emphasised(related.note)),
        el('span', { class: 'lang-ja' }, emphasised(related.noteJa)),
      ])
    : null;

  const body = el('div', { class: 'related-body' }, [list, note].filter(Boolean));
  body.hidden = true;

  const toggle = el('button', { class: 'related-toggle', type: 'button', 'aria-expanded': 'false' }, [
    el('span', { class: 'lang-en', text: 'What is shown elsewhere' }),
    el('span', { class: 'lang-ja', text: 'この先はどこで見られるか' }),
  ]);

  const element = el('div', { class: 'panel related-scenes' }, [toggle, body]);
  toggle.addEventListener('click', () => {
    const open = body.hidden;
    body.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    element.classList.toggle('is-open', open);
  });

  return { element, open() { if (body.hidden) toggle.click(); } };
}

/** `**like this**` as real emphasis, built as nodes rather than assigned HTML. */
function emphasised(text) {
  const parts = String(text ?? '').split(/\*\*(.+?)\*\*/gs);
  return parts.map((part, index) =>
    index % 2 === 1 ? el('strong', { text: part }) : document.createTextNode(part)
  );
}
