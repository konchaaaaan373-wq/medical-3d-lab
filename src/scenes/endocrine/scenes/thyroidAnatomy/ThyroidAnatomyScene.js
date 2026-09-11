import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildThyroidParts } from '../../organs/thyroidAnatomy.js';
import {
  THYROID_ANATOMY_META,
  THYROID_COLOR_MODES,
  THYROID_NATURAL_COLORS,
  THYROID_SCENE_COLORS,
  thyroidStructureCopy,
} from '../../../../data/thyroidAnatomyScene.js';

/**
 * The thyroid, as a thing you can point at.
 *
 * The slider does the one thing this organ's anatomy is about: the gland is
 * opaque to begin with, because from in front that is all there is, and fades
 * to reveal what is *behind* it — the four parathyroids and the two recurrent
 * laryngeal nerves. Both are the reason thyroid anatomy is taught, and neither
 * can be seen from the front at all.
 */
export class ThyroidAnatomyScene extends OrganAnatomyScene {
  static meta = THYROID_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(0, 0.05, 3.4),
    target: new THREE.Vector3(0, -0.05, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /**
   * The whole-gland views fill the frame's width at an aspect of 0.52. The
   * lobe close-up needs far more and is allowed to crop: going in on one lobe
   * is what it is for.
   */
  static framing = { minHorizontalAspect: 0.55 };

  /** Drawn so the gland's shape and the nerves' groove mean something. */
  static contextTags = ['neighbour'];

  static colorModes = THYROID_COLOR_MODES;

  static views = [
    { id: 'anterior', label: 'Anterior', labelJa: '前面', position: [0, 0.05, 3.4], target: [0, -0.05, 0] },
    // The view the parathyroids and the nerves are actually visible from.
    { id: 'posterior', label: 'Posterior', labelJa: '背面', position: [0, 0.05, -3.4], target: [0, -0.05, 0] },
    {
      id: 'right-lobe',
      label: 'Right lobe and its nerve',
      labelJa: '右葉と反回神経',
      position: [-2.4, 0.1, 1.7],
      target: [-0.4, -0.05, -0.1],
    },
    {
      id: 'transverse-section',
      label: 'Transverse section',
      labelJa: '横断（切断）',
      position: [0, 3.2, 0.9],
      target: [0, 0, 0],
      section: { normal: [0, -1, 0], constant: 0.1 },
    },
  ];

  buildOrgan() {
    const gland = buildThyroidParts({ colors: THYROID_SCENE_COLORS });

    const copy = thyroidStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`thyroid-anatomy: no copy for "${id}"`);
      const mesh = gland.mesh(id);
      if (!mesh) throw new Error(`thyroid-anatomy: "${id}" names no mesh`);
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
          regions: THYROID_SCENE_COLORS[entry.colorKey],
          natural: THYROID_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: [mesh],
        ...extra,
      });
    };

    // The gland fades rather than disappears: what is behind it only means
    // something while the thing it is behind is still there.
    const glandFade = { ghostAt: 0.35, ghostOpacity: 0.13 };
    for (const id of ['right-lobe', 'left-lobe', 'isthmus', 'pyramidal-lobe']) declare(id, glandFade);
    for (const id of [
      'right-superior-parathyroid',
      'left-superior-parathyroid',
      'right-inferior-parathyroid',
      'left-inferior-parathyroid',
    ]) {
      declare(id, { revealAt: 0.3, preferredView: 'posterior' });
    }
    declare('right-recurrent-laryngeal-nerve', { revealAt: 0.3, preferredView: 'posterior' });
    declare('left-recurrent-laryngeal-nerve', { revealAt: 0.3, preferredView: 'posterior' });
    declare('trachea', { ghostAt: 0.6, ghostOpacity: 0.16 });
    declare('oesophagus', { ghostAt: 0.6, ghostOpacity: 0.16 });

    return { object: gland.object, structures, dispose: () => gland.dispose() };
  }
}
