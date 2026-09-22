import { EXPLORER_ROUTE, LAB_ROUTE, LANDING_ROUTE } from '../catalog/index.js';
import { MODEL_INFO_ROUTE } from '../catalog/publicManifest.js';
import { betaUnlocked } from '../app/releaseGate.js';
import { el } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';

/**
 * The one header every reading surface wears.
 *
 * ## What it replaces
 *
 * Four. The landing page, the model index, the publication record and the
 * legal documents each built their own, and they had drifted into four
 * different products:
 *
 * | surface | wordmark | links |
 * | --- | --- | --- |
 * | landing | `M/3` + Medical 3D Lab | 3Dモデル, モデル情報, 実験モデル |
 * | model index | Medical 3D Lab | モデル情報 |
 * | publication record | Medical 3D Lab | モデル, ホーム |
 * | legal | Medical 3D Lab | (its own set again) |
 *
 * Three different link sets, three names for the same destination, and the
 * model index with no way back to the home page at all except by guessing that
 * the wordmark is a link. Following "3Dモデル" from the landing page landed on
 * a page whose header no longer offered "3Dモデル" — so the reader could not
 * tell whether they had arrived or left.
 *
 * ## The rules it exists to hold
 *
 * - **The same destinations, in the same order, with the same words, on every
 *   surface.** The set is small enough to read at a glance and is the product's
 *   actual top level, not a list of everything that has a route.
 * - **One link per destination.** The landing page had four links to the
 *   publication record on one screen and the model index had three; between
 *   them, seven links to one page. A reader who sees the same words in four
 *   places cannot use any of them as a landmark.
 * - **Say where you are.** `aria-current="page"` and a visible marker, so the
 *   answer to "did that do anything" is on screen rather than in the address
 *   bar. Nothing else in this product answered it.
 * - **The wordmark is the way home.** A separate "ホーム" link beside a
 *   wordmark that already goes home is a second door onto the same room.
 *
 * ## Why "publication and review" and not "model information"
 *
 * `#/trust` was labelled モデル情報 — "model information" — from four places on
 * the landing page and from inside every model. A reader who has a model on
 * screen and presses "model information" is asking about *that model*. What
 * arrived was a 8,000-pixel ledger of the publication status and medical
 * review state of all seventy, most of which cannot be opened.
 *
 * The page is worth having and the label was the problem: it described the
 * reader's expectation rather than the page. `公開とレビュー` matches the
 * page's own heading, which is the strongest information scent available —
 * the label predicts the title. A model's *own* record still exists and is
 * still one press away, from inside that model, where the question is asked.
 */

/**
 * Whether the Experimental destination is offered at all.
 *
 * `betaUnlocked()` reads `window.location.search`, and `node --test` has no
 * `window` — several surfaces are rendered head-less in the suite, and a
 * header that threw there would make them untestable. Falling back to `false`
 * is the safe direction: when we cannot tell whether the reader has the
 * preview unlock, we do not offer them the locked destination.
 */
function labIsOffered() {
  try {
    return betaUnlocked();
  } catch {
    return false;
  }
}

const dual = (en, ja) => [
  el('span', { class: 'lang-en', text: en }),
  el('span', { class: 'lang-ja', text: ja }),
];

/**
 * The product's top level. One row per destination, and there is no second
 * route to any of them anywhere in this header.
 *
 * `id` is what a surface passes as `current`, and is deliberately not the route
 * kind: `lab` and `explorer` render the same page at different scopes but are
 * different destinations to a reader.
 */
export const SHELL_DESTINATIONS = Object.freeze([
  Object.freeze({ id: 'models', route: EXPLORER_ROUTE, en: 'Models', ja: 'モデル' }),
  Object.freeze({
    id: 'trust',
    route: MODEL_INFO_ROUTE,
    en: 'Publication & review',
    ja: '公開とレビュー',
  }),
  Object.freeze({ id: 'lab', route: LAB_ROUTE, en: 'Experimental', ja: '実験モデル', gated: true }),
]);

/**
 * @param {object} options
 * @param {'home'|'models'|'trust'|'lab'|'legal'|null} [options.current] which
 *   destination the reader is on, so the header can say so. `legal` and `null`
 *   mark nothing, because a legal document is not one of the destinations and
 *   claiming otherwise would be a lie in an ARIA attribute.
 * @param {HTMLElement|null} [options.accountButton]
 * @param {HTMLElement|null} [options.languageToggle]
 * @param {boolean} [options.showLab] override the release check, for tests
 * @returns {HTMLElement}
 */
export function createShellHeader({
  current = null,
  accountButton = null,
  languageToggle = null,
  showLab = labIsOffered(),
} = {}) {
  const home = el(
    'a',
    {
      class: 'shell-brand',
      href: LANDING_ROUTE,
      'aria-label': inLanguage('Medical 3D Lab home', 'Medical 3D Lab トップ'),
      ...(current === 'home' ? { 'aria-current': 'page' } : {}),
    },
    [
      el('span', { class: 'shell-brand-mark', 'aria-hidden': 'true' }, [
        el('span', { text: 'M' }),
        el('i'),
        el('span', { text: '3' }),
      ]),
      el('span', { class: 'shell-brand-name', text: 'Medical 3D Lab' }),
    ]
  );

  const links = SHELL_DESTINATIONS.filter((item) => !item.gated || showLab).map((item) =>
    el(
      'a',
      {
        class: 'shell-nav-link',
        href: item.route,
        ...(current === item.id ? { 'aria-current': 'page' } : {}),
      },
      dual(item.en, item.ja)
    )
  );

  return el('header', { class: 'shell-header', 'data-shell-header': '' }, [
    home,
    el(
      'nav',
      { class: 'shell-nav', 'aria-label': inLanguage('Product navigation', '製品ナビゲーション') },
      links
    ),
    el('div', { class: 'shell-actions' }, [accountButton, languageToggle].filter(Boolean)),
  ]);
}
