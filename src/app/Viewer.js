import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createControls } from '../controls/createControls.js';
import {
  createFrameBudgetMonitor,
  deviceClassForViewport,
  pixelRatioFor,
  qualityTier,
} from './performanceBudget.js';
import { backgroundPresetById, DEFAULT_BACKGROUND_ID } from './inspection.js';

/**
 * Owns everything that is *not* specific to a disease theme:
 * renderer, camera, orbit controls, the backdrop, bloom and the animation loop.
 *
 * A scene module receives this object and only has to build its own content.
 */
/**
 * Luminance a pixel must exceed before it blooms. High enough that lit tissue
 * never does, including a grazing highlight on a cut edge.
 */
const BLOOM_THRESHOLD = 0.72;

export class Viewer {
  /** @param {HTMLElement} container */
  constructor(container, { bloom = true } = {}) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.frameHandlers = new Set();
    this.resizeHandlers = new Set();
    this.running = false;
    this.qualityHandlers = new Set();

    try {
      // The degradation policy is declared in `performanceBudget.js` and tested
      // without a GPU. The viewer's job is to apply the decisions, not to hold
      // opinions about frame times.
      this.deviceClass = deviceClassForViewport(window.innerWidth);
      this.frameBudget = createFrameBudgetMonitor({ deviceClass: this.deviceClass });

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        // Keep the browser/WebGL default (`preserveDrawingBuffer: false`). PNG
        // capture explicitly re-renders and reads the canvas immediately, so
        // retaining every completed frame would spend GPU memory/bandwidth on the
        // normal path for a feature that is used only on demand.
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance',
      });
      // Cap the pixel ratio harder on phones: the particle field is fill-rate
      // bound. Both ceilings — device class and current quality tier — live in
      // the budget module so the renderer cannot drift away from the promise.
      this.renderer.setPixelRatio(this._budgetedPixelRatio());
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      container.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x05070d, 0.017);
      this.backdrop = createBackdrop();
      this.scene.add(this.backdrop);

      // Image-based ambient: a neutral studio environment at low intensity.
      // This is what gives tissue and vessel surfaces their soft, believable
      // reflections — point lights alone are what made them look like plastic.
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      try {
        this.environmentTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      } finally {
        pmrem.dispose();
      }
      this.scene.environment = this.environmentTexture;
      this.scene.environmentIntensity = 0.45;

      this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
      this.camera.position.set(-9.5, 4.2, 13.5);

      this.controls = createControls(this.camera, this.renderer.domElement, {
        target: new THREE.Vector3(0, 0.2, 0),
      });

      // Bloom is kept, but restrained: a raised threshold keeps tissue out of it
      // entirely, so only genuinely emissive things (particles, the pressure
      // field) get a soft halo. Broad low-threshold bloom was a large part of
      // the old game-VFX look.
      //
      // Raised again at 0.5: one grazing specular highlight on the basal
      // shoulder was crossing the threshold and blooming into a small white blob
      // — the brightest thing in the close-up, and on a piece of muscle. Tissue
      // reaches roughly 0.6 there, the emissive things sit well above it.
      this.useBloom = bloom;
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      if (this.useBloom) {
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.55, BLOOM_THRESHOLD);
        this.composer.addPass(this.bloomPass);
      }
      this.composer.addPass(new OutputPass());
      this.setBackgroundPreset(DEFAULT_BACKGROUND_ID);

      this._onResize = () => this.resize();
      window.addEventListener('resize', this._onResize);
      this.resize();
    } catch (error) {
      // Construction can fail after a canvas or resize listener exists. Make
      // the constructor transactional so callers never have to dispose an
      // object they never received.
      try {
        this.dispose();
      } catch (cleanupError) {
        console.error('viewer cleanup after setup failure', cleanupError);
      }
      throw error;
    }
  }

  /** Register a per-frame callback. Returns an unsubscribe function. */
  onFrame(handler) {
    this.frameHandlers.add(handler);
    return () => this.frameHandlers.delete(handler);
  }

  /**
   * Register a callback for "the drawing buffer changed size".
   * Scenes use this to keep resolution-dependent uniforms in sync — including
   * during an off-screen snapshot, which resizes without a window event.
   */
  onResize(handler) {
    this.resizeHandlers.add(handler);
    handler(this.camera, this.renderer);
    return () => this.resizeHandlers.delete(handler);
  }

  resize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this._syncDeviceClass();
    this.camera.aspect = width / height;
    this.camera.fov = fovForAspect(this.camera.aspect);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.bloomPass?.setSize(width, height);
    this._notifyResize();
  }

  _notifyResize() {
    for (const handler of this.resizeHandlers) handler(this.camera, this.renderer);
  }

  /**
   * Rotating a tablet or dragging a window across the phone breakpoint changes
   * which budget applies. The tier already earned is kept — the device did not
   * get faster — but its ceiling and its floor are re-read.
   *
   * This sets the pixel ratio directly rather than going through
   * `_applyQuality`, which would call `resize` and recurse.
   */
  _syncDeviceClass() {
    const next = deviceClassForViewport(window.innerWidth);
    if (next === this.deviceClass) return;
    this.deviceClass = next;
    this.frameBudget = createFrameBudgetMonitor({ deviceClass: next, tier: this.frameBudget.tier });
    const ratio = this._budgetedPixelRatio();
    if (this.renderer.getPixelRatio() !== ratio) this.renderer.setPixelRatio(ratio);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(() => this._tick());
  }

  stop() {
    this.running = false;
    this.renderer?.setAnimationLoop(null);
  }

  _tick() {
    // Clamp dt so a backgrounded tab does not fast-forward the whole animation.
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();
    this.controls.update();
    for (const handler of this.frameHandlers) handler(dt, elapsed);
    this.composer.render();
    this._watchPerformance(dt);
  }

  /** The tier the frame budget currently allows. */
  get quality() {
    return this.frameBudget.tier;
  }

  /**
   * Subscribe to quality-tier transitions.
   *
   * The app reports them as a performance metric; nothing in a medical scene
   * is allowed to react to them, because a device that is slow today must not
   * be shown different physiology from one that is fast.
   */
  onQuality(handler) {
    this.qualityHandlers.add(handler);
    return () => this.qualityHandlers.delete(handler);
  }

  _budgetedPixelRatio() {
    return pixelRatioFor({
      devicePixelRatio: window.devicePixelRatio,
      deviceClass: this.deviceClass,
      tier: this.frameBudget.tier,
    });
  }

  /**
   * Graceful degradation, and — new with the declared budget — graceful
   * recovery. A phone that was thermally throttled while a heavy scene loaded
   * used to keep the reduced quality for the rest of the session; it now earns
   * the flourish back after sustained headroom.
   */
  _watchPerformance(dt) {
    const transition = this.frameBudget.sample(dt * 1000);
    if (!transition) return;
    this._applyQuality(transition.to);
    console.info(
      `[viewer] frame budget ${transition.direction}: ${transition.from} -> ${transition.to} (${transition.reason})`
    );
    for (const handler of this.qualityHandlers) handler(transition, this.frameBudget.report());
  }

  /** Apply a tier to the renderer. Idempotent, so a repeated decision is free. */
  _applyQuality(tierId) {
    const tier = qualityTier(tierId);
    if (!tier) return;
    if (this.bloomPass) this.bloomPass.enabled = tier.bloom && this.useBloom;
    const ratio = this._budgetedPixelRatio();
    if (this.renderer.getPixelRatio() !== ratio) {
      this.renderer.setPixelRatio(ratio);
      this.resize();
    }
    // Evidence gathered at the previous cost per frame says nothing about the
    // new one, and resizing itself produces one expensive frame.
    this.frameBudget.reset();
  }

  /**
   * Applies one calibrated inspection background.
   *
   * The backdrop, fog, ambient reflection, exposure and bloom move together;
   * changing only the clear colour makes pale modes wash tissue out and leaves
   * dark-mode fog hanging over a white field. This is display state only.
   *
   * @returns {ReturnType<backgroundPresetById>} the accepted preset
   */
  setBackgroundPreset(id) {
    const preset = backgroundPresetById(id);
    this.backgroundPreset = preset.id;
    const uniforms = this.backdrop?.material?.uniforms;
    uniforms?.uTop?.value.set(preset.backdrop.top);
    uniforms?.uBottom?.value.set(preset.backdrop.bottom);
    uniforms?.uAccent?.value.set(preset.backdrop.accent);
    if (uniforms?.uHalo) uniforms.uHalo.value = preset.backdrop.halo;
    this.scene?.fog?.color.set(preset.fog);
    if (this.scene?.fog) this.scene.fog.density = preset.fogDensity;
    if (this.scene) this.scene.environmentIntensity = preset.environmentIntensity;
    if (this.renderer) this.renderer.toneMappingExposure = preset.exposure;
    if (this.bloomPass) this.bloomPass.strength = preset.bloomStrength;
    return preset;
  }

  /**
   * PNG data URL of the current frame.
   *
   * WebGL does not preserve completed frames globally. Every capture therefore
   * renders immediately before `toDataURL`, while the freshly rendered drawing
   * buffer is still available. This keeps the expensive preserve-buffer option
   * off for every normal animation frame.
   *
   * With `size` the frame is re-rendered off-screen at an exact pixel size —
   * that is how the 4:5 and 1:1 social presets are produced without the user
   * having to resize their browser window.
   *
   * @param {{ width: number, height: number }} [size]
   */
  snapshot(size) {
    if (!size) {
      this.composer.render();
      return this.renderer.domElement.toDataURL('image/png');
    }

    const previous = {
      size: this.renderer.getSize(new THREE.Vector2()),
      pixelRatio: this.renderer.getPixelRatio(),
      aspect: this.camera.aspect,
      fov: this.camera.fov,
    };

    this.renderer.setPixelRatio(1);
    // `updateStyle: false` keeps the on-screen canvas visually unchanged.
    this.renderer.setSize(size.width, size.height, false);
    this.composer.setSize(size.width, size.height);
    this.bloomPass?.setSize(size.width, size.height);
    this.camera.aspect = size.width / size.height;
    this.camera.fov = fovForAspect(this.camera.aspect);
    this.camera.updateProjectionMatrix();
    this._notifyResize();
    this.composer.render();
    const url = this.renderer.domElement.toDataURL('image/png');

    this.renderer.setPixelRatio(previous.pixelRatio);
    this.renderer.setSize(previous.size.x, previous.size.y, false);
    this.composer.setSize(previous.size.x, previous.size.y);
    this.bloomPass?.setSize(previous.size.x, previous.size.y);
    this.camera.aspect = previous.aspect;
    this.camera.fov = previous.fov;
    this.camera.updateProjectionMatrix();
    this._notifyResize();
    this.composer.render();
    return url;
  }

  dispose() {
    this.stop();
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    this.controls?.dispose();
    this.composer?.dispose();
    this.environmentTexture?.dispose();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss?.();
    this.renderer?.domElement?.remove();
  }
}

/** On tall/narrow frames a narrow FOV crops the subject, so widen it a little. */
export function fovForAspect(aspect) {
  return aspect < 0.85 ? 56 : 42;
}

/**
 * Large inverted sphere with a vertical gradient.
 * Cheaper and more controllable than a texture, and it keeps the horizon dark
 * so glowing particles stay the brightest thing on screen.
 */
function createBackdrop() {
  const geometry = new THREE.SphereGeometry(80, 32, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color('#0b1020') },
      uBottom: { value: new THREE.Color('#04060c') },
      uAccent: { value: new THREE.Color('#12324a') },
      uHalo: { value: 0.35 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uBottom;
      uniform vec3 uAccent;
      uniform float uHalo;
      varying vec3 vWorld;
      void main() {
        vec3 dir = normalize(vWorld);
        float h = dir.y * 0.5 + 0.5;
        vec3 color = mix(uBottom, uTop, smoothstep(0.15, 0.95, h));
        // Soft cool glow behind the subject, so the silhouette separates from the void.
        float halo = pow(max(0.0, 1.0 - length(dir.xy - vec2(-0.15, 0.05))), 3.0);
        color += uAccent * halo * uHalo;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'backdrop';
  return mesh;
}
