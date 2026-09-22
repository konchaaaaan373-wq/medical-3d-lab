import './styles/base.css';
import './styles/reading-surface.css';
import './styles/ui.css';
import './styles/anatomy-panel.css';
import './styles/anatomy-shell-presentation.css';
import './styles/public-diagnostics.css';
import './styles/navigation.css';
import './styles/shell-header.css';
import './styles/scene-library.css';
import './styles/access.css';
import './styles/subscription-access.css';
import './styles/pricing-access.css';
import './styles/patient-presentation.css';
import './styles/patient-fullscreen.css';
import './styles/education-access.css';
import './styles/reel.css';
import './styles/video-export.css';
import './styles/explorer.css';
import './styles/explorer-search.css';
import './styles/access-explorer.css';
import './styles/landing.css';
import './styles/trust.css';
import './styles/scene-fallback.css';
import './styles/locked.css';
import './styles/telemetry.css';
import './styles/legal.css';
import './styles/product-shell-b6.css';
import './styles/surface-polish.css';
import './styles/browser-first-release-polish.css';
import './styles/patient-consultation.css';
// Last, and deliberately: it is the one place that owns the 44 px touch floor
// for phone widths, and it has to outrank every surface sheet that compacts —
// the consultation view above included.
import './styles/phone-touch-targets.css';
import { createBuildMarker } from './components/BuildMarker.js';
import { isDocumentSurface, resolveRoute } from './app/router.js';
import { openingMessage } from './app/destinationName.js';
import { takeHandover } from './app/sceneHandover.js';
import { installDeparture } from './app/departure.js';
import { looksLikeAuthRedirect } from './access/authRedirect.js';
import { betaUnlocked, routeOpen } from './app/releaseGate.js';
import { redirectFor } from './app/routeRedirects.js';
import { recordSceneVisit } from './app/sceneLibrary.js';
import {
  installFinalPagehideCleanup,
  installUiShortcutGuard,
  settleOptionalService,
  readUiLanguagePreference,
  classifySceneStartFailure,
} from './app/sceneShellBridge.js';

const observe = async (options) => {
  const { installObservability } = await import('./app/observability.js');
  return installObservability(options);
};

const stage = document.getElementById('stage');
const ui = document.getElementById('ui');

boot().catch(async (error) => {
  console.error(error);
  ui.textContent = 'Failed to start Medical 3D Lab.';
  try {
    const { installTelemetry } = await import('./telemetry/install.js');
    installTelemetry({ surface: 'fallback' }).reporter.capture(error, { handled: false });
  } catch {
    /* reporting a boot failure must not become a second boot failure */
  }
});

async function boot() {
  // A Supabase redirect carries credentials in the fragment. It is not a route,
  // and the account layer consumes and scrubs it moments from now — but the
  // route is resolved here, first, so without this the fragment falls through
  // to `resolveRoute`, which sends an unknown hash to the default scene.
  // Somebody who had just confirmed their address therefore landed on a 3D
  // model, and once the fragment was scrubbed to `#/` the address bar disagreed
  // with what was on screen, which left the shell's Home link inert.
  //
  // The real parser, not a regex that resembles it: the first version of this
  // approximated the rule and disagreed with `authRedirectFromHash` about
  // hashes beginning with `/`, which forced such a URL to the landing page
  // while leaving its token in the address bar. `authRedirect.js` is pure and
  // dependency-free precisely so this can be asked here, before the account
  // layer loads, without dragging the account client into the entry chunk.
  //
  // Only the fragment. `?account=recovery` — the flag a reload mid-recovery has
  // to go on — used to force the landing page too, and that turned an
  // interrupted recovery into a trap: the flag stays in the query until the
  // password is set or the recovery cancelled, so closing the dialog and
  // carrying on left every later reload of `#/brain-anatomy` dropping back to
  // the landing page. A query flag is not a route the way a token fragment is;
  // the hash beside it is still a perfectly good one, and the recovery dialog
  // is a modal that opens over whatever it names.
  const authRedirect = looksLikeAuthRedirect(window.location.hash);

  // A route that no longer has a page of its own is corrected before anything
  // renders, and corrected in the address bar too — arriving at the landing
  // page under `#/organs` is the state where the shell's own Home link looks
  // inert, which is the bug the auth-redirect handling above exists to avoid.
  //
  // `replaceState`, not an assignment: this is not a place the reader chose to
  // leave, so it must not cost them a Back press to get out of. It also does
  // not fire `hashchange`, so nothing here can loop.
  if (!authRedirect) {
    const corrected = redirectFor(window.location.hash, { unlocked: betaUnlocked() });
    if (corrected) {
      try {
        window.history.replaceState(window.history.state, '', corrected);
      } catch {
        window.location.hash = corrected;
      }
    }
  }

  const route = authRedirect ? { kind: 'landing' } : resolveRoute(window.location.hash);
  const open = routeOpen(route);

  if (open && route.kind === 'scene') recordSceneVisit(route.sceneId);

  // Every surface leaves the same way, and every surface needs covering while
  // it does. Six handlers here used to answer "is this a navigation" in four
  // different ways. Checked transition by transition they agreed, so nothing
  // was broken by that — but none of them cleared the screen, which is how a
  // link to `#/copd` could leave a brain on screen under a COPD URL, and the
  // fix belongs in one place rather than six. `shownHash` is captured here,
  // once: it is the route this document rendered, and only a new document
  // changes it.
  // Before any route decides what to render: a build that is not the site says
  // so on every surface, including the ones that never reach `App.js`. It is
  // appended to `document.body` rather than to `#ui` so that hiding the
  // controls cannot take it — the screenshot people send is the hidden one.
  const buildMarker = createBuildMarker();
  if (buildMarker) {
    // The class, not the element, is what the layout reacts to: the marker is
    // `position: fixed` and would otherwise sit **on top of** the control
    // console, which reaches the bottom of the viewport on every surface that
    // has one (measured: the panel covered the clinical-use line at 390×844).
    // `base.css` uses this to give the console the marker's height back.
    document.body.classList.add('has-build-marker');
    document.body.append(buildMarker);
  }

  const shownHash = window.location.hash;
  const leaveOnRouteChange = () => installDeparture({
    shownHash,
    language: readUiLanguagePreference(),
    describe: (hash) => openingMessage(hash, readUiLanguagePreference(), {
      open: routeOpen(resolveRoute(hash)),
    }),
    // No `onDepart` here. This departure covers the scene-*failure* surface,
    // which has no renderer to release; `App.js` installs the one that does,
    // where the viewer is in scope rather than behind a debugging global.
  });

  const { createAccessManager } = await import('./access/AccessManager.js');
  const access = createAccessManager({ ui });
  access.accountButton.addEventListener('click', () => {
    void access.refresh({ reconcile: true });
  });
  const accessReady = access.init().catch((error) => {
    console.error('access init', error);
  });

  if (isDocumentSurface(open ? route : { kind: 'locked' })) {
    // `index.html` decides whether to paint the veil from the hash alone, and
    // `resolveRoute` is the authority. They agree for every route the product
    // has — `tests/boot-veil.test.js` fixes that — but an auth redirect is a
    // fragment rather than a route, and it resolves to the landing page *here*,
    // after the parser has already seen a hash it does not recognise. Take the
    // veil down rather than leave a reading surface under it.
    //
    // Inside this branch, not before it: removing it unconditionally would
    // throw away the pre-paint veil for the one route it exists for.
    document.getElementById('boot-veil')?.remove();

    // One import, not two awaited in turn. `shellNavigation.js` already imports
    // the mount table, so fetching it separately here only added a serial
    // round-trip in front of every reading surface's first paint — and with it
    // the skip link, which is the first thing a keyboard user reaches for.
    const { installShellNavigation } = await import('./app/shellNavigation.js');
    await installShellNavigation({
      ui,
      route,
      open,
      accountButton: access.accountButton,
      observe,
      language: readUiLanguagePreference(),
      onRendererFailure: (error, context) => {
        context?.observability?.reporter?.captureRendererFailure(error, {
          scene: context?.sceneId ?? 'landing-hero',
          device: context.observability.deviceClass,
          reason: rendererFailureReason(error),
          fallbackShown: true,
        });
      },
    });
    void accessReady;
    return;
  }

  document.documentElement.dataset.route = 'scene';

  // LanguageToggle normally applies this later inside createApp(). A renderer
  // or atlas failure can happen before that point, so seed the same persisted
  // preference before any scene work.
  const sceneLanguage = readUiLanguagePreference();
  ui.dataset.lang = sceneLanguage;
  document.documentElement.setAttribute('lang', sceneLanguage);

  // The veil `index.html` already painted, adopted rather than replaced.
  //
  // Creating a second one here meant the reader saw a blank document first —
  // the gap between the new document committing and this module running was
  // caught in a screenshot 400 ms into a brain → heart switch, and it is what
  // "the app disappears when I change pages" was describing.
  //
  // What this adds is the destination's name. `index.html` cannot know it (the
  // catalogue is in the bundle) so it writes the generic sentence; this
  // replaces it with the one the *departing* document's veil already showed,
  // built by the same function. Two documents are involved in opening a model
  // and the reader should not be able to tell.
  //
  // The veil is opaque (`.loading` paints `--bg`), and so is the body behind it
  // before any JS runs, so the handover never shows a colour that is not this
  // one. Measured rather than assumed: the body's background *does* change from
  // near-black to the studio backdrop part-way through start-up, underneath a
  // veil nobody can see through.
  const veil = document.getElementById('boot-veil') ?? document.createElement('div');
  veil.className = 'loading';
  // The frame the previous document was showing, if it left one for this hash.
  //
  // Painted behind the wait instead of the opaque `--bg` rectangle, so the
  // reader's eye is never asked to start from nothing: the model they were
  // looking at stays under the sentence naming the one that is opening, and
  // the real model cross-fades in over it. See `sceneHandover.js` for why this
  // is a picture rather than the viewer itself.
  try {
    const carried = takeHandover({ hash: window.location.hash });
    if (carried) {
      veil.style.setProperty('--handover-image', `url("${carried.image}")`);
      veil.dataset.handover = '';
    }
  } catch (error) {
    console.warn('[handover] the carried frame could not be painted', error);
  }
  veil.setAttribute('lang', sceneLanguage);
  veil.setAttribute('role', 'status');
  const veilLabel = document.createElement('span');
  veilLabel.textContent =
    openingMessage(window.location.hash, sceneLanguage) ??
    (sceneLanguage === 'en' ? 'Loading 3D model' : '3Dモデルを読み込んでいます');
  const veilBar = document.createElement('span');
  veilBar.className = 'loading-bar';
  veil.replaceChildren(veilLabel, veilBar);
  veil.hidden = false;
  if (!veil.isConnected) document.body.append(veil);

  const fallbackStartedAt = Date.now();
  const elapsedSinceNavigation = () =>
    typeof performance?.now === 'function' ? performance.now() : Date.now() - fallbackStartedAt;

  try {
    const [{ createApp }, { installAccess }, { resolveSceneId }] = await Promise.all([
      import('./app/App.js'),
      import('./access/installAccess.js'),
      import('./app/sceneRegistry.js'),
    ]);
    const app = await createApp({
      stage,
      ui,
      /**
       * Keep the shared recovery contract from the current integration tree.
       * AnatomyPanel owns its retry/status UI; the shell supplies the action.
       */
      onRetryModel: () => window.location.reload(),
    });
    installAccess({ app, access, ui, sceneId: resolveSceneId() });
    void accessReady;

    // The shared anatomy implementation owns the actual panel and its state.
    // Work only opts its presentation adapter in when that real panel exists.
    let anatomyPresentation = null;
    if (ui.querySelector('.anatomy-panel')) {
      ui.dataset.anatomy = 'yes';
      const { mountAnatomyShellPresentation } = await import('./app/anatomyShellPresentation.js');
      anatomyPresentation = mountAnatomyShellPresentation({ ui });
    }

    // Model shortcuts live at window level. UI controls retain their native and
    // component-local behavior, while their key events stop before the model.
    const removeUiShortcutGuard = installUiShortcutGuard({ ui });

    installFinalPagehideCleanup({ cleanup: () => {
      removeUiShortcutGuard();
      anatomyPresentation?.destroy?.();
      delete ui.dataset.anatomy;
    } });

    // createApp() already means the scene shell is ready. Optional reporting
    // must never keep the loading veil over a usable model.
    const readyElapsedMs = elapsedSinceNavigation();
    requestAnimationFrame(() => {
      veil.classList.add('is-done');
      setTimeout(() => veil.remove(), 500);
    });

    settleOptionalService(
      observe({
        ui,
        surface: 'scene',
        sceneId: route.sceneId,
        placement: 'rail',
      }),
      (observability) => reportSceneStart(
        observability,
        app,
        route.sceneId,
        () => readyElapsedMs
      ),
      (reportError) => console.warn('scene observability unavailable', reportError)
    );
  } catch (error) {
    console.error(error);
    veil.remove();
    const failureReason = rendererFailureReason(error);
    const [{ createSceneFailureFallback }, { createPublicDiagnosticCopyControl }] = await Promise.all([
      import('./app/SceneFailureFallback.js'),
      import('./app/publicDiagnosticCopyControl.js'),
    ]);
    const fallback = createSceneFailureFallback({
      ui,
      sceneId: route.sceneId,
      reason: failureReason,
    });
    const diagnostic = createPublicDiagnosticCopyControl({
      getContext: () => ({
        modelId: route.sceneId,
        language: ui.dataset.lang ?? 'ja',
        state: failureReason,
      }),
    });
    fallback.element.querySelector('.scene-fallback-card')?.append(diagnostic.element);

    installFinalPagehideCleanup({ cleanup: () => {
      diagnostic.dispose?.();
      fallback.destroy?.();
    } });

    leaveOnRouteChange();

    settleOptionalService(
      observe({
        ui,
        surface: 'fallback',
        sceneId: route.sceneId,
        askConsent: false,
      }),
      (observability) => observability?.reporter.captureRendererFailure(error, {
        scene: route.sceneId,
        device: observability.deviceClass,
        reason: failureReason,
        fallbackShown: true,
      }),
      (reportError) => console.warn('fallback observability unavailable', reportError)
    );
  }
}

function rendererFailureReason(error) {
  return classifySceneStartFailure(error);
}

async function reportSceneStart(observability, app, sceneId, elapsedSinceNavigation) {
  if (!observability) return;
  const { telemetry, deviceClass } = observability;
  telemetry.record('model.start', { scene: sceneId, surface: 'scene', device: deviceClass });

  const elapsedMs = elapsedSinceNavigation();
  const { evaluateStartup } = await import('./app/performanceBudget.js');
  const startup = evaluateStartup(elapsedMs, deviceClass);
  telemetry.record('model.ready', {
    scene: sceneId,
    device: deviceClass,
    elapsedMs: startup.elapsedMs,
    withinBudget: startup.withinBudget,
  });

  app?.viewer?.onQuality?.((transition, report) => {
    telemetry.record('model.quality', {
      scene: sceneId,
      device: deviceClass,
      tier: transition.to,
      direction: transition.direction,
      ...(report.meanFps == null ? {} : { meanFps: report.meanFps }),
    });
  });
}
