import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildHipJoint } from '../../organs/hipJoint.js';
import {
  HIP_ANATOMY_META,
  HIP_COLOR_MODES,
  HIP_NATURAL_COLORS,
  HIP_SCENE_COLORS,
  hipStructureCopy,
} from '../../../../data/hipAnatomyScene.js';

/**
 * The hip, and the one fact the rest of it follows from.
 *
 * The socket grips past the widest part of the head. Say it in words and it is
 * a sentence; the only way to *show* it is to cut the joint in half, so this
 * scene has a coronal section, and the section is where the claim lives. The
 * rest of the viewpoints are the usual ones — nothing here is moved to be seen,
 * the slider fades bone, and the socket is reached by putting the femur away
 * rather than by pulling it out.
 */
export class HipAnatomyScene extends OrganAnatomyScene {
  static meta = HIP_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(-2.4, 1.6, 6.8),
    target: new THREE.Vector3(0.25, -0.15, -0.1),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** Pelvis above and femur below; the widest whole view fills the frame's
   *  width at an aspect of 0.66. */
  static framing = { minHorizontalAspect: 0.7 };

  static colorModes = HIP_COLOR_MODES;

  static views = [
    {
      id: 'anterior-oblique',
      label: 'Anterior oblique',
      labelJa: '前斜位',
      position: [-2.4, 1.6, 6.8],
      target: [0.25, -0.15, -0.1],
    },
    { id: 'anterior', label: 'Anterior', labelJa: '前面', position: [0, 0.6, 7.6], target: [0.1, 0.15, 0] },
    {
      id: 'posterior',
      label: 'From behind',
      labelJa: '背面',
      position: [0.4, 0.9, -7.4],
      target: [0.1, 0.15, 0],
    },
    // The claim of the whole scene, and the only view that can make it: cut the
    // joint in half and the rim is past the middle of the ball.
    {
      id: 'coronal-section',
      label: 'Cut through the joint',
      labelJa: '関節の前額断（切断）',
      position: [-0.6, 0.9, 5.4],
      target: [0.05, 0.2, -0.1],
      section: { normal: [0, 0, -1], constant: 0.06 },
    },
    // The socket on its own. The femur is hidden, not pulled out of it.
    {
      id: 'socket',
      label: 'The socket, with the femur put away',
      labelJa: '臼蓋だけを見る（大腿骨を非表示）',
      position: [-5.4, 1.0, 3.4],
      target: [0.3, 0.35, 0],
      hideTags: ['femur', 'cartilage'],
    },
    {
      id: 'ligaments-only',
      label: 'Ligaments and tendons only',
      labelJa: '靱帯と腱だけを見る',
      position: [-2.2, 1.2, 5.6],
      target: [0, 0.2, 0],
      hideTags: ['bone', 'cartilage', 'socket'],
    },
  ];

  buildOrgan() {
    const hip = buildHipJoint({ colors: HIP_SCENE_COLORS });

    const copy = hipStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`hip-anatomy: no copy for "${id}"`);
      const mesh = hip.mesh(id);
      if (!mesh && !extra.meshes) throw new Error(`hip-anatomy: "${id}" names no mesh`);
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
          regions: HIP_SCENE_COLORS[entry.colorKey],
          natural: HIP_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: mesh ? [mesh] : [],
        ...extra,
      });
    };

    // Double-sided throughout: the section cuts these solids open, and the cup
    // is a shell whose inside is the point of it.
    declare('hip-bone', { ghostAt: 0.3, ghostOpacity: 0.1, doubleSided: true });
    for (const id of ['femoral-head', 'femoral-neck', 'greater-trochanter', 'lesser-trochanter', 'femoral-shaft']) {
      declare(id, { ghostAt: 0.26, ghostOpacity: 0.1, doubleSided: true });
    }
    declare('acetabulum', { ghostAt: 0.55, ghostOpacity: 0.16, preferredView: 'coronal-section', doubleSided: true });
    declare('acetabular-labrum', { preferredView: 'coronal-section' });
    declare('articular-cartilage', {
      meshes: hip.cartilageMeshes,
      tags: ['socket', 'cartilage'],
      ghostAt: 0.5,
      ghostOpacity: 0.12,
      doubleSided: true,
    });

    // Inside the joint, so it is only ever seen in section or with the head
    // faded — which is exactly what it is like.
    declare('ligament-of-the-head', { preferredView: 'coronal-section' });
    declare('iliofemoral-ligament', { preferredView: 'anterior' });
    declare('pubofemoral-ligament', { preferredView: 'anterior' });
    declare('ischiofemoral-ligament', { preferredView: 'posterior' });
    declare('gluteus-medius-tendon', { preferredView: 'posterior' });
    declare('iliopsoas-tendon', { preferredView: 'anterior' });

    return { object: hip.object, structures, dispose: () => hip.dispose() };
  }
}
