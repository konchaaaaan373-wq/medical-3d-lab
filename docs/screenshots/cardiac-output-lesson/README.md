# Cardiac output — the introductory lesson

「血圧が上がった。心臓から出る量も増えた？」 — what `#/cardiac-output` opens on
(the full model is at `#/cardiac-output?view=detail`; its only change is a
fourth intervention in its menu, the same vessel-narrowing action).

Since the owner's review of 2026-10-01 the lesson draws **a circuit diagram,
not a 3D heart**: the heart on the left, the artery along the top with a dial
on it (the average pressure), six small vessels on the right whose width shows
how easily blood gets through them, the vein back along the bottom, and under
it a tube that fills with what the heart sends out per minute. A legend under
the strip says what each part means until C takes its place.

Driven, not posed: every file here was written by
`npm run verify:disease -- <dir> cardiac-output --lesson-only`
(`scripts/lib/lesson-drive.mjs`; add `--record-lesson` for the recordings) on
2026-10-01, after main's rebrand (#168) was merged in, in a run that also
asserted, at each of these moments, that the figure and its parts are the size they were on
the first screen, that each strip's numbers, arrows and on-screen tube length
are the solver's, that C is never beside anything but B, that the note on what
the experiment is stands on screen, and that no word in the figure overlaps
another or is drawn under 12 px on a phone; that on a phone the figure is drawn
across at least 92% of the window (347×253 at 375×667, 362×264 at 390×844); and
that 「このモデルについて」 opens on screen, holds the lesson's scope, and closes.
Since the code review of 2026-10-01 the lesson makes no renderer: the ground
behind the figure is the page's own colour, not a canvas. Production build served locally,
headless Chromium. **Not a real device** (F-238), **not a first-time reader**
(F-239), **not medically reviewed** (F-240).

Every figure on screen is the circulation model's own result for that
condition; nothing here is drawn from a figure written by hand.

| File | Window | Moment |
| --- | --- | --- |
| `1440-0-first.png` | 1440×900 | First screen: the question, A as a circuit with its parts named, the legend, the note on what the experiment is, 「血管を縮める作用を加える」 and 「▶ 説明を再生」. No modal, no scroll; "compare" is not offered yet |
| `1440-2-constrict.png` | 1440×900 | Scene 2 of 5: the action added — all six small vessels narrow together, lit (not one narrowing, not fewer vessels) |
| `1440-3-result.png` | 1440×900 | Scene 3: B. The needle up from the cream needle of the start (71 → 88 mmHg ↑); the tube shorter than the cream 「開始時」 mark (3.7 → 3.1 L ↓, "in this model"); 「実際の昇圧薬で必ずこうなるとは限りません。」 |
| `1440-4-other.png` | 1440×900 | Scene 4: C under B — 「別の循環（B の治療後ではない）」, same scale, every part in the same column; about the same needle, a clearly longer tube |
| `1440-5-conclusion.png` | 1440×900 | Scene 5: the conclusion — same minute, same heart rate, different output; the pressure alone cannot tell |
| `1440-BC-no-words.png` | 1440×900 | B and C with **every word and number hidden**: the needles alike, the tubes not, B's vessels narrower |
| `390-0-first.png` | 390×844 | First screen on a phone |
| `390-BC.png` | 390×844 | B and C, reached with the buttons |
| `375-0-first.png` | 375×667 | First screen on the smallest window the owner named: the figure at about one unit to one pixel, its smallest word 12 px |
| `375-B.png` | 375×667 | B with the buttons; 「別の循環と比べる」 now offered |
| `375-BC.png` | 375×667 | B and C with the buttons |
| `375-BC-no-words.png` | 375×667 | The same with every word and number hidden |
| `375-3-result-no-words.png` | 375×667 | Scene 3 with every word and number hidden: the vessels lit, the tube short of its cream start mark |
| `375-handover.png` | 375×667 | The explanation left for the buttons half way through scene 2: the line under the figure says what is on screen now and what the cream marks are |
| `375-about.png` | 375×667 | 「このモデルについて」 opened: the shared sheet from the foot of the screen, with the lesson's scope in it (and, on a phone, the way to the heart's anatomy further down). Over the buttons, not under them (L-166) |
| `1440-about.png` | 1440×900 | The same sheet on a wide window, hanging from its line |

The two recordings per window (the explanation played through; the buttons —
A, the action, C beside B, the action taken away so that C closes, and B again)
are not committed. Regenerate them with the command above: frames are stepped
at 1/30 s of the lesson's own clock, so they play at the speed a reader sees
(L-140).
