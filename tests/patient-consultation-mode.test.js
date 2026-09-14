import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createPatientGuidePanel } from '../src/components/PatientGuidePanel.js';
import { PATIENT_GUIDES } from '../src/data/patientGuides.js';
import { findByClass, installFakeDocument } from './helpers/fake-dom.js';

const read = (path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

test('patient explanation opens in its dedicated consultation view and pauses playback', () => {
  const source = read('../src/access/installAccess.js');
  const guideClass = source.indexOf("ui.classList.add('is-patient-guide')");
  const consultation = source.indexOf('guidePanel.setPresentation(true)', guideClass);

  assert.ok(guideClass >= 0, 'patient mode marks the shell as open');
  assert.ok(consultation > guideClass, 'the dedicated consultation view starts after the guide is mounted');
  assert.match(source, /sessionSnapshot = beginGuideSession\(app\.playback\)/);
  assert.match(source, /Patient explanation \/ 患者説明/, 'the entry control keeps a Japanese accessible name');
  assert.equal(
    source.match(/emitAppEvent\('guide:open'/g)?.length,
    1,
    'opening records one event instead of an ordinary and a presentation open'
  );
  assert.match(
    source,
    /fullscreen:\s*Boolean\(document\.fullscreenElement\)/,
    'presentation layout remains distinct from browser full screen'
  );
});

test('patient panel uses coherent headings and bilingual accessible names', () => {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.document.fullscreenEnabled = false;
  globalThis.window = { print() {} };

  try {
    const guide = PATIENT_GUIDES['heart-failure'];
    assert.ok(guide, 'heart failure patient copy exists');

    const panel = createPatientGuidePanel({
      guide,
      setProgress() {},
      onExit() {},
    });

    assert.equal(findByClass(panel.element, 'patient-guide-heading')[0]?.tagName, 'H2');
    assert.match(panel.element.getAttribute('aria-label') ?? '', /患者説明/);
    const dots = findByClass(panel.element, 'patient-guide-dots')[0];
    assert.equal(dots?.getAttribute('role'), 'group');
    assert.match(dots?.getAttribute('aria-label') ?? '', /説明のステップ/);
    assert.match(findByClass(panel.element, 'patient-guide-fullscreen')[0]?.getAttribute('aria-label') ?? '', /患者説明/);
    assert.match(findByClass(panel.element, 'patient-guide-handout-button')[0]?.getAttribute('aria-label') ?? '', /患者向け資料/);
    assert.match(findByClass(panel.element, 'patient-guide-close')[0]?.getAttribute('aria-label') ?? '', /患者説明を閉じる/);

    const dotLabels = findByClass(panel.element, 'patient-guide-dot').map((dot) => dot.getAttribute('aria-label') ?? '');
    assert.equal(dotLabels.length, guide.steps.length);
    assert.ok(dotLabels.every((label) => /段階中/.test(label)), 'every direct step target has a Japanese accessible name');
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    restoreDocument();
  }
});

test('patient-authored display copy is plain text because the panel does not parse Markdown', () => {
  const displayFields = ['title', 'titleJa', 'body', 'bodyJa', 'look', 'lookJa'];
  for (const [sceneId, guide] of Object.entries(PATIENT_GUIDES)) {
    for (const [index, step] of guide.steps.entries()) {
      for (const field of displayFields) {
        assert.doesNotMatch(
          String(step[field] ?? ''),
          /\*\*/,
          `${sceneId} step ${index + 1} field ${field} would expose Markdown markers`
        );
      }
    }
  }
});

test('consultation layout stays last in the cascade and separate from education mode', () => {
  const entry = read('../src/main.js');
  const stylesheet = "import './styles/patient-consultation.css';";
  const stylesheetIndex = entry.indexOf(stylesheet);

  assert.ok(stylesheetIndex >= 0, 'consultation stylesheet is loaded');
  assert.ok(
    stylesheetIndex > entry.indexOf("import './styles/browser-first-release-polish.css';"),
    'consultation view intentionally overrides compact shell rules'
  );

  const css = read('../src/styles/patient-consultation.css');
  assert.match(css, /#ui\.is-patient-guide\.is-patient-presentation \.console/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /height:\s*clamp\(294px, 48dvh, 390px\)/);
  assert.match(css, /#ui\[data-lang='both'\].*height:\s*clamp\(352px, 62dvh, 430px\)/s);
  assert.match(css, /width:\s*min\(400px, 44vw\)/);
  assert.doesNotMatch(css, /42dvh/, 'short portrait screens must retain usable space for the current step');
  assert.doesNotMatch(css, /is-education-guide/, 'education keeps its own denser interface');
});
