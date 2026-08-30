# Model evidence — COPD: expiratory flow limitation and dynamic hyperinflation

Implementation: [`src/models/copd.js`](../../src/models/copd.js)
Boundary of the claim: [`docs/model-cards/copd.md`](../model-cards/copd.md)
Tests: [`tests/copd-model.test.js`](../../tests/copd-model.test.js)

## How these sources were consulted — read this first

This section has been rewritten, and the change matters.

**The models and the teaching text in this scene were corrected against an
external, full-text clinical review.** That review named its sources — GOLD
2026; O'Donnell and colleagues on dynamic hyperinflation; reviews of the
pathogenesis of hyperinflation, of flow limitation, and of dynamic
hyperinflation during induced bronchoconstriction in asthma, in particular
"Dynamic hyperinflation and flow limitation during methacholine-induced
bronchoconstriction in asthma" (PMID 10515404) — and it found real errors,
which are recorded below and in the model card.

**What has not changed is this repository's own access.** The network this
code is built and tested on still cannot reach PubMed, PMC, the ERS and ATS
journals, Nature, Wiley, BMJ or the GOLD site. So nothing here was extracted
from a figure, a table or a methods section by the author of this file. Where a
claim below cites full text, it is citing the external review's reading of it,
and it is doing so for the *proposition* — a direction, a causal order, a
correction — never for a digit lifted out of a paper.

That distinction is the whole point of the paragraph. **Reading a source in
full does not turn a calibration into a measurement.** Every number in this
model that was invented or chosen was invented or chosen before the review, and
is still invented or chosen after it. What the review changed is what the model
*asserts*, not what it *measures*, because it does not measure anything.

The confidence behind each claim is now machine-readable in
[`src/models/evidence.js`](../../src/models/evidence.js), one of
`established` / `supported` / `calibration` / `illustrative` / `uncertain`, and
`tests/evidence.test.js` checks that every asserted claim names a test that
exists and that every calibration and illustrative value says what it is not.
The `Confidence` row in each table below gives the registry id.

## What the review corrected

**The scene taught a proposition that is medically wrong**, and the way it came
to do so is worth recording because the mechanism will recur.

The model derived expiratory muscle pressure from the inspiratory drive. The
drive is a closed loop chasing a ventilation target, so raising airway
resistance silently raised expiratory effort too, and the extra push cancelled
the trapping the longer time constant should have produced. The model then
answered "narrowing the airways does not raise end-expiratory volume", a lesson
was written around that answer, and the tests confirmed the lesson matched the
model. Every layer agreed with every other layer, and the resulting general
proposition — *narrow airways alone do not trap gas* — was false.

Raised airway resistance at a fixed breathing pattern and a fixed expiratory
effort raises end-expiratory volume. Induced bronchoconstriction in asthma
demonstrates it in lungs whose elastic recoil is normal.

Two things changed as a result. The model now keeps **airway resistance,
elastic recoil, expiratory time and expiratory muscle pressure independent of
one another**, with the expiratory pressure open loop. And the suite gained a
second layer, `tests/respiratory-physiology.test.js`, which asserts constraints
the literature imposes rather than checking that this repository agrees with
itself. Internal consistency is the weaker of the two tests a scene has to
pass, and this scene is the proof.

---

## Claim → Source → Implementation → Assumption → Validation

### 1. A lung empties with a time constant equal to R × C

| | |
| --- | --- |
| **Claim** | End-expiratory lung volume is set by the mechanical time constant for emptying — the product of resistance and compliance — together with the inspired tidal volume and the expiratory time available. |
| **Source** | Standard respiratory mechanics (Nunn's *Applied Respiratory Physiology*; West, *Respiratory Physiology*). Restated in the dynamic-hyperinflation literature in almost exactly those words: "end-expiratory lung volume is dynamically determined and varies with the mechanical time constant for emptying (the product of resistance and compliance) of the respiratory system, the inspired tidal volume, and the expiratory time available." |
| **Implementation** | Each unit's passive expiratory flow is `(0 − v/C) / R`, so its volume decays as `exp(−t/RC)`. τ is never written down; `mechanics.timeConstantS` reports `R·C` and a test asserts the identity. |
| **Assumption** | R and C constant through the breath (both vary with volume and flow in reality); one compartment per unit; no inertance; no tissue viscoelasticity. |
| **Validation** | `the time constant is resistance times compliance, with nothing else in it`; `run integrates a known decay to the analytic answer` (in the model-layer tests) confirms the integrator reproduces `exp(−t/τ)`. |
| **Confidence** | `time-constant` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 2. The normal expiratory time constant is roughly 0.5–0.7 s; in COPD it reaches 2–3 s

| | |
| --- | --- |
| **Claim** | RC~exp~ is normally about 0.5–0.7 s. Time constants of the order of 2.5 s have been documented in patients intubated for severe COPD. |
| **Source** | Ventilator-monitoring literature on the expiratory time constant, reached through summaries (Hamilton Medical clinical knowledge base; *Intensive Care Medicine Experimental* narrative review of expiratory time constants, 2025; Deranged Physiology's time-constants chapter). |
| **Implementation** | `REFERENCE.expiratoryResistance = 5` cmH₂O·s/L and `REFERENCE.compliance = 0.11` L/cmH₂O give τ = 0.55 s. The scene's default obstructed lung (resistance ×3, recoil 0.6) gives τ = 2.75 s. |
| **Assumption** | The ventilated-patient figures are being used for a spontaneously breathing person. They include the endotracheal tube and the effects of sedation, so the normal figure is, if anything, an over-estimate; the model uses it because it is the figure the same literature quotes the COPD value against, and consistency between the two matters more here than either absolute. |
| **Validation** | `the normal lung sits at the textbook volumes` (asserts 0.5 < τ < 0.7); `the obstructed lung has the long time constant obstruction is known by` (asserts 2 < τ < 4). |
| **Confidence** | `reference-lung` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 3. Dynamic hyperinflation is the equilibrium reached when expiratory time is insufficient

| | |
| --- | --- |
| **Claim** | Dynamic hyperinflation is a rise in end-expiratory lung volume above the relaxation volume, reached when the expiratory time available is less than the time the lung's time constant needs. **Raised airway resistance can be sufficient to produce incomplete emptying and increased EELV when the available expiratory time is inadequate; loss of elastic recoil is not a necessary precondition.** Expiratory flow limitation and loss of recoil worsen it; neither is required for it. |
| **Source** | The dynamic-hyperinflation literature: ERS *European Respiratory Review* on the physiology and consequences of lung hyperinflation in COPD; *COPD Research and Practice*; *Experimental Physiology* on exercise-induced dynamic hyperinflation; O'Donnell and colleagues; GOLD 2026. For a recoil-preserved lung hyperinflating, the external review's reading of **"Dynamic hyperinflation and flow limitation during methacholine-induced bronchoconstriction in asthma" (PMID 10515404)**. **Read with the right weight:** a methacholine challenge is not a pure isolated-resistance experiment — it also alters airway wall mechanics and the response is heterogeneous — so it supports the proposition that dynamic hyperinflation occurs in lungs with normal elastic recoil, and it is not an experimental analogue of this model's manipulation. |
| **Implementation** | Nothing sets EELV. The units are integrated breath after breath and EELV is read off; `settle()` runs until it stops moving. `breathingPattern` shortens expiratory time as demand rises (rate 14 → 34/min, duty cycle 0.33 → 0.40, so Te falls by more than half). |
| **Assumption** | The breathing pattern is prescribed from demand rather than chosen by the model. Real patients adopt their own pattern, and the rapid shallow pattern many adopt makes hyperinflation worse than a model with a prescribed pattern shows. |
| **Validation** | `physiology: raised airway resistance alone raises end-expiratory volume` and `physiology: it does so without any expiratory flow limitation`, both of which hold the breathing pattern, the expiratory effort and the elastic properties fixed and assert that they did not move. Then `an obstructed lung hyperinflates as demand rises, and loses inspiratory capacity doing it`; `a normal lung does not hyperinflate however hard it works`; `physiology: a healthy lung does the opposite, and lowers its operating volume with exercise`. |
| **Confidence** | `insufficient-expiratory-time` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 4. Inspiratory capacity is the measure of it

| | |
| --- | --- |
| **Claim** | Dynamic hyperinflation can be assessed from simple measures of inspiratory capacity; IC represents the operating limits on tidal volume expansion during exercise. |
| **Source** | The same hyperinflation reviews; the 6-minute-walk IC literature (Marin et al., *Chest*/PubMed 11371407, through its abstract). |
| **Implementation** | `inspiratoryCapacityL = TLC − EELV`, computed from the settled EELV, and reported as the scene's headline number. |
| **Assumption** | TLC is treated as fixed for a given lung; in reality it can creep up slightly during exercise. |
| **Validation** | Included in the hyperinflation test above; the scene's read-out and its charts read the same `state`. |
| **Confidence** | `exercise-hyperinflation` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 5. Maximal expiratory flow is set by recoil and by the upstream airway, and is independent of effort

| | |
| --- | --- |
| **Claim** | Over most of the vital capacity, expiratory flow reaches a maximum that further effort cannot exceed. In the equal-pressure-point formulation, V̇max = P~el~ / R~us~, where R~us~ is the resistance of the airway between the alveolus and the equal pressure point. **Below that ceiling, expiratory muscle pressure does empty the lung further** — "effort-independent" describes part of a forced expiration, not expiration in general. |
| **Source** | Mead, Turner, Macklem & Little's equal-pressure-point analysis and Pride's work on the same, as taught in standard respiratory physiology texts (West; Nunn). No longer marked thin: the proposition is standard, and the external review confirmed both halves of it — including the half an earlier version of this model had quietly lost. The *exponents* below remain illustrative, which is a separate row. |
| **Implementation** | During expiration each unit's flow is capped at `lungRecoil / upstreamResistance`. The expression contains no drive term, and a test asserts that the whole envelope is unchanged when the drive is quintupled. |
| **Assumption** | The viscous/EPP mechanism is used at every volume. Near TLC, real maximal flow is set by **wave-speed** limitation, which this model does not represent, so the envelope understates flow at high lung volumes. The model is calibrated in the middle of the vital capacity, where the linear treatment is closest to right, and the scene draws the envelope as a model ceiling rather than as a measured MEFV curve. |
| **Validation** | `physiology: the flow ceiling contains no effort term at all`; `physiology: expiratory muscle pressure empties a lung that is not flow-limited`; `physiology: losing elastic recoil takes that compensation away`; `mid-expiratory maximal flow is in the right place for both lungs` (normal 3–7 L/s, obstructed < 1.5 L/s). |
| **Confidence** | `flow-limitation` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 6. Loss of elastic recoil raises RV and FRC much more than it raises TLC

| | |
| --- | --- |
| **Claim** | In COPD, TLC is normal or slightly raised while RV and FRC are increased, and the RV/TLC ratio rises; FRC can reach 80% of TLC. Hyperinflation is often defined as TLC > 120% predicted or RV above the upper limit of normal; RV/TLC ≥ 40% has been used as a threshold. |
| **Source** | *Chest*, "Lung Volumes in COPD", and the hyperinflation-as-treatable-trait review, through summaries. Reference volumes (TLC ≈ 6 L, FRC ≈ 1.8–2.2 L, RV ≈ 1.2 L) from standard physiology. |
| **Implementation** | Relaxation volume is `RV + C · chestWallRecoil`, so raising compliance raises it with nothing else changing. RV rises separately with `CLOSING_VOLUME_GAIN` (earlier airway closure without tethering) and TLC with the much smaller `CAPACITY_GAIN`. |
| **Assumption** | `chestWallRecoil = 10.9` cmH₂O is a **calibration**, not a measurement: it is the number that puts the reference FRC at 2.4 L given a compliance of 0.11. It is standing in for a chest-wall pressure-volume curve the model does not carry. `CLOSING_VOLUME_GAIN` and `CAPACITY_GAIN` are likewise chosen to produce the reported ordering and rough sizes, not fitted. |
| **Validation** | `losing elastic recoil raises residual volume, resting volume and capacity — in that order of size`, which asserts the *proportional* ordering rather than the absolute values. |
| **Confidence** | `reference-lung` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 7. Bronchodilators improve hyperinflation more convincingly than they abolish flow limitation

| | |
| --- | --- |
| **Claim** | Bronchodilation reduces operating lung volumes and improves inspiratory capacity and exercise tolerance in COPD, to an extent not predicted by the change in FEV₁; the loss of elastic tethering that sets the flow ceiling is not reversible. |
| **Source** | The hyperinflation-as-treatable-trait review and the exercise-hyperinflation literature; GOLD 2026 for the clinical framing. The *size* of the effect is `illustrative` and stays so. |
| **Implementation** | Bronchodilation reduces total resistance by up to 28% and the upstream (ceiling-setting) resistance by only 10%. |
| **Assumption** | The 28% / 10% split is illustrative. What the model asserts is the *asymmetry* and its consequence, not the magnitude of either. |
| **Validation** | `a bronchodilator buys back inspiratory capacity, and buys back less than normal recoil would`, which also asserts that flow limitation persists; `at maximal work the same bronchodilator buys ventilation instead of volume` records the emergent asymmetry between a fixed workload and a maximal one. |
| **Confidence** | `bronchodilator-split` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 8. The tethering that holds the collapsible segment open is lost with recoil

| | |
| --- | --- |
| **Claim** | Emphysematous destruction of alveolar attachments removes the radial traction holding small airways open during expiration, so they narrow under pleural pressure and the equal pressure point moves peripherally. |
| **Source** | Standard teaching on the mechanism of airflow obstruction in emphysema, confirmed by the review as a direction. The *steepness* has no source and is not going to acquire one, so it is marked `illustrative` rather than `thin`: the distinction is not that nobody could reach a number, but that the model invented one. |
| **Implementation** | `R_us ∝ recoil^−2.5`, and only the square root of any rise in resting airway resistance is felt by the upstream segment. |
| **Assumption** | Both exponents are illustrative and openly so. They were chosen to put mid-expiratory maximal flow in the reported range for both lungs (row 5) while keeping the normal lung unlimited at every workload. |
| **Validation** | Row 5's test, plus `the obstructed lung expires against the ceiling; the normal one never reaches it`. |
| **Confidence** | `recoil-and-tethering` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 9. Ventilation demand is defended; the pressure it takes is not

| | |
| --- | --- |
| **Claim** | Ventilation rises with metabolic demand and is regulated toward it; in obstruction the required ventilation may become unachievable, which is what limits exercise. |
| **Source** | Standard control-of-breathing physiology; the exercise-limitation-in-COPD literature (*Journal of Applied Physiology* point:counterpoint on dynamic hyperinflation as the major limitation to exercise in COPD), through summaries. |
| **Implementation** | Demand sets a **target minute ventilation**; the model raises inspiratory muscle pressure breath by breath until the target is met, up to a ceiling of 32 cmH₂O. `ventilatoryLimited` is true when the drive is at its ceiling and the target is still not met. |
| **Assumption** | A single first-order controller stands in for the chemoreflexes; the 32 cmH₂O ceiling is an order-of-magnitude stand-in for a sustainable fraction of maximal inspiratory pressure, not a measured value. The model does not represent the further fall in available pressure that a flattened, hyperinflated diaphragm causes, so if anything it under-states the limitation. |
| **Validation** | `ventilatory limitation is an outcome, not a setting`. |
| **Confidence** | `workload-expiratory-recruitment` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 10. Heterogeneity of time constants

| | |
| --- | --- |
| **Claim** | Time constants differ between regions; in flow-limited patients the time constant is increased in many alveolar units, not uniformly. |
| **Source** | The dynamic-hyperinflation reviews, which describe it in those terms. The width of the spread is `illustrative`: the model claims the spread exists and what it causes, not how wide it is in a person. |
| **Implementation** | Twelve units with resistances and compliances scattered by a seeded generator, half-width 45% and 27% respectively, with the mean held at exactly 1 so that adding heterogeneity does not change the average lung. |
| **Assumption** | The width of the spread is illustrative. The model claims that the spread exists and what it causes — that the slowest units carry the trapped gas — not how wide it is in a person. |
| **Validation** | `units are heterogeneous, and the same heterogeneous lung every time`; `the units in parallel have the same time constant as the whole lung`. |
| **Confidence** | `tethering-exponent` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 10b. What a bronchodilator does, and what it cannot

| | |
| --- | --- |
| **Claim** | Bronchodilation relaxes airway smooth muscle and reduces airway resistance; a lower resistance is a shorter R·C. It can reduce operating lung volumes and improve inspiratory capacity in COPD. It does **not** restore destroyed elastic recoil or destroyed alveolar attachments. |
| **Source** | Standard pharmacology and standard respiratory mechanics; reviews of hyperinflation as a treatable trait; the exercise-hyperinflation literature; GOLD 2026. |
| **Implementation** | `bronchodilation` scales the reference resistances and leaves every elastic property untouched — compliance, residual volume and relaxation volume are all identical before and after. |
| **Assumption** | **The external claim stops here, and it stops deliberately.** *How much more* the drug lowers total resistance than it lowers the ceiling-setting upstream segment is two invented percentages and the ratio between them, and it is registered separately as `bronchodilator-split`. An earlier version of the external layer asserted that ratio as though it were a finding; the final review removed it. |
| **Validation** | `physiology: a bronchodilator lowers airway resistance and shortens the time constant`; `physiology: a bronchodilator can lower operating volumes and recover inspiratory capacity`; `physiology: a bronchodilator does not restore elastic recoil or the tethering that went with it`. All three are directions, with no magnitude in any of them. |
| **Confidence** | `bronchodilation-lowers-resistance`, `bronchodilation-operating-volumes` and `bronchodilation-does-not-restore-recoil` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 10c. The sizes, kept on the other side of the line

| | |
| --- | --- |
| **Claim** | This model's bronchodilator lowers total resistance by 28% and the upstream segment by 10%; its upstream resistance rises as `recoil^-2.5`; its workload recruits up to 9 cmH₂O of expiratory pressure; its units are scattered by 45% and 27%; its reference lung has a time constant of about 0.55 s. |
| **Source** | None of them. Every one is a value this repository chose, and the ratios between them are chosen too. |
| **Implementation** | The constants in `src/models/copd.js`, each labelled where it is defined. |
| **Assumption** | These are worth defending — a calibration that drifts is how a scene stops matching the figures it was built against — but a failure to hold them means *a choice this repository made has changed*, which may be deliberate. It is never evidence that the medicine is wrong. |
| **Validation** | `tests/calibration.test.js`: `calibration: the reference lung lands on the textbook volumes and time constant`; `calibration: the tethering exponent puts the flow ceiling where it was tuned to sit`; `calibration: the bronchodilator split favours total resistance over the ceiling`; `calibration: the workload recruits expiratory pressure without reference to the lung`; `calibration: the unit spread has the width it was given, and does not move the mean lung`; `calibration: expiratory pressure buys the volume this parameterisation was tuned to give`. |
| **Confidence** | `reference-lung`, `tethering-exponent`, `bronchodilator-split`, `workload-expiratory-recruitment` and `heterogeneity-width` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 11. A direction the model is known to get one-sided

| | |
| --- | --- |
| **Claim** | In a real flow-limited lung, forced expiration can *raise* end-expiratory volume through dynamic airway compression. |
| **Source** | Standard respiratory mechanics. The model does not represent it. |
| **Implementation** | None. Expiratory muscle pressure here can only lower end-expiratory volume or leave it where it is; it can never raise it. |
| **Assumption** | A one-sided error, and a benign one for the propositions this scene teaches — but it means the scene must not be used to argue about forced expiratory manoeuvres in a flow-limited patient. |
| **Validation** | None, deliberately: there is nothing to assert. It is recorded as a boundary in the model card, the scope panel and the registry, which is what a known weakness gets instead of a test. |
| **Confidence** | `effort-cannot-worsen` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

---

## What was deliberately not modelled

Each of these is a place where a plausible number could have been produced and
would have been wrong:

- **Gas exchange of any kind.** No PaO₂, no PaCO₂, no SpO₂, no dead space, no
  V/Q. None of them can be derived from lung volumes, and a scene that showed
  a saturation next to these volumes would be inventing it. A test asserts
  that no such key exists in the model's output.
- **Airway inflammation, mucus, and the small-airway pathology itself.** The
  model has a resistance, not a reason for it.
- **The work of breathing and the sensation of dyspnoea**, which is what
  actually stops the patient.
- **Expiratory dynamic compression making trapping worse.** In the model,
  effort can never raise EELV; in a real flow-limited lung, forced expiration
  can.
- **Airway closure as a process.** It appears only as a residual-volume floor.
- **Any time course longer than a breath**: no disease progression, no
  exacerbation, no response over weeks.
