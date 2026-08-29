# Model evidence — COPD: expiratory flow limitation and dynamic hyperinflation

Implementation: [`src/models/copd.js`](../../src/models/copd.js)
Boundary of the claim: [`docs/model-cards/copd.md`](../model-cards/copd.md)
Tests: [`tests/copd-model.test.js`](../../tests/copd-model.test.js)

## How these sources were consulted

**Read this first.** The network this repository was built on blocks the
medical publishers and index sites — PubMed, PMC, the ERS and ATS journals,
Journal of Applied Physiology, Nature, Wiley, BMJ and the GOLD site are all
unreachable from here. Every source below was therefore reached through
**search-result summaries and abstracts, not full text**. Where a number is
quoted, it is a number that appeared in such a summary or that is standard
textbook respiratory physiology; none of it was extracted from a figure, a
table or a methods section that was actually read.

That is a real limitation and it sets a ceiling on what this model may claim.
It is why every constant below is described as a central textbook value or an
illustrative calibration, why the model card forbids quoting the model's
output as a clinical measurement, and why the scene reports no figure to more
precision than the model has earned.

Anyone with journal access should re-check the rows marked **thin** first.

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

### 2. The normal expiratory time constant is roughly 0.5–0.7 s; in COPD it reaches 2–3 s

| | |
| --- | --- |
| **Claim** | RC~exp~ is normally about 0.5–0.7 s. Time constants of the order of 2.5 s have been documented in patients intubated for severe COPD. |
| **Source** | Ventilator-monitoring literature on the expiratory time constant, reached through summaries (Hamilton Medical clinical knowledge base; *Intensive Care Medicine Experimental* narrative review of expiratory time constants, 2025; Deranged Physiology's time-constants chapter). |
| **Implementation** | `REFERENCE.expiratoryResistance = 5` cmH₂O·s/L and `REFERENCE.compliance = 0.11` L/cmH₂O give τ = 0.55 s. The scene's default obstructed lung (resistance ×3, recoil 0.6) gives τ = 2.75 s. |
| **Assumption** | The ventilated-patient figures are being used for a spontaneously breathing person. They include the endotracheal tube and the effects of sedation, so the normal figure is, if anything, an over-estimate; the model uses it because it is the figure the same literature quotes the COPD value against, and consistency between the two matters more here than either absolute. |
| **Validation** | `the normal lung sits at the textbook volumes` (asserts 0.5 < τ < 0.7); `the obstructed lung has the long time constant obstruction is known by` (asserts 2 < τ < 4). |

### 3. Dynamic hyperinflation is the equilibrium reached when expiratory time is insufficient

| | |
| --- | --- |
| **Claim** | Dynamic hyperinflation is a rise in end-expiratory lung volume above the relaxation volume, occurring when expiratory flow limitation is present or ventilation rises; it is worsened by the rise in respiratory rate during exercise, which shortens the time available for expiration. |
| **Source** | The dynamic-hyperinflation literature, through summaries: ERS *European Respiratory Review* on the physiology and consequences of lung hyperinflation in COPD; *COPD Research and Practice* on applying hyperinflation physiology to clinical practice; *Experimental Physiology* on exercise-induced dynamic hyperinflation. |
| **Implementation** | Nothing sets EELV. The units are integrated breath after breath and EELV is read off; `settle()` runs until it stops moving. `breathingPattern` shortens expiratory time as demand rises (rate 14 → 34/min, duty cycle 0.33 → 0.40, so Te falls by more than half). |
| **Assumption** | The breathing pattern is prescribed from demand rather than chosen by the model. Real patients adopt their own pattern, and the rapid shallow pattern many adopt makes hyperinflation worse than a model with a prescribed pattern shows. |
| **Validation** | `an obstructed lung hyperinflates as demand rises, and loses inspiratory capacity doing it`; `a normal lung does not hyperinflate however hard it works`; `hyperinflation follows from the time available, not from the disease label`. |

### 4. Inspiratory capacity is the measure of it

| | |
| --- | --- |
| **Claim** | Dynamic hyperinflation can be assessed from simple measures of inspiratory capacity; IC represents the operating limits on tidal volume expansion during exercise. |
| **Source** | The same hyperinflation reviews; the 6-minute-walk IC literature (Marin et al., *Chest*/PubMed 11371407, through its abstract). |
| **Implementation** | `inspiratoryCapacityL = TLC − EELV`, computed from the settled EELV, and reported as the scene's headline number. |
| **Assumption** | TLC is treated as fixed for a given lung; in reality it can creep up slightly during exercise. |
| **Validation** | Included in the hyperinflation test above; the scene's read-out and its charts read the same `state`. |

### 5. Maximal expiratory flow is set by recoil and by the upstream airway, and is independent of effort

| | |
| --- | --- |
| **Claim** | Over most of the vital capacity, expiratory flow reaches a maximum that further effort cannot exceed. In the equal-pressure-point formulation, V̇max = P~el~ / R~us~, where R~us~ is the resistance of the airway between the alveolus and the equal pressure point. |
| **Source** | Mead, Turner, Macklem & Little's equal-pressure-point analysis and Pride's work on the same, as they are taught in standard respiratory physiology texts (West; Nunn). Not read here in the original. **Thin** — this is the row most worth re-checking against a primary text. |
| **Implementation** | During expiration each unit's flow is capped at `lungRecoil / upstreamResistance`. The expression contains no drive term, and a test asserts that the whole envelope is unchanged when the drive is quintupled. |
| **Assumption** | The viscous/EPP mechanism is used at every volume. Near TLC, real maximal flow is set by **wave-speed** limitation, which this model does not represent, so the envelope understates flow at high lung volumes. The model is calibrated in the middle of the vital capacity, where the linear treatment is closest to right, and the scene draws the envelope as a model ceiling rather than as a measured MEFV curve. |
| **Validation** | `the maximal flow the lung can produce contains no term for effort`; `mid-expiratory maximal flow is in the right place for both lungs` (normal 3–7 L/s, obstructed < 1.5 L/s); `expiratory effort moves a normal lung and does almost nothing to a limited one`. |

### 6. Loss of elastic recoil raises RV and FRC much more than it raises TLC

| | |
| --- | --- |
| **Claim** | In COPD, TLC is normal or slightly raised while RV and FRC are increased, and the RV/TLC ratio rises; FRC can reach 80% of TLC. Hyperinflation is often defined as TLC > 120% predicted or RV above the upper limit of normal; RV/TLC ≥ 40% has been used as a threshold. |
| **Source** | *Chest*, "Lung Volumes in COPD", and the hyperinflation-as-treatable-trait review, through summaries. Reference volumes (TLC ≈ 6 L, FRC ≈ 1.8–2.2 L, RV ≈ 1.2 L) from standard physiology. |
| **Implementation** | Relaxation volume is `RV + C · chestWallRecoil`, so raising compliance raises it with nothing else changing. RV rises separately with `CLOSING_VOLUME_GAIN` (earlier airway closure without tethering) and TLC with the much smaller `CAPACITY_GAIN`. |
| **Assumption** | `chestWallRecoil = 10.9` cmH₂O is a **calibration**, not a measurement: it is the number that puts the reference FRC at 2.4 L given a compliance of 0.11. It is standing in for a chest-wall pressure-volume curve the model does not carry. `CLOSING_VOLUME_GAIN` and `CAPACITY_GAIN` are likewise chosen to produce the reported ordering and rough sizes, not fitted. |
| **Validation** | `losing elastic recoil raises residual volume, resting volume and capacity — in that order of size`, which asserts the *proportional* ordering rather than the absolute values. |

### 7. Bronchodilators improve hyperinflation more convincingly than they abolish flow limitation

| | |
| --- | --- |
| **Claim** | Bronchodilation reduces operating lung volumes and improves inspiratory capacity and exercise tolerance in COPD, to an extent not predicted by the change in FEV₁; the loss of elastic tethering that sets the flow ceiling is not reversible. |
| **Source** | The hyperinflation-as-treatable-trait review and the exercise-hyperinflation literature, through summaries. **Thin** on the size of the effect. |
| **Implementation** | Bronchodilation reduces total resistance by up to 28% and the upstream (ceiling-setting) resistance by only 10%. |
| **Assumption** | The 28% / 10% split is illustrative. What the model asserts is the *asymmetry* and its consequence, not the magnitude of either. |
| **Validation** | `a bronchodilator buys back inspiratory capacity, and buys back less than normal recoil would`, which also asserts that flow limitation persists; `at maximal work the same bronchodilator buys ventilation instead of volume` records the emergent asymmetry between a fixed workload and a maximal one. |

### 8. The tethering that holds the collapsible segment open is lost with recoil

| | |
| --- | --- |
| **Claim** | Emphysematous destruction of alveolar attachments removes the radial traction holding small airways open during expiration, so they narrow under pleural pressure and the equal pressure point moves peripherally. |
| **Source** | Standard teaching on the mechanism of airflow obstruction in emphysema. **Thin** — no quantitative source was reachable for how steeply R~us~ rises with recoil loss. |
| **Implementation** | `R_us ∝ recoil^−2.5`, and only the square root of any rise in resting airway resistance is felt by the upstream segment. |
| **Assumption** | Both exponents are illustrative and openly so. They were chosen to put mid-expiratory maximal flow in the reported range for both lungs (row 5) while keeping the normal lung unlimited at every workload. |
| **Validation** | Row 5's test, plus `the obstructed lung expires against the ceiling; the normal one never reaches it`. |

### 9. Ventilation demand is defended; the pressure it takes is not

| | |
| --- | --- |
| **Claim** | Ventilation rises with metabolic demand and is regulated toward it; in obstruction the required ventilation may become unachievable, which is what limits exercise. |
| **Source** | Standard control-of-breathing physiology; the exercise-limitation-in-COPD literature (*Journal of Applied Physiology* point:counterpoint on dynamic hyperinflation as the major limitation to exercise in COPD), through summaries. |
| **Implementation** | Demand sets a **target minute ventilation**; the model raises inspiratory muscle pressure breath by breath until the target is met, up to a ceiling of 32 cmH₂O. `ventilatoryLimited` is true when the drive is at its ceiling and the target is still not met. |
| **Assumption** | A single first-order controller stands in for the chemoreflexes; the 32 cmH₂O ceiling is an order-of-magnitude stand-in for a sustainable fraction of maximal inspiratory pressure, not a measured value. The model does not represent the further fall in available pressure that a flattened, hyperinflated diaphragm causes, so if anything it under-states the limitation. |
| **Validation** | `ventilatory limitation is an outcome, not a setting`. |

### 10. Heterogeneity of time constants

| | |
| --- | --- |
| **Claim** | Time constants differ between regions; in flow-limited patients the time constant is increased in many alveolar units, not uniformly. |
| **Source** | The dynamic-hyperinflation reviews, which describe it in those terms. **Thin** on magnitude. |
| **Implementation** | Twelve units with resistances and compliances scattered by a seeded generator, half-width 45% and 27% respectively, with the mean held at exactly 1 so that adding heterogeneity does not change the average lung. |
| **Assumption** | The width of the spread is illustrative. The model claims that the spread exists and what it causes — that the slowest units carry the trapped gas — not how wide it is in a person. |
| **Validation** | `units are heterogeneous, and the same heterogeneous lung every time`; `the units in parallel have the same time constant as the whole lung`. |

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
