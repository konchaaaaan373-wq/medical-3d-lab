# Heart atlas asset attribution and licence notice

The two `.glb` files here are **modified** versions of HuBMAP Human Reference
Atlas reference organs. What was changed, and why, is stated below — CC BY 4.0
requires that a derivative say so.

| File | Derived from | SHA-256 of the file here | Bytes |
| --- | --- | --- | --- |
| `VH_M_Heart.glb` | `v1.2/models/VH_M_Heart.glb` (SHA-256 `b1237e7e765178e9357fd2ea7ccf19d55d0bf9ca55e187886635febe28244c70`) | `994a86380bd30bc9744c08edd9812825ab22b340339665a422be6ba545fbbf8a` | 424 932 |
| `VH_M_Blood_Vasculature.glb` | `v1.2/models/VH_M_Blood_Vasculature.glb` (SHA-256 `a31ebed6d527b1cff31942e3e50d7c074c30b574337f68c4b89e9c88e4309d0d`) | `de4170610a12b3cd0595be79c2254735de63b0375252448c32fefa210aad11b9` | 434 364 |

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

**The vasculature file also has 67 of its 104 meshes removed.** They are the
eye, abdominal and pelvic vessels: everything outside
`VH_M_blood_vasculature_of_heart`, which is the publisher's own grouping and the
only part this application has ever drawn. They were being downloaded by every
reader who opened the heart and shown to none of them — 5.24 MB gzipped. Nothing
under that node was touched, and no vertex of anything on screen moved.

On 2026-09-15 this was chosen over compressing the file, because Draco
quantizes vertex positions. Since 2026-09-24 both files are **also**
Draco-compressed — see "Compressed" below — so the drawn positions are no
longer byte-identical to the publisher's.

`scripts/repair-candidate-gltf.mjs` replaces each degenerate normal, and only
those:

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

**The repair touched nothing else.** For every mesh that ships, the repaired
file's vertex positions, vertex count, node name, place in the hierarchy,
ontology id (`extras`) and material are identical to the publisher's, and the drop in triangle count equals
exactly the number of degenerate triangles removed. The report checks this by
hashing each mesh's positions on both sides rather than asserting it. The measurements
are in [`docs/asset-qa/measurements/normal-repair.json`](../../../docs/asset-qa/measurements/normal-repair.json);
`npm run assets:repair:verify` reproduces these hashes from the sources and
reports the validator clean at 0 errors and 0 warnings on both files.

That is the repair. What ships is the repair **compressed**, below.

## Compressed (2026-09-24)

Both repaired files are then Draco-compressed by
`scripts/compress-heart-assets.mjs` (glTF-Transform 4.5.0, draco3dgltf 1.5.7,
settings fixed in the script), from 4 071 496 and 2 838 396 bytes to the sizes
in the table above. **Draco stores positions quantized to 14 bits per mesh, so
vertices move**: no vertex is more than 5.1 µm (heart) or 12.2 µm
(vasculature) from where the repair left it, and normals, stored at 10 bits,
agree to 0.19° at the 99th percentile. Node names, hierarchy, ontology ids
(`extras`), materials, triangle counts, which surfaces are closed, and each
enclosed volume to 0.1 mL are unchanged; the script compares them and fails
otherwise. Measured in
[`docs/asset-qa/measurements/draco-compression.json`](../../../docs/asset-qa/measurements/draco-compression.json);
`npm run assets:compress:verify` reproduces these hashes from the repair's
output.

No structure was added, renamed or removed, and no anatomical judgement was
made. Apart from the removed degenerate triangles and the quantization above,
no geometry was re-shaped. The source files are read-only to both scripts and
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
