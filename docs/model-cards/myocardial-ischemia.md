# Model card — myocardial ischemia: which muscle a narrowed artery starves

| | |
| --- | --- |
| Scene | `#/myocardial-ischemia` |
| Model | [`src/models/myocardialIschemia.js`](../../src/models/myocardialIschemia.js) |
| Shared solver | [`src/models/cardiacMechanics.js`](../../src/models/cardiacMechanics.js) |
| Anatomy | [`src/scenes/cardiovascular/organs/coronaryAnatomy.js`](../../src/scenes/cardiovascular/organs/coronaryAnatomy.js), [`aorticRoot.js`](../../src/scenes/cardiovascular/organs/aorticRoot.js) |
| Evidence | [`../model-evidence/myocardial-ischemia.md`](../model-evidence/myocardial-ischemia.md) |
| Catalog status | `alpha` |
| Clinical review | **none** |

## 1. What question this model answers

**Where a coronary artery narrows, which myocardium stops contracting, and what that costs the whole circulation.**

The relation the scene exists for is spatial and is why it is in 3D: the discoloured wall is nowhere near the narrowing. A lesion in the anterior descending sits in a groove on the front of the heart; what fails is the anterior wall and the septum, because that is what the artery feeds. Rotate to the back and the inferior wall is untouched.

The second relation is temporal: oxygen debt has to accumulate before muscle stops contracting, and has to be repaid before it starts again — and the repayment is far slower than the recovery of blood flow.

## 2. What it is

A per-territory oxygen supply/demand balance whose deficit integrates into an **ischemic burden**; burden drives contractility through a one-sided lag; and one number — how hard the ventricle can still contract — crosses into the shared time-varying elastance model, where every whole-heart consequence is solved once.

Three territories: the anterior descending, the right coronary and the circumflex, over the AHA 17-segment model of the left ventricle.

## 3. What it is not

- **Not a stenosis-to-flow calculation.** Supply is a scale factor on a territory. There is no lumen, no Poiseuille law, and nothing here relates a diameter to a flow reserve.
- **Not infarction.** Reversible ischemia only: no necrosis, no scar, no infarct expansion. The scene stops where muscle would start to die, because nothing that decides whether muscle dies is modelled.
- **Not a clock.** The axis is normalized episode progress. Real time-courses depend on collateral supply, preconditioning, territory size and how complete the occlusion is, none of which are here.
- **Not anyone's coronary anatomy.** One right-dominant specimen; no left-dominant or balanced circulation.
- **No ECG, chest pain, troponin or prognosis.**

## 4. Inputs

| Input | Meaning | Range |
| --- | --- | --- |
| `supplyFactor[territory]` | fraction of normal flow down that artery | 0 – 1 |
| `demandFactor` | scales every territory's demand together | > 0 |
| `deltaProgress` | how much of a normalized episode elapses | > 0 |
| preload / afterload | as the shared cardiac model takes them | scene: 0.7 – 1.4 |

## 5. Outputs

`supplyDemandRatio`, `ischemicBurden` and `contractilityMultiplier` per territory; `episodeProgress`; and, through the shared solver, the whole pressure-volume loop — end-diastolic and end-systolic volume, stroke volume, ejection fraction, cardiac output, arterial and filling pressures.

## 6. State variables

`ischemicBurden` (0–1) and `contractilityBurden` (0–1) per territory. The second is a lagged copy of the first and is state rather than a derived quantity, because the lag is the point: without it, restoring flow would restore wall motion in the same frame.

## 7. Governing relations

Under-supplied, per unit of progress:

```
d(burden)/dp = BURDEN_RISE · (1 − ratio) · (1 − burden)
```

Supplied:

```
d(burden)/dp = −BURDEN_FALL · burden
```

Contractility follows a lagged burden, at `CONTRACTILITY_ONSET` while it rises and `CONTRACTILITY_RECOVERY` while it falls, and

```
contractility = 1 − CONTRACTILITY_LOSS · laggedBurden
```

The ventricle's contractility is the territory shares weighted by mass, and it scales `Ees` in the shared solver — because in a time-varying elastance model `Ees` **is** contractility.

## 8. Constants and where they came from

| Constant | Value | Where it came from |
| --- | --- | --- |
| `BASELINE_SUPPLY_DEMAND` | 1.25 | the coronary circulation runs with reserve at rest; the size of the margin is chosen so three severities separate |
| `BURDEN_RISE` | 4 | fitted to the shape the scene has to show |
| `BURDEN_FALL` | 1 | fitted; clears about 63% over a full normalized recovery |
| `CONTRACTILITY_LOSS` | 0.55 | fitted to a 35–60% loss of excursion at high burden |
| `CONTRACTILITY_ONSET` | 6 | fast, because hypokinesis is early |
| `CONTRACTILITY_RECOVERY` | 0.55 | slow, because stunning is |
| territory mass fractions | 7/17, 5/17, 5/17 | derived from the AHA segment table, taking the seventeen segments as equal shares |

**None of these is a measurement.** They are behavioural calibration: chosen so the model behaves the way ischemia behaves.

## 9. Calibration vs measurement

Everything in §8 is calibration. What is *not* calibration is the coronary anatomy — which sinus each artery starts from, which groove it runs in, and which segments it supplies — and the ejection fraction, which is solved rather than assigned.

The one direction taken from published work rather than fitted is the **asymmetry**: hypokinesis is early and recovery is late. That is myocardial stunning, and it is the reason the lag is one-sided rather than a convenience.

## 10. What is exaggerated for visibility, and what is not

The colour scale is presentation: full burden is a strong desaturation the muscle would not literally show. A trace of each territory's own hue is mixed in so the map is legible at rest, when nothing is ischemic.

Two presentation constants carry it, `MAP_TINT` and `MAP_EDGE`, and both are fitted to a criterion measured off the render rather than chosen by eye. The criterion: **at rest, each pair of territories must differ in colour by more than a single flat colour already varies across the same surface.** That floor is 0.0447 in chromaticity, measured by painting every vertex one colour — the lighting in this scene is not grey, so which way a patch faces shifts its hue about as much as a weak tint does.

The first version of this scene failed it: the six pairs separated by 0.76–1.19× the floor, so the legend named three territory colours a reader could not find. It is 1.12–2.29× now. `MAP_EDGE` sharpens a *copy* of the territory weights for drawing only — burden and wall motion read them exactly as the model produced them, because a coronary watershed is not a line and the model does not claim one.

The watershed itself is drawn as a line, in the fragment shader, at a fixed couple of pixels wide. A fill alone cannot carry a map on a lit curved surface, and a line can: it is local contrast, so it survives both the lighting and a camera that sees mostly one territory. **The line is a drawn convention, not a claim that the boundary is sharp** — the model's weights stay smooth underneath it, and §14 says what the map is and is not.

Measured off the rendered frames on a pinned camera — each vertex identified by territory first, then projected — the anterior aspect reads:

| Territory | rest | burden | median Δ red |
| --- | --- | --- | --- |
| anterior descending | rgb(143, 65, 53) | rgb(95, 48, 50) | −32 |
| circumflex | rgb(120, 88, 68) | rgb(116, 82, 66) | −6 |
| right coronary, from behind | unchanged at every stage | | 0 |

Absolute triples are only comparable within one pinned camera: measured against `viewer.controls.target`, which the app sets while framing on load, the same state read anywhere from red 103 to 144 across page loads. The **differences** are what the claim rests on.

**Wall motion is not exaggerated.** How far each part of the wall travels is the contractility multiplier, unmodified, and it is the same multiplier the ejection fraction fell by. Measured on the mesh, mean excursion from end diastole to systole falls 22% in the anterior descending's territory at peak burden and 34% after reperfusion, against 5% and 8% in the other two — and that 5-8% is the whole ventricle ejecting less, not a leak in the territory map.

## 11. Known failure modes

- **A reader may take the territory map as their own anatomy.** It is a fixed convention that measurement disagrees with — see §14.
- **From the opening camera most of the visible wall is one territory** — 73% of the camera-facing vertices are anterior descending. Two things answer that: the watershed is drawn as a line, so the boundary is visible without rotating, and the AHA 17-segment plot beside the heart shows all three territories at once. The 3D still only shows the half facing the camera; the plot is where the whole map is.
- **A reader may read "the artery is open" as "the heart is working."** The scene is built to correct that, and it can also be misread as saying stunning always resolves. It does not always.
- **The three severities the scene offers are not degrees of stenosis.** They are supply factors.
- **The anterior descending stops short of the apex** in the geometry, so its apical territory is drawn without a vessel over it. Recorded in `coronaryAnatomy.js`.

## 12. What it must never be used for

Judging whether a person is having a heart attack. Assessing anyone's coronary anatomy or dominance. Estimating a stenosis. Inferring how long ischemia has lasted or how much time remains. Selecting or timing treatment. Interpreting an echocardiogram or an angiogram.

## 13. Uncertainty

The largest uncertainty is that the calibration constants have no series behind them. The model's *shape* — accumulate, saturate, order by severity, recover slowly — is defensible; its *rates* are chosen.

The second is the territory map, which is a convention rather than a measurement and is quantifiably wrong in places (§14).

## 14. Where the model could mislead

**The territory map is wrong about segment 3, and the model shows it anyway.** The AHA chart assigns the basal inferoseptal segment to the right coronary; contrast-enhanced cardiac MR correspondence studies find it is anterior-descending territory. Only segments 6 and 12 are specific to the circumflex and only segment 10 to the right coronary; segments 4, 5, 9, 11 and 15 overlap two arteries between people.

That is not a defect to fix — it is the nature of a fixed territory assignment, and using one is only honest if the disagreement is stated. It is stated in `coronaryAnatomy.js`, in the scope panel and here.

**The wall's colour could be read as tissue damage.** It is burden, which is reversible by construction in this model. Nothing here goes on to die.

## 15. Review status

**Catalog status:** `alpha`
**Clinical review:** none recorded.

No clinician has reviewed the calibration, the teaching text or the territory presentation. The scene carries the Prototype-class badge and the scope panel accordingly.

## 16. How to check it

`tests/myocardial-ischemia-scene.test.js` holds the scene contract, including that the arteries stay on the wall through the beat and that the chart is the shape the panel reads — both of which failed silently until the scene was rendered and looked at.

`tests/myocardial-ischemia.test.js` holds the behavioural acceptance criteria — every one quoted from `docs/anatomy-specs.md` §2 A3-a, which was written before the model existed. `tests/coronary-anatomy.test.js` holds the anatomy: origins in aortic root diameters, courses in cardiac lengths, and clearance against the built mesh in local vessel radii.

## 17. Revision history

### Revision 3 — the aortic root, and a valve that was not one

The two coronary sinuses were **169.9° apart**. A trileaflet aortic valve has three cusps and they divide the circle, so they are 120° apart — this is geometry, not a citation, and 170° is no aortic root. Nothing caught it: the only tests asked which side each sinus faced, and a pair nearly opposite each other passes that comfortably.

The three sinuses are now placed at 120°, with the third — the non-coronary cusp, which no artery leaves — declared for the first time, because a *drawn* root has three bulges and drawing two would be a root that does not exist. **Where the triad sits is textbook and unverified here**: the right coronary cusp anterior, the left coronary cusp left and a little posterior, the non-coronary cusp right-posterior. Egress to publishers is blocked from this build environment, so that arrangement is recall, and it carries the same caveat as every other source in this scene.

The root is also *drawn* now. It was a `{ centre, radius }` the arteries were placed from and nothing rendered, so both coronary trunks began in mid-air in every frame — a reader could see where the arteries went and not where they came from, in a scene about a narrowing inside one of them. Its centre was a typed triple that put the sinotubular junction below the ventricle's own shoulder; derived from the valve plane now, so the root rises out of the base wherever the base is. The ostia sit on the drawn wall by construction: the sinuses swell below the junction and the wall is back at its nominal radius by the time the ostia are placed, which is also where real coronary ostia are.

Nothing in the ischemia model itself changed. No supply, demand, burden, contractility or circulation quantity moves.

### Revision 2 — never written

`docs/model-cards/revisions.json` registered this card at revision 2 the day it was created, while the card documented one revision. There was no second version: the number was seeded wrong and the mismatch sat between the two files, which is exactly what a revision gate exists to prevent and what it did not catch, because it compares the *model's* digest against the card and not the card's own numbering against the registry. Recorded rather than quietly renumbered.

### Revision 1 — first version

Reversible ischemia over a right-dominant specimen, with the AHA territory map and the shared cardiac solver.

The corrections recorded in [`../anatomy-review.md`](../anatomy-review.md) §5.10 up to that point are all presentation and geometry — a seam, arteries that did not move with the wall, a chart wired to keys its panel does not read, a territory map below the lighting floor — and none of them touched the model.
