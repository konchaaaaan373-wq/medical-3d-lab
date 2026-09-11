/**
 * Project an explicit release/development scene subset onto the UI-shaped scene
 * registry without changing its order or widening the set. Unknown ids are
 * ignored rather than invented; duplicates in the request never duplicate rows.
 */
export function projectSceneSubsetForNavigation(requestedScenes = [], uiScenes = []) {
  const allowedIds = new Set(requestedScenes.map((scene) => scene?.id).filter(Boolean));
  return uiScenes.filter((scene) => allowedIds.has(scene.id));
}

/**
 * Project one explicit scene list into organ-first navigation without creating
 * a second catalogue. Scene order stays exactly as registered.
 */
export function scenesByOrganForNavigation(scenes = [], organForId = () => null) {
  const groups = [];
  const byId = new Map();

  for (const scene of scenes) {
    const organId = scene?.organ ?? 'unfiled';
    let group = byId.get(organId);
    if (!group) {
      const organ = organForId(organId);
      group = {
        id: organId,
        label: organ?.label ?? organId,
        labelJa: organ?.labelJa ?? organId,
        foundation: [],
        pathophysiology: [],
      };
      byId.set(organId, group);
      groups.push(group);
    }

    if (scene?.disease) group.pathophysiology.push(scene);
    else group.foundation.push(scene);
  }

  return groups.map((group) => ({
    ...group,
    hasBothKinds: group.foundation.length > 0 && group.pathophysiology.length > 0,
  }));
}

/**
 * A compact location label for the fixed header, derived only from catalogue
 * metadata. Formal titles stay in the model title card and chooser rows.
 *
 * Anatomy-tagged scenes get the compact, stable word "Anatomy / 解剖". Other
 * scenes prefer their authored short story title when one exists, then fall
 * back to the formal catalogue title. Nothing is guessed from an id/slug.
 */
export function compactSceneLabel(scene = {}) {
  const tags = Array.isArray(scene.tags) ? scene.tags : [];
  if (tags.includes('anatomy')) return { en: 'Anatomy', ja: '解剖' };
  return {
    en: scene.storyTitleEn || scene.label || scene.titleEn || '',
    ja: scene.storyTitleJa || scene.labelJa || scene.titleJa || '',
  };
}
