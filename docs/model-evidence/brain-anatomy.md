# Model evidence — Interactive brain anatomy

Implementation: [`src/data/brainAnatomy.js`](../../src/data/brainAnatomy.js),
[`BrainAnatomyScene.js`](../../src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js)

Boundary of the claim: [`docs/model-cards/brain-anatomy.md`](../model-cards/brain-anatomy.md)

Tests: [`tests/brain-anatomy.test.js`](../../tests/brain-anatomy.test.js),
[`tests/anatomy-colour-ui.test.js`](../../tests/anatomy-colour-ui.test.js)

## Sources consulted

- [Brain Project](https://github.com/itayinbarr/brainproject), the immediate
  upstream source of the unchanged GLB and its embedded Z-Anatomy / BodyParts3D
  metadata.
- [Destrieux et al., 2010](https://pubmed.ncbi.nlm.nih.gov/20547229/), for the
  distinction between standard named cortical parcels and for the limits of
  treating labels as a surface parcellation.
- [FreeSurfer Destrieux atlas terminology changes](https://surfer.nmr.mgh.harvard.edu/fswiki/DestrieuxAtlasChanges),
  for the explicit ACC, aMCC, pMCC, dPCC and vPCC terminology used to prevent a
  false anterior-cingulate label.
- [IFAA Terminologia Anatomica Humana — cingulate gyrus](https://ifaa.unifr.ch/Public/TNAEntryPage/auto/unit/LAEN/TAH6067%20Unit%20EN.htm),
  for the side → telencephalon → cerebral hemisphere → limbic lobe → cingulate
  gyrus hierarchy and the distinction between anterior, middle, posterior and
  retrosplenial parts.

The last two sources guide terminology only. The scene does not claim that its
geometry is Destrieux or that a name cross-check transfers Destrieux boundaries
to the source meshes.

## Claim → Source → Implementation → Assumption → Validation

### 1. A touch identifies one source mesh, including its side

| | |
| --- | --- |
| **Claim** | A hover preview or pinned selection names the exact selectable mesh hit by the raycaster, including left/right/midline metadata. |
| **Source** | `bx_id`, `bx_label`, `bx_side`, `bx_region`, `bx_cat` and `bx_source` embedded in the redistributed GLB. |
| **Implementation** | Only meshes in the seven declared anatomy categories enter `selectables`; `brainStructureInfo()` adapts their metadata without deriving identity from mesh names. |
| **Assumption** | The scene trusts the upstream identity assigned to a mesh. It does not independently validate the geometric boundary. |
| **Validation** | `brain anatomy adopts individually named atlas meshes instead of proxy lobes`; `selection publishes exact bilingual anatomy and highlights without resizing it`; `hover previews exact anatomy without replacing the pinned selection`. |

### 2. Japanese names and hierarchy cover the distributed label set

| | |
| --- | --- |
| **Claim** | Every unique label currently exposed by this asset has a deliberate Japanese display name and a side → region → anatomical-family hierarchy. |
| **Source** | The 147 unique source labels in the GLB; standard Japanese gross-anatomy terminology; the cingulate sources above for aMCC/pMCC distinctions. |
| **Implementation** | `STRUCTURE_JA`, `structureFamily()` and `sideHierarchy()` in `brainAnatomy.js`. The original English atlas label is retained separately as `atlasName`. |
| **Assumption** | Translation improves learning but does not prove the upstream mesh boundary. Independent review of the complete Japanese term set is still outstanding. |
| **Validation** | `every selectable atlas label has a deliberate Japanese name and hierarchy` parses the shipped GLB and tests all 147 unique selectable labels. |

### 3. Both colour modes are viewing aids, not anatomical evidence

| | |
| --- | --- |
| **Claim** | Colour-map mode makes named structures visually separable while preserving a recognisable lobe family. Natural-anatomy mode keeps conventional low-saturation tissue contrast and stronger directional shading for surface relief. |
| **Source** | Interface design requirement, not a biological source. |
| **Implementation** | A stable hash of category/region and exact atlas label varies colour inside either a vivid or constrained natural family. Side is excluded, so homologous left/right labels match. Natural mode lowers idle emission and uses matte materials so light and shadow describe folds. |
| **Assumption** | Colour-map colours encode identity for this interface only. Natural colours are illustrative conventions, not measured tissue colour. Neither mode encodes cytoarchitecture, function, vascular territory or quantitative data. |
| **Validation** | `colour map and natural anatomy are one-step choices with different visual readings` checks material behaviour; the all-label audit checks that all 147 unique names avoid exact colour collisions; `colour buttons switch the real scene, active state, and legend together` clicks the rendered control and verifies scene state, pressed state and legend synchronisation. |

### 4. Medial views reveal; they do not dissect

| | |
| --- | --- |
| **Claim** | Left/right medial buttons make the selected hemisphere's medial surface inspectable without moving any mesh. |
| **Source** | Gross-anatomy viewing convention. |
| **Implementation** | The camera moves to the opposite side of the midline and the contralateral paired meshes receive zero opacity. The near hemisphere's midline block — corpus callosum, fornix, thalamus, hypothalamus and the white matter behind them — is opaque for this view, because it is the surface the view is of; the ventricles are cavities and stay on the layer slider. Selecting a cingulate mesh requests the matching left/right medial view automatically. Geometry transforms are untouched. |
| **Assumption** | This is a visibility aid and cannot reproduce a physical section or dissection plane. What it shows at the midline is the outside of each structure's own mesh, not a cut face: the atlas contains no sectioned surfaces, and none is drawn. |
| **Validation** | `medial views expose the selected hemisphere without moving anatomy`; `a medial view closes the midline instead of showing through a hollow shell`, which also fixes that the enclosing white matter still ghosts out as depth is asked for. The rendered pair is [`docs/screenshots/b3-1/`](../screenshots/b3-1/). |

### 5. The current model cannot identify ACC as an independent mesh

| | |
| --- | --- |
| **Claim** | The source mesh called `Cingulate gyrus and sulcus (Middle anterior part)` must not be presented as anterior cingulate cortex (ACC). |
| **Source** | The shipped GLB has the middle-anterior label but no ACC-labelled mesh; Destrieux/FreeSurfer terminology distinguishes aMCC from ACC. |
| **Implementation** | The mesh is displayed as `帯状回・帯状溝（前中部／aMCC）` and the information card explicitly states that it is not ACC and that the source has no separate ACC mesh. |
| **Assumption** | The source name is close enough to use modern aMCC wording as a terminology cross-reference, but not to assert a Destrieux boundary. |
| **Validation** | `cingulate terminology distinguishes aMCC from an unavailable ACC mesh` checks both the display wording and the absence of an ACC label in the asset. |

### 6. The midline was empty at rest, and this is why it mattered

| | |
| --- | --- |
| **Claim** | A medial view at the default anatomy layer shows a readable medial surface rather than a hollow shell. |
| **Source** | Gross-anatomy viewing convention: a medial view of a hemisphere shows the medial cortical surface, the corpus callosum, the diencephalon, the brainstem and the cerebellar vermis. |
| **Implementation** | `targetOpacity()` treats the midline block as present when a medial side is set, instead of holding it behind the layer slider. |
| **Assumption** | Presence, not accuracy: this decides which of the atlas's meshes are drawn for a view, and makes no claim about their boundaries. The registration caveats for the deep nuclei (recorded in the asset manifest: MNI-space atlases at roughly 7 mm, approximate) apply to what is now visible. |
| **Validation** | `a medial view closes the midline instead of showing through a hollow shell`; the before/after pair at one camera in [`docs/screenshots/b3-1/`](../screenshots/b3-1/); the audit in [`docs/anatomy-review.md`](../anatomy-review.md) §3.1. |

### 7. A label is shown only where its structure can be seen

| | |
| --- | --- |
| **Claim** | An annotation is drawn only when the structure it names is the first thing drawn along the ray to its anchor. |
| **Source** | Not a biological source: a correctness requirement. An overlay that ignores depth places a left-hemisphere name on the right hemisphere. |
| **Implementation** | `isAnnotationVisible()` casts the same ray the picker casts, against the same "is this mesh actually drawn" rule (`DRAWN_OPACITY`, one constant, checked by `tests/anatomy-contract.test.js` to be the only one). `getAnnotations()` publishes each label's `structureId` alongside its anchor. `LabelLayer` hides an unseen label in place rather than relocating it, except for a selection: it is exempt from the label cap, and a landmark that names the same structure a selection has pinned is drawn merged into it rather than duplicated (`LabelLayer.js`). |
| **Assumption** | The four **authored landmarks'** anchor is the structure's outermost vertex, chosen once at load and independent of the camera; for a sulcus that point can still sit below the surface of the gyri folded over it, and such a label hides on views where the structure is nonetheless partly visible (F-40, still open for landmarks). A **selection's** anchor is held to a stricter rule since L-44: it is the exact point a tap hit, or, lacking one, the first of several ranked candidate points the live camera can actually see — so it is not hidden by the same single-point blind spot, and only goes unlabelled when the structure has no visible point from that camera at all. |
| **Validation** | `an annotation hides when its own structure is behind something opaque` — hidden by an occluder, visible again from the same place once the occluder is isolated away, and following the layer for the operculum/insula pair; `hiding a label does not touch the selection it names`. Rendered pairs in [`docs/screenshots/f37/`](../screenshots/f37/). `tests/brain-anatomy-selection-label.test.js` — a selection prefers a visible candidate over an occluded one, and a tapped point is used verbatim. `tests/label-layer.test.js` — a selection is exempt from the label cap, and a landmark merges into a matching selection rather than duplicating it. `scripts/check-anatomy-interaction.mjs` §3c — after a real click, the model carries a label for the pinned structure, asserted in a real browser. |

## Deliberate boundary

An exact touch target for ACC cannot be completed by copy, colour or camera
work. It requires replacing or augmenting the cortical geometry with a
compatible, source-attributed parcellation that contains ACC as an independent
surface and then validating its alignment with the retained deep structures.
