import test from 'node:test';
import assert from 'node:assert/strict';

import {
  hashChangeAction,
  installDeparture,
  needsDocumentUnlessClosed,
  routeNeedsDocument,
} from '../src/app/departure.js';
import { DOCUMENT_ROUTE_KINDS, isDocumentSurface, resolveRoute } from '../src/app/router.js';
import { destinationSubject, openingMessage } from '../src/app/destinationName.js';
import { FakeElement, installFakeDocument } from './helpers/fake-dom.js';

/**
 * Moving between reading surfaces without replacing the document.
 *
 * Every route change used to be a document load. Measured on the built site
 * that cost between 0.7 and 6.2 seconds and tore `#ui` down to nothing in the
 * middle of each one. The scene route earns it — it owns a WebGL context, an
 * animation loop and a multi-megabyte atlas, with no teardown to trust. The
 * landing page, the model index, the publication record and the legal
 * documents do not, and were paying it anyway.
 *
 * What this file fixes in place is the shape of the mistakes that are easy to
 * make once a route change stops being a reload:
 *
 * - swapping *out of* a scene (the teardown nobody writes, because arriving at
 *   one is the case everybody thinks of),
 * - advancing "the route this document is showing" on a navigation that has
 *   not landed yet, which is the original brain-under-a-`#/copd`-URL bug,
 * - letting a failed mount strand the reader on the page they left,
 * - and letting the second of two fast clicks lose to the first.
 */

/**
 * Let every queued microtask run.
 *
 * A swap is `Promise.resolve().then(onSwap).then(settle)` around an async
 * mount, so "await a couple of turns" is a guess that happens to be right
 * today and silently wrong the moment a `then` is added. Counting turns is
 * what made the first version of these tests fail against working code.
 */
const flush = async () => { for (let i = 0; i < 20; i += 1) await Promise.resolve(); };

/** A window stand-in that records what was asked of it. */
function fakeWindow(hash) {
  const listeners = new Map();
  return {
    location: {
      hash,
      reloads: 0,
      reload() { this.reloads += 1; },
    },
    addEventListener(type, fn) {
      const forType = listeners.get(type) ?? new Set();
      forType.add(fn);
      listeners.set(type, forType);
    },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    go(next) {
      this.location.hash = next;
      this.fire();
    },
    /** Fire `hashchange` for whatever the location already says. */
    fire() {
      for (const fn of listeners.get('hashchange') ?? []) fn();
    },
  };
}

function scene(hash, options = {}) {
  const restore = installFakeDocument();
  globalThis.document.body = new FakeElement('body');
  const windowRef = fakeWindow(hash);
  const swapped = [];
  const departure = installDeparture({
    windowRef,
    doc: globalThis.document,
    shownHash: hash,
    setTimer: () => 1,
    clearTimer: () => {},
    onSwap: async (next) => {
      swapped.push(next);
      return true;
    },
    ...options,
  });
  const veils = () => globalThis.document.body.children.filter((node) => node.className === 'loading');
  return { windowRef, departure, swapped, veils, restore };
}

// ------------------------------------------------------------- what needs one

test('only a scene needs a document of its own', () => {
  assert.equal(routeNeedsDocument(resolveRoute('#/brain-anatomy')), true);
  assert.equal(routeNeedsDocument(resolveRoute('#/heart-anatomy')), true);
  // An unknown slug resolves to the default *scene*, so it needs one too.
  assert.equal(routeNeedsDocument(resolveRoute('#/not-a-real-model')), true);

  for (const hash of ['#/', '#/organs', '#/explore', '#/lab', '#/trust', '#/terms', '#/privacy']) {
    assert.equal(routeNeedsDocument(resolveRoute(hash)), false, hash);
  }
});

test('every route kind is either a document surface or a scene — none is neither', () => {
  // The two predicates are complements, and a route kind that satisfied
  // neither would be a route nothing can render. `locked` is not a kind
  // `resolveRoute` returns; it is what the release gate turns one into.
  const kinds = ['landing', 'explorer', 'lab', 'trust', 'legal', 'scene'];
  for (const kind of kinds) {
    const route = { kind };
    assert.equal(
      isDocumentSurface(route) !== routeNeedsDocument(route),
      true,
      `${kind} must be exactly one of the two`
    );
  }
  assert.equal(isDocumentSurface({ kind: 'locked' }), true, 'a gated route is still a document');
  assert.equal(DOCUMENT_ROUTE_KINDS.includes('scene'), false, 'a scene is never swapped in place');
});

// -------------------------------------------------------------- the policy

test('a transition swaps only when neither side is a scene', () => {
  const canSwap = { canSwap: true };

  assert.equal(hashChangeAction('#/trust', '#/organs', canSwap), 'swap');
  assert.equal(hashChangeAction('#/', '#/trust', canSwap), 'swap');
  assert.equal(hashChangeAction('#/terms', '#/privacy', canSwap), 'swap', 'two legal documents');
  assert.equal(hashChangeAction('#/lab', '#/', canSwap), 'swap');

  // Arriving at a scene: it has to build a renderer.
  assert.equal(hashChangeAction('#/brain-anatomy', '#/trust', canSwap), 'leave');
  // And leaving one: it has to dispose the renderer it built. This is the half
  // that is easy to forget, because "does the destination need a document" is
  // the question that comes to mind, and it is only half the rule.
  assert.equal(hashChangeAction('#/trust', '#/brain-anatomy', canSwap), 'leave');
  assert.equal(hashChangeAction('#/heart-anatomy', '#/brain-anatomy', canSwap), 'leave');

  // An anchor and a no-op still outrank everything.
  assert.equal(hashChangeAction('#content', '#/trust', canSwap), 'ignore');
  assert.equal(hashChangeAction('#/explore', '#/organs', canSwap), 'stay');
});

test('with no mount table, every departure is a reload — exactly as it was', () => {
  // The fallback has to be the old behaviour in full, because it is what runs
  // if the shell fails to install. A swap-capable policy that could not be
  // turned off would make a broken shell a broken product.
  assert.equal(hashChangeAction('#/trust', '#/organs'), 'leave');
  assert.equal(hashChangeAction('#/', '#/trust'), 'leave');
  assert.equal(hashChangeAction('#/terms', '#/privacy'), 'leave');
});

// ------------------------------------------------------------- what it does

test('a swap raises no veil and reloads nothing', async () => {
  const s = scene('#/organs');
  s.windowRef.go('#/trust');
  await flush();
  assert.deepEqual(s.swapped, ['#/trust']);
  assert.equal(s.windowRef.location.reloads, 0, 'no document was asked for');
  assert.equal(s.veils().length, 0, 'nothing was covered — the old page stayed up until the new one was ready');
  s.restore();
});

test('a swap advances the route this document is showing; a reload does not', async () => {
  const s = scene('#/organs');
  s.windowRef.go('#/trust');
  await flush();
  assert.equal(s.departure.shownHash(), '#/trust');

  // Going back to the explorer is now a real transition again rather than a
  // no-op. Tracking this wrong is what makes a second navigation look like
  // "we are already there".
  s.windowRef.go('#/organs');
  await flush();
  assert.deepEqual(s.swapped, ['#/trust', '#/organs']);

  // But a departure to a scene must not advance it: the document is still
  // showing the explorer until the new one commits. This is the bug that left
  // a brain on screen under a `#/copd` URL, one level up.
  s.windowRef.go('#/brain-anatomy');
  assert.equal(s.windowRef.location.reloads, 1);
  assert.equal(s.departure.shownHash(), '#/organs', 'still showing what is painted');
  s.restore();
});

test('a mount that fails falls back to the document load it replaced', async () => {
  const refused = scene('#/organs', { onSwap: async () => false });
  refused.windowRef.go('#/trust');
  await flush();
  assert.equal(refused.windowRef.location.reloads, 1, 'the reader still reaches the page');
  assert.equal(refused.veils().length, 1, 'and is covered while they do');
  refused.restore();

  const thrown = scene('#/organs', { onSwap: async () => { throw new Error('chunk did not load'); } });
  thrown.windowRef.go('#/trust');
  await flush();
  assert.equal(thrown.windowRef.location.reloads, 1, 'a throw is a fallback, not a dead link');
  thrown.restore();
});

test('the second of two fast clicks wins', async () => {
  // A reader who changes their mind while the first destination is still
  // importing must end on the second. The naive version resolves both and the
  // first one to finish wins, which is whichever chunk happened to be cached.
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const mounted = [];
  const s = scene('#/organs', {
    onSwap: async (hash) => {
      if (hash === '#/trust') await gate;
      mounted.push(hash);
      return true;
    },
  });

  s.windowRef.go('#/trust');
  await Promise.resolve();
  s.windowRef.go('#/terms');
  await flush();
  assert.equal(s.departure.shownHash(), '#/terms');

  release();
  await flush();
  assert.equal(
    s.departure.shownHash(),
    '#/terms',
    'the abandoned mount must not claim the page when it finally resolves'
  );
  s.restore();
});

// ------------------------------------------------------- naming the wait

test('the veil names where it is going, in the reader’s language', () => {
  assert.equal(openingMessage('#/heart-anatomy', 'ja'), '心臓の3Dモデルを開いています');
  assert.equal(openingMessage('#/heart-anatomy', 'en'), 'Opening the heart model');
  assert.equal(openingMessage('#/brain-anatomy', 'ja'), '脳の3Dモデルを開いています');

  // The organ, not the scene's name for itself: the reader chose "the heart",
  // and `触れて学ぶ心臓の解剖` is a title, not an answer to "did I press the
  // right thing".
  assert.equal(destinationSubject('#/heart-anatomy', 'ja'), '心臓の3Dモデル');
  assert.equal(destinationSubject('#/trust', 'ja'), '公開中の3Dモデル');
  assert.equal(destinationSubject('#/trust?model=heart-anatomy', 'ja'), '触れて学ぶ心臓の解剖の根拠');
  assert.equal(openingMessage('#/trust?model=heart-anatomy', 'en'), 'Opening the evidence for Interactive heart anatomy');

  // A hash nobody recognises gets no name rather than the default scene's.
  // `resolveRoute` sends it to the brain, and a veil that said "opening the
  // brain model" for a typo would be confidently wrong.
  assert.equal(openingMessage('#/not-a-real-model', 'ja'), null);
});

test('a departure to a scene shows that name, and one that is not still departs', () => {
  const s = scene('#/organs', {
    onSwap: null,
    describe: (hash) => openingMessage(hash, 'ja'),
  });
  s.windowRef.go('#/heart-anatomy');
  const veil = s.veils()[0];
  assert.ok(veil, 'the page is covered');
  const words = veil.children.map((child) => child.textContent).filter(Boolean).join(' ');
  assert.match(words, /心臓の3Dモデルを開いています/);
  s.restore();

  // And a description that throws must not stop the navigation.
  const broken = scene('#/organs', {
    onSwap: null,
    describe: () => { throw new Error('no'); },
  });
  broken.windowRef.go('#/heart-anatomy');
  assert.equal(broken.windowRef.location.reloads, 1);
  assert.equal(broken.veils().length, 1);
  broken.restore();
});

// -------------------------------------------- releasing the page being left

test('a departure releases the outgoing page, and gives it back if it stays', () => {
  // A scene renders until its document goes away. On a model switch that means
  // the outgoing model is still drawing frames nobody can see while the
  // incoming one builds a second WebGL context — measured at 15–20% of every
  // switch. What makes this safe rather than clever is the undo: a reader who
  // presses Back before the reload commits must not be left looking at a scene
  // that has stopped moving.
  const events = [];
  const s = scene('#/brain-anatomy', {
    onSwap: null,
    onDepart: () => {
      events.push('stopped');
      return () => events.push('restarted');
    },
  });

  s.windowRef.go('#/heart-anatomy');
  assert.deepEqual(events, ['stopped'], 'released once the veil is up');

  // Back to the route this document is showing: the reload is not happening.
  s.windowRef.go('#/brain-anatomy');
  assert.deepEqual(events, ['stopped', 'restarted']);
  assert.equal(s.veils().length, 0, 'and the veil came down with it');
  s.restore();
});

test('a departure release that throws does not stop the navigation', () => {
  const s = scene('#/brain-anatomy', {
    onSwap: null,
    onDepart: () => { throw new Error('no viewer'); },
  });
  s.windowRef.go('#/heart-anatomy');
  assert.equal(s.windowRef.location.reloads, 1, 'the reader still leaves');
  assert.equal(s.veils().length, 1, 'and is still covered');
  // And the undo must not be attempted afterwards, which would throw a second
  // time on the way back in.
  s.windowRef.go('#/brain-anatomy');
  assert.equal(s.veils().length, 0);
  s.restore();
});

// ------------------------------------------- what a swap does when abandoned

/**
 * A swap takes time — a chunk to fetch, a surface to build — and three things
 * can happen in the middle of one: the reader goes Back to where they started,
 * picks a third destination, or both.
 *
 * Getting this wrong does not look like a crash. It looks like the page showing
 * one route while the address bar says another, which is the exact failure the
 * departure veil was written for, one level up. It was reproduced in a browser
 * before it was fixed: `#/organs`, press "Publication & review", press Back
 * 20 ms later, and the document settled with the Trust page on screen under
 * `#/organs` and `data-route="trust"`.
 */
async function shellHarness({ mountDelay = 0 } = {}) {
  const restore = installFakeDocument();
  globalThis.document.body = new FakeElement('body');
  globalThis.document.documentElement = new FakeElement('html');
  const ui = new FakeElement('div');
  const windowRef = fakeWindow('#/');
  // Enough of a browser to answer "where was the reader" and "how did they get
  // here". `history.state` is the signal the shell uses to tell Back from a
  // link, because `popstate` fires for both in a real browser (measured).
  windowRef.scrollY = 0;
  windowRef.scrollTo = ({ top = 0 } = {}) => { windowRef.scrollY = top; };
  // History entries, minimally but faithfully: a hash assignment *pushes* an
  // entry, and a new entry's state is null; Back returns to an entry with
  // whatever was stamped on it. Modelling `state` as one sticky value instead
  // made the first forward navigation read as a traversal — the fake
  // disagreeing with the browser, which was measured to behave this way.
  const entries = [{ hash: '#/', state: null }];
  let at = 0;
  windowRef.history = {
    get state() { return entries[at].state; },
    // The URL argument is honoured, because the browser honours it and the
    // shell uses it: a route with no page of its own is corrected in the
    // address bar with `replaceState`. A fake that dropped the URL left the
    // address bar saying one thing and the shell building another, and every
    // assertion downstream of it passed for the wrong reason.
    replaceState(next, _title, url) {
      entries[at].state = next;
      if (url) {
        entries[at].hash = url;
        windowRef.location.hash = url;
      }
    },
  };
  windowRef.go = (next) => {
    entries.length = at + 1;
    entries.push({ hash: next, state: null });
    at += 1;
    windowRef.location.hash = next;
    windowRef.fire();
  };
  windowRef.back = () => {
    if (at === 0) return;
    at -= 1;
    windowRef.location.hash = entries[at].hash;
    windowRef.fire();
  };
  // `routeOpen` -> `betaUnlocked()` reads the *global* `window.location.search`
  // (see `src/app/releaseGate.js`), not the injected one. Without this the
  // release check throws, the swap falls back to a reload, and the test passes
  // or fails for a reason that has nothing to do with what it is measuring —
  // which is how the first version of this harness reported "the abandoned
  // surface was never built" when nothing had been built at all.
  const previousWindow = globalThis.window;
  globalThis.window = { location: { search: '' } };
  globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);

  const mounts = [];
  const mountDocumentSurface = async ({ route, applyState = true }) => {
    // The same mapping `documentSurfaces.js` uses, so `data-route` in these
    // tests means what it means in the product. The first version of this stub
    // sent every kind but two to 'explorer', which made a landing mount
    // indistinguishable from an explorer one — and an assertion that cannot
    // tell two outcomes apart passes for whichever happens.
    const state = { landing: 'landing', trust: 'trust', legal: 'legal', lab: 'explorer' }[route.kind]
      ?? 'explorer';
    // Only the initial mount claims `data-route` while it builds — a swap waits
    // until it commits, so the outgoing surface is never painted on the
    // incoming one's ground. The stub has to honour that or it tests a
    // mechanism the product does not have.
    if (applyState) globalThis.document.documentElement.dataset.route = state;
    if (mountDelay) await new Promise((resolve) => setTimeout(resolve, mountDelay));
    const record = { route: route.kind, state, destroyed: false };
    mounts.push(record);
    return { state, destroy() { record.destroyed = true; } };
  };

  const { installShellNavigation } = await import('../src/app/shellNavigation.js');
  const shell = await installShellNavigation({
    ui,
    route: { kind: 'landing' },
    open: true,
    accountButton: null,
    observe: async () => null,
    mountDocumentSurface,
    windowRef,
    doc: globalThis.document,
  });
  return {
    shell,
    windowRef,
    mounts,
    doc: globalThis.document,
    restore() {
      restore();
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    },
  };
}

const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('a swap abandoned mid-flight leaves the page it started from, not the one it was building', async () => {
  const h = await shellHarness({ mountDelay: 40 });

  h.windowRef.go('#/trust');
  await settle(5);
  // Back before the Trust surface finished building.
  h.windowRef.go('#/');
  await settle(140);

  assert.equal(
    h.doc.documentElement.dataset.route,
    'landing',
    'the address bar says #/, so the page must say landing'
  );
  const trust = h.mounts.filter((m) => m.route === 'trust');
  assert.equal(trust.length, 1, 'the abandoned surface was built');
  assert.equal(trust[0].destroyed, true, 'and then removed rather than left on screen');
  h.restore();
});

test('two fast navigations end on the second, and build nothing twice at once', async () => {
  const h = await shellHarness({ mountDelay: 40 });

  h.windowRef.go('#/trust');
  await settle(5);
  h.windowRef.go('#/terms');
  await settle(200);

  assert.equal(h.doc.documentElement.dataset.route, 'legal', 'the reader ends where they last asked');
  // Whatever was built for the abandoned destination is gone; whatever was
  // built for the current one is not.
  for (const mount of h.mounts) {
    assert.equal(
      mount.destroyed,
      mount.route !== 'legal',
      `${mount.route}: abandoned mounts are destroyed and the live one is not`
    );
  }
  assert.equal(h.windowRef.location.reloads, 0, 'and nothing fell back to a document load');
  h.restore();
});

test('a destination superseded before its turn is never built at all', async () => {
  // Two mounts appending into `#ui` at once is not a race either one can win
  // by being careful: both append, both snapshot what they appended, and
  // whichever tears down second removes nodes the other is using. So swaps are
  // queued — and a queued destination the reader has already left is dropped
  // rather than built and thrown away, which is the cheaper of the two.
  const h = await shellHarness({ mountDelay: 30 });

  h.windowRef.go('#/trust');
  await settle(2);
  h.windowRef.go('#/terms');
  await settle(2);
  // Back to the first destination rather than to the page this document opened
  // on: returning to the opening route is a `stay`, which uncovers what is
  // already there and queues nothing — a correct answer that would leave this
  // test measuring an empty queue.
  h.windowRef.go('#/trust');
  await settle(300);

  const built = h.mounts.map((mount) => mount.route);
  // `landing` is the mount `installShellNavigation` made for the route this
  // document opened on.
  assert.equal(built[0], 'landing');
  assert.equal(
    built.includes('legal'),
    false,
    'the middle destination was abandoned before its turn and must never have been built'
  );
  // Three mounts, not two: the initial one, the Trust surface that was already
  // building when the reader moved on, and the one they actually asked for.
  // Without this the last assertion would pass on the *initial* landing mount
  // and the test would say nothing about the final hop.
  assert.equal(built.length, 3, `built ${built.join(', ')}`);
  assert.equal(built.at(-1), 'trust', 'the reader ends on the one they last asked for');
  assert.equal(h.doc.documentElement.dataset.route, 'trust');
  assert.equal(h.windowRef.location.reloads, 0, 'and nothing fell back to a document load');

  // Whatever was built and not wanted is gone; the live one is not.
  const live = h.mounts.at(-1);
  assert.equal(live.destroyed, false);
  for (const mount of h.mounts.slice(0, -1)) {
    assert.equal(mount.destroyed, true, `${mount.route} should have been taken down`);
  }
  h.restore();
});

test('a stalled departure keeps naming its destination when it offers to try again', () => {
  // The retry rebuilds the veil's contents. Rebuilding them from nothing made
  // the wait go from "opening the heart model" back to the generic sentence at
  // the exact moment the reader had just been told something had gone wrong —
  // so the one press that needs confidence was the one that lost it.
  const restore = installFakeDocument();
  globalThis.document.body = new FakeElement('body');
  const windowRef = fakeWindow('#/brain-anatomy');
  const armed = [];
  installDeparture({
    windowRef,
    doc: globalThis.document,
    shownHash: '#/brain-anatomy',
    onSwap: null,
    describe: (hash) => openingMessage(hash, 'ja'),
    setTimer: (fn) => { armed.push(fn); return armed.length; },
    clearTimer: () => {},
  });

  windowRef.go('#/heart-anatomy');
  const veil = globalThis.document.body.children.find((node) => node.className === 'loading');
  const wordsIn = (node) => node.children.map((child) => child.textContent).filter(Boolean).join(' ');
  assert.match(wordsIn(veil), /心臓の3Dモデルを開いています/);

  // The backstop fires: the veil stops claiming to be working and offers a retry.
  armed.shift()();
  const retry = veil.children.find((child) => child.className === 'loading-retry');
  assert.ok(retry, 'the stall offers a way to ask again');

  retry.dispatchEvent({ type: 'click' });
  assert.match(
    wordsIn(veil),
    /心臓の3Dモデルを開いています/,
    'asking again still says what it is opening'
  );
  restore();
});


// ------------------------------------------------------- where the reader was

/**
 * A document load restores scroll for free. A swap does not, and scrolling to
 * the top of every arrival is right for a link and wrong for Back — measured
 * before it was fixed: 2500 px into the publication record, follow a header
 * link, press Back, and the reader landed at the top of a 7,000 px page.
 *
 * The signal is `history.state`, not `popstate`: in a real browser this
 * product's own `location.hash = …` fires `popstate` too, so the event cannot
 * tell a traversal from a link. A hash assignment pushes an entry whose state
 * is `null`; an entry the reader came *back* to still carries the stamp the
 * shell wrote on it.
 */
test('Back returns the reader to where they were; a link does not', async () => {
  const h = await shellHarness();

  // Read a long page, then follow a link away from it.
  h.windowRef.scrollY = 2500;
  h.windowRef.go('#/trust');
  await settle(60);
  assert.equal(h.windowRef.scrollY, 0, 'a link lands at the top of its destination');

  // Coming back is a traversal: the entry carries the stamp the shell wrote.
  h.windowRef.back();
  await settle(60);
  assert.equal(h.windowRef.scrollY, 2500, 'Back returns to where the reader was reading');

  h.restore();
});

test('a link to a page visited before still lands at the top', async () => {
  // The cheap version of this remembers a position per hash and restores it
  // whenever that hash comes back — which silently turns "open the publication
  // record" into "resume it halfway down", days later.
  //
  // The first version of this test could not tell the two apart: it returned to
  // the page by Back, which records nothing, so the memory was empty and both
  // the right and the wrong implementation scrolled to the top. Every hop below
  // is a link, so the memory is populated and the assertion has something to be
  // wrong about.
  const h = await shellHarness();

  h.windowRef.go('#/trust');
  await settle(60);
  h.windowRef.scrollY = 1800;

  // A link away from it: this is what records 1800 against `#/trust`.
  h.windowRef.go('#/privacy');
  await settle(60);
  assert.equal(h.windowRef.scrollY, 0);

  // And a link back to it must open it, not resume it.
  h.windowRef.go('#/trust');
  await settle(60);
  assert.equal(h.windowRef.scrollY, 0, 'a link is not a resume');

  // While Back to the privacy document still is one, so the memory is doing its
  // job rather than simply being empty.
  h.windowRef.back();
  await settle(60);
  assert.equal(h.windowRef.scrollY, 0, 'the privacy document was left at the top');
  h.restore();
});

test('the shell stamps its entry without discarding state somebody else wrote', async () => {
  // `releaseGate.js` calls `history.replaceState(history.state, '', url)` when
  // it strips `?preview=` out of the address bar. Overwriting rather than
  // merging would throw away whatever else the page keeps there.
  const h = await shellHarness();
  h.windowRef.go('#/trust');
  await settle(60);
  // Something else writes to this entry, the way the release gate does when it
  // strips `?preview=` out of the address bar.
  h.windowRef.history.replaceState({ ...h.windowRef.history.state, somebodyElse: 'kept' });

  // Leave and come back, so the shell stamps that same entry a second time.
  h.windowRef.go('#/privacy');
  await settle(60);
  h.windowRef.back();
  await settle(60);

  assert.equal(h.windowRef.history.state.somebodyElse, 'kept', 'a stamp must not be an overwrite');
  assert.ok(h.windowRef.history.state.m3lVisit, 'and its own stamp is there too');
  h.restore();
});

// ------------------------------------------ a model the beta has not opened

test('a closed model route is a document surface, because that is what it renders', () => {
  // `#/copd` resolves to a scene, and the beta does not open it — so what the
  // reader gets is the "in development" page: plain DOM, no renderer. Treating
  // it as a scene anyway made both ways off that page cost a document load for
  // a WebGL context that was never built, on the page 67 of the 71 models show.
  // Scene *ids*, which is what `resolveRoute` returns — `#/copd` is the slug of
  // `copd-hyperinflation`. Keying this on the slug made the fixture close
  // nothing, so the first run of this test failed against working code.
  const closed = new Set(['copd-hyperinflation', 'heart-failure']);
  const isOpen = (route) => !(route.kind === 'scene' && closed.has(route.sceneId));
  const opts = { canSwap: true, needsDocument: needsDocumentUnlessClosed(isOpen) };

  assert.equal(hashChangeAction('#/copd', '#/organs', opts), 'swap', 'arriving at a closed model');
  assert.equal(hashChangeAction('#/organs', '#/copd', opts), 'swap', 'and leaving one');
  assert.equal(hashChangeAction('#/', '#/copd', opts), 'swap');

  // An *open* model is still a scene, both ways. This is the half that must not
  // be lost while making the other half cheaper.
  assert.equal(hashChangeAction('#/brain-anatomy', '#/organs', opts), 'leave');
  assert.equal(hashChangeAction('#/organs', '#/brain-anatomy', opts), 'leave');
  assert.equal(hashChangeAction('#/copd', '#/brain-anatomy', opts), 'leave');
  assert.equal(hashChangeAction('#/brain-anatomy', '#/copd', opts), 'leave');
});

test('without the release gate, the conservative answer stands', () => {
  // `hashChangeAction` is pure and `routeOpen` reads `window`; a caller with no
  // browser gets `routeNeedsDocument`, which reloads for every scene route open
  // or closed. Slower, never wrong — and it is what `node --test` exercises
  // everywhere else in this file.
  assert.equal(hashChangeAction('#/copd', '#/organs', { canSwap: true }), 'leave');
  assert.equal(hashChangeAction('#/organs', '#/copd', { canSwap: true }), 'leave');
});

test('the wait does not promise a model the release has not opened', () => {
  // `#/copd` renders the "in development" page. A veil that said "opening the
  // lungs model" for four seconds and then showed something else is the
  // mislabelled link this whole change set out to remove, with a delay on it.
  assert.equal(openingMessage('#/copd', 'ja'), '肺の3Dモデルを開いています');
  assert.equal(openingMessage('#/copd', 'ja', { open: false }), '肺の3Dモデル（準備中）');
  assert.equal(openingMessage('#/copd', 'en', { open: false }), 'the lungs model — in development');
  // And an open one is unaffected.
  assert.equal(openingMessage('#/heart-anatomy', 'ja', { open: true }), '心臓の3Dモデルを開いています');
});

test('the ground changes when the page does, not when the build starts', async () => {
  // `data-route` decides the page's background. The surface being replaced is
  // still on screen for the length of the mount — 100 to 600 ms of dynamic
  // import and build — so setting it at the start painted the *outgoing*
  // surface on the *incoming* one's ground. Leaving the landing page for the
  // publication record turned a dark page pale underneath text written for a
  // dark page, for longer than the blank frame the swap was built to remove.
  const h = await shellHarness({ mountDelay: 60 });
  assert.equal(h.doc.documentElement.dataset.route, 'landing', 'the initial mount applies its own');

  h.windowRef.go('#/trust');
  await settle(25);
  assert.equal(
    h.doc.documentElement.dataset.route,
    'landing',
    'mid-build the ground still belongs to the surface on screen'
  );

  await settle(150);
  assert.equal(h.doc.documentElement.dataset.route, 'trust', 'and changes with the page');
  h.restore();
});
