#!/usr/bin/env node
/**
 * Exports the brain atlas's full label set, mesh by mesh, as reviewer-ready
 * markdown tables.
 *
 *   npm run review:brain-labels -- --out <dir>
 *
 * ## Why this exists
 *
 * A terminology or anatomy reviewer cannot check what they cannot see, and
 * the scene only ever shows one selected structure at a time. The
 * 2026-09-16 AI terminology check
 * (`docs/clinical-reviews/brain-anatomy-ai-terminology-check-2026-09-16.md`)
 * needed exactly this — every label, its hierarchy and its description, per
 * mesh — and got it from two throwaway scripts written for that one review.
 * Keeping that as a one-off means the next reviewer is handed a stale,
 * hand-edited copy that has quietly drifted from the asset a reader actually
 * gets.
 *
 * This script regenerates both tables from `public/assets/brain/brain.glb`
 * and `src/data/brainAnatomy.js` every time. **Never hand-edit the generated
 * files** — re-run this script after any change to the atlas or its Japanese
 * terminology instead.
 *
 * Parses the GLB the same way `tests/brain-anatomy.test.js` does: the JSON
 * chunk starting at byte 20, length from the header at byte 12, filtering
 * nodes with `extras.bx_id != null` — **not** a truthiness check, because
 * `bx_id: 0` exists and a truthy check would silently drop it.
 *
 * Options:
 *   --out <dir>   where to write the two markdown files (default:
 *                 docs/clinical-reviews/packets/brain-anatomy-labels/)
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { brainCopySource, brainStructureInfo } from '../src/data/brainAnatomy.js';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const GLB_PATH = join(ROOT, 'public/assets/brain/brain.glb');
const EXPECTED_MESH_COUNT = 271;

const argv = process.argv.slice(2);
const value = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};
const outDir = resolve(ROOT, value('--out', 'docs/clinical-reviews/packets/brain-anatomy-labels/'));

/** The seven categories the scene treats as individually selectable. */
const SELECTABLE_CATEGORIES = new Set([
  'cortex', 'deep_grey', 'diencephalon', 'white_matter',
  'ventricles', 'cerebellum', 'brainstem',
]);

const bytes = readFileSync(GLB_PATH);
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());

const meshRows = [];
for (const node of gltf.nodes) {
  const extras = node.extras;
  if (extras?.bx_id == null || !SELECTABLE_CATEGORIES.has(extras.bx_cat)) continue;
  const info = brainStructureInfo(extras);
  meshRows.push({
    id: extras.bx_id,
    rawLabel: extras.bx_label,
    node: node.name,
    cat: extras.bx_cat,
    region: extras.bx_region,
    side: extras.bx_side,
    source: extras.bx_source ?? '',
    parent: extras.bx_parent ?? '',
    atlasName: info.atlasName,
    nameJa: info.nameJa,
    sideJa: info.sideJa,
    categoryNameJa: info.categoryNameJa,
    hierarchyJa: info.breadcrumbJa,
    descriptionJa: info.descriptionJa,
    noteJa: info.noteJa,
    descriptionKey: brainCopySource(extras),
    hasNote: Boolean(info.noteJa),
  });
}

if (meshRows.length !== EXPECTED_MESH_COUNT) {
  console.warn(
    `Warning: expected ${EXPECTED_MESH_COUNT} selectable meshes, found ${meshRows.length}. ` +
      'The asset may have changed since this script was written — check before trusting this export.'
  );
}

// (a) One row per unique label -----------------------------------------------

const byLabel = new Map();
for (const row of meshRows) {
  if (!byLabel.has(row.rawLabel)) {
    byLabel.set(row.rawLabel, { row, sides: new Set() });
  }
  byLabel.get(row.rawLabel).sides.add(row.sideJa);
}
const sortKey = ({ row }) => [row.cat, row.region, row.atlasName].join('\u0000');
const uniqueRows = [...byLabel.values()].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

let labelsMd = '# brain-anatomy — 選択可能ラベル一覧（生成物・手編集禁止）\n\n';
labelsMd +=
  '`node scripts/export-anatomy-labels.mjs` の出力です。配信中の GLB ' +
  '（`public/assets/brain/brain.glb`）と `src/data/brainAnatomy.js` から生成しています。' +
  '**手で書き換えないでください。** 資産や翻訳が変わったら再生成してください。\n\n';
labelsMd += `## 付録A 選択可能ラベル一覧（${uniqueRows.length} 件、配信中 GLB から抽出）\n\n`;
labelsMd += '| # | 元アトラス英語ラベル | 日本語表示名 | 側 | 階層（日本語） | 区分 | 由来 |\n';
labelsMd += '|---|---|---|---|---|---|---|\n';
uniqueRows.forEach(({ row, sides }, index) => {
  labelsMd += `| ${index + 1} | ${row.atlasName} | ${row.nameJa} | ${[...sides].join('/')} | ${row.hierarchyJa} | ${row.categoryNameJa} | ${row.source} |\n`;
});

labelsMd += '\n## 付録B 部位説明文（日本語、同文はまとめて表示）\n\n';
const byDescription = new Map();
for (const { row } of uniqueRows) {
  if (!byDescription.has(row.descriptionJa)) byDescription.set(row.descriptionJa, []);
  byDescription.get(row.descriptionJa).push(row.nameJa);
}
for (const [description, names] of byDescription) {
  const label = names.length > 4 ? `${names.slice(0, 4).join('、')} ほか${names.length - 4}件` : names.join('、');
  labelsMd += `- **${label}**: ${description}\n`;
}

labelsMd += '\n## 付録C 注記\n\n';
for (const { row } of uniqueRows) {
  if (row.noteJa) labelsMd += `- **${row.nameJa}**: ${row.noteJa}\n`;
}

// (b) One row per selectable structure (271, left/right/midline kept separate) —
// a `bx_id`/structure is not the same thing as a rendered mesh: 271 of these
// draw from 397 meshes (R2-28 of the 2026-09-16 AI re-review). ------------

let structuresMd = '# brain-anatomy — 271 選択可能構造一覧（生成物・手編集禁止）\n\n';
structuresMd +=
  '`node scripts/export-anatomy-labels.mjs` の出力です。左右別・構造単位（`bx_id`）で階層と説明文の' +
  '割当を再照合するための一覧です。1 行 = 1 選択可能構造（`bx_id`）で、描画メッシュ数（397）とは別の数え方です。' +
  '**手で書き換えないでください。** 資産や翻訳が変わったら再生成してください。\n\n';
structuresMd +=
  '| bx_id | raw_label | node | bx_cat | bx_region | bx_side | bx_source | bx_parent | 日本語 | 階層（日本語） | description_key | has_note |\n';
structuresMd += '|---|---|---|---|---|---|---|---|---|---|---|---|\n';
const sortedMeshRows = [...meshRows].sort(
  (a, b) => a.rawLabel.localeCompare(b.rawLabel) || String(a.side).localeCompare(String(b.side))
);
for (const row of sortedMeshRows) {
  structuresMd += `| ${row.id} | ${row.rawLabel} | ${row.node} | ${row.cat} | ${row.region} | ${row.side} | ${row.source} | ${row.parent} | ${row.nameJa} | ${row.hierarchyJa} | ${row.descriptionKey} | ${row.hasNote ? 'yes' : 'no'} |\n`;
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
const labelsPath = join(outDir, 'labels-and-descriptions.md');
const structuresPath = join(outDir, 'structures.md');
const staleMeshesPath = join(outDir, 'meshes.md');
writeFileSync(labelsPath, labelsMd);
writeFileSync(structuresPath, structuresMd);
// meshes.md is the old name for this same table (R2-28) and is deleted here
// so a reviewer cannot open a stale copy that this run no longer updates.
if (existsSync(staleMeshesPath)) rmSync(staleMeshesPath);

console.log(`${uniqueRows.length} unique labels -> ${labelsPath}`);
console.log(`${meshRows.length} selectable structures -> ${structuresPath}`);
