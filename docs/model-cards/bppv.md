# Model card — particles in a semicircular canal: an angle between gravity and a plane

| | |
| --- | --- |
| **Scene ID** | `bppv` |
| **Route** | `#/bppv` |
| **Model** | [`src/models/bppv.js`](../../src/models/bppv.js) |
| **Evidence** | [`../model-evidence/bppv.md`](../model-evidence/bppv.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

When loose particles are in a canal, what decides whether they move?

## 2. Model type

A geometric model, solved in closed form. Gravity is rotated into the head's
frame by a chosen head position, decomposed against a chosen canal's normal,
and the particle is placed at the lowest point of that loop.

Both controls are **scenarios and not severities**: two loops and two turns, and
nothing here says one becomes another.

## 3. What it is not

**No eye movement is derived here.** Nothing in this model is an eye, a muscle
or a direction of gaze, and **no output of it is a nystagmus**. There is no
symptom of any kind — no vertigo, nausea, latency, duration or fatigue — and no
repositioning manoeuvre or its effect. It is **quasi-static**: no inertia, no
fluid, no drag, no cupula and no time. There is no cause, no recurrence, and
nothing about which ear is affected in anybody.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `canal` | one of three | Which loop the particles are in, or none |
| `side` | left or right | Which way the head is turned |
| `head` | 0–1 | How far back the head has gone |

## 5. Outputs

- How much of gravity lies in the chosen canal's plane
- Whether that is enough to drive anything at all
- Where in the loop the particle settles, and how far round that is
- Whether that path runs towards the ampulla or away from it
- An explicit `nystagmus: null`

## 6. State variables

None. `solveBppv()` is a pure function of the axis and two controls.

## 7. Governing relations

```text
g       = gravity rotated into the head's frame
inPlane = g − (g·n) n
restsAt = the angle on the loop that inPlane points to
travel  = restsAt − (where it rested with the head upright)
```

Travel is measured from the **upright** rest rather than from a fixed point: a
particle in a loop whose plane already holds gravity has long since settled, so
starting it elsewhere would draw a journey a still head had already finished.

## 8. Constants and calibration

Three, and none is a measurement. The canal normals and the loop's radius are
the ear atlas's own, re-measured by a calibration test against the atlas's own
tube and the scene's own frame. The head's rotation and its extent were chosen
so the level loop goes from holding nothing to holding most of it — **not the
angle of any named manoeuvre**.

The third is the ampulla's position on each loop. **The atlas has no ampulla in
it** — it draws each canal as a plain loop of tube — so unlike the other two
this one could not be measured off anything. It was chosen so each loop has a
named end for `towardsAmpulla` to report a direction against, and a calibration
test fixes only that consequence, along with the fact that the atlas still has
nothing better to have used. **No angle here is where an ampulla is in
anybody.**

## 9. Visual mapping

- **Gravity moves and the head does not.** The claim is an angle between the
  two and can be drawn either way round; turning the head would swing the three
  loops out of comparison every time the axis moved. The arrow turns instead,
  and the visual mapping says so.
- The scene derives a loop's two in-plane axes with **the same construction the
  atlas uses**, so the angle the model solves is the angle the scene draws. A
  calibration test measures that against the atlas's own tube.
- The loop in question is lit and the others dimmed. **Lit means "this is the
  one in question"** — not active, damaged, stimulated or firing.
- **The ampulla is a structure this scene adds.** The atlas draws no swelling
  anywhere on the loops, so the body drawn and the angle it sits at are both
  this layer's. It exists so that "towards it" has something on screen to be
  about, and the visual mapping declares it.
- **Nothing anywhere moves, turns or changes colour to stand for an eye
  movement**, because the model does not derive one.

## 10. Known failure modes

- Quasi-static: the particle is drawn where it would end up, never on the way.
- The atlas puts the three canals on three cardinal planes; a real labyrinth
  does not.
- **In this drawing the posterior loop answers a turn either way identically**,
  because the atlas draws one ear and the turn is symmetric about that loop's
  plane. Only the lateral loop makes the two turns different pictures.
- One particle standing for many.
- The ampulla is drawn by this scene rather than by the anatomy it stands on.

## 11. Where it will mislead

**A canal being driven reads as a nystagmus with a direction.** A canal's plane
is related to the plane of the response it drives; this model does not take that
step, and nothing in its output is an eye.

**A particle arriving reads as an episode with a duration.** Latency, duration
and fatigue all live in the physics this model does not have.

**A head going back on an axis reads as a manoeuvre being performed.** It is one
rotation, chosen so the geometry is visible.

## 12. Safety boundary

Never use the model to infer a nystagmus or its direction, to identify which
canal or which ear is affected in anybody, to infer symptoms or their duration,
to plan or evaluate a repositioning manoeuvre, or to estimate any angle,
distance or position as a measurement.

## 13. Uncertainty

The three canals in three planes, the lateral one lying approximately level in
an upright head, and particles moving under gravity on a change of head
position are standard. What this model cannot support is any dynamics, any
response and any consequence.

## 14. Evidence and review

The dossier records the in-plane decomposition, the difference between the level
loop and the standing one, the head carrying the planes, and travel measured
from the upright rest as the externally supported claims, and declares the
atlas's planes and the head's chosen path as things this repository chose.
Independent clinical sign-off has not been recorded; the public review state is
`pending`.

## 15. Verification

```bash
node --test tests/bppv-physiology.test.js
node --test tests/bppv-model.test.js
node --test tests/calibration.test.js
```

One physiology test scans every output name for anything reading as an eye
movement or a symptom. A model test checks that the ear itself never moves or
turns while the arrow does, because the drawing's honesty about which of the two
is moving is the thing a reader will otherwise get backwards.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene (`src/data/patientGuides.js`,
id `bppv`). It walks the same three stages and stops where §12 does. No step
names a test, a manoeuvre or a diagnosis, no step says anything about eye
movement, and the step about what a person might notice is marked `associated`
and says on screen that it is not drawn from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to `src/models/bppv.js`. A
change to it must revise this card before its digest is adopted.
