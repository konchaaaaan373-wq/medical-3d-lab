# Model card — Hepatorenal syndrome

| | |
| --- | --- |
| **Scene** | `hepatorenal-syndrome` |
| **Model** | [`src/models/hepatorenal.js`](../../src/models/hepatorenal.js) |
| **Evidence** | [`docs/model-evidence/hepatorenal-syndrome.md`](../model-evidence/hepatorenal-syndrome.md) |
| **Tests** | [`tests/hepatorenal-physiology.test.js`](../../tests/hepatorenal-physiology.test.js) (external), [`tests/hepatorenal.test.js`](../../tests/hepatorenal.test.js) (integrity), [`tests/calibration.test.js`](../../tests/calibration.test.js) (calibration) |
| **Status** | see [`src/catalog/scenes.js`](../../src/catalog/scenes.js) |

## 0. Read this first

**This model deliberately isolates the haemodynamic and neurohumoral component
of HRS-AKI. Structural kidney injury is not represented in this model; that is a
modelling boundary, not a claim that real HRS-AKI never contains kidney injury.**

The 2024 ADQI–ICA joint consensus (Nadim MK et al., *J Hepatol*
2024;81:163–183, PMID 38527522) describes HRS-AKI as an AKI **phenotype** of
advanced cirrhosis with ascites, which may be present alongside tubular injury,
proteinuria or pre-existing chronic kidney disease, and alongside other
mechanisms of AKI. There is no ascites in this model either, so the defining
clinical context of the phenotype is absent as well.

## 1. What question this model answers

**How far can circulatory and neurohumoral changes alone take glomerular
filtration, in a kidney this model gives no injury to?**

## 2. What it is

An educational conceptual model of two organs and the circulation between them,
solved together for one unknown — the mean arterial pressure.

The liver half is the existing portal circulation model, imported rather than
restated. The systemic half is two vascular beds in parallel and a cardiac
response that is deliberately incomplete. The renal half is a glomerulus with an
arteriole either side of it and a Starling balance across it.

The chain runs: portal hypertension dilates the splanchnic arterioles → a large
low-resistance bed opens in parallel and, because the other beds cannot close
far enough to make up for it, systemic vascular resistance falls → the heart
raises its output but not by enough, so arterial pressure falls → the fall
activates the vasoconstrictor systems → they constrict the beds that remain
responsive, while the splanchnic circulation stays disproportionately
vasodilated despite the same signal, so much of it lands on the kidney → the
afferent arteriole dilates to defend renal blood flow until it has no room left,
and past that point the renal circulation is pressure-dependent.

The loop closes: the constriction raises the pressure the splanchnic bed is
perfused at, so nothing is evaluated in order — it is solved.

**Model simplification:** the endogenous activation is not fed back into the
splanchnic resistance at all, so the disproportion is built in rather than
emergent. It is not that the splanchnic bed *cannot* constrict — the treatment
arm constricts it deliberately.

**With cardiac reserve intact this is a rising-output path.** That is the
model's default, not a rule: at the onset of hepatorenal syndrome cardiac output
has been observed to fall (Ruiz-del-Arbol, *Hepatology* 2005, PMID 15977202),
and lowering `cardiacReserve` here reproduces that path to the same renal
failure.

**There is no structural injury variable, and that is a property of the code.**
Renal haemodynamics change through the afferent and efferent arteriolar
resistances **and** through a reversible, activation-dependent reduction in the
effective ultrafiltration coefficient (mesangial contraction). Bowman's pressure
and the oncotic pressure are constants, and `KF` is a constant the activation
scales; nothing is damaged. An earlier version of this card said only two
resistances move, which was untrue of the code.

`kidneyWithoutTheSignal` re-solves the same kidney at the same pressure with the
activation set to zero. It restores **renal perfusion at every severity**, and
**filtration only past a crossover that lies some way beyond the failure of
autoregulation** — before that it does not, because efferent constriction is
supporting filtration while the afferent arteriole is still shielded. The knee
and the crossover are two different positions on the axis and an earlier
version of this card treated them as one. It measures how much of the fall *this
model's* circulation is responsible for, not how much of a patient's fall is
reversible.

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
| `prostaglandinInhibition` | 0–1 | Renal prostaglandin inhibition — the afferent arteriole's local shield, removed. **Deliberately isolated:** the model gives it no systemic action so the local mechanism can be examined alone. That is not a claim that real NSAIDs have no systemic effects; they cause sodium and water retention, affect arterial pressure, and can cause haemodynamic AKI and acute interstitial nephritis. |
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
severity and restored *filtration* only past a crossover later than the knee.

**Volume expansion has no ceiling.** Enough albumin drives cardiac output and
arterial pressure above normal, and the model will show that improving renal
function. In a patient it causes pulmonary oedema. There is no venous
compliance, no pulmonary circulation and no Starling curve for the heart.

**There is no tubule.** No sodium handling, no urine output, no ascites, no
dilutional hyponatraemia, no diuretic response.

**There is no time.** An equilibrium. It cannot show the syndrome developing
over days, and it cannot distinguish an acute course from a chronic one. **The
progression axis is a chosen path through parameter space, not a time course and
not a natural history** — it moves the intrahepatic resistance and the arterial
vasodilation together because that is the story the scene tells, and in a
patient they do not move in step.

**There is no ascites**, and HRS-AKI is defined in cirrhosis *with* ascites.

**There is no structural injury of any kind** — no tubular injury, no
proteinuria, no pre-existing CKD. Since the 2024 consensus allows all three to
be present in HRS-AKI, their absence here is a boundary of the model and not a
feature of the syndrome.

**There is no heart.** A single exponent stands in for systolic and diastolic
function, rate and contractility at once.

**Filtration pressure equilibrium cannot occur**, because the oncotic pressure
is a single mean value rather than one that rises along the capillary.

## 12. What it must never be used for

Diagnosis, staging, or any bedside decision. In particular it **cannot
distinguish HRS-AKI from prerenal azotaemia or from acute tubular necrosis**,
and it cannot weigh a haemodynamic component against an injury component,
because it has no injury component.

The 2024 ADQI–ICA criteria are: cirrhosis with ascites; meeting AKI criteria; no
improvement within 24 hours of adequate volume resuscitation **where
resuscitation is clinically indicated**; and no strong alternative explanation as
the primary cause. Pre-existing CKD, proteinuria and tubular injury do **not** by
themselves exclude HRS-AKI, and 48 hours of systematic albumin is **not** a
required diagnostic step. An earlier version of this card gave "absence of
structural kidney disease" and "failure to respond to volume expansion" as
absolute conditions; both are wrong and both are gone.

The vasoconstrictor index must never be displayed as a concentration or an
activity. It has no units. No dose, duration or response rate may be read off
the treatment controls.

## 13. Uncertainty

Three entries in the registry are marked `uncertain` and are listed in §11.
Three more are marked `approximation`: the mean oncotic pressure, the lumped
efferent resistance, and autoregulation as a band rather than a mechanism.

## 14. Where the model could mislead

**It could be read as saying HRS-AKI never involves kidney injury.** It does
not say that, and the syndrome is not that. This model has no way to represent
structural damage, so its silence on the subject is a boundary rather than a
finding — the title, subtitle, disclaimer, scope panel and reel note each say so,
in both languages, and a test asserts that they do.

**It makes the treatment look more reliable than it is.** Both arms work every
time here, with no non-responders, no ceiling and no adverse effects. Reported
resolution with a vasoconstrictor and albumin is of the order of **40–50%**
(Khemichian, *Annu Rev Med* 2025). The arms demonstrate **the direction the model
predicts, not a guaranteed clinical response**, and the scene's copy says so.
Terlipressin in particular has real ischaemic complications that this model has
no representation of at all.

**It shows a single severity axis** along which scarring and vasodilation move
together. In a patient they do not, and the model lets them be separated — but
the scene's own progression moves them together, which is a chosen path through
parameter space rather than a claim about the course. The slider says so.

**It could be read as saying cardiac output always rises.** The default path
raises it at every step; that is the parameterisation, and the reserve control
produces the falling-output path the literature also describes.

## 14a. Where each claim is defended

The layer a claim is checked in is part of the claim. A second audit applied the
rule strictly — *if this assertion failed, could I honestly say the medicine was
wrong?* — and moved several tests out of the external layer.

| Layer | What lives there |
| --- | --- |
| **External** (12 tests) | Physics and definitions; supported physiological directions; calibration-independent mechanistic constraints, perturbed one variable at a time |
| **Integrity** | Model wiring; counterfactual semantics; that the treatment acts through the intended variable; that the prostaglandin control is isolated; that no structural injury term exists and the copy says so; scene ↔ model consistency |
| **Calibration** | The chosen severity path; where the knee falls; the default cardiac-output trajectory; slider monotonicity; effect magnitudes; the worst state's GFR |

Two tests left the external layer entirely and five were narrowed. The count
fell from fourteen to twelve deliberately: a small pure layer is worth more than
a large mixed one.

## 15. Review status

**Catalog status:** `alpha`

**`alpha`. Not clinically reviewed, and it must not be promoted past `alpha`
without one.**

It has the four things `alpha` requires — model layer, evidence dossier, model
card, scope panel. It does not have a clinical review, and the medical claims
here were revised once already after an audit found the central one overstated.

## 16. How to check it

```bash
node --test tests/hepatorenal-physiology.test.js   # external — a failure here means the physiology was violated
node --test tests/hepatorenal.test.js              # integrity — a failure here means the code is broken
node --test tests/calibration.test.js              # calibration — a failure here means a constant moved
```
