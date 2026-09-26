/**
 * Where a header takes the controls that belong to the whole site.
 *
 * The account button is made by the access layer, the feedback button by the
 * observability layer, and the language switch by whichever surface is on
 * screen — three owners, none of which built the header. On a document surface
 * they are handed to `createShellHeader` directly. On a 3D model the header is
 * built by the scene shell before the other two exist, so they arrive later and
 * ask the header for a place.
 *
 * This is that asking, and nothing else: a header registers what it can hold,
 * and a caller that finds no header falls back to wherever it put the control
 * before. No module here needs to import the header to use it.
 */

const docks = new WeakMap();

/**
 * @typedef {object} HeaderDock
 * @property {(name: 'account'|'language'|'feedback', node: HTMLElement) => boolean} dock
 *   put a site control in the header; false when this header has no place for it
 */

/**
 * @param {HTMLElement} element the header's root, which carries `has-site-menu`
 * @param {HeaderDock} dock
 */
export function registerHeaderDock(element, dock) {
  if (element && typeof element === 'object') docks.set(element, dock);
}

/**
 * The dock of the header inside `root`, if one registered.
 *
 * @param {HTMLElement|null|undefined} root
 * @returns {HeaderDock|null}
 */
export function headerDockIn(root) {
  // A class, not an attribute selector: the test DOM matches classes, and a
  // lookup it cannot answer is a dock no unit test would ever find.
  const host = root?.querySelector?.('.has-site-menu') ?? null;
  return host ? (docks.get(host) ?? null) : null;
}
