import { el } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import { EXPLORER_ROUTE, LAB_ROUTE, LANDING_ROUTE, organById } from '../catalog/index.js';
import { MODEL_INFO_ROUTE, PUBLIC_MANIFEST } from '../catalog/publicManifest.js';
import { activeUsesForSceneEntry } from '../access/sceneUses.js';
import { readSceneLibrary, toggleSceneFavorite } from '../app/sceneLibrary.js';
import { resolveRoute } from '../app/router.js';
import { registerHeaderDock } from '../app/headerDock.js';
import { organLayerNavigation } from '../app/modelNavigation.js';
import {
  compactSceneLabel,
  navigationKindGroups,
  navigationUseLabel,
  scenesByOrganForNavigation,
} from '../app/sceneNavigationModel.js';
import { createSiteHeaderMenu } from './SiteMenu.js';
import { brandMark } from './ShellHeader.js';

/**
 * The hash this document is actually showing.
 *
 * Guarded the way `FeedbackPanel` guards the same read: `node --test` has no
 * `window`, and a component that throws in that environment cannot be unit
 * tested at all. In a browser this is always `window.location.hash`; the
 * fallback only exists for the test runner, and `resolveRoute('')` reads as
 * the landing page — never `'scene'` — so it fails the current-scene checks
 * below safely rather than by accident.
 */
const currentHash = () => (typeof window === 'undefined' ? '' : (window.location?.hash ?? ''));

/**
 * The header on a 3D model.
 *
 * ## Its structure, left to right
 *
 * | zone | what | why there |
 * | --- | --- | --- |
 * | who | `← M/3 Medical 3D Lab ホーム` | the way home; the same mark as every other screen |
 * | where | organs, then the layers of the current organ | switching models is the product's main loop |
 * | you | language, account | in the row when it is wide, in the menu when it is not |
 * | menu | ☰ | everything else the site has, in layers |
 *
 * The same zones, in the same order, as `ShellHeader` on the reading surfaces.
 * Only the middle changes between them, because only the middle is about the
 * screen you are on.
 *
 * ## Organ, then layer
 *
 * The row used to carry one chip per published model, named by its organ —
 * until the heart had two, when both fell back to their titles and the row
 * read `脳 / 触れて学ぶ心臓の解剖 / 心拍出量 / 肺 / 肝臓`: organs and models on
 * one level, and on a phone the lungs and liver off the end of it. Now the row
 * is organs, always one short word each, and the organ you are on opens a
 * second level beside it (below it, on a phone) naming its layers:
 * `解剖 · 機序 心拍出量`. `organLayerNavigation` owns that shape.
 *
 * `groups` is already projected by `sceneRegistry`, so this component never
 * widens the release boundary; the rows come from `PUBLIC_MANIFEST`, which can
 * only hold what the release opened.
 */
export function createSceneSwitcher({ groups, currentId, showLab = true, models = PUBLIC_MANIFEST?.models ?? [] }) {
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

  // --------------------------------------------------------------- where

  const navigation = organLayerNavigation(models, currentScene.id);
  const onPublishedModel = Boolean(navigation.currentModel);

  /**
   * The organs, as one press each.
   *
   * The organ chip is the organ, not a model: it goes to the organ's first
   * layer, which is its anatomy. So it says `aria-current="page"` only when
   * the organ has one model and this is it; when the organ has several, the
   * layer row names the page and the organ says `true` — "you are inside this
   * one" — which is what that value is for.
   */
  const organStrip = onPublishedModel && navigation.organs.length > 1
    ? el(
        'div',
        {
          class: 'global-nav-strip',
          role: 'group',
          'aria-label': inLanguage('Organs', '臓器'),
        },
        navigation.organs.map((organ) => {
          const here = organ.current;
          const single = organ.models.length === 1;
          return el(
            'a',
            {
              class: `global-nav-strip-link${here ? ' is-current' : ''}`,
              href: organ.route,
              'data-organ': organ.organId,
              ...(here ? { 'aria-current': single ? 'page' : 'true' } : {}),
            },
            [
              el('span', { class: 'lang-en', text: organ.name.en }),
              el('span', { class: 'lang-ja', text: organ.name.ja }),
            ]
          );
        })
      )
    : null;

  /**
   * The layers of the organ on screen — only when there is a choice.
   *
   * One model, one layer, nothing to switch between: a lone chip reading 解剖
   * would be a control with no job, and the title card already says what the
   * model is. Two or more, and this is where the reader chooses between the
   * anatomy and what sits on it.
   */
  const layerModels = navigation.currentOrgan?.models ?? [];
  const layerRow = onPublishedModel && layerModels.length > 1
    ? el(
        'div',
        {
          class: 'global-nav-layers',
          role: 'group',
          'aria-label': inLanguage(
            `${navigation.currentOrgan.name.en} models`,
            `${navigation.currentOrgan.name.ja}のモデル`
          ),
        },
        layerModels.map((model) =>
          el(
            'a',
            {
              class: `global-nav-layer-link is-${model.layer}${model.current ? ' is-current' : ''}`,
              href: model.route,
              ...(model.current ? { 'aria-current': 'page' } : {}),
            },
            [
              model.showKind ? bilingual(model.kind.en, model.kind.ja, 'global-nav-layer-kind') : null,
              bilingual(model.name.en, model.name.ja, 'global-nav-layer-name'),
            ]
          )
        )
      )
    : null;

  // Where the strip cannot mark anything — a prototype under the preview unlock
  // — a breadcrumb says where the reader is instead.
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
  const currentLocation = organStrip
    ?? el('div', { class: 'global-nav-current', 'aria-label': 'Current model / 現在のモデル' }, [
      breadcrumb([currentGroup.label, organEn, sceneEn], 'en'),
      breadcrumb([currentGroup.labelJa, organJa, sceneJa], 'ja'),
    ]);

  /**
   * Whether the row already reaches every model this document can open.
   *
   * In the beta it does, and then a model list in the menu is the "second door
   * onto the same room" the old `モデル ⌄` drawer was — beside a row of the
   * same organs under the same names. Under the preview unlock `scenes` is the
   * whole catalogue and this is false, so the menu carries it.
   */
  const reachableByRow = new Set(
    organStrip || layerRow
      ? navigation.organs.flatMap((organ) => organ.models.map((model) => model.sceneId))
      : []
  );
  const rowIsTheCatalogue = reachableByRow.size > 0 && scenes.every((scene) => reachableByRow.has(scene.id));

  // --------------------------------------------------------- the catalogue

  const favoriteButton = el('button', {
    class: 'global-nav-favorite',
    type: 'button',
    'aria-pressed': 'false',
    // Toggling a favourite changes the list in this menu; closing on it would
    // hide the change it just made.
    'data-menu-keep-open': '',
  });

  const favoriteList = el('div', { class: 'global-nav-favorite-list' });
  const favoriteSection = el('section', { class: 'global-nav-favorites', hidden: '' }, [
    el('h3', { class: 'global-nav-favorites-title' }, [bilingual('Favorites', 'お気に入り')]),
    favoriteList,
  ]);

  /**
   * How many reachable models can be listed flat before the list stops being a
   * shortcut and becomes a second catalogue (F-111). Past it the accordion is
   * the better shape and this section takes itself away. A preview build is
   * over the line by an order of magnitude and never sees it.
   */
  const FLAT_MODEL_LIST_MAX = 16;

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

  // Every model the menu can reach, flat, above the accordion. `scenes` is
  // already projected by `sceneRegistry`, so this widens nothing.
  const flatModels = scenes.length > 1 && scenes.length <= FLAT_MODEL_LIST_MAX ? scenes : [];
  const modelSection = el(
    'section',
    { class: 'global-nav-models', ...(flatModels.length ? {} : { hidden: '' }) },
    [
      el('h3', { class: 'global-nav-models-title' }, [bilingual('All models', 'すべてのモデル')]),
      el('div', { class: 'global-nav-model-list' }, flatModels.map((scene) => sceneLink(scene))),
    ]
  );

  const kindGroup = (kind) =>
    el('div', { class: `global-nav-kind-group is-${kind.id}` }, [
      el('h5', { class: 'global-nav-kind-heading' }, [bilingual(kind.label, kind.labelJa)]),
      ...kind.scenes.map((scene) => sceneLink(scene)),
    ]);

  const organSection = (organ) =>
    el(
      'section',
      { class: `global-nav-organ${organ.id === currentScene.organ ? ' is-current' : ''}` },
      [
        el('h4', { class: 'global-nav-organ-name' }, [bilingual(organ.label, organ.labelJa)]),
        el('div', { class: 'global-nav-scenes' }, navigationKindGroups(organ).map(kindGroup)),
      ]
    );

  // The menu's own section heading is an h2, so the accordion's systems are the
  // level below it, then organs, then kinds.
  const systemDetails = [];
  const systemSection = (group) => {
    const organs = scenesByOrganForNavigation(group.scenes, organById);
    const isCurrent = group.id === currentGroup.id;
    const details = el('details', {
      class: `global-nav-system-section${isCurrent ? ' is-current' : ''}`,
      ...(isCurrent ? { open: '' } : {}),
    }, [
      el('summary', { class: 'global-nav-system-summary' }, [
        el('span', {
          class: 'global-nav-system-heading',
          role: 'heading',
          'aria-level': '3',
        }, [bilingual(group.label, group.labelJa)]),
        el('span', { class: 'global-nav-system-chevron', 'aria-hidden': 'true', text: '⌄' }),
      ]),
      el('div', { class: 'global-nav-system-organs' }, organs.map(organSection)),
    ]);
    systemDetails.push(details);
    return details;
  };

  const list = el('div', { class: 'global-nav-list' }, [modelSection, ...groups.map(systemSection)]);

  // The index this scene lives under, and the other one. Reached only with the
  // preview unlock: in the beta `#/organs` is the landing page and the lab is
  // closed, so neither is a destination and the catalogue is not rendered.
  //
  // The first link names the tab this scene already lives under: `isLab` (the
  // scene's own status, not a guess at the URL) is the split that decides
  // "Lab index" or "Model index", so `aria-current="page"` on it is that
  // declaration read back to assistive tech.
  const primaryFooterHref = isLab ? LAB_ROUTE : EXPLORER_ROUTE;
  const primaryFooterLink = el(
    'a',
    { class: 'global-nav-footer-link', href: primaryFooterHref },
    [bilingual(isLab ? 'Lab index' : 'Model index', isLab ? '実験モデル一覧' : 'モデル一覧')]
  );
  const footerLinks = [primaryFooterLink];
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

  /**
   * Keep the footer's tab claim honest.
   *
   * `resolveRoute` — not a string check on the hash — confirms this document is
   * still a scene page before the footer link claims to be the current tab;
   * `#/organs` and its `#/explore` alias resolve to the same kind. Re-run on
   * `hashchange` rather than once at mount: this component outlives a hash
   * change that does not reload the document (`?structure=1` to
   * `?structure=2` is the same route on purpose — see `sameRoute`), so a stale
   * `aria-current` would otherwise survive it.
   */
  function updateFooterCurrent() {
    const onScenePage = resolveRoute(currentHash()).kind === 'scene';
    if (onScenePage) primaryFooterLink.setAttribute('aria-current', 'page');
    else primaryFooterLink.removeAttribute('aria-current');
  }
  updateFooterCurrent();
  // Guarded on the method, not only on `window` existing: `beta-release.test.js`
  // walks every surface's rendered links against a `window` stubbed down to
  // just `matchMedia`.
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('hashchange', updateFooterCurrent);
  }

  const catalogue = rowIsTheCatalogue
    ? null
    : [
        el('div', { class: 'global-nav-catalogue-head' }, [
          el('p', { class: 'global-nav-panel-intro' }, [bilingual(
            'Choose a body system, then an organ and model.',
            '身体の系統を選び、臓器・モデルへ進みます。'
          )]),
          favoriteButton,
        ]),
        favoriteSection,
        list,
        footer,
      ];

  // --------------------------------------------------------------- the menu

  // The pages a scene's row does not carry. The publication record is always
  // open; its gated neighbours ride with the catalogue's footer above, which is
  // only rendered where the preview unlock makes them destinations.
  const header = createSiteHeaderMenu({
    id: 'scene-navigation-panel',
    models: catalogue,
    pages: [{ href: MODEL_INFO_ROUTE, en: 'Publication & review', ja: '公開とレビュー' }],
  });
  const { menu } = header;

  // ---------------------------------------------------------------- who

  // The brand is the way home, so it has to look like one: the arrow and the
  // word are what make a wordmark an offer. The mark is the product's one mark
  // — the same `M/3` every reading surface wears — so arriving on a model does
  // not look like arriving in a different product.
  const brand = el(
    'a',
    {
      class: 'global-nav-brand',
      href: LANDING_ROUTE,
      // The destination leads: what a screen reader announces first should be
      // where the link goes, not what the product is called.
      title: inLanguage('Home — Medical 3D Lab', 'トップへ戻る — Medical 3D Lab'),
      'aria-label': inLanguage('Home — Medical 3D Lab', 'トップへ戻る — Medical 3D Lab'),
    },
    [
      el('span', { class: 'global-nav-brand-back', 'aria-hidden': 'true', text: '←' }),
      brandMark('global-nav-brand-mark'),
      el('span', { class: 'global-nav-brand-name' }, [
        el('span', { class: 'global-nav-brand-full', text: 'Medical 3D Lab' }),
        el('span', { class: 'global-nav-brand-compact', text: 'Medical 3D' }),
      ]),
      bilingual('Home', 'ホーム', 'global-nav-brand-home'),
    ]
  );

  const element = el(
    'nav',
    {
      class:
        `global-scene-nav has-site-menu${isLab ? ' is-lab' : ' is-public'}${hasChoices ? '' : ' is-single'}` +
        (organStrip ? ' has-model-strip' : '') +
        (layerRow ? ' has-layer-row' : ''),
      // Names the landmark, rather than repeating the brand.
      'aria-label': inLanguage('Site navigation', 'サイトナビゲーション'),
    },
    [brand, currentLocation, layerRow, header.utilities, menu.trigger, menu.backdrop, menu.panel]
  );
  // A header with a second row is taller on a phone, and the panels below it
  // start where it ends — `#ui` reads the class to reserve the room.
  ui?.classList.toggle('has-layer-row', Boolean(layerRow));

  registerHeaderDock(element, { dock: header.dock });

  // One body system is open at a time on every viewport. This keeps a fourteen-
  // system catalogue scannable, and the current system starts open.
  for (const details of systemDetails) {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
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

  favoriteButton.addEventListener('click', () => {
    renderLibrary(toggleSceneFavorite(currentScene.id));
  });

  // Opening the menu opens the body system you are in, and shows your row.
  menu.onToggle((open) => {
    if (!open) return;
    const currentSystem = systemDetails.find((details) => details.classList.contains('is-current'));
    if (currentSystem && !systemDetails.some((details) => details.open)) currentSystem.open = true;
    requestAnimationFrame(() => {
      menu.panel.querySelector('.global-nav-scene.is-current')?.scrollIntoView?.({ block: 'nearest' });
    });
  });

  // Native navigation controls own their keyboard events rather than leaking to
  // the model's global Space/Escape/letter shortcuts.
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.isOpen) {
      event.preventDefault();
      menu.close({ restoreFocus: true });
    }
    event.stopPropagation();
  });

  renderLibrary();

  /**
   * Open the strip showing where you are.
   *
   * The row can be wider than the header on a narrow phone, and the current
   * organ is not always first in it. `scrollLeft` rather than `scrollIntoView`:
   * the latter is free to scroll every scrollable ancestor, and the nearest one
   * here is the page.
   */
  function centreCurrentChip() {
    if (!organStrip) return;
    const here = organStrip.querySelector('.global-nav-strip-link.is-current');
    if (!here || typeof organStrip.scrollLeft !== 'number') return;
    const centred = here.offsetLeft - (organStrip.clientWidth - here.offsetWidth) / 2;
    organStrip.scrollLeft = Math.max(0, centred);
  }
  if (organStrip && typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(centreCurrentChip);
  }

  return {
    element,
    menu,
    /** Put a site control (language, account, feedback) in this header. */
    dock: header.dock,
    close: () => menu.close(),
  };
}
