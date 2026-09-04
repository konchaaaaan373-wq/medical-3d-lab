import { educationGuideFor } from '../../src/data/educationGuides.js';
import { patientGuideFor } from '../../src/data/patientGuides.js';
import { featuresForScene } from '../../src/access/features.js';
import { grantsFromSubscriptions } from '../../src/access/policy.js';
import {
  authenticatedUser,
  json,
  stripeModeFilter,
  supabaseAdmin,
} from '../lib/billing.js';
import { billingStripeMode } from '../lib/billingConfiguration.js';

export const config = {
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};

const CONTENT = Object.freeze({
  patient: Object.freeze({ entitlement: 'patient', load: patientGuideFor }),
  education: Object.freeze({ entitlement: 'education', load: educationGuideFor }),
});

export function entitledGuide({ sceneId, type, subscriptions, features = featuresForScene(sceneId) }) {
  const content = CONTENT[type];
  if (!content || features?.[type] !== true) return { allowed: false, reason: 'not_found' };
  if (!grantsFromSubscriptions(subscriptions).includes(content.entitlement)) {
    return { allowed: false, reason: 'forbidden' };
  }
  const guide = content.load(sceneId);
  return guide
    ? { allowed: true, guide }
    : { allowed: false, reason: 'not_found' };
}

export default async (request) => {
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed' });
  try {
    const user = await authenticatedUser(request);
    if (!user) return json(401, { error: 'Unauthorized' });

    const url = new URL(request.url);
    const sceneId = url.searchParams.get('scene') ?? '';
    const type = url.searchParams.get('type') ?? '';
    const features = featuresForScene(sceneId);
    if (!CONTENT[type] || features[type] !== true) return json(404, { error: 'Content not found' });

    const mode = billingStripeMode(process.env);
    const rows =
      (await supabaseAdmin(
        `billing_subscriptions?user_id=eq.${encodeURIComponent(user.id)}&${stripeModeFilter(mode)}&select=entitlement,status,payment_failed_at,grace_until,access_suspended_reason,full_refund_at,dispute_opened_at`
      )) ?? [];
    const result = entitledGuide({ sceneId, type, subscriptions: rows, features });
    if (result.reason === 'forbidden') return json(403, { error: 'Paid access is required' });
    return result.allowed
      ? json(200, { guide: result.guide })
      : json(404, { error: 'Content not found' });
  } catch (error) {
    console.error('paid-content failed', { code: error?.code ?? 'unknown' });
    return json(500, { error: 'Paid content could not be loaded.' });
  }
};
