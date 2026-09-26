/**
 * The public model manifest — the one answer to "what is open right now".
 *
 * Every surface that tells a visitor what this product publishes reads this:
 * the landing page, the Explorer, the hero rotation, the crawlable pages, the
 * count printed in the header. It exists so that none of them re-derives the
 * release rule, and so that the UI work and the catalogue work can proceed from
 * a fixed contract instead of from a shared assumption.
 *
 * ## What it is not
 *
 * It is not a second release rule. `catalog/release.js` decides; this projects
 * that decision into the fields a surface actually needs. A model appears here
 * only because `isSceneReleased` said so, and there is no way to add one from
 * this file.
 *
 * It is not a roadmap either. A model that is being built has no row here — not
 * a row marked "coming soon", not `ready: false`. `PUBLIC_MANIFEST.models` is
 * exactly what a person can open today, and code that wants to know why the
 * heart is missing asks `BETA_CANDIDATE_STATUS` in `release.js`, which answers
 * with reasons rather than with a placeholder.
 *
 * Pure data derived from pure data: no DOM, no `three`, no filesystem.
 */
import { EXPLORER_ROUTE, SCENES, sceneRoute } from './index.js';
import { modelCardForScene } from './clinicalReview.js';
import { MECHANISM_LEVEL, modelProfileForScene } from './modelProfiles.js';
import { RELEASE_CHANNEL, RELEASED_SCENES } from './release.js';
import { organById } from './taxonomy.js';

/** Breaking changes to the row shape below. Consumers may pin on this. */
export const PUBLIC_MANIFEST_SCHEMA_VERSION = 1;

/** Where the model-information surface lives. One route, not one per model. */
export const MODEL_INFO_ROUTE = '#/trust';

/**
 * The link-preview image built for a model, or null.
 *
 * Named `posterKind: 'link-preview-card'` rather than `poster` on purpose: what
 * exists today is the 1200x630 card `npm run cards` renders from the
 * catalogue's own text, which is a typographic card, **not** a render of the
 * model's geometry. A surface that presented it as "a picture of the model"
 * would be showing a caption and calling it an organ. When a render-derived
 * poster exists, it goes here as a second kind and the surfaces can tell them
 * apart without guessing from the path.
 */
const posterPathFor = (scene) => `social/${scene.slug}.png`;

/** A stable, order-independent digest of what the manifest says. */
function revisionOf(models) {
  const canonical = models
    .map((model) => `${model.sceneId}|${model.organId}|${model.route}|${model.posterPath ?? ''}`)
    .sort()
    .join('\n');
  // FNV-1a, 32-bit. Not a security hash: it exists so a consumer can tell "the
  // published set changed" from "the page was rebuilt", in a browser, with no
  // dependency.
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * The product's layers, as a reader sees them in navigation.
 *
 * CLAUDE.md defines the product as two layers — anatomy, and what sits on it —
 * and the beta publishes a mechanism scene beside the anatomy of the same
 * organ. A header that listed `脳 / 触れて学ぶ心臓の解剖 / 心拍出量 / 肺 / 肝臓`
 * in one row put organs and models on the same level, because nothing told it
 * which was which. This does: organ first, then the layer within it.
 *
 * `mechanism` and `pathology` are separate on purpose. A scene that explains
 * how a normal organ works (cardiac output) is not a disease model, and calling
 * it 病態 would be the navigation making a claim the model profile does not.
 */
export const MODEL_LAYERS = Object.freeze({
  anatomy: Object.freeze({ id: 'anatomy', en: 'Anatomy', ja: '解剖' }),
  mechanism: Object.freeze({ id: 'mechanism', en: 'Mechanism', ja: '機序' }),
  pathology: Object.freeze({ id: 'pathology', en: 'Disease', ja: '病態' }),
});

/**
 * Which layer a scene belongs to, read from what it claims.
 *
 * A disease scene is pathology. Otherwise the model profile's mechanism level
 * decides: `none` is the anatomy claim, and anything above it explains a
 * mechanism. A scene with no profile falls to anatomy — the lowest claim, which
 * is the direction the provenance contract says an unclear case goes. The
 * release gate refuses to open such a scene anyway.
 *
 * @param {object} scene
 * @returns {'anatomy'|'mechanism'|'pathology'}
 */
export function layerOfScene(scene) {
  if (scene?.disease) return 'pathology';
  const level = modelProfileForScene(scene)?.mechanismLevel;
  return !level || level === MECHANISM_LEVEL.NONE ? 'anatomy' : 'mechanism';
}

/**
 * @typedef {object} PublicModel
 * @property {string} sceneId       catalogue id, stable, appears in the URL
 * @property {string} organId       the organ it is filed under
 * @property {string} organLabel    the organ's English name, from the taxonomy
 * @property {string} organLabelJa  the organ's Japanese name, from the taxonomy
 * @property {string} titleJa       the model's Japanese name
 * @property {string} titleEn       the model's English name
 * @property {'anatomy'|'mechanism'|'pathology'} layer  which product layer it
 *   belongs to — see `MODEL_LAYERS`
 * @property {string} route         where a link must actually go: `#/<slug>`
 * @property {string|null} posterPath  build-relative link-preview image
 * @property {'link-preview-card'} posterKind  what that image actually is
 * @property {string} modelInfoRoute   in-app route for **this model's** sources
 *   and review state. It carries `?model=<slug>`, which opens that model's own
 *   record rather than the top of a page with seventy on it. It used to be the
 *   bare route for every model, which is how a link labelled "model
 *   information", followed from a model, arrived somewhere that said nothing
 *   about it.
 * @property {string|null} modelCard   repository-relative model card, if one exists
 */

/** @param {object} scene */
const rowFor = (scene) => {
  const organ = organById(scene.organ);
  return Object.freeze({
    sceneId: scene.id,
    organId: scene.organ,
    // Both languages, because every surface that shows one shows the other:
    // the row carried only the Japanese name, so a bilingual control built
    // from the manifest rendered an empty English span and the page silently
    // lost half its labels at the `lang-en` breakpoint.
    organLabel: organ?.label ?? scene.organ,
    organLabelJa: organ?.labelJa ?? scene.organ,
    titleJa: scene.titleJa,
    titleEn: scene.titleEn,
    layer: layerOfScene(scene),
    route: sceneRoute(scene),
    posterPath: posterPathFor(scene),
    posterKind: 'link-preview-card',
    modelInfoRoute: `${MODEL_INFO_ROUTE}?model=${scene.slug}`,
    modelCard: modelCardForScene(scene) ?? scene.modelCard ?? null,
  });
};

/** @type {ReadonlyArray<PublicModel>} */
export const PUBLIC_MODELS = Object.freeze(RELEASED_SCENES.map(rowFor));

/** The organs that have at least one open model, in catalogue order. */
export const PUBLIC_ORGANS = Object.freeze([...new Set(PUBLIC_MODELS.map((model) => model.organId))]);

/**
 * The manifest, as one object a consumer can hold.
 *
 * `count` is here rather than being left to `models.length` because more than
 * one surface prints it and the build checks it: a header saying "5 open
 * models" over one card is the failure this field exists to make testable.
 */
export const PUBLIC_MANIFEST = Object.freeze({
  schemaVersion: PUBLIC_MANIFEST_SCHEMA_VERSION,
  revision: revisionOf(PUBLIC_MODELS),
  channel: RELEASE_CHANNEL,
  models: PUBLIC_MODELS,
  organs: PUBLIC_ORGANS,
  count: PUBLIC_MODELS.length,
});

/**
 * Where "show me a model that is open" has to go, and what to call it.
 *
 * The Explorer is the natural answer and is the wrong one while the release
 * opens a single model: a list of one is a page whose only job is to be passed
 * through, and a visitor who has just been told "not this one, but something
 * is" should arrive at the something. So one open model links straight to it,
 * named by its organ; two or more and the choice is real, so it goes to the
 * Explorer.
 *
 * Derived, never written down. The day `heart-anatomy` opens, this becomes the
 * Explorer on its own and no surface is edited — which is the point, because
 * the surface that used to answer this question did it by naming the brain and
 * the heart in a sentence, and the sentence was wrong for as long as only one
 * of them was open.
 *
 * @param {typeof PUBLIC_MANIFEST} [manifest]
 * @returns {{route:string, en:string, ja:string}}
 */
export function openModelDestination(manifest = PUBLIC_MANIFEST) {
  const [only] = manifest.models;
  if (manifest.count !== 1 || !only) {
    return { route: EXPLORER_ROUTE, en: 'See the models that are open', ja: '公開中のモデルを見る' };
  }
  const organ = organById(only.organId);
  return {
    route: only.route,
    en: `Open the 3D ${(organ?.label ?? only.titleEn).toLowerCase()} model`,
    ja: `${organ?.labelJa ?? only.titleJa}の3Dモデルを見る`,
  };
}

/** @param {string} sceneId */
export const publicModelById = (sceneId) =>
  PUBLIC_MODELS.find((model) => model.sceneId === sceneId) ?? null;

/** @param {string} organId */
export const publicModelsForOrgan = (organId) =>
  PUBLIC_MODELS.filter((model) => model.organId === organId);

/** Whether an organ has anything a visitor can open. The honest test for "show the heart". */
export const organIsPublished = (organId) => PUBLIC_MODELS.some((model) => model.organId === organId);

/**
 * Everything structurally wrong with the manifest, as readable lines.
 *
 * The one rule worth stating separately: a row here must be a scene the
 * catalogue still has and the release still opens. Returned rather than thrown
 * so `tests/public-manifest.test.js` and a build check can share it.
 *
 * @param {{fileExists?: (path:string) => boolean}} [options]
 * @returns {string[]}
 */
export function publicManifestProblems({ fileExists } = {}) {
  const problems = [];
  const openIds = new Set(RELEASED_SCENES.map((scene) => scene.id));

  for (const model of PUBLIC_MODELS) {
    const where = `public model "${model.sceneId}"`;
    const scene = SCENES.find((entry) => entry.id === model.sceneId);
    if (!scene) {
      problems.push(`${where}: not in the catalogue`);
      continue;
    }
    if (!openIds.has(model.sceneId)) problems.push(`${where}: the release does not open it`);
    if (model.route !== sceneRoute(scene)) problems.push(`${where}: route "${model.route}" is not where the scene lives`);
    if (!model.titleJa?.trim()) problems.push(`${where}: no Japanese name`);
    if (!organById(model.organId)) problems.push(`${where}: unknown organ "${model.organId}"`);
    if (model.posterPath && fileExists && !fileExists(`public/${model.posterPath}`)) {
      problems.push(`${where}: poster "${model.posterPath}" does not exist`);
    }
  }

  for (const scene of RELEASED_SCENES) {
    if (!PUBLIC_MODELS.some((model) => model.sceneId === scene.id)) {
      problems.push(`scene "${scene.id}" is open but is missing from the public manifest`);
    }
  }

  if (PUBLIC_MANIFEST.count !== PUBLIC_MODELS.length) {
    problems.push(`the manifest counts ${PUBLIC_MANIFEST.count} models and lists ${PUBLIC_MODELS.length}`);
  }
  return problems;
}
