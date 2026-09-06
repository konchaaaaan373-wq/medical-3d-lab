# Brain atlas asset attribution and licence notice

`brain.glb` is redistributed **unchanged** from **Brain Project** by Itay Inbar,
repository revision `2929e94f521a8ddceab26bc100a98dc06b0da060`, file
`brain-atlas/models/brain.glb`
(SHA-256 `76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453`,
4 650 816 bytes).

- Source: https://github.com/itayinbarr/brainproject
- Asset licence: Creative Commons Attribution-ShareAlike 4.0 International
  (CC BY-SA 4.0), https://creativecommons.org/licenses/by-sa/4.0/
- Copyright: Z-Anatomy contributors and BodyParts3D / DBCLS, and the authors of
  the atlases listed below

The Brain Project viewer code is Apache-2.0 and is not used here; the licence
notice for the model must stay with the `.glb`, and this file is that notice.

## Components of the model

The model is a composite. Each component, its authors and its licence, as
stated in the upstream `LICENSE`, `README.md` and `docs/registration.md` at the
revision above:

| Component | Used for | Licence (as stated upstream) |
| --- | --- | --- |
| Z-Anatomy, built on BodyParts3D © The Database Center for Life Science (DBCLS) — https://github.com/Z-Anatomy, https://lifesciencedb.jp/bp3d/ | Surface meshes: cortex, ventricles, brainstem, cerebellum, vessels, nerves | CC BY-SA 4.0 |
| CIT168 subcortical atlas — Pauli, Nili & Tyszka 2018, *Scientific Data* — https://osf.io/jkzwp/ | Registered deep nuclei (globus pallidus split, subthalamic nucleus, substantia nigra, nucleus accumbens) | CC BY 4.0 |
| CIT168 amygdala atlas — Tyszka & Pauli 2016 — https://osf.io/hksa6/ | Registered amygdala functional groups | CC BY-SA 4.0 |
| Najdenovska et al. 2018, in-vivo probabilistic atlas of human thalamic nuclei, *Scientific Data* — https://doi.org/10.5281/zenodo.1405484 | Registered thalamic nuclei groups | CC BY-SA 4.0 |
| Neudorfer et al. 2020, high-resolution in vivo MRI atlas of the human hypothalamic region, *Scientific Data* — https://doi.org/10.5281/zenodo.3942115 | Registered hypothalamic zones | CC BY 4.0 |
| HCP1065 population-averaged tractography atlas (Yeh 2022), built on Human Connectome Project WU-Minn data — https://brain.labsolver.org/hcp_trk_atlas.html | Centerlines for the white-matter tract tubes | CC BY-SA 4.0, with the HCP data-use terms below |

The atlas-registered deep structures and tracts are approximate (about 7 mm,
registered from open MNI-space atlases) and are intended for gross-anatomy
education rather than diagnosis, measurement, operative planning or navigation.

## Human Connectome Project acknowledgment

The white-matter tracts derive from HCP1065 templates built on Human Connectome
Project data. As the WU-Minn HCP open-access data use terms require:

> Data were provided in part by the Human Connectome Project, WU-Minn
> Consortium (Principal Investigators: David Van Essen and Kamil Ugurbil;
> 1U54MH091657) funded by the 16 NIH Institutes and Centers that support the
> NIH Blueprint for Neuroscience Research; and by the McDonnell Center for
> Systems Neuroscience at Washington University.

Any redistribution of these HCP-derived data must carry this acknowledgment and
be made under the same terms.

## ShareAlike and attribution

The application does not alter the distributed GLB geometry. It assigns its own
teaching colours, visibility states, and bilingual explanatory copy at runtime.
Any redistributed **modification** of the model must remain under CC BY-SA 4.0,
keep this attribution in full, and keep the HCP acknowledgment above. The
CC BY 4.0 components are redistributed inside the CC BY-SA 4.0 work with their
attribution retained.

The vendored Draco decoder files in `draco/` are redistributed with the upstream
viewer for local model decoding and are covered by their upstream open-source
licence notices. They are code, not anatomy, and are not part of the asset
manifest.

## How this notice was prepared

The component list and licences were read from the upstream repository at the
revision above on 2026-09-06 and were not independently verified against each
component's own publisher; BodyParts3D itself is published by DBCLS under
CC BY-SA 2.1 Japan, which the upstream project states it redistributes as
CC BY-SA 4.0. The redistribution and commercial-use decisions recorded in
`src/catalog/assetManifest.js` are an **engineering assessment** of these
licence texts, conditional on the obligations in this notice being kept. They
are not legal advice and have not been reviewed by a lawyer.
