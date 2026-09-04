import {
  authenticatedUser,
  billingCustomerFor,
  billingIdentityHash,
  json,
  safeHash,
  stripePost,
} from '../lib/billing.js';
import { billingPortalConfiguration, billingStripeMode } from '../lib/billingConfiguration.js';

export const config = {
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};

export default async (request, context) => {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!billingPortalConfiguration(process.env, context?.deploy?.context).configured) {
    return json(503, { error: 'Billing portal is not configured safely on this deployment.' });
  }
  try {
    const user = await authenticatedUser(request);
    if (!user) return json(401, { error: 'Please sign in first.' });
    const body = await request.json().catch(() => ({}));
    const mode = billingStripeMode(process.env);
    const customer = await billingCustomerFor(user, { mode });
    const origin = new URL(request.url).origin;
    const returnHash = safeHash(body.returnHash);
    const session = await stripePost(
      'billing_portal/sessions',
      {
        customer,
        return_url: `${origin}/?billing=portal${returnHash}`,
      },
      {
        idempotencyKey: `medical3dlab:portal:${mode}:${billingIdentityHash(user.id)}:${billingIdentityHash(returnHash)}:${Math.floor(Date.now() / 300_000)}`,
      }
    );
    return json(200, { url: session.url });
  } catch (error) {
    console.error('create-portal failed', { code: error?.code ?? 'unknown' });
    const message = /Missing server configuration/.test(error.message)
      ? 'Billing portal is not configured on this deployment yet.'
      : 'Billing portal could not be opened. Please try again.';
    return json(500, { error: message });
  }
};
