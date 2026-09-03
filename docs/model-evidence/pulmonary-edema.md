# Evidence — pulmonary oedema: where the water goes

Model: [`src/models/pulmonaryEdema.js`](../../src/models/pulmonaryEdema.js).
Boundary and failure modes: [`../model-cards/pulmonary-edema.md`](../model-cards/pulmonary-edema.md).
Machine-readable registry: `PULMONARY_EDEMA_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

**Sourcing honesty.** The physiology here is textbook rather than
primary-literature: the Starling principle, the pulmonary oedema safety factor,
the staging of interstitial before alveolar filling, and the shunt equation are
all standard teaching, and they are cited as such. **No paper was read in full
for this model.** Where a row rests on a general account rather than on a
specific study it is marked **thin**, and no row here claims a quantitative
result from a source this repository has not opened. The magnitudes — the
filtration coefficient, the lymphatic ceilings, the interstitial compliance
curve — are calibrations and inventions of this repository, and they say so.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `starling-equation` — net water flux is `Kf·[(Pc − Pi) − σ(πc − πi)]` | The Starling principle; standard microvascular and respiratory physiology (Guyton & Hall; West). Textbook, not primary. | `starlingFlux()` and `solveFiltration()` | Lumped: one capillary for the whole lung, with no distribution of pressures across it and no glycocalyx refinement of the classical model | `physiology: filtration follows the Starling terms, and only those` |
| `capillary-above-atrium` — capillary hydrostatic pressure exceeds left atrial pressure by a flow-dependent amount | The pulmonary vascular pressure profile: a real, small resistance lies downstream of the capillary. Textbook. | `capillaryPressure()` | Modelled as a linear resistance at a single reference flow. The true partition of pulmonary vascular resistance is neither linear nor fixed | `physiology: raising pulmonary blood flow floods a lung the same atrial pressure left dry` |
| `safety-factor` — three buffers (rising interstitial pressure, rising lymph flow, protein washout) hold water back before alveoli fill | The pulmonary oedema safety factor, conventionally quoted as roughly 20 mmHg above the normal capillary pressure (Guyton & Hall). **thin** — the total is textbook; the split between the three is quoted differently by different accounts | `interstitialPressure()`, `lymphaticClearance()`, `interstitialOncoticPressure()` | The three are independent and additive here. In a real lung they interact | `physiology: three separate buffers hold water back, and removing any one lowers the threshold` |
| `interstitium-before-alveolus` — water fills the interstitium before it reaches an alveolus | The staged anatomy of pulmonary oedema; the radiographic progression from septal lines to alveolar filling. Textbook. | `floodedFraction()`, which is zero below `INTERSTITIUM.floodThresholdMl` | A single sharp threshold stands in for a graded, regionally varying transition | `physiology: the interstitium fills before any alveolus does` |
| `chronic-lymphatic-adaptation` — an adapted lung tolerates a higher pressure | Long-standing mitral stenosis tolerating pressures that would flood an unadapted lung; lymphatic recruitment in chronic pulmonary venous hypertension. **thin** — the direction is well described, the magnitude is not sourced here | `LYMPHATICS.chronicCapacityMultiple`, via `lymphaticClearance()` | Adaptation is a single scalar with no time course. Real adaptation takes weeks and reverses slowly | `physiology: an adapted lung floods at a higher pressure than an unadapted one` |
| `permeability-defeats-oncotic-pressure` — when σ collapses, plasma protein stops protecting | The reflection coefficient's role in the Starling equation; the cardiogenic/non-cardiogenic distinction rests on it. Textbook. | `barrier()`, which lowers σ and raises Kf together | One control moves both, because one injury causes both. A lung that leaked water but still reflected protein cannot be expressed, and does not exist | `physiology: raising plasma protein stops protecting a lung whose barrier has failed` |
| `interstitial-protein-tracks-plasma` — interstitial oncotic pressure falls with plasma oncotic pressure, so hypoalbuminaemia alone is a weak cause | Protein permeability of the pulmonary capillary; the observed weakness of hypoalbuminaemia as an isolated cause of pulmonary oedema. **thin** | `baselineInterstitialOncoticPressure()` | A fixed ratio to plasma. Real equilibration is slow and incomplete, so an acute fall in albumin is less well buffered than this says | `physiology: low plasma protein alone does not flood a lung` |
| `flooded-alveolus-is-a-shunt` — flooded alveoli are perfused and unventilated, so oxygen widens the A–a difference rather than closing it | The definition of shunt; the shunt equation. Textbook. | `oxygenation()`, with Severinghaus's dissociation curve | Flooding is all-or-none per alveolus, and every unflooded alveolus is perfectly ventilated. There is no V/Q scatter between the two | `physiology: oxygen widens the A–a difference in a shunt instead of closing it` |

## 2. What this repository chose

These are not findings. Each is a number picked so that a reference case lands
where the teaching literature puts it, and each is pinned by a test in
`calibration.test.js` so that moving it has to be deliberate.

| Id | What was chosen | Calibrated to |
| --- | --- | --- |
| `filtration-coefficient` | `REFERENCE.filtrationCoefficient` = 20 mL/h/mmHg | A resting lung filtering at its lymph flow (≈20 mL/h) against a net Starling pressure of about 1 mmHg. Published pulmonary Kf values vary by an order of magnitude with method and species; **this is not one of them** |
| `flooding-threshold` | Nothing — the threshold is searched for by `floodingThresholdMmHg()` | The constants that place it are set so an unadapted lung floods in the mid-twenties mmHg, the conventional teaching figure |
| `lymphatic-capacity` | `acuteCapacityMultiple` 4.6, `chronicCapacityMultiple` 19 | Invented multiples. Chosen for the *gap* between an unadapted and an adapted lung, not for either number |
| `interstitial-compliance` | The pressure–volume curve and `floodThresholdMl` | Invented curve, scaled so reported extravascular lung water spans the range a thermodilution monitor reports: about 5 mL/kg dry, about 10 mL/kg at the onset of oedema |
| `hypoxic-diversion` | `ALVEOLAR.hypoxicDiversion` = 0.32 | Invented. Chosen so diversion reduces the shunt without abolishing it |

## 3. What the model does not have

Recorded as `uncertain` entries in the registry, because a marked absence is
more use to a reader than silence.

| Id | What is missing | Why it matters |
| --- | --- | --- |
| `no-ventilation` | No tidal volume, no respiratory rate, no work of breathing, no CO₂ | Breathlessness is the symptom this disease presents with, and this model cannot produce it. Nothing the scene says about effort comes from here |
| `no-gravity` | No gravitational gradient; filtration is uniform | Real oedema is basal, and the radiograph is read on that distribution. A reader who takes the even filling drawn in the scene as the *shape* oedema takes has been misled by the picture rather than by the numbers |

## 4. How to check it

```bash
npm test                                        # everything
node --test tests/respiratory-physiology.test.js  # the eight claims in §1
node --test tests/calibration.test.js             # the five choices in §2
node --test tests/pulmonary-edema-model.test.js   # convergence, monotonicity, determinism
```

## 5. Review status

**Not clinically reviewed.** The scene is `alpha`: it has a model layer, this
dossier, a model card and a scope panel, and no clinician has signed it. See
[`../clinical-reviews/README.md`](../clinical-reviews/README.md) for what a
review would have to settle — the three questions in the model card's *Where the
model could mislead* are the ones to put first.
