# Public release roadmap

Last updated: 2026-09-14

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
- [x] Replace the default direct scene launch with a real landing page. Its hero
  is now a working three-state circulation preview backed by the scene's actual
  solver; all public models are listed by question, and maturity and medical
  review are never collapsed into one label. The ambient Canvas layer has its
  own motion, data-saver and device budgets.
- [x] Move Prototype scenes out of the default public catalogue into explicit
  **Lab / Experimental** shelves, including in-scene navigation.
- [x] Keep the access/billing branch synchronized with current `main` so PR tests
  and the branch itself see the same scene registry.

## Gate 1 — limited free beta

**Scope, as of 2026-09-14: the beta is 3D anatomy, opened one batch of organs
at a time as each passes the gate** (ADR 2026-09-14, which keeps every other
decision in ADR 2026-09-08). Today that is nine models: the brain, and the
organs B1 and B2 opened — lung, liver, kidney, stomach, oesophagus, bowel,
biliary tree and pancreas. The disease and physiology models keep being built and are not
published in it. An unfinished heart anatomy is never substituted for by a
heart disease model — the beta opens the organs that passed and says so. See
[`architecture/adr-2026-09-14-anatomy-beta-by-organ.md`](architecture/adr-2026-09-14-anatomy-beta-by-organ.md),
[`architecture/adr-2026-09-08-anatomy-only-beta.md`](architecture/adr-2026-09-08-anatomy-only-beta.md)
and [`beta-release.md`](beta-release.md). The items below are unchanged: none of
the browser, accessibility, performance or review work is waived by publishing
less.

- [ ] Build `heart-anatomy` — an anatomy scene of its own, procedural or
  asset-backed, through the gates in `beta-release.md` §1. Until it passes, the
  beta opens the organs that passed and not the heart; nothing stands in for it. The scene now exists and
  is `alpha`; what it still lacks is an asset that has passed the asset release
  gate (it loads two candidate GLBs from `devAssets.js`) and a publication
  decision.

- [~] Test current Safari, Chrome and Firefox plus real iPhone and Android
  devices, including 320–430 px widths and landscape. The matrix is declared in
  `src/app/viewports.js` and measured in a real browser by `npm run verify:ui`:
  six viewports (320/375/430 portrait, a 932 × 430 landscape phone, tablet and
  desktop) across nine routes, checking horizontal overflow, reflow at 320 px,
  measured target sizes, the skip link, the whole focus ring and console
  errors. It found two real defects — the Trust page scrolled 426 px sideways
  at 320 px, and ten controls sat below the WCAG 2.5.8 floor — and both are
  fixed. CI now measures Chromium, Firefox and WebKit. **Remaining:** Safari on
  a real handset and touch on real hardware; the check says what it cannot
  cover at the end of every run.
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

### 1Z. Opening the anatomy layer organ by organ

**Nine of these are open; the order of the rest is a plan rather than a
promise.** Twenty-eight procedural organ anatomy scenes still clear every
condition in `beta-release.md` §1 except two: they are not in
`BETA_ANATOMY_CANDIDATES`, and no publication decision has been taken for
them. Neither is a formality — the
first is a scope decision (ADR 2026-09-14: the range is whichever anatomy
scenes have passed, opened a batch at a time) and the second is a record of
somebody having *looked*.

The looking is the part that is not cheap, and the first batch is what proved
it. `npm run verify:anatomy` passed on all three of `lung-anatomy`,
`liver-anatomy` and `kidney-anatomy`; rendering them at their own viewpoints
then found three defects that no unit test and no interaction check could see
(F-44, F-101, F-102 in [`follow-ups.md`](follow-ups.md)) — a model that was
never fitted to the visible band, a cut that drew no face, and a scene that
threw on the way out. **A batch is not ready because the gate would open. It
is ready when the renders have been looked at.**

Two of those three were in the scene every procedural organ shares, so every
later batch starts from a better place than B1 did — and B2 found the next
thing in the same place: a cut was being faced whether the part was solid or a
bag, so the stomach's coronal section drew the whole organ as tissue. F-103
was done before B2 and the entry is back under its old budget, which is what
made a five-scene batch affordable.

**B3 is the batch that got smaller.** It opened as the eye, the ear and the
skin; all three passed `verify:anatomy`, and the renders published one of
them. The eye opens as a white ball with three rectus muscles across its
fundus and the ear's cochlea is a coil spring — neither is a gate failure and
neither is publishable (F-132). What B3 did find in the shared layer was the
framing: the safe-area fit was an orthographic calculation on a perspective
camera, and it had ten viewpoints across eight of the nine published scenes
outside the band (F-131). **Three batches, three defects in shared code that
only a picture showed.**

| Batch | Scenes | State |
| --- | --- | --- |
| B1 | `lung-anatomy`, `liver-anatomy`, `kidney-anatomy` | **Open, 2026-09-14.** Three defects found in the renders and fixed first (F-44, F-101, F-102); records in [`beta-publication/`](beta-publication/) |
| B2 | `stomach`, `esophagus`, `intestine`, `biliary`, `pancreas` | **Open, 2026-09-14.** The renders found that a cut through a hollow organ was being faced — a stomach drawn as a lump of tissue — and the fix is what the batch is about |
| B3 | `skin-anatomy` | **Open, 2026-09-14.** Began as `eye`, `ear`, `skin`; the renders found the safe-area fit was cutting subjects off, an arteriole hidden behind its venule, and a viewpoint named for structures it did not show (F-130, F-131) |
| — | `eye-anatomy`, `ear-anatomy` | Held out of B3 on what their renders showed, not on the gate (F-132) |
| B4 | `knee`, `shoulder`, `hip`, `elbow`, `hand`, `foot`, `spine` | Not started |
| B5 | `thyroid`, `adrenal`, `spleen`, `lymph-node` | Not started |
| B6 | `bladder`, `uterus`, `prostate`, `male-tract`, `breast`, `pelvic-floor` | Not started |
| B7 | `nose`, `larynx`, `oral`, `neck`, `thorax`, `abdomen`, `pelvis` | Not started |
| — | `skeleton-overview`, `lymphatic-drainage` | Held: A1 in [`../src/catalog/anatomy.js`](../src/catalog/anatomy.js), below the A2 the product requires |

Per scene, opening one means: add it to `BETA_ANATOMY_CANDIDATES`; run
`npm run verify:anatomy -- --scene <slug> --preview` and
`npm run shots:anatomy -- --scene <slug> --preview` and **look at the images**;
write `docs/beta-publication/<slug>.md`; record the decision pinned to the
scene revision; regenerate the link-preview cards (the site card prints the
published count, so every card moves); update `tests/beta-release.test.js` and
`beta-release.md`. Widening the beta past the brain and the heart also needs
the ADR amended or replaced — it is a scope decision, not a batch of records.

## Gate 2 — paid beta

- [ ] Record the monetisation decision in an ADR and reconcile it with
  `product-principles.md` before final billing merge.
- [x] Integrate the access/billing branch with current `main` and rerun the full
  merged test/build suite.
- [~] Stripe sandbox journeys: purchase, Patient→Complete plan change and both
  period-end/immediate cancellation are verified. Renewal, payment-failure and
  repurchase still need explicit E2E coverage.
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
- [~] CSP and the remaining security headers are in `public/_headers` and
  guarded by `tests/security-headers.test.js`. The server-only billing event
  ledger (claim/finish, with an attempt count and a reclaim window), per-user
  reconciliation on the request path, a scheduled account-wide reconciliation
  sweep, a privacy-safe health endpoint and an alert policy are all in place;
  see [`access-and-billing.md`](access-and-billing.md) and
  [`billing-operations-runbook.md`](billing-operations-runbook.md). Connect the
  health endpoint and `OPS_ALERT_WEBHOOK` to the chosen production monitoring
  service.
- [ ] Choose real Patient / Education / Complete prices and configure live Stripe
  Products, Prices, Portal, webhook and Netlify Production secrets.

## Gate 3 — general public release

- [x] Use crawlable scene routes with canonical URLs, per-scene metadata,
  social cards and a sitemap. The build emits a static, JavaScript-free page per
  public scene, canonical/Open Graph/Twitter metadata, `LearningResource`
  JSON-LD, `robots.txt` and a sitemap, all generated from the catalogue and
  verified in CI. The 1200×630 link-preview cards are drawn from the catalogue
  by `npm run cards` and committed; `npm run cards:check` fails when they no
  longer match it. Each shows catalogue maturity and clinical-review state as
  two separate claims, so the Trust surface's distinction survives the moment a
  reader is deciding whether to click. See
  [`discoverability.md`](discoverability.md).
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

## Model platform foundation — alongside the gates, not ahead of them

The gates above decide when the product ships. This track decides what the
product may *claim* and where its geometry may *come from*, so that adding
external meshes or deeper models later cannot quietly widen either. It does
not displace a gate; it removes a class of accident before the work that
would cause it. The decision record is
[`architecture/intended-use-and-model-provenance.md`](architecture/intended-use-and-model-provenance.md).

- [x] **Phase 0 — alignment and contracts.** Delivery layers (SNS / Interactive /
  Educational) and intended uses (general education / patient explanation /
  medical education, with clinical research and clinical care as a separate
  track) are distinguished in the owner documents and in a machine-readable
  model profile per non-prototype scene (`src/catalog/modelProfiles.js`).
  Patient mode is fixed as patient *explanation*, never patient-specific. An
  asset-manifest contract (`src/catalog/assetManifest.js`) records source,
  licence decision, hashes, coordinates, conversion, semantic parts and QA for
  every external asset, with the one existing GLB back-filled honestly. CI
  refuses `clinical-research`, `clinical-care`, `patient-derived-geometry`,
  `patient-predictive` and `externally-validated` anywhere in the public app,
  requires every profile to prohibit diagnosis, treatment selection and dose
  selection, and applies a closed asset release gate (licence decision and
  per-component obligations, hashes, five QA gates bound to the file hash) to
  every asset a public scene draws. The brain atlas was re-judged under it,
  not grandfathered: releasable for its `alpha` scene only
  ([`asset-qa/brain-atlas-glb.md`](asset-qa/brain-atlas-glb.md)). No status,
  review state, model, price or route changed.
- [ ] **Phase 1 — asset pipeline proof (first).** One normal heart from the HRA 3D
  Reference Object Library through [`asset-pipeline.md`](asset-pipeline.md):
  source, licence, hash and attribution recorded; Slicer/Blender → GLB →
  validator → optimisation reproducible; compared in **Lab** or a development
  harness against the procedural heart and the model-driven chambers, and
  **not connected to production**. Go only on a measured gain in medicine,
  interaction or performance that leaves the existing dynamics intact.
- [ ] **Lung anatomy upgrade (second) — the first production-facing asset.**
  The organ whose disease scenes wait on named structures
  ([`anatomy-specs.md`](anatomy-specs.md) §1: A2 plus the pulled A3), through
  the pipeline the heart pilot proved and every gate including expert and
  clinician review. This order — HRA heart pilot, then lung — is the same in
  [`grand-design.md`](grand-design.md) §5.3 and
  [`asset-pipeline.md`](asset-pipeline.md); changing it needs a written reason.
- [ ] Later phases (heart-family model redesign separating pressure overload,
  volume overload and myocardial injury; aortic stenosis as the first textbook
  disease; Patient / Education depth; a separately gated clinical R&D
  programme) are sequenced in the strategy and start only after Phase 1
  reports.

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
| 9 | Billing operations: renewal/failure/repurchase E2E in the Stripe sandbox | Queued |
| 10 | Live pricing/configuration and paid-beta launch checklist | Queued |
| 11 | Link-preview cards drawn from the catalogue, and the review states three published pages were getting wrong | Done |
| 12 | Intended-use and model-provenance contracts: model profiles, asset manifest, public-app guards, document alignment | Done |
| 13 | HRA normal-heart Lab pilot through the asset pipeline, not connected to production | Queued |
| 14 | Lung anatomy upgrade: the first production-facing external asset, after batch 13 | Queued |

## Definition of done for every batch

1. The change has one clear release risk or user outcome.
2. Documentation, code and tests agree.
3. The full test suite and production build pass.
4. User-visible changes are checked in desktop and mobile layouts.
5. This roadmap is updated before the pull request is merged.
