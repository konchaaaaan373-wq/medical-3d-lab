# Model card — pulmonary oedema: where the water goes

| | |
| --- | --- |
| Scene | `#/pulmonary-edema` |
| Model | [`src/models/pulmonaryEdema.js`](../../src/models/pulmonaryEdema.js) |
| Evidence | [`../model-evidence/pulmonary-edema.md`](../model-evidence/pulmonary-edema.md) |
| Catalogue status | `alpha` |
| Clinical review | **none** |

## 1. What question this model answers

Above what pressure does water start to cross into the lung, which space does it
fill first, and why does the same pressure flood one lung and not another?

## 2. What it is

One Starling equation across the pulmonary capillary, and three buffers that
oppose it: interstitial hydrostatic pressure rising from a subatmospheric
value, lymphatic clearance rising towards a ceiling, and interstitial protein
being washed down as the flux rises. Water that the buffers do not absorb
accumulates, first in the interstitium and then — once that space is full — in
alveoli. A flooded alveolus is perfused and unventilated, so the flooded
fraction is a shunt, and the arterial gas follows from it.

The model can be read two ways from the same equations: `solveSteadyState()`
gives the equilibrium a set of controls implies, and
`createPulmonaryEdemaModel()` integrates towards it so that *how fast* is
visible as well as *how far*.

## 3. What it is not

An educational conceptual model. Not a patient simulator, not a research
solver, not validated against measured data. It is built so that the direction
and the reason for a change are right, and deliberately not built to predict a
number for a person.

## 4. Inputs

| Control | Unit | Range the scene offers | What it means |
| --- | --- | --- | --- |
| `leftAtrialPressureMmHg` | mmHg | 4–40 | The pressure a wedge estimates |
| `plasmaOncoticPressureMmHg` | mmHg | 8–34 | Falls with albumin |
| `permeability` | × normal | 1–6 | Barrier injury; raises Kf and lowers σ together |
| `chronicity` | 0–1 | 0–1 | How adapted the lymphatics are. An adaptation, not a severity |
| `pulmonaryFlowLPerMin` | L/min | 2–20 | Cardiac output; rest is 5 |
| `inspiredOxygenFraction` | — | 0.21–1.0 | What is being breathed |

## 5. Outputs

Capillary and interstitial hydrostatic pressures, interstitial oncotic
pressure, filtration and lymphatic clearance (mL/h), net accumulation,
extravascular lung water split into interstitial and alveolar, flooded
fraction, shunt fraction, alveolar and arterial oxygen tension, arterial
saturation, and the alveolar-to-arterial difference. Also
`floodingThresholdMmHg()`, which searches for the atrial pressure at which this
particular lung would begin to flood.

## 6. State variables

One: extravascular lung water, in mL. Everything else is a function of it and
the controls, which is why the steady state and the transient can be read the
same way.

## 7. Governing relations

```text
Pc  = Pla + Rven·(Q/Qref)
Pi  = Pi,dry + ΔPi·(1 − exp(−(V − V0)/Vknee))
πi  = floor + (πi,dry − floor)·(Jbase/max(Jbase, J)),  πi,dry ∝ πc
J   = Kf·[(Pc − Pi) − σ(πc − πi)]            solved in closed form for J
L   = min(ceiling(chronicity), Lbase + g·(V − V0))
dV/dt = J − L
flooded    = clamp((V − Vflood)·k, 0, 1)
shunt      = anatomical + flooded·(1 − diversion)·(1 − anatomical)
Ca         = Cc − shunt·C(a−v)/(1 − shunt)
```

`J` appears on both sides through the washout, so it is solved as the positive
root of `J² − AJ − B = 0` rather than iterated. This is not a performance
choice — see §11.

## 8. Constants and where they came from

Textbook central values for an adult, not measurements from a person: plasma
colloid osmotic pressure 28 mmHg, interstitial 12 mmHg at baseline, dry
interstitial hydrostatic pressure −8 mmHg, reflection coefficient 0.9, baseline
pulmonary lymph flow 20 mL/h, haemoglobin 14 g/dL. Sources and their limits are
in the evidence dossier §1.

## 9. Calibration vs measurement

**The filtration coefficient is not a measurement.** It was solved backwards
from the requirement that a resting lung filters at its own lymph flow. The
lymphatic ceilings and the interstitial compliance curve are **invented**; they
were chosen for the gap between an adapted and an unadapted lung and for the
range of extravascular lung water the model reports, not measured. The flooding
threshold is neither: it is searched for, and it moves when any of the six
controls moves. Dossier §2 lists all five.

## 10. What is exaggerated for visibility, and what is not

**Time is.** `minutesPerSecond` in the model scales the clock so that hours of
accumulation are watchable, and it is the only presentation value in the model
layer. It scales the clock and nothing else: every pressure, flux and volume
reported belongs to the physiological time that has passed, not to the wall
clock.

**Nothing else is.** Pressures, volumes, fluxes and gas are reported as solved.
The scene's opacities, colours and particle rates are presentation and live in
the scene.

## 11. Known failure modes

1. **The washout feedback used to oscillate.** πi depends on the flux and the
   flux depends on πi. Solved by three passes of fixed-point iteration, it did
   not converge — the feedback is as large as the driving pressure it acts on —
   and the solved lung water *fell* as the atrial pressure rose from 20 to 22
   mmHg. The model was reporting a lung that got better as it was loaded, and
   nothing in the equations looked wrong. It is now solved in closed form and
   `tests/pulmonary-edema-model.test.js` holds monotonicity across the range.
2. **Past the threshold there is no equilibrium.** Once alveoli begin to fill,
   the buffers are spent and nothing restores balance, so the lung runs to its
   ceiling. That is the physiology — decompensated oedema is an emergency, not
   a state — but it means the steady state is a *cliff*: 23.5 mmHg settles, 24.5
   mmHg drowns. `balanced: false` marks it. A reader who moves the slider in
   large steps will see nothing between "wet" and "full".
3. **Hypoalbuminaemia is buffered by a fixed ratio.** Interstitial protein
   tracks plasma protein instantly here. Real equilibration takes time, so an
   *acute* fall in plasma albumin is less well protected than this model says.
4. **`floodingThresholdMmHg()` returns `null` in two different situations** — a
   lung that floods at every pressure and one that floods at none. A caller
   that treats `null` as "safe" has it backwards half the time.
5. **The alveolar/interstitial split is a hard threshold.** Real alveolar
   flooding begins regionally and gradually. The scene's picture of a clean
   boundary between "interstitial oedema" and "alveolar oedema" is sharper than
   the disease.

## 12. What it must never be used for

Deciding anything about a person. It cannot estimate a wedge pressure, cannot
say whether a particular patient will flood, cannot be used to titrate fluid,
diuretic or oxygen, and cannot distinguish cardiogenic from non-cardiogenic
oedema in a real case — it can only show why the distinction exists.

## 13. Uncertainty

The directions in dossier §1 are textbook and the model reproduces them. Every
*magnitude* is either a calibration or an invention. The threshold in the
mid-twenties is the conventional teaching figure and individual thresholds vary
widely; the model has no way to represent that variation and does not claim to.

## 14. Where the model could mislead

1. **The lung fills evenly, and real oedema is basal.** There is no gravity in
   this model. The scene draws water appearing uniformly, and a reader who
   takes that as the *distribution* oedema takes will not recognise the
   radiograph. This is the largest single gap between the picture and the
   disease, and it is a property of the model rather than of the drawing.
2. **Nothing here is breathless.** The model has no ventilation, so the scene
   can show a lung with 900 mL of water in it and say nothing about the symptom
   that would have brought the patient in. A reader may conclude that oedema is
   an oxygenation problem, when the presenting problem is usually work of
   breathing, and hypoxaemia comes later.
3. **The threshold looks like a number.** Because the model reports a specific
   pressure and moves it when the controls move, it invites being read as *the*
   threshold. It is this model's threshold for this reference lung. A clinical
   reviewer should be asked whether reporting it at all is wise, or whether it
   should be shown only as a comparison between two lungs.

## 15. Review status

**Catalog status:** `alpha`

**Not reviewed by a clinician.** The catalogue status is `alpha`, which under
[`../adding-a-scene.md`](../adding-a-scene.md) §8 means a model layer,
evidence, this card and a scope panel exist and the promotion gate to
`reviewed` has not been attempted. The three items in §14 are the questions to
put to a reviewer first.

## 16. How to check it

```bash
npm test
node --test tests/respiratory-physiology.test.js
node --test tests/calibration.test.js
node --test tests/pulmonary-edema-model.test.js
```

The physiology file is the one that matters: a failure there means the model
has broken a constraint the literature imposes, not that an implementation
detail moved.

---

## 17. Revision history

**Revision 3.** No medical change. Three of the scene's surfaces were built to
contracts they did not match, and are rebuilt to the real ones: the chart is
declared where the other scenes declare theirs (it had been written as an array
and returned to nobody), the walk-through uses the fields its panel writes into,
and the lessons use the shape their panel drives. The last stage moves from 0.88
to 1 so the progression axis ends where its final stage does. The revision gate
covers `src/data/pulmonaryEdema.js`, which holds this scene's presentation copy
alongside its stage definitions, so a change to either raises it.

One wording correction that *is* about the model: a lesson opened "this lung has
water in a third of its alveoli". Alveolar flooding in this model switches at a
threshold rather than filling gradually — §10 — so a third is a state it cannot
produce, and the lesson now says only that the alveoli have water in them.

**Revision 2.** Situations restructured so each declares its own endpoint, after
the progression slider was found to move nothing in the default situation.

**Revision 1.** First card, with the model.
