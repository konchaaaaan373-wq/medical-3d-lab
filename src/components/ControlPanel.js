import { el, ICONS } from '../utils/dom.js';

/** Social-friendly export sizes. Rendered off-screen, so the window can stay any size. */
export const CAPTURE_PRESETS = [
  { id: 'view', label: 'Current view', labelJa: '現在の画面', size: null },
  { id: 'reel', label: 'Reel / Shorts 1080 × 1920', labelJa: 'リール 9:16', size: { width: 1080, height: 1920 } },
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
 *   onLearn?: () => void,
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
  onReel,
  onLearn,
  onDataToggle,
  onZoom,
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

  // Not "Play": the heart beats on its own the whole time, and calling this
  // Play made two different clocks look like one. This one steps the *other*
  // axis — the remodelling trajectory — from Normal to HFrEF.
  const playButton = button('play', ['Progression', '進行'], onToggle, 'utility');
  playButton.element.title = 'Step through the remodelling stages automatically. The heart beats regardless.';

  // Only scenes that ship a guided sequence get the button.
  const storyButton = onStoryToggle
    ? button('story', [meta.story?.label ?? 'Story', meta.story?.labelJa ?? 'ストーリー'], () => {
        const enabled = storyButton.element.classList.toggle('is-on');
        storyButton.element.setAttribute('aria-pressed', String(enabled));
        onStoryToggle(enabled);
      })
    : null;
  if (storyButton) {
    storyButton.element.setAttribute('aria-pressed', 'false');
    storyButton.element.classList.add('primary');
    storyButton.element.title = meta.story?.hint ?? 'Guided sequence — remodelling, then inside one failing beat';
  }

  // Only scenes that implement a comparison get the button.
  const compareButton = onCompareToggle
    ? button('compare', [meta.comparison?.label ?? 'Compare', meta.comparison?.labelJa ?? '比較'], () => {
        const enabled = compareButton.element.classList.toggle('is-on');
        compareButton.element.setAttribute('aria-pressed', String(enabled));
        onCompareToggle(enabled);
      })
    : null;
  if (compareButton) {
    compareButton.element.classList.add('secondary');
    compareButton.element.setAttribute('aria-pressed', 'false');
    compareButton.element.title = meta.comparison?.hint ?? 'Compare with a normal state';
  }

  // Only scenes that ship guided lessons get the button.
  const learnButton = onLearn
    ? button('learn', [meta.learning?.label ?? 'Lesson', meta.learning?.labelJa ?? 'レッスン'], onLearn, 'utility')
    : null;
  if (learnButton) learnButton.element.title = meta.learning?.hint ?? 'Guided lesson';

  // Learning view is the default; this reveals the plots, the read-out and the
  // loading sliders without taking the 3D away.
  const dataButton = onDataToggle
    ? button('data', ['Data', 'データ'], () => {
        const enabled = dataButton.element.classList.toggle('is-on');
        dataButton.element.setAttribute('aria-pressed', String(enabled));
        onDataToggle(enabled);
      }, 'secondary')
    : null;
  if (dataButton) {
    dataButton.element.setAttribute('aria-pressed', 'false');
    dataButton.element.title = 'Pressure-volume loop, waveforms, read-out and loading conditions';
  }

  // Only scenes that ship a social sequence get the button.
  const reelButton = onReel
    ? button('reel', [meta.reel?.label ?? 'Reel', meta.reel?.labelJa ?? 'リール'], onReel, 'utility')
    : null;
  if (reelButton) reelButton.element.title = meta.reel?.hint ?? '15-second social sequence';

  /**
   * One camera control: out, back to the authored framing, in.
   *
   * Orbit controls already zoom on scroll and pinch, but neither is
   * discoverable and neither is obvious on a trackpad. The scene frames itself
   * for the ventricle and lets the top of the aortic arch crop, which is the
   * right default for a scene about the ventricle — but how much of the picture
   * someone wants is theirs to decide. Out for the surrounding vessels; in to
   * push everything but the chamber out of frame, which is what explaining one
   * point to one person wants.
   *
   * The three are joined and icon-only, in the arrangement a map uses: the
   * recentre control between the two zooms. That also buys back the width the
   * pair costs, so the row still fits on one line.
   */
  const frameButton = button('frame', ['View', '視点'], onResetView, 'utility');
  frameButton.element.title = 'Back to the framing the scene sets (also resets the zoom)';
  const zoomOutButton = onZoom ? button('zoomOut', ['Zoom out', '縮小'], () => onZoom(-1), 'utility') : null;
  const zoomInButton = onZoom ? button('zoomIn', ['Zoom in', '拡大'], () => onZoom(1), 'utility') : null;
  const cameraGroup = onZoom
    ? el('span', { class: 'camera-group' }, [zoomOutButton.element, frameButton.element, zoomInButton.element])
    : frameButton.element;
  if (onZoom) {
    for (const b of [zoomOutButton, frameButton, zoomInButton]) b.element.classList.add('compact');
    zoomOutButton.element.title = 'Zoom out — see more of the surrounding vessels (−)';
    zoomInButton.element.title = 'Zoom in — fill the frame with the chamber (+)';
  }

  const capture = createCaptureButton(onCapture);

  const element = el('div', { class: 'controls' }, [
    // The continuous slider interpolates between stages. It is a model
    // parameter, not a clinical index, so it belongs with the other model
    // inputs in Data view rather than under the stage headline.
    el('div', { class: 'slider-row data-only' }, [
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
    // Ordered by weight: the guided sequence first, then the two ways of
    // looking wider, then the utilities.
    el('div', { class: 'button-row' }, [
      storyButton?.element,
      compareButton?.element,
      dataButton?.element,
      el('span', { class: 'button-gap' }),
      playButton.element,
      button('reset', ['Reset', 'リセット'], onReset, 'utility').element,
      cameraGroup,
      learnButton?.element,
      reelButton?.element,
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
    setStory(enabled) {
      if (!storyButton) return;
      storyButton.element.classList.toggle('is-on', enabled);
      storyButton.element.setAttribute('aria-pressed', String(enabled));
    },
    setDataView(enabled) {
      if (!dataButton) return;
      dataButton.element.classList.toggle('is-on', enabled);
      dataButton.element.setAttribute('aria-pressed', String(enabled));
    },
    /**
     * Grey out whichever end of the zoom range has been reached, so pressing a
     * button that cannot do anything is visibly a no-op rather than a mystery.
     *
     * @param {{ canZoomIn: boolean, canZoomOut: boolean }} limits
     */
    setZoomLimits({ canZoomIn, canZoomOut }) {
      if (!onZoom) return;
      zoomInButton.element.classList.toggle('is-limit', !canZoomIn);
      zoomOutButton.element.classList.toggle('is-limit', !canZoomOut);
      zoomInButton.element.setAttribute('aria-disabled', String(!canZoomIn));
      zoomOutButton.element.setAttribute('aria-disabled', String(!canZoomOut));
    },
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
      playButton.setLabel(playing ? ['Pause', '一時停止'] : ['Progression', '進行']);
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
