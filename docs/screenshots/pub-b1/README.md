# B1 — the lung, the liver and the kidney, looked at before publishing them

These are the images the first publication batch was measured against, and the
reason it took three fixes to get there. `npm run verify:anatomy` passed on all three
scenes before a single one of these was taken: the interaction contract was
never the thing that was wrong.

| | |
| --- | --- |
| **Scenes** | `lung-anatomy`, `liver-anatomy`, `kidney-anatomy` (and `pancreas-anatomy` in the panel pair) |
| **Assets** | none — all three are procedural, so there is no hash to pin |
| **Browser** | Chromium (Playwright `chromium-1194`), headless, SwiftShader WebGL2 |
| **`before/`** | `80e7fef`, preview build (`VITE_ALLOW_PREVIEW=1 npm run build`) |
| **`after/`** | the same, plus this branch's three fixes (framing, the cut face, the settle) |
| **How** | `npm run shots:anatomy -- --scene <slug> --preview --out <dir>` at 1280×720, interface hidden |
| **`panel-1440x900/`** | `node` drive of the same builds at 1440×900 **with the interface visible**, which is the only way to see what the docked parts panel covers |

## 1. What the viewpoint frames — fixed

`before/liver/` is missing two frames, and getting them back took three
separate fixes. The capture writes a frame only when two consecutive shots are
identical *and* painted. `transverse-section` failed both tests: the model was
small and far away, and "painted" was a 40 kB floor on the PNG — which a cut
liver, being large flat fields of one colour, compresses straight past. The
capture measures what fraction of the frame is not the background now, and the
scene's opacity ease snaps to its target instead of halving the distance
forever, so a settled scene is actually still.

`panel-1440x900/pancreas-anatomy--before.png` is the clearest single frame: the
tail of the pancreas runs underneath the parts panel. In `--after.png` the
whole organ is inside the band the panel leaves. That is the completion
criterion F-44 was written with, and no camera pose was touched to meet it —
`fitPoseToSafeArea()` was being handed a `THREE.Box3` and silently ignoring it.

The cut views moved for a second reason: the subject now excludes what the cut
removed, so `after/kidney/coronal-section--*.png` frames the two cut faces
instead of the space between the uncut kidneys.

## 2. What a cut draws — fixed

`before/liver/transverse-section--*.png` does not exist, and
`before/lung/coronal-section--lobes-and-vessels.png` shows why the cut views
were the thing that held this batch: a clipping plane removes fragments and
closes nothing, so each part was an open shell seen from the inside, with the
vessels as stubs floating in the gap. The kidney was the exception — its
cortex has pyramids, columns and calyces behind it, so there was something on
the other side of the cut to see.

The cross-section is computed from the triangles now and drawn in each
structure's own colour (`src/scenes/shared/geometry/sectionFace.js`). Compare
`after/lung/coronal-section--lobes-and-vessels.png`: the lobes are fields of
colour on the face of the cut, the airway and the vessels are cross-sections
in it, and the lung reads as tissue that has been cut rather than as a shell.
`after/liver/transverse-section--couinaud-segments.png` is the same story with
the portal branches as blue profiles in the face.

**The first version of this was the stencil count, and it was measured and
thrown away**: on the kidney's coronal view it took the headless renderer from
4.6 fps to 0.4, because it re-rasterises every crossed structure twice per
frame to re-answer a question about a plane that has not moved. The computed
face costs nothing per frame — the same view measures 5.5 fps.

`other-cuts/` is the same change on three scenes outside this batch — the eye,
the hip and a lymph node — because the fix is in the scene every procedural
organ shares, so it had to be looked at somewhere other than where it was
written.

## 3. What these images are not

One engine, headless, on a desktop machine, at one device pixel ratio. They
show composition, occlusion and whether a surface is closed. **They say nothing
about whether the anatomy or the labels are right** — that is an anatomist's
judgement, and no anatomist has looked at any of these three scenes.
