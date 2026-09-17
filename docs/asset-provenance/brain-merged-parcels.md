# Provenance — the brain atlas's merged parcels (amygdala, hypothalamus, thalamus)

`brain-anatomy` ships several selectable structures that are not individual
segmented nuclei but **parcels the upstream generator built by combining
several numbered labels from a source atlas volume into one output mesh**.
Until 2026-09-16 the individual source label ids behind those parcels were
not recorded anywhere in this repository (F-123). This document records what
was recovered, where it came from, and — just as importantly — what is still
not verified.

**Nothing here is a re-derivation.** The GLB was not re-decoded, the source
NIfTI volumes were not opened, and no shape was re-generated. This is a
reading of the pinned upstream *generator script*, which is source code, not
imaging data.

## 1. Source

- Repository: `itayinbarr/brainproject`
- Commit: `2929e94f521a8ddceab26bc100a98dc06b0da060` (the revision
  [`public/assets/brain/ATTRIBUTION.md`](../../public/assets/brain/ATTRIBUTION.md)
  pins for the distributed `brain.glb`)
- File: `scripts/build_nuclei.py`
- Git blob SHA-1 of that file at that commit: `87d08baed296d1d14ed012e43b1ba521264b3e0b`
- URL:
  `https://github.com/itayinbarr/brainproject/blob/2929e94f521a8ddceab26bc100a98dc06b0da060/scripts/build_nuclei.py`

This record was produced by an AI-assisted re-review of `brain-anatomy`
(2026-09-16, `880eded`), §2.2, which read the pinned script directly rather
than the upstream repository's current `main`. This repository has not
independently re-fetched or re-read that blob; the tables below transcribe
what the re-review reported.

## 2. Amygdala — `AMY_GROUPS`

Input volume named in the script: `amyg_iAmyNuc_1mm_MNI.nii.gz`. A single
bilateral mask is split into left/right by the sign of MNI x.

| Displayed structure (`bx_label`) | Source label ids | Note |
| --- | --- | --- |
| Lateral nucleus | `[1]` | Single source label |
| Basolateral complex | `[2, 3, 6]` | Does not include `[1]` — confirmed in the pinned script |
| Central nucleus | `[4]` | Single source label |
| Corticomedial group | `[5, 7, 8, 9]` | Four source labels |

These are input-volume label numbers, **not** this atlas's `bx_id`. What each
numbered id was named in the *original* CIT168 amygdala lookup table has not
been cross-checked here.

## 3. Hypothalamus — `HYP_GROUPS`

Input volume named in the script: `hypothal_labels_MNI152b_0.5mm.nii.gz`. The
script builds the right side from the ids below and derives the left side by
adding 1 to each right-side (odd) id — confirmed by reading the actual
left/right processing, not inferred from the numbers alone.

| Displayed structure (`bx_label`) | Right-side ids | Left-side ids | Source labels per side |
| --- | --- | --- | --- |
| Preoptic hypothalamus | `[19]` | `[20]` | **1** |
| Anterior hypothalamus | `[53, 21, 45, 47, 31, 23]` | `[54, 22, 46, 48, 32, 24]` | **6** |
| Tuberal hypothalamus | `[29, 27, 37, 49]` | `[30, 28, 38, 50]` | **4** |
| Lateral hypothalamus | `[25]` | `[26]` | **1** |
| Posterior hypothalamus | `[51]` | `[52]` | **1** |

**Preoptic, lateral and posterior are each built from a single source label
per side, not from "several combined labels".** Only anterior (6) and
tuberal (4) genuinely merge multiple source labels. A prior description that
treated all five as one kind of "integrated parcel" overstated it for three
of the five (see `STRUCTURE_NOTE` fix below).

"Single source label" is not a claim that the original MNI atlas volume
itself contains only one cytoarchitectonic nucleus at that id — only that the
generator script pulled one numbered id for that side, not several.

Mamillary body is a separately named gross-anatomical structure (it contains
the medial and lateral mamillary nuclei, so it is not itself a single nucleus)
and is **not** one of these five Neudorfer-sourced parcels.

## 4. Thalamus — Najdenovska 7-parcel volumes

Input volume named in the script: `Thalamus_Nuclei-HCP-4DSPAMs.nii.gz`. The
script's own ordering of the seven parcels, and the zero-based volume index
in that file, are:

| Order | Parcel | Left volume index | Right volume index |
| --- | --- | --- | --- |
| 1 | Pulvinar | 0 | 7 |
| 2 | Anterior nuclei | 1 | 8 |
| 3 | Mediodorsal nucleus | 2 | 9 |
| 4 | Ventral laterodorsal (VLD) | 3 | 10 |
| 5 | Intralaminar and lateral posterior (CL–LP–PuM) | **4** | **11** |
| 6 | Ventral anterior nucleus (VA) | 5 | 12 |
| 7 | Ventral lateroventral (VLV) | 6 | 13 |

Left volumes occupy indices 0–6, right volumes 7–13, in that fixed order.
This is a **volume correspondence** — which numbered plane of the 4D file
feeds which displayed parcel — not a re-confirmation of what the original
Najdenovska lookup table calls each plane. Najdenovska et al. (2018) and
Neudorfer et al. (2020) both describe original lookup tables with codes,
names and sides; this repository has not cross-checked this atlas's numbering
against either.

## 5. What is NOT verified by this document

- **Original lookup-table (LUT) names.** The numbered ids above are input
  volume indices, not a re-confirmation of what the CIT168, Najdenovska or
  Neudorfer authors originally named each index.
- **Regeneration.** No mesh was rebuilt from the source NIfTI volumes, and
  this atlas's shipped geometry was not re-derived from them.
- **Input-file hashes.** `amyg_iAmyNuc_1mm_MNI.nii.gz`,
  `hypothal_labels_MNI152b_0.5mm.nii.gz` and
  `Thalamus_Nuclei-HCP-4DSPAMs.nii.gz` are named in the pinned script; their
  contents were not fetched, hashed or opened here.
- **Per-asset correspondence to the distributed `brain.glb`.** This document
  establishes what the pinned *generator script* does; it does not
  independently confirm that the distributed `brain.glb` was built by running
  that exact script unmodified.

## 6. Status

F-123 moves from "no source label ids recorded" to: **ids recovered from the
pinned generator script.** What remains: LUT name cross-check against the
original atlas papers, a per-asset correspondence record (§5 above), and
propagating this into every affected note (see `STRUCTURE_NOTE` in
[`src/data/brainAnatomy.js`](../../src/data/brainAnatomy.js)).
