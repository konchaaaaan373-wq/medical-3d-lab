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
    effect: 'back to this preset’s starting condition',
    effectJa: 'このプリセットの操作前の条件へ戻す',
  },
  {
    value: INTERVENTION_IDS.VOLUME_LOADING,
    label: 'More circulating filling (model input)',
    labelJa: '循環充満量を増やす（モデル入力）',
    effect: 'a step in the model’s filling quantity — not a fluid volume',
    effectJa: 'モデル内の充満量を 1 段階上げます。輸液量ではありません',
  },
  {
    // "A schematic example of dobutamine's action, heart rate held" — the
    // name carries the assumption, because the assumption is the thing most
    // likely to be read as a fact about the drug.
    value: INTERVENTION_IDS.DOBUTAMINE,
    label: 'Dobutamine, a schematic example (rate held)',
    labelJa: 'ドブタミン作用の模式例（心拍数は固定）',
    effect: 'elastance up · resistance down · rate held, to separate the two',
    effectJa: 'エラスタンス ↑・血管抵抗 ↓・心拍数は固定（2 つの作用を分けて見るため）',
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
    'One at a time, applied to this preset’s starting condition — so pressing the same one twice changes nothing further, and clearing one returns there. These are not doses and the screen is not a time course.',
  textJa:
    '1 つずつ、そのプリセットの操作前の条件に適用します（同じものを 2 回押しても、それ以上は変わりません。解除すると、その条件に戻ります）。用量ではなく、画面は時間経過でもありません。',
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
      '**Holding the heart rate is a choice made for this scene, not a property of the drug.** It is held so that the elastance and the resistance can be read apart. Dobutamine’s manufacturer’s labelling describes both cases: output rising without a marked increase in rate, and rate rising, with tachycardia among the adverse reactions. One study this repository has read — thirteen patients with cardiomyopathic heart failure, 2.5–10 µg/kg/min — reports no change in rate, and one study in one population is not a general rule. Read the fixed rate as this scene’s condition.',
    textJa:
      '**心拍数を固定しているのは、このシーンのための条件であって、薬剤の性質ではありません。** エラスタンスと血管抵抗の作用を分けて読むために固定しています。製造販売元の添付文書には、著明な心拍数増加を伴わずに拍出が増える場合と、心拍数増加・頻脈が起こり得ることの**両方**が記載されています。このリポジトリが読んだ研究（心筋症性心不全 13 例・2.5〜10 µg/kg/min）は心拍数に変化なしと報告していますが、**1 つの集団の 1 つの研究は一般則ではありません。**',
  },
  {
    text:
      '**The response sizes were chosen for this scene.** The directions come from the cited source; ×1.5 on elastance and ×0.85 on resistance do not — they are not derived from any dose-response relationship and no coefficient is fitted to the study. The figures the model then produces are model outputs, not predictions about a person given a drug.',
    textJa:
      '**反応の大きさは、このシーンのために選んだ値です。** 向きは出典に基づきますが、エラスタンス ×1.5・抵抗 ×0.85 は違います——用量反応から導いたものではなく、引用研究に係数を較正してもいません。そこからモデルが出す数値は**モデルの計算値**であって、実際に投与された人についての予測ではありません。',
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
