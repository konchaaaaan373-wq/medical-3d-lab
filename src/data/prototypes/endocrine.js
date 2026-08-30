/** Copy for the endocrine prototype scenes. All PROTOTYPE-grade. */

export const THYROID_HORMONE = {
  id: 'thyroid-hormone',
  status: 'prototype',
  title: 'Thyroid hormone release',
  titleJa: '甲状腺ホルモンの放出',
  subtitle: 'Follicles releasing into the blood as stimulation rises · prototype',
  subtitleJa: '刺激に応じて濾胞から血中へ ｜ プロトタイプ',

  palette: {
    gland: '#b4565f',
    follicle: '#ffd9a0',
    trachea: '#7f8b9e',
    hormone: '#ffb066',
  },

  legend: [
    { key: 'gland', label: 'Thyroid', labelJa: '甲状腺' },
    { key: 'follicle', label: 'Follicle', labelJa: '濾胞' },
    { key: 'trachea', label: 'Trachea', labelJa: '気管' },
    { key: 'hormone', label: 'Hormone into blood', labelJa: '血中へのホルモン' },
  ],

  stages: [
    {
      id: 'baseline',
      name: 'Baseline',
      nameJa: '基礎分泌',
      at: 0,
      summary:
        'The thyroid stores its product outside the cells, in follicles — unusual among glands, and the reason it can keep releasing for a long time.',
      summaryJa:
        '甲状腺はホルモンを細胞外の濾胞内に貯蔵します。内分泌腺としては珍しい仕組みで、長期間放出を続けられる理由でもあります。',
    },
    {
      id: 'stimulated',
      name: 'Stimulated',
      nameJa: '刺激時',
      at: 0.45,
      summary:
        'Stimulation increases release from the stored pool into the surrounding capillaries; the follicles give up their contents rather than making them on demand.',
      summaryJa:
        '刺激により、貯蔵されたホルモンが周囲の毛細血管へ放出されます。その場で新規に作るのではなく、蓄えを放出する形です。',
    },
    {
      id: 'sustained',
      name: 'Sustained release',
      nameJa: '持続的な放出',
      at: 0.78,
      summary:
        'Because the store is large, output can stay high for a long time — which is also why the effects of too much of it come on slowly.',
      summaryJa:
        '貯蔵量が大きいため、高い放出を長く維持できます。過剰状態の影響がゆっくり現れる理由でもあります。',
    },
  ],

  range: { start: 'Low', startJa: '低', end: 'High', endJa: '高' },
  progressLabel: { label: 'Stimulation', labelJa: '刺激の強さ' },

  annotations: [
    { id: 'right-lobe', text: 'Right lobe', sub: '右葉', anchor: 'rightLobe', range: [0, 1] },
    { id: 'left-lobe', text: 'Left lobe', sub: '左葉', anchor: 'leftLobe', range: [0, 1], compact: false },
    { id: 'isthmus', text: 'Isthmus', sub: '峡部', anchor: 'isthmus', range: [0, 1] },
    { id: 'follicle', text: 'Follicle', sub: '濾胞', anchor: 'follicle', range: [0.3, 1] },
    { id: 'trachea', text: 'Trachea', sub: '気管', anchor: 'trachea', range: [0, 0.5], compact: false },
  ],
};

export const ADRENAL_RESPONSE = {
  id: 'adrenal-response',
  status: 'prototype',
  title: 'Adrenal response',
  titleJa: '副腎の反応',
  subtitle: 'One capsule, two pathways, ninety minutes · prototype',
  subtitleJa: '1 つの被膜に入った 2 つの経路と、90 分の時間差 ｜ プロトタイプ',

  palette: {
    cortex: '#e8c88a',
    medulla: '#9c6bd8',
    kidney: '#a0555c',
    nerve: '#7d92a6',
    impulse: '#8ff0ff',
    artery: '#b8555f',
    acth: '#7ee0a8',
    fast: '#c08cff',
    slow: '#ffd08a',
  },

  legend: [
    { key: 'cortex', label: 'Cortex', labelJa: '皮質' },
    { key: 'medulla', label: 'Medulla', labelJa: '髄質' },
    { key: 'impulse', label: 'Nerve signal → medulla', labelJa: '神経信号 → 髄質' },
    { key: 'fast', label: 'Catecholamines released', labelJa: 'カテコールアミン放出' },
    { key: 'acth', label: 'ACTH → cortex', labelJa: 'ACTH → 皮質', activeFrom: 0.24 },
    { key: 'slow', label: 'Cortisol released', labelJa: 'コルチゾール放出', activeFrom: 0.3 },
  ],

  // The slider is a clock, so the stage markers sit at times, not at
  // intensities. `at` values come from the model's own progress↔minutes map:
  // 0 min, 1 min, 4 min, 15 min, 60 min.
  stages: [
    {
      id: 'onset',
      name: 'Stressor begins',
      nameJa: 'ストレッサー開始',
      at: 0,
      summary:
        'Time zero. Both parts of the gland are already releasing a little at rest — the question is not whether they respond but how long each one takes.',
      summaryJa:
        '0 分。安静時にも皮質・髄質はわずかに分泌しています。問題は「反応するかどうか」ではなく「どちらがどれだけ早いか」です。',
    },
    {
      id: 'neural',
      name: '≈ 1 minute · nerve',
      nameJa: '約 1 分｜神経性',
      at: 0.223,
      summary:
        'Sympathetic fibres reach the medulla directly, with no gland in between, so catecholamines are already pouring into the vein. Nothing has yet arrived at the cortex.',
      summaryJa:
        '交感神経線維は間に腺を挟まず髄質に直接届くため、カテコールアミンはすでに静脈へ流れ出しています。皮質にはまだ何も届いていません。',
    },
    {
      id: 'acth',
      name: '≈ 4 minutes · ACTH arrives',
      nameJa: '約 4 分｜ACTH 到達',
      at: 0.355,
      summary:
        'The stressor is over and the nerve has gone quiet, but ACTH — made in the pituitary and carried here in the blood — is only now reaching the cortex. Two signals, two routes, two speeds.',
      summaryJa:
        'ストレッサーは終わり神経信号も止まっていますが、下垂体で作られ血流で運ばれた ACTH はいま皮質に届いたところです。信号も経路も速さも別物です。',
    },
    {
      id: 'cortisol',
      name: '≈ 15 minutes · cortisol peak',
      nameJa: '約 15 分｜コルチゾール最大',
      at: 0.55,
      summary:
        'Cortisol peaks about a quarter of an hour in, by which time the catecholamine response has been over for ten minutes. The delay is not a property of the cortex; it is what a three-step cascade costs.',
      summaryJa:
        'コルチゾールは約 15 分でピークに達します。その頃カテコールアミン反応は 10 分前に終わっています。この遅れは皮質の性質ではなく、3 段階のカスケードを通る代償です。',
    },
    {
      id: 'tail',
      name: '≈ 60 minutes · long tail',
      nameJa: '約 60 分｜長い後尾',
      at: 0.874,
      summary:
        'An hour after a stressor that lasted two minutes, the neural limb is long gone and the endocrine one is still coming down. This is why "the stress response" cannot be drawn as one curve.',
      summaryJa:
        '2 分間のストレッサーから 1 時間後、神経性の反応はとうに終わり、内分泌性の反応はまだ下降途中です。「ストレス反応」を 1 本の曲線で描けない理由がここにあります。',
    },
  ],

  range: { start: '0 min', startJa: '0 分', end: '90 min', endJa: '90 分' },
  progressLabel: { label: 'Time after stressor onset', labelJa: 'ストレッサー開始後時間' },

  annotations: [
    { id: 'cortex', text: 'Cortex', sub: '皮質', anchor: 'cortex', range: [0, 1] },
    { id: 'medulla', text: 'Medulla', sub: '髄質', anchor: 'medulla', range: [0, 1] },
    { id: 'nerve', text: 'Sympathetic nerve', sub: '交感神経（秒）', anchor: 'nerve', range: [0, 0.45] },
    { id: 'artery', text: 'ACTH in the blood', sub: 'ACTH（血流・分）', anchor: 'artery', range: [0.24, 1] },
    { id: 'kidney', text: 'Kidney', sub: '腎臓', anchor: 'kidney', range: [0, 0.5], compact: false },
    { id: 'vein', text: 'To the bloodstream', sub: '血中へ', anchor: 'vein', range: [0.3, 1], compact: false },
  ],
};
