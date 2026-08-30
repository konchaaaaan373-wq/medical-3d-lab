import { fixedPoint } from './integrate.js';
import { perMinuteToPerSecond, perSecondToPerMinute } from './units.js';
import {
  DEFAULT_CONTROLS as PORTAL_DEFAULTS,
  HEPATIC_VEIN_PRESSURE,
  MEAN_ARTERIAL_PRESSURE,
  solvePortalCirculation,
} from './portalHypertension.js';

/**
 * Hepatorenal syndrome: why a structurally normal kidney stops working.
 *
 * The question this model exists to answer: **if the kidney in hepatorenal
 * syndrome is histologically near-normal, and recovers when it is transplanted
 * into somebody else or when the liver is replaced, what is actually stopping
 * it from filtering?**
 *
 * The answer this model gives is that nothing is wrong with the kidney. The
 * kidney is being asked to filter at a perfusion pressure it can no longer
 * autoregulate around, by a circulation whose own attempt to stay alive is
 * what removed its ability to.
 *
 * ## The chain, and why it is a loop rather than a list
 *
 * 1. **Portal hypertension dilates the splanchnic arterioles.** That is the
 *    previous model's subject and this one imports it rather than restating
 *    it: `solvePortalCirculation` already turns raised intrahepatic resistance
 *    and splanchnic vasodilation into a splanchnic inflow.
 * 2. **A dilated splanchnic bed is a large low-resistance parallel path.**
 *    Systemic vascular resistance falls, because the splanchnic bed and
 *    everything else are in parallel and one of them has opened up.
 * 3. **The heart raises its output, but not by enough.** Cardiac output rises
 *    — the hyperdynamic circulation — and arterial pressure still falls,
 *    because the compensation is partial. How partial is `cardiacReserve`,
 *    and cirrhotic cardiomyopathy is what lowers it.
 * 4. **Arterial underfilling activates the vasoconstrictor systems.** The
 *    renin-angiotensin-aldosterone system, the sympathetic nervous system and
 *    vasopressin. This is the *peripheral arterial vasodilation* account of
 *    sodium retention and renal failure in cirrhosis, and this model is built
 *    on it: the driver of activation here is the fall in systemic vascular
 *    resistance, not the fall in pressure. Pressure is what activation is
 *    defending.
 * 5. **That activation constricts every bed that will listen — and the
 *    splanchnic bed will not.** The splanchnic arterioles are the ones held
 *    open by local vasodilators, so the constriction lands on the beds that
 *    are still responsive. The kidney is one of them.
 * 6. **The kidney's own autoregulation is what fails last.** Given a falling
 *    perfusion pressure, the afferent arteriole dilates to hold renal blood
 *    flow steady, and that works — until the vasoconstrictor tone means it can
 *    no longer dilate that far. Past that point renal blood flow becomes
 *    pressure-dependent and glomerular filtration falls with it.
 *
 * The loop closes because step 5 raises the arterial pressure that step 1's
 * splanchnic bed is perfused at, so the whole thing is solved for a consistent
 * arterial pressure rather than evaluated in order.
 *
 * ## Why the kidney is normal
 *
 * Nothing in the renal part of this model damages anything. `KF`,
 * `BOWMAN_PRESSURE` and `PLASMA_ONCOTIC_PRESSURE` are constants; the only
 * things that move are two arteriolar resistances, and they move because of a
 * signal that arrives from outside the kidney. Set that signal to zero at any
 * disease severity and filtration returns. That is the model's central claim
 * and it is a structural property of how it is written, not a number that was
 * tuned to come out that way.
 *
 * ## The two arterioles do different jobs
 *
 * Angiotensin II constricts the efferent arteriole preferentially, and that is
 * not a detail — it is why glomerular filtration is defended long after renal
 * blood flow has started to fall, and why the filtration fraction rises on the
 * way down. A model with one renal resistance cannot show that, so this one
 * has two.
 *
 * ## Units
 *
 * mmHg and mL/s internally, so resistance is mmHg·s/mL and `ΔP = Q·R` needs no
 * conversion factor. Flows are reported in mL/min because that is how renal
 * blood flow, plasma flow and GFR are quoted.
 *
 * ## What is not here
 *
 * **No tubules.** No sodium handling, no urine output, no tubuloglomerular
 * feedback as a mechanism — the autoregulation here is a range the afferent
 * arteriole can work within, not a macula densa. So no ascites, no dilutional
 * hyponatraemia, no diuretic response, and no distinction between hepatorenal
 * syndrome and prerenal azotaemia from diuretic overuse, which is a bedside
 * distinction this model has no way to make.
 *
 * **No time.** Like the portal model this is an equilibrium. It cannot show
 * HRS-AKI developing over days, and it cannot show the difference between an
 * acute and a chronic course.
 *
 * **No tubular injury.** Acute tubular necrosis is the main differential and
 * the model has nothing to represent it with.
 *
 * **Not a diagnosis.** Hepatorenal syndrome is diagnosed by criteria that
 * include the absence of shock, of nephrotoxins, and of structural kidney
 * disease, and by a failure to respond to volume expansion. None of that is
 * in here.
 */

// --------------------------------------------------------------------------
// The systemic circulation
// --------------------------------------------------------------------------

/**
 * Right atrial and central venous pressure, mmHg — the downstream reference
 * for every systemic bed here.
 *
 * The same value the portal model uses for the hepatic veins, which is what
 * makes the two models composable: the splanchnic-hepatic path this model
 * borrows ends where its own systemic paths end.
 */
export const CENTRAL_VENOUS_PRESSURE = HEPATIC_VEIN_PRESSURE;

/**
 * The healthy systemic circulation, calibrated so that a normal liver at no
 * splanchnic vasodilation reproduces a mean arterial pressure of about
 * 90 mmHg, a cardiac output of about 5 L/min, and a splanchnic circulation
 * taking a fifth of it.
 *
 * These are reference values a model is anchored at, not measurements.
 */
export const SYSTEMIC_REFERENCE = {
  /** mmHg. The pressure the portal model is calibrated at, so the two agree. */
  meanArterialPressureMmHg: MEAN_ARTERIAL_PRESSURE,
  /** mL/min. */
  cardiacOutputMlPerMin: 5000,
};

/** mmHg·s/mL. Systemic vascular resistance at the reference state. */
export const REFERENCE_SVR =
  (SYSTEMIC_REFERENCE.meanArterialPressureMmHg - CENTRAL_VENOUS_PRESSURE) /
  perMinuteToPerSecond(SYSTEMIC_REFERENCE.cardiacOutputMlPerMin);

/**
 * How completely the heart makes up for a fallen systemic resistance, at full
 * `cardiacReserve`.
 *
 * Cardiac output is taken as `CO_ref · (SVR_ref / SVR)^exponent`. At an
 * exponent of 1 the heart restores flow exactly and arterial pressure never
 * moves; at 0 output is fixed and pressure follows resistance all the way
 * down. The hyperdynamic circulation of cirrhosis is neither: output rises
 * substantially and pressure still falls. This is the parameter that says by
 * how much, and it is a calibration choice, not a measured property of a
 * heart.
 */
export const CARDIAC_COMPENSATION_EXPONENT = 0.62;

/**
 * How far cirrhotic cardiomyopathy can reduce that compensation, as a fraction
 * of it. `cardiacReserve: 0` leaves the heart with this share of the response.
 */
export const MINIMUM_CARDIAC_COMPENSATION = 0.3;

/**
 * How much a full course of albumin raises cardiac output at a given systemic
 * resistance, as a fraction.
 *
 * Albumin in this model is central blood volume, and central blood volume is
 * preload. It is not oncotic pressure: the glomerular oncotic pressure below
 * does not move when albumin is given, which is a simplification and a
 * significant one, since hypoalbuminaemia is real in these patients and does
 * affect filtration.
 */
export const ALBUMIN_OUTPUT_GAIN = 0.18;

/**
 * How much splanchnic vasodilation a full dose of terlipressin reverses.
 *
 * Terlipressin is a vasopressin V1 agonist and the receptors it works through
 * are concentrated in the splanchnic circulation. It is represented here as
 * splanchnic vasoconstriction and nothing else, which is why the model can
 * show it working through the same variable the disease works through.
 */
export const TERLIPRESSIN_SPLANCHNIC_EFFECT = 0.85;

// --------------------------------------------------------------------------
// The vasoconstrictor response
// --------------------------------------------------------------------------

/**
 * The shortfall in arterial perfusion pressure at which the vasoconstrictor
 * systems are half activated, as a fraction of the reference.
 *
 * `activation` here is a dimensionless index between 0 and 1, not a renin
 * concentration, not a noradrenaline level, and not convertible into either.
 * It stands for the whole of the renin-angiotensin-aldosterone system, the
 * sympathetic outflow and vasopressin at once, because the model's subject is
 * what they do together to a kidney rather than how they differ.
 *
 * It is driven by arterial pressure because that is what a baroreceptor
 * senses. That is not a retreat from the arterial underfilling account: in
 * this model the pressure falls *because* the arterial bed has dilated faster
 * than the heart can fill it, and `arterialUnderfilling` below reports that
 * dilation separately so the cause stays visible next to its consequence.
 */
export const ACTIVATION_HALF_PRESSURE_DEFICIT = 0.05;

/**
 * How much the vasoconstrictor systems can raise resistance in the beds that
 * still respond to them, as a fraction, at full activation.
 *
 * This is the term that defends arterial pressure. It is also, through the
 * renal constants below, the term that takes the kidney's autoregulatory
 * reserve away — the same signal doing both is the point of the model.
 */
export const SYSTEMIC_CONSTRICTION_GAIN = 0.55;

/**
 * How far the non-splanchnic arterial beds dilate alongside the splanchnic
 * ones, as a fraction of their conductance, at full vasodilation.
 *
 * The arterial vasodilation of cirrhosis is not confined to the splanchnic
 * circulation — the same mediators reach the systemic beds, and the
 * hyperdynamic circulation is measured as a fall in *systemic* vascular
 * resistance, not a splanchnic one. Without this term the splanchnic bed on
 * its own is too small a share of the circulation to move systemic resistance
 * far, and the model would answer "nothing much happens", which is wrong.
 *
 * How much of the vasodilation is splanchnic and how much is elsewhere is a
 * split this model is not in a position to measure, and this constant is the
 * split it assumes.
 */
export const SYSTEMIC_VASODILATION_GAIN = 1.0;

// --------------------------------------------------------------------------
// The kidney
// --------------------------------------------------------------------------

/**
 * The healthy kidneys, both of them together, at a mean arterial pressure of
 * 90 mmHg. Textbook values, and the reference the resistances are derived
 * from rather than the other way round.
 */
export const RENAL_REFERENCE = {
  /** mL/min, both kidneys — about a fifth of cardiac output. */
  renalBloodFlowMlPerMin: 1100,
  /** mL/min. */
  glomerularFiltrationRateMlPerMin: 120,
  /** mmHg. Glomerular capillary hydrostatic pressure. */
  glomerularPressureMmHg: 50,
};

/** Fraction of blood that is plasma. Haematocrit 0.45. */
export const PLASMA_FRACTION = 0.55;

/** mmHg. Hydrostatic pressure in Bowman's space. Held constant. */
export const BOWMAN_PRESSURE = 12;

/**
 * mmHg. Glomerular capillary oncotic pressure, taken as a single mean value.
 *
 * Oncotic pressure genuinely rises along the glomerular capillary as plasma is
 * filtered, from roughly 25 mmHg at the afferent end upward, and in some
 * conditions rises far enough to stop filtration before the end of the
 * capillary. A mean value cannot show that. It is used here because the
 * model's subject is the arterioles either side of the capillary, not the
 * profile along it.
 */
export const PLASMA_ONCOTIC_PRESSURE = 28;

/** mL/min/mmHg. Glomerular ultrafiltration coefficient, both kidneys. */
export const KF = (() => {
  const netFiltrationPressure =
    RENAL_REFERENCE.glomerularPressureMmHg - BOWMAN_PRESSURE - PLASMA_ONCOTIC_PRESSURE;
  return RENAL_REFERENCE.glomerularFiltrationRateMlPerMin / netFiltrationPressure;
})();

/** mmHg·s/mL. Afferent arteriolar resistance at the reference state. */
export const REFERENCE_AFFERENT_RESISTANCE =
  (SYSTEMIC_REFERENCE.meanArterialPressureMmHg - RENAL_REFERENCE.glomerularPressureMmHg) /
  perMinuteToPerSecond(RENAL_REFERENCE.renalBloodFlowMlPerMin);

/**
 * mmHg·s/mL. Efferent resistance at the reference state — everything between
 * the glomerular capillary and the renal vein, so the peritubular bed is
 * lumped into it.
 *
 * Lumping is acceptable here because the peritubular resistance is not a
 * control: nothing in the model moves it independently, and what the efferent
 * arteriole is for in this model is setting the glomerular pressure, which
 * depends on the total downstream resistance and not on where it sits.
 */
export const REFERENCE_EFFERENT_RESISTANCE =
  (RENAL_REFERENCE.glomerularPressureMmHg - CENTRAL_VENOUS_PRESSURE) /
  perMinuteToPerSecond(RENAL_REFERENCE.renalBloodFlowMlPerMin);

/**
 * How far the afferent arteriole can dilate below its reference resistance,
 * and how far it can constrict above it, with no vasoconstrictor tone.
 *
 * Autoregulation in this model is exactly this range. Within it the afferent
 * arteriole takes whatever resistance holds renal blood flow at its reference;
 * outside it, flow follows pressure. A floor of `MINIMUM` puts the lower limit
 * of autoregulation near a mean arterial pressure of 70 mmHg, which is roughly
 * where it is usually drawn.
 *
 * This is a range, not a mechanism. There is no myogenic response and no
 * tubuloglomerular feedback here; there is a band the arteriole may work in
 * and an assumption that within it, it finds the right answer.
 */
export const AFFERENT_AUTOREGULATION = {
  minimumFactor: 0.78,
  maximumFactor: 2.4,
};

/**
 * How much vasoconstrictor activation the afferent arteriole is shielded from
 * before the band starts to shift at all.
 *
 * The afferent arteriole is relatively protected against circulating
 * vasoconstrictors by locally produced vasodilators, of which the renal
 * prostaglandins are the ones with a drug attached: this is why a
 * non-steroidal anti-inflammatory can precipitate renal failure in a patient
 * whose vasoconstrictor systems are already activated, and why that patient is
 * fine without it. `prostaglandinInhibition` removes the shield.
 *
 * The size of the shield is a calibration choice. That there is one, and that
 * blocking prostaglandin synthesis removes it, is not.
 */
export const AFFERENT_PROSTAGLANDIN_PROTECTION = 0.45;

/**
 * How far vasoconstrictor activation shifts that whole band upward, as a
 * fraction, once past the protection above.
 *
 * This is the mechanism of the syndrome as this model tells it. It does not
 * constrict the afferent arteriole directly — it removes the arteriole's
 * ability to dilate. The kidney does not fail because it is being squeezed; it
 * fails because it has run out of room to compensate.
 */
export const AFFERENT_CONSTRICTOR_GAIN = 1.1;

/**
 * How much more the efferent arteriole constricts than the afferent band
 * shifts, at full activation.
 *
 * Angiotensin II acts preferentially on the efferent arteriole. That
 * preference is why the filtration fraction rises as renal blood flow falls,
 * and why glomerular filtration holds up for as long as it does.
 */
export const EFFERENT_CONSTRICTOR_GAIN = 0.55;

/**
 * How far the ultrafiltration coefficient falls at full vasoconstrictor
 * activation, as a fraction.
 *
 * Angiotensin II contracts the glomerular mesangial cells, which reduces the
 * surface area available for filtration. It is the third thing the same signal
 * does, and without it a model with an intact afferent arteriole and a
 * constricted efferent one would predict that early vasoconstrictor activation
 * *raises* glomerular filtration well above normal, which it does not.
 */
export const KF_CONSTRICTOR_REDUCTION = 0.5;

export const DEFAULT_CONTROLS = {
  /**
   * Structural intrahepatic resistance, as in the portal model. 1 is a healthy
   * liver. The disease axis.
   */
  structuralResistance: 1,
  /** Splanchnic arteriolar vasodilation, 0–1, as in the portal model. */
  splanchnicVasodilation: 0,
  /** How readily portosystemic collaterals form, 0–1. */
  collateralPropensity: 1,
  /** A splanchnic vasoconstrictor, 0 (none) to 1 (full effect). */
  terlipressin: 0,
  /** Plasma volume expansion with albumin, 0 (none) to 1 (full course). */
  albumin: 0,
  /**
   * Inhibition of renal prostaglandin synthesis, 0 (none) to 1 (complete) — a
   * non-steroidal anti-inflammatory drug. Removes the afferent arteriole's
   * shield against the circulating vasoconstrictors.
   */
  prostaglandinInhibition: 0,
  /**
   * How much of the heart's response to a fallen systemic resistance is
   * intact, 1 (fully) to 0 (cirrhotic cardiomyopathy).
   */
  cardiacReserve: 1,
};

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/**
 * The vasoconstrictor response to a given arterial perfusion pressure.
 *
 * @param {number} meanArterialPressureMmHg
 * @returns {{ pressureDeficit: number, activation: number }}
 */
export function vasoconstrictorActivation(meanArterialPressureMmHg) {
  const reference =
    SYSTEMIC_REFERENCE.meanArterialPressureMmHg - CENTRAL_VENOUS_PRESSURE;
  const perfusion = meanArterialPressureMmHg - CENTRAL_VENOUS_PRESSURE;
  const pressureDeficit = clamp01((reference - perfusion) / reference);
  const activation = pressureDeficit / (pressureDeficit + ACTIVATION_HALF_PRESSURE_DEFICIT);
  return { pressureDeficit, activation };
}

/**
 * The kidneys at a given arterial pressure and vasoconstrictor activation.
 *
 * Nothing in here knows about the liver. It takes a perfusion pressure and a
 * signal, and it is the same function whether that signal came from cirrhosis,
 * from haemorrhage, or from nothing at all.
 *
 * @param {{ meanArterialPressureMmHg: number, activation: number }} inputs
 */
export function solveKidney({ meanArterialPressureMmHg, activation, prostaglandinInhibition = 0 }) {
  const perfusionPressure = Math.max(0, meanArterialPressureMmHg - CENTRAL_VENOUS_PRESSURE);
  const referencePerfusionPressure =
    SYSTEMIC_REFERENCE.meanArterialPressureMmHg - CENTRAL_VENOUS_PRESSURE;

  // What the afferent arteriole actually feels: the activation it is not
  // shielded from, rescaled so that full activation is still full effect.
  const protection = AFFERENT_PROSTAGLANDIN_PROTECTION * (1 - clamp01(prostaglandinInhibition));
  const feltByAfferent =
    protection >= 1 ? 0 : Math.max(0, activation - protection) / (1 - protection);
  const tone = 1 + AFFERENT_CONSTRICTOR_GAIN * feltByAfferent;

  // The resistance that would hold renal blood flow at its reference value,
  // and the band the arteriole is actually allowed to work in.
  const autoregulatingResistance =
    REFERENCE_AFFERENT_RESISTANCE * (perfusionPressure / referencePerfusionPressure);
  const floor = REFERENCE_AFFERENT_RESISTANCE * AFFERENT_AUTOREGULATION.minimumFactor * tone;
  const ceiling = REFERENCE_AFFERENT_RESISTANCE * AFFERENT_AUTOREGULATION.maximumFactor * tone;
  const afferentResistance = Math.min(ceiling, Math.max(floor, autoregulatingResistance));

  const efferentResistance =
    REFERENCE_EFFERENT_RESISTANCE * (1 + EFFERENT_CONSTRICTOR_GAIN * activation);

  const renalBloodFlow = perfusionPressure / (afferentResistance + efferentResistance);
  const glomerularPressure = meanArterialPressureMmHg - renalBloodFlow * afferentResistance;
  const netFiltrationPressure = glomerularPressure - BOWMAN_PRESSURE - PLASMA_ONCOTIC_PRESSURE;
  const filtrationCoefficient = KF * (1 - KF_CONSTRICTOR_REDUCTION * activation);
  const filtrationRate = Math.max(0, filtrationCoefficient * netFiltrationPressure);
  const plasmaFlow = perSecondToPerMinute(renalBloodFlow) * PLASMA_FRACTION;

  return {
    afferentResistance,
    efferentResistance,
    filtrationCoefficient,
    afferentToneFelt: feltByAfferent,
    renalBloodFlowMlPerMin: perSecondToPerMinute(renalBloodFlow),
    renalPlasmaFlowMlPerMin: plasmaFlow,
    glomerularPressureMmHg: glomerularPressure,
    netFiltrationPressureMmHg: netFiltrationPressure,
    glomerularFiltrationRateMlPerMin: filtrationRate,
    filtrationFraction: plasmaFlow > 0 ? filtrationRate / plasmaFlow : 0,
    /**
     * Whether the afferent arteriole still has somewhere to go. Once this is
     * false the kidney has stopped autoregulating and renal blood flow follows
     * arterial pressure — which is the haemodynamic definition of the
     * syndrome, as this model states it.
     */
    autoregulating: autoregulatingResistance > floor && autoregulatingResistance < ceiling,
    /**
     * How much dilating room is left, as a fraction of the reference afferent
     * resistance. Zero or below means the floor is binding.
     */
    autoregulatoryReserve:
      (autoregulatingResistance - floor) / REFERENCE_AFFERENT_RESISTANCE,
  };
}

/**
 * Solve the liver, the systemic circulation and the kidneys together.
 *
 * There is one unknown — the mean arterial pressure — and everything else
 * follows from it, including the splanchnic inflow that helps determine it.
 * So it is solved rather than stated, the same way the portal pressure is in
 * the model this one imports.
 *
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solveHepatorenal(controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };

  const effectiveVasodilation = clamp01(
    settings.splanchnicVasodilation - TERLIPRESSIN_SPLANCHNIC_EFFECT * clamp01(settings.terlipressin)
  );
  const compensation =
    CARDIAC_COMPENSATION_EXPONENT *
    (MINIMUM_CARDIAC_COMPENSATION +
      (1 - MINIMUM_CARDIAC_COMPENSATION) * clamp01(settings.cardiacReserve));
  const referenceOutput = perMinuteToPerSecond(
    SYSTEMIC_REFERENCE.cardiacOutputMlPerMin * (1 + ALBUMIN_OUTPUT_GAIN * clamp01(settings.albumin))
  );

  /** Everything the splanchnic bed is not, at the reference state. */
  const referenceOtherConductance = (() => {
    const reference = solvePortalCirculation({
      structuralResistance: 1,
      splanchnicVasodilation: 0,
      collateralPropensity: PORTAL_DEFAULTS.collateralPropensity,
    });
    const splanchnicConductance =
      perMinuteToPerSecond(reference.splanchnicInflowMlPerMin) /
      (SYSTEMIC_REFERENCE.meanArterialPressureMmHg - CENTRAL_VENOUS_PRESSURE);
    return 1 / REFERENCE_SVR - splanchnicConductance;
  })();

  const dilatedOtherFactor = 1 + SYSTEMIC_VASODILATION_GAIN * effectiveVasodilation;

  /** Everything that follows from a candidate arterial pressure. */
  const stateAt = (meanArterialPressure) => {
    const portal = solvePortalCirculation({
      structuralResistance: settings.structuralResistance,
      splanchnicVasodilation: effectiveVasodilation,
      collateralPropensity: settings.collateralPropensity,
      meanArterialPressureMmHg: meanArterialPressure,
    });
    const perfusionPressure = meanArterialPressure - CENTRAL_VENOUS_PRESSURE;
    const splanchnicConductance =
      perMinuteToPerSecond(portal.splanchnicInflowMlPerMin) / perfusionPressure;

    // The baroreflex reads the candidate pressure, so there is no inner loop:
    // the constriction it produces changes the pressure, and that is the outer
    // fixed point's business.
    const { activation, pressureDeficit } = vasoconstrictorActivation(meanArterialPressure);
    const otherConductance =
      (referenceOtherConductance * dilatedOtherFactor) /
      (1 + SYSTEMIC_CONSTRICTION_GAIN * activation);
    const systemicResistance = 1 / (splanchnicConductance + otherConductance);

    const cardiacOutput =
      referenceOutput * (REFERENCE_SVR / systemicResistance) ** compensation;

    return {
      portal,
      splanchnicConductance,
      otherConductance,
      systemicResistance,
      cardiacOutput,
      activation,
      pressureDeficit,
      /** The dilation itself, as a fractional fall in systemic resistance. */
      underfilling: clamp01(1 - systemicResistance / REFERENCE_SVR),
      /** What the pressure would have to be for this output and resistance. */
      impliedPressure: CENTRAL_VENOUS_PRESSURE + cardiacOutput * systemicResistance,
    };
  };

  const solved = fixedPoint({
    initial: SYSTEMIC_REFERENCE.meanArterialPressureMmHg,
    next: (pressure) => stateAt(pressure).impliedPressure,
    blend: (a, b, t) => a + (b - a) * t,
    distance: (a, b) => Math.abs(a - b),
    damping: 0.35,
    tolerance: 1e-10,
    maxIterations: 600,
  });

  const meanArterialPressure = solved.value;
  const systemic = stateAt(meanArterialPressure);
  const kidney = solveKidney({
    meanArterialPressureMmHg: meanArterialPressure,
    activation: systemic.activation,
    prostaglandinInhibition: settings.prostaglandinInhibition,
  });

  return {
    controls: settings,
    converged: solved.converged,
    effectiveSplanchnicVasodilation: effectiveVasodilation,

    portal: systemic.portal,

    systemic: {
      meanArterialPressureMmHg: meanArterialPressure,
      cardiacOutputMlPerMin: perSecondToPerMinute(systemic.cardiacOutput),
      systemicVascularResistance: systemic.systemicResistance,
      splanchnicFlowMlPerMin: systemic.portal.splanchnicInflowMlPerMin,
      splanchnicShareOfOutput:
        systemic.portal.splanchnicInflowMlPerMin /
        perSecondToPerMinute(systemic.cardiacOutput),
    },

    neurohumoral: {
      /** The cause: how far the arterial bed has dilated below reference. */
      arterialUnderfilling: systemic.underfilling,
      /** Its consequence, and what the baroreceptors read. */
      perfusionPressureDeficit: systemic.pressureDeficit,
      /** The response: RAAS, sympathetic outflow and vasopressin as one index. */
      activation: systemic.activation,
    },

    kidney,
  };
}

/**
 * The same kidney at the same arterial pressure, with the vasoconstrictor
 * signal switched off.
 *
 * This is the model's own control experiment, and the reason it is worth
 * having: whatever the liver is doing, removing the signal and nothing else
 * restores filtration, because there is nothing else wrong. It is the model's
 * stand-in for what a transplanted kidney does in a normal recipient.
 *
 * @param {ReturnType<typeof solveHepatorenal>} state
 */
export function kidneyWithoutTheSignal(state) {
  return solveKidney({
    meanArterialPressureMmHg: state.systemic.meanArterialPressureMmHg,
    activation: 0,
    prostaglandinInhibition: state.controls.prostaglandinInhibition,
  });
}

/** Convenience: the healthy reference state, solved rather than asserted. */
export function healthyState() {
  return solveHepatorenal({ structuralResistance: 1, splanchnicVasodilation: 0 });
}
