# Evidence — higher cortical function as routes through named anatomy

Model: [`src/models/higherBrainFunction.js`](../../src/models/higherBrainFunction.js).
Boundary and failure modes: [`../model-cards/higher-brain-function.md`](../model-cards/higher-brain-function.md).
Machine-readable registry: `HIGHER_BRAIN_FUNCTION_EVIDENCE` in
[`src/models/evidence.js`](../../src/models/evidence.js) — the ids below are the
ids there, and `tests/evidence.test.js` fails if the two drift apart.

This dossier supports a **route** account of the higher cortical functions: each
clinical task is declared as the named structures it passes through, and which
tasks a lesion leaves carrying is solved from those routes. **Nothing here is a
measurement, an imaging study, or anybody's lesion**, and no row rests on a
paper this repository could open: the build environment cannot reach the medical
publishers, so every source below is a textbook-level description this
repository is restating, not a citation it has checked.

The claims are all **dissociations** — which task survives when another does
not — because that is what this model is entitled to say. It computes whether a
route carries. It does not compute how much of anything.

---

## 1. What the model asserts

| Claim | Source | Implementation | Assumption | Validation |
| --- | --- | --- | --- | --- |
| `repetition-has-a-route-of-its-own` — repetition can fail while comprehension and fluency do not | The classical connectionist account of the aphasias (Wernicke, Lichtheim, Geschwind) as given in standard texts | Repetition's route is the only one using the dorsal connection; it does not pass through the lexical store, and nothing searches for a way round | That repeating a word does not require understanding it | `physiology: repetition can fail while comprehension and fluency do not` |
| `anterior-and-posterior-dissociate` — a frontal lesion takes fluency with comprehension spared, a posterior temporal one the reverse | Standard clinical descriptions of Broca and Wernicke aphasia | Output planning and phonological analysis are separate nodes, and the fluency task uses only the output chain | That fluency is a property of the output machinery and not of having something to say | `physiology: an anterior lesion takes fluency and a posterior one takes comprehension` |
| `outside-the-perisylvian-zone-repetition-survives` — the transcortical pattern | Standard descriptions of the transcortical aphasias and their watershed territories | Initiation and meaning are nodes off the repetition route, so a lesion of either leaves it carrying | That the watershed lesions spare the perisylvian cortex | `physiology: a lesion outside the perisylvian zone leaves repetition intact` |
| `language-is-left-in-the-right-handed` — language and praxis on the left in a right-hander | Standard accounts of hemispheric dominance (roughly nineteen in twenty) | `dominanceFor('right')`, and every side in the network written relative to it | The representative case. Left-handedness is **refused**, not mirrored | `physiology: language and praxis sit in one hemisphere in a right-handed brain` |
| `spatial-attention-is-not-in-the-language-hemisphere` — neglect follows the other parietal lobe | Standard clinical descriptions of hemispatial neglect | Attention to the left has one route, through the non-dominant parietal; attention to the right has two | That the non-dominant hemisphere attends to both halves of space | `physiology: spatial attention is not in the language hemisphere, so one parietal lobe is not the mirror of the other` |
| `a-new-memory-needs-one-medial-temporal-lobe` — unilateral damage is not amnesia | Standard accounts of the amnesic syndrome and the Papez circuit | The memory nodes are `paired`: integrity is the better side | That one side suffices | `physiology: a new memory needs a medial temporal lobe on one side or the other` |
| `reading-and-writing-dissociate` — reading lost with writing intact, when the visual route is cut | Déjerine's account of alexia without agraphia, as given in standard texts | Reading enters through vision; writing does not. Both pass through the angular gyrus, so a lesion there takes them together | That reading requires visual access to the language hemisphere | `physiology: reading needs the visual route into language and writing does not` |
| `the-callosum-carries-the-other-hand` — one hand apraxic, the other not | Standard descriptions of callosal disconnection and sympathetic apraxia | The left hand's route crosses the callosum; the right hand's does not | That praxis formulas are in the dominant hemisphere only | `physiology: the callosum carries the left hand, so cutting it spares the right` |
| `naming-needs-the-word-form` — naming fails where the word's sound form is cut off, not only at the frontal end | The Wernicke–Lichtheim account of word production, and the naming failure described in both Wernicke and conduction aphasia | Naming routes through the posterior phonological store and the dorsal connection out of it, not straight from meaning to the frontal cortex | That a word's form is retrieved before it is planned | `physiology: naming needs the word’s sound form, so it fails wherever that is cut off` |
| `aphasia-is-supramodal` — a deficit confined to one modality is not an aphasia | The standard definition of aphasia as supramodal, and the descriptions of pure word deafness and of apraxia of speech after dominant insular damage | The way in from hearing and the way out through the mouth are nodes *outside* the language chain, so a lesion of either leaves reading and writing carrying. The classifier refuses to name an aphasia in that case | That the same language is reached through every modality, so any one of them can be lost on its own | `physiology: aphasia is supramodal, which is what tells it from its mimics` |
| `the-repetition-question-separates-output-from-language` — the bedside discriminator on the output side | The standard bedside classification, in which repetition separates transcortical from perisylvian and writing separates aphasia from apraxia of speech | A picture with fluency gone is read as a speech-output disorder only when repetition is gone with it and writing is not; transcortical motor aphasia keeps repetition and is named an aphasia | That a preserved repetition proves the output channel itself is intact | `physiology: aphasia is supramodal, which is what tells it from its mimics` |
| `writing-fails-with-the-language` — agraphia accompanies the perisylvian aphasias | The clinical observation that the aphasias are accompanied by agraphia, and the phonological route of the dual-route accounts of writing | Writing passes through the lexical store, the phonological analysis and the phonological output nodes before reaching the hand, rather than going from meaning to the letters | That written production is reached through the same word forms as spoken production | `physiology: writing fails with the language, not with the hand` |
| `the-perisylvian-zone-is-an-island` — both watersheds gone, and repetition survives | The standard description of mixed transcortical aphasia and the border-zone territories | The two watershed sites name only structures outside the perisylvian chain, so losing both leaves the repetition route whole | That the border zones surround the perisylvian cortex without entering it | `physiology: losing both watersheds at once spares repetition and nothing else` |
| `frontal-subcortical-circuits-share-a-signature` — a lesion anywhere along a frontal circuit reads like a lesion of its cortex | The circuits as described by Alexander, DeLong and Strick; the clinical literature on caudate and thalamic infarcts | Three closed loops, cortex → striatum → pallidum → mediodorsal thalamus → the same cortex, each carrying one behaviour | That the loops are functionally segregated where they pass through shared structures | `physiology: a frontal–subcortical circuit reads the same wherever it is cut` |
| `three-prefrontal-patterns` — dorsolateral, orbitofrontal and medial damage take different things | The standard description of the three prefrontal syndromes | Three cortical nodes, three tasks, one shared pallidum and thalamus | That each circuit's behaviour can be probed on its own | `physiology: the three prefrontal patterns come apart` |

## 2. What this repository chose

| Id | What it is | Why it is not a measurement |
| --- | --- | --- |
| `transmission-is-a-product-of-steps` | How well a task gets through: the product of every step's integrity, best route wins | **Illustrative.** No source gives a transmission for a cortical route. The product was chosen because a chain is no better than its worst link; the model claims the ordering it produces, never the value |
| `the-three-step-thresholds` | Where intact becomes impaired, and impaired becomes lost | **Calibration.** Two cut points on a dimensionless scale, chosen so a half-taken lesion reads as impaired and a complete one as lost. No output of this model is a score or a test result |
| `one-mesh-per-named-structure` | A lesion is named structures of the atlas, whole or as a stated share of one | **Approximation of the substrate.** The atlas's corpus callosum has no splenium and its precentral gyrus has no somatotopy, so those lesions are drawn coarser than they are |

## 3. What this scene is known to mislead about

| Id | The direction | What follows |
| --- | --- | --- |
| `the-prefrontal-patterns-are-not-this-separate-in-people` | Three clean patterns read as three syndromes a person arrives with | **Uncertain.** The circuits are anatomically distinct; the syndromes named after them overlap heavily. Real lesions rarely respect one circuit, and apathy, disinhibition and dysexecutive features commonly appear together. The circuits are the claim; the tidiness is not |
| `the-gerstmann-cluster-is-not-settled` | Four deficits from one gyrus reads as a settled localisation | **Uncertain, and the model's weakest claim.** The tetrad rarely occurs in isolation and may reflect underlying white matter rather than one cortical area. It is drawn from the angular gyrus because that is the classical account |
| `a-thalamic-lesion-can-produce-an-aphasia` | A route drawn through the thalamus reads as the settled mechanism of thalamic aphasia | **Uncertain.** The dissociation — naming gone, repetition kept — is what is described; *why* is not agreed, and gating, a lexical role for the thalamus and cortical diaschisis are all proposed. The model draws one of them because a route model has to draw something. Thalamic aphasia also commonly recovers, and nothing here shows time |
| `one-mesh-per-named-structure` | A lesion of the whole callosum reads as what a posterior callosal lesion does | The atlas has no splenium. Reading and visual naming also share one visual route here, so **pure alexia sparing object naming cannot appear** |
| `transmission-is-a-product-of-steps` | Two lesions adding up to a failure reads as a count of points | It is a statement about routes. Nothing here is additive in any clinical quantity |
| `the-three-step-thresholds` | Three named steps read as a severity scale | Three steps on an ordering, and the line between them was drawn rather than found |

## 4. What is outside the model entirely

- **Every quality of speech**: paraphasia, agrammatism, prosody, dysarthria,
  perseveration. The model says whether a route carries, not what comes out.
- **Every course over time**: oedema, penumbra, diaschisis, recovery,
  rehabilitation. Lesion extent is an input on a slider.
- **Everything behavioural the circuits do not carry.** Executive function is
  here as the frontal–subcortical circuits, because those *are* routes: mood,
  personality, insight, social cognition and anything a scale would score are
  not, and are outside the model.
- **Anybody's brain.** One normal specimen, whole named structures, no imaging.
  It is not a lesion localiser and must not be used as one.
