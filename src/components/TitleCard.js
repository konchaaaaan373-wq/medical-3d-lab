import { el } from '../utils/dom.js';

/** Top-left identity block. Sized to survive a 1080x1350 crop for social posts. */
export function createTitleCard(meta) {
  return el('header', { class: 'panel title-card' }, [
    el('p', { class: 'eyebrow', text: 'medical-3d-lab' }),
    el('h1', { class: 'title lang-en', text: meta.title }),
    el('p', { class: 'title-ja lang-ja', text: meta.titleJa }),
    el('p', { class: 'subtitle' }, [
      el('span', { class: 'lang-ja', text: meta.subtitleJa }),
      el('span', { class: 'lang-en', text: meta.subtitle }),
    ]),
  ]);
}
