/**
 * What the current release actually opens.
 *
 * The catalogue says which scenes *exist*; this file says which of them the
 * public beta hands to somebody who arrived from a social post. Everything else
 * stays in the repository, stays buildable, stays testable and keeps being
 * developed — it is simply answered with "to be updated" instead of being
 * opened.
 *
 * ## Anatomy, and the mechanism scenes named one at a time
 *
 * The beta began as the **3D anatomy** of a few organs and nothing else, and
 * that is still what most of it is. Looking at an organ and being able to name
 * what you are looking at is a product in its own right.
 *
 * **On 2026-09-22 the repository owner decided to stop making it the only
 * one.** The rule it replaced was "mechanism level `none`, read off the model
 * profile", and its reason was sound: a disease model is not an anatomy model
 * wearing the name, and while the heart had no atlas the pressure was to
 * publish heart failure *instead* of one. That substitution is still refused —
 * what changed is that a mechanism scene may now be published **in addition**,
 * named here one at a time, with its own decision record.
 *
 * So there are two candidate lists, and they do not share a claim rule:
 *
 * - `BETA_ANATOMY_CANDIDATES` keeps the original rule exactly. An entry there
 *   must claim structure and nothing more, and `anatomyClaimProblems` is
 *   unchanged, so restoring the old substitution still fails loudly.
 * - `BETA_MECHANISM_CANDIDATES` is the new one. It allows a mechanism claim and
 *   nothing else about the gate is relaxed: no patient-specific model, no
 *   clinical intended use, and — the rule that matters most — **a scene that
 *   explains a mechanism to a patient still needs a current clinical review**,
 *   exactly as the next release demands. What may be published without one is a
 *   scene addressed to a learner, badged with the review state it actually has.
 *
 * `docs/architecture/adr-2026-09-22-mechanism-scene-in-beta.md` records the
 * decision, what it knowingly accepts, and who took it.
 *
 * ## Naming a scene is not opening it
 *
 * Both lists are lists of *candidates*. Matching a string in either grants
 * nothing. A candidate opens only when every one of
 * `betaPublicationProblems()` is empty:
 *
 *  1. it is registered in the catalogue, with a status the taxonomy knows;
 *  2. it makes the claim its list allows and no clinical one — read off the
 *     model profile, not off the scene's name. For an anatomy candidate that is
 *     structure and nothing more; for a mechanism candidate it is anything
 *     short of a patient-specific or clinical claim, and a patient-facing one
 *     needs a current review;
 *  3. every asset its profile names passes the asset release gate (licence,
 *     obligations, hashes, QA), and it rests on no *candidate* asset — a file
 *     still under examination has no licence decision, no discharged
 *     obligations and no QA, so naming one closes the gate by itself;
 *  4. no clinical-review record it has is `stale`, so a sign-off that has been
 *     overtaken is never shown as current;
 *  5. a publication decision exists that is complete — who decided, in what
 *     role, on what date, against what record, over what scope — and that is
 *     pinned to the exact asset revisions **and** the exact scene revision it
 *     was taken against.
 *
 * A status nobody has defined, a missing model profile, an asset whose licence
 * is unknown, a decision taken against a file that has since changed: each of
 * those closes the gate rather than opening it. That is deliberate — the whole
 * point of a list this short is that adding to it has to be an edit here, with
 * a record attached, rather than a side effect of adding a scene.
 *
 * ## The preview unlock is a build-time capability, not a URL
 *
 * `?preview=1` opens the locked work, but only in a build that was made to
 * allow it (`npm run dev`, or a build with `VITE_ALLOW_PREVIEW=1`). In a
 * production build the parameter and the remembered answer do nothing, and a
 * remembered answer left over from a preview build served on the same origin is
 * actively forgotten. See `src/app/releaseGate.js` for the browser half.
 *
 * A production build goes further than not offering the locked work: it does
 * not ship it. `scripts/scene-loaders-plugin.js` drops the dynamic import for
 * every scene this file does not open, so no chunk is emitted for it, and
 * `npm run verify:site` walks `dist/` to prove it.
 *
 * **None of that is secrecy, and this gate must never be used as if it were.**
 * The repository is private — a decision about the cost of CI on a private
 * repo and about the authored guides being the product that is meant to be
 * sold, not a security boundary. It is not one: anybody with read access can
 * build and run the whole catalogue, the production bundle is served to
 * everybody, and visibility can change with one setting. So the rule is the
 * same as it would be in the open — **do not put anything behind this that
 * would be a problem to read.** This decides what the product offers and
 * delivers, not what a reader can find — see `docs/beta-release.md`.
 */
import { SCENES, sceneById } from './index.js';
import { STATUS_IDS } from './taxonomy.js';
import { assetById, assetReleaseProblems, isRepositoryPath } from './assetManifest.js';
// The states, not the notes. This module runs at first paint — `RELEASED_SCENES`
// is a module constant, so opening any page evaluates the publication rule for
// every scene — and the gate reads exactly one field, `reviewStatus`. Importing
// `clinicalReview.js` for it put the whole registry in the entry chunk: every
// scope, source and unresolved limitation any reviewer has written, 22.8 kB
// gzipped, in front of a first paint that never shows one of them. The registry
// is still the source of truth and `clinicalReviewStates.js` is generated from
// it; see `scripts/review-states.js`.
import {
  clinicalReviewStateForScene,
  hasCurrentClinicalReviewState,
} from './clinicalReviewStates.js';
import { sceneRevisionPin } from './modelRevisions.js';
// The ids only, never the guides themselves: this module is reachable from the
// browser's eager entry (`main.js` → `releaseGate.js` → here), and importing
// the payload put 220 kB of authored prose in front of every first paint. See
// `patientGuideIndex.js`.
import { PATIENT_GUIDE_SCENE_IDS } from '../data/patientGuideIndex.js';
import {
  CLINICAL_INTENDED_USES,
  INTENDED_USE,
  MECHANISM_LEVEL,
  PATIENT_SPECIFIC_PERSONALIZATION,
  modelProfileForScene,
  profileCandidateAssets,
} from './modelProfiles.js';

/**
 * The release channel this build is on.
 *
 * **Changing this string does not open anything.** It used to: the gate read
 * `RELEASE_CHANNEL !== 'beta'` and fell through to "everything that is not a
 * prototype", so one edit here would have published twelve disease models —
 * with their numbers — past every check below, and a typo would have done it
 * silently. A channel is a name for a policy, not a policy.
 *
 * `RELEASE_POLICIES` holds the policies. `beta` is the only one that exists.
 * Ending the beta means writing the general-release policy and registering it
 * here, deliberately, with its own gates and its own tests — see
 * `docs/beta-release.md` §4.
 */
export const RELEASE_CHANNEL = 'beta';

/**
 * The organs the beta is aiming at.
 *
 * Descriptive, and deliberately not what decides anything: this used to be the
 * release rule — `organ ∈ BETA_ORGANS && status !== 'prototype'` — which is how
 * three heart disease models came to be published as "the heart". It is kept
 * because `tests/beta-release.test.js` runs that old rule against the gate, so
 * that restoring it fails loudly rather than quietly.
 */
export const BETA_ORGANS = Object.freeze(['brain', 'heart', 'lungs', 'liver']);

/**
 * The scenes the beta would open **if they pass**.
 *
 * `heart-anatomy` is listed and does not exist yet. That is the shape this list
 * is meant to have: the target is written down, the gate below answers "no"
 * until the scene is built and its record filed, and nothing is quietly
 * substituted for it in the meantime.
 */
export const BETA_ANATOMY_CANDIDATES = Object.freeze([
  'brain-anatomy',
  'heart-anatomy',
  // Added 2026-09-16, on the repository owner's decision to widen the beta a
  // few organs at a time rather than all at once. These three are procedural:
  // no external asset, so no licence obligation and nothing but the scene
  // revision to pin. Three others were examined in the same pass and are *not*
  // here — the stomach names three structures of eight from its opening view,
  // and the shoulder's run reported a real defect. Being gate-clear was never
  // the bar; see docs/follow-ups.md F-126 and F-127.
  //
  // **The kidney's reason has changed, and the old one was wrong.** It was
  // held here as exposing "only two click-reachable structures", measured by
  // counting where four tour points happened to land — two of them on the
  // right kidney, which is deliberately one structure. Swept with a pointer it
  // names **four**, and `SCENE_POINTS` now pins all four (F-126, resolved
  // 2026-09-17). What holds it is the one thing left in F-126: what the scene
  // should show on arrival, which is the owner's composition call and not a
  // defect. Do not re-reject it for the count.
  //
  // **An organ the landing hero cannot draw is not published.** Decided
  // 2026-09-16, after the knee ran into it: six points naming six distinct
  // structures, the best-measured scene of the six examined, and no hero model.
  //
  // It is a product rule, not a technical limit. The hero is the surface most
  // visitors meet first, and an organ that cannot appear there would be
  // published into a place nobody arrives at. `ORGAN_HERO_BUILDERS` therefore
  // bounds the release: brain, heart, lungs, liver and kidney are the organs
  // that have a model, four of them are open, and the kidney is held by the
  // composition question in F-126 rather than by anything it fails.
  //
  // `tests/beta-release.test.js` states it once and fails with the remedy in
  // the message — add a hero model, or do not publish the organ.
  //
  // The lung is not here either, and it was in this list until the hero drive
  // was run against it: at its opening pose the centre of the frame falls in
  // the gap between the two lungs, so the first Enter on the hero selects
  // nothing and only works after the reader turns the model. That is the
  // silent-Enter failure F-121 was about, on the surface most visitors meet
  // first. F-129 — **fixed**, which is why the lung is here now: Enter walks
  // outward from the centre when the centre is empty, so the gap between the
  // two lungs no longer swallows the first press.
  'lung-anatomy',
  'liver-anatomy',
]);

/**
 * The mechanism scenes the beta opens, named one at a time.
 *
 * Empty until 2026-09-22, when the repository owner decided that the beta
 * should stop being anatomy-only and asked for `cardiac-output` specifically.
 * It is a separate list rather than a wider rule because "any mechanism scene
 * whose records are in order" would open a dozen of them on one decision, and
 * the decision was about one.
 *
 * `cardiac-output` is what this list was opened for. What makes it the scene
 * this was possible with, rather than a general loosening:
 *
 * - it declares `general-education` and `medical-education`, and **not**
 *   `patient-explanation`, so the rule that a patient-facing mechanism needs a
 *   current clinical review does not apply to it and is not weakened for it;
 * - `personalization: representative` — it is a model of a circulation, not of
 *   anybody's;
 * - it prohibits diagnosis, treatment-selection, dose-selection and prognosis
 *   in its own profile, and the scope panel says so on screen;
 * - its boundary refuses an input outside the range it was swept over and
 *   reports **no figures at all** for a beat that did not settle, so the thing
 *   a reader is shown is never an unconverged number wearing units.
 *
 * **It has no clinical review, and this list does not pretend otherwise.**
 * The registry records it as `pending`, the scene carries its `alpha` badge and
 * a "医学レビュー：未完了" chip, and the publication decision below says in its
 * own words that no clinician has read the model. That is the same footing the
 * brain atlas is published on, extended — knowingly, by the owner — to a scene
 * that solves a mechanism. See the ADR.
 */
export const BETA_MECHANISM_CANDIDATES = Object.freeze(['cardiac-output']);

/**
 * The next release **adds to** this one rather than replacing it.
 *
 * The current beta publishes anatomy, which is why most of this catalogue
 * reports "not one of the scenes this release opens" rather than a failure. The
 * next one is meant to carry the thing this product is actually for — a
 * disease, with a professional view and a patient explanation of the same
 * solved state.
 *
 * **A scene already open on the beta stays open, on the decision it already
 * has.** The first version of this asked `brain-anatomy` for a second clinical
 * review and a second publication decision, which is two records for one
 * question and a way for them to disagree: the atlas is published today on a
 * review honestly labelled `pending`, and a channel that demanded a current one
 * would have *closed* it by being switched on. Inheritance is the fix, and it
 * is the reason `nextBetaPublicationProblems` checks the beta gate first.
 *
 * So this list is the **diseases only**. Anything the beta opens — the brain
 * today, the heart the day its assets and decision land — arrives by
 * inheritance and needs no entry here.
 *
 * **It is an allowlist, not a rule about status.** "Anything marked reviewed
 * gets published" is one mislabelled scene away from publishing a model nobody
 * decided to publish, and `reviewed` is a status a scene can reach without
 * anyone deciding it should be public.
 *
 * Nothing here is open today: each still lacks a current clinical review and a
 * publication decision, and the failures are the work list rather than an
 * error. **They open one at a time** — amyloid-beta and heart-failure can be
 * published without waiting for COPD's re-review or ischaemia's first one.
 */
export const NEXT_BETA_DISEASE_CANDIDATES = Object.freeze([
  'amyloid-beta',
  'heart-failure',
  // Behind the first two only by its review being stale rather than absent.
  'copd-hyperinflation',
  // Technically the equal of the three above — model profile, guide, both
  // views, the anatomy it points at — and behind them only in that no review
  // has been attempted.
  'myocardial-ischemia',
]);

/**
 * Publication decisions for the diseases above. Empty, and that is the point:
 * every candidate fails on this until somebody records one.
 *
 * Scenes inherited from the current beta are **not** listed here — they carry
 * the decision they were published on, in `BETA_PUBLICATION_DECISIONS`.
 *
 * @type {readonly object[]}
 */
export const NEXT_BETA_PUBLICATION_DECISIONS = Object.freeze([]);

/**
 * Maturity a scene needs before the beta will open it.
 *
 * `prototype` is excluded by name rather than by listing the ones that are
 * allowed, so that a status added later fails closed at the test rather than
 * silently joining the release.
 */
export const BETA_EXCLUDED_STATUS = 'prototype';

/**
 * What kind of check a publication decision was.
 *
 * Three separate things, and the reason they are a closed list is that the
 * weakest of them is the one this release actually has. An engineering
 * acceptance says the software names what it says it names; it does not say an
 * anatomist agreed with the labels, and it certainly does not say a clinician
 * signed the model. A record claiming `clinical` is checked against the review
 * registry below rather than believed.
 */
export const DECISION_ROLES = Object.freeze(['engineering', 'anatomy-expert', 'clinical']);

/**
 * The publication decisions this release rests on.
 *
 * One record per scene the beta opens. It is **not** a clinical sign-off and
 * must never be presented as one — the clinical-review registry owns that
 * question and currently answers "pending" for the brain atlas. What this
 * records is the separate decision the beta needs: that the structures this
 * scene names were checked against what is actually being served, by somebody
 * identified, in a stated role, on a stated date, over a stated scope, with the
 * evidence and the gaps written down.
 *
 * ## Pinned to two revisions, because there are two ways to change the model
 *
 * `assetRevisions` has to match `output.sha256` in the asset manifest: re-export
 * the mesh and the decision stops applying. But the mesh is only half of what a
 * reader is told. Which mesh is called what, and what a click selects, live in
 * the scene's own sources — so `sceneRevision` pins the model-card revision and
 * digest that `docs/model-cards/revisions.json` records for those sources.
 * Change the part correspondence with the same GLB and `revisions:check` fails,
 * the card is revised, the revision moves, and this decision closes.
 *
 * That pin is deliberately **scoped and per scene**. It covers the files that
 * decide what the model is, not the documentation, the copy or the stylesheet,
 * and a change to the brain says nothing about any other scene: a wording fix
 * somewhere in the repository must not expire a record it has nothing to do
 * with. `src/catalog/modelRevisions.js` says what is in scope and why.
 */
export const BETA_PUBLICATION_DECISIONS = Object.freeze([
  Object.freeze({
    sceneId: 'lung-anatomy',
    decidedAt: '2026-09-21',
    decidedBy: Object.freeze({
      name:
        "Repository owner's decision of 2026-09-16 for what this scene names; re-pinned 2026-09-21 by Claude Code (AI engineering agent) after the scene's opening colour mode changed, at the owner's direction",
      role: 'engineering',
    }),
    record: 'docs/beta-publication/lung-anatomy.md',
    /** Procedural geometry: no external asset, so nothing to pin but the scene. */
    assetRevisions: Object.freeze({}),
    sceneRevision: Object.freeze({ cardRevision: 14, modelDigest: '4fc91f9aa37cecc7' }),
    scope: Object.freeze({
      // Re-measured 2026-09-16. These four were measured against a safe-area
      // fit that approximated a perspective camera with an orthographic sum,
      // and under the exact solve all four were wrong with three hitting
      // nothing — the run reported `only 1 of 4 click(s) resolved`. The
      // fourth is still an airway rather than a fourth lobe, for the reason
      // the original four were chosen: a tour that crosses the tree between
      // the lungs says more than one that does not. At this framing the
      // sweep reaches the trachea rather than the left main bronchus.
      structures: Object.freeze([
        'Trachea',
        'Right upper lobe',
        'Left upper lobe',
        'Right middle lobe',
      ]),
      views: Object.freeze([
        'six authored viewpoints offered and one applied by the drive: anterior, posterior, right and left lateral, the right lung from its mediastinal surface, and a coronal section',
        'both colour modes — lobes-and-vessels and natural tissue — neither of which changes the selection',
      ]),
      interactions: Object.freeze([
        'a click names a structure and the panel gives it in both languages with a place in the hierarchy',
        'the part tree lists 83 structures and selection agrees in both directions',
        'a drag is not a click, including a drag that ends where it began',
        'a branch of the tree is hidden and shown again in one press: the pulmonary vessels, 34 structures, go in a single press',
        'isolation wins over a hide and over a viewpoint',
        'on the landing hero a keyboard names a structure on the first Enter, without turning the model first — which is what F-129 was about, and what held this scene back',
      ]),
    }),
    evidence: Object.freeze([
      'scripts/check-anatomy-interaction.mjs',
      'scripts/check-hero-input.mjs',
      'tests/organ-anatomy-scenes.test.js',
      'tests/beta-release.test.js',
      'tests/landing.test.js',
      'src/app/anatomyContract.js',
    ]),
    unverified: Object.freeze([
      'no anatomist has judged this geometry, its labels or their Japanese terminology — anatomyExpertReview is pending, the same footing the brain, heart and liver are published on',
      'no clinician has reviewed this scene; the registry records it as pending',
      '**the geometry is procedural, not specimen-derived** — the shapes are authored to be recognisable and correctly arranged, and nothing here is measured from a cadaver or a scan, so no dimension, proportion or surface detail is a measurement',
      'no label appeared on the model from the drive\u2019s angle, so the structure is named in the panel rather than on the mesh (F-40: one anchor point decides for the whole structure)',
      '79 of the 83 structures were not individually opened',
      'one browser engine, desktop only: no touch, Safari, Firefox or screen reader',
    ]),
  }),
  Object.freeze({
    sceneId: 'liver-anatomy',
    decidedAt: '2026-09-21',
    decidedBy: Object.freeze({
      name:
        "Repository owner's decision of 2026-09-16 for what this scene names; re-pinned 2026-09-21 by Claude Code (AI engineering agent) after the scene's opening colour mode changed, at the owner's direction",
      role: 'engineering',
    }),
    record: 'docs/beta-publication/liver-anatomy.md',
    assetRevisions: Object.freeze({}),
    sceneRevision: Object.freeze({ cardRevision: 14, modelDigest: '23d963c1a0bc641a' }),
    scope: Object.freeze({
      // Re-measured 2026-09-16, and the tour changed shape rather than just
      // moving: the safe-area fit stopped approximating a perspective camera,
      // which moved the model, and of the four this record was taken over two
      // then hit nothing and a third named its neighbour. The sweep at the
      // corrected framing finds four Couinaud segments and no gallbladder, so
      // this scope no longer claims the biliary system.
      structures: Object.freeze([
        'Segment VIII \u2014 Right anterior superior',
        'Segment VII \u2014 Right posterior superior',
        'Segment II \u2014 Left lateral superior',
        'Segment IVa \u2014 Left medial superior',
      ]),
      views: Object.freeze([
        'the authored viewpoints offered, one applied by the drive',
        'both colour modes, neither of which changes the selection',
      ]),
      interactions: Object.freeze([
        'a click names a structure and the panel gives it in both languages with a place in the hierarchy',
        'the part tree lists 27 structures and selection agrees in both directions',
        'a drag is not a click, including a drag that ends where it began',
        'a branch of the tree is hidden and shown again in one press',
        'isolation wins over a hide and over a viewpoint',
      ]),
    }),
    evidence: Object.freeze([
      'scripts/check-anatomy-interaction.mjs',
      'tests/organ-anatomy-scenes.test.js',
      'tests/beta-release.test.js',
      'src/app/anatomyContract.js',
    ]),
    unverified: Object.freeze([
      'no anatomist has judged this geometry, its labels or their Japanese terminology — anatomyExpertReview is pending',
      'no clinician has reviewed this scene; the registry records it as pending',
      '**the geometry is procedural, not specimen-derived** — the Couinaud segments are drawn as separable volumes in the right arrangement, not reconstructed from a specimen, so segment boundaries carry no measured accuracy',
      '**a Couinaud segment is a vascular territory, not a visible surface** — the divisions this model draws are a teaching convention; a real liver shows no such lines',
      '23 of the 27 structures were not individually opened',
      'one browser engine, desktop only: no touch, Safari, Firefox or screen reader',
    ]),
  }),
  Object.freeze({
    sceneId: 'heart-anatomy',
    decidedAt: '2026-09-21',
    decidedBy: Object.freeze({
      name:
        "Repository owner's approval of 2026-09-15 for what this scene names; re-pinned 2026-09-21 by Claude Code (AI engineering agent) after the scene's opening colour mode changed, at the owner's direction",
      role: 'engineering',
    }),
    record: 'docs/beta-publication/heart-anatomy.md',
    /**
     * Two files, and **neither hash is the publisher's**.
     *
     * Both sources fail glTF validation on degenerate vertex normals, and the
     * format gate takes zero errors at every scene status — so what is pinned
     * here is the derivative that repairs them and changes nothing else. The
     * adoption decision is docs/decisions/HEART-ASSET-ADOPTION.md and the
     * change is measured in docs/asset-qa/measurements/normal-repair.json.
     */
    assetRevisions: Object.freeze({
      'hubmap-vh-m-heart': '46d375e36d8181c161b70e1f0b8f0d778364f0a8414eebce4e4fda1cea73eb3d',
      'hubmap-vh-m-blood-vasculature': 'a95ff0825431953d8fff210cf29d9e65aeed5da55f623717ab613864a9435502',
    }),
    sceneRevision: Object.freeze({ cardRevision: 26, modelDigest: '20ae31ab7bafd24f' }),
    scope: Object.freeze({
      // The authored tour in `SCENE_POINTS`, not whatever a run measured: four
      // named parts at four recorded points, crossing both adopted files —
      // three great vessels from the vasculature file and a chamber from the
      // heart one, which the drive prints as their places in the hierarchy.
      //
      // Re-measured 2026-09-22, with the brain's and for the same reason: the
      // opening framing stopped being discarded (F-133), so the model moved.
      // The old fourth point named the left ventricle where it was authored
      // for the artery that runs across it.
      structures: Object.freeze([
        'Superior vena cava',
        'Arch of the aorta',
        'Ascending aorta',
        'Left atrium',
      ]),
      views: Object.freeze([
        'six authored viewpoints offered and one applied by the drive: anterior, posterior, left and right lateral, from the base, from the apex',
        'both colour modes, neither of which changes the selection',
      ]),
      interactions: Object.freeze([
        'a click names a structure and the panel gives it in both languages with a place in the hierarchy',
        'the part tree lists 46 structures and selection agrees in both directions',
        'a drag is not a click, including a drag that ends where it began',
        'a branch of the tree is hidden and shown again in one press, and by V on the focused branch',
        'the six structures the scene opens with hidden come back with the branch, as Unhide all returns them',
        'isolation wins over a hide and over a viewpoint, so isolating a hidden structure shows it rather than blanking the model',
        'the two files were measured to share one coordinate frame; one offset and one uniform scale are applied to the pair',
        'the landing hero reaches this scene with a keyboard: Tab focuses the model, Enter names the structure in front of it, Escape lets go, Enter after turning names a different one, and the card hands that structure to the full model — driven on the heart by verify:hero-input, which was taught the same day to repeat its keyboard pass for every published organ rather than only the first in the rotation',
      ]),
    }),
    evidence: Object.freeze([
      'scripts/check-anatomy-interaction.mjs',
      'scripts/check-hero-input.mjs',
      'scripts/repair-candidate-gltf.mjs',
      'docs/asset-qa/measurements/normal-repair.json',
      'docs/asset-qa/heart-hubmap-vh-m-heart.md',
      'docs/asset-qa/heart-hubmap-vh-m-blood-vasculature.md',
      'docs/decisions/HEART-ASSET-ADOPTION.md',
      'public/assets/heart/ATTRIBUTION.md',
      'tests/heart-anatomy.test.js',
      'tests/organ-anatomy-scenes.test.js',
      'src/app/anatomyContract.js',
    ]),
    /** Stated, not implied. An empty list here would itself be a claim. */
    unverified: Object.freeze([
      'no anatomist has judged this geometry, its labels or their Japanese terminology — anatomyExpertReview is pending, the same footing the brain is published on',
      'no clinician has reviewed this scene; the registry records it as pending',
      '42 of the 46 structures were not individually opened',
      'one browser engine, desktop only: no touch, Safari, Firefox or screen reader',
      'the underlying Visible Human Male terms were read through secondary sources only — nlm.nih.gov was unreachable, so the NLM acknowledgment is given rather than reasoned away',
      'the source has no myocardial free wall as a named part, so no wall thickness is claimed',
      'whether a chamber surface stands for the cavity or for the wall around it is not established by the file',
      'VH_M_left_anterior_descending_artery carries FMA:8636, which names a pulmonary branch; it is surfaced to the reader rather than relabelled',
    ]),
  }),
  Object.freeze({
    sceneId: 'brain-anatomy',
    decidedAt: '2026-09-19',
    /** Who, and in what capacity. A role is a claim, and it is checked. */
    decidedBy: Object.freeze({
      name: 'Claude Code (AI engineering agent), re-taken for a deeper green parietal lobe and the red it is read against',
      role: 'engineering',
    }),
    record: 'docs/beta-publication/brain-anatomy.md',
    assetRevisions: Object.freeze({
      'brain-atlas-glb': '76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453',
    }),
    sceneRevision: Object.freeze({ cardRevision: 33, modelDigest: 'd62c3881d2d2905a' }),
    /** What was actually exercised. Not a plan — a list of what was done. */
    scope: Object.freeze({
      // Re-measured on 2026-09-15 and corrected. The first two of the four
      // recorded here were wrong: the tour's points are canvas fractions, the
      // layout moved under them over the week after they were written, and one
      // point had come off the model entirely. `SCENE_POINTS` now names these
      // four and `verify:anatomy` fails if a point names anything else — see
      // docs/beta-publication/brain-anatomy.md, which states what was wrong
      // rather than quietly showing the new values.
      // Re-measured 2026-09-16, the second time this scene's tour has gone
      // stale. The first was layout drift found a week late; this one is the
      // safe-area fit being corrected from an orthographic sum to an exact
      // perspective solve, which moved every model and was caught on the
      // first run. Three of the four points were wrong and two of those had
      // come to name the same structure, so the scope below would have
      // claimed four distinct parts that a run could only show three of.
      // Re-measured 2026-09-22, the third time. Same cause as the second and
      // the opposite direction: the scene had gone back to opening at a
      // framing it abandons the moment anything re-frames it (F-133), and
      // fixing that moved the model again — this time towards filling the
      // frame. The fourth point had been naming "Orbital gyri" where it is
      // authored for its neighbour, under both framings, because it was last
      // measured three framing changes ago.
      structures: Object.freeze([
        'Middle frontal gyrus',
        'Superior parietal lobule',
        'Inferior frontal sulcus',
        'Supramarginal gyrus',
      ]),
      views: Object.freeze([
        'left-lateral (applied by the interaction drive)',
        'all eight named viewpoints rendered in both colour modes at one camera each; the six that existed before this work were rendered before and after it (docs/screenshots/b3-1/)',
        'for the 2026-09-19 colour re-take: all eight viewpoints re-rendered in colour-map mode and read, with superior and left-lateral also rendered on the previous palette to compare; natural-anatomy mode was not re-rendered because its shades did not change',
        'for the 2026-09-20 colour-vision re-take: the eight viewpoints re-rendered again, and left-lateral and superior also written out as a deuteranope and a protanope see them (shots:anatomy --cvd) — a simulation, not a reader',
        'for the 2026-09-20 rebalance: the eight viewpoints re-rendered once more, each also written out under deuteranopia and protanopia, after a reader reported that the parietal lobe edge had stopped reading',
        'for the 2026-09-21 restoration of red and green: the eight viewpoints re-rendered again with their dichromacy simulations, after a reader reported that the map had lost its colour',
        'for the 2026-09-21 LCh redesign: the eight viewpoints re-rendered once more with their dichromacy simulations, after a reader reported that the set did not read as one palette',
        'for the 2026-09-21 red frontal lobe: the eight viewpoints re-rendered again with their dichromacy simulations, the central sulcus being a red-against-green boundary and therefore carried by lightness',
        'for the 2026-09-21 deeper green: the eight viewpoints re-rendered once more, after a reader read the parietal lobe as mint rather than green; how far the green could be taken was decided by where the central sulcus collapses under simulated protanopia',
      ]),
      interactions: Object.freeze([
        'click pins a structure and the panel names it in both languages',
        'click on empty space clears, and a structure can be selected again',
        'a drag that ends over another structure does not reselect',
        'a drag that ends where it began does not select either — the press is measured by how far the pointer ever got from it, not only by where it let go',
        'a keyboard reaches the model with Tab, names the structure in the middle of the frame with Enter, and lets go of it with Escape; turning the model with the arrows and asking again names a different structure',
        'a route may carry the structure it opens on, and the model opens selected on it rather than on its authored pose alone',
        'switching colour mode does not change the selection',
        'applying a named viewpoint does not change the selection',
        'the part tree lists 271 structures, and selection agrees in both directions',
        'isolate shows one structure, hidden structures are not clickable, and Show all restores the model',
        'a pointer crossing the model does not rewrite the pinned summary or its controls',
        'the tree answers the keyboard: one tab stop, arrows move focus, Enter commits, and the keys do not reach the scene',
        'every branch announces the expanded state it is drawn in, including one opened by a 3D selection',
        'on a 375x667 phone the parts sheet opens, takes focus, closes on Escape, returns focus, and keeps the selection, the open branches and the scroll position',
        'replacing the atlas clears the panels rather than leaving the old model named in them',
        'a medial view draws the midline block rather than a hollow shell, and the layer slider still ghosts the enclosing white matter as depth is asked for',
        'an annotation is drawn only where the structure it names is the first thing on the ray, and hiding one leaves the selection it names untouched',
        'each annotation is anchored on the outside of its own structure rather than at the centre of its bounding box',
        'a viewpoint is fitted to the band the header, console and docked panel leave, against the bounds of what is actually drawn',
        'a structure can be found by either of its names and selected from the result, by the same id the tree and the model use',
        'the search returns every match and says how many matched; the results answer the keyboard and mark the pinned structure',
        'the search index is rebuilt when the atlas arrives or is replaced, and on a phone the first Escape clears the search rather than closing the sheet',
        'the pinned structure is named on the model as well as in the panel — anchored on the exact point a tap hit, or, for a selection made without one, the first of the structure\'s ranked candidate points the live camera can see; exempt from the per-frame label limit; and a landmark that names the same structure steps aside instead of duplicating it',
        'going to a structure, bringing it into view and hiding it are three separate actions; each reports what it changed and offers the way back',
        'a hidden structure stays hidden through a colour change, a viewpoint and a layer move, leaves the picker and stops occluding a label, and stays selected',
        'a hidden structure\'s own label goes with it rather than being held over what is behind it',
        'a whole branch of the tree is hidden and shown again in one press, and by V on the focused branch, writing to the same hidden set one structure\'s Hide writes to',
        'hiding the isolated structure announces the isolation as over, and a hide the reader made themselves withdraws the reveal\'s way back rather than offering to undo their own change',
      ]),
    }),
    evidence: Object.freeze([
      'scripts/check-anatomy-interaction.mjs',
      // What a finger gets, which is not what a pointer gets: it is where the
      // out-and-back press was found, and it is re-runnable.
      'scripts/check-hero-input.mjs',
      'tests/tap-gesture.test.js',
      'src/app/anatomyContract.js',
      'src/components/AnatomyPanel.js',
      'tests/anatomy-contract.test.js',
      'tests/brain-anatomy.test.js',
      'tests/anatomy-colour-ui.test.js',
      // The selection label's cap exemption, its muted-landmark styling and its
      // landmark-merge rule — see docs/verification-lessons.md L-46. Also
      // guards the three defects a review found in that fix: an unchanged id
      // discarding a changed anchor, the cap not counting the selection, and
      // a captured anchor not reanchoring once occluded.
      'tests/label-layer.test.js',
      // The scene-side half of the same three guards: a re-tap's new point,
      // and `reanchor()` swapping in a visible candidate for an occluded one.
      'tests/brain-anatomy-selection-label.test.js',
      'docs/asset-qa/brain-atlas-glb.md',
      'public/assets/brain/ATTRIBUTION.md',
      'docs/screenshots/b3-1/README.md',
      'docs/screenshots/f37/README.md',
      'docs/screenshots/x1/README.md',
      'docs/anatomy-review.md',
    ]),
    /** Stated, not implied. An empty list here would itself be a claim. */
    unverified: Object.freeze([
      '267 of the 271 selectable structures were not individually opened',
      'no label was checked against a reference atlas — that is an anatomist\'s judgement',
      'deep structures behind the anatomical-layer slider were not exercised',
      'one browser engine, desktop only: no touch, Safari, Firefox or screen reader',
      'no clinical review — the registry records this scene as pending',
      'the anatomy/CG quality bar for the beta (B3) is measured only for what the fixed views show; nothing here is an anatomical judgement',
      'whether the cerebellum should show folia was not settled — it is a question about the source mesh (F-38)',
      'the posterior and inferior viewpoints were rendered and read by an engineer; no anatomist has confirmed what they show',
      'no reader with colour-vision deficiency has used this scene — the palette clears floors measured against a simulation of dichromacy, which is a model of what someone sees rather than a report from one, and those floors are a deliberate partial measure (ΔE 4-5) chosen over higher ones that cost the central sulcus',
      'inside one colour family the structures are separated by lightness and saturation, which dichromacy compresses: that separation is not claimed for those readers, and anomalous trichromacy at partial severity and monochromacy are unmeasured',
    ]),
  }),

  /**
   * The first mechanism scene the beta opens, and the first decision that has
   * to say so in its own words.
   *
   * The role is `engineering`, which here means what it has always meant: the
   * software puts on screen what the model solved, and every surface reads the
   * same solved beat. It is **not** a statement that the physiology is right
   * for teaching, and the record says so at the top rather than at the bottom.
   */
  Object.freeze({
    sceneId: 'cardiac-output',
    decidedAt: '2026-09-22',
    decidedBy: Object.freeze({
      name:
        "Repository owner's decision of 2026-09-22 to publish this scene and to stop the beta being anatomy-only; " +
        'carried out and recorded by Claude Code (AI engineering agent)',
      role: 'engineering',
    }),
    record: 'docs/beta-publication/cardiac-output.md',
    /** Procedural geometry: no external asset, so nothing to pin but the scene. */
    assetRevisions: Object.freeze({}),
    // Re-pinned twice on 2026-09-22, both times after the gate closed on the
    // old pin — which is the mechanism working: it cannot tell a new
    // measurement from a changed model, so it stops and asks.
    //
    // Revision 6 added diagnostics only (a per-compartment flow balance, and
    // the same balance over a twenty-fourth of the beat, which is what catches
    // a mis-wired loop). Every figure was bit-identical.
    //
    // **Revision 7 changed a displayed number**, and that is why this comment
    // is longer than the last one. End-diastolic pressure is now read at
    // mitral-valve closure instead of at the sample of highest volume. The old
    // definition was ill-conditioned where it is used — volume on a plateau,
    // pressure on the isovolumic upstroke — and did not converge: 17.67 /
    // 16.25 / 15.69 / 15.46 mmHg at 240 / 480 / 960 / 1920 steps per beat at
    // one corner, still moving. Read at closure the same four give 15.275 to
    // 15.295. Filling pressure fell by up to 1.4 mmHg across the scene's
    // range, and by 0.009 mmHg at the reference; nothing else moved.
    //
    // This is a correction to a figure a reader is shown, not a presentation
    // change, so the decision record says what moved and by how much rather
    // than reporting a pin that happened to pass.
    sceneRevision: Object.freeze({ cardRevision: 9, modelDigest: 'f635134f0823ca1c' }),
    scope: Object.freeze({
      structures: Object.freeze([
        'the left ventricle, built from the solved end-diastolic and end-systolic volumes rather than posed',
        'the mitral and aortic valves, opening on the solved cycle',
        'ejected and residual blood, drawn from the same beat',
        'the systemic circuit — an explicitly schematic loop, with the arteriolar resistance marked as a zone and one node standing for the right heart and the lungs',
      ]),
      views: Object.freeze([
        'the 3D scene at its opening pose and under comparison, where the baseline heart is drawn beside the current one',
        'the Data view, with the pressure-volume loop and the pressure waveform both drawn',
        'the metric read-out, including the reference rows comparison adds',
        'the 15-second sequence, recorded through the consent screen and played back from the written file',
      ]),
      interactions: Object.freeze([
        'each of the four controls moved across its declared range and reset',
        'both presets, and both interventions, including clearing one',
        'the lesson walked end to end, with its before/after table read on screen',
        'model reset returning the scene to the state it opened in',
      ]),
    }),
    evidence: Object.freeze([
      'docs/model-cards/cardiac-output.md',
      'docs/model-evidence/cardiac-output.md',
      'docs/beta-publication/cardiac-output.md',
      'docs/architecture/adr-2026-09-22-mechanism-scene-in-beta.md',
      'scripts/sweep-cardiac-output.mjs',
      'scripts/check-disease-interaction.mjs',
      'tests/cardiac-output-model.test.js',
      'tests/cardiac-output-physiology.test.js',
      'tests/cardiac-output-scene.test.js',
      'tests/cardiac-output-interventions.test.js',
      'tests/cardiac-output-learning.test.js',
    ]),
    /** Stated, not implied. An empty list here would itself be a claim. */
    unverified: Object.freeze([
      'no clinical review — the registry records this scene as pending, and no clinician has read the model, its reference condition, its presets, its intervention magnitudes or its wording',
      'no physiologist has read it either; nothing here is an external validation',
      'the reference condition is a calibration chosen so a healthy case lands where textbooks put it, not a measurement',
      'the reduced-contractility preset and both intervention magnitudes are illustrative; the cited dobutamine study\'s effect sizes are not transferable to this model\'s parameters and are not claimed',
      'the dobutamine source was read as its published abstract only — the full text was not read',
      'no reflex regulation is modelled, so "change one thing" is the model\'s response and not a person\'s',
      'whether the edges of the declared domain are sensible teaching, as opposed to merely solvable, is open (F-180)',
      'one browser engine on a desktop viewport: no real iPhone Safari, and no Firefox or WebKit recording (F-184)',
      'on a phone the 3D sits under the console, the same way heart-failure does (F-188)',
      'no reader has been observed using it; whether four controls at once is the right number to hand somebody is unanswered',
    ]),
  }),
]);

const nonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const nonEmptyStrings = (value) => Array.isArray(value) && value.length > 0 && value.every(nonEmptyString);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Everything missing or unsupportable in a publication decision.
 *
 * A record that says only "this scene, this hash" is not a decision anybody can
 * audit: it does not say who looked, what they looked at, or what they did not
 * look at. Each field below closes one of those, and the role check closes the
 * one that matters most — a record cannot promote itself to a clinical sign-off
 * that the review registry does not have.
 *
 * @param {object|null} decision
 * @param {object} scene
 * @param {{fileExists?: (path:string) => boolean, hasReview?: (scene:object) => boolean}} [options]
 * @returns {string[]}
 */
export function publicationDecisionProblems(decision, scene, { fileExists, hasReview = hasCurrentClinicalReviewState } = {}) {
  const problems = [];
  if (!decision) return ['has no publication decision on file for this release'];

  const exists = (path) => (fileExists ? fileExists(path) : true);

  if (!ISO_DATE.test(decision.decidedAt ?? '')) {
    problems.push(`the publication decision has no decision date (got "${decision.decidedAt}")`);
  }

  const by = decision.decidedBy;
  if (!by || typeof by !== 'object') {
    problems.push('the publication decision does not say who took it, or in what role');
  } else {
    if (!nonEmptyString(by.name)) problems.push('the publication decision does not name who took it');
    if (!DECISION_ROLES.includes(by.role)) {
      problems.push(`the publication decision claims the role "${by.role}", which is not one of ${DECISION_ROLES.join(', ')}`);
    }
    // The one claim a record must not be able to make about itself.
    if (by.role === 'clinical' && !hasReview(scene)) {
      problems.push(
        'the publication decision claims a clinical role, and the review registry has no current clinical review ' +
          'for this scene. A decision cannot promote itself to a sign-off.'
      );
    }
  }

  if (!isRepositoryPath(decision.record ?? '')) {
    problems.push('the publication decision names no record document');
  } else if (!exists(decision.record)) {
    problems.push(`the publication decision names the record "${decision.record}", which does not exist`);
  }

  const scope = decision.scope;
  if (!scope || typeof scope !== 'object') {
    problems.push('the publication decision records no scope — what was checked is not written down');
  } else {
    for (const key of ['structures', 'views', 'interactions']) {
      if (!nonEmptyStrings(scope[key])) {
        problems.push(`the publication decision's scope does not say what ${key} were checked`);
      }
    }
  }

  if (!nonEmptyStrings(decision.evidence)) {
    problems.push('the publication decision cites no evidence');
  } else {
    for (const path of decision.evidence) {
      if (!isRepositoryPath(path)) problems.push(`the publication decision cites "${path}", which is not a repository path`);
      else if (!exists(path)) problems.push(`the publication decision cites "${path}", which does not exist`);
    }
  }

  // Present, and allowed to be empty only by saying so — an absent field reads
  // as "nothing was left unchecked", which is a claim nobody made.
  if (!Array.isArray(decision.unverified) || decision.unverified.some((line) => !nonEmptyString(line))) {
    problems.push('the publication decision does not state what it did not check');
  }

  return problems;
}

/**
 * A scene whose model profile claims structure and nothing more.
 *
 * This is what "anatomy" means to the gate. It is read off the profile — the
 * registry that already says what kind of claim each scene makes — rather than
 * off the scene's id or its organ, because a name is not a claim.
 *
 * @param {object|null} scene a catalogue entry
 * @param {{profiles?: object[]}} [options]
 * @returns {string[]} the reasons it is not an anatomy-only scene
 */
export function anatomyClaimProblems(scene, { profiles } = {}) {
  const problems = [];
  if (scene?.disease) problems.push(`is about "${scene.disease}", and the beta opens anatomy only`);

  const profile = profiles ? modelProfileForScene(scene, profiles) : modelProfileForScene(scene);
  if (!profile) {
    problems.push('has no model profile, so what it claims is not written down anywhere a test can read');
    return problems;
  }
  if (profile.mechanismLevel !== MECHANISM_LEVEL.NONE) {
    problems.push(`claims mechanism level "${profile.mechanismLevel}"; anatomy claims "${MECHANISM_LEVEL.NONE}"`);
  }
  if (PATIENT_SPECIFIC_PERSONALIZATION.includes(profile.personalization)) {
    problems.push(`is personalised (${profile.personalization}); the beta publishes representative models only`);
  }
  for (const use of profile.intendedUses ?? []) {
    if (CLINICAL_INTENDED_USES.includes(use)) problems.push(`declares the clinical use "${use}"`);
  }
  return problems;
}

/**
 * A scene that may solve a mechanism, and still may not do the other things.
 *
 * This is `anatomyClaimProblems` with exactly one line removed — the one that
 * refuses a mechanism claim — and one added, which is the reason removing it is
 * safe. Everything else is the same object, checked the same way, off the same
 * registry.
 *
 * **The added line is the load-bearing one.** A scene addressed to a patient is
 * a scene somebody may read about their own illness, and the next release
 * already refuses to publish one of those on a review that is not current. That
 * rule does not get a hole cut in it here: a mechanism candidate that declares
 * `patient-explanation`, or that ships a patient view, needs the same current
 * review it would need there. What the beta may now publish without one is a
 * mechanism addressed to a learner, badged with the review state it has.
 *
 * Note what is *not* here: `scene.disease`. A disease model is not refused by
 * name any more — it is refused by the two lists, because it is not on one.
 *
 * @param {object|null} scene a catalogue entry
 * @param {{profiles?: object[], hasReview?: (scene:object) => boolean,
 *   resolveReview?: (scene:object) => object|null}} [options]
 * @returns {string[]} the reasons this scene may not be published as a mechanism
 */
export function mechanismClaimProblems(scene, {
  profiles,
  hasReview = hasCurrentClinicalReviewState,
  resolveReview = clinicalReviewStateForScene,
} = {}) {
  const problems = [];
  const profile = profiles ? modelProfileForScene(scene, profiles) : modelProfileForScene(scene);
  if (!profile) {
    problems.push('has no model profile, so what it claims is not written down anywhere a test can read');
    return problems;
  }
  if (PATIENT_SPECIFIC_PERSONALIZATION.includes(profile.personalization)) {
    problems.push(`is personalised (${profile.personalization}); the beta publishes representative models only`);
  }
  for (const use of profile.intendedUses ?? []) {
    if (CLINICAL_INTENDED_USES.includes(use)) problems.push(`declares the clinical use "${use}"`);
  }

  const forPatients = (profile.intendedUses ?? []).includes(INTENDED_USE.PATIENT_EXPLANATION) || scene?.patient === true;
  if (forPatients && !hasReview(scene)) {
    const state = resolveReview(scene)?.reviewStatus ?? 'no record';
    problems.push(
      `its clinical review is "${state}", and it explains a mechanism to a patient, ` +
        'which a scene cannot do on a review that is not current'
    );
  }
  return problems;
}

/**
 * Everything standing between a scene and the beta, as readable lines.
 *
 * Returned rather than thrown so the tests, the handoff and a dev-mode console
 * check all read the same answer. Empty means open.
 *
 * Every record it consults is injectable. That is not generality for its own
 * sake: a gate whose failure paths cannot be exercised is a gate nobody knows
 * the shape of, and the cases that matter here — an unknown status, a missing
 * profile, an asset whose licence is not settled, a decision taken against a
 * file that has since been re-exported — are all conditions the real registries
 * do not currently contain and must never silently start opening.
 *
 * @param {object|string|null} candidate a catalogue entry or a scene id
 * @param {{fileExists?: (path:string) => boolean, profiles?: object[],
 *   resolveScene?: (id:string) => object|null,
 *   resolveAsset?: (id:string) => object|null,
 *   resolveReview?: (scene:object) => object|null,
 *   resolveRevision?: (scene:object) => {cardRevision:number, modelDigest:string}|null,
 *   hasReview?: (scene:object) => boolean,
 *   decisions?: ReadonlyArray<object>}} [options] `fileExists` is injected so
 *   the catalogue layer stays free of `node:fs`; without it a recorded path is
 *   taken at its word, which is all a browser can do.
 * @returns {string[]}
 */
export function betaPublicationProblems(candidate, options = {}) {
  const id = typeof candidate === 'string' ? candidate : candidate?.id;

  // Membership is checked here and nowhere else, and there is no option that
  // relaxes it. `betaPublicationGap` below reports on scenes that are *not*
  // members, and it does so by calling the same body with this line prepended
  // rather than by asking for it to be skipped — so nothing can ever ask this
  // module whether a scene would be open if only it were listed and receive an
  // empty answer.
  if (!BETA_ANATOMY_CANDIDATES.includes(id) && !BETA_MECHANISM_CANDIDATES.includes(id)) {
    return [`"${id ?? '(no id)'}" is not one of the scenes this release opens`];
  }

  return publicationRecordProblems(id, options);
}

/**
 * The gate minus the one line that says whether the scene is on the list.
 *
 * Split out for `betaPublicationGap`, which needs to ask "and what else?" of a
 * scene the release does not open. It is not exported: answering that question
 * without the membership line attached is exactly the answer this module must
 * not hand out.
 *
 * @param {string} id
 * @param {object} [options] as `betaPublicationProblems`
 * @returns {string[]}
 */
function publicationRecordProblems(id, {
  fileExists,
  profiles,
  resolveScene = sceneById,
  resolveAsset = assetById,
  resolveReview = clinicalReviewStateForScene,
  resolveRevision = sceneRevisionPin,
  hasReview = hasCurrentClinicalReviewState,
  decisions = BETA_PUBLICATION_DECISIONS,
} = {}) {
  const problems = [];

  const scene = resolveScene(id);
  if (!scene) return [`"${id}" is not registered in the catalogue`];

  if (!STATUS_IDS.includes(scene.status)) {
    problems.push(`status "${scene.status}" is not a status the taxonomy defines`);
  } else if (scene.status === BETA_EXCLUDED_STATUS) {
    problems.push("is a Prototype, whose shape and motion are provisional by definition");
  }

  // Which claim rule applies is decided by which list the scene is on, and by
  // nothing else — not by its organ, not by its name, and not by what its
  // profile happens to say. A scene that drifted from structure to mechanism
  // while staying on the anatomy list must close the gate, which is what makes
  // `anatomyClaimProblems` worth keeping unchanged.
  problems.push(
    ...(BETA_MECHANISM_CANDIDATES.includes(id)
      ? mechanismClaimProblems(scene, { profiles, hasReview, resolveReview })
      : anatomyClaimProblems(scene, { profiles }))
  );

  const profile = profiles ? modelProfileForScene(scene, profiles) : modelProfileForScene(scene);
  const assetIds = profile?.assets ?? [];

  // A candidate is a file being examined (`src/catalog/devAssets.js`): pinned
  // and hash-verified, but not in the asset manifest, not licence-assessed, not
  // QA'd and not even committed. There is nothing here for the asset release
  // gate to read, so the answer is no — stated as its own line rather than as a
  // silent consequence of the manifest lookup failing.
  for (const candidateId of profileCandidateAssets(profile)) {
    problems.push(
      `rests on candidate asset "${candidateId}", which is under examination and has passed no asset release gate`
    );
  }
  for (const assetId of assetIds) {
    const asset = resolveAsset(assetId);
    if (!asset) {
      problems.push(`names asset "${assetId}", which is not in the asset manifest`);
      continue;
    }
    problems.push(
      ...assetReleaseProblems(asset, { sceneStatus: scene.status, fileExists })
    );
  }

  // A sign-off that has been overtaken by the files it covered must never be
  // shown as current. `pending` is allowed: the beta does not claim a clinical
  // review, and the surfaces say "pending" where it is.
  const review = resolveReview(scene);
  if (review?.reviewStatus === 'stale') {
    problems.push('its clinical review is stale, so its sign-off cannot be presented as current');
  }

  const decision = decisions.find((entry) => entry.sceneId === id) ?? null;
  problems.push(...publicationDecisionProblems(decision, scene, { fileExists, hasReview }));
  if (decision) {
    const recorded = decision.assetRevisions ?? {};
    for (const assetId of assetIds) {
      const asset = resolveAsset(assetId);
      const current = asset?.output?.sha256;
      if (!(assetId in recorded)) {
        problems.push(`the publication decision does not cover asset "${assetId}"`);
      } else if (!current || recorded[assetId] !== current) {
        problems.push(
          `the publication decision was taken against ${assetId}@${recorded[assetId]}, and the manifest now ` +
            `records ${current ?? 'no hash'}`
        );
      }
    }
    for (const assetId of Object.keys(recorded)) {
      if (!assetIds.includes(assetId)) {
        problems.push(`the publication decision names asset "${assetId}", which the scene no longer uses`);
      }
    }

    // The other half of "which model was this decided about". The mesh can stay
    // byte-identical while the part correspondence or the selection behaviour
    // changes underneath it, and a reader would be told something nobody
    // checked. `revisions.json` already notices that change; this makes the
    // release notice it too.
    const pin = decision.sceneRevision;
    const current = resolveRevision(scene);
    if (!pin || typeof pin !== 'object') {
      problems.push('the publication decision is not pinned to a scene revision');
    } else if (!current) {
      problems.push('the scene has no entry in the model-card revision registry to pin a decision to');
    } else if (pin.cardRevision !== current.cardRevision || pin.modelDigest !== current.modelDigest) {
      problems.push(
        `the publication decision was taken against scene revision ${pin.cardRevision}@${pin.modelDigest}, and the ` +
          `registry now records ${current.cardRevision}@${current.modelDigest} — the part correspondence or the ` +
          'selection behaviour changed after the decision'
      );
    }
  }

  return problems;
}

/**
 * The finished organ models the beta does not open, and what is left for each.
 *
 * **The number this exists to print: the beta publishes two organs, and it is
 * not because the others are unfinished.** Thirty-seven scenes make an
 * anatomy-only claim, all are `alpha`, and none rests on an external asset —
 * so for most of them the entire distance to the public build is a record
 * nobody has written, not geometry nobody has built. Read off
 * `BETA_ANATOMY_CANDIDATES` alone that is invisible: a short list looks like a
 * short list of *ready* scenes. This is the same move `anatomyGap()` makes for
 * the A-scale — the gap is a number the test suite prints rather than a
 * paragraph somebody has to remember.
 *
 * **Nothing here publishes anything, and nothing here reports a scene as
 * ready.** Every row keeps the membership line, because being on the list is
 * itself the decision: opening an organ to the public is a judgement about what
 * this product claims, and it is taken by editing `BETA_ANATOMY_CANDIDATES`
 * and filing a record under `docs/beta-publication/`, never by a survey
 * concluding that the paperwork is the only thing missing. So `remaining`
 * counts what is left *besides* that decision, and `decisionIsAllThatIsLeft`
 * says only that — not that the decision should be taken.
 *
 * A scene qualifies for a row by making an anatomy claim and no more, read off
 * its model profile exactly as the gate reads it. Nothing is matched by name:
 * "it is called `…-anatomy`" is not a claim about what a scene asserts.
 *
 * @param {object} [options] as `betaPublicationProblems`
 * @returns {Array<{sceneId: string, status: string, problems: string[],
 *   remaining: string[], decisionIsAllThatIsLeft: boolean}>}
 */
export function betaPublicationGap(options = {}) {
  const { scenes = SCENES } = options;
  // A supplied catalogue has to be the one the gate is asked about too.
  //
  // It was not: rows were filtered and labelled from `scenes` while
  // `publicationRecordProblems` resolved the id through the global catalogue.
  // Hand it a clone of `lung-anatomy` marked `prototype` and the row said
  // `status: 'prototype'` and `decisionIsAllThatIsLeft: true` — the prototype
  // refusal missing, because the gate had been asked about the real alpha
  // scene. A survey whose own injection point disagrees with its answers is
  // worse than one that has none.
  //
  // `resolveScene` passed by the caller still wins; this only supplies the
  // default that matches `scenes`.
  const supplied = new Map(scenes.map((scene) => [scene.id, scene]));
  const resolveScene =
    options.resolveScene ?? ((id) => supplied.get(id) ?? sceneById(id));
  return scenes
    .filter((scene) => !BETA_ANATOMY_CANDIDATES.includes(scene.id))
    .filter((scene) => anatomyClaimProblems(scene, options).length === 0)
    .map((scene) => {
      const remaining = publicationRecordProblems(scene.id, { ...options, resolveScene });
      return {
        sceneId: scene.id,
        status: scene.status,
        problems: [notOnTheListLine(scene.id), ...remaining],
        remaining,
        // `[].every()` is true, and an empty `remaining` means the opposite
        // of what this field would then say: the record is already filed and
        // the list edit is the whole distance. That cannot happen today —
        // every decision on file is for a scene on the list — so it is guarded
        // rather than described, and `problems` still carries the real answer.
        decisionIsAllThatIsLeft:
          remaining.length > 0 && remaining.every(isMissingDecisionLine),
      };
    });
}

/** The one line every gap row carries, worded as the gate words it. */
const notOnTheListLine = (id) => `"${id}" is not one of the scenes this release opens`;

/**
 * Whether a remaining line is only "no decision has been taken".
 *
 * Matched against what `publicationDecisionProblems` says for a missing
 * record rather than by a substring guess, so that rewording the gate cannot
 * quietly turn some other failure into "just paperwork".
 */
const MISSING_DECISION_LINES = Object.freeze(
  publicationDecisionProblems(null, { id: '(none)', status: 'alpha' })
);
const isMissingDecisionLine = (line) => MISSING_DECISION_LINES.includes(line);


/**
 * Why this scene is not open on the **next** release. Empty means open.
 *
 * **The beta gate is asked first, and passing it is enough.** That is what
 * makes this channel a superset: every scene the current release publishes
 * stays published, on the decision it was published with, and switching the
 * channel can only ever add. A scene that has already been decided is not asked
 * to be decided again — two records for one question is how they come to
 * disagree.
 *
 * A scene that is *not* already open has to be a registered disease candidate
 * and clear a bar the beta does not set. The beta publishes anatomy whose
 * review is honestly labelled `pending` on screen; a scene that solves a
 * mechanism and explains it to a patient cannot be published on "pending".
 * `stale` is refused for the same reason it is refused on the beta, and
 * `legacy-unversioned` because a review nobody can point at is not a review.
 *
 * The rest is the beta's list: a model profile, released assets with their
 * obligations discharged, a publication decision pinned to both the asset
 * hashes and the scene revision, a recorded scope — and, here, both halves of
 * the experience the release exists for. It fails closed on each, and each
 * candidate opens on its own: amyloid-beta does not wait for COPD.
 *
 * @param {object|string|null} candidate
 * @param {object} [options]
 * @returns {string[]}
 */
export function nextBetaPublicationProblems(candidate, {
  fileExists,
  profiles,
  resolveScene = sceneById,
  resolveAsset = assetById,
  resolveReview = clinicalReviewStateForScene,
  resolveRevision = sceneRevisionPin,
  hasReview = hasCurrentClinicalReviewState,
  decisions = NEXT_BETA_PUBLICATION_DECISIONS,
  candidates = NEXT_BETA_DISEASE_CANDIDATES,
  authoredGuideIds = PATIENT_GUIDE_SCENE_IDS,
  inherits = betaPublicationProblems,
} = {}) {
  const id = typeof candidate === 'string' ? candidate : candidate?.id;
  const problems = [];

  // Inherited. Whatever the current release publishes, this one publishes too,
  // on the record it already has — so the switch cannot take anything away.
  if (inherits(candidate, { fileExists, profiles, resolveScene, resolveAsset, resolveReview, resolveRevision, hasReview }).length === 0) {
    return [];
  }

  if (!candidates.includes(id)) {
    return [`"${id ?? '(no id)'}" is not one of the scenes the next release opens`];
  }

  const scene = resolveScene(id);
  if (!scene) return [`"${id}" is not registered in the catalogue`];

  if (!STATUS_IDS.includes(scene.status)) {
    problems.push(`status "${scene.status}" is not a status the taxonomy defines`);
  } else if (scene.status === BETA_EXCLUDED_STATUS) {
    problems.push('is a Prototype, whose shape and motion are provisional by definition');
  }

  // A scene has to say what kind of claim it makes before it can be published
  // on the strength of it. This channel allows a mechanism; it does not allow
  // an unregistered one.
  const profile = profiles ? modelProfileForScene(scene, profiles) : modelProfileForScene(scene);
  if (!profile) {
    problems.push('has no model profile, so what it claims is not registered anywhere');
  }

  const assetIds = profile?.assets ?? [];
  for (const candidateId of profileCandidateAssets(profile)) {
    problems.push(
      `rests on candidate asset "${candidateId}", which is under examination and has passed no asset release gate`
    );
  }
  for (const assetId of assetIds) {
    const asset = resolveAsset(assetId);
    if (!asset) {
      problems.push(`names asset "${assetId}", which is not in the asset manifest`);
      continue;
    }
    problems.push(...assetReleaseProblems(asset, { sceneStatus: scene.status, fileExists }));
  }

  // The bar this channel adds. `hasCurrentClinicalReviewState` is the same predicate
  // a publication decision's clinical role is checked against, so a scene and a
  // decision cannot disagree about whether a review exists.
  const review = resolveReview(scene);
  if (!hasReview(scene)) {
    const state = review?.reviewStatus ?? 'no record';
    problems.push(
      `its clinical review is "${state}", and this release explains a mechanism to a patient, ` +
        'which a scene cannot do on a review that is not current'
    );
  }

  // Both halves of the experience this release exists for. A disease scene
  // without a patient explanation is the professional half only, which is the
  // thing the next beta is not.
  if (scene.disease && !authoredGuideIds.includes(id)) {
    problems.push('has no patient explanation, and a disease on this release is published with both views or neither');
  }

  const decision = decisions.find((entry) => entry.sceneId === id) ?? null;
  problems.push(...publicationDecisionProblems(decision, scene, { fileExists, hasReview }));
  if (decision) {
    const recorded = decision.assetRevisions ?? {};
    for (const assetId of assetIds) {
      const asset = resolveAsset(assetId);
      const current = asset?.output?.sha256;
      if (!(assetId in recorded)) {
        problems.push(`the publication decision does not cover asset "${assetId}"`);
      } else if (!current || recorded[assetId] !== current) {
        problems.push(
          `the publication decision was taken against ${assetId}@${recorded[assetId]}, and the manifest now ` +
            `records ${current ?? 'no hash'}`
        );
      }
    }
    for (const assetId of Object.keys(recorded)) {
      if (!assetIds.includes(assetId)) {
        problems.push(`the publication decision names asset "${assetId}", which the scene no longer uses`);
      }
    }
    const pin = decision.sceneRevision;
    const current = resolveRevision(scene);
    if (!pin || typeof pin !== 'object') {
      problems.push('the publication decision is not pinned to a scene revision');
    } else if (!current) {
      problems.push('the scene has no entry in the model-card revision registry to pin a decision to');
    } else if (pin.cardRevision !== current.cardRevision || pin.modelDigest !== current.modelDigest) {
      problems.push(
        `the publication decision was taken against scene revision ${pin.cardRevision}@${pin.modelDigest}, and the ` +
          `registry now records ${current.cardRevision}@${current.modelDigest}`
      );
    }
  }

  return problems;
}

/**
 * What the next release would publish, and what stops the rest.
 *
 * Two kinds of row, marked as such. `inherited` is a scene the current release
 * already publishes: it is open here because it is open there, and nothing
 * about it is being decided again. `candidate` is a disease that has to clear
 * this channel's own bar.
 */
export const NEXT_BETA_CANDIDATE_STATUS = Object.freeze(
  [
    ...BETA_ANATOMY_CANDIDATES.filter((id) => betaPublicationProblems(id).length === 0).map((id) =>
      Object.freeze({ sceneId: id, source: 'inherited', open: true, problems: Object.freeze([]) })
    ),
    ...NEXT_BETA_DISEASE_CANDIDATES.map((id) => {
      const problems = nextBetaPublicationProblems(id);
      return Object.freeze({ sceneId: id, source: 'candidate', open: problems.length === 0, problems: Object.freeze(problems) });
    }),
  ]
);

/**
 * The publication policy for each channel that has one.
 *
 * A channel with no entry here opens nothing. That is the whole design: a
 * policy has to be written and registered before a channel can publish, so a
 * new channel name — a typo, a half-finished branch, a `'public'` somebody
 * flipped early — fails closed instead of publishing the catalogue.
 *
 * @type {Readonly<Record<string, (scene: object, options: object) => string[]>>}
 */
export const RELEASE_POLICIES = Object.freeze({
  beta: betaPublicationProblems,
  // Registered, and not selected: `RELEASE_CHANNEL` is still `beta`, so nothing
  // about what the product publishes changes by this existing. Switching the
  // channel is a release decision and is made in one place.
  'next-beta': nextBetaPublicationProblems,
});

/**
 * Why this scene is not open, for a given channel. Empty means open.
 *
 * Kept separate from `isSceneReleased` rather than being an optional second
 * argument to it, because `isSceneReleased` is passed straight to
 * `Array.prototype.filter` in several places and filter's second argument is
 * the index. A gate whose behaviour depends on where in an array a scene sits
 * is exactly the kind of thing this file exists to prevent.
 *
 * @param {object|string|null} scene
 * @param {{channel?: string}} [options] everything else is forwarded to the
 *   channel's policy.
 * @returns {string[]}
 */
export function sceneReleaseProblems(scene, { channel = RELEASE_CHANNEL, ...options } = {}) {
  if (!scene) return ['no scene'];
  const policy = Object.prototype.hasOwnProperty.call(RELEASE_POLICIES, channel)
    ? RELEASE_POLICIES[channel]
    : null;
  if (!policy) {
    return [
      `release channel "${channel}" has no publication policy, so nothing is open on it. ` +
        'Register one in RELEASE_POLICIES — renaming the channel is not a release decision.',
    ];
  }
  return policy(scene, options);
}

/** Whether this scene is open in the current release channel. */
export const isSceneReleased = (scene) => Boolean(scene) && sceneReleaseProblems(scene).length === 0;

/** The models the beta ships, in catalogue order. */
export const RELEASED_SCENES = SCENES.filter(isSceneReleased);

/** Declared, built, and deliberately not open yet. */
export const LOCKED_SCENES = SCENES.filter((scene) => !isSceneReleased(scene));

/**
 * Candidates that are named but not open, with the reason for each.
 *
 * Exported so that "the heart is not open yet" is a fact the handoff, the tests
 * and a developer's console all read from one place instead of three people
 * each deducing it.
 */
export const BETA_CANDIDATE_STATUS = Object.freeze(
  [...BETA_ANATOMY_CANDIDATES, ...BETA_MECHANISM_CANDIDATES].map((id) =>
    Object.freeze({
      sceneId: id,
      // Which list it came from, so a reader of this status does not have to
      // infer from the scene's name which claim rule it was held to.
      claim: BETA_MECHANISM_CANDIDATES.includes(id) ? 'mechanism' : 'anatomy',
      open: isSceneReleased(sceneById(id)),
      problems: Object.freeze(betaPublicationProblems(id)),
    })
  )
);

/**
 * What a crawler is allowed to see: a scene has to be **both** open and public.
 *
 * Two independent reasons to withhold a page, and a set that satisfies only one
 * of them is a bug in whichever channel it is not checked in:
 *
 * - **Not open** — a static page inviting a reader to "open the interactive
 *   model" that then answers "to be updated" is a promise the site cannot keep.
 * - **Prototype** — its shape and motion are provisional by definition, and a
 *   search result is exactly where that caveat gets stripped off.
 *
 * The second condition is redundant under the beta policy, which already
 * excludes prototypes, and it stays because the next policy is not written yet.
 * Whatever that policy turns out to allow, a Prototype must not reach a search
 * result, and stating it here means the future policy inherits the rule rather
 * than having to remember it.
 */
export const CRAWLABLE_SCENES = SCENES.filter(
  (scene) => isSceneReleased(scene) && scene.status !== BETA_EXCLUDED_STATUS
);

/**
 * Product-shell routes that stay open.
 *
 * The landing page and the catalogue are how a visitor reaches a model at all.
 * The legal documents are open because a person may need them on a device that
 * cannot start WebGL, `#/trust` because saying which models are reviewed — and
 * which are not — is more honest with the locked ones listed than with the page
 * hidden.
 *
 * Account management is not a route: it is the header control the landing page
 * and the Explorer both mount, and both of those stay open. A person who is
 * already paying reaches their subscription, their invoices and the cancel path
 * whatever the learning surface is publishing — closing models must never close
 * the door on somebody's own account.
 *
 * `lab` is not here: it is the experimental surface, and every scene on it is a
 * prototype the beta is holding back. It stays reachable to a developer through
 * the unlock below.
 */
const RELEASED_ROUTE_KINDS = new Set(['landing', 'explorer', 'trust', 'legal']);

/**
 * @param {{kind:string, sceneId?:string}} route a `resolveRoute` result
 */
export function isRouteReleased(route) {
  if (!route) return false;
  if (route.kind === 'scene') return isSceneReleased(sceneById(route.sceneId));
  return RELEASED_ROUTE_KINDS.has(route.kind);
}

/** `?preview=1` opens everything; `?preview=0` closes it again. */
export const DEV_UNLOCK_PARAM = 'preview';

/** Where the answer is remembered, so a developer sets it once per browser. */
export const DEV_UNLOCK_STORAGE_KEY = 'm3l.beta-preview';

const OFF_VALUES = new Set(['', '0', 'false', 'off', 'no']);

/**
 * Resolve the developer unlock from the things that can say so.
 *
 * Pure, so the whole rule is testable: the browser wiring in
 * `src/app/releaseGate.js` is the only part that touches `window`.
 *
 * The decision that matters here is `previewBuild`. A production build ignores
 * the query parameter and the remembered answer outright — the unlock is a
 * capability the build either has or does not have, decided at build time from
 * an environment variable, never from a URL, a hostname string or a value in
 * somebody's browser. And a production build served from the origin a preview
 * build was served from *forgets* the remembered answer rather than leaving it
 * to be picked up by the next preview deploy.
 *
 * @param {{search?:string, stored?:string|null, devBuild?:boolean, previewBuild?:boolean}} [input]
 * @returns {{unlocked:boolean, persist:boolean|null}} `persist` is what the
 *   caller should write to storage: `true` to remember, `false` to forget,
 *   `null` to leave whatever is there alone.
 */
export function resolveDevUnlock({
  search = '',
  stored = null,
  devBuild = false,
  previewBuild = false,
} = {}) {
  // `npm run dev` is a developer, by definition. Never make them type a query
  // parameter to see the work they are in the middle of.
  if (devBuild) return { unlocked: true, persist: null };

  // Production. Nothing a visitor can type or has stored opens the locked work.
  if (!previewBuild) return { unlocked: false, persist: stored == null ? null : false };

  const requested = new URLSearchParams(search).get(DEV_UNLOCK_PARAM);
  if (requested != null) {
    const unlocked = !OFF_VALUES.has(requested.trim().toLowerCase());
    return { unlocked, persist: unlocked };
  }
  return { unlocked: stored === 'on', persist: null };
}
