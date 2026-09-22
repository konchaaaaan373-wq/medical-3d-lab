# AR2-08 — the same checker, two builds

What `docs/follow-ups.md` F-201 rests on. Nothing here is written by hand: the
JSON is what `scripts/check-viewports.mjs` wrote, and the `.txt` files are the
console output of `scripts/check-anatomy-interaction.mjs`.

| File | What it is |
| --- | --- |
| `base-bc88fca.json` | `verify:ui --scene higher-brain-function --preview` against a build of `bc88fca`, the audited head before AR2 |
| `head-838ef44.json` | The same command against a build of `838ef44`, after AR2-01…09 |
| `classification.json` | The two, normalised and counted: what is identical, what differs |
| `anatomy-base-bc88fca.txt` | `verify:anatomy` against the same base build, production (no preview) |
| `anatomy-head-c19f585.txt` | The same, against the head build, after the shared-component changes |

**What was held fixed**: one checker — the one at the later head, in both runs —
one Chromium, software GL, the same viewports, the same preview flag, the same
scene, and **one run at a time**. Running two of these at once starves both and
produces failures that look deterministic (`docs/verification-lessons.md` L-13).

**Results.**

- `verify:ui`: 53 findings on each side. 52 of 54 normalised finding classes
  are identical. One class differs at phone-430 and the totals do not: a
  `button.related-toggle` leaves the under-44px list and a `button.btn` joins
  it. Cause not established at element level — recorded as undetermined rather
  than claimed either way.
- `verify:anatomy`: **three problems on each side, identical down to the
  numbers in them** — the opening-versus-reset framing, one tour point's
  expected structure, and a label that survives turning the head. All three
  are present before this work.

Nothing here is a claim that the product is in good shape. It is a claim about
**attribution**: the findings that are there were there before.
