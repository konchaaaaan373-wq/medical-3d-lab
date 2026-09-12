import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { MEDIAL, buildElbowJoint } from '../../organs/elbowJoint.js';
import {
  ELBOW_ANATOMY_META,
  ELBOW_COLOR_MODES,
  ELBOW_NATURAL_COLORS,
  ELBOW_SCENE_COLORS,
  elbowStructureCopy,
} from '../../../../data/elbowAnatomyScene.js';

/**
 * The elbow, as one axis with two different joints on it.
 *
 * The slider takes away **the capsule**, because the capsule is the bag both
 * joints are inside and it is the only thing here that can be taken away
 * without lying. Nothing is moved.
 *
 * The viewpoints are the four sides this joint is examined from, plus two
 * questions: what the axis actually looks like with nothing on it, and what is
 * lying in the hollow at the front. The cut is sagittal, through the trochlea,
 * because the C of the ulna gripping the spool is the one thing about an elbow
 * that a picture from outside cannot show.
 */
export class ElbowAnatomyScene extends OrganAnatomyScene {
  static meta = ELBOW_ANATOMY_META;

  // Anteromedial and a little above: from straight in front the biceps tendon
  // and the artery cover the joint, and from straight medial the capitellum is
  // behind the trochlea.
  static cameraPose = {
    position: new THREE.Vector3(3.6, 2.0, 9.0),
    target: new THREE.Vector3(0.1, 0.22, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** Three units across against six down: a limb joint with a shaft above it
   *  and two below. The widest whole view fills the frame's width at 0.50. */
  static framing = { minHorizontalAspect: 0.52 };

  static colorModes = ELBOW_COLOR_MODES;

  static views = [
    {
      id: 'anteromedial',
      label: 'Anteromedial',
      labelJa: '前内側から',
      position: [3.6, 2.0, 9.0],
      target: [0.1, 0.22, 0],
    },
    {
      id: 'anterior',
      label: 'From in front',
      labelJa: '前面',
      position: [0.2, 1.1, 9.4],
      target: [0.1, 0.22, 0],
    },
    // The inner side: the ligament that is torn by throwing, and behind it the
    // nerve in its groove.
    {
      id: 'medial',
      label: 'The inner side',
      labelJa: '内側から',
      position: [7.1, 0.8, 1.9],
      target: [0.4, -0.05, -0.1],
    },
    // The outer side: a ball, a disc on it, and a ring round the disc.
    {
      id: 'lateral',
      label: 'The outer side',
      labelJa: '外側から',
      position: [-7.1, 0.8, 2.0],
      target: [-0.3, -0.1, 0],
    },
    // From behind: the point of the elbow, the tendon that pulls on it, and the
    // nerve running past it with nothing in the way.
    {
      id: 'posterior',
      label: 'From behind',
      labelJa: '背面',
      position: [1.6, 1.6, -9.2],
      target: [0.3, 0.22, -0.2],
    },
    // The axis, with everything soft put away. A spool, a ball, and a line.
    {
      id: 'hinge',
      label: 'The axis, with nothing on it',
      labelJa: '関節軸だけを見る',
      position: [1.8, 0.9, 4.8],
      target: [0.05, -0.05, 0],
      hideTags: ['capsule', 'ligament', 'tendon', 'muscle', 'nerve', 'vessel'],
    },
    // The hollow at the front, and the three things lying in it in one order.
    {
      id: 'cubital-fossa',
      label: 'The hollow at the front',
      labelJa: '肘窩の中身',
      position: [1.0, 1.6, 4.6],
      target: [0.15, 0.3, 0.45],
      hideTags: ['capsule'],
    },
    // A real cut through the trochlea: the C of the notch, wrapped past half a
    // circle round the spool, which is why the ulna stays on without help.
    {
      id: 'sagittal',
      label: 'Cut through the trochlea',
      labelJa: '滑車の高さで矢状断（切断）',
      position: [-4.4, 0.5, 0.9],
      target: [MEDIAL * 0.5, 0.02, -0.05],
      section: { normal: [MEDIAL, 0, 0], constant: -MEDIAL * 0.5 },
      // The nerve, the artery and the muscle origins are all outside the joint
      // and all in front of the cut face from here; with them in the way the
      // cut is a picture of a nerve.
      hideTags: ['nerve', 'vessel', 'muscle'],
    },
  ];

  buildOrgan() {
    const elbow = buildElbowJoint({ colors: ELBOW_SCENE_COLORS });

    const copy = elbowStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`elbow-anatomy: no copy for "${id}"`);
      const meshes = elbow.meshesFor(id);
      if (!meshes.length) throw new Error(`elbow-anatomy: "${id}" names no mesh`);
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
          regions: ELBOW_SCENE_COLORS[entry.colorKey],
          natural: ELBOW_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes,
        ...extra,
      });
    };

    declare('humerus-shaft');
    declare('trochlea');
    declare('capitellum');
    declare('medial-epicondyle');
    declare('lateral-epicondyle');

    declare('olecranon');
    declare('ulna-shaft');
    declare('radial-head');
    declare('radius-shaft');

    // Thin and over the bone it belongs to, so it is part-transparent at rest;
    // otherwise it reads as a coat of paint and hides the surface under it.
    declare('articular-cartilage', { baseOpacity: 0.58, preferredView: 'hinge' });
    // The bag the slider takes away. It is the only thing here that can be
    // removed without moving anything.
    declare('joint-capsule', { baseOpacity: 0.18, doubleSided: true, ghostAt: 0.28, ghostOpacity: 0.04 });

    declare('ulnar-collateral-ligament', { preferredView: 'medial' });
    declare('radial-collateral-ligament', { preferredView: 'lateral' });
    declare('annular-ligament', { preferredView: 'lateral' });

    declare('biceps-tendon', { preferredView: 'cubital-fossa' });
    declare('triceps-tendon', { preferredView: 'posterior' });
    declare('common-flexor-origin', { baseOpacity: 0.8, preferredView: 'medial' });
    declare('common-extensor-origin', { baseOpacity: 0.8, preferredView: 'lateral' });

    declare('ulnar-nerve', { preferredView: 'posterior' });
    declare('median-nerve', { preferredView: 'cubital-fossa' });
    declare('brachial-artery', { preferredView: 'cubital-fossa' });

    return { object: elbow.object, structures, dispose: () => elbow.dispose() };
  }
}
