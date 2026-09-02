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

### The scenes themselves

- **The consent question no longer covers the controls.** On a first visit it
  was pinned to the bottom of the window — which is where every scene keeps its
  stage steps, its Story and Compare buttons and its camera controls. On a
  phone it covered all of them, so the first thing a new visitor saw was a
  model they could not operate. It now sits between the title and the console
  and covers neither.
- **The heart and great vessels were reviewed against an atlas** and come out
  right: the aortic valve sits to the right of and in front of the mitral, the
  left atrium above and behind the valve plane, the arch crosses the midline
  backwards and to the left and clears the top of the atrium, and the four
  pulmonary veins enter the atrium from behind, two a side. Eleven such
  relationships are now held by tests rather than by whoever last looked.
- The brain atlas was checked the same way and nothing was found.
- Two things the review raised are questions for a clinician, not for us, and
  are written into the heart-failure model card so a reader meets them: the
  pulmonary veins are drawn in the colour this scene uses for venous tissue,
  and they are the veins that carry oxygenated blood.

### Billing journeys

- **A renewal, a failing card and a repurchase are now checked as sequences.**
  They were the three billing paths nobody could see from a single assertion: a
  successful renewal changes no subscription status, a card that declines once
  must not cost anybody their access, and a customer who cancelled and came
  back must not be sent to manage a subscription that no longer exists. All
  eight journeys are written down once and replayed against the real webhook
  handler on every change.
- What each step asserts is not an internal status but the product's own
  answer to "can this person open the paid mode?" — so a change that keeps the
  status right and the access wrong still fails.

### Discoverability

- Every public model has its own page, its own link preview and an entry in the
  sitemap. The pages need no JavaScript, so a model's description, maturity and
  limits are readable even where the 3D is not.
- **Sharing a model now shows a real card.** Each carries the model's name in
  both languages, its system, and — separately — how finished the engineering
  is and whether a clinician has signed it, so the distinction the Trust page
  makes survives the moment somebody is deciding whether to click. Every card
  also carries the line saying this is an educational model and not for patient
  care, because a card travels without the page it came from.
- **Three published pages were contradicting themselves.** COPD, asthma and
  cirrhosis/portal hypertension each said "Reviewed — a clinical reviewer has
  signed a specific commit" and "Clinical review pending" on the same page. All
  three have a real review that went stale when the model changed underneath
  it, and the static pages had no wording for that state, so they fell back to
  "pending". They now say re-review required, which is what is true.

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
