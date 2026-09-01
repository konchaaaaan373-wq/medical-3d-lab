import { productBadgesForScene } from '../access/features.js';
import {
  EXPLORER_ROUTE,
  LAB_ROUTE,
  PUBLIC_SCENES,
  sceneRoute,
  statusById,
} from '../catalog/index.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { el } from '../utils/dom.js';

/**
 * WebGL-independent product entry point.
 *
 * It deliberately imports catalogue/copy only — never Three.js or a scene
 * module. Someone can understand the product, its trust levels and the free vs
 * professional-use split even when WebGL is unavailable.
 */
export function createLanding({ ui, accountButton = null }) {
  const featured = PUBLIC_SCENES.filter((scene) => ['production', 'reviewed'].includes(scene.status));
  const diseaseCount = PUBLIC_SCENES.filter((scene) => scene.disease).length;

  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });

  const shellLink = (href, en, ja, className = 'landing-button') =>
    el('a', { class: className, href }, [
      el('span', { class: 'lang-en', text: en }),
      el('span', { class: 'lang-ja', text: ja }),
    ]);

  const badge = (scene) => {
    const status = statusById(scene.status);
    return el('span', { class: `landing-status is-${scene.status}` }, [
      el('span', { class: 'lang-en', text: status?.label ?? scene.status }),
      el('span', { class: 'lang-ja', text: status?.labelJa ?? scene.status }),
    ]);
  };

  const accessBadges = (scene) =>
    el(
      'span',
      { class: 'landing-access-badges', 'aria-label': 'Available product modes' },
      productBadgesForScene(scene).map((item) =>
        el('span', { class: `landing-access-badge is-${item.kind}` }, [
          el('span', { class: 'lang-en', text: item.label }),
          el('span', { class: 'lang-ja', text: item.labelJa }),
        ])
      )
    );

  const sceneCard = (scene) =>
    el('a', { class: 'landing-scene-card', href: sceneRoute(scene) }, [
      el('div', { class: 'landing-scene-head' }, [
        el('div', { class: 'landing-scene-title' }, [
          el('span', { class: 'lang-en', text: scene.titleEn }),
          el('span', { class: 'lang-ja', text: scene.titleJa }),
        ]),
        badge(scene),
      ]),
      el('p', { class: 'landing-scene-copy' }, [
        el('span', { class: 'lang-en', text: scene.description }),
        el('span', { class: 'lang-ja', text: scene.descriptionJa }),
      ]),
      accessBadges(scene),
      el('span', { class: 'landing-scene-open', 'aria-hidden': 'true', text: '→' }),
    ]);

  const productMode = ({ mark, title, titleJa, body, bodyJa, note, noteJa, paid = false }) =>
    el('article', { class: `landing-mode${paid ? ' is-paid' : ''}` }, [
      el('div', { class: 'landing-mode-mark', 'aria-hidden': 'true', text: mark }),
      el('h3', { class: 'landing-mode-title' }, [
        el('span', { class: 'lang-en', text: title }),
        el('span', { class: 'lang-ja', text: titleJa }),
      ]),
      el('p', { class: 'landing-mode-copy' }, [
        el('span', { class: 'lang-en', text: body }),
        el('span', { class: 'lang-ja', text: bodyJa }),
      ]),
      el('div', { class: 'landing-mode-note' }, [
        el('span', { class: 'lang-en', text: note }),
        el('span', { class: 'lang-ja', text: noteJa }),
      ]),
    ]);

  const element = el('main', { class: 'landing' }, [
    el('header', { class: 'landing-nav' }, [
      el('a', { class: 'landing-brand', href: '#/' }, [
        el('span', { class: 'landing-brand-mark', text: '3D', 'aria-hidden': 'true' }),
        el('span', { class: 'landing-brand-name', text: 'Medical 3D Lab' }),
      ]),
      el('nav', { class: 'landing-nav-links', 'aria-label': 'Product navigation' }, [
        shellLink(EXPLORER_ROUTE, 'Models', 'モデル', 'landing-nav-link'),
        shellLink(LAB_ROUTE, 'Lab', '実験室', 'landing-nav-link'),
      ]),
      el('div', { class: 'landing-nav-actions' }, [accountButton, languageToggle.element]),
    ]),

    el('section', { class: 'landing-hero' }, [
      el('div', { class: 'landing-hero-copy' }, [
        el('div', { class: 'landing-eyebrow' }, [
          el('span', { class: 'lang-en', text: 'Interactive medical mechanisms' }),
          el('span', { class: 'lang-ja', text: '触って理解する医学モデル' }),
        ]),
        el('h1', { class: 'landing-title' }, [
          el('span', { class: 'lang-en', text: 'See physiology move.' }),
          el('span', { class: 'lang-ja', text: '病態生理を、動かして理解する。' }),
        ]),
        el('p', { class: 'landing-lead' }, [
          el('span', {
            class: 'lang-en',
            text: 'Model-backed 3D explanations for mechanisms that are hard to hold in your head as a static diagram. Accurate core models start free — no account required.',
          }),
          el('span', {
            class: 'lang-ja',
            text: '静止画だけでは捉えにくい病態生理を、モデルに基づく3Dで可視化します。正確な基本モデルは無料、ログイン不要です。',
          }),
        ]),
        el('div', { class: 'landing-hero-actions' }, [
          shellLink(EXPLORER_ROUTE, 'Explore free models', '無料モデルを見る', 'landing-button primary'),
          shellLink('#/heart-failure', 'Open Heart Failure', '心不全モデルを開く', 'landing-button secondary'),
        ]),
        el('div', { class: 'landing-hero-facts' }, [
          el('span', {}, [
            el('strong', { text: String(PUBLIC_SCENES.length) }),
            el('span', { class: 'lang-en', text: ' public models' }),
            el('span', { class: 'lang-ja', text: ' 公開モデル' }),
          ]),
          el('span', {}, [
            el('strong', { text: String(diseaseCount) }),
            el('span', { class: 'lang-en', text: ' disease mechanisms' }),
            el('span', { class: 'lang-ja', text: ' 病態モデル' }),
          ]),
          el('span', {}, [
            el('strong', { text: '0' }),
            el('span', { class: 'lang-en', text: ' logins needed for core models' }),
            el('span', { class: 'lang-ja', text: ' 基本モデルに必要なログイン' }),
          ]),
        ]),
      ]),
      el('div', { class: 'landing-hero-visual', 'aria-hidden': 'true' }, [
        el('div', { class: 'landing-orbit orbit-a' }),
        el('div', { class: 'landing-orbit orbit-b' }),
        el('div', { class: 'landing-core' }),
        el('div', { class: 'landing-node node-a', text: 'FLOW' }),
        el('div', { class: 'landing-node node-b', text: 'PRESSURE' }),
        el('div', { class: 'landing-node node-c', text: 'VOLUME' }),
        el('div', { class: 'landing-node node-d', text: 'TIME' }),
      ]),
    ]),

    el('section', { class: 'landing-section' }, [
      el('div', { class: 'landing-section-head' }, [
        el('div', {}, [
          el('p', { class: 'landing-section-kicker lang-en', text: 'Start with the reviewed models' }),
          el('p', { class: 'landing-section-kicker lang-ja', text: 'まずはレビュー済みモデルから' }),
          el('h2', { class: 'landing-section-title' }, [
            el('span', { class: 'lang-en', text: 'One model. Multiple ways to understand it.' }),
            el('span', { class: 'lang-ja', text: '1つのモデルを、目的に合わせて理解する。' }),
          ]),
        ]),
        shellLink(EXPLORER_ROUTE, 'Browse all public models →', '公開モデル一覧 →', 'landing-inline-link'),
      ]),
      el('div', { class: 'landing-scene-grid' }, featured.map(sceneCard)),
    ]),

    el('section', { class: 'landing-section landing-product' }, [
      el('div', { class: 'landing-section-head compact' }, [
        el('div', {}, [
          el('p', { class: 'landing-section-kicker lang-en', text: 'Free truth, paid professional workflow' }),
          el('p', { class: 'landing-section-kicker lang-ja', text: '医学モデルは無料、プロ向け利用体験を有料に' }),
          el('h2', { class: 'landing-section-title' }, [
            el('span', { class: 'lang-en', text: 'The medical truth is not the paywall.' }),
            el('span', { class: 'lang-ja', text: '医学的な中身そのものは、課金で隠しません。' }),
          ]),
        ]),
      ]),
      el('div', { class: 'landing-mode-grid' }, [
        productMode({
          mark: '01',
          title: 'Explore',
          titleJa: '基本モデル',
          body: 'Move the core model, inspect the mechanism, and use selected basic explanations without an account.',
          bodyJa: '基本モデルを動かし、機序を確認し、一部の基本解説までログインなしで利用できます。',
          note: 'Free',
          noteJa: '無料',
        }),
        productMode({
          mark: '02',
          title: 'Patient explanation',
          titleJa: '患者説明',
          body: 'Consultation-room presenter, guided patient-facing steps and printable general handouts over the same model.',
          bodyJa: '同じモデルを使った診察室向けプレゼンター、患者向けステップ解説、一般説明用の印刷資料。',
          note: 'Professional mode',
          noteJa: 'プロ向け有料モード',
          paid: true,
        }),
        productMode({
          mark: '03',
          title: 'Medical education',
          titleJa: '医学教育',
          body: 'Prediction, reasoning and structured teaching guides that return to the exact model state you started from.',
          bodyJa: '予測・推論・体系的な教育ガイド。終了後は開始前のモデル状態へ正確に戻ります。',
          note: 'Professional mode',
          noteJa: 'プロ向け有料モード',
          paid: true,
        }),
      ]),
    ]),

    el('section', { class: 'landing-trust' }, [
      el('div', {}, [
        el('p', { class: 'landing-section-kicker lang-en', text: 'Trust is visible' }),
        el('p', { class: 'landing-section-kicker lang-ja', text: '信頼度を隠さない' }),
        el('h2', { class: 'landing-section-title' }, [
          el('span', { class: 'lang-en', text: 'Reviewed models and experiments do not share one shelf.' }),
          el('span', { class: 'lang-ja', text: 'レビュー済みモデルと実験モデルを、同じ棚に置かない。' }),
        ]),
        el('p', { class: 'landing-trust-copy' }, [
          el('span', { class: 'lang-en', text: 'Public models carry their maturity and scope. Stylised Prototype work lives separately in Lab, where its limitations are explicit.' }),
          el('span', { class: 'lang-ja', text: '公開モデルでは成熟度と適用範囲を明示します。簡略化したPrototypeはLabへ分離し、限界を明確に表示します。' }),
        ]),
      ]),
      el('div', { class: 'landing-trust-actions' }, [
        shellLink(EXPLORER_ROUTE, 'Public catalogue', '公開カタログ', 'landing-button secondary'),
        shellLink(LAB_ROUTE, 'Experimental Lab', '実験モデルを見る', 'landing-button ghost'),
      ]),
    ]),

    el('footer', { class: 'landing-footer' }, [
      el('span', { text: 'Medical 3D Lab' }),
      el('span', { class: 'lang-en', text: 'Educational conceptual models — not patient-specific diagnosis or treatment.' }),
      el('span', { class: 'lang-ja', text: '教育目的の概念モデルです。個別患者の診断・治療を行うものではありません。' }),
    ]),
  ]);

  ui.append(element);
  languageToggle.init();
  document.title = 'Medical 3D Lab — interactive physiology';
  return { element };
}
