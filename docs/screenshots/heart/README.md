# Heart anatomy — what these are

Rendered from the two **candidate** files, neither of which is committed or
shipped — HuBMAP CCF v1.2 at commit `b036a91a…`:

* `VH_M_Heart.glb`, sha256 `b1237e7e765178e9357fd2ea7ccf19d55d0bf9ca55e187886635febe28244c70`
* `VH_M_Blood_Vasculature.glb`, sha256 `a31ebed6d527b1cff31942e3e50d7c074c30b574337f68c4b89e9c88e4309d0d`

Reproduce them with:

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
was. `10-*` are the six named viewpoints in both colour modes. `11`–`14` are the
vessels: searching 「大動脈」 (9 hits across the valve, the great vessels and the
arch branches), a vessel selected, the same frame in natural colour — where red
and blue are the **source's own artery/vein materials, not an oxygenation
map** — and the far-reaching arch branches after "Unhide all", running out of
frame as they do in a body.

The console card visible at the bottom of several frames is the site's telemetry
consent prompt, not part of the scene.

**These are not a review.** No anatomist and no clinician has looked at this
geometry. The scene cannot be published: it rests on candidate assets that have
been through no asset pipeline and no publication decision exists — see
`docs/model-cards/heart-anatomy.md`.
