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
        body: 'A wider chamber that squeezes less firmly empties less completely, so some blood stays behind and pressure can build up behind the heart.',
        bodyJa: '広がった部屋は縮む力も弱いため、完全には空になりません。血液が残り、心臓の手前側に圧がたまることがあります。',
        look: 'Watch what is still inside at the end of a squeeze — that is the blood that did not leave.',
        lookJa: '縮み終わったときに中に残っているものを見てください。それが送り出せなかった血液です。',
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
