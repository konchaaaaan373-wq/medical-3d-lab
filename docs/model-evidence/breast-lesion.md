# Evidence — a place in a breast: a position on a course, and a distance to a route

Model: [`src/models/breastLesion.js`](../../src/models/breastLesion.js).
Boundary and failure modes: [`../model-cards/breast-lesion.md`](../model-cards/breast-lesion.md).
Machine-readable registry: `BREAST_LESION_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a **geometric** account of where a place is in a drawn
gland. **Nothing here is a measurement, a size, a spread, a nodal status, a
stage or a diagnosis**, and in particular **nothing in this model travels
anywhere**. No row rests on a paper this repository could open: the build
environment cannot reach the medical publishers.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `every-duct-system-begins-at-the-nipple` — the systems converge on the nipple and run outwards, so a position is which system and how far out | Standard descriptions of the duct systems converging on the nipple | Every course's first point is the nipple, and the axis walks the sampled course | One course at a time | `physiology: every duct system begins at the same place` |
| `further-out-is-not-nearer` — moving out along one course approaches the drainage route and along another leaves it | A consequence of courses that share a start, differ in direction, and a route at one side | `toRoute` is the distance from the marker to the nearest place on the route, compared with the nipple's own | The route is where the atlas draws it | `physiology: further out along a duct is not nearer the route — on some courses it is further` |
| `the-lobules-are-at-the-far-ends` — how far out settles which part of the system a place is in | Standard descriptions of the system ending peripherally in lobules | Two thresholds on the course fraction, checked against the atlas's own lobules | The parts are places on a course | `physiology: how far out settles which part of the duct system a place is in` |
| `which-part-is-not-which-quadrant` — the four courses pass the same parts in the same order | A consequence of four courses of one shape in four directions | The thresholds are on the fraction, not on the direction | The same | `physiology: the four courses pass through the same parts in the same order` |
| `the-tail-is-a-different-place` — no position on any duct's axis reaches the tail | Standard descriptions of the axillary tail as gland tissue extending towards the axilla | The tail is a fifth course, reached only by choosing it | The same | `physiology: the axillary tail is a different place, not a later one` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `the-atlas-courses-and-the-route` | The four duct courses, their lobules, the tail and the node group | Illustrative, sampled off `buildBreast()`. **The atlas declares itself not anatomically validated and its duct and lobule counts to be display counts** |
| `where-the-parts-are-divided` | Where the large duct gives way to its terminal part, and where the lobular end begins | Calibrated so the part called the lobular end is the part the atlas hangs its lobules off. **Neither threshold is a length in anybody** |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `nothing-spreads-anywhere-in-this-model` | A marker sliding towards the axilla reads as something spreading | **Uncertain and out of scope, and the sharpest boundary here.** The route never reacts, the marker never grows, and a model test holds the route and the node group byte-identical across every position on every course |
| `the-marker-has-no-size` | A body drawn in a breast reads as a lump with a diameter | It is drawn at one fixed size everywhere, and the visual mapping says the fixed size is the claim |
| `the-part-names-are-not-diagnoses` | "Ductal" and "lobular" read as histological types | They name **where on a drawn course a point is**. Nothing here distinguishes in-situ from invasive, names a cell, or classifies anything |
| `one-drainage-route-in-this-picture` | One route reads as the only route | A property of the drawing. A breast has more than one, and no comparison between routes is available here |
| `no-stage-no-prognosis-and-no-biology` | A scene about this subject reads as a scene that stages it | Staging rests on size, on nodes and on what is elsewhere in a person, and this model has none of the three |
| `four-of-eight-and-a-chosen-baseline` | Four offered courses read as a statement about where lesions occur | They do not. The baseline is the course the other three are compared against, because it is the one on which the distance falls |

## 4. What is outside the model entirely

- **All spread**, all nodal status and all risk of either.
- **All size**: diameter, volume, growth, margin and shape.
- **Every stage, grade, probability and prognosis.**
- All the biology: cell type, receptor, histology, the in-situ/invasive
  distinction and cause. And all imaging, examination, screening, biopsy and
  treatment.

## 5. How to check it

```bash
node --test tests/breast-lesion-physiology.test.js  # Layer 1: the five propositions
node --test tests/breast-lesion-model.test.js       # integrity: the drawing against the model
node --test tests/calibration.test.js               # the two things this repository chose
```
