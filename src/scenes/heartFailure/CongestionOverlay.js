import * as THREE from 'three';
import { PALETTE } from '../../data/heartFailure.js';
import { ANATOMY, PULMONARY_VEINS, buildInterstitialFluid } from './anatomy.js';
import { smoothstep } from '../../utils/math.js';

/**
 * Pulmonary congestion, drawn as pressure — not as blood.
 *
 * This separation is the whole point of the component. Pulmonary congestion is
 * not blood flowing backwards into the lung: raised LV filling pressure is
 * transmitted to the left atrium and pulmonary veins, pulmonary capillary
 * hydrostatic pressure rises, and fluid moves into the interstitium.
 *
 * So the overlay uses two visual languages, both distinct from the blood
 * particles:
 *   1. a pressure front that spreads outward along the pathway
 *      (LV -> atrium -> pulmonary veins -> vascular bed) as filling pressure
 *      rises. Pressure travels backwards; blood never does.
 *   2. pale interstitial fluid particles *outside* the vessels, appearing only
 *      once pressure is high.
 *
 * Built once; per-frame cost is two uniform writes.
 */
export class CongestionOverlay extends THREE.Group {
  /** @param {number} fluidCount number of interstitial fluid particles */
  constructor(fluidCount = 700) {
    super();
    this.name = 'congestion-overlay';

    this.pressureMaterial = createPressureMaterial(new THREE.Color(PALETTE.pressure));

    // --- pressure front along atrium -> veins -> vascular bed
    const atrium = new THREE.SphereGeometry(ANATOMY.atriumRadius * 1.1, 28, 20);
    atrium.translate(ANATOMY.atriumCentre.x, ANATOMY.atriumCentre.y, ANATOMY.atriumCentre.z);
    this.add(sheath(atrium, () => 0.12, this.pressureMaterial));

    for (const vein of PULMONARY_VEINS) {
      // The curve runs bed -> atrium, so uv.x = 1 at the atrium end.
      const tube = new THREE.TubeGeometry(vein, 48, 0.62, 12, false);
      this.add(sheath(tube, (uvX) => 0.2 + (1 - uvX) * 0.5, this.pressureMaterial));
    }

    const bed = new THREE.SphereGeometry(1.95, 28, 20);
    bed.translate(ANATOMY.pulmonaryBed.x, ANATOMY.pulmonaryBed.y, ANATOMY.pulmonaryBed.z);
    this.add(sheath(bed, () => 0.85, this.pressureMaterial));

    // --- interstitial fluid
    const fluid = buildInterstitialFluid(fluidCount);
    this.fluid = createFluidPoints(fluid);
    this.add(this.fluid);

    this.setCongestionLevel(0);
  }

  /**
   * @param {number} congestionLevel 0..1 index of raised left-sided filling
   *   pressure. A separate axis from the structural stages: this overlay can be
   *   shown at any point on them, and is not specific to HFrEF.
   */
  setCongestionLevel(congestionLevel) {
    this.pressureMaterial.uniforms.uPressure.value = congestionLevel;
    // Fluid only starts to move into the interstitium once pressure is high.
    this.fluid.material.uniforms.uFill.value = smoothstep(0.55, 1, congestionLevel);
    this.visible = congestionLevel > 0.02;
  }

  update(elapsed) {
    this.pressureMaterial.uniforms.uTime.value = elapsed;
    this.fluid.material.uniforms.uTime.value = elapsed;
  }

  syncViewport(camera, renderer) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const fovRad = (camera.fov * Math.PI) / 180;
    this.fluid.material.uniforms.uHeightScale.value = size.y / (2 * Math.tan(fovRad / 2));
  }
}

/** Bakes a per-vertex position along the pressure pathway, 0 at the atrium. */
function sheath(geometry, pathFromUv, material) {
  const uv = geometry.attributes.uv;
  const path = new Float32Array(geometry.attributes.position.count);
  for (let i = 0; i < path.length; i++) path[i] = pathFromUv(uv ? uv.getX(i) : 0);
  geometry.setAttribute('aPathDistance', new THREE.BufferAttribute(path, 1));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

function createPressureMaterial(color) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    uniforms: {
      uPressure: { value: 0 },
      uTime: { value: 0 },
      uColor: { value: color },
      // Visualization-only: how bright the pressure glow gets at full pressure.
      uGlowIntensity: { value: 0.95 },
    },
    vertexShader: /* glsl */ `
      uniform float uPressure;
      attribute float aPathDistance;
      varying float vFresnel;
      varying float vGate;
      varying float vPath;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vec3 v = normalize(-mv.xyz);
        vFresnel = pow(clamp(1.0 - abs(dot(n, v)), 0.0, 1.0), 2.0);
        vPath = aPathDistance;
        // The front advances away from the ventricle as filling pressure rises.
        float front = uPressure * 1.15;
        vGate = smoothstep(front, front - 0.3, aPathDistance);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uPressure;
      uniform float uTime;
      uniform float uGlowIntensity;
      varying float vFresnel;
      varying float vGate;
      varying float vPath;
      void main() {
        // Slow wave running outward, so the direction of pressure transmission
        // is visible without moving any blood.
        float wave = 0.72 + 0.28 * sin(uTime * 1.3 - vPath * 7.0);
        float a = vFresnel * vGate * uPressure;
        gl_FragColor = vec4(uColor * uGlowIntensity * wave, a * 0.6);
      }
    `,
  });
}

function createFluidPoints({ count, positions, appear, seeds, sizes }) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, count * 3), 3));
  geometry.setAttribute('aAppear', new THREE.BufferAttribute(appear.subarray(0, count), 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds.subarray(0, count), 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes.subarray(0, count), 1));
  geometry.boundingSphere = new THREE.Sphere(ANATOMY.pulmonaryBed.clone(), 5);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uFill: { value: 0 },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(PALETTE.fluid) },
      uParticleScale: { value: 0.1 },
      uHeightScale: { value: 900 },
    },
    vertexShader: /* glsl */ `
      uniform float uFill;
      uniform float uTime;
      uniform float uParticleScale;
      uniform float uHeightScale;
      attribute float aAppear;
      attribute float aSeed;
      attribute float aSize;
      varying float vAlpha;
      void main() {
        float phase = aSeed * 6.2831853;
        // Slow settling drift: fluid accumulating, not flowing along a vessel.
        vec3 drift = vec3(
          sin(uTime * 0.18 + phase) * 0.12,
          -0.18 * fract(uTime * 0.045 + aSeed),
          cos(uTime * 0.15 + phase) * 0.12
        );
        vec4 mv = modelViewMatrix * vec4(position + drift, 1.0);
        gl_Position = projectionMatrix * mv;
        vAlpha = smoothstep(aAppear, aAppear + 0.25, uFill) * 0.6;
        gl_PointSize = clamp(aSize * uParticleScale * uHeightScale / max(0.001, -mv.z), 1.0, 48.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        // Soft, hazy edge — reads as fluid rather than as a discrete particle.
        float core = smoothstep(0.5, 0.1, d);
        gl_FragColor = vec4(uColor * (0.5 + 0.5 * core), pow(core, 2.0) * vAlpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.name = 'interstitial-fluid';
  return points;
}
