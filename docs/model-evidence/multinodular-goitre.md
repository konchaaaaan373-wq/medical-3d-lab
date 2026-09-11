# Evidence — multinodular goitre: moved, or made narrower

Model: [`src/models/multinodularGoitre.js`](../../src/models/multinodularGoitre.js).
Boundary and failure modes: [`../model-cards/multinodular-goitre.md`](../model-cards/multinodular-goitre.md).
Machine-readable registry: `GOITRE_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a **geometric** account of what an enlarging thyroid is
next to. **There is no thyroid function in it at all** — no hormone, no TSH, no
uptake, no autonomy — and nothing here is a symptom, an image or a measurement.
No row rests on a paper this repository could open: the build environment cannot
reach the medical publishers, so nothing was extracted from a figure or a table
by its author.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `the-neck-is-soft-but-the-inlet-is-not` — a goitre in the neck displaces the airway and leaves it open; one that has followed the airway into the thoracic inlet, a ring of bone, narrows it with the same tissue | Standard descriptions of tracheal deviation in the neck and compression at the inlet | `deviation = push·(1 − confined)`, `indent = push·confined`, with `confined` a property of the direction | One confined direction, and a single distance for the advance | `physiology: the airway is pushed aside where the neck is soft and narrowed where it is not` |
| `volume-is-the-same-in-every-direction` — a given amount of nodular tissue makes the gland the same size whichever way it went | Arithmetic: a direction does not change a volume | `glandVolumeRatio = 1 + burden/2`, reported first for exactly this reason | Both lobes share the burden | `physiology: the same amount of gland is the same size in every direction` |
| `the-posterior-structures-are-passed-not-approached` — the recurrent laryngeal nerve is in the groove behind the gland and the parathyroids are on its posterior surface, so a backward enlargement passes them. **thin** — the arrangement is textbook; the parathyroids' positions vary more than almost anything in the neck | Standard thyroid surgical anatomy | `behindFraction = advance·behind/depth(lobe)`, and `envelopsPosterior` past a share of that depth | Four plausible parathyroid sites, from the atlas | `physiology: a backward enlargement passes the nerve and the parathyroids rather than approaching them` |
| `two-lobes-round-one-airway` — a trachea pushed equally from both sides does not move, so deviation needs one side to lead | Standard thyroid anatomy, and the standard observation that deviation follows asymmetric enlargement | The medial picture grows one lobe four times as much as the other, and the airway bends away from it | One leading side, chosen | `physiology: a trachea pushed equally from both sides does not move` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `atlas-and-face-area` | The lobe's volume and depth, the airway's calibre, and the area the added tissue comes out through | The first three are the atlas's, measured off its meshes; the face area is a calibration chosen so the burdens the scene offers move and narrow things visibly without running away. **No volume is a millilitre, no distance a centimetre, and the width across the airway is against this model's own resting width rather than a tracheal diameter** |
| `four-directions` | Twelve coefficients: how much of each direction is aimed at the airway, how much of that is confined, and how much goes backward | Illustrative. A reading of four standard pictures; nothing was measured. What is claimed is the *ordering* — that exactly one direction narrows and the rest displace — and never the sizes. A real goitre goes several ways at once |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `no-function-anywhere` | A picture of a thyroid invites an inference about thyroid function | There is none in the model. A goitre of any shape here may be euthyroid, overactive or underactive, and **nothing about the shape says which**. This is the sharpest scope decision in the scene, and it is written into the scope panel rather than left to the prose |
| `a-relation-is-not-an-injury` | The nerve and the parathyroids light up, which reads as something having happened to them | It is where they are. Whether a nerve is stretched, invaded, displaced intact or untouched is not something a volume and a direction can tell you, and nothing in this model says a nerve is damaged or at risk |

## 4. What is outside the model entirely

- **All thyroid function.** No hormone, no TSH, no uptake, no autonomy.
- **Malignancy, cytology, calcification**, and every distinction between one
  nodule and another. There is no tissue here, only a volume and a direction.
- **Every symptom**: swallowing, breathing, voice, and how any of them feels.
- **Time, growth rate and every treatment**, surgical or otherwise.

## 5. How to check it

```bash
node --test tests/multinodular-goitre-physiology.test.js  # Layer 1: the four propositions
node --test tests/multinodular-goitre-model.test.js       # integrity, and the refusal of function
node --test tests/calibration.test.js                     # the two things this repository chose
```
