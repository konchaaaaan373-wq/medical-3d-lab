import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import BrainAnatomyScene from '../src/scenes/nervous/scenes/brainAnatomy/index.js';
import { BRAIN_COLOR_MODES, brainColor, brainStructureInfo } from '../src/data/brainAnatomy.js';

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
    ['left-lateral', 'left-medial', 'right-lateral', 'right-medial', 'anterior', 'superior']
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
  assert.match(info.noteJa, /前部帯状皮質（ACC）ではありません/);

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
