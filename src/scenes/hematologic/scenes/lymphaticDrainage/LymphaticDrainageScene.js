import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildLymphaticRoutes } from '../../organs/lymphaticRoutes.js';
import { buildBodyShell } from '../../../systemic/organs/bodyShell.js';
import {
  DRAINAGE_COLOR_MODES,
  DRAINAGE_NATURAL_COLORS,
  DRAINAGE_SCENE_COLORS,
  LYMPHATIC_DRAINAGE_META,
  drainageStructureCopy,
} from '../../../../data/lymphaticDrainageScene.js';

/**
 * Where lymph drains, at body scale.
 *
 * The companion to `lymph-node-anatomy`, and the split is deliberate: a node is
 * millimetres and the thoracic duct is most of a person. This scene draws
 * routes and groups, and every node in it is a **marker for a group** — the
 * model of a node is the other scene, and both say so.
 *
 * The body silhouette is context, excluded from the framing subject, because
 * the whole point of a drainage map is where things are *in a person*.
 */
export class LymphaticDrainageScene extends OrganAnatomyScene {
  static meta = LYMPHATIC_DRAINAGE_META;

  static cameraPose = {
    position: new THREE.Vector3(-1.6, 0.9, 11.0),
    target: new THREE.Vector3(0, -0.1, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** A whole trunk; the widest whole view fills the frame's width at an aspect
   *  of 0.42. */
  static framing = { minHorizontalAspect: 0.46 };

  /** Drawn so the routes are somewhere rather than floating. */
  static contextTags = ['silhouette'];

  static colorModes = DRAINAGE_COLOR_MODES;

  static views = [
    { id: 'front', label: 'From in front', labelJa: '正面', position: [-1.6, 0.9, 11.0], target: [0, -0.1, 0] },
    // The asymmetry, seen from the side the long duct runs up.
    {
      id: 'left-side',
      label: 'The long duct, from the left',
      labelJa: '左側から（胸管）',
      position: [9.6, 1.2, 3.6],
      target: [0.2, 0.1, -0.2],
    },
    {
      id: 'right-side',
      label: 'The short duct, from the right',
      labelJa: '右側から（右リンパ本幹）',
      position: [-9.6, 1.4, 3.6],
      target: [-0.2, 0.9, -0.1],
    },
    // Both ducts ending at the root of the neck, which is where the asymmetry
    // is a thing you can see rather than read.
    {
      id: 'venous-angles',
      label: 'Where both ducts empty',
      labelJa: '両本幹が注ぐところ',
      position: [-0.8, 3.4, 4.2],
      target: [0, 1.7, 0.1],
    },
    {
      id: 'routes-only',
      label: 'The routes on their own',
      labelJa: '経路だけを見る',
      position: [-1.4, 0.8, 9.6],
      target: [0, -0.1, 0],
      hideTags: ['silhouette'],
    },
  ];

  buildOrgan() {
    const routes = buildLymphaticRoutes({ colors: DRAINAGE_SCENE_COLORS });
    const shell = buildBodyShell();
    routes.object.add(shell.object);

    const copy = drainageStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`lymphatic-drainage: no copy for "${id}"`);
      const mesh = routes.mesh(id);
      if (!mesh && !extra.meshes) throw new Error(`lymphatic-drainage: "${id}" names no mesh`);
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
          regions: DRAINAGE_SCENE_COLORS[entry.colorKey],
          natural: DRAINAGE_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: mesh ? [mesh] : [],
        ...extra,
      });
    };

    declare('thoracic-duct', { preferredView: 'left-side' });
    declare('right-lymphatic-duct', { preferredView: 'right-side' });
    declare('cisterna-chyli', { preferredView: 'left-side' });

    // Each group is one structure with a dozen beads: "the axillary nodes" is
    // what a reader asks about and what a report names.
    declare('cervical-nodes', { meshes: routes.groupMeshes.cervical });
    declare('axillary-nodes', { meshes: routes.groupMeshes.axillary });
    declare('inguinal-nodes', { meshes: routes.groupMeshes.inguinal });

    declare('left-drainage-route', { revealAt: 0.25 });
    declare('right-drainage-route', { revealAt: 0.25 });

    // The silhouette is scale, not anatomy: it fades as the slider goes in, and
    // it is excluded from the framing subject so it never decides the zoom.
    structures.push({
      id: 'body-silhouette',
      name: 'Body outline',
      nameJa: '体の輪郭',
      hierarchy: ['Lymphatic system', 'Context', 'Body outline'],
      hierarchyJa: ['リンパ系', '位置の目安', '体の輪郭'],
      description: 'A silhouette, drawn only so that the routes and the groups are somewhere. It is not a model of a body and carries no structure of its own.',
      descriptionJa: '経路と節群の位置を示すためだけに描いた輪郭です。身体のモデルではなく、それ自体には構造をもちません。',
      note: 'Head, neck and trunk as a surface of revolution; the limbs are left off deliberately.',
      noteJa: '頭部・頸部・体幹を回転面として描いたもので、四肢は意図的に省いています。',
      tags: ['silhouette'],
      colors: { regions: '#5f7bb5', natural: '#5f7bb5' },
      legendKey: 'route',
      meshes: shell.object.children.filter((child) => child.isMesh),
      baseOpacity: 0.14,
      ghostAt: 0.5,
      ghostOpacity: 0.035,
      doubleSided: true,
    });

    return {
      object: routes.object,
      structures,
      dispose: () => {
        routes.dispose();
        shell.material.dispose();
      },
    };
  }
}
