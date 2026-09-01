import test from 'node:test';
import assert from 'node:assert/strict';
import { customerMappingConflict, subscriptionUserId } from '../netlify/lib/billing.js';

test('billing identity: durable Customer mapping outranks mutable subscription metadata', () => {
  assert.equal(subscriptionUserId('user_mapped', 'user_metadata'), 'user_mapped');
});

test('billing identity: metadata is only a fallback before a Customer mapping exists', () => {
  assert.equal(subscriptionUserId(null, 'user_metadata'), 'user_metadata');
  assert.equal(subscriptionUserId(undefined, 'user_metadata'), 'user_metadata');
});

test('billing identity: missing mapping and metadata fail closed', () => {
  assert.equal(subscriptionUserId(null, null), null);
  assert.equal(subscriptionUserId('', ''), null);
});

test('billing identity: an established user cannot be silently moved to another Stripe Customer', () => {
  assert.equal(
    customerMappingConflict({
      userId: 'user_a',
      customerId: 'cus_new',
      existingUserCustomerId: 'cus_original',
    }),
    'user_already_mapped_to_other_customer'
  );
});

test('billing identity: an established Stripe Customer cannot be silently assigned to another user', () => {
  assert.equal(
    customerMappingConflict({
      userId: 'user_new',
      customerId: 'cus_a',
      existingCustomerUserId: 'user_original',
    }),
    'customer_already_mapped_to_other_user'
  );
});

test('billing identity: the same durable mapping remains idempotently writable', () => {
  assert.equal(
    customerMappingConflict({
      userId: 'user_a',
      customerId: 'cus_a',
      existingUserCustomerId: 'cus_a',
      existingCustomerUserId: 'user_a',
    }),
    null
  );
});
