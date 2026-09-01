import { deleteStripeCustomer, deleteSupabaseUser } from '../lib/account.js';
import { authenticatedUser, json, supabaseAdmin } from '../lib/billing.js';

/**
 * Permanently removes one Medical 3D Lab account.
 *
 * Ordering is deliberate:
 *   1. authenticate the current browser identity;
 *   2. close the Stripe Customer first (which closes attached subscriptions);
 *   3. delete Supabase Auth; billing rows cascade from auth.users.
 *
 * If Stripe cannot be closed, Auth is left intact so the user retains a way to
 * manage billing instead of becoming an identity-less paying customer.
 */
export default async (request) => {
  if (request.method !== 'DELETE') return json(405, { error: 'Method not allowed' });

  try {
    const user = await authenticatedUser(request);
    if (!user) return json(401, { error: 'Please sign in first.' });

    const rows = await supabaseAdmin(
      `billing_customers?user_id=eq.${encodeURIComponent(user.id)}&select=stripe_customer_id&limit=1`
    );
    const customerId = rows?.[0]?.stripe_customer_id ?? null;

    // This is intentionally before Auth deletion. A Stripe failure leaves the
    // account usable and recoverable rather than leaving recurring billing with
    // no Medical 3D Lab identity attached to it.
    if (customerId) await deleteStripeCustomer(customerId);

    await deleteSupabaseUser(user.id);
    return json(200, { deleted: true });
  } catch (error) {
    console.error('delete-account', error);
    return json(500, {
      error: error.message || 'Account could not be deleted safely.',
    });
  }
};
