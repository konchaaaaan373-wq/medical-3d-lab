# Evidence — achalasia: a wave that stops and a ring that does not open

Model: [`src/models/achalasia.js`](../../src/models/achalasia.js).
Boundary and failure modes: [`../model-cards/achalasia.md`](../model-cards/achalasia.md).
Machine-readable registry: `ACHALASIA_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a qualitative account of oesophageal transport. **Nothing
here is manometry.** No value the model reports is an integrated relaxation
pressure, a classification subtype or a measured tracing, and no figure is a
threshold. No row rests on a paper this repository could open: the build
environment cannot reach the medical publishers, so nothing was extracted from a
figure or a table by its author.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `swallow-needs-both` — a swallow needs a wave to carry it and a ring that relaxes as it arrives; achalasia is the loss of both | Standard physiology of deglutition; standard descriptions of achalasia | Two independent controls, and what leaves is set by `wave − sphincter` | One wave, one ring, one bolus per swallow | `physiology: a swallow gets through when the wave outpushes the ring, and not otherwise` |
| `relaxation-opens-as-well-as-lowers` — a relaxed sphincter is a wider way through as well as a lower pressure to beat | Standard physiology of sphincter relaxation. **thin** — the direction is textbook; how much conductance relaxation gives back is a calibration | Conductance scales with `1 − relaxationFailure` down to a small residue | A single lumped conductance; no geometry | `physiology: a swallow gets through when the wave outpushes the ring, and not otherwise` |
| `column-supplies-pressure` — a column of retained fluid weighs on what is below it, so what collects takes over the pushing | Hydrostatics: ρgh at the base of a column | `drive = columnPressure(retained) + vigour × wave` | A vertical column of uniform cross-section | `physiology: what is retained supplies pressure of its own` |
| `column-has-a-ceiling` — a column the height of the whole oesophagus is worth about sixteen millimetres of mercury, less than the ring holds at rest | Hydrostatics against a textbook resting tone of some tens of mmHg. 22 cm of water ≈ 16 mmHg | Retention is capped at `CAPACITY_ML` and `balanced` reports the failure honestly | Upright; no thoracic pressure swings | `physiology: the column cannot be taller than the organ, so the balance has a limit` |
| `feeble-wave-stops-travelling` — a failing wave stops propagating rather than pushing gently | Standard descriptions of failed and fragmented peristalsis. **thin** — that it fails to traverse is textbook; the shape of the reach with vigour is this model's | `waveAt()` returns a reach of `0.18 + 0.82 × vigour` | One wave shape for every vigour | `physiology: a feeble wave stops travelling rather than pushing gently` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `swallow-conductance` | What the ring passes per mmHg during the window, and what is left of that when it does not let go | Calibrated so that a normal swallow clears with room to spare and a failed one balances inside a human oesophagus. Not a sphincter, not an aperture, not anybody |
| `column-cross-section` | The cross-section a retained column is taken to stand in | Illustrative. A single number standing for a tube that in reality dilates as it fills. The oesophagus widening on screen is a volume the model solved, not a calibre it computed |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `axis-moves-both` | The scene's axis moves the two failures together, through a deliberately non-linear mapping that puts the band a column can balance across the middle of its travel | A reader dragging the axis is not watching a patient progress, and is not watching the two failures in any real proportion. Each is a control of its own precisely so that the pairing can be taken apart, and the scope panel says so |

## 4. What is outside the model entirely

- **No cause.** The model has a ring that does not let go and a wave that does
  not propagate. It has no nerve, no ganglion cell and no reason.
- **No manometry.** Nothing in it is a tracing, a subtype or a diagnostic value.
- **No regurgitation, aspiration, chest pain, weight, nutrition or long-term
  risk of any kind**, and no treatment.
- **No real time.** The balance is found by running swallows until nothing
  changes. The number of swallows is not a number of days.

## 5. How to check it

```bash
node --test tests/achalasia-physiology.test.js  # Layer 1: the physiology
node --test tests/achalasia-model.test.js       # integrity, and the scene's axis mapping
node --test tests/calibration.test.js           # the two numbers this repository chose
```
