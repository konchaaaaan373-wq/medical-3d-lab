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

Two numbers, and the difference between them is the difference between an
obligation and a preference.

**24 × 24 CSS pixels is the obligation** — WCAG 2.5.8 at level AA. It is
enforced on every surface, including the in-scene chrome, and it is measured in
a real browser by `npm run verify:ui` rather than inferred from the stylesheet.
The standard offers a spacing exception, which this product deliberately does
not take: meeting the size unconditionally is stricter, and it is something a
reviewer can check by looking at one number. The one exception taken is the
standard's own, for a link inside a sentence, whose height the line box already
fixes.

**44 px on reading surfaces and 32 px in-scene is the preference**
(`TOUCH_TARGET.primary` / `.dense`). Buttons meet it. Links largely do not — a
header wordmark is a link that will never be 44 px tall — so the shortfall is
counted and published in the run's report instead of failing the build. A rule
that fails on a wordmark is a rule somebody switches off within a week.

The measurement found the product below the **obligation** in ten places when
it was first run: a 9 px-tall story-stage button, 22 px-wide filter and system
pills, and every footer, navigation and evidence-source link on the reading
surfaces, which were bare 14–19 px text. `min-height` alone would not have
fixed them, because `min-height` does nothing to an inline box; the fix is in
`src/styles/reading-surface.css` and it is one enumerated list of controls, not
a blanket rule on `a`.

---

## 2. The viewport matrix

`src/app/viewports.js` declares the sizes the product promises to work at and
the rules it must keep at each one; `npm run verify:ui` drives a headless
browser against them and `tests/viewports.test.js` keeps the declaration
honest. It runs Chromium by default and takes `--engine firefox` or
`--engine webkit`; CI runs all three. Six viewports — 320, 375 and 430 px portrait, a 932 × 430 landscape
phone, a tablet and a desktop — across nine routes, which is 54 combinations
and about a minute.

320 px is not optional. It is the narrowest viewport still in use, and it is
where WCAG 1.4.10 judges reflow: a 1280 px layout at 400 % zoom *is* a 320 px
viewport. Landscape is listed separately rather than derived, because a short
viewport fails differently from a narrow one — a fixed header and a fixed
console can leave no room for the content between them.

Each combination is checked for:

- **Horizontal overflow**, at the document level, with a one-pixel tolerance
  for sub-pixel rounding. At the 320 px viewport this is the reflow check.
- **Target sizes**, measured in the real layout rather than read from the CSS,
  because a flex container can still crush a button the stylesheet said was
  44 px tall.
- **The skip link**: that it is the first Tab stop, that activating it moves
  focus to the content, and that it does not navigate. That last one is not
  hypothetical — `#content` was once resolved as a scene route, so the skip
  link threw the reader into a 3D model.
- **The whole focus ring**, walked with the Tab key at the narrowest and widest
  viewports, checking that every visible control is reachable and that the ring
  closes rather than trapping.
- **Occlusion**: that nothing is painted over a control. This is a different
  failure from every other one here — a control can be the right size, in the
  right place, inside the viewport, and still have something sitting on it —
  and the one that found it was a person looking at a screenshot. The two
  elements allowed to cover the page are declared in `TRANSIENT_OVERLAYS`, each
  with the reason it may and the thing it still may not cover.
- **Console errors**, with the webfont excluded: the browser is denied the
  network, so the fallback stack is what gets measured, which is what a reader
  with a blocked font sees anyway.

The first run found two real defects: the Trust page scrolled 426 px sideways
at 320 px — one unbreakable evidence path widened a grid track and took the
page with it — and the ten target-size failures above. The occlusion check,
added after the anatomy review found the case by eye, caught a third: the
consent question was pinned to the bottom of the viewport, which is where every
scene pins its console, and on a phone it covered the console entirely. See
[`anatomy-review.md`](anatomy-review.md) §2.

**What it is not.** It drives browser engines, headless, on a desktop machine.
Three of them in CI, which is enough to catch a layout or CSS rule one engine
reads differently — but WebKit on Linux is the engine Safari is built on, not
Safari and not iOS. It still cannot see an Android font-inflation surprise, a
notch, or a software keyboard eating the viewport. It is the half of a device
pass that is found by looking rather than by feeling, automated so that the
person doing the other half spends their time on the part only a person can do.
The script prints that list at the end of every run, so the two cannot drift
apart quietly.

Playwright is deliberately not a dependency. `npm test` stays a plain
`node --test` run with no browser download; the UI check installs the browser
on demand in its own CI job, and says so plainly when it is missing rather than
passing because it did not run.

**What one engine cannot cover, it says rather than fails.** Two facts about an
engine are not facts about the product, and both would otherwise paint a job
permanently red:

- **Safari does not Tab to links** unless full keyboard access is on. Counted
  with the buttons, that convention reports every link on every surface as
  unreachable.
- **A runner with no GPU may have no WebGL2.** Firefox on a GitHub runner
  declines the context, and three.js has required WebGL2 since r163, so every
  3D surface drops to the renderer fallback and logs the refusal. Counted as
  page defects that is twelve failures a run: two surfaces on each of six
  viewports. The check asks Firefox for a software context first, and if the
  engine still declines, the refusal becomes one note per surface naming the
  engine.

  The note covers the product's *own* handling of that failure too, and it has
  to: `landingCirculationDemo`'s catch and the scene bootstrap's both log the
  error, Chromium renders those as the message three.js gave them while Firefox
  renders the same Error object as the bare word `Error`, and no pattern loose
  enough to catch `Error` is safe. So the question asked is which surface hit
  the refusal, not which words were logged. **The cost is stated rather than
  hidden:** an unrelated page error on one of those surfaces is noted instead
  of failing on that engine. It is still printed, and the other two engines
  still fail on it — which is a reason the matrix drives three.

Both distinctions are *earned*, not assumed: the Tab one needs Tab to have
reached other controls first, and the WebGL one needs the engine to have said,
on a blank page before any surface was measured, that it cannot make a context
at all. An engine that can still has its renderer errors counted as the page's.
Whatever a run could not cover is printed in the manual list at the end of it,
so the coverage this file promises and the coverage a run delivered cannot
drift apart quietly.

---

## 3. What CI cannot check

These need a person, and Gate 1 keeps them open until they are done on real
devices:

- Screen-reader passes with VoiceOver, NVDA and TalkBack — particularly the
  bilingual announcements, the scene switcher and the account modal.
- Safari on real iOS and macOS. CI measures WebKit, which covers the layout
  and CSS half — the `dvh`, `env(safe-area-inset-*)`, `mask-image` and `:has()`
  this product's chrome is built on. What it does not cover is the browser
  around that engine: its toolbars, its viewport units while they collapse, and
  how it behaves on a real handset.
- Touch: orbiting a scene with a finger, and whether that gesture fights the
  page scroll or the browser's own pinch zoom.
- A software keyboard covering the viewport, and a notch or rounded corner
  cutting into it.
- Colour perception: the scenes use hue to distinguish oxygenated from
  deoxygenated blood and healthy from remodelled tissue. Contrast maths says
  nothing about that, and the answer is not a palette change but making sure
  every colour-carried distinction is also carried by a label or a shape.

The last one is a **medical** accessibility question rather than a general one,
and it belongs with the anatomy/art review in the same gate.
