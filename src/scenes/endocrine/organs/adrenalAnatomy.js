import * as THREE from 'three';
import { carveLayers } from '../../shared/anatomy/organParts.js';
import { shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { tissueMaterial } from '../../shared/materials.js';

/**
 * The adrenal glands, cut into the layers that make them two glands in one
 * capsule.
 *
 * `adrenal.js` draws one gland as a cortex with a medulla inside it, because
 * that is what `adrenal-response` needs: two outputs on two time courses. This
 * is the other scale, and it makes the one division that is genuinely a set of
 * *layers* — the three zones of the cortex, each making a different kind of
 * hormone, in a fixed order from the capsule inwards.
 *
 * ## Why layers rather than parts
 *
 * A cortical zone is not a wedge of the gland, it is a depth in it. Cutting one
 * into pieces to make the geometry easier would invent a boundary the organ
 * does not have, so each zone is a closed shell (`carveLayers`), continuous all
 * the way round, and the medulla inside them is the one solid.
 *
 * ## Two glands, two shapes
 *
 * The right gland is pyramidal and the left is crescentic, and they sit
 * differently on their kidneys — the right capping its kidney, the left more on
 * its medial border. That difference is real and it is the reason the two are
 * not mirrored here.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. **The zone thicknesses are chosen so
 * that three zones can be told apart on a screen. They are not the real
 * proportions**, and the copy says so on every one of them.
 */

/** The gland's proportions, before the warp. */
export const ADRENAL_SCALE = Object.freeze([0.58, 0.44, 0.48]);

/**
 * What the anatomy says about how much of the gland each layer is.
 *
 * Kept apart from the bands below because it is a different kind of number:
 * this one is about the organ, and `ZONE_DISPLAY_BANDS` is about the screen.
 * Nothing in this file's geometry is built from these — they exist so that the
 * copy and the tests have the real proportions to refer to, and so that the
 * display bands can be checked against them and found to be different on
 * purpose.
 */
export const CORTEX_SHARE_OF_GLAND = 0.9;

/**
 * Where each layer is drawn, as fractions of the gland's own radius.
 *
 * **These are presentation values, not dimensions of the organ**
 * (`CLAUDE.md`: keep clinical and presentation parameters apart, and name them
 * so a reader can tell which is which). Ordered from the capsule inwards, which
 * is the order the layers are named in and the order their products run in:
 * salt, sugar, sex, then catecholamines. **That order is the claim.**
 *
 * At the real proportions the cortex is about nine tenths of the gland and the
 * glomerulosa is a thin rim inside its capsule, so three zones drawn to scale
 * are three lines on a screen and cannot be pointed at. The bands below spread
 * them so that each is a surface a reader can select — a visual emphasis in the
 * layer view, and nothing the organ's shape is claiming.
 */
export const ZONE_DISPLAY_BANDS = Object.freeze([
  { id: 'zona-glomerulosa', from: 0.86, to: 1 },
  { id: 'zona-fasciculata', from: 0.68, to: 0.86 },
  { id: 'zona-reticularis', from: 0.54, to: 0.68 },
  { id: 'adrenal-medulla', from: 0, to: 0.54 },
]);

/**
 * The right gland: a flattened three-sided cap, tapering to a ridge along the
 * top. Pyramidal is the word every description uses, and a cone is what it has
 * to read as from the front.
 */
function adrenalWarp(v) {
  const up = smoothstep(-0.2, 1, v.y);
  v.x *= 1 - 0.72 * up;
  v.z *= 1 - 0.72 * up;
  // A ridge rather than a dome: the apex is a line across the gland, not a
  // point, which is what makes the silhouette triangular instead of rounded.
  v.y = v.y * 0.72 + 0.12 + 0.14 * up * Math.exp(-Math.pow(v.z / 0.45, 2));
}

/**
 * The left gland is **crescentic**, not pyramidal: it lies along the medial
 * border of its kidney rather than capping it, so it is longer, flatter, and
 * scooped deeply on its inferior surface.
 *
 * The difference has to be legible from the front, because that is the view the
 * scene opens on and the shapes are the reason both kidneys are drawn. The
 * scoop was 0.26 deep and read as the same cone with a dent; at 0.52 across a
 * wider span the silhouette is a crescent.
 */
function leftAdrenalWarp(v) {
  const up = smoothstep(-0.2, 1, v.y);
  // Wider and lower than the right, and without the ridge.
  v.x *= 1 - 0.34 * up;
  v.z *= 1 - 0.5 * up;
  v.y = v.y * 0.56 + 0.06;
  v.x *= 1.22;
  const low = smoothstep(0.15, -1, v.y);
  v.y += 0.52 * low * Math.exp(-Math.pow(v.x / 0.5, 2));
}

/** Where each gland sits, and which kidney it caps. */
export const ADRENAL_SITES = Object.freeze([
  { side: 'right', sign: -1, at: [-0.82, 1.02, 0], warp: adrenalWarp },
  { side: 'left', sign: 1, at: [0.82, 0.92, 0], warp: leftAdrenalWarp },
]);

/**
 * @param {{ colors?: Record<string, string>, opacity?: number, detail?: number }} [options]
 */
export function buildAdrenalParts({ colors = {}, opacity = 0.96, detail = 6 } = {}) {
  const object = new THREE.Group();
  object.name = 'adrenal-parts';
  const disposables = [];
  const index = new Map();

  for (const site of ADRENAL_SITES) {
    const built = carveLayers({
      warp: site.warp,
      scale: [...ADRENAL_SCALE],
      cacheKey: `adrenal:${site.side}`,
      detail,
      layers: ZONE_DISPLAY_BANDS.map((layer) => ({
        ...layer,
        color: colors[layer.id] ?? '#e8c88a',
        opacity,
      })),
    });
    built.object.position.set(...site.at);
    built.object.name = `${site.side}-adrenal`;
    object.add(built.object);
    disposables.push(built);
    for (const layer of built.layers) {
      const id = `${site.side}-${layer.id}`;
      layer.mesh.name = id;
      index.set(id, layer.mesh);
    }
  }

  // The kidneys the glands sit on. Context, and the reason the two glands are
  // shaped differently: the right caps its kidney, the left leans on the medial
  // border of its own.
  for (const site of ADRENAL_SITES) {
    const geometry = shapedSphere({
      detail: 5,
      scale: [0.52, 0.78, 0.46],
      warp: (v) => {
        // A bean: hollowed on the medial face.
        const inward = v.x * -site.sign;
        if (inward > 0) v.x += site.sign * 0.3 * Math.exp(-Math.pow(v.y / 0.5, 2)) * inward;
      },
    });
    const material = tissueMaterial({ color: colors.kidney ?? '#a8565c', roughness: 0.5, opacity: 0.88 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(site.at[0], site.at[1] - 0.86, 0);
    mesh.name = `${site.side}-kidney`;
    disposables.push(geometry, material);
    object.add(mesh);
    index.set(`${site.side}-kidney`, mesh);
  }

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    anchors: {
      rightAdrenal: new THREE.Vector3(-2.0, 1.5, 0.4),
      leftAdrenal: new THREE.Vector3(2.0, 1.4, 0.4),
    },
    dispose() {
      for (const item of disposables) item.dispose?.();
    },
  };
}
