import * as THREE from 'three';

/**
 * Renderer presets, not just canvas colours.
 *
 * Tissue, fog and emissive mechanisms all respond differently to a pale field.
 * Keeping the full calibration together prevents a "white background" button
 * from washing the model out while the dark-scene exposure remains active.
 */
export const BACKGROUND_PRESETS = Object.freeze([
  Object.freeze({
    id: 'graphite',
    label: 'Graphite',
    labelJa: '黒',
    tone: 'dark',
    swatch: '#070b14',
    backdrop: Object.freeze({ top: '#0b1020', bottom: '#04060c', accent: '#12324a', halo: 0.35 }),
    fog: '#05070d',
    fogDensity: 0.017,
    environmentIntensity: 0.45,
    exposure: 1.05,
    bloomStrength: 0.32,
  }),
  Object.freeze({
    id: 'studio',
    label: 'Neutral studio',
    labelJa: '明灰',
    tone: 'light',
    swatch: '#cbd1d4',
    backdrop: Object.freeze({ top: '#e3e7e8', bottom: '#bcc4c8', accent: '#f6f7f5', halo: 0.18 }),
    fog: '#c9d0d3',
    fogDensity: 0.012,
    environmentIntensity: 0.62,
    exposure: 0.94,
    bloomStrength: 0.2,
  }),
  Object.freeze({
    id: 'paper',
    label: 'Paper',
    labelJa: '白',
    tone: 'light',
    swatch: '#f3f3f0',
    backdrop: Object.freeze({ top: '#fafaf7', bottom: '#e9ebe8', accent: '#ffffff', halo: 0.08 }),
    fog: '#f0f1ee',
    fogDensity: 0.009,
    environmentIntensity: 0.7,
    exposure: 0.9,
    bloomStrength: 0.14,
  }),
]);

export const DEFAULT_BACKGROUND_ID = BACKGROUND_PRESETS[0].id;

/** Unknown persisted/meta values resolve to the safe shipped default. */
export function backgroundPresetById(id) {
  return BACKGROUND_PRESETS.find((preset) => preset.id === id) ?? BACKGROUND_PRESETS[0];
}

/**
 * Generates reproducible camera moves without claiming anatomical direction.
 *
 * `Home` is copied exactly from the scene. The other poses keep its target and
 * distance. Left/right/opposite rotate the camera around model-up; above/below
 * retain a slight horizontal component so OrbitControls never hits a look-at
 * pole and flips its azimuth.
 *
 * @param {{ position: THREE.Vector3, target: THREE.Vector3 }} pose
 */
export function standardInspectionViews(pose) {
  const target = pose.target.clone();
  const offset = pose.position.clone().sub(target);
  const distance = offset.length();
  if (!Number.isFinite(distance) || distance <= 0) {
    throw new TypeError('Inspection views require a finite camera pose outside its target');
  }

  const horizontal = new THREE.Vector3(offset.x, 0, offset.z);
  if (horizontal.lengthSq() < distance * distance * 1e-4) horizontal.set(0, 0, 1);
  horizontal.normalize();

  const elevation = THREE.MathUtils.clamp(offset.y / distance, -0.78, 0.78);
  const horizontalScale = Math.sqrt(1 - elevation * elevation);
  const homeDirection = horizontal.clone().multiplyScalar(horizontalScale);
  homeDirection.y = elevation;

  const turn = (radians) => homeDirection.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), radians);
  // Tilt from the authored direction rather than forcing a technical top view.
  // Many causal models are intentionally shallow; a 90° side/top view would
  // collapse them to a line. The clamp stays inside the shared OrbitControls
  // polar limits and avoids the azimuth singularity at a true pole.
  const elevationAngle = Math.asin(elevation);
  const tilted = (sign) => {
    const angle = THREE.MathUtils.clamp(elevationAngle + sign * Math.PI / 4, -0.98, 0.98);
    return horizontal.clone().multiplyScalar(Math.cos(angle)).add(new THREE.Vector3(0, Math.sin(angle), 0));
  };
  const at = (direction) => ({
    position: target.clone().addScaledVector(direction, distance),
    target: target.clone(),
  });

  return [
    {
      id: 'home', label: 'Home', labelJa: '基準', kind: 'model-relative',
      position: pose.position.clone(), target: target.clone(),
    },
    // A quarter-oblique keeps planar mechanisms legible while still exposing
    // depth. Orthogonal anatomical views are authored by scenes that own axes.
    { id: 'turn-left', label: 'Turn left', labelJa: '左へ', kind: 'model-relative', ...at(turn(Math.PI / 4)) },
    { id: 'turn-right', label: 'Turn right', labelJa: '右へ', kind: 'model-relative', ...at(turn(-Math.PI / 4)) },
    { id: 'opposite', label: 'Opposite', labelJa: '裏側', kind: 'model-relative', ...at(turn(Math.PI)) },
    { id: 'above', label: 'Tilt up', labelJa: '上へ', kind: 'model-relative', ...at(tilted(1)) },
    { id: 'below', label: 'Tilt down', labelJa: '下へ', kind: 'model-relative', ...at(tilted(-1)) },
  ];
}
