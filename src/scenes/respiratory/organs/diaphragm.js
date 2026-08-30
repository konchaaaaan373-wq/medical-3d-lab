import * as THREE from 'three';
import { tissueMaterial } from '../../shared/materials.js';

/**
 * The diaphragm: the muscle that actually does the breathing.
 *
 * Two domes rising into the chest with the central tendon between them, drawn
 * as a single sheet. It is here because a scene about lung volumes cannot be
 * honest without it — the lungs do not inflate themselves, and the most
 * important mechanical consequence of hyperinflation is what a raised resting
 * volume does to *this*.
 *
 * Two separate things move it, and keeping them apart is the whole point of
 * the interface below:
 *
 * - **Descent** is the breath. The dome moves down and the lung above it fills.
 * - **Flattening** is the resting volume. A lung that never fully empties
 *   holds the diaphragm down and pushes it flat, and a flat diaphragm is a bad
 *   muscle: its fibres are shorter, it pulls sideways on the lower ribs
 *   instead of downwards, and it generates less pressure for the same effort.
 *
 * Not represented: the crura and their attachments, the hiatuses, the ribs and
 * the intercostal muscles, and any force or pressure. The shape here says
 * where the floor of the chest is and how curved it is; it is not a
 * measurement of either.
 */

/**
 * @param {{ color?: string, opacity?: number, radius?: number, detail?: number }} [options]
 */
export function buildDiaphragm({ color = '#c2707a', opacity = 0.92, radius = 2.1, detail = 46 } = {}) {
  const object = new THREE.Group();
  object.name = 'diaphragm';

  // A disc, displaced in y per vertex: a sheet whose curvature can be rewritten
  // every frame. A pair of spheres would have been quicker to build and could
  // not have been flattened, which is the one thing this has to do.
  const geometry = new THREE.CircleGeometry(radius, detail, 1, Math.PI * 2);
  geometry.rotateX(-Math.PI / 2);
  const base = geometry.attributes.position.array.slice();
  const material = tissueMaterial({ color, roughness: 0.55, opacity, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'diaphragm-sheet';
  object.add(mesh);

  /** Where the two domes sit, left and right of the midline. */
  const DOME_OFFSET = 1.1;
  /** How far above the rim the domes reach when fully curved, in scene units. */
  const DOME_HEIGHT = 1.15;

  const position = geometry.attributes.position;

  /**
   * @param {number} curvature 1 = fully domed, 0 = flat
   */
  function shape(curvature) {
    const c = Math.max(0, Math.min(1, curvature));
    for (let i = 0; i < position.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      // Two Gaussians, one per hemidiaphragm, so the sheet has the twin-dome
      // silhouette a chest radiograph shows rather than a single hill.
      const right = dome(x + DOME_OFFSET, z);
      const left = dome(x - DOME_OFFSET, z);
      // The right dome sits higher than the left — the liver is under it.
      position.setY(i, DOME_HEIGHT * c * Math.max(right * 1.08, left));
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  const dome = (x, z) => Math.exp(-(x * x) / 1.9 - (z * z) / 2.6);

  shape(1);

  return {
    object,
    anchors: {
      diaphragm: new THREE.Vector3(0, -0.55, 2.1),
      dome: new THREE.Vector3(1.5, 0.5, 1.4),
    },
    /**
     * Where the floor of the chest is and how curved it is.
     *
     * Placed by the **top of the dome**, not by the rim, because what has to
     * line up is where the lung sits on the muscle. Position it by the rim
     * instead and flattening the diaphragm silently drops the lung's floor by
     * the height of the dome, which is a change in lung volume nobody asked
     * for.
     *
     * @param {{ apexY: number, curvature: number }} state
     *   `curvature` is 1 for a fully domed muscle and 0 for a flat one.
     */
    set({ apexY, curvature }) {
      const c = Math.max(0, Math.min(1, curvature));
      object.position.y = apexY - DOME_HEIGHT * c * 1.08;
      shape(c);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
