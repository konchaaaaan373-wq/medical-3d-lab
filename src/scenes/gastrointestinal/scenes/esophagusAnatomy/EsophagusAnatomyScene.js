import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildEsophagusParts } from '../../organs/esophagusParts.js';
import {
  ESOPHAGUS_ANATOMY_META,
  ESOPHAGUS_COLOR_MODES,
  ESOPHAGUS_NATURAL_COLORS,
  ESOPHAGUS_SCENE_COLORS,
  esophagusStructureCopy,
} from '../../../../data/esophagusAnatomyScene.js';

/**
 * The oesophagus, as a thing you can point at.
 *
 * The slider does two things at once, and they are the same thing seen from two
 * sides: the **trachea steps back**, because it stands in front of the whole
 * upper oesophagus and hides it, and the three structures that make the lower
 * two narrowings **come up**. The tube itself never fades — it is the subject
 * from the first frame, and what the slider adds is the reason it is narrow
 * where it is.
 */
export class EsophagusAnatomyScene extends OrganAnatomyScene {
  static meta = ESOPHAGUS_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(0.3, 0.1, 8.6),
    target: new THREE.Vector3(0.25, -0.05, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /**
   * A tall thin tube: it is the height that sets the frame, not the width.
   * The whole-tube views fill the frame's width at an aspect of 0.13, so there
   * is almost nothing to reserve — the distances above were set by what it
   * takes to get the tube inside the frame at all.
   */
  static framing = { minHorizontalAspect: 0.15 };

  /** What crosses it and what it passes through. */
  static contextTags = ['neighbour'];

  static colorModes = ESOPHAGUS_COLOR_MODES;

  static views = [
    { id: 'anterior', label: 'Anterior', labelJa: '前面', position: [0.3, 0.1, 8.6], target: [0.25, -0.05, 0] },
    // The arch is behind it and the bronchus in front, so the relation is only
    // legible from the side.
    { id: 'left', label: 'From the patient’s left', labelJa: '左側から', position: [8.6, 0.3, 0.6], target: [0.25, -0.05, 0] },
    {
      id: 'crossing',
      label: 'Where the arch and bronchus cross',
      labelJa: '大動脈弓・気管支の交叉部',
      position: [2.6, 0.9, 2.6],
      target: [0.35, 0.4, -0.1],
    },
    {
      id: 'hiatus',
      label: 'Through the diaphragm',
      labelJa: '横隔膜の貫通部',
      position: [0.6, -1.3, 2.8],
      target: [0.1, -1.65, -0.1],
    },
    {
      id: 'coronal-section',
      label: 'Coronal section',
      labelJa: '前額断（切断）',
      position: [0.3, 0.1, 8.8],
      target: [0.25, -0.05, 0],
      section: { normal: [0, 0, -1], constant: 0.1 },
    },
  ];

  buildOrgan() {
    const esophagus = buildEsophagusParts({ colors: ESOPHAGUS_SCENE_COLORS });

    const copy = esophagusStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`esophagus-anatomy: no copy for "${id}"`);
      const mesh = esophagus.mesh(id);
      if (!mesh) throw new Error(`esophagus-anatomy: "${id}" names no mesh`);
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
          regions: ESOPHAGUS_SCENE_COLORS[entry.colorKey],
          natural: ESOPHAGUS_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: [mesh],
        ...extra,
      });
    };

    for (const id of ['cervical', 'thoracic', 'abdominal']) declare(id);
    for (const id of [
      'cricopharyngeal-constriction',
      'aortobronchial-constriction',
      'diaphragmatic-constriction',
    ]) {
      declare(id);
    }
    // The trachea is the one neighbour that is in the way rather than useful:
    // it stands in front of the whole cervical and upper thoracic oesophagus
    // and hides it. So it is there from the start and steps back, while the
    // three that explain a narrowing arrive.
    declare('trachea', { ghostAt: 0.25, ghostOpacity: 0.15 });
    declare('left-main-bronchus', { revealAt: 0.25, preferredView: 'crossing' });
    declare('aortic-arch', { revealAt: 0.25, preferredView: 'crossing' });
    declare('diaphragm', { revealAt: 0.25, preferredView: 'hiatus' });
    declare('gastric-cardia', { revealAt: 0.25 });

    return { object: esophagus.object, structures, dispose: () => esophagus.dispose() };
  }
}
