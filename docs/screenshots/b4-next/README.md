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
| Command | `VITE_ALLOW_PREVIEW=1 npm run build && npm run verify:recipe-report -- --viewport 1280x800 --viewport 844x390 --viewport 375x667` |
| Result | **81 assertions across three viewports, 0 failures, exit 0** |
| Route | `/?preview=1#/heart-anatomy` |
| Served by | an ephemeral local static server over the local build. No production, no deploy preview, no `verify:live` |
| Console | 16 errors, all `/.netlify/functions/billing-status` and `/.netlify/functions/plan-catalog`, which a static file server has no functions for. Counted and named in the log rather than filtered out. **Uncaught page errors: 0**, which is the number that matters and is counted separately |

The exact HEAD and whether the working tree was dirty are recorded in
[`recipe-report-run.json`](recipe-report-run.json) by the run itself, along with
the pinned identity of both candidate GLBs. A log never has a SHA added to it
afterwards.

**Three viewports, because the reader's path is a different sequence of clicks
at each.** Below `max-width: 820px` or `max-height: 560px` the panel body stops
being docked and becomes a modal sheet behind a Parts button, so the check opens
and closes that sheet rather than reaching past it — and the canvas drag asks
the page which element is topmost before it drags, so it can never land on a
panel and be counted.

## What driving the small viewports found

Three defects, all fixed in the same diff and all re-verified by the same run.
Each was invisible to `node --test` and to a run at 1280×800.

| Where | What | Fix |
| --- | --- | --- |
| Every anatomy scene, any size | **A failed load said nothing on screen.** The words existed in the Detail tab's footer, and the tab body holds only the open tab's content, so with Parts open — the default — they were not in the document at all. The reader got the ordinary chrome around an empty canvas | The load state moved to the panel summary, which is always mounted. Shown **only** when the state is not `ready`, so a healthy scene is unchanged |
| 375×667 | **The fixed-view button could not be pressed.** `.inspection-panel` becomes a fixed bottom sheet at ≤560px — right for the panel that sits in the rail on its own, wrong for the same element embedded in the anatomy panel's Display tab, where it floated out of flow and its footer covered "Inside the chambers" | The rule is scoped to `.rail > .inspection-panel`, the case its own comment describes |
| 375×667 | **"Model scope & sources" was clipped.** `.model-scope` had a fixed `width: 236px` inside a 146px column that hides its overflow-x | `width: min(236px, 100%)` — unchanged where there is room |

The heart scene also had no scope panel at all, which an `alpha` scene owes
alongside its model layer, dossier and card. It has one now, written from the
model card and the dossier as they stand and asserting nothing they do not.

## Failure and manual retry

Driven by aborting the heart GLB, so the scene takes its own missing-candidate
branch rather than the WebGL fallback:

- the status reports `error` with the hint that names the fix;
- **the screen now says so** (it did not before — see above);
- **there is no in-product retry control for this state today.** The "Retry 3D"
  button belongs to `SceneFailureFallback`, which this path does not take. The
  run records that rather than asserting it either way: how a failed load offers
  a retry is Work's failure/retry design, and this is what the product does now;
- a manual retry — the condition fixed, the page loaded again — recovers to 46
  selectable structures.

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

Only what a change actually altered is photographed. An image records what a run
looked like; it is the assertions that establish behaviour.

| File | |
| --- | --- |
| `report-after-recipe-375x667.png` | **the two layout fixes, in one frame.** The Display tab open in the sheet, with "決まった見せ方 / 心腔の中を見る" clear of the inspection panel's footer, and "モデルの範囲と出典" fitting its column above |
| `01-report-after-recipe-1280.png` | the report present after the recipe, including after its own camera move |
| `02-report-cleared-by-zoom-1280.png` | the same screen after the zoom-in button |

The two 1280 images were taken in commit
`17002047e102ef06ff705ce02193f8dbcf06be14` and are kept as they are.
`src/components/AnatomyPanel.js` **has** changed since — this round added the
load-status line to the summary — but that line is `hidden` while the model is
ready, which is the state in both images, so neither shows anything a fresh
capture would show differently. `src/components/ControlPanel.js` gained a
`data-control` attribute, which is an attribute and not a pixel. Re-taking every
image at every viewport to move a SHA would establish nothing.

## Not established here

- Timing. The headless renderer in this environment paints at roughly one frame
  a second, so "the report is gone" is observable and "how quickly" is not.
  That is a property of this environment, not a measurement of any device.
- Real hardware. Nothing here was run on a physical device, and nothing here is
  a measurement of a real GPU.
- **Anything medical.** Every assertion in this file is about software
  behaviour. The source's anatomy, the labels, the licences and the publication
  gate are unaffected by any of it, and a passing run is not a review.
