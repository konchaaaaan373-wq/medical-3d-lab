# `src/models/` — the medical layer

Everything in this directory is **pure JavaScript**. No `three`, no DOM, no
`window`. A model here can be imported by `node --test` on its own, and that is
the point: if a physiological claim cannot be checked without starting a
renderer, it is not really being checked.

## What a model is

One module per subject, exporting

- the **state** of the system as plain numbers in clinical units, and
- a **solver** that maps inputs to that state.

The scene, the read-out, the charts and the teaching text are all *readings* of
the same solved state. There is never a second equation for the number panel,
and never a curve drawn to make a graph look right. If the graph and the 3D
disagree, one of them is not reading the model.

## Rules

1. **Clinical units, clinical names.** `expiratoryTimeS`, `portalPressureMmHg`,
   `endExpiratoryVolumeL`. A quantity with a clinical name must be in the unit
   its name implies and must be the quantity that name means. See
   [`units.js`](units.js).
2. **No presentation values.** Opacity, glow, exaggeration and camera live in
   the scene. If a number exists only to make something visible, it does not
   belong here.
3. **Deterministic.** Same inputs, same outputs, every time. Heterogeneity
   between units is *seeded*, never sampled from `Math.random()` — a patchy
   lung that is different on every reload cannot be taught from.
4. **Fixed timestep.** Anything that integrates uses
   [`integrate.js`](integrate.js), so the physiology does not change when the
   frame rate does.
5. **Say what is assumed, in the code.** Every constant that came from a
   textbook or a paper carries the claim it encodes; every simplification says
   what it drops. The long-form version lives in `docs/model-evidence/`.
6. **A model may not know what it is for.** No scene ids, no stage names, no
   copy. A model that mentions the UI has stopped being a model.

## What these models are not

Educational conceptual models. Not patient simulators, not research solvers,
not validated against measured data. They are built so that the *direction and
the reason* for a change are right — raise expiratory resistance and end-
expiratory volume rises, and it rises because there is not enough time to empty
— and they are deliberately not built to predict a number for a person.
