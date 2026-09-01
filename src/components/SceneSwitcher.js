import { el } from '../utils/dom.js';
import { EXPLORER_ROUTE, LAB_ROUTE, LANDING_ROUTE } from '../catalog/index.js';
import { readSceneLibrary, toggleSceneFavorite } from '../app/sceneLibrary.js';

/**
 * Fixed product-shell navigation for a 3D scene.
 *
 * `groups` is already projected to either the public catalogue or Experimental
 * Lab by `sceneRegistry`. This component never recombines those shelves: a
 * public scene menu cannot silently list Prototype work beside reviewed models,
 * and a Prototype scene keeps its peers inside Lab.
 *
 * Favorites are local navigation preferences only. They store scene IDs and do
 * not carry model, patient, account or billing state.
 */
export function createSceneSwitcher({ groups, currentId }) {
  const scenes = groups.flatMap((group) => group.scenes);
  if (!scenes.length) return null;

  const currentScene = scenes.find((scene) => scene.id === currentId) ?? scenes[0];
  const currentGroup =
    groups.find((group) => group.scenes.some((scene) => scene.id === currentScene.id)) ?? groups[0];
  const isLab = currentScene.status === 'prototype';

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

  const favoriteButton = el('button', {
    class: 'global-nav-favorite',
    type: 'button',
    'aria-pressed': 'false',
  });

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

  const browseCurrentShelf = el(
    'a',
    {
      class: 'global-nav-explorer',
      href: isLab ? LAB_ROUTE : EXPLORER_ROUTE,
    },
    [
      el('span', { class: 'global-nav-explorer-mark', 'aria-hidden': 'true', text: '＋' }),
      bilingual(
        isLab ? 'Browse Experimental Lab' : 'Browse all public models',
        isLab ? '実験モデル一覧' : '公開モデル一覧',
        'global-nav-explorer-copy'
      ),
      el('span', { class: 'global-nav-arrow', 'aria-hidden': 'true', text: '→' }),
    ]
  );

  const switchShelf = el(
    'a',
    {
      class: 'global-nav-explorer is-secondary',
      href: isLab ? EXPLORER_ROUTE : LAB_ROUTE,
    },
    [
      el('span', { class: 'global-nav-explorer-mark', 'aria-hidden': 'true', text: isLab ? '✓' : '◇' }),
      bilingual(
        isLab ? 'Switch to public models' : 'Open Experimental Lab',
        isLab ? '公開モデルへ戻る' : '実験モデルを見る',
        'global-nav-explorer-copy'
      ),
      el('span', { class: 'global-nav-arrow', 'aria-hidden': 'true', text: '→' }),
    ]
  );

  const favoriteList = el('div', { class: 'global-nav-favorite-list' });
  const favoriteSection = el('section', { class: 'global-nav-favorites', hidden: '' }, [
    el('h2', { class: 'global-nav-favorites-title' }, [bilingual('Favorites', 'お気に入り')]),
    favoriteList,
  ]);

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
        el('h2', { class: 'global-nav-system-name' }, [bilingual(group.label, group.labelJa)]),
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
          bilingual(
            isLab ? 'Experimental Lab' : 'Choose organ / disease',
            isLab ? '実験モデル' : '臓器・病態を選ぶ'
          ),
        ]),
        closeButton,
      ]),
      browseCurrentShelf,
      switchShelf,
      favoriteSection,
      el('div', { class: 'global-nav-grid' }, groupSections),
    ]
  );

  const brand = el(
    'a',
    {
      class: 'global-nav-brand',
      href: LANDING_ROUTE,
      title: 'Medical 3D Lab — Home',
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
    { class: `global-scene-nav${isLab ? ' is-lab' : ' is-public'}`, 'aria-label': 'Medical 3D Lab' },
    [brand, currentLocation, favoriteButton, trigger, backdrop, panel]
  );

  function renderLibrary(library = readSceneLibrary()) {
    // Favorites shown in this menu are constrained to this shelf. Cross-shelf
    // favorites remain saved and appear when the viewer enters that shelf.
    const saved = library.favorites
      .map((id) => scenes.find((scene) => scene.id === id))
      .filter(Boolean);
    const currentSaved = library.favorites.includes(currentScene.id);

    favoriteButton.textContent = currentSaved ? '★' : '☆';
    favoriteButton.setAttribute('aria-pressed', String(currentSaved));
    favoriteButton.setAttribute(
      'aria-label',
      currentSaved
        ? 'Remove current scene from favorites / お気に入りから外す'
        : 'Add current scene to favorites / お気に入りに追加'
    );
    favoriteButton.title = currentSaved
      ? 'Remove from favorites / お気に入りから外す'
      : 'Add to favorites / お気に入りに追加';

    favoriteList.replaceChildren(
      ...saved.map((scene) =>
        el('a', { class: 'global-nav-favorite-link', href: `#/${scene.slug ?? scene.id}` }, [
          el('span', { class: 'global-nav-favorite-star', 'aria-hidden': 'true', text: '★' }),
          bilingual(scene.label, scene.labelJa, 'global-nav-favorite-name'),
        ])
      )
    );
    favoriteSection.hidden = saved.length === 0;
  }

  function setOpen(next, { restoreFocus = false } = {}) {
    if (open === next) return;
    open = next;
    element.classList.toggle('is-open', open);
    panel.hidden = !open;
    backdrop.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    if (!open && restoreFocus) trigger.focus();
  }

  favoriteButton.addEventListener('click', () => {
    renderLibrary(toggleSceneFavorite(currentScene.id));
  });
  trigger.addEventListener('click', () => setOpen(!open));
  closeButton.addEventListener('click', () => setOpen(false, { restoreFocus: true }));
  backdrop.addEventListener('click', () => setOpen(false, { restoreFocus: true }));

  panel.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  // Native navigation controls own their keyboard events rather than leaking to
  // the model's global Space/Escape/letter shortcuts.
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false, { restoreFocus: true });
    }
    event.stopPropagation();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false, { restoreFocus: true });
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (open && !element.contains(event.target)) setOpen(false);
  });

  renderLibrary();

  return { element, close: () => setOpen(false) };
}
