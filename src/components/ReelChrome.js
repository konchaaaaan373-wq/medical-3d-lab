import { el } from '../utils/dom.js';
import { VIDEO_EXPORT_COPY } from '../data/videoExport.js';

/**
 * The only controls visible during the sequence.
 *
 * Pinned to the viewport rather than to the video frame, so on most screens it
 * sits on the letterbox area *outside* what gets recorded. A screen recording
 * of the frame itself therefore contains no application chrome at all — and
 * neither does the file the download button writes, which composites the
 * canvas and the captions and never this row.
 */
export function createReelChrome({ formats, currentFormatId, onFormat, onRestart, onExit, onDownload }) {
  const chips = formats.map((format) =>
    el('button', {
      class: `reel-chip${format.id === currentFormatId ? ' is-current' : ''}`,
      type: 'button',
      title: `${format.width} × ${format.height}`,
      text: format.label,
      on: { click: () => onFormat(format.id) },
    })
  );

  // Only where a file may actually be written: the offer is decided by
  // `videoExportOffered()` and by whether the browser can encode at all, and
  // a button that explains afterwards why it could not is worse than no button.
  const downloadLabelEn = el('span', { class: 'lang-en', text: VIDEO_EXPORT_COPY.download.en });
  const downloadLabelJa = el('span', { class: 'lang-ja', text: VIDEO_EXPORT_COPY.download.ja });
  const downloadButton = onDownload
    ? el(
        'button',
        {
          class: 'reel-chip is-download',
          type: 'button',
          // A stable name for the control, for the same reason the console's
          // buttons carry one: its label changes while a recording runs, and a
          // browser check that addresses it by prose would press it twice.
          dataset: { control: 'video-download' },
          on: { click: () => onDownload() },
        },
        [el('span', { class: 'reel-chip-mark', 'aria-hidden': 'true', text: '↓' }), downloadLabelEn, downloadLabelJa]
      )
    : null;

  const element = el('div', { class: 'reel-chrome' }, [
    el('div', { class: 'reel-chip-row' }, chips),
    el('button', { class: 'reel-chip', type: 'button', text: '↻', title: 'Restart', on: { click: onRestart } }),
    downloadButton,
    el('button', { class: 'reel-chip is-exit', type: 'button', text: 'Exit (Esc)', on: { click: onExit } }),
  ]);

  return {
    element,
    setFormat(id) {
      chips.forEach((chip, index) => chip.classList.toggle('is-current', formats[index].id === id));
    },
    /**
     * What the download button says and whether it can be pressed.
     *
     * The recording runs for the length of the sequence, so the button is the
     * only place that can say it is running; a button that looks idle while a
     * 15-second recording is in progress gets pressed again.
     *
     * @param {{ en: string, ja: string }} label
     * @param {{ busy?: boolean }} [state]
     */
    setDownloadLabel(label, { busy = false } = {}) {
      if (!downloadButton) return;
      downloadLabelEn.textContent = label.en;
      downloadLabelJa.textContent = label.ja;
      downloadButton.classList.toggle('is-busy', busy);
      downloadButton.disabled = busy;
      downloadButton.setAttribute('aria-disabled', String(busy));
    },
  };
}
