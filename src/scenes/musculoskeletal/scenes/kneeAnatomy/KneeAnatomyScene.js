import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildKneeJoint } from '../../organs/kneeJoint.js';
import {
  KNEE_ANATOMY_META,
  KNEE_COLOR_MODES,
  KNEE_NATURAL_COLORS,
  KNEE_SCENE_COLORS,
  kneeStructureCopy,
} from '../../../../data/kneeAnatomyScene.js';

/**
 * The knee, as a set of relations you can point at.
 *
 * The first joint in the catalogue, and it is deliberately not built like an
 * organ scene. An organ scene answers "what is this part of it"; a joint scene
 * answers "what holds these two bones together, and what is between them". So
 * the slider does not open a lump — it **fades the bones**, because everything
 * a reader is here for is behind one.
 *
 * Nothing is moved to be seen (`docs/architecture-rules.md`, and the rule this
 * project applies to every organ): the cruciates stay inside the notch where
 * they belong and are reached by making the condyles transparent, by the
 * ligaments-only view, and by a coronal section that cuts the patella away
 * rather than pushing it aside.
 */
export class KneeAnatomyScene extends OrganAnatomyScene {
  static meta = KNEE_ANATOMY_META;

  // Slightly lateral and a little above the joint line: straight from the front
  // the two condyles overlap into one mass, and from an angle they read as two.
  static cameraPose = {
    position: new THREE.Vector3(-2.6, 1.6, 7.4),
    target: new THREE.Vector3(0, -0.05, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /**
   * A tall subject: two shafts and the joint between them. The widest whole
   * view fills the frame's width at an aspect of 0.42.
   */
  static framing = { minHorizontalAspect: 0.45 };

  static colorModes = KNEE_COLOR_MODES;

  static views = [
    {
      id: 'anterior-oblique',
      label: 'Anterior oblique',
      labelJa: '前斜位',
      position: [-2.6, 1.6, 7.4],
      target: [0, -0.05, 0],
    },
    { id: 'anterior', label: 'Anterior', labelJa: '前面', position: [0, 0.5, 7.8], target: [0, -0.05, 0] },
    // The side the MCL is on, and the side the medial meniscus is tied to it on.
    {
      id: 'medial',
      label: 'From the medial side',
      labelJa: '内側から',
      position: [7.6, 0.5, 0.6],
      target: [0, -0.05, 0],
    },
    // The side the fibula and the LCL are on.
    {
      id: 'lateral',
      label: 'From the lateral side',
      labelJa: '外側から',
      position: [-7.6, 0.5, 0.6],
      target: [0, -0.05, 0],
    },
    {
      id: 'posterior',
      label: 'From behind',
      labelJa: '背面',
      position: [0.6, 0.7, -7.6],
      target: [0, -0.05, 0],
    },
    // The bones put away entirely, so the four ligaments can be seen as the
    // arrangement they are: two crossing in the middle, one down each side.
    {
      id: 'ligaments-only',
      label: 'Ligaments and menisci only',
      labelJa: '靱帯と半月板だけを見る',
      position: [-2.2, 1.1, 5.2],
      target: [0, -0.05, -0.05],
      hideTags: ['bone', 'tendon', 'cartilage'],
    },
    // Everything above the joint line cut away, looking straight down at the
    // tibia: the two menisci on the two plateaus, with the cruciates rising
    // from the eminence between them. The femur is not moved aside — it is cut.
    {
      id: 'plateau-from-above',
      label: 'The plateau from above',
      labelJa: '脛骨高原を上から（切断）',
      position: [0, 4.4, 0.9],
      target: [0, -0.2, -0.02],
      section: { normal: [0, -1, 0], constant: 0.02 },
    },
  ];

  buildOrgan() {
    const knee = buildKneeJoint({ colors: KNEE_SCENE_COLORS });

    const copy = kneeStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`knee-anatomy: no copy for "${id}"`);
      const mesh = knee.mesh(id);
      if (!mesh && !extra.meshes) throw new Error(`knee-anatomy: "${id}" names no mesh`);
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
          regions: KNEE_SCENE_COLORS[entry.colorKey],
          natural: KNEE_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: mesh ? [mesh] : [],
        ...extra,
      });
    };

    // The bones are what everything else is behind, so they are what fades.
    // Drawn double-sided throughout: the coronal section cuts these solids
    // open, and a single-sided shell that has been cut open is a hoop.
    for (const id of [
      'femoral-shaft',
      'medial-femoral-condyle',
      'lateral-femoral-condyle',
      'medial-tibial-plateau',
      'lateral-tibial-plateau',
      'tibial-shaft',
      'fibula',
    ]) {
      declare(id, { ghostAt: 0.28, ghostOpacity: 0.1, doubleSided: true });
    }
    declare('patella', { ghostAt: 0.4, ghostOpacity: 0.12, doubleSided: true });

    // One structure, four meshes: a layer on each surface that meets another.
    // It carries a tag of its own because it has the shape of the bones, so a
    // view that puts the bones away has to be able to put it away too.
    declare('articular-cartilage', {
      meshes: knee.cartilageMeshes,
      tags: ['cushion', 'cartilage'],
      ghostAt: 0.5,
      ghostOpacity: 0.12,
      doubleSided: true,
    });

    declare('medial-meniscus', { preferredView: 'plateau-from-above', doubleSided: true });
    declare('lateral-meniscus', { preferredView: 'plateau-from-above', doubleSided: true });

    // Inside the notch, behind both condyles — which is the whole reason the
    // slider exists. They are not revealed *at* a slider position: they are
    // always drawn, and the bone in front of them is what moves out of the way.
    // Gating them on the slider left the ligaments-only view empty of ligaments.
    declare('anterior-cruciate-ligament', { preferredView: 'ligaments-only' });
    declare('posterior-cruciate-ligament', { preferredView: 'posterior' });
    declare('medial-collateral-ligament', { preferredView: 'medial' });
    declare('lateral-collateral-ligament', { preferredView: 'lateral' });
    declare('quadriceps-tendon', { preferredView: 'anterior' });
    declare('patellar-tendon', { preferredView: 'anterior' });

    return { object: knee.object, structures, dispose: () => knee.dispose() };
  }
}
