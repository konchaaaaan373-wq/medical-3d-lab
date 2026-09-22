# Evidence — higher cortical function as routes through named anatomy

Model: [`src/models/higherBrainFunction.js`](../../src/models/higherBrainFunction.js).
Reference layer: [`src/data/aphasiaReference.js`](../../src/data/aphasiaReference.js).
Boundary and failure modes: [`../model-cards/higher-brain-function.md`](../model-cards/higher-brain-function.md).
Machine-readable registry: `HIGHER_BRAIN_FUNCTION_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a **route availability** account: each task is declared as
the named structures it passes through, and which routes still reach is solved
from those declarations. **The model produces no syndrome name and rules none
out** — §5 says why, and the classical syndromes live in the reference layer.

## 0. How far each source was actually checked

This matters enough to come first, because the honest answer is uncomfortable.

**No full text was read for any row below.** Every publisher domain this
repository tried — `pubmed.ncbi.nlm.nih.gov`, `www.neurology.org`,
`www.cell.com` — is refused by the build environment's network egress policy.
What was available was web search returning bibliographic records and
abstract-level summaries, and that is what the rows marked `abstract-only`
rest on.

So each registry entry carries a `sourceVerification`, one of:

| Value | What it means here |
| --- | --- |
| `abstract-only` | Author, year, journal, volume, pages and identifier matched against a bibliographic record, and the abstract's findings read. **Tables, figures and methods were not seen.** |
| `textbook-account` | A textbook-level description this repository is restating. No primary source was retrieved. |
| `repository-decision` | A choice made here. There is no source to verify. |
| `full-text` | **Not used by this dossier.** Nothing here qualifies. |

Consequences that follow from that and are not hidden anywhere else:

- Where a row says a study "found" something, it is the abstract's own summary.
- Sample sizes, phases (acute or chronic), imaging modality and task details
  are reported only where the abstract stated them.
- `doesNotEstablish` on each registry entry is where the limits of the row
  live, and several of them exist precisely because the full text is unread.
- **A clinician has not reviewed any of this.** The model card's clinical
  review state is `pending` and this work does not change it.

## 1. What the model asserts

| Claim | Source (verification) | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `two-writing-routes` — spelling has a lexical and a phonological route, and they dissociate | Roeltgen, Sevush & Heilman, Neurology 1983;33:755; Roeltgen & Heilman, Brain 1984;107:811; Rapcsak et al., Neuropsychologia 2007 (`abstract-only`) | Two processes on two separate atlas meshes — whole-word spelling on the dominant angular gyrus, phoneme-to-grapheme conversion on the dominant supramarginal gyrus — and route eligibility by stimulus so a nonword may not take the lexical one | That a nonword has no lexical entry to be spelled from | `physiology: the two writing routes come apart, and a nonword may not take the lexical one` |
| `writing-is-not-downstream-of-speaking` — spelling does not need the spoken output planner | The same two series, and the standard description of apraxia of speech (`abstract-only`) | Neither writing route passes through `phonological-output` or `speech-motor` | That written and spoken production share word forms but not the output stage | `physiology: writing from meaning does not depend on speaking` |
| `letters-and-objects-dissociate` — a letter-form process can go while object form does not | Gaillard et al., Neuron 2006 (`abstract-only`) | Two declared processes, `orthographic-visual-form` and `object-visual-form`, on separate route steps | That the visual form of words is a separable process | `physiology: letters and objects come apart when the processes do` |
| `repetition-has-two-routes` — a known word can be repeated round through meaning; a nonword cannot | Standard dual-route account; the stimulus effect described in conduction aphasia (`textbook-account`) | Two routes for `repetition-word`, one of them declared for known words only; `repetition-nonword` declares the same pair and is eligible for one | That repeating a familiar word can use its lexical entry | `physiology: a known word can be repeated round through meaning, and a nonword cannot` |
| `anterior-and-posterior-dissociate` — front takes the output routes, back takes the way in | Standard clinical descriptions (`textbook-account`) | Separate nodes for phonological analysis and output planning; the comprehension route uses only the first | That the way in and the way out are separable stages | `physiology: an anterior lesion takes the output routes and a posterior one takes comprehension` |
| `outside-the-perisylvian-zone-repetition-survives` — the transcortical pattern | Standard clinical descriptions (`textbook-account`) | Initiation and meaning are off the repetition routes | That the border-zone structures spare the perisylvian cortex | `physiology: a lesion outside the perisylvian zone leaves the repetition route reaching` |
| `the-way-in-from-hearing-is-separable` — the auditory way in can go alone | Maffei et al., Cortex 2017;97:240 (`abstract-only`) | `auditory-input` is on the comprehension, repetition and dictation routes and on nothing else | That the same language is reached through more than one sense | `physiology: the way in from hearing is separate from the way out and from meaning` |
| `the-thalamus-is-not-an-obligatory-gate` — word production does not pass through a thalamic gate | Zhang et al., Neurobiology of Language 2026;7 (n=550, chronic phase); Rangus et al., Communications Biology 2024;7:700 (`abstract-only`) | No thalamic node on any language route; the preset declares an uncomputed influence instead, carried on every language task it names | That a route model may decline to put a number on a contribution it cannot localise | `physiology: the thalamus is not an obligatory gate, and its absence is not "no effect"` |
| `the-insula-is-not-the-necessary-centre-for-speech-output` | Hillis et al., Brain 2004;127:1479; Dronkers, Nature 1996;384:159 (`abstract-only`) | The whole insular mesh is on `speech-motor` with the posterior inferior frontal gyrus, and the preset declares that it is not the restricted anterior region | That this model cannot adjudicate a question about speech quality, having none | `physiology: the insula preset affects the spoken route and claims nothing about speech quality` |
| `the-gerstmann-tetrad-is-not-produced` | Rusconi et al., Annals of Neurology 2009;66:654 (`abstract-only`) | `calculation-and-body-schema` is declared `modelled: false` with no routes, so it reports `not_modeled` and can enter no comparison | That four deficits not separately implemented may not be generated as a set | `physiology: the angular gyrus does not produce a tetrad` |
| `language-is-left-in-the-representative-right-hander` | Standard accounts; Knecht et al., Brain 2000 for the non-identity of handedness and dominance (`textbook-account`) | `dominanceFor('right')`, and every side written relative to it. Any other value is **refused** | The representative case, stated as an assumption of the teaching model | `physiology: language and praxis sit in one hemisphere in a right-handed brain` |
| `spatial-attention-is-not-in-the-language-hemisphere` | Standard clinical descriptions (`textbook-account`) | Attention to the left has one route through the non-dominant parietal; attention to the right has two | That the non-dominant hemisphere attends to both halves of space | `physiology: spatial attention is not in the language hemisphere` |
| `a-new-memory-needs-one-medial-temporal-lobe` | Standard accounts of the amnesic syndrome (`textbook-account`) | The memory nodes are `paired`: integrity is the better side | That one side suffices | `physiology: a new memory needs a medial temporal lobe on one side or the other` |
| `the-callosum-carries-the-other-hand` | Standard descriptions of callosal disconnection (`textbook-account`) | The left hand's route crosses the callosum; the right hand's does not | That praxis formulas are in the dominant hemisphere only | `physiology: the callosum carries the left hand, so cutting it spares the right` |
| `frontal-subcortical-circuits-share-a-signature` | Alexander, DeLong and Strick, and the clinical literature on caudate and thalamic infarcts (`textbook-account`) | Three closed loops, cortex → striatum → pallidum → mediodorsal thalamus → the same cortex | That the loops are functionally segregated where they pass through shared structures | `physiology: a frontal–subcortical circuit reads the same wherever it is cut` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `the-model-does-not-classify` | Route availability per task, and no syndrome name | **A decision.** A first-match chain over four route values was returning a clinical category; the features that separate the aphasias are not computed here at all |
| `availability-is-a-product-of-steps` | The product of every distinct step's integrity, best eligible route wins | **Illustrative.** No source gives an availability for a cortical route. The model claims the ordering it produces, never the value |
| `eligibility-is-by-stimulus` | `max()` over the routes a task may use for the stimulus it was probed with | **A property of this model.** It is what makes the writing routes dissociate; which route a person would use is not predicted |
| `the-two-band-cut-points` | Where high becomes intermediate, and intermediate becomes low | **Calibration.** Two cut points on a dimensionless scale. `low` is a band, not an abolished function |
| `a-connection-has-a-side` | A connection's integrity comes from the structures it runs within, on its own side | **A property of this model**, replacing an id-keyed damage channel that had no side |
| `one-mesh-per-named-structure` | A lesion is named structures, whole or as a stated share | **Approximation of the substrate.** No somatotopy in the precentral gyrus; no anterior subdivision of the insula |
| `the-atlas-has-no-splenium` | One undivided corpus callosum | **Approximation of the substrate.** No preset here is a posterior callosal lesion, and the one that used to imply it now takes the whole commissure and says so |
| `the-atlas-cannot-separate-letters-from-objects` | Two processes on one occipitotemporal mesh | **Approximation of the substrate**, reported on the result of both tasks rather than worked around |
| `hearing-itself-is-not-modelled` | No audiometry, no non-speech sounds | **A limit of the task set**, stated on the comprehension task, so that affected auditory tasks cannot be read as pure word deafness |
| `a-watershed-preset-is-not-a-perfusion-territory` | A set of structures chosen for teaching | **A decision.** No blood flow, no vascular territory, no individual variation |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `the-writing-route-localisation-is-not-settled` | Two spelling routes on two gyri reads as a settled localisation | **Uncertain, and the weakest claim in the revision.** The functional dissociation is supported; pinning each route to one gyrus rests on four patients per group on CT in 1984, and the meshes here are whole gyri |
| `the-prefrontal-patterns-are-not-this-separate-in-people` | Three clean patterns read as three syndromes a person arrives with | **Uncertain.** Real lesions rarely respect one circuit, and apathy, disinhibition and dysexecutive features commonly appear together |
| `one-mesh-per-named-structure` | A whole-gyrus lesion reads as the restricted lesion being taught | The insula, the precentral gyrus and the corpus callosum are each one mesh. Every preset whose meaning depends on a finer division carries the limit in its own declaration |
| `availability-is-a-product-of-steps` | Two lesions adding up reads as a count of points | It is a statement about routes. Nothing here is additive in any clinical quantity |
| `the-two-band-cut-points` | Three bands read as a severity scale | Three bands on an ordering, and the lines between them were drawn rather than found |

## 4. What is outside the model entirely

- **Every quality of speech**: paraphasia, agrammatism, prosody, dysarthria,
  perseveration, rate, phrase length, effort. `connected-speech-fluency` is
  declared and reports `not_modeled`.
- **Reading aloud.** The orthography-to-phonology route is not declared, so
  `reading-aloud` reports `not_modeled` and a low reading-comprehension value
  says nothing about it.
- **Calculation, finger knowledge and left–right orientation**, individually or
  as a set.
- **Every course over time**: oedema, penumbra, diaschisis, recovery,
  rehabilitation. Lesion extent is an input on a slider.
- **Hearing, and non-speech sound recognition.**
- **Which script.** No kanji/kana and no regular/irregular distinction. The
  nonword tasks are abstract: they show the *routes* coming apart, and predict
  nothing about a particular word in a particular language.
- **Anybody's brain.** One normal specimen, whole named structures, no imaging.
  It is not a lesion localiser and must not be used as one.

## 5. Why there is no classifier

The previous version ran the solved tasks through a chain of conditions —
comprehension, then repetition, then fluency, first match wins — and printed
the syndrome it landed on, plus a verdict of "not aphasia" for two patterns it
had rules to exclude.

Three things were wrong with it:

1. **A first-match chain is a diagnosis.** The answer depended on the order the
   conditions happened to be written in, and nothing on screen said so.
2. **The discriminating features are not computed.** Paraphasia, agrammatism,
   effort, phrase length and the stimulus a task was probed with are all absent.
   The chain was using the self-initiation route as a stand-in for clinical
   fluency, which is a different thing with a similar name.
3. **"Not aphasia" is the stronger claim.** Ruling a language disorder out needs
   the modalities this model does not test and an examination it does not do.

What replaced it: `src/data/aphasiaReference.js`, which describes each classical
syndrome as *relative* sparing and variable features, lists what this model
cannot evaluate about it, and cannot be imported by the model. Two tests hold
that — `model: nothing in the model layer classifies, and nothing in it names a
syndrome` and `model: the reference layer is reference, and the solver cannot
see it`.

## 6. The eleven presets, re-audited

Recomputed from the code before and after the revision, not copied from the
previous write-up. `HI` = top band, `md` = middle, `lo` = bottom, `--` =
`not_modeled`, `??` = `indeterminate`. The before column uses the old labels
（保たれる／低下／消失 → `HI`/`md`/`lo`）and the old task set, so the columns are
only comparable where the task means the same thing.

| Preset | Before | After | Why it changed |
| --- | --- | --- | --- |
| `dominant-inferior-frontal` | comp HI, rep lo, flu lo, nam lo, **wri lo**, rea HI → "Broca aphasia" | comp HI, rep-word lo, rep-nonword lo, init lo, nam lo, rea HI, **wri HI** | Writing no longer runs through the oral output planner, so it is not abolished here. The name is gone. Writing carries a coverage limitation saying the agraphia of this picture is *not* produced |
| `dominant-posterior-superior-temporal` | comp lo, rep lo, flu HI, nam lo, wri lo, rea HI → "Wernicke aphasia" | comp lo, rep lo, init HI, nam lo, rea HI, dictation lo, **wri-from-meaning HI** | Dictation needs the ear and goes; writing from meaning does not. Reading survives on a ventral route the preset does not touch, and that is reported as a statement about the route |
| `dominant-arcuate` | comp HI, **rep lo**, flu HI, nam lo, wri lo, rea HI → "conduction aphasia" + "ideomotor apraxia" | comp HI, **rep-word md**, **rep-nonword lo**, nam lo, rea HI, wri-from-meaning HI, **dictation-nonword lo** | The dual repetition route. A known word has a way round through meaning and a nonword has none — the stimulus effect the descriptions report. Writing dissociates the same way |
| `dominant-perisylvian` | comp lo, rep lo, flu lo, nam lo, wri lo, rea HI → "global aphasia" | comp lo, rep lo, init lo, nam lo, dictation lo, rea HI, wri-from-meaning HI | Same numbers where the tasks match. No label, and the surviving reading route is explained rather than overwritten. The preset now declares that it cannot take the articulators without the hand |
| `dominant-anterior-watershed` | comp HI, rep HI, flu lo, nam HI, wri HI, rea HI → "transcortical motor aphasia" + "abulia" | comp HI, rep HI, **init lo**, nam HI, wri HI, rea HI | The row is the self-initiation *route* now, not "fluency". Naming stays available, which the reference layer flags as an artefact of the routes rather than a claim |
| `dominant-posterior-watershed` | comp md, rep HI, flu HI, nam md, **wri lo**, rea lo → "transcortical sensory aphasia" + **"Gerstmann syndrome"** | comp md, rep HI, nam md, rea md, **wri-from-meaning lo**, dictation HI | The Gerstmann reading is gone with the classifier and the tetrad task. Writing splits: the lexical route goes with the angular gyrus and the phonological route does not |
| `dominant-watershed-both` | comp md, rep HI, flu lo, nam md, wri lo, rea lo → "mixed transcortical" + "Gerstmann" + "abulia" | comp md, rep HI, init lo, nam md, rea md, wri-from-meaning lo | As above. The preset declares that losing both border zones is not the only lesion pattern the syndrome is reported with |
| `bilateral-auditory-cortex` | comp lo, rep lo, flu HI, nam HI, wri HI, rea HI → **"pure word deafness"** | comp lo, rep lo, **dictation lo**, nam HI, rea HI, wri-from-meaning HI | The name is gone — this model has no audiometry and no non-speech sounds, so it cannot separate that from cortical deafness, and the comprehension task says so. Dictation now correctly needs the ear |
| `dominant-insula` | comp HI, rep md, flu md, nam md, wri HI, rea HI → **"speech-output disorder (not aphasia)"** | comp HI, rep md, init md, nam md, wri HI, rea HI | Same numbers. The verdict "not aphasia" is gone: it was the strongest claim the model made and the one it was least entitled to. The preset declares that the mesh is the whole insula |
| `dominant-thalamus` | comp HI, rep HI, flu HI, **nam lo** → **"anomic aphasia"** | **everything HI, with an uncomputed influence flagged on six language tasks** | The obligatory serial gate is removed. The chronic-phase series finds no independent thalamic contribution to naming; the lesion-mapping study implicates a nucleus this atlas lacks and associates it with verbal-fluency tasks. The influence is declared, not zeroed and not silent |
| `dominant-occipital-and-callosum` → `dominant-occipital-and-whole-callosum` | nam lo, rea lo → "alexia without agraphia" | nam lo, rea lo, wri HI | Numbers similar; the honesty changed. The preset took an invented 40% share of an undivided commissure, which read as a splenial lesion. It takes the whole callosum and says in its own label that the splenium cannot be selected. Letters and objects share a mesh, so the object-naming sparing that defines pure alexia **cannot** be shown here, and both tasks carry that limit |

Two presets outside the eleven also changed and are recorded for completeness:

- `thalamocortical-disconnection` → **`dominant-anterior-thalamic-radiation`**.
  It was declared bilaterally *and* cut three connections by id, so it zeroed
  all three frontal circuits on both sides. It is one side now, and the circuits
  come out partly down rather than abolished.
- `bifrontal-dorsolateral` no longer takes writing. Writing used to run through
  the dominant premotor cortex (middle frontal gyrus); the language part of
  writing does not, and the pen is its own stage.

## 7. The revision log, by issue

| ID | Issue | Where it was | Disposition |
| --- | --- | --- | --- |
| APH-01 | Task names did not match the process measured | `FUNCTION_TASKS` | **Fixed.** Every task declares input, output, stimulus and `excludes`; "fluency" is the self-initiation route, "reading" is written-word comprehension, "writing" is three tasks |
| APH-02 | Automatic "not aphasia" exclusion | `classifySyndromes` | **Removed with the function** |
| APH-03 | First-match classical classification | `classifySyndromes` | **Removed.** Reference layer in `src/data/aphasiaReference.js` |
| APH-04 | Writing had one phonological/oral route | `FUNCTION_TASKS.writing` | **Fixed.** Lexical and phonological routes on separate meshes, plus a separate pen stage and a declared buffer |
| APH-05 | Reading and object naming shared one obligatory node | `ventral-visual-form` | **Split** into two processes. The atlas limit is declared and reported, and the dissociation is operable in conceptual mode |
| APH-06 | Obligatory serial thalamic gate | `thalamic-language-gating` | **Removed.** `MODULATORY_NETWORKS` plus per-task uncomputed influence |
| APH-07 | Bilateral Heschl → "pure word deafness" | classifier | **Removed.** The task declares that hearing is not modelled |
| APH-08 | Insula → "apraxia of speech" | classifier | **Removed.** The preset declares the mesh and the model declares it has no speech quality |
| APH-09 | Connections had no side | `connectionDamage` keyed by id | **Fixed.** Integrity comes from the structures a connection runs within, on its side; the id channel now throws |
| APH-10 | Splenium and hand/mouth motor stand-ins | presets | **Declared.** `granularityLimit` on the presets that need it; the callosum preset takes the whole commissure; the pen is not called the hand area |
| APH-11 | Watershed presets fixed to syndromes and severities | presets + classifier | **Fixed.** No labels; each declares that it is a set of structures, not a perfusion territory |
| APH-12 | Gerstmann tetrad forced from the angular gyrus | `calculation-and-body-schema` + classifier | **Fixed.** Declared `modelled: false` |
| APH-13 | "Cannot compute", "not implemented" and "blocked" conflated | `statusFor` | **Fixed.** Three computation states, `declaredBlock` separate from the bottom band, and `resolveTaskResult` holds the conservative rules |
| APH-14 | Functional routes conflated with real tracts | `FUNCTION_EDGES` | **Partly fixed.** Every connection declares `mapping` (`atlas-structure` / `coarse-educational` / `conceptual`); the 3D legend work is in `docs/follow-ups.md` F-188 |
| APH-15 | Result, legend, dossier and release state inconsistent | across | **Fixed for the model, the read-out and these documents.** The scene's 3D legend distinction is F-188 |

## 8. Sources consulted and not used

- **Striatocapsular aphasia.** Not implemented. In this model it would produce
  "output affected, comprehension kept", which is what the insular preset
  produces, and the contributions that distinguish it — cortical hypoperfusion,
  lesion extent, time course — are outside the model. Hillis et al. (2002,
  2004) on subcortical aphasia and cortical hypoperfusion were identified as
  the relevant sources and **not retrieved**; no claim rests on them.
- **Kasselimis et al. (2017)** on the gap between clinical taxonomy and
  research was identified as relevant to §5 and not retrieved. §5 rests on the
  design argument above, not on it.
- **Saur et al. (2008)** and **Kümmerer et al. (2013)** on dorsal and ventral
  language pathways were identified and not retrieved. The dorsal/ventral
  structure of this model predates the revision and is not attributed to them.
- **Boatman et al. (2000)**, **Freedman et al. (1984)**, **Buchsbaum et al.
  (2011)**, **Itabashi et al. (2016)**, **Moser et al. (2016)**, **Woolnough et
  al. (2019)**, **Tomaiuolo et al. (2021)**, **Leff et al. (2001)**, **Sakurai
  et al. (2000)**, **Casilio et al. (2024)**, **Narayanan et al. (2017)**,
  **Stockert et al. (2025)**: identified as candidates, **not retrieved**.
  Where the topic they cover appears above, it is carried by a
  `textbook-account` row or by an explicit `doesNotEstablish`.
