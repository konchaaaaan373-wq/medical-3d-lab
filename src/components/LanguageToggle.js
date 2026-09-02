import { el } from '../utils/dom.js';

/**
 * Japanese is the product's language, not a translation of an English one:
 * it is the default, and it is shown on its own. English is here for the
 * people who need it, one click away — never stacked under every Japanese
 * line, which is what made the UI read as a localised import.
 */
const MODES = [
  { id: 'ja', label: '日本語' },
  { id: 'en', label: 'English' },
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

  const element = el('button', {
    class: 'ui-toggle',
    type: 'button',
    title: 'Language / 表示言語',
    text: MODES[index].label,
    on: {
      click: () => {
        index = (index + 1) % MODES.length;
        apply();
      },
    },
  });

  function apply() {
    const mode = MODES[index];
    element.textContent = mode.label;
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
