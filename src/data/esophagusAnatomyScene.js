/**
 * What the oesophagus anatomy scene says, in both languages.
 *
 * The geometry is `scenes/gastrointestinal/organs/esophagusParts.js`. The scene
 * exists for the **three constrictions**, and the copy is organised around one
 * idea: each of the three is narrow for a different reason, and the reason is
 * drawn beside it. A muscle ring at the top, two structures crossing it in the
 * chest, a hole in a sheet of muscle at the bottom.
 *
 * No length, no calibre and no distance-from-the-incisors is given, because
 * this model cannot support one. The order and the neighbours are the claim.
 */

export const ESOPHAGUS_SCENE_COLORS = Object.freeze({
  cervical: '#d8a8ac',
  thoracic: '#c9a2a6',
  abdominal: '#b0868d',
  constriction: '#d8703f',
  'cricopharyngeal-constriction': '#e08a4a',
  'aortobronchial-constriction': '#d8703f',
  'diaphragmatic-constriction': '#c25a34',
  trachea: '#cfd6dd',
  'left-main-bronchus': '#bcc6cf',
  'aortic-arch': '#b0413c',
  diaphragm: '#c46f6a',
  'gastric-cardia': '#d98f93',
});

export const ESOPHAGUS_NATURAL_COLORS = Object.freeze({
  cervical: '#c9a2a6',
  thoracic: '#c9a2a6',
  abdominal: '#c9a2a6',
  constriction: '#bd9298',
  'cricopharyngeal-constriction': '#bd9298',
  'aortobronchial-constriction': '#bd9298',
  'diaphragmatic-constriction': '#bd9298',
  trachea: '#d5dadf',
  'left-main-bronchus': '#d5dadf',
  'aortic-arch': '#a8423c',
  diaphragm: '#c07570',
  'gastric-cardia': '#d0888c',
});

export const ESOPHAGUS_COLOR_MODES = Object.freeze([
  { id: 'regions', label: 'Named parts', labelJa: '部位別' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

export function esophagusStructureCopy() {
  const part = (id, name, nameJa, description, descriptionJa, note = null, noteJa = null) => [
    id,
    {
      name,
      nameJa,
      hierarchy: ['Oesophagus', 'Parts', name],
      hierarchyJa: ['食道', '部位', nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey: 'tube',
      tags: ['tube'],
    },
  ];

  const constriction = (id, name, nameJa, description, descriptionJa, note, noteJa) => [
    id,
    {
      name,
      nameJa,
      hierarchy: ['Oesophagus', 'Constrictions', name],
      hierarchyJa: ['食道', '生理的狭窄部', nameJa],
      description,
      descriptionJa,
      note,
      noteJa,
      colorKey: id,
      legendKey: 'constriction',
      tags: ['constriction'],
    },
  ];

  const neighbour = (id, name, nameJa, description, descriptionJa, note, noteJa) => [
    id,
    {
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
    },
  ];

  return new Map([
    part(
      'cervical',
      'Cervical part',
      '頸部食道',
      'From the pharynx down to the thoracic inlet, behind the trachea. It is the only stretch that can be reached from the neck.',
      '咽頭から胸郭入口部まで、気管の背側を下行する部分です。頸部からアプローチできる唯一の区間です。'
    ),
    part(
      'thoracic',
      'Thoracic part',
      '胸部食道',
      'The long stretch through the chest, behind the trachea and then behind the heart, with the aortic arch and the left main bronchus crossing it.',
      '胸腔内を走る長い区間です。気管の背側、続いて心臓の背側を通り、大動脈弓と左主気管支がこれを越えていきます。'
    ),
    part(
      'abdominal',
      'Abdominal part',
      '腹部食道',
      'The short stretch below the diaphragm, turning to the patient’s left to reach the cardia. It is short, and being short is why so little of the oesophagus is inside the abdomen at all.',
      '横隔膜より下の短い区間で、左方へ向かって噴門に達します。短いこと自体が、食道のうち腹腔内にある部分がごくわずかである理由です。',
      'The angle it meets the stomach at, and the crura that grip it, are not drawn — so nothing here shows why reflux is resisted.',
      '胃との合流角度や、これを締める横隔膜脚は描いていません。したがって逆流が防がれる仕組みはここでは示せていません。'
    ),
    constriction(
      'cricopharyngeal-constriction',
      'Cricopharyngeal constriction',
      '輪状咽頭部（第1狭窄）',
      'The narrowest point of the whole tube, made by a ring of muscle at the top. It is the first place a swallowed object stops and the first resistance a scope meets.',
      '食道全体で最も狭い部位で、上端の輪状咽頭筋という筋の輪によって作られます。飲み込んだ異物が最初に止まる場所であり、内視鏡が最初に抵抗を感じる場所でもあります。',
      'Made by a muscle. No muscle is drawn here — the narrowing is in the calibre of the tube, and the ring marks where it is.',
      '筋によって作られる狭窄ですが、その筋自体は描いていません。狭窄は管の口径として表現し、リングはその位置を示すだけのものです。'
    ),
    constriction(
      'aortobronchial-constriction',
      'Aortic and bronchial constriction',
      '大動脈・気管支交叉部（第2狭窄）',
      'Narrow because two things cross it: the aortic arch behind and to the left, and the left main bronchus in front. Both are drawn, because "why is it narrow here" has no answer without them.',
      '2つの構造が交叉するために狭くなります。背側左方を大動脈弓が、腹側を左主気管支が越えていきます。両者を描いているのは、「なぜここが狭いのか」がそれなしには答えられないからです。',
      'Often counted as two separate constrictions rather than one. Drawn as one here, and the two structures that make it are separately selectable.',
      '2つの別の狭窄として数える流儀もあります。ここでは1つとして描き、その原因となる2つの構造を個別に選べるようにしています。'
    ),
    constriction(
      'diaphragmatic-constriction',
      'Diaphragmatic constriction',
      '横隔膜貫通部（第3狭窄）',
      'Where the tube passes through the hole in the diaphragm. It is the last narrowing before the stomach, and the one a stricture most often forms at.',
      '横隔膜の裂孔を貫通する部位です。胃に達する前の最後の狭窄であり、狭窄症が最も生じやすい部位でもあります。',
      'The hiatus is drawn as a ring in a sheet. The crura that form it, and the sliding of the junction that makes a hiatus hernia, are not modelled.',
      '食道裂孔は、面に開いた輪として描いています。裂孔を構成する横隔膜脚も、食道裂孔ヘルニアで起こる接合部の移動も表現していません。'
    ),
    neighbour(
      'trachea',
      'Trachea',
      '気管',
      'In front of the oesophagus for the whole of the neck and the upper chest. The two share a wall, which is why a fistula between them is possible at all.',
      '頸部から上縦隔まで、食道の腹側を並走します。両者は壁を共有しており、気管食道瘻が成立しうるのはこのためです。',
      'Context only: a plain tube with no cartilage rings.',
      '位置関係を示すためだけの表示です。軟骨輪のない単純な管として描いています。'
    ),
    neighbour(
      'left-main-bronchus',
      'Left main bronchus',
      '左主気管支',
      'Crosses in front of the oesophagus below the carina. One of the two structures that make the middle constriction.',
      '気管分岐部より下で食道の腹側を横切ります。中部の狭窄を作る2つの構造のうちの1つです。',
      'Context only: the rest of the airway is `lung-anatomy`.',
      '位置関係を示すためだけの表示です。気道の全体は `lung-anatomy` にあります。'
    ),
    neighbour(
      'aortic-arch',
      'Aortic arch',
      '大動脈弓',
      'Arches over and behind the oesophagus to the patient’s left. The other structure that makes the middle constriction.',
      '食道の背側左方を弓状に越えていきます。中部の狭窄を作るもう1つの構造です。',
      'Context only: one smooth tube, with none of its branches drawn.',
      '位置関係を示すためだけの表示です。分枝を描いていない滑らかな管として表現しています。'
    ),
    neighbour(
      'diaphragm',
      'Diaphragm',
      '横隔膜',
      'The sheet the oesophagus passes through. It is drawn as a ring around the hiatus so that "through a hole in a muscle" is something to look at rather than something to be told.',
      '食道が貫通する筋の膜です。「筋の穴を通っている」ことを文章ではなく形として示すために、裂孔を囲む輪として描いています。',
      'Context only: a ring standing for a sheet. The whole diaphragm, and its motion, are `breathing-lungs`.',
      '位置関係を示すためだけの表示です。膜全体を輪で代表させています。横隔膜の全体とその動きは `breathing-lungs` にあります。'
    ),
    neighbour(
      'gastric-cardia',
      'Cardia of the stomach',
      '胃噴門部',
      'Where the oesophagus ends. It is drawn because a tube that stops in mid-air does not say what it was for.',
      '食道が終わる部位です。空中で途切れる管では何のための管かが伝わらないため、ここに描いています。',
      'Context only: the stomach itself is `stomach-anatomy`.',
      '位置関係を示すためだけの表示です。胃そのものは `stomach-anatomy` にあります。'
    ),
  ]);
}

export const ESOPHAGUS_ANATOMY_META = Object.freeze({
  id: 'esophagus-anatomy',
  status: 'alpha',
  title: 'Interactive oesophageal anatomy',
  titleJa: '触れて学ぶ食道の解剖',
  subtitle: 'Point to identify; click or tap to pin a part of the tube or one of its three narrowings',
  subtitleJa: '触れて部位を確認・クリック／タップで食道の部位・3つの狭窄部を固定',
  inspection: { background: 'studio' },
  palette: {
    tube: ESOPHAGUS_SCENE_COLORS.thoracic,
    constriction: ESOPHAGUS_SCENE_COLORS.constriction,
    neighbour: ESOPHAGUS_SCENE_COLORS['aortic-arch'],
  },
  legend: [
    { key: 'tube', label: 'Cervical, thoracic, abdominal', labelJa: '頸部・胸部・腹部' },
    { key: 'constriction', label: 'The three constrictions', labelJa: '3つの生理的狭窄部' },
    { key: 'neighbour', label: 'What crosses and surrounds it', labelJa: '交叉・周囲の構造' },
  ],
  stages: [
    {
      id: 'tube',
      name: 'The tube and its narrowings',
      nameJa: '食道と狭窄部',
      at: 0,
      summary: 'Cervical, thoracic and abdominal parts, with a ring at each of the three places it is narrow — behind the trachea, which is standing in front of most of it.',
      summaryJa: '頸部・胸部・腹部食道と、3か所の狭窄部を示すリングです。上部の大半は、前に立つ気管の陰になっています。',
    },
    {
      id: 'why',
      name: 'Why it is narrow there',
      nameJa: 'なぜそこが狭いのか',
      at: 1,
      summary:
        'The trachea steps back and the rest come up: the aortic arch behind, the left main bronchus in front, the diaphragm it passes through.',
      summaryJa:
        '気管が薄くなり、残りの構造が現れます。背側の大動脈弓、腹側の左主気管支、そして貫通する横隔膜です。',
    },
  ],
  range: { start: 'The tube', startJa: '食道', end: 'Its neighbours', endJa: '周囲の構造' },
  progressLabel: { label: 'The structures around it', labelJa: '周囲の構造' },
  disclaimer:
    'EDUCATIONAL GROSS-ANATOMY MODEL — Lengths, calibres and angles are drawn to be legible and none is a measurement. No distance from the incisors is given or implied. What is claimed is the order of the parts and which structure makes each narrowing. Muscle layers, the sphincters, the crura, the vagus nerves and the venous plexus are not drawn.',
  disclaimerJa:
    '教育用肉眼解剖モデル：長さ・口径・角度は見やすさのために描いたもので、いずれも実測値ではありません。門歯からの距離は示しておらず、示唆もしていません。主張しているのは部位の順序と、各狭窄を作る構造です。筋層・括約筋・横隔膜脚・迷走神経・静脈叢は描いていません。',
  disclaimerShort: 'Educational gross anatomy — not for clinical use',
  disclaimerShortJa: '教育用肉眼解剖 — 臨床使用不可',
});
