# Model card — tissue under a load: a profile of deformation against depth

| | |
| --- | --- |
| **Scene ID** | `pressure-injury` |
| **Route** | `#/pressure-injury` |
| **Model** | [`src/models/pressureInjury.js`](../../src/models/pressureInjury.js) |
| **Evidence** | [`../model-evidence/pressure-injury.md`](../model-evidence/pressure-injury.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

When a surface is pressed, which depth takes the most of it?

## 2. Model type

A geometric model, solved in closed form. A load decays downwards from the
surface; over a prominence a second term decays upwards from the block's floor.
The sum is a profile of deformation against depth, and each named depth is
reported as a share of that profile's own peak.

The control is a **scenario and not a severity**: two grounds, and nothing here
says one becomes the other.

## 3. What it is not

**This model does not stage a pressure injury and cannot be made to.** Staging
rests on what tissue is visible and what has been lost, and this model has
neither. **No output is a stage, a grade or a threshold.**

**Nothing happens to the tissue but deformation.** No death, no loss, no depth
of loss, no ulcer and no wound, and nothing converts a deformation into an
injury. There is no stress, no strain, no modulus, no blood, no perfusion, no
ischaemia, no inflammation and no repair. There is no time, no duration and no
relief; no temperature, moisture, friction or continence; and no person, body
position, support surface or risk assessment.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `ground` | one of three | What lies under the load: nothing pressing, more soft tissue, or bone close underneath |
| `load` | 0–1 | How hard the surface is being pressed. **Not how long** |

## 5. Outputs

- How hard each named depth is being squeezed, as a share of the profile's peak
- Which depth takes the most of it, and every depth within a little of it
- How much more the worst depth takes than the skin at the top
- An explicit `stage: null`

## 6. State variables

None. `solvePressureInjury()` is a pure function of the axis and one control.

## 7. Governing relations

```text
fromAbove = load · e^(−(surface − y) / REACH)
fromBelow = load · TRAPPED · e^(−(y − bone) / REACH)   ← only over a prominence
deform(y) = fromAbove + fromBelow
share(y)  = deform(y) / max deform
```

The sum is **deliberately not clamped**. A ceiling at one flattens both ends of
the profile into the same value, and a profile whose peak cannot exceed its
surface could not represent an injury that begins deep — which is the whole of
what this model is for.

## 8. Constants and calibration

The layer depths are the skin atlas's own display values, re-checked by a
calibration test against the slabs the atlas draws; **that atlas declares its
own thicknesses deliberately not to scale**, with the epidermis drawn some
twenty times too thick. `REACH` and `TRAPPED` are calibrations nobody measured,
chosen so both shapes are legible; what the tests fix is their consequence —
that the deep peak exists and is the larger one — rather than the values.

## 9. Visual mapping

- **The answer is drawn as bars, not as a coloured patch.** The claim is a
  comparison between four depths, and a comparison cannot be drawn by colouring
  one of them: a reader looking at a red patch sees damage, and this model has
  none. Each bar is as long as that depth's share of the profile's peak.
- **Each bar is a share of this picture's own peak**, so bars compare down one
  block and never between two.
- **Colour marks only which bar is the longest.** It does not mean the tissue
  there is damaged, dying or lost.
- **The prominence is a structure the scene adds**, because the atlas is a
  specimen of skin with no skeleton in it. Its apex sits at the block's own
  floor, which is the depth the model measures from.
- **The skin never moves.** A load pressing a surface visibly in would make
  depth a matter of how far the surface has gone, and a reader would read the
  dent as the injury. The block is still and the load descends to meet it.
- **Nothing changes to stand for a stage**, and the read-out prints "not in this
  model" where a stage would go rather than leaving the row out.

## 10. Known failure modes

- The layer depths are display values and deliberately not to scale.
- The profile is continuous and only four named depths are reported from it;
  the deep interface is a place rather than a tissue.
- The two terms are shapes chosen to be the two shapes, not a mechanics.
- One load, one prominence, and a profile depending only on depth.

## 11. Where it will mislead

**A scene about pressure injury reads as a scene that stages one.** It does not,
and the boundary is the sharpest thing in the model.

**A coloured deep layer reads as dead tissue.** It is the longest bar.

**A position on the axis reads as an elapsed time.** The axis is how hard the
surface is pressed. Duration, relief and everything that makes this subject a
matter of hours are outside the model.

## 12. Safety boundary

Never use the model to stage or grade a pressure injury, to infer damage, tissue
loss or its depth, to assess anybody's risk, to judge a body position or a
support surface, or to read any depth, ratio or share as a measurement.

## 13. Uncertainty

That pressure injury is deformation of soft tissue between an external surface
and underlying bone, and that injury can begin in deep tissue rather than at the
skin, are standard. What this model cannot support is any mechanics, any
biology, any time course and any consequence.

## 14. Evidence and review

The dossier records the two-sided squeeze over a prominence, the downward fade
over soft tissue, the two grounds being two shapes rather than two amounts, the
refusal to clamp, and the axis changing the amount but never the answer as the
externally supported claims, and declares the atlas's depths and the two
calibrations as things this repository chose. Independent clinical sign-off has
not been recorded; the public review state is `pending`.

## 15. Verification

```bash
node --test tests/pressure-injury-physiology.test.js
node --test tests/pressure-injury-model.test.js
node --test tests/calibration.test.js
```

One physiology test scans every output name — the per-layer objects included —
for anything reading as damage or a stage. A model test measures the longest bar
and the lowest bar off the drawing rather than off the solver, because the claim
is what a reader sees rather than what the model returns.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene
(`src/data/patientGuides.js`, id `pressure-injury`). It walks the same three
stages and stops where §12 does. No step names a stage, a grade, a depth of
tissue loss or a treatment, no step says anything has been damaged, and the step
about why this matters to anybody is marked `educationalOnly` and says on screen
that it is not drawn from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/pressureInjury.js`. A change to it must revise this card before its
digest is adopted.
