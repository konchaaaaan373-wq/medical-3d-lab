import { el } from '../utils/dom.js';

/**
 * Optional read-out panel. Any scene that implements `getMetrics()` gets one;
 * scenes that do not simply never see it.
 *
 * The values come from the scene's own model, so what the panel says and what
 * the 3D view shows are the same numbers.
 *
 * ## The panel shows the rows it was handed, in the order it was handed them
 *
 * It did not. New ids were appended and rows that stopped being sent were
 * left where they were, so a row a scene emits conditionally arrived at the
 * **bottom** of the panel however early it sat in the array, and stayed there
 * after the scene stopped sending it.
 *
 * That is not a cosmetic difference for a row whose job is to say the numbers
 * beside it are stale: `cardiac-output` leads with "showing the previous
 * condition" when a condition is refused, and under the old behaviour that
 * notice appeared under eleven numbers and then never went away. The scene's
 * own tests read the array and could not see it (R152-03).
 *
 * Every scene that hands the same rows every time is unaffected — the nodes
 * are reused, and reordering a list that has not changed order does nothing.
 */
/**
 * @param {{ moreLabel?: {show:string,showJa:string,hide:string,hideJa:string} }} [options]
 *   the words on the button to the rest of the figures, for a scene whose
 *   readers would not call them "all figures"
 */
export function createMetricsPanel({ moreLabel } = {}) {
  const element = el('div', { class: 'panel metrics' });
  const rows = new Map();

  /**
   * The few rows worth a phone's space, and the way to the rest.
   *
   * Opt-in: a scene marks rows `compact: true` and this appears; a scene that
   * marks none gets exactly what it got before. The alternative in the
   * stylesheet — hide everything that is not `is-key` unless the panel is
   * `is-primary` — decided a read-out's phone layout from a *controls*
   * property, and `cardiac-output` fell on the wrong side of it: eleven rows
   * on a 390-wide screen, with the filling pressure below the fold and no way
   * to reach it. The teaching this scene exists for is that output and filling
   * pressure move together, so a phone that shows one without the other is
   * showing the wrong half (R152-04).
   */
  let expanded = false;
  const moreLabelEn = el('span', { class: 'lang-en' });
  const moreLabelJa = el('span', { class: 'lang-ja' });
  const setMoreLabel = () => {
    moreLabelEn.textContent = expanded ? (moreLabel?.hide ?? 'Fewer figures') : (moreLabel?.show ?? 'All figures');
    moreLabelJa.textContent = expanded ? (moreLabel?.hideJa ?? '主要な数値だけ') : (moreLabel?.showJa ?? 'すべての数値');
  };
  const more = el('button', {
    class: 'metrics-more',
    type: 'button',
    'aria-expanded': 'false',
    on: {
      click: () => {
        expanded = !expanded;
        element.classList.toggle('is-expanded', expanded);
        more.setAttribute('aria-expanded', String(expanded));
        setMoreLabel();
      },
    },
  }, [moreLabelEn, moreLabelJa]);
  setMoreLabel();

  return {
    element,
    /**
     * Rows a guided lesson is asking the learner to watch.
     *
     * Presentation only — it changes nothing about what any row says. While a
     * lesson names rows, the others are hidden rather than merely dimmed: one
     * lesson teaches one relationship, and eleven numbers on screen is not that.
     *
     * @param {string[]} ids empty to go back to showing everything
     */
    highlight(ids) {
      const wanted = new Set(ids);
      for (const [id, row] of rows) row.node.classList.toggle('is-watched', wanted.has(id));
      element.classList.toggle('is-focused', wanted.size > 0);
    },
    /** @param {{id:string,label:string,labelJa:string,value:number|string,unit:string,emphasis?:boolean,reference?:number|string,delta?:string,deltaSign?:'up'|'down'|'flat'}[]} metrics */
    update(metrics) {
      for (const metric of metrics) {
        let row = rows.get(metric.id);
        if (!row) {
          // Numbers are language-independent, but a qualitative read-out
          // ("raised" / "上昇") needs both languages.
          const bilingual = metric.valueJa != null;
          const value = el('span', { class: `metric-value${bilingual ? ' lang-en' : ''}` });
          const valueJa = bilingual ? el('span', { class: 'metric-value lang-ja' }) : null;
          // A shorter wording of a qualitative value for a narrow screen.
          const valueShortJa = metric.valueShortJa != null ? el('span', { class: 'metric-value lang-ja metric-value-short' }) : null;
          // Filled in only while comparing, so the row does not reserve space
          // for a value that is usually absent.
          const reference = el('span', { class: 'metric-reference' });
          const unit = el('span', { class: 'metric-unit', text: metric.unit });
          const change = el('span', { class: 'metric-change', 'aria-hidden': 'true' });
          // The signed difference from `reference`, already rounded by the
          // scene to the precision of the value beside it. Empty when there is
          // nothing to compare, so a row does not carry a "±0" nobody asked for.
          const delta = el('span', { class: 'metric-delta' });
          // What the signed figure is a difference *from*, said beside it — a
          // scene that names it ("from the start") keeps the difference from
          // being read as a second value or as the value before.
          const deltaLabel = metric.deltaLabel || metric.deltaLabelJa
            ? el('span', { class: 'metric-delta-label' }, [
                el('span', { class: 'lang-en', text: metric.deltaLabel ?? '' }),
                el('span', { class: 'lang-ja', text: metric.deltaLabelJa ?? '' }),
              ])
            : null;
          // A qualitative row carries words, and `.metric-figure` holds numbers
          // on one line — right for "1.24", wrong for 「超皮質性感覚失語」, which
          // could only widen the panel until it left the side of a phone. The
          // class says which kind of value this is; the stylesheet decides what
          // that means.
          // Kept, so a row whose *name* depends on the state — "what you did"
          // is named after the intervention that was chosen — can be renamed
          // in place rather than keeping the name it was first built with.
          const labelEn = el('span', { class: 'lang-en', text: metric.label });
          const labelJa = el('span', { class: 'lang-ja', text: metric.labelJa });
          // A shorter name for a narrow column, where the full one would be
          // cut or run into the next; the stylesheet decides where it is used.
          const labelShortJa = metric.labelShortJa
            ? el('span', { class: 'lang-ja metric-label-short', text: metric.labelShortJa })
            : null;
          const node = el('div', {
            class: `metric${metric.emphasis ? ' is-key' : ''}${bilingual ? ' is-qualitative' : ''}`,
          }, [
            el('span', { class: 'metric-label' }, [labelEn, labelJa, labelShortJa]),
            el('span', { class: 'metric-figure' }, [reference, value, valueJa, valueShortJa, unit, change, deltaLabel, delta]),
          ]);
          row = { value, valueJa, valueShortJa, reference, unit, change, delta, labelEn, labelJa, node };
          rows.set(metric.id, row);
        }
        if (row.labelEn.textContent !== metric.label) row.labelEn.textContent = metric.label;
        if (row.labelJa.textContent !== metric.labelJa) row.labelJa.textContent = metric.labelJa;
        row.value.textContent = String(metric.value);
        if (row.valueJa) row.valueJa.textContent = String(metric.valueJa);
        if (row.valueShortJa) row.valueShortJa.textContent = String(metric.valueShortJa ?? '');
        row.unit.textContent = metric.unit;
        row.reference.textContent = metric.reference == null ? '' : `${metric.reference} →`;
        row.delta.textContent = metric.delta == null ? '' : String(metric.delta);
        // A quiet row keeps its start value and change in the DOM — so they
        // hold their room — and the stylesheet decides whether to show them.
        // A scene sets it while nothing has moved.
        if (metric.quiet) row.node.dataset.quiet = 'true';
        else delete row.node.dataset.quiet;
        if (metric.delta == null) delete row.node.dataset.delta;
        else row.node.dataset.delta = metric.deltaSign ?? 'flat';
        row.change.textContent = metric.change === 'up' ? '↑' : metric.change === 'down' ? '↓' : metric.change === 'flat' ? '≈' : '';
        if (metric.change) {
          row.node.dataset.change = metric.change;
          const changeLabel = [metric.changeLabel, metric.changeLabelJa].filter(Boolean).join(' / ');
          row.change.title = changeLabel;
          row.node.setAttribute('aria-label', `${metric.labelJa}: ${metric.reference == null ? '' : `${metric.reference} to `}${metric.value} ${metric.unit}${changeLabel ? `, ${changeLabel}` : ''}`);
        } else {
          delete row.node.dataset.change;
          row.change.removeAttribute('title');
          row.node.removeAttribute('aria-label');
        }
      }

      // What this update did **not** contain is as much a part of it as what
      // it did. Rows that stopped being sent are dropped, and the survivors
      // are put in the order they arrived in — one `replaceChildren` rather
      // than a diff, because the nodes are the same objects either way and the
      // list is a dozen long.
      // Pruning the map is hygiene rather than behaviour — `replaceChildren`
      // already decides what is on screen, and a mutation that skips this line
      // is not observable. It is here so `highlight` and the row cache do not
      // accumulate nodes nothing will ever show again.
      const wanted = new Set(metrics.map((metric) => metric.id));
      for (const id of [...rows.keys()]) if (!wanted.has(id)) rows.delete(id);

      // Which rows survive a small screen is the scene's call, declared per
      // row. The stylesheet decides at what width it matters.
      for (const metric of metrics) {
        rows.get(metric.id).node.dataset.compact = metric.compact ? 'key' : 'extra';
      }
      const anyCompact = metrics.some((metric) => metric.compact);
      element.classList.toggle('has-compact', anyCompact);
      element.replaceChildren(
        ...metrics.map((metric) => rows.get(metric.id).node),
        ...(anyCompact ? [more] : [])
      );
    },
  };
}
