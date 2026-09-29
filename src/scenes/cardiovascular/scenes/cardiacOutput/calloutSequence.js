import { movedInputs } from './changeSummary.js';

/**
 * What to say beside the model after a change, in the order to say it: the
 * cause where it acts, then what the heart did, then what left it, then what
 * the circulation did (owner's review, 2026-09-27: 「右パネルだけで説明しない」).
 *
 * Each step names the part it is about (`anchor`, one of the scene's
 * `getCalloutAnchor` ids) and the part to point at (`highlight`), says a
 * short line with its direction, and quotes a solved start → now pair at the
 * read-out's precision. A step is only said when its displayed value moved,
 * so the sequence never claims something the model did not do. Nothing here
 * is computed: the numbers are the solver's and the words are fixed.
 *
 * ## Why the order depends on the cause
 *
 * The chain runs from where the change acts. Contractility and rate act on
 * the heart, so the heart comes first and the pressure last. Resistance acts
 * on the vessels: the pressure the ventricle ejects against rises first, and
 * less leaves the heart *because of* that — so for resistance the arterial
 * pressure is said second, and the reduced flow is said where it goes, in the
 * bed downstream. Filling acts on the blood coming back, so the venous run is
 * first.
 *
 * @typedef {{ id: string, anchor: string, highlight: string[],
 *   title: { en: string, ja: string }, detail: { en: string, ja: string },
 *   direction: 'up'|'down'|null, hold?: 'end-systole' }} CalloutStep
 *
 * @param {{ baseline: object, shown: object, before: object, now: object }} condition
 *   model inputs (`baseline`/`shown`) and solved metrics (`before`/`now`)
 * @returns {CalloutStep[]}
 */
export function calloutSequence({ baseline, shown, before, now }) {
  const moved = movedInputs({ baseline, shown });
  if (moved.length === 0) return [];

  const whole = (value) => String(Math.round(value));
  const tenth = (value) => Number(value).toFixed(1);
  const seconds = (rate) => (60 / rate).toFixed(2);
  const arrow = (direction) => (direction === 'up' ? '↑' : '↓');
  /** A step, or null when the displayed value did not move. */
  const moving = (id, from, to, unit, build) => {
    if (from === to) return null;
    const direction = Number(to) > Number(from) ? 'up' : 'down';
    const numbers = `${from}→${to} ${unit}`.trim();
    return { id, direction, ...build(direction, numbers) };
  };

  const causes = moved.map((entry) => {
    const input = CAUSES[entry.id];
    return {
      id: `cause-${entry.id}`,
      anchor: input.anchor,
      highlight: input.highlight,
      direction: entry.direction,
      title: { en: `${entry.short} ${arrow(entry.direction)}`, ja: `${entry.shortJa}${arrow(entry.direction)}` },
      detail: {
        en: `${input.detail.en} ${formatControl(entry.id, baseline[entry.id])}→${formatControl(entry.id, shown[entry.id])}${input.unit?.en ?? ''}`,
        ja: `${input.detail.ja} ${formatControl(entry.id, baseline[entry.id])}→${formatControl(entry.id, shown[entry.id])}${input.unit?.ja ?? ''}`,
      },
    };
  });

  const pressure = moving('map', whole(before.meanArterialPressureMmHg), whole(now.meanArterialPressureMmHg), 'mmHg', (d, n) => ({
    anchor: 'arterial',
    highlight: ['arterial'],
    title: { en: `Arterial pressure ${arrow(d)}`, ja: `動脈の血圧${arrow(d)}` },
    detail: { en: `mean ${n}`, ja: `平均 ${n}` },
  }));
  const interval = moving('interval', seconds(before.heartRatePerMin), seconds(now.heartRatePerMin), 's', (d, n) => ({
    anchor: 'myocardium',
    highlight: ['myocardium'],
    title: { en: `Time between beats ${arrow(d)}`, ja: `拍動の間隔${arrow(d)}` },
    detail: { en: `${n} (${d === 'down' ? 'less' : 'more'} time to fill)`, ja: `${n}（満たす時間が${d === 'down' ? '短い' : '長い'}）` },
  }));
  const filled = moving('edv', whole(before.edvMl), whole(now.edvMl), 'mL', (d, n) => ({
    anchor: 'cavity',
    highlight: ['cavity'],
    title: { en: `Blood in the full ventricle ${arrow(d)}`, ja: `心室に満ちる血液${arrow(d)}` },
    detail: { en: n, ja: n },
  }));
  const left = moving('esv', whole(before.esvMl), whole(now.esvMl), 'mL', (d, n) => ({
    anchor: 'residual',
    highlight: ['residual'],
    // Said at the end of the beat, where "left behind" is what is on screen.
    hold: 'end-systole',
    title: { en: `Blood left after contraction ${arrow(d)}`, ja: `収縮後に残る血液${arrow(d)}` },
    detail: { en: n, ja: n },
  }));
  const stroke = moving('sv', whole(before.strokeVolumeMl), whole(now.strokeVolumeMl), 'mL', (d, n) => ({
    anchor: 'outflow',
    highlight: ['ejection'],
    title: { en: `Sent out per beat ${arrow(d)}`, ja: `1回に送り出す量${arrow(d)}` },
    detail: { en: n, ja: n },
  }));
  const resistanceFirst = moved[0]?.id === 'systemicResistanceMmHgSPerMl';
  const output = moving('co', tenth(before.cardiacOutputLMin), tenth(now.cardiacOutputLMin), 'L/min', (d, n) =>
    resistanceFirst
      ? {
          // Downstream of the narrowed vessels: what reaches the body.
          anchor: 'downstream',
          highlight: ['bed', 'venous'],
          title: { en: `Flow to the body ${arrow(d)}`, ja: `全身へ流れる量${arrow(d)}` },
          detail: { en: `cardiac output ${n}`, ja: `心拍出量 ${n}` },
        }
      : {
          anchor: 'arterial',
          highlight: ['arterial'],
          title: { en: `Cardiac output ${arrow(d)}`, ja: `心拍出量${arrow(d)}` },
          detail: { en: `${n} (per minute)`, ja: `${n}（1分間に送り出す量）` },
        }
  );

  // How full the ventricle gets is said when the change acts on filling —
  // more blood back, or less time to fill. After a change in contractility
  // or resistance it moves too (the blood left behind is still there when
  // the next filling arrives), but saying it there puts a second, smaller
  // effect between the cause and the one that matters.
  const actsOnFilling = moved.some((entry) => entry.id === 'fillingVolumeMl' || entry.id === 'heartRatePerMin');
  const heart = [interval, actsOnFilling ? filled : null, left, stroke];
  if (resistanceFirst) return [...causes, pressure, ...heart, output].filter(Boolean);
  // Elsewhere the output and the pressure are one tag at the arterial run:
  // they are the same flow, read twice.
  const circulation = output && pressure
    ? {
        ...output,
        detail: {
          en: `${output.detail.en.replace(' (per minute)', '')} · mean pressure ${pressure.detail.en.replace(/^mean /, '')}`,
          ja: `${output.detail.ja.replace('（1分間に送り出す量）', '')}・平均血圧 ${pressure.detail.ja.replace(/^平均 /, '')}`,
        },
      }
    : output ?? pressure;
  return [...causes, ...heart, circulation].filter(Boolean);
}

/** Where each input acts, and what to call it there. */
const CAUSES = {
  contractilityEesMmHgPerMl: {
    anchor: 'myocardium',
    highlight: ['myocardium'],
    detail: { en: 'heart muscle squeezes', ja: '心筋の縮む力' },
  },
  heartRatePerMin: {
    anchor: 'myocardium',
    highlight: ['myocardium'],
    detail: { en: 'beats per minute', ja: '1分間の拍動' },
    unit: { en: '/min', ja: '回' },
  },
  systemicResistanceMmHgSPerMl: {
    anchor: 'bed',
    highlight: ['bed'],
    detail: { en: 'small arteries narrow', ja: '全身の細い動脈' },
  },
  fillingVolumeMl: {
    anchor: 'venous',
    highlight: ['venous'],
    detail: { en: 'circulating filling', ja: '循環の充満量' },
    unit: { en: ' mL', ja: ' mL' },
  },
};

/**
 * An input's value at the precision its control shows it — the one rounding
 * the controls, the tags and the scene's read-outs share.
 */
export function formatControl(id, value) {
  if (id === 'systemicResistanceMmHgSPerMl' || id === 'contractilityEesMmHgPerMl') return Number(value).toFixed(2);
  return String(Math.round(value));
}
