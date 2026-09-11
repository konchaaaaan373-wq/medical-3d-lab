import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildLymphNode } from '../../organs/lymphNode.js';
import {
  LYMPH_NODE_ANATOMY_META,
  NODE_COLOR_MODES,
  NODE_NATURAL_COLORS,
  NODE_SCENE_COLORS,
  lymphNodeStructureCopy,
} from '../../../../data/lymphNodeAnatomyScene.js';

/**
 * One lymph node, at node scale.
 *
 * The scene is the companion to `lymphatic-drainage`, and the split is the
 * point: a node is millimetres and a thoracic duct is most of a person, so
 * each gets a scene at its own scale rather than one scene lying about both.
 * Here the node fills the frame, and what the reader is meant to come away with
 * is countable — several vessels in, one out.
 */
export class LymphNodeAnatomyScene extends OrganAnatomyScene {
  static meta = LYMPH_NODE_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(-1.6, 2.2, 4.4),
    target: new THREE.Vector3(0, -0.05, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** Vessels either side of a small bean; the widest whole view fills the
   *  frame's width at an aspect of 1.35. */
  static framing = { minHorizontalAspect: 1.4 };

  static colorModes = NODE_COLOR_MODES;

  static views = [
    { id: 'whole', label: 'The whole node', labelJa: 'リンパ節の全体', position: [-1.6, 2.2, 4.4], target: [0, -0.05, 0] },
    // In and out, side by side: the count is the claim.
    {
      id: 'flow',
      label: 'Many in, one out',
      labelJa: '多数が入り、1本が出る',
      position: [0, 3.6, 1.4],
      target: [0, -0.05, 0],
    },
    // Cut in half, which is how a node is drawn everywhere else.
    {
      id: 'section',
      label: 'Cut through the node',
      labelJa: 'リンパ節の断面（切断）',
      position: [-0.6, 1.4, 4.2],
      target: [0, -0.05, 0],
      section: { normal: [0, 0, -1], constant: 0 },
    },
    {
      id: 'hilum',
      label: 'The way out',
      labelJa: '門（出口）',
      position: [2.9, 1.0, 2.2],
      target: [0.7, -0.12, 0],
    },
  ];

  buildOrgan() {
    const node = buildLymphNode({ colors: NODE_SCENE_COLORS });

    const copy = lymphNodeStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`lymph-node-anatomy: no copy for "${id}"`);
      const mesh = node.mesh(id);
      if (!mesh && !extra.meshes) throw new Error(`lymph-node-anatomy: "${id}" names no mesh`);
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
          regions: NODE_SCENE_COLORS[entry.colorKey],
          natural: NODE_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: mesh ? [mesh] : [],
        ...extra,
      });
    };

    // Outside in. Everything is double-sided because the section opens all of
    // it, and a cut shell with no back is a hoop.
    declare('capsule', { ghostAt: 0.22, ghostOpacity: 0.1, doubleSided: true });
    declare('cortex', { ghostAt: 0.5, ghostOpacity: 0.16, doubleSided: true });
    declare('medulla', { preferredView: 'section', doubleSided: true });
    declare('lymphoid-follicle', { meshes: node.follicleMeshes, revealAt: 0.3, preferredView: 'section' });

    declare('afferent-vessels', { meshes: node.afferentMeshes, preferredView: 'flow' });
    declare('efferent-vessel', { preferredView: 'flow' });
    declare('hilum', { preferredView: 'hilum' });

    return { object: node.object, structures, dispose: () => node.dispose() };
  }
}
