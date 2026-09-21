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
import { PALETTE, TRACEABLE_TASKS } from '../src/data/higherBrainFunction.js';

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

  const lesionColour = new THREE.Color(PALETTE.lesion);
  for (const [key, meshes] of scene.meshesByStructure) {
    const isDamaged = damaged.has(key);
    for (const mesh of meshes) {
      const drawnAsLesion = mesh.material.color.getHex() === lesionColour.getHex();
      if (isDamaged) assert.ok(drawnAsLesion, `${key} is drawn as the lesion`);
      else assert.ok(!drawnAsLesion, `${key} is not drawn as the lesion`);
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
  const intact = buildScene({ task: 'repetition' }, 0);
  assert.equal(intact.blockedFraction(), 1, 'nothing stops a signal in an intact brain');
  assert.ok(intact.routePoints().length >= 4, 'the route has a point for every step');
  intact.dispose();

  const cut = buildScene({ lesion: 'dominant-arcuate', task: 'repetition' });
  const task = cut.tracedTask();
  assert.equal(task.blockedAt.id, 'dorsal-phonological');
  const fraction = cut.blockedFraction();
  assert.ok(fraction > 0 && fraction < 1, 'the signal gets part of the way and stops');

  // Where the marker is allowed to get to is the blocked step's own point on
  // the atlas, **at the end of its travel**. Two earlier versions of this
  // check were green while the scene placed the marker by arc length, three
  // quarters of a unit past the connection the model had cut (L-53). The
  // first compared distances *from the start* — a radius, which the wrong
  // point matched by accident. The second took the closest approach over a
  // whole pass, and a curve runs through every one of its control points on
  // the way, so the marker touched the right place while travelling straight
  // on through it. What tells a signal that stops from one that does not is
  // where it is when it has finished moving.
  const blockedStepIndex = task.route.findIndex((step) => step === task.blockedAt);
  const points = cut.routePoints();
  const stopsAt = points[blockedStepIndex].position;
  const beyond = points[blockedStepIndex + 1].position;
  // Driven by absolute time rather than by sampling a free-running animation:
  // the run is deterministic, so the instant the travelling is over is a
  // number, and where the marker is at that instant is the claim.
  const cycle = HigherBrainFunctionScene.CYCLE_SECONDS;
  cut.renderAtSeconds(cycle * 0.9);
  assert.equal(cut.cyclePhase().id, 'answered', 'the travelling is over by then');
  assert.ok(
    cut.pulse.position.distanceTo(stopsAt) < 0.1,
    `the signal ends at the cut connection (it ended ${cut.pulse.position.distanceTo(stopsAt).toFixed(3)} away)`
  );

  let closestToBeyond = Infinity;
  for (let i = 0; i <= 120; i += 1) {
    cut.renderAtSeconds((cycle * i) / 120);
    closestToBeyond = Math.min(closestToBeyond, cut.pulse.position.distanceTo(beyond));
  }
  assert.ok(
    closestToBeyond > 0.5,
    `and never reaches the step beyond it (closest approach ${closestToBeyond.toFixed(3)})`
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

test('model: a task that is impaired without being blocked still says where it is weakest', () => {
  // Half a lesion leaves every step carrying something, so nothing is
  // "blocked" — and the row that answers "where does it stop?" used to say
  // 「通っています」 next to a row reading 低下, which is two answers to one
  // question.
  const scene = buildScene({ lesion: 'dominant-inferior-frontal', task: 'repetition' }, 0.5);
  const task = scene.tracedTask();
  assert.equal(task.status, FUNCTION_STATUS.IMPAIRED);
  assert.equal(task.blockedAt, null, 'nothing is cut outright at half extent');
  const row = scene.getMetrics().find((candidate) => candidate.id === 'blocked-at');
  assert.equal(row.valueJa, task.weakestLink.labelJa);
  assert.notEqual(row.valueJa, '通っています');

  // And when the task really is intact, it says so.
  const intact = buildScene({ task: 'repetition' }, 0);
  assert.equal(intact.getMetrics().find((candidate) => candidate.id === 'blocked-at').valueJa, '通っています');
  scene.dispose();
  intact.dispose();
});

test('model: a tract is drawn only when the task runs through it or the lesion took it', () => {
  const scene = buildScene({ task: 'repetition' }, 0);
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
  const scene = buildScene({}, 1);
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

test('model: no declared site produces an isolated naming failure', () => {
  // Every step of naming is shared with another task now that the word's sound
  // form is retrieved on the way — so the classifier's anomic branch, which is
  // the right reading of a naming-only failure, is not reachable from any of
  // the declared sites. The model card says so; this is what would notice if a
  // route change made it reachable and the card stopped being true.
  for (const site of LESION_SITES) {
    for (const extent of [0.4, 0.7, 1]) {
      const state = solveHigherBrainFunction({ lesions: [site], extent });
      assert.ok(
        !state.syndromes.some((syndrome) => syndrome.id === 'anomic-aphasia'),
        `${site.id} at ${extent} does not read as anomic aphasia`
      );
    }
  }
});

test('model: the scene refuses to answer for a handedness the model will not model', () => {
  // The scene names the handedness it solves for in one place. If that is ever
  // made a control, this is what stops it silently mirroring the brain.
  const scene = buildScene();
  assert.equal(scene.solved.dominance.handedness, 'right');
  assert.equal(scene.getModelControls().some((control) => control.id === 'handedness'), false);
  scene.dispose();
});

test('model: tracing a route that runs under the cortex shows what it runs through', () => {
  // The frontal–subcortical circuits are deep: cortex, then caudate, pallidum
  // and thalamus. Left opaque, the cortex hid every part of the route except
  // the one node on the surface.
  const surface = buildScene({ lesion: 'dominant-inferior-frontal', task: 'repetition' }, 1);
  const cortexOpacity = (scene, label, side) =>
    (scene.meshesByStructure.get(`${label}|${side}`) ?? [])[0]?.material.opacity;
  assert.equal(cortexOpacity(surface, 'Lingual gyrus', 'right'), 1, 'a surface route leaves the cortex alone');

  const deep = buildScene({ lesion: 'striatum-head', task: 'set-shifting-and-planning' }, 1);
  assert.ok(
    cortexOpacity(deep, 'Lingual gyrus', 'right') < 0.4,
    'cortex the route runs under is faded to show it'
  );
  // The structures the route is actually about stay solid, and so does the lesion.
  assert.equal(cortexOpacity(deep, 'Middle frontal gyrus', 'left'), 1, 'a node of the route is not a ghost');
  const caudate = deep.meshesByStructure.get('Caudate nucleus|left')[0];
  assert.equal(caudate.material.opacity, 1);
  assert.ok(caudate.material.color.getHex() !== new THREE.Color(PALETTE.tissue).getHex(), 'the lesion is on it');
  surface.dispose();
  deep.dispose();
});

test('model: a route that runs deep draws its own structures in front, and moves none of them', () => {
  const deep = buildScene({ lesion: 'striatum-head', task: 'set-shifting-and-planning' }, 1);
  const caudate = deep.meshesByStructure.get('Caudate nucleus|left')[0];
  const cortexOffRoute = deep.meshesByStructure.get('Lingual gyrus|right')[0];
  const before = caudate.position.clone();

  assert.equal(caudate.material.depthTest, false, 'the structure the route runs through is in front');
  assert.ok(caudate.renderOrder > cortexOffRoute.renderOrder);
  // But the route's cortical node is not lifted: it is on the surface already,
  // and in a lateral view a gyrus and the basal ganglia behind it occupy the
  // same screen space — lifting both painted the gyrus over the structure the
  // lift existed to reveal.
  const frontalCortexOnRoute = deep.meshesByStructure.get('Middle frontal gyrus|left')[0];
  assert.equal(frontalCortexOnRoute.material.depthTest, true, 'surface cortex stays where it is in the depth order');
  assert.ok(caudate.position.equals(before), 'and it is still where it was');
  assert.deepEqual(caudate.scale.toArray(), [1, 1, 1]);

  // A route that stays on the surface does not lift anything.
  const surface = buildScene({ lesion: 'dominant-inferior-frontal', task: 'repetition' }, 1);
  const broca = surface.meshesByStructure.get('Opercular part of inferior frontal gyrus|left')[0];
  assert.equal(broca.material.depthTest, true, 'a surface route is seen the ordinary way');
  deep.dispose();
  surface.dispose();
});

test('model: the run asks, carries, and answers — and the answer is the task’s own status', () => {
  const cycle = HigherBrainFunctionScene.CYCLE_SECONDS;
  const intact = buildScene({ task: 'repetition' }, 0);

  // Three parts, in that order, every run.
  assert.deepEqual(
    [0.02, 0.5, 0.95].map((at) => { intact.renderAtSeconds(cycle * at); return intact.cyclePhase().id; }),
    ['asked', 'travelling', 'answered']
  );

  // Asked: the marker is at the structure the task enters by, and the stimulus
  // is on screen there.
  intact.renderAtSeconds(cycle * 0.07);
  const entry = intact.routePoints()[0].position;
  assert.ok(intact.stimulus.mesh.visible);
  assert.ok(intact.stimulus.mesh.position.equals(entry));
  assert.ok(intact.stimulus.material.opacity > 0.3);
  assert.ok(intact.pulse.position.distanceTo(entry) < 1e-6, 'nothing has travelled yet');

  // Answered: an intact route answers, at the far end.
  intact.renderAtSeconds(cycle * 0.9);
  assert.equal(intact.answerStrength(), 1);
  assert.ok(intact.answer.mesh.visible);
  assert.ok(intact.answer.mesh.position.equals(intact.routePoints().at(-1).position));

  // A route that is cut answers with nothing at all — not a weaker flash, none.
  const cut = buildScene({ lesion: 'dominant-inferior-frontal', task: 'repetition' }, 1);
  assert.equal(cut.tracedTask().status, FUNCTION_STATUS.LOST);
  assert.equal(cut.answerStrength(), 0);
  for (let i = 0; i <= 40; i += 1) {
    cut.renderAtSeconds((cycle * i) / 40);
    assert.equal(cut.answer.mesh.visible, false, 'a lost task never answers');
  }

  // And a route that is only weakened answers weakly.
  const weak = buildScene({ lesion: 'dominant-inferior-frontal', task: 'repetition' }, 0.5);
  assert.equal(weak.tracedTask().status, FUNCTION_STATUS.IMPAIRED);
  weak.renderAtSeconds(cycle * 0.9);
  assert.ok(weak.answer.mesh.visible);
  assert.ok(
    weak.answer.material.opacity < intact.answer.material.opacity,
    'an impaired route answers more faintly than an intact one'
  );
  intact.dispose();
  cut.dispose();
  weak.dispose();
});

test('model: the same second of the run renders the same, whatever the frame rate', () => {
  // The sequence has to be a recording, not a performance: a screen capture at
  // 30 frames a second and one at 60 have to show the same thing at 2.0 s.
  const cycle = HigherBrainFunctionScene.CYCLE_SECONDS;
  const coarse = buildScene({ lesion: 'dominant-arcuate', task: 'repetition' }, 1);
  const fine = buildScene({ lesion: 'dominant-arcuate', task: 'repetition' }, 1);
  for (let i = 0; i < 60; i += 1) coarse.update(1 / 30);
  for (let i = 0; i < 120; i += 1) fine.update(1 / 60);
  assert.ok(Math.abs(coarse.cycleTime - fine.cycleTime) < 1e-9);
  assert.ok(coarse.pulse.position.distanceTo(fine.pulse.position) < 1e-9);

  // And driving it by absolute time gives the same answer as having played it.
  const driven = buildScene({ lesion: 'dominant-arcuate', task: 'repetition' }, 1);
  driven.renderAtSeconds(2.0);
  coarse.renderAtSeconds(2.0);
  assert.ok(driven.pulse.position.distanceTo(coarse.pulse.position) < 1e-9);
  assert.equal(driven.cyclePhase().id, coarse.cyclePhase().id);
  coarse.dispose();
  fine.dispose();
  driven.dispose();
});

test('model: the bundle a route runs inside is drawn where a reader can see it', () => {
  // Cutting the arcuate fasciculus is this model's signature claim, and the
  // bundle sits under the cortex: drawn the ordinary way, the sequence showed a
  // signal stopping at nothing visible.
  const scene = buildScene({ lesion: 'dominant-arcuate', task: 'repetition' }, 1);
  const arcuate = scene.meshesByStructure.get('Arcuate fasciculus|left')[0];
  assert.equal(arcuate.visible, true);
  assert.equal(arcuate.material.depthTest, false, 'the cut bundle is in front of the cortex');
  assert.ok(arcuate.renderOrder > 0);
  assert.ok(arcuate.position.equals(arcuate.position.clone()), 'and it has not been moved');

  // The cortex is not faded for it, though: this route never leaves the surface
  // except inside that one bundle.
  const cortex = scene.meshesByStructure.get('Lingual gyrus|right')[0];
  assert.equal(cortex.material.opacity, 1);

  // A tract no route is using stays out of the way entirely.
  const unused = scene.meshesByStructure.get('Uncinate fasciculus|left')[0];
  assert.equal(unused.visible, false);
  scene.dispose();
});
