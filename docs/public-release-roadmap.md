# Public release roadmap

Last updated: 2026-08-31

This is the ordered source of truth for taking Medical 3D Lab from a working
model catalogue to a trustworthy public product. It records release gates, not
an idea backlog. A later item should not displace an earlier gate unless the
reason is written here or in an architecture decision record.

## Current release decision

- **Free, limited beta:** possible after Gate 0 is complete.
- **Paid public release:** not yet ready.
- **New disease scenes:** lower priority than closing the current trust and
  release-safety gaps.

The model architecture is already a strength. The immediate work is to make
the medical claims, public experience and deployment process as reliable as
the model tests.

## Gate 0 — blockers before any public beta

### 0A. Medical trust

- [x] Make the public catalogue match the model cards: COPD, asthma and portal
  hypertension remain `alpha` until the corrected versions are re-reviewed.
- [x] Add a test that fails when an alpha/reviewed model card and catalogue
  status disagree.
- [ ] Add a versioned clinical-review registry: reviewer role, date, reviewed
  commit, scope, sources and unresolved limitations.
- [ ] Give heart failure and amyloid-beta the same model-card and evidence
  standard used by newer model-backed scenes.
- [ ] Separate engineering maturity from the public medical-review claim.

### 0B. Release safety

- [ ] Add GitHub Actions for tests and production build on every pull request.
- [ ] Protect `main`: required checks, pull-request-only changes and no force
  pushes. Keep production deployment tied to a passing protected commit.
- [ ] Add a product shell that remains usable without WebGL. A renderer failure
  must not remove navigation, model scope, citations or support information.
- [ ] Replace the default direct scene launch with a real landing page.
- [ ] Move prototype scenes out of the default public catalogue into an
  explicit **Lab / Experimental** area.

## Gate 1 — limited free beta

- [ ] Test current Safari, Chrome and Firefox plus real iPhone and Android
  devices, including 320–430 px widths and landscape.
- [ ] Run keyboard, focus, contrast, zoom and screen-reader checks.
- [ ] Establish performance budgets and remove `preserveDrawingBuffer` from the
  normal render path unless an export is actively being captured.
- [ ] Add privacy-conscious error reporting, core product analytics and an
  in-product feedback route.
- [ ] Complete an anatomy/art review of the flagship scenes, beginning with the
  heart and great-vessel relationships.

## Gate 2 — paid beta

- [ ] Record the monetisation decision in an ADR and reconcile it with
  `product-principles.md` before merging the access/billing work.
- [ ] Integrate the access/billing branch with current `main`, then rerun the
  full merged test, build and browser matrix.
- [ ] Complete Stripe test-mode purchase, renewal, payment-failure,
  cancellation and repurchase journeys.
- [ ] Show price, billing period, renewal and cancellation terms before
  checkout; add terms, privacy, commerce disclosure and support pages.
- [ ] Add password recovery, email verification handling, account deletion and
  subscription-state UX.
- [ ] Replace text/DOM-based feature interception with semantic capability
  checks at component construction.
- [ ] Add CSP and the remaining security headers, a billing event ledger,
  reconciliation and operational alerts.

## Gate 3 — general public release

- [ ] Use crawlable scene routes with canonical URLs, per-scene metadata,
  social cards and a sitemap.
- [ ] Publish a tagged release with a changelog, rollback procedure, incident
  owner and support response path.
- [ ] Version model cards and review attestations with every medical change.
- [ ] Define launch metrics: model start, story/compare completion, learning
  completion, patient-guide use, conversion, retention and renderer failures.

## Gate 4 — institutional product, after individual validation

- [ ] Organisations, seats and roles.
- [ ] Shared lessons and institution-level usage reporting.
- [ ] SSO/LTI only when a concrete customer requires it.
- [ ] Keep patient-identifiable clinical data out of the product unless a
  separate privacy, security and regulatory programme is deliberately opened.

## Small-batch implementation order

| Batch | Deliverable | Status |
| --- | --- | --- |
| 1 | Roadmap, honest review statuses and drift test | In review |
| 2 | Pull-request CI and documented `main` protection settings | Next |
| 3 | WebGL-independent shell and useful failure fallback | Queued |
| 4 | Landing page and public/Lab catalogue split | Queued |
| 5 | Review registry plus heart-failure and amyloid evidence packages | Queued |
| 6 | Rebase, harden and finish the access/billing pull request | Queued |

## Definition of done for every batch

1. The change has one clear release risk or user outcome.
2. Documentation, code and tests agree.
3. The full test suite and production build pass.
4. User-visible changes are checked in desktop and mobile layouts.
5. This roadmap is updated before the pull request is merged.
