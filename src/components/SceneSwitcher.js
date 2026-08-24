import { el } from '../utils/dom.js';

/**
 * Theme selector. Switching writes the URL hash and lets the app reload, which
 * guarantees a clean GPU state — cheap, and switching themes is rare.
 *
 * @param {{ scenes: {id:string,label:string,labelJa?:string}[], currentId: string }} options
 */
export function createSceneSwitcher({ scenes, currentId }) {
  if (scenes.length < 2) return null; // nothing to switch between yet

  const element = el(
    'nav',
    { class: 'panel scene-switcher', 'aria-label': 'Topic' },
    scenes.map((scene) =>
      el('a', {
        class: `scene-pill${scene.id === currentId ? ' is-current' : ''}`,
        href: `#/${scene.id}`,
        'aria-current': scene.id === currentId ? 'page' : null,
      }, [
        el('span', { class: 'lang-en', text: scene.label }),
        el('span', { class: 'lang-ja', text: scene.labelJa ?? scene.label }),
      ])
    )
  );

  return { element };
}
