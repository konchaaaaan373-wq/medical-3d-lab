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
  //
  // A structure that only *modulates* is the exception: nothing routes through
  // the anterior thalamus in this model and it is not therefore a structure
  // with no part in language. It gets a note that says which of the two it is.
  if (!found.carries && !found.modulatesOnly) return null;

  const names = found.tasks.map((task) => shortLabel(task.id));
  const lowered = [...found.ifLost.low, ...found.ifLost.intermediate].map(shortLabel);
  const unsettled = found.ifLost.indeterminate.map(shortLabel);

  // No syndrome name here, and not because it would not fit: naming one from a
  // single destroyed structure is the diagnosis this model does not make. What
  // it can say is which declared routes stop reaching, and it says that.
  //
  // "Nothing came back lowered" and "every route was evaluated and still
  // reaches" are different sentences, and the first was being printed as the
  // second. When a task could not be settled at all, that is what is said.
  const stillReaching = unsettled.length === 0
    ? {
      text: 'This one structure gone leaves every declared route still reaching — the model has another way round.',
      textJa: 'この構造だけを失っても、宣言したどの経路も届きます（モデルには別の経路があります）。',
    }
    : {
      text: 'Nothing came back lowered — and these could not be evaluated at all, so "every route still '
        + `reaches" is not what that means: ${unsettled.map((task) => task.label).join(', ')}`,
      textJa: '下がったものはありませんでした。ただし次の課題は**評価そのものができていない**ので、'
        + `「どの経路も届く」という意味ではありません：${unsettled.map((task) => task.labelJa).join('・')}`,
    };
  const ifLost = lowered.length === 0
    ? stillReaching
    : {
      text: `This one structure gone, these routes stop reaching as well: ${lowered.map((task) => task.label).join(', ')}`,
      textJa: `この構造だけを失うと、次の経路が届きにくくなります：${lowered.map((task) => task.labelJa).join('・')}`,
    };

  // Involvement this model declares and does not put a number on. Separate
  // from `carries` on purpose: a reader must not take it for a computed one.
  const modulates = found.modulates.length === 0 ? null : {
    text: `Declared and not computed: ${found.modulates.map((network) => network.label).join(', ')}. `
      + found.modulates.map((network) => network.whatIsNotComputed).join(' '),
    textJa: `宣言していて計算していない関与：${found.modulates.map((network) => network.labelJa).join('・')}。`
      + found.modulates.map((network) => network.whatIsNotComputedJa).join(''),
  };

  // Declared by a task, and not a route that task may take for the stimulus it
  // is asked with. Kept, and kept apart: it is the answer to "why is this
  // structure lit and not in the list".
  const byIneligibleRoute = found.tasksByIneligibleRoute.length === 0 ? null : {
    text: 'Declared here by a route these tasks may not take for the stimulus they are asked with: '
      + found.tasksByIneligibleRoute.map((task) => shortLabel(task.id).label).join(', '),
    textJa: '次の課題は、**その刺激では使えない経路**によってここを通ると宣言しています（利用経路ではありません）：'
      + found.tasksByIneligibleRoute.map((task) => shortLabel(task.id).labelJa).join('・'),
  };

  return {
    title: 'What this structure is for',
    titleJa: 'この部位が関わる高次脳機能',
    carries: names.length === 0
      ? {
        text: 'No route of this model runs through it. That is not "no involvement" — see below.',
        textJa: 'このモデルのどの経路もここを通りません。「関与が無い」ということではありません（下記）。',
      }
      : {
        text: `Routes through it: ${names.map((task) => task.label).join(', ')}`,
        textJa: `ここを通る課題：${names.map((task) => task.labelJa).join('・')}`,
      },
    ifLost,
    modulates,
    byIneligibleRoute,
    source: {
      text: 'Route availability read from the higher cortical function model — a representative '
        + 'right-handed brain. Not a syndrome, not a diagnosis, and not a lesion localiser.',
      textJa: '高次脳機能モデルから読んだ**経路の通りやすさ**です（代表的な右利きの脳）。'
        + '症候名でも診断でもなく、病巣同定にも使えません。',
    },
  };
}
