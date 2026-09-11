# Evidence — lobar collapse: where the volume went

Model: [`src/models/lobarCollapse.js`](../../src/models/lobarCollapse.js).
Boundary and failure modes: [`../model-cards/lobar-collapse.md`](../model-cards/lobar-collapse.md).
Machine-readable registry: `LOBAR_COLLAPSE_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a **conservation** account of one lobe losing its air.
**Nothing here is a measurement, a radiograph, a sign or a gas exchange**, and
in particular the distance the midline moves **is not a mediastinal shift**. No
row rests on a paper this repository could open: the build environment cannot
reach the medical publishers, so nothing was extracted from a figure or a table
by its author.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `the-gas-is-absorbed-and-not-replaced` — an obstructed lobe absorbs the gas already in it and is not refilled, so it **loses volume** rather than becoming denser in place | Standard descriptions of resorption atelectasis, with loss of volume as its defining feature | `lost = share · absorbed · (1 − RESIDUAL)`, and the scene scales the lobe by the cube root of what is left | One lobe, absorbing evenly, with no time in it | `physiology: a collapsed lobe loses volume rather than keeping it` |
| `the-room-is-accounted-for` — the room it vacates is taken: the remaining lobes of that lung expand into it, and the rest is taken by the hemithorax getting smaller. A chest does not acquire a space | Standard descriptions of compensatory expansion and of displacement of adjacent structures towards a collapsed lobe | `taken + shifted = lost`, with the remaining lobes gaining in proportion to their own shares | Two destinations and no others — no diaphragm, no chest wall, no rib crowding | `physiology: the room the lobe vacates is accounted for, all of it` |
| `towards-the-side-it-happened-on` — the structures at the middle are drawn towards the collapsed side, and the direction belongs to which bronchus rather than to how much | Standard descriptions of mediastinal displacement towards the affected side | `shiftTowards` is the blocked lobe's own side; the magnitude is `shifted / MIDLINE_FACE` | The midline as one thing that moves rigidly | `physiology: the middle is drawn towards the side the collapse is on` |
| `collapse-is-not-consolidation` — consolidation keeps the lobe's volume and draws nothing towards it; collapse loses volume and draws everything towards it. **Alike on density, opposite on volume** | Standard descriptions of consolidation as a volume-preserving airspace-filling process against collapse as a volume-losing one | The scene changes scale and never opacity, and a model test fails if the lobe fades instead of shrinking | — | `physiology: a collapsed lobe loses volume rather than keeping it` |
| `the-other-side-takes-none-of-it` — compensation happens within one hemithorax. **thin** — the other lung is unchanged *by this model*, which is not a claim that it is unaffected in a person | A consequence of two pleural cavities with the mediastinum between them; compensatory expansion is described as ipsilateral | Only lobes on the blocked side are offered any of the vacated room | — | `physiology: the other lung takes none of it` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `atlas-lobe-shares` | Each lobe's share of its own side, from which every volume here is computed | Illustrative. The model **inherits** `LOBE_VOLUME_SHARES` from the respiratory atlas rather than asserting it; that table's own provenance and its open question are recorded there and in `docs/medical-notes.md`. Every lobe is reported against its own resting volume rather than in any absolute unit |
| `how-the-room-divides` | How much of the vacated room the rest of the lung takes, against how much the hemithorax takes | Calibrated so that both halves of the answer are legible at once: at one, nothing at the midline would move and the claim would be invisible; at zero, no lobe would expand and the claim would be half-told. **Not a measured proportion** — a real chest divides it differently case to case, and the model claims only that the two together are all of it |
| `the-face-the-shift-is-spread-over` | The area the hemithorax's share is spread over to become a distance | Illustrative, and chosen so the gap between the two midline bars is legible; the first value put a whole lower lobe at seven pixels. **It is not a tracheal deviation, not a mediastinal shift anybody measured, and not millimetres** |
| `a-residual-so-there-is-something-to-point-at` | What is left of a lobe that has lost all the air this model lets it lose | Illustrative, and chosen away from zero: a lobe collapsed to nothing would be a lobe the scene had deleted, with no shape left to label. Nothing in the model says how airless a lobe can actually become |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `nothing-here-is-gas-exchange` | A lobe drawn airless reads as a person who is short of breath | **Uncertain, and outside the model.** There is no oxygen, no shunt, no saturation, no blood flow and no hypoxic vasoconstriction here. The model computes a volume and stops |
| `the-expansion-has-no-shape` | Lobes drawn evenly larger read as a claim about how a lung expands | The proportional division is a default, not a finding. A real lung does not expand evenly, and nothing here says where in a lobe the expansion goes |
| `six-arrangements-are-not-six-degrees` | Six bronchi in a list read as six degrees of one illness | A blockage does not move from one bronchus to another. The axis underneath them is how much of one lobe's air has gone, not how far along anybody is |

## 4. What is outside the model entirely

- **All gas exchange**: oxygen, shunt, saturation, blood flow, hypoxic
  vasoconstriction.
- The cause: tumour, mucus plug, foreign body, aspiration, anything
  post-operative.
- Time, rate, recovery and re-expansion; the breathing cycle itself.
- **Every sign, grade and image.** This model does not grade collapse and does
  not read a chest radiograph.
- Symptoms, auscultation, and every treatment.

## 5. How to check it

```bash
node --test tests/lobar-collapse-physiology.test.js  # Layer 1: the five propositions
node --test tests/lobar-collapse-model.test.js       # integrity: the drawing against the model
node --test tests/calibration.test.js                # the four things this repository chose
```
