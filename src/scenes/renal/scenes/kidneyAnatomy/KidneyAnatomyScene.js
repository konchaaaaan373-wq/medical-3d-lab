import * as THREE from 'three';
import { OrganAnatomyScene } from '../../../shared/anatomy/OrganAnatomyScene.js';
import { buildBladder, buildKidney, buildUreter } from '../../organs/kidney.js';
import {
  KIDNEY_ANATOMY_META,
  KIDNEY_COLOR_MODES,
  KIDNEY_NATURAL_COLORS,
  KIDNEY_SCENE_COLORS,
  kidneyStructureCopy,
} from '../../../../data/kidneyAnatomyScene.js';

/** Which kidney is opened into its parts. The other is a landmark shape. */
const DETAILED_SIDE = 'left';

const KIDNEY_AT = { right: [-1.55, 1.35, 0], left: [1.55, 1.5, 0] };
const BLADDER_AT = [0, -1.75, 0.15];

/**
 * The kidney, as a thing you can point at — and the tract it empties into.
 *
 * `buildKidney({ parts: true })` already cuts the cortex as one shell and
 * partitions what is inside it into seven pyramids and the columns between
 * them, then draws the collecting system out from each papilla. This scene
 * names those meshes and adds the two things a kidney on its own cannot show:
 * where its urine goes, and that there are two of them.
 *
 * ## Why only one kidney is opened
 *
 * Carving a kidney into parts costs about a second. Two of them is two seconds
 * of a frozen page before anything appears, for a second copy of a partition
 * the reader has already been shown — the left and right kidney have the same
 * parts. So the left is opened and the right is built as the landmark shape it
 * is, declared as one structure called "Right kidney" with a note saying it is
 * not partitioned. What this scene must never do is give the landmark shape
 * part names: a name with no boundary under it is the failure the whole anatomy
 * layer exists to avoid.
 *
 * ## What is claimed
 *
 * The **arrangement**: cortex outside and around, pyramids inside it with their
 * papillae at the sinus, columns of cortex between the pyramids, a minor calyx
 * on every papilla draining through three major calyces to one pelvis and out
 * as the ureter. `tests/kidney-anatomy.test.js` measures that.
 *
 * Still schematic, and the model card says so: the sinus is not carved out, the
 * seven pyramids are one coronal row where a kidney has an anterior and a
 * posterior row, the corticomedullary junction is the capsule scaled rather
 * than a surface of its own, and no artery is drawn at all.
 */
export class KidneyAnatomyScene extends OrganAnatomyScene {
  static meta = KIDNEY_ANATOMY_META;

  static cameraPose = {
    position: new THREE.Vector3(3.1, 2.0, 6.4),
    target: new THREE.Vector3(0.7, 0.6, 0),
  };

  static lightRig = { key: 30, fill: 0.95, rim: 14 };

  static colorModes = KIDNEY_COLOR_MODES;

  static views = [
    { id: 'overview', label: 'Urinary tract', labelJa: '尿路全体', position: [3.1, 2.0, 6.4], target: [0.7, 0.6, 0] },
    {
      id: 'left-kidney',
      label: 'Left kidney, anterior',
      labelJa: '左腎・前面',
      position: [1.55, 1.5, 4.1],
      target: [1.55, 1.5, 0],
    },
    {
      id: 'left-hilum',
      label: 'Left kidney, hilum',
      labelJa: '左腎・腎門側',
      // The hilum of the left kidney faces screen-left, so the camera has to be
      // on that side of it rather than in front.
      position: [-1.6, 1.5, 2.6],
      target: [1.55, 1.5, 0],
    },
    { id: 'posterior', label: 'Posterior', labelJa: '背面', position: [-2.2, 1.8, -6.4], target: [0.4, 0.4, 0] },
    {
      id: 'coronal-section',
      label: 'Coronal section',
      labelJa: '前額断（切断）',
      position: [1.4, 1.5, 4.4],
      target: [1.55, 1.5, 0],
      // The cut every kidney diagram is drawn from: take the front half away
      // and the pyramids, the columns and the calyces are all on the face.
      section: { normal: [0, 0, -1], constant: 0.05 },
    },
  ];

  buildOrgan() {
    const object = new THREE.Group();
    object.name = 'urinary-tract';

    const detailed = buildKidney({ side: DETAILED_SIDE, parts: true, opacity: 1, detail: 11 });
    const other = DETAILED_SIDE === 'left' ? 'right' : 'left';
    const landmark = buildKidney({ side: other, opacity: 1 });
    detailed.object.position.set(...KIDNEY_AT[DETAILED_SIDE]);
    landmark.object.position.set(...KIDNEY_AT[other]);

    const bladder = buildBladder();
    bladder.object.position.set(...BLADDER_AT);

    const ureters = {
      [DETAILED_SIDE]: ureterFor(DETAILED_SIDE, detailed),
      [other]: ureterFor(other, landmark),
    };

    object.add(
      detailed.object,
      landmark.object,
      ureters.left.object,
      ureters.right.object,
      bladder.object
    );

    const copy = kidneyStructureCopy(DETAILED_SIDE);
    const structures = [];
    const declare = (id, meshes, extra = {}) => {
      const entry = copy.get(id);
      if (!entry) throw new Error(`kidney-anatomy: no copy for "${id}"`);
      const present = meshes.filter(Boolean);
      if (!present.length) throw new Error(`kidney-anatomy: "${id}" names no mesh`);
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
          parts: KIDNEY_SCENE_COLORS[entry.colorKey],
          natural: KIDNEY_NATURAL_COLORS[entry.colorKey],
        },
        legendKey: entry.legendKey,
        meshes: present,
        ...extra,
      });
    };

    // The shell first, because it is what the reader is looking at before they
    // touch the slider — and the thing that has to get out of the way after.
    const cortex = detailed.part('cortex');
    declare('cortex', [cortex.mesh], { ghostAt: 0.4, ghostOpacity: 0.075 });

    for (const part of detailed.parts) {
      if (part.id === 'cortex') continue;
      declare(part.id, [part.mesh], {
        revealAt: 0.32,
        // The parenchyma steps back in turn so the collecting system inside it
        // can be seen — the same move the cortex makes, one layer further in.
        ghostAt: 0.78,
        ghostOpacity: 0.1,
      });
    }

    const collecting = new Map(
      detailed.collecting.children.filter((child) => child.isMesh).map((mesh) => [mesh.name, mesh])
    );
    for (const [name, mesh] of collecting) {
      declare(name, [mesh], { revealAt: 0.62 });
    }

    // The landmark side is one structure. Its three meshes are a shell, an
    // inner mass and a stand-in pelvis, and none of them is a part anybody
    // should be able to select by an anatomical name.
    declare('whole-kidney', landmark.object.children.filter((child) => child.isMesh));

    for (const id of ['left', 'right']) declare(`ureter-${id}`, [ureters[id].object]);
    declare('bladder', bladder.object.children.filter((child) => child.isMesh));

    return {
      object,
      structures,
      dispose: () => {
        detailed.dispose();
        landmark.dispose();
        ureters.left.dispose();
        ureters.right.dispose();
        bladder.dispose?.();
      },
    };
  }
}

/**
 * A ureter, from this kidney's own hilum to the bladder.
 *
 * Started at the hilum the kidney reports rather than at a coordinate typed
 * beside it, so a change to where the hilum is takes the ureter with it instead
 * of leaving a tube starting in the parenchyma.
 */
function ureterFor(side, kidney) {
  const [x, y] = KIDNEY_AT[side];
  const sign = side === 'left' ? 1 : -1;
  return buildUreter(
    [
      [x + kidney.hilum.x, y + kidney.hilum.y, 0],
      [sign * 1.05, 0.55, 0.05],
      [sign * 0.78, -0.45, 0.1],
      [sign * 0.4, -1.35, 0.15],
      [sign * 0.12, -1.72, 0.15],
    ],
    { color: KIDNEY_SCENE_COLORS.ureter }
  );
}
