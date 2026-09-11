# Model evidence — Interactive lymph node anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard anatomy and histology of a lymph node: a fibrous **capsule**, an
  outer **cortex** containing lymphoid follicles, an inner **medulla**, and a
  **hilum** on the concave surface.
- That **several afferent lymphatic vessels** enter the convex surface and a
  **single efferent vessel** leaves at the hilum, together with the artery and
  vein — so that lymph must traverse the node.
- That the follicles of the cortex are the site of the response to antigen and
  are what enlarges when a node reacts.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. Many in, one out

| | |
| --- | --- |
| **Claim** | Several vessels arrive on the convex side; one leaves at the hilum. |
| **Source** | Standard anatomy. It is why lymph passes through a node rather than round it, and why the node downstream of a tumour is the one that is sampled. |
| **Implementation** | Five afferent tubes are drawn as one structure ending just inside the convex surface; a single efferent leaves from `SITES.hilum`. |
| **Assumption** | Five is a number chosen so that "several" can be drawn; it is not a count. The valves and the subcapsular sinus are not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — at least three afferents, exactly one efferent, at opposite ends, the efferent within a small distance of the hilum and no afferent near it. |

### 2. Three depths of one outline

| | |
| --- | --- |
| **Claim** | Capsule, cortex and medulla are regions of one organ at three depths. |
| **Source** | Standard histology. |
| **Implementation** | One `bean(fraction)` function draws all three, so they are the same shape at three depths rather than three shapes that happen to nest (`docs/architecture-rules.md` rule 1). |
| **Assumption** | **A schematic node and not a magnified one** — a real cortex, paracortex and medulla are not even shells — stated on every region, in the card and in the disclaimer. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the capsule contains the cortex contains the medulla. |

### 3. The follicles are in the cortex

| | |
| --- | --- |
| **Claim** | The nests that enlarge when a node reacts are in the outer region, not the inner. |
| **Source** | Standard histology; it is why "the cortex enlarges first" is a statement about a place. |
| **Implementation** | Nine follicle spheres are placed inside the cortex's bounds as one structure with many meshes. |
| **Assumption** | Germinal centres inside the follicles and the paracortex between them are not drawn, and nothing swells. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the follicles' combined bounds are inside the cortex, and there is more than one of them. |

### 4. Scale is honest by being split

| | |
| --- | --- |
| **Claim** | *Not* made: this scene says nothing about where nodes are in a body. |
| **Source** | A node is millimetres; the thoracic duct is most of a person. |
| **Implementation** | Two scenes. This one is the node at node scale; `lymphatic-drainage` is the routes at body scale, and each says so in its copy, its card and its disclaimer. |
| **Assumption** | A reader moving between the two has to be told they are different scales, which is done in words rather than by a transition. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — each scene answers the anatomy contract on its own. |
