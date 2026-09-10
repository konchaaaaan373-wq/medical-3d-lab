import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildStomachParts } from '../../organs/stomachParts.js';
import { buildDuodenum } from '../../organs/intestine.js';
import {
  STOMACH_ANATOMY_META,
  STOMACH_COLOR_MODES,
  STOMACH_NATURAL_COLORS,
  STOMACH_SCENE_COLORS,
  stomachStructureCopy,
} from '../../../../data/stomachAnatomyScene.js';

/**
 * The stomach, as a thing you can point at.
 *
 * The stomach was a sketch until now — one wall along one path, which is what
 * peristalsis needs and what naming a region cannot use: fundus, body and
 * antrum were three names for three stretches of one mesh, and a click on any
 * of them selected the same thing. `organs/stomachParts.js` cuts that same
 * path, with that same calibre, into the lengths anatomy names.
 *
 * ## The layer slider means something different here
 *
 * There is no second layer inside a stomach in this model — no wall layers, no
 * rugae, no glands. What there is behind the wall is the sphincter ring at the
 * outlet and the duodenum it opens into, so the slider makes the wall
 * translucent rather than revealing a deeper structure. The range is labelled
 * for what it does.
 *
 * ## What it does not claim
 *
 * The parts are rings of a tube. The cardia is a region on the lesser-curvature
 * side of the opening and is drawn here as a collar; the incisura angularis is
 * a notch on the lesser curvature and is present only as the narrowing that
 * goes with it. The copy carries both of those where a reader is looking at
 * them, and the model card carries the rest.
 */
export class StomachAnatomyScene extends OrganAnatomyScene {
  static meta = STOMACH_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(-0.05, 0.28, 8.7),
    target: new THREE.Vector3(-0.05, 0.23, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  static colorModes = STOMACH_COLOR_MODES;

  static views = [
    { id: 'anterior', label: 'Anterior', labelJa: '前面', position: [-0.05, 0.28, 8.7], target: [-0.05, 0.23, 0] },
    { id: 'posterior', label: 'Posterior', labelJa: '背面', position: [-0.05, 0.28, -8.7], target: [-0.05, 0.23, 0] },
    { id: 'left', label: 'From the patient’s left', labelJa: '左側から', position: [8.0, 0.5, 1.8], target: [-0.05, 0.23, 0] },
    { id: 'outlet', label: 'Pylorus and duodenum', labelJa: '幽門と十二指腸', position: [-1.4, -0.35, 3.4], target: [-1.4, -0.35, 0] },
    {
      id: 'coronal-section',
      label: 'Coronal section',
      labelJa: '前額断（切断）',
      position: [-0.05, 0.28, 8.7],
      target: [-0.05, 0.23, 0],
      section: { normal: [0, 0, -1], constant: 0.02 },
    },
  ];

  buildOrgan() {
    const object = new THREE.Group();
    object.name = 'upper-gastrointestinal';

    const stomach = buildStomachParts();
    const duodenum = buildDuodenum();
    // Placed where the pylorus is, rather than at a position typed beside it:
    // the duodenum is what the stomach opens into, so its first millimetre is
    // the stomach's last one by construction.
    duodenum.object.position.copy(stomach.anchors.pylorus).sub(duodenum.curve.getPointAt(0));
    object.add(stomach.object, duodenum.object);

    const copy = stomachStructureCopy();
    const structures = [];
    const declare = (id, meshes, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`stomach-anatomy: no copy for "${id}"`);
      const present = meshes.filter(Boolean);
      if (!present.length) throw new Error(`stomach-anatomy: "${id}" names no mesh`);
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
          regions: STOMACH_SCENE_COLORS[entry.colorKey],
          natural: STOMACH_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: present,
        ...extra,
      });
    };

    // The wall is what steps back; everything the slider is for is behind it.
    const wall = { ghostAt: 0.6, ghostOpacity: 0.16 };
    for (const part of stomach.parts) declare(part.id, [part.mesh], wall);
    declare('esophagus', [stomach.esophagus.object], wall);
    declare('pyloric-sphincter', [stomach.sphincter]);
    declare('duodenum', [duodenum.object], wall);

    return {
      object,
      structures,
      dispose: () => {
        stomach.dispose();
        duodenum.dispose();
      },
    };
  }
}
