# Model card — Where filtration fails: glomerular Starling balance and tubular mass balance

| | |
| --- | --- |
| **Scene** | `renal-filtration` |
| **Model** | [`src/models/renalFiltration.js`](../../src/models/renalFiltration.js) |
| **Evidence** | [`docs/model-evidence/renal-filtration.md`](../model-evidence/renal-filtration.md) |
| **Tests** | [`tests/renal-filtration-model.test.js`](../../tests/renal-filtration-model.test.js), [`tests/renal-filtration-teaching.test.js`](../../tests/renal-filtration-teaching.test.js) |
| **Status** | see [`src/catalog/scenes.js`](../../src/catalog/scenes.js) |

## 1. What question this model answers

**When filtration fails, where in the nephron did it fail, and how would you
tell from the outside?**

## 2. What it is

An educational conceptual model of two things solved together: the Starling
balance across one glomerular capillary, scaled by how many nephrons are
working, and what the tubule downstream does with the filtrate.

Every number it reports is a reading of that one solved state. The fractional
excretion of sodium, the fractional excretion of urea, the urea-to-creatinine
ratio, the urine sodium and the urine osmolality are not five facts to be
memorised in a table — they are five consequences of the same arithmetic, and
that is the whole reason for the scene. A learner who has been told that
pre-renal failure gives a low FENa has been told a fact. A learner who can
raise efferent tone and watch the FENa fall, *because filtration fraction rose
and the proximal tubule reabsorbs more when it does*, has been shown a
mechanism.

**The four places a kidney fails are four separate controls**, not one severity
slider, because a model that gave the same numbers for a dehydrated kidney and
a poisoned one could not teach the thing worth teaching:

1. **Before the glomerulus** — perfusion pressure, afferent tone, efferent tone.
2. **At the glomerulus** — how many nephrons are left, and whether the barrier
   still selects.
3. **In the tubule** — whether the epithelium can still reabsorb and
   concentrate.
4. **After the tubule** — obstruction, which reaches filtration through the one
   term it can: the hydrostatic pressure in Bowman's space.

## 3. What it answers

- Where in the nephron filtration has failed, when it has.
- Why FENa, FEurea, the urea-to-creatinine ratio and urine osmolality move the
  way they do, and why tubular injury *inverts* each of them rather than merely
  making them uninformative.
- How afferent and efferent tone can move filtration and renal blood flow in
  opposite directions — and therefore why a drug that protects kidneys can drop
  the GFR of one that was depending on it.
- What the surviving nephrons are doing in a kidney that has lost some, and why
  that compensation is also the next injury.
- Why grams of protein can be lost while filtration is nearly normal.

## 4. What it does not answer

**This is the section to read before quoting a number from it.**

- **Today's plasma creatinine.** The model solves a **steady state**. After a
  sudden fall in GFR, real plasma creatinine takes days to reach the value the
  new GFR implies — which is exactly why creatinine understates acute injury on
  the first morning. The metric is called
  `steadyStatePlasmaCreatinineMgDl` so that no surface can display it as
  "creatinine" and lose the distinction. It says where creatinine is heading,
  never where it is.
- **Prognosis, drug dosing or fluid prescription for an individual.** It is not
  a patient simulator and is not validated against measured data.
- **Acid–base, potassium, phosphate, calcium, vitamin D, erythropoietin.** Much
  of what makes kidney failure a clinical problem lives there and none of it is
  in here.
- **Anything outside the kidney.** Volume status itself, cardiac output, the
  systemic circulation. Aldosterone and antidiuretic hormone are *inputs*
  standing in for a body that is not modelled — not conclusions the model
  reaches.
- **Time.** Neither the rate at which nephrons are lost nor recovery from acute
  injury.
- **Diagnostic thresholds as predictions.** The model reproduces the direction
  of FENa, FEurea, the ratio and urine osmolality reliably. It must **not** be
  read as predicting that a given patient will cross the 1 % or the 20 : 1
  line. Those lines are clinical heuristics with well-known exceptions — diuretics,
  chronic disease, contrast, pigment nephropathy — and the model is not a
  substitute for any of them.

## 5. Where it could mislead

- **The numbers look clinical, because they are in clinical units.** That is
  deliberate — a model quoting creatinine in mol/m³ is one nobody will check
  against what they know — and it is the main risk the scene carries. Every
  read-out is rounded to a precision the model can support, and the scope panel
  is on the same screen.
- **The presets are named after clinical patterns.** "Pre-renal", "acute
  tubular injury" and "nephrotic" are each *one constructed situation* chosen to
  separate a mechanism from its neighbours. None is a patient, an average, or a
  case definition.
- **Kf = 9.05 mL/min/mmHg is a calibration constant, not a measurement.**
  Textbooks quote ≈ 12.5 alongside an assumed net pressure of 10 mmHg; this
  model computes the mean oncotic pressure instead of assuming it, so its Kf is
  not the same quantity. The two must not be quoted interchangeably.
- **Several exponents are calibration.** In glomerulotubular balance, in urea
  handling, in remnant hyperfiltration and in tubular injury, the model asserts
  the *sign and the reason* for an effect. The strength of each is chosen so the
  reference kidney lands on textbook values, and is not itself a claim.
- **Backleak is not modelled.** It is a third accepted mechanism of the low GFR
  in acute tubular injury, alongside the two that are here.
- **One nephron population.** Cortical and juxtamedullary nephrons differ; the
  model has one representative glomerulus scaled by count.

## 6. Review status

**Catalog status:** `alpha`

**No clinical review is recorded.** The model layer, this card, the evidence
dossier and the in-scene scope panel are in place, which is what `alpha` means
in this repository: the scene may show numbers, and it makes no claim to have
been checked by a clinician. It must not be promoted to `reviewed` without a
named reviewer signing a specific commit, per
[`docs/clinical-reviews/README.md`](../clinical-reviews/README.md).

The claims most in need of a reviewer's attention, in order:

1. That the steady-state creatinine caveat (§4) is stated strongly enough for
   the audience the scene will actually reach.
2. Whether presenting FENa and the urea-to-creatinine ratio at all — even with
   the threshold caveat — risks being read as a diagnostic algorithm.
3. The chronic sodium adaptation term, which lumps two mechanisms into one and
   is the least directly sourced part of the model.

## 7. How to check it

- **Physiology**, `node --test tests/renal-filtration-model.test.js`: that the
  reference kidney lands on textbook values, that each mechanism moves the
  numbers in the direction the evidence dossier claims, that mass balance holds,
  and that no control can produce a physically impossible state.
- **Teaching**, `node --test tests/renal-filtration-teaching.test.js`: that the
  stored answer to the learning module is re-derived from the model rather than
  trusted, so a lesson cannot outlive the physiology it teaches.
- **Revision**, `npm run revisions:check`: that this card still describes the
  model it is filed against.
