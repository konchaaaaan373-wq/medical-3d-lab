/**
 * The cirrhosis / portal hypertension scene's walk-through and its challenges.
 *
 * Nothing here asserts a result. Each step and each question sets the model's
 * controls and names the numbers to watch; `tests/portal-hypertension-scene.test.js`
 * re-derives every stored answer from the model, and
 * `tests/portal-haemodynamics.test.js` checks the model against the
 * physiology independently of anything said here.
 *
 * ## Causal order over an equilibrium model
 *
 * The model has no time in it: every state it produces is an equilibrium, and
 * `splanchnicVasodilation` is a control rather than a consequence of the
 * pressure. The walk-through is therefore doing something the model cannot do
 * on its own — it is putting the steps in the order they happen in a patient,
 * and using the model to answer each step's question separately. That is a
 * legitimate division of labour and it is stated here so that no one mistakes
 * the equilibrium for the sequence.
 */

/** The liver the scene is about, once the disease is established. */
const CIRRHOTIC = {
  splanchnicVasodilation: 1,
  dynamicTone: 0,
  collateralPropensity: 1,
  tips: 0,
  haemodynamicPattern: 0,
};

/** Before the collaterals have developed, for the steps that need them absent. */
const NO_COLLATERALS = { ...CIRRHOTIC, collateralPropensity: 0 };
/** The initiating lesion on its own: raised hepatic resistance, nothing else. */
const RESISTANCE_ONLY = { ...NO_COLLATERALS, splanchnicVasodilation: 0 };

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
      controls: { ...RESISTANCE_ONLY },
      progress: 0,
      watch: ['ppg', 'liverFlow', 'resistance'],
      chart: 'pressure-profile',
    },
    {
      id: 'architecture',
      heading: 'It starts in the liver: fibrosis and architectural distortion',
      headingJa: '始まりは肝臓です。線維化と構築の改変',
      because: {
        text: 'Because this is the initiating lesion. Nothing outside the liver has happened yet, and nothing outside the liver needs to have.',
        textJa:
          'これが起点となる病変だからです。この時点で肝外では何も起きていませんし、起きている必要もありません。',
      },
      body:
        'Fibrous septa, regenerative nodules and sinusoidal remodelling distort the vascular architecture of the liver. On top of the fixed obstruction there is a dynamic, reversible component — activated stellate cells contracting, less intrahepatic nitric oxide, more endothelin — which is why a drug can lower portal pressure at all.',
      bodyJa:
        '線維性隔壁・再生結節・類洞のリモデリングが、肝の血管構築を歪めます。この固定した閉塞の上に、可逆的で動的な成分（活性化星細胞の収縮、肝内一酸化窒素の低下、エンドセリンの増加）が重なります。薬剤で門脈圧を下げられるのは、この成分があるからです。',
      controls: { ...RESISTANCE_ONLY },
      progress: 0.5,
      watch: ['resistance', 'ppg', 'liverFlow'],
      chart: 'pressure-profile',
    },
    {
      id: 'gradient',
      heading: 'So the same flow needs more pressure to get through',
      headingJa: 'こうして、同じ血流を通すのにより高い圧が必要になります',
      because: {
        text: 'Because ΔP = Q·R, and R is what has changed. Nothing about Q has moved yet.',
        textJa: 'ΔP = Q·R であり、変わったのは R だからです。Q についてはまだ何も動いていません。',
      },
      body:
        'With the collaterals still absent and the splanchnic bed still normal, the gradient goes where the arithmetic sends it. Note how far, and note that this is the whole cause so far: **increased intrahepatic vascular resistance is the initiating mechanism of portal hypertension**, on its own.',
      bodyJa:
        '側副血行路がまだなく、内臓血管床も正常なままなら、圧較差は算数どおりの値まで上がります。その大きさに注目してください。そしてここまでの原因はこれだけであることにも注目してください。**肝内血管抵抗の上昇が、単独で門脈圧亢進の起点となる機序です。**',
      controls: { ...RESISTANCE_ONLY },
      progress: 1,
      watch: ['ppg', 'resistance', 'liverFlow'],
      chart: 'pressure-profile',
    },
    {
      id: 'adaptation',
      heading: 'Chronic portal hypertension then changes the vessels outside the liver',
      headingJa: '慢性の門脈圧亢進は、次に肝外の血管を変えます',
      because: {
        text: 'Because sustained portal hypertension drives vasodilator signalling in the splanchnic arterial bed — nitric oxide above all. The dilation is a *response* to the pressure, and it comes second.',
        textJa:
          '持続する門脈圧亢進が、内臓動脈床で血管拡張性のシグナル（とりわけ一酸化窒素）を亢進させるためです。この拡張は圧に対する「反応」であり、順序としては後に来ます。',
      },
      body:
        'The splanchnic arterioles dilate and a hyperdynamic circulation develops. This is where the causal order matters most, and where it is most often got wrong: the vasodilation is not a second, parallel cause of portal hypertension — it is a consequence of it. **This model has no time in it, so the vasodilation is a control here rather than something the pressure produces.** Move it yourself, and read it as the step the pressure has already caused.',
      bodyJa:
        '内臓細動脈が拡張し、hyperdynamic circulation が成立します。因果の順序が最も重要で、最も誤られやすいのがここです。この血管拡張は門脈圧亢進の第二の、並列した原因ではありません。門脈圧亢進の結果です。**このモデルには時間がないため、血管拡張はここでは操作項であり、圧が生み出したものとしては表現されていません。** 自分で動かし、「圧がすでに引き起こした段階」として読んでください。',
      controls: { ...NO_COLLATERALS },
      progress: 1,
      watch: ['inflow', 'ppg', 'liverFlow'],
      chart: 'pressure-profile',
    },
    {
      id: 'inflow',
      heading: 'Which sends more blood to a liver that will not take it',
      headingJa: 'その結果、通してもらえない肝臓へより多くの血液が送られます',
      because: {
        text: 'Because a dilated arteriolar bed is a lower resistance between the aorta and the portal vein, and lower resistance at a fixed driving pressure is more flow.',
        textJa:
          '拡張した細動脈床は、大動脈と門脈のあいだの抵抗が下がった状態であり、駆動圧が同じなら抵抗が下がった分だけ流量が増えるためです。',
      },
      body:
        'Splanchnic inflow rises. The outflow it has to leave through is the one that was already obstructed, so the pressure at the portal vein rises again — this time with no further change inside the liver at all.',
      bodyJa:
        '内臓循環からの流入が増えます。その血液が出ていくべき流出路は、すでに閉塞していたその流出路です。したがって門脈の圧は再び上がります。今度は肝臓の内部で何ひとつ変えていないのに、です。',
      controls: { ...NO_COLLATERALS },
      progress: 1,
      watch: ['ppg', 'inflow', 'liverFlow'],
      chart: 'pressure-profile',
    },
    {
      id: 'feed-forward',
      heading: 'And that is a loop, running forwards',
      headingJa: 'これは前向きに回るループです',
      because: {
        text: 'Because the pressure caused the dilation, the dilation raised the inflow, and the raised inflow raises the pressure again.',
        textJa:
          '圧が拡張を引き起こし、拡張が流入を増やし、増えた流入が再び圧を上げるためです。',
      },
      body:
        'Two mechanisms with two different jobs. **The increased intrahepatic resistance is the initiating mechanism**: it is what starts the pressure rising and it is what a treatment aimed at the cause would have to undo. **The increased splanchnic inflow is the perpetuating mechanism**: it keeps the pressure up and drives it higher, and it is what a non-selective beta blocker is aimed at. They are not two halves of one cause, and calling them that would put them in the wrong order.',
      bodyJa:
        '役割の異なる 2 つの機序があります。**肝内血管抵抗の上昇が、起点となる機序**です。圧の上昇を始めさせるのはこれであり、原因に向けた治療が取り除くべきなのもこれです。**内臓循環からの流入増加が、維持・増悪させる機序**です。圧を高く保ち、さらに押し上げるのはこれであり、非選択的 β 遮断薬が狙うのもこれです。両者は 1 つの原因の半分ずつではありません。そう呼ぶことは、順序を取り違えることです。',
      controls: { ...NO_COLLATERALS },
      progress: 1,
      watch: ['ppg', 'inflow', 'resistance'],
      chart: 'pressure-profile',
    },
    {
      id: 'collaterals',
      heading: 'Over months and years, a collateral network becomes established',
      headingJa: '数か月から数年をかけて、側副血行路の血管網が確立します',
      because: {
        text: 'Because a sustained pressure difference between the portal and systemic veins dilates the pre-existing channels that connect them, remodels those vessels, and drives the growth of new ones.',
        textJa:
          '門脈と体循環静脈のあいだの圧差が持続すると、両者をつなぐ既存の経路が拡張し、その血管がリモデリングを起こし、さらに新生血管の形成が進むためです。',
      },
      body:
        'Nothing here happens at a pressure. This is a chronic process — dilatation of pre-existing embryonic channels, vascular remodelling, and angiogenesis — and it takes months to years. The gradient of about ten at which the model has half of it established is a *clinical* threshold: it is where portal hypertension is called clinically significant, and where patients start to be found to have varices. It is not a valve opening.',
      bodyJa:
        'ここには「ある圧で何かが起きる」という現象はありません。これは慢性の過程です。既存の胎生期由来の経路の拡張、血管リモデリング、そして血管新生であり、数か月から数年を要します。モデルでその半分が確立するとした圧較差 10 前後という値は、**臨床的な**閾値です。門脈圧亢進が臨床的に有意と呼ばれ、患者に静脈瘤が見つかり始める水準であって、弁が開く圧ではありません。',
      controls: { ...CIRRHOTIC },
      progress: 1,
      watch: ['ppg', 'collateralFlow', 'shunt'],
      chart: 'flow-destinations',
    },
    {
      id: 'not-enough',
      heading: 'The blood is redistributed and the pressure stays up',
      headingJa: '血液は再分配されますが、圧は高いままです',
      because: {
        text: 'Because a collateral network moves portal blood somewhere else. It does not lower the hepatic resistance behind it, and it does not lower the splanchnic inflow in front of it — and those two are what the pressure is made of.',
        textJa:
          '側副血行路の血管網は門脈血の行き先を変えるだけだからです。その背後にある肝内抵抗を下げるわけでも、手前にある内臓循環からの流入を減らすわけでもありません。圧を作っているのはその 2 つです。',
      },
      body:
        'More than half the splanchnic blood is now bypassing liver tissue, the gradient has come down, and it is still clearly abnormal. Read the reason carefully, because the obvious one is wrong: it is **not** that collaterals are always narrow, high-resistance channels. Some spontaneous portosystemic shunts are wide and carry very large flows, and portal hypertension persists in those patients too. What persists is the pathophysiology driving it — the hepatic resistance and the increased inflow — which a bypass does not touch.',
      bodyJa:
        'いまや内臓循環血の半分以上が肝組織を迂回しており、圧較差は下がっていますが、依然として明らかに異常です。その理由は注意して読んでください。ぱっと思いつく説明のほうが誤りです。「側副血行路は常に細く高抵抗だから」では**ありません**。自然発生の門脈大循環短絡には太く大量の血流を運ぶものもあり、そうした患者でも門脈圧亢進は続きます。続いているのは、それを駆動している病態生理（肝内抵抗と流入の増加）であり、迂回路はそこに触れていないのです。',
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
        text: 'Because HVPG is not measured at the portal vein. HVPG is wedged minus free hepatic venous pressure, and the wedged pressure approximates *sinusoidal* pressure.',
        textJa:
          'HVPG は門脈で測っているのではないためです。HVPG はウェッジ肝静脈圧から自由肝静脈圧を引いた値であり、ウェッジ圧が近似するのは「類洞の」圧です。',
      },
      body:
        'A balloon occludes a hepatic vein branch, flow in it stops, and the static column comes into equilibrium with the sinusoids feeding it — so the wedged pressure *approximates* sinusoidal pressure. It does not measure it directly and it does not measure portal pressure at all. In this liver the two numbers still agree, because nearly all of the resistance is across the sinusoids and the catheter is on the far side of all of it. That agreement is a property of **where the disease is**, not of the technique, which is why HVPG is the gold standard in viral and alcohol-related cirrhosis.',
      bodyJa:
        'バルーンが肝静脈の枝を閉塞させると、その枝の血流が止まり、静止した血柱がそれを灌流している類洞と平衡に達します。したがってウェッジ圧は類洞圧を「近似」します。直接測っているのではなく、門脈圧を測っているわけでもまったくありません。この肝臓では 2 つの値がまだ一致しています。抵抗のほぼすべてが類洞にあり、カテーテルはその向こう側にあるからです。この一致は手技の性質ではなく「病変がどこにあるか」の性質であり、ウイルス性・アルコール性肝硬変で HVPG が gold standard とされるのはそのためです。',
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
        text: 'Because the pressure is now lost before the sinusoids, and the wedged catheter equilibrates with the sinusoids — downstream of where it was lost.',
        textJa:
          '圧が類洞より手前で失われるようになり、ウェッジしたカテーテルは類洞と平衡に達する、つまり圧が失われた場所より下流にあるためです。',
      },
      body:
        'Nothing about how obstructed this liver is has changed — the portal pressure gradient is exactly what it was. Only *where* the resistance sits has moved, and the measured HVPG has collapsed. This is the **presinusoidal intrahepatic** pattern: schistosomiasis, porto-sinusoidal vascular disease, the presinusoidal component of some cholestatic disorders. **Portal vein thrombosis produces the same measurement problem but is a different disease in a different place** — prehepatic, outside the liver entirely, and not modelled here at all. What they share is the consequence: severe portal hypertension with a nearly normal HVPG. The scene withholds the clinical thresholds here, because they were established somewhere else.',
      bodyJa:
        'この肝臓がどれだけ閉塞しているかは何も変わっていません。門脈圧較差はまったく同じです。変わったのは抵抗が「どこにあるか」だけで、測定される HVPG は崩れ落ちました。これが**前類洞性（肝内）**のパターンです。住血吸虫症、門脈・類洞血管疾患 (PSVD)、一部の胆汁うっ滞性疾患の前類洞性要素などが該当します。**門脈血栓症は同じ測定上の問題を起こしますが、別の場所にある別の疾患です。** 肝前性、すなわち完全に肝外の病態であり、ここではモデル化していません。両者に共通するのは結果のほうです。重度の門脈圧亢進がありながら HVPG はほぼ正常になります。ここでシーンは臨床閾値の表示を控えます。それらは別の状況で確立されたものだからです。',
      controls: { ...CIRRHOTIC, haemodynamicPattern: 2 },
      progress: 1,
      watch: ['ppg', 'hvpg', 'missed', 'band'],
      chart: 'pressure-profile',
    },
    {
      id: 'shunt',
      heading: 'A shunt does what a collateral network cannot — and charges for it',
      headingJa: '短絡路は側副血行路の血管網にできないことをします。その代償つきで',
      because: {
        text: 'Because it is short, wide and straight, and it is placed and dilated until the gradient reaches a target rather than growing to whatever the pressure produces.',
        textJa:
          '短く・太く・まっすぐであり、圧が生み出すままに発達するのではなく、圧較差が目標値に達するまで留置し拡張されるためです。',
      },
      body:
        'For a shunt placed to treat variceal bleeding the haemodynamic target is a portosystemic gradient below 12 mmHg — that number belongs here and in the classic association between an HVPG of 12 mmHg or more and variceal bleeding, and nowhere else. Look at the flow through the liver while the gradient falls: most of the portal blood now reaches the systemic circulation without passing hepatocytes at all. The pressure problem and the perfusion problem are traded against each other, and that trade is the whole clinical difficulty of the procedure.',
      bodyJa:
        '静脈瘤出血に対して留置する短絡路では、血行動態的な目標は門脈大循環圧較差 12 mmHg 未満です。この数値が属するのはここと、HVPG 12 mmHg 以上と静脈瘤出血との古典的な関連だけであり、それ以外の場所ではありません。圧較差が下がるあいだ、肝臓を通る血流を見てください。門脈血の大部分が、肝細胞をまったく通らずに体循環へ到達しています。圧の問題と灌流の問題が引き換えになっており、この手技の臨床的な難しさはすべてこの交換にあります。',
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
      text: 'Collaterals **redistribute** portal flow. Adding a path in parallel with the liver does lower the pressure, and in this model that relief is worth roughly half the gradient — but the gradient is still clearly abnormal, and the reason is not the one that first suggests itself. It is **not** that a collateral is always a narrow, high-resistance channel: some spontaneous portosystemic shunts are wide and carry very large flows, and those patients still have portal hypertension. What a bypass cannot do is remove what is generating the pressure. The intrahepatic resistance that initiated it is untouched, and the increased splanchnic inflow that perpetuates it is untouched. Redistributing the flow leaves both of them exactly where they were.',
      textJa:
        '側副血行路は門脈血を**再分配**します。肝臓と並列に経路を加えれば圧はたしかに下がり、このモデルではその減圧は圧較差のおよそ半分にあたります。しかし圧較差は依然として明らかに異常であり、その理由は最初に思いつくものではありません。「側副血行路は常に細く高抵抗だから」では**ありません**。自然発生の門脈大循環短絡には太く大量の血流を運ぶものもあり、そうした患者にもやはり門脈圧亢進があります。迂回路にできないのは、圧を生み出しているものを取り除くことです。それを始めさせた肝内抵抗はそのままであり、それを維持している内臓循環からの流入増加もそのままです。血流を再分配しても、この 2 つはまったく動きません。',
      footnote:
        'The model’s collateral resistance is a calibration constant chosen to land this configuration in the reported range. Treat the size of the relief as illustrative; the reason it is incomplete is not.',
      footnoteJa:
        'このモデルの側副血行路の抵抗値は、この状態を報告されている範囲に収めるために選んだ較正定数です。減圧の大きさは説明用の値として読んでください。減圧が不完全である理由のほうは、そうではありません。',
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
      text: 'The two numbers at the top agree, because this liver’s resistance is sinusoidal. Now switch the model to a presinusoidal intrahepatic liver — the same amount of resistance, sitting upstream of the sinusoids instead of across them. What happens?',
      textJa:
        '上段の 2 つの値は一致しています。この肝臓の抵抗が類洞性だからです。ここでモデルを前類洞性（肝内）の肝臓に切り替えます。抵抗の量は同じで、類洞にではなく類洞より上流にある状態です。何が起きますか。',
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
      control: 'haemodynamicPattern',
      to: 2,
      seconds: 3,
      action: 'Switch to a presinusoidal liver',
      actionJa: '前類洞性の肝臓に切り替える',
      text: 'Switch the haemodynamic pattern to presinusoidal and watch the two gradients.',
      textJa: '血行動態のパターンを前類洞性に切り替え、2 つの圧較差を見てください。',
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
      text: 'HVPG is WHVP − FHVP: wedged minus free hepatic venous pressure. Occluding a hepatic vein branch stops flow in it, and the static column comes into equilibrium with the sinusoids feeding it — so the wedged pressure **approximates** sinusoidal pressure in sinusoidal portal hypertension. It is not a direct measurement of sinusoidal pressure, and it is not a measurement of portal pressure at all. What HVPG therefore reflects is the part of the gradient lying across the sinusoids. In sinusoidal cirrhosis that is nearly all of it, which is why HVPG is the gold standard there. Where a substantial part of the resistance lies upstream of the sinusoids, the pressure is lost before the catheter is looking, and a patient with severe portal hypertension can have a nearly normal HVPG.',
      textJa:
        'HVPG は WHVP − FHVP、すなわちウェッジ肝静脈圧から自由肝静脈圧を引いた値です。肝静脈の枝を閉塞させるとその枝の血流が止まり、静止した血柱がそれを灌流している類洞と平衡に達します。したがって類洞性門脈圧亢進では、ウェッジ圧は類洞圧を**近似**します。類洞圧を直接測っているのではなく、門脈圧を測っているわけでもまったくありません。HVPG が反映するのは、圧較差のうち類洞にかかる部分です。類洞性肝硬変ではそれがほぼ全部であり、だからこそそこでは HVPG が gold standard になります。抵抗のかなりの部分が類洞より上流にある場合には、カテーテルが見ている場所より手前で圧が失われるため、重度の門脈圧亢進がありながら HVPG はほぼ正常になり得ます。',
      footnote:
        'Two different anatomical situations do this and they are not the same disease. **Presinusoidal intrahepatic** — schistosomiasis, porto-sinusoidal vascular disease, the presinusoidal component of some cholestatic disorders — is what this model represents. **Prehepatic** — portal vein thrombosis — is outside the liver altogether and is not modelled here. They share the consequence for the measurement, not the location.',
      footnoteJa:
        'これを起こす解剖学的状況は 2 つあり、同じ疾患ではありません。**前類洞性（肝内）**、すなわち住血吸虫症・門脈・類洞血管疾患 (PSVD)・一部の胆汁うっ滞性疾患の前類洞性要素が、このモデルの表現している病態です。**肝前性**、すなわち門脈血栓症は完全に肝外の病態であり、ここではモデル化していません。両者が共有しているのは測定上の帰結であって、場所ではありません。',
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
      text: 'The gradient fell below 12 mmHg — the haemodynamic target for a shunt placed to treat variceal bleeding, and the level below which variceal bleeding becomes very unlikely — and the portal blood reaching liver tissue fell to a fraction of what it was.',
      textJa:
        '圧較差は 12 mmHg 未満まで下がりました。静脈瘤出血に対して留置した短絡路の血行動態的な目標であり、静脈瘤出血がきわめて起こりにくくなる水準です。同時に、肝組織に到達する門脈血は元のごく一部まで減りました。',
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
