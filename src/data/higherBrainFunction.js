/**
 * Copy, colours and controls for the higher-cortical-function scene.
 *
 * Two things have to stay apart here, and the whole scene turns on keeping them
 * apart. What the model solves is **which routes still carry** after a lesion.
 * What a reader arrives wanting is a **syndrome name** — Broca's, conduction,
 * neglect — and the names are the easiest thing in neurology to memorise
 * without understanding. So the read-out prints the tasks first and the name
 * last, and the scope panel says in as many words that the name is a reading of
 * the pattern rather than a thing the lesion contains.
 *
 * Every anatomical name here is also in the atlas. Nothing in this file may
 * name a structure the model does not point at.
 */

export const PALETTE = {
  tissue: '#cbb6a6',
  executive: '#86b74a',
  language: '#e8a13c',
  visual: '#5f93c8',
  praxis: '#54b6a4',
  attention: '#b483d8',
  memory: '#d56f8f',
  tract: '#f2e4c4',
  lesion: '#e3483f',
  carrying: '#ffe9a8',
  blocked: '#7b3f3a',
};

export const LEGEND = [
  { key: 'language', label: 'Language network, dominant hemisphere', labelJa: '言語のネットワーク（優位半球）' },
  { key: 'visual', label: 'Visual route into language', labelJa: '言語へ入る視覚の経路' },
  { key: 'praxis', label: 'Praxis — knowing how a tool is used', labelJa: '行為（道具の使い方の図式）' },
  { key: 'attention', label: 'Spatial attention, non-dominant hemisphere', labelJa: '空間性注意（非優位半球）' },
  { key: 'memory', label: 'Memory circuit', labelJa: '記憶の回路' },
  { key: 'executive', label: 'Frontal–subcortical circuits', labelJa: '前頭葉–皮質下の回路' },
  { key: 'tract', label: 'The tract a step runs in', labelJa: 'その段階が通る線維束' },
  { key: 'lesion', label: 'The lesion', labelJa: '病変' },
  { key: 'carrying', label: 'The task getting through', labelJa: '課題の信号が通っているところ' },
  { key: 'blocked', label: 'Where it stops', labelJa: '信号が止まるところ' },
];

/**
 * The axis is **how far the lesion has been taken**, and nothing else.
 *
 * Not time, not recovery, and not severity of a syndrome. Which lesion, and
 * which task is being traced, are model controls: they are arrangements, and
 * nothing here says one becomes another.
 */
export const STAGES = [
  {
    id: 'intact',
    name: 'Nothing is damaged, and every route carries',
    nameJa: '病変がなく、すべての経路が通っている',
    at: 0,
    focus: ['language', 'carrying'],
    summary:
      'A task is a route through named structures. Watch one get through before taking anything away: hearing a word, analysing it, planning the sounds, saying them.',
    summaryJa:
      '1 つの課題は、名前の付いた構造を通る 1 本の経路です。何かを失う前に、通っているところを見てください——語を聞き、音韻を分析し、音を計画し、発声する。',
  },
  {
    id: 'partial',
    name: 'Part of the route is gone',
    nameJa: '経路の一部が失われる',
    at: 0.5,
    focus: ['lesion', 'carrying'],
    summary:
      'A route is no better than its worst step. With the lesion half taken, tasks that share the damaged step weaken together, and tasks that avoid it do not weaken at all.',
    summaryJa:
      '経路は、その中で最も弱い段階以上には良くなりません。病変が半分のとき、その段階を共有する課題はそろって弱くなり、そこを通らない課題はまったく弱くなりません。',
  },
  {
    id: 'complete',
    name: 'The step is gone, and the pattern has a name',
    nameJa: '段階が失われ、その組み合わせに名前がつく',
    at: 1,
    focus: ['blocked', 'lesion'],
    summary:
      'Which tasks survive is the finding. The syndrome name at the bottom of the read-out is a reading of that pattern — it is not stored anywhere, and changing the routes changes it.',
    summaryJa:
      '所見は「どの課題が残ったか」です。読み取り欄の最後にある症候名は、その組み合わせを読んだ結果であって、どこかに保存されているものではありません。経路を変えれば名前も変わります。',
  },
];

export const RANGE = {
  start: 'Nothing damaged', startJa: '病変なし',
  end: 'The site taken completely', endJa: '病変が完成',
};

export const PROGRESS_LABEL = {
  label: 'How far the lesion has been taken',
  labelJa: '病変がどこまで広がったか',
};

/**
 * Japanese names for the structures the atlas labels in English only.
 *
 * The atlas adapter (`src/data/brainAnatomy.js`) carries a Japanese name for
 * every structure the **anatomy** scene can select, and the tract meshes are
 * not among them: no scene has ever drawn them. They are named here rather than
 * there because that file is a pinned model source of the published brain
 * anatomy card, and adding a name to it would make the card revision — and with
 * it the beta's publication decision — stale.
 *
 * `tests/higher-brain-function-anatomy.test.js` checks that every structure the
 * model names can be labelled from one of the two.
 */
export const STRUCTURE_NAMES_JA = {
  'Arcuate fasciculus': '弓状束',
  'Superior longitudinal fasciculus I': '上縦束 I',
  'Superior longitudinal fasciculus II': '上縦束 II',
  'Superior longitudinal fasciculus III': '上縦束 III',
  'Inferior longitudinal fasciculus': '下縦束',
  'Middle longitudinal fasciculus': '中縦束',
  'Inferior fronto-occipital fasciculus': '下前頭後頭束',
  'Uncinate fasciculus': '鉤状束',
  'Frontal aslant tract': '前頭斜走路',
  'Optic radiation': '視放線',
  'Acoustic radiation': '聴放線',
  'Corticospinal tract': '皮質脊髄路',
  'Corticobulbar tract': '皮質延髄路',
  'Corticostriatal tract (anterior)': '皮質線条体路（前方）',
  'Corticostriatal tract (posterior)': '皮質線条体路（後方）',
  'Corticostriatal tract (superior)': '皮質線条体路（上方）',
  'Anterior thalamic radiation': '前視床放線',
};

/**
 * What each lesion site is, in the words a reader needs beside the anatomy.
 *
 * Keyed by the model's site ids. **No entry here names the deficit its site
 * produces** — that is what the model is for, and writing it here would let the
 * two disagree. What they carry is what the lesion *is*, and what usually
 * causes one.
 */
export const LESION_NOTES = {
  'dominant-inferior-frontal': {
    text: "Plans the sounds of a word; holds no meaning.",
    textJa: '語の**音**を組み立てる段階。意味を蓄える場所ではありません。',
  },
  'dominant-posterior-superior-temporal': {
    text: "Where a heard word is analysed as sound.",
    textJa: '聞こえた語を**音韻として分析する**段階。',
  },
  'dominant-arcuate': {
    text: "A bundle of fibres, with the cortex at both ends left alone.",
    textJa: '**線維束だけ**が切れ、両端の皮質は残ります。',
  },
  'dominant-perisylvian': {
    text: "Both ends of the language network and the fibres between them.",
    textJa: '言語ネットワークの**両端**と、その間の線維の両方。',
  },
  'dominant-anterior-watershed': {
    text: "The border zone in front; perisylvian cortex spared.",
    textJa: '前方の境界領域。シルビウス裂周囲の皮質は**保たれます**。',
  },
  'dominant-posterior-watershed': {
    text: "The border zone behind; perisylvian cortex spared.",
    textJa: '後方の境界領域。シルビウス裂周囲の皮質は**保たれます**。',
  },
  'dominant-angular': {
    text: "Where vision, language, number and the body schema meet.",
    textJa: '視覚・言語・数・身体図式が**交差する**場所。',
  },
  'dominant-occipital-and-callosum': {
    text: "This hemisphere cannot see; what the other sees cannot cross.",
    textJa: '**この半球は見えず**、もう一方が見たものは**渡れません**。',
  },
  'nondominant-parietal': {
    text: "The mirror image of the lesion that produces aphasia.",
    textJa: '失語を起こす病変の、**反対側の鏡像**。',
  },
  'corpus-callosum': {
    text: "Each hemisphere intact; neither can tell the other what it has.",
    textJa: '**各半球は無傷**で、互いに持っているものを伝えられません。',
  },
  'bilateral-medial-temporal': {
    text: "One of them would have been enough.",
    textJa: '**片側だけなら足りていました**。',
  },
  'bifrontal-dorsolateral': {
    text: 'The convexity in front of the premotor cortex, on both sides.',
    textJa: '運動前野より前の凸面を、両側とも。',
  },
  'orbitofrontal-cortex': {
    text: 'The under-surface of the frontal lobes. Language and movement are nowhere near it.',
    textJa: '前頭葉の下面。**言語も運動もここにはありません**。',
  },
  'thalamocortical-disconnection': {
    text: 'The fibres the circuits close through. No frontal cortex is damaged at all.',
    textJa: '回路が環を閉じる線維。**前頭葉の皮質はどこも壊れていません**。',
  },
  'striatum-head': {
    text: 'Deep grey, not cortex — and the circuits pass through it.',
    textJa: '皮質ではなく深部灰白質。**回路がここを通ります**。',
  },
};

/**
 * Short names for the read-out, one per task.
 *
 * The model's own labels are the clinical ones and they are long — "using a
 * tool with the left hand (imitation and pantomime)" is what the task is, and
 * it is the right name for it in the model and in the controls. The read-out
 * has thirteen rows in one narrow column, where that label arrives clipped to
 * its first few characters and says nothing at all. So the panel gets a short
 * form, and `tests/higher-brain-function-model.test.js` fails if a task has
 * none.
 */
export const TASK_READOUT_LABELS = {
  'auditory-comprehension': { label: 'Comprehension', labelJa: '聴覚的理解' },
  repetition: { label: 'Repetition', labelJa: '復唱' },
  'speech-fluency': { label: 'Fluency', labelJa: '流暢性' },
  'propositional-speech': { label: 'Speech with content', labelJa: '発話の内容' },
  naming: { label: 'Naming', labelJa: '呼称' },
  reading: { label: 'Reading', labelJa: '読字' },
  writing: { label: 'Writing', labelJa: '書字' },
  'calculation-and-body-schema': { label: 'Calculation, fingers, L/R', labelJa: '計算・手指・左右' },
  'praxis-right-hand': { label: 'Right-hand praxis', labelJa: '右手の行為' },
  'praxis-left-hand': { label: 'Left-hand praxis', labelJa: '左手の行為' },
  'attention-left-space': { label: 'Attention, left', labelJa: '左空間の注意' },
  'attention-right-space': { label: 'Attention, right', labelJa: '右空間の注意' },
  'episodic-memory-formation': { label: 'New memory', labelJa: '記憶の形成' },
  'set-shifting-and-planning': { label: 'Executive', labelJa: '遂行機能' },
  'behavioural-inhibition': { label: 'Inhibition', labelJa: '行動の抑制' },
  'initiation-and-drive': { label: 'Drive', labelJa: '発動性' },
};

/**
 * How each task is tested at the bedside, in the words a clinician would use.
 *
 * These were in the model, and they are copy: `src/models/README.md` rule 6
 * says a model may not carry any. What is medical about a task — the structures
 * it needs, in order — stays there; the sentence somebody says out loud is here.
 */
export const TASK_PROBES = {
  'auditory-comprehension': { text: 'Point to the one I name.', textJa: '「言った物を指してください」' },
  repetition: { text: 'Say after me.', textJa: '「私のあとに続けて言ってください」' },
  'speech-fluency': {
    text: 'Does speech come out, at length and without effort?',
    textJa: '発話が努力なく、まとまった長さで出てくるか',
  },
  'propositional-speech': { text: 'Tell me what happened.', textJa: '「何があったか話してください」' },
  naming: { text: 'What is this called?', textJa: '「これは何ですか」' },
  reading: { text: 'Read this out, and tell me what it says.', textJa: '「これを読んで、意味を教えてください」' },
  writing: { text: 'Write this sentence.', textJa: '「この文を書いてください」' },
  'calculation-and-body-schema': {
    text: 'Take 7 from 100. Which is your left thumb?',
    textJa: '「100 から 7 を引いてください」「左手の親指はどれですか」',
  },
  'praxis-right-hand': { text: 'Show me how you would use a comb.', textJa: '「櫛を使うまねをしてください」' },
  'praxis-left-hand': { text: 'Now the same thing with the other hand.', textJa: '「同じことを反対の手でしてください」' },
  'attention-left-space': { text: 'Cross out every line on the page.', textJa: '「紙の上の線を全部消してください」' },
  'attention-right-space': { text: 'The same page, on the other side.', textJa: '同じ課題の反対側' },
  'episodic-memory-formation': {
    text: 'Three words now; I will ask again in five minutes.',
    textJa: '「3 つの単語を覚えてください。5 分後に聞きます」',
  },
  'set-shifting-and-planning': {
    text: 'Sort by colour — now by shape, without being told the rule.',
    textJa: '「色で分けてください」——次に規則を告げずに「形で分けてください」',
  },
  'behavioural-inhibition': {
    text: 'Tap once when I tap twice, and not at all when I tap once.',
    textJa: '「私が 2 回叩いたら 1 回、1 回叩いたら叩かないでください」',
  },
  'initiation-and-drive': {
    text: 'Left alone in the room, does anything get started?',
    textJa: '一人にしたとき、自分から何かを始めるか',
  },
};

/**
 * The tasks a reader can trace through the brain, and why not all of them.
 *
 * Every task the model solves is on the read-out — the pattern of what survives
 * is the finding, and dropping rows from it would hide the finding. Tracing is
 * a different job: it draws one route across the model, and the control for it
 * is a button per task on a panel that sits over the brain it is about. Seven
 * buttons cover every network in the model and every route a reader needs to
 * follow; thirteen covered the model.
 */
export const TRACEABLE_TASKS = Object.freeze([
  'auditory-comprehension',
  'repetition',
  'speech-fluency',
  'naming',
  'reading',
  'praxis-left-hand',
  'attention-left-space',
  'episodic-memory-formation',
  'set-shifting-and-planning',
  'initiation-and-drive',
]);

export const MODEL_CONTROLS_COPY = {
  label: 'A lesion, and a task to try',
  labelJa: '病変と、試す課題',
  hint: 'Neither is a degree. The lesion decides which structures are gone; the task decides which route is traced through what is left.',
  hintJa: 'どちらも段階ではありません。病変は「どの構造が失われるか」を、課題は「残った中のどの経路を辿るか」を決めます。',
  // Not primary. Declaring it keeps every read-out row on a phone, and thirteen
  // qualitative rows in a 190px rail wrap 「保たれる」 down four lines each. The
  // pattern of surviving tasks is read on a wider window; the phone keeps the
  // one row that is the finding.
  primary: false,
};

export const MODEL_SCOPE = {
  question:
    'Why does a lesion of one size take away one set of higher functions and not another?',
  questionJa:
    '同じ大きさの病変でも、失われる高次脳機能がなぜ場所によって違うのか。',
  answers: [
    {
      text: '**That a task is a route, and a route is no better than its worst step.** Each clinical task — repeating, understanding, naming, reading, writing, using a tool, attending to one side, laying down a memory — is declared as the named structures it has to pass through, in order.',
      textJa:
        '**1 つの課題は 1 本の経路であり、経路はその中で最も弱い段階以上には良くならない**こと。復唱・理解・呼称・読字・書字・道具使用・片側への注意・記憶の形成という各課題が、通過すべき構造の並びとして宣言されています。',
    },
    {
      text: '**That the syndromes are readings of the pattern, not causes of it.** Nothing in the model stores "conduction aphasia". Cut the dorsal route between the posterior superior temporal gyrus and the inferior frontal gyrus, and repetition fails while comprehension and fluency do not — because repetition is the one task whose route uses it.',
      textJa:
        '**症候名は、その組み合わせを読んだ結果であって原因ではない**こと。モデルは「伝導失語」をどこにも保存していません。上側頭回後部と下前頭回をつなぐ背側経路（弓状束）を切ると、理解と流暢性は保たれたまま復唱だけが落ちます——復唱だけがその経路を使うからです。',
    },
    {
      text: '**That handedness is an assumption, and it is stated.** This is the representative right-handed case: language on the left, praxis with it, and spatial attention on the right. The last one is why the same parietal lesion gives aphasia on one side and neglect on the other.',
      textJa:
        '**利き手は仮定であり、それを明示している**こと。ここでは代表的な右利きの場合を扱います——言語は左、行為も左、空間性注意は右。最後の 1 つがあるために、同じ頭頂葉の病変が片側では失語を、反対側では無視を起こします。',
    },
    {
      text: '**That a behaviour can be lost without its cortex being touched.** The three frontal–subcortical circuits — dorsolateral, orbitofrontal, medial — run cortex → striatum → pallidum → thalamus → back, and a lesion anywhere along one reads like a lesion of the cortex it starts from. It is why a small deep infarct can present as a frontal syndrome.',
      textJa:
        '**その皮質に触れなくても、行動が失われうる**こと。背外側・眼窩前頭・内側前頭の 3 つの前頭葉–皮質下回路は「皮質 → 線条体 → 淡蒼球 → 視床 → 同じ皮質」と一周し、**どこで切れても**その皮質を損傷したのと同じ読みになります。小さな深部梗塞が前頭葉症状として現れうる理由です。',
    },
    {
      text: '**Where a route fails, not only that it failed.** The view traces the task through the atlas and stops the signal at the step that stopped it.',
      textJa:
        '**どこで経路が途切れたか**（途切れたという事実だけでなく）。課題の信号をアトラスの上で辿り、止めた段階で止めて見せます。',
    },
  ],
  excludes: [
    {
      text: '**Every quality of speech.** There is no paraphasia here, no agrammatism, no prosody, no dysarthria and no perseveration. The model says whether a route carries, never what comes out of it — so it cannot tell fluent-but-empty speech from fluent-and-normal speech except by which routes are gone.',
      textJa:
        '**発話の質のすべて。** 錯語も失文法も韻律も構音障害も保続もありません。本模型は「経路が通っているか」だけを述べ、**何が出てくるか**は述べません。そのため、流暢だが内容のない発話と正常な発話を、経路の違い以外では区別できません。',
    },
    {
      text: '**Any course over time.** No oedema, no penumbra, no diaschisis, no recovery and no rehabilitation. How far the lesion has been taken is an input on a slider, never a prediction about a day, a week or a year.',
      textJa:
        '**時間経過のすべて。** 浮腫も、ペナンブラも、機能解離（diaschisis）も、回復も、リハビリテーションもありません。病変の広がりはスライダーで与える**入力**であって、何日後・何週後・何年後かの予測ではありません。',
    },
    {
      text: '**Anybody’s brain.** The atlas is one normal specimen, and the lesions are drawn on it as whole named structures. It is not an imaging study, it has no lesion of any real person in it, and it must not be used to localise one.',
      textJa:
        '**特定の誰かの脳。** アトラスは 1 体の正常標本で、病変は名前の付いた構造まるごととして置かれています。画像検査ではなく、実在する人の病巣は入っておらず、**病巣同定に用いてはなりません**。',
    },
    {
      text: '**Anything behavioural the circuits do not carry.** Executive function is here *as the frontal–subcortical circuits*, because those are routes. Mood, personality, insight, social cognition and anything a scale would score are not routes, and are not here.',
      textJa:
        '**回路が運んでいない行動面のすべて。** 遂行機能は**前頭葉–皮質下回路として**入れています——回路は経路だからです。気分・人格・病識・社会的認知、そして尺度で点数化するようなものは経路ではなく、ここにはありません。',
    },
  ],
  cautions: [
    {
      text: '**Left-handedness is not the mirror image of this.** The model refuses any handedness but right rather than flipping the brain: most left-handers are also left-dominant for language, and the minority who are not are split between right-dominant and bilateral.',
      textJa:
        '**左利きはこの鏡像ではありません。** 本模型は右利き以外の利き手を受け付けず、脳を裏返すことを拒みます——左利きの多くも言語は左優位で、そうでない少数派は右優位と両側性に分かれます。',
    },
    {
      text: '**Naming failing is not always aphasia.** When the lesion is at the visual end, the name was never reached. The model reads *where* the route broke before it calls anything anomic, and with the dominant occipital lobe and the callosum gone it reports the reading failure instead.',
      textJa:
        '**呼称ができないこと＝失語、ではありません。** 病変が視覚側にあるときは、そもそも語に到達していません。本模型は「経路のどこで切れたか」を読んでから健忘失語と呼ぶかどうかを決め、優位半球後頭葉＋脳梁の例では失語ではなく**読字の遮断**として報告します。',
    },
    {
      text: '**The atlas has no splenium and no somatotopy.** The corpus callosum is one mesh, so a lesion of its posterior fifth is drawn as a lesion of the whole; and the precentral gyrus is one mesh, so a lesion there takes the mouth and the hand together. Both are limits of the substrate, and both are why some real dissociations — pure alexia sparing object naming above all — do not appear here.',
      textJa:
        '**このアトラスには膨大部も体部位局在もありません。** 脳梁は 1 つのメッシュなので、後方 1/5 の病変も全体の病変として描かれます。中心前回も 1 つなので、そこの病変は口と手を同時に奪います。どちらも土台の限界であり、実際には見られる解離——とくに純粋失読で物品呼称が保たれること——がここに出てこない理由です。',
    },
    {
      text: '**The three prefrontal pictures are cleaner here than in a person.** The circuits are anatomically separate; the syndromes named after them are not. Real lesions rarely respect one circuit, and apathy, disinhibition and dysexecutive features commonly arrive together.',
      textJa:
        '**3 つの前頭葉症状は、実際の患者よりもここでは分離して見えます。** 回路は解剖学的に分かれていますが、その名を冠した症候群は分かれていません。実際の病変が 1 つの回路だけを侵すことは稀で、アパシー・脱抑制・遂行機能障害はしばしば同時に現れます。',
    },
    {
      text: '**Thresholds are where a line was drawn, not where one was measured.** Intact / impaired / lost are three steps on a dimensionless 0–1 transmission. Nothing here is a score, a severity scale or a test result, and two lesions adding up to a failure is a statement about routes, not about a number of points.',
      textJa:
        '**しきい値は「線を引いた場所」であって「測った場所」ではありません。** 保たれる／低下／消失は、無次元の 0–1 の伝達量を 3 段階に切ったものです。これは点数でも重症度尺度でも検査結果でもなく、2 つの病変が足し合わさって破綻するというのも**経路についての主張**であって点数の話ではありません。',
    },
  ],
  sources: [
    {
      kind: 'geometry',
      text: 'Geometry: the Z-Anatomy / BodyParts3D specimen atlas redistributed unchanged (`brain-atlas-glb`), including the tract meshes no scene had drawn before this one.',
      textJa:
        'ジオメトリ：Z-Anatomy / BodyParts3D 由来の標本アトラスをそのまま再配布したもの（`brain-atlas-glb`）。本シーンで初めて描画する線維束メッシュを含みます。',
    },
    {
      kind: 'model',
      text: 'Network: the classical connectionist account of the higher cortical functions — the perisylvian language network and its dorsal and ventral routes, the parietal praxis and attention systems, the hippocampal–fornix–mamillary–anterior thalamic circuit, and the frontal–subcortical circuits of Alexander, DeLong and Strick — as a textbook description, with no parameter calibrated to any dataset.',
      textJa:
        'ネットワーク：高次脳機能の古典的な離断（connectionist）的記述——シルビウス裂周囲の言語ネットワークと背側・腹側経路、頭頂葉の行為と注意の系、海馬–脳弓–乳頭体–視床前核の回路、および Alexander・DeLong・Strick の前頭葉–皮質下回路——を教科書的記述として実装したもので、いずれの係数もデータセットに較正されていません。',
    },
  ],
  evidence: 'docs/model-evidence/higher-brain-function.md',
};

export const DISCLAIMER =
  'Educational model. A representative right-handed brain, not anybody’s: it does not localise a lesion, '
  + 'diagnose, or say what will recover.';
export const DISCLAIMER_JA =
  '教育用モデルです。代表的な右利きの脳であって特定の個人のものではありません。'
  + '病巣同定・診断・回復の予測には使えません。';
export const DISCLAIMER_SHORT = 'Educational model — not a lesion localiser.';
export const DISCLAIMER_SHORT_JA = '教育用モデル — 病巣同定には使えません。';

export const VISUAL_MAPPING = [
  {
    id: 'lesion-colour',
    shows: 'How much of a structure the lesion has taken',
    showsJa: '病変がその構造をどれだけ奪ったか',
    encoding: 'Colour, from tissue tone to lesion red',
    encodingJa: '色（組織色から病変の赤へ）',
  },
  {
    id: 'route-pulse',
    shows: 'The task signal travelling its route, and where it stops',
    showsJa: '課題の信号が経路を進む様子と、止まる場所',
    encoding: 'A moving marker along the route, halted at the failing step',
    encodingJa: '経路上を進むマーカー（破綻した段階で停止）',
  },
  {
    id: 'examination-cycle',
    shows: 'That the task is asked, carried, and answered — in that order',
    showsJa: '課題が「求められ・運ばれ・答えが返る」という順序',
    encoding: 'A repeating run: a swelling where the task enters, the marker travelling, a swelling where it comes out. **The order is the claim; the seconds are a rhythm for reading, not a latency, a conduction time or a reaction time.**',
    encodingJa: '繰り返される 1 回の試行：入口での膨らみ → マーカーの移動 → 出口での膨らみ。**主張は順序であって、秒数は読みのためのリズムです**（潜時でも伝導時間でも反応時間でもありません）。',
  },
  {
    id: 'answer-strength',
    shows: 'Whether anything comes out at the end, and how much',
    showsJa: '最後に何かが出てくるか、どの程度か',
    encoding: 'The swelling at the far end: full for an intact route, faint for an impaired one, absent for a lost one — the task’s own status and nothing else',
    encodingJa: '出口の膨らみ（保たれる＝強い／低下＝弱い／消失＝出ない）。課題の状態そのものであり、他の何かではありません',
  },
  {
    id: 'lifted-bundle',
    shows: 'The tract a route runs inside, including one a lesion has cut',
    showsJa: '経路が通る線維束（病変が切ったものを含む）',
    encoding: 'Drawn in front of the cortex, in its own place — the same treatment the route line gets, because a bundle under the surface is a cut nobody can see',
    encodingJa: '皮質より手前に、**本来の位置のまま**描きます（経路線と同じ扱い）。皮質の下の束は、切れても見えないためです',
  },
  {
    id: 'deep-route-reveal',
    shows: 'A route that runs under the cortical surface, and the structures it runs through',
    showsJa: '皮質の下を通る経路と、その経路が通る構造',
    encoding: 'The cortex in front is faded, and the deep structures on that route are drawn in front of it, in their own places',
    encodingJa: '手前の皮質を薄くし、その経路上の深部構造を**本来の位置のまま**手前に描きます',
  },
  {
    id: 'node-tint',
    shows: 'Which network a structure belongs to',
    showsJa: 'その構造がどのネットワークに属するか',
    encoding: 'Tint by network, on the atlas mesh itself',
    encodingJa: 'ネットワークごとの色（アトラスのメッシュ自体を着色）',
  },
];

/**
 * The fifteen-second sequence's words.
 *
 * The subject is the one finding that cannot be guessed from the anatomy: the
 * person hears perfectly and speaks fluently, and cannot repeat a word back,
 * because a bundle of fibres between the two ends is gone. It is chosen for a
 * short sequence precisely because a still picture cannot make it — what a
 * viewer has to see is a signal getting through, and then not.
 *
 * No number is written down here, and no second is either: the timings live in
 * the storyboard, and what the sequence says about them is that the order is
 * the claim and the length is a rhythm.
 */
export const REEL_COPY = {
  hook: {
    title: 'Hears you. Speaks fluently. Cannot repeat a word.',
    titleJa: '聞こえている。流暢に話せる。なのに復唱できない。',
    subtitle: 'The same word, asked twice — before and after one bundle is cut',
    subtitleJa: '同じ語を 2 回。線維束を 1 本切る前と、切ったあとで',
  },
  cards: {
    task: { label: 'Asked to repeat', labelJa: '復唱を求める' },
    spared: { label: 'Untouched', labelJa: '保たれているもの' },
  },
  badge: {
    label: 'One representative right-handed brain',
    labelJa: '代表的な右利きの脳 1 例',
  },
  lesion: {
    caption: 'The arcuate fasciculus — fibres only. The cortex at both ends is intact.',
    captionJa: '弓状束——線維だけ。両端の皮質は無傷です。',
  },
  blocked: {
    caption: 'The word arrives, is understood, and stops on the way to the mouth',
    captionJa: '語は届き、理解され、口へ向かう途中で止まります',
  },
  spared: {
    caption: 'Understanding and fluency never used that bundle',
    captionJa: '理解と流暢性は、その束を通っていません',
  },
  takeHome: {
    title: 'Conduction aphasia',
    titleJa: '伝導失語',
    subtitle: 'Not a smaller Broca’s. A different route, cut.',
    // No emphasis marks: the overlay writes these as text, so a `**` reaches
    // the closing frame of the video as two asterisks.
    subtitleJa: '「軽い Broca 失語」ではありません。切れたのは、別の経路です。',
  },
  note: {
    text: 'Educational model. The order is the claim; the seconds are a rhythm, not a latency.',
    textJa: '教育用モデル。主張は「順序」で、秒数は読みのためのリズムです（潜時ではありません）。',
  },
};

export const RELATED = {
  scenes: [
    {
      slug: 'brain-anatomy',
      transitionType: 'same-subject',
      label: 'The same atlas, with every structure selectable by name',
      labelJa: '同じアトラスを、すべての構造を名前で選べる形で',
      why: 'This scene lights up a handful of structures because a task passes through them. The anatomy scene lets you take any of them and ask what it is.',
      whyJa: 'このシーンは「課題がそこを通る」という理由で一部の構造だけを光らせます。解剖シーンでは、そのどれでも選んで「それが何か」を尋ねられます。',
    },
  ],
  note:
    '**The same specimen, at the same scale.** The structures lit here are meshes of the same atlas file, '
    + 'so a gyrus named in one scene is the same gyrus in the other.',
  noteJa:
    '**同じ標本、同じ縮尺です。** ここで光る構造は同じアトラスファイルのメッシュなので、'
    + '一方のシーンで名前を確かめた脳回は、他方でも同じ脳回です。',
};
