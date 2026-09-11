# Evidence — knee osteoarthritis: one compartment, not one joint

Model: [`src/models/kneeOsteoarthritis.js`](../../src/models/kneeOsteoarthritis.js).
Boundary and failure modes: [`../model-cards/knee-osteoarthritis.md`](../model-cards/knee-osteoarthritis.md).
Machine-readable registry: `KNEE_OA_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a **geometric** account of what is left of an articular
layer and what follows on the side that lost it. **Nothing here is a
measurement, a radiograph, a grade or a symptom**, and in particular the
fraction the model reports **is not a joint space width**. No row rests on a
paper this repository could open: the build environment cannot reach the medical
publishers, so nothing was extracted from a figure or a table by its author.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `it-is-a-compartment` — one compartment loses its layer while the other still has one, and the medial is the commoner | Standard descriptions of knee osteoarthritis as compartmental, most often medial | Two independent compartments, each with its own remaining fraction | Two compartments only; no patellofemoral | `physiology: a knee loses a compartment rather than a joint` |
| `what-follows-goes-with-the-side` — marginal osteophytes and meniscal extrusion appear on the affected side. **thin** — the association is textbook; no size or order is claimed | Standard descriptions of the affected compartment | Both are computed per compartment from that compartment's loss | A threshold for marginal bone, chosen | `physiology: what follows appears on the side that lost the layer and not on the other` |
| `a-wedge-has-one-way-out` — a wedge between converging surfaces is pushed outward | Solid geometry, applied to the meniscus between condyle and plateau | `extrusion = k · lost` | The direction only; the size is §2 | `physiology: a wedge between converging surfaces is pushed outward` |
| `confined-and-even-are-different-pictures` — at the same amount lost, confined and even loss are two pictures rather than two severities | Arithmetic of the two distributions, and the clinical distinction between compartmental and generalised disease | `lost(other) = loss·(1 − confinement)`, with confinement on a control of its own | — | `physiology: the same amount lost is two pictures, not two severities` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `drawn-layer-not-a-joint-space` | The layer the model thins, and the separation between the compartments | Illustrative: the knee atlas's own drawn values, chosen there so the layer reads as a glaze on the joint. **The fraction reported of it is not a joint space width** — that is millimetres between bone surfaces on a weight-bearing radiograph, and it includes the meniscus. Nothing here is measured, weight-bearing or millimetres |
| `extrusion-coefficient` | How far a meniscus is pushed out per unit of layer lost | Calibrated so the movement is visible across the range the scene walks without the wedge leaving the joint. The direction is geometry; the size is this repository's, and no millimetre follows from it |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `the-loop-is-open` | Watching one side wear reads as watching a process that drives itself | Uneven loss loads the worn side harder, which is thought to be part of why it continues — and there is no loading in this model at all, so the feedback is not in it. The axis is how much is gone, not how it got there |
| `nothing-follows-about-pain` | A thinning layer reads as a worsening person | Pain, stiffness and function are outside the model entirely. No fraction, difference or picture in it is a symptom, a grade or a probability of one |

## 4. What is outside the model entirely

- **Pain of every kind**, stiffness, function, and what a person can do.
- **Time and progression.** The axis is how much is gone, not how long.
- **All loading**: weight, alignment, gait, and the feedback they carry.
- Inflammation, subchondral bone, synovium, effusion, crystals, every grading
  system and every treatment.
- Movement of any kind: the joint is drawn in extension and nothing moves.

## 5. How to check it

```bash
node --test tests/knee-osteoarthritis-physiology.test.js  # Layer 1: the four propositions
node --test tests/knee-osteoarthritis-model.test.js       # integrity, and the joint-space refusal
node --test tests/calibration.test.js                     # the two things this repository chose
```
