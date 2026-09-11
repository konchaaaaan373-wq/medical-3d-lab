# The anatomy screen on a phone held sideways

844×390 is a phone in landscape, and it is the frame the anatomy screen was
worst in: the header, the title card, the console and the consent card are each
a sensible height on their own, and together they left the model a strip.

The fix is a smaller **control area**, never a smaller model. The title card's
heading repeats the one already in the header above it and goes; the console's
stage heading repeats the one in the panel and goes; the long description moves
to the Detail tab, which is a tap away. Everything that does something stays, at
full size, with its own name on it.

| | |
| --- | --- |
| Browser | Chromium 141 (Playwright chromium-1194, headless, SwiftShader WebGL2) |
| Rendered at | deviceScaleFactor 2, touch, mobile |
| Consent card | dismissed before the shot, so the measurement is of the scene |

| Shot | Frame | `data-anatomy-compact` | Title card | Console |
| --- | --- | --- | --- | --- |
| `heart-844x390` | 844×390 | `landscape` | 36 px (was 95) | 72 px (was 114) |
| `brain-844x390` | 844×390 | `landscape` | 36 px | 125 px — **its progression slider, dots, play and reset are all still there** |
| `heart-375x667` | 375×667 | not set | 148 px | 87 px — a portrait phone is a different problem and is left alone |
| `heart-failure-844x390` | 844×390 | not set | 95 px | 144 px — **a disease scene is untouched**; the rule cannot reach it |

The last two rows are the point of the table: the rule is keyed on the anatomy
capability and on the window's own height and aspect, so a portrait phone and a
disease scene both come out exactly as they did before.
