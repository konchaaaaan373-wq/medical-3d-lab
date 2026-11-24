# Publication decision — `mri-atlas`

**This is an engineering acceptance, not a medical sign-off.** It records that
what this scene shows was checked against what the build actually serves, by
whom, on what date, and what was *not* checked. **No anatomist, radiologist or
clinician has judged these labels, their Japanese names or the surfaces**, and
every surface says so — see
[`../clinical-reviews/registry.json`](../clinical-reviews/registry.json).

| | |
| --- | --- |
| **Decided at** | 2026-11-24 |
| **Decided by** | Claude Code (AI engineering agent), preparing the launch the repository owner directed on 2026-11-24. **It takes effect only if the owner merges the pull request that carries it** — the merge is the owner's publication decision; this record is what that decision would rest on |
| **Role** | `engineering` — software behaviour, not anatomical or clinical judgement |
| **Assets** | `mri-icbm152-t1`, `mri-icbm152-t2`, `mri-cerebra-labels`, `mri-cerebra-surfaces`, each pinned by output hash |
| **Scene revision** | model card revision and source digest as pinned in [`src/catalog/release.js`](../../src/catalog/release.js) |

Change a volume, the label table, what a click selects or how a slice is
oriented, and either an asset hash or the scene digest moves; `npm run
revisions:check` fails until the card is revised and this record closes until
it is taken again.

## The claim this scene makes, and the ones it does not

**A labelled structure can be found on a standard-brain MRI in three planes,
and the same structure in 3D is the same place.** 102 structures, each with an
English and a Japanese name; a choice made in the list, on a plane or on the 3D
model selects the same structure in all three.

It makes **no claim about function** (its model profile's mechanism level is
`none`), none about any individual, and none about white matter. It is on the
anatomy list, so the anatomy claim rule applies unchanged.

## What was exercised

`npm run verify:mri -- --dist dist-preview --preview` — 24 checks, all read from
the page: the edge letters in both display conventions; four structures chosen
from the list, each landing the crosshair inside its own label and on the
correct side of the screen; a click on the coronal plane selecting the right
putamen and the 3D model highlighting it; a click on the 3D model from the left
and from the right selecting a structure of that hemisphere; the wheel moving
one plane only; zoom; T2 loading on request; the display window; a link that
opens on a structure; the phone layout and its structure sheet; and a browser
with no WebGL, where the planes still open.

Seen red under two deliberate breaks (a mirrored view; selection sent to the
centroid). `tests/mri-atlas-*.test.js` hold the arithmetic and the files.

## What was not verified

Listed in `BETA_PUBLICATION_DECISIONS` as `unverified`, and repeated here:

1. No anatomist or radiologist has judged the labels as drawn, their Japanese
   names, or the surfaces.
2. No clinician has reviewed the scene; the registry records it as `pending`.
3. Left/right rests on the atlas's own hemisphere table and the NIfTI headers.
   **A symmetric template offers no independent landmark**, so there is no
   second, anatomical confirmation of side.
4. The inputs came from TemplateFlow and were not compared with the publishers'
   own downloads; CerebrA's CC0 statement was not read at its source (F-281).
5. 98 of the 102 structures were not individually opened in a browser.
6. One browser engine on software GL, desktop and an emulated phone: no real
   phone, Safari, Firefox or screen reader (F-282).
7. No reader with a colour-vision difference has looked at the overlay (F-283).
8. Time to first image on a real mobile connection was not measured (F-284).
