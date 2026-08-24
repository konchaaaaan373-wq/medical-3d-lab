import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
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
    this.running = false;

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
    this.scene.fog = new THREE.FogExp2(0x05070d, 0.022);
    this.scene.add(createBackdrop());

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.set(9.5, 4.2, 13.5);

    this.controls = createControls(this.camera, this.renderer.domElement, {
      target: new THREE.Vector3(0, 0.2, 0),
    });

    // Bloom is what makes the particles glow — the single biggest visual win —
    // so it stays on everywhere; the pixel-ratio cap above pays for it on phones.
    this.useBloom = bloom;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (this.useBloom) {
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.8, 0.15);
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

  resize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    // On tall phone screens a narrow FOV crops the subject; widen it a little.
    this.camera.fov = this.camera.aspect < 0.85 ? 56 : 42;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.bloomPass?.setSize(width, height);
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
  }

  /** Returns a PNG data URL of the current frame (used by the capture button). */
  snapshot() {
    this.composer.render();
    return this.renderer.domElement.toDataURL('image/png');
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    this.controls.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
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
