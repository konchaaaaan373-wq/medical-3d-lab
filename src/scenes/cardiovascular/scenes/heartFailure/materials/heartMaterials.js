import * as THREE from 'three';
import { createRandom } from '../../../../../utils/math.js';

/**
 * Tissue materials for the heart chamber.
 *
 * Three surfaces, three readings:
 *   - epicardium: smooth, faintly wet muscle with a hint of superficial
 *     coronary vessels — sheen and a soft clearcoat, never gloss
 *   - endocardium: the cavity lining — smoother and lighter, with a fine
 *     trabecular texture toward the apex
 *   - cut myocardium: matte, fibrous, slightly uneven — the surface that has
 *     to read as tissue rather than as a CG cross-section
 *
 * All texture detail is procedural (seeded canvas noise), so there are no
 * asset files and the look is identical on every load. Textures are built
 * once and shared between the disease heart and the reference heart; the
 * two variants differ only in their tint.
 *
 * Every visual constant in here is presentation, not physiology — colours
 * approximate fixed-tissue illustration palettes, not any measurement.
 */

const textureCache = new Map();

function canvasTexture(key, size, draw) {
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext('2d');
  draw(ctx, size.w, size.h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
}

/** Soft radial blob helper. */
function blob(ctx, x, y, r, fill) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, fill);
  g.addColorStop(1, 'rgba(128,128,128,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Layered organic mottling around mid-grey. Used as a multiplied colour map
 * (the material's own colour carries the tissue hue) and reused as bump and
 * roughness variation.
 */
function mottleTexture() {
  return canvasTexture('mottle', { w: 512, h: 512 }, (ctx, w, h) => {
    const rnd = createRandom(1105);
    ctx.fillStyle = 'rgb(148,142,140)';
    ctx.fillRect(0, 0, w, h);
    // Large soft blotches: slow colour variation across the surface.
    for (let i = 0; i < 90; i++) {
      const warm = rnd() > 0.5;
      const a = 0.09 + rnd() * 0.12;
      blob(
        ctx,
        rnd() * w,
        rnd() * h,
        40 + rnd() * 110,
        warm ? `rgba(190,150,140,${a})` : `rgba(105,95,105,${a})`
      );
    }
    // Mid-scale mottle.
    for (let i = 0; i < 700; i++) {
      const bright = rnd() > 0.45;
      const a = 0.09 + rnd() * 0.13;
      blob(ctx, rnd() * w, rnd() * h, 6 + rnd() * 22, bright ? `rgba(185,168,160,${a})` : `rgba(96,88,96,${a})`);
    }
    // Fine grain.
    for (let i = 0; i < 5200; i++) {
      const v = 118 + Math.floor(rnd() * 64);
      ctx.fillStyle = `rgba(${v},${v - 4},${v - 2},${0.09 + rnd() * 0.12})`;
      const s = 1 + rnd() * 2.4;
      ctx.fillRect(rnd() * w, rnd() * h, s, s);
    }
  });
}

/**
 * Epicardial colour map: the mottle plus a faint superficial coronary tree
 * descending from the base (v=1) toward the apex (v=0), the single strongest
 * "this is a heart" cue at close range. Drawn dark and low-contrast so it
 * reads as vessels under a wet surface, not as lines painted on.
 */
function epicardiumTexture() {
  return canvasTexture('epicardium', { w: 512, h: 512 }, (ctx, w, h) => {
    ctx.drawImage(mottleTexture().image, 0, 0);
    const rnd = createRandom(2207);

    const drawBranch = (x, y, angle, width, length, depth) => {
      if (depth <= 0 || width < 0.5) return;
      ctx.strokeStyle = `rgba(64,36,46,${0.11 + width * 0.02})`;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      let cx = x;
      let cy = y;
      const steps = 5;
      for (let s = 0; s < steps; s++) {
        angle += (rnd() - 0.5) * 0.55;
        cx += Math.cos(angle) * (length / steps);
        cy += Math.sin(angle) * (length / steps);
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      const forks = 1 + Math.floor(rnd() * 2);
      for (let f = 0; f < forks; f++) {
        drawBranch(
          cx,
          cy,
          angle + (rnd() - 0.5) * 1.5,
          width * (0.5 + rnd() * 0.25),
          length * (0.55 + rnd() * 0.25),
          depth - 1
        );
      }
    };

    // Texture v=1 is the base, and canvas y=0 is v=1 — trees start at the top
    // and descend. u wraps three times around the heart, so three trees give
    // roughly one visible main vessel per aspect.
    for (const u of [0.14, 0.47, 0.8]) {
      drawBranch(u * w, h * 0.04, Math.PI / 2 + (rnd() - 0.5) * 0.5, 3.0, h * 0.36, 3);
    }
  });
}

/**
 * Cut-myocardium map: fibre striations running along u (which the geometry
 * maps apex -> base, parallel to the wall surfaces) over a dense grain.
 */
function fiberTexture() {
  return canvasTexture('fiber', { w: 512, h: 256 }, (ctx, w, h) => {
    const rnd = createRandom(3309);
    ctx.fillStyle = 'rgb(150,138,138)';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      const a = 0.05 + rnd() * 0.06;
      blob(ctx, rnd() * w, rnd() * h, 24 + rnd() * 60, rnd() > 0.5 ? `rgba(196,158,150,${a})` : `rgba(96,82,90,${a})`);
    }
    // Low-frequency tissue heterogeneity: large soft irregular patches, so
    // no scale of the surface reads as a repeating pattern.
    for (let i = 0; i < 110; i++) {
      const a = 0.09 + rnd() * 0.12;
      blob(ctx, rnd() * w, rnd() * h, 26 + rnd() * 80, rnd() > 0.5 ? `rgba(200,164,154,${a})` : `rgba(88,72,80,${a})`);
    }
    // A sparse, faint suggestion of fibre direction: short strokes at gently
    // varying angles — never rows, never stripes.
    for (let i = 0; i < 170; i++) {
      const y = rnd() * h;
      const x = rnd() * w;
      const len = 18 + rnd() * 42;
      const angle = (rnd() - 0.5) * 0.7;
      const dark = rnd() > 0.5;
      const v = dark ? 108 + rnd() * 22 : 172 + rnd() * 26;
      ctx.strokeStyle = `rgba(${v},${v * 0.9},${v * 0.92},${0.07 + rnd() * 0.09})`;
      ctx.lineWidth = 0.7 + rnd() * 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(angle) * len * 0.5,
        y + Math.sin(angle) * len * 0.5 + (rnd() - 0.5) * 4,
        x + Math.cos(angle) * len,
        y + Math.sin(angle) * len
      );
      ctx.stroke();
    }
    // Fine speckle, so flat regions never read as a solid fill.
    for (let i = 0; i < 3200; i++) {
      const v = 110 + Math.floor(rnd() * 72);
      ctx.fillStyle = `rgba(${v},${v - 8},${v - 4},${0.1 + rnd() * 0.13})`;
      ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
    }
  });
}

/**
 * Endocardial map: smoother mottle with wavy trabecular ridges in the apical
 * half (v < 0.5), fading out toward the base where the lining is smooth.
 */
function endocardiumTexture() {
  return canvasTexture('endocardium', { w: 512, h: 512 }, (ctx, w, h) => {
    const rnd = createRandom(4411);
    ctx.fillStyle = 'rgb(150,144,144)';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 320; i++) {
      const a = 0.07 + rnd() * 0.1;
      blob(ctx, rnd() * w, rnd() * h, 8 + rnd() * 30, rnd() > 0.5 ? `rgba(188,168,164,${a})` : `rgba(104,94,102,${a})`);
    }
    // Trabeculae: ridges roughly along the long axis, apex half only.
    // v=0 (apex) is canvas y = h.
    for (let i = 0; i < 150; i++) {
      const yTop = h * (0.45 + rnd() * 0.5);
      const x = rnd() * w;
      const len = 24 + rnd() * 60;
      const bright = rnd() > 0.5;
      const v = bright ? 194 + rnd() * 36 : 84 + rnd() * 26;
      const fade = (yTop - h * 0.45) / (h * 0.55); // stronger toward the apex
      ctx.strokeStyle = `rgba(${v},${v * 0.92},${v * 0.94},${(0.22 + rnd() * 0.24) * (0.35 + 0.65 * fade)})`;
      ctx.lineWidth = 1.6 + rnd() * 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, yTop);
      ctx.bezierCurveTo(
        x + (rnd() - 0.5) * 10,
        yTop + len * 0.4,
        x + (rnd() - 0.5) * 10,
        yTop + len * 0.7,
        x + (rnd() - 0.5) * 6,
        yTop + len
      );
      ctx.stroke();
    }
    for (let i = 0; i < 2600; i++) {
      const v = 122 + Math.floor(rnd() * 56);
      ctx.fillStyle = `rgba(${v},${v - 4},${v - 2},${0.07 + rnd() * 0.1})`;
      ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
    }
  });
}

/**
 * The same organic mottle the myocardium uses, for the vessel and atrial
 * walls. Without it those surfaces are perfectly smooth, which is what made
 * them read as moulded rubber next to the textured chamber.
 *
 * Returns null where there is no DOM (the Node test runner).
 */
export function vesselDetailTexture() {
  return typeof document === 'undefined' ? null : mottleTexture();
}

/** Tints per variant. Presentation values, not measurements. */
const VARIANTS = {
  disease: {
    epicardium: '#8d3e49',
    endocardium: '#b26e76',
    cut: '#7e343f',
  },
  // Desaturated: the reference heart is the yardstick, not the subject.
  reference: {
    epicardium: '#8a636d',
    endocardium: '#a0838a',
    cut: '#6e4c55',
  },
};

/**
 * The three materials for one heart, as an array indexed the way the
 * geometry's groups expect: [epicardium, cut, endocardium].
 *
 * In a DOM-less environment (the Node test runner) canvas textures are not
 * available, so the same materials are returned untextured — geometry tests
 * need constructable meshes, not pixels.
 *
 * @param {'disease'|'reference'} variant
 */
export function createHeartMaterials(variant = 'disease') {
  const tint = VARIANTS[variant] ?? VARIANTS.disease;
  const hasDom = typeof document !== 'undefined';

  const epicardium = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tint.epicardium),
    map: hasDom ? epicardiumTexture() : null,
    bumpMap: hasDom ? mottleTexture() : null,
    bumpScale: 0.9,
    roughnessMap: hasDom ? mottleTexture() : null,
    roughness: 0.72,
    metalness: 0,
    // A soft, rough clearcoat: serous moisture, not gloss. Kept low because a
    // clearcoat highlight is white whatever colour the tissue underneath is,
    // and at a grazing silhouette edge Fresnel drives it toward full
    // reflectance — which is how one corner of the basal shoulder was
    // rendering as a pure white blob, the brightest thing in the close-up by
    // some margin, on a piece of muscle.
    clearcoat: 0.1,
    clearcoatRoughness: 0.78,
    // Sheen gives the broad, soft backscatter of organic surfaces — the
    // closest cheap stand-in for subsurface scattering.
    sheen: 0.3,
    sheenRoughness: 0.65,
    sheenColor: new THREE.Color('#e2837c'),
    envMapIntensity: 0.34,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
  });

  const cut = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tint.cut),
    map: hasDom ? fiberTexture() : null,
    bumpMap: hasDom ? fiberTexture() : null,
    bumpScale: 1.05,
    roughnessMap: hasDom ? fiberTexture() : null,
    roughness: 0.88,
    metalness: 0,
    clearcoat: 0.05,
    clearcoatRoughness: 0.8,
    sheen: 0.18,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color('#d97a70'),
    envMapIntensity: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
  });

  const endocardium = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tint.endocardium),
    map: hasDom ? endocardiumTexture() : null,
    bumpMap: hasDom ? endocardiumTexture() : null,
    bumpScale: 1.55,
    roughnessMap: hasDom ? endocardiumTexture() : null,
    // Rougher than it was: a smooth lining threw one long white specular
    // streak down the cavity, which is what read as wax rather than as a wet
    // biological surface. Broken up by the bump, never mirror-flat. Raised
    // again after the apical trabecular relief still caught one broad pale
    // sheet of highlight in close-up.
    roughness: 0.78,
    metalness: 0,
    // Moist, but matte enough that the cavity never throws one big smooth
    // highlight — the lamp-like blob was the single worst plastic cue.
    clearcoat: 0.05,
    clearcoatRoughness: 0.72,
    sheen: 0.3,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color('#e89a92'),
    envMapIntensity: 0.24,
    // Lifts the cavity where lights cannot reach; kept faint so the vertex
    // AO baked into the geometry still shapes it.
    emissive: new THREE.Color('#3a1418'),
    emissiveIntensity: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
  });

  return [epicardium, cut, endocardium];
}

/** Tints for the valve apparatus per variant. */
const APPARATUS_VARIANTS = {
  disease: { papillary: '#ad6570', leaflet: '#d6c3b6', chordae: '#ab958c' },
  reference: { papillary: '#8d6b75', leaflet: '#cdc2ba', chordae: '#9c8a83' },
};

/**
 * Materials for the papillary muscles, valve leaflets and chordae.
 *
 * The papillary muscles share the endocardial texture so they read as the
 * same tissue as the wall they rise from; leaflets and chordae are pale,
 * membranous, and slightly translucent — fibrous valve tissue, not muscle.
 *
 * @param {'disease'|'reference'} variant
 */
export function createApparatusMaterials(variant = 'disease') {
  const tint = APPARATUS_VARIANTS[variant] ?? APPARATUS_VARIANTS.disease;
  const hasDom = typeof document !== 'undefined';

  const papillary = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tint.papillary),
    map: hasDom ? endocardiumTexture() : null,
    bumpMap: hasDom ? endocardiumTexture() : null,
    bumpScale: 1.0,
    roughness: 0.62,
    metalness: 0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.55,
    sheen: 0.3,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color('#e2837c'),
    envMapIntensity: 0.45,
    transparent: true,
    opacity: 1,
  });

  const leaflet = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tint.leaflet),
    map: hasDom ? mottleTexture() : null,
    roughness: 0.56,
    metalness: 0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.5,
    // Sheen carries most of the reading: a valve leaflet is a thin fibrous
    // membrane that glows softly at grazing angles rather than reflecting.
    sheen: 0.55,
    sheenRoughness: 0.4,
    sheenColor: new THREE.Color('#f4e4d8'),
    envMapIntensity: 0.35,
    transparent: true,
    // Thin enough that the cavity behind it shows faintly through — a plate
    // at full opacity was what made the valves read as mechanical parts.
    opacity: 0.7,
    side: THREE.DoubleSide,
  });

  // Chordae read best when they are only just visible: at full brightness a
  // bundle of pale cords across a pink cavity reads as harp strings, which is
  // the one thing they must not look like.
  const chordae = new THREE.MeshStandardMaterial({
    color: new THREE.Color(tint.chordae),
    roughness: 0.88,
    metalness: 0,
    transparent: true,
    opacity: 0.6,
  });

  return { papillary, leaflet, chordae };
}
