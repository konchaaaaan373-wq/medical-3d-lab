# Work B5 — app-completion integration handoff

Base for this stacked change: PR #51 head `19a0436502d3765827168b500ea3879a89077c2a`.
The earlier Work local report referred to `e98c6c7b42aa97e83fe6343acb8c7aa995dabe85`; PR #51 is the GitHub-preserved continuation of that work on top of PR #49.

## What this change adds

- `src/app/publicDiagnostics.js`: strict allowlisted diagnostic text builder.
- `src/app/publicDiagnosticCopyControl.js`: explicit, review-before-copy UI. No transmission.
- `src/styles/public-diagnostics.css`: scoped styles only.
- matching unit tests.
- `scripts/b5-journey.mjs`: the exact historic Landing → scene → Back/Forward → model information/Trust → Back journey.
- `scripts/b5-contract-audit.mjs`: static guard checks for hero lifecycle, diagnostics privacy, Neco SSOT and release-gate review.

## Do not duplicate the existing B4/B5 shell

PR #51 already contains `src/app/anatomyShellPresentation.js` and scoped CSS. It is a presentation adapter only and intentionally does not own scene selection, camera, loader, routing or hidden-state stores.

Claude's current anatomy work already owns the actual anatomy panel, selection identity, inspection controls and their lifecycle. The final connection must reuse those contracts rather than mount a second panel.

## Minimum shared connection still required

1. Mount the existing Work anatomy presentation adapter only when the shared anatomy contract marks the scene as anatomy (`data-anatomy="yes"`).
2. Dispose it with the scene/UI teardown. Do not create a second router/history store.
3. Mount `createPublicDiagnosticCopyControl()` inside the existing support/feedback or failure surface only if no equivalent helper is already present.
4. Supply `modelId`, available build/revision identifiers, UI language and the existing safe state code from their current owners. Omit unavailable build/revision fields rather than inventing them.
5. Keep manual Retry before diagnostics. Diagnostics must not turn WebGL-unavailable into an endlessly retryable state.
6. Import the scoped diagnostic CSS from the owning surface/style entry when the control is actually connected.

## Privacy contract

Allowed automatic fields are only:

`modelId`, `build`, `revision`, `language`, coarse browser family+major, safe state code.

The user may optionally type reproduction steps. Do not automatically add URL/query/hash, tokens, cookies, localStorage, user/account ID, navigation history, anatomy-selection history, request headers or raw stack traces.

## Release gate

Preserve the PR #49/B0 fail-closed anatomy-only publication rule. `heart-anatomy` may be a candidate but must remain unpublished until the existing gate passes. Do not replace that rule with the older broad brain/heart non-prototype release rule from remote main.

## Neco

PR #51 has the single source of truth in `src/data/necoLinks.js`. Current destinations independently checked during B5 review:

- physician career-consultation top: `https://necofindjob.com/`
- physician job list: `https://necofindjob.com/jobs`
- medical institutions: `https://necofindjob.com/for-medical`
- operator/about: `https://necofindjob.com/about`

The current PR #51 doctor CTA says “働き方・求人について相談する”, so the consultation top is semantically valid. Use `/jobs` only for copy that specifically promises a job list. Do not duplicate URL literals across surfaces.

## Regression order after shared connection

Run the existing targeted tests first, then `scripts/b5-journey.mjs` against a local production build. The historic return issue is closed only when the final Back checkpoint returns to a genuinely ready hero/model; a DOM label or HTTP 200 alone is not sufficient.

Also verify: first consent choice → brain ready; loading-route leave/re-entry; retry double-click; help/model-information focus return; keyboard access; 200% text resize/reflow; 320×568 and 844×390; Neco destination intent. WebKit/Safari remains unconfirmed unless actually run.
