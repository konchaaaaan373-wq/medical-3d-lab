import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildEar } from '../../organs/ear.js';
import {
  EAR_ANATOMY_META,
  EAR_COLOR_MODES,
  EAR_NATURAL_COLORS,
  EAR_SCENE_COLORS,
  earStructureCopy,
} from '../../../../data/earAnatomyScene.js';

/**
 * The ear, walked from the outside in.
 *
 * Three viewpoints, one for each part, in the order sound takes: **outer**,
 * **middle**, **inner**. Each frames the part it is named for and puts the
 * parts lateral to it away by tag — which is the honest way to look past an
 * auricle, since the alternative is moving a stapes somewhere it can be seen.
 * The ossicles and the labyrinth are small and stay small; what changes is how
 * close the camera is.
 */
export class EarAnatomyScene extends OrganAnatomyScene {
  static meta = EAR_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(-2.4, 2.0, 6.4),
    target: new THREE.Vector3(-0.1, -0.05, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** An auricle at one end and a nerve at the other; the widest whole view
   *  fills the frame's width at an aspect of 1.34. */
  static framing = { minHorizontalAspect: 1.4 };

  static colorModes = EAR_COLOR_MODES;

  static views = [
    {
      id: 'whole',
      label: 'The whole ear',
      labelJa: '耳の全体',
      position: [-2.4, 2.0, 6.4],
      target: [-0.1, -0.05, 0],
    },
    // The three steps of the chain. Each one puts what is lateral to it away,
    // because that is what is in front of it — and comes closer, because what
    // is medial is smaller.
    {
      id: 'outer-ear',
      label: 'Outer ear',
      labelJa: '外耳',
      position: [-4.2, 1.4, 4.6],
      target: [-1.5, 0.05, 0],
    },
    {
      id: 'middle-ear',
      label: 'Middle ear',
      labelJa: '中耳',
      position: [-1.2, 1.3, 2.9],
      target: [0.3, 0.05, -0.02],
      hideTags: ['outer'],
    },
    {
      id: 'inner-ear',
      label: 'Inner ear',
      labelJa: '内耳',
      position: [0.4, 1.3, 2.6],
      target: [1.2, -0.05, -0.2],
      hideTags: ['outer', 'middle'],
    },
    // The three bones on their own, close: the chain is the middle ear's whole
    // argument and it is four millimetres long in life.
    {
      id: 'ossicles',
      label: 'The three bones',
      labelJa: '耳小骨の連鎖',
      position: [-0.7, 1.0, 1.9],
      target: [0.3, 0.24, -0.05],
      hideTags: ['outer'],
    },
    {
      id: 'from-behind',
      label: 'From behind',
      labelJa: '背面',
      position: [-1.0, 1.6, -5.6],
      target: [0.2, -0.05, -0.1],
    },
  ];

  buildOrgan() {
    const ear = buildEar({ colors: EAR_SCENE_COLORS });

    const copy = earStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`ear-anatomy: no copy for "${id}"`);
      const mesh = ear.mesh(id);
      if (!mesh && !extra.meshes) throw new Error(`ear-anatomy: "${id}" names no mesh`);
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
          regions: EAR_SCENE_COLORS[entry.colorKey],
          natural: EAR_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: mesh ? [mesh] : [],
        ...extra,
      });
    };

    // The outer ear is what everything else is behind, so it is what fades.
    declare('auricle', { ghostAt: 0.24, ghostOpacity: 0.08 });
    // Part-transparent at rest so the drum at the end of it can be seen, and
    // so not one of the layers the slider steps back: it never started solid.
    declare('external-auditory-canal', { baseOpacity: 0.7, doubleSided: true });

    // The drum is a boundary, and a reader has to see through it to follow the
    // chain — so it is part-transparent at rest rather than fading on the way.
    declare('tympanic-membrane', { baseOpacity: 0.5, doubleSided: true });
    declare('middle-ear-cavity', { baseOpacity: 0.16, doubleSided: true });
    for (const id of ['malleus', 'incus', 'stapes']) {
      declare(id, { preferredView: 'ossicles' });
    }
    declare('eustachian-tube', { preferredView: 'middle-ear' });

    declare('cochlea', { preferredView: 'inner-ear' });
    declare('vestibule', { preferredView: 'inner-ear' });
    // One structure, three meshes: three loops in three planes, one organ.
    declare('semicircular-canals', { meshes: ear.canalMeshes, preferredView: 'inner-ear' });
    declare('vestibulocochlear-nerve', { preferredView: 'inner-ear' });

    return { object: ear.object, structures, dispose: () => ear.dispose() };
  }
}
