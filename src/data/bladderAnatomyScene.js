/**
 * What the bladder anatomy scene says, in both languages.
 *
 * The shape is `scenes/renal/organs/kidney.js` (the same bladder the urinary
 * tract scene draws) and the division is `organs/bladderParts.js`.
 *
 * The scene exists for one structure. Apex, body, fundus and neck are four
 * names for four stretches of the same wall; the **trigone** is a region of
 * lining with a different embryological origin, fixed to the muscle beneath it
 * where the rest of the lining folds, bounded by the three openings, and
 * invisible from outside. Everything else here is what makes the trigone
 * locatable.
 */

export const BLADDER_SCENE_COLORS = Object.freeze({
  apex: '#dcb4c6',
  body: '#c8a6b8',
  fundus: '#b0819b',
  neck: '#96657f',
  trigone: '#e6c17a',
  orifice: '#c8603f',
  'right-ureteric-orifice': '#c8603f',
  'left-ureteric-orifice': '#c8603f',
  'internal-urethral-orifice': '#b0452f',
  'right-ureter': '#8fd6c4',
  'left-ureter': '#8fd6c4',
  urethra: '#b9879b',
});

export const BLADDER_NATURAL_COLORS = Object.freeze({
  apex: '#c8a6b8',
  body: '#c8a6b8',
  fundus: '#c8a6b8',
  neck: '#c8a6b8',
  trigone: '#d8b49a',
  orifice: '#c08878',
  'right-ureteric-orifice': '#c08878',
  'left-ureteric-orifice': '#c08878',
  'internal-urethral-orifice': '#c08878',
  'right-ureter': '#bdd5cd',
  'left-ureter': '#bdd5cd',
  urethra: '#c0a0ac',
});

export const BLADDER_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'Named parts', labelJa: '部位別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function bladderStructureCopy() {
  const wall = (id, name, nameJa, description, descriptionJa, note = null, noteJa = null) => [
    id,
    {
      name,
      nameJa,
      hierarchy: ['Urinary bladder', 'Wall', name],
      hierarchyJa: ['膀胱', '膀胱壁', nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey: 'wall',
      tags: ['wall'],
    },
  ];

  const orifice = (id, name, nameJa, description, descriptionJa, note = null, noteJa = null) => [
    id,
    {
      name,
      nameJa,
      hierarchy: ['Inside the bladder', 'Openings', name],
      hierarchyJa: ['膀胱の内面', '開口部', nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey: 'inside',
      tags: ['inside'],
    },
  ];

  const tract = (id, name, nameJa, description, descriptionJa, note, noteJa) => [
    id,
    {
      name,
      nameJa,
      hierarchy: ['Urinary tract', name, name],
      hierarchyJa: ['尿路', nameJa, nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey: 'tract',
      tags: ['tract'],
    },
  ];

  return new Map([
    wall(
      'apex',
      'Apex',
      '膀胱尖',
      'The front and top corner, pointing towards the pubic symphysis. The remnant of the urachus runs up from here to the umbilicus.',
      '恥骨結合に向かう前上方の頂点です。ここから臍に向かって尿膜管の遺残（正中臍索）が上行します。',
      'The urachal remnant itself is not drawn.',
      '尿膜管の遺残そのものは描いていません。'
    ),
    wall(
      'body',
      'Body',
      '膀胱体',
      'The stretch between apex and neck. It is the part that changes most as the bladder fills — the wall thins and the dome rises out of the pelvis.',
      '膀胱尖と膀胱頸の間の部分です。蓄尿によって最も大きく変化する部分で、壁が薄くなり、ドームが骨盤から立ち上がってきます。',
      'Drawn at one fixed state. Filling is `kidney-anatomy`’s bladder, which changes shape; this one does not.',
      '1つの状態で固定して描いています。蓄尿にともなう形の変化は `kidney-anatomy` の膀胱が担当しており、こちらは変化しません。'
    ),
    wall(
      'fundus',
      'Fundus (base)',
      '膀胱底',
      'The posterior wall, facing backwards and down. The trigone is on the inside of it, which is why this is the wall that matters clinically.',
      '後下方を向く後壁です。その内面に膀胱三角があり、臨床的に重要な壁であるのはこのためです。'
    ),
    wall(
      'neck',
      'Neck',
      '膀胱頸',
      'Where the wall funnels into the urethra, held closed by the internal sphincter. It is the lowest and the most fixed part of the organ.',
      '膀胱壁が尿道へ移行する部分で、内尿道括約筋によって閉じられています。膀胱で最も低く、最も固定された部分です。',
      'No sphincter is drawn as its own structure, and the funnel is gentler here than in life.',
      '括約筋は独立した構造としては描いていません。漏斗状の狭まりも実際より緩やかです。'
    ),
    [
      'trigone',
      {
        name: 'Trigone',
        nameJa: '膀胱三角',
        hierarchy: ['Inside the bladder', 'Mucosa', 'Trigone'],
        hierarchyJa: ['膀胱の内面', '粘膜', '膀胱三角'],
        description:
          'A smooth triangle of lining on the inside of the base, between the two ureteric orifices and the opening into the urethra. It stays smooth while the rest of the lining folds, because it is fixed to the muscle beneath it — and it is where cystitis and bladder tumour are looked for first.',
        descriptionJa:
          '膀胱底の内面にある、左右の尿管口と内尿道口を結ぶ三角形の平滑な粘膜です。下層の筋層に固着しているため、他の部分が皺をつくる状態でもここだけは平滑なままです。膀胱炎や膀胱腫瘍で最初に確認される部位でもあります。',
        note: 'Drawn as a flat patch on the inner surface. It is a region of lining, not a solid: it has no thickness here, and the mucosal folds it is smooth *by contrast with* are not drawn either.',
        noteJa:
          '内面に貼りついた平らな面として描いています。粘膜の「領域」であって立体ではないので、厚みはありません。対比の相手となる粘膜のヒダも描いていません。',
        colorKey: 'trigone',
        legendKey: 'inside',
        tags: ['inside'],
      },
    ],
    orifice(
      'right-ureteric-orifice',
      'Right ureteric orifice',
      '右尿管口',
      'Where the right ureter opens into the bladder, at one upper corner of the trigone. The ureter runs obliquely through the wall for the last of its course, and that obliquity is what stops urine going back up it when the bladder contracts.',
      '右尿管が膀胱に開口する部位で、膀胱三角の上角の一方にあたります。尿管は最後の部分で膀胱壁を斜めに貫いており、この斜走が、膀胱収縮時の逆流を防いでいます。',
      'The oblique intramural course is described but not modelled: the ureter here meets the wall at the orifice without passing through it.',
      '壁内斜走部は文章では述べていますが、形としては表現していません。ここでは尿管が壁を貫かずに開口部で終わっています。'
    ),
    orifice(
      'left-ureteric-orifice',
      'Left ureteric orifice',
      '左尿管口',
      'The same opening on the patient’s left. The two orifices are the upper two corners of the trigone, and the distance between them is what a cystoscopist uses to orient.',
      '患者左側の同じ開口部です。左右の尿管口が膀胱三角の上2角にあたり、膀胱鏡ではこの2点の位置関係が方向の手がかりになります。'
    ),
    orifice(
      'internal-urethral-orifice',
      'Internal urethral orifice',
      '内尿道口',
      'The lower corner of the trigone, where the bladder empties into the urethra.',
      '膀胱三角の下角で、膀胱から尿道へ尿が出ていく開口部です。'
    ),
    tract(
      'right-ureter',
      'Right ureter',
      '右尿管',
      'Brings urine down from the right kidney and enters the back of the bladder obliquely.',
      '右腎からの尿を下降させ、膀胱の後面に斜めに入ります。',
      'Context: the rest of its course, and the kidney it comes from, are in `kidney-anatomy`.',
      '位置関係を示すための表示です。走行の残りと、由来する腎臓は `kidney-anatomy` にあります。'
    ),
    tract(
      'left-ureter',
      'Left ureter',
      '左尿管',
      'The same on the patient’s left.',
      '患者左側の同じ尿管です。',
      'Context: the rest of its course is in `kidney-anatomy`.',
      '位置関係を示すための表示です。走行の残りは `kidney-anatomy` にあります。'
    ),
    tract(
      'urethra',
      'Urethra',
      '尿道',
      'Leaves the neck of the bladder at the trigone’s lower corner.',
      '膀胱三角の下角、膀胱頸から出ていきます。',
      'Only the first stretch is drawn, and it is drawn the same for everyone. The male and female urethra differ in length and in what surrounds them, and neither is modelled here.',
      '最初の部分だけを、男女の区別なく描いています。男性尿道と女性尿道は長さも周囲の構造も異なりますが、どちらもここでは表現していません。'
    ),
  ]);
}

export const BLADDER_ANATOMY_META = Object.freeze({
  id: 'bladder-anatomy',
  status: 'alpha',
  title: 'Interactive bladder anatomy',
  titleJa: '触れて学ぶ膀胱の解剖',
  subtitle: 'Point to identify; click or tap to pin a part of the wall or something on the inside',
  subtitleJa: '触れて部位を確認・クリック／タップで膀胱壁・内面の構造を固定',
  inspection: { background: 'studio' },
  palette: {
    wall: BLADDER_SCENE_COLORS.body,
    inside: BLADDER_SCENE_COLORS.trigone,
    tract: BLADDER_SCENE_COLORS['right-ureter'],
  },
  legend: [
    { key: 'wall', label: 'Apex, body, fundus, neck', labelJa: '膀胱尖・体・底・頸' },
    { key: 'inside', label: 'Trigone and the three openings', labelJa: '膀胱三角と3つの開口部', activeFrom: 0.35 },
    { key: 'tract', label: 'Ureters and urethra', labelJa: '尿管・尿道' },
  ],
  stages: [
    {
      id: 'wall',
      name: 'The organ from outside',
      nameJa: '外から見た膀胱',
      at: 0,
      summary: 'Apex, body, fundus and neck, with the two ureters arriving behind and the urethra leaving below.',
      summaryJa: '膀胱尖・体・底・頸と、後方から入る左右の尿管、下方へ出る尿道です。',
    },
    {
      id: 'inside',
      name: 'The trigone',
      nameJa: '膀胱三角',
      at: 1,
      summary:
        'The wall becomes translucent: a smooth triangle on the inside of the base, with a ureteric orifice at each upper corner and the way out at the lower one.',
      summaryJa:
        '膀胱壁を半透明にすると、膀胱底の内面に平滑な三角形が現れます。上2角が左右の尿管口、下角が内尿道口です。',
    },
  ],
  range: { start: 'Wall', startJa: '膀胱壁', end: 'Trigone', endJa: '膀胱三角' },
  progressLabel: { label: 'Wall transparency', labelJa: '膀胱壁の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — Shape is schematic and no dimension is measured. The bladder is drawn at one fixed degree of filling, the trigone is a flat patch with no thickness, mucosal folds and the sphincters are not drawn, the ureters’ oblique intramural course is not modelled, and the urethra is drawn the same for everyone.',
  disclaimerJa:
    '教育用肉眼解剖モデル：形状は模式的で、いずれの寸法も実測値ではありません。蓄尿の程度は固定、膀胱三角は厚みのない面として描いており、粘膜ヒダ・括約筋・尿管の壁内斜走部は表現していません。尿道は男女の区別なく描いています。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
