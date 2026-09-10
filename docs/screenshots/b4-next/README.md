# B4-N2 — which camera paths retire the fixed-view report

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

## Not established here

- Timing. The headless renderer in this environment paints at roughly one frame
  a second, so "the report is gone" is observable and "how quickly" is not.
  That is a property of this environment, not a measurement of any device.
- Real hardware. Nothing here was run on a physical device.
- 844×390 and 375×667 for this particular behaviour — the earlier B4-R pass
  covered those viewports for the name-unverified marking and the compact
  layout, not for this.
