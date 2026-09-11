import { SCENES } from './index.js';
import { MODEL_PROFILES, modelProfileForScene } from './modelProfiles.js';
import { ASSET_MANIFEST } from './assetManifest.js';
import { DEV_ASSETS } from './devAssets.js';

/**
 * Who to credit for the geometry a scene is drawing, resolved from the records
 * that already hold it.
 *
 * The selection card used to end with a literal link to one GitHub repository.
 * That was correct for the brain and for nothing else — and the panel is built
 * for **any** scene that answers `getAnatomySelection()`, so the heart atlas,
 * whose geometry is a HuBMAP CCF release under CC BY 4.0, was crediting the
 * Brain Project. An attribution obligation discharged against the wrong work is
 * not discharged.
 *
 * Nothing new is declared here. `modelProfiles.js` already says which assets a
 * scene rests on, `assetManifest.js` already holds source, licence and the
 * record that satisfies each obligation, and `devAssets.js` holds the same for
 * a file still under examination. This reads them, so the credit on screen
 * cannot drift from the licence assessment that was actually made.
 *
 * **A candidate is not a released asset**, and the difference is visible: it is
 * returned with `released: false` and the note the record carries, so the panel
 * can say the file is under examination rather than implying a decision that
 * the release gate has not made.
 */

/**
 * @typedef {object} SceneAttribution
 * @property {string} assetId
 * @property {boolean} released whether it has an entry in the released manifest
 * @property {string} sourceName the work being credited
 * @property {string|null} sourceUrl where that work lives
 * @property {string|null} licenseName SPDX id, when one has been assessed
 * @property {string|null} licenseUrl
 * @property {string|null} credit the attribution line the licence asks for
 * @property {string|null} record the file that discharges the obligation, as a
 *   repository path — that is what the manifest records and what a reader of
 *   the repository needs
 * @property {string|null} recordUrl the same file as the site serves it, for a
 *   link. Not the same string: `public/` is Vite's public directory and its
 *   contents are served from the root, so the repository path 404s as an href.
 * @property {string|null} note what remains undecided, for a candidate
 */

/** @returns {SceneAttribution[]} one per asset the scene rests on; `[]` if none. */
export function attributionForScene(
  sceneId,
  {
    scenes = SCENES,
    profiles = MODEL_PROFILES,
    assets = ASSET_MANIFEST,
    candidates = DEV_ASSETS,
    base = import.meta.env?.BASE_URL ?? './',
  } = {}
) {
  const scene = scenes.find((entry) => entry.id === sceneId || entry.slug === sceneId);
  const profile = scene ? modelProfileForScene(scene, profiles) : null;
  if (!profile) return [];

  const out = [];
  for (const assetId of profile.assets ?? []) {
    const asset = assets.find((entry) => entry.assetId === assetId);
    if (!asset) continue;
    const attribution = asset.license?.obligations?.find((item) => item.kind === 'attribution');
    out.push({
      assetId,
      released: true,
      sourceName: asset.source?.name ?? assetId,
      sourceUrl: asset.source?.url ?? null,
      licenseName: asset.license?.spdx ?? null,
      licenseUrl: asset.license?.url ?? null,
      credit: asset.license?.attribution ?? null,
      // What the obligation is discharged by, rather than the upstream page:
      // the licence asks us to carry the credit, so the link goes to the file
      // that carries it.
      record: attribution?.satisfiedBy ?? asset.license?.decisionRecord ?? null,
      recordUrl: servedUrl(attribution?.satisfiedBy ?? asset.license?.decisionRecord ?? null, base),
      note: null,
    });
  }

  for (const assetId of profile.candidateAssets ?? []) {
    const candidate = candidates.find((entry) => entry.id === assetId);
    if (!candidate) continue;
    out.push({
      assetId,
      released: false,
      sourceName: candidate.url ?? assetId,
      sourceUrl: candidate.url ?? null,
      // A candidate has been read, not assessed. Naming an SPDX id here would
      // claim a licence decision the release gate has not made.
      licenseName: null,
      licenseUrl: null,
      credit: null,
      record: null,
      recordUrl: null,
      note: candidate.note ?? null,
    });
  }

  return out;
}

/**
 * A repository path as the site serves it.
 *
 * `public/assets/brain/ATTRIBUTION.md` is where the file is in the repository
 * and what the manifest records, and it is **not** a URL: Vite serves the
 * contents of `public/` from the root, so using the recorded path as an href
 * asks for `/public/assets/...` and gets a 404. A credit link that 404s does
 * not discharge an attribution obligation, so the mapping happens here rather
 * than being remembered at each call site.
 */
function servedUrl(repoPath, base) {
  if (!repoPath) return null;
  if (/^https?:\/\//.test(repoPath)) return repoPath;
  if (!repoPath.startsWith('public/')) return null;
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${repoPath.slice('public/'.length)}`;
}
