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

Claude's PR #50 owns the actual anatomy panel, selection identity, tree, inspection controls and their lifecycle. The final connection must reuse those contracts rather than mount a second panel.

## Review findings against PR #50 / #51

### 1. The Work anatomy presentation is intentionally still a no-op on PR #50

`anatomyShellPresentation.js` requires `ui.dataset.anatomy === 'yes'`. PR #50 computes `isAnatomyScene = Boolean(scene.getAnatomyTree && scene.getAnatomySelection)` but does not currently set that dataset value. This is not evidence of a broken adapter; it confirms that the shared connection has not happened yet.

Minimal connection after the shared anatomy identity is known:

```js
ui.dataset.anatomy = isAnatomyScene ? 'yes' : 'no';
```

Mount `mountAnatomyShellPresentation({ ui })` only after the existing title card is in the DOM, because the adapter intentionally reformats that existing card instead of creating another one.

### 2. Global scene keyboard shortcuts must not consume keys owned by controls

PR #50 `bindKeyboard()` currently returns early only for `HTMLInputElement`. Space is also the scene play/pause shortcut and calls `preventDefault()`. Therefore Space on a focused button can suppress its native activation and operate playback instead; Space/arrows typed in a textarea can also leak to the model. This affects the existing feedback textarea as well as any future diagnostic UI mounted inside a scene.

Do not patch individual controls one by one. The minimal shared fix is to make the global shortcut handler return when the focused event target is an interactive/editable element, including at least `input`, `textarea`, `select`, `button`, `a`, and `contenteditable`. Keep Escape handling deliberately separate where a modal/sequence owns it.

Regression requirement: with keyboard only, Space must activate a focused UI button without toggling playback; typing Space/arrows in feedback/diagnostic text must not seek/zoom/play the 3D scene.

### 3. The only direct #50 ↔ #51 changed-file collision is the fake DOM helper

Both branches change `tests/helpers/fake-dom.js`. The changes are compatible but neither side should overwrite the other:

- PR #50 adds parent relationships, DOM reparent/remove/closest/contains, focus tracking and dispatch support.
- PR #51 synchronises `hidden` / `disabled` properties when attributes are set or removed.

The integrated helper needs the union. This is a test-infrastructure merge, not a reason to redesign either product implementation.

## Minimum shared connection still required

1. Set the existing anatomy marker from PR #50's existing anatomy identity, then mount the Work presentation adapter after the existing title card is present.
2. Do not create a second anatomy panel, router, history store, camera state or loader.
3. Mount `createPublicDiagnosticCopyControl()` inside the existing support/feedback or failure surface only if no equivalent helper is already present.
4. Supply `modelId`, available build/revision identifiers, UI language and the existing safe state code from their current owners. Omit unavailable build/revision fields rather than inventing them.
5. Keep manual Retry before diagnostics. Diagnostics must not turn WebGL-unavailable into an endlessly retryable state.
6. Import the scoped diagnostic CSS from the owning surface/style entry when the control is actually connected.
7. Fix the shared keyboard shortcut guard above and add a regression that uses native keyboard activation, not only synthetic click callbacks.
8. Merge the two `tests/helpers/fake-dom.js` extensions instead of choosing one side.

## Privacy contract

Allowed automatic fields are only:

`modelId`, `build`, `revision`, `language`, coarse browser family+major, safe state code.

The user may optionally type reproduction steps. Do not automatically add URL/query/hash, tokens, cookies, localStorage, user/account ID, navigation history, anatomy-selection history, request headers or raw stack traces.

## Release gate

Preserve the PR #48/#49 B0 fail-closed anatomy-only publication rule. `heart-anatomy` may be a candidate but must remain unpublished until the existing gate passes. Do not replace that rule with the older broad brain/heart non-prototype release rule from remote main. PR #50's brain revision/publication-decision updates must be merged into that same rule rather than replacing it.

`brain-anatomy` clinical review remains a separate status. Engineering/publication decision updates do not silently promote it to a clinical sign-off.

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

## Recommended stack integration order

Current branches are intentionally stacked/siblinged rather than all targeting `main`:

1. B0 policy/gate: PR #48.
2. Public shell: PR #49 → Work continuation PR #51 → B5 PR #52.
3. Anatomy functional UI: sibling PR #50 from B0.
4. Final integration: combine the latest #50 anatomy owner with the latest #52 Work owner on top of the latest B0 branch; resolve the fake-DOM helper by union, make only the minimum shared connections above, then run the integrated candidate once through the full local/build/browser acceptance set before moving the stack toward `main`.

Do not judge integration green from the separate historical test counts on #50 and #51. The integrated tree needs its own result.
