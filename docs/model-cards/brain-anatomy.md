# Model card — Interactive brain anatomy

| | |
| --- | --- |
| **Scene** | `brain-anatomy` |
| **Geometry** | [`public/assets/brain/brain.glb`](../../public/assets/brain/brain.glb) |
| **Metadata adapter** | [`src/data/brainAnatomy.js`](../../src/data/brainAnatomy.js) |
| **Tests** | [`tests/brain-anatomy.test.js`](../../tests/brain-anatomy.test.js) |
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

The default surface view colours cortical structures by lobe. The next view
hides the right cerebral hemisphere and fades selected left opercular
structures to expose the insula without translating or deforming anatomy. The
deep view fades the cortical surface and reveals registered internal structures
in their atlas positions.

## 3. What it is not

Not a patient-specific reconstruction, histology atlas, functional parcellation,
stereotactic planning tool or surgical-navigation system. The lobe colours are
teaching colours, not tissue properties. The visibility slider is a layer
control, not a physical dissection or a clinical scale.

## 4. Sources and licence

The GLB is redistributed unchanged from
[Brain Project](https://github.com/itayinbarr/brainproject), which derives its
gross-anatomy surfaces from Z-Anatomy and BodyParts3D / DBCLS. The model and
derived metadata are licensed CC BY-SA 4.0. The complete attribution and
redistribution notice travels beside the asset.

Several deep nuclei and white-matter structures were registered by the upstream
project from open MNI-space imaging atlases. Their source-atlas credits and
registration method are documented upstream.

## 5. Accuracy and uncertainty

- Gross surface anatomy is illustration / gross-anatomy grade.
- Imaging-atlas-derived deep structures are approximate (the upstream project
  describes their registration resolution as about 7 mm).
- The scene does not assert voxel-level boundaries, population variability or
  patient-specific dimensions.
- Japanese translations are curated for common learning structures. Less common
  structures retain the exact English atlas label beside a Japanese parent
  region rather than inventing a translation.
- Functional summaries are brief orientation notes. Functions arise from
  distributed networks and should not be read as one-to-one localisation.

## 6. Presentation choices

Geometry is never enlarged, separated or moved by hover, selection or the layer
slider. Selection changes emissive emphasis only. Adjacent cortical meshes get
very small deterministic lightness differences so their borders remain
legible, while every structure stays within its parent lobe colour.

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

The real atlas and interaction path are implemented and tested. Independent
medical review of the complete label set and Japanese terminology is not yet
recorded, so this scene must not be marked reviewed or production.
