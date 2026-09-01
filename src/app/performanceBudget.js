/**
 * Declared performance budgets for the 3D shell.
 *
 * The viewer used to carry its degradation policy as three unexplained numbers
 * (`90` samples, `0.026` seconds, `1.5` on a phone). That is not a budget: it
 * cannot be reviewed, cannot be tested, and nobody could say what the product
 * had promised itself. This module is the promise, written down once:
 *
 *   - which device class a viewport belongs to,
 *   - the frame time that class is allowed to spend,
 *   - the ordered quality tiers we are willing to fall through, and
 *   - how long start-up may take before the first drawn frame.
 *
 * It is deliberately pure JavaScript — no `three`, no DOM — so `node --test`
 * can assert the policy without a GPU, exactly like the medical model layer.
 * The viewer consumes decisions; it no longer owns them.
 */

/** Viewport widths (CSS px) at which the budget changes. Upper bound, inclusive. */
export const DEVICE_CLASS_BREAKPOINTS = [
  { id: 'phone', maxWidth: 719 },
  { id: 'tablet', maxWidth: 1279 },
  { id: 'desktop', maxWidth: Infinity },
];

export const DEVICE_CLASS_IDS = DEVICE_CLASS_BREAKPOINTS.map((entry) => entry.id);

/**
 * The viewport width at which the renderer stops treating the device as a
 * phone. Kept as a named export because the pixel-ratio ceiling and the frame
 * budget must agree about where "phone" ends.
 */
export const PHONE_MAX_WIDTH = 719;

/**
 * @param {number} width viewport width in CSS pixels
 * @returns {'phone'|'tablet'|'desktop'}
 */
export function deviceClassForViewport(width) {
  const value = Number.isFinite(width) ? width : Infinity;
  return DEVICE_CLASS_BREAKPOINTS.find((entry) => value <= entry.maxWidth).id;
}

const msPerFrame = (fps) => 1000 / fps;

/**
 * Per-class frame and start-up budgets.
 *
 * `floorFps` is the promise we make about sustained animation: below it the
 * experience is judged worse than the visual effect it is paying for, and the
 * renderer gives the effect up. `recoverFps` sits well above the floor on
 * purpose — a device that only just clears the floor must not be handed the
 * expensive tier back, or it oscillates between the two forever.
 *
 * `startupMs` is time from navigation to the first drawn frame. Phones are
 * given more because the whole point of the allowance is that they are slower,
 * not that we expect less of the product there.
 */
export const PERFORMANCE_BUDGETS = {
  phone: {
    targetFps: 60,
    floorFps: 38,
    recoverFps: 52,
    maxPixelRatio: 1.5,
    startupMs: 4000,
    jankRatio: 0.25,
  },
  tablet: {
    targetFps: 60,
    floorFps: 38,
    recoverFps: 52,
    maxPixelRatio: 2,
    startupMs: 3000,
    jankRatio: 0.2,
  },
  desktop: {
    targetFps: 60,
    floorFps: 38,
    recoverFps: 52,
    maxPixelRatio: 2,
    startupMs: 2500,
    jankRatio: 0.2,
  },
};

/**
 * The ordered ladder the renderer falls down, cheapest effect first.
 *
 * Order is the policy: bloom is a presentation flourish and goes first;
 * resolution is legibility of the anatomy itself and goes last. `low` is the
 * floor — there is nothing below it we are willing to take away, because what
 * remains is the medical content.
 */
export const QUALITY_TIERS = [
  {
    id: 'high',
    bloom: true,
    /** `null` means "whatever the device class allows". */
    pixelRatioCap: null,
    labelEn: 'Full quality',
    labelJa: '高品質',
  },
  {
    id: 'medium',
    bloom: false,
    pixelRatioCap: null,
    labelEn: 'Bloom disabled',
    labelJa: 'ブルーム無効',
  },
  {
    id: 'low',
    bloom: false,
    pixelRatioCap: 1,
    labelEn: 'Reduced resolution',
    labelJa: '解像度低減',
  },
];

export const QUALITY_TIER_IDS = QUALITY_TIERS.map((tier) => tier.id);

/** @param {string} id */
export const qualityTier = (id) => QUALITY_TIERS.find((tier) => tier.id === id) ?? null;

/** @param {string} id */
export const qualityTierIndex = (id) => QUALITY_TIERS.findIndex((tier) => tier.id === id);

/**
 * The pixel ratio the renderer should ask for.
 *
 * Two ceilings compose here and both are budget, not taste: the device class
 * cap (a phone is fill-rate bound long before its DPR runs out) and the
 * current quality tier's cap (what degradation has already taken away).
 *
 * @param {{ devicePixelRatio?: number, deviceClass?: string, tier?: string }} input
 */
export function pixelRatioFor({ devicePixelRatio = 1, deviceClass = 'desktop', tier = 'high' } = {}) {
  const budget = PERFORMANCE_BUDGETS[deviceClass] ?? PERFORMANCE_BUDGETS.desktop;
  const tierCap = qualityTier(tier)?.pixelRatioCap;
  const caps = [budget.maxPixelRatio, tierCap].filter((value) => Number.isFinite(value));
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(dpr, ...caps);
}

/**
 * Was start-up within budget?
 *
 * Returned rather than logged so the caller decides what to do with it — the
 * app reports it as a metric, a test asserts on it, and neither has to scrape
 * a console line.
 *
 * @param {number} elapsedMs navigation to first drawn frame
 * @param {string} deviceClass
 */
export function evaluateStartup(elapsedMs, deviceClass = 'desktop') {
  const budget = PERFORMANCE_BUDGETS[deviceClass] ?? PERFORMANCE_BUDGETS.desktop;
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  return {
    deviceClass,
    elapsedMs: elapsed,
    budgetMs: budget.startupMs,
    withinBudget: elapsed <= budget.startupMs,
    overByMs: Math.max(0, elapsed - budget.startupMs),
  };
}

/** How many frames are averaged before a tier decision may be taken. */
export const SAMPLE_WINDOW = 90;

/**
 * How many consecutive healthy windows are required before quality is restored.
 *
 * Recovery is slower than degradation on purpose. Dropping a tier costs a
 * visual flourish; restoring one too eagerly costs a visible stutter, and the
 * user cannot tell that the stutter was us being optimistic.
 */
export const RECOVERY_WINDOWS = 4;

/**
 * Samples frame times and decides which quality tier the renderer should be in.
 *
 * The monitor never touches a renderer. It answers one question — "given the
 * frames you have shown me, what tier should you be in?" — and returns a
 * transition object when, and only when, the answer changed. That is what lets
 * the whole degradation policy be tested without a GPU.
 *
 * @param {{ deviceClass?: string, tier?: string, sampleWindow?: number, recoveryWindows?: number }} [options]
 */
export function createFrameBudgetMonitor({
  deviceClass = 'desktop',
  tier = 'high',
  sampleWindow = SAMPLE_WINDOW,
  recoveryWindows = RECOVERY_WINDOWS,
} = {}) {
  const budget = PERFORMANCE_BUDGETS[deviceClass] ?? PERFORMANCE_BUDGETS.desktop;
  const floorMs = msPerFrame(budget.floorFps);
  const recoverMs = msPerFrame(budget.recoverFps);

  let currentTier = qualityTier(tier) ? tier : 'high';
  let healthyWindows = 0;
  /** @type {number[]} frame durations in milliseconds */
  let samples = [];
  let windowsSeen = 0;
  /** @type {ReturnType<typeof summarise>|null} */
  let lastWindow = null;

  function summarise(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const total = values.reduce((sum, value) => sum + value, 0);
    const janky = values.filter((value) => value > floorMs).length;
    const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
    return {
      frames: values.length,
      meanMs: total / values.length,
      p50Ms: at(0.5),
      p95Ms: at(0.95),
      worstMs: sorted[sorted.length - 1],
      jankRatio: janky / values.length,
      meanFps: 1000 / (total / values.length),
    };
  }

  /**
   * A window is over budget when animation is *sustainably* slow, or when it is
   * nominally fast but stuttering. Mean alone hides a frame pattern of
   * 8ms/8ms/60ms, which is what a viewer actually notices.
   */
  const overBudget = (window) => window.meanMs > floorMs || window.jankRatio > budget.jankRatio;

  /** Comfortably fast, with margin — see RECOVERY_WINDOWS. */
  const healthy = (window) => window.meanMs <= recoverMs && window.jankRatio <= budget.jankRatio / 2;

  return {
    deviceClass,
    budget,
    floorMs,
    recoverMs,

    get tier() {
      return currentTier;
    },
    get windows() {
      return windowsSeen;
    },
    /** The last completed window's statistics, for reporting. */
    get lastWindow() {
      return lastWindow;
    },

    /**
     * Record one frame.
     *
     * @param {number} frameMs duration of the frame in milliseconds
     * @returns {{from:string,to:string,direction:'degrade'|'recover',reason:string,window:object}|null}
     *   a transition when the tier changed, otherwise `null`
     */
    sample(frameMs) {
      if (!Number.isFinite(frameMs) || frameMs <= 0) return null;
      samples.push(frameMs);
      if (samples.length < sampleWindow) return null;

      const window = summarise(samples);
      samples = [];
      windowsSeen += 1;
      lastWindow = window;

      const index = qualityTierIndex(currentTier);

      if (overBudget(window)) {
        healthyWindows = 0;
        if (index >= QUALITY_TIERS.length - 1) return null;
        const from = currentTier;
        currentTier = QUALITY_TIERS[index + 1].id;
        return {
          from,
          to: currentTier,
          direction: 'degrade',
          reason:
            window.meanMs > floorMs
              ? `mean ${window.meanMs.toFixed(1)}ms over ${floorMs.toFixed(1)}ms budget`
              : `jank ${(window.jankRatio * 100).toFixed(0)}% over ${(budget.jankRatio * 100).toFixed(0)}%`,
          window,
        };
      }

      if (!healthy(window)) {
        healthyWindows = 0;
        return null;
      }

      healthyWindows += 1;
      if (healthyWindows < recoveryWindows || index <= 0) return null;
      healthyWindows = 0;
      const from = currentTier;
      currentTier = QUALITY_TIERS[index - 1].id;
      return {
        from,
        to: currentTier,
        direction: 'recover',
        reason: `${recoveryWindows} windows at ${window.meanFps.toFixed(0)}fps`,
        window,
      };
    },

    /** Everything worth reporting about how this session actually ran. */
    report() {
      return {
        deviceClass,
        tier: currentTier,
        windows: windowsSeen,
        floorFps: budget.floorFps,
        meanFps: lastWindow ? Number(lastWindow.meanFps.toFixed(1)) : null,
        p95Ms: lastWindow ? Number(lastWindow.p95Ms.toFixed(1)) : null,
        jankRatio: lastWindow ? Number(lastWindow.jankRatio.toFixed(3)) : null,
      };
    },

    /** Forget accumulated evidence without changing the tier — used after a resize. */
    reset() {
      samples = [];
      healthyWindows = 0;
    },
  };
}

/**
 * Ship-weight budget for the built bundle, in gzipped kilobytes.
 *
 * Checked by `scripts/check-bundle-budget.js` after `npm run build`, because a
 * budget nobody measures is a wish. The lines are split by what a visitor
 * actually pays for and when:
 *
 *   - `entry` is what the landing page downloads before anything is on screen;
 *   - `largestChunk` is the worst single scene or renderer chunk, which is what
 *     opening one model costs after that;
 *   - `code` is all JS and CSS together — the line a slow accumulation of
 *     product-shell weight shows up on, where no single chunk looks guilty;
 *   - `media` is the static specimen data (the brain atlas and its Draco
 *     decoder). It is large and deliberately so: it is fetched only by the one
 *     scene that needs it, and never by a visitor who does not open it.
 *
 * `three` is a third of `code` on its own. It is not given its own allowance —
 * a single dependency that big is a decision to revisit, not a line to widen.
 */
export const BUNDLE_BUDGET_KB = {
  /** The JS the landing page must download before it can render. */
  entry: 90,
  /** The single largest lazily-loaded JS chunk (a scene, or the renderer). */
  largestChunk: 260,
  /** All CSS, which is loaded eagerly today. */
  css: 120,
  /** All JS and CSS in the build. */
  code: 700,
  /** Static specimen media, fetched lazily by the scenes that need it. */
  media: 6000,
};
