import {
  deleteStripeCustomer,
  deleteSupabaseUser,
  verifySupabasePassword,
} from '../lib/account.js';
import { authenticatedUser, json, stripeModeFilter, supabaseAdmin } from '../lib/billing.js';
import { stripeDeploymentSafety } from '../lib/billingConfiguration.js';

export const config = {
  rateLimit: { windowLimit: 3, windowSize: 3600, aggregateBy: ['ip', 'domain'] },
};

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

    // Ask the database whether this identity has ever had a live Customer
    // before requiring Stripe configuration. A free account must remain
    // deletable while Stripe is down or not configured at all. Conversely, a
    // live Customer can never be skipped just because the current key is
    // absent or points at the sandbox namespace.
    const rows = await supabaseAdmin(
      `billing_customers?user_id=eq.${encodeURIComponent(user.id)}&${stripeModeFilter('live')}&select=stripe_customer_id&limit=1`
    );
    const customerId = rows?.[0]?.stripe_customer_id ?? null;

    // This is intentionally before Auth deletion. A Stripe failure leaves the
    // account usable and recoverable rather than leaving recurring billing with
    // no Medical 3D Lab identity attached to it.
    if (customerId) {
      const stripeSafety = stripeDeploymentSafety(process.env, deployContext);
      if (!stripeSafety.safe || stripeSafety.mode !== 'live') {
        return json(503, { error: 'Billing is not configured safely on this deployment.' });
      }
      await deleteStripeCustomer(customerId);
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
