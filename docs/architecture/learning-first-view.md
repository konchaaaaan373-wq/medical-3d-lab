# Learning-first view

**Status:** accepted · 2026-08-26 · applies to `src/app/`, `src/components/`,
`src/scenes/heartFailure/`

## The problem

The Heart Failure scene had grown into a dashboard with a 3D model in it. At
1440×900 the panels covered **53.8%** of the viewport and the ventricle was
**37.6%** of the frame height. Everything on screen was correct; none of it was
the subject. Two separate things also shared one set of controls:

- **remodeling** — minutes to years, four states of one ventricle
- **one heartbeat** — under a second, what that ventricle does every cycle

A button labelled *Play* advanced the first while the second ran on its own, so
"what is playing?" had no answer a viewer could reach.

## The decision

**The 3D is the explanation. Everything else supports it.**

### Two views, one scene

`Learning` is the default: the 3D, contextual labels, and a compact console.
`Data` adds the pressure–volume loop, the waveform, the read-out and the loading
sliders — and keeps the 3D at full size. Data view is not a different page; it
is the same scene with its working shown.

`#ui[data-view]` carries this. Anything that belongs only to Data view is marked
`.data-only` in the markup rather than being conditionally built, so the two
views cannot drift apart.

### One camera, framed for the whole subject

`framing.js` scales the scene's authored pose by aspect and by view. The
learning-view constants are set against the **whole subject** — ventricle,
atrium, pulmonary veins and the congestion overlay — not the ventricle alone.
Framing for the ventricle alone pushed the pulmonary side off the top of the
frame, which is the end of the causal chain the scene exists to show.

The ascending aorta and arch may crop at the top. They are context, and framing
for them costs the subject about a fifth of the frame — but that is a default,
not a limit. The camera control (`− ⛶ +`, next to the utilities) zooms out far
enough to bring them back and in far enough that the cavity fills the window,
and the zoom is remembered as a **multiplier on the framing** rather than as a
camera distance, so it survives stage changes, the view toggle and a resize.
`View` — the middle of the three — puts both the framing and the zoom back.

Wheel and pinch feed the same number, so the gesture and the buttons never
disagree. The general-purpose model can therefore stay information-dense while a
viewer explaining one point to one person pushes everything else out of frame.

### Two axes, two names

The remodeling axis is navigated by its four stages. The continuous slider and
the percentage read-out are Data view only: a number like "93%" invites being
read as severity, which it is not. The button that advances it is **Progression**,
not Play.

The heartbeat is never on that axis. It runs continuously, and the guided
sequence takes it over only in Part B.

### The sequence is animation, not slides

`storyboard.js` holds the sequence as data and `StoryMode.js` runs it. Each step
is a **state of the visualization** — where the camera is, what the model is set
to, which one label is pointed at, what is emphasised — and the caption is a
label on what is already moving.

Part A walks the four remodeling stages. Part B freezes that axis completely and
slows one beat down: filling, contraction, ejection, residual, filling pressure,
transmission, congestion.

## Constraints this must keep

- **Pressure transmission is never drawn as blood moving backwards.** The
  congestion overlay is a separate visual language from the blood particles, in
  a separate colour, and the blood shader has no backward path.
- **Nothing is revealed that the model does not produce.** `setCongestionReveal`
  takes multipliers on the solved state, so it can only show less than what is
  there, never more.
- **One medical state.** The label over the 3D, the phase name on each plot, the
  highlighted leg of the loop and the shaded ejection band are all
  `beatPhaseAt(phase, state)` read at the same phase.
- **Presentation values are named as presentation values.** `setBeatEmphasis`,
  `setOutline`, `setCongestionEmphasis` and `setCongestionReveal` change nothing
  the model computes, and say so in their own documentation.

## Where it ended up

At 1440×900: panels cover **20.2%** of the viewport, against 53.8%. The
ventricle is **43%** of the frame height, against 37.6%. Data view is one click
away and keeps the 3D at full size.
