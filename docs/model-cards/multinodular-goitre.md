# Model card — multinodular goitre: moved, or made narrower

| | |
| --- | --- |
| **Scene ID** | `multinodular-goitre` |
| **Route** | `#/multinodular-goitre` |
| **Model** | [`src/models/multinodularGoitre.js`](../../src/models/multinodularGoitre.js) |
| **Evidence** | [`../model-evidence/multinodular-goitre.md`](../model-evidence/multinodular-goitre.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

A nodular thyroid of a given size — what does the direction it has enlarged in
decide?

## 2. Model type

A geometric model, solved in closed form. The volume added becomes a distance
the gland's face advances; the direction chosen says how much of that distance
moves the airway, how much narrows it, and how much goes back past the
structures on the gland's posterior surface.

The direction is a **scenario and not a severity**. Four arrangements, and a
goitre does not pass from one to the next.

## 3. What it is not

**It contains no thyroid function of any kind.** No hormone, no TSH, no uptake,
no autonomy. A goitre of any shape here may be euthyroid, overactive or
underactive, and nothing about the shape says which — that refusal is part of
what the scene is for. It also contains no malignancy, cytology or calcification;
no swallowing, breathing, voice or symptom; no time, growth rate or treatment.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `direction` | one of five | Which way it enlarges, or not enlarged |
| `burden` | 0–3 | How much nodular tissue there is, as a multiple of one lobe |

The scene's **axis is `burden`**. The direction is on the control panel.

## 5. Outputs

- The gland against its own volume — **the same in every direction**
- Whether the airway is being pushed aside, narrowed, or neither
- What is left across the airway, against this model's own resting width
- How far the airway has been pushed, in its own radii
- How far the gland reaches back past the nerve and the parathyroid glands

## 6. State variables

None. `solveMultinodularGoitre()` is a pure function of its two controls.

## 7. Governing relations

```text
advance   = burden · V(lobe) / faceArea
push      = advance · towardTrachea(direction)
deviation = push · (1 − confined(direction))
indent    = push · confined(direction)
width     = (2R − indent) / 2R
behind    = advance · behind(direction) / depth(lobe)
```

## 8. Constants and calibration

The lobe's volume and depth and the airway's calibre are the atlas's, measured
off its meshes; `tests/calibration.test.js` recomputes each and fails if they
drift. The face area turns a volume into a distance and was chosen so the range
the scene offers is visible without running away. The twelve direction
coefficients are a reading of four standard pictures, and the test that defends
them defends the ordering — exactly one direction is confined — not the sizes.

## 9. Visual mapping

Declared in `VISUAL_MAPPING` (`src/data/multinodularGoitre.js`):

- The lobes are extended along the chosen direction by the model's distance. The
  shape they grow *into* is drawn rather than solved: this model has one distance
  in it and no nodules.
- The airway is bent across by the distance the model says it was pushed, and
  narrowed at the inlet by the fraction it reports. **That fraction is against
  this model's own resting width and is not a tracheal diameter.**
- The nerve and the parathyroid glands are lit once the gland reaches back past
  them. **Lit is where they are, not what has happened to them.**

The scene draws two things the atlas does not have, and both are declared: its
own airway, because whether that is bent or narrowed is the subject; and the
thoracic inlet, because it is the boundary the whole claim rests on.

## 10. Known failure modes

- One distance for an advance, and no shape to the nodules at all.
- One confined direction, where a real goitre goes several ways at once.
- Four plausible parathyroid positions, where the real ones vary more than
  almost anything else in the neck.
- A ring for the thoracic inlet, and no other skeleton anywhere.

## 11. Where it will mislead

**A picture of a thyroid invites an inference about thyroid function.** There is
none here, and the scope panel says so in both languages
(`no-function-anywhere`).

**A lit nerve reads as an injured one.** It is where the nerve is. Nothing in
this model says a nerve is damaged, at risk, or anything else about it
(`a-relation-is-not-an-injury`).

## 12. Safety boundary

Never use the model to infer thyroid function from a shape, to estimate a gland
or an airway dimension, to grade or stage a goitre, to judge the risk to a nerve
or a parathyroid gland, to distinguish benign from malignant, or to decide
whether, when or how anything should be operated on.

## 13. Uncertainty

The boundaries and the arrangement are standard. What this model cannot support
is any magnitude and any consequence: how far a given goitre displaces anything,
what that does to breathing or swallowing, and what happens to a nerve the gland
has passed. All of those are outside it.

## 14. Evidence and review

The dossier records the soft neck and the rigid inlet, the invariant volume, the
posterior arrangement and the need for asymmetry as the externally supported
claims, and declares the atlas's proportions, the face area and the twelve
direction coefficients as things this repository chose. Independent clinical
sign-off has not been recorded; the public review state is `pending`.

## 15. Verification

```bash
node --test tests/multinodular-goitre-physiology.test.js
node --test tests/multinodular-goitre-model.test.js
node --test tests/calibration.test.js
```

The model tests include one that is unusual for this repository: it checks the
*scope data* rather than the model, because "the shape does not tell you the
function" is a claim the scene has to make in a place a reader will see.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene (`src/data/patientGuides.js`,
id `multinodular-goitre`). It walks the same three stages and stops where §12
does. No step names a test, a drug, an operation or a risk, and the steps about
what a person might notice are marked `associated` and say on screen that they
are not drawn from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/multinodularGoitre.js`. A change to it must revise this card before
its digest is adopted.
