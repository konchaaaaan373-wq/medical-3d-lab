import test from 'node:test';
import assert from 'node:assert/strict';

import { LAB_SCENES, PUBLIC_SCENES, SCENES } from '../src/catalog/index.js';
import {
  SITE_NAME,
  jsonLdScript,
  absoluteUrl,
  buildRobots,
  buildSitemap,
  escapeHtml,
  headTags,
  missingSocialCards,
  renderScenePage,
  sceneJsonLd,
  sceneMetadata,
  scenePagePath,
  scenePageUrl,
  siteJsonLd,
} from '../scripts/site-metadata.js';

const BASE = 'https://medical3d.example';
/** By id or by slug — the two differ for at least one scene (`copd-hyperinflation`). */
const scene = (key) => {
  const found = SCENES.find((entry) => entry.id === key || entry.slug === key);
  assert.ok(found, `no scene "${key}"`);
  return found;
};

test('metadata: every public scene gets its own address and page', () => {
  const paths = new Set();
  for (const entry of PUBLIC_SCENES) {
    const path = scenePagePath(entry);
    assert.ok(!paths.has(path), `duplicate generated page: ${path}`);
    paths.add(path);
    assert.equal(scenePageUrl(entry), `s/${entry.slug}/`);
  }
  assert.equal(paths.size, PUBLIC_SCENES.length);
});

test('metadata: a scene page carries a title and description in both languages', () => {
  for (const entry of PUBLIC_SCENES) {
    const meta = sceneMetadata(entry, { baseUrl: BASE });
    assert.ok(meta.title.includes(entry.titleJa), `${entry.id}: no Japanese title`);
    assert.ok(meta.title.includes(entry.titleEn), `${entry.id}: no English title`);
    assert.ok(meta.description.includes(entry.descriptionJa));
    assert.ok(meta.description.includes(entry.description));
    assert.ok(meta.title.endsWith(SITE_NAME));
  }
});

test('metadata: without a configured site URL, a canonical is omitted rather than guessed', () => {
  const meta = sceneMetadata(scene('heart-failure'));
  assert.equal(meta.canonical, '');
  assert.equal(meta.appUrl, '');
  assert.equal(meta.image, '');

  const tags = headTags(meta).join('\n');
  assert.ok(!tags.includes('rel="canonical"'));
  assert.ok(!tags.includes('og:url'));
});

test('metadata: with a site URL, the canonical is the page and not the fragment', () => {
  const meta = sceneMetadata(scene('copd'), { baseUrl: BASE });
  assert.equal(meta.canonical, `${BASE}/s/copd/`);
  assert.ok(!meta.canonical.includes('#'), 'a crawler is never sent a fragment');
  assert.equal(meta.appUrl, `${BASE}/#/copd`);
});

test('metadata: a link preview is advertised only when the image exists', () => {
  const withCard = sceneMetadata(scene('copd'), { baseUrl: BASE, socialCards: new Set(['copd']) });
  assert.equal(withCard.image, `${BASE}/social/copd.png`);
  assert.match(headTags(withCard).join('\n'), /twitter:card" content="summary_large_image/);

  const without = sceneMetadata(scene('copd'), { baseUrl: BASE });
  assert.equal(without.image, '');
  assert.match(headTags(without).join('\n'), /twitter:card" content="summary"/);
  assert.ok(!headTags(without).join('\n').includes('og:image'));
});

test('metadata: missing preview images are reported by name', () => {
  const missing = missingSocialCards(PUBLIC_SCENES, new Set(['copd']));
  assert.ok(!missing.includes('copd'));
  assert.equal(missing.length, PUBLIC_SCENES.length - 1);
});

test('metadata: the review state on the page comes from the registry, not the catalogue', () => {
  const entry = scene('copd');
  const reviewed = sceneMetadata(entry, { review: { reviewStatus: 'reviewed', reviewedAt: '2026-08-01' } });
  assert.equal(reviewed.reviewStatus, 'reviewed');
  // A scene with no registry record is pending, never inherited from maturity.
  assert.equal(sceneMetadata(entry).reviewStatus, 'pending');
});

test('json-ld: a scene describes itself as a learning resource, not clinical reference', () => {
  const entry = scene('heart-failure');
  const data = sceneJsonLd(sceneMetadata(entry, { baseUrl: BASE }), entry);
  assert.equal(data['@type'], 'LearningResource');
  assert.ok(!JSON.stringify(data).includes('MedicalWebPage'));
  assert.ok(!JSON.stringify(data).includes('MedicalCondition'));
  assert.match(data.disclaimer, /Not patient-specific/);
  assert.equal(data.about.name, 'heart-failure');
});

test('json-ld: normal-physiology scenes have no disease topic invented for them', () => {
  const normal = PUBLIC_SCENES.find((entry) => entry.disease === null);
  if (!normal) return;
  const data = sceneJsonLd(sceneMetadata(normal), normal);
  assert.equal(data.about, undefined);
});

test('json-ld: the site entry omits its URL when none is configured', () => {
  assert.equal(siteJsonLd().url, undefined);
  assert.equal(siteJsonLd({ baseUrl: BASE }).url, BASE);
  assert.equal(siteJsonLd().name, SITE_NAME);
});

test('sitemap: is skipped rather than emitted with relative paths', () => {
  assert.equal(buildSitemap(PUBLIC_SCENES), '');
});

test('sitemap: lists the site root and every public scene, and nothing from the Lab', () => {
  const xml = buildSitemap(PUBLIC_SCENES, { baseUrl: BASE, lastModified: '2026-09-01' });
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
  assert.ok(xml.includes(`<loc>${BASE}/</loc>`));

  for (const entry of PUBLIC_SCENES) {
    assert.ok(xml.includes(`<loc>${BASE}/s/${entry.slug}/</loc>`), `${entry.id} is missing`);
  }
  for (const entry of LAB_SCENES) {
    assert.ok(!xml.includes(`/s/${entry.slug}/`), `${entry.id} is Prototype and must not be indexed`);
  }
  assert.ok(!xml.includes('#'), 'a sitemap of fragments would list one page many times');
});

test('sitemap: reviewed and production models rank above less mature ones', () => {
  const xml = buildSitemap(PUBLIC_SCENES, { baseUrl: BASE });
  const priorityFor = (slug) => {
    const block = xml.slice(xml.indexOf(`/s/${slug}/`));
    return block.slice(0, block.indexOf('</url>')).match(/<priority>([\d.]+)</)[1];
  };
  for (const entry of PUBLIC_SCENES) {
    const expected = ['production', 'reviewed'].includes(entry.status) ? '0.8' : '0.6';
    assert.equal(priorityFor(entry.slug), expected, `${entry.id} (${entry.status})`);
  }
});

test('sitemap: extra shell paths can be listed alongside the scenes', () => {
  const xml = buildSitemap([], { baseUrl: BASE, extraPaths: ['#/organs'] });
  assert.ok(xml.includes(`<loc>${BASE}/#/organs</loc>`));
});

test('robots: points at the sitemap only when there is one', () => {
  assert.ok(!buildRobots().includes('Sitemap:'));
  assert.match(buildRobots({ baseUrl: BASE }), new RegExp(`Sitemap: ${BASE}/sitemap.xml`));
  assert.match(buildRobots(), /^User-agent: \*\nAllow: \//);
});

test('robots: does not pretend a fragment can be disallowed', () => {
  // robots.txt matches paths; a crawler is never sent `#/lab`. Writing a rule
  // for it would look like protection and provide none.
  assert.ok(!buildRobots({ baseUrl: BASE }).includes('Disallow: /#'));
});

test('page: is readable with no JavaScript and no bundle', () => {
  const html = renderScenePage(scene('heart-failure'), { baseUrl: BASE });
  assert.ok(!/<script(?![^>]*application\/ld\+json)/.test(html), 'no executable script may be required');
  assert.ok(!html.includes('/assets/'), 'the page must not depend on the app bundle');
  assert.ok(html.includes('心不全'));
  assert.ok(html.includes('Heart failure'));
});

test('page: links into the model relatively, so a subpath deployment still works', () => {
  const html = renderScenePage(scene('copd'), { baseUrl: BASE });
  assert.ok(html.includes('href="../../#/copd"'));
  assert.ok(html.includes('href="../../#/organs"'));
  assert.ok(html.includes('href="../../#/trust"'));
});

test('page: states maturity, review state and the educational-model boundary', () => {
  const html = renderScenePage(scene('copd'), {
    baseUrl: BASE,
    review: { reviewStatus: 'reviewed', reviewedAt: '2026-08-01' },
  });
  assert.match(html, /レビュー済/);
  assert.match(html, /臨床レビュー記録済み/);
  assert.match(html, /教育目的の概念モデル/);
  assert.match(html, /not patient-specific diagnosis or treatment/i);
});

test('page: every public scene renders without a placeholder or an undefined', () => {
  for (const entry of PUBLIC_SCENES) {
    const html = renderScenePage(entry, { baseUrl: BASE });
    assert.ok(!html.includes('undefined'), `${entry.id} rendered "undefined"`);
    assert.ok(!html.includes('null'), `${entry.id} rendered "null"`);
    assert.ok(html.includes('<h1>'), `${entry.id} has no heading`);
  }
});

test('page: text from the catalogue is escaped rather than injected', () => {
  const hostile = {
    ...scene('copd'),
    slug: 'x',
    titleJa: '<script>alert(1)</script>',
    titleEn: 'A & B',
    descriptionJa: '"quoted"',
    description: "it's fine",
  };
  const html = renderScenePage(hostile, { baseUrl: BASE });
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('A &amp; B'));
  assert.equal(escapeHtml(`<&">'`), '&lt;&amp;&quot;&gt;&#39;');
});

test('json-ld: a closing tag in the data cannot terminate the script element', () => {
  const encoded = jsonLdScript({ name: '</script><img src=x onerror=alert(1)>' });
  assert.ok(!encoded.includes('</script>'));
  assert.ok(!encoded.includes('<'));
  // Still valid JSON: escaping must not break the thing it is protecting.
  assert.equal(JSON.parse(encoded).name, '</script><img src=x onerror=alert(1)>');
});

test('page: an exotic title cannot escape the JSON-LD block either', () => {
  const hostile = { ...scene('copd'), slug: 'x', titleJa: '</script><b>no</b>' };
  const html = renderScenePage(hostile, { baseUrl: BASE });
  const block = html.slice(html.indexOf('application/ld+json'));
  assert.ok(!block.slice(0, block.indexOf('</script>')).includes('<'));
});

test('url: joining a base and a path never doubles or drops a slash', () => {
  assert.equal(absoluteUrl('https://x.example', 'a/b'), 'https://x.example/a/b');
  assert.equal(absoluteUrl('https://x.example/', '/a/b'), 'https://x.example/a/b');
  assert.equal(absoluteUrl('https://x.example/lab', 'a'), 'https://x.example/lab/a');
  assert.equal(absoluteUrl('', 'a'), '');
});
