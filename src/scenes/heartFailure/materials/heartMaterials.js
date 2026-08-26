import * as THREE from 'three';
import { createRandom } from '../../../utils/math.js';

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
      ctx.strokeStyle = `rgba(60,32,44,${0.24 + width * 0.04})`;
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
      // A faint parallel highlight, hinting at a rounded vessel.
      ctx.strokeStyle = `rgba(214,178,170,${0.06 + width * 0.012})`;
      ctx.lineWidth = Math.max(0.4, width * 0.4);
      ctx.beginPath();
      ctx.moveTo(x - width * 0.6, y);
      cx = x - width * 0.6;
      cy = y;
      for (let s = 0; s < steps; s++) {
        cx += Math.cos(angle) * (length / steps) * 0.96;
        cy += Math.sin(angle) * (length / steps) * 0.96;
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
      drawBranch(u * w, h * 0.04, Math.PI / 2 + (rnd() - 0.5) * 0.5, 3.6, h * 0.4, 4);
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
    // Striations: long, slightly wavy strokes along u.
    for (let i = 0; i < 640; i++) {
      const y = rnd() * h;
      const x = rnd() * w;
      const len = 26 + rnd() * 80;
      const dark = rnd() > 0.42;
      const v = dark ? 78 + rnd() * 26 : 190 + rnd() * 40;
      ctx.strokeStyle = `rgba(${v},${v * 0.9},${v * 0.92},${0.28 + rnd() * 0.26})`;
      ctx.lineWidth = 0.6 + rnd() * 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(
        x + len * 0.33,
        y + (rnd() - 0.5) * 7,
        x + len * 0.66,
        y + (rnd() - 0.5) * 7,
        x + len,
        y + (rnd() - 0.5) * 4
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

/** Tints per variant. Presentation values, not measurements. */
const VARIANTS = {
  disease: {
    epicardium: '#96434d',
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
    // A soft, rough clearcoat: serous moisture, not gloss.
    clearcoat: 0.32,
    clearcoatRoughness: 0.52,
    // Sheen gives the broad, soft backscatter of organic surfaces — the
    // closest cheap stand-in for subsurface scattering.
    sheen: 0.4,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color('#e2837c'),
    envMapIntensity: 0.7,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
  });

  const cut = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(tint.cut),
    map: hasDom ? fiberTexture() : null,
    bumpMap: hasDom ? fiberTexture() : null,
    bumpScale: 2.2,
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
    bumpScale: 1.2,
    roughnessMap: hasDom ? endocardiumTexture() : null,
    roughness: 0.55,
    metalness: 0,
    // Wetter than the outside: the lining is bathed in blood.
    clearcoat: 0.5,
    clearcoatRoughness: 0.35,
    sheen: 0.35,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color('#e89a92'),
    envMapIntensity: 0.6,
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
