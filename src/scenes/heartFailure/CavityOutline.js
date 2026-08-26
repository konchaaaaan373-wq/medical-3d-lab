import * as THREE from 'three';
import { cavitySurfacePoint } from './geometry/ventricleGeometry.js';

/**
 * A thin cage marking where the cavity wall sat at end-diastole.
 *
 * The single hardest thing to see in a beating ventricle is *how far the wall
 * travelled*. A failing ventricle still moves; it just moves less, and without
 * something to measure against, "less" is invisible — especially side by side,
 * where the two hearts are also different sizes to begin with.
 *
 * So the fullest moment of the beat is left behind as an outline and the cavity
 * contracts inside it. The gap between lining and outline is the stroke, drawn
 * rather than stated: wide in a normal ventricle, narrow in a failing one, at a
 * glance and from any angle.
 *
 * The cage samples the same endocardial surface function the chamber mesh is
 * built from (`cavitySurfacePoint` — including the leaning, bowed long axis and
 * the angular shaping), so at end-diastole it lies on the drawn lining rather
 * than on an idealised spheroid the lining no longer follows.
 *
 * Drawn as lines, not as a surface, precisely so it cannot be mistaken for
 * tissue. It is a measurement mark.
 */
export class CavityOutline extends THREE.LineSegments {
  /**
   * @param {{ profilePoints?: number, meridians?: number, rings?: number,
   *   cutAngle?: number, flip?: boolean, color?: THREE.ColorRepresentation }} options
   */
  constructor({ profilePoints = 20, meridians = 13, rings = 4, cutAngle = Math.PI * 0.55, flip = false, color = '#9fe4ff' } = {}) {
    const N = profilePoints;
    const M = meridians;
    const positions = new Float32Array((M * (N - 1) + rings * (M - 1)) * 2 * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    super(
      geometry,
      new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.62,
        // Never occludes the subject, and never writes depth over it.
        depthWrite: false,
      })
    );
    this.name = 'cavity-outline';

    this.N = N;
    this.M = M;
    this.rings = rings;
    this.flip = flip ? -1 : 1;

    const phiStart = cutAngle / 2;
    const phiSpan = Math.PI * 2 - cutAngle;
    this._phi = new Float32Array(M);
    for (let k = 0; k < M; k++) this._phi[k] = phiStart + (k / (M - 1)) * phiSpan;
    // Latitude rings sit between apex and rim, skipping both ends: the apex is
    // a point and the rim is already the top of every meridian.
    this._ringAt = Array.from({ length: rings }, (_, r) => (r + 1) / (rings + 1));
    this._sample = new THREE.Vector3();
  }

  /**
   * @param {{ cavityRadius: number, cavitySemiLength: number,
   *   outerSemiLength: number, baseY: number }} shape
   *   the end-diastolic geometry, in the same terms `Chamber.setShape` takes
   */
  setShape(shape) {
    const { N, M } = this;
    const positions = this.geometry.attributes.position.array;
    const sample = this._sample;
    let p = 0;
    const put = (t, k) => {
      cavitySurfacePoint(shape, t, this._phi[k], sample);
      positions[p++] = sample.x;
      positions[p++] = sample.y * this.flip;
      positions[p++] = sample.z;
    };

    // Meridians: apex to rim, one polyline per angle, emitted as segments.
    for (let k = 0; k < M; k++) {
      for (let i = 0; i < N - 1; i++) {
        put(i / (N - 1), k);
        put((i + 1) / (N - 1), k);
      }
    }
    // Latitude rings, sampled on the same surface so they land on it.
    for (const t of this._ringAt) {
      for (let k = 0; k < M - 1; k++) {
        put(t, k);
        put(t, k + 1);
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  /** @param {number} value 0..1 */
  setOpacity(value) {
    this.material.opacity = value * 0.62;
    this.visible = value > 0.01;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
