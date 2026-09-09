# Heart anatomy — what these are

Rendered from the **candidate** heart model (`dev-assets/heart/VH_M_Heart.glb`,
HuBMAP CCF v1.2 `VH_M_Heart.glb` at commit `b036a91a…`, sha256
`b1237e7e765178e9357fd2ea7ccf19d55d0bf9ca55e187886635febe28244c70`), which is
**not committed and not shipped**. Reproduce them with:

```
npm run assets:dev     # fetch and hash-verify the candidate
npm run dev            # the candidate is served in dev only
```

| | |
| --- | --- |
| Commit | `HEAD` of the B4 heart work (see the commit that added this directory) |
| Browser | Chromium 141 (Playwright chromium-1194, headless, SwiftShader WebGL2) |
| Viewport | 1280×800, deviceScaleFactor 1 |
| Route | `#/heart-anatomy` on the Vite dev server |

`01`–`09` are one continuous pass: search in Japanese, search in English, select
a result, **go to it**, **show it**, isolate, hide, unhide, and back to how it
was. `10-*` are the six named viewpoints in both colour modes.

The console card visible at the bottom of several frames is the site's telemetry
consent prompt, not part of the scene.

**These are not a review.** No anatomist and no clinician has looked at this
geometry. The great vessels are absent from the source file, which is why the
scene cannot be published — see `docs/model-cards/heart-anatomy.md`.
