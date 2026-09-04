import { NON_TERMINAL_SUBSCRIPTION_STATUSES, subscriptionGrantsAccess } from './policy.js';

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
export function subscriptionPresentation(subscriptions = [], now = new Date()) {
  const subscription = primarySubscription(subscriptions);
  if (!subscription) return null;

  const plan = PLAN_COPY[subscription.entitlement] ?? Object.freeze({ en: 'Paid plan', ja: '有料プラン' });
  const date = billingDate(subscription.current_period_end);
  const grantsAccess = subscriptionGrantsAccess(subscription, now);

  let status = STATUS_COPY[subscription.status] ?? Object.freeze({
    en: subscription.status || 'Unknown',
    ja: subscription.status || '不明',
    tone: 'muted',
  });
  let detail = null;
  const terminal = ['canceled', 'incomplete_expired', 'missing_from_stripe'].includes(
    subscription.status
  );

  if (!terminal && (subscription.dispute_opened_at || subscription.access_suspended_reason === 'dispute')) {
    status = Object.freeze({ en: 'Payment disputed · access suspended', ja: '異議申立て中・利用停止', tone: 'bad' });
    detail = Object.freeze({ en: 'Paid access is suspended until the dispute is resolved', ja: '異議申立てが解決するまで有料機能を停止しています' });
  } else if (!terminal && (subscription.full_refund_at || subscription.access_suspended_reason === 'full_refund')) {
    status = Object.freeze({ en: 'Payment refunded · access suspended', ja: '返金済み・利用停止', tone: 'bad' });
    detail = Object.freeze({ en: 'Paid access for the refunded period is suspended', ja: '返金対象期間の有料機能を停止しています' });
  } else if (!terminal && subscription.access_suspended_reason) {
    status = Object.freeze({ en: 'Access suspended', ja: '利用停止中', tone: 'bad' });
    detail = Object.freeze({ en: 'Paid access is suspended while billing is reviewed', ja: '課金確認のため有料機能を停止しています' });
  } else if (!terminal && subscription.payment_failed_at) {
    status = grantsAccess
      ? Object.freeze({ en: 'Payment issue · grace access', ja: '支払い確認中・猶予利用中', tone: 'warn' })
      : Object.freeze({ en: 'Payment issue · access paused', ja: '支払い未解決・利用停止中', tone: 'bad' });
    detail = grantsAccess
      ? Object.freeze({ en: 'Update payment details before grace access ends', ja: '猶予期間内に契約管理から支払い方法を更新してください' })
      : Object.freeze({ en: 'Grace access ended · update payment details', ja: '猶予期間終了・契約管理から支払い方法を更新してください' });
  } else if (subscription.cancel_at_period_end && grantsAccess) {
    status = Object.freeze({ en: 'Scheduled to cancel', ja: '解約予定', tone: 'warn' });
    detail = date
      ? Object.freeze({ en: `Access through ${date}`, ja: `${date} まで利用可能` })
      : Object.freeze({ en: 'Access continues through the paid period', ja: '支払済み期間の終了まで利用できます' });
  } else if ((subscription.status === 'active' || subscription.status === 'trialing') && date) {
    detail = Object.freeze({ en: `Next period ${date}`, ja: `次回更新 ${date}` });
  } else if (subscription.status === 'past_due') {
    detail = grantsAccess
      ? Object.freeze({ en: 'Update payment details before grace access ends', ja: '猶予期間内に契約管理から支払い方法を更新してください' })
      : Object.freeze({ en: 'Grace access ended · update payment details', ja: '猶予期間終了・契約管理から支払い方法を更新してください' });
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
