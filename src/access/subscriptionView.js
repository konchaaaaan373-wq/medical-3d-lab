import { ACCESS_SUBSCRIPTION_STATUSES, NON_TERMINAL_SUBSCRIPTION_STATUSES } from './policy.js';

const PLAN_COPY = Object.freeze({
  patient: Object.freeze({ en: 'Patient explanation', ja: '患者説明' }),
  education: Object.freeze({ en: 'Medical education', ja: '医学教育' }),
  complete: Object.freeze({ en: 'Complete', ja: '両方' }),
});

const STATUS_COPY = Object.freeze({
  active: Object.freeze({ en: 'Active', ja: '利用中', tone: 'good' }),
  trialing: Object.freeze({ en: 'Trial', ja: 'トライアル', tone: 'good' }),
  past_due: Object.freeze({ en: 'Payment issue · grace access', ja: '支払い確認中・猶予利用中', tone: 'warn' }),
  incomplete: Object.freeze({ en: 'Payment incomplete', ja: '支払い未完了', tone: 'warn' }),
  unpaid: Object.freeze({ en: 'Unpaid', ja: '未払い', tone: 'bad' }),
  paused: Object.freeze({ en: 'Paused', ja: '停止中', tone: 'muted' }),
  canceled: Object.freeze({ en: 'Canceled', ja: '解約済み', tone: 'muted' }),
  incomplete_expired: Object.freeze({ en: 'Checkout expired', ja: '購入手続き期限切れ', tone: 'muted' }),
});

/** YYYY-MM-DD is intentionally locale-neutral and compact in a bilingual UI. */
export function billingDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * The API returns rows newest-first. Prefer a live lifecycle if one exists;
 * otherwise show the newest terminal row as account history/status context.
 */
export function primarySubscription(subscriptions = []) {
  if (!Array.isArray(subscriptions) || !subscriptions.length) return null;
  return subscriptions.find((subscription) => NON_TERMINAL_SUBSCRIPTION_STATUSES.has(subscription?.status)) ?? subscriptions[0];
}

/**
 * Converts server subscription state into display copy. This is presentation
 * only: entitlement decisions remain in `policy.js` and never depend on labels.
 */
export function subscriptionPresentation(subscriptions = []) {
  const subscription = primarySubscription(subscriptions);
  if (!subscription) return null;

  const plan = PLAN_COPY[subscription.entitlement] ?? Object.freeze({ en: 'Paid plan', ja: '有料プラン' });
  const date = billingDate(subscription.current_period_end);
  const grantsAccess = ACCESS_SUBSCRIPTION_STATUSES.has(subscription.status);

  let status = STATUS_COPY[subscription.status] ?? Object.freeze({
    en: subscription.status || 'Unknown',
    ja: subscription.status || '不明',
    tone: 'muted',
  });
  let detail = null;

  if (subscription.cancel_at_period_end && grantsAccess) {
    status = Object.freeze({ en: 'Scheduled to cancel', ja: '解約予定', tone: 'warn' });
    detail = date
      ? Object.freeze({ en: `Access through ${date}`, ja: `${date} まで利用可能` })
      : Object.freeze({ en: 'Access continues through the paid period', ja: '支払済み期間の終了まで利用できます' });
  } else if ((subscription.status === 'active' || subscription.status === 'trialing') && date) {
    detail = Object.freeze({ en: `Next period ${date}`, ja: `次回更新 ${date}` });
  } else if (subscription.status === 'past_due') {
    detail = Object.freeze({ en: 'Update payment details in Billing Portal', ja: '契約管理から支払い方法を確認してください' });
  } else if (subscription.status === 'canceled') {
    detail = Object.freeze({ en: 'Paid access is no longer granted', ja: '有料機能の利用権は終了しています' });
  }

  return Object.freeze({
    subscription,
    plan,
    status,
    detail,
    grantsAccess,
    date,
  });
}
