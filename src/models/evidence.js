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
/**
 * How far a source was checked, which is not the same as how strong it is.
 *
 * A citation that was matched against a bibliographic record is not a paper
 * that was read, and neither is a search result that quoted an abstract. The
 * distinction exists because this repository cannot reach the medical
 * publishers from its build environment: every attempt at a publisher domain
 * is refused by the network policy, so `FULL_TEXT` is a value nothing here can
 * honestly claim today, and a registry that had no way to say so would end up
 * claiming it by default.
 */
/**
 * How far a source was actually checked. Not how good the claim is.
 *
 * Six of these are degrees of the same thing and two are not, and the reason
 * there are this many is that a coarser set let a weaker check be recorded as a
 * stronger one. "The search engine's summary said so" and "the abstract says
 * so" were both `abstract-only` until this list grew: the first is a third
 * party's paraphrase, and this build environment cannot reach the medical
 * publishers, so it is usually the most that was available.
 *
 * Ordered from strongest to weakest, and the ordering is the point: a registry
 * entry may never be moved up it by anything short of somebody reading the
 * thing it names.
 */
export const VERIFICATION = {
  /** The passage supporting this claim was read in the body of the paper. */
  PASSAGE: 'body-passage',
  /** The paper itself was read, including its tables and figures. */
  FULL_TEXT: 'full-text',
  /**
   * The full text was retrieved and the passage this claim rests on was not
   * located in it. Stronger than an abstract for the paper's existence and
   * weaker than {@link PASSAGE} for the claim.
   */
  FULL_TEXT_PASSAGE_UNCHECKED: 'full-text-passage-unchecked',
  /** The publisher's or PubMed's own abstract was read. */
  ABSTRACT: 'abstract-only',
  /**
   * The content is known through a review, a reading list or correspondence
   * that quotes it — including an audit document written by somebody else who
   * read the source. Reading their account is not reading the source.
   */
  VIA_REVIEW: 'via-review-material',
  /**
   * A search service's summary of the source, and nothing from the source
   * itself. The commonest honest value in this repository, because the medical
   * publishers are unreachable from the build environment.
   */
  SEARCH_SUMMARY: 'search-summary-only',
  /** Author, year, journal, title and identifier were matched; no abstract read. */
  CITATION: 'citation-only',
  /** A textbook-level description this repository is restating. */
  TEXTBOOK: 'textbook-account',
  /** Nothing was checked. The claim must be limited accordingly. */
  UNVERIFIED: 'unverified',
  /** A decision this repository made. There is no source to verify. */
  DESIGN: 'repository-decision',
};

/**
 * Whether the source, as far as it was read, supports the claim made from it.
 *
 * Separate from {@link VERIFICATION} on purpose: a paper can be confirmed to
 * exist, and to say something adjacent to what an entry claims from it. The
 * audited registry had one of each — a dissociation asserted for *processes*
 * from a paper that reported recognition, and a localisation asserted from a
 * summary that describes a wider lesion than the entry uses.
 */
export const CLAIM_SUPPORT = {
  /** What was read states the claim. */
  STATES: 'source-states-it',
  /** What was read is consistent with the claim and does not state it. */
  CONSISTENT: 'consistent-with-source',
  /** What was read is narrower or wider than the claim, and the entry says how. */
  NARROWER: 'source-is-narrower',
  /** Not checked against the source at all. */
  UNCHECKED: 'not-checked-against-source',
};

const VERIFICATIONS = new Set(Object.values(VERIFICATION));
const CLAIM_SUPPORTS = new Set(Object.values(CLAIM_SUPPORT));

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
 * `sourceVerification` records **how far the source was actually checked**, and
 * it is optional only because most registries predate it. Where it is present
 * it must be one of {@link VERIFICATION}, because "we read the abstract" and
 * "we read the paper" are different warrants and a registry that cannot tell
 * them apart invites the second to be claimed for the first. This build
 * environment cannot reach the medical publishers at all, so for several
 * registries the honest value is the weakest one.
 *
 * @param {{id:string, claim:string, confidence:string, source:string,
 *          validation?:string, layer?:string, note?:string,
 *          sourceVerification?:string, claimSupport?:string, doesNotEstablish?:string}[]} entries
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
    if (entry.sourceVerification && !VERIFICATIONS.has(entry.sourceVerification)) {
      throw new Error(
        `${scene}: "${entry.id}" claims verification "${entry.sourceVerification}", which is not one of `
        + [...VERIFICATIONS].join(', ')
      );
    }
    if (entry.claimSupport && !CLAIM_SUPPORTS.has(entry.claimSupport)) {
      throw new Error(
        `${scene}: "${entry.id}" claims support "${entry.claimSupport}", which is not one of `
        + [...CLAIM_SUPPORTS].join(', ')
      );
    }
    // Saying how far a source was read is not saying that it supports the
    // claim. An entry that records one without the other is half an answer, so
    // once a registry starts recording verification it records both.
    if (entry.sourceVerification && entry.sourceVerification !== VERIFICATION.DESIGN && !entry.claimSupport) {
      throw new Error(
        `${scene}: "${entry.id}" says how far its source was read and not whether what was read `
        + 'supports the claim. Add `claimSupport`.'
      );
    }
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
      'Wall tension follows calibre as well as distending pressure: T = P·r for a cylinder. So at one pressure it is the widest part of the distended bowel whose wall carries the most. Which segment that is belongs to the scenario — the site, the state of the ileocaecal valve and the calibres of what lies above — and the model works it out rather than assuming it: in its colonic closed-loop arrangements the answer comes out at the caecum, and in a small bowel obstruction the caecum is not distended at all and no segment stands out.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Laplace’s law for a cylinder, and the standard description of the caecum as the segment that distends most in closed-loop large bowel obstruction with a competent ileocaecal valve.',
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

export const GOITRE_EVIDENCE = defineEvidence('multinodular-goitre', [
  {
    id: 'the-neck-gives-way-more-than-the-inlet',
    claim:
      'A goitre enlarging in the neck spends most of itself displacing the airway and the rest narrowing it, because the surrounding neck gives way readily. Below the thoracic inlet the gland is enclosed by structures that cannot move aside, so the same amount of tissue is spent mostly on narrowing instead. This is a shift in the balance and not a rule about where compression can occur: a cervical goitre can deviate, compress and narrow the airway.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of multinodular goitre: tracheal deviation and compression in the neck, and the thoracic inlet as the level below which a gland is enclosed by structures that cannot move aside, so compression becomes the more prominent problem.',
    validation: 'physiology: displacement dominates in the neck and narrowing dominates at the inlet',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'volume-is-the-same-in-every-direction',
    claim:
      'A given amount of nodular tissue makes the gland the same size whichever way it has gone, so how large the gland has become says nothing about what it is against.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Arithmetic of additive volumes: the direction a volume is added in does not change the volume.',
    validation: 'physiology: the same amount of gland is the same size in every direction',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-posterior-structures-are-passed-not-approached',
    claim:
      'The recurrent laryngeal nerve runs in the groove behind the gland and the parathyroid glands lie against its posterior surface, so an enlargement that goes backwards does not approach them: it passes them, and they end up on or inside the thing that was in front of them.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Standard thyroid surgical anatomy of the tracheo-oesophageal groove and the posterior parathyroid glands. The direction is textbook; the parathyroids’ positions vary more than almost anything else in the neck, which is why a surgeon looks for them.',
    validation: 'physiology: a backward enlargement passes the nerve and the parathyroids rather than approaching them',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'two-lobes-round-one-airway',
    claim:
      'The gland is wrapped round the front and sides of the airway, so a trachea pushed equally from both sides does not move: deviation needs one side to lead.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Standard thyroid anatomy — two lobes joined by an isthmus across the front of the trachea — and the standard observation that tracheal deviation follows asymmetric enlargement.',
    validation: 'physiology: a trachea pushed equally from both sides does not move',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'atlas-and-face-area',
    claim:
      'The lobe’s volume and depth, the airway’s calibre, and the area the added tissue is taken to come out through — which together turn a volume into the distance the gland’s face advances.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'The first three are measured off this repository’s thyroid atlas; the face area is a calibration chosen so that the range of burdens the scene offers produces displacements and narrowings that are visible without being absurd.',
    note:
      'A calibration, not a measurement. No volume here is a millilitre, no distance is a centimetre, and the width across the airway is reported against this model’s own resting width rather than as a tracheal diameter.',
    validation: 'calibration: the goitre model is measured off the atlas’s own gland and airway',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'four-directions',
    claim:
      'How much of each direction’s advance is aimed at the airway, how much of that meets a boundary that will not move, and how much goes back past the posterior structures.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'Twelve numbers chosen by this repository as a reading of four standard pictures. Nothing was measured and no source gives them.',
    note:
      'Illustrative coefficients. What the model claims is the *ordering* they produce — that one direction narrows and the others displace — and never the sizes. A real goitre goes several ways at once, and the four are not exclusive.',
    validation: 'calibration: one of the four directions narrows the airway and the others displace it',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'no-function-anywhere',
    claim:
      'There is no thyroid function in this model. A goitre of any shape in it may be euthyroid, overactive or underactive, and nothing about the shape says which.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision, and the sharpest one in the scene: morphology does not determine function, and a picture that let a reader infer it would be teaching something false.',
    note:
      'The direction this scene would mislead if it did not say so. No hormone, no TSH, no uptake and no autonomy appear anywhere, and no shape on screen is a functional state.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'a-relation-is-not-an-injury',
    claim:
      'The nerve and the parathyroid glands are lit when the gland reaches back past them. That is where they are, not what has happened to them.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. Whether a nerve is stretched, invaded, displaced intact or untouched is not something a volume and a direction can tell you, and this model contains nothing about any of it.',
    note:
      'The second direction this scene could mislead. Nothing in it says a nerve is damaged, at risk or anything else about it, and nothing says a parathyroid gland has stopped working.',
    layer: LAYER.EXTERNAL,
  },
]);

export const KNEE_OA_EVIDENCE = defineEvidence('knee-osteoarthritis', [
  {
    id: 'it-is-a-compartment',
    claim:
      'Knee osteoarthritis is predominantly compartmental rather than whole-joint: one compartment loses its articular layer while the other still has its own, and the medial compartment is the commoner one.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of knee osteoarthritis as compartmental, most often medial, and of the compartments as separately affected.',
    validation: 'physiology: a knee loses a compartment rather than a joint',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'what-follows-goes-with-the-side',
    claim:
      'Marginal osteophytes and meniscal extrusion appear on the affected side, so the consequences of the loss belong to the compartment rather than to the joint.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Standard descriptions of marginal osteophytes and meniscal extrusion in the affected compartment. The association is textbook; nothing here claims a size or an order.',
    validation: 'physiology: what follows appears on the side that lost the layer and not on the other',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'a-wedge-has-one-way-out',
    claim:
      'A wedge between two surfaces that are coming together has one direction available to it, so as a compartment narrows its meniscus is pushed outward from between them.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Solid geometry, applied to the meniscal wedge between the femoral condyle and the tibial plateau.',
    validation: 'physiology: a wedge between converging surfaces is pushed outward',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'confined-and-even-are-different-pictures',
    claim:
      'At the same amount lost, loss confined to one compartment and loss spread evenly across both are two different pictures rather than two severities: one has a side and the other does not.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Arithmetic of the two distributions, and the standard clinical distinction between compartmental and generalised disease.',
    validation: 'physiology: the same amount lost is two pictures, not two severities',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'drawn-layer-not-a-joint-space',
    claim:
      'The thickness of the layer this model thins, and the separation between the compartments it is thinned in.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'The knee atlas’s own drawn values, which are chosen there so the layer reads as a glaze on the joint rather than measured. The atlas says in as many words that no thickness in it is a measurement.',
    note:
      'An illustrative layer. What the model reports is a fraction of it, and **that fraction is not a joint space width**: joint space width is millimetres between bone surfaces on a weight-bearing radiograph and it includes the meniscus. Nothing here is measured, weight-bearing or millimetres.',
    validation: 'calibration: the knee model thins the atlas’s own drawn layer',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'extrusion-coefficient',
    claim:
      'How far a meniscus is pushed out per unit of layer lost, as a fraction of its own width.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'A calibration this repository chose: the value was calibrated so the extrusion is visible across the range the scene walks without the meniscus leaving the joint altogether.',
    note:
      'The direction is geometry and the size is this repository’s. No millimetre of extrusion follows from it, and the meniscus is moved rather than deformed.',
    validation: 'calibration: the meniscus is visibly pushed out without leaving the joint',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'the-loop-is-open',
    claim:
      'Uneven loss loads the worn side harder, which is thought to be part of why it continues. This model does not represent that.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. There is no loading in the model at all — no weight, no alignment, no gait — so the feedback cannot be in it.',
    note:
      'A reader watching one side wear away is not watching a process that drives itself on screen. The axis is how much is gone, not how it got there, and nothing here says a knee moves along it.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'nothing-follows-about-pain',
    claim:
      'Nothing in this model says what a person with any of these pictures feels or can do.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision, and a deliberate one: the relation between what is left of a layer and what somebody notices is not one this model could carry.',
    note:
      'Pain, stiffness and function are outside the model entirely. No fraction, difference or picture in it is a symptom, a grade or a probability of one.',
    layer: LAYER.EXTERNAL,
  },
]);

export const ACL_EVIDENCE = defineEvidence('acl-injury', [
  {
    id: 'the-thing-in-the-way',
    claim:
      'The anterior cruciate ligament runs from the back of the lateral femoral condyle forward and down to the front of the tibia, so it is the structure in the way when the tibia slides forward under the femur.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Standard knee anatomy for the ligament’s attachments and course.',
    validation: 'physiology: the ligament runs the way an ACL runs, between the atlas’s own attachments',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'primary-and-secondary',
    claim:
      'It is the primary restraint to that movement, and the menisci, the capsule and the shape of the plateau are secondary ones — so with it intact they carry a small part, and with it gone they carry all of what is left.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of the ACL as the primary restraint to anterior tibial translation, with the menisci, capsule and plateau geometry as secondary restraints.',
    validation: 'physiology: with the ligament gone the secondary restraints carry all of what is left',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'a-failed-cord-holds-nothing',
    claim:
      'A ligament that is no longer continuous carries none of the load it carried. It does not go on holding a fraction of it.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Mechanics of a cord in tension: a discontinuous one transmits no tension across the discontinuity.',
    validation: 'physiology: a discontinuous ligament holds nothing at all',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'less-restraint-is-more-travel',
    claim:
      'How far forward the tibia can sit follows how much of the restraint is missing, so losing the secondary restraints as well leaves it further forward than losing the ligament alone.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'The direction is mechanics — less restraint, more travel — and is standard. **thin**: how much further, for any given loss, is not claimed here.',
    validation: 'physiology: the less is holding it, the further forward it can sit',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'restraint-split',
    claim:
      'How the restraint to anterior translation is divided between the ligament and everything else when all of it is intact.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'A calibration this repository chose as a reading of one word: the ligament is described as the *primary* restraint and the rest as secondary ones. The split was chosen so that the ordering holds and the crossover falls where the ligament stops being continuous.',
    note:
      'A calibration of an ordering, not a measured contribution. The model claims that the ligament is first and the rest second, and never the numbers; no percentage it prints is anybody’s.',
    validation: 'calibration: the ordering holds and the crossover falls where the ligament fails',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'drawn-travel',
    claim: 'The furthest forward this model lets the tibia sit, as a fraction of the drawn plateau’s depth.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'Chosen by this repository so the travel is visible without the tibia leaving the femur. The plateau it is a fraction of is the knee atlas’s, drawn to be legible rather than measured.',
    note:
      'Illustrative. **It is not millimetres and not a side-to-side difference**, and no position on screen is a grade of anything.',
    validation: 'calibration: the tibia travels visibly without leaving the femur',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'no-examiner',
    claim:
      'Nothing in this model is a Lachman test, an anterior drawer or a pivot shift, and no number in it is a grade.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision, and the sharpest one here: those are manoeuvres a person performs, under a load they choose, graded by what they feel. None of that is in a geometric model.',
    note:
      'The direction this scene would mislead. A tibia sitting forward on screen is where the model says it can sit; it is not somebody’s knee being examined, and there is no examiner anywhere in it.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'context-not-resolved',
    claim:
      'The collateral ligaments and the tendon across the front are drawn while the tibia moves, and they are not re-solved as it does.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. Only the two cruciates are the subject, and solving the rest would be modelling a knee rather than a ligament.',
    note:
      'A reader watching the bone move is watching two cruciates follow it and everything else stay where it was. Nothing about what the collaterals do is in this model.',
    layer: LAYER.EXTERNAL,
  },
]);

export const CUFF_EVIDENCE = defineEvidence('rotator-cuff-tear', [
  {
    id: 'the-cuff-holds-rather-than-lifts',
    claim:
      'The rotator cuff does not lift the arm. Its four tendons make a sleeve round the head of the humerus and hold it on its socket while the large muscle over the shoulder moves the limb.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard shoulder anatomy and standard descriptions of the cuff as a head depressor and stabiliser rather than an elevator.',
    validation: 'physiology: the cuff holds the head on its socket rather than lifting the arm',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-facing-pair-centres-it',
    claim:
      'The tendon in front and the tendons behind pull against one another across the sleeve, and that pairing is what keeps the head centred — so a tear that spares it can leave the head exactly where it was.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of the transverse force couple — subscapularis in front against infraspinatus and teres minor behind — and of cuff tears that spare it leaving the head centred.',
    validation: 'physiology: a tear that spares the facing pair leaves the head where it was',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-head-rises-when-the-pair-goes',
    claim:
      'When the tear reaches the pair, the head is no longer held centred and rides up towards the arch above it.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Standard descriptions of superior migration of the humeral head with large cuff tears involving the couple. The direction is textbook; how far, and in whom, is not claimed here.',
    validation: 'physiology: the head rises only once the pair has stopped holding it',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'size-is-the-wrong-first-question',
    claim:
      'Because of that pairing, how much of the top tendon has gone does not by itself decide whether the head is centred: the same complete defect has the head centred or not, depending on what the tear has reached.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'A consequence of the two claims above, and the standard clinical distinction between tears that spare the couple and tears that do not.',
    validation: 'physiology: the same complete defect is two pictures, depending on the pair',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'containment-shares',
    claim:
      'How the job of holding the head on its socket is divided between the tendon over the top and the pair facing each other across the sleeve, and how much of it has to be left before the head stays put.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'A calibration this repository chose, calibrated so that a complete tear of the top tendon with the pair intact leaves the head centred and a tear that reaches the pair does not. That behaviour is the claim; the numbers are how this model produces it.',
    note:
      'A calibration of a behaviour, not a measured contribution. No percentage the scene prints is anybody’s, and the threshold is not a point at which anything happens in a person.',
    validation: 'calibration: a complete tear sparing the pair keeps the head centred, and one reaching it does not',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'a-share-of-a-drawn-gap',
    claim: 'How far the head rises, reported as a fraction of the gap drawn under the arch.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'The gap is the shoulder atlas’s `SUBACROMIAL_DISPLAY_GAP`, which the atlas itself declares a display value: in life the space is a few millimetres against a head of several centimetres, and drawn to scale the tendon under the arch is a line nobody can see.',
    note:
      'Illustrative, and imported from the atlas rather than typed here so the two cannot drift. **A share of an opened-up gap is not an acromiohumeral distance and is not millimetres**, and no position on screen is a measurement.',
    validation: 'calibration: the rise is a share of the atlas’s own display gap',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'one-number-for-the-pair',
    claim: 'The pair is one number in this model rather than two tendons with courses of their own.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. Which of them a tear reaches, how far round it goes, and what a partial involvement of one does are not things a single share can carry.',
    note:
      'A lit pair on screen marks which side of a threshold the model is on. It is not a statement about any particular tendon, and nothing in this model distinguishes them.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'nothing-moves-an-arm',
    claim: 'Nothing in this model moves an arm, and nothing in it is anything a person experiences.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision, and the reason the scene can say what it says without saying more: the shoulder is drawn at one position, with the arm at the side.',
    note:
      'Pain, weakness, the arc of movement and range are all outside the model. A head sitting higher on screen is where the model says it can sit, not a shoulder failing to lift.',
    layer: LAYER.EXTERNAL,
  },
]);

export const HIP_OA_EVIDENCE = defineEvidence('hip-osteoarthritis', [
  {
    id: 'one-shared-centre',
    claim:
      'In a healthy hip the centre of the femoral head and the centre of the acetabulum are the same point, and the space between the two bones is even all the way round.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard hip anatomy: a spherical head concentric with its socket. The atlas this scene is drawn on states it of its own two sites.',
    validation: 'physiology: an intact hip is concentric and its space is even all round',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'a-direction-not-a-compartment',
    claim:
      'Hip osteoarthritis loses the layer in a direction rather than in a compartment, so the ball settles that way and the two centres come apart by what has gone there. The described patterns — up and out, straight up, into the floor of the socket — are directions.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of the patterns of joint space narrowing in hip osteoarthritis, and of femoral head migration along them.',
    validation: 'physiology: a hip narrows in a direction and the ball settles that way',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-far-side-opens',
    claim:
      'Because the ball has moved away from a socket wall whose own layer is still there, the space on the far side is wider than it began — an apparent widening that is a consequence of the movement rather than of anything being added.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Solid geometry: a sphere that settles against one side of a shell is no longer concentric with it, and the clearance opposite increases by what it moved.',
    validation: 'physiology: the far side opens by what the ball moved',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'even-loss-keeps-the-centre',
    claim:
      'Where the layer goes evenly the ball has nowhere thinner to settle towards, so the centres stay shared and the space closes all round. That is a different picture rather than a milder one.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'A consequence of the geometry, and the standard description of concentric joint space narrowing as a pattern of its own. **thin** — what makes a hip take one pattern rather than another is not claimed here.',
    validation: 'physiology: even loss leaves the centres shared',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'a-drawn-layer-not-a-joint-space',
    claim: 'The thickness of the layer between the two bones, which every fraction this scene reports is a fraction of.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'The hip atlas’s own drawn radii: the difference between the head it draws and the socket it draws. The atlas says no dimension in it is a measurement.',
    note:
      'An illustrative layer. **The fraction reported of it is not a joint space width**, which is millimetres between bone surfaces on a weight-bearing radiograph in a direction somebody chose. Nothing here is measured, weight-bearing or millimetres.',
    validation: 'calibration: the hip model thins the layer the atlas’s own radii leave',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'four-patterns-and-a-spill',
    claim:
      'The four directions the scene offers, and how much of a directional loss reaches the rest of the surface.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'A calibration this repository chose: the angles are a reading of three described patterns and the spill was calibrated so a directional loss is plainly directional while the rest of the surface is not left untouched.',
    note:
      'Four patterns standing for a continuum of directions. The model claims that the direction is what decides the picture, and never these angles or this share.',
    validation: 'calibration: a directional loss is plainly directional and an even one has no direction at all',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'the-loop-is-open',
    claim:
      'Where the ball sits changes what it loads, which is thought to be part of why it goes on. This model does not represent that.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. There is no loading in the model at all — no weight, no alignment, no gait — so the feedback cannot be in it.',
    note:
      'A reader watching the ball settle is not watching a process that drives itself on screen. The axis is how much is gone, not how it got there or why it went that way.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'nothing-follows-about-the-person',
    claim: 'Nothing in this model says what somebody with any of these pictures feels or can do.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision, and a deliberate one: the relation between what is left of a layer and what a person notices is not one this model could carry.',
    note:
      'Pain, stiffness, limp and range are outside the model entirely. No fraction, offset or pattern in it is a symptom, a grade or a probability of one.',
    layer: LAYER.EXTERNAL,
  },
]);

export const URINARY_OBSTRUCTION_EVIDENCE = defineEvidence('urinary-obstruction', [
  {
    id: 'two-tubes-one-bladder',
    claim:
      'The urinary tract is two tubes that join at one bladder, so how many kidneys lie above a blockage is a property of where the blockage is rather than of how much has backed up: one above the bladder, both at the way out of it.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard urinary tract anatomy, and standard descriptions of obstruction above the bladder involving one side while bladder outlet obstruction involves both.',
    validation: 'physiology: how many kidneys are behind it is decided by the place, not the amount',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'above-fills-and-below-does-not',
    claim:
      'What lies above a blockage distends and what lies below it does not, so the boundary between the two is where the blockage is.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of dilatation of the collecting system and ureter proximal to the level of an obstruction.',
    validation: 'physiology: everything above the blockage is distended and everything below is not',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-same-kidney-with-a-different-length-behind-it',
    claim:
      'A blockage at the top of a ureter and one at its bottom stand above the same kidney with a different length of tube between them, so the place decides how much of the tract dilates and not only which side.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'A consequence of the topology, with the standard description of a pelviureteric obstruction dilating the collecting system while leaving the ureter below it undilated.',
    validation: 'physiology: further down the same ureter puts more of the tract above the same kidney',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-capsule-does-not-give',
    claim:
      'A kidney is inside a capsule that does not stretch readily, so a collecting system that fills takes its room from the parenchyma next to it. The dilated pelvis and the thinned parenchyma are the same volume counted twice.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of the renal capsule as a layer that does not stretch readily, and of parenchymal thinning accompanying a dilated collecting system.',
    validation: 'physiology: the room the collecting system gains comes mostly out of the parenchyma',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-spared-side-is-not-in-the-picture',
    claim:
      'The side with nothing above it is unchanged **by this model**. Nothing is claimed about what happens to the other kidney in a person.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'A consequence of the topology rather than a clinical observation: this model does nothing on a side that has no blockage above it.',
    validation: 'physiology: the spared kidney is untouched, whatever the amount',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'atlas-proportions',
    claim:
      'The kidney\'s and the collecting system\'s semi-axes, from which every volume, ratio and thickness the scene reports is computed.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'Measured off the landmark kidney builder in `src/scenes/renal/organs/kidney.js`, so the picture and the arithmetic are the same organ.',
    note:
      'Illustrative proportions, not anatomy. They were chosen there to read as a kidney at thumbnail size. No volume here is millilitres and no semi-axis is a dimension of anybody.',
    validation: 'calibration: the urinary tract scene is built from the volumes the model was given',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'retained-load-and-capsule-give',
    claim:
      'How much backs up at the top of the axis, and how far the capsule itself yields.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'Calibrations this repository chose: the load was calibrated so that the dilation and the thinning are both visible across the range without the collecting system reaching the capsule, and the give was chosen so that the capsule takes only a minority share of the retained volume.',
    note:
      'The claim that the room comes out of the parenchyma is a claim about that ratio and nothing else, which is why a test fixes the ratio rather than either constant.',
    validation: 'calibration: the capsule takes only a minority share of what backs up',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'dilation-factors',
    claim:
      'How far a distended ureter and a distended bladder are drawn against their own resting size.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'Chosen to be legible. Unlike the kidney, where the thickness follows from two volumes, these are illustrative drawn values.',
    note:
      'They say *distended* and do not say *how much*. No calibre in the tract is solved from anything, and none is a measurement.',
    validation: 'calibration: a distended stretch is plainly distended and an undistended one is plainly not',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'thinned-below',
    claim:
      'The share of its resting thickness below which the parenchyma is reported as thinned rather than as merely narrower.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'A reporting threshold for the copy, chosen so that it fires where the change is visible on screen.',
    note:
      'Illustrative, and chosen. It is not a grade and not a clinical threshold: this model grades nothing, and a geometry could not be a grade.',
    validation: 'calibration: the thinned threshold fires where the drawing changes and nowhere else',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'a-thin-parenchyma-reads-as-a-failing-kidney',
    claim:
      'What a kidney behind an obstruction is actually doing — whether it is filtering, how much, and whether it recovers — is not represented here in any form.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. There is no kidney function in this model at all, and nothing is carried from `renal-filtration`, which is a separate model with its own scope.',
    note:
      'A parenchyma drawn thin looks like a kidney that has stopped working, and this model says nothing of the kind. The thickness is a thickness in a drawing.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'thickness-is-not-volume',
    claim:
      'The parenchyma\'s thickness falls faster than its volume does, so the picture reads worse than the volume is.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Solid geometry: a thin shell round a large cavity still holds a good deal, which is why the two numbers diverge.',
    validation: 'physiology: the thickness falls faster than the volume, and the model says both',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'a-level-reads-as-a-stage',
    claim:
      'Nothing in this model says a blockage moves from one level to another, or that a person passes through the five in order.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision, and the reason the level is a control rather than a point on the axis: five arrangements, with how much has backed up as a separate thing.',
    note:
      'Five levels in a list read as five degrees of one illness. They are not, and the axis underneath them is not how far along anybody is.',
    layer: LAYER.EXTERNAL,
  },
]);

export const LOBAR_COLLAPSE_EVIDENCE = defineEvidence('lobar-collapse', [
  {
    id: 'the-gas-is-absorbed-and-not-replaced',
    claim:
      'A lobe whose bronchus is obstructed absorbs the gas already in it and is not refilled, so it loses volume. It does not keep its volume and become denser in place.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of resorption atelectasis distal to an obstructed bronchus, and of loss of volume as its defining feature.',
    validation: 'physiology: a collapsed lobe loses volume rather than keeping it',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-room-is-accounted-for',
    claim:
      'The room the lobe stops occupying is taken by something: the remaining lobes of the same lung expand into it, and what is left over is taken by the hemithorax itself getting smaller. A chest does not acquire a space.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of compensatory expansion of the remaining lobes and of displacement of adjacent structures towards a collapsed lobe.',
    validation: 'physiology: the room the lobe vacates is accounted for, all of it',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'towards-the-side-it-happened-on',
    claim:
      'The structures at the middle are drawn towards the side the collapse is on, and the direction is a property of which bronchus rather than of how much has gone.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of mediastinal displacement towards the affected side in lobar and lung collapse.',
    validation: 'physiology: the middle is drawn towards the side the collapse is on',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'collapse-is-not-consolidation',
    claim:
      'Consolidation fills the airspaces while the lobe keeps its volume, so nothing is drawn towards it; collapse loses volume, so everything nearby is. The two are opposite on a picture of volume and alike on a picture of density.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of consolidation as a volume-preserving airspace-filling process, against collapse as a volume-losing one.',
    validation: 'physiology: a collapsed lobe loses volume rather than keeping it',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-other-side-takes-none-of-it',
    claim:
      'Compensation happens within one hemithorax. The other lung is unchanged **by this model** — not a claim that it is unaffected in a person, but that a volume lost on one side is not offered to the other.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'A consequence of there being two pleural cavities with the mediastinum between them; compensatory expansion is described as ipsilateral.',
    validation: 'physiology: the other lung takes none of it',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'atlas-lobe-shares',
    claim:
      'Each lobe\'s share of its own side, from which every volume in the model is computed.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'Copied from `LOBE_VOLUME_SHARES` in the respiratory atlas, whose own provenance and open question are recorded there and in `docs/medical-notes.md`.',
    note:
      'Illustrative here: the model inherits the atlas\'s figures rather than asserting them, and reports every lobe against its own resting volume rather than in any absolute unit.',
    validation: 'calibration: the lobar collapse model and the lung atlas divide a lung the same way',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'how-the-room-divides',
    claim:
      'How much of the vacated room the rest of the lung takes, against how much the hemithorax takes by getting smaller.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'A calibration this repository chose, so that both halves of the answer are legible at once: at one nothing at the midline would move, and at zero no lobe would expand.',
    note:
      'Not a measured proportion. A real chest divides it differently from case to case, and the model claims only that the two together are all of it.',
    validation: 'calibration: both halves of the answer are visible at the top of the axis',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'the-face-the-shift-is-spread-over',
    claim:
      'The area the hemithorax\'s share of the volume is spread over to become the distance the midline is drawn across.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'A calibration chosen so the gap between the two midline bars is legible. The first value put a whole lower lobe at seven pixels.',
    note:
      'Illustrative, and chosen. **It is not a tracheal deviation, not a mediastinal shift anybody measured, and not millimetres.** The scene draws the resting midline beside it so what is read is a gap rather than an absolute distance.',
    validation: 'calibration: both halves of the answer are visible at the top of the axis',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'a-residual-so-there-is-something-to-point-at',
    claim:
      'What is left of a lobe that has lost all the air this model lets it lose.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'Chosen away from zero: a lobe collapsed to nothing would be a lobe the scene had deleted, and there would be no shape left to label.',
    note:
      'Illustrative. It is not a residual volume anybody measured, and nothing in the model says how airless a lobe can actually become.',
    validation: 'calibration: a fully collapsed lobe is still a shape there is something to point at',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'nothing-here-is-gas-exchange',
    claim:
      'What a collapsed lobe does to anybody\'s blood is not represented here in any form.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. There is no oxygen, no shunt, no saturation, no blood flow and no hypoxic vasoconstriction in this model.',
    note:
      'A lobe drawn airless reads as a person who is short of breath. Nothing here supports that: the model computes a volume and stops.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-expansion-has-no-shape',
    claim:
      'The remaining lobes expand in proportion to what each already had, which is the only division this model has any basis for.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. A real lung does not expand evenly, and neither the shape nor the direction of compensatory expansion is claimed.',
    note:
      'The proportional division is a default, not a finding. Nothing in the model says where in a lobe the expansion goes.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'six-arrangements-are-not-six-degrees',
    claim:
      'Nothing in this model says a blockage moves from one bronchus to another, or that the six choices are an order.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision, and the reason the bronchus is a control rather than a point on the axis.',
    note:
      'Six places in a list read as six degrees of one illness. The axis underneath them is how much of one lobe\'s air has gone, not how far along anybody is.',
    layer: LAYER.EXTERNAL,
  },
]);

export const LUMBAR_DISC_EVIDENCE = defineEvidence('lumbar-disc-herniation', [
  {
    id: 'two-tissues-one-threshold',
    claim:
      'The disc is an annulus fibrosus enclosing a nucleus pulposus, and the difference between a disc that is deformed and material that has left one is whether the annulus still closes behind it.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of the intervertebral disc as two tissues, and of displacement of nuclear material through a defect in the annulus.',
    validation: 'physiology: the ring closing behind it is one threshold, not a degree',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-direction-decides-what-is-there',
    claim:
      'What displaced material can reach is decided by the direction it goes rather than by how far it has gone: straight back is the canal, and posterolaterally is the nerve root.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of the posterolateral direction as the one in which displaced material most often approaches a nerve root, and of central displacement approaching the canal instead.',
    validation: 'physiology: what it can reach is decided by the direction, not by how far it went',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'past-the-ring-is-not-reaching-anything',
    claim:
      'Material can be past the annulus and reach nothing, and the two events are separate. A containment state and a spatial relation are different facts.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'A consequence of the geometry, and the standard observation that displaced disc material is frequently present without contacting a neural structure.',
    validation: 'physiology: passing the ring and reaching something are two separate events',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'a-narrow-target-and-a-wide-one',
    claim:
      'The canal is wide and the nerve root is narrow, so the same displacement means a different share of what it met. An indentation is only meaningful against the width of the thing indented.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Solid geometry, over the atlas\'s own calibres for the canal and the root.',
    validation: 'physiology: how far in is reported against the structure’s own width, and is bounded',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'atlas-clearances',
    claim:
      'The nucleus\'s half-depth, the annulus behind it, and the clearance from the nucleus to the canal and to the nerve root, from which every distance here is computed.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'Measured off `buildSpine()` in `src/scenes/musculoskeletal/organs/spine.js`, so the picture and the arithmetic are the same column.',
    note:
      'Illustrative. The spine atlas declares itself not anatomically validated and says no height, width, angle or curve in it is a measurement. **Nothing derived from it is millimetres.**',
    validation: 'calibration: the disc model and the spine atlas measure the same column',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'how-far-the-axis-goes',
    claim:
      'The furthest the axis carries the material.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'A calibration this repository chose, so that every direction can reach what lies that way before the top of the axis — including the furthest — without the material leaving the picture.',
    note:
      'Not a distance anybody travels. It exists so the three directions are comparable across one axis.',
    validation: 'calibration: every direction arrives before the top of the axis, and the far one arrives last',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'the-containment-state-is-not-the-classification',
    claim:
      'Nothing in this model is a bulge, a protrusion, an extrusion or a sequestration.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. Those categories are defined on measured geometry in a chosen plane, with rules about the base against the depth, and this model has neither a plane nor a base.',
    note:
      'A two-valued containment state sitting beside those four words will be read as the first two of them. The card, the scope panel and the visual mapping each say it is not.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'overlap-is-not-contact-in-anybody',
    claim:
      'Two drawn shapes overlapping on screen is not a radiological finding of root contact and not a finding in a person.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision, and the reason the read-out says "in this drawing" in as many words rather than "yes".',
    note:
      'The clearance it is measured against comes from an atlas that is not anatomically validated, so the overlap inherits that and nothing more.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'no-symptom-is-produced-or-implied',
    claim:
      'Whether anybody feels anything is not represented here in any form, and cannot be inferred from a containment state or an overlap.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision, and the sharpest one in this model: there is no nerve here in any sense beyond a drawn tube with a position.',
    note:
      'The read-out prints "not in this model" where a symptom would go rather than omitting the row, because an absent row reads as an oversight and this absence is the claim. `physiology: there is no symptom anywhere in the output` holds the absence open.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'one-pair-of-roots',
    claim:
      'Which root a displacement takes — the one traversing the level or the one exiting it — is not available in this drawing and is not claimed.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A property of the atlas: it draws one pair of roots at the detailed level, leaving above the disc.',
    note:
      'The two lateral directions reach the same drawn root at two places along it. That is a statement about this drawing and not about anatomy.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'no-time-and-no-cause',
    claim:
      'How a disc comes to displace material, how long it takes, and what becomes of it afterwards are not in this model.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. The axis is how far the material has gone, not how it got there or how long ago.',
    note:
      'There is no inflammation and no chemistry either: a disc here displaces, and nothing about it irritates anything.',
    layer: LAYER.EXTERNAL,
  },
]);

export const RETINAL_DETACHMENT_EVIDENCE = defineEvidence('retinal-detachment', [
  {
    id: 'the-macula-is-one-place-at-the-back',
    claim:
      'The macula is a discrete region at the posterior pole, so whether it lies inside a separation is a question about position rather than about how much retina has come away.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of the macula as a discrete region at the posterior pole, and of retinal detachment as separation of the neurosensory retina from the pigment epithelium.',
    validation: 'physiology: whether the macula is in it is decided by position, not by size',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-periphery-is-far-from-it',
    claim:
      'A separation beginning at the periphery is the better part of a right angle away from the macula, so it has a long way to reach before the macula is inside it; one beginning at the back is inside almost at once.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'The geometry of a sphere with the macula at one pole, over the eye atlas\'s own positions.',
    validation: 'physiology: a peripheral start has a long way to go and a posterior one does not',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'area-and-macula-are-independent',
    claim:
      'The area detached rises with the reach alone and is the same whichever way the separation started, so it cannot answer the question about the macula. A small separation can include it and a large one can miss it.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Solid geometry: the area of a spherical cap depends on its half-angle and not on where its axis points.',
    validation: 'physiology: the area is a cap on a sphere and rises with the reach alone',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'macula-on-and-off-are-two-pictures',
    claim:
      'The two states are a scenario rather than a sequence. Nothing here says one becomes the other.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'The standard clinical distinction, taken **only** as a statement about whether the macula lies inside the separated area.',
    validation: 'physiology: how much further it has to reach is reported, and reaches zero exactly once',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'atlas-globe-and-angles',
    claim:
      'The globe, its coats and the angular distance from each named origin to the macula, from which every figure here is computed.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'Measured off `buildEyeball()` in `src/scenes/sensory/organs/eyeball.js`, so the picture and the arithmetic are the same eye.',
    note:
      'Illustrative. The angles are angles of that drawing, and the area is a share of that sphere. **No figure here is a measurement of anybody.**',
    validation: 'calibration: the detachment model and the eye atlas measure the same globe',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'how-far-the-arc-goes',
    claim:
      'The widest the separation is drawn, in degrees of arc from its origin.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'A calibration this repository chose, so a peripheral separation can reach the macula before the top of the axis while leaving a long span in which it plainly has not.',
    note:
      'Without it the scene could never show the thing it exists to show. It is not an extent anybody has.',
    validation: 'calibration: a peripheral separation arrives late and a posterior one at once',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'the-lift-is-drawn-not-measured',
    claim:
      'How far the retina is drawn standing off the layer behind it.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'Chosen to be visible. At the atlas\'s own spacing between the coats a separation is a few pixels and cannot be seen at all.',
    note:
      'Illustrative, and much larger than that spacing. The height says *separated*; it does not say *how high*, and it is not a measurement.',
    validation: 'calibration: the drawn lift is far larger than the atlas’s own coat spacing, and says so',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'no-vision-is-produced-or-implied',
    claim:
      'What anybody can see is not represented here in any form and cannot be inferred from an area or a macula state.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. There is no acuity, no field, no contrast and no perception in this model — a separated retina here is a surface that has moved.',
    note:
      'The read-out prints "not in this model" where sight would go rather than omitting the row, because an absent row reads as an oversight and this absence is the claim.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'no-prognosis-follows-from-the-macula',
    claim:
      'Whether the macula is inside the separation says nothing here about what recovers, how much, or when.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision, and the sharpest one in this model: it is the thing most often said about this subject and the thing the model most firmly does not compute.',
    note:
      'The two states are a position against an edge. Nothing connects them to an outcome anywhere in this repository.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'no-cause-and-no-kind',
    claim:
      'Tear, traction, exudate, myopia and trauma are not distinguished, and no mechanism of separation is represented.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. The model has a cap and a position, and no account of how either came about.',
    note:
      'A reader who takes the five origins for five causes is reading something that is not there: they are five places.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'no-gravity-and-no-fluid',
    claim:
      'The inferior origin behaves exactly like the superior one, because there is no gravity and no fluid in this model.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision, and a visible one: the two origins are the same angular distance from the macula and therefore give the same answer.',
    note:
      'A real detachment does not spread evenly or circularly. Both the shape and the direction of spread are outside this model.',
    layer: LAYER.EXTERNAL,
  },
]);

export const CATARACT_EVIDENCE = defineEvidence('cataract', [
  {
    id: 'only-what-is-behind-the-opening',
    claim:
      'Light reaches the back of the eye through the pupil, so only the part of the lens behind that opening is in the way of anything.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of the pupil as the aperture through which light reaches the retina.',
    validation: 'physiology: only the part of the lens behind the opening is in the way of anything',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'three-places-in-the-lens',
    claim:
      'Nuclear, cortical and posterior subcapsular opacity are three distinct locations within the lens, not three degrees of one.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of the three as distinct sites of lens opacity.',
    validation: 'physiology: a clear lens is clear, and three places are not three stages',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'area-in-the-lens-is-not-area-in-the-path',
    claim:
      'How much of the lens has clouded does not say how much of the light\'s way it stands in: a cloud over most of the lens can stand in none of a small pupil, and one over a twelfth of it can stand in most.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'The geometry of two concentric discs, over the atlas\'s own lens and pupil.',
    validation: 'physiology: how much of the lens has clouded does not say how much is in the way',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-aperture-decides-which-matters',
    claim:
      'Opening the pupil changes which part of the lens is in use, and so reverses which of two opacities stands in more of the light\'s way — without either opacity changing.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'A consequence of the same geometry: the intersection of a fixed band with a growing disc.',
    validation: 'physiology: opening the pupil reverses which one is in the way',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'atlas-lens-and-pupil',
    claim:
      'The lens\'s radius across the light\'s way and the pupil the atlas draws, from which both shares are computed.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'Measured off `buildEyeball()` in `src/scenes/sensory/organs/eyeball.js`, so the picture and the arithmetic are the same eye.',
    note:
      'Illustrative. Both shares are shares of drawn circles. **No radius or area here is a measurement of anybody.**',
    validation: 'calibration: the cataract model and the eye atlas measure the same lens',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'the-bands-and-the-two-apertures',
    claim:
      'The inner and outer radii of each named opacity, and the two pupil sizes.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'Calibrations this repository chose: the bands are a reading of where the three named opacities sit, and the apertures were chosen so that one of them contains the middle alone and the other most of the lens.',
    note:
      'What the numbers have to deliver is the reversal — with a smaller spread between the apertures, or overlapping bands, the scene would have nothing to show. The reversal is what a test fixes, not the values.',
    validation: 'calibration: the two apertures produce the reversal the scene exists for',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'the-share-is-not-a-transmission',
    claim:
      'The share this model reports is an area inside a drawn aperture. It is not a transmission, not an attenuation and not a loss of anything.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. There is no light physics in this model: nothing is scattered, refracted or absorbed, and a ray either crosses the clouded area or does not.',
    note:
      'A percentage beside a clouded lens will be read as a percentage of light. It is a percentage of a hole.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'no-vision-is-produced-or-implied',
    claim:
      'What anybody can see is not represented here in any form and cannot be inferred from either share.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. No acuity, no contrast sensitivity, no glare, no colour and no refraction.',
    note:
      'The read-out prints "not in this model" where sight would go rather than omitting the row, because an absent row reads as an oversight and this absence is the claim.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'no-indication-for-anything',
    claim:
      'Nothing here says when a lens should be replaced, treated or left alone, and no output is a threshold for any of that.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision, and a firm one: a share rising towards a hundred per cent invites exactly that reading.',
    note:
      'The decision rests on things this model has none of — what somebody needs to do, what they can see, and what they want.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'two-apertures-are-not-two-light-levels',
    claim:
      'The pupil is a hole of a chosen size here. Nothing says what made it that size or what it is responding to.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision: this model has no light in it, so it cannot have a response to light in it either.',
    note:
      'A reader who takes the wide pupil for darkness and the narrow one for daylight is reading something that is not there.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'an-even-band-at-one-depth',
    claim:
      'Each opacity is an even band of the lens at a single depth, and the depth is carried for the drawing alone.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. Nothing in the arithmetic depends on the depth, and a real opacity is neither even nor confined to a band.',
    note:
      'The model is a comparison of two areas seen along the axis. Depth would matter to a model of light, and there is no light here.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'no-time-and-no-cause',
    claim:
      'Age, steroid, diabetes and trauma are not represented, and nothing here says one place becomes another or that any of them progresses.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. The axis is how opaque one place is, not how far along anybody is.',
    note:
      'Three places in a list read as three stages. They are not, and nothing in the model connects them.',
    layer: LAYER.EXTERNAL,
  },
]);

export const BPPV_EVIDENCE = defineEvidence('bppv', [
  {
    id: 'only-what-lies-in-the-plane-drives-it',
    claim:
      'A particle in a canal can only be driven along the loop by the part of gravity lying in that loop\'s plane. The part along the normal presses it against the wall and moves it nowhere.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Vector decomposition against a plane, applied to the atlas\'s own canal normals.',
    validation: 'physiology: a loop can only be driven by the gravity lying in its plane',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-level-loop-and-the-standing-one',
    claim:
      'The lateral canal lies approximately level with the head upright, so upright gravity runs along its normal; the posterior canal\'s plane already holds gravity. Two loops in one ear, at one head position, are therefore in completely different states.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of the semicircular canals as three loops in three planes, with the lateral one approximately level in an upright head.',
    validation: 'physiology: two loops in one ear, at one head position, are in different states',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-head-moves-and-the-planes-go-with-it',
    claim:
      'Taking the head back brings gravity into the plane of a canal that held none of it, which is why the head\'s position is the whole of the question.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of benign paroxysmal positional vertigo as loose particles moving under gravity when the head changes position, taken only as far as the geometry.',
    validation: 'physiology: taking the head back brings gravity into the level loop’s plane',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'a-still-head-has-already-settled',
    claim:
      'A particle in a loop whose plane already holds gravity sits at that loop\'s lowest point, so an upright head shows no travel at all. Travel is measured from there.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'A consequence of the quasi-static treatment: with no inertia and nothing holding it, the particle is wherever the in-plane pull points.',
    validation: 'physiology: the particle starts where it already was, not somewhere convenient',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'atlas-canal-planes',
    claim:
      'The normals of the canal planes and the radius of the loop, from which every angle here is computed.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'Measured off `buildEar()` in `src/scenes/sensory/organs/ear.js`, so the picture and the arithmetic are the same labyrinth.',
    note:
      'Illustrative. The atlas draws the three canals on three cardinal planes, which a real labyrinth does not; the claims here are about which plane, not about the angles between them.',
    validation: 'calibration: the canal model and the ear atlas use the same planes and the same loop',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'the-heads-path-is-chosen',
    claim:
      'The rotation the axis carries the head through, and how far it goes.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'A calibration this repository chose: enough to bring the level loop\'s plane plainly into gravity, otherwise the scene could never show what it exists to show.',
    note:
      '**It is not the angle of any named manoeuvre**, and no point on the axis corresponds to a step of one. What it has to deliver is that the level loop begins at nothing and ends holding most of it.',
    validation: 'calibration: the head’s path takes the level loop from nothing to nearly all of it',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'where-the-ampulla-is-put',
    claim:
      'Where on each loop the ampulla sits, which is the end `towardsAmpulla` names a direction against.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'Not measured but chosen so that each loop has a named end: **the ear atlas draws each canal as a plain loop of tube with no ampulla on it**, so there was nothing in the anatomy to take an angle from.',
    note:
      '**The body the scene draws at that angle is a structure this layer adds**, and the visual mapping says so. What the angles have to deliver is only that the loop has a named end, so a direction of travel can be a fact about the arc rather than the sign of a subtraction — nothing in the model depends on the ampulla being in one place rather than another, and **no angle here is where an ampulla is in anybody**.',
    validation: 'calibration: the ampulla is an end this scene names, not one the atlas draws',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'no-eye-movement-is-derived',
    claim:
      'The direction of any nystagmus is not computed here. Nothing in this model is an eye, a muscle or a direction of gaze.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision, and the sharpest one in this model. A canal\'s plane is related to the plane of the response it drives; the model does not take that step.',
    note:
      'The read-out prints "not derived here" where a nystagmus would go rather than omitting the row, because an absent row reads as an oversight and this absence is the claim.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'quasi-static-and-nothing-else',
    claim:
      'The particle is drawn where it would end up, not where it is on the way. There is no inertia, no fluid, no drag, no cupula and no time.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. Everything that makes this subject a matter of seconds rather than positions is outside the model.',
    note:
      'Latency, duration and fatigue all live in the physics this model does not have, which is why none of them appears anywhere in it.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-two-turns-are-not-mirror-images-here',
    claim:
      'In this drawing the posterior loop answers a turn either way identically, and only the lateral loop makes the two turns different pictures.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A property of the atlas: it draws one ear, and the turn is symmetric about the posterior loop\'s plane.',
    note:
      '**A statement about this drawing, not about ears.** A reader who takes the two turns for two sides of a head is reading something that is not there.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'one-particle-standing-for-many',
    claim:
      'The particle is drawn as a single body, and nothing here says how many there are or whether they move together.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. A single body has a position, which is what the model needs; a cloud of them would need the physics the model does not have.',
    note:
      'Nothing about the size of the drawn particle is a size, and nothing about there being one is a count.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'no-symptom-and-no-manoeuvre',
    claim:
      'Vertigo, nausea and the effect of any repositioning procedure are not represented here in any form.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. The axis is a head position, not a step of a procedure, and nothing in the model is a person.',
    note:
      'A head going back on an axis reads as a manoeuvre being performed. It is one rotation, chosen so the geometry is visible.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'three-cardinal-planes',
    claim:
      'The atlas puts the three canals on three cardinal planes, which a real labyrinth does not.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A property of the atlas, which declares its own proportions to be drawn rather than measured.',
    note:
      'The claims here are about *which* plane rather than about the angles between them, so the simplification does not reach them — but no angle reported is an angle in anybody.',
    layer: LAYER.EXTERNAL,
  },
]);

export const PRESSURE_INJURY_EVIDENCE = defineEvidence('pressure-injury', [
  {
    id: 'trapped-tissue-is-squeezed-from-both-sides',
    claim:
      'Tissue lying between a load at the surface and a bone underneath is deformed from above and from below at once, so the profile of deformation against depth has its peak at that interface rather than at the skin.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of pressure injury as deformation of soft tissue between an external surface and underlying bone.',
    validation: 'physiology: over a prominence the worst of it is deep, not at the skin',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'over-soft-tissue-it-fades-downwards',
    claim:
      'With no prominence beneath it, the squeeze decays downwards from the surface and the skin at the top takes the most of it. The picture a reader arrives with is one of the two the model has.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'A consequence of a load applied at one surface with nothing resisting it from the other side.',
    validation: 'physiology: over soft tissue the squeeze fades downwards from the skin',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'two-shapes-rather-than-two-amounts',
    claim:
      'The two grounds differ in the shape of the profile, not in its size: over bone the skin is squeezed **less** while the deep layer is squeezed far more, which no single amount could do.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'A consequence of the two terms: the deep term is present or absent, and each term is normalised against the profile it is part of.',
    validation: 'physiology: the two grounds are two shapes, not two amounts',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'a-profile-capped-at-its-surface-cannot-make-the-claim',
    claim:
      'The arithmetic is deliberately not clamped. A model whose deformation could never exceed its surface value could not represent an injury that begins deep, so the deep term has to be able to carry the profile above it.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'A design consequence, and the reason the model is written the way it is: the clamped version was written first and flattened both ends of the profile into the same value.',
    validation: 'physiology: a profile whose peak could not exceed its surface is refused',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'how-hard-never-changes-which-depth',
    claim:
      'The axis is a magnitude. Which depth takes the most of it is settled by what lies underneath, and pressing harder changes the amount without changing the answer.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'A consequence of the load entering both terms as a common factor.',
    validation: 'physiology: how hard the surface is pressed changes the amount, never the answer',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-atlas-depths-and-the-floor-the-bone-sits-at',
    claim:
      'The depths of the named layers, and the depth the second term decays from, which is the block’s own floor.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'Taken from `LAYER_DISPLAY_THICKNESS` in `src/scenes/integumentary/organs/skinBlock.js`, so the profile and the block drawn beside it are the same block.',
    note:
      '**Illustrative, and the atlas says so of itself**: it declares its layer thicknesses deliberately not to scale, with the epidermis drawn some twenty times too thick because a line cannot carry what a reader needs to see in it. No thickness or ratio may be read off any of this.',
    validation: 'calibration: the profile’s depths are the skin atlas’s own, floor included',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'reach-and-trapped-are-chosen',
    claim:
      'How far a squeeze reaches from the surface it is applied at, and how much harder trapped tissue is squeezed than tissue directly under the load.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'Calibrations this repository chose so both shapes are legible across the range: too short a reach and nothing at the top reaches the bottom, too long and the two peaks merge into one flat block.',
    note:
      '**Neither is a ratio anybody measured.** What they have to deliver is that the deep peak exists and is the larger one, which is what the tests fix — the consequence rather than the values.',
    validation: 'calibration: the calibrations deliver the deep peak the claim needs',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'no-stage-is-produced-or-implied',
    claim:
      'This model does not stage a pressure injury and cannot be made to. No output here is a stage, a grade or a threshold.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision, and the sharpest one in this model. Staging rests on what tissue is visible and what has been lost; this model has neither, and a geometry could not be a stage.',
    note:
      'The read-out prints "not in this model" where a stage would go rather than omitting the row, because an absent row reads as an oversight and this absence is the claim. `tests/pressure-injury-physiology.test.js` searches the whole output for a field that reads as a stage.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'nothing-happens-to-the-tissue-but-deformation',
    claim:
      'Tissue deforms in this model and nothing else happens to it: no death, no loss, no depth of loss, no ulcer and no wound.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. Nothing converts a deformation into an injury, and a threshold at which one became the other would be a claim this model has no basis for.',
    note:
      'The scene colours the longest bar and nothing else, so that a reader sees which depth is squeezed most rather than a patch of damaged tissue.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'deform-is-not-a-mechanical-quantity',
    claim:
      'The number each depth carries is unscaled and comparative. It is not a stress, a strain, a pressure, a modulus or a displacement.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision: the two terms are shapes chosen to be the two shapes, and no mechanics was solved to obtain them.',
    note:
      'Each depth is reported as a share of the profile’s own peak, so the numbers compare depths inside one picture. Comparing them between two grounds, or between two positions on the axis, is not supported.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-prominence-is-a-structure-the-scene-adds',
    claim:
      'The bone under the load is drawn by this scene, not by the anatomy it stands on.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A property of the atlas: `buildSkinBlock()` is a specimen of skin and has no skeleton in it.',
    note:
      'Its apex is placed at the block’s own floor so the thing drawn and the thing computed are the same thing, and the visual mapping declares that the scene added it. **Nothing about its shape or size is a bone in anybody.**',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'no-time-no-blood-and-no-person',
    claim:
      'There is no duration, no relief, no perfusion, no ischaemia, no inflammation and no repair, and no temperature, moisture, friction or continence. There is no person, no body position and no support surface.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. Everything that makes this subject a matter of hours and of care is outside a model whose axis is how hard a surface is pressed.',
    note:
      '**The axis is how hard, not how long.** A reader who takes a position on it for an elapsed time is reading something that is not there, which is why the progress label names the load rather than a duration.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'four-depths-standing-for-a-continuum',
    claim:
      'The profile is continuous and only four named depths are reported from it.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A presentation decision: the four are the layers a reader can name, and a curve with no names on it would not answer the question the scene asks.',
    note:
      'Nothing about there being four is a count of layers, and the deep interface is a place rather than a tissue.',
    layer: LAYER.EXTERNAL,
  },
]);

export const BREAST_LESION_EVIDENCE = defineEvidence('breast-lesion', [
  {
    id: 'every-duct-system-begins-at-the-nipple',
    claim:
      'Every duct system in the gland converges on the nipple and runs outwards from it, so a position in the breast is a matter of which system it is on and how far out along it.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of the breast as duct systems converging on the nipple.',
    validation: 'physiology: every duct system begins at the same place',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'further-out-is-not-nearer',
    claim:
      'Because the systems run outwards in different directions and the drainage route leaves from one corner of the gland, moving out along one course takes a place **towards** that route while moving out along another takes it **further away**.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'A consequence of the arrangement: the courses share a start and differ in direction, and the route is at one side.',
    validation: 'physiology: further out along a duct is not nearer the route — on some courses it is further',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-lobules-are-at-the-far-ends',
    claim:
      'The lobules hang off the peripheral ends of the ducts, so how far out a position is settles which part of the duct system it is in — and the four courses pass through the same parts in the same order.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of the duct system ending peripherally in lobules.',
    validation: 'physiology: how far out settles which part of the duct system a place is in',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'which-part-is-not-which-quadrant',
    claim:
      'Which part of a duct system a place is in is a fact about how far out it is, not about which direction the course happens to point.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'A consequence of the four courses being the same shape of course in four directions.',
    validation: 'physiology: the four courses pass through the same parts in the same order',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-tail-is-a-different-place',
    claim:
      'The axillary tail is gland tissue lying along the drainage route, and no position on any duct\'s axis ever reaches it: it is reached by choosing it.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Standard descriptions of the axillary tail as gland tissue extending towards the axilla, taken only as far as the geometry.',
    validation: 'physiology: the axillary tail is a different place, not a later one',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-atlas-courses-and-the-route',
    claim:
      'The four duct courses, their lobules, the axillary tail and the node group beyond it, from which every position and distance here is computed.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'Sampled off `buildBreast()` in `src/scenes/reproductive/organs/breast.js`, so a place this model computes is a place on a structure that is on screen.',
    note:
      '**Illustrative, and the atlas says so of itself**: it declares itself not anatomically validated and its duct and lobule counts to be display counts. The four courses are four of the atlas\'s own eight, and the quadrant names say where each happens to point.',
    validation: 'calibration: the lesion model and the breast atlas use the same courses',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'where-the-parts-are-divided',
    claim:
      'Where along a course the large duct gives way to its terminal part, and where the lobular end begins.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'Calibrations this repository chose, placed so that the part called `lobular-end` is the part the atlas hangs its lobules off.',
    note:
      '**Neither is a length in anybody**, and neither is a boundary anybody measured. What they have to deliver is that the far end is where the lobules are, which is what a calibration test fixes.',
    validation: 'calibration: the part boundaries put the lobular end where the lobules are',
    layer: LAYER.CALIBRATION,
  },
  {
    id: 'nothing-spreads-anywhere-in-this-model',
    claim:
      'No cell moves, no lesion advances, no node is involved and no route carries anything. The route is drawn because the gland drains that way, and every distance is between two drawn points.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision, and the sharpest one in this model. A picture of a marker sliding towards the axilla says "it spread" whether or not anything computed it, which is why the route never reacts and the marker never grows.',
    note:
      'The read-out prints "nothing spreads in this model" where such a row would go rather than omitting it, and `tests/breast-lesion-model.test.js` holds the route and the node group byte-identical across every position on every course.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-marker-has-no-size',
    claim:
      'The marker is a place. It has no diameter, no volume, no growth, no margin and no shape.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. A marker that grew along the axis would be a diameter, and nothing in this model could say what it was a diameter of.',
    note:
      'It is drawn at **one fixed size** at every position on every course, which a model test measures, and the visual mapping declares that the fixed size is the claim.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-part-names-are-not-diagnoses',
    claim:
      '`large-duct`, `terminal-duct` and `lobular-end` name where on a drawn course a point is.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision about words rather than about arithmetic: the two things disease in this organ is named after are also the two parts of the system, and a reader will carry one across to the other.',
    note:
      '**They are not histological types.** Nothing here distinguishes in-situ from invasive, names a cell, or classifies anything, and a reader who reads "lobular" as a diagnosis is reading something that is not there.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'one-drainage-route-in-this-picture',
    claim:
      'The gland has a single drawn drainage route here, the one running towards the axilla.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A property of the atlas, which draws the axillary route and no other.',
    note:
      'A breast has more than one. **The absence of the others is a property of the drawing, not a claim that they do not exist**, and no comparison between routes is available here.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'no-stage-no-prognosis-and-no-biology',
    claim:
      'There is no stage, no grade, no probability, no prognosis, no cell type, no receptor, no histology and no cause, and no imaging, screening, biopsy or treatment.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A scope decision. Staging rests on size, on nodes and on what is elsewhere in a person, and this model has none of the three.',
    note:
      'A physiology test scans every output name for a field reading as a spread, a size or a stage, so the absences cannot be filled in quietly.',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'four-of-eight-and-a-chosen-baseline',
    claim:
      'Four of the atlas\'s eight duct systems are offered, with the upper outer one as the baseline.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'A presentation decision: four directions are enough to make the comparison and eight would be a thicket.',
    note:
      '**Neither the choice nor the baseline says anything about where anything occurs in people.** The upper outer course is the baseline because it is the one the other three are compared against — it is the course on which the distance falls.',
    layer: LAYER.EXTERNAL,
  },
]);

/** @see src/models/higherBrainFunction.js, docs/model-evidence/higher-brain-function.md */
export const HIGHER_BRAIN_FUNCTION_EVIDENCE = defineEvidence('higher-brain-function', [
  {
    id: 'the-model-does-not-classify',
    claim:
      'This model computes route availability per task and produces no syndrome name and no exclusion of one.',
    confidence: CONFIDENCE.APPROXIMATION,
    source:
      'A decision, taken after a review of the previous version. A first-match chain over four '
      + 'dimensionless route values was returning a clinical category, and the features that separate '
      + 'the aphasias — the quality of the output, paraphasia, agrammatism, the stimulus a task was '
      + 'probed with — are not computed here. Ruling a language disorder out needs more still.',
    sourceVerification: VERIFICATION.DESIGN,
    note:
      'An approximation of what the model is for, not of the medicine. The classical syndromes are in '
      + '`src/data/aphasiaReference.js` as reference reading, with what this model cannot evaluate about '
      + 'each of them listed beside it. A reader compares; the model does not decide.',
    doesNotEstablish: 'That the classical categories are wrong, or that they are right.',
  },
  {
    id: 'two-writing-routes',
    claim:
      'Spelling runs by two routes that dissociate: a lexical route for whole known words and a '
      + 'phonological route that converts sounds to letters, so nonwords and irregular words can be '
      + 'lost separately.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Roeltgen, Sevush and Heilman, Neurology 1983;33:755 (phonological agraphia: nonwords cannot be '
      + 'spelled, the lexical route is preserved) and Roeltgen and Heilman, Brain 1984;107:811 (lexical '
      + 'agraphia, the complementary case). Rapcsak et al., Neuropsychologia 2007, report that a '
      + 'dual-route model predicts reading and spelling performance in acquired alexia and agraphia.',
    sourceVerification: VERIFICATION.VIA_REVIEW,
    claimSupport: CLAIM_SUPPORT.STATES,
    validation: 'physiology: the two writing routes come apart, and a nonword may not take the lexical one',
    layer: LAYER.EXTERNAL,
    doesNotEstablish:
      'The anatomy. The 1984 series localised the two to the angular and supramarginal gyri on CT in '
      + 'four patients each, which is where this model places them, and that is a small old series '
      + 'rather than a settled localisation. What has been read of it here is the publisher summary, '
      + 'quoted in a review of this model rather than retrieved: the summary describes the '
      + 'phonological group as supramarginal **or the insula deep to it**, which is wider than the '
      + 'one-gyrus assignment. The dissociation is the claim; the localisation is carried separately '
      + 'and marked uncertain.',
  },
  {
    id: 'writing-is-not-downstream-of-speaking',
    claim:
      'Written spelling does not require the route that plans spoken output: agraphia and the loss of '
      + 'speech dissociate.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'The same two case series, in which spelling is assessed in patients whose spoken output is '
      + 'affected, and the standard description of apraxia of speech as leaving writing available.',
    sourceVerification: VERIFICATION.SEARCH_SUMMARY,
    claimSupport: CLAIM_SUPPORT.CONSISTENT,
    validation: 'physiology: writing from meaning does not depend on speaking',
    layer: LAYER.EXTERNAL,
    doesNotEstablish:
      'That writing is normal in the perisylvian aphasias. It is not — agraphia accompanies them — and '
      + 'this model does not produce that, which is declared as a coverage limitation on every writing '
      + 'result rather than corrected by pushing a value down.',
  },
  {
    id: 'letters-and-objects-dissociate',
    claim:
      'A process specific to the visual form of letters and words can be affected while the visual '
      + 'processing of objects is not.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Gaillard et al., Neuron 2006, report a patient whose reading changed after resection of a small '
      + 'word-responsive region of left occipitotemporal cortex that overlapped the word-specific fMRI '
      + 'activation, with pre-operative category selectivity for words, faces, houses and tools.',
    sourceVerification: VERIFICATION.VIA_REVIEW,
    claimSupport: CLAIM_SUPPORT.NARROWER,
    validation: 'physiology: letters and objects come apart when the processes do',
    layer: LAYER.EXTERNAL,
    doesNotEstablish:
      'The post-operative comparison in detail. The abstract was read by a reviewer of this model and '
      + 'not retrieved here, and what it reports is the **recognition** of other visual categories '
      + 'being preserved. Recognition is not oral object naming, which is the task this model carries, '
      + 'and this entry does not read one for the other. The dissociation is asserted for the '
      + '*processes* in this model, and the atlas cannot separate them at all.',
  },
  {
    id: 'the-atlas-cannot-separate-letters-from-objects',
    claim:
      'The two form processes share one atlas mesh, so a lesion takes both and the selective '
      + 'dissociation is available only as a conceptual intervention.',
    confidence: CONFIDENCE.APPROXIMATION,
    source:
      'The distributed atlas: one `Lateral occipitotemporal gyrus` per side, with no subdivision into '
      + 'word-responsive and object-responsive cortex.',
    sourceVerification: VERIFICATION.DESIGN,
    note:
      'An approximation of the substrate. It is reported on the result — both tasks carry the shared '
      + 'mesh as a coverage limitation — rather than worked around by letting a lesion take one and '
      + 'spare the other.',
  },
  {
    id: 'repetition-has-two-routes',
    claim:
      'Repeating a heard word can go by a direct phonological route or round through the lexicon, so '
      + 'interrupting the direct route affects nonwords more than familiar words.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'The standard dual-route account of repetition, and the clinical descriptions of conduction '
      + 'aphasia in which repetition is reported as worse for nonwords and function words than for '
      + 'familiar content words.',
    sourceVerification: VERIFICATION.TEXTBOOK,
    claimSupport: CLAIM_SUPPORT.STATES,
    validation: 'physiology: a known word can be repeated round through meaning, and a nonword cannot',
    layer: LAYER.EXTERNAL,
    doesNotEstablish:
      'That conduction aphasia is one bundle cut. It is reported with cortical lesions as well, and '
      + 'one account makes the primary deficit auditory-verbal short-term memory rather than '
      + 'disconnection. Reducing it to a tract is a simplification this model makes knowingly.',
  },
  {
    id: 'anterior-and-posterior-dissociate',
    claim:
      'A lesion of the dominant inferior frontal gyrus affects the output routes with the way in '
      + 'preserved; a lesion of the dominant posterior superior temporal region does the reverse.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'The standard clinical descriptions of the anterior and posterior perisylvian aphasias.',
    sourceVerification: VERIFICATION.TEXTBOOK,
    claimSupport: CLAIM_SUPPORT.STATES,
    validation: 'physiology: an anterior lesion takes the output routes and a posterior one takes comprehension',
    layer: LAYER.EXTERNAL,
    doesNotEstablish:
      'That either picture follows from a lesion restricted to those gyri. Mohr et al. reported that '
      + 'the full Broca picture requires damage well beyond the inferior frontal gyrus, and Dronkers '
      + 'et al. that comprehension does not reduce to the posterior superior temporal gyrus. Neither '
      + 'was retrieved beyond its citation for this entry.',
  },
  {
    id: 'outside-the-perisylvian-zone-repetition-survives',
    claim:
      'Lesions that spare the perisylvian language cortex leave the repetition route reaching while '
      + 'affecting self-initiation or meaning.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'The standard clinical descriptions of the transcortical aphasias.',
    sourceVerification: VERIFICATION.TEXTBOOK,
    claimSupport: CLAIM_SUPPORT.STATES,
    validation: 'physiology: a lesion outside the perisylvian zone leaves the repetition route reaching',
    layer: LAYER.EXTERNAL,
    doesNotEstablish:
      'The vascular story. A border-zone infarct is a perfusion event, and this model has no blood '
      + 'flow, no vascular territory and no individual variation in where a border zone falls.',
  },
  {
    id: 'a-watershed-preset-is-not-a-perfusion-territory',
    claim: 'The watershed presets are sets of structures chosen for teaching.',
    confidence: CONFIDENCE.APPROXIMATION,
    source: 'This repository\u2019s choice of which structures to include, with no perfusion model behind it.',
    sourceVerification: VERIFICATION.DESIGN,
    note:
      'An approximation of the substrate, and declared on each preset. Flamand-Roze et al. report that '
      + 'border-zone aphasia has a specific initial pattern and a good long-term prognosis, which is a '
      + 'time course this model does not have; that citation was not retrieved beyond its bibliography.',
  },
  {
    id: 'the-way-in-from-hearing-is-separable',
    claim:
      'The auditory way into language can be affected while reading, writing from meaning and '
      + 'spontaneous output are not.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Maffei et al., Cortex 2017;97:240, report a case of pure word deafness after left temporal '
      + 'damage with intact processing of non-speech sounds and normal speech, reading and writing.',
    sourceVerification: VERIFICATION.SEARCH_SUMMARY,
    claimSupport: CLAIM_SUPPORT.CONSISTENT,
    validation: 'physiology: the way in from hearing is separate from the way out and from meaning',
    layer: LAYER.EXTERNAL,
    doesNotEstablish:
      'That bilateral auditory cortex is what produces it. That case was unilateral, and the mechanism '
      + 'is attributed to disconnection of the posterior temporal cortex from both auditory cortices '
      + 'rather than to destruction of both. This model reaches the same dissociation by a bilateral '
      + 'preset, which is a different lesion.',
  },
  {
    id: 'hearing-itself-is-not-modelled',
    claim:
      'This model has no audiometry and no non-speech sounds, so it cannot separate a word-specific '
      + 'auditory deficit from cortical deafness.',
    confidence: CONFIDENCE.APPROXIMATION,
    source: 'The task set: nothing in it tests sound detection or environmental sound recognition.',
    sourceVerification: VERIFICATION.DESIGN,
    note:
      'Stated on the comprehension task itself. A reader who sees the auditory tasks affected must not '
      + 'read that as pure word deafness, and the task says so.',
  },
  {
    id: 'the-thalamus-is-not-an-obligatory-gate',
    claim:
      'Word production is not modelled as passing through an obligatory thalamic gate, and the '
      + 'cortico-thalamic contribution is declared as not computed.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Zhang et al., Neurobiology of Language 2026 (7), a chronic-phase study of 550 left-hemisphere '
      + 'stroke survivors, report that lateral thalamic lesion load did not independently contribute '
      + 'to naming once damage to the neighbouring subcortical-insular and temporoparietal regions was '
      + 'accounted for, and that no thalamic nucleus showed an additive effect. Rangus et al., '
      + 'Communications Biology 2024;7:700, associate the left ventral anterior and ventrolateral '
      + 'nuclei with aphasia after thalamic stroke, and specifically with semantic and phonemic '
      + 'fluency tasks and complex comprehension, by lesion-symptom and lesion-network mapping.',
    sourceVerification: VERIFICATION.SEARCH_SUMMARY,
    claimSupport: CLAIM_SUPPORT.CONSISTENT,
    validation: 'physiology: the thalamus is not an obligatory gate, and its absence is not "no effect"',
    layer: LAYER.EXTERNAL,
    doesNotEstablish:
      'That a thalamic lesion has no effect on language. The 2024 study is an association, its network '
      + 'component is estimated from a normative connectome rather than measured in the patients, and '
      + 'the tasks it implicates are verbal-fluency tests rather than connected-speech fluency. The '
      + 'atlas carries the ventral anterior nucleus and not the ventrolateral, so the structure this '
      + 'model can name is half of the pair. Every language task the preset names carries the '
      + 'uncomputed influence.',
  },
  {
    id: 'the-insula-is-not-the-necessary-centre-for-speech-output',
    claim:
      'A lesion of the whole insular mesh is reported as affecting the spoken output route, and this '
      + 'model takes no position on apraxia of speech.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Hillis et al., Brain 2004;127:1479, examined 40 patients with and 40 without insular damage '
      + 'using acute imaging and perfusion, and found no association between apraxia of speech and '
      + 'lesions of the left insula, anterior insula or the superior tip of the precentral gyrus of '
      + 'the insula; it was associated instead with structural damage or low blood flow in the left '
      + 'posterior inferior frontal gyrus. The anterior-insula proposal is Dronkers, Nature 1996;384:159.',
    sourceVerification: VERIFICATION.SEARCH_SUMMARY,
    claimSupport: CLAIM_SUPPORT.CONSISTENT,
    validation: 'physiology: the insula preset affects the spoken route and claims nothing about speech quality',
    layer: LAYER.EXTERNAL,
    doesNotEstablish:
      'Which region produces apraxia of speech. This model has no speech quality at all, so it cannot '
      + 'test either proposal, and the preset is the whole undivided insular mesh rather than the '
      + 'restricted anterior region either study is about.',
  },
  {
    id: 'the-gerstmann-tetrad-is-not-produced',
    claim:
      'Acalculia, finger agnosia, left-right disorientation and agraphia are not separately '
      + 'implemented, so the tetrad is declared not-modelled and cannot be produced from one gyrus.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Rusconi et al., Annals of Neurology 2009;66:654, found no parietal overlap of the cortical '
      + 'activation patterns for the four domains in healthy subjects, and concluded that the tetrad '
      + 'does not share a common network — its co-occurrence after parietal injury reflecting '
      + 'anatomical proximity of separate fibre tracts in the parietal white matter.',
    sourceVerification: VERIFICATION.SEARCH_SUMMARY,
    claimSupport: CLAIM_SUPPORT.CONSISTENT,
    validation: 'physiology: the angular gyrus does not produce a tetrad',
    layer: LAYER.EXTERNAL,
    doesNotEstablish:
      'That the four never co-occur. What is asserted is that this model may not generate them as a '
      + 'set from one cortical structure, which it used to do.',
  },
  {
    id: 'language-is-left-in-the-representative-right-hander',
    claim:
      'This model assumes left-hemisphere language dominance and refuses any other handedness rather '
      + 'than mirroring the brain.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Standard accounts of hemispheric dominance. Knecht et al., Brain 2000, is the reference for '
      + 'handedness and language dominance not being the same variable; it was not retrieved beyond '
      + 'its citation.',
    sourceVerification: VERIFICATION.TEXTBOOK,
    claimSupport: CLAIM_SUPPORT.STATES,
    validation: 'physiology: language and praxis sit in one hemisphere in a right-handed brain',
    layer: LAYER.EXTERNAL,
    doesNotEstablish:
      'That a given right-hander is left-dominant. The assumption is about the representative case '
      + 'this teaching model places, and it is stated as such rather than derived from handedness.',
  },
  {
    id: 'spatial-attention-is-not-in-the-language-hemisphere',
    claim:
      'Spatial attention is not lateralised with language: the non-dominant parietal lobe is declared '
      + 'to attend to both halves of space and the dominant one to a single half.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Standard clinical descriptions of hemispatial neglect and the right parietal attention system.',
    sourceVerification: VERIFICATION.TEXTBOOK,
    claimSupport: CLAIM_SUPPORT.STATES,
    validation: 'physiology: spatial attention is not in the language hemisphere',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'a-new-memory-needs-one-medial-temporal-lobe',
    claim:
      'Forming new episodic memories requires medial temporal structures on at least one side: '
      + 'unilateral damage does not produce an amnesic syndrome and bilateral damage does.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Standard accounts of the amnesic syndrome and of the hippocampal-fornix-mamillary-anterior thalamic circuit.',
    sourceVerification: VERIFICATION.TEXTBOOK,
    claimSupport: CLAIM_SUPPORT.STATES,
    validation: 'physiology: a new memory needs a medial temporal lobe on one side or the other',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-callosum-carries-the-other-hand',
    claim:
      'Skilled movement of the non-dominant hand depends on the corpus callosum, so a callosal lesion '
      + 'can leave one hand affected while the other is not.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Standard descriptions of callosal disconnection and sympathetic (left-hand) apraxia.',
    sourceVerification: VERIFICATION.TEXTBOOK,
    claimSupport: CLAIM_SUPPORT.STATES,
    validation: 'physiology: the callosum carries the left hand, so cutting it spares the right',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'the-atlas-has-no-splenium',
    claim:
      'The corpus callosum is one undivided mesh, so no preset here is a posterior callosal lesion.',
    confidence: CONFIDENCE.APPROXIMATION,
    source: 'The distributed atlas: one median `Corpus callosum`, with no splenium, body or genu.',
    sourceVerification: VERIFICATION.DESIGN,
    note:
      'An approximation of the substrate. The preset takes the whole commissure and says so in its own '
      + 'label; it used to take an invented 40% share, which read as a splenial lesion while being a '
      + 'fraction of an undivided mesh.',
  },
  {
    id: 'the-writing-route-localisation-is-not-settled',
    claim:
      'The model places whole-word spelling on the dominant angular gyrus and phoneme-to-grapheme '
      + 'conversion on the dominant supramarginal gyrus, and a lesion of either is reported as '
      + 'affecting that route and not the other.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'Roeltgen and Heilman, Brain 1984;107:811, localised lexical agraphia to posterior angular '
      + 'lesions sparing the supramarginal gyrus and phonological agraphia to supramarginal lesions '
      + '(or the insula deep to it) sparing the angular gyrus — four patients in each group, on CT.',
    sourceVerification: VERIFICATION.VIA_REVIEW,
    claimSupport: CLAIM_SUPPORT.NARROWER,
    note:
      'Known weakness, and the direction this part of the model is most likely to mislead in. The '
      + '*functional* dissociation of the two routes is the supported claim; pinning each to one gyrus '
      + 'rests on a small series from 1984, imaged with CT, and the meshes here are whole gyri rather '
      + 'than the parts of them those cases implicated. A reader should not take a lesion of the '
      + 'angular gyrus in this model as evidence about where spelling lives.',
    doesNotEstablish: 'That either gyrus is necessary or sufficient for the route placed on it.',
  },
  {
    id: 'the-prefrontal-patterns-are-not-this-separate-in-people',
    claim: 'The model produces three prefrontal patterns as three separable circuits, each with its own behaviour.',
    confidence: CONFIDENCE.UNCERTAIN,
    source:
      'The circuits are anatomically distinct, but the syndromes named after them overlap heavily in '
      + 'practice: real lesions rarely respect one circuit, and apathy, disinhibition and dysexecutive '
      + 'features commonly appear together.',
    sourceVerification: VERIFICATION.TEXTBOOK,
    claimSupport: CLAIM_SUPPORT.STATES,
    note:
      'Known weakness. It will show a cleaner dissociation than a person presents with. The circuits '
      + 'are the claim; the tidiness of the three pictures is not.',
  },
  {
    id: 'frontal-subcortical-circuits-share-a-signature',
    claim:
      'The prefrontal cortex, striatum, pallidum and mediodorsal thalamus form closed circuits, and a '
      + 'lesion anywhere along one produces the behavioural picture of a lesion of the cortex it '
      + 'starts from.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'The frontal-subcortical circuits as described by Alexander, DeLong and Strick, and the clinical literature on caudate and thalamic infarcts.',
    sourceVerification: VERIFICATION.TEXTBOOK,
    claimSupport: CLAIM_SUPPORT.STATES,
    validation: 'physiology: a frontal–subcortical circuit reads the same wherever it is cut',
    layer: LAYER.EXTERNAL,
    doesNotEstablish:
      'The size of the effect, or that the three circuits come apart in a person as cleanly as they do '
      + 'here. Real lesions rarely respect one circuit.',
  },
  {
    id: 'a-connection-has-a-side',
    claim:
      'A connection takes its integrity from the structures it runs within, on the side it runs on, so '
      + 'a unilateral lesion cannot interrupt the same pathway on the other side.',
    confidence: CONFIDENCE.APPROXIMATION,
    source:
      'A decision, replacing a damage channel keyed by connection id. An id has no side, so selecting '
      + 'one anterior thalamic radiation zeroed all three frontal circuits bilaterally.',
    sourceVerification: VERIFICATION.DESIGN,
    // No `validation` here on purpose. The test that holds it
    // (`physiology: a unilateral lesion does not cut the other side’s
    // connection`) lives in the external layer, and this registry refuses to
    // let a property of the model be asserted as a physiological invariant —
    // which is the right refusal: the arithmetic no longer doubles a one-sided
    // lesion, and that is not a finding about people.
    note:
      'A property of this model, not a guarantee about people: it says the arithmetic no longer '
      + 'doubles a one-sided lesion. It does not say a unilateral lesion spares the function.',
  },
  {
    id: 'availability-is-a-product-of-steps',
    claim:
      'How far a task gets is the product of the integrity of every distinct node and connection on '
      + 'its route, and a task takes the best of the routes it is eligible for.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source:
      'Invented arithmetic. No source gives an availability for a cortical route; the product was '
      + 'chosen because a chain is no better than its worst link.',
    sourceVerification: VERIFICATION.DESIGN,
    note:
      'Illustrative. The number is not a measurement of anything and has no unit. What the model '
      + 'claims is the ordering it produces — more damage transmits less, and damage on one route does '
      + 'not touch another — never the value.',
  },
  {
    id: 'eligibility-is-by-stimulus',
    claim:
      'The maximum is taken over the routes a task is eligible to use for the stimulus it was probed '
      + 'with, so a nonword cannot be rescued by a route through a lexicon.',
    confidence: CONFIDENCE.APPROXIMATION,
    source: 'A decision, and the thing that makes the two writing routes dissociate at all.',
    sourceVerification: VERIFICATION.DESIGN,
    // As above: the dissociation it produces is checked in the external layer
    // under `two-writing-routes`, and the eligibility rule itself is a
    // property of this model rather than a claim about anybody.
    note:
      'A property of this model. Which route a given person would use for a given word is not '
      + 'something it predicts.',
  },
  {
    id: 'the-two-band-cut-points',
    claim: 'Where an availability stops being called high and starts being called intermediate, and then low.',
    confidence: CONFIDENCE.CALIBRATION,
    source:
      'A calibration this repository chose so that a half-taken lesion reads as the middle band and a '
      + 'structure completely gone reads as the bottom one.',
    sourceVerification: VERIFICATION.DESIGN,
    note:
      'Calibration. Two cut points on a dimensionless scale. `low` is the bottom band and not an '
      + 'abolished function: only `declaredBlock`, which needs an element at exactly zero, says a '
      + 'route in this model is stopped — and that is still a statement about the model.',
  },
  {
    id: 'one-mesh-per-named-structure',
    claim:
      'A lesion is declared as named structures of the atlas, whole or as a stated share of one, '
      + 'because a named mesh is the smallest thing the atlas can show.',
    confidence: CONFIDENCE.APPROXIMATION,
    source:
      'The distributed atlas: the precentral gyrus is one mesh with no somatotopy, and the insula is '
      + 'one mesh with no anterior subdivision.',
    sourceVerification: VERIFICATION.DESIGN,
    note:
      'An approximation of the substrate, not of the medicine. A precentral lesion takes the mouth and '
      + 'the hand together, which is why the pen is its own stage and is not called agraphia. Each '
      + 'preset whose meaning depends on a finer division carries the limit in its own declaration.',
  },
]);

/** @see src/models/cardiacOutput.js, docs/model-evidence/cardiac-output.md */
export const CARDIAC_OUTPUT_EVIDENCE = defineEvidence('cardiac-output', [
  {
    id: 'stroke-volume-definition',
    claim: 'Stroke volume is end-diastolic minus end-systolic volume, and cardiac output is heart rate times stroke volume with mL converted to L.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Standard haemodynamic definitions.',
    validation: 'stroke volume, ejection fraction and cardiac output are what their names mean',
    layer: LAYER.INTEGRITY,
  },
  {
    id: 'mean-arterial-pressure-is-an-integral',
    claim: 'Mean arterial pressure is the time average of the arterial pressure over the beat, not the diastolic-plus-a-third estimate.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Definition of a mean; the bedside estimate is a separate approximation with its own error.',
    validation: 'mean arterial pressure is the mean of the arterial pressure',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'systemic-pressure-flow-resistance',
    claim: 'The mean pressure drop across the systemic bed equals the mean flow through it times its resistance, in mmHg·s/mL.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Steady-flow relation ΔP = Q·R, which the model integrates rather than asserts.',
    validation: 'the pressure drop across the systemic bed is its flow times its resistance',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'valve-timing-from-flow',
    claim: 'The window named as ejection is the window in which the aortic valve is carrying flow, so the isovolumic periods are solved rather than assumed.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Definition of ejection; the alternative is a fixed fraction of the cycle, which is a drawing convention.',
    validation: 'the aortic valve is open exactly while the ventricle is ejecting',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'afterload-lowers-stroke-volume',
    claim: 'With filling, contractility and rate held, raising systemic vascular resistance lowers stroke volume and raises the pressure the ventricle must generate.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Time-varying elastance framework; Suga and Sagawa (1974) for the end-systolic pressure-volume relationship the behaviour follows from. The direction is supported; the size of the fall in this model is not calibrated to any measurement.',
    validation: 'raising afterload alone lowers stroke volume and raises ventricular pressure',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'contractility-raises-residual-volume',
    claim: 'Lowering end-systolic elastance alone leaves more blood in the ventricle at end systole, lowers ejection fraction and raises end-diastolic pressure.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Time-varying elastance framework; Suga and Sagawa (1974). The direction is supported. The elastance value used for the reduced-contractility preset is a teaching choice, not a measured patient value, and the preset is not a model of the heart-failure syndrome.',
    validation: 'a ventricle with lower contractility ejects less from the same filling conditions',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'filling-costs-pressure',
    claim: 'Because the end-diastolic pressure-volume relationship is exponential, each further increment of filling buys less output than the last while costing more filling pressure.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Shape of the non-linear EDPVR; the curvature constant is this repository\u2019s. The model asserts the shape, never where a person\u2019s useful limit lies, and it is not a fluid-responsiveness test.',
    validation: 'filling more raises filling pressure faster than it raises output',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'settled-beat-or-no-numbers',
    claim: 'A condition is reported only when all seven compartments repeat over a beat, the conserved volume closes, no valve ran backwards and aortic throughput matches the stroke volume; otherwise no figures are produced at all.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Definition of a periodic steady state, and of volume conservation in a closed loop.',
    validation: 'every condition in the declared domain settles into a genuinely periodic beat',
    layer: LAYER.INTEGRITY,
  },
  {
    id: 'resistance-unit-conversion',
    claim: 'Resistance in mmHg\u00b7s/mL and in dyn\u00b7s\u00b7cm\u207b\u2075 are the same quantity, related by the mmHg-to-dyn/cm\u00b2 factor and nothing else.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Unit definitions; checked against the independent bedside route SVR = 80\u00b7(MAP\u2212CVP)/CO.',
    validation: 'resistance converts between the model unit and the clinical one, checked two ways',
    layer: LAYER.INTEGRITY,
  },
  {
    id: 'reference-heart-parameters',
    claim: 'The reference condition — elastance 2.74 mmHg/mL, stressed volume 710 mL, systemic resistance 1.1 mmHg\u00b7s/mL, rate 70/min — produces a beat in the range a healthy adult is described by.',
    confidence: CONFIDENCE.CALIBRATION,
    source: 'Chosen so that the reference case lands where the textbooks put a normal adult; the same values the heart-failure model starts its progression from. Nobody measured them.',
    note: 'These are calibration parameters of a lumped seven-compartment model, not measurements of a person. Reading the elastance against a clinically derived Ees would be reading a fitted constant as a finding.',
  },
  {
    id: 'reduced-contractility-preset-magnitude',
    claim: 'The reduced-contractility preset lowers end-systolic elastance to 1.2 mmHg/mL and changes nothing else.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'Chosen so the difference is legible on screen at the reference filling; no source sets this value and none was sought.',
    note: 'Illustrative. The model claims the direction and the mechanism, never the size of the fall, and this preset is not a representation of any clinical syndrome or of any patient.',
  },
  {
    id: 'stressed-volume-is-not-blood-volume',
    claim: 'The conserved quantity is stressed volume plus the chambers\u2019 contents, which is what generates pressure.',
    confidence: CONFIDENCE.APPROXIMATION,
    source: 'Standard lumped-parameter treatment of unstressed and stressed volume, applied to a seven-compartment loop with no venous tone, no interstitium and no lymphatic return.',
    note: 'Not total blood volume, and a change in it is not a volume of fluid given to anybody. The model has no compartment fluid could leave to, so it must not be read as a fluid balance.',
  },
  {
    id: 'intervention-is-an-input-change',
    claim: 'An intervention changes the model\u2019s inputs and the solver produces whatever follows; no output is multiplied.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'A property of the implementation, and the one this module exists to hold.',
    validation: 'an intervention changes inputs, and nothing else in the pipeline',
    layer: LAYER.INTEGRITY,
  },
  {
    id: 'dobutamine-direction-and-rate',
    claim: 'In the cited heart-failure cohort, dobutamine raised cardiac output by raising stroke volume, lowered systemic vascular resistance and lowered filling pressure, with no change in heart rate over 2.5\u201310 \u00b5g/kg/min.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Leier et al., Circulation 1978;58:466\u2013475 \u2014 thirteen patients with cardiomyopathic heart failure, crossover. Read here as the published abstract only; the full text was not obtained. **thin.**',
    validation: 'dobutamine reproduces the directions the cited study reports',
    layer: LAYER.EXTERNAL,
    note: 'A phenotype-specific direction at one dose range, not a general treatment effect and not a magnitude. The unchanged heart rate is the study\u2019s finding in that range; at higher doses and in other populations dobutamine is chronotropic and arrhythmogenic, and neither is modelled.',
  },
  {
    id: 'intervention-response-sizes',
    claim: 'Dobutamine multiplies end-systolic elastance by 1.5 and systemic resistance by 0.85; the volume intervention adds 120 mL of stressed volume.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source for these magnitudes; illustrative values chosen so the contrast between the two interventions is legible on screen.',
    validation: 'calibration: the cardiac-output interventions keep their chosen illustrative sizes',
    layer: LAYER.CALIBRATION,
    note: 'Illustrative. These are not doses, cannot be combined, and must never be read as the response a person would have. The cited study\u2019s own effect sizes are not transferable to this model\u2019s parameters.',
  },
  {
    id: 'volume-intervention-is-not-fluid',
    claim: 'The volume intervention raises the model\u2019s circulating stressed volume by one schematic step.',
    confidence: CONFIDENCE.APPROXIMATION,
    source: 'Standard lumped treatment of stressed volume, applied to a closed loop with no interstitium, no lymphatics and no venous tone.',
    note: 'Not a fluid bolus. The model has no compartment fluid could leave to, so it cannot say how much anyone should be given, at what rate, or whether they should be.',
  },
  {
    id: 'resistance-lesson-direction',
    claim: 'With filling, contractility and rate held, raising systemic vascular resistance lowers stroke volume and cardiac output while mean arterial pressure rises, and the fractional loss of stroke volume is larger in the lower-elastance ventricle.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Follows from the time-varying elastance framework rather than from a measurement; the lesson\u2019s stored answers are re-derived from the solver on every run.',
    validation: 'the resistance lesson teaches what the model actually does',
    layer: LAYER.EXTERNAL,
  },
  {
    id: 'phase-scaled-systole',
    claim: 'Systolic duration is a fixed fraction of the cycle, so raising the rate compresses systole and diastole in the same proportion.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'A property of the activation function, which is defined on normalised phase. In a real heart systole shortens proportionally less than diastole as rate rises.',
    note: 'Known to point the wrong way: loss of diastolic filling time with tachycardia is under-represented here, so the rate at which filling begins to limit output is later in this model than in a person. The rate control is bounded and this limitation is on the scene\u2019s scope panel; narrowing the range would not remove it.',
  },
  {
    id: 'no-reflex-regulation',
    claim: 'Each control acts alone: nothing in the model responds to the pressure or the flow that results.',
    confidence: CONFIDENCE.UNCERTAIN,
    source: 'No baroreflex, no chemoreflex, no neurohormonal axis and no autoregulation are implemented.',
    note: 'This is what makes a one-factor experiment readable, and it is also the largest gap between the model and a person: in a person none of these four can be moved without the others responding. Nothing here may be read as what would happen to a patient.',
  },
]);

export const EVIDENCE_REGISTRIES = [
  CIRCULATION_EVIDENCE,
  CARDIAC_OUTPUT_EVIDENCE,
  HIGHER_BRAIN_FUNCTION_EVIDENCE,
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
  GOITRE_EVIDENCE,
  KNEE_OA_EVIDENCE,
  ACL_EVIDENCE,
  CUFF_EVIDENCE,
  HIP_OA_EVIDENCE,
  URINARY_OBSTRUCTION_EVIDENCE,
  LOBAR_COLLAPSE_EVIDENCE,
  LUMBAR_DISC_EVIDENCE,
  RETINAL_DETACHMENT_EVIDENCE,
  CATARACT_EVIDENCE,
  BPPV_EVIDENCE,
  PRESSURE_INJURY_EVIDENCE,
  BREAST_LESION_EVIDENCE,
];
