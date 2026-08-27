import * as THREE from 'three';
import { ANATOMY, AORTA, PULMONARY_VEINS, PULMONARY_VEIN_OSTIA, buildVascularFans } from './anatomy.js';
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
export class Vessels extends THREE.Group {
  constructor() {
    super();
    this.name = 'vessels';

    // --- materials ------------------------------------------------------
    this.arterialMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#a8737d'),
      roughness: 0.48,
      metalness: 0,
      clearcoat: 0.35,
      clearcoatRoughness: 0.45,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Shared by veins, atrium and fans, patched with two uniforms:
    // uEngorge inflates every wall along its normal (venous engorgement) and
    // uDusk shifts the tint toward a deep, congested blue-violet.
    this.venousUniforms = { uEngorge: { value: 0 }, uDusk: { value: 0 } };
    this.venousMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#a2818f'),
      roughness: 0.5,
      metalness: 0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.5,
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
          '#include <color_fragment>\n\tdiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.38, 0.35, 0.55), uDusk);'
        );
    };

    this.valveMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#b4c1d2'),
      roughness: 0.6,
      emissive: new THREE.Color('#8fa8c8'),
      emissiveIntensity: 0.05,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });

    // --- aorta: outflow tract, sinuses of Valsalva, arch ---------------
    this.add(new THREE.Mesh(aortaGeometry(), this.arterialMaterial));

    // A more present material for the atrium itself: the chamber must read
    // as an organ wall, not a soap bubble — noticeably more opaque than the
    // vein tubes and writing depth so it sorts as a solid. It shares the
    // engorgement/dusk uniforms so congestion still reaches it.
    this.atriumMaterial = this.venousMaterial.clone();
    this.atriumMaterial.opacity = 0.62;
    this.atriumMaterial.depthWrite = true;
    this.atriumMaterial.color = new THREE.Color('#997384');
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

    // --- valves: rings that ride the annulus, with funnel hints --------
    this.annulus = new THREE.Group();
    this.annulus.name = 'annulus';
    this.annulus.add(valveRing(ANATOMY.aorticValve, 0.5, this.valveMaterial));
    this.annulus.add(valveRing(ANATOMY.mitralValve, 0.62, this.valveMaterial));
    this.add(this.annulus);
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
   * The venous side responds to filling pressure: the atrium distends, vein
   * walls engorge outward, and the tree takes on a dusky congested tint.
   * This is chamber and vessel distension under pressure, not blood arriving
   * from the wrong direction — the pressure itself is drawn by
   * CongestionOverlay.
   *
   * @param {number} congestionLevel 0..1 index of raised filling pressure
   */
  setCongestionLevel(congestionLevel) {
    this.congestionLevel = congestionLevel;
    const eased = smoothstep(0, 1, congestionLevel);
    const distension = lerp(1, 1.22, eased);
    this.atrium.scale.setScalar(distension);
    this.venousUniforms.uEngorge.value = 0.12 * eased;
    this.venousUniforms.uDusk.value = 0.45 * eased;
    this._applyOpacity();
  }

  /**
   * Presentation emphasis, 0..1. Visualization only: the vessel walls become
   * more visible so the pressure field reads as being *in the atrium and
   * pulmonary veins* rather than floating beside the heart. Nothing about the
   * model changes.
   *
   * @param {number} emphasis
   */
  setPresentationEmphasis(emphasis) {
    this.presentationEmphasis = emphasis;
    this._applyOpacity();
  }

  _applyOpacity() {
    const congested = smoothstep(0.4, 1, this.congestionLevel ?? 0);
    const emphasis = this.presentationEmphasis ?? 0;
    this.arterialMaterial.opacity = lerp(0.3, 0.44, emphasis);
    this.venousMaterial.opacity = lerp(lerp(0.33, 0.42, congested), 0.55, emphasis);
    this.atriumMaterial.opacity = lerp(lerp(0.62, 0.68, congested), 0.74, emphasis);
    this.valveMaterial.opacity = lerp(0.6, 0.8, emphasis);
  }
}

/**
 * The aorta as one continuous variable-radius tube: a flare where it leaves
 * the outflow tract, the three-lobed swell of the sinuses of Valsalva just
 * above the valve, then a gentle taper around the arch.
 */
function aortaGeometry() {
  const sinus = (t) => Math.exp(-((t - 0.13) ** 2) / (2 * 0.045 ** 2));
  return variableTube(AORTA, 96, 16, (t, theta) => {
    let r = lerp(0.56, 0.42, smoothstep(0.2, 1, t));
    // Outflow flare below the valve, tucking the root into the ventricle.
    r *= 1 + 0.26 * (1 - smoothstep(0, 0.08, t));
    // Sinuses: a swell with three soft lobes around the circumference.
    r *= 1 + sinus(t) * (0.2 + 0.12 * Math.max(0, Math.cos(3 * theta)));
    return r;
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
function atriumGeometry(radius) {
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

function valveRing(position, radius, material) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.07, 10, 28), material);
  ring.position.copy(position);
  ring.rotation.x = Math.PI / 2; // lie flat in the valve plane
  return ring;
}
