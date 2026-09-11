import * as THREE from 'three';
import { carveNamedParts } from '../../shared/anatomy/organParts.js';
import { shapedSphere, smoothstep } from '../../shared/geometry/shapes.js';
import { TubeSurface, smoothCurve } from '../../shared/geometry/tube.js';
import { mucosaMaterial, tissueMaterial, wallMaterial } from '../../shared/materials.js';

/**
 * The male genital tract from the testis to the outside, as one connected run.
 *
 * `prostateAnatomy.js` is the gland at its own scale; this is the **route**, and
 * it exists because the one thing a reader needs from male reproductive anatomy
 * is *what connects to what, in what order*. Sperm made in the testis has to
 * cross the epididymis, the vas, the ejaculatory duct and three lengths of
 * urethra before it is anywhere, and every one of those is a place something can
 * be interrupted deliberately or by disease.
 *
 * ## The order is the claim
 *
 * testis → epididymis (head, body, tail) → vas deferens → (seminal vesicle
 * joins) → ejaculatory duct → prostatic urethra → membranous urethra → spongy
 * urethra → external opening. Each segment's curve begins where the last one
 * ends, read from the curve rather than typed twice, so the chain cannot be
 * broken by moving a piece of it.
 *
 * ## What is schematic, and it is most of it
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. Lengths and calibres are drawn to be
 * legible; a real vas is about 45 cm of which most is coiled out of any diagram,
 * and a real epididymal duct is metres of tubing in a structure a few
 * centimetres long. **Nothing here is a measurement.** The scrotum, the
 * spermatic cord's coverings, the pampiniform plexus, the seminiferous tubules
 * and the erectile tissue's internal structure are not drawn.
 */

/** Where the testis sits, and how big it is drawn. */
export const TESTIS_SITE = Object.freeze([-0.62, -2.35, 0.12]);
export const TESTIS_SCALE = Object.freeze([0.3, 0.42, 0.28]);

/** Where the prostate is in this scene's frame, and how wide the gland is. */
export const PROSTATE_SITE = Object.freeze([0, -0.15, -0.18]);

/** The named lengths of the urethra, in the order urine and semen use them. */
export const URETHRA_SEGMENTS = Object.freeze([
  'prostatic-urethra',
  'membranous-urethra',
  'spongy-urethra',
]);

/** A testis: an ovoid, slightly flattened side to side. */
function testisWarp(v) {
  // A little pointed at the upper pole where the epididymis sits on it.
  v.y += 0.06 * smoothstep(0.4, 1, v.y);
}

/**
 * @param {{ colors?: Record<string, string>, opacity?: number, detail?: number }} [options]
 */
export function buildMaleTract({ colors = {}, opacity = 0.95, detail = 6 } = {}) {
  const object = new THREE.Group();
  object.name = 'male-tract';
  const disposables = [];
  const index = new Map();

  const add = (id, mesh) => {
    mesh.name = id;
    object.add(mesh);
    index.set(id, mesh);
    return mesh;
  };

  // A free end closes as a dome rather than a disc: the same reason the caecum
  // and the pancreatic head do. `capAt` says which ends are free.
  const dome = (t) => (t >= 1 ? 1 : Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t))));
  const tube = (id, points, radius, color, tubeOpacity = opacity, capAt = null) => {
    const curve = smoothCurve(points);
    const base = typeof radius === 'function' ? radius : () => radius;
    const shaped = capAt
      ? (u) =>
          base(u) *
          (capAt.start ? dome(u / 0.06) : 1) *
          (capAt.end ? dome((1 - u) / 0.06) : 1)
      : base;
    const surface = new TubeSurface(curve, { radius: shaped, steps: 48, radial: 12 });
    const material = wallMaterial({ color: colors[id] ?? color, opacity: tubeOpacity });
    disposables.push(surface, material);
    const mesh = add(id, new THREE.Mesh(surface.geometry, material));
    return { mesh, curve };
  };

  // --- the testis, on the patient's right ----------------------------------
  const testis = carveNamedParts({
    warp: testisWarp,
    scale: [...TESTIS_SCALE],
    cacheKey: 'testis',
    detail,
    opacity,
    parts: [
      {
        id: 'testis',
        color: colors.testis ?? '#d6c3a8',
      },
    ],
  });
  testis.object.position.set(...TESTIS_SITE);
  object.add(testis.object);
  testis.parts[0].mesh.name = 'testis';
  index.set('testis', testis.parts[0].mesh);

  // --- the epididymis, sitting on its back edge ----------------------------
  //
  // Head at the upper pole, body down the posterior border, tail at the lower
  // pole where it turns and becomes the vas. Drawn as one tube of three named
  // lengths, because the duct inside it *is* one tube — several metres of it.
  const [tx, ty, tz] = TESTIS_SITE;
  const epididymisPath = [
    [tx - 0.02, ty + 0.46, tz - 0.18],
    [tx - 0.05, ty + 0.18, tz - 0.28],
    [tx - 0.05, ty - 0.12, tz - 0.3],
    [tx - 0.02, ty - 0.4, tz - 0.24],
    [tx + 0.06, ty - 0.5, tz - 0.12],
  ];
  const epididymisCurve = smoothCurve(epididymisPath);
  const epididymisSurface = new TubeSurface(epididymisCurve, {
    // Head widest, body narrower, tail a little fuller again where it turns.
    radius: (u) => 0.115 - 0.06 * smoothstep(0, 0.42, u) + 0.03 * smoothstep(0.72, 1, u),
    steps: 60,
    radial: 14,
  });
  const epididymisMaterial = wallMaterial({ color: colors.epididymis ?? '#c8a37c', opacity });
  disposables.push(epididymisSurface, epididymisMaterial);
  const epididymis = add('epididymis', new THREE.Mesh(epididymisSurface.geometry, epididymisMaterial));

  // --- the vas, from the tail of the epididymis up to the prostate ---------
  const epididymisEnd = epididymisCurve.getPointAt(1);
  const [px, py, pz] = PROSTATE_SITE;
  const vas = tube(
    'vas-deferens',
    [
      epididymisEnd.toArray(),
      [tx + 0.12, ty + 0.3, tz - 0.34],
      [tx + 0.18, ty + 0.95, tz - 0.4],
      // Up over the pubic bone and back down behind the bladder: the loop that
      // makes a vasectomy reachable from the scrotum and nowhere else.
      [tx + 0.3, ty + 1.55, tz - 0.1],
      [tx + 0.52, ty + 1.82, tz - 0.45],
      [px - 0.24, py + 1.05, pz - 0.42],
      [px - 0.2, py + 0.62, pz - 0.34],
    ],
    0.05,
    '#9c6aa8'
  );

  // --- the seminal vesicle joining it --------------------------------------
  const vesicleGeometry = shapedSphere({
    detail: 5,
    scale: [0.13, 0.26, 0.12],
    warp: (v) => v.multiplyScalar(1 + 0.16 * Math.sin(v.y * 9) * Math.cos(v.x * 6)),
  });
  const vesicleMaterial = tissueMaterial({
    color: colors['seminal-vesicle'] ?? '#b58ac4',
    roughness: 0.45,
    opacity: 0.95,
  });
  disposables.push(vesicleGeometry, vesicleMaterial);
  const vesicle = add('seminal-vesicle', new THREE.Mesh(vesicleGeometry, vesicleMaterial));
  vesicle.position.set(px - 0.48, py + 0.86, pz - 0.5);
  vesicle.rotation.z = -0.45;

  // --- into the prostate ----------------------------------------------------
  const vasEnd = vas.curve.getPointAt(1);
  const verumontanum = new THREE.Vector3(px, py - 0.06, pz - 0.08);
  tube(
    'ejaculatory-duct',
    [vasEnd.toArray(), [px - 0.12, py + 0.3, pz - 0.24], verumontanum.toArray()],
    0.034,
    '#b05a8f'
  );

  const prostate = carveNamedParts({
    warp: (v) => {
      const down = smoothstep(0.15, -1, v.y);
      v.x *= 1 - 0.36 * down;
      v.z *= 1 - 0.36 * down;
    },
    scale: [0.42, 0.38, 0.4],
    cacheKey: 'male-tract-prostate',
    detail,
    opacity: 0.55,
    parts: [{ id: 'prostate', color: colors.prostate ?? '#c76b6f' }],
  });
  prostate.object.position.set(...PROSTATE_SITE);
  object.add(prostate.object);
  prostate.parts[0].mesh.name = 'prostate';
  index.set('prostate', prostate.parts[0].mesh);

  // --- the urethra, in its three named lengths -----------------------------
  //
  // Three segments of one channel. The membranous part is the short stretch
  // between the prostate's apex and the bulb, where the external sphincter is
  // and where a catheter meets its resistance; it is also the part that tears.
  const bladderNeck = [px, py + 0.5, pz + 0.02];
  const apex = [px, py - 0.44, pz + 0.12];
  const bulb = [px, py - 0.78, pz + 0.3];

  tube('prostatic-urethra', [bladderNeck, [px, py, pz - 0.02], apex], 0.062, '#8fd6c4');
  tube('membranous-urethra', [apex, [px, py - 0.62, pz + 0.2], bulb], 0.05, '#5fbda8');
  const spongy = tube(
    'spongy-urethra',
    [
      bulb,
      [px, py - 0.92, pz + 0.72],
      [px, py - 0.9, pz + 1.5],
      [px, py - 0.88, pz + 2.25],
    ],
    0.05,
    '#8fd6c4'
  );

  // The corpus spongiosum around that last stretch, and the two corpora
  // cavernosa above it. Drawn as three tubes because that is what they are:
  // three columns, one of which carries the urethra.
  // Starting at the bulb, which is its own proximal end and where the urethra
  // enters it — not in front of it. Widest there and at the glans, narrower
  // between, which is the shape that makes "the urethra is inside this one"
  // true along the whole of it.
  tube(
    'corpus-spongiosum',
    [
      [px, py - 0.82, pz + 0.18],
      [px, py - 0.9, pz + 0.7],
      [px, py - 0.9, pz + 1.4],
      [px, py - 0.88, pz + 2.1],
      [px, py - 0.86, pz + 2.46],
    ],
    (u) => 0.13 + 0.07 * smoothstep(0.16, 0, u) + 0.09 * smoothstep(0.84, 1, u),
    '#c98d8d',
    0.45,
    { start: true, end: true }
  );
  for (const side of [-1, 1]) {
    const id = side < 0 ? 'right-corpus-cavernosum' : 'left-corpus-cavernosum';
    tube(
      id,
      [
        [px + side * 0.16, py - 0.62, pz + 0.28],
        [px + side * 0.13, py - 0.72, pz + 1.0],
        [px + side * 0.12, py - 0.7, pz + 1.8],
        [px + side * 0.12, py - 0.69, pz + 2.2],
      ],
      0.12,
      '#b8686c',
      0.45,
      { start: true, end: true }
    );
  }

  // Where it opens.
  const meatusGeometry = shapedSphere({ detail: 3, scale: [0.05, 0.045, 0.05] });
  const meatusMaterial = mucosaMaterial({ color: colors['external-urethral-orifice'] ?? '#c8603f' });
  disposables.push(meatusGeometry, meatusMaterial);
  const meatus = add('external-urethral-orifice', new THREE.Mesh(meatusGeometry, meatusMaterial));
  meatus.position.copy(spongy.curve.getPointAt(1));

  // --- what it starts and ends between --------------------------------------
  const bladderGeometry = shapedSphere({
    detail: 5,
    scale: [0.46, 0.4, 0.42],
    warp: (v) => {
      const low = smoothstep(-0.5, -1, v.y);
      v.x *= 1 - 0.4 * low;
      v.z *= 1 - 0.4 * low;
    },
  });
  const bladderMaterial = wallMaterial({ color: colors.bladder ?? '#c8a6b8', opacity: 0.45 });
  disposables.push(bladderGeometry, bladderMaterial);
  const bladder = add('bladder', new THREE.Mesh(bladderGeometry, bladderMaterial));
  bladder.position.set(px, py + 0.92, pz + 0.04);

  return {
    object,
    index,
    mesh: (id) => index.get(id),
    /** The route, in order, for a scene or a test that walks it. */
    route: Object.freeze([
      'testis',
      'epididymis',
      'vas-deferens',
      'ejaculatory-duct',
      'prostatic-urethra',
      'membranous-urethra',
      'spongy-urethra',
    ]),
    anchorPoints: {
      testis: new THREE.Vector3(...TESTIS_SITE),
      epididymisTail: epididymisCurve.getPointAt(1),
      verumontanum: verumontanum.clone(),
      bladderNeck: new THREE.Vector3(...bladderNeck),
      apex: new THREE.Vector3(...apex),
      meatus: spongy.curve.getPointAt(1),
    },
    anchors: {
      testis: new THREE.Vector3(tx - 0.85, ty - 0.2, tz + 0.6),
      prostate: new THREE.Vector3(px - 1.0, py, pz + 0.6),
    },
    dispose() {
      testis.dispose();
      prostate.dispose();
      for (const item of disposables) item.dispose?.();
    },
  };
}
