/**
 * Lightweight, lazy 3D organ previews for the public Explorer.
 *
 * The catalogue has to remain readable when WebGL is unavailable, so the DOM
 * is complete before this module does any work. Each preview is constructed
 * only as it approaches the viewport, stops rendering off-screen, becomes a
 * still image when the reader requests reduced motion, and — because a phone
 * that scrolls the whole catalogue would otherwise hold five WebGL contexts
 * at once — gives its context back a short while after leaving the viewport
 * and rebuilds when it returns.
 *
 * ## Contexts
 *
 * A shared pool (`createPreviewPool`) grants at most `maxActive` renderers at
 * a time. A preview that comes into view asks for a slot; if none is free it
 * waits in order and is granted one as soon as another preview releases. A
 * preview that leaves the viewport keeps its renderer for `releaseDelayMs`
 * (so a small scroll back and forth does not rebuild) and then disposes it.
 *
 * ## Races
 *
 * Building is asynchronous (`import('three')`, then the organ builder) and
 * anything can happen while it is in flight: the preview can scroll away,
 * be disposed, or come back. Every build carries a `generation` number, and
 * `release()` bumps it, so a build that finishes after its preview was
 * released throws its own result away instead of attaching a second renderer.
 *
 * ## Testability
 *
 * Every browser dependency can be injected through `deps`, and the pool is
 * a parameter, so the whole lifecycle runs under `node --test` with fakes.
 * The Explorer passes nothing and gets the real browser.
 */

const BUILDERS = Object.freeze({
  brain: async () => {
    const { buildBrain } = await import('../scenes/nervous/organs/brain.js');
    return buildBrain({ color: '#d5b9dc', stemColor: '#ae91bd', cerebellum: '#bd9ecb' });
  },
  heart: async () => {
    const { buildHeart } = await import('../scenes/cardiovascular/organs/heart.js');
    return buildHeart({ color: '#c9505d', vesselColor: '#df7b82', atriumColor: '#a84253' });
  },
  lungs: async () => {
    const { buildLungs } = await import('../scenes/respiratory/organs/lungs.js');
    return buildLungs(LUNG_PREVIEW_QUALITY);
  },
  liver: async () => {
    const { buildLiver } = await import('../scenes/hepatobiliary/organs/liver.js');
    return buildLiver({ detail: 4, referenceSamples: 2500, opacity: 0.94 });
  },
  kidney: async (THREE) => {
    const { buildKidney } = await import('../scenes/renal/organs/kidney.js');
    const left = buildKidney({ side: 'left', opacity: 0.92 });
    const right = buildKidney({ side: 'right', opacity: 0.92 });
    left.object.position.x = 0.72;
    right.object.position.x = -0.72;
    right.object.position.y = -0.13;
    const object = new THREE.Group();
    object.name = 'kidneys-preview';
    object.add(left.object, right.object);
    return {
      object,
      dispose: () => {
        left.dispose?.();
        right.dispose?.();
      },
    };
  },
});

/**
 * How finely the lung preview is built.
 *
 * `lungs.js` cuts five lobes out of one sampled surface. Two things go wrong
 * when it is built cheaply: the rim between a lobe and its fissure zigzags
 * at the spacing of the tessellation (`detail`), and the surface itself grows
 * a ragged fuzz where the sampled field is too sparse (`referenceSamples`).
 * Measured at preview size (290 × 238 CSS px, DPR 2), Node build time as the
 * median of five:
 *
 *   detail  5 / 2 500 samples   34 ms   1 945 vertices   stepped lobes, torn fissures
 *   detail  8 / 6 000 samples   38 ms   4 195 vertices   sawtooth along every fissure
 *   detail 10 / 8 000 samples   26 ms   6 225 vertices   fissures fine, fuzz on the apex
 *   detail 10 / 12 000 samples  39 ms   6 225 vertices   clean — adopted
 *   detail 12 / 12 000 samples  51 ms   8 655 vertices   no visible gain
 *
 * The builder's own default (12 / 24 000) is for a scene that fills the
 * viewport; the preview does not need it.
 */
export const LUNG_PREVIEW_QUALITY = Object.freeze({ detail: 10, referenceSamples: 12000, opacity: 0.96 });

/** How many WebGL contexts the previews may hold between them. */
export const DEFAULT_MAX_ACTIVE_PREVIEWS = 2;

/** How long a preview keeps its context after leaving the viewport. */
export const OFFSCREEN_RELEASE_DELAY_MS = 1500;

/** How long a lost context is given to come back before the preview rebuilds. */
export const CONTEXT_LOSS_RECOVERY_DELAY_MS = 1500;

export const hasOrganPreview = (organId) => organId in BUILDERS;

/**
 * A pool of renderer slots shared by every preview on the page.
 *
 * @param {{ maxActive?: number }} [options]
 */
export function createPreviewPool({ maxActive = DEFAULT_MAX_ACTIVE_PREVIEWS } = {}) {
  const active = new Set();
  const waiting = [];

  const withdraw = (preview) => {
    const index = waiting.indexOf(preview);
    if (index >= 0) waiting.splice(index, 1);
  };

  return {
    maxActive,
    get activeCount() {
      return active.size;
    },
    get waitingCount() {
      return waiting.length;
    },
    holds: (preview) => active.has(preview),
    /** Returns true when the slot is granted now; otherwise the preview waits. */
    request(preview) {
      if (active.has(preview)) return true;
      if (active.size < maxActive) {
        active.add(preview);
        return true;
      }
      if (!waiting.includes(preview)) waiting.push(preview);
      return false;
    },
    withdraw,
    release(preview) {
      withdraw(preview);
      if (!active.delete(preview)) return;
      while (waiting.length && active.size < maxActive) {
        const next = waiting.shift();
        active.add(next);
        next.grant();
      }
    },
  };
}

let sharedPool = null;
const defaultPool = () => (sharedPool ??= createPreviewPool());

/**
 * @typedef {object} PreviewDeps
 * @property {ReturnType<typeof createPreviewPool>} [pool]
 * @property {() => Promise<any>} [loadThree]
 * @property {Record<string, (THREE: any) => Promise<{object: any, dispose?: () => void}>>} [builders]
 * @property {any} [IntersectionObserver]
 * @property {any} [ResizeObserver]
 * @property {(cb: (t: number) => void) => number} [requestAnimationFrame]
 * @property {(id: number) => void} [cancelAnimationFrame]
 * @property {(cb: () => void, ms: number) => any} [setTimeout]
 * @property {(id: any) => void} [clearTimeout]
 * @property {(query: string) => any} [matchMedia]
 * @property {any} [document]
 * @property {number} [devicePixelRatio]
 * @property {number} [releaseDelayMs]
 * @property {number} [recoveryDelayMs]
 */

/**
 * @param {HTMLElement} container
 * @param {string} organId
 * @param {PreviewDeps} [deps]
 * @returns {(() => void) & { inspect: () => object }}
 */
export function mountOrganPreview(container, organId, deps = {}) {
  const build = (deps.builders ?? BUILDERS)[organId];
  const noop = () => {};
  noop.inspect = () => ({ phase: 'unsupported', generation: 0, hasRenderer: false });
  if (!build) return noop;

  const win = globalThis.window ?? {};
  const doc = deps.document ?? globalThis.document ?? null;
  const pool = deps.pool ?? defaultPool();
  const loadThree = deps.loadThree ?? (() => import('three'));
  const Intersection = deps.IntersectionObserver ?? win.IntersectionObserver;
  const Resize = deps.ResizeObserver ?? win.ResizeObserver;
  const raf = deps.requestAnimationFrame ?? win.requestAnimationFrame?.bind(win);
  const caf = deps.cancelAnimationFrame ?? win.cancelAnimationFrame?.bind(win);
  const later = deps.setTimeout ?? globalThis.setTimeout;
  const cancelLater = deps.clearTimeout ?? globalThis.clearTimeout;
  const matchMedia = deps.matchMedia ?? win.matchMedia?.bind(win);
  const pixelRatio = Math.min(deps.devicePixelRatio ?? win.devicePixelRatio ?? 1, 1.5);
  const releaseDelayMs = deps.releaseDelayMs ?? OFFSCREEN_RELEASE_DELAY_MS;
  const recoveryDelayMs = deps.recoveryDelayMs ?? CONTEXT_LOSS_RECOVERY_DELAY_MS;
  const motion = matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;

  /** @type {'idle'|'queued'|'building'|'ready'|'lost'|'unavailable'} */
  let phase = 'idle';
  let generation = 0;
  let disposed = false;
  let inView = typeof Intersection !== 'function';
  let pausedByPointer = false;
  let frame = 0;
  let lastTime = 0;
  let releaseTimer = null;
  let recoveryTimer = null;
  let renderer = null;
  let scene = null;
  let camera = null;
  let model = null;
  let built = null;
  let resizeObserver = null;
  let contextListeners = null;

  const setState = (state) => {
    container.dataset.previewState = state;
  };
  setState('waiting');

  const shouldAnimate = () =>
    !disposed &&
    phase === 'ready' &&
    inView &&
    !pausedByPointer &&
    doc?.visibilityState !== 'hidden' &&
    !motion?.matches;

  const render = () => {
    if (disposed || phase !== 'ready' || !renderer || !scene || !camera) return;
    renderer.render(scene, camera);
  };

  const tick = (time) => {
    frame = 0;
    if (!shouldAnimate()) return;
    const dt = Math.min(0.05, Math.max(0, (time - (lastTime || time)) / 1000));
    lastTime = time;
    model.rotation.y += dt * 0.34;
    render();
    frame = raf(tick);
  };

  const stopFrames = () => {
    if (frame) caf?.(frame);
    frame = 0;
  };

  const syncActivity = () => {
    if (shouldAnimate()) {
      if (!frame && raf) {
        lastTime = 0;
        frame = raf(tick);
      }
    } else {
      stopFrames();
      if (phase === 'ready' && inView && doc?.visibilityState !== 'hidden') render();
    }
  };

  const resize = () => {
    if (!renderer) return;
    const width = Math.max(1, Math.round(container.clientWidth ?? 0));
    const height = Math.max(1, Math.round(container.clientHeight ?? 0));
    renderer.setSize(width, height, false);
    if (!camera) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  };

  const clearReleaseTimer = () => {
    if (releaseTimer != null) cancelLater(releaseTimer);
    releaseTimer = null;
  };
  const clearRecoveryTimer = () => {
    if (recoveryTimer != null) cancelLater(recoveryTimer);
    recoveryTimer = null;
  };

  /** Tear down whatever this preview holds and hand the slot back. */
  const release = () => {
    const held = phase !== 'idle' && phase !== 'unavailable';
    generation += 1;
    stopFrames();
    clearRecoveryTimer();
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (renderer && contextListeners) {
      renderer.domElement.removeEventListener('webglcontextlost', contextListeners.lost);
      renderer.domElement.removeEventListener('webglcontextrestored', contextListeners.restored);
    }
    contextListeners = null;
    built?.dispose?.();
    disposeTree(model ?? built?.object);
    renderer?.dispose();
    renderer?.forceContextLoss?.();
    renderer?.domElement?.remove?.();
    built = null;
    model = null;
    scene = null;
    camera = null;
    renderer = null;
    if (phase !== 'unavailable') {
      phase = 'idle';
      if (!disposed) setState('waiting');
    }
    if (held) pool.release(handle);
    else pool.withdraw(handle);
  };

  const discardStale = (stale) => {
    stale.built?.dispose?.();
    disposeTree(stale.built?.object);
    stale.renderer?.dispose();
    stale.renderer?.forceContextLoss?.();
    stale.renderer?.domElement?.remove?.();
  };

  const contextLost = (event) => {
    event?.preventDefault?.();
    if (phase !== 'ready') return;
    phase = 'lost';
    setState('lost');
    stopFrames();
    clearRecoveryTimer();
    // A context that does not come back is rebuilt from scratch: release the
    // slot and, if the preview is still on screen, queue again.
    recoveryTimer = later(() => {
      recoveryTimer = null;
      if (phase !== 'lost') return;
      release();
      if (inView && !disposed) requestSlot();
    }, recoveryDelayMs);
  };

  const contextRestored = () => {
    if (phase !== 'lost') return;
    clearRecoveryTimer();
    phase = 'ready';
    setState('ready');
    resize();
    syncActivity();
  };

  const startBuild = async (gen) => {
    let localRenderer = null;
    let localBuilt = null;
    try {
      const THREE = await loadThree();
      if (gen !== generation || disposed) return;

      localRenderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
      localRenderer.setPixelRatio(pixelRatio);
      localRenderer.outputColorSpace = THREE.SRGBColorSpace;
      localRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      localRenderer.toneMappingExposure = 1.08;
      localRenderer.domElement.setAttribute('aria-hidden', 'true');

      localBuilt = await build(THREE);
      if (gen !== generation || disposed) {
        discardStale({ renderer: localRenderer, built: localBuilt });
        return;
      }

      renderer = localRenderer;
      built = localBuilt;
      container.append(renderer.domElement);
      contextListeners = { lost: contextLost, restored: contextRestored };
      renderer.domElement.addEventListener('webglcontextlost', contextListeners.lost);
      renderer.domElement.addEventListener('webglcontextrestored', contextListeners.restored);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
      scene.add(
        new THREE.HemisphereLight('#d8f0ff', '#17222b', 2.15),
        makeDirectionalLight(THREE, '#fff4e7', 3.8, [3.8, 4.6, 5.4]),
        makeDirectionalLight(THREE, '#7cc8d8', 2.2, [-4.2, 1.2, -3.5])
      );

      model = new THREE.Group();
      model.name = `${organId}-explorer-preview`;
      model.add(built.object);
      scene.add(model);

      built.object.updateWorldMatrix(true, true);
      const sphere = new THREE.Box3().setFromObject(built.object).getBoundingSphere(new THREE.Sphere());
      if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) throw new Error('empty organ preview');
      built.object.position.sub(sphere.center);
      const distance = sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov * 0.5));
      camera.near = Math.max(0.01, distance / 100);
      camera.far = distance * 10;
      camera.position.set(distance * 0.12, distance * 0.06, distance * 1.08);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      model.rotation.set(-0.04, -0.55, 0.03);

      if (typeof Resize === 'function') {
        resizeObserver = new Resize(resize);
        resizeObserver.observe(container);
      }
      phase = 'ready';
      resize();
      setState('ready');
      syncActivity();
    } catch (error) {
      if (gen !== generation || disposed) {
        discardStale({ renderer: localRenderer, built: localBuilt });
        return;
      }
      // Whatever was attached comes down with the slot; whatever never
      // attached is discarded. The preview then stays unavailable: a
      // renderer that could not be constructed will not construct on retry.
      if (renderer !== localRenderer) discardStale({ renderer: localRenderer, built: localBuilt });
      release();
      phase = 'unavailable';
      setState('unavailable');
      container.setAttribute('title', '3D preview unavailable / 3Dプレビューを表示できません');
      console.error(`organ preview: ${organId}`, error);
    }
  };

  /** Called by the pool (or directly) when this preview owns a slot. */
  const grant = () => {
    if (disposed || phase !== 'queued') {
      if (pool.holds(handle)) pool.release(handle);
      return;
    }
    if (!inView) {
      phase = 'idle';
      pool.release(handle);
      return;
    }
    phase = 'building';
    setState('loading');
    void startBuild(++generation);
  };

  const requestSlot = () => {
    if (disposed || phase !== 'idle') return;
    phase = 'queued';
    setState('waiting');
    if (pool.request(handle)) grant();
  };

  const handle = { grant, organId };

  const enteredView = () => {
    clearReleaseTimer();
    if (phase === 'idle') requestSlot();
    syncActivity();
  };

  const leftView = () => {
    syncActivity();
    if (phase === 'queued') {
      // Never built: leave the queue at once so a visible preview can have
      // the slot.
      phase = 'idle';
      pool.withdraw(handle);
      return;
    }
    if (phase === 'idle' || phase === 'unavailable') return;
    clearReleaseTimer();
    releaseTimer = later(() => {
      releaseTimer = null;
      if (!inView && !disposed) release();
    }, releaseDelayMs);
  };

  const pointerEntered = () => {
    pausedByPointer = true;
    syncActivity();
  };
  const pointerLeft = () => {
    pausedByPointer = false;
    syncActivity();
  };
  const visibilityChanged = () => syncActivity();
  const motionChanged = () => syncActivity();
  container.addEventListener('pointerenter', pointerEntered);
  container.addEventListener('pointerleave', pointerLeft);
  container.addEventListener('pointerdown', pointerEntered);
  container.addEventListener('pointerup', pointerLeft);
  container.addEventListener('pointercancel', pointerLeft);
  doc?.addEventListener?.('visibilitychange', visibilityChanged);
  motion?.addEventListener?.('change', motionChanged);

  const observer =
    typeof Intersection === 'function'
      ? new Intersection(
          (entries) => {
            const entry = entries[entries.length - 1];
            const next = Boolean(entry?.isIntersecting);
            if (next === inView) return;
            inView = next;
            if (inView) enteredView();
            else leftView();
          },
          { rootMargin: '240px 0px', threshold: 0.01 }
        )
      : null;
  observer?.observe(container);
  if (!observer) enteredView();

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    clearReleaseTimer();
    clearRecoveryTimer();
    container.removeEventListener('pointerenter', pointerEntered);
    container.removeEventListener('pointerleave', pointerLeft);
    container.removeEventListener('pointerdown', pointerEntered);
    container.removeEventListener('pointerup', pointerLeft);
    container.removeEventListener('pointercancel', pointerLeft);
    doc?.removeEventListener?.('visibilitychange', visibilityChanged);
    motion?.removeEventListener?.('change', motionChanged);
    release();
    pool.withdraw(handle);
  };
  dispose.inspect = () => ({
    phase,
    generation,
    inView,
    hasRenderer: Boolean(renderer),
    animating: frame !== 0,
    holdsSlot: pool.holds(handle),
  });
  return dispose;
}

function makeDirectionalLight(THREE, color, intensity, position) {
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(...position);
  return light;
}

function disposeTree(root) {
  root?.traverse?.((object) => {
    object.geometry?.dispose?.();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials.filter(Boolean)) {
      for (const value of Object.values(material)) value?.isTexture && value.dispose();
      material.dispose?.();
    }
  });
}
