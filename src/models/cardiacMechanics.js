/**
 * Closed-loop lumped-parameter circulation model.
 *
 * Replaces the earlier table of hand-placed volumes. Nothing here is keyframed:
 * the disease state sets *mechanical* properties — contractility, chamber
 * stiffness, unstressed volume, vascular resistance, circulating volume, rate —
 * and end-diastolic volume, ejection fraction, stroke volume, cardiac output,
 * filling pressure and pulmonary venous pressure all fall out of the dynamics.
 *
 * Structure (seven compartments, one conserved volume):
 *
 *   LV --aortic--> systemic arteries --R_sys--> systemic veins --tricuspid-->
 *   RV --pulmonic--> pulmonary arteries --R_pulm--> pulmonary veins -->
 *   left atrium --mitral--> LV
 *
 * The right ventricle is not drawn anywhere, but it has to be in the maths: it
 * is what makes the loop close, and without it blood could not back up into the
 * pulmonary veins when the left ventricle fails. That backing-up is the whole
 * mechanism behind pulmonary congestion, so the model has to produce it rather
 * than have it asserted.
 *
 * Chambers use time-varying elastance (Suga & Sagawa): an end-systolic
 * pressure-volume relationship blended with a non-linear end-diastolic one by a
 * normalised activation function. Valves are ideal one-way resistances.
 *
 * Units throughout: mL, mmHg, seconds, mL/s, mmHg·s/mL, mL/mmHg, mmHg/mL.
 *
 * Volumes in the passive compartments are *stressed* volumes — the part above
 * the unstressed filling that actually generates pressure. Chamber volumes are
 * carried in full, their own unstressed volume appearing as V0. The conserved
 * quantity is therefore circulating stressed volume, not total blood volume.
 */

/** Indices into the state vector. */
export const LV = 0;
export const SA = 1;
export const SV = 2;
export const RV = 3;
export const PA = 4;
export const PV = 5;
export const LA = 6;
export const COMPARTMENTS = 7;

/**
 * Normalised ventricular activation, 0..1 (double-Hill).
 * Peaks around a third of the way through the cycle and falls quickly, which
 * is what gives the pressure trace its shape rather than a sine wave's.
 */
function ventricularActivation(phase) {
  const a1 = 0.269;
  const n1 = 1.32;
  const a2 = 0.452;
  const n2 = 21.9;
  const g1 = (phase / a1) ** n1;
  const g2 = (phase / a2) ** n2;
  return (g1 / (1 + g1)) * (1 / (1 + g2));
}

/** Peak of the raw double-Hill, so activation can be normalised to 1. */
const ACTIVATION_PEAK = (() => {
  let peak = 0;
  for (let i = 0; i <= 2000; i++) peak = Math.max(peak, ventricularActivation(i / 2000));
  return peak;
})();

/** Atrial contraction: a short bump in late diastole, just before the ventricle. */
function atrialActivation(phase) {
  const start = 0.82;
  const duration = 0.16;
  const local = (phase - start + 1) % 1;
  if (local > duration) return 0;
  return Math.sin((Math.PI * local) / duration) ** 2;
}

/** Chamber pressure from volume and activation. */
function chamberPressure(volume, activation, chamber) {
  const stretched = volume - chamber.v0;
  const endSystolic = chamber.ees * stretched;
  // Non-linear EDPVR: stiffness rises steeply once the chamber is full, which
  // is what makes end-diastolic pressure sensitive to filling.
  const endDiastolic = chamber.edpvrA * (Math.exp(chamber.edpvrB * stretched) - 1);
  return activation * endSystolic + (1 - activation) * endDiastolic;
}

/** Pressure in a passive elastic compartment holding `volume` of stressed volume. */
const passivePressure = (volume, compliance) => volume / compliance;

/** One-way resistive valve: no flow against the gradient, ever. */
const valveFlow = (upstream, downstream, resistance) =>
  upstream > downstream ? (upstream - downstream) / resistance : 0;

/**
 * Pressures for a state vector at a given point in the cycle.
 * @param {Float64Array} volumes
 * @param {number} phase 0..1
 * @param {object} p parameters
 */
export function pressuresAt(volumes, phase, p) {
  const ventricular = ventricularActivation(phase) / ACTIVATION_PEAK;
  const atrial = atrialActivation(phase);
  return {
    ventricular,
    atrial,
    lv: chamberPressure(volumes[LV], ventricular, p.lv),
    rv: chamberPressure(volumes[RV], ventricular, p.rv),
    la: chamberPressure(volumes[LA], atrial, p.la),
    sa: passivePressure(volumes[SA], p.systemicArterialCompliance),
    sv: passivePressure(volumes[SV], p.systemicVenousCompliance),
    pa: passivePressure(volumes[PA], p.pulmonaryArterialCompliance),
    pv: passivePressure(volumes[PV], p.pulmonaryVenousCompliance),
  };
}

/** Instantaneous flows implied by a set of pressures. */
export function flowsAt(pressures, p) {
  return {
    mitral: valveFlow(pressures.la, pressures.lv, p.mitralResistance),
    aortic: valveFlow(pressures.lv, pressures.sa, p.aorticResistance),
    tricuspid: valveFlow(pressures.sv, pressures.rv, p.tricuspidResistance),
    pulmonic: valveFlow(pressures.rv, pressures.pa, p.pulmonicResistance),
    systemic: (pressures.sa - pressures.sv) / p.systemicResistance,
    pulmonary: (pressures.pa - pressures.pv) / p.pulmonaryResistance,
    pulmonaryVenous: (pressures.pv - pressures.la) / p.pulmonaryVenousResistance,
  };
}

/** dV/dt for every compartment. The sum is zero: volume is conserved. */
function derivatives(volumes, phase, p, out) {
  const pressures = pressuresAt(volumes, phase, p);
  const q = flowsAt(pressures, p);
  out[LV] = q.mitral - q.aortic;
  out[SA] = q.aortic - q.systemic;
  out[SV] = q.systemic - q.tricuspid;
  out[RV] = q.tricuspid - q.pulmonic;
  out[PA] = q.pulmonic - q.pulmonary;
  out[PV] = q.pulmonary - q.pulmonaryVenous;
  out[LA] = q.pulmonaryVenous - q.mitral;
  return out;
}

/** Classical fourth-order Runge-Kutta step over the cycle-normalised phase. */
function step(volumes, phase, dt, cycleLength, p, scratch) {
  const { k1, k2, k3, k4, temp } = scratch;
  const dPhase = dt / cycleLength;

  derivatives(volumes, phase, p, k1);
  for (let i = 0; i < COMPARTMENTS; i++) temp[i] = volumes[i] + (dt / 2) * k1[i];
  derivatives(temp, phase + dPhase / 2, p, k2);
  for (let i = 0; i < COMPARTMENTS; i++) temp[i] = volumes[i] + (dt / 2) * k2[i];
  derivatives(temp, phase + dPhase / 2, p, k3);
  for (let i = 0; i < COMPARTMENTS; i++) temp[i] = volumes[i] + dt * k3[i];
  derivatives(temp, phase + dPhase, p, k4);

  for (let i = 0; i < COMPARTMENTS; i++) {
    volumes[i] += (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
}

function createScratch() {
  return {
    k1: new Float64Array(COMPARTMENTS),
    k2: new Float64Array(COMPARTMENTS),
    k3: new Float64Array(COMPARTMENTS),
    k4: new Float64Array(COMPARTMENTS),
    temp: new Float64Array(COMPARTMENTS),
  };
}

/** A plausible starting distribution of the circulating volume. */
function initialVolumes(p) {
  const volumes = new Float64Array(COMPARTMENTS);
  const total = p.circulatingVolume;
  volumes[LV] = 120;
  volumes[RV] = 120;
  volumes[LA] = 45;
  volumes[SA] = 0.13 * total;
  volumes[PA] = 0.07 * total;
  volumes[PV] = 0.13 * total;
  volumes[SV] = total - volumes[LV] - volumes[RV] - volumes[LA] - volumes[SA] - volumes[PA] - volumes[PV];
  return volumes;
}

/**
 * Integrates until the circulation settles into a repeating beat, then reports
 * that beat.
 *
 * `stepsPerBeat` is the integration step, not a drawing resolution. RK4 has this
 * system converged well before 240 steps — quadrupling it moves ejection
 * fraction by about a thousandth of a percentage point, far below anything the
 * read-out shows — so the default is set for the slider, which asks for a fresh
 * solution on every input event.
 *
 * @param {object} p model parameters
 * @param {{ samples?: number, maxBeats?: number, tolerance?: number, stepsPerBeat?: number, warmStart?: Float64Array }} options
 */
export function solveSteadyState(
  p,
  { samples = 120, maxBeats = 240, tolerance = 0.02, stepsPerBeat = 240, warmStart } = {}
) {
  const cycleLength = 60 / p.heartRate;
  const dt = cycleLength / stepsPerBeat;
  const scratch = createScratch();

  const volumes = warmStart ? Float64Array.from(warmStart) : initialVolumes(p);
  // A warm start from a nearby solution can be off in total volume; rescale so
  // the conserved quantity is always exactly what the parameters ask for.
  rescaleTo(volumes, p.circulatingVolume);

  let previousEdv = Infinity;
  let previousEsv = Infinity;
  let beats = 0;

  for (; beats < maxBeats; beats++) {
    let edv = -Infinity;
    let esv = Infinity;
    for (let i = 0; i < stepsPerBeat; i++) {
      step(volumes, i / stepsPerBeat, dt, cycleLength, p, scratch);
      edv = Math.max(edv, volumes[LV]);
      esv = Math.min(esv, volumes[LV]);
    }
    if (Math.abs(edv - previousEdv) < tolerance && Math.abs(esv - previousEsv) < tolerance) {
      beats += 1;
      break;
    }
    previousEdv = edv;
    previousEsv = esv;
  }

  return { cycle: recordCycle(volumes, p, cycleLength, dt, stepsPerBeat, samples, scratch), beats, volumes };
}

function rescaleTo(volumes, total) {
  let sum = 0;
  for (let i = 0; i < COMPARTMENTS; i++) sum += volumes[i];
  const scale = total / sum;
  for (let i = 0; i < COMPARTMENTS; i++) volumes[i] *= scale;
}

/** Walks one more beat, sampling it evenly and summarising it. */
function recordCycle(volumes, p, cycleLength, dt, stepsPerBeat, samples, scratch) {
  const every = Math.max(1, Math.round(stepsPerBeat / samples));
  const trace = { phase: [], lvVolume: [], lvPressure: [], aorticPressure: [], atrialPressure: [], pulmonaryVenousPressure: [] };

  let edv = -Infinity;
  let esv = Infinity;
  let esvPhase = 0;
  let ejected = 0;
  let aorticIntegral = 0;
  let atrialIntegral = 0;
  let pulmonaryVenousIntegral = 0;
  let pulmonaryArterialIntegral = 0;
  let systemicVenousIntegral = 0;
  let endDiastolicPressure = 0;
  let peakSystolic = -Infinity;
  let aorticPeak = -Infinity;
  let aorticTrough = Infinity;
  // Ejection is whenever the aortic valve is actually open, so the isovolumic
  // periods fall out of the solution rather than being assumed.
  let ejectionStartPhase = null;
  let ejectionEndPhase = null;

  for (let i = 0; i < stepsPerBeat; i++) {
    const phase = i / stepsPerBeat;
    const pressures = pressuresAt(volumes, phase, p);
    const q = flowsAt(pressures, p);

    if (volumes[LV] > edv) {
      edv = volumes[LV];
      // End-diastolic pressure is read at the moment of maximum filling.
      endDiastolicPressure = pressures.lv;
    }
    if (volumes[LV] < esv) {
      esv = volumes[LV];
      esvPhase = phase;
    }
    ejected += q.aortic * dt;
    aorticIntegral += pressures.sa * dt;
    atrialIntegral += pressures.la * dt;
    pulmonaryVenousIntegral += pressures.pv * dt;
    pulmonaryArterialIntegral += pressures.pa * dt;
    systemicVenousIntegral += pressures.sv * dt;
    peakSystolic = Math.max(peakSystolic, pressures.lv);
    if (q.aortic > 0) {
      if (ejectionStartPhase === null) ejectionStartPhase = phase;
      ejectionEndPhase = phase;
    }
    aorticPeak = Math.max(aorticPeak, pressures.sa);
    aorticTrough = Math.min(aorticTrough, pressures.sa);

    if (i % every === 0) {
      trace.phase.push(phase);
      trace.lvVolume.push(volumes[LV]);
      trace.lvPressure.push(pressures.lv);
      trace.aorticPressure.push(pressures.sa);
      trace.atrialPressure.push(pressures.la);
      trace.pulmonaryVenousPressure.push(pressures.pv);
    }

    step(volumes, phase, dt, cycleLength, p, scratch);
  }

  // End-diastole is where filling ends, not where the volume first reaches its
  // maximum. The ventricle sits at end-diastolic volume through a plateau that
  // straddles the start of the cycle (late diastasis, then isovolumic
  // contraction), and the moment worth naming is the last one before ejection
  // pulls the volume down.
  const PLATEAU_TOLERANCE_ML = 0.5;
  let edvPhase = trace.phase[0];
  for (let i = 0; i < trace.phase.length; i++) {
    const next = (i + 1) % trace.phase.length;
    if (trace.lvVolume[i] >= edv - PLATEAU_TOLERANCE_ML && trace.lvVolume[next] < trace.lvVolume[i]) {
      edvPhase = trace.phase[i];
      break;
    }
  }

  const strokeVolume = edv - esv;
  return {
    trace,
    ejectionStartPhase: ejectionStartPhase ?? 0,
    ejectionEndPhase: ejectionEndPhase ?? 0.34,
    edv,
    esv,
    edvPhase,
    esvPhase,
    strokeVolume,
    ejectedVolume: ejected,
    ejectionFraction: strokeVolume / edv,
    cardiacOutput: (strokeVolume * p.heartRate) / 1000,
    endDiastolicPressure,
    peakSystolicPressure: peakSystolic,
    systolicArterialPressure: aorticPeak,
    diastolicArterialPressure: aorticTrough,
    meanArterialPressure: aorticIntegral / cycleLength,
    meanAtrialPressure: atrialIntegral / cycleLength,
    meanPulmonaryVenousPressure: pulmonaryVenousIntegral / cycleLength,
    meanPulmonaryArterialPressure: pulmonaryArterialIntegral / cycleLength,
    meanSystemicVenousPressure: systemicVenousIntegral / cycleLength,
    cycleLength,
    heartRate: p.heartRate,
  };
}

/**
 * Walks a solved beat, handing every integration step to a visitor.
 *
 * The recorded trace is subsampled and carries pressures only, which is all the
 * scene needs. Checking a claim about *flow* — that a valve never reverses, that
 * what crosses a segment over a beat adds up — has to follow the real
 * trajectory at full resolution, because evaluating flows at one frozen set of
 * volumes answers a different question entirely.
 *
 * @param {{ volumes: Float64Array, cycle: { cycleLength: number } }} solution
 * @param {object} p model parameters
 * @param {number} steps
 * @param {(sample: { phase: number, dt: number, pressures: object, flows: object, volumes: Float64Array }) => void} visit
 */
export function walkBeat(solution, p, steps, visit) {
  const volumes = Float64Array.from(solution.volumes);
  const { cycleLength } = solution.cycle;
  const dt = cycleLength / steps;
  const scratch = createScratch();
  for (let i = 0; i < steps; i++) {
    const phase = i / steps;
    const pressures = pressuresAt(volumes, phase, p);
    visit({ phase, dt, pressures, flows: flowsAt(pressures, p), volumes });
    step(volumes, phase, dt, cycleLength, p, scratch);
  }
}

/** Volume at a point in the cycle, interpolated from the recorded beat. */
export function volumeAtPhase(cycle, phase) {
  return sampleTrace(cycle.trace.phase, cycle.trace.lvVolume, phase);
}

export function sampleTrace(phases, values, phase) {
  const wrapped = phase - Math.floor(phase);
  const n = phases.length;
  const position = wrapped * n;
  const index = Math.floor(position) % n;
  const next = (index + 1) % n;
  const t = position - Math.floor(position);
  return values[index] + (values[next] - values[index]) * t;
}

/* --------------------------------------------------------------------------
   Chamber geometry and the named parts of a beat

   These read the solved cycle rather than the parameters, and every scene that
   draws a ventricle needs them, so they live with the solver rather than with
   any one disease. Moved here from the heart-failure scene when the ischemia
   scene needed the same cycle; the functions are unchanged.
   -------------------------------------------------------------------------- */

/** Scene units are centimetres, so 1 mL of blood is 1 cubic scene unit. */
const ML_PER_CUBIC_UNIT = 1;

/**
 * Myocardial density, g/mL. Used only to express the model's myocardial volume
 * as a mass for reference; it is NOT shown in the UI, because the chamber is a
 * truncated-ellipsoid approximation rather than an integrated ventricular
 * shape and would imply a precision the model does not have.
 */
export const MYOCARDIAL_DENSITY_G_PER_ML = 1.05;

/**
 * Cavity volume at a point in the cardiac cycle.
 *
 * Read from the beat the circulation model settled into, so isovolumic periods,
 * the shape of ejection and the two phases of filling are all whatever the
 * mechanics produced rather than a curve chosen to look like a heartbeat.
 *
 * @param {number} phase 0..1 through the cycle
 */
export function cavityVolumeAt(phase, state) {
  return volumeAtPhase(state.cycle, phase);
}

/**
 * Cavity radius for a volume, treating the chamber as a prolate spheroid with
 * semi-axes (r, ratio·r, r): V = 4/3·π·ratio·r³.
 */
export function radiusForVolume(volumeMl, longToShortAxisRatio) {
  return Math.cbrt(volumeMl / ML_PER_CUBIC_UNIT / ((4 / 3) * Math.PI * longToShortAxisRatio));
}

/**
 * Myocardial volume implied by a disease state's end-diastolic geometry.
 *
 * This is the OUTER half of a deliberately two-layer model:
 *
 *   disease state -> ED cavity volume (solved) + ED wall thickness
 *                 -> myocardial volume FOR THAT STATE        <- changes between states
 *                 -> held constant through one cardiac cycle <- incompressibility
 *                 -> systolic wall thickening emerges geometrically
 *
 * Treating myocardium as incompressible is a reasonable assumption *within* a
 * beat. It would be wrong across disease states, where hypertrophy means real
 * growth of muscle — so myocardial volume is recomputed whenever the state
 * changes and only held fixed inside a cycle.
 *
 * Multiplying it by MYOCARDIAL_DENSITY_G_PER_ML gives a mass figure, but that
 * figure is a property of this ellipsoid approximation and must not be read as
 * a clinical echocardiographic LV mass measurement — which is why it is never
 * displayed.
 */
export function myocardialVolumeFor({ edvMl, wallMm, longToShortAxisRatio }) {
  const inner = radiusForVolume(edvMl, longToShortAxisRatio);
  const outer = inner + wallMm / 10; // mm -> cm (scene units)
  return (4 / 3) * Math.PI * longToShortAxisRatio * (outer ** 3 - inner ** 3);
}

/**
 * Chamber geometry for the current instant, with myocardial volume held fixed
 * across the beat (see `myocardialVolumeFor`).
 */
export function ventricleShape({ cavityVolumeMl, myocardialVolumeMl, longToShortAxisRatio }) {
  const cavityRadius = radiusForVolume(cavityVolumeMl, longToShortAxisRatio);
  const outerRadius = radiusForVolume(cavityVolumeMl + myocardialVolumeMl, longToShortAxisRatio);
  return {
    cavityRadius,
    outerRadius,
    cavitySemiLength: cavityRadius * longToShortAxisRatio,
    outerSemiLength: outerRadius * longToShortAxisRatio,
    wallThickness: outerRadius - cavityRadius,
    /** Wall thickness relative to cavity radius — rises with concentric hypertrophy. */
    relativeWallThickness: (outerRadius - cavityRadius) / cavityRadius,
  };
}

/**
 * Advances the position in the cardiac cycle.
 *
 * Kept here rather than inline in the scene so that it is covered by tests:
 * reading the wrong field off the state object silently produced NaN geometry
 * once, and a NaN that only shows up as a warning in the console is exactly the
 * kind of failure that reaches users.
 *
 * @param {number} phase current position, 0..1
 * @param {number} dt seconds elapsed
 * @param {number} hr heart rate, beats per minute
 */
export function advanceCardiacPhase(phase, dt, hr) {
  if (!Number.isFinite(phase) || !Number.isFinite(dt) || !Number.isFinite(hr) || hr <= 0) {
    throw new RangeError(`advanceCardiacPhase: bad input (phase=${phase}, dt=${dt}, hr=${hr})`);
  }
  const next = (phase + (dt * hr) / 60) % 1;
  return next < 0 ? next + 1 : next;
}

/**
 * Which part of the beat a phase is in, named.
 *
 * The partition is the solved valve times, not fixed fractions of the cycle:
 * `ejectionStartPhase` and `ejectionEndPhase` are when the model's aortic valve
 * actually opens and shuts, so the isovolumic periods lengthen or shorten with
 * the state rather than staying where a constant put them.
 *
 * It lives here, with the model, because everything that names a moment has to
 * name the same one — the label over the 3D, the phase caption on the loop, the
 * highlighted leg of the loop, and the shaded band on the waveform are all this
 * function read at the same phase.
 *
 * `from`/`to` are carried so a plot can highlight the leg without re-deriving
 * the boundaries and drifting out of step with the label.
 *
 * @param {number} phase 0..1, or anything that wraps into it
 * @param {{ ejectionStartPhase: number, ejectionEndPhase: number }} state
 * @returns {{ id: string, label: string, labelJa: string, short: string,
 *   shortJa: string, from: number, to: number }}
 */
export function beatPhaseAt(phase, state) {
  const wrapped = phase - Math.floor(phase);
  const { ejectionStartPhase, ejectionEndPhase } = state;
  // Relaxation has no second valve event to end it — the mitral valve opens
  // when the ventricle falls below the atrium, which the solver gives as a
  // pressure crossing rather than as a stored time. This is a presentation
  // constant for how long "end systole" stays named, not a model value.
  const relaxationEnd = ejectionEndPhase + 0.12;
  if (wrapped < ejectionStartPhase) {
    return {
      id: 'isovolumic',
      label: 'Systole — contraction begins',
      labelJa: '収縮期 — 収縮開始',
      short: 'Isovolumic contraction',
      shortJa: '等容性収縮',
      from: 0,
      to: ejectionStartPhase,
    };
  }
  if (wrapped < ejectionEndPhase) {
    return {
      id: 'ejection',
      label: 'Systole — ejection',
      labelJa: '収縮期 — 駆出',
      short: 'Ejection',
      shortJa: '駆出',
      from: ejectionStartPhase,
      to: ejectionEndPhase,
    };
  }
  if (wrapped < relaxationEnd) {
    return {
      id: 'end-systole',
      label: 'End systole',
      labelJa: '収縮末期',
      short: 'Isovolumic relaxation',
      shortJa: '等容性弛緩',
      from: ejectionEndPhase,
      to: relaxationEnd,
    };
  }
  return {
    id: 'filling',
    label: 'Diastole — filling',
    labelJa: '拡張期 — 充満',
    short: 'Filling',
    shortJa: '充満',
    from: relaxationEnd,
    to: 1,
  };
}
