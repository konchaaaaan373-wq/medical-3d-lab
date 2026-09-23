import { el } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import { EXPLORER_ROUTE, LAB_ROUTE, LANDING_ROUTE, organById } from '../catalog/index.js';
import { PUBLIC_MANIFEST } from '../catalog/publicManifest.js';
import { activeUsesForSceneEntry } from '../access/sceneUses.js';
import { readSceneLibrary, toggleSceneFavorite } from '../app/sceneLibrary.js';
import { resolveRoute } from '../app/router.js';
import {
  compactSceneLabel,
  navigationKindGroups,
  navigationUseLabel,
  scenesByOrganForNavigation,
} from '../app/sceneNavigationModel.js';

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

  /**
   * How many reachable models can be listed flat before the list stops being a
   * shortcut and becomes a second catalogue.
   *
   * The system accordion below opens one body system at a time, which is the
   * right shape for a fourteen-system catalogue and the wrong one for the beta:
   * with the brain and the heart open, standing on either model put the other
   * inside a closed `<details>` with nothing to say it was there. Measured at
   * 390px, reaching the other published model took three taps, and the middle
   * one — open the other body system — was invisible (F-111).
   *
   * So while the drawer reaches few enough models to show at once, it shows
   * them at the top. Past this count the accordion is the better shape and this
   * section takes itself away rather than growing into a duplicate of the list
   * below it. A preview build, which reaches every declared scene, is over the
   * line by an order of magnitude and never sees it.
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

  // Every model the drawer can reach, flat, above the accordion. `scenes` is
  // already projected by `sceneRegistry`, so this widens nothing: in a
  // production build it is exactly the published set.
  const flatModels = scenes.length > 1 && scenes.length <= FLAT_MODEL_LIST_MAX ? scenes : [];
  const modelSection = el(
    'section',
    { class: 'global-nav-models', ...(flatModels.length ? {} : { hidden: '' }) },
    [
      el('h2', { class: 'global-nav-models-title' }, [bilingual('Models', 'モデル')]),
      el('div', { class: 'global-nav-model-list' }, flatModels.map((scene) => sceneLink(scene))),
    ]
  );

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
      ...(isCurrent ? { open: '' } : {}),
    }, [
      el('summary', { class: 'global-nav-system-summary' }, [
        el('span', {
          class: 'global-nav-system-heading',
          role: 'heading',
          'aria-level': '2',
        }, [bilingual(group.label, group.labelJa)]),
        el('span', { class: 'global-nav-system-chevron', 'aria-hidden': 'true', text: '⌄' }),
      ]),
      el('div', { class: 'global-nav-system-organs' }, organs.map(organSection)),
    ]);
    systemDetails.push(details);
    return details;
  };

  // Inside the scrollable region, not beside it. `.global-nav-panel` is a
  // column flex box with `overflow: hidden` and `.global-nav-list` is its only
  // scrolling child, so a sibling section is simply clipped once it outgrows
  // the drawer: measured at 390px with the list at its own limit, seven of the
  // sixteen rows fell past the panel's bottom edge with no way to reach them.
  // First in the list keeps it at the top of the drawer, which is what F-111
  // asks for, and it scrolls with everything else.
  const list = el('div', { class: 'global-nav-list' }, [modelSection, ...groups.map(systemSection)]);

  // Shelf navigation is useful, but it must not outrank choosing a model. Keep
  // it as compact footer navigation. The public beta never exposes Lab here.
  //
  // The first link is not just "go to the index" — it names the tab this
  // scene already lives under. `isLab` (a scene's own status, not a guess at
  // the URL) is the same split the labels above use to say "Lab index" or
  // "Model index" in the first place, so a scene route already declares
  // itself part of one of the two: `aria-current="page"` on this link is
  // that declaration read back to assistive tech, not a new claim about it.
  // The secondary link goes to the *other* tab, so it is never current.
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
   * `resolveRoute` — not a string check on the hash — is what confirms this
   * document is still a scene page before the footer link claims to be the
   * current tab; `#/organs` and its `#/explore` alias resolve to the same
   * `'explorer'` kind, so a check written against `kind` never has to know
   * about the alias by name. Re-run on `hashchange` rather than once at
   * mount: this component outlives a hash change that does not reload the
   * document (`#/brain-anatomy?structure=1` to `?structure=2` is the same
   * route on purpose — see `sameRoute` in `router.js`), so a stale
   * `aria-current` left over from mount would otherwise survive it.
   *
   * This marks the *tab* the page belongs under, at a different granularity
   * from the scene row inside the model list, which marks the page itself
   * (`sceneLink` above). The two live in different landmarks — the footer is
   * its own `<nav aria-label="Model lists">` — so a reader asking "what is
   * current here" gets one answer per region, not two in one.
   */
  function updateFooterCurrent() {
    const onScenePage = resolveRoute(currentHash()).kind === 'scene';
    if (onScenePage) primaryFooterLink.setAttribute('aria-current', 'page');
    else primaryFooterLink.removeAttribute('aria-current');
  }
  updateFooterCurrent();
  // Guarded on the method, not only on `window` existing: `beta-release.test.js`
  // walks every surface's rendered links against a `window` stubbed down to
  // just `matchMedia`, and a component that assumes the rest of the browser
  // API comes with it is a component that cannot be checked that way.
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('hashchange', updateFooterCurrent);
  }

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
            'Choose a body system, then an organ and model.',
            '身体の系統を選び、臓器・モデルへ進みます。'
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

  // The brand is the way home, so it has to look like one. A wordmark in the
  // top-left corner reads as the page's title; an arrow and the word "Home /
  // ホーム" are what make it an offer. The accessible name leads with where it
  // goes rather than with what the product is called, for the same reason.
  const brand = el(
    'a',
    {
      class: 'global-nav-brand',
      href: LANDING_ROUTE,
      // The brand itself is a proper noun and stays as it is in both; what
      // follows it is a word, and a word belongs in the language on screen.
      // The destination leads: what a screen reader announces first should be
      // where the link goes, not what the product is called.
      title: inLanguage('Home — Medical 3D Lab', 'トップへ戻る — Medical 3D Lab'),
      'aria-label': inLanguage('Home — Medical 3D Lab', 'トップへ戻る — Medical 3D Lab'),
    },
    [
      el('span', { class: 'global-nav-brand-back', 'aria-hidden': 'true', text: '←' }),
      el('span', { class: 'global-nav-brand-mark', 'aria-hidden': 'true', text: '3D' }),
      el('span', { class: 'global-nav-brand-name' }, [
        el('span', { class: 'global-nav-brand-full', text: 'Medical 3D Lab' }),
        el('span', { class: 'global-nav-brand-compact', text: 'Medical 3D' }),
      ]),
      bilingual('Home', 'ホーム', 'global-nav-brand-home'),
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
  /**
   * The published models, as one press each, inside the viewer.
   *
   * ## Why this replaces the breadcrumb
   *
   * What stood here was `神経 › 脳 › 解剖`: correct, and an answer to a question
   * nobody was asking. The question a reader actually has on a 3D model is
   * *"how do I see the heart?"*, and the only answer was a `モデル ⌄` button in
   * the far corner that opens a sheet — a control a first-time visitor has no
   * reason to press, because nothing about it says it holds the other models.
   *
   * A row of organ names, with the one you are looking at marked, answers both
   * questions at once: where am I, and how do I go somewhere else. It is the
   * same set and the same wording as the chips on the landing page, so the
   * gesture a reader learned before they opened anything still works.
   *
   * Switching models is the product's main loop. It should not require leaving
   * the model, and it should not require finding a menu.
   *
   * The set comes from `PUBLIC_MANIFEST`, so it can only ever offer what the
   * release has opened — the strip cannot become a row of links to pages that
   * say "in development". When the current scene is not one of them (a
   * prototype under the preview unlock), there is nothing to mark and the
   * breadcrumb stands in.
   */
  const publishedModels = PUBLIC_MANIFEST?.models ?? [];
  const onPublishedModel = publishedModels.some((model) => model.sceneId === currentScene.id);

  /**
   * What to call each model on the strip.
   *
   * The organ's name, because that is the word a reader came with — "the
   * heart", not "Heart anatomy (adult, structural)". It is only safe while one
   * model per organ is open, so the ambiguity is measured rather than assumed:
   * the moment two open models share an organ, both fall back to their own
   * titles and the strip stops offering two chips that read the same.
   */
  const organChipCount = new Map();
  for (const model of publishedModels) {
    organChipCount.set(model.organId, (organChipCount.get(model.organId) ?? 0) + 1);
  }
  const chipLabel = (model) =>
    organChipCount.get(model.organId) === 1
      ? { en: model.organLabel, ja: model.organLabelJa }
      : { en: model.titleEn, ja: model.titleJa };

  const organStrip = onPublishedModel && publishedModels.length > 1
    ? el(
        'div',
        {
          class: 'global-nav-strip',
          role: 'group',
          'aria-label': inLanguage('Published models', '公開中のモデル'),
        },
        publishedModels.map((model) => {
          const here = model.sceneId === currentScene.id;
          const label = chipLabel(model);
          return el(
            'a',
            {
              class: `global-nav-strip-link${here ? ' is-current' : ''}`,
              href: model.route,
              ...(here ? { 'aria-current': 'page' } : {}),
            },
            [
              el('span', { class: 'lang-en', text: label.en }),
              el('span', { class: 'lang-ja', text: label.ja }),
            ]
          );
        })
      )
    : null;

  const currentLocation = organStrip
    ?? el('div', { class: 'global-nav-current', 'aria-label': 'Current model / 現在のモデル' }, [
      breadcrumb([currentGroup.label, organEn, sceneEn], 'en'),
      breadcrumb([currentGroup.labelJa, organJa, sceneJa], 'ja'),
    ]);

  /**
   * When the strip is the whole catalogue, the drawer beside it is a second
   * door onto the same room.
   *
   * With the beta's published set on screen as chips, `モデル ⌄` opened a sheet
   * listing the same models under the same names — and it sat immediately to
   * the right of them, so the header offered "models" twice with two different
   * gestures and no way to tell what the second one added. It added nothing.
   *
   * The condition is measured, not assumed: the drawer stands down only when
   * every scene it could list is already a chip, and only while the strip is
   * short enough to read at a glance. Under the preview unlock `scenes` is the
   * whole seventy-model catalogue and this is false on its first term, so the
   * drawer — its accordion, its favourites, its index links — is untouched
   * there. `tests/scene-switcher.test.js` fixes both directions, because the
   * failure mode this class of change already caused once (`is-single`, F-111)
   * was a 3D scene left with no navigation control on it at all.
   */
  const STRIP_STANDS_ALONE_MAX = 6;
  const stripIsTheCatalogue =
    Boolean(organStrip) &&
    publishedModels.length === scenes.length &&
    publishedModels.length <= STRIP_STANDS_ALONE_MAX;

  const element = el(
    'nav',
    {
      // `is-single` narrows the header when there is nothing to choose between.
      // It used to hide the drawer's trigger as well, which in the public beta
      // — one open model — left a 3D scene with no navigation control on it at
      // all, and the shelf links inside the drawer unreachable. The class is a
      // layout hint; it is not a reason to take the way out away.
      class:
        `global-scene-nav${isLab ? ' is-lab' : ' is-public'}${hasChoices ? '' : ' is-single'}` +
        (stripIsTheCatalogue ? ' has-model-strip' : ''),
      // Names the landmark, rather than repeating the brand: a screen reader
      // reading a list of landmarks needs to hear what this one is.
      'aria-label': inLanguage('Site navigation', 'サイトナビゲーション'),
    },
    stripIsTheCatalogue
      ? [brand, currentLocation]
      : [brand, currentLocation, trigger, backdrop, panel]
  );

  // One body system is open at a time on every viewport. This keeps a fourteen-
  // system catalogue scannable on desktop and prevents scroll fatigue on a
  // phone. The current system starts open so opening Models never loses place.
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
    if (open === next) return;
    open = next;
    element.classList.toggle('is-open', open);
    panel.hidden = !open;
    backdrop.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    setBackgroundInert(open);
    if (open) {
      const currentSystem = systemDetails.find((details) => details.classList.contains('is-current'));
      if (currentSystem && !systemDetails.some((details) => details.open)) currentSystem.open = true;
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

  /**
   * Open the strip showing where you are.
   *
   * The row can be wider than the header, and the current model is not always
   * first in it — standing on the liver with the row starting at the brain
   * means the one chip that answers "which model is this" is off-screen at the
   * moment the reader most needs it.
   *
   * `scrollLeft` rather than `scrollIntoView`: the latter is free to scroll
   * every scrollable ancestor, and the nearest one here is the page.
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

  return { element, close: () => setOpen(false) };
}
