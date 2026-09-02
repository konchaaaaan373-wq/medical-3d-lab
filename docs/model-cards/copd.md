# Model card — COPD: expiratory flow limitation and dynamic hyperinflation

| | |
| --- | --- |
| **Scene** | `copd-hyperinflation` |
| **Model** | [`src/models/copd.js`](../../src/models/copd.js) |
| **Evidence** | [`docs/model-evidence/copd.md`](../model-evidence/copd.md) |
| **Tests** | [`tests/copd-model.test.js`](../../tests/copd-model.test.js) |
| **Status** | see [`src/catalog/scenes.js`](../../src/catalog/scenes.js) |

## 1. What question this model answers

**Why does someone with obstructed airways end up breathing at a higher lung
volume, and why does it get worse the harder they work?**

## 2. What it is

An educational conceptual model of respiratory mechanics: twelve parallel lung
units, each with its own resistance and compliance, breathing under a
respiratory drive that is adjusted to meet a demanded minute ventilation, with
expiratory flow out of each unit capped at what its own elastic recoil can
drive through the collapsible airway upstream of the equal pressure point.

**Four mechanisms are kept independent of one another** — airway resistance,
elastic recoil, expiratory time and expiratory muscle pressure — because the
propositions this scene teaches are all of the form "*this* one, on its own,
does *that*", and a model in which two of them move together cannot support
any of them. In particular the expiratory muscle pressure is open loop: it is
a function of the workload and of the reader's own control, and it is not
derived from the inspiratory drive.

## 3. What it is not

Not a patient simulator. Not a research solver. Not a spirometer, and not a
source of any number that would be reported from one in a clinic.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `demand` | 0–1 | The ventilation being asked for, from rest (6.5 L/min) to hard exercise (45 L/min). This is the scene's main axis. |
| `airwayResistance` | ×1–×4 | Resistance of the airways relative to a reference lung — the luminal/secretion component. |
| `elasticRecoil` | 0.45–1.0 | Elastic recoil as a fraction of normal. Below 1 this raises compliance, residual volume, resting volume and (much less) total capacity, and it raises the resistance of the collapsible segment. |
| `bronchodilation` | 0–1 | A bronchodilator response: −28% total resistance, −10% upstream resistance. |
| `expiratoryPressureCmH2O` | 0–20 cmH₂O | **Extra** expiratory muscle pressure, on top of whatever the workload itself recruits. An absolute pressure with a clinical unit, and independent of every other input: nothing in the lung moves it and it is not derived from the inspiratory drive. |

## 5. Outputs

End-expiratory lung volume; inspiratory capacity; tidal volume; minute
ventilation and the ventilation demanded; expiratory time; time constant and
the number of time constants expiratory time allows; residual volume,
relaxation volume and total lung capacity; inspiratory and expiratory muscle
pressure; the fraction of expired volume that left at the flow ceiling;
whether the lung is ventilatory-limited; and per-unit volumes.

All volumes in litres, flows in L/s, pressures in cmH₂O, times in seconds.

## 6. State variables

The volume of each of twelve units above the lung's relaxation volume, the
position in the breath cycle, and the current inspiratory drive pressure.
Everything else is derived.

## 7. Governing relations

- Flow into a unit: `(P_mus − v/C) / R`
- Expiratory flow ceiling: `((v − v_RV) / C_lung) / R_us` — **no drive term**
- Relaxation volume: `RV + C · P_chestwall`
- Time constant: `R · C`
- Drive: adjusted once per breath toward the demanded ventilation, capped

## 8. Constants and where they came from

See the evidence dossier, which gives every constant a claim, a source, an
assumption and a test. In summary: the reference volumes and the two time
constants (0.55 s normal, ~2.75 s obstructed) come from standard physiology
and the ventilator-monitoring literature; the chest-wall recoil, the
closing-volume and capacity gains, the tethering exponent and the
bronchodilator split are **calibrations chosen to reproduce reported
orderings and rough magnitudes**, and are labelled as such in the code.

## 9. Calibration vs measurement

Nothing here is fitted to data. The model is calibrated at two points — the
normal lung's volumes and time constant, and mid-expiratory maximal flow in
both lungs — and everything else is left where the equations put it. A
calibration constant is never presented in the interface as a clinical
measurement.

## 10. What is exaggerated for visibility, and what is not

Nothing in the model is exaggerated. The scene exaggerates the *visible*
excursion of the lungs and diaphragm, because a tidal breath moves the chest
by a few millimetres and would otherwise look like a still image; the volumes
those shapes are driven by are the model's, unaltered. Emphasis, glow and
camera are presentation and are named as such in the scene.

## 11. Known failure modes

- **The flow-volume envelope understates flow near TLC**, because the model
  uses the viscous/equal-pressure-point limit at every volume and real maximal
  flow near TLC is wave-speed limited. Do not read a peak expiratory flow off
  it.
- **Effort can never worsen trapping.** In a real flow-limited lung, forced
  expiration can raise end-expiratory volume through dynamic compression. Here
  effort can only help or do nothing.
- **The breathing pattern is prescribed** by the workload rather than chosen.
  Real patients choose theirs, and a rapid shallow pattern makes
  hyperinflation worse than this shows. So the model's claims are about
  *direction* under a stated pattern, never about how much a given person
  would trap.
- **Compliance is linear.** The real pressure-volume curve flattens near TLC,
  so the model over-states how easily the last litre is taken.
- **A demand the lung cannot meet is simply not met.** There is no rising
  CO₂, because there is no CO₂.

## 12. What it must never be used for

Diagnosis. Staging. Estimating anyone's lung volumes, flows or exercise
capacity. Predicting a response to a bronchodilator. Any statement about a
particular person.

## 13. Uncertainty

The direction and the reason for every relationship the scene teaches are
well established. The **magnitudes** are order-of-magnitude at best: the
tethering exponent, the bronchodilator split, the heterogeneity width and the
drive ceiling are all illustrative. The evidence dossier marks the four rows
where no quantitative source was reachable as **thin**.

## 14. Where the model could mislead

- The scene's obstructed lung is *one* lung. COPD is not one phenotype, and a
  reader could take these particular volumes as typical.
- Watching IC recover under a bronchodilator on screen could suggest a larger
  or more reliable effect than a person gets.
- The absence of anything about gas exchange could read as "hyperinflation is
  the whole of COPD". It is not; it is the part this scene is about.
- **A previous version of this scene misled, and the correction is worth
  recording.** Its expiratory muscle pressure was derived from the inspiratory
  drive, so raising airway resistance silently raised expiratory effort too;
  the added push cancelled the trapping that the longer time constant should
  have produced, and the scene taught that narrowed airways alone do not trap
  gas. That is false: raised airway resistance at a fixed breathing pattern and
  a fixed expiratory effort raises end-expiratory volume, which is exactly what
  induced bronchoconstriction does in asthma. The model, the walk-through and
  the challenges were all internally consistent while saying it. Internal
  consistency is the weaker of the two tests a scene has to pass; the external
  one is in `tests/respiratory-physiology.test.js`.

## 15. Review status

**Catalog status:** `reviewed`

**Clinically reviewed after correction of the previously identified modelling
error.** The reviewed status means the externally constrained teaching claims,
model integrity and calibration boundaries have been checked and the known
simplifications remain documented here; it does not make the scene a clinical
simulator or promote illustrative magnitudes to measurements. The review named
GOLD 2026, O'Donnell and colleagues on dynamic hyperinflation, and the
induced-bronchoconstriction literature (PMID 10515404). The corrected
relationship is guarded by external tests in
`tests/respiratory-physiology.test.js`.

This repository's own network still cannot reach the medical publishers, so
nothing here was extracted from a figure, a table or a methods section by its
author; the dossier explains exactly what that does and does not license. No
guideline figure, table or algorithm has been reproduced.

## 16. How to check it

Three kinds of test, and they mean different things — see
[`tests/README.md`](../../tests/README.md).

- **External physiology**, `node --test tests/respiratory-physiology.test.js`.
  What the literature requires, with no constant this repository chose in any
  assertion. **A failure here, and only here, means the model has broken a
  constraint the physiology imposes.**
- **Model integrity**, `node --test tests/copd-model.test.js tests/copd-scene.test.js`.
  That the solver converges, that no volume leaves the lung the model
  described, and that the charts, the read-out, the 3D and every stored answer
  in a lesson are all reading the same model.
- **Calibration behaviour**, `node --test tests/calibration.test.js`. That the
  reference lung still lands on the textbook figures, that the tethering
  exponent still puts the flow ceiling where it was aimed, and that the
  bronchodilator's 28%-against-10% split still holds. A failure here means a
  choice changed. It is never evidence that the medicine is wrong.
