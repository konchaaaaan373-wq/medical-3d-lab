# The three layers of tests

A test that goes red should tell you what kind of thing has gone wrong. Until
the final clinical review of the three model-backed scenes, this suite could
not: an assertion that a bronchodilator lowers total resistance more than it
lowers the flow ceiling sat in the same file, under the same heading, as an
assertion that raising airway resistance lengthens the expiratory time
constant. One of those is a fact about lungs. The other is two percentages this
repository invented. A reader could not tell which failure would have been a
medical problem.

So the tests are now three kinds, and **which layer a claim is checked in is
part of the claim.** The vocabulary lives in
[`src/models/evidence.js`](../src/models/evidence.js) as `LAYER`, every entry in
the confidence registry declares which layer defends it, and
[`evidence.test.js`](evidence.test.js) checks the declaration against the file
the named test actually lives in.

---

## Layer 1 — external physiology

**Files:** [`circulation-physiology.test.js`](circulation-physiology.test.js),
[`respiratory-physiology.test.js`](respiratory-physiology.test.js),
[`portal-haemodynamics.test.js`](portal-haemodynamics.test.js),
[`hepatorenal-physiology.test.js`](hepatorenal-physiology.test.js)

Propositions the literature requires, which would be true if this repository
did not exist. Directions, orderings, sufficiency conditions, independence
conditions.

**No assertion in this layer may depend on a constant this repository invented
or calibrated.** Every test here must survive re-tuning.

**The test that decides the layer is one question:**

> **If this assertion failed, could I honestly say the medicine was wrong?**

Containing no repository constant as a literal is not enough. Phrases that
almost always mean an assertion has failed that question:

| Phrase | What it usually means |
| --- | --- |
| `the model can …` | a capability of a parameterisation, not a fact about people |
| `at any severity`, `at every step` | a chosen path through parameter space |
| `same kidney`, a counterfactual | a construction this repository invented |
| `without touching …` | a deliberate isolation in the model |
| `strictly` across a whole slider | a chosen effect size over a chosen range |
| anything reading copy, a chart or `MODEL_SCOPE` | a contract, not a physiological invariant |
| an exact equality between model outputs | wiring |

Under that rule the hepatorenal external layer went from fourteen tests to
twelve — two moved out entirely and five were narrowed. **Do not keep a test in
this layer to preserve a count.** A small pure layer is worth more than a large
mixed one.

Two tests moved out for the narrower reason that their *result* depended on
repository-selected gains:

- *dilating one bed lowers the resistance of the whole circulation* — asserted
  through the full coupled model, where the other beds constrict and whether the
  total still falls depends on `SYSTEMIC_CONSTRICTION_GAIN`. The external law is
  the parallel one **with the other conductances held fixed**; the coupled
  outcome is `calibration: the constriction gain leaves the resistance fall
  intact`.
- *worsening cirrhosis raises cardiac output and still lowers arterial
  pressure* — the rising output is a consequence of the chosen compensation
  exponent, and cardiac output has been observed to *fall* at the onset of
  hepatorenal syndrome. What stayed external is the arithmetic of incomplete
  compensation and the existence of the low-output path. There are no
magnitudes, no ratios between two invented numbers, and no thresholds that came
out of this repository rather than out of a paper. Where an ordering is
genuinely external — "the peripheral airway narrows more than the central one" —
it is asserted as an ordering and never as a factor.

Nothing in this layer reads a caption, a chart or a stored answer.

> **A failure here, and only here, licenses the sentence "the model has broken
> a constraint the physiology imposes."**

One number appears in this layer that this repository did not choose: 12 mmHg,
because it comes from Baveno VII and the TIPS literature. The test that mentions
it asserts *where the number belongs* — that it is not a band boundary — rather
than that this model reaches it.

## Layer 2 — model integrity

**Files:** everything else. `copd-model.test.js`, `asthma-model.test.js`,
`portal-hypertension-model.test.js`, `hepatorenal.test.js`, the `*-scene.test.js`
and `*-reel.test.js` files, `model-layer.test.js`, `catalog.test.js`,
`evidence.test.js`, and the rest.

Conservation, finiteness, determinism, solver convergence, and the
internal-consistency chain: the chart is the model, the read-out is the model,
the 3D is the model, and the stored answer in a lesson is the model's own
output.

Flow conservation at the portal vein lives here rather than in layer 1. It is a
property of the implementation, not a finding about people — but without it
every pressure the model reports would be meaningless, which is why it is a test
at all.

> **A failure here means the implementation is broken, or that two parts of the
> repository have drifted apart. It says nothing about the physiology.**

## Layer 3 — calibration behaviour

**File:** [`calibration.test.js`](calibration.test.js)

That the parameterisation this repository *chose* still behaves the way it was
chosen to behave. The reference lung's time constant. The bronchodilator's
28%-against-10% split. The peripheral-to-central constrictibility ratio. The
dynamic component at 30% of the structural resistance. The healthy liver's
gradient and flow. Whether a fully dilated shunt clears 12 mmHg.

These are worth having — a calibration that silently drifts is how a scene stops
matching the figures it was built against — but every one of them is a number
this repository invented or tuned, and none is a fact about a lung or a liver.

> **A failure here means a choice this repository made has changed, which may
> well be deliberate. It is never evidence that the medicine is wrong, and no
> report, commit message or PR body may present it that way.**

---

## The rule, and how it is enforced

> A claim about the world is checked in the external or integrity layer.
> A claim about this model's own parameterisation is checked in the calibration
> layer. Never the other way round.

Enforced twice:

1. **At import.** `defineEvidence` in `src/models/evidence.js` throws if an
   `established` or `supported` entry names a test in the calibration layer, or
   if a `calibration`, `illustrative` or `approximation` entry names a test
   anywhere else.
2. **Against the filesystem.** `evidence.test.js` reads every test title in
   this directory, works out which file it lives in, and checks that against
   what the registry declared — because an entry can claim a layer while its
   test sits somewhere else, and then the separation is a comment rather than a
   fact.

## Confidence levels

Six, in `src/models/evidence.js`. The line that matters is between the first two
and the rest: an `established` or `supported` claim is something the model
asserts about the world; everything else is something the model needed in order
to run.

| Level | Meaning | Layer |
| --- | --- | --- |
| `established` | Settled in the literature, or following from physics or definitions. | external or integrity |
| `supported` | A direction, ordering or mechanism named sources support, whose size the model does not claim. | external or integrity |
| `approximation` | A real law or structure applied outside the regime where it holds, used for a relative statement only. | calibration |
| `calibration` | A number chosen so a reference case lands where the literature puts it. | calibration |
| `illustrative` | A number invented because the model needed one and none was available. | calibration |
| `uncertain` | A claim the sources do not settle, or a direction known to be wrong under some conditions. Recorded, not asserted. | — |

## Running them

```bash
npm test                                       # the full six-hundred-plus suite
node --test tests/circulation-physiology.test.js tests/respiratory-physiology.test.js tests/portal-haemodynamics.test.js tests/hepatorenal-physiology.test.js   # layer 1
node --test tests/calibration.test.js          # layer 3
node --test tests/evidence.test.js             # the separation itself
```
