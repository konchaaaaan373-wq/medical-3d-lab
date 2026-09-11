/**
 * Where a blockage sits in the biliary tree, and what that decides.
 *
 * The question this model answers is **not** "how bad is the obstruction". It
 * is:
 *
 * > Given a blockage at one place in the tree, which parts of the tree are now
 * > behind it, and which are not?
 *
 * That is a question about topology, and it is the reason biliary obstruction
 * is taught by site rather than by severity: a stone in the cystic duct and a
 * stone in the common bile duct are not a mild and a severe version of one
 * thing. One isolates the gallbladder and leaves bile reaching the gut; the
 * other stops bile reaching the gut and distends the gallbladder along with
 * everything else above it. A third, at the very end, takes the pancreatic duct
 * with it, because that is the one place the two share a door.
 *
 * So the site is a **choice** and the axis is **how complete** — the same shape
 * `src/models/renalFiltration.js` uses, and for the same reason.
 *
 * ## What is solved
 *
 * One path, three resistances in series, and a source that gives up.
 *
 * Bile is secreted against pressure. It is not a pump: hepatocyte secretion
 * falls as the pressure in the ducts rises and stops altogether at a ceiling of
 * a few tens of centimetres of water. That single fact is what keeps this model
 * honest — with a complete blockage the pressure does not run away, it climbs
 * to the ceiling and the flow goes to zero:
 *
 * ```text
 * Q = Qmax · (1 − P/Pmax),  P = Q · R      ⇒   Q = Qmax / (1 + Qmax·R/Pmax)
 * ```
 *
 * with the duodenum as the zero of pressure. The pressure at any node is the
 * flow times **the resistance still downstream of it**, which is what makes the
 * answer depend on where the blockage is rather than on how big it is.
 *
 * The pancreatic duct is a second path of the same shape, sharing only the last
 * resistance — the sphincter at the papilla. That sharing is the whole content
 * of the ampullary case.
 *
 * The gallbladder is a dead end. At equilibrium nothing flows along the cystic
 * duct, so the gallbladder sits at whatever pressure the junction is at — and
 * stretches to match, through a compliance. Block the cystic duct and it is
 * cut off instead: the junction may do what it likes and the gallbladder no
 * longer hears about it.
 *
 * ## What is not here
 *
 * No bilirubin, no jaundice, no pain, no inflammation, no infection, no stone,
 * no enzyme. No time: every state is an equilibrium, so nothing in this file
 * can show a gallbladder filling over hours or a duct dilating over days. The
 * model has pressures and flows, and the things a person or a clinician would
 * actually name are consequences of them that it does not compute.
 *
 * PROTOTYPE CALIBRATION. The resistances are the numbers that put a normal
 * common bile duct near ten centimetres of water at a normal bile flow. They
 * are not measurements of anybody, and no figure here is a threshold.
 */

/** The named lengths bile passes through, from the liver to the gut. */
export const BILE_PATH = Object.freeze([
  'right-hepatic-duct',
  'left-hepatic-duct',
  'common-hepatic-duct',
  'common-bile-duct',
  'sphincter',
]);

/**
 * Where a blockage can sit.
 *
 * Each names the resistance it multiplies. **`cystic-duct` is not on the bile
 * path at all** — that is the point of it — and `ampulla` is the only one that
 * touches the pancreatic duct, because the sphincter is the only resistance the
 * two paths share.
 */
export const OBSTRUCTION_SITES = Object.freeze([
  { id: 'none', blocks: null },
  { id: 'cystic-duct', blocks: 'cystic' },
  { id: 'common-bile-duct', blocks: 'commonBile' },
  { id: 'ampulla', blocks: 'sphincter' },
]);

/**
 * Textbook central values, and the calibration that reproduces them.
 *
 * `maxSecretoryPressureCmH2O` is the one that matters: hepatic bile secretion
 * is described as ceasing somewhere around twenty-five to thirty centimetres of
 * water, and it is what stops a complete obstruction producing an unbounded
 * pressure in a model that has no rupture in it.
 */
export const REFERENCE = Object.freeze({
  hepaticSecretionMlPerMin: 0.4,
  maxSecretoryPressureCmH2O: 25,
  pancreaticSecretionMlPerMin: 1.0,
  maxPancreaticSecretoryPressureCmH2O: 40,
  /** Where an unobstructed gallbladder sits, and how much it gives per cmH2O. */
  gallbladderRestingVolumeMl: 30,
  gallbladderComplianceMlPerCmH2O: 3.4,
  /**
   * How long the gallbladder has to keep up with the duct beside it.
   *
   * A gallbladder fills and empties over the time a meal takes, so "is it still
   * part of the system" is a question about a time constant rather than about
   * an equilibrium — given forever, even a pinhole equalises. See
   * `gallbladderTimeConstantMin`.
   */
  gallbladderWindowMin: 60,
});

/**
 * Resistances, in cmH2O per mL/min.
 *
 * Nearly all of the normal resistance is the sphincter: the ducts themselves
 * are wide and short, which is why a normal common bile duct pressure is a
 * sphincter pressure. Chosen so that 0.4 mL/min of bile leaves at about ten
 * centimetres of water.
 */
export const RESISTANCE = Object.freeze({
  hepatic: 0.6,
  commonHepatic: 0.8,
  commonBile: 1.2,
  sphincter: 22,
  /** The cystic duct carries no steady flow; this is what a blockage acts on. */
  cystic: 2.5,
  pancreatic: 2.0,
});

export const DEFAULT_CONTROLS = Object.freeze({
  site: 'none',
  /** 0 = patent, 1 = complete. */
  completeness: 0,
  /**
   * What a complete blockage adds to the resistance it sits in, in
   * cmH2O per mL/min.
   *
   * Added rather than multiplied, because the resistances here differ by an
   * order of magnitude — a sphincter is already twenty-two and a cystic duct is
   * two and a half — and a multiplier would make "complete" mean something
   * different in each. A stone is the same stone wherever it lodges.
   */
  occlusionResistance: 1200,
  /** Bile the liver would secrete at zero back-pressure, as a multiple. */
  hepaticSecretion: 1,
  /** Pancreatic juice at rest, as a multiple. Rises with a meal. */
  pancreaticSecretion: 1,
});

const clamp01 = (value) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

/**
 * What the blockage adds to a resistance, given where the blockage is.
 *
 * Nothing is added unless it is *the* obstructed one. A partial blockage is a
 * smooth ramp rather than a switch, so a reader can watch a pressure climb
 * rather than see it jump — and because most real obstruction is partial for a
 * while, a model with only "open" and "shut" would teach a binary that is not
 * there.
 */
function addedTo(name, { site, completeness, occlusionResistance }) {
  const blocked = OBSTRUCTION_SITES.find((entry) => entry.id === site)?.blocks;
  if (blocked !== name) return 0;
  // Quadratic rather than linear: halving a lumen is not halving a resistance,
  // and a reader dragging this should meet most of the change near the end.
  return occlusionResistance * Math.pow(clamp01(completeness), 2);
}

/**
 * A secreting path that gives up against pressure.
 *
 * @param {number} maxFlow flow at zero back-pressure
 * @param {number} ceiling pressure at which secretion stops
 * @param {number} resistance total resistance to the duodenum
 */
function secretingPath(maxFlow, ceiling, resistance) {
  const flow = maxFlow / (1 + (maxFlow * resistance) / ceiling);
  return { flow, pressure: flow * resistance };
}

/**
 * Solve the tree.
 *
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solveBiliaryObstruction(controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const gain = { ...settings, completeness: clamp01(settings.completeness) };

  const resistance = Object.fromEntries(
    Object.entries(RESISTANCE).map(([name, base]) => [name, base + addedTo(name, gain)])
  );

  // --- bile, liver to duodenum ---------------------------------------------
  const bileResistance =
    resistance.hepatic + resistance.commonHepatic + resistance.commonBile + resistance.sphincter;
  const bile = secretingPath(
    REFERENCE.hepaticSecretionMlPerMin * Math.max(0, settings.hepaticSecretion),
    REFERENCE.maxSecretoryPressureCmH2O,
    bileResistance
  );

  // --- pancreatic juice, sharing only the sphincter --------------------------
  const pancreaticResistance = resistance.pancreatic + resistance.sphincter;
  const pancreatic = secretingPath(
    REFERENCE.pancreaticSecretionMlPerMin * Math.max(0, settings.pancreaticSecretion),
    REFERENCE.maxPancreaticSecretoryPressureCmH2O,
    pancreaticResistance
  );

  /**
   * The pressure at each node: the flow through it times what is still
   * downstream of it.
   *
   * **This is where the site decides the picture.** A blockage low down leaves
   * a lot of resistance downstream of every node above it, so every one of them
   * is pressurised. A blockage high up leaves the nodes below it with almost
   * nothing downstream, so they are not.
   */
  const downstreamOf = {
    'right-hepatic-duct': resistance.hepatic + resistance.commonHepatic + resistance.commonBile + resistance.sphincter,
    'left-hepatic-duct': resistance.hepatic + resistance.commonHepatic + resistance.commonBile + resistance.sphincter,
    'common-hepatic-duct': resistance.commonHepatic + resistance.commonBile + resistance.sphincter,
    'common-bile-duct': resistance.commonBile + resistance.sphincter,
  };
  const pressure = Object.fromEntries(
    Object.entries(downstreamOf).map(([id, below]) => [id, bile.flow * below])
  );
  pressure['pancreatic-duct'] = pancreatic.flow * pancreaticResistance;

  /**
   * The gallbladder, which is a dead end and therefore not on the path.
   *
   * **Resistance alone cannot disconnect a dead end.** Given forever, even a
   * pinhole equalises, so asking "is the gallbladder still part of the system"
   * as an equilibrium question has only one answer and it is the wrong one.
   * The right question is how long it takes, and that is a time constant of
   * exactly the kind the COPD scene is built on: the cystic duct's resistance
   * times the gallbladder's compliance.
   *
   * At rest that is about eight and a half minutes, against a meal's hour. It
   * does not take much narrowing to lose that — which is itself worth knowing,
   * and is why a cystic-duct stone cuts a gallbladder off from a duct running
   * past it at an ordinary pressure.
   */
  const timeConstantMin = resistance.cystic * REFERENCE.gallbladderComplianceMlPerCmH2O;
  const cysticOpen = timeConstantMin < REFERENCE.gallbladderWindowMin;
  const restingPressureCmH2O = referencePressures()['common-bile-duct'];
  const junctionPressure = pressure['common-bile-duct'];
  const gallbladderPressure = cysticOpen ? junctionPressure : restingPressureCmH2O;
  const gallbladderVolume =
    REFERENCE.gallbladderRestingVolumeMl +
    REFERENCE.gallbladderComplianceMlPerCmH2O * (gallbladderPressure - restingPressureCmH2O);

  /**
   * Which parts of the tree are behind the blockage.
   *
   * Read from the pressures rather than listed per site: a segment is behind it
   * when its pressure has risen meaningfully above where it sits with nothing
   * blocked. That way the answer to "what does a stone here affect" is the
   * model's, and a change to the topology changes it.
   */
  const restingPressure = referencePressures();
  const behind = Object.fromEntries(
    Object.entries(pressure).map(([id, value]) => [id, value > restingPressure[id] * 1.25 + 0.5])
  );
  behind.gallbladder = cysticOpen && gallbladderPressure > restingPressureCmH2O * 1.25;

  return {
    controls: settings,
    resistance,
    pressure,
    /**
     * What each of those pressures is with nothing blocked.
     *
     * Handed out rather than left inside, because anything that draws this
     * needs to know what "raised" means for *this* segment: the pancreatic duct
     * sits at fifteen centimetres of water when everything is open and the
     * common bile duct sits at seven, and a drawing that used one number for
     * both would swell an untouched pancreatic duct on every frame.
     */
    restingPressure: { ...restingPressure, gallbladder: restingPressureCmH2O },
    behind,
    /** Whether the gallbladder can keep up with the duct over a meal. */
    gallbladderConnected: cysticOpen,
    gallbladderTimeConstantMin: timeConstantMin,
    gallbladderPressureCmH2O: gallbladderPressure,
    gallbladderVolumeMl: gallbladderVolume,
    bileToDuodenumMlPerMin: bile.flow,
    pancreaticToDuodenumMlPerMin: pancreatic.flow,
    /** As fractions of what an unobstructed tree delivers. */
    bileDeliveredFraction: bile.flow / referenceFlows().bile,
    pancreaticDeliveredFraction: pancreatic.flow / referenceFlows().pancreatic,
  };
}

/** The pressures with nothing blocked, used as the baseline `behind` reads against. */
function referencePressures() {
  const bileResistance =
    RESISTANCE.hepatic + RESISTANCE.commonHepatic + RESISTANCE.commonBile + RESISTANCE.sphincter;
  const bile = secretingPath(
    REFERENCE.hepaticSecretionMlPerMin,
    REFERENCE.maxSecretoryPressureCmH2O,
    bileResistance
  );
  const pancreatic = secretingPath(
    REFERENCE.pancreaticSecretionMlPerMin,
    REFERENCE.maxPancreaticSecretoryPressureCmH2O,
    RESISTANCE.pancreatic + RESISTANCE.sphincter
  );
  return {
    'right-hepatic-duct': bile.flow * bileResistance,
    'left-hepatic-duct': bile.flow * bileResistance,
    'common-hepatic-duct': bile.flow * (RESISTANCE.commonHepatic + RESISTANCE.commonBile + RESISTANCE.sphincter),
    'common-bile-duct': bile.flow * (RESISTANCE.commonBile + RESISTANCE.sphincter),
    'pancreatic-duct': pancreatic.pressure,
  };
}

/** What an unobstructed tree delivers, for the fractions above. */
function referenceFlows() {
  const bile = secretingPath(
    REFERENCE.hepaticSecretionMlPerMin,
    REFERENCE.maxSecretoryPressureCmH2O,
    RESISTANCE.hepatic + RESISTANCE.commonHepatic + RESISTANCE.commonBile + RESISTANCE.sphincter
  );
  const pancreatic = secretingPath(
    REFERENCE.pancreaticSecretionMlPerMin,
    REFERENCE.maxPancreaticSecretoryPressureCmH2O,
    RESISTANCE.pancreatic + RESISTANCE.sphincter
  );
  return { bile: bile.flow, pancreatic: pancreatic.flow };
}
