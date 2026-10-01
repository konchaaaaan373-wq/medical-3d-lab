import { el } from '../utils/dom.js';
import { BRAND } from '../data/brand.js';

/**
 * BYOKI MOTION, set as type.
 *
 * The product has no pictorial logo on purpose (ADR 2026-09-30): a heart, a
 * brain or an ECG trace would say "medical 3D" — the thing it stopped being.
 * The name carries it. BYOKI is set a weight heavier; MOTION opens up letter by
 * letter, so the second word reads as if it were still moving. That is the
 * whole treatment — no gradient, no animation, nothing that costs a frame.
 *
 * Accessible as one word: the letters are presentational and a visually
 * hidden copy of the name is what a screen reader, a search and a copy-paste
 * see. Inside a link, the link's own label wins anyway.
 *
 * @param {{ className?: string, size?: 'sm'|'md'|'lg'|'xl' }} [options]
 * @returns {HTMLElement}
 */
export function createWordmark({ className = '', size = 'md' } = {}) {
  const [first, second] = BRAND.words;
  return el('span', { class: `wordmark is-${size} ${className}`.trim() }, [
    el('span', { class: 'visually-hidden', text: BRAND.name }),
    el('span', { class: 'wordmark-type', 'aria-hidden': 'true' }, [
      el('span', { class: 'wordmark-first', text: first }),
      el(
        'span',
        { class: 'wordmark-second' },
        [...second].map((letter, index) =>
          el('span', { class: 'wordmark-letter', dataset: { step: String(index) }, text: letter })
        )
      ),
    ]),
  ]);
}
