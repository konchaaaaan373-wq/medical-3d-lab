/**
 * Comparing two rendered frames, for the drivers that have to wait for one.
 *
 * Both the capture and the interaction check need to know when a scene has
 * stopped moving, and both used to ask whether two screenshots were
 * byte-identical. That is a stricter question than it sounds on a software
 * rasteriser: SwiftShader's edge sampling is not stable frame to frame, so a
 * silhouette pixel lands one quantisation step either side of itself for as
 * long as you care to watch. It got away with it while the models were small.
 * When the framing fix (F-127) made them fill the frame there were more edge
 * pixels, and the pancreas seen from above stopped settling at all — measured,
 * about **50 pixels**, every one of them on the outline, in a frame that had
 * otherwise stopped moving. The same scene mid-ease differs by **eleven
 * thousand**, and the check reported "the view never stopped changing" about
 * scene after scene that had.
 *
 * So both ask how much the frame changed instead, with two orders of magnitude
 * between "the rasteriser is jittering" and "the camera is still arriving".
 * This is not a way to accept a moving picture: anything actually animating
 * fails it as clearly as it failed equality.
 */

/**
 * Pixels two PNG buffers disagree about by more than a quantisation step.
 * Decoded in the page, because that is where there is an image decoder.
 *
 * @param {import('playwright').Page} page
 * @param {Buffer} a
 * @param {Buffer} b
 * @returns {Promise<number>}
 */
export function differingPixels(page, a, b) {
  return page.evaluate(async ([first, second]) => {
    const load = (url) =>
      new Promise((done, fail) => {
        const image = new Image();
        image.onload = () => done(image);
        image.onerror = fail;
        image.src = url;
      });
    const [one, two] = await Promise.all([load(first), load(second)]);
    if (one.width !== two.width || one.height !== two.height) return Number.MAX_SAFE_INTEGER;
    const pixels = (image) => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, canvas.width, canvas.height).data;
    };
    const left = pixels(one);
    const right = pixels(two);
    let differing = 0;
    for (let i = 0; i < left.length; i += 4) {
      const delta = Math.max(
        Math.abs(left[i] - right[i]),
        Math.abs(left[i + 1] - right[i + 1]),
        Math.abs(left[i + 2] - right[i + 2])
      );
      if (delta > 2) differing += 1;
    }
    return differing;
  }, [`data:image/png;base64,${a.toString('base64')}`, `data:image/png;base64,${b.toString('base64')}`]);
}

/**
 * How many differing pixels still count as "it has stopped".
 * A tenth of a percent of the frame — 920 pixels at 1280x720 — against a
 * measured 50 of silhouette jitter and eleven thousand mid-ease.
 */
export const settledPixels = ({ width, height }) => Math.max(200, Math.round(width * height * 0.001));
