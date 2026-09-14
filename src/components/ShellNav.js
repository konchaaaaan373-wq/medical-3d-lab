import { el } from '../utils/dom.js';
import { shellNavLinks } from '../app/shellDestinations.js';

/**
 * The shell's navigation row, as links.
 *
 * Every surface used to hand-write this row, and every surface wrote it
 * differently — a different set of destinations, a different order, a different
 * word for the same page, and on the legal documents no way home at all. The
 * destinations and their names are decided in `app/shellDestinations.js`; this
 * is the one place that turns them into anchors, so a surface chooses only
 * where it is and what it looks like.
 *
 * @param {{current?: string|null, labUnlocked?: boolean, className?: string}} options
 * @returns {HTMLElement[]}
 */
export function shellNavAnchors({ current = null, labUnlocked = false, className = '' } = {}) {
  return shellNavLinks({ current, labUnlocked }).map((destination) =>
    el('a', {
      class: className || null,
      href: destination.route,
      'data-destination': destination.id,
    }, [
      el('span', { class: 'lang-en', text: destination.en }),
      el('span', { class: 'lang-ja', text: destination.ja }),
    ])
  );
}
