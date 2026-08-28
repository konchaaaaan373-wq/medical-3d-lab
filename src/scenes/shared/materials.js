import * as THREE from 'three';

/**
 * Materials shared by the organ scenes.
 *
 * One place, so twenty organs read as one atlas rather than twenty separate
 * demos: the same roughness range, the same restrained emissive, the same
 * behaviour under the viewer's studio environment map. Colour is the only thing
 * an organ normally chooses.
 *
 * These are visualisation parameters. Nothing here is a clinical value, and
 * nothing here should ever be named as if it were one.
 */

/** Soft, slightly damp tissue: the default for anything parenchymal. */
export function tissueMaterial({
  color,
  roughness = 0.58,
  metalness = 0.02,
  emissive = color,
  emissiveIntensity = 0.05,
  opacity = 1,
  side = THREE.FrontSide,
  flatShading = false,
} = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness,
    emissive: new THREE.Color(emissive),
    emissiveIntensity,
    transparent: opacity < 1,
    opacity,
    side,
    flatShading,
    depthWrite: opacity > 0.85,
  });
}

/** A hollow organ seen from inside as well as out — stomach, bowel, bladder. */
export function wallMaterial({ color, opacity = 0.92, roughness = 0.5 } = {}) {
  return tissueMaterial({ color, roughness, opacity, side: THREE.DoubleSide, emissiveIntensity: 0.07 });
}

/** Wet, brighter surfaces: mucosa, serosa highlights, capsule sheen. */
export function mucosaMaterial({ color, opacity = 1 } = {}) {
  return tissueMaterial({ color, roughness: 0.32, metalness: 0.05, emissiveIntensity: 0.09, opacity });
}

/** Bone and cartilage: dry, bright, low emissive. */
export function mineralMaterial({ color = '#e8e5da', roughness = 0.72 } = {}) {
  return tissueMaterial({ color, roughness, metalness: 0.0, emissiveIntensity: 0.02 });
}

/** The see-through body shell in the whole-body view, and any cutaway sheath. */
export function ghostMaterial({ color = '#5f7bb5', opacity = 0.09 } = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.9,
    metalness: 0,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/**
 * Points material for flow particles.
 *
 * Written as a shader rather than a sprite texture on purpose: a canvas-drawn
 * texture cannot be built in the test environment, and every prototype scene is
 * constructed head-less in `tests/prototype-scenes.test.js`.
 */
export function particleMaterial({ color, size = 6.5, opacity = 0.9 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uSize: { value: size },
      uOpacity: { value: opacity },
    },
    vertexShader: /* glsl */ `
      attribute float aScale;
      attribute float aFade;
      uniform float uSize;
      varying float vFade;
      void main() {
        vFade = aFade;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * aScale * (18.0 / max(0.5, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vFade;
      void main() {
        // Round, soft-edged point. Without this the particles are squares.
        float d = length(gl_PointCoord - 0.5);
        float alpha = smoothstep(0.5, 0.12, d) * uOpacity * vFade;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  });
}
