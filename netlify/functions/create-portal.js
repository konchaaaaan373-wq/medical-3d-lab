import { authenticatedUser, billingCustomerFor, json, stripePost } from '../lib/billing.js';

export default async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });
  try {
    const user = await authenticatedUser(request);
    if (!user) return json(401, { error: 'Please sign in first.' });
    const customer = await billingCustomerFor(user);
    const origin = new URL(request.url).origin;
    const session = await stripePost('billing_portal/sessions', {
      customer,
      return_url: origin,
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
