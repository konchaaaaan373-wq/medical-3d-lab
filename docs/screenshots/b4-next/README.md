# B4-N2 — which camera paths retire the fixed-view report

**The driver is now tracked**: [`scripts/check-heart-recipe-report.mjs`](../../../scripts/check-heart-recipe-report.mjs),
run with `npm run verify:recipe-report`. It asserts on the DOM and on camera
state rather than taking pictures, exits 1 when a step misbehaves and 2 when it
cannot run at all, and writes [`recipe-report-run.json`](recipe-report-run.json).
Screenshots are opt-in (`--shots <dir>`) because an image records what a run
looked like; it does not establish that the report was hidden.

The version that produced the two images below was a scratch file named
`.n2-verify.mjs`, which `.gitignore`'s `.*.mjs` rule kept out of the repository —
so the run was recorded and the code that produced it was not. The tracked
version supersedes it. It is not a copy: it gained assertions, exit codes, a
machine-readable log, and strict selectors.

## The latest run

| | |
| --- | --- |
| Command | `VITE_ALLOW_PREVIEW=1 npm run build && npm run verify:recipe-report` |
| Result | **17 assertions, 0 failures, exit 0** |
| Route | `/?preview=1#/heart-anatomy` at 1280×800 |
| Served by | an ephemeral local static server over the local build. No production, no deploy preview, no `verify:live` |
| Console | 3 errors, all from `/.netlify/functions/billing-status` and `/.netlify/functions/plan-catalog`, which a static server has no functions for. Counted and named in the log rather than filtered out |

**The check was confirmed to be a check.** Removing the single
`noteDisplayChanged()` call at the end of `zoomBy()` and rebuilding made exactly
two assertions fail — the zoom button and the `+` key, which share that function —
with exit 1, and every other step still passed. The call was restored and the
run repeated at 17/17.

Two selectors were wrong when this was first run against the real markup:
`[title="Zoom in"]` (the scene retitles it "Zoom in — fill the frame with the
chamber (+)") and, in the scratch version, a fall-back to the third button in
the camera row. Both are why the tracked version treats a selector that matches
nothing as a failure. The controls now carry `data-control`, so the check
addresses the control rather than its prose or its position.

## The earlier run, and its images

Driven in the real app, with the real candidate GLBs, on the Vite dev server.

| | |
| --- | --- |
| Browser | Chromium 141 (Playwright chromium-1194, headless, SwiftShader WebGL2) |
| Viewport | 1280×800 |
| Route | `#/heart-anatomy` |
| Console errors | 0 (the three entries in the log are the offline Google Fonts request and two 404s the shell makes on every scene) |

**This is the implementer's own verification, not a third party's.**

## What was driven, and what happened

The report under the fixed views describes one moment: this recipe, from that
viewpoint, with that display. It has to survive the recipe's own camera move and
retire the moment the reader changes the view.

| Step | Report | Camera |
| --- | --- | --- |
| Run "Inside the chambers" | **shown** — "4 hidden. From the anterior viewpoint, 8 of 10 named structures have an unobstructed anchor." | moves to the anterior pose |
| Zoom-in **button** | cleared | — |
| Re-run, then the **`+` key** | shown → cleared | — |
| Select a part, re-run, then **"Go to it"** | shown → cleared | z 5.047 → 3.425 |
| Re-run, then a **viewpoint button** | shown → cleared | — |
| Re-run, then a **drag on the canvas** | shown → cleared | — |
| Re-run | shown again, same measurement | — |

The "Go to it" row is ordered deliberately: the structure is selected **before**
the recipe runs, so that the selection's own repaint is not what clears the
report and the focus path is the thing being measured. An earlier run had them
the other way round and proved nothing about focus.

## Images

| File | |
| --- | --- |
| `01-report-after-recipe-1280.png` | the report present after the recipe, including after its own camera move |
| `02-report-cleared-by-zoom-1280.png` | the same screen after the zoom-in button |

Both were taken in commit `17002047e102ef06ff705ce02193f8dbcf06be14` and are
kept as they are. `git log 1700204..HEAD -- src/app/App.js
src/components/AnatomyPanel.js` is empty, so there is nothing in these two
images that a fresh capture would show differently, and re-taking every image at
every viewport to make the SHAs match would be work that establishes nothing.
The behaviour itself is re-checked by the tracked driver, which is the part that
can actually fail.

The one change since, in `src/components/ControlPanel.js`, adds a `data-control`
attribute to the console buttons. It is an attribute, not a pixel: nothing in
these images depends on it.

## Not established here

- Timing. The headless renderer in this environment paints at roughly one frame
  a second, so "the report is gone" is observable and "how quickly" is not.
  That is a property of this environment, not a measurement of any device.
- Real hardware. Nothing here was run on a physical device.
- 844×390 and 375×667 for this particular behaviour — the earlier B4-R pass
  covered those viewports for the name-unverified marking and the compact
  layout, not for this.
