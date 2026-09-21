/**
 * The reel's text layer, painted into a 2D canvas instead of laid over one.
 *
 * ## Why this exists at all
 *
 * On screen the sequence is two layers: WebGL for the model and DOM for the
 * captions (`ReelOverlay`). That is right for the app — text stays crisp, and
 * the layout is ordinary CSS. It is not available to a *file*: a canvas
 * recording captures the canvas, and the DOM over it does not exist as far as
 * `captureStream` is concerned. A video made that way would be the one thing
 * this product must not hand out — a disease model with its caveats removed.
 *
 * So the exported frame is composited: the rendered canvas, then this.
 *
 * ## What is and is not duplicated
 *
 * **Not the words.** Every string painted here arrives in the same frame
 * description `ReelOverlay.render` is given, produced by the scene's own
 * `overlayAt(t)`. There is no second copy of the copy, and a sequence that
 * changes what it says changes both surfaces at once.
 *
 * **Yes, the layout.** Sizes, anchors and positions mirror
 * `src/styles/reel.css` — `1 unit = 1% of the frame width`, exactly what
 * `--reel-unit` means there, and a block anchored `bottom: 16%` is painted
 * upward from 84% of the height rather than downward from it — but they are a
 * second rendering of it. A CSS change does not reach this file, and the
 * reason that risk is worth taking is that the alternative is a file with no
 * captions at all. `tests/video-export.test.js` holds the part that matters:
 * every text slot in the frame is painted, and the provenance footer is
 * painted whether or not the frame has anything in it.
 *
 * Pure apart from the context it is handed: no DOM lookups, no timers, no
 * `three`. A fake context records the calls, which is how it is tested.
 */
import { TOKENS } from '../styles/palette.js';

/** The frame's own colours, mirroring `reel.css`. */
const INK = TOKENS.ink;
const INK_DIM = TOKENS['ink-dim'];
const INK_FAINT = TOKENS['ink-faint'];
const CARD_INK = ['#7fe8f5', '#ff8a9c'];
const CARD_LABEL_INK = [INK_DIM, '#ffb0bc'];
const SCRIM = 'rgba(4, 6, 12, 0.72)';
const FOOTER_BACKGROUND = 'rgba(4, 6, 12, 0.86)';

const FONT_STACK = '"Helvetica Neue", Helvetica, Arial, "Hiragino Sans", "Noto Sans JP", sans-serif';

/** Where each slot sits, as `reel.css` places it. Fractions are of the frame height. */
const LAYOUT = Object.freeze({
  sidePaddingUnits: 6.5,
  cards: { at: 0.1, anchor: 'top' },
  marker: { at: 0.3, anchor: 'middle' },
  badge: { at: 0.64, anchor: 'top' },
  centre: {
    hook: { at: 0.34, anchor: 'middle' },
    'take-home': { at: 0.8, anchor: 'bottom' },
    default: { at: 0.5, anchor: 'middle' },
  },
  bottom: { at: 0.84, anchor: 'bottom' },
  footerHeightUnits: 11,
});

/**
 * Paints one frame's text over whatever is already on the context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} options
 * @param {object} options.frame the same description `ReelOverlay.render` takes
 * @param {number} options.width  frame width in device pixels
 * @param {number} options.height frame height in device pixels
 * @param {{ title: string, caveat: string, credit?: string }} [options.provenance]
 *   what the file has to carry once it is out of the app: which model this is,
 *   the sentence that bounds it, and any credit the geometry's licence asks for
 */
export function paintReelFrame(ctx, { frame = {}, width, height, provenance }) {
  const unit = width / 100;
  const side = LAYOUT.sidePaddingUnits * unit;
  const innerWidth = width - side * 2;

  /**
   * One stack of lines, anchored the way its CSS rule anchors it.
   *
   * @param {{text: any, size: number, weight?: number, colour?: string,
   *          lineHeight?: number, gap?: number}[]} parts
   * @returns {number} the y the block ends at
   */
  const block = (parts, { x, align = 'center', anchor = 'top', at, maxWidth = innerWidth, opacity = 1 }) => {
    if (opacity < 0.01) return at;
    const measured = [];
    let total = 0;
    for (const part of parts) {
      if (part?.text == null || part.text === '') continue;
      ctx.font = font(part, unit);
      const lines = wrapLines(ctx, String(part.text), maxWidth);
      const lineHeight = part.size * unit * (part.lineHeight ?? 1.25);
      const gap = (part.gap ?? 0) * unit;
      measured.push({ part, lines, lineHeight, gap });
      total += gap + lines.length * lineHeight;
    }
    if (!measured.length) return at;

    let cursor = anchor === 'bottom' ? at - total : anchor === 'middle' ? at - total / 2 : at;
    ctx.save();
    ctx.globalAlpha = Math.min(1, opacity);
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    for (const { part, lines, lineHeight, gap } of measured) {
      cursor += gap;
      ctx.fillStyle = part.colour ?? INK;
      ctx.font = font(part, unit);
      for (const line of lines) {
        ctx.fillText(line, x, cursor);
        cursor += lineHeight;
      }
    }
    ctx.restore();
    return cursor;
  };

  const centreX = width / 2;
  const title = frame.title ?? {};
  const titleOpacity = title.opacity ?? 0;
  const variant = title.variant ?? 'hook';

  // The opening headline needs contrast against whatever is moving behind it,
  // the same way `.reel-scrim` gives it on screen.
  if (titleOpacity > 0.01 && variant === 'hook') {
    ctx.save();
    ctx.globalAlpha = Math.min(1, titleOpacity * 0.55);
    ctx.fillStyle = SCRIM;
    ctx.fillRect(0, height * 0.16, width, height * 0.36);
    ctx.restore();
  }

  /**
   * One line of mixed sizes sharing a baseline, centred — the card's figure.
   *
   * `IC 3.72 L` is three spans in a flex row on screen (2.4em, 9em, 3em,
   * `align-items: baseline`) and was painted here as one 9em string, which put
   * a label in the size of the number it labels: the first exported frame read
   * "吸う余地 3.72 L" with the words as tall as the figure. Mixed sizes on one
   * line need laying out by hand; nothing else in the frame does.
   */
  const inlineRow = (parts, { centre, top, opacity }) => {
    const drawn = parts.filter((part) => part?.text != null && part.text !== '');
    if (!drawn.length || opacity < 0.01) return top;
    const gap = unit * 0.4;
    const widths = drawn.map((part) => {
      ctx.font = font(part, unit);
      return ctx.measureText(String(part.text)).width;
    });
    const total = widths.reduce((sum, value) => sum + value, 0) + gap * (drawn.length - 1);
    const tallest = Math.max(...drawn.map((part) => part.size));
    // One baseline for the row, sitting where the tallest part's baseline does.
    const baseline = top + tallest * unit * 0.86;
    let x = centre - total / 2;
    ctx.save();
    ctx.globalAlpha = Math.min(1, opacity);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    drawn.forEach((part, index) => {
      ctx.fillStyle = part.colour ?? INK;
      ctx.font = font(part, unit);
      ctx.fillText(String(part.text), x, baseline);
      x += widths[index] + gap;
    });
    ctx.restore();
    return top + tallest * unit * 1.1;
  };

  // --- cards -----------------------------------------------------------
  const cards = frame.cards ?? {};
  const items = (cards.items ?? []).filter(Boolean);
  if (items.length) {
    const columnWidth = innerWidth / items.length;
    const opacity = cards.opacity ?? 0;
    items.forEach((item, index) => {
      const x = side + columnWidth * (index + 0.5);
      const common = { x, maxWidth: columnWidth, anchor: 'top', opacity };
      let y = block([{ text: item.label, size: 3.4, weight: 700, colour: CARD_LABEL_INK[index] ?? INK_DIM }], {
        ...common,
        at: height * LAYOUT.cards.at,
      });
      y = inlineRow(
        [
          { text: item.headlineKey, size: 2.4, colour: INK_FAINT },
          { text: item.headline, size: 9, weight: 700, colour: CARD_INK[index] ?? INK },
          { text: item.headlineUnit, size: 3, colour: INK_FAINT },
        ],
        { centre: x, top: y, opacity }
      );
      block([{ text: (item.rows ?? []).join('\n'), size: 2.3, colour: INK_FAINT }], { ...common, at: y + unit * 0.4 });
    });
  }

  // --- marker ----------------------------------------------------------
  const marker = frame.marker ?? {};
  block(
    [
      { text: marker.text, size: 4.2, weight: 700 },
      { text: marker.sub, size: 2.1, colour: INK_FAINT },
    ],
    { x: centreX, at: height * LAYOUT.marker.at, anchor: LAYOUT.marker.anchor, opacity: marker.opacity ?? 0 }
  );

  // --- badge -----------------------------------------------------------
  const badge = frame.badge ?? {};
  block([{ text: badge.text, size: 2.8, colour: INK_DIM, lineHeight: 1.3 }], {
    x: width - side,
    align: 'right',
    maxWidth: innerWidth * 0.52,
    at: height * LAYOUT.badge.at,
    anchor: LAYOUT.badge.anchor,
    opacity: badge.opacity ?? 0,
  });

  // --- headline --------------------------------------------------------
  const subtitle = frame.subtitle ?? {};
  const centre = LAYOUT.centre[variant] ?? LAYOUT.centre.default;
  block(
    [
      { text: title.text, size: variant === 'hook' ? 9.5 : variant === 'take-home' ? 5 : 6, weight: 700, lineHeight: 1.12 },
      // The subtitle fades on its own track, so it is drawn with the headline
      // only while it is up; a faded subtitle must not hold the block's height.
      { text: (subtitle.opacity ?? 0) > 0.01 ? subtitle.text : '', size: 3.4, weight: 500, colour: INK_DIM, gap: 1.6 },
    ],
    { x: centreX, at: height * centre.at, anchor: centre.anchor, opacity: titleOpacity }
  );

  // --- bottom band -----------------------------------------------------
  const caption = frame.caption ?? {};
  const note = frame.note ?? {};
  block([{ text: caption.text, size: 3.5, weight: 600, lineHeight: 1.35 }], {
    x: centreX,
    at: height * LAYOUT.bottom.at - ((note.opacity ?? 0) > 0.01 ? unit * 3.5 : 0),
    anchor: LAYOUT.bottom.anchor,
    opacity: caption.opacity ?? 0,
  });
  block([{ text: note.text, size: 2.1, colour: INK_FAINT }], {
    x: centreX,
    at: height * LAYOUT.bottom.at,
    anchor: LAYOUT.bottom.anchor,
    opacity: note.opacity ?? 0,
  });

  paintProvenance(ctx, { width, height, unit, provenance });
}

/**
 * The footer the file cannot leave without.
 *
 * Painted last, at full opacity, on every frame including an empty one: it is
 * the only thing in the file that says what the picture is, and the whole
 * argument for compositing rather than recording the bare canvas.
 *
 * The band is measured before it is drawn rather than being a fixed 11 units.
 * A fixed band is only right for a short caveat, and the caveats are the
 * scenes' own sentences: heart failure's ran to three lines, so the exported
 * frame carried its closing character and its source line *below the bottom
 * edge of the video* — the one part of the file that may never be croppable,
 * cropped by the file itself.
 */
function paintProvenance(ctx, { width, height, unit, provenance }) {
  if (!provenance) return;
  const side = LAYOUT.sidePaddingUnits * unit;
  const inner = width - side * 2;
  const padding = unit * 1.4;
  const gap = unit * 0.3;

  const parts = [
    { text: provenance.title, size: 2.4, weight: 700, colour: INK },
    { text: provenance.caveat, size: 1.9, weight: 400, colour: INK_DIM },
    { text: provenance.credit, size: 1.6, weight: 400, colour: INK_FAINT },
  ].filter((part) => part.text);

  let needed = padding * 2;
  const measured = parts.map((part) => {
    ctx.font = font(part, unit);
    const lines = wrapLines(ctx, String(part.text), inner);
    const lineHeight = part.size * unit * 1.25;
    needed += lines.length * lineHeight + gap;
    return { part, lines, lineHeight };
  });

  const bandHeight = Math.max(LAYOUT.footerHeightUnits * unit, needed);
  const top = height - bandHeight;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = FOOTER_BACKGROUND;
  ctx.fillRect(0, top, width, bandHeight);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  let y = top + padding;
  for (const { part, lines, lineHeight } of measured) {
    ctx.fillStyle = part.colour;
    ctx.font = font(part, unit);
    for (const line of lines) {
      ctx.fillText(line, side, y);
      y += lineHeight;
    }
    y += gap;
  }
  ctx.restore();
}

const font = (part, unit) => `${part.weight ?? 400} ${part.size * unit}px ${FONT_STACK}`;

/**
 * Greedy wrapping that works in both languages.
 *
 * English breaks on spaces. Japanese has none, so a run with no space that
 * does not fit is broken by character — which is what the language does and
 * what the DOM layer gets from the browser for free.
 *
 * @param {{ measureText: (text: string) => { width: number } }} ctx
 */
export function wrapLines(ctx, value, maxWidth) {
  const measure = (text) => ctx.measureText(text)?.width ?? 0;
  const out = [];
  for (const paragraph of String(value).split('\n')) {
    let line = '';
    for (const token of tokenize(paragraph)) {
      const candidate = line + token;
      if (line && measure(candidate) > maxWidth && !NEVER_STARTS_A_LINE.has(token)) {
        out.push(line.trimEnd());
        line = token.trimStart();
      } else {
        line = candidate;
      }
    }
    out.push(line.trimEnd());
  }
  return out;
}

/**
 * Characters a Japanese line may not begin with (kinsoku shori, the part of it
 * that matters here).
 *
 * Breaking by character put a lone "。" on its own line under the heart
 * failure footer — the closing character of the sentence that bounds the
 * model, orphaned. The rule is to let it overhang the line it ends rather
 * than start the next one.
 */
const NEVER_STARTS_A_LINE = new Set([
  '。', '、', '．', '，', '」', '』', '）', '］', '｝', '〉', '》', '？', '！', '・', '…', '‥', '：', '；', 'ー', 'ゝ', 'ゞ', '々',
  ')', ']', '}', ',', '.', '?', '!', ':', ';', '|', '｜',
]);

/**
 * Words where there are spaces, characters where there are not.
 *
 * A Japanese sentence arrives as one "word" and would overflow the frame
 * rather than wrap, so a run that is not plain ASCII is offered per character
 * instead.
 */
function tokenize(paragraph) {
  const chunks = paragraph.match(/\S+\s*/g) ?? [];
  const tokens = [];
  for (const chunk of chunks) {
    if (/^[\x20-\x7e]+$/.test(chunk)) tokens.push(chunk);
    else tokens.push(...Array.from(chunk));
  }
  return tokens;
}
