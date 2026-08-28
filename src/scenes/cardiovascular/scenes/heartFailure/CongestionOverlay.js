import * as THREE from 'three';
import { PALETTE } from '../../../../data/heartFailure.js';
import {
  ANATOMY,
  PULMONARY_VEINS,
  buildVascularFans,
  buildInterstitialFluid,
} from './anatomy.js';
import { variableTube } from './Vessels.js';
import { lerp, smoothstep } from '../../../../utils/math.js';

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
 *      rises, drawn as a restrained fresnel tint hugging the vessel walls —
 *      pressure travels backwards; blood never does.
 *   2. pale interstitial fluid *outside* the vessels: a perivascular haze
 *      around the engorged veins and their branches, appearing only once
 *      pressure is high.
 *
 * The physical response of the vessels themselves (atrial distension, venous
 * engorgement, dusky tint) lives in Vessels.js — this overlay only carries
 * the two things that are not tissue: transmitted pressure and transudate.
 *
 * Built once; per-frame cost is two uniform writes.
 */
export class CongestionOverlay extends THREE.Group {
  /** @param {number} fluidCount number of interstitial fluid particles */
  constructor(fluidCount = 700) {
    super();
    this.name = 'congestion-overlay';

    this.pressureMaterial = createPressureMaterial(new THREE.Color(PALETTE.pressure));

    // --- pressure front along atrium -> veins -> vascular branches
    // Sized past the lobed atrium's fullest extent (appendage included) and
    // rescaled with its distension in setCongestion, so the tint always sits
    // just outside the wall it labels.
    const atrium = new THREE.SphereGeometry(ANATOMY.atriumRadius * 1.32, 28, 20);
    this.atriumSheath = sheath(atrium, () => 0.12, this.pressureMaterial);
    this.atriumSheath.position.copy(ANATOMY.atriumCentre);
    this.add(this.atriumSheath);

    // Vessel sheath radii allow for the walls' engorgement at full
    // congestion (Vessels inflates them by up to 0.12 along the normal).
    for (const vein of PULMONARY_VEINS) {
      // Curves run bed -> atrium, so uv.x = 0 at the far (bed) end.
      const tube = variableTube(vein, 40, 10, () => 0.56);
      this.add(sheath(tube, (uvX) => 0.2 + (1 - uvX) * 0.5, this.pressureMaterial));
    }

    // The pressure reaches the vascular bed last: sheaths over the branch
    // fans, path distance growing outward along each branch.
    for (const fan of buildVascularFans()) {
      for (let i = 0; i < fan.curves.length; i++) {
        const primary = fan.generations[i] === 0;
        const tube = variableTube(
          fan.curves[i],
          primary ? 18 : 10,
          8,
          (t) => (primary ? lerp(0.52, 0.38, t) : lerp(0.37, 0.3, t))
        );
        this.add(
          sheath(tube, (uvX) => (primary ? 0.72 + uvX * 0.2 : 0.85 + uvX * 0.15), this.pressureMaterial)
        );
      }
    }

    // --- interstitial fluid
    const fluid = buildInterstitialFluid(fluidCount);
    this.fluid = createFluidPoints(fluid);
    this.add(this.fluid);

    this.setCongestion(0, 0);
  }

  /**
   * Both inputs come from the solved mean pulmonary venous pressure rather than
   * from the structural stage, so this overlay is a separate axis from the
   * remodelling stages: it can be shown at any point on them, and it is not
   * specific to HFrEF.
   *
   * @param {number} front 0..1 spread of the pressure front, from pulmonary
   *   venous pressure between the two landmarks in `CONGESTION_PRESSURE`
   * @param {number} fluid 0..1 interstitial fluid, which only appears once the
   *   pressure passes the range where transudation is expected. It is passed in
   *   rather than derived here so nothing can create fluid the state does not
   *   produce.
   */
  setCongestion(front, fluid) {
    this.pressureMaterial.uniforms.uPressure.value = front;
    this.fluid.material.uniforms.uFill.value = fluid;
    // Track the atrium's own distension (same easing as Vessels), so the
    // sheath keeps hugging the wall it labels as the chamber swells.
    this.atriumSheath.scale.setScalar(lerp(1, 1.22, smoothstep(0, 1, front)));
    this.visible = front > 0.02;
  }

  /**
   * Presentation emphasis, 0..1. Visualization only: it makes the pressure
   * field easier to read without changing `congestionLevel`, the amount of
   * interstitial fluid, or anything else the model produces.
   *
   * @param {number} emphasis
   */
  setPresentationEmphasis(emphasis) {
    const uniforms = this.pressureMaterial.uniforms;
    uniforms.uGlowIntensity.value = 0.55 + 0.85 * emphasis;
    uniforms.uWaveStrength.value = 0.22 + 0.3 * emphasis;
    uniforms.uFieldOpacity.value = 0.34 + 0.28 * emphasis;
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
      // Visualization-only: how bright the pressure tint gets at full
      // pressure. Deliberately restrained — the engorged vessels carry the
      // story; this is the label on them, not a lightshow.
      uGlowIntensity: { value: 0.55 },
      // Visualization-only: amplitude of the wave that runs along the pathway.
      // Raised for presentation, where the direction of transmission is the
      // whole point; it carries no physiological meaning.
      uWaveStrength: { value: 0.22 },
      // Visualization-only: overall opacity of the pressure field.
      uFieldOpacity: { value: 0.34 },
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
        vFresnel = pow(clamp(1.0 - abs(dot(n, v)), 0.0, 1.0), 2.4);
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
      uniform float uWaveStrength;
      uniform float uFieldOpacity;
      varying float vFresnel;
      varying float vGate;
      varying float vPath;
      void main() {
        // Slow wave running outward along the pathway, so the direction of
        // pressure transmission is visible. Pressure travels this way; blood
        // never does.
        float wave = (1.0 - uWaveStrength) + uWaveStrength * sin(uTime * 1.1 - vPath * 7.0);
        float a = vFresnel * vGate * uPressure;
        gl_FragColor = vec4(uColor * uGlowIntensity * wave, a * uFieldOpacity);
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
  // Fluid now surrounds both vascular regions.
  const mid = ANATOMY.pulmonaryBed.clone().lerp(ANATOMY.pulmonaryBedRight, 0.5);
  geometry.boundingSphere = new THREE.Sphere(mid, 8);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uFill: { value: 0 },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(PALETTE.fluid) },
      uParticleScale: { value: 0.42 },
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
          sin(uTime * 0.11 + phase) * 0.14,
          -0.1 * fract(uTime * 0.03 + aSeed),
          cos(uTime * 0.09 + phase) * 0.14
        );
        vec4 mv = modelViewMatrix * vec4(position + drift, 1.0);
        gl_Position = projectionMatrix * mv;
        vAlpha = smoothstep(aAppear, aAppear + 0.25, uFill) * 0.09;
        gl_PointSize = clamp(aSize * uParticleScale * uHeightScale / max(0.001, -mv.z), 1.0, 260.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        // Soft, hazy edge — reads as mist in the interstitium rather than as
        // a discrete glowing particle.
        float core = smoothstep(0.5, 0.04, d);
        gl_FragColor = vec4(uColor * (0.4 + 0.25 * core), pow(core, 1.7) * vAlpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.name = 'interstitial-fluid';
  return points;
}
