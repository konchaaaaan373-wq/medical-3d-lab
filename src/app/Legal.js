import { EXPLORER_ROUTE, LANDING_ROUTE } from '../catalog/index.js';
import { LEGAL_DOCUMENTS, LEGAL_UPDATED, legalDocument } from '../data/legal.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { el } from '../utils/dom.js';

/**
 * Terms, privacy, commercial disclosure and support.
 *
 * Plain DOM with no renderer, for the same reason the Trust page has none: a
 * person who needs to read the cancellation terms may be on the device that
 * could not start WebGL in the first place, and "the 3D failed so you cannot
 * read the refund policy" is not an acceptable sentence.
 *
 * The disclosure table shows its own gaps. A row the operator has not
 * published is rendered as unpublished rather than left out, because a
 * disclosure that quietly omits a required entry looks complete and is not.
 */

const bilingual = (en, ja, className = '') =>
  el('span', { class: className }, [
    el('span', { class: 'lang-en', text: en }),
    el('span', { class: 'lang-ja', text: ja }),
  ]);

function section(entry) {
  return el('section', { class: 'legal-section' }, [
    el('h2', { class: 'legal-heading' }, [
      el('span', { class: 'lang-en', text: entry.headingEn }),
      el('span', { class: 'lang-ja', text: entry.headingJa }),
    ]),
    el('div', { class: 'legal-body lang-en' }, entry.bodyEn.map((line) => el('p', { text: line }))),
    el('div', { class: 'legal-body lang-ja' }, entry.bodyJa.map((line) => el('p', { text: line }))),
  ]);
}

function disclosureTable(rows) {
  return el(
    'dl',
    { class: 'legal-disclosure' },
    rows.flatMap((row) => [
      el('dt', {}, [
        el('span', { class: 'lang-en', text: row.labelEn }),
        el('span', { class: 'lang-ja', text: row.labelJa }),
      ]),
      el('dd', { class: row.missing ? 'is-missing' : '' }, [
        row.value ? el('span', { class: 'legal-value', text: row.value }) : null,
        row.note
          ? el('span', { class: 'legal-note' }, [
              el('span', { class: 'lang-en', text: row.note.en }),
              el('span', { class: 'lang-ja', text: row.note.ja }),
            ])
          : null,
        row.missing
          ? bilingual(
              'Not yet published — this deployment cannot take payment until it is.',
              '未公開です。公開されるまで、このデプロイでは購入手続きを開始できません。',
              'legal-missing'
            )
          : null,
      ]),
    ])
  );
}

/**
 * @param {{ ui: HTMLElement, docId?: string, accountButton?: HTMLElement|null }} options
 */
export function createLegal({ ui, docId = 'terms', accountButton = null }) {
  const doc = legalDocument(docId) ?? legalDocument('terms');
  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });

  const tabs = el(
    'nav',
    { class: 'legal-tabs', 'aria-label': 'Legal documents / 規約・表記' },
    LEGAL_DOCUMENTS.map((entry) =>
      el(
        'a',
        {
          class: `legal-tab${entry.slug === doc.slug ? ' is-current' : ''}`,
          href: `#/${entry.slug}`,
          'aria-current': entry.slug === doc.slug ? 'page' : null,
        },
        [
          el('span', { class: 'lang-en', text: entry.titleEn }),
          el('span', { class: 'lang-ja', text: entry.titleJa }),
        ]
      )
    )
  );

  const element = el('main', { class: 'legal-page' }, [
    el('header', { class: 'legal-nav' }, [
      el('a', { class: 'legal-brand', href: LANDING_ROUTE, text: 'Medical 3D Lab' }),
      el('nav', { class: 'legal-nav-links', 'aria-label': 'Site navigation' }, [
        el('a', { href: EXPLORER_ROUTE }, [
          el('span', { class: 'lang-en', text: 'Models' }),
          el('span', { class: 'lang-ja', text: 'モデル' }),
        ]),
        el('a', { href: '#/trust' }, [
          el('span', { class: 'lang-en', text: 'Model trust' }),
          el('span', { class: 'lang-ja', text: '医学的信頼性' }),
        ]),
      ]),
      el('div', { class: 'legal-nav-actions' }, [accountButton, languageToggle.element]),
    ]),
    tabs,
    el('article', { class: 'legal-doc' }, [
      el('h1', { class: 'legal-title' }, [
        el('span', { class: 'lang-en', text: doc.titleEn }),
        el('span', { class: 'lang-ja', text: doc.titleJa }),
      ]),
      el('p', { class: 'legal-lead' }, [
        el('span', { class: 'lang-en', text: doc.leadEn }),
        el('span', { class: 'lang-ja', text: doc.leadJa }),
      ]),
      el('p', { class: 'legal-updated' }, [
        el('span', { class: 'lang-en', text: `Last updated ${LEGAL_UPDATED}` }),
        el('span', { class: 'lang-ja', text: `最終更新 ${LEGAL_UPDATED}` }),
      ]),
      doc.rows ? disclosureTable(doc.rows()) : null,
      ...doc.sections.map(section),
    ]),
    el('footer', { class: 'legal-footer' }, [
      bilingual(
        'Educational conceptual models — not patient-specific diagnosis or treatment.',
        '教育目的の概念モデルです。個別患者の診断・治療を行うものではありません。'
      ),
    ]),
  ]);

  ui.append(element);
  languageToggle.init();
  document.title = `${doc.titleEn} — Medical 3D Lab`;
  return { element, docId: doc.slug };
}
