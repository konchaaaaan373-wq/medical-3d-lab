# Evidence — myocardial ischemia

Claim → Source → Implementation → Assumption → Validation, for
[`src/models/myocardialIschemia.js`](../../src/models/myocardialIschemia.js) and the coronary anatomy it reads.

**Read this first.** Almost nothing here is a measured value. What published work supplies is the *direction* of each relation and the *ordering* of the events; the rates are fitted so the scene behaves the way ischemia behaves. The line between the two is the whole point of this document, and §3 is the part to read if you are deciding whether to trust a number.

Egress to medical publishers is blocked from this build environment, so no figure or table was read here. Where a source is cited below, what was checked against it is its abstract and its cohort description, and that is said each time.

## 1. What the model asserts

### The coronary territory map

**Claim.** Each region of left-ventricular myocardium is supplied predominantly by one of three epicardial arteries, and the assignment can be written over the AHA 17-segment model.

**Source.** Cerqueira MD, Weissman NJ, Dilsizian V, Jacobs AK, Kaul S, Laskey WK, Pennell DJ, Rumberger JA, Ryan T, Verani MS. *Standardized myocardial segmentation and nomenclature for tomographic imaging of the heart.* Circulation 2002;105:539–542. doi:10.1161/hc0402.102975.

**Implementation.** `AHA_SEGMENTS` in `coronaryAnatomy.js`, as the single source of truth the scene's colour, wall motion, legend and read-out all read.

**Assumption.** That a fixed assignment is a useful teaching object. It is; it is also demonstrably not what measurement finds — see §3.

**Validation.** `tests/coronary-anatomy.test.js`: the table is asserted segment by segment, every segment centre resolves to its charted territory, and rotating the short-axis ring fails three tests.

### Hypokinesis is early; recovery is late

**Claim.** Regional contraction falls very soon after a coronary artery occludes, and muscle that has been ischemic and is then reperfused remains hypokinetic long after flow is restored.

**Source.** The stunning literature, of which the flow-and-contraction coupling review the specification cites (`pmc.ncbi.nlm.nih.gov/articles/PMC3251640/`) is the entry point. **Not read here** — egress blocked. What is asserted is the direction and the asymmetry, both of which are textbook.

**Implementation.** `CONTRACTILITY_ONSET` 6 against `CONTRACTILITY_RECOVERY` 0.55, applied to a lagged copy of burden that is carried as state.

**Assumption.** That the asymmetry can be represented by two first-order rates. Real stunning has a more complex time-course and depends on the duration and depth of the ischemia.

**Validation.** `tests/myocardial-ischemia.test.js` — over a full recovery the burden clears 63% while the wall recovers 14% of its impairment, and the wall is still 39% hypokinetic with normal flow. Removing the asymmetry fails that test.

### Losing contractility in a territory costs the whole ventricle, in proportion to its size

**Claim.** A regional contractile deficit lowers global ejection fraction, and a deficit in a larger territory costs more.

**Source.** Time-varying elastance, as the shared cardiac model already implements it — see [`docs/model-cards/heart-failure.md`](heart-failure.md) — where end-systolic elastance is contractility.

**Implementation.** `ventricularContractility` weights the territories by mass and `solveIschemicCirculation` scales `lv.ees` by it. Nothing else is scaled; preload and afterload are untouched.

**Assumption.** That a regional deficit can be represented as a proportional reduction in a single global elastance. It cannot, exactly: a real regionally-ischemic ventricle also loses efficiency to dyssynchrony and to the ischemic segment being stretched by the working ones, and neither is here.

**Validation.** Ejection fraction falls 4.6 absolute points at the severe deficit with preload and afterload unchanged, and the same lesion in the anterior descending's territory costs more than in the circumflex's.

### The aortic root the arteries leave from

**Claim.** The aortic valve has three cusps, so its three sinuses are 120° apart; the right coronary cusp is the anterior one, the left coronary cusp sits left and a little posterior, and the non-coronary cusp is right-posterior. The coronary ostia sit at or just below the sinotubular junction.

**Source.** The 120° spacing is geometry and needs none. The arrangement and the ostial level are textbook. **Not read here** — egress blocked.

**Implementation.** `SINUS_AZIMUTH_DEG` and `AORTIC_SINUSES` in `coronaryAnatomy.js`; `buildAorticRoot` in `aorticRoot.js`, whose sinuses swell below the junction and return to the nominal radius before the ostia are placed, so an ostium at `centre + direction × radius` lands on the drawn wall.

**Assumption.** That one root shape stands for every root. Sinus proportions, ostial height and how eccentric an ostium can be all vary between people and none of that is here.

**Validation.** `tests/organ-anatomy.test.js` asserts the 120° spacing and which way each cusp faces; `tests/coronary-anatomy.test.js` measures each ostium against the *drawn* mesh, and that the sinuses bulge while the commissures do not. Putting the sinuses back 170° apart fails two tests; flattening the bulge fails another.

## 2. What this repository chose

| Choice | Why | What it costs |
| --- | --- | --- |
| Supply as a scale factor, not a stenosis | the imbalance is the subject; the plumbing is not | cannot answer "how tight is it" |
| Normalized episode progress | seconds cannot be justified | cannot answer "how long" |
| One right-dominant specimen | a specimen is one specimen | no left-dominant or balanced circulation |
| Reversible ischemia only | nothing that decides whether muscle dies is modelled | no infarct, and the scene stops before the question most readers will ask next |
| Uniform demand across territories | regional demand differences are small next to a supply deficit | cannot show demand-led ischemia in one wall |
| Equal mass per AHA segment | the model's own convention, derived from the segment table | a coarse mass weighting |

## 3. What the model does not have

- **Any measured rate.** `BURDEN_RISE`, `BURDEN_FALL`, `CONTRACTILITY_LOSS` and both tracking rates are fitted to behaviour. They are not oxygen-consumption figures, not lactate kinetics and not a published recovery curve.
- **A territory map that agrees with measurement.** Contrast-enhanced cardiac MR correspondence work finds only segments 6 and 12 specific to the circumflex and only segment 10 to the right coronary, with 4, 5, 9, 11 and 15 overlapping two arteries — and **segment 3, charted here to the right coronary, measuring as anterior-descending territory.** The map is a convention. Using one is defensible; using one silently is not.
- **Collateral circulation**, which is one of the largest determinants of how a real territory behaves when its artery closes.
- **Microvascular resistance and its spatial distribution.**
- **Subendocardial-to-subepicardial gradient.** Ischemia is worst nearest the cavity, and this model has no transmural depth at all.
- **Dyssynchrony**, tethering, and the mechanical interaction between an ischemic segment and the segments working around it.
- **Anything after reversibility**: necrosis, scar, remodelling, arrhythmia.
- **A verified aortic root.** The 120° spacing is geometry, but where the triad sits, how far a sinus bulges and how high the ostia are were not read from anything here.

## 4. How to check it

```
node --test tests/myocardial-ischemia.test.js
node --test tests/coronary-anatomy.test.js
```

Every acceptance number in the first file is quoted from `docs/anatomy-specs.md` §2 A3-a, which was written before the model existed — a calibration checked against numbers chosen afterwards is checked against itself.

## 5. Review status

**No clinical review.** No clinician has read the calibration, the teaching text or the territory presentation. The catalogue status is `alpha` and `docs/clinical-reviews/registry.json` records the limitations that a reviewer would need to work through.
