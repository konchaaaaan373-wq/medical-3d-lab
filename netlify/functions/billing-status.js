import { json } from '../lib/billing.js';

const REQUIRED = [
  'SUPABASE_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_PRICE_PATIENT',
  'STRIPE_PRICE_EDUCATION',
  'STRIPE_PRICE_COMPLETE',
];

const hasAny = (...names) => names.some((name) => Boolean(process.env[name]));

export default async (request) => {
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' });

  const configured =
    REQUIRED.every((name) => Boolean(process.env[name])) &&
    hasAny('SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY') &&
    hasAny('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY');

  // This endpoint deliberately returns only a boolean. It never exposes keys,
  // Price IDs or deployment-specific secret material to the browser.
  return json(200, { billingConfigured: configured });
};
