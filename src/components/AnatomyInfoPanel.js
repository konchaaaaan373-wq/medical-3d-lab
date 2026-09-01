import { el } from '../utils/dom.js';

export function createAnatomyInfoPanel(scene) {
  const titleEn = el('strong', { class: 'anatomy-name lang-en', text: 'Select a structure' });
  const titleJa = el('strong', { class: 'anatomy-name lang-ja', text: '部位を選択してください' });
  const sideEn = el('span', { class: 'anatomy-side lang-en', text: 'Click or tap the brain' });
  const sideJa = el('span', { class: 'anatomy-side lang-ja', text: '脳をクリック／タップ' });
  const bodyEn = el('p', { class: 'anatomy-copy lang-en', text: 'Rotate and zoom freely. Move the dissection slider to reveal deeper structures.' });
  const bodyJa = el('p', { class: 'anatomy-copy lang-ja', text: '自由に回転・拡大できます。解剖展開スライダーで深部構造を表示します。' });
  const element = el('section', { class: 'panel anatomy-info', role: 'status', 'aria-live': 'polite' }, [
    el('div', { class: 'anatomy-heading' }, [titleEn, titleJa, sideEn, sideJa]), bodyEn, bodyJa,
  ]);

  const update = (selection) => {
    if (!selection) return;
    titleEn.textContent = selection.name;
    titleJa.textContent = selection.nameJa;
    sideEn.textContent = selection.side;
    sideJa.textContent = selection.sideJa;
    bodyEn.textContent = selection.description;
    bodyJa.textContent = selection.descriptionJa;
  };
  update(scene.getAnatomySelection());
  return { element, dispose: scene.onAnatomySelection(update) };
}
