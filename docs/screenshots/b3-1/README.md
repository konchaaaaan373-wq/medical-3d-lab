# B3-1 — the brain at its six fixed viewpoints, before and after

Two sets of the same twelve frames: every viewpoint the scene offers, in both
colour modes, at one camera per viewpoint, with the interface hidden so nothing
but the model is in the frame.

| | |
| --- | --- |
| **Scene** | `brain-anatomy`, production build (`npm run build`), served locally |
| **Asset** | `brain-atlas-glb` @ `sha256:76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453` (unchanged by this work) |
| **Browser** | Chromium 141.0.7390.37 (Playwright `chromium-1194`), headless, SwiftShader WebGL2 |
| **Viewport** | 1280×720, device pixel ratio 1 |
| **Layer** | 0 % — the cortical surface, the state the scene opens in |
| **`before/`** | code at `5b23105` (the B2-1 head) |
| **`after/`** | the same, plus this branch's change to `targetOpacity()` |
| **How** | `npm run build && npm run shots:anatomy -- --out <dir>` |

Each frame is shot repeatedly until two consecutive frames are byte-identical,
so a pair differs by the change and not by where the camera ease happened to be
when the shutter fell. That matters: sampled at a fixed delay instead, two runs
of the *same* build differed in 12.78 % of the pixels of a medial view.

## What the pair shows

**The medial views.** `left-medial` and `right-medial`, in both modes, are what
this change is about. Before, a medial view was a ring of cortical parcels
around an empty middle — no corpus callosum, no thalamus, and the page
background visible through the far wall, because the materials are front-side
only. After, the midline block that a medial view is a view *of* is there.
Measured: 2.9–3.0 % of pixels change, mean delta 48–85 per changed pixel.

**The lateral, anterior and superior views are untouched.**
`left-lateral`, `anterior` and `superior` are **byte-identical** in both modes.

`right-lateral` differs in 2179 pixels (0.24 %), and all of it is the two
annotation labels, not the model: rendered again with the labels turned off
(`npm run shots:anatomy -- --no-labels`), before and after differ in **2 pixels
by one channel value**, which is the floor this harness reaches on frames that
are the same. The labels are a DOM overlay placed from the projected camera to
one decimal of a pixel, and the medial view now draws more meshes, so the frames
before it are slower and the camera's ease has taken a different number of steps
by the time it is read. Sub-pixel, and not a change to the geometry.

## What these images are not

They are one engine, headless, on a desktop machine. They show what the renderer
draws; whether what it draws is anatomically right is an anatomist's judgement,
which for this model is recorded as **pending**
(`docs/clinical-reviews/registry.json`, and the asset's `anatomyExpertReview`
gate). Nothing here changes that, and the scene keeps its
「医学レビュー：未完了」 badge.
