# Model card — Cirrhosis and portal hypertension

| | |
| --- | --- |
| **Scene** | `portal-hypertension` |
| **Model** | [`src/models/portalHypertension.js`](../../src/models/portalHypertension.js) |
| **Evidence** | [`docs/model-evidence/cirrhosis-portal-hypertension.md`](../model-evidence/cirrhosis-portal-hypertension.md) |
| **Tests** | [`tests/portal-hypertension-model.test.js`](../../tests/portal-hypertension-model.test.js), [`tests/portal-hypertension-scene.test.js`](../../tests/portal-hypertension-scene.test.js) |
| **Status** | see [`src/catalog/scenes.js`](../../src/catalog/scenes.js) |

## 1. What question this model answers

**Why does portal pressure rise in cirrhosis, why do the collaterals that open
fail to bring it down, and what does HVPG actually measure?**

## 2. What it is

An educational conceptual model of the portal circulation as a resistive
network with flow conserved at the portal vein: inflow through the splanchnic
arterioles, outflow through the liver, through portosystemic collaterals that
open in response to the gradient, and through a shunt if one is placed. The
intrahepatic resistance is split into a presinusoidal and a sinusoidal segment,
which is what lets the model distinguish the portal pressure gradient from
HVPG.

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
| `presinusoidalShare` | 0–1 | Where the raised resistance sits. Does **not** change how much of it there is. |

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
- Collateral opening: a sigmoid in the gradient around 10 mmHg — which makes
  the system circular, solved by damped fixed-point iteration
- HVPG: the gradient across the *sinusoidal* segment only

## 8. Constants and where they came from

See the evidence dossier. In summary: the three reference resistances are
**calibration constants** chosen so that a healthy liver produces a 3 mmHg
gradient at 1000 mL/min; the collateral and shunt resistances are likewise
calibrations; the 10 mmHg collateral threshold and the 10/12 mmHg clinical
thresholds come from the literature; the 20–30% dynamic share is a widely
repeated figure for which no primary source was reachable.

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

- **Hepatic portal perfusion rises with splanchnic vasodilation here.** In a
  real cirrhotic liver it usually falls. The model does not carry what would
  make it fall.
- **Mean arterial and hepatic vein pressures are fixed.** In decompensated
  cirrhosis neither is.
- **Splanchnic vasodilation is a control, not a consequence.** In a person it
  is largely a response to the portal hypertension it then worsens.
- **Wedged pressure is taken to equal sinusoidal pressure exactly.** Real
  wedging measures a static column whose relationship to sinusoidal pressure is
  itself altered by disease.
- **No hepatic artery**, so no arterial buffer response.
- **The 0.15 presinusoidal cut-off** at which the scene withholds the clinical
  bands is arbitrary and conservative. There is no such number in the
  literature — only a qualitative caution, which this honours.

## 12. What it must never be used for

Diagnosis. Staging. Estimating anyone's HVPG. Deciding whether a patient has
clinically significant portal hypertension. Sizing or indicating a TIPS.
Predicting bleeding, ascites or encephalopathy — none of which this model
contains. Any statement about a particular person.

## 13. Uncertainty

The structure — a network, flow conserved, `ΔP = Q·R` — is not uncertain; it is
arithmetic. Which quantity HVPG measures, and therefore why it under-reads
presinusoidal disease, is well established. The **magnitudes** are
calibrations. Two rows of the evidence dossier are marked **thin**, and Baveno
VII itself was not read.

## 14. Where the model could mislead

- The two gradients agreeing in the default configuration could read as "HVPG
  is the portal pressure gradient". The scene shows both at all times, and its
  subtitle says they are not the same measurement, precisely because of this.
- The pressure falling under a TIPS is dramatic and the perfusion cost is a
  number beside it. A reader could take the first and not the second.
- A model with no ascites in it could be read as saying ascites is not part of
  this. It is; it is just not derivable from what is here.
- The scene's cirrhotic liver is *one* liver, not a typical one.

## 15. Review status

Not reviewed by a clinician. Written from standard hepatology and from
literature reached through search summaries rather than full text — see the
opening of the evidence dossier, which is a material limitation. No guideline
figure, table or algorithm has been reproduced.

## 16. How to check it

`node --test tests/portal-hypertension-model.test.js tests/portal-hypertension-scene.test.js`.
The two tests that matter most are `flow is conserved at the portal vein, in
every configuration` — without which every pressure is meaningless — and `in a
presinusoidal liver, HVPG under-reads the gradient badly — and the gradient is
unchanged`, which is the distinction the whole scene exists to make.
