# B1 — the lung, the liver and the kidney, looked at before publishing them

These are the images the first publication batch was measured against, and the
reason the batch is not published. `npm run verify:anatomy` passed on all three
scenes before a single one of these was taken: the interaction contract was
never the thing that was wrong.

| | |
| --- | --- |
| **Scenes** | `lung-anatomy`, `liver-anatomy`, `kidney-anatomy` (and `pancreas-anatomy` in the panel pair) |
| **Assets** | none — all three are procedural, so there is no hash to pin |
| **Browser** | Chromium (Playwright `chromium-1194`), headless, SwiftShader WebGL2 |
| **`before/`** | `80e7fef`, preview build (`VITE_ALLOW_PREVIEW=1 npm run build`) |
| **`after/`** | the same, plus this branch's framing fix |
| **How** | `npm run shots:anatomy -- --scene <slug> --preview --out <dir>` at 1280×720, interface hidden |
| **`panel-1440x900/`** | `node` drive of the same builds at 1440×900 **with the interface visible**, which is the only way to see what the docked parts panel covers |

## 1. What the viewpoint frames — fixed

`before/liver/` is missing two frames. That is not an omission: the capture
writes a frame only when two consecutive shots are identical *and* painted, and
`transverse-section` in both colour modes never cleared the painted floor,
because the model was small and far away. The framing fix is what made those
two frames exist.

`panel-1440x900/pancreas-anatomy--before.png` is the clearest single frame: the
tail of the pancreas runs underneath the parts panel. In `--after.png` the
whole organ is inside the band the panel leaves. That is the completion
criterion F-44 was written with, and no camera pose was touched to meet it —
`fitPoseToSafeArea()` was being handed a `THREE.Box3` and silently ignoring it.

The cut views moved for a second reason: the subject now excludes what the cut
removed, so `after/kidney/coronal-section--*.png` frames the two cut faces
instead of the space between the uncut kidneys.

## 2. What the images show that is still wrong — F-101

**A clipping plane does not close what it cuts.** Look at
`after/liver/transverse-section--couinaud-segments.png` and
`after/lung/coronal-section--lobes-and-vessels.png`: the segments are open
shells seen from inside, the cut vessels are floating stubs, and the far wall
shows through. The kidney does not have this problem — its cortex shell has
pyramids, columns and calyces behind it, so there is something on the other
side of the cut to see — and `after/kidney/coronal-section--*.png` reads as a
cut kidney.

This is why the lung and the liver are not published. It is a decision about
what a cut view should draw, recorded as F-101 in `../../follow-ups.md`.

## 3. What these images are not

One engine, headless, on a desktop machine, at one device pixel ratio. They
show composition, occlusion and whether a surface is closed. **They say nothing
about whether the anatomy or the labels are right** — that is an anatomist's
judgement, and no anatomist has looked at any of these three scenes.
