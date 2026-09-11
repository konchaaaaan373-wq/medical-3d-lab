import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildMaleTract } from '../../organs/maleTract.js';
import {
  MALE_TRACT_ANATOMY_META,
  MALE_TRACT_COLOR_MODES,
  MALE_TRACT_NATURAL_COLORS,
  MALE_TRACT_SCENE_COLORS,
  maleTractStructureCopy,
} from '../../../../data/maleTractAnatomyScene.js';

/**
 * The male genital tract, as one route you can walk.
 *
 * `prostate-anatomy` is a gland at its own scale. This is the other thing a
 * reader needs, and the two do not overlap: **what connects to what, in what
 * order.** Every structure here names what is upstream and what is downstream
 * of it, and the route is a chain the geometry cannot break, because each
 * segment starts where the last one ends.
 *
 * The slider fades the prostate and the erectile columns — the two things the
 * route runs *through* — rather than moving anything out of them.
 */
export class MaleTractAnatomyScene extends OrganAnatomyScene {
  static meta = MALE_TRACT_ANATOMY_META;

  // From the patient's left and a little in front: the route runs bottom-left
  // to top-middle and then forward, and only a lateral view shows all of it.
  static cameraPose = {
    position: new THREE.Vector3(6.3, -0.2, 3.2),
    target: new THREE.Vector3(-0.15, -0.75, 0.5),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** A long diagonal route: it needs the frame's diagonal, not its width. */
  static framing = { minHorizontalAspect: 0.85 };

  /** What the route runs through rather than along. */
  static contextTags = ['around'];

  static colorModes = MALE_TRACT_COLOR_MODES;

  static views = [
    {
      id: 'route',
      label: 'The whole route',
      labelJa: '経路の全体',
      position: [6.3, -0.2, 3.2],
      target: [-0.15, -0.75, 0.5],
    },
    {
      id: 'testis',
      label: 'Testis and epididymis',
      labelJa: '精巣と精巣上体',
      position: [1.4, -2.0, 1.9],
      target: [-0.62, -2.35, -0.05],
    },
    {
      id: 'junction',
      label: 'Where the two routes meet',
      labelJa: '2つの経路の合流部',
      position: [1.9, 0.2, 1.6],
      target: [-0.05, -0.15, -0.2],
    },
    { id: 'anterior', label: 'Anterior', labelJa: '前面', position: [0, -0.6, 5.6], target: [-0.1, -0.7, 0.4] },
    {
      id: 'sagittal-section',
      label: 'Sagittal section',
      labelJa: '矢状断（切断）',
      position: [6.3, -0.2, 3.2],
      target: [-0.15, -0.75, 0.5],
      section: { normal: [-1, 0, 0], constant: 0.02 },
    },
  ];

  buildOrgan() {
    const tract = buildMaleTract({ colors: MALE_TRACT_SCENE_COLORS });

    const copy = maleTractStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`male-tract-anatomy: no copy for "${id}"`);
      const mesh = tract.mesh(id);
      if (!mesh) throw new Error(`male-tract-anatomy: "${id}" names no mesh`);
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
          regions: MALE_TRACT_SCENE_COLORS[entry.colorKey],
          natural: MALE_TRACT_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: [mesh],
        ...extra,
      });
    };

    for (const id of tract.route) declare(id);
    declare('seminal-vesicle');
    declare('external-urethral-orifice');
    // The three things the route runs through. They fade rather than leave: a
    // duct inside a gland is only "inside a gland" while the gland is there.
    const through = { ghostAt: 0.3, ghostOpacity: 0.12 };
    declare('prostate', { ...through, preferredView: 'junction' });
    for (const id of ['corpus-spongiosum', 'right-corpus-cavernosum', 'left-corpus-cavernosum']) {
      declare(id, through);
    }
    declare('bladder', { ghostAt: 0.2, ghostOpacity: 0.1, preferredView: 'junction' });

    return { object: tract.object, structures, dispose: () => tract.dispose() };
  }
}
