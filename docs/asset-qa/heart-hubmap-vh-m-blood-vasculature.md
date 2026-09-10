# Candidate inspection — `VH_M_Blood_Vasculature.glb`

The second file of the same release, read because the heart file has no great
vessels. **This is an inspection of a candidate, not an adoption**: the file is
pinned in [`src/catalog/devAssets.js`](../../src/catalog/devAssets.js), fetched
by `npm run assets:dev`, and is deliberately not in
[`src/catalog/assetManifest.js`](../../src/catalog/assetManifest.js), which is
the record of what may ship.

## What was fetched, and how it is pinned

| | |
| --- | --- |
| Repository | `hubmapconsortium/ccf-releases` |
| Commit | `b036a91aaf7234f462b1249d4a5f4fb0e982f412` |
| Path | `v1.2/models/VH_M_Blood_Vasculature.glb` |
| Bytes | 7,436,204 — as the repository records, and as fetched |
| git blob SHA-1 | `90016b0b5f8028ad0afa9d39672352ffce625498` — matches the candidate record |
| SHA-256 of the bytes | `a31ebed6d527b1cff31942e3e50d7c074c30b574337f68c4b89e9c88e4309d0d` |
| Fetched | 2026-09-09, over `raw.githubusercontent.com` at the pinned commit |

A git blob SHA-1 identifies the file *in that repository*; the SHA-256
identifies the bytes anywhere. `npm run assets:dev` checks all three and deletes
anything that fails.

## Terms

Stated by the publisher for the release: **CC BY 4.0**, derived from the
**Visible Human Male** dataset of the U.S. National Library of Medicine. Model
"Blood Vasculature, Male v1.2", DOI `10.48539/HBM686.LBDQ.998`.

**Nothing here discharges those terms.** No attribution surface exists, the NLM
courtesy line is not yet displayed anywhere, and no lawyer has read either set
of terms. Recorded, not settled — the same standing as the heart file.

## What the file contains

| | |
| --- | --- |
| glTF | 2.0, `babylon.js glTF exporter for Autodesk MAYA 2022.2` — the same exporter as the heart file |
| Extensions | none (no Draco) |
| Nodes / meshes / materials | 153 / 104 / 3 |
| Materials | `vein_mat8` pure blue (56 meshes), `artery_mat7` pure red (39), `phong7` pure red (9) |
| Whole extent | x −0.112…0.124, y −0.043…0.829, z −0.091…0.097 — head to pelvis, 0.87 m tall |
| Units | glTF metres as declared; the extent is consistent with a human torso and head |
| Triangles | 359,598 over the whole file |

Every mesh node carries the same `extras` shape the heart file uses: `label`,
`ontologyid`, `representation_of`, `anatomical_structure_of`,
`source_spatial_entity`.

## The subtree this scene takes

The source groups its own contents. Everything under
**`VH_M_blood_vasculature_of_heart`** — 37 meshes of 104, 153,505 triangles of
359,598 — is what the scene adopts. **That is the source's semantic selection,
not a box drawn round the heart by us**, which is the difference between "the
vessels of the heart" and "whatever happened to be nearby". The other 67 meshes
(eye, abdomen, pelvis) are counted and left in the file; the scene reports the
number in its status.

Five vessels arrive split into two meshes each (`_a`/`_b`) and are one structure
each: the descending aorta, the inferior vena cava, the brachiocephalic artery,
the left common carotid and the left subclavian.

### What is in that subtree

**Great vessels — every one the beta's list asks for:**
ascending aorta (UBERON:0001496), arch of the aorta (UBERON:0001508), descending
aorta (UBERON:0001514), pulmonary trunk (UBERON:0002333), left and right
pulmonary artery (UBERON:0001652, UBERON:0001651), superior vena cava
(FMA:4720), inferior vena cava (FMA:10951), and all four pulmonary veins
(FMA:49916, FMA:49913, FMA:49914, FMA:49911).

**Coronary arteries:** left coronary artery (UBERON:0001626), right coronary
artery (UBERON:0001625), a left anterior descending artery (see the defect
below), two diagonal branches (both FMA:3860), left marginal artery (FMA:3902),
right marginal artery (FMA:3818), posterior interventricular artery (FMA:3840).

**Cardiac veins:** coronary sinus (UBERON:0005438), great (UBERON:0006958),
middle (UBERON:0009687), small (UBERON:0035374) and anterior (FMA:76767) cardiac
veins, oblique vein of the left atrium (FMA:4715), posterior vein of the left
ventricle (FMA:4712).

**Arch branches and their veins:** brachiocephalic artery (UBERON:0001529), left
common carotid and branches (UBERON:0001536), left subclavian (UBERON:0001584),
left and right brachiocephalic veins (FMA:4761, FMA:4751).

## Do the two files share a frame? — measured, not assumed

Neither file was moved. Positions are the source's own, in metres:

| | ascending aorta | aortic valve (heart file) |
| --- | --- | --- |
| centre | (−0.002, 0.519, 0.029) | (0.007, 0.499, 0.029) |

The ascending aorta sits **20 mm above the aortic valve at the same depth**. The
pulmonary trunk (0.015, 0.524, 0.025) sits above the pulmonary valve (0.017,
0.508, 0.042). The superior vena cava (−0.025, 0.533, 0.020) is above and to the
−x side of the right atrium (−0.017, 0.481, 0.034); the inferior vena cava's
proximal mesh (−0.020, 0.429, 0.004) is below it. The left pulmonary veins are
at x +0.031 and +0.040 and the right pair at −0.022 and −0.031, all behind the
left atrium (0.004, 0.493, 0.008).

Every one of those is the relationship a normal heart has, and none of them was
produced by a transform of ours. **That is the evidence the frames agree.** It
is not a proof of sub-millimetre registration and no such claim is made: the
scene applies one display transform to the pair together and never re-centres
either file on its own.

The axes agree too: "Left inferior ophthalmic vein" is at x +0.026 and its right
counterpart at −0.020, so **+x is the patient's left** in this file as in the
heart file.

## Defects observed in the source

- **One node disagrees with itself.** `VH_M_left_anterior_descending_artery`
  carries `label: "Anterior descending branch of left pulmonary artery"` and
  `ontologyid: FMA:8636`. The node name says a coronary artery; the label and id
  say a pulmonary artery branch. The mesh sits at (0.043, 0.466, 0.055) — on the
  anterior surface of the ventricles, below the valve plane — and the file
  places it in the group it calls `VH_M_arteries_of_heart/VH_M_cardiac_artery`.
  **Recorded, not corrected.** The scene shows the node-derived name, keeps the
  source label and id beside it, and states the disagreement in both languages
  on the structure's own card.
- **No mesh is named "circumflex".** The left coronary system is a left coronary
  artery, an anterior descending artery, two diagonal branches and a left
  marginal artery. Which of them carries the circumflex course is not something
  this repository decides.
- **Two meshes share FMA:3860** (the diagonal branches). That is a vocabulary
  term applied twice, not a duplicate: they stay two structures.

## Format validation — **failed**, and by how much

Khronos glTF Validator (`gltf-validator` 2.0.0-dev.3.10), run 2026-09-09 against
sha256 `a31ebed6…`. Raw output:
[`measurements/gltf-validator.txt`](measurements/gltf-validator.txt); re-runnable
with `npm run assets:validate`.

| | |
| --- | --- |
| Errors | **33** — all `ACCESSOR_VECTOR3_NON_UNIT` |
| Warnings | 0 |
| Hints | 3 — `BUFFER_VIEW_TARGET_MISSING` |
| Triangles / vertices | 359,598 / 182,788 across 104 draw calls |
| Extensions | none (no Draco) |

Every error is a **degenerate vertex normal** — a normal of zero or near-zero
length — and they are confined to two meshes: 21 of the superior vena cava's
5,636 vertices and 12 of the left coronary artery's 6,306. Nothing else in the
file is flagged.

**This is a fail, not a pending.** It is the publisher's data and is not
corrected here. What it means in practice is that a handful of vertices have no
usable shading normal, which a renderer resolves however it resolves it; it is
not a reason the file cannot be looked at, and it is a reason the asset release
gate cannot record `formatValidation: passed`.

## Surface measurements — what these meshes are

Measured 2026-09-09 with `npm run assets:measure`; raw table in
[`measurements/surfaces-vasculature.tsv`](measurements/surfaces-vasculature.tsv).
Per mesh: triangle count, boundary edges at three weld tolerances, the volume
the surface encloses by the divergence theorem, and the number of times a ray
crosses the surface on its way out of the mesh's own centroid, over 128
directions.

### Lumen or wall — **withdrawn: the earlier conclusion was not supported**

An earlier version of this document concluded that no vessel has a modelled wall
thickness. **That conclusion is withdrawn.** The measurement it rested on cannot
support it.

The rule applied was "a single surface gives two crossings, a wall with an inner
and an outer surface gives four". That is the count for a ray crossing the whole
shape **from outside**. The script cast its ray **from a point inside the mesh,
outward**, where the counts are one and two — so "a mode of two, never four" is
exactly what a thick shell gives, and the observation distinguishes nothing. On
synthetic shapes: a closed cube gives 1 from inside and 2 from outside; a hollow
shell of outer half-width 1 and inner 0.6 gives 2 from inside and 4 from
outside.

A modal count over finitely many directions also cannot prove the *absence* of
an inner surface anywhere on a shape.

**Neither reading is asserted now.** The vessels are not described as lumens
(the claim before that, also withdrawn) and not described as having no wall. The
scene says the question is being checked. What is measured instead is below.

### The source caps some cut vessels

Eight meshes have no boundary edges at any tolerance: both pulmonary arteries,
all four pulmonary veins, both brachiocephalic veins and the small cardiac vein.
A tube with no boundary is a tube whose cut ends have been closed. **The source
did that**; this scene does not cap anything, and a capped end is recorded here
rather than presented as the vessel's natural shape.

### One mesh is notably ragged

`VH_M_left_coronary_artery` has **2,609 boundary edges** over 12,240 triangles —
two orders of magnitude more than any other vessel — and is also one of the two
meshes carrying degenerate normals. Recorded as observed. It is the publisher's
data and is not repaired here.

### Where the two files meet — measured, and a diagnostic only

Nearest-point distance between each vessel and the heart part it should meet, in
the source's own frame, with neither file moved.
[`measurements/junctions.tsv`](measurements/junctions.tsv);
`npm run assets:measure junctions`.

| Vessel | Heart part | Gap |
| --- | --- | --- |
| Ascending aorta | Aortic valve | **0.00 mm** |
| Pulmonary trunk | Pulmonary valve | 0.08 mm |
| Pulmonary trunk | Right ventricle | 0.17 mm |
| Superior vena cava | Right atrium | 0.09 mm |
| Inferior vena cava (proximal) | Right atrium | 0.05 mm |
| Left superior pulmonary vein | Left atrium | 0.07 mm |
| Left inferior pulmonary vein | Left atrium | 0.05 mm |
| Right superior pulmonary vein | Left atrium | 0.06 mm |
| Right inferior pulmonary vein | Left atrium | 0.06 mm |
| Left coronary artery | Aortic valve | 0.11 mm |
| Right coronary artery | Aortic valve | 0.14 mm |
| Coronary sinus | Right atrium | 0.16 mm |
| Ascending aorta | Left ventricle | 12.57 mm |

Twelve of the thirteen are under 0.2 mm and one is exactly zero — two
independently segmented files, neither moved by us, touching where they should
touch. **That is a strong corroboration that the two files share a frame**, on
top of the qualitative relationships recorded above.

The 12.57 mm is not a defect: the ascending aorta meets the **aortic valve**,
not the left ventricle's cavity surface, and the pair is in the table to show
what a genuine separation looks like beside the ones that touch.

**What this does not establish.** It is a distance between two surfaces, not a
judgement that either surface is in the right place. It says the files agree
with each other; it says nothing about whether they agree with a heart. **No
millimetre-level anatomical accuracy is claimed from these numbers**, here or
anywhere in the product.

## What this inspection did not do

- **No anatomical judgement.** The labels are the publisher's. Whether these
  vessels are a good representation of a normal heart's vasculature is an
  anatomist's call and has not been made.
- **What these surfaces are is still open** (above): neither lumen-versus-
  outside nor the presence of a wall thickness has been established, and the
  earlier conclusion on the second was withdrawn.
- **The junctions are measured now** (below) — as a diagnostic. No millimetre
  accuracy is claimed anywhere on the strength of them.
- **No decision about the Visible Human terms**, and no legal reading.

## What this means for the beta

The absence that closed the acceptance list is closed: every required great
vessel is present, with a source-given ontology id, in the same coordinates as
the heart. **That does not open the release gate**, and the gate does not read
this document. Both files are still candidates that have been through no asset
pipeline — no manifest record, no licence decision, no discharged obligations,
none of the five QA gates — and no publication decision exists.
`betaPublicationProblems('heart-anatomy')` reports the candidate asset by name.
