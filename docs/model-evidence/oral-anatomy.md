# Model evidence — Interactive mouth and tongue anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the oral cavity: a hard palate in front and a soft
  palate behind, the **palatoglossal arch** running from the soft palate onto
  the side of the tongue and framing the fauces, and the **palatine tonsil** in
  the bed behind it.
- That the tongue is developmentally **two parts**: an anterior two-thirds from
  the first pharyngeal arch and a posterior third from the third arch, meeting
  at the **sulcus terminalis**, and that the two differ in nerve supply for both
  general sensation and taste.
- That the **vallate papillae** — eight to twelve of them — lie in a V
  immediately in front of that sulcus, and that the sulcus itself is not
  otherwise visible on the surface.
- That the **lingual tonsil** covers the posterior third, and that with the
  palatine tonsils and the adenoid it forms a ring around the entrance to the
  pharynx.
- That the **parotid gland** lies on the lateral surface of the mandibular ramus
  and its duct crosses the cheek to open **opposite an upper molar**; that the
  **submandibular gland** lies below the mandible and its duct runs **forward
  under the tongue** to open at the caruncle beside the frenulum; and that the
  **sublingual gland** lies in the floor of the mouth and opens more or less
  where it sits.
- That the mandible is the only mobile bone of the skull, with a body carrying
  the lower teeth and a ramus at each end.
- That the lower dental arch is slightly smaller than the upper.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. The tongue is two parts, and one row of papillae marks the line

| | |
| --- | --- |
| **Claim** | An oral part and a root meet at the sulcus terminalis; the vallate papillae lie along that line; nothing else on the surface marks it. |
| **Source** | Standard gross anatomy and development. It is why numbing the front of a tongue leaves the back of it feeling, and why taste and touch are tested separately front and back. |
| **Implementation** | `SULCUS_Z` is one number; the two parts are built from the same surface function and each takes one side of it, and nine papillae are placed in a V on that line. |
| **Assumption** | The two parts are drawn as the same tissue: what differs between them is origin and nerve supply, not what is drawn. Nine stand for eight to twelve, and the foramen cecum is not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the two parts meet at `SULCUS_Z` and do not overlap, every papilla lies within a small distance of that line, and the lingual tonsil is entirely behind it. |

### 2. Where a duct opens is not where its gland is

| | |
| --- | --- |
| **Claim** | The parotid lies behind the jaw and opens level with the upper teeth; the submandibular hangs under the jaw and opens beside the frenulum. |
| **Source** | Standard gross anatomy. It is the reason a swollen parotid is a lump on the face rather than in the mouth, and the reason the long uphill submandibular duct is the one that forms stones. |
| **Implementation** | Each duct is a curve from a point inside its own gland to `SITES.parotidOpening` or `SITES.caruncle`. |
| **Assumption** | Plain tubes. The openings themselves are not drawn, the facial nerve through the parotid and the lingual nerve under the submandibular duct are not drawn, and no gland volume is a measurement. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — each duct starts inside its own gland and ends at its own named opening; the parotid duct's far end is level with the upper teeth and far in front of its gland, and the submandibular duct's far end is beside the frenulum and far in front of its gland. |

### 3. The arch everything follows

| | |
| --- | --- |
| **Claim** | The two rows of teeth, the jaw under them and the floor slung between them all follow one dental arch. |
| **Source** | Standard gross anatomy; a dental arch is a single curve and everything built on it is built on that curve. |
| **Implementation** | `archHalfWidth(z)` is that curve, and it is the only place it is written (`docs/architecture-rules.md` rule 1). |
| **Assumption** | **Teeth are drawn as continuous bands.** No individual tooth, root, crown shape, number or eruption stage is represented, which the model card and the disclaimer both say. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the lower arch is inside the upper one, the mandible is below the lower teeth and not through them, and the floor of the mouth is inside the arch. |

### 4. A doorway, with the tonsil behind the frame

| | |
| --- | --- |
| **Claim** | The palatoglossal arch runs from the soft palate onto the side of the tongue, and the palatine tonsil lies in the bed behind it. |
| **Source** | Standard gross anatomy; it is why the palatine tonsil is the one part of the lymphoid ring that can be seen by asking someone to open their mouth. |
| **Implementation** | Each arch is a curve starting under the soft palate and ending on the side of the tongue; the tonsil is placed behind and lateral to it. |
| **Assumption** | Plain cords; the muscle in each fold and the palatopharyngeal arch behind it are described and not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — each arch starts under the soft palate and ends beside the tongue, and each tonsil is behind its own arch. |

### 5. The mouth is drawn open, and that is a position

| | |
| --- | --- |
| **Claim** | *Not* a claim about anatomy. `JAW_DISPLAY_OPENING` lowers everything carried on the mandible by a fixed amount from occlusion. |
| **Source** | This project's rule: change the display, not the anatomy. A jaw opening is a movement a jaw makes; a closed mouth shows nothing at all. |
| **Implementation** | One constant, used to derive `LEVELS.lowerTeeth`, and everything on the mandible placed against that. **Nothing is stretched or resized.** |
| **Assumption** | Stated on the lower teeth, in the model card and in the disclaimer: **no opening and no occlusal relationship may be read off the model.** |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the gap between the two rows of teeth is exactly the declared display opening, so the constant cannot drift away from what is drawn. |

### 6. Nothing is moved to be seen

| | |
| --- | --- |
| **Claim** | *Not* made in geometry — made in presentation. |
| **Source** | This project's rule for every organ. |
| **Implementation** | The scene opens on the view a mouth is looked at from; the slider fades the jaw and the tongue, which are what the floor and the glands are behind; and the viewpoints that show the glands hide the roof and the tongue by tag rather than moving a gland into the mouth. |
| **Assumption** | A reader who touches nothing sees into an open mouth, which is correct and is where half the scene is. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the scene answers the anatomy contract, every structure is selectable by name, every viewpoint restores what it changed, and the width the scene reserves is the width its subject needs. `scripts/check-anatomy-interaction.mjs` drives it in a browser. |
