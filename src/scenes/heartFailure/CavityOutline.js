import * as THREE from 'three';
import { buildVentricleGeometry, updateVentricleGeometry } from './geometry/ventricleGeometry.js';

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
 *
 * It samples the *same* geometry builder the chamber does, at the same shape,
 * rather than re-deriving the endocardial profile. The cavity is not a plain
 * spheroid — it carries a profile exponent, an angular shape, apex drift and a
 * wedge that seals toward the tip — and a mark that traced a simpler surface
 * would sit off the wall it is measuring, which is worse than not drawing it.
 */
export class CavityOutline extends THREE.LineSegments {
  /**
   * @param {{ profilePoints?: number, meridians?: number, rings?: number,
   *   cutAngle?: number, flip?: boolean, color?: THREE.ColorRepresentation }} options
   */
  constructor({ profilePoints = 20, meridians = 13, rings = 4, cutAngle = Math.PI * 0.55, flip = false, color = '#7ff0ff' } = {}) {
    // A private, low-resolution copy of the chamber's geometry. It is never
    // drawn — it is only somewhere to ask "where is the cavity wall at this
    // shape?" and read the answer off. The context lobe is left out: the mark
    // is about the left ventricular cavity, and the right-sided bulge is not
    // part of it.
    const kit = buildVentricleGeometry({
      profilePoints,
      segments: meridians - 1,
      cutAngle,
      flip,
      contextLobe: false,
    });

    const N = profilePoints;
    const M = meridians;
    // How much of the run nearest the valve plane to leave undrawn.
    //
    // The mark is fixed at end-diastole while the chamber's annulus descends
    // through systole, so the top of the cage would otherwise stand clear above
    // the tissue as a row of thin spikes — read as an artifact, not as a
    // measurement. What it would be marking up there is long-axis shortening,
    // which the descending annulus already shows; the cage is for the radial
    // gap along the body of the cavity, and that is all it now draws.
    const trimStart = Math.round(0.16 * (N - 1));
    const span = N - 1 - trimStart;
    const positions = new Float32Array((M * span + rings * (M - 1)) * 2 * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    super(
      geometry,
      new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        // Nearly opaque: WebGL ignores line width, so contrast is the only
        // control there is, and the rebuilt myocardium is far lighter than the
        // tissue this was first set against.
        opacity: 0.95,
        // Never occludes the subject, and never writes depth over it.
        depthWrite: false,
      })
    );
    this.name = 'cavity-outline';

    this.kit = kit;
    this.N = N;
    this.M = M;
    this.trimStart = trimStart;
    // Latitude rings sit inside the drawn span, skipping both ends: the apex is
    // a point and the top is already the top of every meridian.
    this._ringAt = Array.from({ length: rings }, (_, r) => trimStart + Math.round(((r + 1) / (rings + 1)) * span));
  }

  /**
   * @param {{ cavityRadius: number, cavitySemiLength: number,
   *   outerRadius: number, outerSemiLength: number, baseY: number }} shape
   *   the end-diastolic ventricle, in the same terms `Chamber.setShape` takes
   */
  setShape(shape) {
    // No torsion: the beat's twist follows the emptying, so it is zero at the
    // moment this mark records.
    updateVentricleGeometry(this.kit, shape, { torsion: 0 });

    const { N, M } = this;
    const source = this.kit.geometry.attributes.position.array;
    const profileCount = N * 2;
    // The inner (endocardial) run is stored rim -> apex, right after the outer
    // run. `j` counts down from the rim.
    const cavity = (k, j) => (k * profileCount + N + j) * 3;

    const positions = this.geometry.attributes.position.array;
    let p = 0;
    const put = (index) => {
      positions[p++] = source[index];
      positions[p++] = source[index + 1];
      positions[p++] = source[index + 2];
    };

    // Meridians: below the annulus down to the apex, one polyline per column,
    // emitted as segments.
    for (let k = 0; k < M; k++) {
      for (let j = this.trimStart; j < N - 1; j++) {
        put(cavity(k, j));
        put(cavity(k, j + 1));
      }
    }
    // Latitude rings, on the same samples, so they land on the surface.
    for (const j of this._ringAt) {
      for (let k = 0; k < M - 1; k++) {
        put(cavity(k, j));
        put(cavity(k + 1, j));
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeBoundingSphere();
  }

  /** @param {number} value 0..1 */
  setOpacity(value) {
    this.material.opacity = value * 0.95;
    this.visible = value > 0.01;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.kit.geometry.dispose();
  }
}
