# Model card — Asthma: heterogeneous bronchoconstriction and ventilation heterogeneity

| | |
| --- | --- |
| **Scene** | `asthma-heterogeneity` |
| **Model** | [`src/models/asthma.js`](../../src/models/asthma.js) |
| **Evidence** | [`docs/model-evidence/asthma.md`](../model-evidence/asthma.md) |
| **Tests** | [`tests/asthma-model.test.js`](../../tests/asthma-model.test.js), [`tests/asthma-scene.test.js`](../../tests/asthma-scene.test.js) |
| **Status** | see [`src/catalog/scenes.js`](../../src/catalog/scenes.js) |

## 1. What question this model answers

**Why does a bronchoconstrictor stimulus that reaches every airway equally
produce ventilation that is anything but equal?**

## 2. What it is

An educational conceptual model of a branching airway tree solved as a
resistive network: eight generations, 128 terminal ventilation units, each
airway's calibre set by the balance between smooth-muscle activation and the
pull of the parenchyma tethering it open — where that pull depends on how much
air is reaching the region, which depends on the calibres. The circularity is
solved by damped fixed-point iteration.

## 3. What it is not

Not a patient simulator, not a research solver, not a reproduction of the
Venegas model. Not a source of any absolute resistance, flow, volume or
pressure — everything it reports is a ratio.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `stimulus` | 0–1 | Strength of the bronchoconstrictor stimulus. The scene's main axis. |
| `hyperresponsiveness` | 0.8–1.8 | How much narrowing a given stimulus produces — the asthmatic trait. |
| `wallThickening` | 0–1 | Airway remodelling: lumen lost before any muscle contracts. |
| `lungInflation` | 0.7–1.3 | Global lung inflation — how stretched the parenchyma is, and therefore how hard it pulls on the outside of every airway. **The mechanical tethering term only.** It is not a model of taking a deep breath: see §11. |
| `bronchodilator` | 0–1 | Relaxation of airway smooth muscle. |

## 5. Outputs

Airway resistance as a multiple of a healthy reference tree; the coefficient of
variation of ventilation across the units; the fraction of units below 30% of
their fair share; the largest mostly-dark region as a fraction of the lung; the
air reaching the lung as a fraction of baseline; median small-airway calibre;
per-unit ventilation (twice — as a share of the current total and as a fraction
of baseline); per-branch calibre; and whether the solution settled.

**All relative.** No absolute resistance, flow or pressure is produced.

## 6. State variables

None — the model is stateless. Every call solves an equilibrium from the
controls alone. There is no time in it.

## 7. Governing relations

- Airway resistance: `L / r⁴` (relative; see §11)
- Subtree cost: `R_branch + (R_left ∥ R_right)`, terminal branches plus an acinar resistance
- Flow split: inversely proportional to the two children's subtree costs
- Narrowing: `sigmoid(k · (activation − opposition))`
- Opposition: `TETHERING_STRENGTH · stretch · lungInflation`, `stretch` rising sub-linearly with the region's ventilation
- Constrictibility of a generation: `smoothMuscleFraction(g) · (1 − cartilageSupport(g))` — muscle present, times the share of its shortening the cartilage does not take up
- Solved by damped fixed-point iteration; `converged` is reported, not assumed

## 8. Constants and where they came from

See the evidence dossier. In summary: the homothety ratio and the branching
structure are standard morphometry; the muscle and cartilage distributions are
standard anatomy in *shape* and illustrative in *size*; **every parameter of
the feedback loop is illustrative** — the
tethering strength, its floor, its coupling exponent, the response steepness
and the maximum narrowing were chosen so that the model reproduces the reported
*shape* of the result, and none is derived or fitted.

## 9. Calibration vs measurement

Nothing here is fitted to data, and nothing here is a measurement. The model is
tuned so that a healthy lung is uniform, an unstimulated asthmatic lung is
nearly uniform, and a stimulated one goes patchy before it goes uniformly shut.
Those three behaviours are the calibration target; every number is a
consequence of hitting them.

## 10. What is exaggerated for visibility, and what is not

Airway calibre in the 3D is the model's, unscaled. Colour is presentation: the
brightness ramp for a ventilation unit has two segments joined at the defect
threshold, because a single linear ramp puts almost none of its range at the
distinction that matters, and the low end is warm rather than dark because a
dark sphere on this background reads as an absent region rather than a quiet
one.

## 11. Known failure modes

- **Poiseuille's law is not true of a real airway tree.** Flow in the large
  airways is not laminar, and this model's resistance is spread evenly across
  its generations where a real lung's is concentrated centrally. Ratios survive
  this; absolutes would not, which is why none are produced.
- **The tree is symmetric and eight generations deep.** A real one is neither.
- **Contiguity is defined on the tree, not in space.**
- **At full stimulus the defect count falls**, because a uniformly shut lung
  has no *relative* defects. That is a property of the measure, not of the
  lung; the air reaching the lung is the number to read there, and the scene
  says so in three places.
- **The feedback's coupling exponent is doing a lot of work.** Change it and
  the model's behaviour changes qualitatively: too high and the whole lung tips
  at once, too low and it never goes patchy at all.
- **There is no time.** A real bronchoconstriction has an onset and a recovery.
- **The lung-inflation control is not a deep breath.** It changes the
  mechanical load the smooth muscle shortens against, and that is all it
  changes. A real deep inspiration also strains the muscle itself, and the
  bronchodilator and bronchoprotective effects of deep inspiration are
  impaired or lost in asthma — most of all where hyperresponsiveness is
  strong. The smooth-muscle dynamics that would decide that (strain rate,
  cross-bridge cycling, contractile plasticity) are not in this model, and no
  test in this repository asserts that the model must produce any particular
  bronchodilation from a real deep inspiration. Read the control as "more
  parenchymal tethering", never as "the patient breathed in deeply".

## 12. What it must never be used for

Diagnosis. Assessing anyone's airway responsiveness. Interpreting a
methacholine challenge. Estimating a resistance, a FEV₁, or any spirometric
value. Any statement about a particular person.

## 13. Uncertainty

The *direction* of every relationship the scene teaches is well established.
The **existence** of self-organised patchiness through this feedback is a
published proposal that this model illustrates rather than confirms. The
**magnitudes** are not claimed at all, and no published model is reproduced
here. Reading a source in full does not promote a calibration constant to a
measurement: the tethering strength, its floor, its coupling exponent, the
response steepness, the inherited share of sensitivity and the maximum
narrowing are all illustrative, and stay illustrative.

## 14. Where the model could mislead

- The clustered picture is compelling, and a reader could take it as an image
  of a real lung rather than as an illustration of a mechanism.
- The knee is sharp here; in a person the transition is a region, not a point.
- "Half the regions are below the threshold" sounds like a clinical
  measurement. It is a property of this tree, this threshold and this
  parameter set.
- The absence of gas exchange could read as "ventilation heterogeneity is the
  whole problem". It is the part this scene is about.
- **"Asthma is a small-airway disease" is a wrong conclusion this scene could
  invite, and an earlier version of it did.** The model's central airways
  narrow much less than its bronchioles, which is correct — but the reason is
  cartilage, not the absence of smooth muscle. Airway smooth muscle and airway
  inflammation are present from the trachea to the terminal bronchioles, and
  asthma involves the whole airway tree. The model now carries the two facts
  separately (`smoothMuscleFraction` and `cartilageSupport`) so that neither
  can be read off the other, and `tests/respiratory-physiology.test.js`
  asserts that no generation is left without muscle.

## 15. Review status

**Corrected against an external clinical review** that read the sources in
full, and **not yet re-reviewed after those corrections.** The scene stays at
`alpha`. The review named GINA 2026, Venegas et al. (doi:10.1038/nature03490),
Winkler & Venegas (PMC4698910), the structure-to-function review of
heterogeneity in asthma (PMC5543015), reviews of airway smooth muscle
distribution (PMC9581182) and reviews of deep inspiration in asthma
(PMC10585885). It found two errors — an anatomy that implied asthma is a
small-airway disease, and a lesson that claimed a sized bronchodilator response
to a deep breath — both of which are fixed and guarded by external tests in
`tests/respiratory-physiology.test.js`.

This repository's own network still cannot reach the medical publishers, so
nothing here was extracted from a figure or a table by its author, and no
published model has been reproduced; the dossier explains exactly what that
does and does not license.

## 16. How to check it

`node --test tests/asthma-model.test.js tests/asthma-scene.test.js` for what
the scene says about itself, and
`node --test tests/respiratory-physiology.test.js` for what the literature
requires of it regardless of what the scene says. The strongest test is `the patchiness is the feedback, not the scatter`, which
cuts the loop and asserts the patchiness disappears — the claim the whole
scene rests on, written so that it can fail.
