import { el } from '../utils/dom.js';

/**
 * What the selected structure is: its description, the model's limits, and
 * where the model came from.
 *
 * The scene owns anatomical identity; this renders it. Camera and display
 * choices live in the shared inspection surface used by every model, and the
 * structure's *name* now belongs to the panel summary above this — a name that
 * scrolls away with the prose under it is a name a reader cannot use.
 *
 * ## A pinned selection wins over a hover
 *
 * This read `hovered ?? selected`, so moving the pointer across the model
 * replaced the description of the structure the reader had deliberately pinned
 * with whatever happened to be under the cursor on the way somewhere else.
 * Hover is a preview and previews only while nothing is pinned.
 *
 * @param {object} scene
 * @param {{onPreferredView?: (id:string) => void, heading?: boolean}} [options]
 */

/**
 * How a load state reads, in both languages.
 *
 * Exported because two surfaces say it and they must not drift apart: this
 * panel's footer, and the anatomy panel's summary, which is the one that is
 * always on screen. The footer alone was not enough — on an anatomy scene it
 * lives in the Detail tab, and only the open tab's content is in the DOM, so a
 * failed load announced nothing at all to a reader who had not gone looking.
 *
 * @param {{state?: string, selectableCount?: number}} status
 * @returns {{en: string, ja: string, ready: boolean}}
 */
export function anatomyStatusText(status) {
  if (status?.state === 'error') {
    return { en: 'Atlas could not be loaded', ja: 'アトラスを読み込めませんでした', ready: false };
  }
  if (status?.state === 'ready') {
    return {
      en: `${status.selectableCount} selectable structures`,
      ja: `${status.selectableCount}部位`,
      ready: true,
    };
  }
  return { en: 'Loading atlas…', ja: 'アトラスを読み込み中…', ready: false };
}

/**
 * @param {object} scene
 * @param {{onPreferredView?: (id:string) => void, heading?: boolean}} [options]
 *   `heading` renders the name and breadcrumb here as well; the anatomy panel
 *   turns it off because its summary already carries them.
 */
export function createAnatomyInfoPanel(scene, { onPreferredView, heading = true } = {}) {
  const swatch = el('span', { class: 'anatomy-selection-swatch', 'aria-hidden': 'true' });
  const titleEn = el('strong', { class: 'anatomy-name lang-en', text: 'Select a structure' });
  const titleJa = el('strong', { class: 'anatomy-name lang-ja', text: '部位を選択してください' });
  const locationEn = el('span', { class: 'anatomy-location lang-en', text: 'Select a structure on the model or in the list.' });
  const locationJa = el('span', { class: 'anatomy-location lang-ja', text: 'モデルまたは一覧から部位を選択してください。' });
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
    heading
      ? el('div', { class: 'anatomy-heading-row' }, [
          swatch,
          el('div', { class: 'anatomy-heading' }, [titleEn, titleJa, locationEn, locationJa]),
        ])
      : null,
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
      locationEn.textContent = 'Select a structure on the model or in the list.';
      locationJa.textContent = 'モデルまたは一覧から部位を選択してください。';
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
    const { en, ja } = anatomyStatusText(status);
    countEn.textContent = en;
    countJa.textContent = ja;
  };

  let selected = scene.getAnatomySelection();
  let hovered = scene.getAnatomyHover?.() ?? null;
  // Pinned first. See the note above: reading the hover first meant a pointer
  // crossing the model rewrote the card the reader had pinned.
  const renderSelection = () => update(selected ?? hovered);
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
