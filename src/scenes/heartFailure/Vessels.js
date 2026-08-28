import * as THREE from 'three';
import {
  ANATOMICAL_AXES,
  ANATOMY,
  AORTA,
  AORTA_LANDMARKS,
  AORTA_MODEL,
  AORTA_SEGMENTS,
  PULMONARY_VEINS,
  PULMONARY_VEIN_OSTIA,
  buildVascularFans,
} from './anatomy.js';
import { vesselDetailTexture } from './materials/heartMaterials.js';
import { lerp, smoothstep } from '../../utils/math.js';

/**
 * The structures around the left ventricle: aortic root and arch, left
 * atrium, four pulmonary veins, and the proximal pulmonary vasculature they
 * drain from.
 *
 * All translucent and non-depth-writing, so the blood particles inside stay
 * visible — the vessels are context, not the subject. But they are drawn as
 * *anatomy*, not diagram: the aorta swells into sinuses above its valve, the
 * atrium is a lobed chamber with an appendage and four vein ostia, and the
 * veins continue into branching vascular fans instead of ending at a sphere.
 *
 * Congestion is expressed here as physical change: the atrium distends, the
 * veins engorge (their walls inflate outward) and the venous tree takes on a
 * dusky tint. The pressure itself is drawn by CongestionOverlay.
 */
/**
 * Opacity of everything this component owns, as a composition rather than as a
 * sequence of assignments.
 *
 * Ownership matrix for the scene's materials — who decides the final value:
 *
 *   material            owner                       inputs
 *   ------------------  --------------------------  -------------------------
 *   aorta (arterial)    Vessels._resolveMaterials   congestion, emphasis
 *   pulmonary veins     Vessels._resolveMaterials   congestion, emphasis
 *   left atrium         Vessels._resolveMaterials   congestion, emphasis
 *   valve rings         Vessels._resolveMaterials   congestion, emphasis
 *   lung context        Vessels._resolveMaterials   congestion, emphasis
 *   myocardium/         Chamber.setOpacity          comparison fade
 *     endocardium/cut
 *   congestion sheath   CongestionOverlay           pressure front, emphasis
 *   interstitial fluid  CongestionOverlay           fluid level
 *   blood particles     HeartFailureScene           set once at construction
 *   end-diastolic mark  CavityOutline               reveal
 *
 * Nothing outside a material's owner writes its opacity.
 */
const VESSEL_OPACITY = {
  arterial: { base: 0.82, congested: 0.82, emphasised: 0.9 },
  venous: { base: 0.33, congested: 0.42, emphasised: 0.55 },
  atrium: { base: 0.88, congested: 0.92, emphasised: 0.94 },
  valve: { base: 0.38, congested: 0.38, emphasised: 0.62 },
  lung: { base: 0.11, congested: 0.19, emphasised: 0.19 },
};

/**
 * The one composition rule: congestion moves a material from its resting value
 * toward its congested one, and presentation emphasis lifts the result toward
 * its emphasised one. Explicit, and in one direction — never "whichever
 * assignment ran last wins".
 */
function resolveOpacity(spec, congested, emphasis) {
  return lerp(lerp(spec.base, spec.congested, congested), spec.emphasised, emphasis);
}

/**
 * How far the atrium distends at full congestion. Illustrative: the direction
 * is what the model says, the amount is a drawing decision.
 */
const ATRIAL_DISTENSION_MAX = 1.22;

/** Where the lung silhouettes sit relative to the heart, in scene units. */
const LUNG_PLACEMENT = { lateral: 5.2, height: 0.6, depth: -5.2 };

/**
 * Relative size of each lung. The right lung is the larger one; the left is
 * smaller, mostly in width, because the heart occupies that side of the chest.
 * Illustrative proportions, not measurements.
 */
const LUNG_SIZE = {
  right: { width: 1.0, height: 1.0, depth: 1.0 },
  left: { width: 0.87, height: 0.94, depth: 0.92 },
};


/**
 * Where the aorta dissolves toward the edge of the picture, given as a run
 * along the descending aorta rather than as a fraction of the whole vessel:
 * a quarter of the way down it starts to go, and it is gone before the end.
 * An artery that stopped on a cut disc read as a pipe; this is what an atlas
 * plate does instead.
 */
const DISTAL_FADE = {
  from: AORTA_SEGMENTS.descending.localToPathT(0.15),
  to: AORTA_SEGMENTS.descending.localToPathT(0.8),
};

export class Vessels extends THREE.Group {
  constructor() {
    super();
    this.name = 'vessels';

    /**
     * What the model says is happening. Only this may change anatomical size.
     */
    this.physiology = { congestionLevel: 0 };
    /**
     * How it is being shown. Only this may change opacity and visibility, and
     * it may never reach anatomy: a story beat is a way of looking at a heart,
     * not a change in the heart.
     */
    this.presentation = { emphasis: 0 };

    // --- materials ------------------------------------------------------
    // The aorta is a thick-walled artery, not a window: pale red-brown, less
    // saturated than myocardium, essentially opaque. A translucent pink pipe
    // was the single strongest "procedural tube" cue in the frame.
    this.arterialMaterial = new THREE.MeshPhysicalMaterial({
      // Tuned against the opacity this material actually renders at. The
      // earlier tint was picked while a stray update path was holding it at
      // 0.3, so the black background was doing half the darkening; at its
      // real opacity that tint was the brightest thing in the frame.
      color: new THREE.Color('#ab7f77'),
      roughness: 0.55,
      metalness: 0,
      clearcoat: 0.16,
      clearcoatRoughness: 0.55,
      sheen: 0.28,
      sheenRoughness: 0.7,
      sheenColor: new THREE.Color('#e0b0a4'),
      envMapIntensity: 0.38,
      map: vesselDetailTexture(),
      bumpMap: vesselDetailTexture(),
      bumpScale: 0.35,
      transparent: true,
      // Not a window, but not a wall either: the ascending aorta crosses the
      // cutaway, and at full opacity it hid the cavity the scene is about.
      opacity: VESSEL_OPACITY.arterial.base,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    this.arterialMaterial.defines = { ...(this.arterialMaterial.defines ?? {}), USE_UV: '' };
    this.arterialMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        '\tdiffuseColor.a *= 1.0 - smoothstep(' + DISTAL_FADE.from.toFixed(4) + ', ' +
            DISTAL_FADE.to.toFixed(4) + ', vUv.x);\n#include <opaque_fragment>'
      );
    };

    // Shared by veins, atrium and fans, patched with two uniforms:
    // uEngorge inflates every wall along its normal (venous engorgement) and
    // uDusk shifts the tint toward a deep, congested blue-violet.
    this.venousUniforms = { uEngorge: { value: 0 }, uDusk: { value: 0 } };
    this.venousMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#8d6476'),
      map: vesselDetailTexture(),
      bumpMap: vesselDetailTexture(),
      bumpScale: 0.3,
      roughness: 0.58,
      metalness: 0,
      clearcoat: 0.18,
      clearcoatRoughness: 0.6,
      envMapIntensity: 0.35,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const uniforms = this.venousUniforms;
    this.venousMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uEngorge = uniforms.uEngorge;
      shader.uniforms.uDusk = uniforms.uDusk;
      shader.vertexShader =
        'uniform float uEngorge;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n\ttransformed += normalize(objectNormal) * uEngorge;'
        );
      shader.fragmentShader =
        'uniform float uDusk;\n' +
        shader.fragmentShader.replace(
          '#include <color_fragment>',
          '#include <color_fragment>\n\tdiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.1, 0.21), uDusk);'
        );
    };

    this.valveMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#c9b3ad'),
      roughness: 0.72,
      emissive: new THREE.Color('#6b5450'),
      emissiveIntensity: 0.04,
      transparent: true,
      opacity: VESSEL_OPACITY.valve.base,
      depthWrite: false,
    });

    // --- aorta: outflow tract, sinuses of Valsalva, arch ---------------
    this.add(new THREE.Mesh(aortaGeometry(), this.arterialMaterial));

    // A more present material for the atrium itself: the chamber must read
    // as an organ wall, not a soap bubble — noticeably more opaque than the
    // vein tubes and writing depth so it sorts as a solid. It shares the
    // engorgement/dusk uniforms so congestion still reaches it.
    this.atriumMaterial = this.venousMaterial.clone();
    this.atriumMaterial.opacity = VESSEL_OPACITY.atrium.base;
    this.atriumMaterial.depthWrite = true;
    this.atriumMaterial.color = new THREE.Color('#7d5566');
    this.atriumMaterial.roughness = 0.72;
    this.atriumMaterial.clearcoat = 0.08;
    this.atriumMaterial.envMapIntensity = 0.28;
    this.atriumMaterial.sheen = 0.15;
    this.atriumMaterial.onBeforeCompile = this.venousMaterial.onBeforeCompile;

    // --- pulmonary veins into the atrium -------------------------------
    // Each vein flares into a trumpet as it meets the atrial wall, so the
    // junction reads as a blended ostium rather than a tube stuck into a ball.
    for (const vein of PULMONARY_VEINS) {
      this.add(
        new THREE.Mesh(
          variableTube(vein, 56, 12, (t) => 0.3 * (1 + 0.85 * smoothstep(0.78, 1, t)) * (1 - 0.12 * smoothstep(0.5, 0, t))),
          this.venousMaterial
        )
      );
    }

    // --- proximal pulmonary vasculature: branching fans ----------------
    for (const fan of buildVascularFans()) {
      for (let i = 0; i < fan.curves.length; i++) {
        const primary = fan.generations[i] === 0;
        const geometry = variableTube(
          fan.curves[i],
          primary ? 24 : 14,
          primary ? 10 : 7,
          (t) => (primary ? lerp(0.3, 0.17, t) : lerp(0.16, 0.09, t))
        );
        this.add(new THREE.Mesh(geometry, this.venousMaterial));
      }
    }

    // --- left atrium ----------------------------------------------------
    this.atrium = new THREE.Mesh(atriumGeometry(ANATOMY.atriumRadius * 0.92), this.atriumMaterial);
    this.atrium.position.copy(ANATOMY.atriumCentre);
    this.add(this.atrium);

    // --- atrioventricular junction --------------------------------------
    // The atrium and the ventricle were two parts floating near each other.
    // A short collar from the mitral annulus up into the atrial floor gives
    // the junction the continuity a real AV groove has.
    this.avJunction = new THREE.Mesh(avJunctionGeometry(), this.atriumMaterial);
    this.add(this.avJunction);

    // --- lung context ----------------------------------------------------
    this.lungMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#5f7280'),
      transparent: true,
      opacity: 0.11,
      depthWrite: false,
      // Additive, and only ever additive. A normally-blended shell this large
      // sits between the camera and the background and can only take light
      // away, which is how two lungs turned into two black eggs behind the
      // heart. Adding light cannot do that: the worst this can be is invisible.
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    // Unlit, so no light ever puts a highlight on a lung.
    //
    // The alpha profile took three tries. A hard silhouette read as two dark
    // beans pasted behind the heart. Weighting the alpha toward the contour
    // instead drew the right shape, but any shape with a hard boundary reads
    // as an object, and measured against the background these were only
    // 20/255 brighter — so the eye was reading the *edge*, not the value.
    //
    // So the alpha now falls to zero exactly at the silhouette: the shape has
    // no boundary to find, and what is left is a gradient in the dark behind
    // the pulmonary vessels. Faint enough not to compete, present enough that
    // the vascular bed is somewhere rather than nowhere.
    this.lungMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader =
        'varying vec3 vLungNormal;\nvarying vec3 vLungView;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n\tvLungNormal = normalize(normalMatrix * normal);\n\tvLungView = -(modelViewMatrix * vec4(transformed, 1.0)).xyz;'
        );
      shader.fragmentShader =
        'varying vec3 vLungNormal;\nvarying vec3 vLungView;\n' +
        shader.fragmentShader.replace(
          '#include <opaque_fragment>',
          '\tfloat lungFacing = abs(dot(normalize(vLungNormal), normalize(vLungView)));\n' +
            '\tdiffuseColor.a *= pow(lungFacing, 2.2);\n#include <opaque_fragment>'
        );
    };
    this.lungs = new THREE.Group();
    this.lungs.name = 'lung-context';
    for (const side of ['left', 'right']) {
      const towardSide = ANATOMICAL_AXES[side].x;
      const lung = new THREE.Mesh(lungGeometry(towardSide), this.lungMaterial);
      lung.position.set(
        towardSide * LUNG_PLACEMENT.lateral,
        LUNG_PLACEMENT.height,
        LUNG_PLACEMENT.depth
      );
      lung.rotation.z = -towardSide * 0.06;
      // The right lung is the larger of the two — three lobes against two —
      // and asked for by name, because deciding it from the sign of x is how
      // it ended up on the wrong side. The asymmetry also matters for a
      // non-anatomical reason: two identical mirrored shapes either side of
      // the heart read as an artefact of the render rather than as lungs.
      const scale = LUNG_SIZE[side];
      lung.scale.set(scale.width, scale.height, scale.depth);
      lung.frustumCulled = false;
      lung.name = `lung-${side}`;
      this.lungs.add(lung);
    }
    this.add(this.lungs);

    // --- valves: rings that ride the annulus, with funnel hints --------
    this.annulus = new THREE.Group();
    this.annulus.name = 'annulus';
    this.annulus.add(valveRing(ANATOMY.aorticValve, 0.5, this.valveMaterial));
    this.annulus.add(valveRing(ANATOMY.mitralValve, 0.62, this.valveMaterial));
    this.add(this.annulus);

    // Resolve once here so the resting frame is produced by the same code path
    // as every frame after it. The opacities written when each material was
    // constructed are starting values for the resolver to compose, not the
    // values that ship.
    this._resolveGeometry();
    this._resolveMaterials();
  }

  /**
   * The whole valve plane follows the base of the ventricle as it descends
   * toward the apex during systole and recoils in diastole.
   *
   * @param {number} dy vertical offset of the annulus, scene units (<= 0)
   */
  setAnnularDescent(dy) {
    this.annulus.position.y = dy;
  }

  /**
   * Physiological state: raised filling pressure, 0..1. This is the only input
   * allowed to change the size of anything here — the atrium distends, the
   * vein walls engorge, the tree takes on a dusky tint. Pressure itself is
   * drawn by CongestionOverlay; this is the tissue's response to it.
   *
   * @param {number} congestionLevel
   */
  setCongestionLevel(congestionLevel) {
    this.physiology.congestionLevel = congestionLevel;
    this._resolveGeometry();
    this._resolveMaterials();
  }

  /**
   * Presentation emphasis, 0..1. Visualization only: the vessel walls become
   * more visible so the pressure field reads as being *in the atrium and
   * pulmonary veins* rather than floating beside the heart. It may reach
   * opacity and nothing else — no size here, ever.
   *
   * @param {number} emphasis
   */
  setPresentationEmphasis(emphasis) {
    this.presentation.emphasis = emphasis;
    this._resolveMaterials();
  }

  /**
   * Size and shape, from physiology alone. Kept separate from
   * _resolveMaterials so the rule "presentation cannot resize anatomy" is
   * enforced by which function a value is computed in, not by remembering it.
   */
  _resolveGeometry() {
    const eased = smoothstep(0, 1, this.physiology.congestionLevel);
    this.atrium.scale.setScalar(lerp(1, ATRIAL_DISTENSION_MAX, eased));
    this.venousUniforms.uEngorge.value = 0.12 * eased;
    this.venousUniforms.uDusk.value = 0.45 * eased;
  }

  /**
   * The single place any of these materials' opacity is decided.
   *
   * Every value comes from the same explicit formula rather than being
   * assigned in whichever order the callers happen to run. The bug this
   * replaces was exactly that: the constructor set the aorta opaque, an update
   * path reassigned it from scratch on the first frame, and the vessel had
   * been rendering at a third of its intended opacity ever since — no error,
   * no failing test.
   */
  _resolveMaterials() {
    const congested = smoothstep(0.4, 1, this.physiology.congestionLevel);
    const revealed = smoothstep(0, 1, this.physiology.congestionLevel);
    const emphasis = this.presentation.emphasis;
    this.arterialMaterial.opacity = resolveOpacity(VESSEL_OPACITY.arterial, congested, emphasis);
    this.venousMaterial.opacity = resolveOpacity(VESSEL_OPACITY.venous, congested, emphasis);
    this.atriumMaterial.opacity = resolveOpacity(VESSEL_OPACITY.atrium, congested, emphasis);
    this.valveMaterial.opacity = resolveOpacity(VESSEL_OPACITY.valve, congested, emphasis);
    // The lungs come up slightly once the story is about them, so the haze has
    // something to sit inside. Eased off the raw level rather than the 0.4
    // threshold, so the change is gradual. Still far quieter than the heart.
    this.lungMaterial.opacity = resolveOpacity(VESSEL_OPACITY.lung, revealed, emphasis);
  }

  /**
   * How far the atrium is currently distended, so the pressure sheath drawn
   * over it can follow the wall it labels. Read by CongestionOverlay, which
   * is driven by a different input (the story's reveal fraction) and would
   * otherwise sit inside an opaque, depth-writing chamber.
   */
  get atriumDistension() {
    return this.atrium.scale.x;
  }
}

/**
 * Calibre of the aorta at each named landmark, in scene units (1 unit = 1 cm).
 * Illustrative proportions, not measurements: what they encode is that the
 * vessel narrows from root to arch to descending aorta.
 */
const AORTA_CALIBRE = {
  annulus: 0.5,
  sinotubularJunction: 0.47,
  arch: 0.42,
  descendingDistal: 0.33,
};

/** Flare where the root meets the valve annulus, as a fraction of calibre. */
const ANNULAR_FLARE = 0.22;

/**
 * The sinuses of Valsalva, described in aortic-root-local coordinates: how
 * wide the swell is as a fraction of the root's own length, and how far it
 * bulges. Written this way, the sinuses stay on the root no matter what
 * happens to the arch — which is exactly what went wrong when they were
 * pinned to a fraction of the whole vessel.
 */
const SINUS_ROOT_WIDTH = 0.34;
const SINUS_BULGE = 0.2;
const SINUS_LOBE_DEPTH = 0.12;

/**
 * The aorta as one continuous variable-radius tube, shaped part by part: a
 * flare at the annulus, the three-lobed swell of the sinuses of Valsalva
 * across the root, then a taper through the ascending aorta and arch.
 *
 * Every position here is asked for by segment name, never as a fraction of the
 * whole curve, so reshaping one part cannot silently move another.
 */
function aortaGeometry() {
  const seg = AORTA_SEGMENTS;
  const sinusU = AORTA_LANDMARKS.sinusOfValsalva.localU;
  return variableTube(AORTA, 110, 18, (t, theta) => {
    const part = AORTA_MODEL.segmentAt(t);
    if (part === 'root') {
      const u = seg.root.pathTToLocal(t);
      let r = lerp(AORTA_CALIBRE.annulus, AORTA_CALIBRE.sinotubularJunction, smoothstep(0, 1, u));
      r *= 1 + ANNULAR_FLARE * (1 - smoothstep(0, 0.3, u));
      // Three soft lobes around the circumference, centred on the sinuses.
      const swell = Math.exp(-(((u - sinusU) / SINUS_ROOT_WIDTH) ** 2));
      r *= 1 + swell * (SINUS_BULGE + SINUS_LOBE_DEPTH * Math.max(0, Math.cos(3 * theta)));
      return r;
    }
    if (part === 'ascending') {
      const u = seg.ascending.pathTToLocal(t);
      return lerp(AORTA_CALIBRE.sinotubularJunction, AORTA_CALIBRE.arch, smoothstep(0, 1, u));
    }
    if (part === 'arch') {
      const u = seg.arch.pathTToLocal(t);
      return lerp(AORTA_CALIBRE.arch, AORTA_CALIBRE.arch * 0.95, u);
    }
    const u = seg.descending.pathTToLocal(t);
    return lerp(AORTA_CALIBRE.arch * 0.95, AORTA_CALIBRE.descendingDistal, smoothstep(0, 0.6, u));
  });
}

/**
 * A tube along a curve whose radius may vary with position along the curve
 * and angle around it — what TubeGeometry cannot do. uv.x runs along the
 * curve (0 at the first point), matching what CongestionOverlay's path
 * baking expects.
 *
 * @param {THREE.Curve<THREE.Vector3>} curve
 * @param {number} segments
 * @param {number} radialSegments
 * @param {(t: number, theta: number) => number} radiusAt
 */
export function variableTube(curve, segments, radialSegments, radiusAt) {
  const frames = curve.computeFrenetFrames(segments, false);
  const positions = new Float32Array((segments + 1) * (radialSegments + 1) * 3);
  const uvs = new Float32Array((segments + 1) * (radialSegments + 1) * 2);
  const indices = [];
  const point = new THREE.Vector3();

  let v = 0;
  let uv = 0;
  for (let s = 0; s <= segments; s++) {
    const t = s / segments;
    curve.getPointAt(t, point);
    const normal = frames.normals[s];
    const binormal = frames.binormals[s];
    for (let r = 0; r <= radialSegments; r++) {
      const theta = (r / radialSegments) * Math.PI * 2;
      const sin = Math.sin(theta);
      const cos = Math.cos(theta);
      const radius = radiusAt(t, theta);
      positions[v++] = point.x + radius * (cos * normal.x + sin * binormal.x);
      positions[v++] = point.y + radius * (cos * normal.y + sin * binormal.y);
      positions[v++] = point.z + radius * (cos * normal.z + sin * binormal.z);
      uvs[uv++] = t;
      uvs[uv++] = r / radialSegments;
    }
  }
  for (let s = 0; s < segments; s++) {
    for (let r = 0; r < radialSegments; r++) {
      const a = s * (radialSegments + 1) + r;
      const b = (s + 1) * (radialSegments + 1) + r;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The left atrium: a lobed chamber rather than a sphere. Slightly wider than
 * tall, with a soft appendage lobe anterolaterally, four small out-turned
 * ostia where the pulmonary veins arrive, a funnel toward the mitral valve,
 * and low-amplitude surface irregularity.
 */
export function atriumGeometry(radius) {
  const geometry = new THREE.SphereGeometry(radius, 48, 36);
  const positions = geometry.attributes.position;

  const centre = ANATOMY.atriumCentre;
  const appendageDir = new THREE.Vector3(-0.55, 0.2, 0.82).normalize();
  const mitralDir = ANATOMY.mitralValve.clone().sub(centre).normalize();
  const ostiaDirs = PULMONARY_VEIN_OSTIA.map((o) => o.clone().sub(centre).normalize());

  const p = new THREE.Vector3();
  const dir = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i);
    dir.copy(p).normalize();

    // Base ovoid: clearly wider than tall, flattened front-to-back the way
    // the atrium is pressed against the structures ahead of it.
    p.x *= 1.24;
    p.y *= 0.8;
    p.z *= 0.98;

    let bulge = 0;
    // Appendage: one soft lobe.
    bulge += 0.4 * Math.pow(Math.max(0, dir.dot(appendageDir)), 5);
    // A broad second lobe over the posterosuperior body, so the silhouette
    // is lobulated rather than one arc.
    bulge += 0.18 * Math.pow(Math.max(0, dir.dot(BODY_LOBE_DIR)), 3);
    // Ostia: small out-turned funnels where each vein enters.
    for (const ostium of ostiaDirs) bulge += 0.24 * Math.pow(Math.max(0, dir.dot(ostium)), 12);
    // Funnel toward the mitral valve, keeping atrium and annulus continuous.
    bulge += 0.34 * Math.pow(Math.max(0, dir.dot(mitralDir)), 6);
    // Gentle irregularity so no profile is a perfect arc.
    bulge += 0.05 * Math.sin(4.1 * dir.x + 6.3 * dir.y + 5.2 * dir.z + 1.7);

    p.addScaledVector(dir, bulge);
    positions.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

const BODY_LOBE_DIR = new THREE.Vector3(0.35, 0.75, -0.55).normalize();

/**
 * The atrioventricular junction: a short, slightly flared collar running from
 * the mitral annulus up into the floor of the atrium.
 *
 * Without it the two chambers read as separate parts placed near each other.
 * It is deliberately plain — the junction's job is continuity, not detail.
 */
function avJunctionGeometry() {
  const from = ANATOMY.mitralValve;
  const to = ANATOMY.atriumCentre;
  const height = Math.max(0.3, to.y - from.y - ANATOMY.atriumRadius * 0.95);
  const geometry = new THREE.CylinderGeometry(0.7, 0.64, height, 26, 4, true);
  const positions = geometry.attributes.position;
  const p = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i);
    // Flare at both ends so it blends into the annulus below and the atrial
    // floor above rather than butting against them.
    const t = p.y / height + 0.5;
    const flare = 1 + 0.16 * Math.pow(Math.max(0, 1 - t * 1.8), 2) + 0.2 * Math.pow(Math.max(0, (t - 0.6) / 0.4), 2);
    p.x *= flare;
    p.z *= flare;
    // Lean toward the atrium, which sits posterior to the valve plane.
    const lean = (t - 0.5) * (to.z - from.z) * 0.9;
    p.z += lean;
    positions.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();
  geometry.translate(from.x - 0.05, from.y + height / 2 - 0.05, from.z);
  return geometry;
}

/**
 * Very quiet lung silhouettes.
 *
 * Their whole job is to stop the pulmonary vascular bed floating in the dark:
 * with them the chain LA -> pulmonary veins -> vascular bed -> interstitium
 * has somewhere to be. They carry no texture, almost no specular and very low
 * opacity — if a viewer notices the lungs before the heart, they are wrong.
 */
function lungGeometry(side) {
  const geometry = new THREE.SphereGeometry(1, 32, 24);
  const positions = geometry.attributes.position;
  const p = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    p.fromBufferAttribute(positions, i);
    // Tall, deep, narrow — and hollowed on the side facing the heart, the way
    // the cardiac notch is.
    p.set(p.x * 2.6, p.y * 4.2, p.z * 2.9);
    const inward = side > 0 ? Math.max(0, -p.x) : Math.max(0, p.x);
    const notch = Math.exp(-((p.y + 1.1) ** 2) / 9) * inward * 0.42;
    p.x += side * notch;
    // Apex narrows, base spreads.
    const t = (p.y / 4.2 + 1) / 2;
    const taper = 0.6 + 0.55 * (1 - t) + 0.12 * Math.sin(3.1 * t);
    p.x *= taper;
    p.z *= taper;
    positions.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function valveRing(position, radius, material) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.07, 10, 28), material);
  ring.position.copy(position);
  ring.rotation.x = Math.PI / 2; // lie flat in the valve plane
  return ring;
}
