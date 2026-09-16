import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import BrainAnatomyScene from '../src/scenes/nervous/scenes/brainAnatomy/index.js';
import { BRAIN_COLOR_MODES, brainColor, brainColorKey, brainStructureInfo } from '../src/data/brainAnatomy.js';

test('brain anatomy adopts individually named atlas meshes instead of proxy lobes', () => {
  const scene = buildScene();
  assert.equal(scene.selectables.length, FIXTURE_STRUCTURES.length);
  assert.ok(scene.selectables.every((mesh) => Number.isInteger(mesh.userData.atlasId)));
  assert.ok(scene.selectables.some((mesh) => mesh.userData.bx_label === 'Central sulcus'));
  assert.ok(scene.selectables.some((mesh) => mesh.userData.bx_label === 'Middle temporal gyrus'));
  assert.notEqual(
    colorOf(scene, 'Middle temporal gyrus', 'left'),
    colorOf(scene, 'Middle frontal gyrus', 'left'),
    'lobe colour is derived from atlas region metadata'
  );
  scene.dispose();
});

test('the distributed GLB keeps per-mesh anatomy metadata and its licence notice', () => {
  const bytes = readFileSync(new URL('../public/assets/brain/brain.glb', import.meta.url));
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    '76a49ea4526a4880613aec7a02756bd7301b0b9d0680d7cae33e197b672c5453',
    'the attributed upstream geometry is redistributed unchanged'
  );
  assert.equal(bytes.subarray(0, 4).toString(), 'glTF');
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const named = gltf.nodes.filter((node) => node.extras?.bx_id != null);
  assert.equal(named.length, 437);
  const selectableCategories = new Set([
    'cortex', 'deep_grey', 'diencephalon', 'white_matter',
    'ventricles', 'cerebellum', 'brainstem',
  ]);
  assert.equal(named.filter((node) => selectableCategories.has(node.extras.bx_cat)).length, 271);
  assert.ok(gltf.extensionsRequired.includes('KHR_draco_mesh_compression'));
  for (const label of ['Central sulcus', 'Middle temporal gyrus', 'Hippocampus', 'Putamen']) {
    assert.ok(named.some((node) => node.extras.bx_label === label), `${label} is in the asset`);
  }
  const notice = readFileSync(new URL('../public/assets/brain/ATTRIBUTION.md', import.meta.url), 'utf8');
  assert.match(notice, /Z-Anatomy/);
  assert.match(notice, /BodyParts3D \/ DBCLS/);
  assert.match(notice, /CC BY-SA 4\.0/);
});

test('selection publishes exact bilingual anatomy and highlights without resizing it', () => {
  const scene = buildScene();
  let published;
  scene.onAnatomySelection((value) => { published = value; });
  assert.equal(scene.selectRegion('left-temporal'), true, 'legacy lobe links resolve to a real gyrus');
  assert.equal(published.name, 'Middle temporal gyrus');
  assert.equal(published.nameJa, '中側頭回');
  assert.equal(published.regionJa, '側頭葉');
  assert.equal(published.sideJa, '左');
  assert.match(published.descriptionJa, /言語|意味/);
  assert.equal(scene.selectables.filter((mesh) => mesh.userData.selected).length, 1);
  const selected = scene.selectables.find((mesh) => mesh.userData.selected);
  assert.deepEqual(selected.scale.toArray(), [1, 1, 1], 'selection does not distort anatomy');
  scene.clearSelection();
  assert.equal(scene.getAnatomySelection(), null);
  scene.dispose();
});

test('hover previews exact anatomy without replacing the pinned selection', () => {
  const scene = buildScene();
  const temporal = find(scene, 'Middle temporal gyrus', 'left');
  const putamen = find(scene, 'Putamen', 'left');
  const previews = [];
  scene.onAnatomyHover((value) => previews.push(value));

  scene.selectStructure(putamen.userData.atlasId);
  scene._setHovered(temporal);
  assert.equal(previews.at(-1).nameJa, '中側頭回');
  assert.deepEqual(previews.at(-1).hierarchyJa, ['左大脳半球', '側頭葉', '大脳回']);
  assert.equal(scene.getAnatomySelection().nameJa, '被殻', 'hover does not replace the pinned structure');
  scene._setHovered(null);
  assert.equal(previews.at(-1), null, 'the panel can restore the pinned selection on pointer leave');
  scene.dispose();
});

test('colour map and natural anatomy are one-step choices with different visual readings', () => {
  const scene = buildScene();
  const leftTemporal = colorOf(scene, 'Middle temporal gyrus', 'left');
  const rightTemporal = colorOf(scene, 'Middle temporal gyrus', 'right');
  assert.equal(leftTemporal, rightTemporal, 'left and right homologues share a colour');
  assert.notEqual(
    colorOf(scene, 'Middle frontal gyrus', 'left'),
    colorOf(scene, 'Opercular part of inferior frontal gyrus', 'left'),
    'named structures within one lobe use distinct shades in fine mode'
  );

  assert.deepEqual(
    BRAIN_COLOR_MODES.map(({ id, labelJa }) => [id, labelJa]),
    [['detail', 'カラー'], ['anatomical', '通常解剖色']]
  );
  assert.equal(scene.getAnatomyColorMode(), 'detail');
  const frontal = find(scene, 'Middle frontal gyrus', 'left');
  const colourRoughness = frontal.material.roughness;
  const colourIdleEmissive = frontal.material.emissiveIntensity;

  assert.equal(scene.setAnatomyColorMode('anatomical'), true);
  assert.equal(scene.getAnatomyColorMode(), 'anatomical');
  assert.equal(
    colorOf(scene, 'Middle temporal gyrus', 'left'),
    colorOf(scene, 'Middle temporal gyrus', 'right'),
    'natural anatomy also keeps homologues visually paired'
  );
  assert.notEqual(
    colorOf(scene, 'Middle frontal gyrus', 'left'),
    colorOf(scene, 'Opercular part of inferior frontal gyrus', 'left'),
    'small natural-tone variation keeps neighbouring named meshes legible'
  );
  assert.ok(hslOf(frontal).s < 0.3, 'cortical natural anatomy stays low-saturation');
  assert.ok(frontal.material.roughness > colourRoughness, 'matte tissue shading preserves fold relief');
  assert.ok(frontal.material.emissiveIntensity < colourIdleEmissive, 'low idle emission preserves sulcal shadows');
  assert.notEqual(
    colorOf(scene, 'Middle frontal gyrus', 'left'),
    colorOf(scene, 'Corpus callosum', 'median'),
    'grey matter and white matter retain conventional tissue contrast'
  );
  assert.equal(scene.setAnatomyColorMode('not-a-mode'), false);
  scene.dispose();
});

test('medial views expose the selected hemisphere without moving anatomy', () => {
  const scene = buildScene();
  const left = find(scene, 'Middle temporal gyrus', 'left');
  const right = find(scene, 'Middle temporal gyrus', 'right');
  const positions = new Map(scene.selectables.map((mesh) => [mesh, mesh.position.clone()]));
  assert.deepEqual(
    scene.getAnatomyViews().map((view) => view.id),
    ['left-lateral', 'left-medial', 'right-lateral', 'right-medial',
      'anterior', 'posterior', 'superior', 'inferior']
  );

  scene.setAnatomyView('left-medial');
  assert.equal(left.material.opacity, 1);
  assert.equal(right.material.opacity, 0, 'the contralateral shell is hidden at the midline');
  scene.setAnatomyView('right-medial');
  assert.equal(left.material.opacity, 0);
  assert.equal(right.material.opacity, 1);
  scene.setAnatomyView('left-lateral');
  assert.equal(left.material.opacity, 1);
  assert.equal(right.material.opacity, 1, 'leaving a medial view restores the contralateral hemisphere');
  for (const [mesh, position] of positions) assert.ok(mesh.position.equals(position));
  scene.dispose();
});

test('only the medial and inferior views carry a display notice, and it is bilingual', () => {
  const scene = buildScene();
  const byId = new Map(scene.getAnatomyViews().map((view) => [view.id, view]));

  for (const id of ['left-lateral', 'right-lateral', 'anterior', 'posterior', 'superior']) {
    assert.equal(byId.get(id).notice, undefined, `${id} carries no notice`);
    assert.equal(byId.get(id).noticeJa, undefined, `${id} carries no notice`);
  }

  // Both medial views: a 3D display with the contralateral hemisphere hidden
  // is not a midsagittal section (D-2 of the 2026-09-16 AI re-review).
  for (const id of ['left-medial', 'right-medial']) {
    assert.match(byId.get(id).notice, /[Nn]ot a midsagittal section/);
    assert.match(byId.get(id).noticeJa, /正中矢状断ではありません/);
  }

  // Right medial and inferior additionally flag the missing right medulla
  // mesh (F-122) as a data gap, not a normal left/right asymmetry.
  for (const id of ['right-medial', 'inferior']) {
    assert.match(byId.get(id).notice, /no right medulla oblongata mesh/);
    assert.match(byId.get(id).noticeJa, /右側延髄の形状を収録していません/);
  }
  assert.doesNotMatch(byId.get('left-medial').notice, /medulla/);

  scene.dispose();
});

test('a medial view closes the midline instead of showing through a hollow shell', () => {
  const scene = buildScene();
  const callosum = find(scene, 'Corpus callosum', 'median');
  const enclosingWhiteMatter = find(scene, 'White matter of telencephalon', 'left');
  const thalamus = find(scene, 'Mediodorsal nucleus', 'left');
  const keptCortex = find(scene, 'Middle frontal gyrus', 'left');
  const ventricle = find(scene, 'Lateral ventricle', 'left');

  // At rest on a lateral view the midline block is depth the reader has not
  // asked for, and stays hidden. That part is unchanged.
  settle(scene);
  assert.equal(callosum.material.opacity, 0, 'a lateral view still starts at the cortical surface');
  assert.equal(thalamus.material.opacity, 0);
  assert.equal(enclosingWhiteMatter.material.opacity, 0);

  // On a medial view it is not depth: it *is* the surface being looked at. The
  // corpus callosum, the thalamus and the white matter behind them are what a
  // reader sees at the midline, and without them the medial view was a hollow
  // cortical shell — a hole where the callosum belongs, and the background
  // visible through the far wall because the material is front-side only.
  scene.setAnatomyView('left-medial');
  settle(scene);
  assert.equal(keptCortex.material.opacity, 1, 'the kept hemisphere\'s cortical shell is unchanged');
  assert.ok(callosum.material.opacity > 0.94, 'the corpus callosum closes the midline');
  assert.ok(thalamus.material.opacity > 0.94, 'the thalamus closes the midline');
  assert.ok(enclosingWhiteMatter.material.opacity > 0.94, 'the hemisphere is solid behind it');
  assert.ok(callosum.material.depthWrite, 'and writes depth, so nothing shows through it');
  assert.equal(ventricle.material.opacity, 0, 'a cavity is not a surface and stays on the slider');

  // Depth still means depth. Dragging the layer up on a medial view has to
  // ghost the enclosing mass again, or it simply replaces the cortical shell
  // with a white one and hides the basal ganglia — the failure the ghost was
  // introduced for.
  scene.setProgress(1);
  settle(scene);
  assert.ok(enclosingWhiteMatter.material.opacity < 0.1, 'the enclosing mass ghosts as depth is asked for');
  assert.ok(thalamus.material.opacity > 0.94, 'and the deep structures stay');

  // Leaving the medial view puts the midline back where it was.
  scene.setProgress(0);
  scene.setAnatomyView('left-lateral');
  settle(scene);
  for (const mesh of [callosum, thalamus, enclosingWhiteMatter]) {
    assert.equal(mesh.visible, false, `${mesh.userData.bx_label} is back under the surface`);
  }
  scene.dispose();
});

test('an annotation hides when its own structure is behind something opaque', () => {
  const scene = buildScene();
  settle(scene);
  const temporal = annotationFor(scene, 'temporal');
  const putamen = annotationFor(scene, 'putamen');
  const left = find(scene, 'Middle temporal gyrus', 'left');
  const right = find(scene, 'Middle temporal gyrus', 'right');

  assert.equal(temporal.structureId, left.userData.atlasId,
    'the label points at the structure id it names, not at a coordinate');

  // This fixture is a handful of boxes rather than two hemispheres, so the two
  // vantages are placed on the line the homologues actually lie on: from one
  // the left gyrus is in front, from the other the right one is between.
  const near = vantage(scene, left, right);
  const far = vantage(scene, right, left);

  assert.equal(temporal.isVisible(near), true, 'seen from its own side');
  // Drawn from the other side anyway, a label for a left structure sat on the
  // right hemisphere's surface — a left/right error with a name attached.
  assert.equal(temporal.isVisible(far), false, 'and not through its homologue');

  // Hidden *because something is in front of it*, not because the check gives
  // up and hides everything: take the occluder away and the same anchor, from
  // the same place, is visible again.
  scene.isolateStructure(temporal.structureId);
  settle(scene);
  assert.equal(temporal.isVisible(far), true, 'nothing in front of it now');
  scene.clearIsolation();
  settle(scene);
  assert.equal(temporal.isVisible(far), false);

  // The rule follows the anatomical layer for the same reason, and again with
  // no reference to a side. The insula is under the operculum at layer 0 and
  // the layer fades the operculum away; the putamen is not drawn at all until
  // the deep view, and a label with nothing to point at is not drawn either.
  const insula = annotationFor(scene, 'insula');
  const behindOperculum = vantage(
    scene,
    find(scene, 'Opercular part of inferior frontal gyrus', 'left'),
    find(scene, 'Insula (Subcentral gyrus and ant. and post. sulci)', 'left')
  );
  assert.equal(insula.isVisible(behindOperculum), false, 'the operculum covers the insula');
  assert.equal(putamen.isVisible(near), false, 'and the putamen is not drawn at layer 0 at all');
  scene.setProgress(1);
  settle(scene);
  assert.equal(insula.isVisible(behindOperculum), true, 'the layer takes the operculum away');

  scene.dispose();
});

test('an annotation is anchored on the outside of the structure, not in the middle of it', () => {
  const scene = buildScene();
  settle(scene);
  const sulcus = find(scene, 'Central sulcus', 'left');
  const point = scene.annotationAnchors.centralSulcus;
  const box = new THREE.Box3().setFromObject(sulcus);
  const modelCentre = new THREE.Box3().setFromObject(scene.atlasRoot).getCenter(new THREE.Vector3());

  // On the structure — an anchor off it would be a label naming a neighbour.
  assert.ok(box.distanceToPoint(point) < 1e-6, 'the anchor is a point of this structure');
  // And on its *outside*. The bounding-box centre of a sulcus is at the bottom
  // of the sulcus, inside the gyri either side of it, where nothing can see it.
  assert.ok(
    point.distanceTo(modelCentre) > box.getCenter(new THREE.Vector3()).distanceTo(modelCentre),
    'and further out than the middle of it'
  );

  // Which is the point: from outside, that anchor can be seen.
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100);
  camera.position.copy(point).addScaledVector(point.clone().sub(modelCentre).normalize(), 5);
  camera.lookAt(point);
  camera.updateMatrixWorld(true);
  assert.equal(annotationFor(scene, 'centralSulcus').isVisible(camera), true);
  scene.dispose();
});

test('hiding a label does not touch the selection it names', () => {
  const scene = buildScene();
  settle(scene);
  const temporal = annotationFor(scene, 'temporal');
  const left = find(scene, 'Middle temporal gyrus', 'left');
  const right = find(scene, 'Middle temporal gyrus', 'right');
  assert.equal(scene.selectStructure(temporal.structureId), true);
  const pinned = scene.getAnatomySelection();
  assert.equal(pinned.name, 'Middle temporal gyrus');

  // Turning to somewhere the structure cannot be seen from hides its label. A
  // label is not a selection: the id, the summary and the highlight stay.
  assert.equal(temporal.isVisible(vantage(scene, right, left)), false);
  assert.deepEqual(scene.getAnatomySelection(), pinned);
  assert.equal(scene.selectables.filter((mesh) => mesh.userData.selected).length, 1);
  scene.dispose();
});

test('the layer sequence hides rather than separates anatomy and exposes the insula', () => {
  const scene = buildScene();
  const originalPositions = new Map(scene.selectables.map((mesh) => [mesh, mesh.position.clone()]));
  const rightCortex = find(scene, 'Middle temporal gyrus', 'right');
  const leftCortex = find(scene, 'Middle temporal gyrus', 'left');
  const leftOperculum = find(scene, 'Opercular part of inferior frontal gyrus', 'left');
  const parietalOperculum = find(scene, 'Supramarginal gyrus', 'left');
  const leftInsula = find(scene, 'Insula (Subcentral gyrus and ant. and post. sulci)', 'left');

  scene.setProgress(0.45);
  settle(scene);
  assert.ok(rightCortex.material.opacity < 0.04, 'right hemisphere is hidden');
  assert.ok(leftCortex.material.opacity > 0.95, 'left lateral cortex remains an anatomical hemisphere');
  assert.ok(leftOperculum.material.opacity < 0.1, 'the operculum peels back by opacity');
  assert.ok(parietalOperculum.material.opacity < 0.1, 'the parietal operculum also clears the insula');
  assert.ok(leftInsula.material.opacity > 0.95, 'the buried insula becomes selectable');
  for (const [mesh, position] of originalPositions) {
    assert.ok(mesh.position.equals(position), `${mesh.name} stays in its registered position`);
  }
  scene.dispose();
});

test('deep view keeps a cortical reference and reveals registered structures in place', () => {
  const scene = buildScene();
  const putamen = find(scene, 'Putamen', 'left');
  const ventricle = find(scene, 'Lateral ventricle', 'left');
  const whiteMatterShell = find(scene, 'White matter of telencephalon', 'left');
  const cortex = find(scene, 'Middle temporal gyrus', 'left');
  const brainstem = find(scene, 'Pons', 'left');
  assert.equal(putamen.material.opacity, 0, 'deep nuclei begin concealed');

  scene.setProgress(1);
  settle(scene);
  assert.ok(putamen.material.opacity > 0.99);
  assert.ok(ventricle.material.opacity > 0.75 && ventricle.material.opacity < 0.8);
  assert.ok(whiteMatterShell.material.opacity < 0.04, 'hemispheric white matter does not hide the nuclei');
  assert.ok(cortex.material.opacity > 0.06 && cortex.material.opacity < 0.09);
  assert.equal(brainstem.material.opacity, 1);
  assert.equal(cortex.material.depthWrite, false, 'the cortical ghost cannot occlude deep anatomy');
  scene.dispose();
});

test('annotation anchors come from the loaded atlas structures', () => {
  const scene = buildScene();
  const annotations = scene.getAnnotations();
  assert.equal(annotations.length, 4);
  for (const annotation of annotations) {
    assert.ok(annotation.position instanceof THREE.Vector3);
    assert.ok(annotation.position.toArray().every(Number.isFinite));
  }
  assert.notDeepEqual(
    annotations.find((item) => item.id === 'temporal').position.toArray(),
    [1.1, -0.35, 0.35],
    'the authored placeholder was replaced with the mesh bounds centre'
  );
  scene.dispose();
});

test('untranslated fine structures keep their exact atlas label and a safe Japanese parent', () => {
  const info = brainStructureInfo({
    bx_id: 999,
    bx_cat: 'cortex',
    bx_label: 'Example named sulcus',
    bx_side: 'right',
    bx_region: 'Temporal lobe',
  });
  assert.equal(info.name, 'Example named sulcus');
  assert.equal(info.nameJa, '側頭葉（Example named sulcus）');
  assert.equal(info.sideJa, '右');
  assert.match(info.descriptionJa, /側頭葉/);
});

test('abbreviated lateral-sulcus labels are expanded without losing atlas identity', () => {
  const info = brainStructureInfo({
    bx_id: 159,
    bx_cat: 'cortex',
    bx_label: 'Lat Fis-post',
    bx_side: 'left',
    bx_region: 'Telencephalon',
  });
  assert.equal(info.name, 'Posterior ramus of lateral sulcus');
  assert.equal(info.nameJa, '外側溝後枝');
  assert.equal(info.atlasName, 'Lat Fis-post');
});

test('every selectable atlas label has a deliberate Japanese name and hierarchy', () => {
  const bytes = readFileSync(new URL('../public/assets/brain/brain.glb', import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const selectableCategories = new Set([
    'cortex', 'deep_grey', 'diencephalon', 'white_matter',
    'ventricles', 'cerebellum', 'brainstem',
  ]);
  const structures = new Map();
  for (const node of gltf.nodes) {
    const metadata = node.extras;
    if (metadata && selectableCategories.has(metadata.bx_cat)) {
      structures.set(`${metadata.bx_cat}:${metadata.bx_label}`, metadata);
    }
  }
  assert.equal(structures.size, 147);
  const detailColours = new Set();
  const naturalColours = new Set();
  const detailSamples = [];
  for (const metadata of structures.values()) {
    const info = brainStructureInfo(metadata);
    assert.notEqual(info.nameJa, `${info.regionJa}（${info.name}）`, `${info.name} is translated`);
    assert.ok(info.hierarchyJa.length >= 3, `${info.name} has an anatomical hierarchy`);
    const detailColour = brainColor(metadata);
    const naturalColour = brainColor(metadata, 'anatomical');
    assert.ok(/^#[0-9a-f]{6}$/.test(detailColour), `${info.name} has a fine colour`);
    assert.ok(/^#[0-9a-f]{6}$/.test(naturalColour), `${info.name} has a natural colour`);
    detailColours.add(detailColour);
    naturalColours.add(naturalColour);
    detailSamples.push({ label: info.name, lab: hexToLab(detailColour) });
  }
  assert.equal(detailColours.size, structures.size, 'all 147 named structures have distinct colour-map shades');
  assert.equal(naturalColours.size, structures.size, 'all 147 named structures avoid exact natural-tone collisions');
  let closest = { distance: Infinity, labels: [] };
  for (let left = 0; left < detailSamples.length; left += 1) {
    for (let right = left + 1; right < detailSamples.length; right += 1) {
      const distance = cie76(detailSamples[left].lab, detailSamples[right].lab);
      if (distance < closest.distance) {
        closest = { distance, labels: [detailSamples[left].label, detailSamples[right].label] };
      }
    }
  }
  assert.ok(
    closest.distance >= 3.8,
    `closest detail colours are too similar: ${closest.labels.join(' / ')} (ΔE ${closest.distance.toFixed(2)})`
  );
});

test('cingulate terminology distinguishes aMCC from an unavailable ACC mesh', () => {
  const info = brainStructureInfo({
    bx_id: 62,
    bx_cat: 'cortex',
    bx_label: 'Cingulate gyrus and sulcus (Middle anterior part)',
    bx_side: 'left',
    bx_region: 'Limbic lobe',
  });
  assert.equal(info.nameJa, '帯状回・帯状溝（前中部／aMCC）');
  assert.deepEqual(info.hierarchyJa, ['左大脳半球', '辺縁葉', '帯状皮質']);
  assert.equal(info.preferredView, 'left-medial');
  assert.match(info.noteJa, /ACCの独立ラベルはありません/);
  assert.match(info.note, /no independent ACC label/);

  const bytes = readFileSync(new URL('../public/assets/brain/brain.glb', import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const labels = gltf.nodes.map((node) => node.extras?.bx_label).filter(Boolean);
  assert.ok(labels.includes('Cingulate gyrus and sulcus (Middle anterior part)'));
  assert.ok(!labels.includes('Anterior cingulate cortex'), 'the UI must not invent absent geometry');
});

test('hierarchy does not place diencephalic or midbrain structures in a cerebral hemisphere', () => {
  const subthalamic = brainStructureInfo({
    bx_cat: 'deep_grey', bx_label: 'Subthalamic nucleus', bx_side: 'left', bx_region: 'Diencephalon',
  });
  const nigra = brainStructureInfo({
    bx_cat: 'deep_grey', bx_label: 'Substantia nigra', bx_side: 'left', bx_region: 'Mesencephalon',
  });
  assert.deepEqual(subthalamic.hierarchyJa, ['左間脳', '間脳', '大脳基底核']);
  assert.deepEqual(nigra.hierarchyJa, ['左中脳', '中脳', '大脳基底核']);
});

test('fine hierarchy keeps epithalamus and cerebellar vermis distinct', () => {
  const habenula = brainStructureInfo({
    bx_cat: 'diencephalon', bx_label: 'Habenula', bx_side: 'median', bx_region: 'Diencephalon',
  });
  const culmen = brainStructureInfo({
    bx_cat: 'cerebellum', bx_label: 'Culmen', bx_side: 'median', bx_region: 'Cerebellum',
  });
  assert.deepEqual(habenula.hierarchyJa, ['正中', '間脳', '視床上部']);
  assert.deepEqual(culmen.hierarchyJa, ['正中', '小脳', '小脳虫部']);
});

test('a display-only region override changes the breadcrumb but never the colour or the region field', () => {
  const paracentral = brainStructureInfo({
    bx_id: 261, bx_cat: 'cortex', bx_label: 'Paracentral gyrus and sulcus',
    bx_side: 'left', bx_region: 'Frontal lobe',
  });
  assert.deepEqual(paracentral.hierarchyJa, ['左大脳半球', '前頭葉・頭頂葉', '大脳回・大脳溝']);
  // `region`/`regionJa` (as opposed to the breadcrumb) and colour are derived
  // from the true upstream region, `Frontal lobe`, not from the display
  // override — #6/#21 of the 2026-09-16 AI re-review asked only for the
  // breadcrumb to change.
  assert.equal(paracentral.region, 'Frontal lobe');
  assert.equal(paracentral.regionJa, '前頭葉');
  assert.match(paracentral.noteJa, /前頭葉のみに分類/);

  const lateralOT = brainStructureInfo({
    bx_id: 169, bx_cat: 'cortex', bx_label: 'Lateral occipitotemporal gyrus',
    bx_side: 'left', bx_region: 'Temporal lobe',
  });
  assert.deepEqual(lateralOT.hierarchyJa, ['左大脳半球', '側頭葉・後頭葉', '大脳回']);
  assert.equal(lateralOT.region, 'Temporal lobe');
  assert.equal(lateralOT.regionJa, '側頭葉');

  // Colour is keyed off the true region (via brainColorKey), which the
  // display override never touches: the paracentral parcel's colour key
  // still matches a plain frontal-lobe structure's, not a temporal one's.
  assert.equal(
    brainColorKey({ bx_cat: 'cortex', bx_label: 'Paracentral gyrus and sulcus', bx_region: 'Frontal lobe' }),
    brainColorKey({ bx_cat: 'cortex', bx_label: 'Middle frontal gyrus', bx_region: 'Frontal lobe' })
  );
  assert.notEqual(
    brainColorKey({ bx_cat: 'cortex', bx_label: 'Paracentral gyrus and sulcus', bx_region: 'Frontal lobe' }),
    brainColorKey({ bx_cat: 'cortex', bx_label: 'Lateral occipitotemporal gyrus', bx_region: 'Temporal lobe' })
  );
});

test('CL in the thalamic CL–LP–PuM parcel names the central lateral nucleus, not the intralaminar group', () => {
  const info = brainStructureInfo({
    bx_cat: 'diencephalon', bx_label: 'Intralaminar and lateral posterior nuclei',
    bx_side: 'left', bx_region: 'Diencephalon',
  });
  assert.equal(info.nameJa, '視床 CL–LP–PuM 区画（外側中心核・後外側核・内側視床枕を含む）');
  assert.match(info.noteJa, /外側中心核/);
  assert.match(info.note, /central lateral nucleus/);
  assert.match(info.noteJa, /brain-merged-parcels\.md/);
});

test('the hypothalamic parcels no longer share one "integrated parcel" note — 3 of 5 are single-label', () => {
  for (const label of ['Preoptic hypothalamus', 'Lateral hypothalamus', 'Posterior hypothalamus']) {
    const info = brainStructureInfo({
      bx_cat: 'diencephalon', bx_label: label, bx_side: 'left', bx_region: 'Diencephalon',
    });
    assert.match(info.noteJa, /片側 1 元ラベル/, `${label} is single-label per side`);
    assert.doesNotMatch(info.noteJa, /6 元ラベル|4 元ラベル/, `${label} is not described as multi-label`);
  }
  const anterior = brainStructureInfo({
    bx_cat: 'diencephalon', bx_label: 'Anterior hypothalamus', bx_side: 'left', bx_region: 'Diencephalon',
  });
  assert.match(anterior.noteJa, /6 元ラベル/);
  const tuberal = brainStructureInfo({
    bx_cat: 'diencephalon', bx_label: 'Tuberal hypothalamus', bx_side: 'left', bx_region: 'Diencephalon',
  });
  assert.match(tuberal.noteJa, /4 元ラベル/);
});

test('amygdala notes cite the recovered source label ids and the provenance record', () => {
  const corticomedial = brainStructureInfo({
    bx_cat: 'deep_grey', bx_label: 'Corticomedial group', bx_side: 'left', bx_region: 'Telencephalon',
  });
  assert.match(corticomedial.noteJa, /\[5, 7, 8, 9\]/);
  assert.match(corticomedial.noteJa, /brain-merged-parcels\.md/);

  const basolateral = brainStructureInfo({
    bx_cat: 'deep_grey', bx_label: 'Basolateral complex', bx_side: 'left', bx_region: 'Telencephalon',
  });
  assert.match(basolateral.noteJa, /\[2, 3, 6\]/);
  assert.match(basolateral.noteJa, /外側核（\[1\]）を含まない/);
});

test('median single-mesh structures say the midline is a storage unit, not an anatomical guarantee', () => {
  for (const label of ['Habenula', 'Septal nuclei']) {
    const info = brainStructureInfo({
      bx_cat: 'diencephalon', bx_label: label, bx_side: 'median', bx_region: 'Diencephalon',
    });
    assert.match(info.noteJa, /左右を分けない 1 つのメッシュ/, `${label} explains its midline storage`);
    assert.match(info.noteJa, /解剖学的な正中構造であることを保証しない/, `${label} does not overclaim`);
  }
});

test('capitalized brainstem nuclei and cerebellar peduncles keep their fine families', () => {
  for (const label of ['Nucleus of oculomotor nerve', 'Nucleus of abducens nerve']) {
    const info = brainStructureInfo({
      bx_cat: 'brainstem', bx_label: label, bx_side: 'median', bx_region: 'Brainstem',
    });
    assert.equal(info.hierarchy.at(-1), 'Brainstem nuclei');
    assert.equal(info.hierarchyJa.at(-1), '脳幹神経核');
  }
  const floccularPeduncle = brainStructureInfo({
    bx_cat: 'cerebellum', bx_label: 'Peduncle of flocculus', bx_side: 'left', bx_region: 'Cerebellum',
  });
  assert.equal(floccularPeduncle.hierarchy.at(-1), 'Cerebellar peduncles');
  assert.equal(floccularPeduncle.hierarchyJa.at(-1), '小脳脚');
});

test('"Collateral sulcus" and its posterior transverse variant are cerebral sulci, not the lateral sulcus', () => {
  // The unfixed regex (`/Lat Fis|lateral sulcus/i`) matched the "lateral
  // sulcus" substring inside "Col*lateral sulcus*", so both of these fell
  // under 外側溝 instead of 大脳溝 (2026-09-16 AI terminology check, #3).
  for (const label of ['Collateral sulcus', 'Posterior transverse collateral sulcus']) {
    const info = brainStructureInfo({
      bx_cat: 'cortex', bx_label: label, bx_side: 'left', bx_region: 'Telencephalon',
    });
    assert.equal(info.hierarchy.at(-1), 'Cerebral sulci');
    assert.equal(info.hierarchyJa.at(-1), '大脳溝');
  }
});

test('plural "sulci" labels and cortical poles get their own families instead of falling to 大脳皮質/大脳回', () => {
  const orbitalSulci = brainStructureInfo({
    bx_cat: 'cortex', bx_label: 'Orbital sulci (H-shaped orbital sulci)', bx_side: 'left', bx_region: 'Frontal lobe',
  });
  assert.equal(orbitalSulci.hierarchy.at(-1), 'Cerebral sulci');
  assert.equal(orbitalSulci.hierarchyJa.at(-1), '大脳溝');

  for (const label of ['Occipital pole', 'Temporal pole']) {
    const info = brainStructureInfo({
      bx_cat: 'cortex', bx_label: label, bx_side: 'left',
      bx_region: label === 'Occipital pole' ? 'Occipital lobe' : 'Temporal lobe',
    });
    assert.equal(info.hierarchy.at(-1), 'Cerebral poles');
    assert.equal(info.hierarchyJa.at(-1), '大脳の極');
  }
});

test('the aqueduct of midbrain is filed under the ventricular system, not generic brainstem anatomy', () => {
  const info = brainStructureInfo({
    bx_cat: 'brainstem', bx_label: 'Aqueduct of midbrain', bx_side: 'median', bx_region: 'Brainstem',
  });
  assert.equal(info.hierarchy.at(-1), 'Ventricular system');
  assert.equal(info.hierarchyJa.at(-1), '脳室系');
  // The side/region position stays with the brainstem/midbrain it runs
  // through — only the fine family moves.
  assert.equal(info.region, 'Brainstem');
  assert.equal(info.regionJa, '脳幹');
});

test('base of peduncle is corrected to the midbrain, and its note names the upstream cerebellum tag', () => {
  const info = brainStructureInfo({
    bx_cat: 'cerebellum', bx_label: 'Base of peduncle', bx_side: 'left', bx_region: 'Cerebellum',
  });
  assert.equal(info.nameJa, '大脳脚底');
  assert.equal(info.category, 'brainstem');
  assert.equal(info.categoryNameJa, '脳幹');
  assert.equal(info.region, 'Midbrain');
  assert.equal(info.regionJa, '中脳');
  assert.deepEqual(info.hierarchyJa, ['左中脳', '中脳', '中脳表面解剖']);
  assert.match(info.noteJa, /小脳/, 'the note names the upstream placement it corrects');
  assert.match(info.note, /cerebellum/i, 'the note names the upstream placement it corrects');
});

test('septum pellucidum and choroid plexus are not described as CSF spaces', () => {
  const septum = brainStructureInfo({
    bx_cat: 'ventricles', bx_label: 'Septum pellucidum', bx_side: 'median', bx_region: 'Telencephalon',
  });
  const plexus = brainStructureInfo({
    bx_cat: 'ventricles', bx_label: 'Choroid plexus', bx_side: 'left', bx_region: 'ventricles',
  });
  for (const info of [septum, plexus]) {
    assert.doesNotMatch(info.descriptionJa, /脳脊髄液腔(そのもの)?です/);
    assert.doesNotMatch(info.description, /is a( connected)? cerebrospinal-fluid space/i);
    assert.equal(info.hierarchy.at(-1), 'Ventricular system — related structures');
    assert.equal(info.hierarchyJa.at(-1), '脳室系の関連構造');
  }
  // The shared fallback used by any remaining ventricle mesh must still read
  // correctly — i.e. it must not claim every ventricular-system mesh is a CSF
  // space either.
  const unlabelledVentricleMesh = brainStructureInfo({
    bx_cat: 'ventricles', bx_label: 'Some unlisted ventricular mesh', bx_side: 'median', bx_region: 'ventricles',
  });
  assert.doesNotMatch(unlabelledVentricleMesh.descriptionJa, /^脳内で連続する脳脊髄液腔の一部です。$/);
});

const FIXTURE_STRUCTURES = [
  structure(212, 'Middle temporal gyrus', 'left', 'cortex', 'Temporal lobe', [1.1, -0.3, 0.25]),
  structure(213, 'Middle temporal gyrus', 'right', 'cortex', 'Temporal lobe', [-1.1, -0.3, 0.25]),
  structure(208, 'Middle frontal gyrus', 'left', 'cortex', 'Frontal lobe', [1.0, 0.45, 0.45]),
  structure(209, 'Middle frontal gyrus', 'right', 'cortex', 'Frontal lobe', [-1.0, 0.45, 0.45]),
  structure(56, 'Central sulcus', 'left', 'cortex', 'Telencephalon', [1.05, 0.55, 0]),
  structure(145, 'Insula (Subcentral gyrus and ant. and post. sulci)', 'left', 'cortex', 'Insula', [0.55, 0, 0]),
  structure(146, 'Insula (Subcentral gyrus and ant. and post. sulci)', 'right', 'cortex', 'Insula', [-0.55, 0, 0]),
  structure(305, 'Opercular part of inferior frontal gyrus', 'left', 'cortex', 'Frontal lobe', [0.9, 0.05, 0.2]),
  structure(402, 'Supramarginal gyrus', 'left', 'cortex', 'Parietal lobe', [0.9, 0.02, -0.18]),
  structure(122, 'Hippocampus', 'left', 'cortex', 'Limbic lobe', [0.35, -0.25, -0.1]),
  structure(325, 'Putamen', 'left', 'deep_grey', 'Telencephalon', [0.3, 0, 0]),
  structure(326, 'Putamen', 'right', 'deep_grey', 'Telencephalon', [-0.3, 0, 0]),
  structure(173, 'Lateral ventricle', 'left', 'ventricles', 'Telencephalon', [0.22, 0.18, 0]),
  structure(74, 'Corpus callosum', 'median', 'white_matter', 'Telencephalon', [0, 0.28, 0]),
  structure(433, 'White matter of telencephalon', 'left', 'white_matter', 'Telencephalon', [0.45, 0.1, 0]),
  structure(281, 'Mediodorsal nucleus', 'left', 'diencephalon', 'Diencephalon', [0.28, 0.05, -0.1]),
  structure(312, 'Pons', 'left', 'brainstem', 'Brainstem', [0, -0.65, -0.15]),
  structure(28, 'Anterior quadrangular lobule', 'left', 'cerebellum', 'Cerebellum', [0.45, -0.65, -0.6]),
];

function structure(id, label, side, category, region, position) {
  return { id, label, side, category, region, position };
}

function buildScene() {
  const atlas = new THREE.Group();
  atlas.name = 'fixture-atlas';
  for (const item of FIXTURE_STRUCTURES) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.28, 0.3),
      new THREE.MeshBasicMaterial({ color: '#ffffff' })
    );
    mesh.name = `${item.label}.${item.side}`;
    mesh.position.fromArray(item.position);
    mesh.userData = {
      bx_id: item.id,
      bx_cat: item.category,
      bx_label: item.label,
      bx_side: item.side,
      bx_region: item.region,
      bx_core: 1,
      bx_source: 'test atlas',
    };
    atlas.add(mesh);
  }
  const scene = new BrainAnatomyScene({ atlas });
  scene.build();
  return scene;
}

/** The annotation the scene publishes for one of its anchors. */
function annotationFor(scene, anchor) {
  const annotation = scene.getAnnotations().find((item) => item.anchor === anchor);
  assert.ok(annotation, `${anchor} is an anchor of this scene`);
  return annotation;
}

/**
 * A camera beyond `behind`, on the line through it and `target`, so that
 * `behind` sits between the camera and `target`.
 */
function vantage(scene, behind, target) {
  scene.root.updateMatrixWorld(true);
  const a = behind.getWorldPosition(new THREE.Vector3());
  const b = target.getWorldPosition(new THREE.Vector3());
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100);
  camera.position.copy(a).addScaledVector(a.clone().sub(b).normalize(), 5);
  camera.lookAt(b);
  camera.updateMatrixWorld(true);
  return camera;
}

function find(scene, label, side) {
  const mesh = scene.selectables.find(
    (candidate) => candidate.userData.bx_label === label && candidate.userData.bx_side === side
  );
  assert.ok(mesh, `${side} ${label} exists in fixture`);
  return mesh;
}

function colorOf(scene, label, side) {
  return find(scene, label, side).material.color.getHexString();
}

function hslOf(mesh) {
  return mesh.material.color.getHSL({ h: 0, s: 0, l: 0 });
}

function settle(scene) {
  for (let i = 0; i < 240; i += 1) scene.update(1 / 60);
}

function hexToLab(hex) {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const [red, green, blue] = channels.map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  const xyz = [
    red * 0.4124564 + green * 0.3575761 + blue * 0.1804375,
    red * 0.2126729 + green * 0.7151522 + blue * 0.072175,
    red * 0.0193339 + green * 0.119192 + blue * 0.9503041,
  ];
  const transform = (value) => (
    value > 216 / 24389 ? Math.cbrt(value) : (24389 / 27 * value + 16) / 116
  );
  const [x, y, z] = xyz.map((value, index) => transform(value / [0.95047, 1, 1.08883][index]));
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function cie76(left, right) {
  return Math.hypot(...left.map((value, index) => value - right[index]));
}

/* --------------------------------------------------------------------------
   Abandoning the fetch

   The landing hero fetches this atlas in the background. A reader who clicks
   away while it is in flight cancels it, and the rejection is delivered as the
   old document goes — so a failure reported here is printed onto whatever page
   they went to next. The success path already drops a model that arrived after
   disposal; these two fix the same question being answered differently in the
   other branch.
   -------------------------------------------------------------------------- */

/** Enough of a viewer for `build()` to take the loading path. */
const loaderViewport = () => ({
  renderer: {
    domElement: { style: {}, addEventListener() {}, removeEventListener() {} },
  },
});

test('an atlas fetch abandoned by disposal is not reported as a failure', async () => {
  const said = [];
  const wasError = console.error;
  console.error = (...args) => said.push(args);
  let fail = () => {};
  try {
    const scene = new BrainAnatomyScene({
      viewer: loaderViewport(),
      atlasLoader: () => new Promise((_, reject) => { fail = reject; }),
    });
    scene.build();
    scene.dispose();
    fail(new TypeError('Load failed'));
    await scene.ready;
    assert.deepEqual(said, [], 'the scene cancelled this fetch itself');
    assert.notEqual(scene.status.state, 'error', 'a disposed scene has no state left to report');
  } finally {
    console.error = wasError;
  }
});

test('an atlas fetch abandoned by leaving the page is not reported as a failure', async () => {
  // Disposal is only one of the two ways a page stops mattering. Following a
  // link to another document does not dispose the scene, so this case reached
  // the console — as `Failed to fetch` in Chromium and `Load failed` in
  // WebKit, where it read as an engine defect and failed CI intermittently.
  const said = [];
  const wasError = console.error;
  const previousWindow = globalThis.window;
  const handlers = new Map();
  globalThis.window = {
    addEventListener: (type, handler) => handlers.set(type, handler),
    removeEventListener: (type, handler) => {
      if (handlers.get(type) === handler) handlers.delete(type);
    },
  };
  console.error = (...args) => said.push(args);
  let fail = () => {};
  try {
    const scene = new BrainAnatomyScene({
      viewer: loaderViewport(),
      atlasLoader: () => new Promise((_, reject) => { fail = reject; }),
    });
    scene.build();
    assert.ok(handlers.has('pagehide'), 'the scene knows when its document is going away');
    handlers.get('pagehide')();
    fail(new TypeError('Failed to fetch'));
    await scene.ready;
    assert.deepEqual(said, [], 'the navigation cancelled this fetch; the atlas did not fail');
    scene.dispose();
    assert.ok(!handlers.has('pagehide'), 'and the listener leaves with the scene');
  } finally {
    console.error = wasError;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('an atlas that genuinely fails is still reported', async () => {
  const said = [];
  const wasError = console.error;
  console.error = (...args) => said.push(args);
  try {
    const scene = new BrainAnatomyScene({
      viewer: loaderViewport(),
      atlasLoader: () => Promise.reject(new TypeError('Load failed')),
    });
    scene.build();
    await scene.ready;
    assert.equal(said.length, 1, 'a live scene that cannot load its atlas says so');
    assert.equal(scene.status.state, 'error');
    scene.dispose();
  } finally {
    console.error = wasError;
  }
});

test('hiding is by structure, outlasts a colour change, and is not isolation', () => {
  const scene = buildScene();
  settle(scene);
  const temporal = find(scene, 'Middle temporal gyrus', 'left');
  const frontal = find(scene, 'Middle frontal gyrus', 'left');
  const id = temporal.userData.atlasId;

  let announced = null;
  scene.onAnatomyVisibility((state) => { announced = state; });

  // A structure stays selected when it is hidden: what is on the card and what
  // is on screen are two questions.
  scene.selectStructure(id);
  assert.equal(scene.setStructureHidden(id, true), true);
  settle(scene);
  assert.equal(temporal.visible, false);
  assert.equal(frontal.visible, true, 'and only that structure went');
  assert.deepEqual(announced, { hidden: [id] }, 'the surfaces are told');
  assert.equal(scene.getAnatomySelection()?.id, id, 'the selection is untouched');

  // Recolouring, re-viewing and re-layering are display choices and none of
  // them is "bring it back".
  scene.setAnatomyColorMode('anatomical');
  scene.setAnatomyView('right-lateral');
  scene.setProgress(0.5);
  settle(scene);
  assert.equal(temporal.visible, false, 'still hidden after a colour, a view and a layer change');

  assert.equal(scene.showAllHiddenStructures(), true);
  settle(scene);
  assert.equal(temporal.visible, true);
  assert.deepEqual(scene.getAnatomyVisibility(), { hidden: [] });
  scene.dispose();
});

test('isolation overrides hiding without overwriting it', () => {
  const scene = buildScene();
  settle(scene);
  const temporal = find(scene, 'Middle temporal gyrus', 'left');
  const frontal = find(scene, 'Middle frontal gyrus', 'left');
  scene.setStructureHidden(temporal.userData.atlasId, true);
  settle(scene);

  // Isolating something else is a temporary "only this", and it does not
  // forget what the reader hid.
  scene.isolateStructure(frontal.userData.atlasId);
  settle(scene);
  assert.equal(frontal.visible, true);
  assert.equal(temporal.visible, false);
  assert.deepEqual(scene.getAnatomyVisibility().hidden, [temporal.userData.atlasId]);

  scene.clearIsolation();
  settle(scene);
  assert.equal(frontal.visible, true, 'the model comes back');
  assert.equal(temporal.visible, false, 'except what the reader had hidden');

  // "Only this one" and "not this one" cannot both hold: hiding the isolated
  // structure ends the isolation rather than emptying the screen.
  scene.isolateStructure(frontal.userData.atlasId);
  settle(scene);
  scene.setStructureHidden(frontal.userData.atlasId, true);
  settle(scene);
  assert.equal(scene.getAnatomyIsolation(), null);
  assert.equal(frontal.visible, false);
  assert.ok(scene.selectables.some((mesh) => mesh.visible), 'the model is not blank');
  scene.dispose();
});

test('reveal changes the display, never the anatomy, and says when it cannot', () => {
  const scene = buildScene();
  settle(scene);
  const putamen = find(scene, 'Putamen', 'left');
  const positions = new Map(scene.selectables.map((mesh) => [mesh, mesh.position.clone()]));
  assert.equal(putamen.visible, false, 'a deep structure starts under the cortex');

  const result = scene.revealStructure(putamen.userData.atlasId);
  assert.equal(result.ok, true);
  assert.ok(result.changed.includes('layer'), 'the layer is what was in the way');
  // The layer is *reported*, not set: the console's slider owns that value, and
  // a scene that wrote it too would leave the model deep and the slider at 0 %.
  assert.equal(result.layer, 1);
  assert.equal(putamen.visible, false, 'so nothing has happened until the owner applies it');
  scene.setProgress(result.layer);
  settle(scene);
  assert.equal(putamen.visible, true);
  for (const [mesh, position] of positions) {
    assert.ok(mesh.position.equals(position), 'and nothing moved to achieve it');
  }

  // Going back is going back: the layer, the view and the hidden set together.
  assert.equal(scene.canRestoreDisplay(), true);
  const back = scene.restoreDisplay();
  assert.equal(back.ok, true);
  assert.equal(back.layer, 0, 'and the layer comes back the same way it went');
  scene.setProgress(back.layer);
  settle(scene);
  assert.equal(putamen.visible, false);
  assert.equal(scene.canRestoreDisplay(), false, 'and there is nothing left to restore');

  // A structure the reader hid is revealed by un-hiding it.
  scene.setStructureHidden(putamen.userData.atlasId, true);
  const second = scene.revealStructure(putamen.userData.atlasId);
  if (second.layer != null) scene.setProgress(second.layer);
  settle(scene);
  assert.equal(second.ok, true);
  assert.ok(second.changed.includes('hidden'));
  assert.equal(putamen.visible, true);

  assert.deepEqual(scene.revealStructure('group:Left cerebral hemisphere'),
    { ok: false, reason: 'unknown-structure' },
    'a group is not a structure and reveal does not pretend otherwise');
  scene.dispose();
});

test('a hidden structure leaves the picker and stops occluding a label', () => {
  const scene = buildScene();
  settle(scene);
  const left = find(scene, 'Middle temporal gyrus', 'left');
  const right = find(scene, 'Middle temporal gyrus', 'right');
  const temporal = annotationFor(scene, 'temporal');
  const far = vantage(scene, right, left);

  assert.equal(temporal.isVisible(far), false, 'the right gyrus is in the way');
  // Hiding the thing in front is not a special case for labels or for picking:
  // both read the same "is it drawn" rule.
  scene.setStructureHidden(right.userData.atlasId, true);
  settle(scene);
  assert.equal(temporal.isVisible(far), true, 'and now it is not');
  assert.equal(scene._drawnMeshes().includes(right), false, 'nor can it be clicked');
  scene.dispose();
});

test('brain: a structure the settings are not drawing has no label to wait for', () => {
  // The occlusion grace in the label layer is for an edge that flickers as the
  // model turns. Hiding and isolating do not flicker, and a name left over a
  // structure the reader has just taken off the screen names whatever is behind
  // it — so the scene answers "is it drawn at all" separately from "can it be
  // seen from here".
  const scene = buildScene();
  const id = scene.getAnatomyInventory()[0].id;
  const label = scene.getStructureAnnotation(id);
  assert.equal(typeof label.isDrawn, 'function');
  assert.equal(label.isDrawn(), true);

  scene.setStructureHidden(id, true);
  assert.equal(label.isDrawn(), false, 'hidden by the reader');
  scene.setStructureHidden(id, false);
  assert.equal(label.isDrawn(), true);

  const other = scene.getAnatomyInventory().find((entry) => entry.id !== id);
  scene.isolateStructure(other.id);
  assert.equal(label.isDrawn(), false, 'isolated away');
  scene.clearIsolation();
  assert.equal(label.isDrawn(), true);
  scene.dispose();
});

test('hiding the isolated structure says the isolation ended, not only that something is hidden', () => {
  // Found by review on PR #90. Hiding the isolated structure has always dropped
  // the isolation — "only this one" and "not this one" cannot both be true —
  // but only the visibility event was sent. `AnatomyTreePanel` learns about
  // isolation from `onAnatomyIsolation` and nowhere else, so the row went on
  // wearing its isolated marker while the scene reported no isolation at all.
  for (const hide of [
    (scene, id) => scene.setStructureHidden(id, true),
    (scene, id) => scene.setStructuresHidden([id], true),
  ]) {
    const scene = buildScene();
    const id = scene.selectables[0].userData.atlasId;
    scene.isolateStructure(id);
    assert.equal(scene.getAnatomyIsolation(), id);

    let announced = null;
    let announcements = 0;
    scene.onAnatomyIsolation((value) => { announced = value; announcements += 1; });
    assert.equal(hide(scene, id), true);

    assert.equal(scene.getAnatomyIsolation(), null, 'the isolation is over');
    assert.equal(announcements, 1, 'and it was announced exactly once');
    assert.equal(announced, null, 'as the isolation being over');
    scene.dispose();
  }
});

test('hiding something the reader did not ask a reveal for is not announced as an isolation', () => {
  // The other half of the rule: a hide that ends nothing must stay quiet, or
  // every press repaints every surface that listens for isolation.
  const scene = buildScene();
  const [first, second] = scene.selectables.map((mesh) => mesh.userData.atlasId);
  scene.isolateStructure(first);
  let announcements = 0;
  scene.onAnatomyIsolation(() => { announcements += 1; });
  scene.setStructuresHidden([second], true);
  assert.equal(scene.getAnatomyIsolation(), first, 'the isolation is untouched');
  assert.equal(announcements, 0, 'so nothing about it was announced');
  scene.dispose();
});

test('a visibility change the reader made themselves discards the reveal snapshot', () => {
  // Also from PR #90's review. `restoreDisplay()` puts back the *whole* hidden
  // set from the snapshot, so a hide or show made after a reveal would be
  // silently thrown away by "Back to how it was" — the reader's own change
  // undone by a button that says it undoes the reveal's.
  for (const [what, change] of [
    ['one structure hidden', (scene, id) => scene.setStructureHidden(id, true)],
    ['a group hidden', (scene, id) => scene.setStructuresHidden([id], true)],
    ['everything shown again', (scene) => scene.showAllHiddenStructures()],
  ]) {
    const scene = buildScene();
    const deep = scene.selectables.find((mesh) => mesh.userData.bx_cat === 'deep_grey')
      ?? scene.selectables[1];
    const id = deep.userData.atlasId;
    // Something for `showAllHiddenStructures` to undo, taken before the reveal
    // so the snapshot records it.
    scene.setStructureHidden(scene.selectables[0].userData.atlasId, true);
    const revealed = scene.revealStructure(id);
    assert.equal(revealed.ok, true, `${what}: the reveal ran`);
    assert.equal(scene.canRestoreDisplay(), true, `${what}: and left a way back`);

    change(scene, scene.selectables[2].userData.atlasId);
    assert.equal(
      scene.canRestoreDisplay(),
      false,
      `${what}: the snapshot is stale and must not be offered`
    );
    scene.dispose();
  }
});
