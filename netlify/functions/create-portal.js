import { authenticatedUser, billingCustomerFor, json, safeHash, stripePost } from '../lib/billing.js';
import { billingPortalConfiguration } from '../lib/billingConfiguration.js';

export default async (request, context) => {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!billingPortalConfiguration(process.env, context?.deploy?.context).configured) {
    return json(503, { error: 'Billing portal is not configured safely on this deployment.' });
  }
  try {
    const user = await authenticatedUser(request);
    if (!user) return json(401, { error: 'Please sign in first.' });
    const body = await request.json().catch(() => ({}));
    const customer = await billingCustomerFor(user);
    const origin = new URL(request.url).origin;
    const returnHash = safeHash(body.returnHash);
    const session = await stripePost('billing_portal/sessions', {
      customer,
      return_url: `${origin}/?billing=portal${returnHash}`,
    });
    return json(200, { url: session.url });
  } catch (error) {
    console.error('create-portal', error);
    const message = /Missing server configuration/.test(error.message)
      ? 'Billing portal is not configured on this deployment yet.'
      : error.message || 'Billing portal could not be opened.';
    return json(500, { error: message });
  }
};
