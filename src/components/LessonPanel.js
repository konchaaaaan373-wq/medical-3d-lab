import { el } from '../utils/dom.js';
import { inLanguage, onLanguageChange } from '../utils/language.js';

/**
 * The introductory lesson's page: everything around the model, and nothing
 * that is not about the one question.
 *
 *   top      — the title card, the question, one line saying what to do
 *   model    — the band between them, left to the 3D (nothing here covers it)
 *   bottom   — the two results, then either the two ways in, the reader's two
 *              buttons, or the explanation's words and its player
 *   tags     — short words beside the parts of the model, and a chip naming
 *              each circulation; `aria-hidden`, because the caption says the
 *              same thing in order for a screen reader
 *
 * This owns the DOM and nothing else. What to show comes in as one state
 * object (`render`), built by `LessonShell` from the lesson session; what a
 * press does goes out through the callbacks. It never computes a figure.
 *
 * @param {{
 *   titleCard: HTMLElement,
 *   copy: { question: object, actions: object, readout: object, conditions: object, before: object },
 *   detailHref: string,
 *   on: Record<string, () => void>,
 * }} options
 */
export function createLessonPanel({ titleCard, copy, detailHref, on }) {
  const pair = (text) => [
    el('span', { class: 'lang-en', text: text?.en ?? '' }),
    el('span', { class: 'lang-ja', text: text?.ja ?? '' }),
  ];
  // An attribute holds one language where the DOM text holds both, so every
  // `aria-label` and `title` here is painted from its pair, and painted again
  // when the interface language flips.
  const attributes = new Map();
  const paintAttributes = (node) => {
    const { text, title } = attributes.get(node);
    const said = inLanguage(text?.en ?? '', text?.ja ?? '');
    node.setAttribute('aria-label', said);
    if (title) node.title = said;
  };
  const labelled = (node, text, { title = false } = {}) => {
    attributes.set(node, { text, title });
    paintAttributes(node);
    return node;
  };
  onLanguageChange(() => attributes.forEach((_, node) => paintAttributes(node)));

  const button = (key, className, text, handler, extra = {}) =>
    el('button', { type: 'button', class: `lesson-button ${className}`, dataset: { lesson: key }, on: { click: handler }, ...extra }, pair(text));

  // --- top ------------------------------------------------------------------
  const question = el('h2', { class: 'lesson-question', id: 'lesson-question' }, pair(copy.question));
  const guide = el('p', { class: 'lesson-guide', 'aria-live': 'polite' });
  const top = el('div', { class: 'lesson-top' }, [titleCard, question, guide]);

  // --- bottom: results --------------------------------------------------------
  const readout = labelled(el('div', { class: 'lesson-readout', role: 'group' }), copy.readout.group);

  // --- bottom: the two ways in -------------------------------------------------
  const entries = el('div', { class: 'lesson-entries' }, [
    button('play', 'is-primary', copy.actions.play, on.play),
    button('try', 'is-secondary', copy.actions.tryIt, on.tryIt),
  ]);

  // --- bottom: the reader's buttons -------------------------------------------
  const constrict = button('constrict', 'is-toggle is-intervention', copy.actions.constrict, on.toggleConstrict, { 'aria-pressed': 'false' });
  const other = button('other', 'is-toggle is-other', copy.actions.showOther, on.toggleOther, { 'aria-pressed': 'false' });
  const manual = el('div', { class: 'lesson-manual' }, [
    constrict,
    other,
    button('reset', 'is-quiet', copy.actions.reset, on.reset),
    button('play-from-manual', 'is-quiet', copy.actions.play, on.play),
  ]);

  // --- bottom: the explanation -------------------------------------------------
  const stepCount = el('span', { class: 'lesson-step-count' });
  const heading = el('h3', { class: 'lesson-caption-heading' });
  const text = el('p', { class: 'lesson-caption-text' });
  const note = el('p', { class: 'lesson-caption-note' });
  const dots = el('ol', { class: 'lesson-dots', 'aria-hidden': 'true' });
  const caption = el('section', { class: 'lesson-caption', 'aria-live': 'polite', 'aria-labelledby': 'lesson-caption-heading' }, [
    el('div', { class: 'lesson-caption-head' }, [stepCount, dots]),
    heading,
    text,
    note,
  ]);
  heading.id = 'lesson-caption-heading';
  const playerButton = (key, glyph, label, handler) =>
    labelled(
      el('button', { type: 'button', class: 'lesson-button is-icon', dataset: { lesson: key }, on: { click: handler } }, [
        el('span', { class: 'lesson-glyph', 'aria-hidden': 'true', text: glyph }),
        el('span', { class: 'lesson-icon-label' }, pair(label)),
      ]),
      label,
      { title: true }
    );
  const toggle = playerButton('toggle', '❚❚', copy.actions.player.pause, on.togglePlay);
  const player = labelled(el('div', { class: 'lesson-player', role: 'group' }), copy.actions.player.group);
  player.append(
    playerButton('restart', '↺', copy.actions.player.restart, on.restart),
    playerButton('previous', '⏮', copy.actions.player.previous, on.previous),
    toggle,
    playerButton('next', '⏭', copy.actions.player.next, on.next),
    button('try-from-player', 'is-secondary', copy.actions.tryIt, on.tryIt)
  );
  const explaining = el('div', { class: 'lesson-explaining' }, [caption, player]);

  const detail = el('a', { class: 'lesson-detail', href: detailHref, dataset: { lesson: 'detail' } }, pair(copy.actions.detail));

  const bottom = el('div', { class: 'lesson-bottom' }, [readout, entries, manual, explaining, detail]);

  // --- tags -------------------------------------------------------------------
  const tags = el('div', { class: 'lesson-tags', 'aria-hidden': 'true' });
  /** @type {Map<string, { node: HTMLElement, box: HTMLElement, lines: HTMLElement[], dots: HTMLElement[] }>} */
  const tagNodes = new Map();

  let rendered = null;
  let currentTags = [];

  /**
   * Draw the page for one state. Cheap to call; only what changed is touched.
   *
   * @param {object} state see `LessonShell.stateForPanel`
   */
  function render(state) {
    const key = JSON.stringify(state, (name, value) => (name === 'points' || name === 'point' ? undefined : value));
    if (key === rendered) return;
    rendered = key;
    top.dataset.mode = state.mode;
    bottom.dataset.mode = state.mode;

    guide.replaceChildren(...pair(state.guide));
    guide.hidden = !state.guide;

    readout.replaceChildren(renderTable(state.readout));
    readout.dataset.cards = state.readout.other ? '2' : '1';

    entries.hidden = state.mode !== 'idle';
    manual.hidden = state.mode !== 'manual';
    explaining.hidden = state.mode !== 'explaining';

    if (state.mode === 'manual') {
      const constricted = state.manual.targetId === 'B';
      constrict.replaceChildren(...pair(constricted ? copy.actions.release : copy.actions.constrict));
      constrict.setAttribute('aria-pressed', String(constricted));
      other.replaceChildren(...pair(state.manual.showOther ? copy.actions.hideOther : copy.actions.showOther));
      other.setAttribute('aria-pressed', String(state.manual.showOther));
    }

    if (state.mode === 'explaining') {
      const step = state.caption;
      stepCount.textContent = `${step.index + 1} / ${step.total}`;
      dots.replaceChildren(
        ...Array.from({ length: step.total }, (_, i) => el('li', { class: i === step.index ? 'is-current' : i < step.index ? 'is-done' : '' }))
      );
      heading.replaceChildren(...pair(step.heading));
      text.replaceChildren(...pair(step.text));
      note.replaceChildren(...pair(step.note));
      note.hidden = !step.note;
      const label = state.player.playing ? copy.actions.player.pause : state.player.atEnd ? copy.actions.replay : copy.actions.player.resume;
      toggle.querySelector('.lesson-glyph').textContent = state.player.playing ? '❚❚' : '▶';
      toggle.querySelector('.lesson-icon-label').replaceChildren(...pair(label));
      labelled(toggle, label, { title: true });
    }
  }

  /**
   * The results as one small table: a column per result, a row per
   * circulation. What the main circulation is compared with — A, "before" —
   * is its own dimmed row under it, labelled as such, so a current figure and
   * a comparison figure are never in the same cell.
   */
  function renderTable({ primary, other }) {
    const head = el('tr', {}, [
      el('th', { scope: 'col', class: 'lesson-table-corner' }),
      ...['map', 'co'].map((id) =>
        el('th', { scope: 'col' }, [...pair(copy.readout[id].label), el('span', { class: 'lesson-result-abbr', text: copy.readout[id].abbr })])
      ),
    ]);
    const value = (id, number, direction = null) =>
      el('td', { dataset: { result: id } }, [
        el('span', { class: 'lesson-result-number', text: number }),
        el('span', { class: 'lesson-result-unit' }, pair(copy.readout[id].unit)),
        direction
          ? el('span', { class: `lesson-result-arrow is-${direction}`, 'aria-hidden': 'true', text: direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→' })
          : null,
      ]);
    const rowFor = (card) => {
      const condition = copy.conditions[card.id];
      const tone = card.walking ? 'changing' : condition.tone;
      const label = card.walking
        ? el('span', { class: 'lesson-chip is-changing' }, pair(copy.readout.changing))
        : el('span', { class: `lesson-chip is-${tone}` }, [
            el('b', { class: 'lesson-chip-letter', text: condition.letter }),
            el('span', { class: 'lesson-chip-role' }, pair(condition.role)),
          ]);
      return el('tr', { class: `lesson-row is-${tone}`, dataset: { card: card.id ?? 'changing' } }, [
        el('th', { scope: 'row' }, [
          label,
          card.walking ? null : el('span', { class: 'lesson-row-name' }, pair(condition.name)),
        ]),
        value('map', card.map, card.reference?.mapDirection),
        value('co', card.co, card.reference?.coDirection),
      ]);
    };
    const rows = [rowFor(primary)];
    if (primary.reference) {
      rows.push(
        el('tr', { class: 'lesson-row is-before', dataset: { card: 'before' } }, [
          el('th', { scope: 'row' }, [
            el('span', { class: 'lesson-before-swatch', 'aria-hidden': 'true' }),
            el('span', { class: 'lesson-before-label' }, pair(copy.before)),
          ]),
          el('td', { dataset: { result: 'map' } }, [el('span', { class: 'lesson-result-number', text: primary.reference.map })]),
          el('td', { dataset: { result: 'co' } }, [el('span', { class: 'lesson-result-number', text: primary.reference.co })]),
        ])
      );
    }
    if (other) rows.push(rowFor(other));
    return el('table', { class: 'lesson-table' }, [el('thead', {}, [head]), el('tbody', {}, rows)]);
  }

  /**
   * Put the tags and chips beside the parts they name, this frame.
   *
   * @param {{ tags: object[], chips: object[] }} spec `points` are world positions
   * @param {(point: object) => ({ x: number, y: number } | null)} project world → page px
   * @param {{ top: number, bottom: number, left: number, right: number }} band page px
   */
  function place(spec, project, band) {
    const wanted = [...spec.chips.map((chip) => ({ ...chip, kind: 'chip' })), ...spec.tags.map((tag) => ({ ...tag, kind: 'tag' }))];
    const keys = new Set(wanted.map((item) => item.key));
    for (const [key, entry] of tagNodes) {
      if (!keys.has(key)) {
        entry.node.remove();
        tagNodes.delete(key);
      }
    }
    currentTags = wanted;
    // In three passes, so the page is laid out once a frame rather than once
    // a tag: show or hide every tag (writes), measure them all (one read),
    // then place them (writes). Reading a size between two placements made
    // the browser lay the page out again for each one, every frame.
    const shown = [];
    for (const item of wanted) {
      let entry = tagNodes.get(item.key);
      if (!entry) {
        entry = buildTag(item);
        tagNodes.set(item.key, entry);
        tags.append(entry.node);
      }
      // The places it may stand, best first, each with the points it names.
      const places = (item.places?.length ? item.places : [{ side: item.side ?? 'up', points: item.points }])
        .map((place) => ({ side: place.side, points: (place.points ?? []).map(project).filter(Boolean) }))
        .filter((place) => place.points.length);
      entry.node.hidden = !places.length;
      if (places.length) shown.push({ item, entry, places });
    }
    for (const one of shown) {
      one.width = one.entry.box.offsetWidth;
      one.height = one.entry.box.offsetHeight;
    }
    const placed = [];
    for (const { item, entry, places, width, height } of shown) {
      const gap = item.kind === 'chip' ? 6 : 16;
      const boxFor = (points, side, penalty, choice) => {
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        let bx;
        let by;
        if (side === 'left') {
          bx = points[0].x - gap - width;
          by = points[0].y - height / 2;
        } else if (side === 'right') {
          bx = points[0].x + gap;
          by = points[0].y - height / 2;
        } else if (side === 'down') {
          bx = cx - width / 2;
          by = Math.max(...ys) + gap;
        } else {
          bx = cx - width / 2;
          by = Math.min(...ys) - gap - height;
        }
        // How far it had to be pushed to stay in the band: a box that fits
        // where it wants to be is better than one squeezed onto the model.
        const cx0 = Math.min(Math.max(bx, band.left + 6), band.right - width - 6);
        const cy0 = Math.min(Math.max(by, band.top + 4), band.bottom - height - 4);
        const pushed = Math.abs(cx0 - bx) + Math.abs(cy0 - by);
        const clash = placed.reduce((sum, other) => {
          const w = Math.min(cx0 + width + 4, other.x + other.w) - Math.max(cx0 - 4, other.x);
          const h = Math.min(cy0 + height + 4, other.y + other.h) - Math.max(cy0 - 4, other.y);
          return sum + (w > 0 && h > 0 ? w * h : 0);
        }, 0);
        // Pushed so far that it stands on the point it names: that side is
        // no longer a place for it at all.
        const covers = points.some((p) => p.x > cx0 - 2 && p.x < cx0 + width + 2 && p.y > cy0 - 2 && p.y < cy0 + height + 2);
        // Where it stood last frame is worth a little: two near-equal places
        // must not trade the tag back and forth while the camera settles.
        const kept = choice === entry.choice ? -40 : 0;
        return { x: cx0, y: cy0, points, choice, cost: clash * 4 + pushed * 6 + penalty + (covers ? 5000 : 0) + kept };
      };
      // The first place on the side it asks for, unless that lands on a tag
      // already placed or off the band; then another place it offers, on its
      // own side; and only then the other sides of the first place, which
      // stand over the part it names.
      const candidates = places.flatMap((place, i) => {
        const side = place.points.length > 1 ? 'up' : place.side ?? 'up';
        if (item.kind === 'chip') return [boxFor(place.points, 'up', 0, `${i}up`)];
        if (i > 0) return [boxFor(place.points, side, 150, `${i}${side}`)];
        return [side, ...['up', 'left', 'right', 'down'].filter((other) => other !== side)].map((other) =>
          boxFor(place.points, other, other === side ? 0 : 400, `${i}${other}`)
        );
      });
      const best = candidates.reduce((a, b) => (b.cost < a.cost ? b : a));
      const { x, y, points } = best;
      entry.choice = best.choice;
      placed.push({ x, y, w: width, h: height });
      entry.box.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      // Lines from each point to the nearest point of the box.
      entry.lines.forEach((line, i) => {
        const point = points[i];
        if (!point || item.kind === 'chip') {
          line.hidden = true;
          entry.dots[i].hidden = true;
          return;
        }
        const tx = Math.min(Math.max(point.x, x), x + width);
        const ty = Math.min(Math.max(point.y, y), y + height);
        const dx = tx - point.x;
        const dy = ty - point.y;
        const length = Math.hypot(dx, dy);
        line.hidden = length < 2;
        entry.dots[i].hidden = false;
        line.style.width = `${length}px`;
        line.style.transform = `translate(${point.x}px, ${point.y}px) rotate(${Math.atan2(dy, dx)}rad)`;
        entry.dots[i].style.transform = `translate(${point.x - 4}px, ${point.y - 4}px)`;
      });
    }
  }

  function buildTag(item) {
    const count = Math.max(1, item.points?.length ?? 1);
    const lines = Array.from({ length: count }, () => el('span', { class: 'lesson-tag-line' }));
    const dotsFor = Array.from({ length: count }, () => el('span', { class: 'lesson-tag-dot' }));
    const content =
      item.kind === 'chip'
        ? [el('b', { class: 'lesson-chip-letter', text: item.letter }), el('span', { class: 'lesson-chip-role' }, pair(item.text))]
        : pair(item.text);
    const box = el('span', { class: item.kind === 'chip' ? `lesson-unit-chip is-${item.tone}` : `lesson-tag is-${item.tone ?? 'plain'}` }, content);
    const node = el('div', { class: 'lesson-tag-item', dataset: { tag: item.key } }, [...lines, ...dotsFor, box]);
    return { node, box, lines, dots: dotsFor };
  }

  return {
    top,
    bottom,
    tags,
    render,
    place,
    /** What is on the model now, for a test or a check. */
    get tagKeys() {
      return currentTags.map((item) => item.key);
    },
    focusFirst(mode) {
      const target =
        mode === 'manual' ? constrict : mode === 'explaining' ? toggle : entries.querySelector('[data-lesson="play"]');
      target?.focus?.({ preventScroll: true });
    },
  };
}
