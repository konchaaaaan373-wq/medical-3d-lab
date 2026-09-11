# Model evidence — Interactive larynx and pharynx anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the pharynx as **one lumen named in three lengths**
  — nasopharynx above the soft palate, oropharynx behind the mouth,
  laryngopharynx behind the larynx — continuous with the oesophagus below.
- That **the oropharynx is the one length both air and food pass through**, and
  that the soft palate closes the nasopharynx off during a swallow.
- That below the laryngeal inlet the larynx occupies the middle of the
  pharynx's front wall, and that what is left of the lumen on either side of it
  is the **piriform sinus** — the route a bolus takes round the airway.
- That the laryngeal skeleton is the **thyroid cartilage**, a shield open
  behind; the **cricoid**, the only complete ring in the airway, deeper behind
  than in front; and the paired **arytenoids** standing on that deeper part,
  each carrying the posterior end of a vocal fold.
- That the **hyoid** articulates with no other bone and the larynx is suspended
  from it.
- That the larynx contains **two pairs of folds** — vestibular above, vocal
  below — separated by the **ventricle**; that the vocal folds meet anteriorly
  at the commissure and diverge posteriorly, so the rima glottidis is a V; and
  that the glottis is **the narrowest point of an adult airway** while the
  **subglottis**, inside the complete ring, is the narrowest point in a small
  child.
- That the **cricothyroid membrane** closes the gap between thyroid and cricoid
  in the anterior midline, with the airway directly behind it.
- That the **recurrent laryngeal nerves** reach the larynx from below in the
  groove between trachea and oesophagus, and that the two sides reach it by
  different courses.
- That the **tracheal cartilages are open posteriorly** and that the
  oesophagus lies immediately behind, collapsed at rest.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. One lumen, named in three lengths

| | |
| --- | --- |
| **Claim** | Nasopharynx, oropharynx and laryngopharynx are one continuous space, not three tubes, and they stack in that order. |
| **Source** | Standard gross anatomy; the names mark boundaries (the soft palate, the laryngeal inlet), not joins. |
| **Implementation** | `pharynxSection(y)` gives the lumen's width, depth and centre at any height, and all three lengths and both gutters are cut out of it (`docs/architecture-rules.md` rule 1). |
| **Assumption** | Drawn as the space itself, because a space cannot otherwise be pointed at. The muscular wall around it is not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the three lengths stack in order, meet at the levels their names come from, and do not overlap. |

### 2. The larynx stands in the front wall, and the gutters go round it

| | |
| --- | --- |
| **Claim** | Below the inlet the larynx takes the middle of the front wall; the piriform sinuses are what is left of the lumen on either side, and they reach forward past it. |
| **Source** | Standard gross anatomy. It is why a swallow splits and passes lateral to the airway rather than over it, and why a fish bone lodges where it does. |
| **Implementation** | `pharynxFrontAt(y, across)` notches the lumen's front wall below the inlet, in the middle only. The laryngopharynx is the middle slice of that lumen and the gutters are the lateral slices — the same geometry, cut differently. |
| **Assumption** | The notch is a smooth indentation rather than the real outline of a laryngeal inlet, and no swallow is animated. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — both gutters reach forward past the front of the laryngopharynx and lie lateral to the thyroid cartilage's midline, while the laryngopharynx stays behind the cricoid. |

### 3. Two pairs of folds, and the pocket that proves it

| | |
| --- | --- |
| **Claim** | The vestibular folds are above the vocal folds, with the ventricle between them. |
| **Source** | Standard gross anatomy; the false folds are not the ones that make the voice, and the ventricle is what separates the two claims. |
| **Implementation** | `LEVELS.vestibularFold`, `LEVELS.ventricle` and `LEVELS.vocalFold` are three heights in one table, and nothing else in the file may duplicate them. |
| **Assumption** | Smooth shelves at one size. The layers of a vocal fold, and the saccule off the ventricle, are not drawn. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the ventricle lies wholly between the two pairs, and the true folds wholly below it. |

### 4. The glottis is a V

| | |
| --- | --- |
| **Claim** | The two vocal folds meet at the midline in front and diverge to the arytenoids behind, so the opening between them is a triangle. |
| **Source** | Standard gross anatomy: the anterior commissure is a join, not a gap. |
| **Implementation** | Each fold's free edge runs from the midline at the front to `GLOTTIS_DISPLAY_GAP` at the back; its attached edge follows `laryngealWallAt(z)`, the same function the thyroid cartilage is lathed about. |
| **Assumption** | **The posterior opening is a display value**, stated on the structure, in the model card and in the disclaimer: folds at rest are apart and folds in phonation are together, and this scene draws neither. No calibre may be read off it. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the two folds meet at the front within a small tolerance and are apart at the back by the declared gap, and each one's lateral edge is inside the thyroid cartilage. |

### 5. The one place the airway is under the skin

| | |
| --- | --- |
| **Claim** | The cricothyroid membrane fills the gap between the two big cartilages in the anterior midline, with the airway directly behind it. |
| **Source** | Standard gross anatomy; it is a landmark because of what is *not* in the way. |
| **Implementation** | The membrane is placed in the gap between the thyroid's lower border and the cricoid's upper border, in front of the subglottic space. |
| **Assumption** | A plain sheet, drawn as a landmark. **No route, depth, angle or technique is represented**, and the model card and the disclaimer both say the scene must not be used to plan one. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the membrane lies between the two cartilages in height, in front of both, and in front of the subglottic space. |

### 6. Where the two ways part again

| | |
| --- | --- |
| **Claim** | The oesophagus lies behind the trachea, and a recurrent laryngeal nerve runs up the groove between them on each side. |
| **Source** | Standard gross anatomy; it is why a nerve that never enters the chest's midline can still be injured by anything in the neck, and why the tracheal rings are open behind. |
| **Implementation** | The oesophagus is a collapsed tube behind the trachea, continuous with the bottom of the pharyngeal lumen; each nerve runs vertically between the two. |
| **Assumption** | Only the upper part of each tube is drawn, and **the two nerves are drawn alike** where in life the left takes a much longer course. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the oesophagus is wholly behind the trachea, and each nerve lies between them in depth and reaches the larynx from below. |

### 7. Nothing is moved to be seen

| | |
| --- | --- |
| **Claim** | *Not* made in geometry — made in presentation. |
| **Source** | This project's rule for every organ: fix the display, not the position. |
| **Implementation** | The layer slider fades the pharynx, which is the bag everything else is inside; the cartilages are part-transparent at rest because what the scene is about is inside them; and the viewpoints are the ones this anatomy is looked at from — from behind, from above, and cut on the midline. |
| **Assumption** | A reader who touches nothing sees the whole crossing from in front, which is correct and is not where the detail is. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the scene answers the anatomy contract, every structure is selectable by name, every viewpoint restores what it changed, and the width the scene reserves is the width its subject needs. `scripts/check-anatomy-interaction.mjs` drives it in a browser. |
