import { el } from '../utils/dom.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { prefersReducedMotion } from '../utils/motion.js';
import { EXPLORER_ROUTE, sceneRoute, statusById, systemsWithOrgans } from '../catalog/index.js';

/**
 * The organ explorer: the whole catalogue on one page.
 *
 * Deliberately plain DOM and no Three.js. Opening this page must not build a
 * single piece of geometry — the scene modules stay unloaded until one is
 * chosen, which is the difference between a catalogue that can grow to a
 * hundred entries and one that cannot.
 *
 * It draws itself from `src/catalog/`, so a new scene appears here the moment
 * it is registered. Organs with no scene yet are still listed: the gap is
 * information, and hiding it would quietly turn the backlog invisible.
 *
 * @param {{ ui: HTMLElement }} mounts
 */
export function createExplorer({ ui }) {
  const systems = systemsWithOrgans();

  const badge = (statusId) => {
    const status = statusById(statusId);
    if (!status?.badge) return null;
    return el('span', { class: `status-badge is-${statusId}`, title: status.note }, [
      el('span', { class: 'lang-en', text: status.label }),
      el('span', { class: 'lang-ja', text: status.labelJa }),
    ]);
  };

  const sceneCard = (scene) =>
    el('a', { class: 'explorer-scene', href: sceneRoute(scene) }, [
      el('span', { class: 'explorer-scene-title' }, [
        el('span', { class: 'lang-en', text: scene.titleEn }),
        el('span', { class: 'lang-ja', text: scene.titleJa }),
        badge(scene.status),
      ]),
      el('span', { class: 'explorer-scene-note' }, [
        el('span', { class: 'lang-en', text: scene.description }),
        el('span', { class: 'lang-ja', text: scene.descriptionJa }),
      ]),
    ]);

  /** A disease scene that is declared but not built. Shown, not hidden. */
  const plannedCard = (planned) =>
    el('span', { class: 'explorer-scene is-planned' }, [
      el('span', { class: 'explorer-scene-title' }, [
        el('span', { class: 'lang-en', text: planned.titleEn }),
        el('span', { class: 'lang-ja', text: planned.titleJa }),
        el('span', { class: 'status-badge is-planned' }, [
          el('span', { class: 'lang-en', text: 'Planned' }),
          el('span', { class: 'lang-ja', text: '予定' }),
        ]),
      ]),
    ]);

  const organRow = (organ) =>
    el('div', { class: `explorer-organ${organ.scenes.length ? '' : ' is-empty'}` }, [
      el('h3', { class: 'explorer-organ-name' }, [
        el('span', { class: 'lang-en', text: organ.label }),
        el('span', { class: 'lang-ja', text: organ.labelJa }),
      ]),
      el('div', { class: 'explorer-scenes' }, [
        ...organ.scenes.map(sceneCard),
        ...organ.planned.map(plannedCard),
        organ.scenes.length === 0 && organ.planned.length === 0
          ? el('span', { class: 'explorer-scene is-planned' }, [
              el('span', { class: 'explorer-scene-title' }, [
                el('span', { class: 'lang-en', text: 'No scene yet' }),
                el('span', { class: 'lang-ja', text: 'シーン未実装' }),
              ]),
            ])
          : null,
      ]),
    ]);

  const systemSection = (system) =>
    el('section', { class: 'explorer-system', id: `system-${system.id}` }, [
      el('h2', { class: 'explorer-system-name' }, [
        el('span', { class: 'lang-en', text: system.label }),
        el('span', { class: 'lang-ja', text: system.labelJa }),
        el('span', { class: 'explorer-count', text: String(system.scenes.length) }),
      ]),
      ...system.organs.map(organRow),
    ]);

  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });

  const element = el('div', { class: 'explorer' }, [
    el('header', { class: 'panel explorer-header' }, [
      el('p', { class: 'eyebrow', text: 'medical-3d-lab' }),
      el('h1', { class: 'title' }, [
        el('span', { class: 'lang-en', text: 'Organ explorer' }),
        el('span', { class: 'lang-ja', text: '臓器エクスプローラ' }),
      ]),
      el('p', { class: 'subtitle' }, [
        el('span', {
          class: 'lang-en',
          text: 'Make invisible physiology visible, interactive and understandable — across the whole body.',
        }),
        el('span', { class: 'lang-ja', text: '見えない病態生理を、3D で動かして理解する — 全身を対象に。' }),
      ]),
      el('nav', { class: 'explorer-jump' }, systems.map((system) =>
        el(
          'a',
          {
            class: 'scene-pill',
            href: `#system-${system.id}`,
            // Scrolled rather than navigated: the hash is the app's router, and
            // an in-page anchor writing to it would look like a route change.
            on: {
              click: (event) => {
                event.preventDefault();
                document.getElementById(`system-${system.id}`)?.scrollIntoView({
                  behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                  block: 'start',
                });
              },
            },
          },
          [
            el('span', { class: 'lang-en', text: system.label }),
            el('span', { class: 'lang-ja', text: system.labelJa }),
          ]
        )
      )),
      languageToggle.element,
    ]),
    ...systems.map(systemSection),
    el('footer', { class: 'panel explorer-footer' }, [
      el('p', {}, [
        el('span', {
          class: 'lang-en',
          text:
            'Educational conceptual models. Scenes marked Prototype are stylised shapes with placeholder motion and have not been anatomically validated.',
        }),
        el('span', {
          class: 'lang-ja',
          text:
            '教育目的の概念モデルです。Prototype 表示のシーンは簡略化された形状と仮の動きで構成され、解剖学的な検証は受けていません。',
        }),
      ]),
    ]),
  ]);

  ui.append(element);
  languageToggle.init();
  document.title = 'Organ explorer — medical-3d-lab';

  return { element, route: EXPLORER_ROUTE };
}
