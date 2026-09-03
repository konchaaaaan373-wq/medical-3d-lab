import { CIRCULATION_INTERVENTIONS, solveCirculation } from '../models/circulation.js';
import { el } from '../utils/dom.js';

const DEMO_STATES = Object.freeze([
  Object.freeze({ value: CIRCULATION_INTERVENTIONS.BASELINE, label: 'Baseline', labelJa: '基準' }),
  Object.freeze({ value: CIRCULATION_INTERVENTIONS.FLUID, label: 'Fluid responsive', labelJa: '輸液反応' }),
  Object.freeze({ value: CIRCULATION_INTERVENTIONS.DOBUTAMINE, label: 'Dobutamine', labelJa: 'DOB反応' }),
]);

const STATE_LABELS = Object.freeze(Object.fromEntries(
  DEMO_STATES.map(({ value, label, labelJa }) => [value, Object.freeze({ en: label, ja: labelJa })])
));

const EXPLANATIONS = Object.freeze({
  [CIRCULATION_INTERVENTIONS.BASELINE]: ({ map, co }) => Object.freeze({
    en: `MAP is ${map} mmHg, but unindexed CO is ${co.toFixed(1)} L/min in this constructed case. Pressure alone does not reveal flow.`,
    ja: `MAPは${map} mmHgですが、体格補正していないCOは${co.toFixed(1)} L/minです。血圧だけでは血流量を判断できません。`,
  }),
  [CIRCULATION_INTERVENTIONS.FLUID]: () => Object.freeze({
    en: 'In this fluid-responsive state, SV and CO rise. SVR is unchanged, so MAP rises as well.',
    ja: '輸液反応性を仮定した状態です。SVとCOが増え、SVRは固定しているためMAPも上がります。',
  }),
  [CIRCULATION_INTERVENTIONS.DOBUTAMINE]: () => Object.freeze({
    en: 'CO and calculated global DO₂ rise while MAP stays near baseline because SVR falls.',
    ja: 'SVRが下がるため、MAPは基準付近のままです。一方でCOと計算上の全身DO₂は増えます。',
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
    badge: Object.freeze({
      en: `${STATE_LABELS[state.intervention].en.toUpperCase()}  /  MAP ${map}`,
      ja: `${STATE_LABELS[state.intervention].ja}  /  MAP ${map}`,
    }),
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

export function createLandingCirculationDemo({
  loadViewport = () => import('./landingCirculationViewport.js'),
  onRendererFailure = () => {},
} = {}) {
  const buttons = new Map();
  const metricNodes = new Map();
  const explanationEn = el('span', { class: 'lang-en' });
  const explanationJa = el('span', { class: 'lang-ja' });
  const caseBadge = el('span', { class: 'landing-demo-case' });
  const dragHint = el('div', { class: 'landing-demo-drag-hint', 'aria-hidden': 'true' }, [
    el('span', { text: '↔' }),
    ...dual('Drag / arrow keys to rotate · Scroll / +− to zoom', 'ドラッグ／矢印キーで回転・スクロール／+−で拡大'),
  ]);
  const viewport = el('div', {
    class: 'landing-demo-viewport',
    role: 'region',
    tabindex: '0',
    'aria-label': 'Interactive 3D circulation model / 操作できる循環3Dモデル',
    'aria-describedby': 'landing-demo-viewport-instructions',
  }, [
    el('p', { class: 'landing-sr-only', id: 'landing-demo-viewport-instructions' }, dual(
      'Use arrow keys to rotate, plus and minus to zoom, and Home to reset the view.',
      '矢印キーで回転、+／−で拡大縮小、Homeで初期視点に戻します。'
    )),
  ]);
  const viewportLoading = el('div', { class: 'landing-demo-loading', 'aria-hidden': 'true' }, [
    el('span'),
    ...dual('Loading 3D model', '3Dモデルを読み込み中'),
  ]);
  let mountedViewport = null;
  let selectedIntervention = CIRCULATION_INTERVENTIONS.BASELINE;
  let mountPromise = null;
  let destroyed = false;

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
    }, [
      el('span', { class: 'landing-demo-state-index', text: String(buttons.size + 1).padStart(2, '0') }),
      el('span', { class: 'landing-demo-state-label' }, dual(state.label, state.labelJa)),
    ]);
    buttons.set(state.value, button);
    return button;
  });

  const element = el('article', { class: 'landing-demo', 'aria-labelledby': 'landing-demo-title' }, [
    el('div', { class: 'landing-demo-stage' }, [
      viewport,
      viewportLoading,
      el('header', { class: 'landing-demo-header' }, [
        el('div', {}, [
          el('p', { class: 'landing-demo-kicker' }, dual('LIVE 3D  /  CIRCULATION', 'LIVE 3D  /  循環')),
          el('h2', { class: 'landing-demo-title', id: 'landing-demo-title' }, dual(
            'Circulation & oxygen delivery',
            '循環・酸素運搬'
          )),
        ]),
        caseBadge,
      ]),
      dragHint,
    ]),
    el('div', { class: 'landing-demo-workbench' }, [
      el('fieldset', { class: 'landing-demo-controls' }, [
        el('legend', {}, dual('Select a state', '状態を切り替える')),
        el('div', { class: 'landing-demo-state-grid' }, stateButtons),
      ]),
      el('div', {
        class: 'landing-demo-readout',
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true',
      }, [
        el('div', { class: 'landing-demo-metrics' }, metricElements),
        el('p', { class: 'landing-demo-explanation' }, [explanationEn, explanationJa]),
      ]),
      el('footer', { class: 'landing-demo-footer' }, [
        el('span', { class: 'landing-demo-boundary' }, dual(
          'Illustrative response. Not a dose or patient prediction.',
          '反応量は例示です。投与量や患者反応の予測ではありません。'
        )),
        el('a', { class: 'landing-demo-link landing-cta', href: '#/circulation' }, dual(
          'Open full-screen model ↗',
          '全画面の循環モデルを開く ↗'
        )),
      ]),
    ]),
  ]);

  function update(intervention) {
    const snapshot = circulationDemoSnapshot(intervention);
    selectedIntervention = snapshot.intervention;
    element.dataset.intervention = snapshot.intervention;
    mountedViewport?.setIntervention(snapshot.intervention);
    caseBadge.replaceChildren(...dual(snapshot.badge.en, snapshot.badge.ja));

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

  async function mount() {
    if (destroyed) return null;
    if (mountedViewport || mountPromise) return mountPromise;
    if (typeof window?.requestAnimationFrame !== 'function') return null;

    viewport.dataset.loading = 'true';
    mountPromise = loadViewport()
      .then(({ mountLandingCirculationViewport }) => {
        if (destroyed) return null;
        mountedViewport = mountLandingCirculationViewport(viewport);
        if (destroyed) {
          mountedViewport.destroy();
          mountedViewport = null;
          return null;
        }
        mountedViewport.setIntervention(selectedIntervention);
        viewport.dataset.loading = 'false';
        element.dataset.viewport = 'ready';
        return mountedViewport;
      })
      .catch((error) => {
        if (destroyed) return null;
        console.error('landing 3D preview', error);
        try {
          void Promise.resolve(onRendererFailure(error)).catch(() => {});
        } catch {
          /* diagnostics must never prevent the fallback from rendering */
        }
        viewport.dataset.loading = 'false';
        element.dataset.viewport = 'unavailable';
        viewport.setAttribute('tabindex', '-1');
        viewport.setAttribute('role', 'presentation');
        viewport.setAttribute('aria-hidden', 'true');
        viewport.setAttribute('aria-label', '');
        viewport.setAttribute('aria-describedby', '');
        dragHint.setAttribute('hidden', '');
        viewportLoading.setAttribute('aria-hidden', 'false');
        viewportLoading.setAttribute('role', 'status');
        viewportLoading.setAttribute('aria-live', 'polite');
        viewportLoading.replaceChildren(...dual(
          '3D preview unavailable — open the model instead.',
          '3Dプレビューを表示できません。モデル本体を開いてください。'
        ));
        return null;
      });
    return mountPromise;
  }

  return {
    element,
    setIntervention: update,
    mount,
    destroy() {
      destroyed = true;
      mountedViewport?.destroy();
      mountedViewport = null;
    },
  };
}
