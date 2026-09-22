# Cardiac output — evidence dossier

Scene: `cardiac-output` · model: [`src/models/cardiacOutput.js`](../../src/models/cardiacOutput.js)
on top of [`src/models/cardiacMechanics.js`](../../src/models/cardiacMechanics.js) ·
registry: `CARDIAC_OUTPUT_EVIDENCE` in [`src/models/evidence.js`](../../src/models/evidence.js)

**What has been read, and what has not.** The bibliographic record of Suga &
Sagawa (1974) was confirmed; **the full text was not read for this work**, and
no coefficient in this model was fitted to it. The time-varying elastance
framework is used here as a structure, not as a calibration, and every entry
below that rests on it is filed as `supported` — a direction the framework
implies — rather than as a measured magnitude. Rows whose quantitative backing
was not obtained are marked **thin**.

Nothing here has been reviewed by a clinician. The scene is `alpha`.

---

## Claims

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `stroke-volume-definition` — SV = EDV − ESV; CO = HR × SV / 1000 | Standard haemodynamic definitions | `metricsFrom()` reads the solved cycle; `recordCycle()` in `cardiacMechanics.js` computes both | EDV and ESV are the extremes of the solved left-ventricular volume over one settled beat | `stroke volume, ejection fraction and cardiac output are what their names mean` |
| `mean-arterial-pressure-is-an-integral` — MAP is the time average of the arterial pressure | Definition of a mean. The bedside diastolic-plus-a-third estimate is a different quantity with its own error | `recordCycle()` integrates `pressures.sa` over the cycle and divides by the cycle length | The systemic arterial compartment is a single capacitance, so there is one arterial pressure and no wave travel | `mean arterial pressure is the mean of the arterial pressure` |
| `systemic-pressure-flow-resistance` — ΔP = Q·R across the systemic bed | Steady-flow relation | `flowsAt()` computes `(sa − sv) / systemicResistance`; the test re-derives the gradient from the integrated trajectory | The bed is one lumped resistance; no distribution, no non-linearity, no Poiseuille geometry | `the pressure drop across the systemic bed is its flow times its resistance` |
| `valve-timing-from-flow` — the named ejection window is the window in which the aortic valve carries flow | Definition of ejection | `recordCycle()` records the first and last phase at which `q.aortic > 0`; `beatPhaseAt()` partitions the beat on those times | Valves are ideal one-way resistances with no inertia and no closure volume | `the aortic valve is open exactly while the ventricle is ejecting` |
| `afterload-lowers-stroke-volume` — with filling, contractility and rate held, raising resistance lowers SV and raises the pressure the ventricle must generate | Time-varying elastance framework; Suga & Sagawa 1974 (**thin** — record confirmed, full text not read, nothing fitted to it) | `modelParameters()` passes `systemicResistanceMmHgSPerMl` straight through as `systemicResistance` | No reflex response; the direction is claimed, the magnitude is not | `raising afterload alone lowers stroke volume and raises ventricular pressure` |
| `contractility-raises-residual-volume` — lowering Ees alone leaves more blood at end systole, lowers EF and raises filling pressure | As above (**thin**) | `PRESET_OVERRIDES['reduced-contractility']` changes `contractilityEesMmHgPerMl` and nothing else | The preset is a lower-contractility ventricle, not the heart-failure syndrome | `a ventricle with lower contractility ejects less from the same filling conditions` |
| `filling-costs-pressure` — each further increment of filling buys less output and costs more filling pressure | Shape of the non-linear EDPVR; the curvature constant `edpvrB` is this repository's | `chamberPressure()` blends `edpvrA·(exp(edpvrB·ΔV) − 1)` with the elastance term | The shape is claimed. Where a person's useful limit lies is not, and this is not a fluid-responsiveness test | `filling more raises filling pressure faster than it raises output` |
| `intervention-is-an-input-change` — an intervention changes inputs; the solver produces what follows | A property of the implementation, and the rule `cardiacInterventions.js` exists to hold | `applyIntervention()` returns an input object; nothing writes an output | A multiplier on an output cannot be wrong, so it would not be worth testing; an input change can be | `an intervention changes inputs, and nothing else in the pipeline` |
| `dobutamine-direction-and-rate` — output up via stroke volume, resistance down, filling pressure down, **rate unchanged** at 2.5–10 µg/kg/min | Leier et al., Circulation 1978;58:466–475 — thirteen patients with cardiomyopathic heart failure, crossover (**thin** — published abstract only, full text not obtained) | `INTERVENTION_PROFILES.dobutamine`: elastance ×1.5, resistance ×0.85, `heartRatePerMin` declared unchanged | Directions at one dose range in one cohort. The unchanged rate is the study's finding there; at higher doses and in other populations dobutamine is chronotropic and arrhythmogenic, and neither is modelled | `dobutamine reproduces the directions the cited study reports` |
| `intervention-response-sizes` — **illustrative** | No source; chosen so the contrast between the two interventions is legible | `INTERVENTION_PROFILES` | Not doses, not combinable, never a response a person would have | `volume loading buys output, and the filling pressure is what it charges` |
| `volume-intervention-is-not-fluid` — **approximation** | Standard lumped treatment of stressed volume, in a loop with no interstitium, lymphatics or venous tone | `INTERVENTION_PROFILES['volume-loading']`: +120 mL of stressed volume | Nowhere for fluid to leave to, so it cannot say how much anyone should be given, at what rate, or whether | — |
| `resistance-lesson-direction` — resistance up → stroke volume and output down while pressure rises; the fractional loss is larger in the lower-elastance ventricle | Follows from the elastance framework, not from a measurement | `LEARNING_MODULES[0]`; the stored answers are re-derived from the solver on every run | Filling, contractility and rate are all held. Under a reflex, or with filling free to move, the same manipulation does something else | `the resistance lesson teaches what the model actually does` |
| `settled-beat-or-no-numbers` — a condition is reported only when all seven compartments repeat, volume closes, no valve reversed and aortic throughput is the stroke volume | Definition of a periodic steady state and of conservation in a closed loop | `measureBeat()` walks one further beat at 960 steps from the solved volumes; `solveCardiacOutput()` returns `metrics: null` unless every check passes | The tolerances in `DIAGNOSTIC_TOLERANCES` are chosen against the displayed precision, not against machine epsilon | `every condition in the declared domain settles into a genuinely periodic beat` |
| `resistance-unit-conversion` — mmHg·s/mL and dyn·s·cm⁻⁵ are one quantity | Unit definitions | `units.js`: `DYN_S_CM5_PER_MMHG_S_ML = 1333.22` | Checked against the independent bedside route SVR = 80·(MAP−CVP)/CO rather than by calling the conversion twice | `resistance converts between the model unit and the clinical one, checked two ways` |
| `reference-heart-parameters` — **calibration** | Chosen so a reference case lands where the textbooks put a normal adult. The same values the heart-failure model starts from | `CONTROL_DOMAIN[*].default`, `FIXED_CIRCULATION`, `FIXED_LEFT_VENTRICLE` | Nobody measured these. The elastance is not a clinically derived Ees | `the fixed circulation is the heart-failure model's, number for number` |
| `reduced-contractility-preset-magnitude` — **illustrative** | Chosen so the difference is legible on screen. No source sets it and none was sought | `PRESET_OVERRIDES` | The direction and mechanism are claimed; the size of the fall is not | `the two presets differ in contractility and in nothing else` |
| `stressed-volume-is-not-blood-volume` — **approximation** | Standard lumped treatment of unstressed and stressed volume, applied to a loop with no venous tone, no interstitium and no lymphatic return | `p.circulatingVolume`, conserved by `rescaleTo()` | There is nowhere for fluid to leave to, so this must not be read as a fluid balance | — |
| `phase-scaled-systole` — **uncertain, known to point the wrong way** | The activation function is defined on normalised phase | `ventricularActivation(phase)` in `cardiacMechanics.js` | Loss of diastolic filling time with tachycardia is under-represented | — |
| `no-reflex-regulation` — **uncertain** | No baroreflex, chemoreflex, neurohormonal axis or autoregulation is implemented | Nothing in `modelParameters()` reads an output | This is what makes a one-factor experiment readable and is the largest gap between the model and a person | — |

---

## Ranges, and how they were fixed

`CONTROL_DOMAIN` was not chosen. It is the region
[`scripts/sweep-cardiac-output.mjs`](../../scripts/sweep-cardiac-output.mjs)
found to settle: 625 grid conditions (five points on each of four axes,
corners included) plus 240 seeded interior samples, every one of which
converged, conserved its volume and closed its beat inside
`DIAGNOSTIC_TOLERANCES`.

| Control | Range | Reference | Measured headroom at the corners |
| --- | --- | --- | --- |
| Circulating stressed volume | 540–980 mL | 710 | — |
| Systemic vascular resistance | 0.7–1.8 mmHg·s/mL | 1.1 | — |
| End-systolic elastance | 0.8–4.0 mmHg/mL | 2.74 | — |
| Heart rate | 50–110 /min | 70 | — |
| worst periodic residual | | | 0.075 mL against a 0.5 mL tolerance |
| worst stroke-volume/throughput mismatch | | | 0.024 mL against 0.5 mL |
| worst conserved-volume error | | | 0.000 mL against 0.5 mL |
| worst ΔP vs Q·R disagreement | | | below 10⁻⁵ relative against 0.02 |
| beats to settle | | | at most 25, with at most one continuation |
| slowest solve | | | 29 ms (Node 22, this container) |

Read-out reached across the whole domain: cardiac output 1.9–8.4 L/min, mean
arterial pressure 33–203 mmHg, stroke volume 21–99 mL, end-diastolic pressure
2–36 mmHg, ejection fraction 0.16–0.77. **These are the model's outputs over a
deliberately wide teaching range, not a claim that any of those combinations
describes a patient.**

### Where the numerics give way, outside the range

`--probe` widens the domain to 420–1200 mL, 0.5–2.6 mmHg·s/mL, 0.45–5.0
mmHg/mL and 38–160 /min. The failures are all of one kind and all in one
corner: at end-systolic elastance near 0.45, with high filling and a low rate,
EDV − ESV stops being the aortic throughput — by as much as 26 mL. That is not
a solver artefact. A ventricle that weak, that full and that slow is filling
while it ejects, so the difference between its largest and smallest volume is
no longer the volume that left through the aorta, and "stroke volume" stops
meaning one thing. The declared range stops well short of it, and the
diagnostic that caught it is the one the boundary runs on every solve.

---

## The interventions, and what was read for them

`dobutamine-direction-and-rate` is the one row here with a primary study behind
it, and what it cost is worth recording. The obvious thing to implement for a
β-agonist is a rise in heart rate. The study this repository cites reports **no
change in heart rate** over 2.5–10 µg/kg/min in that cohort, so the
intervention holds the rate — and that is the finding rather than a
simplification. Checking before implementing is what stopped a plausible,
wrong effect going in.

What was read: the published abstract, twice, through two independent search
results. **The full text was not obtained** (the publisher and PubMed are both
unreachable from this environment), so the row is marked thin and no
coefficient is fitted to it. What is claimed is the direction of four
quantities in one cohort at one dose range. What is not claimed: any effect
size, any other dose, any other population, any statement that dobutamine
should be given to anyone.

Dobutamine is offered only on the reduced-contractility preset, which is the
condition its evidence comes from. Applying it to the reference heart would
extrapolate a heart-failure cohort onto a normal circulation — and would also
push elastance outside the swept range, where the boundary refuses it rather
than clamping it back in.

**Noradrenaline is deliberately absent.** It cannot be represented as a
resistance change alone: the primary literature this repository has seen
reports it *raising* cardiac preload and output in selected septic patients, so
a model with no venous capacitance to change would have to reduce it to "the
drug that raises resistance", which is the misconception rather than the
teaching. It needs venous capacitance in the solver first, as its own change.

## What this dossier does not cover

Oxygen delivery, extraction and consumption. Lactate. Venous tone as a
controllable. The right heart as a subject rather than as the thing that closes
the loop. Valve disease, arrhythmia, pericardial constraint, ventricular
interaction. Drug pharmacokinetics or time to effect. Any patient.
