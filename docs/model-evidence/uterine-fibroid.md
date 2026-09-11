# Evidence — uterine fibroid: what the depth in the wall decides

Model: [`src/models/uterineFibroid.js`](../../src/models/uterineFibroid.js).
Boundary and failure modes: [`../model-cards/uterine-fibroid.md`](../model-cards/uterine-fibroid.md).
Machine-readable registry: `UTERINE_FIBROID_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a **geometric** account of one fibroid in one wall.
**Nothing here is a symptom, a score, an image or a measurement.** No value the
model reports is a centimetre, a millilitre, a bleeding pattern or a
probability, and no figure in it is a size at which anything is indicated. No
row rests on a paper this repository could open: the build environment cannot
reach the medical publishers, so nothing was extracted from a figure or a table
by its author.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `three-locations-not-three-stages` — submucosal, intramural and subserosal are three depths in one wall, not three stages. A fibroid does not travel from one to the next | Standard gynaecological descriptions of leiomyoma location | `location` is a choice control; the depth it gives is a property of the name and does not move with the size | Three fixed depths (see §2) | `physiology: where it sits is a choice, and moving the size does not change it` |
| `volume-is-the-same-everywhere` — a fibroid of a given size adds the same volume wherever it sits, so the size of the uterus says nothing about what it is against | Arithmetic of additive volumes: `(4/3)πr³` at any depth | `uterineVolumeRatio = (V₀ + Vf)/V₀`, reported for exactly this reason | The organ's volume is the atlas's (see §2) | `physiology: the same size is the same uterine volume at every depth` |
| `the-middle-reaches-nothing-then-both` — one just under either boundary is against it from the start and never reaches the other; one in the middle reaches neither until its diameter approaches the wall's depth, and then reaches both at once | Solid geometry: a sphere of radius r centred at depth d crosses a plane when `r > d` | `indent = max(0, r − depth)`, `bulge = max(0, depth + r − wall)` | A sphere, and a wall of one depth | `physiology: the middle of the wall is the one place that reaches nothing` |
| `the-cavity-is-a-plane` — the cavity is a flattened triangle rather than a bag, so pressing into it is a sphere crossing a surface and how much of that surface it takes is what distorting it means. **thin** — the shape is textbook; measuring the contact as an area share is this model's framing | Standard descriptions of the uterine cavity between the two tubal ostia and the internal os | `contact = π(r² − depth²)/area(cavity)` | The cavity has no thickness | `physiology: what presses into the cavity is measured as a share of a surface` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `atlas-proportions` | The wall's depth, the cavity's area and the organ's volume, from which every ratio is computed | Illustrative. Measured off this repository's uterine atlas, whose own proportions are drawn to be legible rather than to scale — and which draws the uterus upright where a uterus is normally tipped and bent forward. **No centimetre and no millilitre follows from any of it** |
| `three-chosen-depths` | The depth in the wall each of the three names is taken to mean | Calibrated so each name behaves as its description says: the shallow one against the cavity throughout, the deep one past the serosa throughout, the middle one crossing from neither to both inside the range. A calibration of three names, not a measurement of three fibroids |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `nothing-follows-about-symptoms` | A share of the cavity rising on screen reads as something happening to a person | It is a shape crossing a surface. Bleeding, pain, pressure and fertility are outside this model entirely, and **nothing in it makes any of them follow from size** — that they do not follow from size in any simple way is the reason the scene is about location at all |
| `one-fibroid-and-a-rigid-wall` | The bulge reads as a deformed uterus, and one fibroid reads as the usual case | The bulge is the fibroid itself standing past the surface: the wall keeps the shape the atlas gave it, is not thinned or stretched anywhere, and this model has no tissue mechanics. Most uteruses that have fibroids have several; this one has exactly one |

## 4. What is outside the model entirely

- **Every symptom.** Bleeding of any kind, pain, pressure symptoms, fertility
  and pregnancy.
- **Time and growth.** The axis is how big it is, not how long it has been
  there, and nothing says a fibroid grows, shrinks or stays.
- **Hormones, degeneration, sarcoma**, and every distinction between one lump
  and another. There is no tissue here, only a shape in a wall.
- **Every treatment**, and every consequence of one.
- **More than one fibroid**, and every fibroid on a stalk.

## 5. How to check it

```bash
node --test tests/uterine-fibroid-physiology.test.js  # Layer 1: the four propositions
node --test tests/uterine-fibroid-model.test.js       # integrity, and the scene's axis
node --test tests/calibration.test.js                 # the two things this repository chose
```
