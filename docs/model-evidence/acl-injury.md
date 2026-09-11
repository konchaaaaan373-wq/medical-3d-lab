# Evidence — ACL injury: what is holding the tibia now

Model: [`src/models/aclInjury.js`](../../src/models/aclInjury.js).
Boundary and failure modes: [`../model-cards/acl-injury.md`](../model-cards/acl-injury.md).
Machine-readable registry: `ACL_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a **geometric and mechanical** account of one ligament and
what is left restraining the tibia. **Nothing here is an examination.** No
number in it is a Lachman, an anterior drawer or a pivot shift, there is no
examiner anywhere in it, and nothing on screen is being tested. No row rests on
a paper this repository could open: the build environment cannot reach the
medical publishers, so nothing was extracted from a figure or a table by its
author.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `the-thing-in-the-way` — the ligament runs from the back of the lateral condyle to the front of the tibia, so it is what is in the way when the tibia slides forward | Standard knee anatomy | The drawn cord runs between the atlas's own `aclFemoral` and `aclTibial` attachment points | One cord for a bundled structure | `physiology: the ligament runs the way an ACL runs, between the atlas’s own attachments` |
| `primary-and-secondary` — it is the primary restraint, the menisci, capsule and plateau shape are secondary; with it gone they carry all of what is left | Standard descriptions of the ACL as the primary restraint to anterior tibial translation | Two shares; the secondary one is unchanged by what happens to the ligament | The split itself is §2 | `physiology: with the ligament gone the secondary restraints carry all of what is left` |
| `a-failed-cord-holds-nothing` — a discontinuous ligament carries none of the load it carried | Mechanics of a cord in tension | The ligament's share steps to zero at the point it stops being continuous, deliberately rather than tapering | One failure point along the length | `physiology: a discontinuous ligament holds nothing at all` |
| `less-restraint-is-more-travel` — how far forward the tibia can sit follows how much restraint is missing. **thin** — the direction is standard; how much further is not claimed | Mechanics | `translation = maxTranslation · (1 − holding)` | Linear in the missing restraint | `physiology: the less is holding it, the further forward it can sit` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `restraint-split` | How the restraint divides between the ligament and everything else when all of it is intact | A calibration, and a reading of one word: *primary*. Chosen so the ordering holds and so the crossover — where the secondary restraints start carrying more than the ligament — falls where the cord stops being continuous, rather than at an unrelated place on the axis. **The model claims the ordering and never the numbers** |
| `drawn-travel` | The furthest forward this model lets the tibia sit | Illustrative, as a fraction of the knee atlas's drawn plateau. **Not millimetres and not a side-to-side difference**, and no position on screen is a grade |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `no-examiner` | A tibia sitting forward looks exactly like the thing a pair of hands is testing for | It is where the model says it can sit. A Lachman, an anterior drawer and a pivot shift are manoeuvres a person performs under a load they choose, graded by what they feel; none of that is in a geometric model, and the scope panel refuses them by name |
| `context-not-resolved` | Everything on screen appears to be part of one solved knee | Only the two cruciates follow the bone. The collaterals and the tendon across the front are drawn as context and are not re-solved, and nothing about what they do is in this model |

## 4. What is outside the model entirely

- **Every examination**, and every grade that comes from one.
- **The injury itself**: how it happened, what the knee was doing, what a person
  felt then or since. No pain, swelling or giving way.
- **Rotation.** The ligament is oblique and resists more than one thing; this
  model has one direction in it.
- Bone bruising, cartilage, time, healing, and every treatment — including
  whether anything should be done at all.

## 5. How to check it

```bash
node --test tests/acl-injury-physiology.test.js  # Layer 1: the four propositions
node --test tests/acl-injury-model.test.js       # integrity, and the refusal of the manoeuvres
node --test tests/calibration.test.js            # the two things this repository chose
```
