import * as THREE from 'three';
import { smoothstep } from '../../../../utils/math.js';

/**
 * Where a vessel is drawn to, as one rule that the renderer and every question
 * asked of the model share.
 *
 * Two things end a vessel on screen without ending it in the anatomy:
 *
 * - **A reach.** A branch is drawn from where it leaves its parent for a set
 *   distance along its own direction, and fades out over the last part of it
 *   (`HEART_VESSELS[].reach`). The left common carotid, which the source draws
 *   up into the neck, stops at the same height as the schematic right one.
 * - **A trim.** With only the heart shown, a root of a great vessel is drawn up
 *   to a margin outside the box round the heart and fades out beyond it
 *   (`HEART_ONLY_TRIM`). `strength` runs from 0 (not trimmed) to 1, so the
 *   switch between the two ways of looking can ease rather than jump.
 *
 * ## Why one function and one shader, and not two approximations
 *
 * A ray does not know a fragment was discarded. If the shader fades a branch
 * out and the picking does not know, the invisible end of it still takes the
 * click and still hides the label of whatever is behind it — the same trap the
 * anatomy contract describes for isolation. So `displayRangeAlpha` is the
 * shader's arithmetic written again in JavaScript, term for term, and the scene
 * asks it about every hit, every label anchor and every bound. Change one and
 * change the other; `tests/heart-anatomy.test.js` holds them to each other.
 *
 * ## Why the fade is blended, and drawn after the heart
 *
 * Blended transparency is sorted per object, not per fragment, so a root
 * fading out just in front of an atrium could be drawn first, write depth, and
 * leave the atrium undrawn behind its faded end — a hole in the heart with the
 * background showing through. The first answer was `alphaHash`, which draws
 * every surviving fragment opaque: depth was right, and the fade came out as
 * a sparkle of loose pixels that read as noise, not as a vessel continuing.
 * So the fade is blended, and every ranged mesh is drawn **after** every
 * other part (`RANGED_RENDER_ORDER`): by the time a faded end is blended, the
 * heart behind it is already in the frame.
 *
 * Among the ranged meshes themselves, a faded end still writes depth (the
 * material is opaque; only the fragment's alpha is lowered). A review asked
 * whether that cuts a gap where the schematic neck arteries leave the
 * brachiocephalic trunk's faded tip. Rendered from six sides on 2026-10-01: it
 * does not, and turning depth writes off for ranged meshes was the defect —
 * the schematic tubes showed through the tip as a pipe inside a pipe.
 */

/** Drawn after everything without a range, so a fading end blends over the heart. */
export const RANGED_RENDER_ORDER = 1;

/** Everything a mesh's range can say, in world units. Mutated in place. */
export function createDisplayRange() {
  return {
    reach: null,
    trim: null,
  };
}

/**
 * @param {{from: THREE.Vector3, axis: THREE.Vector3, visible: number, fade: number}} reach
 */
export function setReach(range, reach) {
  range.reach = reach ? { ...reach, axis: reach.axis.clone().normalize() } : null;
}

/**
 * @param {{centre: THREE.Vector3, half: THREE.Vector3, margin: number, fade: number, strength: number}} trim
 */
export function setTrim(range, trim) {
  range.trim = trim;
}

const scratch = new THREE.Vector3();

/**
 * How much of a mesh is drawn at a world point: 1 fully, 0 not at all.
 *
 * The same arithmetic as `DISPLAY_RANGE_GLSL`, in the same order.
 *
 * @param {ReturnType<typeof createDisplayRange>|null|undefined} range
 * @param {THREE.Vector3} point world space
 */
export function displayRangeAlpha(range, point) {
  if (!range) return 1;
  let alpha = 1;
  const { reach, trim } = range;
  if (reach) {
    const along = scratch.copy(point).sub(reach.from).dot(reach.axis);
    alpha *= 1 - smoothstep(reach.visible - reach.fade, reach.visible, along);
  }
  if (trim && trim.strength > 0) {
    const d = scratch.copy(point).sub(trim.centre);
    const qx = Math.max(Math.abs(d.x) - trim.half.x, 0);
    const qy = Math.max(Math.abs(d.y) - trim.half.y, 0);
    const qz = Math.max(Math.abs(d.z) - trim.half.z, 0);
    const outside = Math.hypot(qx, qy, qz);
    const kept = 1 - smoothstep(trim.margin, trim.margin + trim.fade, outside);
    alpha *= 1 + (kept - 1) * trim.strength;
  }
  return alpha;
}

/** Below this a fragment is discarded outright, in the shader and in a ray alike. */
export const DISPLAY_RANGE_FLOOR = 0.02;

const DISPLAY_RANGE_GLSL = /* glsl */ `
uniform vec4 uReachFrom;
uniform vec4 uReachAxis;
uniform float uReachFade;
uniform vec4 uTrimCentre;
uniform vec4 uTrimHalf;
uniform float uTrimFade;
varying vec3 vRangeWorld;
float displayRangeAlpha() {
  float alpha = 1.0;
  if (uReachFrom.w > 0.5) {
    float along = dot(vRangeWorld - uReachFrom.xyz, uReachAxis.xyz);
    alpha *= 1.0 - smoothstep(uReachAxis.w - uReachFade, uReachAxis.w, along);
  }
  if (uTrimCentre.w > 0.0) {
    vec3 q = max(abs(vRangeWorld - uTrimCentre.xyz) - uTrimHalf.xyz, 0.0);
    float kept = 1.0 - smoothstep(uTrimHalf.w, uTrimHalf.w + uTrimFade, length(q));
    alpha *= 1.0 + (kept - 1.0) * uTrimCentre.w;
  }
  return alpha;
}
`;

/**
 * Teach a material to draw only its range.
 *
 * The uniforms read the range object on every frame (`onBeforeRender` of the
 * material would be one more hook; a getter on the uniform is the same thing
 * with nothing to remember), so setting a trim strength or a reach on the
 * range is all a caller ever does.
 *
 * @param {THREE.MeshStandardMaterial} material
 * @param {ReturnType<typeof createDisplayRange>} range
 */
export function installDisplayRange(material, range) {
  // **All four components zero.** The shader reads `w` as "on": a reach is on
  // when `uReachFrom.w > 0.5` and a trim when `uTrimCentre.w > 0`. A bare
  // `new THREE.Vector4()` is (0, 0, 0, **1**), and with it every branch that
  // has no trim was trimmed on the GPU to a one-unit sphere round the heart
  // while every JavaScript measurement said it was drawn —
  // `tests/heart-display-range.test.js` now reads the uniforms the way the
  // GPU does.
  const zero = new THREE.Vector4(0, 0, 0, 0);
  const uniforms = {
    uReachFrom: { get value() { return range.reach ? v4(range.reach.from, 1) : zero; } },
    uReachAxis: { get value() { return range.reach ? v4(range.reach.axis, range.reach.visible) : zero; } },
    uReachFade: { get value() { return range.reach?.fade ?? 1; } },
    uTrimCentre: { get value() { return range.trim ? v4(range.trim.centre, range.trim.strength) : zero; } },
    uTrimHalf: { get value() { return range.trim ? v4(range.trim.half, range.trim.margin) : zero; } },
    uTrimFade: { get value() { return range.trim?.fade ?? 1; } },
  };
  // Blended, like every other part of this scene; see the top of this file
  // for why the order it is drawn in is what makes that safe.
  material.transparent = true;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRangeWorld;')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\nvRangeWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${DISPLAY_RANGE_GLSL}`)
      .replace(
        '#include <alphatest_fragment>',
        `float rangeAlpha = displayRangeAlpha();\nif (rangeAlpha < ${DISPLAY_RANGE_FLOOR.toFixed(3)}) discard;\n` +
          'diffuseColor.a *= rangeAlpha;\n#include <alphatest_fragment>'
      );
  };
  // One program for every ranged material: the range is in the uniforms.
  material.customProgramCacheKey = () => 'heart-display-range-v1';
  material.needsUpdate = true;
  return uniforms;
}

const vectors = new WeakMap();
/** A Vector4 per source vector, reused, so a uniform read allocates nothing. */
function v4(vector, w) {
  let out = vectors.get(vector);
  if (!out) {
    out = new THREE.Vector4();
    vectors.set(vector, out);
  }
  return out.set(vector.x, vector.y, vector.z, w);
}
