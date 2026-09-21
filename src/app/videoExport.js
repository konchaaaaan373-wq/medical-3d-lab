/**
 * Who may take a video file out of the app, and what has to be agreed before
 * the file is written.
 *
 * A downloaded video leaves every surface this product controls. The scope
 * panel, the disclaimer under the console, the model card and the badge all
 * stay behind; what travels is a moving picture of a disease that somebody can
 * put in a slide deck, a lecture, or a post, with no way back to what it
 * claims. So the export is two decisions rather than one:
 *
 *   1. **Whether this scene may be exported at all** — a release question,
 *      answered here from records that already exist (the model profile, the
 *      asset manifest's licence assessment, the candidate list). No new
 *      permission is declared: a file whose redistribution is not allowed does
 *      not become allowed because a reader pressed a button.
 *   2. **What the reader agrees to before the file is written** — the terms,
 *      assembled from the same records, so what the consent screen says can
 *      never drift from the profile's declared uses.
 *
 * Pure: no DOM, no `three`, no timers. The copy for each clause lives in
 * `src/data/videoExport.js` and is keyed by the ids returned here; this module
 * holds no sentences, and the data holds no rules.
 *
 * ### Why anatomy is not exportable
 *
 * The β publishes anatomy scenes and nothing else. Anatomy makes no mechanism
 * claim — `mechanismLevel: 'none'` — and an atlas has no animation to record:
 * a "video" of it is a slow orbit, which is a screen recording, not a model
 * output. Keeping the offer to scenes with a mechanism therefore does two
 * jobs at once: it matches what the reader asked for (animated disease
 * models) and it keeps a download surface out of the public build, where the
 * atlas geometry's licence obligations would need a separate answer.
 */
import { SCENES } from '../catalog/index.js';
import { MECHANISM_LEVEL, MODEL_PROFILES, modelProfileForScene } from '../catalog/modelProfiles.js';
import { ASSET_MANIFEST, assetReleaseProblems } from '../catalog/assetManifest.js';
import { DEV_ASSETS } from '../catalog/devAssets.js';
import { attributionForScene } from '../catalog/attribution.js';

/**
 * The terms the consent screen states, as a date.
 *
 * It is part of the agreement, not decoration: a reader agreed to *these*
 * sentences. Changing what the clauses say means changing this, and a record
 * of an older agreement is not a record of the current one.
 */
export const VIDEO_TERMS_VERSION = '2026-09-21';

/**
 * The clauses a reader ticks. Ids only — the sentences are in
 * `src/data/videoExport.js`, and `tests/video-export.test.js` holds every id
 * here to a sentence there in both languages.
 */
export const VIDEO_CLAUSE = Object.freeze({
  /** The file is a model, not a recording of a patient. */
  MODEL_NOT_PATIENT: 'model-not-patient',
  /** What the profile forbids the model being used for, downloaded or not. */
  PROHIBITED_USES: 'prohibited-uses',
  /** The caption burnt into the frame says what the model is; it stays on. */
  KEEP_THE_CAPTION: 'keep-the-caption',
  /** A licence obligation the geometry carries, when the scene rests on an asset. */
  CARRY_THE_CREDIT: 'carry-the-credit',
});

/**
 * Why this scene does not offer a video file. Empty means it does.
 *
 * `animated` is the caller's to answer: whether a scene module supplies a
 * sequence is a property of the scene class, which this module must not
 * import (it would pull `three` into something a `node --test` run checks).
 * The app passes `Boolean(scene.getReel)`.
 *
 * @param {string} sceneRef a scene id or slug
 * @param {object} [options]
 * @returns {string[]} one sentence per reason, for a test message or a log
 */
export function videoExportProblems(
  sceneRef,
  { animated = false, scenes = SCENES, profiles = MODEL_PROFILES, assets = ASSET_MANIFEST, candidates = DEV_ASSETS } = {}
) {
  const scene = findScene(sceneRef, scenes);
  if (!scene) return [`no scene named "${sceneRef}"`];

  const problems = [];
  if (!animated) problems.push(`"${scene.id}" has no animated sequence to record`);

  const profile = modelProfileForScene(scene, profiles);
  if (!profile) {
    problems.push(`"${scene.id}" declares no model profile, so nothing says what a file taken from it may claim`);
    return problems;
  }

  if (profile.mechanismLevel === MECHANISM_LEVEL.NONE) {
    problems.push(
      `"${scene.id}" makes no mechanism claim (${MECHANISM_LEVEL.NONE}): an atlas has structure to look at, not motion to export`
    );
  }

  // A video is a redistribution of whatever geometry is in frame. The licence
  // assessment that already gates the asset answers that; nothing new is
  // decided here.
  for (const assetId of profile.assets ?? []) {
    const asset = assets.find((entry) => entry.assetId === assetId);
    if (!asset) {
      problems.push(`asset "${assetId}" is referenced by "${scene.id}" but is not in the manifest`);
      continue;
    }
    problems.push(...assetReleaseProblems(asset, { sceneStatus: scene.status }));
  }

  for (const assetId of profile.candidateAssets ?? []) {
    const candidate = candidates.find((entry) => entry.id === assetId);
    if (!candidate) continue;
    problems.push(`asset "${assetId}" is still under examination, so a file containing it may not be handed out`);
  }

  return problems;
}

/** Whether the download may be offered at all. */
export const videoExportOffered = (sceneRef, options) => videoExportProblems(sceneRef, options).length === 0;

/**
 * @typedef {object} VideoConsentClause
 * @property {string} id one of `VIDEO_CLAUSE`
 * @property {string[]} details ids or lines the copy interpolates; may be empty
 */

/**
 * What the reader is asked to agree to, for this scene.
 *
 * Assembled rather than written: the prohibited uses come from the profile and
 * the credits from the asset manifest, so a scene that adds a prohibited use
 * or an attributed asset changes its consent screen without anybody
 * remembering to.
 *
 * @returns {{ sceneId: string, slug: string, termsVersion: string,
 *   clauses: VideoConsentClause[], attributions: object[] }}
 */
export function videoConsentTerms(
  sceneRef,
  { scenes = SCENES, profiles = MODEL_PROFILES, assets = ASSET_MANIFEST, candidates = DEV_ASSETS, base } = {}
) {
  const scene = findScene(sceneRef, scenes);
  if (!scene) throw new Error(`videoConsentTerms: no scene named "${sceneRef}"`);
  const profile = modelProfileForScene(scene, profiles);
  if (!profile) throw new Error(`videoConsentTerms: "${scene.id}" declares no model profile`);

  const attributions = attributionForScene(scene.id, { scenes, profiles, assets, candidates, ...(base ? { base } : {}) })
    .filter((entry) => entry.released && entry.credit);

  const prohibited = [...(profile.prohibitedUses ?? [])];
  const clauses = [
    { id: VIDEO_CLAUSE.MODEL_NOT_PATIENT, details: [] },
    // Only where there is something to name. Schema 1 requires every profile
    // to prohibit at least diagnosis, treatment selection and dose selection,
    // so this is defensive — but a clause reading "It stays outside ." is a
    // clause that teaches a reader to tick without reading.
    ...(prohibited.length ? [{ id: VIDEO_CLAUSE.PROHIBITED_USES, details: prohibited }] : []),
    { id: VIDEO_CLAUSE.KEEP_THE_CAPTION, details: [] },
  ];
  if (attributions.length) {
    clauses.push({
      id: VIDEO_CLAUSE.CARRY_THE_CREDIT,
      details: attributions.map((entry) => entry.credit),
    });
  }

  return {
    sceneId: scene.id,
    slug: scene.slug,
    termsVersion: VIDEO_TERMS_VERSION,
    clauses,
    attributions,
  };
}

/**
 * The clauses that have not been agreed to yet.
 *
 * Every clause is required — a partial agreement is not one — so this is a set
 * difference rather than a policy. It exists so the dialog and its test ask the
 * same question, and so "agree" cannot be enabled by a rule written twice.
 *
 * @param {{ clauses: VideoConsentClause[] }} terms
 * @param {Iterable<string>} acknowledged clause ids the reader has ticked
 * @returns {string[]}
 */
export function consentMissing(terms, acknowledged = []) {
  const ticked = new Set(acknowledged);
  return (terms?.clauses ?? []).map((clause) => clause.id).filter((id) => !ticked.has(id));
}

/** Whether every clause has been agreed to. */
export const consentComplete = (terms, acknowledged) => consentMissing(terms, acknowledged).length === 0;

/**
 * The name the file is saved under.
 *
 * Carries the scene and the frame shape because a folder of downloads is the
 * one place where the app cannot label anything: a file called `video.webm` is
 * an unidentified clip of a disease model within a day.
 *
 * @param {{ slug: string, formatId?: string, extension?: string, date?: Date }} parts
 */
export function videoFileName({ slug, formatId = 'reel', extension = 'webm', date = new Date() }) {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  const safe = (value) => String(value).replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return `${safe(slug)}_${safe(formatId)}_${stamp}.${safe(extension)}`;
}

function findScene(sceneRef, scenes) {
  return scenes.find((entry) => entry.id === sceneRef || entry.slug === sceneRef) ?? null;
}
