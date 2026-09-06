# Asset QA record — `brain-atlas-glb`

The measured facts behind the `brain-atlas-glb` entry in
[`src/catalog/assetManifest.js`](../../src/catalog/assetManifest.js). Every
number here was produced on 2026-09-06 by the commands shown; nothing was
copied from a previous run or from the upstream site's description. What this
record does **not** contain — an anatomist's review, a clinician's sign-off, a
legal reading of the licences — is listed at the end as still to do.

File under test: `public/assets/brain/brain.glb`,
SHA-256 `76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453`,
4 650 816 bytes.

## 1. Provenance re-verification

Upstream file, at the revision the attribution names:

```
https://raw.githubusercontent.com/itayinbarr/brainproject/2929e94f521a8ddceab26bc100a98dc06b0da060/brain-atlas/models/brain.glb
```

Downloaded at 2026-09-06T04:03:21Z and compared with the vendored copy:

| | Upstream download | Vendored file |
| --- | --- | --- |
| SHA-256 | `76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453` | same |
| git blob SHA (`git hash-object`) | `c80dd62202b5cf8a2a43c7a019311781bd95457c` | same |
| bytes | 4 650 816 | 4 650 816 |
| `cmp` | identical | |

The file entered this repository in commit `e344d465de416d5a40a0cbb8b9d6b8d0c2850185` on
2026-09-01. The original download date was not recorded and is not invented;
the manifest carries `retrievedAt: null` with that note and `introducedAt`
from git.

Components and licences were read from the upstream `LICENSE`, `README.md` and
`docs/registration.md` at the same revision and are recorded in
[`public/assets/brain/ATTRIBUTION.md`](../../public/assets/brain/ATTRIBUTION.md).
They were not verified against each component's own publisher.

## 2. Format validation — Khronos glTF Validator

```
npm i gltf-validator@2.0.0-dev.3.10        # in a scratch directory, not in this repository
node -e "require('gltf-validator').validateBytes(new Uint8Array(require('fs').readFileSync('public/assets/brain/brain.glb')), { uri: 'brain.glb', maxIssues: 100000 }).then(r => console.log(JSON.stringify(r)))"
```

| | Result |
| --- | --- |
| validatorVersion | `2.0.0-dev.3.10` |
| validatedAt | 2026-09-06T04:03:52Z |
| errors / warnings / infos / hints | **0 / 0 / 744 / 0** |
| infos by code | `UNUSED_OBJECT` × 743 (563 `/bufferViews`, 180 `/meshes`); `UNSUPPORTED_EXTENSION` × 1 (`KHR_draco_mesh_compression`) |
| reported | glTF 2.0, generator glTF-Transform v4.3.0, extensions `KHR_draco_mesh_compression` (required), `KHR_materials_ior`, `KHR_materials_specular`; 563 draw calls, 853 972 vertices, 1 383 522 triangles, 13 materials, 0 textures, no animations, skins or morph targets |

**Scope limit.** The validator cannot decode `KHR_draco_mesh_compression`,
so the compressed attribute payloads themselves were not inspected by it — the
`UNSUPPORTED_EXTENSION` info is the validator saying so. To cover that gap a
Draco-decoded derivative was produced and validated separately:

```
npm i @gltf-transform/cli draco3dgltf      # scratch directory; glTF-Transform 4.5.0
npx gltf-transform copy public/assets/brain/brain.glb brain-decoded.glb
# warn: Decoded KHR_draco_mesh_compression. Further compression will be lossy.
# info: brain.glb (4.65 MB) → brain-decoded.glb (34.08 MB)
```

| Decoded derivative | Result |
| --- | --- |
| bytes | 34 078 252 (SHA-256 begins `0a12d1734b1d5a05`; not committed) |
| errors / warnings / infos | **0 / 0 / 180** (`UNUSED_OBJECT` × 180, all `/meshes`) |
| triangles / vertices | 1 383 522 / 853 972 — identical to the compressed file |
| extensions | `KHR_materials_ior`, `KHR_materials_specular` only |

The 180 unused mesh objects are meshes present in the file that no node
references; they are upstream's, not an error, and cost bytes rather than
correctness.

## 3. Semantic integrity

`tests/brain-anatomy.test.js` — *the distributed GLB keeps per-mesh anatomy
metadata and its licence notice* — asserts, against the same hash: the GLB
header, 437 nodes carrying `bx_id`, 271 of them in the seven selectable
categories, the presence of four named labels, the required Draco extension,
and that `ATTRIBUTION.md` names Z-Anatomy, BodyParts3D / DBCLS and
CC BY-SA 4.0. The other tests in that file exercise selection, hover, colour
modes, medial views and the Japanese term set on a fixture, not on the GLB.

This establishes that the file and the adapter agree. It establishes nothing
about whether the anatomy is right.

## 4. Visual / browser review — engineering render verification

Run against a production build (`npm run build`) of the working tree at commit
`c170e30a2086c837e5af55b20b295bbd9ab9b196`, whose brain-anatomy scene sources
and GLB are unchanged in the release head; the gate ties the review to the
asset hash, not to the commit.

| | |
| --- | --- |
| browser | Chromium 141.0.7390.37 (Playwright `chromium-1194` build), headless, SwiftShader WebGL2 |
| viewport | 1440 × 900 |
| route | `#/brain-anatomy` |
| checked at | 2026-09-06T04:12:25Z |
| WebGL2 context | yes |
| loading veil | cleared |
| structures reported by the scene | 397 |
| default annotations | *Central sulcus* and *Middle temporal gyrus* both present (rendered in Japanese: 中心溝, 中側頭回) and anchored on the cortex |
| screenshot | 402 796-byte PNG of a drawn atlas in the default left-lateral colour-map view; kept in the session, not committed |
| console errors | 1: `net::ERR_NAME_NOT_RESOLVED` for `fonts.googleapis.com` — the harness blocks every host but loopback, as `scripts/check-viewports.mjs` does and ignores |
| failed requests | the font request above; two `net::ERR_ABORTED` duplicate fetches of `assets/brain/draco/draco_wasm_wrapper.js` and `draco_decoder.wasm` after the decoder had loaded — the atlas decoded and rendered |
| time to veil cleared + settle | 22.3 s on a software renderer |

What this does and does not establish: the scene loads *this* file, decodes
it, draws it and anchors its labels, with no rendering errors. It is not a
judgement that the colour scheme reads correctly (the open question in
[`docs/anatomy-review.md`](../anatomy-review.md) §3) and not a judgement about
the anatomy.

`npm run verify:ui -- --engine chromium` at the same head: 54 rows, 0
problems (the viewport matrix does not include the brain scene; it is
recorded here for the shell around it).

## 5. Still to do — recorded as pending, not passed

| Gate | Status | Who |
| --- | --- | --- |
| `anatomyExpertReview` | pending — no anatomist or clinician has reviewed the atlas geometry or label set in this repository | anatomist / clinician |
| `clinicianReview` | pending — follows `docs/clinical-reviews/registry.json` (`brain-anatomy`: pending) | clinical reviewer |
| licence | engineering assessment only — the CC BY-SA 4.0 / CC BY 4.0 reading and the HCP acknowledgment have not been reviewed by a lawyer | whoever owns legal review |

With those pending, the release gate in `assetReleaseProblems()` passes this
asset for an **alpha** scene only. Promoting `brain-anatomy` to `reviewed` or
`production` will fail CI until both reviews are recorded as passed.

## Reproducing

All commands above run outside the repository's dependency set: the validator
and glTF-Transform were installed in a scratch directory and nothing was added
to `package.json`. Re-running should reproduce every count; the timestamps and
the Chromium build will differ.
