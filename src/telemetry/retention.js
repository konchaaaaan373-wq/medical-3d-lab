/**
 * Retention without a persistent identifier.
 *
 * The roadmap asks for retention as a launch metric. The obvious way to get it
 * — give every browser a durable id and count how often it comes back — is a
 * cross-session identifier, and this product has no reason to hold one.
 *
 * So the browser counts its own visits locally and reports a bucket. What
 * leaves the device is one of three words. What stays on it is a count and a
 * date, never sent anywhere, and a user clearing site data resets it to
 * "first" — which is the honest answer to what we can then know.
 */

/** The buckets, in order. Anything reported must be one of these. */
export const VISIT_BUCKETS = ['first', 'returning', 'regular'];

/** Days on which the product was opened, above which a visitor counts as regular. */
export const REGULAR_VISIT_DAYS = 5;

export const emptyVisitProfile = () => ({ days: 0, lastDay: null });

/** `YYYY-MM-DD` in local time — a day is a day where the user is, not in UTC. */
export function localDay(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Accept only the shape we wrote, so a corrupted or hand-edited entry degrades
 * to "first visit" instead of reporting nonsense.
 *
 * @param {unknown} value
 */
export function normaliseVisitProfile(value) {
  if (!value || typeof value !== 'object') return emptyVisitProfile();
  const days = Number(value.days);
  const lastDay = typeof value.lastDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.lastDay)
    ? value.lastDay
    : null;
  if (!Number.isInteger(days) || days < 0 || days > 100_000) return emptyVisitProfile();
  return { days, lastDay };
}

/**
 * The profile after a visit today. Idempotent within a day: opening the product
 * ten times on one afternoon is one day of use, not ten.
 *
 * @param {unknown} stored
 * @param {string} [today]
 */
export function withVisit(stored, today = localDay()) {
  const profile = normaliseVisitProfile(stored);
  if (profile.lastDay === today) return profile;
  return { days: profile.days + 1, lastDay: today };
}

/**
 * The single word that may leave the device.
 *
 * @param {unknown} stored
 * @returns {'first'|'returning'|'regular'}
 */
export function visitBucket(stored) {
  const { days } = normaliseVisitProfile(stored);
  if (days >= REGULAR_VISIT_DAYS) return 'regular';
  return days <= 1 ? 'first' : 'returning';
}
