# Changelog

What changed, for somebody who uses the product rather than reads the
repository. Newest first, one section per released tag.

**A change to a medical model is never a patch release.** Where a claim
changed, the entry says which model, what changed, and whether it had been
clinically reviewed. The procedure is in
[`docs/release-runbook.md`](docs/release-runbook.md).

## Unreleased

Not yet tagged. Gate 0 and most of Gate 1 are complete; the remaining blockers
are branch protection on `main` and device testing on real hardware.

### Trust and medical claims

- The public **Trust** page (`#/trust`) shows catalogue maturity and clinical
  review as separate claims, with the scope of each review, its unresolved
  limitations and a link to the evidence package. It needs no WebGL — and it
  now scrolls, which it did not: everything below the fold, which was most of
  the review records, had been unreachable.
- **Model cards carry a revision.** A medical change that leaves its card
  untouched now fails CI. Reviews record the digest of the model they signed,
  so a review whose model has since changed has to say so.
- **One review was already stale.** The portal-hypertension review signed a
  model that the hepatorenal work later extended with an arterial inlet
  pressure control. It defaults to the reviewed value, so reviewed behaviour is
  unchanged, but the model at other inlet pressures has not been reviewed. This
  is now on the Trust page and in the review's limitations.

### Terms, privacy and support

- **Terms, Privacy, commercial disclosure and Support pages**, reachable at
  `#/terms`, `#/privacy`, `#/commerce` and `#/support`, and readable with no 3D.
- Two claims in the privacy policy are checked against the code rather than
  trusted: that nothing is transmitted before consent, and that no identifier
  survives a page load.
- **Checkout refuses to run** until the seller's commercial disclosure is
  complete. The account, the free models and the plan descriptions all keep
  working; the button says which of the two reasons applies.

### Privacy and observability

- **Usage data is consent-gated.** Nothing leaves the browser until you allow
  it, and refusing destroys what was gathered rather than storing it. There is
  no advertising use, no profile, and no identifier that outlives a page load;
  return visits are counted locally and reported as one of three words.
- **Error reports are redacted** before they are sent — tokens, addresses,
  identifiers and file paths.
- **A feedback route** on every surface, including the one shown when 3D fails
  to start, which is when a report is worth most.

### Performance and accessibility

- **Declared performance budgets.** The renderer gives up bloom before
  resolution, and now earns quality back after sustained headroom instead of
  keeping a reduced setting for the rest of a session.
- **Pinch zoom works again.** It had been disabled across the whole product to
  stop the browser zooming during an orbit gesture; the canvas now suppresses
  that gesture where it actually conflicts.
- Contrast, focus, landmarks, skip links, language marking for screen readers,
  reduced motion and target sizes are declared and checked in CI.

### Discoverability

- Every public model has its own page, its own link preview and an entry in the
  sitemap. The pages need no JavaScript, so a model's description, maturity and
  limits are readable even where the 3D is not.

### Billing operations

- An append-only ledger of every billing event, so a retry is recognised rather
  than re-applied and a dispute has something behind it.
- A reconciliation pass against Stripe, because a lost webhook leaves
  entitlement wrong in a way no single request notices.
- Renewal and payment-failure handling, with an alert on the last failed
  attempt — the point at which a paying customer is about to lose access.
