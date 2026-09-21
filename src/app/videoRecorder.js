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
 * Container and codec, best first.
 *
 * MP4 **with H.264 named** leads, because that is the file a phone plays from
 * the Files app and a slide deck embeds without converting. Everything after
 * it is WebM.
 *
 * Bare `video/mp4` is deliberately not on the list, and that is not
 * tidiness. Chromium answers `isTypeSupported('video/mp4')` with `true` on
 * builds that have no H.264 encoder and then writes **VP9 inside an MP4
 * container** — measured here, in the browser check: a 991 kB file branded
 * `isom…vp09`. It is a real file and a valid one, and QuickTime and most
 * editors will not open it, so it fails in the worst way available: at the
 * far end, on somebody else's machine, hours after it downloaded. A `.webm`
 * holding exactly the same VP9 bitstream at least says what it is. So the
 * container is only claimed when the codec inside it was asked for by name.
 */
export const VIDEO_MIME_CANDIDATES = Object.freeze([
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4;codecs=h264',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
]);

/**
 * The first candidate this browser says it can encode, or null.
 *
 * @param {{ candidates?: readonly string[], isTypeSupported?: (type: string) => boolean }} [options]
 */
export function pickVideoMimeType({ candidates = VIDEO_MIME_CANDIDATES, isTypeSupported } = {}) {
  const supported =
    isTypeSupported ??
    (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function'
      ? (type) => MediaRecorder.isTypeSupported(type)
      : null);
  if (!supported) return null;
  return candidates.find((type) => supported(type)) ?? null;
}

/** The file extension a mime type asks for. */
export function extensionForMimeType(mimeType) {
  const base = String(mimeType ?? '').split(';')[0].trim().toLowerCase();
  if (base === 'video/mp4') return 'mp4';
  if (base === 'video/webm') return 'webm';
  // An unrecognised container is still a video; `.bin` would make it
  // unopenable, and guessing `mp4` would make it lie about what is inside.
  return base.startsWith('video/') ? base.slice('video/'.length) : 'webm';
}

/**
 * Whether a file can be written here at all.
 *
 * Checked before the button is offered rather than after the reader has read
 * the terms and pressed Agree: a consent screen that ends in "this browser
 * cannot do that" wasted their attention on a decision that had no effect.
 */
export function videoRecordingSupported({
  canvas,
  MediaRecorderCtor = typeof MediaRecorder === 'undefined' ? null : MediaRecorder,
} = {}) {
  if (!MediaRecorderCtor) return false;
  if (!canvas || typeof canvas.captureStream !== 'function') return false;
  return Boolean(pickVideoMimeType({ isTypeSupported: (type) => MediaRecorderCtor.isTypeSupported?.(type) }));
}

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
