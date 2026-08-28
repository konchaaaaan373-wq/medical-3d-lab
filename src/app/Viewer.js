import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createControls } from '../controls/createControls.js';

/**
 * Owns everything that is *not* specific to a disease theme:
 * renderer, camera, orbit controls, the backdrop, bloom and the animation loop.
 *
 * A scene module receives this object and only has to build its own content.
 */
export class Viewer {
  /** @param {HTMLElement} container */
  constructor(container, { bloom = true } = {}) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.frameHandlers = new Set();
    this.resizeHandlers = new Set();
    this.running = false;
    /** Lowered automatically if the frame budget is missed (see _watchPerformance). */
    this.quality = 'high';
    this._frameSamples = [];

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      // Required so "Save PNG" can read the canvas back after the frame is done.
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    // Cap the pixel ratio harder on phones: the particle field is fill-rate bound.
    const maxPixelRatio = window.innerWidth < 720 ? 1.5 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05070d, 0.017);
    this.scene.add(createBackdrop());

    // Image-based ambient: a neutral studio environment at low intensity.
    // This is what gives tissue and vessel surfaces their soft, believable
    // reflections — point lights alone are what made them look like plastic.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environmentTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
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
    this.useBloom = bloom;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (this.useBloom) {
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.55, 0.5);
      this.composer.addPass(this.bloomPass);
    }
    this.composer.addPass(new OutputPass());

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.resize();
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

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this.renderer.setAnimationLoop(() => this._tick());
  }

  stop() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
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

  /**
   * Two-step graceful degradation. Older phones cannot afford both bloom and a
   * high pixel ratio; rather than stutter, drop bloom first, then resolution.
   */
  _watchPerformance(dt) {
    if (this.quality === 'low') return;
    this._frameSamples.push(dt);
    if (this._frameSamples.length < 90) return;
    const average = this._frameSamples.reduce((a, b) => a + b, 0) / this._frameSamples.length;
    this._frameSamples.length = 0;
    if (average < 0.026) return; // ~38 fps or better: leave it alone

    if (this.quality === 'high' && this.bloomPass) {
      this.quality = 'medium';
      this.bloomPass.enabled = false;
      console.info('[viewer] frame budget missed — bloom disabled');
    } else {
      this.quality = 'low';
      this.renderer.setPixelRatio(1);
      this.resize();
      console.info('[viewer] frame budget missed — pixel ratio reduced');
    }
  }

  /**
   * PNG data URL of the current frame.
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
    window.removeEventListener('resize', this._onResize);
    this.controls.dispose();
    this.composer.dispose();
    this.environmentTexture?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
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
      varying vec3 vWorld;
      void main() {
        vec3 dir = normalize(vWorld);
        float h = dir.y * 0.5 + 0.5;
        vec3 color = mix(uBottom, uTop, smoothstep(0.15, 0.95, h));
        // Soft cool glow behind the subject, so the silhouette separates from the void.
        float halo = pow(max(0.0, 1.0 - length(dir.xy - vec2(-0.15, 0.05))), 3.0);
        color += uAccent * halo * 0.35;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'backdrop';
  return mesh;
}
