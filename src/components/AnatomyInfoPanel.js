import { el } from '../utils/dom.js';

/**
 * Selection card for atlas-style scenes. The scene owns anatomical identity;
 * this component only renders it and offers authored camera viewpoints.
 */
export function createAnatomyInfoPanel(scene, { onView, onColorMode } = {}) {
  const swatch = el('span', { class: 'anatomy-selection-swatch', 'aria-hidden': 'true' });
  const titleEn = el('strong', { class: 'anatomy-name lang-en', text: 'Select a structure' });
  const titleJa = el('strong', { class: 'anatomy-name lang-ja', text: '部位を選択してください' });
  const locationEn = el('span', { class: 'anatomy-location lang-en', text: 'Point to preview · click or tap to select' });
  const locationJa = el('span', { class: 'anatomy-location lang-ja', text: '触れて確認・クリック／タップで選択' });
  const bodyEn = el('p', {
    class: 'anatomy-copy lang-en',
    text: 'Rotate and zoom freely. Move the anatomical-layer slider to reveal structures in place.',
  });
  const bodyJa = el('p', {
    class: 'anatomy-copy lang-ja',
    text: '自由に回転・拡大できます。解剖レイヤーで本来の位置にある深部構造を表示します。',
  });
  const countEn = el('span', { class: 'anatomy-count lang-en', text: 'Loading atlas…' });
  const countJa = el('span', { class: 'anatomy-count lang-ja', text: 'アトラスを読み込み中…' });
  const noteEn = el('p', { class: 'anatomy-note lang-en', text: '' });
  const noteJa = el('p', { class: 'anatomy-note lang-ja', text: '' });
  noteEn.hidden = true;
  noteJa.hidden = true;

  const modes = scene.getAnatomyColorModes?.() ?? [];
  const setActiveMode = (id) => {
    for (const [index, mode] of modes.entries()) {
      modeButtons[index].classList.toggle('is-active', mode.id === id);
      modeButtons[index].setAttribute('aria-pressed', String(mode.id === id));
    }
  };
  const modeButtons = modes.map((mode) => el('button', {
    class: `anatomy-mode${mode.id === scene.getAnatomyColorMode?.() ? ' is-active' : ''}`,
    type: 'button',
    'aria-pressed': String(mode.id === scene.getAnatomyColorMode?.()),
    title: `${mode.label} — ${mode.labelJa}`,
    on: {
      click: () => {
        scene.setAnatomyColorMode?.(mode.id);
        const activeMode = scene.getAnatomyColorMode?.() ?? mode.id;
        setActiveMode(activeMode);
        onColorMode?.(activeMode);
      },
    },
  }, [
    el('span', {
      class: `anatomy-mode-preview is-${mode.id}`,
      'aria-hidden': 'true',
    }),
    el('span', { class: 'anatomy-mode-name' }, [
      el('span', { class: 'lang-en', text: mode.label }),
      el('span', { class: 'lang-ja', text: mode.labelJa }),
    ]),
    el('span', {
      class: 'anatomy-mode-check',
      'aria-hidden': 'true',
      text: '✓',
    }),
  ]));

  const modeControl = modeButtons.length
    ? el('div', { class: 'anatomy-mode-control' }, [
        el('div', { class: 'anatomy-control-label' }, [
          el('span', { class: 'lang-en', text: 'Colour display' }),
          el('span', { class: 'lang-ja', text: '配色' }),
        ]),
        el('div', {
          class: 'anatomy-modes',
          role: 'group',
          'aria-label': 'Colour display / 配色',
        }, modeButtons),
      ])
    : null;

  const views = scene.getAnatomyViews?.() ?? [];
  const clearActiveView = () => {
    for (const peer of viewButtons) {
      peer.classList.remove('is-active');
      peer.setAttribute('aria-pressed', 'false');
    }
  };
  const setActiveView = (id) => {
    clearActiveView();
    const index = views.findIndex((view) => view.id === id);
    if (index < 0) return;
    viewButtons[index].classList.add('is-active');
    viewButtons[index].setAttribute('aria-pressed', 'true');
  };
  const applyView = (id) => {
    if (!views.some((view) => view.id === id)) return false;
    scene.setAnatomyView?.(id);
    setActiveView(id);
    return true;
  };
  const viewButtons = views.map((view, index) => {
    const button = el('button', {
      class: `anatomy-view${index === 0 ? ' is-active' : ''}`,
      type: 'button',
      'aria-pressed': String(index === 0),
      title: `${view.label} — ${view.labelJa}`,
      on: {
        click: () => {
          applyView(view.id);
          onView?.(view.id);
        },
      },
    }, [
      el('span', { class: 'lang-en', text: view.label }),
      el('span', { class: 'lang-ja', text: view.labelJa }),
    ]);
    return button;
  });

  const element = el('section', { class: 'panel anatomy-info', role: 'status', 'aria-live': 'polite' }, [
    el('div', { class: 'anatomy-heading-row' }, [
      swatch,
      el('div', { class: 'anatomy-heading' }, [titleEn, titleJa, locationEn, locationJa]),
    ]),
    bodyEn,
    bodyJa,
    noteEn,
    noteJa,
    modeControl,
    viewButtons.length
      ? el('div', { class: 'anatomy-views', role: 'group', 'aria-label': 'Anatomical view' }, viewButtons)
      : null,
    el('div', { class: 'anatomy-footer' }, [
      countEn,
      countJa,
      el('span', {
        class: 'anatomy-grade lang-en',
        text: 'Gross-anatomy teaching model · deep atlas structures approximate',
      }),
      el('span', {
        class: 'anatomy-grade lang-ja',
        text: '肉眼解剖の学習用モデル・深部アトラス構造は近似',
      }),
      el('a', {
        class: 'anatomy-source',
        href: 'https://github.com/itayinbarr/brainproject#attribution--licence',
        target: '_blank',
        rel: 'noreferrer',
      }, [
        el('span', { class: 'lang-en', text: 'Model source & licence ↗' }),
        el('span', { class: 'lang-ja', text: 'モデル出典・ライセンス ↗' }),
      ]),
    ]),
  ]);

  const update = (selection) => {
    if (!selection) {
      titleEn.textContent = 'Select a structure';
      titleJa.textContent = '部位を選択してください';
      locationEn.textContent = 'Point to preview · click or tap to select';
      locationJa.textContent = '触れて確認・クリック／タップで選択';
      bodyEn.textContent = 'Rotate and zoom freely. Move the anatomical-layer slider to reveal structures in place.';
      bodyJa.textContent = '自由に回転・拡大できます。解剖レイヤーで本来の位置にある深部構造を表示します。';
      noteEn.hidden = true;
      noteJa.hidden = true;
      swatch.style.removeProperty('--anatomy-color');
      return;
    }
    titleEn.textContent = selection.name;
    titleJa.textContent = selection.nameJa;
    locationEn.textContent = selection.breadcrumb ?? `${selection.side} · ${selection.region} · ${selection.categoryName}`;
    locationJa.textContent = selection.breadcrumbJa ?? `${selection.sideJa}・${selection.regionJa}・${selection.categoryNameJa}`;
    bodyEn.textContent = selection.description;
    bodyJa.textContent = selection.descriptionJa;
    noteEn.textContent = selection.note ?? '';
    noteJa.textContent = selection.noteJa ?? '';
    noteEn.hidden = !selection.note;
    noteJa.hidden = !selection.noteJa;
    if (selection.color) swatch.style.setProperty('--anatomy-color', selection.color);
  };

  const updateStatus = (status) => {
    if (status.state === 'error') {
      countEn.textContent = 'Atlas could not be loaded';
      countJa.textContent = 'アトラスを読み込めませんでした';
      return;
    }
    if (status.state === 'ready') {
      countEn.textContent = `${status.selectableCount} selectable structures · hover previews, click pins`;
      countJa.textContent = `${status.selectableCount}部位・触れて確認、クリックで固定`;
      return;
    }
    countEn.textContent = 'Loading atlas…';
    countJa.textContent = 'アトラスを読み込み中…';
  };

  let selected = scene.getAnatomySelection();
  let hovered = scene.getAnatomyHover?.() ?? null;
  const renderSelection = () => update(hovered ?? selected);
  renderSelection();
  updateStatus(scene.getAnatomyStatus?.() ?? { state: 'ready', selectableCount: scene.selectables?.length ?? 0 });
  const unsubscribeSelection = scene.onAnatomySelection((value) => {
    selected = value;
    renderSelection();
    if (value?.preferredView) {
      applyView(value.preferredView);
      onView?.(value.preferredView);
    }
  });
  const unsubscribeHover = scene.onAnatomyHover?.((value) => {
    hovered = value;
    renderSelection();
  });
  const unsubscribeStatus = scene.onAnatomyStatus?.(updateStatus);
  scene.viewer?.controls?.addEventListener('start', clearActiveView);
  onColorMode?.(scene.getAnatomyColorMode?.());
  return {
    element,
    setView: applyView,
    dispose() {
      unsubscribeSelection?.();
      unsubscribeHover?.();
      unsubscribeStatus?.();
      scene.viewer?.controls?.removeEventListener('start', clearActiveView);
    },
  };
}
