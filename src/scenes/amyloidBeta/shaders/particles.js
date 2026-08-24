/**
 * Shader for the Aβ particle field.
 *
 * The whole progression is computed on the GPU from a single `uProgress` uniform:
 * every particle carries its own thresholds, so the population transitions
 * gradually instead of switching states all at once.
 */

export const particleVertexShader = /* glsl */ `
  uniform float uProgress;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uParticleScale;
  uniform float uHeightScale;
  uniform vec3 uMonomer;
  uniform vec3 uOligomer;
  uniform vec3 uFibril;
  uniform vec3 uPlaque;

  attribute vec3 aOligo;
  attribute vec3 aFibril;
  attribute vec3 aPlaque;
  attribute vec4 aStages;  // x: appears, y: joins oligomer, z: joins fibril, w: joins plaque
  attribute float aSeed;
  attribute float aSize;

  varying vec3 vColor;
  varying float vAlpha;

  // Width of every state transition. Wide enough that stages overlap slightly,
  // which is closer to the biology than a hard switch.
  const float W = 0.13;

  void main() {
    float tOligo  = smoothstep(aStages.y, aStages.y + W, uProgress);
    float tFibril = smoothstep(aStages.z, aStages.z + W, uProgress);
    float tPlaque = smoothstep(aStages.w, aStages.w + W, uProgress);
    float bound = max(tOligo, max(tFibril, tPlaque));

    // Soluble Aβ diffuses freely; aggregated Aβ is progressively immobilised.
    float amplitude = mix(0.34, 0.02, bound);
    float phase = aSeed * 6.2831853;
    vec3 drift = vec3(
      sin(uTime * 0.42 + phase),
      cos(uTime * 0.31 + phase * 1.7),
      sin(uTime * 0.26 + phase * 2.3)
    ) * amplitude;

    vec3 p = position + drift;
    p = mix(p, aOligo, tOligo);
    p = mix(p, aFibril, tFibril);
    p = mix(p, aPlaque, tPlaque);

    vec3 color = uMonomer;
    color = mix(color, uOligomer, tOligo);
    color = mix(color, uFibril, tFibril);
    color = mix(color, uPlaque, tPlaque);
    vColor = color;

    float appear = smoothstep(aStages.x, aStages.x + 0.10, uProgress);
    float pulse = 0.85 + 0.15 * sin(uTime * 1.6 + phase);
    vAlpha = appear * uOpacity * pulse;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // World-space radius -> pixels, so particle size is resolution independent.
    float radius = aSize * uParticleScale * (1.0 + bound * 0.3);
    gl_PointSize = clamp(radius * uHeightScale / max(0.001, -mv.z), 1.0, 64.0);
  }
`;

export const particleFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    // Bright centre, soft halo — reads well against a dark background.
    gl_FragColor = vec4(vColor * (0.55 + 0.9 * core), pow(core, 1.6) * vAlpha);
  }
`;
