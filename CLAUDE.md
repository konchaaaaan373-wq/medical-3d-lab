# CLAUDE.md

Use [`AGENTS.md`](AGENTS.md) as the repository-level operating instructions.

Do not preload the documentation tree. `AGENTS.md` is the router: read only the source-of-truth documents relevant to the current task, then work autonomously through implementation and verification.

Project-specific facts that must remain explicit:

- Three.js + Vite, plain JavaScript + JSDoc; runtime dependency is `three`.
- Product goal: **Make invisible physiology visible, interactive, and understandable.**
- Anatomy and pathology/physiology are separate product layers with separate quality bars.
- Current beta publication is anatomy-only and must pass the catalog/release gates.
- For visual 3D/UI changes, automated tests alone are insufficient; inspect real rendering.
- Do not ask the user to perform checks or repository work that the agent can perform itself.

For architecture, medical claims, asset provenance, release policy, scene creation, visual QA, and deferred checks, follow the task-specific references listed in `AGENTS.md` rather than duplicating those rules here.
