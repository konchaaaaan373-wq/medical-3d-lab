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

**Files:** [`respiratory-physiology.test.js`](respiratory-physiology.test.js),
[`portal-haemodynamics.test.js`](portal-haemodynamics.test.js),
[`hepatorenal-physiology.test.js`](hepatorenal-physiology.test.js)

Propositions the literature requires, which would be true if this repository
did not exist. Directions, orderings, sufficiency conditions, independence
conditions.

**No assertion in this layer may depend on a constant this repository invented
or calibrated.** Every test here must survive re-tuning. There are no
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
npm test                                       # all five hundred and seventy-odd
node --test tests/respiratory-physiology.test.js tests/portal-haemodynamics.test.js tests/hepatorenal-physiology.test.js   # layer 1
node --test tests/calibration.test.js          # layer 3
node --test tests/evidence.test.js             # the separation itself
```
