import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildBladderParts } from '../../organs/bladderParts.js';
import {
  BLADDER_ANATOMY_META,
  BLADDER_COLOR_MODES,
  BLADDER_NATURAL_COLORS,
  BLADDER_SCENE_COLORS,
  bladderStructureCopy,
} from '../../../../data/bladderAnatomyScene.js';

/**
 * The bladder, as a thing you can point at.
 *
 * One structure carries this scene: the **trigone**, on the inside of the base.
 * Everything else is what makes it locatable, and the slider does the only
 * thing that can show it — the wall becomes translucent and the triangle and
 * its three openings are there.
 *
 * `kidney-anatomy` also draws a bladder, at the end of the tract and small.
 * That one fills and empties; this one is the organ at its own scale and does
 * not. They are the same shape read from the same warp.
 */
export class BladderAnatomyScene extends OrganAnatomyScene {
  static meta = BLADDER_ANATOMY_META;

  // Slightly above and in front. The trigone is on the back wall, so the
  // opening pose deliberately does *not* look at it: it is found by fading the
  // wall, and there is a viewpoint for reading it once it is.
  static cameraPose = {
    position: new THREE.Vector3(0, 0.6, 3.1),
    target: new THREE.Vector3(0, -0.05, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** The whole-organ views fill the frame's width at an aspect of 0.60. */
  static framing = { minHorizontalAspect: 0.65 };

  /** Drawn so the two openings at the top of the trigone lead somewhere. */
  static contextTags = ['tract'];

  static colorModes = BLADDER_COLOR_MODES;

  static views = [
    { id: 'anterior', label: 'Anterior', labelJa: '前面', position: [0, 0.6, 3.1], target: [0, -0.05, 0] },
    // The trigone is on the inside of the base, so this is the view it is read
    // from — and every structure on the inside names it.
    { id: 'posterior', label: 'Posterior (the base)', labelJa: '背面（膀胱底）', position: [0, 0.25, -3.1], target: [0, -0.15, 0] },
    { id: 'left', label: 'From the patient’s left', labelJa: '左側から', position: [3.1, 0.35, 0.4], target: [0, -0.1, 0] },
    {
      id: 'coronal-section',
      label: 'Coronal section',
      labelJa: '前額断（切断）',
      position: [0, 0.3, 3.3],
      target: [0, -0.15, 0],
      section: { normal: [0, 0, -1], constant: 0.02 },
    },
  ];

  buildOrgan() {
    const bladder = buildBladderParts({ colors: BLADDER_SCENE_COLORS });

    const copy = bladderStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`bladder-anatomy: no copy for "${id}"`);
      const mesh = bladder.mesh(id);
      if (!mesh) throw new Error(`bladder-anatomy: "${id}" names no mesh`);
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
          regions: BLADDER_SCENE_COLORS[entry.colorKey],
          natural: BLADDER_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: [mesh],
        ...extra,
      });
    };

    const wall = { ghostAt: 0.35, ghostOpacity: 0.12 };
    for (const id of ['apex', 'body', 'fundus', 'neck']) declare(id, wall);
    // A flat patch has a back as well as a front, and half the readers who look
    // for it will be looking at the back.
    declare('trigone', { revealAt: 0.3, preferredView: 'posterior', doubleSided: true });
    for (const id of ['right-ureteric-orifice', 'left-ureteric-orifice', 'internal-urethral-orifice']) {
      declare(id, { revealAt: 0.3, preferredView: 'posterior' });
    }
    for (const id of ['right-ureter', 'left-ureter', 'urethra']) declare(id, { ghostAt: 0.75, ghostOpacity: 0.2 });

    return { object: bladder.object, structures, dispose: () => bladder.dispose() };
  }
}
