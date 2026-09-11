import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { PATIENT_GUIDES } from '../src/data/patientGuides.js';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';

/**
 * The review packets under `docs/clinical-reviews/packets/` are what a
 * clinician actually reads before deciding whether a scene may be published.
 * They are generated (`npm run review:packets`) from the product's own values
 * so that the packet and the screen cannot say different things.
 *
 * Generated is not the same as guarded. Two failures are possible without one:
 * a packet left behind after the copy it quotes was edited, and a link that
 * resolves nowhere — which is how a reviewer loses the model card and the
 * evidence dossier, the two documents the packet exists to point at.
 *
 * This file is not a review gate. Whether a reviewer approved anything lives
 * in `docs/clinical-reviews/registry.json`, and nothing here writes there.
 */

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const PACKET_DIR = join(ROOT, 'docs/clinical-reviews/packets');

/** scene id in the catalogue -> the packet file, which is named by slug. */
const PACKETS = ['amyloid-beta', 'heart-failure', 'copd-hyperinflation', 'myocardial-ischemia'].map((id) => {
  const entry = SCENE_MANIFEST.find((scene) => scene.id === id || scene.slug === id);
  assert.ok(entry, `${id}: not in the catalogue`);
  return { id, slug: entry.slug, path: join(PACKET_DIR, `${entry.slug}.md`) };
});

test('review packets: every packet named in review:packets exists', () => {
  for (const { id, path } of PACKETS) assert.ok(existsSync(path), `${id}: ${path} is missing`);
});

test('review packets: every step of on-screen copy appears verbatim', () => {
  for (const { id, path } of PACKETS) {
    const packet = readFileSync(path, 'utf8');
    const guide = PATIENT_GUIDES[id];
    assert.ok(guide, `${id}: no patient guide`);

    // The guide's title is on-screen copy too, and it is not the catalogue's
    // scene name — a reviewer signing off on wording has to see this one.
    assert.ok(packet.includes(guide.titleJa ?? guide.title), `${id}: the guide title is not in the packet`);
    assert.match(packet, new RegExp(`\\| 患者説明 \\| ${guide.steps.length} 段 \\|`), `${id}: step count`);

    guide.steps.forEach((step, index) => {
      for (const field of ['titleJa', 'bodyJa', 'lookJa']) {
        if (!step[field]) continue;
        assert.ok(
          packet.includes(step[field]),
          `${id} step ${index + 1}: ${field} is not in the packet — regenerate with \`npm run review:packets\``,
        );
      }
    });
  }
});

test('review packets: every relative link resolves to a file that exists', () => {
  for (const { id, path } of PACKETS) {
    const packet = readFileSync(path, 'utf8');
    const links = [...packet.matchAll(/\]\((\.[^)]+)\)/g)].map((match) => match[1]);
    assert.ok(links.length > 0, `${id}: no relative links at all`);
    for (const link of links) {
      const target = resolve(dirname(path), link.split('#')[0]);
      assert.ok(existsSync(target), `${id}: ${link} resolves to ${target}, which does not exist`);
    }
  }
});

test('review packets: the decision block is left for a person to fill in', () => {
  for (const { id, path } of PACKETS) {
    const packet = readFileSync(path, 'utf8');
    // An unticked box. A packet is a request for a decision, never a record of
    // one: the record is the registry, and a tick here would publish nothing.
    for (const box of ['- [ ] **approve**', '- [ ] **revise**', '- [ ] **hold**']) {
      assert.ok(packet.includes(box), `${id}: ${box} is missing or already ticked`);
    }
    assert.match(packet, /\| レビュアー（氏名） \| \|/, `${id}: the reviewer name is filled in`);
  }
});
