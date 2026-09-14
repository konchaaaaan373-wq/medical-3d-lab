/**
 * The reusable organ builders, and the two sizes this app renders them at.
 *
 * `organs/<organ>.js` is where an organ's geometry lives; this file is the
 * registry that says which of them can be dropped into a plain viewport with
 * no scene around them, and at what quality. Two surfaces need exactly that:
 * the Explorer's small lazy previews and the landing hero.
 *
 * Nothing here imports `three` statically. Every builder is behind a dynamic
 * import so that a visitor who never scrolls to a preview never downloads an
 * organ, and the entry chunk stays free of Three.js.
 *
 * This is a *presentation* registry. It picks colours and tessellation, never
 * anatomy: an organ that is hard to see is fixed by the profile below, not by
 * the builder.
 */

/** Organs with a builder that stands on its own, in head-to-toe order. */
export const ORGAN_MODEL_IDS = Object.freeze(['brain', 'heart', 'lungs', 'liver', 'kidney']);

/**
 * How finely the lung preview is built.
 *
 * `lungs.js` cuts five lobes out of one sampled surface. Two things go wrong
 * when it is built cheaply: the rim between a lobe and its fissure zigzags
 * at the spacing of the tessellation (`detail`), and the surface itself grows
 * a ragged fuzz where the sampled field is too sparse (`referenceSamples`).
 * Measured at preview size (290 × 238 CSS px, DPR 2), Node build time as the
 * median of five:
 *
 *   detail  5 / 2 500 samples   34 ms   1 945 vertices   stepped lobes, torn fissures
 *   detail  8 / 6 000 samples   38 ms   4 195 vertices   sawtooth along every fissure
 *   detail 10 / 8 000 samples   26 ms   6 225 vertices   fissures fine, fuzz on the apex
 *   detail 10 / 12 000 samples  39 ms   6 225 vertices   clean — adopted
 *   detail 12 / 12 000 samples  51 ms   8 655 vertices   no visible gain
 *
 * The builder's own default (12 / 24 000) is for a subject that fills the
 * viewport, which is what the hero profile below asks for.
 */
export const LUNG_PREVIEW_QUALITY = Object.freeze({ detail: 10, referenceSamples: 12000, opacity: 0.96 });

/** The hero fills a large frame, so it pays the builder's own default. */
export const LUNG_HERO_QUALITY = Object.freeze({ detail: 12, referenceSamples: 24000, opacity: 0.96 });

/** Per-profile build settings. `preview` is a thumbnail; `hero` fills a frame. */
const PROFILES = Object.freeze({
  preview: Object.freeze({
    lungs: LUNG_PREVIEW_QUALITY,
    liver: Object.freeze({ detail: 4, referenceSamples: 2500, opacity: 0.94 }),
  }),
  hero: Object.freeze({
    lungs: LUNG_HERO_QUALITY,
    liver: Object.freeze({ detail: 6, referenceSamples: 9000, opacity: 0.94 }),
  }),
});

const BUILDERS = Object.freeze({
  brain: async () => {
    const { buildBrain } = await import('../scenes/nervous/organs/brain.js');
    return buildBrain({ color: '#d5b9dc', stemColor: '#ae91bd', cerebellum: '#bd9ecb' });
  },
  heart: async () => {
    const { buildHeart } = await import('../scenes/cardiovascular/organs/heart.js');
    return buildHeart({ color: '#c9505d', vesselColor: '#df7b82', atriumColor: '#a84253' });
  },
  lungs: async (THREE, profile) => {
    const { buildLungs } = await import('../scenes/respiratory/organs/lungs.js');
    return buildLungs(profile.lungs);
  },
  liver: async (THREE, profile) => {
    const { buildLiver } = await import('../scenes/hepatobiliary/organs/liver.js');
    return buildLiver(profile.liver);
  },
  stomach: async () => {
    const { buildStomach } = await import('../scenes/gastrointestinal/organs/stomach.js');
    return buildStomach({});
  },
  esophagus: async () => {
    const { buildEsophagus } = await import('../scenes/gastrointestinal/organs/stomach.js');
    return buildEsophagus({});
  },
  colon: async (THREE) => {
    // The colon frames the small bowel, and the pair is what makes the shape
    // recognisable at thumbnail size — a colon alone reads as a loop of pipe.
    const { buildColon, buildSmallIntestine } = await import('../scenes/gastrointestinal/organs/intestine.js');
    const colon = buildColon({});
    const small = buildSmallIntestine({});
    const object = new THREE.Group();
    object.name = 'bowel-preview';
    object.add(colon.object, small.object);
    return {
      object,
      dispose: () => {
        colon.dispose?.();
        small.dispose?.();
      },
    };
  },
  gallbladder: async (THREE) => {
    const { buildGallbladder } = await import('../scenes/hepatobiliary/organs/liver.js');
    const { buildBiliaryTree } = await import('../scenes/hepatobiliary/organs/biliaryTree.js');
    const gallbladder = buildGallbladder({});
    const tree = buildBiliaryTree({});
    const object = new THREE.Group();
    object.name = 'biliary-preview';
    object.add(tree.object, gallbladder.object);
    return {
      object,
      dispose: () => {
        gallbladder.dispose?.();
        tree.dispose?.();
      },
    };
  },
  pancreas: async () => {
    const { buildPancreas } = await import('../scenes/hepatobiliary/organs/pancreas.js');
    return buildPancreas({});
  },
  kidney: async (THREE) => {
    const { buildKidney } = await import('../scenes/renal/organs/kidney.js');
    const left = buildKidney({ side: 'left', opacity: 0.92 });
    const right = buildKidney({ side: 'right', opacity: 0.92 });
    left.object.position.x = 0.72;
    right.object.position.x = -0.72;
    right.object.position.y = -0.13;
    const object = new THREE.Group();
    object.name = 'kidneys-preview';
    object.add(left.object, right.object);
    return {
      object,
      dispose: () => {
        left.dispose?.();
        right.dispose?.();
      },
    };
  },
});

/** @param {'preview'|'hero'} profileId */
const buildersFor = (profileId) => {
  const profile = PROFILES[profileId];
  return Object.freeze(
    Object.fromEntries(
      Object.entries(BUILDERS).map(([organId, build]) => [organId, (THREE) => build(THREE, profile)])
    )
  );
};

/** Thumbnail-sized builders, as `mountOrganPreview` expects them. */
export const ORGAN_PREVIEW_BUILDERS = buildersFor('preview');

/** Full-frame builders for the landing hero. */
export const ORGAN_HERO_BUILDERS = buildersFor('hero');

/** @param {string} organId */
export const hasOrganModel = (organId) => organId in BUILDERS;

/**
 * The lighting rig for an organ shown on its own.
 *
 * A scene lights its subject with `scenes/shared/lighting.js`, whose point
 * lights are placed and attenuated for a subject at that scene's scale. These
 * organs are drawn at their own scales, side by side, with no scene around
 * them — so the rig is directional and hemispheric, which does not care how
 * large the organ is or how far the camera had to go to fit it.
 *
 * Purely presentational: if an organ is hard to see, this is the file to
 * change, not the builder.
 *
 * @param {any} THREE
 * @param {{intensity?: number}} [options] scale for surfaces that already have
 *   an environment map contributing ambient light.
 */
export function createOrganLights(THREE, { intensity = 1 } = {}) {
  const group = new THREE.Group();
  group.name = 'organ-lights';
  group.add(new THREE.HemisphereLight('#d8f0ff', '#17222b', 2.15 * intensity));
  group.add(directional(THREE, '#fff4e7', 3.8 * intensity, [3.8, 4.6, 5.4]));
  group.add(directional(THREE, '#7cc8d8', 2.2 * intensity, [-4.2, 1.2, -3.5]));
  return group;
}

function directional(THREE, color, intensity, position) {
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(...position);
  return light;
}
