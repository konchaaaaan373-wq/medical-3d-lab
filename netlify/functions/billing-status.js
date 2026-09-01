import { commerceReadiness } from '../../src/access/commerceReadiness.js';
import { json } from '../lib/billing.js';

const REQUIRED = [
  'SUPABASE_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_PATIENT',
  'STRIPE_PRICE_EDUCATION',
  'STRIPE_PRICE_COMPLETE',
];

const hasAny = (...names) => names.some((name) => Boolean(process.env[name]));

export function billingInfrastructureConfigured() {
  return (
    REQUIRED.every((name) => Boolean(process.env[name])) &&
    hasAny('SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY') &&
    hasAny('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY')
  );
}

export default async (request) => {
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' });

  const infrastructureConfigured = billingInfrastructureConfigured();
  const readiness = commerceReadiness();

  // Charging is enabled only when both infrastructure and reviewed professional
  // content are ready. A deployment with valid Stripe secrets but only stale or
  // unversioned clinical review must not look purchase-ready.
  return json(200, {
    billingConfigured: infrastructureConfigured && readiness.any,
    commerceReady: readiness.any,
  });
};
