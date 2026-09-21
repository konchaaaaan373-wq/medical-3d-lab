/**
 * What this browser can encode, and what a file of that kind is called.
 *
 * Split from the recorder so the *question* costs nothing. The answer decides
 * whether the download button is offered at all, which every scene asks on
 * load; the machinery that acts on it — the recorder, the frame painter, the
 * consent screen — is loaded when somebody presses the button, and a
 * production build (which publishes anatomy, and anatomy cannot export) never
 * loads any of it.
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
