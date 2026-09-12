import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { LEVELS, buildAbdomen } from '../../organs/abdomen.js';
import {
  ABDOMEN_ANATOMY_META,
  ABDOMEN_COLOR_MODES,
  ABDOMEN_NATURAL_COLORS,
  ABDOMEN_SCENE_COLORS,
  abdomenStructureCopy,
} from '../../../../data/abdomenAnatomyScene.js';

/**
 * An abdomen, sorted by the only question that sorts it.
 *
 * The layer slider takes away **the wall**, which is the one part that can be
 * removed without moving anything. Nothing inside is moved.
 *
 * Two of the viewpoints are a pair and carry the scene: **what is in the bag**
 * and **what is behind it**, each with the other side put away. They are not
 * two pictures of different things; they are the same abdomen sorted by one
 * line, and switching between them is the whole lesson.
 */
export class AbdomenAnatomyScene extends OrganAnatomyScene {
  static meta = ABDOMEN_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(7.6, 4.6, 17.0),
    target: new THREE.Vector3(0, -0.9, 0.4),
  };

  static lightRig = { key: 32, fill: 1.0, rim: 16 };

  /** Measured, not guessed: eleven units across against seven and a half down,
   *  and the widest of the views meant to show the whole region fills the
   *  frame's width at 1.07. */
  static framing = { minHorizontalAspect: 1.12 };

  static colorModes = ABDOMEN_COLOR_MODES;

  static views = [
    {
      id: 'whole',
      label: 'The abdomen from in front',
      labelJa: '前方から見た腹部',
      position: [7.6, 4.6, 17.0],
      target: [0, -0.9, 0.4],
    },
    // The wall, and the two straps in it that decide where it is opened.
    {
      id: 'wall',
      label: 'The wall',
      labelJa: '腹壁',
      position: [6.2, 3.2, 17.4],
      target: [0, -1.2, 1.0],
      hideTags: ['cavity', 'behind-the-bag', 'in-the-bag'],
    },
    // **Half the scene.** Everything that hangs on a fold and moves.
    {
      id: 'in-the-bag',
      label: 'In the bag',
      labelJa: '腹膜腔の中にあるもの',
      position: [6.8, 3.4, 16.8],
      target: [0, -1.2, 1.2],
      hideTags: ['wall', 'behind-the-bag'],
    },
    // **The other half.** The same abdomen, sorted the other way.
    {
      id: 'behind-the-bag',
      label: 'Behind the bag',
      labelJa: '後腹膜にあるもの',
      position: [6.8, 3.4, 16.8],
      target: [0, -1.2, -0.4],
      hideTags: ['wall', 'in-the-bag', 'cavity'],
    },
    // L1, close: the two organs that straddle the line, and the artery that
    // crosses one of them.
    {
      id: 'transpyloric',
      label: 'The plane everything is counted from',
      labelJa: '幽門横断面（L1）',
      position: [4.4, 2.0, 11.6],
      target: [0, LEVELS.transpyloric * 0.4 - 0.3, -0.4],
      hideTags: ['wall', 'in-the-bag', 'cavity'],
    },
    // Three branches at three levels, and two vessels that are not both in the
    // midline.
    {
      id: 'great-vessels',
      label: 'Three branches, three levels',
      labelJa: '3本の腹側枝',
      position: [5.2, 1.6, 13.0],
      target: [0, -1.4, -0.8],
      hideTags: ['wall', 'in-the-bag', 'cavity', 'gut', 'organ'],
    },
    {
      id: 'from-behind',
      label: 'From behind',
      labelJa: '背面から',
      position: [-5.6, 2.6, -16.0],
      target: [0, -1.2, -0.6],
      hideTags: ['wall', 'in-the-bag', 'cavity'],
    },
  ];

  buildOrgan() {
    const abdomen = buildAbdomen({ colors: ABDOMEN_SCENE_COLORS });

    const copy = abdomenStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`abdomen-anatomy: no copy for "${id}"`);
      const meshes = abdomen.meshesFor(id);
      if (!meshes.length) throw new Error(`abdomen-anatomy: "${id}" names no mesh`);
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
          regions: ABDOMEN_SCENE_COLORS[entry.colorKey],
          natural: ABDOMEN_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes,
        ...extra,
      });
    };

    // The wall is what the slider takes off.
    declare('abdominal-wall', { baseOpacity: 0.32, doubleSided: true, ghostAt: 0.22, ghostOpacity: 0.04 });
    declare('rectus-abdominis', { baseOpacity: 0.82, ghostAt: 0.4, ghostOpacity: 0.06 });
    declare('lumbar-vertebrae');
    declare('psoas-muscle', { baseOpacity: 0.86, preferredView: 'behind-the-bag' });

    // The bag, and the space behind it. Both are spaces, so both are nearly
    // clear; they share a surface, which is the point.
    declare('peritoneal-cavity', { baseOpacity: 0.14, doubleSided: true, ghostAt: 0.66, ghostOpacity: 0.04 });
    declare('retroperitoneum', { baseOpacity: 0.18, doubleSided: true, preferredView: 'behind-the-bag' });

    declare('greater-omentum', { baseOpacity: 0.46, doubleSided: true, ghostAt: 0.5, ghostOpacity: 0.06 });
    declare('mesentery', { baseOpacity: 0.44, doubleSided: true, preferredView: 'in-the-bag' });

    declare('liver');
    declare('stomach');
    declare('spleen');
    declare('small-bowel');
    declare('colon');

    declare('pancreas', { preferredView: 'transpyloric' });
    declare('duodenum', { preferredView: 'transpyloric' });
    declare('kidneys', { preferredView: 'behind-the-bag' });
    declare('adrenal-glands', { preferredView: 'behind-the-bag' });
    declare('ureters', { preferredView: 'behind-the-bag' });

    declare('aorta', { preferredView: 'great-vessels' });
    declare('inferior-vena-cava', { preferredView: 'great-vessels' });
    declare('coeliac-trunk', { preferredView: 'great-vessels' });
    declare('superior-mesenteric-vessels', { preferredView: 'transpyloric' });
    declare('inferior-mesenteric-artery', { preferredView: 'great-vessels' });
    declare('renal-vessels', { preferredView: 'great-vessels' });

    return { object: abdomen.object, structures, dispose: () => abdomen.dispose() };
  }
}
