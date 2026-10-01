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

## `17-*` — the aorta and its branches, and the heart on its own (re-taken 2026-09-30)

Taken from a preview build of branch `claude/dreamy-fermi-2ddpth` (`npm run
build:preview`, `?preview=1`), headless Chromium 141 with SwiftShader, served
files `VH_M_Heart.glb` sha256 `994a8638…` and `VH_M_Blood_Vasculature.glb`
sha256 `f03a5062…` — the **adopted derivatives**, not the candidates above.
Close-ups have the UI hidden and the camera placed on the source's own
coordinates.

| File | What it shows |
| --- | --- |
| `17-aorta-desktop.png` | 1280×800, as the scene opens: the heart and its aorta, switch on |
| `17-heart-only-desktop.png` | after one press of 大動脈・主要分枝を表示: the heart on its own, from the front |
| `17-heart-only-back-desktop.png` | the same from behind (後面): pulmonary roots drawn whole, venae cavae as short roots |
| `17-great-vessels.png` | 「大血管を見る」, framed on the heart and the arch |
| `17-arch-branches.png` | close-up: brachiocephalic trunk dividing into the schematic right common carotid and right subclavian, left common carotid, left subclavian |
| `17-abdominal-branches.png` | close-up from front-left: coeliac trunk, superior mesenteric, right renal (behind the IVC) and left renal arteries |
| `17-bifurcation.png` | close-up: inferior mesenteric and the schematic start of both common iliac arteries |
| `17-focus-celiac.png` | 「寄る」 on the coeliac trunk: the branch with the stretch of aorta it leaves |
| `17-detail-desktop.png` | the coeliac trunk's Detail tab: checked general anatomy first, then what the model does with it |
| `17-aorta-phone.png`, `17-heart-only-phone.png` | 390×844, the two ways of looking |
| `17-detail-phone.png` | 390×844, the right renal artery's Detail tab in the sheet: the source file's own name for it is in the note, not beside the name |

## `18-*` — two phone problems that are on `main` too (2026-09-30)

| File | What it shows |
| --- | --- |
| `18-landscape-selected-main.png`, `18-landscape-selected-branch.png` | 844×390 after rotating and selecting the arch: the model slides under the title card on `main` and on the branch alike (`docs/follow-ups.md` F-237 item 6) |
| `18-phone-sheet-list-main.png`, `18-phone-sheet-list-branch.png` | 375×667 with a structure selected: about two rows of the parts list under the search box, the same on both (item 12) |

## `19-*` — descriptions after the second collation (2026-10-01)

| File | What it shows |
| --- | --- |
| `19-detail-ima-phone.png` | 390×844, the inferior mesenteric artery's Detail tab: it leaves the front of the aorta a little to the left (from OpenStax's figure of the abdominal arteries), and the model's lower origin is still said to differ from the textbook's |
| `19-detail-descending-aorta-phone.png` | 390×844, the descending aorta's Detail tab: the T12 level of the aortic hiatus put back, with 「典型的には」 |

**These are not a review either.** No anatomist has looked at the branches, the
schematic segments or the descriptions.
