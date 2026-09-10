# B2-1 — the anatomy panel, driven

Captured by [`scripts/check-anatomy-interaction.mjs`](../../../scripts/check-anatomy-interaction.mjs)
and the same driver used for its screenshots, against a **production build** of
`brain-anatomy`. They are committed rather than attached to a conversation so
that anyone with the branch can fetch them.

| | |
| --- | --- |
| **Code** | `ebd65c0` (the commit these were taken from) |
| **Browser** | Chromium 141.0.7390.37, headless, deviceScaleFactor 1 |
| **Build** | `npm run build` — production, not preview |
| **Scene** | `#/brain-anatomy`, 271 selectable structures |
| **Consent** | dismissed before capture, so the banner is not in frame |

Nothing here is a render, a mock-up or a stand-in model: each is the product
under the conditions named below.

| File | Viewport | State |
| --- | --- | --- |
| `f34-1280x720-first-open.png` | 1280×720 | First open, nothing touched. One structure (脈絡叢) is visible in the list — F-34. Nothing is selected. |
| `f34-375x667-first-open.png` | 375×667 | First open of the parts sheet on a phone. Same: a structure is visible without expanding anything. |
| `f31-1280x720-deep-selection.png` | 1280×720 | List scrolled 988 px, a structure well down it selected. The summary naming it is still at the top — F-31. |
| `f31-375x667-sheet-open.png` | 375×667 | Parts sheet open with a structure selected in it. The summary is **inside** the dialog, above the tabs; only the list scrolls. |
| `f31-844x390-back-to-model.png` | 844×390 | Selected in the sheet, then Escape. Sheet closed, model back, focus returned to the Parts button (its ring is visible). |
| `f31-320x568-controls.png` | 320×568 | At rest. The summary and the Parts button fit and the Parts button is reachable. |

**What these do not show.** One engine on a desktop machine at synthetic
viewport sizes: no touch, no rotation, no software keyboard, and no screen
reader. Firefox and WebKit are covered by CI, not by this run.
