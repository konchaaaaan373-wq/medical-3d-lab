import {
  deleteStripeCustomer,
  deleteSupabaseUser,
  retrieveStripeCustomer,
  stripeAccountIdForKey,
  verifySupabasePassword,
} from '../lib/account.js';
import { authenticatedUser, json, supabaseAdmin } from '../lib/billing.js';
import { stripeDeploymentSafety } from '../lib/billingConfiguration.js';

export const config = {
  rateLimit: { windowLimit: 3, windowSize: 3600, aggregateBy: ['ip', 'domain'] },
};

const DELETION_KEY_VARIABLE = Object.freeze({
  test: 'STRIPE_TEST_SECRET_KEY_FOR_DELETION',
  live: 'STRIPE_LIVE_SECRET_KEY_FOR_DELETION',
});

function stripeDeletionKey(mode, environment = process.env) {
  const candidates = [
    environment.STRIPE_SECRET_KEY,
    environment[DELETION_KEY_VARIABLE[mode]],
  ];
  const validationContext = mode === 'live' ? 'production' : 'deploy-preview';
  return candidates.find((secretKey) => {
    const safety = stripeDeploymentSafety(
      { STRIPE_SECRET_KEY: secretKey },
      validationContext
    );
    return safety.safe && safety.mode === mode;
  }) ?? null;
}

/**
 * Permanently removes one Medical 3D Lab account.
 *
 * Ordering is deliberate:
 *   1. authenticate the current browser identity;
 *   2. write the database marker that serialises against Checkout;
 *   3. close the Stripe Customer (which closes attached subscriptions);
 *   4. delete Supabase Auth; billing rows cascade from auth.users.
 *
 * If Stripe cannot be closed, Auth is left intact so the user retains a way to
 * manage billing instead of becoming an identity-less paying customer.
 */
export default async (request, context) => {
  if (request.method !== 'DELETE') return json(405, { error: 'Method not allowed' });
  const deployContext = context?.deploy?.context ?? process.env.CONTEXT ?? '';
  if (deployContext !== 'production') {
    return json(403, { error: 'Account deletion is available only on the production deployment.' });
  }

  try {
    const user = await authenticatedUser(request);
    if (!user) return json(401, { error: 'Please sign in first.' });
    const body = await request.json().catch(() => ({}));
    if (typeof body.password !== 'string' || !body.password) {
      return json(400, { error: 'Current password is required.', reauthenticationRequired: true });
    }
    if (!(await verifySupabasePassword(user.email, body.password))) {
      return json(403, { error: 'Current password could not be verified.' });
    }

    // This server-only marker is the serialisation point against Checkout. A
    // database trigger rejects new or reacquired Checkout attempts from now
    // until Auth deletion cascades the marker away. If a provider call fails,
    // retain the marker so a second tab cannot start a new subscription while
    // the user retries this destructive operation.
    await supabaseAdmin('billing_account_deletions?on_conflict=user_id', {
      method: 'POST',
      prefer: 'resolution=ignore-duplicates,return=minimal',
      body: [{ user_id: user.id }],
    });

    // Delete every provider identity before Auth cascades the mode-scoped
    // mappings. A project may contain both sandbox and live Customers after a
    // preview-to-production rollout; dropping either mapping first would leave
    // personal data at Stripe with no durable way to find it again.
    const customers = (await supabaseAdmin(
      `billing_customers?user_id=eq.${encodeURIComponent(user.id)}&select=stripe_customer_id,stripe_mode,stripe_account_id&order=stripe_mode.asc`
    )) ?? [];
    const deletionTargets = customers.map((customer) => ({
      ...customer,
      secretKey: stripeDeletionKey(customer.stripe_mode),
    }));
    if (deletionTargets.some((target) => !target.secretKey)) {
      return json(503, {
        error: 'Account deletion cannot safely reach every stored billing environment.',
      });
    }

    // A test/live prefix does not identify the Stripe account that owns a
    // Customer. Bind each mapping to the immutable acct_* identity before a
    // `resource_missing` response can count as successful deletion. Legacy
    // rows are backfilled only after this exact Customer is retrieved with the
    // candidate key; a wrong-account key therefore leaves Auth intact.
    for (const customer of deletionTargets) {
      const accountId = await stripeAccountIdForKey(customer.secretKey);
      if (customer.stripe_account_id && customer.stripe_account_id !== accountId) {
        return json(503, {
          error: 'Account deletion cannot verify a stored billing environment.',
        });
      }
      if (!customer.stripe_account_id) {
        const existing = await retrieveStripeCustomer(customer.stripe_customer_id, {
          secretKey: customer.secretKey,
        });
        const expectedLivemode = customer.stripe_mode === 'live';
        if (
          !existing ||
          existing.metadata?.supabase_user_id !== user.id ||
          existing.metadata?.stripe_mode !== customer.stripe_mode ||
          Boolean(existing.livemode) !== expectedLivemode
        ) {
          return json(503, {
            error: 'Account deletion cannot verify a stored billing identity.',
          });
        }
        await supabaseAdmin(
          `billing_customers?user_id=eq.${encodeURIComponent(user.id)}&stripe_mode=eq.${encodeURIComponent(customer.stripe_mode)}&stripe_customer_id=eq.${encodeURIComponent(customer.stripe_customer_id)}`,
          {
            method: 'PATCH',
            prefer: 'return=minimal',
            body: { stripe_account_id: accountId },
          }
        );
      }
      customer.verifiedAccountId = accountId;
    }

    // This is intentionally before Auth deletion. A Stripe failure leaves the
    // account usable and recoverable rather than leaving recurring billing with
    // no Medical 3D Lab identity attached to it. Deletion is idempotent, so a
    // retry safely continues if one mode succeeded before another failed.
    for (const customer of deletionTargets) {
      await deleteStripeCustomer(customer.stripe_customer_id, {
        secretKey: customer.secretKey,
        allowMissing: Boolean(customer.verifiedAccountId),
      });
    }

    await deleteSupabaseUser(user.id);
    return json(200, { deleted: true });
  } catch (error) {
    console.error('delete-account failed', { code: error?.code ?? 'unknown' });
    return json(500, {
      error: 'Account could not be deleted safely. Please try again.',
    });
  }
};
