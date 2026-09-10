import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildLungs } from '../../organs/lungs.js';
import {
  LUNG_ANATOMY_META,
  LUNG_COLOR_MODES,
  LUNG_NATURAL_PALETTE,
  LUNG_SCENE_PALETTE,
  lungStructureCopy,
} from '../../../../data/lungAnatomyScene.js';

/**
 * The lungs, as a thing you can point at.
 *
 * Nothing here models a lung. `buildLungs` already carves five lobes out of two
 * pleural surfaces and draws the bronchial and vascular trees through them, and
 * five disease scenes already use it — this scene asks it for the same lungs
 * with the trees switched on and then does the one thing none of those scenes
 * needed: it gives every mesh a name, so that a click resolves to a structure
 * and a structure resolves back to a row in the part tree.
 *
 * ## What is claimed
 *
 * The **divisions** — five lobes, the fissures between them, eighteen
 * bronchopulmonary segments each with one segmental bronchus and one artery,
 * veins running between segments rather than inside them, RALS at the hilum,
 * a right main bronchus shorter and steeper than the left. Those are the
 * relations `tests/lung-anatomy.test.js` measures.
 *
 * What is **not** claimed is any particular airway. The calibres and the
 * courses are drawn to read clearly rather than measured from a specimen, real
 * branching is markedly asymmetric where this is regular, and the difference
 * between the two main bronchi is understated because the two lungs are placed
 * symmetrically and a heart is not displacing the left hilum.
 * `docs/medical-notes.md` carries that list; the model card says it in the
 * product.
 *
 * ## The layer slider
 *
 * At 0 the parenchyma is solid and the reader is looking at lobes. Past the
 * middle the lobes fade to a hint and the trees inside them come up in place —
 * fading rather than pulling apart, because a bronchus lifted out of the lung
 * is no longer where it is.
 */
export class LungAnatomyScene extends OrganAnatomyScene {
  static meta = LUNG_ANATOMY_META;

  // Close enough that the lungs fill the frame. At the distance this opened at
  // first, the model sat in the middle third of the canvas and the fissures —
  // the thing a reader is here to see — were a few pixels apart.
  static cameraPose = {
    position: new THREE.Vector3(0, 1.05, 7.9),
    target: new THREE.Vector3(0, 1.0, 0),
  };

  static lightRig = { key: 32, fill: 0.95, rim: 16 };

  static colorModes = LUNG_COLOR_MODES;

  static legendPalettes = {
    lobes: LUNG_SCENE_PALETTE,
    natural: {
      rightUpper: LUNG_NATURAL_PALETTE.parenchyma,
      rightMiddle: LUNG_NATURAL_PALETTE.parenchyma,
      rightLower: LUNG_NATURAL_PALETTE.parenchyma,
      leftUpper: LUNG_NATURAL_PALETTE.parenchyma,
      leftLower: LUNG_NATURAL_PALETTE.parenchyma,
      airway: LUNG_NATURAL_PALETTE.airway,
      artery: LUNG_NATURAL_PALETTE.artery,
      vein: LUNG_NATURAL_PALETTE.vein,
    },
  };

  /**
   * The viewpoints, and the two ways of taking tissue away that are not the
   * layer slider.
   *
   * `hideTags` removes a whole lung — the mediastinal views, where the point is
   * to look at the surface the other lung was against. `section` cuts: the
   * anterior half is not there any more, and the inside of what is left is on
   * show. Neither is the slider's fade, and a reader should be able to tell
   * which of the three they are looking at.
   */
  static views = [
    { id: 'anterior', label: 'Anterior', labelJa: '前面', position: [0, 1.05, 7.9], target: [0, 1.0, 0] },
    { id: 'posterior', label: 'Posterior', labelJa: '背面', position: [0, 1.05, -7.9], target: [0, 1.0, 0] },
    { id: 'right-lateral', label: 'Right lateral', labelJa: '右外側', position: [-7.0, 0.6, 0], target: [-1.24, 0.5, 0] },
    { id: 'left-lateral', label: 'Left lateral', labelJa: '左外側', position: [7.0, 0.6, 0], target: [1.24, 0.5, 0] },
    {
      id: 'right-mediastinal',
      label: 'Right lung, mediastinal surface',
      labelJa: '右肺・縦隔面',
      position: [6.6, 0.6, 0.4],
      target: [-1.24, 0.5, 0],
      hideTags: ['left'],
    },
    {
      id: 'coronal-section',
      label: 'Coronal section',
      labelJa: '前額断（切断）',
      position: [0, 1.05, 7.9],
      target: [0, 1.0, 0],
      section: { normal: [0, 0, -1], constant: 0.15 },
    },
  ];

  buildOrgan() {
    // The same builder five disease scenes use, asked for the trees as well.
    // `excursion: 0` because nothing here breathes: this is anatomy, and a lung
    // that inflates while a reader is trying to point at a segmental bronchus
    // is moving the target.
    const lungs = buildLungs({ bronchi: true, vessels: true, excursion: 0, detail: 12 });
    const copy = lungStructureCopy();
    const structures = [];

    /** Look a mesh up by the name its builder gave it, and name it properly. */
    const declare = (id, meshes, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`lung-anatomy: no copy for "${id}"`);
      const present = meshes.filter(Boolean);
      // A structure with no mesh is a row in the tree that selects nothing. It
      // is the one failure this scene exists to prevent, so it is an error at
      // build time rather than an empty row at read time.
      if (!present.length) throw new Error(`lung-anatomy: "${id}" names no mesh`);
      structures.push({
        id,
        name: entry.name,
        nameJa: entry.nameJa,
        hierarchy: entry.hierarchy,
        hierarchyJa: entry.hierarchyJa,
        description: entry.description,
        descriptionJa: entry.descriptionJa,
        tags: entry.tags,
        colors: {
          lobes: LUNG_SCENE_PALETTE[entry.paletteKey],
          natural: LUNG_NATURAL_PALETTE[entry.naturalKey],
        },
        legendKey: entry.paletteKey,
        meshes: present,
        ...extra,
      });
    };

    for (const lobe of lungs.lobes) {
      declare(`lobe:${lobe.id}`, [lobe.mesh], {
        baseOpacity: 1,
        // The parenchyma is what you see first and what has to get out of the
        // way second. Nothing else in this scene fades.
        ghostAt: 0.5,
        ghostOpacity: 0.085,
      });
    }

    const byName = (tree) => new Map(lungs[tree].branches.map((branch) => [branch.name, branch.mesh]));
    const bronchi = byName('bronchi');
    const arteries = byName('arteries');
    const veins = byName('veins');

    // Outside the lung: visible from the first frame, because it is not
    // something the reader has to open the lung to reach.
    declare('airway:trachea', [bronchi.get('trachea')]);
    for (const side of ['right', 'left']) {
      declare(`airway:${side}-main-bronchus`, [bronchi.get(`${side}-main-bronchus`)]);
      declare(`artery:${side}-pulmonary-artery`, [arteries.get(`${side}-pulmonary-artery`)]);
      for (const which of ['superior', 'inferior']) {
        declare(`vein:${side}-${which}-pulmonary-vein`, [veins.get(`${side}-${which}-pulmonary-vein`)]);
      }
    }

    // Inside the lung: revealed as the parenchyma fades, so the two happen
    // together rather than one leaving a gap.
    const inner = { revealAt: 0.5 };
    const segmental = { revealAt: 0.78 };

    for (const lobe of lungs.lobes) {
      declare(`airway:${lobe.id}-lobar-bronchus`, [bronchi.get(`${lobe.id}-lobar-bronchus`)], inner);
      declare(`artery:${lobe.id}-lobar-artery`, [arteries.get(`${lobe.id}-lobar-artery`)], inner);
      // Every tributary of one lobe is one structure. They are drawn one per
      // pair of neighbouring segments and none of them has a name of its own;
      // listing them separately would put rows in the tree that answer to an
      // index rather than to anatomy.
      const tributaries = lungs.veins.branches
        .filter((branch) => branch.name.startsWith(`${lobe.id}-intersegmental-vein-`))
        .map((branch) => branch.mesh);
      declare(`vein:${lobe.id}-intersegmental-veins`, tributaries, inner);
    }

    for (const segment of lungs.segments) {
      declare(`airway:${segment.id}-segmental-bronchus`, [bronchi.get(`${segment.id}-segmental-bronchus`)], segmental);
      declare(`artery:${segment.id}-segmental-artery`, [arteries.get(`${segment.id}-segmental-artery`)], segmental);
    }


    return { object: lungs.object, structures, dispose: () => lungs.dispose() };
  }

}
