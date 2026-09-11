import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildOralCavity } from '../../organs/oralCavity.js';
import {
  ORAL_ANATOMY_META,
  ORAL_COLOR_MODES,
  ORAL_NATURAL_COLORS,
  ORAL_SCENE_COLORS,
  oralStructureCopy,
} from '../../../../data/oralAnatomyScene.js';

/**
 * A mouth, looked into and then looked under.
 *
 * The scene opens on the view a mouth is actually looked at from — from in
 * front, into an open one — because that is the only view in which a reader
 * recognises what they are looking at. The layer slider then fades the **jaw
 * and the tongue**, which is what everything under and outside the mouth is
 * behind; nothing is moved out of anything.
 *
 * The glands are the reason for the last two viewpoints. All three pairs sit
 * outside the mouth, and the fact worth seeing is that **where a duct opens is
 * nowhere near the gland it comes from** — which needs the gland, the duct and
 * the opening all in one frame.
 */
export class OralAnatomyScene extends OrganAnatomyScene {
  static meta = ORAL_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(1.0, 0.7, 12.2),
    target: new THREE.Vector3(0, -1.0, -0.8),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** Five units across against seven deep; the widest of the views meant to
   *  show the whole of it fills the width at 1.0. */
  static framing = { minHorizontalAspect: 1.05 };

  static colorModes = ORAL_COLOR_MODES;

  static views = [
    // "Open wide": the one view in which a reader knows what they are seeing.
    {
      id: 'whole',
      label: 'Looking into the mouth',
      labelJa: '口の中を見る',
      position: [1.0, 0.7, 12.2],
      target: [0, -1.0, -0.8],
    },
    {
      id: 'from-the-side',
      label: 'From the side',
      labelJa: '側面から',
      position: [11.0, 1.76, 3.06],
      target: [0, -1.0, -0.2],
    },
    // Down onto the tongue, with the roof out of the way: the row of large
    // papillae, the V they lie in, and the boundary they mark.
    {
      id: 'tongue',
      label: 'Down onto the tongue',
      labelJa: '舌を上から',
      position: [0, 6.4, 2.4],
      target: [0, -1.2, -0.1],
      hideTags: ['roof'],
    },
    // Under it. The jaw goes too, because the jaw is what is in front of the
    // floor of the mouth from below.
    {
      id: 'underneath',
      label: 'Under the tongue',
      labelJa: '舌の下',
      position: [0.8, -5.4, 5.4],
      target: [0, -1.9, 1.0],
      hideTags: ['roof', 'tongue', 'bone'],
    },
    {
      id: 'glands',
      label: 'The three pairs of glands',
      labelJa: '3対の唾液腺',
      position: [6.6, -1.2, 6.0],
      target: [0.2, -1.5, -0.2],
      hideTags: ['tongue', 'roof'],
    },
    // A real cut on the midline: roof, tongue, floor and the doorway behind,
    // which is how a mouth is drawn when the point is the whole of it at once.
    {
      id: 'sagittal',
      label: 'Cut down the midline',
      labelJa: '正中断（切断）',
      position: [-10.5, 0.55, 2.44],
      target: [0, -0.9, 0.1],
      section: { normal: [1, 0, 0], constant: 0 },
    },
  ];

  buildOrgan() {
    const mouth = buildOralCavity({ colors: ORAL_SCENE_COLORS });

    const copy = oralStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`oral-anatomy: no copy for "${id}"`);
      const meshes = mouth.meshesFor(id);
      if (!meshes.length) throw new Error(`oral-anatomy: "${id}" names no mesh`);
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
          regions: ORAL_SCENE_COLORS[entry.colorKey],
          natural: ORAL_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes,
        ...extra,
      });
    };

    // The frame of the opening. Part-transparent at rest because the whole
    // scene is behind it.
    declare('lips', { baseOpacity: 0.3, doubleSided: true, ghostAt: 0.22, ghostOpacity: 0.05 });

    declare('hard-palate', { doubleSided: true });
    declare('soft-palate', { doubleSided: true });
    declare('palatoglossal-arch');
    declare('palatine-tonsil');

    declare('upper-teeth');
    // The jaw and the row of teeth on it are what the floor and the glands are
    // behind, so they are what the slider takes away.
    declare('lower-teeth', { ghostAt: 0.4, ghostOpacity: 0.1 });
    declare('mandible', { ghostAt: 0.4, ghostOpacity: 0.08 });

    declare('tongue-oral-part', { doubleSided: true, ghostAt: 0.52, ghostOpacity: 0.1 });
    declare('tongue-root', { doubleSided: true, ghostAt: 0.52, ghostOpacity: 0.1 });
    // Not faded with the tongue: the row of papillae is the only mark of the
    // boundary, and it is what the tongue's two parts are a claim about.
    declare('vallate-papillae', { preferredView: 'tongue' });
    declare('lingual-tonsil', { preferredView: 'tongue' });

    declare('floor-of-mouth', { doubleSided: true, preferredView: 'underneath' });
    declare('lingual-frenulum', { doubleSided: true, preferredView: 'underneath' });

    declare('sublingual-gland', { preferredView: 'glands' });
    declare('submandibular-gland', { preferredView: 'glands' });
    declare('submandibular-duct', { preferredView: 'glands' });
    declare('parotid-gland', { preferredView: 'glands' });
    declare('parotid-duct', { preferredView: 'glands' });

    return { object: mouth.object, structures, dispose: () => mouth.dispose() };
  }
}
