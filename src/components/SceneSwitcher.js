import { el } from '../utils/dom.js';
import { EXPLORER_ROUTE, LAB_ROUTE, LANDING_ROUTE, organById } from '../catalog/index.js';
import { activeUsesForSceneEntry } from '../access/sceneUses.js';
import { readSceneLibrary, toggleSceneFavorite } from '../app/sceneLibrary.js';
import {
  compactSceneLabel,
  navigationKindGroups,
  navigationUseLabel,
  scenesByOrganForNavigation,
} from '../app/sceneNavigationModel.js';

/**
 * Fixed product-shell navigation for a 3D scene.
 *
 * `groups` is already projected by `sceneRegistry`, so this component never
 * widens the release boundary. The visible hierarchy mirrors the catalogue:
 * body system → organ → anatomy/physiology or disease/pathophysiology → model.
 * Patient explanation is shown only when the same versioned review gate used by
 * the product permits it.
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
    'summary,a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
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
    const use = navigationUseLabel(scene, activeUsesForSceneEntry(scene));
    return el(
      'a',
      {
        class: `global-nav-scene${isCurrent ? ' is-current' : ''}`,
        href: `#/${scene.slug ?? scene.id}`,
        'aria-current': isCurrent ? 'page' : null,
      },
      [
        el('span', { class: 'global-nav-scene-copy' }, [
          bilingual(scene.label, scene.labelJa, 'global-nav-scene-name'),
          bilingual(use.en, use.ja, 'global-nav-scene-meta'),
        ]),
        isCurrent
          ? el('span', { class: 'global-nav-current-check', 'aria-hidden': 'true', text: '✓' })
          : null,
      ]
    );
  };

  const kindGroup = (kind) =>
    el('div', { class: `global-nav-kind-group is-${kind.id}` }, [
      el('h4', { class: 'global-nav-kind-heading' }, [bilingual(kind.label, kind.labelJa)]),
      ...kind.scenes.map((scene) => sceneLink(scene)),
    ]);

  const organSection = (organ) =>
    el(
      'section',
      { class: `global-nav-organ${organ.id === currentScene.organ ? ' is-current' : ''}` },
      [
        el('h3', { class: 'global-nav-organ-name' }, [bilingual(organ.label, organ.labelJa)]),
        el('div', { class: 'global-nav-scenes' }, navigationKindGroups(organ).map(kindGroup)),
      ]
    );

  const systemDetails = [];
  const systemSection = (group) => {
    const organs = scenesByOrganForNavigation(group.scenes, organById);
    const isCurrent = group.id === currentGroup.id;
    const details = el('details', {
      class: `global-nav-system-section${isCurrent ? ' is-current' : ''}`,
      open: '',
    }, [
      el('summary', { class: 'global-nav-system-summary' }, [
        el('span', { class: 'global-nav-system-heading' }, [bilingual(group.label, group.labelJa)]),
        el('span', { class: 'global-nav-system-chevron', 'aria-hidden': 'true', text: '⌄' }),
      ]),
      el('div', { class: 'global-nav-system-organs' }, organs.map(organSection)),
    ]);
    systemDetails.push(details);
    return details;
  };

  const list = el('div', { class: 'global-nav-list' }, groups.map(systemSection));

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
      'aria-label': 'Organs and models / 臓器・モデル',
    },
    [
      el('div', { class: 'global-nav-panel-head' }, [
        el('div', { class: 'global-nav-panel-heading' }, [
          el('div', { class: 'global-nav-panel-title' }, [bilingual('Organs & models', '臓器・モデル')]),
          el('p', { class: 'global-nav-panel-intro' }, [bilingual(
            'Browse by body system and organ.',
            '身体の系統・臓器からモデルを探せます。'
          )]),
        ]),
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
      title: 'Medical 3D Lab — Home',
      'aria-label': 'Medical 3D Lab — Home / トップ',
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
  const sceneEn = currentShort.en && currentShort.en !== organEn ? currentShort.en : '';
  const sceneJa = currentShort.ja && currentShort.ja !== organJa ? currentShort.ja : '';
  const breadcrumb = (parts, lang) => {
    const visible = parts.filter(Boolean);
    const children = [];
    visible.forEach((part, index) => {
      if (index) children.push(el('span', { class: 'global-nav-current-separator', 'aria-hidden': 'true', text: '›' }));
      children.push(el('span', { class: 'global-nav-current-part', text: part }));
    });
    return el('span', { class: `global-nav-current-label lang-${lang}` }, children);
  };
  const currentLocation = el('div', { class: 'global-nav-current', 'aria-label': 'Current model / 現在のモデル' }, [
    breadcrumb([currentGroup.label, organEn, sceneEn], 'en'),
    breadcrumb([currentGroup.labelJa, organJa, sceneJa], 'ja'),
  ]);

  const element = el(
    'nav',
    {
      class: `global-scene-nav${isLab ? ' is-lab' : ' is-public'}${hasChoices ? '' : ' is-single'}`,
      'aria-label': 'Medical 3D Lab',
    },
    [brand, currentLocation, trigger, backdrop, panel]
  );

  if (!hasChoices) {
    trigger.hidden = true;
  }

  const mobileSystems = globalThis.matchMedia?.('(max-width: 720px)') ?? null;
  const applySystemViewport = () => {
    if (!mobileSystems?.matches) {
      systemDetails.forEach((details) => { details.open = true; });
      return;
    }
    systemDetails.forEach((details) => {
      details.open = details.classList.contains('is-current');
    });
  };
  applySystemViewport();
  mobileSystems?.addEventListener?.('change', applySystemViewport);
  for (const details of systemDetails) {
    details.addEventListener('toggle', () => {
      if (!mobileSystems?.matches || !details.open) return;
      for (const other of systemDetails) {
        if (other !== details) other.open = false;
      }
    });
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
    if (open) {
      const currentSystem = systemDetails.find((details) => details.classList.contains('is-current'));
      if (currentSystem) currentSystem.open = true;
      closeButton.focus?.();
      requestAnimationFrame(() => {
        panel.querySelector('.global-nav-scene.is-current')?.scrollIntoView?.({ block: 'nearest' });
      });
    } else if (restoreFocus && trigger.isConnected) {
      trigger.focus?.();
    }
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
