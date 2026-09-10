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
