# Model card — benign prostatic enlargement: which zone is growing

| | |
| --- | --- |
| **Scene ID** | `benign-prostatic-enlargement` |
| **Route** | `#/benign-prostatic-enlargement` |
| **Model** | [`src/models/prostaticEnlargement.js`](../../src/models/prostaticEnlargement.js) |
| **Evidence** | [`../model-evidence/benign-prostatic-enlargement.md`](../model-evidence/benign-prostatic-enlargement.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

When the prostate enlarges, which part of it is enlarging — and what does that
do to the parts that are not?

## 2. Model type

A **geometric** model, and that is the whole of what it claims. One zone is
multiplied; every other number is a consequence of conserving the rest. There is
no solver in it, no time step and nothing iterative: the arrangement is computed
in closed form from one growth factor and one shape control.

That modesty is the point of the scene. The single most common way this disease
is drawn wrongly is as a gland that gets uniformly bigger, and a model that can
only grow one zone cannot draw it that way.

## 3. What it is not

It is not a urodynamic model. There is no urine in it and nothing flows: no flow
rate, no post-void residual, no bladder wall, no detrusor. It contains no symptom
and no symptom score, no prostate-specific antigen, no cancer, no inflammation,
no treatment medical or surgical, and no time.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `transitionGrowth` | 1–14 | How many times its resting volume the transition zone is. 1 is a gland with nothing wrong with it |
| `medianLobeShare` | 0–1 | How much of the growth is arranged as a median lobe at the bladder neck rather than as lateral lobes along the channel |

The scene's **axis is the first of these and nothing else**. The second is a
shape, not a severity, and is deliberately off the axis: which arrangement a
gland takes is not something a volume can tell you.

## 5. Outputs

- The transition zone and the whole gland, each against its own resting size
- What each zone is as a share of the gland, now
- The peripheral rim's thickness, against the one it had
- What is left of the channel along its length, and at the bladder neck,
  **each as a fraction of this model's own unenlarged channel**
- Whether the peripheral zone has been compressed far enough to read as a rim

## 6. State variables

None. `solveProstaticEnlargement()` is a pure function of its two controls.

## 7. Governing relations

```text
V(inner)  = V(central) + V(transition₀)·growth
r(inner)  = ∛(V(inner) / (4π/3))
r(outer)  = ∛((V(inner) + V(peripheral₀)) / (4π/3))   ← peripheral tissue conserved
rim       = r(outer) − r(inner)

lateral   = 1 / (1 + k·(growth − 1)·(1 − medianShare))
at neck   = 1 / (1 + k·(growth − 1)·(1 + medianShare))
```

The first block is arithmetic. **The second is an assumed relation**, declared as
one: `k` says how much narrowing the scene draws per unit of growth, and this
model has no tissue mechanics with which to derive it.

## 8. Constants and calibration

Two things, and neither is a measurement. The resting zone proportions are the
anatomy atlas's own display proportions — drawn there so four zones can be told
apart on screen rather than to anatomical scale — and the scene is built on that
atlas, so the two have to agree. The lumen compression `k` was chosen so the
narrowing is visible across the span the scene walks without the channel
closing. **No volume, ratio or fraction here is a measurement of anybody.**

## 9. Visual mapping

Declared in `VISUAL_MAPPING` (`src/data/benignProstaticEnlargement.js`) and
handed out by `getVisualMapping()`. This scene is the clearest case in the
product of the three layers being different things:

- **The disease state** is that the transition zone has grown. It is all the
  reader sets.
- **The model output** is the arithmetic that follows — the two radii, the rim,
  the two fractions — and the inner and outer meshes are scaled by exactly those
  radii.
- **The exaggeration** is what the scene does on top. The channel is drawn
  several times wider than the model's proportions would make it, because at the
  atlas's scale the prostatic urethra is a hairline nobody can watch narrow.
  **The drawn calibre is not a urethral diameter**, and the declaration says so.

The peripheral zone also becomes more transparent as the model compresses it.
That is presentation of the same number, so that the inner gland growing inside
it can be seen at all.

## 10. Known failure modes

- Zones as nested solids of revolution. Real boundaries are not, and the
  peripheral zone is not a sphere with a hole in it.
- One growth factor for a process that is nodular rather than uniform even
  within the zone it is in.
- A smooth split between lateral and median patterns, which are descriptions
  rather than ends of a continuum.
- No rectum, no sphincter, no neurovascular bundle, so nothing about what an
  enlarging gland is next to besides the channel and the bladder neck.

## 11. Where it will mislead

**The axis reads as a course over time and is not one.** There is no time in the
model; the axis is how far into an enlarged gland the reader has gone, and no
position on it is a grade, a severity, or an indication for anything
(`growth-axis-is-not-a-course` in the dossier).

**A narrowing channel reads as a flow rate.** It is not one, and there is no
flow anywhere in this model. The visual mapping declaration exists for exactly
this, and the scope panel says it again.

## 12. Safety boundary

Never use the model to estimate a prostate volume, to infer a urinary flow rate
or a post-void residual, to grade or stage benign prostatic hyperplasia, to
estimate a symptom score, to distinguish benign enlargement from cancer, or to
select, time or evaluate any treatment.

## 13. Uncertainty

The zonal account and the two growth patterns are standard. What this model
cannot support is any magnitude: how much a given gland narrows its channel,
how quickly either follows the other, and what any of it produces in a person.
Every one of those is outside it, and the scope panel lists them as excluded
rather than as future work.

## 14. Evidence and review

The dossier records the zonal origin, the conserved and compressed peripheral
zone, the arithmetic between zone and gland, and the two growth patterns as the
externally supported claims, and declares the display proportions and the lumen
compression as things this repository chose. Independent clinical sign-off has
not been recorded; the public review state is `pending`.

## 15. Verification

```bash
node --test tests/prostatic-enlargement-physiology.test.js
node --test tests/prostatic-enlargement-model.test.js
node --test tests/calibration.test.js
```

The physiology tests fix the four propositions the scene teaches, including the
one that separates it from the wrong picture: the peripheral zone's volume is
identical at every position on the axis while its share of the gland falls.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene (`src/data/patientGuides.js`,
id `benign-prostatic-enlargement`). It walks the same three stages and stops
where §12 does. No step names a test, a drug, an operation or a risk, and the
steps about what a person might notice are marked `associated` and say on screen
that they are not drawn from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/prostaticEnlargement.js`. A change to it must revise this card
before its digest is adopted.
