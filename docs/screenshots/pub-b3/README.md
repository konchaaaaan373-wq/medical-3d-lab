# B3 — the skin, and the two organs it left behind

B3 opened as three scenes — the eye, the ear and the skin — and finished as
one. `npm run verify:anatomy` had nothing to say about the eye or the ear;
these pictures did.

| | |
| --- | --- |
| **Published** | `skin-anatomy` |
| **Held** | `eye-anatomy`, `ear-anatomy` (F-109) |
| **Assets** | none — all three are procedural |
| **Browser** | Chromium (Playwright `chromium-1194`), headless, SwiftShader WebGL2 |
| **`before/skin/`** | the three frames that each showed a defect |
| **`after/skin/`** | every viewpoint, by structure, after the three fixes |
| **`fit/after/`** | three published scenes re-framed by the fit correction (F-108) |
| **`held/`** | why the eye and the ear are not in this batch |
| **`framing-at-load/`** | a discrepancy found while fixing the check (F-110) |
| **How** | `npm run shots:anatomy -- --scene <slug> --preview --out <dir>` at 1280×720, interface hidden |

## 1. The frame was cutting the block in half

`before/skin/the-cut-face--by-structure.png` is the viewpoint called "the cut
face", with the whole subcutaneous layer below the bottom edge of the frame.
The fit had reported success: it was summing the subject's half-extents and
dividing by the frame's half-angle, which is an orthographic calculation on a
perspective camera, and a cube 3.2 across seen from under four units away has
a near face a third closer than its centre.

`after/skin/the-cut-face--by-structure.png` is the same viewpoint with the fit
solving the projection instead (F-108).

**This was never only about the skin.** Measured over the nine scenes already
published, the old fit put ten viewpoints across eight of them outside the
band. `fit/after/lung-anatomy--right-lateral.png` is the lung with its base
back in the frame — compare `../pub-b1/after/lung/right-lateral--lobes-and-vessels.png`,
where the lower lobe runs off the bottom edge. `fit/after/kidney-anatomy--left-kidney-hilum.png`
is the near kidney no longer cut off by the left edge; its before is
`../pub-b1/after/kidney/left-kidney-hilum--cortex-medulla-and-tract.png`.
`fit/after/liver-anatomy--diaphragmatic-superior-surface.png` is the third.
None of them is smaller than it was: the coverage default moved 0.78 → 0.88 in
the same change, because the old sum was over-filling the band by about that
much and every composition in the repository had been measured against it.

## 2. Two vessels, one of them invisible

`before/skin/what-goes-through-it--by-structure.png` has an arteriole and a
venule in it. Only the venule can be seen — the artery is the red rim behind
it. They were one curve and a copy of it displaced 0.12 along very nearly the
direction all five viewpoints look down.

In `after/skin/what-goes-through-it--by-structure.png` they run apart across
the block, the venous side deeper, which is the same pair and two structures a
reader can tell apart and click. The distance between them is a display value
like the layer thicknesses, and the model card and the profile say so.

## 3. A viewpoint named after something it did not show

`before/skin/follicle-and-sebaceous-gland--by-structure.png` is the viewpoint
called "Follicle and sebaceous gland". It is the block: both structures are
inside three opaque slabs. The anatomical-layer slider would have opened it,
but a viewpoint that needs a second control before it means anything is not a
viewpoint.

Hiding the layers alone was not enough — the framing fits whatever is drawn,
so with the vessels still in it the result was the "what goes through it" view
from a slightly different angle, two viewpoints and one picture.
`after/skin/follicle-and-glands--by-structure.png` hides what it is not about.

## 4. Why the eye and the ear are not here

`held/eye/anterior-oblique--by-structure.png` is what the eye opens as: very
nearly a white ball. The cornea and the anterior chamber are each drawn
double-sided, so four translucent layers stack over the iris and the pupil —
and the pupil's own colour is `#0b080c`. `held/eye/the-fundus--by-structure.png`
has three rectus muscles across the fundus. They are outside the sclera and
the geometry is right; it is not a picture of a fundus. The optic disc and the
macula are small spheres standing proud of the retina rather than patches on
it.

`held/ear/inner-ear--by-structure.png` is a coil spring with a rod through it.
The cochlea's two and a half turns are drawn as a tube with daylight between
them and the vestibulocochlear nerve passes through the middle and ends in a
cut disc. `held/ear/the-three-bones--by-structure.png` is the viewpoint named
for the ossicles: the three bones cannot be told apart in it.

Both scenes pass the interaction check. That is the third batch in a row where
the gate was green and the picture was not — which is why the batches are
small and why nothing is published before somebody looks.

## 5. One thing these pictures raised and did not settle

`framing-at-load/nose-anatomy-load.png` and `--after-reset.png` are the same
scene at the same viewpoint, one click and one press of "reset the display"
apart, with no camera move between them. The model is plainly larger in the
second. **The reader sees the first**, and so does every render in this
directory and in `pub-b1/` and `pub-b2/` — the capture never selects anything —
so what has been looked at is what is shipped. But the frame is being used less
fully at load than the same framing code manages a moment later, and why is
recorded rather than guessed at: F-110.

## 6. What these images are not

One engine, headless, on a desktop machine, at one device pixel ratio. They
show composition, occlusion and whether a surface is closed. **They say
nothing about whether the anatomy or the labels are right** — no anatomist has
looked at any of these three scenes.
