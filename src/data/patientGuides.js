import {
  HEALTHY as COPD_HEALTHY,
  NARROWED as COPD_NARROWED,
  OBSTRUCTED as COPD_OBSTRUCTED,
} from './copdTeaching.js';
import { AIRWAY_STATES as ASTHMA_AIRWAY_STATES } from './asthmaTeaching.js';

/**
 * Patient-facing explanation copy.
 *
 * These guides deliberately avoid diagnosis, prognosis, treatment selection and
 * patient-specific numbers. They explain only the mechanism already represented
 * by the reviewed / production scene underneath them.
 *
 * A guide's `progress` must mean exactly what that scene's progression means.
 * Patient copy is not allowed to silently reinterpret a demand axis as disease
 * severity just because the resulting animation looks convenient.
 */

/**
 * The three lungs the COPD explanations share.
 *
 * Imported rather than repeated: `src/data/copdTeaching.js` is where the
 * clinician's stepped walk-through defines them, and a patient explanation that
 * typed its own copy of "airway resistance × 2" would eventually be describing
 * a lung no clinician's version ever shows.
 */
const COPD_LUNGS = Object.freeze({
  healthy: COPD_HEALTHY,
  narrowed: COPD_NARROWED,
  obstructed: COPD_OBSTRUCTED,
});

/** The three airway trees the asthma explanations share. Same reason. */
const ASTHMA_TREES = ASTHMA_AIRWAY_STATES;

export const PATIENT_GUIDES = Object.freeze({
  'amyloid-beta': Object.freeze({
    title: 'How amyloid-β can gather into larger structures',
    titleJa: 'アミロイドβが集まって大きな構造になる仕組み',
    steps: Object.freeze([
      {
        progress: 0,
        title: 'Small molecules are separate',
        titleJa: '小さな分子がばらばらに存在する',
        body: 'Amyloid-β is a small protein fragment. This model begins with many individual molecules rather than a plaque.',
        bodyJa: 'アミロイドβは小さなタンパク質断片です。このモデルは、プラークではなく多数の分子が別々に存在する状態から始まります。',
      },
      {
        progress: 0.32,
        title: 'Small clusters can form',
        titleJa: '小さな集まりができる',
        body: 'Some molecules can associate into small clusters called oligomers before larger fibres appear.',
        bodyJa: '分子の一部は、より大きな線維ができる前に、オリゴマーと呼ばれる小さな集まりをつくることがあります。',
      },
      {
        progress: 0.66,
        title: 'Clusters can assemble into fibres',
        titleJa: '集まりが線維状に並ぶ',
        body: 'With further aggregation, amyloid-β can assemble into longer fibrillar structures.',
        bodyJa: '凝集がさらに進むと、アミロイドβはより長い線維状の構造へ組み上がっていきます。',
      },
      {
        progress: 1,
        title: 'Larger deposits become visible',
        titleJa: 'より大きな沈着として見える',
        body: 'Fibrillar material can accumulate into larger deposits. The amount shown here does not tell us how much memory difficulty one individual will have.',
        bodyJa: '線維状の物質が集まると、より大きな沈着として見えるようになります。ただし、この画面の沈着量から個人の記憶症状の程度を判断することはできません。',
      },
    ]),
  }),
  'heart-failure': Object.freeze({
    title: 'Why the heart can become less efficient',
    titleJa: '心臓の働きが弱くなる仕組み',
    steps: Object.freeze([
      { progress: 0, title: 'A healthy pump', titleJa: '正常なポンプ', body: 'The heart fills with blood and squeezes it forward with each beat.', bodyJa: '心臓は血液を受け取り、1回ごとの拍動で前へ送り出します。' },
      { progress: 0.32, title: 'The wall adapts', titleJa: '心筋が適応する', body: 'When the heart works against a higher load for a long time, the muscle can become thicker.', bodyJa: '長く負担がかかると、心筋は厚くなって対応しようとします。' },
      { progress: 0.68, title: 'The chamber enlarges', titleJa: '心室が拡がる', body: 'If the process continues, the main pumping chamber can enlarge and the squeeze becomes less effective.', bodyJa: 'さらに進むと、主なポンプである心室が拡がり、収縮の効率が落ちていきます。' },
      { progress: 1, title: 'Pressure backs up', titleJa: '圧がうしろへ伝わる', body: 'When the heart cannot move blood forward efficiently, pressure can build up behind it, including toward the lungs.', bodyJa: '血液を十分に前へ送れなくなると、心臓の手前側にも圧がたまり、肺の方向へ影響することがあります。' },
    ]),
  }),
  /**
   * COPD, said twice: once as the stepped walk-through a clinician reads, and
   * once here.
   *
   * **The lungs are the same lungs.** `controls` on each step is one of the
   * three control sets `src/data/copdTeaching.js` exports, and the clinician's
   * walk-through steps through the same three. Neither explanation can arrive
   * at a lung the other never describes, and re-tuning one of those lungs moves
   * both or fails `tests/respiratory-guides.test.js`.
   *
   * **Three kinds of change, and a step says which it is asking for.** The
   * scene's own axis (`progress`) is what the body is *asking* the lungs for,
   * from sitting still to working hard — it is not a severity slider, and this
   * guide does not treat it as one. How obstructed the lung is lives on the
   * model controls, which is why the first two steps sit at the same place on
   * the axis and differ only in `controls`: the difference between them is the
   * airways, and the reader is being shown exactly that and nothing else.
   * `frame` and `focus` move the camera and the labels and change no physiology
   * at all.
   *
   * **Where the model stops is marked, and it stops early.** This model’s own
   * scope excludes gas exchange outright — no PaO₂, no PaCO₂, no SpO₂, because
   * none of them follows from lung volumes — and excludes dyspnoea and the work
   * of breathing with it. The last two steps are the ones a person actually
   * asks about, they are both `educationalOnly`, and the panel says on screen
   * that they are not drawn from the model. Nothing in this file turns a volume
   * into a blood gas or into a symptom.
   */
  'copd-hyperinflation': Object.freeze({
    title: 'Why breathing out gets harder, and what that leaves behind',
    titleJa: '息を吐きにくくなると、何が起きるのか',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'rest',
        controls: COPD_LUNGS.healthy,
        // The scene's own opening shot puts the diaphragm's label under the
        // console, and this step is about the diaphragm. Same line of sight,
        // lower in the frame.
        frame: 'base',
        focus: ['lungs', 'diaphragm'],
        certainty: 'established',
        title: 'Breathing out needs no pushing',
        titleJa: '息を吐くのに力は要りません',
        body: 'Breathing in is muscular work. Sitting quietly, breathing out is not: the lungs simply give back what was just put into them.',
        bodyJa: '息を吸うのは筋肉の仕事です。安静時に吐くほうはちがいます。いま入れた分を、肺がそのまま返しているだけです。',
        look: 'Watch the lungs rise and settle. Nothing is forcing the air out — they are returning to the size they rest at.',
        lookJa: '肺がふくらんで戻るのを見てください。押し出しているのではなく、元の大きさに戻っています。',
      },
      {
        progress: 0,
        stage: 'rest',
        // Same place on the axis, same body sitting still. What changed is the
        // lung, and that is the whole content of this step.
        controls: COPD_LUNGS.narrowed,
        frame: 'airway',
        focus: ['airway'],
        certainty: 'established',
        title: 'Narrower airways take longer to empty',
        titleJa: '気道が狭いと、出るのに時間がかかります',
        body: 'Narrow the passages the air leaves through and nothing stops it leaving — it just takes longer. At rest there is still time enough, so little looks different.',
        bodyJa: '空気の通り道が狭くなっても、出られなくなるわけではありません。時間がかかるだけです。安静時はまだ時間が足りているので、見た目はあまり変わりません。',
        look: 'The airways are narrower than a moment ago. The lungs beside them are still emptying to the same size between breaths.',
        lookJa: '気道が先ほどより細くなっています。隣の肺は、呼吸と呼吸の間に同じ大きさまで戻れています。',
      },
      {
        progress: 0.3,
        stage: 'light',
        controls: COPD_LUNGS.narrowed,
        focus: ['lungs', 'trapped'],
        certainty: 'established',
        title: 'Moving takes that time away',
        titleJa: '動くと、その時間が奪われます',
        body: 'Walking asks for more air each minute, so breaths come closer together. The part of each breath that gets shorter is the breathing-out part.',
        bodyJa: '歩くと必要な空気の量が増え、呼吸の間隔が詰まります。そのとき短くなるのは、吐いている時間のほうです。',
        look: 'The breaths are faster now. Watch the gap between them close — that gap was the time to breathe out.',
        lookJa: '呼吸が速くなりました。呼吸と呼吸の間隔が詰まるのを見てください。そこが吐くための時間でした。',
      },
      {
        progress: 0.6,
        stage: 'moderate',
        controls: COPD_LUNGS.narrowed,
        focus: ['trapped', 'lungs'],
        certainty: 'established',
        title: 'What did not get out is still in there',
        titleJa: '出きらなかった分は、そのまま残ります',
        body: 'The next breath in starts from wherever the last breath out reached. Breath after breath, the lungs settle at a larger size than before.',
        bodyJa: '次の吸気は、前の呼気が到達したところから始まります。呼吸を重ねるごとに、肺は前より大きい状態で落ち着くようになります。',
        look: 'The bright specks are the air each region did not give back. Watch the lungs settle a little larger each breath.',
        lookJa: '明るい粒が、各領域が返しきれなかった空気です。呼吸のたびに肺が少しずつ大きいまま落ち着くのを見てください。',
      },
      {
        progress: 0.6,
        stage: 'moderate',
        // Same workload, same axis position: this step adds the loss of recoil,
        // which is what closes the door on pushing harder.
        controls: COPD_LUNGS.obstructed,
        frame: 'airway',
        focus: ['airway'],
        certainty: 'established',
        title: 'Pushing harder stops helping',
        titleJa: '強く吐いても、もう増えません',
        body: 'When the lung has also lost its spring, pushing squeezes the airways shut as much as it drives air along them. Past a point, effort adds nothing.',
        bodyJa: '肺のばねが弱った状態では、強く吐こうとする力が、空気を押し出すのと同じだけ気道をつぶします。ある点を越えると、努力しても何も変わりません。',
        look: 'Watch the airways narrow as the breath goes out. That squeezing is the reason a harder push does not move more air.',
        lookJa: '吐くときに気道が細くなるのを見てください。この「つぶれ」があるために、強く吐いても空気は増えません。',
      },
      {
        progress: 1,
        stage: 'heavy',
        controls: COPD_LUNGS.obstructed,
        frame: 'base',
        focus: ['diaphragm', 'lungs'],
        certainty: 'established',
        title: 'The room to breathe in closes from above',
        titleJa: '吸う余裕が、上から狭まります',
        body: 'The chest can only hold so much. Starting each breath from a larger lung leaves less room to take one, and the muscle underneath is pushed flat.',
        bodyJa: '胸郭が入れられる量には上限があります。大きくふくらんだ状態から吸い始めるぶん、吸える余裕は減り、下にある筋肉は押されて平らになります。',
        look: 'Watch the dome underneath the lungs. It has flattened, and a flat one pulls less well than a domed one.',
        lookJa: '肺の下のドームを見てください。平らになっています。平らな状態では、ドーム型のときほど引けません。',
      },
      {
        progress: 1,
        stage: 'heavy',
        // Not a model output, and not a small omission: this model's own scope
        // excludes gas exchange outright, because none of it follows from lung
        // volumes. The step exists because it is the question a person asks,
        // and it says on screen that the screen is not answering it.
        controls: COPD_LUNGS.obstructed,
        frame: 'base',
        focus: ['diaphragm', 'lungs'],
        certainty: 'established',
        educationalOnly: true,
        title: 'Air moving is not the same as oxygen arriving',
        titleJa: '空気が動くことと、酸素が届くことは別です',
        body: 'Oxygen has to cross from the air into the blood, and carbon dioxide the other way. How well that happens is a separate question from how the lungs move.',
        bodyJa: '酸素は空気から血液へ、二酸化炭素は逆向きに移らなければなりません。それがどれだけうまくいくかは、肺の動きとは別の問題です。',
        look: 'Nothing here shows this: there is no blood in this picture, and no oxygen. It is only air being moved.',
        lookJa: 'この画面には血液も酸素も描かれていません。示しているのは空気の出入りだけです。',
      },
      {
        progress: 1,
        stage: 'heavy',
        controls: COPD_LUNGS.obstructed,
        frame: 'base',
        focus: ['diaphragm', 'lungs'],
        // Well supported as a group finding and highly variable between people,
        // which is exactly the distinction `associated` exists to keep.
        certainty: 'associated',
        educationalOnly: true,
        title: 'Why stopping to catch your breath happens',
        titleJa: '立ち止まって息を整えたくなる理由',
        body: 'People with lungs that empty slowly often describe breathing as effortful on exertion, and describe stopping as what settles it. How much it affects a person varies widely.',
        bodyJa: '吐き出しに時間のかかる肺の人は、動いたときに呼吸が苦しいと感じ、立ち止まると楽になると話すことが多く知られています。どの程度かは人によって大きく異なります。',
        look: 'Nothing new is drawn for this step. The screen shows the mechanics, not what anyone feels.',
        lookJa: 'この段階で新しく描かれるものはありません。画面が示すのは力学であって、感じ方ではありません。',
      },
    ]),
  }),
  /**
   * Asthma, built on the mechanism the COPD explanation worked out and holding
   * the same promises — because it is the same contract, not a second one.
   *
   * **What is different is what the disease is.** The COPD walk ends with a
   * lung that cannot empty and a door that has closed. This one ends with a
   * tree that opens again, because that is the property that separates the two
   * scenes and the one a person most needs to hear said out loud. The states it
   * stands on — a tree that is not hyperresponsive, the asthmatic tree, and the
   * same tree with its smooth muscle released — are the three
   * `src/data/asthmaTeaching.js` declares, and the resistances quoted in its
   * comments are the model's own arithmetic.
   *
   * **The axis is the stimulus, and the guide does not pretend otherwise.** The
   * first two steps sit at zero on it: no stimulus at all, one tree that is
   * twitchy and one that is not, and nothing yet to see. That pairing is the
   * point — asthma is not visible in a quiet airway, which is exactly why the
   * step after it matters.
   *
   * **Where the model stops is marked.** Its own scope excludes gas exchange,
   * perfusion and every blood value outright; it has no blood in it. So the
   * step a person actually asks about — whether enough oxygen is arriving — is
   * `educationalOnly`, says on screen that it is not drawn from the model, and
   * is followed by the one about how much this varies between people, which is
   * marked `associated` because that is what the evidence supports and no more.
   */
  'asthma-heterogeneity': Object.freeze({
    title: 'Why the same air does not reach every part of the lung',
    titleJa: '同じ空気が、肺のすべての場所には届かない理由',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'quiet',
        controls: ASTHMA_TREES.notHyperresponsive,
        frame: 'tree',
        focus: ['tree', 'trachea'],
        certainty: 'established',
        title: 'Air gets in through a tree of tubes',
        titleJa: '空気は、枝分かれした管を通ります',
        body: 'One wide tube divides again and again into narrower ones, and every part of the lung is fed by the branch that reaches it.',
        bodyJa: '太い管が何度も枝分かれして細くなり、肺のどの場所も、そこへ届いた枝から空気を受け取ります。',
        look: 'Follow one branch down from the top and watch it divide. The small shapes underneath are the parts it feeds.',
        lookJa: '上から 1 本の枝をたどり、分かれていくのを見てください。下の小さな形が、その枝が受け持つ場所です。',
      },
      {
        progress: 0,
        stage: 'quiet',
        // Same place on the axis — nothing is provoking either tree. What
        // changed is the airway itself, which is the content of this step.
        controls: ASTHMA_TREES.asthmatic,
        frame: 'tree',
        focus: ['tree'],
        certainty: 'established',
        title: 'In asthma the tubes are different before anything happens',
        titleJa: '喘息では、何も起きていないときから管が違います',
        body: 'The walls are thicker than they should be and the muscle wrapped around them reacts more readily. With nothing provoking it, almost nothing looks wrong.',
        bodyJa: '壁は本来より厚く、そのまわりを取り巻く筋肉は反応しやすくなっています。刺激がなければ、見た目はほとんど変わりません。',
        look: 'The branches look much as they did. That is the point of this step — a quiet airway does not show it.',
        lookJa: '枝の見た目はほとんど変わりません。それがこの段階の要点です。静かな気道には現れません。',
      },
      {
        progress: 0.4,
        stage: 'held',
        controls: ASTHMA_TREES.asthmatic,
        frame: 'tree',
        focus: ['tree'],
        certainty: 'established',
        title: 'Something sets the muscle off, everywhere at once',
        titleJa: '筋肉が、いっせいに反応します',
        body: 'The muscle around every branch begins to tighten, evenly. At first the lung tissue attached outside holds the tubes open and little changes.',
        bodyJa: 'すべての枝を取り巻く筋肉が、均等に締まりはじめます。はじめは外側についた肺の組織が管を開いたままに保ち、大きな変化は起きません。',
        look: 'The branches are narrowing a little. Nothing here is being singled out — every one of them is getting the same stimulus.',
        lookJa: '枝がわずかに細くなっています。特定の枝だけが選ばれてはいません。どの枝にも同じ刺激が届いています。',
      },
      {
        progress: 0.75,
        stage: 'patchy',
        controls: ASTHMA_TREES.asthmatic,
        frame: 'units',
        focus: ['units', 'defect'],
        certainty: 'established',
        title: 'Where one branch gives way, its neighbour takes the air',
        titleJa: '負けた枝のぶんを、隣の枝が受け取ります',
        body: 'Air takes the easier route. A branch that narrows a little loses its share to the branch beside it, which then has more air holding it open.',
        bodyJa: '空気は通りやすいほうへ流れます。少し細くなった枝は、その分を隣の枝に奪われ、隣は空気に押されてさらに開きます。',
        look: 'Patches have gone dark, and they are next to each other. The bright regions beside them took the air.',
        lookJa: '暗くなった場所がまとまって現れています。その隣の明るい場所が、空気を受け取ったほうです。',
      },
      {
        progress: 1,
        stage: 'shift',
        controls: ASTHMA_TREES.asthmatic,
        frame: 'units',
        focus: ['units', 'tree'],
        certainty: 'established',
        title: 'Past a point, most of the lung goes together',
        titleJa: 'ある点を越えると、肺の大部分がまとめて変わります',
        body: 'Push the same even stimulus harder and the regions that were still coping give way too. The lung is even again — evenly getting very little.',
        bodyJa: '同じ均一な刺激が強くなると、持ちこたえていた場所も次々に変わります。肺はふたたび均一になりますが、均一に「ほとんど届かない」状態です。',
        look: 'Almost every region has gone dark now, and the branches above them are much narrower than they began.',
        lookJa: 'ほとんどの場所が暗くなり、その上の枝も最初よりずっと細くなっています。',
      },
      {
        progress: 1,
        stage: 'shift',
        // The same tree with its smooth muscle released. The signal is still at
        // its maximum; what changed is the muscle, and the model reopens the
        // tree from it. This is the property that separates this scene from the
        // COPD one, and it is the last thing the mechanism walk says.
        controls: ASTHMA_TREES.relaxed,
        frame: 'units',
        focus: ['units', 'tree'],
        certainty: 'established',
        title: 'When the muscle lets go, the tubes open again',
        titleJa: '筋肉がゆるむと、管はまた開きます',
        body: 'This narrowing is something the airway can come out of. Relax the muscle around it, with the same stimulus still arriving, and the air reaches those parts again.',
        bodyJa: 'この狭くなり方は、気道が元に戻れる種類のものです。同じ刺激が届いたままでも、まわりの筋肉がゆるめば、空気はふたたびその場所へ届きます。',
        look: 'Watch the dark patches light up again and the branches widen — with nothing else on screen changed.',
        lookJa: '暗かった場所が明るく戻り、枝が太くなるのを見てください。ほかは何も変えていません。',
      },
      {
        progress: 1,
        stage: 'shift',
        // Not a model output. This model's own scope excludes gas exchange,
        // perfusion and every blood value: there is no blood in it at all.
        controls: ASTHMA_TREES.relaxed,
        frame: 'units',
        focus: ['units', 'tree'],
        certainty: 'established',
        educationalOnly: true,
        title: 'Air arriving is not the same as oxygen arriving',
        titleJa: '空気が届くことと、酸素が届くことは別です',
        body: 'Oxygen has to cross from the air into the blood. Air reaching a part of the lung unevenly is one reason that can go wrong, but it is a separate question.',
        bodyJa: '酸素は空気から血液へ移らなければなりません。空気の届き方にむらがあることはその一因になりますが、別の問題です。',
        look: 'There is no blood in this picture and no oxygen. The colours are how much air each part is getting.',
        lookJa: 'この画面に血液も酸素も描かれていません。色が示すのは、各場所に届いている空気の量です。',
      },
      {
        progress: 1,
        stage: 'shift',
        controls: ASTHMA_TREES.relaxed,
        frame: 'units',
        focus: ['units', 'tree'],
        // Variable between people and variable within one person over time,
        // which is what `associated` is for and what a single story would lose.
        certainty: 'associated',
        educationalOnly: true,
        title: 'Why it can come and go',
        titleJa: '出たり収まったりする理由',
        body: 'People describe chest tightness, a whistling sound or a cough that comes on and then settles again. What sets it off, and how much, differs a great deal between people.',
        bodyJa: '胸の締めつけ、ヒューヒューという音、せきが出て、また収まると話す人が多くいます。何をきっかけにどの程度起きるかは、人によって大きく異なります。',
        look: 'Nothing new is drawn for this step. The screen shows airways and air, not what anyone feels.',
        lookJa: 'この段階で新しく描かれるものはありません。画面が示すのは気道と空気であって、感じ方ではありません。',
      },
    ]),
  }),
  /**
   * Pneumonia, on the same contract as the two scenes before it.
   *
   * This model is a regional ventilation/perfusion one: it solves what share of
   * a lung is consolidated, what share is still ventilated, and what share of
   * the blood is passing lung that is not being ventilated. Everything the walk
   * says up to the last two steps is one of those three numbers.
   *
   * **What it stops at is a hard line.** Its own scope excludes PaO₂, SpO₂,
   * imaging, the pathogen and every treatment decision. So the step about
   * oxygen says what the shunt mechanism *is* and says on screen that the
   * screen is not measuring anyone's oxygen, and the step about how it feels is
   * marked as well. No step names an organism, an antibiotic or an x-ray.
   */
  'pneumonia-consolidation': Object.freeze({
    title: 'Why filled air sacs make breathing less effective',
    titleJa: '空気の袋が埋まると、呼吸が効きにくくなる理由',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'aerated',
        focus: ['regional-ventilation'],
        certainty: 'established',
        title: 'Air and blood meet everywhere',
        titleJa: '空気と血液は、どこでも出会っています',
        body: 'The lung works by bringing air and blood close together in every part of it, so that oxygen can cross from one to the other.',
        bodyJa: '肺は、どの場所でも空気と血液を近づけることで働いています。そうして酸素が一方から他方へ移ります。',
        look: 'Every region is lit the same way. Both things it needs are arriving in all of them.',
        lookJa: 'どの領域も同じように光っています。必要な二つが、すべての場所に届いています。',
      },
      {
        progress: 0.22,
        stage: 'focal',
        frame: 'lower',
        focus: ['consolidated-unit'],
        certainty: 'established',
        title: 'One patch fills up',
        titleJa: '一部が埋まります',
        body: 'In one part, the tiny air sacs fill with fluid and cells instead of air. Air cannot get into a sac that is already full.',
        bodyJa: 'ある場所で、小さな空気の袋が空気ではなく液体と細胞で満たされます。すでに埋まった袋に空気は入れません。',
        look: 'One region has changed colour. That is the part where air is no longer arriving.',
        lookJa: '一部の領域の色が変わりました。そこが、空気の届かなくなった場所です。',
      },
      {
        progress: 0.5,
        stage: 'shunt',
        frame: 'lower',
        focus: ['consolidated-unit', 'persistent-perfusion'],
        certainty: 'established',
        title: 'The blood still goes there',
        titleJa: '血液はそこへ流れ続けます',
        body: 'Blood keeps flowing past that filled patch. It arrives, finds no air to collect oxygen from, and leaves much as it came.',
        bodyJa: '血液は、埋まった場所のそばを流れ続けます。着いても酸素を受け取る空気がないため、ほとんどそのまま出ていきます。',
        look: 'The blood flow marks are still there over the filled region — that is the part of this that matters.',
        lookJa: '埋まった領域の上にも血流の印が残っています。ここがこの段階の要点です。',
      },
      {
        progress: 0.82,
        stage: 'multifocal',
        frame: 'lower',
        focus: ['persistent-perfusion', 'regional-ventilation'],
        certainty: 'established',
        title: 'The lung diverts some of it, but not all',
        titleJa: '肺は血流を一部そらしますが、すべてではありません',
        body: 'The lung narrows the vessels going to parts with no air, pushing some blood towards parts that still have it. It can only do so much.',
        bodyJa: '肺は、空気のない場所へ向かう血管を細くして、血液を空気のある場所へ回そうとします。ただし、できる範囲には限りがあります。',
        look: 'Compare the two: more blood is reaching the lit regions now, and some is still crossing the filled ones.',
        lookJa: '見比べてください。明るい領域へ向かう血液が増えていますが、埋まった領域を通る分も残っています。',
      },
      {
        progress: 0.82,
        stage: 'multifocal',
        frame: 'lower',
        // The model solves what share of the blood passes lung that is not
        // ventilated. It does not solve what that does to anyone's blood
        // oxygen — its own scope excludes PaO2 and SpO2 outright.
        focus: ['persistent-perfusion', 'regional-ventilation'],
        certainty: 'established',
        educationalOnly: true,
        title: 'How much oxygen arrives is a separate question',
        titleJa: '酸素がどれだけ届くかは別の話です',
        body: 'The share of blood passing unventilated lung is what this screen is about. How much oxygen ends up in a person is not something it works out.',
        bodyJa: '換気されていない肺を通る血液の割合が、この画面の主題です。その人の血液にどれだけ酸素が入るかは、ここでは計算していません。',
        look: 'There is no oxygen level anywhere on this screen. What is shown is where the blood goes and where the air does.',
        lookJa: 'この画面に酸素の値はどこにもありません。示しているのは、血液と空気それぞれの行き先だけです。',
      },
      {
        progress: 0.82,
        stage: 'multifocal',
        frame: 'lower',
        focus: ['persistent-perfusion', 'regional-ventilation'],
        certainty: 'associated',
        educationalOnly: true,
        title: 'What people notice',
        titleJa: '本人が気づくこと',
        body: 'A cough, a fever, and breathing that takes more effort are commonly described. Which of them appear, and how strongly, differs widely between people.',
        bodyJa: 'せき、発熱、呼吸のしづらさが訴えられることがよくあります。どれが出るか、どの程度かは人によって大きく異なります。',
        look: 'Nothing new is drawn for this step. The screen shows air and blood, not a person.',
        lookJa: 'この段階で新しく描かれるものはありません。画面が示すのは空気と血液であって、人ではありません。',
      },
    ]),
  }),

  /**
   * Pulmonary embolism — the mirror image of the pneumonia walk, deliberately.
   *
   * Both scenes are about air and blood failing to meet, and they fail in
   * opposite directions: in pneumonia the blood arrives where the air cannot,
   * here the air arrives where the blood cannot. Reading them one after the
   * other is the point, and `RELATED` on each scene is what makes that possible.
   *
   * **The load step is carefully worded.** This model's own scope excludes
   * pulmonary artery pressure, cardiac output and right-ventricular function.
   * It solves the conductance of a fixed twelve-territory network, so the walk
   * says the remaining routes have to carry everything and says nothing about a
   * pressure, a heart or a number.
   */
  'pulmonary-embolism': Object.freeze({
    title: 'Why breathing into a part with no blood does nothing',
    titleJa: '血液の来ない場所に空気を送っても、意味がない理由',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'matched',
        focus: ['continued-ventilation'],
        certainty: 'established',
        title: 'Both have to arrive in the same place',
        titleJa: '二つが同じ場所に届く必要があります',
        body: 'Oxygen crosses from air to blood only where the two are side by side. Air on its own does nothing, and blood on its own does nothing.',
        bodyJa: '酸素が空気から血液へ移るのは、その二つが隣り合っている場所だけです。空気だけでも、血液だけでも何も起きません。',
        look: 'Every territory has both. That pairing is what the rest of this is about.',
        lookJa: 'どの領域にも両方があります。この対応関係が、以降の話の軸です。',
      },
      {
        progress: 0.25,
        stage: 'segmental',
        focus: ['vascular-obstruction'],
        certainty: 'established',
        title: 'A blood vessel is blocked',
        titleJa: '血管が詰まります',
        body: 'Something lodges in one of the vessels carrying blood into the lung. Beyond it, blood stops arriving — and the air keeps arriving, because nothing blocked the airway.',
        bodyJa: '肺へ血液を運ぶ血管の一本が、何かでふさがれます。その先には血液が届かなくなります。気道はふさがれていないので、空気は届き続けます。',
        look: 'Watch the blocked vessel, then the region beyond it: the air is still going there and the blood is not.',
        lookJa: '詰まった血管と、その先の領域を見てください。空気は届いていて、血液は届いていません。',
      },
      {
        progress: 0.52,
        stage: 'redistribution',
        focus: ['underperfused-region', 'continued-ventilation'],
        certainty: 'established',
        title: 'That breath is wasted',
        titleJa: 'その呼吸は無駄になります',
        body: 'Air reaching a part with no blood in it cannot hand its oxygen to anything. The effort of that breath is spent and nothing is exchanged.',
        bodyJa: '血液のない場所へ届いた空気は、酸素を渡す相手がありません。その呼吸にかけた力は使われますが、何も交換されません。',
        look: 'The pale regions are still being ventilated. They are the share of each breath that achieves nothing.',
        lookJa: '淡い色の領域にも空気は届いています。そこが、何も生まない呼吸の割合です。',
      },
      {
        progress: 0.82,
        stage: 'afterload',
        focus: ['vascular-obstruction', 'underperfused-region'],
        certainty: 'established',
        title: 'The routes that are left carry everything',
        titleJa: '残った通り道が、すべてを引き受けます',
        body: 'Blood through the lung takes many parallel routes. Close some and the same amount has to go through the ones still open, which is harder work to push through.',
        bodyJa: '肺を通る血液は、多くの並行した経路に分かれています。いくつかが閉じれば、同じ量が残りの経路を通ることになり、押し送るのに余計な力が要ります。',
        look: 'Count what is still open against what was open at the start — that difference is what this step is about.',
        lookJa: '開いている経路を、最初の状態と見比べてください。その差がこの段階の主題です。',
      },
      {
        progress: 0.82,
        stage: 'afterload',
        // The model solves the conductance of a fixed network. It does not
        // solve a pressure, a cardiac output or anything about the heart —
        // its own scope says so — and it solves no blood value either.
        focus: ['vascular-obstruction', 'underperfused-region'],
        certainty: 'established',
        educationalOnly: true,
        title: 'What this screen is not working out',
        titleJa: 'この画面が計算していないこと',
        body: 'How hard any heart is having to push, and how much oxygen is reaching a person, are both outside what is drawn here. This is about where air and blood go.',
        bodyJa: '心臓がどれだけの力で押しているか、その人にどれだけ酸素が届いているかは、どちらもここに描かれていません。示しているのは空気と血液の行き先です。',
        look: 'There is no heart on this screen and no oxygen level. Neither is being calculated.',
        lookJa: 'この画面に心臓も酸素の値もありません。どちらも計算していません。',
      },
      {
        progress: 0.82,
        stage: 'afterload',
        focus: ['vascular-obstruction', 'underperfused-region'],
        certainty: 'associated',
        educationalOnly: true,
        title: 'What people notice',
        titleJa: '本人が気づくこと',
        body: 'Sudden breathlessness and chest discomfort are commonly described, and sometimes very little is noticed at all. How much any of it shows differs widely.',
        bodyJa: '急な息苦しさや胸の違和感が訴えられることがよくあり、ほとんど何も感じない場合もあります。現れ方は人によって大きく異なります。',
        look: 'Nothing new is drawn for this step. The screen shows air and blood, not a person.',
        lookJa: 'この段階で新しく描かれるものはありません。画面が示すのは空気と血液であって、人ではありません。',
      },
    ]),
  }),

  /**
   * Pulmonary oedema — the one respiratory walk whose oxygen step is the model
   * talking.
   *
   * Every other scene here stops before the blood: COPD, asthma, pneumonia and
   * embolism all exclude PaO₂ and SpO₂ from their scope, so the step a person
   * asks about is marked. This model does not stop there — it solves the shunt
   * fraction, an arterial oxygen tension and the alveolar–arterial difference,
   * and reads them out. So the step about oxygen here is an ordinary step, and
   * only the one about what a person feels is marked.
   *
   * That difference is the reason these marks exist. Two scenes drawing lungs
   * side by side answer different questions, and a reader has no way to tell
   * which is which by looking.
   */
  'pulmonary-edema': Object.freeze({
    title: 'Where the water goes, and when it starts to matter',
    titleJa: '水はどこへ行き、いつから問題になるのか',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'dry',
        focus: ['interstitium', 'hilum'],
        certainty: 'established',
        title: 'A healthy lung leaks, and drains',
        titleJa: '健康な肺も水を漏らし、そして流し出します',
        body: 'A small amount of water crosses out of the blood vessels into the lung all the time. Drainage channels carry away exactly that much, so the lung stays dry.',
        bodyJa: '血管から肺へ、わずかな水がつねに染み出しています。排水の通り道がちょうど同じ量を運び去るので、肺は乾いたままでいられます。',
        look: 'Watch the space around the vessels. Water is moving through it and not collecting in it.',
        lookJa: '血管のまわりの空間を見てください。水はそこを通り抜けていて、たまってはいません。',
      },
      {
        progress: 0.4,
        stage: 'buffered',
        focus: ['interstitium', 'hilum'],
        certainty: 'established',
        title: 'More pressure, and the drains keep up',
        titleJa: '圧が上がっても、排水が追いつきます',
        body: 'When the pressure pushing water out rises, more crosses — and the drainage speeds up to match. For a while nothing accumulates and nothing is felt.',
        bodyJa: '水を押し出す圧が上がると、染み出す量も増えます。排水もそれに合わせて速くなります。しばらくは何もたまらず、自覚もありません。',
        look: 'More water is crossing than before, and the space around the vessels has barely changed.',
        lookJa: '染み出す量は増えていますが、血管まわりの空間はほとんど変わっていません。',
      },
      {
        progress: 0.68,
        stage: 'interstitial',
        focus: ['interstitium'],
        certainty: 'established',
        title: 'The space around the air sacs fills first',
        titleJa: 'まず、空気の袋のまわりが満たされます',
        body: 'Past what the drainage can carry, water collects — but in the space between the air sacs, not inside them. Breathing gets heavier while the sacs are still dry.',
        bodyJa: '排水が運べる量を超えると、水がたまり始めます。ただし空気の袋の中ではなく、袋と袋のあいだの空間にです。袋が乾いたままでも、呼吸は重くなります。',
        look: 'The filling is around the air sacs, not in them. That distinction is the whole of this step.',
        lookJa: 'たまっているのは袋の中ではなく、そのまわりです。この違いが、この段階のすべてです。',
      },
      {
        progress: 1,
        stage: 'alveolar',
        focus: ['alveoli'],
        certainty: 'established',
        title: 'Then it crosses into the air sacs',
        titleJa: 'やがて、袋の中へ入ります',
        body: 'When that space can hold no more, water crosses into the air sacs themselves. A flooded sac still has blood arriving at it and no longer has air.',
        bodyJa: 'その空間が満杯になると、水は空気の袋そのものへ入ります。水で満たされた袋にも血液は届きますが、空気はもうありません。',
        look: 'The sacs themselves have changed now. That is a different thing from the step before it.',
        lookJa: '今度は袋そのものが変わりました。前の段階とは別のことが起きています。',
      },
      {
        progress: 1,
        stage: 'alveolar',
        // An ordinary step, not a marked one: this model solves the shunt
        // fraction, the arterial oxygen tension and the A-a difference, and
        // reads all three out. The scenes either side of it do not.
        focus: ['alveoli'],
        certainty: 'established',
        title: 'Now the oxygen falls',
        titleJa: 'ここで酸素が下がります',
        body: 'Blood arriving at a flooded sac finds no air to take oxygen from and carries on past. This is the point at which the amount reaching the body drops.',
        bodyJa: '水で満たされた袋に届いた血液は、酸素を受け取る空気がないまま通り過ぎます。体に届く量が落ちるのは、この時点からです。',
        look: 'The flooded sacs still have blood going to them. That blood is the part that is not picking anything up.',
        lookJa: '水で満たされた袋にも血液は向かっています。その血液が、何も受け取れていない分です。',
      },
      {
        progress: 1,
        stage: 'alveolar',
        focus: ['alveoli'],
        certainty: 'associated',
        educationalOnly: true,
        title: 'Why lying flat can make it worse',
        titleJa: '横になると苦しくなることがある理由',
        body: 'Breathlessness that is worse lying down, and eases on sitting up, is commonly described. How much, and how quickly, differs a great deal between people.',
        bodyJa: '横になると息苦しく、起き上がると楽になると訴えられることがよくあります。程度も現れ方も、人によって大きく異なります。',
        look: 'Nothing new is drawn for this step. The screen shows where the water is, not how anyone feels.',
        lookJa: 'この段階で新しく描かれるものはありません。画面が示すのは水の位置であって、感じ方ではありません。',
      },
    ]),
  }),

  'portal-hypertension': Object.freeze({
    title: 'Why pressure rises before the liver',
    titleJa: '肝臓の手前で圧が上がる仕組み',
    steps: Object.freeze([
      { progress: 0, title: 'Blood flows through the liver', titleJa: '血液が肝臓を通る', body: 'Blood from the digestive organs normally flows through the portal vein and then through the liver.', bodyJa: '消化管などから戻った血液は、通常は門脈を通って肝臓の中を流れます。' },
      { progress: 0.42, title: 'The liver becomes harder to flow through', titleJa: '肝臓の中を通りにくくなる', body: 'Cirrhosis changes the liver structure and increases resistance to that flow.', bodyJa: '肝硬変では肝臓の構造が変化し、血液が通るときの抵抗が大きくなります。' },
      { progress: 0.72, title: 'Portal pressure rises', titleJa: '門脈の圧が上がる', body: 'More pressure is then needed to drive blood across the liver.', bodyJa: 'そのため、肝臓へ血液を通すために、より高い圧が必要になります。' },
      { progress: 1, title: 'Blood can take detours', titleJa: '血液が迂回路へ流れる', body: 'Alternative veins can carry part of the blood around the liver, but the underlying resistance in the liver remains.', bodyJa: '血液の一部は別の静脈を迂回するようになりますが、肝臓の中の通りにくさ自体がなくなるわけではありません。' },
    ]),
  }),
});

export const patientGuideFor = (sceneId) => PATIENT_GUIDES[sceneId] ?? null;
