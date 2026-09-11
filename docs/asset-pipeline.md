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
| 4 | **Acquire and hash** — download once, record SHA-256 (and the git blob id where the source is a repository) of every source file, the download timestamp and the pinned revision | `sources[]` with hashes, `source.revision`, `source.retrievedAt` (or `null` with a note, plus `introducedAt` from git) | The hash does not match a published one where one exists |
| 5 | **Segmentation / registration** (3D Slicer; TotalSegmentator only when a scene needs a variant from a source image) | Surfaces, method, manual edits, tool versions | The method cannot be written down |
| 6 | **Cleanup and semantic split** (Blender) — name every part a scene will point at, in the scene's anatomical axes; fix units and orientation | `.blend` or script; part id → anatomical name mapping | A part has no anatomical name; left/right cannot be derived from the recorded axes |
| 7 | **Export** — glTF/GLB, with part ids in node names or extras | The output file and its SHA-256 | Export is not reproducible from the recorded inputs |
| 8 | **Format validation and optimisation** — Khronos glTF Validator at a pinned version, run on the file and, where Draco hides the attribute payloads, on a decoded derivative too; Draco/meshopt; triangle count, materials, textures, bytes against `performanceBudget.js` and `npm run budget` | `qa.formatValidation` (tool, version, timestamp, errors, warnings, scope, the hash it ran against), `budget` | Any error or warning; the bundle budget fails |
| 9a | **Semantic integrity** — a test that the parts a scene points at exist, are named as the adapter expects, and that the file is the one recorded (hash) | `qa.semanticIntegrity` with the hash | The test fails |
| 9b | **Anatomy expert review** — an anatomist or clinician judges the geometry and label set; landmark relationships fixed in `tests/semantic-anatomy.test.js`; the checklist at the end of `organ-3d-playbook.md`; cross-scale agreement with the whole-body view | `qa.anatomyExpertReview` with the reviewer role and date | A recorded relationship fails, or the reviewer rejects |
| 10 | **Visual / browser review** — a real browser renders the scene with this exact file; browser, viewport, scene, date and commit recorded; the viewport matrix if UI changed; a current phone; sectioning and selection where the scene uses them | `qa.visualReview` with the hash | The scene does not load, errors, or misses the frame budget on the target device |
| 11 | **Clinician review** — through the clinical-review registry, in the scope of the scene that uses the asset | `qa.clinicianReview` | Required for any `reviewed`/`production` scene; an `alpha` scene may ship with it (and 9b) `pending` and says so |
| 12 | **Release** — manifest entry complete, `release.status` set, `replacement.rollback` written, changelog line | A versioned commit | `assetReleaseProblems()` is not empty |

A record can exist at any stage. What it cannot do is skip: `release.status`
may only become `released` when every earlier stage has left its trace in the
entry, and `tests/asset-manifest.test.js` refuses an asset used by a public
scene that has not. `failed` at any gate blocks at every scene status. There
is no free-text waiver: a gate may be `not-applicable` only where the asset's
`kind` says it does not apply (`QA_APPLIES` in the manifest module — a
texture has no anatomy to review), and a reviewer can read that rule in one
place. The four file-bound gates (8, 9a, 9b, 10) record the hash they ran
against; a review of a previous version of the file is not a review of this
one. That includes the expert anatomy review, deliberately: it is the only
gate that can establish anatomical correctness, so a replaced mesh must not
inherit it while the cheaper gates are simply re-run. Clinician review is the
one review gate not bound to a hash, because the clinical-review registry
already owns its staleness through `stalePaths`.

## The record

One entry per asset in `src/catalog/assetManifest.js`. Common core for every
asset; a `kind` (`mesh` or `material` — a material carries no geometry
block); one conditional block for its source type; nothing filled with a
made-up "N/A". The validator names any field that is missing for the kind
and type, and `assetReleaseProblems()` separately says why the asset may not
ship. `sourceType` is provenance and `format` is storage: a procedural organ
exported to a GLB is recorded as `procedural`.

**Licences are recorded per component.** A composed asset lists every source
it is made of (`components[]`, each with its own licence and any additional
terms) and every obligation those licences impose (`license.obligations[]`:
attribution, ShareAlike, a data provider's acknowledgment, notice retention),
each pointing at the file that discharges it and saying how a reader of the
product reaches that notice. The gate checks every obligation is `satisfied`
by a file that exists. The decision itself says whether it is an
`engineering` or a `legal` assessment.

`unknown` and `restricted` are legitimate values for a licence decision.
They mean "under investigation" or "permitted with conditions we have not
met", and both fail the release gate. Do not replace them with `allowed` to
make a test pass; replace them with a decision and the record of who made
it.

## What is in the manifest today

One asset: the brain atlas GLB that `brain-anatomy` has shipped since
2026-09-01, re-judged against this pipeline on 2026-09-06 rather than
grandfathered. What was measured is in
[`asset-qa/brain-atlas-glb.md`](asset-qa/brain-atlas-glb.md): the upstream
file re-downloaded at its pinned revision and found byte-identical; the glTF
Validator at `2.0.0-dev.3.10` reporting 0 errors and 0 warnings on the file
and on a Draco-decoded derivative; the semantic-integrity test; and an
engineering render in Chromium at 1440 × 900. The composite's seven
components and their licences, including the WU-Minn HCP acknowledgment the
tract templates require, are in `public/assets/brain/ATTRIBUTION.md`. What
was not done is recorded as `pending`: no anatomist has reviewed the atlas,
no clinician has signed the scene, and the licence reading is an engineering
assessment. The asset therefore passes the gate for its `alpha` scene only.
The vendored Draco decoder next to it is a code dependency with its own
upstream notice, not a medical asset, and is not in the manifest.

## What this pipeline is not for

Not for procedural organ builders in `src/scenes/<system>/organs/` — those are
code, reviewed as code. Not for social-card rasters. Not for any patient's own
imaging: that is the separate clinical R&D programme described in the
architecture decision, and it has no path into this product.

## Next, in this order

The public beta is the **anatomy of the brain and the heart**, so the heart is
no longer only a technical pilot: it is what the beta is missing. That changes
the urgency of item 1, not its gates. Nothing below is relaxed to get a heart
out — an asset that does not clear every stage does not reach the public scene,
and the beta opens one organ instead. See `beta-release.md`.

1. **HRA normal heart — the Phase 1 technical proof of this pipeline.** One
   normal heart from the HRA 3D Reference Object Library, through stages
   1–10, compared in **Lab** (or a development harness) against the existing
   procedural heart and the model-driven chambers of `heart-failure`, and
   **not connected to production**. The questions it must answer: are the
   semantic parts, units and axes usable by the existing scenes; does it hold
   the frame budget on a low-end phone; can it coexist with the dynamic
   chambers as a hybrid. If no measured gain, it is not adopted.
   **What has changed:** whatever this pilot concludes, `heart-anatomy` — a
   scene of its own, not a re-labelled disease scene — is what the beta needs,
   and it may be built on a procedural heart if the asset route does not clear
   the gates. The pilot decides the geometry, not whether the scene happens.
2. **Lung — the first production-facing anatomy upgrade.** The organ whose
   disease scenes are waiting on named structures (`anatomy-specs.md` §1:
   A2 plus the pulled A3), taken through the same stages with the pipeline
   the heart pilot has proved. This is the first asset that may reach a
   public scene, and it goes through every gate above, reviews included.


---

## 派生 asset の工程（derived asset pipeline）

第三者の GLB が validator を通らないとき、**source を書き換えずに**通る版を作る工程です。
心臓の候補 2 本で実際に使いました。`npm run assets:repair`。

```
source GLB（read-only）
  → scripts/repair-candidate-gltf.mjs    決定的な修復のみ
  → dev-assets/derived/… の GLB          source とは別ディレクトリ・別 hash
  → npm run assets:validate              0 errors / 0 warnings を要求
  → 前後比較（座標・数・ノード・階層・ontology・マテリアル）
  → 実レンダリング比較                     docs/screenshots/b15-repair/
  → docs/asset-qa/measurements/normal-repair.json に記録
```

### 守る条件

- **source binary は読むだけ**です。`dev-assets/` 配下の元ファイルは開いて閉じるだけで、
  書き込み先は必ず `dev-assets/derived/` です
- **source と derived を取り違えない。** 別ディレクトリ・別 hash で、manifest が pin するのは
  **derived の hash** です。混同は「どのバイト列を審査したのか」が分からなくなることを意味します
- **修復スクリプトは version 管理下**に置きます。同じ入力から同じ出力が出ることが、
  記録した hash の意味です
- **削除した面積ゼロ三角形の数を記録**します（心臓 820・大血管 26）。
  面積ゼロの三角形は何も描かないので、削除しても見た目は変わりません——
  **これが「形を作り直していない」と言える唯一の根拠**なので、数を残します
- **fallback の法線処理を記録**します。面が打ち消し合う頂点（折り返し）では最大面の法線を採り、
  どの三角形にも使われなくなった頂点には単位法線を入れます。**どちらも選択であって復元ではない**ので、
  別々に数えます
- **ノード名・階層・ontology id・マテリアルの保持を検証**します。スクリプトが前後で測り、
  一致しなければ報告に出ます
- **validator 0/0 を満たすまで `passed` にしません。** QA gate は errors も warnings も
  0 のときだけ通ります（`assetReleaseProblems`）

### binary を repo に入れるか

**入れません。** `dev-assets/` は `.gitignore` にあり、derived も同じ扱いです。
repo が持つのは**作り方と、測った結果**です——スクリプト・測定 JSON・比較画像・hash。
`npm run assets:dev` が source を取得し、`npm run assets:repair` が derived を作ります。

理由が無い限り大きな binary を Git に入れない、という既存方針のままです。
adopt が決まった段階で、配信用にどこへ置くかは別の判断になります。
