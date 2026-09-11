# Evidence — retinal detachment: where, not how much

Model: [`src/models/retinalDetachment.js`](../../src/models/retinalDetachment.js).
Boundary and failure modes: [`../model-cards/retinal-detachment.md`](../model-cards/retinal-detachment.md).
Machine-readable registry: `RETINAL_DETACHMENT_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a **geometric** account of a cap on a sphere. **Nothing
here is a measurement, a sight, a prognosis or a cause**, and in particular
macula-on and macula-off are taken **only** as a statement about whether one
drawn point lies inside one drawn edge. No row rests on a paper this repository
could open: the build environment cannot reach the medical publishers.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `the-macula-is-one-place-at-the-back` — the macula is a discrete region at the posterior pole, so whether it is inside a separation is a question about position | Standard descriptions of the macula and of detachment as separation of the neurosensory retina from the pigment epithelium | `maculaInside = halfAngle > angle(origin, macula)` | The macula as a point rather than a region with a width | `physiology: whether the macula is in it is decided by position, not by size` |
| `the-periphery-is-far-from-it` — a peripheral start is the better part of a right angle away, and a posterior one is not | The geometry of a sphere with the macula at one pole, over the atlas's own positions | Each origin carries its own measured angle to the macula | Five origins standing for a continuum of positions | `physiology: a peripheral start has a long way to go and a posterior one does not` |
| `area-and-macula-are-independent` — the area rises with the reach alone, so it cannot answer the macula question | Solid geometry: a cap's area depends on its half-angle, not on where its axis points | `area = (1 − cos halfAngle) / 2` | A circular cap spreading evenly | `physiology: the area is a cap on a sphere and rises with the reach alone` |
| `macula-on-and-off-are-two-pictures` — a scenario rather than a sequence. **thin** — nothing says one becomes the other | The standard clinical distinction, taken only as a statement about position | A two-valued state derived from one comparison | — | `physiology: how much further it has to reach is reported, and reaches zero exactly once` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `atlas-globe-and-angles` | The globe, its coats and the angle from each origin to the macula | Illustrative. Measured off `buildEyeball()`. The angles are angles of that drawing and the area is a share of that sphere |
| `how-far-the-arc-goes` | The widest the separation is drawn, in degrees from its origin | Calibrated so a peripheral separation reaches the macula before the top of the axis while leaving a long span where it plainly has not. Without it the scene could never show what it exists to show |
| `the-lift-is-drawn-not-measured` | How far the retina is drawn standing off the layer behind it | Illustrative, and **much larger than the atlas's own spacing between the coats** — at the real spacing a separation is a few pixels and invisible. It says *separated*, not *how high* |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `no-vision-is-produced-or-implied` | A detached retina reads as a person who cannot see | **Uncertain and out of scope.** No acuity, no field, no contrast, no perception. The read-out prints "not in this model" where sight would go |
| `no-prognosis-follows-from-the-macula` | macula-off reads as an outcome | Nothing here says what recovers, how much, or when. It is the thing most often said about this subject and the thing this model most firmly does not compute |
| `no-cause-and-no-kind` | Five origins read as five causes | They are five places. No tear, traction, exudate, myopia or trauma is represented |
| `no-gravity-and-no-fluid` | An inferior start reads as behaving differently | It does not: the two are the same angular distance from the macula, and there is no gravity here. A real detachment is neither circular nor even |

## 4. What is outside the model entirely

- **All vision** and **all prognosis**.
- The cause and the kind of detachment, and every mechanism.
- Time, fluid, gravity and surgery.

## 5. How to check it

```bash
node --test tests/retinal-detachment-physiology.test.js  # Layer 1: the four propositions
node --test tests/retinal-detachment-model.test.js       # integrity: the drawing against the model
node --test tests/calibration.test.js                    # the three things this repository chose
```
