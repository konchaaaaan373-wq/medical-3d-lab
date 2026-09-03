import { commerceReadiness } from '../../src/access/commerceReadiness.js';
import { json } from '../lib/billing.js';
import { billingConfiguration } from '../lib/billingConfiguration.js';

export function billingInfrastructureConfigured(deployContext) {
  return billingConfiguration(process.env, deployContext).configured;
}

export default async (request, context) => {
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' });

  const infrastructureConfigured = billingInfrastructureConfigured(context?.deploy?.context);
  const readiness = commerceReadiness();

  // Charging is enabled only when both infrastructure and reviewed professional
  // content are ready. A deployment with valid Stripe secrets but only stale or
  // unversioned clinical review must not look purchase-ready.
  return json(200, {
    billingConfigured: infrastructureConfigured && readiness.any,
    commerceReady: readiness.any,
  });
};
