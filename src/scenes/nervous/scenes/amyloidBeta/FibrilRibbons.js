import * as THREE from 'three';
import { PALETTE } from '../../../../data/amyloidBeta.js';
import { clamp, smoothstep } from '../../../../utils/math.js';

const APPEAR_FROM = 0.56;
const APPEAR_TO = 0.78;
/** Once plaques take over, the individual filaments recede visually. */
const RECEDE_FROM = 0.86;

/**
 * Thin glowing threads drawn along the same curves the particles snap onto.
 * They make the "fibril" stage legible: the beaded particles gain a backbone.
 *
 * Elongation is done with `drawRange` on the tube's index buffer, so each
 * filament literally grows from one end instead of just fading in.
 */
export class FibrilRibbons extends THREE.Group {
  /** @param {ReturnType<import('./aggregationLayout.js').buildAggregationLayout>} layout */
  constructor(layout) {
    super();
    this.name = 'fibrils';
    this.material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(PALETTE.fibril),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.filaments = layout.strands.map((strand, index) => {
      const geometry = new THREE.TubeGeometry(strand.curve, 64, 0.035, 5, false);
      const mesh = new THREE.Mesh(geometry, this.material);
      mesh.frustumCulled = false;
      this.add(mesh);
      return {
        mesh,
        indexCount: geometry.index.count,
        // Staggered start so the strands do not all appear on the same frame.
        offset: (index % 6) * 0.018,
      };
    });
  }

  setProgress(progress) {
    const grow = smoothstep(APPEAR_FROM, APPEAR_TO, progress);
    const recede = smoothstep(RECEDE_FROM, 1.0, progress);
    this.material.opacity = grow * (1 - recede * 0.65) * 0.55;
    this.visible = this.material.opacity > 0.001;
    if (!this.visible) return;

    for (const filament of this.filaments) {
      const local = clamp(smoothstep(APPEAR_FROM + filament.offset, APPEAR_TO + filament.offset, progress));
      const count = Math.max(6, Math.floor(filament.indexCount * local / 6) * 6);
      filament.mesh.geometry.setDrawRange(0, count);
    }
  }
}
