# Model card — Hepatorenal syndrome

| | |
| --- | --- |
| **Scene** | `hepatorenal-syndrome` |
| **Model** | [`src/models/hepatorenal.js`](../../src/models/hepatorenal.js) |
| **Evidence** | [`docs/model-evidence/hepatorenal-syndrome.md`](../model-evidence/hepatorenal-syndrome.md) |
| **Tests** | [`tests/hepatorenal-physiology.test.js`](../../tests/hepatorenal-physiology.test.js) (external), [`tests/hepatorenal.test.js`](../../tests/hepatorenal.test.js) (integrity), [`tests/calibration.test.js`](../../tests/calibration.test.js) (calibration) |
| **Status** | see [`src/catalog/scenes.js`](../../src/catalog/scenes.js) |

## 1. What question this model answers

**If the kidney in hepatorenal syndrome is structurally near-normal, and
recovers when it is transplanted into somebody else, what is actually stopping
it from filtering?**

## 2. What it is

An educational conceptual model of two organs and the circulation between them,
solved together for one unknown — the mean arterial pressure.

The liver half is the existing portal circulation model, imported rather than
restated. The systemic half is two vascular beds in parallel and a cardiac
response that is deliberately incomplete. The renal half is a glomerulus with an
arteriole either side of it and a Starling balance across it.

The chain runs: portal hypertension dilates the splanchnic arterioles → a large
low-resistance bed in parallel lowers systemic vascular resistance → the heart
raises its output but not by enough, so arterial pressure falls → the fall
activates the vasoconstrictor systems → they constrict every bed that will
respond, and the splanchnic bed will not, so the kidney takes it → the afferent
arteriole dilates to defend renal blood flow until it has no room left, and past
that point the renal circulation is pressure-dependent.

The loop closes: the constriction raises the pressure the splanchnic bed is
perfused at, so nothing is evaluated in order — it is solved.

**The kidney is normal, and that is a structural property of the code, not a
tuning.** Nothing in the renal part of the model damages anything. The
ultrafiltration coefficient, Bowman's pressure and the oncotic pressure are
constants; the only things that move are two arteriolar resistances, driven by a
signal that arrives from outside. `kidneyWithoutTheSignal` re-solves the same
kidney at the same pressure with the signal removed, and an external test
asserts that it restores renal perfusion at every severity. It is the model's
stand-in for what a transplanted kidney does in a normal recipient.

## 3. What it is not

Not a patient simulator. Not a research solver. Not validated against measured
data. Not a diagnostic aid, and specifically not able to make the distinction
that matters most at the bedside — see §11 and §12.

## 4. Inputs

| Control | Range | What it is |
| --- | --- | --- |
| `structuralResistance` | 1–12 | Intrahepatic resistance from fibrosis and nodules. 1 is a healthy liver. |
| `splanchnicVasodilation` | 0–1 | Arteriolar vasodilation, splanchnic and systemic together. |
| `collateralPropensity` | 0–1 | How readily portosystemic collaterals form. |
| `terlipressin` | 0–1 | A splanchnic vasoconstrictor. Subtracts from the vasodilation and does nothing else. |
| `albumin` | 0–1 | Plasma volume expansion. Raises cardiac output at a given resistance. |
| `prostaglandinInhibition` | 0–1 | A non-steroidal anti-inflammatory. Removes the afferent arteriole's local shield. |
| `cardiacReserve` | 0–1 | How much of the heart's response to a fallen resistance is intact. Cirrhotic cardiomyopathy lowers it. |

## 5. Outputs

Portal pressure and gradient, splanchnic inflow, collateral flow (from the
portal model); mean arterial pressure, cardiac output, systemic vascular
resistance, the splanchnic share of the output; arterial underfilling, the
perfusion pressure deficit and the vasoconstrictor index; afferent and efferent
resistance, renal blood flow and plasma flow, glomerular pressure, net
filtration pressure, ultrafiltration coefficient, GFR, filtration fraction,
whether autoregulation is holding, and how much dilating room is left.

## 6. State variables

One: the mean arterial pressure. Everything else is a function of it, including
the splanchnic inflow that helps determine it, which is why it is solved to a
fixed point rather than evaluated.

## 7. Governing relations

- `ΔP = Q · R` on every path.
- Conductances in parallel add.
- `CO = CO_ref · (SVR_ref / SVR)^α`, `0 < α < 1` — an invented functional form.
- `activation = deficit / (deficit + half)` — an invented curve over an invented
  index.
- `GFR = Kf · (P_glomerular − P_Bowman − π)` — the Starling relation.
- Autoregulation as a band: the afferent arteriole takes whatever resistance
  holds renal blood flow at reference, clamped between a floor and a ceiling
  that the vasoconstrictor signal shifts upward together.

## 8. Constants and where they came from

Two kinds only, and the registry says which for each.

**Reference values, used as calibration targets.** Renal blood flow
1100 mL/min, GFR 120 mL/min, glomerular pressure 50 mmHg, Bowman 12 mmHg,
oncotic 28 mmHg, mean arterial pressure 90 mmHg, cardiac output 5 L/min,
haematocrit 0.45. Standard physiology. The afferent and efferent resistances,
the ultrafiltration coefficient and the systemic vascular resistance are all
*computed from* these rather than written down.

**Invented constants.** The cardiac compensation exponent, the activation
half-deficit, the systemic limb of the vasodilation, the four constrictor gains,
the width of the autoregulatory band, and both treatment effect sizes. None has
a source. All are marked `illustrative` or `approximation` in the registry and
all are checked in the calibration layer.

## 9. Calibration vs measurement

There is no measured arteriolar resistance in this model, because no such
measurement exists for a person. The healthy state is exact by construction —
that is what the anchors buy — and it says nothing about how far from it any
particular patient sits.

The severity at which the knee falls is a consequence of the invented gains and
is **not a prediction**. Nothing in this model gives a creatinine, a stage, a
response rate, or a prognosis.

## 10. What is exaggerated for visibility, and what is not

Nothing in the model. The scene may change lighting, colour, opacity, camera and
the size of the arteriolar lumens it draws; the arteriolar lumens are drawn to a
presentation scale, and the read-out beside them is the model's own resistance.
No clinical parameter is altered for visual effect.

## 11. Known failure modes

**Filtration rises slightly above normal early on.** Efferent constriction acts
while the afferent arteriole is still shielded. Glomerular hyperfiltration is
described in compensated cirrhosis, but this was not calibrated to it and the
size is not a prediction. It is left in rather than tuned away, because removing
it would mean weakening one of the two mechanisms that make the later trajectory
right. It is also why the external test asserts restored *perfusion* at every
severity and restored *filtration* only past the failure of autoregulation.

**Volume expansion has no ceiling.** Enough albumin drives cardiac output and
arterial pressure above normal, and the model will show that improving renal
function. In a patient it causes pulmonary oedema. There is no venous
compliance, no pulmonary circulation and no Starling curve for the heart.

**There is no tubule.** No sodium handling, no urine output, no ascites, no
dilutional hyponatraemia, no diuretic response.

**There is no time.** An equilibrium. It cannot show the syndrome developing
over days, and it cannot distinguish an acute course from a chronic one.

**There is no heart.** A single exponent stands in for systolic and diastolic
function, rate and contractility at once.

**Filtration pressure equilibrium cannot occur**, because the oncotic pressure
is a single mean value rather than one that rises along the capillary.

## 12. What it must never be used for

Diagnosis, staging, or any bedside decision. In particular it **cannot
distinguish hepatorenal syndrome from prerenal azotaemia or from acute tubular
necrosis**, which is the distinction the diagnosis actually turns on. The real
criteria include the absence of shock, of nephrotoxins and of structural kidney
disease, and a failure to respond to volume expansion; none of that is in here.

The vasoconstrictor index must never be displayed as a concentration or an
activity. It has no units. No dose, duration or response rate may be read off
the treatment controls.

## 13. Uncertainty

Three entries in the registry are marked `uncertain` and are listed in §11.
Three more are marked `approximation`: the mean oncotic pressure, the lumped
efferent resistance, and autoregulation as a band rather than a mechanism.

## 14. Where the model could mislead

**It makes the functional nature of the syndrome look like a finding.** It is a
design decision — the model has no way to represent structural damage, so it
could not have discovered this. The evidence dossier says so and the external
test is written to state it as a property of the construction.

**It makes the treatment look more reliable than it is.** Both arms work every
time here, with no non-responders, no ceiling and no adverse effects. Terlipressin
in particular has real ischaemic complications that this model has no
representation of at all.

**It shows a single severity axis** along which scarring and vasodilation move
together. In a patient they do not, and the model lets them be separated —
but the scene's own progression moves them together, which is a simplification
of the course rather than a claim about it.

## 15. Review status

Not clinically reviewed. This scene is a candidate for `alpha` and must not be
promoted past it without one.

## 16. How to check it

```bash
node --test tests/hepatorenal-physiology.test.js   # external — a failure here means the physiology was violated
node --test tests/hepatorenal.test.js              # integrity — a failure here means the code is broken
node --test tests/calibration.test.js              # calibration — a failure here means a constant moved
```
