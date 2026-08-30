# Model evidence — Asthma: heterogeneous bronchoconstriction and ventilation heterogeneity

Implementation: [`src/models/asthma.js`](../../src/models/asthma.js)
Boundary of the claim: [`docs/model-cards/asthma.md`](../model-cards/asthma.md)
Tests: [`tests/asthma-model.test.js`](../../tests/asthma-model.test.js), [`tests/asthma-scene.test.js`](../../tests/asthma-scene.test.js)

## How these sources were consulted

**Read this first.** The network this repository was built on blocks the
medical publishers and index sites — PubMed, PMC, Nature, the ERS and ATS
journals, Wiley and BMJ are all unreachable from here. Every source below was
reached through **search-result summaries and abstracts, not full text.** In
particular, the Venegas 2005 paper that this model's mechanism comes from was
**not read**; what is reproduced here is the mechanism as it is described in
secondary accounts, at a level of detail that does not include their model's
equations or parameters.

That is a material limitation. It is why this model claims only the *shape* of
the result, why every quantity it reports is relative, and why the model card
forbids reading any figure here as a measurement.

---

## Claim → Source → Implementation → Assumption → Validation

### 1. Airway resistance goes as the fourth power of the radius

| | |
| --- | --- |
| **Claim** | For laminar flow in a tube, `R = 8ηL / πr⁴`. Halving a radius multiplies resistance sixteenfold, which is why a disease of small airways is a disease at all. |
| **Source** | Poiseuille's law, as it is taught in every respiratory physiology text. |
| **Implementation** | `branchResistance(branch, radius) = length / radius⁴`, in arbitrary units, used only to form ratios. |
| **Assumption** | **Poiseuille is not applied unconditionally to the whole tree as a statement about absolute resistance.** Flow in the trachea and main bronchi is not laminar; the real airway tree's resistance is not this expression's. The model uses the *exponent* — a relative statement about what narrowing costs — and reports every resistance as a ratio to the same tree unstimulated, so that the part it is wrong about cancels. This is stated in the scene's scope panel and in its disclaimer. |
| **Validation** | The whole test suite works in ratios; `mid-expiratory maximal flow` style absolute checks are deliberately absent because the model does not claim absolutes. |

### 2. A symmetric dichotomous tree with a diameter ratio of 2^(−1/3)

| | |
| --- | --- |
| **Claim** | The conducting airways branch by dichotomy, with each generation's diameter about 0.79 of the last — the ratio that minimises the cost of moving gas (Hess–Murray), and the one Weibel's model A uses. |
| **Source** | Weibel's morphometry and the Hess–Murray law, through summaries and standard texts. |
| **Implementation** | `HOMOTHETY = 2 ** (-1/3)`; branch length and radius both scale by it per generation; eight generations, 128 terminal units. |
| **Assumption** | Real branching is markedly **asymmetric** and a lung has twenty-three generations. Both simplifications matter: an asymmetric tree distributes flow differently, and the missing generations are exactly the ones where the total cross-section explodes, which is why this model's resistance is spread evenly across its generations where a real lung's is concentrated centrally. The model does not claim to say where in a lung the resistance sits. |
| **Validation** | `the tree is a complete binary tree of the size it says`; `each generation is narrower than the last by the homothety ratio`. |

### 3. Airway smooth muscle is a small-airway story

| | |
| --- | --- |
| **Claim** | The trachea and main bronchi are held open by cartilage; smooth muscle comes to dominate in the small bronchi and bronchioles. |
| **Source** | Standard respiratory anatomy. |
| **Implementation** | `smoothMuscleShare(generation)` ramps from 0 at the trachea to 1 by generation 3. |
| **Assumption** | The ramp's position is illustrative. What is claimed is that it exists and which end it is at. |
| **Validation** | `smooth muscle is a small-airway thing`. |

### 4. The smooth-muscle response is sigmoid

| | |
| --- | --- |
| **Claim** | Airway smooth muscle's response to an agonist is a sigmoid dose-response, not a linear one. |
| **Source** | Standard pharmacology of smooth muscle. |
| **Implementation** | `narrowing = 1 / (1 + exp(−k(activation − opposition)))` with `k = 6`. |
| **Assumption** | The steepness is illustrative and it matters: the clustering in this model needs both a steep local response *and* the feedback loop below, and the model card says so. |
| **Validation** | Covered indirectly by the knee test; the steepness has no separate test because no source was reachable to check it against. **Thin.** |

### 5. Narrowing is opposed by the parenchyma tethering the airway open

| | |
| --- | --- |
| **Claim** | Airway smooth muscle shortens against a load, and a large part of that load is the elastic recoil of the parenchyma attached to the outside of the airway. The more the lung is stretched, the greater the load, which is why a deep inspiration dilates a constricted airway. |
| **Source** | Standard respiratory physiology; the deep-inspiration bronchodilation literature, through summaries. |
| **Implementation** | `opposition = TETHERING_STRENGTH · stretch · inflation`, where `stretch` rises with the ventilation the region is receiving. |
| **Assumption** | The strength, floor and coupling exponent are all illustrative. The **coupling exponent** (0.35, sub-linear) is doing a lot of work: it says a region that has stopped moving is still held open by its neighbours, and without it the model's feedback runs away and produces a uniformly shut lung instead of a patchy one. It is the single parameter this model's behaviour is most sensitive to, and it is not derived from anything. **Thin.** |
| **Validation** | `a deep breath opens the airways, and that is the tethering doing it`; `a deep breath does part of what cutting the feedback does, and by the same route`. |

### 6. The loop through the parenchyma produces clustered ventilation defects

| | |
| --- | --- |
| **Claim** | Bronchoconstriction in asthma produces *clustered* ventilation defects on PET rather than a uniform reduction, and the clustering is self-organised: narrowing reduces local ventilation, which reduces the stretch tethering the airway open, which permits further narrowing. The system is bistable, and patchiness is a prelude to a catastrophic shift in which the whole lung goes. |
| **Source** | Venegas JG et al., *Nature* 434:777–82 (2005), "Self-organized patchiness in asthma as a prelude to catastrophic shifts". **Not read in full** — see the note at the top. |
| **Implementation** | The calibre of every airway depends on the ventilation of the region below it, and that ventilation depends on the calibres. The circularity is solved by damped fixed-point iteration. Responsiveness is *inherited* down the tree, because inflammation does not stop at a bifurcation and independent per-branch scatter produced speckle rather than regions. |
| **Assumption** | This model is far smaller and cruder than theirs: 128 units against thousands, no airway wall mechanics, no explicit bistability analysis, contiguity defined on the tree rather than in space. What it claims to reproduce is the *shape* of the result, not their numbers. |
| **Validation** | The strongest test in the suite: `the patchiness is the feedback, not the scatter` re-solves the identical tree with the loop cut (`{ feedback: false }`) and asserts that most of the heterogeneity and nearly all of the defects disappear while the narrowing remains. `patchiness is a stage, not the end state` asserts the prelude-to-a-shift arc. |

### 7. The dose-response has a knee

| | |
| --- | --- |
| **Claim** | A lung with this feedback does not narrow smoothly with dose: below a threshold almost nothing happens, and past it a great deal does. |
| **Source** | The same paper's central result, through summaries; the clinical observation that a small change in a patient's state produces a large change in what happens to them. |
| **Implementation** | Emergent. Nothing in the model has a threshold in it except the sigmoid of a single airway; the knee in the *lung's* response is the feedback amplifying that. |
| **Validation** | `the dose-response has a knee`, which asserts that the rise over the second half of the dose is more than six times the rise over the first; `resistance rises monotonically with the stimulus`. |

### 8. Airway wall thickening is a separate insult that amplifies the first

| | |
| --- | --- |
| **Claim** | Airway remodelling thickens the wall, which takes lumen before any muscle contracts and — because resistance goes as the fourth power — amplifies whatever contraction follows. |
| **Source** | Standard teaching on airway remodelling in asthma. **Thin** on magnitude. |
| **Implementation** | `wallThickening` reduces baseline radius in proportion to each generation's muscle share. |
| **Assumption** | The size of the effect is illustrative; the model claims the direction and the amplification, not the amount. |
| **Validation** | `wall thickening costs calibre before any muscle contracts, and amplifies what follows`. |

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
