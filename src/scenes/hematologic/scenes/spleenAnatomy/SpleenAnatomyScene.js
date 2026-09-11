import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildSpleenParts } from '../../organs/spleenParts.js';
import {
  SPLEEN_ANATOMY_META,
  SPLEEN_COLOR_MODES,
  SPLEEN_NATURAL_COLORS,
  SPLEEN_SCENE_COLORS,
  spleenStructureCopy,
} from '../../../../data/spleenAnatomyScene.js';

/**
 * The spleen, as a thing you can point at.
 *
 * The organ's own scene, not the flow one: `spleen-filtration` draws blood
 * moving through a translucent spleen, and there the parenchyma is a container.
 * Here the parenchyma is the subject, cut into the two territories the splenic
 * artery's terminal branches supply — the one division of this organ that is a
 * solid rather than a stain.
 *
 * The slider fades the parenchyma to show where that division comes from: the
 * artery divides *before* the hilum, and each branch goes to one segment.
 */
export class SpleenAnatomyScene extends OrganAnatomyScene {
  static meta = SPLEEN_ANATOMY_META;

  // The spleen is a left-sided organ and its hilum faces medially, at -x; the
  // camera sits a little to the +x side so the convex diaphragmatic surface
  // reads first and the hilum is seen obliquely rather than edge-on.
  static cameraPose = {
    position: new THREE.Vector3(1.2, 0.15, 4.4),
    target: new THREE.Vector3(-0.15, 0, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /**
   * Tall rather than wide, but the vessels reach off to one side and they are
   * subject rather than context — the widest whole-organ view fills the
   * frame's width at an aspect of 1.04. The vessels were shortened rather than
   * the framing pulled back further: an organ made small to fit the tubes
   * leaving it is the wrong trade.
   */
  static framing = { minHorizontalAspect: 1.1 };

  /** The pancreatic tail is drawn for what it explains, not as the subject. */
  static contextTags = ['neighbour'];

  static colorModes = SPLEEN_COLOR_MODES;

  static views = [
    { id: 'diaphragmatic', label: 'Diaphragmatic surface', labelJa: '横隔面', position: [1.2, 0.15, 4.4], target: [-0.15, 0, 0] },
    // The face the vessels enter. It is a recess, so it needs its own view.
    { id: 'hilum', label: 'Visceral surface and hilum', labelJa: '臓側面・脾門', position: [-4.2, 0.3, 1.5], target: [-0.3, 0, 0] },
    { id: 'superior', label: 'From above', labelJa: '上面', position: [-0.4, 4.2, 1.0], target: [-0.2, 0, 0] },
    {
      id: 'coronal-section',
      label: 'Coronal section',
      labelJa: '前額断（切断）',
      position: [0.6, 0.15, 4.6],
      target: [-0.15, 0, 0],
      section: { normal: [0, 0, -1], constant: 0.05 },
    },
  ];

  buildOrgan() {
    const spleen = buildSpleenParts({ colors: SPLEEN_SCENE_COLORS });

    const copy = spleenStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`spleen-anatomy: no copy for "${id}"`);
      const mesh = spleen.mesh(id);
      if (!mesh) throw new Error(`spleen-anatomy: "${id}" names no mesh`);
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
          regions: SPLEEN_SCENE_COLORS[entry.colorKey],
          natural: SPLEEN_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: [mesh],
        ...extra,
      });
    };

    const pulp = { ghostAt: 0.35, ghostOpacity: 0.14 };
    declare('superior-segment', pulp);
    declare('inferior-segment', pulp);
    for (const id of ['splenic-artery', 'superior-terminal-branch', 'inferior-terminal-branch', 'splenic-vein']) {
      declare(id, { revealAt: 0.3, preferredView: 'hilum' });
    }
    declare('pancreatic-tail', { ghostAt: 0.7, ghostOpacity: 0.18 });

    return { object: spleen.object, structures, dispose: () => spleen.dispose() };
  }
}
