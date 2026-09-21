/**
 * Everything the video export says, in both languages.
 *
 * The rules are in `src/app/videoExport.js` and the sentences are here, keyed
 * by the ids that module returns. Neither half can drift: a clause with no
 * copy and a sentence with no clause are both test failures
 * (`tests/video-export.test.js`).
 *
 * The tone is the product's own — say what the file is and what it is not,
 * once, without hedging. A consent screen nobody reads is a consent screen
 * that failed, so each clause is one sentence.
 */

/** The dialog's own chrome: headings, buttons, states. */
export const VIDEO_EXPORT_COPY = Object.freeze({
  title: { en: 'Before you download this video', ja: '動画を保存する前に' },
  intro: {
    en: 'The file leaves the app. What it shows is a teaching model of a disease, and the screen that explains it does not travel with the file — so the terms come first.',
    ja: 'ファイルはアプリの外に出ます。中身は疾患の教育用モデルで、それを説明している画面は一緒には付いていきません。だから先に条件を示します。',
  },
  clausesHeading: { en: 'What you are agreeing to', ja: '同意していただくこと' },
  contentsHeading: { en: 'What the file contains', ja: 'ファイルに入るもの' },
  agree: { en: 'Agree and download', ja: '同意して保存' },
  cancel: { en: 'Cancel', ja: 'やめる' },
  blocked: {
    en: 'Tick every line above to continue.',
    ja: '上のすべてにチェックを入れると保存できます。',
  },
  recording: { en: 'Recording…', ja: '録画中…' },
  saved: { en: 'Saved', ja: '保存しました' },
  download: { en: 'Download video', ja: '動画を保存' },
  failedShort: { en: 'Not saved', ja: '保存できません' },
  failed: {
    en: 'The recording did not finish, and no file was written.',
    ja: '録画が最後まで進まず、ファイルは書き出されていません。',
  },
  unsupported: {
    en: 'This browser cannot record the canvas, so no file can be written here. Chrome, Edge and Firefox can.',
    ja: 'このブラウザはキャンバスの録画に対応していないため、ここではファイルを書き出せません。Chrome・Edge・Firefox では保存できます。',
  },
  termsLink: { en: 'Terms of use', ja: '利用規約' },
});

/**
 * What the reader ticks, one sentence each.
 *
 * `{uses}` and `{credits}` are filled from the clause's own details — the
 * profile's prohibited uses and the asset manifest's credit lines — so the
 * sentence cannot claim a scope the records do not.
 */
export const VIDEO_CLAUSE_COPY = Object.freeze({
  'model-not-patient': {
    en: 'This is a conceptual model built to teach a mechanism. It is not imaging, not a recording of a patient, and it represents nobody in particular.',
    ja: 'これは仕組みを伝えるために作った概念モデルです。画像検査でも、患者さんの記録でもなく、特定の誰かを表してもいません。',
  },
  'prohibited-uses': {
    en: 'Downloading changes nothing about what the model may be used for. It stays outside {uses}.',
    ja: 'ダウンロードしても、このモデルの使ってよい範囲は変わりません。{uses}には使えません。',
  },
  'keep-the-caption': {
    en: 'The caption burnt into the frame says what the model is and what it does not show. Keep it in view — do not crop or cover it.',
    ja: '映像に焼き込まれたキャプションが、このモデルが何であり何を示していないかを述べています。切り取ったり隠したりせず、見える状態のままにしてください。',
  },
  'carry-the-credit': {
    en: 'The geometry carries a licence that asks for credit. Carry it with the video: {credits}',
    ja: '形状には表示を求めるライセンスが付いています。動画と一緒に次のクレジットを掲示してください: {credits}',
  },
});

/**
 * The prohibited-use vocabulary as a phrase a reader can act on.
 *
 * First UI surface for `PROHIBITED_USE`. Written to be read inside the
 * "prohibited-uses" sentence above, as a list, which is why each entry is a
 * noun phrase rather than a sentence.
 */
export const PROHIBITED_USE_COPY = Object.freeze({
  diagnosis: { en: 'making a diagnosis', ja: '診断' },
  'treatment-selection': { en: 'choosing a treatment', ja: '治療の選択' },
  'dose-selection': { en: 'setting a dose', ja: '用量の決定' },
  prognosis: { en: 'predicting an outcome', ja: '予後の予測' },
  'procedure-planning': { en: 'planning a procedure', ja: '手技や手術の計画' },
});

/** What goes in the file, said plainly, because the frame is not the whole app. */
export const VIDEO_CONTENTS_COPY = Object.freeze([
  {
    id: 'sequence',
    en: 'The 15-second sequence as it plays on screen, in the frame shape you chose.',
    ja: '画面で再生されている 15 秒のシーケンスを、選んだ画面比で収めます。',
  },
  {
    id: 'captions',
    en: 'Its captions and figures, drawn into the picture rather than laid over it.',
    ja: '字幕と数値は、上に重ねるのではなく映像そのものに描き込みます。',
  },
  {
    id: 'provenance',
    en: 'A footer naming the model and the sentence that bounds it, on every frame.',
    ja: 'モデル名と、その範囲を述べる 1 文のフッターを全フレームに入れます。',
  },
  {
    id: 'silent',
    en: 'No audio, and nothing about you: the file is made in your browser and is not uploaded.',
    ja: '音声は入らず、あなたに関する情報も入りません。ファイルはブラウザ内で作られ、送信されません。',
  },
]);

/** Joins a list the way each language does. */
export const joinList = (items, language) =>
  language === 'ja' ? items.join('、') : items.length > 1
    ? `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`
    : (items[0] ?? '');

/**
 * One clause's sentence, with its details interpolated.
 *
 * @param {{ id: string, details?: string[] }} clause
 * @param {'en'|'ja'} language
 * @returns {string}
 */
export function clauseSentence(clause, language) {
  const copy = VIDEO_CLAUSE_COPY[clause?.id];
  if (!copy) return '';
  const details = clause.details ?? [];
  const uses = joinList(
    details.map((id) => PROHIBITED_USE_COPY[id]?.[language] ?? id),
    language
  );
  return copy[language]
    .replace('{uses}', uses)
    .replace('{credits}', details.join(' / '));
}
