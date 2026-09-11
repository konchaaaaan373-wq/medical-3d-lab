import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BILE_PATH,
  DEFAULT_CONTROLS,
  OBSTRUCTION_SITES,
  solveBiliaryObstruction,
} from '../src/models/biliaryObstruction.js';
import { BiliaryObstructionScene } from '../src/scenes/hepatobiliary/scenes/biliaryObstruction/BiliaryObstructionScene.js';
import { buildBiliaryTree } from '../src/scenes/hepatobiliary/organs/biliaryTree.js';

/**
 * Model integrity, and the one pairing this scene most needs: the names the
 * model uses are the names the geometry uses.
 *
 * The biliary atlas decided which mesh is the cystic duct. This scene's whole
 * claim is about *where* a blockage is, so a model segment that does not
 * correspond to a drawn structure would be a claim about a place that is not on
 * screen — and nothing would say so.
 */

test('biliary model: every segment the model names is a structure the atlas draws', () => {
  const tree = buildBiliaryTree();
  const drawn = new Set(tree.index.keys());
  const solved = solveBiliaryObstruction();
  for (const id of Object.keys(solved.pressure)) {
    assert.ok(drawn.has(id), `the model solves a pressure for "${id}", which nothing draws`);
  }
  for (const { id, blocks } of OBSTRUCTION_SITES) {
    if (!blocks) continue;
    const meshes = BiliaryObstructionScene.SITE_MESHES[id];
    assert.ok(meshes?.length, `${id} marks nothing`);
    for (const mesh of meshes) assert.ok(drawn.has(mesh), `${id} marks "${mesh}", which nothing draws`);
  }
  for (const meshes of Object.values(BiliaryObstructionScene.SEGMENT_MESHES)) {
    for (const mesh of meshes) assert.ok(drawn.has(mesh), `"${mesh}" is not drawn`);
  }
  tree.dispose();
});

test('biliary model: the bile path is the order the atlas builds', () => {
  // The order is the claim. If the cystic duct ever appears on the bile path,
  // or the pancreatic duct upstream of the sphincter, everything this scene
  // says about which site does what stops being true.
  assert.ok(!BILE_PATH.includes('cystic-duct'), 'the gallbladder is a dead end, not a stage of the path');
  assert.ok(!BILE_PATH.includes('pancreatic-duct'), 'the pancreatic duct is a second path');
  assert.equal(BILE_PATH.at(-1), 'sphincter', 'the sphincter is last, which is why it is the shared one');
});

test('biliary model: which segments are behind the blockage is read from the pressures', () => {
  // Not from a table of sites. A model whose answer to "what does a stone here
  // affect" is a lookup cannot be wrong in an interesting way, and cannot be
  // right for a reason.
  const behindFor = (site) =>
    Object.entries(solveBiliaryObstruction({ site, completeness: 1 }).behind)
      .filter(([, value]) => value)
      .map(([id]) => id)
      .sort();

  assert.deepEqual(behindFor('none'), []);
  assert.deepEqual(behindFor('cystic-duct'), []);
  assert.deepEqual(behindFor('common-bile-duct'), [
    'common-bile-duct',
    'common-hepatic-duct',
    'gallbladder',
    'left-hepatic-duct',
    'right-hepatic-duct',
  ]);
  assert.deepEqual(behindFor('ampulla'), [
    'common-bile-duct',
    'common-hepatic-duct',
    'gallbladder',
    'left-hepatic-duct',
    'pancreatic-duct',
    'right-hepatic-duct',
  ]);
});

test('biliary model: rubbish in does not produce rubbish out', () => {
  for (const completeness of [NaN, -3, 12, Infinity, undefined, null]) {
    const state = solveBiliaryObstruction({ site: 'common-bile-duct', completeness });
    for (const value of Object.values(state.pressure)) assert.ok(Number.isFinite(value), String(completeness));
    assert.ok(Number.isFinite(state.bileToDuodenumMlPerMin), String(completeness));
    assert.ok(state.bileToDuodenumMlPerMin >= 0, String(completeness));
  }
  const unknown = solveBiliaryObstruction({ site: 'somewhere-else', completeness: 1 });
  assert.equal(
    unknown.bileDeliveredFraction.toFixed(6),
    solveBiliaryObstruction({ site: 'none' }).bileDeliveredFraction.toFixed(6),
    'a site the model does not have blocks nothing rather than blocking everything'
  );
});

test('biliary model: it is deterministic, and the defaults are an open tree', () => {
  const a = solveBiliaryObstruction();
  const b = solveBiliaryObstruction({ ...DEFAULT_CONTROLS });
  assert.deepEqual(a.pressure, b.pressure);
  assert.equal(a.bileDeliveredFraction.toFixed(6), '1.000000');
  assert.equal(a.pancreaticDeliveredFraction.toFixed(6), '1.000000');
  assert.equal(a.gallbladderConnected, true);
});

test('biliary scene: the read-out and the 3D come from the same solve', () => {
  const scene = new BiliaryObstructionScene({});
  scene.build();
  scene.setModelControl('site', 'common-bile-duct');
  scene.setProgress(1);
  const rows = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row.value]));
  const solved = scene.solved;
  assert.equal(Number(rows.cbd), Number(solved.pressure['common-bile-duct'].toFixed(1)));
  assert.equal(Number(rows.bile), Math.round(solved.bileDeliveredFraction * 100));

  // And the meshes the model put behind the blockage are the ones drawn wider.
  const wider = [...BiliaryObstructionScene.SEGMENT_MESHES['common-bile-duct']];
  const restScale = scene.restScale.get(wider[0]).x;
  assert.ok(scene.tree.mesh(wider[0]).scale.x > restScale * 1.2, 'the common bile duct is drawn wider');
  const untouched = BiliaryObstructionScene.SEGMENT_MESHES['pancreatic-duct'][0];
  assert.equal(
    scene.tree.mesh(untouched).scale.x.toFixed(4),
    scene.restScale.get(untouched).x.toFixed(4),
    'the pancreatic duct is not'
  );
  scene.dispose();
});
