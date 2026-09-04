# Spatial inspection surface

**Status:** accepted · 2026-09-03 · applies to every scene hosted by
`src/app/App.js`

## Why this exists

The interactive lesson [Female pelvic floor — basic 3D anatomy][reference]
demonstrates a useful interaction grammar:

1. choose the structure or display state;
2. keep spatial context, hide it, or make it translucent;
3. inspect from repeatable viewpoints;
4. change the background for the job at hand;
5. export exactly the view that was composed.

The value is not its white background, its sliders, or a particular anatomy
asset. The value is that **selection, visibility, viewpoint and export form one
coherent inspection instrument**. A learner can make a spatial claim, reproduce
the view, and turn that view into teaching material without leaving the model.

medical-3d-lab must apply that grammar without becoming a generic anatomy
viewer. Most scenes here are dynamic causal models. A universal “bone opacity”
slider would be meaningless in an amyloid aggregation scene and could erase the
very pressure or flow signal a disease scene exists to explain.

This document defines the safe adaptation.

## The invariant: three state planes

| Plane | Examples | Owner | May change physiology? |
| --- | --- | --- | --- |
| **Medical state** | progression, preload, resistance, airway calibre, solved flow | model + scene | Yes — through the public model setters only |
| **Authored presentation state** | Story/Reel reveal, emphasis, camera cue, animation timing | Story/Reel + scene presentation resolver | No |
| **User inspection state** | free orbit, named view, background, label visibility, a scene-approved display mode | App + Viewer; optional scene display hook | No |

The third plane is intentionally separate from the second. Story may temporarily
direct attention; inspection expresses what the learner wants to look at. Neither
is allowed to call `setProgress()`, `setModelControl()`, or alter a value returned
by the medical model.

Renderable properties still need one final owner. If Story emphasis and user
inspection both affect one material, the scene must compose them in a named
resolver from immutable base values. Last-write-wins opacity is forbidden.

## What every model receives

Every scene gets the same low-level inspection surface, even when it implements
no optional hooks:

- **Home + repeatable model-relative views.** Home is the scene's authored
  teaching view. Safe oblique turns, opposite, tilt up and tilt down are generated
  around the same target and at the same distance. The oblique views deliberately
  avoid collapsing a shallow causal diagram edge-on. Their labels describe a
  camera move, not patient anatomy.
- **Calibrated backgrounds.** Graphite, neutral studio and paper are renderer
  presets. A preset changes backdrop, fog, environment, exposure and restrained
  bloom together; it is not a CSS-only recolour.
- **Label visibility.** Labels can be removed for an unobstructed spatial read
  without changing the objects or state they describe.
- **Display reset.** Resets background, labels, optional display mode, viewpoint
  and zoom only. It never resets model inputs or progression.
- **PNG export.** Existing current, square, portrait, Reel and wide exports retain
  the composed camera and background.

The surface is closed by default. The 3D remains the explanation and advanced
display controls do not compete with the first learning action.

## Scene-authored knowledge

A scene may replace the generated views when orientation itself carries medical
information:

```js
getInspectionViews() // [{ id, label, labelJa }]
getInspectionView(id) // { position: Vector3, target: Vector3 } | null
setInspectionView(id) // optional display-only side effect
```

`setInspectionView()` exists for cases such as a medial brain view, where the
contralateral shell must be hidden to expose the registered surface. It may alter
visibility or opacity; it may not move anatomy or modify medical state.

A scene may also expose a small, deliberate display choice:

```js
getInspectionModes() // [{ id, label, labelJa, preview? }]
getInspectionMode()  // id
setInspectionMode(id)
```

This is for semantically valid readings of the same state — for example a
labelled colour map and low-saturation natural anatomy. It is **not** permission
to add arbitrary colour pickers. Colours that encode oxygenation, pressure,
species, perfusion or pathology remain locked to the model's legend.

### Anatomical directions are earned

Only a scene with a documented anatomical coordinate system may use labels such
as anterior, posterior, left lateral, medial, superior or inferior. A molecular,
network or schematic scene uses model-relative camera verbs. This prevents a
generic UI label from making a false anatomical assertion.

### Layers describe meaning, not object hierarchy

If a future scene needs visibility or opacity controls, it must expose a few
semantic groups such as:

- **context** — neighbouring anatomy retained for orientation;
- **primary anatomy** — the structure the question is about;
- **mechanism** — flow, pressure, deposition or pathology produced by the model.

Do not surface Three.js group names, GLB node names, every material, or a generic
bone/muscle taxonomy. A control is justified only when changing it helps answer
the scene's central question. The scene must specify a safe minimum opacity and
compose the result with Story/Reel presentation state in one resolver.

## Short windows: what does not fit, and what was tried

The panel is a rail item. On a tall window the rail holds it and the read-outs
together. On a short one it cannot, and this is a measured limit rather than a
defect to tune away.

| Window | Band between navigation and console | Panel wants |
| --- | --- | --- |
| 932x430 · circulation | 103px | 355px |
| 932x430 · brain atlas | 179px | 419px |
| 320x568 | 199px | 417px |
| 390x844 | 514px | 417px — fits |

The console owns the bottom of the frame and spans its full width, so the band
is all there is. Two redesigns were built and measured against it, and both
were worse than scrolling:

- **Promoting the panel to a fixed overlay in the band.** Laying its sections
  out side by side did cut what it wants from 419px to 219px, but 219 does not
  fit in 103 either, and the panel then became an 81px strip of translucent
  chrome sitting over the title card and the read-outs. It read as a rendering
  fault.
- **Compacting it in place.** Tighter sections and denser grids recover about
  30px of a 250px shortfall. It does not change the outcome and costs legibility
  on the window that needed it most.

What ships instead: the panel keeps a usable floor, scrolls inside itself, and
fades its last pixels while content remains below. Every control is reachable —
the viewport check measures the panel opened and reports anything stranded — and
what sits past the fold is recorded rather than hidden.

Making this genuinely fit is a product decision, not a layout trick: it means
choosing what the inspection surface shows on a 430px-tall window, in what
order, at what density. Do not reintroduce a fixed overlay or a tuned constant
without measuring the band on the scene being changed.

## Reset semantics

“Reset” is intentionally not one operation:

| Control | Changes | Must not change |
| --- | --- | --- |
| **Reset model** | progression and model inputs | display preferences unless the new state requires a new authored frame |
| **Home view** | camera direction and zoom; view-specific reveal | background, labels, medical state |
| **Reset display** | background, labels, display mode, Home view | progression, model inputs, solved outputs |

This separation is testable. The App's inspection callbacks must have no route
to the medical setters.

## Visual language

The controls should read as a quiet instrument, not as branded decoration:

- 3D occupies the visual field; the inspection panel is compact and dismissible;
- rectangular controls, restrained radius, neutral surfaces and one UI accent;
- colour remains strong inside the model only when it carries meaning;
- backgrounds are named for use, not for mood;
- state is shown with border, fill and `aria-pressed`, never colour alone;
- touch targets remain at least 44 px on narrow screens and focus is visible.

## Reference boundary

The reference was studied from its public lesson, the supplied screen recording
and still image, and its public repository documentation. Its interaction
principles were re-derived for this product. **No source code, 3D model data or
assets from that lesson are copied into medical-3d-lab.** The reference
repository explicitly distinguishes permitted screenshots/recordings with
attribution from reuse of underlying model data; this implementation stays on
the interaction-design side of that boundary.

[reference]: https://satorumuro.github.io/Anatomy3D-Learning/lessons/female-pelvic-floor-basic/
