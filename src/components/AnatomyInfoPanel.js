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
 * @param {{onPreferredView?: (id:string) => void, heading?: boolean,
 *   attribution?: import('../catalog/attribution.js').SceneAttribution[]}} [options]
 *   `heading` renders the name and breadcrumb here as well; the anatomy panel
 *   turns it off because its summary already carries them.
 *
 *   `functionNote` is an optional reading of what the selected structure is
 *   for, supplied by the caller rather than looked up here: this panel serves
 *   every anatomy scene, only one of them has a function model behind it, and
 *   whether that model may be shown at all is a release decision the
 *   application owns. Given none, the section does not exist.
 *
 *   `attribution` is who to credit for the geometry, resolved from the asset
 *   records by `attributionForScene`. It used to be a literal link to one
 *   repository, which was right for the brain and wrong for every other scene
 *   this panel serves — the heart atlas rests on a HuBMAP CCF release and was
 *   crediting the Brain Project.
 */
export function createAnatomyInfoPanel(
  scene,
  { onPreferredView, heading = true, attribution = [], functionNote = null } = {}
) {
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

  // What the structure is for, when the caller has a model that can say.
  const functionTitleEn = el('strong', { class: 'anatomy-function-title lang-en', text: '' });
  const functionTitleJa = el('strong', { class: 'anatomy-function-title lang-ja', text: '' });
  const carriesEn = el('p', { class: 'anatomy-function-line lang-en', text: '' });
  const carriesJa = el('p', { class: 'anatomy-function-line lang-ja', text: '' });
  const ifLostEn = el('p', { class: 'anatomy-function-lost lang-en', text: '' });
  const ifLostJa = el('p', { class: 'anatomy-function-lost lang-ja', text: '' });
  const functionSourceEn = el('p', { class: 'anatomy-function-source lang-en', text: '' });
  const functionSourceJa = el('p', { class: 'anatomy-function-source lang-ja', text: '' });
  const functionSection = el('section', { class: 'anatomy-function' }, [
    functionTitleEn, functionTitleJa, carriesEn, carriesJa,
    ifLostEn, ifLostJa, functionSourceEn, functionSourceJa,
  ]);
  functionSection.hidden = true;

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
    functionNote ? functionSection : null,
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
      ...creditNodes(attribution),
    ]),
  ]);

  const renderFunction = (selection) => {
    if (!functionNote) return;
    const note = selection ? functionNote(selection) : null;
    functionSection.hidden = !note;
    if (!note) return;
    functionTitleEn.textContent = note.title;
    functionTitleJa.textContent = note.titleJa;
    carriesEn.textContent = note.carries.text;
    carriesJa.textContent = note.carries.textJa;
    ifLostEn.textContent = note.ifLost.text;
    ifLostJa.textContent = note.ifLost.textJa;
    functionSourceEn.textContent = note.source.text;
    functionSourceJa.textContent = note.source.textJa;
  };

  const update = (selection) => {
    renderFunction(selection);
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

/**
 * The credit line for each asset the scene draws.
 *
 * A released asset links to the record that discharges its attribution
 * obligation, not to the upstream page: the licence asks us to carry the
 * credit, and the file that carries it is the thing to point at.
 *
 * A candidate links to where the file came from and says it is under
 * examination. It deliberately does **not** name a licence — the record has
 * read one, the release gate has not assessed it, and printing an SPDX id here
 * would show a decision nobody has made.
 */
function creditNodes(attribution) {
  return (attribution ?? []).flatMap((entry) => {
    // `recordUrl`, not `record`: the second is a repository path and 404s.
    const href = entry.released ? entry.recordUrl ?? entry.sourceUrl : entry.sourceUrl;
    const label = entry.released
      ? {
          en: `${entry.sourceName}${entry.licenseName ? ` · ${entry.licenseName}` : ''} ↗`,
          ja: `${entry.sourceName}${entry.licenseName ? ` · ${entry.licenseName}` : ''} ↗`,
        }
      : {
          en: `Candidate asset under examination · ${entry.assetId} ↗`,
          ja: `検討中の候補アセット · ${entry.assetId} ↗`,
        };
    const nodes = [];
    if (href) {
      nodes.push(el('a', {
        class: entry.released ? 'anatomy-source' : 'anatomy-source is-candidate',
        href,
        target: '_blank',
        rel: 'noreferrer',
      }, [
        el('span', { class: 'lang-en', text: label.en }),
        el('span', { class: 'lang-ja', text: label.ja }),
      ]));
    }
    if (!entry.released && entry.note) {
      nodes.push(el('span', { class: 'anatomy-source-note', text: entry.note }));
    }
    return nodes;
  });
}
