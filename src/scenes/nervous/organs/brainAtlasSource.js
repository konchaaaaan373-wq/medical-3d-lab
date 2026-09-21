import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

/**
 * Loading the specimen brain atlas, for any scene that stands on it.
 *
 * The atlas is one file — `public/assets/brain/brain.glb`, recorded in
 * `src/catalog/assetManifest.js` as `brain-atlas-glb` — and more than one scene
 * now wants it: the anatomy scene that lets a reader name its parts, and the
 * pathology scenes that point at those parts. What every one of them needs
 * first is the same three things: fetch and decompress the file, read the
 * per-mesh metadata the atlas carries, and put the model where a camera can
 * see it at a known size.
 *
 * ## Why this is a second copy of code that already exists
 *
 * `BrainAnatomyScene` does all three, privately, and the obvious move would be
 * to lift its helpers here and have it import them. It is deliberately not
 * done: that file is a **pinned model source** of the published `brain-anatomy`
 * card (`docs/model-cards/revisions.json`), so editing it — even to move a
 * function out unchanged — changes the digest, makes the card revision stale,
 * and closes the scene the beta publishes. The cost of that is one duplicated
 * loader; the cost of the tidier version is a closed scene.
 *
 * **So do not "fix" the duplication by refactoring the anatomy scene into this
 * module** without revising that model card and its publication record in the
 * same change. `docs/follow-ups.md` F-160 carries the decision.
 *
 * This module knows nothing about disease, function or selection. It is the
 * atlas and where it sits, which is what an organ module is.
 */

const BASE_URL = import.meta.env?.BASE_URL ?? './';
const ATLAS_URL = `${BASE_URL}assets/brain/brain.glb`;
const DRACO_URL = `${BASE_URL}assets/brain/draco/`;

/** The radius the atlas is scaled to, matching the anatomy scene's framing. */
export const ATLAS_TARGET_RADIUS = 2.08;

/** Categories the atlas files its meshes under. */
export const ATLAS_CATEGORIES = Object.freeze({
  CORTEX: 'cortex',
  DEEP_GREY: 'deep_grey',
  DIENCEPHALON: 'diencephalon',
  WHITE_MATTER: 'white_matter',
  VENTRICLES: 'ventricles',
  CEREBELLUM: 'cerebellum',
  BRAINSTEM: 'brainstem',
  TRACTS: 'tracts',
  ARTERIES: 'arteries',
  VEINS: 'veins_sinuses',
  MENINGES: 'meninges_dura',
  CRANIAL_NERVES: 'cranial_nerves',
});

/**
 * The metadata record for one mesh.
 *
 * The atlas puts `bx_*` extras on the node that owns a structure, which is not
 * always the mesh itself, so the record is looked up by walking outwards.
 */
export function brainAtlasMetadata(mesh, stopAt) {
  let object = mesh;
  while (object) {
    if (object.userData?.bx_cat != null) return object.userData;
    if (object === stopAt) break;
    object = object.parent;
  }
  return mesh.userData ?? {};
}

/**
 * Every named mesh in a loaded atlas, with the metadata that names it.
 *
 * @param {THREE.Object3D} model
 * @returns {{mesh: THREE.Mesh, metadata: object}[]}
 */
export function collectBrainAtlasMeshes(model) {
  const found = [];
  model.traverse((object) => {
    if (!object.isMesh) return;
    found.push({ mesh: object, metadata: brainAtlasMetadata(object, model) });
  });
  return found;
}

/**
 * Centre, turn and scale a loaded atlas so a scene can frame it.
 *
 * Framing is taken from the **core** structures rather than from everything in
 * the file: the arteries and cranial nerves reach further out than the brain
 * does, and framing on them pushes the brain itself into the middle distance.
 * The half-turn is the atlas's own orientation: as authored it faces away.
 *
 * @param {THREE.Object3D} model the loaded scene graph
 * @param {THREE.Group} holder the group the model is added to and transformed by
 */
export function placeBrainAtlas(model, holder, { targetRadius = ATLAS_TARGET_RADIUS } = {}) {
  model.updateMatrixWorld(true);
  const coreBox = new THREE.Box3();
  const wholeBox = new THREE.Box3();
  model.traverse((object) => {
    if (!object.isMesh) return;
    const metadata = brainAtlasMetadata(object, model);
    wholeBox.expandByObject(object);
    if (metadata.bx_core === 1 || metadata.bx_core === true) coreBox.expandByObject(object);
  });
  const framingBox = coreBox.isEmpty() ? wholeBox : coreBox;
  const centre = framingBox.getCenter(new THREE.Vector3());
  const radius = framingBox.getBoundingSphere(new THREE.Sphere()).radius || 1;

  model.position.sub(centre);
  holder.add(model);
  holder.rotation.set(0, Math.PI, 0);
  holder.scale.setScalar(targetRadius / radius);
  holder.position.set(0, 0.08, 0);
  return { radius, centre };
}

/** Fetch and decompress the atlas. */
export async function loadBrainAtlas() {
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_URL);
  draco.setDecoderConfig({ type: 'wasm' });
  draco.preload();
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  try {
    return await loader.loadAsync(ATLAS_URL);
  } finally {
    draco.dispose();
  }
}
