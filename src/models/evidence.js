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

/** Every registry, for the tests and for anything that wants the whole picture. */
export const EVIDENCE_REGISTRIES = [COPD_EVIDENCE, ASTHMA_EVIDENCE, PORTAL_EVIDENCE];
