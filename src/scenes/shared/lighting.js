import * as THREE from 'three';

/**
 * The lighting rig every organ scene uses.
 *
 * The viewer already supplies a neutral studio environment map; this adds the
 * shaping on top of it — one key, one cool rim, one low fill — so that a lump
 * of tissue reads as a volume rather than a flat silhouette against the dark
 * backdrop.
 *
 * Purely presentational. If an organ is hard to see, this is the file to
 * change; the anatomy is not.
 *
 * @param {{ key?: number, rim?: number, fill?: number, distance?: number }} [options]
 */
export function createStudioLights({ key = 34, rim = 20, fill = 0.55, distance = 42 } = {}) {
  const group = new THREE.Group();
  group.name = 'lights';

  group.add(new THREE.HemisphereLight(0x9fbce8, 0x0a1020, fill));

  const keyLight = new THREE.PointLight(0xffe9dd, key, distance, 2);
  keyLight.position.set(-5.5, 6.5, 8.5);
  keyLight.name = 'key';

  const rimLight = new THREE.PointLight(0x63d6ff, rim, distance, 2);
  rimLight.position.set(6.5, -2.5, -7);
  rimLight.name = 'rim';

  group.add(keyLight, rimLight);
  return group;
}
