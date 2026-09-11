# Model card — ACL injury: what is holding the tibia now

| | |
| --- | --- |
| **Scene ID** | `acl-injury` |
| **Route** | `#/acl-injury` |
| **Model** | [`src/models/aclInjury.js`](../../src/models/aclInjury.js) |
| **Evidence** | [`../model-evidence/acl-injury.md`](../model-evidence/acl-injury.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

When the anterior cruciate ligament is torn, what is holding the tibia — and how
much of what there was is that?

## 2. Model type

A geometric and mechanical model, solved in closed form: one ligament in three
states, and what is left of the restraint to the tibia sliding forward.

The axis is **how much of the ligament's restraint is gone**. It is not a
position: a torn ligament is a different state of the same structure, and the
scene draws three states rather than one structure in three places.

## 3. What it is not

**It is not an examination.** Nothing in it is a Lachman test, an anterior drawer
or a pivot shift; those are manoeuvres a person performs, under a load they
choose, graded by what they feel. There is no examiner in this model and nothing
on screen is being tested. It also contains no mechanism of injury, no pain,
swelling or giving way; no rotation; no bone bruising or cartilage; no time,
healing or treatment.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `disruption` | 0–1 | How much of the ligament's restraint is gone |
| `secondaryRestraint` | 0–1 | How much of everything else is still there |

## 5. Outputs

- The ligament's own state: intact, stretched and thinned, or discontinuous
- What is left of the restraint, against what there was, and how it divides
- Whether the secondary restraints are now the ones carrying it
- How far forward the tibia can sit, **as a fraction of the drawn plateau**

## 6. State variables

None. `solveAclInjury()` is a pure function of its two controls.

## 7. Governing relations

```text
holding(acl)       = 0                   where the cord is no longer continuous
                   = aclShare · (1 − disruption)   otherwise
holding(secondary) = secondaryShare · secondaryRestraint
translation        = maxTranslation · (1 − holding)
```

The step in the first line is deliberate. A cord that has failed does not go on
carrying a fraction of what it carried, and a model that tapered smoothly through
that point would be drawing something that does not happen.

## 8. Constants and calibration

Two. The split between the ligament and everything else is a reading of the word
*primary*, chosen so the ordering holds and the crossover falls where the cord
fails. The furthest travel is a fraction of the atlas's drawn plateau, chosen so
the movement is visible without the tibia leaving the femur.

## 9. Visual mapping

Declared in `VISUAL_MAPPING` (`src/data/aclInjury.js`):

- **The scene draws its own ligament** rather than moving the atlas's intact one,
  between the atlas's own attachment points. Intact, thinned and slack, or two
  stumps with a gap. The gap is drawn, not solved.
- The tibia and everything belonging to it move forward by the fraction the
  model reports. **Not millimetres, not a side-to-side difference, not a grade.**
- The menisci are lit once the secondary restraints are holding more than the
  ligament is. That marks which side of a comparison the model is on, and is not
  a prediction that anything will happen to a meniscus.

## 10. Known failure modes

- One cord for a bundled structure, and one failure point along its length.
- One direction of movement, where the ligament resists more than one.
- Collaterals and the extensor tendon drawn but not re-solved as the bone moves.
- The knee drawn in extension, with nothing moving by itself.

## 11. Where it will mislead

**A tibia sitting forward looks like the thing a pair of hands is testing for.**
It is where the model says it can sit (`no-examiner`).

**Everything on screen looks like part of one solved knee.** Only the two
cruciates follow the bone (`context-not-resolved`).

## 12. Safety boundary

Never use the model to grade an ACL injury, to infer a Lachman, drawer or pivot
shift result, to estimate a translation in millimetres or as a side-to-side
difference, to judge whether a ligament is partially or completely torn in
anybody, or to decide whether, when or how anything should be treated.

## 13. Uncertainty

The anatomy, the primary/secondary ordering and the mechanics of a failed cord
are standard. What this model cannot support is any magnitude and anything about
a person: how far a given knee travels, what it feels like, and what should
follow.

## 14. Evidence and review

The dossier records the ligament's course, the primary/secondary ordering, the
behaviour of a failed cord and the direction of travel as the externally
supported claims, and declares the restraint split and the drawn travel as things
this repository chose. Independent clinical sign-off has not been recorded; the
public review state is `pending`.

## 15. Verification

```bash
node --test tests/acl-injury-physiology.test.js
node --test tests/acl-injury-model.test.js
node --test tests/calibration.test.js
```

One of the model tests checks the *declaration*: that the visual mapping and the
scope panel both still refuse the manoeuvres by name.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene (`src/data/patientGuides.js`,
id `acl-injury`). It walks the same three stages and stops where §12 does. No
step names a test, an operation or a risk, and the steps about what a person
might notice are marked `associated` and say on screen that they are not drawn
from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/aclInjury.js`. A change to it must revise this card before its digest
is adopted.
