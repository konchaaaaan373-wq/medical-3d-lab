# Evidence — particles in a semicircular canal: an angle between gravity and a plane

Model: [`src/models/bppv.js`](../../src/models/bppv.js).
Boundary and failure modes: [`../model-cards/bppv.md`](../model-cards/bppv.md).
Machine-readable registry: `BPPV_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a **geometric** account of a particle in a loop. **Nothing
here is a measurement, an eye movement, a symptom or a manoeuvre**, and in
particular **no output of this model is a nystagmus**. No row rests on a paper
this repository could open: the build environment cannot reach the medical
publishers.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `only-what-lies-in-the-plane-drives-it` — only the part of gravity in a loop's plane can move a particle along it | Vector decomposition against a plane, over the atlas's own normals | `inPlane = g − (g·n)n`, and nothing moves below a threshold on its magnitude | A loop in one plane, and a particle with nothing holding it | `physiology: a loop can only be driven by the gravity lying in its plane` |
| `the-level-loop-and-the-standing-one` — the lateral canal is level in an upright head and the posterior canal's plane already holds gravity, so two loops in one ear are in different states at one head position | Standard descriptions of the three canals in three planes, with the lateral approximately level upright | The two normals differ, and the same gravity decomposes differently against each | Three cardinal planes (see §3) | `physiology: two loops in one ear, at one head position, are in different states` |
| `the-head-moves-and-the-planes-go-with-it` — taking the head back brings gravity into a plane that held none | Standard descriptions of BPPV as particles moving under gravity on a change of head position, taken only as far as the geometry | Gravity is rotated into the head's frame by the axis | One chosen rotation | `physiology: taking the head back brings gravity into the level loop’s plane` |
| `a-still-head-has-already-settled` — travel is measured from where the particle sat upright, so a still head shows none | A consequence of the quasi-static treatment | The upright rest is derived and subtracted | No inertia and nothing holding the particle | `physiology: the particle starts where it already was, not somewhere convenient` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `atlas-canal-planes` | The normals of the three planes and the loop's radius | Illustrative, measured off `buildEar()`. The atlas puts the canals on three cardinal planes, which a real labyrinth does not |
| `the-heads-path-is-chosen` | The rotation the axis carries the head through, and how far | Calibrated so the level loop goes from holding nothing to holding most of it. **Not the angle of any named manoeuvre**, and no point on the axis is a step of one |
| `where-the-ampulla-is-put` | Where on each loop the ampulla sits — the end `towardsAmpulla` names a direction against | **The atlas draws no ampulla**: each canal is a plain loop of tube, so there was nothing to measure. Chosen so each loop has a named end, and so both directions of travel are reachable. The body drawn at that angle is added by the scene, and **no angle here is where an ampulla is in anybody** |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `no-eye-movement-is-derived` | A canal being driven reads as a nystagmus with a direction | **Uncertain and out of scope.** Nothing here is an eye, a muscle or a direction of gaze. The read-out prints "not derived here" where a nystagmus would go |
| `quasi-static-and-nothing-else` | A particle arriving reads as a process with a duration | It is drawn where it would end up. Latency, duration and fatigue all live in physics this model does not have |
| `the-two-turns-are-not-mirror-images-here` | Two turns read as two sides of a head | The atlas draws one ear, and the turn is symmetric about the posterior loop's plane — so only the lateral loop differs. A statement about this drawing |
| `one-particle-standing-for-many` | One body reads as one otoconium | Nothing here is a count or a size |
| `no-symptom-and-no-manoeuvre` | A head going back on an axis reads as a manoeuvre being performed | It is one rotation, chosen so the geometry is visible |
| `three-cardinal-planes` | Tidy right angles read as anatomy | The atlas's own simplification. The claims are about *which* plane, not the angles between them |
| `where-the-ampulla-is-put` | A labelled body on the loop reads as a structure the anatomy has | The scene added it, and the visual mapping says so. Nothing in the model depends on where it is |

## 4. What is outside the model entirely

- **Every eye movement**, and **every symptom and manoeuvre**.
- All the physics beyond gravity and a plane: inertia, fluid, drag, the cupula,
  and time.
- Cause, recurrence, and which ear is affected in anybody.

## 5. How to check it

```bash
node --test tests/bppv-physiology.test.js  # Layer 1: the four propositions
node --test tests/bppv-model.test.js       # integrity: the drawing against the model
node --test tests/calibration.test.js      # the two things this repository chose
```
