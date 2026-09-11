import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildEyeball } from '../../organs/eyeball.js';
import {
  EYE_ANATOMY_META,
  EYE_COLOR_MODES,
  EYE_NATURAL_COLORS,
  EYE_SCENE_COLORS,
  eyeStructureCopy,
} from '../../../../data/eyeAnatomyScene.js';

/**
 * The eye, from outside and from inside, without taking it apart.
 *
 * Everything worth pointing at in an eye is behind something else, and this
 * scene is three answers to that. The slider fades the coats inwards. The
 * sagittal section **cuts** the globe rather than opening it, and it cuts the
 * temporal half away so the optic disc — which is nasal — survives the cut.
 * And "the fundus" puts the front of the eye away by tag, which is what an
 * ophthalmoscope does with light: the disc and the macula are then exactly
 * where a fundus photograph has them.
 */
export class EyeAnatomyScene extends OrganAnatomyScene {
  static meta = EYE_ANATOMY_META;

  // Slightly off the visual axis, from above: straight down the axis the iris
  // is a flat ring and the globe has no depth at all.
  static cameraPose = {
    position: new THREE.Vector3(-1.3, 0.75, 3.9),
    target: new THREE.Vector3(0, 0, 0.15),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** A globe with a nerve and four muscles behind it; the widest whole view
   *  fills the frame's width at an aspect of 1.05. It is above 1 because the
   *  subject is deeper than it is wide, and a reserve much above that makes the
   *  eye tiny on a phone — see F-89. */
  static framing = { minHorizontalAspect: 1.15 };

  static colorModes = EYE_COLOR_MODES;

  static views = [
    { id: 'oblique', label: 'Anterior oblique', labelJa: '前斜位', position: [-1.3, 0.75, 3.9], target: [0, 0, 0.15] },
    { id: 'anterior', label: 'From in front', labelJa: '正面', position: [0, 0.1, 4.2], target: [0, 0, 0.2] },
    // Cuts the temporal half away, leaving the half the optic disc is on.
    {
      id: 'sagittal-section',
      label: 'Cut through the eye',
      labelJa: '眼球の断面（切断）',
      // Straight at the cut face, from the half that was taken away.
      position: [-3.9, 0.5, 0.7],
      target: [0, 0, -0.05],
      section: { normal: [1, 0, 0], constant: 0 },
    },
    // What an ophthalmoscope shows: the front of the eye out of the way, the
    // disc nasal and the macula temporal to it.
    {
      id: 'fundus',
      label: 'The fundus',
      labelJa: '眼底',
      position: [0, 0, 3.0],
      target: [0, 0, -0.7],
      hideTags: ['anterior', 'media'],
    },
    {
      id: 'posterior',
      label: 'From behind',
      labelJa: '背面（視神経側）',
      position: [1.8, 1.0, -3.4],
      target: [0.2, 0, -0.9],
    },
    {
      id: 'muscles',
      label: 'The muscles that aim it',
      labelJa: '眼球を動かす筋',
      position: [-2.6, 1.8, 2.2],
      target: [0, 0, -0.6],
    },
  ];

  buildOrgan() {
    const eye = buildEyeball({ colors: EYE_SCENE_COLORS });

    const copy = eyeStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`eye-anatomy: no copy for "${id}"`);
      const mesh = eye.mesh(id);
      if (!mesh) throw new Error(`eye-anatomy: "${id}" names no mesh`);
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
          regions: EYE_SCENE_COLORS[entry.colorKey],
          natural: EYE_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: [mesh],
        ...extra,
      });
    };

    // Every shell is opened by the section, so every shell is double-sided: a
    // cut coat seen from inside is a coat with its back missing otherwise.
    declare('sclera', { ghostAt: 0.2, ghostOpacity: 0.08, doubleSided: true });
    declare('choroid', { ghostAt: 0.32, ghostOpacity: 0.1, doubleSided: true });
    declare('retina', { ghostAt: 0.5, ghostOpacity: 0.14, doubleSided: true, preferredView: 'fundus' });

    // The transparent parts are transparent at rest. `baseOpacity` is where a
    // scene says so: set on the material in the builder it lasts one frame.
    // These are low because they stack — a double-sided shell is two layers,
    // and cornea plus chamber is four of them over the iris and pupil a reader
    // recognises an eye by. At a fifth each the eye was a white ball. They are
    // not lower still because isolating a structure shows it at `baseOpacity`,
    // and a cornea nobody can see is not a cornea a reader can isolate.
    // No `ghostAt`: it is see-through at rest, so there is nothing for the
    // slider to get out of the way, and a structure that starts transparent is
    // not one of the layers that steps back.
    declare('cornea', { baseOpacity: 0.16, doubleSided: true });
    declare('iris', { ghostAt: 0.55, ghostOpacity: 0.16, doubleSided: true });
    declare('pupil', { ghostAt: 0.55, ghostOpacity: 0.12 });
    declare('lens', { baseOpacity: 0.62, preferredView: 'sagittal-section' });
    declare('ciliary-body', { preferredView: 'sagittal-section' });

    declare('anterior-chamber', { baseOpacity: 0.08, preferredView: 'sagittal-section' });
    declare('vitreous-body', { baseOpacity: 0.1, preferredView: 'sagittal-section' });

    declare('optic-disc', { preferredView: 'fundus' });
    declare('macula', { preferredView: 'fundus' });
    declare('optic-nerve', { preferredView: 'posterior' });

    for (const id of ['superior-rectus', 'inferior-rectus', 'medial-rectus', 'lateral-rectus']) {
      declare(id, { preferredView: 'muscles' });
    }

    return { object: eye.object, structures, dispose: () => eye.dispose() };
  }
}
