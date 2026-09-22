# Model card — cardiac output: filling, resistance, contractility and rate

| | |
| --- | --- |
| **Scene** | `cardiac-output` |
| **Model** | [`src/models/cardiacOutput.js`](../../src/models/cardiacOutput.js) and [`src/models/cardiacInterventions.js`](../../src/models/cardiacInterventions.js), on [`src/models/cardiacMechanics.js`](../../src/models/cardiacMechanics.js) |
| **Evidence** | [`docs/model-evidence/cardiac-output.md`](../model-evidence/cardiac-output.md) |
| **Tests** | [`tests/cardiac-output-model.test.js`](../../tests/cardiac-output-model.test.js), [`tests/cardiac-output-physiology.test.js`](../../tests/cardiac-output-physiology.test.js), [`tests/cardiac-output-interventions.test.js`](../../tests/cardiac-output-interventions.test.js), [`tests/cardiac-output-learning.test.js`](../../tests/cardiac-output-learning.test.js) |
| **Status** | see [`src/catalog/scenes.js`](../../src/catalog/scenes.js) |

## 1. What question this model answers

**When you change what returns to the heart, what it pushes against, how hard
it squeezes, or how often it beats — what happens to stroke volume, cardiac
output and blood pressure, and why?**

It answers that as a comparison between conditions that have each been allowed
to settle. Not as a time course.

## 2. What it is

The closed-loop seven-compartment time-varying elastance circulation already in
this repository, with a boundary in front of it that fixes which four
parameters a reader may move, over what range, in what units, and what counts
as a settled answer. Every figure on the screen — the chamber on the 3D, the
read-out, the pressure-volume loop, the waveform, a lesson's comparison, a
video's subtitle — is read from one solved beat.

## 3. What it is not

Not a patient simulator. Not a time course: the difference between two results
is the difference between two steady conditions, not a drug taking effect or
the minutes after a bolus. Not a fluid-responsiveness test. Not a dose-response
model. Not a model of the heart-failure syndrome — the reduced-contractility
preset changes one parameter and nothing else.

## 4. Inputs

Four, each with a clinical name, a unit and a range fixed by sweep rather than
by judgement (`scripts/sweep-cardiac-output.mjs`).

| Input | Unit | Range | Reference |
| --- | --- | --- | --- |
| `fillingVolumeMl` — circulating **stressed** volume | mL | 540–980 | 710 |
| `systemicResistanceMmHgSPerMl` | mmHg·s/mL | 0.7–1.8 | 1.1 |
| `contractilityEesMmHgPerMl` — LV end-systolic elastance | mmHg/mL | 0.8–4.0 | 2.74 |
| `heartRatePerMin` | /min | 50–110 | 70 |

Held fixed: unstressed volume, the curvature of the end-diastolic
pressure-volume relationship, every passive compliance, the pulmonary
resistances, the valve resistances, the right ventricle, the left atrium, and
the myocardial volume and cavity shape used to draw the chamber.

An input outside its range is **refused**, not clamped, and a refusal produces
no numbers. The same check runs whether the input came from a slider, an
intervention, a lesson or the video sequence.

### Interventions

Two, mutually exclusive, each a change to the inputs above rather than a
multiplier on anything below them.

| Intervention | Changes | Deliberately does not change |
| --- | --- | --- |
| More circulating filling | stressed volume, +120 mL | resistance, elastance, rate |
| Dobutamine, a schematic example (rate held) | elastance ×1.5 **and** resistance ×0.85, together | **rate**, filling |

Both are computed from the preset's starting condition, so choosing the same
one twice produces the same condition twice — and clearing one, or moving a
slider, returns there. There is no second condition remembered behind the
scenes: a state a reader cannot see and a snapshot cannot carry is a state whose
meaning changes silently across a sequence or a lesson. An effect that falls outside the
verified range is refused rather than clamped — dobutamine from the reference
heart is, which is why it is offered on the condition its evidence comes from.

**Dobutamine here is a compound change with the heart rate held.** Elastance and
resistance move together and nothing varies one while holding the other, so the
result cannot be attributed to either: it shows what a chosen pair of changes
does, not what each contributes.

**Holding the rate is this scene's condition, not a property of the drug.** The
one study read for this reports no change in heart rate over 2.5–10 µg/kg/min in
thirteen patients with cardiomyopathic heart failure; the manufacturer's
labelling describes both an output rise without a marked increase in rate and a
rise in rate with tachycardia among the adverse reactions. One study in one
population is not a general rule. The magnitudes are illustrative; see §9.

## 5. Outputs

EDV, ESV, stroke volume, ejection fraction, cardiac output, heart rate, mean /
systolic / diastolic arterial pressure, peak ventricular pressure, LV
end-diastolic pressure, mean left atrial pressure, mean pulmonary venous
pressure, mean systemic venous pressure, mean systemic flow, the four phase
boundaries of the beat, and the recorded trace the loop and the waveform are
drawn from.

## 6. State variables

Seven compartment volumes: left ventricle, systemic arteries, systemic veins,
right ventricle, pulmonary arteries, pulmonary veins, left atrium. Their sum is
the conserved quantity.

## 7. Governing relations

- Chamber pressure: `a·Ees·(V − V0) + (1 − a)·A·(exp(B·(V − V0)) − 1)`, with `a`
  a normalised double-Hill activation of cycle phase.
- Passive compartment pressure: `V / C`.
- Valve flow: `(P_up − P_down)/R` when the gradient is forward, otherwise zero.
- Bed flow: `ΔP / R`.
- Integration: classical RK4, 240 steps per beat, repeated until the beat
  settles; diagnostics measured on a further beat at 960 steps.

## 8. Constants and where they came from

The passive compliances, pulmonary and valve resistances, right ventricle and
left atrium are the heart-failure model's circulation constants, written out
rather than imported so that a model does not import copy — and checked
identical by test. They are calibration parameters of a lumped model. None is a
measurement.

## 9. Calibration vs measurement

Nothing in this model is a measurement. The reference condition is a
calibration: values chosen so a reference case lands in the range textbooks
describe for a healthy adult. The reduced-contractility preset's elastance is
**illustrative** — chosen so the difference is legible, with no source behind
the magnitude.

Reading the model's `Ees` against a clinically derived end-systolic elastance
would be reading a fitted constant as a finding.

## 9.5 The lesson and the sequence

One lesson — raising systemic vascular resistance — and one fifteen-second
sequence of the same manipulation. Both drive the model through the same public
controls the sliders use and read their figures out of the same read-out, so
neither can show a number the interactive page would not, and neither has a
private path into the model.

Every stored answer in the lesson is re-derived from the solver by
`tests/cardiac-output-learning.test.js`, including the transfer claim that the
fractional loss of stroke volume is larger in the lower-elastance ventricle. The
sequence's copy contains no measurement at all; a test fails if a digit with a
unit on it appears in it.

The sequence compares two settled conditions. The seconds between them are the
camera's, and every frame carries a note saying so, because any one second of it
will travel on its own as a screenshot.

## 10. What is exaggerated for visibility, and what is not

Nothing medical. The controls span a wider range than a resting adult moves
through, deliberately, because the point is to see the relationships; the
values themselves are not exaggerated, the range they are offered over is wide.

Presentation-only quantities in the scene — particle rate, emissive intensity,
the calibre cue on the resistance segment, opacity — carry presentation names
and never enter the solver. The vessel calibre cue is a qualitative
arteriolar-tone signal and is not a diameter, a Poiseuille calculation or a
stenosis.

## 11. Known failure modes

- **Outside the declared range, at very low elastance with high filling and a
  low rate, EDV − ESV stops being the aortic throughput** — the ventricle fills
  while it ejects, and "stroke volume" stops meaning one thing. The boundary
  checks this on every solve and refuses the condition. The declared range stops
  well short of it.
- **The ventricle can settle while the venous reservoir is still drifting.** The
  solver's termination test reads one chamber. The boundary continues the
  integration until all seven compartments repeat; without that, one corner of
  the range reported a beat that was not periodic.
- **Tachycardia is under-represented** (see §13).
- A warm start from a distant condition is rescaled to the requested conserved
  volume, which is a numerical initialisation and not a physiological
  redistribution.
- **End-diastolic pressure was sampled where the step grid decided, not at an
  event.** It was read at the sample of highest left-ventricular volume, and at
  end-diastole the volume is on a plateau while the pressure is on the
  isovolumic upstroke — so the figure depended on which sample happened to hold
  the maximum. It did not converge: at Ees 2.74 / filling 980 mL / SVR 1.8 /
  50 min⁻¹ it read 17.67, 16.25, 15.69 and 15.46 mmHg at 240, 480, 960 and 1920
  steps per beat, while the **volume** agreed to 0.002 mL. It is now read at
  mitral-valve closure, which is what end-diastole is, and the same four
  resolutions give 15.275 to 15.295. Fixed 2026-09-22; found by the step study
  in §16.
- **One of the boundary's own checks measures nothing, and now says so.**
  `systemicOhmRelative` compares mean flow × resistance with the mean systemic
  gradient. The systemic flow *is* defined as (P_sa − P_sv) / R, and R is
  constant, so the comparison is an identity: it returns 5×10⁻¹⁶ at the
  reference and 1.5×10⁻¹⁵ at the corners, and it would do so however wrong the
  integration was. It is kept as a wiring check — it would catch a resistance
  read from the wrong parameter — and it is **not** evidence of numerical
  accuracy. An external reviewer found this; the checks that do carry that
  evidence are in §16.

## 12. What it must never be used for

Diagnosis. Treatment selection. Dose selection. Prognosis. Predicting what any
manipulation would do to a patient. Estimating a fluid requirement. Reading the
circulating stressed volume as a blood volume or as a volume of fluid to give.
Reading the mean systemic venous pressure as a central venous pressure — there
is no right atrium in this model.

And specifically of the interventions: reading either as a dose, combining
them, reading the volume intervention as a fluid bolus, or reading the
dobutamine response as what a person would do.

**Noradrenaline is absent on purpose, and the reason is not that there is no
venous compartment** — there is one, with a compliance. What is missing is a
way for a *drug* to act on it: no venous tone, no change in unstressed volume,
no redistribution between compartments. Without that, noradrenaline reduces to
"the drug that raises resistance", and the observed response is not that: in
septic shock with life-threatening hypotension, early noradrenaline has been
reported to raise preload and cardiac output as well. Neither that study's
population nor its effect sizes transfer here, and none is claimed; what it
supports is refusing to publish the reduction.

## 13. Uncertainty

- **Systolic duration is a fixed fraction of the cycle.** The activation
  function is defined on normalised phase, so raising the rate compresses
  systole and diastole equally. In a real heart systole shortens proportionally
  less, so diastolic filling time is lost faster than it is here, and the rate
  at which filling starts to limit output is later in this model than in a
  person. Narrowing the range would not remove this; it is stated instead.
- **Nothing responds to anything.** There is no baroreflex, no chemoreflex, no
  neurohormonal axis and no autoregulation. That is what makes a one-factor
  experiment readable, and it is the largest gap between this and a person, in
  whom none of these four can be moved without the others answering.
- The magnitude of every response is uncalibrated. Directions are claimed.

## 14. Where the model could mislead

- **"Preload" is shown as circulating stressed volume, and a reader may hear
  "how much fluid".** The scene names the quantity and its unit next to the
  control for that reason, and the model card says it here: this is the
  pressure-generating part of the volume in a closed loop with nowhere for fluid
  to go. It is not a bag of saline.
- **"Afterload" is shown as systemic vascular resistance, which is one
  component of afterload and not all of it.** Arterial compliance, wave
  reflection and the aortic valve are all part of what the ventricle works
  against, and only the first of those exists here, held constant.
- **A reader may take "raise the rate and output rises" from playing with the
  rate control, and nothing this model has been observed to do will contradict
  them.** Stroke volume does fall as the rate rises — each beat fills less —
  but the product rose at every sampled pair.

  What was measured, exactly (`npm run sweep:cardiac-output -- --rate`,
  2026-09-22): Ees at 0.8, 1.2, 1.6, 2.0, 2.4, 2.74, 3.2, 4.0 mmHg/mL; filling
  at 540, 650, 710, 830, 980 mL; SVR at 0.7, 1.0, 1.1, 1.4, 1.8 mmHg·s/mL;
  rate from 50 to 110/min in steps of 5. The full product of the four axes:
  **2600 states solved, all valid, 2400 adjacent pairs in rate compared at
  fixed everything else.** A fall counted at more than 1×10⁻⁶ L/min. **No fall
  was found.** The smallest change seen was **+0.023 L/min**, at Ees 0.8,
  filling 540 mL, SVR 1.8, going from 105 to 110/min.

  **That is a finite grid, and it is all it is.** It says nothing about the
  conditions between those points, and the controls are continuous within their
  steps. This section does **not** claim the model is monotonic in rate over
  its whole domain.

  **Why is not established.** The limitation in §13 — systole is a fixed
  fraction of the cycle, so filling time is lost more slowly here than in a
  person — is the obvious candidate, and it is a **hypothesis this repository
  has not tested**: doing so needs the time model changed and the two compared,
  which has not been done. Whether a turn-over exists outside the declared
  range is likewise **unmeasured**; an earlier version of this section asserted
  one inside it, from the same kind of reasoning, and it was not there.

  The tests refuse to encode "faster is more" as a fact about hearts. What they
  pin is that stroke volume falls, that output is the product rather than the
  rate, and — as a **characterization test of the current build, not a rule of
  physiology** — that the sampled grid still contains no fall, so that a change
  to the time model is noticed rather than absorbed.

  An earlier version of this section claimed the opposite — that a condition
  inside the range existed where raising the rate lowered output. Nothing had
  measured it, and measuring it found none (L-95).
- **Two conditions shown side by side look like a before and an after.** They
  are two settled states. The time between them on screen is the time the
  browser took.
- **The reduced-contractility preset may be read as "heart failure".** It is a
  ventricle with lower elastance and nothing else changed. The clinical
  syndrome has remodelling, fluid retention, neurohormonal activation and a
  changed vasculature, none of which is here.

## 15. Review status

**Catalog status:** `alpha`

### Revision 7 — end-diastole is an event, not the tallest sample

**A displayed number changed.** End-diastolic pressure is read at mitral-valve
closure instead of at the sample where left-ventricular volume is highest.

The old definition is ill-conditioned exactly where it is used. At end-diastole
dV/dt → 0 while dP/dt is large, so the sample that happens to hold the maximum
volume decides the pressure, and the answer moves with the step size without
converging: 17.67 / 16.25 / 15.69 / 15.46 mmHg at 240 / 480 / 960 / 1920 steps
per beat at one corner, still falling at the finest. End-diastolic *volume*
agreed to 0.002 mL across the same four. Read at valve closure: 15.275 /
15.286 / 15.292 / 15.295.

**What moved, against `main`** — re-aggregated over every stored number in the
fixture, not a field chosen by hand (`npm run fixture:cardiac -- --baseline
<main's copy> --record`, saved in
[`../model-evidence/cardiac-output-measurements.json`](../model-evidence/cardiac-output-measurements.json)):

| | |
| --- | --- |
| fields compared | 32, across 30 cases |
| fields that moved | **1** — `endDiastolicPressureMmHg` |
| cases it moved in | **30 of 30**; 29 lower, **1 higher** |
| largest change | **2.186 mmHg** at `preloadMax@0.18`, 17.653 → 15.467 |
| at this scene's reference | 7.2120 → 7.2108, a change of 0.0011 |

An earlier revision of this section said "up to 1.4 mmHg … all downward". Both
halves were wrong: the figure came from an intermediate definition and a
partial comparison, and one of the thirty cases rises.
`docs/model-cards/heart-failure.md` carries its own note.

`tests/cardiac-output-model.test.js` now requires the figure to agree between
240 and 960 steps per beat, which the old definition fails by 3.5 mmHg. The
fixture that pins the shared solver has a recorder,
`scripts/record-cardiac-fixture.mjs`, so that accepting a deliberate change is
a command with a printed diff rather than thirty rows of hand-edited JSON.

Found by the step study an external reviewer asked for. Nothing in the scene's
own tests could have found it: they compared the model against itself at one
resolution.

### Revision 6 — two checks that measure something, and one that never did

An external review asked what the boundary's checks actually establish. One of
them establishes nothing: `systemicOhmRelative` is an identity (§11), returning
machine epsilon regardless of how the integration went. It stays as a wiring
check and is no longer counted as numerical evidence.

Two checks were added in its place, both about the loop rather than about one
equation evaluated twice:

- **Per-compartment balance over the beat.** For each of the seven
  compartments, integrated inflow minus integrated outflow against its own
  volume change. Worst over the declared domain: 0.0162 mL (left ventricle, Ees
  0.8 / filling 980 mL / SVR 1.1 / 50 min⁻¹), tolerance 0.5 mL.
- **The same over a twenty-fourth of the beat.** This is the one that catches a
  mis-wired loop, which the whole-beat form cannot: in a series circulation at
  steady state every flow integrates to the same stroke volume, and all three
  mis-wirings below leave the whole-beat residual at 0.007 mL. Correctly
  wired, the worst residual over the 865-condition sweep is **0.5289 mL**;
  mis-wired it is **18.32 / 5.87 / 4.91 mL** for three different mistakes, all
  refused. The tolerance, **1.6 mL**, is the geometric midpoint of those two
  populations — 3.0× above the worst honest residual and 3.1× below the
  smallest error detected.

  The window endpoints were **one step out** until 2026-09-22: `walkBeat`
  visits before integrating, so a window closed with the volumes its last
  visit was given compared an integral over one interval with a volume
  difference over another. Corrected, and the ledger that does the arithmetic
  is driven directly with known inputs by
  `tests/cardiac-output-ledger.test.js`. The slip was real and was not the
  dominant term: the reference residual moved 0.2937 → 0.3025 mL.

  An instantaneous form was tried before the windowed one and abandoned, for
  discretisation rather than that slip: measured with a forward difference
  over the interval its flows act on, the residual with the loop wired
  correctly is 43.2 mL/s at 960 steps and 12.2 at 3840. **The figure first
  recorded here, “85 mL/s”, is not reproducible as stated** — a backward
  difference gives 45.1 at 960. (It is in quotation marks because
  `tests/cardiac-output-claims.test.js` reads an unquoted figure as a claim:
  a document may say a number was wrong, not state it.)

**No figure this scene shows moved.** Every recorded reference value is
bit-identical to what the previous revision produced; the change adds
measurement and removes nothing. The publication decision was re-pinned to this
revision on that basis, and the gate closed in between — which is the mechanism
working, not a problem: it cannot tell a new diagnostic from a changed model,
so it stops and asks.

### Correction to revision 5 (2026-09-22) — §14 asserted a condition that does not exist

§14 warned that a reader might take "faster is more" from the rate control, and
then said the model would contradict them somewhere inside the declared range.
**No such point was found.** The claim was written from the shape of the
physics — each beat fills less, so at some rate the product must turn over —
and nothing measured whether that point falls inside the range this model
solves.

`npm run sweep:cardiac-output -- --rate` now measures it and prints what it
measured: 2600 states over the full product of four axes, 2400 adjacent pairs
in rate, no fall above 1×10⁻⁶ L/min, smallest change +0.023 L/min. §14 quotes
those numbers and says in its own words that a finite grid is a finite grid.

**A first attempt at this correction overshot** and wrote that output "is
monotonically increasing in rate", which is a claim about the whole continuous
domain that a sweep cannot support, and asserted §13's fixed-fraction systole
as the cause and a turn-over outside the range as a fact. All three are now
marked as what they are: a sampled result, an untested hypothesis, and an
unmeasured question. The reviewer who caught this is credited in
`docs/reviews/cardiac-output-external-review-request.md`.

`tests/cardiac-output-physiology.test.js` pins the sampled result as a
characterization test of the current build, and
`tests/cardiac-output-claims.test.js` pins the card's own wording, so that the
retracted sentence cannot come back without a test going red.

**No model source changed**, so the registry revision does not move and the
publication decision stays pinned to revision 5 — this is a correction to what
the card said about a model that is unchanged, not a change to the model.

Found while writing an external-review request that quoted the card back at
itself and checked the quote. L-95.

### Revision 5 — the hidden undo target, and the beat that jumped

Two findings from an automated reviewer on the pull request, both real.

Clearing an intervention used to return to whatever the reader had set by hand
before choosing it. Nothing on screen showed that condition and
`captureSessionState` could not carry it, so after a sequence or a lesson it was
gone and "clear" quietly meant something else than it had a minute earlier. The
condition is no longer remembered at all: clearing an intervention, or moving a
slider while one is selected, lands on the preset's starting condition — one
rule, the same before and after a round trip, and the preset chip on screen says
where it goes. What the change does not alter is the thing that matters: an
intervention is still computed from the baseline, so a drug's effect cannot be
added on top of a hand-set condition.

And the fifteen-second sequence restarted its slowed beat from phase zero while
the beat had reached 0.81 — a step forty times an ordinary one, skipping late
diastole and snapping the chamber, the valves and the blood at exactly the
moment the close-up on the residual blood begins. It now decelerates from where
it had got to. The tests asserted that the slow beat was slower; they did not
assert that it was continuous, and now they do.

### Revision 4 — a claim in §2 that was not true of one path

§2 says every figure on the screen is read from one solved beat, so the picture
and the read-out cannot disagree. A review found one path where they did:
switching preset while the comparison was on left the read-out's "before" column
on the new baseline and the heart drawn beside it on the old one, because the
comparison heart was refreshed when the Compare *button* was pressed rather than
when a *control* was. Choosing an intervention that belongs to the other preset
went the same way. Nothing threw and nothing was red.

It is fixed and guarded, and the claim in §2 is now true of every path.
Separately, restoring a session replayed each control at its captured value,
which with an intervention selected counted as manual moves and deselected it —
the sliders holding a drug's condition under a chip reading "none". Setting a
control to the value it already has is now not moving it.

### Revision 3 — dead surface removed

No behaviour changed and no number moved. A self-review found four exported or
public things nothing called: a `setPresence` on the comparison heart, a
`controlValues()` on the session, a re-export of `referenceInput` from the
scene "for the tests" that the tests never used, and a `HEART_RATE_LIMITATION`
constant in the model.

The last one is worth the sentence. It was prose in a model — which
`src/models/README.md` rule 6 forbids — and it was a *third* copy of a statement
that already exists as a machine-readable evidence entry (`phase-scaled-systole`)
and as the caution a reader actually sees on the scope panel. Three copies of one
claim is two chances for it to drift. The fact now lives once in each place it
has a job: the registry records it, the scope panel says it, and a comment on the
control explains why.

### Revision 2 — interventions, a lesson and a sequence

Adds `src/models/cardiacInterventions.js` (two interventions as input
transforms), one lesson and one fifteen-second sequence. No claim in revision 1
changed and no parameter moved. The one new primary citation is Leier et al.
1978, read as its published abstract, for the direction of the dobutamine
response — including the heart rate it does **not** change.

No clinical review has been carried out on this scene. The model layer, the
evidence dossier, this card and the scope panel are in place; the fourth
condition for `reviewed` — a clinician's reading — has not happened, and the
`Prototype` badge stays until it does.

Suga & Sagawa (1974) is cited for the framework. Its bibliographic record was
confirmed; the full text was not read for this work and nothing here is fitted
to it.

## 16. How to check it

- **External physiology:** `node --test tests/cardiac-output-physiology.test.js`
  — the mean is a mean, ΔP = Q·R, the valve window is the flow window, the
  directional claims with the conditions they hold under, the dobutamine
  directions against the cited study, and the lesson's own claim.
- **Model integrity:** `node --test tests/cardiac-output-model.test.js` — the
  definitions, the units both ways, refusal outside the range, route
  independence, and the whole declared domain settling into a periodic beat.
- **Every compartment's books balance, twice.** Over the whole beat, what
  crossed each compartment's two boundaries equals what its volume did: worst
  0.0162 mL over the declared domain, against a 0.5 mL tolerance. And over a
  twenty-fourth of the beat, which is the check that catches a **mis-wired
  loop** — over a whole beat in a series circulation every flow integrates to
  the same stroke volume, so connecting a compartment to the wrong neighbour
  changes its beat total by thousandths of a millilitre and passes. Within a
  window it does not: 0.29 mL wired correctly, 18.3 mL with the systemic veins
  connected to the pulmonic valve, and the solve refused.
- **What the claims say, as opposed to what the model does:**
  `node --test tests/cardiac-output-claims.test.js` — a string-level check on
  this card, because a sentence it does not support is invisible to every
  numeric test in this list. It exists because §14 carried one for four days
  (L-95).
- **Does the step size change the answer:** `npm run sweep:cardiac-output -- --steps`
  — 81 conditions solved to steady state **independently** at 240, 480 and 960
  steps per beat, compared against the finest on absolute *and* relative
  tolerances together. Checking a 240-step solution with a 960-step closing
  beat only establishes that the 240-step state is periodic, which is a
  different question; an external reviewer pointed that out, and asking this
  one found the end-diastolic pressure defect in §11. As of 2026-09-22 every
  other figure agrees to better than 0.03%: cardiac output 4.6×10⁻⁴ L/min,
  stroke volume 5.9×10⁻³ mL, mean arterial pressure 1.4×10⁻² mmHg.
- **The range itself:** `npm run sweep:cardiac-output`, `--probe` to see where
  it gives way outside, and `--rate` for the rate axis walked and reported as
  the finite grid it is.
- **Interventions and the lesson:** `node --test tests/cardiac-output-interventions.test.js
  tests/cardiac-output-learning.test.js` — inputs only, no accumulation, refusal
  rather than clamping, the two modes' state, and every stored answer re-derived.
- **In a browser:** `VITE_ALLOW_PREVIEW=1 npm run build` then
  `npm run verify:disease -- <dir> cardiac-output`, which drives baseline →
  manipulation → reset, opens Data view and asks each plot whether anything was
  drawn on it, turns the comparison on, walks the lesson to the end and checks
  the model came back, and records the sequence and plays the file back.
- **Evidence governance:** `node --test tests/evidence.test.js`.
