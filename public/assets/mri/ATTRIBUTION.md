# Standard-brain MRI and CerebrA atlas: attribution and licence notice

The files in this directory are **derived** from two published works. Nothing
here is an individual person's scan.

| File | What it is | Derived from |
| --- | --- | --- |
| `t1.u8.gz`, `t2.u8.gz` | T1-weighted and T2-weighted template volumes, 8-bit | MNI ICBM152 2009c Nonlinear Symmetric template, 1 mm |
| `labels.u8.gz` | Label of every voxel, 0 (unlabelled) to 102 | CerebrA atlas |
| `cerebra.glb` | One closed surface per CerebrA label | CerebrA atlas |
| `atlas.json` | Grid, hashes, and per-label names and measurements | CerebrA atlas and its label table |

## MNI ICBM152 2009c Nonlinear Symmetric template

Copyright notice, verbatim from the `LICENSE` file distributed with the
template. It must stay with every copy of these files, and this file is that
notice:

> Copyright (C) 1993-2004 Louis Collins, McConnell Brain
> Imaging Centre, Montreal Neurological Institute, McGill University.
> Permission to use, copy, modify, and distribute this software and
> its documentation for any purpose and without fee is hereby granted,
> provided that the above copyright notice appear in all copies.  The
> authors and McGill University make no representations about the
> suitability of this software for any purpose.  It is provided "as
> is" without express or implied warranty.  The authors are not
> responsible for any data loss, equipment damage, property loss, or
> injury to subjects or patients resulting from the use or misuse of
> this software package.

Please cite:

- Fonov VS, Evans AC, Botteron K, Almli CR, McKinstry RC, Collins DL, and the
  Brain Development Cooperative Group. Unbiased average age-appropriate atlases
  for pediatric studies. *NeuroImage* 54(1):313–327 (2011).
  doi:10.1016/j.neuroimage.2010.07.033
- Fonov VS, Evans AC, McKinstry RC, Almli CR, Collins DL. Unbiased nonlinear
  average age-appropriate brain templates from birth to adulthood. *NeuroImage*
  47, Supplement 1:S102 (2009). doi:10.1016/S1053-8119(09)70884-5

## CerebrA atlas

- Manera AL, Dadar M, Fonov V, Collins DL. CerebrA, registration and manual
  label correction of Mindboggle-101 atlas for MNI-ICBM152 template.
  *Sci Data* 7, 237 (2020). doi:10.1038/s41597-020-0557-9
- Data: doi:10.12751/g-node.be5e62
- Licence: CC0 1.0 (public domain dedication), per the publisher's record; not
  re-verified from this environment because gin.g-node.org was unreachable.

CC0 does not require attribution. The citation is kept because the label
boundaries and the structure names are that work, not this repository's.

## Where the bytes came from

The input files were retrieved from the TemplateFlow distribution of the
template (`https://templateflow.s3.amazonaws.com/tpl-MNI152NLin2009cSym/`):

- Ciric R, Thompson WH, Lorenz R, et al. TemplateFlow: FAIR-sharing of
  multi-scale, multi-species brain models. *Nat Methods* 19:1568–1571 (2022).
  doi:10.1038/s41592-022-01681-2

The official download pages —
https://www.mcgill.ca/bic/icbm152-152-nonlinear-atlases-version-2009 and
https://doi.gin.g-node.org/10.12751/g-node.be5e62/ — could not be reached from
the build environment, so the inputs have **not** been compared byte for byte
with the publishers' own copies. What is pinned is the TemplateFlow copy:

| Input | SHA-256 |
| --- | --- |
| `tpl-MNI152NLin2009cSym_res-1_T1w.nii.gz` | `317e112c49d086b971e4a26cba853b041ee210faf750a6fe02e04f15909b6b6b` |
| `tpl-MNI152NLin2009cSym_res-1_T2w.nii.gz` | `1c8750fabbbe132aa582eec9f923ed7493da66be6d5ec3902caf6eefe6a2bb5a` |
| `tpl-MNI152NLin2009cSym_res-1_atlas-CerebrA_dseg.nii.gz` | `c05df93e85b8f1c1446e56f45f0b6a28fdf6e5c8263ea8f365617254bf79ecbf` |
| `tpl-MNI152NLin2009cSym_res-1_desc-brain_mask.nii.gz` | `6fdb662663d5c0a32ae88c51ef126a99de82200f29030a84333c5fcf944d7459` |
| `tpl-MNI152NLin2009cSym_atlas-CerebA_dseg.tsv` | `cf0332a1c2601b5dd97b2f70423b064c762630d02052629f7112789f2fb6d2f7` |
| `LICENSE` | `5915d16f84d99c3cedc8290b09da72f6f92e5dde1ba1c9859ee186aa952b66a4` |

`scripts/build-mri-atlas.mjs` refuses to build from a file whose hash differs.

## Modifications

The distributed files are not the originals. `scripts/build-mri-atlas.mjs`
made these changes and no others:

- **Reorientation.** Every volume is put in RAS+ voxel order (i to the
  subject's right, j anterior, k superior; i fastest) by flipping and permuting
  axes only. No interpolation or resampling. The inputs arrived as
  RAS+, so for these files the step changed nothing.
- **8-bit quantisation.** T1w and T2w intensities are mapped linearly from
  [0, the 99.9th percentile of in-head voxels] to 0–255; brighter voxels clip.
  The intensities are relative display values, not a physical quantity.
  Low-level noise in the air around the head is set to zero where it is at or
  below the noise ceiling of that volume and connected to the edge of the
  volume; no voxel inside the brain mask is touched by this.
- **Label volume.** CerebrA labels are stored as one unsigned byte per voxel,
  values unchanged.
- **Mesh extraction.** Each label's voxel mask is lightly smoothed and turned
  into a closed triangle surface (surface nets), on the 1 mm grid for the
  38 deep labels (nuclei, ventricles, brainstem, vermis, cerebellar white
  matter) and on a 2 mm grid for the other 64. The level the
  surface is cut at is chosen per label so that the mesh encloses the same
  volume as the label's voxels, and the triangles are then simplified
  (quadric-error edge collapse). The surfaces are a rendering of the label
  volume, smoother than it and not more accurate than it; neighbouring
  surfaces do not share vertices and can overlap or gap by a fraction of a
  millimetre.
- **Measurements.** `atlas.json` adds, per label, the voxel count, centroid,
  bounding box, an interior point, and the side of the head the label was
  measured on. These are computed from the label volume; they are not part of
  CerebrA.

Skull and scalp are **not** removed.

## What this is not

The template is a **population average of 152 young adults**, not an
individual. No real person has this brain, and structures that vary between
people are blurred in it. The atlas labels are one group's parcellation of that
average. These files are for education — showing where structures are and how
they look on MRI — and are **not for diagnosis**, measurement, comparison with
a patient's scan, or operative planning.

## How this notice was prepared

The copyright notice is copied by the build script from the `LICENSE` input
file, not retyped. The citations are as given by the publishers; the CerebrA
licence is as described above. The decision to redistribute is an
**engineering assessment** of these terms, conditional on this notice staying
with the files. It is not legal advice and has not been reviewed by a lawyer.
