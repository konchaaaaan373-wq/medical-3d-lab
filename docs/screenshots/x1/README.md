# X1 — the brain's standard directions and its composition

Two things, in two sets.

## `posterior--*` / `inferior--*` — the two viewpoints that did not exist

Rendered with the interface hidden, one camera per view, both colour modes.
`left-lateral--*` is beside them as the reference the other six views were
already checked at. Conditions are the ones in
[`../b3-1/README.md`](../b3-1/README.md): production build, 1280×720 at device
pixel ratio 1, Chromium 141.0.7390.37 headless, anatomy layer 0 %.

The inferior view is tilted forward in the midline plane rather than placed
directly below. Straight below, the camera looks along its own up vector, there
is no roll to derive, and the model arrives at whatever angle the arithmetic
produces — the first attempt did exactly that, and the base landed on a
diagonal. Tilted, the midline is vertical and left and right are readable.

## `framing/ui-<size>-before|after` — the composition, with the interface on

**Labels and panels on, because that is what a reader sees.** These are the
pair for F-36.

| | |
| --- | --- |
| **before** | `2a2b5a0` — eight viewpoints, framed to the canvas |
| **after** | this commit — framed to the band the header, console and panel leave |
| **Sizes** | 1280×720, 375×667, 844×390 |
| **Browser / build** | as above; the site served locally, consent dismissed |

At **1280×720** the model was clipped at the top by the header and ran under the
docked panel on the right, with the lower left empty. After, it is whole,
clear of both, and centred in the band between them.

At **375×667** it was small and low. After, it fills the band between the
summary at the top and the console at the bottom — the panel there is a
top-anchored summary, not a right-hand rail, and the fit follows where the
element is rather than which element it is.

At **844×390** the console takes more than half the height. The model is small
because the band is small, and it is complete and centred in what is left; how
much room the console takes in landscape is a layout question, not a framing
one, and is not touched here.

## What these are not

One engine, headless, on a desktop. They show the composition and the
directions; whether the two new views show what an anatomist would call the
posterior and inferior surfaces of a brain is **pending** review, like the rest
of this model.
