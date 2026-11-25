import { el } from '../../../../utils/dom.js';
import { inLanguage } from '../../../../utils/language.js';
import {
  DEFAULT_CONVENTION,
  DEFAULT_WINDOW,
  PLANES,
  PLANE_AXIS,
  atlasProblems,
  clampVoxel,
  clampWindow,
  mmToVoxel,
  voxelIndex,
  voxelToMm,
  windowLut,
} from '../../../../models/mriAtlas.js';
import {
  ANATOMY_ATLAS_LINKS,
  MRI_ATLAS_COPY,
  MRI_GROUPS,
  describeStructures,
} from '../../../../data/mriAtlas.js';
import { createSliceView, hexToRgb } from './SliceView.js';
import { loadAtlasIndex, loadAtlasMeshes, loadVolume } from './mriAtlasAssets.js';

/**
 * The atlas workbench: a list, a 3D view and three MRI planes over one state.
 *
 * ## One state, three views (architecture rule 3)
 *
 * `state` below is the only thing that remembers where the crosshair is, what
 * is selected and how the image is displayed. The list, the 3D view and the
 * planes are projections of it: each reports what the reader did
 * (`select`, `moveTo`, …) and none of them keeps a copy. The two-way link the
 * product is built around — choose in 3D, the planes move; choose on a plane,
 * the 3D lights up — is therefore not two mechanisms kept in step. It is one
 * state with two inputs.
 *
 * ## What a selection moves
 *
 * Selecting a structure sends the crosshair to its `interiorPointMm`: the
 * voxel deepest inside the label, computed by the build script. Not the
 * centroid — the centroid of a C-shaped structure (caudate, lateral ventricle)
 * lies outside it, and a crosshair that lands beside the thing it claims to
 * show is exactly the error this screen must not make.
 *
 * Clicking a *point* (on a plane, or on a surface in 3D) keeps that point: the
 * crosshair goes where the reader put it, and the structure there is selected.
 *
 * ## Loading, in the order a reader can use it
 *
 * index → T1 + labels (the planes work) → meshes (the 3D works). T2 only on
 * request. If the 3D cannot start — no WebGL — the planes still do, and the
 * workbench says so and stays in its MRI mode.
 */

const dual = (en, ja, className = '') => [
  el('span', { class: `${className} lang-en`.trim(), text: en }),
  el('span', { class: `${className} lang-ja`.trim(), text: ja }),
];

const MODES = Object.freeze([
  { id: 'linked', en: 'Linked', ja: '連動' },
  { id: '3d', en: '3D', ja: '3D' },
  { id: 'mri', en: 'MRI', ja: 'MRI' },
]);

const ZOOM_STEPS = Object.freeze([1, 1.5, 2, 3, 4]);

/** Groups that wrap the rest: ghosted when the reader asks to see inside. */
const CORTICAL_GROUPS = Object.freeze(['frontal', 'parietal', 'temporal', 'occipital', 'limbic', 'insula']);

export async function mountMriAtlasWorkbench({
  host,
  createViewer,
  openingStructureId = null,
  anatomyRoute = null,
  functionRoute = null,
  onSelection = () => {},
  loaders = { loadAtlasIndex, loadVolume, loadAtlasMeshes },
} = {}) {
  const abort = new AbortController();
  const atlas = await loaders.loadAtlasIndex({ signal: abort.signal });
  const grid = atlas.grid;
  const structures = describeStructures(atlas.structures);
  const byLabel = new Map(structures.map((structure) => [structure.label, structure]));
  const byId = new Map(structures.map((structure) => [structure.id, structure]));
  const colours = new Array(256).fill(null).map(() => [0, 0, 0]);
  for (const structure of structures) colours[structure.label] = hexToRgb(structure.colour);

  const phone = () => globalThis.matchMedia?.('(max-width: 899px)').matches ?? false;

  /** The single owner of what is on screen. */
  const state = {
    voxel: mmToVoxel(grid, [0, -18, 14]),
    /** What a zoomed plane is centred on. Moves on a zoom step or a jump to a structure, not with the crosshair. */
    focusVoxel: mmToVoxel(grid, [0, -18, 14]),
    selectedLabel: null,
    modality: 't1',
    window: { ...DEFAULT_WINDOW },
    overlay: true,
    overlayOpacity: 0.4,
    convention: DEFAULT_CONVENTION,
    zoom: 1,
    mode: phone() ? 'mri' : 'linked',
    seeInside: false,
    showPlanes: true,
    query: '',
  };
  const volumes = { t1: null, t2: null, labels: null };
  const pendingVolumes = { t2: null };
  /** Set when the status line carries something that must stay on screen (no 3D, load failure). */
  let statusIsFinal = false;
  /** The atlas failed its own checks: nothing may be drawn from it. */
  let failed = false;
  const lut = windowLut(state.window.level, state.window.width);
  let view3d = null;
  let viewer = null;
  let destroyed = false;
  /**
   * What a structure is for, when the shell can supply a reader — which it can
   * only where the higher-brain-function model is itself open (R-2026-11-24-02).
   * This screen has no opinion about function; it prints what that model says,
   * with that model's own caveat, or nothing.
   */
  let readFunction = null;

  // ------------------------------------------------------------------ DOM
  const status = el('p', { class: 'mri-status', role: 'status', 'aria-live': 'polite' }, dual('Loading the MRI volume…', 'MRI ボリュームを読み込んでいます…'));

  const sliceViews = PLANES.map((plane) => createSliceView({
    plane,
    label: MRI_ATLAS_COPY.planes[plane],
    onPick: (voxel, { final }) => moveTo(voxel, { select: final }),
    onStep: (name, direction) => {
      const next = [...state.voxel];
      next[PLANE_AXIS[name]] += direction;
      moveTo(next, { select: false });
    },
    onZoom: (direction) => stepZoom(direction),
    onHover: (voxel) => showHover(voxel),
  }));

  const hover = el('p', { class: 'mri-hover', 'aria-hidden': 'true' });
  const slicePanel = el('section', { class: 'mri-slices', 'aria-label': inLanguage('MRI planes', 'MRI 三断面') }, [
    el('div', { class: 'mri-slice-grid' }, sliceViews.map((view) => view.element)),
    hover,
  ]);

  const stage3d = el('div', { class: 'mri-3d-stage' });
  const stageNote = el('p', { class: 'mri-3d-note' }, dual('Loading the 3D surfaces…', '3D モデルを読み込んでいます…'));
  const viewButtons = el('div', { class: 'mri-3d-views', role: 'group', 'aria-label': inLanguage('Viewpoint', '視点') },
    [
      ['home', 'Oblique', '斜め'], ['left', 'Left', '左'], ['right', 'Right', '右'],
      ['anterior', 'Front', '前'], ['superior', 'Top', '上'],
    ].map(([id, en, ja]) => el('button', {
      class: 'mri-chip', type: 'button', 'data-view': id,
      on: { click: () => (id === 'home' ? view3d?.resetView() : view3d?.setView(id)) },
    }, dual(en, ja))));
  const tools3d = el('div', { class: 'mri-3d-tools' });
  const panel3d = el('section', { class: 'mri-3d', 'aria-label': inLanguage('3D model', '3D モデル') }, [stage3d, stageNote, viewButtons, tools3d]);

  // --- the selection read-out -------------------------------------------
  const info = el('section', { class: 'mri-info' });
  // Only the name is announced. The whole card as a live region re-read every
  // fact, note and link each time an arrow key crossed a label.
  const announce = el('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });

  // --- the list -----------------------------------------------------------
  const search = el('input', {
    class: 'mri-search', type: 'search',
    placeholder: inLanguage('Search structures', '構造を検索'),
    'aria-label': inLanguage('Search structures', '構造を検索'),
    on: { input: (event) => { state.query = event.target.value; renderList(); } },
  });
  const listBody = el('div', { class: 'mri-list-body' });
  const buttons = new Map();
  for (const group of MRI_GROUPS) {
    const members = structures.filter((structure) => structure.group === group.id);
    const items = members.map((structure) => {
      const button = el('button', {
        class: 'mri-structure', type: 'button', 'data-structure': structure.id, 'aria-pressed': 'false',
        on: { click: () => select(structure.label, { viaList: true }) },
      }, [
        el('span', { class: 'mri-swatch', style: `background:${structure.colour}`, 'aria-hidden': 'true' }),
        el('span', { class: 'mri-structure-name' }, dual(structure.nameEn, structure.nameJa)),
        el('span', { class: 'mri-structure-side', text: structure.hemi }),
      ]);
      buttons.set(structure.label, button);
      return el('li', {}, [button]);
    });
    listBody.append(el('section', { class: 'mri-group', 'data-group': group.id }, [
      el('h3', { class: 'mri-group-name' }, dual(group.en, group.ja)),
      el('ul', { class: 'mri-group-list' }, items),
    ]));
  }
  const listPanel = el('section', { class: 'mri-list', 'aria-label': inLanguage('Structures', '構造の一覧') }, [search, listBody]);

  // --- display controls -----------------------------------------------------
  const slider = (id, labels, attrs, onInput) => {
    const input = el('input', { type: 'range', id, class: 'mri-range', ...attrs, on: { input: (event) => onInput(Number(event.target.value)) } });
    return { input, row: el('label', { class: 'mri-control', for: id }, [el('span', { class: 'mri-control-name' }, dual(...labels)), input]) };
  };
  const toggle = (labels, pressed, onToggle, attrs = {}) => {
    const button = el('button', {
      class: 'mri-chip', type: 'button', 'aria-pressed': String(pressed), ...attrs,
      on: { click: () => { const next = button.getAttribute('aria-pressed') !== 'true'; button.setAttribute('aria-pressed', String(next)); onToggle(next); } },
    }, dual(...labels));
    return button;
  };
  const level = slider('mri-level', ['Brightness', '輝度'], { min: '0', max: '255', value: String(255 - state.window.level) },
    // Brighter = a lower window centre; the slider is read as "brightness".
    (value) => setWindow({ level: 255 - value, width: state.window.width }));
  const contrastSliderOf = (width) => Math.round((510 - width) / 5);
  const contrast = slider('mri-contrast', ['Contrast', 'コントラスト'], { min: '0', max: '100', value: String(contrastSliderOf(state.window.width)) },
    // More contrast = a narrower window.
    (value) => setWindow({ level: state.window.level, width: 510 - value * 5 }));
  const opacity = slider('mri-opacity', ['Label opacity', 'ラベルの濃さ'], { min: '0', max: '100', value: String(state.overlayOpacity * 100) },
    (value) => { state.overlayOpacity = value / 100; render(); });

  const modalityButtons = ['t1', 't2'].map((id) => el('button', {
    class: 'mri-chip', type: 'button', 'data-modality': id, 'aria-pressed': String(state.modality === id),
    on: { click: () => setModality(id) },
  }, [el('span', { text: id === 't1' ? 'T1' : 'T2' })]));
  const conventionButton = toggle(['Radiological view', '放射線学的表示'], state.convention === 'radiological',
    (on) => { state.convention = on ? 'radiological' : 'neurological'; render(); }, { 'data-control': 'convention' });
  const overlayButton = toggle(['Colour labels', '色ラベル'], state.overlay, (on) => { state.overlay = on; render(); }, { 'data-control': 'overlay' });
  const insideButton = toggle(['See inside (fade cortex)', '内部を見る（皮質を透かす）'], state.seeInside, (on) => { state.seeInside = on; render(); }, { 'data-control': 'inside' });
  const planesButton = toggle(['Slice positions in 3D', '3D に断面位置'], state.showPlanes, (on) => { state.showPlanes = on; render(); }, { 'data-control': 'planes' });
  const zoomOut = el('button', { class: 'mri-chip is-icon', type: 'button', 'aria-label': inLanguage('Zoom out', '縮小'), on: { click: () => stepZoom(-1) } }, [el('span', { 'aria-hidden': 'true', text: '−' })]);
  const zoomIn = el('button', { class: 'mri-chip is-icon', type: 'button', 'aria-label': inLanguage('Zoom in', '拡大'), on: { click: () => stepZoom(1) } }, [el('span', { 'aria-hidden': 'true', text: '+' })]);
  const zoomValue = el('span', { class: 'mri-zoom-value' });
  const resetButton = el('button', { class: 'mri-chip', type: 'button', 'data-control': 'reset', on: { click: () => resetDisplay() } }, dual('Reset display', '表示を戻す'));

  // What belongs to the 3D view stands on the 3D view.
  tools3d.append(insideButton, planesButton);
  // The image settings are a disclosure: open where there is room for them,
  // closed on a phone, where the planes need every row they can get. The
  // controls a reader changes constantly — sequence, labels, zoom — stay out.
  const settings = el('details', { class: 'mri-settings' }, [
    el('summary', { class: 'mri-settings-summary' }, dual('Image settings', '画像の調整')),
    el('div', { class: 'mri-control-row is-sliders' }, [level.row, contrast.row, opacity.row]),
    el('div', { class: 'mri-control-row' }, [conventionButton, resetButton]),
  ]);
  if (!phone()) settings.setAttribute('open', '');
  settings.addEventListener('toggle', () => render());
  const controls = el('section', { class: 'mri-controls', 'aria-label': inLanguage('Display', '表示の設定') }, [
    el('div', { class: 'mri-control-row' }, [
      el('span', { class: 'mri-control-group', role: 'group', 'aria-label': inLanguage('Sequence', '撮像法') }, modalityButtons),
      overlayButton,
      el('span', { class: 'mri-control-group', role: 'group', 'aria-label': inLanguage('Zoom', '拡大') }, [zoomOut, zoomValue, zoomIn]),
    ]),
    settings,
  ]);

  const modeTabs = el('div', { class: 'mri-modes', role: 'group', 'aria-label': inLanguage('View', '表示の切替') },
    MODES.map((mode) => el('button', {
      class: 'mri-mode', type: 'button', 'aria-pressed': 'false', 'data-mode': mode.id,
      on: { click: () => setMode(mode.id) },
    }, dual(mode.en, mode.ja))));
  const listToggle = el('button', {
    class: 'mri-mode is-list', type: 'button', 'aria-expanded': 'false',
    on: { click: () => { const open = element.dataset.list !== 'open'; element.dataset.list = open ? 'open' : 'closed'; listToggle.setAttribute('aria-expanded', String(open)); } },
  }, dual('Structures', '構造一覧'));

  const bar = el('div', { class: 'mri-bar' }, [modeTabs, listToggle]);
  const element = el('div', { class: 'mri-workbench', 'data-mode': state.mode, 'data-list': 'closed', 'data-ready': 'false' }, [
    bar,
    listPanel,
    panel3d,
    el('div', { class: 'mri-side' }, [slicePanel, controls]),
    info,
    announce,
    status,
    el('p', { class: 'mri-standard' }, dual(MRI_ATLAS_COPY.standardBrain.en, MRI_ATLAS_COPY.standardBrain.ja)),
  ]);
  host.append(element);
  element.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || element.dataset.list !== 'open') return;
    element.dataset.list = 'closed';
    listToggle.setAttribute('aria-expanded', 'false');
    listToggle.focus();
  });

  // -------------------------------------------------------------- actions
  function labelAt(voxel) {
    return volumes.labels ? volumes.labels[voxelIndex(grid, voxel)] : 0;
  }

  /** Put the crosshair on a voxel; with `select`, select whatever is there. */
  function moveTo(voxel, { select: alsoSelect = false } = {}) {
    state.voxel = clampVoxel(grid, voxel);
    if (alsoSelect) {
      const label = labelAt(state.voxel);
      // Clicking unlabelled tissue (white matter, CSF outside the labels, the
      // skull) clears the selection: there is no name to give it.
      setSelected(label && byLabel.has(label) ? label : null);
    }
    render();
  }

  /** Select a structure by label and go to its interior point. */
  function select(label, { pointMm = null, viaList = false } = {}) {
    const structure = byLabel.get(label);
    if (!structure) return false;
    state.voxel = mmToVoxel(grid, pointMm ?? structure.interiorPointMm);
    // A point on a surface is at the edge of its structure by definition, and
    // rounding can land one voxel outside it. The crosshair must be inside.
    if (labelAt(state.voxel) !== label) state.voxel = mmToVoxel(grid, structure.interiorPointMm);
    // A jump may land outside what a zoomed plane is showing; bring it into view.
    state.focusVoxel = [...state.voxel];
    setSelected(label);
    if (viaList && phone()) {
      element.dataset.list = 'closed';
      listToggle.setAttribute('aria-expanded', 'false');
    }
    render();
    return true;
  }

  function setSelected(label) {
    if (state.selectedLabel === label) return;
    state.selectedLabel = label;
    renderInfo();
    const named = byLabel.get(label);
    announce.textContent = named ? inLanguage(named.fullNameEn, named.fullNameJa) : '';
    onSelection(label == null ? null : byLabel.get(label));
  }

  function setWindow(next) {
    state.window = clampWindow(next);
    windowLut(state.window.level, state.window.width, lut);
    render();
  }

  function stepZoom(direction) {
    const index = ZOOM_STEPS.indexOf(state.zoom);
    state.zoom = ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, index + direction))];
    // Zoom about where the reader is looking.
    state.focusVoxel = [...state.voxel];
    render();
  }

  let modalityRequest = 0;
  async function setModality(id) {
    // The last choice wins: T2 then T1 while T2 is still arriving must end on T1.
    const request = (modalityRequest += 1);
    if (!volumes[id]) {
      if (!statusIsFinal) {
        status.replaceChildren(...dual('Loading the T2 volume…', 'T2 ボリュームを読み込んでいます…'));
        status.hidden = false;
      }
      try {
        pendingVolumes[id] ??= loaders.loadVolume(atlas.volumes[id], { signal: abort.signal });
        volumes[id] = await pendingVolumes[id];
      } catch (error) {
        pendingVolumes[id] = null;
        if (destroyed || request !== modalityRequest) return;
        if (!statusIsFinal) status.replaceChildren(...dual('The T2 volume could not be loaded.', 'T2 ボリュームを読み込めませんでした。'));
        console.warn('[mri-atlas] T2', error);
        return;
      }
      if (!statusIsFinal) status.hidden = true;
    }
    if (destroyed || request !== modalityRequest) return;
    if (!statusIsFinal) status.hidden = true;
    state.modality = id;
    render();
  }

  function setMode(mode) {
    if (mode !== 'mri' && !view3d && element.dataset.ready === 'slices-only') return;
    state.mode = mode;
    element.dataset.mode = mode;
    render();
    // The 3D stage changes size with the mode, and in MRI mode it is not on
    // screen at all: a renderer left running there draws every frame to a
    // canvas nobody sees (and, sized from a 0-wide box, at the window's size).
    syncViewer();
  }

  function syncViewer() {
    if (!viewer || destroyed) return;
    if (state.mode === 'mri') {
      viewer.stop();
      return;
    }
    requestAnimationFrame(() => {
      if (destroyed || state.mode === 'mri' || stage3d.clientWidth === 0) return;
      viewer.resize();
      viewer.start();
    });
  }

  function resetDisplay() {
    state.window = { ...DEFAULT_WINDOW };
    windowLut(state.window.level, state.window.width, lut);
    state.zoom = 1;
    state.focusVoxel = [...state.voxel];
    state.overlay = true;
    state.overlayOpacity = 0.4;
    state.convention = DEFAULT_CONVENTION;
    level.input.value = String(255 - state.window.level);
    contrast.input.value = String(contrastSliderOf(state.window.width));
    opacity.input.value = '40';
    overlayButton.setAttribute('aria-pressed', 'true');
    conventionButton.setAttribute('aria-pressed', 'true');
    render();
  }

  // ------------------------------------------------------------- rendering
  function describe(plane, mm) {
    const selected = byLabel.get(state.selectedLabel);
    const name = MRI_ATLAS_COPY.planes[plane];
    return inLanguage(
      `${name.en} MRI slice at ${mm} mm${selected ? `, ${selected.fullNameEn} highlighted` : ''}`,
      `${name.ja} MRI（${mm} mm）${selected ? `、${selected.fullNameJa} を強調表示` : ''}`
    );
  }

  let queued = false;
  function render() {
    if (queued || destroyed) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (destroyed) return;
      paint();
    });
  }

  function paint() {
    if (failed) return;
    for (const [label, button] of buttons) button.setAttribute('aria-pressed', String(label === state.selectedLabel));
    for (const button of modeTabs.children) button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
    for (const button of modalityButtons) button.setAttribute('aria-pressed', String(button.dataset.modality === state.modality));
    zoomValue.textContent = `×${state.zoom}`;
    const intensity = volumes[state.modality];
    if (intensity && volumes.labels && state.mode !== '3d') {
      const frame = {
        grid, intensity, labels: volumes.labels, voxel: state.voxel, lut, colours,
        overlay: state.overlay, overlayOpacity: state.overlayOpacity, selectedLabel: state.selectedLabel,
        convention: state.convention, zoom: state.zoom, focusVoxel: state.focusVoxel, describe,
      };
      for (const view of sliceViews) view.draw(frame);
    }
    view3d?.setState({
      selectedLabel: state.selectedLabel,
      voxel: state.voxel,
      ghostGroups: new Set(state.seeInside ? CORTICAL_GROUPS : []),
      hiddenGroups: new Set(),
      focusSelection: true,
      showPlanes: state.showPlanes,
    });
    const mm = voxelToMm(grid, state.voxel);
    element.dataset.voxel = state.voxel.join(',');
    element.dataset.mm = mm.join(',');
    element.dataset.selected = byLabel.get(state.selectedLabel)?.id ?? '';
    element.dataset.convention = state.convention;
  }

  function renderList() {
    const query = state.query.trim().toLowerCase();
    for (const structure of structures) {
      const match = !query
        || structure.nameJa.includes(state.query.trim())
        || structure.nameEn.toLowerCase().includes(query)
        || structure.fullNameJa.includes(state.query.trim());
      buttons.get(structure.label).parentElement.hidden = !match;
    }
    for (const section of listBody.children) {
      section.hidden = [...section.querySelectorAll('li')].every((item) => item.hidden);
    }
  }

  function renderInfo() {
    const structure = byLabel.get(state.selectedLabel);
    if (!structure) {
      info.replaceChildren(el('p', { class: 'mri-info-empty' }, dual(MRI_ATLAS_COPY.nothingSelected.en, MRI_ATLAS_COPY.nothingSelected.ja)));
      return;
    }
    const group = MRI_GROUPS.find((item) => item.id === structure.group);
    const link = ANATOMY_ATLAS_LINKS[structure.baseId];
    const [x, y, z] = structure.interiorPointMm;
    info.replaceChildren(...[
      el('div', { class: 'mri-info-head' }, [
        el('span', { class: 'mri-swatch is-large', style: `background:${structure.colour}`, 'aria-hidden': 'true' }),
        el('div', {}, [
          el('h2', { class: 'mri-info-name' }, dual(structure.fullNameEn, structure.fullNameJa)),
          // The other language, quietly: medical terms are learned in both.
          el('p', { class: 'mri-info-alt' }, dual(structure.fullNameJa, structure.nameEn)),
        ]),
      ]),
      el('dl', { class: 'mri-info-facts' }, [
        el('dt', {}, dual('Region', '区分')), el('dd', {}, dual(group.en, group.ja)),
        el('dt', {}, dual('Side', '側')),
        // A midline structure the atlas divides has no side; it has a half.
        el('dd', {}, structure.midline
          ? dual(`Midline (${structure.hemi === 'L' ? 'left' : 'right'} half)`, `正中（${structure.hemi === 'L' ? '左' : '右'}半分）`)
          : dual(structure.hemi === 'L' ? 'Left' : 'Right', structure.hemi === 'L' ? '左' : '右')),
        el('dt', {}, dual('MNI coordinate shown', '表示中の MNI 座標')),
        el('dd', { class: 'mri-info-mm', text: `x ${x}, y ${y}, z ${z} mm` }),
      ]),
      structure.note ? el('p', { class: 'mri-info-note' }, dual(structure.note.en, structure.note.ja)) : null,
      link && anatomyRoute
        ? el('p', { class: 'mri-info-link' }, [
            el('a', { href: `${anatomyRoute}?structure=${link[structure.hemi]}` }, dual('See it in the anatomy atlas →', '脳解剖アトラスで見る →')),
            el('span', { class: 'mri-info-link-note' }, dual(MRI_ATLAS_COPY.linkByName.en, MRI_ATLAS_COPY.linkByName.ja)),
          ])
        : null,
      functionSection(structure, link),
    ].filter(Boolean));
  }

  /** The function model's reading of this structure, or null. Only for structures both atlases name. */
  function functionSection(structure, link) {
    if (!readFunction || !link) return null;
    const note = readFunction({ atlasName: link.atlasLabel, side: structure.hemi === 'L' ? 'Left' : 'Right' });
    if (!note) return null;
    return el('section', { class: 'mri-info-function' }, [
      el('h3', { class: 'mri-info-function-title' }, dual(note.title, note.titleJa)),
      el('p', {}, dual(note.carries.text, note.carries.textJa)),
      el('p', {}, dual(note.ifLost.text, note.ifLost.textJa)),
      el('p', { class: 'mri-info-link-note' }, dual(note.source.text, note.source.textJa)),
      functionRoute
        ? el('p', { class: 'mri-info-link' }, [el('a', { href: functionRoute }, dual('Trace the routes in the function model →', '機能モデルで経路をたどる →'))])
        : null,
    ].filter(Boolean));
  }

  function showHover(voxel) {
    const structure = voxel ? byLabel.get(labelAt(voxel)) : null;
    hover.replaceChildren(...(structure ? dual(structure.fullNameEn, structure.fullNameJa) : []));
  }

  // --------------------------------------------------------------- loading
  renderInfo();
  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => {
        if (viewer && state.mode !== 'mri' && stage3d.clientWidth > 0) viewer.resize();
        render();
      })
    : null;
  // The boxes that are drawn into, not only the workbench: the info row is
  // as tall as its text, so a selection or a language switch resizes the 3D
  // stage and the planes while the workbench itself stays the same size.
  resizeObserver?.observe(element);
  resizeObserver?.observe(stage3d);
  for (const view of sliceViews) resizeObserver?.observe(view.canvas.parentElement);

  const volumesReady = Promise.all([
    loaders.loadVolume(atlas.volumes.t1, { signal: abort.signal }),
    loaders.loadVolume(atlas.volumes.labels, { signal: abort.signal }),
  ]).then(([t1, labels]) => {
    if (destroyed) return;
    // The asset is checked against the claims this screen makes from it before
    // a single pixel is drawn: sides, and every interior point inside its label.
    // Checked on the locals — the volumes are handed to the painter only once
    // they have passed, so a rejected atlas cannot be drawn by a later click.
    const problems = atlasProblems(atlas, labels);
    if (problems.length) {
      failed = true;
      throw new Error(`the MRI atlas failed its own checks: ${problems.slice(0, 3).join('; ')}`);
    }
    volumes.t1 = t1;
    volumes.labels = labels;
    status.hidden = true;
    element.dataset.ready = 'slices';
    const opening = openingStructureId ? byId.get(openingStructureId) : null;
    if (opening) select(opening.label);
    render();
  });

  const meshesReady = volumesReady.then(async () => {
    if (destroyed) return;
    try {
      viewer = createViewer(stage3d);
    } catch (error) {
      // Said where it can be read: the 3D panel is about to be hidden, so a
      // note inside it would be a note nobody sees. The 3D tabs are disabled
      // rather than left leading to an empty panel.
      element.dataset.ready = 'slices-only';
      state.mode = 'mri';
      element.dataset.mode = 'mri';
      for (const button of modeTabs.children) if (button.dataset.mode !== 'mri') button.disabled = true;
      statusIsFinal = true;
      status.hidden = false;
      status.classList.add('is-notice');
      status.replaceChildren(...dual(
        'This browser could not start 3D. The MRI planes work without it.',
        'このブラウザでは 3D を開始できませんでした。MRI 三断面はそのまま使えます。'
      ));
      render();
      console.warn('[mri-atlas] 3D unavailable', error);
      return;
    }
    const { createAtlasView3D } = await import('./AtlasView3D.js');
    const meshRoot = await loaders.loadAtlasMeshes();
    if (destroyed) return;
    view3d = createAtlasView3D({
      viewer,
      meshRoot,
      structures,
      grid,
      onPick: (label, pointMm) => select(label, { pointMm }),
    });
    syncViewer();
    stageNote.hidden = true;
    element.dataset.ready = 'all';
    render();
  });

  const ready = meshesReady.catch((error) => {
    if (destroyed) return;
    statusIsFinal = true;
    status.hidden = false;
    status.replaceChildren(...dual('The MRI atlas could not be loaded. Reload the page to try again.', 'MRI アトラスを読み込めませんでした。ページを再読み込みしてください。'));
    element.dataset.ready = 'failed';
    console.error('[mri-atlas]', error);
  });

  return {
    element,
    ready,
    volumesReady,
    state: () => ({ ...state, voxel: [...state.voxel], mm: voxelToMm(grid, state.voxel), selected: byLabel.get(state.selectedLabel)?.id ?? null }),
    structures,
    select: (id) => (byId.has(id) ? select(byId.get(id).label) : false),
    moveToMm: (mm, options) => moveTo(mmToVoxel(grid, mm), options),
    setMode,
    setModality,
    /** Hand the workbench a reader of structure → function (see `readFunction`). */
    setFunctionReader(reader) {
      readFunction = typeof reader === 'function' ? reader : null;
      renderInfo();
      render();
    },
    get viewer() { return viewer; },
    get view3d() { return view3d; },
    pause: () => viewer?.stop(),
    resume: () => viewer?.start(),
    destroy() {
      destroyed = true;
      abort.abort();
      bar.remove();
      resizeObserver?.disconnect();
      view3d?.dispose();
      viewer?.dispose();
      element.remove();
    },
  };
}
