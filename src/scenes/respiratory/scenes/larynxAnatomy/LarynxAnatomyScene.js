import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildLarynx } from '../../organs/larynx.js';
import {
  LARYNX_ANATOMY_META,
  LARYNX_COLOR_MODES,
  LARYNX_NATURAL_COLORS,
  LARYNX_SCENE_COLORS,
  larynxStructureCopy,
} from '../../../../data/larynxAnatomyScene.js';

/**
 * The crossing, from outside the shared space and then from inside it.
 *
 * The layer slider fades the **pharynx**, because the pharynx is the bag
 * everything else is inside; nothing is moved out of it. The viewpoints are the
 * ones this anatomy is actually looked at from: from behind, which is how a
 * pharynx is opened on a bench; from above, which is how a larynx is looked at
 * in life; and in the midline, cut, which is how the crossing is drawn in every
 * book that has ever tried to explain it.
 */
export class LarynxAnatomyScene extends OrganAnatomyScene {
  static meta = LARYNX_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(5.4, 4.0, 11.4),
    target: new THREE.Vector3(0, 0.6, -0.1),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** Tall and narrow: eight units of airway against two of width. The widest of
   *  the views meant to show the whole of it fills the width at 0.61. */
  static framing = { minHorizontalAspect: 0.65 };

  static colorModes = LARYNX_COLOR_MODES;

  static views = [
    {
      id: 'whole',
      label: 'Larynx and pharynx',
      labelJa: '喉頭と咽頭の全体',
      position: [5.4, 4.0, 11.4],
      target: [0, 0.6, -0.1],
    },
    // From behind: a pharynx is opened from the back, and from there the whole
    // arrangement — the larynx standing in the front wall with a gutter down
    // each side of it — is one picture.
    {
      id: 'from-behind',
      label: 'From behind',
      labelJa: '背面から',
      position: [-2.2, 2.4, -11.6],
      target: [0, 0.5, -0.2],
    },
    // What a swallow does: the spaces, with the cartilages out of the way.
    {
      id: 'crossing',
      label: 'Where the two ways cross',
      labelJa: '空気と食物の交差',
      position: [7.4, 2.8, 8.2],
      target: [0, 0.5, -0.3],
      hideTags: ['skeleton', 'nerve'],
    },
    {
      id: 'skeleton',
      label: 'The cartilages',
      labelJa: '喉頭の骨格',
      position: [4.2, 1.4, 6.2],
      target: [0, 0.2, 0.1],
      hideTags: ['pharynx', 'above', 'below'],
    },
    // Down the airway onto the folds. It is where a larynx is looked at, and
    // the only place the V of the glottis is a V rather than a line.
    {
      id: 'from-above',
      label: 'Down onto the folds',
      labelJa: '声門を上から',
      position: [0, 3.5, -1.5],
      target: [0, 0.12, 0.1],
      hideTags: ['pharynx', 'above'],
    },
    {
      id: 'front-of-neck',
      label: 'The front of the neck',
      labelJa: '前頸部',
      position: [1.4, -0.1, 4.0],
      target: [0, -0.1, 0.6],
      hideTags: ['pharynx'],
    },
    // A real cut on the midline, which is the picture this crossing is always
    // drawn as.
    {
      id: 'sagittal',
      label: 'Cut down the midline',
      labelJa: '正中断（切断）',
      position: [-11.4, 2.0, 1.5],
      target: [0, 0.7, -0.1],
      section: { normal: [1, 0, 0], constant: 0 },
    },
  ];

  buildOrgan() {
    const larynx = buildLarynx({ colors: LARYNX_SCENE_COLORS });

    const copy = larynxStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`larynx-anatomy: no copy for "${id}"`);
      const meshes = larynx.meshesFor(id);
      if (!meshes.length) throw new Error(`larynx-anatomy: "${id}" names no mesh`);
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
          regions: LARYNX_SCENE_COLORS[entry.colorKey],
          natural: LARYNX_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes,
        ...extra,
      });
    };

    // The shared space is the bag everything else is inside, so it is what the
    // slider takes away. It is part-transparent at rest because otherwise the
    // larynx inside it could not be seen at all.
    declare('nasopharynx', { baseOpacity: 0.2, doubleSided: true, ghostAt: 0.34, ghostOpacity: 0.05 });
    declare('oropharynx', { baseOpacity: 0.2, doubleSided: true, ghostAt: 0.34, ghostOpacity: 0.05 });
    declare('laryngopharynx', { baseOpacity: 0.24, doubleSided: true, ghostAt: 0.34, ghostOpacity: 0.05 });
    // Not faded with the rest: the gutters are the answer to the scene's
    // question, and a reader following a swallow needs them all the way down.
    declare('piriform-sinus', { baseOpacity: 0.34, doubleSided: true, preferredView: 'crossing' });

    declare('soft-palate');
    declare('palatine-tonsil');

    declare('epiglottis', { doubleSided: true });
    declare('hyoid-bone');
    declare('thyroid-cartilage', { baseOpacity: 0.66, doubleSided: true });
    declare('cricoid-cartilage', { baseOpacity: 0.72, doubleSided: true });
    declare('arytenoid-cartilage', { preferredView: 'from-above' });
    declare('cricothyroid-membrane', { doubleSided: true, preferredView: 'front-of-neck' });

    declare('vestibular-fold', { doubleSided: true, preferredView: 'from-above' });
    declare('laryngeal-ventricle', { baseOpacity: 0.32, doubleSided: true, preferredView: 'from-above' });
    declare('vocal-fold', { doubleSided: true, preferredView: 'from-above' });
    declare('subglottic-space', { baseOpacity: 0.26, doubleSided: true });

    declare('trachea', { baseOpacity: 0.55, doubleSided: true });
    declare('oesophagus', { baseOpacity: 0.62, doubleSided: true });
    declare('recurrent-laryngeal-nerve');

    return { object: larynx.object, structures, dispose: () => larynx.dispose() };
  }
}
