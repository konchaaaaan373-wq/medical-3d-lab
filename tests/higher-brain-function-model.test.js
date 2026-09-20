import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import {
  FUNCTION_EDGES,
  FUNCTION_NODES,
  FUNCTION_STATUS,
  FUNCTION_TASKS,
  LESION_SITES,
  TRANSMISSION_INTACT,
  TRANSMISSION_LOST,
  dominanceFor,
  edgeBetween,
  lesionSiteById,
  resolveSide,
  solveHigherBrainFunction,
} from '../src/models/higherBrainFunction.js';
import HigherBrainFunctionScene from '../src/scenes/nervous/scenes/higherBrainFunction/index.js';
import { TRACEABLE_TASKS } from '../src/data/higherBrainFunction.js';

/**
 * The model's own consistency, and the scene reading it.
 *
 * `tests/higher-brain-function-physiology.test.js` holds the claims about
 * people. This file holds the two things that are about the repository: that
 * the network is a network (every route a chain of declared connections, every
 * lesion site anatomy rather than a syndrome), and that **the picture is the
 * solved state** — every mesh the scene lights, every step the signal reaches
 * and every row of the read-out comes from one `solveHigherBrainFunction` call
 * and not from a second opinion held by the view.
 */

// ---------------------------------------------------------------------------
// The network

test('model: only the right-handed case is answered', () => {
  const dominance = dominanceFor('right');
  assert.equal(resolveSide('dominant', dominance), 'left');
  assert.equal(resolveSide('nondominant', dominance), 'right');
  assert.equal(resolveSide('median', dominance), 'median');
  assert.throws(() => dominanceFor('left'), /only right-handedness is modelled/);
  assert.throws(() => solveHigherBrainFunction({ handedness: 'ambidextrous' }), /right-handedness/);
});

test('model: an intact brain leaves every task intact and names no syndrome', () => {
  const state = solveHigherBrainFunction({ lesions: [] });
  assert.equal(state.syndromes.length, 0);
  assert.ok(state.tasks.every((task) => task.status === FUNCTION_STATUS.INTACT));
  assert.ok(state.tasks.every((task) => task.blockedAt === null));
  assert.equal(state.affectedStructures.length, 0);

  // A declared lesion at zero extent is the same brain: extent is an input.
  const untouched = solveHigherBrainFunction({ lesions: [lesionSiteById('dominant-perisylvian')], extent: 0 });
  assert.equal(untouched.syndromes.length, 0);
  assert.ok(untouched.tasks.every((task) => task.status === FUNCTION_STATUS.INTACT));
});

test('model: every route is a chain of declared connections between declared nodes', () => {
  const nodeIds = new Set(FUNCTION_NODES.map((node) => node.id));
  const used = new Set();
  for (const task of FUNCTION_TASKS) {
    assert.ok(task.routes.length > 0, `${task.id} has at least one route`);
    for (const route of task.routes) {
      for (const [index, nodeId] of route.entries()) {
        assert.ok(nodeIds.has(nodeId), `${task.id} names node ${nodeId}`);
        if (index === 0) continue;
        const edge = edgeBetween(route[index - 1], nodeId);
        assert.ok(edge, `${task.id} has a declared connection ${route[index - 1]} → ${nodeId}`);
        used.add(edge.id);
      }
    }
  }
  // A connection nothing routes through cannot change any answer, so it would
  // be a claim the model never makes.
  for (const edge of FUNCTION_EDGES) {
    assert.ok(used.has(edge.id), `${edge.id} is used by at least one task route`);
  }
});

test('model: every lesion site is anatomy plus a cause, and names no deficit', () => {
  const nodeStructures = new Set(
    FUNCTION_NODES.flatMap((node) => node.structures.map((structure) => `${structure.label}|${structure.side}`))
  );
  const edgeStructures = new Set(
    FUNCTION_EDGES.flatMap((edge) => edge.within.map((structure) => `${structure.label}|${structure.side}`))
  );
  const edgeIds = new Set(FUNCTION_EDGES.map((edge) => edge.id));

  for (const site of LESION_SITES) {
    assert.ok(site.labelJa && site.usualCauseJa, `${site.id} says what it is and what usually causes it`);
    assert.ok(site.structures.length > 0, `${site.id} is drawn on the atlas`);
    for (const id of site.connections) assert.ok(edgeIds.has(id), `${site.id} interrupts a declared connection`);
    const touches = site.structures.some((structure) => {
      const key = `${structure.label}|${structure.side}`;
      return nodeStructures.has(key) || edgeStructures.has(key);
    });
    assert.ok(touches, `${site.id} damages a structure the network uses`);
    const text = JSON.stringify(site).toLowerCase();
    for (const word of ['aphasia', 'neglect', 'apraxia', 'amnesia', 'alexia', 'agraphia']) {
      assert.ok(!text.includes(word), `${site.id} does not name the deficit it produces (${word})`);
    }
  }
});

test('model: a bigger lesion is never reported as a lighter deficit', () => {
  const site = lesionSiteById('dominant-inferior-frontal');
  let previous = Infinity;
  for (const extent of [0, 0.25, 0.5, 0.75, 1]) {
    const repetition = solveHigherBrainFunction({ lesions: [site], extent })
      .tasks.find((task) => task.id === 'repetition');
    assert.ok(repetition.transmission <= previous, `transmission falls as extent rises (at ${extent})`);
    previous = repetition.transmission;
  }
  assert.equal(previous, 0);
  assert.ok(TRANSMISSION_LOST < TRANSMISSION_INTACT, 'the two thresholds are ordered');
});

test('model: two mild lesions on one route add up', () => {
  const half = (label) => ({ structures: [{ label, side: 'dominant' }], connections: [], severity: 0.45 });
  const alone = solveHigherBrainFunction({ lesions: [half('Temporal plane')] });
  const together = solveHigherBrainFunction({
    lesions: [half('Temporal plane'), half('Opercular part of inferior frontal gyrus')],
  });
  const transmissionOf = (state) => state.tasks.find((task) => task.id === 'repetition').transmission;
  assert.equal(alone.tasks.find((task) => task.id === 'repetition').status, FUNCTION_STATUS.IMPAIRED);
  assert.ok(transmissionOf(together) < transmissionOf(alone), 'a route is no better than the product of its steps');
});

// ---------------------------------------------------------------------------
// The scene reading it

/**
 * A fixture atlas with the real file's labels, sides and categories.
 *
 * The geometry is boxes — nothing here is about shape — but the metadata is
 * read out of the distributed GLB, so the scene's filtering runs against the
 * real distribution of categories rather than a convenient subset.
 */
function fixtureAtlas() {
  const bytes = readFileSync(new URL('../public/assets/brain/brain.glb', import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const atlas = new THREE.Group();
  atlas.name = 'fixture-atlas';
  for (const node of gltf.nodes) {
    const extras = node.extras;
    if (extras?.bx_id == null) continue;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial());
    mesh.name = `${extras.bx_label}.${extras.bx_side}`;
    // Deterministic, distinct, and spread far enough that two structures never
    // land on the same centroid.
    const id = Number(extras.bx_id);
    mesh.position.set(
      (extras.bx_side === 'left' ? 1 : extras.bx_side === 'right' ? -1 : 0) * 0.8,
      ((id % 17) - 8) * 0.12,
      ((id % 23) - 11) * 0.1
    );
    mesh.userData = { ...extras };
    atlas.add(mesh);
  }
  return atlas;
}

const ATLAS = fixtureAtlas();

function buildScene(controls = {}, progress = 1) {
  const scene = new HigherBrainFunctionScene({ atlas: ATLAS.clone(true) });
  scene.build();
  for (const [id, value] of Object.entries(controls)) scene.setModelControl(id, value);
  scene.setProgress(progress);
  return scene;
}

const meshFor = (scene, label, side) => scene.meshesByStructure.get(`${label}|${side}`) ?? [];

test('model: the scene lights the structures the model damaged, and nothing else', () => {
  const scene = buildScene({ lesion: 'dominant-inferior-frontal' });
  const damaged = new Set(
    scene.solved.affectedStructures.map((structure) => `${structure.label}|${structure.side}`)
  );
  assert.deepEqual([...damaged].sort(), [
    'Opercular part of inferior frontal gyrus|left',
    'Triangular part of inferior frontal gyrus|left',
  ]);

  const lesionColour = new THREE.Color('#e3483f');
  for (const [key, meshes] of scene.meshesByStructure) {
    const isDamaged = damaged.has(key);
    for (const mesh of meshes) {
      const distance = mesh.material.color.getHex() === lesionColour.getHex();
      if (isDamaged) assert.ok(distance, `${key} is drawn as the lesion`);
      else assert.ok(!distance, `${key} is not drawn as the lesion`);
    }
  }

  // The mirror-image structure on the other side is untouched, which is the
  // whole point of the sides being resolved once, by the model.
  assert.ok(meshFor(scene, 'Opercular part of inferior frontal gyrus', 'right').length > 0);
  assert.notEqual(
    meshFor(scene, 'Opercular part of inferior frontal gyrus', 'right')[0].material.color.getHex(),
    lesionColour.getHex()
  );
  scene.dispose();
});

test('model: the traced route stops where the model says it stops', () => {
  const intact = buildScene({ lesion: 'none', task: 'repetition' });
  assert.equal(intact.blockedFraction(), 1, 'nothing stops a signal in an intact brain');
  assert.ok(intact.routePoints().length >= 4, 'the route has a point for every step');
  intact.dispose();

  const cut = buildScene({ lesion: 'dominant-arcuate', task: 'repetition' });
  const task = cut.tracedTask();
  assert.equal(task.blockedAt.id, 'dorsal-phonological');
  const fraction = cut.blockedFraction();
  assert.ok(fraction > 0 && fraction < 1, 'the signal gets part of the way and stops');

  // The marker never travels past the step that stopped it.
  cut.update(10);
  const reached = cut.routeCurve.getUtoTmapping(0, 0);
  assert.equal(typeof reached, 'number');
  for (let i = 0; i < 40; i += 1) cut.update(0.1);
  const furthest = cut.routeCurve.getPointAt(fraction);
  assert.ok(
    cut.pulse.position.distanceTo(cut.routeCurve.getPointAt(0)) <= furthest.distanceTo(cut.routeCurve.getPointAt(0)) + 1e-6,
    'the signal never passes the block'
  );
  cut.dispose();
});

test('model: the read-out is the solved state, not a second calculation', () => {
  const scene = buildScene({ lesion: 'dominant-posterior-superior-temporal', task: 'repetition' });
  const rows = new Map(scene.getMetrics().map((row) => [row.id, row]));
  for (const task of scene.solved.tasks) {
    const row = rows.get(task.id);
    assert.ok(row, `${task.id} is on the read-out`);
    const expected = { intact: '保たれる', impaired: '低下', lost: '消失' }[task.status];
    assert.equal(row.valueJa, expected, `${task.id} reads the solved status`);
  }
  assert.equal(rows.get('syndrome').valueJa, scene.solved.syndromes.map((s) => s.labelJa).join('＋'));
  assert.match(rows.get('syndrome').valueJa, /Wernicke/);
  assert.equal(rows.get('probe').valueJa, '復唱', 'the probe row names the traced task');
  assert.match(rows.get('probe').labelJa, /私のあとに続けて/, 'and says how it is tested');

  // Every task has a short name for the panel: the model's clinical labels are
  // long enough to arrive clipped in one narrow column, which is how a row
  // came to read 「覚理」.
  for (const task of scene.solved.tasks) {
    const row = rows.get(task.id);
    assert.ok(row.labelJa.length <= 9, `${task.id} has a read-out label that fits (${row.labelJa})`);
    assert.ok(row.labelJa.length > 0);
  }
  scene.dispose();
});

test('model: a tract is drawn only when the task runs through it or the lesion took it', () => {
  const scene = buildScene({ lesion: 'none', task: 'repetition' });
  const visibleTracts = () => [...scene.meshesByStructure.entries()]
    .filter(([, meshes]) => meshes.some((mesh) => mesh.userData.isTract && mesh.visible))
    .map(([key]) => key).sort();

  // Repetition runs through the arcuate fasciculus, and through nothing else
  // the atlas files as a tract.
  assert.deepEqual(visibleTracts(), ['Arcuate fasciculus|left']);

  scene.setModelControl('task', 'praxis-right-hand');
  assert.deepEqual(visibleTracts(), ['Superior longitudinal fasciculus III|left']);

  // The left hand crosses the commissure instead, which the atlas files as
  // white matter rather than as a tract — so no tract is drawn, and the route
  // still has a mesh to pass through.
  scene.setModelControl('task', 'praxis-left-hand');
  assert.deepEqual(visibleTracts(), []);
  assert.ok(
    scene.routePoints().some((point) => point.step.id === 'callosal-praxis'),
    'the crossing is a step of the route'
  );

  // Fifty-odd tract meshes exist in the atlas; the rest stay out of the way.
  const allTracts = [...scene.meshesByStructure.entries()]
    .filter(([, meshes]) => meshes.some((mesh) => mesh.userData.isTract));
  assert.ok(allTracts.length >= 50, 'the fixture carries the atlas tract meshes');
  scene.dispose();
});

test('model: changing the lesion changes the colours and moves no anatomy', () => {
  const scene = buildScene({ lesion: 'none' });
  const before = new Map();
  for (const [key, meshes] of scene.meshesByStructure) before.set(key, meshes.map((mesh) => mesh.position.clone()));

  scene.setModelControl('lesion', 'nondominant-parietal');
  assert.ok(scene.solved.affectedStructures.length > 0, 'the lesion arrived');
  for (const [key, meshes] of scene.meshesByStructure) {
    meshes.forEach((mesh, index) => {
      assert.ok(mesh.position.equals(before.get(key)[index]), `${key} did not move`);
      assert.deepEqual(mesh.scale.toArray(), [1, 1, 1], `${key} was not resized`);
    });
  }
  scene.dispose();
});

test('model: every task is on the read-out, and every traceable one has a route to draw', () => {
  const scene = buildScene();
  const rows = new Set(scene.getMetrics().map((row) => row.id));
  for (const task of FUNCTION_TASKS) {
    assert.ok(rows.has(task.id), `${task.id} is on the read-out`);
  }
  // Tracing is the narrower job: a button per task on a panel over the brain.
  const offered = scene.getModelControls().find((control) => control.id === 'task').options;
  assert.deepEqual(offered.map((option) => option.value), [...TRACEABLE_TASKS]);
  assert.ok(offered.length < FUNCTION_TASKS.length, 'not every solved task needs a button');
  for (const id of TRACEABLE_TASKS) {
    scene.setModelControl('task', id);
    const points = scene.routePoints();
    assert.ok(points.length >= 1, `${id} has a route the scene can draw`);
    assert.ok(scene.pulse.visible, `${id} shows where the task is`);
    // A task with one structure and nothing to travel between gets a marker
    // and no line: a line from a place to itself would draw a journey the
    // model does not claim.
    if (points.length === 1) assert.equal(scene.routeLine, null, `${id} draws no line`);
    else assert.ok(scene.routeLine, `${id} draws a line`);
  }

  // And a one-structure task still reports being blocked.
  scene.setModelControl('task', 'attention-left-space');
  scene.setModelControl('lesion', 'nondominant-parietal');
  assert.equal(scene.blockedFraction(), 0, 'nothing gets through a destroyed structure');
  scene.dispose();
});

test('model: the scene refuses to answer for a handedness the model will not model', () => {
  // The scene names the handedness it solves for in one place. If that is ever
  // made a control, this is what stops it silently mirroring the brain.
  const scene = buildScene();
  assert.equal(scene.solved.dominance.handedness, 'right');
  assert.equal(scene.getModelControls().some((control) => control.id === 'handedness'), false);
  scene.dispose();
});
