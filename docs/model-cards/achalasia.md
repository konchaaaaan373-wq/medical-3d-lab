# Model card — achalasia: a wave that stops and a ring that does not open

| | |
| --- | --- |
| **Scene ID** | `achalasia` |
| **Route** | `#/achalasia` |
| **Model** | [`src/models/achalasia.js`](../../src/models/achalasia.js) |
| **Evidence** | [`../model-evidence/achalasia.md`](../model-evidence/achalasia.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

A swallow needs a wave to carry it and a ring that lets go. When both fail,
where does what was swallowed end up — and what settles the answer?

## 2. Model type

A deterministic swallow model, run to a balance. One swallow delivers a bolus;
what leaves through the sphincter during the window it is open is set by the
pressure difference across it. Swallows are run until what leaves matches what
arrives. **The balance is found by running them, not stated** — the same shape
the COPD scene uses for dynamic hyperinflation.

## 3. What it is not

It is not manometry, a cause, a diagnosis or a treatment model. It contains no
nerve and no ganglion cell, no regurgitation, aspiration, chest pain, weight,
nutrition or long-term risk. It has no real time in it: the number of swallows
is not a number of days.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `relaxationFailure` | 0–1 | How completely the ring fails to let go. 0 relaxes fully |
| `peristalticVigour` | 0–1 | How well the wave propagates and how hard it pushes |
| `swallowVolumeMl` | 2–15 | What one swallow delivers |

The scene's **axis moves the first two together**, because one loss produces
both. The mapping is deliberately non-linear; see §11 and §13.

## 5. Outputs

- What the last swallow got through, as a fraction of what it delivered
- The retained volume at the balance, its height, and the pressure it exerts
- The pressure behind the bolus, and the ring's pressure during the window
- How far the wave travels, as a fraction of the oesophagus
- **Whether a balance exists inside the oesophagus at all**

## 6. State variables

None over time in the sense of a clock. `solveAchalasia()` iterates swallows to
a tolerance and returns the fixed point, plus the first few dozen swallows so
the filling can be watched rather than stated.

## 7. Governing relations

```text
P(drive)  = P(column) + vigour · P(wave)
P(column) = ρg · (retained / area)
P(ring)   = restingTone · relaxationFailure
G(ring)   = G₀ · (residue + (1 − residue)·(1 − relaxationFailure))
out       = G(ring) · window · max(0, P(drive) − P(ring))
```

Iterated until `out` matches the bolus, and capped at the volume a column the
height of the oesophagus would occupy.

## 8. Constants and calibration

Resting sphincter tone and peristaltic amplitude are textbook central values.
The conductance across the ring and the cross-section a column stands in are
numbers this repository chose so that a normal swallow clears with room to spare
and a failed one balances inside a human oesophagus. **None is a measurement and
no figure the model reports is a threshold.**

## 9. Visual mapping

Declared in `VISUAL_MAPPING` (`src/data/achalasia.js`) and handed out by
`getVisualMapping()`:

- The tube is **drawn wider** below the top of the retained column as the
  volume the model settles on rises. **The drawn width is not an oesophageal
  diameter** — the model solves a volume and a height and has no calibre in it.
- A narrowing travels from the throat towards the ring and **stops where the
  model says the wave stops**. How far it gets is the model's; the depth of the
  indentation is drawn to be visible and is not a pressure.
- The ring opens during the swallow window by as much as the model says it
  relaxes. The drawn aperture is not a lumen.

## 10. Known failure modes

- One wave shape for every vigour, and one lumped conductance for the ring.
- A fixed cross-section for a tube that in reality dilates as it fills.
- Upright only: no thoracic pressure swings, no posture, no gravity switch.
- One bolus per swallow, and no swallow frequency.

## 11. Where it will mislead

**The axis moves two failures at once and is not linear.** A reader dragging it
is not watching a patient progress and is not watching the two failures in any
real proportion. Both are controls of their own precisely so the pairing can be
taken apart, and the scope panel says so.

**The oesophagus widens on screen and the model has no diameter in it.** That is
the other likely misreading, and the visual mapping declaration exists for it.

## 12. Safety boundary

Never use the model to diagnose achalasia or any motility disorder, to classify
one, to infer a manometric value, to predict regurgitation, aspiration or
nutritional consequences, or to choose or time any intervention.

## 13. Uncertainty

That one loss produces both failures is the standard account. How they progress
relative to each other in a person is not something this model represents, and
its axis asserts a pairing that is a presentation decision rather than a finding
(`axis-moves-both` in the dossier).

## 14. Evidence and review

The dossier records what a swallow needs and what a column is worth as the
externally supported claims, and declares the conductance, the cross-section and
the axis mapping as things this repository chose. Independent clinical sign-off
has not been recorded; the public review state is `pending`.

## 15. Verification

```bash
node --test tests/achalasia-physiology.test.js
node --test tests/achalasia-model.test.js
node --test tests/calibration.test.js
```

The physiology tests fix the propositions the scene teaches, including the two
that separate this from a single-failure story: a tight ring with a good wave
and a relaxed ring with no wave behave differently, and neither is the pair.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene (`src/data/patientGuides.js`,
id `achalasia`). It walks the same three stages and stops where §12 does. No step
names a cause, a test, an operation or a risk, and the steps about what a person
might notice are marked `associated` and say on screen that they are not drawn
from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/achalasia.js`. A change to it must revise this card before its
digest is adopted.
