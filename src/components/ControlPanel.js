import { el, ICONS } from '../utils/dom.js';

/** Social-friendly export sizes. Rendered off-screen, so the window can stay any size. */
export const CAPTURE_PRESETS = [
  { id: 'view', label: 'Current view', labelJa: '現在の画面', size: null },
  { id: 'portrait', label: '1080 × 1350 (4:5)', labelJa: '縦 4:5', size: { width: 1080, height: 1350 } },
  { id: 'square', label: '1080 × 1080 (1:1)', labelJa: '正方形 1:1', size: { width: 1080, height: 1080 } },
  { id: 'wide', label: '1920 × 1080 (16:9)', labelJa: '横 16:9', size: { width: 1920, height: 1080 } },
];

/**
 * Progression slider + transport buttons + the educational disclaimer.
 *
 * @param {{
 *   meta: any,
 *   onSeek: (value: number) => void,
 *   onToggle: () => void,
 *   onReset: () => void,
 *   onResetView: () => void,
 *   onCapture: (preset: typeof CAPTURE_PRESETS[number]) => void,
 *   onStoryToggle: (enabled: boolean) => void,
 * }} options
 */
export function createControlPanel({
  meta,
  onSeek,
  onToggle,
  onReset,
  onResetView,
  onCapture,
  onStoryToggle,
  onCompareToggle,
}) {
  const slider = el('input', {
    class: 'slider',
    type: 'range',
    min: '0',
    max: '1000',
    step: '1',
    value: '0',
    // Not "disease progression": these scenes model a physical process
    // (aggregation, remodelling), not clinical severity.
    'aria-label': meta.progressLabel?.label ?? 'Model progression',
    on: { input: (event) => onSeek(Number(event.target.value) / 1000) },
  });

  const playButton = button('play', ['Play', '再生'], onToggle, 'primary');
  const storyButton = button('story', ['Story', 'ストーリー'], () => {
    const enabled = storyButton.element.classList.toggle('is-on');
    storyButton.element.setAttribute('aria-pressed', String(enabled));
    onStoryToggle(enabled);
  });
  storyButton.element.setAttribute('aria-pressed', 'false');
  storyButton.element.title = 'Story mode — pause on each stage and move the camera';

  // Only scenes that implement a comparison get the button.
  const compareButton = onCompareToggle
    ? button('compare', [meta.comparison?.label ?? 'Compare', meta.comparison?.labelJa ?? '比較'], () => {
        const enabled = compareButton.element.classList.toggle('is-on');
        compareButton.element.setAttribute('aria-pressed', String(enabled));
        onCompareToggle(enabled);
      })
    : null;
  if (compareButton) {
    compareButton.element.setAttribute('aria-pressed', 'false');
    compareButton.element.title = meta.comparison?.hint ?? 'Compare with a normal state';
  }

  const capture = createCaptureButton(onCapture);

  const element = el('div', { class: 'controls' }, [
    el('div', { class: 'slider-row' }, [
      el('span', { class: 'slider-cap' }, [
        el('span', { class: 'lang-en', text: meta.range?.start ?? '' }),
        el('span', { class: 'lang-ja', text: meta.range?.startJa ?? '' }),
      ]),
      slider,
      el('span', { class: 'slider-cap' }, [
        el('span', { class: 'lang-en', text: meta.range?.end ?? '' }),
        el('span', { class: 'lang-ja', text: meta.range?.endJa ?? '' }),
      ]),
    ]),
    el('div', { class: 'button-row' }, [
      playButton.element,
      button('reset', ['Reset', 'リセット'], onReset).element,
      button('frame', ['View', '視点'], onResetView).element,
      storyButton.element,
      compareButton?.element,
      capture.element,
    ]),
    // The notice must always be visible, so a shorter wording is swapped in on
    // narrow screens rather than the notice being dropped.
    el('p', { class: 'disclaimer' }, [
      el('span', { class: 'disclaimer-full lang-ja', text: `⚠︎ ${meta.disclaimerJa}` }),
      el('span', { class: 'disclaimer-full disclaimer-en lang-en', text: meta.disclaimer }),
      el('span', { class: 'disclaimer-short lang-ja', text: `⚠︎ ${meta.disclaimerShortJa ?? meta.disclaimerJa}` }),
      el('span', { class: 'disclaimer-short disclaimer-en lang-en', text: meta.disclaimerShort ?? meta.disclaimer }),
    ]),
  ]);

  return {
    element,
    /** Lets the app keep the button in sync with a keyboard shortcut. */
    setComparison(enabled) {
      if (!compareButton) return;
      compareButton.element.classList.toggle('is-on', enabled);
      compareButton.element.setAttribute('aria-pressed', String(enabled));
    },
    update(progress, playing) {
      // Do not fight the user while they are dragging the handle.
      if (document.activeElement !== slider) slider.value = String(Math.round(progress * 1000));
      playButton.setIcon(playing ? 'pause' : 'play');
      playButton.setLabel(playing ? ['Pause', '一時停止'] : ['Play', '再生']);
    },
  };
}

/** PNG button with a small popover of export sizes. */
function createCaptureButton(onCapture) {
  const menu = el(
    'div',
    { class: 'capture-menu', role: 'menu' },
    CAPTURE_PRESETS.map((preset) =>
      el('button', {
        class: 'capture-option',
        type: 'button',
        role: 'menuitem',
        on: {
          click: () => {
            close();
            onCapture(preset);
          },
        },
      }, [
        el('span', { class: 'lang-en', text: preset.label }),
        el('span', { class: 'capture-option-ja lang-ja', text: preset.labelJa }),
      ])
    )
  );

  const trigger = button('camera', ['PNG', '画像'], () => toggle());
  trigger.element.classList.add('has-menu');
  const element = el('div', { class: 'capture' }, [trigger.element, menu]);

  const onDocumentClick = (event) => {
    if (!element.contains(event.target)) close();
  };

  function open() {
    element.classList.add('is-open');
    document.addEventListener('click', onDocumentClick, true);
  }
  function close() {
    element.classList.remove('is-open');
    document.removeEventListener('click', onDocumentClick, true);
  }
  function toggle() {
    element.classList.contains('is-open') ? close() : open();
  }

  return { element };
}

/**
 * @param {string} iconName
 * @param {[string, string]} labels [English, Japanese] — both are rendered and CSS picks one
 */
function button(iconName, labels, onClick, variant = '') {
  const iconSpan = el('span', { class: 'btn-icon', html: ICONS[iconName] });
  const labelEn = el('span', { class: 'btn-label lang-en', text: labels[0] });
  const labelJa = el('span', { class: 'btn-label lang-ja', text: labels[1] });
  const element = el(
    'button',
    { class: `btn ${variant}`.trim(), type: 'button', title: labels[0], on: { click: onClick } },
    [iconSpan, labelEn, labelJa]
  );
  return {
    element,
    setIcon: (name) => {
      iconSpan.innerHTML = ICONS[name];
    },
    setLabel: ([en, ja]) => {
      labelEn.textContent = en;
      labelJa.textContent = ja;
      element.title = en;
    },
  };
}
