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
 *
 * ## The three parts of a step
 *
 * `title` says **what changes**, `body` says **what happens because of it**,
 * and `look`/`lookJa` say **where on the screen to see it**. The third is the
 * one that was missing, and it is the one a person sitting in front of the
 * model actually needs: an explanation that does not say where to look is a
 * paragraph next to a moving picture, and the reader watches the wrong part of
 * it. It names what the product itself renders — a read-out's own label, or
 * something visible in the 3D — so the words and the screen cannot drift.
 *
 * Each of these is paired with a specialist walk-through on the same scene:
 * the scene's `getCausalStory()`, whose steps carry `watch` (which read-outs)
 * and `chart`. The two registers describe one model at one set of states, and
 * `tests/disease-explanations.test.js` holds them to that.
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
  'copd-hyperinflation': Object.freeze({
    title: 'Why air can remain in the lungs',
    titleJa: '肺に空気が残りやすくなる仕組み',
    steps: Object.freeze([
      { progress: 0, title: 'At rest there is more time to breathe out', titleJa: '安静時は息を吐く時間が比較的長い', body: 'This model is already showing an obstructed lung. At rest, expiration is given relatively more time, so much of the air can still leave before the next breath.', bodyJa: 'この画面は最初から、空気が出にくくなった肺を示しています。安静時は呼気の時間が比較的長いため、次の吸気までに多くの空気を外へ出せます。', look: 'Watch the volume trace along the bottom: each breath comes back down to the same low point.', lookJa: '画面下の肺気量の波形を見てください。1回ごとの呼吸が同じ低さまで戻っています。' },
      { progress: 0.38, title: 'Breathing speeds up with exertion', titleJa: '動くと呼吸が速くなる', body: 'As the body asks for more ventilation, breaths come closer together and the time available to breathe out becomes shorter.', bodyJa: '体がより多くの換気を必要とすると呼吸が速くなり、1回ごとに息を吐ける時間が短くなります。', look: 'Watch the read-out marked Expiratory time. It gets shorter as the breathing speeds up.', lookJa: '「呼気時間」の数値を見てください。呼吸が速くなるにつれて短くなります。' },
      { progress: 0.72, title: 'Some air is left behind', titleJa: '吐ききれない空気が残る', body: 'Because the obstructed lung empties slowly, the next breath can begin before the previous one has fully emptied.', bodyJa: '空気が出にくい肺では吐くのに時間がかかるため、吐ききる前に次の吸気が始まることがあります。', look: 'Watch the low point of the trace: it stops coming all the way back down.', lookJa: '波形の一番低いところを見てください。もとの低さまで戻らなくなります。' },
      { progress: 1, title: 'Breathing starts from a fuller lung', titleJa: '肺が膨らんだ位置から次の呼吸が始まる', body: 'Air left behind raises the volume from which the next breath starts, leaving less room to breathe in.', bodyJa: '残った空気によって肺がより膨らんだ状態から次の呼吸を始めることになり、さらに吸える余裕が小さくなります。', look: 'Watch the read-out marked Inspiratory capacity, and the lungs themselves sitting fuller.', lookJa: '「最大吸気量（IC）」の数値と、膨らんだままの肺そのものを見てください。' },
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
      { progress: 0, title: 'Blood flows through the liver', titleJa: '血液が肝臓を通る', body: 'Blood from the digestive organs normally flows through the portal vein and then through the liver.', bodyJa: '消化管などから戻った血液は、通常は門脈を通って肝臓の中を流れます。', look: 'Watch the blood moving through the liver, and the read-out marked Portal pressure.', lookJa: '肝臓の中を通っていく血流と、「門脈圧」の数値を見てください。' },
      { progress: 0.42, title: 'The liver becomes harder to flow through', titleJa: '肝臓の中を通りにくくなる', body: 'Cirrhosis changes the liver structure and increases resistance to that flow.', bodyJa: '肝硬変では肝臓の構造が変化し、血液が通るときの抵抗が大きくなります。', look: 'Watch the read-out marked Intrahepatic resistance climbing.', lookJa: '「肝内血管抵抗」の数値が上がっていくのを見てください。' },
      { progress: 0.72, title: 'Portal pressure rises', titleJa: '門脈の圧が上がる', body: 'More pressure is then needed to drive blood across the liver.', bodyJa: 'そのため、肝臓へ血液を通すために、より高い圧が必要になります。', look: 'Watch the read-out marked Portal pressure rising while the flow through the liver does not.', lookJa: '「門脈圧」が上がる一方で、「肝臓を通る門脈血」が増えないことを見てください。' },
      { progress: 1, title: 'Blood can take detours', titleJa: '血液が迂回路へ流れる', body: 'Alternative veins can carry part of the blood around the liver, but the underlying resistance in the liver remains.', bodyJa: '血液の一部は別の静脈を迂回するようになりますが、肝臓の中の通りにくさ自体がなくなるわけではありません。', look: 'Watch the vessels that fill up beside the liver, and the read-out marked Bypassing liver tissue.', lookJa: '肝臓の脇で満たされていく血管と、「肝組織を迂回する割合」の数値を見てください。' },
    ]),
  }),
  /**
   * The third of the first wave's representative diseases.
   *
   * **Authored, and not reachable yet.** Patient mode is an entitlement, and a
   * scene only advertises it once it is `reviewed` or `production` with a
   * current clinical review; `renal-filtration` is `alpha`. The copy is here so
   * that the three representative diseases are explained to the same standard
   * and in the same shape, and so the surface has something to show the day the
   * scene is promoted. Nothing about billing or the gate is changed by its
   * being written down.
   */
  'renal-filtration': Object.freeze({
    title: 'Why the kidney can keep its numbers normal for a while',
    titleJa: '腎臓がしばらくのあいだ数値を保てる仕組み',
    steps: Object.freeze([
      {
        progress: 0,
        title: 'Filtering happens in many small units',
        titleJa: 'ろ過はたくさんの小さな単位で行われている',
        body: 'Each kidney filters blood through a very large number of small filtering units. Together they set how much is filtered each minute.',
        bodyJa: '腎臓は非常に多数の小さなろ過装置で血液をろ過しています。その合計が、1分あたりのろ過量を決めています。',
        look: 'Watch the read-out marked GFR — the amount filtered each minute — while the model is intact.',
        lookJa: '健常な状態での「GFR」（1分あたりのろ過量）の数値を見てください。',
      },
      {
        progress: 0.5,
        title: 'The remaining units take on more each',
        titleJa: '残った単位が1つあたりの仕事を増やす',
        body: 'If some units are lost, the ones that remain can each filter more. The total can then stay close to where it was, which is why the usual blood test can look unchanged at this stage.',
        bodyJa: '一部の単位が失われても、残った単位が1つあたりのろ過量を増やすことができます。そのため合計は以前に近い値のまま保たれ、この段階では通常の血液検査に変化が出にくくなります。',
        look: 'Watch the read-out marked Single-nephron GFR going up while GFR itself barely moves.',
        lookJa: '「1 ネフロンあたり GFR」が上がる一方で、「GFR」自体はほとんど動かないことを見てください。',
      },
      {
        progress: 1,
        title: 'There is a limit to that',
        titleJa: 'その仕組みには限界がある',
        body: 'Once enough units are gone, the ones that remain cannot make up the difference, and the total filtered each minute falls. This model shows that relationship; it does not tell any one person how much filtering they have or will have.',
        bodyJa: '失われた単位が一定以上になると、残った単位では補いきれなくなり、1分あたりのろ過量そのものが下がります。このモデルはその関係を示すもので、特定の個人のろ過量やその見通しを示すものではありません。',
        look: 'Watch the read-out marked GFR falling, and Plasma creatinine rising as it does.',
        lookJa: '「GFR」が下がり、それにつれて「血清 Cr」が上がっていくのを見てください。',
      },
    ]),
  }),
});

export const patientGuideFor = (sceneId) => PATIENT_GUIDES[sceneId] ?? null;
