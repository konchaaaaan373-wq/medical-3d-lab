import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE, } from '../../data/amyloidBeta.js';
import { SPACE } from './aggregationLayout.js';
import { createRandom, clamp, smoothstep, lerp } from '../../utils/math.js';

/**
 * A deliberately stylised neuron: soma, branching dendrites, an axon ending in a
 * terminal, and the post-synaptic dendrite of a neighbouring cell.
 *
 * It is a schematic, not anatomy — its job is to give the Aβ particles a
 * recognisable biological context and a sense of scale.
 */
export class Neuron extends THREE.Group {
  constructor(seed = 7788) {
    super();
    this.name = 'neuron';
    const rnd = createRandom(seed);

    this.membraneMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE.neuron),
      roughness: 0.5,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92,
      emissive: new THREE.Color(PALETTE.neuron),
      emissiveIntensity: 0.22,
    });
    this.neuriteMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE.neurite),
      roughness: 0.6,
      metalness: 0.0,
      transparent: true,
      opacity: 0.9,
      emissive: new THREE.Color(PALETTE.neurite),
      emissiveIntensity: 0.16,
    });
    this.wireMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(PALETTE.neuron),
      wireframe: true,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    });

    this.add(this._buildSoma(rnd));
    const { mesh, spineAnchors } = this._buildNeurites(rnd);
    this.add(mesh);
    this.add(this._buildSpines(spineAnchors));

    this._progress = -1;
  }

  _buildSoma(rnd) {
    // Indexed, so the noise below produces a smoothly shaded membrane.
    const geometry = mergeVertices(new THREE.IcosahedronGeometry(SPACE.somaRadius, 4));
    // A little organic noise so it does not read as a perfect ball.
    const position = geometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i);
      const n = Math.sin(v.x * 2.1) * Math.cos(v.y * 1.7) * Math.sin(v.z * 2.4);
      v.multiplyScalar(1 + n * 0.09 + (rnd() - 0.5) * 0.015);
      position.setXYZ(i, v.x, v.y, v.z);
    }
    geometry.computeVertexNormals();

    const group = new THREE.Group();
    const soma = new THREE.Mesh(geometry, this.membraneMaterial);
    const shell = new THREE.Mesh(geometry, this.wireMaterial);
    shell.scale.setScalar(1.035);
    group.add(soma, shell);
    group.position.copy(SPACE.somaCenter);
    return group;
  }

  /** Dendrites + axon + the neighbouring cell's dendrite, merged into one mesh. */
  _buildNeurites(rnd) {
    const geometries = [];
    const spineAnchors = [];

    const grow = (start, direction, length, radius, depth) => {
      const points = [start.clone()];
      const dir = direction.clone().normalize();
      const cursor = start.clone();
      for (let s = 0; s < 3; s++) {
        dir.x += (rnd() - 0.5) * 0.5;
        dir.y += (rnd() - 0.5) * 0.5;
        dir.z += (rnd() - 0.5) * 0.5;
        dir.normalize();
        cursor.addScaledVector(dir, length / 3);
        points.push(cursor.clone());
      }
      const curve = new THREE.CatmullRomCurve3(points);
      geometries.push(new THREE.TubeGeometry(curve, 16, radius, 6, false));

      if (depth === 0) {
        // Leaf branches carry the dendritic spines.
        for (let i = 0; i < 3; i++) spineAnchors.push(curve.getPointAt(0.28 + i * 0.24));
        return;
      }
      for (let b = 0; b < 2; b++) {
        const branchDir = dir
          .clone()
          .applyAxisAngle(new THREE.Vector3(rnd(), rnd(), rnd()).normalize(), (rnd() - 0.5) * 1.3);
        grow(cursor, branchDir, length * 0.68, radius * 0.62, depth - 1);
      }
    };

    // Dendrites radiate away from the axon side (+x) so the cell reads as polarised.
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const dir = new THREE.Vector3(
        -0.55 + (rnd() - 0.5) * 0.35,
        Math.sin(angle) * 0.9,
        Math.cos(angle) * 0.9
      ).normalize();
      const start = SPACE.somaCenter.clone().addScaledVector(dir, SPACE.somaRadius * 0.95);
      grow(start, dir, 2.0 + rnd() * 0.6, 0.105, 2);
    }

    // Axon: soma -> presynaptic terminal.
    const axonStart = SPACE.somaCenter.clone().add(new THREE.Vector3(SPACE.somaRadius * 0.9, 0.05, -0.1));
    const terminal = new THREE.Vector3(1.72, 0.42, -0.2);
    const axonCurve = new THREE.CatmullRomCurve3([
      axonStart,
      new THREE.Vector3(-0.6, 0.5, -0.55),
      new THREE.Vector3(0.6, 0.25, -0.5),
      terminal,
    ]);
    geometries.push(new THREE.TubeGeometry(axonCurve, 40, 0.1, 7, false));
    geometries.push(new THREE.SphereGeometry(0.26, 18, 14).translate(terminal.x, terminal.y, terminal.z));

    // Post-synaptic dendrite of the neighbouring neuron, arriving from the right.
    const postCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.34, 0.5, -0.2),
      new THREE.Vector3(3.4, 0.95, -0.9),
      new THREE.Vector3(4.6, 1.6, -1.9),
      new THREE.Vector3(5.5, 1.9, -2.9),
    ]);
    geometries.push(new THREE.TubeGeometry(postCurve, 30, 0.12, 7, false));
    geometries.push(new THREE.SphereGeometry(0.2, 16, 12).translate(2.34, 0.5, -0.2));
    for (let i = 0; i < 4; i++) spineAnchors.push(postCurve.getPointAt(0.18 + i * 0.2));

    const merged = mergeGeometries(geometries, false);
    for (const g of geometries) g.dispose();
    return { mesh: new THREE.Mesh(merged, this.neuriteMaterial), spineAnchors };
  }

  /**
   * Dendritic spines as one instanced mesh. They shrink as the model progresses —
   * a schematic nod to the synaptic changes associated with Aβ pathology.
   */
  _buildSpines(anchors) {
    const geometry = new THREE.SphereGeometry(0.075, 10, 8);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE.neuron),
      emissive: new THREE.Color(PALETTE.neuron),
      emissiveIntensity: 0.5,
      roughness: 0.4,
      transparent: true,
      opacity: 0.95,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, anchors.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._spineAnchors = anchors;
    this._spineMesh = mesh;
    this._spineMatrix = new THREE.Matrix4();
    this._applySpineScale(1);
    return mesh;
  }

  _applySpineScale(scale) {
    for (let i = 0; i < this._spineAnchors.length; i++) {
      const p = this._spineAnchors[i];
      // Stagger the loss slightly so it does not look like a single global switch.
      const s = clamp(scale + ((i % 5) - 2) * 0.06, 0.2, 1.2);
      this._spineMatrix.makeScale(s, s, s);
      this._spineMatrix.setPosition(p.x, p.y, p.z);
      this._spineMesh.setMatrixAt(i, this._spineMatrix);
    }
    this._spineMesh.instanceMatrix.needsUpdate = true;
  }

  /** @param {number} progress 0..1 */
  setProgress(progress) {
    if (Math.abs(progress - this._progress) < 0.002) return;
    this._progress = progress;
    // Subtle, intentionally understated: the cell dims rather than dies.
    const stress = smoothstep(0.45, 0.95, progress);
    this.membraneMaterial.emissiveIntensity = lerp(0.22, 0.07, stress);
    this.membraneMaterial.opacity = lerp(0.92, 0.78, stress);
    this.neuriteMaterial.emissiveIntensity = lerp(0.16, 0.05, stress);
    this.neuriteMaterial.opacity = lerp(0.9, 0.66, stress);
    this._spineMesh.material.emissiveIntensity = lerp(0.5, 0.12, stress);
    this._applySpineScale(lerp(1, 0.4, stress));
  }
}
