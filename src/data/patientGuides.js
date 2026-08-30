/**
 * Patient-facing explanation copy.
 *
 * These guides deliberately avoid diagnosis, prognosis, treatment selection and
 * patient-specific numbers. They explain only the mechanism already represented
 * by the reviewed / production scene underneath them.
 */

export const PATIENT_GUIDES = Object.freeze({
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
      { progress: 0, title: 'Breathing out takes time', titleJa: '息を吐くには時間が必要', body: 'A normal lung has enough time to empty before the next breath begins.', bodyJa: '正常な肺では、次の吸気が始まる前に十分な時間をかけて息を吐ききれます。' },
      { progress: 0.45, title: 'Emptying becomes slower', titleJa: '息が抜けるのが遅くなる', body: 'When airflow is obstructed, air leaves the lungs more slowly.', bodyJa: '気道が狭くなると、肺から空気が出ていく速度が遅くなります。' },
      { progress: 0.75, title: 'The next breath arrives first', titleJa: '吐ききる前に次の呼吸が始まる', body: 'If the next breath starts before the previous one has fully emptied, some air remains behind.', bodyJa: '十分に吐ききる前に次の吸気が始まると、肺の中に空気が残ります。' },
      { progress: 1, title: 'Breathing starts from a fuller lung', titleJa: '肺が膨らんだ位置から呼吸する', body: 'The next breath then starts from a higher lung volume, leaving less room to breathe in.', bodyJa: 'その結果、肺がより膨らんだ状態から次の呼吸を始めることになり、吸える余裕が小さくなります。' },
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
