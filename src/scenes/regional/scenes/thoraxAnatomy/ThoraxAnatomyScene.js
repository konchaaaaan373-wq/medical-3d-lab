import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { LEFT, buildThorax } from '../../organs/thorax.js';
import {
  THORAX_ANATOMY_META,
  THORAX_COLOR_MODES,
  THORAX_NATURAL_COLORS,
  THORAX_SCENE_COLORS,
  thoraxStructureCopy,
} from '../../../../data/thoraxAnatomyScene.js';

/**
 * A chest, opened in the order a chest is opened.
 *
 * The layer slider takes away **the wall** — the cage first, then the spaces
 * and the pleura behind them — because that is the only part of a chest that
 * can be removed without moving anything. Nothing inside is moved: the whole
 * point of the region is that its contents have nowhere else to be.
 *
 * The viewpoints are the pictures this anatomy is drawn as. From in front,
 * which is how it is approached; the cage on its own, because the slope of the
 * ribs is a fact about the cage and not about what is in it; the two lungs with
 * the slab between them, where the left lung's notch is; the mediastinum with
 * the lungs put away; **one hilum close up, which is what the scene is for**;
 * the bottom of the cavities, which no lung reaches; and from behind, where the
 * gullet and the descending aorta are.
 */
export class ThoraxAnatomyScene extends OrganAnatomyScene {
  static meta = THORAX_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(8.0, 5.2, 18.4),
    target: new THREE.Vector3(0, -0.9, 0),
  };

  static lightRig = { key: 32, fill: 1.0, rim: 16 };

  /** Wider than it is tall, which is the one thing a chest reliably is. */
  static framing = { minHorizontalAspect: 1.1 };

  static colorModes = THORAX_COLOR_MODES;

  static views = [
    {
      id: 'whole',
      label: 'The chest from in front',
      labelJa: '前方から見た胸部',
      position: [8.0, 5.2, 18.4],
      target: [0, -0.9, 0],
    },
    // The cage on its own. The slope of the ribs is a fact about the cage, and
    // with anything inside it the slope is the first thing that stops reading.
    {
      id: 'cage',
      label: 'The cage on its own',
      labelJa: '胸郭だけを見る',
      position: [7.4, 4.4, 17.6],
      target: [0, -1.4, 0],
      hideTags: ['pleura', 'lung', 'mediastinum', 'heart', 'airway', 'vessel', 'nerve', 'floor'],
    },
    // Two lungs and the slab between them: where the left lung's notch is, and
    // why it is there.
    {
      id: 'lungs-in-place',
      label: 'Two lungs and what is between them',
      labelJa: '2つの肺と、その間にあるもの',
      position: [6.4, 3.2, 17.8],
      target: [0, -1.2, 0.4],
      hideTags: ['cage', 'space', 'pleura'],
    },
    // The slab, with the lungs put away rather than pushed aside.
    {
      id: 'mediastinum',
      label: 'The mediastinum, with the lungs put away',
      labelJa: '縦隔だけを見る（肺を非表示）',
      position: [5.6, 2.6, 16.2],
      target: [0, -1.6, 0.2],
      hideTags: ['cage', 'space', 'pleura', 'lung'],
    },
    // **What the scene is for.** One root of one lung, with a nerve on each
    // face of it.
    {
      id: 'hilum',
      label: 'In front of the root, and behind it',
      labelJa: '肺門の前と後ろ',
      position: [15.4, 1.8, 7.4],
      target: [LEFT * 1.6, -1.1, -0.2],
      hideTags: ['cage', 'space', 'pleura', 'lung'],
    },
    // The bottom of the cavities. The lung stops well above it.
    {
      id: 'recess',
      label: 'Where a lung stops and the cavity does not',
      labelJa: '肺が届かない胸膜腔の底',
      position: [5.8, -3.6, 16.4],
      target: [0, -4.4, 0.2],
      hideTags: ['cage', 'space', 'mediastinum', 'heart', 'airway', 'vessel'],
    },
    // From behind: the one structure that runs the whole length, and the vessel
    // that runs down beside it.
    {
      id: 'from-behind',
      label: 'From behind',
      labelJa: '背面から',
      position: [-5.0, 2.6, -17.8],
      target: [0, -1.4, -0.4],
      hideTags: ['cage', 'space', 'pleura', 'lung'],
    },
  ];

  buildOrgan() {
    const thorax = buildThorax({ colors: THORAX_SCENE_COLORS });

    const copy = thoraxStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`thorax-anatomy: no copy for "${id}"`);
      const meshes = thorax.meshesFor(id);
      if (!meshes.length) throw new Error(`thorax-anatomy: "${id}" names no mesh`);
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
          regions: THORAX_SCENE_COLORS[entry.colorKey],
          natural: THORAX_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes,
        ...extra,
      });
    };

    // The wall is what the slider takes off, in the order a chest is opened:
    // the cage first, then the spaces and the lining behind them.
    declare('manubrium', { ghostAt: 0.36, ghostOpacity: 0.06 });
    declare('sternal-body', { ghostAt: 0.36, ghostOpacity: 0.06 });
    declare('xiphoid-process', { ghostAt: 0.36, ghostOpacity: 0.06 });
    declare('ribs', { ghostAt: 0.4, ghostOpacity: 0.07 });
    declare('costal-cartilages', { ghostAt: 0.4, ghostOpacity: 0.07 });
    declare('thoracic-vertebrae', { ghostAt: 0.62, ghostOpacity: 0.08 });
    declare('intercostal-space', { baseOpacity: 0.4, doubleSided: true, ghostAt: 0.3, ghostOpacity: 0.05 });
    declare('intercostal-bundle', { ghostAt: 0.52, ghostOpacity: 0.08 });
    declare('diaphragm', { baseOpacity: 0.78, doubleSided: true });

    // The bags. Translucent at rest, because everything the scene is about is
    // inside them.
    declare('parietal-pleura', { baseOpacity: 0.2, doubleSided: true, ghostAt: 0.5, ghostOpacity: 0.05 });
    // Not faded with the rest: it is the answer to one of the scene's
    // questions, and a reader looking for it needs it all the way down.
    declare('costodiaphragmatic-recess', { baseOpacity: 0.34, doubleSided: true, preferredView: 'recess' });

    declare('right-lung');
    declare('left-lung', { preferredView: 'lungs-in-place' });

    // The slab is a space, so it is nearly clear; what is in it is not.
    declare('mediastinum', { baseOpacity: 0.15, doubleSided: true, ghostAt: 0.72, ghostOpacity: 0.04 });
    declare('heart');
    declare('pericardium', { baseOpacity: 0.24, doubleSided: true });
    declare('trachea-and-bronchi', { baseOpacity: 0.82, doubleSided: true });
    declare('oesophagus', { baseOpacity: 0.76, doubleSided: true, preferredView: 'from-behind' });

    declare('aorta');
    declare('venae-cavae');
    declare('pulmonary-arteries');

    declare('phrenic-nerve', { preferredView: 'hilum' });
    declare('vagus-nerve', { preferredView: 'hilum' });

    return { object: thorax.object, structures, dispose: () => thorax.dispose() };
  }
}
