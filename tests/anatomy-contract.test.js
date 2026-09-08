import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { BrainAnatomyScene } from '../src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js';
import { createAnatomyTreePanel } from '../src/components/AnatomyTreePanel.js';
import { createAnatomyInfoPanel } from '../src/components/AnatomyInfoPanel.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';
import {
  ANATOMY_CONTRACT_METHODS,
  ANATOMY_CONTRACT_VERSION,
  GROUP_ID_PREFIX,
  SELECTION_FIELDS,
  anatomyContractProblems,
  buildAnatomyTree,
  isGroupId,
  treeLeaves,
  treeNodes,
} from '../src/app/anatomyContract.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * Run the anatomical-layer slider to a value and let the model settle there.
 *
 * `setProgress` sets the target; the opacities are damped towards it by
 * `update()`. Reaching in to set the damped value would be testing a shortcut
 * rather than the path the slider actually takes.
 */
function settle(scene, progress) {
  scene.setProgress(progress);
  for (let step = 0; step < 400; step += 1) scene.update(1 / 60);
  scene._applyProgress(1 / 60, true);
}

/**
 * The same fixture atlas the brain tests use, kept here rather than shared so
 * that a change made for one file cannot silently retune the other.
 */
const FIXTURE = [
  [212, 'Middle temporal gyrus', 'left', 'cortex', 'Temporal lobe', [1.1, -0.3, 0.25]],
  [213, 'Middle temporal gyrus', 'right', 'cortex', 'Temporal lobe', [-1.1, -0.3, 0.25]],
  [208, 'Middle frontal gyrus', 'left', 'cortex', 'Frontal lobe', [1.0, 0.45, 0.45]],
  [305, 'Opercular part of inferior frontal gyrus', 'left', 'cortex', 'Frontal lobe', [0.9, 0.05, 0.2]],
  [402, 'Supramarginal gyrus', 'left', 'cortex', 'Parietal lobe', [0.9, 0.02, -0.18]],
  [325, 'Putamen', 'left', 'deep_grey', 'Telencephalon', [0.3, 0, 0]],
  [173, 'Lateral ventricle', 'left', 'ventricles', 'Telencephalon', [0.22, 0.18, 0]],
  [74, 'Corpus callosum', 'median', 'white_matter', 'Telencephalon', [0, 0.28, 0]],
  [312, 'Pons', 'left', 'brainstem', 'Brainstem', [0, -0.65, -0.15]],
  [28, 'Anterior quadrangular lobule', 'left', 'cerebellum', 'Cerebellum', [0.45, -0.65, -0.6]],
];

function atlas(structures = FIXTURE) {
  const group = new THREE.Group();
  group.name = 'fixture-atlas';
  for (const [id, label, side, category, region, position] of structures) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.28, 0.3),
      new THREE.MeshBasicMaterial({ color: '#ffffff' })
    );
    mesh.name = `${label}.${side}`;
    mesh.position.fromArray(position);
    mesh.userData = {
      bx_id: id, bx_cat: category, bx_label: label, bx_side: side,
      bx_region: region, bx_core: 1, bx_source: 'test atlas',
    };
    group.add(mesh);
  }
  return group;
}

function buildScene(structures) {
  const scene = new BrainAnatomyScene({ atlas: atlas(structures) });
  scene.build();
  return scene;
}

test('anatomy contract: the brain scene satisfies it, id for id', () => {
  const scene = buildScene();
  try {
    assert.deepEqual(anatomyContractProblems(scene), []);
    for (const method of ANATOMY_CONTRACT_METHODS) {
      assert.equal(typeof scene[method], 'function', method);
    }
    assert.equal(ANATOMY_CONTRACT_VERSION, 1);
  } finally {
    scene.dispose();
  }
});

test('anatomy contract: the 3D model, the tree and the detail card use one id', () => {
  const scene = buildScene();
  try {
    const leaves = treeLeaves(scene.getAnatomyTree());
    assert.equal(leaves.length, FIXTURE.length, 'every structure reaches the tree exactly once');

    for (const leaf of leaves) {
      // What the tree offers is what a click resolves to, and what the card
      // is then told about. Three surfaces, one value.
      const meshes = scene.meshesByAtlasId.get(Number(leaf.structureId));
      assert.ok(meshes?.length, `${leaf.structureId} is drawn by at least one mesh`);
      for (const mesh of meshes) assert.equal(mesh.userData.atlasId, leaf.structureId);

      assert.equal(scene.selectStructure(leaf.structureId), true);
      const selection = scene.getAnatomySelection();
      assert.equal(selection.id, leaf.structureId);
      assert.equal(selection.name, leaf.label);
      assert.equal(selection.nameJa, leaf.labelJa);
      for (const field of SELECTION_FIELDS) assert.ok(selection[field] !== undefined, field);
    }

    // A grouping node is not a structure and must not resolve to one nearby.
    const groups = treeNodes(scene.getAnatomyTree()).filter((node) => node.structureId === undefined);
    assert.ok(groups.length > 0, 'the tree actually groups');
    for (const group of groups) {
      assert.ok(isGroupId(group.nodeId), group.nodeId);
      assert.equal(scene.selectStructure(group.nodeId), false, group.nodeId);
    }
    // And no id is ambiguous between the two kinds.
    const ids = treeNodes(scene.getAnatomyTree()).map((node) => node.nodeId);
    assert.equal(new Set(ids).size, ids.length);
  } finally {
    scene.dispose();
  }
});

test('anatomy contract: a structure drawn from several meshes is one structure', () => {
  // The real atlas does this to 124 of its structures: the middle temporal
  // gyrus arrives as two meshes carrying the same `bx_id`. Keyed one-to-one,
  // the second piece overwrote the first, so clicking the piece that lost
  // highlighted the piece that won — the reader clicked one part of a gyrus and
  // a different part lit up, while the card named the gyrus either way.
  const split = [
    [212, 'Middle temporal gyrus', 'left', 'cortex', 'Temporal lobe', [1.1, -0.3, 0.25]],
    [212, 'Middle temporal gyrus', 'left', 'cortex', 'Temporal lobe', [1.1, -0.3, -0.25]],
    [208, 'Middle frontal gyrus', 'left', 'cortex', 'Frontal lobe', [1.0, 0.45, 0.45]],
  ];
  const scene = buildScene(split);
  try {
    assert.equal(scene.selectables.length, 3, 'three meshes');
    assert.equal(scene.meshesByAtlasId.size, 2, 'two structures');

    // One row, not two, and the count a reader is shown is the structure count.
    const leaves = treeLeaves(scene.getAnatomyTree());
    assert.deepEqual(leaves.map((leaf) => leaf.structureId), [212, 208]);
    assert.equal(scene.getAnatomyStatus().selectableCount, 2);
    assert.equal(scene.getAnatomyStatus().meshCount, 3, 'the mesh count is still available, separately');

    // Selecting the structure highlights every piece of it, whichever piece
    // the click landed on.
    assert.equal(scene.selectStructure(212), true);
    const pieces = scene.meshesByAtlasId.get(212);
    assert.equal(pieces.length, 2);
    assert.ok(pieces.every((mesh) => mesh.userData.selected), 'both pieces are selected');
    assert.equal(scene.getAnatomySelection().id, 212);

    // Hovering one piece previews the whole structure too.
    scene._setHovered(pieces[1]);
    assert.ok(pieces.every((mesh) => mesh.userData.hovered));
    assert.equal(scene.getAnatomyHover().id, 212);

    // Moving to another structure releases every piece of the old one.
    assert.equal(scene.selectStructure(208), true);
    assert.ok(pieces.every((mesh) => !mesh.userData.selected));
    scene.clearSelection();
    assert.equal(scene.getAnatomySelection(), null);

    // And isolation hides all the other pieces, not merely the other structure.
    assert.equal(scene.isolateStructure(212), true);
    const visible = scene.selectables.filter((mesh) => mesh.userData.currentOpacity > 0);
    assert.deepEqual(visible, pieces);

    assert.deepEqual(anatomyContractProblems(scene), []);
  } finally {
    scene.dispose();
  }
});

test('anatomy contract: a hidden structure is not clickable', () => {
  const scene = buildScene();
  try {
    const pickable = () => scene.selectables.filter((mesh) => mesh.visible && mesh.userData.currentOpacity > 0.14);
    const putamen = scene.meshesByAtlasId.get(325)[0];

    // Deep structures start faded out behind the cortex, so the picker must not
    // offer them — the reader cannot see them to mean them.
    settle(scene, 0);
    assert.ok(putamen.userData.currentOpacity < 0.14, 'the putamen starts hidden under the cortex');
    assert.equal(putamen.visible, false);
    assert.equal(pickable().includes(putamen), false);

    // Reveal it and it becomes clickable, by the same rule.
    settle(scene, 1);
    assert.ok(putamen.userData.currentOpacity > 0.14, 'the layer slider reveals it');
    assert.ok(pickable().includes(putamen), 'once revealed, the putamen is selectable');

    // Isolation is the sharper case: everything else is gone from the picker.
    assert.equal(scene.isolateStructure(325), true);
    assert.deepEqual(pickable().map((mesh) => mesh.userData.atlasId), [325]);
    assert.ok(scene.selectables.every((mesh) => mesh.userData.atlasId === 325 || !mesh.visible));

    // The rule the picker uses is the rule the renderer uses. Reading opacity
    // from anywhere else is how these two come apart.
    const source = read('src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js');
    assert.match(source, /mesh\.visible && mesh\.userData\.currentOpacity > 0\.14/);
    assert.match(source, /mesh\.visible = opacity > 0\.012/);
  } finally {
    scene.dispose();
  }
});

test('anatomy contract: isolating and restoring returns the model it started from', () => {
  const scene = buildScene();
  try {
    // A part-way layer *and* a medial view, so that a restore which quietly
    // reset either of them would show up as a different set of opacities.
    settle(scene, 0.65);
    scene.setAnatomyView('left-medial');
    const before = scene.selectables.map((mesh) => [mesh.userData.atlasId, mesh.userData.currentOpacity]);
    const opacityOf = (list, id) => list.find(([atlasId]) => atlasId === id)[1];
    assert.ok(before.some(([, opacity]) => opacity > 0 && opacity < 1), 'the layer is part-way through');
    assert.equal(opacityOf(before, 213), 0, 'and the medial view has hidden the far hemisphere');

    scene.selectStructure(212);
    assert.equal(scene.isolateStructure(402), true);
    assert.equal(scene.getAnatomyIsolation(), 402);
    // Isolation is display: it does not move the selection.
    assert.equal(scene.getAnatomySelection().id, 212);
    assert.equal(scene.selectables.filter((mesh) => mesh.userData.currentOpacity > 0).length, 1);

    assert.equal(scene.clearIsolation(), true);
    assert.equal(scene.getAnatomyIsolation(), null);
    // Restored to the layer and the view it was on, not to a default.
    const after = scene.selectables.map((mesh) => [mesh.userData.atlasId, mesh.userData.currentOpacity]);
    assert.deepEqual(after, before, 'restoring must not quietly reset the anatomical layer or the medial side');
    assert.equal(opacityOf(after, 213), 0, 'the far hemisphere is still hidden by the view, not by isolation');
    assert.equal(scene.getAnatomySelection().id, 212);

    assert.equal(scene.clearIsolation(), false, 'clearing twice is not an event');
    assert.equal(scene.isolateStructure(999999), false, 'an unknown id isolates nothing');
    assert.equal(scene.getAnatomyIsolation(), null);
  } finally {
    scene.dispose();
  }
});

test('anatomy contract: display choices never change which structure is selected', () => {
  const scene = buildScene();
  try {
    scene.selectStructure(305);
    const id = scene.getAnatomySelection().id;
    const name = scene.getAnatomySelection().name;

    const seen = [];
    scene.onAnatomySelection((value) => seen.push(value?.id ?? null));

    for (const mode of ['anatomical', 'detail']) {
      assert.equal(scene.setAnatomyColorMode(mode), true, mode);
      assert.equal(scene.getAnatomySelection().id, id, mode);
      assert.equal(scene.getAnatomySelection().name, name, mode);
      assert.equal(scene.getAnatomySelection().colorMode, mode, 'the card says which colouring it is showing');
    }
    for (const view of ['right-lateral', 'superior', 'left-lateral']) {
      assert.equal(scene.setAnatomyView(view), true, view);
      assert.equal(scene.getAnatomySelection().id, id, view);
    }
    settle(scene, 0.9);
    assert.equal(scene.getAnatomySelection().id, id);

    // Recolouring re-emits so the card can repaint its swatch — and every one
    // of those emissions is the same structure.
    assert.ok(seen.length >= 2);
    assert.deepEqual([...new Set(seen)], [id]);
  } finally {
    scene.dispose();
  }
});

test('anatomy contract: a transition leaves no duplicate listener or stale selection', () => {
  const scene = buildScene();
  try {
    let selections = 0;
    let isolations = 0;
    const stop = scene.onAnatomySelection(() => { selections += 1; });
    scene.onAnatomyIsolation(() => { isolations += 1; });

    scene.selectStructure(212);
    assert.equal(selections, 1, 'one selection, one notification');
    scene.isolateStructure(212);
    scene.clearIsolation();
    assert.equal(isolations, 2);

    // Unsubscribing actually unsubscribes, so a panel that is torn down and
    // rebuilt does not leave the old one counting.
    stop();
    scene.selectStructure(208);
    assert.equal(selections, 1);

    // Re-attaching an atlas is a transition, not an accumulation: the meshes
    // the old selection pointed at are gone, and answering with them would be
    // naming a structure that is no longer on screen.
    scene.selectStructure(212);
    scene.isolateStructure(212);
    scene.attachAtlas(atlas());
    assert.equal(scene.getAnatomySelection(), null);
    assert.equal(scene.getAnatomyIsolation(), null);
    assert.deepEqual(scene.selectedMeshes, []);
    assert.deepEqual(scene.hoveredMeshes, []);
    assert.equal(scene.selectables.length, FIXTURE.length, 'and the model is not doubled');
    assert.equal(treeLeaves(scene.getAnatomyTree()).length, FIXTURE.length);

    // The new meshes are selectable, by the same ids.
    assert.equal(scene.selectStructure(212), true);
    assert.equal(scene.getAnatomySelection().id, 212);
    assert.deepEqual(anatomyContractProblems(scene), []);

    // And after disposal nothing is left holding a listener.
    scene.dispose();
    assert.equal(scene.listeners.size, 0);
    assert.equal(scene.hoverListeners.size, 0);
    assert.equal(scene.statusListeners.size, 0);
    assert.equal(scene.isolationListeners.size, 0);
    assert.equal(scene.getAnatomySelection(), null);
  } finally {
    if (!scene.disposed) scene.dispose();
  }
});

test('anatomy contract: the validator restores whatever it touched', () => {
  const scene = buildScene();
  try {
    settle(scene, 1);
    scene.selectStructure(74);
    scene.isolateStructure(325);

    assert.deepEqual(anatomyContractProblems(scene), []);
    assert.equal(scene.getAnatomySelection().id, 74, 'the selection survived the check');
    assert.equal(scene.getAnatomyIsolation(), 325, 'and so did the isolation');

    scene.clearIsolation();
    scene.clearSelection();
    assert.deepEqual(anatomyContractProblems(scene), []);
    assert.equal(scene.getAnatomySelection(), null, 'an empty selection stays empty');
    assert.equal(scene.getAnatomyIsolation(), null);
  } finally {
    scene.dispose();
  }
});

test('anatomy contract: the validator fails a scene that breaks it', () => {
  const scene = buildScene();
  try {
    // Each of these is a real way for the three surfaces to come apart, and the
    // validator has to notice rather than shrug.
    const broken = (overrides) => anatomyContractProblems(Object.assign(Object.create(scene), overrides));

    assert.match(broken({ getAnatomyTree: undefined })[0], /does not implement getAnatomyTree/);
    assert.ok(
      broken({ selectStructure: () => true }).some((line) => /reported .* as selected/.test(line)),
      'a scene that says yes but selects nothing'
    );
    assert.ok(
      broken({ selectStructure: (id) => scene.selectStructure(id === 402 ? 212 : id) })
        .some((line) => /selecting 402 reported 212 as selected/.test(line)),
      'a scene that selects the wrong structure'
    );
    assert.ok(
      broken({
        getAnatomyTree: () =>
          scene.getAnatomyTree().map((node) => ({ ...node, nodeId: node.nodeId.replace(GROUP_ID_PREFIX, '') })),
      }).some((line) => /is not marked as one/.test(line)),
      'a group that could be read as a structure'
    );
  } finally {
    scene.dispose();
  }
});

test('anatomy contract: the tree builder nests on the hierarchy it is given', () => {
  const tree = buildAnatomyTree([
    { id: 1, name: 'A', nameJa: 'あ', hierarchy: ['Body', 'Left', 'Gyri'], hierarchyJa: ['体', '左', '回'] },
    { id: 2, name: 'B', nameJa: 'い', hierarchy: ['Body', 'Left', 'Gyri'], hierarchyJa: ['体', '左', '回'] },
    { id: 3, name: 'C', nameJa: 'う', hierarchy: ['Body', 'Right', 'Sulci'], hierarchyJa: ['体', '右', '溝'] },
  ]);

  assert.equal(tree.length, 1);
  assert.equal(tree[0].label, 'Body');
  assert.equal(tree[0].labelJa, '体');
  assert.deepEqual(tree[0].children.map((node) => node.label), ['Left', 'Right'], 'first-seen order, not alphabetical');
  assert.deepEqual(treeLeaves(tree).map((leaf) => leaf.structureId), [1, 2, 3]);
  assert.deepEqual(treeLeaves(tree).map((leaf) => leaf.label), ['A', 'B', 'C']);

  // The last hierarchy level is the structure's own family: grouping on it too
  // would give every leaf a parent of one, which is a list wearing a tree.
  assert.equal(tree[0].children[0].children.length, 2);

  // A structure with no hierarchy is still reachable rather than dropped.
  const flat = buildAnatomyTree([{ id: 9, name: 'Loose', nameJa: '単独', hierarchy: [], hierarchyJa: [] }]);
  assert.deepEqual(treeLeaves(flat).map((leaf) => leaf.structureId), [9]);
});


/**
 * The panels, mounted against a real scene in a fake document.
 *
 * These are the claims a screenshot cannot make and the browser check can only
 * make one viewport at a time: what the DOM says, after each transition.
 */
function mountTree(scene) {
  const restore = installFakeDocument();
  document.documentElement = new FakeElement('html');
  const panel = createAnatomyTreePanel(scene);
  return { panel, restore };
}

test('anatomy tree: what is drawn, what is held and what is announced are one answer', () => {
  const scene = buildScene();
  const { panel, restore } = mountTree(scene);
  try {
    const branches = findByClass(panel.element, 'anatomy-tree-branch');
    assert.ok(branches.length > 0, 'the tree groups');

    // The bug this test exists for: `aria-expanded` was updated on the toggle
    // and left `false` on the treeitem, so assistive technology read every
    // branch as collapsed however the tree looked.
    const agree = (branch) => {
      const toggle = branch.children[0];
      const children = branch.children[1];
      return (
        branch.getAttribute('aria-expanded') === toggle.getAttribute('aria-expanded') &&
        branch.getAttribute('aria-expanded') === String(!children.hidden)
      );
    };
    for (const branch of branches) assert.ok(agree(branch), branch.getAttribute('aria-label'));

    // Toggling by click, and by the branch being revealed for a 3D selection,
    // both go through the one writer.
    const top = branches[0];
    top.children[0].click();
    assert.ok(agree(top), 'after clicking the toggle');
    top.children[0].click();
    assert.ok(agree(top), 'after clicking it back');

    // A structure selected from the model opens the branch holding it, and that
    // branch has to announce what it now looks like.
    for (const branch of branches) {
      if (branch.getAttribute('aria-expanded') === 'true') branch.children[0].click();
    }
    scene.selectStructure(325);
    for (const branch of branches) assert.ok(agree(branch), 'after a selection revealed a branch');
    const selected = findByClass(panel.element, 'anatomy-tree-leaf').filter(
      (row) => row.getAttribute('aria-selected') === 'true'
    );
    assert.equal(selected.length, 1);
    assert.equal(selected[0].dataset.structure, '325');
  } finally {
    panel.dispose();
    scene.dispose();
    restore();
  }
});

test('anatomy tree: one entry point, and focus is not selection', () => {
  const scene = buildScene();
  const { panel, restore } = mountTree(scene);
  try {
    const rows = () => [
      ...findByClass(panel.element, 'anatomy-tree-group'),
      ...findByClass(panel.element, 'anatomy-tree-leaf'),
    ];
    const tabbable = () => rows().filter((row) => row.getAttribute('tabindex') === '0');
    assert.equal(tabbable().length, 1, 'a tree is one stop in the tab ring, not four hundred');

    const first = tabbable()[0];
    const key = (name, target = tabbable()[0]) => {
      let stopped = false;
      panel.element.dispatchEvent({
        type: 'keydown',
        key: name,
        target,
        preventDefault() {},
        stopPropagation() { stopped = true; },
      });
      return stopped;
    };

    // Arrowing moves focus and commits nothing.
    assert.equal(key('ArrowDown'), true, 'the tree stops the key reaching the scene');
    assert.equal(tabbable().length, 1);
    assert.notEqual(tabbable()[0], first, 'focus moved');
    assert.equal(scene.getAnatomySelection(), null, 'and selected nothing');

    key('End');
    const last = tabbable()[0];
    key('Home');
    assert.notEqual(tabbable()[0], last, 'Home and End are different places');

    // Enter is what commits, and only on a structure. Open every branch first,
    // because a row inside a collapsed one is not somewhere the keyboard is.
    for (let pass = 0; pass < 6; pass += 1) {
      const closed = findByClass(panel.element, 'anatomy-tree-group').filter(
        (group) => group.getAttribute('aria-expanded') === 'false'
      );
      if (!closed.length) break;
      for (const group of closed) group.click();
    }
    const leaf = findByClass(panel.element, 'anatomy-tree-leaf')[0];
    key('Enter', leaf);
    assert.equal(scene.getAnatomySelection()?.id, Number(leaf.dataset.structure));

    // Every key the tree handles is stopped, so the scene's own shortcuts —
    // arrows seek, Space plays — do not fire underneath it.
    for (const name of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' ']) {
      assert.equal(key(name), true, name);
    }
    // And a key it does not handle is left alone.
    assert.equal(key('r'), false, 'r is the scene reset, and the tree does not eat it');
  } finally {
    panel.dispose();
    scene.dispose();
    restore();
  }
});

test('anatomy detail: a pinned structure is not rewritten by a hover', () => {
  const scene = buildScene();
  const restore = installFakeDocument();
  document.documentElement = new FakeElement('html');
  const info = createAnatomyInfoPanel(scene, { heading: true });
  try {
    const name = () => findByClass(info.element, 'anatomy-name')[0].textContent;
    const pieces = (id) => scene.meshesByAtlasId.get(id);

    scene.selectStructure(212);
    const pinned = name();
    assert.equal(pinned, scene.getAnatomySelection().name);

    // A pointer crossing the model previews nothing while something is pinned.
    scene._setHovered(pieces(208)[0]);
    assert.equal(name(), pinned, 'hovering another structure rewrote the pinned card');
    scene._setHovered(null);
    assert.equal(name(), pinned);

    // Clicking that structure is what changes it.
    scene.selectStructure(208);
    assert.equal(name(), scene.getAnatomySelection().name);
    assert.notEqual(name(), pinned);

    // With nothing pinned, hover is a preview again — that guidance stays.
    scene.clearSelection();
    scene._setHovered(pieces(325)[0]);
    assert.equal(name(), scene.getAnatomyHover().name);
  } finally {
    info.dispose();
    scene.dispose();
    restore();
  }
});

test('anatomy panels: a re-attached atlas leaves nothing of the old one in the DOM', () => {
  const scene = buildScene();
  const restore = installFakeDocument();
  document.documentElement = new FakeElement('html');
  const info = createAnatomyInfoPanel(scene, { heading: true });
  const tree = createAnatomyTreePanel(scene);
  try {
    scene.selectStructure(212);
    scene.isolateStructure(212);
    const pinnedName = findByClass(info.element, 'anatomy-name')[0].textContent;
    assert.equal(pinnedName, scene.getAnatomySelection().name);

    // The getters are not the whole story: a panel that only repaints on an
    // event keeps showing a structure from a model that has been thrown away.
    scene.attachAtlas(atlas());

    assert.equal(scene.getAnatomySelection(), null);
    assert.equal(
      findByClass(info.element, 'anatomy-name')[0].textContent,
      'Select a structure',
      'the card still names a structure from the discarded atlas'
    );
    assert.equal(
      findByClass(tree.element, 'anatomy-tree-leaf').filter((row) => row.getAttribute('aria-selected') === 'true').length,
      0,
      'a row from the discarded atlas is still marked selected'
    );
    assert.equal(
      findByClass(tree.element, 'anatomy-tree-leaf').filter((row) => row.classList.contains('is-isolated')).length,
      0,
      'a row from the discarded atlas is still marked isolated'
    );
    assert.equal(findByClass(tree.element, 'anatomy-tree-leaf').length, FIXTURE.length, 'and the list is not doubled');

    // The new model is live.
    scene.selectStructure(212);
    assert.equal(findByClass(info.element, 'anatomy-name')[0].textContent, scene.getAnatomySelection().name);
  } finally {
    info.dispose();
    tree.dispose();
    scene.dispose();
    restore();
  }
});
