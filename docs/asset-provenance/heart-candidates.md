# Provenance and terms — the heart candidates

The two files the `heart-anatomy` scene draws are **candidates**. This document
turns the primary sources into the record and the display obligations an asset
manifest entry would need, so that adopting them later is filling in a form
rather than starting an investigation.

**Nothing here is a decision.** No obligation below is discharged, no attribution
surface exists yet, no lawyer has read any of these terms, and no clinical or
anatomical review has happened. Reading a licence is not agreeing to one on
anybody's behalf, and this document does not approve publication, a commercial
release, or contact with any provider.

Primary sources consulted 2026-09-09 (the reviewer's `SOURCES.md`, re-read here).

## 1. The files

| | Heart | Vasculature |
| --- | --- | --- |
| Repository | `hubmapconsortium/ccf-releases` | same |
| Commit | `b036a91aaf7234f462b1249d4a5f4fb0e982f412` | same |
| Path | `v1.2/models/VH_M_Heart.glb` | `v1.2/models/VH_M_Blood_Vasculature.glb` |
| Bytes | 4,071,500 | 7,436,204 |
| git blob SHA-1 | `7efc2cf858b4434249a48c6f104842e1662c9043` | `90016b0b5f8028ad0afa9d39672352ffce625498` |
| SHA-256 | `b1237e7e765178e9357fd2ea7ccf19d55d0bf9ca55e187886635febe28244c70` | `a31ebed6d527b1cff31942e3e50d7c074c30b574337f68c4b89e9c88e4309d0d` |
| DOI (per the release's reference document) | `10.48539/HBM373.VSTV.568` | `10.48539/HBM686.LBDQ.998` |
| Named authors (vasculature document) | — | Kristen Browne, Heidi Schlehlein |

The reference documents live under `v1.3/markdown/ref-organs/` at the same
commit. **A `v1.3` folder is not a `v1.3` model**: both documents record model
version **v1.2**, and conflating the two would misstate which file this is.

Both documents record: Visible Human Male, NLM-derived, **CC BY 4.0**.

## 2. CC BY 4.0 — what it requires of us

<https://creativecommons.org/licenses/by/4.0/> ·
<https://creativecommons.org/licenses/by/4.0/legalcode.en>

Sharing and adaptation are permitted, commercial use included, on conditions.
Written as the obligations a release gate would check:

| Obligation | What would satisfy it | Status |
| --- | --- | --- |
| Attribution | Credit the model, its version, its authors, HuBMAP, and link the licence, wherever the model is served | **pending** — no surface exists |
| Licence link | A link to the CC BY 4.0 deed beside the attribution | **pending** |
| Indicate changes | State the modifications actually made — see §4 | **pending** |
| No added restrictions | Do not apply terms or technical measures that restrict what the licence permits | **not yet assessed** |
| No implied endorsement | Never suggest HuBMAP, the authors or NLM endorse this service | **pending** — wording drafted below |

**A derived 3D model is not public-domain material** and must never be
described as one here.

## 3. The underlying NLM data — a separate record

<https://www.nlm.nih.gov/research/visible/visible_human.html> ·
<https://www.nlm.nih.gov/research/visible/getting_data.html> ·
<https://www.nlm.nih.gov/databases/download/terms_and_conditions.html>

NLM describes the source imagery as a public-domain library and states that in
July 2019 the former Data License was replaced by its Terms and Conditions.
Those terms include crediting the source, not implying NLM endorsement, stating
on redistribution whether the data are the most current version, and a
disclaimer of warranty.

The credit line NLM specifies is exactly:

> Courtesy of the U.S. National Library of Medicine

**This is recorded separately from the CC BY 4.0 record above on purpose.** They
are two different sets of terms attaching to two different things — the derived
mesh and the imaging behind it — and collapsing them into one line would lose
whichever one is inconvenient later.

### The unresolved conflict, kept rather than tidied away

<https://catalog.data.gov/dataset/visible-human-project>

That government catalogue entry describes the project as public domain while its
machine-readable licence field names **ODbL**. Which of the original images, the
catalogue metadata, or a reprocessed 3D model that field is about is **not
established here**, and this record does not resolve it.

It is kept, and kept distinct from the explicit CC BY record the HuBMAP files
carry. If it needs settling, the way to settle it is to ask the provider about
these specific files and this specific use — **and that contact is not made by
this document and is not authorised by it.**

Equally, this conflict is not a reason to stop building. It bears on publication
and on terms of use, which are decided elsewhere and are not open.

## 4. What we would have to say we changed

Only what was actually done, and today that is:

* **Range taken.** From the vasculature file, the subtree the source itself
  groups as `VH_M_blood_vasculature_of_heart` — 37 meshes of 104. Nothing else
  from that file is served. The heart file is used whole.
* **Placement.** One offset and one uniform scale, applied to the two files
  together so their relative positions are the source's. No warp, no
  non-uniform scale, no per-file re-centring.
* **Materials.** The source materials are replaced for display. Natural mode
  reproduces the sources' own assignment (one tissue colour for the heart; the
  files' artery/vein materials for the vessels); parts mode is an identity
  colouring of ours and is labelled as such.
* **No geometry is edited.** No decimation, no remeshing, no repair, no added
  structure. Nothing is invented.

What we would have to **not** say: that the model has been reviewed by anyone at
HuBMAP or NLM, that either endorses this service, or that these are the most
current or most detailed data available. A pinned version is being used, and the
attribution would have to say so.

## 5. Draft attribution text — not yet displayed anywhere

Kept here so that adopting the assets is a review of wording rather than a
first draft under time pressure. **It is not on any surface.**

> 3D heart and cardiac vasculature: *Heart, Male* and *Blood Vasculature, Male*,
> version 1.2, from the HuBMAP Human Reference Atlas CCF release
> (`hubmapconsortium/ccf-releases` @ `b036a91a`), DOI 10.48539/HBM373.VSTV.568
> and DOI 10.48539/HBM686.LBDQ.998; vasculature by Kristen Browne and Heidi
> Schlehlein. Used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
> Segmented from the Visible Human Male dataset — *Courtesy of the U.S. National
> Library of Medicine*. Modified: a subset of the vasculature was taken (the
> source's own "blood vasculature of heart" grouping), the two models were
> placed together with a single uniform transform, and display materials were
> substituted. Geometry is unmodified. This is a pinned version and is not
> necessarily the most current data. Neither HuBMAP, the model's authors, nor
> the U.S. National Library of Medicine endorses this service or has reviewed
> this modified model.

## 6. What has to happen before either file may ship

1. An `assetManifest.js` record each, with the licence decision, component-level
   obligations and their `satisfiedBy` surfaces, hashes, coordinates, units,
   semantic parts, and the five QA gates.
2. `formatValidation` — the Khronos glTF Validator at a pinned version, on both
   files. Not run.
3. The attribution surface above, actually served beside the assets and linked
   from the model card and the Trust page.
4. An anatomist's judgement of the geometry and the labels, and a clinical
   review record. Neither exists.
5. A publication decision pinned to these exact hashes and the scene revision.

Until all of that, `betaPublicationProblems('heart-anatomy')` names the candidate
assets and the gate stays shut. That is the intended state, not a blocker to
work around.
