# Asset QA — MRI atlas (`public/assets/mri/`)

The record behind the `qa` blocks of the four `mri-*` entries in
[`src/catalog/assetManifest.js`](../../src/catalog/assetManifest.js). It is an
**engineering** record: what was run, against which bytes, and what that does
and does not show. No anatomist, radiologist or clinician has reviewed these
files (`anatomyExpertReview` and `clinicianReview` are `pending`).

| File | SHA-256 | Bytes |
| --- | --- | --- |
| `t1.u8.gz` | `f9ef53ec96b483c3584dcc03ac2cb1322485c6c9d3e3dacdc6eb313cbdd24430` | 2,910,307 |
| `t2.u8.gz` | `cc8ba7ee6f96d6b07b1df2d9f040d52efe950b3cebe3290d0a5bbe6326755489` | 2,569,520 |
| `labels.u8.gz` | `33260a01ffdfce839945739efcac3fe2ec7019969739bbd9264bf5b2617a403e` | 262,955 |
| `cerebra.glb` | `0794d7c2e1332d818caf34d87e2c250cdea7bc3882ac93e14e1c62ed4212f4be` | 2,840,260 |

## 1. Format validation

**`cerebra.glb`** — Khronos glTF Validator (`gltf-validator` 2.0.0-dev.3.10),
2026-11-24: **0 errors, 0 warnings, 0 infos, 0 hints.** 102 draw calls, 98,246
vertices, 198,298 triangles; `KHR_mesh_quantization` required (int8 normals);
no materials, no textures, no Draco.

**The three volumes** — there is no third-party validator for a raw voxel file.
The check is the build's own, `npm run mri:build -- --src <inputs> --check`: the
inputs hash to their pins, the four NIfTI headers agree on one 193×229×193 1 mm
RAS grid at origin (−96, −132, −78), and the committed bytes equal a fresh build
after decompression. It was exercised three ways on a scratch copy before being
trusted: labels mirrored under an unchanged header (build stops: side
disagreement), every volume flipped with an honest LAS header (reoriented,
byte-identical output), and a big-endian copy (identical output).

## 2. Semantic integrity

[`tests/mri-atlas-assets.test.js`](../../tests/mri-atlas-assets.test.js), run by
`npm test`: file hashes against the manifest; all 102 labels present with the
voxel counts the index states; right = labels 1–51 with centroid x > 0, left =
right + 51 with x < 0, same name; the left hippocampus's voxels averaged from
the raw bytes (x ≈ −26 mm); every interior point inside its own label; one named
mesh per label, on the correct side, inside its label's bounding box, with no
node transform. Mutations seen red (2026-11-24): the side definition inverted
(4 tests), the lateral screen mapping inverted, the MNI→scene map made a
reflection.

## 3. Visual review (engineering)

Chromium (Playwright build, headless, SwiftShader WebGL2), 1440×900 and
390×844, against commit `ab89828`, 2026-11-24. Screenshots:
[`../screenshots/brain-launch/`](../screenshots/brain-launch/).

Seen: the three planes draw a recognisable T1 head with scalp and skull; edge
letters R/L, A/P, S/I; selecting the left hippocampus from the list puts the
crosshair at x −31, y −19, z −17 mm with the label outlined on the screen's
right in the radiological view; in the left lateral 3D view the frontal lobe is
anterior (screen left), the temporal lobe below the Sylvian fissure, the
cerebellum posterior-inferior; with a structure selected the rest ghosts and
the structure is visible in place.

`npm run verify:mri` then reads the same things **from the page** rather than
from a picture (24 checks: sides, labels under the crosshair, both selection
directions, wheel, zoom, T2, the phone layout, a browser with no WebGL), and was
seen red under two deliberate breaks — the "left" view standing on the right,
and selection going to the centroid instead of the interior point.

**Not an anatomical judgement.** Nobody qualified has said the labels are in
the right place; the borders are the CerebrA authors'.

## 4. What was not done

- The inputs were not compared with the publishers' own downloads, and
  CerebrA's licence was not read at its source (F-281).
- One browser engine, software GL. No real phone, no Safari, no Firefox, no
  screen reader (F-282).
- No reader with a colour-vision difference has looked at the overlay (F-283).
