# Cardiac output — the introductory lesson

「血圧が上がった。心臓から出る量も増えた？」 — what `#/cardiac-output` opens on
(the full model is at `#/cardiac-output?view=detail`, unchanged).

Since the owner's review of 2026-10-02 the lesson's figure is **one circulation
as a 3D model, and the model carries the lesson**: the heart at the bottom,
pumping; red cells flowing out of it in a surge on each squeeze, up the artery,
through a bundle of small vessels standing for those of the whole body, and
back down the vein; a dial on the artery for the average pressure; a jug whose
level is what the heart sends out per minute. One orthographic camera that
never moves; the main circulation (A, then B) on the left, the compared one (C)
on the right, in places fixed from the first frame and drawn at one scale.
(Before it: a flat circuit diagram, 2026-10-01 — now the fallback where WebGL
is refused — and before that, a 3D heart whose meaning had to be read.)

Driven, not posed: every file here was written by
`npm run verify:disease -- <dir> cardiac-output --lesson-only --record-lesson`
(`scripts/lib/lesson-drive.mjs`) on 2026-10-02, in a run that also asserted, at
each of these moments, that the heart, the dial, the jug and the small vessels
are boxed on the page where and as large as they were on the first screen;
that B and C are drawn to one scale at one height; that the level and the
needle **read back off the screen** are the solver's (run in Node), and so are
the vessels' width, the cream marks for A and the two numbers on each
circulation; that the level never left the range between B's and A's while the
vessels widened back, and C arrived at its own level rather than filling from
empty; that the heart pumps and the cells flow (and, with reduced motion asked
for, neither moves); that C is never beside anything but B and says it is not
after a drug; that the note on what the experiment is stands on screen; that no
word on the figure overlaps another, leaves it, or is drawn under 12 px; that
on a phone the heart is at least 72 px tall; and that 「このモデルについて」 opens
on screen, holds the lesson's scope, and closes. Production build served
locally, headless Chromium (software GL). **Not a real device** (F-238),
**not a first-time reader** (F-239), **not medically reviewed** (F-240).

Every value on screen is the circulation model's own result for that
condition; nothing here is drawn from a figure written by hand. The heart is
caught at whatever moment of the beat the shutter fell on.

| File | Window | Moment |
| --- | --- | --- |
| `1440-0-first.png` | 1440×900 | First screen: the question, A pumping, the place kept for a second circulation, what the needle and the jug are, the note on what the experiment is, 「血管を縮める作用を加える」 and 「▶ 説明を再生」. No modal, no scroll; "compare" is not offered yet |
| `1440-1-start.png` | 1440×900 | Scene 1 of 5: the heart sends blood out — the heart lit |
| `1440-2-constrict.png` | 1440×900 | Scene 2: the action added — all twelve small vessels narrow together, lit, a cream sleeve at their old width; 「心臓には何もしていません」 |
| `1440-3-result.png` | 1440×900 | Scene 3: B. The needle past the cream needle of the start (71 → 88 mmHg); the level under the cream ring (3.7 → 3.1 L, "in this model"); 「実際の昇圧薬で必ずこうなるとは限りません。」 |
| `1440-4-other.png` | 1440×900 | Scene 4: C beside B — 「C 別の循環／薬を加えた後ではありません」, already flowing, same scale and height; its vessels and its heart lit |
| `1440-5-conclusion.png` | 1440×900 | Scene 5: about the same needle, clearly different levels — the pressure alone cannot tell |
| `1440-BC-no-words.png` | 1440×900 | B and C with **every word and number hidden**: the needles alike, the jugs not, B's vessels narrower |
| `1440-about.png` | 1440×900 | 「このモデルについて」 on a wide window, hanging from its line |
| `390-0-first.png` | 390×844 | First screen on a phone |
| `390-BC.png` | 390×844 | B and C, reached with the buttons |
| `375-0-first.png` | 375×667 | First screen on the smallest window the owner named: the heart about 76 px tall |
| `375-B.png` | 375×667 | B with the buttons; 「別の循環と比べる」 now offered |
| `375-BC.png` | 375×667 | B and C with the buttons; C's level about 13 px above B's (F-267) |
| `375-BC-no-words.png` | 375×667 | The same with every word and number hidden |
| `375-3-result-no-words.png` | 375×667 | Scene 3 with every word and number hidden: the narrowed vessels in their sleeves, the needle past its cream twin, the level under its ring |
| `375-handover.png` | 375×667 | The explanation left for the buttons half way through scene 2: the line under the figure says what is on screen now |
| `375-about.png` | 375×667 | 「このモデルについて」 opened from the foot of the screen, over the buttons (L-166) |

The two recordings per window (the explanation played through; the buttons —
A, the action, C beside B, the action taken away so that C closes, and B again)
are not committed. Regenerate them with the command above: frames are stepped
at 1/30 s of the lesson's own clock, so they play at the speed a reader sees
(L-172).
