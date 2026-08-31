import { ENTITLEMENT, grantsFromSubscriptions } from '../../src/access/policy.js';
import { authenticatedUser, json, supabaseAdmin } from '../lib/billing.js';

const ID = /^[A-Za-z0-9._~-]{1,80}$/;

async function hasEducationAccess(userId) {
  const rows =
    (await supabaseAdmin(
      `billing_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=entitlement,status&order=updated_at.desc`
    )) ?? [];
  return grantsFromSubscriptions(rows).includes(ENTITLEMENT.EDUCATION);
}

export default async (request) => {
  if (!['GET', 'POST'].includes(request.method)) return json(405, { error: 'Method not allowed' });

  try {
    const user = await authenticatedUser(request);
    if (!user) return json(401, { error: 'Unauthorized' });
    if (!(await hasEducationAccess(user.id))) return json(403, { error: 'Medical education access required.' });

    if (request.method === 'GET') {
      const rows =
        (await supabaseAdmin(
          `education_progress?user_id=eq.${encodeURIComponent(user.id)}&select=scene_id,module_id,step_index,completed,started_at,updated_at&order=updated_at.desc`
        )) ?? [];
      return json(200, { progress: rows });
    }

    const body = await request.json().catch(() => ({}));
    const sceneId = typeof body.sceneId === 'string' ? body.sceneId : '';
    const moduleId = typeof body.moduleId === 'string' ? body.moduleId : '';
    const stepIndex = Number(body.stepIndex);
    const completed = Boolean(body.completed);

    if (!ID.test(sceneId) || !ID.test(moduleId)) return json(400, { error: 'Invalid progress target.' });
    if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex > 10000) {
      return json(400, { error: 'Invalid step index.' });
    }

    const now = new Date().toISOString();
    const rows = await supabaseAdmin('education_progress?on_conflict=user_id,scene_id,module_id', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: [
        {
          user_id: user.id,
          scene_id: sceneId,
          module_id: moduleId,
          step_index: stepIndex,
          completed,
          updated_at: now,
        },
      ],
    });

    const row = rows?.[0] ?? null;
    return json(200, {
      progress: row
        ? {
            scene_id: row.scene_id,
            module_id: row.module_id,
            step_index: row.step_index,
            completed: row.completed,
            started_at: row.started_at,
            updated_at: row.updated_at,
          }
        : null,
    });
  } catch (error) {
    console.error('education-progress', error);
    return json(500, { error: 'Could not save learning progress.' });
  }
};
