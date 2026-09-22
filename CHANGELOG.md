# Changelog

What changed, for somebody who uses the product rather than reads the
repository. Newest first, one section per released tag.

**A change to a medical model is never a patch release.** Where a claim
changed, the entry says which model, what changed, and whether it had been
clinically reviewed. The procedure is in
[`docs/release-runbook.md`](docs/release-runbook.md).

## Unreleased

Not yet tagged. Gate 0 and most of Gate 1 are complete; the remaining blockers
are branch protection on `main`, and the parts of device testing that need a
person: Safari, Firefox, touch and a screen reader.

### A disease sequence can now be taken away as a video file

- **The 15-second sequence saves as a video.** On every scene that has one —
  COPD, asthma, heart failure, portal hypertension, hepatorenal syndrome and
  higher cortical function — the sequence's controls now carry a download. The
  file is made in the browser from the frames your own machine drew; nothing is
  uploaded, and there is no audio.
- **The captions are in the picture, not over it.** The recording composites
  the model and the sequence's own captions and figures, and adds a footer to
  every frame naming the model and the sentence that bounds it — the same
  disclaimer the console shows. A video of a disease model with its caveats
  left behind is the one thing this product will not hand out.
- **It asks first, every time.** The terms are assembled from the model's own
  record: what it is, what it may not be used for, that the burnt-in caption
  stays in view, and any credit the geometry's licence asks for — which is why
  the brain's sequence asks for one thing more than the lung's, without anybody
  writing it a screen. Nothing is
  stored and nothing is remembered — a second file from a second model is a
  second agreement, because the two models forbid different things.
- **Anatomy is not affected.** An atlas makes no mechanism claim and has no
  motion to export, so the published models offer no download at all.
- **Leaving the sequence now actually leaves it.** Its caption layer and its
  control row were added on the first entry and never removed, so exiting left
  the last frame's numbers, a caption and a row of controls drawn over the
  interactive scene. Both come off the page with the sequence.
- **The sequence's four frame shapes each export as themselves.** A 16:9 file
  used to carry the 9:16 layout — bigger figures, in different places, than the
  ones on screen.
- **The sequence's controls go quiet while it records.** Changing the frame
  shape part-way through stretched the rest of the take into the old one and
  named the file after a shape it was not.
- **The file is the size the frame shape says it is** — 1080×1920 for 9:16 and
  so on, rather than whatever size the browser window gave the canvas. A
  machine that cannot draw that fast records at its own size instead: measured,
  asking a software renderer for 1080×1920 took the sequence to 2.4 frames a
  second, and a smaller file that moves is worth more than a larger one that
  does not.
- **The sequence's controls are 44px on a phone**, like every other control in
  the product. They were 25 — nothing had ever measured that surface.
- **Nothing is downloaded for the export until somebody asks for one.** Every
  visit was paying 3.5 kB for a recorder, a frame painter and a consent screen
  that the published models cannot use.

### The read-out follows the task you chose, and the line follows your screen

A third review of the same scene found two things the second had not, and one
the second had found and left open.

- **Choosing a different task left the previous one as the headline.** The
  read-out builds a row the first time it sees a task and, until now, only ever
  wrote new values into it: which section it was in, whether it was the headline
  and whether it survived a narrow screen were all decided by whichever update
  happened to be first. So tracing a different task put the new one inside a
  folded comparison section and left the old one at the top, emphasised, while
  the 3D showed the new one. The panel and the picture disagreed, and the panel
  is the one that looks authoritative. Everything a row's description carries is
  written on every update now.
- **Switching away mid-answer left the answer glowing.** The marker for the word
  going in and the one for the answer coming back are separate objects from the
  route line, so a task with no route at all — nothing to draw — inherited the
  previous task's flash. And a signal stopped dead at the first step was still
  drawn two per cent of the way along the route, which is a small distance and a
  large claim: the whole point of showing a stop is that the word did not get
  past the step that stopped it.
- **The three line types are now the size they look, not the size they are.**
  Solid for a tract the atlas carries, long-dashed for a coarse stand-in, dotted
  for a connection with no anatomy behind it — those were held in the model's own
  units, so pulling the camera back thinned them until all three were one
  hairline. In the fifteen-second sequence they always were. They are held as a
  fraction of the frame's height now, which is the same apparent size in the
  scene, on a phone and in the exported video.

### The aphasia model: a band is not a value, and a dim route is not a stop

A second medical review of the same scene found six things the first pass
reported as done and had not finished. Each of them is a place where the model
or the picture said something it had no warrant for.

- **A lower bound was being returned as a maximum.** With one route computed at
  0.9 and another the model cannot evaluate, the answer used to be "0.9". What
  is actually settled there is that the maximum lies between 0.9 and 1 — an
  interval, every point of which is in the top band. The read-out says "at least
  available — exact value unknown"; the exact value is withheld unless a route
  comes out at exactly 1, which nothing can beat.
- **A route carrying 0.2 was drawn as a severed one.** The picture had two
  states, "gets through" and "stops", and everything else fell into the second:
  a weak route, a cut one, a question the model cannot settle and a question it
  has no route for were one animation. There are five now, a positive route
  reaches the far end and answers faintly however dim it is, and only a true
  zero halts the signal where it happens. The read-out writes down which of the
  five is on screen, because a picture should not be asked to carry that alone.
- **The same lesion said different things depending on how you entered it.**
  The warning that this model does not compute the thalamus's contribution to
  language was attached to the *preset*. Selecting the nucleus by hand produced
  the same numbers with no warning at all. The declaration lives on the network
  now and is matched against the damage, so the two agree by construction.
- **Two connections borrowed a bundle they had no business depending on.** The
  line from meaning to whole-word spelling was anchored in the posterior
  thalamic radiation because it was the nearest named mesh — the radiation is
  the visual relay, so destroying it stopped a reader from spelling a word they
  were thinking of. Where the model has no bundle it now says so, and the mesh
  the line is *drawn* along cannot change a number.
- **The classical syndromes had no way in.** They existed as a data file with
  tests and nothing on screen. There is a panel: eight syndromes and three
  pictures described as not aphasia, one at a time, each with what this model
  cannot evaluate about it. No match score, no ranking, no probability — that
  would be the classifier this scene removed, wearing a different hat.
- **Three kinds of line were drawn the same way.** The arcuate fasciculus and a
  connection between two processes with no anatomy behind it were the same
  tube. Solid for a tract mesh the atlas carries, long-dashed for a coarse
  stand-in, dotted for a connection with no structure — in the line itself, not
  in its colour.

Two defects in the shared chrome turned up while checking this in a browser,
and both are fixed: a read-out row that a scene stopped sending stayed on the
panel with its last value (so resetting left "nothing of Broca's area is left"
over an intact brain), and the new reference panel, having passed every
touch-target check, turned out to be a column the width of the words on a
phone.

**What is still not done**: no full text of any source has been read from this
environment, and the localisation of the two writing routes rests on a
publisher summary quoted in a review. A clinician has not reviewed any of it.
The scene is not published.

### The aphasia model stopped giving a diagnosis

- **It named the syndrome, and it should not have.** The higher-function scene
  ran its solved tasks through a chain of conditions — comprehension, then
  repetition, then fluency, first match wins — and printed the name it landed on
  as the read-out's largest row, together with a verdict of "not aphasia" for
  two patterns it had rules to exclude. All of that is gone. A first-match chain
  turns four dimensionless route values into a clinical category whose answer
  depends on the order the conditions were written in; the features that
  actually separate the aphasias — paraphasia, agrammatism, effort, phrase
  length, which stimulus a task was probed with — are not computed here at all;
  and ruling a language disorder *out* needs an examination this model does not
  perform. The classical syndromes are reference reading now, described as
  relative sparing and variable features, each with a list of what this model
  cannot tell you about it.
- **The read-out speaks about routes.** 「保たれる／低下／消失」became
  「経路は概ね通る／部分的に通る／ほとんど通らない」, because the bottom band of a
  dimensionless number is not a lost function — 0.2 is not 0. Three computation
  states are distinguished: computed, cannot be determined, and **not modelled**
  — the last for reading aloud, connected-speech fluency and the Gerstmann
  tetrad, which have no routes here and must not be read as normal.
- **Writing is two routes, on two real structures.** Whole-word spelling by way
  of the angular gyrus, phoneme-to-grapheme conversion by way of the
  supramarginal gyrus, which is the anatomy the lexical and phonological
  agraphia case series reported. A nonword has no lexical entry, so it may not
  take the lexical route — and that is what makes the two come apart instead of
  one rescuing the other. Moving the pen is a separate stage: a hand that will
  not move is not agraphia. Writing no longer runs through the planner for
  *spoken* output, so cutting the arcuate fasciculus no longer abolishes every
  kind of writing.
- **Letters and objects are two processes.** They share one occipitotemporal
  mesh, because the atlas has one — so a lesion takes both, the result says so,
  and the dissociation is available as a thought experiment instead of being
  faked from anatomy.
- **Repeating a word and repeating a nonsense word are different tasks.** A
  known word can go round through its meaning; a nonword cannot. So cutting the
  dorsal bundle leaves one partly available and stops the other, which is the
  stimulus effect the conduction-aphasia descriptions report and which the model
  used to flatten into a single row.
- **The thalamus came off the routes.** It was an obligatory serial gate that
  took naming to zero, placed there from a description of the syndrome rather
  than from a lesion study. A chronic-phase series of 550 stroke survivors finds
  no independent thalamic contribution to naming; the lesion-mapping study
  implicates a nucleus this atlas does not carry. The influence this model
  cannot compute is now declared on six language tasks, so "off the routes"
  cannot read as "no effect".
- **A unilateral lesion no longer cuts both sides.** Connections took their
  damage from a channel keyed by id, and an id has no side, so selecting one
  internal capsule zeroed all three frontal circuits bilaterally. A connection
  takes its integrity from the structures it runs within, on the side it runs on.
- **Two kinds of intervention, and they cannot mix.** A lesion on the atlas, or
  one declared process switched off. The read-out's first row says which, the
  solver refuses to be handed both, and switching modes takes the other one off
  the brain as well as off the model.
- **No preset claims to be a lesion it cannot draw.** The occipital preset took
  an invented 40% of the corpus callosum as a stand-in for the splenium; it
  takes the whole commissure and says in its own label that the splenium cannot
  be selected. The insula, the precentral gyrus and the border zones each say
  what their mesh is and is not.
- **The evidence dossier leads with what was not checked.** No full text was
  read for any claim in it: every medical publisher domain is refused by the
  build environment, so the strongest verification any row carries is
  "abstract only", and each row now records which. No clinician has reviewed
  any of it, and this release does not change that.

### Higher cortical function, as the route a lesion cut

- **A new model and scene: `higher-brain-function`.** A right-handed brain, and
  every clinical task — understanding, repeating, speaking, naming, reading,
  writing, using a tool with either hand, attending to either side of space,
  laying down a memory — declared as the named structures it passes through. A
  lesion damages structures and connections; which tasks survive, where the
  signal stops and what the pattern is called are all **solved** from those
  routes. No syndrome is stored anywhere: cut the arcuate fasciculus and
  repetition fails while comprehension and fluency do not, because repetition is
  the one task whose route uses it.
- **Handedness is an input, and only the right-handed case is answered.** The
  model refuses any other value rather than mirroring the brain, because left
  handedness is not the mirror image of right: most left-handers are also
  left-dominant for language. Spatial attention is deliberately not filed with
  language, which is why one parietal lobe is not the mirror of the other.
- **The atlas's tract meshes are on screen for the first time.** The brain file
  has carried fifty-four of them — the arcuate fasciculus among them — and no
  scene had ever drawn one. A disconnection now lights the bundle it cuts.
- **Executive function is in it, as the frontal–subcortical circuits.** Three
  closed loops — dorsolateral, orbitofrontal, medial — each running cortex →
  striatum → pallidum → thalamus → back to the same cortex. Cut one anywhere and
  the behaviour goes: a caudate infarct reads as a frontal syndrome, and a
  capsular lesion takes all three while the frontal cortex is untouched.
- **Touch a structure in an anatomy scene and it says what that structure is
  for**: which tasks run through it, and what is lost if it alone is destroyed —
  solved from the same model, not a list kept beside it. One hippocampus carries
  memory and takes none of it away when it goes, and the panel says both. It
  appears only where the function model itself is released, so the published
  atlas is unchanged until that model has been reviewed.
- **The classical aphasias come out of the anatomy, and so do the three
  pictures that are not aphasias.** Broca, Wernicke, conduction, global, the
  three transcortical patterns and anomic are each the pattern a different
  declared lesion leaves behind. Beside them: pure word deafness, a disorder of
  speech output, and alexia without agraphia — none of which the model will call
  an aphasia, because it applies the supramodal test first. Is the same language
  lost on the page and in the hand, or only in one channel? A dominant insular
  lesion leaves the sentence writable; both auditory cortices gone leaves it
  readable. On the output side the question is repetition: somebody who cannot
  start a sentence but can repeat a long one has a working channel and an
  aphasia. Writing now runs through the language routes rather than straight
  from meaning to the hand, so agraphia accompanies the aphasias as it does in
  people. A dominant thalamic lesion gives fluent speech with the words missing
  and repetition intact — the one picture that made anomic aphasia reachable,
  and the one whose mechanism the evidence dossier marks `uncertain`.
- **It plays.** A run of the examination repeats on screen — the task is asked
  at the end it enters by, carried along its route, and either answered or not —
  and there is a fifteen-second sequence built on it: **one word, asked four
  times of the same brain.** Once with nothing in the way, then with the front
  cut, the back cut, and the bundle between them cut. Every run is the same
  question at the same pace, so the only thing that differs is how far the word
  got — and **the route itself is lit as far as it got**, which is what the
  three names are names of. The order is the claim; the seconds are a rhythm,
  and the sequence says so on screen. The cut arcuate fasciculus is drawn in
  front of the cortex, because a bundle under the surface is a cut nobody can
  see.
- Review fixes, each with the guard that was missing: the reading is reached
  through the scene's own loader, so a production build no longer carries a
  withheld model inside the application chunk; the cut corpus callosum and
  fornix are drawn where they can be seen, as the arcuate already was; the
  travelling signal goes dark where it stops rather than for the whole journey;
  and the closing frame of the sequence no longer prints its emphasis marks.
- **Not a lesion localiser**, and it says so on the screen: one normal specimen,
  whole named structures, no imaging, no course over time, and no statement
  about anybody. Medical review is not yet recorded.
- A read-out row whose value is a phrase now wraps instead of widening the
  panel, which is what had pushed it off the side of a phone.

### Two things a rendered frame said that no test did

- **Every scene's fifteen-second video was carrying the application's
  navigation across the top of the frame.** The sequence's clean mode named the
  three pieces of interface that existed when it was written; the global
  navigation was moved beside one of them later and was never named, so a
  breadcrumb and a sign-in button sat in the picture. It is now the other way
  round — everything is hidden and the video's own parts are named back in — so
  interface added in future cannot walk into a frame.
- **Reels can be rendered as stills now** (`npm run shots:reel`), at any second
  of any scene's sequence, which is how both of these were found. A sequence's
  tests measure the state at a second; only a picture says whether a viewer can
  see it.

### Every vessel in the product was drawn inside out

- **Tubes were wound the wrong way, and had no ends.** All 42 of them, plus the
  aortic root, which builds its own geometry the same way. Under a front-side
  material that draws the *far* wall with its normal pointing back at the
  camera, so a coronary artery rendered as a flat ribbon rather than a round
  vessel. A tube's silhouette is the same either way round, which is why this
  survived review. Vessels are round and correctly lit now, and the aorta no
  longer shows the background through its open top.
- **Two models were relying on it.** The blood and oxygen moving inside the
  circulation model's vessels, and the filtrate inside the nephron's tubule,
  were visible only because the near wall was being culled. Both walls are
  declared translucent now, which is what they always should have been — and
  the nephron's own "opacity tracks filtrate" control had never worked, because
  the material it was written for was not transparent. The pancreas says in its
  header that the gland is drawn translucent so the duct inside shows; it was
  letting 16% through, and now does what it says.
- **No medical claim changed.** These are lighting and geometry defects; no
  parameter, boundary or proportion moved.

### The kidney's collecting system is a tree, and its cut faces are exact

- **A minor calyx cups each papilla** and drains through a superior, middle or
  inferior major calyx into the pelvis. Seven ducts used to run from seven
  papillae to a single point in the middle of the sinus.
- **The parts no longer change shape with their own resolution.** Cutting an
  organ into named parts left every cut face zigzagging at the tessellation's
  spacing, so each part lost a sawtooth of volume along every cut and the finer
  the mesh the less it lost. The mesh is cut along that rim now. The kidney
  draws at detail 12 where it needed 18, with 55% of the triangles, and looks
  better than 18 did.

### The landing hero shows the real model, in two stages

- **The hero now builds the organ's actual anatomy model.** The brain is the
  397-structure atlas, not the landmark silhouette that stood in for it; the
  heart is the coronary anatomy. What a visitor arriving from a link sees is
  the thing itself.
- **It loads in two stages, so nobody waits for it.** The lightweight builder is
  on screen as soon as Three.js is, and the detailed model — 4.5 MB of atlas,
  for the brain — replaces it in place once it has finished loading. The frame
  is never empty, and the page is never held up.
- **It is skipped where it would cost more than it gives**: on a data-saver
  connection, on 2G, and while the hero is off screen. A failed load says
  nothing at all — the builder is a real organ, and a hero is not the place to
  report a network error.
- The scene's authored view is kept — which side of an organ a reader opens on
  is an anatomical decision — but its distance is refitted to the hero's short,
  wide frame, and only ever further away, never closer than the scene asked.

### Every organ gets an anatomy model, at the accuracy the brain reached

- **The design requirement is now written down and enforced.** Every organ in
  the body gets an anatomy model, and the bar is the one `brain-anatomy` met:
  the parts anatomy names, as separate closed meshes, addressable by name.
  `src/catalog/anatomy.js` carries one row per organ with its level and the
  test that holds that level up, and `tests/anatomy-ledger.test.js` fails if an
  organ is ever added without one. `docs/grand-design.md` §4.5,
  `docs/anatomy-specs.md` and `CLAUDE.md` state the requirement; none of them
  restates the ledger, so the two cannot drift.
- **This reverses the previous policy.** Organs used to be upgraded only when a
  planned disease scene needed the structure, and the rest were frozen at a
  silhouette — which produced four modelled organs and eighteen sketches. Pull
  now decides the *order*, and how far past the bar to go; it no longer decides
  whether an organ gets a real anatomy model at all.
- **Legibility is an acceptance condition, not a finishing touch.** Dividing an
  organ into named parts only counts when those boundaries can be told apart in
  a real render, measured against the checklist in `docs/organ-3d-playbook.md`.
  Accuracy nobody can see is not accuracy.
- Where the work stands is a command, not a paragraph: five organs are at the
  bar, sixteen are not, and each of the sixteen says in one line what taking it
  there means.

### Beta: the brain and the heart

- **The beta opens the brain and the heart, and nothing schematic.** Five
  models — the brain atlas, amyloid-β, heart failure, low cardiac output and
  myocardial ischaemia — free, no account. Every other model in the catalogue
  answers "TO BE UPDATED / 準備中". A model is opened once it has a model
  layer, an evidence dossier and a model card behind it; a Prototype, whose
  shape is an outline and whose motion is provisional by its own definition, is
  listed but not opened.
- **A shared link to a model that is not open still works.** It reaches a page
  that names the model, says the beta is holding it back and why, and points at
  the models that are open. Nothing was deleted, and the catalogue still lists
  everything: the Explorer keeps each one under its organ as a card that is
  deliberately not a link, and the landing page lists them as lines under the
  models it can actually open.
- **The landing page opens on a real organ, and it changes.** The hero builds
  one live and alternates by the calendar day between the brain and the heart;
  a visitor can also pick. It replaces the circulation hero.
- **Development is unchanged.** `npm run dev` sees everything; a deployed build
  opens with `?preview=1` and closes again with `?preview=0`.
  `docs/beta-release.md` has the whole rule.
- The crawlable surface and the link-preview cards are the models that are
  **both** open and public: five pages and six cards. A page that invites a
  reader to open a model the release has not opened is a promise the site
  cannot keep, and a Prototype in a search result is a caveat stripped off.
  The site card counts what is open — five — rather than what is in the
  catalogue.

### Two new respiratory models, and the Explorer rebuilt around organs

- **Pneumonia** (`#/pneumonia`, `alpha`, clinical review pending). Twelve
  regional units; alveolar consolidation removes ventilation from a unit while
  its perfusion persists, and the perfusion that still crosses non-ventilated
  lung is the shunt mechanism. Hypoxic vasoconstriction diverts some of that
  flow and never all of it. The slider consolidates at most 60% of the
  conceptual lung; the solver's total-consolidation boundary is kept for tests
  and is not a stage a reader is walked into. No PaO₂, SpO₂, pathogen, imaging
  or treatment.
- **Pulmonary embolism** (`#/pulmonary-embolism`, `alpha`, clinical review
  pending). Twelve parallel vascular territories at one fixed driving
  pressure; obstruction removes perfusion while ventilation continues, which
  is dead space, and removing parallel conductance raises a relative PVR
  (shown to one decimal). No pressure, right-ventricular response, clot
  burden, risk class or treatment.
- **Both models carry the full alpha set**: a model layer, an evidence dossier
  with a code-side registry, a model card, a scope panel, physiology tests and
  scene tests. Non-finite input to either solver falls back safely.
- **The Explorer files every model once, under its primary organ**, with a
  slow, lazy 3D preview per organ (brain, heart, lungs, liver, kidneys). At
  most two WebGL contexts are alive at a time; a preview that scrolls away
  gives its context back and rebuilds on return, a lost context is never shown
  as ready, and the preview pauses on hover or touch, off-screen, in a hidden
  tab and under reduced motion.
- **Every model has one name.** The textbook name in the catalogue is what the
  Explorer, the search, favourites, the landing page, the scene header, the
  page metadata and the social card all show, so a reader who searches for
  what the card says finds it. Narrative titles ("Where the water goes")
  remain as a story line beside the name. Short abbreviations such as PE, CAP
  and AKI are matched as whole words.
- **Three uses, and one of them fails closed.** Patient explanation, medical
  education and clinical case learning are the product's use contexts. The
  patient-explanation badge and filter appear only on a model with a
  versioned clinical review, under the same rule as the paid patient mode.
  Clinical case learning stops at case-based mechanism review: no patient-
  specific dosing (dobutamine included), diagnosis, severity grading or
  decision support.
### Myocardial ischemia, as a model and a scene that is not yet finished

- **A model of ischemia as a debt that accumulates.** Supply over demand gives a
  deficit, the deficit integrates into a burden, and the burden drives
  contractility through a lag that is slower coming back than going out —
  because that is what stunning is. Nothing downstream reads supply, so a wall
  cannot go red the moment an artery narrows.
- **One solve behind everything.** The wall's colour, how far it moves, the
  ejection fraction and every number come from a single call to the shared
  cardiac model, with end-systolic elastance scaled by how hard the ventricle
  can still contract.
- **The scene is registered `alpha` and has been looked at, repeatedly.**
  Rendering it found twenty-eight defects across ten rounds and a code review,
  and two of the twenty-eight were measurements this project had itself
  published wrong. The territory map is legible on the model now — the
  watershed is drawn as a line, because a fill alone could not carry it — and
  the AHA 17-segment plot beside the heart shows all three territories at once,
  which no view of a 3D heart can. Every round, with its numbers, is in
  `docs/anatomy-review.md` §5.10.

### The heart has coronary arteries, and the myocardium knows which one feeds it

- **Five named epicardial arteries**, each in the groove it is named for, and
  the AHA 17-segment territory map as one source of truth that the scene's
  colour, wall motion, legend and read-out will all read. Owned by the organ
  layer: the builder is handed the heart's surface rather than importing one,
  so a vessel cannot end up with its own opinion about where the heart is.
- **The territory map is a convention, and the code says where it is wrong.**
  The AHA chart assigns segment 3 to the right coronary; contrast-enhanced MR
  finds it is anterior-descending territory, and five other segments overlap
  two arteries between people. A model that shows a fixed map without recording
  that is claiming more than it has.
- **One right-dominant specimen.** The posterior descending comes off the right
  coronary. Left-dominant and balanced circulations are not modelled.
- **The anterior descending stops short of the apex**, which real ones do not.
  A surface of revolution has no normal at its tip, so there is no "away from
  the wall" to lay a vessel along there. The reason and the measured clearance
  are recorded where the number is.

### One heart, so two scenes cannot disagree about it

- **The cardiac solver moved out of the heart-failure scene.** The time-varying
  elastance model and the seven-compartment circulation it drives now live in
  `src/models/cardiacMechanics.js`, with the chamber geometry and the named
  parts of a beat. The heart-failure scene keeps what is specific to that
  disease — the keyframes that turn a position on the progression into
  mechanical parameters — and became one of two readers rather than the owner.
- **Nothing about the heart-failure model changed.** Every authored stage, each
  control at its minimum, default and maximum, and five points in the cardiac
  cycle were captured before the move and again after. The two captures are
  identical, not merely within tolerance, and a test pins them so a future edit
  has to change them deliberately.
- **Why now.** The myocardial ischemia scene has to solve the same cardiac cycle
  under the same loading state. A second implementation of a beat is how two
  scenes start showing different hearts, and neither would look wrong on its
  own. The specification for that scene — what the coronary geometry owns, the
  AHA territory map and where it disagrees with measurement, and the fact that
  the first version is reversible ischemia with no infarct — is settled in
  `docs/anatomy-specs.md` before any of it is built.

### What each model may be used for is now written down, and tested

- **Every public scene now carries a model profile** (`src/catalog/modelProfiles.js`):
  where its geometry comes from, how much its numbers can carry, whom it
  stands for, and what it is for and must never be used for. All ten are
  representative teaching models; every one prohibits diagnosis, treatment
  selection and dose selection; none claims external validation. No scene's
  status, review state or model changed.
- **Patient mode is fixed as patient explanation, not a patient-specific model.**
  It shows the same general model with less jargon, takes no patient data, and
  the test suite now refuses any scene that claims otherwise — as it refuses
  clinical research or clinical care as an intended use anywhere in the app.
- **The brain atlas has a provenance record** (`src/catalog/assetManifest.js`)
  and a measured QA record (`docs/asset-qa/brain-atlas-glb.md`): the upstream
  file re-verified byte for byte, its seven components and their licences
  including the Human Connectome Project acknowledgment the tract templates
  require (now in `public/assets/brain/ATTRIBUTION.md`), a pinned glTF
  Validator run with 0 errors, and a browser render. What nobody has done —
  an anatomist's review, a clinician's sign-off — is recorded as pending, so
  the asset passes the release gate for its alpha scene only. Future external
  meshes follow `docs/asset-pipeline.md` and cannot reach a public scene
  without clearing the same gate.

### The site has one public address

- **Production is `https://med-3d-lab.necofindjob.com`.** The origin still
  comes from the deploy rather than from the code, so moving the site remains a
  deploy change — but it is now written down, in the release runbook, in the
  discoverability document and beside the variable in `.env.example`, instead of
  being knowledge somebody had to already have.
- **A trailing slash no longer makes a second site.** `https://site` and
  `https://site/` are the same site to the person typing them into a deploy
  environment, and they now produce the same canonical, the same Open Graph URLs
  and the same sitemap. The home page had been declaring itself at an address
  the sitemap did not use.
- **The build can now be checked against the domain it was meant for.**
  `npm run verify:site -- --origin <url>` fails when the sitemap or any page's
  canonical, `og:url` or preview image names something else. Stating the origin
  from outside the build is the point: the addresses are all baked in from one
  variable, so a build carrying a stale one agrees with itself perfectly while
  every page names the host the site has left — invisible in a browser, decisive
  to a crawler. Without `--origin`, the check is the weaker one that the output
  at least names a single host.
- **The origin is in the repository now, not in a dashboard.** `netlify.toml`
  sets `VITE_SITE_URL` for production and leaves it empty for preview deploys —
  a preview is not the site, so it claims no canonical and emits no sitemap.
  Moving the domain is a commit that is reviewed, tested and revertible instead
  of a value somebody has to remember to retype, and remembering was the whole
  failure mode.
- **The deployed site can be checked, not just the build.**
  `npm run verify:live -- <origin>` fetches robots.txt, the sitemap, the home
  page, every scene page and the preview card from the published origin, and
  fails if what is served names another host, has no canonical, lost the
  sitemap or published a Prototype scene. `--redirects-from <old-origin>` also
  proves old links still lead to the new one. This is what catches a domain
  that moved while an older deploy stayed published — the case no local check
  can see, because the build is not what the public is being served.
- **The rest of the move is a checklist, not memory.** Supabase's redirect
  allowlist and the new Stripe webhook endpoint come *before* the cutover —
  password reset returns the user to the running origin, and a new endpoint has
  a new signing secret, so doing either afterwards breaks them for everybody
  already on the new domain. Redirects from the old host, the sitemap
  resubmission, and retiring the old endpoint afterwards are in the release
  runbook.

### The lobes and the liver segments now take the volumes a source gives them

- **The shares stopped being uncited, and two of them stopped being wrong.**
  Lobe volumes now follow Bakker et al. (Eur Radiol 2024) and Couinaud segment
  volumes follow Mise et al. (HPB 2014). The right middle lobe was 12.4% of the
  right lung against a reference 16%, and the right lower lobe 52.0% against
  48%. In the liver the two right sectors came out within 0.4 percentage points
  of each other — the anterior sector should lead the posterior by about 14 —
  and segment VIII, the largest segment of the liver, was leading segment VII
  by 0.2 points where the source's medians differ by nine.
- **The numbers carry their limits with them.** The lung values are inspiratory,
  supine, and from a northern Dutch cohort aged 45 and over; they are one
  teaching reference specimen, not a normal range and not a prediction for any
  person. Mise's own finding is that segment VIII runs from 11% to 38% of the
  liver between people, which is why liver resections are planned on the
  patient's own volumetry. All of that is recorded where the constants are
  declared and in `docs/medical-notes.md`.
- **The lung derivation has not been independently checked here.** The weighting
  of Bakker's Table 1 was done by the collaborator who specified the work; this
  build environment cannot reach the publisher, PMC or the mirrors. What could
  be checked is recorded, including an independent cross-check that lands
  inside the bands. `docs/anatomy-specs.md` carries it as an open item.
- **The check that the parts fill the organ could not previously fail.** It
  divided each part by the sum of the parts, which is 1 for any parts at all.
  It now asks 50,000 points inside the organ how many parts claim each, and
  separately whether the parts add up to the organ they were cut from.

### The lung's left and right, held where they come from

- **Three relations the anatomy spec asks for by name now have numbers in the
  places their causes belong.** The right lung is 6.7% shorter than the left,
  its diaphragmatic surface sits 7.0% higher because the liver is under it, and
  the left hilum sits 5.9% higher than the right. All three used to come out in
  the right direction by about 1% — as by-products of arithmetic they did not
  depend on, which is the same as not holding them.
- **The two airway trees now agree in writing about which lung is which.** The
  asthma model solves a symmetric binary tree; the lung builds an anatomical
  one. Below the main bronchi they cannot correspond — a binary tree has 2^g
  branches and a lung's counts are not powers of two — and the side, which does
  correspond all the way down, was being derived independently in both files.
  It is stated once now, with a test that measures the built tree against it.
- **The two liver vessel trees say which of them owns what.** Four structures
  are drawn by both, and they are authoritative for different things: one owns
  the solved circulation, the other the anatomy. No scene may draw both, and a
  test holds it.

### Fixes

- **A cancelled subscription now actually revokes access.** Two paths through
  the Stripe webhook acknowledged a cancellation to Stripe — telling it never to
  send the event again — and wrote nothing to the local row, which went on
  saying `active`. A customer who cancelled kept paid access indefinitely, and
  nothing anywhere recorded that it had happened. Revoking no longer requires
  resolving who owns the subscription; granting still does.
- **A password reset survives a page refresh.** The recovery dialog was reached
  by two signals — the tokens in the URL hash, consumed and scrubbed once, and
  the `?account=recovery` that is left afterwards — and the second was checked
  for and then discarded. Anybody who reloaded mid-reset got the ordinary
  sign-in dialog while holding a valid recovery session.
- **Lesson progress is kept in browsers that refuse to store it.** Private and
  embedded browsers let a page read storage and refuse to let it write; the
  in-memory copy built for exactly that case was saved on every step and read
  back on none, so a learner three steps in returned to step one.
- **A failed telemetry send no longer eats what was recorded while it was
  failing** — which is disproportionately the events about the failure.

### The liver, divided the way surgery divides it

- **Eight Couinaud segments**, as nine closed meshes whose union is the
  parenchyma (segment IV is carried as its superior and inferior halves), each
  hideable and measurable on its own. Every point in the liver falls in exactly
  one of them, and the five sectors take the share of liver volume the
  literature reports.
- **Cantlie's line is the right/left division, and the falciform ligament is
  not.** The commonest mistake about liver anatomy is now something the
  geometry cannot make: the plane of the middle hepatic vein and the ligament
  are separate objects, a real distance apart, and a test holds them so.
- **The hepatic veins run between the segments and the portal pedicles run
  inside them** — the arrangement that makes a segmentectomy possible, and the
  reason a surgeon finds a resection plane by following a vein. Each vein is
  projected onto the plane it divides rather than positioned near it.
- **The caudate lobe belongs to neither side.** It takes a pedicle from both
  portal branches and drains straight into the cava by its own short veins,
  which is why it survives what kills the rest of the liver.
- Removing a sector leaves a real cut surface: taking segments VI and VII away
  draws the plane of the right hepatic vein, which is what a right posterior
  sectionectomy looks like.

### The lung, rebuilt as an organ

- **The lung has lobes now.** It used to have grooves: shallow dents scratched
  into one surface, so it looked lobed and had nothing in it that could be
  hidden, coloured or measured. It is five closed meshes whose union is the
  parenchyma — three on the right, two on the left, cut apart by an oblique
  fissure on both sides and a horizontal fissure on the right only. Every point
  in the lung falls in exactly one lobe, and that is sampled rather than
  asserted.
- **The lobes take roughly the share of each lung they are taught to take** —
  about 36 / 12 / 52 on the right and half and half on the left, with the middle
  lobe the smallest of the five. The fissure positions were chosen to land those
  and nothing else, which makes them a calibration rather than a measurement,
  and the targets themselves are uncited approximations rather than figures from
  a series.
- **Eighteen named bronchopulmonary segments**, ten on the right and eight on
  the left, in both languages: no left S7 because the heart is there, an
  apicoposterior segment where the left lung fuses two, and the lingula inside
  the left upper lobe rather than as a lobe of its own. Each sits where its own
  name says it does, and that is what the tests check.
- **A bronchial tree and the vessels that run with it.** Trachea, main, lobar
  and segmental bronchi, with the right main bronchus wider, shorter and steeper
  than the left; an artery beside every bronchus; and veins running *between*
  the segments rather than with them, which is the fact a surgeon finds a
  segmentectomy plane by. At the hilum, RALS: the artery anterior to the
  bronchus on the right and superior to it on the left.
- **Nothing inside the lung comes out of it.** The hilum and the segment
  centres are declared as anatomical directions and then placed against the
  lung's own surface, so the declaration says where a structure is and the
  surface says how far out that is. Written the other way round — as fractions
  of the lung's extents — seven of the eight hilar structures sat outside the
  pleura and twenty-one airway and vessel endpoints ended in mid-air, plainly
  visible on screen while every test passed.
- **Still schematic in shape.** The outer silhouette is unchanged and is not
  from a scan; real fissures are curved and frequently incomplete, and the
  segment boundaries here are a distance rule — the lung nearer one segmental
  bronchus than any other — which models the definition of a segment rather
  than tracing a specimen. The right main bronchus is the shorter and the more
  vertical, which is the claim; the 1 : 2 length ratio of real ones is
  understated here at 1 : 1.13, because these two lungs are placed symmetrically
  and a real left hilum is pushed out by the heart.
- **Building an organ twice now costs once.** Carved parts are kept and handed
  out as separate copies, which took the test suite from 30 s back to 16 s
  without changing a single vertex.

### A new model — where the water goes

- **Pulmonary oedema** (`#/pulmonary-edema`, `alpha`). One Starling equation
  across the pulmonary capillary and the three buffers that oppose it:
  interstitial pressure rising off its subatmospheric floor, lymphatic flow
  rising towards a ceiling, and interstitial protein washing down as the flux
  rises. What comes out of that is the question the scene is named for — above
  what pressure does water cross, and which space does it fill first.
- **The threshold is searched for, never stored.** There is no flooding
  constant anywhere in the model. Lower the albumin, injure the barrier, raise
  the cardiac output or give the lymphatics months to adapt, and the pressure
  the lung tolerates moves, because it was never a number in the first place.
  A previously normal lung floods in the mid-twenties mmHg; the same lung after
  months at pressure holds out into the high thirties.
- **Cardiogenic and non-cardiogenic oedema are the same equation.** Nothing
  switches. Raising the atrial pressure floods the lung through the hydrostatic
  term; injuring the barrier floods it at a normal pressure through σ — and
  because σ multiplies the oncotic term, giving albumin stops helping. That
  falls out of the model rather than being written into it.
- **The interstitium fills before the alveolus does**, so the scene has a stage
  where the lung is visibly wet and the saturation has not moved — which is why
  breathlessness precedes hypoxaemia and the radiograph changes before the
  oximeter. Only when alveoli flood does a shunt appear, and then oxygen widens
  the alveolar-to-arterial difference instead of closing it.
- It reuses the lungs `breathing-lungs` already draws. No organ is modelled
  twice.
- Scope, evidence and boundaries are on the same screen: the model card records
  that the model has **no ventilation and no gravity** — it cannot say how hard
  someone is breathing, and it fills the lung evenly where real oedema is basal.

### The organ layer, checked the way the heart was

Every organ builder in `src/scenes/*/organs/` was measured against the
anatomical relationships it claims, rather than looked at. Three defects came
out of it, all of them the kind that stays invisible while an organ is alone in
the frame:

- **The spleen presented its hilum to the ribs.** It is a left-sided organ, so
  its concave visceral surface faces the midline; built facing the other way, it
  only went wrong once something placed it in a body — and in the
  cirrhosis/portal-pressure model the splenic vein was drawn starting half a
  unit away from the notch it is supposed to leave by. The spleen now carries a
  declared medial axis, and the scene places it by its hilum instead of by a
  position typed beside the vessel's.
- **The heart's aorta label pointed at the right atrium.** When the aortic arch
  was corrected to sweep over the patient's left, the label naming it stayed on
  the far side of the midline. It is now derived from the arch itself.
- **Hollow organs were far more opaque than they asked to be.** A closed
  double-sided wall is crossed twice, so a stomach asking for 0.84 rendered at
  0.97 and passed 2.6% of its contents instead of 16%. Gastric and intestinal
  contents — the subject of both scenes that draw them — are now visible through
  the wall: measured on a real render, the bowel's visible contents went from
  137 pixels to 1938, and the brightest contents in the stomach doubled.

None of this changes a medical claim or a number; all of it changes whether the
picture says what the code says it says. `tests/organ-anatomy.test.js` now holds
the relationships in place — sides, medial and lateral, labels pointing at the
structures they name, nested organs staying nested, and every shape setter
returning to where it started.

### A landing page you can actually touch

- The first screen now contains a working circulation comparison, not an
  abstract product illustration. Baseline, fluid-responsive and dobutamine
  states read MAP, cardiac output and calculated global DO₂ from the same solver
  as the full circulation model.
- All nine public models are visible from the landing page. Each starts with a
  concrete question and a three-part mechanism trace, and reports implementation
  maturity separately from clinical-review state.
- A restrained Canvas 2D flow field gives the page a living blood-flow texture.
  It is explicitly decorative, capped by device class, reduced for Save-Data,
  paused in hidden tabs and static under reduced-motion preferences.
- The page no longer claims that every core model is “accurate” or that mature
  software is clinically reviewed. Trust, scope and evidence now appear before
  the catalogue rather than near the bottom of the page.

### A new model

- **Where filtration fails** (`#/renal-filtration`). One nephron, with the
  Starling balance across its glomerular capillary and the mass balance of the
  tubule below it solved together. FENa, the urea-to-creatinine ratio, the urine
  sodium and the urine osmolality are not four facts to memorise there — they
  are four readings of the same solve, so a reader can move one mechanism and
  watch which of them inverts. Pre-renal, tubular injury, obstruction, chronic
  nephron loss and nephrotic disease are five *situations* of one model rather
  than five scenes.
- It reports plasma creatinine as **where creatinine is heading**, never as
  where it is today: the model solves a steady state, and real creatinine takes
  days to catch up. That is the caveat the scope panel leads with.
- **Alpha, not reviewed.** It has the model layer, the evidence dossier, the
  model card and the scope panel; no clinician has signed it, and the Trust page
  says so.

### Trust and medical claims

- The public **Trust** page (`#/trust`) shows catalogue maturity and clinical
  review as separate claims, with the scope of each review, its unresolved
  limitations and a link to the evidence package. It needs no WebGL — and it
  now scrolls, which it did not: everything below the fold, which was most of
  the review records, had been unreachable.
- **Model cards carry a revision.** A medical change that leaves its card
  untouched now fails CI. That is a different obligation from whether a review
  is still current, which the clinical review registry answers.
- **Three reviews turn out to be stale**, and the Trust page now shows each one
  with the paths that changed since it was signed. The portal-hypertension
  review, for instance, signed a model the hepatorenal work later extended with
  an arterial inlet pressure control: it defaults to the reviewed value, so
  reviewed behaviour is unchanged, but the model at other inlet pressures has
  not been reviewed. A stale review is history, not a current sign-off, and it
  is labelled that way everywhere it appears.

### Terms, privacy and support

- **Terms, Privacy, commercial disclosure and Support pages**, reachable at
  `#/terms`, `#/privacy`, `#/commerce` and `#/support`, and readable with no 3D.
- Two claims in the privacy policy are checked against the code rather than
  trusted: that nothing is transmitted before consent, and that no identifier
  survives a page load.
- **Checkout refuses to run** until the seller's commercial disclosure is
  complete. The account, the free models and the plan descriptions all keep
  working; the button says which of the two reasons applies.

### Privacy and observability

- **Usage data is consent-gated.** Nothing leaves the browser until you allow
  it, and refusing destroys what was gathered rather than storing it. There is
  no advertising use, no profile, and no identifier that outlives a page load;
  return visits are counted locally and reported as one of three words.
- **Error reports are redacted** before they are sent — tokens, addresses,
  identifiers and file paths.
- **A feedback route** on every surface, including the one shown when 3D fails
  to start, which is when a report is worth most.

### Performance and accessibility

- **Declared performance budgets.** The renderer gives up bloom before
  resolution, and now earns quality back after sustained headroom instead of
  keeping a reduced setting for the rest of a session.
- **Pinch zoom works again.** It had been disabled across the whole product to
  stop the browser zooming during an orbit gesture; the canvas now suppresses
  that gesture where it actually conflicts.
- Contrast, focus, landmarks, skip links, language marking for screen readers,
  reduced motion and target sizes are declared and checked in CI.
- **The Trust page no longer scrolls sideways on a phone.** One evidence path
  with no place to break — `docs/model-evidence/cirrhosis-portal-hypertension.md`
  — was widening the whole card grid, so at 320 px the page ran 426 px off the
  right edge and had to be read in two directions.
- **Ten controls got big enough to hit.** The story-stage buttons under a scene
  were 9 px tall, the filter and system pills 22 px wide, and every footer,
  navigation and evidence-source link on the reading surfaces was bare 14–19 px
  text. All now clear the 24 px WCAG minimum.
- These were found rather than guessed: the product is now measured in a real
  browser at six viewport sizes — 320, 375 and 430 px wide, a phone on its
  side, a tablet and a desktop — across every page that does not need WebGL,
  plus one that does. Safari, Firefox and real touch hardware are still a
  person's job, and the check says so every time it runs.

### The scenes themselves

- **The consent question no longer covers the controls.** On a first visit it
  was pinned to the bottom of the window — which is where every scene keeps its
  stage steps, its Story and Compare buttons and its camera controls. On a
  phone it covered all of them, so the first thing a new visitor saw was a
  model they could not operate. It now sits between the title and the console
  and covers neither.
- **The heart and great vessels were reviewed against an atlas** and come out
  right: the aortic valve sits to the right of and in front of the mitral, the
  left atrium above and behind the valve plane, the arch crosses the midline
  backwards and to the left and clears the top of the atrium, and the four
  pulmonary veins enter the atrium from behind, two a side. Eleven such
  relationships are now held by tests rather than by whoever last looked.
- The brain atlas was checked the same way and nothing was found.
- Two things the review raised are questions for a clinician, not for us, and
  are written into the heart-failure model card so a reader meets them: the
  pulmonary veins are drawn in the colour this scene uses for venous tissue,
  and they are the veins that carry oxygenated blood.

### Discoverability

- Every public model has its own page, its own link preview and an entry in the
  sitemap. The pages need no JavaScript, so a model's description, maturity and
  limits are readable even where the 3D is not.
- **Sharing a model now shows a real card.** Each carries the model's name in
  both languages, its system, and — separately — how finished the engineering
  is and whether a clinician has signed it, so the distinction the Trust page
  makes survives the moment somebody is deciding whether to click. Every card
  also carries the line saying this is an educational model and not for patient
  care, because a card travels without the page it came from.
- **Three published pages were contradicting themselves.** COPD, asthma and
  cirrhosis/portal hypertension each said "Reviewed — a clinical reviewer has
  signed a specific commit" and "Clinical review pending" on the same page. All
  three have a real review that went stale when the model changed underneath
  it, and the static pages had no wording for that state, so they fell back to
  "pending". They now say re-review required, which is what is true.

### Billing operations

- Renewal and payment-failure handling. Entitlement already followed the
  subscription events; these carry the two facts those cannot — that a renewal
  happened at all, and that a payment is failing with a known number of
  attempts left. An alert goes out on the last failed attempt, which is the
  point at which a paying customer is about to lose access.
- A scheduled reconciliation sweep across the whole account, alongside the
  existing per-user repair. The per-user one cannot see somebody who never
  comes back; the sweep answers whether anyone is in a bad state that nobody
  has looked at.
- An alert policy, so the failures worth waking somebody for are written down
  rather than decided in the moment.
