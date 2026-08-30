/**
 * Runtime assertions against the assembled scene.
 *
 * Unit tests build a component and ask it questions. That misses the whole
 * class of bug this scene kept shipping: a value that is correct when it is
 * constructed and wrong once every update path has run against it. The aorta
 * rendered at a third of its intended opacity for two passes with 129 tests
 * green, because nothing ever asked the *running application* what its
 * materials looked like.
 *
 * So these run in the browser, against the built app, after the scene has been
 * driven through its states. Each one is a claim someone would otherwise have
 * to make by eye.
 *
 * Requires Playwright (deliberately not a dependency of this repo) and a
 * preview build:
 *
 *     npm run build
 *     npx vite preview --port 4173 --strictPort &
 *     node scenecheck.mjs
 */
import { chromium } from 'playwright';

const ORIGIN = 'http://localhost:4173';

/**
 * How much brighter than the heart muscle the aorta may render. Arterial wall
 * really is paler than myocardium, so it is allowed to be brighter — just not
 * so much brighter that the eye lands on the vessel before the heart.
 */
const MAX_AORTA_BRIGHTNESS = 1.9;

/**
 * How bright any pixel may get. This is a regression guard, not a target: it
 * sits just above the brightest pixel the scene currently produces (236, a
 * rim highlight on the basal shoulder at the close-up framing), so anything
 * that makes the picture hotter trips it. The blowout it replaced measured
 * 250+ and was pure white. Deliberate emissive marks — the label dots — sit
 * around 210.
 */
const MAX_TISSUE_LUMINANCE = 240;
const ok = [];
const fails = [];
const check = (cond, msg) => (cond ? ok.push(msg) : fails.push(msg));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${ORIGIN}/?qa#heart-failure`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__lab?.scene, null, { timeout: 20000 });
await page.waitForTimeout(2500);

/** Reads the live scene after it has been running for a while. */
const probe = () =>
  page.evaluate(() => {
    // `scene` is the scene module (which owns the components); `viewer.scene`
    // is the three.js graph it draws into.
    const { scene, viewer } = window.__lab;
    const root = viewer.scene;
    const byName = (name) => root.getObjectByName(name);

    let meshCount = 0;
    root.traverse((o) => {
      if (o.isMesh || o.isPoints) meshCount++;
    });

    const luminance = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    const vessels = scene.vessels;
    const chamber = scene.ventricle;
    // The epicardium is the first of the chamber's three material groups.
    const myocardium = Array.isArray(chamber?.material) ? chamber.material[0] : chamber?.material;

    const lungs = byName('lung-context');
    const lungScale = (side) => {
      const l = lungs?.getObjectByName(`lung-${side}`);
      return l ? l.scale.x * l.scale.y * l.scale.z : null;
    };

    return {
      meshCount,
      arterialOpacity: vessels?.arterialMaterial?.opacity ?? null,
      arterialLuminance: vessels ? luminance(vessels.arterialMaterial.color) : null,
      myocardiumLuminance: myocardium ? luminance(myocardium.color) : null,
      atriumOpacity: vessels?.atriumMaterial?.opacity ?? null,
      atriumScale: vessels?.atriumDistension ?? null,
      sheathScale: scene.congestion?.atriumSheath?.scale?.x ?? null,
      lungLeft: lungScale('left'),
      lungRight: lungScale('right'),
      lungOpacity: vessels?.lungMaterial?.opacity ?? null,
    };
  });

const resting = await probe();

check(resting.meshCount > 30, `the scene assembled (${resting.meshCount} drawn objects)`);

// The bug that shipped twice: opaque in the constructor, translucent by the
// first frame. Asked of the running app, not of a freshly built material.
check(
  resting.arterialOpacity > 0.7,
  `the aorta renders as an artery wall, not a window (opacity ${resting.arterialOpacity})`
);

// Brightness, measured where it matters: on the pixels actually drawn, at
// points projected from the anatomy. Comparing the materials' base colours
// instead would compare two numbers that neither texture nor lighting has
// touched yet — a proxy that can pass while the frame looks wrong, which is
// the failure mode this whole harness exists for.
const brightness = await page.evaluate(() => {
  const { scene, viewer } = window.__lab;
  const camera = viewer.camera;
  const canvas = viewer.renderer.domElement;

  // Force a fresh frame, then copy it out before the buffer is recycled.
  viewer.renderer.render(viewer.scene, camera);
  const flat = document.createElement('canvas');
  flat.width = canvas.width;
  flat.height = canvas.height;
  const ctx = flat.getContext('2d');
  ctx.drawImage(canvas, 0, 0);

  const sample = (world, radius = 6) => {
    const p = world.clone().project(camera);
    const x = Math.round(((p.x + 1) / 2) * flat.width);
    const y = Math.round(((1 - p.y) / 2) * flat.height);
    if (x < radius || y < radius || x >= flat.width - radius || y >= flat.height - radius) return null;
    const data = ctx.getImageData(x - radius, y - radius, radius * 2, radius * 2).data;
    let total = 0;
    let count = 0;
    for (let i = 0; i < data.length; i += 4) {
      total += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      count++;
    }
    return { x, y, luminance: total / count };
  };

  // Sample points taken from the drawn geometry itself, so this needs no
  // production API existing only for the benefit of a test: a vertex partway
  // up the ascending aorta, and the ventricle's most lateral vertex at
  // mid-height, which is its free wall. The arch apex would be the obvious
  // aortic point and is the wrong one — at the default framing it sits above
  // the top of the frame, and a sample off the canvas measures nothing.
  const extremeVertex = (object, score) => {
    let best = null;
    let bestScore = -Infinity;
    object.updateWorldMatrix(true, true);
    object.traverse((o) => {
      const pos = o.geometry?.attributes?.position;
      if (!pos) return;
      const v = new (o.position.constructor)();
      for (let i = 0; i < pos.count; i += 7) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        const value = score(v);
        if (value > bestScore) {
          bestScore = value;
          best = v.clone();
        }
      }
    });
    return best;
  };

  const aortaMesh = (() => {
    let found = null;
    scene.vessels.traverse((o) => {
      if (!found && o.isMesh && o.material === scene.vessels.arterialMaterial) found = o;
    });
    return found;
  })();

  const aortaPoint = aortaMesh ? extremeVertex(aortaMesh, (v) => -Math.abs(v.y - 3.0)) : null;
  const wallPoint = scene.ventricle
    ? extremeVertex(scene.ventricle, (v) => Math.abs(v.x) - Math.abs(v.y + 1.7) * 2)
    : null;
  return {
    aorta: aortaPoint ? sample(aortaPoint) : null,
    myocardium: wallPoint ? sample(wallPoint) : null,
    aortaAt: aortaPoint?.toArray().map((n) => +n.toFixed(2)),
    wallAt: wallPoint?.toArray().map((n) => +n.toFixed(2)),
  };
});

check(
  brightness.aorta !== null && brightness.myocardium !== null,
  `both sample points are on screen (${JSON.stringify(brightness)})`
);
if (brightness.aorta && brightness.myocardium) {
  check(
    brightness.aorta.luminance < brightness.myocardium.luminance * MAX_AORTA_BRIGHTNESS,
    `the aorta does not out-brighten the myocardium on screen ` +
      `(${brightness.aorta.luminance.toFixed(1)} vs ${brightness.myocardium.luminance.toFixed(1)})`
  );
}

check(
  resting.lungRight > resting.lungLeft,
  `the right lung is the larger one (${resting.lungRight?.toFixed(2)} vs ${resting.lungLeft?.toFixed(2)})`
);

check(
  resting.lungOpacity !== null && resting.lungOpacity < 0.3,
  `the lungs stay quiet enough not to compete (${resting.lungOpacity})`
);

// Nothing made of tissue may blow out to white. A specular streak on the
// basal shoulder did exactly that for several passes, and it took measuring
// the frame to find it: at a glance it reads as a highlight, and only a pixel
// histogram says it is the brightest thing on screen and pure white.
const hottest = await page.evaluate(() => {
  const { viewer } = window.__lab;
  viewer.composer ? viewer.composer.render() : viewer.renderer.render(viewer.scene, viewer.camera);
  const c = viewer.renderer.domElement;
  const flat = document.createElement('canvas');
  flat.width = c.width;
  flat.height = c.height;
  const ctx = flat.getContext('2d');
  ctx.drawImage(c, 0, 0);
  const d = ctx.getImageData(0, 0, flat.width, flat.height).data;
  let best = 0;
  let at = null;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    if (lum > best) {
      best = lum;
      at = [(i / 4) % flat.width, Math.floor(i / 4 / flat.width)];
    }
  }
  return { luminance: +best.toFixed(1), at };
});

check(
  hottest.luminance < MAX_TISSUE_LUMINANCE,
  `nothing blows out to white (brightest pixel ${hottest.luminance} at ${hottest.at})`
);

// Drive the remodelling slider to its far end and re-probe: the values must
// still hold once every update path has run.
await page.evaluate(() => {
  const slider = document.querySelector('input[type="range"]');
  if (!slider) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(slider, slider.max);
  slider.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(1500);
const diseased = await probe();

check(
  diseased.arterialOpacity === resting.arterialOpacity,
  `the aorta's opacity survives a state change (${resting.arterialOpacity} -> ${diseased.arterialOpacity})`
);

// Run the story, which is what drives presentation emphasis and reveal.
await page.click('button:has-text("Story")');
await page.waitForTimeout(3000);
const early = await probe();
await page.evaluate(() => {
  const track = document.querySelector('.story-track');
  const r = track.getBoundingClientRect();
  track.dispatchEvent(new MouseEvent('click', { clientX: r.x + r.width * 0.92, clientY: r.y + r.height / 2, bubbles: true }));
});
await page.waitForTimeout(3500);
const congested = await probe();

check(
  congested.arterialOpacity > 0.7,
  `the aorta is still opaque during the story (${congested.arterialOpacity})`
);
check(
  congested.atriumScale > early.atriumScale,
  `the atrium distends as filling pressure rises (${early.atriumScale?.toFixed(3)} -> ${congested.atriumScale?.toFixed(3)})`
);
check(
  congested.sheathScale !== null &&
    Math.abs(congested.sheathScale - congested.atriumScale) < 1e-6,
  `the pressure sheath tracks the atrium rather than lagging inside it ` +
    `(sheath ${congested.sheathScale?.toFixed(3)}, atrium ${congested.atriumScale?.toFixed(3)})`
);

// Everything the scene labels must be on screen where the label points.
const framing = await page.evaluate(() => {
  const { viewer } = window.__lab;
  const dots = [...document.querySelectorAll('.label3d, .label3d-led, .label-dot')];
  const rect = viewer.renderer.domElement.getBoundingClientRect();
  return dots.map((el) => {
    const r = el.getBoundingClientRect();
    return {
      text: el.innerText.trim().slice(0, 24),
      inside: r.left >= rect.left - 4 && r.right <= rect.right + 4 && r.top >= rect.top - 4 && r.bottom <= rect.bottom + 4,
    };
  });
});
check(
  framing.length === 0 || framing.every((f) => f.inside),
  `every label stays inside the canvas (${framing.filter((f) => !f.inside).map((f) => f.text).join(', ') || 'all inside'})`
);

await browser.close();
console.log(ok.map((m) => 'PASS  ' + m).join('\n'));
if (fails.length) {
  console.log('\n' + fails.map((m) => 'FAIL  ' + m).join('\n'));
  process.exit(1);
}
console.log(`\nall ${ok.length} scene checks passed`);
