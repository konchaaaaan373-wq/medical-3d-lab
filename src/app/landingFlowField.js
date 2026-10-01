/**
 * A lightweight, WebGL-independent ambient flow field for the landing page.
 *
 * It is presentation only: particle count, speed and colour encode no blood
 * count, velocity, oxygenation or other clinical quantity.
 */

export const LANDING_FLOW_BUDGETS = Object.freeze({
  phone: Object.freeze({ maxParticles: 58, fps: 24, maxPixelRatio: 1.25 }),
  tablet: Object.freeze({ maxParticles: 92, fps: 30, maxPixelRatio: 1.5 }),
  desktop: Object.freeze({ maxParticles: 132, fps: 30, maxPixelRatio: 1.5 }),
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * @param {{width?:number,height?:number,devicePixelRatio?:number,reducedMotion?:boolean,saveData?:boolean}} input
 */
export function landingFlowConfig({
  width = 1440,
  height = 900,
  devicePixelRatio = 1,
  reducedMotion = false,
  saveData = false,
} = {}) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1440;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 900;
  // Keep the performance tier boundary identical to the landing stylesheet's
  // max-width: 720px phone layout. A one-pixel mismatch here would give the
  // narrow layout the heavier tablet budget at exactly 720px.
  const deviceClass = safeWidth <= 720 ? 'phone' : safeWidth <= 1279 ? 'tablet' : 'desktop';
  const budget = LANDING_FLOW_BUDGETS[deviceClass];
  const areaScale = clamp(Math.sqrt((safeWidth * safeHeight) / (1440 * 900)), 0.72, 1.08);
  const dataScale = saveData ? 0.55 : 1;

  return Object.freeze({
    deviceClass,
    width: safeWidth,
    height: safeHeight,
    particleCount: Math.min(
      budget.maxParticles,
      Math.max(28, Math.round(budget.maxParticles * areaScale * dataScale))
    ),
    fps: saveData ? Math.min(20, budget.fps) : budget.fps,
    pixelRatio: Math.min(
      Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1,
      saveData ? 1 : budget.maxPixelRatio
    ),
    animate: !reducedMotion,
  });
}

/**
 * How narrow the channel is at `x`, as a fraction of its resting width.
 *
 * One constriction, centred a little right of the middle — resistance, drawn.
 * `squeeze` is how tight it is right now (0 open, 1 closed); the curve is a
 * Gaussian so the lanes bend into it and out of it rather than kinking.
 *
 * Exported for the test that holds the one property the drawing depends on:
 * the channel is never closed, so nothing divides by zero.
 *
 * @param {number} x 0..1 across the field
 * @param {number} squeeze 0..1
 */
export function channelWidth(x, squeeze) {
  const centre = 0.64;
  const spread = 0.13;
  const narrowing = clamp(squeeze, 0, 1) * 0.58 * Math.exp(-(((x - centre) / spread) ** 2));
  return 1 - narrowing;
}

/**
 * The squeeze at time `t` seconds: open, tightening, held, releasing — a slow
 * cycle, so the field reads as a state that changes rather than as a loop.
 *
 * @param {number} t
 */
export function squeezeAt(t) {
  const period = 11;
  const phase = ((t % period) + period) % period / period;
  // 0–0.35 open → tight, 0.35–0.6 held, 0.6–1 released.
  if (phase < 0.35) return 0.2 + 0.6 * smooth(phase / 0.35);
  if (phase < 0.6) return 0.8;
  return 0.8 - 0.6 * smooth((phase - 0.6) / 0.4);
}

const smooth = (u) => u * u * (3 - 2 * u);

/**
 * The hero's ground: lanes of flow through one narrowing, with points
 * travelling on them.
 *
 * BYOKI MOTION's landing page says "pathophysiology, moving" without a heart
 * or a brain in it (ADR 2026-09-30). This is that picture, kept quiet enough
 * to read over: thin warm-grey lanes, small points, one point in ten marked in
 * the product's orange. The lanes pinch together where the channel narrows and
 * the points speed up through it and bunch before it — continuity, drawn — and
 * the narrowing slowly tightens and releases, so what is on screen is a state
 * changing and the flow responding.
 *
 * Presentation only, and said so again because it looks like physiology:
 * nothing here is computed by a medical model, and no speed, spacing or count
 * stands for a clinical quantity.
 *
 * @param {{win?:Window,doc?:Document,random?:()=>number,host?:HTMLElement|null}} [options]
 *   `host` sizes the field to an element rather than the window
 */
export function createLandingFlowField({
  win = window,
  doc = document,
  random = Math.random,
  host = null,
} = {}) {
  const canvas = doc.createElement('canvas');
  canvas.className = 'landing-flow-field';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('role', 'presentation');

  const context = canvas.getContext?.('2d', { alpha: true });
  if (!context) return { element: canvas, destroy() {}, redraw() {} };

  const motionQuery = win.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
  const saveData = Boolean(win.navigator?.connection?.saveData);
  const requestFrame = win.requestAnimationFrame?.bind(win) ?? ((callback) => win.setTimeout(() => callback(Date.now()), 33));
  const cancelFrame = win.cancelAnimationFrame?.bind(win) ?? win.clearTimeout?.bind(win);
  const LANES = 9;
  let config = null;
  let particles = [];
  let frame = null;
  let lastDraw = 0;
  let clock = 0;
  let destroyed = false;

  /** The y of lane `lane` (0..LANES-1) at `x` (0..1), for the current squeeze. */
  const laneY = (lane, x, squeeze) => {
    const offset = (lane - (LANES - 1) / 2) / ((LANES - 1) / 2);
    const mid = config.height * 0.52;
    const half = config.height * 0.34;
    return mid + offset * half * channelWidth(x, squeeze);
  };

  const seedParticle = (index, fromEdge = false) => ({
    lane: Math.floor(random() * LANES),
    x: fromEdge ? -0.02 - random() * 0.06 : random(),
    speed: 0.035 + random() * 0.02,
    size: 1.1 + random() * 1.1,
    marked: index % 10 === 0,
  });

  function draw(timestamp = 0, advance = false) {
    const delta = lastDraw ? clamp(timestamp - lastDraw, 0, 80) : 16;
    lastDraw = timestamp;
    if (advance) clock += delta / 1000;
    const squeeze = config.animate ? squeezeAt(clock) : 0.6;
    context.setTransform(config.pixelRatio, 0, 0, config.pixelRatio, 0, 0);
    context.clearRect(0, 0, config.width, config.height);

    // The lanes: thin, faint, the shape of the channel.
    context.lineWidth = 1;
    context.strokeStyle = 'rgba(31, 30, 28, 0.075)';
    for (let lane = 0; lane < LANES; lane += 1) {
      context.beginPath();
      for (let step = 0; step <= 48; step += 1) {
        const x = step / 48;
        const y = laneY(lane, x, squeeze);
        if (step === 0) context.moveTo(x * config.width, y);
        else context.lineTo(x * config.width, y);
      }
      context.stroke();
    }

    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      if (advance) {
        // Faster where the channel is narrow: the same flow through less room.
        particle.x += (particle.speed * (delta / 1000)) / channelWidth(particle.x, squeeze);
        if (particle.x > 1.03) {
          particles[index] = seedParticle(index, true);
          continue;
        }
      }
      const edgeFade = clamp(Math.min(particle.x, 1 - particle.x) / 0.08, 0, 1);
      const alpha = (particle.marked ? 0.85 : 0.32) * edgeFade;
      context.fillStyle = particle.marked ? `rgba(224, 102, 47, ${alpha})` : `rgba(31, 30, 28, ${alpha})`;
      context.beginPath();
      context.arc(particle.x * config.width, laneY(particle.lane, particle.x, squeeze), particle.size, 0, Math.PI * 2);
      context.fill();
    }
  }

  function schedule() {
    if (destroyed || frame != null || !config.animate || doc.visibilityState === 'hidden') return;
    frame = requestFrame(loop);
  }

  function loop(timestamp) {
    frame = null;
    if (timestamp - lastDraw >= 1000 / config.fps) draw(timestamp, true);
    schedule();
  }

  function configure() {
    // A resize or motion-preference change can arrive while the previous
    // configuration still has a frame queued. Cancel it before rebuilding so
    // reduced-motion mode cannot advance the old animation once more.
    if (frame != null) {
      cancelFrame?.(frame);
      frame = null;
    }
    config = landingFlowConfig({
      width: host?.clientWidth || win.innerWidth,
      height: host?.clientHeight || win.innerHeight,
      devicePixelRatio: win.devicePixelRatio,
      reducedMotion: Boolean(motionQuery?.matches),
      saveData,
    });
    canvas.width = Math.round(config.width * config.pixelRatio);
    canvas.height = Math.round(config.height * config.pixelRatio);
    canvas.dataset.motion = config.animate ? 'flowing' : 'still';
    // Fewer points than the budget allows: this is a ground to read over.
    const count = Math.max(18, Math.round(config.particleCount * 0.55));
    canvas.dataset.particles = String(count);
    particles = Array.from({ length: count }, (_, index) => seedParticle(index));
    lastDraw = 0;
    draw(0, false);
    schedule();
  }

  function visibilityChanged() {
    if (doc.visibilityState === 'hidden' && frame != null) {
      cancelFrame?.(frame);
      frame = null;
    } else {
      lastDraw = 0;
      schedule();
    }
  }

  configure();
  win.addEventListener?.('resize', configure, { passive: true });
  doc.addEventListener?.('visibilitychange', visibilityChanged);
  if (motionQuery?.addEventListener) motionQuery.addEventListener('change', configure);
  else motionQuery?.addListener?.(configure);

  return {
    element: canvas,
    redraw: () => draw(lastDraw, false),
    /** Re-measure the host — after the element it sizes to has been laid out. */
    resize: configure,
    destroy() {
      destroyed = true;
      if (frame != null) cancelFrame?.(frame);
      win.removeEventListener?.('resize', configure);
      doc.removeEventListener?.('visibilitychange', visibilityChanged);
      if (motionQuery?.removeEventListener) motionQuery.removeEventListener('change', configure);
      else motionQuery?.removeListener?.(configure);
      canvas.remove();
    },
  };
}
