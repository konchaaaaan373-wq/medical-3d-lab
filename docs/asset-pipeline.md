# Asset pipeline — from a source mesh to a released asset

How an external 3D asset (a reference-atlas mesh, a segmented scan, a molecular
structure, a third-party texture) gets into `public/assets/` and in front of a
learner, and where it stops if it should. The contract it fills in is
`src/catalog/assetManifest.js`; the boundary it serves is
[`architecture/intended-use-and-model-provenance.md`](architecture/intended-use-and-model-provenance.md).

This is a production procedure, not a runtime one. Nothing here runs in the
browser, at build time, or in CI beyond `npm test` checking the record.

## Principles

- **Blender is a tool, not a source of truth.** It edits, splits, retopologises,
  morphs, optimises and exports. It cannot make a mesh anatomically correct or
  medically reviewed.
- **MCP is a window, not a record.** An operator may drive Blender or
  TotalSegmentator through a local stdio MCP server to prototype. Whatever it
  did is then promoted to a script, a command line or a `.blend` that
  reproduces the result from the same inputs; the manifest records *that*.
  Local only; no production tool connects to a public HTTP endpoint; pinned
  releases; least privilege; a dedicated branch; a human reads the diff. No
  MCP configuration, token or credential is committed.
- **A draft is a draft.** Auto-segmentation and generative output claim no
  accuracy until they pass QA and medical review. Generic text- or
  image-to-3D is not a source of medical shape at all.
- **No PHI, ever.** Raw DICOM, anything with a face, anything with a patient
  identifier: never in the repository, never in an asset, never in a manifest.
- **Licences are checked per thing, not per tool.** The source data, model
  weights, each task, and the output asset each have their own terms.
- **Existing procedural geometry stays.** An asset may replace a builder only
  after a Lab comparison shows a measured gain, and it replaces at most the
  builder it was compared against.

## Stages and stop conditions

| # | Stage | Output | Stop if |
| --- | --- | --- | --- |
| 1 | **Learning goal and A level** — which scene pulls this asset, which structure it must be able to name (`anatomy-specs.md`) | One sentence naming the pull | No scene or candidate needs the structure |
| 2 | **Source comparison** — HRA 3D Reference Object Library first; NIH 3D entry by entry; public CT/MRI datasets for research only | Chosen source, version, URL/DOI | The source cannot be pinned to a version |
| 3 | **Licence, attribution, PHI** — redistribution, commercial use, ShareAlike/derivative terms, attribution text; for imaging, de-identification and subject provenance | `license` block and, for imaging, the `imaging` block | Any decision is `unknown` → record it as such and stop before stage 9; PHI cannot be ruled out → stop entirely |
| 4 | **Acquire and hash** — download once, record SHA-256 of every source file | `sources[]` with hashes and the retrieval date | The hash does not match a published one where one exists |
| 5 | **Segmentation / registration** (3D Slicer; TotalSegmentator only when a scene needs a variant from a source image) | Surfaces, method, manual edits, tool versions | The method cannot be written down |
| 6 | **Cleanup and semantic split** (Blender) — name every part a scene will point at, in the scene's anatomical axes; fix units and orientation | `.blend` or script; part id → anatomical name mapping | A part has no anatomical name; left/right cannot be derived from the recorded axes |
| 7 | **Export** — glTF/GLB, with part ids in node names or extras | The output file and its SHA-256 | Export is not reproducible from the recorded inputs |
| 8 | **Validate and optimise** — Khronos glTF Validator; Draco/meshopt; triangle count, materials, textures, bytes against `performanceBudget.js` and `npm run budget` | `qa.validator`, `budget` | Validator errors; the bundle budget fails |
| 9 | **Semantic and anatomy QA** — landmark relationships in `tests/semantic-anatomy.test.js`; the checklist at the end of `organ-3d-playbook.md`; cross-scale agreement with the whole-body view | `qa.anatomyTests` | A recorded relationship fails |
| 10 | **Device QA** — real rendering on desktop and a current phone, the viewport matrix if UI changed, sectioning and selection where the scene uses them | `qa.visualReview` reference | Frame budget missed on the target device |
| 11 | **Medical review** — through the clinical-review registry, in the scope of the scene that uses the asset | `qa.clinicianReview` | Required for any `reviewed`/`production` scene; an `alpha` scene may ship with it `pending` and says so |
| 12 | **Release** — manifest entry complete, `release.status` set, `replacement.rollback` written, changelog line | A versioned commit | `assetReleaseProblems()` is not empty |

A record can exist at any stage. What it cannot do is skip: `release.status`
may only become `released` when every earlier stage has left its trace in the
entry, and `tests/asset-manifest.test.js` refuses an asset used by a public
scene that has not.

## The record

One entry per asset in `src/catalog/assetManifest.js`. Common core for every
asset; one conditional block for its source type; nothing filled with a
made-up "N/A". The validator names any field that is missing for the type,
and `assetReleaseProblems()` separately says why the asset may not ship.

`unknown` is a legitimate value for a licence decision. It means "under
investigation" and it fails the release gate. Do not replace it with
`allowed` to make a test pass; replace it with a decision and the record of
who made it.

## What is in the manifest today

One asset: the brain atlas GLB that `brain-anatomy` has shipped since
2026-09-01, recorded after the fact from `public/assets/brain/ATTRIBUTION.md`,
the file itself and git history. Its record says which stages it never went
through — the glTF Validator was not run here, the upstream hash was not
independently verified, the licence reading is an engineer's, not a legal
review — rather than pretending it did. The vendored Draco decoder next to it
is a code dependency with its own upstream notice, not a medical asset, and
is not in the manifest.

## What this pipeline is not for

Not for procedural organ builders in `src/scenes/<system>/organs/` — those are
code, reviewed as code. Not for social-card rasters. Not for any patient's own
imaging: that is the separate clinical R&D programme described in the
architecture decision, and it has no path into this product.

## Next: the HRA heart pilot

The first run of this pipeline is one normal heart from the HRA 3D Reference
Object Library, through stages 1–10, compared in **Lab** (or a development
harness) against the existing procedural heart and the model-driven chambers of
`heart-failure`, and **not connected to production**. The questions it must
answer: are the semantic parts, units and axes usable by the existing
scenes; does it hold the frame budget on a low-end phone; can it coexist with
the dynamic chambers as a hybrid. If no measured gain, it is not adopted.
