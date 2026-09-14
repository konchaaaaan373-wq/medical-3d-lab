/**
 * Which language the interface is currently showing.
 *
 * Everywhere in the DOM, both languages are rendered and CSS hides one — that
 * is why switching costs nothing. Canvas has no CSS, so anything drawn into a
 * plot has to ask. One place asks, so the plots and the panels can never end up
 * in different languages.
 */
export const currentLanguage = () =>
  // Optional the whole way down: this is read from components that are also
  // built in `node --test`, where the document is a stand-in with only the
  // handful of methods those tests need. A language lookup must not be the
  // thing that decides whether a form can be constructed at all.
  globalThis.document?.getElementById?.('ui')?.dataset?.lang ?? 'ja';

/**
 * The string for the language on screen.
 *
 * @param {string} en
 * @param {string} ja
 */
export const inLanguage = (en, ja) => (currentLanguage() === 'en' ? en : (ja ?? en));

/**
 * Repaint something when the interface language flips.
 *
 * The DOM carries both languages and CSS hides one, so almost nothing needs
 * this. What does need it is everything that *cannot* hold two at once: an
 * `aria-label`, a `title`, a `placeholder`, a string drawn into a canvas. Those
 * are painted with `inLanguage()`, and `inLanguage()` is read once, at the
 * moment the element is built — so without this they keep the language that
 * happened to be on screen then. That is how the Japanese interface came to
 * announce its login button as "Sign in".
 *
 * One observer for the whole app, attached the first time anybody asks and
 * never detached: it watches one attribute of one element that lives as long as
 * the document. Seven surfaces write `#ui[data-lang]`; none of them has to know
 * this exists.
 *
 * `paint` is called once immediately, so a caller can use this instead of, and
 * not in addition to, its own first paint.
 *
 * @param {() => void} paint
 * @returns {() => void} stop repainting
 */
export function onLanguageChange(paint) {
  paint();
  const ui = globalThis.document?.getElementById?.('ui');
  // No `#ui`, or a document stand-in without observers: `node --test` builds
  // these components, and a missing repaint hook must never be the thing that
  // decides whether a control can be constructed.
  if (!ui || !globalThis.MutationObserver) return () => {};
  // Attached to the element, not once ever: `#ui` outlives everything in the
  // running app, but a test builds a fresh document per case and a hook bound
  // to the previous one would silently never fire.
  if (watching !== ui) {
    watching = ui;
    const observer = new globalThis.MutationObserver(() => {
      // A copy: a painter is free to unsubscribe from inside its own paint.
      for (const repaint of [...painters]) {
        try {
          repaint();
        } catch (error) {
          // One label that cannot repaint is a stale label. It is not a reason
          // for the labels after it in the set to stay stale too.
          console.warn('[language] a repaint failed', error);
        }
      }
    });
    observer.observe(ui, { attributes: true, attributeFilter: ['data-lang'] });
  }
  painters.add(paint);
  return () => painters.delete(paint);
}

/** @type {Set<() => void>} everything waiting to be repainted */
const painters = new Set();

/** The `#ui` the observer is attached to, so a new one gets a new observer. */
let watching = null;
