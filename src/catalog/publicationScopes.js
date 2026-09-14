/**
 * What each publication decision actually exercised, and what it did not.
 *
 * The decision itself lives in `release.js`: who took it, in what role, on
 * what date, against which record, pinned to the exact revisions it was taken
 * about. That is what the **gate** needs, and the gate runs in the browser —
 * `main.js` → `releaseGate.js` → `release.js` is the eager entry, so anything
 * that file holds is downloaded before the first paint.
 *
 * This is the rest of the record: the structures that were opened, the views
 * that were rendered, the interactions that were driven, the evidence, and the
 * list of what nobody checked. It is the part a person reads and the part CI
 * verifies against the filesystem, and it is **not** part of deciding whether
 * a scene is open. Three scenes of it cost a kilobyte of first paint before
 * this file existed, and a release that opens organs a batch at a time would
 * have kept spending one (F-103).
 *
 * ## This is not a way to publish without a record
 *
 * `publicationDecisionProblems()` checks these fields whenever it is handed
 * this map, and everything that can check is handed it: `npm test` and
 * `npm run verify:site` both do. A decision with no entry here, or an entry
 * with an empty list in it, fails there exactly as it did when the prose sat
 * in the decision. What the browser no longer does is re-read the essay to
 * reach a conclusion it can reach from the pin — which is the same tier the
 * record and evidence *paths* have always been on, since a browser cannot
 * check that a file exists either.
 *
 * Pure data. No DOM, no `three`, no filesystem.
 */

/**
 * What batch B1's three decisions each exercised, and what each cites.
 *
 * One list rather than three copies: the same check ran over the three scenes,
 * so three copies would only ever differ by a typo.
 */
const B1_INTERACTIONS = Object.freeze([
  'four measured points resolve to the structures the panel then names, in both languages',
  'the part tree and the model agree in both directions',
  'a drag that ends over another structure is not a click',
  'isolate shows one structure, Show all restores the model',
  'colour mode and viewpoint do not move the selection, and a hover does not rewrite it',
]);

const B2_EVIDENCE = Object.freeze([
  'scripts/check-anatomy-interaction.mjs',
  'scripts/capture-anatomy-views.mjs',
  'scripts/measure-anatomy-points.mjs',
  'src/scenes/shared/geometry/sectionFace.js',
  'tests/section-face.test.js',
  'tests/organ-anatomy-scenes.test.js',
  'docs/screenshots/pub-b2/README.md',
]);

/**
 * What batch B3's one decision cites.
 *
 * B3 opened as three scenes and finished as one: the eye and the ear pass the
 * interaction check and were held on what their renders showed (F-109), which
 * is why the framing fix and the screenshots are part of this batch's evidence
 * rather than a separate change.
 */
const B3_EVIDENCE = Object.freeze([
  'scripts/check-anatomy-interaction.mjs',
  'scripts/capture-anatomy-views.mjs',
  'scripts/measure-anatomy-points.mjs',
  'src/app/framing.js',
  'tests/framing-subject.test.js',
  'tests/organ-anatomy-scenes.test.js',
  'docs/screenshots/pub-b3/README.md',
]);

const B1_EVIDENCE = Object.freeze([
  'scripts/check-anatomy-interaction.mjs',
  'scripts/capture-anatomy-views.mjs',
  'src/scenes/shared/geometry/sectionFace.js',
  'tests/section-face.test.js',
  'tests/organ-anatomy-scenes.test.js',
  'docs/screenshots/pub-b1/README.md',
]);

/**
 * Scene id → what its decision checked.
 *
 * @type {Readonly<Record<string, {scope: {structures: readonly string[], views: readonly string[],
 *   interactions: readonly string[]}, evidence: readonly string[], unverified: readonly string[]}>>}
 */
export const BETA_PUBLICATION_SCOPES = Object.freeze({
  'brain-anatomy': Object.freeze({
    scope: Object.freeze({
      structures: Object.freeze([
        'Opercular part of inferior frontal gyrus',
        'Supramarginal gyrus',
        'Middle temporal gyrus',
        'Superior temporal sulcus',
      ]),
      views: Object.freeze([
        'left-lateral (applied by the interaction drive)',
        'all eight named viewpoints rendered in both colour modes at one camera each; the six that existed before this work were rendered before and after it (docs/screenshots/b3-1/)',
      ]),
      interactions: Object.freeze([
        'click pins a structure and the panel names it in both languages',
        'click on empty space clears, and a structure can be selected again',
        'a drag that ends over another structure does not reselect',
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
        'the pinned structure is named on the model as well as in the panel, under the same occlusion rule and a per-frame limit',
        'going to a structure, bringing it into view and hiding it are three separate actions; each reports what it changed and offers the way back',
        'a hidden structure stays hidden through a colour change, a viewpoint and a layer move, leaves the picker and stops occluding a label, and stays selected',
        'a hidden structure\'s own label goes with it rather than being held over what is behind it',
      ]),
    }),
    evidence: Object.freeze([
      'scripts/check-anatomy-interaction.mjs',
      'src/app/anatomyContract.js',
      'src/components/AnatomyPanel.js',
      'tests/anatomy-contract.test.js',
      'tests/brain-anatomy.test.js',
      'tests/anatomy-colour-ui.test.js',
      'docs/asset-qa/brain-atlas-glb.md',
      'public/assets/brain/ATTRIBUTION.md',
      'docs/screenshots/b3-1/README.md',
      'docs/screenshots/f37/README.md',
      'docs/screenshots/x1/README.md',
      'docs/anatomy-review.md',
    ]),
    unverified: Object.freeze([
      '267 of the 271 selectable structures were not individually opened',
      'no label was checked against a reference atlas — that is an anatomist\'s judgement',
      'deep structures behind the anatomical-layer slider were not exercised',
      'one browser engine, desktop only: no touch, Safari, Firefox or screen reader',
      'no clinical review — the registry records this scene as pending',
      'the anatomy/CG quality bar for the beta (B3) is measured only for what the fixed views show; nothing here is an anatomical judgement',
      'whether the cerebellum should show folia was not settled — it is a question about the source mesh (F-38)',
      'the posterior and inferior viewpoints were rendered and read by an engineer; no anatomist has confirmed what they show',
    ]),
  }),

  'lung-anatomy': Object.freeze({
    scope: Object.freeze({
      structures: Object.freeze([
        'Trachea',
        'Right upper lobe',
        'Left upper lobe',
        'Right middle lobe',
        'the part tree\'s 83 rows, listed and matched against the model in both directions',
      ]),
      views: Object.freeze([
        'all six viewpoints in both colour modes, and the opening view with the interface up (docs/screenshots/pub-b1/)',
      ]),
      interactions: B1_INTERACTIONS,
    }),
    evidence: B1_EVIDENCE,
    unverified: Object.freeze([
      'the anatomical-layer slider was not driven: every frame was shot at the layer the scene opens at',
      '79 of the 83 structures were not individually opened, and no label was checked against an atlas',
      'no clinical review — the registry records this scene as pending',
      'one engine, desktop, headless: no touch, Safari, Firefox, screen reader or phone layout',
      'the segmental anatomy is schematic, and the cut face is not a radiological section',
    ]),
  }),

  'liver-anatomy': Object.freeze({
    scope: Object.freeze({
      structures: Object.freeze([
        'Segment VIII — right anterior superior',
        'Segment II — left lateral superior',
        'Segment VII — right posterior superior',
        'Segment V — right anterior inferior',
        'the part tree\'s 27 rows, listed and matched against the model in both directions',
      ]),
      views: Object.freeze([
        'all five viewpoints in both colour modes, and the opening view with the interface up (docs/screenshots/pub-b1/)',
      ]),
      interactions: B1_INTERACTIONS,
    }),
    evidence: B1_EVIDENCE,
    unverified: Object.freeze([
      'the anatomical-layer slider was not driven: every frame was shot at the layer the scene opens at',
      '23 of the 27 structures were not individually opened',
      'nobody qualified has confirmed that what is drawn is Couinaud\'s division of a real liver',
      'no clinical review — the registry records this scene as pending',
      'one engine, desktop, headless: no touch, Safari, Firefox, screen reader or phone layout',
      'the visceral surface carries no porta hepatis, ligamentum teres or caval groove, and the cut face is not a CT slice',
    ]),
  }),

  'kidney-anatomy': Object.freeze({
    scope: Object.freeze({
      structures: Object.freeze([
        'Renal cortex, at two points on the opened kidney',
        'Right kidney (the landmark side, which says so when it is selected)',
        'Left ureter',
        'the part tree\'s 32 rows, listed and matched against the model in both directions',
      ]),
      views: Object.freeze([
        'all six viewpoints in both colour modes, and the opening view with the interface up (docs/screenshots/pub-b1/)',
      ]),
      interactions: B1_INTERACTIONS,
    }),
    evidence: B1_EVIDENCE,
    unverified: Object.freeze([
      'the anatomical-layer slider was not driven: every frame was shot at the layer the scene opens at',
      '29 of the 32 structures were not individually opened — the four clicks land on three',
      'seven pyramids is a common arrangement, not a constant, and no label was checked against an atlas',
      'only the left kidney is modelled in parts; the right is a landmark shape and says so',
      'no clinical review — the registry records this scene as pending',
      'one engine, desktop, headless: no touch, Safari, Firefox, screen reader or phone layout',
    ]),
  }),


  /** Batch B2, 2026-09-14 — four hollow organs and one solid one. */
  'stomach-anatomy': Object.freeze({
    scope: Object.freeze({
      structures: Object.freeze([
        'Abdominal oesophagus',
        'Cardia',
        'Pyloric antrum',
        'Body',
        "the part tree's 8 rows, listed and matched against the model in both directions",
      ]),
      views: Object.freeze([
        'all five viewpoints in both colour modes, and the coronal section before and after the cut stopped being faced (docs/screenshots/pub-b2/)',
      ]),
      interactions: B1_INTERACTIONS,
    }),
    evidence: B2_EVIDENCE,
    unverified: Object.freeze([
      '4 of the 8 structures were not individually opened, and no label was checked against an atlas',
      'the five named regions differ by a few percent of lightness and are not visibly distinct at the opening camera',
      'no clinical review — the registry records this scene as pending',
      'one engine, desktop, headless: no touch, Safari, Firefox, screen reader or phone layout',
      'no dimension is claimed; the proportions are drawn to read clearly',
    ]),
  }),

  'esophagus-anatomy': Object.freeze({
    scope: Object.freeze({
      structures: Object.freeze([
        'Cricopharyngeal constriction',
        'Thoracic part',
        'Aortic and bronchial constriction',
        'Abdominal part',
        "the part tree's 11 rows, listed and matched against the model in both directions",
      ]),
      views: Object.freeze([
        'all five viewpoints in both colour modes at the opening layer, and the crossing viewpoint again at layer 0.6, where the arch and the bronchus it is named after are drawn (docs/screenshots/pub-b2/)',
      ]),
      interactions: B1_INTERACTIONS,
    }),
    evidence: B2_EVIDENCE,
    unverified: Object.freeze([
      '7 of the 11 structures were not individually opened, and no label was checked against an atlas',
      'whether the three constrictions sit where they sit in a person is an anatomist\'s judgement',
      'no clinical review — the registry records this scene as pending',
      'one engine, desktop, headless: no touch, Safari, Firefox, screen reader or phone layout',
      'no length or diameter is claimed',
    ]),
  }),

  'intestine-anatomy': Object.freeze({
    scope: Object.freeze({
      structures: Object.freeze([
        'Small intestine, at two points on the coil',
        'Transverse colon',
        'Sigmoid colon',
        "the part tree's 9 rows, listed and matched against the model in both directions",
      ]),
      views: Object.freeze([
        'all five viewpoints in both colour modes (docs/screenshots/pub-b2/)',
      ]),
      interactions: B1_INTERACTIONS,
    }),
    evidence: B2_EVIDENCE,
    unverified: Object.freeze([
      '5 of the 9 structures were not individually opened — the four recorded clicks land on three',
      'the coil is schematic and self-intersects where it folds most tightly (F-88)',
      'no clinical review — the registry records this scene as pending',
      'one engine, desktop, headless: no touch, Safari, Firefox, screen reader or phone layout',
    ]),
  }),

  'biliary-anatomy': Object.freeze({
    scope: Object.freeze({
      structures: Object.freeze([
        'Right hepatic duct',
        'Left hepatic duct',
        'Cystic duct',
        'Body of the gallbladder',
        "the part tree's 12 rows, listed and matched against the model in both directions",
      ]),
      views: Object.freeze([
        'all six viewpoints in both colour modes (docs/screenshots/pub-b2/)',
      ]),
      interactions: B1_INTERACTIONS,
    }),
    evidence: B2_EVIDENCE,
    unverified: Object.freeze([
      '8 of the 12 structures were not individually opened, and no junction height was checked against an atlas',
      'the coronal section removes the gallbladder, which sits in front of the plane',
      'no clinical review — the registry records this scene as pending',
      'one engine, desktop, headless: no touch, Safari, Firefox, screen reader or phone layout',
      'no calibre or length is claimed',
    ]),
  }),

  'pancreas-anatomy': Object.freeze({
    scope: Object.freeze({
      structures: Object.freeze([
        'Body',
        'Tail',
        'Head, at two points',
        "the part tree's 7 rows, listed and matched against the model in both directions",
      ]),
      views: Object.freeze([
        'all five viewpoints in both colour modes, and the opening view at 1440x900 with the interface up — this is the scene F-44 was reported against (docs/screenshots/pub-b1/panel-1440x900/)',
      ]),
      interactions: B1_INTERACTIONS,
    }),
    evidence: B2_EVIDENCE,
    unverified: Object.freeze([
      '4 of the 7 structures were not individually opened — the four recorded clicks land on three',
      'the gland is schematic and its duct is one channel standing for the main duct',
      'no clinical review — the registry records this scene as pending',
      'one engine, desktop, headless: no touch, Safari, Firefox, screen reader or phone layout',
      'no dimension is claimed',
    ]),
  }),
  'skin-anatomy': Object.freeze({
    scope: Object.freeze({
      structures: Object.freeze([
        'Epidermis',
        'Dermis',
        'Subcutaneous tissue, at two of the four measured points',
        'Arteriole, selected from the tree and followed to its own viewpoint',
        "the part tree's 10 rows, listed and matched against the model in both directions",
      ]),
      views: Object.freeze([
        'all five viewpoints in both colour modes — the block, the cut face, the surface, follicle and glands, and what goes through it',
        'three of the five were changed because of what those renders showed, and the before and after of each is in docs/screenshots/pub-b3/',
      ]),
      interactions: B1_INTERACTIONS,
    }),
    evidence: B3_EVIDENCE,
    unverified: Object.freeze([
      'the four recorded click points resolve to three distinct structures, all of them layers: no measured point lands on an appendage or a vessel',
      '7 of the 10 structures were not individually opened',
      "the sweat gland's coil is a displaced blob rather than a coil that reads as one, and the sebaceous gland is a single lobe",
      'the layers are deliberately not to scale, and the gap drawn between the arteriole and the venule is a display value',
      'no clinical review — the registry records this scene as pending',
      'one engine, desktop, headless: no touch, Safari, Firefox, screen reader or phone layout',
      'no dimension is claimed',
    ]),
  }),
});
