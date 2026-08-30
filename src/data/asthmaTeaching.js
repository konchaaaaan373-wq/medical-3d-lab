/**
 * The asthma scene's walk-through and its challenges.
 *
 * As in the COPD scene, nothing here asserts a result. Each step and each
 * question sets the model's controls and names the numbers to watch; the
 * numbers come from the model when they are read, and
 * `tests/asthma-scene.test.js` re-derives every stored answer from it.
 */

/** The lung the scene is about: hyperresponsive, with some wall thickening. */
const ASTHMATIC = { hyperresponsiveness: 1.2, wallThickening: 0.25, lungInflation: 1, bronchodilator: 0 };

/**
 * Seven steps. The middle three are the loop, taken one link at a time,
 * because the loop is the only thing in this scene that is hard.
 */
export const CAUSAL_STORY = {
  id: 'asthma-patchiness',
  title: 'How an even stimulus makes an uneven lung',
  titleJa: '均一な刺激が、なぜ不均一な肺をつくるのか',
  steps: [
    {
      id: 'tree',
      heading: 'One tree, one stimulus, reaching all of it equally',
      headingJa: '1 本の気道樹に、均一に届く刺激',
      body:
        'Every airway in this tree is about to be given the same activation. Nothing here is set up to be patchy: the airways differ from one another, but only slightly, and the difference is the same on every load. Watch what the lung does with a stimulus that plays no favourites.',
      bodyJa:
        'この気道樹のすべての気道に、これから同じ強さの活性化が与えられます。不均一になるよう仕組んだものは何もありません。気道どうしはわずかに異なりますが、その差は毎回同じです。えこひいきのない刺激を、肺がどう扱うかを見てください。',
      controls: { ...ASTHMATIC },
      progress: 0,
      watch: ['resistance', 'heterogeneity', 'defects'],
      chart: 'ventilation-distribution',
    },
    {
      id: 'held',
      heading: 'The muscle is not free to act',
      headingJa: '筋は自由に働けません',
      because: {
        text: 'Because airway smooth muscle shortens against a load: the pull of the parenchyma attached to the outside of the airway.',
        textJa:
          '気道平滑筋は負荷に抗して短縮するためです。その負荷とは、気道の外側に付着した実質が引く力です。',
      },
      body:
        'Two fifths of the way up the dose and almost nothing has happened — resistance has barely moved and the distribution is still one narrow peak. The muscle is being activated everywhere and the lung around it is winning everywhere.',
      bodyJa:
        '刺激量の 5 分の 2 まで来ても、ほとんど何も起きていません。抵抗はわずかしか動かず、分布は依然として 1 つの狭いピークです。筋はどこでも活性化していますが、その周囲の実質がどこでも勝っています。',
      controls: { ...ASTHMATIC },
      progress: 0.4,
      watch: ['resistance', 'calibre', 'heterogeneity'],
      chart: 'dose-response',
    },
    {
      id: 'split',
      heading: 'An airway that narrows loses air to its sister',
      headingJa: '狭くなった気道は、隣の気道に空気を奪われます',
      because: {
        text: 'Because at every bifurcation the flow divides in inverse proportion to what each side costs — so the cheaper side takes more, and not only its own share.',
        textJa:
          'どの分岐でも、流れは両側のコストの逆比で分かれるためです。安いほうがより多くを取り、それは自分の取り分だけではありません。',
      },
      body:
        'This is the first half of the loop, and it is pure arithmetic — it would be true of water in pipes. What makes it matter in a lung is that resistance goes as the *fourth power* of a radius, so a small narrowing is a large cost, and a large cost is a large loss of air.',
      bodyJa:
        'これがループの前半で、内容は純粋な算数です。水道管でも同じことが起きます。肺で問題になるのは、抵抗が半径の 4 乗に効くためです。わずかな狭窄が大きなコストになり、大きなコストは大きな空気の損失になります。',
      controls: { ...ASTHMATIC },
      progress: 0.6,
      watch: ['heterogeneity', 'defects', 'calibre'],
      chart: 'ventilation-distribution',
    },
    {
      id: 'loop',
      heading: 'And an airway that loses air loses its tethering',
      headingJa: '空気を失った気道は、支えも失います',
      because: {
        text: 'Because the parenchyma pulls in proportion to how stretched it is, and what stretches it is the air arriving.',
        textJa: '実質は伸展の度合いに比例して引くためです。そして実質を伸展させるのは、届いてくる空気です。',
      },
      body:
        'That closes the loop. Narrow slightly → ventilate slightly less → be tethered slightly less → narrow further. Try the tethering term directly: raise *global lung inflation* and watch the resistance fall, take it down and watch it climb. Nothing about the muscle changed either time — that control is the mechanical load, and nothing else.',
      bodyJa:
        'ここでループが閉じます。少し狭くなる → 換気が少し減る → 支えが少し弱まる → さらに狭くなる。牽引の項は直接試せます。「肺全体の伸展」を上げると抵抗が下がり、下げると上がります。どちらのときも筋については何も変えていません。この操作項は力学的な負荷そのものであって、それ以外の何物でもありません。',
      controls: { ...ASTHMATIC },
      progress: 0.6,
      watch: ['resistance', 'ventilation', 'calibre'],
      chart: 'dose-response',
    },
    {
      id: 'patchy',
      heading: 'So a small difference stops being small',
      headingJa: 'こうして、小さな差は小さくなくなります',
      because: {
        text: 'Because once the loop’s gain passes one, two airways that started almost identical no longer end up in the same place.',
        textJa:
          'ループの利得が 1 を超えると、ほとんど同じ状態から出発した 2 本の気道が、同じ場所には行き着かなくなるためです。',
      },
      body:
        'Past the knee the single peak has split in two. Some regions have tipped and are receiving almost nothing; the rest are receiving considerably more than their share. Nothing about the stimulus changed — it is still perfectly even. What changed is that the lung stopped being able to hold a middle position.',
      bodyJa:
        '変曲点を越えると、単一のピークが 2 つに割れます。ある領域は限界を越えてほとんど換気されなくなり、残りは取り分を大きく上回る空気を受け取ります。刺激は何も変わっていません。依然として完全に均一です。変わったのは、肺が中間の状態を保てなくなったことです。',
      controls: { ...ASTHMATIC },
      progress: 0.75,
      watch: ['heterogeneity', 'defects', 'cluster'],
      chart: 'ventilation-distribution',
    },
    {
      id: 'inherited',
      heading: 'The regions that stayed open are held open by what the others gave up',
      headingJa: '開いたままの領域は、他が手放した空気に支えられています',
      because: {
        text: 'Because the air has to go somewhere: what one region stops taking, its neighbours take instead — and the extra stretch that gives them is what keeps them on the open side of the loop.',
        textJa:
          '空気はどこかへ行かなければならないためです。ある領域が受け取らなくなった分は隣が受け取り、その余分な伸展こそが、隣をループの「開いた側」に留めます。',
      },
      body:
        'The two populations are not independent — they are holding each other in place. That is why the patchy state is stable rather than a stage on the way to somewhere, and it is why the defects have edges: they are regions, fed by one airway that tipped, not scattered units that each tipped alone.',
      bodyJa:
        '2 つの集団は独立ではなく、互いを現在の状態に固定し合っています。だからこそ不均一な状態は「途中経過」ではなく安定な状態であり、だからこそ欠損には境界があります。欠損は、限界を越えた 1 本の気道が支配する「領域」であって、ばらばらに限界を越えた単位の集まりではありません。',
      controls: { ...ASTHMATIC },
      progress: 0.8,
      watch: ['cluster', 'defects', 'ventilation'],
      chart: 'ventilation-distribution',
    },
    {
      id: 'shift',
      heading: 'And the patchiness was the prelude',
      headingJa: 'そして、不均一は前段階でした',
      because: {
        text: 'Because at a large enough stimulus the muscle wins even where the tethering is strongest, and there is no longer a population left to hold the others open.',
        textJa:
          '刺激が十分に強くなると、支えが最も強い場所でも筋が勝ってしまい、他を開いたまま保つ集団が残らなくなるためです。',
      },
      body:
        'At full dose the lung is uniform again — and uniformly shut, with several times the resistance it started with and a fraction of the air reaching it. Read the *defect count* here and you will be told the patchiness has resolved, which is true and useless. Read the air reaching the lung instead.',
      bodyJa:
        '最大刺激では肺は再び均一になります。ただし「均一に閉じた」状態であり、抵抗は当初の数倍、届く空気はごく一部です。ここで「欠損領域の割合」を読むと「不均一は解消した」と告げられます。それは事実ですが、役には立ちません。代わりに、肺全体に届く空気の量を読んでください。',
      controls: { ...ASTHMATIC },
      progress: 1,
      watch: ['ventilation', 'resistance', 'defects'],
      chart: 'dose-response',
    },
  ],
};

export const LEARNING_MODULES = [
  {
    id: 'parenchymal-tethering',
    title: 'What does stronger parenchymal tethering do?',
    titleJa: '実質の牽引が強まると、何が起きるのか',
    short: 'Tethering',
    shortJa: '実質の牽引',
    setup: { progress: 0.8, ...ASTHMATIC },
    question: {
      text: 'This lung has tipped: a large share of its regions are receiving almost nothing. Now increase the stretch of the parenchyma around every airway — no drug, and no change to the stimulus reaching the muscle. What happens to the unevenness?',
      textJa:
        'この肺は限界を越え、多くの領域がほとんど換気されていません。ここで、すべての気道を取り巻く実質の伸展を強めます。薬は使わず、筋に届く刺激も変えません。不均一さはどうなりますか。',
      options: [
        { id: 'falls', label: 'It falls — some regions come back', labelJa: '減る（いくつかの領域が戻る）' },
        { id: 'same', label: 'Nothing changes; the muscle is what matters', labelJa: '変わらない（効いているのは筋だから）' },
        { id: 'rises', label: 'It rises — stretching makes it worse', labelJa: '増える（伸展させると悪化する）' },
      ],
      answer: 'falls',
    },
    manipulation: {
      control: 'lungInflation',
      to: 1.3,
      seconds: 3,
      action: 'Stretch the parenchyma',
      actionJa: '実質を伸展させる',
      text: 'Raise global lung inflation and watch the distribution. This changes the load the smooth muscle is shortening against, and nothing else.',
      textJa:
        '肺全体の伸展を上げて、分布の変化を見てください。これが変えるのは、平滑筋が抗して短縮している負荷だけです。',
      hint: 'Watch the resistance and the air reaching the lung, then look at whether the two peaks have moved together.',
      hintJa: '抵抗と、肺に届く空気の量を見てください。そのあと、2 つのピークが近づいたかどうかを見てください。',
    },
    watch: ['resistance', 'heterogeneity', 'defects', 'ventilation'],
    observation: {
      text: 'Resistance fell, more air reached the lung, and some of the dark regions came back — with no drug given and the stimulus untouched. Read the figures off the panel rather than from this sentence: they are the model’s, and they are illustrative.',
      textJa:
        '抵抗が下がり、肺に届く空気が増え、暗かった領域の一部が戻りました。薬は使っておらず、刺激も変えていません。数値はこの文ではなく、パネルの表示を読んでください。それはモデルの出力であり、あくまで説明用の値です。',
    },
    explanation: {
      text: 'Stretching the parenchyma pulls harder on the outside of every airway, and that pull is the load the smooth muscle is shortening against. For the regions sitting near the tipping point the extra load is enough to push them back to the open side, and once they are open the air they take stretches them further — the same loop, running the other way. **Increasing lung volume increases the parenchymal tethering forces that tend to oppose airway narrowing**, and that is the whole of what this control demonstrates.',
      textJa:
        '実質を伸展させると、すべての気道の外側をより強く引くことになります。この牽引こそが、平滑筋が抗して短縮している負荷です。分岐点付近にいた領域では、この追加の負荷だけで開いた側へ押し戻すのに十分であり、いったん開けば受け取った空気がさらに伸展させます。同じループが逆向きに回るのです。**肺気量が増えると、気道の狭窄に抗する実質の牽引力が増える**。この操作項が示しているのは、それだけです。',
      footnote:
        'Take the stretch the other way, towards a lung held at a lower volume, and the same mechanism raises the resistance instead.',
      footnoteJa:
        '逆に、より低い肺気量に保たれた肺のほうへ動かすと、同じ機序によって今度は抵抗が上がります。',
    },
    outro: {
      text: '**This control isolates the mechanical tethering effect. It does not predict the bronchodilator response to a real deep inspiration in a person with asthma.** In health, a deep inspiration both reverses and prevents bronchoconstriction; in asthma that response is impaired or lost, and most impaired where hyperresponsiveness is strongest. Why it is lost is a question about smooth-muscle dynamics — strain rate, cross-bridge cycling, the plasticity of the contractile apparatus — and none of that is in this model. What is here is the load. What is missing is everything about the muscle that changes when you pull on it.',
      textJa:
        '**この操作項は、力学的な牽引効果だけを取り出したものです。喘息の人が実際に深吸気をしたときの気管支拡張反応を予測するものではありません。** 健常者では深吸気は気管支収縮を解除し、また予防もします。喘息ではこの反応が減弱ないし消失しており、気道過敏性が強いほど強く障害されています。なぜ失われるのかは平滑筋の動的性質（伸展速度、クロスブリッジの回転、収縮装置の可塑性）についての問いであり、そのいずれもこのモデルには含まれていません。ここにあるのは負荷だけです。欠けているのは、引っ張られたときに筋の側で変わるすべてです。',
    },
  },
  {
    id: 'muscle-or-wall',
    title: 'Muscle or wall: which one is the acute lever?',
    titleJa: '筋か、壁か：急性期に効くのはどちらか',
    short: 'Muscle or wall',
    shortJa: '筋か壁か',
    setup: { progress: 0.8, ...ASTHMATIC },
    question: {
      text: 'Two things are narrowing these airways: smooth muscle that has contracted, and walls that are thicker than they should be. If you could abolish one of them entirely, which would drop the resistance more?',
      textJa:
        'この気道を狭くしているものは 2 つあります。収縮した平滑筋と、本来より厚い壁です。どちらか一方を完全になくせるとしたら、抵抗をより大きく下げるのはどちらですか。',
      options: [
        { id: 'muscle', label: 'Relaxing the muscle', labelJa: '筋を弛緩させる' },
        { id: 'wall', label: 'Removing the wall thickening', labelJa: '壁の肥厚をなくす' },
        { id: 'equal', label: 'About the same', labelJa: 'どちらも同程度' },
      ],
      answer: 'muscle',
    },
    manipulation: {
      control: 'bronchodilator',
      to: 1,
      seconds: 3,
      action: 'Relax the muscle',
      actionJa: '筋を弛緩させる',
      text: 'Give a full bronchodilator response, then try the wall thickening control on its own and compare.',
      textJa: '気管支拡張薬の効果を最大まで与えます。そのあと、壁の肥厚のスライダーだけを動かして比べてください。',
      hint: 'Relaxing the muscle here does not just narrow the peaks — it collapses them back into one.',
      hintJa: 'ここで筋を弛緩させると、ピークが細くなるだけでなく、2 つのピークが 1 つに戻ります。',
    },
    watch: ['resistance', 'heterogeneity', 'defects', 'calibre'],
    observation: {
      text: 'Relaxing the muscle took the resistance down by about two thirds and abolished the unevenness completely. Removing the wall thickening instead takes off roughly a quarter, and leaves the lung just as patchy as it was.',
      textJa:
        '筋を弛緩させると抵抗はおよそ 3 分の 2 減り、不均一さは完全に消えました。一方、壁の肥厚をなくした場合に減るのは約 4 分の 1 で、不均一さはそのまま残ります。',
    },
    explanation: {
      text: 'The muscle is doing most of the narrowing here — but more than that, it is what put the lung into the two-population state in the first place. Take it away and the feedback loop has nothing to amplify, so the lung does not merely open, it becomes uniform again. Wall thickening is a fixed cost: it takes lumen and, because resistance goes as the fourth power, it amplifies whatever the muscle then does — but abolishing it leaves both populations exactly where they were.',
      textJa:
        'ここで狭窄の大部分を担っているのは筋です。それだけでなく、肺を「2 つの集団」の状態に追い込んだのも筋です。筋を取り除けばフィードバックループに増幅すべきものがなくなるため、肺は単に開くのではなく、再び均一になります。壁の肥厚は固定的なコストです。内腔を奪い、抵抗が 4 乗に効くために筋の作用を増幅しますが、これをなくしても 2 つの集団はそのままです。',
      footnote: 'Which is the shape of the clinical distinction between a reliever and the burden of remodelling.',
      footnoteJa: '発作治療薬と、リモデリングという負債との臨床的な違いは、まさにこの形をしています。',
    },
    outro: {
      text: 'Two things can both be narrowing an airway without being the same kind of problem.',
      textJa: '2 つのものが同じ気道を狭くしていても、それらが同じ種類の問題であるとは限りません。',
    },
  },
  {
    id: 'near-the-knee',
    title: 'Why the same lung is sometimes fine and sometimes not',
    titleJa: '同じ肺が、あるときは平気で、あるときはそうでない理由',
    short: 'Near the knee',
    shortJa: '変曲点の近く',
    setup: { progress: 0.6, ...ASTHMATIC },
    question: {
      text: 'This lung is sitting just below the knee of its dose-response curve. Make its airways a third more responsive — a change you might see between a good week and a bad one. What happens to the resistance?',
      textJa:
        'この肺は、刺激量-反応曲線の変曲点のすぐ手前にいます。気道の反応性を 3 分の 1 ほど上げてください。調子のよい週と悪い週の差として起こりうる程度の変化です。抵抗はどうなりますか。',
      options: [
        { id: 'doubles', label: 'It roughly doubles', labelJa: 'ほぼ 2 倍になる' },
        { id: 'third', label: 'It rises by about a third, like the change itself', labelJa: '変化と同じくらい、3 分の 1 ほど上がる' },
        { id: 'little', label: 'Very little — the airways are already narrowed', labelJa: 'ほとんど変わらない（すでに狭くなっているため）' },
      ],
      answer: 'doubles',
    },
    manipulation: {
      control: 'hyperresponsiveness',
      to: 1.6,
      seconds: 3,
      action: 'Make the airways more responsive',
      actionJa: '気道の反応性を上げる',
      text: 'Raise airway hyperresponsiveness by a third and watch where the lung ends up on its own curve.',
      textJa: '気道過敏性を 3 分の 1 上げ、この肺が自身の曲線上のどこへ移るかを見てください。',
      hint: 'Watch the dose-response plot: the marker does not move sideways, the curve moves under it.',
      hintJa: '刺激量-反応曲線を見てください。マーカーが横に動くのではなく、曲線のほうがその下で動きます。',
    },
    watch: ['resistance', 'heterogeneity', 'defects', 'ventilation'],
    observation: {
      text: 'The resistance more than doubled and the lung went from almost even to badly patchy — for a change in responsiveness of a third.',
      textJa:
        '抵抗は 2 倍以上になり、肺はほぼ均一な状態からひどく不均一な状態へ移りました。反応性の変化は 3 分の 1 です。',
    },
    explanation: {
      text: 'Sitting near a knee is not a neutral place to be. The same change in the trait moves the lung a long way here and hardly at all further down the curve, because what a knee means is that the size of the response is not proportional to the size of the cause. A lung a little below its knee and a lung a little above it are the same lung on the same day, and they behave nothing alike.',
      textJa:
        '変曲点の近くにいることは、中立的な状態ではありません。同じだけ形質が変化しても、ここでは肺を大きく動かし、曲線の下のほうではほとんど動かしません。変曲点があるということは、反応の大きさが原因の大きさに比例しないということだからです。変曲点のわずかに下にいる肺と、わずかに上にいる肺は、同じ日の同じ肺でありながら、まったく似た振る舞いをしません。',
      footnote: 'The dose did not change. Only how the lung answers it did.',
      footnoteJa: '刺激量は変えていません。変えたのは、肺がそれにどう答えるかだけです。',
    },
    transfer: {
      /** The same change in responsiveness, well below the knee. */
      atStage: 'held',
      metric: 'resistance',
      unit: '×',
      digits: 2,
      rows: [
        { label: 'Just below the knee', labelJa: '変曲点のすぐ手前' },
        { label: 'Well below it', labelJa: '変曲点よりずっと下' },
      ],
      text: 'Now run exactly the same change in responsiveness at a much smaller dose, far below the knee. Is the effect on resistance larger, the same, or smaller?',
      textJa:
        '次に、まったく同じ反応性の変化を、変曲点よりずっと下の小さな刺激量で試します。抵抗への影響は、より大きい・同じ・より小さい、のどれですか。',
      options: [
        { id: 'smaller', label: 'Much smaller', labelJa: 'はるかに小さい' },
        { id: 'same', label: 'About the same', labelJa: '同じくらい' },
        { id: 'larger', label: 'Larger', labelJa: 'より大きい' },
      ],
      answer: 'smaller',
      explanation: {
        text: 'Far below the knee the same change costs almost nothing: the parenchyma is still winning everywhere, and making the muscle a third stronger does not change who wins. The trait is identical in both runs — what differs is only where on its own curve the lung happened to be standing when the trait changed. Two measurements of the same person on two days can differ this much without anything about the person having changed by that much.',
        textJa:
          '変曲点よりずっと下では、同じ変化はほとんど何のコストにもなりません。実質はまだどこでも勝っており、筋を 3 分の 1 強くしても勝敗は変わりません。形質はどちらの試行でも同一です。異なるのは、その形質が変化したとき、肺が自身の曲線上のどこに立っていたかだけです。同じ人を 2 日間測った 2 つの値がこれだけ違っていても、その人自身がそれだけ変化したとは限りません。',
      },
    },
    outro: {
      text: 'A number that jumps does not always mean something jumped. It can mean the thing was standing somewhere steep.',
      textJa: '値が跳ねたからといって、何かが跳ねたとは限りません。急な場所に立っていた、というだけのこともあります。',
    },
  },
];
