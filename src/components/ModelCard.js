import { el } from '../utils/dom.js';
import { sceneRoute } from '../catalog/index.js';
import { showcaseFor } from '../data/modelShowcase.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const dual = (en, ja, className = '') => [
  el('span', { class: `${className} lang-en`.trim(), text: en }),
  el('span', { class: `${className} lang-ja`.trim(), text: ja }),
];

/**
 * A disease model on a list: its picture, its name, and its question.
 *
 * The picture is the card (ADR 2026-09-30): one link, the whole card, and the
 * visual takes most of it. No badge, no pill, no "open →" button under a
 * paragraph — a list of models that looked like a SaaS feature grid was the
 * thing the rebrand set out to stop being. What a model is not, and how far
 * to trust it, is said inside the model (「このモデルについて」).
 *
 * @param {object} scene a catalogue entry
 * @param {{ headingLevel?: 2|3|4, feature?: boolean }} [options] `feature`
 *   gives the card the wide layout a list uses for its first model
 */
export function createModelCard(scene, { headingLevel = 3, feature = false } = {}) {
  const card = showcaseFor(scene);
  return el(
    'a',
    {
      class: `model-card${feature ? ' is-feature' : ''}`,
      href: sceneRoute(scene),
      dataset: { scene: scene.id },
    },
    [
      el('span', { class: 'model-card-visual' }, [
        card.poster
          ? el('img', {
              class: 'model-card-image',
              src: card.poster,
              alt: '',
              loading: 'lazy',
              decoding: 'async',
              width: '1200',
              height: '750',
            })
          : quietVisual(scene.id),
      ]),
      el('span', { class: 'model-card-text' }, [
        card.system ? el('span', { class: 'model-card-system' }, dual(card.system.en, card.system.ja)) : null,
        el(`h${headingLevel}`, { class: 'model-card-name' }, dual(card.name.en, card.name.ja)),
        card.question ? el('p', { class: 'model-card-question' }, dual(card.question.en, card.question.ja)) : null,
      ]),
    ]
  );
}

/**
 * The panel a card shows when no photograph of the model exists yet.
 *
 * Three lines and the points travelling on them — the product's own motif, not
 * a picture of anything. It must not look like data: no axes, no values, and
 * the same few shapes for every model, varied only enough that two cards side
 * by side are not identical. A drawing that suggested *this* model's behaviour
 * would be the card making a claim the model has not been asked.
 *
 * @param {string} seed
 */
function quietVisual(seed) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 240 150');
  svg.setAttribute('class', 'model-card-motif');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  for (let lane = 0; lane < 3; lane += 1) {
    const y = 48 + lane * 27;
    const bend = ((hash >> (lane * 4)) % 13) - 6;
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', `M-10 ${y} C 70 ${y + bend}, 150 ${y - bend}, 250 ${y}`);
    path.setAttribute('class', 'model-card-motif-line');
    svg.append(path);
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', String(40 + ((hash >> (lane * 3)) % 150)));
    dot.setAttribute('cy', String(y + bend * 0.2));
    dot.setAttribute('r', lane === 1 ? '4.5' : '3');
    dot.setAttribute('class', lane === 1 ? 'model-card-motif-dot is-change' : 'model-card-motif-dot');
    svg.append(dot);
  }
  return svg;
}
