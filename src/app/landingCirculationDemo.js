import { CIRCULATION_INTERVENTIONS, solveCirculation } from '../models/circulation.js';
import { el } from '../utils/dom.js';

const DEMO_STATES = Object.freeze([
  Object.freeze({ value: CIRCULATION_INTERVENTIONS.BASELINE, label: 'Baseline', labelJa: '基準' }),
  Object.freeze({ value: CIRCULATION_INTERVENTIONS.FLUID, label: 'Fluid responsive', labelJa: '輸液反応' }),
  Object.freeze({ value: CIRCULATION_INTERVENTIONS.DOBUTAMINE, label: 'Dobutamine', labelJa: 'DOB反応' }),
]);

const EXPLANATIONS = Object.freeze({
  [CIRCULATION_INTERVENTIONS.BASELINE]: ({ map, co }) => Object.freeze({
    en: `MAP is ${map} mmHg, but unindexed CO is ${co.toFixed(1)} L/min in this constructed case. Pressure alone does not reveal flow.`,
    ja: `MAPは${map} mmHg。それでも、この概念症例の非係数化COは${co.toFixed(1)} L/minです。血圧だけでは血流量は分かりません。`,
  }),
  [CIRCULATION_INTERVENTIONS.FLUID]: () => Object.freeze({
    en: 'In this fluid-responsive state, SV and CO rise. SVR is unchanged, so MAP rises as well.',
    ja: '輸液反応性がある概念状態ではSVとCOが増加します。SVRは固定しているため、MAPも上昇します。',
  }),
  [CIRCULATION_INTERVENTIONS.DOBUTAMINE]: () => Object.freeze({
    en: 'CO and calculated global DO₂ rise while MAP stays near baseline because SVR falls.',
    ja: 'SVRが低下するためMAPは基準付近のままでも、COと計算上の全身DO₂は増加します。',
  }),
});

const trend = (value, reference, flatTolerance = 0) => {
  if (Math.abs(value - reference) <= flatTolerance) {
    return Object.freeze({ id: 'flat', arrow: '→', en: 'little change', ja: 'ほぼ不変' });
  }
  return value > reference
    ? Object.freeze({ id: 'up', arrow: '↑', en: 'increased', ja: '上昇' })
    : Object.freeze({ id: 'down', arrow: '↓', en: 'decreased', ja: '低下' });
};

/**
 * Presentation state for the landing preview. Medical values come directly
 * from `solveCirculation`; only rounding and visual animation timing live here.
 */
export function circulationDemoSnapshot(intervention = CIRCULATION_INTERVENTIONS.BASELINE) {
  const baseline = solveCirculation();
  const state = solveCirculation({ intervention });
  const comparing = state.intervention !== CIRCULATION_INTERVENTIONS.BASELINE;
  const map = Math.round(state.meanArterialPressureMmHg);
  const baselineMap = Math.round(baseline.meanArterialPressureMmHg);
  const co = Number(state.cardiacOutputLMin.toFixed(1));
  const baselineCo = Number(baseline.cardiacOutputLMin.toFixed(1));
  const do2 = Math.round(state.oxygenDeliveryMlMin / 10) * 10;
  const baselineDo2 = Math.round(baseline.oxygenDeliveryMlMin / 10) * 10;
  const lowestSvr = solveCirculation({ intervention: CIRCULATION_INTERVENTIONS.DOBUTAMINE })
    .systemicVascularResistanceDynSCm5;
  const resistanceRange = baseline.systemicVascularResistanceDynSCm5 - lowestSvr;
  const resistanceNormal = resistanceRange > 0
    ? (state.systemicVascularResistanceDynSCm5 - lowestSvr) / resistanceRange
    : 1;

  return Object.freeze({
    intervention: state.intervention,
    explanation: EXPLANATIONS[state.intervention]({ map, co }),
    metrics: Object.freeze([
      Object.freeze({
        id: 'map',
        label: 'MAP',
        labelJa: '平均血圧',
        value: map,
        unit: 'mmHg',
        change: comparing ? trend(map, baselineMap, 2) : null,
      }),
      Object.freeze({
        id: 'co',
        label: 'Cardiac output',
        labelJa: '心拍出量 CO',
        value: co.toFixed(1),
        unit: 'L/min',
        change: comparing ? trend(co, baselineCo) : null,
      }),
      Object.freeze({
        id: 'do2',
        label: 'Calculated global DO₂',
        labelJa: '計算上の全身DO₂',
        value: do2,
        unit: 'mL/min',
        change: comparing ? trend(do2, baselineDo2) : null,
      }),
    ]),
    // Visual timing/calibre are explicitly presentation values, not clinical
    // read-outs. Faster solved flow shortens the loop; lower SVR opens it.
    flowDurationSeconds: Math.max(2.6, Math.min(4.3, 5.45 - state.cardiacOutputLMin * 0.52)),
    vesselCalibrePx: 7 + (1 - resistanceNormal) * 5,
    resistanceOpacity: 0.34 + resistanceNormal * 0.56,
  });
}

const dual = (en, ja, className = '') => [
  el('span', { class: `${className} lang-en`.trim(), text: en }),
  el('span', { class: `${className} lang-ja`.trim(), text: ja }),
];

export function createLandingCirculationDemo() {
  const buttons = new Map();
  const metricNodes = new Map();
  const explanationEn = el('span', { class: 'lang-en' });
  const explanationJa = el('span', { class: 'lang-ja' });

  const particles = Array.from({ length: 24 }, (_, index) => {
    const particle = el('span', {
      class: `landing-demo-particle${index % 7 === 0 ? ' is-oxygen' : ''}`,
      'aria-hidden': 'true',
    });
    particle.style.setProperty('--particle-index', String(index));
    // Reduced-motion mode keeps eight particles still. Give those eight an
    // even distribution across the rendered vessel rather than leaving them
    // bunched beside the pump.
    particle.style.setProperty('--particle-still-left', `${6 + (index % 8) * 12.5}%`);
    return particle;
  });

  const diagram = el('div', { class: 'landing-demo-diagram', 'aria-hidden': 'true' }, [
    el('div', { class: 'landing-demo-pump' }, [
      el('span', { class: 'landing-demo-pump-ring' }),
      el('strong', { text: 'CO' }),
      el('small', { text: 'FLOW' }),
    ]),
    el('div', { class: 'landing-demo-vessel' }, [
      ...particles,
      el('div', { class: 'landing-demo-resistance' }, [
        el('span'), el('span'), el('span'),
      ]),
    ]),
    el('div', { class: 'landing-demo-endpoint' }, [
      el('strong', { text: 'DO₂' }),
      el('small', { text: 'GLOBAL' }),
    ]),
  ]);

  const metricElements = ['map', 'co', 'do2'].map((id) => {
    const label = el('span', { class: 'landing-demo-metric-label' });
    const value = el('strong', { class: 'landing-demo-metric-value' });
    const unit = el('span', { class: 'landing-demo-metric-unit' });
    const change = el('span', { class: 'landing-demo-metric-change' });
    metricNodes.set(id, { label, value, unit, change });
    return el('div', { class: 'landing-demo-metric', dataset: { metric: id } }, [label, value, unit, change]);
  });

  const stateButtons = DEMO_STATES.map((state) => {
    const button = el('button', {
      class: 'landing-demo-state',
      type: 'button',
      dataset: { intervention: state.value },
      'aria-pressed': 'false',
      on: { click: () => update(state.value) },
    }, dual(state.label, state.labelJa));
    buttons.set(state.value, button);
    return button;
  });

  const element = el('article', { class: 'landing-demo', 'aria-labelledby': 'landing-demo-title' }, [
    el('header', { class: 'landing-demo-header' }, [
      el('div', {}, [
        el('p', { class: 'landing-demo-kicker' }, dual('LIVE MODEL 01  /  CIRCULATION', 'LIVE MODEL 01  /  循環')),
        el('h2', { class: 'landing-demo-title', id: 'landing-demo-title' }, dual(
          'MAP is 70. Is circulation maintained?',
          'MAP 70。循環は保たれている？'
        )),
      ]),
      el('span', { class: 'landing-demo-case' }, dual('CONSTRUCTED CASE', '概念症例')),
    ]),
    diagram,
    el('fieldset', { class: 'landing-demo-controls' }, [
      el('legend', {}, dual('Compare one state', '状態を1つ選ぶ')),
      el('div', { class: 'landing-demo-state-grid' }, stateButtons),
    ]),
    el('div', {
      class: 'landing-demo-metrics',
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true',
    }, metricElements),
    el('p', { class: 'landing-demo-explanation' }, [explanationEn, explanationJa]),
    el('footer', { class: 'landing-demo-footer' }, [
      el('span', { class: 'landing-demo-boundary' }, dual(
        'Illustrative response, not a dose or patient prediction.',
        '反応量は例示です。投与量・患者反応の予測ではありません。'
      )),
      el('a', { class: 'landing-demo-link landing-cta', href: '#/circulation' }, dual(
        'Open the full model ↗',
        '根拠と限界を含めて開く ↗'
      )),
    ]),
  ]);

  function update(intervention) {
    const snapshot = circulationDemoSnapshot(intervention);
    element.dataset.intervention = snapshot.intervention;
    element.style.setProperty('--demo-flow-duration', `${snapshot.flowDurationSeconds.toFixed(2)}s`);
    element.style.setProperty('--demo-vessel-calibre', `${snapshot.vesselCalibrePx.toFixed(1)}px`);
    element.style.setProperty('--demo-resistance-opacity', snapshot.resistanceOpacity.toFixed(2));

    for (const [value, button] of buttons) {
      const selected = value === snapshot.intervention;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-selected', selected);
    }

    for (const metric of snapshot.metrics) {
      const node = metricNodes.get(metric.id);
      node.label.replaceChildren(...dual(metric.label, metric.labelJa));
      node.value.textContent = String(metric.value);
      node.unit.textContent = metric.unit;
      node.change.className = `landing-demo-metric-change${metric.change ? ` is-${metric.change.id}` : ''}`;
      node.change.replaceChildren(...dual(
        metric.change ? `${metric.change.arrow} ${metric.change.en}` : 'baseline',
        metric.change ? `${metric.change.arrow} ${metric.change.ja}` : '基準'
      ));
    }

    explanationEn.textContent = snapshot.explanation.en;
    explanationJa.textContent = snapshot.explanation.ja;
  }

  update(CIRCULATION_INTERVENTIONS.BASELINE);
  return { element, setIntervention: update };
}
