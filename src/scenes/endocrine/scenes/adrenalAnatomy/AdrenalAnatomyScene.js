import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { ZONE_DISPLAY_BANDS, ADRENAL_SITES, buildAdrenalParts } from '../../organs/adrenalAnatomy.js';
import {
  ADRENAL_ANATOMY_META,
  ADRENAL_COLOR_MODES,
  ADRENAL_NATURAL_COLORS,
  ADRENAL_SCENE_COLORS,
  adrenalStructureCopy,
} from '../../../../data/adrenalAnatomyScene.js';

/**
 * The adrenal glands, as things you can point at.
 *
 * `adrenal-response` shows two outputs on two time courses; this shows why
 * there are two — the gland is a cortex in three layers with sympathetic
 * nervous tissue inside it, which is a stranger arrangement than any diagram of
 * it lets on.
 *
 * The slider fades the outer layers inwards, one at a time, which is the only
 * order in which four nested shells can be read.
 */
export class AdrenalAnatomyScene extends OrganAnatomyScene {
  static meta = ADRENAL_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(0, 0.75, 3.6),
    target: new THREE.Vector3(0, 0.55, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /**
   * Two glands side by side and nothing between them: the subject is wide and
   * flat, and the widest whole-organ view fills the frame's width at an aspect
   * of 1.22 (the coronal section). The single-gland
   * views need far more and crop on purpose.
   */
  static framing = { minHorizontalAspect: 1.3 };

  /** The kidneys are drawn so the two glands' shapes mean something. */
  static contextTags = ['neighbour'];

  static colorModes = ADRENAL_COLOR_MODES;

  static views = [
    { id: 'anterior', label: 'Anterior', labelJa: '前面', position: [0, 0.75, 3.6], target: [0, 0.55, 0] },
    {
      id: 'right-gland',
      label: 'Right gland',
      labelJa: '右副腎',
      position: [-1.9, 1.45, 1.9],
      target: [-0.82, 1.05, 0],
    },
    {
      id: 'left-gland',
      label: 'Left gland',
      labelJa: '左副腎',
      position: [1.9, 1.35, 1.9],
      target: [0.82, 0.95, 0],
    },
    {
      id: 'coronal-section',
      label: 'Coronal section',
      labelJa: '前額断（切断）',
      position: [0, 1.0, 3.2],
      target: [0, 1.0, 0],
      section: { normal: [0, 0, -1], constant: 0.05 },
    },
  ];

  buildOrgan() {
    const glands = buildAdrenalParts({ colors: ADRENAL_SCENE_COLORS });

    const copy = adrenalStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`adrenal-anatomy: no copy for "${id}"`);
      const mesh = glands.mesh(id);
      if (!mesh) throw new Error(`adrenal-anatomy: "${id}" names no mesh`);
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
          regions: ADRENAL_SCENE_COLORS[entry.colorKey],
          natural: ADRENAL_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        // A shell seen from inside is a shell seen from its back face.
        doubleSided: true,
        meshes: [mesh],
        ...extra,
      });
    };

    // Outside in, one layer at a time. Four nested shells cannot be read in any
    // other order: the outermost has to go before the next one is a surface.
    const fadeAt = [0.18, 0.42, 0.66, null];
    ZONE_DISPLAY_BANDS.forEach((layer, index) => {
      const ghostAt = fadeAt[index];
      for (const site of ADRENAL_SITES) {
        declare(`${site.side}-${layer.id}`, ghostAt === null ? {} : { ghostAt, ghostOpacity: 0.1 });
      }
    });
    for (const site of ADRENAL_SITES) declare(`${site.side}-kidney`, { ghostAt: 0.2, ghostOpacity: 0.14 });

    return { object: glands.object, structures, dispose: () => glands.dispose() };
  }
}
