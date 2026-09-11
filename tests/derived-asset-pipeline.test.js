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

    // Both counts are recorded, and they differ by exactly what was pruned —
    // a reader of this record must never have to guess which side a number is.
    const pruned = file.removedZeroAreaTriangles + file.removedDuplicateFaces;
    assert.equal(
      file.sourceCounts.triangles - file.derivedCounts.triangles,
      pruned,
      `${where}: the recorded source and derived triangle counts do not differ by the ${pruned} pruned`,
    );
    assert.equal(file.sourceCounts.vertices, file.derivedCounts.vertices, `${where}: the vertex count changed`);
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
