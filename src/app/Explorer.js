import { productBadgesForScene } from '../access/features.js';
import { ENTITLEMENT } from '../access/policy.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { EXPLORER_ROUTE, sceneRoute, statusById, systemsWithOrgans } from '../catalog/index.js';
import { el } from '../utils/dom.js';
import { prefersReducedMotion } from '../utils/motion.js';

const EDUCATION_GUIDE_MODULE = 'guided-teaching';

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
 * @param {{ ui: HTMLElement, accountButton?: HTMLElement, access?: any }} mounts
 */
export function createExplorer({ ui, accountButton = null, access = null }) {
  const systems = systemsWithOrgans();

  const badge = (statusId) => {
    const status = statusById(statusId);
    if (!status?.badge) return null;
    return el('span', { class: `status-badge is-${statusId}`, title: status.note }, [
      el('span', { class: 'lang-en', text: status.label }),
      el('span', { class: 'lang-ja', text: status.labelJa }),
    ]);
  };

  const productBadges = (scene) =>
    el('span', { class: 'explorer-access', 'aria-label': 'Available product modes' },
      productBadgesForScene(scene).map((entry) =>
        el('span', {
          class: `explorer-access-badge is-${entry.kind}`,
          'data-product-mode': entry.id,
        }, [
          entry.kind === 'paid'
            ? el('span', { class: 'explorer-access-lock', 'aria-hidden': 'true', text: '◇' })
            : null,
          el('span', { class: 'lang-en', text: entry.label }),
          el('span', { class: 'lang-ja', text: entry.labelJa }),
          entry.id === 'education'
            ? el('span', {
                class: 'explorer-access-complete',
                'aria-hidden': 'true',
                text: '✓',
                hidden: '',
              })
            : null,
        ])
      )
    );

  const sceneCard = (scene) =>
    el('a', {
      class: 'explorer-scene',
      href: sceneRoute(scene),
      'data-scene-id': scene.id,
    }, [
      el('span', { class: 'explorer-scene-title' }, [
        el('span', { class: 'lang-en', text: scene.titleEn }),
        el('span', { class: 'lang-ja', text: scene.titleJa }),
        badge(scene.status),
      ]),
      productBadges(scene),
      el('span', { class: 'explorer-scene-note' }, [
        el('span', { class: 'lang-en', text: scene.description }),
        el('span', { class: 'lang-ja', text: scene.descriptionJa }),
      ]),
    ]);

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

  const headerActions = el('div', { class: 'explorer-header-actions' }, [
    accountButton,
    languageToggle.element,
  ]);

  const learningSummaryValue = el('div', { class: 'explorer-learning-value' });
  const learningMeterFill = el('span', { class: 'explorer-learning-meter-fill' });
  const learningSummary = el('section', {
    class: 'explorer-learning-summary',
    hidden: '',
    'aria-label': 'Medical education progress',
  }, [
    el('div', { class: 'explorer-learning-copy' }, [
      el('span', { class: 'explorer-learning-label lang-en', text: 'Your medical education progress' }),
      el('span', { class: 'explorer-learning-label lang-ja', text: '医学教育の進捗' }),
      learningSummaryValue,
    ]),
    el('div', {
      class: 'explorer-learning-meter',
      role: 'progressbar',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': '0',
    }, [learningMeterFill]),
  ]);

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
      el('div', { class: 'explorer-product-key' }, [
        el('span', { class: 'explorer-access-badge is-free' }, [
          el('span', { class: 'lang-en', text: 'Core model stays free' }),
          el('span', { class: 'lang-ja', text: '基本モデルは無料' }),
        ]),
        el('span', { class: 'explorer-product-note' }, [
          el('span', { class: 'lang-en', text: 'Patient and Education badges mark optional paid professional-use modes.' }),
          el('span', { class: 'lang-ja', text: '患者説明・医学教育の表示は、追加の有料プロフェッショナル機能があるシーンです。' }),
        ]),
      ]),
      learningSummary,
      el('nav', { class: 'explorer-jump' }, systems.map((system) =>
        el(
          'a',
          {
            class: 'scene-pill',
            href: `#system-${system.id}`,
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
      headerActions,
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

  function syncAccess(snapshot) {
    const educationUnlocked = snapshot?.grants?.includes(ENTITLEMENT.EDUCATION);
    const completed = new Set(
      (snapshot?.educationProgress ?? [])
        .filter((row) => row.moduleId === EDUCATION_GUIDE_MODULE && row.completed)
        .map((row) => row.sceneId)
    );

    for (const card of element.querySelectorAll('.explorer-scene[data-scene-id]')) {
      const sceneId = card.dataset.sceneId;
      const educationBadge = card.querySelector('[data-product-mode="education"]');
      if (!educationBadge) continue;
      const done = educationUnlocked && completed.has(sceneId);
      educationBadge.classList.toggle('is-completed', done);
      const mark = educationBadge.querySelector('.explorer-access-complete');
      if (mark) mark.hidden = !done;
    }

    const summary = snapshot?.educationSummary;
    learningSummary.hidden = !educationUnlocked || !summary?.total;
    if (learningSummary.hidden) return;

    const percent = summary.percent ?? 0;
    learningSummaryValue.replaceChildren(
      el('span', {
        class: 'lang-en',
        text: summary.isComplete
          ? 'All teaching guides completed'
          : `${summary.completed} / ${summary.total} completed`,
      }),
      el('span', {
        class: 'lang-ja',
        text: summary.isComplete
          ? 'すべての教育ガイドを完了'
          : `${summary.completed} / ${summary.total} 完了`,
      })
    );
    learningMeterFill.style.width = `${percent}%`;
    learningSummary.querySelector('.explorer-learning-meter')?.setAttribute('aria-valuenow', String(percent));
  }

  ui.append(element);
  languageToggle.init();
  access?.subscribe(syncAccess);
  document.title = 'Organ explorer — medical-3d-lab';

  return { element, route: EXPLORER_ROUTE };
}
