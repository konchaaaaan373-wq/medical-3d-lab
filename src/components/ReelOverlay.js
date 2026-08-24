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
 */
export function createReelOverlay() {
  const scrim = el('div', { class: 'reel-scrim' });

  const title = el('h1', { class: 'reel-title' });
  const subtitle = el('p', { class: 'reel-subtitle' });
  const centre = el('div', { class: 'reel-centre' }, [title, subtitle]);

  const cards = {
    normal: createCard('normal'),
    hfref: createCard('hfref'),
  };
  const cardRow = el('div', { class: 'reel-cards' }, [cards.normal.element, cards.hfref.element]);

  const marker = el('div', { class: 'reel-marker' }, [
    el('span', { class: 'reel-marker-tag' }),
    el('span', { class: 'reel-marker-label' }),
  ]);

  const residual = el('div', { class: 'reel-residual' }, [
    el('span', { class: 'reel-residual-dot' }),
    el('span', { class: 'reel-residual-text' }),
  ]);

  const caption = el('p', { class: 'reel-caption' });
  const note = el('p', { class: 'reel-note' });

  const safe = el('div', { class: 'reel-safe' }, [
    cardRow,
    marker,
    residual,
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

    /** @param {ReturnType<import('../scenes/heartFailure/reelStoryboard.js').overlayAt>} frame */
    render(frame) {
      setText(title, frame.title.text);
      setOpacity(title, frame.title.opacity);
      title.dataset.variant = frame.title.variant;
      // The hook's headline needs contrast against the beating hearts behind it.
      setOpacity(scrim, frame.title.variant === 'hook' ? frame.title.opacity * 0.6 : 0);

      setText(subtitle, frame.subtitle.text);
      setOpacity(subtitle, frame.subtitle.opacity);

      setOpacity(cardRow, frame.cards.opacity);
      cards.normal.update(frame.cards.normal);
      cards.hfref.update(frame.cards.hfref);

      const showEd = frame.endDiastole.opacity >= frame.endSystole.opacity;
      const active = showEd ? frame.endDiastole : frame.endSystole;
      setText(marker.firstChild, active.text);
      setText(marker.lastChild, active.sub);
      setOpacity(marker, Math.max(frame.endDiastole.opacity, frame.endSystole.opacity));

      setText(residual.lastChild, frame.residual.text);
      setOpacity(residual, frame.residual.opacity);

      setText(caption, frame.caption.text);
      setOpacity(caption, frame.caption.opacity);

      setText(note, frame.note.text);
      setOpacity(note, frame.note.opacity);
    },
  };

  function createCard(variant) {
    const label = el('span', { class: 'reel-card-label' });
    const ef = el('span', { class: 'reel-card-ef' });
    const volumes = el('span', { class: 'reel-card-volumes' });
    const node = el('div', { class: `reel-card is-${variant}` }, [
      label,
      el('span', { class: 'reel-card-ef-row' }, [
        el('span', { class: 'reel-card-ef-key', text: 'EF' }),
        ef,
        el('span', { class: 'reel-card-ef-unit', text: '%' }),
      ]),
      volumes,
    ]);
    return {
      element: node,
      update(data) {
        setText(label, data.label);
        setText(ef, String(data.ef));
        // EDV / ESV only — SV, CO and wall thickness stay in the interactive UI.
        setText(volumes, `EDV ${data.edv} mL\nESV ${data.esv} mL`);
      },
    };
  }
}

let keyCounter = 0;
const keys = new WeakMap();
function nodeKey(node) {
  if (!keys.has(node)) keys.set(node, `n${keyCounter++}`);
  return keys.get(node);
}
