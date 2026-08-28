import { el } from '../utils/dom.js';
import { EXPLORER_ROUTE } from '../catalog/index.js';

/**
 * Scene selector, organised by body system.
 *
 * Two levels, because the subjects differ at two levels: which system, and then
 * which scene within it. The top level is the system rather than the organ:
 * with twenty-odd organs an organ row no longer fits on a phone, and "which
 * system" is the question a viewer can answer without thinking. The organ level
 * is not lost — it is how the organ explorer is arranged, and the link at the
 * end of the first row leads there.
 *
 * The second row is only drawn when the current system actually has more than
 * one scene — a row with a single pill in it is a promise of choice that is not
 * there.
 *
 * These are links, not tabs. Choosing one writes the URL hash and lets the app
 * reload, which guarantees a clean GPU state — cheap, and switching scenes is
 * rare. That also means the ARIA that belongs here is `aria-current="page"` on
 * whichever links point at the page you are already on, not the tab roles a
 * widget with panels and arrow-key navigation would need.
 *
 * @param {{
 *   groups: {id: string, label: string, labelJa?: string, scenes: any[]}[],
 *   currentId: string,
 * }} options
 */
export function createSceneSwitcher({ groups, currentId }) {
  const total = groups.reduce((count, group) => count + group.scenes.length, 0);
  if (total < 2) return null; // nothing to switch between yet

  const current = groups.find((group) => group.scenes.some((scene) => scene.id === currentId)) ?? groups[0];

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

  const systemRow = el('div', { class: 'scene-row scene-organs' }, [
    ...groups.map((group) =>
      pill(group, {
        // A system tab leads to its first scene; once inside, the second row
        // takes over. The names are in the tooltip so the tab still says what
        // is behind it while it is the only row on screen.
        href: `#/${group.id === current.id ? currentId : group.scenes[0].slug ?? group.scenes[0].id}`,
        isCurrent: group.id === current.id,
        title: group.scenes.map((scene) => scene.label).join(' · '),
      })
    ),
    // The way out to the full catalogue, organ by organ.
    pill(
      { label: 'All organs', labelJa: '全臓器' },
      { href: EXPLORER_ROUTE, isCurrent: false, className: ' scene-explore', title: 'Organ explorer' }
    ),
  ]);

  const children = [systemRow];

  if (current.scenes.length > 1) {
    children.push(
      el(
        'div',
        { class: 'scene-row scene-topics' },
        current.scenes.map((scene) =>
          pill(scene, {
            href: `#/${scene.slug ?? scene.id}`,
            isCurrent: scene.id === currentId,
            className: ' scene-topic',
          })
        )
      )
    );
  }

  const element = el('nav', { class: 'panel scene-switcher', 'aria-label': 'Scenes' }, children);

  return { element };
}
