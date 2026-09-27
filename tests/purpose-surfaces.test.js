import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createSceneSwitcher } from '../src/components/SceneSwitcher.js';
import { createShellHeader } from '../src/components/ShellHeader.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

globalThis.requestAnimationFrame ??= (fn) => { fn(0); return 0; };

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * The two purposes as the surfaces draw them: the scene header's switch and
 * location, the reading header's top level, and the entrances that must not
 * appear when there is nothing behind them.
 */

const scene = (id, extra = {}) => ({
  id, slug: id, organ: 'heart', system: 'cardiovascular', status: 'production', uses: ['education'],
  label: 'Heart failure', labelJa: '心不全', titleEn: 'Heart failure', titleJa: '心不全', tags: [], ...extra,
});
const groups = () => [{ id: 'cardiovascular', label: 'Cardiovascular', labelJa: '循環器', scenes: [scene('heart-failure')] }];

function mountSwitcher(purpose) {
  const ui = new FakeElement('div');
  const restore = installFakeDocument({ elements: { ui } });
  try {
    return { ui, switcher: createSceneSwitcher({ groups: groups(), currentId: 'heart-failure', showLab: true, models: [], purpose }) };
  } finally {
    restore();
  }
}

const text = (node) =>
  node == null ? '' : node.children?.length ? node.children.map(text).join('') : String(node.textContent ?? '');
const words = (node) => text(node).replace(/\s+/g, '');
const visible = (node) => node && !node.hidden;

test('a one-purpose model keeps the header it had: no switch, no purpose in the location', () => {
  const { switcher } = mountSwitcher({ available: false });
  assert.equal(findByClass(switcher.element, 'global-nav-purpose').length, 0);
  assert.equal(findByClass(switcher.element, 'global-nav-purpose-root').length, 0);
  // And asking it to change purpose does nothing rather than throwing.
  switcher.setPurpose({ current: 'patient' });
  assert.equal(findByClass(switcher.element, 'is-patient').length, 0);
});

test('a two-purpose model says which purpose it is in, and switches through the address', () => {
  const asked = [];
  const { switcher, ui } = mountSwitcher({ available: true, onChange: (purpose) => asked.push(purpose) });
  const options = findByClass(switcher.element, 'global-nav-purpose-option');
  assert.deepEqual(options.map((o) => o.dataset.purpose), ['education', 'patient']);
  assert.deepEqual(options.map((o) => o.getAttribute('aria-pressed')), ['true', 'false'], 'education is the default');
  assert.equal(options.every((o) => o.tagName.toLowerCase() === 'button'), true, 'a switch is buttons, not links');

  // Education: 医学教育 › … with the root going to the education list.
  const [educationRoot] = findByClass(switcher.element, 'global-nav-purpose-root').filter((a) => a.className.includes('is-education'));
  assert.ok(educationRoot, 'the education location starts from its purpose');
  assert.match(words(educationRoot), /医学教育/);

  // Pressing asks; it does not decide.
  options[1].click();
  assert.deepEqual(asked, ['patient']);

  switcher.setPurpose({ current: 'patient', question: { en: 'Why?', ja: 'なぜ弱くなる？' } });
  assert.deepEqual(options.map((o) => o.getAttribute('aria-pressed')), ['false', 'true']);
  const [patientLocation] = findByClass(switcher.element, 'global-nav-current').filter((n) => n.className.includes('is-patient'));
  assert.ok(visible(patientLocation), 'the patient location is shown');
  assert.match(words(patientLocation), /患者説明›?.*なぜ弱くなる？/);
  const [patientRoot] = findByClass(patientLocation, 'global-nav-purpose-root');
  assert.equal(patientRoot.getAttribute('href'), '#/patient', 'the root goes back to the list of questions');
  const [educationLocation] = findByClass(switcher.element, 'global-nav-current').filter((n) => !n.className.includes('is-patient'));
  assert.equal(visible(educationLocation), false, 'only one location at a time');
  assert.equal(ui.classList.contains('has-layer-row'), false);

  switcher.setPurpose({ current: 'education' });
  assert.equal(visible(patientLocation), false);
  assert.equal(visible(educationLocation), true);
});

function withDocument(run) {
  const ui = new FakeElement('div');
  const restore = installFakeDocument({ elements: { ui } });
  try {
    return run();
  } finally {
    restore();
  }
}

test('the reading header names the two purposes only when both exist', () => withDocument(() => {
  const withBoth = createShellHeader({ current: 'models', showLab: true, showPurposes: true, models: [] });
  const links = findByClass(withBoth, 'shell-nav-link');
  const labels = links.map((a) => words(a));
  assert.ok(labels.some((t) => t.includes('医学教育')) && labels.some((t) => t.includes('患者説明')));
  assert.equal(labels.some((t) => t === 'ModelsモデルModels' || /^Modelsモデル$/.test(t)), false, 'the model index is 医学教育 here, not a third link');
  const current = links.find((a) => a.getAttribute('aria-current') === 'page');
  assert.match(words(current), /医学教育/, 'the model index marks 医学教育 as where you are');

  const withOne = createShellHeader({ current: 'models', showLab: true, showPurposes: false, models: [] });
  const oneLabels = findByClass(withOne, 'shell-nav-link').map((a) => words(a));
  assert.equal(oneLabels.some((t) => t.includes('患者説明')), false, 'no 患者説明 door onto an empty room');
}));

test('no entrance to patient explanation where none is open', () => {
  const landing = read('src/app/Landing.js');
  assert.match(landing, /function purposeEntrances\(patientScenes\) \{\s*if \(!patientScenes\.length\) return null;/);
  const header = read('src/components/ShellHeader.js');
  assert.match(header, /patientExplanationScenes\(\)\.length > 0/);
  const explorer = read('src/app/Explorer.js');
  assert.match(explorer, /modes: patientUseListed \? undefined : \['all', 'education', 'clinical-learning'\]/);
});

test('#/patient is a document route, known to the boot veil and the release', () => {
  const html = read('index.html');
  assert.match(html, /'patient'/);
  const release = read('src/catalog/release.js');
  assert.match(release, /RELEASED_ROUTE_KINDS = new Set\(\[[^\]]*'patient'/);
});
