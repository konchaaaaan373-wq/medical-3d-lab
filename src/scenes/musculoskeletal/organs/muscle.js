import * as THREE from 'three';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mineralMaterial, tissueMaterial } from '../../shared/materials.js';
import { lerp } from '../../../utils/math.js';

/**
 * A fusiform skeletal muscle: two tendons and a belly between them.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. The belly is a tube whose calibre is
 * greatest in the middle, with fascicles drawn inside it; the tendons are the
 * pale ends. Contraction is modelled the way it looks — the belly shortens and
 * thickens while the tendons do not — and nothing here is a force or a length
 * in real units.
 */
export function buildMuscle({ color = '#b3454a', tendonColor = '#e6e0d2', fascicles = 5 } = {}) {
  const object = new THREE.Group();
  object.name = 'muscle';

  const span = 1.75;
  const curve = smoothCurve([
    [0, -span, 0],
    [0, -span * 0.4, 0],
    [0, span * 0.4, 0],
    [0, span, 0],
  ]);

  const bellyRadius = (u) => 0.12 + 0.38 * Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
  const belly = new TubeSurface(curve, { radius: bellyRadius, steps: 80, radial: 24 });
  const bellyMesh = new THREE.Mesh(belly.geometry, tissueMaterial({ color, roughness: 0.52, opacity: 0.85 }));
  bellyMesh.name = 'belly';

  const fascicleGroup = new THREE.Group();
  fascicleGroup.name = 'fascicles';
  const fascicleSurfaces = [];
  for (let i = 0; i < fascicles; i++) {
    const angle = (i / fascicles) * Math.PI * 2;
    const offset = 0.16;
    const path = smoothCurve([
      [0, -span, 0],
      [Math.cos(angle) * offset, -span * 0.35, Math.sin(angle) * offset],
      [Math.cos(angle) * offset, span * 0.35, Math.sin(angle) * offset],
      [0, span, 0],
    ]);
    const surface = new TubeSurface(path, { radius: () => 0.035, steps: 40, radial: 8 });
    fascicleSurfaces.push(surface);
    fascicleGroup.add(new THREE.Mesh(surface.geometry, tissueMaterial({ color: '#d9737a', roughness: 0.45 })));
  }

  const tendonGeometry = new THREE.ConeGeometry(0.12, 0.55, 18);
  const tendonMaterial = mineralMaterial({ color: tendonColor, roughness: 0.45 });
  const topTendon = new THREE.Mesh(tendonGeometry, tendonMaterial);
  topTendon.position.set(0, span + 0.2, 0);
  const bottomTendon = new THREE.Mesh(tendonGeometry, tendonMaterial);
  bottomTendon.position.set(0, -span - 0.2, 0);
  bottomTendon.rotation.z = Math.PI;

  object.add(bellyMesh, fascicleGroup, topTendon, bottomTendon);

  return {
    object,
    anchors: {
      belly: new THREE.Vector3(0.95, 0.15, 0.4),
      tendon: new THREE.Vector3(0.55, 1.95, 0.3),
      fascicle: new THREE.Vector3(-0.7, -0.55, 0.45),
    },
    /**
     * 0 = at rest, 1 = fully shortened.
     *
     * Volume is roughly held: the belly gets shorter and correspondingly
     * fatter, which is the visible half of what a contraction is. Whether it
     * moves a joint depends on the load, which this does not model.
     */
    setContraction(value) {
      const v = Math.max(0, Math.min(1, value));
      const shorten = lerp(1, 0.76, v);
      const thicken = lerp(1, 1.34, v);
      object.scale.set(1, shorten, 1);
      bellyMesh.scale.set(thicken, 1, thicken);
      fascicleGroup.scale.set(thicken, 1, thicken);
      topTendon.position.y = span + 0.2;
      bottomTendon.position.y = -span - 0.2;
      // The tendons are not elastic here: they keep their own thickness while
      // the belly changes around them.
      topTendon.scale.set(1 / thicken, 1 / shorten, 1 / thicken);
      bottomTendon.scale.set(1 / thicken, 1 / shorten, 1 / thicken);
    },
    dispose() {
      belly.dispose();
      for (const surface of fascicleSurfaces) surface.dispose();
      tendonGeometry.dispose();
    },
  };
}
