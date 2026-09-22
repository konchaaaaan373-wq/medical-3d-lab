import { readFileSync } from 'node:fs';
import * as THREE from 'three';

/**
 * A fixture atlas with the real file's labels, sides and categories.
 *
 * The geometry is boxes — nothing here is about shape — but the metadata is
 * read out of the distributed GLB, so a scene's filtering runs against the real
 * distribution of categories rather than a convenient subset. Loading the
 * actual meshes would be four megabytes and several seconds per test file.
 *
 * Shared rather than copied: two test files now build a scene from it, and a
 * second copy would drift from this one in exactly the way that makes one of
 * them stop testing what it says it tests.
 */
export function fixtureAtlas() {
  const bytes = readFileSync(new URL('../../public/assets/brain/brain.glb', import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const atlas = new THREE.Group();
  atlas.name = 'fixture-atlas';
  for (const node of gltf.nodes) {
    const extras = node.extras;
    if (extras?.bx_id == null) continue;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial());
    mesh.name = `${extras.bx_label}.${extras.bx_side}`;
    // Deterministic, distinct, and spread far enough that two structures never
    // land on the same centroid.
    const id = Number(extras.bx_id);
    mesh.position.set(
      (extras.bx_side === 'left' ? 1 : extras.bx_side === 'right' ? -1 : 0) * 0.8,
      ((id % 17) - 8) * 0.12,
      ((id % 23) - 11) * 0.1
    );
    mesh.userData = { ...extras };
    atlas.add(mesh);
  }
  return atlas;
}
