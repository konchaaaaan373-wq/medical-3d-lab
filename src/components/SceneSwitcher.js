import { el } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import { EXPLORER_ROUTE, LAB_ROUTE, LANDING_ROUTE, organById } from '../catalog/index.js';
import { readSceneLibrary, toggleSceneFavorite } from '../app/sceneLibrary.js';
import { compactSceneLabel, scenesByOrganForNavigation } from '../app/sceneNavigationModel.js';

/**
 * Fixed product-shell navigation for a 3D scene.
 *
 * `groups` is already projected by `sceneRegistry`. This component never widens
 * that set. The visual hierarchy is deliberately flatter than the catalogue:
 * organ heading + model rows, with the anatomy/pathophysiology distinction only
 * when one organ actually contains both kinds.
 */
export function createSceneSwitcher({ groups, currentId, showLab = true }) {
  const scenes = groups.flatMap((group) => group.scenes);
  if (!scenes.length) return null;
  const hasChoices = scenes.length > 1;

  const currentScene = scenes.find((scene) => scene.id === currentId) ?? scenes[0];
  const currentGroup =
    groups.find((group) => group.scenes.some((scene) => scene.id === currentScene.id)) ?? groups[0];
  const isLab = currentScene.status === 'prototype';
  const currentOrgan = organById(currentScene.organ);
  const currentShort = compactSceneLabel(currentScene);
  const organGroups = scenesByOrganForNavigation(scenes, organById);

  const ui = document.getElementById('ui');
  ui?.classList.add('has-global-scene-nav');

  const bilingual = (en, ja, className = '') =>
    el('span', { class: className }, [
      el('span', { class: 'lang-en', text: en }),
      el('span', { class: 'lang-ja', text: ja ?? en }),
    ]);

  const menuId = 'scene-navigation-panel';
  let open = false;
  const inertBefore = new Map();
  const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
    'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  const trigger = el(
    'button',
    {
      class: 'global-nav-trigger',
      type: 'button',
      'aria-expanded': 'false',
      'aria-controls': menuId,
      'aria-label': 'Models / モデル',
      title: 'Models / モデル',
    },
    [
      bilingual('Models', 'モデル', 'global-nav-trigger-label'),
      el('span', { class: 'global-nav-trigger-chevron', 'aria-hidden': 'true', text: '⌄' }),
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
    'aria-label': 'Close models / モデルを閉じる',
    title: 'Close / 閉じる',
    text: '×',
  });

  const favoriteList = el('div', { class: 'global-nav-favorite-list' });
  const favoriteSection = el('section', { class: 'global-nav-favorites', hidden: '' }, [
    el('h2', { class: 'global-nav-favorites-title' }, [bilingual('Favorites', 'お気に入り')]),
    favoriteList,
  ]);

  const sceneLink = (scene) => {
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
        isCurrent
          ? el('span', { class: 'global-nav-current-check', 'aria-hidden': 'true', text: '✓' })
          : null,
      ]
    );
  };

  const kindGroup = (label, scenesForKind, showHeading) => {
    if (!scenesForKind.length) return null;
    return el('div', { class: 'global-nav-kind-group' }, [
      showHeading
        ? el('h3', { class: 'global-nav-kind-heading' }, [bilingual(label.en, label.ja)])
        : null,
      ...scenesForKind.map((scene) => sceneLink(scene)),
    ].filter(Boolean));
  };

  const organSection = (organ) => {
    const foundationKind = { en: 'Anatomy / physiology', ja: '解剖・生理' };
    const pathologyKind = { en: 'Pathophysiology', ja: '病態' };
    return el(
      'section',
      { class: `global-nav-organ${organ.id === currentScene.organ ? ' is-current' : ''}` },
      [
        el('h2', { class: 'global-nav-organ-name' }, [bilingual(organ.label, organ.labelJa)]),
        el('div', { class: 'global-nav-scenes' }, [
          kindGroup(foundationKind, organ.foundation, organ.hasBothKinds),
          kindGroup(pathologyKind, organ.pathophysiology, organ.hasBothKinds),
        ].filter(Boolean)),
      ]
    );
  };

  const list = el('div', { class: 'global-nav-list' }, organGroups.map(organSection));

  // Shelf navigation is useful, but it must not outrank choosing a model. Keep
  // it as compact footer navigation. The public beta never exposes Lab here.
  const footerLinks = [
    el('a', { class: 'global-nav-footer-link', href: isLab ? LAB_ROUTE : EXPLORER_ROUTE }, [
      bilingual(isLab ? 'Lab index' : 'Model index', isLab ? '実験モデル一覧' : 'モデル一覧'),
    ]),
  ];
  if (showLab) {
    footerLinks.push(
      el('a', {
        class: 'global-nav-footer-link is-secondary',
        href: isLab ? EXPLORER_ROUTE : LAB_ROUTE,
      }, [
        bilingual(isLab ? 'Public models' : 'Experimental Lab', isLab ? '公開モデル' : '実験モデル'),
      ])
    );
  }
  const footer = el('nav', {
    class: 'global-nav-footer',
    'aria-label': 'Model lists / モデル一覧',
  }, footerLinks);

  const panel = el(
    'div',
    {
      id: menuId,
      class: 'global-nav-panel',
      hidden: '',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Models / モデル',
    },
    [
      el('div', { class: 'global-nav-panel-head' }, [
        el('div', { class: 'global-nav-panel-title' }, [bilingual('Models', 'モデル')]),
        favoriteButton,
        closeButton,
      ]),
      favoriteSection,
      list,
      footer,
    ]
  );

  const brand = el(
    'a',
    {
      class: 'global-nav-brand',
      href: LANDING_ROUTE,
      // The brand itself is a proper noun and stays as it is in both; what
      // follows it is a word, and a word belongs in the language on screen.
      title: inLanguage('Medical 3D Lab — Home', 'Medical 3D Lab — トップ'),
      'aria-label': inLanguage('Medical 3D Lab — Home', 'Medical 3D Lab — トップ'),
    },
    [
      el('span', { class: 'global-nav-brand-mark', 'aria-hidden': 'true', text: '3D' }),
      el('span', { class: 'global-nav-brand-name' }, [
        el('span', { class: 'global-nav-brand-full', text: 'Medical 3D Lab' }),
        el('span', { class: 'global-nav-brand-compact', text: 'Medical 3D' }),
      ]),
    ]
  );

  const organEn = currentOrgan?.label ?? currentGroup.label;
  const organJa = currentOrgan?.labelJa ?? currentGroup.labelJa;
  const currentLocation = el('div', { class: 'global-nav-current', 'aria-label': 'Current model / 現在のモデル' }, [
    bilingual(
      currentShort.en && currentShort.en !== organEn ? `${organEn} · ${currentShort.en}` : organEn,
      currentShort.ja && currentShort.ja !== organJa ? `${organJa} · ${currentShort.ja}` : organJa,
      'global-nav-current-label'
    ),
  ]);

  const element = el(
    'nav',
    {
      class: `global-scene-nav${isLab ? ' is-lab' : ' is-public'}${hasChoices ? '' : ' is-single'}`,
      // Names the landmark, rather than repeating the brand: a screen reader
      // reading a list of landmarks needs to hear what this one is.
      'aria-label': inLanguage('Site navigation', 'サイトナビゲーション'),
    },
    [brand, currentLocation, trigger, backdrop, panel]
  );

  if (!hasChoices) {
    trigger.hidden = true;
  }

  function renderLibrary(library = readSceneLibrary()) {
    const saved = library.favorites
      .map((id) => scenes.find((scene) => scene.id === id))
      .filter(Boolean);
    const currentSaved = library.favorites.includes(currentScene.id);

    favoriteButton.textContent = currentSaved ? '★' : '☆';
    favoriteButton.setAttribute('aria-pressed', String(currentSaved));
    favoriteButton.setAttribute(
      'aria-label',
      currentSaved
        ? 'Remove current model from favorites / お気に入りから外す'
        : 'Add current model to favorites / お気に入りに追加'
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

  function setBackgroundInert(enabled) {
    const parent = element.parentElement;
    if (!parent) return;
    if (enabled) {
      for (const sibling of parent.children) {
        if (sibling === element || !sibling || typeof sibling !== 'object') continue;
        if (!inertBefore.has(sibling)) inertBefore.set(sibling, Boolean(sibling.inert));
        sibling.inert = true;
      }
      return;
    }
    for (const [node, was] of inertBefore) node.inert = was;
    inertBefore.clear();
  }

  function focusableInPanel() {
    return [...(panel.querySelectorAll?.(FOCUSABLE) ?? [])].filter(
      (node) => !node.hidden && !node.disabled && node.offsetParent !== null
    );
  }

  function trapPanelTab(event) {
    if (event.key !== 'Tab' || !open) return;
    const stops = focusableInPanel();
    if (!stops.length) return;
    const first = stops[0];
    const last = stops[stops.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !panel.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  function setOpen(next, { restoreFocus = false } = {}) {
    if (!hasChoices && next) return;
    if (open === next) return;
    open = next;
    element.classList.toggle('is-open', open);
    panel.hidden = !open;
    backdrop.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    setBackgroundInert(open);
    if (open) closeButton.focus?.();
    else if (restoreFocus && trigger.isConnected) trigger.focus?.();
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
  panel.addEventListener('keydown', trapPanelTab);

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
    if (open && !element.contains(event.target)) setOpen(false, { restoreFocus: true });
  });

  renderLibrary();

  return { element, close: () => setOpen(false) };
}
