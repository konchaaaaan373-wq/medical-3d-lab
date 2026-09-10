# Candidate asset — HuBMAP *3D Reference Organ for Heart, Male v1.2*

**This is an inspection, not an adoption.** The file has been fetched and read;
it is not in `public/`, not in the asset manifest, not in a scene, and no
publication decision refers to it. What follows is what the file actually
contains, measured, so that the decision about it can be made from the file
rather than from its name.

## What was fetched, and how it is pinned

| | |
| --- | --- |
| **Repository** | `hubmapconsortium/ccf-releases` |
| **Commit** | `b036a91aaf7234f462b1249d4a5f4fb0e982f412` |
| **Path** | `v1.2/models/VH_M_Heart.glb` |
| **Retrieved** | 2026-09-09, over the permitted route (`raw.githubusercontent.com`) |
| **Bytes** | 4,071,500 — matches the size the candidate record states |
| **git blob SHA-1** | `7efc2cf858b4434249a48c6f104842e1662c9043` — **matches** the candidate record |
| **SHA-256** | `b1237e7e765178e9357fd2ea7ccf19d55d0bf9ca55e187886635febe28244c70` — the candidate record left this null; this is the file's own digest and is what any manifest entry must pin |

A git blob SHA-1 and a file SHA-256 are different things about the same bytes.
Both are recorded because the first is what identifies the file *in that
repository* and the second is what identifies the file *anywhere*.

## Terms, as the publisher states them

From `v1.3/markdown/ref-organs/heart-male.md` at the same commit (the metadata
document sits in the v1.3 directory and describes the v1.2 organ — the candidate
record's caution about that is correct):

- **License:** CC BY 4.0 (Creative Commons Attribution 4.0 International)
- **Creator:** Kristen Browne (ORCID 0000-0003-4066-7531)
- **Reviewer:** Shin Lin (ORCID 0000-0003-0118-0413)
- **Publisher:** HuBMAP · **Funder:** NIH, award OT2OD026671
- **Source data:** Visible Human Male, National Library of Medicine
- **Date:** 2022-05-06 · **DOI:** 10.48539/HBM373.VSTV.568 · **HuBMAP ID:** HBM373.VSTV.568

CC BY 4.0 permits redistribution and commercial use and requires attribution.
**That is a reading of the licence the publisher states, not a legal review**,
and it is the same basis on which the brain atlas is recorded (`assessment:
engineering`). One thing it does not settle: the underlying Visible Human Male
dataset has its own terms from the National Library of Medicine, which this
record has *not* examined.

## What the file contains

glTF 2.0, exported by "babylon.js glTF exporter for Autodesk MAYA 2022.2".
No extensions used or required — **no Draco**, so it decodes without the
vendored decoder the brain needs.

| | |
| --- | --- |
| Nodes | 18 (14 with geometry, 4 grouping) |
| Meshes | 14 · **Materials** 1 (`heart_mat`, a plain red PBR, no textures) |
| Triangles | 164,119 · **Vertices** 82,066 |
| Extent | 0.124 × 0.105 × 0.105 in glTF metres — about 12 cm, a plausible adult heart |
| Position | centred near (0.02, 0.48, 0.04), i.e. placed in **whole-body coordinates** rather than about its own origin |

### The 14 parts, with the ontology ids the source gives them

Every part carries a `label`, an `ontologyid` and a `representation_of` purl in
its glTF `extras`. **The semantic ids come from the source**; nothing here has
to be invented or inferred from a mesh name.

| group | part | ontology id | triangles |
| --- | --- | --- | --- |
| cardiac chamber | left cardiac atrium | UBERON:0002079 | 33,946 |
| cardiac chamber | right cardiac atrium | UBERON:0002078 | 48,186 |
| cardiac chamber | heart left ventricle | UBERON:0002084 | 9,350 |
| cardiac chamber | heart right ventricle | UBERON:0002080 | 27,622 |
| cardiac chamber | interventricular septum | UBERON:0002094 | 8,074 |
| heart valve | mitral valve | UBERON:0002135 | 6,468 |
| heart valve | tricuspid valve | UBERON:0002134 | 12,490 |
| heart valve | aortic valve | UBERON:0002137 | 2,680 |
| heart valve | pulmonary valve | UBERON:0002146 | 13,288 |
| papillary muscle | anterior papillary muscle of left ventricle | FMA:7264 | 638 |
| papillary muscle | anterolateral head of lateral papillary muscle of LV | FMA:7265 | 518 |
| papillary muscle | septal papillary muscle of right ventricle | FMA:7262 | 152 |
| papillary muscle | posterior papillary muscle of right ventricle | FMA:7261 | 131 |
| papillary muscle | posteromedial head of posterior papillary muscle of LV | FMA:7267 | 576 |

## What is **not** in the file

Checked by reading every node, not inferred from the name of the file:

- **No great vessels.** No aorta, no pulmonary trunk, no superior or inferior
  vena cava, no pulmonary veins. The beta's priority list
  (`05-HEART-ACCEPTANCE.md` §2) names all of these as required.
- **No coronary arteries.**
- **No pericardium, no conduction system, no chordae tendineae.**
- **No separate myocardial wall.** The chamber meshes are the chambers; whether
  each is a wall shell or a cavity surface is a question about the geometry that
  reading the node list cannot answer and that has not been answered here.

## Format validation — **failed**, in one mesh

Khronos glTF Validator (`gltf-validator` 2.0.0-dev.3.10), run 2026-09-09 against
sha256 `b1237e7e…`. Raw output:
[`measurements/gltf-validator.txt`](measurements/gltf-validator.txt);
`npm run assets:validate` re-runs it.

**408 errors, 0 warnings, 3 hints.** Every error is
`ACCESSOR_VECTOR3_NON_UNIT` — a degenerate vertex normal — and **all 408 are in
`VH_M_right_cardiac_atrium`**, 408 of that mesh's 24,068 vertices (1.7%). No
other mesh in the file is flagged. The hints are `BUFFER_VIEW_TARGET_MISSING`.

This is a **fail**, not a pending. It is the publisher's data and is not
corrected here; it is a reason the asset release gate cannot record
`formatValidation: passed`.

## Re-measured surfaces, and a correction

Measured 2026-09-09 with `npm run assets:measure`;
[`measurements/surfaces-heart.tsv`](measurements/surfaces-heart.tsv).

The enclosed volumes recorded earlier are reproduced exactly: left ventricle
121.60 mL, right ventricle 73.99, left atrium 31.35, right atrium 27.71,
interventricular septum 28.09, aortic valve 16.29.

**The boundary-edge count for the right atrium was wrong.** It was recorded as
3; measured now with vertices welded at 1 µm it is **286**, and at 10 µm it is
**39**. The count depends on the weld tolerance; that the mesh is open does not.
The other four open meshes are stable at every tolerance and match what was
recorded: aortic valve 72, anterior papillary 42, medial papillary 26, posterior
papillary 21.

The ray-crossing test that was applied to the vessels was applied here too, and
**the conclusion drawn from it is withdrawn** — see the vasculature document for
why the test cannot tell a solid from a shell. What still holds for the chambers
is the volume: a closed surface enclosing 121.6 mL is a chamber-sized cavity and
not a wall's worth of muscle, and that — not the ray count — remains the reason
no interior view is offered.

## What this inspection did not do

- **No render.** The file has not been drawn; nothing is known here about seams,
  holes, inside-out winding, or whether the chambers read as chambers.
- **No anatomical judgement.** The labels are the publisher's. Whether the
  geometry is a good representation of a normal heart is an anatomist's call and
  has not been made.
- **No decision about the underlying Visible Human terms** (above).
- Two `representation_of` purls in the source look malformed against their own
  ontology ids — `fma72655` for FMA:7265 and `fma72611` for FMA:7261. Recorded
  as observed. Not corrected here: it is the publisher's data.

## What this means for the beta

The chambers, the septum and the four valves are present with source-given ids,
which is most of the interior the acceptance list asks for. **The great vessels
are absent, and they are on the required list**, so this file alone cannot
satisfy it. The two honest routes are a second sourced asset for the vessels, or
a deliberately limited scope that says in the UI and the model card what it does
and does not contain. Inventing the vessels is not one of them.
