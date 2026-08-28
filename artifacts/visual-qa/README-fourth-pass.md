# Fourth pass — semantic geometry / state ownership

`after-fourth-pass/` is the same 16-shot matrix at the same cameras as
`after-third-pass/`, taken after the architectural refactor. It exists to
answer one question: did moving to semantic landmarks and a single state
resolver change what renders?

Static anatomy frames differ by 0.14–0.23%, all of it the aortic root, which
is the one thing that was meant to change: the sinuses of Valsalva are now
placed in root-local coordinates and sit just above the valve instead of in
the mid-ascending aorta. Story frames differ by up to 8% because the beat
phase and the camera tween land at slightly different points between runs.

`uicheck.mjs` is the DOM-level regression harness — chapter label overlap,
track and viewport containment, low-viewport visibility, Japanese-first
typography and a JA -> EN -> JA round trip on the completion screen, over
1440x900, 1024x768, 390x844 and 1440x560. It needs Playwright, which is
deliberately not a dependency of this repo (`three` is the only one), so it
runs from a scratch directory against `vite preview`:

    npm run build
    npx vite preview --port 4173 --strictPort &
    node uicheck.mjs        # with playwright available

Last run: 35/35 checks passed.

One note worth keeping. The screenshot harness used to take the completion
shot by clicking the track at 99.5%. Once the completion row has rendered,
the primary CTA sits almost exactly there, so the click landed on "back to
exploring" and the shot captured the free-exploration view instead. It now
waits for `.story-bar.is-complete`. A test that quietly measures the wrong
thing is the same failure this whole pass is about — it just happened to be
in the harness rather than in the scene.


## scenecheck.mjs — runtime assertions

`uicheck.mjs` covers the DOM. `scenecheck.mjs` covers the rendered scene, and
exists because unit tests kept passing while the picture was wrong. It drives
the built app — free exploration, a slider change, the story running to
congestion — and asserts what someone would otherwise have to check by eye:

- the aorta renders opaque, and stays opaque across a state change and through
  the story (the bug that shipped twice)
- the aorta does not out-brighten the myocardium, measured on the pixels
  actually drawn at points projected from the geometry, not on base colours
- the atrium distends with filling pressure, and the pressure sheath tracks it
  exactly rather than lagging inside an opaque chamber
- the right lung is the larger one and the lungs stay quiet
- every 3D label lands inside the canvas

Same requirements as uicheck: a preview build and Playwright.

    node scenecheck.mjs

Last run: 12/12.

Two of these were worth the trouble immediately. Comparing the aorta's and the
myocardium's *material colours* said the aorta was 2.6x too bright; sampling
the rendered pixels said it is very slightly darker. The texture and the
lighting close the gap, and the proxy would have sent someone off to fix a
problem that was not there.


### What measuring found that looking did not

The white blob on the basal shoulder had been in the close-up for several
passes, described in reports as "a blown-out specular point" and never
tracked down, because every plausible cause was wrong:

- raising the bloom threshold shrank it but did not remove it
- lowering the epicardium's clearcoat and environment intensity did nothing
- halving the rim light from 1.15 to 0.62 did nothing *visible*, which is
  what made it so hard to attribute — a saturated highlight looks identical
  at both, so the correct fix, applied once, looked like a failed one

Hiding one object at a time found the mesh; hiding one light at a time found
the light; sweeping that light's intensity and reading the frame back found
the answer. Across the whole sweep the mean brightness along the silhouette
moved from 47.1 to 47.9 while the spot moved from 243 to 212: the rim light
was contributing essentially nothing to the separation it exists for, and
almost all of a pure-white blowout on muscle. It now runs at 0.28.
