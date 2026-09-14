import { organById, sceneById, sceneRoute } from '../catalog/index.js';
import { HERO_ROTATION, featuredHeroOrgan } from '../data/landingHero.js';
import { el } from '../utils/dom.js';

const dual = (en, ja, className = '') => [
  el('span', { class: `${className} lang-en`.trim(), text: en }),
  el('span', { class: `${className} lang-ja`.trim(), text: ja }),
];

/**
 * The landing hero: one live organ model with a stable initial selection.
 *
 * The first published model is always the initial model. When the manifest
 * grows, the visitor changes models explicitly; the calendar never changes
 * the page underneath them.
 *
 * The rotation is `HERO_ROTATION`, which is the declared organs filtered by
 * what the release actually opens. A chooser is drawn only when there is more
 * than one thing to choose: a button offering an organ whose model is not
 * finished is an offer the page cannot keep, and one button labelled "choose"
 * is not a choice.
 *
 * Plain DOM. Nothing here imports Three.js or a scene; the viewport is a
 * dynamic import, so the page shell, the catalogue and the copy all render on
 * a browser that cannot start WebGL at all.
 *
 * @param {{loadViewport?: () => Promise<any>,
 *          onRendererFailure?: (error:Error, context:{organ:string, sceneId:string|null}) => void,
 *          now?: () => Date, organs?: typeof HERO_ORGANS,
 *          compact?: boolean, showOpenLink?: boolean,
 *          showIdentity?: boolean}} [options]
 */
export function createLandingOrganHero({
  loadViewport = () => import('./landingOrganViewport.js'),
  onRendererFailure = () => {},
  now = () => new Date(),
  organs = HERO_ROTATION,
  compact = false,
  showOpenLink = true,
  showIdentity = true,
} = {}) {
  const featured = featuredHeroOrgan(now(), organs) ?? organs[0] ?? null;
  if (!featured) {
    throw new Error('landing organ hero: no organ model is open — the caller must not mount it');
  }
  const buttons = new Map();

  let selected = featured;
  let mountedViewport = null;
  let mountPromise = null;
  let destroyed = false;

  const kicker = el('p', { class: 'landing-demo-kicker' });
  const title = el('h2', { class: 'landing-demo-title', id: 'landing-demo-title' });
  const explanation = el('p', { class: 'landing-demo-explanation' });
  const openLink = el('a', {
    class: showOpenLink
      ? 'landing-demo-link landing-cta'
      : 'landing-button primary landing-cta landing-model-action',
    href: '#/',
  });

  /**
   * The name of the part the reader is pointing at.
   *
   * The hero's whole claim is that the structures are *named* — colour-coded
   * parts a reader can point at and be told what they are. Until this was here
   * the hero highlighted the part under the pointer and then said nothing, so
   * the one question the model exists to answer ("what did I just click?") was
   * only answerable by opening the full model.
   *
   * Both languages are in the DOM and CSS hides one, exactly as the anatomy
   * panel does it, so switching language costs no re-render and a screen reader
   * is never handed Japanese inside an English document.
   */
  const structureSwatch = el('span', { class: 'landing-demo-structure-swatch', 'aria-hidden': 'true' });
  const structureNameEn = el('strong', { class: 'landing-demo-structure-name lang-en' });
  const structureNameJa = el('strong', { class: 'landing-demo-structure-name lang-ja' });
  const structureWhereEn = el('span', { class: 'landing-demo-structure-where lang-en' });
  const structureWhereJa = el('span', { class: 'landing-demo-structure-where lang-ja' });
  const structureReadout = el('div', {
    class: 'landing-demo-structure',
    dataset: { state: 'hint' },
    'aria-hidden': 'true',
  }, [
    structureSwatch,
    el('div', { class: 'landing-demo-structure-text' }, [
      structureNameEn,
      structureNameJa,
      structureWhereEn,
      structureWhereJa,
    ]),
  ]);
  structureReadout.hidden = true;

  /**
   * What a *pinned* structure is called, for assistive technology.
   *
   * Separate from the card above because a live region must not be driven by
   * hover: a pointer crossing the model would otherwise queue an announcement
   * per structure it passed over, and the reader would be read a list of
   * everything they did not choose. Only a click reaches here.
   */
  const structureAnnouncement = el('p', {
    class: 'landing-sr-only',
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
  });

  const dragHint = el('div', { class: 'landing-demo-drag-hint', 'aria-hidden': 'true' }, [
    el('span', { text: '↔' }),
    ...dual(
      'Drag to rotate · scroll or +− to zoom',
      'ドラッグで回転・ピンチ／+−で拡大'
    ),
  ]);

  const viewport = el('div', {
    class: 'landing-demo-viewport',
    role: 'region',
    tabindex: '0',
    'aria-label': 'Interactive 3D organ model / 操作できる臓器3Dモデル',
    'aria-describedby': 'landing-demo-viewport-instructions',
  }, [
    el('p', { class: 'landing-sr-only', id: 'landing-demo-viewport-instructions' }, dual(
      'Use arrow keys to rotate, plus and minus to zoom, and Home to reset the view.',
      '矢印キーで回転、+／−で拡大縮小、Homeで初期視点に戻します。'
    )),
  ]);

  const viewportStatusText = el('span', { class: 'landing-demo-loading-text' });
  const viewportRetry = el('button', {
    class: 'landing-demo-retry',
    type: 'button',
    hidden: 'hidden',
    on: {
      click: () => {
        if (!mountedViewport || destroyed) return;
        viewportRetry.setAttribute('disabled', '');
        void mountedViewport.retryDetail?.();
      },
    },
  }, dual('Reload 3D model', '3Dモデルを再読み込み'));
  const viewportStatus = el('div', {
    class: 'landing-demo-loading',
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
  }, [
    el('span', { class: 'landing-demo-loading-dot', 'aria-hidden': 'true' }),
    viewportStatusText,
    viewportRetry,
  ]);

  /** Whether the model on screen has parts a reader can point at and name. */
  let namedStructures = false;
  /**
   * The structure the card is naming.
   *
   * Kept rather than re-read from the DOM, because the card is redrawn from two
   * directions — a pick and a change of load state — and a scene is allowed to
   * open with a structure already pinned. Re-rendering from the remembered
   * value is what lets that pick survive the `ready` that follows it.
   */
  let shownStructure = null;

  const STRUCTURE_HINT = Object.freeze([
    'Click a coloured structure to see its anatomical name.',
    '色分けされた部位をクリックすると、解剖学的な名称が表示されます。',
  ]);

  /**
   * Draw the name card.
   *
   * Three states, and they are deliberately different things: the model has no
   * named parts (no card at all), it has them and none is chosen (the card
   * invites the click), one is chosen (the card names it). Collapsing the first
   * two would promise a name the model cannot give.
   *
   * @param {{name?:string, nameJa?:string, breadcrumb?:string, breadcrumbJa?:string,
   *          side?:string, sideJa?:string, region?:string, regionJa?:string,
   *          categoryName?:string, categoryNameJa?:string,
   *          color?:string, pinned?:boolean}|null} structure
   */
  function showStructure(structure) {
    shownStructure = structure ?? null;
    renderStructure();
  }

  function renderStructure() {
    const structure = shownStructure;
    const ready = element.dataset.viewport === 'ready';
    structureReadout.hidden = !ready || !namedStructures;
    if (structureReadout.hidden) {
      structureReadout.dataset.state = 'hint';
      structureAnnouncement.replaceChildren();
      return;
    }

    if (!structure) {
      structureReadout.dataset.state = 'hint';
      structureNameEn.textContent = STRUCTURE_HINT[0];
      structureNameJa.textContent = STRUCTURE_HINT[1];
      structureWhereEn.textContent = '';
      structureWhereJa.textContent = '';
      structureSwatch.style.removeProperty('--landing-structure-color');
      structureAnnouncement.replaceChildren();
      return;
    }

    structureReadout.dataset.state = structure.pinned ? 'pinned' : 'preview';
    structureNameEn.textContent = structure.name ?? '';
    structureNameJa.textContent = structure.nameJa ?? structure.name ?? '';
    structureWhereEn.textContent = whereLine(
      structure.breadcrumb,
      [structure.side, structure.region, structure.categoryName]
    );
    structureWhereJa.textContent = whereLine(
      structure.breadcrumbJa,
      [structure.sideJa, structure.regionJa, structure.categoryNameJa]
    );
    if (structure.color) {
      structureSwatch.style.setProperty('--landing-structure-color', structure.color);
    }
    // Announced on the pin only. See the note on `structureAnnouncement`.
    structureAnnouncement.replaceChildren(
      ...(structure.pinned
        ? dual(
            `Selected: ${structure.name ?? structure.nameJa ?? ''}`,
            `選択中: ${structure.nameJa ?? structure.name ?? ''}`
          )
        : [])
    );
  }

  function showViewportState(state, detail = {}) {
    if (destroyed || state === 'disposed') return;
    const organ = organById(selected.organ);
    const nameEn = organ?.label ?? selected.organ;
    const nameJa = organ?.labelJa ?? selected.organ;
    const stateCopy = {
      idle: [`The ${nameEn.toLowerCase()} model will load when it is visible.`, `表示領域に入ると${nameJa}の3Dモデルを読み込みます。`],
      deferred: [`Loading the ${nameEn.toLowerCase()} model is paused to reduce data use.`, `データ使用を抑えるため${nameJa}の3Dモデルの読み込みを保留しています。`],
      loading: [`Loading the ${nameEn.toLowerCase()} 3D model`, `${nameJa}の3Dモデルを読み込み中`],
      delayed: [`The ${nameEn.toLowerCase()} 3D model is taking longer to load.`, `${nameJa}の3Dモデルの読み込みに時間がかかっています。`],
      error: [`The ${nameEn.toLowerCase()} 3D model could not be loaded.`, `${nameJa}の3Dモデルを読み込めませんでした。`],
      unavailable: [`This environment cannot display the ${nameEn.toLowerCase()} 3D model.`, `この環境では${nameJa}の3Dモデルを表示できません。`],
    };
    element.dataset.viewport = state;
    const copy = stateCopy[detail.delayed ? 'delayed' : state] ?? stateCopy.loading;
    viewportStatusText.replaceChildren(...dual(copy[0], copy[1]));
    viewportStatus.setAttribute('aria-hidden', String(state === 'ready'));
    const canRetry = state === 'error' || state === 'deferred';
    if (canRetry) {
      viewportRetry.replaceChildren(...dual(
        state === 'deferred' ? 'Load 3D model' : 'Reload 3D model',
        state === 'deferred' ? '3Dモデルを読み込む' : '3Dモデルを再読み込み'
      ));
    }
    viewportRetry.hidden = !canRetry;
    if (canRetry) viewportRetry.removeAttribute('disabled');
    else viewportRetry.setAttribute('disabled', '');
    dragHint.hidden = state !== 'ready';
    // Only a ready model reports whether it has named parts. A transient
    // loading or error state must not be read as "this model has no names",
    // which would take the card away and put it back on every retry.
    if (state === 'ready') namedStructures = Boolean(detail.named);
    renderStructure();
    element.setAttribute('aria-busy', String(state === 'loading' || Boolean(detail.delayed)));
  }

  const organButtons = organs.map((entry, index) => {
    const organ = organById(entry.organ);
    const button = el('button', {
      class: 'landing-demo-state',
      type: 'button',
      dataset: { organ: entry.organ },
      'aria-pressed': 'false',
      on: { click: () => void select(entry.organ) },
    }, [
      compact
        ? null
        : el('span', { class: 'landing-demo-state-index', text: String(index + 1).padStart(2, '0') }),
      el('span', { class: 'landing-demo-state-label' }, dual(
        organ?.label ?? entry.organ,
        organ?.labelJa ?? entry.organ
      )),
    ]);
    buttons.set(entry.organ, button);
    return button;
  });

  const stage = el('div', { class: 'landing-demo-stage' }, [
    viewport,
    viewportStatus,
    compact && showIdentity ? el('header', { class: 'landing-demo-identity' }, [title]) : null,
    structureReadout,
    structureAnnouncement,
    compact ? null : el('header', { class: 'landing-demo-header' }, [
      el('div', {}, [
        kicker,
        title,
      ]),
      el('span', { class: 'landing-demo-case' }, dual('3D MODEL', '3Dモデル')),
    ]),
    dragHint,
  ].filter(Boolean));

  const controls = organs.length > 1
    ? el('fieldset', { class: 'landing-demo-controls' }, [
        el('legend', {}, dual('Choose an organ', '臓器を選ぶ')),
        el('div', { class: 'landing-demo-state-grid is-organs' }, organButtons),
      ])
    : null;

  const workbench = compact
    ? controls
    : el('div', { class: 'landing-demo-workbench' }, [
        controls,
        el('div', {
          class: 'landing-demo-readout is-organ',
          role: 'status',
          'aria-live': 'polite',
          'aria-atomic': 'true',
        }, [explanation]),
        el('footer', { class: 'landing-demo-footer' }, [
          el('span', { class: 'landing-demo-boundary' }, dual(
            'Representative educational model — not for individual diagnosis or treatment decisions.',
            '学習用の代表モデルです。個別の診断・治療判断には使用できません。'
          )),
          showOpenLink ? openLink : null,
        ].filter(Boolean)),
      ].filter(Boolean));

  const element = el('article', {
    class: `landing-demo is-organ${compact ? ' is-compact' : ''}`,
    'aria-labelledby': compact ? null : 'landing-demo-title',
  }, [
    stage,
    workbench,
  ]);

  showViewportState('idle');

  /** Repaint every label for the organ now on screen. */
  function render() {
    const organ = organById(selected.organ);
    const scene = sceneById(selected.sceneId);
    const nameEn = organ?.label ?? selected.organ;
    const nameJa = organ?.labelJa ?? selected.organ;

    element.dataset.organ = selected.organ;
    kicker.replaceChildren(...dual(selected.kickerEn, selected.kickerJa));
    title.replaceChildren(...dual(
      compact ? `${nameEn} 3D model` : nameEn,
      compact ? `${nameJa}の3Dモデル` : nameJa
    ));
    explanation.replaceChildren(...dual(selected.lineEn, selected.lineJa));
    viewport.setAttribute(
      'aria-label',
      `Interactive ${nameEn.toLowerCase()} 3D model / 操作できる${nameJa}の3Dモデル`
    );

    openLink.setAttribute('href', selected.route ?? (scene ? sceneRoute(scene) : '#/organs'));
    openLink.replaceChildren(...dual(
      `View the ${nameEn.toLowerCase()}`,
      `${nameJa}を見る`
    ));

    for (const [organId, button] of buttons) {
      const isSelected = organId === selected.organ;
      button.setAttribute('aria-pressed', String(isSelected));
      button.classList.toggle('is-selected', isSelected);
    }
  }

  /** @param {string} organId */
  async function select(organId) {
    const entry = organs.find((candidate) => candidate.organ === organId);
    if (!entry || destroyed) return;
    selected = entry;
    // A name belongs to the model it was read off. Carrying it across a swap
    // would label the incoming organ with the outgoing organ's anatomy.
    showStructure(null);
    render();
    if (!mountedViewport) return;
    try {
      await mountedViewport.setOrgan(organId, { upgradeSceneId: entry.upgradeSceneId ?? null });
    } catch (error) {
      console.error('landing organ hero', error);
    }
  }

  render();

  async function mount() {
    if (destroyed) return null;
    if (mountedViewport || mountPromise) return mountPromise;
    if (typeof window?.requestAnimationFrame !== 'function') return null;

    viewport.dataset.loading = 'true';
    mountPromise = loadViewport()
      .then(async ({ mountLandingOrganViewport }) => {
        if (destroyed) return null;
        const instance = mountLandingOrganViewport(viewport, {
          onStateChange: showViewportState,
          onStructureChange: showStructure,
          onDetailError: (error) => {
            try {
              void Promise.resolve(onRendererFailure(error, {
                organ: selected.organ,
                sceneId: selected.upgradeSceneId ?? selected.sceneId ?? null,
              })).catch(() => {});
            } catch {
              /* diagnostics must never prevent the status from rendering */
            }
          },
        });
        if (destroyed) {
          instance.destroy();
          return null;
        }
        mountedViewport = instance;
        await instance.setOrgan(selected.organ, {
          upgradeSceneId: selected.upgradeSceneId ?? null,
        });
        if (destroyed) {
          instance.destroy();
          mountedViewport = null;
          return null;
        }
        return instance;
      })
      .catch((error) => {
        if (destroyed) return null;
        console.error('landing 3D organ hero', error);
        try {
          // With what failed, not with what used to be here: the hero builds a
          // different organ on different days, and a report that names one
          // scene for all of them cannot be acted on.
          void Promise.resolve(
            onRendererFailure(error, {
              organ: selected.organ,
              sceneId: selected.upgradeSceneId ?? selected.sceneId ?? null,
            })
          ).catch(() => {});
        } catch {
          /* diagnostics must never prevent the fallback from rendering */
        }
        mountedViewport?.destroy();
        mountedViewport = null;
        viewport.dataset.loading = 'false';
        element.dataset.viewport = 'unavailable';
        viewport.setAttribute('tabindex', '-1');
        viewport.setAttribute('role', 'presentation');
        viewport.setAttribute('aria-hidden', 'true');
        viewport.setAttribute('aria-label', '');
        viewport.setAttribute('aria-describedby', '');
        dragHint.setAttribute('hidden', '');
        showViewportState('unavailable');
        return null;
      });
    return mountPromise;
  }

  return {
    element,
    featured,
    get organ() {
      return selected.organ;
    },
    actionElement: openLink,
    setOrgan: select,
    mount,
    destroy() {
      destroyed = true;
      mountedViewport?.destroy();
      mountedViewport = null;
    },
  };
}

/**
 * Where a structure sits, in one line.
 *
 * The breadcrumb the scene built is preferred; the parts are the fallback for a
 * scene that reports them separately. Empty parts are dropped rather than
 * printed as stray separators — a structure with no side is midline, not
 * "· · cortex".
 *
 * @param {string|undefined} breadcrumb
 * @param {(string|undefined)[]} parts
 */
function whereLine(breadcrumb, parts) {
  if (breadcrumb?.trim()) return breadcrumb;
  return parts.filter((part) => part?.trim()).join(' · ');
}
