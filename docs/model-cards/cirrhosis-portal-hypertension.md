# Model card — Cirrhosis and portal hypertension

| | |
| --- | --- |
| **Scene** | `portal-hypertension` |
| **Model** | [`src/models/portalHypertension.js`](../../src/models/portalHypertension.js) |
| **Evidence** | [`docs/model-evidence/cirrhosis-portal-hypertension.md`](../model-evidence/cirrhosis-portal-hypertension.md) |
| **Tests** | [`tests/portal-hypertension-model.test.js`](../../tests/portal-hypertension-model.test.js), [`tests/portal-hypertension-scene.test.js`](../../tests/portal-hypertension-scene.test.js), [`tests/portal-haemodynamics.test.js`](../../tests/portal-haemodynamics.test.js) |
| **Status** | see [`src/catalog/scenes.js`](../../src/catalog/scenes.js) |

## 1. What question this model answers

**Why does portal pressure rise in cirrhosis, why do the collaterals that open
fail to bring it down, and what does HVPG actually measure?**

## 2. What it is

An educational conceptual model of the portal circulation as a resistive
network with flow conserved at the portal vein: inflow through the splanchnic
arterioles, outflow through the liver, through a portosystemic collateral
network whose established conductance is mapped from the gradient, and through
a shunt if one is placed. The intrahepatic resistance is split into a
presinusoidal and a sinusoidal segment, which is what lets the model
distinguish the portal pressure gradient from HVPG.

**The causal order the scene teaches is not something the model can produce.**
Increased intrahepatic vascular resistance is the *initiating* mechanism of
portal hypertension; the splanchnic vasodilation and hyperdynamic circulation
that follow are a *consequence* of the raised pressure, and the increased
portal inflow they produce is the *perpetuating* mechanism. That is a sequence
in time, and this model is an equilibrium model with no time in it. What it can
do — and what the walk-through uses it for — is answer each step's question
separately: what does more resistance do on its own, and what does more inflow
do at a fixed resistance. The order is supplied by the walk-through and stated
there as such.

## 3. What it is not

Not a patient simulator. Not a source of any clinical decision. **Not an HVPG
calculator** — it computes a portal pressure gradient, reports separately what
an HVPG measurement would read on the same liver, and the two are only the
same number in sinusoidal disease.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `structuralResistance` | ×1–×12 | Fibrosis, nodules, sinusoidal remodelling. Irreversible. The scene's main axis, and one physical quantity rather than a blend. |
| `dynamicTone` | 0–1 | The reversible component: stellate cell contraction, reduced NO, increased endothelin. Adds up to 30% of what the structure already costs. |
| `splanchnicVasodilation` | 0–1 | Lowers the aorta-to-portal resistance by up to 45%, so more blood arrives at an obstructed outflow. |
| `collateralPropensity` | 0–1 | How readily portosystemic collaterals form. |
| `tips` | 0–1 | A transjugular intrahepatic portosystemic shunt. |
| `haemodynamicPattern` | sinusoidal \| mixed \| presinusoidal | **A named state, not a share.** Which haemodynamic pattern is being represented, and therefore where the raised resistance sits and whether the HVPG thresholds may be quoted. Each pattern declares its own `presinusoidalShare` and its own `thresholdsApply`. It does **not** change how much resistance there is. |

## 5. Outputs

Portal pressure; sinusoidal pressure; the portal pressure gradient; what HVPG
would read; how much of the gradient HVPG cannot see; splanchnic inflow; portal
flow through the liver; collateral flow; shunt flow; the fraction bypassing
liver tissue; and a pressure profile along the pathway.

Pressures in mmHg, flows in mL/min.

## 6. State variables

None — the model is stateless. Every call solves an equilibrium from the
controls. There is no time in it.

## 7. Governing relations

- Every path: `Q = ΔP / R`
- Conservation at the portal vein: inflow = liver + collaterals + shunt
- Portal pressure: solved directly from that balance, since every path is
  linear in it
- Established collateral conductance: a sigmoid in the gradient centred on the
  clinically significant threshold — an **illustrative equilibrium mapping**
  onto a chronic process, not an opening event (see §11). It makes the system
  circular, solved by damped fixed-point iteration
- HVPG: the gradient across the *sinusoidal* segment only, standing for
  `WHVP − FHVP` where WHVP approximates sinusoidal pressure

## 8. Constants and where they came from

See the evidence dossier. In summary: the three reference resistances are
**calibration constants** chosen so that a healthy liver produces a 3 mmHg
gradient at 1000 mL/min; the collateral and shunt resistances are likewise
calibrations; the clinical thresholds (>5 mmHg portal hypertension, ≥10 mmHg clinically
significant portal hypertension) are Baveno VII's; the 20–30% dynamic share is
a figure repeated across the pathophysiology reviews. The width of the
collateral sigmoid is invented outright, and the gradient it is centred on is a
clinical threshold borrowed as a plausible centre rather than a measured
midpoint.

## 9. Calibration vs measurement

**Nothing here is a measurement.** No measurement of an intrahepatic
resistance exists for a person. The resistances are the numbers that put the
healthy liver's gradient and flow where the textbooks put them, and everything
else is left where the network puts it.

## 10. What is exaggerated for visibility, and what is not

Vessel calibre in the 3D follows the flow it carries — a vein carrying more
blood is a wider vein, and dilated collaterals are a real finding — but the
mapping from flow to drawn radius is a presentation curve (the fourth root of
the flow ratio) and is named as one. Particle rate follows flow. **Nothing
about pressure is drawn as a shape**: pressure is a number and a plot, because
there is no honest way to draw it.

## 11. Known failure modes

- **Hepatic portal perfusion rises when splanchnic vasodilation is raised on
  its own.** At a fixed hepatic resistance a larger gradient drives more flow
  through it, and there is no version of `ΔP = Q·R` in which it does not — so
  this is arithmetic rather than a defect, and it is a different question from
  the one below. Along the scene's own axis — progressive intrahepatic scarring
  — hepatic portal perfusion **falls**, which is the clinical direction, and
  `tests/portal-haemodynamics.test.js` asserts it at every step so that a
  known-wrong direction can never become a headline read-out. What the model
  does not carry is what makes perfusion fall in a real cirrhotic liver
  *despite* the hyperdynamic circulation: progressive obliteration of the
  intrahepatic vascular bed, and collaterals growing faster than the inflow.
- **Mean arterial and hepatic vein pressures are fixed.** In decompensated
  cirrhosis neither is.
- **Splanchnic vasodilation is a control, not a consequence.** In a person it
  is a response to the portal hypertension it then perpetuates. The model has
  no time, so it cannot produce that; the walk-through supplies the order and
  says that it is doing so.
- **The collateral network is an equilibrium, not a process.** In the model, a
  gradient maps to an established collateral conductance. In a person the
  network takes months to years to develop — dilatation of pre-existing
  embryonic channels, vascular remodelling, and angiogenesis — and does not
  close again when the pressure falls. The sigmoid's centre is a *clinical*
  threshold, not a pressure at which anything opens, and its width is invented.
- **The collateral resistance is a calibration constant, and collaterals are
  not always high-resistance.** Some spontaneous portosystemic shunts are wide
  and carry very large flows. The model's number is chosen to land an
  established-cirrhosis configuration in the reported range; it is not evidence
  for a general property of collaterals. The reason portal hypertension
  persists is that a bypass removes neither the raised intrahepatic resistance
  nor the raised splanchnic inflow.
- **Wedged pressure is taken to equal sinusoidal pressure exactly.** In reality
  WHVP *approximates* sinusoidal pressure in sinusoidal portal hypertension, by
  equilibration of a static column with the sinusoids feeding an occluded
  hepatic vein branch. That approximation is itself altered by disease, and the
  model's version is the idealised one.
- **Presinusoidal intrahepatic is modelled; prehepatic is not.** The
  presinusoidal pattern here is schistosomiasis, porto-sinusoidal vascular
  disease and the presinusoidal component of some cholestatic disorders. Portal
  vein thrombosis produces the same measurement problem but is prehepatic —
  outside the liver — and there is no extrahepatic portal obstruction in this
  model at all.
- **No hepatic artery**, so no arterial buffer response.

## 12. What it must never be used for

Diagnosis. Staging. Estimating anyone's HVPG. Deciding whether a patient has
clinically significant portal hypertension. Sizing or indicating a TIPS.
Predicting bleeding, ascites or encephalopathy — none of which this model
contains. Any statement about a particular person.

## 13. Uncertainty

The structure — a network, flow conserved, `ΔP = Q·R` — is not uncertain; it is
arithmetic. The causal order (intrahepatic resistance initiating, splanchnic
inflow perpetuating) and what HVPG approximates are both well established. The
**magnitudes** are calibrations, and reading a source in full does not promote
one to a measurement: the three reference resistances, the collateral and shunt
resistances, and the width of the collateral sigmoid are all illustrative and
stay illustrative.

## 14. Where the model could mislead

- The two gradients agreeing in the default configuration could read as "HVPG
  is the portal pressure gradient". The scene shows both at all times, and its
  subtitle says they are not the same measurement, precisely because of this.
- The pressure falling under a TIPS is dramatic and the perfusion cost is a
  number beside it. A reader could take the first and not the second.
- A model with no ascites in it could be read as saying ascites is not part of
  this. It is; it is just not derivable from what is here.
- The scene's cirrhotic liver is *one* liver, not a typical one.
- **The collateral sigmoid could read as a valve.** It is not one: it is a
  mapping from a gradient to how much collateral conductance a liver that has
  sat at that gradient has typically ended up with. The walk-through says so in
  the step that introduces it, and a test asserts that the step says so.
- **A named haemodynamic pattern could read as a severity setting.** It is not:
  moving it changes where the resistance sits and never how much of it there
  is, which is exactly the point it is there to make.

## 15. Review status

**Catalog status:** `reviewed`

**Clinically reviewed after correction of the previously identified causal,
collateral and HVPG errors.** Reviewed status means the external haemodynamic
constraints, model integrity and calibration boundaries have been checked while
the equilibrium assumptions and illustrative magnitudes remain explicit. It
does not make the scene an HVPG calculator or a clinical decision tool. The
review named Baveno VII (PMC11090185) and the pathophysiology reviews
PMC2999290, PMC3971388 and PMC3000670. The corrected causal ordering,
collateral interpretation and HVPG boundary are guarded by external tests in
`tests/portal-haemodynamics.test.js`.

This repository's own network still cannot reach the medical publishers, so
nothing here was extracted from a figure, a table or an algorithm by its
author; the dossier explains exactly what that does and does not license. No
guideline figure, table or algorithm has been reproduced.

## 16. How to check it

Three kinds of test, and they mean different things — see
[`tests/README.md`](../../tests/README.md).

- **External physiology**, `node --test tests/portal-haemodynamics.test.js`.
  Resistance initiating and inflow perpetuating; collaterals diverting flow and
  leaving the driving pathophysiology in place; HVPG tracking the sinusoidal
  component; presinusoidal intrahepatic separated from prehepatic; the Baveno
  VII thresholds and where 12 mmHg belongs; a shunt lowering the gradient and
  diverting blood past the liver; hepatic perfusion falling as the liver scars.
  Directions and orderings, with no magnitude anywhere. **A failure here means
  the model has broken a constraint the physiology imposes.**
- **Model integrity**, `node --test tests/portal-hypertension-model.test.js tests/portal-hypertension-scene.test.js`.
  `flow is conserved at the portal vein, in every configuration` is the one
  without which every pressure is meaningless.
- **Calibration behaviour**, `node --test tests/calibration.test.js`. The
  healthy liver's gradient and flow, the collateral sigmoid's width, the
  residual gradient with collaterals established, whether a full shunt clears
  12 mmHg, and the 30% dynamic share. A failure here means a choice changed.
