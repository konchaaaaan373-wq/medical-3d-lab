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
