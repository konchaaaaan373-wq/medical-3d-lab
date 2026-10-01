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

/**
 * The moved inputs alone, in reading order, each with its direction — the
 * short form of the same line, for a place that has room for one phrase
 * ("収縮力↑・心拍数↑"): the console card's closed line on a phone. The same
 * reading order and the same `shown` condition as the read-out, so the two
 * cannot name a change differently.
 *
 * @param {{ baseline: object, shown: object }} condition
 * @returns {{ id: string, short: string, shortJa: string, direction: 'up'|'down' }[]}
 */
export function movedInputs({ baseline, shown }) {
  const ordered = [...READING_ORDER, ...CONTROL_IDS.filter((id) => !READING_ORDER.includes(id))];
  return ordered
    .filter((id) => shown[id] !== baseline[id])
    .map((id) => {
      const control = CONTROLS.find((entry) => entry.id === id);
      return {
        id,
        short: control?.short ?? id,
        shortJa: control?.shortJa ?? id,
        direction: shown[id] > baseline[id] ? 'up' : 'down',
      };
    });
}

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
 * Which way a figure moved, for the arrow beside it — and nothing more.
 *
 * It used to grade the size too (↑↑ at 20 %, ≈ under 3 %). That put figures in
 * different units on one scale of importance and invited "↑↑, so this is the
 * one that matters" — a clinical judgement the model does not make (owner's
 * review, 2026-09-25). The direction is the sign of the difference between the
 * two *displayed* values, so the arrow can never disagree with the signed
 * figure beside it, and it is carried by the arrow's shape and its words, not
 * by a colour.
 *
 * @param {number|string} now the displayed value
 * @param {number|string} before the displayed reference
 */
export function changeOf(now, before) {
  const difference = Number(now) - Number(before);
  if (!Number.isFinite(difference)) return {};
  if (difference === 0) return { change: 'flat', changeLabel: 'no change', changeLabelJa: '変化なし' };
  return difference > 0
    ? { change: 'up', changeLabel: 'higher', changeLabelJa: '上昇' }
    : { change: 'down', changeLabel: 'lower', changeLabelJa: '低下' };
}

/**
 * What a change did, in the order it happened: what was changed → what the
 * heart and the blood did → what the figures did.
 *
 * Every line is a pair of solved values (start → now) at the precision the
 * read-out uses, and a line is only said when its displayed value moved — so
 * the chain never claims a step the model did not take. The words for each
 * step are fixed; which steps appear, and the numbers, are the model's.
 * Nothing here is computed that the solver did not produce: no oxygen
 * delivery, no organ perfusion.
 *
 * @param {{ baseline: object, shown: object, before: object, now: object }} condition
 *   `baseline`/`shown` are model inputs; `before`/`now` are the solved metrics
 * @returns {null | { cause: {en: string, ja: string},
 *   heart: {id: string, en: string, ja: string}[],
 *   results: {id: string, en: string, ja: string}[] }}
 */
export function describeEffect({ baseline, shown, before, now }) {
  const moved = movedInputs({ baseline, shown });
  if (moved.length === 0) return null;
  const arrow = (entry) => (entry.direction === 'up' ? '↑' : '↓');
  const cause = {
    en: moved.map((entry) => `${entry.short} ${arrow(entry)}`).join(', '),
    ja: moved.map((entry) => `${entry.shortJa}${arrow(entry)}`).join('・'),
  };

  const whole = (value) => String(Math.round(value));
  const tenth = (value) => Number(value).toFixed(1);
  const seconds = (rate) => (60 / rate).toFixed(2);
  // Each line in a full form and a short one (for a phone's one paragraph).
  const step = (id, [en, ja], [shortEn, shortJa], from, to, unit) =>
    from === to
      ? null
      : {
          id,
          en: `${en} ${from} → ${to} ${unit}`,
          ja: `${ja} ${from}→${to} ${unit}`,
          shortEn: `${shortEn} ${from}→${to}`,
          shortJa: `${shortJa} ${from}→${to}`,
        };

  const heart = [
    step('edv', ['Filling of the ventricle (EDV)', '心室の満たされ方（拡張末期容積）'], ['filled', '満たされる量'], whole(before.edvMl), whole(now.edvMl), 'mL'),
    step('esv', ['Blood left after contraction (ESV)', '収縮後に残る血液（収縮末期容積）'], ['left', '残る血液'], whole(before.esvMl), whole(now.esvMl), 'mL'),
    step('sv', ['Blood sent out per beat (SV)', '1回に送り出す血液（1回拍出量）'], ['per beat', '1回の拍出'], whole(before.strokeVolumeMl), whole(now.strokeVolumeMl), 'mL'),
    step('interval', ['Time between beats', '拍動の間隔'], ['interval', '拍動の間隔'], seconds(before.heartRatePerMin), seconds(now.heartRatePerMin), 's'),
  ].filter(Boolean);

  const results = [
    step('co', ['Cardiac output', '心拍出量'], ['CO', '心拍出量'], tenth(before.cardiacOutputLMin), tenth(now.cardiacOutputLMin), 'L/min'),
    step('map', ['Mean arterial pressure', '平均動脈圧'], ['MAP', '平均動脈圧'], whole(before.meanArterialPressureMmHg), whole(now.meanArterialPressureMmHg), 'mmHg'),
  ].filter(Boolean);

  return { cause, heart, results };
}

/**
 * Which way each thing moved, at the precision the reader is shown.
 *
 * The input to 「今、何が起きた？」 (`src/app/changeExplanation.js`): the moved
 * inputs with their direction, and the direction of the heart's volumes and
 * the two figures — each rounded exactly as the read-out and the chain round
 * it (whole mL and mmHg, tenths of a L/min). So an explanation can never say
 * "cardiac output fell" beside a read-out that still says 4.7: a change too
 * small to show is `same`, and the rules are written to be true of that.
 *
 * @param {{ baseline: object, shown: object, before: object, now: object }} condition
 * @returns {null | { moved: Record<string, 'up'|'down'>, results: Record<string, 'up'|'down'|'same'> }}
 */
export function changeSignature({ baseline, shown, before, now }) {
  const moved = movedInputs({ baseline, shown });
  if (moved.length === 0) return null;
  const direction = (from, to, digits) => {
    const a = Number(Number(from).toFixed(digits));
    const b = Number(Number(to).toFixed(digits));
    return b > a ? 'up' : b < a ? 'down' : 'same';
  };
  return {
    moved: Object.fromEntries(moved.map((entry) => [entry.id, entry.direction])),
    results: {
      edv: direction(before.edvMl, now.edvMl, 0),
      esv: direction(before.esvMl, now.esvMl, 0),
      sv: direction(before.strokeVolumeMl, now.strokeVolumeMl, 0),
      co: direction(before.cardiacOutputLMin, now.cardiacOutputLMin, 1),
      map: direction(before.meanArterialPressureMmHg, now.meanArterialPressureMmHg, 0),
    },
  };
}
