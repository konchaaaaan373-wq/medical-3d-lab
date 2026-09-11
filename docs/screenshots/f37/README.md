# F-37 — an annotation drawn over the hemisphere it does not belong to

Labels **on**, which is the normal display: this is a defect in what the reader
sees, so the pair has to show what the reader sees. The model-only renders in
[`../b3-1/`](../b3-1/) are the separate, supporting comparison for the medial
view; they are not this.

| | |
| --- | --- |
| **before** | `a76dc0c992243b7287d7612c53649e7bb7d35ccd` — the medial-view fix, without this one |
| **after** | this branch's next commit |
| **Camera** | the scene's own named viewpoints, applied through its own control |
| **Anatomy layer** | 0 %, both sets |
| **Colour mode** | both, applied through the scene's own control |
| **Interface** | hidden, so only the model and its labels are in the frame |
| **Viewport** | 1280×720, device pixel ratio 1 |
| **Browser** | Chromium 141.0.7390.37 (Playwright `chromium-1194`), headless, SwiftShader WebGL2 |
| **Build** | `npm run build` (production), served locally |
| **Command** | `npm run shots:anatomy -- --out <dir>` |

Each frame is written only when a painted frame repeats, under hard caps (20
shots, 60 s); a view that does not settle fails the run rather than being shot
until it looks right, and the frame kept is the one that repeated, not one
chosen afterwards. "Painted" is a compressed-size floor — it separates a frame
with the model in it from one with nothing drawn, and it is not a judgement of
the picture.

## What to look at

**`right-lateral`** is the view that showed the defect. Before: 「中心溝」 and
「中側頭回」 — both **left**-hemisphere structures — are drawn on the right
hemisphere's surface, which reads as a claim about where those structures are.
After: neither is drawn, because neither can be seen from there.

**`left-lateral`** is the control, and the reason this is not "hide the labels
and pass": 「中側頭回」 is still there, on the gyrus it names. What has gone is
「中心溝」, and that is the honest outcome rather than a regression hidden — its
anchor is the centre of its bounding box, which for a sulcus is at the bottom of
the sulcus, so before this its dot sat on the **precentral gyrus**. Re-anchoring
it to a point on the visible surface is F-40.

**`left-medial`** shows the medial-view fix of `a76dc0c` is not disturbed: the
midline block is identical in both sets, and only the labels change.

## Measured difference (before → after)

| frame | pixels changed of 921,600 |
| --- | --- |
| `right-lateral--colour-map` | 2181 (0.24 %) |
| `right-lateral--natural-anatomy` | 2177 (0.24 %) |
| `left-lateral--colour-map` | 1003 (0.11 %) |
| `left-lateral--natural-anatomy` | 2120 (0.23 %) |
| `left-medial--colour-map` | 2182 (0.24 %) |
| `left-medial--natural-anatomy` | 2175 (0.24 %) |

Every changed pixel is in a label. Nothing else in any frame moved: no geometry,
no colour, no camera.

## What this is not

One engine, headless, on a desktop. It shows that the label follows what is
drawn; whether the anchor is anatomically the right place for the name is an
anatomist's judgement, and this model's is **pending**.
