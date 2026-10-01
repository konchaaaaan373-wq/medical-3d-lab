import { el } from '../utils/dom.js';
import { ABOUT_ROUTE } from '../catalog/index.js';
import { BRAND } from '../data/brand.js';
import { NECO_LINKS } from '../data/necoLinks.js';
import { LEGAL_LINKS, SUPPORT_LINKS } from './SiteMenu.js';
import { createWordmark } from './Wordmark.js';

const dual = (en, ja, className = '') => [
  el('span', { class: `${className} lang-en`.trim(), text: en }),
  el('span', { class: `${className} lang-ja`.trim(), text: ja }),
];

/**
 * The foot of every reading surface: About, Evidence, Legal, and the operator.
 *
 * One component, because the landing page and the model index each built
 * their own footer and the two had already drifted — different link sets, the
 * operator named once as a heading-sized section and once as a small credit.
 * Neco Inc. is named here, once, in the size of a credit: BYOKI MOTION is the
 * product and the operator is the company behind it (ADR 2026-09-30).
 *
 * "Evidence" is the About page's account of where a model's claims come from
 * and how a model says what it does not show — not the publication ledger
 * (`#/trust`), which lists every model's review state, most of them
 * unpublished, and which the owner took off every browsing surface on
 * 2026-09-27. A model's own record is one press from that model.
 *
 * @param {{ className?: string }} [options]
 */
export function createSiteFooter({ className = '' } = {}) {
  const link = (href, en, ja) => el('a', { class: 'site-footer-link', href }, dual(en, ja));
  return el('footer', { class: `site-footer ${className}`.trim() }, [
    el('div', { class: 'site-footer-identity' }, [
      el('a', { class: 'site-footer-brand', href: '#/', 'aria-label': BRAND.name }, [createWordmark({ size: 'sm' })]),
      el('p', { class: 'site-footer-boundary' }, dual(
        'Representative educational models — not for individual diagnosis or treatment decisions.',
        '学習用の代表モデルです。個別の診断・治療判断には使用できません。'
      )),
    ]),
    el('nav', { class: 'site-footer-nav', 'aria-label': 'Site / サイト' }, [
      el('div', { class: 'site-footer-group' }, [
        link(ABOUT_ROUTE, 'About', `${BRAND.name} について`),
        link(`${ABOUT_ROUTE}?section=evidence`, 'Evidence', '根拠の扱い'),
        ...SUPPORT_LINKS.map((item) => link(item.href, item.en, item.ja)),
      ]),
      el('div', { class: 'site-footer-group', 'aria-label': 'Legal / 規約' }, [
        ...LEGAL_LINKS.map((item) => link(item.href, item.en, item.ja)),
      ]),
    ]),
    el('p', { class: 'site-footer-operator' }, [
      el('a', {
        class: 'site-footer-operator-link',
        href: NECO_LINKS.operator,
        target: '_blank',
        rel: 'noopener noreferrer',
      }, [
        ...dual(BRAND.operator.en, BRAND.operator.ja),
        el('span', { class: 'site-footer-external', 'aria-hidden': 'true', text: '↗' }),
        ...dual('Opens in a new tab', '新しいタブで開きます', 'visually-hidden'),
      ]),
    ]),
  ]);
}
