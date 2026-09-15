# Heart atlas asset attribution and licence notice

The two `.glb` files here are **modified** versions of HuBMAP Human Reference
Atlas reference organs. What was changed, and why, is stated below — CC BY 4.0
requires that a derivative say so.

| File | Derived from | SHA-256 of the file here | Bytes |
| --- | --- | --- | --- |
| `VH_M_Heart.glb` | `v1.2/models/VH_M_Heart.glb` (SHA-256 `b1237e7e765178e9357fd2ea7ccf19d55d0bf9ca55e187886635febe28244c70`) | `46d375e36d8181c161b70e1f0b8f0d778364f0a8414eebce4e4fda1cea73eb3d` | 4 071 496 |
| `VH_M_Blood_Vasculature.glb` | `v1.2/models/VH_M_Blood_Vasculature.glb` (SHA-256 `a31ebed6d527b1cff31942e3e50d7c074c30b574337f68c4b89e9c88e4309d0d`) | `b971eec1fc0d0d6a0fe080c634584c84ab3517239818ca091efc7a0bd0ec13fb` | 7 436 176 |

Both sources were taken from
[`hubmapconsortium/ccf-releases`](https://github.com/hubmapconsortium/ccf-releases)
at commit `b036a91aaf7234f462b1249d4a5f4fb0e982f412`, downloaded 2026-09-09. The
version is pinned deliberately: this notice, the manifest entry and the
publication decision all describe **these exact bytes**, and following a moving
upstream would let a published model change without a decision.

## Credit

| | Heart, Male v1.2 | Blood Vasculature, Male v1.2 |
| --- | --- | --- |
| **Creator(s)** | Kristen Browne (ORCID [0000-0003-4066-7531](https://orcid.org/0000-0003-4066-7531)) | Kristen Browne and Heidi Schlehlein (ORCID [0000-0002-3333-5646](https://orcid.org/0000-0002-3333-5646)) |
| **Reviewer(s)** | Shin Lin | Marc Halushka and Shin Lin |
| **Publisher** | HuBMAP | HuBMAP |
| **Funder** | NIH, award OT2OD026671 | NIH, award OT2OD026671 |
| **DOI** | [10.48539/HBM373.VSTV.568](https://doi.org/10.48539/HBM373.VSTV.568) | [10.48539/HBM686.LBDQ.998](https://doi.org/10.48539/HBM686.LBDQ.998) |
| **Licence** | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

Each object states its own licence in its own upstream record; neither was
inferred from the other.

## What was modified

The Khronos glTF Validator reported errors in both source files and **only** this
kind: `ACCESSOR_VECTOR3_NON_UNIT`, a vertex normal of zero or near-zero length.
408 of them in one mesh of the heart (`VH_M_right_cardiac_atrium`, 408 of its
24 068 vertices) and 33 across two meshes of the vasculature. A degenerate normal
carries no direction, so there is nothing in it to preserve.

`scripts/repair-candidate-gltf.mjs` replaces each one, and only those:

- A normal that already had unit length is not rewritten, not even re-normalised.
- Replacements are the area-weighted mean of the adjacent face normals — what
  any renderer computes for a smooth surface.
- Triangles with no area, and exact duplicate faces, were removed first, because
  a vertex whose only neighbours are degenerate triangles has no face to average:
  820 zero-area triangles and 4 duplicates in the heart (0.50% of its triangles),
  26 and 5 in the vasculature (0.007%). **A zero-area triangle draws nothing**,
  which is why removing one cannot change the rendered surface.
- Where a surface folds back on itself so the adjacent faces cancel exactly, the
  largest adjacent face's normal is taken — deterministically, because there is
  no correct answer at a fold.

**Nothing else was touched.** Vertex positions, vertex counts, node names, node
hierarchy, ontology ids (`extras`) and materials are identical on both sides, and
the drop in triangle count equals exactly the number removed. The measurements
are in [`docs/asset-qa/measurements/normal-repair.json`](../../../docs/asset-qa/measurements/normal-repair.json);
`npm run assets:repair:verify` reproduces these hashes from the sources and
reports the validator clean at 0 errors and 0 warnings on both files.

No geometry was re-shaped, no structure added, renamed or removed, and no
anatomical judgement was made. The source files are read-only to that script and
are not redistributed here.

## Acknowledgment — U.S. National Library of Medicine

Both reference organs derive from the **Visible Human Male** dataset of the
**U.S. National Library of Medicine, National Institutes of Health**.

This acknowledgment is given rather than reasoned away. NLM replaced its Visible
Human Data License with Terms and Conditions in July 2019 and no licence
agreement is required to obtain the data, but that reading rests on secondary
sources — the primary pages could not be retrieved when this notice was written
— so an acknowledgment is assumed to be owed and is given here.

## What this model is not

Gross-anatomy education. It is one fixed cadaveric specimen, not a patient, not a
population average, and not a measurement instrument. The source contains no
myocardial free wall as a named part, no pericardium, no chordae and no
conduction system. It must not be used for diagnosis, treatment selection, dose
selection, prognosis or procedure planning.
