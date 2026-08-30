/**
 * The COPD scene's walk-through and its challenges.
 *
 * Both work the same way and it matters: **neither of them asserts a result.**
 * Each step and each question sets the model's controls and then names the
 * numbers to watch, and the numbers come from the model at the moment they are
 * read. If the physiology changed, the walk-through would say something
 * different, and the tests in `tests/copd-scene.test.js` re-derive every stored
 * answer here from the model so that it cannot quietly stop being true.
 *
 * That is internal consistency, and by itself it is not enough. An earlier
 * version of this file was internally consistent and medically wrong: the
 * model answered a question, the lesson was written around the answer, the
 * tests confirmed the lesson matched the model, and the resulting general
 * proposition — that narrowing airways does not trap gas — was false. The
 * external constraints the model now has to satisfy are written down as tests
 * of their own, in `tests/respiratory-physiology.test.js`.
 */

/** Where the walk-through starts: an ordinary lung, at rest. */
const HEALTHY = { airwayResistance: 1, elasticRecoil: 1, expiratoryPressureCmH2O: 0, bronchodilation: 0 };
/** And the lung it is about. */
const OBSTRUCTED = { airwayResistance: 3, elasticRecoil: 0.6, expiratoryPressureCmH2O: 0, bronchodilation: 0 };
/**
 * Narrowed airways in a lung whose elastic recoil is intact — the condition
 * induced bronchoconstriction produces, and the one that shows that a longer
 * time constant is on its own enough to raise end-expiratory volume.
 */
const NARROWED = { airwayResistance: 2, elasticRecoil: 1, expiratoryPressureCmH2O: 0, bronchodilation: 0 };

/**
 * Eight steps, each one the cause of the next.
 *
 * The `because` line is the link back — the reason this step follows from the
 * one before — and it is the spine of the whole sequence. A step that cannot
 * be given one is not part of a chain of causes, and should not be here.
 */
export const CAUSAL_STORY = {
  id: 'copd-hyperinflation',
  title: 'From a slow lung to a lung with no room left',
  titleJa: '吐き切れない肺から、吸う余地のない肺へ',
  steps: [
    {
      id: 'passive',
      heading: 'Breathing out is passive',
      headingJa: '呼気は受動的です',
      body:
        'Inspiration is muscular; expiration, at rest, is the lung giving back what inspiration stored in it. Nothing pushes. That is why how fast a lung empties is, at rest, a property of the lung rather than of how much the person wants it to.',
      bodyJa:
        '吸気は筋の仕事ですが、安静時の呼気は、吸気で蓄えられた分を肺が返しているだけです。押し出しているわけではありません。だからこそ、安静時に肺が吐き切る速さは、本人の意思ではなく肺自身の性質で決まります。',
      controls: { ...HEALTHY },
      progress: 0,
      watch: ['tau', 'te', 'tauCount', 'pexp'],
      chart: 'volume-time',
    },
    {
      id: 'time-constant',
      heading: 'How fast it gives it back is R × C',
      headingJa: '返す速さは R × C で決まります',
      because: {
        text: 'Because emptying is passive, its speed is set by the resistance the gas leaves through and the compliance holding it.',
        textJa: '呼気が受動的である以上、その速さは、気体が通る抵抗と、それを保持しているコンプライアンスで決まります。',
      },
      body:
        'Narrow the airways alone — resistance doubled, elastic recoil untouched — and the time constant doubles with it. Either term will do this: raising R lengthens τ exactly as much as raising C does. In COPD both have moved, and later steps use a lung where they have; here it is only the airways.',
      bodyJa:
        '気道だけを狭くします。抵抗を 2 倍にし、弾性収縮力には手を触れません。それだけで時定数も 2 倍になります。τ = R·C ですから、R を上げても C を上げても同じだけ延びます。COPD では両方が動いていますし、後の段ではその肺を使いますが、ここで変えたのは気道だけです。',
      controls: { ...NARROWED },
      progress: 0,
      watch: ['tau', 'te', 'tauCount'],
      chart: 'volume-time',
    },
    {
      id: 'time-runs-out',
      heading: 'Working harder takes the time away',
      headingJa: '運動は、その時間を奪います',
      because: {
        text: 'Because breathing faster shortens expiration before it shortens anything else.',
        textJa: '呼吸が速くなると、他のどの相よりも先に呼気時間が削られるためです。',
      },
      body:
        'The rate rises with the ventilation being asked for, the cycle shortens, and expiration — the long, passive part — gives up most of the time that was lost. Emptying needs about three time constants; watch how few are left.',
      bodyJa:
        '要求換気量が上がると呼吸数が上がり、周期が短くなります。そのとき削られる時間の大半を負担するのは、長く受動的な呼気相です。吐き切るにはおよそ 3 τ が必要ですが、残りがどれだけかを見てください。',
      controls: { ...NARROWED },
      progress: 0.6,
      watch: ['te', 'tau', 'tauCount', 'eelv'],
      chart: 'volume-time',
    },
    {
      id: 'stacking',
      heading: 'What is not given back is still there',
      headingJa: '吐き切れなかった分は、そこに残ります',
      because: {
        text: 'Because the next inspiration starts from wherever the last expiration got to.',
        textJa: '次の吸気は、前の呼気が到達したところから始まるためです。',
      },
      body:
        'Breath after breath, the volume the lung rests at climbs — until the extra recoil at that higher volume is finally enough to push the tidal volume out in the time available. That balance point is dynamic hyperinflation. Note what has *not* happened here: this lung has all of its elastic recoil, and nothing is leaving at the flow ceiling. Narrowed airways and a short expiration were sufficient on their own. This is why an asthma attack hyperinflates a lung whose recoil is normal.',
      bodyJa:
        '呼吸を重ねるごとに安静位は上昇していき、やがて、その高い容量で得られる余分な弾性収縮力が、与えられた時間内に一回換気量を押し出せるところで釣り合います。この均衡点が動的過膨張です。ここで「起きていないこと」に注意してください。この肺の弾性収縮力は正常で、流量上限に達している呼気もありません。気道の狭窄と呼気時間の不足だけで十分だったのです。弾性収縮力が正常な肺でも喘息発作が過膨張を起こすのは、このためです。',
      controls: { ...NARROWED },
      progress: 0.6,
      watch: ['eelv', 'ic', 'limited'],
      chart: 'volume-time',
    },
    {
      id: 'effort',
      heading: 'Pushing on the way out can undo some of it',
      headingJa: '呼気を押し出せば、ある程度は取り戻せます',
      because: {
        text: 'Because expiratory muscle pressure adds to elastic recoil at the alveolus, and more driving pressure across the same resistance is more flow.',
        textJa:
          '呼気筋圧は肺胞で弾性収縮力に上乗せされ、同じ抵抗にかかる駆動圧が増えれば流量も増えるためです。',
      },
      body:
        'Add fifteen centimetres of water of expiratory muscle pressure to the same lung at the same workload. The resting volume comes back down — a long way down. Effort is a real mechanism and it is a separate one: nothing about the resistance, the recoil or the expiratory time has changed. This is why a lung that has only narrowed airways can defend its operating volume, if the person pushes.',
      bodyJa:
        '同じ肺・同じ負荷に、15 cmH₂O の呼気筋圧を加えます。安静位は下がります。しかもかなり下がります。呼気努力は実在する機序であり、独立した機序です。抵抗も弾性収縮力も呼気時間も変えていません。気道が狭くなっただけの肺が、本人が押し出せば動作肺気量を守れるのは、このためです。',
      controls: { ...NARROWED, expiratoryPressureCmH2O: 15 },
      progress: 0.6,
      watch: ['pexp', 'eelv', 'ic', 'limited'],
      chart: 'flow-volume',
    },
    {
      id: 'recoil',
      heading: 'Losing elastic recoil closes that door',
      headingJa: '弾性収縮力を失うと、その手段が使えなくなります',
      because: {
        text: 'Because the maximal expiratory flow is elastic recoil divided by the resistance of the airway upstream of the equal pressure point — and losing recoil lowers the numerator and raises the denominator at once.',
        textJa:
          '最大呼気流量は「弾性収縮力 ÷ equal pressure point より上流の気道抵抗」であり、弾性収縮力を失うと分子が下がると同時に分母が上がるためです。',
      },
      body:
        'Take the recoil down to sixty per cent — emphysema, on top of the same narrowed airways. Three things happen together: the time constant lengthens again, the relaxed volume itself rises, and the flow ceiling drops into the range tidal breathing needs. Now most of the breath is leaving at the ceiling, and the fifteen centimetres of water that worked a moment ago moves almost nothing. Raising pleural pressure raises the pressure driving the gas out and the pressure squeezing the airway shut by the same amount, and past the equal pressure point the two cancel.',
      bodyJa:
        '弾性収縮力を 60% まで下げます。同じ狭い気道に肺気腫が加わった状態です。3 つのことが同時に起こります。時定数がさらに延び、弛緩位そのものが上がり、そして流量上限が安静換気の必要とする範囲まで下がります。いまや呼気の大半が上限に達しており、先ほど効いた 15 cmH₂O はほとんど何も動かしません。胸腔内圧を上げると、気体を押し出す圧と気道を押しつぶす圧が同じだけ上がり、equal pressure point より下流では互いに打ち消し合うからです。',
      controls: { ...OBSTRUCTED, expiratoryPressureCmH2O: 15 },
      progress: 0.6,
      watch: ['limited', 'eelv', 'tau', 'ic'],
      chart: 'flow-volume',
    },
    {
      id: 'no-room',
      heading: 'The room to breathe in closes from above',
      headingJa: '吸う余地が、上から狭まります',
      because: {
        text: 'Because total lung capacity has barely moved, and the floor the breath starts from has.',
        textJa: '全肺気量はほとんど変わらないのに、呼吸を始める床の高さが上がったためです。',
      },
      body:
        'Inspiratory capacity is what is left between where the lung rests and what it can hold, and it is falling. The tidal breath is being taken on the flat part of the pressure-volume curve, and the diaphragm — held down and pushed flat by a chest that never empties — is a worse muscle in that position than it was in its domed one.',
      bodyJa:
        '最大吸気量とは、肺の安静位と保持できる容量の差であり、いま低下しつつあります。一回換気は圧-容量曲線の平坦部で行われ、さらに、吐き切れない胸郭に押されて下がり平坦化した横隔膜は、ドーム状のときより不利な筋になっています。',
      controls: { ...OBSTRUCTED },
      progress: 0.6,
      watch: ['ic', 'eelv', 'tlc'],
      chart: 'volume-time',
    },
    {
      id: 'ceiling',
      heading: 'So the ventilation asked for stops arriving',
      headingJa: 'こうして、要求された換気量は届かなくなります',
      because: {
        text: 'Because the only ways left to raise ventilation — a bigger breath, a faster one, a harder push — are all closed at once.',
        textJa:
          '換気量を上げる残された手段（大きく吸う・速く吸う・強く吐く）が、すべて同時にふさがれてしまうためです。',
      },
      body:
        'A bigger breath needs inspiratory capacity, which has gone. A faster one shortens expiration further, which makes it worse. A harder push meets the ceiling. The drive is at its maximum and the ventilation being demanded is not being produced — which is what stops the walk, and it is nothing to do with the legs.',
      bodyJa:
        '大きく吸うには最大吸気量が要りますが、それは失われています。速く吸えば呼気時間がさらに短くなり、事態は悪化します。強く吐けば上限に当たります。呼吸ドライブは最大に達したまま、要求された換気量は満たされません。歩行が止まるのはこのためであり、脚の問題ではありません。',
      controls: { ...OBSTRUCTED },
      progress: 1,
      watch: ['ve', 'demand', 'pmus', 'ic'],
      chart: 'volume-time',
    },
  ],
};

/**
 * Three challenges: predict, do it to the model, see what happened, find out why.
 *
 * Every stored answer is checked against the model by
 * `tests/copd-scene.test.js`, and the propositions the challenges teach are
 * checked against the physiology literature by
 * `tests/respiratory-physiology.test.js`. A lesson here has to survive both.
 */
export const LEARNING_MODULES = [
  {
    id: 'resistance-alone',
    title: 'What narrowing the airways does on its own',
    titleJa: '気道を狭くするだけで何が起きるか',
    short: 'Resistance',
    shortJa: '気道抵抗',
    setup: { progress: 0.6, ...HEALTHY },
    question: {
      text: 'Someone with ordinary lungs is working steadily, asking for about thirty litres a minute. Double their airway resistance — elastic recoil untouched, breathing pattern unchanged, expiratory effort unchanged. What happens to the volume their lung rests at between breaths?',
      textJa:
        '正常な肺の人が、分時換気量 30 L 程度を要する運動を続けています。気道抵抗だけを 2 倍にします。弾性収縮力はそのまま、呼吸パターンもそのまま、呼気努力もそのままです。呼吸と呼吸の間に肺が落ち着く容量はどうなりますか。',
      options: [
        { id: 'rises', label: 'It rises — gas is not all given back', labelJa: '上がる（吐き切れない分が残る）' },
        { id: 'barely', label: 'It barely moves', labelJa: 'ほとんど変わらない' },
        { id: 'falls', label: 'It falls slightly', labelJa: 'わずかに下がる' },
      ],
      answer: 'rises',
    },
    manipulation: {
      control: 'airwayResistance',
      to: 2,
      seconds: 3,
      action: 'Narrow the airways',
      actionJa: '気道を狭くする',
      text: 'Raise airway resistance to twice normal. Nothing else moves.',
      textJa: '気道抵抗を正常の 2 倍まで上げます。ほかは何も動かしません。',
      hint: 'Watch the time constant, then how many of them expiration is being given, then the resting volume.',
      hintJa: 'まず時定数、次に呼気時間がその何倍あるか、最後に安静位を見てください。',
    },
    watch: ['tau', 'tauCount', 'eelv', 'limited'],
    observation: {
      text: 'The time constant doubled, the time available did not, and the resting volume climbed. The fraction of the breath leaving at the flow ceiling stayed at zero throughout.',
      textJa:
        '時定数は 2 倍になり、使える時間は変わらず、安静位は上昇しました。流量上限に達して出ていく呼気の割合は、最初から最後までゼロのままです。',
    },
    explanation: {
      text: 'τ = R·C, and R is half of that product. A lung that needs about three time constants to empty, and is given fewer, does not finish; what it did not give back is there when the next breath starts, and the resting volume climbs until the extra recoil at the higher volume closes the gap. Elastic recoil never changed and flow limitation never appeared, so neither of them is part of this. Airway narrowing on its own, at a fixed breathing pattern and a fixed expiratory effort, is sufficient — which is why induced bronchoconstriction produces dynamic hyperinflation in asthma, in lungs whose recoil is normal.',
      textJa:
        'τ = R·C であり、R はその積の半分です。吐き切るのにおよそ 3 τ を要する肺に、それより短い時間しか与えなければ、吐き切れません。返せなかった分は次の呼吸が始まる時点で残っており、高くなった容量で得られる余分な弾性収縮力が不足を埋めるところまで、安静位は上がり続けます。弾性収縮力は一度も変えていませんし、流量制限も現れていません。したがってどちらもこの現象の条件ではありません。呼吸パターンと呼気努力を固定すれば、気道の狭窄だけで十分なのです。弾性収縮力が正常な喘息の肺で、誘発された気管支収縮が動的過膨張を起こすのは、このためです。',
      footnote:
        'What the model asserts is the direction, not the size. How much a particular lung traps depends on the pattern it adopts and on how hard the person breathes out — both of which are separate controls here, and both of which were held still.',
      footnoteJa:
        'モデルが主張しているのは方向であって、大きさではありません。ある肺がどれだけ溜め込むかは、採用する呼吸パターンと呼気努力の強さに依存します。どちらもこのモデルでは独立した操作項であり、ここでは固定してあります。',
    },
    transfer: {
      /** Same manipulation, on a lung that has also lost its recoil. */
      metric: 'eelv',
      unit: 'L',
      digits: 2,
      controls: { elasticRecoil: 0.6 },
      rows: [
        { label: 'Normal recoil', labelJa: '弾性収縮力 正常' },
        { label: 'Recoil at 60%', labelJa: '弾性収縮力 60%' },
      ],
      text: 'Now take the elastic recoil down to sixty per cent and narrow the airways again, at the same workload. Where does the lung end up resting?',
      textJa:
        '次に弾性収縮力を 60% まで下げ、同じ負荷でもう一度気道を狭くします。肺の安静位はどこに落ち着きますか。',
      options: [
        { id: 'higher', label: 'Higher still', labelJa: 'さらに高くなる' },
        { id: 'same', label: 'About the same', labelJa: '同じくらい' },
        { id: 'lower', label: 'Lower', labelJa: '下がる' },
      ],
      answer: 'higher',
      explanation: {
        text: 'Losing recoil adds to the same result by three separate routes. It raises compliance, so τ lengthens again. It raises the volume the relaxed lung sits at, so the whole breath moves upwards before any trapping is counted. And it lowers the flow ceiling into the range tidal breathing needs, which is what takes away the one compensation the previous lung still had. COPD is not "narrow airways instead of lost recoil" or "lost recoil instead of narrow airways" — it is both, and each of them would raise the operating volume on its own.',
        textJa:
          '弾性収縮力の低下は、3 つの別々の経路から同じ結果に上乗せします。コンプライアンスが上がるので τ がさらに延びます。弛緩位そのものが上がるので、エアトラッピングを数える前から呼吸全体が上方にずれます。そして流量上限が安静換気の必要とする範囲まで下がり、前の肺に残されていた唯一の代償手段が失われます。COPD は「弾性収縮力の低下ではなく気道狭窄」でも「気道狭窄ではなく弾性収縮力の低下」でもありません。両方であり、そのどちらもが単独で動作肺気量を上げます。',
      },
    },
    outro: {
      text: 'Resistance and recoil are two separate ways into the same equilibrium. Knowing which one a given lung got there by is what tells you whether pushing harder, or a bronchodilator, will help.',
      textJa:
        '抵抗と弾性収縮力は、同じ均衡点に至る 2 つの別々の経路です。目の前の肺がどちらの経路で来たのかを知ることが、呼気努力や気管支拡張薬が効くかどうかを分けます。',
    },
  },
  {
    id: 'effort-and-its-limit',
    title: 'When breathing out harder helps, and when it stops',
    titleJa: '強く吐くのが効くとき、効かなくなるとき',
    short: 'Effort',
    shortJa: '呼気努力',
    setup: { progress: 0.6, ...NARROWED },
    question: {
      text: 'This lung has narrowed airways and normal elastic recoil, and it is hyperinflating at a moderate workload. The person now pushes on the way out — fifteen centimetres of water of expiratory muscle pressure. What happens to the volume the lung rests at?',
      textJa:
        'この肺は気道が狭く、弾性収縮力は正常で、中等度の負荷で過膨張しています。ここで本人が呼気を押し出します（呼気筋圧 15 cmH₂O）。肺の安静位はどうなりますか。',
      options: [
        { id: 'falls', label: 'It falls substantially — the effort works', labelJa: 'はっきり下がる（努力が効く）' },
        { id: 'barely', label: 'It barely moves — expiration is effort-independent', labelJa: 'ほとんど動かない（呼気は努力非依存）' },
        { id: 'rises', label: 'It rises — pushing collapses the airways', labelJa: '上がる（押すと気道が潰れる）' },
      ],
      answer: 'falls',
    },
    manipulation: {
      control: 'expiratoryPressureCmH2O',
      to: 15,
      seconds: 3,
      action: 'Push the air out',
      actionJa: '呼気を押し出す',
      text: 'Add fifteen centimetres of water of expiratory muscle pressure, and watch the flow-volume loop.',
      textJa: '呼気筋圧を 15 cmH₂O 加え、流量-容量曲線を見てください。',
      hint: 'The dashed line is the most flow this lung can produce at each volume. Notice how far below it the breath still is.',
      hintJa: '破線は各容量でこの肺が出せる最大流量です。呼吸がまだどれだけ下にあるかに注目してください。',
    },
    watch: ['eelv', 'ic', 'limited', 'pexp'],
    observation: {
      text: 'The resting volume fell a long way and inspiratory capacity came back with it. The loop moved up towards the dashed ceiling but for most of the breath it is still well below it.',
      textJa:
        '安静位は大きく下がり、それとともに最大吸気量が回復しました。曲線は破線の上限に向かって上がりましたが、呼気の大半ではまだ十分下にあります。',
    },
    explanation: {
      text: 'Expiratory muscle pressure adds to elastic recoil at the alveolus, so the pressure driving gas out is larger and, across an unchanged resistance, the flow is larger. That is straightforward, and it is why "effort-independent" is a statement about part of a forced expiration and not about expiration in general. It holds only where the flow being asked for has reached what the lung can produce. Here it has not, so effort buys volume.',
      textJa:
        '呼気筋圧は肺胞で弾性収縮力に上乗せされます。押し出す駆動圧が大きくなり、抵抗が変わらなければ流量も大きくなります。当たり前のことですが、だからこそ「努力非依存」は、努力呼気の一部についての記述であって、呼気一般についての記述ではありません。それが成り立つのは、要求される流量が肺の出せる最大流量に達している範囲だけです。ここではまだ達していないので、努力は肺気量を買えます。',
      footnote:
        'The controls are deliberately separate: nothing about the resistance, the recoil or the expiratory time moved when the pressure did.',
      footnoteJa:
        '操作項は意図的に分離されています。圧を動かしたとき、抵抗も弾性収縮力も呼気時間も動いていません。',
    },
    transfer: {
      /** The same push, on a lung that has lost its recoil. */
      metric: 'eelv',
      unit: 'L',
      digits: 2,
      controls: { elasticRecoil: 0.6, airwayResistance: 3 },
      rows: [
        { label: 'Normal recoil', labelJa: '弾性収縮力 正常' },
        { label: 'Emphysema', labelJa: '肺気腫（弾性収縮力 60%）' },
      ],
      text: 'Now give the same fifteen centimetres of water to an emphysematous lung — recoil at sixty per cent, airways narrower still. How much does the resting volume come down?',
      textJa:
        '次に、肺気腫の肺（弾性収縮力 60%、気道はさらに狭い）に同じ 15 cmH₂O を与えます。安静位はどれだけ下がりますか。',
      options: [
        { id: 'far-less', label: 'Far less — almost nothing', labelJa: 'はるかに小さい（ほとんど動かない）' },
        { id: 'same', label: 'About the same', labelJa: '同じくらい' },
        { id: 'more', label: 'More', labelJa: 'より大きい' },
      ],
      answer: 'far-less',
      explanation: {
        text: 'The maximum flow out of each unit is its own elastic recoil divided by the resistance of the collapsible airway upstream of the equal pressure point. Read that expression again: there is no effort in it. When recoil is lost the ceiling comes down into the range tidal breathing already needs, the breath meets it, and from there raising pleural pressure raises the pressure driving the gas out and the pressure squeezing the airway shut by exactly the same amount. Watch the fraction leaving at the ceiling as the pressure goes on: it climbs towards everything, while the volume does not move.',
        textJa:
          '各単位から出ていく最大流量は、その単位自身の弾性収縮力を、equal pressure point より上流の虚脱しうる気道の抵抗で割った値です。もう一度この式を見てください。努力の項がありません。弾性収縮力が失われると上限は安静換気がすでに必要としている範囲まで下がり、呼気がそこに達します。そこから先は、胸腔内圧を上げても、気体を押し出す圧と気道を押しつぶす圧が同じだけ上がるだけです。圧をかけ続けながら、上限で出ていく割合を見てください。ほぼ全量に向かって上がっていくのに、肺気量は動きません。',
      },
    },
    outro: {
      text: '"Breathe out harder" is advice with a condition attached, and the condition is whether the lung is already flow-limited. Pursed-lip breathing helps for a different reason again — it slows expiration and holds the airway open — not by raising the ceiling.',
      textJa:
        '「もっと強く吐いて」という助言には条件があり、その条件は「その肺がすでに流量制限に達しているか」です。口すぼめ呼吸が有効なのはさらに別の理由（呼気を遅くし気道を開いたまま保つこと）であって、上限を上げているからではありません。',
    },
  },
  {
    id: 'bronchodilator',
    title: 'What a bronchodilator actually buys',
    titleJa: '気管支拡張薬が実際に得るもの',
    short: 'Bronchodilator',
    shortJa: '気管支拡張薬',
    setup: { progress: 0.4, ...OBSTRUCTED },
    question: {
      text: 'A bronchodilator relaxes airway smooth muscle. At a fixed, moderate workload, which of these does it change most?',
      textJa:
        '気管支拡張薬は気道平滑筋を弛緩させます。一定の中等度負荷のもとで、次のうち最も大きく変わるのはどれですか。',
      options: [
        { id: 'ic', label: 'How much room is left to breathe in', labelJa: '吸う余地（最大吸気量）' },
        { id: 'ceiling', label: 'The maximum flow the lung can produce', labelJa: '肺が出せる最大流量' },
        { id: 'tlc', label: 'Total lung capacity', labelJa: '全肺気量' },
      ],
      answer: 'ic',
    },
    manipulation: {
      control: 'bronchodilation',
      to: 1,
      seconds: 3,
      action: 'Give the bronchodilator',
      actionJa: '気管支拡張薬を投与する',
      text: 'Apply a full bronchodilator response and watch what recovers.',
      textJa: '気管支拡張薬の効果を最大まで与え、何が回復するかを見てください。',
      hint: 'Watch the time constant, then the resting volume, then how much of the breath is still leaving at the ceiling.',
      hintJa: '時定数、次に安静位、最後に上限で出ていく割合の順に見てください。',
    },
    watch: ['tau', 'ic', 'eelv', 'limited'],
    observation: {
      text: 'The time constant shortened, the lung emptied further in the same expiratory time, the resting volume fell and inspiratory capacity came back. Total lung capacity did not move at all.',
      textJa:
        '時定数が短くなり、同じ呼気時間でより深く吐き切れるようになった結果、安静位が下がり最大吸気量が回復しました。全肺気量はまったく動いていません。',
    },
    explanation: {
      text: 'The drug lowers the resistance the gas travels through, which shortens R·C and lets more of the breath be given back in the time available. It barely touches the flow ceiling, because what sets the ceiling is the elastic tethering holding the collapsible airways open — and no drug puts destroyed alveolar attachments back. That is why the benefit of bronchodilation in COPD shows up as operating volume and exercise tolerance more convincingly than as flow.',
      textJa:
        '薬は気体が通る抵抗を下げ、R·C を短縮して、与えられた時間内により多くを返せるようにします。しかし流量上限にはほとんど触れません。上限を決めているのは虚脱しうる気道を開いて保つ弾性の牽引であり、破壊された肺胞の付着を戻せる薬はないからです。COPD における気管支拡張の効果が、流量よりも肺気量と運動耐容能として現れる理由です。',
      footnote: 'Total lung capacity did not move at all; the drug does not change how much the lung can hold.',
      footnoteJa: '全肺気量はまったく動いていません。薬は肺が保持できる量を変えません。',
    },
    transfer: {
      /** Same manipulation, run where the lung cannot meet the demand. */
      atStage: 'heavy',
      metric: 'ic',
      unit: 'L',
      digits: 2,
      rows: [
        { label: 'Fixed workload', labelJa: '一定負荷' },
        { label: 'Maximal work', labelJa: '最大負荷' },
      ],
      text: 'Now run the same bronchodilator at maximal work, where the lung already cannot produce the ventilation being asked for. Does inspiratory capacity improve more, the same, or less?',
      textJa:
        '次に、要求換気量にすでに届いていない最大負荷の状態で、同じ気管支拡張薬を効かせます。最大吸気量の改善は、より大きい・同じ・より小さい、のどれですか。',
      options: [
        { id: 'less', label: 'Less', labelJa: 'より小さい' },
        { id: 'same', label: 'About the same', labelJa: '同じくらい' },
        { id: 'more', label: 'More', labelJa: 'より大きい' },
      ],
      answer: 'less',
      explanation: {
        text: 'At a fixed workload the shortened time constant is spent emptying further, so it shows up as volume. At maximal work the lung was already short of the ventilation it needed, so the same shortened time constant is spent moving more gas instead — the benefit is real but it has gone somewhere else. A trial measuring inspiratory capacity at peak exercise would find much less than one measuring it at a matched workload, and neither would be wrong.',
        textJa:
          '一定負荷では、短縮した時定数はより深く吐き切ることに使われるため、効果は容量として現れます。最大負荷では、肺はすでに必要な換気量に届いていないため、同じ時定数の短縮はより多くの気体を動かすことに使われます。効果は実在しますが、現れる場所が違うのです。ピーク運動時に最大吸気量を測る試験は、同一負荷で測る試験よりずっと小さな効果しか見つけません。そしてどちらも間違っていません。',
      },
    },
    outro: {
      text: 'Which number a treatment improves depends on what the lung was short of. That is worth remembering before reading any trial that reports one of them.',
      textJa:
        '治療がどの数値を改善するかは、その肺が何に不足していたかで決まります。いずれかの数値を報告する試験を読む前に、覚えておく価値のあることです。',
    },
  },
];
