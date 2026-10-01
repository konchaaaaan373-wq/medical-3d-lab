import { CardiacOutputLessonScene } from './CardiacOutputLessonScene.js';

/**
 * Two views of one model. `#/cardiac-output` opens the introductory lesson;
 * `#/cardiac-output?view=detail` opens the full model, unchanged. Same catalogue
 * entry, same solver, same publication record — the view is which screen of it
 * a reader is on, not a different model (`src/app/router.js`, `viewOf`).
 *
 * The full model is a loader rather than an import: the lesson is the route's
 * first screen, and a reader of it does not download the full model's scene
 * until they ask for it.
 */
export const views = Object.freeze({
  detail: () => import('./CardiacOutputScene.js').then((module) => module.CardiacOutputScene),
});

export { CardiacOutputLessonScene as default, CardiacOutputLessonScene };
