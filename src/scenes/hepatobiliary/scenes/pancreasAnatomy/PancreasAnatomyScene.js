import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildPancreasParts } from '../../organs/pancreasParts.js';
import { buildDuodenum } from '../../../gastrointestinal/organs/intestine.js';
import {
  PANCREAS_ANATOMY_META,
  PANCREAS_COLOR_MODES,
  PANCREAS_NATURAL_COLORS,
  PANCREAS_SCENE_COLORS,
  pancreasStructureCopy,
} from '../../../../data/pancreasAnatomyScene.js';

/**
 * The pancreas, as a thing you can point at.
 *
 * `buildPancreas` draws the gland translucent with its duct showing through,
 * which is what `pancreatic-secretion` needs and what naming a part cannot use:
 * head, neck, body and tail were four names for one mesh.
 * `organs/pancreasParts.js` cuts that same axis, at that same calibre, into
 * the four.
 *
 * The duodenum is here for one reason and the copy says it: the head sits
 * inside its C, and that relationship is most of what the head's position
 * means.
 *
 * ## The slider
 *
 * The gland is opaque at 0 — which the secretion scene's is not, because there
 * the duct is the subject from the first frame. Here the parts are the subject
 * first, and the duct and the islets come up through them as the gland fades.
 */
export class PancreasAnatomyScene extends OrganAnatomyScene {
  static meta = PANCREAS_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(0.55, 0.3, 4.9),
    target: new THREE.Vector3(0.55, -0.02, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  static colorModes = PANCREAS_COLOR_MODES;

  static views = [
    { id: 'anterior', label: 'Anterior', labelJa: '前面', position: [0.55, 0.3, 4.9], target: [0.55, -0.02, 0] },
    { id: 'superior', label: 'From above', labelJa: '上面', position: [0.1, 4.2, 1.2], target: [0.1, 0.05, -0.1] },
    { id: 'head', label: 'Head and duodenum', labelJa: '膵頭部と十二指腸', position: [-1.3, 0.2, 3.0], target: [-1.3, -0.2, 0] },
    { id: 'posterior', label: 'Posterior', labelJa: '背面', position: [0.1, 0.6, -4.6], target: [0.1, 0.05, 0] },
    {
      id: 'transverse-section',
      label: 'Transverse section',
      labelJa: '横断（切断）',
      position: [0.1, 4.0, 1.4],
      target: [0.1, 0.05, 0],
      section: { normal: [0, -1, 0], constant: 0.25 },
    },
  ];

  buildOrgan() {
    const object = new THREE.Group();
    object.name = 'pancreas-and-duodenum';

    const pancreas = buildPancreasParts();
    const duodenum = buildDuodenum();
    object.add(pancreas.object, duodenum.object);

    const copy = pancreasStructureCopy();
    const structures = [];
    const declare = (id, meshes, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`pancreas-anatomy: no copy for "${id}"`);
      const present = meshes.filter(Boolean);
      if (!present.length) throw new Error(`pancreas-anatomy: "${id}" names no mesh`);
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
          parts: PANCREAS_SCENE_COLORS[entry.colorKey],
          natural: PANCREAS_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: present,
        ...extra,
      });
    };

    const gland = { ghostAt: 0.5, ghostOpacity: 0.14 };
    for (const part of pancreas.parts) declare(part.id, [part.mesh], gland);
    declare('pancreatic-duct', [pancreas.duct], { revealAt: 0.42 });
    // Fourteen spheres, one structure: they are one tissue scattered through
    // the gland, and a tree with fourteen rows called "islet" would be saying
    // that each of them is a part of the anatomy with a name of its own.
    declare('islets', pancreas.islets.children.filter((child) => child.isMesh), { revealAt: 0.42 });
    declare('duodenum', [duodenum.object], { ghostAt: 0.7, ghostOpacity: 0.18 });

    return {
      object,
      structures,
      dispose: () => {
        pancreas.dispose();
        duodenum.dispose();
      },
    };
  }
}
