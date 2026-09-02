# Evidence — glomerular filtration and tubular mass balance

Model: [`src/models/renalFiltration.js`](../../src/models/renalFiltration.js)
Card: [`docs/model-cards/renal-filtration.md`](../model-cards/renal-filtration.md)
Tests: [`tests/renal-filtration-model.test.js`](../../tests/renal-filtration-model.test.js),
[`tests/renal-filtration-teaching.test.js`](../../tests/renal-filtration-teaching.test.js)

Each claim is written as **Claim → Source → Implementation → Assumption →
Validation**. "Source" means the class of textbook statement the claim rests
on, not a measurement in a patient — nothing here is fitted to data, and the
card says so in the same words.

---

## 1. Filtration is a Starling balance across the glomerular capillary

**Claim.** GFR is the ultrafiltration coefficient multiplied by the net
pressure: the hydrostatic pressure in the glomerular capillary, minus the
hydrostatic pressure in Bowman's space, minus the colloid osmotic pressure of
the plasma in the capillary.

**Source.** Standard renal physiology (Guyton & Hall; Boron & Boulpaep). The
central values used — a capillary pressure near 60 mmHg, a Bowman's space
pressure near 15 mmHg, an entering oncotic pressure near 25 mmHg, and a GFR
near 125 mL/min — are the textbook adult figures.

**Implementation.** `solveGlomerulus`. The three pressures are separate terms
and none of them is folded into another, because each is the term a different
disease acts on.

**Assumption.** One representative glomerulus, scaled by nephron count. Real
nephrons differ between cortex and medulla, and the model has one population.

**Validation.** `reference: the solved kidney lands on textbook central
values` and `starling: filtration is what is left after the two opposing
pressures` — the second checks the identity itself, so the reported net
pressure cannot drift from the reported GFR.

---

## 2. Oncotic pressure rises along the capillary, non-linearly

**Claim.** Filtering plasma concentrates the protein left behind, so the
oncotic pressure opposing filtration is higher at the end of the capillary
than at the start; the relationship between protein concentration and oncotic
pressure is markedly non-linear.

**Source.** The Landis–Pappenheimer relation,
π = 2.1C + 0.16C² + 0.009C³ (C in g/dL, π in mmHg). At a normal total protein
of 7 g/dL it gives ≈ 25.6 mmHg.

**Implementation.** `oncoticPressure`, applied at the afferent end and again
at a concentration of C/(1 − FF) at the efferent end; the mean of the two
opposes filtration.

**Assumption.** A linear mean rather than an integral along the capillary.
This overestimates the opposing pressure slightly, which is why the
ultrafiltration coefficient below is calibrated rather than taken from a book.

**Validation.** `starling: oncotic pressure follows Landis–Pappenheimer`, and
`starling: plasma concentrated along the capillary opposes further filtration`.

---

## 3. Kf = 9.05 mL/min/mmHg is a calibration, not a measurement

**Claim.** With the pressures this model computes, an ultrafiltration
coefficient of about 9 mL/min/mmHg across both kidneys produces the textbook
GFR.

**Source.** Textbooks quote Kf ≈ 12.5 mL/min/mmHg *alongside* an assumed net
filtration pressure of 10 mmHg. This model computes the mean oncotic pressure
rather than assuming it, arrives at a slightly higher opposing pressure, and
therefore needs a slightly lower Kf to reach the same GFR.

**Assumption.** The two are not the same quantity and must not be quoted
interchangeably. `FILTRATION_COEFFICIENT` is a constant chosen so this model
lands where the textbook lands; it is not a measurement of a person's kidney,
and the model card repeats that.

**Validation.** `reference: the solved kidney lands on textbook central
values`. If the pressure calculation changes, this constant has to move, and
that test is what says so.

---

## 4. Afferent and efferent constriction have opposite effects on filtration

**Claim.** Constricting the afferent arteriole lowers both renal blood flow
and GFR. Constricting the efferent arteriole lowers renal blood flow but
*raises* glomerular capillary pressure and GFR, and so raises filtration
fraction.

**Source.** Standard renal physiology; it is the basis of the clinical
behaviour of angiotensin II, of ACE inhibitors and ARBs in renal artery
stenosis or volume depletion, and of NSAIDs.

**Implementation.** Three resistances in series with the glomerulus between
the first and the second, solved as a circuit in which the efferent flow is
the afferent flow minus the filtration rate.

**Assumption.** The peritubular bed is one lumped resistance. Autoregulation
is *not* automatic: afferent tone is a control, so the model can be asked what
happens with and without it rather than always compensating.

**Validation.** `arterioles: efferent constriction raises filtration while
lowering blood flow` and `arterioles: afferent constriction lowers both flow
and filtration`.

---

## 5. A low FENa in pre-renal failure is glomerulotubular balance, not a rule

**Claim.** Raising filtration fraction raises proximal tubular reabsorption,
so the fraction of filtered sodium that reaches the urine falls.

**Source.** Glomerulotubular balance: the blood leaving the glomerulus is the
peritubular capillary supply, so a higher filtration fraction gives it a
higher oncotic pressure, which favours uptake of reabsorbate from the
interstitium. This is the accepted mechanism for the low FENa of pre-renal
azotaemia.

**Implementation.** `PROXIMAL`; the proximal fraction follows the efferent
oncotic pressure raised to a calibrated exponent, bounded above and below.

**Assumption.** The exponent (0.55) and the bounds are calibration. The
*direction* is physiology; the strength is chosen so the reference kidney
gives a FENa near 0.7 % and the pre-renal preset falls below 1 %.

**Validation.** `mechanism: proximal reabsorption follows filtration fraction,
not a rule`, and `pre-renal: filtration falls, filtration fraction does not,
and sodium is held`.

---

## 6. Aldosterone and glomerulotubular balance are separate causes of a low FENa

**Claim.** A volume-depleted body lowers urinary sodium by two independent
routes — the haemodynamic one above, and aldosterone acting on the distal
nephron.

**Source.** Standard endocrine physiology.

**Implementation.** `aldosteroneActivity` is a control acting on the distal
escape fraction only.

**Assumption.** The model has no body around the kidney, so aldosterone and
ADH are inputs standing in for one. This is stated in the scope panel: they
are not conclusions the model reaches.

**Validation.** `mechanism: aldosterone and glomerulotubular balance are
separate causes of a low FENa` — including that only one of them moves the
proximal fraction, because they act on different segments.

---

## 7. Urea reabsorption is flow-dependent, and injury reverses the ratio

**Claim.** Urea is passively reabsorbed, so a slowly moving filtrate returns
more of it to the blood; that is why BUN rises out of proportion to creatinine
when the kidney is under-perfused. An injured epithelium cannot reabsorb urea
however slowly the filtrate passes, so in tubular injury the ratio falls
instead.

**Source.** Standard renal physiology, and the clinical use of the
urea-to-creatinine ratio and of the fractional excretion of urea to separate
pre-renal from intrinsic acute kidney injury.

**Implementation.** `UREA`: fractional excretion follows tubular flow with one
exponent and tubular health with another, and the two pull in opposite
directions.

**Assumption.** Both exponents are calibration. What is asserted is the sign
of each effect and that injury dominates, not the size.

**Validation.** `pre-renal: … urea rises out of proportion to creatinine` and
`tubular injury: every one of those numbers inverts`.

---

## 8. Plasma creatinine at steady state is production over clearance

**Claim.** Creatinine is produced at a rate set by muscle mass and cleared
almost entirely by filtration, so at steady state plasma creatinine is
inversely proportional to GFR — halving GFR doubles it.

**Source.** Standard, and the basis of every creatinine-based estimate of GFR.
Production is taken as 1400 mg/day, a central adult figure.

**Implementation.** `steadyStateCreatinineMgDl`.

**Assumption — and it is the important one.** **The steady state is the whole
caveat.** After an acute fall in GFR, real plasma creatinine takes days to
climb to the implied value. The metric is named
`steadyStatePlasmaCreatinineMgDl` so that a scene cannot display it as
"creatinine" and lose the distinction, and the scope panel states it first.

**Validation.** `mass balance: creatinine and urea are production divided by
clearance`, which asserts the doubling explicitly.

---

## 9. Urine volume is solute divided by concentration, and both are computed

**Claim.** Urine volume is not free: it is the solute that has to be excreted
divided by the concentration the kidney can achieve. Sodium leaves with an
anion and so contributes twice its own concentration to urine osmolality,
which is why urine sodium can never exceed half the urine osmolality.

**Source.** Standard renal physiology. Non-sodium, non-urea urinary solute is
taken as 150 mOsm/day, a central figure for an ordinary diet.

**Implementation.** `solveTubule`: excreted sodium and urea are computed, the
remainder is assumed, and urine volume follows.

**Assumption.** Dietary solute intake is fixed. An earlier version assumed a
fixed *total* osmolar load and divided sodium into it separately, which
produced urine sodium concentrations no kidney can make — the current form is
what removed that.

**Validation.** `mass balance: urine volume is the solute divided by the
concentration reached`, and `mass balance: urine sodium can never exceed half
the urine osmolality`, which is checked across every preset.

---

## 10. Nephron loss is partly compensated, and the compensation is the injury

**Claim.** Losing nephrons costs less GFR than proportionality would imply,
because the survivors vasodilate and each filters more — at a raised
glomerular capillary pressure.

**Source.** The remnant-nephron / hyperfiltration account of chronic kidney
disease progression (Brenner). It is the standard explanation both for why
chronic kidney disease is silent until late and for why it progresses.

**Implementation.** `REMNANT_HYPERFILTRATION`, bounded — the reserve is real
and finite.

**Assumption.** The exponent is calibration. The model does **not** integrate
progression over time: it shows the state at a given degree of loss, not the
rate at which loss occurs.

**Validation.** `chronic: losing nephrons costs less GFR than it should, and
the survivors pay`, which checks all three of the total GFR, the single-nephron
GFR and the capillary pressure.

---

## 11. Chronic sodium adaptation, and why it is keyed to nephron loss

**Claim.** In chronic kidney disease the fractional excretion of sodium rises,
because the same dietary sodium load has to leave through fewer nephrons.

**Source.** Standard; the "magnification phenomenon" of chronic kidney
disease.

**Implementation.** A single bounded term keyed to nephron fraction, lumping
the increased solute load per nephron and natriuretic factors together.

**Assumption.** Keyed to nephron loss rather than to GFR **on purpose**: the
adaptation takes weeks, so an acute fall in filtration must not receive it.
Without that distinction the model would give a chronically adapted FENa to an
acutely under-perfused kidney, which is precisely the mistake the scene exists
to prevent.

**Validation.** `chronic: the same dietary sodium leaves through fewer
nephrons`, alongside the pre-renal test, which requires the opposite.

---

## 12. A damaged filtration barrier loses surface as well as selectivity

**Claim.** Nephrotic disease loses grams of protein a day while the GFR stays
near normal.

**Source.** Standard: podocyte foot-process effacement both admits protein and
reduces the area available to filter. Normal albuminuria is under 30 mg/day;
the nephrotic threshold is 3.5 g/day.

**Implementation.** `barrierFiltrationCoefficient` reduces Kf as the sieving
coefficient rises; filtered albumin is reabsorbed proximally by a saturable
process (`ALBUMIN`).

**Assumption.** Without the Kf term the model predicts a *higher* than normal
GFR in nephrotic disease, because it sees only the fall in plasma oncotic
pressure. The size of the term is calibration; that it must exist is not.

**Assumption.** Plasma albumin is a **control**, not a consequence. The loop
from urinary loss back to plasma concentration runs over weeks, and this model
solves a steady state at a given plasma albumin rather than integrating that
loop.

**Validation.** `nephrotic: grams of protein leave while filtration stays near
normal` and `nephrotic: a damaged barrier loses surface as well as
selectivity`, which checks the counterfactual explicitly.

---

## 13. Tubular injury reaches the glomerulus

**Claim.** Acute tubular injury lowers GFR, not only reabsorption.

**Source.** Two standard mechanisms: tubuloglomerular feedback (increased
distal sodium delivery is read as excessive filtration and constricts the
afferent arteriole) and intratubular obstruction by casts, which raises
pressure in Bowman's space.

**Implementation.** `injuryFeedback`.

**Assumption.** Both magnitudes are calibration. Backleak of filtrate across
damaged epithelium is a third accepted mechanism and is **not** modelled.

**Validation.** `tubular injury: reaches the glomerulus by feedback and by
casts`.

---

## Known limitations, stated rather than buried

- **Steady state only.** See §8. This is the limitation most likely to mislead.
- **No acid–base, potassium, phosphate, calcium, vitamin D or erythropoietin.**
  Much of the clinical burden of kidney failure is there.
- **No time.** Neither progression nor recovery.
- **No body.** Volume status, cardiac output and the systemic circulation are
  outside the model; aldosterone and ADH are inputs standing in for them.
- **Thresholds are heuristics.** The model reproduces the *direction* of FENa,
  FEurea, the urea-to-creatinine ratio and urine osmolality reliably. It should
  not be read as predicting that a given patient will cross the 1 % or 20 : 1
  line, and the model card says so.
