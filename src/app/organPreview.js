/**
 * Lightweight, lazy 3D organ previews for the public Explorer.
 *
 * The catalogue has to remain readable when WebGL is unavailable, so the DOM
 * is complete before this module does any work. Each preview is constructed
 * only as it approaches the viewport, stops rendering off-screen, and becomes
 * a still image when the reader requests reduced motion.
 */

const BUILDERS = Object.freeze({
  brain: async () => {
    const { buildBrain } = await import('../scenes/nervous/organs/brain.js');
    return buildBrain({ color: '#d5b9dc', stemColor: '#ae91bd', cerebellum: '#bd9ecb' });
  },
  heart: async () => {
    const { buildHeart } = await import('../scenes/cardiovascular/organs/heart.js');
    return buildHeart({ color: '#c9505d', vesselColor: '#df7b82', atriumColor: '#a84253' });
  },
  lungs: async () => {
    const { buildLungs } = await import('../scenes/respiratory/organs/lungs.js');
    return buildLungs({ detail: 5, referenceSamples: 2500, opacity: 0.96 });
  },
  liver: async () => {
    const { buildLiver } = await import('../scenes/hepatobiliary/organs/liver.js');
    return buildLiver({ detail: 4, referenceSamples: 2500, opacity: 0.94 });
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
    return { object };
  },
});

export const hasOrganPreview = (organId) => organId in BUILDERS;

/**
 * @param {HTMLElement} container
 * @param {string} organId
 * @returns {() => void}
 */
export function mountOrganPreview(container, organId) {
  const build = BUILDERS[organId];
  if (!build) return () => {};

  let disposed = false;
  let started = false;
  let inView = typeof window.IntersectionObserver !== 'function';
  let pausedByPointer = false;
  let frame = 0;
  let lastTime = 0;
  let renderer = null;
  let scene = null;
  let camera = null;
  let model = null;
  let built = null;
  let resizeObserver = null;
  const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  container.dataset.previewState = 'waiting';

  const shouldAnimate = () =>
    !disposed &&
    Boolean(renderer && scene && model) &&
    inView &&
    !pausedByPointer &&
    document.visibilityState !== 'hidden' &&
    !motion?.matches;

  const render = () => {
    if (disposed || !renderer || !scene || !camera) return;
    renderer.render(scene, camera);
  };

  const tick = (time) => {
    frame = 0;
    if (!shouldAnimate()) return;
    const dt = Math.min(0.05, Math.max(0, (time - (lastTime || time)) / 1000));
    lastTime = time;
    model.rotation.y += dt * 0.34;
    render();
    frame = window.requestAnimationFrame(tick);
  };

  const syncActivity = () => {
    if (shouldAnimate()) {
      if (!frame) {
        lastTime = 0;
        frame = window.requestAnimationFrame(tick);
      }
    } else {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      if (inView && document.visibilityState !== 'hidden') render();
    }
  };

  const resize = () => {
    if (!renderer) return;
    const width = Math.max(1, Math.round(container.clientWidth));
    const height = Math.max(1, Math.round(container.clientHeight));
    renderer.setSize(width, height, false);
    if (!camera) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  };

  const start = async () => {
    if (started || disposed) return;
    started = true;
    container.dataset.previewState = 'loading';

    try {
      const THREE = await import('three');
      if (disposed) return;

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'low-power',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      container.append(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
      scene.add(
        new THREE.HemisphereLight('#d8f0ff', '#17222b', 2.15),
        makeDirectionalLight(THREE, '#fff4e7', 3.8, [3.8, 4.6, 5.4]),
        makeDirectionalLight(THREE, '#7cc8d8', 2.2, [-4.2, 1.2, -3.5])
      );

      built = await build(THREE);
      if (disposed) {
        built?.dispose?.();
        disposeTree(built?.object);
        renderer?.dispose();
        renderer?.forceContextLoss?.();
        renderer?.domElement.remove();
        return;
      }

      model = new THREE.Group();
      model.name = `${organId}-explorer-preview`;
      model.add(built.object);
      scene.add(model);

      built.object.updateWorldMatrix(true, true);
      const sphere = new THREE.Box3().setFromObject(built.object).getBoundingSphere(new THREE.Sphere());
      if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) throw new Error('empty organ preview');
      built.object.position.sub(sphere.center);
      const distance = sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov * 0.5));
      camera.near = Math.max(0.01, distance / 100);
      camera.far = distance * 10;
      camera.position.set(distance * 0.12, distance * 0.06, distance * 1.08);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      model.rotation.set(-0.04, -0.55, 0.03);

      if (typeof window.ResizeObserver === 'function') {
        resizeObserver = new window.ResizeObserver(resize);
        resizeObserver.observe(container);
      }
      resize();
      container.dataset.previewState = 'ready';
      syncActivity();
    } catch (error) {
      built?.dispose?.();
      disposeTree(model ?? built?.object);
      renderer?.dispose();
      renderer?.forceContextLoss?.();
      renderer?.domElement.remove();
      built = null;
      model = null;
      scene = null;
      camera = null;
      renderer = null;
      if (disposed) return;
      container.dataset.previewState = 'unavailable';
      container.setAttribute('title', '3D preview unavailable / 3Dプレビューを表示できません');
      console.error(`organ preview: ${organId}`, error);
    }
  };

  const pointerEntered = () => {
    pausedByPointer = true;
    syncActivity();
  };
  const pointerLeft = () => {
    pausedByPointer = false;
    syncActivity();
  };
  const visibilityChanged = () => syncActivity();
  container.addEventListener('pointerenter', pointerEntered);
  container.addEventListener('pointerleave', pointerLeft);
  container.addEventListener('pointerdown', pointerEntered);
  container.addEventListener('pointerup', pointerLeft);
  document.addEventListener('visibilitychange', visibilityChanged);
  motion?.addEventListener?.('change', syncActivity);

  const Observer = window.IntersectionObserver;
  const observer = Observer
    ? new Observer(
        ([entry]) => {
          inView = Boolean(entry?.isIntersecting);
          if (inView) void start();
          syncActivity();
        },
        { rootMargin: '240px 0px', threshold: 0.01 }
      )
    : null;
  observer?.observe(container);
  if (!observer) void start();

  return () => {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    resizeObserver?.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    container.removeEventListener('pointerenter', pointerEntered);
    container.removeEventListener('pointerleave', pointerLeft);
    container.removeEventListener('pointerdown', pointerEntered);
    container.removeEventListener('pointerup', pointerLeft);
    document.removeEventListener('visibilitychange', visibilityChanged);
    motion?.removeEventListener?.('change', syncActivity);
    built?.dispose?.();
    disposeTree(model);
    renderer?.dispose();
    renderer?.forceContextLoss?.();
    renderer?.domElement.remove();
  };
}

function makeDirectionalLight(THREE, color, intensity, position) {
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(...position);
  return light;
}

function disposeTree(root) {
  root?.traverse?.((object) => {
    object.geometry?.dispose?.();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials.filter(Boolean)) {
      for (const value of Object.values(material)) value?.isTexture && value.dispose();
      material.dispose?.();
    }
  });
}
