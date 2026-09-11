import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildSkinBlock } from '../../organs/skinBlock.js';
import {
  SKIN_ANATOMY_META,
  SKIN_COLOR_MODES,
  SKIN_NATURAL_COLORS,
  SKIN_SCENE_COLORS,
  skinStructureCopy,
} from '../../../../data/skinAnatomyScene.js';

/**
 * Skin, as a specimen.
 *
 * Every other scene here has to cut or fade to show an inside. This one does
 * not: the block already has cut sides, so the section is what the model *is*
 * rather than a viewpoint on it. The slider still exists, because the three
 * layers are opaque and what goes down through them is behind all three.
 *
 * The scene deliberately has a **surface** view as well as a cut one. Skin is
 * the one organ a reader has already seen, and starting from the face they know
 * — a surface with a hair and a pore in it — is what makes the cut mean
 * anything.
 */
export class SkinAnatomyScene extends OrganAnatomyScene {
  static meta = SKIN_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(-3.6, 3.0, 4.4),
    target: new THREE.Vector3(0, -0.05, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** A wide flat block; the widest whole view fills the frame's width at an
   *  aspect of 0.92. */
  static framing = { minHorizontalAspect: 0.95 };

  static colorModes = SKIN_COLOR_MODES;

  static views = [
    {
      id: 'block',
      label: 'The block',
      labelJa: 'ブロック全体',
      position: [-3.6, 3.0, 4.4],
      target: [0, -0.05, 0],
    },
    // The cut face, straight on: the layers as a reader would meet them in a
    // textbook, and the depth of each thing readable against them.
    {
      id: 'cut-face',
      label: 'The cut face',
      labelJa: '切断面',
      position: [0.2, 0.4, 5.6],
      target: [0.1, -0.05, 0],
    },
    // The face everyone has already seen. A hair and a pore, and nothing else.
    {
      id: 'surface',
      label: 'The surface',
      labelJa: '体表面',
      position: [-0.6, 5.2, 1.2],
      target: [-0.1, 0.6, 0.1],
    },
    // Close on the follicle: gland into the follicle, follicle into the fat.
    {
      id: 'follicle',
      label: 'Follicle and sebaceous gland',
      labelJa: '毛包と脂腺',
      position: [-2.4, 1.9, 2.9],
      target: [-0.4, 0.2, 0.5],
    },
    // Everything the layers were hiding, with the layers put away by tag.
    {
      id: 'contents',
      label: 'What goes through it',
      labelJa: '皮膚を貫くもの',
      position: [-2.8, 2.2, 3.6],
      target: [0, 0.1, 0],
      hideTags: ['layer'],
    },
  ];

  buildOrgan() {
    const skin = buildSkinBlock({ colors: SKIN_SCENE_COLORS });

    const copy = skinStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`skin-anatomy: no copy for "${id}"`);
      const mesh = skin.mesh(id);
      if (!mesh && !extra.meshes) throw new Error(`skin-anatomy: "${id}" names no mesh`);
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
          regions: SKIN_SCENE_COLORS[entry.colorKey],
          natural: SKIN_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: mesh ? [mesh] : [],
        ...extra,
      });
    };

    // The layers are what everything else is inside, so they are what fades.
    // Drawn double-sided because a slab with cut sides is looked into.
    declare('epidermis', { ghostAt: 0.24, ghostOpacity: 0.1, doubleSided: true });
    declare('dermis', { ghostAt: 0.38, ghostOpacity: 0.12, doubleSided: true });
    declare('subcutaneous-tissue', { ghostAt: 0.5, ghostOpacity: 0.1, doubleSided: true });
    // The compartment and what fills it are two structures, and the fat is many
    // lobules: one structure, fourteen meshes.
    declare('adipose-tissue', { meshes: skin.lobuleMeshes, ghostAt: 0.62, ghostOpacity: 0.16 });

    // The follicle is the tube and the hair it makes — one structure, because a
    // hair is what a follicle produces and not a separate organ.
    declare('hair-follicle', { meshes: skin.follicleMeshes, preferredView: 'follicle' });
    declare('sebaceous-gland', { preferredView: 'follicle' });
    declare('sweat-gland', { meshes: skin.sweatMeshes, preferredView: 'contents' });

    declare('arteriole', { preferredView: 'contents' });
    declare('venule', { preferredView: 'contents' });
    declare('sensory-nerve', { preferredView: 'contents' });

    return { object: skin.object, structures, dispose: () => skin.dispose() };
  }
}
