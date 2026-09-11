# Model card — uterine fibroid: what the depth in the wall decides

| | |
| --- | --- |
| **Scene ID** | `uterine-fibroid` |
| **Route** | `#/uterine-fibroid` |
| **Model** | [`src/models/uterineFibroid.js`](../../src/models/uterineFibroid.js) |
| **Evidence** | [`../model-evidence/uterine-fibroid.md`](../model-evidence/uterine-fibroid.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

A fibroid of a given size — what does the depth in the wall at which it sits
change?

## 2. Model type

A **geometric** model, solved in closed form: one sphere at a chosen depth in a
schematic uterine wall, and what it reaches on either side of that wall.

The location is a **scenario and not a severity**. Submucosal, intramural and
subserosal are three depths, a fibroid does not travel from one to the next, and
an axis between them would say it does. The axis is size, at whichever depth the
reader has chosen.

## 3. What it is not

It is not a model of anything a fibroid produces. It contains no bleeding, no
pain, no pressure symptoms, no fertility and no pregnancy; no time, growth or
hormone; no degeneration and no sarcoma; no treatment. It has exactly one
fibroid in it.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `location` | one of four | Where in the wall it sits, or no fibroid |
| `diameter` | 0.12–0.62 | How big it is, in the atlas's own units |

The scene's **axis is `diameter`**. The location is on the control panel,
because it is not a position on it.

## 5. Outputs

- The uterus's volume against its own — **the same at every location**
- The share of the cavity the fibroid presses into
- How far it stands past the outer surface, against the wall's own depth
- The wall's depth where it sits, against its depth elsewhere
- Which boundaries it reaches, and the diameter at which it would reach each

## 6. State variables

None. `solveUterineFibroid()` is a pure function of its two controls.

## 7. Governing relations

```text
indent(cavity)  = max(0, r − depth)
bulge(serosa)   = max(0, depth + r − wall)
contact(cavity) = π(r² − depth²) / area(cavity)     where r > depth
uterineVolume   = V₀ + (4/3)π r³
```

A sphere crossing a plane makes a disc; volume goes as the cube of the radius.
That is the whole of it.

## 8. Constants and calibration

Two things, and neither is a measurement. The wall's depth, the cavity's area
and the organ's volume are measured off this repository's uterine atlas —
`tests/calibration.test.js` recomputes each from the meshes and fails if they
drift. The three depths are fractions this repository chose so each standard
name behaves as its description says across the range the scene offers.

## 9. Visual mapping

Declared in `VISUAL_MAPPING` (`src/data/uterineFibroid.js`) and handed out by
`getVisualMapping()`:

- The fibroid is drawn at the diameter the axis sets and placed at the depth the
  location gives it. **The units are a uterus drawn to be legible**, so no
  centimetre follows from what is on screen.
- **The uterus is not redrawn around it.** A fibroid standing past the surface
  is seen as the fibroid itself standing there, not as a deformed organ.
- The cavity changes colour once the model says it is being pressed into more
  than a touch. It marks a shape crossing a surface: not bleeding, not a lesion
  on any scan, not a symptom.

The wall is drawn translucent throughout, because the subject is inside it.

## 10. Known failure modes

- A sphere, a wall of one depth, and a cavity with no thickness.
- Three fixed depths for a continuum, and no fibroid on a stalk.
- One fibroid, where most uteruses that have them have several.
- The uterus drawn upright, as the atlas draws it; a uterus is normally tipped
  and bent forward, so "front" and "back" here are the atlas's.

## 11. Where it will mislead

**A rising share of the cavity reads as something happening to a person.** It is
a shape crossing a surface. Nothing in this model makes bleeding, pain, pressure
or fertility follow from size, and that they do not follow from size in any
simple way is the reason the scene is about location
(`nothing-follows-about-symptoms`).

**The bulge reads as a deformed uterus.** It is the fibroid standing past the
surface; the wall keeps the atlas's shape and is not thinned or stretched
anywhere (`one-fibroid-and-a-rigid-wall`).

## 12. Safety boundary

Never use the model to estimate a fibroid's or a uterus's size, to classify a
fibroid, to predict bleeding, pain, pressure symptoms or fertility, to
distinguish a fibroid from anything else, or to select, time or evaluate any
treatment.

## 13. Uncertainty

The three locations and the shape of the cavity are standard. What this model
cannot support is any consequence: the relation between where a fibroid sits and
what a person notices is not in it, and no depth, share or volume it reports is
a prediction of anything.

## 14. Evidence and review

The dossier records the three locations, the invariant volume, the crossing
geometry and the flattened cavity as the externally supported claims, and
declares the atlas's proportions and the three depths as things this repository
chose. Independent clinical sign-off has not been recorded; the public review
state is `pending`.

## 15. Verification

```bash
node --test tests/uterine-fibroid-physiology.test.js
node --test tests/uterine-fibroid-model.test.js
node --test tests/calibration.test.js
```

The physiology tests fix the four propositions the scene teaches, including the
one that separates it from a severity story: at any size, the three locations
print the same uterine volume and reach entirely different things.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene (`src/data/patientGuides.js`,
id `uterine-fibroid`). It walks the same three stages and stops where §12 does.
No step names a test, a drug, an operation or a risk, and the steps about what a
person might notice are marked `associated` and say on screen that they are not
drawn from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/uterineFibroid.js`. A change to it must revise this card before its
digest is adopted.
