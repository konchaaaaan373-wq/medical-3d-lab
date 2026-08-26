import * as THREE from 'three';

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
    this._sin = new Float32Array(M);
    this._cos = new Float32Array(M);
    for (let k = 0; k < M; k++) {
      const phi = phiStart + (k / (M - 1)) * phiSpan;
      this._sin[k] = Math.sin(phi);
      this._cos[k] = Math.cos(phi);
    }
    // Latitude rings sit between apex and rim, skipping both ends: the apex is
    // a point and the rim is already the top of every meridian.
    this._ringAt = Array.from({ length: rings }, (_, r) => (r + 1) / (rings + 1));
  }

  /**
   * @param {{ cavityRadius: number, cavitySemiLength: number, baseY: number }} shape
   *   the end-diastolic cavity, in the same terms `Chamber.setShape` takes
   */
  setShape({ cavityRadius, cavitySemiLength, baseY }) {
    const { N, M } = this;
    const maxAngle = Math.acos(THREE.MathUtils.clamp(-baseY / cavitySemiLength, -1, 1));
    const r = new Float32Array(N);
    const y = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const a = (i / (N - 1)) * maxAngle;
      r[i] = cavityRadius * Math.sin(a);
      y[i] = -cavitySemiLength * Math.cos(a) * this.flip;
    }

    const positions = this.geometry.attributes.position.array;
    let p = 0;
    const put = (radius, height, k) => {
      positions[p++] = radius * this._sin[k];
      positions[p++] = height;
      positions[p++] = radius * this._cos[k];
    };

    // Meridians: apex to rim, one polyline per angle, emitted as segments.
    for (let k = 0; k < M; k++) {
      for (let i = 0; i < N - 1; i++) {
        put(r[i], y[i], k);
        put(r[i + 1], y[i + 1], k);
      }
    }
    // Latitude rings, following the same arc so they land on the surface.
    for (const t of this._ringAt) {
      const i = t * (N - 1);
      const lo = Math.floor(i);
      const mix = i - lo;
      const radius = r[lo] + (r[Math.min(N - 1, lo + 1)] - r[lo]) * mix;
      const height = y[lo] + (y[Math.min(N - 1, lo + 1)] - y[lo]) * mix;
      for (let k = 0; k < M - 1; k++) {
        put(radius, height, k);
        put(radius, height, k + 1);
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
