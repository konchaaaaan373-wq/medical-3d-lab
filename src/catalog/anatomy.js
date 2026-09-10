/**
 * Every organ's anatomy model, and how far each one has been taken.
 *
 * **The requirement this file exists to hold: every organ in the body gets an
 * anatomy model, and every one of them reaches the accuracy the brain reached.**
 * Not the organs a disease scene happens to ask for — every organ. The atlas is
 * the floor the whole product stands on: a disease model points at anatomy, and
 * it can only point at structures that exist and can be named.
 *
 * That is a change of policy, and it is written down as one. The earlier rule
 * was *pull型* — upgrade an organ only when a planned disease scene needed the
 * structure, and freeze the rest at a silhouette. It produced a catalogue where
 * four organs were modelled and eighteen were sketches. Pull now decides the
 * **order** organs are taken in, and how far past A2 to go; it no longer decides
 * **whether** an organ gets a real anatomy model. `docs/grand-design.md` §4.5
 * owns the reasoning; this file owns the ledger, so the gap is a number the test
 * suite can print rather than a paragraph somebody has to remember.
 *
 * ## The scale
 *
 * `A0`–`A3` are defined in `docs/grand-design.md` §4.5. In one line each:
 *
 *   A0  a recognisable silhouette, and explicitly nothing more
 *   A1  outer form, proportion and neighbours correct, fixed by measurement
 *   A2  the parts anatomy names, addressable by name, as separate closed meshes
 *   A3  the vessels, lumens and tissue layers a disease points at
 *
 * **A2 is the target for every organ**, because A2 is what the brain has: you
 * can pick a named structure and the model answers. A3 stays pull-driven — a
 * vessel nobody points at is not worth drawing, and drawing it would be the
 * anatomy-atlas-for-its-own-sake this project does not build.
 *
 * ## What `level` is allowed to say
 *
 * A level here is a claim about geometry, so it needs the same evidence any
 * other claim in this repository needs: a test that measures it, or a scene
 * that demonstrably exposes it. `evidence` names that, and the validator below
 * refuses an A1-or-better row without one. A level is never raised because an
 * organ *looks* better — `docs/architecture-rules.md` rule 6 and the checklist
 * at the end of `docs/organ-3d-playbook.md` are what a raise is measured by.
 */
import { ORGANS, organById } from './taxonomy.js';

/** Weakest first. The order is the comparison. */
export const ANATOMY_LEVELS = Object.freeze(['A0', 'A1', 'A2', 'A3']);

/** What every organ has to reach. The brain is the worked example. */
export const ANATOMY_TARGET_LEVEL = 'A2';

/** The organ whose anatomy model sets the standard the others are held to. */
export const ANATOMY_REFERENCE_ORGAN = 'brain';

/**
 * Where each organ stands today.
 *
 * `evidence` is the test or scene that holds the level up, named so that a row
 * cannot drift away from what the repository actually proves. `bench` marks the
 * whole-body view, which is not an organ to model but the free consistency test
 * every organ is checked against (`docs/anatomy-specs.md` §13).
 */
export const ORGAN_ANATOMY = Object.freeze([
  {
    organ: 'brain',
    level: 'A2',
    evidence: 'scenes/nervous/scenes/brainAnatomy — specimen atlas, gyri, sulci and deep structures selectable by name; tests/brain-anatomy.test.js',
  },
  {
    organ: 'heart',
    level: 'A2',
    evidence: 'tests/semantic-anatomy.test.js — eleven measured valve, chamber and great-vessel relationships; AHA 17 segments and the coronary tree in tests/coronary-anatomy.test.js',
  },
  {
    organ: 'lungs',
    level: 'A2',
    evidence: 'tests/lung-anatomy.test.js — five lobes and eighteen segments as closed meshes that partition the parenchyma',
  },
  {
    organ: 'airway',
    level: 'A2',
    evidence: 'tests/lung-anatomy.test.js — trachea, main, lobar and segmental bronchi, the right main steeper and shorter, RALS at the hilum',
  },
  {
    organ: 'liver',
    level: 'A2',
    evidence: 'tests/liver-anatomy.test.js — nine Couinaud segments and five sectors partitioning the parenchyma, Cantlie’s line held apart from the falciform ligament',
  },
  {
    organ: 'kidney',
    level: 'A2',
    evidence: 'tests/kidney-anatomy.test.js — the cortex as one shell between the capsule and the corticomedullary junction, seven medullary pyramids and the cortical columns between them partitioning what is inside it, a minor calyx cupping each papilla and draining through three major calyces to the pelvis, and a nephron placed across the three scales (glomerulus in the cortex, loop of Henle in the medulla)',
    next: 'A3: the segmental arteries and the interlobar/arcuate hierarchy, which renovascular hypertension and prerenal AKI point at. Also still schematic: the sinus is not carved out, the seven pyramids are one coronal row rather than an anterior and a posterior one, and the junction is the capsule scaled rather than a surface of its own.',
  },
  {
    organ: 'thyroid',
    level: 'A1',
    evidence: 'tests/organ-anatomy.test.js — the lobes sit on the sides they are named for',
    next: 'A2: lobes, isthmus and the follicular unit as named parts',
  },
  {
    organ: 'stomach',
    level: 'A1',
    evidence: 'tests/organ-anatomy.test.js — fundus on the left running to a pylorus on the right, wall transmittance measured',
    next: 'A2: cardia, fundus, body, antrum and pylorus as named parts, with the wall layers the mucosa needs',
  },
  {
    organ: 'colon',
    level: 'A1',
    evidence: 'tests/organ-anatomy.test.js — ascending on the right and descending on the left',
    next: 'A2: caecum, the four colonic parts, sigmoid and rectum as named parts',
  },
  {
    organ: 'spleen',
    level: 'A1',
    evidence: 'tests/organ-anatomy.test.js — the hilum faces the midline, not the ribs, and the splenic vein starts on it',
    next: 'A2: red and white pulp, and the hilar vessels by name',
  },
  {
    organ: 'adrenal',
    level: 'A1',
    evidence: 'tests/organ-anatomy.test.js — the medulla stays inside the cortex through every state',
    next: 'A2: the three cortical zones and the medulla as named parts',
  },
  {
    organ: 'bladder',
    level: 'A1',
    evidence: 'tests/organ-anatomy.test.js — the contents stay inside the wall across the whole range of the filling setter',
    next: 'A2: trigone, ureteric orifices, internal urethral orifice and the detrusor wall',
  },
  {
    organ: 'uterus',
    level: 'A1',
    evidence: 'tests/organ-anatomy.test.js — the endometrium stays inside the wall across the whole cycle',
    next: 'A2: fundus, body, isthmus and cervix, with endometrium and myometrium as separate parts',
  },
  {
    organ: 'esophagus',
    level: 'A0',
    next: 'A1: the three constrictions and the course behind the trachea and the arch, measured. Then A2: cervical, thoracic and abdominal parts, and the wall layers',
  },
  {
    organ: 'small-intestine',
    level: 'A0',
    next: 'A1: duodenum fixed retroperitoneally in its C, jejunum upper-left and ileum lower-right. Then A2: the four duodenal parts, jejunum and ileum as named parts',
  },
  {
    organ: 'gallbladder',
    level: 'A0',
    next: 'A1: seated in the fossa on the liver’s visceral surface, on Cantlie’s line. Then A2: fundus, body, neck, cystic duct and the biliary tree',
  },
  {
    organ: 'pancreas',
    level: 'A0',
    next: 'A1: head in the duodenal C, tail at the splenic hilum, the neck crossing the mesenteric vessels. Then A2: head, uncinate, neck, body, tail and the two ducts',
  },
  {
    organ: 'ureter',
    level: 'A0',
    next: 'A1: the three narrowings and the crossing of the iliac vessels. Then A2: the three parts, which a stone scene needs to name where it lodged',
  },
  {
    organ: 'bone',
    level: 'A0',
    next: 'A1: a named bone rather than a generic shaft, with the proportions of its own. Then A2: cortex, trabecular bone, marrow cavity, periosteum and the growth plate',
  },
  {
    organ: 'skeletal-muscle',
    level: 'A0',
    next: 'A1: origin, belly and insertion placed on a real pair of attachments. Then A2: fascicles, the myotendinous junction and the sarcomere unit',
  },
  {
    organ: 'prostate',
    level: 'A0',
    next: 'A1: seated below the bladder around the urethra, with the correct relations. Then A2: peripheral, central and transition zones — the split every prostate question turns on',
  },
  {
    organ: 'whole-body',
    level: 'A1',
    bench: true,
    evidence: 'scenes/systemic/scenes/bodyOverview — reuses every organ builder, so it is where an inconsistency between two organs shows up for free',
  },
]);

const byOrgan = new Map(ORGAN_ANATOMY.map((entry) => [entry.organ, entry]));

/** @param {string} organId */
export const anatomyForOrgan = (organId) => byOrgan.get(organId) ?? null;

/** @param {string} level */
export const anatomyRank = (level) => ANATOMY_LEVELS.indexOf(level);

/** Whether an organ has reached the level every organ has to reach. */
export const meetsAnatomyTarget = (entry) =>
  Boolean(entry) && anatomyRank(entry.level) >= anatomyRank(ANATOMY_TARGET_LEVEL);

/** Organs still below the target, weakest first — the backlog, as data. */
export const anatomyGap = () =>
  ORGAN_ANATOMY.filter((entry) => !entry.bench && !meetsAnatomyTarget(entry)).sort(
    (a, b) => anatomyRank(a.level) - anatomyRank(b.level)
  );

/**
 * Everything structurally wrong with the ledger, as human-readable lines.
 *
 * Returned rather than thrown so the test suite and a dev-mode check can share
 * it. The rule that matters most is the first one: **every organ has a row**.
 * An organ that can be added to the taxonomy without anyone deciding what its
 * anatomy model is, is how eighteen sketches happened.
 */
export function validateAnatomyLedger(entries = ORGAN_ANATOMY, organs = ORGANS) {
  const problems = [];
  const seen = new Set();

  for (const entry of entries) {
    const where = `anatomy "${entry.organ ?? '(no organ)'}"`;
    if (!entry.organ) problems.push('an anatomy entry names no organ');
    else if (seen.has(entry.organ)) problems.push(`${where}: duplicate entry`);
    else seen.add(entry.organ);

    if (entry.organ && !organById(entry.organ)) problems.push(`${where}: unknown organ`);
    if (!ANATOMY_LEVELS.includes(entry.level)) problems.push(`${where}: unknown level "${entry.level}"`);

    // A level above a silhouette is a claim about geometry, so it needs the
    // same evidence any other claim here needs.
    if (anatomyRank(entry.level) > anatomyRank('A0')) {
      if (typeof entry.evidence !== 'string' || !entry.evidence.trim()) {
        problems.push(`${where}: ${entry.level} is claimed with no evidence named`);
      }
    }
    // An organ short of the target has to say what taking it there means, or
    // the backlog is a number with no work attached to it.
    if (!entry.bench && !meetsAnatomyTarget(entry)) {
      if (typeof entry.next !== 'string' || !entry.next.trim()) {
        problems.push(`${where}: below ${ANATOMY_TARGET_LEVEL} and does not say what would take it there`);
      }
    }
  }

  for (const organ of organs) {
    if (!seen.has(organ.id)) {
      problems.push(
        `organ "${organ.id}": every organ needs an anatomy model, and this one has no row in the ledger`
      );
    }
  }

  // From `entries`, not from the module's own map: a validator that reads the
  // constant it is meant to be checking is a rule that can never fail, which is
  // the same kind of blindness `tests/partition.js` exists to avoid.
  const reference = entries.find((entry) => entry.organ === ANATOMY_REFERENCE_ORGAN);
  if (!reference) problems.push(`the reference organ "${ANATOMY_REFERENCE_ORGAN}" has no row`);
  else if (!meetsAnatomyTarget(reference)) {
    problems.push(`the reference organ "${ANATOMY_REFERENCE_ORGAN}" is itself below the target`);
  }

  return problems;
}
