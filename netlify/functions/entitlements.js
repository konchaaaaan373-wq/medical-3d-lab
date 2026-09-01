import { grantsFromSubscriptions } from '../../src/access/policy.js';
import { authenticatedUser, json, supabaseAdmin } from '../lib/billing.js';

export default async (request) => {
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' });
  try {
    const user = await authenticatedUser(request);
    if (!user) return json(401, { error: 'Unauthorized' });
    const rows =
      (await supabaseAdmin(
        `billing_subscriptions?user_id=eq.${encodeURIComponent(user.id)}&select=entitlement,status,current_period_end,cancel_at_period_end&order=updated_at.desc`
      )) ?? [];
    return json(200, {
      user: { id: user.id, email: user.email ?? null },
      entitlements: grantsFromSubscriptions(rows),
      subscriptions: rows,
    });
  } catch (error) {
    console.error('entitlements', error);
    return json(500, { error: 'Could not load access.' });
  }
};
