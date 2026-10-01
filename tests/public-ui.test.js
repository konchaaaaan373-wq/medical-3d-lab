import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createLanding } from '../src/app/Landing.js';
import { createPublicModelsExplorer } from '../src/app/Landing.js';
import { createAbout } from '../src/app/About.js';
import { createLandingOrganHero } from '../src/app/landingOrganHero.js';
import {
  HERO_ORGANS,
  featuredHeroOrgan,
  heroOrgansForModels,
} from '../src/data/landingHero.js';
import { NECO_LINKS } from '../src/data/necoLinks.js';
import { ORGANS } from '../src/catalog/taxonomy.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const model = (sceneId, organId, organLabelJa) => Object.freeze({
  sceneId,
  organId,
  organLabelJa,
  titleJa: organLabelJa,
  titleEn: organId === 'brain' ? 'Brain anatomy' : 'Heart anatomy',
  route: `#/${sceneId}`,
  posterPath: `/social/${sceneId}.png`,
  posterKind: 'link-preview-card',
  modelInfoRoute: '#/trust',
  modelCard: `docs/model-cards/${sceneId}.md`,
});

const BRAIN = model('brain-anatomy', 'brain', '脳');
const HEART = model('heart-anatomy', 'heart', '心臓');
const manifest = (models) => Object.freeze({
  schemaVersion: 1,
  revision: 'fixture1',
  channel: 'public-beta',
  models: Object.freeze(models),
  organs: Object.freeze(models.map((entry) => entry.organId)),
  count: models.length,
});

function textOf(node, out = []) {
  if (node.textContent) out.push(node.textContent);
  for (const child of node.children ?? []) textOf(child, out);
  return out.join(' ');
}

function linksOf(node, out = []) {
  if (node.tagName === 'A') out.push(node);
  for (const child of node.children ?? []) linksOf(child, out);
  return out;
}

function withDom(run) {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = {};
  try {
    return run();
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
}

test('public UI: zero models renders a stable empty state without a model link or WebGL', () => {
  withDom(() => {
    const ui = new FakeElement('div');
    const mounted = createLanding({ ui, manifest: manifest([]) });
    const hrefs = linksOf(mounted.element).map((link) => link.getAttribute('href'));

    assert.equal(findByClass(mounted.element, 'landing-demo-viewport').length, 0);
    assert.equal(findByClass(mounted.element, 'model-card').length, 0);
    assert.equal(hrefs.some((href) => /^#\/(brain|heart)-anatomy$/.test(href ?? '')), false);
    assert.match(textOf(mounted.element), /公開した病態モデルから、ここに表示します/);

    // The anatomy page says the same thing about the organs, without WebGL.
    const anatomy = createPublicModelsExplorer({ ui: new FakeElement('div'), manifest: manifest([]) });
    assert.match(textOf(anatomy.element), /現在利用できる3D解剖モデルはありません/);
    assert.equal(anatomy.organHero, null);
  });
});

test('public UI: an anatomy-only release lists the organ under the models, and the organ lives on the anatomy page', () => {
  withDom(() => {
    const ui = new FakeElement('div');
    const mounted = createLanding({ ui, manifest: manifest([BRAIN]) });
    const hrefs = linksOf(mounted.element).map((link) => link.getAttribute('href'));

    // BYOKI MOTION's front door has no organ in 3D (ADR 2026-09-30): the brain
    // is a link on the anatomy line, not a model on the page.
    assert.equal(findByClass(mounted.element, 'landing-demo-viewport').length, 0);
    assert.equal(findByClass(mounted.element, 'model-card').length, 0, 'an anatomy model is not a disease-model card');
    // The hero's field is decoration, and says so to assistive tech.
    for (const field of findByClass(mounted.element, 'bm-hero-motion')) {
      assert.equal(field.getAttribute('aria-hidden'), 'true');
    }
    assert.ok(hrefs.includes('#/brain-anatomy'));

    const anatomy = createPublicModelsExplorer({ ui: new FakeElement('div'), manifest: manifest([BRAIN]) });
    assert.match(textOf(anatomy.element), /脳を回転・拡大し、色分けされた部位の位置関係/);
    assert.equal(findByClass(anatomy.element, 'landing-demo-viewport').length, 1);
    assert.equal(findByClass(anatomy.element, 'landing-demo-state').length, 0);
    assert.equal(anatomy.organHero.organ, 'brain');
  });
});

test('public UI: Neco is the operator — credited once at the foot, introduced on About', () => {
  withDom(() => {
    const ui = new FakeElement('div');
    const mounted = createLanding({ ui, manifest: manifest([BRAIN]) });
    const landingHrefs = linksOf(mounted.element).map((link) => link.getAttribute('href'));

    // ADR 2026-09-30: BYOKI MOTION is the product; the operator is named in
    // the footer's size, not as a section of the front door.
    assert.equal(findByClass(mounted.element, 'landing-neco').length, 0);
    assert.equal(landingHrefs.filter((href) => href === NECO_LINKS.operator).length, 1);
    assert.equal(landingHrefs.includes(NECO_LINKS.doctor), false);
    assert.equal(landingHrefs.includes(NECO_LINKS.medicalInstitution), false);
    assert.match(textOf(findByClass(mounted.element, 'site-footer-operator')[0]), /運営：株式会社Neco/);

    const about = createAbout({ ui: new FakeElement('div') });
    const operator = findByClass(about.element, 'bm-about-section').find((node) => node.getAttribute('id') === 'about-operator');
    const links = linksOf(operator);
    assert.deepEqual(
      links.map((link) => link.getAttribute('href')),
      [NECO_LINKS.operator, NECO_LINKS.doctor, NECO_LINKS.medicalInstitution]
    );
    for (const link of links) {
      assert.equal(link.getAttribute('target'), '_blank');
      assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
    }
  });
});

test('public UI: two-model fixture uses an explicit chooser and keeps one live viewport', () => {
  withDom(() => {
    const organs = heroOrgansForModels([BRAIN, HEART], HERO_ORGANS);
    const first = featuredHeroOrgan(new Date('2026-09-08T00:00:00Z'), organs);
    const later = featuredHeroOrgan(new Date('2027-01-14T23:59:59Z'), organs);
    assert.equal(first.organ, 'brain');
    assert.equal(later.organ, 'brain', 'the date must not change the initial model');

    const hero = createLandingOrganHero({ organs, compact: true });
    const controls = findByClass(hero.element, 'landing-demo-state');
    const viewports = findByClass(hero.element, 'landing-demo-viewport');
    const openLink = hero.actionElement;
    const identity = findByClass(hero.element, 'landing-demo-identity')[0];

    assert.equal(controls.length, 2);
    assert.equal(viewports.length, 1, 'switching models must reuse one WebGL viewport');
    assert.match(textOf(identity), /脳の3Dモデル/);
    assert.match(viewports[0].getAttribute('aria-label'), /操作できる脳の3Dモデル/);
    controls[1].click();
    assert.equal(hero.organ, 'heart');
    assert.equal(openLink.getAttribute('href'), '#/heart-anatomy');
    assert.match(textOf(identity), /心臓の3Dモデル/);
    assert.match(viewports[0].getAttribute('aria-label'), /操作できる心臓の3Dモデル/);
    assert.equal(controls[0].getAttribute('aria-pressed'), 'false');
    assert.equal(controls[1].getAttribute('aria-pressed'), 'true');
  });
});

test('public model route: one model has no search, filters, category jumps or placeholder cards', () => {
  withDom(() => {
    const ui = new FakeElement('div');
    const mounted = createPublicModelsExplorer({ ui, manifest: manifest([BRAIN]) });
    const hrefs = linksOf(mounted.element).map((link) => link.getAttribute('href'));

    assert.match(textOf(mounted.element), /Brain anatomy/);
    assert.match(textOf(mounted.element), /脳/);
    assert.equal(findByClass(mounted.element, 'landing-demo-viewport').length, 1);
    assert.equal(
      findByClass(mounted.element, 'landing-demo-identity').length,
      0,
      'the page H1 already names the sole model'
    );
    assert.equal(findByClass(mounted.element, 'explorer-search').length, 0);
    assert.equal(findByClass(mounted.element, 'explorer-jump').length, 0);
    assert.equal(findByClass(mounted.element, 'explorer-scene').length, 0);
    assert.ok(hrefs.includes('#/brain-anatomy'));
    for (const route of ['#/', '#/terms', '#/privacy', '#/commerce', '#/support']) {
      assert.ok(hrefs.includes(route), `the public model route keeps ${route} reachable`);
    }
    // The model's own record, not the ledger of all of them: the header's
    // 公開とレビュー link was removed on 2026-09-27, and what a reader keeps is
    // the sources and limits of the model on screen.
    assert.ok(
      hrefs.some((href) => href?.startsWith('#/trust?model=')),
      'the model on screen keeps a route to its own sources and limits'
    );
    assert.equal(hrefs.includes('#/trust'), false, 'and nothing links the whole ledger');
  });
});

test('public model route: a two-model fixture keeps the selected identity beside one viewport', () => {
  withDom(() => {
    const ui = new FakeElement('div');
    const mounted = createPublicModelsExplorer({ ui, manifest: manifest([BRAIN, HEART]) });

    assert.equal(findByClass(mounted.element, 'landing-demo-viewport').length, 1);
    assert.equal(findByClass(mounted.element, 'landing-demo-identity').length, 1);
    assert.equal(findByClass(mounted.element, 'landing-demo-state-index').length, 0);
    assert.match(textOf(findByClass(mounted.element, 'landing-demo-identity')[0]), /脳の3Dモデル/);
  });
});

test('public UI does not consume a link-preview card as model imagery', () => {
  for (const source of [read('src/app/Landing.js')]) {
    assert.doesNotMatch(source, /posterPath|posterKind/);
  }
});

test('the beta copy names published organs only through the manifest', () => {
  // Twice now a surface has written the published list down by hand and then
  // gone false: the locked page said "the beta is the 3D anatomy of the brain
  // and the heart" while only the brain was open, and the Explorer said "the
  // beta is aiming at the brain and the heart" two lines below the comment
  // warning against exactly that — until the liver was published and a reader
  // saw "Open now: the brain and heart and liver" above a scope claiming two.
  //
  // So this reads the source rather than the render: the beta strings may
  // interpolate the derived organ names, and may not spell any organ out. A
  // literal organ name in that copy is a second copy of the published list,
  // which is what CLAUDE.md forbids and what goes stale.
  const source = readFileSync('src/app/Explorer.js', 'utf8');
  const betaCopy = source
    .split('\n')
    .filter((line) => /Beta: 3D anatomy|β版：3D解剖モデル/.test(line))
    .join('\n');
  assert.ok(betaCopy, 'the beta subtitle was not found, so nothing can be absent from it');

  for (const organ of ORGANS) {
    for (const name of [organ.label, organ.labelJa]) {
      if (!name) continue;
      assert.equal(
        betaCopy.toLowerCase().includes(name.toLowerCase()),
        false,
        `the beta copy spells out "${name}" instead of deriving it from PUBLIC_MANIFEST`
      );
    }
  }
});
