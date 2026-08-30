/**
 * The cirrhosis / portal hypertension scene's walk-through and its challenges.
 *
 * Nothing here asserts a result. Each step and each question sets the model's
 * controls and names the numbers to watch; `tests/portal-hypertension-scene.test.js`
 * re-derives every stored answer from the model.
 */

/** The liver the scene is about, once the disease is established. */
const CIRRHOTIC = {
  splanchnicVasodilation: 1,
  dynamicTone: 0,
  collateralPropensity: 1,
  tips: 0,
  presinusoidalShare: 0,
};

/** Before the collaterals have opened, for the steps that need them shut. */
const NO_COLLATERALS = { ...CIRRHOTIC, collateralPropensity: 0 };

export const CAUSAL_STORY = {
  id: 'portal-hypertension',
  title: 'How the portal pressure gets where it gets',
  titleJa: '門脈圧はどのようにして上がるのか',
  steps: [
    {
      id: 'healthy',
      heading: 'A low-resistance bed, and almost no gradient across it',
      headingJa: '低抵抗の血管床と、ほとんどない圧較差',
      body:
        'A litre of splanchnic blood a minute crosses the liver for a gradient of about three mmHg. That is what a healthy sinusoidal bed is: enormous flow, almost no pressure needed to drive it. Everything that follows is what happens when that stops being true.',
      bodyJa:
        '毎分約 1 L の内臓循環血が、およそ 3 mmHg の圧較差で肝臓を通過します。健常な類洞床とはそういうものです。莫大な血流を、ほとんど圧をかけずに通します。以下はすべて、それが成り立たなくなったときに何が起きるかの話です。',
      controls: { ...NO_COLLATERALS, splanchnicVasodilation: 0 },
      progress: 0,
      watch: ['ppg', 'liverFlow', 'resistance'],
      chart: 'pressure-profile',
    },
    {
      id: 'resistance',
      heading: 'Scar the liver and the same flow needs more pressure',
      headingJa: '肝臓が線維化すると、同じ血流により高い圧が必要になります',
      because: {
        text: 'Because ΔP = Q·R, and nothing has changed about Q yet.',
        textJa: 'ΔP = Q·R であり、この時点で Q については何も変えていないためです。',
      },
      body:
        'Fibrosis and regenerative nodules raise the resistance the portal blood is pushed across, and with the collaterals held shut the gradient goes where the arithmetic sends it. Note how far: this is what portal hypertension would be if there were nowhere else for the blood to go.',
      bodyJa:
        '線維化と再生結節により、門脈血が押し通される抵抗が上昇します。側副血行路を閉じたままにすると、圧較差は算数どおりの値まで上がります。その大きさに注目してください。血液に他の行き場がなかった場合の門脈圧亢進とは、この状態です。',
      controls: { ...NO_COLLATERALS, splanchnicVasodilation: 0 },
      progress: 1,
      watch: ['ppg', 'resistance', 'liverFlow'],
      chart: 'pressure-profile',
    },
    {
      id: 'inflow',
      heading: 'And the splanchnic bed dilates, sending more',
      headingJa: 'さらに内臓血管床が拡張し、より多くを送ります',
      because: {
        text: 'Because ΔP = Q·R has two terms, and the second one moves too — more blood arriving at an outflow that is already obstructed.',
        textJa:
          'ΔP = Q·R には項が 2 つあり、2 つめも動くためです。すでに閉塞した流出路に、より多くの血液が届きます。',
      },
      body:
        'This is the half of portal hypertension that gets left out. The obstruction alone does not explain the pressures that are actually measured; the hyperdynamic splanchnic circulation is not a consequence to be noted afterwards, it is a cause running in parallel.',
      bodyJa:
        'これは門脈圧亢進の説明でしばしば省かれる半分です。閉塞だけでは実際に測定される圧を説明できません。内臓循環の hyperdynamic 化は、あとから付随して起きる結果ではなく、並行して働く原因です。',
      controls: { ...NO_COLLATERALS },
      progress: 1,
      watch: ['ppg', 'inflow', 'liverFlow'],
      chart: 'pressure-profile',
    },
    {
      id: 'collaterals',
      heading: 'Above about ten, the blood finds another way out',
      headingJa: '約 10 を超えると、血液は別の出口を見つけます',
      because: {
        text: 'Because a pressure difference between the portal and systemic veins is exactly what opens the channels that connect them.',
        textJa: '門脈と体循環静脈のあいだの圧差こそが、両者をつなぐ経路を開かせるものだからです。',
      },
      body:
        'Portosystemic collaterals open and take a large share of the portal blood straight to the systemic veins. Watch the gradient: it falls a long way. Watch it again: it is still far above where it started.',
      bodyJa:
        '門脈大循環短絡が開通し、門脈血のかなりの部分を直接体循環静脈へ運びます。圧較差を見てください。大きく下がります。もう一度見てください。それでも出発点よりはるかに高いままです。',
      controls: { ...CIRRHOTIC },
      progress: 1,
      watch: ['ppg', 'collateralFlow', 'shunt'],
      chart: 'flow-destinations',
    },
    {
      id: 'not-enough',
      heading: 'They divert a great deal and decompress very little',
      headingJa: '大量を迂回させても、減圧はわずかです',
      because: {
        text: 'Because a collateral is a long, tortuous, high-resistance channel. Opening one adds a path; it does not add a *low-resistance* path.',
        textJa:
          '側副血行路は長く蛇行した高抵抗の経路だからです。開通すれば経路は増えますが、増えるのは「低抵抗の」経路ではありません。',
      },
      body:
        'This is why portal hypertension does not resolve itself. The system genuinely does find another way out, and the other way out is not good enough. More than half the splanchnic blood is now bypassing liver tissue and the pressure is still in the range where things go wrong.',
      bodyJa:
        '門脈圧亢進が自然に解消しない理由がこれです。系はたしかに別の出口を見つけますが、その出口では足りません。いまや内臓循環血の半分以上が肝組織を迂回していながら、圧は依然として合併症が起きる範囲にあります。',
      controls: { ...CIRRHOTIC },
      progress: 1,
      watch: ['ppg', 'shunt', 'liverFlow'],
      chart: 'flow-destinations',
    },
    {
      id: 'measuring',
      heading: 'Now: what would a measurement of this read?',
      headingJa: 'ここで、この圧を測ると何が読めるのか',
      because: {
        text: 'Because HVPG is not measured at the portal vein. A wedged catheter is in a hepatic vein, and what it reads is *sinusoidal* pressure.',
        textJa:
          'HVPG は門脈で測っているのではないためです。ウェッジしたカテーテルは肝静脈にあり、そこで読めるのは「類洞の」圧です。',
      },
      body:
        'In this liver the two numbers agree, because nearly all of the resistance is across the sinusoids and the wedged catheter is on the far side of all of it. That agreement is what makes HVPG such a good measurement in alcohol-related and viral cirrhosis — and it is a property of *where the disease is*, not of the technique.',
      bodyJa:
        'この肝臓では 2 つの値が一致します。抵抗のほぼすべてが類洞にあり、ウェッジしたカテーテルはその向こう側にあるからです。この一致こそ、アルコール性・ウイルス性肝硬変で HVPG が優れた測定法である理由です。そしてそれは手技の性質ではなく、「病変がどこにあるか」の性質です。',
      controls: { ...CIRRHOTIC },
      progress: 1,
      watch: ['ppg', 'hvpg', 'missed', 'band'],
      chart: 'pressure-profile',
    },
    {
      id: 'presinusoidal',
      heading: 'Move the obstruction upstream and the measurement stops seeing it',
      headingJa: '閉塞を上流に移すと、測定はそれを見なくなります',
      because: {
        text: 'Because the pressure is now lost before the sinusoids, and the wedged catheter is downstream of where it was lost.',
        textJa:
          '圧が類洞より手前で失われるようになり、ウェッジしたカテーテルはその失われた場所より下流にあるためです。',
      },
      body:
        'Nothing about how obstructed this liver is has changed — the portal pressure gradient is exactly what it was. Only *where* the resistance sits has moved, and the measured HVPG has collapsed. This is portal vein thrombosis, schistosomiasis, porto-sinusoidal vascular disease: a patient with severe portal hypertension and a nearly normal HVPG. The scene stops applying the clinical thresholds here, because they were established somewhere else.',
      bodyJa:
        'この肝臓がどれだけ閉塞しているかは何も変わっていません。門脈圧較差はまったく同じです。変わったのは抵抗が「どこにあるか」だけで、測定される HVPG は崩れ落ちました。これが門脈血栓症・住血吸虫症・門脈類洞血管疾患の姿です。重度の門脈圧亢進がありながら HVPG はほぼ正常という患者です。ここでシーンは臨床閾値の適用をやめます。それらは別の状況で確立されたものだからです。',
      controls: { ...CIRRHOTIC, presinusoidalShare: 1 },
      progress: 1,
      watch: ['ppg', 'hvpg', 'missed', 'band'],
      chart: 'pressure-profile',
    },
    {
      id: 'shunt',
      heading: 'A shunt does what a collateral cannot — and charges for it',
      headingJa: '短絡路は側副血行路にできないことをします。その代償つきで',
      because: {
        text: 'Because it is short, wide and straight, so it is a genuinely low-resistance path in a way a collateral never is.',
        textJa:
          '短く・太く・まっすぐであり、側副血行路が決してならない意味で本当に低抵抗な経路だからです。',
      },
      body:
        'The gradient falls below the range where variceal bleeding happens, which is what a TIPS is for. Look at the flow through the liver while it does: most of the portal blood now reaches the systemic circulation without passing hepatocytes at all. The pressure problem and the perfusion problem are traded against each other, and that trade is the whole clinical difficulty of the procedure.',
      bodyJa:
        '圧較差は静脈瘤出血が起きる範囲より下まで下がります。TIPS の目的はまさにそれです。同時に肝臓を通る血流を見てください。門脈血の大部分が、肝細胞をまったく通らずに体循環へ到達しています。圧の問題と灌流の問題が引き換えになっており、この手技の臨床的な難しさはすべてこの交換にあります。',
      controls: { ...CIRRHOTIC, tips: 1 },
      progress: 1,
      watch: ['ppg', 'liverFlow', 'tipsFlow', 'shunt'],
      chart: 'flow-destinations',
    },
  ],
};

export const LEARNING_MODULES = [
  {
    id: 'collaterals-do-not-fix-it',
    title: 'Whether collaterals fix the problem',
    titleJa: '側副血行路は問題を解決するのか',
    short: 'Collaterals',
    shortJa: '側副血行路',
    setup: { progress: 1, ...NO_COLLATERALS },
    question: {
      text: 'This cirrhotic portal system has nowhere to send its blood but through the liver, and the gradient is very high. Now let portosystemic collaterals open. What happens to the gradient?',
      textJa:
        'この肝硬変の門脈系には肝臓を通る以外に血液の行き場がなく、圧較差は非常に高くなっています。ここで門脈大循環短絡が開通します。圧較差はどうなりますか。',
      options: [
        { id: 'halves', label: 'It roughly halves, and stays clearly abnormal', labelJa: 'ほぼ半減するが、明らかに異常なまま' },
        { id: 'normal', label: 'It returns to near normal', labelJa: 'ほぼ正常まで戻る' },
        { id: 'little', label: 'It barely moves', labelJa: 'ほとんど変わらない' },
      ],
      answer: 'halves',
    },
    manipulation: {
      control: 'collateralPropensity',
      to: 1,
      seconds: 3,
      action: 'Let the collaterals open',
      actionJa: '側副血行路を開通させる',
      text: 'Allow portosystemic collaterals to form, and watch both the gradient and where the blood goes.',
      textJa: '門脈大循環短絡の形成を許可し、圧較差と血液の行き先の両方を見てください。',
      hint: 'Watch how much blood they carry, then watch how little pressure that bought.',
      hintJa: 'どれだけの血液を運ぶかを見てから、それがどれだけの減圧しか買えなかったかを見てください。',
    },
    watch: ['ppg', 'collateralFlow', 'shunt', 'liverFlow'],
    observation: {
      text: 'They took roughly half the pressure off and diverted well over half of the splanchnic blood — and left the gradient in the range where varices bleed.',
      textJa:
        '圧はおよそ半分に下がり、内臓循環血の半分以上が迂回されました。それでも圧較差は、静脈瘤が出血する範囲に残っています。',
    },
    explanation: {
      text: 'A collateral is a long, tortuous, high-resistance channel. Opening one adds a path in parallel with the liver, and adding a path always lowers the pressure — but how much depends on how good the path is, and these are not good paths. The system genuinely does find another way out, and the other way out is not good enough. That is why portal hypertension does not resolve itself.',
      textJa:
        '側副血行路は長く蛇行した高抵抗の経路です。開通すれば肝臓と並列に経路が加わり、経路が増えれば圧は必ず下がります。しかしどれだけ下がるかはその経路の質次第で、これは質のよい経路ではありません。系はたしかに別の出口を見つけますが、その出口では足りません。門脈圧亢進が自然に解消しない理由です。',
      footnote:
        'And the price of the diversion is on the other read-out: the blood that took the collaterals did not pass through liver tissue.',
      footnoteJa:
        'そして迂回の代償は別の行に出ています。側副血行路を通った血液は、肝組織を通っていません。',
    },
    transfer: {
      /** The same collaterals, on a liver that has only just started to scar. */
      atStage: 'scarring',
      metric: 'ppg',
      unit: 'mmHg',
      digits: 1,
      rows: [
        { label: 'Established cirrhosis', labelJa: '確立した肝硬変' },
        { label: 'Early scarring', labelJa: '線維化の初期' },
      ],
      text: 'Now let the same collaterals open on a liver only a third of the way along. Do they take off more pressure, the same, or less?',
      textJa:
        '次に、進行度が 3 分の 1 程度の肝臓で同じ側副血行路を開通させます。下がる圧は、より大きい・同じ・より小さい、のどれですか。',
      options: [
        { id: 'less', label: 'Less', labelJa: 'より小さい' },
        { id: 'same', label: 'About the same', labelJa: '同じくらい' },
        { id: 'more', label: 'More', labelJa: 'より大きい' },
      ],
      answer: 'less',
      explanation: {
        text: 'Collaterals open in proportion to the gradient that is opening them, so a lower gradient opens fewer of them and they carry less. The relief they give is not a fixed amount subtracted from the pressure — it is a response that grows with the problem, and never grows enough to solve it.',
        textJa:
          '側副血行路は、それを開かせている圧較差に応じて開通します。圧較差が低ければ開通は少なく、運ぶ量も少なくなります。側副血行路がもたらす減圧は、圧から一定量を差し引くものではありません。問題とともに大きくなる応答であり、しかし問題を解決するほどには決して大きくなりません。',
      },
    },
    outro: {
      text: 'A system that compensates is not the same as a system that has compensated.',
      textJa: '代償しようとしている系と、代償できている系は、同じではありません。',
    },
  },
  {
    id: 'hvpg-versus-gradient',
    title: 'What HVPG is measuring',
    titleJa: 'HVPG は何を測っているのか',
    short: 'HVPG',
    shortJa: 'HVPG',
    setup: { progress: 1, ...CIRRHOTIC },
    question: {
      text: 'The two numbers at the top agree, because this liver’s resistance is sinusoidal. Now move all of that resistance upstream of the sinusoids, changing nothing about how much of it there is. What happens?',
      textJa:
        '上段の 2 つの値は一致しています。この肝臓の抵抗が類洞性だからです。ここで、抵抗の量は変えずに、そのすべてを類洞より上流へ移します。何が起きますか。',
      options: [
        {
          id: 'hvpg-falls',
          label: 'The gradient is unchanged; the measured HVPG collapses',
          labelJa: '圧較差は変わらず、測定される HVPG が崩れ落ちる',
        },
        { id: 'both-fall', label: 'Both fall — the liver is less obstructed', labelJa: '両方下がる（閉塞が軽くなるため）' },
        { id: 'nothing', label: 'Neither changes; it is the same resistance', labelJa: 'どちらも変わらない（同じ抵抗だから）' },
      ],
      answer: 'hvpg-falls',
    },
    manipulation: {
      control: 'presinusoidalShare',
      to: 1,
      seconds: 3,
      action: 'Move the resistance upstream',
      actionJa: '抵抗を上流へ移す',
      text: 'Move the whole intrahepatic resistance to the presinusoidal side and watch the two gradients.',
      textJa: '肝内抵抗のすべてを類洞前側へ移し、2 つの圧較差を見てください。',
      hint: 'The pressure profile plot shows where the drop is. Watch which segment it moves into.',
      hintJa: '圧プロファイルの図は、どこで圧が落ちているかを示します。落差がどの区間に移るかを見てください。',
    },
    watch: ['ppg', 'hvpg', 'missed', 'band'],
    observation: {
      text: 'The portal pressure gradient did not move at all. The measured HVPG fell to near normal, and the scene stopped offering a clinical band.',
      textJa:
        '門脈圧較差はまったく動きませんでした。測定される HVPG はほぼ正常まで下がり、シーンは臨床区分の表示をやめました。',
    },
    explanation: {
      text: 'HVPG is wedged minus free hepatic venous pressure, and the wedged pressure reflects the *sinusoids*. It therefore measures only the part of the gradient that lies across them. In sinusoidal cirrhosis that is nearly all of it, which is why HVPG is such a good measurement there. In presinusoidal disease — portal vein thrombosis, schistosomiasis, porto-sinusoidal vascular disease — the pressure is lost upstream of where the catheter is looking, and a patient with severe portal hypertension can have a nearly normal HVPG.',
      textJa:
        'HVPG はウェッジ肝静脈圧から自由肝静脈圧を引いたものであり、ウェッジ圧が反映するのは「類洞」です。したがって測っているのは、圧較差のうち類洞にかかる部分だけです。類洞性肝硬変ではそれがほぼ全部であり、だからこそ HVPG は優れた測定になります。類洞前性の疾患（門脈血栓症・住血吸虫症・門脈類洞血管疾患）では、カテーテルが見ている場所より上流で圧が失われるため、重度の門脈圧亢進がありながら HVPG はほぼ正常になり得ます。',
      footnote:
        'The Baveno thresholds are defined on HVPG and were established in sinusoidal disease. That is why they are withheld here rather than applied to a number that would be wrong.',
      footnoteJa:
        'Baveno の閾値は HVPG に対して定義され、類洞性の疾患で確立されました。ここで閾値を表示しないのは、誤った値に適用しないためです。',
    },
    outro: {
      text: 'A measurement is a measurement of something in particular. Knowing which quantity a number is, and where in the circulation it was taken, is not a technicality.',
      textJa:
        '測定とは、何か特定のものの測定です。ある数値がどの量であり、循環のどこで取られたのかを知ることは、些末な技術的問題ではありません。',
    },
  },
  {
    id: 'shunt-trade',
    title: 'What a shunt buys and what it costs',
    titleJa: '短絡路が買うものと、支払うもの',
    short: 'TIPS',
    shortJa: 'TIPS',
    setup: { progress: 1, ...CIRRHOTIC },
    question: {
      text: 'A TIPS is a short, wide stent from the portal vein straight to a hepatic vein. It will certainly bring the gradient down. What happens to the portal blood that actually reaches liver tissue?',
      textJa:
        'TIPS は門脈から肝静脈へ直接つなぐ短く太いステントです。圧較差は確実に下がります。では、実際に肝組織に到達する門脈血はどうなりますか。',
      options: [
        { id: 'falls', label: 'It falls sharply — most of the blood takes the shunt', labelJa: '大きく減る（大部分が短絡路を通る）' },
        { id: 'rises', label: 'It rises — the liver is decompressed', labelJa: '増える（肝臓の減圧により）' },
        { id: 'same', label: 'It is roughly unchanged', labelJa: 'ほぼ変わらない' },
      ],
      answer: 'falls',
    },
    manipulation: {
      control: 'tips',
      to: 1,
      seconds: 3,
      action: 'Place the shunt',
      actionJa: '短絡路を作成する',
      text: 'Open a fully dilated shunt and watch both the gradient and the flow through the liver.',
      textJa: '完全に拡張した短絡路を開通させ、圧較差と肝臓を通る血流の両方を見てください。',
      hint: 'The flow plot has three destinations. Watch which one grows and which one shrinks.',
      hintJa: '血流の図には行き先が 3 つあります。どれが増え、どれが減るかを見てください。',
    },
    watch: ['ppg', 'liverFlow', 'tipsFlow', 'shunt'],
    observation: {
      text: 'The gradient fell below the range where varices bleed, which is what the procedure is for — and the portal blood reaching liver tissue fell to a fraction of what it was.',
      textJa:
        '圧較差は静脈瘤が出血する範囲より下まで下がりました。手技の目的はまさにそれです。同時に、肝組織に到達する門脈血は元のごく一部まで減りました。',
    },
    explanation: {
      text: 'A shunt works where collaterals do not for one reason: it is genuinely low-resistance, so it takes most of the flow at a small pressure difference. But taking most of the flow is exactly what it does — the blood that goes through it does not go through the liver. The pressure problem and the perfusion problem are being traded against each other, and that trade is the whole clinical difficulty of the procedure rather than a side effect of it.',
      textJa:
        '短絡路が側副血行路にできないことをできる理由は 1 つです。本当に低抵抗であるため、小さな圧差で大部分の血流を引き受けます。しかし「大部分の血流を引き受ける」ことこそが、まさに起きていることです。そこを通った血液は肝臓を通りません。圧の問題と灌流の問題が引き換えになっているのであり、この交換はこの手技の副作用ではなく、臨床的な難しさそのものです。',
      footnote:
        'What follows from losing that perfusion is not in this model, and the scene does not claim it.',
      footnoteJa: 'その灌流を失った結果として何が起きるかは、このモデルにはありません。シーンもそれを主張しません。',
    },
    outro: {
      text: 'A treatment that fixes the number you were watching can be moving a number you were not.',
      textJa: '見ていた数値を直す治療が、見ていなかった数値を動かしていることがあります。',
    },
  },
];
