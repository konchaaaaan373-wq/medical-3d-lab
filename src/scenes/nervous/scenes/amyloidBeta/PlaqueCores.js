import * as THREE from 'three';
import { PALETTE } from '../../../../data/amyloidBeta.js';
import { smoothstep, createRandom } from '../../../../utils/math.js';

const APPEAR_FROM = 0.78;
const APPEAR_TO = 0.99;

/**
 * The dense extracellular deposits. Each plaque is a noisy core plus a fresnel
 * halo, so it reads as a solid mass sitting inside the particle corona rather
 * than as just another cloud of points.
 */
export class PlaqueCores extends THREE.Group {
  /** @param {ReturnType<import('./aggregationLayout.js').buildAggregationLayout>} layout */
  constructor(layout, seed = 4242) {
    super();
    this.name = 'plaques';
    const rnd = createRandom(seed);
    const color = new THREE.Color(PALETTE.plaque);

    this.coreMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.haloMaterial = createHaloMaterial(color);

    this.cores = layout.plaques.map((plaque, index) => {
      // A UV sphere gives a much smoother silhouette than a low-detail
      // icosahedron once the fresnel halo picks out the outline.
      const geometry = new THREE.SphereGeometry(plaque.radius * 0.62, 48, 32);
      displace(geometry, rnd, 0.2);

      const group = new THREE.Group();
      group.position.copy(plaque.center);
      group.scale.setScalar(0.001);

      const core = new THREE.Mesh(geometry, this.coreMaterial);
      const halo = new THREE.Mesh(geometry, this.haloMaterial);
      halo.scale.setScalar(1.5);
      group.add(core, halo);
      this.add(group);

      return { group, offset: index * 0.03, spin: 0.05 + rnd() * 0.05 };
    });
  }

  setProgress(progress) {
    const t = smoothstep(APPEAR_FROM, APPEAR_TO, progress);
    this.coreMaterial.opacity = t * 0.3;
    this.haloMaterial.uniforms.uOpacity.value = t * 0.42;
    this.visible = t > 0.001;
    if (!this.visible) return;

    for (const core of this.cores) {
      const local = smoothstep(APPEAR_FROM + core.offset, APPEAR_TO, progress);
      // Slight overshoot then settle reads as "packing together".
      core.group.scale.setScalar(Math.max(0.001, local * (1.06 - local * 0.06)));
    }
  }

  update(dt) {
    if (!this.visible) return;
    for (const core of this.cores) core.group.rotation.y += dt * core.spin;
  }
}

/** Rim-lit shell: bright at grazing angles, transparent head-on. */
function createHaloMaterial(color) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    uniforms: {
      uColor: { value: color.clone() },
      uOpacity: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalMatrix * normal;
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float f = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
        f = pow(clamp(f, 0.0, 1.0), 2.2);
        gl_FragColor = vec4(uColor * f * 1.2, f * uOpacity);
      }
    `,
  });
}

function displace(geometry, rnd, amount) {
  const position = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    const n = Math.sin(v.x * 3.1) * Math.cos(v.y * 2.6) * Math.sin(v.z * 3.4);
    v.multiplyScalar(1 + n * amount + (rnd() - 0.5) * 0.06);
    position.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
}
