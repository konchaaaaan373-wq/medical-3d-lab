# Model evidence — Interactive brain anatomy

Implementation: [`src/data/brainAnatomy.js`](../../src/data/brainAnatomy.js),
[`BrainAnatomyScene.js`](../../src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js)

Boundary of the claim: [`docs/model-cards/brain-anatomy.md`](../model-cards/brain-anatomy.md)

Tests: [`tests/brain-anatomy.test.js`](../../tests/brain-anatomy.test.js)

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
| **Validation** | `colour map and natural anatomy are one-step choices with different visual readings`. |

### 4. Medial views reveal; they do not dissect

| | |
| --- | --- |
| **Claim** | Left/right medial buttons make the selected hemisphere's medial surface inspectable without moving any mesh. |
| **Source** | Gross-anatomy viewing convention. |
| **Implementation** | The camera moves to the opposite side of the midline and the contralateral paired meshes receive zero opacity. Selecting a cingulate mesh requests the matching left/right medial view automatically. Geometry transforms are untouched. |
| **Assumption** | This is a visibility aid and cannot reproduce a physical section or dissection plane. |
| **Validation** | `medial views expose the selected hemisphere without moving anatomy`. |

### 5. The current model cannot identify ACC as an independent mesh

| | |
| --- | --- |
| **Claim** | The source mesh called `Cingulate gyrus and sulcus (Middle anterior part)` must not be presented as anterior cingulate cortex (ACC). |
| **Source** | The shipped GLB has the middle-anterior label but no ACC-labelled mesh; Destrieux/FreeSurfer terminology distinguishes aMCC from ACC. |
| **Implementation** | The mesh is displayed as `帯状回・帯状溝（前中部／aMCC）` and the information card explicitly states that it is not ACC and that the source has no separate ACC mesh. |
| **Assumption** | The source name is close enough to use modern aMCC wording as a terminology cross-reference, but not to assert a Destrieux boundary. |
| **Validation** | `cingulate terminology distinguishes aMCC from an unavailable ACC mesh` checks both the display wording and the absence of an ACC label in the asset. |

## Deliberate boundary

An exact touch target for ACC cannot be completed by copy, colour or camera
work. It requires replacing or augmenting the cortical geometry with a
compatible, source-attributed parcellation that contains ACC as an independent
surface and then validating its alignment with the retained deep structures.
