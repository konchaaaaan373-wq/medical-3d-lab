import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildUterusParts } from '../../organs/uterusParts.js';
import { buildBladder } from '../../../renal/organs/kidney.js';
import { TubeSurface, smoothCurve } from '../../../shared/geometry/tube.js';
import { wallMaterial } from '../../../shared/materials.js';
import {
  UTERUS_ANATOMY_META,
  UTERUS_COLOR_MODES,
  UTERUS_NATURAL_COLORS,
  UTERUS_SCENE_COLORS,
  uterusStructureCopy,
} from '../../../../data/uterusAnatomyScene.js';

/**
 * The uterus, as a thing you can point at.
 *
 * `uterine-cycle` is about a lining that thickens and sheds. This is about
 * which part is which, and about the one thing that cannot be seen from
 * outside: the cavity is a flattened triangle whose corners are the two tubal
 * openings and the start of the cervical canal.
 *
 * ## It is tipped forward, because that is how it lies
 *
 * The organ is **built** in its own upright frame — the planes that cut fundus
 * from body from isthmus from cervix are horizontal in that frame, which is
 * what makes them readable as anatomy rather than as arithmetic
 * (`docs/architecture-rules.md` rule 2). It is **shown** anteverted: the whole
 * assembly is tipped forward over the bladder, which is where a uterus is.
 *
 * The bladder in front and the rectum behind are drawn for that reason and no
 * other. Without them "tipped forward" is a rotation with nothing to be tipped
 * relative to, and the "In the pelvis" viewpoint is the one that reads it.
 */

/**
 * How far forward the body of the uterus leans, in radians.
 *
 * Anteversion is the angle between the axis of the uterus and the axis of the
 * vagina, and in most people it is a right angle or near it. This is a single
 * rigid tilt rather than a bend, so it stands for anteversion; **anteflexion —
 * the further forward bend between body and cervix — is not modelled**, and the
 * card says so.
 */
const ANTEVERSION = 0.72;
export class UterusAnatomyScene extends OrganAnatomyScene {
  static meta = UTERUS_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(0, 0.55, 5.4),
    target: new THREE.Vector3(0, 0.05, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** Tubes and ovaries out to both sides make the subject wider than it is tall. */
  static framing = { minHorizontalAspect: 1.0 };

  /** The vagina is drawn so the cervical canal opens into somewhere. */
  static contextTags = ['neighbour'];

  static colorModes = UTERUS_COLOR_MODES;

  static views = [
    { id: 'anterior', label: 'Anterior', labelJa: '前面', position: [0, 0.55, 5.4], target: [0, 0.05, 0] },
    // The view anteversion is read from: from the side, with the bladder in
    // front and the rectum behind.
    {
      id: 'pelvis',
      label: 'In the pelvis, from the left',
      labelJa: '骨盤内での向き（左側から）',
      position: [7.4, 0.9, 0.5],
      target: [0, -0.05, 0.1],
    },
    { id: 'posterior', label: 'Posterior', labelJa: '背面', position: [0, 0.55, -5.4], target: [0, 0.05, 0] },
    {
      id: 'adnexa',
      label: 'Tube and ovary',
      labelJa: '卵管と卵巣',
      position: [2.4, 1.1, 2.4],
      target: [1.35, 0.5, 0.3],
    },
    {
      id: 'coronal-section',
      label: 'Coronal section',
      labelJa: '前額断（切断）',
      position: [0, 0.55, 5.6],
      target: [0, 0.05, 0],
      section: { normal: [0, 0, -1], constant: 0.05 },
    },
  ];

  buildOrgan() {
    const object = new THREE.Group();
    object.name = 'uterus-in-the-pelvis';

    const uterus = buildUterusParts({ colors: UTERUS_SCENE_COLORS });
    // Built upright, shown tipped forward. The tilt is here rather than in the
    // builder so the organ's own parts stay in the organ's own frame, which is
    // where their boundaries are defined.
    const anteverted = new THREE.Group();
    anteverted.name = 'anteverted';
    anteverted.rotation.x = ANTEVERSION;
    anteverted.add(uterus.object);

    // In front of it and behind it. Both are context, and both are the reason
    // "tipped forward" says anything.
    const bladder = buildBladder({ color: UTERUS_SCENE_COLORS.bladder });
    bladder.setFill(0.45);
    bladder.object.position.set(0, -0.66, 1.42);
    bladder.object.scale.setScalar(0.82);

    const rectumSurface = new TubeSurface(
      smoothCurve([
        [0, 1.25, -1.72],
        [0, 0.35, -1.62],
        [0, -0.5, -1.42],
        [0, -1.35, -1.22],
      ]),
      { radius: () => 0.26, steps: 34, radial: 18 }
    );
    const rectumMaterial = wallMaterial({ color: UTERUS_SCENE_COLORS.rectum, opacity: 0.72 });
    const rectum = new THREE.Mesh(rectumSurface.geometry, rectumMaterial);
    rectum.name = 'rectum';

    object.add(anteverted, bladder.object, rectum);

    const copy = uterusStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`uterus-anatomy: no copy for "${id}"`);
      const mesh = extra.mesh ?? uterus.mesh(id);
      if (!mesh) throw new Error(`uterus-anatomy: "${id}" names no mesh`);
      const { mesh: _ignored, ...rest } = extra;
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
          regions: UTERUS_SCENE_COLORS[entry.colorKey],
          natural: UTERUS_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: [mesh],
        ...rest,
      });
    };

    const wall = { ghostAt: 0.35, ghostOpacity: 0.12 };
    for (const id of ['fundus', 'body', 'isthmus', 'cervix']) declare(id, wall);
    // A flat patch has a back as well as a front.
    declare('uterine-cavity', { revealAt: 0.3, doubleSided: true });
    declare('cervical-canal', { revealAt: 0.3 });
    for (const id of ['right-fallopian-tube', 'left-fallopian-tube']) declare(id, { preferredView: 'adnexa' });
    for (const id of ['right-ovary', 'left-ovary']) declare(id, { preferredView: 'adnexa' });
    declare('vagina', { ghostAt: 0.55, ghostOpacity: 0.14 });
    declare('bladder', { mesh: bladder.object.children[0], ghostAt: 0.2, ghostOpacity: 0.12, preferredView: 'pelvis' });
    declare('rectum', { mesh: rectum, ghostAt: 0.2, ghostOpacity: 0.12, preferredView: 'pelvis' });

    return {
      object,
      structures,
      dispose: () => {
        uterus.dispose();
        rectumSurface.dispose();
        rectumMaterial.dispose();
      },
    };
  }
}
