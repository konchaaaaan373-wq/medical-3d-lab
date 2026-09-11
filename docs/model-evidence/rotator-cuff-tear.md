# Evidence — rotator cuff tear: what still holds the head down

Model: [`src/models/rotatorCuffTear.js`](../../src/models/rotatorCuffTear.js).
Boundary and failure modes: [`../model-cards/rotator-cuff-tear.md`](../model-cards/rotator-cuff-tear.md).
Machine-readable registry: `CUFF_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a **geometric** account of containment: what is left
holding the humeral head on its socket, and whether that keeps it centred.
**Nothing here is a measurement, a symptom or a movement** — in particular the
rise it reports is a share of a gap this repository drew, and **is not an
acromiohumeral distance**. No row rests on a paper this repository could open:
the build environment cannot reach the medical publishers, so nothing was
extracted from a figure or a table by its author.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `the-cuff-holds-rather-than-lifts` — the cuff holds the head on its socket while something else moves the arm | Standard shoulder anatomy; standard descriptions of the cuff as a depressor and stabiliser | Everything in the model is containment; nothing in it lifts | The arm is at the side and nothing moves | `physiology: the cuff holds the head on its socket rather than lifting the arm` |
| `the-facing-pair-centres-it` — the tendon in front and those behind pull against each other, and that pairing centres the head | Standard descriptions of the transverse force couple | The pair is a share of its own, unaffected by the tear | One number for the pair (see §3) | `physiology: a tear that spares the facing pair leaves the head where it was` |
| `the-head-rises-when-the-pair-goes` — the head rides up towards the arch once the tear reaches the pair. **thin** — the direction is textbook; how far, and in whom, is not claimed | Standard descriptions of superior migration with large tears involving the couple | A threshold on the total containment, below which the head rises | One threshold, chosen (see §2) | `physiology: the head rises only once the pair has stopped holding it` |
| `size-is-the-wrong-first-question` — the same complete defect is two pictures depending on what the tear has reached | A consequence of the two above, and the standard distinction between tears that spare the couple and tears that do not | The defect and the pair are separate inputs, on the axis and on a control | — | `physiology: the same complete defect is two pictures, depending on the pair` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `containment-shares` | How the holding is divided between the top tendon and the pair, and how much has to be left before the head stays put | Calibrated so that a complete tear sparing the pair keeps the head centred and one reaching it does not. **The behaviour is the claim**; the threshold is set to exactly what the pair alone provides, which is what makes those two statements one statement. No percentage printed is anybody's |
| `a-share-of-a-drawn-gap` | The fraction of the gap under the arch the head is allowed to rise through | Illustrative. The gap is the shoulder atlas's `SUBACROMIAL_DISPLAY_GAP`, imported rather than retyped, and the atlas declares it a display value — opened up until the tendon under the arch could be seen. **A share of it is not an acromiohumeral distance and is not millimetres** |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `one-number-for-the-pair` | A lit pair reads as a statement about two named tendons | It marks which side of a threshold the model is on. Which tendon a tear reaches, how far round it goes and what a partial involvement does are not things one share can carry |
| `nothing-moves-an-arm` | A head sitting higher reads as a shoulder that cannot lift | It is where the model says it can sit. Pain, weakness, the arc of movement and range are all outside the model, and the shoulder is drawn at one position with the arm at the side |

## 4. What is outside the model entirely

- **Everything a person experiences**: pain, weakness, the painful arc, range,
  and what anybody can or cannot do.
- Impingement as a syndrome, the bursa, tendinopathy, calcium, retraction,
  muscle quality and cuff tear arthropathy.
- Cause, time, healing and every treatment.
- The other three tendons as separate structures with courses of their own.

## 5. How to check it

```bash
node --test tests/rotator-cuff-tear-physiology.test.js  # Layer 1: the four propositions
node --test tests/rotator-cuff-tear-model.test.js       # integrity, and the drawn-gap refusal
node --test tests/calibration.test.js                   # the two things this repository chose
```
