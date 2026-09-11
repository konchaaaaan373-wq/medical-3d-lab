import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildNeck } from '../../organs/neck.js';
import {
  NECK_ANATOMY_META,
  NECK_COLOR_MODES,
  NECK_NATURAL_COLORS,
  NECK_SCENE_COLORS,
  neckStructureCopy,
} from '../../../../data/neckAnatomyScene.js';

/**
 * A neck, taken apart in the order a neck is actually taken apart.
 *
 * The layer slider removes **the wrapping** — the surface and then the muscle
 * groups — because that is the only thing about a neck that can be removed.
 * Nothing inside is moved: the whole point of the region is that its contents
 * have nowhere else to be.
 *
 * The views are the pictures this anatomy is drawn as. From in front, which is
 * how it is approached; from the side, which is the only way the bundle's three
 * contents are separable; from behind, which is how the grooves and the backs
 * of the thyroid lobes are seen; cut across at the isthmus, which is the
 * picture a cross-section always is; and **the two recurrent nerves together,
 * which is what the scene is for.**
 */
export class NeckAnatomyScene extends OrganAnatomyScene {
  static meta = NECK_ANATOMY_META;

  /** The chest is here so the left nerve has something to turn round. It is
   *  not the subject, so it does not decide how the neck is framed. */
  static contextTags = ['thorax'];

  static cameraPose = {
    position: new THREE.Vector3(5.6, 3.2, 17.0),
    target: new THREE.Vector3(0, -0.9, 0.3),
  };

  static lightRig = { key: 32, fill: 1.0, rim: 16 };

  /** Measured, not guessed: the widest of the views meant to show the whole
   *  neck fills the frame's width at 0.91, and this is the shape the frame has
   *  to be for the shoulders to stay inside both edges. On a phone the result
   *  is a subject that uses the width and leaves the height loose — the shared
   *  narrow-frame allowance is taken on top of this reserve rather than into it
   *  (`docs/follow-ups.md` F-89). */
  static framing = { minHorizontalAspect: 0.95 };

  static colorModes = NECK_COLOR_MODES;

  static views = [
    {
      id: 'whole',
      label: 'The neck from in front',
      labelJa: '前方から見た頸部',
      position: [5.6, 3.2, 17.0],
      target: [0, -0.9, 0.3],
    },
    // Everything the wrapping was hiding, from the same place. This is the
    // view the rest of the scene is read from.
    {
      id: 'contents',
      label: 'Under the muscles',
      labelJa: '筋層を外す',
      position: [5.0, 2.6, 15.5],
      target: [0, -0.7, 0.5],
      hideTags: ['envelope', 'muscle'],
    },
    // **What the scene is for.** The two nerves, side by side, with the two
    // vessels they turn round and nothing else in the way.
    {
      id: 'recurrent-nerves',
      label: 'Why the two nerves differ',
      labelJa: '左右で違う反回神経',
      position: [4.2, -2.2, 13.4],
      target: [0, -3.7, 0.1],
      hideTags: ['envelope', 'muscle', 'skeleton', 'gland'],
    },
    // The gland, and what is immediately behind it: the groove, the nerve in
    // it, and four small bodies on the back of the lobes.
    {
      id: 'thyroid-bed',
      label: 'The thyroid and what is behind it',
      labelJa: '甲状腺とその背側',
      position: [4.2, 0.8, 10.6],
      target: [0, -0.9, 0.8],
      hideTags: ['envelope', 'muscle', 'thorax'],
    },
    // From the side, which is the only direction the artery, the vein and the
    // nerve in the sheath are three things rather than one.
    {
      id: 'sheath',
      label: 'The bundle on one side',
      labelJa: '頸動脈鞘の中身',
      position: [14.6, 1.8, 5.6],
      target: [1.9, -0.2, 0.4],
      hideTags: ['envelope', 'muscle', 'skeleton', 'thorax'],
    },
    // From behind: the gullet, the grooves on either side of it, and the backs
    // of the lobes with the parathyroids on them.
    {
      id: 'from-behind',
      label: 'From behind',
      labelJa: '背面から',
      position: [-3.0, 2.0, -15.5],
      target: [0, -0.7, 0.2],
      hideTags: ['envelope', 'muscle', 'skeleton'],
    },
    // A real cut on the midline. It is the one picture that shows the whole
    // central stack at once — hyoid, larynx, trachea, the isthmus lying across
    // the front of it, the gullet behind, and the column behind that.
    //
    // A cut *across* the neck would be the more useful picture and is not here:
    // the viewer takes one clipping plane, so an axial cut keeps half a neck
    // rather than a slice, and what it draws is a tunnel receding from the cut
    // face rather than the face itself.
    {
      id: 'sagittal',
      label: 'Cut down the midline',
      labelJa: '正中で縦断（切断）',
      position: [-14.8, 1.8, 2.6],
      target: [0, -0.6, 0.4],
      section: { normal: [1, 0, 0], constant: 0 },
    },
  ];

  buildOrgan() {
    const neck = buildNeck({ colors: NECK_SCENE_COLORS });

    const copy = neckStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`neck-anatomy: no copy for "${id}"`);
      const meshes = neck.meshesFor(id);
      if (!meshes.length) throw new Error(`neck-anatomy: "${id}" names no mesh`);
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
          regions: NECK_SCENE_COLORS[entry.colorKey],
          natural: NECK_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes,
        ...extra,
      });
    };

    // The wrapping is what the slider takes off, in the order a neck is opened:
    // the surface first, then the muscle groups under it.
    declare('neck-surface', { baseOpacity: 0.42, doubleSided: true, ghostAt: 0.18, ghostOpacity: 0.04 });
    declare('sternocleidomastoid', { ghostAt: 0.5, ghostOpacity: 0.06 });
    declare('strap-muscles', { ghostAt: 0.58, ghostOpacity: 0.06 });
    declare('scalene-muscles', { ghostAt: 0.5, ghostOpacity: 0.06 });
    declare('posterior-neck-muscles', { ghostAt: 0.44, ghostOpacity: 0.06 });

    declare('cervical-vertebrae');
    declare('hyoid-bone');
    declare('laryngeal-cartilage', { baseOpacity: 0.86, doubleSided: true });

    // Translucent, because the one thing this scene is for — a nerve in the
    // groove behind them — is behind them from every viewpoint in front.
    declare('trachea', { baseOpacity: 0.5, doubleSided: true });
    declare('oesophagus', { baseOpacity: 0.58, doubleSided: true, preferredView: 'from-behind' });

    declare('thyroid-lobe');
    declare('thyroid-isthmus');
    declare('parathyroid-gland', { preferredView: 'from-behind' });

    // Translucent at rest so that the three things inside it stay visible; it
    // is the bundle that is the unit, not the sheath.
    declare('carotid-sheath', { baseOpacity: 0.3, doubleSided: true, ghostAt: 0.4, ghostOpacity: 0.05 });
    declare('common-carotid-artery');
    declare('internal-carotid-artery', { preferredView: 'sheath' });
    declare('external-carotid-artery', { preferredView: 'sheath' });
    declare('internal-jugular-vein');
    declare('deep-cervical-node', { preferredView: 'sheath' });

    declare('vagus-nerve', { preferredView: 'recurrent-nerves' });
    declare('recurrent-laryngeal-nerve', { preferredView: 'recurrent-nerves' });

    // Translucent, for the same reason as the airway: each of them has a nerve
    // passing round the back of it, and that is what they are here for.
    declare('subclavian-artery', { baseOpacity: 0.62, doubleSided: true, preferredView: 'recurrent-nerves' });
    declare('aortic-arch', { baseOpacity: 0.6, doubleSided: true, preferredView: 'recurrent-nerves' });

    return { object: neck.object, structures, dispose: () => neck.dispose() };
  }
}
