import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildHand } from '../../organs/hand.js';
import {
  HAND_ANATOMY_META,
  HAND_COLOR_MODES,
  HAND_NATURAL_COLORS,
  HAND_SCENE_COLORS,
  handStructureCopy,
} from '../../../../data/handAnatomyScene.js';

/**
 * A hand from the back, then from the palm, then down the tunnel.
 *
 * The layer slider fades the **bones**, because the bones are what everything
 * soft runs under or over; nothing is moved out from under them. The one view
 * that carries the scene is `across-the-tunnel` — end on, down the wrist —
 * because the tunnel is a cross-section problem: an arch with a lid, with ten
 * things inside it that cannot move sideways. Seen from any other angle it is
 * a line.
 */
export class HandAnatomyScene extends OrganAnatomyScene {
  static meta = HAND_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(-10.0, 8.9, -49.4),
    target: new THREE.Vector3(-1.0, 5.6, 0.2),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  /** Long and narrow: twenty-five units of hand and forearm against ten
   *  across. The distance is set by the **height** — a hand is far taller than
   *  it is wide, and the width this reserves, 0.31, is what is left over. */
  static framing = { minHorizontalAspect: 0.34 };

  static colorModes = HAND_COLOR_MODES;

  static views = [
    // From the back, which is the side of a hand everyone has looked at.
    {
      id: 'whole',
      label: 'From the back',
      labelJa: '手背から',
      position: [-10.0, 8.9, -49.4],
      target: [-1.0, 5.6, 0.2],
    },
    {
      id: 'palm',
      label: 'From the palm',
      labelJa: '手掌から',
      position: [-7.0, 8.1, 49.5],
      target: [-1.0, 5.6, 0.2],
    },
    // The wrist, close. Eight bones in two rows, each one nameable.
    {
      id: 'carpus',
      label: 'The eight carpal bones',
      labelJa: '8個の手根骨',
      position: [-2.6, 3.2, 11.0],
      target: [-0.2, 0.7, 0.3],
      hideTags: ['soft', 'tunnel'],
    },
    // End on, down the wrist: the one view in which an arch with a lid looks
    // like an arch with a lid. Looked at from the **fingers** back, not from
    // the forearm — from that end the radius and ulna are in the way, which is
    // what the first attempt drew.
    {
      id: 'across-the-tunnel',
      label: 'Across the tunnel',
      labelJa: '手根管の断面',
      position: [-0.35, 7.6, 3.6],
      target: [-0.2, 0.66, 0.5],
      // The thenar muscle and the extensor tendons are put away here. Neither
      // is in the tunnel, and from the only direction the tunnel can be seen
      // from, the thenar mass lies across the front of it — which is what the
      // first version of this view mostly drew.
      //
      // A real cut across the wrist was tried here and taken out again: the
      // viewer takes one clipping plane, so it keeps a whole forearm rather
      // than a slice, and what it draws is that forearm receding from the cut
      // face. See `docs/follow-ups.md` F-93.
      hideTags: ['rays', 'outside-tunnel'],
    },
    {
      id: 'through-the-tunnel',
      label: 'What goes through it',
      labelJa: '手根管を通るもの',
      position: [-5.2, 3.0, 9.6],
      target: [-0.2, 1.0, 0.6],
      hideTags: ['carpus', 'forearm'],
    },
    {
      id: 'from-the-side',
      label: 'From the thumb side',
      labelJa: '母指側から',
      position: [-46.2, 8.3, 9.8],
      target: [-1.0, 5.6, 0.4],
    },
  ];

  buildOrgan() {
    const hand = buildHand({ colors: HAND_SCENE_COLORS });

    const copy = handStructureCopy();
    const structures = [];
    const declare = (id, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`hand-anatomy: no copy for "${id}"`);
      const meshes = hand.meshesFor(id);
      if (!meshes.length) throw new Error(`hand-anatomy: "${id}" names no mesh`);
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
          regions: HAND_SCENE_COLORS[entry.colorKey],
          natural: HAND_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes,
        ...extra,
      });
    };

    declare('radius', { ghostAt: 0.42, ghostOpacity: 0.1 });
    declare('ulna', { ghostAt: 0.42, ghostOpacity: 0.1 });

    for (const id of [
      'scaphoid',
      'lunate',
      'triquetrum',
      'pisiform',
      'trapezium',
      'trapezoid',
      'capitate',
      'hamate',
      'hamate-hook',
    ]) {
      declare(id, { ghostAt: 0.5, ghostOpacity: 0.12, preferredView: 'carpus' });
    }

    for (const id of ['metacarpals', 'proximal-phalanges', 'middle-phalanges', 'distal-phalanges']) {
      declare(id, { ghostAt: 0.42, ghostOpacity: 0.1 });
    }

    // The band and the space under it do not fade: they are the subject, and
    // what the slider is clearing the way to.
    declare('flexor-retinaculum', { baseOpacity: 0.62, doubleSided: true, preferredView: 'across-the-tunnel' });
    declare('carpal-tunnel', { baseOpacity: 0.26, doubleSided: true, preferredView: 'across-the-tunnel' });

    declare('flexor-tendons', { preferredView: 'through-the-tunnel' });
    declare('median-nerve', { preferredView: 'through-the-tunnel' });
    declare('extensor-tendons');
    declare('thenar-muscles', { baseOpacity: 0.66 });

    return { object: hand.object, structures, dispose: () => hand.dispose() };
  }
}
