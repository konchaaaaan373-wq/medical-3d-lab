# Model card — rotator cuff tear: what still holds the head down

| | |
| --- | --- |
| **Scene ID** | `rotator-cuff-tear` |
| **Route** | `#/rotator-cuff-tear` |
| **Model** | [`src/models/rotatorCuffTear.js`](../../src/models/rotatorCuffTear.js) |
| **Evidence** | [`../model-evidence/rotator-cuff-tear.md`](../model-evidence/rotator-cuff-tear.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

When the tendon over the top of the shoulder tears, what decides whether the
head of the arm bone stays where it was?

## 2. Model type

A geometric model of containment, solved in closed form: what is left holding
the head on its socket, and whether that is above the threshold at which it
stays centred.

The axis is the defect; **the pair is a control**, because the size of the hole
is not what decides it.

## 3. What it is not

**Nothing in it moves an arm.** No pain, weakness, painful arc, range or
anything a person can or cannot do. No impingement as a syndrome, no bursa,
tendinopathy, calcium, retraction, muscle quality or cuff tear arthropathy. No
cause, time, healing or treatment.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `tear` | 0–1 | How far the tear extends across the top tendon |
| `couple` | 0–1 | How much of the facing pair is still there |

## 5. Outputs

- How much of the tendon's width has gone, and whether that is all of it
- What is left holding the head, and how much of that the pair provides
- Whether the head is centred, and **how far it has risen as a share of the
  drawn gap under the arch**
- Whether the pair is still holding it

## 6. State variables

None. `solveRotatorCuffTear()` is a pure function of its two controls.

## 7. Governing relations

```text
containment = supraShare·(1 − tear) + coupleShare·couple
rise        = riseMax · max(0, 1 − containment/threshold)
```

The threshold is exactly what the pair alone provides, which is what makes
"a complete tear sparing the pair keeps the head centred" and "a tear reaching
the pair does not" one statement rather than two coincidences.

## 8. Constants and calibration

Two shares and a threshold, calibrated to produce that behaviour; and the rise,
expressed as a fraction of the shoulder atlas's `SUBACROMIAL_DISPLAY_GAP`,
imported from the atlas rather than retyped.

## 9. Visual mapping

Declared in `VISUAL_MAPPING` (`src/data/rotatorCuffTear.js`):

- **The scene draws its own tendon** in two pieces with a widening gap, rather
  than moving the atlas's intact one. The gap is drawn, not solved.
- The head — and everything belonging to the arm bone — rises by the fraction of
  the drawn gap the model reports, and only once the pair has stopped holding
  it. **That gap is a display gap and a share of it is not an acromiohumeral
  distance.**
- The facing pair is lit while it is still holding. That marks a threshold, not
  a statement about a particular tendon.

## 10. Known failure modes

- One number for the pair rather than two tendons with courses of their own.
- One position, with the arm at the side, and nothing moving.
- Tendons the scene does not redraw stay where the atlas put them as the head
  rises: they are context and are not re-solved.
- A defect that opens along the tendon's course, with no shape to its edge.

## 11. Where it will mislead

**A lit pair reads as a statement about two named tendons** — it is a threshold
(`one-number-for-the-pair`).

**A head sitting higher reads as a shoulder that cannot lift** — nothing in this
model moves an arm (`nothing-moves-an-arm`).

## 12. Safety boundary

Never use the model to estimate an acromiohumeral distance or any dimension, to
classify or size a cuff tear, to infer pain, weakness or range from a defect, to
judge whether a tear is repairable, or to decide whether, when or how anything
should be treated.

## 13. Uncertainty

The cuff's role, the force couple and the direction of migration are standard.
What this model cannot support is any magnitude and anything about a person: how
far a given head rises, what it feels like, and what should follow.

## 14. Evidence and review

The dossier records the cuff's role, the facing pair, the direction of migration
and the two-pictures consequence as the externally supported claims, and declares
the containment shares and the drawn gap as things this repository chose.
Independent clinical sign-off has not been recorded; the public review state is
`pending`.

## 15. Verification

```bash
node --test tests/rotator-cuff-tear-physiology.test.js
node --test tests/rotator-cuff-tear-model.test.js
node --test tests/calibration.test.js
```

One calibration test checks that the threshold is exactly the pair's own share,
because that identity is what turns two clinical statements into one model.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene (`src/data/patientGuides.js`,
id `rotator-cuff-tear`). It walks the same three stages and stops where §12 does.
No step names a test, an operation or a risk, and the steps about what a person
might notice are marked `associated` and say on screen that they are not drawn
from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/rotatorCuffTear.js`. A change to it must revise this card before its
digest is adopted.
