# Model evidence — Interactive liver anatomy

Where each claim this scene makes comes from, and what holds it up. The
geometry predates the scene; what is new is the naming.

## Sources consulted

- Couinaud's functional segmentation of the liver, as stated in
  `liverAnatomy.js`: the three hepatic-vein planes and the portal plane, with
  the caudate lobe treated as independent of all four.
- Standard gross-anatomy accounts of the hepatic venous outflow and the portal
  inflow, and of the relationship between the falciform ligament and Cantlie's
  line.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. Nine parts whose union is the liver

| | |
| --- | --- |
| **Claim** | Segments I–VIII, with IV split into IVa and IVb, partition the liver with no gap and no overlap. |
| **Source** | Couinaud's scheme; the plane definitions in `PLANES`. |
| **Implementation** | `buildLiver` carves each part out of one liver with the planes that bound it, finding each part's own centroid first because a carve is star-shaped about its centre. |
| **Assumption** | The planes are flat and the liver's outer form is a warped ellipsoid, so the parts are a model of the scheme rather than a tracing of an organ. |
| **Validation** | `tests/liver-anatomy.test.js` — the partition check, and each part's share against its reference proportion. |

### 2. Outflow between, inflow within

| | |
| --- | --- |
| **Claim** | The hepatic veins run in the planes that divide the segments; the portal pedicles run inside the segments. |
| **Source** | Standard hepatic anatomy, and the basis of anatomical resection. |
| **Implementation** | Each hepatic vein's origin is *projected onto* the plane it is named for rather than typed as a coordinate; each pedicle ends at its own segment's centroid. |
| **Assumption** | Calibres and courses are illustrative. Second- and third-order branching is not drawn. |
| **Validation** | `tests/liver-anatomy.test.js` — each vein lies on its plane; each pedicle lies inside its segment. |

### 3. Cantlie's line is not the falciform ligament

| | |
| --- | --- |
| **Claim** | The functional division between the right and left liver runs through the middle hepatic vein, and the visible surface landmark is somewhere else. |
| **Source** | Standard hepatic anatomy. |
| **Implementation** | The two planes are declared separately, and the scene's copy says which is which on both the middle hepatic vein and the left. |
| **Assumption** | None. |
| **Validation** | `tests/liver-anatomy.test.js` holds the two apart by a measured distance. |

### 4. The caudate lobe is the exception

| | |
| --- | --- |
| **Claim** | Segment I takes portal blood from both branches and drains straight into the cava. |
| **Source** | Standard hepatic anatomy; the reason it is spared and hypertrophies in Budd–Chiari. |
| **Implementation** | Two pedicles reach it, one from each branch, and its own short veins run to the cava rather than to any of the three hepatic veins. The scene declares those two tubes as one structure. |
| **Assumption** | Number and calibre of the caudate veins are illustrative. |
| **Validation** | `tests/liver-anatomy.test.js`; the two-mesh structure is covered by the tree correspondence in `tests/organ-anatomy-scenes.test.js`. |

### 5. Colour separates; it does not classify

| | |
| --- | --- |
| **Claim** | The nine segment colours are a viewing aid and carry no biological meaning. |
| **Source** | Interface requirement, not a source about the liver. |
| **Implementation** | Two colour modes over one unmoved set of meshes: nine separable hues, or the liver's own tissue colour on all nine. |
| **Assumption** | A reader may take colour for identity within this interface only. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — changing the colour mode does not change what is selected. |
