import * as THREE from 'three';
import { PALETTE } from '../../../../data/amyloidBeta.js';
import { particleVertexShader, particleFragmentShader } from './shaders/particles.js';

/**
 * The Aβ particle field: one THREE.Points object that represents the whole
 * population, from soluble monomer through to plaque-bound material.
 */
export class AggregationField extends THREE.Points {
  /** @param {ReturnType<import('./aggregationLayout.js').buildAggregationLayout>} layout */
  constructor(layout) {
    const { count, attributes } = layout;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(attributes.free, 3));
    geometry.setAttribute('aOligo', new THREE.BufferAttribute(attributes.oligo, 3));
    geometry.setAttribute('aFibril', new THREE.BufferAttribute(attributes.fibril, 3));
    geometry.setAttribute('aPlaque', new THREE.BufferAttribute(attributes.plaque, 3));
    geometry.setAttribute('aStages', new THREE.BufferAttribute(attributes.stages, 4));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(attributes.seeds, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(attributes.sizes, 1));
    // Particles move in the shader, so a manual bounding sphere avoids culling pops.
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 16);

    const material = new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uOpacity: { value: 1 },
        uParticleScale: { value: 0.115 },
        uHeightScale: { value: 900 },
        uMonomer: { value: new THREE.Color(PALETTE.monomer) },
        uOligomer: { value: new THREE.Color(PALETTE.oligomer) },
        uFibril: { value: new THREE.Color(PALETTE.fibril) },
        uPlaque: { value: new THREE.Color(PALETTE.plaque) },
      },
    });

    super(geometry, material);
    this.name = 'amyloid-field';
    this.frustumCulled = false;
    this.count = count;
  }

  setProgress(value) {
    this.material.uniforms.uProgress.value = value;
  }

  update(elapsed) {
    this.material.uniforms.uTime.value = elapsed;
  }

  /**
   * Keeps particle size constant in world units across resolutions and FOVs.
   * @param {THREE.PerspectiveCamera} camera
   * @param {THREE.WebGLRenderer} renderer
   */
  syncViewport(camera, renderer) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const fovRad = (camera.fov * Math.PI) / 180;
    this.material.uniforms.uHeightScale.value = size.y / (2 * Math.tan(fovRad / 2));
  }
}
