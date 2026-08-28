import * as THREE from 'three';
import { buildVentricleGeometry, updateVentricleGeometry } from './geometry/ventricleGeometry.js';
import { createHeartMaterials } from './materials/heartMaterials.js';

/**
 * A deformable, wedge-cut left-ventricle shell.
 *
 * The mesh has four regions with three materials: the epicardial surface, the
 * endocardial (cavity) surface, and the cut myocardium (the two wedge faces
 * plus the annulus at the valve plane). A wedge is left out so the viewer can
 * see the cavity and, crucially, the thickness of the wall — the whole point
 * of the scene.
 *
 * Geometry is built once with a fixed index buffer; every frame only the
 * vertex positions are rewritten. The *scale* of the shape comes exclusively
 * from the haemodynamic model via `setShape`; the anatomical *form* (tapered
 * asymmetric profile, wall-thickness field, septal flattening, torsion) lives
 * in `geometry/ventricleGeometry.js` and only redistributes what the model
 * solved for.
 */
export class Chamber extends THREE.Mesh {
  /**
   * @param {{
   *   profilePoints?: number, segments?: number, cutAngle?: number,
   *   flip?: boolean, variant?: 'disease'|'reference', contextLobe?: boolean,
   * }} options
   */
  constructor({
    profilePoints = 26,
    segments = 48,
    cutAngle = Math.PI * 0.55,
    flip = false,
    variant = 'disease',
    contextLobe = true,
  } = {}) {
    const kit = buildVentricleGeometry({ profilePoints, segments, cutAngle, flip, contextLobe });
    super(kit.geometry, createHeartMaterials(variant));
    this.name = 'chamber';
    this.kit = kit;
    this.motion = { torsion: 0 };
  }

  /**
   * Presentation opacity applied across all three surface materials, so a
   * whole heart can step back without its cut faces lagging behind.
   *
   * @param {number} opacity 0..1
   */
  setOpacity(opacity) {
    for (const material of this.material) material.opacity = opacity;
  }

  /**
   * Systolic torsion at the apex, radians. Derived by the scene from the
   * solved beat (it scales with how far the stroke has emptied and with the
   * state's ejection fraction); the base stays fixed and the apex rotates.
   *
   * @param {number} torsion
   */
  setTorsion(torsion) {
    this.motion.torsion = torsion;
  }

  /**
   * @param {{
   *   cavityRadius: number, cavitySemiLength: number,
   *   outerRadius: number, outerSemiLength: number,
   *   baseY: number,
   * }} shape valve plane at `baseY`; the chamber extends away from it
   */
  setShape(shape) {
    updateVentricleGeometry(this.kit, shape, this.motion);
  }
}
