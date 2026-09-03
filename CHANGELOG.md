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

### The liver, divided the way surgery divides it

- **Eight Couinaud segments**, as nine closed meshes whose union is the
  parenchyma (segment IV is carried as its superior and inferior halves), each
  hideable and measurable on its own. Every point in the liver falls in exactly
  one of them, and the five sectors take the share of liver volume the
  literature reports.
- **Cantlie's line is the right/left division, and the falciform ligament is
  not.** The commonest mistake about liver anatomy is now something the
  geometry cannot make: the plane of the middle hepatic vein and the ligament
  are separate objects, a real distance apart, and a test holds them so.
- **The hepatic veins run between the segments and the portal pedicles run
  inside them** — the arrangement that makes a segmentectomy possible, and the
  reason a surgeon finds a resection plane by following a vein. Each vein is
  projected onto the plane it divides rather than positioned near it.
- **The caudate lobe belongs to neither side.** It takes a pedicle from both
  portal branches and drains straight into the cava by its own short veins,
  which is why it survives what kills the rest of the liver.
- Removing a sector leaves a real cut surface: taking segments VI and VII away
  draws the plane of the right hepatic vein, which is what a right posterior
  sectionectomy looks like.

### The lung, rebuilt as an organ

- **The lung has lobes now.** It used to have grooves: shallow dents scratched
  into one surface, so it looked lobed and had nothing in it that could be
  hidden, coloured or measured. It is five closed meshes whose union is the
  parenchyma — three on the right, two on the left, cut apart by an oblique
  fissure on both sides and a horizontal fissure on the right only. Every point
  in the lung falls in exactly one lobe, and that is sampled rather than
  asserted.
- **The lobes take roughly the share of each lung they are taught to take** —
  about 36 / 12 / 52 on the right and half and half on the left, with the middle
  lobe the smallest of the five. The fissure positions were chosen to land those
  and nothing else, which makes them a calibration rather than a measurement,
  and the targets themselves are uncited approximations rather than figures from
  a series.
- **Eighteen named bronchopulmonary segments**, ten on the right and eight on
  the left, in both languages: no left S7 because the heart is there, an
  apicoposterior segment where the left lung fuses two, and the lingula inside
  the left upper lobe rather than as a lobe of its own. Each sits where its own
  name says it does, and that is what the tests check.
- **A bronchial tree and the vessels that run with it.** Trachea, main, lobar
  and segmental bronchi, with the right main bronchus wider, shorter and steeper
  than the left; an artery beside every bronchus; and veins running *between*
  the segments rather than with them, which is the fact a surgeon finds a
  segmentectomy plane by. At the hilum, RALS: the artery anterior to the
  bronchus on the right and superior to it on the left.
- **Nothing inside the lung comes out of it.** The hilum and the segment
  centres are declared as anatomical directions and then placed against the
  lung's own surface, so the declaration says where a structure is and the
  surface says how far out that is. Written the other way round — as fractions
  of the lung's extents — seven of the eight hilar structures sat outside the
  pleura and twenty-one airway and vessel endpoints ended in mid-air, plainly
  visible on screen while every test passed.
- **Still schematic in shape.** The outer silhouette is unchanged and is not
  from a scan; real fissures are curved and frequently incomplete, and the
  segment boundaries here are a distance rule — the lung nearer one segmental
  bronchus than any other — which models the definition of a segment rather
  than tracing a specimen. The right main bronchus is the shorter and the more
  vertical, which is the claim; the 1 : 2 length ratio of real ones is
  understated here at 1 : 1.13, because these two lungs are placed symmetrically
  and a real left hilum is pushed out by the heart.
- **Building an organ twice now costs once.** Carved parts are kept and handed
  out as separate copies, which took the test suite from 30 s back to 16 s
  without changing a single vertex.

### A new model — where the water goes

- **Pulmonary oedema** (`#/pulmonary-edema`, `alpha`). One Starling equation
  across the pulmonary capillary and the three buffers that oppose it:
  interstitial pressure rising off its subatmospheric floor, lymphatic flow
  rising towards a ceiling, and interstitial protein washing down as the flux
  rises. What comes out of that is the question the scene is named for — above
  what pressure does water cross, and which space does it fill first.
- **The threshold is searched for, never stored.** There is no flooding
  constant anywhere in the model. Lower the albumin, injure the barrier, raise
  the cardiac output or give the lymphatics months to adapt, and the pressure
  the lung tolerates moves, because it was never a number in the first place.
  A previously normal lung floods in the mid-twenties mmHg; the same lung after
  months at pressure holds out into the high thirties.
- **Cardiogenic and non-cardiogenic oedema are the same equation.** Nothing
  switches. Raising the atrial pressure floods the lung through the hydrostatic
  term; injuring the barrier floods it at a normal pressure through σ — and
  because σ multiplies the oncotic term, giving albumin stops helping. That
  falls out of the model rather than being written into it.
- **The interstitium fills before the alveolus does**, so the scene has a stage
  where the lung is visibly wet and the saturation has not moved — which is why
  breathlessness precedes hypoxaemia and the radiograph changes before the
  oximeter. Only when alveoli flood does a shunt appear, and then oxygen widens
  the alveolar-to-arterial difference instead of closing it.
- It reuses the lungs `breathing-lungs` already draws. No organ is modelled
  twice.
- Scope, evidence and boundaries are on the same screen: the model card records
  that the model has **no ventilation and no gravity** — it cannot say how hard
  someone is breathing, and it fills the lung evenly where real oedema is basal.

### The organ layer, checked the way the heart was

Every organ builder in `src/scenes/*/organs/` was measured against the
anatomical relationships it claims, rather than looked at. Three defects came
out of it, all of them the kind that stays invisible while an organ is alone in
the frame:

- **The spleen presented its hilum to the ribs.** It is a left-sided organ, so
  its concave visceral surface faces the midline; built facing the other way, it
  only went wrong once something placed it in a body — and in the
  cirrhosis/portal-pressure model the splenic vein was drawn starting half a
  unit away from the notch it is supposed to leave by. The spleen now carries a
  declared medial axis, and the scene places it by its hilum instead of by a
  position typed beside the vessel's.
- **The heart's aorta label pointed at the right atrium.** When the aortic arch
  was corrected to sweep over the patient's left, the label naming it stayed on
  the far side of the midline. It is now derived from the arch itself.
- **Hollow organs were far more opaque than they asked to be.** A closed
  double-sided wall is crossed twice, so a stomach asking for 0.84 rendered at
  0.97 and passed 2.6% of its contents instead of 16%. Gastric and intestinal
  contents — the subject of both scenes that draw them — are now visible through
  the wall: measured on a real render, the bowel's visible contents went from
  137 pixels to 1938, and the brightest contents in the stomach doubled.

None of this changes a medical claim or a number; all of it changes whether the
picture says what the code says it says. `tests/organ-anatomy.test.js` now holds
the relationships in place — sides, medial and lateral, labels pointing at the
structures they name, nested organs staying nested, and every shape setter
returning to where it started.

### A landing page you can actually touch

- The first screen now contains a working circulation comparison, not an
  abstract product illustration. Baseline, fluid-responsive and dobutamine
  states read MAP, cardiac output and calculated global DO₂ from the same solver
  as the full circulation model.
- All nine public models are visible from the landing page. Each starts with a
  concrete question and a three-part mechanism trace, and reports implementation
  maturity separately from clinical-review state.
- A restrained Canvas 2D flow field gives the page a living blood-flow texture.
  It is explicitly decorative, capped by device class, reduced for Save-Data,
  paused in hidden tabs and static under reduced-motion preferences.
- The page no longer claims that every core model is “accurate” or that mature
  software is clinically reviewed. Trust, scope and evidence now appear before
  the catalogue rather than near the bottom of the page.

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
