/**
 * What the kidney anatomy scene says, in both languages.
 *
 * The geometry is `src/scenes/renal/organs/kidney.js`. Asked for parts it cuts
 * the cortex as one shell between the capsule and the corticomedullary
 * junction, and partitions what is inside that shell into seven medullary
 * pyramids with the cortical columns between them; the collecting system is
 * drawn from the papilla outwards, a minor calyx cupping each papilla and three
 * major calyces gathering them into the pelvis. This file names those parts.
 *
 * Two things this copy is careful about, because the model is careful about
 * them and a name is a claim:
 *
 * - **A renal column is cortex**, not medulla. It sits between two pyramids and
 *   is the same tissue as the shell outside them, which is why the builder
 *   gives it the cortex's colour and why the copy says so.
 * - **The sinus is not carved out.** The pyramids converge where it is and the
 *   collecting system is drawn in that convergence. The scene does not offer a
 *   "renal sinus" to select, because there is no such mesh and inventing one
 *   would be a name with nothing under it.
 */
import { COLUMNS, LOBES, MAJOR_CALYCES } from '../scenes/renal/organs/kidneyAnatomy.js';

export const KIDNEY_SCENE_COLORS = Object.freeze({
  cortex: '#c47f86',
  column: '#d59aa0',
  medulla: '#9c5b6a',
  margin: '#b8878e',
  minorCalyx: '#8fd6c4',
  majorCalyx: '#6fc4b0',
  pelvis: '#57b39d',
  ureter: '#7fcbb8',
  bladder: '#c8a6b8',
  wholeKidney: '#bd7d84',
});

export const KIDNEY_NATURAL_COLORS = Object.freeze({
  cortex: '#b8767d',
  column: '#b8767d',
  medulla: '#94596a',
  margin: '#b8767d',
  minorCalyx: '#c3c9c2',
  majorCalyx: '#bcc3bc',
  pelvis: '#b6bdb6',
  ureter: '#b9c0b8',
  bladder: '#bda3ad',
  wholeKidney: '#b8767d',
});

export const KIDNEY_COLOR_MODES = Object.freeze([
  { id: 'parts', label: 'Cortex, medulla and tract', labelJa: '皮質・髄質・尿路' },
  { id: 'natural', label: 'Natural tissue', labelJa: '通常解剖色' },
]);

const MARGIN_NAMES = {
  'medial-margin-superior': { en: 'Medial margin, superior lip', ja: '内側縁（上部の唇部）' },
  'medial-margin': { en: 'Medial margin, hilar lip', ja: '内側縁（腎門の唇部）' },
  'medial-margin-inferior': { en: 'Medial margin, inferior lip', ja: '内側縁（下部の唇部）' },
};

const side = (id) => (id === 'left' ? { en: 'Left kidney', ja: '左腎' } : { en: 'Right kidney', ja: '右腎' });

/**
 * Every named part of the urinary tract this scene draws.
 *
 * @param {'left'|'right'} detailed which kidney is opened into its parts
 */
export function kidneyStructureCopy(detailed = 'left') {
  const entries = new Map();
  const home = side(detailed);
  const other = side(detailed === 'left' ? 'right' : 'left');

  entries.set('cortex', {
    name: 'Renal cortex',
    nameJa: '腎皮質',
    hierarchy: [home.en, 'Parenchyma', 'Cortex'],
    hierarchyJa: [home.ja, '腎実質', '皮質'],
    description:
      'The outer shell of the kidney, between the capsule and the corticomedullary junction. Every glomerulus is here, which is why the cortex takes the great majority of the renal blood flow.',
    descriptionJa:
      '被膜と皮髄境界のあいだにある外層です。糸球体はすべてここにあり、腎血流の大部分が皮質へ向かう理由になっています。',
    colorKey: 'cortex',
    legendKey: 'cortex',
    tags: ['parenchyma'],
  });

  for (const lobe of LOBES) {
    entries.set(`pyramid-${lobe.id}`, {
      name: `Medullary pyramid — ${lobe.label.toLowerCase()}`,
      nameJa: `髄質錐体（${lobe.labelJa}）`,
      hierarchy: [home.en, 'Parenchyma', 'Medullary pyramids', 'Pyramid'],
      hierarchyJa: [home.ja, '腎実質', '髄質錐体', '錐体'],
      description:
        'A cone of medulla with its base at the corticomedullary junction and its tip — the papilla — at the sinus. The loops of Henle and the collecting ducts run along its axis, which is what the medullary osmotic gradient is built along.',
      descriptionJa:
        '底が皮髄境界、先端（腎乳頭）が腎洞に向く円錐形の髄質です。Henleループと集合管はこの軸に沿って走り、髄質の浸透圧勾配はこの軸に沿って形成されます。',
      colorKey: 'medulla',
      legendKey: 'medulla',
      tags: ['parenchyma', 'medulla'],
    });
  }

  for (const column of COLUMNS) {
    entries.set(column.id, {
      name: column.label,
      nameJa: column.labelJa,
      hierarchy: [home.en, 'Parenchyma', 'Renal columns', 'Column'],
      hierarchyJa: [home.ja, '腎実質', '腎柱', '腎柱'],
      description:
        'Cortex reaching inwards between two pyramids. It is the same tissue as the outer shell, not medulla — which is why the interlobar vessels run here, between lobes rather than through one.',
      descriptionJa:
        '2つの錐体のあいだへ内側に入り込む皮質です。髄質ではなく外層と同じ組織で、葉間動脈・静脈が「葉と葉のあいだ」であるここを走ります。',
      colorKey: 'column',
      legendKey: 'cortex',
      tags: ['parenchyma'],
    });
  }

  for (const [id, name] of Object.entries(MARGIN_NAMES)) {
    entries.set(id, {
      name: name.en,
      nameJa: name.ja,
      hierarchy: [home.en, 'Parenchyma', 'Medial margin', 'Margin'],
      hierarchyJa: [home.ja, '腎実質', '内側縁', '縁'],
      description:
        'Cortex past the poles of the fan of lobes, where the bean turns in towards the hilum. There is an opening here rather than a pyramid, so this tissue has no papilla of its own.',
      descriptionJa:
        '腎葉の扇状配列の外側、豆状の腎が腎門へ向かって入り込む部分の皮質です。ここには錐体ではなく開口部があり、この部分に固有の腎乳頭はありません。',
      colorKey: 'margin',
      legendKey: 'cortex',
      tags: ['parenchyma'],
    });
  }

  for (const lobe of LOBES) {
    entries.set(`minor-calyx-${lobe.id}`, {
      name: `Minor calyx — ${lobe.label.toLowerCase()}`,
      nameJa: `小腎杯（${lobe.labelJa}）`,
      hierarchy: [home.en, 'Collecting system', 'Minor calyces', 'Minor calyx'],
      hierarchyJa: [home.ja, '集合系', '小腎杯', '小腎杯'],
      description:
        'A cup around one papilla. Urine leaves the collecting ducts here and nothing changes its composition from this point on — everything downstream is transport and storage.',
      descriptionJa:
        '1つの腎乳頭を包む杯状の構造です。尿は集合管からここへ出ます。ここから先で尿の組成は変わらず、以降は輸送と貯留のみです。',
      colorKey: 'minorCalyx',
      legendKey: 'collecting',
      tags: ['collecting'],
    });
  }

  for (const calyx of MAJOR_CALYCES) {
    entries.set(`major-calyx-${calyx.id}`, {
      name: `${calyx.label} (infundibulum)`,
      nameJa: `${calyx.labelJa}（腎杯漏斗部）`,
      hierarchy: [home.en, 'Collecting system', 'Major calyces', 'Major calyx'],
      hierarchyJa: [home.ja, '集合系', '大腎杯', '大腎杯'],
      description: `The trunk that ${calyx.lobes.length} minor calyces drain through on their way to the pelvis. Major calyx and infundibulum are two words for this one structure.`,
      descriptionJa: `${calyx.lobes.length}個の小腎杯が腎盂へ向かって合流する幹です。大腎杯と腎杯漏斗部は同じ構造を指す2つの呼び方です。`,
      colorKey: 'majorCalyx',
      legendKey: 'collecting',
      tags: ['collecting'],
    });
  }

  entries.set('pelvis', {
    name: 'Renal pelvis',
    nameJa: '腎盂',
    hierarchy: [home.en, 'Collecting system', 'Pelvis'],
    hierarchyJa: [home.ja, '集合系', '腎盂'],
    description: 'The funnel the major calyces open into, leaving the kidney at the hilum as the ureter.',
    descriptionJa: '大腎杯が開口する漏斗状の部分です。腎門で腎を出て尿管となります。',
    colorKey: 'pelvis',
    legendKey: 'collecting',
    tags: ['collecting'],
  });

  entries.set('whole-kidney', {
    name: other.en,
    nameJa: other.ja,
    hierarchy: [other.en, 'Whole organ', 'Kidney'],
    hierarchyJa: [other.ja, '臓器全体', '腎臓'],
    description:
      'Shown whole, for orientation and for the course of its ureter. Only one kidney is opened into its parts in this scene; the parts of the two are the same.',
    descriptionJa:
      '向きと尿管の走行を示すために、全体像のみを表示しています。この場面で内部構造まで分けているのは片側だけで、左右の構成は同じです。',
    note: 'This side is a landmark shape, not a partitioned model. Do not read a boundary into it.',
    noteJa: '対側はランドマークの形状であり、内部を分割したモデルではありません。ここに境界を読み取らないでください。',
    colorKey: 'wholeKidney',
    legendKey: 'cortex',
    tags: ['context'],
  });

  for (const id of ['left', 'right']) {
    entries.set(`ureter-${id}`, {
      name: `${id === 'left' ? 'Left' : 'Right'} ureter`,
      nameJa: `${id === 'left' ? '左' : '右'}尿管`,
      hierarchy: ['Urinary tract', 'Ureters', 'Ureter'],
      hierarchyJa: ['尿路', '尿管', '尿管'],
      description:
        'A narrow muscular tube carrying urine to the bladder by peristalsis rather than by gravity — which is why it works lying down and why an obstructed one hurts in waves.',
      descriptionJa:
        '尿を膀胱へ運ぶ細い筋性の管です。重力ではなく蠕動で運ぶため、臥位でも機能し、閉塞時の痛みは波状（疝痛）になります。',
      note: 'Calibre and course are illustrative; the three normal narrowings are not modelled.',
      noteJa: '口径と走行は図式的です。生理的狭窄部（3か所）は表現していません。',
      colorKey: 'ureter',
      legendKey: 'collecting',
      tags: ['tract'],
    });
  }

  entries.set('bladder', {
    name: 'Urinary bladder',
    nameJa: '膀胱',
    hierarchy: ['Urinary tract', 'Bladder', 'Bladder'],
    hierarchyJa: ['尿路', '膀胱', '膀胱'],
    description:
      'A hollow organ whose shape changes with what is in it: low and flattened when empty, rounder and higher as it fills. Filtration upstream is continuous; storage here is intermittent.',
    descriptionJa:
      '内容によって形が変わる中空臓器です。空虚時は低く扁平で、充満すると丸く高くなります。上流の濾過は連続的ですが、ここでの貯留は間欠的です。',
    note: 'Shape only — this scene shows no volume in millilitres and no micturition.',
    noteJa: '形態のみです。この場面では容量（mL）や排尿は表していません。',
    colorKey: 'bladder',
    legendKey: 'bladder',
    tags: ['tract'],
  });

  return entries;
}

export const KIDNEY_ANATOMY_META = Object.freeze({
  id: 'kidney-anatomy',
  status: 'alpha',
  title: 'Interactive kidney anatomy',
  titleJa: '触れて学ぶ腎臓の解剖',
  subtitle: 'Point to identify; click or tap to pin a pyramid, a column or a calyx',
  subtitleJa: '触れて部位を確認・クリック／タップで錐体・腎柱・腎杯を固定',
  inspection: { background: 'studio' },
  palette: {
    cortex: KIDNEY_SCENE_COLORS.cortex,
    medulla: KIDNEY_SCENE_COLORS.medulla,
    collecting: KIDNEY_SCENE_COLORS.pelvis,
    bladder: KIDNEY_SCENE_COLORS.bladder,
  },
  legend: [
    { key: 'cortex', label: 'Cortex and columns', labelJa: '皮質・腎柱' },
    { key: 'medulla', label: 'Medullary pyramids', labelJa: '髄質錐体', activeFrom: 0.35 },
    { key: 'collecting', label: 'Calyces, pelvis and ureters', labelJa: '腎杯・腎盂・尿管', activeFrom: 0.7 },
    { key: 'bladder', label: 'Bladder', labelJa: '膀胱' },
  ],
  stages: [
    {
      id: 'surface',
      name: 'Whole kidneys and the tract',
      nameJa: '腎全体と尿路',
      at: 0,
      focus: ['kidney'],
      summary: 'Two kidneys, two ureters and the bladder. The cortex is the shell you are looking at.',
      summaryJa: '左右の腎、2本の尿管、膀胱です。いま見えている外層が腎皮質です。',
    },
    {
      id: 'parenchyma',
      name: 'Pyramids and columns',
      nameJa: '錐体と腎柱',
      at: 0.55,
      focus: ['pyramids'],
      summary: 'The cortex fades to a hint: seven medullary pyramids, and the cortical columns reaching in between them.',
      summaryJa: '皮質を薄くすると、7つの髄質錐体と、そのあいだへ入り込む腎柱（皮質）が現れます。',
    },
    {
      id: 'collecting',
      name: 'Calyces and pelvis',
      nameJa: '腎杯と腎盂',
      at: 1,
      focus: ['pelvis'],
      summary: 'A minor calyx cups each papilla, three major calyces gather them, and the pelvis leaves at the hilum as the ureter.',
      summaryJa: '各腎乳頭を小腎杯が包み、3つの大腎杯がそれらをまとめ、腎盂が腎門から尿管として出ていきます。',
    },
  ],
  range: { start: 'Whole organ', startJa: '臓器全体', end: 'Collecting system', endJa: '集合系' },
  progressLabel: { label: 'Anatomical layers', labelJa: '解剖レイヤー' },
});
