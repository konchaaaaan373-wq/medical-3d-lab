# Model card — urinary obstruction: what is above it

| | |
| --- | --- |
| **Scene ID** | `urinary-obstruction` |
| **Route** | `#/urinary-obstruction` |
| **Model** | [`src/models/urinaryObstruction.js`](../../src/models/urinaryObstruction.js) |
| **Evidence** | [`../model-evidence/urinary-obstruction.md`](../model-evidence/urinary-obstruction.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

A urinary tract blocked at one place — what does the place decide that the
amount cannot?

## 2. Model type

A geometric model, solved in closed form, over a tract drawn as **two tubes that
join at one bladder**. A chosen level names the last stretch that still fills;
every stretch above it is distended and every stretch below it is not. A
retained volume is added to the collecting system of each kidney behind the
blockage, inside a capsule that yields only slightly, and the parenchymal
thickness left over falls out of the two volumes.

The level is a **scenario and not a severity**. Five places, and a blockage does
not travel from one to the next; the number of kidneys behind it is a property
of the topology rather than of the amount, which is the one thing a single
severity axis could not have expressed.

## 3. What it is not

**It contains no kidney function of any kind** — no filtration, no creatinine,
no urine output, no recovery and no loss. `renal-filtration` is a separate model
with its own scope and **nothing here is coupled to it**. It also contains no
cause (no stone, tumour, stricture, prostate or pregnancy), no time, no symptom,
no infection and no treatment. **It does not grade hydronephrosis**: no output
is a grade, a stage or a threshold.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `level` | one of five | Where the blockage is, or nowhere |
| `backPressure` | 0–1 | How much has backed up behind it |

## 5. Outputs

- Which named stretches of the drawn tract lie above the blockage, and the
  calibre of each against its own resting one
- **How many kidneys are behind it**, and which side is not
- The collecting system and the capsule of a kidney behind it, each against its
  own resting size
- What is left of the parenchyma's thickness there, **as a fraction of this
  model's own resting thickness**
- The volume retained and the volume the capsule gained, in atlas units

## 6. State variables

None. `solveUrinaryObstruction()` is a pure function of the axis and one control.

## 7. Governing relations

```text
retained     = LOAD · backPressure · V(kidney at rest)
V(collecting)= V(pelvis at rest) + retained
V(capsule)   = V(kidney at rest) · (1 + GIVE · backPressure)
thickness    = ∛(V(capsule)) − ∛(V(collecting))
```

The cube roots turn two volumes into the radii of two nested shapes, which is
what the scene draws. `GIVE` is deliberately small: the claim is that the room
comes out of the parenchyma, and a capsule taking a large share of the retained
volume would make that claim false by construction. A test fixes that the
capsule's share stays a minority one.

Above and below are decided by the tract's own topology: a stretch on the
blocked side at or before the blocked stretch is above it, a stretch on the
other side is not, and a blockage at the bladder puts both sides above it. That
single rule is where `kidneysBehind` comes from.

## 8. Constants and calibration

Four, and none is a measurement. The kidney's and the pelvis's semi-axes are the
landmark kidney builder's own, so the picture and the arithmetic are the same
organ. The retained load was chosen so that the dilation and the thinning are
both visible across the range without the collecting system reaching the
capsule; the capsule's give was chosen against the claim, as above; the ureter's
and bladder's dilation factors were chosen to be legible.

## 9. Visual mapping

- Each named stretch is drawn at the calibre the model gives it, so the **step**
  from a distended stretch to an undistended one *is* the blockage. The picture
  says "above" and "below" rather than "affected" and "not affected".
- The parenchyma is drawn as **the space between two surfaces** — a translucent
  capsule and a solid collecting system inside it — and the inner surface is the
  outer one **inset by exactly the thickness the model reports**, on every axis.
  The gap a reader measures on screen is the number the read-out prints. The
  middle shell of the landmark kidney is hidden while that happens, because a
  third surface would have sat across the very space the claim is about.
- Drawing it as one volume ratio scaled evenly was tried first and is wrong
  twice over: it escapes through the hilum, because a bean is not an ellipsoid,
  and splitting the ratio between the axes to stop that drew the parenchyma at a
  fourteenth of its resting thickness where the model said a half.
- The dilating collecting system expands **inwards from the hilum**, so it does
  not push out through the medial border of a capsule that is barely larger.
- The side with nothing above it is drawn in a colour of its own and does not
  move. **Unchanged here means this model changes nothing about it**, not that
  the other kidney is unaffected in a person.
- The blockage is a marker at the boundary between two stretches. **It has no
  size and is not a thing** — not a stone, a tumour or a stricture.

## 10. Known failure modes

- One kidney's worth of retained volume per kidney behind the blockage, with no
  account of the two sharing anything.
- The parenchyma thins evenly. A real kidney does not.
- The ureter is three equal stretches of one drawn tube. They are divisions of a
  drawing, not anatomical segments, and none has a length.
- One side is always the blocked one in the one-sided levels, because the scene
  has to draw it somewhere.
- No partial obstruction, no intermittent obstruction, and no distinction
  between a tract that has been blocked briefly and one that has been blocked
  for a long time.

## 11. Where it will mislead

**A parenchyma drawn thin looks like a kidney that has stopped working, and this
model says nothing of the kind.** The thickness is a thickness in a drawing.
Whether a kidney behind an obstruction is filtering, how much, and whether it
recovers are all outside this model, and a reader who takes the number for a
function is reading something that is not there.

**The thickness also falls faster than the volume does**, because a thin shell
round a large cavity still holds a good deal. Both are reported for that reason,
and neither is a measure of how much kidney is left to work with.

## 12. Safety boundary

Never use the model to grade hydronephrosis, to estimate a cortical thickness, a
calibre or any dimension, to infer kidney function or its recovery from a
thickness, to decide which side is obstructed in anybody, to infer the cause of
an obstruction, or to decide whether, when or how anything should be treated.

## 13. Uncertainty

The topology is standard: two ureters joining at the bladder, dilation above the
level of a blockage, obstruction at the bladder outlet reaching both sides, and
a capsule that does not stretch readily. What this model cannot support is any
magnitude and any consequence — how far a given tract dilates, how thin a given
parenchyma becomes, and what either means for a person.

## 14. Evidence and review

The dossier records the two-tube topology, dilation above the level, the
bilateral reach of a bladder outlet blockage and the unyielding capsule as the
externally supported claims, and declares the atlas's proportions, the retained
load, the capsule's give and the dilation factors as things this repository
chose. Independent clinical sign-off has not been recorded; the public review
state is `pending`.

## 15. Verification

```bash
node --test tests/urinary-obstruction-physiology.test.js
node --test tests/urinary-obstruction-model.test.js
node --test tests/calibration.test.js
```

One physiology test fixes that the capsule's share of the retained volume stays
a minority one, because the claim that the room comes out of the parenchyma is a
claim about that ratio and nothing else would catch it drifting.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene (`src/data/patientGuides.js`,
id `urinary-obstruction`). It walks the same three stages and stops where §12
does. No step names a test, an operation or a risk, no step says anything about
kidney function, and the step about what a person might notice is marked
`associated` and says on screen that it is not drawn from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/urinaryObstruction.js`. A change to it must revise this card before
its digest is adopted.
