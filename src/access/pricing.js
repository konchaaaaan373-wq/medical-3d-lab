const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

/**
 * Stripe stores integer minor units. Convert only for display; Stripe remains
 * authoritative for charging and Checkout never receives an amount from the browser.
 */
export function displayAmount(currency, unitAmount) {
  const code = String(currency || '').toUpperCase();
  if (!code || !Number.isFinite(unitAmount)) return null;
  const divisor = ZERO_DECIMAL_CURRENCIES.has(code) ? 1 : 100;
  const amount = unitAmount / divisor;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(code) ? 0 : 2,
      maximumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(code) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(divisor === 1 ? 0 : 2)}`;
  }
}

export function intervalCopy(interval, intervalCount = 1) {
  const count = Number.isFinite(intervalCount) && intervalCount > 0 ? intervalCount : 1;
  if (interval === 'month' && count === 1) return Object.freeze({ en: '/ month', ja: '/ 月' });
  if (interval === 'year' && count === 1) return Object.freeze({ en: '/ year', ja: '/ 年' });
  if (interval === 'week' && count === 1) return Object.freeze({ en: '/ week', ja: '/ 週' });
  if (interval === 'day' && count === 1) return Object.freeze({ en: '/ day', ja: '/ 日' });
  const unit = interval || 'period';
  return Object.freeze({ en: `/ ${count} ${unit}s`, ja: `/ ${count}${unit}` });
}

/**
 * Returns ready-to-render bilingual pricing copy from the safe plan-catalog API.
 * A missing/invalid price produces null rather than an invented amount.
 */
export function pricePresentation(price) {
  if (!price?.active || !price?.recurring) return null;
  const amount = displayAmount(price.currency, price.unitAmount);
  if (!amount) return null;
  return Object.freeze({
    amount,
    interval: intervalCopy(price.recurring.interval, price.recurring.intervalCount),
    currency: String(price.currency).toUpperCase(),
  });
}
