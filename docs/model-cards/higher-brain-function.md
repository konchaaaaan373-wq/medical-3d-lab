# Model card — higher cortical function: which route the lesion took away

| | |
| --- | --- |
| **Scene ID** | `higher-brain-function` |
| **Route** | `#/higher-brain-function` |
| **Model** | [`src/models/higherBrainFunction.js`](../../src/models/higherBrainFunction.js) |
| **Evidence** | [`../model-evidence/higher-brain-function.md`](../model-evidence/higher-brain-function.md) |
| **Geometry** | `brain-atlas-glb` — the same specimen atlas as `brain-anatomy` |
| **Clinical review** | **pending** |

**Catalog status:** `alpha`

## 1. Question

Why does a lesion of one size take away one set of higher functions and not
another — and why, in a right-handed person, is one hemisphere not the mirror of
the other?

## 2. Model type

A **route-availability model** over named anatomy, solved rather than looked up.
Each task is declared with its input, its output, the stimulus it is probed
with, and the route or routes it is **eligible** to use. A lesion damages
structures and connections; what is solved is how far each eligible route still
reaches, and where along it the availability falls.

Three of the routes are **closed loops**: the frontal–subcortical circuits run
cortex → striatum → pallidum → mediodorsal thalamus → back to the same cortex.
They are in this model for the same reason the language routes are — they are
routes — and they are what lets it say that a behaviour can be lost without its
cortex being touched.

### What it computes, and what it refuses to

**It does not name a syndrome, and it does not rule one out.** There is no
classifier. An earlier version had one: the solved tasks went through a chain of
conditions — comprehension, then repetition, then fluency, first match wins —
and the name it landed on was printed as the read-out's most emphasised row,
together with a verdict of "not aphasia" for two patterns it had rules to
exclude. That was wrong three times over. A first-match chain turns four
dimensionless route values into a clinical category whose answer depends on the
order the conditions were written in. The features that actually separate the
aphasias — paraphasia, agrammatism, effort, phrase length, the stimulus a task
was probed with — are not computed here at all, so the chain was standing on
the self-initiation route as a proxy for clinical fluency. And "not aphasia" is
the stronger claim of the two, needing an examination this model does not do.

The classical syndromes are now in
[`src/data/aphasiaReference.js`](../../src/data/aphasiaReference.js) as
**reference reading**: each one described as relative sparing and variable
features, with a list of what this model cannot evaluate about it. It cannot be
imported by the model, and two tests hold that.

### Two modes, and they do not mix

| Mode | What is changed | What a result means |
| --- | --- | --- |
| `atlas_lesion` | Named structures of the atlas, whole or as a stated share | The declared routes through those structures |
| `conceptual_intervention` | One declared cognitive process, switched off | A thought experiment on this model's graph |

The conceptual mode exists because the atlas cannot separate everything the
model distinguishes — letter form from object form, most notably — and because
some declared processes have no mesh at all. **A conceptual result is not a
prediction about any real lesion**, the read-out says so while one is running,
and the solver throws if it is handed both a lesion and an intervention.

### Three computation states

`computed` is a band. `indeterminate` means an eligible route runs through
something this mode cannot evaluate, so no value is reported. `not_modeled`
means no route is declared for the task at all — it is absent, which is neither
normal nor abolished, and it may not be used to tell one picture from another.

## 3. What it is not

**It is not a lesion localiser, and must never be used as one.** The atlas is
one normal specimen. The lesions are whole named structures drawn on it. Nothing
in it is anybody's imaging, and no output of it says where a patient's lesion is.

**It is not a diagnosis, and no row of it is a finding about a person.** A band
is a band on a dimensionless scale. `low` is the bottom band, not "the patient
cannot do this": a route at 0.2 is not a route at zero, and only
`declaredBlock` — which needs an element at exactly zero — says a route in this
model is stopped.

There is **no quality of speech** here: no paraphasia, no agrammatism, no
prosody, no dysarthria, no perseveration, no rate and no phrase length.
Connected-speech fluency is declared and reports `not_modeled`. Reading aloud
is declared and reports `not_modeled`. Calculation, finger knowledge and
left–right orientation are declared together and report `not_modeled`.

There is **no hearing**: no audiometry and no non-speech sounds, so this model
cannot separate a word-specific auditory deficit from cortical deafness.

There is **no course over time**: no oedema, no penumbra, no diaschisis, no
recovery, no rehabilitation, no plasticity. How far a lesion has been taken is
an input on a slider and never a prediction about a day, a week or a year.

There is **no script**: no kanji/kana and no regular/irregular distinction. The
nonword tasks are abstract — they show the routes coming apart, and predict
nothing about a particular word in a particular language.

**Executive function is here as the circuits, and no further.** Mood,
personality, insight, social cognition and anything a scale would score are not
routes and are not in this model.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `handedness` | `right` only | Which hemisphere every `dominant` side resolves to. Any other value is **refused**, because left-handedness is not the mirror image of right-handedness |
| `mode` | `atlas_lesion` \| `conceptual_intervention` | Which kind of intervention. Passing inputs for both is an error, not a merge |
| `lesions` | declared sites in `LESION_SITES` | Which structures are damaged, and by how much of each |
| `interventions` | declared node or connection ids | Which processes are switched off. Conceptual mode only |
| `extent` | 0–1 | How far the lesions have been taken. An input, never a prediction. Outside the range it throws rather than clamping |

## 5. Outputs

Per node and connection: an integrity, whether this mode can evaluate it, and
whether it is a process taken as available because no lesion can reach it.

Per task:

| Field | What it is |
| --- | --- |
| `computationStatus` | `computed` / `indeterminate` / `not_modeled` |
| `availability` | 0–1, or `null` when there is no value |
| `state` | `high` / `intermediate` / `low`, or `null` |
| `route` | The reported route, in order, with each step's integrity |
| `evaluatedRouteIds` | The eligible routes this mode could evaluate |
| `ineligibleRouteIds` | Routes declared for the task and not eligible for its stimulus |
| `unevaluatedRouteIds` | Eligible routes this mode cannot evaluate |
| `limitingSteps` | The steps below the top band on the reported route |
| `declaredBlock` | True only when every evaluated route has an element at exactly zero |
| `coverageLimitations` | What this value does not settle — a shared mesh, an unmapped process, a deficit the routes do not produce |
| `unmodelledInfluences` | Influences a chosen lesion declares and this model does not compute |
| `excludes` | What the task itself is not about |

Plus the structures the lesion touched, by atlas label and side, and the
uncomputed influences of the chosen lesion.

**There is no syndrome field.** Nothing in the solved state carries a name, and
a test walks every declared lesion to confirm it.

## 6. State variables

None. `solveHigherBrainFunction()` is a pure function of handedness, lesions and
extent. There is no integration and no time.

## 7. Governing relations

```text
element integrity    = 1 − mean(damage over its structures)        (composite)
                     = best side's integrity                       (paired)
                     = 1, unevaluated                             (no atlas mapping)
route availability   = ∏ integrity over the distinct nodes and connections on it
task availability    = max over the routes the task is ELIGIBLE for
band                 = high ≥ 0.85 > intermediate ≥ 0.25 > low
```

A **connection** obeys the same rule as a node: its integrity comes from the
structures it runs within, on the side it runs on. It used to be a channel of
its own that a lesion set by id — and an id has no side, so selecting one
internal capsule interrupted the same pathway on both sides. There is one
damage input now, and it is sided.

*Eligible*, because `max()` over every declared route would let a route through
a lexicon rescue a nonword. Each route may declare the stimuli it serves, and
the maximum is over the subset that serves the one the task was probed with.

*Distinct*, because a closed loop passes its first node twice — and so does the
route that repeats a word by way of its meaning. Counting one structure twice
would make a lesion of it weigh double for no reason anybody could defend.

A product and not an average, because a route is a chain: a step that carries
nothing leaves nothing for the rest of the route to carry.

**Nothing searches the network for an alternative route.** Where an alternative
is real it is declared: printed words reach the dominant hemisphere directly or
across the commissure, a known word can be repeated round through its meaning,
and a known word can be spelled lexically or phonologically. Those are the only
such places, and each is written down.

### The conservative rules

These live in one pure function (`resolveTaskResult`) because each is a way this
model could lie:

- **No eligible route is not availability zero.** `max([])` has no value.
- **An unevaluated route is not a blocked one.** If every route this mode could
  evaluate is in the bottom band and an eligible route remains that it cannot
  evaluate, the answer is `indeterminate`.
- **A known value is not "the best route" while an eligible route is unknown.**
- **The bottom band is not a blockade.** `declaredBlock` needs a zero.
- Ties go to declaration order, so the same input always explains itself with
  the same route.

## 8. Constants and calibration

Nothing here is a measurement.

The **product rule** is invented arithmetic: no source gives an availability for
a cortical route. The **two cut points** are places to draw a line on a
dimensionless scale, chosen so that a half-taken lesion reads as the middle band
and a structure completely gone reads as the bottom one. The **shares** on a few
lesion sites — how much of a large structure a site takes — are chosen so a site
can say "the white matter under the supramarginal gyrus" without claiming a
hemisphere.

One share was removed in the revision: the occipital preset took 40% of the
corpus callosum, an invented number standing in for the splenium, which made the
preset read as a posterior callosal lesion while being a fraction of an
undivided mesh. It takes the whole commissure now and says so.

No parameter here is calibrated to a dataset, and no output is a score, a
severity scale or a test result.

## 9. Visual mapping

- A structure's colour says **which network it belongs to and how much of it the
  lesion took**. Nothing brightens because it is the subject of the current
  stage: the solved state is the only thing that moves a colour.
- The traced route is drawn **through the tract the model says it runs in** —
  the arcuate fasciculus for the dorsal language route, the corpus callosum for
  a crossing — so a disconnection lights the bundle it cuts rather than a gap
  between two gyri. These tract meshes are in the distributed atlas and **no
  scene in this repository had ever drawn them**.
- The signal travels the route and **stops at the step that stopped it**.
- **The route itself is lit as far as the signal got, and neutral beyond it.**
  That was a small halted marker until a rendered frame showed it does not
  read — the marker is the colour of the line it sits on — so a front lesion
  and a back lesion gave two pictures a viewer cannot tell apart. The dim part
  is **not damaged**: those steps are intact and were never reached, which is
  why it is neutral rather than the lesion colour.
- **The run repeats as an examination**: the task is asked at the end it enters
  by, carried, and either answered or not. **The order is the claim and the
  seconds are a rhythm** — nothing in this model is a latency, a conduction time
  or a reaction time, and the sequence says so on screen. The answer at the far
  end is the task's own band: full, faint, or absent — and absent for a task
  with no value at all, whose read-out row says whether the reason is
  "cannot be determined" or "not modelled".
- **Whatever a route runs through that the cortex hides is drawn in front of
  it**, in its own place — tracts, commissures and deep grey alike, with the
  bulk telencephalic white matter the one stated exception. Cutting the arcuate fasciculus is this model's signature claim and the
  bundle sits under the surface, so drawn the ordinary way the picture showed a
  signal stopping at nothing a reader could see.
- The route is drawn in front of the brain rather than inside it, because most
  of it runs through white matter a reader cannot see from outside.
- **When a route runs under the surface** — the frontal–subcortical circuits and
  the memory circuit — the cortex in front is faded and the deep structures on
  that route are drawn in front of it, **in their own places and at their own
  size**. Only the depth order changes. The route's own cortical node is not
  lifted: a gyrus and the basal ganglia behind it cover the same screen space in
  a lateral view, and lifting both painted the gyrus over the structure the
  reveal existed to show.
- Nothing moves, resizes or deforms any anatomy. A lesion is a colour, not a
  hole.
- **Which kind of intervention is on screen is on the read-out**, as its first
  and most emphasised row. A conceptual knockout and a lesion produce the same
  kind of picture, so the picture alone cannot say which one it is.
- **Not yet honest enough**: a connection this model declares as conceptual is
  drawn the same way as one anchored in a real tract mesh. A reader cannot tell
  from the 3D which lines are tractography-shaped claims and which are
  functional arrows. `docs/follow-ups.md` F-198.

## 9.5 Where else this model is read

A reader touching a structure in an **anatomy** scene is asked a question this
model can answer: *what is this for?* The answer shown there is produced the
same way as everything else here — that one structure destroyed, the model
solved — so the two surfaces cannot drift apart, and it carries the same
sentence about what it is not.

It is shown **only where this scene is open**. The anatomy scene it appears on
is published; this model's medical review is not recorded yet, so in a
production build the section does not exist. The scene that owns the reading is
declared in the catalogue (`providesStructureFunctions`) rather than named in
the surface that shows it. The reading itself lives inside the scene's own folder
(`src/scenes/nervous/scenes/higherBrainFunction/structureFunctions.js`) and is
loaded with the scene, so a withheld model cannot reach a published bundle. See
`docs/follow-ups.md` F-166.

## 9.6 The fifteen-second sequence

One **nonsense word**, asked four times of the same brain: once with nothing in
the way, then with the front cut, the back cut, and the bundle between them cut.
Each run is a whole examination — asked, carried, answered or not — and the four
are given the same length, so the only thing that differs between them is **how
far the word got**.

The word is a nonword on purpose. Repeating a *known* word has a way round
through its meaning, so a dorsal cut leaves it in the middle band and the
sequence would show two stopping places and one partial. A nonword has no
lexical entry and therefore no way round, so each of the three cuts stops it
somewhere different — which is the claim the fifteen seconds make, and which is
also the stimulus effect the conduction-aphasia descriptions report.

**The closing frame does not name the three syndromes.** It used to: the
take-home read "the name is where it stopped", over the three names. That was
the classifier's claim, and with the classifier gone the sequence says what it
actually shows — the route is the finding, and what to call the picture is a
separate question. The rows are read from the solved state each frame; the
storyboard holds only times and camera distance. The scene is driven by absolute
sequence time (`renderAtSeconds`), so the same second renders identically on any
machine and at any frame rate.

**The seconds are a rhythm, not a latency.** The model has no time in it, and
the overlay says that for the whole fifteen seconds.

## 10. Known failure modes

**Substrate — what the atlas cannot divide.**

- **No splenium.** The corpus callosum is one mesh, so no preset here is a
  posterior callosal lesion. The one that used to imply it takes the whole
  commissure and says so in its own label.
- **No somatotopy.** The precentral gyrus is one mesh, so a lesion there takes
  the mouth and the hand together, and "graphomotor output" is explicitly not
  "the hand area".
- **No anterior insula.** One insular mesh, so the restricted region proposed
  for apraxia of speech cannot be selected — and this model has no speech
  quality to test that proposal against anyway.
- **Letter form and object form share one occipitotemporal mesh.** A lesion
  takes both. The dissociation is available only as a conceptual intervention,
  and both tasks report the shared mesh as a limit of their value. So the
  object-naming sparing that defines pure alexia **cannot be shown from a
  lesion here**.
- **The middle frontal gyrus is one mesh**, so the premotor cortex a praxis
  route uses and the dorsolateral prefrontal cortex an executive circuit starts
  from are the same structure: a lesion of one takes the other.

**Medicine — what the routes get wrong or leave out.**

- **Agraphia does not accompany the perisylvian aphasias here.** A lesion of the
  inferior frontal gyrus leaves both spelling routes reaching, because neither
  passes through it. In a person that picture comes with agraphia. This is
  declared as a coverage limitation on every writing result rather than fixed by
  pushing a value down to match a label — the previous version had the opposite
  error, routing all writing through the oral output planner so that any dorsal
  cut abolished every kind of writing.
- **Where the two spelling routes sit is not settled.** The angular and
  supramarginal placements come from four patients per group on CT in 1984, and
  the meshes are whole gyri. The dossier marks it `uncertain`.
- **Naming stays available after the anterior border-zone preset**, where in a
  person it is variably affected. An artefact of the routes, and the reference
  layer says so.
- **The thalamus is off the routes.** A thalamic lesion changes no route value,
  and the influence this model does not compute is attached to six language
  tasks so that cannot read as "no effect". What it will not do is put a number
  on it.
- **Striatocapsular aphasia is not here.** In this model it would produce
  "output affected, comprehension kept", which is what the insular preset
  produces; the contributions that distinguish it — cortical hypoperfusion,
  lesion extent, time course — are outside the model. That two different lesions
  give the same output is not itself a defect.
- **The three prefrontal pictures come apart more cleanly than in a person.**
  Real lesions rarely respect one circuit.

**Verification — what has not been checked.**

- **No full text was read for any claim in the dossier.** Every publisher domain
  is blocked by this build environment's network policy; the strongest
  verification any row carries is `abstract-only`. See §0 of the dossier.
- **No clinician has reviewed any of this.** The review state below is
  `pending`, and this revision does not change it.
- The tract meshes this scene draws have **never been reviewed by an anatomist**.
- **The 3D view does not yet distinguish a conceptual connection from a real
  tract** in its legend (`docs/follow-ups.md` F-198).

## 11. Where it will mislead

**A lesion drawn on this brain reads as a lesion seen on a scan.** It is neither
an image nor a segmentation of one. Whole named structures of one normal
specimen, coloured.

**A band reads as an ability.** "Route barely available" is the bottom third of
a dimensionless number computed over declared steps. It is not a statement that
a person cannot do the task, and the bands were drawn rather than found.

**A conceptual result reads as a lesion's consequence.** Switching off letter
processing and watching reading go while object naming stays is a thought
experiment about this model's graph. No lesion in this atlas does that, and the
read-out says so while the mode is running — but a screenshot of it does not.

**`not_modeled` reads as normal.** Reading aloud, connected-speech fluency and
the Gerstmann tetrad have no routes here. A reader comparing a picture against
the reference layer must not fill those in from the rows that do have values.

**An absent effect reads as a demonstrated absence.** The thalamus changes no
route value in this model. That is a statement about the routes it declares,
not evidence that thalamic lesions spare language.

**The reference layer reads as a checklist.** Its cells describe relative
sparing and variable features on purpose. Matching a computed picture against
one of them is not a diagnosis, and diagnosis, treatment selection, dose
selection, prognosis and procedure planning are all prohibited uses.

