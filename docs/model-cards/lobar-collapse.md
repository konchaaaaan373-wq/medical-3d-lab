# Model card — lobar collapse: where the volume went

| | |
| --- | --- |
| **Scene ID** | `lobar-collapse` |
| **Route** | `#/lobar-collapse` |
| **Model** | [`src/models/lobarCollapse.js`](../../src/models/lobarCollapse.js) |
| **Evidence** | [`../model-evidence/lobar-collapse.md`](../model-evidence/lobar-collapse.md) |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

When a lobe loses its air, where does the room it was occupying go?

## 2. Model type

A conservation model, solved in closed form, over the lung atlas's five lobes. A
chosen bronchus names the lobe that loses its air; the volume it vacates is
divided between the remaining lobes of the same lung and the hemithorax itself;
and the hemithorax's share becomes the distance the midline is drawn across.

**The three amounts add up, and that is the only thing the model asserts.** The
bronchus is a **scenario and not a severity**: six arrangements, and a blockage
does not travel from one to the next.

## 3. What it is not

**It contains no gas exchange of any kind** — no oxygen, no shunt, no
saturation, no blood flow, no hypoxic vasoconstriction. A collapsed lobe here is
a volume, and nothing in this model says what anybody's blood is doing. It also
contains no cause (no tumour, mucus plug, foreign body, aspiration or
post-operative anything), no time, no rate, no recovery, no breathing cycle, no
symptom, no auscultation and no treatment. **It does not grade collapse and it
does not read a chest radiograph.**

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `bronchus` | one of six | Which bronchus is blocked, or none |
| `absorbed` | 0–1 | How much of that lobe's air has gone |

## 5. Outputs

- Each lobe's volume, **against its own resting volume**
- Which lobe has collapsed, which have expanded, and which are on the other side
- The three amounts the claim is made of: what was vacated, what the rest took,
  what the hemithorax took — in shares of one lung
- How far the midline is drawn across, and towards which side

## 6. State variables

None. `solveLobarCollapse()` is a pure function of the axis and one control.

## 7. Governing relations

```text
lost        = share(blocked) · absorbed · (1 − RESIDUAL)
taken       = lost · TAKEN_BY_REST
shifted     = lost − taken
volume(lobe)= share + taken · share / Σ(share of the rest)
shift       = shifted / MIDLINE_FACE
```

Shares are **per side**, so each lung's lobes sum to one. The remaining lobes
take the room in proportion to what each already had, which is the only division
this model has any basis for.

## 8. Constants and calibration

Four, and none is a measurement. The lobe shares are the respiratory atlas's
own, copied rather than imported because a model may not import `three`; a
calibration test fails if the copy drifts. The residual was chosen away from
zero so there is a shape left to point at. The split between the two
destinations and the face the shift is spread over were both chosen so that
**both halves of the answer are legible at once** — a test fixes that, rather
than fixing either number.

## 9. Visual mapping

- **What changes about the lobe is its size, not its shade.** Every other way of
  drawing a collapsed lobe is a way of drawing density, and every one of them
  draws the picture consolidation draws. A model test fails if the lobe fades
  instead of shrinking.
- Volume goes as the cube of the scale, so the scale is the cube root of the
  model's ratio and the drawn volume is the model's rather than a likeness.
- A lobe is scaled about **its own centre**, so a shrinking lobe stays where it
  is instead of sliding towards the middle of the lung.
- **The midline is drawn twice**: one bar stays where it began and one carries
  the model's distance. The claim is the gap between them, because a third of a
  unit is a distance a reader has no reference for. This is the same answer the
  hip and the shoulder arrived at — when the model's answer is a displacement,
  draw the space it opened.
- Colour says **which lobe is which**, never how airless one is: the collapsed
  lobe's colour is the same at every point on the axis.
- The blockage is a marker at the collapsed lobe. **It has no size and is not a
  thing** — not a tumour, a plug or a foreign body — and this scene has no
  bronchial tree fine enough to put it on a named lobar bronchus.

## 10. Known failure modes

- Two destinations for the vacated room and no others: no diaphragm rising, no
  chest wall moving in, no rib crowding.
- The remaining lobes expand evenly and in proportion to what they had. A real
  lung does neither.
- A lobe absorbs its air evenly, all over, with no time in it.
- The midline is one thing that moves rigidly.
- Only one bronchus at a time, and only lobar ones.

## 11. Where it will mislead

**A lobe drawn airless reads as a person who is short of breath.** Nothing here
supports that. The model computes a volume and stops; whether a collapsed lobe
matters to somebody's oxygen depends on everything this model left out.

**The distance the midline moves looks like a measurement and is not.** It is a
volume spread over a face this repository chose so the gap would be legible. It
is not a tracheal deviation and not a mediastinal shift anybody measured.

## 12. Safety boundary

Never use the model to grade collapse, to read or reproduce a chest radiograph,
to estimate a mediastinal shift, a lobe volume or any dimension, to infer
oxygenation or breathlessness from a volume, to decide which bronchus is blocked
in anybody, to infer the cause of an obstruction, or to decide whether, when or
how anything should be treated.

## 13. Uncertainty

The direction of the story is standard: gas absorbed distal to an obstructed
bronchus, volume lost, the remaining lobes expanding, the midline drawn towards
the affected side, and consolidation being the volume-preserving opposite. What
this model cannot support is any magnitude — how much a given lobe collapses,
how far a given midline moves, and how the room actually divides in a person.

## 14. Evidence and review

The dossier records the absorption of gas, the accounting for the vacated room,
the direction of the shift, the contrast with consolidation and the ipsilateral
nature of compensation as the externally supported claims, and declares the
atlas's shares, the split between destinations, the face the shift is spread
over and the residual as things this repository chose. Independent clinical
sign-off has not been recorded; the public review state is `pending`.

## 15. Verification

```bash
node --test tests/lobar-collapse-physiology.test.js
node --test tests/lobar-collapse-model.test.js
node --test tests/calibration.test.js
```

One model test fails if the collapsing lobe changes opacity rather than size,
because that single substitution would turn this scene into a drawing of
consolidation without changing a word of the copy.

## 16. Who it is said to, and where it stops

There is a patient-facing explanation of this scene (`src/data/patientGuides.js`,
id `lobar-collapse`). It walks the same three stages and stops where §12 does. No
step names a test, a procedure or a risk, no step says anything about oxygen or
breathlessness, and the step about what a person might notice is marked
`associated` and says on screen that it is not drawn from the model.

## 17. Revision identity

`docs/model-cards/revisions.json` binds this card to
`src/models/lobarCollapse.js`. A change to it must revise this card before its
digest is adopted.
