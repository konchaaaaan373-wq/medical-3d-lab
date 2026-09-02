/**
 * The legal document slugs, and nothing else.
 *
 * Split out from `legal.js` deliberately. The router and the catalogue need to
 * know which slugs the shell has claimed, and they are both in the entry
 * chunk; importing the full text of the terms, the privacy policy and the
 * commercial disclosure to answer "is this slug taken?" would put several
 * kilobytes of prose in front of every first-time visitor, including the ones
 * who only ever open a model.
 *
 * `legal.js` imports this list back, so there is still one declaration.
 */
export const LEGAL_SLUGS = Object.freeze(['terms', 'privacy', 'commerce', 'support']);
