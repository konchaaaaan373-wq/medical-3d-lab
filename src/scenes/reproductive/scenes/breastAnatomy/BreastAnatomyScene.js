import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildBreast } from '../../organs/breast.js';
import {
  BREAST_ANATOMY_META,
  BREAST_COLOR_MODES,
  BREAST_NATURAL_COLORS,
  BREAST_SCENE_COLORS,
  breastStructureCopy,
} from '../../../../data/breastAnatomyScene.js';

/**
 * The breast, as an arrangement rather than an outline.
 *
 * The shape is plain on purpose. What the scene is for is inside: which tissue
 * a thing is in, how deep it is, and which way it drains — and all three are
 * reached by fading the skin and the fat rather than by opening anything.
 *
 * `ductal`, `lobular`, `axillary` and `chest-wall` are tags as well as
 * structures, because those four words are how the subject is divided
 * everywhere else and a later scene should be able to point at them.
 */
export class BreastAnatomyScene extends OrganAnatomyScene {
  static meta = BREAST_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(-2.8, 1.9, 5.4),
    target: new THREE.Vector3(-0.25, 0.15, 0.2),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** A dome on a chest wall with a tail to the armpit; the widest whole view
   *  fills the frame's width at an aspect of 1.06. */
  static framing = { minHorizontalAspect: 1.15 };

  static colorModes = BREAST_COLOR_MODES;

  static views = [
    {
      id: 'oblique',
      label: 'Anterior oblique',
      labelJa: '前斜位',
      position: [-2.8, 1.9, 5.4],
      target: [-0.25, 0.15, 0.2],
    },
    { id: 'anterior', label: 'From in front', labelJa: '正面', position: [-0.4, 0.2, 6.2], target: [-0.3, 0.1, 0.2] },
    // From the side: how far the gland stands off the muscle, which is the
    // question "is it moving with the chest wall" is really about.
    {
      id: 'lateral',
      label: 'From the side',
      labelJa: '側面（深さを見る）',
      position: [-6.0, 0.7, 1.4],
      target: [-0.3, 0.1, 0.2],
    },
    // Every duct arriving at one place.
    {
      id: 'ducts',
      label: 'Ducts converging on the nipple',
      labelJa: '乳頭に集まる乳管',
      position: [-0.6, 0.5, 3.6],
      target: [0, 0.05, 0.7],
      // The fat goes too: it is what the ducts are inside, and a view about
      // them that leaves it standing shows a cream dome and nothing else.
      hideTags: ['surface', 'support', 'filler'],
    },
    // The tail and the nodes: where most of the breast drains.
    {
      id: 'axilla',
      label: 'The tail and the axilla',
      labelJa: '腋窩尾部とリンパ節',
      position: [-3.8, 2.6, 3.4],
      target: [-1.5, 1.05, 0.05],
    },
  ];

  buildOrgan() {
    const breast = buildBreast({ colors: BREAST_SCENE_COLORS });

    const copy = breastStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`breast-anatomy: no copy for "${id}"`);
      const mesh = breast.mesh(id);
      if (!mesh && !extra.meshes) throw new Error(`breast-anatomy: "${id}" names no mesh`);
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
          regions: BREAST_SCENE_COLORS[entry.colorKey],
          natural: BREAST_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: mesh ? [mesh] : [],
        ...extra,
      });
    };

    // Skin and fat are what the gland is behind, so they are what fades.
    declare('skin', { ghostAt: 0.22, ghostOpacity: 0.1, doubleSided: true });
    declare('adipose-tissue', { ghostAt: 0.38, ghostOpacity: 0.12, doubleSided: true });
    declare('areola', { ghostAt: 0.55, ghostOpacity: 0.2 });
    declare('nipple', { preferredView: 'ducts' });

    declare('lactiferous-ducts', { meshes: breast.ductMeshes, preferredView: 'ducts' });
    declare('lobules', { meshes: breast.lobuleMeshes, preferredView: 'ducts' });
    declare('cooper-ligaments', { meshes: breast.cooperMeshes, revealAt: 0.3 });

    declare('pectoralis-major', { preferredView: 'lateral' });
    declare('axillary-tail', { preferredView: 'axilla' });
    declare('axillary-nodes', { meshes: breast.nodeMeshes, preferredView: 'axilla' });

    return { object: breast.object, structures, dispose: () => breast.dispose() };
  }
}
