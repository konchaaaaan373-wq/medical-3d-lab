# Beta publication decision — `cardiac-output`

**This is an engineering acceptance, not a medical sign-off.** It records that
what this scene puts on screen was driven in a real browser and checked against
the model that produced it, by whom, on what date, and — at least as
importantly — what was **not** checked.

**No clinician has read this model.** The clinical-review registry records
`cardiac-output` as `pending`, the scene carries its `alpha` badge and a
`医学レビュー：未完了` chip on every surface, and nothing in this document is a
substitute for the review that has not happened. It is published anyway, on the
repository owner's decision of 2026-09-22, and that decision is written down in
[`../architecture/adr-2026-09-22-mechanism-scene-in-beta.md`](../architecture/adr-2026-09-22-mechanism-scene-in-beta.md)
rather than left to be inferred from the fact that the page opens.

| | |
| --- | --- |
| **Decided at** | 2026-09-22 |
| **Decided by** | Repository owner's decision to publish this scene and to stop the beta being anatomy-only; carried out and recorded by Claude Code (AI engineering agent) |
| **Role** | `engineering` — software behaviour and agreement with the model, not physiological or clinical judgement |
| **Assets** | none. The geometry is **procedural**, so there is no external file, no licence obligation and no hash to pin |
| **Scene revision** | model card revision **5**, source digest `9482474ed50d1090` |

The decision is pinned to that scene revision in
[`src/catalog/release.js`](../../src/catalog/release.js). Change what the model
solves or what a control does and `npm run revisions:check` fails until the card
is revised, which moves the revision and closes this record until it is taken
again.

## The claim this scene makes, and the ones it does not

**One solved beat, read six ways.** Four inputs — circulating filling, systemic
resistance, contractility and heart rate — are moved one at a time, and the 3D
ventricle, the metric read-out, the pressure-volume loop, the pressure waveform,
the circuit and the sequence captions are all derived from the *same* solved
cycle. Nothing on screen is a multiplier applied to a result.

**It is a representative circulation, not anybody's.** `personalization:
representative`. There is no reflex regulation in it: raise the resistance and
nothing raises the heart rate back, because no baroreflex is modelled. The
reference condition is a **calibration** chosen so a healthy case lands where
textbooks put it, not a measurement of a person.

**It refuses rather than guesses.** An input outside the range the sweep covered
is refused, not clamped, and a beat that did not settle to periodicity across
all seven compartments reports **no figures at all** — `metrics: null` — so a
reader is never shown an unconverged number wearing units.

**It prohibits, in its own profile:** diagnosis, treatment-selection,
dose-selection and prognosis. The scope panel says so on screen, in both
languages, on the same surface as the numbers.

**The two interventions are directions, not doses.** "More circulating filling"
raises the model's stressed volume by one schematic step; there is nowhere in
this model for fluid to leave to, so it cannot say how much anyone should be
given or whether they should be. Dobutamine raises elastance and lowers
resistance and **holds heart rate**, because the one study this repository has
read reports no rate change over 2.5–10 µg/kg/min in thirteen patients with
cardiomyopathic heart failure — read as the published abstract only. The
response sizes are illustrative and no coefficient is fitted to that study.

## What was checked

Driven in a real browser (Chromium, 1440×900, software GL) by
[`scripts/check-disease-interaction.mjs`](../../scripts/check-disease-interaction.mjs):

- baseline → each of the four controls → reset, with the read-out compared
  before and after, and the scene returned to where it started;
- both plots in the Data view actually drawn — counted by colour on the canvas,
  not by the panel having been mounted;
- comparison mode on, with the reference rows present and reading the baseline
  rather than the button that was last pressed;
- the lesson walked end to end, with its before/after table read while it was on
  screen (SV 68 → 61 mL, MAP 89 → 116 mmHg, ESV 49 → 58 mL);
- the 15-second sequence recorded through the consent screen, written to a file,
  and the file played back in the browser with a frame captured from it.

Numerically:

- [`scripts/sweep-cardiac-output.mjs`](../../scripts/sweep-cardiac-output.mjs) —
  865 conditions across the declared domain. Worst periodicity residual
  0.075 mL against a 0.5 mL tolerance; worst disagreement between stroke volume
  and valve throughput 0.024 mL; conservation error 0.000 mL.
- `npm test` — 2878 assertions, 0 failures, including the model tests, the
  physiology direction tests, the scene tests and the release tests.
- Fourteen guards were broken on purpose, one at a time, confirmed red, and
  restored: the resistance unit factor, the solution cache key, the fixed
  myocardial volume, the release gate, figures from an unsettled beat,
  intervention compounding, dobutamine's heart rate, a hand-written number in
  the video copy, a clamped intervention, the Data button, the comparison
  baseline, session restore, beat-phase continuity, and the blood field's
  buffers.

## What was **not** checked

- **No clinical review.** The registry records `pending`. No clinician, and no
  physiologist, has read this model, its reference condition, its presets, its
  intervention magnitudes or its wording.
- **No external validation.** `mechanismLevel: mechanistic`, not
  `literature-calibrated` and not `externally-validated`. The reference
  condition and the reduced-contractility preset are chosen magnitudes.
- **The interventions' sizes are illustrative.** The cited study's effect sizes
  are not transferable to this model's parameters and are not claimed.
- **Whether the domain's edges are sensible teaching**, as opposed to merely
  solvable, is an open question — `docs/follow-ups.md` F-180.
- **One engine, one form factor.** Chromium on a desktop viewport. No real
  iPhone Safari, no Firefox or WebKit recording (F-184), and on a phone the 3D
  sits under the console the same way `heart-failure` does (F-188).
- **No reader has been observed using it.** Whether four controls at once is the
  right number to hand somebody is a teaching question nobody here has answered.
