# Evidence — tissue under a load: a profile of deformation against depth

Model: [`src/models/pressureInjury.js`](../../src/models/pressureInjury.js).
Boundary and failure modes: [`../model-cards/pressure-injury.md`](../model-cards/pressure-injury.md).
Machine-readable registry: `PRESSURE_INJURY_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a **geometric** account of where a surface load is felt
hardest. **Nothing here is a measurement, a mechanical quantity, an injury or a
stage**, and in particular **this model does not stage a pressure injury and
cannot be made to**. No row rests on a paper this repository could open: the
build environment cannot reach the medical publishers.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `trapped-tissue-is-squeezed-from-both-sides` — tissue between a load above and a bone below has the peak of its profile at that deep interface, not at the skin | Standard descriptions of pressure injury as deformation of soft tissue between an external surface and underlying bone | A second term decays upwards from the block's floor and is added to the one decaying downwards from the surface | One load, one prominence, and a profile that depends only on depth | `physiology: over a prominence the worst of it is deep, not at the skin` |
| `over-soft-tissue-it-fades-downwards` — with nothing beneath it the squeeze fades downwards and the skin takes the most of it | A consequence of a load applied at one surface with nothing resisting from the other | The second term is absent | The same | `physiology: over soft tissue the squeeze fades downwards from the skin` |
| `two-shapes-rather-than-two-amounts` — over bone the skin is squeezed **less** while the deep layer is squeezed far more | A consequence of the two terms, each normalised against the profile it is part of | Layers are reported as a share of the profile's own peak | Shares are read within one picture, never across two | `physiology: the two grounds are two shapes, not two amounts` |
| `a-profile-capped-at-its-surface-cannot-make-the-claim` — the arithmetic is deliberately not clamped | A design consequence: the clamped version was written first and flattened both ends of the profile into one value | `deform` is the plain sum of the two terms | An unscaled comparative number, not a physical one | `physiology: a profile whose peak could not exceed its surface is refused` |
| `how-hard-never-changes-which-depth` — pressing harder changes the amount, never the answer | A consequence of the load entering both terms as a common factor | The axis multiplies the profile | The axis is a magnitude, not a duration | `physiology: how hard the surface is pressed changes the amount, never the answer` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `the-atlas-depths-and-the-floor-the-bone-sits-at` | The depths of the named layers, and the depth the deep term decays from | Illustrative, taken from `LAYER_DISPLAY_THICKNESS`. **The atlas declares its own layer thicknesses deliberately not to scale**, with the epidermis drawn some twenty times too thick. No thickness or ratio may be read off any of it |
| `reach-and-trapped-are-chosen` | How far a squeeze reaches, and how much harder trapped tissue is squeezed | Calibrations chosen so both shapes are legible across the range. **Neither is a ratio anybody measured**; the tests fix the consequence — that the deep peak exists and is the larger — rather than the values |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `no-stage-is-produced-or-implied` | A scene about pressure injury reads as a scene that stages one | **Uncertain and out of scope, and the sharpest boundary in this model.** Staging rests on visible tissue and tissue loss, which this model has neither of. The read-out prints "not in this model" where a stage would go |
| `nothing-happens-to-the-tissue-but-deformation` | A coloured deep layer reads as dead tissue | Nothing converts a deformation into an injury. The colour marks the longest bar and nothing else |
| `deform-is-not-a-mechanical-quantity` | A number against a depth reads as a stress or a pressure | It is unscaled and comparative. Shares are taken against the profile's own peak, so they compare depths inside one picture only |
| `the-prominence-is-a-structure-the-scene-adds` | A bone under the block reads as part of the anatomy | The skin atlas is a specimen with no skeleton in it. The apex is placed at the block's own floor so the drawn and the computed agree; nothing about its shape is a bone in anybody |
| `no-time-no-blood-and-no-person` | A position on the axis reads as an elapsed time | **The axis is how hard, not how long.** There is no perfusion, no ischaemia, no repair, no moisture or friction, and no person, position or support surface |
| `four-depths-standing-for-a-continuum` | Four bars read as four things that happen | The profile is continuous; the four are the depths a reader can name, and the deep interface is a place rather than a tissue |

## 4. What is outside the model entirely

- **Every clinical stage and grade**, and **all damage**: no death, no loss, no
  depth of loss, no ulcer and no wound.
- All the mechanics and all the biology: stress, strain, modulus, blood,
  perfusion, ischaemia, inflammation and repair.
- Time, duration and relief. Temperature, moisture, friction and continence.
- Any person, body position, support surface or risk assessment.

## 5. How to check it

```bash
node --test tests/pressure-injury-physiology.test.js  # Layer 1: the five propositions
node --test tests/pressure-injury-model.test.js       # integrity: the drawing against the model
node --test tests/calibration.test.js                 # the two things this repository chose
```
