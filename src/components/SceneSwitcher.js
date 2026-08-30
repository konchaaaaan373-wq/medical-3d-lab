import { el } from '../utils/dom.js';
import { EXPLORER_ROUTE } from '../catalog/index.js';

/**
 * Global scene navigation.
 *
 * This used to be two horizontally scrolling rows inside the scene's left
 * panel. That worked when the catalogue was tiny, but once the lab grew to
 * eleven systems it stopped reading as navigation at all: the way to another
 * organ looked like one more data panel and, on a phone, most of it lived off
 * screen.
 *
 * The catalogue and routing are unchanged. This component only changes the
 * information architecture:
 *
 * - the current system / scene is always visible in a fixed header;
 * - one explicit "Choose organ / disease" control opens the whole catalogue;
 * - desktop gets a compact system-by-system mega menu;
 * - narrow screens get the same content as a right-side drawer;
 * - "All organs" remains the way to the full explorer.
 *
 * Links stay links rather than becoming tabs. Selecting a scene writes the hash
 * and lets the app reload, which preserves the existing clean-GPU-state scene
 * switch. `aria-current="page"` therefore remains the correct selection state.
 *
 * @param {{
 *   groups: {id: string, label: string, labelJa?: string, scenes: any[]}[],
 *   currentId: string,
 * }} options
 */
export function createSceneSwitcher({ groups, currentId }) {
  const scenes = groups.flatMap((group) => group.scenes);
  if (!scenes.length) return null;

  const currentScene = scenes.find((scene) => scene.id === currentId) ?? scenes[0];
  const currentGroup =
    groups.find((group) => group.scenes.some((scene) => scene.id === currentScene.id)) ?? groups[0];

  const ui = document.getElementById('ui');
  ui?.classList.add('has-global-scene-nav');

  const bilingual = (en, ja, className = '') =>
    el('span', { class: className }, [
      el('span', { class: 'lang-en', text: en }),
      el('span', { class: 'lang-ja', text: ja ?? en }),
    ]);

  const menuId = 'scene-navigation-panel';
  let open = false;

  const trigger = el(
    'button',
    {
      class: 'global-nav-trigger',
      type: 'button',
      'aria-expanded': 'false',
      'aria-controls': menuId,
      title: 'Choose organ / disease',
    },
    [
      el('span', { class: 'global-nav-menu-icon', 'aria-hidden': 'true' }, [
        el('span'),
        el('span'),
        el('span'),
      ]),
      bilingual('Choose organ / disease', '臓器・病態を選ぶ', 'global-nav-trigger-label'),
    ]
  );

  const backdrop = el('div', {
    class: 'global-nav-backdrop',
    hidden: '',
    'aria-hidden': 'true',
  });

  const closeButton = el('button', {
    class: 'global-nav-close',
    type: 'button',
    'aria-label': 'Close navigation',
    title: 'Close',
    text: '×',
  });

  const allOrgans = el(
    'a',
    {
      class: 'global-nav-explorer',
      href: EXPLORER_ROUTE,
    },
    [
      el('span', { class: 'global-nav-explorer-mark', 'aria-hidden': 'true', text: '＋' }),
      bilingual('Browse all organs', '全臓器から探す', 'global-nav-explorer-copy'),
      el('span', { class: 'global-nav-arrow', 'aria-hidden': 'true', text: '→' }),
    ]
  );

  const groupSections = groups.map((group) => {
    const isCurrentSystem = group.id === currentGroup.id;
    const sceneLinks = group.scenes.map((scene) => {
      const isCurrent = scene.id === currentScene.id;
      return el(
        'a',
        {
          class: `global-nav-scene${isCurrent ? ' is-current' : ''}`,
          href: `#/${scene.slug ?? scene.id}`,
          'aria-current': isCurrent ? 'page' : null,
        },
        [
          bilingual(scene.label, scene.labelJa, 'global-nav-scene-name'),
          isCurrent ? el('span', { class: 'global-nav-current-dot', 'aria-hidden': 'true' }) : null,
        ]
      );
    });

    return el(
      'section',
      { class: `global-nav-system${isCurrentSystem ? ' is-current' : ''}` },
      [
        el('h2', { class: 'global-nav-system-name' }, [
          bilingual(group.label, group.labelJa),
        ]),
        el('div', { class: 'global-nav-scenes' }, sceneLinks),
      ]
    );
  });

  const panel = el(
    'div',
    {
      id: menuId,
      class: 'global-nav-panel',
      hidden: '',
      'aria-label': 'Organ and disease navigation',
    },
    [
      el('div', { class: 'global-nav-panel-head' }, [
        el('div', { class: 'global-nav-panel-title' }, [
          bilingual('Choose organ / disease', '臓器・病態を選ぶ'),
        ]),
        closeButton,
      ]),
      allOrgans,
      el('div', { class: 'global-nav-grid' }, groupSections),
    ]
  );

  const brand = el(
    'a',
    {
      class: 'global-nav-brand',
      href: EXPLORER_ROUTE,
      title: 'Medical 3D Lab — Organ explorer',
    },
    [
      el('span', { class: 'global-nav-brand-mark', 'aria-hidden': 'true', text: '3D' }),
      el('span', { class: 'global-nav-brand-name', text: 'Medical 3D Lab' }),
    ]
  );

  const currentLocation = el('div', { class: 'global-nav-current', 'aria-label': 'Current scene' }, [
    bilingual(currentGroup.label, currentGroup.labelJa, 'global-nav-current-system'),
    el('span', { class: 'global-nav-separator', 'aria-hidden': 'true', text: '/' }),
    bilingual(currentScene.label, currentScene.labelJa, 'global-nav-current-scene'),
  ]);

  const element = el(
    'nav',
    { class: 'global-scene-nav', 'aria-label': 'Medical 3D Lab' },
    [brand, currentLocation, trigger, backdrop, panel]
  );

  function setOpen(next, { restoreFocus = false } = {}) {
    if (open === next) return;
    open = next;
    element.classList.toggle('is-open', open);
    panel.hidden = !open;
    backdrop.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (!open && restoreFocus) trigger.focus();
  }

  trigger.addEventListener('click', () => setOpen(!open));
  closeButton.addEventListener('click', () => setOpen(false, { restoreFocus: true }));
  backdrop.addEventListener('click', () => setOpen(false, { restoreFocus: true }));

  panel.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  // The app has global Space / Escape / letter shortcuts. While focus is in
  // navigation, native button/link keyboard behaviour must win rather than also
  // playing the model or leaving a lesson. Escape closes this surface first.
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false, { restoreFocus: true });
    }
    event.stopPropagation();
  });

  // Escape also closes an open menu when focus happens to be elsewhere. Stop
  // it here so the window-level Escape shortcut does not close two UI layers at
  // once (for example the menu and a learning module).
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false, { restoreFocus: true });
    }
  });

  // A click anywhere that is neither the header nor its drawer closes a desktop
  // mega menu. On mobile the backdrop catches the same intent before this does.
  document.addEventListener('pointerdown', (event) => {
    if (open && !element.contains(event.target)) setOpen(false);
  });

  return { element, close: () => setOpen(false) };
}
