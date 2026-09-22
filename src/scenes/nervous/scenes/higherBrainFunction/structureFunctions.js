import {
  FUNCTION_TASKS,
  functionsOfStructure,
} from '../../../../models/higherBrainFunction.js';
import { TASK_READOUT_LABELS } from '../../../../data/higherBrainFunction.js';

/**
 * What a structure a reader has just touched is for, in words a panel can show.
 *
 * ## Why this is a separate module, and why it lives here
 *
 * It joins two things that must not be joined in place. On one side is the
 * **anatomy scene**, which owns which mesh is which named structure and is a
 * pinned model source of a published card — editing it to add a sentence about
 * function would change that card's digest, make its revision stale and close
 * the scene the beta publishes. On the other side is the **higher cortical
 * function model**, which may not know what it is for. So the join lives here,
 * where neither has to move.
 *
 * It sits inside this scene's folder, and that is a delivery decision rather
 * than a tidiness one. `src/app/` is the application shell, and nothing in it
 * imports a medical model: the shell is loaded on every visit, so a static
 * import from there would put this model — a scene the release does not open —
 * into the bundle of a production build. It did, for one commit: the App chunk
 * grew by 34 kB and `Arcuate fasciculus` could be grepped out of a *published*
 * build. Reached through the scene's own loader instead, it is stripped by
 * `scripts/scene-loaders-plugin.js` with the rest of the scene.
 * `tests/anatomy-function-link.test.js` holds the shell to that.
 *
 * ## It is a reading, and it says whose reading it is
 *
 * Nothing here is a list of functions kept per structure. The answer comes
 * from destroying that one structure in the function model and solving, so it
 * is the same claim the pathology scene makes, made once. That also means it
 * inherits every limit that model has — one representative right-handed brain,
 * no time course, and no statement about any person — and the copy below says
 * so where a reader can see it.
 *
 * ## Two different answers, both worth showing
 *
 * "What runs through this" and "what is lost without this" are not the same
 * question, and the places they disagree are the interesting ones: one
 * hippocampus carries memory and takes none of it away when it goes, because
 * the other side is still there. A panel that printed only the second would
 * teach that the hippocampus is not a memory structure.
 */

/** The side the atlas selection reports, as the model writes it. */
const SIDE_FROM_SELECTION = { Left: 'left', Right: 'right', Midline: 'median' };

const shortLabel = (id) => TASK_READOUT_LABELS[id] ?? {
  label: FUNCTION_TASKS.find((task) => task.id === id)?.label ?? id,
  labelJa: FUNCTION_TASKS.find((task) => task.id === id)?.labelJa ?? id,
};

/**
 * @param {{atlasName?: string, name?: string, side?: string}|null} selection
 *   an anatomy selection as the scene publishes it
 * @returns {null | {
 *   title: string, titleJa: string,
 *   carries: {text: string, textJa: string},
 *   ifLost: {text: string, textJa: string},
 *   source: {text: string, textJa: string},
 * }}
 */
export function functionNoteForSelection(selection) {
  const label = selection?.atlasName ?? selection?.name;
  const side = SIDE_FROM_SELECTION[selection?.side];
  if (!label || !side) return null;

  const found = functionsOfStructure(label, side);
  // Most of the atlas is not in this model, and saying nothing is the right
  // answer for all of it. A panel section that appeared everywhere and said
  // "no function recorded" would read as a claim about the structure.
  if (!found.carries) return null;

  const names = found.tasks.map((task) => shortLabel(task.id));
  const lowered = [...found.ifLost.low, ...found.ifLost.intermediate].map(shortLabel);

  // No syndrome name here, and not because it would not fit: naming one from a
  // single destroyed structure is the diagnosis this model does not make. What
  // it can say is which declared routes stop reaching, and it says that.
  const ifLost = lowered.length === 0
    ? {
      text: 'This one structure gone leaves every declared route still reaching — the model has another way round.',
      textJa: 'この構造だけを失っても、宣言したどの経路も届きます（モデルには別の経路があります）。',
    }
    : {
      text: `This one structure gone, these routes stop reaching as well: ${lowered.map((task) => task.label).join(', ')}`,
      textJa: `この構造だけを失うと、次の経路が届きにくくなります：${lowered.map((task) => task.labelJa).join('・')}`,
    };

  return {
    title: 'What this structure is for',
    titleJa: 'この部位が関わる高次脳機能',
    carries: {
      text: `Routes through it: ${names.map((task) => task.label).join(', ')}`,
      textJa: `ここを通る課題：${names.map((task) => task.labelJa).join('・')}`,
    },
    ifLost,
    source: {
      text: 'Route availability read from the higher cortical function model — a representative '
        + 'right-handed brain. Not a syndrome, not a diagnosis, and not a lesion localiser.',
      textJa: '高次脳機能モデルから読んだ**経路の通りやすさ**です（代表的な右利きの脳）。'
        + '症候名でも診断でもなく、病巣同定にも使えません。',
    },
  };
}
