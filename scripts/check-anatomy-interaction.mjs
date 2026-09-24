#!/usr/bin/env node
/**
 * Drives an anatomy scene in a real browser and checks that selection behaves.
 *
 *   npm run build
 *   npm run verify:anatomy
 *
 * ## Why this exists as a script rather than as a note
 *
 * Everything this checks is invisible to `node --test`: whether a click on the
 * rendered mesh resolves to the structure a reader is then told about, whether
 * a drag that ends over a different structure is read as a click, whether
 * recolouring the model changes what is selected. Those are the failures a unit
 * test cannot see and a screenshot cannot prove, and they are exactly the
 * behaviour the beta's publication decision is about — so the evidence for that
 * decision is this, runnable, rather than an image somebody once looked at.
 *
 * It also checks the part tree against the model, which is the pair this
 * product most needs to agree: selecting a row must select the same structure
 * in 3D, and selecting in 3D must highlight the same row. Two surfaces naming
 * one thing is the claim; a browser is the only place it can be observed.
 *
 * ## What it does not check
 *
 * It drives one engine on a desktop machine, clicks a handful of points, and
 * reads the labels the product itself renders. It cannot tell you the label is
 * anatomically *correct* — that is an anatomy expert's judgement and is
 * recorded separately — only that the pipeline from mesh to panel is coherent
 * and stable under interaction.
 *
 * ## Driving a scene the release has not opened
 *
 * A production build does not contain a scene the release is holding back, so
 * there is nothing here to drive. That is the case every time this check is
 * used as evidence for a *new* publication decision — the decision has not been
 * taken yet, so the gate is closed, so the scene is not in the build. Build a
 * preview and pass `--preview`:
 *
 *   VITE_ALLOW_PREVIEW=1 npm run build
 *   npm run verify:anatomy -- --preview
 *
 * Once the decision is recorded, the production build carries the scene again
 * and the check runs against it with no flag, which is the run that matters.
 *
 * ## What it checks that `verify:ui` cannot
 *
 * The viewport matrix measures a surface at rest. This drives the states a
 * reader puts it into: the parts sheet open on a phone, the keyboard walking a
 * tree, a pointer crossing the model while a structure is pinned. A modal is
 * the clearest case — with the sheet open the background is deliberately inert
 * and covered, which a check with no concept of a modal can only read as a
 * defect, so the modal's own obligations (focus in, Escape, focus back, the
 * background unreachable, a close control that does not need scrolling to) are
 * checked here instead.
 *
 * Options:
 *   --silhouette    also measure how wide the model gets anywhere down the
 *                   frame, for comparing one scene with another. Costs about
 *                   three minutes a scene, so it is off by default.
 *   --dist <dir>    built site to serve (default: dist)
 *   --scene <slug>  scene route to drive (default: brain-anatomy)
 *   --points <list> where to click, as "fx,fy fx,fy …" in canvas fractions.
 *                   The default four are placed for a solid mass filling the
 *                   frame. An organ with a real gap down the middle — two lungs
 *                   with a mediastinum between them — needs its own four, and
 *                   moving the model to satisfy a fixed grid would be the
 *                   check deciding the anatomy.
 *   --empty <fx,fy> a point that is background, for the check that a click on
 *                   nothing clears the card. The default is at the left edge,
 *                   clear of the title card above it and of the console along
 *                   the bottom: the bottom-left corner this used to use is
 *                   *behind* the console, so the click never reached the canvas
 *                   and the check could only pass when the card was already
 *                   empty — which it was, until a scene came along whose clicks
 *                   all landed on something.
 *   --shots <dir>   write screenshots here
 *   --preview       unlock the build (needs VITE_ALLOW_PREVIEW=1 at build time)
 *   --headed        show the browser
 */
import { existsSync, mkdirSync } from 'node:fs';
import { chromiumExecutable } from './lib/browser.mjs';
import { differingPixels, settledPixels } from './lib/frames.mjs';
import { serveDist } from './lib/serve-dist.mjs';
import { join, resolve } from 'node:path';
import { DEV_ASSET_ROOT } from '../src/catalog/devAssets.js';
import { assetById } from '../src/catalog/assetManifest.js';
import { modelProfileForScene } from '../src/catalog/modelProfiles.js';
import { RELEASED_SCENES } from '../src/catalog/release.js';
import { buildScenePreloads } from './scene-preloads.js';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback = null) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const distDir = value('--dist', 'dist');
const sceneSlug = value('--scene', 'brain-anatomy');
const shotsDir = value('--shots');
/**
 * Where to click on each organ, when the caller does not say.
 *
 * An authored entry is a **tour**: four points read off a render of that
 * scene's opening view at this script's own viewport, each named for the part
 * it is on, so the run says "right ventricle, left ventricle, aortic arch,
 * pulmonary trunk" and not just "four structures".
 *
 * These are read off a render of each scene's opening view at this script's own
 * viewport, and each one is named for what the click actually resolved to.
 * They are re-measured when a scene's opening pose or its geometry moves; a
 * point that stops hitting is a question about the render, not a number to
 * nudge.
 *
 * **The whole table was re-measured twice on 2026-09-14**: once when the organ
 * scenes started answering `getSubjectBounds()` in the shape the framing reads,
 * and again when the safe-area fit stopped approximating a perspective camera
 * (F-131) and every model moved. Re-measuring is a command rather than an
 * afternoon with a screenshot:
 *
 *   VITE_ALLOW_PREVIEW=1 npm run build
 *   npm run points:anatomy -- --preview
 *
 * It sweeps a grid over each scene's opening view and keeps four points that
 * land on different structures, far enough apart to be four tests, and
 * **inside** what they hit rather than on its edge — `measure-anatomy-points.mjs`
 * says why that last one is not optional.
 *
 * And a third time when the scene stopped opening at a framing it was about to
 * abandon (F-133), which moved every model again — this time towards filling
 * the frame rather than away from it, so the sweep finds more.
 *
 * Twenty-five scenes measured four points on the coarse grid; nine more needed
 * `--dense`, which is what a subject a few frame-percent across is for. Three
 * kept the points they already had, because the sweep could not better them:
 * the oesophagus is one thin tube, and `skeleton-overview` and `hand-anatomy`
 * are the compositions F-104 is about. **A measurement that cannot find a
 * point is not a licence to nudge one**, so those three are left where they
 * were and the check says what it finds. `lymphatic-drainage` came back from
 * that list on this pass: a larger model is a model a grid can hit.
 */
const SCENE_POINTS = {
  // **The artery's point was re-measured on 2026-09-16**, at (0.4175, 0.38).
  // The safe-area fit stopped approximating a perspective camera, which moved
  // every model, and (0.42, 0.40) came off a vessel a few frame-thousandths
  // wide onto the left ventricle behind it. A sweep at 0.005 puts the artery
  // between 0.4125 and 0.4225 at this height, with the great cardiac vein
  // immediately to its right — the two run together in the anterior
  // interventricular groove, and the vein is the one in front. This point is
  // the middle of that band rather than either measured edge, because an edge
  // is what the last one was. Driven, and it names the artery.
  //
  // Across the front of the heart, right to left as the screen shows it: the
  // right atrium, the right ventricle that makes up most of the anterior
  // surface, a coronary artery on it, and a great vessel leaving above. Chosen
  // to name four *different* parts — the right ventricle answers for most of
  // the middle of the organ, so a tour picked by spreading points evenly names
  // it three times and says little. It also crosses both adopted files: the
  // chambers come from VH_M_Heart, the artery and the aorta from
  // VH_M_Blood_Vasculature, so a run proves each of them is drawn and named.
  // **Re-measured 2026-09-22**, with the brain's and for the same reason: the
  // opening framing stopped being discarded (F-133), so every scene's model
  // moved. The heart's fourth point had come to name the left ventricle where
  // it is authored for the artery that runs across it.
  'heart-anatomy': [
    [0.253, 0.18, 'Superior vena cava'],
    [0.365, 0.18, 'Arch of the aorta'],
    [0.29, 0.275, 'Ascending aorta'],
    [0.403, 0.275, 'Left atrium'],
  ],
  // The brain's own tour, named — which it was not until 2026-09-15, and the
  // cost of that is the reason these four carry names now.
  //
  // The points began as the script's `DEFAULT_POINTS`, and a comment here
  // claimed they landed on the frontal operculum, the supramarginal gyrus, the
  // middle temporal gyrus and the superior temporal sulcus. Measured, they did
  // not: one of the four sat at x=0.60 and hit **nothing**, because this
  // atlas's silhouette spans about x∈[0.22, 0.56] at mid-height, and two of the
  // others named structures nobody had written down. The publication record
  // went on listing the original four for a week while the layout moved under
  // them (the control bar's height, two type floors, three panel changes) —
  // none of which touches this scene's own sources, so the model-revision
  // digest could not notice either.
  //
  // A prose comment is not an assertion. These are, and the dead point is
  // replaced by one the drive itself measured to be over the model.
  //
  // **Re-measured 2026-09-16, and this is the second time this scene's tour
  // has gone stale.** The first was layout drift over a week, unnoticed
  // because the points were bare coordinates. This one is the safe-area fit
  // being corrected from an orthographic sum to an exact perspective solve,
  // which moved every model — and it was caught on the first run, because
  // the points carry the names they must resolve to. Three of the four were
  // wrong and two of those had come to name the same structure, so the tour
  // would have shown three distinct parts while claiming four.
  // **Re-measured 2026-09-22**, by `points:anatomy --dense`, because the
  // opening pose moved: the scene had been opening at a framing it abandoned
  // as soon as anything re-framed it (F-133), and it now opens at the one it
  // resets to. The fourth point was the one that showed it — it had been
  // reading "Orbital gyri" where it is authored for the orbital part of the
  // inferior frontal gyrus, its neighbour.
  //
  // Worth recording because the first reading of that failure was wrong: it
  // was written up as a consequence of the framing, to come back on its own
  // once the framing was fixed. Measured, it did not — the point misses under
  // both framings, because it was last measured in #112 and three framing
  // changes have happened since. The framing fix is what makes re-measuring
  // the right answer rather than a nudge: the pose these are read against is
  // now the pose a reader is actually given.
  'brain-anatomy': [
    [0.328, 0.227, 'Middle frontal gyrus'],
    [0.44, 0.227, 'Superior parietal lobule'],
    [0.215, 0.323, 'Inferior frontal sulcus'],
    [0.365, 0.323, 'Supramarginal gyrus'],
  ],
  // Two lungs, a lobe of each, and the airway between them — measured, not
  // assumed. The fourth point used to sit at (0.50, 0.44) and **hit nothing**,
  // which is why this scene reported three structures from four clicks.
  //
  // **Re-measured 2026-09-16.** main measured the four above against a
  // safe-area fit that approximated a perspective camera with an
  // orthographic sum, and published the lung on them an hour before this
  // branch merged. Under the exact solve **all four are wrong and three hit
  // nothing** — the worst of the four published scenes, and the run said so
  // as `only 1 of 4 click(s) resolved`. The airway is kept as the fourth
  // structure, per main's reasoning that a tour of four lobes says less
  // than one that also crosses the tree between the lungs; the sweep
  // reaches the trachea rather than the left main bronchus at this framing.
  // **Measured with the drive itself, not with the sweep.** `points:anatomy`
  // reads a scene at the framing it opens at; the drive runs its tour after
  // the framing check, which resets the display. On this scene those two
  // are not the same — it opens spanning 0.22..0.50 of the frame and rests
  // at 0.20..0.52 (F-133) — so a tour measured by the sweep failed in the
  // drive on points the sweep had just confirmed. Every point below was
  // read from `--points` output in the frame the tour is held to.
  'lung-anatomy': [
    [0.37, 0.30, 'Trachea'],
    [0.25, 0.42, 'Right upper lobe'],
    [0.49, 0.56, 'Left upper lobe'],
    [0.25, 0.68, 'Right middle lobe'],
  ],
  // Four Couinaud segments, one per click, spanning both livers: two right-sector
  // (VIII anterior superior, VII posterior superior) and two left (II lateral
  // superior, IVa medial superior).
  //
  // **Re-measured 2026-09-16, and the tour changed shape.** The previous four —
  // three segments and the gallbladder under them — were measured against a safe-area
  // fit that approximated a perspective camera with an orthographic sum; this
  // branch solves each corner exactly, which moved the model, and two of those
  // four then hit nothing while a third named its neighbour. The names are what
  // made that loud — under bare coordinates the run would have passed with two
  // points naming nothing at all.
  'liver-anatomy': [
    [0.29, 0.227, 'Segment VIII — Right anterior superior'],
    [0.215, 0.323, 'Segment VII — Right posterior superior'],
    [0.477, 0.323, 'Segment II — Left lateral superior'],
    [0.44, 0.417, 'Segment IVa — Left medial superior'],
  ],
  // The landmark kidney, the opened one's cortex, and both ureters.
  //
  // These were unnamed until 2026-09-17, on the belief that the opening view
  // reached only two structures. It reaches **four**: the earlier count was of
  // where four points happened to land, not of what the scene lets you point
  // at, and two of those points were both on the right kidney — which is
  // deliberately one structure. A pointer sweep of the canvas
  // (`npm run points:anatomy -- --scene kidney-anatomy --preview --dense`)
  // names Renal cortex, Right kidney and both ureters, which is four different
  // structures and what F-126 asked this tour to hold.
  //
  // The ureters are the thin ones: about ten pixels across at this framing, so
  // a point on one is a point on a tube, and the drive will say so the moment
  // the framing moves. That is the reason to name them rather than leave bare
  // coordinates that can slide onto the background and stay green (F-123).
  'kidney-anatomy': [
    [0.14, 0.417, 'Right kidney'],
    [0.552, 0.275, 'Renal cortex'],
    [0.215, 0.56, 'Right ureter'],
    [0.515, 0.512, 'Left ureter'],
  ],
  // Fundus, body, antrum, and the duodenum it empties into.
  // Re-measured 2026-09-16, same story as the kidney: the previous points hit
  // nothing after #112. Unnamed for the same reason — of eight structures the
  // opening view reaches "Cardia" and "Body", and the points below the middle
  // row answer inconsistently from run to run (F-126).
  'stomach-anatomy': [
    [0.4217, 0.45],
    [0.4817, 0.45],
    [0.4217, 0.56],
    [0.3617, 0.26],
  ],
  // The colon frame, clockwise from the ascending limb.
  'intestine-anatomy': [[0.35, 0.44], [0.49, 0.24], [0.69, 0.50], [0.52, 0.76]],
  // Head, neck, body, tail — the gland runs across the frame.
  'pancreas-anatomy': [[0.34, 0.52], [0.45, 0.48], [0.56, 0.45], [0.66, 0.40]],
  // Two lobes clasping a trachea, with the isthmus across the front of it.
  'thyroid-anatomy': [[0.44, 0.48], [0.57, 0.48], [0.50, 0.56], [0.50, 0.25]],
  // The two segments, and the pancreatic tail off to the medial side.
  'spleen-anatomy': [[0.54, 0.29], [0.54, 0.69], [0.60, 0.20], [0.32, 0.57]],
  // Apex, body, neck, and a ureter arriving behind.
  'bladder-anatomy': [[0.50, 0.37], [0.50, 0.51], [0.50, 0.63], [0.42, 0.20]],
  // Gallbladder, common bile duct, a hepatic duct, and the bowel it opens into.
  'biliary-anatomy': [[0.30, 0.58], [0.50, 0.36], [0.45, 0.66], [0.60, 0.74]],
  // The tube runs down the middle; the trachea is half-transparent in front of
  // its upper end, so a click there lands on the trachea.
  'esophagus-anatomy': [[0.48, 0.60], [0.49, 0.80], [0.48, 0.25], [0.487, 0.45]],
  // A gland and its kidney, on each side.
  'adrenal-anatomy': [[0.365, 0.36], [0.635, 0.36], [0.35, 0.62], [0.645, 0.62]],
  // Fundus, body, cervix, and a tube on its way to an ovary.
  'uterus-anatomy': [[0.50, 0.33], [0.50, 0.50], [0.50, 0.66], [0.33, 0.36]],
  // The gland, a seminal vesicle above it, and the rectum behind.
  'prostate-anatomy': [[0.47, 0.52], [0.40, 0.55], [0.57, 0.30], [0.50, 0.74]],
  // The route runs bottom-left to middle and then forward.
  'male-tract-anatomy': [[0.28, 0.78], [0.34, 0.68], [0.49, 0.47], [0.62, 0.56]],
  // Both femoral condyles, the patella in front of them, and the tibial
  // plateau below — four bones of the joint from one view.
  // Four points on four structures, spread across the frame — which is new.
  // Before the shafts were taken out of the framing box (F-134) the knee was a
  // tenth of the frame wide and a 63-point grid found it six times, every hit
  // in one column; three names was all it could carry. It is 0.14 wide now.
  //
  // Named from **the drive's own sentinel pass**, not `points:anatomy`, which
  // disagrees with the drive here (L-26) — and every name confirmed by two
  // consecutive runs, because a point near a boundary answers differently from
  // run to run. (0.4217, 0.45) was dropped for exactly that: the sentinel pass
  // called it "Articular cartilage" and two runs called it "Medial femoral
  // condyle", which is the cartilage shell against the condyle under it.
  'knee-anatomy': [
    [0.3017, 0.45, 'Lateral femoral condyle'],
    [0.3617, 0.34, 'Quadriceps tendon'],
    [0.3617, 0.45, 'Patella'],
    [0.3617, 0.56, 'Patellar tendon'],
  ],

  // Three structures, named again. With the humeral shaft in the framing box
  // (F-134) this scene could hold **one** name still from run to run — three of
  // its four candidates all came back "Glenoid labrum", and two points swapped
  // answers between consecutive runs — because at a tenth of the frame every
  // point is near an edge. At 0.18 wide the three below held across two runs.
  //
  // Same provenance as the knee's: the drive's sentinel pass, not
  // `points:anatomy` (L-26).
  'shoulder-anatomy': [
    [0.2417, 0.45, 'Head of the humerus'],
    [0.3617, 0.34, 'Coracoid process'],
    [0.4217, 0.45, 'Scapula'],
  ],
  // The pelvis, the socket, the head in it, and the femur below.
  'hip-anatomy': [[0.58, 0.34], [0.50, 0.44], [0.45, 0.45], [0.42, 0.66]],
  // Into the funnel from in front: the midline, the ring on each side of it, and the floor below.
  'pelvis-anatomy': [[0.5, 0.5], [0.44, 0.46], [0.56, 0.46], [0.5, 0.6]],
  // Across the front of the belly: the midline, the liver on the patient’s right, the stomach on the left, and the bowel below.
  'abdomen-anatomy': [[0.5, 0.46], [0.44, 0.4], [0.56, 0.44], [0.5, 0.58]],
  // Across the front of the chest: the sternum, a lung on each side of it, and lower down the heart.
  'thorax-anatomy': [[0.5, 0.44], [0.44, 0.5], [0.56, 0.5], [0.5, 0.6]],
  // Down the joint in the midline: shaft, hinge and the two forearm bones under it.
  'elbow-anatomy': [[0.5, 0.42], [0.5, 0.52], [0.46, 0.3], [0.54, 0.62]],
  // Down the front of the neck: the larynx, the thyroid, and one side of it each way.
  'neck-anatomy': [[0.5, 0.4], [0.5, 0.52], [0.44, 0.46], [0.56, 0.46]],
  // Down the midline of a standing figure: skull, pelvis, leg, and the cage
  // last, because that is the widest thing the re-click has to find again.
  'skeleton-overview': [[0.5, 0.211], [0.486, 0.456], [0.486, 0.544], [0.5, 0.356]],
  // Along the inside of the foot from the heel forward, and the leg last,
  // because that is the widest thing the re-click has to find again.
  'foot-anatomy': [[0.514, 0.511], [0.43, 0.57], [0.59, 0.28], [0.625, 0.533]],
  // Down the back of the hand: a finger, the palm, the carpus, and the forearm
  // last, because that is the widest thing the re-click has to find again.
  'hand-anatomy': [[0.486, 0.644], [0.472, 0.7], [0.479, 0.5], [0.479, 0.278]],
  // A wing, the bowel coming down through the ring, the front of the ring, and
  // the sheet itself last, because that is the one the re-click has to find.
  'pelvic-floor-anatomy': [[0.625, 0.278], [0.535, 0.311], [0.5, 0.52], [0.458, 0.4]],
  // Into an open mouth: the roof, the row of papillae across the tongue, the
  // tongue itself, and a parotid gland out at the side. Read off a render.
  'oral-anatomy': [[0.49, 0.36], [0.625, 0.444], [0.44, 0.56], [0.49, 0.52]],
  // Down the midline of a tall, narrow organ: the soft palate, the pharynx
  // behind the mouth, the thyroid cartilage and the trachea. Read off a render.
  'larynx-anatomy': [[0.48, 0.19], [0.49, 0.33], [0.49, 0.52], [0.5, 0.76]],
  // The external nose in profile, the septum behind it, and the palate under
  // both. Read off a render at the view the scene opens on.
  'nose-anatomy': [[0.34, 0.58], [0.56, 0.44], [0.56, 0.71], [0.49, 0.58]],
  // Down the column: neck, chest, low back and sacrum.
  'spine-anatomy': [[0.5, 0.22], [0.5, 0.4], [0.5, 0.58], [0.5, 0.76]],
  // The dome, the nipple on it, the axilla up to the left and the chest wall behind.
  'breast-anatomy': [[0.52, 0.5], [0.52, 0.44], [0.36, 0.3], [0.66, 0.62]],
  // The node beads, not the ducts: a duct is a few pixels wide and the body
  // silhouette behind it is drawn too faint to be clickable at all, so a miss
  // lands on nothing. Neck, both armpits, and the groin.
  'lymphatic-drainage': [[0.53, 0.16], [0.41, 0.33], [0.59, 0.33], [0.45, 0.81]],
  // The node itself, its inside, an afferent vessel on the left and the efferent on the right.
  'lymph-node-anatomy': [[0.5, 0.47], [0.5, 0.42], [0.34, 0.4], [0.63, 0.52]],
  // Down the cut face: epidermis, dermis, subcutis — and the hair off to the side.
  'skin-anatomy': [[0.5, 0.36], [0.5, 0.48], [0.5, 0.62], [0.36, 0.33]],
  // The auricle, the canal, the middle ear and the inner ear, left to right.
  'ear-anatomy': [[0.3, 0.45], [0.44, 0.47], [0.57, 0.44], [0.66, 0.52]],
  // The globe is a ball, so the useful points are inside its silhouette and off
  // its centre: the sclera around the cornea, and the cornea itself, which sits
  // in front of the iris and answers for every click through the middle.
  // Read these off a render — they were once set from a frame taken before the
  // scene's framing changed, and then two of the four fell past the edge.
  'eye-anatomy': [[0.44, 0.35], [0.5, 0.62], [0.55, 0.45], [0.42, 0.52]],
};

/** The authored tour, or null when the drive should use what it measures. */
const authoredPoints = (() => {
  const raw = value('--points');
  if (!raw) return SCENE_POINTS[sceneSlug] ?? null;
  const points = raw
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number));
  if (!points.length || points.some((point) => point.length !== 2 || point.some((n) => !(n >= 0 && n <= 1)))) {
    console.error('--points takes "fx,fy fx,fy …" with each fraction between 0 and 1');
    process.exit(1);
  }
  return points;
})();
const emptyPoint = (() => {
  const raw = value('--empty');
  if (!raw) return [0.03, 0.45];
  const point = raw.split(',').map(Number);
  if (point.length !== 2 || point.some((n) => !(n >= 0 && n <= 1))) {
    console.error('--empty takes "fx,fy" with each fraction between 0 and 1');
    process.exit(1);
  }
  return point;
})();

const die = (message) => {
  console.error(message);
  process.exit(1);
};

if (!existsSync(join(distDir, 'index.html'))) die(`No build at "${distDir}" — run \`npm run build\` first.`);
if (shotsDir) mkdirSync(shotsDir, { recursive: true });

let chromium = null;
for (const pkg of ['playwright', 'playwright-core']) {
  try {
    ({ chromium } = await import(pkg));
    break;
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
  }
}
if (!chromium) {
  die(
    'Playwright is not installed, so nothing was driven.\n\n' +
      '  npm i --no-save playwright\n  npx playwright install --with-deps chromium\n\n' +
      'It is deliberately not a dependency: `npm test` must stay a plain `node --test` run.'
  );
}

// --- serving the build -----------------------------------------------------

// The candidate assets a scene under development fetches are git-ignored and
// live outside the build, so a static server rooted at `dist` answers 404 for
// them — and a scene whose atlas 404s never reaches the state this drive waits
// for. That is why driving `heart-anatomy` here used to end at "the drive
// stopped while opening the scene", which reads as the scene being broken
// rather than as the file not being served. `capture-anatomy-views.mjs` had
// already learnt this; the mount is the same one.
const { base, close: closeServer } = await serveDist(distDir, {
  mounts: { [`/${DEV_ASSET_ROOT}/`]: '.' },
});

// --- the drive -------------------------------------------------------------

const problems = [];
const notes = [];
/**
 * What the drive is doing right now.
 *
 * A step that cannot complete reports a Playwright timeout and nothing else,
 * and one timeout looks like every other one — the run that motivated this said
 * only "locator.click: Timeout 30000ms exceeded" about a drive with a dozen
 * clicks in it. The cost of knowing which is one assignment per step.
 */
let step = 'opening the scene';
/** Thrown by `--framing-only` to leave the drive early; see the catch. */
const STOPPED_AFTER_FRAMING = Symbol('stopped after framing');
const at = (what) => { step = what; };
const observed = { structures: [], tour: [], views: [], colorModes: [], selectableCount: null, treeRows: null, labels: [], openingFraming: null };

const browser = await chromium.launch({
  executablePath: chromiumExecutable(chromium),
  headless: !flag('--headed'),
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

/**
 * Requests this harness cannot serve, and which are not the scene's failure.
 *
 * The billing functions belong to the deploy host, not to the static build, and
 * a webfont is a network fetch the sandbox refuses. Listing them by name is the
 * point: anything else that fails is reported.
 */
const EXPECTED_FAILURES = [/\/\.netlify\/functions\//, /^https:\/\/fonts\.(googleapis|gstatic)\.com\//];
const unexpected = (url) => !EXPECTED_FAILURES.some((pattern) => pattern.test(url));

/**
 * A cancelled request is not a failed one.
 *
 * The same distinction `BrainAnatomyScene` had to learn the hard way: a fetch
 * the browser abandons — a superseded loader request, anything still in flight
 * when the page goes away — reports as a failure and is not one. Reporting it
 * would make this check fail on a different file every run, which is how a
 * check stops being read.
 */
const CANCELLED = 'net::ERR_ABORTED';

/** A model file, as `scripts/asset-delivery.js` counts formats. */
const MODEL_FILE = /\.(glb|gltf|bin|drc)$/i;

page.on('pageerror', (error) => problems.push(`uncaught error: ${error}`));

/**
 * Every request for a model file, by path. `main.js` preloads a released
 * scene's files before the scene code arrives, and the scene's loader is meant
 * to be answered from that preload. When the two disagree — a `crossorigin`
 * that does not match the loader's request, a URL spelt differently — nothing
 * fails: the file is simply downloaded twice, which is slower than no preload
 * at all. Counting is the only way to see it.
 */
const modelRequests = new Map();
// Every value the veil's bar was given, recorded from inside the page because
// the veil is gone by the time the part tree exists.
await page.addInitScript(() => {
  window.__veilProgress = [];
  new MutationObserver(() => {
    const bar = document.querySelector('#boot-veil .loading-bar[role="progressbar"]');
    const value = bar?.style.getPropertyValue('--progress');
    if (!value) return;
    const progress = Number(value);
    const last = window.__veilProgress.at(-1);
    if (last?.progress !== progress) window.__veilProgress.push({ progress, detail: bar.nextElementSibling?.textContent ?? '' });
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['style'] });
});
page.on('request', (request) => {
  const path = new URL(request.url()).pathname;
  // Model formats, and the decoder the prefetch fetches with them.
  if (!MODEL_FILE.test(path) && !/\/draco\/draco_[^/]+$/.test(path)) return;
  modelRequests.set(path, (modelRequests.get(path) ?? 0) + 1);
});
page.on('requestfailed', (request) => {
  const reason = request.failure()?.errorText ?? 'unknown';
  if (reason === CANCELLED) return;
  if (unexpected(request.url())) problems.push(`request failed: ${request.url()} (${reason})`);
});
page.on('response', (response) => {
  if (response.status() >= 400 && unexpected(response.url())) {
    problems.push(`http ${response.status()}: ${response.url()}`);
  }
});

const shot = async (name) => {
  if (shotsDir) await page.screenshot({ path: join(shotsDir, `${name}.png`) });
};

try {
  const url = flag('--preview') ? `${base}?preview=1#/${sceneSlug}` : `${base}#/${sceneSlug}`;
  await page.goto(url, { waitUntil: 'networkidle' });

  // A locked route answers with the plain "to be updated" page, which has no
  // canvas and never will. Saying so beats a thirty-second timeout that reads
  // like the scene is broken when the release simply has not opened it.
  if (await page.locator('.locked-copy').count()) {
    die(
      `The build does not open ${sceneSlug}: it answered with the "to be updated" page.\n\n` +
        '  VITE_ALLOW_PREVIEW=1 npm run build\n  npm run verify:anatomy -- --preview\n\n' +
        'That is the expected state while a publication decision is being taken — the gate is ' +
        'closed until it is recorded, so the scene is not in a production build.'
    );
  }

  // Ready when the part tree has rows. It is the surface that only exists once
  // the atlas has loaded and been read, so waiting on it waits for both.
  await page.waitForFunction(() => document.querySelectorAll('.anatomy-tree-leaf').length > 0, {
    timeout: 90000,
  });
  observed.selectableCount = await page.locator('.anatomy-tree-leaf').count();
  if (!observed.selectableCount) problems.push('the part tree reports no selectable structures');

  // The model files were asked for once each, and the ones the build prefetches
  // were asked for before the loader code had even arrived — see
  // `src/app/sceneAssetPreload.js`. A scene the release does not open has no
  // prefetch, and is only held to "once".
  const releasedScene = RELEASED_SCENES.find((scene) => scene.slug === sceneSlug);
  const prefetched = releasedScene
    ? (buildScenePreloads({ scenes: [releasedScene], profileFor: modelProfileForScene, assetFor: assetById, root: process.cwd() })[releasedScene.id] ?? []).map((file) => file.url)
    : [];
  for (const [path, count] of modelRequests) {
    if (count > 1) {
      problems.push(`${path} was requested ${count} times: the prefetch did not hand the file to the scene's loader, so the model downloaded twice`);
    }
  }
  const timings = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((entry) => [new URL(entry.name).pathname, entry.startTime])
  );
  const loaderCode = timings.find(([path]) => /\/GLTFLoader-[^/]*\.js$/.test(path));
  for (const url of prefetched) {
    const model = timings.find(([path]) => path.endsWith(`/${url}`));
    if (!model) {
      problems.push(`${url} was never requested, though the build prefetches it for this scene`);
    } else if (loaderCode && model[1] >= loaderCode[1]) {
      problems.push(
        `${url} was requested at ${Math.round(model[1])} ms, after the loader code (${Math.round(loaderCode[1])} ms): ` +
          'the scene waited for its own code before asking for its model — src/app/sceneAssetPreload.js'
      );
    }
  }
  // What the reader saw while waiting: the veil's bar, as `main.js` set it.
  const veilProgress = await page.evaluate(() => window.__veilProgress ?? []);
  if (prefetched.length) {
    const values = veilProgress.map((entry) => entry.progress);
    if (!values.length) {
      problems.push('the loading veil never showed how much of the model had arrived');
    } else if (values.some((value, i) => i > 0 && value < values[i - 1])) {
      problems.push(`the loading veil's progress went backwards: ${values.join(' → ')}`);
    } else if (values.at(-1) !== 1) {
      problems.push(`the loading veil's progress stopped at ${values.at(-1)}, not at the whole model`);
    }
  }

  // The consent question is a one-time overlay and it sits over the canvas —
  // over the lower middle of it, which is where the clicks below go.
  //
  // It is dismissed *here*, after the scene is ready, and not right after
  // `goto`. Carving an organ is synchronous: the lung holds the main thread for
  // about seventeen seconds, during which the page paints ten frames and no
  // click is actionable. A five-second attempt before that timed out, was
  // swallowed by its own `catch`, and left the banner standing over the model —
  // so the run reported "the picking may be broken" about a banner. It looked
  // like a flake because a warm re-run builds fast enough to get the click in.
  // The fix is to ask at a moment the page can answer, not to wait longer.
  const consent = page.locator('.consent-banner button').last();
  if (await consent.count()) {
    await consent.click({ timeout: 15000 }).catch(() => {
      problems.push('the consent banner would not close, and it covers the part of the canvas clicked below');
    });
    await page.waitForTimeout(300);
  }

  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (!box) die('the scene rendered no canvas');

  /**
   * Wait for the model to stop moving before clicking a point on it.
   *
   * The part tree exists as soon as the structures do; the camera is still
   * easing into the viewpoint for about a second after that, and the layer
   * opacities with it. Clicking through the ease is how a point measured on a
   * structure lands beside it — which is not a flake, it is two measurements
   * of different frames, and it produced four failures about selection on the
   * elbow that were really one about aim.
   *
   * The same definition of "settled" the capture uses, and for the same reason
   * it is a tolerance rather than an equality: SwiftShader's edge sampling
   * jitters by a few dozen silhouette pixels indefinitely, so byte-equality
   * reported "the view never stopped changing" about scene after scene that
   * had (`lib/frames.mjs`). A point measured against a settled frame is
   * clicked against one.
   */
  const settle = async (attempts = 16, gap = 250) => {
    let previous = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const frame = await page.screenshot({ clip: box });
      if (previous && (await differingPixels(page, previous, frame)) <= settledPixels(box)) return true;
      previous = frame;
      await page.waitForTimeout(gap);
    }
    return false;
  };
  if (!(await settle())) {
    // Not fatal: a scene with something genuinely moving in it is a scene, not
    // a defect. It is said out loud because every point below is then measured
    // against a moving target.
    notes.push('the view never stopped changing, so the points below were clicked at whatever frame they caught');
  }

  /**
   * The panel's summary, read without moving the pointer off the model.
   *
   * It used to move the pointer away first, because the card showed whatever
   * was under it. The summary is about the *pinned* structure now, so not
   * moving is the point: if a hover could rewrite it, this would catch it.
   */
  const read = async () => ({
    en: (await page.locator('.anatomy-panel-name.lang-en').textContent()).trim(),
    ja: (await page.locator('.anatomy-panel-name.lang-ja').textContent()).trim(),
    where: (await page.locator('.anatomy-panel-where.lang-en').textContent()).trim(),
  });
  /** Park the pointer off the model, for the checks that are about a click. */
  const restPointer = async () => {
    await page.mouse.move(box.x + 4, box.y + 4);
    await page.waitForTimeout(250);
  };
  const EMPTY = 'Select a structure on the model or in the list.';
  const clickAt = async (fx, fy) => {
    await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
    await page.waitForTimeout(350);
    await restPointer();
    return read();
  };

  /**
   * Where the model actually is, asked rather than assumed.
   *
   * This used to click four fixed fractions of the canvas, which is a check on
   * the composition wearing the clothes of a check on the picking: the framing
   * changed, the model moved, and two of the four points landed on the
   * background — reported as "the picking may be broken". The scene already
   * says what is under the pointer, by setting the cursor, so the points are
   * found by moving over a grid and keeping the ones the scene answers for.
   * Nothing is selected while looking.
   */
  const overModel = async (fx, fy) => {
    await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
    await page.waitForTimeout(90);
    return (await canvas.evaluate((element) => element.style.cursor)) === 'pointer';
  };
  /**
   * The middle of the band, which is not the middle of the canvas.
   *
   * The parts panel is an overlay over the right of a wide window, and the
   * scene frames the model into what it leaves — so "the middle" is at about
   * 0.37 of the canvas, not 0.5. Sampling from 0.5 outwards found a wide
   * organ anyway and missed every narrow one: the spine, the oesophagus, the
   * hand, the standing skeleton and the lymphatic network all reported "the
   * model is not drawn" for a model that was drawn and perfectly clickable.
   * The panel is measured rather than assumed, so this follows the layout
   * instead of being re-tuned behind it.
   */
  const bandCentre = await page.evaluate(() => {
    const canvasRect = document.querySelector('canvas')?.getBoundingClientRect();
    if (!canvasRect?.width) return 0.5;
    const rail = document.querySelector('.rail')?.getBoundingClientRect();
    const docked =
      rail &&
      rail.width &&
      rail.left > canvasRect.left + canvasRect.width / 2 &&
      rail.top < canvasRect.top + canvasRect.height / 2 &&
      rail.bottom > canvasRect.top + canvasRect.height / 2;
    const right = docked ? Math.min(rail.left, canvasRect.right) : canvasRect.right;
    return Math.min(0.9, Math.max(0.1, (right - canvasRect.left) / 2 / canvasRect.width));
  });

  const modelPoints = [];
  const emptyPoints = [];
  // Worked outwards from the middle of that band rather than across a coarse
  // grid. A grid of five columns spanning 0.30–0.66 is still an assumption —
  // that the subject is wide — and a spine, a hand or a standing skeleton is
  // not: they are a couple of frame-percent across at the middle, and every
  // sample missed.
  const spread = [0, -0.06, 0.06, -0.12, 0.12, -0.2, 0.2, -0.28];
  for (const fy of [0.45, 0.34, 0.56, 0.26, 0.64, 0.2, 0.72]) {
    for (const fx of spread.map((offset) => Math.min(0.96, Math.max(0.02, bandCentre + offset)))) {
      if (modelPoints.length >= 6 && emptyPoints.length >= 2) break;
      const hit = await overModel(fx, fy);
      if (hit && modelPoints.length < 6) modelPoints.push([fx, fy]);
      if (!hit && emptyPoints.length < 6) emptyPoints.push([fx, fy]);
    }
  }
  // A model drawn as a thin network — the thoracic duct and three node groups
  // in a body silhouette — can genuinely fall between samples taken every six
  // frame-percent. Look harder before concluding it is not there: the coarse
  // pass is for speed, and speed is not a reason to report a model missing.
  if (modelPoints.length < 4) {
    for (let fy = 0.18; fy <= 0.78 && modelPoints.length < 4; fy += 0.03) {
      for (let fx = bandCentre - 0.3; fx <= bandCentre + 0.3 && modelPoints.length < 4; fx += 0.03) {
        const at = Math.min(0.96, Math.max(0.02, fx));
        const hit = await overModel(at, fy);
        if (hit) modelPoints.push([at, Number(fy.toFixed(3))]);
        else if (emptyPoints.length < 6) emptyPoints.push([at, Number(fy.toFixed(3))]);
      }
    }
  }
  await restPointer();
  if (modelPoints.length < 4) {
    die(
      `only ${modelPoints.length} of the sampled points are over the model. Either the model is not ` +
        'drawn, or it no longer covers the middle of the frame — both are findings, and neither is ' +
        'something to click around.'
    );
  }
  const atModel = (index) => modelPoints[index % modelPoints.length];
  /**
   * A point over the model **now**, rather than where it was at the opening.
   *
   * `modelPoints` is measured once, on the frame the scene opens at, and the
   * checks below deliberately move the camera: selecting a structure takes the
   * scene to that structure's `preferredView`, and a viewpoint may hide whole
   * tags. On the skin block that is not a corner case — picking the arteriole
   * from the tree switches to "what goes through it", which puts the three
   * layers away, and every one of the four opening points is then background.
   *
   * A click on background clears the selection, so reusing a stale point does
   * not merely miss: it empties the panel, and every check after it reads the
   * instrument's own aim as a product defect. That is what "recolouring left 0
   * rows marked selected" was on the skin — the recolouring was innocent and
   * there had been nothing selected for three steps.
   *
   * So the point is asked for again. The measured ones are tried first, since
   * they are usually still good and each costs one pointer move; then the same
   * outward sweep the opening used, against whatever is on screen now.
   */
  const liveModelPoint = async (preferred = 0) => {
    for (let i = 0; i < modelPoints.length; i += 1) {
      const point = atModel(preferred + i);
      if (await overModel(point[0], point[1])) return point;
    }
    for (const fy of [0.45, 0.34, 0.56, 0.26, 0.64, 0.2, 0.72]) {
      for (const fx of spread.map((offset) => Math.min(0.96, Math.max(0.02, bandCentre + offset)))) {
        if (await overModel(fx, fy)) return [fx, fy];
      }
    }
    return null;
  };
  /**
   * A point that is background **now**, for the check that a click on nothing
   * clears the card.
   *
   * The same staleness as `liveModelPoint`, from the other side. The models got
   * larger when the framing stopped opening at a band it was about to abandon,
   * and the foot's recorded empty point turned out to be on the Achilles
   * tendon — reported as "a click on empty space left it selected", which is
   * the product doing exactly the right thing with the wrong point.
   *
   * Four corners first, because they are where background survives a subject
   * growing, then the recorded misses, then a sweep. `null` means the model
   * genuinely covers everywhere this looked, which is a fact about the frame
   * and not a defect.
   */
  const liveEmptyPoint = async () => {
    const corners = [[0.04, 0.06], [0.04, 0.94], [0.96, 0.06], [0.96, 0.94], [0.5, 0.03], [0.5, 0.97]];
    for (const point of [...corners, ...emptyPoints]) {
      if (!(await overModel(point[0], point[1]))) return [point[0], point[1]];
    }
    for (let fy = 0.06; fy <= 0.94; fy += 0.08) {
      for (let fx = 0.04; fx <= 0.96; fx += 0.08) {
        const at = [Number(fx.toFixed(3)), Number(fy.toFixed(3))];
        if (!(await overModel(at[0], at[1]))) return at;
      }
    }
    return null;
  };

  // The farthest miss from the middle of what was found, not the first one: a
  // near miss beside a narrow subject is background now and may not be after a
  // drag, and the point is used to check that clicking nothing clears.
  const centre = modelPoints.reduce(
    (sum, [fx, fy]) => [sum[0] + fx / modelPoints.length, sum[1] + fy / modelPoints.length],
    [0, 0]
  );
  const away = ([fx, fy]) => Math.hypot(fx - centre[0], fy - centre[1]);
  const emptyPoint = [...(emptyPoints.length
    ? emptyPoints.reduce((best, point) => (away(point) > away(best) ? point : best))
    : [0.04, 0.94])];

  /**
   * How far across the frame the model reaches, **at one row**, asked rather
   * than measured from a picture: the scene sets the cursor over its own
   * geometry, which is the same signal the points above were found with.
   *
   * One row is the right measure for the check below, which compares the same
   * row before and after a reset. It is the wrong measure for comparing one
   * scene with another — see `modelSilhouette`.
   */
  const modelSpan = async (fy, step = 0.02) => {
    let first = null;
    let last = null;
    // The bound carries a tolerance because `fx` is accumulated: adding 0.02
    // forty-seven times lands on 0.9600000000000003, which fails a bare
    // `<= 0.96` — so the sweep stopped at 0.94 and reported every model that
    // reaches the right edge as 2% of the frame narrower than it is.
    for (let fx = 0.02; fx <= 0.96 + 1e-9; fx += step) {
      const at = Number(fx.toFixed(3));
      if (await overModel(at, fy)) {
        if (first === null) first = at;
        last = at;
      }
    }
    await restPointer();
    return first === null ? null : [first, last];
  };

  /**
   * The widest the model gets anywhere down the frame, and how much of the
   * frame's height it occupies at all.
   *
   * `modelSpan(0.45)` was read across scenes as if it were a width, and it is
   * not: it is a cross-section at mid-height. A knee is a vertical subject
   * whose widest part is not at 0.45, a liver is a compact one whose widest
   * part very nearly is, and comparing the two rows produced "the joints are
   * 2.6x narrower than the published organs" — a ratio between two quantities
   * that were never the same quantity, which then became a target for how big
   * to make the joints. Codex caught it on #117.
   *
   * Coarser than `modelSpan` on purpose: the question it answers — roughly how
   * much of the frame does this scene use — does not need 2%, and 4% per step
   * halves a sweep the call site measures at about three minutes.
   *
   * Two row sets, because the sweep answers two questions and they want
   * different samples.
   *
   * `OCCUPANCY_ROWS` is evenly spaced, and only those rows count towards "on
   * the model at N of M rows" — that fraction is meant to say how much of the
   * frame's *height* a scene reaches, and an uneven grid turns it into a
   * density-weighted count instead. 0.45 sits 0.03 from 0.42 while every other
   * gap is 0.08–0.09, so putting it in the same set gave all four scenes
   * exactly one extra row: not a measurement, the signature of an extra sample
   * in a band they all cross. Codex caught it on #120.
   *
   * The width, though, has to consider 0.45, because `modelSpan(0.45)` is
   * printed beside it and "the widest anywhere" must never come back narrower
   * than a row the same output tells the reader to ignore. Without it the knee
   * reported a silhouette of 0.12 and a middle row of 0.14 in one run.
   */
  const modelSilhouette = async () => {
    let widest = null;
    let widestRow = null;
    let rowsOnModel = 0;
    const coarse = [];
    const OCCUPANCY_ROWS = [0.15, 0.24, 0.33, 0.42, 0.5, 0.58, 0.67, 0.76, 0.85];
    for (const fy of [...OCCUPANCY_ROWS, 0.45]) {
      const span = await modelSpan(fy, 0.04);
      if (!span) continue;
      if (OCCUPANCY_ROWS.includes(fy)) rowsOnModel += 1;
      coarse.push([fy, span]);
      if (!widest || span[1] - span[0] > widest[1] - widest[0]) {
        widest = span;
        widestRow = fy;
      }
    }
    // The coarse pass nominates rows; it does not report a width, and it does
    // not get the last word on which row is widest either. A 4% grid quantises
    // both ends, so it can lose 8% of the frame — and it did: on the knee it
    // called row 0.33 the widest at 0.12 while row 0.45, swept finely, is 0.14.
    // Re-sweeping only its winner would have published the smaller number as
    // the model's width.
    //
    // So every row that could still be the widest is swept again at full
    // resolution, and the widest of those is the answer. **The window is the
    // whole of that quantisation, 8%, not one step.** At one step a row the
    // coarse pass under-read by 5% is dropped although its true width can
    // exceed the winner's, which is the same mistake one row up: the coarse
    // grid is a subset of the fine one, so it only ever under-reads, by up to
    // one step at each end.
    if (widest) {
      const coarseBest = widest[1] - widest[0];
      let best = null;
      let bestRow = null;
      for (const [fy, span] of coarse) {
        if (span[1] - span[0] < coarseBest - 0.08) continue;
        const fine = await modelSpan(fy);
        if (!fine) continue;
        if (!best || fine[1] - fine[0] > best[1] - best[0]) {
          best = fine;
          bestRow = fy;
        }
      }
      if (best) {
        widest = best;
        widestRow = bestRow;
      }
    }
    return widest ? { widest, widestRow, rowsOnModel, rows: OCCUPANCY_ROWS.length } : null;
  };

  // 0. The framing a scene opens at is the framing it returns to.
  //
  //    The camera is fitted to the band no panel is covering, and the panels
  //    are not finished when the app is — the shell releases the console from
  //    a full-width card to a small one in the corner after `createApp`
  //    returns, and a fifth of the frame's height comes back. A watcher exists
  //    to re-frame when that happens, and it was discarding every re-frame:
  //    it asked for the camera to be within a thousandth of a world unit of
  //    the shot, and `controls.update()` runs every frame with damping on and
  //    leaves about a hundred and twenty-five thousandths more than that. So
  //    the nose opened at 8.96 world units where the settled layout asks for
  //    7.54, and pressing "reset the display" jumped it.
  //
  //    Checked here because it is invisible anywhere else: both framings are
  //    valid poses, the scene is not broken, and the only symptom is that the
  //    first thing a reader sees is not the composition the scene meant.
  const openingSpan = await modelSpan(0.45);
  /**
   * Where the camera is, and what the bands it was fitted to are doing.
   *
   * The span above says the two framings differ; it cannot say why, and the
   * two causes want opposite fixes. Either the camera never moved to the
   * settled framing — a re-frame that did not happen — or it moved and the
   * bands themselves are different at the two moments, in which case the
   * framing is right both times and something is still resizing. Reading the
   * distance and the three band rects at both moments separates them, and it
   * costs one evaluate per moment.
   */
  const pose = () =>
    page.evaluate(() => {
      const app = window.__app;
      if (!app) return null;
      const round = (n) => Math.round(n * 10) / 10;
      const rect = (selector) => {
        const element = document.getElementById('ui')?.querySelector(selector);
        if (!element) return null;
        const box = element.getBoundingClientRect();
        if (!box.width || !box.height) return null;
        return [round(box.left), round(box.top), round(box.right), round(box.bottom)];
      };
      const camera = app.viewer.camera;
      const target = app.viewer.controls.target;
      // The subject the framing was fitted to, as the framing asks for it.
      // Same bands and a different distance means the box moved, and the box
      // is the scene's answer about what it is currently drawing — so it is
      // read here rather than inferred from the distance.
      const subject = app.scene.getSubjectBounds?.() ?? null;
      const box = subject?.corners?.length
        ? subject.corners.reduce(
            (acc, corner) => ({
              min: [Math.min(acc.min[0], corner.x), Math.min(acc.min[1], corner.y), Math.min(acc.min[2], corner.z)],
              max: [Math.max(acc.max[0], corner.x), Math.max(acc.max[1], corner.y), Math.max(acc.max[2], corner.z)],
            }),
            { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
          )
        : null;
      return {
        distance: Math.round(camera.position.distanceTo(target) * 1000) / 1000,
        target: [round(target.x), round(target.y), round(target.z)],
        subject: box
          ? {
              size: box.max.map((high, axis) => Math.round((high - box.min[axis]) * 100) / 100),
              centre: box.max.map((high, axis) => Math.round((high + box.min[axis]) * 50) / 100),
            }
          : null,
        console: rect('.console'),
        rail: rect('.rail'),
        nav: rect('.global-scene-nav'),
      };
    });
  const openingPose = await pose();


  // Off unless asked for, and taken **after** the row above rather than before
  // it. Measured: the sweep is about three hundred pointer moves, each one a
  // raycast and a repaint under software GL, and it put three minutes on a
  // scene that takes two and a half. `verify:anatomy` runs every scene in
  // series and the brain alone is ten minutes, so a measurement that answers a
  // cross-scene question — how much of the frame does this one use — does not
  // belong in every run. Pass `--silhouette` when that is the question.
  //
  // Ordering matters for the same reason the check below exists: it is about
  // the framing a scene *opens* at, and three minutes of pointer moves between
  // the scene opening and that row is three minutes for a late re-frame to
  // happen unseen, which would leave "opens differently from how it resets"
  // green about the drift it was written to catch.
  const silhouette = flag('--silhouette') ? await modelSilhouette() : null;
  if (silhouette) {
    observed.silhouette = silhouette;
    notes.push(
      `silhouette: widest ${silhouette.widest[0]}..${silhouette.widest[1]} ` +
        `(${(silhouette.widest[1] - silhouette.widest[0]).toFixed(2)} of the frame) at fy=${silhouette.widestRow}; ` +
        `on the model at ${silhouette.rowsOnModel} of ${silhouette.rows} rows. ` +
        'Compare scenes with this, not with the mid-height span below.'
    );
  } else if (flag('--silhouette')) {
    notes.push('silhouette: the model was not found on any of the rows swept, so no width was measured');
  }

  if (!openingSpan) {
    notes.push('the model does not cross the middle of the frame, so the opening framing was not measured');
  } else {
    await page.locator('#anatomy-tab-display').click({ noWaitAfter: true }).catch(() => {});
    await page.waitForTimeout(200);
    const reset = page.locator('.inspection-reset');
    if (await reset.count()) {
      at('resetting the display before anything has changed it');
      await reset.click({ noWaitAfter: true });
      await page.waitForTimeout(2500);
      await settle(8, 250);
      await page.locator('#anatomy-tab-parts').click({ noWaitAfter: true }).catch(() => {});
      await page.waitForTimeout(200);
      const resetSpan = await modelSpan(0.45);
      if (!resetSpan) {
        problems.push('resetting the display took the model off the middle of the frame');
      } else {
        const moved = Math.max(
          Math.abs(resetSpan[0] - openingSpan[0]),
          Math.abs(resetSpan[1] - openingSpan[1])
        );
        observed.openingFraming = { opening: openingSpan, reset: resetSpan };
        observed.openingPose = { opening: openingPose, reset: await pose() };
        // Two sweep steps: a step is 2% of the frame, so anything the sweep can
        // see at all is at least one, and this is the smallest difference that
        // cannot be the grid's own resolution.
        if (moved > 0.04) {
          problems.push(
            `the scene opens framed differently from how it resets: across the frame's middle row the model spans ` +
              `${openingSpan[0]}..${openingSpan[1]} of the frame at first and ` +
              `${resetSpan[0]}..${resetSpan[1]} after "reset the display", with nothing ` +
              'moved in between. The reader sees the first one.'
          );
        }
      }
    }
  }

  // Everything below drives the scene. `--framing-only` stops here, for the one
  // question the block above answers — the brain alone is ten minutes and a
  // framing fix is iterated on, not measured once. It is not a run of this
  // check: it says so in the output, and it is never what `verify:anatomy`
  // does.
  if (flag('--framing-only')) {
    notes.push('framing only: nothing below the opening-framing check was driven, so this is not a verify:anatomy run');
    throw STOPPED_AFTER_FRAMING;
  }

  // 1. A click on the model names a structure, in both languages, with a path.
  //    The last point that *hit* is remembered, because a point that misses
  //    clears the selection: with a miss last, everything below was testing
  //    what happens to a selection that is not there, and reporting it as the
  //    scene losing one.
  const clickPoints = authoredPoints ?? modelPoints.slice(0, 4);
  if (!authoredPoints) {
    notes.push(
      `no authored click tour for ${sceneSlug}; clicked ${clickPoints.length} point(s) measured to be over ` +
        'the model. Add an entry to SCENE_POINTS to name what each click is on.'
    );
  }
  // Where the model was found, in the form a SCENE_POINTS entry takes. Writing
  // a tour otherwise means guessing at fractions and reading back "only 1 of 4
  // resolved" — which is how the first attempt at the heart's went. The drive
  // already knows; this is it saying so.
  notes.push(
    `points measured over the model: ${modelPoints.map(([x, y]) => `${x},${y}`).join(' ')}` +
      ` (pass them to --points, or paste into SCENE_POINTS as [[${modelPoints
        .slice(0, 4)
        .map(([x, y]) => `${x}, ${y}`)
        .join('], [')}]])`
  );

  let lastHitPoint = null;
  /** What each authored point actually named, so the tour can be held to it. */
  const tour = [];
  for (const [fx, fy, expected] of clickPoints) {
    const hit = await clickAt(fx, fy);
    tour.push({ fx, fy, expected: expected ?? null, got: hit.en === EMPTY ? null : hit.en });
    observed.tour = tour;
    if (hit.en === EMPTY) continue;
    lastHitPoint = [fx, fy];
    observed.structures.push(hit);
    if (!hit.ja || hit.ja === '部位を選択してください') problems.push(`"${hit.en}" has no Japanese name`);
    if (!hit.where.includes('›')) problems.push(`"${hit.en}" is named without a place in the hierarchy`);
  }

  // A tour that says which structure each point is on is held to it.
  //
  // Without this the drive only needed three non-empty answers and never looked
  // at *which* structures came back — so a layout or opening-camera change
  // could slide the points onto other meshes, or onto the same mesh four times,
  // and everything would stay green while a publication record went on claiming
  // four named parts across two files. Such a change need not touch the scene's
  // own sources, so the model-revision digest would not notice either.
  for (const stop of tour.filter((entry) => entry.expected)) {
    if (stop.got === null) {
      problems.push(`the tour's point (${stop.fx}, ${stop.fy}) should be on "${stop.expected}" and hit nothing`);
    } else if (stop.got !== stop.expected) {
      problems.push(`the tour's point (${stop.fx}, ${stop.fy}) should be on "${stop.expected}" and named "${stop.got}"`);
    }
  }
  const named = tour.filter((entry) => entry.expected && entry.got).map((entry) => entry.got);
  if (named.length !== new Set(named).size) {
    problems.push(`the tour names ${new Set(named).size} distinct structure(s) from ${named.length} point(s)`);
  }
  if (observed.structures.length < 3) {
    problems.push(
      `only ${observed.structures.length} of ${clickPoints.length} click(s) resolved to a structure. ` +
        'Either the picking is broken or the points are not on this organ — look at the screenshot ' +
        'before believing the first one, and see SCENE_POINTS at the top of this file.'
    );
  }
  await shot('brain-selection');

  // Everything below pins a structure and watches what happens to it. With
  // nothing pinned there is nothing to watch, and going on used to produce a
  // TypeError that buried the sentence above it. Thrown rather than returned,
  // because the catch below is already the place that turns "this step could
  // not run" into a finding without discarding the ones already collected.
  if (!lastHitPoint) throw new Error('no structure was ever selected, so nothing below could be checked');
  if ((await read()).en === EMPTY) await clickAt(lastHitPoint[0], lastHitPoint[1]);
  const pinned = await read();

  // 2. A drag is not a click. Orbiting away from the pinned structure and
  //    releasing over another one must not reselect.
  const [dragFromX, dragFromY] = atModel(0);
  const [dragToX, dragToY] = atModel(2);
  await page.mouse.move(box.x + box.width * dragFromX, box.y + box.height * dragFromY);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * dragToX, box.y + box.height * dragToY, { steps: 20 });
  await page.mouse.up();
  await restPointer();
  const afterDrag = await read();
  // Orbit back towards where the sweep happened, by giving the drag its own
  // path in reverse.
  //
  // **It does not put the camera back, and nothing below may assume it does.**
  // This comment used to say it did — "only still true if the camera is put
  // back" — and that was measured false: the controls damp, so a press given
  // back its own path is not given back its own rotation. The shoulder left
  // from (-3.60, 2.20, 6.60) and came back at (-2.23, 3.38, 4.24), a third of
  // the way round the joint, with the canvas the same size and nothing hidden.
  // Believing the claim cost a day and a follow-up (F-127) that accused the
  // scene of losing a selection it was still holding.
  //
  // Approximate is enough for what this step *asks* — did a drag select
  // something — and that is all it is for. Every later point is asked for
  // again, through `liveModelPoint`, rather than remembered from before the
  // turn.
  await page.mouse.move(box.x + box.width * dragToX, box.y + box.height * dragToY);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * dragFromX, box.y + box.height * dragFromY, { steps: 20 });
  await page.mouse.up();
  await restPointer();
  if (afterDrag.en !== pinned.en) {
    problems.push(`a drag changed the selection from "${pinned.en}" to "${afterDrag.en}"`);
  }

  // A drag leaves the controls damping, and they go on moving the model for
  // most of a second after the button comes up. Without this the point below is
  // asked about one frame and clicked on another: the foot reported "a click on
  // empty space left the Achilles tendon selected" about a point the scene had
  // just said was background, because between the asking and the clicking the
  // tendon drifted under it.
  await settle(8, 200);

  // 3. Clicking the background clears rather than keeping a stale card.
  //    Confirmed to still be background first. The point was chosen before the
  //    drag, and beside a subject with a large open outline — a ring of lips
  //    around a mouth — a pixel that read as background then can be over the
  //    model now. Checking it again costs one pointer move and stops the check
  //    reporting the product for the instrument's own staleness.
  //    The three fallbacks this used were three corners, and it kept the stale
  //    point when all three were taken — so a subject that had grown was
  //    reported as the product failing to clear a selection.
  const emptyNow = (await overModel(emptyPoint[0], emptyPoint[1])) ? await liveEmptyPoint() : emptyPoint;
  await restPointer();
  if (!emptyNow) {
    notes.push('the model covers every point this looked at, so clicking nothing was not checked');
  } else {
    const afterEmpty = await clickAt(emptyNow[0], emptyNow[1]);
    if (afterEmpty.en !== EMPTY) problems.push(`a click on empty space left "${afterEmpty.en}" selected`);
  }
  // At a point that selected something during the sweep, not at the middle of
  // the frame: not every scene has anything in the middle. The drainage map's
  // centre is a body outline drawn too faint to be clickable, so a centre click
  // there reports the selection failing to come back when nothing is wrong.
  //
  //    Asked for again rather than remembered: the click that recorded
  //    `lastHitPoint` may itself have taken the scene to that structure's
  //    preferred view, in which case the point it was recorded at is now
  //    background. That is how the nose came to report "a structure could not
  //    be selected again after clearing" about a scene that selects perfectly
  //    well — and then three more failures downstream of the selection it had
  //    just been denied.
  const reselectPoint = (await liveModelPoint()) ?? lastHitPoint;
  await page.mouse.click(
    box.x + box.width * reselectPoint[0],
    box.y + box.height * reselectPoint[1]
  );
  await page.waitForTimeout(350);
  await restPointer();
  const reselected = await read();
  if (reselected.en === EMPTY) problems.push('a structure could not be selected again after clearing');

  // 3b. A pinned structure is not rewritten by a pointer crossing the model.
  //     This is what `hovered ?? selected` got wrong: moving the mouse replaced
  //     the name — and the controls beside it — with whatever it passed over.
  await page.mouse.move(box.x + box.width * atModel(3)[0], box.y + box.height * atModel(3)[1]);
  await page.waitForTimeout(400);
  const whileHovering = await read();
  if (whileHovering.en !== reselected.en) {
    problems.push(`hovering rewrote the pinned summary from "${reselected.en}" to "${whileHovering.en}"`);
  }
  await restPointer();

  // 4. The part tree and the model are two readings of one selection.
  const leaves = page.locator('.anatomy-tree-leaf');
  observed.treeRows = await leaves.count();
  if (!observed.treeRows) {
    problems.push('the part tree rendered no structures');
  } else {
    // Selecting in 3D highlights the matching row — including opening the
    // branch it sits in, or the panel silently disagrees with the model.
    const selectedRows = page.locator('.anatomy-tree-leaf[aria-selected="true"]');
    if ((await selectedRows.count()) !== 1) {
      problems.push(`${await selectedRows.count()} tree rows are marked selected after a 3D click; expected 1`);
    } else {
      const rowName = (await selectedRows.first().locator('.lang-en').first().textContent()).trim();
      if (rowName !== reselected.en) {
        problems.push(`the model says "${reselected.en}" and the tree highlights "${rowName}"`);
      }
      if (!(await selectedRows.first().isVisible())) {
        problems.push('the selected row is inside a collapsed branch, so the tree does not show the selection');
      }
    }

    // And the other direction: selecting a row selects that structure.
    //
    // A *visible* row. The tree opens the branch the selection is in and
    // leaves the rest closed, so on an organ with more branches than the brain
    // the third leaf in the DOM is inside a collapsed one — and clicking a row
    // nobody can see is not the interaction being checked.
    const openLeaves = page.locator('.anatomy-tree-leaf:visible');
    const openCount = await openLeaves.count();
    if (!openCount) problems.push('every row of the part tree is inside a collapsed branch');
    // `Math.max(0, …)` so a tree with no open row asks for row 0 and fails on
    // the assertion above rather than on `nth(-1)`.
    const row = openLeaves.nth(Math.min(2, Math.max(0, openCount - 1)));
    const rowName = (await row.locator('.lang-en').first().textContent()).trim();
    at('selecting a structure from the part tree');
    await row.click();
    await page.waitForTimeout(350);
    const fromTree = await read();
    if (fromTree.en !== rowName) {
      problems.push(`clicking the tree row "${rowName}" put "${fromTree.en}" on the card`);
    }
    if ((await page.locator('.anatomy-tree-leaf[aria-selected="true"]').count()) !== 1) {
      problems.push('selecting from the tree left more than one row marked selected');
    }
    await shot('brain-tree');

    // 5. Isolate shows one structure, and Show all puts the model back.
    // By name, not by position: the actions row grew and "the first one" is a
    // different button than it was.
    const isolate = page.locator('.anatomy-panel-action[data-action="isolate"]');
    at('isolating one structure');
    await isolate.click();
    await page.waitForTimeout(500);
    if ((await isolate.getAttribute('aria-pressed')) !== 'true') problems.push('isolating did not take');
    const whileIsolated = await read();
    if (whileIsolated.en !== fromTree.en) {
      problems.push(`isolating changed the selection from "${fromTree.en}" to "${whileIsolated.en}"`);
    }
    // Nothing else is clickable while one structure is isolated.
    await page.mouse.click(box.x + box.width * atModel(4)[0], box.y + box.height * atModel(4)[1]);
    await page.waitForTimeout(350);
    const afterStrayClick = await read();
    if (afterStrayClick.en !== EMPTY && afterStrayClick.en !== fromTree.en) {
      problems.push(`a click on a hidden structure selected "${afterStrayClick.en}" while isolated`);
    }
    await shot('brain-isolated');

    at('showing everything again');
    await page.locator('.anatomy-panel-action[data-action="show-all"]').click();
    await page.waitForTimeout(600);
    if ((await isolate.getAttribute('aria-pressed')) !== 'false') {
      problems.push('Show all did not clear the isolation');
    }
    // Back to a whole model: the structures that were on screen before are
    // clickable again. Clicked at a point that is over the model *now* rather
    // than at the middle of the frame — the middle of a drainage map is a body
    // outline drawn too faint to be clickable at all, and a check that assumes
    // every scene has something in the centre reports that as the model failing
    // to come back. Asked for again rather than remembered, for the reason
    // every other point here is: the clicks between then and now can have taken
    // the scene to a structure's preferred view.
    const restorePoint = (await liveModelPoint()) ?? lastHitPoint;
    await page.mouse.click(
      box.x + box.width * restorePoint[0],
      box.y + box.height * restorePoint[1]
    );
    await page.waitForTimeout(400);
    const afterRestore = await read();
    if (afterRestore.en === EMPTY) {
      problems.push('after Show all, clicking the model selected nothing — it did not come back');
    }
  }

  // 5b. A branch comes off in one press, and comes back the same way.
  //
  // The point of the control is the *many*: a reader taking the chamber
  // surfaces off to look inside, or a hemisphere off to see the midline. So
  // this presses the branch with the most structures under it rather than the
  // first one, because the first branch on some scenes holds exactly one
  // structure and hiding one structure would pass a check meant for seventy.
  //
  // **Counting the hidden set is the wrong measure**, and this check made that
  // mistake first: the heart opens with six structures already hidden — the
  // arch branches and the brachiocephalic veins, which are in the way of the
  // organ — so "hid 46" came back as "hid 40" and read as the feature being
  // broken. What matters is which structures, not how many: every leaf of the
  // branch hidden afterwards, none of them hidden after the press back, and
  // nothing outside the branch touched either way.
  //
  // Scenes whose model cannot hide a set do not draw the control at all
  // (`setStructuresHidden` is optional in the contract); there the branch is
  // recorded as absent rather than reported as broken.
  {
    const groups = await page.evaluate(() => {
      const out = [];
      for (const branch of document.querySelectorAll('.anatomy-tree-branch')) {
        const control = branch.querySelector(':scope > .anatomy-tree-visibility');
        if (!control) continue;
        out.push({
          node: control.dataset.groupVisibility,
          label: branch.getAttribute('aria-label') ?? '',
          leaves: [...branch.querySelectorAll('.anatomy-tree-leaf')].map((row) => row.dataset.structure),
        });
      }
      return out.sort((a, b) => b.leaves.length - a.leaves.length);
    });
    if (!groups.length) {
      notes.push('no group has a visibility control — this scene\'s model cannot hide a set');
    } else {
      const biggest = groups[0];
      const mine = new Set(biggest.leaves);
      // Ids reach the DOM as strings whatever the scene's own type is, so both
      // sides are compared as strings.
      const hiddenSet = async () => page.evaluate(() => {
        const list = window.__app?.scene?.getAnatomyVisibility?.().hidden;
        return list ? list.map(String) : null;
      });
      const control = page.locator(`[data-group-visibility="${biggest.node}"]`);
      const branch = page.locator(`[data-node="${biggest.node}"]`);
      const start = await hiddenSet();
      if (start === null) {
        problems.push('the scene does not report its hidden set; group visibility cannot be measured');
      } else {
        // What the press must not touch: everything the scene had hidden that
        // is not under this branch.
        const elsewhere = start.filter((id) => !mine.has(id));
        const missing = (set, ids) => ids.filter((id) => !set.has(id));

        const press = async (how, run) => {
          at(how);
          await run();
          await page.waitForTimeout(400);
          return new Set(await hiddenSet());
        };

        const hide = await press(
          `hiding the branch "${biggest.label}" in one press`,
          // `force`, because the control is quiet until the row is hovered: it
          // is drawn at zero opacity so a tree of four hundred rows is not four
          // hundred buttons shouting, and Playwright reads that as not visible.
          () => control.click({ force: true })
        );
        const left = missing(hide, biggest.leaves);
        if (left.length) {
          problems.push(
            `pressing the branch "${biggest.label}" left ${left.length} of its ${biggest.leaves.length} structures on screen`
          );
        }
        const lost = missing(hide, elsewhere);
        if (lost.length) {
          problems.push(`pressing the branch "${biggest.label}" un-hid ${lost.length} structure(s) outside it`);
        }
        if ((await control.getAttribute('aria-pressed')) !== 'true') {
          problems.push('a branch whose structures are all hidden does not announce it');
        }
        await shot('group-hidden');

        const show = await press('showing the branch again', () => control.click({ force: true }));
        const stuck = biggest.leaves.filter((id) => show.has(id));
        if (stuck.length) {
          problems.push(`showing the branch again left ${stuck.length} of its structures hidden`);
        }
        const collateral = missing(show, elsewhere);
        if (collateral.length) {
          problems.push(`showing the branch un-hid ${collateral.length} structure(s) outside it`);
        }

        // And the same action from the keyboard, on the focused branch.
        const byKey = await press('hiding the branch from the keyboard', async () => {
          await branch.focus();
          await page.keyboard.press('v');
        });
        const keyLeft = missing(byKey, biggest.leaves);
        if (keyLeft.length) {
          problems.push(
            `V on the focused branch "${biggest.label}" left ${keyLeft.length} of its structures on screen`
          );
        }
        const back = await press('showing it again from the keyboard', () => page.keyboard.press('v'));
        const keyStuck = biggest.leaves.filter((id) => back.has(id));
        if (keyStuck.length) problems.push(`V did not put ${keyStuck.length} of the branch's structures back`);

        observed.groupHidden = { label: biggest.label, structures: biggest.leaves.length };
        // Said rather than assumed: a group press is "show everything under
        // this branch", so on a scene that opens with some of them hidden it
        // shows those too — the same thing "Unhide all" does.
        if (elsewhere.length !== start.length) {
          notes.push(
            `${start.length - elsewhere.length} structure(s) under "${biggest.label}" were already hidden when the ` +
              'scene opened; showing the branch shows those as well, as "Unhide all" does'
          );
        }
      }
    }
  }

  // 6. The tree is a tree to the keyboard, not a list of buttons.
  const treeState = async () => page.evaluate(() => {
    const rows = [...document.querySelectorAll('.anatomy-tree-group, .anatomy-tree-leaf')];
    const branches = [...document.querySelectorAll('.anatomy-tree-branch')];
    return {
      tabbable: rows.filter((row) => row.tabIndex === 0).length,
      focused: document.activeElement?.className ?? null,
      focusedText: document.activeElement?.textContent?.trim().slice(0, 40) ?? null,
      selected: document.querySelectorAll('.anatomy-tree-leaf[aria-selected="true"]').length,
      // The state a reader sees, the state the component holds and the state it
      // announces have to be one answer.
      mismatched: branches.filter((branch) => {
        const toggle = branch.firstElementChild;
        const children = branch.lastElementChild;
        const announced = branch.getAttribute('aria-expanded');
        return announced !== toggle.getAttribute('aria-expanded') || announced !== String(!children.hidden);
      }).length,
    };
  });

  const before = await treeState();
  if (before.tabbable !== 1) {
    problems.push(`${before.tabbable} tree rows are in the tab ring; a tree has one entry point`);
  }
  if (before.mismatched) {
    problems.push(`${before.mismatched} branch(es) announce an expanded state that does not match what is drawn`);
  }

  await page.locator('.anatomy-tree-group, .anatomy-tree-leaf').first().focus();
  const walk = async (key) => {
    await page.keyboard.press(key);
    await page.waitForTimeout(120);
    return treeState();
  };

  const down = await walk('ArrowDown');
  if (down.focusedText === before.focusedText) problems.push('ArrowDown did not move focus in the tree');
  // Moving focus is not selecting: arrowing through four hundred structures
  // while each one repaints the model would make the keyboard unusable.
  if (down.selected !== before.selected) problems.push('moving focus with the keyboard changed the selection');
  const seekedAway = await page.evaluate(() => document.querySelector('.stage-name')?.textContent ?? '');

  const right = await walk('ArrowRight');
  if (right.mismatched) problems.push('ArrowRight left a branch announcing the wrong expanded state');
  const left = await walk('ArrowLeft');
  if (left.mismatched) problems.push('ArrowLeft left a branch announcing the wrong expanded state');
  const end = await walk('End');
  if (end.focusedText === left.focusedText) problems.push('End did not move focus to the last visible row');
  const home = await walk('Home');
  if (home.focusedText === end.focusedText) problems.push('Home did not move focus to the first row');

  // Enter commits, and only then.
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(120);
  const committed = await walk('Enter');
  if (committed.mismatched) problems.push('Enter left a branch announcing the wrong expanded state');
  if (await page.evaluate(() => document.querySelector('.stage-name')?.textContent ?? '') !== seekedAway) {
    problems.push('the tree keys reached the scene: the model was seeked while arrowing through the list');
  }
  if ((await treeState()).tabbable !== 1) problems.push('the tab ring lost its single entry point after keyboard use');

  // The display controls live in the panel's own Display tab.
  const tab = (ja) => page.locator('.anatomy-panel-tab', { hasText: ja });
  at('opening the Display tab');
  await tab('表示').click();
  await page.waitForTimeout(400);

  // 3c. The structure a reader pinned is named on the model, not only in the
  //     panel — and that label obeys the same occlusion rule as the authored
  //     ones, so turning away from the structure takes it with it while the
  //     card goes on naming it.
  //
  //     **This used to be a note, never a failure** (L-46): the scene *did*
  //     answer "no label here", correctly, and the line below turned that
  //     correct answer into a comment instead of a red run — so a selection
  //     could go unlabelled on every angle, forever, without this ever
  //     saying so. It is asserted now for the scenes whose scene class
  //     actually implements `getStructureAnnotation` (a selection gets an
  //     anchor of its own, on the same terms `docs/model-cards/brain-anatomy.md`
  //     describes); the rest share `OrganAnatomyScene`, which does not yet,
  //     and that is a real, separate gap — reported, not silently passed.
  //     **What is asserted is the anchoring, not the method's existence.**
  //     `heart-anatomy` implements `getStructureAnnotation` too, but its
  //     `_anchorFor()` still keeps one fixed outward point per structure, with
  //     no candidate list and no `reanchor()` — so a heart selection can be
  //     occluded from an angle with nothing the scene can do about it, which
  //     is F-40 itself and not a regression. Only a scene that can move its
  //     anchor is held to "labelled whenever drawn"; the rest are noted, each
  //     with the reason that applies to it.
  const SCENES_WITH_MOVABLE_ANCHORS = new Set(['brain-anatomy']);
  const SCENES_WITH_FIXED_ANCHORS = new Set(['heart-anatomy']);
  const labelTexts = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('.label3d')]
        .filter((node) => node.style.visibility !== 'hidden' && node.style.opacity !== '0')
        .map((node) => node.querySelector('.label-ja')?.textContent?.trim())
        .filter(Boolean)
    );
  const pinnedName = async () =>
    (await page.locator('.anatomy-panel-name.lang-ja').first().textContent()).trim();

  const labelPoint = await liveModelPoint(1);
  if (!labelPoint) {
    problems.push('nothing on screen is over the model by the time the label check runs');
  }
  await restPointer();
  await page.mouse.click(
    box.x + box.width * (labelPoint ?? atModel(1))[0],
    box.y + box.height * (labelPoint ?? atModel(1))[1]
  );
  await page.waitForTimeout(500);
  const pinnedForLabel = await pinnedName();
  const labelled = await labelTexts();
  observed.labels = labelled;
  if (labelled.length > 6) {
    problems.push(`${labelled.length} labels are on screen at once; the cap is 6`);
  }
  if (pinnedForLabel && !labelled.includes(pinnedForLabel) && SCENES_WITH_MOVABLE_ANCHORS.has(sceneSlug)) {
    // A selection is exempt from the label cap and, since L-46, is not held to
    // the single fixed anchor a landmark is: `_visibleAnchorFor` in
    // `BrainAnatomyScene.js` ranks candidates and `reanchor()` swaps in one the
    // live camera can see. With that in place the label must be there whenever
    // the structure is drawn, so a miss is a real regression — not an angle the
    // anchor cannot help. See F-40, L-46.
    problems.push(
      `the pinned structure "${pinnedForLabel}" has no label on the model from this angle — ` +
        'a selection must be labelled whenever its structure is drawn (F-40, L-46).'
    );
  } else if (pinnedForLabel && !labelled.includes(pinnedForLabel) && SCENES_WITH_FIXED_ANCHORS.has(sceneSlug)) {
    // The scene names a selection on the model, but from one point chosen at
    // load: `HeartAnatomyScene._anchorFor()` caches a single
    // `outwardSurfacePoint()` and there is nothing to ask for another. So this
    // is F-40 in its original shape — the anchor happens to be behind
    // something from here — and calling it a regression would send the next
    // reader looking for a change that did not happen (L-29).
    notes.push(
      `"${pinnedForLabel}" has no on-model selection label — ${sceneSlug} anchors a selection ` +
        'at one fixed point and cannot move it, so this angle is F-40, not a regression. ' +
        'Ranked candidates + reanchor() (BrainAnatomyScene) is what would make it assertable.'
    );
  } else if (pinnedForLabel && !labelled.includes(pinnedForLabel)) {
    // `${sceneSlug}` shares `OrganAnatomyScene`, which does not implement
    // `getStructureAnnotation` at all — no scene here has ever put a
    // selection's name on the model, on any angle, so this is a known, larger
    // gap rather than the per-angle occlusion L-46 is about. Noted, not failed.
    notes.push(
      `"${pinnedForLabel}" has no on-model selection label — ${sceneSlug} does not implement ` +
        'getStructureAnnotation yet (see brain-anatomy for the pattern).'
    );
  } else if (pinnedForLabel) {
    // It is there. Now turn to the other side: it must go, and the card must not.
    const otherSide = page.locator('.inspection-choice.inspection-view').filter({ hasText: '右外側' }).first();
    if (await otherSide.count()) {
      await page.locator('#anatomy-tab-display').click({ noWaitAfter: true }).catch(() => {});
      await page.waitForTimeout(300);
    at('turning to the other side of the head');
      await otherSide.click({ noWaitAfter: true });
      // Waited out as a state, not as a duration. A fixed 2500ms was enough
      // while the scene opened at a framing it had already abandoned: the turn
      // to the other side started closer to where it was going. Once the
      // opening framing actually applied (F-133), the same turn had further to
      // travel and this read the labels mid-flight, reporting a label that had
      // not gone yet as one that never goes. That is L-14 in the one file that
      // quotes it, and it was green for as long as the framing was wrong.
      await settle(8, 250);
      const afterTurn = await labelTexts();
      if (afterTurn.includes(pinnedForLabel)) {
        problems.push(`"${pinnedForLabel}" is still labelled after turning to the other side of the head`);
      }
      if ((await pinnedName()) !== pinnedForLabel) {
        problems.push('hiding a label changed what the panel says is pinned');
      }
      await page.locator('.inspection-choice.inspection-view').first().click({ noWaitAfter: true });
      await page.waitForTimeout(2000);
      await page.locator('#anatomy-tab-parts').click({ noWaitAfter: true }).catch(() => {});
      await page.waitForTimeout(200);
    }
  }

  // The display controls are read next, and the step above may or may not have
  // left the panel on the tab that holds them: whether it turns the head at all
  // depends on whether the structure the pointer happened to land on carries a
  // visible label from that angle. That is a fact about the model, not about
  // the panel, and it must not decide whether this check can see the viewpoints
  // — which is exactly what it did: one run reported "the scene offers no named
  // viewpoints" about a scene with eight of them, because the panel was sitting
  // on Parts. So the tab is opened here rather than assumed.
  await tab('表示').click();
  await page.waitForTimeout(300);

  // 4. Recolouring is a display choice: it must not change what is selected.
  observed.colorModes = (await page.locator('.inspection-choice.inspection-mode').allTextContents()).map((t) =>
    t.replace(/\s+/g, ' ').trim()
  );
  let settled = null;
  if (observed.colorModes.length > 1) {
    const beforeMode = await read();
    // Said out loud, because "recolouring changed nothing" is also true of a
    // panel that was already empty — and then the tree count below reads as a
    // recolouring defect when the selection had been lost somewhere earlier.
    if (beforeMode.en === EMPTY) {
      problems.push('nothing was selected when the recolouring check ran, so it had nothing to preserve');
    }
    // The mode that is **not** the one on screen, asked of the buttons rather
    // than assumed to be index 1. It was index 1 until organs started opening
    // in tissue colour — which is the second mode — and from that day this
    // clicked the active button, `setAnatomyColorMode` returned false without
    // doing anything, and the check passed having recoloured nothing. A guard
    // that cannot tell "nothing changed because it held" from "nothing changed
    // because nothing happened" is not guarding (L-09).
    const other = page.locator('.inspection-choice.inspection-mode:not([aria-pressed="true"])').first();
    if (!(await other.count())) {
      problems.push('every colour-mode button reports itself active, so the recolouring check had nothing to press');
    }
    const modeBefore = await page.evaluate(() => document.getElementById('ui')?.dataset.inspectionMode ?? null);
    await other.click();
    await page.waitForTimeout(600);
    const modeAfter = await page.evaluate(() => document.getElementById('ui')?.dataset.inspectionMode ?? null);
    if (modeBefore === modeAfter) {
      problems.push(`pressing the other colour mode left the scene in "${modeAfter}" — nothing was recoloured`);
    }
    const afterMode = await read();
    if (afterMode.en !== beforeMode.en) {
      problems.push(`switching colour mode changed the selection from "${beforeMode.en}" to "${afterMode.en}"`);
    }
    // Back to the parts tab to see what the tree says about it.
    await tab('部位').click();
    await page.waitForTimeout(300);
    const stillOne = await page.locator('.anatomy-tree-leaf[aria-selected="true"]').count();
    if (observed.treeRows && beforeMode.en !== EMPTY && stillOne !== 1) {
      problems.push(`recolouring left ${stillOne} rows marked selected in the tree`);
    }
    await tab('表示').click();
    await page.waitForTimeout(300);
    settled = afterMode;
    await shot('brain-colour-mode');
  } else {
    notes.push('only one colour mode was offered, so the recolouring check did not run.');
  }

  // 5. Moving the camera to a named viewpoint must not change it either.
  observed.views = (await page.locator('.inspection-choice.inspection-view').allTextContents()).map((t) =>
    t.replace(/\s+/g, ' ').trim()
  );
  if (observed.views.length) {
    const beforeView = settled ?? (await read());
    await page.locator('.inspection-choice.inspection-view').first().click();
    await page.waitForTimeout(900);
    const afterView = await read();
    if (afterView.en !== beforeView.en) {
      problems.push(`applying a viewpoint changed the selection from "${beforeView.en}" to "${afterView.en}"`);
    }
    await shot('brain-view');
  } else {
    problems.push('the scene offers no named viewpoints');
  }
  // 6b. The tabs are reachable and operable without a mouse.
  await tab('部位').click();
  await page.waitForTimeout(200);
  await page.locator('.anatomy-panel-tab[aria-selected="true"]').focus();
  const openTabId = () => page.evaluate(() =>
    document.querySelector('.anatomy-panel-tab[aria-selected="true"]')?.id ?? null
  );
  const focusedTabId = () => page.evaluate(() => document.activeElement?.id ?? null);
  if ((await focusedTabId()) !== 'anatomy-tab-parts') problems.push('the open tab is not the one the tab ring lands on');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(120);
  if ((await focusedTabId()) !== 'anatomy-tab-display') problems.push('ArrowRight did not move focus along the tabs');
  if ((await openTabId()) !== 'anatomy-tab-parts') problems.push('moving focus along the tabs opened one');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  if ((await openTabId()) !== 'anatomy-tab-display') problems.push('Enter did not open the focused tab');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  if ((await openTabId()) !== 'anatomy-tab-detail') problems.push('End then Enter did not reach the last tab');
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  if ((await openTabId()) !== 'anatomy-tab-parts') problems.push('Home then Enter did not return to the first tab');
  // And Tab from the tab list reaches the body it controls.
  await page.keyboard.press('Tab');
  await page.waitForTimeout(150);
  if (!(await page.evaluate(() => document.querySelector('.anatomy-panel-body').contains(document.activeElement)))) {
    problems.push('Tab from the tab list did not reach the panel body');
  }

  // 7. On a phone the body is a sheet, and a sheet has obligations.
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(400);
  const layout = await page.getAttribute('.anatomy-panel', 'data-layout');
  if (layout !== 'sheet') {
    problems.push(`at 375x667 the panel is "${layout}"; the body should become a sheet`);
  } else {
    const pinnedBefore = await read();
    const openButton = page.locator('.anatomy-panel-open');
    if (!(await openButton.isVisible())) problems.push('there is no Parts button to open the sheet with');

    at('opening the parts sheet on a phone');
    await openButton.focus();
    await openButton.click();
    await page.waitForTimeout(400);

    // Whether anything outside the dialog is still live, asked *first*. It is
    // the check most likely to be the reason a later step cannot click what it
    // means to: a background left reachable is a background still on top, and a
    // timeout is a worse way to learn that than a sentence.
    const outsideReachable = await page.evaluate(() => {
      const sheet = document.querySelector('.anatomy-panel-sheet');
      const live = (node) => {
        for (let at = node; at; at = at.parentElement) if (at.inert) return false;
        return true;
      };
      return [...document.querySelectorAll('button, a[href], input, select, textarea')]
        .filter((node) =>
          !sheet.contains(node) &&
          // As above: a closed `<details>` still lays its contents out here,
          // and a control nobody can see is not a control that is "still
          // live" while a modal is open.
          !node.closest('details:not([open])') &&
          node.getClientRects().length > 0 &&
          live(node))
        .map((node) => `${node.tagName.toLowerCase()}.${node.className}`.slice(0, 60));
    });
    if (outsideReachable.length) {
      problems.push(
        `the sheet is open and ${outsideReachable.length} control(s) outside it are still live: ` +
          outsideReachable.slice(0, 4).join('; ')
      );
    }

    // The sheet opens on whichever tab was last shown; the parts are what this
    // section is about.
    await tab('部位').click();
    await page.waitForTimeout(300);

    const opened = await page.evaluate(() => {
      const panel = document.querySelector('.anatomy-panel');
      const sheet = document.querySelector('.anatomy-panel-sheet');
      const summary = document.querySelector('.anatomy-panel-summary');
      const body = document.querySelector('.anatomy-panel-body');
      const close = document.querySelector('.anatomy-panel-close');
      /** Whether a point on an element is actually that element. */
      const usable = (node) => {
        const box = node.getBoundingClientRect();
        if (box.width < 1 || box.height < 1) return false;
        if (box.top < 0 || box.bottom > window.innerHeight) return false;
        const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
        return Boolean(hit && (node === hit || node.contains(hit)));
      };
      return {
        open: panel.dataset.sheet,
        modal: sheet.getAttribute('aria-modal'),
        focusInside: sheet.contains(document.activeElement),
        // The summary is part of the dialog, not something left behind it.
        summaryInDialog: sheet.contains(summary),
        summaryOutsideBody: !body.contains(summary),
        // Both the summary and the isolate control are on screen and are what
        // is painted where they are — the check the previous version computed
        // and then did not use.
        summaryUsable: usable(summary),
        isolateUsable: [...document.querySelectorAll('.anatomy-panel-action')]
          .filter((node) => !node.hidden)
          .every(usable),
        // The close control is above the scrolling body, so a reader four
        // hundred rows down does not have to scroll back to leave.
        closeAboveBody: close.getBoundingClientRect().bottom <= body.getBoundingClientRect().top + 1,
        // The sheet's own chrome, at a phone width. `check-viewports` measures
        // the page as it stands and cannot open a dialog; these are the only
        // controls on a phone that reach the three actions at all, and they
        // shipped at 32px. The 271-row part tree is deliberately not here —
        // `PHONE_TARGET.exemptions` says why it stays at the dense 32.
        smallChrome: window.innerWidth > 430
          ? []
          : [...document.querySelectorAll(
              '.anatomy-panel-action, .anatomy-panel-tab, .anatomy-panel-close, .anatomy-search-input'
            )]
            .filter((node) => !node.hidden)
            .map((node) => [node, node.getBoundingClientRect()])
            .filter(([, box]) => box.width > 0 && box.height > 0 && Math.min(box.width, box.height) + 0.5 < 44)
            .map(([node, box]) =>
              `${(node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 16) || node.className} ` +
              `${Math.round(box.width)}×${Math.round(box.height)}`),
      };
    });
    if (opened.open !== 'open') problems.push('the Parts button did not open the sheet');
    if (opened.modal !== 'true') problems.push('the sheet does not announce itself as a modal');
    if (!opened.focusInside) problems.push('opening the sheet left focus outside it');
    if (!opened.summaryInDialog) problems.push('the selection summary is outside the dialog it belongs to');
    if (!opened.summaryOutsideBody) problems.push('the selection summary is inside the scrolling body');
    if (!opened.summaryUsable) problems.push('the selection summary is off screen or covered while the sheet is open');
    if (!opened.isolateUsable) problems.push('a main action is off screen or covered while the sheet is open');
    if (opened.smallChrome?.length) {
      problems.push(`the sheet's own controls are under 44px on a phone: ${opened.smallChrome.join('; ')}`);
    }
    if (!opened.closeAboveBody) problems.push('the close control is inside the scrolling list rather than above it');

    // And the ring does not run off the end. Tab from the last stop and
    // Shift+Tab from the first both have to come back inside.
    //
    // Note what this can and cannot separate: with the background fully inert
    // there is nothing else in the document for focus to land on, so this
    // passes whether the wrap comes from the trap or from there being nowhere
    // else to go. It checks the outcome a reader gets, not which mechanism
    // produced it — the trap stays because inert is not the only thing between
    // a reader and the browser's own chrome.
    const inDialog = () => page.evaluate(() =>
      document.querySelector('.anatomy-panel-sheet').contains(document.activeElement)
    );
    await page.evaluate(() => {
      const sheet = document.querySelector('.anatomy-panel-sheet');
      const stops = [...sheet.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')]
        .filter((node) => !node.hidden && node.getClientRects().length > 0);
      stops[stops.length - 1]?.focus();
    });
    await page.keyboard.press('Tab');
    await page.waitForTimeout(120);
    if (!(await inDialog())) problems.push('Tab from the last control left the dialog');
    await page.evaluate(() => {
      const sheet = document.querySelector('.anatomy-panel-sheet');
      const stops = [...sheet.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')]
        .filter((node) => !node.hidden && node.getClientRects().length > 0);
      stops[0]?.focus();
    });
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(120);
    if (!(await inDialog())) problems.push('Shift+Tab from the first control left the dialog');

    // Select from the list while it is open, scrolled well down — the case
    // F-31 was about: the answer must not be somewhere the reader cannot see.
    const rows = page.locator('.anatomy-tree-leaf:visible');
    const count = await rows.count();
    const deep = rows.nth(Math.min(20, count - 1));
    at('selecting a row well down the list, in the phone sheet');
    await deep.scrollIntoViewIfNeeded();
    const deepName = (await deep.locator('.lang-en').first().textContent()).trim();
    await deep.click();
    await page.waitForTimeout(300);

    // The point of the whole layout: the answer stays visible and usable while
    // the list is scrolled. Both halves are asserted — on screen, and what is
    // actually painted there.
    const summaryReadable = await page.evaluate(() => {
      const summary = document.querySelector('.anatomy-panel-summary');
      const box = summary.getBoundingClientRect();
      const point = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return {
        onScreen: box.top >= 0 && box.bottom <= window.innerHeight,
        own: Boolean(point && (summary === point || summary.contains(point))),
      };
    });
    if (!summaryReadable.onScreen) {
      problems.push('after selecting a row well down the list, the summary is off screen');
    }
    if (!summaryReadable.own) {
      problems.push('after selecting a row well down the list, something else is painted over the summary');
    }

    // What the reader is holding, before it is put away.
    const remembered = await page.evaluate(() => ({
      expanded: document.querySelectorAll('.anatomy-tree-branch[aria-expanded="true"]').length,
      scroll: document.querySelector('.anatomy-panel-body').scrollTop,
    }));

    // Escape closes, and focus comes back to the control that opened it.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const closed = await page.evaluate(() => {
      const panel = document.querySelector('.anatomy-panel');
      const summary = panel.querySelector('.anatomy-panel-summary');
      const anyInert = [...document.querySelectorAll('#ui *')].some((node) => node.inert);
      return {
        open: panel.dataset.sheet,
        focusReturned: document.activeElement?.classList.contains('anatomy-panel-open') ?? false,
        backgroundLive: !anyInert,
        // Back in its dock, and still one of it.
        summaryVisible: summary.getBoundingClientRect().height > 0,
        summaryDocked: Boolean(summary.closest('.anatomy-panel-dock')),
        summaryCount: document.querySelectorAll('.anatomy-panel-summary').length,
      };
    });
    if (closed.open !== 'closed') problems.push('Escape did not close the sheet');
    if (!closed.focusReturned) problems.push('closing the sheet did not return focus to the button that opened it');
    if (!closed.backgroundLive) problems.push('closing the sheet left the background inert');
    if (!closed.summaryVisible) problems.push('the summary is not on screen once the sheet is closed');
    if (!closed.summaryDocked) problems.push('closing the sheet did not put the summary back in the panel');
    if (closed.summaryCount !== 1) problems.push(`there are ${closed.summaryCount} selection summaries on the page`);

    // And the background genuinely works again: a control outside the panel
    // takes focus, which `inert` would refuse.
    //
    // `details:not([open])` is excluded, and it is not a nicety. Chromium
    // gives the contents of a *closed* disclosure a client rect, so this
    // picked "許可しない" out of the collapsed usage-recording settings — a
    // button nobody can see and nothing can focus — and reported the
    // background as dead. It had been picking the model drawer's trigger
    // instead, and only stopped because that drawer was removed. Same gap as
    // L-102 in `docs/verification-lessons.md`, at a second site.
    const backgroundWorks = await page.evaluate(() => {
      const outside = [...document.querySelectorAll('button')].find(
        (node) =>
          !node.closest('.anatomy-panel') &&
          !node.closest('details:not([open])') &&
          node.getClientRects().length > 0
      );
      if (!outside) return null;
      outside.focus();
      return document.activeElement === outside;
    });
    if (backgroundWorks === false) problems.push('after closing, a control outside the panel still cannot take focus');
    if (backgroundWorks === null) notes.push('no control outside the panel was on screen to re-test the background with.');

    // The selection made in the sheet survives closing it, and the summary says so.
    const afterClose = await read();
    if (afterClose.en !== deepName) {
      problems.push(`the summary says "${afterClose.en}" after selecting "${deepName}" in the sheet`);
    }
    if (afterClose.en === pinnedBefore.en) {
      notes.push('the deep row happened to be the structure already selected, so the change was not observed.');
    }

    // Reopening keeps where the reader was: same tab, same expanded branches,
    // same scroll position. Rebuilding the list would lose all three.
    await page.locator('.anatomy-panel-open').click();
    await page.waitForTimeout(400);
    const reopened = await page.evaluate(() => ({
      expanded: document.querySelectorAll('.anatomy-tree-branch[aria-expanded="true"]').length,
      scroll: document.querySelector('.anatomy-panel-body').scrollTop,
      selected: document.querySelectorAll('.anatomy-tree-leaf[aria-selected="true"]').length,
    }));
    if (reopened.expanded !== remembered.expanded) {
      problems.push(`reopening the sheet changed the expanded branches (${remembered.expanded} → ${reopened.expanded})`);
    }
    if (Math.abs(reopened.scroll - remembered.scroll) > 2) {
      problems.push(`reopening the sheet moved the list (${remembered.scroll} → ${reopened.scroll})`);
    }
    if (reopened.selected !== 1) problems.push('reopening the sheet lost the selection');
    await shot('brain-sheet');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await shot('brain-phone');
  }
  // ---------------------------------------------------------------------
  // 12. A failed load, and the way out of it.
  //
  // The atlas is aborted, so the scene takes its real load-failure branch —
  // the same one a reader gets when the asset does not arrive. What is being
  // checked is that the reader can get back **by pressing the button the
  // product shows them**. This deliberately does not call `page.reload()` to
  // help: a check that reloads on the product's behalf passes whether or not
  // the button works, which is the whole thing worth knowing here.
  //
  // Each press gets its own page, because a working retry navigates.
  //
  // **Only for a scene that loads the atlas.** Most scenes in this repository
  // are procedural and fetch nothing: blocking a URL they never request leaves
  // them loading normally, and every assertion below then reports a missing
  // error state, a missing message and a missing retry button for a scene that
  // has nothing to fail. Checked by counting the aborts rather than by naming
  // the scene, so a second atlas scene is covered without editing this.
  const atlas = 'assets/brain/brain.glb';
  let atlasAborts = 0;
  let atlasScene = true;
  const recoveryRuns = [
    ['click', async (button) => { await button.click(); }],
    ['Enter', async (button) => { await button.focus(); await button.press('Enter'); }],
    ['Space', async (button) => { await button.focus(); await button.press(' '); }],
  ];

  for (const [how, press] of recoveryRuns) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const failing = await context.newPage();
    let blockAtlas = true;
    await failing.route(`**/${atlas}`, (route) => {
      if (blockAtlas) {
        atlasAborts += 1;
        return route.abort('failed');
      }
      return route.continue();
    });
    await failing.goto(url, { waitUntil: 'domcontentloaded' });
    await failing.locator('.consent-banner button').last().click({ timeout: 5000 }).catch(() => {});
    await failing.waitForFunction(
      () => window.__app?.scene?.getAnatomyStatus?.().state === 'error',
      null,
      { timeout: 60000 }
    ).catch(() => {});
    if (!atlasAborts) {
      atlasScene = false;
      notes.push('this scene loads no atlas, so there is no failed load to recover from');
      await context.close();
      break;
    }

    const failed = await failing.evaluate(() => ({
      state: window.__app?.scene?.getAnatomyStatus?.().state ?? null,
      tab: document.querySelector('.anatomy-panel-body')?.dataset.tab ?? null,
      said: /could not be loaded|読み込めませんでした/.test(document.body.innerText),
      // What a reader must never be handed.
      leaks: /npm run|Error:|TypeError/.test(document.body.innerText),
    }));
    if (failed.state !== 'error') problems.push(`[retry ${how}] a blocked atlas did not report an error state (${failed.state})`);
    if (failed.tab !== 'parts') problems.push(`[retry ${how}] the default tab was not Parts (${failed.tab})`);
    if (!failed.said) problems.push(`[retry ${how}] the failure is not said on screen without opening a tab`);
    if (failed.leaks) problems.push(`[retry ${how}] a developer hint or raw error reached the reader`);

    // `.loading` is the veil between navigation and the first frame, and
    // covering everything is its job (`TRANSIENT_OVERLAYS`). It is removed
    // half a second after the app resolves, so a reader sees the failure
    // uncovered — but a check that measures inside that window reports the
    // veil as an obstruction. Wait it out, and say so if it never goes.
    const veilGone = await failing
      .waitForFunction(() => !document.querySelector('.loading'), null, { timeout: 20000 })
      .then(() => true)
      .catch(() => false);
    if (!veilGone) problems.push(`[retry ${how}] the loading veil never went away over a failed load`);

    const button = failing.locator('.anatomy-panel-retry');
    if ((await button.count()) !== 1) {
      problems.push(`[retry ${how}] expected exactly one retry button, found ${await button.count()}`);
      await context.close();
      continue;
    }
    if (!(await button.isVisible())) {
      problems.push(`[retry ${how}] the retry button is present but not visible`);
      await context.close();
      continue;
    }
    // Nothing is covering it: a button a reader cannot hit is not a way out.
    const box = await button.boundingBox();
    const covering = await failing.evaluate(
      ({ x, y }) => {
        const top = document.elementFromPoint(x, y);
        return top?.closest('.anatomy-panel-retry') ? null : `${top?.tagName}.${top?.className}`;
      },
      { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }
    );
    if (covering) problems.push(`[retry ${how}] the retry button is covered by ${covering}`);

    // Let the atlas through, then press what the reader would press.
    blockAtlas = false;
    await press(button);
    const recovered = await failing
      .waitForFunction(
        () => window.__app?.scene?.getAnatomyStatus?.().state === 'ready',
        null,
        { timeout: 90000 }
      )
      .then(() => true)
      .catch(() => false);
    if (!recovered) {
      problems.push(`[retry ${how}] pressing the retry button did not bring the model back`);
      await context.close();
      continue;
    }

    // Back to a usable model: the failure is gone and a structure can be picked.
    const after = await failing.evaluate(() => ({
      retryGone: document.querySelector('.anatomy-panel-retry')?.hidden !== false,
      statusGone: document.querySelector('.anatomy-panel-status')?.hidden !== false,
      count: window.__app.scene.getAnatomyStatus().selectableCount,
    }));
    if (!after.retryGone) problems.push(`[retry ${how}] the retry button is still offered after recovery`);
    if (!after.statusGone) problems.push(`[retry ${how}] the failure line survived recovery`);
    if (!after.count) problems.push(`[retry ${how}] recovered with no selectable structures`);

    await failing.locator('.consent-banner button').last().click({ timeout: 3000 }).catch(() => {});
    const row = failing.locator('.anatomy-tree-leaf').first();
    await row.click({ timeout: 15000 }).catch(() => {});
    const picked = await failing.evaluate(() => window.__app.scene.getAnatomySelection()?.id ?? null);
    if (!picked) problems.push(`[retry ${how}] no structure could be selected after recovering`);
    else notes.push(`retry by ${how}: recovered to ${after.count} structures, then selected ${picked}`);
    if (shotsDir && how === 'click') await failing.screenshot({ path: join(shotsDir, 'brain-recovered.png') });
    await context.close();
  }

  // 13. The same button, at the sizes where the panel is a sheet rather than
  //     docked. The summary carries it in both layouts, so it should be on
  //     screen without opening anything — but "should" is what this checks.
  //     The consent card is a declared transient overlay, so the overlap it
  //     causes is recorded rather than counted as a defect.
  for (const [width, height] of atlasScene ? [[844, 390], [375, 667]] : []) {
    const context = await browser.newContext({ viewport: { width, height } });
    const small = await context.newPage();
    await small.route(`**/${atlas}`, (route) => route.abort('failed'));
    await small.goto(url, { waitUntil: 'domcontentloaded' });
    await small.waitForFunction(
      () => window.__app?.scene?.getAnatomyStatus?.().state === 'error',
      null,
      { timeout: 60000 }
    ).catch(() => {});
    const smallVeilGone = await small
      .waitForFunction(() => !document.querySelector('.loading'), null, { timeout: 20000 })
      .then(() => true)
      .catch(() => false);
    if (!smallVeilGone) problems.push(`[${width}x${height}] the loading veil never went away over a failed load`);
    await small.waitForTimeout(400);

    const size = `${width}x${height}`;
    const at = async () => small.evaluate(() => {
      const button = document.querySelector('.anatomy-panel-retry');
      if (!button) return { present: false };
      const box = button.getBoundingClientRect();
      if (!box.width || !box.height) return { present: true, drawn: false };
      const x = Math.round(box.left + box.width / 2);
      const y = Math.round(box.top + box.height / 2);
      const top = document.elementFromPoint(x, y);
      const onScreen = box.top >= 0 && box.bottom <= window.innerHeight
        && box.left >= 0 && box.right <= window.innerWidth;
      return {
        present: true,
        drawn: true,
        onScreen,
        covering: top?.closest('.anatomy-panel-retry') ? null : `${top?.tagName}.${top?.className}`.slice(0, 60),
      };
    });

    // Before the consent card is answered.
    const before = await at();
    if (before.covering) {
      notes.push(`${size}: before the usage-data card is answered, the retry button is under ${before.covering} (a declared transient overlay)`);
    }

    await small.locator('.consent-banner button').last().click({ timeout: 5000 }).catch(() => {});
    await small.waitForTimeout(400);
    const after = await at();
    if (!after.present) problems.push(`[${size}] a failed load offered no retry button`);
    else if (!after.drawn) problems.push(`[${size}] the retry button has no box`);
    else {
      if (!after.onScreen) problems.push(`[${size}] the retry button is outside the viewport`);
      if (after.covering) problems.push(`[${size}] the retry button is covered by ${after.covering}`);
      if (!after.covering && after.onScreen) notes.push(`${size}: the retry button is on screen and uncovered without opening the sheet`);
    }
    if (shotsDir) await small.screenshot({ path: join(shotsDir, `brain-retry-${size}.png`) });
    await context.close();
  }

  // 14. What a zoom holds still.
  //
  //     A device pass reported the brain sliding to a corner and under the
  //     header as it was zoomed in. The cause was not the zoom but its pivot:
  //     `fitPoseToSafeArea` pans camera and target together to sit the subject
  //     in the band the panels leave, which leaves the orbit centre where the
  //     subject is not — measured at 1280x800, 177px apart — and a dolly toward
  //     the orbit centre magnifies that gap by the zoom factor.
  //
  //     `tests/zoom-anchor.test.js` pins the arithmetic. This drives the real
  //     thing: a real wheel, a real pointer, the shipped OrbitControls, at the
  //     two widths the layout differs at.
  step = 'measuring what a zoom holds still';
  for (const [width, height] of atlasScene ? [[1280, 800], [390, 844]] : []) {
    const size = `${width}x${height}`;
    const context = await browser.newContext({ viewport: { width, height } });
    const zoomPage = await context.newPage();
    await zoomPage.goto(url, { waitUntil: 'domcontentloaded' });
    await zoomPage.waitForFunction(
      () => window.__app?.scene?.getAnatomyStatus?.().state === 'ready',
      null,
      { timeout: 60000 },
    ).catch(() => {});
    await zoomPage.locator('.consent-banner button').last().click({ timeout: 4000 }).catch(() => {});
    await zoomPage.waitForTimeout(600);

    /**
     * Where the subject, a pinned structure and the subject's box are on
     * screen, plus how much of that box is inside the band the fixed chrome
     * leaves. All in page pixels, read from the live camera.
     */
    const read = () => zoomPage.evaluate(() => {
      const app = window.__app;
      const viewer = app.viewer;
      const rect = viewer.renderer.domElement.getBoundingClientRect();
      const to = (v) => {
        const p = v.clone().project(viewer.camera);
        return [rect.left + ((p.x + 1) / 2) * rect.width, rect.top + ((1 - p.y) / 2) * rect.height];
      };
      const bounds = app.scene.getSubjectBounds();
      const pinned = window.__zoomProbeId ? app.scene.getStructureBounds(window.__zoomProbeId) : null;
      const xs = bounds.corners.map((corner) => to(corner)[0]);
      const ys = bounds.corners.map((corner) => to(corner)[1]);
      const box = {
        left: Math.min(...xs), right: Math.max(...xs),
        top: Math.min(...ys), bottom: Math.max(...ys),
      };
      // The band, measured from the chrome itself rather than assumed: only an
      // element that crosses the middle of the frame is an edge band, which is
      // the same rule `safeAreaInsets` applies in the app.
      const boxOf = (selector) => {
        const node = document.querySelector(selector);
        return node ? node.getBoundingClientRect() : null;
      };
      const w = rect.width;
      const h = rect.height;
      const nav = boxOf('.global-scene-nav');
      const consoleBar = boxOf('.console');
      const rail = boxOf('.rail');
      const band = { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      if (nav && nav.left < w / 2 && nav.right > w / 2) band.top = Math.max(band.top, nav.bottom);
      if (consoleBar && consoleBar.left < w / 2 && consoleBar.right > w / 2) {
        band.bottom = Math.min(band.bottom, consoleBar.top);
      }
      if (rail && rail.top < h / 2 && rail.bottom > h / 2) band.right = Math.min(band.right, rail.left);
      const over = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
      const area = Math.max(1, (box.right - box.left) * (box.bottom - box.top));
      return {
        subject: to(bounds.centre),
        pinned: pinned ? to(pinned.centre) : null,
        distance: viewer.camera.position.distanceTo(viewer.controls.target),
        // The floor and ceiling the shared orbit limits impose. A dolly that
        // is clamped still applies the pan its anchor asked for, so the anchor
        // breaks exactly when the reader reaches a limit — and a run that only
        // prints the drift cannot tell that apart from an anchor that is gone.
        limits: [viewer.controls.minDistance, viewer.controls.maxDistance],
        // Everything the screen position of a point is made of, so a drift can
        // be attributed rather than guessed at: the camera, the orbit centre,
        // and the canvas's own place on the page. A subject that slides while
        // the camera holds still is the page moving under it, and the three
        // wrong explanations tried for one such drift cost more than this line.
        camera: viewer.camera.position.toArray().map((value) => Math.round(value * 1000) / 1000),
        centre: viewer.controls.target.toArray().map((value) => Math.round(value * 1000) / 1000),
        canvas: [rect.left, rect.top, rect.width, rect.height].map((value) => Math.round(value * 10) / 10),
        // Whether the camera turned, and the anchor the controls last used.
        // A translation along the pointer ray holds the point under the pointer
        // by construction, so a subject that slides while the camera has not
        // turned means the anchor was not where the pointer was.
        facing: viewer.camera.quaternion.toArray().map((value) => Math.round(value * 10000) / 10000),
        anchorNdc: viewer.controls._mouse
          ? [Math.round(viewer.controls._mouse.x * 1000) / 1000, Math.round(viewer.controls._mouse.y * 1000) / 1000]
          : null,
        // The subject's centre in the world. `getSubjectBounds()` is computed
        // from the meshes that are currently drawn, so it is a yardstick that
        // can move on its own — and a yardstick that moves between two readings
        // reports the drift of whatever it was measuring.
        centreWorld: bounds.centre.toArray().map((value) => Math.round(value * 1000) / 1000),
        // The ray the controls actually dollied along, and the one the pointer
        // asks for. A cursor zoom is a translation along the pointer ray, so
        // these two being different is the whole of an anchor that does not
        // hold — and reading both is the difference between knowing that and
        // guessing at fov, aspect, damping and the page in turn.
        dollyDir: viewer.controls._dollyDirection
          ? viewer.controls._dollyDirection.toArray().map((value) => Math.round(value * 10000) / 10000)
          : null,
        fov: viewer.camera.fov,
        aspect: Math.round(viewer.camera.aspect * 10000) / 10000,
        // What the controls still owe the camera. A dolly is a move along the
        // pointer ray; a pan moves camera and orbit centre together, which is
        // the other shape a subject can slide in, and the two are told apart
        // here rather than by elimination.
        panOwed: viewer.controls._panOffset
          ? viewer.controls._panOffset.toArray().map((value) => Math.round(value * 10000) / 10000)
          : null,
        spinOwed: viewer.controls._sphericalDelta
          ? [
              Math.round(viewer.controls._sphericalDelta.theta * 10000) / 10000,
              Math.round(viewer.controls._sphericalDelta.phi * 10000) / 10000,
            ]
          : null,
        drawn: app.scene._drawnMeshes ? app.scene._drawnMeshes().length : null,
        visible:
          (over(box.left, box.right, band.left, band.right) *
            over(box.top, box.bottom, band.top, band.bottom)) / area,
      };
    });

    /**
     * Wait until the camera has actually stopped.
     *
     * Every measurement below has to start and end at rest, and "at rest" is
     * not a length of time. The controls are damped, the app tweens the camera
     * to a new framing whenever the bands move — answering the usage-data card
     * moves them — and a reading taken part-way through either reports drift
     * that is really just the tail of something else finishing. The first
     * version of this check waited 600ms and reported 124px of drift at
     * 1280x800 that a settled reading puts at 0.
     *
     * The whole pose, not just the distance: a re-frame moves the camera and
     * the orbit centre together, which a distance alone cannot see.
     */
    const settle = async () => {
      await zoomPage.waitForFunction(() => {
        const viewer = window.__app.viewer;
        const now = [...viewer.camera.position.toArray(), ...viewer.controls.target.toArray()];
        const before = window.__zoomLast;
        window.__zoomLast = now;
        return Array.isArray(before) && now.every((value, at) => Math.abs(value - before[at]) < 1e-4);
      }, null, { timeout: 20000, polling: 150 }).catch(() => {});
      await zoomPage.evaluate(() => { delete window.__zoomLast; });
    };

    /** Wheel at a point, then let everything it started finish. */
    const wheelAt = async (x, y, notches, direction) => {
      await zoomPage.mouse.move(x, y);
      for (let notch = 0; notch < notches; notch += 1) {
        await zoomPage.mouse.wheel(0, direction * 120);
        await zoomPage.waitForTimeout(90);
      }
      await settle();
    };

    const drift = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    /**
     * How far the anchor may move, in page pixels.
     *
     * Measured, not guessed. Anchored, every case below reads exactly 0 at both
     * widths; with `zoomToCursor` turned off — the shipped behaviour this
     * replaces — the same four notches move it 34px at 1280x800 and 9px at
     * 390x844, and five button steps move it 177px. Six sits clear of both, so
     * a failure means the anchor is gone rather than that an engine rounds
     * differently.
     */
    const DRIFT_PX = 6;

    // (1) The pointer on the subject: zooming must not translate it.
    await settle();
    // Who writes the orbit centre during the gesture. `OrbitControls` sets it
    // to (0, 0, -1) before turning it into a direction; the app's camera tween
    // sets it to a world point. Both go through the same method, so the
    // argument is what tells them apart — and "the app tweened the camera
    // during a zoom" and "the controls anchored badly" are different bugs that
    // look identical from the outside.
    const start = await read();
    // One notch first, and reported whatever it reads. Four notches that end
    // 20px out can be an anchor that is wrong by 5px each time or one that is
    // right until the notches start arriving faster than the frames, and those
    // are different bugs in different code. The run should not make the reader
    // guess which — under software GL the second is the likely one, and it is
    // the one a fast scroll on a slow machine actually produces.
    await zoomPage.mouse.move(start.subject[0], start.subject[1]);
    await zoomPage.mouse.wheel(0, -120);
    // Once straight after the wheel and once after the camera has stopped.
    // **Both are after `end`** — `OrbitControls` dispatches `start`, handles
    // the wheel and dispatches `end` in the one synchronous call, so there is
    // no reading that precedes what the app does on `end`. The pair separates
    // a dolly from a tween that is still running, not the app from the
    // controls.
    const midNotch = await read();
    await settle();
    const oneNotch = await read();
    notes.push(
      `${size}: one notch moves the subject ${Math.round(drift(midNotch.subject, start.subject))}px ` +
        `straight after the wheel and ${Math.round(drift(oneNotch.subject, start.subject))}px once it has stopped ` +
        `(distance ${start.distance.toFixed(2)} -> ${oneNotch.distance.toFixed(2)}, fov ${start.fov}, ` +
        `aspect ${start.aspect}; dolly ray ${oneNotch.dollyDir ? oneNotch.dollyDir.join(',') : 'unread'}` +
        `; pan owed ${midNotch.panOwed ? midNotch.panOwed.join(',') : 'unread'} then ` +
        `${oneNotch.panOwed ? oneNotch.panOwed.join(',') : 'unread'}` +
        `; spin owed ${midNotch.spinOwed ? midNotch.spinOwed.join(',') : 'unread'}` +
        `; camera ${start.camera.join(',')} -> ${oneNotch.camera.join(',')}` +
        `; centre ${start.centre.join(',')} -> ${oneNotch.centre.join(',')})`,
    );
    // Back the one notch out again, at the same point, so the four-notch
    // measurement below starts where `start` was read rather than one notch in.
    await wheelAt(oneNotch.subject[0], oneNotch.subject[1], 1, 1);
    await settle();
    await wheelAt(start.subject[0], start.subject[1], 4, -1);
    const zoomedIn = await read();
    if (zoomedIn.distance >= start.distance) {
      problems.push(`[${size}] the wheel did not zoom the scene in`);
    } else if (drift(zoomedIn.subject, start.subject) > DRIFT_PX) {
      problems.push(
        `[${size}] zooming on the subject moved it ${Math.round(drift(zoomedIn.subject, start.subject))}px ` +
          'across the screen; a zoom should not translate what it is zooming',
      );
    }

    // (5a) …and it is still in view afterwards, not under the header.
    if (zoomedIn.visible < 0.25) {
      problems.push(
        `[${size}] after zooming in, only ${Math.round(zoomedIn.visible * 100)}% of the model is ` +
          'outside the fixed chrome',
      );
    }

    // (3) The same zoom backwards returns the same shot.
    await wheelAt(start.subject[0], start.subject[1], 4, 1);
    const returned = await read();
    if (drift(returned.subject, start.subject) > DRIFT_PX) {
      problems.push(
        `[${size}] zooming out again left the model ${Math.round(drift(returned.subject, start.subject))}px ` +
          'from where it started',
      );
    }
    if (Math.abs(returned.distance / start.distance - 1) > 0.05) {
      problems.push(
        `[${size}] zooming in and back out changed the distance by ` +
          `${Math.round((returned.distance / start.distance - 1) * 100)}%`,
      );
    }

    // (2) A structure under the pointer stays under the pointer. Not the
    //     subject's centre — a named part off to one side, which is what
    //     "zoom in on this gyrus" actually is.
    const pickedId = await zoomPage.evaluate(() => {
      const app = window.__app;
      const canvas = document.querySelector('canvas');
      const box = canvas.getBoundingClientRect();
      for (let radius = 0; radius <= 140; radius += 14) {
        for (const [dx, dy] of [[0.9, -0.5], [-0.9, -0.5], [0.9, 0.5], [-0.9, 0.5], [1, 0], [0, 0]]) {
          if (app.scene.selectAtCanvasPoint(box.width / 2 + dx * radius, box.height / 2 + dy * radius)) {
            window.__zoomProbeId = app.scene.getAnatomySelection()?.id;
            return window.__zoomProbeId;
          }
        }
      }
      return null;
    });
    if (pickedId == null) {
      notes.push(`${size}: no structure could be pinned, so the pointer-anchored zoom was not measured`);
    } else {
      await settle();
      const beforePointer = await read();
      await wheelAt(beforePointer.pinned[0], beforePointer.pinned[1], 4, -1);
      const afterPointer = await read();
      if (drift(afterPointer.pinned, beforePointer.pinned) > DRIFT_PX) {
        problems.push(
          `[${size}] the structure under the pointer moved ` +
            `${Math.round(drift(afterPointer.pinned, beforePointer.pinned))}px while zooming into it`,
        );
      }

      // (4) …and nothing puts it back in the middle afterwards. A second
      //     reading a beat later catches a re-frame, a resize observer or a
      //     tween that decides to centre the model once the gesture is over.
      await zoomPage.waitForTimeout(1600);
      const settled = await read();
      if (drift(settled.pinned, afterPointer.pinned) > DRIFT_PX) {
        problems.push(
          `[${size}] the close-up drifted ${Math.round(drift(settled.pinned, afterPointer.pinned))}px ` +
            'on its own after the gesture ended — something is re-centring it',
        );
      }
      // (5b) The model is still not entirely behind the chrome, zoomed in on
      //      one part of it.
      if (settled.visible < 0.15) {
        problems.push(
          `[${size}] zoomed into one structure, only ${Math.round(settled.visible * 100)}% of the model ` +
            'is outside the fixed chrome',
        );
      }
      notes.push(
        `${size}: zoom anchor — subject ${Math.round(drift(zoomedIn.subject, start.subject))}px, ` +
          `pointer ${Math.round(drift(afterPointer.pinned, beforePointer.pinned))}px, ` +
          `round trip ${Math.round(drift(returned.subject, start.subject))}px` +
          ` — distance ${start.distance.toFixed(2)} to ${zoomedIn.distance.toFixed(2)}` +
          `, limits ${start.limits.map((limit) => limit.toFixed(2)).join('..')}` +
          // The share of the subject's box that is inside the band, before and
          // after zooming in. The app rescues a subject it judges lost below a
          // share of this shape, and a rescue is a pan — so a drift reported
          // here is either a broken anchor or a rescue, and this is the number
          // that says which.
          `, subject in band ${(start.visible * 100).toFixed(0)}% then ${(zoomedIn.visible * 100).toFixed(0)}%`,
      );
      // Only when something moved that should not have. Attribution is long,
      // and a run where the anchor holds does not need it.
      if (drift(zoomedIn.subject, start.subject) > DRIFT_PX || drift(returned.subject, start.subject) > DRIFT_PX) {
        notes.push(
          `${size}: what moved — camera ${start.camera.join(',')} -> ${zoomedIn.camera.join(',')}; ` +
            `orbit centre ${start.centre.join(',')} -> ${zoomedIn.centre.join(',')}; ` +
            `canvas ${start.canvas.join(',')} -> ${zoomedIn.canvas.join(',')}; ` +
            `subject on screen ${start.subject.map((value) => Math.round(value)).join(',')} -> ` +
            `${zoomedIn.subject.map((value) => Math.round(value)).join(',')}; ` +
            `facing ${start.facing.join(',')} -> ${zoomedIn.facing.join(',')}; ` +
            `anchor ndc ${zoomedIn.anchorNdc ? zoomedIn.anchorNdc.join(',') : 'unread'}; ` +
            `subject centre ${start.centreWorld.join(',')} -> ${zoomedIn.centreWorld.join(',')} ` +
            `(from ${start.drawn} drawn meshes then ${zoomedIn.drawn})`,
        );
      }
    }
    if (shotsDir) await zoomPage.screenshot({ path: join(shotsDir, `brain-zoom-${size}.png`) });
    await context.close();
  }
} catch (error) {
  // `--framing-only` leaves by this door, because the drive below is one long
  // sequence rather than a list of steps to skip. It is the caller asking to
  // stop, not a step that failed, so it collects no finding — the note already
  // says the run is partial.
  if (error === STOPPED_AFTER_FRAMING) {
    // nothing: the caller asked to stop here.
  } else {
  // A step that cannot complete is a finding, not a reason to throw away the
  // findings collected before it. Breaking the modal boundary made a later
  // click time out, and the timeout discarded the sentence that said why — so
  // the run reported a stack trace where it had already worked out the cause.
  // The step label is whatever `at()` was last given, and a section that forgets
  // to update it makes every failure inside it read as the previous step's.
  // That happened: a click intercepted by the canvas at phone size was reported
  // as "while opening the Display tab", and F-135 was filed against a tab that
  // clicks in 1.3 seconds. So the locator Playwright was actually waiting for
  // goes in the finding too, where a stale label cannot hide it.
  const waitingFor = (error.message.match(/waiting for (locator\([^\n]*)/) ?? [])[1];
  problems.push(
    `the drive stopped while ${step}: ${error.message.split('\n')[0]}` +
      (waitingFor ? ` — waiting for ${waitingFor}` : '')
  );
  // The first line says a click timed out; the rest says what it was waiting
  // for — covered, out of view, still moving — and that is the part somebody
  // reading this needs.
  console.error(`\nwhile ${step}:\n${error.message}`);
  }
} finally {
  await browser.close();
  closeServer();
}

console.log(`Anatomy interaction — ${sceneSlug}, ${observed.selectableCount} selectable structures`);
console.log(`  structures named by click: ${observed.structures.map((s) => `${s.en} / ${s.ja}`).join('; ') || 'none'}`);
// With the place in the hierarchy, because a publication record has to carry it
// and reading it off a screenshot is how `brain-anatomy`'s record came to list
// four structures the drive had stopped naming. The drive already reads this to
// check a structure is not named without a place; printing it means the record
// can be written from the run.
for (const structure of observed.structures) {
  console.log(`    ${structure.en} / ${structure.ja} — ${structure.where}`);
}
// **Every point, including the ones that hit nothing.** The line above lists
// what was *named*, which silently drops a miss — so a `--points` sweep of
// twenty-one candidates comes back as eighteen names that cannot be matched to
// the coordinates that produced them, and the reader is left counting. That is
// how an hour went into finding one artery. A probe is only an instrument if it
// says which point gave which answer.
if (observed.tour.length) {
  console.log('  point by point:');
  for (const stop of observed.tour) {
    const said = stop.got ?? 'nothing';
    const held = stop.expected && stop.expected !== stop.got ? `  (authored: ${stop.expected})` : '';
    console.log(`    ${stop.fx}, ${stop.fy} -> ${said}${held}`);
  }
}
console.log(`  viewpoints: ${observed.views.join(', ') || 'none'}`);
console.log(`  colour modes: ${observed.colorModes.join(', ') || 'none'}`);
console.log(`  labels on the model: ${observed.labels.join(', ') || 'none'}`);
console.log(`  part tree rows: ${observed.treeRows ?? 'none'}`);
if (observed.openingFraming) {
  const { opening, reset } = observed.openingFraming;
  console.log(
    `  across the frame's middle row the model spans ${opening[0]}..${opening[1]} when the scene opens, ` +
      `${reset[0]}..${reset[1]} after a display reset (one row — ` +
      // Pointing at a note that is only printed with `--silhouette` reads, on
      // every default run, as a note the reader has failed to find.
      `${observed.silhouette ? "for the scene's width see the silhouette note" : "for the scene's width pass --silhouette"})`
  );
  // Printed on every run, not only a failing one: the two numbers are what
  // says whether a framing that *matches* matches because both moments agree
  // about the bands, or because neither of them has settled yet.
  if (observed.openingPose?.opening && observed.openingPose?.reset) {
    const { opening: a, reset: b } = observed.openingPose;
    const band = (rect) => (rect ? rect.join(',') : 'absent');
    const subject = (pose) => (pose.subject ? `${pose.subject.size.join('x')} at ${pose.subject.centre.join(',')}` : 'unbounded');
    console.log(
      `    camera ${a.distance} when it opens, ${b.distance} after the reset; ` +
        `subject ${subject(a)} then ${subject(b)}; ` +
        `console ${band(a.console)} then ${band(b.console)}; rail ${band(a.rail)} then ${band(b.rail)}`
    );
  }
}
console.log(
  `  group hidden in one press: ${
    observed.groupHidden
      ? `${observed.groupHidden.label} (${observed.groupHidden.structures} structures)`
      : 'not offered by this scene'
  }`
);
for (const note of notes) console.log(`  note: ${note}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(
  flag('--framing-only')
    // Naming only what ran. The full sentence under `--framing-only` is the
    // shape of green this repo keeps catching itself in: a check that reports
    // what it would have verified rather than what it did.
    ? '  ok    the scene opens at the framing it resets to — and nothing else was driven'
    : '  ok    the model and the tree name one structure; drag is not click; isolate hides and restores; ' +
      'display choices do not move the selection'
);
