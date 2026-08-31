import { authenticatedFetch } from './auth.js';

const keyFor = (sceneId, moduleId) => `${sceneId}::${moduleId}`;

const normalise = (row) => ({
  sceneId: row?.scene_id ?? row?.sceneId ?? null,
  moduleId: row?.module_id ?? row?.moduleId ?? null,
  stepIndex: Number.isInteger(row?.step_index) ? row.step_index : Number(row?.stepIndex ?? 0) || 0,
  completed: Boolean(row?.completed),
  startedAt: row?.started_at ?? row?.startedAt ?? null,
  updatedAt: row?.updated_at ?? row?.updatedAt ?? null,
});

/**
 * Small optimistic client cache for paid education progress.
 *
 * Progress is convenience state, not entitlement state. A failed save must never
 * lock or interrupt a lesson that the server has already authorised.
 */
export function createEducationProgressStore() {
  const entries = new Map();
  let loadedUserId = null;
  let loading = null;

  return {
    async load(userId) {
      if (!userId) {
        entries.clear();
        loadedUserId = null;
        loading = null;
        return [];
      }
      if (loadedUserId === userId && !loading) return [...entries.values()];
      if (loading && loadedUserId === userId) return loading;

      // Account boundaries are stronger than cache reuse. Do not show one
      // learner's optimistic/local progress while another user's fetch is in flight.
      if (loadedUserId !== userId) entries.clear();
      loadedUserId = userId;
      loading = (async () => {
        try {
          const response = await authenticatedFetch('/.netlify/functions/education-progress');
          const data = await response.json().catch(() => ({}));
          if (!response.ok) return [...entries.values()];
          entries.clear();
          for (const row of data.progress ?? []) {
            const progress = normalise(row);
            if (progress.sceneId && progress.moduleId) {
              entries.set(keyFor(progress.sceneId, progress.moduleId), progress);
            }
          }
          return [...entries.values()];
        } catch {
          return [...entries.values()];
        } finally {
          loading = null;
        }
      })();
      return loading;
    },

    clear() {
      entries.clear();
      loadedUserId = null;
      loading = null;
    },

    get(sceneId, moduleId) {
      return entries.get(keyFor(sceneId, moduleId)) ?? null;
    },

    all() {
      return [...entries.values()];
    },

    async save({ sceneId, moduleId, stepIndex, completed = false }) {
      if (!sceneId || !moduleId || !Number.isInteger(stepIndex) || stepIndex < 0) return null;
      const previous = entries.get(keyFor(sceneId, moduleId));
      const optimistic = {
        sceneId,
        moduleId,
        stepIndex,
        completed: Boolean(completed),
        startedAt: previous?.startedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      entries.set(keyFor(sceneId, moduleId), optimistic);

      try {
        const response = await authenticatedFetch('/.netlify/functions/education-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sceneId, moduleId, stepIndex, completed }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.progress) return optimistic;
        const confirmed = normalise(data.progress);
        entries.set(keyFor(sceneId, moduleId), confirmed);
        return confirmed;
      } catch {
        return optimistic;
      }
    },
  };
}
