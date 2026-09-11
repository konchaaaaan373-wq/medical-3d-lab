import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildShoulderJoint } from '../../organs/shoulderJoint.js';
import {
  SHOULDER_ANATOMY_META,
  SHOULDER_COLOR_MODES,
  SHOULDER_NATURAL_COLORS,
  SHOULDER_SCENE_COLORS,
  shoulderStructureCopy,
} from '../../../../data/shoulderAnatomyScene.js';

/**
 * The shoulder, as the thing that holds a ball on a saucer.
 *
 * The knee scene fades bone to reach ligaments. This one fades bone to reach
 * the **cuff**, because in a shoulder the tendons are the joint: the socket
 * takes about a third of the head and the capsule is loose, so the four tendons
 * wrapped round the head are what keeps it there. Two viewpoints exist for the
 * two questions that follow from that — "what does the socket actually look
 * like" (the humerus hidden by tag, not moved aside) and "how much room is
 * there under the arch" (from above and in front, where the gap is).
 */
export class ShoulderAnatomyScene extends OrganAnatomyScene {
  static meta = SHOULDER_ANATOMY_META;

  // Anterolateral and a little above: from straight in front the head hides the
  // socket behind it, and from straight lateral the scapula is edge-on.
  static cameraPose = {
    position: new THREE.Vector3(-3.6, 2.2, 6.6),
    target: new THREE.Vector3(0.1, 0.1, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** Scapula, clavicle and humerus across the frame; the widest whole view
   *  fills the frame's width at an aspect of 0.74. */
  static framing = { minHorizontalAspect: 0.78 };

  static colorModes = SHOULDER_COLOR_MODES;

  static views = [
    {
      id: 'anterolateral',
      label: 'Anterolateral',
      labelJa: '前外側から',
      position: [-3.6, 2.2, 6.6],
      target: [0.1, 0.1, 0],
    },
    { id: 'anterior', label: 'Anterior', labelJa: '前面', position: [0.2, 0.6, 7.4], target: [0.2, 0.05, 0] },
    {
      id: 'posterior',
      label: 'From behind',
      labelJa: '背面',
      position: [0.4, 0.8, -7.2],
      target: [0.3, 0.05, 0],
    },
    // The gap the cuff passes through, seen from where it is a gap.
    {
      id: 'arch',
      label: 'Under the arch',
      labelJa: 'アーチの下（肩峰下）',
      position: [-2.2, 3.4, 4.2],
      target: [0.05, 0.55, 0.05],
    },
    // The socket on its own. The humerus is hidden, not pushed aside.
    {
      id: 'socket',
      label: 'The socket, with the humerus put away',
      labelJa: '関節窩だけを見る（上腕骨を非表示）',
      position: [-5.6, 0.7, 2.6],
      target: [0.28, 0.12, -0.02],
      // The cartilage goes with it: one of its two meshes has the shape of the
      // head, so hiding the humerus without it leaves a ball over the socket.
      hideTags: ['humerus', 'cartilage'],
    },
    // Every bone away: the sleeve as the sleeve it is.
    {
      id: 'cuff-only',
      label: 'The cuff on its own',
      labelJa: '腱板だけを見る',
      position: [-2.8, 1.6, 5.2],
      target: [0.1, 0.25, 0],
      // The cartilage and the socket go too: the glaze has the shape of the
      // head, so leaving it behind leaves the head behind.
      hideTags: ['bone', 'cartilage', 'socket'],
    },
  ];

  buildOrgan() {
    const shoulder = buildShoulderJoint({ colors: SHOULDER_SCENE_COLORS });

    const copy = shoulderStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`shoulder-anatomy: no copy for "${id}"`);
      const mesh = shoulder.mesh(id);
      if (!mesh && !extra.meshes) throw new Error(`shoulder-anatomy: "${id}" names no mesh`);
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
          regions: SHOULDER_SCENE_COLORS[entry.colorKey],
          natural: SHOULDER_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: mesh ? [mesh] : [],
        ...extra,
      });
    };

    // Double-sided throughout: the bones fade to a ghost, and a ghost of a
    // single-sided shell is a shell with its back missing.
    for (const id of ['scapula', 'acromion', 'coracoid-process', 'clavicle']) {
      declare(id, { ghostAt: 0.3, ghostOpacity: 0.1, doubleSided: true });
    }
    // The humerus fades first and furthest: it is what the cuff is behind.
    for (const id of ['humeral-head', 'humeral-shaft', 'greater-tubercle', 'lesser-tubercle']) {
      declare(id, { ghostAt: 0.22, ghostOpacity: 0.08, doubleSided: true });
    }

    declare('glenoid', { ghostAt: 0.6, ghostOpacity: 0.16, preferredView: 'socket', doubleSided: true });
    declare('glenoid-labrum', { preferredView: 'socket' });
    declare('articular-cartilage', {
      meshes: shoulder.cartilageMeshes,
      tags: ['socket', 'cartilage'],
      ghostAt: 0.5,
      ghostOpacity: 0.12,
      doubleSided: true,
    });

    declare('supraspinatus-tendon', { preferredView: 'arch' });
    declare('infraspinatus-tendon', { preferredView: 'posterior' });
    declare('teres-minor-tendon', { preferredView: 'posterior' });
    declare('subscapularis-tendon', { preferredView: 'anterior' });
    declare('long-head-of-biceps-tendon', { preferredView: 'anterior' });

    declare('coracoacromial-ligament', { preferredView: 'arch' });
    declare('acromioclavicular-ligament', { preferredView: 'arch' });
    declare('coracoclavicular-ligament', { preferredView: 'anterior' });
    declare('inferior-glenohumeral-ligament', { preferredView: 'anterior' });

    return { object: shoulder.object, structures, dispose: () => shoulder.dispose() };
  }
}
