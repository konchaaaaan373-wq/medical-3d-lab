import { LESSON_TERMS } from '../../../../data/cardiacOutputLesson.js';
import { inLanguage, onLanguageChange } from '../../../../utils/language.js';
import { damp } from '../../../../utils/math.js';
import {
  BED,
  DIAL,
  FIGURE,
  HEART,
  LEGEND,
  PIPES,
  STRIP_TOPS,
  TUBE,
  UNITS_PER_LITRE,
  channelXs,
  heartPath,
} from './lessonFigureGeometry.js';

/**
 * The introductory lesson's figure, drawn as SVG from `lessonFigureGeometry.js`
 * — **where the browser cannot make a WebGL context**. Everywhere else the
 * lesson's figure is the circulation in 3D (`LessonStage3D`); this flat one is
 * kept so the lesson still opens, and still says the same thing, without it.
 *
 * Built once — two strips, and how to read them in the second strip's place
 * until C is shown — and then only the attributes that change are written each
 * frame: a lumen's width, a needle's end, a tube's filled length, a
 * highlight's opacity. Nothing moves or changes size because C arrived.
 * Colours are the stylesheet's (`lesson-layout.css`); this file never holds
 * one.
 *
 * Shown and hidden with `display`, and a part inside a strip with
 * `visibility: inherit`: an SVG child set `visible` shows through a hidden
 * parent, which is how C's "4.7 L" once stood under B on its own.
 *
 * Text is painted in the language on screen and repainted when it flips
 * (`onLanguageChange`): SVG has no room for the page's habit of carrying both
 * languages and hiding one, because the two would stand on each other.
 *
 * What each strip was drawn from is kept on it as data attributes
 * (`data-map`, `data-co`, `data-lumen` …) so a browser check can compare the
 * drawing with the solver without reading pixels.
 */

const NS = 'http://www.w3.org/2000/svg';

function svg(tag, attributes = {}, children = []) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (value != null) node.setAttribute(key, String(value));
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

/** Write an attribute only when it changed: most frames change nothing. */
function set(node, name, value) {
  const text = String(value);
  if (node.getAttribute(name) !== text) node.setAttribute(name, text);
}

const round = (value) => Math.round(value * 100) / 100;

/**
 * @param {{ reducedMotion?: () => boolean }} [options]
 */
export function createLessonFigure({ reducedMotion = () => false } = {}) {
  /** Text nodes painted from a pair, repainted on a language flip. */
  const painted = [];
  const paint = (node, pair) => {
    const entry = painted.find((one) => one.node === node);
    if (entry) entry.pair = pair;
    else painted.push({ node, pair });
    node.textContent = pair ? inLanguage(pair.en, pair.ja) : '';
  };

  const title = svg('title', { id: 'lesson-figure-title' });
  const root = svg(
    'svg',
    {
      class: 'lesson-figure-svg',
      // Drawn where the browser cannot make a WebGL context (`LessonStage3D`).
      'data-lesson-figure': '2d',
      viewBox: `0 0 ${FIGURE.width} ${FIGURE.height}`,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-labelledby': 'lesson-figure-title',
    },
    [title]
  );

  const strips = ['primary', 'other'].map((slot) => buildStrip(slot));
  strips.forEach((strip, index) => strip.group.setAttribute('transform', `translate(0 ${STRIP_TOPS[index]})`));
  const legend = buildLegend();
  root.append(...strips.map((strip) => strip.group), legend);
  strips[1].group.setAttribute('display', 'none');

  /**
   * How to read the figure, in the lower place while there is no second
   * circulation: one row per part, a small copy of the part beside its words.
   */
  function buildLegend() {
    const group = svg('g', { class: 'lf-legend', transform: `translate(0 ${LEGEND.top})` });
    const words = LESSON_TERMS.legend;
    const heading = svg('text', { class: 'lf-legend-title', x: 0, y: 12 });
    paint(heading, words.title);
    group.append(heading);
    const row = (y, icon, pair, sub) => {
      const main = svg('text', { class: 'lf-legend-main', x: LEGEND.textX, y: sub ? y - 2 : y + 4.5 });
      paint(main, pair);
      group.append(icon, main);
      if (sub) {
        const small = svg('text', { class: 'lf-legend-sub', x: LEGEND.textX, y: y + 13 });
        paint(small, sub);
        group.append(small);
      }
    };
    const [bedY, dialY, tubeY] = LEGEND.rows;
    // Three channels, the bed's own wall and lumen.
    const channels = svg(
      'g',
      {},
      [6, 16, 26].flatMap((x) => [
        svg('rect', { class: 'lf-channel-wall', x: x - 4, y: bedY - 12, width: 8, height: 24, rx: 2 }),
        svg('rect', { class: 'lf-channel-lumen', x: x - 2.4, y: bedY - 12, width: 4.8, height: 24 }),
      ])
    );
    row(bedY, channels, words.bed.main, words.bed.sub);
    const dialIcon = svg('g', {}, [
      svg('path', { class: 'lf-dial-face', d: `M 4 ${dialY + 7} A 13 13 0 0 1 30 ${dialY + 7} Z` }),
      svg('line', { class: 'lf-needle', x1: 17, y1: dialY + 7, x2: 22, y2: dialY - 3 }),
    ]);
    row(dialY, dialIcon, words.dial.main, null);
    const tubeIcon = svg('g', {}, [
      svg('rect', { class: 'lf-tube', x: 2, y: tubeY - 5, width: 32, height: 10, rx: 5 }),
      svg('rect', { class: 'lf-tube-fill', x: 2, y: tubeY - 5, width: 20, height: 10, rx: 5 }),
    ]);
    row(tubeY, tubeIcon, words.tube.main, words.tube.sub);
    return group;
  }

  function buildStrip(slot) {
    const labelled = slot === 'primary';
    const group = svg('g', { class: 'lf-strip', 'data-slot': slot });
    const clipId = `lf-tube-clip-${slot}`;

    // --- highlights, under everything they are about -------------------------
    const glow = {
      heart: svg('circle', { class: 'lf-glow', cx: HEART.x, cy: HEART.y, r: 27, opacity: 0 }),
      bed: svg('rect', {
        class: 'lf-glow',
        x: BED.left - 4,
        y: PIPES.arteryY - 6,
        width: BED.right - BED.left + 6,
        height: PIPES.veinY - PIPES.arteryY + 12,
        rx: 8,
        opacity: 0,
      }),
      // Round the dial and its reading together: a ring round the dial alone
      // ran through the number under it.
      dial: svg('rect', {
        class: 'lf-glow',
        x: DIAL.x - DIAL.radius - 12,
        y: DIAL.y - DIAL.radius - 6,
        width: (DIAL.radius + 12) * 2,
        height: DIAL.radius + 33,
        rx: 10,
        opacity: 0,
      }),
      tube: svg('rect', {
        class: 'lf-glow',
        x: TUBE.left - 5,
        y: TUBE.top - 5,
        width: TUBE.right - TUBE.left + 10,
        height: TUBE.height + 10,
        rx: 10,
        opacity: 0,
      }),
    };
    group.append(...Object.values(glow));

    // --- the circulation's name ----------------------------------------------
    const nameDisc = svg('circle', { class: 'lf-name-disc', cx: 8, cy: 8.5, r: 8 });
    const nameLetter = svg('text', { class: 'lf-name-letter', x: 8, y: 12.8, 'text-anchor': 'middle' });
    const nameRole = svg('tspan', { class: 'lf-name-role' });
    const nameNote = svg('tspan', { class: 'lf-name-note', dx: 3 });
    const nameText = svg('text', { class: 'lf-name', x: 21, y: 13.5 }, [nameRole, nameNote]);
    const name = svg('g', { class: 'lf-name-tag' }, [nameDisc, nameLetter, nameText]);
    group.append(name);

    // --- pipes ------------------------------------------------------------------
    const artery = svg('path', {
      class: 'lf-pipe lf-artery',
      d: `M ${HEART.x} ${HEART.y - 8} V ${PIPES.arteryY + 6} Q ${HEART.x} ${PIPES.arteryY} ${HEART.x + 6} ${PIPES.arteryY} H ${PIPES.right}`,
      'stroke-width': PIPES.width,
    });
    const vein = svg('path', {
      class: 'lf-pipe lf-vein',
      d: `M ${PIPES.right} ${PIPES.veinY} H ${HEART.x + 6} Q ${HEART.x} ${PIPES.veinY} ${HEART.x} ${PIPES.veinY - 6} V ${HEART.y + 8}`,
      'stroke-width': PIPES.width,
    });
    const chevron = (x, y, direction) =>
      svg('path', {
        class: 'lf-chevron',
        d: direction > 0 ? `M ${x - 3} ${y - 3.5} L ${x + 2} ${y} L ${x - 3} ${y + 3.5}` : `M ${x + 3} ${y - 3.5} L ${x - 2} ${y} L ${x + 3} ${y + 3.5}`,
      });
    group.append(artery, vein, chevron(200, PIPES.arteryY, 1), chevron(200, PIPES.veinY, -1));

    // --- the small vessels: six channels, one lumen width -----------------------
    const length = BED.bottom - BED.top;
    const centres = channelXs();
    const walls = centres.map((x) =>
      svg('rect', { class: 'lf-channel-wall', x: x - BED.outer / 2, y: BED.top, width: BED.outer, height: length, rx: 2 })
    );
    const lumens = centres.map((x) => svg('rect', { class: 'lf-channel-lumen', x, y: BED.top, width: 0, height: length }));
    const bed = svg('g', { class: 'lf-bed', 'data-part': 'bed' }, [...walls, ...lumens]);
    group.append(bed);

    // --- the dial on the artery -------------------------------------------------
    const { x: cx, y: cy, radius } = DIAL;
    const face = svg('path', {
      class: 'lf-dial-face',
      d: `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy} Z`,
    });
    const ticks = [];
    for (let mmHg = 0; mmHg <= DIAL.maxMmHg; mmHg += DIAL.tickEvery) {
      const angle = Math.PI * (1 - mmHg / DIAL.maxMmHg);
      const outer = radius - 1.5;
      const inner = radius - 5;
      ticks.push(
        svg('line', {
          class: 'lf-dial-tick',
          x1: round(cx + Math.cos(angle) * inner),
          y1: round(cy - Math.sin(angle) * inner),
          x2: round(cx + Math.cos(angle) * outer),
          y2: round(cy - Math.sin(angle) * outer),
        })
      );
    }
    const stem = svg('line', { class: 'lf-dial-stem', x1: cx, y1: PIPES.arteryY + 2, x2: cx, y2: cy - radius });
    const ghostNeedle = svg('line', { class: 'lf-needle-before', x1: cx, y1: cy, x2: cx, y2: cy, visibility: 'hidden' });
    const needle = svg('line', { class: 'lf-needle', x1: cx, y1: cy, x2: cx, y2: cy });
    const hub = svg('circle', { class: 'lf-dial-hub', cx, cy, r: 2.6 });
    const mapNumber = svg('tspan', { class: 'lf-value-number' });
    const mapUnit = svg('tspan', { class: 'lf-value-unit', dx: 2 });
    const mapArrow = svg('tspan', { class: 'lf-value-arrow', dx: 2 });
    const mapValue = svg('text', { class: 'lf-value lf-map-value', x: cx, y: cy + 22, 'text-anchor': 'middle' }, [
      mapNumber,
      mapUnit,
      mapArrow,
    ]);
    const dial = svg('g', { class: 'lf-dial', 'data-part': 'dial' }, [stem, face, ...ticks, ghostNeedle, needle, hub, mapValue]);
    group.append(dial);

    // --- the heart ---------------------------------------------------------------
    const heart = svg('path', { class: 'lf-heart', d: heartPath(1), 'data-part': 'heart' });
    const heartLabel = svg('text', { class: 'lf-heart-label', x: HEART.x, y: HEART.y + 3.5, 'text-anchor': 'middle' });
    group.append(heart, heartLabel);
    paint(heartLabel, LESSON_TERMS.heart);

    // --- the tube: what the heart sends out per minute ---------------------------------
    const tubeLabel = svg('text', { class: 'lf-label lf-tube-label', x: 0, y: TUBE.top + 11.5 });
    paint(tubeLabel, LESSON_TERMS.output.short);
    const tubeShape = { x: TUBE.left, y: TUBE.top, width: TUBE.right - TUBE.left, height: TUBE.height, rx: TUBE.height / 2 };
    const clip = svg('clipPath', { id: clipId }, [svg('rect', tubeShape)]);
    const tubeBack = svg('rect', { class: 'lf-tube', ...tubeShape });
    const tubeFill = svg('rect', { class: 'lf-tube-fill', x: TUBE.left, y: TUBE.top, width: 0, height: TUBE.height, 'clip-path': `url(#${clipId})` });
    const litreTicks = Array.from({ length: TUBE.maxLitres - 1 }, (_, i) => {
      const x = TUBE.left + UNITS_PER_LITRE * (i + 1);
      return svg('line', { class: 'lf-tube-tick', x1: round(x), y1: TUBE.top + 1, x2: round(x), y2: TUBE.top + 4 });
    });
    const ghostTube = svg('line', { class: 'lf-tube-before', x1: 0, y1: TUBE.top - 3, x2: 0, y2: TUBE.top + TUBE.height + 3, visibility: 'hidden' });
    const ghostLabel = svg('text', { class: 'lf-before-label', x: 0, y: TUBE.top + 11.5, visibility: 'hidden' });
    paint(ghostLabel, LESSON_TERMS.before);
    const coNumber = svg('tspan', { class: 'lf-value-number' });
    const coUnit = svg('tspan', { class: 'lf-value-unit', dx: 1.5 });
    const coArrow = svg('tspan', { class: 'lf-value-arrow', dx: 1.5 });
    const coValue = svg('text', { class: 'lf-value lf-co-value', x: 0, y: TUBE.top + 11.5 }, [coNumber, coUnit, coArrow]);
    const tube = svg('g', { class: 'lf-tube-group', 'data-part': 'tube' }, [
      clip,
      tubeBack,
      tubeFill,
      ...litreTicks,
      ghostTube,
      ghostLabel,
      coValue,
    ]);
    group.append(tubeLabel, tube);

    // --- the parts' names: on the first strip only --------------------------------------
    // The second strip stands under the first with every part in the same
    // column, so its parts are named once, above.
    let bedLabel = null;
    let dialLabels = [];
    if (labelled) {
      bedLabel = svg('text', { class: 'lf-label lf-bed-label', x: BED.right, y: 13.5, 'text-anchor': 'end' });
      dialLabels = [
        svg('text', { class: 'lf-label lf-dial-label', x: DIAL.x + DIAL.radius + 14, y: DIAL.y - 6 }),
        svg('text', { class: 'lf-term lf-dial-term', x: DIAL.x + DIAL.radius + 14, y: DIAL.y + 9 }),
      ];
      paint(dialLabels[0], LESSON_TERMS.pressure.short);
      paint(dialLabels[1], LESSON_TERMS.pressure.term);
      group.append(bedLabel, ...dialLabels);
    }

    return {
      slot,
      group,
      glow,
      name: { tag: name, letter: nameLetter, role: nameRole, note: nameNote },
      lumens,
      centres,
      needle,
      ghostNeedle,
      mapValue: { number: mapNumber, unit: mapUnit, arrow: mapArrow },
      heart,
      tubeFill,
      ghostTube,
      ghostLabel,
      coValue: { text: coValue, number: coNumber, unit: coUnit, arrow: coArrow },
      bedLabel,
      glowLevel: { heart: 0, bed: 0, dial: 0, tube: 0 },
      drawnKey: null,
    };
  }

  const arrow = (direction) => (direction === 'up' ? '↑' : direction === 'down' ? '↓' : direction === 'same' ? '→' : '');

  /** The parts of one strip that change with what it shows. */
  function drawStrip(strip, data, { squeeze, highlight, dt, still }) {
    const key = JSON.stringify([data.id, data.drawing, data.values, data.narrowed]);
    if (key !== strip.drawnKey) {
      strip.drawnKey = key;
      const { drawing, values, copy } = data;
      strip.group.dataset.id = data.id;
      strip.group.dataset.tone = copy.tone;
      strip.group.dataset.map = values.map;
      strip.group.dataset.co = values.co;
      strip.group.dataset.lumen = round(drawing.lumen);
      strip.group.dataset.needleAngle = round(drawing.needleAngle);
      strip.group.dataset.tube = round(drawing.tube);
      strip.group.dataset.solved = JSON.stringify(data.solved);
      if (drawing.before) strip.group.dataset.beforeTube = round(drawing.before.tube);
      else delete strip.group.dataset.beforeTube;

      strip.name.letter.textContent = copy.letter;
      paint(strip.name.role, copy.role);
      paint(strip.name.note, copy.note ? { en: `(${copy.note.en})`, ja: `（${copy.note.ja}）` } : null);

      strip.lumens.forEach((lumen, i) => {
        set(lumen, 'x', round(strip.centres[i] - drawing.lumen / 2));
        set(lumen, 'width', round(drawing.lumen));
      });
      const tip = (angle, length) => ({ x: round(DIAL.x + Math.cos(angle) * length), y: round(DIAL.y - Math.sin(angle) * length) });
      const end = tip(drawing.needleAngle, DIAL.needle);
      set(strip.needle, 'x2', end.x);
      set(strip.needle, 'y2', end.y);
      if (drawing.before) {
        const before = tip(drawing.before.needleAngle, DIAL.needle - 1);
        set(strip.ghostNeedle, 'x2', before.x);
        set(strip.ghostNeedle, 'y2', before.y);
      }
      set(strip.ghostNeedle, 'visibility', drawing.before ? 'inherit' : 'hidden');

      strip.mapValue.number.textContent = values.map;
      paint(strip.mapValue.unit, LESSON_TERMS.pressure.unit);
      strip.mapValue.arrow.textContent = arrow(values.mapDirection);
      set(strip.mapValue.arrow, 'class', `lf-value-arrow is-${values.mapDirection ?? 'none'}`);
      strip.coValue.number.textContent = values.co;
      paint(strip.coValue.unit, LESSON_TERMS.output.unit);
      strip.coValue.arrow.textContent = arrow(values.coDirection);
      set(strip.coValue.arrow, 'class', `lf-value-arrow is-${values.coDirection ?? 'none'}`);

      if (strip.bedLabel) paint(strip.bedLabel, data.narrowed ? LESSON_TERMS.bedNarrowed : LESSON_TERMS.bed);
      strip.group.classList.toggle('is-narrowed', data.narrowed);
    }

    // The tube is filled to its solved length, and never emptied to fill again:
    // a length growing from zero reads as the blood having stopped (owner's
    // review, 2026-10-02).
    const filled = data.drawing.tube;
    set(strip.tubeFill, 'width', round(filled));
    const before = data.drawing.before;
    const beforeX = before ? TUBE.left + before.tube : null;
    set(strip.ghostTube, 'visibility', before ? 'inherit' : 'hidden');
    set(strip.ghostLabel, 'visibility', before ? 'inherit' : 'hidden');
    if (before) {
      set(strip.ghostTube, 'x1', round(beforeX));
      set(strip.ghostTube, 'x2', round(beforeX));
      set(strip.ghostLabel, 'x', round(beforeX + 3.5));
    }
    // The value sits inside the filled length, at its end — unless the filled
    // length is too short to hold it, or A's mark stands inside it.
    const end = TUBE.left + filled;
    const inside = filled > 44 && !(before && beforeX < end + 1);
    set(strip.coValue.text, 'x', round(inside ? end - 4 : end + 4));
    set(strip.coValue.text, 'text-anchor', inside ? 'end' : 'start');
    set(strip.coValue.text, 'class', `lf-value lf-co-value ${inside ? 'is-inside' : 'is-outside'}`);

    set(strip.heart, 'd', heartPath(1 - 0.07 * squeeze));

    let calm = true;
    for (const part of Object.keys(strip.glowLevel)) {
      const target = highlight.includes(part) ? 1 : 0;
      let level = still ? target : damp(strip.glowLevel[part], target, 6, dt);
      if (Math.abs(level - target) < 0.01) level = target;
      else calm = false;
      strip.glowLevel[part] = level;
      set(strip.glow[part], 'opacity', round(level * 0.9));
    }
    return calm;
  }

  let summary = null;
  onLanguageChange(() => {
    for (const { node, pair } of painted) node.textContent = pair ? inLanguage(pair.en, pair.ja) : '';
    if (summary) title.textContent = inLanguage(summary.en, summary.ja);
  });

  return {
    element: root,
    /**
     * Draw one frame.
     *
     * @param {{ strips: object[], highlight: string[], squeeze: number,
     *   summary: { en: string, ja: string }, dt: number }} frame
     */
    render({ strips: shown, highlight, squeeze, summary: said, dt }) {
      const still = reducedMotion();
      let calm = true;
      strips.forEach((strip, index) => {
        const data = shown[index];
        set(strip.group, 'display', data ? 'inline' : 'none');
        if (data) calm = drawStrip(strip, data, { squeeze: still ? 0 : squeeze, highlight, dt, still }) && calm;
      });
      // Whether every highlight has arrived where it is going: a check
      // photographs a figure at rest, not one half way between two scenes.
      root.dataset.calm = String(calm);
      // How to read the figure stands where C will, until C does.
      set(legend, 'display', shown.length > 1 ? 'none' : 'inline');
      root.dataset.strips = String(shown.length);
      if (said && (summary?.en !== said.en || summary?.ja !== said.ja)) {
        summary = said;
        title.textContent = inLanguage(said.en, said.ja);
      }
    },
  };
}

