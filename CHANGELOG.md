# Changelog

What changed, for somebody who uses the product rather than reads the
repository. Newest first, one section per released tag.

**A change to a medical model is never a patch release.** Where a claim
changed, the entry says which model, what changed, and whether it had been
clinically reviewed. The procedure is in
[`docs/release-runbook.md`](docs/release-runbook.md).

## Unreleased

Not yet tagged. Gate 0 and most of Gate 1 are complete; the remaining blockers
are branch protection on `main`, and the parts of device testing that need a
person: Safari, Firefox, touch and a screen reader.

### A new model

- **Where filtration fails** (`#/renal-filtration`). One nephron, with the
  Starling balance across its glomerular capillary and the mass balance of the
  tubule below it solved together. FENa, the urea-to-creatinine ratio, the urine
  sodium and the urine osmolality are not four facts to memorise there — they
  are four readings of the same solve, so a reader can move one mechanism and
  watch which of them inverts. Pre-renal, tubular injury, obstruction, chronic
  nephron loss and nephrotic disease are five *situations* of one model rather
  than five scenes.
- It reports plasma creatinine as **where creatinine is heading**, never as
  where it is today: the model solves a steady state, and real creatinine takes
  days to catch up. That is the caveat the scope panel leads with.
- **Alpha, not reviewed.** It has the model layer, the evidence dossier, the
  model card and the scope panel; no clinician has signed it, and the Trust page
  says so.

### Trust and medical claims

- The public **Trust** page (`#/trust`) shows catalogue maturity and clinical
  review as separate claims, with the scope of each review, its unresolved
  limitations and a link to the evidence package. It needs no WebGL — and it
  now scrolls, which it did not: everything below the fold, which was most of
  the review records, had been unreachable.
- **Model cards carry a revision.** A medical change that leaves its card
  untouched now fails CI. That is a different obligation from whether a review
  is still current, which the clinical review registry answers.
- **Three reviews turn out to be stale**, and the Trust page now shows each one
  with the paths that changed since it was signed. The portal-hypertension
  review, for instance, signed a model the hepatorenal work later extended with
  an arterial inlet pressure control: it defaults to the reviewed value, so
  reviewed behaviour is unchanged, but the model at other inlet pressures has
  not been reviewed. A stale review is history, not a current sign-off, and it
  is labelled that way everywhere it appears.

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
- **The Trust page no longer scrolls sideways on a phone.** One evidence path
  with no place to break — `docs/model-evidence/cirrhosis-portal-hypertension.md`
  — was widening the whole card grid, so at 320 px the page ran 426 px off the
  right edge and had to be read in two directions.
- **Ten controls got big enough to hit.** The story-stage buttons under a scene
  were 9 px tall, the filter and system pills 22 px wide, and every footer,
  navigation and evidence-source link on the reading surfaces was bare 14–19 px
  text. All now clear the 24 px WCAG minimum.
- These were found rather than guessed: the product is now measured in a real
  browser at six viewport sizes — 320, 375 and 430 px wide, a phone on its
  side, a tablet and a desktop — across every page that does not need WebGL,
  plus one that does. Safari, Firefox and real touch hardware are still a
  person's job, and the check says so every time it runs.

### Discoverability

- Every public model has its own page, its own link preview and an entry in the
  sitemap. The pages need no JavaScript, so a model's description, maturity and
  limits are readable even where the 3D is not.

### Billing operations

- Renewal and payment-failure handling. Entitlement already followed the
  subscription events; these carry the two facts those cannot — that a renewal
  happened at all, and that a payment is failing with a known number of
  attempts left. An alert goes out on the last failed attempt, which is the
  point at which a paying customer is about to lose access.
- A scheduled reconciliation sweep across the whole account, alongside the
  existing per-user repair. The per-user one cannot see somebody who never
  comes back; the sweep answers whether anyone is in a bad state that nobody
  has looked at.
- An alert policy, so the failures worth waking somebody for are written down
  rather than decided in the moment.
