# AGENTS.md

Medical 3D Lab is a Three.js + Vite application written in plain JavaScript + JSDoc. Runtime dependency: `three`.

## Goal

Make invisible physiology visible, interactive, and understandable. 3D is a means, not the goal.

The product has two independent quality layers:
- **Anatomy:** structures users can identify by name, with visually distinguishable boundaries.
- **Pathology/physiology:** time change, causality, and linked variables built on the anatomy layer.

Do not create breadth without substance: a rotatable organ without provenance, named structures, and recorded maturity is not a completed anatomy model.

## Work autonomously to completion

For the requested scope, inspect the current code and relevant source-of-truth documents, implement the change, run the relevant existing checks, inspect real rendering when visual behavior changes, fix regressions you find, and report the verified result.

Do not ask the user to run checks that you can run. Ask only when an external decision, credential, or console-only action is genuinely required.

Before optimizing or cleaning up, identify the user-visible or reliability outcome. Prefer work that moves the public product forward. Fix broken verification signals; defer non-blocking cleanup.

Keep changes focused. Do not bundle unrelated themes into one PR.

## Read only what the task needs

Do **not** preload every document. Use this as a router:

- Product direction, priorities, document ownership → `docs/grand-design.md`, `docs/product-principles.md`
- Anatomy maturity / organ requirements → `src/catalog/anatomy.js`, `docs/anatomy-specs.md`
- Adding or promoting a scene → `docs/adding-a-scene.md`
- Beta publication / release gates → `src/catalog/release.js`, `docs/beta-release.md`
- Intended use, medical claims, provenance → `docs/architecture/intended-use-and-model-provenance.md`
- External 3D assets → `docs/asset-pipeline.md`, `src/catalog/assetManifest.js`
- 3D architecture invariants → `docs/architecture-rules.md`
- Organ rendering failure modes / visual QA → `docs/organ-3d-playbook.md`
- Pathology explanation contract → `docs/pathology-explanation-handoff.md`
- Medical model implementation → `src/models/README.md`
- Deferred or post-merge checks → `docs/follow-ups.md`

If ownership is unclear, use the document map in `docs/grand-design.md` rather than reading the whole docs tree.

## Repository invariants

- `src/catalog/` is the registry for systems, organs, scenes, model profiles, and asset provenance.
- `src/models/` is pure medical-model JavaScript: no Three.js or DOM imports.
- `src/app/` connects scenes and UI; `App.js` must not know scene internals.
- Reusable organ geometry lives under `src/scenes/<system>/organs/`; scene-specific behavior under `src/scenes/<system>/scenes/<scene>/`.
- Rendering copy belongs in `src/data/`, not embedded in drawing code.
- Organ geometry and disease scenes are separate concerns. Different builders are valid when scale or purpose differs; do not delete one merely because another exists.
- Routing is catalog-driven. Adding a scene must not require hand-editing routing.
- Publication state has one owner: `src/catalog/release.js`. Do not duplicate public-scene lists or invent parallel readiness flags.
- Never change physiology to improve visual impact; change presentation parameters instead.
- Clinical and visualization parameters must remain distinct.
- External assets require recorded source/license/hash/transform/semantic/QA provenance before release. Never commit PHI, raw DICOM, third-party binaries without permitted provenance, or secrets.
- A visual 3D change is not done after unit tests alone; inspect real rendering.

## Medical claims

Current scenes are educational conceptual models, not patient-specific simulators or clinical decision tools. Do not imply precision or validation beyond the model's evidence. Do not expose clinical-looking numeric claims from immature scenes. Changes to medical values require tests and the relevant evidence/provenance documentation.

The current beta publishes anatomy only. Do not substitute a pathology scene for a missing anatomy scene or bypass the release gate.

## Existing verification

Use existing tools before writing one-off equivalents:

```bash
npm test
npm run build
npm run verify:ui
npm run verify:anatomy
npm run verify:hero-input
npm run verify:auth
npm run shots:phone
npm run shots:anatomy
```

Choose checks according to the changed surface; do not run unrelated expensive checks mechanically. For asynchronous visual checks, wait for observable state, not arbitrary timeouts.

## Definition of done

A task is done when the requested behavior is implemented, relevant source-of-truth documents remain consistent, appropriate automated checks pass, and user-visible 3D/UI changes have been inspected in a real render. Any genuinely unavailable external or device-only verification should be recorded in `docs/follow-ups.md` rather than silently treated as passed.
