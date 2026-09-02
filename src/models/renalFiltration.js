import { fixedPoint } from './integrate.js';

/**
 * Glomerular filtration and tubular mass balance.
 *
 * The question this model exists to answer: **when filtration fails, where in
 * the nephron did it fail, and how would you tell from the outside?**
 *
 * "The kidney is failing" is one sentence covering several unrelated
 * mechanisms, and the bedside numbers that separate them — the fractional
 * excretion of sodium, the urea-to-creatinine ratio, the urine sodium, the
 * urine osmolality — are not independent facts to memorise. They are all
 * consequences of two things: the Starling balance across one glomerular
 * capillary, and what the tubule downstream does with the filtrate.
 *
 * So this model solves those two, once, and every number it reports is a
 * reading of the same solved state. That is the point of it: a learner who has
 * been told that pre-renal failure gives a low FENa has been told a fact; a
 * learner who can *raise the afferent resistance and watch the FENa fall,
 * because filtration fraction rose and the proximal tubule reabsorbs more when
 * it does*, has been shown a mechanism.
 *
 * ## The four places it can go wrong, and they are genuinely different
 *
 * 1. **Before the glomerulus.** Perfusion pressure falls, or the afferent
 *    arteriole constricts. Filtration pressure falls with it. The tubule is
 *    intact and avid, so almost no sodium escapes.
 * 2. **At the glomerulus itself.** Fewer nephrons (chronic disease), or a
 *    barrier that has stopped being selective (nephrotic disease). The first
 *    lowers total filtration while each remaining nephron filters *more*; the
 *    second barely changes filtration at all and loses protein instead.
 * 3. **In the tubule.** Injured epithelium cannot reabsorb. Sodium escapes,
 *    urine cannot be concentrated, and the numbers invert.
 * 4. **After the tubule.** Obstruction raises the pressure in Bowman's space,
 *    which subtracts directly from the filtration pressure — the one term in
 *    the Starling equation that a blockage downstream can reach.
 *
 * Each of those is a separate control here, because a model in which they were
 * one "severity" slider could not teach the thing worth teaching.
 *
 * ## Units
 *
 * Pressures in mmHg. Flows in mL/min, which is how renal physiology is
 * written, with single-nephron flows in nL/min. Concentrations in the units
 * they are reported in clinically — sodium in mmol/L, creatinine in mg/dL,
 * protein in g/dL — because a model that quotes creatinine in mol/m³ is a
 * model nobody will check against what they know.
 *
 * ## What this is not
 *
 * An educational conceptual model. It solves a **steady state**, and several
 * of the most clinically important things about kidney failure are precisely
 * that it is *not* in steady state — plasma creatinine takes days to reach the
 * value a new GFR implies, which is why creatinine is a lagging indicator and
 * why this model's creatinine must never be read as "the creatinine this
 * patient has today". The full boundary is in
 * `docs/model-cards/renal-filtration.md`; the sources for the constants are in
 * `docs/model-evidence/renal-filtration.md`.
 */

// ---------------------------------------------------------------------------
// Reference physiology
// ---------------------------------------------------------------------------

/**
 * The reference adult. Textbook central values, not measurements from a
 * person, and the model card says so.
 */
export const REFERENCE = {
  /** Mean arterial pressure at the renal artery, mmHg. */
  meanArterialPressureMmHg: 100,
  /** Renal venous pressure, mmHg. */
  renalVenousPressureMmHg: 8,
  /** Hydrostatic pressure in Bowman's space, mmHg. */
  bowmanPressureMmHg: 15,
  /** Haematocrit, as a fraction. Only plasma is filtered. */
  haematocrit: 0.45,
  /** Total plasma protein, g/dL — what sets the oncotic pressure opposing filtration. */
  plasmaProteinGDl: 7,
  /** Plasma albumin, g/L, for the protein-loss mass balance. */
  plasmaAlbuminGL: 40,
  /** Plasma sodium, mmol/L. */
  plasmaSodiumMmolL: 140,
  /** Plasma urea, mmol/L. Reported below as BUN in mg/dL, as it is clinically. */
  plasmaUreaMmolL: 5,
  /** Nephrons across both kidneys. */
  nephronCount: 2_000_000,
  /**
   * Daily urinary solute that is neither sodium nor urea: potassium, ammonium,
   * phosphate, sulphate and the rest, mOsm/day.
   *
   * Sodium and urea are computed by the model, so only the remainder is
   * assumed. Fixing it is a statement about diet, which is not what this model
   * is about — but it has to be counted, because it is a third of the solute
   * that sets urine volume.
   */
  otherUrinarySoluteMosmPerDay: 150,
  /** Creatinine production, mg/day. Muscle mass, effectively constant. */
  creatinineProductionMgPerDay: 1400,
};

/**
 * Vascular resistances of one kidney's worth of arterioles, mmHg·min/mL.
 *
 * Three in series: afferent arteriole, efferent arteriole, peritubular bed.
 * Splitting the post-glomerular path in two is not decoration — the efferent
 * arteriole is the only vessel in the body whose constriction *raises* the
 * pressure upstream of it while lowering flow, and that behaviour is the whole
 * reason an ACE inhibitor drops GFR in a stenotic kidney. A single lumped
 * downstream resistance could not show it.
 *
 * The values are chosen so the reference kidney solves to a renal blood flow
 * near 1200 mL/min, a glomerular capillary pressure near 60 mmHg and a GFR
 * near 125 mL/min. They are calibration constants, not measurements.
 */
export const RESISTANCE = {
  afferent: 0.0333,
  efferent: 0.0391,
  peritubular: 0.0093,
};

/**
 * Glomerular ultrafiltration coefficient, mL/min/mmHg, across both kidneys.
 *
 * Calibrated so that the reference kidney lands on a GFR of about 125 mL/min
 * given the mean filtration pressure the solver finds. Textbooks quote around
 * 12.5 alongside a net pressure of 10 mmHg; this model computes the mean
 * oncotic pressure along the capillary rather than assuming it, arrives at a
 * slightly higher opposing pressure, and so needs a slightly lower Kf to reach
 * the same GFR. Neither number is a measurement of a person.
 */
export const FILTRATION_COEFFICIENT = 9.05;

/**
 * Fraction of the filtered sodium load reabsorbed by the proximal tubule at
 * reference, and how strongly that tracks peritubular oncotic pressure.
 *
 * The link is the mechanism behind the single most-used number in acute kidney
 * injury. Raising filtration fraction concentrates the protein left behind in
 * the efferent blood; that blood becomes the peritubular capillary supply; the
 * higher oncotic pressure there pulls more reabsorbate out of the interstitium
 * and so raises proximal reabsorption. Pre-renal states raise filtration
 * fraction, therefore they raise proximal reabsorption, therefore the sodium
 * that reaches the urine falls. FENa below 1 % is not a rule to memorise —
 * it is this.
 */
export const PROXIMAL = {
  referenceFraction: 0.67,
  /** Exponent on (π_efferent / π_efferent,ref). Calibration, not measurement. */
  oncoticSensitivity: 0.55,
  /** Bounds, because glomerulotubular balance is not unlimited. */
  minFraction: 0.35,
  maxFraction: 0.85,
};

/**
 * What the loop, distal tubule and collecting duct do with the sodium that
 * escapes the proximal tubule.
 *
 * Expressed as the fraction that escapes *them*, because that is the quantity
 * tubular injury acts on and the quantity FENa is built from.
 */
export const DISTAL = {
  /** Escape fraction at reference. Chosen so the reference FENa is ~0.7 %. */
  referenceEscape: 0.0212,
  /** Bound: even a destroyed tubule is not a length of open pipe. */
  maxEscape: 0.55,
};

/** Urea handling. Reabsorption is flow-dependent, and that is the point. */
export const UREA = {
  /** Fraction of filtered urea excreted at reference tubular flow. */
  referenceFractionalExcretion: 0.5,
  /**
   * How strongly fractional excretion follows tubular flow.
   *
   * Urea is reabsorbed passively, so it has time to diffuse back when the
   * filtrate moves slowly. Slow filtrate is exactly what a dehydrated kidney
   * has, which is why urea rises out of proportion to creatinine in pre-renal
   * failure — and why the ratio is useless once the tubule is injured, since
   * an injured tubule cannot reabsorb it however slowly it flows.
   */
  flowSensitivity: 0.45,
  /** Exponent on 1/tubularHealth. Calibration, not measurement. */
  injurySensitivity: 0.9,
  minFractionalExcretion: 0.15,
  maxFractionalExcretion: 0.85,
};

/** Albumin handling across the barrier and in the proximal tubule. */
export const ALBUMIN = {
  /** Sieving coefficient of the intact barrier. Dimensionless, and tiny. */
  referenceSieving: 0.00006,
  /** Maximal proximal reabsorption of filtered albumin, g/day. */
  reabsorptionMaxGPerDay: 0.5,
  /** Half-saturation of that reabsorption, g/day. */
  reabsorptionHalfGPerDay: 0.1,
};

/** Urinary concentration, mOsm/kg. */
export const CONCENTRATION = {
  /** What a healthy kidney reaches when it is conserving water. */
  maximumOsmolality: 1200,
  /** Plasma osmolality — where a kidney that cannot concentrate ends up. */
  isosthenuric: 300,
  /** The reference kidney's working osmolality, giving ~1 L/day of urine. */
  referenceOsmolality: 600,
};

/**
 * How much the remaining nephrons dilate when nephrons are lost.
 *
 * A kidney that has lost half its nephrons does not lose half its GFR. The
 * survivors vasodilate and each filters more, which is why chronic kidney
 * disease is silent for so long — and why the compensation is also the injury,
 * since a nephron filtering at twice its design rate does not last.
 *
 * Bounded: the reserve is real and finite.
 */
export const REMNANT_HYPERFILTRATION = {
  /** Afferent resistance falls by this power of the nephron fraction. */
  exponent: 0.45,
  /** The most the afferent arteriole can dilate, as a resistance multiplier. */
  minimumResistanceMultiplier: 0.45,
};

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

/**
 * Everything a scene may vary.
 *
 * Each names a place a kidney fails, not a severity. A single "how bad is it"
 * slider would produce the same numbers for a dehydrated kidney and a poisoned
 * one, which is the mistake the whole model exists to prevent.
 */
export const DEFAULT_CONTROLS = {
  /** Mean arterial pressure at the renal artery, mmHg. Shock, or a clamp. */
  meanArterialPressureMmHg: REFERENCE.meanArterialPressureMmHg,
  /**
   * Afferent arteriolar resistance, as a multiple of reference.
   *
   * Above 1 is constriction — a non-steroidal anti-inflammatory taking away
   * the prostaglandin dilation, or the sympathetic response to volume loss.
   * Below 1 is the dilation that maintains GFR when perfusion falls, and the
   * reserve that runs out.
   */
  afferentToneMultiplier: 1,
  /**
   * Efferent arteriolar resistance, as a multiple of reference.
   *
   * Above 1 is angiotensin II holding filtration pressure up when perfusion is
   * poor. Below 1 is an ACE inhibitor or an ARB taking that support away —
   * which is why those drugs drop GFR precisely in the kidney that was
   * depending on them.
   */
  efferentToneMultiplier: 1,
  /** Fraction of nephrons still working, 1 to ~0.05. Chronic disease. */
  functioningNephronFraction: 1,
  /**
   * Integrity of the tubular epithelium, 1 (intact) to ~0.1 (acute tubular
   * necrosis). Reabsorption and concentration both depend on it.
   */
  tubularHealth: 1,
  /**
   * Permselectivity of the filtration barrier, as a multiple of the reference
   * albumin sieving coefficient. Around 10 is the nephrotic range.
   */
  barrierPermeability: 1,
  /**
   * Obstruction downstream, 0 to 1, expressed through the pressure it raises
   * in Bowman's space. The one term in the Starling equation that a blockage
   * *below* the glomerulus can reach.
   */
  outflowObstruction: 0,
  /** Total plasma protein, g/dL. Falls in nephrotic disease. */
  plasmaProteinGDl: REFERENCE.plasmaProteinGDl,
  /** Plasma albumin, g/L. Falls with sustained protein loss. */
  plasmaAlbuminGL: REFERENCE.plasmaAlbuminGL,
  /** Plasma sodium, mmol/L. The filtered load is GFR times this. */
  plasmaSodiumMmolL: REFERENCE.plasmaSodiumMmolL,
  /**
   * Aldosterone activity, 1 at reference.
   *
   * The volume-depleted body's answer to losing salt, acting on the distal
   * nephron. It is a control of its own rather than a consequence, because
   * this model has no body around the kidney to be depleted — and because
   * separating it from glomerulotubular balance is what lets a learner see
   * that a low FENa has two independent causes.
   */
  aldosteroneActivity: 1,
  /**
   * Antidiuretic hormone activity, 1 at reference.
   *
   * Sets how far towards the maximum the kidney concentrates. Concentrated
   * urine with a low sodium is the signature of a kidney that is working
   * correctly on a body that is dry — which is the whole point of calling it
   * pre-renal rather than renal.
   */
  antidiureticActivity: 1,
};

/**
 * Bowman's space pressure at a given degree of obstruction, mmHg.
 *
 * Complete obstruction eventually brings filtration to a halt, which happens
 * when this reaches the glomerular capillary pressure. The curve is steep at
 * the end because pressure in an obstructed collecting system rises fast once
 * the compliant parts have distended.
 */
export function bowmanPressure(obstruction, base = REFERENCE.bowmanPressureMmHg) {
  const severity = clamp(obstruction, 0, 1);
  return base + 30 * severity ** 1.8;
}

/**
 * How an injured tubule reaches back up to the glomerulus.
 *
 * Tubular injury does not lower GFR only by failing to reabsorb. Two of its
 * mechanisms act on filtration itself, and leaving them out would make acute
 * tubular injury look like a tubule problem with a normal GFR, which is not
 * what it is:
 *
 *   - **Tubuloglomerular feedback.** More sodium reaching the macula densa is
 *     read as too much filtration, and the afferent arteriole constricts. The
 *     signal is correct and the conclusion is wrong: the sodium is there
 *     because the tubule stopped reabsorbing it, not because the glomerulus
 *     filtered too much.
 *   - **Cast obstruction.** Sloughed epithelium blocks tubules, and the
 *     pressure behind the block is Bowman's space pressure — the same term an
 *     obstruction below the kidney raises.
 *
 * @param {number} health 1 (intact) to ~0.05
 */
export function injuryFeedback(health) {
  const injury = 1 - clamp(health, 0.05, 1);
  return {
    /** Afferent resistance multiplier from tubuloglomerular feedback. */
    afferentMultiplier: 1 + 0.55 * injury,
    /** Extra Bowman's space pressure from intratubular casts, mmHg. */
    castPressureMmHg: 6 * injury ** 1.5,
  };
}

/**
 * How much of the ultrafiltration coefficient a damaged barrier keeps.
 *
 * A barrier that has stopped selecting has usually also lost surface: podocyte
 * foot processes efface, and the area available to filter goes with them. That
 * is why nephrotic disease loses grams of protein a day while the GFR stays
 * near normal — without this term the model would predict a *higher* GFR than
 * normal, because it would see only the fall in plasma oncotic pressure.
 *
 * @param {number} permeability the barrier control, 1 at reference
 */
export function barrierFiltrationCoefficient(permeability) {
  return 1 / (1 + 0.085 * Math.max(0, permeability - 1));
}

// ---------------------------------------------------------------------------
// Oncotic pressure
// ---------------------------------------------------------------------------

/**
 * Plasma colloid osmotic pressure from total protein, mmHg.
 *
 * The Landis–Pappenheimer relation. It is markedly non-linear, and that
 * matters here rather than being a detail: plasma concentrated by filtration
 * along the glomerular capillary gains oncotic pressure faster than
 * proportionally, which is what brings net filtration pressure down towards
 * zero before the end of the capillary and limits how much of the plasma a
 * glomerulus can take.
 *
 * @param {number} proteinGDl total plasma protein, g/dL
 */
export function oncoticPressure(proteinGDl) {
  const c = Math.max(0, proteinGDl);
  return 2.1 * c + 0.16 * c * c + 0.009 * c * c * c;
}

// ---------------------------------------------------------------------------
// The glomerular solve
// ---------------------------------------------------------------------------

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

/**
 * Solves one kidney's glomerular haemodynamics.
 *
 * Circular by nature: filtration depends on the pressure in the capillary,
 * which depends on the flow through the afferent arteriole, which depends on
 * how much plasma filtration has removed. Iterated to a fixed point rather
 * than approximated in one pass, because the loop is the physiology — it is
 * what makes an efferent constriction raise GFR and lower renal blood flow at
 * the same time.
 *
 * @param {typeof DEFAULT_CONTROLS} settings
 */
export function solveGlomerulus(settings) {
  const nephronFraction = clamp(settings.functioningNephronFraction, 0.01, 1);

  // Remnant nephrons dilate. Applied to the afferent resistance because that
  // is the vessel the tubuloglomerular feedback acts on.
  const remnantDilation = Math.max(
    REMNANT_HYPERFILTRATION.minimumResistanceMultiplier,
    nephronFraction ** REMNANT_HYPERFILTRATION.exponent
  );

  const afferent =
    (RESISTANCE.afferent *
      settings.afferentToneMultiplier *
      remnantDilation *
      injuryFeedback(settings.tubularHealth).afferentMultiplier) /
    nephronFraction;
  const efferent = (RESISTANCE.efferent * settings.efferentToneMultiplier) / nephronFraction;
  const peritubular = RESISTANCE.peritubular / nephronFraction;

  const arterial = settings.meanArterialPressureMmHg;
  const venous = REFERENCE.renalVenousPressureMmHg;
  const injury = injuryFeedback(settings.tubularHealth);
  const bowman = bowmanPressure(settings.outflowObstruction) + injury.castPressureMmHg;
  const plasmaFraction = 1 - REFERENCE.haematocrit;
  const afferentOncotic = oncoticPressure(settings.plasmaProteinGDl);
  const kf =
    FILTRATION_COEFFICIENT * nephronFraction * barrierFiltrationCoefficient(settings.barrierPermeability);

  /**
   * One pass: given a filtration rate, what blood flow and capillary pressure
   * does the circuit settle at, and what filtration rate does *that* imply?
   */
  const step = (gfr) => {
    // P_a − Q·Raff = P_v + (Q − GFR)·(Reff + Rpt), solved for Q.
    const downstream = efferent + peritubular;
    const bloodFlow = Math.max(
      1,
      (arterial - venous + gfr * downstream) / (afferent + downstream)
    );
    const capillary = arterial - bloodFlow * afferent;
    const plasmaFlow = bloodFlow * plasmaFraction;

    // Filtration fraction concentrates the protein left behind, and the
    // oncotic pressure that opposes filtration is the mean along the capillary.
    const filtrationFraction = clamp(gfr / Math.max(plasmaFlow, 1e-6), 0, 0.65);
    const efferentProtein = settings.plasmaProteinGDl / (1 - filtrationFraction);
    const efferentOncotic = oncoticPressure(efferentProtein);
    const meanOncotic = (afferentOncotic + efferentOncotic) / 2;

    const netPressure = Math.max(0, capillary - bowman - meanOncotic);
    return {
      gfr: kf * netPressure,
      bloodFlow,
      plasmaFlow,
      capillary,
      efferentOncotic,
      meanOncotic,
      netPressure,
      filtrationFraction,
    };
  };

  const solved = fixedPoint({
    initial: 125 * nephronFraction,
    next: (gfr) => step(gfr).gfr,
    blend: (a, b, t) => a + (b - a) * t,
    distance: (a, b) => Math.abs(a - b),
    damping: 0.4,
    tolerance: 1e-7,
  });

  const state = step(solved.value);
  return {
    ...state,
    gfrMlPerMin: solved.value,
    bowmanPressureMmHg: bowman,
    afferentOncoticMmHg: afferentOncotic,
    nephronFraction,
    converged: solved.converged,
    /** nL/min per nephron — how hard each surviving glomerulus is working. */
    singleNephronGfrNlPerMin:
      (solved.value * 1e6) / (REFERENCE.nephronCount * nephronFraction),
  };
}

// ---------------------------------------------------------------------------
// The tubular mass balance
// ---------------------------------------------------------------------------

/** Shorthand for the assumed non-sodium, non-urea solute load. */
const OTHER_SOLUTE_MOSM_PER_DAY = REFERENCE.otherUrinarySoluteMosmPerDay;

/** The reference efferent oncotic pressure, for glomerulotubular balance. */
const REFERENCE_EFFERENT_ONCOTIC = (() => solveGlomerulus(DEFAULT_CONTROLS).efferentOncotic)();

/**
 * What the tubule does with the filtrate.
 *
 * Everything here is mass balance: what was filtered, minus what was
 * reabsorbed, is what appears in the urine. No number is asserted; the
 * clinically familiar ones — FENa, the urea-to-creatinine ratio, the urine
 * sodium — are what the arithmetic leaves behind.
 *
 * @param {ReturnType<typeof solveGlomerulus>} glomerulus
 * @param {typeof DEFAULT_CONTROLS} settings
 */
export function solveTubule(glomerulus, settings) {
  const health = clamp(settings.tubularHealth, 0.05, 1);
  const gfrLPerDay = glomerulus.gfrMlPerMin * 1.44; // mL/min -> L/day

  // --- sodium ---------------------------------------------------------------
  // Glomerulotubular balance: proximal reabsorption follows the peritubular
  // oncotic pressure, which follows filtration fraction.
  const oncoticRatio = glomerulus.efferentOncotic / REFERENCE_EFFERENT_ONCOTIC;
  const proximalFraction = clamp(
    PROXIMAL.referenceFraction * oncoticRatio ** PROXIMAL.oncoticSensitivity * health ** 0.35,
    PROXIMAL.minFraction,
    PROXIMAL.maxFraction
  );
  // Chronic adaptation to nephron loss. The dietary sodium load does not fall
  // when nephrons do, so each surviving nephron has to excrete more of what it
  // filters — mediated by the higher solute load per nephron and by
  // natriuretic factors, both lumped into one bounded term here. It is keyed
  // to nephron loss rather than to GFR on purpose: this adaptation takes weeks,
  // so an acute fall in filtration must not get it.
  const chronicNatriuresis = clamp(
    (1 / clamp(settings.functioningNephronFraction, 0.05, 1)) ** 0.6,
    1,
    6
  );
  const aldosterone = clamp(settings.aldosteroneActivity, 0.1, 4);
  const distalEscape = clamp(
    (DISTAL.referenceEscape * chronicNatriuresis) / (health * aldosterone ** 1.5),
    0,
    DISTAL.maxEscape
  );
  const fractionalSodiumExcretion = (1 - proximalFraction) * distalEscape;

  const filteredSodiumMmolPerDay = gfrLPerDay * settings.plasmaSodiumMmolL;
  const excretedSodiumMmolPerDay = filteredSodiumMmolPerDay * fractionalSodiumExcretion;

  // --- urea -----------------------------------------------------------------
  // Passively reabsorbed, so slow filtrate loses more of it. Tubular flow is
  // read as the fraction of reference GFR, since that is what sets it.
  const tubularFlowRatio = clamp(glomerulus.gfrMlPerMin / 125, 0.02, 3);
  const fractionalUreaExcretion = clamp(
    UREA.referenceFractionalExcretion *
      tubularFlowRatio ** UREA.flowSensitivity *
      // An injured tubule cannot reabsorb urea either, and this term is why
      // the urea-to-creatinine ratio does not merely stop discriminating once
      // the epithelium is damaged — it *inverts*. A slow filtrate would return
      // urea to the blood; an epithelium that cannot transport it does not,
      // however slowly it passes. The two effects pull in opposite directions
      // and injury wins, which is the whole diagnostic content of the ratio.
      (1 / health) ** UREA.injurySensitivity,
    UREA.minFractionalExcretion,
    UREA.maxFractionalExcretion
  );

  // --- urea, as solute ------------------------------------------------------
  const filteredUreaMmolPerDay = gfrLPerDay * REFERENCE.plasmaUreaMmolL;
  const excretedUreaMmolPerDay = filteredUreaMmolPerDay * fractionalUreaExcretion;

  // --- water and concentration ---------------------------------------------
  // Urine volume is not a control and not a fudge: it is the solute that
  // actually has to leave, divided by the concentration the kidney can reach.
  //
  // Counting the solute properly rather than assuming a fixed daily load is
  // what keeps the answer physical. Sodium leaves with an anion, so it
  // contributes twice its own concentration to urine osmolality — which means
  // urine sodium can never exceed half the urine osmolality, however avidly
  // the tubule is failing to reabsorb it. Assuming a fixed load and dividing
  // sodium into it separately produced concentrations no kidney can make.
  const otherSolute =
    OTHER_SOLUTE_MOSM_PER_DAY * clamp(glomerulus.gfrMlPerMin / 125, 0.05, 1);
  const urinaryOsmolesPerDay =
    2 * excretedSodiumMmolPerDay + excretedUreaMmolPerDay + otherSolute;

  // Two independent limits on urine osmolality: how much gradient the tubule
  // can still build, and how hard the body is asking it to. A kidney that
  // cannot concentrate makes dilute urine however loudly ADH shouts, and an
  // intact kidney makes dilute urine when nothing is asking it not to.
  //
  // Nephron loss limits it as well as injury does: each surviving nephron
  // faces a larger share of the solute load, and an osmotic diuresis in a
  // single nephron cannot be concentrated against. That is why chronic disease
  // arrives at a fixed, plasma-like urine osmolality.
  const concentratingAbility = clamp(health * glomerulus.nephronFraction ** 0.35, 0, 1);
  const ceiling =
    CONCENTRATION.isosthenuric +
    (CONCENTRATION.maximumOsmolality - CONCENTRATION.isosthenuric) * concentratingAbility ** 0.7;
  const demanded =
    CONCENTRATION.referenceOsmolality * clamp(settings.antidiureticActivity, 0.15, 3) ** 0.65;
  const urineOsmolality = clamp(Math.min(ceiling, demanded), CONCENTRATION.isosthenuric, ceiling);

  const urineVolumeLPerDay = urinaryOsmolesPerDay / urineOsmolality;
  const urineSodiumMmolL = excretedSodiumMmolPerDay / Math.max(urineVolumeLPerDay, 1e-6);

  // --- protein --------------------------------------------------------------
  const sieving = ALBUMIN.referenceSieving * Math.max(0, settings.barrierPermeability);
  const filteredAlbuminGPerDay = gfrLPerDay * settings.plasmaAlbuminGL * sieving;
  const reabsorbedAlbuminGPerDay =
    (ALBUMIN.reabsorptionMaxGPerDay * filteredAlbuminGPerDay * health) /
    (ALBUMIN.reabsorptionHalfGPerDay + filteredAlbuminGPerDay);
  const urinaryProteinGPerDay = Math.max(0, filteredAlbuminGPerDay - reabsorbedAlbuminGPerDay);

  return {
    proximalSodiumFraction: proximalFraction,
    fractionalSodiumExcretion,
    filteredSodiumMmolPerDay,
    excretedSodiumMmolPerDay,
    urineSodiumMmolL,
    fractionalUreaExcretion,
    filteredUreaMmolPerDay,
    excretedUreaMmolPerDay,
    urinaryOsmolesPerDay,
    urineOsmolalityMosmKg: urineOsmolality,
    urineVolumeLPerDay,
    filteredAlbuminGPerDay,
    urinaryProteinGPerDay,
  };
}

// ---------------------------------------------------------------------------
// The whole state
// ---------------------------------------------------------------------------

/**
 * Steady-state plasma creatinine, mg/dL.
 *
 * Creatinine is produced at a rate set by muscle and cleared only by
 * filtration, so at steady state plasma concentration is production divided by
 * clearance. **The steady state is the whole caveat.** After a sudden fall in
 * GFR, plasma creatinine takes days to climb to the value the new GFR implies,
 * which is why a creatinine measured on the first morning of acute kidney
 * injury understates it badly. This model reports where creatinine is heading,
 * never where it is today, and the metric is named so that the distinction
 * cannot be lost.
 *
 * @param {number} gfrMlPerMin
 */
export function steadyStateCreatinineMgDl(gfrMlPerMin) {
  const clearanceLPerDay = Math.max(gfrMlPerMin, 0.5) * 1.44;
  const mgPerL = REFERENCE.creatinineProductionMgPerDay / clearanceLPerDay;
  return mgPerL / 10; // mg/L -> mg/dL
}

/**
 * Steady-state blood urea nitrogen, mg/dL.
 *
 * Cleared by filtration *and* returned by reabsorption, so its clearance is
 * GFR times the fraction excreted — which is why it rises out of proportion to
 * creatinine whenever the filtrate is moving slowly.
 *
 * @param {number} gfrMlPerMin
 * @param {number} fractionalUreaExcretion
 */
export function steadyStateBunMgDl(gfrMlPerMin, fractionalUreaExcretion) {
  const clearanceLPerDay = Math.max(gfrMlPerMin, 0.5) * 1.44 * Math.max(fractionalUreaExcretion, 0.01);
  // Urea nitrogen production, mg/day: calibrated so the reference kidney sits
  // at a BUN of about 14 mg/dL.
  const productionMgPerDay = 12_600;
  return productionMgPerDay / clearanceLPerDay / 10;
}

/**
 * The complete solved state.
 *
 * One call, one state. The 3D scene, the read-out, the plots and the teaching
 * text are all readings of this object — there is no second equation anywhere
 * for a number that appears on a graph.
 *
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function getState(controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const glomerulus = solveGlomerulus(settings);
  const tubule = solveTubule(glomerulus, settings);

  const creatinine = steadyStateCreatinineMgDl(glomerulus.gfrMlPerMin);
  const bun = steadyStateBunMgDl(glomerulus.gfrMlPerMin, tubule.fractionalUreaExcretion);

  return {
    controls: settings,
    converged: glomerulus.converged,

    // --- haemodynamics ------------------------------------------------------
    renalBloodFlowMlPerMin: glomerulus.bloodFlow,
    renalPlasmaFlowMlPerMin: glomerulus.plasmaFlow,
    glomerularCapillaryPressureMmHg: glomerulus.capillary,
    bowmanPressureMmHg: glomerulus.bowmanPressureMmHg,
    afferentOncoticPressureMmHg: glomerulus.afferentOncoticMmHg,
    meanOncoticPressureMmHg: glomerulus.meanOncotic,
    netFiltrationPressureMmHg: glomerulus.netPressure,

    // --- filtration ---------------------------------------------------------
    gfrMlPerMin: glomerulus.gfrMlPerMin,
    singleNephronGfrNlPerMin: glomerulus.singleNephronGfrNlPerMin,
    filtrationFraction: glomerulus.filtrationFraction,
    functioningNephronFraction: glomerulus.nephronFraction,

    // --- tubular mass balance -----------------------------------------------
    ...tubule,

    // --- what a clinician would see ----------------------------------------
    /** Where creatinine is heading at this GFR — not where it is today. */
    steadyStatePlasmaCreatinineMgDl: creatinine,
    /** Likewise: the steady state, not the morning's blood test. */
    steadyStateBunMgDl: bun,
    bunToCreatinineRatio: bun / Math.max(creatinine, 1e-6),
  };
}

// ---------------------------------------------------------------------------
// Named situations
// ---------------------------------------------------------------------------

/**
 * The situations worth telling apart, as control settings and nothing else.
 *
 * No labels, no questions, no copy: `src/models/README.md` rule 6 says a model
 * may not know what it is for, and a preset carrying a sentence in Japanese
 * knows exactly what it is for. The words live in
 * `src/data/renalFiltration.js`, keyed by the same ids.
 *
 * Each is one constructed situation chosen because it separates a mechanism
 * from its neighbours. None is a patient, and none is a table of expected
 * results — every number they produce comes from the same solver as
 * everything else.
 */
export const PRESET_CONTROLS = {
  normal: {},
  prerenal: {
    meanArterialPressureMmHg: 68,
    // Autoregulation *dilates* the afferent arteriole when perfusion falls —
    // constricting it is the anti-inflammatory case, which is a different
    // situation with a different answer.
    afferentToneMultiplier: 0.72,
    // Angiotensin II holds filtration pressure up from the other side.
    efferentToneMultiplier: 1.9,
    // The same volume depletion that lowered the pressure is also shouting at
    // the distal nephron and the collecting duct.
    aldosteroneActivity: 2.5,
    antidiureticActivity: 2.5,
  },
  tubularInjury: { meanArterialPressureMmHg: 85, tubularHealth: 0.25 },
  obstruction: { outflowObstruction: 0.62 },
  chronic: { functioningNephronFraction: 0.25 },
  // 20x the reference sieving coefficient puts the loss just into the
  // nephrotic range (>3.5 g/day) while filtration stays near normal, which is
  // the pairing worth showing.
  nephrotic: { barrierPermeability: 20, plasmaProteinGDl: 5, plasmaAlbuminGL: 25 },
  efferentSupportWithdrawn: {
    // The same poorly perfused kidney as `prerenal`, with the efferent support
    // taken away and nothing else changed.
    meanArterialPressureMmHg: 68,
    afferentToneMultiplier: 0.72,
    efferentToneMultiplier: 0.95,
    aldosteroneActivity: 2.5,
    antidiureticActivity: 2.5,
  },
};

export const PRESET_IDS = Object.keys(PRESET_CONTROLS);

/** @param {string} id */
export const presetState = (id) => getState(PRESET_CONTROLS[id] ?? {});
