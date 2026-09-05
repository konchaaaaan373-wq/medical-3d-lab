import { el, ICONS } from '../utils/dom.js';
import { BACKGROUND_PRESETS } from '../app/inspection.js';

/**
 * Display-only controls shared by every 3D scene.
 *
 * The component knows camera/display vocabulary and nothing about physiology.
 * Its callbacks are deliberately unable to seek progression or set a model
 * input; that boundary is the reason this surface can be mounted everywhere.
 */
export function createInspectionPanel({
  views,
  activeView,
  authoredViews = false,
  backgrounds = BACKGROUND_PRESETS,
  activeBackground,
  modes = [],
  activeMode,
  labelsVisible = true,
  onView,
  onBackground,
  onMode,
  onLabels,
  onReset,
  onClose,
}) {
  // App mounts exactly one inspection surface. A stable id keeps snapshots and
  // accessibility output deterministic.
  const panelId = 'spatial-inspection-panel';
  const titleId = 'inspection-panel-title';

  const viewButtons = views.map((view) => choiceButton({
    className: 'inspection-view',
    label: view.label,
    labelJa: view.labelJa,
    pressed: view.id === activeView,
    onClick: () => {
      if (onView?.(view.id) === false) return;
      setActive(viewButtons, views, view.id);
    },
  }));

  const backgroundButtons = backgrounds.map((preset) => {
    const button = choiceButton({
      className: 'inspection-background',
      label: preset.label,
      labelJa: preset.labelJa,
      pressed: preset.id === activeBackground,
      onClick: () => {
        if (onBackground?.(preset.id) === false) return;
        setActive(backgroundButtons, backgrounds, preset.id);
      },
      prefix: el('span', {
        class: 'inspection-background-swatch',
        style: `--inspection-swatch:${preset.swatch}`,
        'aria-hidden': 'true',
      }),
    });
    return button;
  });

  const modeButtons = modes.map((mode) => choiceButton({
    className: 'inspection-mode',
    label: mode.label,
    labelJa: mode.labelJa,
    pressed: mode.id === activeMode,
    onClick: () => {
      if (onMode?.(mode.id) === false) return;
      setActive(modeButtons, modes, mode.id);
    },
    prefix: mode.preview
      ? el('span', {
          class: 'inspection-mode-preview',
          style: `--inspection-preview:${mode.preview}`,
          'aria-hidden': 'true',
        })
      : null,
  }));

  const labelsButton = choiceButton({
    className: 'inspection-label-toggle',
    label: 'Structure labels',
    labelJa: '構造ラベル',
    pressed: labelsVisible,
    onClick: () => {
      const enabled = labelsButton.getAttribute('aria-pressed') !== 'true';
      onLabels?.(enabled);
      labelsButton.setAttribute('aria-pressed', String(enabled));
      labelsButton.classList.toggle('is-active', enabled);
    },
    prefix: el('span', { class: 'inspection-eye', html: ICONS.eye, 'aria-hidden': 'true' }),
  });

  const closeButton = el('button', {
    class: 'inspection-close',
    type: 'button',
    title: 'Close inspection controls',
    'aria-label': 'Close inspection controls / 観察設定を閉じる',
    text: '×',
    on: { click: () => onClose?.() },
  });

  const element = el('section', {
    id: panelId,
    class: 'panel inspection-panel',
    'aria-labelledby': titleId,
  }, [
    el('header', { class: 'inspection-header' }, [
      el('div', { class: 'inspection-title', id: titleId }, [
        el('strong', { class: 'lang-en', text: 'Spatial inspection' }),
        el('strong', { class: 'lang-ja', text: '空間を観察' }),
      ]),
      closeButton,
    ]),
    el('p', { class: 'inspection-intro' }, [
      el('span', { class: 'lang-en', text: 'Change only how the model is viewed. Medical values stay unchanged.' }),
      el('span', { class: 'lang-ja', text: '見え方だけを変更します。医学モデルの値は変わりません。' }),
    ]),
    section(
      authoredViews ? ['Anatomical views', '解剖学的視点'] : ['Model-relative views', 'モデル基準の視点'],
      el('div', { class: 'inspection-grid inspection-views', role: 'group', 'aria-label': 'Viewpoint / 視点' }, viewButtons)
    ),
    modeButtons.length
      ? section(
          ['Display mode', '表示方式'],
          el('div', { class: 'inspection-grid inspection-modes', role: 'group', 'aria-label': 'Display mode / 表示方式' }, modeButtons)
        )
      : null,
    section(
      ['Background', '背景'],
      el('div', { class: 'inspection-grid inspection-backgrounds', role: 'group', 'aria-label': 'Background / 背景' }, backgroundButtons)
    ),
    // The label toggle sits with the reset rather than under a heading of its
    // own. A section label above a single self-describing switch cost 53px of a
    // panel that had 262 to spend, which is what pushed Background off the
    // bottom of the rail on an ordinary desktop.
    el('div', { class: 'inspection-footer' }, [
      labelsButton,
      el('button', {
        class: 'inspection-reset',
        type: 'button',
        on: { click: () => onReset?.() },
      }, [
        el('span', { class: 'lang-en', text: 'Reset display' }),
        el('span', { class: 'lang-ja', text: '表示をリセット' }),
      ]),
    ]),
  ]);
  element.hidden = true;

  return {
    element,
    setOpen(open) {
      element.hidden = !open;
    },
    setView(id) {
      return setActive(viewButtons, views, id);
    },
    clearView() {
      clearActive(viewButtons);
    },
    setBackground(id) {
      return setActive(backgroundButtons, backgrounds, id);
    },
    setMode(id) {
      return setActive(modeButtons, modes, id);
    },
    setLabels(enabled) {
      labelsButton.setAttribute('aria-pressed', String(enabled));
      labelsButton.classList.toggle('is-active', enabled);
    },
  };
}

function section(labels, content) {
  return el('div', { class: 'inspection-section' }, [
    el('div', { class: 'inspection-section-label' }, [
      el('span', { class: 'lang-en', text: labels[0] }),
      el('span', { class: 'lang-ja', text: labels[1] }),
    ]),
    content,
  ]);
}

function choiceButton({ className, label, labelJa, pressed, onClick, prefix }) {
  return el('button', {
    class: `inspection-choice ${className}${pressed ? ' is-active' : ''}`,
    type: 'button',
    'aria-pressed': String(pressed),
    title: `${label} — ${labelJa}`,
    on: { click: onClick },
  }, [
    prefix,
    el('span', { class: 'inspection-choice-copy' }, [
      el('span', { class: 'lang-en', text: label }),
      el('span', { class: 'lang-ja', text: labelJa }),
    ]),
  ]);
}

function clearActive(buttons) {
  for (const button of buttons) {
    button.classList.remove('is-active');
    button.setAttribute('aria-pressed', 'false');
  }
}

function setActive(buttons, definitions, id) {
  const index = definitions.findIndex((definition) => definition.id === id);
  if (index < 0) return false;
  clearActive(buttons);
  buttons[index].classList.add('is-active');
  buttons[index].setAttribute('aria-pressed', 'true');
  return true;
}
