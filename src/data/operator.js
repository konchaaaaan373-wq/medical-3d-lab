/**
 * Who is selling, for the pages that have to say so.
 *
 * Japan's 特定商取引法 (Act on Specified Commercial Transactions) requires a
 * seller of a digital service to publish its legal name, the person
 * responsible, an address, contact details, the price, when payment is taken,
 * when the service is provided, and the cancellation terms. Several of those
 * are facts about a business, not about this repository, and **none of them may
 * be invented**: a disclosure with a plausible-looking placeholder in it is
 * worse than an absent one, because it reads as a statement.
 *
 * So they are `null` here until somebody fills them in, the disclosure page
 * says plainly which entries are still missing, and — see
 * `src/access/legalReadiness.js` — the product refuses to offer a paid plan
 * while any of them is.
 *
 * `phoneOnRequest` reflects the accepted practice for an online seller: the
 * number may be withheld from the page provided it is supplied without delay
 * on request, and the page must say that this is the arrangement.
 */
export const OPERATOR = {
  /** 販売業者 — registered legal name of the seller. */
  legalName: null,
  /** 運営統括責任者 — the individual responsible for operations. */
  representative: null,
  /** 所在地 — the registered address. Required; may not be a bare P.O. box. */
  address: null,
  /** 連絡先メールアドレス — a monitored address, not a no-reply. */
  contactEmail: null,
  /** 電話番号. Null is acceptable only together with `phoneOnRequest`. */
  contactPhone: null,
  /** Whether the page states that a number is supplied without delay on request. */
  phoneOnRequest: true,
  /** 事業者の所在国 — where the seller is established. */
  jurisdiction: 'JP',
};

/** Fields that must be present before anything may be sold. */
export const REQUIRED_OPERATOR_FIELDS = ['legalName', 'representative', 'address', 'contactEmail'];

/**
 * Which required entries are still missing.
 *
 * @param {typeof OPERATOR} [operator]
 * @returns {string[]}
 */
export function operatorGaps(operator = OPERATOR) {
  const gaps = REQUIRED_OPERATOR_FIELDS.filter((field) => {
    const value = operator?.[field];
    return typeof value !== 'string' || value.trim() === '';
  });
  // A withheld telephone number is only lawful if the page commits to
  // supplying one on request. Neither present is a gap.
  if (!operator?.contactPhone && operator?.phoneOnRequest !== true) gaps.push('contactPhone');
  return gaps;
}

/** True when the seller can be identified as the disclosure requires. */
export const operatorIsPublishable = (operator = OPERATOR) => operatorGaps(operator).length === 0;
