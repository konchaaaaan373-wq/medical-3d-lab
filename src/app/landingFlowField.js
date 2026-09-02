/**
 * A lightweight, WebGL-independent ambient flow field for the landing page.
 *
 * It is presentation only: particle count, speed and colour encode no blood
 * count, velocity, oxygenation or other clinical quantity. The foreground
 * circulation preview is the only landing animation driven by a medical model.
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
 * @param {{win?:Window,doc?:Document,random?:()=>number}} [options]
 */
export function createLandingFlowField({
  win = window,
  doc = document,
  random = Math.random,
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
  let config = null;
  let particles = [];
  let frame = null;
  let lastDraw = 0;
  let destroyed = false;

  const seedParticle = (index, fromEdge = false) => {
    const cargo = index % 11 === 0;
    const lane = random();
    const speed = cargo ? 0.034 + random() * 0.016 : 0.018 + random() * 0.027;
    return {
      x: fromEdge ? -24 - random() * 90 : random() * config.width,
      y: lane * config.height,
      lane,
      speed,
      drift: (random() - 0.5) * 0.006,
      phase: random() * Math.PI * 2,
      wave: 5 + random() * 17,
      size: cargo ? 0.7 + random() * 0.8 : 0.65 + random() * 1.35,
      alpha: cargo ? 0.2 + random() * 0.2 : 0.12 + random() * 0.25,
      cargo,
    };
  };

  function draw(timestamp = 0, advance = false) {
    const delta = lastDraw ? clamp(timestamp - lastDraw, 0, 80) : 16;
    lastDraw = timestamp;
    context.setTransform(config.pixelRatio, 0, 0, config.pixelRatio, 0, 0);
    context.clearRect(0, 0, config.width, config.height);

    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      if (advance) {
        particle.x += particle.speed * delta * 14;
        particle.y += (Math.sin(particle.x * 0.006 + particle.phase) * particle.wave * 0.002 + particle.drift) * delta;
        if (particle.x > config.width + 28 || particle.y < -20 || particle.y > config.height + 20) {
          particles[index] = seedParticle(index, true);
          continue;
        }
      }

      const edgeFade = clamp(Math.min(particle.x, config.width - particle.x) / 100, 0, 1);
      const alpha = particle.alpha * edgeFade;
      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(Math.atan2(particle.drift * 26, particle.speed));
      context.fillStyle = particle.cargo
        ? `rgba(240, 176, 100, ${alpha})`
        : `rgba(202, 58, 78, ${alpha})`;
      context.beginPath();
      context.ellipse(0, 0, particle.size * 2.35, particle.size, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
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
      width: win.innerWidth,
      height: win.innerHeight,
      devicePixelRatio: win.devicePixelRatio,
      reducedMotion: Boolean(motionQuery?.matches),
      saveData,
    });
    canvas.width = Math.round(config.width * config.pixelRatio);
    canvas.height = Math.round(config.height * config.pixelRatio);
    canvas.dataset.motion = config.animate ? 'flowing' : 'still';
    canvas.dataset.particles = String(config.particleCount);
    particles = Array.from({ length: config.particleCount }, (_, index) => seedParticle(index));
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
