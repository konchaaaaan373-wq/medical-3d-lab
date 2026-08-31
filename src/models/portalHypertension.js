import { fixedPoint } from './integrate.js';
import { perMinuteToPerSecond, perSecondToPerMinute } from './units.js';

/**
 * Portal hypertension: where the pressure comes from, and what a measurement
 * of it is actually measuring.
 *
 * The question this model exists to answer: **why does portal pressure rise in
 * cirrhosis, why do the collaterals that open up fail to bring it back down,
 * and what does HVPG actually measure?**
 *
 * ## One law, applied to a network
 *
 * `ΔP = Q · R`, and flow is conserved at every junction. That is the whole of
 * it. The portal vein is a node; splanchnic blood arrives at it through the
 * splanchnic arterioles and leaves it through whatever paths are open — the
 * liver, any portosystemic collaterals, a shunt if one has been placed. The
 * pressure at that node is whatever value makes what arrives equal what
 * leaves.
 *
 * Nothing about portal pressure is written down anywhere below. It is solved.
 *
 * ## Cause and perpetuation are not the same thing
 *
 * The order matters and the model is built to keep it straight.
 *
 * 1. **Increased intrahepatic vascular resistance is the initiating event.**
 *    Fibrosis, regenerative nodules and sinusoidal remodelling raise the
 *    resistance to portal outflow; a dynamic component — activated stellate
 *    cell contraction, reduced intrahepatic nitric oxide, increased endothelin
 *    — adds to it. Portal pressure rises because of this, and only because of
 *    this.
 * 2. **Chronic portal hypertension then induces extrahepatic vascular
 *    adaptation.** Splanchnic arteriolar vasodilation and the hyperdynamic
 *    circulation are *consequences* of the portal hypertension, mediated by
 *    nitric oxide and other vasodilators in the splanchnic bed.
 * 3. **That raised inflow feeds back and maintains the pressure.** More blood
 *    arriving at a node whose outflow is already obstructed keeps the gradient
 *    high, and worsens it.
 *
 * So the intrahepatic resistance is the **initiating** mechanism and the
 * increased splanchnic inflow is the **perpetuating** one. They are not two
 * parallel causes, and calling them that would invert the order in which they
 * appear in a patient.
 *
 * The model is an **equilibrium** model: it has no time in it, so it cannot
 * show step 1 preceding step 2. `splanchnicVasodilation` is therefore a
 * control rather than a consequence, which is a modelling compromise and is
 * labelled as one. What the model *can* do, and does, is answer the two
 * questions separately — "what does more resistance do?" and "what does more
 * inflow do at a fixed resistance?" — so that the causal order can be taught
 * over the top of an equilibrium rather than being contradicted by it.
 *
 * ## Why HVPG is not the portal pressure gradient
 *
 * This is the model's most useful single result and it falls straight out of
 * having a network rather than a number.
 *
 * - The **portal pressure gradient** is `P_portal − P_hepaticVein`. It is the
 *   pressure the whole intrahepatic pathway has to be pushed across.
 * - **HVPG** is `WHVP − FHVP`: wedged minus free hepatic venous pressure. In
 *   sinusoidal portal hypertension the wedged pressure **approximates**
 *   sinusoidal pressure — the occluding balloon stops flow in a hepatic vein
 *   branch and the static column equilibrates with the sinusoids feeding it —
 *   so HVPG approximates the part of the gradient lying across the sinusoids.
 *   It is not a direct measurement of sinusoidal pressure, and it is not a
 *   measurement of portal pressure at all.
 *
 * Where the raised resistance is **sinusoidal** — alcohol-related and viral
 * cirrhosis, the commonest causes — HVPG tracks the portal gradient closely
 * and is the reference measurement. Where a substantial part of it lies
 * **upstream of the sinusoids**, the wedged pressure never sees that part and
 * HVPG under-reads the portal gradient. Two different anatomical situations do
 * that, and they are **not** the same thing:
 *
 * - **Presinusoidal intrahepatic**: the obstruction is inside the liver but
 *   upstream of the sinusoids — schistosomiasis, porto-sinusoidal vascular
 *   disease, and the presinusoidal component of some cholestatic disorders
 *   including primary biliary cholangitis. This is what the model represents.
 * - **Prehepatic**: the obstruction is outside the liver altogether — portal
 *   vein thrombosis. The liver itself may be normal. The model does **not**
 *   represent this; it has no extrahepatic portal obstruction in it.
 *
 * What the two share is the consequence for the measurement: HVPG can be
 * normal or near-normal while the portal pressure is high. That shared
 * consequence is what the scene shows. Their anatomy is different and the
 * scene says so rather than listing them together.
 *
 * ## Units
 *
 * mmHg and mL/s internally, so resistance is mmHg·s/mL and `ΔP = Q·R` needs no
 * conversion factor. Flows are reported in mL/min, because that is how hepatic
 * and portal flows are quoted, and the conversion happens at the edge.
 *
 * ## What is not here
 *
 * **No ascites.** Ascites does not follow from portal pressure alone — it
 * needs the hepatic lymph balance, sinusoidal permeability, hypoalbuminaemia,
 * and renal sodium handling, none of which is in this model — and generating
 * it from a pressure would be inventing it. Likewise no varices as structures,
 * no bleeding risk, no encephalopathy, no Child-Pugh or MELD, and no cardiac
 * output.
 */

/** Pressure in the hepatic veins and inferior vena cava, mmHg. The reference. */
export const HEPATIC_VEIN_PRESSURE = 4;
/**
 * Mean arterial pressure driving the splanchnic bed, mmHg — the default.
 *
 * A fixed inlet pressure is a simplification: in advanced cirrhosis the
 * systemic circulation is not a constant, and the arterial pressure a
 * decompensated patient runs at is lower than this. Callers that model the
 * systemic side may pass `meanArterialPressureMmHg` as a control instead; this
 * value is what the portal circulation is solved at when they do not.
 */
export const MEAN_ARTERIAL_PRESSURE = 90;

/**
 * The healthy liver, calibrated to reproduce three textbook figures at once:
 * a portal pressure gradient of about 3 mmHg, a portal venous flow of about a
 * litre a minute, and a portal pressure a little under 8 mmHg.
 *
 * Resistances are in mmHg·s/mL. They are not measurements of anything — no
 * such measurement exists for a person — and they are here as the numbers that
 * put the three quantities above where the textbooks put them.
 */
export const REFERENCE = {
  /**
   * Splanchnic arteriolar resistance: everything between the aorta and the
   * portal vein. Set so that the gradient across it drives about 1000 mL/min.
   */
  splanchnicResistance: 4.9,
  /**
   * Resistance across the sinusoids, where a healthy liver loses nearly all of
   * its (very small) portal-to-hepatic-vein gradient.
   */
  sinusoidalResistance: 0.16,
  /**
   * Resistance of the portal venules, upstream of the sinusoids. Small in a
   * healthy liver and in sinusoidal cirrhosis; it is the term that makes HVPG
   * and the portal pressure gradient disagree when it is not.
   */
  presinusoidalResistance: 0.02,
};

/**
 * Resistance of a fully developed collateral bed, mmHg·s/mL.
 *
 * **A calibration constant, and not a general fact about collaterals.** It is
 * chosen so that an established-cirrhosis configuration lands in the reported
 * HVPG range with a large share of the portal flow diverted, and that is all
 * it is chosen for.
 *
 * In particular this model must not be read as saying "a collateral is always
 * a high-resistance channel". Some spontaneous portosystemic shunts — a large
 * splenorenal shunt, a recanalised umbilical vein — are wide, carry very large
 * flows, and can decompress the portal system substantially. Portal
 * hypertension persists anyway, and the reasons are elsewhere: the
 * intrahepatic resistance that started it is still high, the splanchnic inflow
 * is still increased, and a collateral network removes neither. Collaterals
 * redistribute portal flow; they do not remove the pathophysiology driving it.
 */
const COLLATERAL_RESISTANCE_OPEN = 1.2;

/**
 * The gradient at which the model's collateral conductance is half-established,
 * mmHg.
 *
 * **10 mmHg is a clinical threshold, not a valve-opening pressure.** It is the
 * HVPG at or above which portal hypertension is called clinically significant
 * and at which varices and decompensation become likely. Nothing opens at
 * 10 mmHg; the number marks where a population of patients starts to have
 * collaterals worth finding.
 *
 * See `establishedCollateralFraction` for what the sigmoid around it means and,
 * more importantly, for what it does not mean.
 */
const CSPH_GRADIENT_MMHG = 10;
/**
 * Width of the mapping around that gradient, mmHg. Purely illustrative — there
 * is no measured sigmoid here, and the literature offers no width to borrow.
 */
const COLLATERAL_SPREAD = 2.2;

/**
 * Resistance of a fully dilated TIPS, mmHg·s/mL.
 *
 * A short, wide, straight stent from the portal vein to a hepatic vein. Not
 * lower than a *healthy* liver's — no shunt is — but far lower than the
 * diseased liver it bypasses and lower than any collateral, which is why it
 * does what collaterals cannot. The price is in the flows rather than in the
 * pressure: most of the portal blood now reaches the systemic circulation
 * without passing through hepatocytes at all.
 */
const TIPS_RESISTANCE_OPEN = 0.26;

/**
 * How much of the intrahepatic resistance in cirrhosis is reversible.
 *
 * The classically quoted figure is that roughly a fifth to a third of the
 * raised intrahepatic resistance is a *dynamic* component — contraction of
 * activated hepatic stellate cells, reduced intrahepatic nitric oxide,
 * increased endothelin — and the rest is structural: fibrosis, regenerative
 * nodules, sinusoidal remodelling. The distinction is the whole reason a drug
 * can lower portal pressure at all.
 */
export const DYNAMIC_SHARE_AT_FULL_TONE = 0.3;

export const DEFAULT_CONTROLS = {
  /**
   * Structural intrahepatic resistance: fibrosis, nodules, sinusoidal
   * remodelling. 1 is a healthy liver. The scene's main axis. Irreversible.
   */
  structuralResistance: 1,
  /**
   * The dynamic, reversible component, 0–1. Raises intrahepatic resistance by
   * up to `DYNAMIC_SHARE_AT_FULL_TONE` of what the structure already costs.
   */
  dynamicTone: 0,
  /**
   * Splanchnic arteriolar vasodilation, 0–1. Lowers the resistance between the
   * aorta and the portal vein, so more blood arrives at a node whose outflow is
   * already obstructed. This is the second half of portal hypertension and the
   * half that is often left out.
   */
  splanchnicVasodilation: 0,
  /** How readily portosystemic collaterals form, 0 (none) to 1. */
  collateralPropensity: 1,
  /** A transjugular intrahepatic portosystemic shunt, 0 (none) to 1 (fully dilated). */
  tips: 0,
  /**
   * The arterial pressure driving the splanchnic bed, mmHg.
   *
   * Here so that a model of the systemic circulation can hand this one the
   * pressure it has solved for, rather than this model asserting a constant
   * that the systemic model disagrees with. Left at `MEAN_ARTERIAL_PRESSURE`
   * it changes nothing.
   */
  meanArterialPressureMmHg: MEAN_ARTERIAL_PRESSURE,
  /**
   * **Which haemodynamic pattern the model is being asked to represent**, as an
   * index into `HAEMODYNAMIC_PATTERNS`.
   *
   * Not a severity control — it does not change how obstructed the liver is,
   * only *where* the obstruction sits. It is here because it is the one thing
   * that makes HVPG stop meaning what it usually means, and because a scene
   * that could not show that would be teaching HVPG as a synonym for portal
   * pressure.
   *
   * It is a named state rather than a continuous share on purpose. Whether the
   * HVPG thresholds may be quoted is a question about **which disease is being
   * modelled**, and answering it by comparing a continuous parameter against a
   * cut-off dresses an implementation convenience up as a medical criterion.
   * An earlier version withheld the thresholds when the presinusoidal share
   * reached 0.15 — a number with no source, and one a reader could easily have
   * taken for a real one. Each pattern below now declares for itself whether
   * the thresholds apply.
   */
  haemodynamicPattern: 0,
};

/**
 * The haemodynamic patterns this model is willing to represent, and what each
 * one is entitled to say.
 *
 * `presinusoidalShare` is where the raised intrahepatic resistance sits:
 * 0 = entirely across the sinusoids, 1 = entirely upstream of them. It is a
 * consequence of the pattern rather than a control of its own, so that the
 * pattern and the mechanics cannot disagree.
 */
export const HAEMODYNAMIC_PATTERNS = [
  {
    id: 'sinusoidal',
    label: 'Sinusoidal',
    labelJa: '類洞性',
    /** Alcohol-related and viral cirrhosis: the commonest causes, and the ones the thresholds come from. */
    description: 'Cirrhosis of sinusoidal aetiology — where HVPG is the reference measurement.',
    descriptionJa: '類洞性の病態による肝硬変。HVPG が基準となる測定である領域です。',
    presinusoidalShare: 0,
    /**
     * The HVPG thresholds were established in compensated advanced chronic
     * liver disease of sinusoidal aetiology, so this is where they may be read.
     */
    thresholdsApply: true,
  },
  {
    id: 'mixed',
    label: 'Mixed',
    labelJa: '混合性',
    description:
      'A presinusoidal component on top of sinusoidal disease. HVPG begins to under-read, and the thresholds are no longer safe to quote.',
    descriptionJa:
      '類洞性病変に前類洞性の要素が加わった状態。HVPG は過小評価を始め、閾値をそのまま当てはめることはできません。',
    presinusoidalShare: 0.5,
    thresholdsApply: false,
  },
  {
    id: 'presinusoidal',
    label: 'Presinusoidal (intrahepatic)',
    labelJa: '前類洞性（肝内）',
    /**
     * Intrahepatic and upstream of the sinusoids: schistosomiasis,
     * porto-sinusoidal vascular disease, the presinusoidal component of some
     * cholestatic disorders. **Not** portal vein thrombosis, which is
     * prehepatic — outside the liver entirely — and which this model does not
     * represent at all.
     */
    description:
      'Obstruction inside the liver but upstream of the sinusoids: schistosomiasis, porto-sinusoidal vascular disease, the presinusoidal component of some cholestatic disorders. Portal vein thrombosis is prehepatic, not this, and is not modelled.',
    descriptionJa:
      '肝内かつ類洞より上流の閉塞。住血吸虫症、門脈・類洞血管疾患 (PSVD)、一部の胆汁うっ滞性疾患の前類洞性要素など。門脈血栓症は肝前性であって、これとは別であり、モデル化していません。',
    presinusoidalShare: 1,
    thresholdsApply: false,
  },
];

/** The named pattern a control value selects. Out-of-range values clamp. */
export function patternFor(haemodynamicPattern) {
  const index = Math.round(Number(haemodynamicPattern) || 0);
  return HAEMODYNAMIC_PATTERNS[Math.min(HAEMODYNAMIC_PATTERNS.length - 1, Math.max(0, index))];
}

/**
 * The resistances a given set of controls implies.
 *
 * Split out because everything here is a statement about the *liver* rather
 * than about the flow through it: a test can check it without solving the
 * network, and the scene can label its pathways from it.
 *
 * @param {typeof DEFAULT_CONTROLS} controls
 */
export function vascularResistances(controls) {
  const {
    structuralResistance,
    dynamicTone,
    splanchnicVasodilation,
    haemodynamicPattern,
  } = { ...DEFAULT_CONTROLS, ...controls };
  const pattern = patternFor(haemodynamicPattern);

  // The intrahepatic resistance the disease has produced, as a multiple of the
  // healthy liver's. The dynamic component is expressed as a share of what the
  // structure already costs, which is what makes it worth more in a badly
  // scarred liver than in a healthy one — and is why a drug that only touches
  // the dynamic part still lowers the pressure of the sickest patients most.
  const intrahepaticMultiple = structuralResistance * (1 + DYNAMIC_SHARE_AT_FULL_TONE * dynamicTone);
  const healthyIntrahepatic = REFERENCE.sinusoidalResistance + REFERENCE.presinusoidalResistance;
  const intrahepatic = healthyIntrahepatic * intrahepaticMultiple;

  // Where it sits. The *total* is untouched by this: moving the share moves
  // resistance from one side of the sinusoid to the other, and a scene that
  // let it change the total could not use it to make the point it is there for.
  const share = pattern.presinusoidalShare;
  const presinusoidal = REFERENCE.presinusoidalResistance + (intrahepatic - healthyIntrahepatic) * share;
  const sinusoidal = intrahepatic - presinusoidal;

  return {
    /** The named haemodynamic pattern these resistances represent. */
    pattern,
    /** Aorta to portal vein. Falls as the splanchnic bed dilates. */
    splanchnic: REFERENCE.splanchnicResistance * (1 - 0.45 * splanchnicVasodilation),
    presinusoidal,
    sinusoidal,
    intrahepatic,
    intrahepaticMultiple,
    /** How much of the intrahepatic resistance the dynamic component is. */
    dynamicFraction:
      1 - 1 / (1 + DYNAMIC_SHARE_AT_FULL_TONE * dynamicTone),
  };
}

/**
 * How much collateral conductance is **established** at a given gradient.
 *
 * ## Read this before reading the formula
 *
 * This is an **illustrative equilibrium mapping**, not a mechanism and not a
 * law. It says: *by the time a liver has sat at this gradient, this much
 * collateral conductance has typically become established.* It is a statement
 * about where a chronic process has got to, expressed in the only currency an
 * equilibrium model has.
 *
 * **Nothing here opens instantaneously, and nothing here is triggered by a
 * pressure crossing a line.** What actually happens takes months to years and
 * has at least three parts: pre-existing embryonic channels dilate, the
 * vessels remodel, and new vessels are formed — a VEGF-dependent angiogenic
 * process, not a valve. A real patient's collaterals do not appear when the
 * gradient reaches ten and do not close when it falls below ten.
 *
 * The sigmoid's centre is the clinically significant portal hypertension
 * threshold because that is the gradient at which patients are found to have
 * collaterals, and its width is invented. Neither is a measurement.
 *
 * Making it depend on the gradient does make the system circular — the
 * pressure sets the collateral conductance and the conductance sets the
 * pressure — and that circularity is solved rather than sidestepped.
 *
 * @param {number} gradientMmHg
 * @param {number} propensity 0–1
 */
export function establishedCollateralFraction(gradientMmHg, propensity) {
  const established = 1 / (1 + Math.exp(-(gradientMmHg - CSPH_GRADIENT_MMHG) / COLLATERAL_SPREAD));
  return Math.min(1, Math.max(0, propensity)) * established;
}

/**
 * Solves the network for the portal pressure.
 *
 * One node, one unknown: the pressure at the portal vein. What arrives has to
 * equal what leaves, and since every path is linear in the pressure the
 * balance can be solved directly rather than searched for.
 *
 * @param {{ splanchnic: number, presinusoidal: number, sinusoidal: number }} resistances
 * @param {number} collateralConductance 1/R of the collateral bed, 0 when closed
 * @param {number} tipsConductance 1/R of a shunt, 0 when there is none
 * @param {number} meanArterialPressure inlet pressure to the splanchnic bed, mmHg
 */
function portalPressureFor(resistances, collateralConductance, tipsConductance, meanArterialPressure) {
  const liverConductance = 1 / (resistances.presinusoidal + resistances.sinusoidal);
  const outflow = liverConductance + collateralConductance + tipsConductance;
  const inflow = 1 / resistances.splanchnic;
  // (MAP − P)·inflow = (P − Phv)·outflow, solved for P.
  return (meanArterialPressure * inflow + HEPATIC_VEIN_PRESSURE * outflow) / (inflow + outflow);
}

/**
 * Solve the portal circulation for a given liver.
 *
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solvePortalCirculation(controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const meanArterialPressure = settings.meanArterialPressureMmHg;
  const resistances = vascularResistances(settings);
  const tipsConductance = settings.tips > 0 ? settings.tips / TIPS_RESISTANCE_OPEN : 0;

  // The collaterals depend on the gradient and the gradient depends on the
  // collaterals. Iterated to a fixed point, damped because a sigmoid inside a
  // feedback loop will otherwise overshoot and ring.
  const solved = fixedPoint({
    initial: portalPressureFor(resistances, 0, tipsConductance, meanArterialPressure),
    next: (pressure) => {
      const opening = establishedCollateralFraction(
        pressure - HEPATIC_VEIN_PRESSURE,
        settings.collateralPropensity
      );
      const conductance = opening > 1e-4 ? opening / COLLATERAL_RESISTANCE_OPEN : 0;
      return portalPressureFor(resistances, conductance, tipsConductance, meanArterialPressure);
    },
    blend: (a, b, t) => a + (b - a) * t,
    distance: (a, b) => Math.abs(a - b),
    damping: 0.4,
    tolerance: 1e-9,
    maxIterations: 300,
  });

  const portalPressure = solved.value;
  const gradient = portalPressure - HEPATIC_VEIN_PRESSURE;
  const opening = establishedCollateralFraction(gradient, settings.collateralPropensity);
  const collateralConductance = opening > 1e-4 ? opening / COLLATERAL_RESISTANCE_OPEN : 0;

  // Flows, mL/s. Every one of them is ΔP/R across a path that exists.
  const liverFlow = gradient / (resistances.presinusoidal + resistances.sinusoidal);
  const collateralFlow = gradient * collateralConductance;
  const tipsFlow = gradient * tipsConductance;
  const splanchnicInflow = (meanArterialPressure - portalPressure) / resistances.splanchnic;

  /**
   * Sinusoidal pressure: what is left of the portal pressure after the
   * presinusoidal segment has taken its share.
   *
   * A wedged hepatic venous catheter does not measure this directly. In
   * sinusoidal portal hypertension the wedged pressure *approximates* it, and
   * `hepaticVenousPressureGradientMmHg` below is that approximation minus the
   * free hepatic venous pressure. That approximation is why HVPG is not the
   * portal pressure gradient, and why it stops tracking it when a substantial
   * part of the resistance moves upstream of the sinusoids.
   */
  const sinusoidalPressure = portalPressure - liverFlow * resistances.presinusoidal;
  const hepaticVenousGradient = sinusoidalPressure - HEPATIC_VEIN_PRESSURE;

  return {
    controls: settings,
    resistances,
    converged: solved.converged,

    // --- pressures, mmHg ---
    portalPressureMmHg: portalPressure,
    sinusoidalPressureMmHg: sinusoidalPressure,
    hepaticVeinPressureMmHg: HEPATIC_VEIN_PRESSURE,
    /**
     * The real gradient across the whole intrahepatic pathway. Called what it
     * is: this model computes a **portal pressure gradient**, and it is not
     * entitled to call that an HVPG.
     */
    portalPressureGradientMmHg: gradient,
    /**
     * What a wedged-minus-free measurement would read on this liver — the part
     * of the gradient that lies across the sinusoids.
     */
    hepaticVenousPressureGradientMmHg: hepaticVenousGradient,
    /**
     * How much of the gradient HVPG cannot see, mmHg. Zero in a purely
     * sinusoidal liver, and the whole point of the distinction when it is not.
     */
    gradientMissedByHvpgMmHg: gradient - hepaticVenousGradient,

    // --- flows, mL/min ---
    splanchnicInflowMlPerMin: perSecondToPerMinute(splanchnicInflow),
    portalLiverFlowMlPerMin: perSecondToPerMinute(liverFlow),
    collateralFlowMlPerMin: perSecondToPerMinute(collateralFlow),
    tipsFlowMlPerMin: perSecondToPerMinute(tipsFlow),
    /**
     * The fraction of splanchnic blood that reaches the systemic circulation
     * without passing through liver tissue — through collaterals or a shunt.
     */
    shuntFraction: splanchnicInflow > 0 ? (collateralFlow + tipsFlow) / splanchnicInflow : 0,
    /** How much collateral conductance is established — see the function's note. */
    establishedCollateralFraction: opening,

    /** Where the pressure is lost, as a profile a chart can draw directly. */
    pressureProfile: [
      { id: 'portal', label: 'Portal vein', labelJa: '門脈', pressureMmHg: portalPressure },
      { id: 'sinusoid', label: 'Sinusoid', labelJa: '類洞', pressureMmHg: sinusoidalPressure },
      { id: 'hepatic', label: 'Hepatic vein', labelJa: '肝静脈', pressureMmHg: HEPATIC_VEIN_PRESSURE },
    ],
  };
}

/**
 * The thresholds this model may quote, and where each one applies.
 *
 * Following Baveno VII. All of them are defined on **HVPG**, not on this
 * model's own portal pressure gradient, and all of them were established in
 * compensated advanced chronic liver disease of **sinusoidal** aetiology —
 * viral and alcohol-related cirrhosis above all, where HVPG is the gold
 * standard.
 *
 * Note what is *not* here: a general "decompensation threshold" at 12 mmHg.
 * There is no such general threshold. 12 mmHg appears in the literature in two
 * specific places, and it is confined to them in `VARICEAL_CONTEXT` below.
 */
export const HVPG_THRESHOLDS = {
  /** Above this, portal hypertension exists. Normal HVPG is 1–5 mmHg. */
  portalHypertensionMmHg: 5,
  /**
   * At or above this, portal hypertension is **clinically significant**: the
   * point from which varices, decompensation and hepatocellular carcinoma
   * become substantially more likely. This is the threshold that matters, and
   * the one the scene reads.
   */
  clinicallySignificantMmHg: 10,
};

/**
 * The one context in which 12 mmHg belongs, kept separate so that it cannot be
 * quoted as a general staging threshold.
 *
 * Two uses, and they are related but not the same:
 *
 * - The **classic association** between an HVPG at or above 12 mmHg and
 *   variceal bleeding: below it, variceal bleeding is very unlikely.
 * - The **post-TIPS haemodynamic target** of a portosystemic pressure gradient
 *   below 12 mmHg, which is the target for a shunt placed for variceal
 *   bleeding.
 *
 * Neither makes 12 mmHg a general threshold for decompensation, and neither is
 * a band this model puts a liver into.
 */
export const VARICEAL_CONTEXT = {
  gradientMmHg: 12,
  note: 'The classic association with variceal bleeding, and the post-TIPS target gradient for a shunt placed to treat it. Not a general decompensation threshold.',
  noteJa:
    '静脈瘤出血との古典的な関連、および静脈瘤出血に対して留置した TIPS の術後目標圧較差。一般的な非代償化の閾値ではありません。',
};

/**
 * Whether a gradient of this size is in the range the literature calls
 * clinically significant — **and whether this model is entitled to say so.**
 *
 * Applicability is decided by the model's declared **haemodynamic pattern**,
 * which is a named state saying which disease is being represented, not by a
 * numerical comparison against a share. Where the pattern is not the one the
 * thresholds were established in, this returns `band: null` rather than a
 * category, because a category is a claim and that one would be a wrong claim.
 *
 * @param {ReturnType<typeof solvePortalCirculation>} state
 */
export function clinicalThresholdReading(state) {
  const pattern = patternFor(state.controls.haemodynamicPattern);
  return {
    /** The measurement the thresholds are defined on. */
    hvpgMmHg: state.hepaticVenousPressureGradientMmHg,
    pattern,
    applicable: pattern.thresholdsApply,
    /**
     * Null rather than a category when the configuration is outside what the
     * thresholds were established in.
     */
    band: pattern.thresholdsApply ? bandFor(state.hepaticVenousPressureGradientMmHg) : null,
  };
}

/**
 * HVPG bands, as Baveno VII defines them. Only ever used above.
 *
 * Three bands, not four. There is deliberately no band boundary at 12 mmHg:
 * clinically significant portal hypertension is the categorical distinction,
 * and 12 mmHg is a variceal-bleeding association rather than a further stage.
 */
function bandFor(hvpg) {
  if (hvpg <= HVPG_THRESHOLDS.portalHypertensionMmHg) return 'normal';
  if (hvpg < HVPG_THRESHOLDS.clinicallySignificantMmHg) return 'portal-hypertension';
  return 'clinically-significant';
}

/**
 * The whole progression, solved.
 *
 * The scene plots this so that the divergence between the two gradients, and
 * the point at which collaterals start carrying flow, are visible as curves
 * rather than as two numbers that happen to differ today.
 *
 * @param {Partial<typeof DEFAULT_CONTROLS>} controls everything except the structural resistance
 * @param {number} [maxStructural]
 * @param {number} [samples]
 */
export function progressionCurve(controls, maxStructural = 12, samples = 24) {
  const points = [];
  for (let i = 0; i <= samples; i++) {
    const structuralResistance = 1 + ((maxStructural - 1) * i) / samples;
    const state = solvePortalCirculation({ ...controls, structuralResistance });
    points.push({
      structuralResistance,
      portalPressureGradientMmHg: state.portalPressureGradientMmHg,
      hepaticVenousPressureGradientMmHg: state.hepaticVenousPressureGradientMmHg,
      portalLiverFlowMlPerMin: state.portalLiverFlowMlPerMin,
      collateralFlowMlPerMin: state.collateralFlowMlPerMin,
      shuntFraction: state.shuntFraction,
    });
  }
  return points;
}

/** Exposed for tests that need to state a flow in the model's own units. */
export const toMlPerSecond = perMinuteToPerSecond;
