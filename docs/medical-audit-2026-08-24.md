# Medical Audit — 2026-08-24

## Scope

Full review of the two implemented scenes — `amyloid-beta` and `heart-failure` —
covering medical accuracy, the numerical model behind the visuals, the 3D
representation itself, UI wording in both languages, and the risk of a viewer
taking away a wrong idea about the disease.

Reviewed against standard heart-failure pathophysiology (LV remodelling,
elevated cardiac filling pressures, pulmonary venous/capillary hydrostatic
pressure, the definition of HFrEF as reduced-EF systolic dysfunction) and
against the mainstream account of the Aβ aggregation pathway (monomer,
oligomer, protofibril, fibril and plaque as coexisting, interconverting
species rather than a one-way reaction).

No new features were added. Existing UX and platform work (story mode,
bilingual UI, PNG export presets, adaptive quality, scene selector, `getMetrics`,
`getStageView`, `meta.range`, legend `activeFrom`, dynamic import, responsive UI,
OrbitControls, keyboard control, animation architecture) was preserved.

## Heart failure

| Severity | Issue | Why it matters | Action |
|---|---|---|---|
| Critical | Pulmonary congestion was drawn as blue **blood particles** filling the left atrium, pulmonary veins and vascular bed in sequence | Reads directly as "blood flows backwards from the heart into the lung", which is not what pulmonary congestion is. This is the single most likely wrong idea a viewer could take away | Removed the backward blood pool entirely. Congestion is now a **pressure front** (`CongestionOverlay`) that spreads outward along atrium → veins → vascular bed as filling pressure rises, plus pale **interstitial fluid** particles placed *outside* the vessels. Blood particles now only ever move atrium → ventricle → aorta |
| Critical | Stroke volume and cardiac output **rose** with worsening failure (SV 70 → 84 mL, CO 4.9 → 7.1 L/min at EF 27%) | A failing ventricle was pumping more than a healthy one. It contradicted physiology and the scene's own caption about maintained output | Rebuilt the keyframe set so SV falls monotonically (70 → 51 mL) and resting CO is broadly maintained (~5.0 L/min) then declines (4.5 L/min). Locked in by tests |
| High | `state.heartRate` was renamed to `state.hr` without updating the cardiac-phase advance, leaving `phase` as `NaN` | Every frame produced NaN vertex positions; the ventricle geometry was invalid and only a console warning showed it. Found during browser QA, not by the build | Extracted `advanceCardiacPhase()`, which throws on non-finite input, and covered it with a test |
| High | Stage names (`Compensated hypertrophy` → `Chamber dilation` → `Reduced ejection fraction`) read as a universal one-way natural history of heart failure | Not all heart failure follows this path, and HFpEF looks different again | Renamed to `Normal` / `Concentric remodeling` / `LV dilation` / `Systolic dysfunction (HFrEF)` / `Pulmonary congestion`, and the on-screen notice now states this is *one pattern seen in HFrEF* |
| High | Documentation described the end-systolic residual blood as 血流うっ滞 (blood stasis) | End-systolic residual volume exists in every normal heart; calling it stasis implies pathology and invites a thrombus reading that the model does not support | Reworded throughout to "end-systolic residual volume". Legend and 3D label follow. Docs state explicitly that this is reduced washout, not modelled stasis or thrombus |
| Moderate | Caption asserted that output is maintained in the compensated phase, while the model produced supranormal output, and conflated stroke volume with cardiac output | The claim was both unsupported by the model and imprecise | Wording now says a faster rate keeps *resting cardiac output* close to normal for a time. Cardiac output is now displayed, so the claim is checkable against the model |
| Moderate | The shape parameter was called `sphericity` but was a long-axis/short-axis ratio, i.e. it moves opposite to a clinical sphericity index | Invites reading a model parameter as a clinical measurement | Renamed `longToShortAxisRatio` and documented as a shape parameter of this model, moving in the same direction as (but not measuring) clinical sphericity |
| Moderate | Myocardial volume was recomputed per disease state and held constant within a beat — correct, but undocumented and easy to break | The incompressibility assumption is only defensible *within* a beat, never across remodelling | Made the two-layer structure explicit in code and docs, and added a test asserting both halves: ED wall thickness reproduces the keyframe, and muscle volume is conserved through the beat |
| Low | LV mass was computed with an implicit density | Numbers without stated units invite over-reading | `MYOCARDIAL_DENSITY_G_PER_ML = 1.05` is now named and commented, and mass is **not** shown in the UI because the chamber is an ellipsoid approximation |
| Low | Filling pressure had no read-out | The congestion stage's mechanism was invisible in the numbers | Added a **qualitative** filling-pressure row (normal / slightly ↑ / ↑ / ↑↑). Deliberately not a number in mmHg, which the model cannot justify |
| Accepted simplification | Valves are static rings and do not open or close | Not the teaching point of this scene | Documented. No regurgitant or obstructive flow is depicted; blood only ever crosses a valve in the physiological direction and phase |

## Amyloid beta

| Severity | Issue | Why it matters | Action |
|---|---|---|---|
| Moderate | The slider was labelled `Disease progression` and captioned `Normal → Plaque` | Reads as a clinical severity or staging scale for Alzheimer's disease | Slider is now labelled **Aggregation state / 凝集の状態**, with captions `Low aggregation → High aggregation`. The percentage read-out carries the same caption so "70 %" cannot be read as "70 % of the way to severe dementia" |
| Moderate | The neuron dimmed and dendritic spines shrank progressively all the way to the end of the slider | Implies a dose–response between plaque burden and neuronal injury, which the visualization is in no position to claim | Effect reduced (spines to 72 % rather than 40 %, membrane barely dims) and saturated by 0.8 so it stops tracking the slider. It is not labelled as damage anywhere |
| Low | Oligomer caption read "widely regarded as an important species for synaptic dysfunction" | Slightly stronger than the evidence warrants for a general-audience caption | Now: "considered biologically important and have been associated with synaptic dysfunction" |
| Low | Stage captions read as a one-way, go-to-completion reaction | Aβ species coexist and interconvert | Captions now say "some aggregates extend into fibrils", the plaque caption states that monomers and soluble aggregates remain present, and the notice states that species coexist and interconvert |
| Low | The notice did not say the scene is not a clinical staging | The most likely misreading | Notice now states: species coexist and interconvert, and this does not represent clinical disease stages or symptom severity |
| No issue found | "Normal" already contained baseline Aβ monomer (≈17 % of the particle pool visible at progress 0) | A healthy brain does produce and clear Aβ | Unchanged, now covered by a test that fails if baseline Aβ ever reaches zero |
| No issue found | Multiple species already coexisted at maximum aggregation | Verified: at progress 1 the population is monomer 18 %, oligomer 16 %, fibril 20 %, plaque 45 % | Unchanged, now covered by a test |
| No issue found | All deposits were already placed extracellularly | Aβ plaques are extracellular | Unchanged, now covered by a test asserting no particle sits inside the soma |
| Accepted simplification | Protofibrils are not a separate stage | Adding a sixth stage would cost UX for little conceptual gain | Documented as an omitted intermediate; the oligomer→fibril transition is continuous, which is where protofibrils would sit |

## Numerical validation

Automated (`npm test`, 25 assertions across three files) over a 400-point sweep
of the slider plus every keyframe and stage boundary:

- `SV = EDV − ESV`, `EF = SV / EDV`, `CO = SV × HR` hold everywhere (units: mL,
  %, L/min, bpm).
- Invariants: `EDV > 0`, `ESV ≥ 0`, `ESV < EDV`, `0 < EF ≤ 1`, `HR > 0`,
  wall thickness `> 2 mm`, no inverted wall, no NaN, no abrupt jump between
  adjacent samples.
- Stroke volume never rises as remodelling advances, and never exceeds the
  healthy value; cardiac output never becomes supranormal.
- The stage labelled HFrEF shows EF < 40 %.
- End-diastolic wall thickness reproduces the keyframe value exactly; myocardial
  volume is conserved through the beat; the wall thickens in systole at every
  stage.
- The cardiac cycle stays within [ESV, EDV] and returns to end-diastole.
- Amyloid: layout builds with finite positions, nothing sits inside the soma or
  outside the scene bounds, baseline Aβ is non-zero, all four species coexist at
  maximum aggregation, and no particle ever regresses to an earlier species.

Resulting model, at each stage boundary:

| Stage | EDV | ESV | SV | EF | HR | CO | ED wall | RWT | Myocardial mass* |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| Normal | 120 mL | 50 mL | 70 mL | 58 % | 70 | 4.9 L/min | 9.0 mm | 0.36 | ~190 g |
| Concentric hypertrophy | 112 mL | 45 mL | 67 mL | 60 % | 74 | 5.0 L/min | 14.0 mm | 0.58 | ~340 g |
| LV dilation | 170 mL | 104 mL | 66 mL | 39 % | 76 | 5.0 L/min | 11.6 mm | 0.39 | ~310 g |
| Systolic dysfunction (HFrEF) | 205 mL | 145 mL | 60 mL | 29 % | 82 | 4.9 L/min | 10.4 mm | 0.32 | ~280 g |
| (congestion overlay high) | 235 mL | 182 mL | 53 mL | 23 % | 88 | 4.7 L/min | 9.8 mm | 0.28 | ~275 g |
| (slider end) | 248 mL | 197 mL | 51 mL | 21 % | 89 | 4.5 L/min | 9.4 mm | 0.26 | ~270 g |

\* Computed internally for geometric consistency and **not displayed**. It is a
property of this ellipsoid approximation and must not be read as a clinical
echocardiographic LV mass measurement — clinical reference values themselves
depend on sex, body size, method and indexing. Only the *direction* of change
between states is meaningful here.

The last two rows are positions on the structural axis where the congestion
overlay is strong; they are not stages named after congestion (see below).

## Accepted simplifications

Heart failure:
- One pattern of remodelling in HFrEF. HFpEF, the right ventricle, valvular
  disease and specific aetiologies are out of scope.
- Blood particles follow prescribed paths. This is not computational fluid
  dynamics, and no velocity or pressure field is solved.
- Valves are static rings; no opening, closing, regurgitation or obstruction.
- Neurohormonal activation (RAAS, sympathetic) is not depicted; only its effect
  on heart rate appears, as a keyframed value.
- The systemic circulation is not drawn; ejected blood fades out and returns via
  the atrium.
- Myocardium is treated as incompressible within a beat only.
- The chamber is a truncated prolate spheroid, so no papillary muscles, chordae,
  fibre architecture or right-ventricular interaction.

Amyloid beta:
- A conceptual aggregation pathway, not molecular dynamics. Shapes, counts,
  sizes and timing are illustrative.
- Protofibrils and other intermediates are folded into a continuous
  oligomer→fibril transition.
- No APP processing, secretases, ApoE, clearance pathways, tau pathology,
  microglia or neuroinflammation.
- Aβ40/Aβ42 are not distinguished; the scene shows generic Aβ aggregation.
- The neuron is a schematic, and its slight dimming is an association cue only.

## Residual conceptual risk resolved (follow-up)

Two items raised after the first pass, both fixed:

| Severity | Issue | Why it matters | Action |
|---|---|---|---|
| High | Pulmonary congestion was the fifth entry in the structural stage list, after HFrEF | Reads as "the structural stage after HFrEF is congestion". Congestion is a haemodynamic state following raised left-sided filling pressure, and it is not specific to HFrEF — HFpEF and other causes of raised filling pressure produce it too | Split the model into two axes. The structural/functional axis now has four stages (Normal → Concentric hypertrophy → LV dilation → Systolic dysfunction (HFrEF)). Congestion is carried by an independent `congestionLevel` state parameter driving `CongestionOverlay`; it rides the same slider for simplicity but is never a stage label, and the slider's far end is captioned structurally ("Dilated, low EF"). The HFrEF caption says in both languages that congestion is drawn as a separate haemodynamic overlay, not a later structural stage |
| Moderate | The concentric state was called `Concentric remodeling` / 求心性リモデリング while the model increases myocardial volume by ~77 % | In the echo classification, increased RWT with *normal* mass is concentric remodeling; increased RWT with *increased* mass is concentric hypertrophy. The clinical term did not match what the model draws | Renamed `Concentric hypertrophy` / 求心性肥大, and the caption now states that muscle mass increases. The naming rests on the direction of change the model produces, not on the absolute mass, which stays out of the UI. A test asserts the model really does add myocardium, so the name cannot drift from the model |
| Low | Cardiac output behaviour was described as what chronic HFrEF does | Presented one illustrative course as a general rule | Softened in the data comments, the docs and the test names: resting output may stay relatively preserved in some patients, and nothing claims SV or CO must fall monotonically |
| Low | LV mass was compared against a single normal range | LV mass reference values depend on sex, body size, method and indexing | Removed. The docs now say only that the model-derived figure is for internal geometric consistency and is not a clinical LV mass measurement |

## Remaining limitations

- ~~**Congestion looked like the stage after HFrEF.**~~ **Resolved** — see the
  follow-up section above.
- ~~**The stage sequence is still a sequence.**~~ **Addressed after the audit.**
  A single left-to-right slider inevitably suggests an ordered path, and no
  wording fully counters that. A comparison mode (`Compare`, or `C`) now places
  a normal ventricle beside the remodelled one, presenting them as two states
  rather than two points on one path. The reference heart is this scene's own
  model evaluated at progress 0, so it cannot drift from the model. Residual
  concern: the slider is still the primary interaction, and comparison is
  opt-in, so a viewer who never presses the button sees only the sequence.
- **Numbers are representative, not measured.** Every haemodynamic value is a
  plausible textbook-style figure chosen to show a direction of change. No
  patient, cohort or measurement protocol stands behind any of them, and the
  ellipsoid geometry is not a validated volumetric method.
- **Cardiac output is nearly flat across the whole sweep.** Resting cardiac
  output may remain relatively preserved in some patients despite a reduced EF;
  the values here are illustrative and are not a universal HFrEF trajectory.
  It does mean the scene does not show *why* patients are symptomatic, since
  exercise reserve is not modelled at all.
- **The pressure front is a metaphor.** Pressure does not propagate as a
  visible glow front, and no pressure–volume relationship, compliance or
  time constant is modelled. It communicates direction and magnitude only.
- **Interstitial fluid is schematic.** No alveoli, no lymphatics, no Starling
  forces, and no distinction between interstitial oedema and alveolar oedema.
- **Amyloid species proportions are chosen for legibility.** The 18/16/20/45 %
  split at maximum aggregation is a visual decision, not a measured distribution,
  and the model has no concentrations, rate constants or equilibria.
- **Aggregation and neuronal change are shown together.** Even at reduced
  intensity, drawing a slightly dimmer neuron alongside more aggregate places
  the two in the same frame, and viewers may read causation the visualization
  does not claim.


---

## Addendum — 2026-08-25: the haemodynamics became a model

Two of the limitations recorded above were properties of *how the numbers were
produced*, not of any individual figure:

> **Numbers are representative, not measured.** Every haemodynamic value is a
> plausible textbook-style figure chosen to show a direction of change.

> **The pressure front is a metaphor.** … no pressure–volume relationship,
> compliance or time constant is modelled.

The hand-placed EDV/ESV/wall keyframe table has now been replaced by a
closed-loop, time-varying-elastance circulation model (`circulation.js`). The
slider moves *mechanical* parameters only — end-systolic elastance, unstressed
volume, end-diastolic stiffness, systemic resistance, circulating volume, heart
rate — and every haemodynamic figure is an integration result.

**What this changes**

| Before | After |
| --- | --- |
| EDV, ESV read from a keyframe table | Solved from the pressure–volume mechanics |
| EF = a tabulated number | EF = (EDV − ESV) / EDV, both solved |
| Filling pressure shown as "raised / 上昇" | LV end-diastolic pressure in mmHg |
| Congestion driven by a 0–1 index tied to progress | Driven by solved mean pulmonary venous pressure against clinical landmarks |
| Ejection assumed to occupy a fixed 34 % of the cycle | Ejection is whenever the aortic valve is open; isovolumic periods emerge |
| No pressures at all | LVEDP, mean LAP, mean pulmonary venous and arterial pressures, systolic/diastolic/mean arterial pressure |
| — | Pressure–volume loop with ESPVR and EDPVR, drawn from the same equations |
| — | Ventricular, arterial and atrial pressure over one beat, with the ejection window taken from the solved flows |
| — | Preload and afterload sliders that re-solve the circulation |

**What the model now demonstrates rather than asserts.** Frank–Starling
(raising preload raises EDV and stroke volume, and filling pressure with them);
afterload sensitivity, and that it is *greater* in a ventricle with a low Ees;
that a falling Ees lowers EF with the rest of the circulation held still; that
the simulated failing state opens its aortic valve later than the simulated
normal one, visible as a longer gap before the shaded ejection band. None of
these are encoded — each is a consequence, and each has a test. That last one is
a statement about these two simulated states rather than about HFrEF in general:
isovolumic contraction time in real patients also moves with heart rate,
loading, conduction and contractile reserve, and this model varies only some of
those.

**What has not changed.** Every medical constraint recorded in this audit still
holds and is still enforced by tests: pulmonary congestion remains a
haemodynamic overlay rather than a structural stage and is not specific to
HFrEF; blood never crosses a valve backwards; end-systolic residual blood is not
stasis; model-derived myocardial mass stays out of the UI; particle motion is
not CFD; the trajectory is one illustrative pattern, not a natural history. The
illustrative figures the medical review looked at are reproduced by the new
model to within the ranges recorded in `tests/hemodynamics.test.js`.

**The trajectory the model now produces**

| Stage | EDV | ESV | SV | EF | HR | CO | LVEDP | Mean LAP | Mean PVP | BP | ED wall | RWT |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| Normal | 116 mL | 49 mL | 68 mL | 58 % | 70 | 4.7 L/min | 7 mmHg | 7 mmHg | 10 mmHg | 107/67 | 9.0 mm | 0.37 |
| Concentric hypertrophy | 107 mL | 44 mL | 64 mL | 59 % | 74 | 4.7 L/min | 12 mmHg | 12 mmHg | 14 mmHg | 120/81 | 14.0 mm | 0.58 |
| LV dilation | 165 mL | 103 mL | 62 mL | 38 % | 76 | 4.7 L/min | 17 mmHg | 16 mmHg | 19 mmHg | 113/75 | 11.6 mm | 0.40 |
| Systolic dysfunction (HFrEF) | 203 mL | 147 mL | 56 mL | 28 % | 82 | 4.6 L/min | 23 mmHg | 22 mmHg | 24 mmHg | 113/78 | 10.4 mm | 0.32 |
| (congestion overlay high) | 236 mL | 185 mL | 51 mL | 21 % | 88 | 4.5 L/min | 29 mmHg | 26 mmHg | 28 mmHg | 115/82 | 9.8 mm | 0.28 |
| (slider end) | 251 mL | 202 mL | 49 mL | 19 % | 89 | 4.3 L/min | 32 mmHg | 29 mmHg | 31 mmHg | 115/84 | 9.4 mm | 0.26 |

Every column except HR, ED wall and RWT is now solved rather than tabulated;
heart rate, wall thickness and the cavity axis ratio remain prescribed inputs
because the circulation model says nothing about them. Compared with the table
audited above, the volumes and EF are essentially unchanged, the arterial
pressure now rises at the hypertensive concentric stage and falls back as
output declines, and the filling pressures are new.

**New limitations introduced by the model itself**

- **It is a lumped-parameter model.** Each compartment carries a single
  pressure. There is no inertance and no wave propagation, so fine features of
  the pressure waveforms (the dicrotic notch, for one) are absent.
- **The pulmonary venous compartment lumps the capillary bed with the veins.**
  Its pressure is used as the hydrostatic pressure driving transudation, which
  is the right quantity for the overlay, but it is not separately a pulmonary
  capillary wedge pressure and should not be read as a measured one.
- **The vein-to-atrium segment has no valve**, so blood moves back into the
  pulmonary veins during atrial contraction. This is real — it is the atrial
  reversal wave on pulmonary venous Doppler — but the lumped approximation makes
  it larger than it should be (about 8–13 mL per beat here). Net transport over
  a beat is forward and equals stroke volume, and nothing in the visualization
  draws it.
- **Mean arterial pressure stays near 95–110 mmHg across the whole trajectory.**
  Internally consistent, because systemic resistance rises as cardiac output
  falls only modestly — but flatter than many real HFrEF courses, where blood
  pressure falls. Recorded here rather than tuned away, because the parameters
  that produce it are the ones that produce the reviewed volumes and pressures.
- **The congestion landmarks remain a judgement.** Four numbers map pulmonary
  venous pressure onto how much overlay is drawn. They are anchored to the usual
  clinical landmarks, but real patients vary widely, and chronic heart failure
  tolerates pressures that would cause oedema acutely.
- **No neurohumoral control.** Heart rate, circulating volume and systemic
  resistance are prescribed along the trajectory rather than regulated. There is
  no baroreflex, no RAAS, no exercise reserve — so the model still cannot show
  *why* a patient is symptomatic.


---

## Addendum — 2026-08-25 (second pass): calibrating the low-pressure side

A consistency audit after the pressure-waveform panel went in. Plotting the
pressures made a defect visible that the read-out had hidden: on the waveform,
the whole left-atrial trace and the normal ventricle's diastolic pressure sat on
the floor of the axis.

### Finding 1 — the left atrium's passive term was calibrated too low

**Not** the reported LVEDP, which at 8.6 mmHg was already inside the 6–10 mmHg
band this was checked against. The defect was one compartment upstream.

The atrium's end-diastolic pressure–volume relationship carried a scale factor
(`edpvrA`) of 0.35, so across the volume the atrium actually operates over its
passive term contributed only 1–3 mmHg. Essentially all of its pressure came
from the contraction term instead, and two things followed — both visible only
once the pressures were plotted:

| Normal state | Before | After | Test guard |
|---|--:|--:|---|
| LV end-diastolic pressure | 8.6 mmHg | 7.2 mmHg | 6–10 |
| Mean left atrial pressure | 3.8 mmHg | 7.5 mmHg | 6–12 |
| Mean pulmonary venous pressure | 6.3 mmHg | 9.9 mmHg | 6–13 |
| Atrial trough | 0.7 mmHg | 4.8 mmHg | above zero |
| v-wave, above the trough | +4.9 mmHg | +7.3 mmHg | a real excursion |
| a-wave, above the trough | +11.1 mmHg | +3.2 mmHg | a real excursion |

First, the v-wave — the atrium filling from the pulmonary veins against a shut
mitral valve — barely registered, because filling a near-incompressible-pressure
reservoir does not raise its pressure. Second, and the reason it mattered here,
mean atrial pressure sat several mmHg under the ventricle's end-diastolic
pressure, which left the pulmonary circulation only loosely coupled to the
ventricle it is supposed to be backing up behind.

**Fix.** `leftAtrium` moved from `{ ees: 0.35, v0: 5, edpvrA: 0.35 }` to
`{ ees: 0.25, v0: 15, edpvrA: 2.0 }`, raising the passive term to roughly
4–12 mmHg over the same operating volume. Circulating volume was raised 3 %
across the keyframes to hold stroke volume where it was after the stiffer atrium
redistributed blood out of the ventricle. Nothing was offset at the display
layer.

These are **calibration parameters of this lumped model**, not measurements. The
local slope of the relationship is not a clinical atrial compliance and should
not be read against one: it is a single exponential fitted to make one
compartment of a seven-compartment loop produce pressures in the right range,
with no atrial wall mechanics, no viscoelasticity and no reservoir/conduit/pump
decomposition behind it.

**Re-verified after the change:** EF (58 → 19 %), stroke volume (68 → 49 mL),
cardiac output (4.7 → 4.3 L/min), valve opening and closing phases, PV loop
closure and tangency to both relationships, Frank–Starling, and afterload
sensitivity — which remains about twice as large in the failing state (13.3 %
stroke-volume loss for a 30 % resistance rise, against 6.6 % in the normal
state). Resting cardiac output is now ~4.7 L/min rather than ~5.0; still well
within the normal range, and a result rather than a target.

### Finding 2 — the congestion overlay was already model-derived, but weakly coupled

The overlay was **not** a hand-entered level, and it was **not** driven by LVEDP:
it already read the solved mean pulmonary venous pressure. What was wrong was
the strength of the coupling, which is Finding 1 again — a state with an atrium
in the twenties reached the pulmonary side only weakly.

With the atrium recalibrated, mean LA pressure and mean pulmonary venous pressure
now track the ventricle across the whole trajectory (7 → 29 and 10 → 31 mmHg),
and the landmarks were re-anchored to the new pressures: the front spreads
linearly from 12 to 30 mmHg, interstitial fluid appears as a soft threshold
between 22 and 32. A test now asserts that any state with a mean LA pressure of
20 mmHg or more shows a substantial overlay, that the chain LA → pulmonary vein →
overlay is monotone with no step, and that a normal atrium shows nothing at all.

The four landmarks remain the only judgement in the overlay, and they remain a
rendering map rather than a quantification of lung water: how much fluid actually
crosses into the interstitium depends on capillary permeability, oncotic pressure
and lymphatic clearance, none of which this model has.

### Finding 3 — over-generalised wording on the waveform

"Isovolumic contraction lengthens as the ventricle weakens" was stated as a
general fact. It is a property of these two simulated states: real isovolumic
contraction time also moves with heart rate, loading, conduction and contractile
reserve, and this model varies only some of those. Reworded throughout — panel
documentation, notes, audit and the test name — to "the simulated HFrEF state
opens its aortic valve later than the simulated normal one".

The atrial trace is **not** flat: it carries a v-wave during ventricular systole
and an a-wave in late diastole, each a real excursion above the trough and each
falling where its mechanism puts it. Which of the two is taller is left as an
outcome rather than asserted — in real left atria the v-wave usually is, but that
ordering moves with rate, atrial contractility and loading, and this model is not
in a position to guarantee it. What the trace does not carry is documented in
`docs/medical-notes.md` — no separable x and y descents, no c-wave, and no
dicrotic notch on the arterial trace, all consequences of the lumped-parameter
approximation.

### Scope

Model and documentation only. No new features. The UI components, reel sequence
and amyloid scene were not touched, beyond the panel wording above.

### Follow-up — tightening the claims, not the model

A pass over what the tests and notes were *asserting*, with the recalibration
itself left alone. Three claims were stronger than the model can support and
have been withdrawn:

- **`mean LA pressure ≈ LVEDP` as an invariant.** Often true in a healthy heart,
  and it is why a wedge pressure is a useful proxy — but how close the two run
  depends on rate, ventricular stiffness and the valve, so it is not something to
  hold a model to. The two are now range-checked independently, and the coupling
  is asserted where the valve actually enforces it: a bounded trans-mitral
  gradient during filling that has closed to under 1 mmHg by valve closure.
- **`v-wave > a-wave` as a requirement.** Replaced by checks that both waves
  exist as real excursions, that the v-wave precedes the a-wave, and that the
  v-wave peaks while the ventricle is ejecting or just after — its mechanism —
  with the whole trace bounded below by zero and above by arterial systolic.
- **"physiological atrial compliance is 10–20 mL/mmHg".** Removed. It was also
  arithmetically wrong for these parameters: the figure came from the slope at
  the unstressed volume, whereas over the volume the atrium actually operates the
  exponential has stiffened to a few mL/mmHg. The EDPVR coefficients are
  described as calibration parameters throughout now, with no clinical compliance
  claim attached.

Normal-state figures were re-read from the model and made consistent across the
notes, this audit and the tests: LVEDP **7.2 mmHg**, mean LA pressure **7.5**,
mean pulmonary venous **9.9**, atrial trough **4.8**, v-wave **12.1**, a-wave
**8.0**.
