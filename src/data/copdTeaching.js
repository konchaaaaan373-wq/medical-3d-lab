/**
 * The COPD scene's walk-through and its challenges.
 *
 * Both work the same way and it matters: **neither of them asserts a result.**
 * Each step and each question sets the model's controls and then names the
 * numbers to watch, and the numbers come from the model at the moment they are
 * read. If the physiology changed, the walk-through would say something
 * different, and the tests in `tests/copd-scene.test.js` re-derive every stored
 * answer here from the model so that it cannot quietly stop being true.
 */

/** Where the walk-through starts: an ordinary lung, at rest. */
const HEALTHY = { airwayResistance: 1, elasticRecoil: 1, expiratoryEffort: 1, bronchodilation: 0 };
/** And the lung it is about. */
const OBSTRUCTED = { airwayResistance: 3, elasticRecoil: 0.6, expiratoryEffort: 1, bronchodilation: 0 };

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
        'Inspiration is muscular; expiration, at rest, is the lung giving back what inspiration stored in it. Nothing pushes. That is why how fast a lung empties is a property of the lung, and not of how much the person wants to.',
      bodyJa:
        '吸気は筋の仕事ですが、安静時の呼気は、吸気で蓄えられた分を肺が返しているだけです。押し出しているわけではありません。だからこそ、肺が吐き切る速さは肺自身の性質であって、本人の意思の問題ではありません。',
      controls: { ...HEALTHY },
      progress: 0,
      watch: ['tau', 'te', 'tauCount'],
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
        'Narrow the airways and raise the compliance — obstruction and lost elastic recoil, the two halves of COPD — and the time constant goes from about half a second to nearly three. Nothing else about the lung has changed yet.',
      bodyJa:
        '気道を狭くし、コンプライアンスを上げる。閉塞と弾性収縮力の低下という COPD の 2 つの要素を与えると、時定数は約 0.5 秒から 3 秒近くまで延びます。この時点で、肺について変えたのはそれだけです。',
      controls: { ...OBSTRUCTED },
      progress: 0,
      watch: ['tau', 'te', 'tauCount'],
      chart: 'volume-time',
    },
    {
      id: 'enough-time',
      heading: 'At rest, there is still just enough time',
      headingJa: '安静時なら、時間はまだ足りています',
      because: {
        text: 'Because a resting breath is small and expiration has nearly three seconds to deal with it.',
        textJa: '安静時の一回換気量は小さく、呼気には約 3 秒が与えられているためです。',
      },
      body:
        'The lung is sitting higher than a normal one would — the lost recoil alone did that — but it is not still filling. Each breath is given back before the next one starts, and the volume it rests at is steady.',
      bodyJa:
        'この肺は正常肺より高い容量に位置していますが、これは弾性収縮力の低下そのものによるものです。まだ「溜まり続けて」はいません。各呼吸は次の吸気が始まる前に吐き切られ、安静位は一定に保たれています。',
      controls: { ...OBSTRUCTED },
      progress: 0,
      watch: ['eelv', 'ic', 'tauCount'],
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
        'Light exertion asks for eighteen litres a minute. The rate rises, the cycle shortens, and expiration — the long, passive part — gives up most of the time that was lost. The lung is now being asked to empty in fewer time constants than it needs.',
      bodyJa:
        '軽い運動では分時換気量 18 L が要求されます。呼吸数が上がり周期が短くなると、長く受動的な呼気相が、失われた時間のほとんどを負担します。こうして肺は、必要な時定数の数を下回る時間で吐き切ることを求められます。',
      controls: { ...OBSTRUCTED },
      progress: 0.3,
      watch: ['te', 'tauCount', 'eelv'],
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
        'Breath after breath, the volume the lung rests at climbs — until the extra recoil at that higher volume is finally enough to push the tidal volume out in the time available. That balance point is dynamic hyperinflation, and it is where the lung has been left here. Nothing in the model sets it; drag the demand slider yourself and you can watch the climb take a dozen breaths to arrive.',
      bodyJa:
        '呼吸を重ねるごとに安静位は上昇していき、やがて、その高い容量で得られる余分な弾性収縮力が、与えられた時間内に一回換気量を押し出せるところで釣り合います。この均衡点が動的過膨張であり、ここではその状態を表示しています。モデルの中でこの値を設定している箇所はありません。要求換気量のスライダーを自分で動かせば、この上昇が十数呼吸かけて起きる様子を見られます。',
      controls: { ...OBSTRUCTED },
      progress: 0.6,
      watch: ['eelv', 'ic', 'vt'],
      chart: 'volume-time',
    },
    {
      id: 'no-room',
      heading: 'The room to breathe in closes from above',
      headingJa: '吸う余地が、上から狭まります',
      because: {
        text: 'Because total lung capacity has not moved, and the floor the breath starts from has.',
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
      id: 'effort',
      heading: 'And pushing harder does nothing',
      headingJa: 'そして、強く吐いても変わりません',
      because: {
        text: 'Because the maximal expiratory flow is set by elastic recoil and by the airway upstream of the equal pressure point — and neither of them is effort.',
        textJa:
          '最大呼気流量は、弾性収縮力と equal pressure point より上流の気道で決まり、そのどちらも「努力」ではないためです。',
      },
      body:
        'Double the expiratory effort and watch the flow-volume loop: the breath is already running along the ceiling, and there is nothing above it to reach. In a lung with normal recoil the same doubling would move a great deal of gas. This is what "effort-independent" means, and it is why telling someone to breathe out harder is not a treatment.',
      bodyJa:
        '呼気努力を 2 倍にして流量-容量曲線を見てください。呼吸はすでに上限に沿って進んでおり、その上に到達できる余地はありません。弾性収縮力が正常な肺なら、同じ 2 倍化で大量の気体が動きます。これが「努力非依存」ということであり、「もっと強く吐いて」が治療にならない理由です。',
      controls: { ...OBSTRUCTED, expiratoryEffort: 2 },
      progress: 0.6,
      watch: ['limited', 'ic', 'eelv'],
      chart: 'flow-volume',
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
      controls: { ...OBSTRUCTED, expiratoryEffort: 1 },
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
 * `tests/copd-scene.test.js`. A lesson here can only be wrong by being badly
 * worded — it cannot be wrong about what the model does.
 */
export const LEARNING_MODULES = [
  {
    id: 'obstruction-alone',
    title: 'Whether narrow airways are enough on their own',
    titleJa: '気道が狭いだけで足りるのか',
    short: 'Narrow airways',
    shortJa: '気道狭窄',
    setup: { progress: 0.6, ...HEALTHY },
    question: {
      text: 'Someone with ordinary lungs is working steadily, asking for about thirty litres a minute. Narrow their airways to three times the resistance — and change nothing else. What happens to the volume their lung rests at between breaths?',
      textJa:
        '正常な肺の人が、分時換気量 30 L 程度を要する運動を続けています。気道抵抗だけを 3 倍にし、他は何も変えません。呼吸と呼吸の間に肺が落ち着く容量はどうなりますか。',
      options: [
        { id: 'rises', label: 'It rises — gas gets trapped', labelJa: '上がる（空気が閉じ込められる）' },
        { id: 'barely', label: 'It barely moves', labelJa: 'ほとんど変わらない' },
        { id: 'falls', label: 'It falls slightly', labelJa: 'わずかに下がる' },
      ],
      answer: 'falls',
    },
    manipulation: {
      control: 'airwayResistance',
      to: 3,
      seconds: 3,
      action: 'Narrow the airways',
      actionJa: '気道を狭くする',
      text: 'Raise airway resistance to three times normal. Elastic recoil stays where it is.',
      textJa: '気道抵抗を正常の 3 倍まで上げます。弾性収縮力はそのままです。',
      hint: 'Watch the time constant first — it trebles. Then watch the resting volume, which is the surprise.',
      hintJa: 'まず時定数を見てください（3 倍になります）。次に安静位を見てください。そこが意外なところです。',
    },
    watch: ['tau', 'tauCount', 'eelv', 'limited'],
    observation: {
      text: 'The time constant trebled and expiration no longer has enough of them — and the lung did not trap a thing. If anything it is resting slightly lower than before.',
      textJa:
        '時定数は 3 倍になり、呼気時間はもはや必要な τ の数を満たしていません。それでも肺は何も閉じ込めませんでした。むしろ以前よりわずかに低い位置で落ち着いています。',
    },
    explanation: {
      text: 'A long time constant is only half of it. This lung still has its elastic recoil, so its flow ceiling is far above anything tidal breathing asks for — and that means the extra expiratory effort that comes with the raised drive still *works*. The person simply pushes the air out, and the arithmetic about time never gets to bite. Narrow airways alone do not trap gas in a lung that can still be emptied by effort.',
      textJa:
        '時定数が長いことは、話の半分でしかありません。この肺には弾性収縮力が残っているため、流量上限は安静換気が要求する流量よりはるかに上にあります。つまり、上がったドライブに伴う余分な呼気努力が「効いてしまう」のです。本人は単に押し出せばよく、時間の算数は効いてきません。努力で吐き切れる肺では、気道が狭いだけでは空気は閉じ込められません。',
      footnote: 'The fraction of the breath leaving at the ceiling stayed near zero. That is the number that matters.',
      footnoteJa: '上限で出ていく呼気の割合はほぼゼロのままでした。効いているのはその数字です。',
    },
    transfer: {
      /** Same manipulation, on a lung that has lost its recoil. */
      metric: 'eelv',
      unit: 'L',
      digits: 2,
      controls: { elasticRecoil: 0.6 },
      rows: [
        { label: 'Normal recoil', labelJa: '弾性収縮力 正常' },
        { label: 'Recoil at 60%', labelJa: '弾性収縮力 60%' },
      ],
      text: 'Now take the elastic recoil down to sixty per cent and narrow the airways again, at the same workload. Does the resting volume rise more, the same, or less than it did with normal recoil?',
      textJa:
        '次に弾性収縮力を 60% まで下げ、同じ負荷でもう一度気道を狭くします。安静位の上昇は、弾性収縮力が正常だったときより大きい・同じ・小さい、のどれですか。',
      options: [
        { id: 'more', label: 'Much more', labelJa: 'はるかに大きい' },
        { id: 'same', label: 'About the same', labelJa: '同じくらい' },
        { id: 'less', label: 'Less', labelJa: '小さい' },
      ],
      answer: 'more',
      explanation: {
        text: 'With the recoil gone, the flow ceiling comes down into the range tidal breathing needs, and effort stops being able to rescue the situation. Only then does the long time constant matter, and only then does the volume climb. This is why COPD is not simply "narrow airways": it is narrow airways in a lung that has also lost the recoil that would otherwise let it push the gas out anyway.',
        textJa:
          '弾性収縮力が失われると、流量上限は安静換気が必要とする範囲まで下がり、努力ではもう挽回できなくなります。そこではじめて長い時定数が効いてきて、そこではじめて容量が上昇します。COPD が単なる「気道が狭い病気」ではない理由がこれです。狭い気道が、押し出す力そのものを失った肺の中にあるのです。',
      },
    },
    outro: {
      text: 'Two things had to be true at once. A model that had only one of them would have produced a lung that looked obstructed and behaved normally.',
      textJa:
        '2 つの条件が同時に必要でした。片方だけのモデルは、閉塞しているように見えて正常に振る舞う肺を作っていたはずです。',
    },
  },
  {
    id: 'effort-independence',
    title: 'Whether breathing out harder helps',
    titleJa: '強く吐けば楽になるのか',
    short: 'Effort',
    shortJa: '努力',
    setup: { progress: 0.6, ...OBSTRUCTED },
    question: {
      text: 'This lung is obstructed and working. If the person doubles how hard they push the air out, how much of the expired gas will leave at the maximum flow the lung can produce?',
      textJa:
        '閉塞のある肺が運動しています。呼気を押し出す力を 2 倍にしたとき、呼出される気体のうち、この肺が出せる最大流量で出ていく割合はどうなりますか。',
      options: [
        { id: 'nearly-all', label: 'Nearly all of it — the ceiling is already being met', labelJa: 'ほぼ全部（すでに上限に達している）' },
        { id: 'less', label: 'Less, because more effort means more room', labelJa: '減る（努力が増えれば余裕も増えるため）' },
        { id: 'none', label: 'None — effort raises the ceiling', labelJa: 'ゼロ（努力が上限そのものを上げるため）' },
      ],
      answer: 'nearly-all',
    },
    manipulation: {
      control: 'expiratoryEffort',
      to: 2,
      seconds: 3,
      action: 'Push twice as hard',
      actionJa: '呼気努力を 2 倍にする',
      text: 'Double the expiratory muscle pressure and watch the flow-volume loop.',
      textJa: '呼気筋圧を 2 倍にして、流量-容量曲線を見てください。',
      hint: 'The dashed line is the most flow this lung can produce at each volume. Effort cannot cross it.',
      hintJa: '破線は、各容量でこの肺が出せる最大流量です。努力ではこれを超えられません。',
    },
    watch: ['limited', 'eelv', 'ic', 've'],
    observation: {
      text: 'Almost all of the breath is now leaving at the ceiling, and the volume the lung rests at barely moved. The extra pressure went into compressing airways rather than into flow.',
      textJa:
        '呼気のほぼ全量が上限で出ていくようになりましたが、安静位はほとんど動いていません。追加した圧は流量ではなく、気道の圧迫に費やされました。',
    },
    explanation: {
      text: 'The maximum flow out of each unit is its own elastic recoil divided by the resistance of the collapsible airway upstream of the equal pressure point. Read that expression again: there is no effort in it. Raising pleural pressure raises the pressure driving the gas out and the pressure squeezing the airway shut by exactly the same amount, and the two cancel.',
      textJa:
        '各単位から出ていく最大流量は、その単位自身の弾性収縮力を、equal pressure point より上流の虚脱しうる気道の抵抗で割った値です。もう一度この式を見てください。努力の項がありません。胸腔内圧を上げると、気体を押し出す圧と気道を押しつぶす圧が同じだけ上がり、互いに打ち消し合います。',
      footnote:
        'Try the same manipulation with elastic recoil back at 100%: there, doubling the effort moves a great deal of gas.',
      footnoteJa:
        '弾性収縮力を 100% に戻して同じ操作をしてみてください。そちらでは、努力を 2 倍にすると大量の気体が動きます。',
    },
    outro: {
      text: '"Breathe out harder" is advice that works on a normal lung and does nothing on this one. Pursed-lip breathing helps for a different reason — it slows expiration and holds the airway open — not by raising the ceiling.',
      textJa:
        '「もっと強く吐いて」は正常肺には効き、この肺には効きません。口すぼめ呼吸が有効なのは別の理由（呼気を遅くし気道を開いたまま保つこと）であって、上限を上げているからではありません。',
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
      hint: 'Watch the time constant, then the resting volume, then the fraction still leaving at the ceiling.',
      hintJa: '時定数、次に安静位、最後に上限で出ていく割合の順に見てください。',
    },
    watch: ['tau', 'ic', 'eelv', 'limited'],
    observation: {
      text: 'The time constant shortened, the lung emptied further in the same expiratory time, the resting volume fell and inspiratory capacity came back. The fraction of the breath still leaving at the ceiling barely changed.',
      textJa:
        '時定数が短くなり、同じ呼気時間でより深く吐き切れるようになった結果、安静位が下がり最大吸気量が回復しました。一方、上限で出ていく割合はほとんど変わっていません。',
    },
    explanation: {
      text: 'The drug lowers the resistance the gas travels through, which shortens R·C and lets more of the breath be given back in the time available. It barely touches the ceiling, because what sets the ceiling is the elastic tethering holding the collapsible airways open — and no drug puts destroyed alveolar attachments back. That is why the benefit of bronchodilation in COPD shows up as operating volume and exercise tolerance more convincingly than as flow.',
      textJa:
        '薬は気体が通る抵抗を下げ、R·C を短縮して、与えられた時間内により多くを返せるようにします。しかし上限にはほとんど触れません。上限を決めているのは虚脱しうる気道を開いて保つ弾性の牽引であり、破壊された肺胞の付着を戻せる薬はないからです。COPD における気管支拡張の効果が、流量よりも肺気量と運動耐容能として現れる理由です。',
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
