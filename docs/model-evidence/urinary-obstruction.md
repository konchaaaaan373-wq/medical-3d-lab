# Evidence — urinary obstruction: what is above it

Model: [`src/models/urinaryObstruction.js`](../../src/models/urinaryObstruction.js).
Boundary and failure modes: [`../model-cards/urinary-obstruction.md`](../model-cards/urinary-obstruction.md).
Machine-readable registry: `URINARY_OBSTRUCTION_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a **geometric** account of a tract drawn as two tubes
joining at one bladder. **Nothing here is a measurement, a scan, a grade or a
kidney function**, and in particular the parenchymal thickness it reports **is
not a cortical thickness**. No row rests on a paper this repository could open:
the build environment cannot reach the medical publishers, so nothing was
extracted from a figure or a table by its author.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `two-tubes-one-bladder` — the tract is two tubes that join at the bladder, so how many kidneys lie above a blockage is a property of where it is: one above the bladder, both at the way out of it | Standard urinary tract anatomy, and standard descriptions of unilateral obstruction above the bladder against bilateral involvement in bladder outlet obstruction | `STRETCHES` carries a side per stretch; `LEVELS` carries the sides each level puts above it, and `kidneysBehind` is that list's length | One ureter per kidney, no duplication, no reflux and no crossing | `physiology: how many kidneys are behind it is decided by the place, not the amount` |
| `above-fills-and-below-does-not` — what lies above a blockage distends and what lies below it does not, so the boundary between them is where the blockage is | Standard descriptions of dilatation of the collecting system and ureter proximal to the level of an obstruction | Every stretch at or before the blocked one on its side is distended by the axis; every other stretch stays at rest | One pressure throughout the connected length above it, and no gradient along it | `physiology: everything above the blockage is distended and everything below is not` |
| `the-same-kidney-with-a-different-length-behind-it` — a blockage at the top of a ureter and one at its bottom stand above the same kidney with a different length of tube between | A consequence of the topology, with the standard description of a pelviureteric obstruction leaving the ureter undilated | The distended share is counted over the named stretches, and the pelviureteric level blocks the pelvis rather than the tube | The ureter as three equal named divisions of one drawn tube | `physiology: further down the same ureter puts more of the tract above the same kidney` |
| `the-capsule-does-not-give` — a kidney is inside a capsule that does not stretch readily, so a collecting system that fills takes its room from the parenchyma next to it; the dilated pelvis and the thinned parenchyma are the same volume counted twice | Standard descriptions of the renal capsule, and of parenchymal thinning accompanying a dilated collecting system | `V(capsule) = V(kidney)·(1 + GIVE·p)` with `GIVE` small, and the thickness as the difference of the two cube roots | The kidney and the collecting system as nested ellipsoids that thin evenly | `physiology: the room the collecting system gains comes mostly out of the parenchyma` |
| `the-spared-side-is-not-in-the-picture` — the side with nothing above it is unchanged **by this model**. **thin** — nothing is claimed about what happens to the other kidney in a person | A consequence of the topology rather than a clinical observation | The spared side's kidney is returned at its resting state, and the scene draws it in a colour of its own | — | `physiology: the spared kidney is untouched, whatever the amount` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `atlas-proportions` | The kidney's and the collecting system's semi-axes, from which every volume and ratio is computed | Illustrative. They are the landmark kidney builder's own drawn proportions, chosen there to read as a kidney at thumbnail size. **No volume here is millilitres and no semi-axis is a dimension of anybody** |
| `retained-load-and-capsule-give` | How much backs up at the top of the axis, and how far the capsule yields | Calibrated: the load was chosen so that the dilation and the thinning are both visible across the range without the collecting system reaching the capsule, and the give was chosen so that the capsule's share of the retained volume stays a minority one — the claim in `the-capsule-does-not-give` is a claim about that ratio, so a test fixes it |
| `dilation-factors` | How far a distended ureter and a distended bladder are drawn against their resting size | Illustrative, and chosen to be legible. The tract's calibres are not solved from anything: unlike the kidney, where the thickness follows from two volumes, these are drawn values that say *distended* and do not say *how much* |
| `thinned-below` | The share of resting thickness below which the parenchyma is reported as thinned | Chosen so that it fires where the change is visible on screen. **It is not a grade and not a clinical threshold**, and this model grades nothing |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `a-thin-parenchyma-reads-as-a-failing-kidney` | A parenchyma drawn thin looks like a kidney that has stopped working | **Uncertain, and outside the model.** There is no filtration, no creatinine, no urine output and no recovery here. Whether a kidney behind an obstruction is working, how much, and whether it recovers are all things this model does not compute and does not carry from `renal-filtration` |
| `thickness-is-not-volume` | The thickness falls faster than the volume does, so the picture reads worse than the volume is | A thin shell round a large cavity still holds a good deal. Both numbers are in the read-out for that reason, and neither is a measure of how much kidney is left to work with |
| `the-side-is-arbitrary` | The blockage is always on the left in the one-sided levels, which reads as a claim about sides | It is a drawing decision: the scene has to put it somewhere. Nothing here says which side anything happens on |
| `a-level-reads-as-a-stage` | Five levels in a list read as five degrees of one illness | A blockage does not travel down the tract. The levels are five arrangements, and the axis underneath them is a separate thing — how much has backed up, not how far along anybody is |

## 4. What is outside the model entirely

- **All kidney function**: filtration, creatinine, urine output, recovery, loss.
  Nothing here is coupled to `renal-filtration`.
- **Every grade and stage.** This model does not grade hydronephrosis.
- The cause of the obstruction: stone, tumour, stricture, prostate, pregnancy.
- Time, and everything that depends on it: how long, how fast, whether it lasts.
- Pain, fever, infection, every symptom, and every treatment.

## 5. How to check it

```bash
node --test tests/urinary-obstruction-physiology.test.js  # Layer 1: the five propositions
node --test tests/urinary-obstruction-model.test.js       # integrity: the drawing against the model
node --test tests/calibration.test.js                     # the four things this repository chose
```
