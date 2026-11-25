# Evidence dossier — MRI atlas of the brain

Scene `mri-atlas`. This is an **anatomy** scene: it makes claims about where
labelled structures are and how an image is oriented, and none about function.
Card: [`../model-cards/mri-atlas.md`](../model-cards/mri-atlas.md).

## Sources consulted

| # | Source | Used for |
| --- | --- | --- |
| S1 | Fonov V, Evans AC, Botteron K, Almli CR, McKinstry RC, Collins DL. Unbiased average age-appropriate atlases for pediatric studies. *NeuroImage* 2011;54(1):313–327. doi:10.1016/j.neuroimage.2010.07.033 | The ICBM 152 2009c nonlinear symmetric template |
| S2 | Fonov VS, Evans AC, McKinstry RC, Almli CR, Collins DL. Unbiased nonlinear average age-appropriate brain templates from birth to adulthood. *NeuroImage* 2009;47:S102. doi:10.1016/S1053-8119(09)70884-5 | Same |
| S3 | Manera AL, Dadar M, Fonov V, Collins DL. CerebrA, registration and manual label correction of Mindboggle-101 atlas for MNI-ICBM152 template. *Sci Data* 2020;7:237. doi:10.1038/s41597-020-0557-9 | The label volume and its label table |
| S4 | Klein A, Tourville J. 101 labeled brain images and a consistent human cortical labeling protocol. *Front Neurosci* 2012;6:171 | The DKT protocol the cortical parcels follow |
| S5 | Ciric R, et al. TemplateFlow: FAIR-sharing of multi-scale, multi-species brain models. *Nat Methods* 2022;19:1568–1571 | The distribution the files were retrieved from |
| S6 | The files themselves, hashed (`scripts/build-mri-atlas.mjs`), and the NIfTI-1 headers read from them | Grid, orientation, label values |

S1–S5 are cited from their bibliographic records. **The papers' full texts and
the publishers' download pages were not reachable from the build environment**
(F-281); every claim below that could be read off the data (S6) was, and is
marked so.

## Claim → Source → Implementation → Assumption → Validation

| Claim shown to a reader | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| The image is a standard brain: an average of 152 young adults, not a person | S1, S2; TemplateFlow `template_description.json` (S6) | `MRI_ATLAS_COPY.standardBrain`, scope panel, front page | "152 young adults" is the template's published description | Copy is in one place; `tests/mri-atlas-data.test.js` requires the standard-brain notice |
| Voxel `[i,j,k]` is at `(i−96, j−132, k−78)` mm in MNI space | S6: sform/qform of all four inputs | `voxelToMm` / `mmToVoxel` in `src/models/mriAtlas.js` | The build's RAS+ reorientation (a no-op for these files) | Build asserts grid and origin; `tests/mri-atlas-model.test.js` round-trips; `tests/mri-atlas-assets.test.js` reads `atlas.json` |
| +x is the subject's right; labels 1–51 are right, 52–102 left | S6: measured centroids; the atlas's label table (S3 as distributed) | `sideOfMm`, `atlasProblems` | NIfTI RAS convention as declared by the headers | Build stops on disagreement; asset test; the browser refuses to draw if `atlasProblems` is non-empty. Mutation: mirroring the labels turns all three red |
| In the radiological view the patient's left is on the screen's right; edge letters name each side | Convention of clinical image display | `slicePlane` derives pixels and letters from one mapping | — | `tests/mri-atlas-model.test.js`: a right-side voxel is left of centre in radiological and right of centre in neurological, and the letter at that edge is `R` both times; `verify:mri` reads the letters and the outlined label's side from the page |
| Selecting a structure puts the crosshair inside it | S6: distance transform over the label | `interiorPointMm` in `atlas.json`; `select()` in the workbench | — | Build asserts `labels[interiorPoint] === label` for all 102; asset test repeats it; `verify:mri` selects structures and reads the label under the crosshair |
| A structure's 3D surface and its slice overlay are the same place | S6: both from one label volume | `AtlasView3D` places MNI millimetres under one rotation built from `mniToScene` | The rotation is proper (det +1) | Model test: determinant and axis images; `verify:mri`: clicking the projected interior point of a structure in 3D selects that structure and the crosshair lands in its label |
| Structure names (English) | S3 label table as distributed (S6) | `atlas.json` | — | Data test: every asset name has an entry and vice versa |
| Structure names (Japanese) | Standard Japanese anatomical terms for the corresponding English terms; DKT parcel definitions (S4) for where extents differ | `src/data/mriAtlas.js` | **Translation by the implementer; not reviewed by an anatomist** | Listed for review in `docs/reviews/2026-11-24-brain-launch-medical-review.md` |
| T1 and T2 show the same anatomy with different contrast | S1 | Two volumes on one grid | — | Build asserts all inputs share the grid |

## Deliberate boundary

Nothing here supports a statement about function, about any individual, about
disease, or about white-matter pathways, and the scene makes none. The label
table's per-structure agreement figures (`dice/kappa`) are **not shown**: what
they measure could not be checked against the paper from this environment, and
a number whose meaning is unverified does not go on screen.
