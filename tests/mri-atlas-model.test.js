import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CONVENTIONS,
  PLANES,
  atlasProblems,
  clampWindow,
  extractSlice,
  mmToVoxel,
  mniToScene,
  sceneToMni,
  sideOfMm,
  slicePlane,
  sliceViewport,
  voxelIndex,
  voxelToMm,
  windowLut,
} from '../src/models/mriAtlas.js';

/**
 * The MRI atlas's orientation, as arithmetic.
 *
 * Every left/right a reader is shown comes out of the functions below, and the
 * template is symmetric — so a mirrored atlas would look exactly right. These
 * tests are the place that can tell.
 */

const GRID = Object.freeze({ dims: [193, 229, 193], originMm: [-96, -132, -78], spacingMm: [1, 1, 1], orientation: 'RAS+' });
/** A point clearly on the subject's right, front and top. */
const RIGHT_FRONT_TOP_MM = [40, 60, 50];

test('mri atlas: voxel ↔ millimetre is the template\'s translation, both ways', () => {
  assert.deepEqual(voxelToMm(GRID, [0, 0, 0]), [-96, -132, -78]);
  assert.deepEqual(voxelToMm(GRID, [96, 132, 78]), [0, 0, 0]);
  assert.deepEqual(mmToVoxel(GRID, [0, 0, 0]), [96, 132, 78]);
  for (const mm of [[-31, -19, -17], [12, 16, 6], RIGHT_FRONT_TOP_MM]) {
    assert.deepEqual(voxelToMm(GRID, mmToVoxel(GRID, mm)), mm);
  }
  // Outside the volume clamps to its edge rather than indexing beyond it.
  assert.deepEqual(mmToVoxel(GRID, [999, -999, 0]), [192, 0, 78]);
});

test('mri atlas: +x is the subject\'s right — the one definition of a side', () => {
  assert.equal(sideOfMm([25.89, -22.5, -14.48]), 'right');
  assert.equal(sideOfMm([-25.89, -22.5, -14.48]), 'left');
  assert.equal(sideOfMm([0, 0, 0]), 'midline');
});

test('mri atlas: MNI → scene is a rotation, never a mirror', () => {
  const x = mniToScene([1, 0, 0]);
  const y = mniToScene([0, 1, 0]);
  const z = mniToScene([0, 0, 1]);
  // Determinant of the matrix whose columns are the images of the axes.
  const det =
    x[0] * (y[1] * z[2] - y[2] * z[1]) -
    y[0] * (x[1] * z[2] - x[2] * z[1]) +
    z[0] * (x[1] * y[2] - x[2] * y[1]);
  assert.equal(det, 1, 'a determinant of −1 is a reflection: left and right swapped in 3D');
  assert.deepEqual(x, [1, 0, 0], 'the subject\'s right stays scene +x');
  assert.deepEqual(z, [0, 1, 0], 'superior is scene up');
  assert.deepEqual(y, [0, 0, -1], 'anterior is away from scene +z');
  assert.deepEqual(sceneToMni(mniToScene(RIGHT_FRONT_TOP_MM)), RIGHT_FRONT_TOP_MM);
});

test('mri atlas: radiological puts the patient\'s right on the screen\'s left; neurological does not', () => {
  const voxel = mmToVoxel(GRID, RIGHT_FRONT_TOP_MM);
  for (const plane of ['axial', 'coronal']) {
    const radiological = slicePlane(plane, GRID, 'radiological');
    const neurological = slicePlane(plane, GRID, 'neurological');
    assert.ok(radiological.fromVoxel(voxel).u < radiological.width / 2, `${plane}: a right-side voxel is drawn left of centre`);
    assert.ok(neurological.fromVoxel(voxel).u > neurological.width / 2, `${plane}: a right-side voxel is drawn right of centre`);
    // And the letter at that edge says so, read off the same mapping.
    assert.equal(radiological.edges.left, 'R');
    assert.equal(radiological.edges.right, 'L');
    assert.equal(neurological.edges.left, 'L');
    assert.equal(neurological.edges.right, 'R');
  }
});

test('mri atlas: anterior is up on axial, superior is up on coronal and sagittal, the face looks left on sagittal', () => {
  const voxel = mmToVoxel(GRID, RIGHT_FRONT_TOP_MM);
  for (const convention of CONVENTIONS) {
    const axial = slicePlane('axial', GRID, convention);
    assert.ok(axial.fromVoxel(voxel).v < axial.height / 2);
    assert.deepEqual([axial.edges.top, axial.edges.bottom], ['A', 'P']);
    const coronal = slicePlane('coronal', GRID, convention);
    assert.ok(coronal.fromVoxel(voxel).v < coronal.height / 2);
    assert.deepEqual([coronal.edges.top, coronal.edges.bottom], ['S', 'I']);
    const sagittal = slicePlane('sagittal', GRID, convention);
    assert.ok(sagittal.fromVoxel(voxel).u < sagittal.width / 2, 'anterior is drawn on the left');
    assert.deepEqual([sagittal.edges.left, sagittal.edges.right, sagittal.edges.top, sagittal.edges.bottom], ['A', 'P', 'S', 'I']);
  }
});

test('mri atlas: every edge letter agrees with where a voxel on that side is actually drawn', () => {
  // Not a second table: for each plane and convention, walk a voxel toward
  // each anatomical direction and require it to move toward the edge so named.
  const centre = [96, 114, 96];
  const toward = { R: [0, 1], L: [0, -1], A: [1, 1], P: [1, -1], S: [2, 1], I: [2, -1] };
  for (const plane of PLANES) {
    for (const convention of CONVENTIONS) {
      const layout = slicePlane(plane, GRID, convention);
      const home = layout.fromVoxel(centre);
      for (const [edge, letter] of Object.entries(layout.edges)) {
        const [axis, sign] = toward[letter];
        const moved = [...centre];
        moved[axis] += sign * 20;
        const at = layout.fromVoxel(moved);
        const delta = { left: home.u - at.u, right: at.u - home.u, top: home.v - at.v, bottom: at.v - home.v }[edge];
        assert.equal(delta, 20, `${plane}/${convention}: moving toward ${letter} should move toward the ${edge} edge`);
      }
    }
  }
});

test('mri atlas: a pixel and the voxel it shows are inverse maps, on every plane', () => {
  for (const plane of PLANES) {
    for (const convention of CONVENTIONS) {
      const layout = slicePlane(plane, GRID, convention);
      for (const voxel of [[0, 0, 0], [192, 228, 192], [65, 113, 61], [108, 148, 84]]) {
        const { u, v, slice } = layout.fromVoxel(voxel);
        assert.deepEqual(layout.toVoxel(u, v, slice), voxel);
      }
    }
  }
});

test('mri atlas: a slice is the volume\'s own voxels in screen order', () => {
  const grid = { dims: [4, 3, 2], originMm: [0, 0, 0], spacingMm: [1, 1, 1] };
  const volume = Uint8Array.from({ length: 24 }, (_, index) => index);
  for (const plane of PLANES) {
    for (const convention of CONVENTIONS) {
      const layout = slicePlane(plane, grid, convention);
      for (let slice = 0; slice < layout.slices; slice += 1) {
        const pixels = extractSlice(volume, layout, grid, slice);
        for (let v = 0; v < layout.height; v += 1) {
          for (let u = 0; u < layout.width; u += 1) {
            assert.equal(pixels[u + v * layout.width], volume[voxelIndex(grid, layout.toVoxel(u, v, slice))]);
          }
        }
      }
    }
  }
});

test('mri atlas: the viewport the picture is drawn with is the one the pointer is read with', () => {
  const layout = slicePlane('axial', GRID, 'radiological');
  for (const zoom of [1, 2, 4]) {
    const focus = { u: 60, v: 90 };
    const viewport = sliceViewport(layout, 300, 420, { zoom, focus });
    for (const pixel of [focus, { u: 61, v: 95 }]) {
      const box = viewport.toBox(pixel.u, pixel.v);
      if (box.x < 0 || box.y < 0 || box.x > 300 || box.y > 420) continue;
      assert.deepEqual(viewport.toPixel(box.x, box.y), pixel);
    }
  }
  // Outside the image is nothing, not the nearest voxel.
  assert.equal(sliceViewport(layout, 300, 420).toPixel(150, 2), null);
  // Zooming keeps the focus where it was.
  const rest = sliceViewport(layout, 300, 420).toBox(96, 114);
  const zoomed = sliceViewport(layout, 300, 420, { zoom: 3, focus: { u: 96, v: 114 } }).toBox(96, 114);
  assert.ok(Math.abs(rest.x - zoomed.x) < 1e-6 && Math.abs(rest.y - zoomed.y) < 1e-6);
});

test('mri atlas: the display window maps to black and white where it says, and clamps', () => {
  const lut = windowLut(100, 100);
  assert.equal(lut[50], 0);
  assert.equal(lut[150], 255);
  assert.equal(lut[100], 128);
  assert.ok(lut.every((value, index) => index === 0 || value >= lut[index - 1]), 'monotonic');
  assert.deepEqual(clampWindow({ level: 999, width: 0 }), { level: 255, width: 8 });
});

test('mri atlas: a mirrored atlas, or an interior point outside its label, is reported', () => {
  const grid = { dims: [5, 1, 1], originMm: [-2, 0, 0], spacingMm: [1, 1, 1], orientation: 'RAS+' };
  const labels = Uint8Array.from([2, 2, 0, 1, 1]);
  const good = {
    grid,
    structures: [
      { label: 1, name: 'A', hemi: 'R', centroidMm: [1.5, 0, 0], interiorPointMm: [2, 0, 0] },
      { label: 2, name: 'A', hemi: 'L', centroidMm: [-1.5, 0, 0], interiorPointMm: [-2, 0, 0] },
    ],
  };
  assert.deepEqual(atlasProblems(good, labels), []);
  const mirrored = { grid, structures: good.structures.map((structure) => ({ ...structure, hemi: structure.hemi === 'R' ? 'L' : 'R' })) };
  assert.equal(atlasProblems(mirrored, labels).length, 2, 'each structure on the wrong side is named');
  const outside = { grid, structures: [{ ...good.structures[0], interiorPointMm: [0, 0, 0] }] };
  assert.match(atlasProblems(outside, labels).join('\n'), /interior point lands on label 0/);
  assert.match(atlasProblems({ grid: { ...grid, orientation: 'LAS+' }, structures: [] }).join('\n'), /assumes RAS\+/);
});
