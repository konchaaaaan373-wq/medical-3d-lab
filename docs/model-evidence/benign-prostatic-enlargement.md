# Evidence — benign prostatic enlargement: which zone is growing

Model: [`src/models/prostaticEnlargement.js`](../../src/models/prostaticEnlargement.js).
Boundary and failure modes:
[`../model-cards/benign-prostatic-enlargement.md`](../model-cards/benign-prostatic-enlargement.md).
Machine-readable registry: `PROSTATIC_ENLARGEMENT_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a **geometric** account of zonal enlargement. There is no
urine in this model, nothing flows through it, and no symptom, score or
prostate-specific antigen appears anywhere in it. No row rests on a paper this
repository could open: the build environment cannot reach the medical
publishers, so nothing was extracted from a figure or a table by its author.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `arises-in-the-transition-zone` — the enlargement is of the transition zone, the small periurethral part, and not of the gland uniformly | McNeal's zonal anatomy; standard urological description of BPH as a transition-zone process | Only `transitionVolume` is multiplied; the central and peripheral terms are untouched | Four zones as nested solids of revolution | `physiology: what enlarges is the transition zone, and nothing is added to the peripheral zone` |
| `peripheral-zone-is-displaced-not-lost` — the peripheral zone is compressed into a rim, the plane an enucleation proceeds in, without losing tissue | Standard descriptions of the compressed peripheral zone as the surgical capsule | `r(outer) = ∛((V(inner) + V(peripheral₀))/(4π/3))`, with the peripheral term conserved | A rim thickness read as `r(outer) − r(inner)` | `physiology: the rim thins while the tissue in it is conserved` |
| `the-gland-grows-less-than-the-zone` — a several-fold transition zone is a much more modest gland; ten times the zone is under twice the organ | Arithmetic of additive volumes applied to the zonal division above | `V(gland) = V(inner) + V(peripheral₀)`, reported as a ratio against rest | That the zone's resting share is small, which is the display proportion below | `physiology: several times the zone is a fraction more gland` |
| `median-lobe-acts-at-the-neck` — lateral-lobe growth surrounds the channel along its length, a median lobe projects into the bladder neck, so the same tissue narrows a different place. **thin** — the direction is textbook; neither magnitude is claimed | Standard descriptions of lateral-lobe and median-lobe patterns | Two fractions reported apart, and the scene applies each where the model says it acts | A smooth split between the two, set by one control | `physiology: the same tissue in two arrangements narrows different places` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `zone-display-proportions` | The resting share each zone takes of the model gland, from which every ratio in the scene is computed | Illustrative. These are the anatomy atlas's display proportions, chosen there so four zones can be told apart on screen — in a real prostate the peripheral zone is roughly seventy per cent of the glandular tissue and the transition zone a few per cent. The scene is drawn on that atlas, so the two must agree. **No prostate volume and no zone volume may be read off this model** |
| `lumen-compression` | How much of the channel is left per unit of transition-zone growth | Calibrated so the narrowing is visible across the span the scene walks without closing. An assumed relation as well as a calibration: this model has no tissue mechanics and cannot derive how a lumen deforms. What it reports is a fraction of its own unenlarged channel — never a calibre, never a flow rate, never a residual volume |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `growth-axis-is-not-a-course` | The axis runs from a resting gland to an enlarged one, and a reader will take that travel for a course over time | There is no time in this model. The axis is how far into an enlarged gland the reader has gone. Neither end is a grade or a severity, and no position on it corresponds to a symptom, a score, or an indication for anything |

## 4. What is outside the model entirely

- **No urine and no flow.** No flow rate, no post-void residual, no bladder
  wall, no detrusor. There is no fluid in this model and nothing in it flows.
- **No symptom and no score.** Nothing here is a symptom index, and nothing the
  model reports is a threshold.
- **No prostate-specific antigen, no cancer, no inflammation, no infection.**
  Cancer arises mostly in a different zone and is a different subject.
- **No treatment**, medical or surgical, and no consequence of one.
- **No time.** `growth` is a position, not a number of years.

## 5. How to check it

```bash
node --test tests/prostatic-enlargement-physiology.test.js  # Layer 1: the four propositions
node --test tests/prostatic-enlargement-model.test.js       # integrity, and the scene's axis
node --test tests/calibration.test.js                       # the two things this repository chose
```
