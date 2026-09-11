import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildPelvicFloor } from '../../organs/pelvicFloor.js';
import {
  PELVIC_ANATOMY_META,
  PELVIC_COLOR_MODES,
  PELVIC_NATURAL_COLORS,
  PELVIC_SCENE_COLORS,
  pelvicFloorStructureCopy,
} from '../../../../data/pelvicFloorAnatomyScene.js';

/**
 * A floor with a hole in it, looked at from above and then from below.
 *
 * The layer slider fades the **bone**, because the bone is the frame the sheet
 * is inside and it is what stands between a reader and everything the scene is
 * about. Nothing is moved out of the ring.
 *
 * Two viewpoints carry the whole subject and neither of them works flat. From
 * above, the sheet's two sides stop short of the midline and **the gap between
 * them is a hole you can see through**. From below, the sling passes behind the
 * bowel and the angle it makes is visible as an angle. A drawing can have one
 * or the other.
 */
export class PelvicFloorAnatomyScene extends OrganAnatomyScene {
  static meta = PELVIC_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(6.29, 11.72, 15.52),
    target: new THREE.Vector3(0, -0.7, 0.2),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** Ten units across against seven deep and seven tall; the widest of the
   *  views meant to show the whole of it fills the width at 0.78. */
  static framing = { minHorizontalAspect: 0.8 };

  static colorModes = PELVIC_COLOR_MODES;

  static views = [
    {
      id: 'whole',
      label: 'The floor in its ring',
      labelJa: '骨盤の中の骨盤底',
      position: [6.29, 11.72, 15.52],
      target: [0, -0.7, 0.2],
    },
    // Straight down into the funnel: the gap in the front of the sheet is a
    // hole you can see through, and it is the one thing this scene exists for.
    {
      id: 'from-above',
      label: 'Down into the funnel',
      labelJa: '上から見下ろす',
      position: [1.01, 19.66, 2.41],
      target: [0, -1.0, 0.4],
      hideTags: ['frame'],
    },
    // From below: the perineal view, and the one in which the sling reads as a
    // sling rather than as a line across the bowel.
    {
      id: 'from-below',
      label: 'From below',
      labelJa: '下から見上げる',
      position: [2.57, -19.84, 7.46],
      target: [0, -1.4, 0.2],
      hideTags: ['frame'],
    },
    {
      id: 'the-sling',
      label: 'The sling behind the bowel',
      labelJa: '腸管の後ろを回る吊り輪',
      position: [5.6, 1.2, -5.4],
      target: [0, -1.5, -0.4],
      hideTags: ['frame', 'muscle', 'perineum'],
    },
    {
      id: 'the-gap',
      label: 'What goes through the gap',
      labelJa: '裂孔を通るもの',
      position: [2.0, 4.6, 7.4],
      target: [0, -1.3, 1.6],
      hideTags: ['frame'],
    },
    // Cut on the midline: urethra, vagina and bowel in their order front to
    // back, with the floor under all three.
    {
      id: 'sagittal',
      label: 'Cut down the midline',
      labelJa: '正中断（切断）',
      position: [-15.66, 2.03, 3.48],
      target: [0, -0.4, 0.1],
      section: { normal: [1, 0, 0], constant: 0 },
    },
  ];

  buildOrgan() {
    const pelvis = buildPelvicFloor({ colors: PELVIC_SCENE_COLORS });

    const copy = pelvicFloorStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`pelvic-floor-anatomy: no copy for "${id}"`);
      const meshes = pelvis.meshesFor(id);
      if (!meshes.length) throw new Error(`pelvic-floor-anatomy: "${id}" names no mesh`);
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
          regions: PELVIC_SCENE_COLORS[entry.colorKey],
          natural: PELVIC_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes,
        ...extra,
      });
    };

    // The frame is what the sheet is inside, so it is what the slider fades.
    declare('pelvic-ring', { ghostAt: 0.36, ghostOpacity: 0.08 });
    declare('sacrum', { ghostAt: 0.36, ghostOpacity: 0.08 });
    declare('coccyx', { ghostAt: 0.36, ghostOpacity: 0.1 });
    declare('obturator-internus', { baseOpacity: 0.6, ghostAt: 0.44, ghostOpacity: 0.08 });

    declare('tendinous-arch');
    declare('pubococcygeus', { doubleSided: true, preferredView: 'from-above' });
    declare('iliococcygeus', { doubleSided: true, preferredView: 'from-above' });
    declare('coccygeus', { doubleSided: true, preferredView: 'from-above' });
    declare('puborectalis', { preferredView: 'the-sling' });

    // The gap is faint because it is an absence, and solid enough to be picked
    // because it is the answer to the scene's question.
    declare('urogenital-hiatus', { baseOpacity: 0.3, doubleSided: true, preferredView: 'the-gap' });

    declare('perineal-body', { preferredView: 'from-below' });
    declare('perineal-membrane', { baseOpacity: 0.6, doubleSided: true, preferredView: 'from-below' });
    declare('external-anal-sphincter', { preferredView: 'from-below' });

    declare('urethra', { preferredView: 'the-gap' });
    declare('vagina', { baseOpacity: 0.72, doubleSided: true, preferredView: 'the-gap' });
    declare('rectum', { baseOpacity: 0.72, doubleSided: true, preferredView: 'the-sling' });
    declare('anal-canal', { baseOpacity: 0.82, doubleSided: true, preferredView: 'the-sling' });

    return { object: pelvis.object, structures, dispose: () => pelvis.dispose() };
  }
}
