# Cardiac output — the introductory lesson

「血圧が上がった。心臓から出る量も増えた？」 — what `#/cardiac-output` opens on
(the full model is at `#/cardiac-output?view=detail`; its only change is a
fourth intervention in its menu, the same vasoconstrictor action).

Driven, not posed: every file here was written by
`npm run verify:disease -- <dir> cardiac-output --lesson-only`
(`scripts/lib/lesson-drive.mjs`) on 2026-09-30, after the owner's review (the
caveat under the results while the vasoconstrictor action is on, and the change
said as "in this model" rather than as a size), in a run that also asserted, at
each of these moments and with the camera at rest, that the model keeps its
band, that every word on it is inside that band, clear of the others, not over
the point it names and not standing over the model itself (L-145, L-146), and
that the state reached is the one the button or the scene says. Production
build served locally, headless Chromium, software GL.
**Not a real device** (F-238), **not a first-time reader** (F-239), **not
medically reviewed** (F-240).

Every figure on screen is the circulation model's own result for that
condition; nothing here is drawn from a figure written by hand.

| File | Window | Moment |
| --- | --- | --- |
| `1440-0-first.png` | 1440×900 | First screen: the question, the model with its four parts named, A's mean pressure and output, 「▶ 説明を再生」「自分で試す」, the way to the full model. No modal, no scroll |
| `1440-2-constrict.png` | 1440×900 | Scene 2 of 5: the vasoconstrictor action added — all the small vessels of the body narrow together (not one narrowing). The needle and A's needle (cream) on the dial |
| `1440-3-result.png` | 1440×900 | Scene 3: B. Pressure 71 → 88 mmHg; in this model the output went down, 3.7 → 3.1 L/min; the bright length (blood sent out this beat) inside A's cream sleeve, held at the same moment of the beat. Under the results: 「血管抵抗だけを 1.5 倍にした模式実験。実際の昇圧薬の全作用は再現しません。」 |
| `1440-4-other.png` | 1440×900 | Scene 4: C beside B — a separate circulation, not B after treatment. Same moment of the beat, same view of both; about the same needle, clearly different bright length |
| `1440-5-conclusion.png` | 1440×900 | Scene 5: the conclusion, and its limits in one line |
| `1440-handover.png` | 1440×900 | The explanation left for the buttons half way through scene 2: the line under the question says what is on screen now and what it is compared with |
| `390-0-first.png` | 390×844 | First screen on a phone. The vessels' name stands below them: the screen ends at their right |
| `390-4-other.png` | 390×844 | Scene 4 on a phone: B and C side by side, which draws them larger than one above the other in this band |
| `375-4-other.png` | 375×667 | The tightest window the owner named, scene 4 (F-241: the model's band is 151 px here, against a floor of 150) |
| `375-BC.png` | 375×667 | The same pair reached with the buttons |

The two recordings per window (the explanation played through; the buttons)
are not committed — they are 5–12 MB each. Regenerate them with
`npm run verify:disease -- <dir> cardiac-output --record-lesson`: frames are
stepped at 1/30 s of the lesson's own clock, so they play at the speed a reader
sees rather than at software GL's 3–5 frames a second (L-140).
