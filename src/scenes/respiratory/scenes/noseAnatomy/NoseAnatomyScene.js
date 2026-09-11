import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildNose } from '../../organs/nose.js';
import {
  NOSE_ANATOMY_META,
  NOSE_COLOR_MODES,
  NOSE_NATURAL_COLORS,
  NOSE_SCENE_COLORS,
  noseStructureCopy,
} from '../../../../data/noseAnatomyScene.js';

/**
 * The nose from outside, then from the inside of the other half.
 *
 * A nasal cavity is a slit, and the only honest way to look into one is from
 * where the septum is — so the viewpoints go round to the medial side and the
 * septum steps back, rather than the cavity being pulled open. The three
 * shelves and the three gutters under them stay where they are; what changes is
 * which sheet is between the camera and them.
 *
 * The coronal view is a real cut. It is the plane the sinuses are looked at in,
 * and it is the only view in which the maxillary sinus, its opening near the
 * roof and the gutter that opening arrives in are all visible at once — which
 * is the claim the whole scene is built around.
 */
export class NoseAnatomyScene extends OrganAnatomyScene {
  static meta = NOSE_ANATOMY_META;

  // Mostly from the side, a little in front. A nose is recognised by its
  // profile and by almost nothing else, and from here the profile is a profile
  // while the septum behind it still has a face rather than an edge. Tried and
  // rejected: three-quarters from in front, where the nose points at the camera
  // and foreshortens into a tent.
  static cameraPose = {
    position: new THREE.Vector3(5.7, 1.8, 3.4),
    target: new THREE.Vector3(0.0, 0.12, 0.35),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** A cavity 3.4 units deep with a nose on the front of it, looked at from the
   *  side: the long axis is across the frame, and the widest of the views meant
   *  to show the whole of it fills the width at an aspect of 1.12. */
  static framing = { minHorizontalAspect: 1.15 };

  static colorModes = NOSE_COLOR_MODES;

  static views = [
    {
      id: 'whole',
      label: 'Nose and sinuses',
      labelJa: '鼻と副鼻腔の全体',
      position: [5.7, 1.8, 3.4],
      target: [0.0, 0.12, 0.35],
    },
    // The view this scene exists for: in from the side the septum is on, with
    // the septum and the external nose put away by tag. It is how a lateral
    // wall is looked at in an atlas and in a theatre, and nothing moved to
    // allow it.
    {
      id: 'lateral-wall',
      label: 'The lateral wall',
      labelJa: '鼻腔外側壁',
      position: [6.0, 1.15, 1.0],
      target: [-0.35, 0.14, -0.05],
      hideTags: ['midline'],
    },
    {
      id: 'turbinates',
      label: 'Shelves and gutters',
      labelJa: '鼻甲介と鼻道',
      position: [3.5, 0.9, 1.2],
      target: [-0.45, 0.14, -0.1],
      hideTags: ['midline'],
    },
    // The wall goes too: the sinuses are behind it, and a sheet of bone is
    // exactly what is between them and a reader in life.
    {
      id: 'sinuses',
      label: 'The four sinuses',
      labelJa: '4つの副鼻腔',
      position: [-1.2, 1.6, 6.2],
      target: [-0.7, 0.35, 0.1],
      hideTags: ['midline', 'wall'],
    },
    // From below and in front, looking **up** under the middle turbinate. From
    // level with it the shelf is in front of the gutter and the ostium arriving
    // in it cannot be seen at all — which is what this view is for.
    {
      id: 'drainage',
      label: 'Where they drain',
      labelJa: '副鼻腔の出口',
      position: [1.9, -0.55, 1.6],
      target: [-0.66, 0.1, 0.2],
      hideTags: ['midline', 'wall'],
    },
    // A coronal cut, which is the plane this anatomy is imaged in.
    {
      id: 'coronal',
      label: 'Coronal section',
      labelJa: '前額断（切断）',
      position: [-0.4, 1.0, 5.2],
      target: [-0.45, 0.15, 0.0],
      section: { normal: [0, 0, -1], constant: 0.24 },
    },
    {
      id: 'airway',
      label: 'The way air goes',
      labelJa: '空気の通り道',
      position: [4.6, 1.4, 2.2],
      target: [-0.35, -0.05, -0.35],
      hideTags: ['midline', 'wall', 'sinus'],
    },
  ];

  buildOrgan() {
    const nose = buildNose({ colors: NOSE_SCENE_COLORS });

    const copy = noseStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`nose-anatomy: no copy for "${id}"`);
      const mesh = nose.mesh(id);
      if (!mesh && !extra.meshes) throw new Error(`nose-anatomy: "${id}" names no mesh`);
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
          regions: NOSE_SCENE_COLORS[entry.colorKey],
          natural: NOSE_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: mesh ? [mesh] : [],
        ...extra,
      });
    };

    // The outside, and the one space you can see into from it. The shell is
    // part-transparent at rest because the vestibule is inside it, and it is
    // the first thing the slider takes away.
    declare('external-nose', { baseOpacity: 0.74, ghostAt: 0.2, ghostOpacity: 0.07 });
    declare('nasal-vestibule', { baseOpacity: 0.22, doubleSided: true });

    // The septum is the sheet between the camera and everything worth seeing,
    // so it is what the slider is for.
    declare('nasal-septum', { ghostAt: 0.34, ghostOpacity: 0.08 });
    declare('lateral-nasal-wall');
    declare('hard-palate');

    for (const id of ['inferior-turbinate', 'middle-turbinate', 'superior-turbinate']) {
      declare(id, { preferredView: 'turbinates' });
    }

    // The gutters are spaces. They are drawn faint because a space is not a
    // solid, and solid enough to be picked because they are what the sinuses
    // open into and a reader has to be able to point at them.
    declare('inferior-meatus', { baseOpacity: 0.24, doubleSided: true, preferredView: 'turbinates' });
    declare('middle-meatus', { baseOpacity: 0.3, doubleSided: true, preferredView: 'drainage' });
    declare('superior-meatus', { baseOpacity: 0.24, doubleSided: true, preferredView: 'turbinates' });
    declare('nasopharynx', { baseOpacity: 0.2, doubleSided: true, preferredView: 'airway' });

    declare('maxillary-sinus', { baseOpacity: 0.42, doubleSided: true, preferredView: 'sinuses' });
    declare('maxillary-ostium', { preferredView: 'drainage' });
    declare('frontal-sinus', { baseOpacity: 0.46, doubleSided: true, preferredView: 'sinuses' });
    // One honeycomb, six meshes, one structure.
    declare('ethmoid-air-cells', {
      meshes: nose.ethmoidCells,
      baseOpacity: 0.5,
      doubleSided: true,
      preferredView: 'sinuses',
    });
    declare('sphenoid-sinus', { baseOpacity: 0.46, doubleSided: true, preferredView: 'sinuses' });

    declare('nasolacrimal-duct', { preferredView: 'turbinates' });
    // The patch on the roof and the threads leaving it through the bone above.
    declare('olfactory-region', { meshes: nose.olfactoryParts, preferredView: 'lateral-wall' });

    return { object: nose.object, structures, dispose: () => nose.dispose() };
  }
}
