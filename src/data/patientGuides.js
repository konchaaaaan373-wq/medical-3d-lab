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

  /**
   * Portal hypertension, on the same contract as the respiratory scenes.
   *
   * **The axis is the liver's own resistance and nothing else.** The scene says
   * so: splanchnic vasodilation — the second half of the story — is a control
   * of its own, and this walk does not touch it. So the steps are about one
   * thing getting harder to cross, and the last mechanism step says plainly
   * that the detours do not fix it because the resistance behind them and the
   * inflow in front of them are both still there. That is the scene's own
   * finding and the reason it exists.
   *
   * **What it refuses is on the record and is respected here.** Its scope
   * excludes ascites, varices, bleeding, encephalopathy and liver function of
   * every kind — it has flows, not consequences — so no step names any of them
   * as something that follows. The two marked steps say what the picture does
   * not contain and that what happens to a person is not in it.
   *
   * No step gives a pressure. The model reports a portal pressure gradient and
   * an HVPG and is emphatic that they are not the same number; a patient-facing
   * figure would be the easiest place in the product to conflate them.
   */
  'portal-hypertension': Object.freeze({
    title: 'Why pressure builds up before the liver',
    titleJa: '肝臓の手前で圧が上がる理由',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'healthy',
        frame: 'system',
        focus: ['liver', 'portal'],
        certainty: 'established',
        title: 'Blood from the gut goes through the liver first',
        titleJa: '腸からの血液は、まず肝臓を通ります',
        body: 'Blood leaving the stomach and intestines does not go straight back to the heart. It is routed through the liver on the way, in its own vein.',
        bodyJa: '胃や腸から出た血液は、そのまま心臓へ戻るのではありません。途中で肝臓を通るよう、専用の静脈で導かれています。',
        look: 'Follow the vein into the liver and out the other side. A healthy liver is very easy to flow through.',
        lookJa: '肝臓に入り、反対側から出ていく静脈を目で追ってください。健康な肝臓は、とても通りやすい場所です。',
      },
      {
        progress: 0.35,
        stage: 'scarring',
        frame: 'system',
        focus: ['liver', 'portal'],
        certainty: 'established',
        title: 'Scarring makes the liver hard to cross',
        titleJa: '瘢痕化で、肝臓を通りにくくなります',
        body: 'Scar tissue and regrowing nodules change the inside of the liver, and blood has to be pushed harder to get through it. The pressure in front of it rises.',
        bodyJa: '瘢痕の組織と再生した結節が肝臓の内部を変え、血液を通すのにより強い力が要るようになります。その手前の圧が上がります。',
        look: 'Nothing about the vein has changed. What changed is the liver the vein has to push through.',
        lookJa: '静脈そのものは変わっていません。変わったのは、静脈が血液を押し通す先の肝臓です。',
      },
      {
        progress: 0.6,
        stage: 'collaterals',
        frame: 'system',
        focus: ['collateral', 'portal'],
        certainty: 'established',
        title: 'Other veins open, and carry blood around it',
        titleJa: '別の静脈が開き、迂回路になります',
        body: 'Over months and years, small existing veins widen into a network that carries a large share of the blood past the liver instead of through it.',
        bodyJa: '数か月から数年かけて、もともとある細い静脈が広がってつながり、血液のかなりの部分を肝臓の中ではなく脇を通して運ぶようになります。',
        look: 'New routes have appeared beside the liver. Watch how much of the flow moves onto them.',
        lookJa: '肝臓の脇に新しい通り道が現れています。どれだけの流れがそちらへ移るかを見てください。',
      },
      {
        progress: 1,
        stage: 'advanced',
        frame: 'system',
        focus: ['collateral', 'splanchnic'],
        certainty: 'established',
        title: 'The detours help, and the pressure stays high',
        titleJa: '迂回路は効きますが、圧は高いままです',
        body: 'The detours take a real share of the load and the pressure comes down a little. It stays far above normal, because the liver is still hard to cross and blood keeps arriving.',
        bodyJa: '迂回路は負荷のかなりの部分を引き受け、圧は少し下がります。それでも正常よりはるかに高いままです。肝臓が通りにくいことも、血液が届き続けることも変わらないからです。',
        look: 'Compare the two routes, then look at the pressure. Most of the blood has moved and the pressure has barely followed.',
        lookJa: '二つの通り道を見比べ、それから圧を見てください。血液の大半は移ったのに、圧はほとんど下がっていません。',
      },
      {
        progress: 1,
        stage: 'advanced',
        // The model has flows, not consequences: its scope excludes ascites,
        // varices, bleeding, encephalopathy and liver function of every kind.
        frame: 'system',
        focus: ['collateral', 'splanchnic'],
        certainty: 'established',
        educationalOnly: true,
        title: 'This screen is pressure and flow, and nothing else',
        titleJa: 'この画面は圧と流れだけです',
        body: 'What the liver does as an organ — the work it performs for the body — is not represented here at all. Neither is anything that happens as a result of the pressure.',
        bodyJa: '肝臓が臓器として果たしている働きは、ここには一切描かれていません。圧が高いことによって起きることも同様です。',
        look: 'There is no liver function anywhere on this screen. What is drawn is where blood goes and how hard it is pushed.',
        lookJa: 'この画面に肝臓の働きを示すものはありません。描かれているのは血液の行き先と、押す力の強さだけです。',
      },
      {
        progress: 1,
        stage: 'advanced',
        frame: 'system',
        focus: ['collateral', 'splanchnic'],
        certainty: 'associated',
        educationalOnly: true,
        title: 'What high pressure here can lead to varies greatly',
        titleJa: 'ここで圧が高いと何が起きるかは、人によって大きく違います',
        body: 'Raised pressure in this system is associated with several problems elsewhere in the body. Which of them appear, and when, differs widely and is not shown here.',
        bodyJa: 'この系の圧が高いことは、体の別の場所で起きるいくつかの問題と関連が知られています。どれがいつ現れるかは人によって大きく異なり、ここには示されていません。',
        look: 'Nothing new is drawn for this step. The picture shows a pressure, not what will happen to anyone.',
        lookJa: 'この段階で新しく描かれるものはありません。示しているのは圧であって、誰かに起きることではありません。',
      },
    ]),
  }),

  /**
   * Hepatorenal syndrome — the walk where one solve really does span three
   * organs, and the one place in this product where that may be said.
   *
   * `solveHepatorenal` **imports and calls** `solvePortalCirculation`: the liver
   * on this screen is solved by the same function the portal-hypertension scene
   * uses, inside one solve with one unknown, and the kidney's perfusion pressure
   * comes out of it. So the chain this walk describes — the liver, the
   * circulation, then the kidney — is numerically coupled, not two pictures
   * placed side by side.
   *
   * **That is exactly why the neighbouring links say the opposite.** Moving
   * from the portal-hypertension scene to this one is navigation between two
   * models; nothing is carried across. The coupling is inside this scene, and
   * `RELATED` in `src/data/hepatorenal.js` says so rather than letting the two
   * facts blur into each other.
   *
   * **The scene's own boundary is the last mechanism step, not a footnote.**
   * This model gives the kidney no injury at all, and filtration still collapses
   * — which is the measure the scene exists to give. The step after it says, on
   * screen, that a person's kidney may be injured as well and that this picture
   * has none of it to weigh. No step names a diagnosis, a criterion, a drug or
   * a course: the scope excludes ascites, every tubule, all structural injury
   * and all time, and the patient copy rules forbid the rest.
   */
  'hepatorenal-syndrome': Object.freeze({
    title: 'How a liver problem reaches the kidneys',
    titleJa: '肝臓の問題が、どうやって腎臓に届くのか',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'healthy',
        frame: 'chain',
        // Start from one kidney. The step that compares two of them turns the
        // comparison on; this makes sure the walk begins somewhere known
        // whatever the reader had on screen before.
        compare: false,
        focus: ['liver', 'kidney'],
        certainty: 'established',
        title: 'Two organs on one circulation',
        titleJa: '一つの循環につながった二つの臓器',
        body: 'The liver and the kidneys are far apart and share one blood supply. Neither is defending itself against anything here.',
        bodyJa: '肝臓と腎臓は離れていますが、血液の流れは一つでつながっています。ここではどちらも、何かに対抗している状態ではありません。',
        look: 'Both organs are on screen at once. That pairing is what the rest of this is about.',
        lookJa: '二つの臓器が同時に映っています。この組み合わせが、以降の話の軸です。',
      },
      {
        progress: 0.18,
        stage: 'vasodilation',
        frame: 'chain',
        focus: ['splanchnic', 'aorta'],
        certainty: 'established',
        title: 'The vessels around the gut open wide',
        titleJa: '腸のまわりの血管が大きく開きます',
        body: 'A liver that blood cannot cross easily causes the arteries feeding the gut to widen. That is a large, easy route opening in parallel with every other one.',
        bodyJa: '血液が通りにくくなった肝臓のために、腸へ向かう動脈が広がります。ほかのすべての経路と並んで、大きくて通りやすい道が開くということです。',
        look: 'Watch the vessels in the middle widen. The pressure through the whole system falls as they do.',
        lookJa: '中央の血管が広がるのを見てください。それにつれて、系全体の圧が下がります。',
      },
      {
        progress: 0.38,
        stage: 'defended',
        frame: 'chain',
        focus: ['afferent', 'efferent', 'kidney'],
        certainty: 'established',
        title: 'The body tightens everything it can',
        titleJa: '体は、締められるところをすべて締めます',
        body: 'To hold the pressure up, the body narrows the vessels that still respond. The ones around the gut do not, so most of that narrowing lands elsewhere — the kidneys among them.',
        bodyJa: '圧を保つため、体はまだ反応する血管を細くします。腸のまわりの血管は反応しないので、その締めつけの多くは別の場所に及びます。腎臓もその一つです。',
        look: 'Watch the two small vessels at the kidney. The one leaving is tightening more than the one arriving.',
        lookJa: '腎臓の二本の細い血管を見てください。出ていく側のほうが、入ってくる側より強く締まっています。',
      },
      {
        progress: 0.58,
        stage: 'failure',
        frame: 'chain',
        focus: ['afferent', 'filtrate'],
        certainty: 'established',
        title: 'The kidney runs out of ways to protect itself',
        titleJa: '腎臓が、自分を守る手立てを使い切ります',
        body: 'The kidney had been widening its incoming vessel to keep its own flow up. There is a limit to that, and past it the kidney simply follows the falling pressure.',
        bodyJa: '腎臓は、入ってくる血管を広げることで自らの血流を保ってきました。それには限界があり、超えた先では、腎臓は下がる圧にただ従うことになります。',
        look: 'The incoming vessel cannot widen any further. Watch what is filtered fall from here.',
        lookJa: '入ってくる血管はもう広がれません。ここから、ろ過される量が落ちていくのを見てください。',
      },
      {
        progress: 1,
        stage: 'circulatory-share',
        // No framing named here on purpose. The scene has its own shot for when
        // two models are on screen, and asking for the single-organ one would
        // hold the pair at a distance chosen for a chain that is no longer what
        // is being drawn.
        // These two labels belong to the scene's comparison, so the steps that
        // say "compare the two kidneys" have to put the second one on screen.
        // Presentation, not physiology: a second model drawn beside this one,
        // with nothing about this one changed.
        compare: true,
        focus: ['thisKidney', 'releasedKidney'],
        certainty: 'established',
        title: 'Nothing here has damaged the kidney',
        titleJa: 'ここでは、腎臓そのものは傷んでいません',
        body: 'Filtering has fallen to a fraction of normal and the kidney in this picture is undamaged throughout. This is how far the circulation alone can carry it.',
        bodyJa: 'ろ過の量は正常のごく一部まで落ちましたが、この絵の腎臓は最後まで傷んでいません。循環の変化だけで、ここまで到達し得るということです。',
        look: 'Compare the two kidneys: the same organ, with and without the signal squeezing it. Neither is injured.',
        lookJa: '二つの腎臓を見比べてください。締めつけの信号があるかないかの違いだけで、どちらも傷んではいません。',
      },
      {
        progress: 1,
        stage: 'circulatory-share',
        // The model's own boundary, said on screen: it has no structural
        // injury in it at all, so it cannot weigh one part against the other.
        // No framing named here on purpose. The scene has its own shot for when
        // two models are on screen, and asking for the single-organ one would
        // hold the pair at a distance chosen for a chain that is no longer what
        // is being drawn.
        // These two labels belong to the scene's comparison, so the steps that
        // say "compare the two kidneys" have to put the second one on screen.
        // Presentation, not physiology: a second model drawn beside this one,
        // with nothing about this one changed.
        compare: true,
        focus: ['thisKidney', 'releasedKidney'],
        certainty: 'established',
        educationalOnly: true,
        title: 'A person’s kidney may also be injured',
        titleJa: '実際には、腎臓自体が傷んでいることもあります',
        body: 'In a person, damage to the kidney itself can be present alongside all of this. There is none of it in this picture, so nothing here can weigh one against the other.',
        bodyJa: '実際には、これらと並んで腎臓そのものの傷みがあることもあります。この絵にはそれが一切ないため、どちらがどれだけかを比べることはできません。',
        look: 'The kidney on screen is undamaged by construction. That is a choice about the model, not a finding about anyone.',
        lookJa: '画面の腎臓は、作りとして傷んでいません。これはモデル上の設定であって、誰かについて分かったことではありません。',
      },
      {
        progress: 1,
        stage: 'circulatory-share',
        // No framing named here on purpose. The scene has its own shot for when
        // two models are on screen, and asking for the single-organ one would
        // hold the pair at a distance chosen for a chain that is no longer what
        // is being drawn.
        // These two labels belong to the scene's comparison, so the steps that
        // say "compare the two kidneys" have to put the second one on screen.
        // Presentation, not physiology: a second model drawn beside this one,
        // with nothing about this one changed.
        compare: true,
        focus: ['thisKidney', 'releasedKidney'],
        certainty: 'associated',
        educationalOnly: true,
        title: 'How far and how fast this goes varies',
        titleJa: 'どこまで、どのくらいの速さで進むかは様々です',
        body: 'This screen shows one path through the changes at a single moment each time. It has no days or weeks in it, and people do not follow one course.',
        bodyJa: 'この画面が示すのは、変化の中の一本の道を、そのつど一瞬ずつ見たものです。日や週といった時間はなく、経過も人によって一様ではありません。',
        look: 'Nothing new is drawn for this step. There is no time anywhere in this picture.',
        lookJa: 'この段階で新しく描かれるものはありません。この絵のどこにも時間はありません。',
      },
    ]),
  }),
  /**
   * The kidney — the one walk in this file that is a **list of alternatives**
   * rather than a sequence.
   *
   * Every other guide here follows one mechanism getting further along. This
   * scene is not built that way and must not be explained that way: it has a
   * `situation` control that selects *which thing has gone wrong* — not enough
   * blood arriving, a damaged lining, a blockage below, a sieve that stopped
   * choosing — and a progression axis that means "how far into **that**". Told
   * as one story, four different diseases read as four stages of one, which is
   * the single worst thing a kidney explanation can teach.
   *
   * **So four of the steps sit at the same position on the axis.** They differ
   * only in the situation, the axis does not move between them, and each one
   * says in its own words that it is a different problem. `src/data/
   * guideModelState.js` knows the difference too: a control that is a `choice`
   * is switching subject, and a control that is a number is not.
   *
   * **The numbers behind the copy are the model's.** Pre-renal takes the
   * filtration from 128 to 66 mL/min while the fraction of sodium excreted
   * *falls* from 0.70 to 0.18 % and the urine concentrates; tubular injury
   * takes it to 14 with sodium excretion rising to 5.5 % and no concentrating
   * at all; obstruction raises the pressure in Bowman's space from 15 to 28
   * mmHg; nephrotic leaves filtration near normal and loses grams of protein.
   * The patient copy says the direction of each and none of the figures.
   *
   * **The last mechanism step is the only one that goes further along the
   * axis**, and it stays on the obstruction it just introduced, because that
   * is the one whose "further along" has a plain meaning: the back-pressure
   * rises until it meets the pressure doing the filtering.
   *
   * The two marked steps carry the thing this scene most needs to refuse. It
   * shows four mechanisms; it does not decide which one anybody has.
   */
  'renal-filtration': Object.freeze({
    title: 'Four different things that go wrong in a kidney',
    titleJa: '腎臓で起きる、4 つの別々の問題',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'intact',
        controls: { situation: 'normal' },
        frame: 'nephron',
        focus: ['glomerulus', 'proximalConvoluted'],
        certainty: 'established',
        title: 'A kidney throws almost everything away, then takes it back',
        titleJa: '腎臓は、いったん捨ててから取り戻します',
        body: 'Blood is filtered at one end into a tube, and almost all of the water and salt in what was filtered is taken back along that tube. Most of the work is the taking back.',
        bodyJa: '血液は一方の端で濾されて管へ入り、濾された水と塩のほとんどは、その管を通るあいだに取り戻されます。仕事の大半は、取り戻すほうです。',
        look: 'Follow the tuft at the top into the tube below it. What leaves the tuft is not what leaves the tube.',
        lookJa: '上の毛玉から、その下の管へと目で追ってください。毛玉を出たものと、管を出るものは違います。',
      },
      {
        progress: 0.5,
        stage: 'compensating',
        // A different problem, not a later stage. The axis does not move here
        // and does not move again until the last mechanism step.
        controls: { situation: 'prerenal' },
        frame: 'nephron',
        focus: ['glomerulus', 'proximalConvoluted'],
        certainty: 'established',
        title: 'One: not enough blood arriving',
        titleJa: 'その 1：血液が足りない',
        body: 'With less blood reaching it, the kidney tightens the vessel leaving the filter so that filtering continues. It also holds on hard to salt and water.',
        bodyJa: '届く血液が減ると、腎臓は濾過器から出ていく血管を締めて、濾過を続けようとします。同時に、塩と水をしっかり抱え込みます。',
        look: 'Watch the vessel on the far side of the tuft narrow. The tube below it is undamaged and is working harder.',
        lookJa: '毛玉の向こう側の血管が細くなるのを見てください。その下の管は傷んでおらず、よく働いています。',
      },
      {
        progress: 0.5,
        stage: 'compensating',
        controls: { situation: 'tubularInjury' },
        frame: 'nephron',
        focus: ['proximalConvoluted', 'loopTip'],
        certainty: 'established',
        title: 'Two: the lining of the tube is damaged',
        titleJa: 'その 2：管の内張りが傷む',
        body: 'A different problem, not a later one. Here the filter is fine and the tube cannot take back what was filtered, so salt and water leave instead of returning.',
        bodyJa: 'これは別の問題であって、続きではありません。濾過器は無事で、管が濾したものを取り戻せません。塩と水は戻らずに出ていきます。',
        look: 'The tube is what changed, not the tuft. Compare it with the step before, where the tube was the healthy part.',
        lookJa: '変わったのは毛玉ではなく管です。管が健常だった前の段階と見比べてください。',
      },
      {
        progress: 0.5,
        stage: 'compensating',
        controls: { situation: 'nephrotic' },
        frame: 'nephron',
        focus: ['glomerulus'],
        certainty: 'established',
        title: 'Three: the sieve stops choosing',
        titleJa: 'その 3：ふるいが選ばなくなる',
        body: 'Again a different problem. The amount being filtered is close to normal, but the filter has stopped holding protein back, so protein goes through it into the tube.',
        bodyJa: 'これもまた別の問題です。濾す量はほぼ正常のまま、濾過器がタンパク質を留めなくなり、タンパク質が管のほうへ通り抜けます。',
        look: 'Watch the tuft, not the tube. Nothing about how much passes has changed — only what is allowed to.',
        lookJa: '管ではなく毛玉を見てください。通る量は変わっていません。変わったのは「何を通すか」です。',
      },
      {
        progress: 0.5,
        stage: 'compensating',
        controls: { situation: 'obstruction' },
        frame: 'nephron',
        focus: ['collectingDuct', 'glomerulus'],
        certainty: 'established',
        title: 'Four: the way out is blocked',
        titleJa: 'その 4：出口がふさがれる',
        body: 'The fourth problem is below the kidney altogether. Nothing about the filter or the tube has changed — what has changed is that the fluid they make cannot get away.',
        bodyJa: '4 つめの問題は、腎臓より下にあります。濾過器も管も変わっていません。変わったのは、作られた液が出ていけないことです。',
        look: 'Look at the bottom of the tube first, and then back up at the tuft. The blockage is at one end and it will be felt at the other.',
        lookJa: 'まず管の下端を見て、それから毛玉へ戻ってください。詰まりは一方の端にあり、影響はもう一方に出ます。',
      },
      {
        progress: 1,
        stage: 'established',
        // The one step that moves along the axis, and it stays on the situation
        // the step before introduced. The model's own result: the pressure in
        // Bowman's space rises from 15 to 28 mmHg and filtration falls with it.
        controls: { situation: 'obstruction' },
        frame: 'nephron',
        focus: ['collectingDuct', 'glomerulus'],
        certainty: 'established',
        title: 'A blockage reaches back up to the filter',
        titleJa: '詰まりは、濾過器まで戻ってきます',
        body: 'Fluid that cannot leave backs up, and the pressure it builds pushes against the pressure doing the filtering. Where the two meet, filtering stops.',
        bodyJa: '出ていけない液はたまり、その圧が、濾過を行っている圧を押し返します。両者が釣り合ったところで、濾過は止まります。',
        look: 'Watch the space around the tuft rather than the tuft itself. That is where the returning pressure is felt.',
        lookJa: '毛玉そのものではなく、そのまわりの空間を見てください。戻ってきた圧を受けるのはそこです。',
      },
      {
        progress: 1,
        stage: 'established',
        // What this scene most needs to refuse. It shows four mechanisms; it
        // does not decide which one anybody has.
        controls: { situation: 'obstruction' },
        frame: 'nephron',
        focus: ['collectingDuct', 'glomerulus'],
        certainty: 'established',
        educationalOnly: true,
        title: 'Which of the four it is, is not on this screen',
        titleJa: 'どの 4 つなのかは、この画面にはありません',
        body: 'These are four separate things that go wrong, and telling them apart in a person is done with tests and history. This picture shows the mechanisms, not the answer.',
        bodyJa: 'この 4 つは別々の問題であり、実際にどれなのかは検査や経過から見分けます。この絵が示すのは仕組みであって、答えではありません。',
        look: 'Nothing new is drawn for this step. The screen shows one mechanism at a time because you chose it, not because it was found.',
        lookJa: 'この段階で新しく描かれるものはありません。仕組みが 1 つずつ映るのは選んだからであって、見つかったからではありません。',
      },
      {
        progress: 1,
        stage: 'established',
        controls: { situation: 'obstruction' },
        frame: 'nephron',
        focus: ['collectingDuct', 'glomerulus'],
        certainty: 'associated',
        educationalOnly: true,
        title: 'What people notice, and how much, varies',
        titleJa: '気づくこと、その程度は様々です',
        body: 'Swelling, passing less water, and tiredness are described in kidney trouble of several kinds. Some people notice very little. None of it is shown here.',
        bodyJa: 'むくみ、尿の量が減ること、だるさは、いろいろな腎臓の不調で語られます。ほとんど気づかない人もいます。どれもここには描かれていません。',
        look: 'Nothing new is drawn for this step. The screen shows one nephron, not a person.',
        lookJa: 'この段階で新しく描かれるものはありません。画面にあるのはネフロン 1 本であって、人ではありません。',
      },
    ]),
  }),
});

export const patientGuideFor = (sceneId) => PATIENT_GUIDES[sceneId] ?? null;
