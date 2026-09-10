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
  /**
   * Heart failure, said twice: once for a clinician and once for the person the
   * heart belongs to.
   *
   * **The pair is the point.** `stage` names the scene stage each step stands
   * beside, and `tests/patient-guide-pairing.test.js` holds `progress` to that
   * stage's own position on the scene's axis. The two explanations therefore
   * describe the same solved state by construction: patient copy cannot drift
   * onto a state the clinician's copy never describes, and re-tuning the model
   * moves both or fails the build.
   *
   * **Three beats, in this order, and no more per step.** What changes, what
   * follows from it, and where to look for it on screen. The last one is the
   * one that was missing: a person standing beside a monitor is being shown a
   * rotating 3D model and told a mechanism, and nothing was telling them which
   * part of it to watch. `look` is that sentence, and it points at what the
   * scene is actually drawing at this step — the annotations named in the
   * stage's own `focus` — rather than at anything invented here.
   *
   * What is deliberately absent: numbers, a rate, a cause for this person, a
   * treatment, a prognosis. The model has none of those for an individual, and
   * short copy is exactly where they would be easiest to smuggle in.
   *
   * **Three steps share the last stage, and the third of them is marked.** The
   * chain does not stop at the heart: the same solved state raises the pressure
   * in the vessels between the heart and the lungs, and the scene draws that —
   * `meanPulmonaryVenousPressure` comes out of the same closed-loop solve, and
   * the congestion overlay is drawn from it. So "the pressure reaches the lungs"
   * points at something this model actually produces.
   *
   * "Why breathing can feel harder" does not. The model solves pressures and
   * volumes; it does not solve symptoms. That step carries `educationalOnly`,
   * the panel says so on screen, and `tests/patient-guide-pairing.test.js` holds
   * every step without the flag to something the scene draws.
   */
  'heart-failure': Object.freeze({
    title: 'Why the heart can become less efficient',
    titleJa: '心臓の働きが弱くなる仕組み',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'normal',
        title: 'A healthy pump',
        titleJa: '正常なポンプ',
        body: 'The heart fills with blood, then squeezes it forward with each beat.',
        bodyJa: '心臓は血液を受け取り、1 回ごとの拍動で前へ送り出します。',
        look: 'Watch the chamber in the middle: it widens as it fills, then narrows as it empties.',
        lookJa: '中央の部屋を見てください。血液がたまると広がり、送り出すと縮みます。',
      },
      {
        progress: 0.18,
        stage: 'concentric-hypertrophy',
        title: 'The wall thickens',
        titleJa: '壁が厚くなる',
        body: 'Working against a higher load for a long time, the muscle can grow thicker. The room inside stays about the same.',
        bodyJa: '高い負担が長く続くと、筋肉は厚くなることがあります。中の広さはあまり変わりません。',
        look: 'Watch the muscle around the chamber, not the space inside it — the wall is what is changing here.',
        lookJa: '部屋の中ではなく、そのまわりの筋肉を見てください。ここで変わっているのは壁の厚さです。',
      },
      {
        progress: 0.42,
        stage: 'dilation',
        title: 'The chamber widens',
        titleJa: '部屋が広がる',
        body: 'Later the chamber itself can enlarge and become rounder, and the wall is thin for a room that size.',
        bodyJa: 'その後、部屋そのものが広がって丸みを帯び、その大きさに対して壁は薄くなります。',
        look: 'Watch the outline of the chamber: it is wider and rounder than it was at the start.',
        lookJa: '部屋の輪郭を見てください。最初より広く、丸くなっています。',
      },
      {
        progress: 0.64,
        stage: 'systolic-dysfunction',
        title: 'Less leaves with each beat',
        titleJa: '1 回に送り出せる量が減る',
        body: 'A wider chamber that squeezes less firmly empties less completely, so some blood stays behind.',
        bodyJa: '広がった部屋は縮む力も弱いため、完全には空になりません。血液が残ります。',
        look: 'Watch what is still inside at the end of a squeeze — that is the blood that did not leave.',
        lookJa: '縮み終わったときに中に残っているものを見てください。それが送り出せなかった血液です。',
      },
      {
        // Same state, same position on the axis: this step turns the reader's
        // attention from the heart to what the same solved state does behind it.
        // The pressure it is about is `meanPulmonaryVenousPressure`, which the
        // scene's own closed-loop solve produces, and the overlay it points at
        // is drawn from that pressure. Nothing is borrowed from another model.
        progress: 0.64,
        stage: 'systolic-dysfunction',
        // The camera rises above the heart for these last two steps. From the
        // opening view the pulmonary veins recede almost straight into the
        // screen, so "watch the vessels running to the lungs" pointed at
        // something pressed against the top edge of the frame. The framing is
        // the scene's own (`getGuideFramings`), and it moves nothing else.
        frame: 'pulmonary',
        focus: ['pressure', 'pulmonary-bed'],
        title: 'The pressure reaches the lungs',
        titleJa: '圧は肺のほうへ伝わる',
        body: 'Blood that cannot move forward backs up behind the heart, and the vessels between the heart and the lungs carry that raised pressure.',
        bodyJa: '前へ進めなかった血液は心臓の手前にたまり、心臓と肺のあいだの血管がその高い圧を受けます。',
        look: 'Watch above the heart, around the vessels running to the lungs: the haze that spreads there is how far the pressure has reached.',
        lookJa: '心臓の上、肺へ向かう血管のまわりを見てください。にじむように広がっているのが、圧が届いている範囲です。',
      },
      {
        // Not a model output. The model solves pressures and volumes; it does
        // not solve breathlessness, and this step says so on screen.
        progress: 0.64,
        stage: 'systolic-dysfunction',
        // Same picture as the step before: this one explains what that spread
        // means for a person rather than showing anything new.
        frame: 'pulmonary',
        focus: ['pressure', 'pulmonary-bed'],
        educationalOnly: true,
        title: 'Why breathing can feel harder',
        titleJa: '息が苦しく感じられる理由',
        body: 'When that pressure is high, fluid can move into the spaces around the small airways, and breathing takes more effort — often more so when lying flat.',
        bodyJa: 'その圧が高いと、細い気道のまわりの隙間に水分が移りやすくなり、呼吸に力が要るようになります。横になったときに強く感じられることもあります。',
        look: 'Nothing new is drawn for this step: it explains what the spread on screen tends to mean for a person.',
        lookJa: 'この段階で新しく描かれるものはありません。画面に出ている広がりが、人にとってどういうことかの説明です。',
      },
    ]),
  }),
  /**
   * Myocardial ischaemia, said twice — the second scene to use the shape the
   * heart-failure guide worked out.
   *
   * Same rules, held by the same contract (`src/data/guideContract.js`): each
   * step names the scene stage it stands beside and sits at that stage's own
   * position, three beats per step, and anything the model does not produce is
   * marked. Two steps share the `burden` stage: the muscle showing it, and what
   * that costs the whole ventricle. Same solved state, different picture.
   *
   * **What this model refuses is on the record and is respected here.** Its own
   * scope says ECG, chest pain, troponin and prognosis are not modelled, and
   * there is no infarction in it — no necrosis, no scar. So the step about what
   * a person feels carries `educationalOnly`, and no step calls this a heart
   * attack.
   */
  'myocardial-ischemia': Object.freeze({
    title: 'Why a narrowed artery makes part of the heart stop working',
    titleJa: '細くなった血管が、心臓の一部を動かなくする仕組み',
    steps: Object.freeze([
      {
        progress: 0,
        stage: 'baseline',
        focus: ['lad'],
        title: 'Each artery feeds its own region',
        titleJa: '血管はそれぞれ、担当する場所を養う',
        body: 'The arteries on the surface of the heart each carry blood to one region of muscle. At rest every region receives more oxygen than it uses.',
        bodyJa: '心臓の表面を走る血管は、それぞれ決まった場所の筋肉へ血液を運びます。安静時はどの場所も、使う量より多くの酸素を受け取っています。',
        look: 'Follow one artery down the front of the heart, then look at the muscle below it — that is the region it feeds.',
        lookJa: '心臓の前面を下る血管を目で追い、その下の筋肉を見てください。そこがその血管の担当する場所です。',
      },
      {
        progress: 0.22,
        stage: 'onset',
        focus: ['lad'],
        title: 'The flow through it falls',
        titleJa: 'そこを通る血流が減る',
        body: 'When that artery narrows, less blood reaches the region beyond it. For a while nothing on screen changes: the muscle is running short, but the shortage has to add up before it shows.',
        bodyJa: 'その血管が細くなると、先の場所へ届く血液が減ります。しばらく画面は変わりません——足りていないぶんが積み重なるまで、現れないからです。',
        look: 'Watch the artery, not the muscle. What has changed so far is how much is getting through it.',
        lookJa: '筋肉ではなく血管を見てください。いま変わったのは、そこを通る量です。',
      },
      {
        progress: 0.45,
        stage: 'burden',
        frame: 'wall',
        focus: ['anterior-wall', 'inferior-wall'],
        title: 'The muscle it feeds shows it',
        titleJa: '養われている筋肉に現れる',
        body: 'The shortage has added up, and the region that artery feeds changes colour. The muscle fed by a different artery, right beside it, does not.',
        bodyJa: '不足が積み重なり、その血管が養う場所の色が変わります。すぐ隣にある、別の血管が養う筋肉は変わりません。',
        look: 'What changed is the muscle, not the artery — and the border between the two regions is where one artery ends and the next begins.',
        lookJa: '変わったのは血管ではなく筋肉です。二つの場所の境目が、担当する血管の切り替わるところです。',
      },
      {
        progress: 0.45,
        stage: 'burden',
        frame: 'wall',
        focus: ['anterior-wall'],
        title: 'That region stops pulling its weight',
        titleJa: 'その場所が縮まなくなる',
        body: 'Muscle short of oxygen contracts less. The rest of the heart carries on, so the whole heart sends out less with each beat than it would have.',
        bodyJa: '酸素の足りない筋肉は、縮む力が落ちます。他の部分は働き続けるので、心臓全体としては 1 回に送り出す量が減ります。',
        look: 'Watch that region move against the muscle beside it: one is still squeezing in, the other is barely moving.',
        lookJa: 'その場所と隣の筋肉の動きを見比べてください。片方は縮み、もう片方はほとんど動きません。',
      },
      {
        progress: 0.8,
        stage: 'reperfusion',
        frame: 'wall',
        focus: ['anterior-wall'],
        title: 'The flow comes back before the movement does',
        titleJa: '血流が戻っても、動きはすぐ戻らない',
        body: 'Open the artery and the blood returns almost at once. The muscle does not: it goes on moving poorly long after it is being supplied again.',
        bodyJa: '血管が開けば血液はほぼすぐに戻ります。筋肉は戻りません——また十分に養われるようになっても、しばらく動きは悪いままです。',
        look: 'The colour of the region recovers first. Keep watching how it moves — that is the part still lagging.',
        lookJa: 'まず色が戻ります。そのあとも動きを見ていてください。遅れているのはそちらです。',
      },
      {
        progress: 0.8,
        stage: 'reperfusion',
        frame: 'wall',
        focus: ['anterior-wall'],
        educationalOnly: true,
        title: 'Why it can be felt in the chest',
        titleJa: '胸に感じられることがある理由',
        body: 'Muscle working with too little oxygen can be felt — often as pressure or tightness across the chest, sometimes reaching the arm, jaw or back, and often brought on by exertion.',
        bodyJa: '酸素が足りないまま働いている筋肉は、感覚として現れることがあります。胸の圧迫感や締めつけとして、腕・あご・背中に広がることもあり、体を動かしたときに出やすいことが知られています。',
        look: 'Nothing new is drawn for this step: it says what the shortage on screen can mean for a person.',
        lookJa: 'この段階で新しく描かれるものはありません。画面の不足が、人にとってどういうことかの説明です。',
      },
    ]),
  }),
  'copd-hyperinflation': Object.freeze({
    title: 'Why air can remain in the lungs',
    titleJa: '肺に空気が残りやすくなる仕組み',
    steps: Object.freeze([
      { progress: 0, title: 'At rest there is more time to breathe out', titleJa: '安静時は息を吐く時間が比較的長い', body: 'This model is already showing an obstructed lung. At rest, expiration is given relatively more time, so much of the air can still leave before the next breath.', bodyJa: 'この画面は最初から、空気が出にくくなった肺を示しています。安静時は呼気の時間が比較的長いため、次の吸気までに多くの空気を外へ出せます。' },
      { progress: 0.38, title: 'Breathing speeds up with exertion', titleJa: '動くと呼吸が速くなる', body: 'As the body asks for more ventilation, breaths come closer together and the time available to breathe out becomes shorter.', bodyJa: '体がより多くの換気を必要とすると呼吸が速くなり、1回ごとに息を吐ける時間が短くなります。' },
      { progress: 0.72, title: 'Some air is left behind', titleJa: '吐ききれない空気が残る', body: 'Because the obstructed lung empties slowly, the next breath can begin before the previous one has fully emptied.', bodyJa: '空気が出にくい肺では吐くのに時間がかかるため、吐ききる前に次の吸気が始まることがあります。' },
      { progress: 1, title: 'Breathing starts from a fuller lung', titleJa: '肺が膨らんだ位置から次の呼吸が始まる', body: 'Air left behind raises the volume from which the next breath starts, leaving less room to breathe in.', bodyJa: '残った空気によって肺がより膨らんだ状態から次の呼吸を始めることになり、さらに吸える余裕が小さくなります。' },
    ]),
  }),
  'asthma-heterogeneity': Object.freeze({
    title: 'Why airflow becomes uneven in asthma',
    titleJa: '喘息で空気の届き方にむらが出る仕組み',
    steps: Object.freeze([
      { progress: 0, title: 'Air travels through branches', titleJa: '空気は枝分かれした気道を通る', body: 'Air reaches the lung through a branching network of airways.', bodyJa: '空気は、枝分かれした気道のネットワークを通って肺の各場所へ届きます。' },
      { progress: 0.4, title: 'Airways can narrow', titleJa: '気道が狭くなる', body: 'In asthma, airway smooth muscle can contract and narrow the passage for air.', bodyJa: '喘息では気道の平滑筋が収縮し、空気の通り道が狭くなることがあります。' },
      { progress: 0.72, title: 'Not every region changes equally', titleJa: 'すべての場所が同じようには変わらない', body: 'Small differences in the airway network can grow into larger differences in how much air reaches each region.', bodyJa: '気道ごとの小さな違いが、肺の各場所へ届く空気量の大きな差につながることがあります。' },
      { progress: 1, title: 'Ventilation becomes patchy', titleJa: '換気にむらが生じる', body: 'Some regions are then ventilated much less than others. This model shows ventilation only, not blood oxygen.', bodyJa: 'その結果、空気が届きにくい場所がまとまって生じます。このモデルが示すのは換気であり、血液中の酸素そのものではありません。' },
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
