import { el } from '../utils/dom.js';

/**
 * What a change did, as a chain the reader reads left to right (or top to
 * bottom): what was changed → what the heart and the blood did → what the
 * figures did.
 *
 * The chain is the scene's (`getEffectSummary`): solved start → now pairs,
 * each said only when its displayed value moved. This only lays it out. With
 * nothing changed it says where the chain will appear, in one line.
 *
 * @param {{ copy: { empty?: string, emptyJa?: string, cause?: string, causeJa?: string,
 *   heart?: string, heartJa?: string, results?: string, resultsJa?: string } }} options
 */
export function createEffectChain({ copy = {} } = {}) {
  const dual = (en, ja, className = '') =>
    el('span', { class: className }, [
      el('span', { class: 'lang-en', text: en ?? '' }),
      el('span', { class: 'lang-ja', text: ja ?? '' }),
    ]);

  const element = el('div', { class: 'effect-chain', 'aria-live': 'polite', dataset: { state: 'empty' } });

  function step(kind, title, lines) {
    return el('div', { class: `effect-step is-${kind}` }, [
      dual(title.en, title.ja, 'effect-step-title'),
      el('ul', { class: 'effect-step-lines' }, lines.map((line) =>
        el('li', { dataset: { effect: line.id ?? kind } }, [
          dual(line.en, line.ja, 'effect-line-full'),
          dual(line.shortEn ?? line.en, line.shortJa ?? line.ja, 'effect-line-short'),
        ])
      )),
    ]);
  }

  let last = null;
  return {
    element,
    /** @param {null | { cause: object, heart: object[], results: object[] }} summary */
    update(summary) {
      const key = JSON.stringify(summary);
      if (key === last) return;
      last = key;
      if (!summary) {
        element.dataset.state = 'empty';
        element.replaceChildren(el('p', { class: 'effect-empty' }, [dual(copy.empty, copy.emptyJa)]));
        return;
      }
      element.dataset.state = 'changed';
      const arrow = () => el('span', { class: 'effect-arrow', 'aria-hidden': 'true', text: '→' });
      element.replaceChildren(
        step('cause', { en: copy.cause, ja: copy.causeJa }, [{ id: 'cause', ...summary.cause }]),
        arrow(),
        step('heart', { en: copy.heart, ja: copy.heartJa }, summary.heart.length ? summary.heart : [{ id: 'none', en: '—', ja: '—' }]),
        arrow(),
        step('results', { en: copy.results, ja: copy.resultsJa }, summary.results.length ? summary.results : [{ id: 'none', en: '—', ja: '—' }])
      );
    },
  };
}
