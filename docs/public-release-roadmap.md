# Public release roadmap

Last updated: 2026-09-02

This is the ordered source of truth for taking Medical 3D Lab from a working
model catalogue to a trustworthy public product. It records release gates, not
an idea backlog. A later item should not displace an earlier gate unless the
reason is written here or in an architecture decision record.

## Current release decision

- **Free, limited beta:** technically close; Gate 0 is now reduced to deployment
  protection plus making medical-review state visible in the product shell.
- **Paid public release:** not yet ready for live charging; sandbox billing and
  entitlement E2E are working, but live prices, legal/commercial pages and final
  device QA are still deliberately absent.
- **New disease scenes:** continue only in small batches. Trust, review and
  product-shell infrastructure must keep pace with scene count.

The model architecture is already a strength. The release work now focuses on
making evidence state, public experience and operational safety as reliable as
the model tests.

## Gate 0 — blockers before any public beta

### 0A. Medical trust

- [x] Make catalogue/model-card status agree and restore the clinically reviewed
  COPD, asthma and portal-hypertension versions to `reviewed`.
- [x] Add a test that fails when an alpha/reviewed model card and catalogue
  status disagree.
- [x] Add a versioned Clinical Review registry: reviewer role, date, reviewed
  commit, scope, sources and unresolved limitations.
- [x] Give heart failure and amyloid-beta the current model-card, evidence-dossier
  and dedicated external-physiology test standard. Their review state remains
  honestly `legacy-unversioned` until a current reviewer signs a specific commit.
- [x] Separate engineering/catalogue maturity from medical-review state in the
  data model and CI contracts.
- [x] Expose that medical-review state in a first-class public Trust surface so a
  user does not have to inspect the repository to understand it. `#/trust` shows
  catalogue maturity and clinical-review state as separate claims, the scope and
  unresolved limitations of each review, links to the evidence package, and —
  since the attestation work below — whether a model has changed since it was
  reviewed. It needs no WebGL, and it now scrolls, which it did not.

### 0B. Release safety

- [x] Add GitHub Actions for tests and production build on every pull request.
- [ ] Protect `main`: required checks, pull-request-only changes and no force
  pushes. Keep production deployment tied to a passing protected commit.
- [x] Add a product shell that remains useful without WebGL and a renderer-failure
  fallback that preserves navigation and scope information.
- [x] Replace the default direct scene launch with a real landing page.
- [x] Move Prototype scenes out of the default public catalogue into explicit
  **Lab / Experimental** shelves, including in-scene navigation.
- [x] Keep the access/billing branch synchronized with current `main` so PR tests
  and the branch itself see the same scene registry.

## Gate 1 — limited free beta

- [~] Test current Safari, Chrome and Firefox plus real iPhone and Android
  devices, including 320–430 px widths and landscape. The matrix is declared in
  `src/app/viewports.js` and measured in a real browser by `npm run verify:ui`:
  six viewports (320/375/430 portrait, a 932 × 430 landscape phone, tablet and
  desktop) across nine routes, checking horizontal overflow, reflow at 320 px,
  measured target sizes, the skip link, the whole focus ring and console
  errors. It found two real defects — the Trust page scrolled 426 px sideways
  at 320 px, and ten controls sat below the WCAG 2.5.8 floor — and both are
  fixed. **Remaining:** Safari and Firefox, and touch on real hardware. The
  check drives Chromium only and says so at the end of every run.
- [~] Run keyboard, focus, contrast, zoom and screen-reader checks across Landing,
  Explorer, Patient Presenter, Education Presenter and Account. Contrast, focus,
  landmarks, skip links, language marking, reduced motion, target sizes and the
  viewport reflow release are declared and enforced in CI; two real defects were
  fixed on the way (the Trust page could not scroll, and the shell disabled
  pinch zoom). Reflow at 320 px and the in-scene tab order are now measured in
  a browser as part of the viewport matrix above. **Remaining:** screen-reader
  passes on real devices. See [`accessibility.md`](accessibility.md).
- [x] Establish performance budgets and remove `preserveDrawingBuffer` from the
  normal render path unless an export is actively being captured. Frame, start-up
  and ship-weight budgets are declared in `src/app/performanceBudget.js`,
  applied by the viewer, and the bundle budget is measured in CI
  (`npm run budget`). See [`observability.md`](observability.md) §1.
- [x] Add privacy-conscious error reporting, core product analytics and an
  in-product feedback route. Consent-gated, redacted, with no identifier that
  outlives the page load. See [`observability.md`](observability.md) §2–4.
- [~] Complete an anatomy/art review of the flagship scenes, beginning with the
  heart/great-vessel relationships and the new brain atlas interaction. Done as
  an **engineering** review and recorded in [`anatomy-review.md`](anatomy-review.md):
  eleven great-vessel and chamber relationships measured and correct, each now
  held by a test; the brain atlas correct in its declared view. It found two
  defects only the render showed — the consent question was sitting on the
  scene console, covering every control on a phone, and the harness had been
  measuring the loading veil — and both are fixed, with occlusion now measured
  in CI. **Remaining:** the three judgement calls in §4, which are a
  clinician's to settle rather than an engineer's; two of them are recorded in
  the heart-failure model card under *what could be misread*.

## Gate 2 — paid beta

- [ ] Record the monetisation decision in an ADR and reconcile it with
  `product-principles.md` before final billing merge.
- [x] Integrate the access/billing branch with current `main` and rerun the full
  merged test/build suite.
- [~] Stripe sandbox journeys. Eight journeys — first purchase, renewal, a
  recovered payment failure, a final one, repurchase after cancellation, a plan
  change, a period-end cancellation and a write-off — are declared as data in
  `netlify/lib/journeys.js` and replayed against the deployed webhook handler
  on every pull request, asserting access through the product's own
  `grantsFromSubscriptions` rather than a status string. **Remaining:** running
  the same list against the real Stripe sandbox with test clocks, which needs
  credentials and a person; the procedure is in
  [`access-and-billing.md`](access-and-billing.md).
- [~] Show actual Stripe price/billing period and current subscription lifecycle
  in product UI. Terms, Privacy, commercial disclosure (特定商取引法) and support
  pages are written, routed and reachable without WebGL, and the renewal and
  cancellation terms are stated in both languages. **Remaining:** the seller's
  own identity — legal name, responsible person, address and contact — which is
  a fact about a business and is deliberately `null` in `src/data/operator.js`
  rather than invented. Until it is filled in, `src/access/legalReadiness.js`
  refuses to start a checkout and the disclosure page shows the gap.
- [x] Password recovery, email confirmation, subscription-state UX and account
  deletion exist.
- [x] Scene paid capabilities are semantic manifest data and CI-checked against
  authored Patient/Education content and scene maturity.
- [x] CSP and the remaining security headers are in `public/_headers` and
  guarded by `tests/security-headers.test.js`. The server-only billing event
  ledger (claim/finish, with an attempt count and a reclaim window), per-user
  reconciliation on the request path, a scheduled account-wide reconciliation
  sweep and an alert policy are all in place; see
  [`access-and-billing.md`](access-and-billing.md). Scheduling that sweep and
  pointing `OPS_ALERT_WEBHOOK` somewhere are deployment configuration, and the
  production runbook for it is in [`release-runbook.md`](release-runbook.md).
- [ ] Choose real Patient / Education / Complete prices and configure live Stripe
  Products, Prices, Portal, webhook and Netlify Production secrets.

## Gate 3 — general public release

- [~] Use crawlable scene routes with canonical URLs, per-scene metadata,
  social cards and a sitemap. The build emits a static, JavaScript-free page per
  public scene, canonical/Open Graph/Twitter metadata, `LearningResource`
  JSON-LD, `robots.txt` and a sitemap, all generated from the catalogue and
  verified in CI. **Remaining:** the 1200×630 raster link-preview images, which
  this repository has no rasteriser to produce — the build names the missing
  ones. See [`discoverability.md`](discoverability.md).
- [~] Publish a tagged release with a changelog, rollback procedure, incident
  owner and support response path. The procedure, the rollback (including what
  a rollback does *not* undo), the incident-owner role and the support path are
  written in [`release-runbook.md`](release-runbook.md), and `CHANGELOG.md`
  exists with an Unreleased section. **Remaining:** actually cutting the first
  tag, which waits on the Gate 0/1 items above.
- [x] Version model cards and review attestations with every medical change.
  `docs/model-cards/revisions.json` records the digest of the sources each card
  describes, and a medical change that leaves the card untouched fails CI
  (`npm run revisions:check`). Review staleness is a separate mechanism owned by
  Batch 5: a clinical review lists the paths it signed, and a review whose model
  has since changed is marked stale — which the public Trust page shows. It
  found one immediately: the portal-hypertension review signed a model that the
  hepatorenal work later extended.
- [x] Define launch metrics: model start, story/compare completion, learning
  completion, patient-guide use, conversion, retention and renderer failures.
  Declared in `src/telemetry/metrics.js`, emitted through the app-event bridge
  and checked by CI. Reading them requires an endpoint, which is a deployment
  decision rather than a code one.

## Gate 4 — institutional product, after individual validation

- [ ] Organisations, seats and roles.
- [ ] Shared lessons and institution-level usage reporting.
- [ ] SSO/LTI only when a concrete customer requires it.
- [ ] Keep patient-identifiable clinical data out of the product unless a
  separate privacy, security and regulatory programme is deliberately opened.

## Small-batch implementation order

| Batch | Deliverable | Status |
| --- | --- | --- |
| 1 | Roadmap, honest catalogue statuses and drift tests | Done |
| 2 | Pull-request CI | Done |
| 3 | WebGL-independent shell and useful failure fallback | Done |
| 4 | Landing page and public/Lab catalogue split | Done |
| 5 | Clinical Review registry | Done |
| 6 | Heart-failure and amyloid evidence-package migration | Done; sign-off intentionally pending |
| 7 | Public Trust surface showing maturity, review state and evidence boundary | Done |
| 8 | Performance budgets, telemetry, error reporting and feedback | Done |
| 8b | Crawlable scene pages, metadata and sitemap | Done except preview rasters |
| 8c | Terms, privacy, commercial disclosure and support, with a checkout gate | Done except seller identity |
| 8d | Accessibility foundations enforced in CI | Done except device passes |
| 8e | Billing ledger, reconciliation sweep and operational alerts | Done |
| 8f | Model-card revisions (distinct from review staleness, which Batch 5 owns) | Done |
| 8g | Viewport matrix measured in a browser, and the defects it found | Done except Safari/Firefox and touch |
| 9 | Billing journeys declared once and replayed in CI | Done except the credentialed sandbox run |
| 10 | Live pricing/configuration and paid-beta launch checklist | Queued |

## Definition of done for every batch

1. The change has one clear release risk or user outcome.
2. Documentation, code and tests agree.
3. The full test suite and production build pass.
4. User-visible changes are checked in desktop and mobile layouts.
5. This roadmap is updated before the pull request is merged.
