import { json } from '../lib/billing.js';
import { billingOperationsHealth } from '../lib/billingOperations.js';

export const config = {
  path: '/api/billing-health',
  method: 'GET',
  rateLimit: {
    windowLimit: 12,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

export default async (request, context) => {
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' });

  try {
    const health = await billingOperationsHealth({ deployContext: context?.deploy?.context });
    return json(health.status === 'ok' ? 200 : 503, health);
  } catch (error) {
    console.error('billing-operations-health failed', { code: error?.code ?? 'unknown' });
    return json(503, {
      status: 'degraded',
      checks: { configuration: true, healthQuery: false },
    });
  }
};
