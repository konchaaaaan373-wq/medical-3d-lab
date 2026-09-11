import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildBiliaryTree } from '../../organs/biliaryTree.js';
import { buildDuodenum } from '../../../gastrointestinal/organs/intestine.js';
import {
  BILIARY_ANATOMY_META,
  BILIARY_COLOR_MODES,
  BILIARY_NATURAL_COLORS,
  BILIARY_SCENE_COLORS,
  biliaryStructureCopy,
} from '../../../../data/biliaryAnatomyScene.js';

/**
 * The biliary tree, as a thing you can point at.
 *
 * The first scene in this repository in which a bile duct exists. What it is
 * for is the **order of the junctions**: a stone in the cystic duct and a stone
 * in the common bile duct are the same stone in two places and two different
 * illnesses, and which is which is decided by what has joined the duct above it.
 *
 * The duodenum is the shared `buildDuodenum` loop, placed so that its
 * descending part contains the papilla rather than approximately near it — the
 * placement below is derived from the papilla the tree declares, so moving the
 * tree moves the bowel it opens into.
 */

/** How the shared duodenal loop is brought into this scene's frame. */
const DUODENUM_SCALE = 0.72;
/** Where the loop's own descending limb sits, in its own coordinates. */
const DUODENUM_LIMB = Object.freeze([-1.78, 0.2, 0]);

export class BiliaryAnatomyScene extends OrganAnatomyScene {
  static meta = BILIARY_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(0, 0.1, 5.2),
    target: new THREE.Vector3(0, 0.05, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /**
   * Hepatic ducts out to one side, duodenum out to the other: the whole tree
   * fills the frame's width at an aspect of 0.83. The two junction close-ups
   * need much more and crop on purpose.
   */
  static framing = { minHorizontalAspect: 0.9 };

  /** The bowel is drawn so "where does bile go" has an answer. */
  static contextTags = ['neighbour'];

  static colorModes = BILIARY_COLOR_MODES;

  static views = [
    { id: 'anterior', label: 'Anterior', labelJa: '前面', position: [0, 0.1, 5.2], target: [0, 0.05, 0] },
    {
      id: 'confluence',
      label: 'Confluence and cystic junction',
      labelJa: '肝管合流部・胆嚢管合流部',
      position: [-0.5, 1.1, 2.6],
      target: [-0.2, 0.5, 0],
    },
    {
      id: 'outlet',
      label: 'The papilla',
      labelJa: '乳頭部',
      position: [0.5, -0.75, 2.4],
      target: [0.35, -1.0, -0.1],
    },
    { id: 'right', label: 'From the patient’s right', labelJa: '右側から', position: [-5.2, 0.3, 1.2], target: [0, 0.05, 0] },
    {
      id: 'coronal-section',
      label: 'Coronal section',
      labelJa: '前額断（切断）',
      position: [0, 0.1, 5.4],
      target: [0, 0.05, 0],
      section: { normal: [0, 0, -1], constant: 0.1 },
    },
  ];

  buildOrgan() {
    const object = new THREE.Group();
    object.name = 'biliary-tree-and-duodenum';

    const tree = buildBiliaryTree({ colors: BILIARY_SCENE_COLORS });
    const duodenum = buildDuodenum({ color: BILIARY_SCENE_COLORS.duodenum });

    // Placed from the papilla the tree declares, so the descending limb lands
    // around it rather than near it. The limb's own radius is what puts the
    // papilla on the wall instead of inside the lumen.
    const papilla = tree.junctions.papilla;
    const limbRadius = 0.2 * DUODENUM_SCALE;
    const holder = new THREE.Group();
    holder.name = 'duodenum-placed';
    holder.scale.setScalar(DUODENUM_SCALE);
    holder.position.set(
      papilla.x + limbRadius - DUODENUM_LIMB[0] * DUODENUM_SCALE,
      papilla.y - DUODENUM_LIMB[1] * DUODENUM_SCALE,
      papilla.z - DUODENUM_LIMB[2] * DUODENUM_SCALE
    );
    holder.add(duodenum.object);
    object.add(holder, tree.object);

    const copy = biliaryStructureCopy();
    const structures = [];
    const declare = (id, meshes, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`biliary-anatomy: no copy for "${id}"`);
      const present = meshes.filter(Boolean);
      if (!present.length) throw new Error(`biliary-anatomy: "${id}" names no mesh`);
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
          regions: BILIARY_SCENE_COLORS[entry.colorKey],
          natural: BILIARY_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: present,
        ...extra,
      });
    };

    for (const [id] of tree.index) declare(id, [tree.mesh(id)]);
    // The bowel fades rather than leaves: the papilla is a marker on its wall,
    // and a marker on a wall that is not there is a dot in space.
    declare('duodenum', [duodenum.object], { ghostAt: 0.4, ghostOpacity: 0.16 });

    return {
      object,
      structures,
      dispose: () => {
        tree.dispose();
        duodenum.dispose();
      },
    };
  }
}
