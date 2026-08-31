import { el } from '../utils/dom.js';

/**
 * Text layer for the social sequence.
 *
 * Rendered as plain DOM over the canvas rather than in WebGL: text stays crisp
 * at any pixel ratio, and the layout can respond to the chosen aspect with
 * ordinary CSS.
 *
 * The component owns no timing. It is handed a complete frame description each
 * tick and only writes what changed, so a 15-second sequence costs almost
 * nothing beyond the 3D render.
 *
 * It owns no *subject* either. The slots are generic — a headline, a subtitle,
 * up to two labelled cards of arbitrary rows, a marker, a badge, a caption and
 * a note — and which numbers go in them is the sequence's business. A card
 * carrying an ejection fraction and a card carrying an inspiratory capacity are
 * the same component with different rows.
 *
 * A frame:
 *
 *     {
 *       title: { text, opacity, variant },
 *       subtitle: { text, opacity },
 *       cards: { opacity, items: [{ label, headline?, headlineKey?,
 *                                   headlineUnit?, rows: [string] }] },
 *       marker: { text, sub, opacity },
 *       badge: { text, opacity },
 *       caption: { text, opacity },
 *       note: { text, opacity },
 *     }
 *
 * Every slot may be omitted; an absent slot renders as nothing.
 */
export function createReelOverlay() {
  const scrim = el('div', { class: 'reel-scrim' });

  const title = el('h1', { class: 'reel-title' });
  const subtitle = el('p', { class: 'reel-subtitle' });
  const centre = el('div', { class: 'reel-centre' }, [title, subtitle]);

  // Two card slots, because a comparison has two sides and social framing has
  // room for two. A sequence using one leaves the second empty.
  const cards = [createCard('normal'), createCard('hfref')];
  const cardRow = el('div', { class: 'reel-cards' }, cards.map((card) => card.element));

  const marker = el('div', { class: 'reel-marker' }, [
    el('span', { class: 'reel-marker-tag' }),
    el('span', { class: 'reel-marker-label' }),
  ]);

  // A small dotted tag beside the subject. Named for its shape rather than for
  // the one thing heart failure used it for.
  const badge = el('div', { class: 'reel-residual' }, [
    el('span', { class: 'reel-residual-dot' }),
    el('span', { class: 'reel-residual-text' }),
  ]);

  const caption = el('p', { class: 'reel-caption' });
  const note = el('p', { class: 'reel-note' });

  const safe = el('div', { class: 'reel-safe' }, [
    cardRow,
    marker,
    badge,
    centre,
    el('div', { class: 'reel-bottom' }, [caption, note]),
  ]);
  const element = el('div', { class: 'reel-frame' }, [scrim, safe]);

  // Only touch the DOM when something actually changes.
  const previous = new Map();
  const setText = (node, text) => {
    if (previous.get(node) === text) return;
    previous.set(node, text);
    node.textContent = text;
  };
  const setOpacity = (node, value) => {
    const rounded = value.toFixed(3);
    if (previous.get(`${nodeKey(node)}:o`) === rounded) return;
    previous.set(`${nodeKey(node)}:o`, rounded);
    node.style.opacity = rounded;
    node.style.visibility = value < 0.005 ? 'hidden' : 'visible';
  };

  return {
    element,

    /**
     * Draws one frame. Absent slots render as nothing rather than throwing, so
     * a sequence only supplies what it uses.
     */
    render(frame) {
      const slot = (value) => value ?? EMPTY;

      const titleSlot = slot(frame.title);
      setText(title, titleSlot.text ?? '');
      setOpacity(title, titleSlot.opacity ?? 0);
      title.dataset.variant = titleSlot.variant ?? 'hook';
      // The hook's headline needs contrast against whatever is moving behind it.
      setOpacity(scrim, titleSlot.variant === 'hook' ? (titleSlot.opacity ?? 0) * 0.6 : 0);

      const subtitleSlot = slot(frame.subtitle);
      setText(subtitle, subtitleSlot.text ?? '');
      setOpacity(subtitle, subtitleSlot.opacity ?? 0);

      const cardSlot = slot(frame.cards);
      setOpacity(cardRow, cardSlot.opacity ?? 0);
      cards.forEach((card, index) => card.update(cardSlot.items?.[index]));

      const markerSlot = slot(frame.marker);
      setText(marker.firstChild, markerSlot.text ?? '');
      setText(marker.lastChild, markerSlot.sub ?? '');
      setOpacity(marker, markerSlot.opacity ?? 0);

      const badgeSlot = slot(frame.badge);
      setText(badge.lastChild, badgeSlot.text ?? '');
      setOpacity(badge, badgeSlot.opacity ?? 0);

      const captionSlot = slot(frame.caption);
      setText(caption, captionSlot.text ?? '');
      setOpacity(caption, captionSlot.opacity ?? 0);

      const noteSlot = slot(frame.note);
      setText(note, noteSlot.text ?? '');
      setOpacity(note, noteSlot.opacity ?? 0);
    },
  };

  /**
   * One labelled card: a name, one large figure, and a few small rows under it.
   *
   * Generic on purpose. Heart failure fills it with EF and two volumes; a
   * respiratory sequence fills it with an inspiratory capacity and two more.
   * The component knows the shape and never the subject.
   */
  function createCard(variant) {
    const label = el('span', { class: 'reel-card-label' });
    const headlineKey = el('span', { class: 'reel-card-ef-key' });
    const headline = el('span', { class: 'reel-card-ef' });
    const headlineUnit = el('span', { class: 'reel-card-ef-unit' });
    const rows = el('span', { class: 'reel-card-volumes' });
    const node = el('div', { class: `reel-card is-${variant}` }, [
      label,
      el('span', { class: 'reel-card-ef-row' }, [headlineKey, headline, headlineUnit]),
      rows,
    ]);
    return {
      element: node,
      update(data) {
        if (!data) {
          setOpacity(node, 0);
          return;
        }
        setOpacity(node, 1);
        setText(label, data.label);
        setText(headlineKey, data.headlineKey ?? '');
        setText(headline, String(data.headline ?? ''));
        setText(headlineUnit, data.headlineUnit ?? '');
        // Small rows under the headline, one per line. What they are is the
        // sequence's choice; the card only lays them out.
        setText(rows, (data.rows ?? []).join('\n'));
      },
    };
  }
}

/** An absent slot. Frozen so a sequence cannot accidentally write through it. */
const EMPTY = Object.freeze({});

let keyCounter = 0;
const keys = new WeakMap();
function nodeKey(node) {
  if (!keys.has(node)) keys.set(node, `n${keyCounter++}`);
  return keys.get(node);
}
