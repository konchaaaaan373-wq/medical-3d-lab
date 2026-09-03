import { billingReconciliationConfiguration } from '../lib/billingConfiguration.js';
import { runBillingReconciliationBatch } from '../lib/billingOperations.js';

export const config = {
  // Avoid the top-of-hour traffic spike while still repairing drift promptly.
  schedule: '17 * * * *',
};

export default async (_request, context) => {
  const configuration = billingReconciliationConfiguration(
    process.env,
    context?.deploy?.context
  );
  if (!configuration.configured) {
    console.warn('scheduled-billing-reconcile skipped', {
      mode: configuration.mode,
      issueCount: configuration.issues.length,
      missingCount: configuration.missing.length,
    });
    return;
  }

  const summary = await runBillingReconciliationBatch();
  console.info('scheduled-billing-reconcile completed', summary);
  if (summary.status !== 'succeeded') {
    throw new Error('Scheduled billing reconciliation completed partially.');
  }
};
