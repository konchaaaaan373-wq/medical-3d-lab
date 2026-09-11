/**
 * Benign prostatic enlargement, as a statement about **which zone**.
 *
 * ## This is a geometric model, and that is the whole of what it claims
 *
 * There is no flow in it, no pressure, no bladder and no symptom. What it
 * computes is the arithmetic of one zone growing inside a gland whose other
 * zones do not: the proportions that follow, and what happens to the rim
 * around it and to the channel through it.
 *
 * That sounds modest and it is the point of the scene. **The single most
 * common way benign prostatic enlargement is drawn wrongly is as a gland that
 * gets uniformly bigger.** It is not. It arises in the transition zone — a
 * small thing wrapped round the urethra — and the peripheral zone, which is
 * most of the glandular tissue and the part a finger reaches, is not enlarged
 * by it. It is displaced and compressed into a rim.
 *
 * So the model conserves the peripheral zone's tissue and lets the inner gland
 * grow, and everything else is consequence:
 *
 * ```text
 * V(inner)  = V(central) + V(transition₀)·growth
 * r(inner)  = ∛(V(inner) / (4π/3))
 * r(outer)  = ∛((V(inner) + V(peripheral₀)) / (4π/3))   ← peripheral tissue conserved
 * rim       = r(outer) − r(inner)
 * ```
 *
 * Two things fall out that are worth a scene. **The gland grows far less than
 * the transition zone does** — ten times the transition zone is under twice the
 * gland — and **the rim thins** while nothing has been taken out of it.
 *
 * ## The urethra
 *
 * The transition zone is the tissue the prostatic urethra runs through, so the
 * channel narrows as that zone grows. The relation used here is an assumed
 * one, declared as such: this model has no tissue mechanics in it and cannot
 * derive how a lumen deforms. What it reports is a **fraction of the model's
 * own unenlarged lumen** — never a calibre, never a flow rate, never a volume
 * anybody could measure.
 *
 * ## What is not here
 *
 * No urine, no flow rate, no post-void residual, no bladder wall, no detrusor,
 * no symptom score, no prostate-specific antigen, no cancer, no drug and no
 * operation. Nothing here progresses in time: `growth` is how far into an
 * enlarged gland the reader has gone, not how many years.
 *
 * PROTOTYPE. The proportions are the atlas's display proportions, which are
 * themselves drawn so four zones can be told apart. **No volume, ratio or
 * fraction here is a measurement of anybody.**
 */

/**
 * The gland's zones as fractions of it, at rest.
 *
 * Taken from the atlas's own display proportions rather than from anatomy,
 * because the scene is drawn on the atlas and the two must agree. In a real
 * prostate the peripheral zone is about seventy per cent of the glandular
 * tissue and the transition zone about five; the atlas spreads them so each is
 * a surface a reader can point at, and says so.
 */
export const REST_SHARES = Object.freeze({
  /** The inner gland, as a fraction of the gland's radius. */
  innerRadiusFraction: 0.56,
  /** Of that inner gland, how much is transition rather than central. */
  transitionOfInner: 0.45,
});

export const DEFAULT_CONTROLS = Object.freeze({
  /**
   * How many times its resting volume the transition zone is.
   *
   * 1 is a gland with nothing wrong with it. The upper end is chosen so the
   * arrangement is legible, not to stand for a severity: there is no grade in
   * this model and no figure in it is a threshold.
   */
  transitionGrowth: 1,
  /**
   * How much of the narrowing the two lateral lobes account for, as opposed to
   * a median lobe pushing up into the bladder neck.
   *
   * Both patterns are described, and which one a gland takes is not something
   * a volume can tell you. It is here so the scene can show that the same
   * amount of tissue in two arrangements does different things, and it is a
   * shape rather than a measurement.
   */
  medianLobeShare: 0,
});

/** How much the lumen narrows per unit of transition-zone growth. */
export const LUMEN_COMPRESSION = 0.22;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const sphereVolume = (radius) => (4 / 3) * Math.PI * radius ** 3;

/**
 * Solve the proportions.
 *
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solveProstaticEnlargement(controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const growth = clamp(settings.transitionGrowth, 1, 14);
  const medianShare = clamp(settings.medianLobeShare, 0, 1);

  const innerRadius0 = REST_SHARES.innerRadiusFraction;
  const innerVolume0 = sphereVolume(innerRadius0);
  const glandVolume0 = sphereVolume(1);
  const peripheralVolume = glandVolume0 - innerVolume0;

  const transitionVolume0 = innerVolume0 * REST_SHARES.transitionOfInner;
  const centralVolume = innerVolume0 - transitionVolume0;
  const transitionVolume = transitionVolume0 * growth;
  const innerVolume = centralVolume + transitionVolume;

  // The peripheral zone's tissue is conserved: it is displaced, not added to.
  const innerRadius = Math.cbrt(innerVolume / ((4 / 3) * Math.PI));
  const outerRadius = Math.cbrt((innerVolume + peripheralVolume) / ((4 / 3) * Math.PI));
  const glandVolume = innerVolume + peripheralVolume;

  const rim = outerRadius - innerRadius;
  const rim0 = 1 - innerRadius0;

  /**
   * What is left of the channel, as a fraction of the model's own resting one.
   *
   * **An assumed relation, not a derived one.** This model has no tissue
   * mechanics and cannot work out how a lumen deforms when the tissue round it
   * grows; `LUMEN_COMPRESSION` says how much narrowing the scene draws per unit
   * of growth. Lateral-lobe growth is taken to narrow the channel along its
   * whole prostatic length, and a median lobe to act at the bladder neck
   * instead — which is why the two are reported apart.
   */
  const excess = growth - 1;
  const lateral = 1 / (1 + LUMEN_COMPRESSION * excess * (1 - medianShare));
  const atBladderNeck = 1 / (1 + LUMEN_COMPRESSION * excess * (1 + medianShare));

  return {
    controls: settings,
    transitionVolumeRatio: transitionVolume / transitionVolume0,
    glandVolumeRatio: glandVolume / glandVolume0,
    innerRadiusRatio: innerRadius / innerRadius0,
    outerRadiusRatio: outerRadius,
    /** The peripheral rim's thickness, against the one it had at rest. */
    peripheralRimRatio: rim / rim0,
    /** What each zone is as a share of the whole gland, now. */
    zoneShares: Object.freeze({
      transition: transitionVolume / glandVolume,
      central: centralVolume / glandVolume,
      peripheral: peripheralVolume / glandVolume,
    }),
    /** Fractions of this model's own resting lumen. Not calibres. */
    urethralLumenFraction: lateral,
    bladderNeckLumenFraction: atBladderNeck,
    /**
     * Whether the peripheral zone has been compressed enough to read as a rim
     * rather than as most of the gland. A description of the picture, not a
     * finding: it is what the scene's middle stage is about.
     */
    peripheralIsARim: rim / rim0 < 0.8,
  };
}
