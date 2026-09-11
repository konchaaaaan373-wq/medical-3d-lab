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
    organ: 'knee',
    level: 'A2',
    evidence:
      'scenes/musculoskeletal/scenes/kneeAnatomy — femur, both femoral condyles, both tibial plateaus, tibia, fibula and patella, the articular cartilage over every surface that meets another, both menisci, both cruciates, both collaterals and the two tendons of the extensor mechanism, selectable by name; tests/organ-parts-anatomy.test.js — the cruciates cross inside the notch between the condyles and run in opposite directions, the collaterals lie outside both condyles on their own sides, the lateral collateral ends on the fibula and the medial does not, each meniscus sits between its own condyle and plateau, and the extensor mechanism is one chain from femur to tibial tuberosity through the patella',
    next: 'A3: the joint capsule and synovium with its bursae and the suprapatellar pouch, the popliteus and the posterolateral corner, the hamstring and iliotibial attachments, the meniscal horns as separate attachments, and the popliteal vessels and the nerves behind. Nothing here moves, which is the first thing a knee scene beyond anatomy would need',
  },
  {
    organ: 'shoulder',
    level: 'A2',
    evidence:
      'scenes/musculoskeletal/scenes/shoulderAnatomy — scapula, glenoid, acromion and scapular spine, coracoid, clavicle, humeral head, both tubercles and the humeral shaft, the articular cartilage on both surfaces, the labrum, all four rotator cuff tendons, the long head of biceps and four ligaments, selectable by name; tests/organ-parts-anatomy.test.js — the glenoid is a fraction of the head it faces, three cuff tendons end on the greater tubercle and subscapularis on the lesser, supraspinatus passes under the acromion, the biceps tendon begins at the socket rim and runs down between the tubercles, and the coracoacromial ligament spans coracoid to acromion above the cuff',
    next: 'A3: the joint capsule with its other glenohumeral ligaments, the subacromial and subcoracoid bursae, deltoid and the remaining scapular muscles as bellies rather than straps, the conoid and trapezoid as separate ligaments, and the axillary vessels and the brachial plexus. Nothing here moves, which is the first thing a shoulder scene beyond anatomy would need',
  },
  {
    organ: 'hip',
    level: 'A2',
    evidence:
      'scenes/musculoskeletal/scenes/hipAnatomy — hip bone, acetabulum and labrum, articular cartilage, femoral head, neck, both trochanters and shaft, the ligament of the head, the three capsular ligaments and the gluteus medius and iliopsoas tendons, selectable by name; tests/organ-parts-anatomy.test.js — the socket rim reaches past the equator of the head so the cup grips rather than cradles, the labrum rings that rim, the neck holds the head lateral to and above the shaft, gluteus medius ends on the greater trochanter and iliopsoas on the lesser, the iliofemoral ligament crosses the front of the joint and the ischiofemoral the back, and the ligament of the head runs inside the socket',
    next: 'A3: the joint capsule itself with the three ligaments as thickenings of it, the acetabular notch and transverse ligament, the horseshoe shape of the acetabular cartilage, the bursae, the remaining hip muscles, the retinacular vessels up the neck and the sciatic nerve behind. Nothing here moves, which is the first thing a hip scene beyond anatomy would need',
  },
  {
    organ: 'eye',
    level: 'A2',
    evidence:
      'scenes/sensory/scenes/eyeAnatomy — sclera, choroid and retina as shells with walls, cornea, iris, pupil, lens and ciliary body, the anterior chamber and vitreous body, the optic disc, macula and optic nerve, and all four rectus muscles, selectable by name; tests/organ-parts-anatomy.test.js — the three coats nest outside-in without touching, the cornea is more steeply curved than the globe and meets it at the limbus, the lens sits behind the iris and never through it, the anterior chamber lies between cornea and iris, the optic disc is nasal to the macula and the macula is at the posterior pole, and the four recti reach the globe from four directions',
    next: 'A3: the retinal layers and the central retinal vessels, the optic cup, the posterior chamber and the trabecular meshwork the aqueous actually drains through, the suspensory fibres of the lens, the oblique muscles, the eyelids, conjunctiva and lacrimal apparatus, and the orbit around it. Nothing here moves, which is the first thing an accommodation or pupillary scene would need',
  },
  {
    organ: 'ear',
    level: 'A2',
    evidence:
      'scenes/sensory/scenes/earAnatomy — auricle and external auditory canal, tympanic membrane, middle ear cavity, malleus, incus and stapes, Eustachian tube, cochlea, vestibule, all three semicircular canals as one structure and the vestibulocochlear nerve, selectable by name; tests/organ-parts-anatomy.test.js — the chain runs medially in order from auricle to nerve, the canal ends at the drum and the drum’s centre is its most medial point, the three ossicles meet in order and only the stapes reaches the oval window, the Eustachian tube leaves the cavity forwards and downwards, and the three canals lie in three different planes',
    next: 'A3: the temporal bone and the mastoid air cells around it, the facial nerve crossing the middle ear, the two ossicular muscles, the ampullae of the canals, the round window membrane, and the scalae and organ of Corti inside the cochlea. Nothing here moves, which is the first thing a conduction scene would need',
  },
  {
    organ: 'skin',
    level: 'A2',
    evidence:
      'scenes/integumentary/scenes/skinAnatomy — epidermis, dermis and subcutaneous tissue as slabs sharing their boundary surfaces, adipose lobules inside the subcutaneous compartment, a hair follicle with the hair it makes, a sebaceous gland opening into that follicle, a sweat gland opening on the surface instead, an arteriole, a venule and a sensory nerve, selectable by name; tests/organ-parts-anatomy.test.js — the three layers stack without gaps and share one interlocking junction, the epidermis contains no vessel, the follicle reaches from the surface into the subcutis, the sebaceous gland touches the follicle and not the surface, the sweat duct opens on the surface away from the hair, and the vessels stay below the dermo-epidermal junction',
    next: 'A3: the layers of the epidermis itself, the arrector pili muscle, the named sensory receptors, the lymphatics, the fibrous septa between the fat lobules, and a way to say that skin from a palm is not skin from an eyelid. Nothing here grows, which is the first thing a wound-healing scene would need',
  },
  {
    organ: 'lymph-node',
    level: 'A2',
    evidence:
      'scenes/hematologic/scenes/lymphNodeAnatomy — capsule, cortex, medulla, the lymphoid follicles, the afferent vessels as one structure, the single efferent vessel and the hilum, selectable by name; tests/organ-parts-anatomy.test.js — capsule, cortex and medulla nest as three depths of one outline, the follicles lie inside the cortex, there are several afferent vessels and exactly one efferent, the afferents arrive on the convex side and the efferent leaves at the hilum on the other, and the medulla reaches towards the hilum',
    next: 'A3: the subcapsular and medullary sinuses lymph actually passes along, the paracortex as its own region, germinal centres inside the follicles, the reticular framework, and the artery and vein at the hilum. Nothing flows, which is the first thing a drainage or metastasis scene would need',
  },
  {
    organ: 'lymphatic-system',
    level: 'A1',
    evidence:
      'scenes/hematologic/scenes/lymphaticDrainage — thoracic duct, right lymphatic duct and cisterna chyli, the cervical, axillary and inguinal node groups each as one structure, two representative routes and a body silhouette for scale, selectable by name; tests/organ-parts-anatomy.test.js — the thoracic duct runs from the abdomen to the left venous angle and is far longer than the right duct, the right duct stays on the patient’s right and in the upper body, the cisterna chyli is at the thoracic duct’s lower end, and the three node groups are paired about the midline at neck, axilla and groin height',
    next: 'A2: the node groups anatomy actually names — mediastinal, para-aortic, iliac, popliteal, supratrochlear and the levels of the neck — as separately selectable structures, plus the spleen, thymus and tonsils as parts of the same system, and the valves that make lymph one-way. Nothing flows, which is the first thing a lymphoedema scene would need',
  },
  {
    organ: 'breast',
    level: 'A2',
    evidence:
      'scenes/reproductive/scenes/breastAnatomy — skin, nipple and areola, the lactiferous ducts and the lobules as separate structures, adipose tissue, Cooper’s ligaments, pectoralis major, the axillary tail and the axillary nodes, selectable by name; tests/organ-parts-anatomy.test.js — every duct reaches the nipple and no lobule does, the lobules lie at the far end of the ducts, Cooper’s ligaments span from the chest-wall side to the skin, the gland lies in front of pectoralis major and does not enter it, and the axillary tail runs towards the node group from the upper outer part of the gland',
    next: 'A2+: the quadrants a report is written in, the internal mammary drainage as a second route, the retromammary space between gland and muscle, the ribs and the muscles behind pectoralis, and the blood supply. Nothing changes with age or the cycle, which is the first thing a density or lactation scene would need',
  },
  {
    organ: 'spine',
    level: 'A2',
    evidence:
      'scenes/musculoskeletal/scenes/spineAnatomy — cervical, thoracic and lumbar regions and the sacrum, plus one lumbar level drawn in full with its body, pedicles, laminae, facet joints and spinous process, the disc below it as annulus and nucleus, the canal, the cord, the cauda equina and a pair of nerve roots, selectable by name; tests/organ-parts-anatomy.test.js — the three regions stack in order with the sacrum below, the curves alternate forward, back and forward, the canal runs behind the bodies for the whole column, the cord stops well above the bottom and the cauda equina continues below it, the nucleus is inside the annulus, the disc sits below the body and not inside it, and the roots leave laterally beneath the pedicles',
    next: 'A3: the ribs and their joints, the ligaments of the column including the ligamentum flavum, the intervertebral foramina as openings rather than gaps, the epidural fat and venous plexus, the coccyx, and the roots of every level rather than one pair. Nothing bends, which is the first thing a movement or instability scene would need',
  },
  {
    organ: 'nose',
    level: 'A2',
    evidence:
      'scenes/respiratory/scenes/noseAnatomy — external nose, nasal vestibule, septum, lateral nasal wall, hard palate, all three turbinates, all three meatuses, maxillary sinus and its ostium, frontal sinus, ethmoid air cells, sphenoid sinus, nasolacrimal duct, olfactory region and nasopharynx, selectable by name; tests/organ-parts-anatomy.test.js — the three shelves stack in order on one wall and each gutter lies below the shelf it is named for and above the next, the maxillary ostium leaves the sinus well above its floor and ends inside the middle meatus, the tear duct ends inside the inferior meatus and nowhere else, the olfactory patch sits on the roof above every turbinate, and the cavity runs from nostril to choana without the septum crossing into it',
    next: 'A3: the uncinate process, ethmoid bulla and hiatus semilunaris that shape the middle meatus, the frontal recess as a drawn channel, the anterior and posterior ethmoid groups separated by where they drain, the sphenoethmoidal recess, the cribriform plate and olfactory bulb, and the left cavity. Nothing here swells, which is the first thing an obstruction scene would need',
  },
  {
    organ: 'larynx',
    level: 'A2',
    evidence:
      'scenes/respiratory/scenes/larynxAnatomy — nasopharynx, oropharynx, laryngopharynx, both piriform sinuses, soft palate, palatine tonsils, epiglottis, hyoid bone, thyroid and cricoid cartilages, both arytenoids, cricothyroid membrane, vestibular folds, laryngeal ventricles, vocal folds, subglottic space, trachea, oesophagus and both recurrent laryngeal nerves, selectable by name; tests/organ-parts-anatomy.test.js — the three named lengths of the pharynx stack in order without overlapping, the piriform gutters reach forward past the larynx on both sides while the laryngopharynx stays behind it, the two pairs of folds are separated by the ventricle with the true folds below, the glottis is a V that closes to the midline in front and opens behind, the cricothyroid membrane lies in the gap between the two cartilages with nothing else in front of it, and the oesophagus lies behind the trachea with a nerve in the groove between them on each side',
    next: 'A3: the muscles of the larynx and pharynx and the joints they act on, the tongue and the valleculae in front of the epiglottis, the thyroid gland over the trachea, the aryepiglottic folds, the lower course of the left recurrent laryngeal nerve, and the layers of a vocal fold. Nothing here moves, which is the first thing a swallowing or a phonation scene would need',
  },
  {
    organ: 'pharynx',
    level: 'A2',
    evidence:
      'scenes/respiratory/scenes/larynxAnatomy — nasopharynx, oropharynx, laryngopharynx, both piriform sinuses, soft palate and palatine tonsils selectable by name, drawn as one lumen cut at the levels its names come from; tests/organ-parts-anatomy.test.js — the three lengths stack in order without overlapping and meet at the soft palate and the laryngeal inlet, and below the inlet the gutters reach forward past the larynx while the space behind it stays behind the cricoid',
    next: 'A3: the muscular wall and the constrictors, the tongue and the valleculae, the palatoglossal and palatopharyngeal arches, the rest of the lymphoid ring, the openings of the Eustachian tubes, and the upper oesophageal sphincter. Nothing here moves, which is the first thing a swallowing scene would need',
  },
  {
    organ: 'mouth',
    level: 'A2',
    evidence:
      'scenes/gastrointestinal/scenes/oralAnatomy — lips, hard and soft palate, both palatoglossal arches, both palatine tonsils, upper and lower dental arches, mandible, the tongue in its two parts with the vallate papillae between them, the lingual tonsil, the floor of the mouth, the frenulum, and all three pairs of salivary glands with the parotid and submandibular ducts, selectable by name; tests/organ-parts-anatomy.test.js — the tongue is drawn in two parts meeting at the sulcus with the row of vallate papillae on that line and nothing else marking it, the lingual tonsil lies behind it, each duct starts at its own gland and ends at the opening its copy names, the parotid opening is level with the upper teeth while its gland is behind the jaw, the submandibular opening is beside the frenulum while its gland is under the jaw, and the tongue sits between the palate above and the floor below',
    next: 'A3: the muscles of the tongue, floor and jaw, the joint of the jaw and the condyle, the lingual and hypoglossal nerves and the facial nerve in the parotid, the openings of the ducts as openings, the cheeks, the palatopharyngeal arch, and individual teeth. The jaw is drawn open at a fixed display position and nothing moves, which is the first thing a chewing or swallowing scene would need',
  },
  {
    organ: 'tongue',
    level: 'A2',
    evidence:
      'scenes/gastrointestinal/scenes/oralAnatomy — the tongue drawn in two parts, oral and root, meeting at the sulcus terminalis, with the row of vallate papillae lying along that line and the lingual tonsil behind it, all selectable by name; tests/organ-parts-anatomy.test.js — the two parts meet at SULCUS_Z and do not overlap, the papillae lie on that boundary and nothing else marks it, and the lingual tonsil is behind it on the root',
    next: 'A3: the intrinsic and extrinsic muscles and the midline septum, the filiform, fungiform and foliate papillae, the lingual and hypoglossal nerves and the boundary between their territories, and the vessels. The tongue does not move, which is the first thing a swallowing or a speech scene would need',
  },
  {
    organ: 'pelvic-floor',
    level: 'A2',
    evidence:
      'scenes/musculoskeletal/scenes/pelvicFloorAnatomy — pelvic ring, sacrum, coccyx, obturator internus, tendinous arch, pubococcygeus, iliococcygeus, coccygeus, puborectalis, urogenital hiatus, perineal body, perineal membrane, external anal sphincter, urethra, vagina, rectum and anal canal, selectable by name; tests/organ-parts-anatomy.test.js — the three slices of the levator sheet run front to back without overlapping and all hang from the same origin line the tendinous arch is drawn along, the two sides stop short of the midline in front so the hiatus between them is a real gap, the urethra and the vagina pass through that gap and the bowel does not, the puborectalis passes behind the anorectal junction, and the perineal body lies between the vagina in front and the anal canal behind',
    next: 'A3: the hip bones as bones rather than as a ring, the subdivisions of the levator, the fascia and the ligaments that suspend the viscera, the pudendal nerve and the vessels, the internal anal sphincter, and the bladder and uterus above. Nothing contracts and nothing descends, which is the first two things a continence or a prolapse scene would need',
  },
  {
    organ: 'hand',
    level: 'A2',
    evidence:
      'scenes/musculoskeletal/scenes/handAnatomy — radius, ulna, all eight carpal bones and the hook of the hamate named individually, the metacarpals and all three rows of phalanges, the flexor retinaculum, the carpal tunnel, the flexor tendons, the median nerve, the extensor tendons and the thenar muscles, selectable by name; tests/organ-parts-anatomy.test.js — the eight carpals lie in two rows in the right order across the wrist, the pisiform sits palmar to the triquetrum rather than beside it, the roof of the tunnel spans the two pillars and the tunnel lies under it and above the arch, the median nerve is the most palmar thing in the tunnel and the flexor tendons are deep to it, the extensor tendons are dorsal to every bone, and there are five metacarpals, five proximal phalanges, four middle phalanges and five distal phalanges — the thumb having two bones where the others have three',
    next: 'A3: bone ends rather than shafts — heads, bases, styloids and joint surfaces — the capsules and ligaments, the saddle shape of the thumb’s carpometacarpal joint, the flexor sheaths and which tendon is which, the extensor retinaculum and hoods, the ulnar nerve and artery in their own canal, and the intrinsic muscles. No joint bends, which is the first thing a grip or a tendon-excursion scene would need',
  },
  {
    organ: 'foot',
    level: 'A2',
    evidence:
      'scenes/musculoskeletal/scenes/footAnatomy — tibia, fibula, talus, calcaneus, navicular, cuboid, cuneiforms, the metatarsals and all three rows of phalanges, the plantar fascia, the spring ligament, the Achilles, tibialis posterior and peroneal tendons, the deltoid and lateral ligaments, and the ankle and subtalar joints, selectable by name; tests/organ-parts-anatomy.test.js — the navicular rides higher than the cuboid so the arch is an arch, the plantar fascia runs from the heel to the metatarsal heads and passes below the top of that arch, the talus sits between the leg above and the calcaneus below with a joint space at each boundary, the lateral malleolus reaches lower than the medial one, the deltoid is one sheet where the lateral side is three separate bands, and there are five metatarsals, five proximal phalanges, four middle phalanges and five distal phalanges',
    next: 'A3: joint surfaces rather than blocks — the dome of the talus, the three subtalar facets, the mortise itself — the capsules, the three cuneiforms separately so the transverse arch can be seen, the sesamoids, the fat pad, the tarsal tunnel, the intrinsic muscles, and the blood supply of the talus. Nothing bears weight and nothing bends, which is the first two things an arch-collapse or a gait scene would need',
  },
  {
    organ: 'skeleton',
    level: 'A1',
    evidence:
      'scenes/musculoskeletal/scenes/skeletonOverview — skull, mandible, the three named lengths of spine, sacrum and coccyx, ribs, sternum, clavicle, scapula, humerus, radius and ulna, hand bones, hip bones, femur, patella, tibia and fibula and foot bones, selectable by name; tests/organ-parts-anatomy.test.js — the column runs continuously from skull to sacrum in order with no gaps, the clavicle reaches the sternum while the scapula touches no other bone, the hip bone reaches the sacrum on both sides, the ribs run from the thoracic spine forward with the upper ones reaching the sternum and the lower ones not, and every joint of the limbs is below the one above it',
    next: 'A2 for this scene is not the goal: it is an overview by design, and every region that deserves named parts has its own scene. What would improve it is the regions that still have none — the skull as bones rather than one shell, the thorax as a cage with costal cartilages, and the elbow. Nothing here moves or bears weight',
  },
  {
    organ: 'neck',
    level: 'A2',
    evidence:
      'scenes/regional/scenes/neckAnatomy — twenty-three named structures selectable by name: the surface, four muscle groups, the cervical vertebrae, the hyoid, the laryngeal cartilages, the trachea, the oesophagus, the thyroid lobes, the isthmus, the parathyroids, the carotid sheath and its three contents, the internal and external carotids, the deep cervical nodes, the two vagus nerves, the two recurrent laryngeal nerves, the subclavian arteries and the aortic arch; tests/organ-parts-anatomy.test.js — the gullet lies behind the airway and leans left, the thyroid lobes touch the airway and do not enter it, the artery is medial to the vein and the vagus behind both inside the sheath, the external carotid runs in front of the internal, the recurrent nerves both end in the tracheo-oesophageal groove at the cricoid but turn at different heights, and the left turns lower than the right',
    next: 'A3: the thyroid’s own arteries and veins, the superior laryngeal nerve, the phrenic nerve and the brachial plexus, the lymph node levels as named regions rather than one chain, the fascial planes as separate layers, and the individual muscle bellies rather than four groups. Nothing moves, which is the first thing a swallowing or an airway scene would need',
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
