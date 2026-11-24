import * as THREE from 'three';
import { mniToScene, sceneToMni, voxelToMm } from '../../../../models/mriAtlas.js';

/**
 * The 3D half of the atlas: the CerebrA surfaces, in the MRI's own space.
 *
 * ## Why this is not `brain.glb`
 *
 * The anatomy scene's atlas is a composite of several sources and is not in
 * MNI space; laying MRI coordinates over it would be a guess presented as a
 * registration. These meshes are extracted from the *same label volume the
 * slices are painted from* (`scripts/build-mri-atlas.mjs`), so a point in one
 * is the same point in the other by construction, and the correspondence the
 * screen shows is exact rather than nominal.
 *
 * ## Coordinates (architecture rule 5: axes are declared, not guessed)
 *
 * The GLB's vertices are MNI millimetres. `atlasRoot` carries the one
 * transform into scene space — the rotation `mniToScene` describes, built from
 * that function's own images of the basis vectors so the two cannot drift —
 * and a uniform scale. Nothing else in this file knows which way is left:
 * positions are computed in MNI millimetres and placed *inside* `atlasRoot`.
 *
 * ## State (rule 3)
 *
 * `setState` is the only writer of a material's opacity, colour and emissive.
 * A structure is one of: selected, shown, ghost, hidden.
 */

/** Scene units per millimetre: the brain spans about 9 units, as the other atlases do. */
export const SCENE_UNITS_PER_MM = 0.05;

/** The framing centre in MNI mm: roughly the middle of the cerebrum. */
const FRAMING_CENTRE_MM = [0, -18, 14];

const GHOST_OPACITY = 0.07;
/** A ghost is context, not content: it loses most of its colour as well as its opacity. */
const GHOST_TINT = new THREE.Color(0x8a8fa3);
/** How far the camera stands from the framing centre, in scene units. */
const VIEW_DISTANCE = 15;

export function createAtlasView3D({ viewer, meshRoot, structures, grid, onPick }) {
  const root = new THREE.Group();
  root.name = 'mri-atlas';
  const atlasRoot = new THREE.Group();
  atlasRoot.name = 'mni-space';
  // Columns are where MNI's x, y and z axes go.
  const basis = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(...mniToScene([1, 0, 0])),
    new THREE.Vector3(...mniToScene([0, 1, 0])),
    new THREE.Vector3(...mniToScene([0, 0, 1]))
  );
  if (basis.determinant() < 0) throw new Error('mri atlas: the MNI→scene transform is a reflection');
  atlasRoot.quaternion.setFromRotationMatrix(basis);
  atlasRoot.scale.setScalar(SCENE_UNITS_PER_MM);
  atlasRoot.position.copy(
    new THREE.Vector3(...FRAMING_CENTRE_MM).applyMatrix4(basis).multiplyScalar(-SCENE_UNITS_PER_MM)
  );
  root.add(atlasRoot);

  const byLabel = new Map();
  const structureByLabel = new Map(structures.map((structure) => [structure.label, structure]));
  const pickable = [];
  meshRoot.traverse((object) => {
    if (!object.isMesh) return;
    let node = object;
    while (node && node.userData?.cerebraLabel == null) node = node.parent;
    const label = node?.userData?.cerebraLabel;
    const structure = structureByLabel.get(label);
    if (!structure) return;
    object.material = new THREE.MeshStandardMaterial({
      color: structure.colour,
      roughness: 0.62,
      metalness: 0,
      transparent: true,
    });
    object.userData.cerebraLabel = label;
    byLabel.set(label, object);
    pickable.push(object);
  });
  atlasRoot.add(meshRoot);

  // --- the three slice planes, as outlines, and the crosshair point ---------
  // The frames outline the labelled brain, not the whole field of view: a
  // rectangle the size of the head box says nothing about where the slice is.
  const extentMin = [0, 1, 2].map((axis) => Math.min(...structures.map((structure) => structure.bboxMm.min[axis])) - 4);
  const extentMax = [0, 1, 2].map((axis) => Math.max(...structures.map((structure) => structure.bboxMm.max[axis])) + 4);
  const frameMaterial = new THREE.LineBasicMaterial({ color: 0xffd666, transparent: true, opacity: 0.55, depthTest: false });
  const frames = [0, 1, 2].map((axis) => {
    const [a, b] = [0, 1, 2].filter((other) => other !== axis);
    const corner = (ua, ub) => {
      const point = [0, 0, 0];
      point[a] = ua ? extentMax[a] : extentMin[a];
      point[b] = ub ? extentMax[b] : extentMin[b];
      return new THREE.Vector3(...point);
    };
    const geometry = new THREE.BufferGeometry().setFromPoints([corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)]);
    const loop = new THREE.LineLoop(geometry, frameMaterial);
    loop.renderOrder = 5;
    loop.userData.axis = axis;
    atlasRoot.add(loop);
    return loop;
  });
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0xffd666, depthTest: false })
  );
  marker.renderOrder = 6;
  atlasRoot.add(marker);

  // Light that follows nothing: a key from the upper front-left and a soft
  // fill, so sulcal relief reads from every named view.
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(-6, 9, 8);
  const fill = new THREE.DirectionalLight(0xdfe6ff, 0.9);
  fill.position.set(7, -3, -8);
  root.add(new THREE.HemisphereLight(0xffffff, 0x3a3c4a, 1.1), key, fill);

  viewer.scene.add(root);
  viewer.scene.fog = null;

  // --- camera: open on the left-anterior-superior, like a textbook oblique ---
  const HOME = {
    position: new THREE.Vector3(...mniToScene([-1, 0.9, 0.55])).normalize().multiplyScalar(VIEW_DISTANCE),
    target: new THREE.Vector3(0, 0, 0),
  };
  const applyHome = () => {
    viewer.camera.position.copy(HOME.position);
    viewer.controls.target.copy(HOME.target);
    viewer.camera.near = 0.2;
    viewer.camera.far = 120;
    viewer.camera.updateProjectionMatrix();
    viewer.controls.minDistance = 4;
    viewer.controls.maxDistance = 40;
    // The shared controls stop 29° short of the poles, which suits an organ on
    // a table and makes a view from directly above impossible. An atlas has one.
    viewer.controls.minPolarAngle = 1e-3;
    viewer.controls.maxPolarAngle = Math.PI - 1e-3;
    viewer.controls.update();
  };
  applyHome();
  viewer.controls.autoRotate = false;

  // --- picking: a drag is not a click ---------------------------------------
  const raycaster = new THREE.Raycaster();
  const dom = viewer.renderer.domElement;
  let down = null;
  const onDown = (event) => {
    down = { x: event.clientX, y: event.clientY, at: performance.now() };
  };
  const onUp = (event) => {
    if (!down) return;
    const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    down = null;
    if (moved > 6) return;
    const rect = dom.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(pointer, viewer.camera);
    const hits = raycaster.intersectObjects(pickable.filter((mesh) => mesh.visible), false);
    // What is drawn solid is what was clicked: a ghosted cortex is something
    // to look through, so the click goes through it too. Only when nothing
    // solid lies under the pointer does the nearest ghost answer.
    const hit = hits.find((entry) => entry.object.userData.display !== 'ghost') ?? hits[0];
    if (!hit) return;
    const local = atlasRoot.worldToLocal(hit.point.clone());
    onPick(hit.object.userData.cerebraLabel, [local.x, local.y, local.z]);
  };
  dom.addEventListener('pointerdown', onDown);
  dom.addEventListener('pointerup', onUp);

  /**
   * @param {{selectedLabel:number|null, voxel:number[], ghostGroups:Set<string>,
   *          hiddenGroups:Set<string>, focusSelection:boolean, showPlanes:boolean}} state
   */
  function setState({ selectedLabel, voxel, ghostGroups, hiddenGroups, focusSelection, showPlanes }) {
    for (const [label, mesh] of byLabel) {
      const structure = structureByLabel.get(label);
      const selected = label === selectedLabel;
      let display = 'shown';
      if (hiddenGroups.has(structure.group)) display = 'hidden';
      else if (ghostGroups.has(structure.group)) display = 'ghost';
      // With something selected, everything else steps back so it can be seen
      // where it is — inside, usually. The selection itself is never hidden.
      if (selectedLabel != null && focusSelection && !selected && display === 'shown') display = 'ghost';
      if (selected) display = 'selected';
      mesh.userData.display = display;
      mesh.visible = display !== 'hidden';
      const material = mesh.material;
      const ghost = display === 'ghost';
      material.opacity = ghost ? GHOST_OPACITY : 1;
      material.color.set(structure.colour);
      if (ghost) material.color.lerp(GHOST_TINT, 0.7);
      material.depthWrite = !ghost;
      material.emissive.set(selected ? structure.colour : 0x000000);
      material.emissiveIntensity = selected ? 0.35 : 0;
      mesh.renderOrder = ghost ? 2 : 1;
    }
    const mm = voxelToMm(grid, voxel);
    marker.position.set(...mm);
    frames.forEach((frame) => {
      frame.visible = showPlanes;
      frame.position.set(0, 0, 0);
      frame.position.setComponent(frame.userData.axis, mm[frame.userData.axis]);
    });
    marker.visible = showPlanes;
  }

  /** Where a point in MNI mm is on screen, for a check. */
  function projectMm(mm) {
    const point = atlasRoot.localToWorld(new THREE.Vector3(...mm)).project(viewer.camera);
    const rect = dom.getBoundingClientRect();
    return { x: rect.left + ((point.x + 1) / 2) * rect.width, y: rect.top + ((1 - point.y) / 2) * rect.height };
  }

  return {
    root,
    setState,
    resetView: applyHome,
    projectMm,
    /** How a structure is currently drawn: selected | shown | ghost | hidden. For a check. */
    displayOf: (label) => byLabel.get(label)?.userData.display ?? null,
    /** A named view, by where the camera stands in MNI terms. */
    setView(name) {
      // Directions in MNI terms: where the camera stands relative to the brain.
      // The top view is tilted a hair so "up" stays defined (anterior at the top).
      const direction = {
        left: [-1, 0, 0], right: [1, 0, 0], anterior: [0, 1, 0],
        posterior: [0, -1, 0], superior: [0, -0.001, 1], inferior: [0, 0.001, -1],
      }[name];
      if (!direction) return applyHome();
      viewer.camera.position.copy(new THREE.Vector3(...mniToScene(direction)).normalize().multiplyScalar(VIEW_DISTANCE));
      viewer.controls.target.set(0, 0, 0);
      viewer.controls.update();
    },
    dispose() {
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointerup', onUp);
      viewer.scene.remove(root);
      root.traverse((object) => {
        object.geometry?.dispose?.();
        object.material?.dispose?.();
      });
    },
    // For tests of the transform itself.
    _sceneOfMm: (mm) => atlasRoot.localToWorld(new THREE.Vector3(...mm)).toArray(),
    _mniOfScene: sceneToMni,
  };
}
