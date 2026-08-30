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
 * ## Why HVPG is not the portal pressure gradient
 *
 * This is the model's most useful single result and it falls straight out of
 * having a network rather than a number.
 *
 * - The **portal pressure gradient** is `P_portal − P_hepaticVein`. It is the
 *   pressure the whole intrahepatic pathway has to be pushed across.
 * - **HVPG** is `wedged − free hepatic venous pressure`. The wedged pressure
 *   reflects **sinusoidal** pressure, not portal pressure. So HVPG is only the
 *   part of the gradient that lies across the *sinusoids*.
 *
 * When the resistance is sinusoidal — alcohol-related and viral cirrhosis, the
 * commonest causes — the two are nearly the same and HVPG is an excellent
 * measurement. When the resistance is **presinusoidal** — portal vein
 * thrombosis, schistosomiasis, porto-sinusoidal vascular disease — the
 * pressure is lost upstream of the sinusoids, the wedged pressure never sees
 * it, and HVPG under-reads the gradient badly. The model computes both and
 * reports the difference, because a scene that showed only one of them would
 * be teaching the confusion rather than the distinction.
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
/** Mean arterial pressure driving the splanchnic bed, mmHg. */
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
 * Large — larger than the healthy liver's — which is the point. Collaterals
 * are long, tortuous and high-resistance; they carry a great deal of flow away
 * from the liver and they do not bring the pressure back to normal, because
 * they never become a low-resistance path.
 */
const COLLATERAL_RESISTANCE_OPEN = 1.2;

/** The gradient at which collaterals begin to open, mmHg. */
const COLLATERAL_THRESHOLD = 10;
/** How sharply they open around that threshold, mmHg. */
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
   * Where the raised resistance sits: 0 = entirely sinusoidal, 1 = entirely
   * presinusoidal.
   *
   * Not a severity control — it does not change how obstructed the liver is,
   * only *where*. It is here because it is the one thing that makes HVPG stop
   * meaning what it usually means, and because a scene that could not show
   * that would be teaching HVPG as a synonym for portal pressure.
   */
  presinusoidalShare: 0,
};

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
    presinusoidalShare,
  } = { ...DEFAULT_CONTROLS, ...controls };

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
  const share = Math.min(1, Math.max(0, presinusoidalShare));
  const presinusoidal = REFERENCE.presinusoidalResistance + (intrahepatic - healthyIntrahepatic) * share;
  const sinusoidal = intrahepatic - presinusoidal;

  return {
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
 * How open the collateral bed is at a given gradient.
 *
 * Collaterals are not a control the body has; they open because the pressure
 * opened them, above a threshold of the order of 10 mmHg. Modelled as a
 * sigmoid in the gradient, which makes the whole system circular — the
 * pressure decides the collaterals and the collaterals decide the pressure —
 * and that circularity is solved rather than sidestepped.
 *
 * @param {number} gradientMmHg
 * @param {number} propensity 0–1
 */
export function collateralOpening(gradientMmHg, propensity) {
  const opened = 1 / (1 + Math.exp(-(gradientMmHg - COLLATERAL_THRESHOLD) / COLLATERAL_SPREAD));
  return Math.min(1, Math.max(0, propensity)) * opened;
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
 */
function portalPressureFor(resistances, collateralConductance, tipsConductance) {
  const liverConductance = 1 / (resistances.presinusoidal + resistances.sinusoidal);
  const outflow = liverConductance + collateralConductance + tipsConductance;
  const inflow = 1 / resistances.splanchnic;
  // (MAP − P)·inflow = (P − Phv)·outflow, solved for P.
  return (MEAN_ARTERIAL_PRESSURE * inflow + HEPATIC_VEIN_PRESSURE * outflow) / (inflow + outflow);
}

/**
 * Solve the portal circulation for a given liver.
 *
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solvePortalCirculation(controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const resistances = vascularResistances(settings);
  const tipsConductance = settings.tips > 0 ? settings.tips / TIPS_RESISTANCE_OPEN : 0;

  // The collaterals depend on the gradient and the gradient depends on the
  // collaterals. Iterated to a fixed point, damped because a sigmoid inside a
  // feedback loop will otherwise overshoot and ring.
  const solved = fixedPoint({
    initial: portalPressureFor(resistances, 0, tipsConductance),
    next: (pressure) => {
      const opening = collateralOpening(pressure - HEPATIC_VEIN_PRESSURE, settings.collateralPropensity);
      const conductance = opening > 1e-4 ? opening / COLLATERAL_RESISTANCE_OPEN : 0;
      return portalPressureFor(resistances, conductance, tipsConductance);
    },
    blend: (a, b, t) => a + (b - a) * t,
    distance: (a, b) => Math.abs(a - b),
    damping: 0.4,
    tolerance: 1e-9,
    maxIterations: 300,
  });

  const portalPressure = solved.value;
  const gradient = portalPressure - HEPATIC_VEIN_PRESSURE;
  const opening = collateralOpening(gradient, settings.collateralPropensity);
  const collateralConductance = opening > 1e-4 ? opening / COLLATERAL_RESISTANCE_OPEN : 0;

  // Flows, mL/s. Every one of them is ΔP/R across a path that exists.
  const liverFlow = gradient / (resistances.presinusoidal + resistances.sinusoidal);
  const collateralFlow = gradient * collateralConductance;
  const tipsFlow = gradient * tipsConductance;
  const splanchnicInflow = (MEAN_ARTERIAL_PRESSURE - portalPressure) / resistances.splanchnic;

  /**
   * Sinusoidal pressure: what is left of the portal pressure after the
   * presinusoidal segment has taken its share. This is what a wedged hepatic
   * venous catheter reads, and it is why HVPG is not the portal pressure
   * gradient.
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
    collateralOpening: opening,

    /** Where the pressure is lost, as a profile a chart can draw directly. */
    pressureProfile: [
      { id: 'portal', label: 'Portal vein', labelJa: '門脈', pressureMmHg: portalPressure },
      { id: 'sinusoid', label: 'Sinusoid', labelJa: '類洞', pressureMmHg: sinusoidalPressure },
      { id: 'hepatic', label: 'Hepatic vein', labelJa: '肝静脈', pressureMmHg: HEPATIC_VEIN_PRESSURE },
    ],
  };
}

/**
 * Whether a gradient of this size is in the range the literature calls
 * clinically significant — **and whether this model is entitled to say so.**
 *
 * The Baveno thresholds (≥10 mmHg for clinically significant portal
 * hypertension, ≥12 for variceal bleeding risk) are defined on **HVPG**, and
 * they were established in compensated advanced chronic liver disease of
 * sinusoidal aetiology. Applying them to a presinusoidal liver — where HVPG
 * systematically under-reads — is exactly the error the model exists to make
 * visible, so this function refuses to apply them there rather than returning
 * a number that would be quoted.
 *
 * @param {ReturnType<typeof solvePortalCirculation>} state
 */
export function clinicalThresholdReading(state) {
  const applicable = state.controls.presinusoidalShare < 0.15;
  return {
    /** The measurement the thresholds are defined on. */
    hvpgMmHg: state.hepaticVenousPressureGradientMmHg,
    applicable,
    /**
     * Null rather than a category when the configuration is outside what the
     * thresholds were established in. A category is a claim; this one would be
     * a wrong claim.
     */
    band: applicable ? bandFor(state.hepaticVenousPressureGradientMmHg) : null,
  };
}

/** HVPG bands, as the literature defines them. Only ever used above. */
function bandFor(hvpg) {
  if (hvpg < 6) return 'normal';
  if (hvpg < 10) return 'subclinical';
  if (hvpg < 12) return 'clinically-significant';
  return 'high-risk';
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
