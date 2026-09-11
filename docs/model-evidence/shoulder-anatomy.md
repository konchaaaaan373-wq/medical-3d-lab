# Model evidence — Interactive shoulder anatomy

Where each claim this scene makes comes from, and what holds it up.

## Sources consulted

- Standard gross anatomy of the glenohumeral joint: a large humeral head against
  a **shallow, small glenoid fossa**, only a fraction of the head being in
  contact at any position, with the **glenoid labrum** as a fibrocartilaginous
  rim that deepens the socket.
- That the **rotator cuff** is four muscles from four surfaces of the scapula —
  supraspinatus above the scapular spine, infraspinatus below it, teres minor
  from the lateral border, subscapularis from the costal surface — and that the
  first three insert on the **greater tubercle** while subscapularis inserts on
  the **lesser tubercle**.
- That **supraspinatus passes beneath the acromion** and the coracoacromial
  ligament, in a space also occupied by the subacromial bursa.
- That the **coracoacromial ligament** runs from the coracoid process to the
  acromion, completing an osseoligamentous arch above the joint.
- That the **long head of biceps** arises from the supraglenoid tubercle and the
  superior labrum — inside the joint — and descends in the intertubercular
  (bicipital) groove between the two tubercles.
- That the **clavicle** is the only bony link between the upper limb and the
  axial skeleton, and that the **coracoclavicular ligaments** suspend the
  scapula from it.
- That the **inferior glenohumeral ligament** forms a sling below the head which
  is slack in adduction and taut in abduction and external rotation.

No external asset, no imaging and no patient data.

## Claim → Source → Implementation → Assumption → Validation

### 1. The socket is small, and that is the point

| | |
| --- | --- |
| **Claim** | The glenoid's articular face is a fraction of the humeral head it faces. |
| **Source** | Standard gross anatomy: roughly a third of the head is on the socket at any position. |
| **Implementation** | The glenoid is drawn as its **own dish** rather than as a face of the scapular plate, so it can be pointed at and measured, and its face is deliberately much smaller than the head's diameter. |
| **Assumption** | A smooth pear-shaped dish; glenoid version is not represented, and "a third" is stated in the copy rather than built as a ratio the geometry guarantees. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the glenoid's height and depth are each well under the head's, and the head is lateral to it. |

### 2. Three cuff tendons end on one tubercle and one on the other

| | |
| --- | --- |
| **Claim** | Supraspinatus, infraspinatus and teres minor end on the greater tubercle; subscapularis, the only one in front, ends on the lesser. |
| **Source** | Standard gross anatomy. It is the whole reason subscapularis rotates the arm inwards and the other three outwards. |
| **Implementation** | Each tendon is a strap drawn to a named site — `greaterTubercle` or `lesserTubercle` — rather than to a position typed four times. |
| **Assumption** | One strap per muscle; the footprints are not measured, and the muscle bellies are outside the scene. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the three posterior tendons reach the greater tubercle and not the lesser, subscapularis the reverse, and the four arrive from four different directions around the head. |

### 3. Supraspinatus passes *under* the arch

| | |
| --- | --- |
| **Claim** | The tendon runs between the head of the humerus and the acromion, in a space with very little room. |
| **Source** | Standard gross anatomy; it is why this tendon rather than another is the one with a bony shelf over it. |
| **Implementation** | The acromion is drawn as a shelf standing out over the head, the coracoacromial ligament closes the arch to the coracoid, and the supraspinatus strap is routed beneath both. |
| **Assumption** | The subacromial bursa in that space is **not** drawn: here the gap is a gap. And the gap is **drawn wider than it is** — `SUBACROMIAL_DISPLAY_GAP` is declared in the builder as a display value, because at this scale a few millimetres against a head of several centimetres is a tendon nobody can see or click. No clearance may be read off the model, and the model card, the scene's disclaimer and the structure's own note all say so. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the supraspinatus tendon lies below the acromion and above the head across the span where they overlap, and the coracoacromial ligament is above it. |

### 4. The biceps tendon begins inside the joint

| | |
| --- | --- |
| **Claim** | It starts on the rim of the socket, crosses the head, and turns down the groove between the tubercles. |
| **Source** | Standard gross anatomy. No other tendon in the body takes that route. |
| **Implementation** | Its curve starts at the labral ring, passes over the top of the head, and descends through the named `bicipitalGroove` site between the two tubercle meshes. |
| **Assumption** | Drawn as a cord of even calibre; the transverse humeral ligament that holds it in the groove and its sheath are not drawn. It is grouped with the cuff in the tree only because it runs through the same place, and the copy says so. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — its upper end is at the socket rim, its course passes between the two tubercles, and its lower end is below both. |

### 5. The arm hangs from the clavicle, through two ligaments

| | |
| --- | --- |
| **Claim** | The clavicle is the only bony link to the trunk, and the coracoclavicular ligament is what carries the load across to it. |
| **Source** | Standard gross anatomy; it is why an acromioclavicular injury is described by whether those ligaments are torn. |
| **Implementation** | The clavicle runs from a medial end outside the scene to the acromion; the acromioclavicular ligament spans that junction and the coracoclavicular ligament runs from the coracoid up to the clavicle. |
| **Assumption** | The coracoclavicular ligament is drawn as one band where in life it is two, the conoid and the trapezoid — stated in the copy. The sternoclavicular joint is outside the scene. |
| **Validation** | `tests/organ-parts-anatomy.test.js` — the clavicle reaches the acromion, the coracoclavicular ligament spans coracoid to clavicle, and both are above the glenoid. |

### 6. Nothing is moved to be seen

| | |
| --- | --- |
| **Claim** | *Not* made in geometry — made in presentation. Every structure is drawn where it belongs. |
| **Source** | This project's rule for every organ: fix the display, not the position. |
| **Implementation** | The slider fades bone, the humerus first and furthest; "the socket, with the humerus put away" hides the humerus by tag; "the cuff on its own" hides every bone; "under the arch" is a viewpoint, not a rearrangement. |
| **Assumption** | A reader who touches nothing sees an intact shoulder from an anterolateral oblique, which is correct and is not what the scene is about. |
| **Validation** | `tests/organ-anatomy-scenes.test.js` — the scene answers the anatomy contract, every structure is selectable by name, and every viewpoint restores what it changed. |
