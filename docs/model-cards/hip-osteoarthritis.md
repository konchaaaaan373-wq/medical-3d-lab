# Model card — hip osteoarthritis: a centre that stopped being shared

| | |
| --- | --- |
| **Scene ID** | `hip-osteoarthritis` |
| **Route** | `#/hip-osteoarthritis` |
| **Model** | [`src/models/hipOsteoarthritis.js`](../../src/models/hipOsteoarthritis.js) |
| **Evidence** | [`../model-evidence/hip-osteoarthritis.md`](../model-evidence/hip-osteoarthritis.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

When a hip loses its articular layer, what does a ball in a socket do that a
knee does not?

## 2. Model type

A geometric model of a sphere in a shell, solved in closed form. The layer is
lost in a chosen direction; the ball settles that way by what has gone; the
space round the socket follows from the eccentricity.

The direction is a **scenario and not a severity**, and the pattern with no
direction in it is a different picture rather than a milder one.

## 3. What it is not

It contains no pain, stiffness, limp, range or anything a person can do; no
time, progression or cause; **no loading of any kind**; no cyst, sclerosis,
osteophyte, dysplasia, impingement or avascular necrosis; no grading system and
no treatment.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `direction` | one of five | Which way the layer goes, evenly, or nowhere |
| `loss` | 0–1 | How much of it is gone where it is thinnest |

## 5. Outputs

- What is left of the space in each named direction, **as a fraction of this
  model's own drawn layer**
- How far the two centres have come apart, against the layer's thickness
- Which direction is narrowest and which has most space
- Whether the centres are still shared, and whether the far side looks wider
  than it began

## 6. State variables

None. `solveHipOsteoarthritis()` is a pure function of its two controls.

## 7. Governing relations

```text
t(d)   = t₀ · (1 − lost(d))
δ      = t₀ · lost(where it is worst)
gap(d) = t₀ − δ·cos(θ from that direction)
```

## 8. Constants and calibration

The layer is the difference between the head the hip atlas draws and the socket
it draws; `tests/calibration.test.js` checks the model thins that one. The three
angles and the spill were chosen so a directional loss is unmistakably
directional while the rest of the surface is not left untouched.

## 9. Visual mapping

Declared in `VISUAL_MAPPING` (`src/data/hipOsteoarthritis.js`):

- **The space is drawn as a ring of segments**, each as thick as the model says
  the space is in that direction and coloured by how much is left. The atlas's
  even layer is hidden while it is shown, because an even layer is the one thing
  this scene is about not being true.
- The ball and everything below it settle along the direction by what has gone
  there, so the two centres come apart on screen by what the model says.
- Segments wider than they began are drawn in a colour of their own. **That is
  not a claim that anything has grown.**

**No thickness in the ring is a joint space width.**

## 10. Known failure modes

- Four patterns for a continuum of directions.
- A ring in one plane; a hip is not a disc.
- A rigid shell and a spherical head, with no shape change in either.
- One position, with nothing moving.

## 11. Where it will mislead

**Watching the ball settle reads as a process that drives itself** — there is no
loading in this model (`the-loop-is-open`).

**A closing space reads as a worsening person** — pain and function are outside
it (`nothing-follows-about-the-person`).

## 12. Safety boundary

Never use the model to estimate a joint space width or any dimension, to grade
hip osteoarthritis, to classify a pattern of migration in anybody, to infer pain
or function from what is left of a layer, to predict progression, or to decide
whether, when or how anything should be treated or replaced.

## 13. Uncertainty

The concentricity, the described patterns and the geometry of an off-centre
sphere are standard. What this model cannot support is any magnitude and any
cause: how fast a hip loses its layer, why it goes one way rather than another,
and what any of it means for a person.

## 14. Evidence and review

The dossier records the shared centre, the directional loss, the apparent
widening and the even pattern as the externally supported claims, and declares
the atlas's layer and the four patterns as things this repository chose.
Independent clinical sign-off has not been recorded; the public review state is
`pending`.

## 15. Verification

```bash
node --test tests/hip-osteoarthritis-physiology.test.js
node --test tests/hip-osteoarthritis-model.test.js
node --test tests/calibration.test.js
```

One of the model tests checks every segment of the drawn ring against the model's
own gap, because the ring *is* the answer in this scene rather than an
illustration of it.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene (`src/data/patientGuides.js`,
id `hip-osteoarthritis`). It walks the same three stages and stops where §12
does. No step names a test, an operation or a risk, and the steps about what a
person might notice are marked `associated` and say on screen that they are not
drawn from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/hipOsteoarthritis.js`. A change to it must revise this card before
its digest is adopted.
