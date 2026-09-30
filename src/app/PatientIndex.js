import { pageTitle } from '../data/brand.js';
import { el, skipLink } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import { createShellHeader } from '../components/ShellHeader.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { organById, sceneRoute } from '../catalog/index.js';
import { patientExplanationScenes } from '../access/patientPurpose.js';
import { PURPOSE, hashWithPurpose, purposeById } from './purpose.js';
import '../styles/pathology-index.css';
import '../styles/purpose.css';

/**
 * `#/patient` — patient explanation, found by the question a person brings.
 *
 * The medical-education side of the product is explored by body system, organ
 * and mechanism (the model index, `#/pathology`). A person sitting beside a
 * monitor does not arrive with "cardiovascular › heart › HFrEF"; they arrive
 * with "why does my heart get weaker?". So this page lists the explanations
 * themselves, each by the question its guide answers, and each opens the same
 * model the education side opens — in its patient-explanation purpose
 * (`?purpose=patient`, `src/app/purpose.js`). One model, two ways in.
 *
 * **Which questions appear is not decided here.** `patientExplanationScenes`
 * lists only models where the release, the versioned clinical review, the
 * catalogue's declaration and a written explanation all agree; on a build with
 * none, this page says so and points at the models that are open, rather than
 * pretending to be an index.
 *
 * The question is the guide's own title — the words the explanation was
 * written and reviewed under — so this page adds no medical sentence of its
 * own. The titles ship with the guide index already (`features.js`), so
 * nothing paid is exposed by listing them; the explanation itself is still
 * fetched from the server against the reader's entitlement.
 *
 * @param {{ui: HTMLElement, accountButton?: HTMLElement|null, scenes?: ReadonlyArray<object>}} options
 */
export async function createPatientIndex({ ui, accountButton = null, scenes = null }) {
  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });
  const listed = scenes ?? patientExplanationScenes();
  // The titles live with the guides, which are a lazy chunk; asked only when
  // there is something to list.
  const { patientGuideFor } = listed.length
    ? await import('../data/patientGuides.js')
    : { patientGuideFor: () => null };
  const purpose = purposeById(PURPOSE.PATIENT);

  const element = el('main', { class: 'explorer is-public is-pathology is-patient-index' }, [
    createShellHeader({ current: 'patient', accountButton, languageToggle: languageToggle.element }),
    el('header', { class: 'panel explorer-header' }, [
      el('p', { class: 'eyebrow purpose-eyebrow is-patient' }, [
        el('span', { class: 'lang-en', text: purpose.en }),
        el('span', { class: 'lang-ja', text: purpose.ja }),
      ]),
      el('h1', { class: 'title' }, [
        el('span', { class: 'lang-en', text: 'What would you like to understand?' }),
        el('span', { class: 'lang-ja', text: '知りたいことから選ぶ' }),
      ]),
      el('p', { class: 'subtitle' }, [
        el('span', {
          class: 'lang-en',
          text:
            'Each explanation walks through what happens, one step at a time, on a representative 3D model. It is general — it cannot tell you about your own diagnosis or what will happen to you.',
        }),
        el('span', {
          class: 'lang-ja',
          text:
            '代表的な 3D モデルの上で、何が起きるのかを順に見ていく説明です。一般的な説明であり、あなた自身の診断やこれからの経過を示すものではありません。',
        }),
      ]),
      el('p', { class: 'purpose-access-note' }, [
        el('span', {
          class: 'lang-en',
          text: 'The 3D models are free. The step-by-step explanation needs the patient-explanation plan.',
        }),
        el('span', {
          class: 'lang-ja',
          text: '3D モデルは無料で見られます。順を追った説明には「患者説明」プランが必要です。',
        }),
      ]),
    ]),
    el('section', {
      class: 'explorer-system pathology-list patient-question-list',
      id: 'content',
      tabindex: '-1',
      'data-skip-target': '',
      'aria-label': inLanguage('Questions', '知りたいこと'),
    }, [
      listed.length
        ? el('div', { class: 'explorer-scenes' }, listed.map((scene) => card(scene, patientGuideFor(scene.id))))
        : el('p', { class: 'explorer-empty', role: 'status' }, [
            el('span', {
              class: 'lang-en',
              text: 'No patient explanation is open in this release yet. The 3D models on the home page are open to everyone.',
            }),
            el('span', {
              class: 'lang-ja',
              text: 'この版で公開している患者説明はまだありません。ホームの 3D モデルはどなたでも見られます。',
            }),
          ]),
    ]),
  ]);

  ui.append(skipLink(), element);
  languageToggle.init();
  document.title = pageTitle(purpose.en);
  return {
    element,
    scenes: listed,
    destroy() {
      element.remove();
    },
  };
}

function card(scene, guide) {
  const organ = organById(scene.organ);
  return el(
    'a',
    {
      class: 'explorer-scene patient-question',
      href: hashWithPurpose(sceneRoute(scene), PURPOSE.PATIENT),
      dataset: { scene: scene.id },
    },
    [
      organ
        ? el('span', { class: 'patient-question-organ' }, [
            el('span', { class: 'lang-en', text: organ.label }),
            el('span', { class: 'lang-ja', text: organ.labelJa }),
          ])
        : null,
      el('span', { class: 'explorer-scene-title patient-question-title' }, [
        el('span', { class: 'lang-en', text: guide?.title ?? scene.titleEn }),
        el('span', { class: 'lang-ja', text: guide?.titleJa ?? scene.titleJa }),
      ]),
      el('span', { class: 'patient-question-model' }, [
        el('span', { class: 'lang-en', text: `On the model: ${scene.titleEn}` }),
        el('span', { class: 'lang-ja', text: `モデル：${scene.titleJa}` }),
      ]),
      el('span', { class: 'explorer-scene-footer' }, [
        el('span', { class: 'explorer-scene-open' }, [
          el('span', { class: 'lang-en', text: 'See the explanation' }),
          el('span', { class: 'lang-ja', text: '説明を見る' }),
        ]),
      ]),
    ].filter(Boolean)
  );
}
