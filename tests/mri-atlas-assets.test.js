import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

import { ASSET_MANIFEST, assetReleaseProblems } from '../src/catalog/assetManifest.js';
import { atlasProblems, mmToVoxel, sideOfMm, voxelCount, voxelIndex } from '../src/models/mriAtlas.js';

/**
 * The committed MRI atlas files, against what the manifest and the interface
 * claim about them. Reads the real bytes: 8.5 MB of labels is half a second.
 */

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const atlas = JSON.parse(read('public/assets/mri/atlas.json').toString('utf8'));
const labels = new Uint8Array(gunzipSync(read('public/assets/mri/labels.u8.gz')));
const MRI_ASSETS = ASSET_MANIFEST.filter((asset) => asset.assetId.startsWith('mri-'));

test('mri assets: each committed file is the one the manifest hashed', () => {
  assert.deepEqual(
    MRI_ASSETS.map((asset) => asset.assetId).sort(),
    ['mri-cerebra-labels', 'mri-cerebra-surfaces', 'mri-icbm152-t1', 'mri-icbm152-t2']
  );
  for (const asset of MRI_ASSETS) {
    const bytes = read(asset.output.path);
    assert.equal(sha256(bytes), asset.output.sha256, `${asset.assetId}: ${asset.output.path} changed without its record`);
    assert.equal(bytes.length, asset.output.bytes, asset.assetId);
    assert.deepEqual(assetReleaseProblems(asset, { sceneStatus: 'alpha' }), [], `${asset.assetId} passes the asset gate for an alpha scene`);
    // And not for more than alpha: the expert reviews are pending, and say so.
    assert.notDeepEqual(assetReleaseProblems(asset, { sceneStatus: 'reviewed' }), [], `${asset.assetId} must not pass as reviewed`);
  }
});

test('mri assets: the index describes the volumes that are actually there', () => {
  assert.deepEqual(atlas.grid.dims, [193, 229, 193]);
  assert.deepEqual(atlas.grid.originMm, [-96, -132, -78]);
  assert.deepEqual(atlas.grid.spacingMm, [1, 1, 1]);
  assert.equal(atlas.grid.orientation, 'RAS+');
  assert.equal(labels.length, voxelCount(atlas.grid));
  for (const key of ['t1', 't2', 'labels']) {
    const volume = atlas.volumes[key];
    const bytes = gunzipSync(read(`public/assets/mri/${volume.file}`));
    assert.equal(bytes.length, volume.bytes, `${key}: decompressed length`);
    assert.equal(sha256(bytes), volume.sha256, `${key}: decompressed content`);
  }
});

test('mri assets: all 102 labels are present, paired, and on the side their name says', () => {
  assert.equal(atlas.structures.length, 102);
  const counts = new Map();
  for (const value of labels) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  assert.equal(counts.size, 102);
  for (const structure of atlas.structures) {
    assert.equal(counts.get(structure.label), structure.voxels, `label ${structure.label}: voxel count`);
    // CerebrA: right = 1–51, left = right + 51, same name.
    assert.equal(structure.hemi, structure.label <= 51 ? 'R' : 'L');
    const twin = atlas.structures.find((other) => other.label === (structure.label <= 51 ? structure.label + 51 : structure.label - 51));
    assert.equal(twin.name, structure.name);
    assert.equal(sideOfMm(structure.centroidMm), structure.hemi === 'R' ? 'right' : 'left', `${structure.name} ${structure.hemi}`);
  }
  // Measured from the voxels here, not trusted from the index: where is the
  // hippocampus the index calls "left"?
  const left = atlas.structures.find((structure) => structure.name === 'Hippocampus' && structure.hemi === 'L');
  let sumX = 0;
  let count = 0;
  const [nx, ny] = atlas.grid.dims;
  for (let index = 0; index < labels.length; index += 1) {
    if (labels[index] !== left.label) continue;
    sumX += (index % nx) + atlas.grid.originMm[0];
    count += 1;
  }
  assert.ok(ny > 0 && sumX / count < -10, `the left hippocampus's voxels average x = ${(sumX / count).toFixed(1)} mm`);
});

test('mri assets: every interior point is inside its own structure, and the atlas passes its own check', () => {
  for (const structure of atlas.structures) {
    assert.equal(
      labels[voxelIndex(atlas.grid, mmToVoxel(atlas.grid, structure.interiorPointMm))],
      structure.label,
      `${structure.name} ${structure.hemi}`
    );
  }
  assert.deepEqual(atlasProblems(atlas, labels), []);
  // The reason interior points exist: the centroid is not a safe place to send a crosshair.
  const outside = atlas.structures.filter(
    (structure) => labels[voxelIndex(atlas.grid, mmToVoxel(atlas.grid, structure.centroidMm))] !== structure.label
  );
  assert.ok(outside.length > 20, `${outside.length} structures have a centroid outside themselves`);
});

test('mri assets: the surfaces file has one named mesh per label, in millimetres', () => {
  const glb = read('public/assets/mri/cerebra.glb');
  assert.equal(glb.readUInt32LE(0), 0x46546c67, 'glTF magic');
  const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8'));
  const nodes = json.nodes.filter((node) => node.extras?.cerebraLabel != null);
  assert.equal(nodes.length, 102);
  for (const node of nodes) {
    const structure = atlas.structures.find((entry) => entry.label === node.extras.cerebraLabel);
    assert.ok(structure, `mesh for a label the volume does not have: ${node.name}`);
    assert.equal(node.name, `cerebra-${structure.label}`);
    assert.equal(node.extras.hemi, structure.hemi);
    assert.equal(node.extras.name, structure.name);
    // Its bounding box, from the accessor, is where the label is — in mm, on the right side.
    const accessor = json.accessors[json.meshes[node.mesh].primitives[0].attributes.POSITION];
    const centreX = (accessor.min[0] + accessor.max[0]) / 2;
    if (Math.abs(structure.centroidMm[0]) > 8) {
      assert.equal(Math.sign(centreX), Math.sign(structure.centroidMm[0]), `${node.name} is on the wrong side`);
    }
    for (let axis = 0; axis < 3; axis += 1) {
      assert.ok(accessor.min[axis] >= structure.bboxMm.min[axis] - 3 && accessor.max[axis] <= structure.bboxMm.max[axis] + 3, `${node.name} escapes its label on axis ${axis}`);
    }
  }
  assert.ok(nodes.every((node) => !node.rotation && !node.scale && !node.matrix), 'no transform hides between the file and MNI space');
});

test('mri assets: the notice keeps the MNI copyright text and names every source', () => {
  // The notice quotes the licence as a Markdown block; read it without the quote marks.
  const notice = read('public/assets/mri/ATTRIBUTION.md').toString('utf8').replace(/^> ?/gm, '');
  assert.match(notice, /Copyright \(C\) 1993.2004 Louis Collins, McConnell Brain\s+Imaging Centre, Montreal Neurological Institute, McGill University/);
  assert.match(notice, /provided that the above copyright notice appear in all copies/);
  for (const needle of ['10.1016/j.neuroimage.2010.07.033', '10.1038/s41597-020-0557-9', '10.12751/g-node.be5e62', 'TemplateFlow']) {
    assert.ok(notice.includes(needle), `the notice does not mention ${needle}`);
  }
  assert.match(notice, /not for diagnosis|not .* diagnos/i);
});
