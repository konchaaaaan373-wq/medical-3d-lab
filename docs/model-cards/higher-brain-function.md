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
either hand, attending to either side of space, laying down a memory — is
declared as the structures it passes through, in order, with the connection
between each pair anchored in the mesh that connection runs inside.

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

**Executive function, behaviour and social cognition are deliberately absent.**
This model localises by route, and those are not localised that way. Putting
them on one gyrus to make the coverage look complete would be teaching something
false.

## 4. Inputs

| Input | Range | Meaning |
| --- | --- | --- |
| `handedness` | `right` only | Which hemisphere every `dominant` side resolves to. Any other value is **refused** |
| `lesions` | none, or one of eleven declared sites | Which structures are gone and which connections are cut |
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
route transmission   = ∏ integrity over every node and connection on it
task transmission    = max over the task's declared routes
status               = intact ≥ 0.85 > impaired ≥ 0.25 > lost
```

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
- The route is drawn in front of the brain rather than inside it, because most
  of it runs through white matter a reader cannot see from outside.
- Nothing moves, resizes or deforms any anatomy. A lesion is a colour, not a
  hole.

## 10. Known failure modes

- **The atlas has no splenium**: the corpus callosum is one mesh, so a posterior
  callosal lesion is drawn as the whole commissure.
- **The atlas has no somatotopy**: the precentral gyrus is one mesh, so a lesion
  there takes the mouth and the hand together.
- **Reading and visual naming share one visual route**, so the model cannot show
  pure alexia sparing object naming — a real and well-described dissociation.
- **Transcortical motor aphasia keeps naming here**, where in a person naming is
  variably impaired.
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
