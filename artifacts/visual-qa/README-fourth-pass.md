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
