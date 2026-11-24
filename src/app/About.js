import { el, skipLink } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import { createShellHeader } from '../components/ShellHeader.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { createSiteFooter } from '../components/SiteFooter.js';
import { createWordmark } from '../components/Wordmark.js';
import { LANDING_ROUTE } from '../catalog/index.js';
import { BRAND, pageTitle } from '../data/brand.js';
import { NECO_LINKS } from '../data/necoLinks.js';

const dual = (en, ja, className = '') => [
  el('span', { class: `${className} lang-en`.trim(), text: en }),
  el('span', { class: `${className} lang-ja`.trim(), text: ja }),
];

/** `?section=` of an About address, or null. */
function sectionOf(hash) {
  const [route, query] = String(hash).split('?');
  if (!/^#\/?about$/.test(route.trim()) || !query) return null;
  return new URLSearchParams(query).get('section');
}

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
        createWordmark({ size: 'lg', withMark: true }),
      ]),
      el('p', { class: 'bm-about-tagline' }, dual(BRAND.tagline.en, BRAND.tagline.ja)),
      el('p', { class: 'bm-page-lead' }, dual(
        `${BRAND.description} For medical students, residents and clinicians — and usable by anyone who wants to see where things are.`,
        `${BRAND.descriptionJa}医学生・研修医・若手医師を主な読み手に、専門外の人でも触れば分かるように作っています。`
      )),
    ]),

    section('what', { en: 'What it is for', ja: 'このサービスですること' }, [
      el('ol', { class: 'bm-loop is-inline' }, [
        ['Point at it', '名前で指す'],
        ['Turn it', '回して見る'],
        ['Find it on MRI', 'MRI で探す'],
        ['Connect it to function', '機能とつなげる'],
      ].map(([en, ja], index) => el('li', { class: `bm-loop-step${index === 2 ? ' is-change' : ''}` }, dual(en, ja)))),
      paragraph(
        'The launch covers one organ, the brain, in three parts: its anatomy in 3D, a standard-brain MRI atlas linked to the same structures, and higher brain function read as networks rather than as one region per function. Other organs and disease models exist and are not published in this launch.',
        '初期版が扱うのは脳だけで、3 つの部分からなります。3D の脳解剖、同じ構造に連動する標準脳 MRI アトラス、そして「1 領域 = 1 機能」ではなくネットワークとして読む高次脳機能です。ほかの臓器と病態モデルも作ってありますが、初期版では公開していません。'
      ),
    ]),

    section('rule', { en: 'What we will not do', ja: 'しないこと' }, [
      el('dl', { class: 'bm-about-verdicts' }, [
        el('dt', {}, dual('No invented images', '架空の画像を使わない')),
        el('dd', {}, dual(
          'The MRI is a published volume drawn slice by slice in your browser, not a picture made to look like one.',
          'MRI は公開されている実際のボリュームデータを、ブラウザで断面ごとに描いています。それらしく作った絵ではありません。'
        )),
        el('dt', {}, dual('No claim ahead of its review', 'レビューより先に主張しない')),
        el('dd', {}, dual(
          'A model that says which pathway carries which function stays closed until a clinician has reviewed it. Until then its page says it is closed, and the open pages do not say it for it.',
          '「どの経路がどの機能を担うか」を述べるモデルは、医師のレビューが済むまで公開しません。それまでは「未公開」と表示し、公開中のページが代わりに述べることもしません。'
        )),
        el('dt', {}, dual('No one-region-one-function', '「1 領域 = 1 機能」にしない')),
        el('dd', {}, dual(
          'A coloured region on the atlas is an anatomical label. Function belongs to routes through several structures.',
          'アトラスで色の付いた領域は解剖学的なラベルです。機能は、複数の構造を通る経路のほうにあります。'
        )),
      ]),
    ]),

    section('evidence', { en: 'Evidence and limits', ja: '根拠の扱い' }, [
      paragraph(
        'Every model is a representative educational model. It explains a structure or a mechanism; it does not predict what will happen to a particular patient, and it is not for diagnosis or treatment decisions.',
        'すべてのモデルは教育用の代表モデルです。構造や機序を説明するためのもので、特定の患者に何が起きるかを予測するものではなく、診断や治療の判断には使えません。'
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

    section('readers', { en: 'Data and sources', ja: 'データと出典' }, [
      paragraph(
        'MRI: the MNI ICBM 152 (2009c nonlinear symmetric) template — an average of 152 young adults, © McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University. Labels: the CerebrA atlas (Manera et al., 2020). 3D anatomy: published atlases, credited in each model. Every asset is recorded with its source, version, licence and what was changed.',
        'MRI は MNI ICBM 152（2009c 非線形対称）テンプレート——若年成人 152 人の平均（© McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University）。ラベルは CerebrA アトラス（Manera ほか、2020）。3D 解剖は公開アトラスに基づき、各モデルに出典を記しています。素材ごとに、取得元・版・ライセンス・加えた変更を記録しています。'
      ),
      paragraph(
        'These are standard brains, not anyone\u2019s brain. They are not for diagnosis, for locating a lesion in a patient, or for treatment decisions.',
        'どれも標準脳で、特定の誰かの脳ではありません。診断、患者の病変の位置の判定、治療の判断には使えません。'
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
      el('a', { class: 'bm-cta', href: LANDING_ROUTE }, [
        ...dual('Start with the brain', '脳から始める'),
        el('span', { class: 'bm-cta-arrow', 'aria-hidden': 'true', text: '→' }),
      ]),
    ]),
    createSiteFooter(),
  ]);

  ui.append(skipLink(), element);
  languageToggle.init();
  document.title = pageTitle(inLanguage('About', 'About'));

  // Only a section this page has: the value comes from the address bar.
  const openSection = (id) => {
    const target = ABOUT_SECTIONS.includes(id) ? element.querySelector(`#about-${id}`) : null;
    if (!target) return;
    globalThis.requestAnimationFrame?.(() => {
      target.scrollIntoView?.({ block: 'start' });
      target.focus?.({ preventScroll: true });
    });
  };
  openSection(focusId);
  // The footer's "Evidence" pressed on this page changes only the query, which
  // the shell treats as the same page (`sameRoute`) and does not rebuild — so
  // the page answers it itself.
  const onHash = () => openSection(sectionOf(globalThis.location?.hash ?? ''));
  globalThis.addEventListener?.('hashchange', onHash);

  return {
    element,
    destroy() {
      globalThis.removeEventListener?.('hashchange', onHash);
      element.remove();
    },
  };
}
