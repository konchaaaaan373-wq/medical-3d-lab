import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { RESERVED_ROUTE_SLUGS, SCENES, validateCatalog } from '../src/catalog/index.js';
import { resolveRoute, sameRoute } from '../src/app/router.js';
import {
  LEGAL_DOCUMENTS,
  LEGAL_SLUGS,
  commerceRows,
  legalDocument,
  validateLegal,
} from '../src/data/legal.js';
import { OPERATOR, REQUIRED_OPERATOR_FIELDS, operatorGaps, operatorIsPublishable } from '../src/data/operator.js';
import { canSell, legalReadiness, saleBlockedNotice } from '../src/access/legalReadiness.js';
import { createTelemetry } from '../src/telemetry/telemetry.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/** A seller who has published everything required of them. */
const COMPLETE_OPERATOR = {
  legalName: 'Example 合同会社',
  representative: '山田 太郎',
  address: '東京都千代田区1-1-1',
  contactEmail: 'support@example.org',
  contactPhone: null,
  phoneOnRequest: true,
  jurisdiction: 'JP',
};

test('legal: the documents are structurally complete in both languages', () => {
  assert.deepEqual(validateLegal(COMPLETE_OPERATOR), []);
  assert.deepEqual(LEGAL_SLUGS, ['terms', 'privacy', 'commerce', 'support']);
  for (const doc of LEGAL_DOCUMENTS) {
    assert.ok(legalDocument(doc.slug) === doc);
  }
  assert.equal(legalDocument('nonsense'), null);
});

test('legal: each document has its own route and they do not collapse into one', () => {
  for (const slug of LEGAL_SLUGS) {
    assert.deepEqual(resolveRoute(`#/${slug}`), { kind: 'legal', docId: slug });
  }
  assert.equal(sameRoute('#/terms', '#/privacy'), false, 'two documents are two routes');
  assert.equal(sameRoute('#/terms', '#/terms'), true);
});

test('legal: a legal slug can never be shadowed by a scene', () => {
  for (const slug of LEGAL_SLUGS) {
    assert.ok(RESERVED_ROUTE_SLUGS.includes(slug), `${slug} is not reserved`);
    assert.ok(!SCENES.some((scene) => scene.slug === slug), `a scene claims "${slug}"`);
  }
  assert.deepEqual(validateCatalog(), []);
});

test('legal: the catalogue validator rejects a scene that claims a shell route', () => {
  const clash = { ...SCENES[0], id: 'clash', slug: 'privacy' };
  const problems = validateCatalog([clash]);
  assert.match(problems.join('\n'), /collides with a product-shell route/);
});

test('commerce: every entry required of a seller is present or shown as missing', () => {
  const rows = commerceRows(COMPLETE_OPERATOR);
  const labels = rows.map((row) => row.labelJa);
  for (const required of [
    '販売業者',
    '運営統括責任者',
    '所在地',
    '連絡先',
    '販売価格',
    '支払方法',
    '支払時期',
    '役務の提供時期',
    '解約・返品',
  ]) {
    assert.ok(labels.includes(required), `disclosure is missing "${required}"`);
  }
  assert.deepEqual(rows.filter((row) => row.missing), []);
});

test('commerce: nothing about the seller is invented while it is unknown', () => {
  const rows = commerceRows(OPERATOR);
  const missing = rows.filter((row) => row.missing).map((row) => row.labelJa);
  assert.ok(missing.includes('販売業者'));
  assert.ok(missing.includes('所在地'));
  // And no row quietly carries a plausible-looking placeholder instead.
  for (const row of rows) {
    assert.ok(!/例|sample|placeholder|TODO|株式会社サンプル/i.test(row.value ?? ''), row.labelJa);
  }
});

test('commerce: a row answered by a note is complete, not a gap', () => {
  const rows = commerceRows(COMPLETE_OPERATOR);
  const phone = rows.find((row) => row.labelEn === 'Telephone');
  assert.equal(phone.value, null);
  assert.equal(phone.missing, false, 'disclosed-on-request is an answer');
  assert.match(phone.note.ja, /遅滞なく/);
});

test('operator: a withheld telephone number is only acceptable with a commitment', () => {
  assert.ok(!operatorGaps(COMPLETE_OPERATOR).includes('contactPhone'));
  const silent = { ...COMPLETE_OPERATOR, contactPhone: null, phoneOnRequest: false };
  assert.ok(operatorGaps(silent).includes('contactPhone'));
});

test('operator: the shipped default is deliberately unpublishable', () => {
  assert.equal(operatorIsPublishable(OPERATOR), false);
  for (const field of REQUIRED_OPERATOR_FIELDS) {
    assert.equal(OPERATOR[field], null, `${field} must not carry an invented value`);
  }
});

test('readiness: nothing may be sold before the disclosure is published', () => {
  assert.equal(canSell({ billingConfigured: true }), false);
  assert.equal(canSell({ billingConfigured: true, operator: COMPLETE_OPERATOR }), true);
});

test('readiness: a complete disclosure does not by itself enable checkout', () => {
  assert.equal(canSell({ billingConfigured: false, operator: COMPLETE_OPERATOR }), false);
  assert.match(saleBlockedNotice({ billingConfigured: false, operator: COMPLETE_OPERATOR }).en, /not enabled/);
});

test('readiness: the reason checkout is blocked is specific, not one vague sentence', () => {
  const noBilling = saleBlockedNotice({ billingConfigured: false, operator: COMPLETE_OPERATOR });
  const noDisclosure = saleBlockedNotice({ billingConfigured: true, operator: OPERATOR });
  assert.notEqual(noBilling.en, noDisclosure.en);
  assert.match(noDisclosure.en, /commercial disclosure/i);
  assert.match(noDisclosure.ja, /特定商取引法/);
  assert.equal(saleBlockedNotice({ billingConfigured: true, operator: COMPLETE_OPERATOR }), null);
});

test('readiness: a missing document is reported as a gap, not assumed present', () => {
  const result = legalReadiness({ operator: COMPLETE_OPERATOR, availableSlugs: ['terms', 'privacy'] });
  assert.equal(result.ready, false);
  assert.deepEqual(result.missingDocuments, ['commerce', 'support']);
  assert.equal(legalReadiness({ operator: COMPLETE_OPERATOR }).ready, true);
});

test('readiness: the purchase gate does not drag the documents into the account chunk', () => {
  const source = read('src/access/legalReadiness.js');
  assert.ok(!/from '\.\.\/data\/legal\.js'/.test(source), 'the gate must not import the prose');
  assert.match(source, /from '\.\.\/data\/legalRoutes\.js'/);
});

test('legal: the routed slugs and the authored documents cannot drift apart', () => {
  assert.deepEqual(
    LEGAL_DOCUMENTS.map((doc) => doc.slug).sort(),
    [...LEGAL_SLUGS].sort(),
    'a document without a route, or a route without a document'
  );
  assert.deepEqual(validateLegal(COMPLETE_OPERATOR), []);
});

test('readiness: the purchase path actually asks, rather than checking billing alone', () => {
  const source = read('src/access/AccessManager.js');
  assert.match(source, /from '\.\/legalReadiness\.js'/);
  assert.match(source, /canSell\(\{ billingConfigured/);
  assert.match(source, /saleBlockedNotice\(\{ billingConfigured/);
  // The old check must not survive alongside the new one in the purchase path.
  const checkout = source.slice(source.indexOf('async function checkout(plan)'));
  assert.ok(!/if \(!state\.billingConfigured \|\|/.test(checkout.slice(0, 400)));
});

// --- the privacy policy must match the implementation ----------------------

const privacyText = () => {
  const doc = legalDocument('privacy');
  return doc.sections.flatMap((section) => [...section.bodyJa, ...section.bodyEn]).join('\n');
};

test('privacy: the claim that nothing is sent before consent is true of the code', async () => {
  assert.match(privacyText(), /until you allow it/);

  const sent = [];
  const telemetry = createTelemetry({ transport: async (payload) => void sent.push(payload) });
  telemetry.record('model.start', { scene: SCENES[0].id, device: 'phone' });
  await telemetry.flush();
  assert.equal(sent.length, 0, 'the policy says nothing is sent before consent');
});

test('privacy: the claim that refusing destroys what was held is true of the code', async () => {
  assert.match(privacyText(), /destroys it/);

  const sent = [];
  const telemetry = createTelemetry({ transport: async (payload) => void sent.push(payload) });
  telemetry.record('model.start', { scene: SCENES[0].id, device: 'phone' });
  telemetry.setConsent('denied');
  telemetry.setConsent('granted');
  await telemetry.flush();
  assert.equal(sent.length, 0, 'a later grant must not resurrect refused data');
});

test('privacy: the claim of no cross-load identifier is true of the code', async () => {
  assert.match(privacyText(), /no identifier that outlives a page load/);

  const sent = [];
  const make = () => {
    const telemetry = createTelemetry({ transport: async (payload) => void sent.push(payload) });
    telemetry.setConsent('granted');
    telemetry.record('model.start', { scene: SCENES[0].id, device: 'phone' });
    return telemetry.flush();
  };
  await make();
  await make();
  assert.notEqual(sent[0].sessionRef, sent[1].sessionRef);
});

test('privacy: the claim of three retention words matches the vocabulary', async () => {
  assert.match(privacyText(), /first, returning, regular/);
  const { VISIT_BUCKETS } = await import('../src/telemetry/retention.js');
  assert.deepEqual(VISIT_BUCKETS, ['first', 'returning', 'regular']);
});

test('privacy: the claim that no third-party analytics is used matches the CSP', () => {
  assert.match(privacyText(), /no third-party analytics tag/);
  const headers = read('public/_headers');
  assert.match(headers, /script-src 'self' 'wasm-unsafe-eval'/);
  assert.match(headers, /connect-src 'self' https:\/\/\*\.supabase\.co/);
});

test('legal: the pages are reachable from the shell and need no renderer', () => {
  const legal = read('src/app/Legal.js');
  assert.ok(!legal.includes("from 'three'"), 'the terms must be readable without WebGL');

  const main = read('src/main.js');
  assert.match(main, /route\.kind === 'legal'/);

  for (const source of [read('src/app/Landing.js'), read('src/app/Trust.js')]) {
    for (const slug of LEGAL_SLUGS) {
      assert.ok(source.includes(`href: '#/${slug}'`), `no link to #/${slug}`);
    }
  }
});

test('legal: the disclosure page shows a gap rather than omitting the row', () => {
  const source = read('src/app/Legal.js');
  assert.match(source, /row\.missing/);
  assert.match(source, /Not yet published/);
});
