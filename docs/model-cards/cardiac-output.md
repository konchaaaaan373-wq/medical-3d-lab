# Model card — cardiac output: filling, resistance, contractility and rate

| | |
| --- | --- |
| **Scene** | `cardiac-output` |
| **Model** | [`src/models/cardiacOutput.js`](../../src/models/cardiacOutput.js) on [`src/models/cardiacMechanics.js`](../../src/models/cardiacMechanics.js) |
| **Evidence** | [`docs/model-evidence/cardiac-output.md`](../model-evidence/cardiac-output.md) |
| **Tests** | [`tests/cardiac-output-model.test.js`](../../tests/cardiac-output-model.test.js), [`tests/cardiac-output-physiology.test.js`](../../tests/cardiac-output-physiology.test.js) |
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

## 12. What it must never be used for

Diagnosis. Treatment selection. Dose selection. Prognosis. Predicting what any
manipulation would do to a patient. Estimating a fluid requirement. Reading the
circulating stressed volume as a blood volume or as a volume of fluid to give.
Reading the mean systemic venous pressure as a central venous pressure — there
is no right atrium in this model.

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
  rate control.** It is not true in general and it is not true everywhere in
  this model; the tests deliberately refuse to encode it, and there is a
  condition inside the declared range where raising the rate lowers the output.
- **Two conditions shown side by side look like a before and an after.** They
  are two settled states. The time between them on screen is the time the
  browser took.
- **The reduced-contractility preset may be read as "heart failure".** It is a
  ventricle with lower elastance and nothing else changed. The clinical
  syndrome has remodelling, fluid retention, neurohormonal activation and a
  changed vasculature, none of which is here.

## 15. Review status

**Catalog status:** `alpha`

No clinical review has been carried out on this scene. The model layer, the
evidence dossier, this card and the scope panel are in place; the fourth
condition for `reviewed` — a clinician's reading — has not happened, and the
`Prototype` badge stays until it does.

Suga & Sagawa (1974) is cited for the framework. Its bibliographic record was
confirmed; the full text was not read for this work and nothing here is fitted
to it.

## 16. How to check it

- **External physiology:** `node --test tests/cardiac-output-physiology.test.js`
  — the mean is a mean, ΔP = Q·R, the valve window is the flow window, and the
  three directional claims with the conditions they hold under.
- **Model integrity:** `node --test tests/cardiac-output-model.test.js` — the
  definitions, the units both ways, refusal outside the range, route
  independence, and the whole declared domain settling into a periodic beat.
- **The range itself:** `node scripts/sweep-cardiac-output.mjs`, and
  `--probe` to see where it gives way outside.
- **Evidence governance:** `node --test tests/evidence.test.js`.
