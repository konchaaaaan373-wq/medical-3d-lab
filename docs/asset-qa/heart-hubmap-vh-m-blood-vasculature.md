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

Khronos glTF Validator (`gltf-validator` 2.0.0-dev.3.10), re-run 2026-09-10
against sha256 `a31ebed6…`. The full report as the validator returned it:
[`measurements/gltf-validator-VH_M_Blood_Vasculature.json`](measurements/gltf-validator-VH_M_Blood_Vasculature.json).

`npm run assets:validate` re-runs it and **exits 1 while this file has errors** —
0 for a clean run, 1 for validator errors, 2 when it could not run at all.
Warnings do not change the exit code. The source GLB is opened read-only; this
repository does not repair the publisher's data.

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

## Surface measurements — with an instrument that was checked first

Re-measured 2026-09-10 with `npm run assets:measure`. Every number comes from
[`scripts/lib/mesh-metrics.mjs`](../../scripts/lib/mesh-metrics.mjs), which is
pure and is run against shapes with known answers — a cube, a hollow shell, a
solid rod, a walled pipe, an open sheet, a non-manifold tetrahedron — in
[`tests/mesh-metrics.test.js`](../../tests/mesh-metrics.test.js), **before** it
is pointed at a GLB. Raw table:
[`measurements/surfaces-vasculature.tsv`](measurements/surfaces-vasculature.tsv).

### Lumen or wall — **still undetermined, and the earlier answer is withdrawn**

An earlier version of this document concluded that no vessel has a modelled wall
thickness. **Withdrawn.** The rule applied was "a single surface gives two
crossings, a wall gives four", which is the count for a ray crossing the whole
shape **from outside**; the script cast its ray from a point **inside** the
mesh, outward, where a solid gives one and a shell gives two. On synthetic
shapes: a closed cube gives 1 from inside and 2 from outside; a hollow shell of
outer half-width 1 and inner 0.6 gives 2 from inside and 4 from outside. The
observation distinguished nothing. A modal count over finitely many directions
could not have proved the absence of an inner surface anywhere on a shape
either.

A second answer was then tried and **is also withdrawn**: that the **genus**
settles it, a solid rod being a ball (genus 0) and a walled tube a solid torus
(genus 1). It does not, and it fails in both directions:

- **A wall, and genus 0.** A cup — a cavity reaching the outside through one
  mouth — is topologically a ball. `tests/mesh-metrics.test.js` measures a
  square cup whose side wall is 1 unit and whose floor is 0.5: V 16, E 42,
  F 28, χ 2, **genus 0**, closed, manifold, one component, enclosing 50 of a
  possible 64. A vessel whose ends are closed by caps bridging the wall across
  the lumen is that shape.
- **No wall, and genus 1.** A closed loop of solid rod is solid material the
  whole way round, with the hole in the middle of the ring rather than in the
  vessel. That is an anastomosis, and any circuit in a vascular network.

So the genus describes how complicated a surface is, not whether it has a wall.
What the 37 vessels give, restated as description rather than as a verdict:

| | Count | What it is |
| --- | --- | --- |
| Open surfaces (boundary edges > 0) | **26** | Genus is undefined for an open surface. |
| Non-manifold or several components | **2** (left coronary artery, superior vena cava) | The mesh is broken before topology can be computed. |
| Closed, manifold, one piece, **genus ≥ 2** | **8** (pulmonary trunk, both pulmonary arteries, all four pulmonary veins, both brachiocephalic veins) | 2 to 6 handles in the surface. |
| Closed, manifold, one piece, **genus 0** | **1** (small cardiac vein) | No handle in the surface. |

**The honest position is that the question is open for all thirty-seven.** The
earlier line — "one vessel is established to have no wall thickness, and for the
other thirty-six the question is open" — is withdrawn with the rule it rested
on. Nothing in this repository measures wall thickness, and the scene says the
question is being checked, in the words a reader sees, without claiming either
answer.

Nothing here says which side of a vessel a surface traces. A calibre comparison
would sit inside specimen variation, and the file records no segmentation
intent.

### Corrected numbers

Separating boundary edges from non-manifold edges and excluding degenerate
triangles changed several figures this document previously printed. The
corrections, not the old numbers, are what the raw table now holds.

- **`VH_M_left_coronary_artery` is broken, and worse than recorded.** Not "2,609
  boundary edges": **6 components**, 285 boundary edges at a 1 µm weld (138 at
  10 µm), 84 non-manifold edges and **2,924 degenerate triangles** out of 12,240.
  It is also one of the two meshes the validator flags for degenerate normals.
- **`VH_M_superior_vena_cava`**: 3 components, 13 boundary edges at 1 µm (0 at
  10 µm), 15 non-manifold edges, 89 degenerate triangles.
- **Ten vessels are closed**, not eight: the pulmonary trunk, both pulmonary
  arteries, all four pulmonary veins, both brachiocephalic veins and the small
  cardiac vein. A tube with no boundary is a tube whose cut ends the source has
  closed. **The source did that**; this scene caps nothing.
- **Signed volume is reported as a signed volume.** For the 26 open meshes it is
  not an enclosed volume and is marked `volumePrecondition: not met`; several
  are negative, which is inconsistent winding rather than negative space. The
  standing counter-example is in the test file: one open triangle sums to 0 at
  the origin and to 1/6 of a cubic unit a unit away.
  The column never reads "met", even for the closed meshes. Closed, manifold and
  one piece is what the script checks; an enclosed volume also needs consistent
  orientation and no self-intersection, and **neither is checked anywhere here**,
  so those rows say `partly met` and name what was left unchecked.

### Where the two files meet — a **sampled-vertex** distance, and a diagnostic

Smallest distance between a de-duplicated **vertex** of a vessel and a vertex of
the heart part it meets, in the source's own frame, with neither file moved.
Vertices de-duplicated at 10 µm.
[`measurements/junctions.tsv`](measurements/junctions.tsv);
`npm run assets:measure junctions`.

| Vessel | Heart part | Nearest sampled vertex |
| --- | --- | --- |
| Ascending aorta | Aortic valve | **0.00 mm** |
| Inferior vena cava (proximal) | Right atrium | 0.05 mm |
| Left inferior pulmonary vein | Left atrium | 0.05 mm |
| Right superior pulmonary vein | Left atrium | 0.06 mm |
| Right inferior pulmonary vein | Left atrium | 0.06 mm |
| Left superior pulmonary vein | Left atrium | 0.07 mm |
| Pulmonary trunk | Pulmonary valve | 0.08 mm |
| Superior vena cava | Right atrium | 0.09 mm |
| Left coronary artery | Aortic valve | 0.11 mm |
| Right coronary artery | Aortic valve | 0.14 mm |
| Coronary sinus | Right atrium | 0.16 mm |
| Pulmonary trunk | Right ventricle | 0.17 mm |
| Ascending aorta | Left ventricle | 12.57 mm |

**This is not a distance between surfaces.** Two meshes can interpenetrate
without sharing a vertex, and two surfaces meeting along a face can have their
nearest vertices far apart — the test file measures a small box nested inside a
large one and gets 6.7, not 0. So **0.00 mm means two sampled vertices coincide
to 10 µm**, and not that the surfaces are joined, continuous or watertight.

Twelve of thirteen under 0.2 mm, across two independently segmented files
neither of which was moved, is a **corroboration that the two files share a
frame**, alongside the qualitative relationships above. The 12.57 mm is in the
table on purpose: the ascending aorta meets the aortic valve, not the left
ventricle's surface, and it shows what a genuine separation reads like beside
the ones that nearly touch.

**It says nothing about whether either file agrees with a heart, and no
millimetre-level anatomical accuracy is claimed from it anywhere.**

## What this inspection did not do

- **No anatomical judgement.** The labels are the publisher's. Whether these
  vessels are a good representation of a normal heart's vasculature is an
  anatomist's call and has not been made.
- **What these surfaces are is still open** (above): neither lumen-versus-
  outside nor the presence of a wall thickness has been established, for any of
  the thirty-seven. Two successive conclusions on the second — first from a ray
  count, then from the genus — were both withdrawn.
- **No junction is evaluated as a junction.** What is measured (below) is a
  **sampled-vertex** distance, as a diagnostic that the two files share a frame.
  Whether a vessel and a chamber are joined, continuous or watertight is not
  evaluated, and no millimetre accuracy is claimed on the strength of it.
- **No decision about the Visible Human terms**, and no legal reading.

## What this means for the beta

The absence that closed the acceptance list is closed: every required great
vessel is present, with a source-given ontology id, in the same coordinates as
the heart. **That does not open the release gate**, and the gate does not read
this document. Both files are still candidates that have been through no asset
pipeline — no manifest record, no licence decision, no discharged obligations,
none of the five QA gates — and no publication decision exists.
`betaPublicationProblems('heart-anatomy')` reports the candidate asset by name.
