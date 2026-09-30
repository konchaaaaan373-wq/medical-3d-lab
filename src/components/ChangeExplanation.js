import { el } from '../utils/dom.js';
import { explainChange } from '../app/changeExplanation.js';
import { currentAudience, onAudienceChange } from '../app/audience.js';

/**
 * 「今、何が起きた？」 — the sentence under the chain of changes that says why.
 *
 * Input → the model's state → the figures → **why**: the first three were on
 * screen already (the inputs, the heart, `EffectChain`); this is the fourth,
 * so the whole causal line reads on one screen (ADR 2026-09-30).
 *
 * It says nothing until the reader has moved something the scene's rules have
 * an answer for, and nothing when no rule matches — the chain and the figures
 * still say what happened. The words follow the reader's side, Medical or
 * Patient (`audience.js`), from the same matched rule.
 *
 * @param {{ rules: ReadonlyArray<import('../app/changeExplanation.js').ChangeRule>,
 *   copy: { heading: { en: string, ja: string } } }} options
 */
export function createChangeExplanation({ rules, copy }) {
  const textEn = el('span', { class: 'lang-en' });
  const textJa = el('span', { class: 'lang-ja' });
  const element = el('section', { class: 'change-explanation', hidden: '' }, [
    el('h4', { class: 'change-explanation-heading' }, [
      el('span', { class: 'lang-en', text: copy.heading.en }),
      el('span', { class: 'lang-ja', text: copy.heading.ja }),
    ]),
    el('p', { class: 'change-explanation-text', 'aria-live': 'polite' }, [textEn, textJa]),
  ]);

  let signature = null;
  let said = null;
  function render() {
    const found = explainChange(signature, rules, currentAudience());
    const key = found ? `${found.id}|${found.audience}` : null;
    if (key === said) return;
    said = key;
    element.hidden = !found;
    element.dataset.rule = found?.id ?? '';
    element.dataset.audience = found?.audience ?? '';
    textEn.textContent = found?.en ?? '';
    textJa.textContent = found?.ja ?? '';
  }
  const stop = onAudienceChange(render);

  return {
    element,
    /** @param {Parameters<typeof explainChange>[0]} next */
    update(next) {
      signature = next;
      render();
    },
    destroy: stop,
  };
}
