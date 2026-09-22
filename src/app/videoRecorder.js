import { pickVideoMimeType } from './videoSupport.js';

/**
 * Turning a canvas into a file, with the browser's own recorder.
 *
 * `MediaRecorder` over `canvas.captureStream()` is the whole mechanism: no
 * encoder ships with the app, nothing is uploaded, and the file is produced on
 * the reader's machine from frames their own GPU drew. That is a privacy
 * property worth stating out loud on the consent screen, and it is why this
 * module exists rather than a server-side render.
 *
 * Everything the browser supplies is injectable, so the parts that decide
 * *what* gets recorded can be tested in `node --test` with fakes. What cannot
 * be tested here is whether a given browser really encodes what it says it
 * supports — that is `scripts/check-disease-interaction.mjs`, in a real one.
 */

/**
 * Records a canvas for as long as it is running.
 *
 * `stop()` resolves with the file — and resolves only once every chunk the
 * recorder buffered has arrived, which is what `onstop` means and what a
 * naive `setTimeout` gets wrong: stopping and reading immediately yields a
 * blob missing its tail, i.e. a video that ends early for no visible reason.
 *
 * @param {object} options
 * @param {HTMLCanvasElement} options.canvas the canvas that is being drawn into
 * @param {number} [options.fps] frames per second requested of the stream
 * @param {string} [options.mimeType] overrides the picked container
 * @param {Function} [options.MediaRecorderCtor] injectable for tests
 * @param {number} [options.bitsPerSecond]
 */
export function createCanvasRecorder({
  canvas,
  fps = 30,
  mimeType,
  MediaRecorderCtor = typeof MediaRecorder === 'undefined' ? null : MediaRecorder,
  bitsPerSecond = 8_000_000,
}) {
  if (!MediaRecorderCtor) throw new Error('this browser has no MediaRecorder');
  if (!canvas || typeof canvas.captureStream !== 'function') throw new Error('this canvas cannot be captured');

  const type =
    mimeType ??
    pickVideoMimeType({ isTypeSupported: (candidate) => MediaRecorderCtor.isTypeSupported?.(candidate) }) ??
    undefined;

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorderCtor(stream, {
    ...(type ? { mimeType: type } : {}),
    videoBitsPerSecond: bitsPerSecond,
  });

  /** @type {Blob[]} */
  const chunks = [];
  let failure = null;
  recorder.ondataavailable = (event) => {
    if (event?.data && event.data.size !== 0) chunks.push(event.data);
  };
  recorder.onerror = (event) => {
    failure = event?.error ?? new Error('the recorder failed');
  };

  const stopped = new Promise((resolve, reject) => {
    recorder.onstop = () => {
      for (const track of stream.getTracks?.() ?? []) track.stop?.();
      if (failure) reject(failure);
      else resolve(new Blob(chunks, { type: type ?? 'video/webm' }));
    };
  });

  return {
    mimeType: type ?? 'video/webm',
    get state() {
      return recorder.state;
    },
    start() {
      // A timeslice, so a long recording arrives in pieces rather than as one
      // buffer the tab has to hold whole.
      recorder.start(1000);
    },
    /** @returns {Promise<Blob>} the finished file, tail included */
    stop() {
      if (recorder.state !== 'inactive') recorder.stop();
      return stopped;
    },
  };
}

/**
 * Hands a blob to the browser as a download.
 *
 * The object URL is revoked on the next turn rather than immediately: revoking
 * in the same task races the navigation the click starts, and the file that
 * does not arrive is the one bug a reader cannot work around.
 */
export function saveBlob(blob, fileName, { doc = typeof document === 'undefined' ? null : document, urls = typeof URL === 'undefined' ? null : URL } = {}) {
  if (!doc || !urls) throw new Error('saveBlob needs a document');
  const url = urls.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => urls.revokeObjectURL(url), 10_000);
  return url;
}

// Re-exported so the one import path still answers for both halves: the
// browser check and the tests ask this module what a recording is, and where
// the support probe lives is an internal split.
export { VIDEO_MIME_CANDIDATES, extensionForMimeType, pickVideoMimeType, videoRecordingSupported } from './videoSupport.js';
