# Evidence — hip osteoarthritis: a centre that stopped being shared

Model: [`src/models/hipOsteoarthritis.js`](../../src/models/hipOsteoarthritis.js).
Boundary and failure modes: [`../model-cards/hip-osteoarthritis.md`](../model-cards/hip-osteoarthritis.md).
Machine-readable registry: `HIP_OA_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a **geometric** account of a sphere in a shell. **Nothing
here is a measurement, a radiograph, a grade or a symptom**, and in particular
the fractions it reports **are not joint space widths**. No row rests on a paper
this repository could open: the build environment cannot reach the medical
publishers, so nothing was extracted from a figure or a table by its author.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `one-shared-centre` — the two centres are the same point and the space is even all round | Standard hip anatomy; the atlas states it of its own two sites | One layer thickness, applied in every direction at rest | A spherical head and a spherical socket | `physiology: an intact hip is concentric and its space is even all round` |
| `a-direction-not-a-compartment` — the layer goes in a direction, the ball settles that way, and the centres come apart by what has gone | Standard descriptions of the patterns of narrowing and of head migration along them | `δ = t₀ · lost(where it is worst)`, applied along the chosen direction | Four patterns for a continuum (see §2) | `physiology: a hip narrows in a direction and the ball settles that way` |
| `the-far-side-opens` — the space opposite is wider than it began, because the ball moved away from a wall whose layer is still there | Solid geometry: an off-centre sphere in a shell | `gap(d) = t₀ − δ·cos(θ)` | A rigid shell | `physiology: the far side opens by what the ball moved` |
| `even-loss-keeps-the-centre` — where the layer goes evenly the centres stay shared and the space closes all round. **thin** — what makes a hip take one pattern rather than another is not claimed | A consequence of the geometry, and the standard description of concentric narrowing as a pattern of its own | The even pattern sets the offset to zero by construction | — | `physiology: even loss leaves the centres shared` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `a-drawn-layer-not-a-joint-space` | The thickness between the two bones, which every fraction is a fraction of | Illustrative: the difference between the head the hip atlas draws and the socket it draws. **The fraction reported of it is not a joint space width**, which is millimetres on a weight-bearing radiograph in a direction somebody chose |
| `four-patterns-and-a-spill` | The three angles, and how much of a directional loss reaches the rest of the surface | Calibrated so a directional loss is unmistakably directional while the rest of the surface is not left untouched. Four patterns standing for a continuum; the model claims that the direction decides the picture, never the angles |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `the-loop-is-open` | Watching the ball settle reads as watching a process that drives itself | Where the ball sits changes what it loads, and there is no loading in this model at all. The axis is how much is gone, not how it got there or why it went that way |
| `nothing-follows-about-the-person` | A closing space reads as a worsening person | Pain, stiffness, limp and range are outside the model entirely. No fraction, offset or pattern is a symptom, a grade or a probability of one |

## 4. What is outside the model entirely

- **Pain of every kind**, stiffness, limp, range, and what a person can do.
- **Time, progression and cause.**
- **All loading**: weight, alignment, gait, and the feedback they carry.
- Cysts, sclerosis, osteophytes, dysplasia, impingement, avascular necrosis,
  every grading system and every treatment.

## 5. How to check it

```bash
node --test tests/hip-osteoarthritis-physiology.test.js  # Layer 1: the four propositions
node --test tests/hip-osteoarthritis-model.test.js       # integrity, and the joint-space refusal
node --test tests/calibration.test.js                    # the two things this repository chose
```
