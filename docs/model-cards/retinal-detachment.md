# Model card — retinal detachment: where, not how much

| | |
| --- | --- |
| **Scene ID** | `retinal-detachment` |
| **Route** | `#/retinal-detachment` |
| **Model** | [`src/models/retinalDetachment.js`](../../src/models/retinalDetachment.js) |
| **Evidence** | [`../model-evidence/retinal-detachment.md`](../model-evidence/retinal-detachment.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

When the retina separates, what decides whether the macula is in it?

## 2. Model type

A geometric model, solved in closed form: a spherical cap on the eye atlas's own
globe. A chosen origin and a reach give the cap; its area is the cap as a share
of the sphere; and whether the macula is inside it is the angle from the origin
against that reach.

The origin is a **scenario and not a severity**: five positions, and a
detachment does not travel from one origin to another.

## 3. What it is not

**There is no vision in this model.** No acuity, no field, no contrast, no
distortion and no perception — a separated retina here is a surface that has
moved. **There is no prognosis either**: nothing says what recovers, how much,
or whether the macula being inside changes that. There is no cause and no kind
(no tear, traction, exudate, myopia or trauma), no time, no fluid, **no
gravity** and no surgery.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `origin` | one of five | Where the separation started, or nowhere |
| `extent` | 0–1 | How far it reaches from there |

## 5. Outputs

- How far it reaches, in degrees of arc from the origin
- The detached cap as a share of the drawn retina
- Whether the macula is inside it, as `on` or `off`
- How many degrees further it would have to reach
- An explicit `vision: null`

## 6. State variables

None. `solveRetinalDetachment()` is a pure function of the axis and one control.

## 7. Governing relations

```text
halfAngle = extent · MAX_ARC
separated = angle(macula, origin) < halfAngle
area      = (1 − cos halfAngle) / 2
lift      = extent · MAX_LIFT
```

The area depends on the half-angle and not on where the axis points, which is
exactly why it cannot answer the question about the macula — and is the reason
the read-out prints the two side by side.

## 8. Constants and calibration

Three, and none is a measurement. The globe, its coats and the angle from each
origin to the macula are the eye atlas's own, re-measured by a calibration test
against the scene's own direction table. The widest arc was chosen so a
peripheral separation arrives before the top of the axis while leaving a long
span where it plainly has not. The drawn lift was chosen to be visible.

## 9. Visual mapping

- The separated region is **a second surface**, not a recoloured part of the
  first: the atlas's retina is one closed shell, and tinting part of it would be
  a claim about colour rather than about a surface having left another. The cap
  is rebuilt at the model's half-angle each time, so the drawn edge is the
  solved edge.
- The sheet stands off by the model's lift, so the gap round the patch's edge is
  the separation itself. **That height is illustrative and much larger than the
  atlas's own coat spacing** — at the real spacing a separation is a few pixels.
- **The macula is the only thing that changes colour**, because it is the only
  two-valued thing in the model. Everything else that changes is a shape.
- The area and the macula state are printed next to each other with equal
  weight, because the scene's whole point is that the first does not give you
  the second.

## 10. Known failure modes

- A circular cap spreading evenly from one point. A real detachment is neither.
- The macula as a point rather than a region with a width.
- Five origins standing for a continuum of positions.
- **No gravity**: the inferior origin behaves exactly like the superior one.

## 11. Where it will mislead

**A detached retina reads as a person who cannot see, and macula-off reads as
an outcome.** Neither is here. The model computes a cap and a position and
stops; what anybody sees, and what recovers, are outside it entirely and are not
connected to its outputs by anything in this repository.

**The lift reads as a measured height.** It is a drawn one, chosen so the
separation is visible at all.

## 12. Safety boundary

Never use the model to estimate an extent, an area, a height or any dimension,
to infer sight, field or acuity, to infer a prognosis from the macula's state,
to distinguish a kind or cause of detachment, or to decide whether, when or how
anything should be treated.

## 13. Uncertainty

The macula's position, the geometry of a cap, and the distinction between a
macula inside and outside a separation are standard. What this model cannot
support is any magnitude, any consequence and any mechanism: how far a given
detachment reaches, what it means for a person, and how it came about.

## 14. Evidence and review

The dossier records the macula's position, the distance from the periphery, the
independence of area from position, and the two-picture nature of macula-on and
macula-off as the externally supported claims, and declares the atlas's globe
and angles, the widest arc and the drawn lift as things this repository chose.
Independent clinical sign-off has not been recorded; the public review state is
`pending`.

## 15. Verification

```bash
node --test tests/retinal-detachment-physiology.test.js
node --test tests/retinal-detachment-model.test.js
node --test tests/calibration.test.js
```

One physiology test puts a separation over a twentieth of the retina that has
the macula in it next to one over nearly half that does not, because that
single comparison is the scene. A calibration test fixes that the drawn lift is
many times the atlas's own coat spacing, so it can never be read as one.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene (`src/data/patientGuides.js`,
id `retinal-detachment`). It walks the same three stages and stops where §12
does. No step names a test, an operation or a risk, no step says anything about
sight or recovery, and the step about what a person might notice is marked
`associated` and says on screen that it is not drawn from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/retinalDetachment.js`. A change to it must revise this card before
its digest is adopted.
