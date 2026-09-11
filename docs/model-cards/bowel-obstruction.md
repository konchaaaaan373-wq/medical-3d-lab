# Model card — bowel obstruction: what the place of it decides

| | |
| --- | --- |
| **Scene ID** | `bowel-obstruction` |
| **Route** | `#/bowel-obstruction` |
| **Model** | [`src/models/bowelObstruction.js`](../../src/models/bowelObstruction.js) |
| **Evidence** | [`../model-evidence/bowel-obstruction.md`](../model-evidence/bowel-obstruction.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

When the bowel is blocked, what does *where* it is blocked change — and where
does the wall end up carrying the most?

## 2. Model type

A deterministic series-path model, solved in closed form. The gut is a list of
named stretches in the order it runs; a blockage divides that list in two; the
volume that arrives above it is distributed over the stretches that can take it.
Everything else is consequence.

The site is a **scenario and not a severity**. A blockage high in the small
bowel and one at the sigmoid are not two points on one axis: they distend
different lengths of gut, put the transition at a different place, and raise the
wall tension somewhere neither of them is. The axis is how completely the path is
blocked, at whichever site the reader has chosen.

## 3. What it is not

It is not a time course: nothing in it is hours, and the axis is not a clock. It
contains no pain, vomiting, distension as a sign, bowel sounds or tenderness; no
ischaemia, strangulation or perforation, and no risk of any of them; no cause;
no fluid shift, electrolytes or absorption; and no treatment.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `site` | one of five | Where the blockage is, or nothing blocked. Four places, not four degrees |
| `completeness` | 0–1 | How completely the path is shut at that place |
| `valveCompetence` | 0–1 | How well the ileocaecal valve holds against reflux back into the ileum |

The scene's **axis is `completeness`**. The other two are on the control panel,
because neither is a position on it.

## 5. Outputs

- Which stretches are above the blockage, which receive nothing, and which are
  distended
- The calibre of the distended bowel, against its own resting calibre
- What share of the drawn gut is distended, and what share receives nothing
- A wall tension index per stretch, and which stretch carries the most
- Whether a colonic blockage is shut in at both ends

## 6. State variables

None. `solveBowelObstruction()` is a pure function of its three controls.

## 7. Governing relations

```text
V(retained)   = LOAD · completeness · V(whole gut at rest)
areaRatio     = 1 + V(retained) / V(distensible at rest)
radiusRatio   = √areaRatio                       ← every distended stretch
tension(seg)  = areaRatio · radiusRatio · r₀(seg) / r₀(caecum)
```

The last line is Laplace's `T = P·r` with `areaRatio` standing in for the
distending pressure. **It is an index, not a pressure and not a tension**, it
has no units, and the model has no pressure–volume curve for bowel wall in it.

## 8. Constants and calibration

Two, and neither is a measurement. The lengths and calibres are the intestinal
atlas's drawn proportions, measured off its own curves so that the picture and
the arithmetic are the same gut; `tests/calibration.test.js` fails if they drift
apart. The retained load was chosen so a complete blockage distends the bowel
above it visibly at every site and never past about twice its resting calibre.

## 9. Visual mapping

Declared in `VISUAL_MAPPING` (`src/data/bowelObstruction.js`) and handed out by
`getVisualMapping()`:

- Each stretch above the blockage is drawn at the atlas's own calibre multiplied
  by the model's ratio. **The calibre it multiplies is a drawn one**, so no bowel
  diameter follows from it.
- A stretch that receives nothing is drained of colour, so the two sides of the
  transition are different pictures. It marks which side of the blockage a
  stretch is on, not a degree of collapse.
- The transition point is marked once anything is blocked. The marker has no
  size.
- The stretch whose wall carries the most is lit, and only when one of them
  stands out — distended small bowel is drawn at one calibre and has no worst
  part. **Lit is not at risk.**

## 10. Known failure modes

- One path with no side branches, no appendix, no rectum and no anal canal.
- One distending pressure throughout the connected length: no gradient, and no
  difference between a stretch at the blockage and one far above it.
- A single competence number for the ileocaecal valve, and no sequence in which
  it gives way.
- The atlas's taper understates how much wider the caecum is than the rest of
  the colon, so the tension spread the scene reports is a floor.

## 11. Where it will mislead

**The wall tension index looks comparable between scenarios and is not.** It
rests on a retained load this repository chose and a single distending pressure;
what it supports is comparing stretches inside one picture, which is why the
read-out reports a ratio within one picture (`same-load-at-every-site`).

**A small bowel held at rest above a competent valve reads as a claim that it
stays there.** It is the model saying the volume has not reached it. There is no
time in this model to show what happens next (`held-bowel-stays-resting`).

## 12. Safety boundary

Never use the model to estimate a bowel diameter, an intraluminal pressure, or a
time; to grade or stage an obstruction; to distinguish mechanical obstruction
from ileus; to judge the risk of ischaemia, strangulation or perforation; or to
decide whether, when or how any obstruction should be treated.

## 13. Uncertainty

The series behaviour, the closed loop and Laplace are standard. What this model
cannot support is any magnitude and any sequence: how fast bowel fills, how far
a given obstruction distends it, when a valve gives way, and what any of it does
to a person. Every one of those is outside it, and the scope panel lists them as
excluded rather than as future work.

## 14. Evidence and review

The dossier records the division of the path, the arithmetic between site and
distension, the closed loop and Laplace as the externally supported claims, and
declares the drawn proportions and the retained load as things this repository
chose. Independent clinical sign-off has not been recorded; the public review
state is `pending`.

## 15. Verification

```bash
node --test tests/bowel-obstruction-physiology.test.js
node --test tests/bowel-obstruction-model.test.js
node --test tests/calibration.test.js
```

The physiology tests fix the four propositions the scene teaches, including the
one that separates it from a severity story: with the valve out of the way, the
further down the blockage goes the more bowel is above it and the *less* each
part of that bowel distends.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene (`src/data/patientGuides.js`,
id `bowel-obstruction`). It walks the same three stages and stops where §12 does.
No step names a cause, a test, an operation or a risk, and the steps about what a
person might notice are marked `associated` and say on screen that they are not
drawn from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/bowelObstruction.js`. A change to it must revise this card before its
digest is adopted.
