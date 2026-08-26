import { el } from '../utils/dom.js';

/**
 * Scene selector, organised by organ.
 *
 * Two levels, because the subjects differ at two levels: which organ, and then
 * which process in it. The second level is only drawn when the current organ
 * actually has more than one scene — a row with a single pill in it is a
 * promise of choice that is not there.
 *
 * Switching writes the URL hash and lets the app reload, which guarantees a
 * clean GPU state — cheap, and switching scenes is rare.
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

  const organRow = el(
    'div',
    { class: 'scene-row scene-organs', role: 'tablist', 'aria-label': 'Organ' },
    organs.map((organ) => {
      const isCurrent = organ.id === current.id;
      // An organ tab leads to its first scene; once inside, the second row
      // takes over. The names are in the tooltip so the tab still says what is
      // behind it while it is the only row on screen.
      const destination = isCurrent ? currentId : organ.scenes[0].id;
      return el(
        'a',
        {
          class: `scene-pill${isCurrent ? ' is-current' : ''}`,
          href: `#/${destination}`,
          role: 'tab',
          'aria-selected': String(isCurrent),
          title: organ.scenes.map((scene) => scene.label).join(' · '),
        },
        [
          el('span', { class: 'lang-en', text: organ.label }),
          el('span', { class: 'lang-ja', text: organ.labelJa ?? organ.label }),
        ]
      );
    })
  );

  const children = [organRow];

  if (current.scenes.length > 1) {
    children.push(
      el(
        'div',
        { class: 'scene-row scene-topics', 'aria-label': current.label },
        current.scenes.map((scene) =>
          el(
            'a',
            {
              class: `scene-pill scene-topic${scene.id === currentId ? ' is-current' : ''}`,
              href: `#/${scene.id}`,
              'aria-current': scene.id === currentId ? 'page' : null,
            },
            [
              el('span', { class: 'lang-en', text: scene.label }),
              el('span', { class: 'lang-ja', text: scene.labelJa ?? scene.label }),
            ]
          )
        )
      )
    );
  }

  const element = el('nav', { class: 'panel scene-switcher', 'aria-label': 'Topic' }, children);

  return { element };
}
