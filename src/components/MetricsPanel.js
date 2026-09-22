import { el } from '../utils/dom.js';

/**
 * Optional read-out panel. Any scene that implements `getMetrics()` gets one;
 * scenes that do not simply never see it.
 *
 * The values come from the scene's own model, so what the panel says and what
 * the 3D view shows are the same numbers.
 */
export function createMetricsPanel() {
  const element = el('div', { class: 'panel metrics' });
  const rows = new Map();
  /** @type {Map<string, {section: HTMLElement, body: HTMLElement, toggle: HTMLElement}>} */
  const groups = new Map();

  /**
   * The section a row belongs in, made on first sight and kept afterwards.
   *
   * Optional, and every scene that does not ask for one keeps the flat list it
   * had. The higher-function read-out is twenty-odd rows — the traced task, ten
   * more for comparison, the limits, the influences nobody computed — and a
   * flat column of twenty-odd is a list a reader scrolls rather than reads.
   * `groupOpen: false` starts a section folded; the rows a reader must not miss
   * (what is being changed, what this result does not settle, the tasks this
   * model has no route for) belong in an open one or in no section at all.
   *
   * **`groupOpen` is read once.** After that the open state belongs to the
   * reader: re-applying it every update would close a section they had just
   * opened, on the next frame of a slider.
   */
  const groupFor = (metric) => {
    if (!metric.group) return element;
    const existing = groups.get(metric.group);
    if (existing) {
      // The heading follows the metric, in case a scene renames it. The open
      // state does not.
      existing.labelEn.textContent = metric.groupLabel ?? metric.group;
      existing.labelJa.textContent = metric.groupLabelJa ?? metric.groupLabel ?? metric.group;
      return existing.body;
    }
    const body = el('div', { class: 'metric-group-body' });
    const labelEn = el('span', { class: 'lang-en', text: metric.groupLabel ?? metric.group });
    const labelJa = el('span', {
      class: 'lang-ja',
      text: metric.groupLabelJa ?? metric.groupLabel ?? metric.group,
    });
    const toggle = el('button', {
      class: 'metric-group-toggle',
      type: 'button',
      'aria-expanded': String(metric.groupOpen !== false),
    }, [labelEn, labelJa]);
    body.hidden = metric.groupOpen === false;
    toggle.addEventListener('click', () => {
      const open = body.hidden;
      body.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      section.classList.toggle('is-open', open);
    });
    const section = el('section', {
      class: `metric-group${metric.groupOpen === false ? '' : ' is-open'}`,
      'data-group': metric.group,
    }, [toggle, body]);
    element.append(section);
    groups.set(metric.group, { section, body, toggle, labelEn, labelJa });
    return body;
  };

  /**
   * Put a container's children into the order this update asks for.
   *
   * Only the nodes this update positions are moved; anything else in the
   * container — a row the update does not carry, and which is therefore hidden
   * rather than removed — keeps its place between them, so that a row which
   * comes back is where it was rather than at the end.
   *
   * A node already in the right place is left alone, because moving it would
   * take the focus out of a control inside it.
   */
  const arrange = (container, desired) => {
    const positioned = new Set(desired);
    let cursor = 0;
    for (const node of desired) {
      while (cursor < container.childNodes.length && !positioned.has(container.childNodes[cursor])) {
        cursor += 1;
      }
      if (container.childNodes[cursor] !== node) {
        container.insertBefore(node, container.childNodes[cursor] ?? null);
      }
      cursor = [...container.childNodes].indexOf(node) + 1;
    }
  };

  /**
   * Everything a row has to say, behind one control.
   *
   * The read-out shows one limitation and a count — "(1 of 4)" — because four
   * of them joined together is two hundred characters in a 190px rail, which is
   * not a limitation a reader reads. The other three were reachable only by
   * opening the repository. They are a button away now, and the button says how
   * many.
   */
  const detailsFor = (metric, node) => {
    const items = metric.details ?? [];
    const itemsJa = metric.detailsJa ?? items;
    if (items.length === 0) return null;
    const list = el('ul', { class: 'metric-details' }, items.map((text, index) => el('li', {}, [
      el('span', { class: 'lang-en', text }),
      el('span', { class: 'lang-ja', text: itemsJa[index] ?? text }),
    ])));
    list.hidden = true;
    const toggle = el('button', { class: 'metric-details-toggle', type: 'button', 'aria-expanded': 'false' }, [
      el('span', { class: 'lang-en', text: `All ${items.length}` }),
      el('span', { class: 'lang-ja', text: `${items.length} 件すべて` }),
    ]);
    toggle.addEventListener('click', () => {
      const open = list.hidden;
      list.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    });
    node.append(toggle, list);
    return { list, toggle };
  };

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
    /** @param {{id:string,label:string,labelJa:string,value:number|string,unit:string,emphasis?:boolean}[]} metrics */
    update(metrics) {
      // A row this update does not carry is hidden, not left showing its last
      // value. Rows were only ever created and updated here, which was correct
      // while every scene sent the same set every time and wrong the moment one
      // sent a row conditionally: resetting the higher-function scene left
      // "where it stops: nothing of Broca's area is left" on the panel over an
      // intact brain, because the reset simply stopped sending that row.
      // Hidden rather than removed, so that a row which comes back keeps its
      // place in the order instead of jumping to the end.
      const present = new Set(metrics.map((metric) => metric.id));
      for (const [id, row] of rows) {
        if (present.has(id)) continue;
        row.node.hidden = true;
        // Emptied as well as hidden. A hidden node keeps its text, and the text
        // is the claim: "nothing of Broca's area is left" sitting in the
        // document over an intact brain is still in the page a reader copies,
        // and it is what a checker reading the panel's own text will find.
        row.value.textContent = '';
        if (row.valueJa) row.valueJa.textContent = '';
        row.unit.textContent = '';
        row.reference.textContent = '';
        row.change.textContent = '';
        row.details?.list.replaceChildren();
      }
      // Where each row belongs *now*. A row was created on the first update
      // that carried its id and then only ever had values written into it, so
      // its section, its emphasis, its "keep this on a phone" mark and its
      // label were whichever update happened to be first. That is right until a
      // row changes role — and in the higher-function read-out one does, every
      // time the reader traces a different task: the task they just chose was
      // left inside a folded comparison section and the one they left behind
      // stayed in the main section, emphasised, while the 3D showed the new
      // one. Everything a metric owns is written on every update now.
      /** @type {Map<HTMLElement, HTMLElement[]>} container → the rows it holds, in order */
      const layout = new Map();
      const place = (container, node) => {
        if (!layout.has(container)) layout.set(container, []);
        layout.get(container).push(node);
      };
      const topLevel = [];
      const seenGroups = new Set();

      for (const metric of metrics) {
        let row = rows.get(metric.id);
        if (!row) {
          // Numbers are language-independent, but a qualitative read-out
          // ("raised" / "上昇") needs both languages. Which of the two a row is
          // fixed when it is made: the second value span either exists or does
          // not, and a scene does not change its mind about a row's kind.
          const bilingual = metric.valueJa != null;
          const value = el('span', { class: `metric-value${bilingual ? ' lang-en' : ''}` });
          const valueJa = bilingual ? el('span', { class: 'metric-value lang-ja' }) : null;
          // Filled in only while comparing, so the row does not reserve space
          // for a value that is usually absent.
          const reference = el('span', { class: 'metric-reference' });
          const unit = el('span', { class: 'metric-unit', text: metric.unit });
          const change = el('span', { class: 'metric-change', 'aria-hidden': 'true' });
          const labelEn = el('span', { class: 'lang-en', text: metric.label });
          const labelJa = el('span', { class: 'lang-ja', text: metric.labelJa });
          // A qualitative row carries words, and `.metric-figure` holds numbers
          // on one line — right for "1.24", wrong for 「超皮質性感覚失語」, which
          // could only widen the panel until it left the side of a phone. The
          // class says which kind of value this is; the stylesheet decides what
          // that means.
          const node = el('div', { class: `metric${bilingual ? ' is-qualitative' : ''}` }, [
            el('span', { class: 'metric-label' }, [labelEn, labelJa]),
            el('span', { class: 'metric-figure' }, [reference, value, valueJa, unit, change]),
          ]);
          row = { value, valueJa, reference, unit, change, node, labelEn, labelJa, group: null };
          row.details = detailsFor(metric, node);
          rows.set(metric.id, row);
        }
        // The classes a metric owns, every time.
        //
        // `essential` is not `emphasis`. A phone hides every row that is not a
        // headline figure, which is right for eleven haemodynamic numbers and
        // wrong for "what this value does not settle": the rows that say what a
        // result is *not* are the ones a reader most needs and the ones a
        // narrow screen was dropping. This marks them as rows that stay,
        // without making them louder than the result they qualify.
        row.node.classList.toggle('is-key', Boolean(metric.emphasis));
        row.node.classList.toggle('is-essential', Boolean(metric.essential));
        row.labelEn.textContent = metric.label;
        row.labelJa.textContent = metric.labelJa;

        const container = groupFor(metric);
        row.group = metric.group ?? null;
        place(container, row.node);
        if (container === element) topLevel.push(row.node);
        else if (metric.group && !seenGroups.has(metric.group)) {
          // A section takes the place in the panel of the first row that asks
          // for it, so moving a row between sections cannot reorder the panel.
          seenGroups.add(metric.group);
          topLevel.push(groups.get(metric.group).section);
        }

        // A row whose detail list changed length is rebuilt rather than
        // patched: the count is on the button, and a stale count is a lie
        // about how much a reader has not seen. A list of the same length is
        // written through, so that a reader who has it open keeps it open.
        const wanted = metric.details ?? [];
        if ((row.details?.list.children.length ?? 0) !== wanted.length) {
          row.details?.toggle.remove();
          row.details?.list.remove();
          row.details = detailsFor(metric, row.node);
        } else if (row.details) {
          const itemsJa = metric.detailsJa ?? wanted;
          [...row.details.list.children].forEach((item, index) => {
            item.querySelector('.lang-en').textContent = wanted[index];
            item.querySelector('.lang-ja').textContent = itemsJa[index] ?? wanted[index];
          });
        }
        row.value.textContent = String(metric.value);
        if (row.valueJa) row.valueJa.textContent = String(metric.valueJa ?? '');
        row.unit.textContent = metric.unit;
        row.reference.textContent = metric.reference == null ? '' : `${metric.reference} →`;
        row.node.hidden = false;
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

      // Order last, once every row is in the container it belongs to.
      for (const [container, nodes] of layout) {
        if (container !== element) arrange(container, nodes);
      }
      arrange(element, topLevel);

      // A section whose every row went away is a heading over nothing.
      for (const [id, group] of groups) {
        const live = [...rows.values()].some((row) => row.group === id && !row.node.hidden);
        group.section.hidden = !live;
      }
    },
  };
}
