# Model card — a place in a breast: a position on a course, and a distance to a route

| | |
| --- | --- |
| **Scene ID** | `breast-lesion` |
| **Route** | `#/breast-lesion` |
| **Model** | [`src/models/breastLesion.js`](../../src/models/breastLesion.js) |
| **Evidence** | [`../model-evidence/breast-lesion.md`](../model-evidence/breast-lesion.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

Where in a breast is a place, and how far is that place from the route the
gland drains by?

## 2. Model type

A geometric model, solved in closed form. A marker runs along one of four of
the breast atlas's own duct systems, or along its axillary tail. The model
reports which part of that system the position is in and how far the point is
from the drainage route the atlas draws, against the distance the nipple itself
is from that route.

The control is a **scenario and not a severity**: five places, and nothing here
says one becomes another.

## 3. What it is not

**Nothing spreads.** No cell moves, no lesion advances, no node is involved and
no route carries anything. The route is drawn because the *gland* drains that
way, and every distance here is between two drawn points. **No output of this
model is a spread, a nodal status or a risk of either.**

**Nothing has a size.** The marker is a place: no diameter, no volume, no
growth, no margin and no shape.

**No stage, grade, probability or prognosis.** Staging rests on size, on nodes
and on what is elsewhere in a person, and this model has none of the three.

No biology of any kind: no cell type, no receptor, no histology, no in-situ or
invasive distinction and no cause. No imaging, examination, screening, biopsy
or treatment.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `site` | one of five | Which course the place is on: four duct systems, or the axillary tail |
| `along` | 0–1 | How far out from the nipple the place sits |

## 5. Outputs

- Where the place is, for the scene to draw
- Which part of the duct system that position is in
- How far it is from the drainage route, and that against the nipple's own distance
- Whether moving out has brought it nearer the route than it began
- Explicit `spread: null`, `nodalStatus: null`, `size: null`, `stage: null`

## 6. State variables

None. `solveBreastLesion()` is a pure function of the axis and one control.

## 7. Governing relations

```text
at        = the point a given fraction along the chosen course
inTissue  = which band of that course the fraction falls in
toRoute   = distance from `at` to the nearest place on the drainage route
routeShare = toRoute / (the nipple's own distance to the route)
nearer    = toRoute < the nipple's own distance
```

Every course begins at the nipple, which is why `nearer` is a comparison of
directions rather than of starting points.

## 8. Constants and calibration

Two, and neither is a measurement. The courses, the lobules, the tail and the
node group are sampled off `buildBreast()` and re-checked by a calibration test
against the atlas's own drawn tubes — that atlas declares itself not
anatomically validated and its duct and lobule counts to be display counts. The
two part boundaries were placed so that the part called the lobular end is the
part the atlas hangs its lobules off.

## 9. Visual mapping

- **The marker is one size at every position on every course**, because the
  model has no size in it. A marker that grew along the axis would be a
  diameter, and nothing here could say what it was a diameter of.
- **The route and the node group never react.** They are drawn identically
  whatever the marker is doing: nothing lights up, thickens, changes colour or
  fills, because nothing in this model travels along it.
- **The line to the route is a distance, not a path.** It has no arrow on it,
  is not a lymphatic, and is not a route anything takes.
- The duct in question is lit and the others dimmed. **Lit means "this is the
  one the place is on"** — not diseased, involved or abnormal.
- **Nothing changes to stand for a stage or a nodal status**, and the read-out
  prints "nothing spreads in this model" where such a row would go.

## 10. Known failure modes

- Four of the atlas's eight duct systems are offered; the quadrant names say
  where each happens to point rather than dividing the breast into quadrants.
- The gland has one drawn drainage route. A breast has more than one.
- The part names are places on a course and collide with the words disease in
  this organ is named after.
- The courses are sampled polylines, not the smooth curves the atlas draws.

## 11. Where it will mislead

**A marker sliding out towards the axilla reads as something spreading.** It is
a place being chosen further along one course, and the course was chosen too.

**"Ductal" and "lobular" read as diagnoses.** They are parts of a duct system.

**One offered set of courses reads as a statement about where lesions occur.**
It is not; neither is the baseline.

## 12. Safety boundary

Never use the model to infer spread, nodal involvement or the risk of either;
to estimate a size, a stage, a grade or a prognosis; to classify a lesion or
name a histology; or to read any distance or position as a measurement.

## 13. Uncertainty

The duct systems converging on the nipple, the lobules at their peripheral
ends, the axillary tail as gland tissue extending towards the axilla, and the
axilla as the node group most of the breast drains to are standard. What this
model cannot support is anything about a lesion, its behaviour or its
consequences.

## 14. Evidence and review

The dossier records the shared origin of the duct systems, the fact that
further out is not nearer, the lobules at the far ends, the parts being a
matter of distance rather than direction, and the tail being a different place
as the externally supported claims, and declares the atlas's courses and the
two part boundaries as things this repository chose. Independent clinical
sign-off has not been recorded; the public review state is `pending`.

## 15. Verification

```bash
node --test tests/breast-lesion-physiology.test.js
node --test tests/breast-lesion-model.test.js
node --test tests/calibration.test.js
```

A physiology test scans every output name for a field reading as a spread, a
size or a stage. A model test holds the route and the node group byte-identical
across every position on every course, and measures the marker's drawn size at
each — because "nothing spread" is a claim about the picture rather than about
the return value.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene
(`src/data/patientGuides.js`, id `breast-lesion`). It walks the same three
stages and stops where §12 does. No step names a diagnosis, a size, a stage or
a treatment, no step says anything has spread, and the step about why the route
is looked at is marked `educationalOnly` and says on screen that it is not
drawn from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/breastLesion.js`. A change to it must revise this card before its
digest is adopted.
