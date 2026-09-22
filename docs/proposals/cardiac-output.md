# Scene Proposal — cardiac output

Scene id: `cardiac-output` · 心拍出量 · system `cardiovascular`, organ `heart`

## Central Question

**When you change what returns to the heart, what it pushes against, how hard
it squeezes, or how often it beats — what happens to stroke volume, cardiac
output and blood pressure, and why?**

Cardiac output and blood pressure are usually learned as two separate things to
memorise. They are one thing: the result of a pump and a vascular bed
interacting. This scene exists so a reader can move one factor at a time and
watch both answer.

## Why 3D?

Filling, residual volume, wall motion and ejection happen in the same chamber
at the same time, and the relationship between them is what the question is
about. A still figure can show a pressure-volume loop; it cannot show that the
loop's bottom-right corner *is* the fullest moment of the ventricle you are
looking at.

The vascular side is deliberately **not**精密3D — the systemic bed is a
schematic segment whose calibre is a qualitative tone cue, and it says so.
Modelling every vessel would be 3D for its own sake.

## What changes over time?

Within a beat: filling, isovolumic contraction, ejection, isovolumic
relaxation — all read from the solved flows, so the valve events move when a
condition moves.

Between conditions: the settled beat itself. **This is a comparison of steady
states, not a time course**, and the scene has to say so rather than let the
transition read as a drug taking effect.

## Medical Model

`src/models/cardiacMechanics.js` — the existing closed-loop seven-compartment
time-varying elastance circulation — reached through a new thin boundary,
`src/models/cardiacOutput.js`. No second circulation model. No result
multipliers.

The boundary owns: the four-input domain and its units, refusal of anything
outside it, and the verdict on whether a beat actually settled (all seven
compartments periodic, volume conserved, no valve reversed, aortic throughput
equal to the stroke volume). A condition that fails any of those produces no
numbers at all.

## Interactive Element

Four controls, each naming the quantity it actually moves:

| Control | Moves | Read as |
| --- | --- | --- |
| 循環充満 Circulating filling | circulating stressed volume, mL | EDV, filling pressure, SV, CO |
| 体血管抵抗 Systemic resistance | systemic vascular resistance, mmHg·s/mL | arterial pressure, LV pressure, ESV, SV, CO |
| 収縮力 Contractility | LV end-systolic elastance, mmHg/mL | residual volume, EF, SV, CO, filling pressure |
| 心拍数 Heart rate | rate, /min | per-beat and per-minute output |

Two presets: the reference heart, and a reduced-contractility heart that
differs **in end-systolic elastance and nothing else**. The existing HFrEF
progression axis is deliberately not reused here: it moves contractility,
shape, filling, resistance and rate together, which is the right thing for a
remodelling story and a confound for a one-factor experiment.

No progression slider (`meta.progression.enabled = false`), as `circulation`
does.

## Visual Outputs

- **3D** — a cut left ventricle whose cavity is the solved volume at the
  current phase, with the myocardial volume **fixed at the reference
  condition** so an acute manipulation cannot grow muscle; the valves opening
  and shutting on the solved flows; blood as flow visualisation, not velocity;
  a schematic circuit with the systemic resistance segment marked.
- **Metrics** — CO, SV, MAP always; EDV, ESV, LV end-diastolic pressure, mean
  pulmonary venous pressure, EF, pressures in detail. Resistance is shown on
  its own control, in both units.
- **Graphs** — the pressure-volume loop with the two relationships that
  generated it, and the pressure waveform with the ejection window shaded from
  the solved valve times.
- **Comparison** — the condition before the current manipulation, on the same
  scale and the same axes.

All of it reads one solved beat.

## SNS Hook

Raise the resistance: the pressure goes up and the output goes down, at the
same time, on the same screen. Fifteen seconds, with the numbers read out of
the model rather than written into the script.

## Educational Module

One, to begin with: *raise systemic vascular resistance — what happens to
stroke volume, and what happens to mean arterial pressure?* Predict, move the
same control the sliders move, compare, explain. The stored answer is
re-derived from the model by a test.

## Accepted Simplifications

No reflex regulation of any kind. No right atrium (so no CVP). No venous tone
as a controllable. Systolic duration a fixed fraction of the cycle, so
tachycardia is under-represented. No oxygen delivery, extraction or
consumption. No valve disease, arrhythmia or pericardial constraint. No
pharmacokinetics and no time to effect. Circulating stressed volume is not
blood volume and not a volume of fluid to give.

Every one of these is in the model card and on the scope panel.

## Validation

- `SV = EDV − ESV`, `CO = HR × SV / 1000`, `EF = SV / EDV`.
- MAP is the time average of the arterial trace, checked against an independent
  integration and shown to differ from the bedside estimate.
- `ΔP = Q·R` across the systemic bed, in the model's units, with the resistance
  conversion checked against the independent bedside `×80` route.
- Every condition in the declared domain settles into a genuinely periodic
  beat: all seven compartments, volume conservation, valve direction, aortic
  throughput.
- The same condition gives the same answer cold, warm-started, and after
  A → B → A.
- A solution that did not settle carries `metrics: null`.
- Directional claims are asserted **with their conditions**. "Raising the rate
  raises the output" is deliberately not encoded, because it is not true.

## What is out of scope for the first version

Publication. This scene is registered `alpha` and is not a beta candidate; the
beta publishes anatomy. Noradrenaline, which cannot be represented as a
resistance change alone and needs venous capacitance first. Any second
intervention beyond the two in the first version. Oxygen delivery, which
`circulation` already owns.
