/**
 * Model-card and review-attestation versioning.
 *
 * The project's central promise is that a medical claim is traceable: a model
 * card says what a model answers, an evidence dossier says where the numbers
 * came from, and a clinical review signs a specific commit. All three describe
 * a piece of source code, and none of them notices when that code changes.
 *
 * That gap is the one that matters most. A model card describing a model that
 * has since been rewritten is not out of date in the harmless sense — it is a
 * medical statement about software that no longer behaves that way, published
 * under a review somebody's name is on.
 *
 * So each card declares which sources it describes and a digest of them.
 * `tests/model-revisions.test.js` recomputes the digest, and a medical change
 * that leaves the card untouched fails CI with an instruction rather than a
 * puzzle.
 *
 * **This is not the same obligation as review staleness**, which
 * `src/catalog/clinicalReview.js` owns through the registry's `stalePaths`.
 * That one asks "does this attestation still describe the code, and may it
 * still be shown as current?" This one asks "does the *card* still describe
 * the model?" A review can be correctly marked stale while its card is fine,
 * and a card can be out of date under a review that was never current. Two
 * questions, two mechanisms, and neither is a copy of the other.
 *
 * Pure apart from an injected reader, so the whole rule set is testable.
 */
import crypto from 'node:crypto';

/**
 * The digest of a set of source files.
 *
 * Content only — not paths, not mtimes — so moving a file without changing it
 * does not read as a medical change, and changing it without moving it does.
 * Ordered by path so the result does not depend on how the list was written.
 *
 * @param {string[]} paths repository-relative
 * @param {(path: string) => string} read
 */
export function digestSources(paths, read) {
  const hash = crypto.createHash('sha256');
  for (const path of [...paths].sort()) {
    hash.update(read(path), 'utf8');
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 16);
}

/** Fields every revision entry must carry. */
const REQUIRED = ['sceneId', 'card', 'modelSources', 'cardRevision', 'modelDigest'];

/**
 * Everything wrong with the revision registry, as readable lines.
 *
 * The shape `validateCatalog` and `validateLegal` already use: returned rather
 * than thrown, so the test suite and a maintenance script share one function.
 *
 * @param {object[]} entries
 * @param {(path: string) => string} read
 * @param {{ sceneIds?: Set<string> }} [options]
 */
export function revisionProblems(entries, read, { sceneIds } = {}) {
  const problems = [];
  const seen = new Set();

  for (const entry of entries) {
    const where = `revision "${entry.sceneId ?? '(no scene)'}"`;

    for (const field of REQUIRED) {
      if (entry[field] == null) problems.push(`${where}: missing "${field}"`);
    }
    if (seen.has(entry.sceneId)) problems.push(`${where}: duplicate entry`);
    seen.add(entry.sceneId);

    if (sceneIds && entry.sceneId && !sceneIds.has(entry.sceneId)) {
      problems.push(`${where}: not a registered scene`);
    }
    if (!Array.isArray(entry.modelSources) || entry.modelSources.length === 0) {
      problems.push(`${where}: declares no model sources`);
      continue;
    }
    if (!Number.isInteger(entry.cardRevision) || entry.cardRevision < 1) {
      problems.push(`${where}: cardRevision must be a positive integer`);
    }

    let current;
    try {
      current = digestSources(entry.modelSources, read);
    } catch (error) {
      problems.push(`${where}: cannot read a declared source — ${error.message}`);
      continue;
    }

    if (current !== entry.modelDigest) {
      problems.push(
        `${where}: the model changed but the card was not revised. ` +
          `Update ${entry.card}, then run \`npm run revisions:adopt\` to record ` +
          `revision ${entry.cardRevision + 1} and digest ${current}.`
      );
    }

    try {
      read(entry.card);
    } catch {
      problems.push(`${where}: model card "${entry.card}" does not exist`);
    }
  }

  return problems;
}

/**
 * The registry as it would be after adopting the current sources.
 *
 * Used by `npm run revisions:adopt`. It bumps `cardRevision` only where the
 * digest actually moved — a revision number that goes up when nothing changed
 * teaches everyone to ignore it.
 *
 * @param {object[]} entries
 * @param {(path: string) => string} read
 * @param {{ today?: string }} [options]
 */
export function adoptRevisions(entries, read, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const changed = [];
  const next = entries.map((entry) => {
    const current = digestSources(entry.modelSources, read);
    if (current === entry.modelDigest) return entry;
    changed.push({ sceneId: entry.sceneId, from: entry.modelDigest, to: current });
    return {
      ...entry,
      cardRevision: entry.cardRevision + 1,
      modelDigest: current,
      cardUpdatedAt: today,
    };
  });
  return { entries: next, changed };
}
