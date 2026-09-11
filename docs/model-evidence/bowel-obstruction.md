# Evidence — bowel obstruction: what the place of it decides

Model: [`src/models/bowelObstruction.js`](../../src/models/bowelObstruction.js).
Boundary and failure modes: [`../model-cards/bowel-obstruction.md`](../model-cards/bowel-obstruction.md).
Machine-readable registry: `BOWEL_OBSTRUCTION_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a qualitative, geometric account of mechanical
obstruction. **Nothing here is a measurement, an image or a time course.** No
value the model reports is a bowel diameter, an intraluminal pressure, a
duration or a risk, and no figure in it is a threshold. No row rests on a paper
this repository could open: the build environment cannot reach the medical
publishers, so nothing was extracted from a figure or a table by its author.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `divides-the-path` — one path in series, so a blockage divides it: above keeps receiving and cannot pass anything on, below receives nothing. The transition point is what identifies the level | Standard surgical descriptions of mechanical bowel obstruction | The segment list is split at the blocked segment; everything below is marked `empty` and left at its resting calibre | One path, no side branches, no appendix | `physiology: a blockage fills what is above it and empties what is below it` |
| `site-decides-how-much-is-above` — the same delivered volume over a shorter length distends each part of it further, so a high blockage distends a short length a great deal and a low one distends more bowel, less | Conservation of volume on the series path; the clinical counterpart is a standard description | `areaRatio = 1 + V(retained)/V(distensible)`, with the distensible volume taken from the segments above | The same amount arrives above the blockage wherever it is (see §3) | `physiology: the same amount over a shorter length distends it further` |
| `closed-loop-at-a-competent-valve` — a valve that holds turns a colonic obstruction into a segment shut at both ends, so the colon alone takes it. **thin** — the direction is textbook; how competent a given valve is, and for how long, is not claimed | Standard descriptions of closed-loop large bowel obstruction | The small bowel's share of the retained volume is scaled by `1 − competence` when the blockage is colonic | A single competence number, and no sequence | `physiology: a valve that holds shuts a colonic blockage in at both ends` |
| `laplace-favours-the-widest` — `T = P·r`, so at one pressure the widest part of the distended bowel carries the most; in the large bowel that is the caecum, which is neither the blockage nor next to it | Laplace's law for a cylinder, and the standard description of the caecum as the segment that distends most | `tension = areaRatio · radiusRatio · r₀(seg)/r₀(caecum)` | A thin-walled cylinder, one pressure throughout the connected length | `physiology: at one pressure the widest distended part carries the most wall tension` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `drawn-proportions` | The length and calibre each named stretch has in the model | Illustrative. They are the intestinal atlas's drawn proportions, measured off its own curves and chosen there to be legible. In a person the small bowel is several times the length of the colon and much narrower than these make it — the claim is the *ordering*, that the caecum is the widest part of the large bowel and the sigmoid the narrowest, not the ratios. The drawn taper understates how much wider the caecum is than the rest of the colon, so the tension spread the scene reports is a floor rather than an estimate |
| `retained-load` | How much the gut delivers into the obstructed length, as a multiple of the whole gut's resting luminal volume | Calibrated so a complete blockage distends the bowel above it visibly at every site and never past about twice its resting calibre. Not a secretion, not millilitres, not anybody's |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `same-load-at-every-site` | The model takes the same amount to arrive above the blockage wherever it is, on the grounds that most of what fills an obstructed bowel enters above the duodenum | It is why the wall tension index may not be compared between two scenarios. The number rests on a retained load this repository chose and a single distending pressure; what it supports is comparing segments inside one picture, which is what the read-out reports |
| `held-bowel-stays-resting` | Small bowel held back by a competent valve is drawn at its resting calibre and stays there | A consequence of having no time in the model. In a person a valve does not hold indefinitely; a resting small bowel on screen is the model saying the volume has not reached it, not a claim that it never will |

## 4. What is outside the model entirely

- **No time and no rate.** The axis is how completely the path is blocked, not
  how long it has been blocked. Nothing in the model is hours.
- **No symptom and no sign.** No pain, no vomiting, no abdominal distension as
  a sign, no bowel sounds, no tenderness.
- **No ischaemia, strangulation or perforation**, and no risk of any of them.
  There is no blood supply and no wall in this model that can fail.
- **No cause.** No adhesion, hernia, volvulus, tumour or impaction: the
  blockage here is a place, not a thing.
- **No fluid shift, electrolytes, absorption or bacterial overgrowth**, and no
  treatment of any kind.
- **No rectum and no anal canal.** The drawn gut stops at the sigmoid, so a
  blockage there has nothing below it on screen.

## 5. How to check it

```bash
node --test tests/bowel-obstruction-physiology.test.js  # Layer 1: the four propositions
node --test tests/bowel-obstruction-model.test.js       # integrity, and the scene's axis
node --test tests/calibration.test.js                   # the two things this repository chose
```
