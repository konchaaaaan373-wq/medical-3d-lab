/**
 * What the stomach anatomy scene says, in both languages.
 *
 * The shape is `organs/stomach.js` and the division into named lengths is
 * `organs/stomachParts.js`. This file is the naming, and one thing it is
 * careful about: **the parts here are rings of a tube.** The cardia is a region
 * on the lesser-curvature side of the opening and this draws it as a collar all
 * the way round; the incisura angularis is a notch and this has only the
 * narrowing that goes with it. The copy says so where a reader is looking at
 * either one, because a name is a claim and this model cannot support the
 * stronger reading.
 */

/**
 * The regions, as steps along one stomach rather than as five separate things.
 *
 * They were far enough apart that the cardia read as a coloured collar strapped
 * around the organ. A reader has to be able to tell the parts apart *and* see
 * one stomach; these are ordered fundus → pylorus so the run reads as a
 * gradient with boundaries in it.
 */
export const STOMACH_SCENE_COLORS = Object.freeze({
  fundus: '#dfa898',
  cardia: '#d69a92',
  body: '#cf8f88',
  antrum: '#c2807c',
  'pyloric-canal': '#b0716f',
  sphincter: '#f0b9ae',
  esophagus: '#c9a2a6',
  duodenum: '#d99a7c',
});

export const STOMACH_NATURAL_COLORS = Object.freeze({
  fundus: '#cf8f8b',
  cardia: '#cf8f8b',
  body: '#cf8f8b',
  antrum: '#c8878a',
  'pyloric-canal': '#c8878a',
  sphincter: '#e0aca6',
  esophagus: '#c9a2a6',
  duodenum: '#d0947f',
});

export const STOMACH_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'Named regions', labelJa: '部位別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const REGION = (id, name, nameJa, description, descriptionJa, note = null, noteJa = null) => [
  id,
  {
    name,
    nameJa,
    hierarchy: ['Stomach', 'Regions', 'Region'],
    hierarchyJa: ['胃', '胃の部位', '部位'],
    description,
    descriptionJa,
    note,
    noteJa,
    colorKey: id,
    legendKey: 'stomach',
    tags: ['stomach', 'wall'],
  },
];

export function stomachStructureCopy() {
  return new Map([
    REGION(
      'fundus',
      'Fundus',
      '胃底部',
      'The dome above the level of the oesophageal opening. Gas collects here in the upright position, which is why it is the part a plain film shows as a bubble.',
      '食道の開口部より上のドーム状の部分です。立位ではここにガスが溜まるため、単純X線で胃泡として見えます。',
      'A dome, but this model has no fixed volume: nothing here says how much it holds.',
      'ドーム形状のみを示しています。このモデルは容量を表していません。'
    ),
    REGION(
      'cardia',
      'Cardia',
      '噴門部',
      'Where the oesophagus opens into the stomach. Its position here is taken from where the oesophagus actually ends, not written down separately.',
      '食道が胃へ開口する部分です。この場面での位置は、食道の終端から求めており、別に指定した値ではありません。',
      'Drawn as a collar all the way round. The cardia is a region on the lesser-curvature side of the opening, and this model cannot show that asymmetry.',
      '全周のカラー（襟）として描いています。噴門部は本来、開口部の小弯側の領域であり、この非対称性はこのモデルでは表現できません。'
    ),
    REGION(
      'body',
      'Body',
      '胃体部',
      'The largest part, between the cardia and the angular incisure. Its wall carries the parietal cells that make acid and intrinsic factor.',
      '噴門部と角切痕の間の最も大きな部分です。壁には酸と内因子を産生する壁細胞が存在します。',
      'Wall layers and gastric glands are not modelled: this is the outer form only.',
      '壁の層構造や胃腺は表現していません。外形のみのモデルです。'
    ),
    REGION(
      'antrum',
      'Pyloric antrum',
      '幽門前庭部',
      'The distal, narrower part. Peristaltic waves here are strong enough to grind rather than merely mix, which is what the calibre change is about.',
      '遠位側の細い部分です。ここでの蠕動波は混和ではなく粉砕を担う強さを持ち、口径の変化はそれに対応しています。'
    ),
    REGION(
      'pyloric-canal',
      'Pyloric canal',
      '幽門管',
      'The short narrow channel between the antrum and the sphincter.',
      '前庭部と幽門括約筋の間の短く細い管です。'
    ),
    [
      'pyloric-sphincter',
      {
        name: 'Pyloric sphincter',
        nameJa: '幽門括約筋',
        hierarchy: ['Stomach', 'Pylorus', 'Sphincter'],
        hierarchyJa: ['胃', '幽門', '括約筋'],
        description:
          'A ring of muscle at the outlet. It is why gastric emptying is a trickle rather than a pour, and it is drawn as a ring rather than implied by a narrowing.',
        descriptionJa:
          '胃の出口にある輪状の筋です。胃排出が一気ではなく少しずつ進む理由であり、狭窄で暗示するのではなくリングとして描いています。',
        note: 'Its calibre here does not change and no emptying is modelled in this scene.',
        noteJa: 'この場面では口径は変化せず、胃排出も表現していません。',
        colorKey: 'sphincter',
        legendKey: 'sphincter',
        tags: ['stomach'],
      },
    ],
    [
      'esophagus',
      {
        name: 'Abdominal oesophagus',
        nameJa: '腹部食道',
        hierarchy: ['Upper gastrointestinal tract', 'Oesophagus', 'Oesophagus'],
        hierarchyJa: ['上部消化管', '食道', '食道'],
        description:
          'The last stretch of the oesophagus, passing behind the fundus and opening at the cardia. Its lower sphincter is not drawn.',
        descriptionJa:
          '食道の最後の部分で、胃底部の背側を通って噴門で開口します。下部食道括約筋は描いていません。',
        colorKey: 'esophagus',
        legendKey: 'esophagus',
        tags: ['esophagus'],
      },
    ],
    [
      'duodenum',
      {
        name: 'Duodenum',
        nameJa: '十二指腸',
        hierarchy: ['Upper gastrointestinal tract', 'Duodenum', 'Duodenum'],
        hierarchyJa: ['上部消化管', '十二指腸', '十二指腸'],
        description:
          'What the pylorus opens into: a C-shaped first part of the small intestine, curving round the head of the pancreas. It is here so the stomach has somewhere to empty to.',
        descriptionJa:
          '幽門が開口する先で、膵頭部を取り囲むC字型の小腸の最初の部分です。胃の排出先を示すために表示しています。',
        note: 'One tube of constant calibre: the four parts, the papilla and the pancreatic head are not modelled here.',
        noteJa: '一定の口径の1本の管として描いています。十二指腸の4部・乳頭部・膵頭部はこの場面では表現していません。',
        colorKey: 'duodenum',
        legendKey: 'duodenum',
        tags: ['duodenum'],
      },
    ],
  ]);
}

export const STOMACH_ANATOMY_META = Object.freeze({
  id: 'stomach-anatomy',
  status: 'alpha',
  title: 'Interactive stomach anatomy',
  titleJa: '触れて学ぶ胃の解剖',
  subtitle: 'Point to identify; click or tap to pin a region of the stomach',
  subtitleJa: '触れて部位を確認・クリック／タップで胃の部位を固定',
  inspection: { background: 'studio' },
  palette: {
    stomach: STOMACH_SCENE_COLORS.body,
    sphincter: STOMACH_SCENE_COLORS.sphincter,
    esophagus: STOMACH_SCENE_COLORS.esophagus,
    duodenum: STOMACH_SCENE_COLORS.duodenum,
  },
  legend: [
    { key: 'stomach', label: 'Gastric regions', labelJa: '胃の部位' },
    { key: 'sphincter', label: 'Pyloric sphincter', labelJa: '幽門括約筋' },
    { key: 'esophagus', label: 'Oesophagus', labelJa: '食道' },
    { key: 'duodenum', label: 'Duodenum', labelJa: '十二指腸' },
  ],
  stages: [
    {
      id: 'outside',
      name: 'Regions from outside',
      nameJa: '外側から見た部位',
      at: 0,
      summary: 'Fundus, cardia, body, antrum and pyloric canal as five separate walls. Pick one to read what defines it.',
      summaryJa: '胃底部・噴門部・胃体部・前庭部・幽門管を、5つの別々の壁として表示します。部位を選ぶと、その定義が読めます。',
    },
    {
      id: 'through',
      name: 'Through the wall',
      nameJa: '壁を透かす',
      at: 1,
      summary: 'The wall becomes translucent: the sphincter ring at the outlet, and the duodenum it opens into, are behind it.',
      summaryJa: '壁を半透明にします。出口の括約筋リングと、その先の十二指腸が背後にあります。',
    },
  ],
  range: { start: 'Outer form', startJa: '外形', end: 'Through the wall', endJa: '壁を透かす' },
  progressLabel: { label: 'Wall transparency', labelJa: '壁の透過' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — Outer form only: no wall layers, no rugae, no volumes, and the regions are drawn as rings of one tube.',
  disclaimerJa:
    '教育用肉眼解剖モデル：外形のみです。壁の層構造・皺襞・容量は表現しておらず、各部位は1本の管の輪切りとして描いています。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
