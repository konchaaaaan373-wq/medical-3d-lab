/**
 * Whether this deployment is allowed to sell anything yet.
 *
 * A seller in Japan must publish its identity, its prices, when payment is
 * taken and how to cancel, before it takes money. That is a legal obligation
 * on the operator, and the honest way to hold ourselves to it is to make the
 * software refuse rather than to write it on a checklist somebody ticks.
 *
 * So the purchase path asks this module first. With the commercial disclosure
 * incomplete, the product still works, the account still works, and the plans
 * are still described — but the button does not take money, and it says why.
 *
 * Pure: no DOM, no network. The billing configuration it judges is passed in.
 *
 * It deliberately does not import the documents themselves. What blocks a sale
 * is whether the seller has published its identity and whether the pages are
 * routed — not whether a heading is bilingual, which CI checks separately. The
 * account panel is loaded on every route, and it has no business pulling the
 * full text of the terms along with it.
 */
import { LEGAL_SLUGS } from '../data/legalRoutes.js';
import { OPERATOR, operatorGaps } from '../data/operator.js';

/** Documents that must be reachable in the product before a paid launch. */
export const REQUIRED_LEGAL_DOCUMENTS = ['terms', 'privacy', 'commerce', 'support'];

/**
 * @param {{ operator?: object, availableSlugs?: string[] }} [options]
 * @returns {{ ready: boolean, gaps: string[], missingDocuments: string[], operatorGaps: string[] }}
 */
export function legalReadiness({ operator = OPERATOR, availableSlugs = LEGAL_SLUGS } = {}) {
  const present = new Set(availableSlugs);
  const missingDocuments = REQUIRED_LEGAL_DOCUMENTS.filter((slug) => !present.has(slug));
  const sellerGaps = operatorGaps(operator);
  const gaps = [
    ...missingDocuments.map((slug) => `no "${slug}" page is published`),
    ...sellerGaps.map((field) => `commercial disclosure: "${field}" is not published`),
  ];
  return {
    ready: gaps.length === 0,
    gaps,
    missingDocuments,
    operatorGaps: sellerGaps,
  };
}

/**
 * May this deployment present a working purchase button?
 *
 * Both halves are required and neither substitutes for the other: billing can
 * be configured on a deployment that has not published its disclosure, and a
 * complete disclosure does not create a Stripe account.
 *
 * @param {{ billingConfigured?: boolean, operator?: object }} [state]
 */
export function canSell({ billingConfigured = false, operator = OPERATOR } = {}) {
  return Boolean(billingConfigured) && legalReadiness({ operator }).ready;
}

/** Why the purchase button is inactive, in both languages, or null when it is not. */
export function saleBlockedNotice({ billingConfigured = false, operator = OPERATOR } = {}) {
  if (canSell({ billingConfigured, operator })) return null;
  if (!billingConfigured) {
    return {
      ja: 'このデプロイでは有料購入がまだ有効化されていません。アカウントと無料モデルはそのままご利用いただけます。',
      en: 'Paid checkout is not enabled on this deployment yet. Your account and all free models remain available.',
    };
  }
  return {
    ja: '特定商取引法に基づく表記が未完成のため、購入手続きを開始できません。表記の公開後に有効になります。',
    en: 'Checkout is unavailable until the required commercial disclosure is published.',
  };
}
