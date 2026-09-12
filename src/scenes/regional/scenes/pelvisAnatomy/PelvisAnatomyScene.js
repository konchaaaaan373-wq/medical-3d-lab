import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { LEFT, buildPelvis } from '../../organs/pelvis.js';
import {
  PELVIS_ANATOMY_META,
  PELVIS_COLOR_MODES,
  PELVIS_NATURAL_COLORS,
  PELVIS_SCENE_COLORS,
  pelvisStructureCopy,
} from '../../../../data/pelvisAnatomyScene.js';

/**
 * A pelvis, opened on what is the same in everybody.
 *
 * The scene carries both sets of reproductive organs and **nobody has both**,
 * so it does not open on either: the first view is the ring, the floor, the
 * peritoneum, the bladder, the rectum, the ureters and the vessels, which are
 * the same whichever set is there. Two further views add one set each, with the
 * other put away. Nothing is moved to make them coexist.
 *
 * The layer slider takes away **the ring**, which is the only part that can be
 * removed without moving anything.
 *
 * The view the scene is for is `bridge`: one crossing, two names. The ureter
 * passes under the uterine artery in one set and under the vas deferens in the
 * other, at the same point — so that view is the one place both sets are shown
 * together on purpose, and the copy says why.
 */
export class PelvisAnatomyScene extends OrganAnatomyScene {
  static meta = PELVIS_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(5.2, 3.6, 11.4),
    target: new THREE.Vector3(0, -1.2, 0.2),
  };

  static lightRig = { key: 32, fill: 1.0, rim: 16 };

  /** Measured, not guessed: nine and a half units across against six and a
   *  half down, and the widest whole view fills the frame's width at 1.18. */
  static framing = { minHorizontalAspect: 1.24 };

  static colorModes = PELVIS_COLOR_MODES;

  static views = [
    // What is the same in everybody. The scene opens here on purpose.
    {
      id: 'shared',
      label: 'What is the same in everybody',
      labelJa: '男女で共通するもの',
      position: [5.2, 3.6, 11.4],
      target: [0, -1.2, 0.2],
      hideTags: ['female', 'male'],
    },
    // The floor, and the gap in it that everything goes through.
    {
      id: 'floor',
      label: 'The floor, and the one gap in it',
      labelJa: '骨盤底と、その唯一の裂孔',
      position: [3.4, -4.6, 8.6],
      target: [0, -2.8, 0.4],
      hideTags: ['female', 'male', 'peritoneum', 'vessel'],
    },
    // The lowest point of the whole abdominal cavity.
    {
      id: 'pouch',
      label: 'The lowest point of the cavity',
      labelJa: '腹膜腔の最低点',
      position: [8.6, 1.6, 6.4],
      target: [0, -1.6, -0.4],
      hideTags: ['female', 'male', 'bone', 'vessel'],
    },
    // One set.
    {
      id: 'female',
      label: 'One set: a woman’s',
      labelJa: '一方の組：女性',
      position: [5.0, 2.6, 11.0],
      target: [0, -1.6, 0.2],
      hideTags: ['male', 'bone'],
    },
    // The other set, in the same place, with the first put away.
    {
      id: 'male',
      label: 'The other set: a man’s',
      labelJa: 'もう一方の組：男性',
      position: [5.0, 2.6, 11.0],
      target: [0, -1.6, 0.2],
      hideTags: ['female', 'bone'],
    },
    // **What the scene is for.** Both sets are shown here on purpose: it is one
    // crossing with two names, and seeing them together is the point.
    {
      id: 'bridge',
      label: 'One crossing, two names',
      labelJa: '1つの交差、2つの名前',
      position: [9.8, 0.6, 6.8],
      target: [LEFT * 1.2, -1.7, 0.2],
      hideTags: ['bone', 'peritoneum', 'floor'],
    },
    {
      id: 'from-behind',
      label: 'From behind',
      labelJa: '背面から',
      position: [-4.4, 2.2, -11.0],
      target: [0, -1.4, -0.2],
      hideTags: ['female', 'male', 'bone'],
    },
  ];

  buildOrgan() {
    const pelvis = buildPelvis({ colors: PELVIS_SCENE_COLORS });

    const copy = pelvisStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`pelvis-anatomy: no copy for "${id}"`);
      const meshes = pelvis.meshesFor(id);
      if (!meshes.length) throw new Error(`pelvis-anatomy: "${id}" names no mesh`);
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
          regions: PELVIS_SCENE_COLORS[entry.colorKey],
          natural: PELVIS_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes,
        ...extra,
      });
    };

    // The ring is what the slider takes off.
    declare('pelvic-ring', { baseOpacity: 0.3, doubleSided: true, ghostAt: 0.24, ghostOpacity: 0.05 });
    declare('pubic-symphysis', { ghostAt: 0.4, ghostOpacity: 0.08 });

    declare('levator-ani', { baseOpacity: 0.84, doubleSided: true });
    // A gap, so nearly clear — and it does not fade, because it is what the
    // three passages are passing through.
    declare('levator-hiatus', { baseOpacity: 0.3, doubleSided: true, preferredView: 'floor' });

    declare('pelvic-peritoneum', { baseOpacity: 0.28, doubleSided: true, ghostAt: 0.6, ghostOpacity: 0.05 });
    declare('peritoneal-pouch', { baseOpacity: 0.44, doubleSided: true, preferredView: 'pouch' });

    declare('bladder');
    declare('ureters', { preferredView: 'bridge' });
    declare('urethra');
    declare('rectum');
    declare('anal-canal');
    declare('sigmoid-colon');

    declare('common-iliac-arteries');
    declare('internal-iliac-artery');
    declare('external-iliac-vessels');

    declare('uterus', { preferredView: 'female' });
    declare('ovaries-and-tubes', { preferredView: 'female' });
    declare('vagina', { preferredView: 'female' });
    declare('uterine-artery', { preferredView: 'bridge' });

    declare('prostate', { preferredView: 'male' });
    declare('seminal-vesicles', { preferredView: 'male' });
    declare('vas-deferens', { preferredView: 'bridge' });

    return { object: pelvis.object, structures, dispose: () => pelvis.dispose() };
  }
}
