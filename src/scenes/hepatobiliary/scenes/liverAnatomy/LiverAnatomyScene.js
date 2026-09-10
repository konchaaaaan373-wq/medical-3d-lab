import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildGallbladder, buildLiver } from '../../organs/liver.js';
import {
  LIVER_ANATOMY_META,
  LIVER_COLOR_MODES,
  LIVER_SEGMENT_COLORS,
  LIVER_VESSEL_COLORS,
  liverStructureCopy,
} from '../../../../data/liverAnatomyScene.js';

/**
 * The liver, as a thing you can point at.
 *
 * `buildLiver` already carves nine Couinaud parts out of one liver and, when
 * asked, draws the two vascular trees through them. This scene asks for both
 * and names every mesh, which is what turns a carved liver into an atlas.
 *
 * ## The claim, and the shape of it
 *
 * The **divisions** are the claim: nine parts whose union is the liver, cut on
 * the planes Couinaud's scheme uses, with the hepatic veins drawn on the very
 * planes that divide them and the portal pedicles drawn inside them. That
 * difference — outflow between segments, inflow within them — is the reason a
 * segment can be taken out on its own, and it is what
 * `tests/liver-anatomy.test.js` measures, along with Cantlie's line being held
 * apart from the falciform ligament.
 *
 * The **outer form** is not a claim. It is a warped ellipsoid with a liver's
 * proportions, not a specimen: it has no porta hepatis notch of its own, no
 * bare area, and no bile ducts. The model card says so, and the note on the
 * gallbladder says so where a reader is looking at it.
 *
 * ## The colours
 *
 * Nine shades of liver is what the organ actually looks like and is useless
 * here: at that separation nobody can see where VII stops and VIII starts, and
 * a boundary nobody can see is not a boundary the scene has shown. So the
 * default mode separates the nine, and the natural mode puts them back — two
 * readings of one unmoved set of meshes, neither of which touches the geometry.
 */
export class LiverAnatomyScene extends OrganAnatomyScene {
  static meta = LIVER_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(0.2, 1.1, 5.3),
    target: new THREE.Vector3(0, -0.05, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  static colorModes = LIVER_COLOR_MODES;

  static views = [
    { id: 'anterior', label: 'Anterior', labelJa: '前面', position: [0.2, 1.1, 5.3], target: [0, -0.05, 0] },
    // The visceral surface is where the porta hepatis and the gallbladder are,
    // so it is a view and not merely a camera angle.
    { id: 'inferior', label: 'Visceral (inferior) surface', labelJa: '臓側面（下面）', position: [0.2, -4.6, 2.6], target: [0, -0.2, 0.1] },
    { id: 'superior', label: 'Diaphragmatic (superior) surface', labelJa: '横隔面（上面）', position: [0.2, 5.0, 1.6], target: [0, 0, 0] },
    { id: 'posterior', label: 'Posterior', labelJa: '背面', position: [0, 0.9, -5.3], target: [0, -0.05, 0] },
    {
      id: 'transverse-section',
      label: 'Transverse section',
      labelJa: '横断（切断）',
      position: [0.2, 4.6, 2.4],
      target: [0, -0.05, 0],
      // Keeps what is below the plane, so a reader looking down sees the cut
      // face rather than the dome.
      section: { normal: [0, -1, 0], constant: 0.1 },
    },
  ];

  buildOrgan() {
    const liver = buildLiver({ vessels: true, opacity: 1, detail: 10 });
    const gallbladder = buildGallbladder();
    liver.object.add(gallbladder.object);

    const copy = liverStructureCopy();
    const structures = [];
    const declare = (id, meshes, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`liver-anatomy: no copy for "${id}"`);
      const present = meshes.filter(Boolean);
      if (!present.length) throw new Error(`liver-anatomy: "${id}" names no mesh`);
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
        colors: { segments: entry.color, natural: entry.naturalColor },
        legendKey: entry.legendKey,
        meshes: present,
        ...extra,
      });
    };

    for (const segment of liver.segments) {
      declare(`segment:${segment.id}`, [segment.mesh], { ghostAt: 0.5, ghostOpacity: 0.08 });
    }

    const veins = new Map(
      (liver.hepaticVeins ? liverBranches(liver, 'hepaticVeins') : []).map((branch) => [branch.name, branch.mesh])
    );
    const portal = new Map(
      (liver.portal ? liverBranches(liver, 'portal') : []).map((branch) => [branch.name, branch.mesh])
    );

    const outflow = { revealAt: 0.45 };
    const inflow = { revealAt: 0.72 };

    declare('vein:inferior-vena-cava', [veins.get('inferior-vena-cava')], outflow);
    for (const id of ['right-hepatic-vein', 'middle-hepatic-vein', 'left-hepatic-vein']) {
      declare(`vein:${id}`, [veins.get(id)], outflow);
    }
    declare('vein:caudate-veins', [veins.get('caudate-veins')], outflow);

    declare('portal:portal-vein', [portal.get('portal-vein')], inflow);
    declare('portal:right-portal-branch', [portal.get('right-portal-branch')], inflow);
    declare('portal:left-portal-branch', [portal.get('left-portal-branch')], inflow);
    for (const segment of liver.segments) {
      // The caudate takes a pedicle from each side, so its one structure is
      // drawn from two tubes — which is the other half of why it survives what
      // kills the rest of the liver.
      const meshes =
        segment.id === 'I'
          ? [portal.get('portal-pedicle-I-right'), portal.get('portal-pedicle-I-left')]
          : [portal.get(`portal-pedicle-${segment.id}`)];
      declare(`portal:pedicle-${segment.id}`, meshes, inflow);
    }

    declare('biliary:gallbladder', [gallbladder.object]);

    return {
      object: liver.object,
      structures,
      dispose: () => liver.dispose(),
    };
  }
}

/**
 * The branches of one of the liver's two trees.
 *
 * `buildLiver` keeps one `branches` list covering both trees rather than one
 * per tree, so a caller that wants the veins has to ask the group which meshes
 * are its own. Reading the group is what makes this correct whichever order the
 * builder happens to add them in.
 *
 * @param {ReturnType<typeof buildLiver>} liver
 * @param {'hepaticVeins' | 'portal'} tree
 */
function liverBranches(liver, tree) {
  const group = liver[tree].object;
  return group.children.filter((child) => child.isMesh).map((mesh) => ({ name: mesh.name, mesh }));
}
