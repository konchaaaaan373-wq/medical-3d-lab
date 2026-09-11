import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildProstateZones } from '../../organs/prostateAnatomy.js';
import {
  PROSTATE_ANATOMY_META,
  PROSTATE_COLOR_MODES,
  PROSTATE_NATURAL_COLORS,
  PROSTATE_SCENE_COLORS,
  prostateStructureCopy,
} from '../../../../data/prostateAnatomyScene.js';

/**
 * The prostate, as a thing you can point at.
 *
 * `prostate-outflow` is about a gland and a urethra that are not independent.
 * This is about **which zone**, because that is what prostate disease turns on:
 * the peripheral zone is the outside, is most of the gland, and is what a
 * finger reaches; the transition zone is the inside, is small, and is wrapped
 * round the urethra. Nothing about the outside of the organ tells them apart,
 * so the scene's whole job is to let a reader put one away and look at another.
 *
 * Three zones are inside other zones. None of them is moved to be seen: the
 * slider fades the zones to show the urethra and the ducts through them, the
 * viewpoints come at the gland from the sides the relations are on, and
 * isolation from the list takes one zone out of the four.
 */
export class ProstateAnatomyScene extends OrganAnatomyScene {
  static meta = PROSTATE_ANATOMY_META;

  // Left anterior oblique, from a little below. Straight from the front the
  // only thing in view is the anterior stroma — which is correct, and is not
  // what this scene is about. Coming at it from the side shows the peripheral
  // zone wrapping round it, which is the relation the reader is here for.
  static cameraPose = {
    position: new THREE.Vector3(2.4, 0.55, 3.3),
    target: new THREE.Vector3(0, 0.05, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /**
   * Seminal vesicles reach out to both sides above the gland; the widest
   * whole-organ view fills the frame's width at an aspect of 0.66.
   */
  static framing = { minHorizontalAspect: 0.7 };

  /** Drawn so the gland is between two things rather than floating. */
  static contextTags = ['neighbour'];

  static colorModes = PROSTATE_COLOR_MODES;

  static views = [
    {
      id: 'oblique',
      label: 'Left anterior oblique',
      labelJa: '左前斜位',
      position: [2.4, 0.55, 3.3],
      target: [0, 0.05, 0],
    },
    { id: 'anterior', label: 'Anterior', labelJa: '前面', position: [0.3, 0.4, 4.1], target: [0, 0.05, 0] },
    // The side the peripheral zone is on, and the side an examining finger is
    // on. The rectum is drawn along it.
    {
      id: 'rectal',
      label: 'From behind, the rectal surface',
      labelJa: '背面（直腸に接する面）',
      position: [0, 0.1, -3.8],
      target: [0, -0.05, 0],
    },
    // The relation the whole gland is about: bladder above, rectum behind,
    // urethra straight through.
    {
      id: 'sagittal',
      label: 'From the left, bladder to apex',
      labelJa: '左側面（膀胱から尖部へ）',
      position: [4.2, 0.45, 0.3],
      target: [0, 0.05, -0.15],
    },
    {
      id: 'vesicles',
      label: 'Seminal vesicles and vasa',
      labelJa: '精嚢と精管',
      position: [0.2, 2.2, -2.6],
      target: [0, 0.95, -0.42],
    },
    {
      id: 'transverse-section',
      label: 'Transverse section',
      labelJa: '横断（切断）',
      position: [0.2, 3.4, 1.2],
      target: [0, 0, 0],
      section: { normal: [0, -1, 0], constant: 0.0 },
    },
  ];

  buildOrgan() {
    const prostate = buildProstateZones({ colors: PROSTATE_SCENE_COLORS });

    const copy = prostateStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`prostate-anatomy: no copy for "${id}"`);
      const mesh = prostate.mesh(id);
      if (!mesh) throw new Error(`prostate-anatomy: "${id}" names no mesh`);
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
          regions: PROSTATE_SCENE_COLORS[entry.colorKey],
          natural: PROSTATE_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: [mesh],
        ...extra,
      });
    };

    // The peripheral zone is a shell: opened, it is being looked at from inside.
    declare('peripheral-zone', { ghostAt: 0.3, ghostOpacity: 0.12, doubleSided: true });
    declare('anterior-fibromuscular-stroma', { ghostAt: 0.22, ghostOpacity: 0.1 });
    declare('transition-zone', { ghostAt: 0.55, ghostOpacity: 0.14 });
    declare('central-zone', { ghostAt: 0.55, ghostOpacity: 0.14, preferredView: 'rectal' });
    declare('prostatic-urethra', { revealAt: 0.25, preferredView: 'sagittal' });
    declare('verumontanum', { revealAt: 0.45, preferredView: 'sagittal' });
    for (const id of ['right-ejaculatory-duct', 'left-ejaculatory-duct']) {
      declare(id, { revealAt: 0.45, preferredView: 'rectal' });
    }
    for (const id of [
      'right-seminal-vesicle',
      'left-seminal-vesicle',
      'right-vas-deferens',
      'left-vas-deferens',
    ]) {
      declare(id, { preferredView: 'vesicles' });
    }
    declare('bladder-neck', { ghostAt: 0.2, ghostOpacity: 0.12, preferredView: 'sagittal' });
    declare('rectum', { ghostAt: 0.2, ghostOpacity: 0.12, preferredView: 'sagittal' });

    return { object: prostate.object, structures, dispose: () => prostate.dispose() };
  }
}
