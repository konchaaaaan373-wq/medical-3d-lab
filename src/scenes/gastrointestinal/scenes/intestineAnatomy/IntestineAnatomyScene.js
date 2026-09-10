import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildColonParts } from '../../organs/colonParts.js';
import { buildDuodenum, buildSmallIntestine } from '../../organs/intestine.js';
import {
  INTESTINE_ANATOMY_META,
  INTESTINE_COLOR_MODES,
  INTESTINE_NATURAL_COLORS,
  INTESTINE_SCENE_COLORS,
  intestineStructureCopy,
} from '../../../../data/intestineAnatomyScene.js';

/** Where the colon sits relative to the small bowel, as `intestinalTransit` places it. */
const COLON_OFFSET = [0, 0, -0.55];

/**
 * The intestines, as things you can point at.
 *
 * `buildColon` draws the whole large bowel as one tube because a mass movement
 * travels along one tube. `organs/colonParts.js` cuts that same frame at its
 * own corners, so caecum, ascending, transverse, descending and sigmoid stop
 * being five names for one mesh.
 *
 * ## The slider takes the small bowel out of the way
 *
 * There is no layer under a loop of bowel in this model. What the small
 * intestine does do is sit in front of the colon and hide most of it, so the
 * slider fades it — which is the same move the other scenes' outer tissue
 * makes, and here it leaves the colonic frame standing on its own.
 *
 * ## What it does not claim
 *
 * Jejunum and ileum are one structure, because nothing in the coil marks where
 * one becomes the other. The two flexures are the short lengths of tube at the
 * corners, offered so a reader can point at a bend. There is no appendix, no
 * rectum, no mesentery, no taenia coli and no wall layers.
 */
export class IntestineAnatomyScene extends OrganAnatomyScene {
  static meta = INTESTINE_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(0.35, -0.33, 8.2),
    target: new THREE.Vector3(0.35, -0.38, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  static colorModes = INTESTINE_COLOR_MODES;

  static views = [
    { id: 'anterior', label: 'Anterior', labelJa: '前面', position: [0.35, -0.33, 8.2], target: [0.35, -0.38, 0] },
    { id: 'posterior', label: 'Posterior', labelJa: '背面', position: [-0.05, -0.33, -8.2], target: [-0.05, -0.38, 0] },
    {
      id: 'colon-only',
      label: 'Colon alone',
      labelJa: '結腸のみ',
      position: [-0.4, -0.2, 8.2],
      target: [-0.4, -0.25, 0],
      hideTags: ['small-bowel'],
    },
    { id: 'right', label: 'From the patient’s right', labelJa: '右側から', position: [-8.4, 0.2, 2.0], target: [-0.4, -0.25, 0] },
    {
      id: 'coronal-section',
      label: 'Coronal section',
      labelJa: '前額断（切断）',
      position: [-0.4, -0.2, 8.6],
      target: [-0.4, -0.25, 0],
      section: { normal: [0, 0, -1], constant: 0.1 },
    },
  ];

  buildOrgan() {
    const object = new THREE.Group();
    object.name = 'intestines';

    const colon = buildColonParts({ offset: COLON_OFFSET });
    const small = buildSmallIntestine();
    const duodenum = buildDuodenum();
    object.add(colon.object, small.object, duodenum.object);

    const copy = intestineStructureCopy();
    const structures = [];
    const declare = (id, meshes, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`intestine-anatomy: no copy for "${id}"`);
      const present = meshes.filter(Boolean);
      if (!present.length) throw new Error(`intestine-anatomy: "${id}" names no mesh`);
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
          parts: INTESTINE_SCENE_COLORS[entry.colorKey],
          natural: INTESTINE_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: present,
        ...extra,
      });
    };

    for (const part of colon.parts) declare(part.id, [part.mesh]);
    // What is in front, and what the slider takes out of the way.
    const inFront = { ghostAt: 0.5, ghostOpacity: 0.1 };
    declare('small-intestine', [small.object], inFront);
    declare('duodenum', [duodenum.object], inFront);

    return {
      object,
      structures,
      dispose: () => {
        colon.dispose();
        small.dispose();
        duodenum.dispose();
      },
    };
  }
}
