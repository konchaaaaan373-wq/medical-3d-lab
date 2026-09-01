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
 * puzzle. A clinical review carries the digest of what was actually reviewed,
 * so a review whose model has since changed reports itself as stale instead of
 * quietly continuing to look like a sign-off.
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
 * Which clinical reviews no longer describe the model they signed.
 *
 * A review pins a commit; the code moves on. `reviewedModelDigest` records what
 * the model looked like at the reviewed commit, so this compares two recorded
 * facts rather than shelling out to git — which matters, because CI checks out
 * shallow and the reviewed commit may not be there to ask about.
 *
 * A stale review is not automatically invalid. It is a review of something
 * else, and saying so is the whole point of a versioned attestation.
 *
 * @param {object[]} reviews the clinical-review registry
 * @param {object[]} revisions the revision registry
 * @param {(path: string) => string} read
 */
export function staleReviews(reviews, revisions, read) {
  const byScene = new Map(revisions.map((entry) => [entry.sceneId, entry]));
  const stale = [];

  for (const review of reviews) {
    if (review.reviewStatus !== 'reviewed') continue;
    const revision = byScene.get(review.sceneId);
    if (!revision) {
      stale.push({ sceneId: review.sceneId, reason: 'no revision entry for a reviewed scene' });
      continue;
    }
    if (!review.reviewedModelDigest) {
      stale.push({ sceneId: review.sceneId, reason: 'the review does not record what it reviewed' });
      continue;
    }
    const current = digestSources(revision.modelSources, read);
    if (current !== review.reviewedModelDigest) {
      stale.push({
        sceneId: review.sceneId,
        reason: 'the model has changed since it was reviewed',
        reviewed: review.reviewedModelDigest,
        current,
      });
    }
  }

  return stale;
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
