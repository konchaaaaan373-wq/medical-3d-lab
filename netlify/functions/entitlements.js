import { grantsFromSubscriptions } from '../../src/access/policy.js';
import {
  authenticatedUser,
  json,
  reconcileBillingForUser,
  stripeModeFilter,
  supabaseAdmin,
} from '../lib/billing.js';
import { billingStripeMode, stripeDeploymentSafety } from '../lib/billingConfiguration.js';

export const config = {
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};

export default async (request, context) => {
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' });
  try {
    const user = await authenticatedUser(request);
    if (!user) return json(401, { error: 'Unauthorized' });
    const mode = billingStripeMode(process.env);

    const reconcileRequested = new URL(request.url).searchParams.get('reconcile') === '1';
    let reconciliation = reconcileRequested ? 'failed' : 'not_requested';
    if (
      reconcileRequested &&
      stripeDeploymentSafety(process.env, context?.deploy?.context).safe
    ) {
      try {
        const result = await reconcileBillingForUser(user.id, { mode });
        reconciliation = result.reconciled ? 'succeeded' : 'failed';
      } catch (error) {
        // Webhooks remain the normal source of updates. A transient Stripe
        // failure must not turn an otherwise valid local entitlement lookup
        // into a product-wide outage.
        console.warn('entitlements reconciliation failed', { code: error?.code ?? 'unknown' });
      }
    }

    const rows =
      (await supabaseAdmin(
        `billing_subscriptions?user_id=eq.${encodeURIComponent(user.id)}&${stripeModeFilter(mode)}&select=entitlement,status,current_period_end,cancel_at_period_end,payment_failed_at,grace_until,access_suspended_reason,full_refund_at,dispute_opened_at&order=updated_at.desc`
      )) ?? [];
    return json(200, {
      user: { id: user.id, email: user.email ?? null },
      entitlements: grantsFromSubscriptions(rows),
      subscriptions: rows,
      reconciliation,
    });
  } catch (error) {
    console.error('entitlements failed', { code: error?.code ?? 'unknown' });
    return json(500, { error: 'Could not load access.' });
  }
};
