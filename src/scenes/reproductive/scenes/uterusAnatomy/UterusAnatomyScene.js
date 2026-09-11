import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildUterusParts } from '../../organs/uterusParts.js';
import {
  UTERUS_ANATOMY_META,
  UTERUS_COLOR_MODES,
  UTERUS_NATURAL_COLORS,
  UTERUS_SCENE_COLORS,
  uterusStructureCopy,
} from '../../../../data/uterusAnatomyScene.js';

/**
 * The uterus, as a thing you can point at.
 *
 * `uterine-cycle` is about a lining that thickens and sheds. This is about
 * which part is which, and about the one thing that cannot be seen from
 * outside: the cavity is a flattened triangle whose corners are the two tubal
 * openings and the start of the cervical canal.
 */
export class UterusAnatomyScene extends OrganAnatomyScene {
  static meta = UTERUS_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(0, 0.35, 5.4),
    target: new THREE.Vector3(0, 0.15, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** Tubes and ovaries out to both sides make the subject wider than it is tall. */
  static framing = { minHorizontalAspect: 1.0 };

  /** The vagina is drawn so the cervical canal opens into somewhere. */
  static contextTags = ['neighbour'];

  static colorModes = UTERUS_COLOR_MODES;

  static views = [
    { id: 'anterior', label: 'Anterior', labelJa: '前面', position: [0, 0.35, 5.4], target: [0, 0.15, 0] },
    { id: 'posterior', label: 'Posterior', labelJa: '背面', position: [0, 0.35, -5.4], target: [0, 0.15, 0] },
    {
      id: 'adnexa',
      label: 'Tube and ovary',
      labelJa: '卵管と卵巣',
      position: [2.2, 1.0, 2.4],
      target: [1.35, 0.45, -0.05],
    },
    {
      id: 'coronal-section',
      label: 'Coronal section',
      labelJa: '前額断（切断）',
      position: [0, 0.35, 5.6],
      target: [0, 0.15, 0],
      section: { normal: [0, 0, -1], constant: 0.05 },
    },
  ];

  buildOrgan() {
    const uterus = buildUterusParts({ colors: UTERUS_SCENE_COLORS });

    const copy = uterusStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`uterus-anatomy: no copy for "${id}"`);
      const mesh = uterus.mesh(id);
      if (!mesh) throw new Error(`uterus-anatomy: "${id}" names no mesh`);
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
          regions: UTERUS_SCENE_COLORS[entry.colorKey],
          natural: UTERUS_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: [mesh],
        ...extra,
      });
    };

    const wall = { ghostAt: 0.35, ghostOpacity: 0.12 };
    for (const id of ['fundus', 'body', 'isthmus', 'cervix']) declare(id, wall);
    // A flat patch has a back as well as a front.
    declare('uterine-cavity', { revealAt: 0.3, doubleSided: true });
    declare('cervical-canal', { revealAt: 0.3 });
    for (const id of ['right-fallopian-tube', 'left-fallopian-tube']) declare(id, { preferredView: 'adnexa' });
    for (const id of ['right-ovary', 'left-ovary']) declare(id, { preferredView: 'adnexa' });
    declare('vagina', { ghostAt: 0.55, ghostOpacity: 0.14 });

    return { object: uterus.object, structures, dispose: () => uterus.dispose() };
  }
}
