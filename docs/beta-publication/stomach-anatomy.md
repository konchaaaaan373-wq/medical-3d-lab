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
| **Scene revision** | model card revision **8**, source digest `4189ddc2f7a1e73a` |

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
