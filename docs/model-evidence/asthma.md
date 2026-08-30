# Model evidence — Asthma: heterogeneous bronchoconstriction and ventilation heterogeneity

Implementation: [`src/models/asthma.js`](../../src/models/asthma.js)
Boundary of the claim: [`docs/model-cards/asthma.md`](../model-cards/asthma.md)
Tests: [`tests/asthma-model.test.js`](../../tests/asthma-model.test.js), [`tests/asthma-scene.test.js`](../../tests/asthma-scene.test.js)

## How these sources were consulted — read this first

This section has been rewritten, and the change matters.

**The model and the teaching text in this scene were corrected against an
external, full-text clinical review.** That review named its sources — GINA
2026; Venegas et al., *Nature* 434:777–82 (2005),
doi:10.1038/nature03490; Winkler & Venegas, "Mathematical Modeling of
Ventilation Defects in Asthma" (PMC4698910); "The role of heterogeneity in
asthma: a structure-to-function perspective" (PMC5543015); reviews of airway
smooth muscle distribution (PMC9581182); and reviews of deep inspiration in
asthma (PMC10585885) — and it found two real errors, recorded below.

**What has not changed is this repository's own access.** The network this code
is built and tested on still cannot reach PubMed, PMC, Nature, the ERS and ATS
journals, Wiley or BMJ. Nothing here was extracted from a figure, a table or a
methods section by the author of this file. Where a claim below cites full
text, it is citing the external review's reading of it, and for a
*proposition* — an anatomical fact, a mechanism, a correction — never for a
number lifted out of a paper.

**This is not the Venegas model and it reproduces none of their results.** It
is a simplified conceptual implementation inspired by the published mechanism:
eight generations where theirs has the whole tree, a lumped acinus, a crude
scalar stand-in for parenchymal coupling, and no attempt to match any figure
they report. Any quantitative agreement would be a coincidence, and none is
claimed. **Reading a source in full does not turn a calibration into a
measurement**, and every invented parameter here is still invented:
`TETHERING_COUPLING`, `TETHERING_FLOOR`, `TETHERING_STRENGTH`,
`RESPONSE_STEEPNESS`, the inherited share of sensitivity, and the maximum
narrowing.

The confidence behind each claim is machine-readable in
[`src/models/evidence.js`](../../src/models/evidence.js), one of
`established` / `supported` / `calibration` / `illustrative` / `uncertain`, and
`tests/evidence.test.js` checks that every asserted claim names a test that
exists. The `Confidence` row in each table below gives the registry id.

## What the review corrected

**1. "Asthma is a small-airway disease" was wrong, and the model's anatomy was
encouraging it.** A single ramp called `smoothMuscleShare` went from zero at
the trachea to one in the bronchioles. Read as what its name said, that asserts
there is no airway smooth muscle in the central airways, which is false: smooth
muscle runs continuously from the trachea — as trachealis, in the posterior
membranous wall between the ends of the cartilage rings — to the terminal
bronchioles, and asthma involves the whole airway tree.

What actually changes along the tree is two separate things, and the model now
carries them separately. `smoothMuscleFraction(g)` is how much muscle is there,
non-zero everywhere and rising distally as the layer becomes complete and
circumferential. `cartilageSupport(g)` is how much of its shortening the
cartilage takes up, falling from complete rings to plates to nothing by the
bronchioles. Their product, `constrictibilityWeight(g)`, is what the solver
uses — how much a given activation moves *this* airway's calibre — and it is
named for what it is rather than for one of its two causes. The consequence the
scene may teach is about **effect**: the same shortening changes a small
airway's calibre far more, and its resistance far more again.

**2. The scene claimed a bronchodilator response to a deep breath that it
cannot model, and quoted a size for it.** The control was labelled "Lung
inflation (a deep breath)" and a challenge reported that "a third of the dark
regions came back". Both have gone. The mechanism in the model is parenchymal
tethering and nothing else, so the control is now "Global lung inflation
(parenchymal stretch)", the lesson is "What does stronger parenchymal tethering
do?", and its learning objective is the mechanical one: *increasing lung volume
increases the parenchymal tethering forces that tend to oppose airway
narrowing*. The lesson now says in as many words that **it does not predict the
bronchodilator response to a real deep inspiration in a person with asthma** —
that response is impaired or lost in asthma, most of all where
hyperresponsiveness is strong, and the smooth-muscle dynamics that decide it
are absent here. No test in this repository asserts any particular
bronchodilation from a real deep inspiration, and
`tests/asthma-scene.test.js` asserts that the lesson quotes no size at all.

---

## Claim → Source → Implementation → Assumption → Validation

### 1. Poiseuille's law — the fact, and what this model does with it

**These are two claims and the final review asked for them to be separated.**
Registering the second as the first is how a convenient idealisation becomes a
statement about a person's airways.

#### 1a. The established law

| | |
| --- | --- |
| **Claim** | For steady laminar flow in an ideal cylindrical tube, Poiseuille resistance is proportional to `L / r⁴`: `R = 8ηL / πr⁴`. Halving the radius multiplies the resistance sixteenfold. |
| **Source** | Poiseuille's law. A result about an ideal tube, and true of one. |
| **Implementation** | Asserted directly on the expression, not on the model: `resistance(1, 0.5) / resistance(1, 1) === 16`. |
| **Assumption** | None. This is the regime the law holds in. |
| **Validation** | `physiology: Poiseuille resistance in an ideal tube goes as length over radius to the fourth`. |
| **Confidence** | `poiseuille-ideal-tube` (**established**) — see [`src/models/evidence.js`](../../src/models/evidence.js). |

#### 1b. The approximation this model makes

| | |
| --- | --- |
| **Claim** | This asthma model uses the `r⁴` dependence as a **relative** approximation for airway narrowing, applied to every generation of the tree. |
| **Source** | The law above, applied outside the regime where it holds. Flow in the trachea and main bronchi is not laminar, real airways are not ideal tubes, and a real tree's resistance is not this expression's. |
| **Implementation** | `branchResistance(branch, radius) = length / radius⁴`, in arbitrary units, used only to form ratios. |
| **Assumption** | **This is not a law about real airway resistance and must never be registered as one.** It survives because every resistance the model reports is a ratio to the same tree unstimulated, so the part the approximation gets wrong divides out. No absolute resistance is produced anywhere. |
| **Validation** | `calibration: the tree's resistance is a ratio to itself, so the approximation cancels`, which asserts the reference tree is exactly 1× and that no field of the solved state carries an absolute unit. In the **calibration** layer, because it is a property of this model rather than of a lung. |
| **Confidence** | `fourth-power-approximation` (**approximation**) — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 2. A symmetric dichotomous tree with a diameter ratio of 2^(−1/3)

| | |
| --- | --- |
| **Claim** | This model branches by symmetric dichotomy over eight generations, with each generation's diameter 2^(−1/3) ≈ 0.79 of the last — the Hess–Murray ratio, and the one Weibel's model A uses. |
| **Source** | Weibel's morphometry and the Hess–Murray law give the ideal ratio. Real branching is markedly **asymmetric** and a lung has twenty-three generations, so what is used here is an idealised structure rather than a description of one. |
| **Implementation** | `HOMOTHETY = 2 ** (-1/3)`; branch length and radius both scale by it per generation; eight generations, 128 terminal units. |
| **Assumption** | Both simplifications matter. An asymmetric tree distributes flow differently, and the missing generations are exactly the ones where total cross-section explodes — which is why this model's resistance is spread evenly across its generations where a real lung's is concentrated centrally. **The model does not claim to say where in a lung the resistance sits.** |
| **Validation** | `calibration: each generation is narrower than the last by the homothety ratio`, in the **calibration** layer: the idealisation being intact is a property of this model, not a finding about lungs. |
| **Confidence** | `symmetric-dichotomy` (**approximation**) — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 3. Airway smooth muscle is present throughout; cartilage is what falls away

| | |
| --- | --- |
| **Claim** | Airway smooth muscle runs from the trachea to the terminal bronchioles. In the trachea and main bronchi it is the trachealis, spanning the posterior membranous portion between the open ends of the cartilage rings; distally the cartilage becomes plates and then disappears, and the muscle becomes a complete helical and then circumferential layer whose share of the airway wall rises. The consequence is that the same muscle shortening changes a small airway's calibre far more — and, through the fourth power, its resistance far more again. |
| **Source** | Standard airway anatomy; reviews of airway smooth muscle distribution (PMC9581182) through the external review; GINA 2026 for asthma as a heterogeneous disease of the whole airway tree. |
| **Implementation** | Two functions, deliberately not one. `smoothMuscleFraction(generation)` rises from 0.45 at the trachea to 1 by generation 4 and is **never zero**. `cartilageSupport(generation)` falls from 0.85 to 0 by generation 5. `constrictibilityWeight(generation)` is their product, and it is what the solver reads. |
| **Assumption** | **All three magnitudes are illustrative, and so is the ratio between the peripheral and central weights.** What is claimed externally is only what the anatomy states: central smooth muscle is non-zero; bronchiolar smooth muscle is relatively prominent against the size of the wall it sits in; cartilage support declines distally and is absent from the bronchioles; and distal calibre *can* therefore be more strongly affected by the same contraction. A strict generation-by-generation increase is **not** claimed — there is no continuous quantitative law in the literature to hold the model to, and the final review removed the earlier external assertion that peripheral constrictibility exceeds central by more than a factor of three. The profile and that ratio are `constrictibility-weights`, defended in the calibration layer. |
| **Validation** | External, all orderings and no factors: `physiology: airway smooth muscle is present at every generation, and prominent peripherally`; `physiology: cartilage support decreases distally and is absent from the bronchioles`; `physiology: the same activation can narrow a peripheral airway more than a central one`. Integrity: `smooth muscle is present at every generation, and cartilage is what falls away`. Calibration: `calibration: the constrictibility weights have the profile they were given`, which holds the numbers and the ratio. |
| **Confidence** | `muscle-throughout`, `cartilage-falls-away` and `distal-narrowing-effect` (**established** / **supported**), against `constrictibility-weights` (**illustrative**) — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 4. The smooth-muscle response is sigmoid

| | |
| --- | --- |
| **Claim** | Airway smooth muscle's response to an agonist is a sigmoid dose-response, not a linear one. |
| **Source** | Standard pharmacology of smooth muscle. |
| **Implementation** | `narrowing = 1 / (1 + exp(−k(activation − opposition)))` with `k = 6`. |
| **Assumption** | The steepness is illustrative and it matters: the clustering in this model needs both a steep local response *and* the feedback loop below, and the model card says so. |
| **Validation** | Covered indirectly by the knee test. The steepness has no separate test because there is nothing external to test it against: it is `illustrative`, which is a different thing from `thin`. Nobody is going to find the number. |
| **Confidence** | `response-steepness` (**illustrative**, calibration layer) — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 5. Narrowing is opposed by the parenchyma tethering the airway open

| | |
| --- | --- |
| **Claim** | Airway smooth muscle shortens against a load, and a large part of that load is the elastic recoil of the parenchyma attached to the outside of the airway. **Increasing lung volume increases that tethering force**, which tends to oppose airway narrowing. That is a mechanical statement and the whole of what this model represents; it is **not** a claim about what a deep inspiration does to a person with asthma. |
| **Source** | Standard respiratory physiology for airway–parenchymal interdependence. Reviews of deep inspiration in asthma (PMC10585885), through the external review, for the boundary: the bronchodilator and bronchoprotective effects of a deep inspiration are impaired or lost in asthma, most of all where hyperresponsiveness is strong. |
| **Implementation** | `opposition = TETHERING_STRENGTH · stretch · lungInflation`, where `stretch` rises with the ventilation the region is receiving. The control is named `lungInflation` and labelled "Global lung inflation (parenchymal stretch)" so that it cannot be read as a manoeuvre. |
| **Assumption** | The strength, floor and coupling exponent are all illustrative and stay so. The **coupling exponent** (0.35, sub-linear) is doing a lot of work: it says a region that has stopped moving is still held open by its neighbours, and without it the model's feedback runs away and produces a uniformly shut lung instead of a patchy one. It is the single parameter this model's behaviour is most sensitive to, and it is not derived from anything. Beyond the parameters, the model omits the smooth-muscle dynamics — strain rate, cross-bridge cycling, contractile plasticity — that decide the real deep-inspiration response, which is why it may not be asked about one. |
| **Validation** | `physiology: greater lung inflation increases the tethering that opposes narrowing`; `more lung inflation means more tethering means wider airways`; `stronger parenchymal tethering does part of what cutting the feedback does`; and, for the boundary, `challenge 1 never claims a bronchodilator response to a real deep inspiration`. |
| **Confidence** | `tethering-direction` (**supported**, external layer) against `tethering-coupling` (**illustrative**, calibration layer), plus `deep-inspiration-not-modelled` — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 6. The loop through the parenchyma produces clustered ventilation defects

| | |
| --- | --- |
| **Claim** | Bronchoconstriction in asthma produces *clustered* ventilation defects on PET rather than a uniform reduction, and the clustering is self-organised: narrowing reduces local ventilation, which reduces the stretch tethering the airway open, which permits further narrowing. The system is bistable, and patchiness is a prelude to a catastrophic shift in which the whole lung goes. |
| **Source** | Venegas JG et al., *Nature* 434:777–82 (2005), doi:10.1038/nature03490, "Self-organized patchiness in asthma as a prelude to catastrophic shifts"; Winkler & Venegas (PMC4698910); the structure-to-function review of heterogeneity in asthma (PMC5543015) — all through the external review, and all for the mechanism rather than for any figure. |
| **Implementation** | The calibre of every airway depends on the ventilation of the region below it, and that ventilation depends on the calibres. The circularity is solved by damped fixed-point iteration. Responsiveness is *inherited* down the tree, because inflammation does not stop at a bifurcation and independent per-branch scatter produced speckle rather than regions. |
| **Assumption** | **This is not their model and it does not reproduce their results.** It is far smaller and cruder: 128 units against thousands, eight generations against the whole tree, a lumped acinus, no airway wall mechanics, no explicit bistability analysis, and contiguity defined on the tree rather than in space. What it demonstrates is the *shape* of the argument — that a uniform stimulus applied to a network with minimal heterogeneity, a steep local response and airway–parenchymal interdependence can produce clustered defects. Any quantitative agreement would be a coincidence. |
| **Validation** | The strongest test in the suite: `the patchiness is the feedback, not the scatter` re-solves the identical tree with the loop cut (`{ feedback: false }`) and asserts that most of the heterogeneity and nearly all of the defects disappear while the narrowing remains. `physiology: a uniform stimulus on a nearly-uniform tree produces clustered defects` and `physiology: disabling the interdependence feedback markedly attenuates the clustering` state the same pair against the literature rather than against the scene. `patchiness is a stage, not the end state` asserts the prelude-to-a-shift arc. |
| **Confidence** | `self-organised-patchiness` and `feedback-is-the-cause` (**supported**, external layer) against `inherited-sensitivity` (**illustrative**, calibration layer) — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 7. The dose-response has a knee

| | |
| --- | --- |
| **Claim** | A lung with this feedback does not narrow smoothly with dose: below a threshold almost nothing happens, and past it a great deal does. |
| **Source** | The same paper's central result, through summaries; the clinical observation that a small change in a patient's state produces a large change in what happens to them. |
| **Implementation** | Emergent. Nothing in the model has a threshold in it except the sigmoid of a single airway; the knee in the *lung's* response is the feedback amplifying that. |
| **Validation** | `the dose-response has a knee`, which asserts that the rise over the second half of the dose is more than six times the rise over the first; `resistance rises monotonically with the stimulus`. |
| **Confidence** | `maximum-narrowing` (**illustrative**, calibration layer) — see [`src/models/evidence.js`](../../src/models/evidence.js). |

### 8. Airway wall thickening is a separate insult that amplifies the first

| | |
| --- | --- |
| **Claim** | Airway remodelling thickens the wall, which takes lumen before any muscle contracts and — because resistance goes as the fourth power — amplifies whatever contraction follows. |
| **Source** | Standard teaching on airway remodelling in asthma. The magnitude is `illustrative`; remodelling thickens the central airways too, which is why the model drives it from the muscle fraction rather than from the constrictibility. |
| **Implementation** | `wallThickening` reduces baseline radius in proportion to each generation's `smoothMuscleFraction` — how much of the wall is muscle and submucosa — rather than its constrictibility. |
| **Assumption** | The size of the effect is illustrative; the model claims the direction and the amplification, not the amount. |
| **Validation** | `wall thickening costs calibre before any muscle contracts, and amplifies what follows`. |
| **Confidence** | `relative-defect-measure` (**uncertain**) — see [`src/models/evidence.js`](../../src/models/evidence.js). |

---

## What was deliberately not modelled

Each of these is a place where a plausible number could have been produced and
would have been wrong:

- **Gas exchange, perfusion, and any blood value.** Ventilation heterogeneity
  is a *cause* of hypoxaemia and is not the same thing as it; there is no
  perfusion in this model at all, so a V/Q statement would be invented. A test
  asserts no such key can appear in the model's output.
- **Inflammation, mucus plugging, eosinophils, IgE** — everything that makes
  asthma asthma. The model has a smooth muscle and a wall thickness.
- **Time.** Every state is an equilibrium. There is no onset, no recovery, no
  response over minutes, and no exacerbation as a process.
- **Expiratory flow limitation and air trapping**, which are the neighbouring
  COPD scene's subject and a different model.
- **Airway wall mechanics** — the load-bearing structure of the wall itself,
  which is what a serious model of this would put at its centre.
- **Spatial contiguity.** "Region" here means what one airway feeds. Two
  regions adjacent in a lung may be far apart in this tree.
