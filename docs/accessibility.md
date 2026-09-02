# Accessibility

Owner document for keyboard, focus, contrast, zoom and assistive-technology
support. Gate 1 in [`public-release-roadmap.md`](public-release-roadmap.md)
owns the release decision.

The product has two kinds of surface and they have different obligations:

- **Reading surfaces** — Landing, Explorer, Lab, Trust, the legal documents,
  the scene-failure fallback and the generated scene pages. These are documents.
  Everything below applies to them in full, and it is checked in CI.
- **The scene view** — a WebGL canvas with overlay chrome. The chrome is held to
  the same standards; the 3D content itself is a visual medium and its
  equivalent is the scope panel, the metrics read-out and the model card, which
  say in text what the picture shows.

---

## 1. What is enforced in CI

`tests/accessibility.test.js` fails the build on each of these.

### Colour

`src/styles/palette.js` declares the tokens, the *composited* colour of each
translucent panel, and every foreground/background pairing the product relies
on. Contrast is computed from those, so a colour change that drops below WCAG
AA fails a test rather than waiting for somebody to notice.

Measuring the declared panel colour would be measuring a surface nobody sees:
`--panel` is 62 % opaque, so what is checked is the composite over the page.

Current measurements, all AA or better:

| Pairing | Ratio | Needs |
| --- | --- | --- |
| body text on the page | 17.99 : 1 | 4.5 |
| secondary text on a panel | 9.52 : 1 | 4.5 |
| faint text on a panel | 4.60 : 1 | 4.5 |
| accent link on a panel | 12.27 : 1 | 4.5 |

Faint ink is the one close to the line. A test asserts it stays above 4.5 *and*
below 6, so that a palette change in either direction is noticed.

### Zoom and reflow

The 3D view pins `html`, `body` and `#ui` to the viewport and turns scrolling
off, because a canvas that scrolls fights the orbit controls. Every document
route has to undo that, and doing it per route is how one gets forgotten — the
Trust page shipped without it, so most of its review records were unreachable.
The release now lives once, in `src/styles/reading-surface.css`, for every
reading route, and a test fails if a route is missing from that selector.

Pinch zoom is available. `user-scalable=no` used to be in the viewport tag to
stop the browser zooming during an orbit gesture; it took the ability away from
every reading surface as well, which is a WCAG 1.4.4 failure for the sake of one
canvas. The canvas declares `touch-action: none`, which suppresses browser
gestures exactly where they conflict and nowhere else.

### Keyboard and focus

- One focus style for the whole product, defined once. A ring that appears on
  some controls and not others is worse than none: it teaches a keyboard user to
  distrust what they see.
- The Trust page is a light surface and gets its own ring colour, because the
  luminous accent vanishes on near-white.
- Every reading surface carries a skip link. Its target is the **first content
  element**, never the landmark that still contains the header, and it has
  `tabindex="-1"` so following it moves focus and not only the scroll position.
  It draws no ring of its own — the person who landed there did not focus a
  control.

### Structure and language

Every reading surface is a `main` landmark rather than a `div`.

Both languages are rendered and one is hidden with CSS, which is what makes
switching free. A screen reader reads the DOM, though: an unmarked Japanese
string in an English document is announced with English phonemes, and is
unintelligible. `el()` therefore derives `lang="ja"` / `lang="en"` from the
`lang-ja` / `lang-en` class — once, in the DOM helper, rather than at several
hundred call sites where it would be forgotten on the next one.

### Motion

Chrome on a reading surface stops under `prefers-reduced-motion`. Scene
animation is handled by `utils/motion.js` instead, because a physiological
animation is *content* — whether it may stop is a decision the scene has to
make, not one a global rule can take.

### Targets

44 px minimum on the reading surfaces (`TOUCH_TARGET.primary`). In-scene chrome
is dense by necessity and is held to 32 px with spacing, which is the
compromise the layout can actually keep; the absolute floor is the WCAG 2.5.8
figure of 24 px.

---

## 2. What CI cannot check

These need a browser and a person, and Gate 1 keeps them open until they are
done on real devices:

- Screen-reader passes with VoiceOver, NVDA and TalkBack — particularly the
  bilingual announcements, the scene switcher and the account modal.
- Keyboard traversal of the scene view's overlay chrome, where the tab order is
  produced by several independent panels.
- 400 % zoom reflow on a 320 px viewport for every surface.
- Colour perception: the scenes use hue to distinguish oxygenated from
  deoxygenated blood and healthy from remodelled tissue. Contrast maths says
  nothing about that, and the answer is not a palette change but making sure
  every colour-carried distinction is also carried by a label or a shape.

The last one is a **medical** accessibility question rather than a general one,
and it belongs with the anatomy/art review in the same gate.
