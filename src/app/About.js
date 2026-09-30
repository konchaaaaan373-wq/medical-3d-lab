import { el, skipLink } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import { createShellHeader } from '../components/ShellHeader.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { createSiteFooter } from '../components/SiteFooter.js';
import { createWordmark } from '../components/Wordmark.js';
import { MODELS_ROUTE } from '../catalog/index.js';
import { BRAND, pageTitle } from '../data/brand.js';
import { NECO_LINKS } from '../data/necoLinks.js';

const dual = (en, ja, className = '') => [
  el('span', { class: `${className} lang-en`.trim(), text: en }),
  el('span', { class: `${className} lang-ja`.trim(), text: ja }),
];

/** The sections `?section=` may open on. */
export const ABOUT_SECTIONS = Object.freeze(['what', 'rule', 'evidence', 'readers', 'operator']);

const section = (id, title, children) =>
  el('section', { class: 'bm-about-section', id: `about-${id}`, 'aria-labelledby': `about-${id}-title`, tabindex: '-1' }, [
    el('h2', { class: 'bm-about-heading', id: `about-${id}-title` }, dual(title.en, title.ja)),
    ...children,
  ]);

const paragraph = (en, ja) => el('p', {}, dual(en, ja));

const external = (href, en, ja) =>
  el('a', { class: 'bm-about-external', href, target: '_blank', rel: 'noopener noreferrer' }, [
    ...dual(en, ja),
    el('span', { 'aria-hidden': 'true', text: ' ↗' }),
    ...dual('Opens in a new tab', '新しいタブで開きます', 'visually-hidden'),
  ]);

/**
 * `#/about` — what BYOKI MOTION is, how a model earns its place, how a model
 * says what it does not show, and who runs it.
 *
 * Short on purpose: four sections a person reads in a minute. It is where the
 * operator is introduced (ADR 2026-09-30 — Neco Inc. is named here and in the
 * footer, not on the product's front door), and it is the footer's
 * "Evidence": the account of how claims are sourced and bounded, rather than
 * the publication ledger of every model.
 *
 * The model rule is the same one `docs/adding-a-scene.md` asks before a scene
 * is built. It is stated here too because a reader who wonders why some
 * condition has no model deserves the reason.
 *
 * @param {{ui: HTMLElement, accountButton?: HTMLElement|null, focusId?: string|null}} options
 *   `focusId` opens on a section — `evidence` is what the footer links to
 */
export function createAbout({ ui, accountButton = null, focusId = null }) {
  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });

  const element = el('main', { class: 'bm-page bm-about' }, [
    createShellHeader({ current: 'about', accountButton, languageToggle: languageToggle.element }),
    el('header', { class: 'bm-page-head bm-about-head', id: 'content', tabindex: '-1', 'data-skip-target': '' }, [
      el('h1', { class: 'bm-page-title' }, [
        createWordmark({ size: 'lg' }),
      ]),
      el('p', { class: 'bm-about-tagline' }, dual(BRAND.tagline.en, BRAND.tagline.ja)),
      el('p', { class: 'bm-page-lead' }, dual(
        `${BRAND.description} Each one lets you change a condition, watch the body respond, and see why it changed.`,
        `${BRAND.descriptionJa}条件を変えると身体が反応し、その理由まで分かる——そのための教材です。`
      )),
    ]),

    section('what', { en: 'What a model does', ja: 'モデルがすること' }, [
      el('ol', { class: 'bm-loop is-inline' }, [
        ['Look', '見る'],
        ['Move', '動かす'],
        ['The state changes', '状態が変わる'],
        ['See why', 'なぜ変わったかが分かる'],
      ].map(([en, ja], index) => el('li', { class: `bm-loop-step${index === 2 ? ' is-change' : ''}` }, dual(en, ja)))),
      paragraph(
        '3D is one way of showing this, not the goal. Where a plot, a pair of numbers, a two-axis control or points in motion make the cause and effect clearer, the model uses those instead.',
        '3D は表現手段のひとつで、目的ではありません。グラフ・数値・2軸の操作・粒子の動きのほうが因果関係を早く伝えられるなら、モデルはそちらを使います。'
      ),
    ]),

    section('rule', { en: 'When we make a model', ja: 'モデルをつくる条件' }, [
      el('p', { class: 'bm-about-rule' }, dual(
        'Does moving it — or watching it change over time — make it clearly easier to understand than a still picture or a paragraph?',
        '操作や時間の変化によって、静止画や文章より、理解がはっきり深まるか。'
      )),
      el('dl', { class: 'bm-about-verdicts' }, [
        el('dt', {}, dual('Yes', 'はい')),
        el('dd', {}, dual('We make it as an interactive model.', 'インタラクティブなモデルとしてつくります。')),
        el('dt', {}, dual('No', 'いいえ')),
        el('dd', {}, dual(
          'We do not force it into one. A model that only lets you look at anatomy is not what this product is for — the anatomy is there to check where a disease model points.',
          '無理にモデルにはしません。解剖を眺めるだけのモデルは主役にせず、解剖は病態モデルが指す場所を確かめるために置いています。'
        )),
      ]),
    ]),

    section('evidence', { en: 'Evidence and limits', ja: '根拠の扱い' }, [
      paragraph(
        'Every model is an educational conceptual model. It explains a mechanism; it does not predict what will happen to a particular patient, and it is not for diagnosis or treatment decisions.',
        'すべてのモデルは教育用の概念モデルです。機序を説明するためのもので、特定の患者に何が起きるかを予測するものではなく、診断や治療の判断には使えません。'
      ),
      paragraph(
        'Inside each model, “About this model” says what it shows and what it does not, where it simplifies, where its numbers came from, and the state of its medical review and version. A model that has not been reviewed says so.',
        '各モデルの「このモデルについて」に、示すこと・示さないこと・単純化していること・数値の出どころ・医学レビューの状態と版を置いています。レビューを受けていないモデルは、そう表示します。'
      ),
      paragraph(
        'The numbers on screen are what the model computes, not clinical measurements, and they are shown to no more digits than the model supports.',
        '画面の数値はモデルの計算結果で、臨床の測定値ではありません。モデルの精度を超える桁は出しません。'
      ),
    ]),

    section('readers', { en: 'Medical and Patient', ja: '医療者向けと患者向け' }, [
      paragraph(
        'One model, one state, one animation — told two ways. Medical uses clinical terms and shows the figures; Patient explains the same motion in plain words. Patient explanations open model by model, after a current medical review.',
        'モデル・状態・アニメーションはひとつで、伝え方が2通りあります。医療者向けは医学用語と数値で、患者向けは同じ動きを平易な言葉で説明します。患者向けの説明は、医学レビューを終えたモデルから順に公開します。'
      ),
    ]),

    section('operator', { en: 'Operator', ja: '運営' }, [
      paragraph(
        `${BRAND.name} is operated by Neco Inc., which also supports doctors considering their work and careers, and medical institutions recruiting doctors.`,
        `${BRAND.name} は株式会社Necoが運営しています。Necoは、医師の働き方・転職の相談と、医療機関の医師採用も支援しています。`
      ),
      el('ul', { class: 'bm-about-links' }, [
        el('li', {}, [external(NECO_LINKS.operator, 'Neco Inc.', '株式会社Neco')]),
        el('li', {}, [external(NECO_LINKS.doctor, 'For doctors: work and opportunities', '医師の方：働き方・求人の相談')]),
        el('li', {}, [external(NECO_LINKS.medicalInstitution, 'For medical institutions: doctor recruitment', '医療機関の方：医師採用の相談')]),
      ]),
    ]),

    el('p', { class: 'bm-about-next' }, [
      el('a', { class: 'bm-cta', href: MODELS_ROUTE }, [
        ...dual('See the models', 'モデルを見る'),
        el('span', { class: 'bm-cta-arrow', 'aria-hidden': 'true', text: '→' }),
      ]),
    ]),
    createSiteFooter(),
  ]);

  ui.append(skipLink(), element);
  languageToggle.init();
  document.title = pageTitle(inLanguage('About', 'About'));

  // Only a section this page has: the value comes from the address bar.
  const target = ABOUT_SECTIONS.includes(focusId) ? element.querySelector(`#about-${focusId}`) : null;
  if (target) {
    globalThis.requestAnimationFrame?.(() => {
      target.scrollIntoView?.({ block: 'start' });
      target.focus?.({ preventScroll: true });
    });
  }

  return {
    element,
    destroy() {
      element.remove();
    },
  };
}
