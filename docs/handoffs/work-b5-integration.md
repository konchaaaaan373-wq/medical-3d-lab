# Work B5 — app-completion integration handoff

Final integration note: PR #52 is intended to stack Work B1/B4/B5 onto the Claude anatomy/B0 branch after current-main preservation.

## Work-owned additions

- `src/app/publicDiagnostics.js`: strict allowlisted diagnostic text builder.
- `src/app/publicDiagnosticCopyControl.js`: explicit review-before-copy UI. No automatic transmission.
- `src/styles/public-diagnostics.css`: scoped styles only.
- matching unit tests.
- `scripts/b5-journey.mjs`: the historic Landing → scene → Back/Forward → model information/Trust → Back journey.
- `scripts/b5-contract-audit.mjs`: static guard checks for hero lifecycle, diagnostics privacy, Neco SSOT and release-gate review.

## Existing Work shell to preserve

PR #51 provides `src/app/anatomyShellPresentation.js` and scoped CSS. It is a presentation adapter only and intentionally does not own scene selection, camera, loader, routing or hidden-state stores.

Claude's anatomy work owns the actual AnatomyPanel, selection identity, inspection controls and their lifecycle. Final integration must reuse those contracts rather than mount a second panel.

## Shared integration fixes required before main

1. Derive `ui.dataset.anatomy = 'yes'` from Claude's existing `isAnatomyScene` result; remove the marker on teardown/non-anatomy mount. Do not add a second anatomy classifier.
2. Mount the existing Work anatomy presentation adapter only after the shared title/anatomy UI exists, and dispose it with scene/UI teardown.
3. Fix `App.bindKeyboard()` so global model shortcuts ignore interactive/editable targets (`button`, `a`, `textarea`, `select`, inputs, contenteditable, and elements inside an active dialog). Space on a focused button must activate that button, not toggle model playback.
4. Merge `tests/helpers/fake-dom.js` by union: keep Claude's parent/contains/closest/focus/dispatch behavior and Work's hidden/disabled attribute synchronization. Do not choose one side wholesale.
5. Mount `createPublicDiagnosticCopyControl()` inside the existing support/feedback or failure surface only if no equivalent helper exists. Manual Retry remains the primary failure action.
6. Supply `modelId`, available build/revision identifiers, UI language and the existing safe state code from current owners. Omit unavailable identifiers rather than inventing them.
7. Import `public-diagnostics.css` only when the control is connected.

## Privacy contract

Allowed automatic diagnostic fields only:
`modelId`, `build`, `revision`, `language`, coarse browser family+major, safe state code.

The user may optionally type reproduction steps. Never automatically add URL/query/hash, tokens, cookies, localStorage, user/account ID, navigation history, anatomy-selection history, request headers or raw stack traces.

## Release gate

Preserve the anatomy-only fail-closed publication rule. `heart-anatomy` may be a candidate but remains unpublished until the existing gate passes. Never substitute a heart disease/pathophysiology scene. Engineering/publication acceptance of `brain-anatomy` is not clinical sign-off; clinical review remains whatever the registry says.

## Neco

Use `src/data/necoLinks.js` as the single source of truth. Current physician CTA is a consultation CTA and may point to `https://necofindjob.com/`. Use `/jobs` only when copy explicitly promises a job list. Medical-institution and operator destinations remain the verified dedicated pages.

## Regression order

After the shared connection: targeted unit tests → normal test/build/public-boundary/budget checks → `scripts/b5-journey.mjs` against a production build. The historic return issue is closed only when the final Back checkpoint returns to a genuinely ready hero/model; DOM labels or HTTP 200 alone are insufficient.

Also verify: first consent choice → brain ready; loading-route leave/re-entry; retry double-click; help/model-information focus return; keyboard Space/Enter behavior on controls; 200% text resize/reflow; 320×568 and 844×390; Neco destination intent. WebKit/Safari remains unconfirmed unless actually run.
