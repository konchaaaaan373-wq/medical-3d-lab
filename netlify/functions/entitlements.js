import { grantsFromSubscriptions } from '../../src/access/policy.js';
import {
  authenticatedUser,
  json,
  reconcileBillingForUser,
  supabaseAdmin,
} from '../lib/billing.js';
import { stripeDeploymentSafety } from '../lib/billingConfiguration.js';

export default async (request, context) => {
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' });
  try {
    const user = await authenticatedUser(request);
    if (!user) return json(401, { error: 'Unauthorized' });

    const reconcileRequested = new URL(request.url).searchParams.get('reconcile') === '1';
    let reconciliation = reconcileRequested ? 'failed' : 'not_requested';
    if (
      reconcileRequested &&
      stripeDeploymentSafety(process.env, context?.deploy?.context).safe
    ) {
      try {
        const result = await reconcileBillingForUser(user.id);
        reconciliation = result.reconciled ? 'succeeded' : 'failed';
      } catch (error) {
        // Webhooks remain the normal source of updates. A transient Stripe
        // failure must not turn an otherwise valid local entitlement lookup
        // into a product-wide outage.
        console.warn('entitlements reconciliation', error);
      }
    }

    const rows =
      (await supabaseAdmin(
        `billing_subscriptions?user_id=eq.${encodeURIComponent(user.id)}&select=entitlement,status,current_period_end,cancel_at_period_end&order=updated_at.desc`
      )) ?? [];
    return json(200, {
      user: { id: user.id, email: user.email ?? null },
      entitlements: grantsFromSubscriptions(rows),
      subscriptions: rows,
      reconciliation,
    });
  } catch (error) {
    console.error('entitlements', error);
    return json(500, { error: 'Could not load access.' });
  }
};
