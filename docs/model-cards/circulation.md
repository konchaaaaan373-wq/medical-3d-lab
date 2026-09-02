# Model card — circulation, pressure and calculated global oxygen delivery

| | |
| --- | --- |
| **Scene** | `circulation` |
| **Model** | [`src/models/circulation.js`](../../src/models/circulation.js) |
| **Evidence** | [`docs/model-evidence/circulation.md`](../model-evidence/circulation.md) |
| **Tests** | [`tests/circulation-model.test.js`](../../tests/circulation-model.test.js) |
| **Status** | see [`src/catalog/scenes.js`](../../src/catalog/scenes.js) |

## 1. What question this model answers

**In one constructed low-flow case, can MAP remain near 70 while cardiac
output and calculated global oxygen delivery rise?**

## 2. What it is

An educational, steady-state lumped model with exactly three mutually
exclusive states: baseline, an explicitly fluid-responsive state and a
dobutamine-responsive state. It isolates the fact that MAP depends on both flow
and resistance, while calculated global DO₂ depends on flow and arterial oxygen
content.

## 3. What it is not

Not a patient simulator, resuscitation protocol, dose-response model or fluid
challenge. The controls are states, not doses, and there is no combined arm.

## 4. Inputs

| Input | Values | Meaning |
| --- | --- | --- |
| `intervention` | `baseline`, `fluid`, `dobutamine` | One selected teaching state. |

HR, CVP, Hb, SaO₂ and PaO₂ are fixed. The two response states change SV and,
for dobutamine only, SVR.

## 5. Outputs

Displayed: MAP [mmHg], unindexed CO [L/min], and **calculated global DO₂**
[mL O₂/min]. Internal outputs include SV, SVR and CaO₂. No output is a patient
measurement.

## 6. State variables

There is no time-evolving physiological state. The selected intervention key
chooses one immutable parameter set; every output is derived from it.

## 7. Governing relations

- `CO = HR × SV / 1000`
- `MAP = CVP + CO × SVR / 80`
- `CaO₂ = 1.34 × Hb × SaO₂ + 0.003 × PaO₂`
- `DO₂ = CO × 10 × CaO₂`

These are steady-state definitions/relations, not a pulsatile circulation or
distributed oxygen transport solver.

## 8. Constants and where they came from

The relations come from standard haemodynamics and oxygen-content physiology.
The baseline numbers and response multipliers were selected by this repository.
Every claim, source and access limitation is recorded in the evidence dossier
and machine-readable evidence registry.

## 9. Calibration vs measurement

The reference SVR is back-calculated so the constructed low-flow baseline lands
at MAP 70. The response multipliers are illustrative. Nothing was fitted to a
cohort, and none of these numbers is a measured or expected patient response.

## 10. What is exaggerated for visibility, and what is not

Particle rates, distal calibre and band opacity are presentation mappings.
Pink particles cue relative flow, cyan bands cue distributed tone, and yellow
particles cue oxygen carried per minute. The model outputs themselves are not
altered for visual effect. Tissue remains neutral because tissue oxygenation is
not calculated.

The landing page mounts this same `CirculationScene` in its 3D workbench. It
does not maintain a second anatomical scene or a second medical presentation
mapping. The ambient particles behind the page are decorative and are not a
circulation output.

## 11. Known failure modes

- A lumped steady-state relation omits pulsatility, compliance and wave reflection.
- CO and DO₂ are unindexed; body size and metabolic demand are absent.
- The fluid state assumes responsiveness before the control is selected.
- Fixed CaO₂ omits haemodilution and gas-exchange change.
- There is no microcirculation, flow distribution, extraction, VO₂ or lactate.
- The dobutamine direction comes from a small historical heart-failure cohort.
- There are no filling pressures, congestion, arrhythmia, myocardial oxygen
  demand, adverse effects or treatment interactions.

## 12. What it must never be used for

Diagnosis, declaring circulation adequate, choosing or dosing fluid or
dobutamine, predicting response, comparing treatments, or estimating tissue or
organ perfusion in a person.

## 13. Uncertainty

The equations and unit conversions are established. The two clinical sources
support selected directions only and are explicitly thin. Every magnitude,
baseline anchor and visual mapping is a property of this teaching model.

## 14. Where the model could mislead

- MAP 70 may look like a universal target or proof of perfusion; it is neither.
- More global DO₂ may look like brighter or healthier tissue; the model cannot
  establish that, so the tissue is intentionally not recoloured.
- The fluid-responsive arm may imply all patients respond or that fluid is safe.
- The dobutamine arm may imply the same SVR/HR response in every shock phenotype.
- A distal resistance cue may look like one stenosis; three repeated bands and
  a distributed calibre change are used to prevent that localisation.

## 15. Review status

**Catalog status:** `alpha`

Corrected after strict clinical and visual audit on 2026-09-01. The audit
removed cumulative intervention buttons, a hidden fluid-induced SVR change,
tissue glow driven by global DO₂, and a single ring that looked like a local
stenosis. The source access limitations still prevent a higher status.

## 16. How to check it

- **External physiology:** `node --test tests/circulation-physiology.test.js`
  checks only the supported directions, without exact response sizes.
- **Model integrity:** `node --test tests/circulation-model.test.js` checks
  equations, exclusivity, baseline comparisons and the 3D/state mapping.
- **Calibration behaviour:** `node --test tests/calibration.test.js` checks the
  MAP anchor, illustrative multipliers and fixed-CaO₂ isolation.
- **Evidence governance:** `node --test tests/evidence.test.js` checks that
  confidence, dossier IDs and test layers agree.
