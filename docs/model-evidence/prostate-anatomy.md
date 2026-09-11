# Model evidence — Interactive prostatic anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- McNeal's zonal description of the prostate: a **peripheral zone** forming the
  posterior, lateral and apical part of the gland and most of its glandular
  tissue; a **central zone** surrounding the ejaculatory ducts from the base to
  the verumontanum; a **transition zone** surrounding the urethra proximal to
  the verumontanum; and an **anterior fibromuscular stroma** that is not
  glandular.
- That most prostate cancer arises in the peripheral zone and benign nodular
  enlargement in the transition zone.
- That the prostatic urethra passes through the gland from the bladder neck to
  the apex and bends forward at the verumontanum.
- That each ejaculatory duct is formed by the union of a vas deferens and a
  seminal vesicle, enters the base, and opens on the verumontanum.
- That the posterior surface of the gland lies against the rectum.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. The peripheral zone is the outside, and the other two are the inside

| | |
| --- | --- |
| **Claim** | The peripheral zone is a shell around an inner gland, not a wedge of one. |
| **Source** | McNeal. It is why a rectal examination reaches it and a transurethral resection does not. |
| **Implementation** | The one primitive added for this organ: a part may take a *band* of the gland's own radius. The peripheral zone is the shell between a scaled copy of the gland's surface and the surface itself; the inner zones are what is inside that copy. No arrangement of planes says this. |
| **Assumption** | The inner boundary is a scaled copy of the outer surface, so it has the gland's shape rather than its own. Real zone boundaries are neither surfaces of revolution nor planes. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the peripheral zone's bounds enclose both inner zones, and it is the zone nearest the rectum. |

### 2. The proportions are a display setting

| | |
| --- | --- |
| **Claim** | *Not* made. The relative size of the four zones here is a drawing decision. |
| **Source** | In life the peripheral zone is about seventy per cent of the glandular tissue and the transition zone about five. |
| **Implementation** | `INNER_GLAND_FRACTION` is documented as a display value. Drawn to scale the inner zones would be a speck that cannot be selected. |
| **Assumption** | Recorded on all four zone structures in both languages, in the model card and in the scene's disclaimer, together with "no volume may be read off this model". |
| **Validation** | The note is held in both languages by `tests/organ-anatomy-scenes.test.js`. |

### 3. The verumontanum is what the inside is placed from

| | |
| --- | --- |
| **Claim** | Transition zone above and in front of it; central zone behind and above it; both ejaculatory ducts opening on it; the urethra bending forward at it. |
| **Source** | McNeal, and standard gross anatomy. |
| **Implementation** | `VERUMONTANUM` is named once. The plane that splits the inner gland passes through it, both ejaculatory duct curves end at it, and the urethra's bend is at its level. Nothing about the inner gland is a second copy of the position. |
| **Assumption** | Drawn as a small marker rather than a ridge with two openings in it; the prostatic utricle is not modelled. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — both ducts end at the verumontanum, the transition zone is anterior and inferior to the central zone, and both ducts lie within the central zone's bounds. |

### 4. The urethra goes through the gland, not past it

| | |
| --- | --- |
| **Claim** | Gland and urethra are not independent — which is the whole of why an enlarged prostate obstructs. |
| **Source** | Standard gross anatomy. |
| **Implementation** | The urethra's path starts above the gland at the bladder neck and ends below it at the apex, passing through the inner zones on the way. |
| **Assumption** | One tube of constant calibre. The urethral crest, the sinuses and both sphincters are not drawn, and no calibre is a measurement. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the urethra spans the gland from above its top to below its bottom, and its middle lies inside the transition zone. |

### 5. The gland is between the bladder and the rectum

| | |
| --- | --- |
| **Claim** | Bladder neck directly above, rectum immediately behind, peripheral zone the surface between the gland and the rectum. |
| **Source** | Standard gross anatomy; the basis of both rectal examination and transrectal biopsy. |
| **Implementation** | Both are drawn, tagged as context and excluded from the framing subject; a viewpoint comes at the gland from the rectal side. |
| **Assumption** | Denonvilliers' fascia between prostate and rectum is not drawn, so the two look closer together than they are separable. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the bladder neck is above the gland, the rectum behind it, and the peripheral zone is the zone nearest the rectum. |
