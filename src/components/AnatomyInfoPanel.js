import { el } from '../utils/dom.js';

/**
 * Selection card for atlas-style scenes. The scene owns anatomical identity;
 * this component only renders it and offers authored camera viewpoints.
 */
export function createAnatomyInfoPanel(scene, { onView } = {}) {
  const titleEn = el('strong', { class: 'anatomy-name lang-en', text: 'Select a structure' });
  const titleJa = el('strong', { class: 'anatomy-name lang-ja', text: '部位を選択してください' });
  const locationEn = el('span', { class: 'anatomy-location lang-en', text: 'Click or tap the brain' });
  const locationJa = el('span', { class: 'anatomy-location lang-ja', text: '脳をクリック／タップ' });
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
  const viewButtons = views.map((view, index) => {
    const button = el('button', {
      class: `anatomy-view${index === 0 ? ' is-active' : ''}`,
      type: 'button',
      'aria-pressed': String(index === 0),
      title: `${view.label} — ${view.labelJa}`,
      on: {
        click: () => {
          setActiveView(view.id);
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
    el('div', { class: 'anatomy-heading' }, [titleEn, titleJa, locationEn, locationJa]),
    bodyEn,
    bodyJa,
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
      locationEn.textContent = 'Click or tap the brain';
      locationJa.textContent = '脳をクリック／タップ';
      bodyEn.textContent = 'Rotate and zoom freely. Move the anatomical-layer slider to reveal structures in place.';
      bodyJa.textContent = '自由に回転・拡大できます。解剖レイヤーで本来の位置にある深部構造を表示します。';
      return;
    }
    titleEn.textContent = selection.name;
    titleJa.textContent = selection.nameJa;
    locationEn.textContent = `${selection.side} · ${selection.region} · ${selection.categoryName}`;
    locationJa.textContent = `${selection.sideJa}・${selection.regionJa}・${selection.categoryNameJa}`;
    bodyEn.textContent = selection.description;
    bodyJa.textContent = selection.descriptionJa;
  };

  const updateStatus = (status) => {
    if (status.state === 'error') {
      countEn.textContent = 'Atlas could not be loaded';
      countJa.textContent = 'アトラスを読み込めませんでした';
      return;
    }
    if (status.state === 'ready') {
      countEn.textContent = `${status.selectableCount} selectable structures`;
      countJa.textContent = `${status.selectableCount}部位を個別に選択可能`;
      return;
    }
    countEn.textContent = 'Loading atlas…';
    countJa.textContent = 'アトラスを読み込み中…';
  };

  update(scene.getAnatomySelection());
  updateStatus(scene.getAnatomyStatus?.() ?? { state: 'ready', selectableCount: scene.selectables?.length ?? 0 });
  const unsubscribeSelection = scene.onAnatomySelection(update);
  const unsubscribeStatus = scene.onAnatomyStatus?.(updateStatus);
  scene.viewer?.controls?.addEventListener('start', clearActiveView);
  return {
    element,
    setView: setActiveView,
    dispose() {
      unsubscribeSelection?.();
      unsubscribeStatus?.();
      scene.viewer?.controls?.removeEventListener('start', clearActiveView);
    },
  };
}
