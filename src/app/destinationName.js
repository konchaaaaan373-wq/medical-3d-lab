import { organById, sceneBySlug } from '../catalog/index.js';
import { resolveRoute, slugOf } from './router.js';

/**
 * What to call the place a navigation is going, while it is still going there.
 *
 * ## Why a wait needs a name
 *
 * A scene has to have its own document, so opening one is a page load with a
 * multi-megabyte atlas behind it. Measured on the built site, brain → heart is
 * about six seconds. Six seconds is survivable; six seconds of a bar and the
 * word "移動しています" is not, because it answers the wrong question. The
 * reader does not doubt that *something* is loading. They doubt that they
 * pressed the right thing.
 *
 * So the veil says what is opening. The wait is exactly as long either way;
 * only one of them lets the reader spend it confident rather than checking.
 *
 * ## The same words on both sides of the reload
 *
 * This is used twice: by the departing document, to label the veil it raises,
 * and by the arriving document, to label the veil it paints before it has
 * built anything. They have to agree word for word — two different labels
 * across a document boundary is a flicker the reader reads as a false start,
 * and it is the easiest possible thing to get wrong when the two strings live
 * in two files.
 *
 * Organ before scene title: the reader chose "the heart", and
 * `触れて学ぶ心臓の解剖` is the scene's name for itself, not theirs.
 */

const OPENING = {
  /** @param {string} what */
  en: (what) => `Opening ${what}`,
  ja: (what) => `${what}を開いています`,
};

const SURFACE_NAMES = {
  landing: { en: 'the home page', ja: 'ホーム' },
  explorer: { en: 'the model index', ja: 'モデル一覧' },
  lab: { en: 'the experimental models', ja: '実験モデル' },
  trust: { en: 'the publication and review record', ja: '公開状態と医学レビュー' },
};

/**
 * The subject of a route, in one language, or null if it has no useful name.
 *
 * @param {string} hash
 * @param {'en'|'ja'} language
 * @returns {string|null}
 */
export function destinationSubject(hash, language = 'ja') {
  const ja = language !== 'en';
  const route = resolveRoute(hash);

  if (route.kind === 'scene') {
    // `resolveRoute` sends an unknown slug to the default scene, so ask the
    // catalogue about the slug that was actually written. A hash nobody
    // recognises gets no name rather than the wrong one.
    const scene = sceneBySlug(slugOf(hash));
    if (!scene) return null;
    const organ = organById(scene.organ);
    const name = organ ? (ja ? organ.labelJa : organ.label) : (ja ? scene.titleJa : scene.titleEn);
    return ja ? `${name}の3Dモデル` : `the ${String(name).toLowerCase()} model`;
  }

  // Legal documents deliberately have no name here. Their titles live in
  // `src/data/legal.js`, which carries the full text of the terms, the privacy
  // policy and the commercial disclosure and is kept out of the entry chunk on
  // purpose — and they never show a veil anyway, because reaching one is a
  // swap rather than a document load.
  if (route.kind === 'legal') return null;

  const named = SURFACE_NAMES[route.kind];
  return named ? (ja ? named.ja : named.en) : null;
}

/**
 * The full sentence a loading veil shows, or null to keep the generic wording.
 *
 * @param {string} hash
 * @param {'en'|'ja'} language
 * @param {{open?: boolean}} [options] `open: false` when the release gate holds
 *   this route closed, so the sentence does not promise a model.
 * @returns {string|null}
 */
export function openingMessage(hash, language = 'ja', { open = true } = {}) {
  const subject = destinationSubject(hash, language);
  if (!subject) return null;
  const ja = language !== 'en';
  // A model the release has not opened does not open: the reader gets the "in
  // development" page. Saying "opening the lungs model" for four seconds and
  // then showing something else is the mislabelled link this change set out to
  // remove, with a delay on it.
  if (!open) return ja ? `${subject}（準備中）` : `${subject} — in development`;
  return OPENING[ja ? 'ja' : 'en'](subject);
}
