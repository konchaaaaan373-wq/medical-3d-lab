import registry from '../../docs/model-cards/revisions.json' with { type: 'json' };

/**
 * The catalogue's read side of the model-card revision registry.
 *
 * `scripts/model-revisions.js` owns the *rule*: each entry declares the sources
 * a model card describes and a digest of them, and `npm run revisions:check`
 * (plus `tests/model-revisions.test.js`) recomputes that digest from the files
 * and fails when a model changed without its card being revised.
 *
 * This module is the other half: it lets code that runs in a browser — the
 * release gate — read which revision of a scene is currently on file, without
 * `node:fs` and without a second copy of the registry. Vite inlines the JSON,
 * `node --test` reads it directly, and there is still exactly one file that
 * says what revision a scene is at.
 *
 * ## What a revision covers, and what it deliberately does not
 *
 * `modelSources` is the small set of files that decide what the model *is*:
 * for the brain atlas, the part correspondence (which mesh is which named
 * structure, in both languages) and the selection behaviour built on it. It is
 * not the docs, not the landing copy, not the stylesheet. A wording fix
 * somewhere else in the repository must not invalidate anything here, and a
 * change to what a structure is called must.
 *
 * The digest is scoped per scene for the same reason: changing the brain's part
 * mapping has nothing to say about the COPD model, and a registry-wide digest
 * would have expired every record at once.
 */

export const MODEL_REVISIONS = Object.freeze(
  registry.map((entry) => Object.freeze({ ...entry, modelSources: Object.freeze([...entry.modelSources]) }))
);

const BY_SCENE = new Map(MODEL_REVISIONS.map((entry) => [entry.sceneId, entry]));

/** @param {string | {id:string} | null} scene */
export function modelRevisionForScene(scene) {
  const id = typeof scene === 'string' ? scene : scene?.id;
  return BY_SCENE.get(id) ?? null;
}

/**
 * The revision a record can be pinned to: the card revision and the digest of
 * the sources it describes.
 *
 * Both, not either. The integer is what a person reads and bumps deliberately;
 * the digest is what notices a change nobody bumped it for. Pinning to the
 * integer alone would let an edited model keep an old record until somebody
 * remembered; pinning to the digest alone would make the record unreadable.
 *
 * @param {string | {id:string} | null} scene
 * @returns {{cardRevision:number, modelDigest:string}|null}
 */
export function sceneRevisionPin(scene) {
  const entry = modelRevisionForScene(scene);
  if (!entry) return null;
  return { cardRevision: entry.cardRevision, modelDigest: entry.modelDigest };
}
