/**
 * Where a disease model's 「解剖を確認」 goes: the anatomy of the organ it is
 * about.
 *
 * BYOKI MOTION puts the anatomy behind the disease models (ADR 2026-09-30):
 * a reader in 心拍出量 who wants to know which chamber is which presses
 * 「心臓の解剖を確認」 and lands on the heart's named structures. That link is
 * read off the catalogue — the model's organ(s), and the anatomy scenes filed
 * under them — so a new disease model gets it without a line of its own, and
 * an organ whose anatomy is not open simply has no link.
 *
 * Scenes already paired by `relatedScenes` are left out: the title card shows
 * that pairing in its own words (「この病態が起きる場所の解剖」), and the same
 * link twice is two doors onto one room.
 *
 * Pure: whether a link may be *shown* is the release gate's question, asked
 * by the caller (`sceneOpen`), not here.
 */
import { SCENES, organById, relatedScenesFor } from './index.js';
import { isPathologyModelScene } from './pathologyModels.js';

/**
 * @param {object|null|undefined} scene a catalogue entry
 * @param {ReadonlyArray<object>} [scenes]
 * @returns {Array<{ scene: object, organ: {label: string, labelJa: string}|null }>}
 */
export function anatomyChecksFor(scene, scenes = SCENES) {
  if (!scene || !isPathologyModelScene(scene)) return [];
  const organs = new Set([scene.organ, ...(scene.organs ?? [])].filter(Boolean));
  const paired = new Set(relatedScenesFor(scene.id).map((related) => related.id));
  return scenes
    .filter(
      (candidate) =>
        candidate.id !== scene.id &&
        organs.has(candidate.organ) &&
        !isPathologyModelScene(candidate) &&
        candidate.status !== 'prototype' &&
        !paired.has(candidate.id)
    )
    .map((candidate) => ({ scene: candidate, organ: organById(candidate.organ) ?? null }));
}
