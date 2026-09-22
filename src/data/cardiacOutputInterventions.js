/**
 * What the two interventions are called, and what is and is not claimed about
 * them.
 *
 * The transformation itself is in `src/models/cardiacInterventions.js` and has
 * no words in it. This file has no arithmetic in it. Between them there is one
 * place a magnitude lives and one place a claim lives, and a reviewer reading
 * only this file can check every sentence without reading any mechanics.
 */
import { INTERVENTION_IDS } from '../models/cardiacInterventions.js';

export const INTERVENTION_OPTIONS = [
  {
    value: INTERVENTION_IDS.NONE,
    label: 'No intervention',
    labelJa: '介入なし',
    effect: 'the condition as you left it',
    effectJa: '自分で設定した条件のまま',
  },
  {
    value: INTERVENTION_IDS.VOLUME_LOADING,
    label: 'More circulating filling',
    labelJa: '循環充満を増やす',
    effect: 'stressed volume up · a schematic step, not a fluid dose',
    effectJa: 'stressed volume ↑・模式的な 1 段階で、輸液量ではありません',
  },
  {
    value: INTERVENTION_IDS.DOBUTAMINE,
    label: 'Dobutamine (representative)',
    labelJa: 'ドブタミン（代表的な作用）',
    effect: 'elastance up · resistance down · rate unchanged',
    effectJa: 'エラスタンス ↑・血管抵抗 ↓・心拍数は変えません',
  },
];

/**
 * The note shown with the intervention control.
 *
 * Three things a reader has to be told before they press anything: these are
 * not doses, they cannot be combined, and the change on screen is a comparison
 * between two settled conditions rather than a drug taking effect over time.
 */
export const INTERVENTION_NOTE = {
  text:
    'One at a time, applied to this preset’s starting condition — so pressing the same one twice changes nothing further. These are not doses and the screen is not a time course.',
  textJa:
    '1 つずつ、そのプリセットの操作前の条件に適用します（同じものを 2 回押しても、それ以上は変わりません）。用量ではなく、画面は時間経過でもありません。',
};

/**
 * What each intervention is, and what it is not. Read by the scope panel, so a
 * reader who presses a drug name sees the limits on the same screen.
 */
export const INTERVENTION_SCOPE = [
  {
    text:
      '**“More circulating filling” is not a fluid bolus.** It raises the model’s stressed volume by one schematic step. There is nowhere in this model for fluid to leave to, so it cannot say how much anyone should be given, or whether they should be.',
    textJa:
      '**「循環充満を増やす」は輸液ではありません。** モデルの stressed volume を模式的に 1 段階上げるだけです。このモデルに液体が出ていく先は無いので、誰に何 mL 必要かも、必要かどうかも言えません。',
  },
  {
    text:
      '**Dobutamine here is a direction, not a dose.** Elastance rises and systemic resistance falls; **heart rate is deliberately held**, because the one study this repository has read reports no change in heart rate over 2.5–10 µg/kg/min in thirteen patients with cardiomyopathic heart failure. At higher doses and in other populations dobutamine is chronotropic and arrhythmogenic, and neither is modelled.',
    textJa:
      '**ここでのドブタミンは向きであって用量ではありません。** エラスタンスが上がり体血管抵抗が下がります。**心拍数は意図的に据え置き**です——このリポジトリが読んだ唯一の研究が、心筋症性心不全 13 例・2.5〜10 µg/kg/min で心拍数に変化なしと報告しているためです。より高用量・他の集団では変時作用と不整脈がありますが、どちらもモデルにありません。',
  },
  {
    text:
      'The response sizes are illustrative. The cited study’s own effect sizes are not transferable to this model’s parameters, and nothing here claims them.',
    textJa:
      '反応の大きさは説明用です。引用した研究の効果量はこのモデルのパラメータへ移せるものではなく、ここでは主張していません。',
  },
];

/** Source note for the scope panel. */
export const INTERVENTION_SOURCE = {
  text:
    'Leier CV et al., Circulation 1978;58:466–475 — thirteen patients with cardiomyopathic heart failure, crossover. Read here as the published abstract only; the full text was not read and no coefficient is fitted to it.',
  textJa:
    'Leier CV ほか, Circulation 1978;58:466–475 ——心筋症性心不全 13 例のクロスオーバー。ここで参照したのは公開抄録のみで、本文は読んでおらず、係数の較正にも用いていません。',
  kind: 'primary-study',
};
