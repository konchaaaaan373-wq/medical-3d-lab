# AR3-03 — the three line types, at the sizes they are actually looked at

What `docs/follow-ups.md` F-204 was closed on. Every image here was written by a
command in this repository, not cropped by hand except where the name says
`-crop`, which is a 400×180 region of the same frame at 1:1 so the line can be
judged rather than squinted at.

| Image | Condition | Command |
| --- | --- | --- |
| `desktop-1440x900-dpr2.png` | 1440×900, device pixel ratio 2, the scene's own opening framing | `npm run shots:phone -- --scene higher-brain-function --preview --width 1440 --height 900` |
| `phone-390x844-dpr2.png` | 390×844, DPR 2 | the same, `--width 390 --height 844` |
| `phone-375x667-dpr2.png` | 375×667, DPR 2 | the same, `--width 375 --height 667` |
| `reel-675x1200-dpr1-10.2s.png` | The sequence's own final frame size and framing, at 10.2 s — the moment F-204 was measured on | `npm run shots:reel -- --preview --at 10.2` |
| `reel-675x1200-dpr1-10.2s-crop.png` | The same frame, 400×180 of it at 1:1 | — |
| `scene-675x1200-dpr1-crop.png` | The interactive scene at the same viewport and crop, for the comparison F-204 rested on | — |

## What the numbers are

Widths and dash periods are held as a fraction of the **presented frame
height**, so they are the same apparent size wherever the frame ends up. In the
reel frame above, measured off the live page:

```
frame height 1200 CSS px, frame span 8.15 world units at the route
tract      radius 0.0109 → 3.2 px wide, solid
coarse     radius 0.0081 → 2.4 px wide, 12 px on / 8 px off
conceptual                → 1.7 px wide, 2 px on / 8 px off
```

Those are the figures `docs/model-cards/higher-brain-function.md` §9 quotes, and
`tests/higher-brain-function-ar3.test.js` (AR3-T12 … T14b) is what holds them:
pulling the camera back grows the world radius and leaves the apparent width
alone, a frame twice as tall halves the world radius and leaves the apparent
width alone, and a dash never rounds away into a solid line at any distance.

## What these images do not show

- **Greyscale and colour vision.** The three types differ in line *and* in
  width, so neither depends on colour — but that is an argument, not a
  measurement, and nothing here measures it (`docs/follow-ups.md` F-198).
- **Motion.** These are still frames. Whether the dashes shimmer while the
  camera moves is not answered by a still.
- **A real phone.** Chromium at a phone's dimensions is not a phone.
