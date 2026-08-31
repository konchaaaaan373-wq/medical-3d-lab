import * as THREE from 'three';
import { TubeSurface, coilCurve, smoothCurve } from '../../shared/geometry/tube.js';
import { ghostMaterial, tissueMaterial } from '../../shared/materials.js';

/**
 * The opacity a double-sided shell needs in order to *look* like `singleLayer`.
 *
 * Two faces of opacity `a` composite to `2a − a²`; this is that solved for `a`.
 * See failure mode B in `docs/organ-3d-playbook.md`.
 *
 * @param {number} singleLayer the appearance wanted, 0–1
 */
const doubleSided = (singleLayer) => 1 - Math.sqrt(1 - singleLayer);

/**
 * A glomerulus: two arterioles and the capillary tuft between them.
 *
 * PROTOTYPE-GRADE ANATOMY, NAMED STRUCTURE. What is right is the arrangement,
 * and the arrangement is the whole reason this shape is worth drawing: a
 * capillary bed with an arteriole at **each** end, which is what lets the
 * pressure inside it be set independently of the flow through it. Everything
 * else — the number of capillary loops, their course, the size of Bowman's
 * capsule — is illustrative.
 *
 * The builder knows nothing about any disease. It produces two arterioles
 * whose lumens the scene can rewrite and a capsule that can be lit to whatever
 * degree filtration is happening; which of those happens, and by how much, is
 * a reading of a model.
 *
 * @param {{ afferent?: string, efferent?: string, capillary?: string,
 *           capsule?: string, filtrate?: string }} [colors]
 */
export function buildGlomerulus(colors = {}) {
  const {
    afferent = '#d2564f',
    efferent = '#b8735f',
    capillary = '#c9564f',
    capsule = '#8fb8d8',
    filtrate = '#e8d75f',
  } = colors;

  const object = new THREE.Group();
  object.name = 'glomerulus';

  const parts = {};

  /** One vessel: a tube whose lumen the scene can rewrite. */
  function vessel(name, curve, { radius, color, radial = 14, opacity = 1 }) {
    const surface = new TubeSurface(curve, { radius, steps: 40, radial });
    const material = tissueMaterial({ color, roughness: 0.4, opacity, emissiveIntensity: 0.08 });
    const mesh = new THREE.Mesh(surface.geometry, material);
    mesh.name = name;
    object.add(mesh);
    parts[name] = { name, curve, surface, mesh, material };
    return parts[name];
  }

  // --- the two arterioles ---------------------------------------------------
  // **Both enter and leave at the same pole.** That is the vascular pole, and
  // it is not a drawing convenience: the afferent and efferent arterioles lie
  // side by side there, which is what puts the juxtaglomerular apparatus
  // between them. An earlier version ran them straight through the tuft, which
  // drew a capillary in series with two pipes rather than a glomerulus.
  //
  // Both are drawn at the same built calibre so that any difference on screen
  // is one the scene put there, out of a model, and not one baked into the
  // mesh.
  const ARTERIOLE_RADIUS = 0.115;

  const afferentCurve = smoothCurve([
    [-2.5, 1.05, 0],
    [-1.75, 0.86, 0.05],
    [-1.1, 0.58, 0.08],
    [-0.62, 0.3, 0.08],
  ]);
  vessel('afferent', afferentCurve, { radius: () => ARTERIOLE_RADIUS, color: afferent, radial: 16 });

  const efferentCurve = smoothCurve([
    [-0.62, -0.26, 0.08],
    [-1.1, -0.52, 0.08],
    [-1.75, -0.78, 0.05],
    [-2.5, -0.95, 0],
  ]);
  vessel('efferent', efferentCurve, { radius: () => ARTERIOLE_RADIUS, color: efferent, radial: 16 });

  // --- the tuft -------------------------------------------------------------
  // Four coiled loops rather than one, so that it reads as a bed of capillaries
  // in parallel — which is what makes its resistance small compared with the
  // arterioles either side and its surface large enough to filter across.
  // Three coils, each a flat rosette, turned onto three different planes so
  // that together they read as a ball of capillaries in parallel — which is
  // what makes the tuft's resistance small compared with the arterioles either
  // side of it, and its surface large enough to filter across. Turning them all
  // about the same axis leaves them coplanar and draws a smear.
  const TUFT_PLANES = [
    [0, 0, 0],
    [Math.PI / 2, 0.4, 0],
    [0.35, 0, Math.PI / 2],
    [Math.PI / 4, 0.8, Math.PI / 4],
  ];
  const loops = [];
  TUFT_PLANES.forEach((rotation, i) => {
    const curve = coilCurve({
      loops: 9,
      inner: 0.2,
      outer: 0.62,
      depth: 0.52,
      height: 0.08,
      seed: 11 + i * 7,
      jitter: 0.14,
    });
    const loop = vessel(`tuft${i}`, curve, {
      radius: () => 0.05,
      color: capillary,
      radial: 8,
    });
    loop.mesh.rotation.set(...rotation);
    loops.push(loop);
  });

  // The stubs that join the arterioles to the tuft, so nothing floats.
  vessel(
    'afferentStub',
    smoothCurve([
      [-0.62, 0.3, 0.08],
      [-0.42, 0.22, 0.05],
      [-0.24, 0.12, 0],
    ]),
    { radius: () => 0.09, color: afferent, radial: 10 }
  );
  vessel(
    'efferentStub',
    smoothCurve([
      [-0.24, -0.1, 0],
      [-0.42, -0.19, 0.05],
      [-0.62, -0.26, 0.08],
    ]),
    { radius: () => 0.09, color: efferent, radial: 10 }
  );

  // --- Bowman's capsule -----------------------------------------------------
  // Drawn as a shell rather than a ball: the tuft has to stay readable through
  // it, and a capsule dense enough to see clearly is one that hides the thing
  // it contains.
  //
  // `ghostMaterial` draws both sides, so a ray crosses the sphere twice and two
  // layers of opacity `a` composite to `2a − a²` — failure mode B in
  // [`docs/organ-3d-playbook.md`](../../../../docs/organ-3d-playbook.md).
  // The numbers below are therefore *single-layer* appearances, put through the
  // inverse; writing the composited value directly is how a capsule ends up
  // brighter than the vessels it sits between.
  const capsuleMaterial = ghostMaterial({ color: capsule, opacity: doubleSided(0.05) });
  const capsuleMesh = new THREE.Mesh(new THREE.SphereGeometry(0.88, 28, 22), capsuleMaterial);
  capsuleMesh.name = 'bowman-capsule';
  object.add(capsuleMesh);

  // --- the way out ----------------------------------------------------------
  // Where the filtrate goes. A stub, not a tubule: there is no tubule in the
  // model this scene reads, and drawing one would promise handling that is not
  // there.
  const tubuleCurve = smoothCurve([
    [0.52, -0.4, 0.02],
    [0.95, -0.78, 0.08],
    [1.5, -1.15, 0.12],
    [2.15, -1.32, 0.1],
  ]);
  const tubule = vessel('tubule', tubuleCurve, {
    radius: (u) => 0.085 + 0.02 * u,
    color: filtrate,
    radial: 12,
    opacity: 0.5,
  });

  return {
    object,
    parts,
    /** The paths blood and filtrate travel, for particle streams. */
    paths: {
      afferent: [afferentCurve],
      efferent: [efferentCurve],
      filtrate: [tubuleCurve],
    },
    anchors: {
      afferent: new THREE.Vector3(-2.0, 1.5, 0.1),
      efferent: new THREE.Vector3(-2.15, -1.4, 0.1),
      tuft: new THREE.Vector3(0, 1.0, 0.4),
      filtrate: new THREE.Vector3(2.3, -1.75, 0.2),
    },

    /**
     * Redraws one arteriole's lumen.
     *
     * The scene passes a resistance ratio and this turns it into a calibre.
     * A resistance is not a radius — Poiseuille puts them a fourth power
     * apart — so the conversion happens here, once, and is named for what it
     * is: a **presentation** mapping from the model's resistance to a drawn
     * width. The model never sees it.
     *
     * @param {string} name `afferent` or `efferent`
     * @param {number} resistanceRatio 1 = the resistance this vessel was built at
     */
    setResistance(name, resistanceRatio) {
      const found = parts[name];
      if (!found) throw new Error(`glomerulus: no arteriole "${name}"`);
      const stub = parts[`${name}Stub`];
      // r ∝ R^(−1/4), then flattened towards 1 so that a constricted arteriole
      // is legible rather than a hairline. Flattening a fourth-power law is a
      // drawing decision and it is why the read-out shows the resistance.
      const exact = Math.max(0.05, resistanceRatio) ** -0.25;
      const drawn = 1 + (exact - 1) * 1.6;
      const factor = Math.min(1.6, Math.max(0.3, drawn));
      found.surface.refresh((u, base) => base * factor);
      stub?.surface.refresh((u, base) => base * (1 + (factor - 1) * 0.5));
    },

    /**
     * How brightly the capsule reads as filtering.
     *
     * Presentation, and named as such: filtration is a rate, and there is no
     * honest way to draw a rate. What this does is make the space the filtrate
     * enters more or less present, so that "filtration has stopped" is
     * something visible next to the number that says so.
     *
     * @param {number} fraction 0 = nothing is being filtered, 1 = the reference rate
     */
    setFiltration(fraction) {
      const shown = Math.min(1, Math.max(0, fraction));
      capsuleMaterial.opacity = doubleSided(0.05 + 0.1 * shown);
      tubule.material.opacity = 0.12 + 0.5 * shown;
      for (const loop of loops) loop.material.emissiveIntensity = 0.04 + 0.16 * shown;
    },

    dispose() {
      for (const found of Object.values(parts)) {
        found.surface.dispose();
        found.material.dispose();
      }
      capsuleMesh.geometry.dispose();
      capsuleMaterial.dispose();
    },
  };
}
