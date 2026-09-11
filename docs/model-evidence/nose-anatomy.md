# Model evidence — Interactive nose and sinus anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the nasal cavity: a **septum** on the midline
  dividing one space into two, a **lateral wall** carrying three turbinates —
  inferior, middle and superior — with the **meatus** of the same name beneath
  each, a **floor** shared with the roof of the mouth, and a **roof** under the
  anterior skull base.
- That the **maxillary sinus opens near the top of its medial wall** into the
  middle meatus, so that its contents leave against gravity, moved by cilia.
- That the **frontal sinus and the anterior ethmoid cells also drain into the
  middle meatus**, so that one narrow area is the common outlet of three
  sinuses; that the **posterior ethmoid** cells open into the superior meatus;
  and that the **sphenoid sinus** opens into the recess above and behind the
  superior turbinate.
- That the **nasolacrimal duct is the only thing that opens into the inferior
  meatus**, and that no sinus does.
- That the **olfactory region is a small patch of the roof and the upper
  septum**, out of the main stream of air, whose nerve filaments pass upwards
  through the cribriform plate.
- That the **floor of the nasal cavity runs backwards horizontally** rather than
  upwards, and that both cavities open through the choanae into one
  **nasopharynx**.
- That the wall between the **ethmoid air cells and the orbit** is paper-thin,
  and that the **pituitary gland sits directly above the sphenoid sinus**.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. Three shelves on one wall, in order

| | |
| --- | --- |
| **Claim** | Inferior, middle and superior turbinate hang off the lateral wall, one above the next, each reaching medially without crossing to the septum. |
| **Source** | Standard gross anatomy; it is what a lateral nasal wall *is*. |
| **Implementation** | `TURBINATES` gives each shelf an attachment height, a reach, a curl and a thickness; every one is swept from the same `CAVITY.lateralWall` and every side comes from one `MEDIAL` constant. |
| **Assumption** | Each is drawn as one smooth shelf. The bones beneath them are not separated, the supreme turbinate is not drawn, and **no reach or height is a measurement**. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the three attach in order going up, each starts at the wall and stops short of the septum, and the free edge of each hangs below its attachment. |

### 2. Each gutter is the space under the shelf it is named for

| | |
| --- | --- |
| **Claim** | The inferior meatus lies between the inferior turbinate and the floor, the middle between the middle and inferior turbinates, the superior between the superior and middle. |
| **Source** | Standard gross anatomy. A meatus is defined by the turbinate over it. |
| **Implementation** | **One function, three uses**: `turbinateSurface(level, x)` is a turbinate's mid-surface. The shelf is built around it, the gutter below takes its roof from it, and the gutter above takes its floor from it, so they cannot drift apart (`docs/architecture-rules.md` rule 1). |
| **Assumption** | The gutters are drawn as the spaces themselves, because a space cannot otherwise be pointed at. Their lining is not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — each meatus lies wholly below the turbinate it is named for and wholly above the next structure down, and none of the three overlaps another. |

### 3. The maxillary sinus drains uphill

| | |
| --- | --- |
| **Claim** | The maxillary ostium leaves the sinus near its roof, not its floor, and ends inside the middle meatus. |
| **Source** | Standard gross anatomy; it is the single most consequential fact about a paranasal sinus and the reason a maxillary sinus is spoken about the way it is. |
| **Implementation** | The sinus is placed lateral to and below the cavity with a flattened medial wall; `SITES.maxillaryOstium` sits near the top of that wall and the ostium runs from there into `SITES.middleMeatus`. |
| **Assumption** | The ostium is drawn as a short straight passage. The infundibulum it actually opens through, and the accessory openings many people have, are not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the ostium's sinus end is in the upper part of the sinus and far above its floor, and its other end is inside the middle meatus and outside the inferior and superior ones. |

### 4. Three sinuses arrive in one gutter, and the tear duct in another

| | |
| --- | --- |
| **Claim** | The maxillary, frontal and anterior ethmoid sinuses share the middle meatus; the nasolacrimal duct opens into the inferior meatus and no sinus does. |
| **Source** | Standard gross anatomy. It is why one small area matters out of proportion to its size, and why the inferior meatus does not. |
| **Implementation** | The maxillary ostium is drawn; the frontal and ethmoid channels are stated in the copy for each structure and not drawn as geometry. The tear duct's lower end is placed inside the inferior meatus. |
| **Assumption** | **Two of the three drainage routes into the middle meatus are described rather than modelled**, and the structures that shape that gutter — uncinate process, ethmoid bulla, hiatus semilunaris — are not drawn, so the arrangement within it cannot be read off this model. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the duct's lower end lies inside the inferior meatus, and no sinus or ostium reaches into it. |

### 5. Smell is a small patch, high up

| | |
| --- | --- |
| **Claim** | The olfactory region occupies the roof and the top of the septum, above every turbinate, with filaments leaving upwards. |
| **Source** | Standard gross anatomy; it is why sniffing helps and why a blocked nose takes smell with it. |
| **Implementation** | A patch drawn along the roof between `CAVITY.roof` and just below it, from the septum out to mid-wall, with five filaments standing for many rising from it. |
| **Assumption** | Five threads for a great many; the cribriform plate they pass through and the olfactory bulb above it are not drawn, and the patch is drawn at one size where the real area varies. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the patch lies above the topmost turbinate and its filaments rise above the roof of the cavity. |

### 6. Nothing is moved to be seen

| | |
| --- | --- |
| **Claim** | *Not* made in geometry — made in presentation. A nasal cavity is a slit and stays a slit. |
| **Source** | This project's rule for every organ: fix the display, not the position. |
| **Implementation** | The layer slider fades the **septum**, which is the sheet between the camera and everything worth seeing; the viewpoints come round to the medial side and hide the midline by tag; the sinus views hide the lateral wall, which is what is between a reader and a sinus in life; and the coronal view is a real cut on the plane this anatomy is imaged in. |
| **Assumption** | A reader who touches nothing sees a nose from outside, which is correct and is not what the scene is about. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the scene answers the anatomy contract, every structure is selectable by name, every viewpoint restores what it changed, and the width the scene reserves is the width its subject needs. `scripts/check-anatomy-interaction.mjs` drives it in a browser. |
