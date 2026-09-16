import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

/**
 * What the repair is allowed to have changed.
 *
 * The argument for being allowed to modify a third party's mesh at all is
 * narrow: a zero-area triangle draws nothing, so removing it cannot change the
 * rendered surface, and a degenerate normal has no direction, so replacing it
 * restores nothing that was there. Everything else must be identical, and
 * "identical" has to be a measurement rather than an intention.
 *
 * The binaries are not in the repository (`dev-assets/` is ignored), so this
 * reads the report the repair writes. If the report is absent the test says so
 * rather than passing quietly — a missing measurement is not a clean one.
 */

const REPORT = 'docs/asset-qa/measurements/normal-repair.json';

test('derived assets: the repair changed only what it is allowed to change', () => {
  assert.ok(existsSync(REPORT), `${REPORT} is missing — run npm run assets:repair`);
  const report = JSON.parse(readFileSync(REPORT, 'utf8'));
  assert.equal(report.dryRun, false, 'the recorded run actually wrote the derived files');
  assert.ok(report.files.length >= 2, 'both candidates are covered');

  for (const file of report.files) {
    const where = file.assetId;
    // The four things that must not have moved.
    assert.equal(file.heldUnchanged.vertexPositions, true, `${where}: vertex positions moved`);
    assert.equal(file.heldUnchanged.nodesNamesExtrasMaterials, true, `${where}: names, hierarchy, ontology ids or materials moved`);
    assert.equal(file.heldUnchanged.vertices, true, `${where}: the vertex count changed`);
    // Triangles may only fall by exactly what was removed.
    assert.equal(file.heldUnchanged.trianglesAccountedFor, true, `${where}: triangles changed by more than what was pruned`);

    // Every degenerate normal is accounted for by one of the three outcomes.
    const handled = file.repaired + file.unusedGivenUnitNormal + file.foldTookLargestFace;
    assert.equal(handled, file.degenerateNormals, `${where}: ${file.degenerateNormals - handled} normals unaccounted for`);
    assert.equal(file.unrepairable, 0, `${where}: ${file.unrepairable} normals left degenerate`);

    // Source and derived are different bytes, and both are recorded.
    assert.match(file.source.sha256, /^[0-9a-f]{64}$/, `${where}: no source hash`);
    assert.ok(file.derived?.sha256, `${where}: no derived hash recorded`);
    assert.notEqual(file.derived.sha256, file.source.sha256, `${where}: derived and source are the same bytes`);
    assert.ok(file.derived.path.includes('/derived/'), `${where}: the derived file was not written to its own directory`);

    // Both counts are recorded, and a reader must never have to guess which
    // side a number is. What the two sides differ by depends on whether the
    // file also had branches removed:
    //
    // - With no trim, the only thing that went is degenerate triangles, so the
    //   difference is exactly that and the vertex count does not move at all.
    // - With a trim, whole meshes went as well, so the file-level counts differ
    //   by more and cannot be reconciled from the report's own totals. The
    //   claim that survives is the one `heldUnchanged` carries, checked above:
    //   every mesh that ships kept its positions, and within those meshes the
    //   triangles lost are exactly the degenerate ones.
    const pruned = file.removedZeroAreaTriangles + file.removedDuplicateFaces;
    if (!file.removedUndrawnMeshes) {
      assert.equal(
        file.sourceCounts.triangles - file.derivedCounts.triangles,
        pruned,
        `${where}: the recorded source and derived triangle counts do not differ by the ${pruned} pruned`,
      );
      assert.equal(file.sourceCounts.vertices, file.derivedCounts.vertices, `${where}: the vertex count changed`);
    } else {
      assert.ok(
        file.sourceCounts.triangles - file.derivedCounts.triangles > pruned,
        `${where}: meshes were removed, so more than the ${pruned} degenerate triangles should be gone`,
      );
      assert.ok(
        file.sourceCounts.vertices > file.derivedCounts.vertices,
        `${where}: meshes were removed, so the vertex count should have fallen`,
      );
      assert.ok(file.keptSubtree, `${where}: meshes were removed without recording which subtree was kept`);
      assert.ok(
        file.derivedCounts.meshes < file.sourceCounts.meshes,
        `${where}: ${file.removedUndrawnMeshes} meshes were reported removed and the count did not fall`,
      );
    }
  }
});

test('derived assets: the amount removed is recorded, because it is the whole argument', () => {
  const report = JSON.parse(readFileSync(REPORT, 'utf8'));
  for (const file of report.files) {
    // A zero-area triangle draws nothing — that is why removing it is allowed,
    // and the count is what lets somebody check the claim is small.
    assert.ok(Number.isInteger(file.removedZeroAreaTriangles), `${file.assetId}: no count of removed triangles`);
    const removed = file.removedZeroAreaTriangles + file.removedDuplicateFaces;
    const share = removed / file.sourceCounts.triangles;
    assert.ok(share < 0.01, `${file.assetId}: ${(share * 100).toFixed(2)}% of triangles removed — too much to call it a repair`);
  }
});

test('derived assets: --dry-run writes nothing and measures everything', () => {
  // The bug this exists for: stage 1 prunes the zero-area triangles and stage 2
  // recomputes the normals, and stage 1's result was written back only when
  // `--dry-run` was off. So the preview ran stage 2 against the triangles
  // stage 1 was about to remove, and the vertices whose only neighbours were
  // those triangles came back with no face to average. It reported the heart as
  // `repaired: 200, unrepairable: 168` where the real run reports 203 and 0 —
  // and 168 normals left degenerate reads as "this repair cannot reach a gate
  // that needs zero errors", which is the opposite of the truth.
  //
  // The binaries are git-ignored, so this cannot run the script. It fixes the
  // shape instead: `DRY` may only decide whether a *file* is written. Any other
  // use of it is the work being skipped rather than the writing.
  const lines = readFileSync('scripts/repair-candidate-gltf.mjs', 'utf8').split('\n');
  const guards = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /(^|[^A-Za-z])!DRY\b/.test(line));
  assert.equal(
    guards.length,
    2,
    `!DRY guards ${guards.length} place(s); it may guard only the two file writes:\n  ` +
      guards.map(({ line }) => line.trim()).join('\n  ')
  );
  for (const { line, index } of guards) {
    // The write is on the guard's line or inside the short block it opens, so
    // the block is what gets read rather than the one line.
    const block = lines.slice(index, index + 6).join('\n');
    assert.match(
      block,
      /writeFileSync/,
      `"${line.trim()}" gates something other than writing a file — a dry run must do the same work`
    );
  }
});
