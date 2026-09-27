import { el } from '../utils/dom.js';

/**
 * Japanese is the product's language, not a translation of an English one:
 * it is the default, and it is shown on its own. English is here for the
 * people who need it, one click away — never stacked under every Japanese
 * line, which is what made the UI read as a localised import.
 */
const MODES = [
  { id: 'ja', label: '日本語', short: '日本語' },
  { id: 'en', label: 'English', short: 'EN' },
];

const STORAGE_KEY = 'medical-3d-lab:lang';

/**
 * Language switch. The UI renders both languages up front and CSS hides one,
 * so switching costs nothing and nothing needs re-rendering.
 *
 * @param {(mode: string) => void} onChange
 */
export function createLanguageToggle(onChange) {
  let index = Math.max(0, MODES.findIndex((mode) => mode.id === readStored()));

  // Both languages on the button, the one on screen marked. A button reading
  // only 日本語 in a Japanese interface reads as a label for the current state,
  // not as the way to English — a reader has no reason to press it, and the
  // one reader who needs it is the one who cannot read the rest of the page.
  const element = el('button', {
    class: 'ui-toggle is-language',
    type: 'button',
    title: 'Language / 表示言語',
    on: {
      click: () => {
        index = (index + 1) % MODES.length;
        apply();
      },
    },
  });

  function paint() {
    const mode = MODES[index];
    const other = MODES[(index + 1) % MODES.length];
    element.replaceChildren(
      ...MODES.flatMap((option, at) => [
        at ? el('span', { class: 'ui-toggle-separator', 'aria-hidden': 'true', text: '/' }) : null,
        el('span', {
          class: `ui-toggle-option${option.id === mode.id ? ' is-current' : ''}`,
          lang: option.id,
          text: option.short,
        }),
      ]).filter(Boolean)
    );
    // Said in the language being switched *to* as well, so the reader who
    // needs the switch can read what it does.
    element.setAttribute(
      'aria-label',
      mode.id === 'ja' ? `表示言語: 日本語 — Switch to ${other.label}` : `Language: English — ${other.label}に切り替え`
    );
    element.dataset.lang = mode.id;
  }
  paint();

  function apply() {
    const mode = MODES[index];
    paint();
    // The visible copy and the document language must change together. Keeping
    // <html lang> on English while the Japanese layer is shown makes assistive
    // technology pronounce the whole interface with the wrong language rules.
    document.documentElement?.setAttribute('lang', mode.id);
    try {
      localStorage.setItem(STORAGE_KEY, mode.id);
    } catch {
      // Private browsing modes can refuse storage; the toggle still works.
    }
    onChange(mode.id);
  }

  return {
    element,
    /** Push the stored preference out on startup. */
    init: apply,
  };
}

function readStored() {
  try {
    // 'both' was the old default; anyone carrying it comes back to Japanese.
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'ja';
  } catch {
    return 'ja';
  }
}
