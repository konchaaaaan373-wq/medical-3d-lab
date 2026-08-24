import * as THREE from 'three';

/**
 * A deformable, wedge-cut heart chamber.
 *
 * The chamber is a truncated spheroid shell: an outer (epicardial) surface, an
 * inner (endocardial) surface, a rim joining them at the valve plane, and two
 * flat cut faces. A wedge is left out so the viewer can see the cavity and,
 * crucially, the thickness of the wall — the whole point of the scene.
 *
 * Geometry is built once with a fixed index buffer; every frame only the vertex
 * positions are rewritten. That keeps a beating, remodelling chamber cheap
 * while leaving the shape fully controlled by the haemodynamic model.
 */
export class Chamber extends THREE.Mesh {
  /**
   * @param {{
   *   profilePoints?: number, segments?: number, cutAngle?: number,
   *   flip?: boolean, wallColor?: THREE.Color, liningColor?: THREE.Color, cutColor?: THREE.Color,
   * }} options
   */
  constructor({
    profilePoints = 26,
    segments = 48,
    cutAngle = Math.PI * 0.55,
    flip = false,
    wallColor,
    liningColor,
    cutColor,
  } = {}) {
    const N = profilePoints;
    const S = segments;
    const profileCount = N * 2; // apex -> rim (outer), rim -> apex (inner)
    const surfaceVerts = (S + 1) * profileCount;
    const capVerts = profileCount; // one strip of paired outer/inner points
    const total = surfaceVerts + capVerts * 2;

    const positions = new Float32Array(total * 3);
    const colors = new Float32Array(total * 3);
    const indices = [];

    // --- lathe surface indices
    for (let k = 0; k < S; k++) {
      for (let i = 0; i < profileCount - 1; i++) {
        const a = k * profileCount + i;
        const b = (k + 1) * profileCount + i;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    // --- cut faces: quads pairing outer[i] with inner[i]
    for (let c = 0; c < 2; c++) {
      const base = surfaceVerts + c * capVerts;
      for (let i = 0; i < N - 1; i++) {
        const outerA = base + i;
        const outerB = base + i + 1;
        const innerA = base + profileCount - 1 - i;
        const innerB = base + profileCount - 2 - i;
        // Wind the two faces opposite ways so both cut faces point outwards.
        if (c === 0) indices.push(outerA, innerA, outerB, innerA, innerB, outerB);
        else indices.push(outerA, outerB, innerA, innerA, outerB, innerB);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(indices);

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.58,
      metalness: 0.02,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.97,
      // A touch of emissive keeps the cavity lining readable where the key light
      // cannot reach inside the chamber.
      emissive: new THREE.Color('#4a1a24'),
      emissiveIntensity: 0.7,
    });

    super(geometry, material);
    this.name = 'chamber';

    this.N = N;
    this.S = S;
    this.profileCount = profileCount;
    this.surfaceVerts = surfaceVerts;
    this.capVerts = capVerts;
    this.flip = flip ? -1 : 1;

    // The wedge is centred on +z so it faces the scene's default camera.
    this.phiStart = cutAngle / 2;
    this.phiStep = (Math.PI * 2 - cutAngle) / S;
    this._sin = new Float32Array(S + 1);
    this._cos = new Float32Array(S + 1);
    for (let k = 0; k <= S; k++) {
      const phi = this.phiStart + k * this.phiStep;
      this._sin[k] = Math.sin(phi);
      this._cos[k] = Math.cos(phi);
    }

    this._profileR = new Float32Array(profileCount);
    this._profileY = new Float32Array(profileCount);
    this._writeColors(
      colors,
      wallColor ?? new THREE.Color('#c85466'),
      liningColor ?? new THREE.Color('#f0a0a8'),
      cutColor ?? new THREE.Color('#7d2f3d')
    );
  }

  /** Static per-vertex tint: outer wall, inner lining, and the exposed cut faces. */
  _writeColors(colors, wall, lining, cut) {
    const write = (index, color) => {
      colors[index * 3 + 0] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    };
    for (let k = 0; k <= this.S; k++) {
      for (let i = 0; i < this.profileCount; i++) {
        write(k * this.profileCount + i, i < this.N ? wall : lining);
      }
    }
    for (let v = this.surfaceVerts; v < this.surfaceVerts + this.capVerts * 2; v++) write(v, cut);
    this.geometry.attributes.color.needsUpdate = true;
  }

  /**
   * @param {{
   *   cavityRadius: number, cavitySemiLength: number,
   *   outerRadius: number, outerSemiLength: number,
   *   baseY: number,
   * }} shape valve plane at `baseY`; the chamber extends away from it
   */
  setShape({ cavityRadius, cavitySemiLength, outerRadius, outerSemiLength, baseY }) {
    const { N, profileCount } = this;
    const R = this._profileR;
    const Y = this._profileY;

    // Truncation angle: where each spheroid meets the valve plane.
    const outerMax = Math.acos(THREE.MathUtils.clamp(-baseY / outerSemiLength, -1, 1));
    const innerMax = Math.acos(THREE.MathUtils.clamp(-baseY / cavitySemiLength, -1, 1));

    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const ao = t * outerMax;
      R[i] = outerRadius * Math.sin(ao);
      Y[i] = -outerSemiLength * Math.cos(ao) * this.flip;

      const ai = (1 - t) * innerMax; // inner run goes rim -> apex
      R[N + i] = cavityRadius * Math.sin(ai);
      Y[N + i] = -cavitySemiLength * Math.cos(ai) * this.flip;
    }

    const positions = this.geometry.attributes.position.array;
    for (let k = 0; k <= this.S; k++) {
      const sin = this._sin[k];
      const cos = this._cos[k];
      const offset = k * profileCount * 3;
      for (let i = 0; i < profileCount; i++) {
        const p = offset + i * 3;
        positions[p] = R[i] * sin;
        positions[p + 1] = Y[i];
        positions[p + 2] = R[i] * cos;
      }
    }
    // Cut faces sit in the two planes that bound the wedge.
    for (let c = 0; c < 2; c++) {
      const sin = c === 0 ? this._sin[0] : this._sin[this.S];
      const cos = c === 0 ? this._cos[0] : this._cos[this.S];
      const base = (this.surfaceVerts + c * this.capVerts) * 3;
      for (let i = 0; i < profileCount; i++) {
        const p = base + i * 3;
        positions[p] = R[i] * sin;
        positions[p + 1] = Y[i];
        positions[p + 2] = R[i] * cos;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
  }
}
