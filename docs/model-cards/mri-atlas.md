# Model card — MRI atlas of the brain

| | |
| --- | --- |
| **Scene** | `mri-atlas` |
| **Volumes and surfaces** | [`public/assets/mri/`](../../public/assets/mri/) — `t1.u8.gz`, `t2.u8.gz`, `labels.u8.gz`, `cerebra.glb`, `atlas.json` |
| **Build** | [`scripts/build-mri-atlas.mjs`](../../scripts/build-mri-atlas.mjs) (`npm run mri:build`) |
| **Coordinate model** | [`src/models/mriAtlas.js`](../../src/models/mriAtlas.js) |
| **Names, groups, colours** | [`src/data/mriAtlas.js`](../../src/data/mriAtlas.js) |
| **Workbench** | [`src/scenes/nervous/scenes/mriAtlas/`](../../src/scenes/nervous/scenes/mriAtlas/) |
| **Tests** | [`tests/mri-atlas-model.test.js`](../../tests/mri-atlas-model.test.js), [`tests/mri-atlas-assets.test.js`](../../tests/mri-atlas-assets.test.js), [`tests/mri-atlas-data.test.js`](../../tests/mri-atlas-data.test.js); in a browser, `npm run verify:mri` |
| **Evidence** | [`docs/model-evidence/mri-atlas.md`](../model-evidence/mri-atlas.md) |
| **Asset notice** | [`public/assets/mri/ATTRIBUTION.md`](../../public/assets/mri/ATTRIBUTION.md) |
| **Asset provenance and QA** | [`src/catalog/assetManifest.js`](../../src/catalog/assetManifest.js), [`docs/asset-qa/mri-atlas.md`](../asset-qa/mri-atlas.md) |

## 1. What question this model answers

**Where is a named structure on an MRI — in each of the three planes — and how
do those planes fit the shape of the same structure in 3D?**

## 2. What it is

A standard-brain MRI (the MNI ICBM 152 2009c nonlinear symmetric template, T1-
and T2-weighted, 1 mm) shown as axial, coronal and sagittal slices with a
shared crosshair, the CerebrA label volume painted over it as a coloured
overlay, and a 3D view of one closed surface per label.

**The 3D surfaces are extracted from the same label volume the slices are
painted from.** That is the design decision the whole scene rests on: a point
on a slice and a point in the 3D view are the same millimetre in the same
space by construction, so the two-way link (choose in 3D → the planes move;
choose on a plane → the 3D lights up) is exact rather than a best fit. It is
also why this scene does **not** use the anatomy scene's `brain.glb`: that
atlas is a composite of several sources and is not in MNI space, and laying MRI
coordinates over it would be a guess presented as a registration.

102 structures: 51 per hemisphere — the Desikan–Killiany–Tourville cortical
parcels, the subcortical nuclei, the ventricles, the cerebellum and the
brainstem.

Selecting a structure sends the crosshair to the voxel **deepest inside** its
label, not to its centroid — the centroid of 36 of the 102 labels lies outside
the label (a C-shaped caudate, a ventricle), and a crosshair beside the thing
it names is the one error this screen must not make.

## 3. What it is not

- **Not a patient's image and not a reference for one.** It is the average of
  152 young adults: no individual variation, no pathology, smoother cortex than
  any single brain, and — being the *symmetric* template — no normal asymmetry.
- **Not a functional map.** A coloured region is an anatomical label. Nothing
  on the screen says what it does.
- **Not a tract or white-matter atlas.** An ordinary structural MRI does not
  show white-matter bundles or functional areas, and this scene draws neither.
  CerebrA has no cerebral white-matter label at all; unlabelled tissue has no
  name here and clicking it selects nothing.
- **Not the anatomy atlas in another view.** Nine structures link to the
  anatomy scene **by name** (`ANATOMY_ATLAS_LINKS`). That is a link between two
  atlases with two parcellation protocols, said to be one on the screen; it is
  not a coordinate correspondence.

## 4. Sources and licence

| Component | Source | Licence |
| --- | --- | --- |
| T1w / T2w templates | MNI ICBM 152 Nonlinear atlases version 2009 (2009c symmetric). Fonov et al., *NeuroImage* 2011;54(1):313–327; Fonov et al., *NeuroImage* 2009;47:S102 | MNI permissive notice (kept verbatim in the asset notice) |
| Labels | CerebrA. Manera, Dadar, Fonov & Collins, *Sci Data* 2020;7:237; data doi:10.12751/g-node.be5e62 | CC0 per the publisher's record — **not re-read at the source from the build environment** |
| Retrieval | TemplateFlow `tpl-MNI152NLin2009cSym`. Ciric et al., *Nat Methods* 2022;19:1568–1571 | as distributed, under the MNI notice |

The publishers' own hosts (`mcgill.ca`, `gin.g-node.org`) could not be reached
from the environment this was built in. The bytes are TemplateFlow's, pinned by
SHA-256 in the build script; they were **not compared with the publishers' own
downloads**, and the CC0 statement was not read on the G-Node page. The licence
decision in the asset manifest rests on the MNI notice that ships with the
files and does not depend on CC0. Open item: F-281.

## 5. Accuracy and uncertainty

- **Left and right.** In the RAS+ grid +x is the subject's right. The build
  measures every label's centroid and stops if its side disagrees with the
  atlas's own hemisphere column; all 102 agree (right = labels 1–51). The same
  check runs in `tests/mri-atlas-assets.test.js` and again in the browser
  before the first pixel is drawn. **On a symmetric template a mirrored image
  is indistinguishable by eye**, so this is checked by number and never by
  looking.
- **Labels are a protocol.** DKT parcels are labelling conventions; "inferior
  parietal" is a DKT region, chiefly the angular gyrus. Entries whose Japanese
  anatomical term covers a different extent carry a note saying so.
- **Midline structures are split.** The third and fourth ventricles, brainstem
  and vermis are divided left/right at the midline by the atlas, and the x = 0
  voxel plane carries only right labels, so the halves are unequal (third
  ventricle 1,100 vs 613 voxels). They are named "(left half)" / "(right half)".
- **Small labels.** The optic chiasm and the inferior horn of the lateral
  ventricle are a few hundred voxels; their notes say the outline is approximate.
- **Surfaces.** Smoothed and decimated (198k triangles); volume within 3% of the
  voxel volume and solid centroid within 1 mm for every label. Cortical parcels
  are grey-matter ribbons with nothing beneath them.
- **Intensity.** 8-bit display values from a source with about 100 levels. No
  unit, no calibration, and the interface prints none.

## 6. Presentation choices

- **Radiological display by default** (the patient's left on the screen's
  right), because that is how clinical MRI is read; a toggle gives the
  neurological convention. Neither is relied on: the edge letters R/L, A/P, S/I
  are computed from the same mapping that draws the pixels and are always on
  screen.
- **One colour per structure, shared by its left and right halves**, in one hue
  family per group. No group is pink: pink is the product's own colour and on
  this screen marks only the selection and the active control.
- **The selection is drawn even with the colour overlay off**, with a
  one-pixel white edge.
- **With a structure selected, the rest of the 3D model fades to a grey ghost**
  so a deep structure can be seen where it is; "see inside" fades the cortex on
  request. Clicks go through a ghost to what is drawn solid.
- **Brightness and contrast are a display window**, not a measurement.

## 7. What it must never be used for

Diagnosis; comparing with, or localising a lesion on, a patient's image;
measurement; stereotactic coordinates; operative planning or navigation;
estimating an individual's anatomy; any statement about function.

## 8. Review status

**Catalog status:** `alpha`

Implemented and tested as described. **No anatomist, radiologist or clinician
has reviewed** the labels as drawn here, their Japanese names, or the extracted
surfaces; the review registry records the scene as `pending`. The label
borders are the CerebrA authors' manual correction — that is their review, not
one of this product. Reading the literature with an AI is not a medical review
and is not recorded as one.

## 9. Revision history

**Revision 1 — 2026-11-24.** First version: T1/T2 planes, CerebrA overlay and
surfaces, two-way selection, radiological/neurological display, name-based
links to the anatomy atlas for nine structures.
