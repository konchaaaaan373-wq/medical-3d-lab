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
   * A claim the model makes that the sources do not settle, or that is known
   * to point the wrong way under some conditions. Recorded rather than removed,
   * because a reader is better served by a marked weakness than by silence.
   */
  UNCERTAIN: 'uncertain',
};

const LEVELS = new Set(Object.values(CONFIDENCE));

/** Levels a scene may present as if it were a clinical fact. */
export const ASSERTABLE = new Set([CONFIDENCE.ESTABLISHED, CONFIDENCE.SUPPORTED]);

/**
 * Validates a scene's registry as it is defined, so a malformed entry fails at
 * import rather than in a test that might not be looking.
 *
 * @param {string} scene
 * @param {{id:string, claim:string, confidence:string, source:string,
 *          validation?:string, note?:string}[]} entries
 */
export function defineEvidence(scene, entries) {
  const seen = new Set();
  for (const entry of entries) {
    if (!entry.id || seen.has(entry.id)) throw new Error(`${scene}: duplicate or missing evidence id "${entry.id}"`);
    seen.add(entry.id);
    if (!LEVELS.has(entry.confidence)) {
      throw new Error(`${scene}: "${entry.id}" has confidence "${entry.confidence}", which is not one of the five`);
    }
    if (!entry.claim || !entry.source) throw new Error(`${scene}: "${entry.id}" needs a claim and a source`);
    if (!ASSERTABLE.has(entry.confidence) && !entry.note) {
      throw new Error(`${scene}: "${entry.id}" is ${entry.confidence} and must say what it is not`);
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
  },
  {
    id: 'insufficient-expiratory-time',
    claim:
      'When the expiratory time available falls below what the time constant needs, the lung does not finish emptying and end-expiratory volume rises. Raised airway resistance alone, at a fixed breathing pattern and a fixed expiratory effort, is sufficient — loss of elastic recoil is not a precondition.',
    confidence: CONFIDENCE.ESTABLISHED,
    source:
      'Dynamic hyperinflation literature; demonstrated directly by methacholine-induced bronchoconstriction in asthma (PMID 10515404), where dynamic hyperinflation and expiratory flow limitation occur in lungs with normal elastic recoil.',
    validation: 'physiology: raised airway resistance alone raises end-expiratory volume',
  },
  {
    id: 'flow-limitation',
    claim:
      'Maximal expiratory flow is set by elastic recoil and the resistance of the collapsible airway upstream of the equal pressure point, and contains no effort term. Below that ceiling, expiratory muscle pressure does empty the lung further.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'The equal-pressure-point account of expiratory flow limitation; standard respiratory mechanics.',
    validation: 'physiology: the flow ceiling contains no effort term at all',
  },
  {
    id: 'recoil-and-tethering',
    claim:
      'Losing elastic recoil lowers the flow ceiling by more than the loss of driving pressure alone would explain, because the alveolar attachments that store the recoil also tether the collapsible airways open.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Emphysema mechanics; reviews of hyperinflation and exercise in COPD (O’Donnell and colleagues); GOLD 2026.',
    validation: 'physiology: losing elastic recoil lowers the flow ceiling more than it lowers recoil',
  },
  {
    id: 'exercise-hyperinflation',
    claim:
      'Tachypnoea shortens expiratory time before it shortens anything else, so exercise progressively raises end-expiratory volume in an obstructed lung and lowers it in a healthy one.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Reviews of dynamic hyperinflation and exercise limitation in COPD; inspiratory capacity as its clinical measure.',
    validation: 'physiology: an obstructed lung hyperinflates when the expiratory time is taken away',
  },
  {
    id: 'reference-lung',
    claim: 'Reference volumes and a normal expiratory time constant of roughly half a second.',
    confidence: CONFIDENCE.CALIBRATION,
    source: 'Textbook central values for an adult; expiratory time-constant literature.',
    note: 'Chosen so the reference lung lands on textbook central values. Not a measurement of any person, and never to be read as one.',
  },
  {
    id: 'tethering-exponent',
    claim: 'The upstream resistance rises as recoil^-2.5 as elastic recoil is lost.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. Chosen to put a lung at two thirds of normal recoil at about 2.5× the upstream resistance.',
    note: 'An invented exponent. The model claims the direction and the asymmetry it produces, never the value.',
  },
  {
    id: 'bronchodilator-split',
    claim: 'A full bronchodilator response lowers total resistance by 28% and upstream resistance by 10%.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source for the sizes. The *asymmetry* is standard teaching: no drug restores destroyed alveolar attachments.',
    note: 'Two invented percentages. What is claimed is that the first is much larger than the second.',
  },
  {
    id: 'workload-expiratory-recruitment',
    claim: 'Expiratory muscle pressure recruited by the workload rises with the square of the demand, to 9 cmH₂O.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. Abdominal recruitment with exercise is standard; the size is not.',
    note: 'Invented. It exists so that "a fixed expiratory effort" is a condition the model can be held to, and it is deliberately independent of the inspiratory drive.',
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
    id: 'fourth-power',
    claim: 'Airway resistance goes as the fourth power of the radius, so a small narrowing is a large cost.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Poiseuille’s law, used as a relative statement about the exponent only.',
    validation: 'physiology: raising smooth-muscle activation narrows the airways',
  },
  {
    id: 'muscle-throughout',
    claim:
      'Airway smooth muscle is present from the trachea — as trachealis in the posterior membranous wall — to the terminal bronchioles. Asthma involves the whole airway tree, not the small airways alone.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Standard airway anatomy; reviews of airway smooth muscle distribution (PMC9581182); GINA 2026.',
    validation: 'physiology: airway smooth muscle is present at every generation of the tree',
  },
  {
    id: 'cartilage-falls-away',
    claim:
      'Cartilage support falls away distally — complete rings, then plates, then none — so the same muscle shortening changes a small airway’s calibre far more than a central one’s.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Standard airway anatomy.',
    validation: 'physiology: what falls away distally is the cartilage, not the muscle',
  },
  {
    id: 'self-organised-patchiness',
    claim:
      'A uniform stimulus applied to a network with minimal structural heterogeneity, a steep local response and interdependence between an airway and the parenchyma around it can produce clustered ventilation defects.',
    confidence: CONFIDENCE.SUPPORTED,
    source:
      'Venegas et al., Nature 434:777–82 (2005), doi:10.1038/nature03490; Winkler & Venegas, "Mathematical Modeling of Ventilation Defects in Asthma" (PMC4698910); "The role of heterogeneity in asthma: a structure-to-function perspective" (PMC5543015).',
    validation: 'physiology: a uniform stimulus on a nearly-uniform tree produces clustered defects',
    note: 'A published proposal that this model illustrates. It is not their model and reproduces none of their results.',
  },
  {
    id: 'feedback-is-the-cause',
    claim: 'The clustering comes from the feedback loop, not from the scatter built into the tree.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'The same modelling literature; made falsifiable here by solving with the tethering term frozen.',
    validation: 'physiology: disabling the interdependence feedback markedly attenuates the clustering',
  },
  {
    id: 'tethering-direction',
    claim: 'Increasing lung volume increases the parenchymal tethering forces that oppose airway narrowing.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Airway–parenchymal interdependence; standard respiratory mechanics.',
    validation: 'physiology: greater lung inflation increases the tethering that opposes narrowing',
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
    note: 'Invented, and the single parameter this model’s behaviour is most sensitive to. Raise it and the whole lung tips at once; lower it and it never goes patchy.',
  },
  {
    id: 'response-steepness',
    claim: 'The single-airway dose-response has a steepness of 6.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source. A smooth-muscle dose-response is sigmoid; its steepness here is chosen.',
    note: 'Invented. Needed with the feedback loop to produce a knee rather than a slope.',
  },
  {
    id: 'inherited-sensitivity',
    claim: 'Seven tenths of a branch’s responsiveness is inherited from its parent.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source for the share. That airway inflammation is regional rather than per-airway is standard.',
    note: 'Invented. Without some inheritance the model produces speckle instead of the clustered defects imaging shows; the claim is that some is inherited, not how much.',
  },
  {
    id: 'maximum-narrowing',
    claim: 'A fully contracted airway loses 62% of its radius.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'No source at all — the number was chosen, not found.',
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
    validation: 'haemodynamics: flow is conserved at the portal vein in every configuration',
  },
  {
    id: 'initiating-mechanism',
    claim:
      'Increased intrahepatic vascular resistance is the initiating mechanism of portal hypertension, and it raises the gradient on its own.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Pathophysiology reviews of portal hypertension (PMC2999290, PMC3971388, PMC3000670); Baveno VII (PMC11090185).',
    validation: 'haemodynamics: raising intrahepatic resistance raises the portal pressure gradient',
  },
  {
    id: 'perpetuating-mechanism',
    claim:
      'Chronic portal hypertension induces splanchnic vasodilation and a hyperdynamic circulation; the resulting increase in portal inflow maintains and worsens the pressure. It is a secondary feed-forward loop, not a parallel cause.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'The same pathophysiology reviews.',
    validation: 'haemodynamics: increased inflow at a fixed hepatic resistance raises the gradient too',
    note: 'The model has no time in it, so the vasodilation is a control rather than a consequence. The order is supplied by the walk-through and stated there.',
  },
  {
    id: 'collaterals-do-not-decompress',
    claim:
      'A portosystemic collateral network redistributes portal flow and does not resolve portal hypertension, because it removes neither the raised intrahepatic resistance nor the raised splanchnic inflow.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Portosystemic collateral literature; the same pathophysiology reviews.',
    validation: 'haemodynamics: the reason the pressure stays up is that nothing generating it has moved',
    note: 'Explicitly *not* the claim that collaterals are always high-resistance. Some spontaneous shunts are wide and carry very large flows.',
  },
  {
    id: 'hvpg-approximation',
    claim:
      'HVPG = WHVP − FHVP. In sinusoidal portal hypertension WHVP approximates sinusoidal pressure, so HVPG reflects the part of the gradient lying across the sinusoids and under-reads whatever lies upstream of them.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'HVPG measurement literature; Baveno VII.',
    validation: 'haemodynamics: HVPG tracks the sinusoidal component and not the presinusoidal one',
    note: 'An approximation, not a direct measurement of sinusoidal pressure. The model idealises it.',
  },
  {
    id: 'presinusoidal-vs-prehepatic',
    claim:
      'Presinusoidal intrahepatic portal hypertension (schistosomiasis, porto-sinusoidal vascular disease, the presinusoidal component of some cholestatic disorders) and prehepatic portal hypertension (portal vein thrombosis) share the measurement consequence and not the anatomy.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Standard classification of portal hypertension by site; Baveno VII.',
    validation: 'haemodynamics: presinusoidal intrahepatic and prehepatic are named as different things',
    note: 'Only the presinusoidal intrahepatic pattern is modelled. There is no extrahepatic portal obstruction in this model.',
  },
  {
    id: 'baveno-thresholds',
    claim:
      'An HVPG above 5 mmHg is portal hypertension; ≥10 mmHg is clinically significant portal hypertension. Both are defined on HVPG and established in compensated advanced chronic liver disease of sinusoidal aetiology.',
    confidence: CONFIDENCE.ESTABLISHED,
    source: 'Baveno VII (PMC11090185).',
    validation: 'haemodynamics: the thresholds are Baveno VII’s, read on HVPG, and 12 mmHg is not among them',
  },
  {
    id: 'twelve-mmhg-context',
    claim:
      '12 mmHg belongs to the classic association between HVPG and variceal bleeding, and to the post-TIPS haemodynamic target for a shunt placed to treat variceal bleeding. It is not a general decompensation threshold.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'Variceal bleeding and TIPS literature.',
    validation: 'haemodynamics: a fully dilated shunt reaches the post-TIPS target, and costs hepatic perfusion',
    note: 'Confined to that context in code, and absent from the HVPG band boundaries entirely.',
  },
  {
    id: 'reference-resistances',
    claim: 'Splanchnic, sinusoidal and presinusoidal reference resistances.',
    confidence: CONFIDENCE.CALIBRATION,
    source: 'Chosen so a healthy liver produces a gradient of about 3 mmHg at about 1000 mL/min.',
    note: 'No measurement of an intrahepatic resistance exists for a person. These are the numbers that hit a target, and are never a measurement.',
  },
  {
    id: 'dynamic-share',
    claim: 'The dynamic, reversible component is up to 30% of what the structure already costs.',
    confidence: CONFIDENCE.SUPPORTED,
    source: 'The 20–30% figure is repeated across the pathophysiology reviews.',
    validation: 'the dynamic component is a share of what the structure already costs',
    note: 'Expressing it as a share of the structural resistance rather than as a fixed addition is a modelling choice, and it makes the dynamic component worth more in a badly scarred liver. That direction is right; the size is borrowed.',
  },
  {
    id: 'collateral-conductance-mapping',
    claim: 'Established collateral conductance is mapped from the gradient by a sigmoid centred on 10 mmHg with a width of 2.2 mmHg.',
    confidence: CONFIDENCE.ILLUSTRATIVE,
    source: 'The centre is the clinically significant threshold, borrowed as a plausible midpoint. The width has no source.',
    note:
      'An equilibrium mapping onto a chronic process — dilatation of pre-existing channels, remodelling, angiogenesis, over months to years. **Not** a law that opens collaterals at a pressure, and nothing in the model or the scene may describe it as one.',
  },
  {
    id: 'collateral-and-shunt-resistance',
    claim: 'Resistances of a fully established collateral bed and of a fully dilated TIPS.',
    confidence: CONFIDENCE.CALIBRATION,
    source: 'Chosen so an established-cirrhosis configuration lands in the reported HVPG range and a full shunt reaches the post-TIPS target.',
    note: 'Calibrations. In particular the collateral resistance is not evidence that collaterals are high-resistance in general.',
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
