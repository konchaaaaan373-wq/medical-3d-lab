# Evidence — lumbar disc displacement: three questions, two answers

Model: [`src/models/lumbarDiscHerniation.js`](../../src/models/lumbarDiscHerniation.js).
Boundary and failure modes: [`../model-cards/lumbar-disc-herniation.md`](../model-cards/lumbar-disc-herniation.md).
Machine-readable registry: `LUMBAR_DISC_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a **geometric** account of displaced disc material.
**Nothing here is a measurement, an image, a classification or a symptom**, and
in particular the containment state **is not** bulge/protrusion/extrusion and an
overlap **is not** root contact in anybody. No row rests on a paper this
repository could open: the build environment cannot reach the medical
publishers, so nothing was extracted from a figure or a table by its author.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `two-tissues-one-threshold` — the disc is a ring enclosing a soft centre, and "deformed" against "material has left it" is whether the ring still closes behind it | Standard descriptions of the annulus and nucleus, and of displacement through an annular defect | `annulus = reach > ANNULUS_BEHIND`, one threshold with two values | One direction at a time, and a ring of one thickness behind the nucleus | `physiology: the ring closing behind it is one threshold, not a degree` |
| `the-direction-decides-what-is-there` — what the material can reach is a property of the direction, not of how far it has gone | Standard descriptions of posterolateral displacement approaching a root and central displacement approaching the canal | Each direction names what lies that way and carries its own clearance | Three directions standing for a continuum | `physiology: what it can reach is decided by the direction, not by how far it went` |
| `past-the-ring-is-not-reaching-anything` — material can be past the ring and reach nothing; the two are separate events | A consequence of the geometry, with the standard observation that displaced material is often present without contacting a neural structure | The clearance exceeds the annulus thickness, so a span exists where one is true and the other is not | — | `physiology: passing the ring and reaching something are two separate events` |
| `a-narrow-target-and-a-wide-one` — an indentation means nothing without the width of what is indented; the canal is wide and the root is narrow | Solid geometry over the atlas's own calibres | `indentFraction = min(overlap, width) / width` | The two structures as single widths | `physiology: how far in is reported against the structure’s own width, and is bounded` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `atlas-clearances` | The nucleus's half-depth, the annulus behind it, and the clearance to the canal and to the root | Illustrative. Measured off `buildSpine()`, which **declares itself not anatomically validated** and says no height, width, angle or curve in it is a measurement. Nothing derived from it is millimetres |
| `how-far-the-axis-goes` | The furthest the axis carries the material | Calibrated so every direction can arrive before the top of the axis — including the furthest — without the material leaving the picture. Not a distance anybody travels |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `the-containment-state-is-not-the-classification` | Two containment values beside four familiar words read as the first two of them | **Uncertain and out of scope.** Bulge, protrusion, extrusion and sequestration are defined on measured geometry in a chosen plane, with rules about the base against the depth. This model has neither a plane nor a base |
| `overlap-is-not-contact-in-anybody` | Two shapes overlapping reads as a radiological finding | It is contact in a drawing, measured against a clearance from an atlas that is not anatomically validated. The read-out says "in this drawing" in as many words |
| `no-symptom-is-produced-or-implied` | Material reaching a nerve reads as a person in pain | There is no nerve here beyond a drawn tube with a position. The read-out prints "not in this model" where a symptom would go, because an omitted row reads as an oversight and this absence is the claim |
| `one-pair-of-roots` | Two lateral directions read as the traversing and the exiting root | The atlas draws one pair, leaving above the disc. The two directions reach the same drawn root at two places along it |
| `no-time-and-no-cause` | An axis reads as a course | The axis is how far the material has gone. There is no time, no mechanism, no inflammation, no treatment and no resorption |

## 4. What is outside the model entirely

- **Every symptom and sign**: sciatica, numbness, weakness, reflex change.
- **The radiological classification**, and all imaging: plane, sequence,
  measurement, canal and foraminal stenosis ratios.
- Time, cause, mechanism of injury, inflammation and all chemistry.
- Treatment, natural history and resorption.

## 5. How to check it

```bash
node --test tests/lumbar-disc-herniation-physiology.test.js  # Layer 1: the four propositions
node --test tests/lumbar-disc-herniation-model.test.js       # integrity: the drawing against the model
node --test tests/calibration.test.js                        # the two things this repository chose
```
