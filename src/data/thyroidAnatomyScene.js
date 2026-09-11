/**
 * What the thyroid anatomy scene says, in both languages.
 *
 * The gland is `scenes/endocrine/organs/thyroidAnatomy.js`. The copy is careful
 * about two things:
 *
 * 1. **The parathyroids are four plausible places, not four addresses.** Their
 *    position is the most variable thing in the anterior neck, which is the
 *    reason a surgeon looks for them rather than knowing where they are.
 * 2. **The pyramidal lobe is not always there.** It is present in roughly half
 *    of people; a model that always draws it has to say so, or it is claiming
 *    something about everyone.
 *
 * Nothing here is a measurement. The shape is schematic and the scene's
 * disclaimer says so.
 */

export const THYROID_SCENE_COLORS = Object.freeze({
  'right-lobe': '#d2727a',
  'left-lobe': '#b95863',
  isthmus: '#e69aa0',
  'pyramidal-lobe': '#f0b9b2',
  parathyroid: '#e8b44a',
  nerve: '#ecdd6a',
  trachea: '#cfd6dd',
  oesophagus: '#bd9aa0',
});

export const THYROID_NATURAL_COLORS = Object.freeze({
  'right-lobe': '#b4565f',
  'left-lobe': '#b4565f',
  isthmus: '#b4565f',
  'pyramidal-lobe': '#b4565f',
  parathyroid: '#c08a4c',
  nerve: '#e3dcae',
  trachea: '#d5dadf',
  oesophagus: '#c9a2a6',
});

export const THYROID_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'Named parts', labelJa: '部位別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const entry = (id, value) => [id, value];

export function thyroidStructureCopy() {
  const gland = (id, name, nameJa, description, descriptionJa, note = null, noteJa = null) =>
    entry(id, {
      name,
      nameJa,
      hierarchy: ['Thyroid gland', 'Gland', 'Part'],
      hierarchyJa: ['甲状腺', '甲状腺実質', '部位'],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey: 'gland',
      tags: ['gland'],
    });

  const parathyroid = (id, name, nameJa, description, descriptionJa) =>
    entry(id, {
      name,
      nameJa,
      hierarchy: ['Parathyroid glands', 'Parathyroid', name],
      hierarchyJa: ['副甲状腺', '副甲状腺', nameJa],
      description,
      descriptionJa,
      note: 'Where the parathyroids sit varies more than almost anything else in the neck. These are four plausible places, not four addresses.',
      noteJa:
        '副甲状腺の位置は頸部の構造のなかでも特に個人差が大きい部分です。ここに描いているのは「ありうる位置」であって、決まった座標ではありません。',
      colorKey: 'parathyroid',
      legendKey: 'parathyroid',
      tags: ['parathyroid'],
    });

  const nerve = (id, name, nameJa, description, descriptionJa) =>
    entry(id, {
      name,
      nameJa,
      hierarchy: ['Nerves', 'Recurrent laryngeal nerve', name],
      hierarchyJa: ['神経', '反回神経', nameJa],
      description,
      descriptionJa,
      note: 'Drawn as a smooth cord in the groove. Its course below the neck — round the subclavian artery on the right, round the aortic arch on the left — is not modelled, and that difference is why the two sides are not mirror images in life.',
      noteJa:
        '溝の中を走る1本の索として描いています。頸部より下の経路（右は鎖骨下動脈、左は大動脈弓を回る）は表現していません。左右が実際には鏡像でないのは、この差によるものです。',
      colorKey: 'nerve',
      legendKey: 'nerve',
      tags: ['nerve'],
    });

  const context = (id, name, nameJa, description, descriptionJa, note, noteJa) =>
    entry(id, {
      name,
      nameJa,
      hierarchy: ['Neighbours', name, name],
      hierarchyJa: ['周囲の構造', nameJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey: 'neighbour',
      tags: ['neighbour'],
    });

  return new Map([
    gland(
      'right-lobe',
      'Right lobe',
      '右葉',
      'One wing of the butterfly, lying against the side of the trachea and reaching up along the larynx. Its medial face is hollowed where the trachea presses on it.',
      '蝶の片翼にあたる部分で、気管の側面に接し、喉頭に沿って上方へ伸びます。内側面は気管に押されてくぼんでいます。'
    ),
    gland(
      'left-lobe',
      'Left lobe',
      '左葉',
      'The other wing. Screen-left is the patient’s right, so this is the lobe on the right of the frame.',
      'もう一方の翼です。画面左が患者の右なので、この葉は画面の右側に見えます。'
    ),
    gland(
      'isthmus',
      'Isthmus',
      '峡部',
      'The band across the front of the trachea that joins the two lobes — what makes this one organ rather than two, and the part a tracheostomy has to get past.',
      '気管の前面を横切って左右の葉をつなぐ帯状の部分です。甲状腺が「1つの臓器」である理由であり、気管切開の際に処理が必要になる部分でもあります。'
    ),
    gland(
      'pyramidal-lobe',
      'Pyramidal lobe',
      '錐体葉',
      'A finger of gland running up from the isthmus, usually a little to the patient’s left. It is what is left of the thyroid’s descent from the base of the tongue.',
      '峡部から上方へ伸びる指状の部分で、多くはやや左寄りにあります。甲状腺が舌根部から下降してきた過程の名残です。',
      'Present in roughly half of people. This model always draws it; do not read that as "everyone has one".',
      'およそ半数の人に見られる構造です。このモデルは常に描いていますが、「必ずある」という意味ではありません。'
    ),
    parathyroid(
      'right-superior-parathyroid',
      'Right superior parathyroid',
      '右上副甲状腺',
      'One of four small glands on the back of the thyroid. They control calcium, and they are not thyroid tissue — which is why removing a thyroid without finding them causes a calcium problem rather than a thyroid one.',
      '甲状腺の背面にある4つの小さな腺の1つです。カルシウム代謝を担い、甲状腺組織ではありません。甲状腺全摘で見落とすと、甲状腺ではなくカルシウムの問題が起きるのはこのためです。'
    ),
    parathyroid(
      'left-superior-parathyroid',
      'Left superior parathyroid',
      '左上副甲状腺',
      'The upper gland on the patient’s left. The superior pair are the more constant of the four in position.',
      '患者左側の上方の腺です。上の1対は、4つのなかでは位置が比較的一定とされます。'
    ),
    parathyroid(
      'right-inferior-parathyroid',
      'Right inferior parathyroid',
      '右下副甲状腺',
      'The lower gland on the patient’s right. The inferior pair travel further in development and end up in the widest range of places.',
      '患者右側の下方の腺です。下の1対は発生の過程で長く移動するため、位置の幅が最も広くなります。'
    ),
    parathyroid(
      'left-inferior-parathyroid',
      'Left inferior parathyroid',
      '左下副甲状腺',
      'The lower gland on the patient’s left.',
      '患者左側の下方の腺です。'
    ),
    nerve(
      'right-recurrent-laryngeal-nerve',
      'Right recurrent laryngeal nerve',
      '右反回神経',
      'Runs up in the groove between the trachea and the oesophagus, behind the gland, to supply the muscles that move the vocal cord. It is the structure a thyroidectomy is careful about, and injuring it changes the voice.',
      '気管と食道の間の溝を、甲状腺の背側で上行し、声帯を動かす筋を支配します。甲状腺手術で最も注意される構造で、損傷すると声が変わります。'
    ),
    nerve(
      'left-recurrent-laryngeal-nerve',
      'Left recurrent laryngeal nerve',
      '左反回神経',
      'The same nerve on the patient’s left, in the same groove.',
      '患者左側の同じ神経で、同じ溝を走ります。'
    ),
    context(
      'trachea',
      'Trachea',
      '気管',
      'The airway the gland is wrapped around. It is here because the shape of the thyroid is the shape of something clasped around a tube.',
      '甲状腺が抱きつくように取り巻いている気道です。甲状腺の形は「管に巻きついた形」なので、気管なしでは形の意味が読めません。',
      'Context only: a plain tube, with no cartilage rings and no larynx above it.',
      '位置関係を示すためだけの表示です。軟骨輪も、その上の喉頭も描いていません。'
    ),
    context(
      'oesophagus',
      'Oesophagus',
      '食道',
      'Behind the trachea. It is drawn because the groove between the two is where the recurrent laryngeal nerve runs — without it, the groove is nothing at all.',
      '気管の背側にあります。気管との間の溝が反回神経の走行部位なので、食道を描かないとその溝が意味を持ちません。',
      'Context only: a plain tube of constant calibre.',
      '位置関係を示すためだけの表示です。口径一定の管として描いています。'
    ),
  ]);
}

export const THYROID_ANATOMY_META = Object.freeze({
  id: 'thyroid-anatomy',
  status: 'alpha',
  title: 'Interactive thyroid anatomy',
  titleJa: '触れて学ぶ甲状腺の解剖',
  subtitle: 'Point to identify; click or tap to pin a lobe, a parathyroid gland or a nerve',
  subtitleJa: '触れて部位を確認・クリック／タップで甲状腺・副甲状腺・神経を固定',
  inspection: { background: 'studio' },
  palette: {
    gland: THYROID_SCENE_COLORS['right-lobe'],
    parathyroid: THYROID_SCENE_COLORS.parathyroid,
    nerve: THYROID_SCENE_COLORS.nerve,
    neighbour: THYROID_SCENE_COLORS.trachea,
  },
  legend: [
    { key: 'gland', label: 'Thyroid lobes and isthmus', labelJa: '甲状腺（葉・峡部）' },
    { key: 'parathyroid', label: 'Parathyroid glands', labelJa: '副甲状腺', activeFrom: 0.35 },
    { key: 'nerve', label: 'Recurrent laryngeal nerves', labelJa: '反回神経', activeFrom: 0.35 },
    { key: 'neighbour', label: 'Trachea and oesophagus', labelJa: '気管・食道' },
  ],
  stages: [
    {
      id: 'gland',
      name: 'The gland from in front',
      nameJa: '前から見た甲状腺',
      at: 0,
      summary: 'Two lobes and the isthmus between them, clasped around the trachea.',
      summaryJa: '気管を抱き込む左右の葉と、その間の峡部です。',
    },
    {
      id: 'behind',
      name: 'What is behind it',
      nameJa: '背側にあるもの',
      at: 1,
      summary:
        'The gland fades: four parathyroid glands on its posterior surface, and a recurrent laryngeal nerve on each side in the groove between trachea and oesophagus.',
      summaryJa:
        '甲状腺を薄くすると、背面の4つの副甲状腺と、気管・食道間の溝を走る左右の反回神経が見えます。',
    },
  ],
  range: { start: 'Gland', startJa: '甲状腺', end: 'Behind the gland', endJa: '背側の構造' },
  progressLabel: { label: 'Gland transparency', labelJa: '甲状腺の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — Shape is schematic and no dimension is measured. Parathyroid positions are plausible, not fixed; the pyramidal lobe is present in about half of people; no vessels, cartilage or strap muscles are drawn.',
  disclaimerJa:
    '教育用肉眼解剖モデル：形状は模式的で、いずれの寸法も実測値ではありません。副甲状腺の位置は「ありうる位置」であって固定ではなく、錐体葉は約半数の人に見られる構造です。血管・軟骨・前頸筋群は描いていません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
