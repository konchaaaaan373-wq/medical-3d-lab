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

A **route model** over named anatomy, solved rather than looked up. Each
clinical task — understanding speech, repeating, speaking fluently, saying
something with content, naming, reading, writing, calculating, using a tool with
either hand, attending to either side of space, laying down a memory, changing
tack, holding a response back, starting something unprompted — is declared as
the structures it passes through, in order, with the connection between each
pair anchored in the mesh that connection runs inside.

Three of those routes are **closed loops**: the frontal–subcortical circuits run
cortex → striatum → pallidum → mediodorsal thalamus → back to the same cortex.
They are in this model for the same reason the language routes are — they are
routes — and they are what lets it say that a behaviour can be lost without its
cortex being touched.

A lesion damages structures and connections. Everything after that is solved:
how far each task's best route still carries, where along it the signal stops,
and what the pattern of surviving tasks is called.

**No syndrome is stored.** "Conduction aphasia" appears nowhere as a cause. Cut
the arcuate fasciculus and repetition fails while comprehension and fluency do
not, because repetition is the one task whose route uses it; the name is then a
reading of that pattern, produced by the same function that would produce a
different name from a different pattern.

## 3. What it is not

**It is not a lesion localiser, and must never be used as one.** The atlas is
one normal specimen. The lesions are whole named structures drawn on it. Nothing
in it is anybody's imaging, and no output of it says where a patient's lesion is.

There is **no quality of speech** here: no paraphasia, no agrammatism, no
prosody, no dysarthria, no perseveration. The model says whether a route
carries, never what comes out of it.

There is **no course over time**: no oedema, no penumbra, no diaschisis, no
recovery, no rehabilitation, no plasticity. How far a lesion has been taken is
an input on a slider and never a prediction about a day, a week or a year.

**Executive function is here as the circuits, and no further.** Mood,
personality, insight, social cognition and anything a scale would score are not
routes and are not in this model. Nor is any psychiatric or degenerative
diagnosis: an orbitofrontal lesion reading as disinhibition is a statement about
the circuit, not about frontotemporal dementia or about anybody's behaviour.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `handedness` | `right` only | Which hemisphere every `dominant` side resolves to. Any other value is **refused** |
| `lesions` | one of the declared sites in `LESION_SITES` | Which structures are gone and which connections are cut |
| `extent` | 0–1 | How far the lesion has been taken. An input, never a prediction |

## 5. Outputs

- An integrity for every node and connection
- For each task: how far its best route carries, its status (intact / impaired /
  lost), the step it stopped at, and the whole route in order
- The syndromes the surviving pattern spells
- The structures the lesion touched, by atlas label and side

## 6. State variables

None. `solveHigherBrainFunction()` is a pure function of handedness, lesions and
extent. There is no integration and no time.

## 7. Governing relations

```text
node integrity       = 1 − mean(damage over its structures)        (composite)
                     = best side's integrity                       (paired)
route transmission   = ∏ integrity over the distinct nodes and connections on it
task transmission    = max over the task's declared routes
status               = intact ≥ 0.85 > impaired ≥ 0.25 > lost
```

*Distinct*, because a closed loop passes its first node twice and counting one
structure twice would make a cortical lesion weigh double for no reason anybody
could defend.

A product and not an average, because a route is a chain: a step that carries
nothing leaves nothing for the rest of the route to carry.

**Nothing searches the network for an alternative route.** Where an alternative
is real it is declared — printed words reach the dominant hemisphere either
directly or across the corpus callosum, and that is the only such place.

## 8. Constants and calibration

Three things were chosen and none is a measurement.

The **product rule** is invented arithmetic: no source gives a transmission for
a cortical route. The **two thresholds** are cut points on a dimensionless
scale, chosen so that a half-taken lesion reads as impaired and a complete one
as lost. The **shares** on a few lesion sites — how much of a large structure a
site takes — are chosen so a site can say "the white matter under the
supramarginal gyrus" without claiming a hemisphere.

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
- **The run repeats as an examination**: the task is asked at the end it enters
  by, carried, and either answered or not. **The order is the claim and the
  seconds are a rhythm** — nothing in this model is a latency, a conduction time
  or a reaction time, and the sequence says so on screen. The answer at the far
  end is the task's own status: full, faint, or absent.
- **A tract the route runs inside is drawn in front of the cortex**, in its own
  place. Cutting the arcuate fasciculus is this model's signature claim and the
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
the surface that shows it. See `src/app/anatomyFunctionLink.js` and
`docs/follow-ups.md` F-166.

## 9.6 The fifteen-second sequence

One subject: a word asked twice, either side of a single cut bundle. It opens on
an intact brain, the arcuate fasciculus is taken over two seconds, and the same
word is asked again — it arrives, it is understood, and it stops on the way out,
while comprehension and fluency do not move. The name comes last.

It is chosen because it is the one finding here a still picture cannot carry.
Every row the overlay prints is read from the scene's own read-out each frame,
and the scene is driven by absolute sequence time (`renderAtSeconds`), so the
same second renders identically on any machine and at any frame rate.

## 10. Known failure modes

- **The atlas has no splenium**: the corpus callosum is one mesh, so a posterior
  callosal lesion is drawn as the whole commissure.
- **The atlas has no somatotopy**: the precentral gyrus is one mesh, so a lesion
  there takes the mouth and the hand together.
- **Reading and visual naming share one visual route**, so the model cannot show
  pure alexia sparing object naming — a real and well-described dissociation.
- **Transcortical motor aphasia keeps naming here**, where in a person naming is
  variably impaired.
- **No declared site produces an isolated naming failure**, so the anomic
  aphasia the classifier can read is not reachable from any of them: every step
  of naming is shared with another task. A test holds that, so the sentence
  cannot quietly stop being true.
- **The three prefrontal pictures come apart more cleanly here than in a
  person.** The circuits are anatomically separate; the syndromes named after
  them overlap heavily, and real lesions rarely respect one circuit.
- **The middle frontal gyrus is one mesh**, so the premotor cortex a praxis
  route uses and the dorsolateral prefrontal cortex an executive circuit starts
  from are the same structure here: a lesion of one takes the other.
- **The Gerstmann tetrad is drawn from one gyrus** because that is the classical
  account; later work has repeatedly questioned it. It is the model's least
  secure claim, and the evidence dossier marks it `uncertain`.
- The tract meshes this scene draws have **never been reviewed by an anatomist**
  and have never been rendered for visual review in this repository.

## 11. Where it will mislead

**A lesion drawn on this brain reads as a lesion seen on a scan.** It is neither
an image nor a segmentation of one. Whole named structures of one normal
specimen, coloured.

**Naming failing reads as aphasia.** When the lesion is at the visual end, the
name was never reached. The model reads *where* a route broke before it calls
anything anomic, and reports the reading failure instead — but a reader watching
only the naming row will not see that distinction unless they look at the route.

**Three named steps read as a severity scale.** Intact / impaired / lost are
three steps on an ordering, and the lines between them were drawn, not found.

**A syndrome name reads as a diagnosis.** It is a reading of which routes
survived in this model. It says nothing about any person, and diagnosis,
treatment selection, dose selection, prognosis and procedure planning are all
prohibited uses.
