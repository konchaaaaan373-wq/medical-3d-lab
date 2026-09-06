# Intended use and model provenance

Status: accepted, 2026-09-06. Companion strategy: *Medical 3D Lab — 大戦略・
設計／実装計画* (2026-09-05), whose decisions this document turns into
contracts the repository can test.

This document owns two boundaries the rest of the documentation only refers to:

1. the difference between **how a model reaches a reader** and **what a model
   may be used for**, and
2. the difference between **the claim a scene makes** and **where its geometry
   and numbers came from**.

It exists because both are easy to lose quietly. A product that has a
"Patient" button and a "Reel" button and a `production` badge is one refactor
away from being read as a patient-specific, clinically validated simulator,
without anyone having decided that it should be.

---

## 1. Two axes that must not be confused

### Axis A — delivery layers

`SNS → Interactive Web → Educational Module`
([`product-principles.md`](../product-principles.md) §3). These are ways of
reaching a reader. All three consume the same medical state. **None of them is
a statement about who may rely on the model or for what.**

### Axis B — intended use

| Intended use | Same model? | Allowed | Not allowed |
| --- | --- | --- | --- |
| `general-education` | yes | Explore normal and disordered mechanism | Decisions about an individual |
| `patient-explanation` | yes | A clinician shows the **general** model with less jargon | Entering a patient's values; diagnosis; prognosis; treatment or dose suggestion |
| `medical-education` | yes | Equations, read-outs, comparison, challenges, clinical context | Prediction beyond the model's validity |
| `clinical-research` | reusable, version-pinned, re-validated | Study patient-specific input and decision support | Treating the public educational validation as clinical validity |
| `clinical-care` | out of scope | Only after an intended-use statement and a regulatory determination | Mixing into the current site |

The current public product offers the first three. It has **no route, no
entitlement, no UI and no API** for the last two, and this is enforced by
`tests/model-profiles.test.js` rather than remembered.

### Patient explanation is not patient-specific

The `patient` entitlement ([`access-and-billing.md`](../access-and-billing.md))
unlocks a jargon-light presentation of the **same representative model**. It
takes no patient data, stores none, and predicts nothing about the person in
the room. The thing `product-principles.md` §13 warned against — "one wants to
type in *this* patient's EF" — remains exactly as forbidden as it was; what
changed is that the general-model explanation now exists as a product surface,
and this document names the line it sits behind.

A future patient-specific or clinical programme is a separate track with its
own intended-use statement, hazard analysis, validation dataset, version
freeze, privacy/QMS design and a regulatory determination (PMDA/厚労省
programme-medical-device applicability). Until such a programme exists, no
scene may declare `clinical-research`, `clinical-care`,
`patient-derived-geometry` or `patient-predictive`, and the `circulation`
scene, which mentions fluids and dobutamine, stays a constructed teaching case
and is never described as decision support.

---

## 2. The three registers, and what each owns

`SCENE_MANIFEST` was not enlarged to carry all of this. Three registers with
narrow responsibilities are cheaper to keep true than one that knows everything.

| Register | Where | Owns | Does not own |
| --- | --- | --- | --- |
| **Scene manifest** | `src/catalog/scenes.js` | Existence, route, organ, engineering `status`, paid `access`, lazy load, the ids of its model card and model profile | Medical detail, asset licences |
| **Model profile** | `src/catalog/modelProfiles.js` | Geometry basis, mechanism level, personalization, intended and prohibited uses, the asset ids it depends on | Route, billing state, any copy of evidence text or numbers |
| **Asset manifest** | `src/catalog/assetManifest.js` | Source, version, licence decision, hashes, coordinates and units, conversion steps, semantic part ids, budget, QA state, rollback | Disease equations, teaching copy |
| Model card | `docs/model-cards/` | What the model answers, does not answer, and where it misleads | Machine-readable classification |
| Evidence dossier | `docs/model-evidence/` + `src/models/evidence*.js` | Claim → source → implementation → assumption → validation, with a confidence level per claim | Product policy |
| Clinical review | `docs/clinical-reviews/registry.json` | Who reviewed which commit for which scope, and whether it is still current | Engineering maturity |
| Card revisions | `docs/model-cards/revisions.json` | Whether the card still describes the model | Review currency |
| Anatomy fidelity (A0–A3) | [`anatomy-specs.md`](../anatomy-specs.md) | How far each **organ builder** has been measured and fixed | Per-scene claims |

A scene references a profile by id; a profile references assets by id; the
card and the review are found through the existing mechanisms
(`modelCard` on alpha/reviewed entries, the review registry's `sources` for
production ones). No path or number is copied twice.

**The model profile is a release profile of the claim a scene publishes, not
a universal id of a solver.** Two scenes that share one pure-JS model may share
a profile if they publish the same claim, and must have two if they do not.
Today each of the ten non-prototype scenes has its own.

---

## 3. Why the axes are kept apart

A single "accuracy" badge would be wrong in every direction at once. These
questions have different answers for the same scene, and each has its own
owner:

| Question | Axis | Owner |
| --- | --- | --- |
| Is the shape drawn, or from an atlas, or from a scan? | `geometryBasis` | model profile |
| Are the numbers illustrated, computed, calibrated to literature, or validated on independent data? | `mechanismLevel` | model profile |
| Does it stand for a population, a cohort, or a person? | `personalization` | model profile |
| Who is it for, and what must it never be used for? | `intendedUses` / `prohibitedUses` | model profile |
| How far is the software taken? | `status` | scene manifest |
| Did a clinician sign this commit, and is that still current? | review state | clinical-review registry |
| How far is the organ's anatomy measured and fixed? | A0–A3 | anatomy specs |

Concretely: `heart-failure` is `production` (the reference implementation),
`legacy-unversioned` in review, `mechanistic` rather than
`literature-calibrated`, `representative`, and its heart builder is A2. Any
one of those read as the others would mislead.

### Vocabulary and operational definitions

The closed enums live in `src/catalog/modelProfiles.js` with their definitions
as JSDoc. Two departures from the strategy's list, both recorded there:

- `mechanismLevel: none` was added for structure-only scenes. The brain atlas
  has no state; calling it `illustrative` would say it illustrates a
  mechanism it does not have.
- `prohibitedUses` gained `prognosis` and `procedure-planning`, because the
  clinical-review registry already states both in prose (the patient-guide
  policy forbids prognosis; the brain atlas forbids lesion localisation,
  operative planning and navigation). A prohibition the registry states should
  be one a test can read.

### Back-fill rules used for the current catalogue

- Classified from the model card, evidence dossier and review record — not
  from the scene's ambitions. Ambiguity resolved downward.
- **No scene is `literature-calibrated`.** The evidence registry files its
  calibrations as textbook targets this repository chose
  (`CONFIDENCE.CALIBRATION`: "a consequence of a target, not a measurement"),
  and the dossiers record that the build environment could not reach the
  literature. The level is reserved for the day a dossier cites a dataset
  range and a test holds the model inside it.
- `externally-validated`, `patient-predictive`, `clinical-research` and
  `clinical-care` were not assigned to anything, and cannot be assigned
  without a `validationRecords` entry — none of which exist, and none of which
  were invented.
- Every current profile is `representative`; `production` did not raise a
  claim, and `patient: true` was read as *patient-explanation*, never as
  patient-specific.
- Prototypes carry no profile. They publish no numbers, and a default profile
  would have been a claim written by nobody. A prototype may reference one
  later, but only at `none` or `illustrative`.

---

## 4. The guards

`tests/model-profiles.test.js` and `tests/asset-manifest.test.js` fail the
build when (the check is test-side on purpose: the profile and asset data are
not read by the runtime, and pulling them into the entry chunk for a
validation nobody calls in the browser cost 8 kB of eager JavaScript):

- a profile id is duplicated, a scene references a profile that does not
  exist, or a non-prototype scene has none;
- any value falls outside the closed vocabulary, or a list is empty or
  repeats itself;
- a non-clinical profile omits `diagnosis`, `treatment-selection` or
  `dose-selection` from its prohibitions;
- a scene in the public app claims `clinical-research`, `clinical-care`,
  `patient-derived-geometry`, `patient-predictive` or `externally-validated`
  — with or without a validation record, because the product has no release
  surface for any of them;
- a `patient` capability exists without `patient-explanation` declared, or
  the reverse;
- atlas-, imaging-, hybrid- or molecular-based geometry names no asset, or a
  procedural profile names one (a procedural scene that starts loading a GLB
  has become `hybrid` and must say so);
- a named asset is not in the asset manifest, or an asset used by a public
  scene fails the release gate for that scene's maturity.

Structural room is left for the future without pretending it has arrived: a
high claim is *structurally* valid with a `validationRecords` entry, and is
*still refused* by the public-app rule. Lifting the second needs the separate
programme in §1, not a test edit.

---

## 5. External assets, Blender and MCP

The runtime stays Three.js + Vite with `three` as the only dependency. External
meshes, when they arrive, are **assets with a record**, not a replacement for
the procedural organs — a builder for the whole-body view and a builder for a
model-driven chamber are two things at different scales, and
[`CLAUDE.md`](../../CLAUDE.md) already says not to delete either.

- **Blender** (and 3D Slicer) are offline production tools: segmentation,
  cleanup, semantic split, retopology, morph targets, export. They produce
  files; they are not a source of medical correctness and never a build or
  runtime dependency.
- **MCP** servers (Blender MCP, TotalSegmentator MCP) are an operator's window
  onto those tools for interactive prototyping. The record of what was done is
  the script, the command line, the `.blend` and the asset manifest entry — a
  step that only exists as an MCP conversation is not reproducible and does
  not count. None are configured in this repository, and no token or endpoint
  ever will be.
- **Generated or auto-segmented output is a draft** until it passes the
  pipeline in [`asset-pipeline.md`](../asset-pipeline.md): licence and PHI
  review, hashing, validation, semantic and anatomy QA, device QA, medical
  review, then a versioned release.
- The first external candidate is one normal heart from the HRA 3D Reference
  Object Library, taken into a **Lab** comparison against the existing
  dynamic chambers and not wired to the production heart-failure scene. That
  is the next pull request, not this one, and its go/no-go is a measured
  improvement in medicine, interaction or performance without breaking the
  existing motion.

---

## 6. What this decision does not do

It does not change any scene's `status`, any review state, any A level, any
medical model, any price, any route or any pixel. It adds a vocabulary, ten
honest classifications, one honest asset record, and the tests that keep them
honest.
