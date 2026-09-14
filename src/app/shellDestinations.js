/**
 * The product shell's destinations, and their one set of names.
 *
 * Every surface — the landing page, the Explorer, Trust, the legal documents
 * and the fixed header on a 3D model — used to build its own header and invent
 * its own word for the same page. The Explorer alone was called "解剖モデル"
 * on the landing page, "モデル" on Trust and the legal pages, "モデル一覧" in
 * the model drawer and "公開モデル" when the drawer was opened from a Lab
 * scene. Four names for one route is four routes as far as a reader is
 * concerned, and it is why leaving a model felt like a dead end: the way out
 * was there, spelled differently every time and never twice in the same place.
 *
 * So the shell's vocabulary lives here, once, and the surfaces project it.
 * This module is pure — no DOM, no `three`, no `window` — so
 * `tests/shell-navigation.test.js` can hold the vocabulary steady.
 *
 * ## What this is not
 *
 * It is not a route table. `src/app/router.js` decides what a hash resolves to
 * and stays the only place that does; a destination here simply names one of
 * the routes it already resolves.
 *
 * It is not a release rule either. `lab` is listed as a destination always and
 * is *offered* only when the caller says the visitor may see locked work —
 * that answer belongs to `releaseGate.js`, which reads `window`, which is
 * exactly why it is an argument rather than an import.
 */
import { EXPLORER_ROUTE, LAB_ROUTE, LANDING_ROUTE } from '../catalog/index.js';
import { MODEL_INFO_ROUTE } from '../catalog/publicManifest.js';

/**
 * @typedef {object} ShellDestination
 * @property {string} id     stable identifier a surface names itself with
 * @property {string} route  the hash this destination lives at
 * @property {string} en     English label
 * @property {string} ja     Japanese label
 */

/**
 * The four places the shell can send a reader, in the order they are offered.
 *
 * Home first: it is the one every surface must be able to reach, and a reader
 * looking for the way out looks at the start of a list, not the end.
 *
 * "All models / モデル一覧" rather than "Anatomy models / 解剖モデル": the
 * Explorer shows what the current scope opens, which is anatomy today and is
 * not anatomy in the Lab or after the beta. A name that is true in one scope
 * and wrong in the other is the drift this file exists to stop.
 *
 * @type {ReadonlyArray<ShellDestination>}
 */
export const SHELL_DESTINATIONS = Object.freeze([
  Object.freeze({ id: 'home', route: LANDING_ROUTE, en: 'Home', ja: 'ホーム' }),
  Object.freeze({ id: 'models', route: EXPLORER_ROUTE, en: 'All models', ja: 'モデル一覧' }),
  Object.freeze({
    id: 'model-info',
    route: MODEL_INFO_ROUTE,
    en: 'Model information',
    ja: 'モデル情報',
  }),
  Object.freeze({
    id: 'lab',
    route: LAB_ROUTE,
    en: 'Experimental models',
    ja: '実験モデル',
  }),
]);

/** @param {string} id */
export const shellDestination = (id) =>
  SHELL_DESTINATIONS.find((destination) => destination.id === id) ?? null;

/** The destinations that are never offered unless the visitor is unlocked. */
const LOCKED_DESTINATIONS = new Set(['lab']);

/**
 * The shell links one surface offers.
 *
 * A surface never links to itself — a "Home" link on the home page is noise
 * that pushes the links that do go somewhere further away — and it never links
 * to locked work unless the caller says the visitor can open it.
 *
 * `current` takes a destination id (`'home'`, `'models'`, …) or `null` for a
 * surface that is not itself a destination, which is what a 3D model is.
 *
 * @param {{current?: string|null, labUnlocked?: boolean}} [options]
 * @returns {ShellDestination[]}
 */
export function shellNavLinks({ current = null, labUnlocked = false } = {}) {
  return SHELL_DESTINATIONS.filter((destination) => {
    if (destination.id === current) return false;
    if (LOCKED_DESTINATIONS.has(destination.id) && !labUnlocked) return false;
    return true;
  });
}

/**
 * Everything structurally wrong with the vocabulary, as readable lines.
 *
 * Returned rather than thrown so the test and any future build check can share
 * one answer. The rule that matters: one route, one name, and a name a reader
 * can act on in both languages.
 *
 * @returns {string[]}
 */
export function shellDestinationProblems() {
  const problems = [];
  const seenIds = new Set();
  const seenRoutes = new Set();

  for (const destination of SHELL_DESTINATIONS) {
    const where = `shell destination "${destination.id}"`;
    if (seenIds.has(destination.id)) problems.push(`${where}: declared twice`);
    seenIds.add(destination.id);
    if (seenRoutes.has(destination.route)) {
      problems.push(`${where}: route "${destination.route}" already has a name`);
    }
    seenRoutes.add(destination.route);
    if (!destination.route.startsWith('#/')) {
      problems.push(`${where}: "${destination.route}" is not a route`);
    }
    if (!destination.en?.trim()) problems.push(`${where}: no English label`);
    if (!destination.ja?.trim()) problems.push(`${where}: no Japanese label`);
  }
  return problems;
}
