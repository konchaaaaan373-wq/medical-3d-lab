import test from 'node:test';
import assert from 'node:assert/strict';
import { displayAmount, intervalCopy, pricePresentation } from '../src/access/pricing.js';

test('pricing: JPY uses zero-decimal Stripe units', () => {
  assert.equal(displayAmount('jpy', 100), '¥100');
  assert.equal(displayAmount('JPY', 1500), '¥1,500');
});

test('pricing: decimal currencies convert minor units for display', () => {
  assert.equal(displayAmount('usd', 1299), '$12.99');
});

test('pricing: recurring interval copy is bilingual', () => {
  assert.deepEqual(intervalCopy('month', 1), { en: '/ month', ja: '/ 月' });
  assert.deepEqual(intervalCopy('year', 1), { en: '/ year', ja: '/ 年' });
});

test('pricing: presentation fails closed on inactive or incomplete Stripe data', () => {
  assert.equal(pricePresentation(null), null);
  assert.equal(pricePresentation({ active: false, currency: 'jpy', unitAmount: 100, recurring: { interval: 'month' } }), null);
  assert.equal(pricePresentation({ active: true, currency: 'jpy', unitAmount: 100, recurring: null }), null);
});

test('pricing: presentation formats an active recurring plan', () => {
  const view = pricePresentation({
    active: true,
    currency: 'jpy',
    unitAmount: 100,
    recurring: { interval: 'month', intervalCount: 1 },
  });
  assert.equal(view.amount, '¥100');
  assert.equal(view.interval.en, '/ month');
  assert.equal(view.interval.ja, '/ 月');
});
