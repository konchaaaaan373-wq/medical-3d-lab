# Beta publication decision — `stomach-anatomy`

**This is an engineering acceptance, not a medical sign-off.** The clinical
review of this model is **pending** and every surface says so — see
[`../clinical-reviews/registry.json`](../clinical-reviews/registry.json).
**No anatomist has judged this geometry or these labels.**

| | |
| --- | --- |
| **Decided at** | 2026-09-14 (batch B2) |
| **Decided by** | Claude Opus 5, acting as B2 implementer |
| **Role** | `engineering` — software behaviour, not anatomical or clinical judgement |
| **Assets** | none. Procedural: there is no file to hash, and `sceneRevision` is the whole pin |
| **Scene revision** | model card revision **9**, source digest `f89954f144bef0a5` |

## Re-taken on 2026-09-15

**The model changed, so the decision was taken again.** Two shared changes,
neither of them to this organ's geometry:

- **The scene now opens at the framing it was going to settle on** (F-110).
  The camera used to rest where a band the shell had not finished laying out
  put it, and the re-framing that should have corrected that was being
  discarded by a guard that could not tell a reader apart from a thousandth of
  a world unit of damping. The model is larger on the opening frame and clears
  the console. Every viewpoint of this scene was rendered again and looked at.
- **Isolating a structure now shows it solid.** It used to be shown at the
  opacity it has in place, which is an empty frame for a see-through part —
  and a part you cannot see in place is the one a reader isolates.

`npm run verify:anatomy` passes on this scene, and on all thirty-eight, with
step 0 added: the framing a scene opens at is now measured against the framing
it resets to, so F-110 cannot come back quietly. **No anatomist has looked at
this model, and nothing below has changed about that.**

## What was checked

**The interaction contract, in a browser** (`npm run verify:anatomy -- --scene
stomach-anatomy`). The four measured click points resolved to the **abdominal
oesophagus**, the **cardia**, the **pyloric antrum** and the **body**, each
named in both languages. The part tree's **8 rows** and the model agree in
both directions; a drag is not a click; isolate hides and Show all restores;
colour mode and viewpoint do not move the selection.

**Every viewpoint, rendered and looked at**: anterior, posterior, from the
patient's left, pylorus and duodenum, and the coronal section, in both colour
modes.

**The cut is what this batch changed.** Faced, the coronal section drew the
whole outline of the stomach in gastric pink — a bag rendered as a lump of
tissue. The wall here is a surface with no thickness, so the honest cut opens
it: the section now looks into the stomach, past the cardia, to the sphincter
ring at the pylorus. The rule is declared per structure, and the sphincter —
which is a ring of muscle, not a wall — keeps its face.

## What was not checked

- **No anatomist has looked at any of it.** Not the proportions, not the
  region boundaries, not one label.
- 4 of the 8 selectable structures were not individually opened.
- **The five named regions are hard to tell apart in the opening view.** The
  "named regions" palette separates them by a few percent of lightness, and at
  the default camera the boundaries between fundus, body and antrum read as
  faint lines. They are selectable and correctly named; they are not *visibly*
  distinct, and this record does not claim they are.
- One browser engine, desktop, headless: no touch, Safari, Firefox, screen
  reader or phone layout.
- No dimension is claimed. The model card says the proportions are drawn to
  read clearly and support no measurement.
