import { FakeElement } from './fake-dom.js';

/**
 * Enough of a browser and of Three.js for `mountOrganPreview` to run its whole
 * lifecycle under `node --test`: observers a test can fire, a frame queue and
 * a clock a test can advance, and a renderer that counts itself.
 */

export class FakeCanvas extends FakeElement {
  constructor() {
    super('canvas');
    this.parent = null;
  }

  remove() {
    if (!this.parent) return;
    const index = this.parent.children.indexOf(this);
    if (index >= 0) this.parent.children.splice(index, 1);
    this.parent = null;
  }

  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener({ type, preventDefault() {}, ...event });
  }
}

export class FakeContainer extends FakeElement {
  constructor() {
    super('div');
    this.clientWidth = 320;
    this.clientHeight = 240;
  }

  append(...children) {
    for (const child of children) {
      if (child instanceof FakeCanvas) child.parent = this;
    }
    super.append(...children);
  }

  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener({ type, ...event });
  }

  get canvases() {
    return this.children.filter((child) => child instanceof FakeCanvas);
  }
}

class FakeVector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }
}

class FakeObject {
  constructor() {
    this.children = [];
    this.position = new FakeVector3();
    this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
    this.name = '';
  }
  add(...objects) {
    this.children.push(...objects);
    return this;
  }
  traverse(fn) {
    fn(this);
    for (const child of this.children) child.traverse?.(fn);
  }
  updateWorldMatrix() {}
}

/** Builds a fake `three` namespace whose renderers report to `ledger`. */
export function createFakeThree(ledger) {
  class WebGLRenderer {
    constructor() {
      if (ledger.failConstruction) throw new Error('WebGL unavailable');
      this.domElement = new FakeCanvas();
      this.renders = 0;
      this.disposed = false;
      this.contextLost = false;
      ledger.constructed.push(this);
      ledger.live.add(this);
      ledger.peakLive = Math.max(ledger.peakLive, ledger.live.size);
    }
    setPixelRatio() {}
    setSize(width, height) {
      this.size = [width, height];
    }
    render() {
      if (this.disposed) throw new Error('render after dispose');
      this.renders += 1;
      ledger.renders += 1;
    }
    dispose() {
      this.disposed = true;
      ledger.live.delete(this);
    }
    forceContextLoss() {
      this.contextLost = true;
    }
  }
  class PerspectiveCamera {
    constructor(fov) {
      this.fov = fov;
      this.position = new FakeVector3();
    }
    lookAt() {}
    updateProjectionMatrix() {}
  }
  class Box3 {
    setFromObject() {
      return this;
    }
    getBoundingSphere(sphere) {
      sphere.radius = 1;
      sphere.center = new FakeVector3();
      return sphere;
    }
  }
  class Sphere {
    constructor() {
      this.radius = 0;
      this.center = new FakeVector3();
    }
  }
  class Light extends FakeObject {}
  return {
    WebGLRenderer,
    PerspectiveCamera,
    Box3,
    Sphere,
    Scene: FakeObject,
    Group: FakeObject,
    HemisphereLight: Light,
    DirectionalLight: Light,
    Vector3: FakeVector3,
    MathUtils: { degToRad: (deg) => (deg * Math.PI) / 180 },
    SRGBColorSpace: 'srgb',
    ACESFilmicToneMapping: 'aces',
  };
}

/** Everything one test needs, wired together. */
export function createPreviewHarness({ buildDelay = 0 } = {}) {
  const ledger = { constructed: [], live: new Set(), peakLive: 0, renders: 0, failConstruction: false };
  const THREE = createFakeThree(ledger);

  const frames = [];
  let frameId = 0;
  let now = 0;
  const timers = [];
  let timerId = 0;
  const observers = [];

  const pending = [];
  const settle = async () => {
    // Drain the microtask queue a few times so awaited builds complete.
    for (let i = 0; i < 12; i += 1) await Promise.resolve();
    while (pending.length) {
      const next = pending.shift();
      next();
      for (let i = 0; i < 12; i += 1) await Promise.resolve();
    }
  };

  const disposedObjects = [];
  const builders = {
    organ: async (T) => {
      if (buildDelay) await new Promise((resolve) => pending.push(resolve));
      const object = new T.Group();
      object.material = { dispose: () => disposedObjects.push('material') };
      object.geometry = { dispose: () => disposedObjects.push('geometry') };
      return { object, dispose: () => disposedObjects.push('built') };
    },
    broken: async () => {
      throw new Error('no organ');
    },
  };

  class FakeIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
      this.targets = [];
      this.disconnected = false;
      observers.push(this);
    }
    observe(target) {
      this.targets.push(target);
    }
    disconnect() {
      this.disconnected = true;
    }
    fire(isIntersecting) {
      this.callback([{ isIntersecting }]);
    }
  }
  class FakeResizeObserver {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  }

  const document = {
    visibilityState: 'visible',
    listeners: new Map(),
    addEventListener(type, fn) {
      (this.listeners.get(type) ?? this.listeners.set(type, new Set()).get(type)).add(fn);
    },
    removeEventListener(type, fn) {
      this.listeners.get(type)?.delete(fn);
    },
    dispatch(type) {
      for (const fn of this.listeners.get(type) ?? []) fn({ type });
    },
  };

  const motion = {
    matches: false,
    listeners: new Set(),
    addEventListener(_type, fn) {
      this.listeners.add(fn);
    },
    removeEventListener(_type, fn) {
      this.listeners.delete(fn);
    },
    set(matches) {
      this.matches = matches;
      for (const fn of this.listeners) fn({ matches });
    },
  };

  const deps = {
    loadThree: async () => THREE,
    builders,
    IntersectionObserver: FakeIntersectionObserver,
    ResizeObserver: FakeResizeObserver,
    requestAnimationFrame: (cb) => {
      frames.push({ id: ++frameId, cb });
      return frameId;
    },
    cancelAnimationFrame: (id) => {
      const index = frames.findIndex((frame) => frame.id === id);
      if (index >= 0) frames.splice(index, 1);
    },
    setTimeout: (cb, ms) => {
      timers.push({ id: ++timerId, at: now + ms, cb });
      return timerId;
    },
    clearTimeout: (id) => {
      const index = timers.findIndex((timer) => timer.id === id);
      if (index >= 0) timers.splice(index, 1);
    },
    matchMedia: () => motion,
    document,
    devicePixelRatio: 2,
    releaseDelayMs: 1000,
    recoveryDelayMs: 500,
  };

  return {
    THREE,
    ledger,
    deps,
    document,
    motion,
    observers,
    disposedObjects,
    settle,
    /** Run every queued animation frame once, at `dt` milliseconds later. */
    runFrame(dt = 16) {
      now += dt;
      const due = frames.splice(0, frames.length);
      for (const frame of due) frame.cb(now);
      return due.length;
    },
    get queuedFrames() {
      return frames.length;
    },
    /** Advance the clock, firing timers in order. */
    async advance(ms) {
      const target = now + ms;
      while (true) {
        const next = timers.filter((timer) => timer.at <= target).sort((a, b) => a.at - b.at)[0];
        if (!next) break;
        timers.splice(timers.indexOf(next), 1);
        now = next.at;
        next.cb();
        await settle();
      }
      now = target;
    },
    get pendingTimers() {
      return timers.length;
    },
  };
}
