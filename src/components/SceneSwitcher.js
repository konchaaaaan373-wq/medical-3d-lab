import { el } from '../utils/dom.js';

/**
 * Scene selector, organised by organ.
 *
 * Two levels, because the subjects differ at two levels: which organ, and then
 * which process in it. The second level is only drawn when the current organ
 * actually has more than one scene — a row with a single pill in it is a
 * promise of choice that is not there.
 *
 * These are links, not tabs. Choosing one writes the URL hash and lets the app
 * reload, which guarantees a clean GPU state — cheap, and switching scenes is
 * rare. That also means the ARIA that belongs here is `aria-current="page"` on
 * whichever links point at the page you are already on, not the tab roles a
 * widget with panels and arrow-key navigation would need.
 *
 * @param {{
 *   organs: {id: string, label: string, labelJa?: string, scenes: any[]}[],
 *   currentId: string,
 * }} options
 */
export function createSceneSwitcher({ organs, currentId }) {
  const total = organs.reduce((count, organ) => count + organ.scenes.length, 0);
  if (total < 2) return null; // nothing to switch between yet

  const current = organs.find((organ) => organ.scenes.some((scene) => scene.id === currentId)) ?? organs[0];

  /** @param {{label: string, labelJa?: string}} entry */
  const pill = (entry, { href, isCurrent, className = '', title }) =>
    el(
      'a',
      {
        class: `scene-pill${className}${isCurrent ? ' is-current' : ''}`,
        href,
        // True of both rows when both are drawn: each is a link to the page
        // being looked at, which is exactly what `page` means.
        'aria-current': isCurrent ? 'page' : null,
        title: title ?? null,
      },
      [
        el('span', { class: 'lang-en', text: entry.label }),
        el('span', { class: 'lang-ja', text: entry.labelJa ?? entry.label }),
      ]
    );

  const organRow = el(
    'div',
    { class: 'scene-row scene-organs' },
    organs.map((organ) =>
      pill(organ, {
        // An organ tab leads to its first scene; once inside, the second row
        // takes over. The names are in the tooltip so the tab still says what
        // is behind it while it is the only row on screen.
        href: `#/${organ.id === current.id ? currentId : organ.scenes[0].id}`,
        isCurrent: organ.id === current.id,
        title: organ.scenes.map((scene) => scene.label).join(' · '),
      })
    )
  );

  const children = [organRow];

  if (current.scenes.length > 1) {
    children.push(
      el(
        'div',
        { class: 'scene-row scene-topics' },
        current.scenes.map((scene) =>
          pill(scene, { href: `#/${scene.id}`, isCurrent: scene.id === currentId, className: ' scene-topic' })
        )
      )
    );
  }

  const element = el('nav', { class: 'panel scene-switcher', 'aria-label': 'Scenes' }, children);

  return { element };
}
