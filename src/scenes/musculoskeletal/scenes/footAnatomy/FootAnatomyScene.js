import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildFoot } from '../../organs/foot.js';
import {
  FOOT_ANATOMY_META,
  FOOT_COLOR_MODES,
  FOOT_NATURAL_COLORS,
  FOOT_SCENE_COLORS,
  footStructureCopy,
} from '../../../../data/footAnatomyScene.js';

/**
 * A foot from the inside, because that is the side the arch is on.
 *
 * The scene opens on the medial view: from the outside of a foot the arch is
 * not there to see, and from underneath it is a footprint. **The arch is only
 * visible from the big-toe side**, and the band slung under it is only a
 * bowstring when the bow is in the same frame.
 *
 * The layer slider fades the **bones**, which is what the band and the
 * ligaments are behind. Nothing is moved out from under anything.
 */
export class FootAnatomyScene extends OrganAnatomyScene {
  static meta = FOOT_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(31.50, 9.10, 10.36),
    target: new THREE.Vector3(0, 2.80, 4.48),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** Twenty-eight units of foot against fourteen of height; from the side the
   *  long axis lies across the frame and fills its width at 0.85. The distance
   *  is set by the **height**, which is what crops first. */
  static framing = { minHorizontalAspect: 0.9 };

  static colorModes = FOOT_COLOR_MODES;

  static views = [
    // The medial view. From here the arch is an arch and the band under it is
    // a bowstring.
    {
      id: 'whole',
      label: 'From the inside',
      labelJa: '内側から',
      position: [31.50, 9.10, 10.36],
      target: [0.00, 2.80, 4.48],
    },
    {
      id: 'from-outside',
      label: 'From the outside',
      labelJa: '外側から',
      position: [-31.50, 9.10, 10.36],
      target: [0.00, 2.80, 4.48],
    },
    // From above and inside rather than straight down: a foot is three times
    // longer than it is wide, and straight down puts its long axis across the
    // short side of the frame.
    {
      id: 'from-above',
      label: 'From above',
      labelJa: '上から',
      position: [27.30, 21.00, 8.40],
      target: [0.00, 2.10, 4.48],
    },
    // The arch, with the bones out of the way: the band from the heel to the
    // heads, and the short one at the top of the bow.
    {
      id: 'the-arch',
      label: 'What holds the arch',
      labelJa: 'アーチを支えるもの',
      position: [15.40, 4.90, 6.30],
      target: [0.35, 1.68, 2.80],
      hideTags: ['leg', 'joint'],
    },
    // The socket, close: the two malleoli gripping the talus, one lower than
    // the other, and the two joints one above the other.
    {
      id: 'the-ankle',
      label: 'The socket and the joint under it',
      labelJa: '足関節と距骨下関節',
      position: [-2.10, 6.65, 14.00],
      target: [0.00, 3.08, 0.98],
      hideTags: ['rays', 'arch'],
    },
    {
      id: 'ligaments',
      label: 'One sheet inside, three bands outside',
      labelJa: '内側は1枚、外側は3本',
      position: [-9.80, 5.18, 9.80],
      target: [0.00, 2.80, 1.12],
      hideTags: ['rays'],
    },
  ];

  buildOrgan() {
    const foot = buildFoot({ colors: FOOT_SCENE_COLORS });

    const copy = footStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`foot-anatomy: no copy for "${id}"`);
      const meshes = foot.meshesFor(id);
      if (!meshes.length) throw new Error(`foot-anatomy: "${id}" names no mesh`);
      structures.push({
        id,
        name: entry.name,
        nameJa: entry.nameJa,
        hierarchy: entry.hierarchy,
        hierarchyJa: entry.hierarchyJa,
        description: entry.description,
        descriptionJa: entry.descriptionJa,
        note: entry.note ?? null,
        noteJa: entry.noteJa ?? null,
        tags: entry.tags,
        colors: {
          regions: FOOT_SCENE_COLORS[entry.colorKey],
          natural: FOOT_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes,
        ...extra,
      });
    };

    declare('tibia', { ghostAt: 0.4, ghostOpacity: 0.1 });
    declare('fibula', { ghostAt: 0.4, ghostOpacity: 0.1 });

    for (const id of ['talus', 'calcaneus', 'navicular', 'cuboid', 'cuneiforms']) {
      declare(id, { ghostAt: 0.48, ghostOpacity: 0.12, preferredView: 'from-outside' });
    }
    for (const id of ['metatarsals', 'proximal-phalanges', 'middle-phalanges', 'distal-phalanges']) {
      declare(id, { ghostAt: 0.44, ghostOpacity: 0.1 });
    }

    // The band and the sling do not fade: they are what the slider is clearing
    // the way to, and they are the scene's answer.
    declare('plantar-fascia', { doubleSided: true, preferredView: 'the-arch' });
    declare('spring-ligament', { preferredView: 'the-arch' });

    declare('achilles-tendon');
    declare('tibialis-posterior-tendon', { preferredView: 'the-arch' });
    declare('peroneal-tendons', { preferredView: 'ligaments' });
    declare('deltoid-ligament', { doubleSided: true, preferredView: 'ligaments' });
    declare('lateral-ligaments', { preferredView: 'ligaments' });

    declare('ankle-joint', { baseOpacity: 0.5, doubleSided: true, preferredView: 'the-ankle' });
    declare('subtalar-joint', { baseOpacity: 0.5, doubleSided: true, preferredView: 'the-ankle' });

    return { object: foot.object, structures, dispose: () => foot.dispose() };
  }
}
