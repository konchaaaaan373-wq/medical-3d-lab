import { el } from '../utils/dom.js';

/** Index of the stage that owns this progression value. */
export function stageIndexFor(progress, stages) {
  let index = 0;
  for (let i = 0; i < stages.length; i++) if (progress >= stages[i].at) index = i;
  return index;
}

/**
 * Stage track + current stage name + one-paragraph explanation.
 * The track is clickable so a viewer can jump straight to a stage.
 *
 * @param {{ meta: any, onSeek: (value: number) => void }} options
 */
export function createStageReadout({ meta, onSeek }) {
  const stages = meta.stages;

  const steps = stages.map((stage, index) =>
    el('button', {
      class: 'step',
      type: 'button',
      title: `${stage.name} — ${stage.nameJa}`,
      'aria-label': `${stage.name}, ${stage.nameJa}`,
      on: {
        // Seek just past the boundary so the stage is unambiguously active.
        click: () => onSeek(Math.min(1, stage.at + (index === stages.length - 1 ? 0.1 : 0.02))),
      },
    }, [
      el('span', { class: 'step-dot' }),
      el('span', { class: 'step-name lang-en', text: stage.name }),
      el('span', { class: 'step-name step-name-ja lang-ja', text: stage.nameJa }),
    ])
  );

  const fill = el('span', { class: 'track-fill' });
  const track = el('div', { class: 'stage-track' }, [
    el('span', { class: 'track-line' }, [fill]),
    el('div', { class: 'steps' }, steps),
  ]);

  const nameEn = el('h2', { class: 'stage-name lang-en' });
  const nameJa = el('p', { class: 'stage-name-ja lang-ja' });
  const percent = el('span', { class: 'stage-percent' });
  // The number is a position along the modelled change, not a severity score —
  // label it so nobody reads "70%" as "70% of the way to severe disease".
  const progressCaption = meta.progressLabel
    ? el('span', { class: 'stage-progress-label' }, [
        el('span', { class: 'lang-en', text: meta.progressLabel.label }),
        el('span', { class: 'lang-ja', text: meta.progressLabel.labelJa }),
      ])
    : null;
  const summaryEn = el('p', { class: 'stage-summary lang-en' });
  const summaryJa = el('p', { class: 'stage-summary-ja lang-ja' });

  const element = el('div', { class: 'stage-readout' }, [
    track,
    el('div', { class: 'stage-heading' }, [
      el('div', {}, [nameEn, nameJa]),
      el('span', { class: 'stage-progress data-only' }, [progressCaption, percent]),
    ]),
    summaryEn,
    summaryJa,
  ]);

  let currentIndex = -1;

  return {
    element,
    update(progress) {
      fill.style.width = `${progress * 100}%`;
      percent.textContent = `${Math.round(progress * 100)}%`;

      const index = stageIndexFor(progress, stages);
      steps.forEach((step, i) => {
        step.classList.toggle('is-current', i === index);
        step.classList.toggle('is-done', i < index);
      });
      if (index === currentIndex) return;
      currentIndex = index;

      const stage = stages[index];
      nameEn.textContent = stage.name;
      nameJa.textContent = stage.nameJa;
      summaryEn.textContent = stage.summary;
      summaryJa.textContent = stage.summaryJa;
      element.dataset.stage = stage.id;
    },
    get stage() {
      return stages[currentIndex] ?? stages[0];
    },
  };
}
