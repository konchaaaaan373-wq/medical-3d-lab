# B2 — the stomach, the oesophagus, the bowel, the biliary tree and the pancreas

The renders batch B2 was measured against. `npm run verify:anatomy` passed on
all five before any of these were taken; what the pictures then showed is the
reason this batch changed how a cut is drawn.

| | |
| --- | --- |
| **Scenes** | `stomach-anatomy`, `esophagus-anatomy`, `intestine-anatomy`, `biliary-anatomy`, `pancreas-anatomy` |
| **Assets** | none — all five are procedural |
| **Browser** | Chromium (Playwright `chromium-1194`), headless, SwiftShader WebGL2 |
| **`before/`** | the cut viewpoints with every part faced, which is what B1 left behind |
| **`after/`** | every viewpoint in both colour modes, with hollow parts opened instead |
| **`layer/`** | one frame with the anatomical-layer slider driven, which `--layer` made possible |
| **How** | `npm run shots:anatomy -- --scene <slug> --preview --out <dir>` at 1280×720, interface hidden |

## 1. A cut through a bag is not a cut through a liver

B1 taught the shared scene to close a cut with the cross-section of the solid
it passes through. Run over the stomach that draws the whole outline of the
organ in gastric pink — `before/stomach/coronal-section--named-regions.png` is
a bag rendered as a lump of tissue, which is a claim about anatomy nobody
made.

The wall in these models is a surface with no thickness, so there is no
annulus to draw and inventing one would be inventing anatomy. What a cut
through a hollow organ leaves is an opening: in
`after/stomach/coronal-section--named-regions.png` the section looks into the
stomach, past the cardia, to the sphincter ring at the pylorus.

Which parts are hollow is declared by the scene, not guessed from the organ:
the stomach's sphincter is a ring of muscle and keeps its face, the biliary
tree's pancreatic head is a solid organ among ducts and keeps its face, and
`after/pancreas/transverse-section--named-parts.png` shows what a faced cut is
*for* — the pancreatic duct and a vessel in cross-section inside the gland.

## 2. A viewpoint can be named after something that is not there yet

`esophagus-anatomy` offers "where the arch and the bronchus cross". Both of
those arrive a quarter of the way along the anatomical-layer slider, so a set
shot at the state the scene opens in showed that viewpoint with its subject
missing, and nothing in the picture said why. `npm run shots:anatomy` takes a
`--layer` now; `layer/esophagus-anatomy--crossing-at-layer-0.6.png` is the
same viewpoint with the arch behind the oesophagus and the bronchus in front.

**The B1 records were amended rather than re-shot for this**: they say, now,
that every one of their frames was taken at the layer the scene opens at.

## 3. What these images are not

One engine, headless, on a desktop machine, at one device pixel ratio. They
show composition, occlusion and whether a surface is closed. **They say
nothing about whether the anatomy or the labels are right** — no anatomist has
looked at any of these five scenes.
