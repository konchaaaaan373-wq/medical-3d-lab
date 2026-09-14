# Beta publication decision — `liver-anatomy`

**This is an engineering acceptance, not a medical sign-off.** It records that
the structures this scene names were checked against what is actually being
served, by whom, on what date, and what was *not* checked. The clinical review
of this model is **pending** and every surface says so — see
[`../clinical-reviews/registry.json`](../clinical-reviews/registry.json).
**No anatomist has judged this geometry or these labels.**

| | |
| --- | --- |
| **Decided at** | 2026-09-14 (batch B1, with the lung and the kidney) |
| **Decided by** | Claude Opus 5, acting as B1 implementer |
| **Role** | `engineering` — software behaviour, not anatomical or clinical judgement |
| **Assets** | none. The liver is procedural: there is no file to hash, and `sceneRevision` is the whole pin |
| **Scene revision** | model card revision **8**, source digest `d5304fd53ba0d43f` |
| **Scene sources under that digest** | [`src/data/liverAnatomyScene.js`](../../src/data/liverAnatomyScene.js), [`src/scenes/hepatobiliary/scenes/liverAnatomy/LiverAnatomyScene.js`](../../src/scenes/hepatobiliary/scenes/liverAnatomy/LiverAnatomyScene.js), [`src/scenes/shared/anatomy/OrganAnatomyScene.js`](../../src/scenes/shared/anatomy/OrganAnatomyScene.js) |

## What was checked

**The interaction contract, in a browser** (`npm run verify:anatomy -- --scene
liver-anatomy`). The four recorded click points resolved to **segment VIII**,
**segment II**, **segment VII** and **segment V**, each named in the panel in
both languages. The part tree's **27 rows** and the model agree in both
directions; a drag is not a click; isolate hides and Show all restores;
changing colour mode or viewpoint does not move the selection.

**Every viewpoint, rendered and looked at.** Anterior, the visceral (inferior)
surface, the diaphragmatic (superior) surface, posterior and the transverse
section, in both colour modes (Couinaud segments, natural tissue) —
`docs/screenshots/pub-b1/`.

**The transverse section is the reason this batch took as long as it did.**
Before the work behind this decision it could not even be photographed: the
capture writes a frame only when two consecutive shots are identical and
painted, and the section frame was a small far-away model whose PNG fell under
the size the capture used as its "painted" floor. Framed properly, it turned
out to be eight open shells seen from the inside with the portal branches as
floating stubs. The cut now draws its face, in each segment's own colour, with
the vessels as cross-sections in it (F-101).

## What was not checked

- **No anatomist has looked at any of it.** The segment boundaries here are
  drawn from the portal and hepatic venous divisions the model itself defines,
  and nobody qualified has confirmed that what is drawn is Couinaud's division
  of a real liver.
- 23 of the 27 selectable structures were not individually opened.
- One browser engine, desktop, headless: no touch, no Safari, no Firefox, no
  screen reader, and the phone layout of this scene was not driven.
- The gallbladder sits on the visceral surface rather than in a fossa cut into
  it, and the surface landmarks a visceral view is usually read for — the porta
  hepatis, the ligamentum teres, the caval groove — are not modelled. The
  viewpoint is named for the surface it looks at, not for landmarks it shows.
- The cut face is where the plane falls through this geometry. It is not a CT
  slice and nothing here says it matches one.
