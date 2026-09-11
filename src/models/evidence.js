/**
 * How much weight each claim these models make can actually carry.
 *
 * ## Why this file exists
 *
 * Every scene here mixes three very different kinds of number in the same
 * read-out: things the physiology literature establishes, things this
 * repository chose so that a healthy reference would land where the textbooks
 * put it, and things that were simply invented because a model needed a value
 * and none was available. On screen they all render as digits.
 *
 * Prose caveats do not survive contact with a screenshot. So the confidence
 * behind each claim is written down here as **data**, in a fixed vocabulary,
 * so that it can be checked mechanically and quoted consistently — and so that
 * the one rule that matters cannot be broken quietly:
 *
 * > **An illustrative or calibration parameter must never be presented as a
 * > clinical measurement.**
 *
 * Reading a source in full does not promote a calibration to a measurement.
 * The external clinical review that produced the current versions of these
 * models resolved *causal* and *interpretive* claims; it did not turn any of
 * the invented magnitudes into measured ones, and this registry says so
 * entry by entry.
 *
 * `tests/evidence.test.js` checks the shape of every entry, that each one is
 * named in its scene's evidence dossier, and that every `established` or
 * `supported` entry names a test that exists.
 */

/**
 * The five levels, most to least load-bearing.
 *
 * The line that matters most is between the first two and the last three: an
 * `established` or `supported` claim is something the model is asserting about
 * the world, and a `calibration`, `illustrative` or `uncertain` one is
 * something the model needed in order to run.
 */
export const CONFIDENCE = {
  /**
   * A relation the literature treats as settled, and usually one that follows
   * from physics or from definitions. `τ = R·C`. `ΔP = Q·R`. HVPG = WHVP − FHVP.
   */
  ESTABLISHED: 'established',
  /**
   * A direction, an ordering or a mechanism that named sources support, but
   * whose *size* this model does not claim. "Loss of elastic recoil lowers the
   * maximal expiratory flow." "Increased intrahepatic resistance initiates
   * portal hypertension and increased splanchnic inflow perpetuates it."
   */
  SUPPORTED: 'supported',
  /**
   * A number chosen so that a reference case lands where the literature puts
   * it. It is a *consequence* of a target, not a measurement of anything, and
   * no such measurement may exist at all. The reference resistances are these.
   */
  CALIBRATION: 'calibration',
  /**
   * A number invented because the model needed one and none was available. The
   * tethering coupling exponent, the width of the collateral sigmoid. The
   * model claims the shape it produces, never the value.
   */
  ILLUSTRATIVE: 'illustrative',
  /**
   * A real law or a real structure, applied outside the regime where it holds,
   * and used for a *relative* statement only. Poiseuille's law across a whole
   * airway tree. A symmetric dichotomous branching. A wedged pressure taken to
   * equal sinusoidal pressure exactly.
   *
   * Distinct from `illustrative` because nothing was invented, and distinct
   * from `established` because the law is not true of the thing the model is
   * applying it to. Registering one of these as established is how a model
   * starts claiming that a convenient idealisation is a fact about a person.
   */
  APPROXIMATION: 'approximation',
  /**
   * A claim the model makes that the sources do not settle, or that is known
   * to point the wrong way under some conditions. Recorded rather than removed,
   * because a reader is better served by a marked weakness than by silence.
   */
  UNCERTAIN: 'uncertain',
};

/**
 * The three kinds of test in this repository, and what a failure in each one
 * means. **Which layer a claim is checked in is part of the claim.**
 *
 * The distinction is not organisational. It decides what you are entitled to
 * conclude when a test goes red, and getting it wrong in either direction is
 * expensive: a calibration constant asserted in the external layer makes this
 * repository's arbitrary choices look like findings, and a physiological
 * constraint left to the calibration layer means nobody notices when the model
 * stops obeying it.
 */
export const LAYER = {
  /**
   * **External physiology.** A proposition the literature requires, which
   * would be true if this repository did not exist. Reads no caption, no chart
   * and no stored answer, and contains no constant this repository chose.
   *
   * A failure here means the model has broken a constraint the physiology
   * imposes. This is the only layer whose failure licenses the sentence "the
   * medicine is wrong".
   */
  EXTERNAL: 'external',
  /**
   * **Model integrity.** Conservation, finiteness, determinism, solver
   * convergence, and the internal-consistency chain: the chart is the model,
   * the read-out is the model, the 3D is the model, the stored answer in a
   * lesson is the model's own output.
   *
   * A failure here means the implementation is broken, or that two parts of
   * the repository have drifted apart. It says nothing about the physiology.
   */
  INTEGRITY: 'integrity',
  /**
   * **Calibration behaviour.** That the parameterisation this repository
   * deliberately chose still behaves the way it was chosen to behave: that the
   * healthy liver still lands at the gradient it was tuned to, that a full
   * shunt still reaches the target, that the bronchodilator split still favours
   * total resistance over the ceiling.
   *
   * A failure here means **a choice this repository made has changed**, which
   * may be deliberate. It is never evidence that the medicine is wrong, and no
   * report may present it that way.
   */
  CALIBRATION: 'calibration',
};
const LEVELS = new Set(Object.values(CONFIDENCE));
const LAYERS = new Set(Object.values(LAYER));

/**
 * Levels a scene may present as if it were a fact about people.
 *
 * Everything outside this set is a property of *this model*, and may only be
 * checked in the calibration layer — see `defineEvidence`, which refuses any
 * other arrangement.
 */
export const ASSERTABLE = new Set([CONFIDENCE.ESTABLISHED, CONFIDENCE.SUPPORTED]);

/**
 * Validates a scene's registry as it is defined, so a malformed entry fails at
 * import rather than in a test that might not be looking.
 *
 * The rule it enforces beyond shape is the one this file exists for: **a claim
 * about the world is checked in the external or integrity layer, and a claim
 * about this model's own parameterisation is checked in the calibration
 * layer.** Nothing may be validated in the wrong one. An entry that tried
 * would be asserting that a number this repository invented is a finding.
 *
 * @param {string} scene
 * @param {{id:string, claim:string, confidence:string, source:string,
 *          validation?:string, layer?:string, note?:string}[]} entries
 */
export function defineEvidence(scene, entries) {
  const seen = new Set();
  for (const entry of entries) {
    if (!entry.id || seen.has(entry.id)) throw new Error(`${scene}: duplicate or missing evidence id "${entry.id}"`);
    seen.add(entry.id);
    if (!LEVELS.has(entry.confidence)) {
      throw new Error(`${scene}: "${entry.id}" has confidence "${entry.confidence}", which is not one of the six`);
    }
    if (!entry.claim || !entry.source) throw new Error(`${scene}: "${entry.id}" needs a claim and a source`);
    if (!ASSERTABLE.has(entry.confidence) && !entry.note) {
      throw new Error(`${scene}: "${entry.id}" is ${entry.confidence} and must say what it is not`);
    }
    if (entry.validation && !LAYERS.has(entry.layer)) {
      throw new Error(`${scene}: "${entry.id}" names a test but not which layer checks it`);
    }
    if (ASSERTABLE.has(entry.confidence)) {
      if (!entry.validation) throw new Error(`${scene}: "${entry.id}" is ${entry.confidence} and names no test`);
      if (entry.layer === LAYER.CALIBRATION) {
        throw new Error(
          `${scene}: "${entry.id}" is ${entry.confidence} but is checked in the calibration layer. ` +
            'A claim about the world cannot be established by a constant this repository chose.'
        );
      }
    } else if (entry.validation && entry.layer !== LAYER.CALIBRATION) {
      throw new Error(
        `${scene}: "${entry.id}" is ${entry.confidence} but is checked in the ${entry.layer} layer. ` +
          'A property of this model cannot be asserted as a physiological invariant.'
      );
    }
  }
  return Object.freeze(entries.map((entry) => Object.freeze({ ...entry, scene })));
}

// ---------------------------------------------------------------------------

/** @see src/models/circulation.js, docs/model-evidence/circulation.md */
export const CIRCULATION_EVIDENCE = defineEvidence('circulation', [
  {
    id: 'cardiac-output-definition',
    claim: 'Cardiac output is heart rate multiplied by stroke volume, with unit conversion from mL to L.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Standard haemodynamic definition; Simmons and Ventetuolo (2017).',
    validation: 'circulation definitions preserve their clinical units',
    layer: LAYER.INTEGRITY,
  },
  {
    id: 'pressure-flow-resistance',
    claim: 'Mean arterial pressure depends on flow and systemic vascular resistance, with central venous pressure retained in the relation.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Standard steady-flow haemodynamic relation; Simmons and Ventetuolo (2017).',
    validation: 'MAP depends on both flow and resistance in the constructed case',
    layer: LAYER.INTEGRITY,
  },
  {
    id: 'global-do2-definition',
    claim: 'Calculated global oxygen delivery is cardiac output multiplied by arterial oxygen content, with litres converted to decilitres.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Standard oxygen-delivery and arterial oxygen-content definitions; Collins et al. (2015).',
    validation: 'circulation definitions preserve their clinical units',
    layer: LAYER.INTEGRITY,
  },
  {
    id: 'fluid-responsive-direction',
    claim: 'In a patient who is fluid responsive, a fluid challenge can increase stroke volume and therefore cardiac output.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Fluid-responsiveness definition and pilot cohort reported by Baker et al. (2013); current ESICM guidance requires reassessment and individualisation.',
    validation: 'physiology: a preload-responsive fluid state raises stroke volume and cardiac output',
    layer: LAYER.EXTERNAL,
    note: 'This supports the direction only in the explicitly responsive state; it does not support giving fluid, a response size or a safety claim.',
  },
  {
    id: 'dobutamine-direction',
    claim: 'In the cited low-output heart-failure cohort, dobutamine increased stroke volume and cardiac output while systemic vascular resistance fell.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Leier et al. (1978), a thirteen-patient crossover study available here only as a PubMed abstract.',
    validation: 'physiology: dobutamine can raise stroke volume and cardiac output while systemic resistance falls',
    layer: LAYER.EXTERNAL,
    note: 'This is a phenotype-specific direction, not a general treatment effect and not a magnitude claim.',
  },
  {
    id: 'low-flow-map-anchor',
    claim: 'The reference state is set to an unindexed cardiac output of 3.648 L/min and a mean arterial pressure of 70 mmHg.',
    confidence: CONFIDENCE.CALIBRATION,
    source: 'Repository calibration chosen so high resistance holds MAP at the teaching target despite low flow.',
    validation: 'calibration: the low-flow reference is anchored to MAP 70',
    layer: LAYER.CALIBRATION,
    note: 'A constructed comparison point, not a measured patient and not a universal low-output threshold.',
  },
  {
    id: 'illustrative-response-sizes',
    claim: 'The fluid-responsive state multiplies stroke volume by 1.22, while the dobutamine state multiplies stroke volume by 1.40 and resistance by 0.72.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source for these magnitudes; illustrative values chosen to make the two teaching contrasts legible.',
    validation: 'calibration: the two response states retain their chosen illustrative sizes',
    layer: LAYER.CALIBRATION,
    note: 'The multipliers are invented, are not doses, cannot be combined and must never be read as expected treatment responses.',
  },
  {
    id: 'fixed-oxygen-content',
    claim: 'Haemoglobin, arterial oxygen saturation and arterial oxygen tension stay fixed across all three teaching states.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'A deliberate illustrative isolation chosen so calculated global oxygen delivery follows cardiac output alone.',
    validation: 'calibration: fixed oxygen content makes global DO2 proportional to cardiac output',
    layer: LAYER.CALIBRATION,
    note: 'This is not a claim that oxygen content stays fixed after fluid or dobutamine in a patient; haemodilution and gas-exchange changes are absent.',
  },
  {
    id: 'global-not-tissue',
    claim: 'The model has no microcirculation, oxygen extraction or oxygen consumption, so its global delivery output cannot determine tissue oxygenation.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'Known boundary of the implementation; ESICM shock guidance and the haemodynamic-coherence literature separate macrocirculation from tissue perfusion.',
    note: 'The missing coupling is clinically consequential. An improved calculated global DO2 can coexist with impaired regional or microcirculatory perfusion.',
  },
  {
    id: 'unindexed-output',
    claim: 'Cardiac output and calculated global oxygen delivery are unindexed, so the displayed absolute values cannot define adequate flow for a person.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'Known boundary of the implementation: body surface area, metabolic demand and patient size are absent.',
    note: 'The word low applies only to the constructed baseline comparison and must not be turned into a bedside threshold.',
  },
  {
    id: 'no-treatment-harms',
    claim: 'The intervention states have no congestion, arrhythmia, myocardial oxygen demand, haemodilution, adverse effects or interaction term.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'Known boundary of the implementation rather than evidence of safety.',
    note: 'Because only a selected benefit direction is represented, the controls cannot be used to choose, combine or dose treatment.',
  },
]);

// ---------------------------------------------------------------------------

/** @see src/models/copd.js, docs/model-evidence/copd.md */
export const COPD_EVIDENCE = defineEvidence('copd', [
  {
    id: 'time-constant',
    claim: 'A lung empties passively with a time constant equal to R·C, and either term lengthens it.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Standard respiratory mechanics (Nunn; West), restated in the dynamic-hyperinflation literature.',
    validation: 'physiology: raising airway resistance lengthens the expiratory time constant',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'insufficient-expiratory-time',
    claim:
      'Raised airway resistance can be sufficient to produce incomplete emptying and increased end-expiratory lung volume when the available expiratory time is inadequate; loss of elastic recoil is not a necessary precondition.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Dynamic hyperinflation literature. Supported by induced bronchoconstriction in asthma (PMID 10515404), where dynamic hyperinflation and expiratory flow limitation appear in lungs with normal elastic recoil.',
    validation: 'physiology: raised airway resistance alone raises end-expiratory volume',
    layer: LAYER.EXTERNAL,
    note:
      'The claim is that recoil loss is not *necessary*, not that resistance is the only route. A methacholine challenge is not a pure isolated-resistance experiment either — it also alters airway wall mechanics and the response is heterogeneous — so it is cited for the proposition that a recoil-preserved lung can hyperinflate, not as an experimental analogue of this model.',
  },
  {
    id: 'flow-limitation',
    claim:
      'Maximal expiratory flow is set by elastic recoil and the resistance of the collapsible airway upstream of the equal pressure point, and contains no effort term. Below that ceiling, expiratory muscle pressure does empty the lung further.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'The equal-pressure-point account of expiratory flow limitation; standard respiratory mechanics.',
    validation: 'physiology: the flow ceiling contains no effort term at all',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'recoil-and-tethering',
    claim:
      'Emphysematous destruction of alveolar attachments removes the radial traction holding small airways open in expiration, so the resistance upstream of the equal pressure point rises as elastic recoil is lost, and the flow ceiling falls by more than the loss of driving pressure alone.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Emphysema mechanics; reviews of hyperinflation and exercise in COPD (O’Donnell and colleagues); GOLD 2026.',
    validation: 'physiology: losing elastic recoil raises the upstream resistance as well as lowering recoil',
    layer: LAYER.EXTERNAL,
    note:
      'A direction, and only a direction. How steeply the upstream resistance rises is `tethering-exponent`, which is invented.',
  },
  {
    id: 'exercise-hyperinflation',
    claim:
      'Tachypnoea shortens expiratory time before it shortens anything else, so exercise progressively raises end-expiratory volume in an obstructed lung and lowers it in a healthy one.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Reviews of dynamic hyperinflation and exercise limitation in COPD; inspiratory capacity as its clinical measure.',
    validation: 'physiology: an obstructed lung hyperinflates when the expiratory time is taken away',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'bronchodilation-lowers-resistance',
    claim:
      'Bronchodilation relaxes airway smooth muscle and reduces airway resistance; lowering airway resistance shortens the R·C time constant.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Standard pharmacology and standard respiratory mechanics.',
    validation: 'physiology: a bronchodilator lowers airway resistance and shortens the time constant',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'bronchodilation-operating-volumes',
    claim:
      'Bronchodilation can reduce operating lung volumes and improve inspiratory capacity in COPD, at a workload the lung can meet.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Reviews of hyperinflation as a treatable trait; the exercise-hyperinflation literature; GOLD 2026.',
    validation: 'physiology: a bronchodilator can lower operating volumes and recover inspiratory capacity',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'bronchodilation-does-not-restore-recoil',
    claim:
      'Bronchodilation does not restore destroyed elastic recoil or destroyed alveolar attachments, so it does not abolish the loss of the flow ceiling that emphysema causes.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Standard teaching: no bronchodilator reverses parenchymal destruction.',
    validation: 'physiology: a bronchodilator does not restore elastic recoil or the tethering that went with it',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'reference-lung',
    claim: 'Reference volumes and a normal expiratory time constant of roughly half a second.',
    confidence: CONFIDENCE.CALIBRATION,
    source: 'Textbook central values for an adult; expiratory time-constant literature.',
    validation: 'calibration: the reference lung lands on the textbook volumes and time constant',
    layer: LAYER.CALIBRATION,
    note: 'Chosen so the reference lung lands on textbook central values. Not a measurement of any person, and never to be read as one.',
  },
  {
    id: 'tethering-exponent',
    claim: 'The upstream resistance rises as recoil^-2.5 as elastic recoil is lost.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. Chosen to put a lung at two thirds of normal recoil at about 2.5× the upstream resistance.',
    validation: 'calibration: the tethering exponent puts the flow ceiling where it was tuned to sit',
    layer: LAYER.CALIBRATION,
    note: 'An invented exponent. The model claims the direction and the asymmetry it produces, never the value.',
  },
  {
    id: 'bronchodilator-split',
    claim: 'A full bronchodilator response lowers total resistance by 28% and upstream resistance by 10%.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source for either size, and none for the ratio between them.',
    validation: 'calibration: the bronchodilator split favours total resistance over the ceiling',
    layer: LAYER.CALIBRATION,
    note:
      'Two invented percentages, and the ratio between them is invented too. That bronchodilation lowers resistance and does not restore recoil is external and is checked in the external layer; *how much more* it does the first than the second is this model’s choice and is checked here.',
  },
  {
    id: 'workload-expiratory-recruitment',
    claim: 'Expiratory muscle pressure recruited by the workload rises with the square of the demand, to 9 cmH₂O.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. Abdominal recruitment with exercise is standard; the size is not.',
    validation: 'calibration: the workload recruits expiratory pressure without reference to the lung',
    layer: LAYER.CALIBRATION,
    note: 'Invented. It exists so that "a fixed expiratory effort" is a condition the model can be held to, and it is deliberately independent of the inspiratory drive.',
  },
  {
    id: 'heterogeneity-width',
    claim: 'Unit resistances and compliances are scattered with half-widths of 45% and 27%.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'The dynamic-hyperinflation reviews describe regional variation in time constants; no width was available.',
    validation: 'calibration: the unit spread has the width it was given, and does not move the mean lung',
    layer: LAYER.CALIBRATION,
    note: 'Invented widths. The model claims the spread exists and what it causes, not how wide it is in a person.',
  },
  {
    id: 'effort-cannot-worsen',
    claim: 'In this model expiratory effort can only help or do nothing.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'In a real flow-limited lung, forced expiration can raise end-expiratory volume through dynamic compression.',
    note: 'A known one-sided error. Recorded here and in the scene’s scope panel rather than left for a reader to discover.',
  },
]);

/** @see src/models/asthma.js, docs/model-evidence/asthma.md */
export const ASTHMA_EVIDENCE = defineEvidence('asthma', [
  {
    id: 'poiseuille-ideal-tube',
    claim:
      'For steady laminar flow in an ideal cylindrical tube, Poiseuille resistance is proportional to L/r⁴.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Poiseuille’s law. A result about an ideal tube, and true of one.',
    validation: 'physiology: Poiseuille resistance in an ideal tube goes as length over radius to the fourth',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'fourth-power-approximation',
    claim:
      'This asthma model uses the r⁴ dependence as a **relative** approximation for airway narrowing, applied to every generation of the tree.',
    confidence: CONFIDENCE.APPROXIMATION,
    source:
      'The law above, applied outside the regime where it holds. Flow in the trachea and main bronchi is not laminar, real airways are not ideal tubes, and a real tree’s resistance is not this expression’s.',
    validation: 'calibration: the tree’s resistance is a ratio to itself, so the approximation cancels',
    layer: LAYER.CALIBRATION,
    note:
      'Not a law about real airway resistance, and must never be registered as one. It survives only because every resistance this model reports is a ratio to the same tree unstimulated, so the part the approximation gets wrong divides out. No absolute resistance is produced.',
  },
  {
    id: 'symmetric-dichotomy',
    claim: 'An eight-generation symmetric dichotomous tree with a diameter ratio of 2^(−1/3).',
    confidence: CONFIDENCE.APPROXIMATION,
    source: 'Weibel’s model A and the Hess–Murray law, which give the ideal ratio. Real branching is markedly asymmetric and a lung has twenty-three generations.',
    validation: 'calibration: each generation is narrower than the last by the homothety ratio',
    layer: LAYER.CALIBRATION,
    note:
      'An idealised structure. Because the missing generations are the ones where total cross-section explodes, this model’s resistance is spread evenly across its generations where a real lung’s is concentrated centrally. The model does not claim to say where in a lung the resistance sits.',
  },
  {
    id: 'muscle-throughout',
    claim:
      'Airway smooth muscle is present throughout the airway tree, including the trachea — as trachealis in the posterior membranous wall — and remains present to the terminal bronchioles, where it is relatively prominent compared with the size of the airway wall. Asthma involves the whole airway tree, not the small airways alone.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Standard airway anatomy; reviews of airway smooth muscle distribution (PMC9581182); GINA 2026.',
    validation: 'physiology: airway smooth muscle is present at every generation, and prominent peripherally',
    layer: LAYER.EXTERNAL,
    note:
      'What is required anatomically is that central smooth muscle is non-zero and that bronchiolar smooth muscle is relatively prominent. There is no continuous quantitative law here, and the external layer does not assert one — a strict generation-by-generation increase would be this model’s ramp presented as a finding.',
  },
  {
    id: 'cartilage-falls-away',
    claim:
      'Cartilage support decreases toward the peripheral airways — complete rings in the trachea, irregular plates in the bronchi — and bronchioles have no cartilage at all, which is part of what defines them.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Standard airway anatomy.',
    validation: 'physiology: cartilage support decreases distally and is absent from the bronchioles',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'distal-narrowing-effect',
    claim:
      'Distal airway calibre can be more strongly affected by smooth-muscle contraction than central airway calibre, because the muscle acts on a wall the cartilage no longer splints.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'The two anatomical facts above, and standard teaching on where bronchoconstriction bites.',
    validation: 'physiology: the same activation can narrow a peripheral airway more than a central one',
    layer: LAYER.EXTERNAL,
    note: 'A direction. **How much** more is `constrictibility-weights`, which this repository chose.',
  },
  {
    id: 'constrictibility-weights',
    claim:
      'Smooth muscle is 0.45 of a bronchiole’s at the trachea and complete by generation 4; cartilage support is 0.85 at the trachea and gone by generation 5; their product runs from about 0.07 to 1.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source for any of the three. The shapes follow the anatomy; the numbers were chosen.',
    validation: 'calibration: the constrictibility weights have the profile they were given',
    layer: LAYER.CALIBRATION,
    note:
      'Invented magnitudes, including the ratio between the peripheral and central weights. The anatomy they encode is external and is checked in the external layer; the profile is a modelling choice and is checked here.',
  },
  {
    id: 'self-organised-patchiness',
    claim:
      'A uniform stimulus applied to a network with minimal structural heterogeneity, a steep local response and interdependence between an airway and the parenchyma around it can produce clustered ventilation defects.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Venegas et al., Nature 434:777–82 (2005), doi:10.1038/nature03490; Winkler & Venegas, "Mathematical Modeling of Ventilation Defects in Asthma" (PMC4698910); "The role of heterogeneity in asthma: a structure-to-function perspective" (PMC5543015).',
    validation: 'physiology: a uniform stimulus on a nearly-uniform tree produces clustered defects',
    layer: LAYER.EXTERNAL,
    note: 'A published proposal that this model illustrates. It is not their model and reproduces none of their results.',
  },
  {
    id: 'feedback-is-the-cause',
    claim: 'The clustering comes from the feedback loop, not from the scatter built into the tree.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'The same modelling literature; made falsifiable here by solving with the tethering term frozen.',
    validation: 'physiology: disabling the interdependence feedback markedly attenuates the clustering',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'tethering-direction',
    claim: 'Increasing lung volume increases the parenchymal tethering forces that oppose airway narrowing.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Airway–parenchymal interdependence; standard respiratory mechanics.',
    validation: 'physiology: greater lung inflation increases the tethering that opposes narrowing',
    layer: LAYER.EXTERNAL,
    note: 'A direction for the mechanical term only. This model says nothing about what a real deep inspiration does.',
  },
  {
    id: 'deep-inspiration-not-modelled',
    claim:
      'The bronchodilator and bronchoprotective effects of a deep inspiration are impaired or lost in asthma, most of all where hyperresponsiveness is strong — and this model cannot produce them either way.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'Reviews of deep inspiration in asthma (PMC10585885).',
    note:
      'Recorded as a boundary, not as an output. The smooth-muscle dynamics that decide it — strain rate, cross-bridge cycling, contractile plasticity — are absent, so no test here may assert any particular bronchodilation from a real deep inspiration.',
  },
  {
    id: 'tethering-coupling',
    claim: 'Tethering rises with the region’s ventilation to the power 0.35.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. A crude scalar stand-in for mechanical coupling between neighbouring regions.',
    validation: 'calibration: the coupling exponent is what decides patchy against uniformly shut',
    layer: LAYER.CALIBRATION,
    note: 'Invented, and the single parameter this model’s behaviour is most sensitive to. Raise it and the whole lung tips at once; lower it and it never goes patchy.',
  },
  {
    id: 'response-steepness',
    claim: 'The single-airway dose-response has a steepness of 6.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. A smooth-muscle dose-response is sigmoid; its steepness here is chosen.',
    validation: 'calibration: the dose-response has the knee this parameterisation was chosen to give',
    layer: LAYER.CALIBRATION,
    note: 'Invented. Needed with the feedback loop to produce a knee rather than a slope.',
  },
  {
    id: 'inherited-sensitivity',
    claim: 'Seven tenths of a branch’s responsiveness is inherited from its parent.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source for the share. That airway inflammation is regional rather than per-airway is standard.',
    validation: 'calibration: inherited sensitivity is what turns speckle into regions',
    layer: LAYER.CALIBRATION,
    note: 'Invented. Without some inheritance the model produces speckle instead of the clustered defects imaging shows; the claim is that some is inherited, not how much.',
  },
  {
    id: 'maximum-narrowing',
    claim: 'A fully contracted airway loses 62% of its radius.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source at all — the number was chosen, not found.',
    validation: 'calibration: the maximum narrowing bounds how far the model can go',
    layer: LAYER.CALIBRATION,
    note: 'Invented. Sets how far the model can go, not what an airway does.',
  },
  {
    id: 'relative-defect-measure',
    claim: 'At full stimulus the defect count falls, because a uniformly shut lung has no relative defects.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'A property of the measure rather than of the lung.',
    note: 'Recorded so that the air reaching the lung, not the defect count, is the number read there. Said in the scene’s scope panel, its walk-through and its model card.',
  },
]);

/** @see src/models/portalHypertension.js, docs/model-evidence/cirrhosis-portal-hypertension.md */
export const PORTAL_EVIDENCE = defineEvidence('portal-hypertension', [
  {
    id: 'network-law',
    claim: 'ΔP = Q·R along every path, with flow conserved at the portal vein.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Arithmetic, applied to standard portal anatomy.',
    validation: 'flow is conserved at the portal vein, in every configuration',
    layer: LAYER.INTEGRITY,
    note:
      'Conservation is a property of the implementation rather than a finding about people, so it is checked in the integrity layer. Without it every pressure the model reports would be meaningless, which is why it is here at all.',
  },
  {
    id: 'initiating-mechanism',
    claim:
      'Increased intrahepatic vascular resistance is the initiating mechanism of portal hypertension, and it raises the gradient on its own.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Pathophysiology reviews of portal hypertension (PMC2999290, PMC3971388, PMC3000670); Baveno VII (PMC11090185).',
    validation: 'haemodynamics: raising intrahepatic resistance raises the portal pressure gradient',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'perpetuating-mechanism',
    claim:
      'Chronic portal hypertension induces splanchnic vasodilation and a hyperdynamic circulation; the resulting increase in portal inflow maintains and worsens the pressure. It is a secondary feed-forward loop, not a parallel cause.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'The same pathophysiology reviews.',
    validation: 'haemodynamics: increased inflow at a fixed hepatic resistance raises the gradient too',
    layer: LAYER.EXTERNAL,
    note: 'The model has no time in it, so the vasodilation is a control rather than a consequence. The order is supplied by the walk-through and stated there.',
  },
  {
    id: 'dynamic-component-exists',
    claim:
      'Cirrhotic intrahepatic vascular resistance contains structural and reversible dynamic components; the dynamic component — activated stellate cell contraction, reduced intrahepatic nitric oxide, increased endothelin — is often described as contributing roughly 20–30% of the increased resistance. Its existence is why a drug can lower portal pressure at all.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'The pathophysiology reviews above, in which the 20–30% range is repeated.',
    validation: 'haemodynamics: a reversible component of the intrahepatic resistance can be relieved',
    layer: LAYER.EXTERNAL,
    note:
      'The external claim is that the two components exist and that the dynamic one is a minority of the total. The 20–30% range is a description in the literature rather than a law, and this model’s way of applying it is a separate entry.',
  },
  {
    id: 'dynamic-tone-parameterisation',
    claim: '`dynamicTone` at full adds 30% of `structuralResistance`, as a multiplicative share rather than a fixed addition.',
    confidence: CONFIDENCE.CALIBRATION,
    source: 'Calibrated to the top of the reported 20–30% range, applied as a share of what the structure already costs.',
    validation: 'calibration: the dynamic component is a share of what the structure already costs',
    layer: LAYER.CALIBRATION,
    note:
      'A modelling choice with a consequence: expressing it as a share makes the dynamic component worth more in a badly scarred liver than in a healthy one. That direction is defensible and the 30% is not measured, so this is checked here and never as a physiological invariant.',
  },
  {
    id: 'collaterals-do-not-decompress',
    claim:
      'Portosystemic collaterals can decompress the portal system and divert portal blood, and do not eliminate the pathophysiology sustaining portal hypertension: the increased intrahepatic vascular resistance remains, and the increased inflow can perpetuate the pressure.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Portosystemic collateral literature; the pathophysiology reviews above.',
    validation: 'haemodynamics: collaterals divert flow and leave the driving pathophysiology in place',
    layer: LAYER.EXTERNAL,
    note:
      'Explicitly *not* the claim that collaterals are always high-resistance. Some spontaneous shunts are wide and carry very large flows. How much this model’s collaterals decompress is `collateral-and-shunt-resistance`.',
  },
  {
    id: 'hvpg-approximation',
    claim:
      'HVPG = WHVP − FHVP. In sinusoidal portal hypertension WHVP approximates sinusoidal pressure, so HVPG reflects the part of the gradient lying across the sinusoids and under-reads whatever lies upstream of them.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'HVPG measurement literature; Baveno VII.',
    validation: 'haemodynamics: HVPG tracks the sinusoidal component and not the presinusoidal one',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'wedged-equals-sinusoidal',
    claim: 'This model treats the wedged pressure as equal to sinusoidal pressure exactly.',
    confidence: CONFIDENCE.APPROXIMATION,
    source: 'An idealisation of the claim above. Real equilibration depends on sinusoidal communication, which disease itself alters.',
    validation: 'calibration: the model’s HVPG is the sinusoidal segment exactly, by construction',
    layer: LAYER.CALIBRATION,
    note:
      'The prose everywhere says WHVP *approximates* sinusoidal pressure; the arithmetic says equals. That gap is this entry, and it means the model overstates how cleanly the two separate.',
  },
  {
    id: 'presinusoidal-vs-prehepatic',
    claim:
      'Presinusoidal intrahepatic portal hypertension (schistosomiasis, porto-sinusoidal vascular disease, the presinusoidal component of some cholestatic disorders) and prehepatic portal hypertension (portal vein thrombosis) share the measurement consequence and not the anatomy.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Standard classification of portal hypertension by site; Baveno VII.',
    validation: 'haemodynamics: presinusoidal intrahepatic and prehepatic are named as different things',
    layer: LAYER.EXTERNAL,
    note: 'Only the presinusoidal intrahepatic pattern is modelled. There is no extrahepatic portal obstruction in this model.',
  },
  {
    id: 'baveno-thresholds',
    claim:
      'An HVPG above 5 mmHg is portal hypertension; ≥10 mmHg is clinically significant portal hypertension. Both are defined on HVPG and established in compensated advanced chronic liver disease of sinusoidal aetiology.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Baveno VII (PMC11090185).',
    validation: 'haemodynamics: the thresholds are Baveno VII’s, read on HVPG, and 12 mmHg is not among them',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'twelve-mmhg-context',
    claim:
      'In variceal bleeding, a post-TIPS portosystemic pressure gradient below 12 mmHg is a Baveno VII haemodynamic target; an HVPG of 12 mmHg or more is the classic association with variceal bleeding. 12 mmHg is not a general decompensation threshold.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Variceal bleeding and TIPS literature; Baveno VII.',
    validation: 'haemodynamics: twelve mmHg exists only in the variceal and post-TIPS context',
    layer: LAYER.EXTERNAL,
    note: 'Confined to that context in code, and absent from the HVPG band boundaries entirely.',
  },
  {
    id: 'tips-low-resistance-path',
    claim:
      'A TIPS provides a low-resistance pathway from the portal vein to a hepatic vein and lowers the portosystemic pressure gradient; the blood that takes it does not perfuse hepatocytes.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'TIPS literature; and, for the second half, conservation of flow.',
    validation: 'haemodynamics: more shunt conductance lowers the gradient and diverts blood past the liver',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'reference-resistances',
    claim: 'Splanchnic, sinusoidal and presinusoidal reference resistances.',
    confidence: CONFIDENCE.CALIBRATION,
    source: 'Chosen so a healthy liver produces a gradient of about 3 mmHg at about 1000 mL/min.',
    validation: 'calibration: a healthy liver lands where this model was tuned to put it',
    layer: LAYER.CALIBRATION,
    note: 'No measurement of an intrahepatic resistance exists for a person. These are the numbers that hit a target, and are never a measurement.',
  },
  {
    id: 'collateral-conductance-mapping',
    claim: 'Established collateral conductance is mapped from the gradient by a sigmoid centred on 10 mmHg with a width of 2.2 mmHg.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'The centre is the clinically significant threshold, borrowed as a plausible midpoint. The width has no source.',
    validation: 'calibration: the collateral mapping is smooth, and is not a valve',
    layer: LAYER.CALIBRATION,
    note:
      'An equilibrium mapping onto a chronic process — dilatation of pre-existing channels, remodelling, angiogenesis, over months to years. **Not** a law that opens collaterals at a pressure, and nothing in the model or the scene may describe it as one.',
  },
  {
    id: 'collateral-and-shunt-resistance',
    claim:
      'Resistances of a fully established collateral bed and of a fully dilated TIPS: with `collateralPropensity = 1` the gradient stays well above the clinically significant threshold, and with `tips = 1` it falls below 12 mmHg while hepatic portal flow at least halves.',
    confidence: CONFIDENCE.CALIBRATION,
    source: 'Chosen so an established-cirrhosis configuration lands in the reported HVPG range and a full shunt reaches the post-TIPS target.',
    validation: 'calibration: the collateral and shunt resistances land the two configurations where they were aimed',
    layer: LAYER.CALIBRATION,
    note:
      'Calibrations, including every number in the claim: the exact shunt fraction, the exact residual gradient and the exact fall in hepatic portal flow are all consequences of two chosen resistances. That collaterals do not remove the pathophysiology, and that a TIPS lowers the gradient at the cost of hepatic perfusion, are external and are checked in the external layer.',
  },
  {
    id: 'perfusion-under-isolated-vasodilation',
    claim: 'Raising splanchnic vasodilation alone raises hepatic portal perfusion here; in a real cirrhotic liver it usually falls.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'At a fixed hepatic resistance a larger gradient drives more flow, which is arithmetic; what makes perfusion fall in a person is not in the model.',
    note:
      'Confined to an isolated manipulation. Along the scene’s own axis — progressive scarring — perfusion falls, and a test asserts it at every step so that a known-wrong direction is never a headline read-out.',
  },
]);


export const HEPATORENAL_EVIDENCE = defineEvidence('hepatorenal-syndrome', [
  {
    id: 'starling-filtration',
    claim:
      'Glomerular filtration is ultrafiltration: GFR = Kf · (P_glomerular − P_Bowman − π_plasma). Filtration stops when the net pressure reaches zero, whatever the blood flow.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'The Starling relation applied to the glomerulus; standard renal physiology.',
    validation: 'physiology: glomerular filtration follows the net filtration pressure',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'parallel-beds',
    claim:
      'The vascular beds of the systemic circulation are in parallel. Holding the conductances of the other beds constant, raising the conductance of one of them lowers total systemic vascular resistance.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Conductances in parallel add. Arithmetic, applied to standard circulatory anatomy.',
    validation: 'physiology: with the other beds held fixed, opening one of them lowers total resistance',
    layer: LAYER.EXTERNAL,
    note:
      'The qualifier is load-bearing and an earlier version of this entry omitted it. If the other beds constrict hard enough, total conductance falls and total resistance rises. Whether it does so in this model is a question about the constriction gain this repository chose, and is a separate entry.',
  },
  {
    id: 'net-resistance-fall',
    claim:
      'In this model the compensatory constriction of the non-splanchnic beds is not strong enough to reverse the fall in systemic vascular resistance, so the total still falls as the splanchnic bed opens.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'A consequence of `SYSTEMIC_CONSTRICTION_GAIN` and `SYSTEMIC_VASODILATION_GAIN`, both chosen so that the resistance fall lands in the range described for advanced cirrhosis.',
    validation: 'calibration: the constriction gain leaves the resistance fall intact',
    layer: LAYER.CALIBRATION,
    note:
      'That a hyperdynamic circulation runs at a reduced systemic resistance is supported. That *these* gains produce it is arithmetic about two numbers this repository chose, and the parallel law alone does not guarantee it.',
  },
  {
    id: 'incomplete-compensation',
    claim:
      'Mean arterial pressure is cardiac output times systemic vascular resistance. A fall in resistance that the heart does not fully offset therefore lowers arterial pressure, whatever the cause of the fall.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'ΔP = Q·R. Arithmetic.',
    validation: 'physiology: a fall in resistance the heart does not fully offset lowers pressure',
    layer: LAYER.EXTERNAL,
    note:
      'Asserted on the arithmetic alone. That this model’s own progression axis produces the fall at every step is `pressure-along-the-axis`.',
  },
  {
    id: 'pressure-along-the-axis',
    claim:
      'Along this model’s chosen progression axis, arterial pressure falls at every step.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. A consequence of the chosen compensation exponent applied along an axis this repository chose.',
    validation: 'calibration: pressure falls at every step of the chosen progression axis',
    layer: LAYER.CALIBRATION,
    note:
      'The arithmetic of incomplete compensation is external; that the chosen path exercises it monotonically is not a fact about anybody.',
  },
  {
    id: 'hyperdynamic-circulation',
    claim:
      'Cirrhosis is characterised by a hyperdynamic circulation — reduced systemic vascular resistance with an increased cardiac output — and the increase does not restore arterial pressure to normal. It is *not* established that cardiac output goes on rising into HRS-AKI: at the onset of hepatorenal syndrome, cardiac output has been observed to fall.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Ruiz-del-Arbol L et al., Hepatology 2005 (PMID 15977202), in which cardiac output falls at the onset of hepatorenal syndrome; Khemichian S, Nadim MK, Terrault NA, Annu Rev Med 2025;76:373–387 (DOI 10.1146/annurev-med-050223-112947); earlier reviews of the circulatory abnormalities of cirrhosis (PMC5904971, PMC6182055, PMC3959227).',
    validation: 'physiology: an impaired cardiac response deepens the underfilling and lowers filtration',
    layer: LAYER.EXTERNAL,
    note:
      'Two earlier versions of this entry were too strong. The first asserted that worsening cirrhosis raises cardiac output *and* lowers pressure as a single invariant along the whole trajectory. The second was validated by a test asserting that *this model* can reach the failing renal phase with the reserve control at zero — a statement about the model’s capability under a chosen calibration, not about people. What is external is the direction shared with `cardiac-reserve`: an impaired cardiac response deepens the underfilling. That this model can represent such a path is `low-output-capability`; that its default path raises output is `rising-output-path`.',
  },
  {
    id: 'low-output-capability',
    claim:
      'This model’s `cardiacReserve` control can represent a low-output path, and under the chosen calibration that path reaches the failing renal phase.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. A statement about what this parameterisation can produce.',
    validation: 'calibration: the reserve control can drive a low-output path into the failing renal phase',
    layer: LAYER.CALIBRATION,
    note:
      'That a falling cardiac output is a real route into HRS-AKI is supported and belongs to `hyperdynamic-circulation`. Where *this* model’s knee falls on that route is a consequence of gains this repository chose.',
  },
  {
    id: 'rising-output-path',
    claim:
      'With cardiac reserve intact, this model’s progression axis raises cardiac output at every step.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'No source. A consequence of the invented cardiac compensation exponent, chosen so that the default path shows the hyperdynamic circulation rather than a low-output one.',
    validation: 'calibration: the default path raises cardiac output and the reserve control can reverse it',
    layer: LAYER.CALIBRATION,
    note:
      'It is the model’s default, not a natural history. Lowering `cardiacReserve` produces a falling-output path to the same renal failure, which is the pattern Ruiz-del-Arbol describes, and the scene’s copy must not read as “cardiac output always keeps rising”.',
  },
  {
    id: 'arterial-underfilling',
    claim:
      'The reduction in effective arterial blood volume that follows arterial vasodilation activates the renin-angiotensin-aldosterone system, the sympathetic nervous system and vasopressin. This is the peripheral arterial vasodilation account of sodium retention and renal failure in cirrhosis.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Schrier’s peripheral arterial vasodilation hypothesis and the reviews above.',
    validation: 'physiology: a greater arterial pressure deficit produces greater vasoconstrictor activation',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'reversible-vasoconstrictor-component',
    claim:
      'A substantial part of the renal failure in HRS-AKI is reversible renal vasoconstriction rather than fixed injury: it improves when the circulation is treated, and it resolves after liver transplantation.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Khemichian S, Nadim MK, Terrault NA, Annu Rev Med 2025;76:373–387 (DOI 10.1146/annurev-med-050223-112947); Nadim MK et al., J Hepatol 2024;81:163–183 (PMID 38527522).',
    validation: 'physiology: raising vasoconstrictor tone lowers renal perfusion',
    layer: LAYER.EXTERNAL,
    note:
      'Deliberately narrower than it used to be. An earlier version claimed HRS-AKI is renal vasoconstriction in a kidney that is *structurally near-normal* — an overstatement the 2024 consensus does not support, since tubular injury, proteinuria and pre-existing CKD may all be present and other AKI mechanisms may coexist. This model has no injury term, so it isolates the reversible component and can say nothing about the rest. What is asserted externally is the direction — more vasoconstrictor tone, less renal perfusion. `kidneyWithoutTheSignal` is a counterfactual this repository invented, so its semantics are `counterfactual-semantics` and what it produces along the chosen axis is `counterfactual-along-the-axis`. Note that it improves *filtration* only past a crossover later than the knee; earlier on it lowers it, because the efferent constriction was holding filtration up.',
  },
  {
    id: 'counterfactual-semantics',
    claim:
      '`kidneyWithoutTheSignal` re-solves the same kidney at the same arterial pressure with the activation set to zero and nothing else changed, and the kidney solver takes no argument that identifies the liver.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'A property of the code. The counterfactual is this repository’s construction, not an experiment anybody ran.',
    validation: 'integrity: the counterfactual changes the activation and nothing else',
    layer: LAYER.INTEGRITY,
  },
  {
    id: 'counterfactual-along-the-axis',
    claim:
      'Along this model’s chosen progression axis, the counterfactual improves renal perfusion at every step, and improves filtration only past a crossover that lies some way *beyond* the failure of autoregulation.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. A statement about what this parameterisation produces along an axis this repository chose.',
    validation: 'calibration: the counterfactual improves perfusion at every step, and filtration only past a later crossover',
    layer: LAYER.CALIBRATION,
    note:
      '"At every severity" is a claim about the chosen path, not about patients. The two positions are also distinct and were conflated: the knee is where the afferent arteriole runs out of room, and the crossover is where removing the signal stops lowering filtration and starts raising it. The second is later than the first, and both are consequences of the constrictor gains.',
  },
  {
    id: 'activation-along-the-axis',
    claim:
      'Along this model’s chosen progression axis, arterial underfilling and the vasoconstrictor activation both rise at every step.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. The monotonicity is a property of the chosen path, not of cirrhosis.',
    validation: 'calibration: underfilling and activation rise at every step of the chosen axis',
    layer: LAYER.CALIBRATION,
    note:
      'The external claim is the local one — a larger pressure deficit gives a larger signal. That the chosen severity axis walks that relation monotonically is an invented path, not a natural history, and a patient’s course need not be monotonic in either quantity.',
  },
  {
    id: 'modelling-boundary-not-a-claim',
    claim:
      'The absence of structural kidney injury in this model is a boundary of the model. Real HRS-AKI may occur with tubular injury, proteinuria or pre-existing chronic kidney disease, and may coexist with other mechanisms of AKI.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Nadim MK et al., J Hepatol 2024;81:163–183 (PMID 38527522), the ADQI–ICA joint consensus.',
    validation: 'integrity: the model has no structural injury term and the scene says so in both languages',
    layer: LAYER.INTEGRITY,
    note:
      'The *medicine* — that HRS-AKI may coexist with tubular injury, proteinuria or pre-existing CKD — rests on the 2024 consensus and needs no test. What needs a test is that this repository’s own structure and copy say so, and that is a contract between the model, the scope panel and the scene: an integrity claim, not a physiological one. An earlier version had it in the external layer, where a failure would have licensed the sentence "the model has broken a constraint the physiology imposes" for what is really a copy regression.',
  },
  {
    id: 'efferent-predominance',
    claim:
      'Angiotensin II constricts the efferent arteriole preferentially. Glomerular filtration is therefore defended while renal blood flow is already falling, and the filtration fraction rises.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Standard renal physiology of angiotensin II; the pathophysiology reviews above.',
    validation: 'physiology: efferent-predominant constriction defends filtration and raises the filtration fraction',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'mesangial-kf',
    claim:
      'Angiotensin II contracts glomerular mesangial cells and reduces the ultrafiltration coefficient, opposing the rise in glomerular pressure it causes.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Standard renal physiology of angiotensin II.',
    validation: 'physiology: the vasoconstrictor signal lowers the ultrafiltration coefficient',
    layer: LAYER.EXTERNAL,
    note:
      'Without this the model would answer that early vasoconstrictor activation raises filtration far above normal, which is not what happens.',
  },
  {
    id: 'autoregulation-range',
    claim:
      'Renal blood flow is autoregulated over a range of perfusion pressures and becomes pressure-dependent below the lower limit of that range.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Standard renal physiology.',
    validation: 'physiology: renal blood flow is held steady within the autoregulatory range and follows pressure below it',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'vasoconstrictors-exhaust-autoregulation',
    claim:
      'Vasoconstrictor activation reduces the afferent arteriole’s capacity to dilate, so the renal circulation becomes pressure-dependent at a pressure it would otherwise have autoregulated around.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'The hepatorenal syndrome reviews above, in which the renal circulation in the syndrome is described as pressure-dependent.',
    validation: 'physiology: vasoconstrictor tone raises the pressure at which autoregulation fails',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'prostaglandin-shield',
    claim:
      'Renal prostaglandins help preserve afferent arteriolar vasodilation when effective arterial volume is reduced, and inhibiting their synthesis can lower renal perfusion and glomerular filtration.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Standard renal pharmacology of non-steroidal anti-inflammatory drugs; guidance on their avoidance in decompensated cirrhosis; Nadim MK et al., J Hepatol 2024;81:163–183 (PMID 38527522) on nephrotoxin avoidance.',
    validation: 'physiology: inhibiting the afferent prostaglandin shield lowers renal perfusion and filtration',
    layer: LAYER.EXTERNAL,
    note:
      'An earlier version of this claim ended "without changing anything systemic", which is false of real non-steroidal anti-inflammatory drugs — they affect sodium and water handling and arterial pressure, and cause haemodynamic acute kidney injury and acute interstitial nephritis. That the *model* gives the control no systemic action is a separate, integrity-layer claim.',
  },
  {
    id: 'prostaglandin-no-systemic-action',
    claim:
      'In this model the prostaglandin-inhibition control acts only on the afferent arteriole’s shield: it leaves the arterial pressure, the cardiac output, the systemic resistance and the activation index exactly unchanged.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'A property of the code, chosen so that the kidney’s local protective mechanism can be examined on its own.',
    validation: 'integrity: prostaglandin inhibition acts only on the kidney',
    layer: LAYER.INTEGRITY,
    note:
      'A deliberate isolation, and **not** a claim that real non-steroidal anti-inflammatory drugs have no systemic effects. They do — sodium and water retention, effects on arterial pressure, haemodynamic AKI, acute interstitial nephritis — and the risk of AKI is raised by volume depletion, chronic kidney disease, heart failure and renal hypoperfusion as well as by cirrhosis. The scene’s copy says so.',
  },
  {
    id: 'splanchnic-vasoconstrictor-treatment',
    claim:
      'A splanchnic vasoconstrictor with albumin raises arterial pressure, reduces vasoconstrictor activation and can improve renal function in HRS-AKI. It acts on the circulation rather than on the kidney. It does not work in everyone: reported resolution is of the order of 40–50%.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Khemichian S, Nadim MK, Terrault NA, Annu Rev Med 2025;76:373–387 (DOI 10.1146/annurev-med-050223-112947); Nadim MK et al., J Hepatol 2024;81:163–183 (PMID 38527522).',
    validation: 'physiology: a splanchnic vasoconstrictor can raise arterial pressure and improve filtration',
    layer: LAYER.EXTERNAL,
    note:
      'The external assertion is that the treatment *can* do this, checked between an untreated state and a treated one — not that every step of a slider moves every read-out in one direction, which is not a clinical invariant. That the control acts through the circulation rather than editing the kidney is `treatment-acts-through-the-circulation`; that this slider is monotonic across its displayed range is `treatment-monotonicity`. The 40–50% response rate is carried by the copy and this entry, and the model does not reproduce it: every dose works here, every time.',
  },
  {
    id: 'treatment-acts-through-the-circulation',
    claim:
      'The treatment controls reach the kidney only through the arterial pressure and the activation index. Neither writes a renal resistance, a filtration coefficient or a filtration rate.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'A property of the code: the solved kidney is reproduced exactly by `solveKidney` on the pressure and the signal alone.',
    validation: 'integrity: the treatment control acts through the circulation rather than editing the kidney',
    layer: LAYER.INTEGRITY,
  },
  {
    id: 'treatment-monotonicity',
    claim:
      'Across the range this scene displays, raising the splanchnic vasoconstrictor raises arterial pressure, lowers the activation index and raises filtration at every step, and the raised cardiac output settles back.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. A property of the chosen effect size applied to a chosen slider range.',
    validation: 'calibration: the treatment slider improves pressure and filtration monotonically across its range',
    layer: LAYER.CALIBRATION,
    note:
      'Strict monotonicity across a whole slider is not a clinical invariant and must not be read as one. Reported resolution with a vasoconstrictor and albumin is of the order of 40–50%, and this model has no non-responders, no dose and no adverse effects in it.',
  },
  {
    id: 'cardiac-reserve',
    claim:
      'An impaired cardiac response to arterial vasodilation deepens the arterial underfilling and worsens renal perfusion. Cirrhotic cardiomyopathy is the clinical form of this.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Reviews of cirrhotic cardiomyopathy and its association with hepatorenal syndrome.',
    validation: 'physiology: an impaired cardiac response deepens the underfilling and lowers filtration',
    layer: LAYER.EXTERNAL,
    note:
      'Asserted between an intact cardiac response and an impaired one, not as strict monotonicity along the control — the direction is the supported part. `hyperdynamic-circulation` rests on the same test, because this direction is what remains external of it.',
  },

  // --- integrity -----------------------------------------------------------
  {
    id: 'pressure-flow-consistency',
    claim:
      'Every flow the model reports equals the pressure drop across the path it names divided by that path’s resistance, and the coupled solve reaches a consistent arterial pressure.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'ΔP = Q·R. Arithmetic.',
    validation: 'integrity: every reported flow equals the drop across its own path',
    layer: LAYER.INTEGRITY,
  },

  // --- approximations ------------------------------------------------------
  {
    id: 'mean-oncotic-pressure',
    claim:
      'This model uses a single mean glomerular oncotic pressure in place of the value that rises along the capillary as plasma is filtered.',
    confidence: CONFIDENCE.APPROXIMATION,
    source: 'A simplification of the Starling profile, chosen because the model’s subject is the arterioles rather than the capillary.',
    validation: 'calibration: the oncotic pressure is a constant and filtration equilibrium is not modelled',
    layer: LAYER.CALIBRATION,
    note:
      'Filtration pressure equilibrium — oncotic pressure rising far enough to stop filtration before the end of the capillary — cannot occur here. Where it matters in reality, this model will be wrong about it.',
  },
  {
    id: 'lumped-efferent',
    claim:
      'The efferent arteriole and the peritubular circulation are one resistance in this model.',
    confidence: CONFIDENCE.APPROXIMATION,
    source: 'A lumping chosen because nothing in the model moves the peritubular resistance independently.',
    validation: 'calibration: the efferent resistance is the whole path from glomerulus to renal vein',
    layer: LAYER.CALIBRATION,
    note:
      'It is adequate for setting the glomerular pressure and useless for anything about peritubular uptake, which the model does not have.',
  },
  {
    id: 'autoregulation-as-a-band',
    claim:
      'Autoregulation is represented as a range of afferent resistances the arteriole may take, not as a myogenic response and tubuloglomerular feedback.',
    confidence: CONFIDENCE.APPROXIMATION,
    source: 'A structural simplification; the model has no tubule and so cannot have tubuloglomerular feedback.',
    validation: 'calibration: autoregulation is a permitted resistance band with a chosen width',
    layer: LAYER.CALIBRATION,
    note:
      'It reproduces what autoregulation does and says nothing about how. The width of the band is illustrative, and where the lower limit falls is a consequence of that width.',
  },

  // --- calibration ---------------------------------------------------------
  {
    id: 'renal-reference-anchor',
    claim:
      'The afferent and efferent resistances and the ultrafiltration coefficient are derived from a healthy reference: renal blood flow 1100 mL/min, GFR 120 mL/min, glomerular pressure 50 mmHg, Bowman 12 mmHg, oncotic 28 mmHg.',
    confidence: CONFIDENCE.CALIBRATION,
    source: 'Textbook reference values, used as the target the resistances were calibrated to hit.',
    validation: 'calibration: the healthy kidney reproduces its reference flows and a filtration fraction near a fifth',
    layer: LAYER.CALIBRATION,
    note:
      'The reference values are textbook; the resistances are not measurements of a person’s arterioles and no such measurement exists.',
  },
  {
    id: 'systemic-reference-anchor',
    claim:
      'Systemic vascular resistance is derived from a reference mean arterial pressure of 90 mmHg and a cardiac output of 5 L/min, and the non-splanchnic conductance is whatever is left once the healthy splanchnic circulation has taken its share.',
    confidence: CONFIDENCE.CALIBRATION,
    source: 'Reference values, chosen so that a healthy liver in this model solves to a normal circulation.',
    validation: 'calibration: a healthy liver solves to the reference circulation it was anchored at',
    layer: LAYER.CALIBRATION,
    note:
      'It makes the healthy case exact by construction. It says nothing about how far from it any particular patient sits.',
  },
  {
    id: 'cardiac-compensation-exponent',
    claim:
      'Cardiac output is taken as the reference output times the resistance ratio raised to a fixed exponent, and cirrhotic cardiomyopathy lowers that exponent.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. An invented functional form with an invented exponent.',
    validation: 'calibration: the cardiac compensation exponent sets how far pressure falls for a given dilation',
    layer: LAYER.CALIBRATION,
    note:
      'It was chosen so that full vasodilation produces a cardiac output and an arterial pressure in the range described for advanced cirrhosis. It is not a cardiac model and there is no heart in it.',
  },
  {
    id: 'activation-curve',
    claim:
      'The vasoconstrictor index is a saturating function of the shortfall in perfusion pressure, half activated at a fixed fractional deficit.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. An invented curve over an invented index.',
    validation: 'calibration: the activation curve is a saturating function of the pressure deficit',
    layer: LAYER.CALIBRATION,
    note:
      'The index stands for renin, angiotensin, aldosterone, noradrenaline and vasopressin at once. It is not any of them, it has no units, and it must never be shown as a concentration.',
  },
  {
    id: 'vasodilation-split',
    claim:
      'The non-splanchnic beds are taken to dilate alongside the splanchnic ones, by a fixed fraction of their conductance at full vasodilation.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source for the split. Chosen because the splanchnic bed alone is too small a share of the circulation to move systemic resistance as far as it is observed to move.',
    validation: 'calibration: the systemic limb of the vasodilation sets how far resistance can fall',
    layer: LAYER.CALIBRATION,
    note:
      'That the vasodilation is not confined to the splanchnic bed is supported. How it divides between the beds is invented, and this constant is that invention.',
  },
  {
    id: 'constrictor-gains',
    claim:
      'How far the vasoconstrictor index shifts the afferent band, constricts the efferent arteriole, lowers the ultrafiltration coefficient, and how much of it the afferent shield absorbs, are four fixed gains.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No sources. Chosen so that the trajectory has the shape the literature describes — filtration defended, then failing — rather than to reproduce any measurement.',
    validation: 'calibration: the four constrictor gains produce a defended phase and then a failing one',
    layer: LAYER.CALIBRATION,
    note:
      'The ordering they encode — efferent before afferent, afferent shielded until late — is supported. The magnitudes are illustrative, and the severity at which the knee falls is a consequence of them and not a prediction.',
  },
  {
    id: 'treatment-effect-sizes',
    claim:
      'A full dose of the splanchnic vasoconstrictor reverses a fixed fraction of the vasodilation, and a full course of albumin raises cardiac output by a fixed fraction.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No sources for the magnitudes. Chosen so that the treatment arm is visible on the same axes as the disease.',
    validation: 'calibration: the treatment effect sizes are the ones this model was given',
    layer: LAYER.CALIBRATION,
    note:
      'That both treatments work through the circulation is supported. How much of the vasodilation a real dose reverses is not something this model knows, and no dose, duration or response rate may be read off it.',
  },

  // --- known weaknesses ----------------------------------------------------
  {
    id: 'early-hyperfiltration',
    claim:
      'At low vasoconstrictor activation this model raises glomerular filtration slightly above normal before it falls.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A consequence of efferent-predominant constriction acting while the afferent arteriole is still shielded. Glomerular hyperfiltration is described in compensated cirrhosis, but the model was not calibrated to it and its size here is not a prediction.',
    note:
      'It is reported rather than tuned away, because tuning it away would have meant weakening one of the two mechanisms that make the later trajectory right.',
  },
  {
    id: 'no-volume-ceiling',
    claim:
      'Volume expansion in this model has no ceiling: enough albumin drives cardiac output and arterial pressure above normal.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'There is no venous compliance, no pulmonary circulation and no Starling curve for the heart, so nothing limits preload.',
    note:
      'Over-expansion in a patient causes pulmonary oedema, and this model will cheerfully show it improving renal function instead. Nothing about dose may be read from it.',
  },
  {
    id: 'no-tubule',
    claim:
      'There is no tubule, so no sodium handling, no urine output, no ascites, no dilutional hyponatraemia, and no way to distinguish hepatorenal syndrome from prerenal azotaemia or acute tubular necrosis.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'A stated boundary of the model rather than a finding.',
    note:
      'The differential diagnosis is most of what makes the syndrome hard at the bedside, and this model cannot help with any of it. It answers one mechanistic question and stops.',
  },
]);

/** Every registry, for the tests and for anything that wants the whole picture. */
export const PULMONARY_EDEMA_EVIDENCE = defineEvidence('pulmonary-edema', [
  {
    id: 'starling-equation',
    claim:
      'Net transvascular water flux across the pulmonary capillary is the filtration coefficient times the difference between the hydrostatic gradient and the reflected oncotic gradient.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'The Starling principle; standard respiratory and microvascular physiology (Guyton & Hall; West).',
    validation: 'physiology: filtration follows the Starling terms, and only those',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'capillary-above-atrium',
    claim:
      'Pulmonary capillary hydrostatic pressure exceeds left atrial pressure by a flow-dependent amount, so raising cardiac output raises capillary pressure at an unchanged atrial pressure.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Pulmonary vascular pressure profile; the venous resistance downstream of the capillary is real and small.',
    validation: 'physiology: raising pulmonary blood flow floods a lung the same atrial pressure left dry',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'safety-factor',
    claim:
      'A lung tolerates a substantial rise in capillary pressure before alveolar flooding, because interstitial pressure rises from a subatmospheric value, lymphatic flow increases, and interstitial protein is washed down — three buffers that subtract from the driving gradient.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'The pulmonary oedema safety factor, conventionally quoted as roughly 20 mmHg above the normal capillary pressure (Guyton & Hall).',
    validation: 'physiology: three separate buffers hold water back, and removing any one lowers the threshold',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'interstitium-before-alveolus',
    claim:
      'Water accumulates in the peribronchovascular interstitium before it appears in alveoli, so interstitial oedema exists at pressures that produce no alveolar flooding and no shunt.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'The staged anatomy of pulmonary oedema; radiographic progression from septal lines to alveolar filling.',
    validation: 'physiology: the interstitium fills before any alveolus does',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'chronic-lymphatic-adaptation',
    claim:
      'A lung chronically exposed to a raised left atrial pressure tolerates a higher pressure before flooding than a previously normal lung, because lymphatic drainage adapts.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Long-standing mitral stenosis tolerating pressures that flood an unadapted lung; lymphatic recruitment and enlargement in chronic pulmonary venous hypertension.',
    validation: 'physiology: an adapted lung floods at a higher pressure than an unadapted one',
    layer: LAYER.EXTERNAL,
    note:
      'The direction is well described; the size of the adaptation this model uses is a calibration, and `lymphatic-capacity` says so.',
  },
  {
    id: 'permeability-defeats-oncotic-pressure',
    claim:
      'When the barrier stops reflecting protein, the oncotic term loses its power to hold water back, so oedema appears at a normal filling pressure and raising plasma protein no longer protects.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'The reflection coefficient in the Starling equation; the cardiogenic/non-cardiogenic distinction rests on it.',
    validation: 'physiology: raising plasma protein stops protecting a lung whose barrier has failed',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'interstitial-protein-tracks-plasma',
    claim:
      'Lowering plasma colloid osmotic pressure lowers interstitial colloid osmotic pressure with it, so most of the transcapillary oncotic gradient survives and hypoalbuminaemia alone is a weak cause of pulmonary oedema.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Protein permeability of the pulmonary capillary and the observed weakness of hypoalbuminaemia as an isolated cause of pulmonary oedema.',
    validation: 'physiology: low plasma protein alone does not flood a lung',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'flooded-alveolus-is-a-shunt',
    claim:
      'A flooded alveolus is perfused and not ventilated, so it behaves as a shunt: the alveolar-to-arterial oxygen difference widens with inspired oxygen while the arterial tension barely responds.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'The definition of shunt; the shunt equation and its characteristic refractoriness to inspired oxygen.',
    validation: 'physiology: oxygen widens the A–a difference in a shunt instead of closing it',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'filtration-coefficient',
    claim:
      'The filtration coefficient is set so that a reference lung at a normal capillary pressure filters at the lymph flow a normal lung is observed to carry.',
    confidence: CONFIDENCE.CALIBRATION,
    source: 'Calibrated to a baseline pulmonary lymph flow of roughly 20 mL/h and a net filtration pressure of about 1 mmHg.',
    validation: 'calibration: a normal lung filters at its lymph flow and gains no water',
    layer: LAYER.CALIBRATION,
    note:
      'Not a measured Kf. Published pulmonary filtration coefficients vary by an order of magnitude with method and species; this value is a consequence of the baseline this model was asked to reproduce.',
  },
  {
    id: 'flooding-threshold',
    claim:
      'An unadapted lung in this model begins to flood alveoli at a left atrial pressure in the mid-twenties mmHg.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'Calibrated against the conventional teaching that alveolar oedema appears above a wedge pressure of about 25 mmHg in a previously normal lung.',
    validation: 'calibration: an unadapted lung floods where the textbooks put the threshold',
    layer: LAYER.CALIBRATION,
    note:
      'The threshold is not stored anywhere; it is searched for. What is calibrated are the constants that place it, and a person\u2019s threshold is not this number.',
  },
  {
    id: 'lymphatic-capacity',
    claim: 'How far lymphatic clearance can rise, acutely and after chronic adaptation, as multiples of the baseline flow.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No single source gives these multiples for a human lung.',
    validation: 'calibration: the lymphatic ceilings place the two thresholds where the model claims',
    layer: LAYER.CALIBRATION,
    note:
      'Invented magnitudes. The model claims only the ordering — an adapted lung tolerates more — and never that a particular patient\u2019s lymphatics can carry a particular number of millilitres.',
  },
  {
    id: 'interstitial-compliance',
    claim: 'The shape of the interstitial pressure–volume curve, and how much water the interstitium holds before alveoli fill.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No human measurement of this curve was used.',
    validation: 'calibration: the interstitium fills across a clinically recognisable range of lung water',
    layer: LAYER.CALIBRATION,
    note:
      'Chosen so that the reported extravascular lung water spans the range a thermodilution monitor reports \u2014 about 5 mL/kg dry and about 10 mL/kg at the onset of oedema. The curve itself is invented.',
  },
  {
    id: 'hypoxic-diversion',
    claim: 'How much of the perfusion to a flooded region hypoxic pulmonary vasoconstriction turns away.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'The reflex is well described; its magnitude in flooded lung is not settled and varies widely between people.',
    validation: 'calibration: diversion reduces the shunt without abolishing it',
    layer: LAYER.CALIBRATION,
    note:
      'An invented fraction, chosen so that diversion reduces the shunt without abolishing it. It stands in for a reflex that is regional, time-dependent and blunted by several common drugs.',
  },
  {
    id: 'no-ventilation',
    claim:
      'The model has no ventilation, no respiratory rate and no carbon dioxide, so it cannot say how hard someone is breathing or whether they are tiring.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'A scope decision, not a finding.',
    layer: LAYER.INTEGRITY,
    note:
      'Breathlessness is the symptom this disease presents with and this model does not produce it. Anything the scene says about effort would not be coming from here.',
  },
  {
    id: 'no-gravity',
    claim: 'Filtration is uniform across the lung: there is no gravitational gradient and no regional distribution.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'A scope decision, not a finding.',
    layer: LAYER.INTEGRITY,
    note:
      'Real oedema is basal and the radiograph is read on that distribution. A reader who takes the even filling drawn here as the shape oedema takes has been misled by the picture rather than by the numbers.',
  },
]);

/** @see src/models/pneumonia.js, docs/model-evidence/pneumonia.md */
/**
 * Biliary obstruction — a model whose whole content is an ordering.
 *
 * Almost nothing here is a measurement. What the scene asserts is topology and
 * two pieces of physiology on top of it: that a secretion working against a
 * back-pressure gives way, and that pressure at a point is the flow times the
 * resistance still downstream. Everything else — which site affects what — is
 * arithmetic once the order of the segments is accepted.
 *
 * The order is therefore the only thing that has to be right, and it is the one
 * claim with a real external source: standard surgical and radiological anatomy
 * of the extrahepatic biliary tree.
 */
/**
 * Achalasia — two failures, and a column that takes over the pushing.
 *
 * The external claims here are about what a swallow needs and what a standing
 * column is worth. What this repository chose is the conductance across the
 * ring and the cross-section that column stands in, and — separately from the
 * model — the mapping from the scene's axis onto the two failures.
 */
export const ACHALASIA_EVIDENCE = defineEvidence('achalasia', [
  {
    id: 'swallow-needs-both',
    claim:
      'A swallow arriving in the stomach needs two things: a peristaltic wave to carry it down, and a lower oesophageal sphincter that relaxes as it arrives. Losing either costs something; losing both is the picture achalasia is named for.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard gastrointestinal physiology of deglutition, and standard descriptions of achalasia as the loss of both swallow-induced sphincter relaxation and oesophageal peristalsis.',
    validation: 'physiology: a swallow gets through when the wave outpushes the ring, and not otherwise',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'relaxation-opens-as-well-as-lowers',
    claim:
      'A sphincter that relaxes is a wider way through as well as a lower pressure to beat, so a bolus can fall through a relaxed one on very little driving pressure.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Standard physiology of sphincter relaxation. The direction is textbook; how much of the conductance the model gives back with relaxation is a calibration here.',
    validation: 'physiology: a swallow gets through when the wave outpushes the ring, and not otherwise',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'column-supplies-pressure',
    claim:
      'A column of retained fluid weighs on what is below it, so a retained oesophagus is not simply an accumulating one: what collects supplies pressure of its own and the system settles where that makes up the difference.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Hydrostatics. A column of height h exerts ρgh at its base.',
    validation: 'physiology: what is retained supplies pressure of its own',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'column-has-a-ceiling',
    claim:
      'That balance has a limit set by the organ: a column the height of the whole oesophagus is worth roughly sixteen millimetres of mercury, which is less than the sphincter holds at rest. Past a point no balance exists inside the oesophagus at all.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Hydrostatics again, against a textbook resting sphincter tone of some tens of millimetres of mercury. 22 cm of water is about 16 mmHg.',
    validation: 'physiology: the column cannot be taller than the organ, so the balance has a limit',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'feeble-wave-stops-travelling',
    claim:
      'A failing peristaltic wave is not a vigorous one turned down. It stops propagating, so nothing arrives at the sphincter — a different picture from a gentle push, and the one a reader has to recognise.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Standard descriptions of failed and fragmented peristalsis, in which the wave does not traverse the oesophageal body. How far a given vigour reaches is this model\u2019s own shape.',
    validation: 'physiology: a feeble wave stops travelling rather than pushing gently',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'swallow-conductance',
    claim:
      'What the sphincter passes per millimetre of mercury during the window it is open, and how much of that is left when it does not let go at all.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'A calibration this repository chose, not a measurement: the values were calibrated so that a normal swallow clears with room to spare and a failed one balances inside a human oesophagus.',
    note:
      'Not a measurement of a sphincter, an aperture or anybody. Nothing the model reports is an integrated relaxation pressure or any manometric value, and no figure in it is a threshold.',
    validation: 'calibration: a normal swallow clears and a failed one balances inside the organ',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'column-cross-section',
    claim:
      'The cross-section a retained column is taken to stand in, which turns a volume into a height and therefore into a pressure.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'Chosen by this repository so that the capacity of the model oesophagus is a plausible retained volume. It is a single number standing for a tube that in reality dilates as it fills.',
    note:
      'An illustrative cross-section. The oesophagus on screen widening is a volume the model solved, not a calibre it computed, and no diameter follows from anything here.',
    validation: 'calibration: a normal swallow clears and a failed one balances inside the organ',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'axis-moves-both',
    claim:
      'The scene\u2019s axis moves the two failures together, through a deliberately non-linear mapping that puts the band in which a column can still balance a swallow across the middle of its travel.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A presentation decision, not a finding. One loss produces both failures, but in a person they do not move in step, and this model has no time in it to move them through.',
    note:
      'The direction this scene is known to mislead. A reader dragging the axis is not watching a patient progress and is not watching the two failures in any real proportion; each is a control of its own precisely so that the pairing can be taken apart.',
    layer: LAYER.EXTERNAL,
  },
]);

export const BILIARY_EVIDENCE = defineEvidence('biliary-obstruction', [
  {
    id: 'segment-order',
    claim:
      'Right and left hepatic ducts join to form the common hepatic duct; the cystic duct joins that to form the common bile duct; the common bile duct meets the main pancreatic duct at the major duodenal papilla. The gallbladder opens off the tree through the cystic duct and is not on the path from liver to duodenum.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Standard surgical and radiological anatomy of the extrahepatic biliary tree.',
    validation:
      'physiology: a blockage off the bile path does not reduce what reaches the gut',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'pressure-is-downstream-resistance',
    claim:
      'In a series path at steady flow, the pressure at a point is the flow times the resistance still downstream of it. A resistance inserted at one point therefore pressurises every point above it and no point below it.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Hydraulics. ΔP = Q·R, applied to a path in series.',
    validation:
      'physiology: a blockage on the bile path raises the pressure above it and not below it',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'shared-sphincter',
    claim:
      'The sphincter at the papilla is the only resistance the biliary and pancreatic paths have in common, so it is the only site at which one blockage obstructs both.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Standard anatomy of the hepatopancreatic ampulla. Where the two ducts open separately — one of several described arrangements — this does not hold, and the model card says so.',
    validation: 'physiology: only a blockage at the shared sphincter reaches the pancreatic duct',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'secretory-pressure-ceiling',
    claim:
      'Hepatic bile secretion is not a pump: it falls as the pressure in the ducts rises and ceases at a maximum secretory pressure of a few tens of centimetres of water. A complete obstruction therefore produces a bounded pressure and a flow approaching zero.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Standard biliary physiology for continuous secretion and for a maximum biliary secretory pressure in the region of twenty-five to thirty centimetres of water. The direction and the existence of a ceiling are textbook; the exact value is a calibration here.',
    validation: 'physiology: secretion gives way against pressure, so a complete blockage is bounded',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'gallbladder-time-constant',
    claim:
      'Whether a gallbladder keeps up with the duct beside it is a question about the cystic duct\u2019s resistance times the gallbladder\u2019s compliance, against the time a meal takes — not about an equilibrium, which any finite resistance eventually reaches.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'The time constant of a compliant reservoir behind a resistance, τ = R·C. The same relation the obstructed-lung model is built on.',
    validation: 'physiology: a gallbladder keeps up with the duct on a time constant, not on an equilibrium',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'common-channel-assumption',
    claim:
      'This model gives the common bile duct and the main pancreatic duct a shared channel at the papilla, so that an ampullary blockage obstructs both. That arrangement is one of several described; where the two open separately it does not hold.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'Descriptions of the hepatopancreatic ampulla differ, and the proportion of people with a true common channel is reported variously. This model assumes one and cannot represent the alternative.',
    note:
      'The direction this model is known to get wrong. Its ampullary case is right for a common channel and wrong for a separate opening, and it has no way to be told which it is looking at.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'schematic-tree',
    claim:
      'The tree this scene is drawn on is schematic. Its calibres, lengths and angles are chosen to be legible, and the model asserts the order of the segments rather than their sizes.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'The biliary atlas\u2019s own builder, used here as it stands. Its header says PROTOTYPE — NOT ANATOMICALLY VALIDATED.',
    note:
      'An illustrative geometry. Nothing on screen is a duct diameter, a duct length or a measurement of anybody, and a dilated segment is a pressure the model solved rather than a calibre it computed.',
    validation: 'calibration: the open biliary tree lands on an ordinary resting pressure',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'duct-resistances',
    claim:
      'The four resistances are the numbers that put an unobstructed common bile duct near ten centimetres of water at an ordinary bile flow, with nearly all of the normal resistance in the sphincter.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'A calibration this repository chose, not a measurement: the four values were calibrated so that an unobstructed common bile duct lands near ten centimetres of water at an ordinary bile flow.',
    note:
      'Not a measurement of a duct, of a sphincter or of anybody. No pressure this model reports is a threshold, and the only thing the values are chosen to reproduce is an ordinary resting state.',
    validation: 'calibration: the open biliary tree lands on an ordinary resting pressure',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'occlusion-resistance',
    claim:
      'What a complete blockage adds to a resistance is one number used at every site, so that "complete" means the same thing wherever the blockage is.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'A calibration this repository chose so that a complete blockage delivers almost nothing through the resistance it sits in. Added rather than multiplied precisely so that it is site-independent.',
    note:
      'Not a stone, not a stricture and not a degree of stenosis. It says how much resistance a complete blockage stands for in this model, and nothing about what produced one.',
    validation: 'calibration: one occlusion resistance means the same thing at every site',
    layer: LAYER.CALIBRATION,
  },
]);

export const PNEUMONIA_EVIDENCE = defineEvidence('pneumonia-consolidation', [
  {
    id: 'shunt-definition',
    claim:
      'Blood that perfuses lung receiving no ventilation is intrapulmonary shunt; gas that ventilates lung receiving no perfusion is dead space. The two are the opposite ends of regional V/Q mismatch.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Definition of shunt and dead space; Slobod et al., Annals of Intensive Care 2022 (open full text), for the regional distinction; West, Respiratory Physiology.',
    validation:
      'physiology: perfusing lung that receives no ventilation is shunt, and hypoxic vasoconstriction reduces it without abolishing it',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'consolidation-removes-ventilation',
    claim:
      'Alveolar consolidation replaces air with inflammatory fluid and cells, removing regional ventilation while perfusion of the region may persist.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Slobod et al. 2022, above; standard descriptions of lobar and bronchopneumonic consolidation.',
    validation:
      'physiology: consolidation removes ventilation without removing perfusion, so the shunt grows with the consolidated share',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'hpv-partial-diversion',
    claim:
      'Hypoxic pulmonary vasoconstriction diverts blood away from poorly ventilated lung, reducing the shunt, but does not abolish perfusion of consolidated lung.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Slobod et al. 2022, above; the direction is textbook, the magnitude in pneumonia is variable and is not claimed here.',
    validation:
      'physiology: perfusing lung that receives no ventilation is shunt, and hypoxic vasoconstriction reduces it without abolishing it',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'twelve-equal-units',
    claim: 'The lung is twelve equal regional units, six a side, at the sample sites `buildLungs()` provides.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. Chosen so the spatial mismatch can be seen; the count matches the other respiratory scenes.',
    note:
      'Not acini, not the eighteen named bronchopulmonary segments the same organ builder carries, and not a radiographic distribution. Equal units hide lobar, segmental and gravitational variation.',
  },
  {
    id: 'consolidation-order',
    claim: 'Consolidation spreads through the units in one fixed, clustered, lower-lung-first order.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. Invented so adjacent units consolidate together and the shunt is visible as a region rather than as scattered points.',
    note: 'Real pneumonia can be lobar, bronchopneumonic, multifocal or diffuse. The order is a legibility choice and claims nothing about natural history.',
  },
  {
    id: 'hpv-gain',
    claim: 'At full hypoxic vasoconstriction a fully consolidated unit keeps 28% of its conductance (gain 0.72).',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. The gain was invented so diversion is visible and the shunt survives it; the default HPV strength (0.55) is likewise chosen.',
    note: 'Not a measured vascular response. Regional HPV in pneumonia is heterogeneous and can be blunted by inflammation.',
  },
  {
    id: 'teaching-range',
    claim: 'The public progression axis consolidates at most 60% of this conceptual lung; the solver domain remains 0–1.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'A scope decision, chosen so the slider ends before the lung loses its aerated share. Total consolidation is kept as a boundary condition for tests only.',
    note: 'Not a severity threshold and not a survivable-fraction claim. 60% is where the teaching axis stops, nothing more.',
  },
  {
    id: 'uniform-perfusion-within-unit',
    claim: 'Perfusion is uniform within a regional unit, so its consolidated share receives perfusion in proportion to its size.',
    confidence: CONFIDENCE.APPROXIMATION,
    source: 'A modelling convenience: the shunt expression reads each unit as an aerated and a consolidated subfraction under one conductance.',
    note: 'Real consolidation redistributes flow within the region as well as away from it. The model claims the direction of the shunt, never its size.',
  },
  {
    id: 'no-oxygenation',
    claim: 'The model shunt fraction is a fraction of model perfusion; it is not a clinical shunt, a PaO2 or an SpO2.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'A scope decision, not a finding.',
    note:
      'There is no gas content, no mixed venous saturation and no dissociation curve here, so nothing the scene shows can be read as arterial oxygenation or as a response to oxygen.',
  },
  {
    id: 'no-mechanics-or-time',
    claim: 'There is no pathogen, immune response, secretion, compliance, work of breathing or time course.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'A scope decision, not a finding.',
    note:
      'The slider is a spatial teaching axis, not days of illness. Pneumonia presents with cough, fever and breathlessness, none of which this model can produce.',
  },
]);

/** @see src/models/pulmonaryEmbolism.js, docs/model-evidence/pulmonary-embolism.md */
export const PULMONARY_EMBOLISM_EVIDENCE = defineEvidence('pulmonary-embolism', [
  {
    id: 'dead-space-definition',
    claim:
      'Gas that ventilates lung receiving no perfusion is alveolar dead space; the ventilated-but-unperfused lung of embolism is the opposite end of V/Q mismatch from the perfused-but-unventilated lung of consolidation.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Definition of alveolar dead space; Robertson, European Respiratory Journal 2015 (dead-space review); West.',
    validation:
      'physiology: obstructing a pulmonary vessel leaves the ventilation it served in place, which is dead space rather than shunt',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'obstruction-spares-ventilation',
    claim:
      'Pulmonary vascular obstruction removes distal perfusion without mechanically stopping ventilation of the territory it served.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Goldhaber & Elliott, Circulation 2003; Robertson 2015, above. Reflex bronchoconstriction and later redistribution exist and are omitted.',
    validation:
      'physiology: obstructing a pulmonary vessel leaves the ventilation it served in place, which is dead space rather than shunt',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'parallel-conductance-raises-resistance',
    claim:
      'Vascular paths in parallel add as conductances, so removing paths at one driving pressure raises total resistance as the reciprocal of the remaining conductance — faster than the share removed.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Resistances in parallel; ESC/ERS 2019 acute pulmonary embolism guideline for loss of cross-sectional area raising pulmonary vascular resistance.',
    validation: 'physiology: removing parallel vascular conductance raises resistance, and faster than the share removed',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'twelve-equal-territories',
    claim: 'The pulmonary vascular bed is twelve equal parallel territories, one per regional unit of `buildLungs()`.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. Chosen so a clot, a branch and the ventilated bed it feeds can be pointed at; the count matches the other respiratory scenes.',
    note: 'Not a pulmonary arterial tree, not the named segmental arteries `lungs.js` carries, and not readable as CT clot burden.',
  },
  {
    id: 'obstruction-order',
    claim: 'Obstruction involves the territories in one fixed order, right side first.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. Invented as a stable visual ordering.',
    note: 'Claims nothing about which lobes emboli favour, or about central versus peripheral clot.',
  },
  {
    id: 'fixed-driving-pressure',
    claim: 'The network is evaluated at one fixed model driving pressure, so perfusion of a territory equals its remaining conductance.',
    confidence: CONFIDENCE.APPROXIMATION,
    source: "Ohm's-law network at constant pressure, used for a relative statement only.",
    note:
      'In a real embolism pressure rises, cardiac output may fall, and open territories recruit and distend. The relative PVR shown is the inverse conductance of this fixed-pressure network, not a measured PVR.',
  },
  {
    id: 'obstruction-cap',
    claim: 'The teaching axis obstructs at most 65% of the modelled territories, leaving a third of the conductance open at full travel.',
    confidence: CONFIDENCE.CALIBRATION,
    source: 'A scope decision, chosen so the axis ends short of total obstruction while individual paths can still occlude completely.',
    note: 'Not a survivable clot burden and not a severity threshold. It is where the slider stops.',
  },
  {
    id: 'rv-afterload-not-modelled',
    claim: 'The scene reads a rising relative PVR as rising right-ventricular afterload; the model contains no right ventricle.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'ESC/ERS 2019 for the direction; nothing here for what the ventricle does with it.',
    note:
      'RV dilatation, RV–pulmonary artery uncoupling, hypotension and shock cannot emerge from this model. The direction of the load is shown; the response to it is not.',
  },
  {
    id: 'no-haemodynamics',
    claim: 'There is no pulmonary artery pressure, no cardiac output, no vascular recruitment and no vasoactive response.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'A scope decision, not a finding.',
    note: 'The percentages and the relative PVR are network indices. None of them is a pressure, a flow or a risk category.',
  },
  {
    id: 'no-gas-content',
    claim: 'There is no carbon dioxide and no gas content, so the underperfused-ventilation index is not a clinical VD/VT.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'A scope decision, not a finding.',
    note: 'Clinical dead space is measured from expired CO2 against arterial CO2. The index here counts ventilated territories that lost perfusion and nothing else.',
  },
]);

export const PROSTATIC_ENLARGEMENT_EVIDENCE = defineEvidence('benign-prostatic-enlargement', [
  {
    id: 'arises-in-the-transition-zone',
    claim:
      'Benign prostatic enlargement arises in the transition zone — the small periurethral part of the gland — and not in the peripheral zone, which is most of the glandular tissue and the part a rectal examination reaches. The gland does not enlarge uniformly.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'McNeal’s zonal anatomy of the prostate, and the standard urological description of benign prostatic hyperplasia as a transition-zone process.',
    validation: 'physiology: what enlarges is the transition zone, and nothing is added to the peripheral zone',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'peripheral-zone-is-displaced-not-lost',
    claim:
      'The peripheral zone is not consumed by the enlargement. It is displaced outward and compressed into a rim — the plane a surgeon enucleates against — so it is thinner while containing the tissue it always had.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard urological and pathological descriptions of the compressed peripheral zone as the surgical capsule, and of enucleation proceeding in that plane.',
    validation: 'physiology: the rim thins while the tissue in it is conserved',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-gland-grows-less-than-the-zone',
    claim:
      'Because the transition zone is a small share of the gland and volumes add, a several-fold transition zone is a much more modest gland: ten times the zone is under twice the organ. The proportion between the two is arithmetic, not an observation.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Arithmetic of additive volumes, applied to the zonal division above. V(gland) = V(inner) + V(peripheral), with the peripheral term unchanged.',
    validation: 'physiology: several times the zone is a fraction more gland',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'median-lobe-acts-at-the-neck',
    claim:
      'Where the enlarged tissue sits changes what it is next to. Lateral-lobe growth surrounds the prostatic urethra along its length; a median lobe projects into the bladder neck instead, so the same amount of tissue narrows a different place.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Standard urological descriptions of lateral-lobe and median-lobe patterns of benign prostatic enlargement. The direction is textbook; how much narrowing either produces is not claimed here.',
    validation: 'physiology: the same tissue in two arrangements narrows different places',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'zone-display-proportions',
    claim:
      'The resting share each zone takes of the model gland, from which every ratio the scene reports is computed.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'The anatomy atlas’s display proportions, chosen there so four zones can be told apart on screen rather than to anatomical scale. In a real prostate the peripheral zone is roughly seventy per cent of the glandular tissue and the transition zone a few per cent.',
    note:
      'An illustrative starting geometry, not a measurement. Because the scene is drawn on the atlas the two have to agree, so the ratios inherit the atlas’s legibility choice. **No prostate volume, and no zone volume, may be read off this model.**',
    validation: 'calibration: the prostatic enlargement model starts from the atlas’s own zone proportions',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'lumen-compression',
    claim:
      'How much of the channel through the gland is left per unit of transition-zone growth, and therefore how quickly the scene narrows it.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'A calibration this repository chose, not a derivation: the value was chosen so that the channel is visibly narrowed across the span of growth the scene walks, without closing. This model has no tissue mechanics in it and cannot work out how a lumen deforms when the tissue around it grows.',
    note:
      'A calibration, and an assumed relation on top of it. What the model reports is a fraction of its own unenlarged channel — never a urethral calibre, never a flow rate, never a post-void residual, and never a threshold.',
    validation: 'calibration: the channel narrows visibly across the walk without closing',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'growth-axis-is-not-a-course',
    claim:
      'The scene’s axis runs from a resting gland to an enlarged one, and a reader will take that travel for a course over time.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A presentation decision, not a finding. This model has no time in it: the axis is how far into an enlarged gland the reader has gone, and nothing in the model says a gland passes through those arrangements in that order or at any rate.',
    note:
      'The direction this scene is known to mislead. Neither end of the axis is a grade, neither is a severity, and no position on it corresponds to a symptom, a score or an indication for anything.',
    layer: LAYER.EXTERNAL,
  },
]);

export const BOWEL_OBSTRUCTION_EVIDENCE = defineEvidence('bowel-obstruction', [
  {
    id: 'divides-the-path',
    claim:
      'The gut is one path in series, so a mechanical blockage divides it in two: the bowel above it keeps receiving and cannot pass anything on, and the bowel below it receives nothing and collapses. The place the picture changes is the transition point, and it is what identifies the level of the blockage.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard surgical descriptions of mechanical bowel obstruction: dilatation proximal to the point, collapse distal to it, the transition point as the radiological and operative landmark.',
    validation: 'physiology: a blockage fills what is above it and empties what is below it',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'site-decides-how-much-is-above',
    claim:
      'How far the bowel above a blockage distends depends on how much bowel there is above it, because the same delivered volume spread over a shorter length has to go further into each part of it. A high blockage therefore distends a short length a great deal and leaves most of the gut empty; a low one distends much more bowel, less.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Conservation of volume applied to the series path above. The clinical counterpart — proximal obstruction with little visible distension, distal obstruction with a great deal — is a standard description.',
    validation: 'physiology: the same amount over a shorter length distends it further',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'closed-loop-at-a-competent-valve',
    claim:
      'An ileocaecal valve that holds turns a colonic obstruction into a segment shut at both ends: nothing can decompress back into the ileum, so the colon between the valve and the blockage takes all of it and distends much further than it would with the small bowel sharing.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Standard descriptions of closed-loop large bowel obstruction with a competent ileocaecal valve. The direction is textbook; how competent a given valve is, and for how long, is not something this model claims.',
    validation: 'physiology: a valve that holds shuts a colonic blockage in at both ends',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'laplace-favours-the-widest',
    claim:
      'Wall tension follows calibre as well as distending pressure: T = P·r for a cylinder. So at one pressure it is the widest part of the distended bowel whose wall carries the most — in the large bowel the caecum, which is neither the blockage nor next to it.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Laplace’s law for a cylinder, and the standard description of the caecum as the segment that distends most in large bowel obstruction.',
    validation: 'physiology: at one pressure the widest distended part carries the most wall tension',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'drawn-proportions',
    claim:
      'The length and calibre each named stretch of gut has in the model, from which every ratio the scene reports is computed.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'The intestinal atlas’s drawn proportions, measured off its own curves and chosen there to be legible rather than to scale. In a person the small bowel is several times the length of the colon and much narrower than these make it.',
    note:
      'Illustrative proportions, not anatomy. What the model claims is the *ordering* — that the caecum is the widest part of the large bowel and the sigmoid the narrowest — and not the ratios. No length, calibre or volume here may be read as a measurement.',
    validation: 'calibration: the bowel obstruction model is measured off the atlas’s own gut',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'retained-load',
    claim:
      'How much the gut delivers into the obstructed length, as a multiple of the whole gut’s resting luminal volume, and therefore how far the bowel above a blockage is drawn distended.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'A calibration this repository chose: the value was calibrated so that a complete blockage distends the bowel above it visibly at every one of the four sites and never past about twice its resting calibre.',
    note:
      'A calibration, not a secretion. Nothing in the model is millilitres, and the distension it produces is a ratio against the model’s own resting calibre rather than a diameter anyone could measure.',
    validation: 'calibration: a complete blockage distends the bowel visibly at every site without doubling it',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'same-load-at-every-site',
    claim:
      'The model takes the same amount to arrive above the blockage wherever the blockage is, on the grounds that most of what fills an obstructed bowel enters above the duodenum.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A simplification, and the figure is this repository’s. Secretion, absorption and how much any of it varies with the level of the blockage are all outside the model.',
    note:
      'It is why the wall tension index may not be compared between two scenarios: the number is built on a retained load this repository chose and a single distending pressure. What it supports is comparing segments inside one picture, which is what the read-out reports.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'held-bowel-stays-resting',
    claim:
      'Small bowel held back by a competent valve is drawn at its resting calibre and stays there for as long as the reader looks at it.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A consequence of having no time in the model. In a person a valve does not hold indefinitely and the bowel above it does not stay at rest; what happens next is a sequence, and this model has no sequence in it.',
    note:
      'The direction this scene is known to mislead. A resting small bowel on screen is the model saying the volume has not reached it, not a claim that it never will.',
    layer: LAYER.EXTERNAL,
  },
]);

export const UTERINE_FIBROID_EVIDENCE = defineEvidence('uterine-fibroid', [
  {
    id: 'three-locations-not-three-stages',
    claim:
      'Submucosal, intramural and subserosal name three depths in the uterine wall, not three stages of one thing. A fibroid does not travel from one to the next, and the classification is where it sits rather than how far it has got.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard gynaecological descriptions of leiomyoma location, in which the three names are positions in the myometrium relative to the endometrium and the serosa.',
    validation: 'physiology: where it sits is a choice, and moving the size does not change it',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'volume-is-the-same-everywhere',
    claim:
      'A fibroid of a given size adds the same volume to the uterus wherever in the wall it sits, so the size of the uterus says nothing about what the fibroid is against.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Arithmetic of additive volumes. A sphere of radius r has the volume (4/3)πr³ at any depth in a wall.',
    validation: 'physiology: the same size is the same uterine volume at every depth',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-middle-reaches-nothing-then-both',
    claim:
      'A fibroid in the middle of the wall reaches neither boundary until its diameter approaches the depth of the wall, and then it reaches the cavity and the serosa in the same moment. One just under either boundary is against that boundary from the smallest size upward and never reaches the other.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Solid geometry: a sphere of radius r centred at depth d crosses a plane when r > d. Applied to the two surfaces of one wall.',
    validation: 'physiology: the middle of the wall is the one place that reaches nothing',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-cavity-is-a-plane',
    claim:
      'The uterine cavity is a flattened triangular space rather than a bag, so what a fibroid does to it is to press into a surface, and how much of that surface it takes is what "distorting the cavity" means geometrically.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Standard descriptions of the uterine cavity as a flattened triangle between the two tubal ostia and the internal os, which is the shape every intrauterine procedure is read against. That the contact is worth measuring as an area share is this model’s framing.',
    validation: 'physiology: what presses into the cavity is measured as a share of a surface',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'atlas-proportions',
    claim:
      'The depth of the wall, the area of the cavity and the volume of the organ, from which every ratio the scene reports is computed.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'Measured off this repository’s uterine atlas, whose own proportions are drawn to be legible rather than to scale. The atlas also draws the uterus upright, where a uterus is normally tipped and bent forward.',
    note:
      'An illustrative organ, not a measured one. No centimetre, no millilitre and no volume here is a measurement of anybody, and no size in it is a size at which anything is indicated.',
    validation: 'calibration: the fibroid model is measured off the atlas’s own uterus',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'three-chosen-depths',
    claim:
      'The depth in the wall each of the three names is taken to mean: just under the cavity, in the middle, just under the serosa.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'Three fractions this repository chose, calibrated so that each name behaves the way it is described: the shallow one is against the cavity across the whole range, the deep one against the serosa across the whole range, and the middle one crosses from reaching nothing to reaching both inside it.',
    note:
      'A calibration of three names, not a measurement of three fibroids. Real fibroids sit anywhere in the wall, including on a stalk, and the boundaries between the three names are not sharp.',
    validation: 'calibration: each of the three names behaves the way its description says',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'nothing-follows-about-symptoms',
    claim:
      'Nothing in this model says what a fibroid causes. Bleeding, pain, pressure and fertility are outside it entirely, and no figure in it is a symptom, a score or a probability of one.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision, and the reason the scene is about location: what a fibroid produces does not follow from its size in any simple way, and this model has nothing in it that could make it follow.',
    note:
      'A reader watching a share of the cavity rise is watching a shape cross a surface. The relation between that and anything a person notices is not in this model, and none of the standard names is a prediction.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'one-fibroid-and-a-rigid-wall',
    claim:
      'There is exactly one fibroid, and the uterus around it keeps the shape the atlas gave it.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'Two simplifications. Most uteruses that have fibroids have several, and a real uterus takes the shape of what is inside it — which needs tissue mechanics this model does not have.',
    note:
      'The direction this scene is known to mislead. The bulge on screen is the fibroid itself standing past the surface, not a deformed organ, and the wall is not thinned or stretched anywhere.',
    layer: LAYER.EXTERNAL,
  },
]);

export const EVIDENCE_REGISTRIES = [
  CIRCULATION_EVIDENCE,
  COPD_EVIDENCE,
  ASTHMA_EVIDENCE,
  PORTAL_EVIDENCE,
  HEPATORENAL_EVIDENCE,
  PULMONARY_EDEMA_EVIDENCE,
  PNEUMONIA_EVIDENCE,
  PULMONARY_EMBOLISM_EVIDENCE,
  BILIARY_EVIDENCE,
  ACHALASIA_EVIDENCE,
  PROSTATIC_ENLARGEMENT_EVIDENCE,
  BOWEL_OBSTRUCTION_EVIDENCE,
  UTERINE_FIBROID_EVIDENCE,
];
