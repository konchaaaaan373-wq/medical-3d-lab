import { CONTROL_IDS } from '../../../../models/cardiacOutput.js';
import { INTERVENTION_IDS } from '../../../../models/cardiacInterventions.js';
import { INTERVENTION_OPTIONS } from '../../../../data/cardiacOutputInterventions.js';
import { CONTROLS } from '../../../../data/cardiacOutput.js';

/**
 * What the reader has done, said the way a reader would say it.
 *
 * ## Why this is not the model's vocabulary
 *
 * The first version of this row read 「2 つ: 抵抗・収縮力（他 2 固定）」. Every
 * word was correct, and it was the implementer's sentence: it counted inputs
 * rather than saying what happened to them, and "2 つ" is a fact about the
 * parameter vector. What a reader who has just pressed dobutamine needs is the
 * causal line — contractility up, resistance down, rate held — and then the
 * numbers. So each moved input is named with the direction it moved, and the
 * inputs held still are named too while there are few enough to name, because
 * "the rate was held" is the assumption most likely to be read as a fact about
 * the drug.
 *
 * ## What it still guarantees
 *
 * The guarantees of the row it replaces (D-12 of the external review): it says
 * *which* inputs moved, a single hand-moved input carries both of its values,
 * a multi-input condition never reads as a one-factor one, and it describes
 * the condition the figures came from — `view.input` — never a request that
 * was refused. `tests/cardiac-output-scene.test.js` holds each of these.
 *
 * Pure: no `three`, no DOM.
 *
 * @param {{ baseline: object, shown: object, interventionId: string }} condition
 *   `baseline` and `shown` are model inputs keyed by `CONTROL_IDS`.
 * @returns {{ moved: string[], label: string, labelJa: string, value: string, valueJa: string }}
 */
/**
 * The order inputs are named in: the heart's own property first, then what is
 * put into it, then what it pumps against, then the rate. So dobutamine reads
 * "contractility ↑ · resistance ↓" — the drug's primary action first — rather
 * than in the order the solver happens to hold its inputs.
 */
const READING_ORDER = [
  'contractilityEesMmHgPerMl',
  'fillingVolumeMl',
  'systemicResistanceMmHgSPerMl',
  'heartRatePerMin',
];

export function describeChange({ baseline, shown, interventionId }) {
  const ordered = [...READING_ORDER, ...CONTROL_IDS.filter((id) => !READING_ORDER.includes(id))];
  const moved = ordered.filter((id) => shown[id] !== baseline[id]);
  const held = ordered.filter((id) => !moved.includes(id));
  const name = (id, ja) => {
    const control = CONTROLS.find((entry) => entry.id === id);
    return (ja ? control?.shortJa : control?.short) ?? id;
  };
  const arrow = (id) => (shown[id] > baseline[id] ? '↑' : '↓');
  const format = (value) => (Number.isInteger(value) ? value : Number(value.toFixed(2)));

  if (moved.length === 0) {
    // Says where to go next as well as what has happened: the empty state of
    // this row is the one a first-time reader meets.
    return {
      moved,
      label: 'Changed',
      labelJa: '変えたもの',
      value: 'nothing',
      valueJa: 'なし',
    };
  }

  // What was held is said once and short. It used to be listed — 「（充満量・
  // 心拍数は固定）」 — which under dobutamine repeated the 「心拍数は固定」 the
  // label had just said, and made the line the longest thing in the read-out.
  // The moved inputs are named one by one, so "the rest" is exact.
  const heldClause = (ja) => {
    if (held.length === 0) return '';
    return ja ? '（他は固定）' : ' (rest held)';
  };
  const option =
    interventionId && interventionId !== INTERVENTION_IDS.NONE
      ? INTERVENTION_OPTIONS.find((entry) => entry.value === interventionId)
      : null;
  const effects = (ja) => {
    // One hand-moved input is the one-factor comparison this scene is for, so
    // it is spelled out with both of its values — they are on the slider the
    // reader just moved. An intervention is not: its step is in the model's
    // own units ("710 → 830" of a filling quantity that is not a volume
    // anyone infuses), which belongs in the detail, not in the sentence.
    if (moved.length === 1 && !option) {
      const id = moved[0];
      return `${name(id, ja)} ${arrow(id)} ${format(baseline[id])} → ${format(shown[id])}`;
    }
    return moved.map((id) => `${name(id, ja)} ${arrow(id)}`).join(ja ? '・' : ' · ');
  };

  return {
    moved,
    // The intervention's full name, not its short one: the long name is where
    // its caveat lives ("model input", "rate held"), and this is the moment
    // the reader is reading it.
    label: option ? option.label : 'Adjusted by hand',
    labelJa: option ? option.labelJa : '手動調整',
    value: `${effects(false)}${heldClause(false)}`,
    valueJa: `${effects(true)}${heldClause(true)}`,
  };
}

/**
 * A signed difference at the precision the figure is shown at.
 *
 * Taken between the two *displayed* values rather than the raw ones, so the
 * three numbers on a row always add up: 3.7 → 4.5 is +0.8, never +0.7 because
 * the unrounded pair happened to straddle a boundary.
 *
 * @param {number} now the displayed value
 * @param {number} before the displayed reference
 * @param {number} digits decimals the figure is shown with
 * @returns {{ delta: string, deltaSign: 'up'|'down'|'flat' }}
 */
export function signedDelta(now, before, digits = 0) {
  const scale = 10 ** digits;
  const difference = Math.round((Number(now) - Number(before)) * scale) / scale;
  if (difference === 0) return { delta: '±0', deltaSign: 'flat' };
  const magnitude = Math.abs(difference).toFixed(digits);
  // U+2212, not a hyphen: the two signs should be the same width.
  return difference > 0
    ? { delta: `+${magnitude}`, deltaSign: 'up' }
    : { delta: `−${magnitude}`, deltaSign: 'down' };
}

/**
 * Which way a figure moved, and whether by a lot — for the arrow beside it.
 *
 * The read-out used to give every figure the same weight: a reader who raised
 * the filling saw CO +0.5, MAP +9 and LVEDP +3 in identical type and had to
 * divide in their head to see that the filling pressure moved proportionally
 * most. So the size of a change is judged *relative to where it started*:
 *
 * - under 3% either way reads as unchanged (≈), which is below what these
 *   figures are shown precisely enough to mean;
 * - 20% or more is a large change (↑↑ / ↓↓).
 *
 * Both thresholds are presentation, not physiology: they decide how an arrow
 * is drawn, never what the model says, and the signed figure is always beside
 * the arrow. The direction is carried by the arrow's shape and its words, not
 * by a colour.
 *
 * @param {number|string} now the displayed value
 * @param {number|string} before the displayed reference
 */
export function changeOf(now, before) {
  const current = Number(now);
  const start = Number(before);
  if (!Number.isFinite(current) || !Number.isFinite(start) || start === 0) return {};
  const relative = (current - start) / Math.abs(start);
  if (Math.abs(relative) < 0.03) {
    return { change: 'flat', changeStrong: false, changeLabel: 'about the same', changeLabelJa: 'ほぼ同じ' };
  }
  const strong = Math.abs(relative) >= 0.2;
  const up = relative > 0;
  return {
    change: up ? 'up' : 'down',
    changeStrong: strong,
    changeLabel: `${strong ? 'much ' : ''}${up ? 'higher' : 'lower'}`,
    changeLabelJa: `${strong ? '大きく' : ''}${up ? '上昇' : '低下'}`,
  };
}
