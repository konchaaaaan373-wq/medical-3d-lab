/**
 * Product access policy.
 *
 * The 3D model itself is the acquisition surface: accurate core models stay
 * free unless a scene explicitly says otherwise. Paid access is attached to a
 * use-case, not to medical truth:
 *
 * - `patient` unlocks patient-facing explanation mode.
 * - `education` unlocks guided lessons / challenges for medical education.
 * - `complete` is a billing plan that grants both entitlements; it is not an
 *   entitlement of its own.
 *
 * Keeping this pure and separate from auth / Stripe means a scene can be tested
 * without a browser or a billing account.
 */

export const ENTITLEMENT = Object.freeze({
  FREE: 'free',
  PATIENT: 'patient',
  EDUCATION: 'education',
});

export const PLAN = Object.freeze({
  PATIENT: 'patient',
  EDUCATION: 'education',
  COMPLETE: 'complete',
});

/**
 * Statuses that retain paid access inside Medical 3D Lab.
 *
 * `past_due` gets a grace period while Stripe is retrying payment / waiting for
 * customer action. Stripe ultimately moves a failed subscription to `canceled`
 * or `unpaid` according to Billing settings; those states do not grant access.
 */
export const ACCESS_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due']);

/**
 * A user with any of these already has a live subscription lifecycle and must
 * manage it rather than create a second recurring subscription.
 *
 * Stripe documents `incomplete_expired` and `canceled` as terminal for this
 * purpose. `incomplete` is included here as a local safety rule so a failed or
 * still-finishing first Checkout cannot be followed by a second Checkout.
 */
export const NON_TERMINAL_SUBSCRIPTION_STATUSES = new Set([
  'incomplete',
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'paused',
]);

/** What a paid Stripe plan grants inside the product. */
export const PLAN_GRANTS = Object.freeze({
  [PLAN.PATIENT]: Object.freeze([ENTITLEMENT.PATIENT]),
  [PLAN.EDUCATION]: Object.freeze([ENTITLEMENT.EDUCATION]),
  [PLAN.COMPLETE]: Object.freeze([ENTITLEMENT.PATIENT, ENTITLEMENT.EDUCATION]),
});

/** Default feature policy for every scene. */
export const DEFAULT_ACCESS = Object.freeze({
  scene: ENTITLEMENT.FREE,
  patient: ENTITLEMENT.PATIENT,
  education: ENTITLEMENT.EDUCATION,
});

/**
 * Normalises a scene's optional access metadata.
 *
 * @param {any} scene
 */
export function accessForScene(scene) {
  return { ...DEFAULT_ACCESS, ...(scene?.access ?? {}) };
}

/**
 * The free entitlement is implicit and never depends on account state.
 *
 * @param {Iterable<string>} grants
 * @param {string} required
 */
export function canAccess(grants, required = ENTITLEMENT.FREE) {
  if (required === ENTITLEMENT.FREE) return true;
  return new Set(grants ?? []).has(required);
}

/**
 * Converts subscription state into product entitlements.
 *
 * @param {{ entitlement?: string, status?: string }[]} subscriptions
 */
export function grantsFromSubscriptions(subscriptions = []) {
  const grants = new Set([ENTITLEMENT.FREE]);
  for (const subscription of subscriptions) {
    if (!ACCESS_SUBSCRIPTION_STATUSES.has(subscription.status)) continue;
    for (const entitlement of PLAN_GRANTS[subscription.entitlement] ?? []) grants.add(entitlement);
  }
  return [...grants];
}

/** Human copy used by locks and the purchase surface. */
export const ENTITLEMENT_COPY = Object.freeze({
  [ENTITLEMENT.PATIENT]: Object.freeze({
    label: 'Patient explanation',
    labelJa: '患者説明',
    description: 'A simpler guided explanation designed to show a patient what is happening without turning the model into a diagnosis tool.',
    descriptionJa: '患者さんに病態を説明するための、専門用語を抑えたガイド付き表示です。診断ツールにはしません。',
  }),
  [ENTITLEMENT.EDUCATION]: Object.freeze({
    label: 'Medical education',
    labelJa: '医学教育',
    description: 'Prediction, challenge and guided teaching modules built on the same medical model.',
    descriptionJa: '同じ医学モデルを使った、予測・チャレンジ・ガイド付き学習モジュールです。',
  }),
});
