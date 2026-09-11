# Model card — knee osteoarthritis: one compartment, not one joint

| | |
| --- | --- |
| **Scene ID** | `knee-osteoarthritis` |
| **Route** | `#/knee-osteoarthritis` |
| **Model** | [`src/models/kneeOsteoarthritis.js`](../../src/models/kneeOsteoarthritis.js) |
| **Evidence** | [`../model-evidence/knee-osteoarthritis.md`](../model-evidence/knee-osteoarthritis.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

When a knee loses its articular layer, what does it change that "the cartilage
wore out" does not say?

## 2. Model type

A geometric model, solved in closed form: what is left of a drawn layer in each
of two compartments, and what follows on the side that lost it.

The compartment is a **choice** and the distribution is a **shape**. At the same
amount lost, confined loss and even loss are two different pictures, and the
scene is built so those cannot be confused with two severities.

## 3. What it is not

It contains no pain, stiffness or function; no time or progression; **no loading
of any kind**; no inflammation, subchondral bone, synovium, effusion or
crystals; no grading system and no treatment. The joint is drawn in extension and
nothing in it moves.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `side` | one of three | Which compartment carries the loss, or neither |
| `loss` | 0–1 | How much of the layer is gone at that compartment |
| `confinement` | 0–1 | How confined to it that is; 0 shares it evenly |

The scene's **axis is `loss`**.

## 5. Outputs

- What is left of each side's layer, **as a fraction of this model's own drawn
  layer**
- How far apart the two sides are
- How far the meniscus on each side is pushed out from between the surfaces
- Whether new bone has grown at each rim, and whether the surfaces meet
- Whether this is one compartment or a whole joint

## 6. State variables

None. `solveKneeOsteoarthritis()` is a pure function of its three controls.

## 7. Governing relations

```text
lost(worst) = loss
lost(other) = loss · (1 − confinement)
remaining   = 1 − lost
extrusion   = k · lost
```

## 8. Constants and calibration

The layer's thickness and the compartments' separation are the knee atlas's own
drawn values; `tests/calibration.test.js` checks the model thins the layer the
atlas draws, and that the layer really is four meshes rather than one coat. The
extrusion coefficient was chosen so the movement is visible across the range
without the wedge leaving the joint.

## 9. Visual mapping

Declared in `VISUAL_MAPPING` (`src/data/kneeOsteoarthritis.js`). The condylar cap
is scaled back towards its condyle and the plateau cap sinks into its plateau by
what has gone — both approximations of a thickness, neither a measurement. The
meniscus slides outward by the fraction the model reports; the rim swells once
enough has gone.

**The fraction is of this model's own drawn layer and is not a joint space
width.** Joint space width is millimetres between bone surfaces on a
weight-bearing film and it includes the meniscus. The declaration says so, the
scope panel says so, and a test checks that both still do.

## 10. Known failure modes

- Two compartments only: no patellofemoral joint in the model.
- One position, in extension, and nothing moves.
- Marginal bone as a swelling of the rim, with no shape, place or order to it.
- A meniscus that is moved rather than deformed.

## 11. Where it will mislead

**Watching one side wear reads as watching a process that drives itself.** There
is no loading in this model, so the loop by which uneven loss loads the worn side
harder is left open rather than represented (`the-loop-is-open`).

**A thinning layer reads as a worsening person.** Pain and function are outside
the model entirely (`nothing-follows-about-pain`).

## 12. Safety boundary

Never use the model to estimate a joint space width or any dimension, to grade
osteoarthritis, to infer pain, stiffness or function from what is left of a
layer, to predict progression, or to decide whether, when or how anything should
be treated or replaced.

## 13. Uncertainty

The compartmental pattern, the marginal bone and the extrusion are standard.
What this model cannot support is any magnitude, any sequence and any
consequence: how fast a compartment loses its layer, what it takes to start,
and what any of it means for a person.

## 14. Evidence and review

The dossier records the compartmental pattern, the side-bound consequences, the
wedge geometry and the confined-versus-even distinction as the externally
supported claims, and declares the atlas's layer and the extrusion coefficient as
things this repository chose. Independent clinical sign-off has not been
recorded; the public review state is `pending`.

## 15. Verification

```bash
node --test tests/knee-osteoarthritis-physiology.test.js
node --test tests/knee-osteoarthritis-model.test.js
node --test tests/calibration.test.js
```

One of the model tests checks the *declaration* rather than the model: that
neither the visual mapping nor the scope panel has stopped saying the layer is
not a joint space width.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene (`src/data/patientGuides.js`,
id `knee-osteoarthritis`). It walks the same three stages and stops where §12
does. No step names a test, a drug, an operation or a risk, and the steps about
what a person might notice are marked `associated` and say on screen that they
are not drawn from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/kneeOsteoarthritis.js`. A change to it must revise this card before
its digest is adopted.
