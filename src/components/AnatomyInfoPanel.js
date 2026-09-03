import { el } from '../utils/dom.js';

/**
 * Selection card for atlas-style scenes. The scene owns anatomical identity;
 * this component only renders what is pointed at or pinned. Camera and display
 * choices live in the shared inspection surface used by every model.
 */
export function createAnatomyInfoPanel(scene, { onPreferredView } = {}) {
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

  const element = el('section', { class: 'panel anatomy-info', role: 'status', 'aria-live': 'polite' }, [
    el('div', { class: 'anatomy-heading-row' }, [
      swatch,
      el('div', { class: 'anatomy-heading' }, [titleEn, titleJa, locationEn, locationJa]),
    ]),
    bodyEn,
    bodyJa,
    noteEn,
    noteJa,
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
    if (value?.preferredView) onPreferredView?.(value.preferredView);
  });
  const unsubscribeHover = scene.onAnatomyHover?.((value) => {
    hovered = value;
    renderSelection();
  });
  const unsubscribeStatus = scene.onAnatomyStatus?.(updateStatus);
  return {
    element,
    dispose() {
      unsubscribeSelection?.();
      unsubscribeHover?.();
      unsubscribeStatus?.();
    },
  };
}
