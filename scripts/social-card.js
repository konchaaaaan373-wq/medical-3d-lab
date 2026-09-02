/**
 * The 1200x630 link-preview card, as markup.
 *
 * Split from the rasteriser on purpose. What a card *says* is a question about
 * the catalogue — the title, the maturity, the review state, the boundary the
 * product must never drop — and it is answered here, in a pure function a unit
 * test can read. Turning that into a PNG needs a browser, and that lives in
 * `render-social-cards.mjs` where it can be skipped.
 *
 * ### Why it is typography and not a picture of the model
 *
 * A screenshot of the 3D scene would be the obvious thing, and it was the
 * first thing tried. Two problems. It cannot be regenerated deterministically
 * — this repository has no GPU in CI, and a software-rendered frame is not
 * what a reader with a GPU sees, so the committed card would be a picture of
 * something nobody has. And a scene frame carries no maturity and no review
 * state, which is exactly what this product has decided a reader is owed
 * *before* they click. A card that says "Prototype" and "re-review required"
 * in the timeline is doing the Trust surface's job at the one moment the
 * reader is deciding whether to trust it.
 *
 * Pure: no DOM, no `three`, no filesystem. Catalogue in, HTML out.
 */
import { SITE_NAME, escapeHtml } from './site-metadata.js';

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

/**
 * Fonts are whatever the rendering machine has.
 *
 * No webfont, deliberately: the card is rasterised once and committed, and a
 * generator that reaches the network to draw an image is a generator that
 * produces a different image on a different day. The consequence is honest and
 * worth writing down — regenerating these on a machine with different fonts
 * installed produces slightly different cards, which is why they are committed
 * rather than built.
 */
const FONT_STACK =
  "'Inter', 'Helvetica Neue', Arial, 'Noto Sans JP', 'IPAGothic', 'Hiragino Kaku Gothic ProN', Meiryo, sans-serif";

/** Maturity, in the two words a card has room for. */
const MATURITY = {
  prototype: { en: 'Prototype', ja: 'プロトタイプ' },
  alpha: { en: 'Alpha', ja: 'アルファ' },
  reviewed: { en: 'Reviewed', ja: 'レビュー済' },
  production: { en: 'Production', ja: 'プロダクション' },
};

/** Review state, short enough for a badge. Keys match `CLINICAL_REVIEW_STATUSES`. */
const REVIEW = {
  reviewed: { en: 'Clinical review complete', ja: '医学レビュー完了', tone: 'good' },
  stale: { en: 'Re-review required', ja: '再レビュー必要', tone: 'warn' },
  pending: { en: 'Clinical review pending', ja: '医学レビュー未完了', tone: 'plain' },
  'legacy-unversioned': { en: 'Legacy review', ja: '旧基準レビュー', tone: 'plain' },
};

/**
 * The line that may never be dropped from anything this product publishes.
 * Repeated here rather than imported from the page generator because a card is
 * seen without the page, and it has to carry its own boundary.
 */
const BOUNDARY = {
  ja: '教育目的の概念モデル — 個別患者の診断・治療には使用できません',
  en: 'Educational conceptual model — not for patient diagnosis or treatment',
};

/** Clip a string to a length a card can actually hold, on a word boundary. */
export function clip(value, limit) {
  const text = String(value ?? '').trim();
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  // Japanese has no spaces to break on, so fall back to a hard cut.
  const space = cut.lastIndexOf(' ');
  return `${(space > limit * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/**
 * How large the title may be set, given how much of it there is.
 *
 * Measured against the widest title in the catalogue rather than chosen:
 * "Hepatorenal syndrome — the haemodynamic mechanism" is 49 characters and has
 * to fit on two lines without touching the badges.
 */
export function titleSize(text) {
  const length = String(text ?? '').length;
  if (length <= 18) return 82;
  if (length <= 30) return 68;
  if (length <= 44) return 56;
  return 46;
}

/** Japanese sets denser than Latin at the same point size, so it is set smaller. */
export const subtitleSize = (text) => (String(text ?? '').length <= 22 ? 40 : 32);

/**
 * How much description a card starts with, and the least it may be cut to.
 *
 * A card is a fixed 630px and the boundary line at its foot is the one thing
 * that may never be pushed off it, so the description is what yields. How much
 * it has to yield is not something to tabulate: it depends on how many lines
 * the English title takes, how many the Japanese subtitle takes, and how the
 * text happens to break — three things a character count models badly. The
 * first attempt keyed the budget on the English title length alone and clipped
 * COPD and portal hypertension, whose titles are short and whose Japanese runs
 * long.
 *
 * So the rasteriser starts at `start` and shortens until the browser says it
 * fits, which is the only opinion that counts. `floor` is where it gives up
 * and reports a card that cannot be made to work.
 */
export const BODY_BUDGET = { start: 82, floor: 24, step: 6 };

/**
 * @param {object} scene a catalogue entry
 * @param {{ system?: {label:string,labelJa:string}|null, reviewStatus?: string,
 *   bodyChars?: number }} [options] `bodyChars` is set by the rasteriser as it
 *   shortens the description to fit; see `BODY_BUDGET`.
 */
export function socialCardHtml(
  scene,
  { system = null, reviewStatus = 'pending', bodyChars = BODY_BUDGET.start } = {}
) {
  const maturity = MATURITY[scene.status] ?? MATURITY.prototype;
  const review = REVIEW[reviewStatus] ?? REVIEW.pending;
  const systemLabel = system ? `${system.label} · ${system.labelJa}` : '';

  return card({
    eyebrow: systemLabel,
    title: clip(scene.titleEn, 56),
    titleJa: clip(scene.titleJa, 30),
    body: clip(scene.descriptionJa, bodyChars),
    badges: [
      { text: `${maturity.en} · ${maturity.ja}`, tone: 'plain' },
      { text: `${review.en} · ${review.ja}`, tone: review.tone },
    ],
  });
}

/** The site-level card, for a link to the catalogue rather than to one scene. */
export function siteCardHtml({ sceneCount = 0 } = {}) {
  return card({
    // No eyebrow: the wordmark is directly above it, and repeating the site's
    // own name there is the one thing this card does not need to say twice.
    eyebrow: '',
    title: 'Make invisible physiology visible',
    titleJa: '見えない病態生理を、動かして理解する',
    body: '一つの医学モデルから、3D・数値・グラフ・教材がすべて導かれます。',
    badges: [
      { text: `${sceneCount} public models · 公開モデル ${sceneCount} 件`, tone: 'plain' },
      { text: 'Maturity and clinical review shown per model', tone: 'plain' },
    ],
  });
}

const TONES = {
  good: { border: '#3f7f63', ink: '#a9e7c4' },
  warn: { border: '#8a6a33', ink: '#f0cf94' },
  plain: { border: '#2b3648', ink: '#a7b6ce' },
};

function card({ eyebrow, title, titleJa, body, badges }) {
  const badge = ({ text, tone }) => {
    const colours = TONES[tone] ?? TONES.plain;
    return `<span class="badge" style="border-color:${colours.border};color:${colours.ink}">${escapeHtml(text)}</span>`;
  };

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${CARD_WIDTH}px; height: ${CARD_HEIGHT}px; }
  body {
    background: #04060c;
    color: #eaf2ff;
    font-family: ${FONT_STACK};
    /* The accent, thrown from the top-left the way the product's own surfaces
       light a dark page, so a card is recognisably from this site. */
    background-image:
      radial-gradient(1100px 620px at 8% -12%, rgba(56, 225, 239, 0.16), transparent 62%),
      radial-gradient(700px 520px at 104% 118%, rgba(56, 225, 239, 0.07), transparent 60%);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 62px 68px 54px;
  }
  .wordmark { display: flex; align-items: center; gap: 14px; }
  .mark {
    width: 40px; height: 40px; border-radius: 10px;
    background: #38e1ef; color: #04060c;
    font-size: 17px; font-weight: 800; letter-spacing: -0.04em;
    display: flex; align-items: center; justify-content: center;
  }
  /* Scoped past the mark, which is also a span inside the wordmark: an
     unscoped rule here painted the badge's letters in the badge's own
     background colour, and a solid cyan square is not a wordmark. */
  .wordmark > span:not(.mark) {
    font-size: 15px; font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase;
    color: #38e1ef;
  }
  .eyebrow {
    margin-top: 44px;
    font-size: 21px; letter-spacing: 0.16em; text-transform: uppercase;
    color: #6b7c95;
  }
  h1 {
    margin-top: 18px;
    font-size: ${titleSize(title)}px;
    line-height: 1.04; letter-spacing: -0.035em; font-weight: 750;
    max-width: 22ch;
  }
  .title-ja {
    margin-top: 14px;
    font-size: ${subtitleSize(titleJa)}px; line-height: 1.24; font-weight: 600;
    color: #a7b6ce;
  }
  .body { margin-top: 20px; font-size: 23px; line-height: 1.5; color: #a7b6ce; max-width: 40ch; }
  /* The head may shrink; the foot may not. Whatever else a card loses when a
     title runs long, it does not lose the line that says what this is. */
  .head { min-height: 0; overflow: hidden; }
  .foot { display: flex; flex-direction: column; gap: 18px; flex: 0 0 auto; }
  .badges { display: flex; gap: 12px; flex-wrap: wrap; }
  .badge {
    border: 1px solid #2b3648; border-radius: 999px;
    padding: 9px 18px; font-size: 19px; font-weight: 600;
  }
  .boundary { font-size: 18px; line-height: 1.45; color: #6b7c95; }
  .boundary b { display: block; font-weight: 600; color: #8394ad; }
</style>
</head>
<body>
  <div class="head">
    <div class="wordmark"><span class="mark">3D</span><span>${escapeHtml(SITE_NAME)}</span></div>
    ${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ''}
    <h1>${escapeHtml(title)}</h1>
    <p class="title-ja">${escapeHtml(titleJa)}</p>
    ${body ? `<p class="body">${escapeHtml(body)}</p>` : ''}
  </div>
  <div class="foot">
    <div class="badges">${badges.map(badge).join('')}</div>
    <p class="boundary"><b>${escapeHtml(BOUNDARY.ja)}</b>${escapeHtml(BOUNDARY.en)}</p>
  </div>
</body>
</html>`;
}
