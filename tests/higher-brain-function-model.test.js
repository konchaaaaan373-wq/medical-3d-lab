import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import {
  AVAILABILITY_HIGH,
  AVAILABILITY_LOW,
  COMPUTATION,
  FUNCTION_EDGES,
  FUNCTION_NODES,
  FUNCTION_TASKS,
  LESION_SITES,
  MAPPING,
  MODE,
  MODULATORY_NETWORKS,
  PATHWAY_STATE,
  STIMULUS,
  dominanceFor,
  edgeBetween,
  lesionSiteById,
  resolveSide,
  resolveTaskResult,
  routeIsEligible,
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

test('model: an intact brain reaches every declared route, and is not called normal', () => {
  const state = solveHigherBrainFunction({ lesions: [] });
  // Nothing about the solved state is a diagnosis, and there is no field that
  // could carry one: the classifier and the `syndromes` array are both gone.
  assert.equal(state.syndromes, undefined, 'no syndrome field exists to be read');
  const modelled = state.tasks.filter((task) => task.modelled);
  assert.ok(modelled.length > 0);
  for (const task of modelled) {
    assert.equal(task.computationStatus, COMPUTATION.COMPUTED, `${task.id} is computed`);
    assert.equal(task.availability, 1, `${task.id} reaches`);
    assert.equal(task.state, PATHWAY_STATE.HIGH);
    assert.equal(task.declaredBlock, false);
  }
  // And the tasks with no route are not swept up into that: they are absent,
  // which is neither reaching nor blocked.
  const absent = state.tasks.filter((task) => !task.modelled);
  assert.ok(absent.length > 0, 'some tasks are declared and not modelled');
  for (const task of absent) {
    assert.equal(task.computationStatus, COMPUTATION.NOT_MODELLED);
    assert.equal(task.availability, null);
  }
  assert.equal(state.affectedStructures.length, 0);

  // A declared lesion at zero extent is the same brain: extent is an input.
  const untouched = solveHigherBrainFunction({ lesions: [lesionSiteById('dominant-perisylvian')], extent: 0 });
  assert.ok(untouched.tasks.filter((task) => task.modelled).every((task) => task.availability === 1));
});

test('model: every route is a chain of declared connections between declared nodes', () => {
  const nodeIds = new Set(FUNCTION_NODES.map((node) => node.id));
  const used = new Set();
  for (const task of FUNCTION_TASKS) {
    if (!task.modelled) {
      assert.equal(task.routes.length, 0, `${task.id} is declared not-modelled and has no routes`);
      continue;
    }
    assert.ok(task.routes.length > 0, `${task.id} has at least one route`);
    for (const route of task.routes) {
      assert.ok(route.id, `${task.id} names its routes`);
      for (const [index, nodeId] of route.nodes.entries()) {
        assert.ok(nodeIds.has(nodeId), `${task.id} names node ${nodeId}`);
        if (index === 0) continue;
        const edge = edgeBetween(route.nodes[index - 1], nodeId);
        assert.ok(edge, `${task.id} has a declared connection ${route.nodes[index - 1]} → ${nodeId}`);
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

  for (const site of LESION_SITES) {
    assert.ok(site.labelJa && site.usualCauseJa, `${site.id} says what it is and what usually causes it`);
    assert.ok(site.structures.length > 0, `${site.id} is drawn on the atlas`);
    assert.equal(site.connections, undefined, `${site.id} does not set connections by id`);
    const touches = site.structures.some((structure) => {
      const key = `${structure.label}|${structure.side}`;
      return nodeStructures.has(key) || edgeStructures.has(key);
    });
    // A site may instead touch a network this model names and does not
    // compute — the thalamus is the case, and it has to declare the influence
    // rather than simply changing nothing.
    const declaresUnmodelled = (site.unmodelledInfluences ?? []).length > 0;
    assert.ok(
      touches || declaresUnmodelled,
      `${site.id} either damages a structure the network uses or declares an influence this model does not compute`
    );
    if (!touches) {
      for (const influence of site.unmodelledInfluences) {
        assert.ok(influence.onTasks.length > 0, `${site.id} says which tasks the influence reaches`);
        assert.ok(
          MODULATORY_NETWORKS.some((network) => network.id === influence.network),
          `${site.id} names a declared modulatory network`
        );
      }
    }
    // The site's *identity* may not be the deficit: a preset called "Broca"
    // would put a syndrome name into the control that selects it, and from
    // there into everything downstream. Its stated limitations are another
    // matter — those are allowed to explain which deficit it is not, and the
    // insula's does exactly that.
    const identity = [site.id, site.label, site.labelJa, site.usualCause, site.usualCauseJa]
      .join(' ').toLowerCase();
    for (const word of ['aphasia', 'neglect', 'apraxia', 'amnesia', 'alexia', 'agraphia', '失語', '無視', '失行', '健忘', '失読', '失書']) {
      assert.ok(!identity.includes(word), `${site.id} is not named after the deficit it produces (${word})`);
    }
  }
});

test('model: a bigger lesion never raises availability', () => {
  const site = lesionSiteById('dominant-inferior-frontal');
  for (const id of ['repetition-word', 'repetition-nonword', 'speech-initiation-route']) {
    let previous = Infinity;
    for (const extent of [0, 0.25, 0.5, 0.75, 1]) {
      const task = solveHigherBrainFunction({ lesions: [site], extent })
        .tasks.find((candidate) => candidate.id === id);
      assert.equal(task.computationStatus, COMPUTATION.COMPUTED);
      assert.ok(task.availability <= previous, `${id} does not rise as extent rises (at ${extent})`);
      previous = task.availability;
    }
    assert.equal(previous, 0, `${id} ends at zero`);
  }
  assert.ok(AVAILABILITY_LOW < AVAILABILITY_HIGH, 'the two thresholds are ordered');
});

test('model: two mild lesions on one route add up', () => {
  const half = (label, id) => ({ id, structures: [{ label, side: 'dominant' }], severity: 0.45 });
  const alone = solveHigherBrainFunction({ lesions: [half('Temporal plane', 'a')] });
  const together = solveHigherBrainFunction({
    lesions: [half('Temporal plane', 'a'), half('Opercular part of inferior frontal gyrus', 'b')],
  });
  const availabilityOf = (state) => state.tasks.find((task) => task.id === 'repetition-nonword').availability;
  assert.equal(
    alone.tasks.find((task) => task.id === 'repetition-nonword').state,
    PATHWAY_STATE.INTERMEDIATE
  );
  assert.ok(availabilityOf(together) < availabilityOf(alone), 'a route is no better than the product of its steps');
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
  const intact = buildScene({ task: 'repetition-nonword' }, 0);
  assert.equal(intact.blockedFraction(), 1, 'nothing stops a signal in an intact brain');
  assert.ok(intact.routePoints().length >= 4, 'the route has a point for every step');
  intact.dispose();

  const cut = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-nonword' });
  const task = cut.tracedTask();
  // The nonword route has no way round the dorsal bundle, so that is where it
  // stops. The known-word task does have one, and the scene traces whichever
  // task the control names — which is why the two are separate rows now.
  assert.equal(cut.blockingStep()?.id, 'dorsal-phonological');
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
  const blockedStepIndex = task.route.findIndex((step) => step === cut.blockingStep());
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
  const scene = buildScene({ lesion: 'dominant-posterior-superior-temporal', task: 'repetition-word' });
  const rows = new Map(scene.getMetrics().map((row) => [row.id, row]));
  const bands = { high: '経路は概ね通る', intermediate: '経路は部分的に通る', low: '経路はほとんど通らない' };
  const statuses = { indeterminate: '判定不能', not_modeled: '対象外（このモデルにありません）' };
  for (const task of scene.solved.tasks) {
    const row = rows.get(task.id);
    assert.ok(row, `${task.id} is on the read-out`);
    const expected = task.computationStatus === COMPUTATION.COMPUTED
      ? bands[task.state]
      : statuses[task.computationStatus];
    assert.ok(row.valueJa.startsWith(expected), `${task.id} reads the solved state (got ${row.valueJa})`);
  }
  // No syndrome row exists. This is the row that used to carry the verdict,
  // and its absence is the point.
  assert.equal(rows.get('syndrome'), undefined, 'the verdict row is gone');
  const everything = scene.getMetrics().map((row) => `${row.label} ${row.labelJa} ${row.value} ${row.valueJa}`).join(' ');
  for (const name of ['失語', 'aphasia', 'Aphasia', '失読', '失書', 'Gerstmann', '無視']) {
    assert.ok(!everything.includes(name), `the read-out does not name ${name}`);
  }
  // An eponym is allowed where it names an *area* — "Phonological analysis
  // (Wernicke area)" is anatomy, and dropping it would make the panel harder
  // to read for no gain. What it may not do is stand alone as a verdict.
  for (const match of everything.matchAll(/(Wernicke|Broca)\s*(area|野)?/g)) {
    assert.match(match[0], /(Wernicke|Broca)\s*(area|野)/, `${match[0]} appears as an area name`);
  }
  // What is being changed is on it, and so is what the traced task does not cover.
  assert.match(rows.get('mode').valueJa, /アトラス上の病変/);
  assert.match(rows.get('probe').valueJa, /私のあとに続けて/, 'the probe says how it is asked');
  assert.ok(rows.get('excludes'), 'and what the task does not evaluate');

  // Every task has a short name for the panel: the model's clinical labels are
  // long enough to arrive clipped in one narrow column, which is how a row
  // came to read 「覚理」.
  for (const task of scene.solved.tasks) {
    const row = rows.get(task.id);
    assert.ok(row.labelJa.length <= 14, `${task.id} has a read-out label that fits (${row.labelJa})`);
    assert.ok(row.labelJa.length > 0);
  }
  scene.dispose();
});

test('model: a task held down without being stopped says what holds it', () => {
  // A route can be in the middle band with nothing on it at zero, and the
  // read-out used to answer "it gets through" beside a row that said otherwise.
  const scene = buildScene({ lesion: 'dominant-insula', task: 'repetition-word' });
  const traced = scene.tracedTask();
  assert.equal(traced.state, PATHWAY_STATE.INTERMEDIATE, 'the middle band');
  assert.equal(scene.blockingStep(), null, 'and nothing on it is at zero');
  assert.ok(traced.limitingSteps.length > 0, 'but something holds it down');

  const rows = new Map(scene.getMetrics().map((row) => [row.id, row]));
  assert.notEqual(rows.get('limiting').valueJa, 'この経路上には何もありません');
  assert.match(rows.get('limiting').valueJa, /発語の運動出力|島/, 'and the read-out names it');

  // `declaredBlock` is reserved for a route with an element at exactly zero.
  // The bottom band on its own is not a blockade.
  assert.equal(traced.declaredBlock, false);
  scene.dispose();
});

test('model: a tract is drawn only when the task runs through it or the lesion took it', () => {
  const scene = buildScene({ task: 'repetition-nonword' }, 0);
  const visibleTracts = () => [...scene.meshesByStructure.entries()]
    .filter(([, meshes]) => meshes.some((mesh) => mesh.userData.isTract && mesh.visible))
    .map(([key]) => key).sort();

  // Repeating a nonword runs through the arcuate fasciculus and through
  // nothing else the atlas files as a tract. Repeating a *known* word has the
  // way round through meaning, which runs in two more bundles — the two tasks
  // draw different pictures, which is the point of their being two tasks.
  assert.deepEqual(visibleTracts(), ['Arcuate fasciculus|left']);

  // Repeating a *known* word has the way round through meaning. On an intact
  // brain the two routes are equal and the tie goes to the first declared, so
  // the picture is the same; cut the dorsal bundle and the reported route
  // becomes the other one, and the bundles it runs in are the ones drawn.
  scene.setModelControl('task', 'repetition-word');
  assert.deepEqual(visibleTracts(), ['Arcuate fasciculus|left'], 'the tie is broken by declaration order');
  scene.setModelControl('lesion', 'dominant-arcuate');
  scene.setProgress(1);
  assert.ok(
    visibleTracts().includes('Middle longitudinal fasciculus|left'),
    `the way round is drawn once it is the route reported (got ${visibleTracts().join(', ')})`
  );
  scene.setProgress(0);
  scene.setModelControl('task', 'repetition-nonword');

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

test('model: nothing in the model layer classifies, and nothing in it names a syndrome', () => {
  // This replaces its own opposite. The test here used to check that every
  // name the classifier could produce was reachable from some declared lesion
  // — a reasonable guard on a classifier that should not have existed. What is
  // pinned now is that there is no classifier: a first-match chain over four
  // route values is a diagnosis, and the features that separate these
  // syndromes are not computed here at all.
  const source = readFileSync(new URL('../src/models/higherBrainFunction.js', import.meta.url), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  // No solved state carries a syndrome, under any lesion or intervention.
  for (const site of LESION_SITES) {
    const state = solveHigherBrainFunction({ lesions: [site] });
    assert.equal(state.syndromes, undefined, `${site.id} produces no syndrome field`);
    for (const task of state.tasks) {
      assert.ok(!('syndrome' in task), `${task.id} carries no syndrome`);
    }
  }

  // A syndrome name may appear in a *declaration of what the model does not
  // do* — `excludes`, `coverageLimitations`, a preset's granularity limit —
  // and those are the most useful strings in the file. What it may not do is
  // come out as something the model decided. So the check is on the values a
  // result carries, not on the source text.
  const decided = (task) => [task.label, task.labelJa, task.computationStatus, task.state,
    ...(task.route ?? []).flatMap((step) => [step.label, step.labelJa])].filter(Boolean).join(' ');
  for (const site of LESION_SITES) {
    for (const task of solveHigherBrainFunction({ lesions: [site] }).tasks) {
      const text = decided(task);
      for (const name of ['aphasia', 'Aphasia', '失語', 'agraphia', 'alexia', 'Gerstmann', 'neglect', 'amnesia']) {
        assert.ok(!text.includes(name), `${site.id}/${task.id} does not decide "${name}"`);
      }
    }
  }
  // And nothing in the executable part of the file classifies. The word
  // "diagnosis" does appear — inside the `excludes` list of a task, saying
  // that a diagnosis is not what the value means — so what is checked is that
  // no function is one, and that no declaration produces one.
  assert.ok(!/classif/i.test(code), 'nothing in it classifies');
  assert.ok(
    !/function\s+\w*(Syndrome|Diagnos|Classif)/i.test(code),
    'and no function is named after doing it'
  );

  // The reference layer, which does hold the names, cannot be reached from
  // here. The header may *point at* it — saying where the names went is the
  // most useful sentence in the file — but nothing may import it.
  assert.ok(!/from\s+'[^']*aphasiaReference/.test(code), 'the model does not import the reference layer');
  assert.ok(source.includes('aphasiaReference'), 'and it says where the names went');
});

test('model: the reference layer is reference, and the solver cannot see it', () => {
  const model = readFileSync(new URL('../src/models/higherBrainFunction.js', import.meta.url), 'utf8');
  assert.ok(!/from '.*aphasiaReference/.test(model));

  // Nor may anything the reference layer says reach a result. It is data with
  // no imports of its own from the model, so a value cannot travel either way.
  const reference = readFileSync(new URL('../src/data/aphasiaReference.js', import.meta.url), 'utf8');
  assert.ok(!/from '.*models\//.test(reference), 'the reference layer imports no model');
  assert.ok(!/function .*\(/.test(reference.replace(/^const feature[\s\S]*?;$/m, '')), 'and exports no classifier');
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
  const surface = buildScene({ lesion: 'dominant-inferior-frontal', task: 'repetition-nonword' }, 1);
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
  const surface = buildScene({ lesion: 'dominant-inferior-frontal', task: 'repetition-nonword' }, 1);
  const broca = surface.meshesByStructure.get('Opercular part of inferior frontal gyrus|left')[0];
  assert.equal(broca.material.depthTest, true, 'a surface route is seen the ordinary way');
  deep.dispose();
  surface.dispose();
});

test('model: the run asks, carries, and answers — and the answer is the task’s own status', () => {
  const cycle = HigherBrainFunctionScene.CYCLE_SECONDS;
  const intact = buildScene({ task: 'repetition-nonword' }, 0);

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
  const cut = buildScene({ lesion: 'dominant-inferior-frontal', task: 'repetition-nonword' }, 1);
  assert.equal(cut.tracedTask().state, PATHWAY_STATE.LOW);
  assert.equal(cut.answerStrength(), 0);
  for (let i = 0; i <= 40; i += 1) {
    cut.renderAtSeconds((cycle * i) / 40);
    assert.equal(cut.answer.mesh.visible, false, 'a lost task never answers');
  }

  // And a route that is only weakened answers weakly.
  const weak = buildScene({ lesion: 'dominant-inferior-frontal', task: 'repetition-nonword' }, 0.5);
  assert.equal(weak.tracedTask().state, PATHWAY_STATE.INTERMEDIATE);
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
  const coarse = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-nonword' }, 1);
  const fine = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-nonword' }, 1);
  for (let i = 0; i < 60; i += 1) coarse.update(1 / 30);
  for (let i = 0; i < 120; i += 1) fine.update(1 / 60);
  assert.ok(Math.abs(coarse.cycleTime - fine.cycleTime) < 1e-9);
  assert.ok(coarse.pulse.position.distanceTo(fine.pulse.position) < 1e-9);

  // And driving it by absolute time gives the same answer as having played it.
  const driven = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-nonword' }, 1);
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
  const scene = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-nonword' }, 1);
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

test('model: every structure a route runs through is visible, whatever the atlas files it as', () => {
  // The first version of this keyed on the atlas category `tracts`, which
  // covered the arcuate fasciculus and missed the two commissural structures
  // the model leans on hardest: the corpus callosum and the fornix are filed as
  // `white_matter`. Cutting the callosum still stopped the marker at something
  // nobody could see, which is the defect the lift exists to fix.
  const callosal = buildScene({ lesion: 'corpus-callosum', task: 'praxis-left-hand' }, 1);
  const callosum = callosal.meshesByStructure.get('Corpus callosum|median')[0];
  assert.equal(callosum.visible, true);
  assert.equal(callosum.material.depthTest, false, 'the cut commissure is in front of the cortex');

  const memory = buildScene({ lesion: 'bilateral-medial-temporal', task: 'episodic-memory-formation' }, 1);
  const fornix = memory.meshesByStructure.get('Fornix|left')[0];
  assert.equal(fornix.material.depthTest, false, 'the fornix the route runs through is in front');

  // And the one structure that must never be lifted, however many routes are
  // anchored in it: it is the whole hemisphere's white matter, and drawing it
  // in front puts an opaque block over the brain.
  for (const scene of [callosal, memory]) {
    for (const side of ['left', 'right']) {
      const bulk = scene.meshesByStructure.get(`White matter of telencephalon|${side}`)?.[0];
      assert.equal(bulk.material.depthTest, true, `${side} bulk white matter stays where it is`);
    }
  }
  callosal.dispose();
  memory.dispose();
});

test('model: the signal goes dark where it stops, not for the whole journey', () => {
  const cycle = HigherBrainFunctionScene.CYCLE_SECONDS;
  const cut = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-nonword' }, 1);
  const carrying = new THREE.Color(PALETTE.carrying).getHex();
  const blocked = new THREE.Color(PALETTE.blocked).getHex();

  cut.renderAtSeconds(cycle * 0.4);
  assert.equal(cut.cyclePhase().id, 'travelling');
  assert.equal(cut.pulseMaterial.color.getHex(), carrying, 'the steps before the cut are carrying');

  cut.renderAtSeconds(cycle * 0.92);
  assert.equal(cut.cyclePhase().id, 'answered');
  assert.equal(cut.pulseMaterial.color.getHex(), blocked, 'and it piles up dark against the cut');

  // A route with nothing in its way never goes dark at all.
  const clear = buildScene({ task: 'repetition-nonword' }, 0);
  for (const at of [0.05, 0.4, 0.92]) {
    clear.renderAtSeconds(cycle * at);
    assert.equal(clear.pulseMaterial.color.getHex(), carrying, `still carrying at ${at}`);
  }
  cut.dispose();
  clear.dispose();
});

test('model: a second atlas rebuilds the route rather than keeping the first one’s', () => {
  // The shape cache keys on which steps the route takes, and a re-attached
  // atlas takes the same steps in different places. Kept, the tube stayed
  // where the old brain had been while the markers moved to the new one.
  const scene = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-nonword' }, 1);
  const before = scene.routeCurve.getPoint(0.5).clone();

  // One structure moved, not all of them: `placeBrainAtlas` re-centres and
  // re-scales whatever it is handed, so shifting the whole atlas is cancelled
  // out and a test doing that measures nothing at all.
  const moved = ATLAS.clone(true);
  for (const mesh of moved.children) {
    if (mesh.userData.bx_label === 'Arcuate fasciculus') mesh.position.y += 2.5;
  }
  scene.attachAtlas(moved);

  assert.ok(scene.routeCurve, 'there is a route again');
  assert.ok(
    scene.routeCurve.getPoint(0.5).distanceTo(before) > 0.5,
    'and it is drawn through the atlas that is on screen now'
  );
  scene.dispose();
});

test('scene: the route is lit as far as the word got, and neutral past it', () => {
  // Rendered frames of the sequence showed the finding it exists to make —
  // that the aphasias differ by *where* the word stopped — was not on screen:
  // the halted marker is a few pixels of the same colour as the line it sits
  // on, so a front lesion and a back lesion looked alike. The route carries it
  // now, and this is what keeps it carrying it.
  const litRings = (scene) => {
    const colours = scene.routeLine.geometry.attributes.color;
    const carrying = new THREE.Color(PALETTE.carrying);
    let lit = 0;
    for (let ring = 0; ring < scene.routeRings; ring += 1) {
      const at = ring * scene.routeRingWidth;
      if (Math.abs(colours.getX(at) - carrying.r) < 1e-3
        && Math.abs(colours.getZ(at) - carrying.b) < 1e-3) lit += 1;
    }
    return { lit, of: scene.routeRings };
  };

  const intact = buildScene({ lesion: 'dominant-arcuate', task: 'repetition-nonword' }, 0);
  intact.renderAtSeconds(2.0);
  const whole = litRings(intact);
  assert.equal(whole.lit, whole.of, 'nothing in the way: the whole line is lit');
  intact.dispose();

  // The same task, the same route, cut in two different places. What must
  // differ is how much of the line is lit — and it must differ in the
  // direction the anatomy says, with the posterior cut stopping it sooner.
  const front = buildScene({ lesion: 'dominant-inferior-frontal', task: 'repetition-nonword' });
  front.renderAtSeconds(2.0);
  const behind = buildScene({ lesion: 'dominant-posterior-superior-temporal', task: 'repetition-nonword' });
  behind.renderAtSeconds(2.0);

  const frontLit = litRings(front);
  const behindLit = litRings(behind);
  assert.ok(frontLit.lit < frontLit.of, 'a cut route is not lit to the end');
  assert.ok(behindLit.lit < frontLit.lit, 'the back cut stops the word sooner than the front one');
  // And a difference a viewer could actually see, not two rings apart.
  assert.ok(
    (frontLit.lit - behindLit.lit) / frontLit.of > 0.1,
    `the two stopping places are a tenth of the line apart at least (${behindLit.lit}/${frontLit.lit} of ${frontLit.of})`
  );
  // Past the stop the line is neutral, never the lesion colour: those steps
  // are intact and were simply never reached.
  const lesion = new THREE.Color(PALETTE.lesion);
  const colours = behind.routeLine.geometry.attributes.color;
  const last = (behind.routeRings - 1) * behind.routeRingWidth;
  assert.ok(Math.abs(colours.getX(last) - lesion.r) > 0.2, 'the unreached part is not painted as damaged');
  front.dispose();
  behind.dispose();
});

test('scene: the two modes do not leak into each other', () => {
  const scene = buildScene({ lesion: 'dominant-perisylvian' });
  assert.equal(scene.solved.mode, MODE.ATLAS_LESION);
  assert.ok(scene.solved.affectedStructures.length > 0, 'the lesion is on the atlas');
  const lesionColour = new THREE.Color(PALETTE.lesion).getHex();
  const drawnAsLesion = () => [...scene.meshesByStructure.values()]
    .flat().filter((mesh) => mesh.material.color.getHex() === lesionColour).length;
  assert.ok(drawnAsLesion() > 0, 'and drawn on it');

  // Into conceptual mode: the lesion leaves the model and leaves the screen.
  // The failure this prevents is the worst one available to a two-mode scene —
  // a knockout result shown over a brain still painted with a lesion.
  scene.setModelControl('mode', MODE.CONCEPTUAL);
  scene.setModelControl('intervention', 'orthographic-visual-form');
  assert.equal(scene.solved.mode, MODE.CONCEPTUAL);
  assert.equal(scene.solved.affectedStructures.length, 0, 'no structure is damaged');
  assert.equal(drawnAsLesion(), 0, 'and none is painted as one');
  // The read-out says which mode it is, without being asked.
  const conceptualRows = new Map(scene.getMetrics().map((row) => [row.id, row]));
  assert.match(conceptualRows.get('mode').valueJa, /遮断/);
  assert.ok(conceptualRows.get('conceptual-note'), 'and says what it is not');

  // And back: the knockout leaves the model, and the lesion comes back.
  scene.setModelControl('mode', MODE.ATLAS_LESION);
  assert.equal(scene.solved.mode, MODE.ATLAS_LESION);
  assert.deepEqual(scene.solved.interventions, []);
  assert.ok(drawnAsLesion() > 0, 'the lesion is drawn again');
  const atlasRows = new Map(scene.getMetrics().map((row) => [row.id, row]));
  assert.match(atlasRows.get('mode').valueJa, /アトラス上の病変/);
  assert.equal(atlasRows.get('conceptual-note'), undefined, 'and the conceptual note is gone');
  scene.dispose();
});

test('scene: only the control the current mode reads is offered', () => {
  const scene = buildScene();
  const ids = () => scene.getModelControls().map((control) => control.id);
  assert.ok(ids().includes('lesion'), 'atlas mode offers the lesion');
  assert.ok(!ids().includes('intervention'), 'and not the knockout');

  scene.setModelControl('mode', MODE.CONCEPTUAL);
  assert.ok(ids().includes('intervention'));
  assert.ok(!ids().includes('lesion'), 'a lesion cannot sit selected while a knockout runs');

  // Every offered knockout is a process the model declares, so a control can
  // never ask for something the solver will refuse.
  const offered = scene.getModelControls().find((control) => control.id === 'intervention');
  for (const option of offered.options) {
    assert.doesNotThrow(
      () => solveHigherBrainFunction({ mode: MODE.CONCEPTUAL, interventions: [option.value] }),
      `${option.value} is a declared process`
    );
    assert.ok(option.effectJa, `${option.value} says what it shows`);
  }
  scene.dispose();
});

test('scene: a reset returns to one defined state from either mode', () => {
  const scene = buildScene();
  const baseline = JSON.stringify(scene.getMetrics());

  scene.setModelControl('mode', MODE.CONCEPTUAL);
  scene.setModelControl('intervention', 'graphemic-buffer');
  scene.setModelControl('task', 'writing-from-meaning');
  scene.resetModelControls();
  assert.equal(scene.controls.mode, MODE.ATLAS_LESION);
  assert.equal(scene.solved.affectedStructures.length > 0, true, 'the default lesion is back');
  assert.equal(JSON.stringify(scene.getMetrics()), baseline, 'and the read-out with it');
  scene.dispose();
});

test('scene: the read-out never shows a value for a task that has none', () => {
  // Leaving a row blank, or filling it from the last task that had a value, is
  // how "not modelled" turns into "normal" on a screen.
  const scene = buildScene({ lesion: 'dominant-angular' });
  const rows = new Map(scene.getMetrics().map((row) => [row.id, row]));
  for (const task of scene.solved.tasks) {
    const row = rows.get(task.id);
    assert.ok(row.valueJa.length > 0, `${task.id} has something in its value`);
    if (task.computationStatus === COMPUTATION.NOT_MODELLED) {
      assert.match(row.valueJa, /対象外/, `${task.id} says it is out of scope`);
    }
    if (task.computationStatus === COMPUTATION.INDETERMINATE) {
      assert.match(row.valueJa, /判定不能/, `${task.id} says it cannot be determined`);
    }
  }
  scene.dispose();
});

test('scene: every lesion against every task, without a crash and without a wall of text', () => {
  // Two defects this found the first time it ran. Tracing a task with no
  // routes threw, because the route drawing iterated `task.route` and a task
  // with no value reports `route: null` — reachable through `setModelControl`
  // and through the sequence even though the task control does not offer it.
  // And the limitations row joined every limitation into one cell: 215
  // characters in a 190px rail is not a limitation a reader reads.
  const scene = buildScene();
  let longest = 0;
  let longestWhere = '';
  for (const site of LESION_SITES) {
    for (const task of FUNCTION_TASKS) {
      scene.setModelControl('lesion', site.id);
      scene.setModelControl('task', task.id);
      scene.setProgress(1);
      // The things the view does every frame, on a task that may have no route.
      assert.doesNotThrow(() => scene.getMetrics(), `${site.id}/${task.id}: read-out`);
      assert.doesNotThrow(() => scene.routePoints(), `${site.id}/${task.id}: route points`);
      assert.doesNotThrow(() => scene.blockedFraction(), `${site.id}/${task.id}: blocked fraction`);
      assert.doesNotThrow(() => scene.renderAtSeconds(2), `${site.id}/${task.id}: a frame of the run`);
      assert.doesNotThrow(() => scene.getAnnotations(), `${site.id}/${task.id}: annotations`);
      for (const row of scene.getMetrics()) {
        assert.ok(String(row.valueJa).length > 0, `${site.id}/${task.id}/${row.id} has a value`);
        if (String(row.valueJa).length > longest) {
          longest = String(row.valueJa).length;
          longestWhere = `${site.id}/${task.id}/${row.id}`;
        }
      }
    }
  }
  assert.ok(longest <= 140, `the longest read-out value is ${longest} characters (${longestWhere})`);
  scene.dispose();
});
