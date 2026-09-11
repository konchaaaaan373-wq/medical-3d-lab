import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildSpine } from '../../organs/spine.js';
import {
  SPINE_ANATOMY_META,
  SPINE_COLOR_MODES,
  SPINE_NATURAL_COLORS,
  SPINE_SCENE_COLORS,
  spineStructureCopy,
} from '../../../../data/spineAnatomyScene.js';

/**
 * The spine, whole and then one segment of it.
 *
 * The detailed level stays **in the column, in its place, at the same scale**.
 * Enlarging it or lifting it out would make the scene easier to read and would
 * also make it a diagram of two things rather than a model of one — so the way
 * to it is a viewpoint, and the scene is arranged so that moving between the
 * two is moving a camera.
 */
export class SpineAnatomyScene extends OrganAnatomyScene {
  static meta = SPINE_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(-5.2, 1.6, 11.6),
    target: new THREE.Vector3(0, 0.4, -0.1),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** A whole column: tall and narrow. The widest whole view fills the frame's
   *  width at an aspect of 0.21. */
  static framing = { minHorizontalAspect: 0.24 };

  static colorModes = SPINE_COLOR_MODES;

  static views = [
    { id: 'column', label: 'The whole column', labelJa: '脊柱全体', position: [-5.2, 1.6, 11.6], target: [0, 0.4, -0.1] },
    // From the side, which is the only view the three curves exist in.
    {
      id: 'lateral',
      label: 'From the side — the curves',
      labelJa: '側面（弯曲）',
      position: [12.6, 0.9, 0.7],
      target: [0, 0.4, -0.2],
    },
    { id: 'posterior', label: 'From behind', labelJa: '背面', position: [0.5, 1.1, -12.0], target: [0, 0.4, -0.2] },
    // The detailed level, reached by coming close to it rather than by
    // enlarging it.
    {
      id: 'segment',
      label: 'One segment, close',
      labelJa: '1椎間を近くで見る',
      position: [-1.5, -0.55, 2.1],
      target: [0, -1.1, 0.1],
    },
    // The same level from behind and below: the arch, the facets and the roots.
    {
      id: 'arch',
      label: 'The arch and the roots',
      labelJa: '椎弓と神経根',
      position: [-1.2, -0.7, -1.9],
      target: [0, -1.1, -0.3],
    },
    // What is in the canal, with the bone put away.
    {
      id: 'canal',
      label: 'What is in the canal',
      labelJa: '脊柱管の中',
      position: [-3.4, 1.0, 10.4],
      target: [0, 0.4, -0.4],
      hideTags: ['region', 'segment'],
    },
  ];

  buildOrgan() {
    const spine = buildSpine({ colors: SPINE_SCENE_COLORS });

    const copy = spineStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`spine-anatomy: no copy for "${id}"`);
      const mesh = spine.mesh(id);
      if (!mesh && !extra.meshes) throw new Error(`spine-anatomy: "${id}" names no mesh`);
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
          regions: SPINE_SCENE_COLORS[entry.colorKey],
          natural: SPINE_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: mesh ? [mesh] : [],
        ...extra,
      });
    };

    // The regions: one structure each, however many blocks they are drawn as.
    declare('cervical-spine', { meshes: spine.regionMeshes.cervical, ghostAt: 0.34, ghostOpacity: 0.1 });
    declare('thoracic-spine', { meshes: spine.regionMeshes.thoracic, ghostAt: 0.34, ghostOpacity: 0.1 });
    declare('lumbar-spine', { meshes: spine.regionMeshes.lumbar, ghostAt: 0.34, ghostOpacity: 0.1 });
    declare('sacrum', { ghostAt: 0.34, ghostOpacity: 0.1 });

    // The one level drawn properly.
    declare('vertebral-body', { ghostAt: 0.42, ghostOpacity: 0.12, preferredView: 'segment' });
    declare('pedicle', { meshes: spine.pedicleMeshes, ghostAt: 0.5, ghostOpacity: 0.12, preferredView: 'arch' });
    declare('lamina', { meshes: spine.laminaMeshes, ghostAt: 0.5, ghostOpacity: 0.12, preferredView: 'arch' });
    declare('facet-joint', { meshes: spine.facetMeshes, preferredView: 'arch' });
    declare('spinous-process', { ghostAt: 0.5, ghostOpacity: 0.12, preferredView: 'arch' });

    declare('annulus-fibrosus', { preferredView: 'segment', doubleSided: true });
    declare('nucleus-pulposus', { revealAt: 0.3, preferredView: 'segment' });

    // The canal is a space: see-through at rest, so what is in it can be
    // followed through it without waiting for the slider.
    declare('spinal-canal', { baseOpacity: 0.16, doubleSided: true, preferredView: 'canal' });
    declare('spinal-cord', { preferredView: 'canal' });
    declare('cauda-equina', { meshes: spine.caudaMeshes, preferredView: 'canal' });
    declare('nerve-root', { meshes: spine.rootMeshes, preferredView: 'arch' });

    return { object: spine.object, structures, dispose: () => spine.dispose() };
  }
}
