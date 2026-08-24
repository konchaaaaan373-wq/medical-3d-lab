/**
 * Shader for the blood particles.
 *
 * Particles follow prescribed paths; this is a teaching animation, not a
 * computational-fluid-dynamics simulation. Blood only ever travels in the
 * physiological direction: atrium -> ventricle during filling, ventricle ->
 * aorta during ejection. Pulmonary congestion is drawn separately, as pressure
 * (see CongestionOverlay.js), never as blood moving backwards.
 *
 * Slots are stored normalised and scaled by the beating cavity; the share of
 * particles given by the ejection fraction leaves and returns each cycle.
 */

export const bloodVertexShader = /* glsl */ `
  uniform float uRadius;        // cavity semi-axis (x/z); 1.0 for absolute-position fields
  uniform float uSemiLength;    // cavity semi-axis (y)
  uniform float uEject;         // ejection fraction, 0..1
  uniform float uPhase;         // 0..1 through the cardiac cycle
  uniform float uSystole;       // fraction of the cycle spent ejecting
  uniform float uFill;          // how much of the population is present, 0..1
  uniform float uTime;
  uniform float uOpacity;
  uniform float uExitFalloff;   // how quickly ejected blood fades on its way out
  uniform float uParticleScale;
  uniform float uHeightScale;
  uniform vec3 uFlowColor;
  uniform vec3 uStaticColor;

  attribute vec3 aExit;    // where an ejected particle goes during systole
  attribute vec3 aEntry;   // where it returns from during filling
  attribute float aRank;   // 0..1 — below uEject means "this one gets ejected"
  attribute float aAppear; // 0..1 threshold against uFill
  attribute float aSeed;
  attribute float aSize;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float ejects = step(aRank, uEject);

    vec3 cavity = vec3(position.x * uRadius, position.y * uSemiLength, position.z * uRadius);

    // Ordered departure and return, so the flow reads as a wave rather than a jump.
    float stagger = aRank * 0.45;
    float travel;
    vec3 away;
    if (uPhase < uSystole) {
      float local = uPhase / uSystole;
      travel = smoothstep(stagger, stagger + 0.55, local);
      away = aExit;
    } else {
      float local = (uPhase - uSystole) / (1.0 - uSystole);
      travel = 1.0 - smoothstep(stagger, stagger + 0.55, local);
      away = aEntry;
    }
    travel *= ejects;

    float phase = aSeed * 6.2831853;
    vec3 swirl = vec3(
      sin(uTime * 0.9 + phase),
      cos(uTime * 0.7 + phase * 1.6),
      sin(uTime * 0.8 + phase * 2.1)
    ) * 0.07;

    vec3 p = mix(cavity, away, travel) + swirl;

    vColor = mix(uStaticColor, uFlowColor, ejects);
    // A particle fades out as it leaves up the aorta and fades back in from the
    // atrium during filling. The systemic circulation is not drawn, so this both
    // hides the hand-off and — importantly — means nothing is ever visible
    // travelling backwards down the aorta.
    float present = smoothstep(aAppear, aAppear + 0.12, uFill);
    float leaving = pow(clamp(1.0 - travel, 0.0, 1.0), uExitFalloff);
    vAlpha = uOpacity * present * leaving * (0.85 + 0.15 * sin(uTime * 2.2 + phase));

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(aSize * uParticleScale * uHeightScale / max(0.001, -mv.z), 1.0, 64.0);
  }
`;

export const bloodFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    // Blood fills a small volume densely, so keep the additive boost lower than
    // the amyloid field's — otherwise the cavity blows out to white.
    gl_FragColor = vec4(vColor * (0.42 + 0.6 * core), pow(core, 1.6) * vAlpha);
  }
`;
