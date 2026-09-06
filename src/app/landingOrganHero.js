import { organById, sceneById, sceneRoute } from '../catalog/index.js';
import { HERO_ORGANS, featuredHeroOrgan } from '../data/landingHero.js';
import { el } from '../utils/dom.js';

const dual = (en, ja, className = '') => [
  el('span', { class: `${className} lang-en`.trim(), text: en }),
  el('span', { class: `${className} lang-ja`.trim(), text: ja }),
];

/**
 * The landing hero: one organ model, live, changing by the day.
 *
 * The beta ships the organ models, so the first thing on the page is one of
 * them rather than a description of the product. Which one is decided by the
 * date (`data/landingHero.js`), and the visitor can switch — the rotation is
 * there so the page is not the same page every week, not to withhold the other
 * four.
 *
 * Plain DOM. Nothing here imports Three.js or a scene; the viewport is a
 * dynamic import, so the page shell, the catalogue and the copy all render on
 * a browser that cannot start WebGL at all.
 *
 * @param {{loadViewport?: () => Promise<any>, onRendererFailure?: (error:Error) => void,
 *          now?: () => Date, organs?: typeof HERO_ORGANS}} [options]
 */
export function createLandingOrganHero({
  loadViewport = () => import('./landingOrganViewport.js'),
  onRendererFailure = () => {},
  now = () => new Date(),
  organs = HERO_ORGANS,
} = {}) {
  const featured = featuredHeroOrgan(now(), organs) ?? organs[0];
  const buttons = new Map();

  let selected = featured;
  let mountedViewport = null;
  let mountPromise = null;
  let destroyed = false;

  const todayBadge = el('span', { class: 'landing-demo-case' });
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
      viewportLoading,
      el('header', { class: 'landing-demo-header' }, [
        el('div', {}, [
          el('p', { class: 'landing-demo-kicker' }, dual('LIVE 3D  /  ANATOMY', 'LIVE 3D  /  解剖')),
          title,
        ]),
        todayBadge,
      ]),
      dragHint,
    ]),
    el('div', { class: 'landing-demo-workbench' }, [
      el('fieldset', { class: 'landing-demo-controls' }, [
        el('legend', {}, dual('Choose an organ', '臓器を選ぶ')),
        el('div', { class: 'landing-demo-state-grid is-organs' }, organButtons),
      ]),
      el('div', {
        class: 'landing-demo-readout is-organ',
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true',
      }, [explanation]),
      el('footer', { class: 'landing-demo-footer' }, [
        el('span', { class: 'landing-demo-boundary' }, dual(
          'Anatomy model: shape and normal motion. No disease state and no clinical values.',
          '解剖モデルです。形と正常な動きのみで、病態や臨床数値は扱いません。'
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
    title.replaceChildren(...dual(nameEn, nameJa));
    explanation.replaceChildren(...dual(selected.lineEn, selected.lineJa));

    // Only while the day's own organ is showing. Once a visitor picks another
    // one the badge would be describing the wrong model.
    todayBadge.hidden = selected !== featured;
    todayBadge.replaceChildren(...dual("TODAY'S MODEL", '本日のモデル'));

    openLink.setAttribute('href', scene ? sceneRoute(scene) : '#/organs');
    openLink.replaceChildren(...dual(
      `Open the ${nameEn.toLowerCase()} model ↗`,
      `${nameJa}のモデルを開く ↗`
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
      await mountedViewport.setOrgan(organId);
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
        await instance.setOrgan(selected.organ);
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
          void Promise.resolve(onRendererFailure(error)).catch(() => {});
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
