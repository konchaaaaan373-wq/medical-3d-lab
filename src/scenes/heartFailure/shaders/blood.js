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
  uniform vec2 uApexDrift;      // lateral drift of the apex (x, z), scene units
  uniform float uEject;         // ejection fraction, 0..1
  uniform float uPhase;         // 0..1 through the cardiac cycle
  uniform float uEjectStart;    // phase at which the aortic valve opens
  uniform float uEjectEnd;      // phase at which it closes
  uniform float uFill;          // how much of the population is present, 0..1
  uniform float uTime;
  uniform float uOpacity;
  uniform float uExitFalloff;   // how quickly ejected blood fades on its way out
  uniform float uEjectEmphasis; // 0..1 — brighten and stretch blood on its way out
  uniform float uResidualEmphasis; // 0..1 — pick out what is still in the chamber
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
    float vSize = 1.0;
    float ejects = step(aRank, uEject);

    vec3 cavity = vec3(position.x * uRadius, position.y * uSemiLength, position.z * uRadius);
    // The chamber's long axis leans: its apex drifts laterally (see
    // ventricleGeometry.js), so the blood follows the same tilt.
    float apexness = clamp((0.33 - position.y) / 1.33, 0.0, 1.0);
    cavity.xz += uApexDrift * apexness * apexness;

    // Ordered departure and return, so the flow reads as a wave rather than a jump.
    float stagger = aRank * 0.45;
    float travel;
    vec3 away;
    if (uPhase < uEjectStart) {
      // Isovolumic contraction: both valves are shut, so nothing leaves yet.
      travel = 0.0;
      away = aExit;
    } else if (uPhase < uEjectEnd) {
      float local = (uPhase - uEjectStart) / max(uEjectEnd - uEjectStart, 1e-3);
      travel = smoothstep(stagger, stagger + 0.55, local);
      away = aExit;
    } else {
      float local = (uPhase - uEjectEnd) / max(1.0 - uEjectEnd, 1e-3);
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

    // How fast this particle is moving along its exit path right now. It peaks
    // mid-ejection and is zero whenever the valve is shut, so it can carry the
    // "this is leaving, and that way" reading without any colour change.
    float ejecting = 0.0;
    if (uPhase >= uEjectStart && uPhase < uEjectEnd) {
      float local = (uPhase - uEjectStart) / max(uEjectEnd - uEjectStart, 1e-3);
      ejecting = ejects * smoothstep(stagger, stagger + 0.55, local)
                        * (1.0 - smoothstep(stagger + 0.55, stagger + 1.0, local));
    }

    // A short trail, drawn by pulling the point back along the direction it is
    // travelling. Cheap, and it only exists while the valve is open.
    vec3 heading = normalize(away - cavity + vec3(1e-5));
    p -= heading * ejecting * uEjectEmphasis * 0.5;

    vColor = mix(uStaticColor, uFlowColor, ejects);
    // Blood still in the chamber at end-systole is the point of the scene, so
    // it can be picked out without recolouring anything: the residual
    // population is what is left when travel is zero and the particle is not
    // one of the ones that leaves.
    vColor = mix(vColor, uStaticColor * 1.9, uResidualEmphasis * (1.0 - ejects));
    // A particle fades out as it leaves up the aorta and fades back in from the
    // atrium during filling. The systemic circulation is not drawn, so this both
    // hides the hand-off and — importantly — means nothing is ever visible
    // travelling backwards down the aorta.
    float present = smoothstep(aAppear, aAppear + 0.12, uFill);
    float leaving = pow(clamp(1.0 - travel, 0.0, 1.0), uExitFalloff);
    // Kept nearly steady: strong per-particle flicker reads as glitter, and
    // the particles are a supporting cue under the contracting wall.
    vAlpha = uOpacity * present * leaving * (0.93 + 0.07 * sin(uTime * 2.2 + phase));
    // Emphasis is brightness and size, never a different colour: the legend has
    // to keep meaning what it says.
    vAlpha *= 1.0 + ejecting * uEjectEmphasis * 1.4 + uResidualEmphasis * (1.0 - ejects) * 0.8;
    vSize = 1.0 + ejecting * uEjectEmphasis * 0.9 + uResidualEmphasis * (1.0 - ejects) * 0.5;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(aSize * vSize * uParticleScale * uHeightScale / max(0.001, -mv.z), 1.0, 64.0);
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
    // Blood fills a small volume densely, so keep the additive boost low and
    // the edge soft — the cavity must never blow out to white, and a hard
    // bright rim on every particle is what reads as glitter.
    gl_FragColor = vec4(vColor * (0.3 + 0.48 * core), pow(core, 2.1) * vAlpha);
  }
`;
