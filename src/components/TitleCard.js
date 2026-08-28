import { el } from '../utils/dom.js';
import { statusById } from '../catalog/taxonomy.js';

/** Top-left identity block. Sized to survive a 1080x1350 crop for social posts. */
export function createTitleCard(meta) {
  // Anything short of production says so, next to the title. A viewer should
  // not have to read the disclaimer at the bottom of the screen to find out
  // that the shape in front of them is a sketch.
  const status = statusById(meta.status ?? 'production');
  const badge =
    status?.badge &&
    el('span', { class: `status-badge is-${status.id}`, title: status.note }, [
      el('span', { class: 'lang-en', text: status.label }),
      el('span', { class: 'lang-ja', text: status.labelJa }),
    ]);

  return el('header', { class: 'panel title-card' }, [
    el('p', { class: 'eyebrow', text: 'medical-3d-lab' }),
    el('h1', { class: 'title lang-en' }, [document.createTextNode(meta.title), badge || null]),
    el('p', { class: 'title-ja lang-ja', text: meta.titleJa }),
    el('p', { class: 'subtitle' }, [
      el('span', { class: 'lang-ja', text: meta.subtitleJa }),
      el('span', { class: 'lang-en', text: meta.subtitle }),
    ]),
  ]);
}
