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
 *          now?: () => Date, organs?: typeof HERO_ORGANS}} [options]
 */
export function createLandingOrganHero({
  loadViewport = () => import('./landingOrganViewport.js'),
  onRendererFailure = () => {},
  now = () => new Date(),
  organs = HERO_ROTATION,
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
  const openLink = el('a', { class: 'landing-demo-link landing-cta', href: '#/' });

  const dragHint = el('div', { class: 'landing-demo-drag-hint', 'aria-hidden': 'true' }, [
    el('span', { text: '↔' }),
    ...dual(
      'Drag / arrow keys to rotate · Scroll / +− to zoom',
      'ドラッグ／矢印キーで回転・スクロール／+−で拡大'
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

  const viewportLoading = el('div', { class: 'landing-demo-loading', 'aria-hidden': 'true' }, [
    el('span'),
    ...dual('Loading 3D model', '3Dモデルを読み込み中'),
  ]);

  // Stage 2 is arriving. Shown only while it is, driven from the viewport's own
  // `data-detail` state by a sibling selector, so nothing has to be kept in
  // sync from JavaScript. It never reports a failure: if the detailed model
  // does not arrive, the builder on screen is still a real organ.
  const detailNote = el('div', { class: 'landing-demo-detail', 'aria-hidden': 'true' }, [
    el('span', { class: 'landing-demo-detail-dot' }),
    ...dual('Loading the detailed model', '詳細モデルを読み込み中'),
  ]);

  const organButtons = organs.map((entry, index) => {
    const organ = organById(entry.organ);
    const button = el('button', {
      class: 'landing-demo-state',
      type: 'button',
      dataset: { organ: entry.organ },
      'aria-pressed': 'false',
      on: { click: () => void select(entry.organ) },
    }, [
      el('span', { class: 'landing-demo-state-index', text: String(index + 1).padStart(2, '0') }),
      el('span', { class: 'landing-demo-state-label' }, dual(
        organ?.label ?? entry.organ,
        organ?.labelJa ?? entry.organ
      )),
    ]);
    buttons.set(entry.organ, button);
    return button;
  });

  const element = el('article', { class: 'landing-demo is-organ', 'aria-labelledby': 'landing-demo-title' }, [
    el('div', { class: 'landing-demo-stage' }, [
      viewport,
      detailNote,
      viewportLoading,
      el('header', { class: 'landing-demo-header' }, [
        el('div', {}, [
          kicker,
          title,
        ]),
        el('span', { class: 'landing-demo-case' }, dual('3D MODEL', '3Dモデル')),
      ]),
      dragHint,
    ]),
    el('div', { class: 'landing-demo-workbench' }, [
      organs.length > 1
        ? el('fieldset', { class: 'landing-demo-controls' }, [
            el('legend', {}, dual('Choose an organ', '臓器を選ぶ')),
            el('div', { class: 'landing-demo-state-grid is-organs' }, organButtons),
          ])
        : null,
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
        openLink,
      ]),
    ]),
  ]);

  /** Repaint every label for the organ now on screen. */
  function render() {
    const organ = organById(selected.organ);
    const scene = sceneById(selected.sceneId);
    const nameEn = organ?.label ?? selected.organ;
    const nameJa = organ?.labelJa ?? selected.organ;

    element.dataset.organ = selected.organ;
    kicker.replaceChildren(...dual(selected.kickerEn, selected.kickerJa));
    title.replaceChildren(...dual(nameEn, nameJa));
    explanation.replaceChildren(...dual(selected.lineEn, selected.lineJa));

    openLink.setAttribute('href', selected.route ?? (scene ? sceneRoute(scene) : '#/organs'));
    openLink.replaceChildren(...dual(
      `View the ${nameEn.toLowerCase()} ↗`,
      `${nameJa}を見る ↗`
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
        const instance = mountLandingOrganViewport(viewport);
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
        viewport.dataset.loading = 'false';
        element.dataset.viewport = 'ready';
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
        viewportLoading.setAttribute('aria-hidden', 'false');
        viewportLoading.setAttribute('role', 'status');
        viewportLoading.setAttribute('aria-live', 'polite');
        viewportLoading.replaceChildren(...dual(
          '3D preview unavailable — open the model instead.',
          '3Dプレビューを表示できません。モデル本体を開いてください。'
        ));
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
    setOrgan: select,
    mount,
    destroy() {
      destroyed = true;
      mountedViewport?.destroy();
      mountedViewport = null;
    },
  };
}
