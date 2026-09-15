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

Khronos glTF Validator (`gltf-validator` 2.0.0-dev.3.10), re-run 2026-09-10
against sha256 `b1237e7e…`. The full report as the validator returned it:
[`measurements/gltf-validator-VH_M_Heart.json`](measurements/gltf-validator-VH_M_Heart.json).

`npm run assets:validate` re-runs it and **exits 1 while this file has errors**
(0 clean, 1 validator errors, 2 could not run). Warnings do not change the exit
code. The source GLB is opened read-only.

**408 errors, 0 warnings, 3 hints.** Every error is
`ACCESSOR_VECTOR3_NON_UNIT` — a degenerate vertex normal — and **all 408 are in
`VH_M_right_cardiac_atrium`**, 408 of that mesh's 24,068 vertices (1.7%). No
other mesh in the file is flagged. The hints are `BUFFER_VIEW_TARGET_MISSING`.

This is a **fail**, not a pending. It is the publisher's data and is not
corrected here; it is a reason the asset release gate cannot record
`formatValidation: passed`.

## Re-measured surfaces, and two corrections

Re-measured 2026-09-10 with `npm run assets:measure heart`, using
[`scripts/lib/mesh-metrics.mjs`](../../scripts/lib/mesh-metrics.mjs) — pure, and
run against shapes with known answers in
[`tests/mesh-metrics.test.js`](../../tests/mesh-metrics.test.js) before it is
pointed at a GLB. Raw table:
[`measurements/surfaces-heart.tsv`](measurements/surfaces-heart.tsv).

**The enclosed volumes are reproduced exactly** and now come with the
preconditions that make them volumes: left ventricle 121.60 mL, right ventricle
73.99, left atrium 31.35, interventricular septum 28.09 — each from a surface
that is closed, manifold and one piece.

### Correction 1: the right atrium's edge counts, twice over

This document has printed three different numbers for the same thing. The
original record said **3**. A re-measurement said **286 at a 1 µm weld, 39 at
10 µm**, and called the original not reproducible. Both re-measured figures were
artefacts of a metric that counted every edge whose use-count was not two — so
boundary edges, non-manifold edges and the edges of degenerate triangles, added
together and labelled "boundary edges".

Separated, the mesh reads: **3 boundary edges** (at 1 µm and at 10 µm alike),
**134 non-manifold edges**, **1,554 degenerate triangles** of 48,186, and **3
connected components**. So **the original 3 was right**, and the correction to
286 was wrong. What the earlier numbers were pointing at is real and is worse
than an open rim: this mesh is non-manifold and in three pieces.

### Correction 2: the withdrawn wall-thickness reading, twice

The ray count that produced it is withdrawn — see the vasculature document. So
is what replaced it. This document previously argued that the left ventricle's
surface being **closed, manifold, one component and genus 0** meant "no
through-hole, so a solid volume and not an annular wall". **That reasoning is
withdrawn.** Genus counts handles in a surface, not walls: a cup has a 1-unit
wall and genus 0, and a loop of solid rod has no wall and genus 1. Both are
measured in `tests/mesh-metrics.test.js`.

The supporting sentence went too far as well. 121.60 mL was called
"chamber-sized rather than a wall's worth of muscle"; a normal left ventricular
myocardial volume is of the same order as a normal cavity volume, so that figure
does not choose between them either.

What survives is the description, and it is worth having:

| | |
| --- | --- |
| Left ventricle | closed, manifold, 1 component, genus 0, enclosing **121.60 mL** |
| Left atrium | closed, manifold, genus 4 |
| Right ventricle | closed, manifold, genus **26** |
| Closed and manifold overall | 9 of the 14 parts |
| Not closed or not manifold | aortic valve (72 boundary edges), three papillary muscles (42, 26, 21), right atrium (non-manifold, 3 pieces) |

Genus 26 on a trabeculated cavity cast is unsurprising and is recorded rather
than explained. **What these surfaces represent — cavity cast, wall, or
something in between — is not established by any of it**, and no interior view
is offered, because there is no measured basis for drawing one.

## Rendered — 2026-09-15

The gap below said "no render". It is closed for the exterior. `npm run
shots:anatomy -- --scene heart-anatomy --preview` drew the scene at its six
viewpoints in both colour modes, through the shipping renderer, with the
candidate fetched by `npm run assets:dev` (both hashes matched).

**The images are deliberately not committed.** They are derivatives of an asset
that has not been adopted, and this repository does not carry third-party
binaries (CLAUDE.md). Re-run the command above to reproduce them; the scene,
the viewpoints and the colour modes are all in the repository, so the renders
are reproducible without being stored.

### What the images establish

- **The surface reads as a heart.** Smooth shading across the chambers, no
  visible seams, no inverted normals, no holes at any of the six viewpoints.
  The 408 validator errors in one mesh do not show as artefacts from outside.
- **The great vessels are there after all — from the other file.** The scene
  takes the `VH_M_blood_vasculature_of_heart` subtree of the vasculature
  candidate, and it supplies the aorta, the arch, the pulmonary trunk and the
  caval stubs, plus coronary arteries and cardiac veins on the surface. This is
  the "second sourced asset" route this document named, working.
- **Both files register to each other.** The vessels meet the chambers where
  they should; the two candidates share a coordinate frame.

### The interior, rendered — the ten parts no viewpoint shows

The scene's `inside-the-chambers` fixed view hides the four chamber surfaces
whole and leaves what the source puts inside them. It is not a section and
nothing is cut; `npm run shots:anatomy -- --scene heart-anatomy --preview
--recipe all` now shoots it, so this is reproducible rather than a one-off.

**All ten interior parts are real geometry, and they read as what they are.**

- **The aortic valve has three cusps**, distinguishable as three.
- **The mitral valve has leaflets** with an annular form, not a disc.
- **The interventricular septum is a continuous sheet**, correctly placed
  between the ventricles.
- **The five papillary muscles are separate stubs**, each its own mesh.
- The coronary arteries and cardiac veins from the vasculature candidate sit
  on the surface where the chambers were, so the two files' interiors and
  exteriors agree.

**The fidelity limit this makes visible, and it is the important one:** the
septum renders as a *sheet*, because this file has surfaces around spaces and
no myocardial free wall anywhere. Anatomically the interventricular septum is
a thick muscular wall. The model can say where it is and what it separates; it
cannot say how thick it is, and a scene built on it must not imply that it can.
The same is true of every chamber "wall". This is the file's nature, recorded
in `HeartAnatomyScene.js` before this render and confirmed by it.

### What they still do not establish

- **Named-structure quality (A2) is shown for the interior, not the exterior.**
  Inside, ten parts are separable and visibly bounded. From outside only four
  surfaces are distinguishable, and whether that is the file or the scene's
  palette is not established here.
- **The subject sits left of centre with roughly a third of the frame empty
  on the right, in every view.** Not investigated here and not necessarily the
  asset's: the capture hides the interface *after* the scene has framed
  itself, so a docked right-hand panel would leave exactly this gap. It is
  recorded because somebody comparing these images to the brain's will see it,
  and because if it is not the panel then it is the subject bounds being
  stretched by the vessels.

## What this inspection did not do

- **No render.** ~~The file has not been drawn~~ — the exterior was rendered on
  2026-09-15, see above. Still unrendered: anything inside the myocardium.
  Nothing is known here about seams,
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
