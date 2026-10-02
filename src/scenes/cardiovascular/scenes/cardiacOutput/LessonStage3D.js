import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { DIAL_MAX_MMHG, JUG_MAX_LITRES, buildLessonUnit } from './lessonModel3D.js';
import { LESSON_TERMS } from '../../../../data/cardiacOutputLesson.js';
import { inLanguage, onLanguageChange } from '../../../../utils/language.js';

/**
 * The introductory lesson's figure in 3D: the stage the circulations stand on.
 *
 * ## One camera, two places, nothing moves
 *
 * The main circulation (A, then B) stands in the left-hand place from the
 * first frame to the last; the right-hand place is kept for the circulation it
 * is compared with (C) and is empty until then. One orthographic camera looks at
 * both from one direction and never moves, so:
 *
 * - the heart is the same size on every screen of the lesson — nothing zooms
 *   out to make room when C arrives (owner's review, 2026-10-02);
 * - two circulations are drawn at one scale by construction: an orthographic
 *   projection has no nearer-is-bigger, which is what made the right-hand of
 *   two side-by-side circulations look bigger in the first 3D version
 *   (`docs/organ-3d-playbook.md`, U).
 *
 * The camera frames the two places into whatever box the page gives the
 * figure (`fit`), so a longer caption under it never resizes the hearts: the
 * box is held at one size by the page (`LessonPanel`'s sizers), and the fit is
 * read off the box.
 *
 * ## Words are the page's, placed on the model
 *
 * Every label is an element over the canvas, at the point of the part it
 * names, projected through the one camera. They are few — the name of each
 * part once, the two values — because what the lesson shows is meant to be
 * seen in the model: a dial that turns, vessels that narrow, a level that
 * moves.
 */

/** The direction the lesson looks from: a little from the right and above, so the bundle of vessels reads as a bundle. */
export const VIEW_DIRECTION = new THREE.Vector3(0.22, 0.3, 1).normalize();

/**
 * Screen-right, in the stage: the line the two places stand on. Along world x
 * they did not: the camera looks from a little to the right and above, so a
 * step along x is also a step down the screen, and the compared circulation
 * stood lower than the main one (first prototype, 2026-10-02).
 */
export const SCREEN_RIGHT = new THREE.Vector3().crossVectors(VIEW_DIRECTION.clone().negate(), new THREE.Vector3(0, 1, 0)).normalize();

/** The two places: the main circulation on the left, the compared one on the right, one line apart on the screen. */
export const PLACES = Object.freeze({
  primary: SCREEN_RIGHT.clone().multiplyScalar(-2.55),
  other: SCREEN_RIGHT.clone().multiplyScalar(2.55),
});

/** One circulation's extent in its own frame, with room for the words on it: what the camera keeps in view. */
const UNIT_BOX = new THREE.Box3(new THREE.Vector3(-2.3, -4.3, -0.8), new THREE.Vector3(2.3, 3.62, 0.8));

/** The rows above and below the canvas, in px: the circulations' names, and what the two instruments are. */
const TITLE_ROW_PX = 38;
const LEGEND_ROW_PX = 22;
/** The least room between the two names, and between a name and the figure's edge, in px. */
const TITLE_GAP_PX = 8;
const TITLE_MARGIN_PX = 4;

/** How the drawn moment of the beat is turned into a squeeze and an ejection surge. */
function beatAt(phase) {
  const p = ((phase % 1) + 1) % 1;
  const ejection = 0.34;
  if (p < ejection) {
    const k = p / ejection;
    return { squeeze: Math.sin((k * Math.PI) / 2), ejecting: Math.sin(k * Math.PI) };
  }
  const k = (p - ejection) / (1 - ejection);
  return { squeeze: Math.max(0, 1 - k * 2.2), ejecting: 0 };
}

function label(className, slot = null, part = null) {
  const node = document.createElement('div');
  node.className = `ls-label ${className}`;
  // What a check reads a word by: whose it is and what it names.
  if (slot) node.dataset.slot = slot;
  if (part) node.dataset.part = part;
  return node;
}

function setPair(node, pair) {
  node.replaceChildren(
    Object.assign(document.createElement('span'), { className: 'lang-ja', textContent: pair.ja }),
    Object.assign(document.createElement('span'), { className: 'lang-en', textContent: pair.en })
  );
}

/**
 * The stage, or null where this browser cannot make a WebGL context — the
 * lesson then draws its figure in 2D (`LessonFigure`).
 *
 * @param {{ reducedMotion?: () => boolean }} [options] asked every frame, as
 *   the flat figure asks it: the reader's setting can change while the page is
 *   open. A function, not a flag — passed `prefersReducedMotion` itself and read
 *   as a flag, it was always truthy and nobody's heart beat (2026-10-02, L-182).
 */
export function createLessonStage3D({ reducedMotion = () => false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const element = document.createElement('div');
  element.className = 'lesson-stage';
  element.dataset.lessonFigure = '3d';
  element.dataset.strips = '0';
  element.dataset.calm = 'false';
  element.style.setProperty('--ls-title-row', `${TITLE_ROW_PX}px`);
  element.style.setProperty('--ls-legend-row', `${LEGEND_ROW_PX}px`);
  renderer.domElement.className = 'lesson-stage-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const overlay = document.createElement('div');
  overlay.className = 'lesson-stage-labels';
  overlay.setAttribute('aria-hidden', 'true');
  const description = document.createElement('p');
  description.className = 'visually-hidden lesson-stage-summary';
  element.append(renderer.domElement, overlay, description);

  const scene = new THREE.Scene();
  const environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1012, 0.9));
  const key = new THREE.DirectionalLight(0xfff1e6, 1.6);
  key.position.set(4, 8, 10);
  scene.add(key);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  camera.position.copy(VIEW_DIRECTION).multiplyScalar(60);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  const units = {
    primary: buildLessonUnit({ facing: VIEW_DIRECTION }),
    other: buildLessonUnit({ facing: VIEW_DIRECTION }),
  };
  for (const [slot, unit] of Object.entries(units)) {
    unit.object.position.copy(PLACES[slot]);
    unit.object.name = `lesson-circulation-${slot}`;
    scene.add(unit.object);
  }
  units.other.object.visible = false;

  // --- labels --------------------------------------------------------------------
  const labels = {
    primary: {
      title: label('ls-title', 'primary', 'title'),
      heart: label('ls-part ls-heart', 'primary', 'heart'),
      bed: label('ls-part ls-bed', 'primary', 'bed'),
      gauge: label('ls-part ls-value', 'primary', 'gauge'),
      jug: label('ls-part ls-value', 'primary', 'jug'),
    },
    other: {
      title: label('ls-title is-other', 'other', 'title'),
      gauge: label('ls-part ls-value', 'other', 'gauge'),
      jug: label('ls-part ls-value', 'other', 'jug'),
    },
  };
  const placeholder = label('ls-placeholder', 'other', 'placeholder');
  setPair(placeholder, { ja: '比べる循環は、ここに並びます', en: 'A circulation to compare stands here' });
  // What the two instruments are, said once for both circulations.
  const legend = label('ls-legend');
  setPair(legend, { ja: '針：血圧の平均　容器の高さ：1分間に送り出す量', en: 'Needle: average pressure · Jug: output per minute' });
  overlay.append(placeholder, legend, ...Object.values(labels.primary), ...Object.values(labels.other));
  setPair(labels.primary.heart, { ja: '心臓', en: 'Heart' });
  setPair(labels.primary.bed, LESSON_TERMS.bed);

  // --- fitting the camera to the box the page gives ---------------------------------
  let width = 0;
  let height = 0;
  const corner = new THREE.Vector3();
  function fit() {
    const box = element.getBoundingClientRect();
    if (!box.width || !box.height) return false;
    const canvasHeight = box.height - TITLE_ROW_PX - LEGEND_ROW_PX;
    if (canvasHeight <= 0) return false;
    if (Math.abs(box.width - width) < 0.5 && Math.abs(canvasHeight - height) < 0.5) return true;
    width = box.width;
    height = canvasHeight;
    renderer.setSize(width, height, false);
    // Both places, in the camera's own frame.
    const view = new THREE.Box3();
    camera.updateMatrixWorld();
    const inverse = camera.matrixWorldInverse;
    for (const place of Object.values(PLACES)) {
      for (let i = 0; i < 8; i++) {
        corner.set(i & 1 ? UNIT_BOX.max.x : UNIT_BOX.min.x, i & 2 ? UNIT_BOX.max.y : UNIT_BOX.min.y, i & 4 ? UNIT_BOX.max.z : UNIT_BOX.min.z);
        corner.add(place).applyMatrix4(inverse);
        view.expandByPoint(corner);
      }
    }
    const w = view.max.x - view.min.x;
    const h = view.max.y - view.min.y;
    const aspect = width / height;
    const halfH = Math.max(h, w / aspect) / 2;
    const halfW = halfH * aspect;
    const cx = (view.max.x + view.min.x) / 2;
    const cy = (view.max.y + view.min.y) / 2;
    camera.left = cx - halfW;
    camera.right = cx + halfW;
    camera.top = cy + halfH;
    camera.bottom = cy - halfH;
    camera.updateProjectionMatrix();
    element.dataset.pxPerUnit = (height / (2 * halfH)).toFixed(3);
    return true;
  }

  const projected = new THREE.Vector3();
  /** The point on screen, in the stage's px (the canvas starts under the title row). */
  function screenOf(unit, anchor) {
    projected.copy(anchor).applyMatrix4(unit.object.matrixWorld).project(camera);
    return { x: ((projected.x + 1) / 2) * width, y: TITLE_ROW_PX + ((1 - projected.y) / 2) * height };
  }
  function place(node, unit, anchor) {
    const at = screenOf(unit, anchor);
    node.style.transform = `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px)`;
  }
  /**
   * A circulation's name, in the row above the canvas, over the middle of its
   * place — and kept on its own side of the middle. On a phone the two places
   * are closer than the two names are wide ("C 別の循環／薬を加えた後では
   * ありません" is the longer), and centred they stood on each other (first
   * run of the check, 2026-10-02). The main circulation's name is kept to the
   * left half even while it stands alone, so it does not move when C arrives.
   */
  const titleWidths = { primary: 0, other: 0 };
  let titlesMeasuredFor = '';
  function placeTitle(node, unit, slot) {
    const at = screenOf(unit, new THREE.Vector3(0, 0, 0));
    const half = titleWidths[slot] / 2;
    const middle = width / 2;
    const [lo, hi] = slot === 'primary' ? [TITLE_MARGIN_PX + half, middle - TITLE_GAP_PX / 2 - half] : [middle + TITLE_GAP_PX / 2 + half, width - TITLE_MARGIN_PX - half];
    const x = hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, at.x));
    node.style.transform = `translate(${x.toFixed(1)}px, 0px)`;
  }

  // --- painting words in the language on screen --------------------------------------
  let lastWords = '';
  function paintWords(strips) {
    const key = JSON.stringify(strips.map((s) => [s.id, s.values.map, s.values.co])) + inLanguage('en', 'ja');
    if (key === lastWords) return;
    lastWords = key;
    const [main, other] = strips;
    const title = (node, strip) => {
      const copy = strip.copy;
      node.replaceChildren();
      const line = document.createElement('span');
      line.className = 'ls-title-name';
      setPair(line, { ja: `${copy.letter} ${copy.role.ja}`, en: `${copy.letter} ${copy.role.en}` });
      node.append(line);
      if (copy.note) {
        const note = document.createElement('span');
        note.className = 'ls-title-note';
        setPair(note, copy.note);
        node.append(note);
      }
    };
    const named = (node, name, value) => {
      node.replaceChildren();
      if (name) {
        const line = document.createElement('span');
        line.className = 'ls-name';
        setPair(line, name);
        node.append(line);
      }
      const figure = document.createElement('span');
      figure.className = 'ls-value';
      figure.textContent = value;
      node.append(figure);
    };
    title(labels.primary.title, main);
    named(labels.primary.gauge, null, `${main.values.map} mmHg`);
    named(labels.primary.jug, null, `${main.values.co} L`);
    if (other) {
      title(labels.other.title, other);
      named(labels.other.gauge, null, `${other.values.map} mmHg`);
      named(labels.other.jug, null, `${other.values.co} L`);
    }
  }
  onLanguageChange(() => {
    lastWords = '';
  });

  // --- a frame --------------------------------------------------------------------------
  let shownStrips = 0;
  const stateOf = (strip) => ({
    mapMmHg: strip.solved.meanArterialPressureMmHg,
    outputLMin: strip.solved.cardiacOutputLMin,
    strokeVolumeMl: strip.solved.strokeVolumeMl,
    resistance: strip.solved.systemicResistanceMmHgSPerMl,
  });

  /**
   * @param {{ strips: object[], highlight?: string[], phase?: number, summary?: {en:string, ja:string}, dt?: number }} frame
   */
  function render({ strips, highlight = [], phase = 0, summary, dt = 0 }) {
    if (!fit()) return;
    const [main, other] = strips;
    const beat = reducedMotion() ? { squeeze: 0, ejecting: 0, still: true } : beatAt(phase);
    units.primary.setState(stateOf(main));
    units.primary.setBefore(main.before ?? null);
    units.primary.update(dt, beat);
    const showOther = Boolean(other);
    if (showOther) {
      units.other.setState(stateOf(other));
      units.other.setBefore(null);
      // C arrives as it is — flowing, its jug at its level — never filling from empty.
      units.other.update(dt, { ...beat, instant: shownStrips < 2 });
    }
    units.other.object.visible = showOther;
    shownStrips = strips.length;
    element.dataset.strips = String(strips.length);
    paintWords(strips);

    for (const name of ['title', 'gauge', 'jug']) labels.other[name].hidden = !showOther;
    placeholder.hidden = showOther;
    // The names' widths, measured when their words or the figure's width change — not every frame.
    const measuredFor = `${lastWords}|${width}|${showOther}`;
    if (measuredFor !== titlesMeasuredFor) {
      titlesMeasuredFor = measuredFor;
      titleWidths.primary = labels.primary.title.offsetWidth;
      titleWidths.other = labels.other.title.offsetWidth;
    }

    scene.updateMatrixWorld();
    placeTitle(labels.primary.title, units.primary, 'primary');
    for (const name of ['heart', 'bed', 'gauge', 'jug']) {
      place(labels.primary[name], units.primary, units.primary.anchors[name]);
    }
    placeTitle(labels.other.title, units.other, 'other');
    for (const name of ['gauge', 'jug']) place(labels.other[name], units.other, units.other.anchors[name]);
    place(placeholder, units.other, new THREE.Vector3(0, 0, 0));
    const lit = new Set(highlight.map((part) => ({ dial: 'gauge', tube: 'jug' })[part] ?? part));
    for (const name of ['heart', 'bed', 'gauge', 'jug']) labels.primary[name].classList.toggle('is-lit', lit.has(name));
    units.primary.setLit(lit);
    // Beside C, what is lit is lit on both: the comparison is the two of them.
    units.other.setLit(showOther ? lit : new Set());
    for (const name of ['gauge', 'jug']) labels.other[name].classList.toggle('is-lit', showOther && lit.has(name));

    // Whether what is drawn has arrived where it is going — the beat and the
    // cells never rest, so "calm" is the vessels' width, the level and the needle.
    element.dataset.calm = String(units.primary.drawnNow().calm && (!showOther || units.other.drawnNow().calm));
    if (summary) description.textContent = inLanguage(summary.en, summary.ja);
    renderer.render(scene, camera);
  }

  /** A rect on the page from points in world space, through the one camera. */
  const pagePoint = (world, canvas) => {
    projected.copy(world).project(camera);
    return { x: canvas.left + ((projected.x + 1) / 2) * canvas.width, y: canvas.top + ((1 - projected.y) / 2) * canvas.height };
  };
  function pageRect(unit, box, canvas) {
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(unit.object.matrixWorld);
      const at = pagePoint(corner, canvas);
      left = Math.min(left, at.x);
      right = Math.max(right, at.x);
      top = Math.min(top, at.y);
      bottom = Math.max(bottom, at.y);
    }
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }

  /**
   * The figure as a reader sees it, for a check (`scripts/lib/lesson-drive.mjs`):
   * each circulation's fixed parts as boxes on the page, and its level, needle
   * and vessels **read back off the screen** — the level's height over the
   * jug's, the needle's angle — in litres and mmHg.
   */
  function probe() {
    const canvas = renderer.domElement.getBoundingClientRect();
    const read = (unit) => {
      if (!unit.object.visible) return null;
      const marks = unit.marks();
      const floor = pagePoint(marks.jugFloor, canvas);
      const top = pagePoint(marks.jugTop, canvas);
      const litresAt = (point) => (point ? (JUG_MAX_LITRES * (floor.y - pagePoint(point, canvas).y)) / (floor.y - top.y) : null);
      const hub = pagePoint(marks.hub, canvas);
      const mmHgAt = (point) => {
        if (!point) return null;
        const tip = pagePoint(point, canvas);
        return DIAL_MAX_MMHG * (1 - Math.atan2(hub.y - tip.y, tip.x - hub.x) / Math.PI);
      };
      const level = pagePoint(marks.level, canvas);
      return {
        parts: Object.fromEntries(Object.entries(unit.restBoxes).map(([name, box]) => [name, pageRect(unit, box, canvas)])),
        litres: litresAt(marks.level),
        levelPx: floor.y - level.y,
        mmHg: mmHgAt(marks.tip),
        calibre: marks.calibre,
        before: { litres: litresAt(marks.before), mmHg: mmHgAt(marks.beforeTip), calibre: marks.beforeCalibre },
        calm: unit.drawnNow().calm,
        // Whether it moves: how deep the heart is squeezed this frame, and how
        // far the cells have travelled since it was built.
        ...unit.motion(),
      };
    };
    return {
      canvas: { left: canvas.left, top: canvas.top, width: canvas.width, height: canvas.height },
      pxPerUnit: Number(element.dataset.pxPerUnit),
      primary: read(units.primary),
      other: read(units.other),
    };
  }

  return {
    element,
    render,
    probe,
    dispose() {
      for (const unit of Object.values(units)) unit.dispose();
      environment.dispose();
      renderer.dispose();
      element.remove();
    },
  };
}
