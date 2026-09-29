import { CardiacOutputLessonScene } from './CardiacOutputLessonScene.js';
import { CardiacOutputScene } from './CardiacOutputScene.js';

/**
 * Two views of one model. `#/cardiac-output` opens the introductory lesson;
 * `#/cardiac-output?view=detail` opens the full model, unchanged. Same catalogue
 * entry, same solver, same publication record — the view is which screen of it
 * a reader is on, not a different model (`src/app/router.js`, `viewOf`).
 */
export const views = Object.freeze({ detail: CardiacOutputScene });

export { CardiacOutputLessonScene as default, CardiacOutputLessonScene, CardiacOutputScene };
