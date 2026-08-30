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

export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

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
 * Converts active subscriptions into product entitlements.
 *
 * @param {{ entitlement?: string, status?: string }[]} subscriptions
 */
export function grantsFromSubscriptions(subscriptions = []) {
  const grants = new Set([ENTITLEMENT.FREE]);
  for (const subscription of subscriptions) {
    if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) continue;
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
