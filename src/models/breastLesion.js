/**
 * A lesion in a breast, as a statement about **a place and what it is near**.
 *
 * ## The reading this model exists to refuse
 *
 * Everything about this subject is usually told as one line: it starts
 * somewhere, it gets bigger, it reaches the nodes. Told that way, "further
 * along" and "nearer the nodes" become the same thing, and a picture that
 * animates one into the other says so without ever writing it down.
 *
 * They are not the same thing, and the geometry says so plainly. Every duct
 * system in the gland begins at the nipple and runs *outwards*, but they run
 * outwards in different directions — and the breast's drainage route leaves
 * from one corner of it. So moving out along a duct in the upper outer part
 * takes a marker **towards** that route, and moving out along a duct on the
 * other side takes it **further away**. Distance along a duct is not distance
 * towards anything.
 *
 * ## What the model computes
 *
 * A marker's position along a chosen course, which part of the duct system that
 * position is in, and how far that point is from the drainage route the gland
 * has. Nothing else.
 *
 * ## Five places, and they are not five stages
 *
 * Four duct courses and the axillary tail. **The tail is a different place, not
 * a later one**: no position on any duct's axis ever reports the tail, and the
 * tail is reached by choosing it. Nothing here says one site becomes another.
 *
 * ## What is not here
 *
 * **Nothing spreads.** No cell moves, no lesion travels, no node is involved
 * and no route carries anything: the route is drawn because the *gland* drains
 * that way, and `toRoute` is a distance between two drawn points. **No output
 * of this model is a spread, a nodal status or a risk of either.**
 *
 * **No size of any kind.** The marker is a place. It has no diameter, no
 * volume, no growth and no margin, and nothing here is a measurement of a
 * lesion. **No stage and no grade**: staging rests on size, on nodes and on
 * what is elsewhere in a person, none of which this model has. No prognosis, no
 * probability, no treatment and no screening.
 *
 * No biology at all: no cell type, no receptor, no histology, no in-situ or
 * invasive distinction, and no cause. The words `large-duct`, `terminal-duct`
 * and `lobular-end` name **parts of a duct system a point can be in** — they
 * are not diagnoses and not a classification of anything.
 *
 * PROTOTYPE. Every course, point and distance is sampled off this repository's
 * own breast atlas, which declares itself not anatomically validated and its
 * duct and lobule counts to be display counts. **No distance here is a
 * measurement of anybody.**
 */

/**
 * The courses a marker can run along, sampled off `buildBreast()`.
 *
 * Each `points` array is nine points taken along the very curve the atlas draws
 * — four of the eight duct systems it lays out, and the axillary tail — so the
 * place this model computes is a place on a structure that is on screen.
 *
 * The four ducts are **the atlas's own**, not four directions this model chose:
 * their angles and reaches are the ones `buildBreast()` generates, and the
 * quadrant names below say where each of them happens to point.
 */
export const COURSES = Object.freeze([
  {
    id: 'upper-inner',
    duct: 1,
    points: Object.freeze([
      [0, 0, 1.3], [0.0452, 0.0856, 1.1744], [0.0885, 0.1677, 1.0459], [0.1296, 0.2456, 0.9141],
      [0.1686, 0.3196, 0.7794], [0.2051, 0.3888, 0.6415], [0.2397, 0.4545, 0.5014],
      [0.2738, 0.519, 0.3606], [0.3079, 0.5838, 0.22],
    ]),
    lobules: Object.freeze([[0.2583, 0.7682, 0.14], [0.4882, 0.6469, 0.14]]),
  },
  {
    id: 'upper-outer',
    duct: 3,
    points: Object.freeze([
      [0, 0, 1.3], [-0.0847, 0.0447, 1.1809], [-0.1615, 0.0852, 1.0554], [-0.2211, 0.1166, 0.9183],
      [-0.2745, 0.1448, 0.7779], [-0.3297, 0.1739, 0.6385], [-0.385, 0.2031, 0.499],
      [-0.4401, 0.2322, 0.3595], [-0.4953, 0.2613, 0.22],
    ]),
    lobules: Object.freeze([[-0.6798, 0.2116, 0.14], [-0.5585, 0.4416, 0.14]]),
  },
  {
    id: 'lower-outer',
    duct: 5,
    points: Object.freeze([
      [0, 0, 1.3], [-0.0459, -0.0869, 1.1669], [-0.093, -0.1763, 1.036], [-0.1432, -0.2714, 0.9102],
      [-0.1918, -0.3637, 0.7819], [-0.2357, -0.4468, 0.6458], [-0.276, -0.5232, 0.5048],
      [-0.3151, -0.5974, 0.3622], [-0.3546, -0.6722, 0.22],
    ]),
    lobules: Object.freeze([[-0.3049, -0.8567, 0.14], [-0.5349, -0.7354, 0.14]]),
  },
  {
    id: 'lower-inner',
    duct: 7,
    points: Object.freeze([
      [0, 0, 1.3], [0.0856, -0.0452, 1.1744], [0.1677, -0.0885, 1.0459], [0.2456, -0.1296, 0.9141],
      [0.3196, -0.1686, 0.7794], [0.3888, -0.2051, 0.6415], [0.4545, -0.2397, 0.5014],
      [0.519, -0.2738, 0.3606], [0.5838, -0.3079, 0.22],
    ]),
    lobules: Object.freeze([[0.7682, -0.2583, 0.14], [0.6469, -0.4882, 0.14]]),
  },
  {
    id: 'axillary-tail',
    duct: null,
    points: Object.freeze([
      [-0.78, 0.62, 0.34], [-0.8859, 0.6718, 0.286], [-0.9917, 0.7227, 0.231], [-1.0976, 0.7744, 0.1768],
      [-1.2035, 0.8288, 0.1253], [-1.309, 0.8889, 0.0799], [-1.4134, 0.9565, 0.0431],
      [-1.5166, 1.0286, 0.012], [-1.62, 1.1, -0.02],
    ]),
    lobules: Object.freeze([]),
  },
]);

/** The drainage route the gland has, which is the axillary tail's own course. */
export const ROUTE = COURSES.find((course) => course.id === 'axillary-tail').points;

/** Where every duct system begins, and the point every distance below is compared against. */
export const NIPPLE = Object.freeze([0, 0, 1.3]);

/**
 * Where along a duct the large duct gives way to its terminal part, and where
 * the lobules hang off it.
 *
 * **Thresholds on a drawn course, and nothing more.** They are placed so that
 * the part called `lobular-end` is the part the atlas hangs its lobules off —
 * a calibration test measures that — and no number here is a length in
 * anybody. **These are parts of a duct system, not diagnoses.**
 */
export const PARTS = Object.freeze({ largeUntil: 0.45, terminalUntil: 0.85 });

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const between = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const gap = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** A point a given fraction along a sampled course. */
function alongCourse(points, fraction) {
  const spans = points.length - 1;
  const scaled = clamp(fraction, 0, 1) * spans;
  const span = Math.min(spans - 1, Math.floor(scaled));
  return between(points[span], points[span + 1], scaled - span);
}

/** How far a point is from the nearest place on a sampled course. */
function toCourse(points, point) {
  let nearest = Infinity;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const length = dx * dx + dy * dy + dz * dz;
    const t = length > 0
      ? clamp(((point[0] - a[0]) * dx + (point[1] - a[1]) * dy + (point[2] - a[2]) * dz) / length, 0, 1)
      : 0;
    nearest = Math.min(nearest, gap(point, between(a, b, t)));
  }
  return nearest;
}

/** How far the nipple itself is from the route: every course starts here. */
export const NIPPLE_TO_ROUTE = toCourse(ROUTE, NIPPLE);

export const DEFAULT_CONTROLS = Object.freeze({ site: 'upper-outer' });

/**
 * @param {number} along how far out from the nipple the marker sits, 0 to 1
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solveBreastLesion(along, controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const course = COURSES.find((entry) => entry.id === settings.site) ?? COURSES[0];
  const fraction = clamp(along, 0, 1);
  const at = alongCourse(course.points, fraction);
  const onTheRoute = course.duct === null;

  const toRoute = onTheRoute ? 0 : toCourse(ROUTE, at);
  const toLobule = course.lobules.length
    ? Math.min(...course.lobules.map((lobule) => gap(at, lobule)))
    : null;

  return {
    controls: { ...settings, site: course.id },
    along: fraction,
    site: course.id,
    /** Which of the atlas's own duct systems this course is, or `null` for the tail. */
    duct: course.duct,
    /** Where the marker is, for the scene to draw. */
    at,
    /**
     * **Which part of the duct system the marker is in.** A place on a drawn
     * course — not a diagnosis, not a histology and not a classification.
     */
    inTissue: onTheRoute
      ? 'axillary-tail-gland'
      : fraction < PARTS.largeUntil
        ? 'large-duct'
        : fraction < PARTS.terminalUntil
          ? 'terminal-duct'
          : 'lobular-end',
    /** How far the marker is from the nearest drawn lobule of its own duct. */
    toLobule,
    /** Whether this course *is* the route, rather than a course near it. */
    onTheRoute,
    /**
     * **How far the marker is from the gland's drainage route**, in the atlas's
     * own units. A distance between two drawn things, and nothing travels it.
     */
    toRoute,
    /** The same against the distance the nipple itself is from the route. */
    routeShare: NIPPLE_TO_ROUTE > 0 ? toRoute / NIPPLE_TO_ROUTE : 0,
    /**
     * **Whether moving out along this course has brought the marker nearer the
     * route than it began.** On some courses it has and on others it has not,
     * which is the whole of what this model is for.
     *
     * `null` at the start, where nothing has moved and there is nothing to
     * compare, and on the tail, which is the route rather than a course near it.
     */
    nearer: onTheRoute || fraction === 0 ? null : toRoute < NIPPLE_TO_ROUTE,
    /**
     * **Not here.** Nothing spreads, nothing is involved, nothing has a size and
     * nothing has a stage. The fields exist so a caller cannot mistake the
     * absences for oversights.
     */
    spread: null,
    nodalStatus: null,
    size: null,
    stage: null,
  };
}
