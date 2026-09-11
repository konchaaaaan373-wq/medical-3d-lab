# Model card — lumbar disc displacement: three questions, two answers

| | |
| --- | --- |
| **Scene ID** | `lumbar-disc-herniation` |
| **Route** | `#/lumbar-disc-herniation` |
| **Model** | [`src/models/lumbarDiscHerniation.js`](../../src/models/lumbarDiscHerniation.js) |
| **Evidence** | [`../model-evidence/lumbar-disc-herniation.md`](../model-evidence/lumbar-disc-herniation.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

When disc material moves, what has actually been said — and what has not?

## 2. Model type

A geometric model, solved in closed form, over the spine atlas's own lumbar
disc. A chosen direction carries the nucleus a distance along it; whether the
annulus still closes behind it is one threshold; and whether the displaced
material overlaps the drawn canal or the drawn nerve root is a clearance
measured off the atlas.

The direction is a **scenario and not a severity**: three arrangements, and
material does not travel from one to the next.

## 3. What it is not

**There is no symptom in this model.** Sciatica, numbness, weakness and reflex
change are not outputs and cannot be inferred from any number here — there is
no nerve in this model in any sense beyond a drawn tube with a position. There
is also no imaging of any kind (no plane, sequence, window or measurement), no
time, no cause, no mechanism of injury, no inflammation, no treatment, no
natural history and no resorption. **Nothing here is millimetres, and nothing
is a canal or foraminal stenosis ratio.**

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `direction` | one of four | Which way the material goes, or nowhere |
| `displacement` | 0–1 | How far it has gone |

## 5. Outputs

- How far the material has gone, in the atlas's own units
- Whether the annulus still closes behind it, as a two-valued state
- What lies the way it went, by name
- Whether the two drawn shapes overlap, and by what share of the structure's
  **own drawn width**
- An explicit `symptoms: null`

## 6. State variables

None. `solveLumbarDiscHerniation()` is a pure function of the axis and one control.

## 7. Governing relations

```text
reach    = displacement · MAX_REACH
breached = reach > ANNULUS_BEHIND
gap      = clearance(direction) − reach
indent   = min(max(0, −gap), width(what it meets)) / width(what it meets)
```

The clearance exceeds the annulus thickness in every direction, which is what
makes "past the ring" and "reaching something" two separate events rather than
one restated.

## 8. Constants and calibration

Two kinds, and neither is a measurement. The nucleus's half-depth, the annulus
behind it and the two clearances are the spine atlas's own, re-measured by a
calibration test so the copy cannot drift from the drawing. The furthest the
axis reaches was chosen so all three directions arrive before the top of it,
the furthest one last.

## 9. Visual mapping

- The centre is drawn displaced along the named direction by **exactly** the
  model's distance. `AIM` is the only place in the repository that says which
  way each named direction is, and it was measured off the atlas.
- The ring changes colour **once**, at one threshold, because it is a state with
  two values rather than a quantity. A test fails if it becomes a gradient.
- The overlap gets a **marker of its own** at the point where the two shapes
  meet, sized by the share of the structure's width the material entered — two
  interpenetrating surfaces cannot show a reader where they meet, because the
  nearer one simply covers the further.
- Bone is drawn translucent: the disc sits between two bodies and the root
  leaves behind a pedicle, so an opaque column hides the whole subject.
- **Nothing anywhere changes to stand for a symptom**, because the model has no
  such output and the drawing therefore has no such channel.

## 10. Known failure modes

- One direction at a time, and a ring of one thickness behind the nucleus.
- Three directions standing for a continuum.
- The canal and the root are each a single width.
- The atlas draws one pair of roots at this level, leaving above the disc.
- Past the width of what it meets, the model stops measuring rather than the
  picture getting worse: it does not push a root aside, deform it, or follow it.

## 11. Where it will mislead

**Two containment values sitting beside four familiar words will be read as the
first two of them.** `intact` and `breached` are not bulge, protrusion,
extrusion or sequestration — those are defined on measured geometry in a chosen
plane with rules about the base against the depth, and this model has neither a
plane nor a base.

**Material reaching a nerve reads as a person in pain.** It is two drawn shapes
overlapping, measured against a clearance from an atlas that is not
anatomically validated. Whether anybody feels anything is outside this model,
and the two facts are not connected by anything here.

## 12. Safety boundary

Never use the model to classify a disc displacement, to estimate a
displacement, a clearance or any dimension, to infer root contact or compression
in anybody, to infer symptoms, severity or a level from a picture, to decide
which root is involved, or to decide whether, when or how anything should be
treated.

## 13. Uncertainty

The two tissues, the direction the material takes, and what lies each way are
standard. What this model cannot support is any magnitude, any classification
and any consequence: how far a given disc displaces, what a radiologist would
call it, and what any of it means for a person.

## 14. Evidence and review

The dossier records the two tissues and one threshold, the direction deciding
what is reachable, the separation of containment from contact, and the width of
what is met as the externally supported claims, and declares the atlas's
clearances and the reach of the axis as things this repository chose.
Independent clinical sign-off has not been recorded; the public review state is
`pending`.

## 15. Verification

```bash
node --test tests/lumbar-disc-herniation-physiology.test.js
node --test tests/lumbar-disc-herniation-model.test.js
node --test tests/calibration.test.js
```

One physiology test walks the whole axis asserting there is a span where the
material is past the ring and reaches nothing, because a model in which the two
happened together would be saying the two words mean the same thing. Another
scans every numeric output for a name that reads as a symptom or a grade.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene (`src/data/patientGuides.js`,
id `lumbar-disc-herniation`). It walks the same three stages and stops where §12
does. No step names a test, an operation or a risk, and the steps about what a
person might notice are marked `associated` and say on screen that they are not
drawn from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/lumbarDiscHerniation.js`. A change to it must revise this card
before its digest is adopted.
