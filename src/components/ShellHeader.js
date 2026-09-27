import { EXPLORER_ROUTE, LAB_ROUTE, LANDING_ROUTE, PATIENT_ROUTE } from '../catalog/index.js';
import { PUBLIC_MANIFEST } from '../catalog/publicManifest.js';
import { betaUnlocked } from '../app/releaseGate.js';
import { PURPOSE, purposeById } from '../app/purpose.js';
import { patientExplanationScenes } from '../access/patientPurpose.js';
import { registerHeaderDock } from '../app/headerDock.js';
import { organLayerNavigation } from '../app/modelNavigation.js';
import { el } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import { createSiteHeaderMenu, organLayerList } from './SiteMenu.js';
import { brandIcon } from './brandIcon.js';

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
 * - **The same zones as a 3D model's header.** Who (the wordmark), where (these
 *   destinations), you (language and account), and the site menu last. The
 *   menu holds the published models — organ, then layer — which this row does
 *   not, and whatever of "you" the width pushes out of the row. See
 *   `SiteMenu.js`.
 *
 * ## Why the publication record is not a destination
 *
 * It was, labelled 公開とレビュー: the status and medical-review state of all
 * seventy declared models, most of which cannot be opened. That is the
 * product's internal ledger, and a header link to it told a reader that
 * alpha/review-pending bookkeeping was one of the four things this site is
 * for. Removed from the header and menu on 2026-09-27; a model's own record is
 * still reached from inside that model.
 */

/**
 * Whether the destinations behind the preview unlock are offered at all.
 *
 * `betaUnlocked()` reads `window.location.search`, and `node --test` has no
 * `window` — several surfaces are rendered head-less in the suite, and a
 * header that threw there would make them untestable. Falling back to `false`
 * is the safe direction: when we cannot tell whether the reader has the
 * preview unlock, we do not offer them the locked destinations.
 */
function labIsOffered() {
  try {
    return betaUnlocked();
  } catch {
    return false;
  }
}

/**
 * The product's mark — the cube icon, the same drawing as the favicon.
 *
 * One function for every header. There used to be two marks for one product —
 * a typed `M/3` here and a `3D` tile on a 3D model — and before that, three.
 *
 * @param {string} [className] the surface's own hook, beside the shared one
 */
export function brandMark(className = 'shell-brand-mark') {
  return brandIcon(el, className);
}

/**
 * Whether this build offers patient explanation on any model.
 *
 * Asked once per header. When it does not — the released product, today — the
 * header offers no purpose at all: a 患者説明 entrance that opens a list of
 * nothing is a door to an empty room (`patientPurpose.js`).
 */
function patientPurposeOffered() {
  try {
    return patientExplanationScenes().length > 0;
  } catch {
    return false;
  }
}

/**
 * The two purposes as the product's top level, when there are two.
 *
 * Medical education is explored by system, organ and mechanism — the model
 * index under the preview unlock, the home page's organ chooser in the beta
 * (where `#/organs` *is* the home page, see `routeRedirects.js`). Patient
 * explanation is explored by the question a person brings (`#/patient`).
 *
 * @param {boolean} labOffered
 */
export function purposeDestinations(labOffered) {
  const education = purposeById(PURPOSE.EDUCATION);
  const patient = purposeById(PURPOSE.PATIENT);
  return Object.freeze([
    Object.freeze({
      id: 'education',
      route: labOffered ? EXPLORER_ROUTE : LANDING_ROUTE,
      en: education.en,
      ja: education.ja,
    }),
    Object.freeze({ id: 'patient', route: PATIENT_ROUTE, en: patient.en, ja: patient.ja }),
  ]);
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
  // Gated, because in the beta it is not a destination.
  //
  // `#/organs` renders the same organ hero, the same organ chips and the same
  // two actions as the landing page — 23 identical controls in the same order,
  // measured in a browser. So "Models" and the wordmark beside it went to the
  // same models, and a reader who pressed one from the other saw the heading
  // change and nothing else. Two links to one page is how a header stops being
  // usable as a landmark, so the beta keeps the wordmark and drops this. Under
  // the preview unlock `#/organs` is the real Explorer — seventy models, search
  // and filters — and it is a destination again. `routeRedirects.js` holds the
  // other half of the rule.
  Object.freeze({ id: 'models', route: EXPLORER_ROUTE, en: 'Models', ja: 'モデル', gated: true }),
  // `公開とレビュー` (`#/trust`) is not here any more (owner's decision,
  // 2026-09-27): it is the ledger of every model's publication and review
  // state — the product's own working record, not a destination for a
  // reader. A model's own sources and limits are still one press away from
  // that model (「このモデルの根拠と限界」), where the question is asked.
  Object.freeze({ id: 'lab', route: LAB_ROUTE, en: 'Experimental', ja: '実験モデル', gated: true }),
]);

/**
 * @param {object} options
 * @param {'home'|'models'|'education'|'patient'|'trust'|'lab'|'legal'|null} [options.current] which
 *   destination the reader is on, so the header can say so. `legal` and `null`
 *   mark nothing, because a legal document is not one of the destinations and
 *   claiming otherwise would be a lie in an ARIA attribute.
 * @param {HTMLElement|null} [options.accountButton]
 * @param {HTMLElement|null} [options.languageToggle]
 * @param {boolean} [options.showLab] override the release check, for tests
 * @param {boolean} [options.showPurposes] override "is patient explanation
 *   offered anywhere", for tests. When it is, the model index is named as the
 *   purpose it serves — 医学教育 — beside 患者説明, and `current: 'models'`
 *   marks the first.
 * @param {ReadonlyArray<object>} [options.models] the published models the menu
 *   lists — the surface's own manifest, so a surface rendered from a fixture
 *   (zero models, one) does not grow a menu of the real release's
 * @returns {HTMLElement}
 */
export function createShellHeader({
  current = null,
  accountButton = null,
  languageToggle = null,
  showLab = labIsOffered(),
  showPurposes = patientPurposeOffered(),
  models = PUBLIC_MANIFEST?.models ?? [],
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
      brandMark(),
      el('span', { class: 'shell-brand-name', text: 'Medical 3D Lab' }),
    ]
  );

  // With two purposes, they are the top level and the model index is the
  // first of them rather than a third link beside them.
  const here = showPurposes && current === 'models' ? 'education' : current;
  const destinations = showPurposes
    ? [...purposeDestinations(showLab), ...SHELL_DESTINATIONS.filter((item) => item.id !== 'models')]
    : SHELL_DESTINATIONS;
  const links = destinations.filter((item) => !item.gated || showLab).map((item) =>
    el(
      'a',
      {
        class: `shell-nav-link${item.id === 'education' || item.id === 'patient' ? ` is-purpose is-${item.id}` : ''}`,
        href: item.route,
        ...(here === item.id ? { 'aria-current': 'page' } : {}),
      },
      dual(item.en, item.ja)
    )
  );

  // The models, organ then layer. This row carries none of them, so the menu is
  // the one place in this header that does — no second door.
  const site = createSiteHeaderMenu({
    id: 'site-menu',
    models: models.length ? [organLayerList(organLayerNavigation(models))] : null,
  });
  // The class the stylesheets and `check-departure` already address.
  site.utilities.classList.add('shell-actions');
  site.dock('account', accountButton);
  site.dock('language', languageToggle);

  const element = el('header', { class: 'shell-header has-site-menu', 'data-shell-header': '' }, [
    home,
    el(
      'nav',
      { class: 'shell-nav', 'aria-label': inLanguage('Product navigation', '製品ナビゲーション') },
      links
    ),
    site.utilities,
    site.menu.trigger,
    site.menu.backdrop,
    site.menu.panel,
  ]);
  registerHeaderDock(element, { dock: site.dock });
  return element;
}
