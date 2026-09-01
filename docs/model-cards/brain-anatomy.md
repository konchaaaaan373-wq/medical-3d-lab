# Model card — Interactive brain anatomy

| | |
| --- | --- |
| **Scene** | `brain-anatomy` |
| **Geometry** | [`public/assets/brain/brain.glb`](../../public/assets/brain/brain.glb) |
| **Metadata adapter** | [`src/data/brainAnatomy.js`](../../src/data/brainAnatomy.js) |
| **Tests** | [`tests/brain-anatomy.test.js`](../../tests/brain-anatomy.test.js) |
| **Evidence** | [`docs/model-evidence/brain-anatomy.md`](../model-evidence/brain-anatomy.md) |
| **Asset notice** | [`public/assets/brain/ATTRIBUTION.md`](../../public/assets/brain/ATTRIBUTION.md) |

## 1. What question this model answers

**Where is a named cortical or deep-brain structure relative to the rest of the
brain, and what is it called in English and Japanese?**

## 2. What it is

An interactive gross-anatomy atlas made from a Draco-compressed GLB containing
437 separately named meshes. This scene exposes the 271 meshes in the cortex,
deep grey matter, diencephalon, white matter, ventricular system, cerebellum
and brainstem. Every selectable mesh carries its own stable id, category, side,
region, source and anatomical label in glTF metadata.

The default **Colour map** gives every named structure a distinct teaching
colour inside a recognisable lobe colour family. A one-click **Natural anatomy**
mode uses low-saturation grey-pink cortex, ivory white matter and muted tissue
colours, with lower idle emission so lighting describes gyri and sulci more
clearly. Pointing at a mesh previews its exact name; clicking or tapping pins
it. The information card reports side, anatomical hierarchy, the exact English
atlas label, and a deliberate Japanese name for all 147 unique selectable
labels (271 left/right/midline meshes).

Left and right medial views hide the contralateral hemisphere at the midline so
medial structures can be inspected without moving anatomy. The layer sequence
can also expose the insula and registered deep structures by changing opacity,
never by separating or deforming meshes.
Selecting a cingulate mesh chooses the matching left/right medial view so the
named surface, rather than a label projected through the lateral shell, is put
in front of the learner.

## 3. What it is not

Not a patient-specific reconstruction, histology atlas, functional parcellation,
stereotactic planning tool or surgical-navigation system. It is not a FreeSurfer
Desikan–Killiany or Destrieux surface, and its mesh boundaries must not be
silently relabelled as those parcellations. The colours are teaching colours,
not tissue properties. The visibility slider and medial views are visibility
controls, not physical dissections or clinical scales.

## 4. Sources and licence

The GLB is redistributed unchanged from
[Brain Project](https://github.com/itayinbarr/brainproject), which derives its
gross-anatomy surfaces from Z-Anatomy and BodyParts3D / DBCLS. The model and
derived metadata are licensed CC BY-SA 4.0. The complete attribution and
redistribution notice travels beside the asset.

Several deep nuclei and white-matter structures were registered by the upstream
project from open MNI-space imaging atlases. Their source-atlas credits and
registration method are documented upstream.

Modern cingulate terminology is cross-checked against Destrieux et al. (2010)
and the FreeSurfer Destrieux terminology revision. Those sources distinguish
anterior cingulate cortex (ACC), anterior/posterior midcingulate cortex (aMCC /
pMCC), and dorsal/ventral posterior cingulate cortex. They guide wording only;
they do not convert the distributed geometry into a Destrieux atlas.

## 5. Accuracy and uncertainty

- Gross surface anatomy is illustration / gross-anatomy grade.
- Imaging-atlas-derived deep structures are approximate (the upstream project
  describes their registration resolution as about 7 mm).
- The scene does not assert voxel-level boundaries, population variability or
  patient-specific dimensions.
- Every one of the 147 unique selectable source labels has an explicit Japanese
  name. This removes runtime fallback English but does not substitute for an
  independent review of Japanese anatomical terminology.
- The current source geometry has no independent anterior cingulate cortex
  (ACC) mesh. Its `Middle anterior part` mesh is labelled as anterior
  midcingulate territory (aMCC) and carries an explicit warning that it is not
  ACC. Adding ACC requires a new, source-attributed cortical geometry dataset;
  renaming the existing mesh would be anatomically false.
- Functional summaries are brief orientation notes. Functions arise from
  distributed networks and should not be read as one-to-one localisation.

## 6. Presentation choices

Geometry is never enlarged, separated or moved by hover, selection, camera
view, or the layer slider. Hover and selection change emissive emphasis only.
Colour-map shades are deterministic from anatomical metadata, use the same
colour for left/right homologues, and vary hue, saturation and lightness inside
the parent lobe family. Natural-anatomy shades use a constrained low-saturation
range with small deterministic lightness differences between named meshes. The
same selector also updates the legend swatches; neither mode changes anatomical
identity or geometry.

The full hemispheric white-matter masses remain almost transparent in the deep
view; otherwise they would form a second enclosing shell and conceal the nuclei
the view is meant to teach. Named bundles such as the corpus callosum and fornix
remain visible.

## 7. What it must never be used for

Diagnosis, measurement, lesion localisation, stereotactic coordinates,
operative planning, navigation, estimating an individual's anatomy or making a
clinical claim about a person.

## 8. Review status

**Catalog status:** `alpha`

The real atlas, complete label-translation coverage, colour modes, hover/pin
interaction and medial visibility path are implemented and tested. Independent
medical review of the complete label set and Japanese terminology is not yet
recorded, and the source geometry still lacks a separately selectable ACC, so
this scene must not be marked reviewed or production.
