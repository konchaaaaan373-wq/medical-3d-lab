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
    evidence: 'scenes/respiratory/scenes/lungAnatomy — five lobes selectable by name; tests/lung-anatomy.test.js — five lobes and eighteen segments as closed meshes that partition the parenchyma',
  },
  {
    organ: 'airway',
    level: 'A2',
    evidence: 'scenes/respiratory/scenes/lungAnatomy — the trachea, both main bronchi, five lobar and eighteen segmental bronchi selectable by name; tests/lung-anatomy.test.js — trachea, main, lobar and segmental bronchi, the right main steeper and shorter, RALS at the hilum',
  },
  {
    organ: 'liver',
    level: 'A2',
    evidence: 'scenes/hepatobiliary/scenes/liverAnatomy — the eight Couinaud segments as nine selectable parts (IV as IVa and IVb) and both vascular trees selectable by name; tests/liver-anatomy.test.js — nine parts and five sectors partitioning the parenchyma, Cantlie’s line held apart from the falciform ligament',
  },
  {
    organ: 'kidney',
    level: 'A2',
    evidence: 'scenes/renal/scenes/kidneyAnatomy — cortex, pyramids, columns and the collecting system selectable by name; tests/kidney-anatomy.test.js — the cortex as one shell between the capsule and the corticomedullary junction, seven medullary pyramids and the cortical columns between them partitioning what is inside it, a minor calyx cupping each papilla and draining through three major calyces to the pelvis, and a nephron placed across the three scales (glomerulus in the cortex, loop of Henle in the medulla)',
    next: 'A3: the segmental arteries and the interlobar/arcuate hierarchy, which renovascular hypertension and prerenal AKI point at. Also still schematic: the sinus is not carved out, the seven pyramids are one coronal row rather than an anterior and a posterior one, and the junction is the capsule scaled rather than a surface of its own.',
  },
  {
    organ: 'thyroid',
    level: 'A2',
    evidence:
      'scenes/endocrine/scenes/thyroidAnatomy — lobes, isthmus, pyramidal lobe, four parathyroid glands, both recurrent laryngeal nerves and the trachea and oesophagus they run between, selectable by name; tests/organ-parts-anatomy.test.js — the gland in front of the trachea, each nerve behind its own lobe and between trachea and oesophagus, the superior parathyroid above the inferior one on each side; tests/organ-anatomy.test.js — the lobes sit on the sides they are named for',
    next: 'A3: the superior and inferior thyroid arteries and the relation of each to its nerve, the strap muscles and pretracheal fascia, and tracheal cartilage. Parathyroid positions remain plausible rather than fixed, and the pyramidal lobe is drawn every time although it is present in about half of people',
  },
  {
    organ: 'stomach',
    level: 'A2',
    evidence:
      'scenes/gastrointestinal/scenes/stomachAnatomy — fundus, cardia, body, antrum and pyloric canal as separate walls, selectable by name, with the sphincter as its own ring; tests/organ-parts-anatomy.test.js measures the order, the partition and the cardia derived from where the oesophagus ends; tests/organ-anatomy.test.js — fundus on the left running to a pylorus on the right, wall transmittance measured',
    next: 'A3: the wall layers the mucosa needs, the rugae, and the lesser/greater curvature asymmetry the ring-shaped parts cannot show (the cardia is a collar here, and the incisura only the narrowing that goes with it)',
  },
  {
    organ: 'colon',
    level: 'A2',
    evidence:
      'scenes/gastrointestinal/scenes/intestineAnatomy — caecum, ascending, transverse, descending and sigmoid as separate parts with both colic flexures between them, selectable by name; tests/organ-parts-anatomy.test.js measures the partition, each part’s side and height, and the splenic flexure above the hepatic; tests/organ-anatomy.test.js — ascending on the right and descending on the left; tests/organ-parts-anatomy.test.js also holds the parts in the order of length every description agrees on (transverse and sigmoid longest, then descending, then ascending, then caecum)',
    next: 'A3: the rectum and anal canal, the appendix and ileocaecal valve, the taenia coli, and the mesentery that makes the transverse and sigmoid the mobile parts. The order of the lengths is right; the ratios are still schematic — the transverse is about 1.1 times the descending here rather than the roughly 2 of life, because the abdominal frame is fixed',
  },
  {
    organ: 'spleen',
    level: 'A2',
    evidence:
      'scenes/hematologic/scenes/spleenAnatomy — superior and inferior arterial segments, the splenic artery and its two terminal branches, the splenic vein and the pancreatic tail, selectable by name; tests/organ-parts-anatomy.test.js — the two segments partition the organ at the hilar plane, the artery divides outside it and each branch runs into its own segment, the vein leaves posterior to the artery; tests/organ-anatomy.test.js — the hilum faces the midline, not the ribs',
    next: 'A3: red and white pulp, the capsule and trabeculae, and the short gastric and gastroepiploic branches. The segment plane is flat and passes through the hilum; real boundaries are curved and vary, and two segments is the usual number rather than the only one',
  },
  {
    organ: 'adrenal',
    level: 'A2',
    evidence:
      'scenes/endocrine/scenes/adrenalAnatomy — zona glomerulosa, fasciculata and reticularis and the medulla, on both sides, selectable by name; tests/organ-parts-anatomy.test.js — each layer encloses the next, the medulla is inside all three cortical zones, each gland is on its own side and above its own kidney, and the left gland is the flatter of the two; tests/organ-anatomy.test.js — the medulla stays inside the cortex through every state',
    next: 'A3: the capsule, the arterial supply and the single draining vein on each side (which differ, and that difference is what adrenal venous sampling turns on), and the chromaffin cells with their sympathetic supply. The zone thicknesses are drawn so three zones can be told apart and are not the real proportions',
  },
  {
    organ: 'bladder',
    level: 'A2',
    evidence:
      'scenes/renal/scenes/bladderAnatomy — apex, body, fundus and neck, the trigone and its three openings, and the ureters and urethra that meet them, selectable by name; tests/organ-parts-anatomy.test.js — the four wall parts in order, each orifice on a corner of the trigone, and each tube meeting the opening it belongs to; tests/organ-anatomy.test.js — the contents stay inside the wall across the whole range of the filling setter',
    next: 'A3: the detrusor’s layers, the internal and external sphincters, the ureters’ oblique intramural course, the mucosal folds the trigone is smooth by contrast with, and the male and female outlets as different things. The bladder is drawn at one fixed degree of filling',
  },
  {
    organ: 'uterus',
    level: 'A2',
    evidence:
      'scenes/reproductive/scenes/uterusAnatomy — fundus, body, isthmus and cervix, the cavity and cervical canal, both fallopian tubes and both ovaries, selectable by name; tests/organ-parts-anatomy.test.js — the four wall parts in order, each corner of the triangular cavity an opening into it, each tube starting at its own corner and widest between its ends, and each ovary near its tube without touching it; tests/organ-anatomy.test.js — the endometrium stays inside the wall across the whole cycle',
    next: 'A3: endometrium, myometrium and perimetrium as separate layers, the tube’s four named lengths and the fimbriae, the ligaments, the fornices and the transformation zone, and the ureter crossing beneath the uterine artery. The organ is drawn upright rather than anteverted and anteflexed',
  },
  {
    organ: 'esophagus',
    level: 'A2',
    evidence:
      'scenes/gastrointestinal/scenes/esophagusAnatomy — cervical, thoracic and abdominal parts, the three constrictions, and the trachea, aortic arch, left main bronchus and diaphragm that make them, selectable by name; tests/organ-parts-anatomy.test.js — the three parts partition the tube in order, each ring sits at a minimum of the same calibre profile the tube is built from, the arch is posterior and the bronchus anterior at the middle narrowing, and the lowest narrowing is inside the diaphragm’s ring',
    next: 'A3: the muscle layers and the striated-to-smooth transition, the upper and lower oesophageal sphincters, the diaphragmatic crura, the vagus nerves and the submucosal venous plexus. Lengths and calibres remain illustrative and no distance from the incisors is given',
  },
  {
    organ: 'small-intestine',
    level: 'A0',
    next: 'A1: duodenum fixed retroperitoneally in its C, jejunum upper-left and ileum lower-right. Then A2: the four duodenal parts, jejunum and ileum as named parts',
  },
  {
    organ: 'gallbladder',
    level: 'A2',
    evidence:
      'scenes/hepatobiliary/scenes/biliaryAnatomy — fundus, body and neck of the gallbladder, the cystic, hepatic, common hepatic, common bile and pancreatic ducts, and the papilla they open at, selectable by name; tests/organ-parts-anatomy.test.js — every duct reaches the junction it is supposed to, each junction is below the one above it, and the gallbladder narrows from fundus to neck; scenes/hepatobiliary/scenes/liverAnatomy seats the same organ in its fossa on the liver’s visceral surface',
    next: 'A3: the intrahepatic ducts, the cystic artery and Calot’s triangle, Hartmann’s pouch, the spiral valve, the sphincter of Oddi and the common channel. The largest departure stands: the common bile duct is drawn in front of the duodenum and pancreatic head rather than behind and through them, and only one of the many cystic- and hepatic-duct variants is drawn',
  },
  {
    organ: 'pancreas',
    level: 'A2',
    evidence:
      'scenes/hepatobiliary/scenes/pancreasAnatomy — head, neck, body and tail as separate parts with the main duct running their whole length, selectable by name; tests/organ-parts-anatomy.test.js measures the partition, the head as the bulkiest part, the head inside the duodenal C, and the duct inside the gland end to end',
    next: 'A3: the uncinate process, the accessory duct, the common bile duct through the head and the papilla it opens at, and the splenic and mesenteric vessels the neck and body lie against. The islets stay an arrangement rather than a count',
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
    level: 'A2',
    evidence:
      'scenes/reproductive/scenes/prostateAnatomy — peripheral, transition and central zones and the anterior fibromuscular stroma, the prostatic urethra and verumontanum, both ejaculatory ducts, seminal vesicles and vasa, with the bladder neck above and the rectum behind, selectable by name; tests/organ-parts-anatomy.test.js — the peripheral zone is the shell behind, lateral to and below both inner zones and the one nearest the rectum, the transition zone is anterior and inferior to the central, the urethra spans the gland and passes through the transition zone, and both ejaculatory ducts end at the verumontanum inside the central zone',
    next: 'A3: the capsule and the neurovascular bundles, the internal and external sphincters, the urethral crest and sinuses, the prostatic utricle and Denonvilliers’ fascia. The zone proportions are drawn so four zones can be told apart and are not the real ones — no volume may be read off the model',
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
