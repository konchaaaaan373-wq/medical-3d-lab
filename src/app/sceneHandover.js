/**
 * Carrying the model you were looking at across the document that replaces it.
 *
 * ## The problem this solves, and the one it does not
 *
 * Opening a model needs its own document: `App.js` owns a WebGL context, an
 * animation loop and a multi-megabyte atlas, and `createApp` captures its
 * `SceneClass` in some thirty closures, so there is no teardown to trust and no
 * cheap way to swap a scene inside a live viewer. That is real work and it is
 * not done here — `docs/follow-ups.md` F-200 holds it.
 *
 * What a reader actually complains about is not that a document was replaced.
 * It is that **the model they were looking at disappeared**, was replaced by a
 * dark rectangle for four seconds, and then a different model appeared. The
 * screen going blank is the whole of the felt cost; the document boundary is
 * invisible except through that blank.
 *
 * So the last frame goes with them. Before the outgoing document stops
 * rendering, its canvas is captured and put in `sessionStorage`; the arriving
 * document paints that image full-bleed *instead of* the opaque veil, with the
 * destination's name and a progress bar over it, and cross-fades to the real
 * model when it is ready. The reader sees: the brain, the brain with "opening
 * the heart model" over it, the heart. Nothing blanks, and nothing announces a
 * page load.
 *
 * It is a picture of the old model, not the old model. It cannot be rotated and
 * it is not claimed to be: it is behind a progress bar, dimmed, for as long as
 * the load takes. What it buys is that the reader's eye is never asked to start
 * again from nothing.
 *
 * ## Why `sessionStorage`
 *
 * It is the only store that survives a document replacement, is scoped to this
 * tab, and is gone when the tab is. A handover is worthless a minute later and
 * must never reappear on a fresh visit, so every read checks both **which
 * destination it was written for** and **how old it is**, and every read
 * consumes it. A stale frame painted under the wrong model would be the
 * original bug — a brain on screen under a `#/copd` URL — reintroduced as a
 * feature.
 *
 * Quota is the normal failure here, not the exceptional one: a full-size PNG of
 * a 4K canvas is megabytes and `sessionStorage` is typically 5 MB. The capture
 * is therefore downscaled and stored as JPEG, and **every** step is wrapped —
 * a handover that cannot be written, read or decoded simply does not happen,
 * and the reader gets the plain veil that existed before.
 */

/** One key, because only the most recent handover can ever be wanted. */
const KEY = 'm3l.scene-handover';

/**
 * How long a carried frame stays meaningful.
 *
 * Long enough for a slow model on a slow connection — the worst measured cold
 * start is about six seconds — and short enough that a reader who leaves a tab
 * and comes back to it later is never shown a picture of where they used to be.
 */
export const HANDOVER_TTL_MS = 20_000;

/**
 * The widest the carried image is stored at.
 *
 * It is painted behind a dim wash and a progress bar for a second or two, so
 * resolution buys nothing and quota is the real constraint. 960 px keeps a
 * desktop frame recognisable and a JPEG of it comfortably under a megabyte.
 */
const MAX_WIDTH = 960;

/**
 * Put the current frame somewhere the next document can find it.
 *
 * @param {object} options
 * @param {HTMLCanvasElement} options.canvas the canvas holding a fresh frame
 * @param {string} options.toHash the destination this frame is being carried to
 * @param {string} [options.fromSceneId] recorded for diagnostics only
 * @param {Storage} [options.store]
 * @param {() => number} [options.now]
 * @returns {boolean} whether anything was stored
 */
export function keepFrameForHandover({
  canvas,
  toHash,
  fromSceneId = null,
  store = safeSessionStorage(),
  now = () => Date.now(),
}) {
  if (!store || !canvas?.width || !canvas?.height) return false;
  try {
    const scale = Math.min(1, MAX_WIDTH / canvas.width);
    const width = Math.max(1, Math.round(canvas.width * scale));
    const height = Math.max(1, Math.round(canvas.height * scale));
    const flat = document.createElement('canvas');
    flat.width = width;
    flat.height = height;
    const context = flat.getContext('2d');
    if (!context) return false;
    // JPEG, not PNG: this is a photograph of tissue, the difference is
    // invisible under a dim wash, and it is the difference between 200 kB and
    // several megabytes of a 5 MB budget.
    context.drawImage(canvas, 0, 0, width, height);
    store.setItem(
      KEY,
      JSON.stringify({
        image: flat.toDataURL('image/jpeg', 0.72),
        toHash,
        fromSceneId,
        at: now(),
        aspect: canvas.width / canvas.height,
      })
    );
    return true;
  } catch {
    // Quota, a tainted canvas, a browser that refuses `toDataURL`. None of
    // them is worth failing a navigation over.
    return false;
  }
}

/**
 * Take the carried frame, if one was written for *this* destination recently.
 *
 * Always consumes: a handover is for one arrival. Leaving it in place is how a
 * reload of the same URL a minute later would paint a picture of a model the
 * reader has not been looking at.
 *
 * @param {object} options
 * @param {string} options.hash the hash this document is rendering
 * @param {Storage} [options.store]
 * @param {() => number} [options.now]
 * @returns {{image: string, aspect: number}|null}
 */
export function takeHandover({ hash, store = safeSessionStorage(), now = () => Date.now() }) {
  if (!store) return null;
  let raw = null;
  try {
    raw = store.getItem(KEY);
    store.removeItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const record = JSON.parse(raw);
    if (typeof record?.image !== 'string' || !record.image.startsWith('data:image/')) return null;
    // The destination it was written for, and nothing else. Two tabs, a Back
    // in the middle of a departure, or a second navigation while the first was
    // in flight all produce a frame whose destination is not this one.
    if (record.toHash !== hash) return null;
    if (!(now() - record.at < HANDOVER_TTL_MS)) return null;
    return { image: record.image, aspect: Number(record.aspect) || null };
  } catch {
    return null;
  }
}

/** `sessionStorage`, or null where it is denied — private mode, blocked storage. */
function safeSessionStorage() {
  try {
    return globalThis.window?.sessionStorage ?? null;
  } catch {
    return null;
  }
}
