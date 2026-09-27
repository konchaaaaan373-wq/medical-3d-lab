import test from 'node:test';
import assert from 'node:assert/strict';

import { PATIENT_GUIDES } from '../src/data/patientGuides.js';

/**
 * The patient explanations are read by people who are not clinicians.
 *
 * ## Why this exists
 *
 * The Japanese copy was, for most of the guides, a close translation of the
 * English, and it read like one: 「臼蓋」「楔」「断端」「辺縁」「遊離したもの」
 * 「間質」「換気」「系全体の圧」, symptoms introduced as 「〜が語られます」, and a
 * limit note that said 「この絵に人はおらず」. Correct words, for a reader who
 * already knew them. It was rewritten in plain Japanese on 2026-09-27
 * (docs/pathology-explanation-handoff.md, 「患者向けの文言」), and this holds the
 * two rules a rewrite can hold mechanically:
 *
 * 1. **Words that were replaced stay replaced.** Each has an everyday
 *    equivalent that says the same thing.
 * 2. **A specialist name the reader needs is explained where it first
 *    appears** — 「空気の通り道（気道）」, then 「気道」 afterwards. The name is
 *    kept because it is the word the reader will hear in the clinic.
 *
 * What it cannot hold is whether a sentence is easy to follow. That is still a
 * reader's judgement, and the clinical review of the copy (F-232).
 */

/** Replaced with an everyday word; not to come back. */
const REPLACED = [
  '臼蓋', '楔', '断端', '辺縁', '区画', '遊離', '導出', '導き出', '導いて', '間質', '神経病理', '所見',
  '胸郭', '瘢痕', '結節', '換気', '系全体', 'この系', '経路', '領域', '病態', '頭位', '飛蚊症', '鼠径',
  '頸部', '索', '腫大', '液柱', '嚥下', '濾', '語られ', 'この絵', '——',
];

/** Kept, because it is the word used in the clinic — but explained at first use. */
const EXPLAINED_AT_FIRST_USE = [
  '左心室', '冠動脈', '気道', '横隔膜', '肺胞', '門脈', '糸球体', '胆のう', '気管', '半月板',
  '黄斑', '網膜', '肺葉', '尿管', '副甲状腺', '乳管', '腱板', '老人斑', '胆汁',
];

const japaneseText = (guide) => [
  guide.titleJa,
  ...guide.steps.flatMap((step) => [step.titleJa, step.bodyJa, step.lookJa]),
];

test('patient copy: replaced specialist words stay replaced', () => {
  const found = [];
  for (const [id, guide] of Object.entries(PATIENT_GUIDES)) {
    for (const text of japaneseText(guide)) {
      // The disease's own name keeps its words: 良性発作性頭位めまい症 is what
      // the reader will be told in the clinic.
      const checked = text.replaceAll('良性発作性頭位めまい症', '');
      for (const word of REPLACED) if (checked.includes(word)) found.push(`${id}: 「${word}」 in 「${text}」`);
    }
  }
  assert.deepEqual(found, [], 'say it in everyday words:\n  ' + found.join('\n  '));
});

test('patient copy: a specialist name is explained where it first appears', () => {
  const unexplained = [];
  for (const [id, guide] of Object.entries(PATIENT_GUIDES)) {
    // Titles are headings — the guide's is also the question on #/patient —
    // and a step's title sits directly over its body, so the explanation
    // belongs in the body: each step is read body first, then its title and
    // its "where to look".
    const all = guide.steps.flatMap((step) => [step.bodyJa, step.titleJa, step.lookJa]).join('\n');
    for (const word of EXPLAINED_AT_FIRST_USE) {
      const at = all.indexOf(word);
      if (at < 0) continue;
      // Explained either as 「説明（語）」 — the word in parentheses after an
      // everyday description — or as 「語（説明）」.
      const before = all[at - 1];
      const after = all[at + word.length];
      if (before === '（' || after === '（') continue;
      unexplained.push(`${id}: 「${word}」 first appears unexplained: 「${all.slice(Math.max(0, at - 20), at + word.length + 10)}」`);
    }
  }
  assert.deepEqual(unexplained, [], 'explain it the first time:\n  ' + unexplained.join('\n  '));
});
