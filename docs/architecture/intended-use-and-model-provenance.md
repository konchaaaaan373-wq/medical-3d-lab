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
| `patient-explanation` | yes | An explanation of the **representative** model that a patient or family can look at, with or without a clinician present | Entering a patient's values; personalisation; diagnosis; prognosis; treatment or dose suggestion |
| `medical-education` | yes | Equations, read-outs, comparison, challenges, clinical context | Prediction beyond the model's validity |
| `clinical-research` | reusable, version-pinned, re-validated | Study patient-specific input and decision support | Treating the public educational validation as clinical validity |
| `clinical-care` | out of scope | Only after an intended-use statement and a regulatory determination | Mixing into the current site |

The current public product offers the first three. It has **no route, no
entitlement, no UI and no API** for the last two, and this is enforced by
`tests/model-profiles.test.js` rather than remembered.

### Patient explanation is not patient-specific

`patient-explanation` means an explanation of the **same representative
model** that a patient or family member can look at, whether or not a
clinician is present. It takes no patient data, stores none, personalises
nothing, and predicts nothing about the person looking at it. The `patient`
entitlement ([`access-and-billing.md`](../access-and-billing.md)) is one paid
surface for that use; intended use and billing are separate axes, so a paid
`patient` capability *requires* the use to be declared, and a free scene may
declare it too. The thing `product-principles.md` §13 warned against — "one wants to
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
- `literature-calibrated`, `externally-validated`, `cohort-derived`, the two
  patient-specific levels, `clinical-research` and `clinical-care` were not
  assigned to anything. Each needs a `validationRecords` entry naming a
  repository-relative file that exists — none of which exist, and none of
  which were invented.
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
validation nobody calls in the browser cost 8 kB of eager JavaScript). Both
validators return a list of problems and never throw, so a record that is
wrong in three ways gets three lines rather than a `TypeError`.

**Profiles**

- a profile id is duplicated, a scene references a profile that does not
  exist, or a non-prototype scene has none;
- any value falls outside the closed vocabulary, a list is not a list, is
  empty, or repeats itself;
- any profile — clinical ones included — omits `diagnosis`,
  `treatment-selection` or `dose-selection` from its prohibitions. Omission
  is never permission; a future clinical-care surface gets its own schema;
- a claim that needs evidence (`literature-calibrated`,
  `externally-validated`, `cohort-derived`, `patient-derived-geometry`,
  `patient-predictive`, `clinical-research`, `clinical-care`) has no
  `validationRecords`, or a record is a URL, an absolute path, escapes the
  repository, or does not exist;
- a scene in the public app claims `clinical-research`, `clinical-care`,
  `patient-derived-geometry`, `patient-predictive` or `externally-validated`
  — with or without a validation record, because the product has no release
  surface for any of them;
- a `patient` capability exists without `patient-explanation` declared (the
  reverse is allowed: a free scene may be one a patient looks at);
- the assets a profile names disagree with its geometry basis (§5), cover an
  organ the scene does not draw, or are missing from the asset manifest.

**Assets — the release gate.** `assetReleaseProblems()` is closed by default
and is applied to every asset a public scene names, for that scene's status.
It refuses when:

- `license.commercialUse` or `license.redistribution` is anything but
  `allowed`; the decision has no record; any licence obligation (attribution,
  ShareAlike, a data provider's acknowledgment, notice retention) is not
  `satisfied` by a file that exists;
- any hash is missing;
- any QA gate that applies to the asset's kind is `failed` (at every scene
  status), `pending`, `not-applicable` or unrecorded. `not-applicable` is
  accepted only where `QA_APPLIES` says the gate does not apply to that kind;
  there is no free-text waiver. The one deferral: `anatomyExpertReview` and
  `clinicianReview` may be `pending` for an **alpha** scene, because alpha is
  the status that means the review has not happened;
- the glTF Validator run has errors or warnings, or the validator, semantic
  integrity or visual review record names a different file hash than the
  current output — a review of another version is not a review of this one;
- an imaging-derived asset's de-identification is not `confirmed` (a
  structured status, not a sentence);
- `release.status` is not `released`.

Structural room is left for the future without pretending it has arrived: a
high claim is *structurally* valid with a real `validationRecords` file, and is
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
- **A GLB is a transport format, not a provenance.** `geometryBasis` says
  where a scene's shape came from; an asset's `sourceType` says where that
  file's content came from; `format` says how it is stored. A procedural
  organ exported to a GLB is still `procedural`, and a procedural profile may
  name procedural mesh assets and third-party materials. The cross-check is
  on provenance: a `procedural` profile may not name an atlas-, imaging- or
  structure-derived mesh (that is `hybrid`, and must say so); a
  `reference-atlas`, `imaging-derived` or `molecular` profile may name only
  meshes of that source type; `hybrid` must name at least one non-procedural
  mesh. Assets carry `kind` (`mesh` or `material`), and a material has no
  geometry block to fill.
- **An asset must cover only organs its scene draws.** The one structured
  exception is a systemic-context asset whose `organs` include `whole-body`,
  which any scene may draw as surroundings. There is no free-text override.
- **The order of the next two pieces of work is fixed across the documents**
  ([`public-release-roadmap.md`](../public-release-roadmap.md),
  [`grand-design.md`](../grand-design.md) §5.3, [`asset-pipeline.md`](../asset-pipeline.md)):
  1. **HRA normal heart** — the Phase 1 *technical* proof of the asset
     pipeline, in **Lab** or a development harness, compared against the
     existing procedural heart and the model-driven chambers, and never
     wired to the production heart-failure scene. Its go/no-go is a measured
     gain in medicine, interaction or performance without breaking the
     existing motion.
  2. **Lung** — the first *production-facing* anatomy upgrade (A2 plus the
     pulled A3 structures in `anatomy-specs.md` §1), which the respiratory
     disease scenes are waiting on.

---

## 6. What this decision does not do

It does not change any scene's `status`, any review state, any A level, any
medical model, any price, any route or any pixel. It adds a vocabulary, ten
honest classifications, one honest asset record with its measured QA
([`docs/asset-qa/brain-atlas-glb.md`](../asset-qa/brain-atlas-glb.md)), and
the tests that keep them honest. The brain atlas passes the release gate for
its `alpha` scene only; promoting `brain-anatomy` will fail CI until an
anatomist's review and a clinician's review are recorded as passed.
