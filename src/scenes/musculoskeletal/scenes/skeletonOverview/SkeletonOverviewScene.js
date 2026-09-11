import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildSkeleton } from '../../organs/skeleton.js';
import {
  SKELETON_ANATOMY_META,
  SKELETON_COLOR_MODES,
  SKELETON_NATURAL_COLORS,
  SKELETON_SCENE_COLORS,
  skeletonStructureCopy,
} from '../../../../data/skeletonOverviewScene.js';

/**
 * A whole skeleton, and the two ways a limb is attached to it.
 *
 * The layer slider fades the **limbs**, which leaves the column — and the two
 * girdles standing on it, joined to it in completely different ways. That
 * contrast is the scene: a shoulder girdle touching the trunk at one small
 * joint, a pelvic girdle locked into the spine itself.
 *
 * It is also the scene's job to send a reader somewhere else. Every structure's
 * note names the scene that actually models that region, because **no bone here
 * is a model of that bone** — this is the map, not the territory.
 */
export class SkeletonOverviewScene extends OrganAnatomyScene {
  static meta = SKELETON_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(10.1, 18.6, 48.5),
    target: new THREE.Vector3(0, 12.0, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** A standing figure, forty-three world units tall against ten across. The
   *  distance is set by the **height** — it is what crops first by a long way —
   *  and the width left over is 0.17. */
  static framing = { minHorizontalAspect: 0.18 };

  static colorModes = SKELETON_COLOR_MODES;

  static views = [
    {
      id: 'whole',
      label: 'From the front',
      labelJa: '正面から',
      position: [10.1, 18.6, 48.5],
      target: [0, 12.0, 0],
    },
    {
      id: 'from-the-side',
      label: 'From the side',
      labelJa: '側面から',
      position: [49.1, 18.7, 7.9],
      target: [0, 12.0, 0],
    },
    {
      id: 'from-behind',
      label: 'From behind',
      labelJa: '背面から',
      position: [-10.1, 18.6, -48.5],
      target: [0, 12.0, 0],
    },
    // The column on its own: what is left when the limbs are away, which is
    // one continuous run from the skull to the sacrum.
    {
      id: 'the-column',
      label: 'The column on its own',
      labelJa: '体軸骨格だけ',
      position: [13.1, 18.6, 50.1],
      target: [0, 12.9, 0],
      hideTags: ['appendicular'],
    },
    // The one joint that attaches an arm, and the bone behind it that touches
    // nothing.
    {
      id: 'shoulder-join',
      label: 'Where an arm is attached',
      labelJa: '腕が付いている場所',
      position: [3.64, 21.8, 10.36],
      target: [0, 18.6, 0.28],
      hideTags: ['leg', 'pelvis-girdle'],
    },
    // And the one that is not a joint so much as a lock.
    {
      id: 'pelvic-join',
      label: 'Where a leg is attached',
      labelJa: '脚が付いている場所',
      position: [4.2, 15.7, 10.36],
      target: [0, 13.2, -0.28],
      hideTags: ['arm', 'shoulder'],
    },
  ];

  buildOrgan() {
    const skeleton = buildSkeleton({ colors: SKELETON_SCENE_COLORS });

    const copy = skeletonStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`skeleton-overview: no copy for "${id}"`);
      const meshes = skeleton.meshesFor(id);
      if (!meshes.length) throw new Error(`skeleton-overview: "${id}" names no mesh`);
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
          regions: SKELETON_SCENE_COLORS[entry.colorKey],
          natural: SKELETON_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes,
        ...extra,
      });
    };

    // The column stays; the limbs are what the slider takes away.
    for (const id of [
      'skull',
      'mandible',
      'cervical-spine',
      'thoracic-spine',
      'lumbar-spine',
      'sacrum-and-coccyx',
      'ribs',
      'sternum',
    ]) {
      declare(id);
    }

    // The two girdles fade last and least: they are the join the scene is about.
    declare('clavicle', { ghostAt: 0.66, ghostOpacity: 0.16, preferredView: 'shoulder-join' });
    declare('scapula', { ghostAt: 0.66, ghostOpacity: 0.16, preferredView: 'shoulder-join' });
    declare('pelvis', { ghostAt: 0.66, ghostOpacity: 0.16, preferredView: 'pelvic-join' });

    for (const id of ['humerus', 'radius-and-ulna', 'hand-bones']) {
      declare(id, { ghostAt: 0.4, ghostOpacity: 0.08 });
    }
    for (const id of ['femur', 'patella', 'tibia-and-fibula', 'foot-bones']) {
      declare(id, { ghostAt: 0.4, ghostOpacity: 0.08 });
    }

    return { object: skeleton.object, structures, dispose: () => skeleton.dispose() };
  }
}
